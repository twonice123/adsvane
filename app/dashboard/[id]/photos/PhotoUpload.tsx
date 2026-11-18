"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addVideo, uploadPhoto, type PhotoState } from "../../photo-actions";
import { browserClient } from "@/lib/supabase/client";
import { useBackClose } from "@/lib/useBackClose";
import { PHOTO_BUCKET } from "@/lib/data";

const MAX_SECONDS = 15;
const MAX_VIDEO_MB = 50;
const VIDEO_EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

// How long a video is, and a still picture from its first moment.
function inspectVideo(file: File): Promise<{ seconds: number; poster: Blob | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    let seconds = NaN;
    const done = (poster: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve({ seconds, poster });
    };
    v.onloadedmetadata = () => {
      seconds = v.duration;
      v.currentTime = Math.min(0.1, (v.duration || 1) / 2);
    };
    v.onseeked = () => {
      try {
        const scale = Math.min(1, 1080 / Math.max(v.videoWidth, v.videoHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(v.videoWidth * scale);
        c.height = Math.round(v.videoHeight * scale);
        c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
        c.toBlob((b) => done(b), "image/jpeg", 0.82);
      } catch {
        done(null);
      }
    };
    v.onerror = () => done(null);
    setTimeout(() => done(null), 15000);
    v.src = url;
  });
}

// Shrinks a photo in the browser so uploads are quick on phones.
async function shrink(file: File, maxSide: number): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function PhotoUpload({
  businessId,
  kind,
  label,
  multiple = false,
  className = "b",
  wrapClass = "",
  ariaLabel,
  postTrigger = false,
  openRef,
  onPosted,
}: {
  businessId: string;
  kind: "logo" | "cover" | "gallery";
  label: string;
  multiple?: boolean;
  className?: string;
  wrapClass?: string;
  ariaLabel?: string;
  /** The phone's bottom + button opens this picker (and ?post=1 opens it on arrival). */
  postTrigger?: boolean;
  /** Lets another button (the phone's bottom +) open this picker. */
  openRef?: React.MutableRefObject<(() => void) | null>;
  onPosted?: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<PhotoState>({});
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const max = kind === "cover" ? 2000 : kind === "logo" ? 800 : 1600;

  const [pending2, setPending2] = useState<{ files: File[]; urls: string[] } | null>(null);
  const [caption, setCaption] = useState("");

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    const vids = picked.filter((f) => f.type.startsWith("video/"));
    if (vids.length && kind !== "gallery") {
      setState({ error: "Please pick a photo here." });
      return;
    }
    if (vids.some((f) => !VIDEO_EXT[f.type])) {
      setState({ error: "Please use an MP4 or MOV video." });
      return;
    }
    if (vids.some((f) => f.size > MAX_VIDEO_MB * 1024 * 1024)) {
      setState({ error: `That video is too big. Videos can be up to ${MAX_VIDEO_MB} MB.` });
      return;
    }
    // Work photos: write a caption first, like a social post.
    if (kind === "gallery") {
      setCaption("");
      setPending2({ files: picked, urls: picked.map((f) => URL.createObjectURL(f)) });
      return;
    }
    send(picked, "");
  }

  useBackClose(!!pending2, () => cancelPost());

  useEffect(() => {
    if (!openRef) return;
    openRef.current = () => input.current?.click();
    return () => {
      openRef.current = null;
    };
  }, [openRef]);

  useEffect(() => {
    if (!postTrigger) return;
    const open = () => input.current?.click();
    window.addEventListener("av:newpost", open);
    document.body.dataset.canPost = "1";
    const u = new URL(location.href);
    if (u.searchParams.get("post") === "1") {
      u.searchParams.delete("post");
      history.replaceState(history.state, "", u.pathname + u.search + u.hash);
      open();
    }
    return () => {
      window.removeEventListener("av:newpost", open);
      delete document.body.dataset.canPost;
    };
  }, [postTrigger]);

  function cancelPost() {
    pending2?.urls.forEach((u) => URL.revokeObjectURL(u));
    setPending2(null);
  }

  async function send(picked: File[], text: string) {
    setBusy(true);
    setState({});
    // Check video lengths first, so nothing is posted if one is too long.
    const info = new Map<File, { seconds: number; poster: Blob | null }>();
    for (const f of picked) {
      if (!f.type.startsWith("video/")) continue;
      const i = await inspectVideo(f);
      if (!(i.seconds <= MAX_SECONDS + 0.5)) {
        setState({ error: Number.isFinite(i.seconds) ? `Videos can be up to ${MAX_SECONDS} seconds. That one is ${Math.round(i.seconds)} seconds. Trim it on your phone and try again.` : "We couldn't read that video. Please try an MP4 or MOV video." });
        setBusy(false);
        return;
      }
      info.set(f, i);
    }
    // Several files posted together share a post id, in the order picked.
    const postId = picked.length > 1 && kind === "gallery" ? crypto.randomUUID() : "";
    let start = 0;
    let r: PhotoState = {};
    let batch: File[] = [];
    const base = () => {
      const b = new FormData();
      b.set("business_id", businessId);
      if (text.trim()) b.set("caption", text.trim());
      if (postId) {
        b.set("post_id", postId);
        b.set("start", String(start));
      }
      return b;
    };
    const flush = async () => {
      if (!batch.length) return;
      const b = base();
      b.set("kind", kind);
      for (const f of batch) b.append("file", await shrink(f, max));
      try {
        r = await uploadPhoto({}, b);
      } catch {
        r = { error: "Couldn't upload the photo. Please check your connection and try again." };
      }
      start += batch.length;
      batch = [];
    };
    for (const f of picked) {
      if (r.error) break;
      if (!f.type.startsWith("video/")) {
        batch.push(f);
        if (batch.length === 4) await flush();
        continue;
      }
      await flush();
      if (r.error) break;
      // Videos go straight from the phone to storage (they're too big for our server).
      const id = crypto.randomUUID();
      const path = `${businessId}/gallery-${id}.${VIDEO_EXT[f.type]}`;
      const poster = info.get(f)?.poster;
      const posterPath = poster ? `${businessId}/gallery-${id}.jpg` : "";
      try {
        const sb = browserClient();
        const up = await sb.storage.from(PHOTO_BUCKET).upload(path, f, { contentType: f.type, cacheControl: "31536000" });
        if (up.error) throw up.error;
        if (poster) await sb.storage.from(PHOTO_BUCKET).upload(posterPath, poster, { contentType: "image/jpeg", cacheControl: "31536000" });
        const b = base();
        b.set("path", path);
        if (posterPath) b.set("poster", posterPath);
        r = await addVideo(b);
      } catch {
        r = { error: "Couldn't upload the video. Please check your connection and try again." };
      }
      start += 1;
    }
    if (!r.error) await flush();
    setState(r.error ? r : kind === "gallery" ? { ok: picked.length > 1 ? `Posted ${picked.length} as one post.` : "Posted." } : r);
    setBusy(false);
    if (!r.error && onPosted) onPosted();
    else router.refresh();
  }

  const working = busy;
  return (
    <div className={`upl ${wrapClass}`}>
      <input ref={input} type="file" accept={kind === "gallery" ? "image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm" : "image/jpeg,image/png,image/webp,image/heic,image/heif"} multiple={multiple} onChange={onPick} hidden />
      <button type="button" className={className} disabled={working} onClick={() => input.current?.click()} aria-label={ariaLabel} aria-busy={working}>
        {working ? (label === "+" ? <span className="spin" aria-hidden="true" /> : kind === "gallery" ? "Posting…" : "Uploading…") : label}
      </button>
      {pending2 && (
        <div className="sh-back" role="dialog" aria-modal="true" aria-label="New post" onClick={(e) => e.target === e.currentTarget && cancelPost()}>
          <div className="sh-box np">
            <div className="sh-top">
              <button type="button" className="sh-x" onClick={cancelPost} aria-label="Cancel">✕</button>
              <h2>New post</h2>
            </div>
            <div className={`np-pics${pending2.urls.length === 1 ? " one" : ""}`}>
              {pending2.files.map((f, i) => (f.type.startsWith("video/") ? <video key={pending2.urls[i]} src={pending2.urls[i]} muted playsInline autoPlay loop /> : <img key={pending2.urls[i]} src={pending2.urls[i]} alt="" />))}
            </div>
            <textarea
              className="np-text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={2200}
              rows={4}
              placeholder="Write a caption… e.g. Knotless braids, waist length. Book this week!"
              aria-label="Caption"
              autoFocus
            />
            <p className="muted np-hint">
              {pending2.files.length > 1 ? `${pending2.files.length} in one post. People swipe to see them all. ` : ""}
              {caption.length}/2200
            </p>
            <button
              type="button"
              className="b np-go"
              onClick={() => {
                const files = pending2.files;
                const text = caption;
                cancelPost();
                send(files, text);
              }}
            >
              Post
            </button>
          </div>
        </div>
      )}
      {state.error && !working && <p className="err" role="alert">{state.error}</p>}
      {state.ok && !working && <p className="okline" role="status">{state.ok}</p>}
    </div>
  );
}
