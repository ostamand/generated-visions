import { NextResponse } from "next/server";
import { closeDatabase, getDatabaseInstance } from "@/lib/database";
import { getSettings } from "@/lib/settings";

export async function POST(request: Request) {
  const settings = getSettings();
  if (settings.demo) {
    return NextResponse.json(
      { error: "Cannot modify data in demo mode" },
      { status: 403 },
    );
  }
  try {
    const {
      imagePath,
      hidden,
      starred,
      prompt,
      title,
      modelId,
      loras,
      is_shared,
      share_id,
    } = await request.json();

    const { imagePath: galleryRoot } = getSettings();

    if (!galleryRoot) {
      return NextResponse.json({
        error:
          "Image path is not configured. Please set it in the settings page or as an environment variable.",
      }, { status: 500 });
    }

    if (!imagePath) {
      return NextResponse.json({ error: "Missing imagePath" }, { status: 400 });
    }

    const db = getDatabaseInstance(galleryRoot);

    // Transaction for LoRAs
    if (loras !== undefined) {
      const updateLoras = db.transaction((mediaPath, loraIds) => {
        db.prepare("DELETE FROM media_loras WHERE media_path = ?").run(
          mediaPath,
        );
        const insert = db.prepare(
          "INSERT INTO media_loras (media_path, lora_id) VALUES (?, ?)",
        );
        for (const loraId of loraIds) {
          insert.run(mediaPath, loraId);
        }
      });
      updateLoras(imagePath, loras);
    }

    const existing = db.prepare("SELECT path FROM images WHERE path = ?").get(
      imagePath,
    );

    if (existing) {
      // UPDATE
      const setClauses: string[] = [];
      const params: (string | number | null)[] = [];
      if (hidden !== undefined) {
        setClauses.push("hidden = ?");
        params.push(hidden ? 1 : 0);
      }
      if (starred !== undefined) {
        setClauses.push("starred = ?");
        params.push(starred ? 1 : 0);
      }
      if (prompt !== undefined) {
        setClauses.push("prompt = ?");
        params.push(prompt);
      }
      if (title !== undefined) {
        setClauses.push("title = ?");
        params.push(title);
      }
      if (modelId !== undefined) {
        setClauses.push("model_id = ?");
        params.push(modelId);
      }
      if (is_shared !== undefined) {
        setClauses.push("is_shared = ?");
        params.push(is_shared ? 1 : 0);
      }
      if (share_id !== undefined) {
        setClauses.push("share_id = ?");
        params.push(share_id);
      }

      if (setClauses.length > 0) {
        params.push(imagePath);
        const query = `UPDATE images SET ${
          setClauses.join(", ")
        } WHERE path = ?`;
        db.prepare(query).run(...params);
      }
    } else {
      // INSERT
      const columns = ["path"];
      const values: (string | number | null)[] = [imagePath];
      const placeholders = ["?"];

      if (hidden !== undefined) {
        columns.push("hidden");
        values.push(hidden ? 1 : 0);
        placeholders.push("?");
      }
      if (starred !== undefined) {
        columns.push("starred");
        values.push(starred ? 1 : 0);
        placeholders.push("?");
      }
      if (prompt !== undefined) {
        columns.push("prompt");
        values.push(prompt);
        placeholders.push("?");
      }
      if (title !== undefined) {
        columns.push("title");
        values.push(title);
        placeholders.push("?");
      }
      if (modelId !== undefined) {
        columns.push("model_id");
        values.push(modelId);
        placeholders.push("?");
      }
      if (is_shared !== undefined) {
        columns.push("is_shared");
        values.push(is_shared ? 1 : 0);
        placeholders.push("?");
      }
      if (share_id !== undefined) {
        columns.push("share_id");
        values.push(share_id);
        placeholders.push("?");
      }

      const query = `INSERT INTO images (${columns.join(", ")}) VALUES (${
        placeholders.join(", ")
      })`;
      db.prepare(query).run(...values);
    }

    closeDatabase(db);

    return NextResponse.json({ message: "Metadata updated successfully" }, {
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error updating metadata:", error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error stack:", error.stack); // Log stack trace
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
