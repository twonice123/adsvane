"use client";
import { useEffect, useState } from "react";

// The tab row on a business page. Only the chosen tab's content shows.
export default function ProfileTabs({ tabs }: { tabs: { key: string; label: string; icon?: React.ReactNode }[] }) {
  const keys = tabs.map((t) => t.key);
  const [on, setOn] = useState(keys[0]);

  useEffect(() => {
    const fromHash = () => {
      const h = location.hash.slice(1);
      if (keys.includes(h)) setOn(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.getElementById("ptb")?.setAttribute("data-tab", on);
  }, [on]);

  return (
    <nav className="tabs" role="tablist" aria-label="Business page">
      {tabs.map((t) => (
        <a
          key={t.key}
          href={`#${t.key}`}
          role="tab"
          aria-selected={on === t.key}
          className={on === t.key ? "on" : ""}
          onClick={(e) => {
            e.preventDefault();
            setOn(t.key);
            history.replaceState(null, "", `${location.pathname}${location.search}#${t.key}`);
          }}
        >
          {t.icon}
          <span>{t.label}</span>
        </a>
      ))}
    </nav>
  );
}
