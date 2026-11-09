import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business } from "@/lib/data";
import { Logo } from "@/app/components/Logo";
import ReviewForm from "./ReviewForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("name").eq("slug", slug).maybeSingle();
  return { title: data ? `Review ${data.name}` : "Leave a review", robots: { index: false } };
}

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("businesses").select("id,slug,name,logo_url,city,state").eq("slug", slug).maybeSingle();
  const biz = data as Pick<Business, "id" | "slug" | "name" | "logo_url" | "city" | "state"> | null;
  if (!biz) notFound();
  return (
    <div className="wrap narrow" style={{ margin: "26px auto 50px" }}>
      <div className="card" style={{ padding: 26 }}>
        <div className="head" style={{ marginTop: 0 }}>
          <Logo name={biz.name} url={biz.logo_url} />
          <div>
            <p className="eyebrow">Leave a review</p>
            <h2 style={{ margin: 0 }}>How was your visit to {biz.name}?</h2>
          </div>
        </div>
        <ReviewForm slug={biz.slug} name={biz.name} />
      </div>
    </div>
  );
}
