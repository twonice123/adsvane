"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Place } from "@/app/api/places/route";

// A text box that suggests real addresses and cities as you type.
export default function AddressInput({
  name,
  id,
  defaultValue = "",
  placeholder,
  ariaLabel,
  className,
  onPick,
  pickText,
  required,
  autoComplete = "off",
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  onPick?: (p: Place) => void;
  pickText?: (p: Place) => string;
  required?: boolean;
  autoComplete?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const last = useRef("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function lookup(q: string) {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3) {
      setItems([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      last.current = q;
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
        const list = (await res.json()) as Place[];
        if (last.current !== q) return;
        setItems(list);
        setActive(-1);
        setOpen(list.length > 0);
      } catch {
        setItems([]);
      }
    }, 220);
  }

  function pick(p: Place) {
    setValue(pickText ? pickText(p) : p.label);
    setOpen(false);
    onPick?.(p);
  }

  return (
    <div className="ac" ref={box}>
      <input
        id={id}
        name={name}
        className={className}
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        required={required}
        autoComplete={autoComplete}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          lookup(e.target.value);
        }}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (
        <ul className="ac-list" id={listId} role="listbox">
          {items.map((p, i) => (
            <li
              key={p.label}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "on" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="ac-ic" aria-hidden="true">{p.kind === "city" || p.kind === "zip" ? "◎" : "⌖"}</span>
              <span>{p.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
