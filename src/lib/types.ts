export interface FlowConfig {
  flowType: string;
  fillTestData: boolean;
  screenshotMode: "viewport" | "fullpage";
  viewport: "desktop" | "tablet" | "mobile";
  testData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    state: string;
  };
}

export interface FormField {
  name: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

export interface StepDefinition {
  name: string;
  url?: string;
  waitFor?: string;
  action?: (page: any, config: FlowConfig) => Promise<void>;
  validate?: (page: any) => Promise<string[]>;
}

export interface StepResult {
  stepNumber: number;
  name: string;
  url: string;
  screenshot: string;
  pageTitle: string;
  h1?: string;
  formFields: FormField[];
  buttons: string[];
  loadTime: string;
  timestamp: string;
  errors: string[];
  notes?: string;
}

export interface EvaluationReport {
  id: string;
  flowType: string;
  flowName: string;
  runDate: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: string;
  viewport: string;
  status: "completed" | "failed" | "partial";
  steps: StepResult[];
}

export interface FlowDefinition {
  flowType: string;
  flowName: string;
  startUrl: string;
  steps: StepDefinition[];
}

export const viewportSizes = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

