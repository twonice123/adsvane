import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { memberName, memberPosts } from "@/lib/member";
import Gallery from "@/app/components/Gallery";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { title: "Not found" };
  const supabase = await createClient();
  return { title: `${await memberName(supabase, id)}'s reposts`, robots: { index: false } };
}

// Someone's public page: the photos they reposted.
export default async function Member({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [name, posts] = await Promise.all([memberName(supabase, id), memberPosts(supabase, id, "reposts", user?.id || null)]);
  return (
    <div className="wrap narrow2" style={{ margin: "22px auto 44px" }}>
      <div className="me-top">
        <span className="me-av">{name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h1>{name}</h1>
          <p className="muted" style={{ margin: 0 }}>{posts.length} repost{posts.length === 1 ? "" : "s"}</p>
        </div>
      </div>
      <nav className="me-tabs" aria-label="Photos"><span className="on">Reposts</span></nav>
      <Gallery photos={posts} loginNext={`/u/${id}`} empty={<p className="muted me-empty">{name} hasn&apos;t reposted anything yet.</p>} />
    </div>
  );
}
