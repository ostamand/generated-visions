import { NextResponse } from "next/server";
import {
  getSettings,
  saveSettings,
  setAndRecordImagePath,
} from "@/lib/settings";

export async function GET() {
  const settings = getSettings();
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const settings = getSettings();
  if (settings.demo) {
    return NextResponse.json(
      { error: "Cannot modify data in demo mode" },
      { status: 403 },
    );
  }
  try {
    const newSettings = await request.json();

    if (newSettings.imagePath) {
      setAndRecordImagePath(newSettings.imagePath);
    } else {
      // Handle other potential settings changes that don't affect history
      const currentSettings = getSettings();
      saveSettings({ ...currentSettings, ...newSettings });
    }

    return NextResponse.json({ message: "Settings saved successfully." });
  } catch (error: unknown) {
    console.error("Error saving settings:", error);
    let errorMessage = "Failed to save settings.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
