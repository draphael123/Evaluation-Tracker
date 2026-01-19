import { FlowDefinition, FlowConfig } from "../types";

/**
 * Women's HRT (Hormone Replacement Therapy) Evaluation Flow
 * 
 * This flow definition maps out the expected steps in Fountain's
 * HRT evaluation process for women. Selectors and actions will need
 * to be updated based on the actual site structure.
 */

export const womensHrtFlow: FlowDefinition = {
  flowType: "womens-hrt",
  flowName: "Women's HRT Evaluation",
  startUrl: "https://fountain.net",
  steps: [
    {
      name: "Landing Page",
      url: "https://fountain.net",
      waitFor: "body",
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        // Look for HRT/Women's Health entry points
        const possibleSelectors = [
          'a[href*="hrt"]',
          'a[href*="hormone"]',
          'a[href*="menopause"]',
          'a:has-text("Women\'s Health")',
          '[data-testid="hrt-cta"]',
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
        
        const getStarted = await page.$('text=Get Started');
        if (getStarted) {
          await getStarted.click();
        }
      },
    },
    {
      name: "HRT Information Page",
      waitFor: "body",
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
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
      name: "Menopause Symptom Assessment",
      waitFor: 'form, [role="form"], .questionnaire',
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        if (config.fillTestData) {
          // Select menopause symptoms
          const checkboxes = await page.$$('input[type="checkbox"]');
          if (checkboxes.length > 0) {
            for (let i = 0; i < Math.min(4, checkboxes.length); i++) {
              await checkboxes[i].click();
            }
          }
          
          const radios = await page.$$('input[type="radio"]');
          if (radios.length > 0) {
            await radios[0].click();
          }
        }
        
        const nextButton = await page.$('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]');
        if (nextButton) {
          await nextButton.click();
        }
      },
    },
    {
      name: "Symptom Severity",
      waitFor: 'form, [role="form"]',
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        if (config.fillTestData) {
          // Rate symptom severity
          const rangeInputs = await page.$$('input[type="range"]');
          for (const input of rangeInputs) {
            await input.fill("6");
          }
          
          const selects = await page.$$('select');
          for (const select of selects) {
            const options = await select.$$('option');
            if (options.length > 1) {
              await select.selectOption({ index: 2 });
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
      name: "Menstrual History",
      waitFor: 'form, [role="form"]',
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        if (config.fillTestData) {
          // Fill menstrual history questions
          const lastPeriod = await page.$('input[type="date"], input[name*="period"], input[name*="menstrual"]');
          if (lastPeriod) await lastPeriod.fill("2024-06-15");
          
          // Regularity questions
          const irregularRadio = await page.$('input[value="irregular"], label:has-text("Irregular")');
          if (irregularRadio) await irregularRadio.click();
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
          const heightInput = await page.$('input[name*="height"], input[placeholder*="height"]');
          if (heightInput) await heightInput.fill("5'6\"");
          
          const weightInput = await page.$('input[name*="weight"], input[placeholder*="weight"]');
          if (weightInput) await weightInput.fill("145");
          
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
      name: "Family History",
      waitFor: 'form, [role="form"]',
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        if (config.fillTestData) {
          // Breast cancer history questions
          const noHistory = await page.$('input[value="no"], label:has-text("No family history")');
          if (noHistory) await noHistory.click();
        }
        
        const nextButton = await page.$('button:has-text("Next"), button:has-text("Continue"), button[type="submit"]');
        if (nextButton) {
          await nextButton.click();
        }
      },
    },
    {
      name: "Current Medications",
      waitFor: 'form, [role="form"]',
      action: async (page, config) => {
        await page.waitForLoadState("networkidle");
        
        if (config.fillTestData) {
          const noMeds = await page.$('input[value="none"], input[value="no"], label:has-text("None")');
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
        // Don't submit - capture final review page
      },
      validate: async (page) => {
        const errors: string[] = [];
        
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

export default womensHrtFlow;

