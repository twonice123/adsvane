# AdsVane

Local business directory. Listing is free; businesses pay only to promote their profile.

- **Customers** find businesses, read reviews, and leave a review from a shop's QR code or link.
  Posting a review creates their AdsVane account; promo emails are opt-in only.
- **Owners** sign in by email link, create their listing, get a printable review QR code,
  and run "Promote profile" campaigns that show as **Sponsored** in search and in customer emails.

## Stack

Next.js (App Router) on Vercel, Supabase (Postgres + Auth). Database changes live in
`supabase/migrations/`.

## Environment variables

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (safe for the browser) |
| `NEXT_PUBLIC_SITE_URL` | The live site address, used in review links and QR codes |

Copy `.env.example` to `.env.local` for local development, then `npm install && npm run dev`.

## Not built yet

- Charging for promotions (Stripe). Promotions currently run at no charge.
- Sending the promo emails (needs an email provider such as Resend) and the weekly send job.
- Distance-based targeting (needs geocoding); sponsored results currently match by search.
- Logo upload (owners paste an image link for now).
