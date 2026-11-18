"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

// First thing a visitor sees on the home page: are you looking for a service, or a business?
export default function Welcome() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("av_welcome") === "1";
    } catch {}
    if (!seen) setOpen(true);
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open]);
  function close() {
    try {
      sessionStorage.setItem("av_welcome", "1");
    } catch {}
    setOpen(false);
  }
  if (!open) return null;
  return (
    <div className="locask wel" role="dialog" aria-modal="true" aria-labelledby="wel-h" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="locask-box">
        <button type="button" className="wel-x" onClick={close} aria-label="Close">✕</button>
        <p className="wel-logo">Ads<span>Vane</span></p>
        <h2 id="wel-h">Welcome! What would you like to do?</h2>
        <div className="btns">
          <Link href="/find" className="b" onClick={close}>Search for services</Link>
          <Link href="/signup" className="b ghost" onClick={close}>Create your business profile</Link>
        </div>
        <p className="wel-in">Have a business account? <Link href="/login" onClick={close}>Log in</Link></p>
      </div>
    </div>
  );
}
