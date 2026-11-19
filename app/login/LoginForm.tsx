"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendLink } from "./actions";
import { logIn } from "../signup/actions";

export default function LoginForm({ next, email: start = "", linkOnly = false }: { next: string; email?: string; linkOnly?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState(start);
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"pw" | "link">(linkOnly ? "link" : "pw");
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr("Enter a valid email address.");
    setState("busy");
    if (mode === "pw") {
      let r: Awaited<ReturnType<typeof logIn>>;
      try {
        r = await logIn(email, pw);
      } catch {
        r = { error: "We couldn't log you in. Please try again." };
      }
      if (r.ok) {
        router.replace(next);
        router.refresh();
        return;
      }
      setState("idle");
      return setErr(r.error || "Please try again.");
    }
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
      {mode === "pw" && (
        <div className="fld">
          <label htmlFor="pw">Password</label>
          <div className="pw">
            <input id="pw" type={show ? "text" : "password"} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" className="pw-eye" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
          </div>
          <a className="fg-link" href={`/forgot${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`}>Forgot password?</a>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <button className="b" type="submit" disabled={state === "busy"} style={{ width: "100%" }} key={mode}>
        {mode === "pw" ? (state === "busy" ? "Logging in…" : "Log in") : state === "busy" ? "Sending…" : "Email me a sign-in link"}
      </button>
      <p className="su-or">or</p>
      <button type="button" className="b ghost" style={{ width: "100%" }} onClick={() => { setMode(mode === "pw" ? "link" : "pw"); setErr(""); }}>
        {mode === "pw" ? "Email me a sign-in link" : "Log in with a password"}
      </button>
    </form>
  );
}
