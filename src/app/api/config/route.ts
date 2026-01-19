import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Check if Browserless is configured
  const hasBrowserlessToken = !!process.env.BROWSERLESS_TOKEN;
  const isVercel = process.env.VERCEL === "1";
  
  return NextResponse.json({
    hasBrowserlessToken,
    isVercel,
    canRunEvaluations: hasBrowserlessToken || !isVercel,
  });
}

