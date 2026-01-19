import { sql } from "@vercel/postgres";
import { EvaluationReport, StepResult } from "./types";

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Create reports table
    await sql`
      CREATE TABLE IF NOT EXISTS reports (
        id VARCHAR(255) PRIMARY KEY,
        flow_id VARCHAR(255) NOT NULL,
        flow_name VARCHAR(500) NOT NULL,
        website_name VARCHAR(500),
        run_date TIMESTAMP NOT NULL,
        total_steps INTEGER NOT NULL,
        completed_steps INTEGER NOT NULL,
        failed_steps INTEGER NOT NULL,
        total_duration VARCHAR(50),
        viewport VARCHAR(50),
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create steps table
    await sql`
      CREATE TABLE IF NOT EXISTS steps (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(255) NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        step_number INTEGER NOT NULL,
        name VARCHAR(500) NOT NULL,
        url TEXT,
        screenshot TEXT,
        page_title VARCHAR(500),
        h1 VARCHAR(500),
        form_fields JSONB,
        buttons JSONB,
        load_time VARCHAR(50),
        timestamp TIMESTAMP,
        errors JSONB,
        notes TEXT,
        UNIQUE(report_id, step_number)
      )
    `;

    // Create index for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_reports_run_date ON reports(run_date DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_steps_report_id ON steps(report_id)
    `;

    return { success: true };
  } catch (error) {
    console.error("Database initialization error:", error);
    return { success: false, error };
  }
}

// Save a report to the database
export async function saveReport(report: EvaluationReport): Promise<boolean> {
  try {
    // Insert report
    await sql`
      INSERT INTO reports (
        id, flow_id, flow_name, website_name, run_date,
        total_steps, completed_steps, failed_steps,
        total_duration, viewport, status
      ) VALUES (
        ${report.id},
        ${report.flowId},
        ${report.flowName},
        ${report.websiteName},
        ${report.runDate},
        ${report.totalSteps},
        ${report.completedSteps},
        ${report.failedSteps},
        ${report.totalDuration},
        ${report.viewport},
        ${report.status}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        completed_steps = EXCLUDED.completed_steps,
        failed_steps = EXCLUDED.failed_steps,
        total_duration = EXCLUDED.total_duration
    `;

    // Insert steps
    for (const step of report.steps) {
      await sql`
        INSERT INTO steps (
          report_id, step_number, name, url, screenshot,
          page_title, h1, form_fields, buttons,
          load_time, timestamp, errors, notes
        ) VALUES (
          ${report.id},
          ${step.stepNumber},
          ${step.name},
          ${step.url},
          ${step.screenshot},
          ${step.pageTitle},
          ${step.h1 || null},
          ${JSON.stringify(step.formFields)},
          ${JSON.stringify(step.buttons)},
          ${step.loadTime},
          ${step.timestamp},
          ${JSON.stringify(step.errors)},
          ${step.notes || null}
        )
        ON CONFLICT (report_id, step_number) DO UPDATE SET
          name = EXCLUDED.name,
          url = EXCLUDED.url,
          screenshot = EXCLUDED.screenshot,
          page_title = EXCLUDED.page_title,
          h1 = EXCLUDED.h1,
          form_fields = EXCLUDED.form_fields,
          buttons = EXCLUDED.buttons,
          load_time = EXCLUDED.load_time,
          errors = EXCLUDED.errors,
          notes = EXCLUDED.notes
      `;
    }

    return true;
  } catch (error) {
    console.error("Error saving report:", error);
    return false;
  }
}

// Get a report by ID
export async function getReport(id: string): Promise<EvaluationReport | null> {
  try {
    const reportResult = await sql`
      SELECT * FROM reports WHERE id = ${id}
    `;

    if (reportResult.rows.length === 0) {
      return null;
    }

    const reportRow = reportResult.rows[0];

    const stepsResult = await sql`
      SELECT * FROM steps WHERE report_id = ${id} ORDER BY step_number
    `;

    const steps: StepResult[] = stepsResult.rows.map((row) => ({
      stepNumber: row.step_number,
      name: row.name,
      url: row.url,
      screenshot: row.screenshot,
      pageTitle: row.page_title,
      h1: row.h1,
      formFields: row.form_fields || [],
      buttons: row.buttons || [],
      loadTime: row.load_time,
      timestamp: row.timestamp,
      errors: row.errors || [],
      notes: row.notes,
    }));

    return {
      id: reportRow.id,
      flowId: reportRow.flow_id,
      flowName: reportRow.flow_name,
      websiteName: reportRow.website_name,
      runDate: reportRow.run_date,
      totalSteps: reportRow.total_steps,
      completedSteps: reportRow.completed_steps,
      failedSteps: reportRow.failed_steps,
      totalDuration: reportRow.total_duration,
      viewport: reportRow.viewport,
      status: reportRow.status,
      steps,
    };
  } catch (error) {
    console.error("Error getting report:", error);
    return null;
  }
}

// Get all reports (paginated)
export async function getReports(
  limit: number = 20,
  offset: number = 0
): Promise<{ reports: EvaluationReport[]; total: number }> {
  try {
    const countResult = await sql`SELECT COUNT(*) as count FROM reports`;
    const total = parseInt(countResult.rows[0].count, 10);

    const reportsResult = await sql`
      SELECT * FROM reports 
      ORDER BY run_date DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    const reports: EvaluationReport[] = await Promise.all(
      reportsResult.rows.map(async (row) => {
        const stepsResult = await sql`
          SELECT * FROM steps WHERE report_id = ${row.id} ORDER BY step_number
        `;

        const steps: StepResult[] = stepsResult.rows.map((stepRow) => ({
          stepNumber: stepRow.step_number,
          name: stepRow.name,
          url: stepRow.url,
          screenshot: stepRow.screenshot,
          pageTitle: stepRow.page_title,
          h1: stepRow.h1,
          formFields: stepRow.form_fields || [],
          buttons: stepRow.buttons || [],
          loadTime: stepRow.load_time,
          timestamp: stepRow.timestamp,
          errors: stepRow.errors || [],
          notes: stepRow.notes,
        }));

        return {
          id: row.id,
          flowId: row.flow_id,
          flowName: row.flow_name,
          websiteName: row.website_name,
          runDate: row.run_date,
          totalSteps: row.total_steps,
          completedSteps: row.completed_steps,
          failedSteps: row.failed_steps,
          totalDuration: row.total_duration,
          viewport: row.viewport,
          status: row.status,
          steps,
        };
      })
    );

    return { reports, total };
  } catch (error) {
    console.error("Error getting reports:", error);
    return { reports: [], total: 0 };
  }
}

// Delete a report
export async function deleteReport(id: string): Promise<boolean> {
  try {
    await sql`DELETE FROM reports WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error("Error deleting report:", error);
    return false;
  }
}

// Check if database is configured
export function isDatabaseConfigured(): boolean {
  return !!process.env.POSTGRES_URL;
}

