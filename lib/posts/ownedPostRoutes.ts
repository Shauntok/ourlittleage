type OwnedPostRouteInput = {
  id: number;
  slug: string;
  type: "diary" | "article";
  status: string;
};

export function getOwnedPostDestination(post: OwnedPostRouteInput) {
  if (post.type === "diary") {
    return post.status === "draft" ? `/diary/${post.id}/edit` : `/diary/${post.id}`;
  }

  return post.status === "draft"
    ? `/articles/edit/${post.id}`
    : `/articles/${post.slug}`;
}
