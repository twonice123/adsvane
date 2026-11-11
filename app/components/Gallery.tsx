"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ago } from "@/lib/time";
import { useCallback, useEffect, useRef, useState } from "react";
import { addComment, deletePhoto, editPhoto, loadComments, loadViewers, noteShare, removeComment, toggle, type Comment, type Viewer } from "@/app/post-actions";

export type Post = {
  id: string;
  url: string;
  /** every photo in the post; people swipe through them */
  pics: string[];
  views: number;
  text: string | null;
  hidden?: boolean;
  likes: number;
  reposts: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  reposted: boolean;
  /** false for the cover photo, which can't be liked or saved */
  social: boolean;
  biz: { name: string; slug: string; logo_url: string | null };
};

const Icon = {
  heart: (on: boolean) => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill={on ? "#e0245e" : "none"} stroke={on ? "#e0245e" : "currentColor"} strokeWidth="2" strokeLinejoin="round"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4 7.4 4c2 0 3.5 1.1 4.6 2.7C13.1 5.1 14.6 4 16.6 4c3.5 0 5.8 3.6 4.6 7.1-1.7 4.8-9.2 9.4-9.2 9.4z" /></svg>
  ),
  repost: (on: boolean) => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke={on ? "#1f8a4c" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11V9a3 3 0 0 1 3-3h12" /><path d="m16 3 3 3-3 3" /><path d="M20 13v2a3 3 0 0 1-3 3H5" /><path d="m8 21-3-3 3-3" /></svg>
  ),
  share: () => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
  ),
  save: (on: boolean) => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>
  ),
  comment: () => (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z" /></svg>
  ),
  eye: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  stack: () => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M8 3h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M4 7v12a2 2 0 0 0 2 2h12" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
  ),
  dots: () => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
  ),
};

function Avatar({ name, url }: { name: string; url: string | null }) {
  return url ? <img className="pv-av" src={url} alt="" /> : <span className="pv-av">{name.slice(0, 1).toUpperCase()}</span>;
}

// A grid of photos. Tap one to open it as a post: like, repost, share, save,
// and (for the owner) a ⋯ menu to edit the caption, hide it or delete it.
export default function Gallery({
  photos,
  owner = false,
  loginNext,
  initial = 60,
  empty,
}: {
  photos: Post[];
  owner?: boolean;
  loginNext: string;
  initial?: number;
  empty?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const [mine, setMine] = useState<Record<string, Partial<Post>>>({});
  const [menu, setMenu] = useState<"" | "menu" | "edit" | "delete" | "login" | "views">("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const touch = useRef<number | null>(null);
  const [talk, setTalk] = useState<Comment[] | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const replyBox = useRef<HTMLTextAreaElement>(null);
  const [slide, setSlide] = useState(0);
  const [flash, setFlash] = useState("");
  const hold = useRef<{ t: ReturnType<typeof setTimeout> | null; fired: boolean }>({ t: null, fired: false });
  const ownerMenu = (i: number) => {
    setOpen(i);
    setMenu("menu");
  };
  const [viewers, setViewers] = useState<Viewer[] | null>(null);

  const list = photos.map((p) => ({ ...p, ...mine[p.id] }));
  const n = list.length;
  const shown = all ? list : list.slice(0, initial);
  const cur = open !== null ? list[open] : null;

  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + n) % n)), [n]);
  const close = useCallback(() => {
    setOpen(null);
    setMenu("");
    setNote("");
  }, []);

  // Open a shared photo link (?photo=id) straight away.
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("photo");
    if (!id) return;
    const i = photos.findIndex((p) => p.id === id);
    if (i >= 0) setOpen(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the comments for the photo that's open.
  const curId = cur?.id;
  const curSocial = cur?.social;
  useEffect(() => {
    setSlide(0);
    if (!curId || !curSocial) return;
    // Count this view (once per person or browser).
    let key = "";
    try {
      key = localStorage.getItem("av_vk") || "";
      if (!key) localStorage.setItem("av_vk", (key = crypto.randomUUID()));
    } catch {}
    fetch("/api/view", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ photo: curId, key }) })
      .then((r) => r.json())
      .then((x) => typeof x.views === "number" && setMine((m) => ({ ...m, [curId]: { ...m[curId], views: x.views } })))
      .catch(() => {});
  }, [curId, curSocial]);

  useEffect(() => {
    setTalk(null);
    setReply("");
    if (!curId || !curSocial) return;
    let live = true;
    loadComments(curId).then((c) => live && setTalk(c));
    return () => {
      live = false;
    };
  }, [curId, curSocial]);

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    if (!cur || !reply.trim() || sending) return;
    setSending(true);
    const r = await addComment(cur.id, reply);
    setSending(false);
    if (r.login) return setMenu("login");
    if (r.error) return setNote(r.error);
    setReply("");
    setTalk(r.comments || []);
    setMine((m) => ({ ...m, [cur.id]: { ...m[cur.id], comments: (r.comments || []).length } }));
  }

  async function dropComment(id: string) {
    if (!cur) return;
    const r = await removeComment(id, cur.id);
    if (r.error) return setNote(r.error);
    setTalk(r.comments || []);
    setMine((m) => ({ ...m, [cur.id]: { ...m[cur.id], comments: (r.comments || []).length } }));
  }

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (menu) return e.key === "Escape" && setMenu("");
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA" && e.key !== "Escape") return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go, close, menu]);

  async function flip(kind: "like" | "save" | "repost") {
    if (!cur) return;
    const key = kind === "like" ? "liked" : kind === "save" ? "saved" : "reposted";
    const on = !cur[key];
    const count = kind === "like" ? { likes: cur.likes + (on ? 1 : -1) } : kind === "repost" ? { reposts: cur.reposts + (on ? 1 : -1) } : {};
    const before = mine[cur.id] || {};
    setMine((m) => ({ ...m, [cur.id]: { ...before, [key]: on, ...count } }));
    const r = await toggle(kind, cur.id, on);
    if (r.login || r.error) setMine((m) => ({ ...m, [cur.id]: before }));
    if (r.login) setMenu("login");
    else if (r.error) setNote(r.error);
    else if (kind === "repost") setNote(on ? "Reposted to your page." : "Removed from your page.");
    else if (kind === "save") setNote(on ? "Saved. Find it on your page under Saved." : "Removed from Saved.");
  }

  async function share() {
    if (!cur) return;
    const url = `${location.origin}/b/${cur.biz.slug}?photo=${cur.id}`;
    const told = () => cur.social && noteShare(cur.id).catch(() => {});
    try {
      if (navigator.share) {
        await navigator.share({ title: cur.biz.name, text: cur.text || `See this from ${cur.biz.name} on AdsVane`, url });
        told();
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      told();
      setNote("Link copied. Paste it anywhere to share.");
    } catch {
      setNote(url);
    }
  }

  async function ownerDo(fn: () => Promise<{ error?: string }>, after: () => void) {
    setBusy(true);
    const r = await fn();
    setBusy(false);
    if (r.error) return setNote(r.error);
    after();
    router.refresh();
  }

  return (
    <>
      {flash && <p className="okline" role="status">{flash}</p>}
      {n === 0 ? (
        empty
      ) : (
        <div className="gal">
          {shown.map((p, i) => (
            <button
              key={p.id}
              type="button"
              className={`galitem${p.hidden ? " is-hidden" : ""}${owner ? " ownr" : ""}`}
              onClick={() => {
                if (hold.current.fired) return void (hold.current.fired = false);
                setOpen(i);
              }}
              onContextMenu={(e) => {
                if (!owner || !p.social) return;
                e.preventDefault();
                ownerMenu(i);
              }}
              onPointerDown={() => {
                if (!owner || !p.social) return;
                hold.current.fired = false;
                hold.current.t = setTimeout(() => {
                  hold.current.fired = true;
                  ownerMenu(i);
                }, 550);
              }}
              onPointerUp={() => hold.current.t && clearTimeout(hold.current.t)}
              onPointerLeave={() => hold.current.t && clearTimeout(hold.current.t)}
              onPointerCancel={() => hold.current.t && clearTimeout(hold.current.t)} aria-label={`Open post ${i + 1} of ${n}`}>
              <img src={p.url} alt={p.text || `${p.biz.name} photo ${i + 1}`} loading="lazy" draggable={false} />
              {p.hidden && <span className="galtag">Archived</span>}
              {p.pics.length > 1 && <span className="galmulti" aria-label={`${p.pics.length} photos`}>{Icon.stack()}</span>}
              {p.social && (
                <span className="galstats" aria-label={`${p.views} views${owner ? `, ${p.likes} likes, ${p.comments} comments, ${p.reposts} reposts` : ""}`}>
                  <span className="galeye">{Icon.eye()} {p.views}</span>
                  {owner && p.likes > 0 && <span>♥ {p.likes}</span>}
                  {owner && p.comments > 0 && <span>💬 {p.comments}</span>}
                  {owner && p.reposts > 0 && <span>↻ {p.reposts}</span>}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {n > initial && !all && (
        <p style={{ margin: "14px 0 0" }}>
          <button type="button" className="b ghost" onClick={() => setAll(true)}>See all {n} posts</button>
        </p>
      )}

      {cur && open !== null && (
        <div className="pv-back" role="dialog" aria-modal="true" aria-label={`${cur.biz.name} photo`} onClick={(e) => e.target === e.currentTarget && close()}>
          {n > 1 && <button type="button" className="lb-nav prev" onClick={() => go(-1)} aria-label="Previous photo">‹</button>}
          <article className="pv">
            <header className="pv-top">
              <Link href={`/b/${cur.biz.slug}`} className="pv-who" onClick={close}>
                <Avatar name={cur.biz.name} url={cur.biz.logo_url} />
                <b>{cur.biz.name}</b>
              </Link>
              {owner && cur.social && (
                <button type="button" className="pv-ic" onClick={() => setMenu("menu")} aria-label="More options">{Icon.dots()}</button>
              )}
              <button type="button" className="pv-ic" onClick={close} aria-label="Close" autoFocus>✕</button>
            </header>
            <div
              className="pv-img"
              onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
              onTouchEnd={(e) => {
                if (touch.current === null) return;
                const dx = e.changedTouches[0].clientX - touch.current;
                touch.current = null;
                if (Math.abs(dx) < 40) return;
                const step = dx < 0 ? 1 : -1;
                const last = cur.pics.length - 1;
                if (last > 0 && slide + step >= 0 && slide + step <= last) setSlide(slide + step);
                else if (last === 0) go(step);
              }}
              onDoubleClick={() => cur.social && !cur.liked && flip("like")}
            >
              <img key={cur.pics[slide] || cur.url} src={cur.pics[slide] || cur.url} alt={cur.text || `${cur.biz.name} photo`} />
              {cur.pics.length > 1 && (
                <>
                  <span className="pv-n">{slide + 1}/{cur.pics.length}</span>
                  {slide > 0 && <button type="button" className="pv-sl prev" onClick={() => setSlide(slide - 1)} aria-label="Previous picture">‹</button>}
                  {slide < cur.pics.length - 1 && <button type="button" className="pv-sl next" onClick={() => setSlide(slide + 1)} aria-label="Next picture">›</button>}
                </>
              )}
            </div>
            {cur.pics.length > 1 && (
              <div className="pv-dots" aria-hidden="true">
                {cur.pics.map((_, i) => <span key={i} className={i === slide ? "on" : ""} />)}
              </div>
            )}
            {cur.hidden && <p className="pv-hidden">Archived. Only you can see it. Tap ⋯ to show it on your profile again.</p>}
            <div className="pv-acts">
              {cur.social && (
                <>
                  <button type="button" className="pv-ic" aria-pressed={cur.liked} aria-label={cur.liked ? "Unlike" : "Like"} onClick={() => flip("like")}>{Icon.heart(cur.liked)}</button>
                  <button type="button" className="pv-ic" aria-label="Comment" onClick={() => replyBox.current?.focus()}>{Icon.comment()}</button>
                  <button type="button" className="pv-ic" aria-pressed={cur.reposted} aria-label={cur.reposted ? "Undo repost" : "Repost to your page"} onClick={() => flip("repost")}>{Icon.repost(cur.reposted)}</button>
                </>
              )}
              <button type="button" className="pv-ic" aria-label="Share" onClick={share}>{Icon.share()}</button>
              {cur.social && (
                <button type="button" className="pv-ic pv-right" aria-pressed={cur.saved} aria-label={cur.saved ? "Remove from saved" : "Save"} onClick={() => flip("save")}>{Icon.save(cur.saved)}</button>
              )}
            </div>
            {cur.social && (cur.likes > 0 || cur.reposts > 0 || cur.views > 0) && (
              <p className="pv-count">
                {[
                  cur.likes > 0 && <b key="l">{cur.likes} like{cur.likes === 1 ? "" : "s"}</b>,
                  cur.reposts > 0 && <span key="r">{cur.reposts} repost{cur.reposts === 1 ? "" : "s"}</span>,
                  cur.views > 0 &&
                    (owner ? (
                      <button
                        key="v"
                        type="button"
                        className="lnk pv-views"
                        onClick={async () => {
                          setViewers(null);
                          setMenu("views");
                          setViewers(await loadViewers(cur.id));
                        }}
                      >
                        {cur.views} view{cur.views === 1 ? "" : "s"}
                      </button>
                    ) : (
                      <span key="v">{cur.views} view{cur.views === 1 ? "" : "s"}</span>
                    )),
                ]
                  .filter(Boolean)
                  .flatMap((x, i) => (i ? [" · ", x] : [x]))}
              </p>
            )}
            {cur.text && (
              <p className="pv-text">
                <b>{cur.biz.name}</b> {cur.text}
              </p>
            )}
            {note && <p className="pv-note" role="status">{note}</p>}
            {cur.social && (
              <section className="pv-talk" aria-label="Comments">
                {talk === null ? (
                  cur.comments > 0 && <p className="muted pv-tl">Loading comments…</p>
                ) : (
                  talk.map((c) => (
                    <div key={c.id} className="pv-c">
                      <p>
                        <b>{c.name}</b> {c.body}
                      </p>
                      <span className="pv-cmeta">
                        {ago(c.created_at)}
                        {c.canDelete && (
                          <button type="button" className="lnk" onClick={() => dropComment(c.id)}>Delete</button>
                        )}
                      </span>
                    </div>
                  ))
                )}
                <form className="pv-say" onSubmit={sendComment}>
                  <textarea
                    ref={replyBox}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendComment(e);
                      }
                    }}
                    rows={1}
                    maxLength={1000}
                    placeholder={talk && talk.length ? "Add a comment…" : "Ask a question or say something nice…"}
                    aria-label="Add a comment"
                  />
                  <button type="submit" className="lnk" disabled={!reply.trim() || sending}>{sending ? "Posting…" : "Post"}</button>
                </form>
              </section>
            )}
            <p className="pv-pos">{open + 1} of {n}</p>
          </article>
          {n > 1 && <button type="button" className="lb-nav next" onClick={() => go(1)} aria-label="Next photo">›</button>}

          {menu && (
            <div className="pv-sheet-back" onClick={(e) => e.target === e.currentTarget && setMenu("")}>
              <div className="pv-sheet" role="dialog" aria-modal="true">
                {menu === "menu" && (
                  <>
                    <button type="button" onClick={() => { setDraft(cur.text || ""); setMenu("edit"); }}>Edit caption</button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => ownerDo(() => editPhoto(cur.id, { hidden: !cur.hidden }), () => {
                        setMine((m) => ({ ...m, [cur.id]: { ...m[cur.id], hidden: !cur.hidden } }));
                        setMenu("");
                        setOpen(null);
                        setFlash(cur.hidden ? "Showing on your profile again." : "Archived. Find it any time in ☰ Menu → Archive.");
                      })}
                    >
                      {cur.hidden ? "Show on profile" : "Archive"}
                    </button>
                    <button type="button" className="bad" onClick={() => setMenu("delete")}>Delete</button>
                    <button type="button" className="muted" onClick={() => setMenu("")}>Cancel</button>
                  </>
                )}
                {menu === "edit" && (
                  <form
                    className="pv-edit"
                    onSubmit={(e) => {
                      e.preventDefault();
                      ownerDo(() => editPhoto(cur.id, { text: draft }), () => {
                        setMine((m) => ({ ...m, [cur.id]: { ...m[cur.id], text: draft.trim() || null } }));
                        setNote("Caption saved.");
                        setMenu("");
                      });
                    }}
                  >
                    <h3>Edit caption</h3>
                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2200} rows={5} placeholder="Write a caption…" autoFocus />
                    <div className="btns">
                      <button type="submit" className="b" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                      <button type="button" className="b ghost" onClick={() => setMenu("")}>Cancel</button>
                    </div>
                  </form>
                )}
                {menu === "delete" && (
                  <>
                    <h3>Delete this photo?</h3>
                    <p className="sub">This can&apos;t be undone. To keep it but stop showing it, choose Archive instead.</p>
                    <button
                      type="button"
                      className="bad"
                      disabled={busy}
                      onClick={() => ownerDo(() => deletePhoto(cur.id), () => {
                        setMenu("");
                        setOpen(null);
                      })}
                    >
                      {busy ? "Deleting…" : "Delete"}
                    </button>
                    <button type="button" className="muted" onClick={() => setMenu("")}>Cancel</button>
                  </>
                )}
                {menu === "views" && (
                  <>
                    <h3>Viewed by</h3>
                    {viewers === null ? (
                      <p className="sub">Loading…</p>
                    ) : (
                      <>
                        <p className="sub">
                          {cur.views} view{cur.views === 1 ? "" : "s"}
                          {viewers.some((v) => !v.signed_in) && ` · ${viewers.filter((v) => !v.signed_in).length} by visitors who aren't signed in`}
                        </p>
                        <ul className="pv-vl">
                          {viewers.filter((v) => v.signed_in).map((v, i) => (
                            <li key={i}><span className="pv-av">{v.name.slice(0, 1).toUpperCase()}</span><b>{v.name}</b><small>{ago(v.viewed_at)}</small></li>
                          ))}
                        </ul>
                      </>
                    )}
                    <button type="button" className="muted" onClick={() => setMenu("")}>Close</button>
                  </>
                )}
                {menu === "login" && (
                  <>
                    <h3>Sign in to like, save and repost</h3>
                    <p className="sub">It&apos;s free. We email you a sign-in link, no password needed. Your reposts show on your own page.</p>
                    <Link className="b" href={`/login?who=member&next=${encodeURIComponent(loginNext.includes("?") ? loginNext : `${loginNext}?photo=${cur.id}`)}`}>Sign in</Link>
                    <button type="button" className="muted" onClick={() => setMenu("")}>Not now</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
