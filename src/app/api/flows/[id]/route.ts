import { NextRequest, NextResponse } from "next/server";
import { getFlowById, saveFlow, deleteFlow } from "@/lib/flowStorage";
import { DynamicFlow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET single flow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const flow = getFlowById(id);
    
    if (!flow) {
      return NextResponse.json(
        { error: "Flow not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(flow);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch flow" },
      { status: 500 }
    );
  }
}

// PUT update flow
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const existingFlow = getFlowById(id);
    
    if (!existingFlow) {
      return NextResponse.json(
        { error: "Flow not found" },
        { status: 404 }
      );
    }
    
    const updates: Partial<DynamicFlow> = await request.json();
    
    const updatedFlow: DynamicFlow = {
      ...existingFlow,
      ...updates,
      id: existingFlow.id, // Preserve original ID
      createdAt: existingFlow.createdAt, // Preserve creation date
    };
    
    const savedFlow = saveFlow(updatedFlow);
    return NextResponse.json(savedFlow);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update flow" },
      { status: 500 }
    );
  }
}

// DELETE flow
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const success = deleteFlow(id);
    
    if (!success) {
      return NextResponse.json(
        { error: "Flow not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete flow" },
      { status: 500 }
    );
  }
}

