"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Slide } from "@/lib/slides";

export default function Slideshow({ slides, interval = 5500 }: { slides: Slide[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);

  useEffect(() => {
    if (paused || n < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(i + 1), interval);
    return () => clearTimeout(t);
  }, [i, paused, n, interval, go]);

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="AdsVane highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      {slides.map((s, k) => (
        <div
          key={k}
          className={`slide${k === i ? " on" : ""}`}
          role="group"
          aria-roledescription="slide"
          aria-label={`${k + 1} of ${n}`}
          aria-hidden={k !== i}
          style={{
            backgroundImage: s.image
              ? `linear-gradient(90deg, rgba(13,11,18,.78), rgba(13,11,18,.25)), url(${s.image})`
              : `radial-gradient(circle at 85% 20%, rgba(255,255,255,.14), transparent 40%), linear-gradient(135deg, ${s.colors[0]}, ${s.colors[1]})`,
          }}
        >
          <div className="wrap slide-in">
            <h2>{s.title}</h2>
            <p>{s.text}</p>
            {s.cta && (
              <Link className="b hero-cta" href={s.cta.href} tabIndex={k === i ? 0 : -1}>
                {s.cta.label}
              </Link>
            )}
          </div>
        </div>
      ))}
      {n > 1 && (
        <>
          <button type="button" className="arrow prev" aria-label="Previous slide" onClick={() => go(i - 1)}>‹</button>
          <button type="button" className="arrow next" aria-label="Next slide" onClick={() => go(i + 1)}>›</button>
          <div className="dots">
            {slides.map((_, k) => (
              <button key={k} type="button" aria-label={`Go to slide ${k + 1}`} aria-current={k === i} className={k === i ? "on" : ""} onClick={() => go(k)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
