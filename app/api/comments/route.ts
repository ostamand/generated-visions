import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { getDatabaseInstance } from "@/lib/database";
import { Comment } from "@/types/gallery";

// GET comments for a media item
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mediaPath = searchParams.get("mediaPath");

  if (!mediaPath) {
    return NextResponse.json(
      { error: "mediaPath parameter is required" },
      { status: 400 },
    );
  }

  const settings = getSettings();
  if (!settings.imagePath) {
    return NextResponse.json(
      { error: "Gallery root not configured" },
      { status: 500 },
    );
  }

  try {
    const db = getDatabaseInstance(settings.imagePath);
    const stmt = db.prepare(
      "SELECT * FROM comments WHERE media_path = ? ORDER BY created_at DESC",
    );
    const comments = stmt.all(mediaPath) as
      & Omit<Comment, "created_at" | "updated_at">
      & { created_at: string; updated_at: string }[];

    const formattedComments = comments.map((comment) => ({
      ...comment,
      created_at: new Date(comment.created_at + "Z").getTime(),
      updated_at: new Date(comment.updated_at + "Z").getTime(),
    }));

    return NextResponse.json(formattedComments);
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch comments", details: errorMessage },
      { status: 500 },
    );
  }
}

// POST a new comment
export async function POST(request: Request) {
  const { mediaPath, text } = await request.json();

  if (!mediaPath || !text) {
    return NextResponse.json(
      { error: "mediaPath and text are required" },
      { status: 400 },
    );
  }

  const settings = getSettings();
  if (!settings.imagePath) {
    return NextResponse.json(
      { error: "Gallery root not configured" },
      { status: 500 },
    );
  }

  try {
    const db = getDatabaseInstance(settings.imagePath);
    const stmt = db.prepare(
      "INSERT INTO comments (media_path, text) VALUES (?, ?)",
    );
    const result = stmt.run(mediaPath, text);

    const newCommentStmt = db.prepare("SELECT * FROM comments WHERE id = ?");
    const newComment = newCommentStmt.get(result.lastInsertRowid) as
      & Omit<Comment, "created_at" | "updated_at">
      & { created_at: string; updated_at: string };

    const formattedComment = {
      ...newComment,
      created_at: new Date(newComment.created_at + "Z").getTime(),
      updated_at: new Date(newComment.updated_at + "Z").getTime(),
    };

    return NextResponse.json(formattedComment, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to create comment", details: errorMessage },
      { status: 500 },
    );
  }
}

// PUT (update) a comment
export async function PUT(request: Request) {
  const { id, text } = await request.json();

  if (!id || text === undefined) {
    return NextResponse.json(
      { error: "id and text are required" },
      { status: 400 },
    );
  }

  const settings = getSettings();
  if (!settings.imagePath) {
    return NextResponse.json(
      { error: "Gallery root not configured" },
      { status: 500 },
    );
  }

  try {
    const db = getDatabaseInstance(settings.imagePath);
    const stmt = db.prepare("UPDATE comments SET text = ? WHERE id = ?");
    const result = stmt.run(text, id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const updatedCommentStmt = db.prepare(
      "SELECT * FROM comments WHERE id = ?",
    );
    const updatedComment = updatedCommentStmt.get(id) as
      & Omit<Comment, "created_at" | "updated_at">
      & { created_at: string; updated_at: string };

    const formattedComment = {
      ...updatedComment,
      created_at: new Date(updatedComment.created_at + "Z").getTime(),
      updated_at: new Date(updatedComment.updated_at + "Z").getTime(),
    };

    return NextResponse.json(formattedComment);
  } catch (error) {
    console.error("Failed to update comment:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update comment", details: errorMessage },
      { status: 500 },
    );
  }
}

// DELETE a comment
export async function DELETE(request: Request) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const settings = getSettings();
  if (!settings.imagePath) {
    return NextResponse.json(
      { error: "Gallery root not configured" },
      { status: 500 },
    );
  }

  try {
    const db = getDatabaseInstance(settings.imagePath);
    const stmt = db.prepare("DELETE FROM comments WHERE id = ?");
    const result = stmt.run(id);

    if (result.changes === 0) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete comment:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to delete comment", details: errorMessage },
      { status: 500 },
    );
  }
}
