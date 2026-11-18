"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Ad } from "@/lib/billboard";

const IMAGE_MS = 6000;
const VIDEO_MAX_MS = 16000;

function Avatar({ name, url }: { name: string; url: string | null }) {
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img className="bb-av" src={url} alt="" /> : <span className="bb-av">{name.slice(0, 1).toUpperCase()}</span>;
}

// The big "billboard" at the top of the home page: promoted videos and flyers, one at a time.
export default function Billboard({ ads }: { ads: Ad[] }) {
  const track = useRef<HTMLDivElement>(null);
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  const [i, setI] = useState(0);
  const [muted, setMuted] = useState(true);
  const [hold, setHold] = useState(false);
  const n = ads.length;

  const go = useCallback(
    (k: number) => {
      const t = track.current;
      if (!t) return;
      const to = ((k % n) + n) % n;
      t.scrollTo({ left: to * t.clientWidth, behavior: "smooth" });
    },
    [n]
  );

  // Which slide is showing (follows swipes too).
  function onScroll() {
    const t = track.current;
    if (!t) return;
    const k = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
    if (k !== i) setI(k);
  }

  // Play only the video that's showing.
  useEffect(() => {
    vids.current.forEach((v, k) => {
      if (!v) return;
      if (k === i) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else v.pause();
    });
  }, [i]);

  // Move on by itself: photos after a few seconds, videos when they finish.
  useEffect(() => {
    if (hold || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go(i + 1), ads[i]?.video ? VIDEO_MAX_MS : IMAGE_MS);
    return () => clearTimeout(t);
  }, [i, hold, n, ads, go]);

  return (
    <section className="bb" aria-roledescription="carousel" aria-label="Featured on AdsVane" onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)} onPointerLeave={() => setHold(false)}>
      <div className="bb-track" ref={track} onScroll={onScroll}>
        {ads.map((a, k) => (
          <div className="bb-slide" key={a.id} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}: ${a.biz.name}`}>
            {(a.poster || !a.video) && <div className="bb-blur" style={{ backgroundImage: `url("${(a.poster || a.url).replace(/"/g, "%22")}")` }} aria-hidden="true" />}
            <Link href={`/b/${a.biz.slug}`} className="bb-media" tabIndex={-1} aria-hidden="true">
              {a.video ? (
                <video
                  ref={(el) => {
                    vids.current[k] = el;
                  }}
                  src={a.url}
                  poster={a.poster || undefined}
                  muted={muted}
                  playsInline
                  preload={k === 0 ? "auto" : "metadata"}
                  autoPlay={k === 0}
                  onEnded={() => !hold && go(k + 1)}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt="" loading={k === 0 ? "eager" : "lazy"} />
              )}
            </Link>
            {a.sponsored && <span className="bb-tag">Sponsored</span>}
            <div className="bb-info">
              <Link href={`/b/${a.biz.slug}`} className="bb-who">
                <Avatar name={a.biz.name} url={a.biz.logo_url} />
                <span>
                  <b>{a.biz.name}</b>
                  <small>
                    {a.biz.category} · {a.biz.city}, {a.biz.state}
                  </small>
                </span>
              </Link>
              {a.text && <p className="bb-text">{a.text}</p>}
              <div className="bb-btns">
                <Link className="b bb-go" href={`/b/${a.biz.slug}`}>View page</Link>
                <Link className="b bb-ct" href={`/b/${a.biz.slug}#contact`}>Contact</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      {ads[i]?.video && (
        <button type="button" className="bb-snd" onClick={() => setMuted(!muted)} aria-label={muted ? "Turn sound on" : "Turn sound off"}>
          {muted ? "🔇" : "🔊"}
        </button>
      )}
      {n > 1 && (
        <>
          <button type="button" className="bb-arrow prev" aria-label="Previous" onClick={() => go(i - 1)}>‹</button>
          <button type="button" className="bb-arrow next" aria-label="Next" onClick={() => go(i + 1)}>›</button>
          <div className="bb-bars" aria-hidden="true">
            {ads.map((a, k) => (
              <span key={a.id} className={k < i ? "done" : k === i ? (hold ? "on held" : "on") : ""} style={k === i ? ({ "--d": `${a.video ? VIDEO_MAX_MS : IMAGE_MS}ms` } as React.CSSProperties) : undefined} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
