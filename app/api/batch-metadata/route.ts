import { NextRequest, NextResponse } from "next/server";
import { getDatabaseInstance, getGlobalDatabaseInstance } from "@/lib/database";
import { getSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const settings = getSettings();
  if (settings.demo) {
    return NextResponse.json(
      { error: "Cannot modify data in demo mode" },
      { status: 403 },
    );
  }
  try {
    const body = await req.json();
    const {
      mediaIds,
      metadata,
    }: { mediaIds: string[]; metadata: { model?: string; lora?: string } } =
      body;

    if (!mediaIds || mediaIds.length === 0 || !metadata) {
      return NextResponse.json(
        { error: "Missing mediaIds or metadata" },
        { status: 400 },
      );
    }

    const { imagePath } = getSettings();
    if (!imagePath) {
      return NextResponse.json(
        { error: "Image path is not configured." },
        { status: 500 },
      );
    }

    const galleryDb = getDatabaseInstance(imagePath);
    const globalDb = getGlobalDatabaseInstance();

    if (metadata.model) {
      const model = globalDb
        .prepare("SELECT id FROM models WHERE name = ?")
        .get(metadata.model) as { id: number } | undefined;

      if (!model) {
        return NextResponse.json(
          { error: `Model not found: ${metadata.model}` },
          { status: 404 },
        );
      }

      const updateStmt = galleryDb.prepare(
        "UPDATE images SET model_id = ? WHERE path = ?",
      );
      const transaction = galleryDb.transaction((ids: string[]) => {
        for (const id of ids) {
          updateStmt.run(model.id, id);
        }
      });

      transaction(mediaIds);
    } else if (metadata.lora) {
      const lora = globalDb
        .prepare("SELECT id FROM loras WHERE name = ?")
        .get(metadata.lora) as { id: number } | undefined;

      if (!lora) {
        return NextResponse.json(
          { error: `LoRA not found: ${metadata.lora}` },
          { status: 404 },
        );
      }

      const insertStmt = galleryDb.prepare(
        "INSERT OR IGNORE INTO media_loras (media_path, lora_id) VALUES (?, ?)",
      );
      const transaction = galleryDb.transaction((ids: string[]) => {
        for (const id of ids) {
          insertStmt.run(id, lora.id);
        }
      });
      transaction(mediaIds);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to batch update metadata:", error);
    return NextResponse.json(
      { error: "Failed to batch update metadata" },
      { status: 500 },
    );
  }
}
