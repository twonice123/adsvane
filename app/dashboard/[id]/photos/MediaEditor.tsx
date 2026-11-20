"use client";
import { useEffect, useRef, useState } from "react";

// Instagram-style editor that opens after picking one photo or video:
// Text, Stickers, Music (Audio), Voice-over and Captions. On "Next" everything is
// drawn into a new photo or video file, so it looks the same everywhere it is shared.

type Item = { id: string; kind: "text" | "emoji"; text: string; x: number; y: number; size: number; color: string; box: "" | "dark" | "light" | "brand" };
type Cap = { start: number; end: number; text: string };
type Panel = "" | "text" | "stickers" | "audio" | "voice" | "captions";

const COLORS = ["#ffffff", "#0d0b12", "#4c3a99", "#ffd43b", "#ff4d6d", "#2ec4b6"];
const EMOJI = ["🔥", "✨", "💅", "💇‍♀️", "✂️", "💈", "❤️", "😍", "👑", "💯", "📍", "📅", "⭐", "🎉", "💜", "👀", "🙌", "💄", "🧴", "🌸"];
const WORDS = ["BOOK NOW", "NEW", "SALE", "OPEN TODAY", "DM TO BOOK", "WALK-INS WELCOME", "LIMITED SPOTS"];
const MAX_SECONDS = 15;
const FONT = '700 {S}px Inter, system-ui, -apple-system, "Segoe UI", sans-serif';

// Rounded box, with a plain box on older phones that can't round corners.
function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

function boxColor(b: Item["box"]) {
  return b === "dark" ? "rgba(13,11,18,.78)" : b === "light" ? "rgba(255,255,255,.92)" : b === "brand" ? "#4c3a99" : "";
}

// Draw one text or sticker exactly where it sits in the preview.
function drawItem(ctx: CanvasRenderingContext2D, it: Item, W: number, H: number) {
  const fs = it.size * W;
  ctx.font = FONT.replace("{S}", String(Math.round(fs)));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = it.text.split("\n");
  const lh = fs * 1.25;
  const cx = it.x * W;
  const top = it.y * H - (lines.length * lh) / 2;
  lines.forEach((ln, i) => {
    const cy = top + lh * i + lh / 2;
    const bg = boxColor(it.box);
    if (bg && ln.trim()) {
      const w = ctx.measureText(ln).width + fs * 0.8;
      const h = lh;
      ctx.fillStyle = bg;
      const r = fs * 0.3;
      pill(ctx, cx - w / 2, cy - h / 2, w, h, r);
    }
    if (!bg && it.kind === "text") {
      ctx.shadowColor = "rgba(0,0,0,.45)";
      ctx.shadowBlur = fs * 0.15;
    }
    ctx.fillStyle = it.color;
    ctx.fillText(ln, cx, cy);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > max && line) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  return out.slice(-2);
}

function drawCaption(ctx: CanvasRenderingContext2D, caps: Cap[], t: number, W: number, H: number) {
  const c = caps.find((x) => t >= x.start && t < x.end);
  if (!c) return;
  const fs = W * 0.048;
  ctx.font = FONT.replace("{S}", String(Math.round(fs)));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrap(ctx, c.text, W * 0.84);
  const lh = fs * 1.35;
  const top = H * 0.84 - (lines.length * lh) / 2;
  lines.forEach((ln, i) => {
    const cy = top + lh * i + lh / 2;
    const w = ctx.measureText(ln).width + fs * 0.8;
    ctx.fillStyle = "rgba(13,11,18,.72)";
    pill(ctx, W / 2 - w / 2, cy - lh / 2, w, lh, fs * 0.25);
    ctx.fillStyle = "#fff";
    ctx.fillText(ln, W / 2, cy);
  });
}

function pickMime() {
  const opts = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return opts.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) || "";
}

const media = (src: string, video: boolean) => {
  const el = document.createElement(video ? "video" : "audio") as HTMLMediaElement;
  el.src = src;
  el.preload = "auto";
  (el as HTMLVideoElement).playsInline = true;
  return el;
};
const ready = (el: HTMLMediaElement) =>
  new Promise<void>((res, rej) => {
    if (el.readyState >= 2) return res();
    el.onloadeddata = () => res();
    el.onerror = () => rej(new Error("load"));
    setTimeout(() => res(), 8000);
  });

export default function MediaEditor({ file, onCancel, onDone }: { file: File; onCancel: () => void; onDone: (f: File, edited: boolean) => void }) {
  const isVideo = file.type.startsWith("video/");
  const [url] = useState(() => URL.createObjectURL(file));
  const [items, setItems] = useState<Item[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("");
  const [draft, setDraft] = useState<Item | null>(null);
  const [music, setMusic] = useState<{ url: string; name: string } | null>(null);
  const [musicVol, setMusicVol] = useState(0.8);
  const [voice, setVoice] = useState<{ url: string; seconds: number } | null>(null);
  const [voiceVol, setVoiceVol] = useState(1);
  const [origOn, setOrigOn] = useState(true);
  const [caps, setCaps] = useState<Cap[]>([]);
  const [capText, setCapText] = useState("");
  const [rec, setRec] = useState<"" | "voice" | "caps">("");
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [dur, setDur] = useState(0);
  // Width ÷ height of the photo or video, so the editing area keeps its exact shape.
  const [ar, setAr] = useState(9 / 16);
  const stage = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const musicEl = useRef<HTMLAudioElement>(null);
  const voiceEl = useRef<HTMLAudioElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const stopRec = useRef<(() => void) | null>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  const autoText = useRef("");

  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  useEffect(() => {
    if (!isVideo) return;
    const v = vid.current;
    if (!v) return;
    v.muted = !origOn || rec === "voice";
  }, [origOn, rec, isVideo]);

  // Keep music and voice in step with the video as it loops.
  useEffect(() => {
    const v = vid.current;
    if (!isVideo || !v) return;
    let last = 0;
    const tick = () => {
      setNow(v.currentTime);
      if (v.currentTime + 0.05 < last) {
        for (const a of [musicEl.current, voiceEl.current]) if (a) { a.currentTime = 0; a.play().catch(() => {}); }
      }
      last = v.currentTime;
    };
    v.addEventListener("timeupdate", tick);
    return () => v.removeEventListener("timeupdate", tick);
  }, [isVideo]);
  useEffect(() => {
    if (musicEl.current) musicEl.current.volume = musicVol;
  }, [musicVol, music]);
  useEffect(() => {
    if (voiceEl.current) voiceEl.current.volume = voiceVol;
  }, [voiceVol, voice]);
  useEffect(() => {
    // For a photo, music and voice simply play in a loop.
    if (isVideo) return;
    for (const a of [musicEl.current, voiceEl.current]) if (a) { a.loop = true; a.currentTime = 0; a.play().catch(() => {}); }
  }, [music, voice, isVideo]);
  useEffect(() => {
    if (!isVideo) return;
    const v = vid.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
    for (const a of [musicEl.current, voiceEl.current]) if (a) { a.currentTime = 0; a.play().catch(() => {}); }
  }, [music, voice, isVideo]);

  const selected = items.find((i) => i.id === sel) || null;
  const upd = (id: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  function onDown(e: React.PointerEvent, it: Item) {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const r = stage.current!.getBoundingClientRect();
    drag.current = { id: it.id, dx: (e.clientX - r.left) / r.width - it.x, dy: (e.clientY - r.top) / r.height - it.y, moved: false };
    setSel(it.id);
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const r = stage.current!.getBoundingClientRect();
    const clamp = (n: number) => Math.min(0.97, Math.max(0.03, n));
    d.moved = true;
    upd(d.id, { x: clamp((e.clientX - r.left) / r.width - d.dx), y: clamp((e.clientY - r.top) / r.height - d.dy) });
  }
  function onUp(it: Item) {
    const d = drag.current;
    drag.current = null;
    // A tap (no drag) on selected text opens it for editing.
    if (d && !d.moved && it.kind === "text") {
      setDraft(it);
      setPanel("text");
    }
  }

  function saveDraft() {
    if (!draft) return setPanel("");
    if (!draft.text.trim()) {
      setItems((xs) => xs.filter((x) => x.id !== draft.id));
    } else if (items.some((x) => x.id === draft.id)) upd(draft.id, draft);
    else setItems((xs) => [...xs, draft]);
    setSel(draft.text.trim() ? draft.id : null);
    setDraft(null);
    setPanel("");
  }

  function addSticker(text: string, word: boolean) {
    const it: Item = word
      ? { id: crypto.randomUUID(), kind: "text", text, x: 0.5, y: 0.3 + Math.random() * 0.2, size: 0.06, color: "#ffffff", box: "brand" }
      : { id: crypto.randomUUID(), kind: "emoji", text, x: 0.5, y: 0.4 + Math.random() * 0.2, size: 0.14, color: "#000000", box: "" };
    setItems((xs) => [...xs, it]);
    setSel(it.id);
    setPanel("");
  }

  async function recordVoice() {
    setErr("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setErr("Allow the microphone to record a voice-over.");
    }
    const mr = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const started = performance.now();
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
      if (voice) URL.revokeObjectURL(voice.url);
      setVoice({ url: URL.createObjectURL(blob), seconds: Math.min(MAX_SECONDS, (performance.now() - started) / 1000) });
      setRec("");
      stopRec.current = null;
    };
    setRec("voice");
    musicEl.current?.pause();
    voiceEl.current?.pause();
    mr.start();
    const v = vid.current;
    const stop = () => mr.state === "recording" && mr.stop();
    stopRec.current = stop;
    if (isVideo && v) {
      v.loop = false;
      v.currentTime = 0;
      v.play().catch(() => {});
      v.onended = () => {
        v.loop = true;
        v.onended = null;
        stop();
        v.play().catch(() => {});
      };
    } else setTimeout(stop, MAX_SECONDS * 1000);
  }

  // Automatic captions: play the video out loud and write down what is said.
  function autoCaptions() {
    setErr("");
    const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    const v = vid.current;
    if (!SR || !v) return setErr("This browser can't listen for captions. Type them below instead.");
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || "en-US";
    const out: Cap[] = [];
    let segStart = -1;
    r.onresult = (e: SpeechEvt) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (segStart < 0) segStart = Math.max(0, v.currentTime - 0.6);
        if (res.isFinal) {
          const text = res[0].transcript.trim();
          if (text) out.push({ start: segStart, end: Math.max(segStart + 1, v.currentTime + 0.3), text });
          segStart = -1;
          setCaps([...out]);
        }
      }
    };
    r.onerror = () => setErr("We couldn't hear the video. Turn the sound up, or type the captions below.");
    setRec("caps");
    setCaps([]);
    v.muted = false;
    v.loop = false;
    v.currentTime = 0;
    const finish = () => {
      try { r.stop(); } catch {}
      v.loop = true;
      v.muted = !origOn;
      v.onended = null;
      setRec("");
      stopRec.current = null;
      setTimeout(() => {
        if (!out.length) return;
        autoText.current = out.map((c) => c.text).join("\n");
        setCapText(autoText.current);
      }, 600);
    };
    stopRec.current = finish;
    v.onended = () => setTimeout(finish, 900);
    try { r.start(); } catch {}
    v.play().catch(() => {});
  }

  // Typed captions: each line shows for an equal part of the video.
  function typedCaptions(text: string) {
    // Captions heard automatically keep their own timing unless they were changed.
    if (text === autoText.current && caps.length) return;
    autoText.current = "";
    if (!isVideo) {
      const t = text.trim().replace(/\s*\n\s*/g, " ");
      return setCaps(t ? [{ start: 0, end: 1e9, text: t }] : []);
    }
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const total = isVideo ? dur || MAX_SECONDS : 10;
    const step = lines.length ? total / lines.length : 0;
    setCaps(lines.map((t, i) => ({ start: i * step, end: (i + 1) * step, text: t })));
  }

  const edited = items.length > 0 || !!music || !!voice || caps.length > 0 || (isVideo && !origOn);

  async function finish() {
    setSel(null);
    if (!edited) return onDone(file, false);
    setErr("");
    try {
      if (!isVideo && !music && !voice) {
        setBusy("Saving your photo…");
        const im = img.current!;
        const s = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
        const W = Math.round(im.naturalWidth * s);
        const H = Math.round(im.naturalHeight * s);
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(im, 0, 0, W, H);
        items.forEach((it) => drawItem(ctx, it, W, H));
        drawCaption(ctx, caps, 0, W, H);
        const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9));
        if (!blob) throw new Error("x");
        return onDone(new File([blob], "post.jpg", { type: "image/jpeg" }), true);
      }
      await renderVideo();
    } catch (e) {
      console.error("editor", e);
      setBusy("");
      setErr("We couldn't finish your edits on this phone. Try again, or post without them.");
    }
  }

  async function renderVideo() {
    const mime = pickMime();
    if (!mime) throw new Error("no recorder");
    setBusy("Preparing your video… keep this screen open");
    vid.current?.pause();
    musicEl.current?.pause();
    voiceEl.current?.pause();
    // Phones only let sound play if it starts during the tap, so start (and pause) every player now.
    const base0 = isVideo ? (media(url, true) as HTMLVideoElement) : null;
    const music0 = music ? media(music.url, false) : null;
    const voice0 = voice ? media(voice.url, false) : null;
    for (const el of [base0, music0, voice0]) {
      if (!el) continue;
      el.play().catch(() => {});
      el.pause();
    }
    const ac = new AudioContext();
    ac.resume().catch(() => {});
    const dest = ac.createMediaStreamDestination();
    const holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:-9999px;top:0;width:2px;height:2px;overflow:hidden";
    document.body.appendChild(holder);
    const els: HTMLMediaElement[] = [];
    const route = (el: HTMLMediaElement, vol: number) => {
      const src = ac.createMediaElementSource(el);
      const g = ac.createGain();
      g.gain.value = vol;
      src.connect(g).connect(dest);
    };
    let base: HTMLVideoElement | null = null;
    let W: number, H: number, seconds: number;
    if (isVideo) {
      base = base0!;
      holder.appendChild(base);
      await ready(base);
      const s = Math.min(1, 1280 / Math.max(base.videoWidth, base.videoHeight));
      W = Math.round((base.videoWidth * s) / 2) * 2;
      H = Math.round((base.videoHeight * s) / 2) * 2;
      seconds = Math.min(MAX_SECONDS, base.duration || dur || MAX_SECONDS);
      if (origOn) route(base, 1);
      else base.muted = true;
    } else {
      const im = img.current!;
      const s = Math.min(1, 1280 / Math.max(im.naturalWidth, im.naturalHeight));
      W = Math.round((im.naturalWidth * s) / 2) * 2;
      H = Math.round((im.naturalHeight * s) / 2) * 2;
      seconds = Math.min(MAX_SECONDS, voice ? Math.max(3, voice.seconds) : 10);
    }
    if (music) {
      const a = music0!;
      holder.appendChild(a);
      await ready(a).catch(() => {});
      route(a, musicVol);
      els.push(a);
    }
    if (voice) {
      const a = voice0!;
      holder.appendChild(a);
      await ready(a).catch(() => {});
      route(a, voiceVol);
      els.push(a);
    }
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    const stream = new MediaStream([...c.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5_000_000 });
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((res) => (mr.onstop = () => res()));
    const im = img.current;
    const t0 = performance.now();
    const draw = (t: number) => {
      if (base) ctx.drawImage(base, 0, 0, W, H);
      else if (im) ctx.drawImage(im, 0, 0, W, H);
      items.forEach((it) => drawItem(ctx, it, W, H));
      drawCaption(ctx, caps, t, W, H);
    };
    draw(0);
    mr.start(250);
    if (base) {
      base.currentTime = 0;
      await base.play();
    }
    for (const a of els) {
      a.currentTime = 0;
      a.play().catch(() => {});
    }
    await new Promise<void>((res) => {
      const frame = () => {
        const t = base ? base.currentTime : (performance.now() - t0) / 1000;
        draw(t);
        setBusy(`Preparing your video… ${Math.min(99, Math.round((t / seconds) * 100))}%`);
        if ((base && base.ended) || t >= seconds) return res();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    mr.stop();
    await done;
    base?.pause();
    els.forEach((a) => a.pause());
    holder.remove();
    ac.close().catch(() => {});
    const type = mime.startsWith("video/mp4") ? "video/mp4" : "video/webm";
    const blob = new Blob(chunks, { type });
    if (blob.size > 50 * 1024 * 1024) throw new Error("big");
    onDone(new File([blob], type === "video/mp4" ? "post.mp4" : "post.webm", { type }), true);
  }

  const capNow = caps.find((x) => (isVideo ? now : 0) >= x.start && (isVideo ? now : 0) < x.end);

  return (
    <div className="ed" role="dialog" aria-modal="true" aria-label="Edit your post">
      <div className="ed-top">
        <button type="button" className="ed-x" onClick={onCancel} aria-label="Cancel" disabled={!!busy}>✕</button>
        {music && <span className="ed-tag">♪ {music.name}</span>}
      </div>

      <div className="ed-mid" onPointerDown={() => setSel(null)}>
        <div className="ed-stage" ref={stage} onPointerMove={onMove} style={{ ["--ar" as string]: ar }}>
          {isVideo ? (
            <video ref={vid} src={url} autoPlay loop playsInline muted={!origOn} onLoadedMetadata={(e) => { const v = e.currentTarget; setDur(v.duration); if (v.videoWidth) setAr(v.videoWidth / v.videoHeight); }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img ref={img} src={url} alt="" onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth) setAr(i.naturalWidth / i.naturalHeight); }} onError={() => onDone(file, false)} />
          )}
          {items.map((it) => (
            <div
              key={it.id}
              className={`ed-item ${it.kind} ${sel === it.id ? "sel" : ""}`}
              style={{ left: `${it.x * 100}%`, top: `${it.y * 100}%`, ["--fs" as string]: `${it.size * 100}cqw`, color: it.color }}
              onPointerDown={(e) => onDown(e, it)}
              onPointerUp={() => onUp(it)}
            >
              {it.text.split("\n").map((ln, i) => (
                <span key={i} style={{ background: boxColor(it.box) || undefined }} className={it.box ? "bx" : ""}>{ln || " "}</span>
              ))}
            </div>
          ))}
          {capNow && <div className="ed-cap"><span>{capNow.text}</span></div>}
        </div>
      </div>

      {selected && !panel && (
        <div className="ed-selbar" onPointerDown={(e) => e.stopPropagation()}>
          <label>
            <span>Size</span>
            <input type="range" min={selected.kind === "emoji" ? 0.06 : 0.03} max={selected.kind === "emoji" ? 0.4 : 0.16} step={0.005} value={selected.size} onChange={(e) => upd(selected.id, { size: Number(e.target.value) })} />
          </label>
          {selected.kind === "text" && <button type="button" className="ed-chip" onClick={() => { setDraft(selected); setPanel("text"); }}>Edit</button>}
          <button type="button" className="ed-chip bad" onClick={() => { setItems((xs) => xs.filter((x) => x.id !== selected.id)); setSel(null); }}>Delete</button>
          <button type="button" className="ed-chip on" onClick={() => setSel(null)}>Done</button>
        </div>
      )}

      {err && <p className="ed-err" role="alert">{err}</p>}

      {!panel && !selected && (
        <>
          <p className="ed-hint">{rec === "voice" ? "Recording… talk now" : rec === "caps" ? "Listening for captions…" : "Tap a tool to edit. Drag text and stickers to move them."}</p>
          <div className="ed-tools">
            <button type="button" onClick={() => setPanel("audio")} disabled={!!rec}><span aria-hidden="true">♫</span>Audio</button>
            <button type="button" onClick={() => { setDraft({ id: crypto.randomUUID(), kind: "text", text: "", x: 0.5, y: 0.45, size: 0.075, color: "#ffffff", box: "" }); setPanel("text"); }} disabled={!!rec}><span aria-hidden="true">Aa</span>Text</button>
            <button type="button" onClick={() => setPanel("voice")} disabled={rec === "caps"}><span aria-hidden="true">🎙</span>Voice</button>
            <button type="button" onClick={() => setPanel("captions")} disabled={rec === "voice"}><span aria-hidden="true">CC</span>Captions</button>
            <button type="button" onClick={() => setPanel("stickers")} disabled={!!rec}><span aria-hidden="true">☺</span>Stickers</button>
          </div>
          <div className="ed-foot">
            {rec ? (
              <button type="button" className="ed-next" onClick={() => stopRec.current?.()}>Stop</button>
            ) : (
              <button type="button" className="ed-next" onClick={finish} disabled={!!busy}>Next →</button>
            )}
          </div>
        </>
      )}

      {panel === "text" && draft && (
        <div className="ed-panel ed-textp" onPointerDown={(e) => e.stopPropagation()}>
          <textarea
            autoFocus
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value.slice(0, 200) })}
            placeholder="Type something…"
            rows={3}
            style={{ color: draft.box === "light" ? "#0d0b12" : draft.color, background: boxColor(draft.box) || "transparent" }}
            aria-label="Text"
          />
          <div className="ed-row">
            {COLORS.map((c) => (
              <button key={c} type="button" className={`ed-sw ${draft.color === c ? "on" : ""}`} style={{ background: c }} onClick={() => setDraft({ ...draft, color: c })} aria-label={`Color ${c}`} />
            ))}
          </div>
          <div className="ed-row">
            {(["", "dark", "light", "brand"] as const).map((b) => (
              <button key={b || "none"} type="button" className={`ed-chip ${draft.box === b ? "on" : ""}`} onClick={() => setDraft({ ...draft, box: b, color: b === "light" && draft.color === "#ffffff" ? "#0d0b12" : draft.color })}>
                {b === "" ? "Plain" : b === "dark" ? "Dark box" : b === "light" ? "Light box" : "Purple box"}
              </button>
            ))}
          </div>
          <button type="button" className="ed-next" onClick={saveDraft}>Done</button>
        </div>
      )}

      {panel === "stickers" && (
        <div className="ed-panel" onPointerDown={(e) => e.stopPropagation()}>
          <div className="ed-ph"><b>Stickers</b><button type="button" className="ed-chip" onClick={() => setPanel("")}>Close</button></div>
          <div className="ed-words">
            {WORDS.map((w) => <button key={w} type="button" className="ed-word" onClick={() => addSticker(w, true)}>{w}</button>)}
          </div>
          <div className="ed-emoji">
            {EMOJI.map((e) => <button key={e} type="button" onClick={() => addSticker(e, false)} aria-label={`Sticker ${e}`}>{e}</button>)}
          </div>
        </div>
      )}

      {panel === "audio" && (
        <div className="ed-panel" onPointerDown={(e) => e.stopPropagation()}>
          <div className="ed-ph"><b>Audio</b><button type="button" className="ed-chip" onClick={() => setPanel("")}>Done</button></div>
          <input
            ref={musicInput}
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (music) URL.revokeObjectURL(music.url);
              setMusic({ url: URL.createObjectURL(f), name: f.name.replace(/\.\w+$/, "").slice(0, 40) });
            }}
          />
          <button type="button" className="ed-btn" onClick={() => musicInput.current?.click()}>{music ? "Change song" : "Add a song from your phone"}</button>
          {music && (
            <>
              <label className="ed-range"><span>Song volume</span><input type="range" min={0} max={1} step={0.05} value={musicVol} onChange={(e) => setMusicVol(Number(e.target.value))} /></label>
              <button type="button" className="ed-chip bad" onClick={() => { URL.revokeObjectURL(music.url); setMusic(null); }}>Remove song</button>
            </>
          )}
          {isVideo && (
            <label className="ed-check"><input type="checkbox" checked={origOn} onChange={(e) => setOrigOn(e.target.checked)} /> Keep the video&apos;s own sound</label>
          )}
          <p className="ed-note">Only use music you have the rights to share.</p>
        </div>
      )}

      {panel === "voice" && (
        <div className="ed-panel" onPointerDown={(e) => e.stopPropagation()}>
          <div className="ed-ph"><b>Voice-over</b><button type="button" className="ed-chip" onClick={() => setPanel("")}>Done</button></div>
          <p className="ed-note">{isVideo ? "Your video plays from the start while you talk. It stops by itself at the end." : `Talk for up to ${MAX_SECONDS} seconds, then tap Stop.`}</p>
          <button type="button" className="ed-btn" onClick={() => { setPanel(""); recordVoice(); }}>{voice ? "Record again" : "● Start recording"}</button>
          {voice && (
            <>
              <label className="ed-range"><span>Voice volume</span><input type="range" min={0} max={1} step={0.05} value={voiceVol} onChange={(e) => setVoiceVol(Number(e.target.value))} /></label>
              <button type="button" className="ed-chip bad" onClick={() => { URL.revokeObjectURL(voice.url); setVoice(null); }}>Remove voice-over</button>
            </>
          )}
        </div>
      )}

      {panel === "captions" && (
        <div className="ed-panel" onPointerDown={(e) => e.stopPropagation()}>
          <div className="ed-ph"><b>Captions</b><button type="button" className="ed-chip" onClick={() => { typedCaptions(capText); setPanel(""); }}>Done</button></div>
          {isVideo && <button type="button" className="ed-btn" onClick={() => { setPanel(""); autoCaptions(); }}>Make captions automatically</button>}
          <label className="ed-note" htmlFor="ed-captext">{isVideo ? "Or type them. Each line shows for part of the video, in order." : "Type a caption to show at the bottom of your photo."}</label>
          <textarea id="ed-captext" className="ed-captext" rows={4} value={capText} onChange={(e) => setCapText(e.target.value)} placeholder={"Knotless braids, waist length\nBook this week!"} />
          {caps.length > 0 && <button type="button" className="ed-chip bad" onClick={() => { setCaps([]); setCapText(""); }}>Remove captions</button>}
        </div>
      )}

      {music && <audio ref={musicEl} src={music.url} preload="auto" />}
      {voice && <audio ref={voiceEl} src={voice.url} preload="auto" />}
      {busy && <div className="ed-busy" role="status"><span className="spin" aria-hidden="true" />{busy}</div>}
    </div>
  );
}

type SpeechEvt = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type SpeechRec = { continuous: boolean; interimResults: boolean; lang: string; onresult: (e: SpeechEvt) => void; onerror: () => void; start: () => void; stop: () => void };
