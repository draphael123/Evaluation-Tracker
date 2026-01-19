import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReportSummary {
  id: string;
  flowType: string;
  flowName: string;
  runDate: string;
  status: string;
  completedSteps: number;
  totalSteps: number;
  totalDuration: string;
}

export async function GET(request: NextRequest) {
  const reportsDir = path.join(process.cwd(), "public", "reports");

  if (!fs.existsSync(reportsDir)) {
    return NextResponse.json([]);
  }

  try {
    const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith(".json"));
    
    const reports: ReportSummary[] = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(reportsDir, file);
        const data = fs.readFileSync(filePath, "utf-8");
        const report = JSON.parse(data);
        
        reports.push({
          id: report.id,
          flowType: report.flowType,
          flowName: report.flowName,
          runDate: report.runDate,
          status: report.status,
          completedSteps: report.completedSteps,
          totalSteps: report.totalSteps,
          totalDuration: report.totalDuration,
        });
      } catch {
        // Skip invalid reports
      }
    }

    // Sort by date, newest first
    reports.sort((a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime());

    return NextResponse.json(reports);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list reports" },
      { status: 500 }
    );
  }
}

