"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Heart, PenLine, Sparkles } from "lucide-react";
import TranslatedText from "@/components/TranslatedText";
import RoomStatusButton from "@/components/RoomStatusButton";
import RoomAvatarEditor from "@/components/RoomAvatarEditor";
import ResidentRelationshipControls from "@/components/relationships/ResidentRelationshipControls";
import { useRoomViewSkin } from "@/components/RoomViewSkinProvider";
import styles from "./UserRoomClient.module.css";

const SHOW_RESIDENT_TITLE = false;
function getImages(content: string) {
  return Array.from(content.matchAll(/!\[[^\]]*\]\((.*?)\)/g))
    .map((match) => match[1])
    .slice(0, 3);
}

function getExcerpt(content: string) {
  return content
    .replace(/!\[[^\]]*\]\(.*?\)/g, "")
    .trim()
    .slice(0, 140);
}

function getPostTitle(post: any) {
  if (post.title) return post.title;

  const date = new Date(
    post.published_at || post.created_at
  ).toLocaleDateString("zh-CN");

  return `${date} 的日记`;
}

function PaintedCorners() {
  return (
    <>
      {(["top-left", "top-right", "bottom-right", "bottom-left"] as const).map((corner) => (
        <span key={corner} className={styles.paintedCorner} data-corner={corner} aria-hidden="true" />
      ))}
    </>
  );
}

export default function UserRoomClient({
  profile,
  activeTab,
  residentTitle,
  levelProgress,
  joinedDays,
  isStatusExpired,
  visibleBadges,
  isOwnRoom = null,
  publicPosts,
  publicDiaries,
  publicArticles,
  likeCountMapData,
  commentCountMapData,
}: any) {
  const likeCountMap = new Map<number, number>(likeCountMapData);
  const commentCountMap = new Map<number, number>(commentCountMapData);

  const [visiblePostCount, setVisiblePostCount] = useState(4);
  const [badgesExpanded, setBadgesExpanded] = useState(false);
  const { pixelTime } = useRoomViewSkin();

  const profilePath = `/u/${encodeURIComponent(profile.username)}`;

  const filteredPosts = activeTab === "diary" ? publicDiaries : activeTab === "article" ? publicArticles : publicPosts;
  const visiblePosts = filteredPosts.slice(0, visiblePostCount);
  const hasMorePosts = visiblePostCount < filteredPosts.length;

  function MetaPills({ post }: { post: any }) {
    return (
      <div className="mt-3 flex flex-wrap gap-2 md:mt-5">
        <span data-room-skin-meta className={`${styles.metaPill} px-3 py-1 text-xs`}>
          喜欢 {likeCountMap.get(post.id) || 0}
        </span>

        <span data-room-skin-meta className={`${styles.metaPill} px-3 py-1 text-xs`}>
          评论 {commentCountMap.get(post.id) || 0}
        </span>
      </div>
    );
  }

  function BadgePill({ item }: any) {
    const badge = item.badges;
    if (!badge) return null;

    return (
      <div
        data-room-skin-badge
        className={styles.badgePill}
        title={badge.description || badge.name}
      >
        <span className="safe-text">{badge.name}</span>
      </div>
    );
  }

  return (
    <main data-resident-room data-room-view-skin="modern_pixel" data-nav-scene="room" data-pixel-room-time={pixelTime} className={`${styles.page} min-h-screen overflow-x-hidden px-4 pb-20 pt-5 text-white md:px-10 md:pb-24 md:pt-0`}>
      <div data-room-scene-backdrop className={styles.sceneBackdrop} aria-hidden="true" />

      <div data-room-skin-shell className={`${styles.pageShell} mx-auto w-full max-w-[1456px]`}>

        <section data-room-skin-panel className={`${styles.profilePanel} min-w-0`}>
          <div data-room-skin-cover className={`${styles.cover} relative w-full`}>
            <PaintedCorners />
            {profile.banner_url ? (
              <>
                <div className={styles.coverBlur} style={{ backgroundImage: `url(${profile.banner_url})` }} aria-hidden="true" />
                <img
                  src={profile.banner_url}
                  alt={`${profile.username}的房间横幅`}
                  className={styles.coverImage}
                />
              </>
            ) : (
              <div className={`${styles.roomBackdrop} h-full w-full`} />
            )}
            <div className={styles.statusSlot}>
              <RoomStatusButton
                ownerId={profile.id}
                initialMoodEmoji={!isStatusExpired ? profile.mood_emoji : null}
                initialStatusMessage={!isStatusExpired ? profile.status_message : null}
              />
            </div>
          </div>

          <div data-room-skin-profile-body id="about-user" className={`${styles.profileBody} relative min-w-0 scroll-mt-28`}>
            <PaintedCorners />
            <div data-room-skin-intro className={styles.profileIntro}>
              <RoomAvatarEditor
                profileId={profile.id}
                username={profile.username}
                initialAvatarUrl={profile.avatar_url}
              />

              <div data-room-skin-details className={`${styles.profileDetails} min-w-0`}>
                {SHOW_RESIDENT_TITLE && (
                  <div className={`${styles.statusChip} inline-flex max-w-full items-center gap-2 px-3 py-1.5`}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#a6dfca]" />
                    <p className="safe-text truncate text-xs">{residentTitle}</p>
                  </div>
                )}
                <h1 className="safe-text mt-3 line-clamp-2 break-all text-3xl font-semibold [overflow-wrap:anywhere] md:mt-2 md:text-5xl">
                  {profile.username}
                </h1>
                <p className={`${styles.bio} safe-pre mt-3 text-sm leading-7 md:text-base md:leading-8`}>
                  {profile.bio || "这个房间暂时还很安静。"}
                </p>
              </div>

              <ResidentRelationshipControls
                residentId={profile.id}
                username={profile.username}
              />
            </div>
          </div>
        </section>

        <div className={styles.roomColumns}>
          <section data-room-skin-profile-body className={`${styles.residentInfoPanel} min-w-0`} aria-label="居民信息">
            <PaintedCorners />
            <h2 className={styles.panelHeading}>居民信息</h2>
            {profile.show_joined_days && (
              <p data-room-joined-days className={styles.residenceLine}>
                <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0" />
                已在小时代居住 {joinedDays} 天。
              </p>
            )}
            {(profile.show_level || profile.show_exp || profile.show_trust_score) && (
              <div data-room-skin-stats className={styles.profileStats}>
                {profile.show_level && (
                  <div data-room-skin-stat className={styles.profileStatCard} data-accent="teal">
                    <PenLine aria-hidden="true" className="h-7 w-7 shrink-0" />
                    <span>等级</span>
                    <strong>{profile.level || 1}</strong>
                  </div>
                )}
                {profile.show_exp && (
                  <div data-room-skin-stat className={styles.profileStatCard} data-accent="violet">
                    <Sparkles aria-hidden="true" className="h-7 w-7 shrink-0" />
                    <span>留下的光</span>
                    <strong>{levelProgress.current.toFixed(2)}</strong>
                  </div>
                )}
                {profile.show_trust_score && (
                  <div data-room-skin-stat className={styles.profileStatCard} data-accent="rose">
                    <Heart aria-hidden="true" className="h-7 w-7 shrink-0" />
                    <span>社区信任</span>
                    <strong>{Number(profile.trust_score || 0).toFixed(2)}</strong>
                  </div>
                )}
              </div>
            )}

            {profile.show_exp && (
              <div data-room-skin-growth className={styles.growthSection}>
                <div className={styles.growthHeading}>
                  <strong>成长进度</strong>
                  <span>{levelProgress.text}</span>
                </div>
                <div className={styles.growthBarRow}>
                  <div data-room-skin-progress-track className={styles.progressTrack}>
                    <div
                      data-room-skin-progress-fill
                      className={styles.progressFill}
                      style={{ width: `${Math.min(levelProgress.percent, 100)}%` }}
                    />
                  </div>
                  <span className={styles.progressPercent}>
                    {Math.round(Math.min(levelProgress.percent, 100))}%
                  </span>
                </div>
              </div>
            )}

            {visibleBadges.length > 0 && (
              <div data-room-skin-badges id="badges" className={`${styles.badgeSection} scroll-mt-28`}>
                <h2>我的徽章</h2>
                <div className={`${styles.badgeGrid} ${isOwnRoom === false && !badgesExpanded ? styles.badgeGridCollapsed : ""}`}>
                  {Array.from({ length: 9 }, (_, index) => {
                    const item = visibleBadges[index];
                    return item ? <BadgePill key={item.id} item={item} /> : (
                      <div key={`empty-${index}`} className={styles.badgeEmpty} aria-label="尚未获得徽章">—</div>
                    );
                  })}
                </div>
                {isOwnRoom === false && visibleBadges.length > 3 && (
                  <button type="button" className={styles.badgeExpand} aria-expanded={badgesExpanded} onClick={() => setBadgesExpanded((open) => !open)}>
                    {badgesExpanded ? "收起徽章 ↑" : "展开徽章 ↓"}
                  </button>
                )}
              </div>
            )}
        </section>

        <section
          id="public-writings"
          className={`${styles.writingsPanel} scroll-mt-28`}
        >
          <PaintedCorners />
          <div className={styles.writingsHeading}>
            <h2 className={styles.panelHeading}>房间作品</h2>
            <div className={styles.tabs}>
              <Link
                href={`${profilePath}?tab=all#public-writings`}
                data-room-skin-tab
                className={`${styles.tab} inline-flex items-center px-4 py-2 text-sm transition ${activeTab === "all" ? styles.tabActive : ""}`}
              >
                全部 {publicPosts.length}
              </Link>

              <Link
                href={`${profilePath}?tab=article#public-writings`}
                data-room-skin-tab
                className={`${styles.tab} inline-flex items-center px-4 py-2 text-sm transition ${activeTab === "article" ? styles.tabActive : ""}`}
              >
                文章 {publicArticles.length}
              </Link>

              <Link
                href={`${profilePath}?tab=diary#public-writings`}
                data-room-skin-tab
                className={`${styles.tab} inline-flex items-center px-4 py-2 text-sm transition ${activeTab === "diary" ? styles.tabActive : ""}`}
              >
                日记 {publicDiaries.length}
              </Link>
            </div>
          </div>

          {publicPosts.length === 0 && (
            <div data-room-skin-empty className={`${styles.emptyState} p-7 md:p-10`}>
              这个房间暂时还没有可以阅读的作品。
            </div>
          )}

          {visiblePosts.length > 0 && (
            <div className={styles.storiesGrid}>
              {visiblePosts.map((post: any) => {
                const imageUrl = getImages(post.content || "")[0];
                const excerpt = getExcerpt(post.content || "");
                const title = getPostTitle(post);
                const isDiary = post.type === "diary";
                return (
                  <Link
                    key={post.id}
                    href={isDiary ? `/diary/${post.id}` : `/articles/${post.slug}`}
                    data-room-skin-story
                    className={`${styles.storyCard} group block min-w-0 overflow-hidden p-5 backdrop-blur-xl md:p-7`}
                  >
                    <PaintedCorners />
                    <p className={`${styles.storyMeta} text-xs`}>
                      {isDiary ? "日记" : "文章"} · {new Date(post.published_at || post.created_at).toLocaleString("zh-CN")}{post.visibility === "neighbors" ? " · 🏠 仅邻居可见" : ""}
                    </p>
                    <h3 className={`${styles.storyTitle} safe-text mt-3 line-clamp-2 break-all text-xl font-light [overflow-wrap:anywhere] md:mt-4 md:text-2xl`}>
                      <TranslatedText text={title} />
                    </h3>
                    {imageUrl && <img src={imageUrl} alt={isDiary ? "日记配图" : "文章配图"} className="mt-4" />}
                    {excerpt && (
                      <p className={`${styles.storyExcerpt} safe-pre mt-4 line-clamp-3 text-sm leading-7 md:line-clamp-4`}>
                        <TranslatedText text={`${excerpt}...`} />
                      </p>
                    )}
                    <MetaPills post={post} />
                    <p className={`${styles.postAction} mt-4 text-sm`}>
                      {isDiary ? "翻开这一天" : "阅读这篇文章"} →
                    </p>
                  </Link>
                );
              })}
              {hasMorePosts && (
                <div className={styles.loadMoreRow}>
                  <button
                    type="button"
                    onClick={() => setVisiblePostCount((count) => count + 4)}
                    data-room-skin-load-more
                    className={`${styles.loadMore} px-7 py-3 text-sm transition`}
                  >
                    加载更多作品
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
        </div>
      </div>
    </main>
  );
}
