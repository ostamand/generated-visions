import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

import { getSettings, getUserAccessToken } from "@/lib/settings";

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".svg": "image/svg+xml",
        ".bmp": "image/bmp",
        ".tiff": "image/tiff",
        ".tif": "image/tiff",
        ".avif": "image/avif",
    };
    return mimeTypes[ext] || "application/octet-stream";
}

export async function POST(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const filePathParam = searchParams.get("path");

    const body = await request.json();
    const { prompt, title, width, height, loras, model } = body;

    // check access token
    const authHeader = getUserAccessToken();
    if (!authHeader) {
        return new NextResponse("Unauthorized: No token provided.", {
            status: 401,
        });
    }

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
        // 1. Check if file exists
        await fs.access(resolvedPath);

        // 2. Read the file buffer
        const fileBuffer = await fs.readFile(resolvedPath);

        // 3. Prepare Dynamic MIME type and File data
        const mimeType = getMimeType(resolvedPath);
        const fileName = path.basename(resolvedPath);

        // 4. Create FormData
        const formData = new FormData();
        const fileBlob = new Blob([fileBuffer], { type: mimeType });

        formData.append("image", fileBlob, fileName);
        formData.append("prompt", prompt ? prompt : "");
        formData.append("title", title ? title : "");
        formData.append("model", model);
        formData.append("loras", String(loras));
        formData.append("width", String(width));
        formData.append("height", String(height));

        // 6. Call the external API Endpoint
        const uploadResponse = await fetch(
            `${process.env.NEXT_PUBLIC_GENERATED_VISIONS_API_URL}/app/medias`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authHeader}`,
                },
                body: formData,
            },
        );

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            return new NextResponse(JSON.stringify(errorData), {
                status: uploadResponse.status,
            });
        }

        const data = await uploadResponse.json();
        return new NextResponse(JSON.stringify(data), {
            status: uploadResponse.status,
        });
    } catch (error: unknown) {
        console.error(error);
        // Handle 'File not found' specifically
        if (
            error instanceof Error && "code" in error &&
            (error as NodeJS.ErrnoException).code === "ENOENT"
        ) {
            return new NextResponse("File not found on local system.", {
                status: 404,
            });
        }
        return new NextResponse(
            error instanceof Error ? error.message : "Internal Server Error",
            {
                status: 500,
            },
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const filename = searchParams.get("filename");

        if (!filename) {
            return new NextResponse("Filename is required.", {
                status: 400,
            });
        }

        const authHeader = getUserAccessToken();
        if (!authHeader) {
            return new NextResponse("Unauthorized: No token provided.", {
                status: 401,
            });
        }

        const checkSharedResponse = await fetch(
            `${process.env.NEXT_PUBLIC_GENERATED_VISIONS_API_URL}/app/medias/${filename}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${authHeader}`,
                },
            },
        );
        const data = await checkSharedResponse.json();

        return new NextResponse(JSON.stringify(data), {
            status: checkSharedResponse.status,
        });
    } catch (error) {
        return new NextResponse(
            error instanceof Error ? error.message : "Internal Server Error",
            {
                status: 500,
            },
        );
    }
}
