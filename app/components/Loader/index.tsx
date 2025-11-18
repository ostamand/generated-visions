import styles from "./style.module.scss";

export function Loader() {
  return (
    <div className={styles.loaderOverlay}>
      <img
        src="/image-no-bkg.png"
        className={styles.pulsingIcon}
        alt="Loading indicator"
      />
    </div>
  );
}
