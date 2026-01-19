import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { getStoredReport } from "@/lib/dynamicEvaluator";
import { getStoredReport as getAutoStoredReport } from "@/lib/autoEvaluator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Report ID is required" },
      { status: 400 }
    );
  }

  // First check in-memory storage (for serverless)
  const memoryReport = getStoredReport(id) || getAutoStoredReport(id);
  if (memoryReport) {
    return NextResponse.json(memoryReport);
  }

  // Then check filesystem (for local development)
  const reportPath = path.join(process.cwd(), "public", "reports", `${id}.json`);

  if (!fs.existsSync(reportPath)) {
    return NextResponse.json(
      { error: "Report not found" },
      { status: 404 }
    );
  }

  try {
    const reportData = fs.readFileSync(reportPath, "utf-8");
    const report = JSON.parse(reportData);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read report" },
      { status: 500 }
    );
  }
}
