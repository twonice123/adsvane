"use client";
import { createBrowserClient } from "@supabase/ssr";

// Supabase in the browser, signed in as the visitor. Used for big uploads
// (videos) that go straight to storage instead of through our server.
let client: ReturnType<typeof createBrowserClient> | null = null;
export function browserClient() {
  if (!client) client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  return client;
}
