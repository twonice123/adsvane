"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { focusStyle, focusText, parseFocus, type Focus } from "@/lib/data";
import { saveFocus } from "../photo-actions";

// Lets an owner drag their cover or profile picture into place and zoom it.
export default function FrameEditor({
  businessId,
  kind,
  url,
  focus,
  className = "chip",
}: {
  businessId: string;
  kind: "cover" | "logo";
  url: string;
  focus: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Focus>(parseFocus(focus));
  const [error, setError] = useState("");
  const [saving, start] = useTransition();
  const router = useRouter();
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; f: Focus } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function begin() {
    setF(parseFocus(focus));
    setError("");
    setOpen(true);
  }

  function onDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, f };
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    const box = frame.current?.getBoundingClientRect();
    if (!d || !box) return;
    // Dragging the photo right shows more of its left side, so the focus point moves left.
    const k = 140 / d.f.z;
    const clamp = (n: number) => Math.min(100, Math.max(0, n));
    setF({ ...d.f, x: clamp(d.f.x - ((e.clientX - d.x) / box.width) * k), y: clamp(d.f.y - ((e.clientY - d.y) / box.height) * k) });
  }
  function onUp() {
    drag.current = null;
  }
  function nudge(dx: number, dy: number) {
    setF((v) => ({ ...v, x: Math.min(100, Math.max(0, v.x + dx)), y: Math.min(100, Math.max(0, v.y + dy)) }));
  }

  function save() {
    start(async () => {
      const r = await saveFocus(businessId, kind, focusText(f));
      if (r.error) return setError(r.error);
      setOpen(false);
      router.refresh();
    });
  }

  const label = kind === "cover" ? "cover photo" : "profile picture";
  return (
    <>
      <button type="button" className={className} onClick={begin}>
        Adjust
      </button>
      {open && (
        <div className="fe-back" role="dialog" aria-modal="true" aria-label={`Adjust your ${label}`} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="fe-box">
            <h2>Adjust your {label}</h2>
            <p className="muted" style={{ marginTop: 0 }}>Drag the photo to move it. Use the slider to zoom in.</p>
            <div
              ref={frame}
              className={`fe-frame ${kind === "cover" ? "fe-wide" : "fe-round"}`}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 10 : 2;
                if (e.key === "ArrowLeft") nudge(step, 0);
                else if (e.key === "ArrowRight") nudge(-step, 0);
                else if (e.key === "ArrowUp") nudge(0, step);
                else if (e.key === "ArrowDown") nudge(0, -step);
                else return;
                e.preventDefault();
              }}
              tabIndex={0}
              aria-label="Photo position. Drag, or use the arrow keys."
            >
              <img src={url} alt="" draggable={false} style={focusStyle(f)} />
              <span className="fe-hint" aria-hidden="true">✥ Drag to move</span>
            </div>
            <label className="fe-zoom">
              <span>Zoom</span>
              <input type="range" min={1} max={3} step={0.05} value={f.z} onChange={(e) => setF({ ...f, z: Number(e.target.value) })} aria-label="Zoom" />
            </label>
            {error && <p className="err" role="alert">{error}</p>}
            <div className="btns" style={{ marginTop: 14 }}>
              <button type="button" className="b" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
              <button type="button" className="b ghost" onClick={() => setF({ x: 50, y: 50, z: 1 })}>Reset</button>
              <button type="button" className="b ghost" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
