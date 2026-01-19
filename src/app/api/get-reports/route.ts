import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { getAllStoredReports } from "@/lib/dynamicEvaluator";
import { getAllStoredReports as getAllAutoStoredReports } from "@/lib/autoEvaluator";
import { getReports as getDbReports, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReportSummary {
  id: string;
  flowId: string;
  flowType?: string;
  flowName: string;
  runDate: string;
  status: string;
  completedSteps: number;
  totalSteps: number;
  totalDuration: string;
}

export async function GET(request: NextRequest) {
  const reports: ReportSummary[] = [];

  // First check database (if configured)
  if (isDatabaseConfigured()) {
    try {
      const { reports: dbReports } = await getDbReports(50, 0);
      for (const report of dbReports) {
        reports.push({
          id: report.id,
          flowId: report.flowId,
          flowName: report.flowName,
          runDate: report.runDate,
          status: report.status,
          completedSteps: report.completedSteps,
          totalSteps: report.totalSteps,
          totalDuration: report.totalDuration,
        });
      }
    } catch (error) {
      console.error("Database error:", error);
      // Fall through to other storage methods
    }
  }

  // Get reports from in-memory storage (serverless without DB)
  const memoryReports = [...getAllStoredReports(), ...getAllAutoStoredReports()];
  for (const report of memoryReports) {
    // Skip duplicates
    if (reports.some((r) => r.id === report.id)) continue;
    
    reports.push({
      id: report.id,
      flowId: report.flowId,
      flowName: report.flowName,
      runDate: report.runDate,
      status: report.status,
      completedSteps: report.completedSteps,
      totalSteps: report.totalSteps,
      totalDuration: report.totalDuration,
    });
  }

  // Also check filesystem (for local development)
  const reportsDir = path.join(process.cwd(), "public", "reports");

  if (fs.existsSync(reportsDir)) {
    try {
      const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith(".json"));

      for (const file of files) {
        // Skip if already found
        const id = file.replace(".json", "");
        if (reports.some((r) => r.id === id)) continue;

        try {
          const filePath = path.join(reportsDir, file);
          const data = fs.readFileSync(filePath, "utf-8");
          const report = JSON.parse(data);

          reports.push({
            id: report.id,
            flowId: report.flowId,
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
    } catch {
      // Ignore filesystem errors
    }
  }

  // Sort by date, newest first
  reports.sort((a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime());

  return NextResponse.json(reports);
}
