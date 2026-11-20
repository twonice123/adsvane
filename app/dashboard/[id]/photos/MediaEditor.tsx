"use client";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { AUDIO_BITRATE, SOUND_SECONDS, VIDEO_BITRATE, compressVideo, readSong, recorderType, songClip, videoSize } from "@/lib/media";
import {
  ANIMS, EFFECTS, FONTS, FONTS_URL, SWATCHES, colorsOf, cssFont, drawCaption, drawItem, effectCss, fontStr, hexToHsv, hsvToHex, moves, rgbToHex,
  type Box, type Cap, type Item,
} from "./textStyles";
import { EMOJI_GROUPS, PROMO_GROUPS } from "./stickers";

// Instagram-style editor that opens after picking one photo or video:
// Audio, Text, Voice-over, Captions and Stickers. On "Next" everything is drawn into
// a new photo or video file, so it looks the same everywhere it is shared.

type Panel = "" | "text" | "stickers" | "audio" | "voice" | "captions";
type Tab = "kbd" | "font" | "color" | "anim" | "effect";

const MAX_SECONDS = 15;

const newText = (): Item => ({ id: crypto.randomUUID(), kind: "text", text: "", x: 0.5, y: 0.45, size: 0.075, color: "#ffffff", font: "classic", effect: "soft", anim: "none", bg: "", align: "center" });


type Sound = { id: string; title: string; added_name: string | null; url: string; uses: number };

const media = (src: string, video: boolean) => {
  const el = document.createElement(video ? "video" : "audio") as HTMLMediaElement;
  if (src.startsWith("http")) el.crossOrigin = "anonymous";
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

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

let measurer: CanvasRenderingContext2D | null = null;
function textWidth(it: Item, px: number) {
  measurer ||= document.createElement("canvas").getContext("2d");
  if (!measurer) return 0;
  measurer.font = fontStr(it, px);
  return Math.max(0, ...it.text.split("\n").map((l) => measurer!.measureText(l).width));
}

const AlignIcon = ({ a }: { a: Item["align"] }) => (
  <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden="true">
    {[3, 9, 15].map((y, i) => {
      const w = i === 1 ? 14 : 22;
      const x = a === "left" ? 2 : a === "right" ? 24 - w : 13 - w / 2;
      return <rect key={y} x={x} y={y} width={w} height="2.6" rx="1.3" fill="currentColor" />;
    })}
  </svg>
);

export default function MediaEditor({ file, businessId, onCancel, onDone }: { file: File; businessId?: string; onCancel: () => void; onDone: (f: File, edited: boolean) => void }) {
  const isVideo = file.type.startsWith("video/");
  const [url] = useState(() => URL.createObjectURL(file));
  const [items, setItems] = useState<Item[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("");
  const [draft, setDraft] = useState<Item | null>(null);
  const [tab, setTab] = useState<Tab>("kbd");
  const [hsv, setHsv] = useState({ h: 0, s: 0, v: 1 });
  const [picking, setPicking] = useState(false);
  const [stickTab, setStickTab] = useState("beauty");
  const [music, setMusic] = useState<{ url: string; name: string; soundId?: string; local?: boolean } | null>(null);
  // The shared sound library.
  const [sounds, setSounds] = useState<Sound[] | null>(null);
  const [q, setQ] = useState("");
  const [hear, setHear] = useState("");
  const [adding, setAdding] = useState<{ file: File; title: string; share: boolean; rights: boolean; buf: AudioBuffer | null; start: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const preview = useRef<HTMLAudioElement | null>(null);
  const [musicVol, setMusicVol] = useState(0.8);
  const [voice, setVoice] = useState<{ url: string; seconds: number } | null>(null);
  const [voiceVol, setVoiceVol] = useState(1);
  const [origOn, setOrigOn] = useState(true);
  const [caps, setCaps] = useState<Cap[]>([]);
  const [capText, setCapText] = useState("");
  const [rec, setRec] = useState<"" | "voice" | "caps">("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [dur, setDur] = useState(0);
  const [ar, setAr] = useState(9 / 16);
  const [stageW, setStageW] = useState(300);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const typer = useRef<HTMLTextAreaElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const musicEl = useRef<HTMLAudioElement>(null);
  const voiceEl = useRef<HTMLAudioElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean; sx: number; sy: number } | null>(null);
  const editFrom = useRef<{ x: number; y: number } | null>(null);
  const stopRec = useRef<(() => void) | null>(null);
  const musicInput = useRef<HTMLInputElement>(null);
  const autoText = useRef("");
  const boxes = useRef(new Map<string, Box>());
  const live = useRef({ items, draft, sel, caps, panel, tab });
  live.current = { items, draft, sel, caps, panel, tab };

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  // Fonts for the text tool.
  useEffect(() => {
    if (document.getElementById("ed-fonts")) return;
    const l = document.createElement("link");
    l.id = "ed-fonts";
    l.rel = "stylesheet";
    l.href = FONTS_URL;
    document.head.appendChild(l);
  }, []);
  useEffect(() => {
    for (const it of draft ? [...items, draft] : items) if (it.kind === "text") document.fonts?.load(fontStr(it, 40), it.text || "A").catch(() => {});
  }, [items, draft]);

  // Keep the editor above the phone's keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = root.current;
    if (!vv || !el) return;
    const fit = () => {
      el.style.setProperty("--vvh", `${vv.height}px`);
      el.style.setProperty("--vvt", `${vv.offsetTop}px`);
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, []);

  // The drawing layer matches the picture's size on screen.
  useEffect(() => {
    const st = stage.current;
    const c = canvas.current;
    if (!st || !c) return;
    const ro = new ResizeObserver(() => {
      const r = st.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      setStageW(r.width);
    });
    ro.observe(st);
    return () => ro.disconnect();
  }, []);

  // Draw text, stickers and captions over the picture, every frame, so animations play.
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      const c = canvas.current;
      const ctx = c?.getContext("2d");
      if (c && ctx) {
        const L = live.current;
        const W = c.width, H = c.height;
        const t = isVideo && vid.current ? vid.current.currentTime : (performance.now() - t0) / 1000;
        ctx.clearRect(0, 0, W, H);
        boxes.current.clear();
        for (const it of L.items) {
          if (L.draft && it.id === L.draft.id) continue;
          boxes.current.set(it.id, drawItem(ctx, it, W, H, t, it.id === L.sel && !L.panel));
        }
        if (L.draft && L.panel === "text") {
          const animate = L.tab === "anim" || (L.tab !== "kbd" && L.draft.effect === "shimmer");
          if (L.draft.text) drawItem(ctx, L.draft, W, H, animate ? t : null);
        } else drawCaption(ctx, L.caps, isVideo ? t : 0, W, H);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [isVideo]);

  // Keyboard shows only on the keyboard tab.
  useEffect(() => {
    if (panel !== "text") return;
    if (tab === "kbd") setTimeout(() => typer.current?.focus(), 30);
    else typer.current?.blur();
  }, [tab, panel]);

  useEffect(() => {
    if (!isVideo) return;
    const v = vid.current;
    if (v) v.muted = !origOn || rec === "voice";
  }, [origOn, rec, isVideo]);

  // Keep music and voice in step with the video as it loops.
  useEffect(() => {
    const v = vid.current;
    if (!isVideo || !v) return;
    let last = 0;
    const tick = () => {
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
    if (isVideo) {
      const v = vid.current;
      if (!v) return;
      v.currentTime = 0;
      v.play().catch(() => {});
    }
    for (const a of [musicEl.current, voiceEl.current]) if (a) { a.loop = !isVideo; a.currentTime = 0; a.play().catch(() => {}); }
  }, [music, voice, isVideo]);

  useEffect(() => {
    if (panel !== "audio") {
      preview.current?.pause();
      setHear("");
      return;
    }
    let stop = false;
    const t = setTimeout(async () => {
      const sb = browserClient();
      let qb = sb.from("sounds").select("id,title,added_name,url,uses").order("uses", { ascending: false }).order("created_at", { ascending: false }).limit(40);
      const term = q.trim().replace(/[%_,()]/g, " ");
      if (term) qb = qb.ilike("title", `%${term}%`);
      const { data } = await qb;
      if (!stop) setSounds((data as Sound[]) || []);
    }, q ? 300 : 0);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [panel, q]);

  function listen(s: Sound) {
    const a = (preview.current ||= new Audio());
    if (hear === s.id) {
      a.pause();
      return setHear("");
    }
    a.src = s.url;
    a.currentTime = 0;
    a.play().catch(() => {});
    a.onended = () => setHear("");
    setHear(s.id);
  }
  function pickSound(s: Sound) {
    preview.current?.pause();
    setHear("");
    if (music?.local) URL.revokeObjectURL(music.url);
    setMusic({ url: s.url, name: s.title, soundId: s.id });
  }
  const partUrl = useRef("");
  function playPart(f: File, start: number) {
    const a = (preview.current ||= new Audio());
    if (hear === "part") {
      a.pause();
      return setHear("");
    }
    if (!partUrl.current) partUrl.current = URL.createObjectURL(f);
    a.src = partUrl.current;
    a.currentTime = start;
    a.play().catch(() => {});
    const stopAt = start + SOUND_SECONDS;
    a.ontimeupdate = () => {
      if (a.currentTime >= stopAt) {
        a.pause();
        setHear("");
      }
    };
    setHear("part");
  }
  useEffect(() => {
    if (adding) return;
    if (partUrl.current) URL.revokeObjectURL(partUrl.current);
    partUrl.current = "";
  }, [adding]);

  async function addOwn() {
    if (!adding) return;
    const title = adding.title.trim().slice(0, 80);
    if (!title) return setErr("Give your sound a name.");
    if (adding.share && !adding.rights) return setErr("Tick the box to confirm you can share this sound, or turn off sharing.");
    if (!adding.buf) return setErr("Still reading the song… try again in a moment.");
    setErr("");
    if (music?.local) URL.revokeObjectURL(music.url);
    preview.current?.pause();
    setHear("");
    setSaving(true);
    let clip: File;
    try {
      // Keep only the part you picked (30 seconds), as a small MP3.
      clip = await songClip(adding.buf, adding.start);
    } catch {
      setSaving(false);
      return setErr("We couldn't read that song. Try an MP3 or M4A file.");
    }
    if (!adding.share) {
      setMusic({ url: URL.createObjectURL(clip), name: title, local: true });
      setSaving(false);
      return setAdding(null);
    }
    try {
      const sb = browserClient();
      const { data: u } = await sb.auth.getUser();
      if (!u.user) throw new Error("login");
      const id = crypto.randomUUID();
      const path = `${u.user.id}/${id}.mp3`;
      const up = await sb.storage.from("sounds").upload(path, clip, { contentType: "audio/mpeg", cacheControl: "31536000" });
      if (up.error) throw up.error;
      const url = sb.storage.from("sounds").getPublicUrl(path).data.publicUrl;
      let who: string | null = null;
      if (businessId) who = ((await sb.from("businesses").select("name").eq("id", businessId).maybeSingle()).data as { name?: string } | null)?.name || null;
      const { error } = await sb.from("sounds").insert({ id, title, path, url, added_by: u.user.id, added_name: who, seconds: Math.round(Math.min(SOUND_SECONDS, adding.buf.duration - adding.start)) });
      if (error) throw error;
      setMusic({ url, name: title, soundId: id });
      setSounds((xs) => [{ id, title, added_name: who, url, uses: 0 }, ...(xs || [])]);
      setAdding(null);
    } catch {
      setErr("We couldn't add that sound. Please check your connection and try again.");
    }
    setSaving(false);
  }

  const selected = items.find((i) => i.id === sel) || null;
  const upd = (id: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const setD = (p: Partial<Item>) => setDraft((d) => (d ? { ...d, ...p } : d));

  function openText(it: Item | null) {
    const base = it || newText();
    editFrom.current = { x: base.x, y: base.y };
    setDraft({ ...base, x: 0.5, y: 0.42 });
    setHsv(hexToHsv(base.color));
    setSel(null);
    setTab("kbd");
    setPanel("text");
  }
  function saveDraft() {
    const d = draft;
    setPanel("");
    setDraft(null);
    setPicking(false);
    if (!d) return;
    const done = { ...d, ...(editFrom.current || {}) };
    if (!done.text.trim()) setItems((xs) => xs.filter((x) => x.id !== done.id));
    else if (items.some((x) => x.id === done.id)) upd(done.id, done);
    else setItems((xs) => [...xs, done]);
    setSel(null);
  }

  function point(e: React.PointerEvent) {
    const r = stage.current!.getBoundingClientRect();
    return { nx: (e.clientX - r.left) / r.width, ny: (e.clientY - r.top) / r.height };
  }
  function pickColor(nx: number, ny: number) {
    const m = (isVideo ? vid.current : img.current) as CanvasImageSource | null;
    if (!m) return;
    try {
      const c = document.createElement("canvas");
      c.width = 200;
      c.height = Math.round(200 / ar);
      const x = c.getContext("2d", { willReadFrequently: true })!;
      x.drawImage(m, 0, 0, c.width, c.height);
      const [r, g, b] = x.getImageData(Math.floor(nx * c.width), Math.floor(ny * c.height), 1, 1).data;
      const hex = rgbToHex(r, g, b);
      setD({ color: hex });
      setHsv(hexToHsv(hex));
    } catch {}
    setPicking(false);
  }
  function onDown(e: React.PointerEvent) {
    e.stopPropagation();
    const { nx, ny } = point(e);
    if (picking) return pickColor(nx, ny);
    if (panel === "text") {
      if (e.target !== typer.current) setTab("kbd");
      return;
    }
    if (panel) return;
    const c = canvas.current!;
    const px = nx * c.width, py = ny * c.height;
    const hit = [...items].reverse().find((it) => {
      const b = boxes.current.get(it.id);
      return b && px >= b.x - 10 && px <= b.x + b.w + 10 && py >= b.y - 10 && py <= b.y + b.h + 10;
    });
    if (!hit) return setSel(null);
    stage.current!.setPointerCapture?.(e.pointerId);
    drag.current = { id: hit.id, dx: nx - hit.x, dy: ny - hit.y, moved: false, sx: e.clientX, sy: e.clientY };
    setSel(hit.id);
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
    d.moved = true;
    const { nx, ny } = point(e);
    const clamp = (n: number) => Math.min(0.97, Math.max(0.03, n));
    upd(d.id, { x: clamp(nx - d.dx), y: clamp(ny - d.dy) });
  }
  function onUp() {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    // A tap on text opens it for editing, like Instagram.
    const it = items.find((x) => x.id === d.id);
    if (it?.kind === "text") openText(it);
  }

  function addSticker(text: string, look?: Pick<Item, "color" | "font" | "effect" | "bg">) {
    const base = newText();
    const it: Item = look
      ? { ...base, ...look, text, y: 0.3 + Math.random() * 0.2, size: 0.065 }
      : { ...base, kind: "emoji", text, y: 0.4 + Math.random() * 0.2, size: 0.14, effect: "none" };
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
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
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
    if (text === autoText.current && caps.length) return;
    autoText.current = "";
    if (!isVideo) {
      const t = text.trim().replace(/\s*\n\s*/g, " ");
      return setCaps(t ? [{ start: 0, end: 1e9, text: t }] : []);
    }
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const total = dur || MAX_SECONDS;
    const step = lines.length ? total / lines.length : 0;
    setCaps(lines.map((t, i) => ({ start: i * step, end: (i + 1) * step, text: t })));
  }

  const edited = items.length > 0 || !!music || !!voice || caps.length > 0 || (isVideo && !origOn);
  const needsVideo = isVideo || !!music || !!voice || items.some(moves);

  async function finish() {
    setSel(null);
    if (!edited) {
      if (!isVideo) return onDone(file, false);
      // No edits: still make a big video smaller (Instagram size) before posting.
      setBusy("Making your video smaller…");
      const r = await compressVideo(file, (pct) => setBusy(`Making your video smaller… ${pct}%`));
      setBusy("");
      return onDone(r.file, r.changed);
    }
    if (music?.soundId) browserClient().rpc("use_sound", { sound: music.soundId }).then(() => {}, () => {});
    setErr("");
    try {
      if (!needsVideo) {
        setBusy("Saving your photo…");
        const im = img.current!;
        const s = Math.min(1, 1080 / im.naturalWidth);
        const W = Math.round(im.naturalWidth * s);
        const H = Math.round(im.naturalHeight * s);
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(im, 0, 0, W, H);
        items.forEach((it) => drawItem(ctx, it, W, H, null));
        drawCaption(ctx, caps, 0, W, H);
        const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
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
    const mime = recorderType();
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
      ({ W, H } = videoSize(base.videoWidth, base.videoHeight));
      seconds = Math.min(MAX_SECONDS, base.duration || dur || MAX_SECONDS);
      if (origOn) route(base, 1);
      else base.muted = true;
    } else {
      const im = img.current!;
      ({ W, H } = videoSize(im.naturalWidth, im.naturalHeight));
      seconds = Math.min(MAX_SECONDS, voice ? Math.max(3, voice.seconds) : music ? 10 : 7);
    }
    if (music0) {
      holder.appendChild(music0);
      await ready(music0).catch(() => {});
      route(music0, musicVol);
      els.push(music0);
    }
    if (voice0) {
      holder.appendChild(voice0);
      await ready(voice0).catch(() => {});
      route(voice0, voiceVol);
      els.push(voice0);
    }
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    const stream = new MediaStream([...c.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: AUDIO_BITRATE });
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((res) => (mr.onstop = () => res()));
    const im = img.current;
    const t0 = performance.now();
    const draw = (t: number) => {
      if (base) ctx.drawImage(base, 0, 0, W, H);
      else if (im) ctx.drawImage(im, 0, 0, W, H);
      items.forEach((it) => drawItem(ctx, it, W, H, t));
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

  // The typing box sits exactly over the drawn text (its own letters are invisible).
  const typing = panel === "text" && draft;
  let typerStyle: React.CSSProperties = {};
  if (typing) {
    const fs = draft.size * stageW;
    const lines = Math.max(1, draft.text.split("\n").length);
    const w = Math.max(fs, textWidth(draft, fs) + 4);
    typerStyle = {
      ...cssFont(draft.font),
      fontSize: fs,
      lineHeight: 1.25,
      width: Math.min(stageW * 3, w),
      height: lines * fs * 1.25,
      top: `calc(${draft.y * 100}% - ${(lines * fs * 1.25) / 2}px)`,
      textAlign: draft.align,
      caretColor: colorsOf(draft).text,
    };
  }
  const setColor = (hex: string) => {
    setD({ color: hex });
    setHsv(hexToHsv(hex));
  };
  const setHsvPart = (p: Partial<typeof hsv>) => {
    const n = { ...hsv, ...p };
    setHsv(n);
    setD({ color: hsvToHex(n.h, n.s, n.v) });
  };

  return (
    <div className={`ed${typing ? " typing" : ""}`} ref={root} role="dialog" aria-modal="true" aria-label="Edit your post">
      <div className="ed-top">
        {typing ? (
          <button type="button" className="ed-done" onClick={saveDraft}>Done</button>
        ) : (
          <>
            <button type="button" className="ed-x" onClick={onCancel} aria-label="Cancel" disabled={!!busy}>✕</button>
            {music && <span className="ed-tag">♪ {music.name}</span>}
          </>
        )}
      </div>

      <div className="ed-mid" onPointerDown={() => !panel && setSel(null)}>
        {typing && (
          <div className="ed-vsize" onPointerDown={(e) => e.stopPropagation()}>
            <input type="range" min={0.03} max={0.2} step={0.002} value={draft.size} onChange={(e) => setD({ size: Number(e.target.value) })} aria-label="Text size" />
          </div>
        )}
        <div className="ed-stage" ref={stage} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => (drag.current = null)} style={{ ["--ar" as string]: ar }}>
          {isVideo ? (
            <video ref={vid} src={url} autoPlay loop playsInline muted={!origOn} onLoadedMetadata={(e) => { const v = e.currentTarget; setDur(v.duration); if (v.videoWidth) setAr(v.videoWidth / v.videoHeight); }} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img ref={img} src={url} alt="" onLoad={(e) => { const i = e.currentTarget; if (i.naturalWidth) setAr(i.naturalWidth / i.naturalHeight); }} onError={() => onDone(file, false)} />
          )}
          <canvas ref={canvas} className="ed-layer" />
          {typing && (
            <textarea
              ref={typer}
              className="ed-typer"
              value={draft.text}
              onChange={(e) => setD({ text: e.target.value.slice(0, 200) })}
              onFocus={() => setTab("kbd")}
              wrap="off"
              spellCheck={false}
              aria-label="Your text"
              style={typerStyle}
            />
          )}
          {typing && !draft.text && <span className="ed-typehint">Type something…</span>}
          {picking && <span className="ed-pickhint">Tap the picture to pick a color</span>}
        </div>
      </div>

      {selected && !panel && (
        <div className="ed-selbar" onPointerDown={(e) => e.stopPropagation()}>
          <label>
            <span>Size</span>
            <input type="range" min={selected.kind === "emoji" ? 0.06 : 0.03} max={selected.kind === "emoji" ? 0.4 : 0.2} step={0.002} value={selected.size} onChange={(e) => upd(selected.id, { size: Number(e.target.value) })} />
          </label>
          {selected.kind === "text" && <button type="button" className="ed-chip" onClick={() => openText(selected)}>Edit</button>}
          <button type="button" className="ed-chip bad" onClick={() => { setItems((xs) => xs.filter((x) => x.id !== selected.id)); setSel(null); }}>Delete</button>
          <button type="button" className="ed-chip on" onClick={() => setSel(null)}>Done</button>
        </div>
      )}

      {err && <p className="ed-err" role="alert">{err}</p>}

      {!panel && !selected && (
        <>
          <p className="ed-hint">{rec === "voice" ? "Recording… talk now" : rec === "caps" ? "Listening for captions…" : "Tap a tool to edit. Tap text to change it, drag to move it."}</p>
          <div className="ed-tools">
            <button type="button" onClick={() => setPanel("audio")} disabled={!!rec}><span aria-hidden="true">♫</span>Audio</button>
            <button type="button" onClick={() => openText(null)} disabled={!!rec}><span aria-hidden="true">Aa</span>Text</button>
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

      {typing && (
        <div className={`ed-tsheet${tab === "kbd" ? " kbd" : ""}`} onPointerDown={(e) => e.stopPropagation()}>
          <div className="ed-grab" aria-hidden="true" />
          <div className="ed-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "kbd"} className={tab === "kbd" ? "on" : ""} onClick={() => setTab("kbd")} aria-label="Keyboard">
              <svg width="26" height="20" viewBox="0 0 26 20" aria-hidden="true"><rect x="1" y="2" width="24" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />{[6, 10, 14, 18].map((x) => <rect key={x} x={x} y="6" width="2.4" height="2.4" fill="currentColor" />)}<rect x="7" y="12" width="12" height="2.4" fill="currentColor" /></svg>
              <small>Type</small>
            </button>
            <button type="button" role="tab" aria-selected={tab === "font"} className={tab === "font" ? "on" : ""} onClick={() => setTab("font")}><b>Aa</b><small>Font</small></button>
            <button type="button" role="tab" aria-selected={tab === "color"} className={tab === "color" ? "on" : ""} onClick={() => setTab("color")}><i className="ed-wheel" aria-hidden="true" /><small>Color</small></button>
            <button type="button" role="tab" aria-selected={tab === "anim"} className={tab === "anim" ? "on" : ""} onClick={() => setTab("anim")}><b className="ed-motion">A</b><small>Motion</small></button>
            <button type="button" role="tab" aria-selected={tab === "effect"} className={tab === "effect" ? "on" : ""} onClick={() => setTab("effect")}><b className="ed-fx">A</b><small>Effect</small></button>
            <button type="button" className={draft.bg ? "on" : ""} onClick={() => setD({ bg: draft.bg === "" ? "solid" : draft.bg === "solid" ? "soft" : "" })} aria-label="Background">
              <b className={`ed-bgicon ${draft.bg}`}>A</b><small>{draft.bg === "solid" ? "Box" : draft.bg === "soft" ? "Soft box" : "No box"}</small>
            </button>
            <button type="button" onClick={() => setD({ align: draft.align === "center" ? "left" : draft.align === "left" ? "right" : "center" })} aria-label="Align">
              <AlignIcon a={draft.align} /><small>Align</small>
            </button>
          </div>

          {tab === "font" && (
            <div className="ed-grid">
              {FONTS.map((f) => (
                <button key={f.k} type="button" className={draft.font === f.k ? "on" : ""} style={cssFont(f.k)} onClick={() => setD({ font: f.k })}>{f.name}</button>
              ))}
            </div>
          )}
          {tab === "anim" && (
            <div className="ed-grid">
              {ANIMS.map((a) => (
                <button key={a.k} type="button" className={`${draft.anim === a.k ? "on" : ""} ed-a-${a.k}`} onClick={() => setD({ anim: a.k })}><span>{a.name}</span></button>
              ))}
            </div>
          )}
          {tab === "effect" && (
            <div className="ed-grid">
              {EFFECTS.map((f) => (
                <button key={f.k} type="button" className={draft.effect === f.k ? "on" : ""} onClick={() => setD({ effect: f.k })}><span style={{ ...cssFont(draft.font), ...effectCss[f.k] }}>{f.name}</span></button>
              ))}
            </div>
          )}
          {tab === "color" && (
            <div className="ed-colors">
              <div className="ed-swatches">
                <button type="button" className={`ed-drop${picking ? " on" : ""}`} onClick={() => setPicking(!picking)} aria-label="Pick a color from the picture">
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 3.6a2.6 2.6 0 0 0-3.7 0l-2.4 2.4-1-1-1.4 1.4 1 1L4 15.3V20h4.7l7.9-7.9 1 1 1.4-1.4-1-1 2.4-2.4a2.6 2.6 0 0 0 0-3.7ZM7.9 18H6v-1.9l7.9-7.9 1.9 1.9Z" fill="currentColor" /></svg>
                </button>
                {SWATCHES.map((c) => (
                  <button key={c} type="button" className={`ed-sw${draft.color.toLowerCase() === c ? " on" : ""}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={`Color ${c}`} />
                ))}
              </div>
              <label className="ed-slide">
                <span>Hue</span>
                <input type="range" min={0} max={359} value={Math.round(hsv.h)} onChange={(e) => setHsvPart({ h: Number(e.target.value), s: hsv.s || 1, v: hsv.v || 1 })} style={{ background: "linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }} />
              </label>
              <label className="ed-slide">
                <span>Saturation</span>
                <input type="range" min={0} max={100} value={Math.round(hsv.s * 100)} onChange={(e) => setHsvPart({ s: Number(e.target.value) / 100 })} style={{ background: `linear-gradient(90deg,${hsvToHex(hsv.h, 0, hsv.v || 1)},${hsvToHex(hsv.h, 1, hsv.v || 1)})` }} />
              </label>
              <label className="ed-slide">
                <span>Brightness</span>
                <input type="range" min={0} max={100} value={Math.round(hsv.v * 100)} onChange={(e) => setHsvPart({ v: Number(e.target.value) / 100 })} style={{ background: `linear-gradient(90deg,#000,${hsvToHex(hsv.h, hsv.s, 1)})` }} />
              </label>
            </div>
          )}
        </div>
      )}

      {panel === "stickers" && (
        <div className="ed-panel ed-stick" onPointerDown={(e) => e.stopPropagation()}>
          <div className="ed-ph"><b>Stickers</b><button type="button" className="ed-chip" onClick={() => setPanel("")}>Close</button></div>
          <div className="ed-stabs" role="tablist">
            {EMOJI_GROUPS.map((x) => (
              <button key={x.k} type="button" role="tab" aria-selected={stickTab === x.k} className={stickTab === x.k ? "on" : ""} onClick={() => setStickTab(x.k)} aria-label={x.name}>{x.icon}</button>
            ))}
            <button type="button" role="tab" aria-selected={stickTab === "promo"} className={`ed-stab-promo${stickTab === "promo" ? " on" : ""}`} onClick={() => setStickTab("promo")}>% Promo</button>
          </div>
          <div className="ed-sbody">
            {stickTab === "promo" ? (
              PROMO_GROUPS.map((grp) => (
                <section key={grp.name}>
                  <h3 className="ed-sh">{grp.name}</h3>
                  <div className="ed-words">
                    {grp.list.map((w) => {
                      const it = { ...newText(), ...w.look, text: w.text };
                      const c = colorsOf(it);
                      return (
                        <button key={w.text} type="button" className="ed-word" style={{ ...cssFont(w.look.font), background: c.box || "transparent", color: c.text, ...(w.look.bg ? {} : effectCss[w.look.effect]) }} onClick={() => addSticker(w.text, w.look)}>
                          {w.text}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))
            ) : (
              <div className="ed-emoji">
                {(EMOJI_GROUPS.find((x) => x.k === stickTab) || EMOJI_GROUPS[0]).list().map((e, i) => (
                  <button key={e + i} type="button" onClick={() => addSticker(e)} aria-label={`Sticker ${e}`}>{e}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {panel === "audio" && (
        <div className="ed-panel ed-audio" onPointerDown={(e) => e.stopPropagation()}>
          <div className="ed-ph"><b>Audio</b><button type="button" className="ed-chip" onClick={() => { setAdding(null); setPanel(""); }}>Done</button></div>
          <input
            ref={musicInput}
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 40 * 1024 * 1024) return setErr("That song file is too big. Pick one under 40 MB.");
              setErr("");
              const title = f.name.replace(/\.\w+$/, "").replace(/[_-]+/g, " ").slice(0, 80);
              setAdding({ file: f, title, share: true, rights: false, buf: null, start: 0 });
              readSong(f)
                .then((buf) => setAdding((a) => (a && a.file === f ? { ...a, buf } : a)))
                .catch(() => {
                  setAdding(null);
                  setErr("We couldn't read that song. Try an MP3 or M4A file.");
                });
            }}
          />
          {adding ? (
            <div className="ed-addsnd">
              <label className="ed-note" htmlFor="ed-sndname">Name your sound</label>
              <input id="ed-sndname" className="ed-input" value={adding.title} maxLength={80} onChange={(e) => setAdding({ ...adding, title: e.target.value })} />
              {!adding.buf ? (
                <p className="ed-note">Reading the song…</p>
              ) : (
                <div className="ed-part">
                  <span className="ed-note">
                    Part to use: {clock(adding.start)} to {clock(Math.min(adding.buf.duration, adding.start + SOUND_SECONDS))}
                  </span>
                  <div className="ed-row">
                    <button type="button" className="ed-play" onClick={() => playPart(adding.file, adding.start)} aria-label={hear === "part" ? "Stop" : "Listen to this part"}>{hear === "part" ? "■" : "▶"}</button>
                    <input type="range" className="ed-partr" min={0} max={Math.max(0, Math.floor(adding.buf.duration - SOUND_SECONDS))} step={1} value={adding.start} disabled={adding.buf.duration <= SOUND_SECONDS} onChange={(e) => setAdding({ ...adding, start: Number(e.target.value) })} aria-label="Where the sound starts" />
                  </div>
                </div>
              )}
              <label className="ed-check"><input type="checkbox" checked={adding.share} onChange={(e) => setAdding({ ...adding, share: e.target.checked })} /> Share it so others can use it in their posts</label>
              {adding.share && (
                <label className="ed-check"><input type="checkbox" checked={adding.rights} onChange={(e) => setAdding({ ...adding, rights: e.target.checked })} /> I made this sound or have permission to share it</label>
              )}
              <div className="ed-row">
                <button type="button" className="ed-btn" onClick={addOwn} disabled={saving}>{saving ? "Saving…" : "Use this sound"}</button>
                <button type="button" className="ed-chip" onClick={() => setAdding(null)} disabled={saving}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {music && (
                <div className="ed-cur">
                  <span>♪ {music.name}</span>
                  <button type="button" className="ed-chip bad" onClick={() => { if (music.local) URL.revokeObjectURL(music.url); setMusic(null); }}>Remove</button>
                </div>
              )}
              {music && <label className="ed-range"><span>Song volume</span><input type="range" min={0} max={1} step={0.05} value={musicVol} onChange={(e) => setMusicVol(Number(e.target.value))} /></label>}
              {isVideo && (
                <label className="ed-check"><input type="checkbox" checked={origOn} onChange={(e) => setOrigOn(e.target.checked)} /> Keep the video&apos;s own sound</label>
              )}
              <input className="ed-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sounds" aria-label="Search sounds" />
              <ul className="ed-sounds">
                {sounds === null ? (
                  <li className="ed-note">Loading sounds…</li>
                ) : sounds.length === 0 ? (
                  <li className="ed-note">{q ? "No sounds match that." : "No sounds yet. Add the first one below."}</li>
                ) : (
                  sounds.map((x) => (
                    <li key={x.id} className={music?.soundId === x.id ? "on" : ""}>
                      <button type="button" className="ed-play" onClick={() => listen(x)} aria-label={hear === x.id ? `Stop ${x.title}` : `Listen to ${x.title}`}>{hear === x.id ? "■" : "▶"}</button>
                      <span className="ed-sinfo">
                        <b>{x.title}</b>
                        <small>{[x.added_name, x.uses ? `${x.uses} post${x.uses === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ") || "AdsVane sound"}</small>
                      </span>
                      <button type="button" className={`ed-chip${music?.soundId === x.id ? " on" : ""}`} onClick={() => pickSound(x)}>{music?.soundId === x.id ? "Added" : "Use"}</button>
                    </li>
                  ))
                )}
              </ul>
              <button type="button" className="ed-btn" onClick={() => musicInput.current?.click()}>+ Add your own sound</button>
            </>
          )}
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

      {music && <audio ref={musicEl} src={music.url} preload="auto" crossOrigin={music.url.startsWith("http") ? "anonymous" : undefined} />}
      {voice && <audio ref={voiceEl} src={voice.url} preload="auto" />}
      {busy && <div className="ed-busy" role="status"><span className="spin" aria-hidden="true" />{busy}</div>}
    </div>
  );
}

type SpeechEvt = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type SpeechRec = { continuous: boolean; interimResults: boolean; lang: string; onresult: (e: SpeechEvt) => void; onerror: () => void; start: () => void; stop: () => void };
