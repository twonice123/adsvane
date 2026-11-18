"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Ad } from "@/lib/billboard";

// A row of short videos and flyers that slides by itself. Videos play while they're on screen.
export default function ReelStrip({ ads }: { ads: Ad[] }) {
  const row = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = t - last;
      last = t;
      if (t > pausedUntil.current && el.scrollWidth > el.clientWidth + 4) {
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) el.scrollLeft = 0;
        else el.scrollLeft += dt * 0.035;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const hold = () => (pausedUntil.current = performance.now() + 4000);
    el.addEventListener("pointerdown", hold);
    el.addEventListener("wheel", hold, { passive: true });
    el.addEventListener("touchstart", hold, { passive: true });
    el.addEventListener("pointerenter", hold);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", hold);
      el.removeEventListener("wheel", hold);
      el.removeEventListener("touchstart", hold);
      el.removeEventListener("pointerenter", hold);
    };
  }, []);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) v.play().catch(() => {});
          else v.pause();
        }),
      { root: el, threshold: 0.6 }
    );
    el.querySelectorAll("video").forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, []);

  return (
    <div className="reels" ref={row}>
      {ads.map((a) => (
        <Link key={a.id} href={`/b/${a.biz.slug}`} className="reel">
          {a.video ? (
            <video src={a.url} poster={a.poster || undefined} muted loop playsInline preload="metadata" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.url} alt="" loading="lazy" />
          )}
          {a.video && (
            <svg className="reel-ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><path d="m10 8.5 5 3.5-5 3.5z" fill="currentColor" /></svg>
          )}
          <span className="reel-who">
            <b>{a.biz.name}</b>
            <small>{a.biz.city}, {a.biz.state}</small>
          </span>
        </Link>
      ))}
    </div>
  );
}
