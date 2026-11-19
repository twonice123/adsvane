import Link from "next/link";

export const metadata = { title: "Privacy Policy", description: "How AdsVane collects, uses and deletes your information." };

export default function Privacy() {
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 60px" }}>
      <h1>Privacy Policy</h1>
      <p className="sub">Last updated November 19, 2026</p>

      <h2>Who we are</h2>
      <p>AdsVane is a local business directory at adsvane.vercel.app. Customers find local businesses, and business owners create free profiles and share photos and videos of their work.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> your email address and password (stored securely, never readable by us), and your first name and ZIP code if you give them.</li>
        <li><b>Business profiles:</b> the business name, address, phone, website, social links, pictures, videos and descriptions an owner adds. These are shown publicly on AdsVane.</li>
        <li><b>Activity:</b> pages you save, photos you like, save or repost, comments and reviews you post.</li>
        <li><b>Location:</b> if you allow it, your approximate location to show businesses near you.</li>
        <li><b>Connected accounts:</b> if a business owner connects Facebook or Instagram, we store the Page and Instagram account names and IDs and an access key that lets AdsVane share that owner&apos;s posts to those accounts when they ask it to. We do not read your private messages, followers or other content.</li>
      </ul>

      <h2>How we use it</h2>
      <p>To run your account, show businesses and their work, let you save favorites, show sponsored listings (always labeled), and, for connected accounts, share the posts you choose to Facebook and Instagram. We do not sell your information.</p>

      <h2>Who we share it with</h2>
      <p>Our service providers that host the site and data (Vercel and Supabase), and Meta (Facebook and Instagram) only for posts you choose to share there. We may share information if the law requires it.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Change your email or password, or turn on two-step login, in <Link href="/settings">Settings</Link>.</li>
        <li>Disconnect Facebook or Instagram any time in <Link href="/settings">Settings</Link>. This deletes the access key we stored. You can also remove AdsVane in your Facebook settings under Apps and Websites.</li>
      </ul>

      <h2 id="delete">Deleting your data</h2>
      <p>To delete your account and everything linked to it (profile, business pages, photos, videos, saves, reviews and connected accounts), email the AdsVane team from the email address on your account with the subject &ldquo;Delete my account&rdquo;. We delete it within 30 days and confirm by email. Disconnecting Facebook or Instagram in Settings deletes that connection right away.</p>

      <h2>Contact</h2>
      <p>Questions about privacy? Contact the AdsVane team through the email on this site&apos;s contact page.</p>
    </div>
  );
}
