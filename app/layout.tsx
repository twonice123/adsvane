import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { siteUrl } from "@/lib/data";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "AdsVane: find local businesses near you", template: "%s · AdsVane" },
  description: "Find trusted local businesses, read real reviews from customers, and get featured places near you.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0d0b12" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="bar">
          <div className="wrap">
            <Link href="/" className="logo">
              Ads<span>Vane</span>
            </Link>
            <nav className="nav">
              <Link href="/">Find businesses</Link>
              <Link href="/dashboard">For businesses</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer>
          <div className="wrap">
            AdsVane · Free listings for local businesses. Paid placements are always labeled Sponsored.
          </div>
        </footer>
      </body>
    </html>
  );
}
