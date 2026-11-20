"use client";
import { useEffect, useRef, useState } from "react";

// A posted video, Instagram style: no player bar. Tap to pause or play, small button for sound.
// Sound stays on or off for the next video too.
let soundOn = true;

export default function PostVideo({ src, poster, label }: { src: string; poster?: string; label: string }) {
  const v = useRef<HTMLVideoElement>(null);
  const tap = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [muted, setMuted] = useState(!soundOn);
  const [paused, setPaused] = useState(false);
  const [hint, setHint] = useState<"" | "play" | "pause">("");

  useEffect(() => {
    const el = v.current;
    if (!el) return;
    el.muted = !soundOn;
    el.play().catch(() => {
      // Phones may block sound until a tap; play silently instead.
      el.muted = true;
      setMuted(true);
      el.play().catch(() => setPaused(true));
    });
    return () => {
      if (tap.current) clearTimeout(tap.current);
    };
  }, [src]);

  function toggle() {
    const el = v.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setPaused(false);
      setHint("play");
    } else {
      el.pause();
      setPaused(true);
      setHint("pause");
    }
    setTimeout(() => setHint(""), 700);
  }

  return (
    <div className="pvid">
      <video
        ref={v}
        src={src}
        poster={poster}
        loop
        playsInline
        muted={muted}
        aria-label={label}
        onClick={() => {
          // Wait a moment so a double tap (like) doesn't also pause.
          if (tap.current) return;
          tap.current = setTimeout(() => {
            tap.current = null;
            toggle();
          }, 260);
        }}
        onDoubleClick={() => {
          if (tap.current) clearTimeout(tap.current);
          tap.current = null;
        }}
      />
      {(paused || hint) && (
        <span className={`pvid-big${paused ? " stay" : ""}`} aria-hidden="true">
          {paused || hint === "pause" ? (
            <svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="30" height="30"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>
          )}
        </span>
      )}
      <button
        type="button"
        className="pvid-snd"
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
        onClick={(e) => {
          e.stopPropagation();
          const el = v.current;
          const m = !muted;
          soundOn = !m;
          setMuted(m);
          if (el) {
            el.muted = m;
            if (el.paused) {
              el.play().catch(() => {});
              setPaused(false);
            }
          }
        }}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm12.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z" fill="currentColor" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm11.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM13 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" fill="currentColor" /></svg>
        )}
      </button>
    </div>
  );
}
