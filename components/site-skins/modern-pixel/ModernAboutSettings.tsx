import Link from "next/link";
import PixelCornerMarks from "./PixelCornerMarks";
import styles from "./about.module.css";

export default function ModernAboutSettings({ paragraphs }: { paragraphs: readonly string[] }) {
  return <div className={styles.page} data-about-skin="modern_pixel" data-moon-scene>
    <PixelCornerMarks />
    <div className={styles.book}>
      <div className={styles.pages}>
        <article className={`${styles.sheet} ${styles.leftPage}`}>
          <h1>关于小时代</h1>
          <p className={styles.greeting}>你好，欢迎来到小时代。</p>
          <div className={styles.prose}>
            {paragraphs.slice(0, 6).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </article>
        <article className={`${styles.sheet} ${styles.rightPage}`} aria-label="关于小时代，续页">
          <div className={styles.prose}>
            {paragraphs.slice(6).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <div className={styles.quote}>
            <p>用户不是来消费内容。<br />而是来住下。</p>
          </div>
        </article>
      </div>
    </div>
    <nav className={styles.links} aria-label="关于网站后续阅读">
      <Link href="/home">回到首页</Link>
      <Link href="/space">去深夜广场看看</Link>
    </nav>
  </div>;
}
