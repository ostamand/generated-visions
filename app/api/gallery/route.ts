import { NextResponse } from "next/server";
import path from "path";

import { GalleryItem, GroupedGallery } from "@/types/gallery";
import {
  closeDatabase,
  getDatabaseInstance,
  getGlobalDatabaseInstance,
  ImageMetadata,
} from "@/lib/database";
import { getSettings } from "@/lib/settings";

interface LoraRow {
  lora_id: number;
}

export async function POST(request: Request) {
  const { showHidden, selectedFolders, model, showSharedOnly } =
    await request.json();
  const { imagePath: galleryRoot } = getSettings();

  if (!galleryRoot) {
    return NextResponse.json({ error: "Image path is not configured." }, {
      status: 500,
    });
  }

  let db;
  try {
    db = getDatabaseInstance(galleryRoot);

    let query = "SELECT * FROM images";
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (!showHidden) {
      conditions.push("hidden = 0");
    }

    if (showSharedOnly) {
      conditions.push("is_shared = 1");
    }

    if (model && model !== "all") {
      const globalDb = getGlobalDatabaseInstance();
      try {
        let modelRow = globalDb.prepare("SELECT id FROM models WHERE name = ?")
          .get(model) as { id: number } | undefined;

        if (!modelRow) {
          const result = globalDb.prepare(
            "INSERT INTO models (name) VALUES (?)",
          ).run(model);
          modelRow = { id: result.lastInsertRowid as number };
        }

        conditions.push("model_id = ?");
        params.push(modelRow.id);
      } finally {
        closeDatabase(globalDb);
      }
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    const allFilesFromDb = db.prepare(query).all(
      ...params,
    ) as (ImageMetadata & {
      modified_at: number;
      width?: number;
      height?: number;
      model_id?: number;
      is_shared?: number;
      share_id?: string;
    })[];

    const lorasStmt = db.prepare(
      "SELECT lora_id FROM media_loras WHERE media_path = ?",
    );

    const allFiles: GalleryItem[] = allFilesFromDb.map((row) => {
      const loras = (lorasStmt.all(row.path) as LoraRow[]).map((lora) =>
        lora.lora_id
      );
      return {
        type: "file",
        name: path.basename(row.path),
        relativePath: row.path,
        metadata: {
          ...row,
          hidden: !!row.hidden,
          starred: !!row.starred,
          modelId: row.model_id,
          loras: loras,
          is_shared: !!row.is_shared,
          share_id: row.share_id,
        },
        width: row.width,
        height: row.height,
        modified_at: row.modified_at,
        is_shared: !!row.is_shared,
        share_id: row.share_id || null,
      };
    });

    const starredItems = allFiles.filter((item) => item.metadata?.starred);
    starredItems.sort((a, b) => (b.modified_at || 0) - (a.modified_at || 0));

    const groupedByFolder: { [key: string]: GalleryItem[] } = {};
    for (const item of allFiles) {
      const folder = path.dirname(item.relativePath);
      if (!groupedByFolder[folder]) {
        groupedByFolder[folder] = [];
      }
      groupedByFolder[folder].push(item);
    }

    const folderDisplayNameStmt = db.prepare(
      "SELECT display_name FROM folder_display_names WHERE path = ?",
    );

    let allImagesGrouped: GroupedGallery[] = Object.entries(groupedByFolder)
      .map(([folderPath, media]) => {
        const displayNameResult = folderDisplayNameStmt.get(folderPath) as {
          display_name: string;
        } | undefined;
        const sortedMedia = media.sort((a, b) =>
          (b.modified_at || 0) - (a.modified_at || 0)
        );
        return {
          folderPath,
          folderName: displayNameResult?.display_name ||
            path.basename(folderPath),
          media: sortedMedia,
        };
      });

    if (selectedFolders && selectedFolders.length > 0) {
      allImagesGrouped = allImagesGrouped.filter((group) =>
        selectedFolders.includes(group.folderPath)
      );
    }

    allImagesGrouped.sort((a, b) => {
      if (a.folderPath === ".") return -1;
      if (b.folderPath === ".") return 1;
      return a.folderPath.localeCompare(b.folderPath);
    });

    return NextResponse.json({ starred: starredItems, all: allImagesGrouped });
  } catch (error: unknown) {
    console.error("Error in POST /api/gallery:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred.";
    return NextResponse.json({
      error: "Failed to retrieve gallery.",
      details: errorMessage,
    }, { status: 500 });
  } finally {
    if (db) {
      closeDatabase(db);
    }
  }
}
