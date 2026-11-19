import { CONTACT_EMAIL } from "@/lib/legal";

// "email us at …", or a fallback while no public contact email is set.
export default function ContactLine({ subject }: { subject?: string }) {
  if (!CONTACT_EMAIL) return <>by replying to any email from AdsVane, or through the contact options on this site</>;
  const href = `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  return <>by email at <a href={href}>{CONTACT_EMAIL}</a></>;
}
