"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { uploadPhoto, type PhotoState } from "../../photo-actions";

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
}: {
  businessId: string;
  kind: "logo" | "cover" | "gallery";
  label: string;
  multiple?: boolean;
  className?: string;
  wrapClass?: string;
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
    // Work photos: write a caption first, like a social post.
    if (kind === "gallery") {
      setCaption("");
      setPending2({ files: picked, urls: picked.map((f) => URL.createObjectURL(f)) });
      return;
    }
    send(picked, "");
  }

  function cancelPost() {
    pending2?.urls.forEach((u) => URL.revokeObjectURL(u));
    setPending2(null);
  }

  async function send(picked: File[], text: string) {
    setBusy(true);
    // Send gallery photos a few at a time so each request stays small.
    const batches: File[][] = [];
    for (let i = 0; i < picked.length; i += 4) batches.push(picked.slice(i, i + 4));
    for (const batch of batches) {
      const b = new FormData();
      b.set("business_id", businessId);
      b.set("kind", kind);
      if (text.trim()) b.set("caption", text.trim());
      for (const f of batch) b.append("file", await shrink(f, max));
      let r: PhotoState;
      try {
        r = await uploadPhoto({}, b);
      } catch {
        r = { error: "Couldn't upload the photo. Please check your connection and try again." };
      }
      setState(r);
      if (r.error) break;
    }
    setBusy(false);
    router.refresh();
  }

  const working = busy;
  return (
    <div className={`upl ${wrapClass}`}>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple={multiple} onChange={onPick} hidden />
      <button type="button" className={className} disabled={working} onClick={() => input.current?.click()}>
        {working ? (kind === "gallery" ? "Posting…" : "Uploading…") : label}
      </button>
      {pending2 && (
        <div className="sh-back" role="dialog" aria-modal="true" aria-label="New post" onClick={(e) => e.target === e.currentTarget && cancelPost()}>
          <div className="sh-box np">
            <div className="sh-top">
              <button type="button" className="sh-x" onClick={cancelPost} aria-label="Cancel">✕</button>
              <h2>New post</h2>
            </div>
            <div className={`np-pics${pending2.urls.length === 1 ? " one" : ""}`}>
              {pending2.urls.map((u) => <img key={u} src={u} alt="" />)}
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
              {pending2.files.length > 1 ? `${pending2.files.length} photos. Each one gets this caption. ` : ""}
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
