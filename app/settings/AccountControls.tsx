"use client";
import { useState } from "react";
import { deleteAccount, setPaused } from "./account-actions";
import { useBackClose } from "@/lib/useBackClose";

// Pause switch and Delete account, each with an "Are you sure?" step.
export default function AccountControls({ paused: start, isBusiness }: { paused: boolean; isBusiness: boolean }) {
  const [paused, setP] = useState(start);
  const [ask, setAsk] = useState<"" | "pause" | "delete" | "delete2">("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const close = () => { if (!busy) { setAsk(""); setErr(""); } };
  useBackClose(!!ask, close);

  async function apply(next: boolean) {
    setBusy(true);
    setErr("");
    const r = await setPaused(next).catch(() => ({ error: "Couldn't update your account. Please try again." }) as { paused?: boolean; error?: string });
    setBusy(false);
    if (r.error) return setErr(r.error);
    setP(next);
    setAsk("");
    setMsg(next ? "Your account is paused." : "Your account is back on.");
  }

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!email.trim() || !pw) return setErr("Enter your email and password.");
    setBusy(true);
    const r = await deleteAccount(email, pw).catch(() => ({ error: "Couldn't delete your account. Please try again." }) as { ok?: true; error?: string });
    if (r.ok) {
      window.location.assign("/?deleted=1");
      return;
    }
    setBusy(false);
    setErr(r.error || "Please try again.");
  }

  const what = isBusiness ? "your business page and posts" : "your page and reposts";
  return (
    <section className="card set-card">
      <h2>Account</h2>
      <div className="set-row">
        <div>
          <b id="pause-l">Pause my account</b>
          <small>{paused ? `Paused. People can't find ${what} until you turn this off.` : `Hide ${what} from search for a while. Nothing is deleted.`}</small>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={paused}
          aria-labelledby="pause-l"
          className={`sw ${paused ? "on" : ""}`}
          disabled={busy}
          onClick={() => { setMsg(""); setErr(""); if (paused) apply(false); else setAsk("pause"); }}
        >
          <span />
        </button>
      </div>
      <div className="set-row">
        <div>
          <b>Delete my account</b>
          <small>Removes your account{isBusiness ? ", business pages, photos and videos" : ""} for good.</small>
        </div>
        <button type="button" className="b ghost danger" onClick={() => { setMsg(""); setErr(""); setEmail(""); setPw(""); setAsk("delete"); }}>Delete</button>
      </div>
      {msg && <p className="ok" role="status">{msg}</p>}
      {err && !ask && <p className="err" role="alert">{err}</p>}

      {ask && (
        <div className="cf-back" role="dialog" aria-modal="true" aria-labelledby="cf-h" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="cf-box">
            {ask === "pause" && (
              <>
                <h2 id="cf-h">Pause your account?</h2>
                <p>{isBusiness ? "Your business won't show in search, on the billboard or on its page" : "Your page and reposts won't show to others"} until you turn this back on. Nothing is deleted.</p>
                {err && <p className="err" role="alert">{err}</p>}
                <div className="cf-btns">
                  <button type="button" className="b ghost" onClick={close} disabled={busy}>Cancel</button>
                  <button type="button" className="b" onClick={() => apply(true)} disabled={busy}>{busy ? "Pausing…" : "Yes, pause"}</button>
                </div>
              </>
            )}
            {ask === "delete" && (
              <>
                <h2 id="cf-h">Delete your account?</h2>
                <p>This deletes your account{isBusiness ? ", your business pages, photos, videos, reviews" : ""}, saves and likes for good. It can&apos;t be undone. If you only need a break, pause your account instead.</p>
                <div className="cf-btns">
                  <button type="button" className="b ghost" onClick={close}>Cancel</button>
                  <button type="button" className="b danger-solid" onClick={() => setAsk("delete2")}>Yes, continue</button>
                </div>
              </>
            )}
            {ask === "delete2" && (
              <form onSubmit={remove} noValidate>
                <h2 id="cf-h">Confirm it&apos;s you</h2>
                <p>Enter your email and password to delete your account.</p>
                <div className="fld">
                  <label htmlFor="del-email">Email</label>
                  <input id="del-email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="fld">
                  <label htmlFor="del-pw">Password</label>
                  <input id="del-pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
                </div>
                {err && <p className="err" role="alert">{err}</p>}
                <div className="cf-btns">
                  <button type="button" className="b ghost" onClick={close} disabled={busy}>Cancel</button>
                  <button type="submit" className="b danger-solid" disabled={busy}>{busy ? "Deleting…" : "Delete forever"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
