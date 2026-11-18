"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";

export default function MfaForm({ next }: { next: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const c = code.replace(/\D/g, "");
    if (c.length !== 6) return setErr("Enter the 6 numbers from your app.");
    setBusy(true);
    const sb = browserClient();
    const { data } = await sb.auth.mfa.listFactors();
    const f = ((data?.totp || []) as { id: string; status: string }[]).find((x) => x.status === "verified");
    if (!f) {
      router.replace(next);
      return;
    }
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code: c });
    if (error) {
      setBusy(false);
      return setErr("That code didn't work. Codes change every 30 seconds, so try the newest one.");
    }
    // A full page load, so no cached "enter your code" redirect is reused.
    window.location.assign(next);
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="fld">
        <label htmlFor="mfa-code">Code</label>
        <input id="mfa-code" className="code-in" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={7} autoFocus value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="b" type="submit" disabled={busy} style={{ width: "100%" }}>{busy ? "Checking…" : "Continue"}</button>
    </form>
  );
}
