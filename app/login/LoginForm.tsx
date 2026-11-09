"use client";
import { useState } from "react";
import { sendLink } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr("Enter a valid email address.");
    setState("busy");
    let res: { error?: string };
    try {
      res = await sendLink(email, next);
    } catch {
      res = { error: "We couldn't send the link. Please try again." };
    }
    if (res.error) {
      setState("idle");
      return setErr(res.error);
    }
    setState("sent");
  }

  if (state === "sent")
    return (
      <div className="ok">
        Check your inbox at <b>{email}</b> and tap the sign-in link. You can close this tab.
      </div>
    );

  return (
    <form onSubmit={submit} noValidate>
      <div className="fld">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="b" type="submit" disabled={state === "busy"} style={{ width: "100%" }}>
        {state === "busy" ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
