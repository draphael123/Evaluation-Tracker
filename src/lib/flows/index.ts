import { FlowDefinition } from "../types";
import mensTrtFlow from "./mens-trt";
import womensHrtFlow from "./womens-hrt";

export const flows: Record<string, FlowDefinition> = {
  "mens-trt": mensTrtFlow,
  "womens-hrt": womensHrtFlow,
};

export function getFlow(flowType: string): FlowDefinition | undefined {
  return flows[flowType];
}

export function getAllFlows(): FlowDefinition[] {
  return Object.values(flows);
}

export { mensTrtFlow, womensHrtFlow };

