"use client";
import { useState } from "react";
import Link from "next/link";
import { postReview } from "./actions";

export default function ReviewForm({ slug, name }: { slug: string; name: string }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [first, setFirst] = useState("");
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { optIn: boolean; email: string }>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!stars) return setErr("Tap a star to rate your visit.");
    if (!first.trim()) return setErr("Enter your first name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr("Enter a valid email address.");
    setBusy(true);
    let res: { error?: string };
    try {
      res = await postReview({ slug, stars, body, firstName: first, email, optIn });
    } catch {
      res = { error: "Something went wrong. Please try again." };
    }
    setBusy(false);
    if (res.error) return setErr(res.error);
    setDone({ optIn, email: email.trim() });
  }

  if (done)
    return (
      <div className="stack">
        <div className="ok">Thanks! Your review of {name} is posted.</div>
        <p className="sub" style={{ margin: 0 }}>
          {done.optIn
            ? `You'll get local picks at ${done.email} about once a week at most. Every email has an unsubscribe link.`
            : "You won't get any promotional emails."}
        </p>
        <Link className="b ghost" href={`/b/${slug}#reviews`}>See your review</Link>
      </div>
    );

  const shown = hover || stars;
  return (
    <form onSubmit={submit} noValidate>
      <div className="fld">
        <span className="lbl" id="starsLbl">Your rating</span>
        <div className="starpick" role="radiogroup" aria-labelledby="starsLbl" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={stars === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className={n <= shown ? "on" : ""}
              onMouseEnter={() => setHover(n)}
              onClick={() => setStars(n)}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <div className="fld">
        <label htmlFor="rvBody">Your review (optional)</label>
        <textarea id="rvBody" maxLength={1000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you like? What could be better?" />
      </div>
      <div className="two">
        <div className="fld">
          <label htmlFor="rvName">First name</label>
          <input id="rvName" type="text" autoComplete="given-name" maxLength={60} value={first} onChange={(e) => setFirst(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="rvEmail">Email</label>
          <input id="rvEmail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <p className="muted" style={{ marginTop: -6 }}>
        Only your first name shows with your review. {name} never sees your email.
      </p>
      <label className="check">
        <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
        <span>Email me new businesses and featured places near me.</span>
      </label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="b" type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>
        {busy ? "Posting…" : "Post review"}
      </button>
      <p className="muted" style={{ fontSize: 12 }}>Posting creates your free AdsVane account with this email.</p>
    </form>
  );
}
