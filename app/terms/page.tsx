import Link from "next/link";
import { COMPANY, UPDATED } from "@/lib/legal";
import ContactLine from "@/app/components/ContactLine";

export const metadata = { title: "Terms of Service", description: "The rules for using AdsVane." };

export default function Terms() {
  return (
    <article className="wrap narrow legal" style={{ margin: "26px auto 60px" }}>
      <h1>Terms of Service</h1>
      <p className="muted">Last updated {UPDATED}</p>
      <p>These terms are an agreement between you and {COMPANY} (&ldquo;AdsVane&rdquo;, &ldquo;we&rdquo;) for using the AdsVane website and apps (the &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to them.</p>

      <h2>1. Accounts</h2>
      <p>You must be at least 13 years old, give a real email address, and keep your password safe. You are responsible for what happens under your account. Tell us right away if you think someone else is using it.</p>

      <h2>2. Business profiles</h2>
      <p>If you create a business profile, you confirm that you own or are allowed to represent that business and that the details you add are true. Listings are free. Promotions are optional and are always labeled &ldquo;Sponsored&rdquo;.</p>

      <h2>3. Your content</h2>
      <p>You keep ownership of the photos, videos, captions, reviews and other content you post. You give AdsVane a non-exclusive, worldwide, royalty-free license to host, show and share that content on the Service so it can work (for example, showing your posts on your profile and in search). This license ends when you delete the content or your account, except for copies others already reposted on AdsVane or that are in routine backups for a limited time.</p>
      <p>Only post content you have the right to post. Do not post anything illegal, hateful, harassing, sexually explicit, misleading, or that infringes someone else&apos;s rights. Reviews must be honest and about a real experience. We may remove content or suspend accounts that break these rules.</p>

      <h2>4. Connecting Facebook and Instagram</h2>
      <p>Business owners may connect their own Facebook Page and Instagram professional account. When you do, you allow AdsVane to publish the posts you choose to those accounts. You can disconnect at any time in Settings. Your use of Facebook and Instagram is also governed by Meta&apos;s terms. We are not responsible for Meta&apos;s services.</p>

      <h2>5. Acceptable use</h2>
      <p>Do not misuse the Service: no spam, fake accounts, scraping, trying to access other people&apos;s accounts or data, or interfering with how the Service runs.</p>

      <h2>6. Businesses and customers</h2>
      <p>AdsVane helps people find local businesses. We do not provide the services businesses offer and are not part of any agreement between a customer and a business. Check details directly with the business.</p>

      <h2>7. Changes and ending</h2>
      <p>We may change or stop parts of the Service, and may update these terms. If changes are important, we will let you know. You can stop using the Service and delete your account at any time (see <Link href="/data-deletion">how to delete your data</Link>).</p>

      <h2>8. Disclaimers and limits</h2>
      <p>The Service is provided &ldquo;as is&rdquo;. To the extent the law allows, AdsVane is not liable for indirect or consequential losses, or for content posted by users or businesses.</p>

      <h2>9. Contact</h2>
      <p>Questions about these terms? Contact us <ContactLine subject="Terms question" />.</p>
      <p className="muted">See also our <Link href="/privacy">Privacy Policy</Link>.</p>
    </article>
  );
}
