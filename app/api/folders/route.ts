import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSettings } from "@/lib/settings";
import { closeDatabase, getDatabaseInstance } from "@/lib/database";

const imageExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".mp4",
];

async function hasImages(directoryPath: string): Promise<boolean> {
  try {
    const dirents = await fs.promises.readdir(directoryPath, {
      withFileTypes: true,
    });
    for (const dirent of dirents) {
      if (dirent.isFile()) {
        const ext = path.extname(dirent.name).toLowerCase();
        if (imageExtensions.includes(ext)) {
          return true;
        }
      }
    }
  } catch {
    // This can happen if the directory doesn't exist, which is fine.
  }
  return false;
}

async function scanDirectoryForFolders(
  basePath: string,
  currentPath: string,
): Promise<string[]> {
  const fullPath = path.join(basePath, currentPath);
  let folders: string[] = [];

  try {
    const dirents = await fs.promises.readdir(fullPath, {
      withFileTypes: true,
    });

    for (const dirent of dirents) {
      if (dirent.isDirectory()) {
        // Ignore special directories like .visions
        if (dirent.name === ".visions") {
          continue;
        }

        const direntPath = path.join(currentPath, dirent.name);
        const childFullPath = path.join(fullPath, dirent.name);

        let isChildIgnored = false;
        try {
          await fs.promises.access(path.join(childFullPath, ".visionsignore"));
          isChildIgnored = true;
          console.log(
            `Ignoring subdirectory for folder list: ${childFullPath} due to .visionsignore file.`,
          );
        } catch {
          // .visionsignore not found, proceed
        }

        if (!isChildIgnored) {
          folders.push(direntPath);
          // Now recurse into the non-ignored directory
          const subFolders = await scanDirectoryForFolders(
            basePath,
            direntPath,
          );
          folders = folders.concat(subFolders);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${fullPath}:`, error);
  }

  return folders;
}

export async function GET() {
  const { imagePath: galleryRoot } = getSettings();

  if (!galleryRoot) {
    return NextResponse.json(
      { error: "Image path is not configured." },
      { status: 500 },
    );
  }

  let db;
  try {
    const allDirs = await scanDirectoryForFolders(galleryRoot, "");
    const folderPathsToCheck = [".", ...allDirs];

    const foldersWithImagesPaths = [];
    for (const p of folderPathsToCheck) {
      const fullPath = p === "." ? galleryRoot : path.join(galleryRoot, p);
      if (await hasImages(fullPath)) {
        foldersWithImagesPaths.push(p);
      }
    }

    db = getDatabaseInstance(galleryRoot);
    const folderDisplayNameStmt = db.prepare(
      "SELECT display_name FROM folder_display_names WHERE path = ?",
    );

    const allFolders = foldersWithImagesPaths.map((folderPath) => {
      const displayNameResult = folderDisplayNameStmt.get(folderPath) as {
        display_name: string;
      } | undefined;
      return {
        path: folderPath,
        displayName: displayNameResult?.display_name ||
          (folderPath === "."
            ? path.basename(galleryRoot)
            : path.basename(folderPath)),
      };
    });

    // Sort folders by display name, alphabetically.
    allFolders.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json(allFolders);
  } catch (error: unknown) {
    console.error("Error in GET /api/folders:", error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json(
      { error: "Failed to retrieve folders.", details: errorMessage },
      { status: 500 },
    );
  } finally {
    if (db) {
      closeDatabase(db);
    }
  }
}
