import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export async function GET() {
  try {
    const { imagePath: galleryRoot } = getSettings();
    return NextResponse.json({ galleryRoot });
  } catch (error: unknown) {
    console.error("Error getting gallery root:", error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
