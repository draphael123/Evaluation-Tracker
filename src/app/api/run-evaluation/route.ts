import { NextRequest } from "next/server";
import { runDynamicEvaluation } from "@/lib/dynamicEvaluator";
import { getFlowById } from "@/lib/flowStorage";
import { FlowConfig } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowId, ...configRest } = body;
    
    // Get the flow definition
    const flow = getFlowById(flowId);
    
    if (!flow) {
      return new Response(
        JSON.stringify({ type: "error", message: "Flow not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const config: FlowConfig = {
      flowId,
      fillTestData: configRest.fillTestData || false,
      screenshotMode: configRest.screenshotMode || "viewport",
      viewport: configRest.viewport || "desktop",
      testData: configRest.testData || {},
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await runDynamicEvaluation(config, flow, (data) => {
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
