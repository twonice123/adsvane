"use client";
import Link from "next/link";
import { useState } from "react";
import { createAccount } from "@/app/signup/actions";
import { saveMemberProfile } from "./actions";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Like Instagram: email, then a password, then your name. Then you're in.
export default function JoinForm({ next, startAt = 1 }: { next: string; startAt?: 1 | 3 }) {
  const [step, setStep] = useState<1 | 2 | 3>(startAt);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [exists, setExists] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setExists(false);
    if (step === 1) {
      if (!EMAIL.test(email.trim())) return setErr("Enter a valid email address.");
      return setStep(2);
    }
    setBusy(true);
    if (step === 2) {
      if (pw.length < 8) {
        setBusy(false);
        return setErr("Use at least 8 characters for your password.");
      }
      let r: Awaited<ReturnType<typeof createAccount>>;
      try {
        r = await createAccount(email, pw, `/join?step=profile&next=${encodeURIComponent(next)}`);
      } catch {
        r = { error: "We couldn't create your account. Please try again." };
      }
      if (r.ok) {
        // A fresh page load so the new login is picked up everywhere.
        window.location.assign(`/join?step=profile&next=${encodeURIComponent(next)}`);
        return;
      }
      setBusy(false);
      if (r.confirm) return setConfirm(true);
      if (r.exists) setExists(true);
      return setErr(r.error || "Please try again.");
    }
    let r: Awaited<ReturnType<typeof saveMemberProfile>>;
    try {
      r = await saveMemberProfile(name, zip);
    } catch {
      r = { error: "Couldn't save your profile. Please try again." };
    }
    if (r.ok) {
      window.location.assign(next);
      return;
    }
    setBusy(false);
    setErr(r.error || "Please try again.");
  }

  if (confirm)
    return (
      <div className="ok">
        Check your email. We sent a link to <b>{email}</b>. Tap it to confirm your account, then finish your profile.
      </div>
    );

  const heads = {
    1: ["Create your account", "Search local pros, save your favorite pages, and keep everything in one place."],
    2: ["Create a password", "You'll use your email and this password to log in, on the website and later in the app."],
    3: ["Create your profile", "This is how businesses will see you when you like, save or review."],
  }[step];

  return (
    <form onSubmit={submit} noValidate className="st">
      <div className="st-bar" aria-hidden="true">
        {[1, 2, 3].map((k) => <span key={k} className={k <= step ? "on" : ""} />)}
      </div>
      <p className="st-step">Step {step} of 3</p>
      <h1>{heads[0]}</h1>
      <p className="sub">{heads[1]}</p>

      {step === 1 && (
        <div className="fld" key="j1">
          <label htmlFor="j-email">Email</label>
          <input id="j-email" type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => { setErr(""); setEmail(e.target.value); }} />
        </div>
      )}
      {step === 2 && (
        <div key="j2">
          <p className="su-for">
            Creating an account for <b>{email}</b>{" "}
            <button type="button" className="lnk" onClick={() => { setStep(1); setErr(""); setExists(false); }}>Change</button>
          </p>
          <div className="fld">
            <label htmlFor="j-pw">Password</label>
            <div className="pw">
              <input id="j-pw" type={show ? "text" : "password"} autoComplete="new-password" autoFocus value={pw} onChange={(e) => { setErr(""); setPw(e.target.value); }} />
              <button type="button" className="pw-eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
            </div>
            <small className="muted">At least 8 characters. Mix letters and numbers to keep it safe.</small>
          </div>
        </div>
      )}
      {step === 3 && (
        <div key="j3">
          <div className="fld">
            <label htmlFor="j-name">First name</label>
            <input id="j-name" type="text" autoComplete="given-name" maxLength={60} autoFocus value={name} onChange={(e) => { setErr(""); setName(e.target.value); }} />
          </div>
          <div className="fld">
            <label htmlFor="j-zip">ZIP code <span className="muted">(optional)</span></label>
            <input id="j-zip" type="text" inputMode="numeric" autoComplete="postal-code" maxLength={10} value={zip} onChange={(e) => { setErr(""); setZip(e.target.value); }} placeholder="So we show pros near you first" />
          </div>
        </div>
      )}

      {err && (
        <p className="err" role="alert">
          {err} {exists && <Link href={`/login?who=member&email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`}>Log in</Link>}
        </p>
      )}
      <div className="st-btns">
        <button className="b" type="submit" disabled={busy}>
          {busy ? "Please wait…" : step === 1 ? "Next" : step === 2 ? "Create account" : "Done"}
        </button>
      </div>
    </form>
  );
}
