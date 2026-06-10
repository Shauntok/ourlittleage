export type TargetInfo = {
  title: string;
  desc: string;
  href: string;
  authorId?: string;
  authorRole?: string;
  authorName?: string;
  parentTitle?: string;
  parentHref?: string;
  canHidePost?: boolean;
  canHideComment?: boolean;
};

export type FilterType =
  | "active"
  | "all"
  | "pending"
  | "reviewed"
  | "resolved"
  | "rejected"
  | "malicious";