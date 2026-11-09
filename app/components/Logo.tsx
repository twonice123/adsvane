export function Logo({ name, url, size = "" }: { name: string; url?: string | null; size?: "" | "big" | "sm" | "xl" }) {
  return (
    <span className={`lg ${size}`} aria-hidden="true">
      {url ? <img src={url} alt="" /> : name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
