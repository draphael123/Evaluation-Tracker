import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Check if Browserless is configured
  const hasBrowserlessToken = !!process.env.BROWSERLESS_TOKEN;
  const isVercel = process.env.VERCEL === "1";
  const hasDatabase = isDatabaseConfigured();
  
  return NextResponse.json({
    hasBrowserlessToken,
    isVercel,
    hasDatabase,
    canRunEvaluations: hasBrowserlessToken || !isVercel,
  });
}
