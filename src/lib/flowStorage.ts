import * as fs from "fs";
import * as path from "path";
import { DynamicFlow } from "./types";

const FLOWS_DIR = path.join(process.cwd(), "data", "flows");

// Ensure flows directory exists
function ensureFlowsDir() {
  if (!fs.existsSync(FLOWS_DIR)) {
    fs.mkdirSync(FLOWS_DIR, { recursive: true });
  }
}

export function getAllFlows(): DynamicFlow[] {
  ensureFlowsDir();
  
  try {
    const files = fs.readdirSync(FLOWS_DIR).filter((f) => f.endsWith(".json"));
    const flows: DynamicFlow[] = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(FLOWS_DIR, file);
        const data = fs.readFileSync(filePath, "utf-8");
        flows.push(JSON.parse(data));
      } catch {
        // Skip invalid files
      }
    }
    
    // Sort by updatedAt, newest first
    flows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    return flows;
  } catch {
    return [];
  }
}

export function getFlowById(id: string): DynamicFlow | null {
  ensureFlowsDir();
  
  const filePath = path.join(FLOWS_DIR, `${id}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveFlow(flow: DynamicFlow): DynamicFlow {
  ensureFlowsDir();
  
  const now = new Date().toISOString();
  
  if (!flow.id) {
    flow.id = `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    flow.createdAt = now;
  }
  
  flow.updatedAt = now;
  
  const filePath = path.join(FLOWS_DIR, `${flow.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(flow, null, 2));
  
  return flow;
}

export function deleteFlow(id: string): boolean {
  ensureFlowsDir();
  
  const filePath = path.join(FLOWS_DIR, `${id}.json`);
  
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export function duplicateFlow(id: string): DynamicFlow | null {
  const original = getFlowById(id);
  
  if (!original) {
    return null;
  }
  
  const duplicate: DynamicFlow = {
    ...original,
    id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `${original.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return saveFlow(duplicate);
}

