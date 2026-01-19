"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import {
  Zap,
  Play,
  Monitor,
  Tablet,
  Smartphone,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Globe,
  Settings,
  Info,
  ExternalLink,
} from "lucide-react";

interface EvaluationStep {
  stepNumber: number;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  url?: string;
  screenshot?: string;
  duration?: string;
  formFields?: number;
  buttons?: number;
  error?: string;
}

const viewportOptions = [
  { value: "desktop", label: "Desktop", icon: Monitor, size: "1920×1080" },
  { value: "tablet", label: "Tablet", icon: Tablet, size: "768×1024" },
  { value: "mobile", label: "Mobile", icon: Smartphone, size: "375×812" },
];

export default function QuickEvaluatePage() {
  const router = useRouter();
  const [canRunEvaluations, setCanRunEvaluations] = useState<boolean | null>(null);
  const [isVercel, setIsVercel] = useState(false);

  const [startUrl, setStartUrl] = useState("");
  const [websiteName, setWebsiteName] = useState("");
  const [maxSteps, setMaxSteps] = useState(20);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [screenshotMode, setScreenshotMode] = useState<"viewport" | "fullpage">("viewport");
  const [autoFillForms, setAutoFillForms] = useState(true);

  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<EvaluationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessages, setInfoMessages] = useState<string[]>([]);

  // Check config on load
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/config");
        if (response.ok) {
          const data = await response.json();
          setCanRunEvaluations(data.canRunEvaluations);
          setIsVercel(data.isVercel);
        }
      } catch {
        setCanRunEvaluations(true);
      }
    };
    fetchConfig();
  }, []);

  const handleStartEvaluation = async () => {
    if (!startUrl.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Validate URL
    try {
      new URL(startUrl);
    } catch {
      setError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    setIsRunning(true);
    setError(null);
    setSteps([]);
    setInfoMessages([]);
    setCurrentStep(0);

    try {
      const response = await fetch("/api/auto-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrl,
          websiteName,
          maxSteps,
          viewport,
          screenshotMode,
          autoFillForms,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start evaluation");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response stream");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.type === "init") {
              setEvaluationId(data.evaluationId);
            } else if (data.type === "info") {
              setInfoMessages((prev) => [...prev.slice(-4), data.message]);
            } else if (data.type === "step-start") {
              setCurrentStep(data.stepNumber);
              setSteps((prev) => [
                ...prev,
                {
                  stepNumber: data.stepNumber,
                  name: data.name,
                  status: "running",
                  url: data.url,
                },
              ]);
            } else if (data.type === "step-complete") {
              setSteps((prev) =>
                prev.map((s) =>
                  s.stepNumber === data.stepNumber
                    ? {
                        ...s,
                        status: "completed",
                        name: data.name,
                        url: data.url,
                        screenshot: data.screenshot,
                        duration: data.duration,
                        formFields: data.formFields,
                        buttons: data.buttons,
                      }
                    : s
                )
              );
            } else if (data.type === "step-error") {
              setSteps((prev) =>
                prev.map((s) =>
                  s.stepNumber === data.stepNumber
                    ? { ...s, status: "failed", error: data.error }
                    : s
                )
              );
            } else if (data.type === "complete") {
              setIsRunning(false);
              // Redirect to report after a brief delay
              setTimeout(() => {
                router.push(`/report/${data.evaluationId}`);
              }, 1500);
            } else if (data.type === "error") {
              setError(data.message);
              setIsRunning(false);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-muted)] text-[var(--accent)] text-sm font-medium mb-4">
              <Zap className="w-4 h-4" />
              Auto-Pilot Mode
            </div>
            <h1 className="text-4xl font-bold mb-4">Quick Evaluate</h1>
            <p className="text-[var(--foreground-muted)] max-w-lg mx-auto">
              Just enter a URL and watch the system automatically navigate through the flow,
              capturing screenshots at every step.
            </p>
          </div>

          {/* Setup Banner */}
          {isVercel && canRunEvaluations === false && (
            <div className="mb-8 p-6 rounded-2xl bg-[var(--warning)]/10 border border-[var(--warning)]/30">
              <div className="flex items-start gap-4">
                <Info className="w-6 h-6 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[var(--warning)] mb-2">
                    Cloud Browser Required
                  </h3>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    Add <code className="px-1.5 py-0.5 rounded bg-[var(--background-subtle)] font-mono text-xs">BROWSERLESS_TOKEN</code> to your Vercel environment variables.{" "}
                    <a href="https://browserless.io" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline inline-flex items-center gap-1">
                      Get a free token <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Configuration */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[var(--accent)]" />
                  Website to Evaluate
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                      Starting URL *
                    </label>
                    <input
                      type="url"
                      value={startUrl}
                      onChange={(e) => setStartUrl(e.target.value)}
                      disabled={isRunning}
                      placeholder="https://example.com/start"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--background-subtle)] border border-[var(--border)] text-[var(--foreground)] font-mono text-sm focus:border-[var(--accent)] focus:outline-none transition-colors disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                      Website Name (optional)
                    </label>
                    <input
                      type="text"
                      value={websiteName}
                      onChange={(e) => setWebsiteName(e.target.value)}
                      disabled={isRunning}
                      placeholder="e.g., Fountain TRT"
                      className="w-full px-4 py-3 rounded-xl bg-[var(--background-subtle)] border border-[var(--border)] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[var(--accent)]" />
                  Options
                </h2>

                {/* Viewport */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                    Viewport Size
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {viewportOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setViewport(opt.value as typeof viewport)}
                          disabled={isRunning}
                          className={`p-3 rounded-xl border text-center transition-all disabled:opacity-50 ${
                            viewport === opt.value
                              ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                              : "border-[var(--border)] bg-[var(--background-subtle)] hover:border-[var(--border-hover)]"
                          }`}
                        >
                          <Icon className={`w-4 h-4 mx-auto mb-1 ${viewport === opt.value ? "text-[var(--accent)]" : "text-[var(--foreground-muted)]"}`} />
                          <div className="text-xs font-medium">{opt.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Max Steps */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                    Max Steps: {maxSteps}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={maxSteps}
                    onChange={(e) => setMaxSteps(parseInt(e.target.value))}
                    disabled={isRunning}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-[var(--foreground-dim)]">
                    <span>5</span>
                    <span>50</span>
                  </div>
                </div>

                {/* Auto-fill toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--background-subtle)] border border-[var(--border)]">
                  <div>
                    <div className="text-sm font-medium">Auto-Fill Forms</div>
                    <div className="text-xs text-[var(--foreground-dim)]">
                      Automatically fill inputs with test data
                    </div>
                  </div>
                  <button
                    onClick={() => setAutoFillForms(!autoFillForms)}
                    disabled={isRunning}
                    className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${
                      autoFillForms ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        autoFillForms ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartEvaluation}
                disabled={isRunning || !startUrl.trim()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[#38bdf8] text-[var(--background)] font-semibold text-lg shadow-lg shadow-[var(--accent-glow)] hover:shadow-xl hover:scale-[1.01] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Auto-Evaluation
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-[var(--accent)]" />
                Live Progress
              </h2>

              {steps.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-[var(--background-subtle)] flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-8 h-8 text-[var(--foreground-dim)]" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Auto-Pilot Ready</h3>
                  <p className="text-sm text-[var(--foreground-muted)] max-w-xs mx-auto">
                    Enter a URL and click Start. The system will automatically navigate through the flow.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {/* Info Messages */}
                  {infoMessages.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent)]/20">
                      <div className="text-xs text-[var(--accent)] font-medium mb-1">Status</div>
                      {infoMessages.map((msg, i) => (
                        <div key={i} className="text-xs text-[var(--foreground-muted)]">
                          {msg}
                        </div>
                      ))}
                    </div>
                  )}

                  {steps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className={`p-4 rounded-xl border transition-all ${
                        step.status === "running"
                          ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                          : step.status === "completed"
                          ? "border-[var(--success)]/30 bg-[var(--success)]/5"
                          : step.status === "failed"
                          ? "border-[var(--error)]/30 bg-[var(--error)]/5"
                          : "border-[var(--border)] bg-[var(--background-subtle)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            step.status === "running"
                              ? "bg-[var(--accent)] text-[var(--background)]"
                              : step.status === "completed"
                              ? "bg-[var(--success)] text-white"
                              : step.status === "failed"
                              ? "bg-[var(--error)] text-white"
                              : "bg-[var(--border)] text-[var(--foreground-muted)]"
                          }`}
                        >
                          {step.status === "running" ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : step.status === "completed" ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : step.status === "failed" ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <span className="text-sm font-medium">{step.stepNumber}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{step.name}</div>
                          {step.url && (
                            <div className="text-xs text-[var(--foreground-dim)] truncate">
                              {step.url}
                            </div>
                          )}
                          {step.error && (
                            <div className="text-xs text-[var(--error)]">{step.error}</div>
                          )}
                        </div>

                        {step.duration && (
                          <div className="flex items-center gap-1 text-xs text-[var(--foreground-muted)]">
                            <Clock className="w-3 h-3" />
                            {step.duration}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isRunning && (
                    <div className="pt-4 text-center">
                      <div className="inline-flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                        <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                        Navigating step {currentStep}...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

