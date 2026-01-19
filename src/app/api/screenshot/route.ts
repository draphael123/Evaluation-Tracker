import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { getScreenshot } from "@/lib/dynamicEvaluator";
import { getScreenshot as getAutoScreenshot } from "@/lib/autoEvaluator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const screenshotPath = searchParams.get("path");

  if (!screenshotPath) {
    return NextResponse.json(
      { error: "Screenshot path is required" },
      { status: 400 }
    );
  }

  // First check in-memory storage (returns base64 data URL)
  const memoryScreenshot = getScreenshot(screenshotPath) || getAutoScreenshot(screenshotPath);
  if (memoryScreenshot) {
    // Return the base64 data URL directly
    return NextResponse.json({ dataUrl: memoryScreenshot });
  }

  // Then check filesystem
  const fullPath = path.join(process.cwd(), "public", screenshotPath);

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json(
      { error: "Screenshot not found" },
      { status: 404 }
    );
  }

  try {
    const imageBuffer = fs.readFileSync(fullPath);
    const base64 = imageBuffer.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;
    return NextResponse.json({ dataUrl });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read screenshot" },
      { status: 500 }
    );
  }
}

