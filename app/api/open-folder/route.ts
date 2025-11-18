import { NextResponse } from "next/server";

export async function GET() {
  // This will be implemented to trigger the Electron dialog
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
