"use client";
import { useState } from "react";

export default function ShareMine({ path }: { path: string }) {
  const [msg, setMsg] = useState("");
  return (
    <>
      <button
        type="button"
        className="b"
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
        Share my page
      </button>
      {msg && <span className="muted" role="status">{msg}</span>}
    </>
  );
}
