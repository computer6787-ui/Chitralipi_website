/**
 * Provider selection for the embedded player.
 *
 * Deterministic demotion: a ranked list where failures push providers down and
 * only the top of the list is ever tried. No bandit jitter — the order is fully
 * reproducible, so when a viewer says "it picked a bad one" you can trace
 * exactly why from the TRACE log.
 *
 * Score semantics:
 *   - Init      : score = seed (from the tier table below)
 *   - Failure   : score -= 0.25, fails++
 *   - Success   : score = min(seed, score + 0.05), fails = 0, pin for title
 *   - 2 fails   : cooldown 5 min, doubling each further fail
 *   - Selection : highest score first; ties broken by seed rank
 *   - dead.json : forces score to the given value, permanent
 *   - maxTries  : 2, never the same provider twice
 *   - all cold  : ignore cooldowns, fall back to seed rank
 *
 * Score only recovers toward its seed — it can never exceed it. A top-tier
 * provider that dies stays demoted until it proves itself again, and a filler
 * provider can never outrank a healthy top-tier one.
 *
 * This module is pure logic, zero React. It only decides ordering and remembers
 * outcomes; the iframe probing lives in the player component, which reports
 * `ok`/`fail` back through `record()`. The `play()`/`attempt()` pair below is
 * the standalone, non-React orchestration path kept for the vanilla fallback
 * and for unit tests — the React pages drive `order()` + `record()` directly.
 */

/** Tier scores for each provider. Missing providers default to DEFAULT_SEED. */
export const SEED = {
  vidlink: 0.95,
  cinesrc: 0.9,
  "vidsrc-sh": 0.85,
  filmu: 0.8,
  multiembed: 0.75,
  embedapi: 0.7,
  vidcore: 0.65,
  embedwave: 0.6,
  vidfast: 0.55,
  vidsrc2: 0.5,
  "vidsrc-ir": 0.45,
  "vidsrc-me": 0.4,
  "vidsrc-bz": 0.35,
  "vidsrc-gd": 0.3,
  "vidsrc-buzz": 0.25,
  vixsrc: 0.2,
};

/** Seed order, used to break ties deterministically. */
export const SEED_RANK = Object.fromEntries(Object.keys(SEED).map((k, i) => [k, i]));

/** Never try more than this many providers per play. */
export const MAX_TRIES = 2;

// Probing contract. The player component uses these same constants so the
// visual settle and the recorded outcome always agree.
export const GRACE_MS = 1200; // after `load`, wait this long before calling it a success
export const TIMEOUT_MS = 8000; // give up on a provider after this long

const STORAGE_KEY = "chitralipi-selector-v1";
const DEAD_URL = "/dead.json";
const DEFAULT_SEED = 0.4;
const COOLDOWN_BASE_MS = 3e5; // 5 min, doubled each further fail
const TRACE_LIMIT = 200;

/** Local trace log. Read it in the console behind ?debug (see dumpTrace). */
export const TRACE = [];

/** Append a trace entry, keeping the buffer bounded. */
export function logTrace(entry) {
  TRACE.push(entry);
  if (TRACE.length > TRACE_LIMIT) TRACE.shift();
}

/** Dump the trace behind ?debug. */
export function dumpTrace() {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug")) {
    console.table(TRACE);
  }
}

export class Selector {
  /**
   * @param {Array<{id: string}>} providers - the PROVIDERS list from providers.js
   */
  constructor(providers) {
    this.p = providers;
    this.state = Object.fromEntries(
      providers.map((x) => [x.id, { score: SEED[x.id] ?? DEFAULT_SEED, fails: 0, until: 0, ms: 4000 }])
    );
    this.dead = new Map(); // id -> forced score (permanent override)
    this.tried = new Set(); // providers already attempted in the current play
    this.load();
  }

  // --- persistence ---------------------------------------------------------

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      for (const id of Object.keys(saved)) {
        if (!this.state[id]) continue;
        // Merge so a future schema never clobbers fields we did not store.
        this.state[id] = { ...this.state[id], ...saved[id] };
      }
    } catch {
      // Corrupt or unavailable (SSR) — start from seed.
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Storage full / blocked — selection still works, it just does not persist.
    }
  }

  /**
   * Fetch /dead.json and force the listed providers' scores permanently.
   * Each key is a provider id; the value is the forced score (default 0).
   * Call once on startup; safe to call more than once (idempotent).
   */
  async hydrateDead() {
    try {
      const res = await fetch(DEAD_URL, { cache: "no-store" });
      if (!res.ok) return;
      const map = await res.json();
      for (const [id, value] of Object.entries(map)) {
        if (!this.state[id]) continue;
        this.dead.set(id, typeof value === "number" ? value : 0);
      }
    } catch {
      // No dead.json (or offline) — normal operation.
    }
  }

  // --- scoring -------------------------------------------------------------

  /** Effective score: -1 while cooling, the dead override, or the live score. */
  eff(id) {
    if (this.dead.has(id)) return this.dead.get(id); // permanent override
    const s = this.state[id];
    if (Date.now() < s.until) return -1; // cooling
    return s.score;
  }

  /** Ranked candidate list, highest score first, never re-offering a tried provider. */
  order(titleKey = "") {
    const all = this.p.filter((x) => !this.tried.has(x.id));
    const live = all.filter((x) => this.eff(x.id) >= 0);
    const pool = live.length ? live : all; // all cooling → ignore cooldowns

    pool.sort(
      (a, b) =>
        this.eff(b.id) - this.eff(a.id) || (SEED_RANK[a.id] ?? 999) - (SEED_RANK[b.id] ?? 999)
    );

    // A successful provider is pinned for this title, so it leads next time.
    const pin = titleKey ? localStorage.getItem(`pin:${titleKey}`) : null;
    const i = pool.findIndex((x) => x.id === pin);
    if (i > 0) pool.unshift(pool.splice(i, 1)[0]);
    return pool;
  }

  /**
   * Record an outcome.
   * @param {string} id - provider id
   * @param {boolean} ok - did it play?
   * @param {number} [ms] - time to first signal
   * @param {string} [titleKey] - the pin key; a success pins, a failure clears it
   */
  record(id, ok, ms = 0, titleKey = "") {
    const s = this.state[id];
    if (!s) return;

    if (ok) {
      s.score = Math.min(SEED[id] ?? DEFAULT_SEED, s.score + 0.05); // recover toward seed only
      s.fails = 0;
      s.ms = s.ms * 0.7 + ms * 0.3;
      if (titleKey) localStorage.setItem(`pin:${titleKey}`, id);
    } else {
      s.score = Math.max(0, s.score - 0.25);
      s.fails++;
      if (s.fails >= 2) s.until = Date.now() + COOLDOWN_BASE_MS * 2 ** (s.fails - 2);
      if (titleKey && localStorage.getItem(`pin:${titleKey}`) === id) {
        localStorage.removeItem(`pin:${titleKey}`); // pinned provider died → clear pin
      }
    }
    this.save();
  }

  /** Pin a provider for a title (used by the manual switcher). */
  pin(id, titleKey = "") {
    if (titleKey) localStorage.setItem(`pin:${titleKey}`, id);
  }


  // --- vanilla orchestration (non-React path) ------------------------------

  /**
   * Try up to MAX_TRIES providers in `mount`, returning the first that plays.
   * @param {string} titleKey
   * @param {HTMLElement} mount
   * @param {(prov: object) => string} [urlFor] - builds the embed src; defaults to prov.movie
   */
  async play(titleKey, mount, urlFor = (prov) => prov.movie) {
    this.tried.clear();
    for (const prov of this.order(titleKey).slice(0, MAX_TRIES)) {
      this.tried.add(prov.id);
      const t0 = performance.now();
      const ok = await this.attempt(prov, mount, urlFor(prov));
      this.record(prov.id, ok, performance.now() - t0, titleKey);
      logTrace({
        t: Date.now(),
        titleKey,
        order: this.order(titleKey).map((x) => x.id),
        pick: prov.id,
        ok,
      });
      if (ok) return prov.id;
      mount.innerHTML = "";
    }
    return null;
  }

  /**
   * Mount a single provider's iframe and resolve true/false.
   * Success: `load` then GRACE_MS. Failure: `error`, or TIMEOUT_MS.
   * Sends a `play` postMessage hint on load.
   */
  attempt(prov, mount, src) {
    return new Promise((resolve) => {
      let settled = false;
      let graceTimer = null;

      const settle = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(hard);
        clearTimeout(graceTimer);
        frame.onload = null;
        frame.onerror = null;
        resolve(ok);
      };

      const frame = document.createElement("iframe");
      frame.src = src;
      frame.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;";
      frame.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
      frame.allowFullScreen = true;
      frame.referrerPolicy = "origin-when-cross-origin";
      mount.appendChild(frame);

      frame.onload = () => {
        // Hint the provider to start playback. Cross-origin and ignored if the
        // provider does not listen for it — harmless either way.
        try {
          frame.contentWindow?.postMessage({ event: "play" }, "*");
        } catch {
          /* frame navigated away — the timeout handles it */
        }
        graceTimer = setTimeout(() => settle(true), GRACE_MS);
      };
      frame.onerror = () => settle(false);

      const hard = setTimeout(() => settle(false), TIMEOUT_MS);
    });
  }
}

