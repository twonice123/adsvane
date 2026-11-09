import { focusStyle } from "@/lib/data";

// The wide cover photo at the top of a business page, framed the way the owner set it.
export function Cover({ url, focus, label, children }: { url?: string | null; focus?: string | null; label?: string; children?: React.ReactNode }) {
  return (
    <div className="cover big">
      {url && <img className="cover-img" src={url} alt={label || ""} style={focusStyle(focus)} />}
      {children}
    </div>
  );
}
