// Shrinks photos, videos and sounds in the browser before upload, to Instagram's sizes,
// so uploads are quick and storage doesn't fill up.

// Instagram: photos 1080 wide, from 4:5 (tall) to 1.91:1 (wide). Videos 1080 x 1920 at most.
export const PHOTO_W = 1080;
export const MIN_RATIO = 4 / 5;
export const MAX_RATIO = 1.91;
export const VIDEO_SHORT = 1080;
export const VIDEO_LONG = 1920;
export const VIDEO_BITRATE = 3_500_000;
export const AUDIO_BITRATE = 128_000;
export const SOUND_SECONDS = 30;

const jpeg = (c: HTMLCanvasElement, q: number) => new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", q));

// Photos for posts: 1080 wide, cropped to Instagram's shapes (from the middle), compressed.
// Profile pictures and covers keep their shape and are only made smaller.
export async function shrinkPhoto(file: File, kind: "gallery" | "logo" | "cover"): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height;
    let w: number, h: number;
    if (kind === "gallery") {
      const r = sw / sh;
      if (r < MIN_RATIO) {
        sh = Math.round(sw / MIN_RATIO);
        sy = Math.round((bmp.height - sh) / 2);
      } else if (r > MAX_RATIO) {
        sw = Math.round(sh * MAX_RATIO);
        sx = Math.round((bmp.width - sw) / 2);
      }
      w = Math.min(PHOTO_W, sw);
      h = Math.round((w * sh) / sw);
    } else {
      const max = kind === "logo" ? 640 : 1600;
      const s = Math.min(1, max / Math.max(sw, sh));
      w = Math.round(sw * s);
      h = Math.round(sh * s);
    }
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
    const blob = await jpeg(c, 0.82);
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Video size that fits inside 1080 x 1920 (or 1920 x 1080), even numbers.
export function videoSize(vw: number, vh: number) {
  const s = Math.min(1, VIDEO_SHORT / Math.min(vw, vh), VIDEO_LONG / Math.max(vw, vh));
  return { W: Math.round((vw * s) / 2) * 2, H: Math.round((vh * s) / 2) * 2 };
}
// Already small enough to post as it is?
export const videoIsSmall = (size: number, vw: number, vh: number) => size <= 6 * 1024 * 1024 && Math.min(vw, vh) <= VIDEO_SHORT && Math.max(vw, vh) <= VIDEO_LONG;

export function recorderType() {
  const opts = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return opts.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) || "";
}

// Re-record a video at Instagram's size and a smaller bitrate. Plays it once (up to 15 s).
// Returns the original file if this phone can't do it or the result isn't smaller.
export async function compressVideo(file: File, onProgress?: (pct: number) => void, maxSeconds = 15): Promise<{ file: File; changed: boolean }> {
  const mime = recorderType();
  if (!mime) return { file, changed: false };
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.src = url;
  v.playsInline = true;
  v.preload = "auto";
  // Start inside the tap, so phones allow sound.
  v.play().catch(() => {});
  v.pause();
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed;left:-9999px;top:0;width:2px;height:2px;overflow:hidden";
  holder.appendChild(v);
  document.body.appendChild(holder);
  const ac = new AudioContext();
  ac.resume().catch(() => {});
  const cleanup = () => {
    v.pause();
    holder.remove();
    ac.close().catch(() => {});
    URL.revokeObjectURL(url);
  };
  try {
    await new Promise<void>((res, rej) => {
      if (v.readyState >= 2) return res();
      v.onloadeddata = () => res();
      v.onerror = () => rej(new Error("load"));
      setTimeout(() => res(), 10000);
    });
    if (!v.videoWidth) throw new Error("size");
    // Too long (we say so after) or already small: leave it as it is.
    if (v.duration > maxSeconds + 0.5 || videoIsSmall(file.size, v.videoWidth, v.videoHeight)) {
      cleanup();
      return { file, changed: false };
    }
    const { W, H } = videoSize(v.videoWidth, v.videoHeight);
    const seconds = Math.min(maxSeconds, v.duration || maxSeconds);
    const dest = ac.createMediaStreamDestination();
    ac.createMediaElementSource(v).connect(dest);
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    const stream = new MediaStream([...c.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: VIDEO_BITRATE, audioBitsPerSecond: AUDIO_BITRATE });
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise<void>((res) => (mr.onstop = () => res()));
    ctx.drawImage(v, 0, 0, W, H);
    mr.start(250);
    v.currentTime = 0;
    await v.play();
    await new Promise<void>((res) => {
      const frame = () => {
        ctx.drawImage(v, 0, 0, W, H);
        onProgress?.(Math.min(99, Math.round((v.currentTime / seconds) * 100)));
        if (v.ended || v.currentTime >= seconds) return res();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    mr.stop();
    await done;
    cleanup();
    const type = mime.startsWith("video/mp4") ? "video/mp4" : "video/webm";
    const blob = new Blob(chunks, { type });
    if (!blob.size || blob.size >= file.size) return { file, changed: false };
    return { file: new File([blob], type === "video/mp4" ? "post.mp4" : "post.webm", { type }), changed: true };
  } catch {
    cleanup();
    return { file, changed: false };
  }
}

// Read a song so a part of it can be picked.
export async function readSong(file: File): Promise<AudioBuffer> {
  const ac = new AudioContext();
  try {
    return await ac.decodeAudioData(await file.arrayBuffer());
  } finally {
    ac.close().catch(() => {});
  }
}

// Cut a 30-second part of a song and save it as a small MP3 (128 kbps, about 0.5 MB).
export async function songClip(buf: AudioBuffer, start: number, seconds = SOUND_SECONDS): Promise<File> {
  const rate = 44100;
  const len = Math.max(1, Math.min(seconds, buf.duration - start));
  const off = new OfflineAudioContext(2, Math.ceil(len * rate), rate);
  const src = off.createBufferSource();
  src.buffer = buf;
  // Short fade in and out so the clip doesn't start or stop with a click.
  const g = off.createGain();
  g.gain.setValueAtTime(0, 0);
  g.gain.linearRampToValueAtTime(1, 0.3);
  g.gain.setValueAtTime(1, Math.max(0.3, len - 0.8));
  g.gain.linearRampToValueAtTime(0, len);
  src.connect(g).connect(off.destination);
  src.start(0, start, len);
  const out = await off.startRendering();
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const enc = new Mp3Encoder(2, rate, AUDIO_BITRATE / 1000);
  const toInt = (f: Float32Array) => {
    const a = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) a[i] = Math.max(-1, Math.min(1, f[i])) * 0x7fff;
    return a;
  };
  const L = toInt(out.getChannelData(0));
  const R = toInt(out.numberOfChannels > 1 ? out.getChannelData(1) : out.getChannelData(0));
  const parts: BlobPart[] = [];
  const step = 1152 * 20;
  for (let i = 0; i < L.length; i += step) {
    const b = enc.encodeBuffer(L.subarray(i, i + step), R.subarray(i, i + step));
    if (b.length) parts.push(new Uint8Array(b));
  }
  const end = enc.flush();
  if (end.length) parts.push(new Uint8Array(end));
  return new File(parts, "sound.mp3", { type: "audio/mpeg" });
}
