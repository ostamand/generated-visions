import { NextResponse } from "next/server";
import {
  closeDatabase,
  getDatabaseInstance,
  getGlobalDatabaseInstance,
} from "@/lib/database";

export async function GET() {
  const db = getGlobalDatabaseInstance();
  try {
    const models = db.prepare("SELECT * FROM models ORDER BY name").all();
    return NextResponse.json(models);
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, {
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
    const result = db.prepare("INSERT INTO models (name) VALUES (?)").run(name);
    return NextResponse.json({ id: result.lastInsertRowid, name });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return NextResponse.json(
        { error: "Model with this name already exists" },
        { status: 409 },
      );
    }
    console.error("Failed to create model:", error);
    return NextResponse.json({ error: "Failed to create model" }, {
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

  // Get the model ID from the name
  const globalDbForId = getGlobalDatabaseInstance();
  let model: { id: number } | undefined;
  try {
    model = globalDbForId.prepare("SELECT id FROM models WHERE name = ?").get(
      name,
    ) as { id: number } | undefined;
  } finally {
    closeDatabase(globalDbForId);
  }

  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }
  const modelId = model.id;

  // First, update all folder-specific databases
  const globalDbForHistory = getGlobalDatabaseInstance();
  let folderPaths: { path: string }[];
  try {
    folderPaths = globalDbForHistory.prepare("SELECT path FROM folder_history")
      .all() as { path:string }[];
  } finally {
    closeDatabase(globalDbForHistory);
  }

  for (const folder of folderPaths) {
    const folderDb = getDatabaseInstance(folder.path);
    try {
      folderDb.prepare("UPDATE images SET model_id = NULL WHERE model_id = ?")
        .run(modelId);
    } catch (error) {
      console.error(
        `Failed to update model association in ${folder.path}`,
        error,
      );
      // We can decide if we want to stop or continue. For now, let's continue.
    } finally {
      closeDatabase(folderDb);
    }
  }

  // Then, delete from the global database
  const globalDb = getGlobalDatabaseInstance();
  try {
    const result = globalDb.prepare("DELETE FROM models WHERE id = ?").run(
      modelId,
    );
    if (result.changes === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Model deleted successfully" });
  } catch (error) {
    console.error("Failed to delete model:", error);
    return NextResponse.json({ error: "Failed to delete model" }, {
      status: 500,
    });
  } finally {
    closeDatabase(globalDb);
  }
}
