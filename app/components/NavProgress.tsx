"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// A thin bar at the top while the next page loads, so a tap always shows it's working.
export default function NavProgress() {
  const path = usePathname();
  const search = useSearchParams();
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(false);
  }, [path, search]);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setOn(true);
    };
    const submit = (e: SubmitEvent) => {
      const f = e.target as HTMLFormElement;
      if (f.getAttribute("method")?.toLowerCase() === "post" && f.getAttribute("action")?.startsWith("/")) setOn(true);
    };
    document.addEventListener("click", click);
    document.addEventListener("submit", submit);
    return () => {
      document.removeEventListener("click", click);
      document.removeEventListener("submit", submit);
    };
  }, []);

  useEffect(() => {
    if (!on) return;
    const t = setTimeout(() => setOn(false), 15000);
    return () => clearTimeout(t);
  }, [on]);

  return on ? <div className="navbar-prog" role="progressbar" aria-label="Loading" /> : null;
}
