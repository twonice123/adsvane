import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { siteUrl } from "@/lib/data";
import { Suspense } from "react";
import AccountBar from "./components/AccountBar";
import NavProgress from "./components/NavProgress";

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
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <header className="bar">
          <div className="wrap">
            <Link href="/" className="logo">
              Ads<span>Vane</span>
            </Link>
            <AccountBar />
            <nav className="nav">
              <Link href="/find">Find services</Link>
              <Link href="/dashboard">Add your business</Link>
              <Link href="/me" className="me-link" aria-label="My page">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
                Me
              </Link>
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
