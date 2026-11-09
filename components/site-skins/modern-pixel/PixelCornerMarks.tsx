import styles from "./PixelCornerMarks.module.css";

export default function PixelCornerMarks() {
  return <span className={styles.marks} aria-hidden="true"><i /><i /><i /><i /></span>;
}
