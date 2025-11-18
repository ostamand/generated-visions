import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { closeDatabase, getDatabaseInstance } from "@/lib/database";
import { getSettings } from "@/lib/settings";
import Database from "better-sqlite3";
import sharp from "sharp";
import getVideoDimensions from "get-video-dimensions";

const imageExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
];
const videoExtensions = [".mp4"];
const mediaExtensions = [...imageExtensions, ...videoExtensions];

interface FileWithDimensions {
  path: string;
  modified_at: number;
  width: number | null;
  height: number | null;
}

// Helper to get dimensions
async function getMediaDimensions(
  filePath: string,
): Promise<{ width: number | null; height: number | null }> {
  const ext = path.extname(filePath).toLowerCase();
  let dimensions: { width: number | null; height: number | null } = {
    width: null,
    height: null,
  };
  try {
    if (imageExtensions.includes(ext)) {
      const metadata = await sharp(filePath).metadata();
      dimensions = {
        width: metadata.width || null,
        height: metadata.height || null,
      };
    } else if (videoExtensions.includes(ext)) {
      dimensions = await getVideoDimensions(filePath);
    }
  } catch (error) {
    console.error(`Failed to get dimensions for ${filePath}:`, error);
  }
  console.log(`Dimensions for ${filePath}: ${JSON.stringify(dimensions)}`);
  return dimensions;
}

async function scanDirectoryForFiles(
  basePath: string,
  currentPath: string,
): Promise<{ path: string; modified_at: number }[]> {
  const fullPath = path.join(basePath, currentPath);
  let files: { path: string; modified_at: number }[] = [];

  try {
    const dirents = await fs.promises.readdir(fullPath, {
      withFileTypes: true,
    });

    for (const dirent of dirents) {
      const direntPath = path.join(currentPath, dirent.name);
      if (dirent.isDirectory()) {
        if (dirent.name === ".visions") continue;
        try {
          await fs.promises.access(
            path.join(fullPath, dirent.name, ".visionsignore"),
          );
          continue;
        } catch {
          // Not ignored
        }
        const subFiles = await scanDirectoryForFiles(basePath, direntPath);
        files = files.concat(subFiles);
      } else if (dirent.isFile()) {
        const ext = path.extname(dirent.name).toLowerCase();
        if (mediaExtensions.includes(ext)) {
          const stats = await fs.promises.stat(path.join(basePath, direntPath));
          files.push({ path: direntPath, modified_at: stats.mtimeMs });
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${fullPath}:`, error);
  }
  return files;
}

export async function POST() {
  console.log("Syncing filesystem...");
  const { imagePath: galleryRoot } = getSettings();

  if (!galleryRoot) {
    return NextResponse.json({ error: "Image path is not configured." }, {
      status: 500,
    });
  }

  let db: Database.Database | undefined;
  try {
    db = getDatabaseInstance(galleryRoot);

    if (!db) {
      throw new Error("Failed to get database instance.");
    }

    const allFilesOnDisk = await scanDirectoryForFiles(galleryRoot, "");

    const selectStmt = db.prepare(
      "SELECT modified_at, width FROM images WHERE path = ?",
    );

    const filesToInsert: FileWithDimensions[] = [];
    const filesToUpdate: FileWithDimensions[] = [];

    for (const file of allFilesOnDisk) {
      const existing = selectStmt.get(file.path) as {
        modified_at: number;
        width: number | null;
      } | undefined;
      if (existing) {
        if (
          existing.modified_at !== file.modified_at || existing.width === null
        ) {
          const dimensions = await getMediaDimensions(
            path.join(galleryRoot, file.path),
          );
          filesToUpdate.push({ ...file, ...dimensions });
        }
      } else {
        const dimensions = await getMediaDimensions(
          path.join(galleryRoot, file.path),
        );
        filesToInsert.push({ ...file, ...dimensions });
      }
    }

    const syncTransaction = db.transaction(() => {
      if (!db) {
        throw new Error("Failed to get database instance.");
      }

      const updateStmt = db.prepare(
        "UPDATE images SET modified_at = ?, width = ?, height = ? WHERE path = ?",
      );
      const insertStmt = db.prepare(
        "INSERT INTO images (path, modified_at, width, height) VALUES (?, ?, ?, ?)",
      );

      for (const file of filesToUpdate) {
        updateStmt.run(file.modified_at, file.width, file.height, file.path);
      }
      for (const file of filesToInsert) {
        insertStmt.run(file.path, file.modified_at, file.width, file.height);
      }
    });

    syncTransaction();

    // Sync database: remove entries for files that no longer exist
    const filesOnDiskSet = new Set(allFilesOnDisk.map((file) => file.path));
    const filesInDb = db.prepare("SELECT path FROM images").all() as {
      path: string;
    }[];
    const pathsToDelete = filesInDb.filter((file) =>
      !filesOnDiskSet.has(file.path)
    ).map((file) => file.path);

    if (pathsToDelete.length > 0) {
      const deleteStmt = db.prepare("DELETE FROM images WHERE path = ?");
      const deleteTransaction = db.transaction((paths) => {
        for (const path of paths) {
          deleteStmt.run(path);
        }
      });
      deleteTransaction(pathsToDelete);
      console.log(
        `Deleted ${pathsToDelete.length} stale entries from the database.`,
      );
    }

    console.log("Sync complete.");
    return NextResponse.json({ message: "Filesystem synced successfully." });
  } catch (error: unknown) {
    console.error("Error in POST /api/sync:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred.";
    return NextResponse.json({
      error: "Failed to sync filesystem.",
      details: errorMessage,
    }, { status: 500 });
  } finally {
    if (db) {
      closeDatabase(db);
    }
  }
}
