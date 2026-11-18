"use client";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/client";

type Enroll = { id: string; qr: string; secret: string };

// Password and two-step login (a 6-digit code from an authenticator app).
export default function Security() {
  const [on, setOn] = useState<{ id: string } | null | undefined>(undefined);
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [pw, setPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok?: string; err?: string }>({});

  async function load() {
    const { data } = await browserClient().auth.mfa.listFactors();
    const f = ((data?.totp || []) as { id: string; status: string }[]).find((x) => x.status === "verified");
    setOn(f ? { id: f.id } : null);
  }
  useEffect(() => {
    load().catch(() => setOn(null));
  }, []);

  async function start() {
    setBusy(true);
    setMsg({});
    const sb = browserClient();
    // Clear any half-finished setup first.
    const { data: list } = await sb.auth.mfa.listFactors();
    for (const f of ((list?.all || []) as { id: string; status: string }[]).filter((x) => x.status !== "verified")) await sb.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `AdsVane ${Date.now()}` });
    setBusy(false);
    if (error || !data) return setMsg({ err: "Couldn't start two-step login. Please try again." });
    setCode("");
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    const c = code.replace(/\D/g, "");
    if (c.length !== 6) return setMsg({ err: "Enter the 6 numbers from your app." });
    setBusy(true);
    setMsg({});
    const { error } = await browserClient().auth.mfa.challengeAndVerify({ factorId: enroll.id, code: c });
    setBusy(false);
    if (error) return setMsg({ err: "That code didn't work. Codes change every 30 seconds, so try the newest one." });
    setEnroll(null);
    setOn({ id: enroll.id });
    setMsg({ ok: "Two-step login is on. Next time you log in, we'll ask for a code from your app." });
  }

  async function turnOff() {
    if (!on) return;
    setBusy(true);
    setMsg({});
    const { error } = await browserClient().auth.mfa.unenroll({ factorId: on.id });
    setBusy(false);
    if (error) return setMsg({ err: "Couldn't turn it off. Log out, log back in with your code, then try again." });
    setOn(null);
    setMsg({ ok: "Two-step login is off." });
  }

  async function savePw(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg({});
    if (pw.length < 8) return setPwMsg({ err: "Use at least 8 characters." });
    setBusy(true);
    const { error } = await browserClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setPwMsg({ err: /reauth|recent/i.test(error.message) ? "For safety, log out and log back in, then set your password." : "Couldn't save your password. Please try a different one." });
    setPw("");
    setPwMsg({ ok: "Password saved. You can now log in with your email and this password." });
  }

  return (
    <>
      <section className="card set-card">
        <h2>Password</h2>
        <form onSubmit={savePw} noValidate>
          <div className="fld">
            <label htmlFor="set-pw">New password</label>
            <input id="set-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <small className="muted">At least 8 characters.</small>
          </div>
          {pwMsg.err && <p className="err" role="alert">{pwMsg.err}</p>}
          {pwMsg.ok && <p className="okline" role="status">{pwMsg.ok}</p>}
          <button className="b" type="submit" disabled={busy}>Save password</button>
        </form>
      </section>
      <section className="card set-card">
        <h2>Two-step login</h2>
        <p className="sub">Protect your account. When you log in, we&apos;ll also ask for a 6-digit code from an app on your phone, like Google Authenticator or Microsoft Authenticator.</p>
        {on === undefined ? (
          <p className="muted">Checking…</p>
        ) : on ? (
          <div className="set-row">
            <div>
              <b className="set-on">On</b>
              <small>Your account asks for a code when you log in.</small>
            </div>
            <button type="button" className="b ghost" onClick={turnOff} disabled={busy}>Turn off</button>
          </div>
        ) : enroll ? (
          <form onSubmit={confirm} noValidate className="mfa-setup">
            <ol>
              <li>Install Google Authenticator or Microsoft Authenticator on your phone.</li>
              <li>In the app, tap <b>+</b> and scan this code. On this same phone, tap &ldquo;Enter a setup key&rdquo; and type the key below instead.</li>
              <li>Type the 6-digit code the app shows.</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qr} alt="QR code for your authenticator app" width={180} height={180} className="mfa-qr" />
            <p className="mfa-key">Setup key: <code>{enroll.secret}</code></p>
            <div className="fld">
              <label htmlFor="mfa-new">6-digit code</label>
              <input id="mfa-new" className="code-in" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="btns">
              <button className="b" type="submit" disabled={busy}>{busy ? "Checking…" : "Turn on"}</button>
              <button className="b ghost" type="button" onClick={() => { setEnroll(null); setMsg({}); }}>Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" className="b" onClick={start} disabled={busy}>{busy ? "Starting…" : "Set up two-step login"}</button>
        )}
        {msg.err && <p className="err" role="alert">{msg.err}</p>}
        {msg.ok && <p className="okline" role="status">{msg.ok}</p>}
      </section>
    </>
  );
}
