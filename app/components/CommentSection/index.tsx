"use client";

import React, { useEffect, useState } from "react";
import { Comment } from "@/types/gallery";
import styles from "./style.module.scss";
import { formatTimestamp } from "@/lib/time";
import EditableField from "../EditableField";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommentItemProps {
  comment: Comment;
  onUpdate: (id: number, text: string) => Promise<void>;
  onDelete: (id: number) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onUpdate,
  onDelete,
}) => {
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      onDelete(comment.id);
    }
  };

  return (
    <div
      className={styles.commentItem}
    >
      <div className={styles.commentHeader}>
        <span className={styles.commentTimestamp}>
          {formatTimestamp(comment.created_at)}
        </span>
        <div className={styles.commentActions}>
          <button onClick={handleDelete} className={styles.actionButton}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <EditableField
        label=""
        initialText={comment.text}
        placeholder="Enter a comment..."
        onSave={async (newText) => await onUpdate(comment.id, newText)}
        isMultiline={true}
      />
    </div>
  );
};

interface CommentSectionProps {
  mediaPath: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ mediaPath }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewCommentBox, setShowNewCommentBox] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/comments?mediaPath=${encodeURIComponent(mediaPath)}`,
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Failed to fetch comments: ${errorData.details || errorData.error}`,
          );
        }
        const data = await response.json();
        setComments(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [mediaPath]);

  const handleCreateComment = async () => {
    if (!newCommentText.trim()) return;

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaPath, text: newCommentText }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to create comment: ${errorData.details || errorData.error}`,
        );
      }
      const newComment = await response.json();
      setComments([newComment, ...comments]);
      setNewCommentText("");
      setShowNewCommentBox(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateComment = async (id: number, text: string) => {
    try {
      const response = await fetch("/api/comments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, text }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to update comment: ${errorData.details || errorData.error}`,
        );
      }
      const updatedComment = await response.json();
      setComments(
        comments.map((c) => (c.id === id ? updatedComment : c)),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteComment = async (id: number) => {
    try {
      const response = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Failed to delete comment: ${errorData.details || errorData.error}`,
        );
      }
      setComments(comments.filter((c) => c.id !== id));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className={styles.commentSection}>
      <h4 className={styles.title}>Comments</h4>
      <div className={styles.commentsContainer}>
        {!showNewCommentBox && (
          <Button
            onClick={() => setShowNewCommentBox(true)}
            className={styles.addCommentButton}
          >
            Add Comment
          </Button>
        )}
        {showNewCommentBox && (
          <div className={styles.newCommentBox}>
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Write a comment..."
              className={styles.newCommentTextarea}
              rows={3}
            />
            <div className={styles.newCommentActions}>
              <Button
                variant="secondary"
                onClick={() => setShowNewCommentBox(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateComment}
              >
                Save
              </Button>
            </div>
          </div>
        )}
        <div className={styles.commentList}>
          {isLoading ? <p>Loading comments...</p> : comments.length > 0
            ? (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onUpdate={handleUpdateComment}
                  onDelete={handleDeleteComment}
                />
              ))
            )
            : (
              !showNewCommentBox && (
                <p className={styles.noComments}>No comments yet.</p>
              )
            )}
        </div>
      </div>
    </div>
  );
};

export default CommentSection;
