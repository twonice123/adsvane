import Link from "next/link";
import { COMPANY, UPDATED } from "@/lib/legal";
import ContactLine from "@/app/components/ContactLine";

export const metadata = { title: "Delete your data", description: "How to delete your AdsVane account and data, including Facebook and Instagram connection data." };

export default function DataDeletion() {
  return (
    <article className="wrap narrow legal" style={{ margin: "26px auto 60px" }}>
      <h1>Delete your data</h1>
      <p className="muted">Last updated {UPDATED}</p>

      <h2>Remove Facebook and Instagram access (right away)</h2>
      <p>If you connected a Facebook Page or Instagram account to AdsVane, you can remove it in any of these ways. Each one stops AdsVane from posting for you.</p>
      <ol>
        <li><b>In AdsVane:</b> log in, open <Link href="/settings">Settings</Link>, and tap <b>Disconnect</b> next to Facebook or Instagram. We delete the stored access token and account details immediately.</li>
        <li><b>In Facebook:</b> go to Settings &amp; privacy → Settings → Apps and websites, find AdsVane, and tap Remove.</li>
        <li><b>In Instagram:</b> go to Settings → Website permissions → Apps and websites, find AdsVane, and tap Remove.</li>
      </ol>
      <p>When you remove AdsVane in Facebook or Instagram, the access token stops working, and we delete the remaining connection details within 30 days or as soon as we are notified.</p>

      <h2>Delete your whole AdsVane account</h2>
      <ol>
        <li>Contact {COMPANY} <ContactLine subject="Delete my account" /> from the email address you use to log in to AdsVane.</li>
        <li>Write &ldquo;Delete my account&rdquo;. If you have more than one business page, tell us whether to delete all of them.</li>
        <li>We confirm the request is from you, then delete your account, profile, business pages, photos and videos, saves, likes, comments, reviews and any Facebook or Instagram connections within 30 days.</li>
        <li>We email you when it is done.</li>
      </ol>
      <p>Posts you already shared to your own Facebook or Instagram stay there, because they are on your accounts. You can delete them in those apps.</p>
      <p className="muted">More details are in our <Link href="/privacy">Privacy Policy</Link>.</p>
    </article>
  );
}
