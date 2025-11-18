import { NextResponse } from "next/server";
import { closeDatabase, getGlobalDatabaseInstance } from "@/lib/database";
import { getSettings, removeFolderFromHistory } from "@/lib/settings";
import Database from "better-sqlite3";

export async function GET() {
  let db: Database.Database | undefined;
  try {
    db = getGlobalDatabaseInstance();
    const stmt = db.prepare(
      "SELECT path, last_accessed as last_imported_at FROM folder_history ORDER BY last_accessed DESC",
    );
    const history = stmt.all();
    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching folder history:", error);
    return NextResponse.json(
      { error: "Failed to fetch folder history" },
      { status: 500 },
    );
  } finally {
    if (db) {
      closeDatabase(db);
    }
  }
}

export async function DELETE(request: Request) {
  const settings = getSettings();
  if (settings.demo) {
    return NextResponse.json(
      { error: "Cannot modify data in demo mode" },
      { status: 403 },
    );
  }
  try {
    const { path } = await request.json();
    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    removeFolderFromHistory(path);

    return NextResponse.json({
      message: "Folder history deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting folder history:", error);
    return NextResponse.json(
      { error: "Failed to delete folder history" },
      { status: 500 },
    );
  }
}
