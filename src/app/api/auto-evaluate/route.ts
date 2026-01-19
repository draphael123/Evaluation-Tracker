import { NextRequest } from "next/server";
import { runAutoEvaluation, AutoEvalConfig } from "@/lib/autoEvaluator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for auto evaluation

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const config: AutoEvalConfig = {
      startUrl: body.startUrl,
      websiteName: body.websiteName || "",
      maxSteps: body.maxSteps || 20,
      viewport: body.viewport || "desktop",
      screenshotMode: body.screenshotMode || "viewport",
      autoFillForms: body.autoFillForms !== false, // Default true
      testData: body.testData || {},
    };

    // Validate URL
    try {
      new URL(config.startUrl);
    } catch {
      return new Response(
        JSON.stringify({ type: "error", message: "Invalid URL provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await runAutoEvaluation(config, (data) => {
            const json = JSON.stringify(data) + "\n";
            controller.enqueue(encoder.encode(json));
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          const json = JSON.stringify({ type: "error", message: errorMessage }) + "\n";
          controller.enqueue(encoder.encode(json));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

