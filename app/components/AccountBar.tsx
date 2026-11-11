"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const I = {
  bell: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  menu: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  me: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
  store: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M4 9 5.5 4h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6" /></svg>,
  archive: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true"><path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4" /></svg>,
  saved: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>,
  out: <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>,
};

// Top of every page: links, the bell, and the ☰ menu (My page, Archive, Sign out…).
export default function AccountBar() {
  const path = usePathname();
  const [s, setS] = useState<{ signedIn: boolean; unread: number } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    let live = true;
    fetch("/api/me", { cache: "no-store" }).then((r) => r.json()).then((x) => live && setS(x)).catch(() => {});
    return () => {
      live = false;
    };
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const unread = s?.unread || 0;
  return (
    <>
      <button type="button" className="menu-btn" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)}>
        {I.menu}
      </button>
      <nav className="nav">
        <Link href="/find">Find services</Link>
        <Link href="/dashboard">Add your business</Link>
        <Link href="/notifications" className="bell" aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}>
          {I.bell}
          {unread > 0 && <span className="bell-n">{unread > 99 ? "99+" : unread}</span>}
        </Link>
      </nav>
      {open && (
        <div className="drawer-back" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="drawer-top">
              <b>Menu</b>
              <button type="button" className="sh-x" onClick={() => setOpen(false)} aria-label="Close menu">✕</button>
            </div>
            <Link href="/me">{I.me} My page</Link>
            <Link href="/dashboard">{I.store} My business</Link>
            <Link href="/notifications">{I.bell} Notifications{unread > 0 && <span className="drawer-n">{unread}</span>}</Link>
            <Link href="/archive">{I.archive} Archive</Link>
            <Link href="/me?tab=saved">{I.saved} Saved</Link>
            <hr />
            {s?.signedIn ? (
              <form action="/auth/signout" method="post">
                <button type="submit" className="drawer-out">{I.out} Sign out</button>
              </form>
            ) : (
              <Link href={`/login?who=member&next=${encodeURIComponent(path || "/")}`} className="drawer-in">{I.me} Sign in</Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
