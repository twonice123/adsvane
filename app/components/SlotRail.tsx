"use client";
import { useEffect, useRef } from "react";

// Billboard spots that slide by themselves. Until real videos and flyers are added,
// each spot shows what goes there.
export default function SlotRail({ items, vertical = false }: { items: { label: string; sub: string; kind: "video" | "flyer" }[]; vertical?: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const r = el.current;
    if (!r || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let k = 0;
    const t = setInterval(() => {
      const kids = r.children.length;
      if (!kids) return;
      k = (k + 1) % kids;
      const c = r.children[k] as HTMLElement;
      r.scrollTo(vertical ? { top: c.offsetTop - r.offsetTop, behavior: "smooth" } : { left: c.offsetLeft - r.offsetLeft, behavior: "smooth" });
    }, 2800);
    return () => clearInterval(t);
  }, [vertical]);
  return (
    <div ref={el} className={`slots${vertical ? " v" : ""}`}>
      {items.map((s, k) => (
        <div key={k} className={`slot ${s.kind}`}>
          <span className="slot-ic" aria-hidden="true">
            {s.kind === "video" ? (
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
            )}
          </span>
          <b>{s.label}</b>
          <small>{s.sub}</small>
        </div>
      ))}
    </div>
  );
}
