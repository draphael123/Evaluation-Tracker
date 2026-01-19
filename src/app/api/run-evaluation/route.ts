import { NextRequest } from "next/server";
import { runEvaluation } from "@/lib/evaluator";
import { FlowConfig } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const config: FlowConfig = await request.json();

    // Create a readable stream for progress updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await runEvaluation(config, (data) => {
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

