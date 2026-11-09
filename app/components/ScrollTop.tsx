"use client";
import { useEffect } from "react";

// After a form redirects here, start at the top so the cover photo is visible.
export default function ScrollTop() {
  useEffect(() => {
    window.scrollTo(0, 0);
    // The router may adjust scroll right after the page shows; do it again.
    const t = setTimeout(() => window.scrollTo(0, 0), 120);
    return () => clearTimeout(t);
  }, []);
  return null;
}
