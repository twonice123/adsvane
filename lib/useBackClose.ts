"use client";
import { useEffect, useRef } from "react";

// While a pop-up (photo viewer, sheet, menu) is open, the phone's Back button
// closes it instead of leaving the page. Opening adds a history step; closing
// any other way takes that step back off.
export function useBackClose(open: boolean, onClose: () => void) {
  const pushed = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (open && !pushed.current) {
      history.pushState({ ...(history.state || {}), avPop: true }, "");
      pushed.current = true;
    } else if (!open && pushed.current) {
      pushed.current = false;
      if (history.state?.avPop) history.back();
    }
  }, [open]);

  useEffect(() => {
    const onPop = () => {
      if (!pushed.current) return;
      pushed.current = false;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Call before following a link out of the pop-up, so closing it doesn't step back.
  return () => {
    pushed.current = false;
  };
}
