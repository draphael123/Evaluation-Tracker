import { chromium, Browser, Page } from "playwright";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import {
  FlowConfig,
  FlowDefinition,
  StepResult,
  EvaluationReport,
  FormField,
  viewportSizes,
} from "./types";
import { getFlow } from "./flows";

export interface StreamCallback {
  (data: {
    type: string;
    [key: string]: any;
  }): void;
}

export class FlowEvaluator {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: FlowConfig;
  private flow: FlowDefinition;
  private evaluationId: string;
  private screenshotsDir: string;
  private reportsDir: string;
  private startTime: number = 0;

  constructor(config: FlowConfig) {
    this.config = config;
    const flow = getFlow(config.flowType);
    if (!flow) {
      throw new Error(`Unknown flow type: ${config.flowType}`);
    }
    this.flow = flow;
    this.evaluationId = uuidv4();
    
    // Set up directories
    this.screenshotsDir = path.join(process.cwd(), "public", "screenshots", this.evaluationId);
    this.reportsDir = path.join(process.cwd(), "public", "reports");
    
    // Ensure directories exist
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async run(onProgress: StreamCallback): Promise<EvaluationReport> {
    this.startTime = Date.now();
    const steps: StepResult[] = [];
    let completedSteps = 0;
    let failedSteps = 0;

    // Send initialization data
    onProgress({
      type: "init",
      evaluationId: this.evaluationId,
      flowType: this.flow.flowType,
      flowName: this.flow.flowName,
      steps: this.flow.steps.map((s) => s.name),
    });

    try {
      // Launch browser
      this.browser = await chromium.launch({
        headless: true,
      });

      const viewport = viewportSizes[this.config.viewport];
      const context = await this.browser.newContext({
        viewport,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      this.page = await context.newPage();

      // Navigate to start URL
      await this.page.goto(this.flow.startUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      // Process each step
      for (let i = 0; i < this.flow.steps.length; i++) {
        const stepDef = this.flow.steps[i];
        const stepNumber = i + 1;
        const stepStartTime = Date.now();

        onProgress({
          type: "step-start",
          stepNumber,
          name: stepDef.name,
        });

        try {
          // Wait for expected element if specified
          if (stepDef.waitFor) {
            try {
              await this.page.waitForSelector(stepDef.waitFor, { timeout: 10000 });
            } catch {
              // Continue even if wait fails
            }
          }

          // Collect page data
          const pageData = await this.collectPageData(this.page);

          // Take screenshot
          const screenshotPath = await this.takeScreenshot(this.page, stepNumber);

          // Execute step action if defined
          if (stepDef.action) {
            await stepDef.action(this.page, this.config);
            // Wait for navigation or network activity
            await this.page.waitForTimeout(1000);
          }

          // Validate if validator exists
          const errors: string[] = [];
          if (stepDef.validate) {
            const validationErrors = await stepDef.validate(this.page);
            errors.push(...validationErrors);
          }

          const stepEndTime = Date.now();
          const duration = this.formatDuration(stepEndTime - stepStartTime);

          const stepResult: StepResult = {
            stepNumber,
            name: stepDef.name,
            url: this.page.url(),
            screenshot: `/screenshots/${this.evaluationId}/step-${stepNumber}.png`,
            pageTitle: pageData.title,
            h1: pageData.h1,
            formFields: pageData.formFields,
            buttons: pageData.buttons,
            loadTime: duration,
            timestamp: new Date().toISOString(),
            errors,
          };

          steps.push(stepResult);
          completedSteps++;

          onProgress({
            type: "step-complete",
            stepNumber,
            name: stepDef.name,
            url: stepResult.url,
            screenshot: stepResult.screenshot,
            duration,
          });
        } catch (error) {
          failedSteps++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";

          // Try to capture screenshot even on error
          let screenshotPath = "";
          try {
            screenshotPath = await this.takeScreenshot(this.page, stepNumber);
          } catch {
            // Ignore screenshot error
          }

          const stepResult: StepResult = {
            stepNumber,
            name: stepDef.name,
            url: this.page.url(),
            screenshot: screenshotPath ? `/screenshots/${this.evaluationId}/step-${stepNumber}.png` : "",
            pageTitle: await this.page.title().catch(() => ""),
            formFields: [],
            buttons: [],
            loadTime: this.formatDuration(Date.now() - stepStartTime),
            timestamp: new Date().toISOString(),
            errors: [errorMessage],
          };

          steps.push(stepResult);

          onProgress({
            type: "step-error",
            stepNumber,
            name: stepDef.name,
            error: errorMessage,
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      onProgress({
        type: "error",
        message: errorMessage,
      });
    } finally {
      // Close browser
      if (this.browser) {
        await this.browser.close();
      }
    }

    // Generate report
    const totalDuration = this.formatDuration(Date.now() - this.startTime);
    const report: EvaluationReport = {
      id: this.evaluationId,
      flowType: this.flow.flowType,
      flowName: this.flow.flowName,
      runDate: new Date().toISOString(),
      totalSteps: this.flow.steps.length,
      completedSteps,
      failedSteps,
      totalDuration,
      viewport: this.config.viewport,
      status: failedSteps > 0 ? (completedSteps > 0 ? "partial" : "failed") : "completed",
      steps,
    };

    // Save report to file
    const reportPath = path.join(this.reportsDir, `${this.evaluationId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    onProgress({
      type: "complete",
      evaluationId: this.evaluationId,
      status: report.status,
      totalDuration,
    });

    return report;
  }

  private async collectPageData(page: Page): Promise<{
    title: string;
    h1: string | undefined;
    formFields: FormField[];
    buttons: string[];
  }> {
    const title = await page.title();

    const h1 = await page.$eval("h1", (el) => el.textContent?.trim()).catch(() => undefined);

    const formFields = await page.$$eval(
      "input, select, textarea",
      (elements) =>
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

    const buttons = await page.$$eval(
      'button, input[type="submit"], a.btn, a.button, [role="button"]',
      (elements) =>
        elements
          .map((el) => el.textContent?.trim() || "")
          .filter((text) => text.length > 0 && text.length < 50)
    );

    return {
      title,
      h1,
      formFields,
      buttons: [...new Set(buttons)], // Remove duplicates
    };
  }

  private async takeScreenshot(page: Page, stepNumber: number): Promise<string> {
    const filename = `step-${stepNumber}.png`;
    const filepath = path.join(this.screenshotsDir, filename);

    await page.screenshot({
      path: filepath,
      fullPage: this.config.screenshotMode === "fullpage",
    });

    return filepath;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}

export async function runEvaluation(
  config: FlowConfig,
  onProgress: StreamCallback
): Promise<EvaluationReport> {
  const evaluator = new FlowEvaluator(config);
  return evaluator.run(onProgress);
}

