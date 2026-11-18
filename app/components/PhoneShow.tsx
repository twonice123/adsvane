"use client";
import { useEffect, useState } from "react";

// A phone that softly flips through photos, like the one on Instagram's front page.
export default function PhoneShow({ pics, names }: { pics: string[]; names: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (pics.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((k) => (k + 1) % pics.length), 3200);
    return () => clearInterval(t);
  }, [pics.length]);
  return (
    <div className="ph-screen">
      {pics.length ? (
        pics.map((p, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p} src={p} alt="" className={k === i ? "on" : ""} loading={k < 2 ? "eager" : "lazy"} />
        ))
      ) : (
        <div className="ph-empty" />
      )}
      <div className="ph-ui" aria-hidden="true">
        <div className="ph-top">
          <span className="ph-dot" />
          <b>{names[i] || "Local pro near you"}</b>
          <span className="ph-spon">Sponsored</span>
        </div>
        <div className="ph-bottom">
          <span className="ph-btn">View page</span>
          <span className="ph-btn ghost">Contact</span>
        </div>
      </div>
    </div>
  );
}
