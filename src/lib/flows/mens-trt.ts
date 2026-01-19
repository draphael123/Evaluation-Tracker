import { FlowDefinition, FlowConfig } from "../types";

/**
 * Men's TRT (Testosterone Replacement Therapy) Evaluation Flow
 * 
 * This flow definition maps out the expected steps in Fountain's
 * TRT evaluation process. Selectors and actions will need to be
 * updated based on the actual site structure.
 * 
 * To map out the actual flow:
 * 1. Visit fountain.net
 * 2. Navigate to the TRT evaluation entry point
 * 3. Document each step's URL, selectors, and form fields
 */

export const mensTrtFlow: FlowDefinition = {
  flowType: "mens-trt",
  flowName: "Men's TRT Evaluation",
  startUrl: "https://fountain.net",
  steps: [
    {
      name: "Landing Page",
      url: "https://fountain.net",
      waitFor: "body",
      action: async (page, config) => {
        // Wait for page to load completely
        await page.waitForLoadState("networkidle");
        
        // Look for TRT-related entry points
        // These selectors will need to be updated based on actual site
        const possibleSelectors = [
          'a[href*="trt"]',
          'a[href*="testosterone"]',
          'button:has-text("Get Started")',
          'a:has-text("Men\'s Health")',
          '[data-testid="trt-cta"]',
        ];
        
        for (const selector of possibleSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              await element.click();
              return;
            }
          } catch {
            // Continue to next selector
          }
        }
        
        // If no specific TRT link found, look for general "Get Started" button
        const getStarted = await page.$('text=Get Started');
        if (getStarted) {
          await getStarted.click();
        }
      },
    },
    {
      name: "TRT Information Page",
      waitFor: "body",
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        // Look for "Start Evaluation" or similar CTA
        const ctaSelectors = [
          'button:has-text("Start")',
          'a:has-text("Begin Evaluation")',
          'button:has-text("Take Quiz")',
          '[data-testid="start-evaluation"]',
        ];
        
        for (const selector of ctaSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              await element.click();
              return;
            }
          } catch {
            // Continue
          }
        }
      },
    },
    {
      name: "Symptom Assessment - Part 1",
      waitFor: 'form, [role="form"], .questionnaire',
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        if (config.fillTestData) {
          // Select common symptoms - these need actual selectors
          const checkboxes = await page.$$('input[type="checkbox"]');
          if (checkboxes.length > 0) {
            // Select first few symptoms as test data
            for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
              await checkboxes[i].click();
            }
          }
          
          // Handle radio buttons
          const radios = await page.$$('input[type="radio"]');
          if (radios.length > 0) {
            await radios[0].click();
          }
        }
        
        // Click next/continue
        const nextButton = await page.$('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]');
        if (nextButton) {
          await nextButton.click();
        }
      },
    },
    {
      name: "Symptom Assessment - Part 2",
      waitFor: 'form, [role="form"]',
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        if (config.fillTestData) {
          // Answer severity questions
          const rangeInputs = await page.$$('input[type="range"]');
          for (const input of rangeInputs) {
            await input.fill("5");
          }
          
          // Handle select dropdowns
          const selects = await page.$$('select');
          for (const select of selects) {
            const options = await select.$$('option');
            if (options.length > 1) {
              await select.selectOption({ index: 1 });
            }
          }
        }
        
        const nextButton = await page.$('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]');
        if (nextButton) {
          await nextButton.click();
        }
      },
    },
    {
      name: "Health History",
      waitFor: 'form, [role="form"]',
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        if (config.fillTestData) {
          // Fill health history fields
          const heightInput = await page.$('input[name*="height"], input[placeholder*="height"]');
          if (heightInput) await heightInput.fill("5'10\"");
          
          const weightInput = await page.$('input[name*="weight"], input[placeholder*="weight"]');
          if (weightInput) await weightInput.fill("180");
          
          // Medical conditions - typically checkboxes or radio
          const noConditions = await page.$('input[value="none"], input[value="no"], label:has-text("None")');
          if (noConditions) await noConditions.click();
        }
        
        const nextButton = await page.$('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]');
        if (nextButton) {
          await nextButton.click();
        }
      },
    },
    {
      name: "Medications",
      waitFor: 'form, [role="form"]',
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        if (config.fillTestData) {
          // Typically asking about current medications
          const noMeds = await page.$('input[value="none"], input[value="no"], label:has-text("None"), label:has-text("No medications")');
          if (noMeds) await noMeds.click();
          
          const textArea = await page.$('textarea');
          if (textArea) {
            await textArea.fill("No current medications");
          }
        }
        
        const nextButton = await page.$('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]');
        if (nextButton) {
          await nextButton.click();
        }
      },
    },
    {
      name: "Personal Information",
      waitFor: 'form, [role="form"]',
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        if (config.fillTestData) {
          const { testData } = config;
          
          // Fill personal info fields
          const firstNameInput = await page.$('input[name*="first"], input[placeholder*="First"]');
          if (firstNameInput) await firstNameInput.fill(testData.firstName);
          
          const lastNameInput = await page.$('input[name*="last"], input[placeholder*="Last"]');
          if (lastNameInput) await lastNameInput.fill(testData.lastName);
          
          const emailInput = await page.$('input[type="email"], input[name*="email"]');
          if (emailInput) await emailInput.fill(testData.email);
          
          const phoneInput = await page.$('input[type="tel"], input[name*="phone"]');
          if (phoneInput) await phoneInput.fill(testData.phone);
          
          const dobInput = await page.$('input[type="date"], input[name*="birth"], input[name*="dob"]');
          if (dobInput) await dobInput.fill(testData.dateOfBirth);
          
          // State selection
          const stateSelect = await page.$('select[name*="state"]');
          if (stateSelect) {
            await stateSelect.selectOption({ label: testData.state });
          }
        }
        
        const nextButton = await page.$('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]');
        if (nextButton) {
          await nextButton.click();
        }
      },
    },
    {
      name: "Review & Submit",
      waitFor: 'body',
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        // Don't actually submit - just capture the review page
        // This is the end of the evaluation for documentation purposes
      },
      validate: async (page) => {
        const errors: string[] = [];
        
        // Check for error messages
        const errorElements = await page.$$('.error, .error-message, [role="alert"]');
        for (const el of errorElements) {
          const text = await el.textContent();
          if (text) errors.push(text);
        }
        
        return errors;
      },
    },
  ],
};

export default mensTrtFlow;

