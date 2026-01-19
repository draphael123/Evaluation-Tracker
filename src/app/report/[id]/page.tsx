"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  ArrowLeft,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileJson,
  FileText,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import { generatePDF, downloadPDF } from "@/lib/pdfExport";

interface FormField {
  name: string;
  type: string;
  required: boolean;
  placeholder?: string;
}

interface StepData {
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

interface ReportData {
  id: string;
  flowId: string;
  flowName: string;
  websiteName?: string;
  runDate: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDuration: string;
  viewport: string;
  status: "completed" | "failed" | "partial" | "blocked";
  steps: StepData[];
}

// Component to load and display screenshots
function ScreenshotImage({ screenshotPath, alt }: { screenshotPath: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadScreenshot = async () => {
      if (!screenshotPath) {
        setLoading(false);
        return;
      }

      // Check if it's already a data URL
      if (screenshotPath.startsWith("data:")) {
        setImageSrc(screenshotPath);
        setLoading(false);
        return;
      }

      // Try to load from API
      try {
        const response = await fetch(`/api/screenshot?path=${encodeURIComponent(screenshotPath)}`);
        if (response.ok) {
          const data = await response.json();
          setImageSrc(data.dataUrl);
        } else {
          // Fallback to direct path (for locally saved screenshots)
          setImageSrc(screenshotPath);
        }
      } catch {
        // Fallback to direct path
        setImageSrc(screenshotPath);
      }
      setLoading(false);
    };

    loadScreenshot();
  }, [screenshotPath]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--background-subtle)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!imageSrc || error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--background-subtle)]">
        <ImageIcon className="w-12 h-12 text-[var(--foreground-dim)] mb-2" />
        <p className="text-sm text-[var(--foreground-muted)]">No screenshot available</p>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="w-full h-full object-contain"
      onError={() => setError(true)}
    />
  );
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/get-report?id=${id}`);
        if (!response.ok) {
          throw new Error("Report not found");
        }
        const data = await response.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  const toggleStep = (stepNumber: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNumber)) {
        next.delete(stepNumber);
      } else {
        next.add(stepNumber);
      }
      return next;
    });
    setSelectedStep(stepNumber);
  };

  const downloadJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!report) return;
    setExportingPDF(true);
    try {
      // First, resolve all screenshot data URLs for the PDF
      const reportWithScreenshots = { ...report };
      for (const step of reportWithScreenshots.steps) {
        if (step.screenshot && !step.screenshot.startsWith("data:")) {
          try {
            const response = await fetch(`/api/screenshot?path=${encodeURIComponent(step.screenshot)}`);
            if (response.ok) {
              const data = await response.json();
              step.screenshot = data.dataUrl;
            }
          } catch {
            // Keep original path if fetch fails
          }
        }
      }
      
      const blob = await generatePDF(reportWithScreenshots);
      const filename = `evaluation-report-${report.flowName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadPDF(blob, filename);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExportingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center py-32">
              <div className="w-16 h-16 rounded-full bg-[var(--error)]/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-[var(--error)]" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
              <p className="text-[var(--foreground-muted)] mb-6">
                {error || "The requested report could not be loaded."}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass hover:border-[var(--accent)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const selectedStepData = report.steps.find(
    (s) => s.stepNumber === selectedStep
  );

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold mb-2">{report.flowName}</h1>
              <p className="text-[var(--foreground-muted)]">
                Report ID: <span className="font-mono">{report.id}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={downloadJSON}
                className="px-4 py-2 rounded-lg glass flex items-center gap-2 hover:border-[var(--accent)] transition-colors"
              >
                <FileJson className="w-4 h-4" />
                JSON
              </button>
              <button
                onClick={exportPDF}
                disabled={exportingPDF}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--accent)] to-[#38bdf8] text-[var(--background)] font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-[var(--accent-glow)] transition-all disabled:opacity-50"
              >
                {exportingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Export PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass rounded-xl p-4">
              <div className="text-sm text-[var(--foreground-muted)] mb-1">
                Status
              </div>
              <div className="flex items-center gap-2">
                {report.status === "completed" ? (
                  <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />
                ) : report.status === "blocked" ? (
                  <ShieldAlert className="w-5 h-5 text-orange-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-[var(--error)]" />
                )}
                <span className={`font-semibold capitalize ${report.status === "blocked" ? "text-orange-500" : ""}`}>
                  {report.status}
                </span>
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-sm text-[var(--foreground-muted)] mb-1">
                Steps Completed
              </div>
              <div className="font-semibold">
                {report.completedSteps} / {report.totalSteps}
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-sm text-[var(--foreground-muted)] mb-1">
                Total Duration
              </div>
              <div className="flex items-center gap-2 font-semibold">
                <Clock className="w-4 h-4 text-[var(--foreground-muted)]" />
                {report.totalDuration}
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="text-sm text-[var(--foreground-muted)] mb-1">
                Viewport
              </div>
              <div className="font-semibold capitalize">{report.viewport}</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Steps List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-lg font-semibold mb-4">Flow Steps</h2>
              {report.steps.map((step) => (
                <button
                  key={step.stepNumber}
                  onClick={() => toggleStep(step.stepNumber)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedStep === step.stepNumber
                      ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                      : "border-[var(--border)] bg-[var(--background-elevated)] hover:border-[var(--border-hover)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                        step.errors.length > 0
                          ? "bg-[var(--error)] text-white"
                          : "bg-[var(--success)] text-white"
                      }`}
                    >
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {step.name}
                      </div>
                      <div className="text-xs text-[var(--foreground-dim)]">
                        {step.loadTime}
                      </div>
                    </div>
                    {expandedSteps.has(step.stepNumber) ? (
                      <ChevronUp className="w-4 h-4 text-[var(--foreground-muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--foreground-muted)]" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Step Detail */}
            <div className="lg:col-span-2">
              {selectedStepData && (
                <div className="glass rounded-2xl overflow-hidden">
                  {/* Screenshot */}
                  <div className="relative aspect-video bg-[var(--background-subtle)]">
                    <ScreenshotImage
                      screenshotPath={selectedStepData.screenshot}
                      alt={`Step ${selectedStepData.stepNumber}: ${selectedStepData.name}`}
                    />
                  </div>

                  {/* Step Info */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">
                          Step {selectedStepData.stepNumber}:{" "}
                          {selectedStepData.name}
                        </h3>
                        <p className="text-sm text-[var(--foreground-muted)]">
                          {selectedStepData.pageTitle}
                        </p>
                      </div>
                      <a
                        href={selectedStepData.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] hover:underline flex items-center gap-1 text-sm"
                      >
                        Open URL
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* URL */}
                    <div className="mb-4 p-3 rounded-lg bg-[var(--background-subtle)] font-mono text-sm text-[var(--foreground-muted)] break-all">
                      {selectedStepData.url}
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-medium text-[var(--foreground-muted)] mb-2">
                          Page Info
                        </h4>
                        <div className="space-y-2 text-sm">
                          {selectedStepData.h1 && (
                            <div>
                              <span className="text-[var(--foreground-dim)]">
                                H1:{" "}
                              </span>
                              {selectedStepData.h1}
                            </div>
                          )}
                          <div>
                            <span className="text-[var(--foreground-dim)]">
                              Load Time:{" "}
                            </span>
                            {selectedStepData.loadTime}
                          </div>
                          <div>
                            <span className="text-[var(--foreground-dim)]">
                              Timestamp:{" "}
                            </span>
                            {new Date(selectedStepData.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-[var(--foreground-muted)] mb-2">
                          Buttons ({selectedStepData.buttons.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedStepData.buttons.length > 0 ? (
                            selectedStepData.buttons.map((btn, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 rounded bg-[var(--background-subtle)] text-xs"
                              >
                                {btn}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-[var(--foreground-dim)]">
                              No buttons detected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Form Fields */}
                    {selectedStepData.formFields.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-[var(--foreground-muted)] mb-2">
                          Form Fields ({selectedStepData.formFields.length})
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-[var(--border)]">
                                <th className="text-left py-2 text-[var(--foreground-muted)] font-medium">
                                  Name
                                </th>
                                <th className="text-left py-2 text-[var(--foreground-muted)] font-medium">
                                  Type
                                </th>
                                <th className="text-left py-2 text-[var(--foreground-muted)] font-medium">
                                  Required
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedStepData.formFields.map((field, i) => (
                                <tr
                                  key={i}
                                  className="border-b border-[var(--border)] last:border-0"
                                >
                                  <td className="py-2 font-mono">
                                    {field.name}
                                  </td>
                                  <td className="py-2">{field.type}</td>
                                  <td className="py-2">
                                    {field.required ? (
                                      <span className="text-[var(--warning)]">
                                        Yes
                                      </span>
                                    ) : (
                                      <span className="text-[var(--foreground-dim)]">
                                        No
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {selectedStepData.errors.length > 0 && (
                      <div className="p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30">
                        <h4 className="text-sm font-medium text-[var(--error)] mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Errors Detected
                        </h4>
                        <ul className="text-sm text-[var(--error)] space-y-1">
                          {selectedStepData.errors.map((err, i) => (
                            <li key={i}>• {err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
