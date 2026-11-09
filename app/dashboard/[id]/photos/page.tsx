import { redirect } from "next/navigation";

// Photos are managed right on the dashboard now.
export default async function Photos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/${id}#photos`);
}
