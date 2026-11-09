import styles from "./classic-room-skin.module.css";
import navbarStyles from "./classic-navbar.module.css";

export default function ClassicRoomSkinStyles() {
  return (
    <>
      <span className={styles.loaded} aria-hidden="true" />
      <span className={navbarStyles.loaded} aria-hidden="true" />
    </>
  );
}
