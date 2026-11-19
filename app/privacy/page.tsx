import Link from "next/link";
import { COMPANY, UPDATED } from "@/lib/legal";
import ContactLine from "@/app/components/ContactLine";

export const metadata = { title: "Privacy Policy", description: "How AdsVane collects, uses, shares, keeps and deletes your information, including data from Facebook and Instagram." };

export default function Privacy() {
  return (
    <article className="wrap narrow legal" style={{ margin: "26px auto 60px" }}>
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated {UPDATED}</p>
      <p>
        This Privacy Policy explains how {COMPANY} (&ldquo;AdsVane&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, shares, keeps and deletes information when you use the AdsVane website at adsvane.vercel.app and any AdsVane app (together, the &ldquo;Service&rdquo;). By using the Service you agree to this policy.
      </p>
      <nav className="legal-toc" aria-label="On this page">
        <a href="#collect">What we collect</a>
        <a href="#meta">Facebook and Instagram data</a>
        <a href="#use">How we use it</a>
        <a href="#share">Who we share it with</a>
        <a href="#keep">How long we keep it</a>
        <a href="#delete">Deleting your data</a>
        <a href="#rights">Your rights</a>
        <a href="#contact">Contact us</a>
      </nav>

      <h2>About the Service</h2>
      <p>AdsVane is a local business directory. Customers create a free account to search for local businesses, save their favorites and leave reviews. Business owners create a free profile, post photos and short videos of their work, and can choose to promote their profile. Business owners can also connect their own Facebook Page and Instagram professional account so that posts they choose to publish on AdsVane are also published to those accounts.</p>

      <h2 id="collect">1. Information we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li><b>Account information:</b> your email address and password. Passwords are stored only as a secure, one-way hash by our authentication provider; we cannot see them.</li>
        <li><b>Customer profile:</b> your first name and, if you choose, your ZIP code.</li>
        <li><b>Business profile:</b> business name, category, address, phone number, website, social media links, description, hours, services, profile picture, cover photo, and the photos, videos and captions you post. Business profiles are public.</li>
        <li><b>Your activity:</b> businesses you save, posts you like, save or repost, comments and reviews you write.</li>
        <li><b>Promotions:</b> the settings of any promotion a business chooses to run.</li>
        <li><b>Security settings:</b> if you turn on two-step login, a secret used to check the codes from your authenticator app.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li><b>Approximate location:</b> your approximate area, based on your device&apos;s location if you allow it or on your internet address, so we can show businesses near you. We do not keep a history of your locations.</li>
        <li><b>Basic technical data:</b> browser type, device type, pages viewed and error logs, used to run and secure the Service.</li>
        <li><b>Cookies:</b> we use only the cookies needed to keep you signed in and to remember simple preferences. We do not use advertising or tracking cookies.</li>
      </ul>

      <h2 id="meta">2. Data we receive from Facebook and Instagram (Meta)</h2>
      <p>This section applies only to business owners who choose to connect a Facebook Page or Instagram professional account in AdsVane Settings. Customers never need to connect anything.</p>
      <ul>
        <li><b>What we receive:</b> when you tap Connect and approve access on Facebook or Instagram&apos;s own login screen, we receive the name and ID of the Facebook Pages you choose, the username and ID of the linked Instagram professional account, and an access token that lets AdsVane publish on those accounts on your behalf.</li>
        <li><b>What we use it for:</b> only to show you which accounts are connected and to publish the photos, videos and captions <i>you</i> choose to share from AdsVane to your own Facebook Page and Instagram account. We never post anything without your action.</li>
        <li><b>What we do not do:</b> we do not read your private messages, friends, followers or other personal Facebook or Instagram content. We do not sell, rent or share Meta data with anyone, do not use it for advertising or profiling, and do not combine it with data from other sources.</li>
        <li><b>How it is protected:</b> access tokens are stored encrypted at rest in our database, are never sent to your browser, and can be used only by our server for your own account.</li>
        <li><b>How long we keep it:</b> until you disconnect, delete your account, or remove AdsVane from your Facebook settings, whichever comes first. Then the token and account details are deleted.</li>
        <li><b>How to remove access:</b> tap Disconnect in <Link href="/settings">Settings</Link> (deleted immediately), or remove AdsVane in Facebook under Settings &amp; privacy → Settings → Apps and websites, or in Instagram under Settings → Website permissions → Apps and websites. See also our <Link href="/data-deletion">data deletion instructions</Link>.</li>
      </ul>
      <p>Our use of information received from Meta follows the Meta Platform Terms and Developer Policies.</p>

      <h2 id="use">3. How we use information</h2>
      <ul>
        <li>To create and run your account, keep it secure, and let you log in.</li>
        <li>To show business profiles, posts and reviews, and to show businesses near you in search.</li>
        <li>To let you save, like, repost and comment, and to notify business owners about activity on their posts.</li>
        <li>To publish posts to connected Facebook and Instagram accounts when you ask us to.</li>
        <li>To show sponsored listings. Paid placements are always labeled &ldquo;Sponsored&rdquo;.</li>
        <li>To send service emails, such as sign-in links, password resets and email-change confirmations.</li>
        <li>To prevent fraud, spam and abuse, and to fix problems.</li>
      </ul>
      <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>

      <h2 id="share">4. Who we share information with</h2>
      <ul>
        <li><b>The public:</b> business profiles, business posts, public reviews (with the reviewer&apos;s first name) and reposts are visible to people using AdsVane.</li>
        <li><b>Service providers</b> who host and run the Service for us under contract: Vercel (website hosting) and Supabase (database, file storage and sign-in).</li>
        <li><b>Meta</b> (Facebook and Instagram), only the posts a business owner chooses to publish to their own connected accounts.</li>
        <li><b>Legal reasons:</b> if required by law, or to protect the rights and safety of our users or the public.</li>
        <li><b>Business transfers:</b> if AdsVane is merged or sold, information may transfer under this same policy.</li>
      </ul>

      <h2 id="keep">5. How long we keep information</h2>
      <p>We keep account and profile information while your account is open. When you delete your account, we delete your personal information within 30 days, except where we must keep limited records by law. Copies in routine backups are overwritten within 30 more days. Facebook and Instagram connection data is deleted as described in section 2.</p>

      <h2>6. Security</h2>
      <p>We use encrypted connections (HTTPS), hashed passwords, optional two-step login, and database rules that let each person see and change only their own private information. No method of storage or transfer is completely secure, but we work to protect your information.</p>

      <h2>7. Children</h2>
      <p>The Service is not meant for children under 13, and we do not knowingly collect information from them. If you believe a child has given us information, contact us and we will delete it.</p>

      <h2 id="delete">8. Deleting your data</h2>
      <p>You can delete your data at any time. Full steps are on our <Link href="/data-deletion">data deletion page</Link>. In short: contact us <ContactLine subject="Delete my account" /> from the email address on your account, and we will delete your account and everything linked to it within 30 days and confirm when it is done. Disconnecting Facebook or Instagram in Settings deletes that connection right away.</p>

      <h2 id="rights">9. Your rights and choices</h2>
      <ul>
        <li>See and update your information, change your email or password, and turn on two-step login in <Link href="/settings">Settings</Link>.</li>
        <li>Ask for a copy of your information, or ask us to correct or delete it.</li>
        <li>California and other US state residents may have extra rights, including to know what we collect and to request deletion. We do not sell or &ldquo;share&rdquo; personal information for cross-context advertising. We will not treat you differently for using your rights.</li>
      </ul>
      <p>To use any of these rights, contact us <ContactLine subject="Privacy request" />.</p>

      <h2>10. Changes to this policy</h2>
      <p>We may update this policy. We will change the &ldquo;Last updated&rdquo; date, and for important changes we will let you know on the Service or by email.</p>

      <h2 id="contact">11. Contact us</h2>
      <p>Questions or requests about privacy? Contact {COMPANY} <ContactLine subject="Privacy question" />.</p>
      <p className="muted">See also our <Link href="/terms">Terms of Service</Link> and <Link href="/data-deletion">data deletion instructions</Link>.</p>
    </article>
  );
}
