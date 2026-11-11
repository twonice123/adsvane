"use client";
import { useState } from "react";

export default function ShareMine({ path }: { path: string }) {
  const [msg, setMsg] = useState("");
  return (
    <>
      <button
        type="button"
        className="me-share"
        aria-label="Share my page"
        onClick={async () => {
          const url = location.origin + path;
          try {
            if (navigator.share) return await navigator.share({ title: "My AdsVane page", url });
          } catch {
            return;
          }
          try {
            await navigator.clipboard.writeText(url);
            setMsg("Link copied.");
          } catch {
            setMsg(url);
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
      </button>
      {msg && <span className="muted me-msg" role="status">{msg}</span>}
    </>
  );
}
