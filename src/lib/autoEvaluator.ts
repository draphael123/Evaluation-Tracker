import { chromium, Browser, Page } from "playwright";
import { v4 as uuidv4 } from "uuid";
import {
  StepResult,
  EvaluationReport,
  FormField,
  viewportSizes,
} from "./types";
import { saveReport, isDatabaseConfigured } from "./db";

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

// Common button/link text patterns for navigation (in priority order)
const NEXT_BUTTON_PATTERNS = [
  "get started",
  "start",
  "begin",
  "let's go",
  "take assessment",
  "start assessment",
  "begin assessment",
  "take quiz",
  "start quiz",
  "next",
  "continue",
  "proceed",
  "submit",
  "send",
  "confirm",
  "done",
  "finish",
  "complete",
  "tap here",
  "click here",
  "i agree",
  "accept",
  "okay",
  "ok",
  "yes",
  "got it",
];

// Patterns indicating final/stop pages
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
];

// Blocking patterns - things that require human intervention
const BLOCKING_PATTERNS = {
  // Two-factor authentication
  twoFactor: [
    "two-factor",
    "two factor",
    "2fa",
    "2-fa",
    "authenticator",
    "verification code",
    "security code",
    "enter the code",
    "enter code",
    "6-digit code",
    "6 digit code",
    "one-time password",
    "one time password",
    "otp",
  ],
  // Email verification
  emailVerification: [
    "verify your email",
    "check your email",
    "email verification",
    "confirm your email",
    "we sent you an email",
    "we've sent you an email",
    "sent a verification",
    "sent you a link",
    "click the link in your email",
    "check your inbox",
    "verification link",
  ],
  // SMS/Phone verification
  smsVerification: [
    "verify your phone",
    "verify phone number",
    "sms verification",
    "text verification",
    "we sent a code to",
    "sent to your phone",
    "enter the code we sent",
    "code sent to",
    "verification text",
  ],
  // CAPTCHA
  captcha: [
    "captcha",
    "i'm not a robot",
    "i am not a robot",
    "prove you're human",
    "prove you are human",
    "human verification",
    "security check",
    "recaptcha",
    "hcaptcha",
    "cloudflare",
  ],
  // Login required
  loginRequired: [
    "please log in",
    "please login",
    "please sign in",
    "you must be logged in",
    "login required",
    "sign in required",
    "authentication required",
    "access denied",
    "unauthorized",
    "session expired",
  ],
  // Account/signup walls
  accountWall: [
    "create an account to continue",
    "sign up to continue",
    "register to continue",
    "join to continue",
    "create account to",
    "sign up to see",
    "register to see",
  ],
};

interface BlockingResult {
  isBlocked: boolean;
  reason: string;
  type: string;
}

// Default test data for form filling
const DEFAULT_TEST_DATA: Record<string, string> = {
  firstName: "Test",
  first_name: "Test",
  fname: "Test",
  lastName: "User",
  last_name: "User",
  lname: "User",
  name: "Test User",
  fullName: "Test User",
  full_name: "Test User",
  email: "test@example.com",
  phone: "5551234567",
  phoneNumber: "5551234567",
  phone_number: "5551234567",
  tel: "5551234567",
  mobile: "5551234567",
  age: "35",
  dateOfBirth: "1989-06-15",
  dob: "1989-06-15",
  birthdate: "1989-06-15",
  birthday: "06/15/1989",
  zip: "90210",
  zipCode: "90210",
  zip_code: "90210",
  postal: "90210",
  postalCode: "90210",
  city: "Los Angeles",
  state: "California",
  height: "70",
  weight: "180",
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
  private pageContentHashes: Set<string> = new Set();
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

      // Main evaluation loop
      while (stepNumber < this.config.maxSteps) {
        stepNumber++;
        const stepStartTime = Date.now();

        // Wait for page to stabilize
        await this.page.waitForTimeout(1500);
        await this.waitForPageReady();

        const currentUrl = this.page.url();
        const pageHash = await this.getPageContentHash();

        // Loop detection - check if we've seen this exact page state before
        if (this.pageContentHashes.has(pageHash) && stepNumber > 2) {
          onProgress({
            type: "info",
            message: "Detected page loop (same content), stopping evaluation",
          });
          break;
        }
        this.pageContentHashes.add(pageHash);
        this.visitedUrls.add(currentUrl);

        onProgress({
          type: "step-start",
          stepNumber,
          name: `Step ${stepNumber}`,
          url: currentUrl,
        });

        // Collect page data BEFORE any interaction
        const pageData = await this.collectPageData();
        const pageTitle = await this.page.title();
        const h1 = await this.getH1();
        const stepName = h1 || pageTitle || `Step ${stepNumber}`;

        // Take screenshot of current state
        const screenshot = await this.takeScreenshot(stepNumber);

        // Create step result
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

        // Check for blockers (2FA, email verification, CAPTCHA, etc.)
        const blockCheck = await this.checkForBlockers();
        if (blockCheck.isBlocked) {
          onProgress({
            type: "blocked",
            stepNumber,
            reason: blockCheck.reason,
            blockType: blockCheck.type,
          });
          
          // Update the step with the blocking error
          stepResult.errors.push(`BLOCKED: ${blockCheck.reason}`);
          break;
        }

        // Check if we should stop
        if (await this.isEndOfFlow()) {
          onProgress({
            type: "info",
            message: "Reached end of flow (detected final page)",
          });
          break;
        }

        // === INTERACTION PHASE ===
        
        // 1. First, try to select an option if this is a selection/quiz page
        const selectedOption = await this.selectOptionOnPage();
        if (selectedOption) {
          onProgress({
            type: "option-selected",
            stepNumber,
            option: selectedOption,
          });
          await this.page.waitForTimeout(800);
        }

        // 2. Fill any form fields
        let filledCount = 0;
        if (this.config.autoFillForms) {
          filledCount = await this.autoFillForms();
          if (filledCount > 0) {
            onProgress({
              type: "form-filled",
              stepNumber,
              filledFields: filledCount,
            });
            await this.page.waitForTimeout(500);
          }
        }

        // Update step with interaction results
        onProgress({
          type: "step-interaction",
          stepNumber,
          selectedOption,
          filledFields: filledCount,
        });

        // 3. Click next/continue/submit button
        const clicked = await this.clickNextButton();
        if (clicked) {
          onProgress({
            type: "info",
            message: "Clicked next/continue button",
          });
        } else {
          // If no next button, maybe selecting an option auto-advances
          if (!selectedOption) {
            onProgress({
              type: "info",
              message: "No actionable button or option found, stopping evaluation",
            });
            break;
          }
        }

        // Wait for page transition
        await this.page.waitForTimeout(2000);
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
    const blockedSteps = steps.filter((s) => s.errors.some(e => e.startsWith("BLOCKED:"))).length;

    // Determine status
    let status: "completed" | "partial" | "failed" | "blocked" = "completed";
    if (blockedSteps > 0) {
      status = "blocked";
    } else if (failedSteps > 0) {
      status = completedSteps > 0 ? "partial" : "failed";
    }

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
      status,
      steps,
    };

    // Store report in memory (always, as fallback)
    reportsStore.set(this.evaluationId, report);

    // Save to database if configured
    if (isDatabaseConfigured()) {
      try {
        await saveReport(report);
        onProgress({ type: "info", message: "Report saved to database" });
      } catch (error) {
        console.error("Failed to save report to database:", error);
      }
    }

    // Try filesystem for local dev
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

  // Get a hash of the page content to detect loops
  private async getPageContentHash(): Promise<string> {
    if (!this.page) return "";
    try {
      const content = await this.page.evaluate(() => {
        // Get main content area text + URL + form state
        const h1 = document.querySelector("h1")?.textContent || "";
        const h2 = document.querySelector("h2")?.textContent || "";
        const buttons = Array.from(document.querySelectorAll("button")).map(b => b.textContent).join(",");
        return `${window.location.pathname}|${h1}|${h2}|${buttons}`;
      });
      return content;
    } catch {
      return this.page.url();
    }
  }

  private async waitForPageReady(): Promise<void> {
    if (!this.page) return;
    try {
      await this.page.waitForLoadState("domcontentloaded", { timeout: 10000 });
      await this.page.waitForTimeout(500);
    } catch {
      // Continue
    }
  }

  private async isEndOfFlow(): Promise<boolean> {
    if (!this.page) return true;

    // Check for stop buttons
    for (const pattern of STOP_PATTERNS) {
      try {
        const hasStopElement = await this.page.$(`button:has-text("${pattern}"), a:has-text("${pattern}")`);
        if (hasStopElement) {
          const isVisible = await hasStopElement.isVisible();
          if (isVisible) return true;
        }
      } catch {
        // Continue
      }
    }

    // Check for thank you / confirmation content
    const pageText = (await this.page.textContent("body") || "").toLowerCase();
    const endPatterns = [
      "thank you",
      "thanks for",
      "we'll be in touch",
      "we will contact",
      "your results",
      "assessment complete",
      "evaluation complete",
      "you're all set",
      "all done",
    ];

    for (const pattern of endPatterns) {
      if (pageText.includes(pattern)) return true;
    }

    return false;
  }

  // Check if the page has a blocking element that requires human intervention
  private async checkForBlockers(): Promise<BlockingResult> {
    if (!this.page) return { isBlocked: false, reason: "", type: "" };

    try {
      const pageText = (await this.page.textContent("body") || "").toLowerCase();
      const pageTitle = (await this.page.title() || "").toLowerCase();
      const combinedText = pageText + " " + pageTitle;

      // Check each blocking category
      for (const [blockType, patterns] of Object.entries(BLOCKING_PATTERNS)) {
        for (const pattern of patterns) {
          if (combinedText.includes(pattern)) {
            // Map block type to user-friendly message
            const reasons: Record<string, string> = {
              twoFactor: "Two-Factor Authentication (2FA) required",
              emailVerification: "Email verification required",
              smsVerification: "SMS/Phone verification required",
              captcha: "CAPTCHA verification required",
              loginRequired: "Login/Authentication required",
              accountWall: "Account creation required to continue",
            };
            return {
              isBlocked: true,
              reason: reasons[blockType] || "Verification required",
              type: blockType,
            };
          }
        }
      }

      // Also check for specific input fields that indicate blocking
      const blockingInputSelectors = [
        'input[name*="otp"]',
        'input[name*="code"]',
        'input[name*="verification"]',
        'input[placeholder*="verification code"]',
        'input[placeholder*="enter code"]',
        'input[aria-label*="verification"]',
        'input[aria-label*="code"]',
        '[class*="captcha"]',
        '[id*="captcha"]',
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
        'iframe[title*="recaptcha"]',
      ];

      for (const selector of blockingInputSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              return {
                isBlocked: true,
                reason: "Verification input detected (code entry required)",
                type: "verificationInput",
              };
            }
          }
        } catch {
          // Continue
        }
      }

    } catch {
      // If we can't check, assume not blocked
    }

    return { isBlocked: false, reason: "", type: "" };
  }

  // Select an option on quiz/selection pages
  private async selectOptionOnPage(): Promise<string | null> {
    if (!this.page) return null;

    // Common selectors for clickable options in questionnaires
    const optionSelectors = [
      // Radio/checkbox labels
      'label:has(input[type="radio"])',
      'label:has(input[type="checkbox"])',
      // Clickable option cards/divs (common in modern forms)
      '[role="option"]',
      '[role="radio"]',
      '[role="checkbox"]',
      '[data-option]',
      '[data-value]',
      '[data-answer]',
      // Common class patterns for option cards
      '.option-card',
      '.answer-option',
      '.choice-card',
      '.selection-item',
      '.quiz-option',
      '.question-option',
      // Clickable list items that look like options
      'li[class*="option"]',
      'li[class*="choice"]',
      'div[class*="option"]:not(button)',
      'div[class*="choice"]:not(button)',
      // Buttons that are clearly options (not navigation)
      'button[class*="option"]',
      'button[class*="choice"]',
      'button[class*="answer"]',
    ];

    for (const selector of optionSelectors) {
      try {
        const options = await this.page.$$(selector);
        
        for (const option of options) {
          try {
            const isVisible = await option.isVisible();
            if (!isVisible) continue;

            // Check if already selected
            const isSelected = await option.evaluate((el) => {
              const input = el.querySelector('input[type="radio"], input[type="checkbox"]');
              if (input) return (input as HTMLInputElement).checked;
              return el.classList.contains('selected') || 
                     el.classList.contains('active') ||
                     el.getAttribute('aria-selected') === 'true' ||
                     el.getAttribute('data-selected') === 'true';
            });

            if (isSelected) continue;

            // Get the option text
            const optionText = (await option.textContent() || "").trim();
            
            // Skip if it looks like a navigation button
            const lowerText = optionText.toLowerCase();
            const isNavButton = NEXT_BUTTON_PATTERNS.some(p => lowerText === p) ||
                               STOP_PATTERNS.some(p => lowerText.includes(p));
            
            if (isNavButton || optionText.length > 100 || optionText.length < 1) continue;

            // Click the option
            await option.click();
            return optionText.substring(0, 50); // Return truncated option text
          } catch {
            // Continue to next option
          }
        }
      } catch {
        // Continue to next selector
      }
    }

    // Fallback: try to find and click unchecked radio buttons or checkboxes directly
    try {
      const uncheckedInputs = await this.page.$$('input[type="radio"]:not(:checked), input[type="checkbox"]:not(:checked)');
      for (const input of uncheckedInputs) {
        try {
          const isVisible = await input.isVisible();
          if (isVisible) {
            // Try clicking the associated label first
            const id = await input.getAttribute('id');
            if (id) {
              const label = await this.page.$(`label[for="${id}"]`);
              if (label) {
                const labelText = await label.textContent();
                await label.click();
                return labelText?.trim().substring(0, 50) || "Option selected";
              }
            }
            // Fallback to clicking input directly
            await input.click();
            return "Option selected";
          }
        } catch {
          // Continue
        }
      }
    } catch {
      // Ignore
    }

    return null;
  }

  private async clickNextButton(): Promise<boolean> {
    if (!this.page) return false;

    // Try each button pattern
    for (const pattern of NEXT_BUTTON_PATTERNS) {
      try {
        const selectors = [
          `button:has-text("${pattern}")`,
          `a:has-text("${pattern}")`,
          `[role="button"]:has-text("${pattern}")`,
          `input[type="submit"][value*="${pattern}" i]`,
          `input[type="button"][value*="${pattern}" i]`,
        ];

        for (const selector of selectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              const isVisible = await element.isVisible();
              const isEnabled = await element.isEnabled();

              if (isVisible && isEnabled) {
                const text = (await element.textContent() || "").toLowerCase();
                const isStopButton = STOP_PATTERNS.some((sp) => text.includes(sp));

                if (!isStopButton) {
                  await element.click();
                  return true;
                }
              }
            }
          } catch {
            // Continue
          }
        }
      } catch {
        // Continue
      }
    }

    // Fallback: generic submit/primary buttons
    const fallbackSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button.primary',
      'button.btn-primary',
      'a.btn-primary',
      'button.cta',
      'a.cta',
      'button[class*="next"]',
      'button[class*="continue"]',
      'button[class*="submit"]',
      'a[class*="next"]',
      'a[class*="continue"]',
    ];

    for (const selector of fallbackSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const isVisible = await element.isVisible();
          const isEnabled = await element.isEnabled();
          const text = (await element.textContent() || "").toLowerCase();
          const isStopButton = STOP_PATTERNS.some((sp) => text.includes(sp));

          if (isVisible && isEnabled && !isStopButton) {
            await element.click();
            return true;
          }
        }
      } catch {
        // Continue
      }
    }

    return false;
  }

  private async autoFillForms(): Promise<number> {
    if (!this.page) return 0;

    let filledCount = 0;
    const testData = { ...DEFAULT_TEST_DATA, ...this.config.testData };

    try {
      // Get all fillable inputs
      const inputs = await this.page.$$(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="radio"]):not([type="checkbox"]), textarea'
      );

      for (const input of inputs) {
        try {
          const isVisible = await input.isVisible();
          if (!isVisible) continue;

          const type = (await input.getAttribute("type")) || "text";
          const name = (await input.getAttribute("name")) || "";
          const id = (await input.getAttribute("id")) || "";
          const placeholder = (await input.getAttribute("placeholder")) || "";
          const currentValue = await input.inputValue().catch(() => "");

          // Skip if already has value
          if (currentValue && currentValue.length > 0) continue;

          // Find matching test data
          let value = "";
          const identifier = (name + id + placeholder).toLowerCase();

          // Match by identifier
          for (const [key, val] of Object.entries(testData)) {
            if (identifier.includes(key.toLowerCase())) {
              value = val;
              break;
            }
          }

          // Fallback by input type
          if (!value) {
            if (type === "email" || identifier.includes("email")) {
              value = testData.email;
            } else if (type === "tel" || identifier.includes("phone") || identifier.includes("tel")) {
              value = testData.phone;
            } else if (type === "date" || identifier.includes("birth") || identifier.includes("dob")) {
              value = testData.dateOfBirth;
            } else if (identifier.includes("zip") || identifier.includes("postal")) {
              value = testData.zip;
            } else if (identifier.includes("first") && identifier.includes("name")) {
              value = testData.firstName;
            } else if (identifier.includes("last") && identifier.includes("name")) {
              value = testData.lastName;
            } else if (identifier.includes("name")) {
              value = testData.name;
            } else if (identifier.includes("city")) {
              value = testData.city;
            } else if (identifier.includes("state")) {
              value = testData.state;
            } else if (identifier.includes("age")) {
              value = testData.age;
            } else if (identifier.includes("height")) {
              value = testData.height;
            } else if (identifier.includes("weight")) {
              value = testData.weight;
            }
          }

          if (value) {
            await input.fill(value);
            filledCount++;
          }
        } catch {
          // Continue
        }
      }

      // Handle select dropdowns
      const selects = await this.page.$$("select");
      for (const select of selects) {
        try {
          const isVisible = await select.isVisible();
          if (!isVisible) continue;

          // Select first non-empty option
          const options = await select.$$("option");
          if (options.length > 1) {
            const secondOption = options[1];
            const optionValue = await secondOption.getAttribute("value");
            if (optionValue) {
              await select.selectOption(optionValue);
              filledCount++;
            }
          }
        } catch {
          // Continue
        }
      }
    } catch {
      // Ignore
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

    // Save to filesystem if available
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
