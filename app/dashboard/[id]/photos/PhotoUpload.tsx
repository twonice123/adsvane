"use client";
import { useActionState, useRef, useState, startTransition } from "react";
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
  const [state, action, pending] = useActionState<PhotoState, FormData>(uploadPhoto, {});
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const max = kind === "cover" ? 2000 : kind === "logo" ? 800 : 1600;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []).slice(0, 30);
    e.target.value = "";
    if (!picked.length) return;
    setBusy(true);
    // Send gallery photos a few at a time so each request stays small.
    const batches: File[][] = [];
    for (let i = 0; i < picked.length; i += 4) batches.push(picked.slice(i, i + 4));
    for (const batch of batches) {
      const b = new FormData();
      b.set("business_id", businessId);
      b.set("kind", kind);
      for (const f of batch) b.append("file", await shrink(f, max));
      startTransition(() => action(b));
    }
    setBusy(false);
  }

  const working = busy || pending;
  return (
    <div className={`upl ${wrapClass}`}>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple={multiple} onChange={onPick} hidden />
      <button type="button" className={className} disabled={working} onClick={() => input.current?.click()}>
        {working ? "Uploading…" : label}
      </button>
      {state.error && !working && <p className="err" role="alert">{state.error}</p>}
      {state.ok && !working && <p className="okline" role="status">{state.ok}</p>}
    </div>
  );
}
