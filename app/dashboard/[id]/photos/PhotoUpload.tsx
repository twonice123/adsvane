"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addVideo, uploadPhoto, type PhotoState } from "../../photo-actions";
import { browserClient } from "@/lib/supabase/client";
import { useBackClose } from "@/lib/useBackClose";
import { PHOTO_BUCKET } from "@/lib/data";
import MediaEditor from "./MediaEditor";
import CameraCapture from "./CameraCapture";
import { compressVideo, shrinkPhoto } from "@/lib/media";

const MAX_SECONDS = 15;
const MAX_VIDEO_MB = 50;
// What we keep after making it smaller.
const MAX_STORED_MB = 25;
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
  const [stage, setStage] = useState("");

  const [pending2, setPending2] = useState<{ files: File[]; urls: string[] } | null>(null);
  const [caption, setCaption] = useState("");
  // One photo or video opens the editor first (text, stickers, music, voice, captions).
  const [editing, setEditing] = useState<File | null>(null);
  const edited = useRef(new WeakSet<File>());
  // Posts start at the in-app camera (record or take a photo), with a gallery button.
  const [cam, setCam] = useState(false);
  const pick = () => input.current?.click();
  const start = () => (kind === "gallery" && typeof navigator !== "undefined" && !!navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function" ? setCam(true) : pick());

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
      setCam(false);
      if (picked.length === 1) return setEditing(picked[0]);
      setPending2({ files: picked, urls: picked.map((f) => URL.createObjectURL(f)) });
      return;
    }
    send(picked, "");
  }

  // One Back step covers the editor and the caption sheet that follows it.
  useBackClose(!!pending2 || !!editing || cam, () => {
    setCam(false);
    setEditing(null);
    cancelPost();
  });

  useEffect(() => {
    if (!openRef) return;
    openRef.current = start;
    return () => {
      openRef.current = null;
    };
  }, [openRef]);

  useEffect(() => {
    if (!postTrigger) return;
    const open = start;
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
    // Make big videos smaller first (Instagram size), starting right away while the tap still counts.
    const out: File[] = [];
    for (const f of picked) {
      if (!f.type.startsWith("video/") || edited.current.has(f)) {
        out.push(f);
        continue;
      }
      const r = await compressVideo(f, (pct) => setStage(`Making your video smaller… ${pct}%`));
      setStage("");
      if (r.changed) edited.current.add(r.file);
      out.push(r.file);
    }
    if (out.some((f) => f.type.startsWith("video/") && f.size > MAX_STORED_MB * 1024 * 1024)) {
      setState({ error: `That video is too big to post (over ${MAX_STORED_MB} MB). Try a shorter or smaller video.` });
      setBusy(false);
      return;
    }
    picked = out;
    // Check video lengths first, so nothing is posted if one is too long.
    const info = new Map<File, { seconds: number; poster: Blob | null }>();
    for (const f of picked) {
      if (!f.type.startsWith("video/")) continue;
      const i = await inspectVideo(f);
      // Videos made in our editor are already cut to 15 seconds (their length can read as unknown).
      if (edited.current.has(f)) {
        info.set(f, i);
        continue;
      }
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
      for (const f of batch) b.append("file", await shrinkPhoto(f, kind));
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
      <button type="button" className={className} disabled={working} onClick={start} aria-label={ariaLabel} aria-busy={working}>
        {working ? (label === "+" ? <span className="spin" aria-hidden="true" /> : kind === "gallery" ? stage || "Posting…" : "Uploading…") : label}
      </button>
      {cam && !editing && (
        <CameraCapture
          onClose={() => setCam(false)}
          onGallery={pick}
          onShot={(f) => {
            // Videos recorded here are already 15 seconds or less.
            edited.current.add(f);
            setCam(false);
            setEditing(f);
          }}
        />
      )}
      {editing && (
        <MediaEditor
          key={`${editing.name}-${editing.lastModified}`}
          file={editing}
          businessId={businessId}
          onCancel={() => setEditing(null)}
          onDone={(f, wasEdited) => {
            if (wasEdited) edited.current.add(f);
            setEditing(null);
            setPending2({ files: [f], urls: [URL.createObjectURL(f)] });
          }}
        />
      )}
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
      {working && stage && <p className="okline" role="status">{stage}</p>}
      {state.error && !working && <p className="err" role="alert">{state.error}</p>}
      {state.ok && !working && <p className="okline" role="status">{state.ok}</p>}
    </div>
  );
}
