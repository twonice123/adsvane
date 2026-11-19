"use client";
import { useState } from "react";
import { changeEmail } from "../login/actions";

// Personal details: the email you log in with, and changing it.
export default function Personal({ email, changed }: { email: string; changed: boolean }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>(changed ? { ok: "Your email was changed." } : {});
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg({});
    const r = await changeEmail(val).catch(() => ({ error: "We couldn't change your email. Please try again." }) as { ok?: string; error?: string });
    setBusy(false);
    if (r.error) return setMsg({ err: r.error });
    setMsg({ ok: r.ok });
    setEdit(false);
    setVal("");
  }
  return (
    <section className="card set-card">
      <h2>Personal details</h2>
      <div className="set-row">
        <div>
          <b>Email</b>
          <small style={{ overflowWrap: "anywhere" }}>{email}</small>
        </div>
        {!edit && <button type="button" className="b ghost" onClick={() => { setEdit(true); setMsg({}); }}>Change</button>}
      </div>
      {edit && (
        <form onSubmit={submit} noValidate style={{ marginTop: 12 }}>
          <div className="fld">
            <label htmlFor="pd-email">New email</label>
            <input id="pd-email" type="email" inputMode="email" autoComplete="email" autoFocus value={val} onChange={(e) => setVal(e.target.value)} />
          </div>
          <div className="btns">
            <button className="b" type="submit" disabled={busy}>{busy ? "Saving…" : "Change email"}</button>
            <button className="b ghost" type="button" onClick={() => { setEdit(false); setMsg({}); }}>Cancel</button>
          </div>
        </form>
      )}
      {msg.ok && <p className="ok" role="status">{msg.ok}</p>}
      {msg.err && <p className="err" role="alert">{msg.err}</p>}
    </section>
  );
}
