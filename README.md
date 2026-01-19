# Universal Flow Evaluator

A web application for tracking and documenting any website's user evaluation flows. Create custom evaluation flows with a visual builder — no coding required.

## Features

- **Visual Flow Builder** - Create evaluation flows for any website using a no-code interface
- **Automated Screenshot Capture** - Takes full-page screenshots at every step
- **Page Metadata Collection** - Collects titles, forms, buttons, load times, and all page elements
- **Visual Reports** - Step-by-step visual reports with timeline view and summary stats
- **Error Detection** - Automatically detects and highlights errors or issues
- **Test Data Support** - Define custom test data fields to fill forms during evaluation
- **Multiple Viewports** - Test on desktop, tablet, and mobile viewports

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install chromium
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

### 1. Create a Flow

1. Click **"Create New Flow"** on the dashboard
2. Enter the website URL you want to evaluate
3. Add steps using the visual builder:
   - **Navigate** - Go to a URL
   - **Click** - Click buttons, links, or elements
   - **Fill Input** - Fill form fields (with optional test data)
   - **Select Option** - Choose dropdown options
   - **Check/Toggle** - Check checkboxes or radio buttons
   - **Wait** - Wait for elements or time delays
   - **Scroll To** - Scroll to specific elements

4. Save your flow

### 2. Run Evaluation

1. Select your flow from the dashboard
2. Choose viewport size (desktop, tablet, mobile)
3. Enable "Fill Test Data" if you want to populate forms
4. Click **"Start Evaluation"**

### 3. Review Report

- View screenshots from each step
- See page metadata (title, forms, buttons)
- Check load times and errors
- Export reports as JSON

## Project Structure

```
/src
  /app
    /api
      /flows              # Flow CRUD API
      /run-evaluation     # Evaluation execution API
      /get-report         # Report retrieval API
      /get-reports        # Reports listing API
    /flows
      /new                # Create new flow page
      /[id]/edit          # Edit flow page
    /evaluate             # Run evaluation page
    /report/[id]          # View report page
    page.tsx              # Dashboard
  /components
    FlowBuilder.tsx       # Visual flow builder component
    Header.tsx            # Navigation header
    FlowCard.tsx          # Flow display card
    ...
  /lib
    dynamicEvaluator.ts   # Playwright evaluation engine
    flowStorage.ts        # Flow storage utilities
    types.ts              # TypeScript types
/data
  /flows                  # Flow definitions (JSON)
/public
  /reports                # Generated reports
  /screenshots            # Captured screenshots
```

## Step Action Types

| Action | Description | Parameters |
|--------|-------------|------------|
| `navigate` | Go to a URL | `value`: URL to navigate to |
| `click` | Click an element | `selector`: CSS selector |
| `fill` | Fill a form field | `selector`, `value` or `testDataKey` |
| `select` | Select dropdown option | `selector`, `value` |
| `check` | Check checkbox/radio | `selector` |
| `wait` | Wait for element/time | `selector` or `waitTime` (ms) |
| `scroll` | Scroll to element | `selector` |
| `screenshot` | Capture only | (no parameters) |

## CSS Selector Tips

Use these patterns for selectors:
- `#submit-btn` - ID selector
- `.next-button` - Class selector
- `button[type="submit"]` - Attribute selector
- `a:has-text("Continue")` - Text content
- `input[name="email"]` - Form field by name
- `.form-container button` - Nested elements

## Deployment

### Vercel (UI Only)

The UI works on Vercel, but Playwright evaluations won't run in serverless environments.

```bash
npx vercel --prod
```

### Full Functionality

For full evaluation support, run locally or deploy to:
- A VPS (DigitalOcean, Linode, etc.)
- Railway
- Render
- Any server that can run Node.js + Playwright

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BROWSERLESS_API_KEY` | (Optional) For cloud browser support |

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Playwright** - Browser automation
- **Lucide React** - Icons

## Future Enhancements

- Flow recording (record by clicking)
- Scheduled evaluations
- Slack/webhook notifications
- Diff comparison between runs
- Performance benchmarking
- Team collaboration

## License

MIT
