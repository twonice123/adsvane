"use client";
import { useState, useTransition } from "react";
import { toggleSaveBusiness } from "@/app/join/actions";

// Save a business page to your favorites (shown on your page under Saved places).
export default function SaveBiz({ businessId, saved: start }: { businessId: string; saved: boolean }) {
  const [saved, setSaved] = useState(start);
  const [pending, go] = useTransition();
  return (
    <button
      type="button"
      className={saved ? "pb pb-saved" : "pb"}
      aria-pressed={saved}
      disabled={pending}
      onClick={() =>
        go(async () => {
          const next = !saved;
          setSaved(next);
          const r = await toggleSaveBusiness(businessId, next).catch(() => ({ error: "x" }) as { error: string });
          if ("error" in r && r.error) {
            setSaved(!next);
            if (r.error === "login") window.location.assign(`/join?next=${encodeURIComponent(location.pathname)}`);
          }
        })
      }
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}
