"use client";
import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, STATES } from "@/lib/data";
import AddressInput from "@/app/components/AddressInput";
import type { Place } from "@/app/api/places/route";
import { createAccount } from "./actions";
import { startBusiness } from "@/app/dashboard/actions";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Create a business, one short screen at a time:
// 1. name and type, 2. where it is, 3. email and password (skipped if already logged in).
export default function StartForm({ needAccount }: { needAccount: boolean }) {
  const total = needAccount ? 3 : 2;
  const [step, setStep] = useState(1);
  const [b, setB] = useState({ name: "", category: "", street: "", city: "", state: "", zip: "", show_address: true });
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [exists, setExists] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [hasAccount, setHasAccount] = useState(!needAccount);
  const set = (k: keyof typeof b, v: string | boolean) => { setErr(""); setB((x) => ({ ...x, [k]: v })); };

  function pick(p: Place) {
    setB((x) => ({ ...x, street: p.street || p.label || x.street, city: p.city || x.city, state: p.state || x.state, zip: p.zip || x.zip }));
  }

  async function finish() {
    setBusy(true);
    let r: Awaited<ReturnType<typeof startBusiness>>;
    try {
      r = await startBusiness(b);
    } catch {
      r = { error: "Couldn't create your business. Please try again." };
    }
    if (r.id) {
      // A full page load so the menu and bottom bar pick up the new login.
      window.location.assign(`/dashboard/${r.id}/setup`);
      return;
    }
    setBusy(false);
    setErr(r.error || "Please try again.");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setExists(false);
    if (step === 1) {
      if (!b.name.trim()) return setErr("Enter your business name.");
      if (!b.category) return setErr("Pick what kind of business it is.");
      return setStep(2);
    }
    if (step === 2) {
      if (!b.city.trim()) return setErr("Enter your city.");
      if (!b.state) return setErr("Pick your state.");
      if (hasAccount) return finish();
      return setStep(3);
    }
    if (!EMAIL.test(email.trim())) return setErr("Enter a valid email address.");
    if (pw.length < 8) return setErr("Use at least 8 characters for your password.");
    setBusy(true);
    let r: Awaited<ReturnType<typeof createAccount>>;
    try {
      r = await createAccount(email, pw);
    } catch {
      r = { error: "We couldn't create your account. Please try again." };
    }
    if (r.ok) {
      setHasAccount(true);
      return finish();
    }
    setBusy(false);
    if (r.confirm) return setConfirm(true);
    if (r.exists) setExists(true);
    setErr(r.error || "Please try again.");
  }

  if (confirm)
    return (
      <div className="ok">
        Almost done. We sent a link to <b>{email}</b>. Tap it to finish creating your account, then add your business.
      </div>
    );

  const heads: Record<number, [string, string]> = {
    1: ["Start with your business name", "This is how customers will find you on AdsVane."],
    2: ["Where is your business?", "Customers nearby will see you first when they search."],
    3: ["Create your login", "You'll use this email and password to sign in and manage your page."],
  };
  const [h, sub] = heads[step];
  const last = step === total;

  return (
    <form onSubmit={submit} noValidate className="st">
      <div className="st-bar" aria-hidden="true">
        {Array.from({ length: total }, (_, k) => <span key={k} className={k < step ? "on" : ""} />)}
      </div>
      <p className="st-step">Step {step} of {total}</p>
      <h1>{h}</h1>
      <p className="sub">{sub}</p>

      {step === 1 && (
        <div key="s1">
          <div className="fld">
            <label htmlFor="st-name">Business name</label>
            <input id="st-name" type="text" maxLength={120} autoFocus value={b.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Braids by MM" />
          </div>
          <div className="fld">
            <label htmlFor="st-cat">What kind of business is it?</label>
            <select id="st-cat" value={b.category} onChange={(e) => set("category", e.target.value)}>
              <option value="" disabled>Pick one</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div key="s2">
          <div className="fld">
            <label htmlFor="st-street">Street address</label>
            <AddressInput id="st-street" name="street" defaultValue={b.street} placeholder="Start typing, then pick your address" onPick={pick} pickText={(p) => p.street || p.label} />
          </div>
          <div className="three">
            <div className="fld"><label htmlFor="st-city">City</label><input id="st-city" type="text" value={b.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div className="fld">
              <label htmlFor="st-state">State</label>
              <select id="st-state" value={b.state} onChange={(e) => set("state", e.target.value)}>
                <option value="" disabled>State</option>
                {Object.keys(STATES).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="fld"><label htmlFor="st-zip">ZIP</label><input id="st-zip" type="text" inputMode="numeric" value={b.zip} onChange={(e) => set("zip", e.target.value)} /></div>
          </div>
          <label className="check"><input type="checkbox" checked={b.show_address} onChange={(e) => set("show_address", e.target.checked)} /><span>Show my street address on my page</span></label>
        </div>
      )}

      {step === 3 && (
        <div key="s3">
          <div className="fld">
            <label htmlFor="st-email">Email</label>
            <input id="st-email" type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="fld">
            <label htmlFor="st-pw">Create a password</label>
            <div className="pw">
              <input id="st-pw" type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button type="button" className="pw-eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
            </div>
            <small className="muted">At least 8 characters. Mix letters and numbers to keep it safe.</small>
          </div>
        </div>
      )}

      {err && (
        <p className="err" role="alert">
          {err} {exists && <Link href={`/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent("/dashboard/new")}`}>Log in</Link>}
        </p>
      )}
      <div className="st-btns">
        {step > 1 && <button type="button" className="b ghost" onClick={() => { setStep(step - 1); setErr(""); }} disabled={busy}>Back</button>}
        <button className="b" type="submit" disabled={busy}>
          {busy ? "Creating…" : last ? (needAccount ? "Create account" : "Create business") : "Next"}
        </button>
      </div>
    </form>
  );
}
