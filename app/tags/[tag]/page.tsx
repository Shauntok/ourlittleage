import { redirect } from "next/navigation";

type Props = { params: Promise<{ tag: string }> };

// The existing tag URL shares the public search page's pagination and skins.
export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  let decoded = tag;
  try { decoded = decodeURIComponent(tag); } catch { /* Keep malformed legacy links harmless. */ }
  const selected = Array.from(decoded.trim()).slice(0, 20).join("");
  if (!selected) redirect("/search?type=article");
  redirect(`/search?type=article&tag=${encodeURIComponent(selected)}`);
}
