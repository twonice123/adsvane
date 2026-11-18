"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createAccount } from "./actions";

// Instagram-style: email first, then a password, then you're in.
export default function SignupForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [exists, setExists] = useState(false);

  function next(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr("Enter a valid email address.");
    setStep(2);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setExists(false);
    if (pw.length < 8) return setErr("Use at least 8 characters for your password.");
    setBusy(true);
    let r: Awaited<ReturnType<typeof createAccount>>;
    try {
      r = await createAccount(email, pw);
    } catch {
      r = { error: "We couldn't create your account. Please try again." };
    }
    if (r.ok) {
      router.replace("/dashboard/new");
      router.refresh();
      return;
    }
    setBusy(false);
    if (r.confirm) return setStep(3);
    if (r.exists) setExists(true);
    setErr(r.error || "Please try again.");
  }

  if (step === 3)
    return (
      <div className="ok">
        Almost done. We sent a link to <b>{email}</b>. Tap it to finish creating your account, then you&apos;ll go straight to your business profile.
      </div>
    );

  return step === 1 ? (
    <form onSubmit={next} noValidate key="s1">
      <div className="fld">
        <label htmlFor="su-email">Email</label>
        <input id="su-email" type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="b" type="submit" style={{ width: "100%" }}>Next</button>
    </form>
  ) : (
    <form onSubmit={create} noValidate key="s2">
      <p className="su-for">
        Creating an account for <b>{email}</b>{" "}
        <button type="button" className="lnk" onClick={() => { setStep(1); setErr(""); setExists(false); }}>Change</button>
      </p>
      <div className="fld">
        <label htmlFor="su-pw">Create a password</label>
        <div className="pw">
          <input id="su-pw" type={show ? "text" : "password"} autoComplete="new-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" className="pw-eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
        </div>
        <small className="muted">At least 8 characters. Mix letters and numbers to keep it safe.</small>
      </div>
      {err && (
        <p className="err" role="alert">
          {err} {exists && <Link href={`/login?email=${encodeURIComponent(email)}`}>Log in</Link>}
        </p>
      )}
      <button className="b" type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Creating your account…" : "Create account"}</button>
    </form>
  );
}
