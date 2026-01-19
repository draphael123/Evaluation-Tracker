export interface FlowConfig {
  flowId: string;
  fillTestData: boolean;
  screenshotMode: "viewport" | "fullpage";
  viewport: "desktop" | "tablet" | "mobile";
  testData: Record<string, string>;
}

export interface FormField {
  name: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

// Step action types for the visual builder
export type StepActionType = 
  | "navigate"      // Go to a URL
  | "click"         // Click an element
  | "fill"          // Fill a form field
  | "select"        // Select dropdown option
  | "check"         // Check a checkbox/radio
  | "wait"          // Wait for element/time
  | "screenshot"    // Just take screenshot (no action)
  | "scroll";       // Scroll to element

export interface StepAction {
  type: StepActionType;
  selector?: string;      // CSS selector for the target element
  value?: string;         // Value to fill/select, or URL for navigate
  testDataKey?: string;   // Key from testData to use as value
  waitTime?: number;      // Milliseconds to wait
  description?: string;   // Human-readable description
}

export interface FlowStep {
  id: string;
  name: string;
  actions: StepAction[];
  waitForSelector?: string;  // Wait for this selector before step
  waitTimeout?: number;      // Timeout for waitForSelector (default 10000)
  captureScreenshot?: boolean; // Whether to capture screenshot (default true)
  continueOnError?: boolean;   // Continue flow if step fails
}

export interface DynamicFlow {
  id: string;
  name: string;
  description: string;
  websiteUrl: string;
  websiteName: string;
  iconEmoji?: string;
  createdAt: string;
  updatedAt: string;
  steps: FlowStep[];
  testDataFields: TestDataField[];
}

export interface TestDataField {
  key: string;
  label: string;
  type: "text" | "email" | "phone" | "date" | "select";
  defaultValue: string;
  options?: string[]; // For select type
  required?: boolean;
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
  flowId: string;
  flowName: string;
  websiteName: string;
  runDate: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: string;
  viewport: string;
  status: "completed" | "failed" | "partial" | "blocked";
  steps: StepResult[];
}

export const viewportSizes = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

// Pre-built flow templates
export const flowTemplates: Partial<DynamicFlow>[] = [
  {
    name: "Basic Multi-Page Form",
    description: "Template for multi-page questionnaires with next buttons",
    iconEmoji: "📝",
    steps: [
      {
        id: "step-1",
        name: "Landing Page",
        actions: [{ type: "navigate", value: "", description: "Navigate to start URL" }],
        captureScreenshot: true,
      },
      {
        id: "step-2", 
        name: "Click Get Started",
        actions: [{ type: "click", selector: "", description: "Click the get started button" }],
        captureScreenshot: true,
      },
    ],
    testDataFields: [],
  },
  {
    name: "E-commerce Checkout",
    description: "Template for checkout flows with form filling",
    iconEmoji: "🛒",
    steps: [
      {
        id: "step-1",
        name: "Product Page",
        actions: [{ type: "navigate", value: "", description: "Navigate to product" }],
        captureScreenshot: true,
      },
      {
        id: "step-2",
        name: "Add to Cart",
        actions: [{ type: "click", selector: "", description: "Click add to cart" }],
        captureScreenshot: true,
      },
    ],
    testDataFields: [
      { key: "email", label: "Email", type: "email", defaultValue: "test@example.com" },
      { key: "name", label: "Full Name", type: "text", defaultValue: "Test User" },
    ],
  },
];
