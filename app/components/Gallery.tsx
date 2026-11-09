"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type P = { id: string; url: string; caption: string | null };

export default function Gallery({ photos, name, initial = 9 }: { photos: P[]; name: string; initial?: number }) {
  const [open, setOpen] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const touch = useRef<number | null>(null);
  const shown = all ? photos : photos.slice(0, initial);
  const n = photos.length;

  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + n) % n)), [n]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go]);

  return (
    <>
      <div className="gal">
        {shown.map((p, i) => (
          <button key={p.id} type="button" className="galitem" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} of ${n}`}>
            <img src={p.url} alt={p.caption || `${name} photo ${i + 1}`} loading="lazy" />
          </button>
        ))}
      </div>
      {n > initial && !all && (
        <p style={{ margin: "14px 0 0" }}>
          <button type="button" className="b ghost" onClick={() => setAll(true)}>See all {n} photos</button>
        </p>
      )}
      {open !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${name} photos`}
          onClick={(e) => e.target === e.currentTarget && setOpen(null)}
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current === null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            touch.current = null;
          }}
        >
          <button type="button" className="lb-close" onClick={() => setOpen(null)} aria-label="Close" autoFocus>×</button>
          {n > 1 && <button type="button" className="lb-nav prev" onClick={() => go(-1)} aria-label="Previous photo">‹</button>}
          <figure>
            <img src={photos[open].url} alt={photos[open].caption || `${name} photo ${open + 1}`} />
            <figcaption>{photos[open].caption ? `${photos[open].caption} · ` : ""}{open + 1} of {n}</figcaption>
          </figure>
          {n > 1 && <button type="button" className="lb-nav next" onClick={() => go(1)} aria-label="Next photo">›</button>}
        </div>
      )}
    </>
  );
}
