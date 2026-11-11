"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Bell with unread count, and Sign in / Sign out, at the top of every page.
export default function AccountBar() {
  const path = usePathname();
  const [s, setS] = useState<{ signedIn: boolean; unread: number } | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/me", { cache: "no-store" }).then((r) => r.json()).then((x) => live && setS(x)).catch(() => {});
    return () => {
      live = false;
    };
  }, [path]);

  if (!s) return <div className="acct" aria-hidden="true" />;
  if (!s.signedIn)
    return (
      <div className="acct">
        <Link className="acct-btn" href={`/login?who=member&next=${encodeURIComponent(path || "/")}`}>Sign in</Link>
      </div>
    );
  return (
    <div className="acct">
      <Link href="/notifications" className="bell" aria-label={s.unread ? `Notifications, ${s.unread} new` : "Notifications"}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {s.unread > 0 && <span className="bell-n">{s.unread > 99 ? "99+" : s.unread}</span>}
      </Link>
      <form action="/auth/signout" method="post">
        <button type="submit" className="acct-btn">Sign out</button>
      </form>
    </div>
  );
}
