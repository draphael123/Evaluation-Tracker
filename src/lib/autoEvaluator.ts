import { chromium, Browser, Page } from "playwright";
import { v4 as uuidv4 } from "uuid";
import {
  FlowConfig,
  StepResult,
  EvaluationReport,
  FormField,
  viewportSizes,
} from "./types";

// Check if we're in a serverless environment
const isServerless: boolean = process.env.VERCEL === "1" || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const BROWSERLESS_URL = process.env.BROWSERLESS_URL || "wss://chrome.browserless.io";
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;

export interface AutoEvalConfig {
  startUrl: string;
  websiteName: string;
  maxSteps: number;
  viewport: "desktop" | "tablet" | "mobile";
  screenshotMode: "viewport" | "fullpage";
  autoFillForms: boolean;
  testData: Record<string, string>;
}

export interface StreamCallback {
  (data: { type: string; [key: string]: any }): void;
}

// In-memory storage
const reportsStore = new Map<string, EvaluationReport>();
const screenshotsStore = new Map<string, string>();

export function getStoredReport(id: string): EvaluationReport | undefined {
  return reportsStore.get(id);
}

export function getAllStoredReports(): EvaluationReport[] {
  return Array.from(reportsStore.values()).sort(
    (a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime()
  );
}

export function getScreenshot(path: string): string | undefined {
  return screenshotsStore.get(path);
}

// Common button text patterns to look for (in order of priority)
const NEXT_BUTTON_PATTERNS = [
  // Primary actions
  "get started",
  "start",
  "begin",
  "let's go",
  "take assessment",
  "start assessment",
  "begin assessment",
  "take quiz",
  "start quiz",
  // Navigation
  "next",
  "continue",
  "proceed",
  "go",
  "forward",
  // Submission
  "submit",
  "send",
  "confirm",
  "done",
  "finish",
  "complete",
  // Selection confirmations
  "select",
  "choose",
  "pick",
  "tap here",
  "click here",
  // Agreement
  "i agree",
  "accept",
  "okay",
  "ok",
  "yes",
  "got it",
];

// Patterns that indicate we should NOT click (final pages, errors, etc.)
const STOP_PATTERNS = [
  "sign up",
  "create account",
  "log in",
  "login",
  "sign in",
  "checkout",
  "payment",
  "pay now",
  "purchase",
  "buy now",
  "add to cart",
  "schedule",
  "book appointment",
  "call us",
  "contact",
];

// Default test data for auto-filling forms
const DEFAULT_TEST_DATA: Record<string, string> = {
  // Names
  firstName: "Test",
  first_name: "Test",
  fname: "Test",
  lastName: "User",
  last_name: "User",
  lname: "User",
  name: "Test User",
  fullName: "Test User",
  full_name: "Test User",
  
  // Contact
  email: "test@example.com",
  phone: "5551234567",
  phoneNumber: "5551234567",
  phone_number: "5551234567",
  tel: "5551234567",
  mobile: "5551234567",
  
  // Demographics
  age: "35",
  dateOfBirth: "1989-06-15",
  dob: "1989-06-15",
  birthdate: "1989-06-15",
  birthday: "06/15/1989",
  
  // Location
  zip: "90210",
  zipCode: "90210",
  zip_code: "90210",
  postal: "90210",
  postalCode: "90210",
  city: "Los Angeles",
  state: "California",
  
  // Physical
  height: "70",
  weight: "180",
  
  // Generic
  username: "testuser",
  password: "TestPass123!",
};

export class AutoFlowEvaluator {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: AutoEvalConfig;
  private evaluationId: string;
  private startTime: number = 0;
  private visitedUrls: Set<string> = new Set();
  private useCloudBrowser: boolean = false;

  constructor(config: AutoEvalConfig) {
    this.config = config;
    this.evaluationId = uuidv4();
    this.useCloudBrowser = !!BROWSERLESS_TOKEN || isServerless;
  }

  async run(onProgress: StreamCallback): Promise<EvaluationReport> {
    this.startTime = Date.now();
    const steps: StepResult[] = [];
    let stepNumber = 0;

    onProgress({
      type: "init",
      evaluationId: this.evaluationId,
      mode: "auto",
      message: "Starting automatic flow evaluation...",
    });

    try {
      // Connect to browser
      if (this.useCloudBrowser && BROWSERLESS_TOKEN) {
        const wsEndpoint = `${BROWSERLESS_URL}?token=${BROWSERLESS_TOKEN}`;
        this.browser = await chromium.connect(wsEndpoint);
        onProgress({ type: "info", message: "Connected to cloud browser" });
      } else if (this.useCloudBrowser && !BROWSERLESS_TOKEN) {
        throw new Error(
          "Cloud browser token not configured. Please add BROWSERLESS_TOKEN to environment variables."
        );
      } else {
        this.browser = await chromium.launch({ headless: true });
      }

      const viewport = viewportSizes[this.config.viewport];
      const context = await this.browser.newContext({
        viewport,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      this.page = await context.newPage();

      // Navigate to start URL
      onProgress({ type: "info", message: `Navigating to ${this.config.startUrl}` });
      await this.page.goto(this.config.startUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Auto-navigate through the flow
      while (stepNumber < this.config.maxSteps) {
        stepNumber++;
        const stepStartTime = Date.now();
        const currentUrl = this.page.url();

        // Check if we've been here before (loop detection)
        if (this.visitedUrls.has(currentUrl) && stepNumber > 1) {
          onProgress({
            type: "info",
            message: "Detected page loop, stopping evaluation",
          });
          break;
        }
        this.visitedUrls.add(currentUrl);

        onProgress({
          type: "step-start",
          stepNumber,
          name: `Step ${stepNumber}`,
          url: currentUrl,
        });

        // Wait for page to stabilize
        await this.page.waitForTimeout(1000);
        await this.waitForPageReady();

        // Collect page data
        const pageData = await this.collectPageData();
        const pageTitle = await this.page.title();
        const h1 = await this.getH1();

        // Take screenshot
        const screenshot = await this.takeScreenshot(stepNumber);

        // Determine step name from page content
        const stepName = h1 || pageTitle || `Step ${stepNumber}`;

        const stepResult: StepResult = {
          stepNumber,
          name: stepName,
          url: currentUrl,
          screenshot,
          pageTitle,
          h1,
          formFields: pageData.formFields,
          buttons: pageData.buttons,
          loadTime: this.formatDuration(Date.now() - stepStartTime),
          timestamp: new Date().toISOString(),
          errors: [],
        };

        steps.push(stepResult);

        onProgress({
          type: "step-complete",
          stepNumber,
          name: stepName,
          url: currentUrl,
          screenshot,
          duration: stepResult.loadTime,
          formFields: pageData.formFields.length,
          buttons: pageData.buttons.length,
        });

        // Check if we should stop (final page indicators)
        if (await this.isEndOfFlow()) {
          onProgress({
            type: "info",
            message: "Reached end of flow (detected final page)",
          });
          break;
        }

        // Try to fill forms if enabled
        if (this.config.autoFillForms) {
          const filled = await this.autoFillForms();
          if (filled > 0) {
            onProgress({
              type: "info",
              message: `Auto-filled ${filled} form field(s)`,
            });
            // Take another screenshot after filling
            await this.page.waitForTimeout(500);
          }
        }

        // Try to click next/continue button
        const clicked = await this.clickNextButton();
        if (!clicked) {
          onProgress({
            type: "info",
            message: "No actionable button found, stopping evaluation",
          });
          break;
        }

        // Wait for navigation or page update
        await this.page.waitForTimeout(2000);
        
        // Check if URL changed or page content updated significantly
        const newUrl = this.page.url();
        if (newUrl === currentUrl) {
          // URL didn't change, check if page content changed
          await this.page.waitForTimeout(1000);
        }
      }

      if (stepNumber >= this.config.maxSteps) {
        onProgress({
          type: "info",
          message: `Reached maximum steps limit (${this.config.maxSteps})`,
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      onProgress({ type: "error", message: errorMessage });

      // Add error step
      steps.push({
        stepNumber: stepNumber + 1,
        name: "Error",
        url: this.page?.url() || this.config.startUrl,
        screenshot: "",
        pageTitle: "",
        formFields: [],
        buttons: [],
        loadTime: "0s",
        timestamp: new Date().toISOString(),
        errors: [errorMessage],
      });
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }

    const totalDuration = this.formatDuration(Date.now() - this.startTime);
    const completedSteps = steps.filter((s) => s.errors.length === 0).length;
    const failedSteps = steps.filter((s) => s.errors.length > 0).length;

    const report: EvaluationReport = {
      id: this.evaluationId,
      flowId: "auto",
      flowName: `Auto: ${this.config.websiteName || new URL(this.config.startUrl).hostname}`,
      websiteName: this.config.websiteName,
      runDate: new Date().toISOString(),
      totalSteps: steps.length,
      completedSteps,
      failedSteps,
      totalDuration,
      viewport: this.config.viewport,
      status: failedSteps > 0 ? (completedSteps > 0 ? "partial" : "failed") : "completed",
      steps,
    };

    // Store report
    reportsStore.set(this.evaluationId, report);

    // Try filesystem storage for local dev
    if (!isServerless) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const reportsDir = path.join(process.cwd(), "public", "reports");
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(reportsDir, `${this.evaluationId}.json`),
          JSON.stringify(report, null, 2)
        );
      } catch {
        // Ignore
      }
    }

    onProgress({
      type: "complete",
      evaluationId: this.evaluationId,
      status: report.status,
      totalSteps: steps.length,
      totalDuration,
    });

    return report;
  }

  private async waitForPageReady(): Promise<void> {
    if (!this.page) return;
    
    try {
      // Wait for network to be mostly idle
      await this.page.waitForLoadState("domcontentloaded", { timeout: 10000 });
      
      // Wait a bit for JavaScript to settle
      await this.page.waitForTimeout(500);
    } catch {
      // Continue even if timeout
    }
  }

  private async isEndOfFlow(): Promise<boolean> {
    if (!this.page) return true;

    // Check for common end-of-flow indicators
    const pageText = await this.page.textContent("body") || "";
    const lowerText = pageText.toLowerCase();

    // Check for stop patterns
    for (const pattern of STOP_PATTERNS) {
      // Look for buttons/links with these texts
      const hasStopButton = await this.page.$(`button:has-text("${pattern}"), a:has-text("${pattern}")`);
      if (hasStopButton) {
        return true;
      }
    }

    // Check for thank you / confirmation pages
    const thankYouPatterns = [
      "thank you",
      "thanks for",
      "we'll be in touch",
      "we will contact",
      "check your email",
      "confirmation",
      "your results",
      "assessment complete",
    ];

    for (const pattern of thankYouPatterns) {
      if (lowerText.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  private async clickNextButton(): Promise<boolean> {
    if (!this.page) return false;

    // Try each button pattern
    for (const pattern of NEXT_BUTTON_PATTERNS) {
      try {
        // Try button elements
        const buttonSelectors = [
          `button:has-text("${pattern}")`,
          `a:has-text("${pattern}")`,
          `[role="button"]:has-text("${pattern}")`,
          `input[type="submit"][value*="${pattern}" i]`,
          `input[type="button"][value*="${pattern}" i]`,
        ];

        for (const selector of buttonSelectors) {
          const element = await this.page.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            const isEnabled = await element.isEnabled();
            
            if (isVisible && isEnabled) {
              // Check it's not a stop pattern
              const text = (await element.textContent() || "").toLowerCase();
              const isStopButton = STOP_PATTERNS.some((sp) => text.includes(sp));
              
              if (!isStopButton) {
                await element.click();
                return true;
              }
            }
          }
        }
      } catch {
        // Continue to next pattern
      }
    }

    // Fallback: try to find any prominent button
    try {
      const fallbackSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button.primary',
        'button.btn-primary',
        'a.btn-primary',
        'button.cta',
        'a.cta',
      ];

      for (const selector of fallbackSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          const isEnabled = await element.isEnabled();
          const text = (await element.textContent() || "").toLowerCase();
          
          // Make sure it's not a stop button
          const isStopButton = STOP_PATTERNS.some((sp) => text.includes(sp));
          
          if (isVisible && isEnabled && !isStopButton) {
            await element.click();
            return true;
          }
        }
      }
    } catch {
      // Ignore
    }

    // Last resort: try clicking any visible radio button or checkbox (for selection pages)
    try {
      const radioOrCheck = await this.page.$('input[type="radio"]:not(:checked), input[type="checkbox"]:not(:checked)');
      if (radioOrCheck) {
        const isVisible = await radioOrCheck.isVisible();
        if (isVisible) {
          await radioOrCheck.click();
          await this.page.waitForTimeout(500);
          // After selecting, try to find a submit button again
          return await this.clickNextButton();
        }
      }
    } catch {
      // Ignore
    }

    return false;
  }

  private async autoFillForms(): Promise<number> {
    if (!this.page) return 0;

    let filledCount = 0;
    const testData = { ...DEFAULT_TEST_DATA, ...this.config.testData };

    try {
      // Get all input fields
      const inputs = await this.page.$$('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="radio"]):not([type="checkbox"]), textarea, select');

      for (const input of inputs) {
        try {
          const isVisible = await input.isVisible();
          if (!isVisible) continue;

          const tagName = await input.evaluate((el) => el.tagName.toLowerCase());
          const type = await input.getAttribute("type") || "text";
          const name = await input.getAttribute("name") || "";
          const id = await input.getAttribute("id") || "";
          const placeholder = await input.getAttribute("placeholder") || "";
          const currentValue = await input.inputValue().catch(() => "");

          // Skip if already filled
          if (currentValue && currentValue.length > 0) continue;

          // Find matching test data
          let value = "";
          const identifier = (name || id || placeholder).toLowerCase();

          // Try exact matches first
          for (const [key, val] of Object.entries(testData)) {
            if (identifier.includes(key.toLowerCase()) || key.toLowerCase().includes(identifier)) {
              value = val;
              break;
            }
          }

          // Fallback based on input type
          if (!value) {
            if (type === "email" || identifier.includes("email")) {
              value = testData.email;
            } else if (type === "tel" || identifier.includes("phone") || identifier.includes("tel")) {
              value = testData.phone;
            } else if (type === "date" || identifier.includes("birth") || identifier.includes("dob")) {
              value = testData.dateOfBirth;
            } else if (identifier.includes("zip") || identifier.includes("postal")) {
              value = testData.zip;
            } else if (identifier.includes("name")) {
              if (identifier.includes("first")) {
                value = testData.firstName;
              } else if (identifier.includes("last")) {
                value = testData.lastName;
              } else {
                value = testData.name;
              }
            }
          }

          if (value && tagName !== "select") {
            await input.fill(value);
            filledCount++;
          } else if (tagName === "select") {
            // For select, try to pick the first non-empty option
            const options = await input.$$("option");
            if (options.length > 1) {
              const secondOption = options[1];
              const optionValue = await secondOption.getAttribute("value");
              if (optionValue) {
                await input.selectOption(optionValue);
                filledCount++;
              }
            }
          }
        } catch {
          // Continue to next input
        }
      }
    } catch {
      // Ignore form filling errors
    }

    return filledCount;
  }

  private async collectPageData(): Promise<{
    formFields: FormField[];
    buttons: string[];
  }> {
    if (!this.page) return { formFields: [], buttons: [] };

    const formFields = await this.page.$$eval("input, select, textarea", (elements) =>
      elements
        .map((el) => {
          const input = el as HTMLInputElement;
          return {
            name: input.name || input.id || input.placeholder || "unnamed",
            type: input.type || el.tagName.toLowerCase(),
            required: input.required,
            placeholder: input.placeholder,
          };
        })
        .filter((f) => f.type !== "hidden" && f.name !== "unnamed")
    );

    const buttons = await this.page.$$eval(
      'button, input[type="submit"], a.btn, a.button, [role="button"]',
      (elements) =>
        elements
          .map((el) => el.textContent?.trim() || "")
          .filter((text) => text.length > 0 && text.length < 50)
    );

    return { formFields, buttons: [...new Set(buttons)] };
  }

  private async getH1(): Promise<string | undefined> {
    if (!this.page) return undefined;
    return await this.page.$eval("h1", (el) => el.textContent?.trim()).catch(() => undefined);
  }

  private async takeScreenshot(stepNumber: number): Promise<string> {
    if (!this.page) return "";

    const screenshotBuffer = await this.page.screenshot({
      fullPage: this.config.screenshotMode === "fullpage",
    });

    const base64 = screenshotBuffer.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    const screenshotKey = `/screenshots/${this.evaluationId}/step-${stepNumber}.png`;
    screenshotsStore.set(screenshotKey, dataUrl);

    // Also save to filesystem if available
    if (!isServerless) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const dir = path.join(process.cwd(), "public", "screenshots", this.evaluationId);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(path.join(dir, `step-${stepNumber}.png`), screenshotBuffer);
      } catch {
        // Ignore
      }
    }

    return screenshotKey;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}

export async function runAutoEvaluation(
  config: AutoEvalConfig,
  onProgress: StreamCallback
): Promise<EvaluationReport> {
  const evaluator = new AutoFlowEvaluator(config);
  return evaluator.run(onProgress);
}

