import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { getSettings } from "@/lib/settings";

const mimeTypes: { [key: string]: string } = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".mp4": "video/mp4",
};

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const filePathParam = searchParams.get("path");
    const thumbnail = searchParams.get("thumbnail") === "true";
    const width = searchParams.get("w");
    const height = searchParams.get("h");

    const { imagePath: basePath } = getSettings();

    if (!basePath) {
        return new NextResponse("Image directory path is not configured.", {
            status: 500,
        });
    }

    if (!filePathParam) {
        return new NextResponse("File path is required.", {
            status: 400,
        });
    }

    const safeFilePath = path.normalize(filePathParam);
    const absoluteFilePath = path.join(basePath, safeFilePath);

    // Security Check: Ensure the resolved path is within the base path
    const resolvedPath = path.resolve(absoluteFilePath);
    const resolvedBasePath = path.resolve(basePath);

    if (!resolvedPath.startsWith(resolvedBasePath)) {
        return new NextResponse("Forbidden", {
            status: 403,
        });
    }

    try {
        if (
            !fs.existsSync(resolvedPath) || !fs.lstatSync(resolvedPath).isFile()
        ) {
            return new NextResponse("Not Found", {
                status: 404,
            });
        }
    } catch (error) {
        console.error(error);
        return new NextResponse("Error accessing file system", {
            status: 500,
        });
    }

    try {
        const fileContents = fs.readFileSync(resolvedPath);
        const ext = path.extname(resolvedPath).toLowerCase();
        const contentType = mimeTypes[ext] || "application/octet-stream";

        if (contentType.startsWith("image/")) {
            let imageProcessor = sharp(fileContents);
            let processed = false;

            if (thumbnail) {
                imageProcessor = imageProcessor.resize(300).webp({
                    quality: 80,
                });
                processed = true;
            } else if (width && height) {
                imageProcessor = imageProcessor
                    .resize(parseInt(width), parseInt(height), {
                        fit: "inside",
                        withoutEnlargement: true,
                    })
                    .webp({ quality: 80 });
                processed = true;
            }

            if (processed) {
                try {
                    const { data, info } = await imageProcessor.toBuffer({
                        resolveWithObject: true,
                    });
                    const processedContentType = info.format === "webp"
                        ? "image/webp"
                        : contentType;

                    return new NextResponse(new Uint8Array(data), {
                        status: 200,
                        headers: {
                            "Content-Type": processedContentType,
                        },
                    });
                } catch (processError) {
                    console.error("Failed to process image:", processError);
                    // Fallback to serving original image
                }
            }
        }

        return new NextResponse(fileContents, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${
                    path.basename(safeFilePath)
                }"`,
            },
        });
    } catch (error) {
        console.error(`Failed to read file: ${resolvedPath}`, error);
        return new NextResponse("Internal Server Error", {
            status: 500,
        });
    }
}
