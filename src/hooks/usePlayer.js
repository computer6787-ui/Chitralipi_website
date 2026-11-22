"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PROVIDERS } from "@/lib/providers";
import { Selector, MAX_TRIES, dumpTrace } from "@/lib/selector";

export function usePlayer(titleKey) {
  const sel = useRef(null);
  if (!sel.current) sel.current = new Selector(PROVIDERS);
  const selector = sel.current;

  const [cand, setCand] = useState([]);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState("idle");
  const startedAt = useRef(0);
  const alive = useRef(true);

  const begin = useCallback(() => {
    const list = selector.order(titleKey).slice(0, MAX_TRIES);
    setCand(list);
    setIdx(0);
    setStatus("trying");
    startedAt.current = performance.now();
    dumpTrace();
  }, [titleKey, selector]);

  const onOutcome = useCallback((ok) => {
    if (!alive.current) return;
    const prov = cand[idx];
    if (!prov) return;
    selector.record(prov.id, ok, performance.now() - startedAt.current, titleKey);

    if (ok) {
      setStatus("ok");
      return;
    }
    if (idx + 1 >= cand.length) {
      setStatus("failed");
      return;
    }
    startedAt.current = performance.now();
    setIdx((i) => i + 1);
  }, [cand, idx, titleKey, selector]);

  const reportBroken = useCallback(() => onOutcome(false), [onOutcome]);

  const force = useCallback((id) => {
    if (!alive.current) return;
    selector.pin(id, titleKey);
    const allCandidates = selector.order(titleKey).slice(0, MAX_TRIES);
    // Pin the requested provider to the front; drop duplicates so we keep the full ranked pool.
    const prov = PROVIDERS.find((p) => p.id === id);
    const prioritized = prov
      ? [prov, ...allCandidates.filter((x) => x.id !== id)].slice(0, MAX_TRIES)
      : allCandidates;
    setCand(prioritized);
    setIdx(0);
    setStatus(prov ? "trying" : "failed");
    startedAt.current = performance.now();
  }, [titleKey, selector]);

  useEffect(() => {
    alive.current = true;
    selector.hydrateDead().then(() => {
      if (!alive.current) return;
      begin();
    });
    return () => {
      alive.current = false;
    };
  }, [begin, selector]);

  return {
    provider: cand[idx] ?? null,
    status,
    onOutcome,
    reportBroken,
    force,
  };
}