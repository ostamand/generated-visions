import { NextRequest } from "next/server";
import archiver from "archiver";
import { PassThrough } from "stream";
import path from "path";
import fs from "fs";
import { getSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
  console.log("Batch download request received.");
  try {
    const body = await req.json();
    const files = body.files as string[];

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: "No files provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.log(`Request to zip ${files.length} files.`);

    const { imagePath } = getSettings();
    console.log(`Using imagePath: ${imagePath}`);
    if (!imagePath) {
      return new Response(
        JSON.stringify({ error: "Image path is not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const stream = new PassThrough();
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
    });

    archive.pipe(stream);

    for (const file of files) {
      const fullPath = path.join(imagePath, file);
      console.log(`Processing file: Relative='${file}', Full='${fullPath}'`);
      if (fs.existsSync(fullPath)) {
        archive.file(fullPath, { name: file }); // Use relative path for name to preserve structure
      } else {
        console.warn(`File not found, skipping: ${fullPath}`);
      }
    }

    archive.finalize();
    console.log("Archive finalized. Streaming response.");

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set(
      "Content-Disposition",
      'attachment; filename="generated-visions-download.zip"',
    );

    // @ts-expect-error - ReadableStream is compatible with stream.Readable
    return new Response(stream, { headers });
  } catch (error) {
    console.error("Failed to create zip archive:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create zip archive" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
