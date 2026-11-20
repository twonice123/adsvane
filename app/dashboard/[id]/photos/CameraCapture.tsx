"use client";
import { useEffect, useRef, useState } from "react";
import { recorderType } from "@/lib/media";

// In-app camera, like Instagram: tap the button for a photo, or switch to Video and
// tap to record (up to 15 seconds). The gallery button picks from the phone instead.
const MAX_SECONDS = 15;

export default function CameraCapture({ onShot, onGallery, onClose }: { onShot: (f: File) => void; onGallery: () => void; onClose: () => void }) {
  const view = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [mode, setMode] = useState<"photo" | "video">("video");
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [secs, setSecs] = useState(-1);

  useEffect(() => {
    let stop = false;
    (async () => {
      setReady(false);
      setErr("");
      stream.current?.getTracks().forEach((t) => t.stop());
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 }, aspectRatio: { ideal: 9 / 16 } },
          audio: true,
        });
        if (stop) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        const v = view.current;
        if (v) {
          v.srcObject = s;
          await v.play().catch(() => {});
        }
        setReady(true);
      } catch {
        if (!stop) setErr("We can't open your camera. Allow camera and microphone for this site, or pick from your gallery.");
      }
    })();
    return () => {
      stop = true;
    };
  }, [facing]);

  useEffect(
    () => () => {
      if (rec.current?.state === "recording") rec.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  function photo() {
    const v = view.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    // The front camera shows a mirror image; save it the way you saw it.
    if (facing === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    c.toBlob((b) => b && onShot(new File([b], "photo.jpg", { type: "image/jpeg" })), "image/jpeg", 0.92);
  }

  function record() {
    const s = stream.current;
    if (!s) return;
    if (rec.current?.state === "recording") return rec.current.stop();
    const mime = recorderType();
    let mr: MediaRecorder;
    try {
      mr = mime ? new MediaRecorder(s, { mimeType: mime, videoBitsPerSecond: 3_500_000 }) : new MediaRecorder(s);
    } catch {
      return setErr("This phone can't record here. Record with your camera app, then pick it from your gallery.");
    }
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const t0 = performance.now();
    const tick = setInterval(() => {
      const t = (performance.now() - t0) / 1000;
      setSecs(t);
      if (t >= MAX_SECONDS && mr.state === "recording") mr.stop();
    }, 100);
    mr.onstop = () => {
      clearInterval(tick);
      setSecs(-1);
      const type = (mr.mimeType || mime || "video/webm").startsWith("video/mp4") ? "video/mp4" : "video/webm";
      const blob = new Blob(chunks, { type });
      if (blob.size) onShot(new File([blob], type === "video/mp4" ? "video.mp4" : "video.webm", { type }));
    };
    rec.current = mr;
    mr.start(250);
    setSecs(0);
  }

  const recording = secs >= 0;
  const ring = recording ? Math.min(1, secs / MAX_SECONDS) : 0;
  return (
    <div className="cam" role="dialog" aria-modal="true" aria-label="Camera">
      <video ref={view} className={facing === "user" ? "mirror" : ""} playsInline muted autoPlay />
      <div className="cam-top">
        <button type="button" className="cam-ic" onClick={onClose} aria-label="Close" disabled={recording}>✕</button>
        {recording && <span className="cam-time">0:{String(Math.floor(secs)).padStart(2, "0")} / 0:15</span>}
      </div>
      {err && (
        <div className="cam-err">
          <p>{err}</p>
          <button type="button" className="ed-btn" onClick={onGallery}>Choose from gallery</button>
        </div>
      )}
      <div className="cam-bottom">
        {!recording && (
          <div className="cam-modes" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "photo"} className={mode === "photo" ? "on" : ""} onClick={() => setMode("photo")}>PHOTO</button>
            <button type="button" role="tab" aria-selected={mode === "video"} className={mode === "video" ? "on" : ""} onClick={() => setMode("video")}>VIDEO</button>
          </div>
        )}
        <div className="cam-row">
          <button type="button" className="cam-gal" onClick={onGallery} aria-label="Choose from gallery" disabled={recording}>
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="9" cy="9" r="2" fill="currentColor" /><path d="m4 18 5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
            <small>Gallery</small>
          </button>
          <button
            type="button"
            className={`cam-shoot ${mode}${recording ? " rec" : ""}`}
            onClick={() => (mode === "photo" ? photo() : record())}
            disabled={!ready}
            aria-label={mode === "photo" ? "Take photo" : recording ? "Stop recording" : "Start recording"}
            style={{ ["--p" as string]: ring }}
          >
            <span />
          </button>
          <button type="button" className="cam-ic cam-flip" onClick={() => setFacing(facing === "user" ? "environment" : "user")} aria-label="Flip camera" disabled={recording}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9.5 12.5a2.7 2.7 0 0 1 4.8-1.2M14.5 14a2.7 2.7 0 0 1-4.8 1.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <p className="cam-hint">{mode === "photo" ? "Tap to take a photo" : recording ? "Tap to stop" : "Tap to record (up to 15 seconds)"}</p>
      </div>
    </div>
  );
}
