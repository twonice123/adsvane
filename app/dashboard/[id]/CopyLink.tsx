"use client";
import { useState } from "react";

export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copyrow">
      <input readOnly value={url} aria-label="Your review link" onFocus={(e) => e.currentTarget.select()} />
      <button
        className="b ghost"
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
