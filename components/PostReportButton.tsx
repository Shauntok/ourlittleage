"use client";

import ReportButton from "@/components/ReportButton";

type Props = {
  postId: string;
  authorId?: string;
};

export default function PostReportButton({ postId, authorId }: Props) {
  return (
    <ReportButton
      targetType="post"
      targetId={postId}
      authorId={authorId}
      compact
    />
  );
}