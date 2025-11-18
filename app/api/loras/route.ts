import { NextResponse } from "next/server";
import {
  closeDatabase,
  getDatabaseInstance,
  getGlobalDatabaseInstance,
} from "@/lib/database";

export async function GET() {
  const db = getGlobalDatabaseInstance();
  try {
    const loras = db.prepare("SELECT * FROM loras ORDER BY name").all();
    return NextResponse.json(loras);
  } catch (error) {
    console.error("Failed to fetch loras:", error);
    return NextResponse.json({ error: "Failed to fetch loras" }, {
      status: 500,
    });
  } finally {
    closeDatabase(db);
  }
}

export async function POST(request: Request) {
  const { name } = await request.json();

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const db = getGlobalDatabaseInstance();
  try {
    const result = db.prepare("INSERT INTO loras (name) VALUES (?)").run(name);
    return NextResponse.json({ id: result.lastInsertRowid, name });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return NextResponse.json(
        { error: "LoRA with this name already exists" },
        { status: 409 },
      );
    }
    console.error("Failed to create lora:", error);
    return NextResponse.json({ error: "Failed to create lora" }, {
      status: 500,
    });
  } finally {
    closeDatabase(db);
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Get the lora ID from the name
  const globalDbForId = getGlobalDatabaseInstance();
  let lora: { id: number } | undefined;
  try {
    lora = globalDbForId.prepare("SELECT id FROM loras WHERE name = ?").get(
      name,
    ) as { id: number } | undefined;
  } finally {
    closeDatabase(globalDbForId);
  }

  if (!lora) {
    return NextResponse.json({ error: "LoRA not found" }, { status: 404 });
  }
  const loraId = lora.id;

  // First, update all folder-specific databases
  const globalDbForHistory = getGlobalDatabaseInstance();
  let folderPaths: { path: string }[];
  try {
    folderPaths = globalDbForHistory.prepare("SELECT path FROM folder_history")
      .all() as { path: string }[];
  } finally {
    closeDatabase(globalDbForHistory);
  }

  for (const folder of folderPaths) {
    const folderDb = getDatabaseInstance(folder.path);
    try {
      folderDb.prepare("DELETE FROM media_loras WHERE lora_id = ?").run(loraId);
    } catch (error) {
      console.error(
        `Failed to update lora association in ${folder.path}`,
        error,
      );
    } finally {
      closeDatabase(folderDb);
    }
  }

  // Then, delete from the global database
  const globalDb = getGlobalDatabaseInstance();
  try {
    const result = globalDb.prepare("DELETE FROM loras WHERE id = ?").run(
      loraId,
    );
    if (result.changes === 0) {
      return NextResponse.json({ error: "LoRA not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "LoRA deleted successfully" });
  } catch (error) {
    console.error("Failed to delete lora:", error);
    return NextResponse.json({ error: "Failed to delete lora" }, {
      status: 500,
    });
  } finally {
    closeDatabase(globalDb);
  }
}
