"use client";

import styles from "./ViewToggle.style.module.scss";

export type View = "all" | "starred";

interface ViewToggleProps {
  activeView: View;
  onViewChange: (view: View) => void;
  counts: {
    all: number;
    starred: number;
  };
}

const ViewToggle = ({ activeView, onViewChange, counts }: ViewToggleProps) => {
  return (
    <div className={styles.container}>
      <button
        className={`${styles.pill} ${
          activeView === "all" ? styles.active : ""
        }`}
        onClick={() => onViewChange("all")}
      >
        All Images <span className={styles.count}>{counts.all}</span>
      </button>
      <button
        className={`${styles.pill} ${
          activeView === "starred" ? styles.active : ""
        }`}
        onClick={() => onViewChange("starred")}
        disabled={counts.starred === 0}
      >
        Starred <span className={styles.count}>{counts.starred}</span>
      </button>
    </div>
  );
};

export default ViewToggle;
