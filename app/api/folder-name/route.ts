import { NextRequest, NextResponse } from "next/server";
import { getDatabaseInstance } from "@/lib/database";
import { getSettings } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const folderPath = searchParams.get("path");

  if (!folderPath) {
    return NextResponse.json({ error: "Folder path is required" }, {
      status: 400,
    });
  }

  try {
    const settings = getSettings();
    const galleryRoot = settings.imagePath;

    if (!galleryRoot) {
      return NextResponse.json({ error: "Image path not configured" }, {
        status: 500,
      });
    }

    const db = getDatabaseInstance(galleryRoot);
    const stmt = db.prepare(
      "SELECT display_name FROM folder_display_names WHERE path = ?",
    );
    const result = stmt.get(folderPath) as { display_name: string } | undefined;
    db.close();

    if (result) {
      return NextResponse.json({ displayName: result.display_name });
    } else {
      return NextResponse.json({ displayName: null });
    }
  } catch (error) {
    console.error("Error fetching folder display name:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  const settings = getSettings();
  if (settings.demo) {
    return NextResponse.json(
      { error: "Cannot modify data in demo mode" },
      { status: 403 },
    );
  }
  const { path: folderPath, displayName } = await req.json();

  if (!folderPath || displayName === undefined) {
    return NextResponse.json({
      error: "Folder path and display name are required",
    }, { status: 400 });
  }

  try {
    const galleryRoot = settings.imagePath;

    if (!galleryRoot) {
      return NextResponse.json({ error: "Image path not configured" }, {
        status: 500,
      });
    }
    const db = getDatabaseInstance(galleryRoot);
    const stmt = db.prepare(
      "INSERT INTO folder_display_names (path, display_name) VALUES (?, ?) ON CONFLICT(path) DO UPDATE SET display_name = EXCLUDED.display_name",
    );
    stmt.run(folderPath, displayName);
    db.close();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting folder display name:", error);
    return NextResponse.json({ error: "Internal Server Error" }, {
      status: 500,
    });
  }
}
