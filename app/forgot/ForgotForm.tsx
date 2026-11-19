"use client";
import { useState } from "react";
import { sendReset } from "../login/actions";

export default function ForgotForm({ email: start }: { email: string }) {
  const [email, setEmail] = useState(start);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const r = await sendReset(email).catch(() => ({ error: "We couldn't send the link. Please try again." }));
    setBusy(false);
    if (r.error) return setErr(r.error);
    setSent(true);
  }
  if (sent)
    return (
      <div className="ok">
        If <b>{email}</b> has an AdsVane account, a link to reset your password is on its way. Check your inbox (and spam folder).
      </div>
    );
  return (
    <form onSubmit={submit} noValidate>
      <div className="fld">
        <label htmlFor="fg-email">Email</label>
        <input id="fg-email" type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="b" type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}
