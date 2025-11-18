"use client";

import styles from "./SelectionDisplay.style.module.scss";
import { X } from "lucide-react";

interface Folder {
  path: string;
  displayName: string;
}

interface SelectionDisplayProps {
  selectedFolderObjects: Folder[];
  onRemoveFolder: (folder: string) => void;
  onClear: () => void;
}

const SelectionDisplay = ({
  selectedFolderObjects,
  onRemoveFolder,
  onClear,
}: SelectionDisplayProps) => {
  if (selectedFolderObjects.length === 0) {
    return (
      <div className={styles.container}>
        <span className={styles.allImagesLabel}>All Images</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Selected</span>
        <button onClick={onClear} className={styles.clearButton}>
          Clear all
        </button>
      </div>
      <div className={styles.pillsContainer}>
        {selectedFolderObjects.map((folder) => (
          <div key={folder.path} className={styles.pill}>
            <span className={styles.pillLabel}>{folder.displayName}</span>
            <button
              onClick={() =>
                onRemoveFolder(folder.path)}
              className={styles.removeButton}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SelectionDisplay;
