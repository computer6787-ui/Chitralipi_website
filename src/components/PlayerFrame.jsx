"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The embedded player, wrapped in a loading state.
 *
 * The provider is a cross-origin iframe, so the same-origin policy means we
 * cannot read anything inside it. The <iframe> `load` event is the only
 * "the document finished" signal available from here, and it fires once the
 * player's own page and scripts have loaded — the frame is interactive by
 * then. Everything before that is a black box, which is what this fills.
 *
 * The skeleton sits ON TOP of the iframe and fades out on load, rather than
 * the iframe fading in over a skeleton behind it. Two reasons:
 *   1. The skeleton is in the server-rendered HTML, so it paints on the very
 *      first frame. Fading the iframe in instead would show a black box first
 *      and only then swap to the skeleton once JS hydrates — the exact blank
 *      screen this component exists to remove.
 *   2. It is `pointer-events-none`, so clicks always reach the player. The
 *      overlay can never swallow a click on a play button it does not own.
 *
 * Do not add `sandbox` here. The provider refuses to render inside a
 * sandboxed frame and playback fails outright (see docs/ADBLOCK.md).
 */

/**
 * Drops the overlay if the load event never arrives (blocked, offline). Without
 * this the skeleton would sit over a permanently black frame. `pointer-events-none`
 * means the player stays clickable either way -- this only stops the visuals
 * from lingering.
 */
const SAFETY_TIMEOUT_MS = 15000;
const FULLSCREEN_CONTROLS_TIMEOUT_MS = 5000;

export default function PlayerFrame({
  src,
  title,
  poster = null,
  label = "Loading player",
  provider = null,
  providerName = null,
}) {
  // Starts `false` so the skeleton is present in the server-rendered HTML.
  const [loaded, setLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenMessage, setFullscreenMessage] = useState("");
  const timer = useRef(null);
  const fullscreenControlsTimer = useRef(null);
  const playerRef = useRef(null);
  const fullscreenButtonRef = useRef(null);
  const [fullscreenButtonVisible, setFullscreenButtonVisible] = useState(true);
  const currentProviderName = provider?.name || providerName;

  const handleLoad = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    // A new src (next episode or provider switch) is a new document: show the skeleton again.
    setLoaded(false);
    timer.current = setTimeout(() => setLoaded(true), SAFETY_TIMEOUT_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [src]);

  useEffect(() => {
    const syncFullscreen = () => {
      const active = document.fullscreenElement === playerRef.current;
      setIsFullscreen(active);
      if (!active) {
        setFullscreenMessage("");
        window.screen.orientation?.unlock?.();
      }
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    if (!isFullscreen || !fullscreenMessage) return;

    const clearWhenLandscape = () => {
      if (window.matchMedia("(orientation: landscape)").matches) {
        setFullscreenMessage("");
      }
    };

    window.addEventListener("orientationchange", clearWhenLandscape);
    return () => window.removeEventListener("orientationchange", clearWhenLandscape);
  }, [fullscreenMessage, isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  const showFullscreenButton = useCallback(() => {
    setFullscreenButtonVisible(true);
    clearTimeout(fullscreenControlsTimer.current);

    if (document.fullscreenElement === playerRef.current) {
      fullscreenControlsTimer.current = setTimeout(() => {
        if (document.activeElement !== fullscreenButtonRef.current) {
          setFullscreenButtonVisible(false);
        }
      }, FULLSCREEN_CONTROLS_TIMEOUT_MS);
    }
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      showFullscreenButton();
    } else {
      setFullscreenButtonVisible(true);
      clearTimeout(fullscreenControlsTimer.current);
    }

    return () => clearTimeout(fullscreenControlsTimer.current);
  }, [isFullscreen, showFullscreenButton]);

  async function toggleFullscreen() {
    const player = playerRef.current;
    if (!player) return;

    if (document.fullscreenElement === player) {
      try {
        await document.exitFullscreen();
      } catch {
        setFullscreenMessage("Use your browser controls to exit full screen.");
      }
      return;
    }

    if (typeof player.requestFullscreen !== "function") {
      setFullscreenMessage("This browser does not support full screen for embedded players.");
      return;
    }

    setFullscreenMessage("");
    try {
      await player.requestFullscreen();
      showFullscreenButton();
    } catch {
      setFullscreenMessage("The browser blocked full screen. Check this site's browser permissions.");
      return;
    }

    try {
      const orientation = window.screen.orientation;
      if (typeof orientation?.lock === "function") {
        await orientation.lock("landscape");
      } else if (window.matchMedia("(orientation: portrait)").matches) {
      }
      } catch {
      }
  }

  return (
    <div
      ref={playerRef}
      className="player-frame-root relative size-full"
      onPointerMove={showFullscreenButton}
      onTouchStart={showFullscreenButton}
    >
      <iframe
        key={`${provider?.id || ""}-${src}`}
        src={src}
        title={title}
        onLoad={handleLoad}
        className="size-full"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        referrerPolicy="origin-when-cross-origin"
        loading="lazy"
        onPointerEnter={showFullscreenButton}
      />

      {/* Decorative overlay. Never interactive, gone the moment it loads. */}
      <div
        data-player-skeleton=""
        aria-hidden={loaded}
        className={`pointer-events-none absolute inset-0 select-none transition-opacity duration-500 ease-out ${
          loaded ? "invisible opacity-0" : "visible opacity-100"
        }`}
      >
        {/* Poster, blurred up, or the palette gradient when there is none. */}
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="absolute inset-0 size-full scale-110 object-cover opacity-30 blur-xl"
          />
        ) : (
          /* Warm graphite, from the page's own surfaces -- the fallback must
             belong to the same palette as the room around it, not a cold one. */
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,#1a1a1f_0%,#0e0e11_55%,#08080a_100%)]" />
        )}

        {/* Sweep of light moving across the frame. */}
        <div className="player-skeleton-sweep absolute inset-0" />

        {/* Center: title and status only, no play button. */}
        <div className="relative grid size-full place-items-center px-6">
          <div className="flex max-w-full flex-col items-center gap-3">
            <p className="max-w-full truncate text-[12.5px] font-medium text-ink-300">
              {label}
            </p>
            <p
              role="status"
              aria-live="polite"
              className="flex items-center gap-1.5 text-[11px] text-ink-500"
            >
              <span className="player-skeleton-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {currentProviderName ? `Connecting to ${currentProviderName}` : 'Connecting to the source'}
            </p>
          </div>
        </div>

        {/* Indeterminate progress line along the bottom edge. */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-ink-800">
          <div className="player-skeleton-bar h-full w-1/3 bg-gradient-to-r from-transparent via-chit-500 to-transparent" />
        </div>
      </div>

      <noscript>
        <style>{`[data-player-skeleton]{display:none!important}`}</style>
      </noscript>

      <button
        ref={fullscreenButtonRef}
        type="button"
        aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
        aria-pressed={isFullscreen}
        onClick={toggleFullscreen}
        onFocus={showFullscreenButton}
        onBlur={showFullscreenButton}
        onPointerEnter={showFullscreenButton}
        tabIndex={fullscreenButtonVisible ? 0 : -1}
        aria-hidden={!fullscreenButtonVisible}
        className={`absolute z-30 inline-flex min-h-11 items-center rounded-lg border border-white/20 bg-black/75 px-3 text-xs font-semibold text-white shadow-lg backdrop-blur transition-[opacity,background-color] hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
          fullscreenButtonVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{
          top: "max(0.75rem, env(safe-area-inset-top))",
          right: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        {isFullscreen ? "Exit full screen" : "Full screen"}
      </button>

      {fullscreenMessage && (
        <p
          role="status"
          className="absolute inset-x-3 bottom-3 z-30 rounded-lg bg-black/85 px-3 py-2 text-center text-xs text-white"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {fullscreenMessage}
        </p>
      )}
    </div>
  );
}
