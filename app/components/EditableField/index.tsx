"use client";

import React, { useEffect, useRef, useState } from "react";
import { Copy, Edit } from "lucide-react";
import styles from "./style.module.scss";
import clsx from "clsx";
import { Button } from "@/components/ui/button";

interface EditableFieldProps {
  label: string;
  initialText: string | null | undefined;
  placeholder: string;
  onSave: (newText: string) => Promise<void>;
  isMultiline?: boolean;
  truncateLength?: number;
  showMoreClass?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({
  label,
  initialText,
  placeholder,
  onSave,
  isMultiline = false,
  truncateLength = 150,
  showMoreClass,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (isMultiline && inputRef.current instanceof HTMLTextAreaElement) {
        // Auto-resize textarea
        inputRef.current.style.height = "auto";
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      }
    }
  }, [isEditing, isMultiline]);

  const handleSave = async () => {
    if (text !== initialText) {
      await onSave(text);
    }
    setIsEditing(false);
  };

  const handleStartEditing = () => {
    setText(initialText || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isMultiline && e.key === "Enter" && e.shiftKey) {
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(initialText || "");
    // Consider adding a toast notification here for user feedback
  };

  const currentText = initialText || "";
  const shouldTruncate = isMultiline && !isExpanded &&
    currentText.length > truncateLength;
  const displayText = shouldTruncate
    ? `${currentText.substring(0, truncateLength)}...`
    : currentText;

  if (isEditing) {
    return (
      <div className={styles.container}>
        <label className={styles.label}>{label}</label>
        <div className={styles.editWrapper}>
          {isMultiline
            ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                placeholder={placeholder}
                className={`${styles.input} ${styles.textarea}`}
                rows={1}
              />
            )
            : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                placeholder={placeholder}
                className={styles.input}
              />
            )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.container}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <label className={styles.label}>{label}</label>
      <div
        className={clsx(styles.displayWrapper, {
          [styles.truncated]: shouldTruncate,
        })}
      >
        <div className={styles.displayText} onClick={handleStartEditing}>
          {displayText || (
            <span className={styles.placeholder}>{placeholder}</span>
          )}
        </div>
        {isHovering && (
          <div className={styles.hoverActions}>
            <button
              onClick={handleStartEditing}
              className={styles.actionButton}
            >
              <Edit size={16} />
            </button>
            <button onClick={handleCopy} className={styles.actionButton}>
              <Copy size={16} />
            </button>
          </div>
        )}
        {isMultiline && currentText.length > truncateLength && (
          <Button
            variant="link"
            className={clsx(
              styles.showMoreButton,
              "text-muted-foreground",
              showMoreClass,
            )}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Show less" : "Show more"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EditableField;
