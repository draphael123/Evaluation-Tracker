# Fountain Flow Evaluator

A web application for tracking and documenting user evaluation flows for TRT/HRT services on Fountain (fountain.net). This tool helps teams understand and monitor the patient onboarding experience.

## Features

- **Automated Screenshot Capture** - Takes full-page screenshots at every step of the patient journey
- **Page Metadata Collection** - Collects titles, forms, buttons, load times, and all page elements
- **Visual Reports** - Step-by-step visual reports with timeline view and summary stats
- **Error Detection** - Automatically detects and highlights errors, broken elements, or issues
- **Run Comparison** - Compare evaluations over time to detect UI changes and regressions
- **Multiple Flow Support** - Evaluate Men's TRT and Women's HRT flows

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

## Project Structure

```
/src
  /app
    /api
      /run-evaluation     # API endpoint to trigger evaluations
      /get-report         # API endpoint to get a single report
      /get-reports        # API endpoint to list all reports
    /evaluate             # Run evaluation page
    /report/[id]          # View specific report page
    page.tsx              # Landing page
    layout.tsx            # Root layout
    globals.css           # Global styles
  /components
    Header.tsx            # Navigation header
    FlowCard.tsx          # Flow selection card
    FeatureCard.tsx       # Feature description card
    StepIndicator.tsx     # How it works steps
    RecentEvaluations.tsx # Recent runs table
  /lib
    evaluator.ts          # Playwright flow runner
    types.ts              # TypeScript types
    /flows
      index.ts            # Flow exports
      mens-trt.ts         # Men's TRT flow definition
      womens-hrt.ts       # Women's HRT flow definition
/public
  /reports                # Generated JSON reports
  /screenshots            # Screenshot storage
```

## How It Works

### 1. Configure

Select which flow to evaluate (Men's TRT or Women's HRT), choose viewport size (desktop, tablet, or mobile), and optionally enable test data filling.

### 2. Run

The tool uses Playwright to automatically navigate through the evaluation flow:
- Visits each step of the patient journey
- Captures screenshots at every page
- Collects page metadata (forms, buttons, load times)
- Detects any errors or issues

### 3. Review

View a comprehensive visual report with:
- Summary statistics (steps completed, duration, status)
- Screenshot gallery for each step
- Detailed metadata for every page
- Error highlighting and detection

## Configuration Options

- **Flow Type**: Select Men's TRT or Women's HRT evaluation
- **Viewport Size**: Desktop (1920×1080), Tablet (768×1024), or Mobile (375×812)
- **Screenshot Mode**: Viewport only or full page capture
- **Fill Test Data**: Automatically fill forms with test data during evaluation

## Flow Definitions

Flow definitions are located in `/src/lib/flows/`. Each flow file contains:

- Start URL
- Step definitions with:
  - Step name
  - Element selectors to wait for
  - Actions to perform (clicking buttons, filling forms)
  - Validation functions

### Customizing Flows

To update flow definitions based on actual site structure:

1. Visit fountain.net manually and document the evaluation flow
2. Update selectors in the flow definition files
3. Add or remove steps as needed
4. Test the updated flow

## API Endpoints

### POST /api/run-evaluation

Starts a new evaluation. Returns a stream of progress updates.

**Request Body:**
```json
{
  "flowType": "mens-trt",
  "fillTestData": false,
  "screenshotMode": "viewport",
  "viewport": "desktop",
  "testData": {
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phone": "555-123-4567",
    "dateOfBirth": "1985-06-15",
    "state": "California"
  }
}
```

### GET /api/get-reports

Returns a list of all evaluation reports.

### GET /api/get-report?id={evaluationId}

Returns a specific evaluation report by ID.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Playwright** - Browser automation
- **Lucide React** - Icons

## Future Enhancements

- Scheduled automatic evaluations (daily/weekly)
- Slack notifications when evaluations complete
- Diff comparison between runs (detect UI changes)
- Performance benchmarking over time
- Multiple environment support (staging vs production)

## License

Internal tool - proprietary
