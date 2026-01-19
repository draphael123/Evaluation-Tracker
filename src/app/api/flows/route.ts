import { NextRequest, NextResponse } from "next/server";
import { getAllFlows, saveFlow } from "@/lib/flowStorage";
import { DynamicFlow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET all flows
export async function GET() {
  try {
    const flows = getAllFlows();
    return NextResponse.json(flows);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch flows" },
      { status: 500 }
    );
  }
}

// POST create new flow
export async function POST(request: NextRequest) {
  try {
    const flowData: Partial<DynamicFlow> = await request.json();
    
    const flow: DynamicFlow = {
      id: "",
      name: flowData.name || "New Flow",
      description: flowData.description || "",
      websiteUrl: flowData.websiteUrl || "",
      websiteName: flowData.websiteName || "",
      iconEmoji: flowData.iconEmoji || "🌐",
      createdAt: "",
      updatedAt: "",
      steps: flowData.steps || [],
      testDataFields: flowData.testDataFields || [],
    };
    
    const savedFlow = saveFlow(flow);
    return NextResponse.json(savedFlow, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create flow" },
      { status: 500 }
    );
  }
}

