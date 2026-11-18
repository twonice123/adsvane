"use client";
import { useEffect, useState } from "react";

// A square picture split down the middle: each half softly flips through photos.
export default function SplitShow({ pics }: { pics: string[] }) {
  const left = pics.filter((_, k) => k % 2 === 0);
  const right = pics.filter((_, k) => k % 2 === 1);
  if (!right.length && left.length > 1) right.push(...left.splice(Math.ceil(left.length / 2)));
  const [i, setI] = useState(0);
  useEffect(() => {
    if (pics.length < 3 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((k) => k + 1), 3200);
    return () => clearInterval(t);
  }, [pics.length]);
  const half = (list: string[], at: number) => (
    <div className="split-half">
      {list.length ? (
        list.map((p, k) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p} src={p} alt="" className={k === at % list.length ? "on" : ""} loading={k < 1 ? "eager" : "lazy"} />
        ))
      ) : (
        <div className="split-empty" />
      )}
    </div>
  );
  return (
    <div className="split" aria-hidden="true">
      {half(left, i)}
      {/* The right half changes a beat later so the two sides don't flip together. */}
      {half(right, Math.max(0, i - 1))}
    </div>
  );
}
