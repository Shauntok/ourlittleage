import Link from "next/link";
import LikeButton from "@/components/LikeButton";

type Props = {
  postId: number;
  authorId: string;
  href: string;
  likeCount: number;
  commentCount: number;
};

export default function PostQuickActions({
  postId,
  authorId,
  href,
  likeCount,
  commentCount,
}: Props) {
  return (
    <div className="mt-5 flex flex-wrap gap-2 md:mt-6">
      <LikeButton
        postId={postId}
        authorId={authorId}
        initialCount={likeCount}
        compact
      />

      <Link
        href={`${href}#comments`}
        className="rounded-full border border-blue-500/20 bg-blue-500/[0.06] px-3 py-1 text-xs text-blue-100/55 transition hover:border-blue-400/30 hover:text-blue-100"
      >
        评论 {commentCount}
      </Link>
    </div>
  );
}