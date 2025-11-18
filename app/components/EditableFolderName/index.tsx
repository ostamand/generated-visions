"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./style.module.scss";

interface EditableFolderNameProps {
  folderPath: string;
  initialDisplayName: string;
}

export default function EditableFolderName({
  folderPath,
  initialDisplayName,
}: EditableFolderNameProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = async () => {
    setIsEditing(false);
    if (displayName.trim() === "") {
      setDisplayName(initialDisplayName); // Revert if empty
      return;
    }

    if (displayName === initialDisplayName) return; // No change

    try {
      await fetch("/api/folder-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: folderPath, displayName }),
      });
      // Optimistically updated, no need to refetch
    } catch (error) {
      console.error("Failed to update folder name:", error);
      setDisplayName(initialDisplayName); // Revert on error
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    }
    if (e.key === "Escape") {
      setDisplayName(initialDisplayName);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={styles.folderNameContainer}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing
        ? (
          <input
            ref={inputRef}
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={styles.folderNameInput}
          />
        )
        : <h2 className={styles.folderNameText}>{displayName}</h2>}
    </div>
  );
}
