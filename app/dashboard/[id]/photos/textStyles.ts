// Text on posts, Instagram style: fonts, colors, effects, animations, background and alignment.
import type { CSSProperties } from "react";
// Everything is drawn on a canvas, so the preview and the posted photo or video look the same.

export type Effect = "none" | "soft" | "hard" | "block" | "outline" | "knockout" | "neon" | "halo" | "dreamy" | "digital" | "offset3d" | "shimmer";
export type Anim = "none" | "typewriter" | "words" | "pop" | "fade" | "zoom" | "float" | "jump" | "wiggle" | "slide";
export type Bg = "" | "solid" | "soft";
export type Align = "center" | "left" | "right";
export type Item = {
  id: string;
  kind: "text" | "emoji";
  text: string;
  x: number; // 0..1 across the picture
  y: number; // 0..1 down the picture
  size: number; // font size as a share of the picture's width
  color: string;
  font: string;
  effect: Effect;
  anim: Anim;
  bg: Bg;
  align: Align;
};
export type Box = { x: number; y: number; w: number; h: number };

type Font = { k: string; name: string; fam: string; w: number; it?: boolean };
export const FONTS: Font[] = [
  { k: "classic", name: "Classic", fam: "Inter", w: 800 },
  { k: "modern", name: "Modern", fam: "Oswald", w: 400 },
  { k: "modernb", name: "Modern Bold", fam: "Oswald", w: 700 },
  { k: "light", name: "Classic Light", fam: "Raleway", w: 300 },
  { k: "sign", name: "Signature", fam: "Dancing Script", w: 700 },
  { k: "editor", name: "Editor", fam: "Space Mono", w: 400 },
  { k: "poster", name: "Poster", fam: "Abril Fatface", w: 400 },
  { k: "bubble", name: "Bubble", fam: "Fredoka", w: 700 },
  { k: "strong", name: "Strong", fam: "Montserrat", w: 900, it: true },
  { k: "elegant", name: "Elegant", fam: "Playfair Display", w: 400, it: true },
  { k: "meme", name: "Meme", fam: "Comic Neue", w: 700 },
  { k: "type", name: "Typewriter", fam: "Special Elite", w: 400 },
  { k: "squeeze", name: "Squeeze", fam: "Bebas Neue", w: 400 },
  { k: "deco", name: "Deco", fam: "Poiret One", w: 400 },
  { k: "marker", name: "Marker", fam: "Permanent Marker", w: 400 },
  { k: "anton", name: "Headline", fam: "Anton", w: 400 },
  { k: "lobster", name: "Lobster", fam: "Lobster", w: 400 },
  { k: "pacifico", name: "Pacifico", fam: "Pacifico", w: 400 },
  { k: "syne", name: "Syne", fam: "Syne", w: 800 },
  { k: "fraunces", name: "Fraunces", fam: "Fraunces", w: 600 },
  { k: "slabo", name: "Slabo", fam: "Slabo 27px", w: 400 },
  { k: "formal", name: "Petit Formal", fam: "Petit Formal Script", w: 400 },
  { k: "crimson", name: "Crimson Text", fam: "Crimson Text", w: 400 },
  { k: "creep", name: "Creepster", fam: "Creepster", w: 400 },
];
export const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@800&family=Oswald:wght@400;700&family=Raleway:wght@300&family=Dancing+Script:wght@700&family=Space+Mono&family=Abril+Fatface&family=Fredoka:wght@700&family=Montserrat:ital,wght@1,900&family=Playfair+Display:ital@1&family=Comic+Neue:wght@700&family=Special+Elite&family=Bebas+Neue&family=Poiret+One&family=Permanent+Marker&family=Anton&family=Lobster&family=Pacifico&family=Syne:wght@800&family=Fraunces:wght@600&family=Slabo+27px&family=Petit+Formal+Script&family=Crimson+Text&family=Creepster&display=swap";

export const EFFECTS: { k: Effect; name: string }[] = [
  { k: "none", name: "None" },
  { k: "soft", name: "Soft Shadow" },
  { k: "hard", name: "Hard Shadow" },
  { k: "block", name: "Block Offset" },
  { k: "outline", name: "Outline" },
  { k: "knockout", name: "Knockout" },
  { k: "neon", name: "Neon" },
  { k: "halo", name: "Halo" },
  { k: "dreamy", name: "Dreamy" },
  { k: "digital", name: "Digital" },
  { k: "offset3d", name: "3D Offset" },
  { k: "shimmer", name: "Shimmer" },
];
export const ANIMS: { k: Anim; name: string }[] = [
  { k: "none", name: "None" },
  { k: "typewriter", name: "Typewriter" },
  { k: "words", name: "Word by Word" },
  { k: "pop", name: "Pop" },
  { k: "fade", name: "Fade" },
  { k: "zoom", name: "Zoom" },
  { k: "float", name: "Float" },
  { k: "jump", name: "Jump" },
  { k: "wiggle", name: "Wiggle" },
  { k: "slide", name: "Slide In" },
];
export const SWATCHES = ["#ffffff", "#000000", "#3897f0", "#70c050", "#fdcb5c", "#fd8d32", "#ed4956", "#d10869", "#a307ba", "#4c3a99"];

export const fontOf = (k: string) => FONTS.find((f) => f.k === k) || FONTS[0];
export const cssFont = (k: string) => {
  const f = fontOf(k);
  return { fontFamily: `"${f.fam}", system-ui, sans-serif`, fontWeight: f.w, fontStyle: f.it ? "italic" : "normal" } as const;
};
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
export function fontStr(it: Pick<Item, "kind" | "font">, px: number) {
  if (it.kind === "emoji") return `${px}px ${EMOJI_FONT}`;
  const f = fontOf(it.font);
  return `${f.it ? "italic " : ""}${f.w} ${px}px "${f.fam}", system-ui, sans-serif`;
}

// --- colors ---
export function hexToRgb(h: string) {
  const n = parseInt(h.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
}
export const rgbToHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
export function hexToHsv(h: string) {
  const [r, g, b] = hexToRgb(h).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hue = 0;
  if (d) hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (hue * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
}
export function hsvToHex(h: number, s: number, v: number) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
const light = (h: string) => {
  const [r, g, b] = hexToRgb(h);
  return 0.299 * r + 0.587 * g + 0.114 * b > 165;
};
export const contrast = (h: string) => (light(h) ? "#0d0b12" : "#ffffff");
const rgba = (h: string, a: number) => {
  const [r, g, b] = hexToRgb(h);
  return `rgba(${r},${g},${b},${a})`;
};
const shade = (h: string, k: number) => {
  const [r, g, b] = hexToRgb(h);
  return rgbToHex(r * k, g * k, b * k);
};

// Text and box colors for an item.
export function colorsOf(it: Item) {
  if (it.kind === "emoji") return { text: "#000", box: "" };
  if (it.bg === "solid") return { text: contrast(it.color), box: it.color };
  if (it.bg === "soft") return { text: light(it.color) ? "#0d0b12" : "#ffffff", box: rgba(it.color, 0.55) };
  return { text: it.color, box: "" };
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ease = (p: number) => 1 - Math.pow(1 - p, 3);
const CYCLE = 3.5;
export const moves = (it: Item) => it.kind === "text" && (it.anim !== "none" || it.effect === "shimmer");

// Draw one text or sticker. t is the time in seconds, or null to draw it still (fully shown).
export function drawItem(ctx: CanvasRenderingContext2D, it: Item, W: number, H: number, t: number | null, sel = false): Box {
  const fs = it.size * W;
  ctx.save();
  ctx.font = fontStr(it, Math.max(1, Math.round(fs)));
  ctx.textBaseline = "middle";
  const all = it.text.split("\n");
  const widths = all.map((l) => ctx.measureText(l).width);
  const maxW = Math.max(1, ...widths);
  const lh = fs * 1.25;
  const totalH = all.length * lh;
  const pad = it.bg ? fs * 0.4 : fs * 0.12;
  const cx = it.x * W;
  const cy = it.y * H;
  const box: Box = { x: cx - maxW / 2 - pad, y: cy - totalH / 2 - fs * 0.1, w: maxW + pad * 2, h: totalH + fs * 0.2 };

  // Animation
  const tc = t == null ? 99 : t % CYCLE;
  let a = 1, s = 1, dx = 0, dy = 0, rot = 0;
  let lines = all;
  if (t != null && it.kind === "text") {
    switch (it.anim) {
      case "typewriter": {
        let n = Math.floor(it.text.length * clamp01(tc / 1.4));
        lines = all.map((l) => {
          const part = l.slice(0, Math.max(0, n));
          n -= l.length + 1;
          return part;
        });
        break;
      }
      case "words": {
        const total = it.text.split(/\s+/).filter(Boolean).length || 1;
        let n = Math.ceil(total * clamp01(tc / 1.6));
        lines = all.map((l) => {
          const ws = l.split(" ");
          const keep = ws.slice(0, Math.max(0, n));
          n -= ws.length;
          return keep.length ? keep.join(" ") : "";
        });
        break;
      }
      case "pop":
        s = tc < 0.25 ? (tc / 0.25) * 1.15 : tc < 0.4 ? 1.15 - ((tc - 0.25) / 0.15) * 0.15 : 1;
        break;
      case "fade":
        a = clamp01(tc / 0.7);
        break;
      case "zoom":
        s = 1 + 0.08 * Math.sin((t * Math.PI * 2) / 1.6);
        break;
      case "float":
        dy = Math.sin(t * 2.2) * 0.14 * fs;
        break;
      case "jump":
        dy = -Math.abs(Math.sin(t * Math.PI * 1.3)) * 0.22 * fs;
        break;
      case "wiggle":
        rot = Math.sin(t * 7) * 0.06;
        break;
      case "slide": {
        const p = ease(clamp01(tc / 0.6));
        dx = (1 - p) * -0.5 * W;
        a = p;
        break;
      }
    }
  }

  ctx.translate(cx + dx, cy + dy);
  if (rot) ctx.rotate(rot);
  if (s !== 1) ctx.scale(Math.max(0.01, s), Math.max(0.01, s));
  ctx.globalAlpha = a;
  const { text: fill, box: boxColor } = colorsOf(it);
  const textAlign: CanvasTextAlign = it.align === "left" ? "left" : it.align === "right" ? "right" : "center";
  ctx.textAlign = textAlign;
  const lx = it.align === "left" ? -maxW / 2 : it.align === "right" ? maxW / 2 : 0;

  lines.forEach((ln, i) => {
    const ly = -totalH / 2 + lh * i + lh / 2;
    if (boxColor && ln.trim()) {
      const w = ctx.measureText(ln).width + fs * 0.8;
      const bx = it.align === "left" ? -maxW / 2 - fs * 0.4 : it.align === "right" ? maxW / 2 + fs * 0.4 - w : -w / 2;
      ctx.fillStyle = boxColor;
      pill(ctx, bx, ly - lh / 2, w, lh, fs * 0.3);
    }
    if (!ln) return;
    if (it.kind === "emoji") {
      ctx.fillStyle = "#000";
      ctx.fillText(ln, lx, ly);
      return;
    }
    paintText(ctx, ln, lx, ly, fs, fill, it, t, widths[i] || maxW);
  });
  ctx.restore();

  if (sel) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = Math.max(1.5, W / 300);
    ctx.setLineDash([W / 60, W / 90]);
    ctx.strokeRect(box.x - fs * 0.15, box.y - fs * 0.1, box.w + fs * 0.3, box.h + fs * 0.2);
    ctx.restore();
  }
  return box;
}

function paintText(ctx: CanvasRenderingContext2D, ln: string, x: number, y: number, fs: number, fill: string, it: Item, t: number | null, lineW: number) {
  const plain = () => {
    ctx.fillStyle = fill;
    ctx.fillText(ln, x, y);
  };
  const glow = (color: string, blur: number, times: number, body: string) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = body;
    for (let k = 0; k < times; k++) ctx.fillText(ln, x, y);
    ctx.restore();
  };
  const copy = (color: string, ox: number, oy: number) => {
    ctx.fillStyle = color;
    ctx.fillText(ln, x + ox, y + oy);
  };
  switch (it.effect) {
    case "none":
      return plain();
    case "soft":
      return glow("rgba(0,0,0,.5)", fs * 0.18, 1, fill);
    case "hard":
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.85)";
      ctx.shadowOffsetX = fs * 0.06;
      ctx.shadowOffsetY = fs * 0.06;
      plain();
      ctx.restore();
      return;
    case "block": {
      const dark = light(fill) ? shade(fill === "#ffffff" ? "#4c3a99" : fill, 0.45) : "#000000";
      for (let k = 6; k >= 1; k--) copy(dark, k * fs * 0.014, k * fs * 0.014);
      return plain();
    }
    case "outline":
      ctx.lineJoin = "round";
      ctx.lineWidth = fs * 0.14;
      ctx.strokeStyle = contrast(fill);
      ctx.strokeText(ln, x, y);
      return plain();
    case "knockout":
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(1, fs * 0.05);
      ctx.strokeStyle = fill;
      ctx.strokeText(ln, x, y);
      return;
    case "neon":
      glow(fill, fs * 0.55, 2, fill === "#ffffff" ? "#ffffff" : rgbToHex(...(hexToRgb(fill).map((v) => v + (255 - v) * 0.6) as [number, number, number])));
      return;
    case "halo":
      return glow("rgba(255,255,255,.95)", fs * 0.5, 2, fill);
    case "dreamy":
      glow(fill, fs * 1.1, 2, rgba(fill, 0.35));
      ctx.globalAlpha *= 0.92;
      return plain();
    case "digital":
      ctx.save();
      ctx.globalAlpha *= 0.85;
      copy("#00e5ff", -fs * 0.04, 0);
      copy("#ff2d55", fs * 0.04, 0);
      ctx.restore();
      return plain();
    case "offset3d":
      copy(light(fill) ? "#ff4fd8" : "#22d3ee", fs * 0.07, fs * 0.07);
      return plain();
    case "shimmer": {
      const left = ctx.textAlign === "left" ? x : ctx.textAlign === "right" ? x - lineW : x - lineW / 2;
      const p = t == null ? 0.5 : ((t * 0.7) % 1.6) - 0.3;
      const g = ctx.createLinearGradient(left, 0, left + lineW, 0);
      g.addColorStop(0, fill);
      g.addColorStop(clamp01(p - 0.15), fill);
      g.addColorStop(clamp01(p), "#ffffff");
      g.addColorStop(clamp01(p + 0.15), fill);
      g.addColorStop(1, fill);
      ctx.fillStyle = g;
      ctx.fillText(ln, x, y);
      return;
    }
  }
}

// Words that roll at the bottom (captions).
export type Cap = { start: number; end: number; text: string };
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
export function drawCaption(ctx: CanvasRenderingContext2D, caps: Cap[], t: number, W: number, H: number) {
  const c = caps.find((x) => t >= x.start && t < x.end);
  if (!c) return;
  const fs = W * 0.048;
  ctx.save();
  ctx.font = `700 ${Math.round(fs)}px Inter, system-ui, sans-serif`;
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
  ctx.restore();
}

// CSS look-alikes for the effect buttons.
export const effectCss: Record<Effect, CSSProperties> = {
  none: {},
  soft: { textShadow: "0 0 6px rgba(0,0,0,.6)" },
  hard: { textShadow: "2px 2px 0 rgba(0,0,0,.9)" },
  block: { textShadow: "1px 1px 0 #2a2050,2px 2px 0 #2a2050,3px 3px 0 #2a2050,4px 4px 0 #2a2050" },
  outline: { WebkitTextStroke: "1px #000", paintOrder: "stroke fill" },
  knockout: { color: "transparent", WebkitTextStroke: "1px #fff" },
  neon: { textShadow: "0 0 6px #fff,0 0 14px #fff" },
  halo: { color: "#bbb", textShadow: "0 0 8px #fff,0 0 14px #fff" },
  dreamy: { textShadow: "0 0 10px rgba(255,255,255,.9)", filter: "blur(.3px)" },
  digital: { textShadow: "-2px 0 #00e5ff,2px 0 #ff2d55" },
  offset3d: { textShadow: "3px 3px 0 #ff4fd8" },
  shimmer: { background: "linear-gradient(90deg,#fff 30%,#c9c0f5 50%,#fff 70%)", WebkitBackgroundClip: "text", color: "transparent" },
};
