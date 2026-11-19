"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";

export default function ResetForm({ done }: { done: string }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw.length > 72) return setErr("Use 72 characters or fewer.");
    setBusy(true);
    const { error } = await browserClient().auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      return setErr(/same|different/i.test(error.message) ? "Pick a password you haven't used before." : /weak|pwned/i.test(error.message) ? "Please pick a stronger password." : "Couldn't save your password. Please try again.");
    }
    window.location.assign(done);
  }
  return (
    <form onSubmit={submit} noValidate>
      <div className="fld">
        <label htmlFor="rp-pw">New password</label>
        <div className="pw">
          <input id="rp-pw" type={show ? "text" : "password"} autoComplete="new-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" className="pw-eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
        </div>
        <small className="muted">At least 8 characters.</small>
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="b" type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
