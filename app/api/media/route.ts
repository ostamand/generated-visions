import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { closeDatabase, getDatabaseInstance } from "@/lib/database";
import { getSettings } from "@/lib/settings";
import Database from "better-sqlite3";

export async function DELETE(request: Request) {
  let db: Database.Database | undefined;
  try {
    const { relativePath } = await request.json();

    if (!relativePath) {
      return NextResponse.json({ error: "File path is required" }, {
        status: 400,
      });
    }

    const { imagePath: root } = getSettings();
    if (!root) {
      return NextResponse.json({ error: "Image path is not configured." }, {
        status: 500,
      });
    }

    const absolutePath = path.join(root, relativePath);

    try {
      await fs.unlink(absolutePath);
    } catch (error: unknown) {
      // If file doesn't exist, we can still try to delete metadata
      if ((error as { code?: string }).code !== "ENOENT") {
        throw error; // re-throw other errors
      }
      console.warn(
        `File not found, but attempting to delete metadata: ${absolutePath}`,
      );
    }

    db = getDatabaseInstance(root);
    const stmt = db.prepare("DELETE FROM images WHERE path = ?");
    stmt.run(relativePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return NextResponse.json({
      error: "Failed to delete file",
      details: errorMessage,
    }, { status: 500 });
  } finally {
    if (db) {
      closeDatabase(db);
    }
  }
}
