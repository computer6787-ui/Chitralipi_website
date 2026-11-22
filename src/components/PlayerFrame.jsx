"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GRACE_MS, TIMEOUT_MS } from "@/lib/selector";

export default function PlayerFrame({ src, status, onOutcome, titleKey, reportBroken, title, poster = null, label = "Loading player", provider = null }) {
  const [ready, setReady] = useState(false);
  const frameRef = useRef(null);
  const iframeHandlersRef = useRef(null);
  const handleLoad = useCallback(() => iframeHandlersRef.current?.load(), []);
  const handleError = useCallback(() => iframeHandlersRef.current?.error(), []);

  useEffect(() => {
    if (!src) return;
    setReady(false);
    let done = false;
    let graceTimer = null;
    let hardTimer = null;
    const settle = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(graceTimer);
      clearTimeout(hardTimer);
      onOutcome(ok);
    };
    // onLoad fires even when provider has no content for this title — treat as neutral.
    // Only explicit play/error messages or hard timeout decide outcome so fallback fires correctly.
    iframeHandlersRef.current = {
      load: () => {
        if (!done) graceTimer = setTimeout(() => { setReady(true); settle(true); }, GRACE_MS);
      },
      error: () => settle(false),
    };
    const onMsg = (e) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      if (e.data?.event === "play") { setReady(true); settle(true); }
      else if (e.data?.event === "error") settle(false);
    };
    window.addEventListener("message", onMsg);
    hardTimer = setTimeout(() => settle(false), TIMEOUT_MS + GRACE_MS);
    return () => {
      iframeHandlersRef.current = null;
      window.removeEventListener("message", onMsg);
      clearTimeout(graceTimer);
      clearTimeout(hardTimer);
    };
  }, [src, onOutcome]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenMessage, setFullscreenMessage] = useState("");
  const playerRef = useRef(null);
  const fullscreenButtonRef = useRef(null);
  const fullscreenControlsTimer = useRef(null);
  const [fullscreenButtonVisible, setFullscreenButtonVisible] = useState(true);

  useEffect(() => {
    const syncFullscreen = () => { const active = document.fullscreenElement === playerRef.current; setIsFullscreen(active); if (!active) { setFullscreenMessage(""); window.screen.orientation?.unlock?.(); } };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    if (!isFullscreen || !fullscreenMessage) return;
    const clearWhenLandscape = () => { if (window.matchMedia("(orientation: landscape)").matches) setFullscreenMessage(""); };
    window.addEventListener("orientationchange", clearWhenLandscape);
    return () => window.removeEventListener("orientationchange", clearWhenLandscape);
  }, [fullscreenMessage, isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isFullscreen]);

  const showFullscreenButton = useCallback(() => {
    setFullscreenButtonVisible(true);
    clearTimeout(fullscreenControlsTimer.current);
    if (document.fullscreenElement === playerRef.current) {
      fullscreenControlsTimer.current = setTimeout(() => { if (document.activeElement !== fullscreenButtonRef.current) setFullscreenButtonVisible(false); }, 5000);
    }
  }, []);

  useEffect(() => {
    if (isFullscreen) { showFullscreenButton(); } else { setFullscreenButtonVisible(true); clearTimeout(fullscreenControlsTimer.current); }
    return () => clearTimeout(fullscreenControlsTimer.current);
  }, [isFullscreen, showFullscreenButton]);

  useEffect(() => { if (isFullscreen && ready) frameRef.current?.requestFullscreen().catch(() => setIsFullscreen(false)); }, [isFullscreen, ready]);

  async function toggleFullscreen() {
    const player = playerRef.current;
    if (!player) return;
    if (document.fullscreenElement === player) {
      try { await document.exitFullscreen(); } catch { setFullscreenMessage("Use your browser controls to exit full screen."); }
      return;
    }
    if (typeof player.requestFullscreen !== "function") {
      setFullscreenMessage("This browser does not support full screen for embedded players.");
      return;
    }
    setFullscreenMessage("");
    try { await player.requestFullscreen(); showFullscreenButton(); } catch { setFullscreenMessage("The browser blocked full screen. Check this site's browser permissions."); return; }
    try {
      const orientation = window.screen.orientation;
      if (typeof orientation?.lock === "function") { await orientation.lock("landscape"); }
      else if (window.matchMedia("(orientation: portrait)").matches) {}
    } catch { /* ignore */ }
  }

  return (
    <div ref={playerRef} className="player-frame-root relative size-full" onPointerMove={showFullscreenButton} onTouchStart={showFullscreenButton}>
      {!ready && <Skeleton title={title} poster={poster} label={label} provider={provider} />}
      {src && (
        <iframe ref={frameRef} src={src} title={title} className="absolute inset-0 h-full w-full" allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media" referrerPolicy="origin-when-cross-origin" loading="lazy"
          onLoad={handleLoad} onError={handleError} />
      )}
      <FullscreenButton active={isFullscreen} onClick={toggleFullscreen} />
      {fullscreenMessage && (
        <p role="status" className="absolute inset-x-3 bottom-3 z-30 rounded-lg bg-black/85 px-3 py-2 text-center text-xs text-white"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>{fullscreenMessage}</p>
      )}
      {status === "failed" && <ReportBroken onClick={reportBroken} />}
    </div>
  );
}

function Skeleton({ title, poster, label, provider }) {
  const providerName = provider?.name;
  return (
    <div data-player-skeleton="" aria-hidden="true" className="pointer-events-none absolute inset-0 select-none transition-opacity duration-500 ease-out visible opacity-100">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-30 blur-xl" />
      ) : <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,#1a1a1f_0%,#0e0e11_55%,#08080a_100%)]" />}
      <div className="player-skeleton-sweep absolute inset-0" />
      <div className="relative grid size-full place-items-center px-6">
        <div className="flex max-w-full flex-col items-center gap-3">
          <p className="max-w-full truncate text-[12.5px] font-medium text-ink-300">{label}</p>
          <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-[11px] text-ink-500">
            <span className="player-skeleton-dots" aria-hidden="true"><i /><i /><i /></span>
            {providerName ? `Connecting to ${providerName}` : "Connecting to the source"}
          </p>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-ink-800">
        <div className="player-skeleton-bar h-full w-1/3 bg-gradient-to-r from-transparent via-chit-500 to-transparent" />
      </div>
    </div>
  );
}

function FullscreenButton({ active, onClick }) {
  const [visible, setVisible] = useState(true);
  const btnRef = useRef(null);
  const timer = useRef(null);
  const show = useCallback(() => {
    setVisible(true);
    clearTimeout(timer.current);
    if (document.fullscreenElement) timer.current = setTimeout(() => { if (document.activeElement !== btnRef.current) setVisible(false); }, 5000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button ref={btnRef} type="button" aria-label={active ? "Exit full screen" : "Enter full screen"} aria-pressed={active}
      onClick={onClick} onFocus={show} onBlur={show} onPointerEnter={show}
      tabIndex={visible ? 0 : -1} aria-hidden={!visible}
      className={`absolute z-30 inline-flex min-h-11 items-center rounded-lg border border-white/20 bg-black/75 px-3 text-xs font-semibold text-white shadow-lg backdrop-blur transition-[opacity,background-color] hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      style={{ top: "max(0.75rem, env(safe-area-inset-top))", right: "max(0.75rem, env(safe-area-inset-right))" }}>
      {active ? "Exit full screen" : "Full screen"}
    </button>
  );
}

function ReportBroken({ onClick }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/85 p-4">
      {confirmed ? (
        <p className="text-ink-300 text-center">Reported — thank you.</p>
      ) : (
        <>
          <p className="text-ink-400 text-center mb-3 text-[13px]">This source is not working. Reporting it helps the others.</p>
          <button onClick={() => { onClick(); setConfirmed(true); }}
            className="rounded-md border border-ink-700 bg-ink-900/50 px-4 py-2 text-[12px] font-medium text-ink-200 transition-colors duration-150 hover:bg-ink-800/80 hover:text-ink-100">
            Report broken source
          </button>
        </>
      )}
    </div>
  );
}
