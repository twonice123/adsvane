import { focusStyle } from "@/lib/data";

export function Logo({ name, url, size = "", focus }: { name: string; url?: string | null; size?: "" | "big" | "sm" | "xl"; focus?: string | null }) {
  return (
    <span className={`lg ${size}`} aria-hidden="true">
      {url ? <img src={url} alt="" style={focusStyle(focus)} /> : name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
