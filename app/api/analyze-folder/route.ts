import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const SUPPORTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
];

async function getFiles(dir: string): Promise<string[]> {
  try {
    await fs.access(path.join(dir, ".visionsignore"));
    console.log(`Ignoring directory: ${dir} due to .visionsignore file.`);
    return []; // Ignore this directory
  } catch {
    // .visionsignore not found, proceed
  }

  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFiles(res) : res;
    }),
  );
  return Array.prototype.concat(...files);
}

export async function POST(request: Request) {
  try {
    const { path: folderPath } = await request.json();

    if (!folderPath || typeof folderPath !== "string") {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    try {
      await fs.access(folderPath);
    } catch {
      return NextResponse.json({
        error:
          `Cannot access path: ${folderPath}. Please ensure it's a valid and accessible directory.`,
      }, { status: 400 });
    }

    const allFiles = await getFiles(folderPath);

    const mediaTypes: Record<string, number> = {};
    let totalCount = 0;

    for (const file of allFiles) {
      const ext = path.extname(file).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        const type = ext.substring(1); // remove the dot
        mediaTypes[type] = (mediaTypes[type] || 0) + 1;
        totalCount++;
      }
    }

    return NextResponse.json({
      path: folderPath,
      mediaTypes,
      totalCount,
    });
  } catch (error: unknown) {
    console.error("Failed to analyze folder:", error);
    const message = error instanceof Error
      ? error.message
      : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
