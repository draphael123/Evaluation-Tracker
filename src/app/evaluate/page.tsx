"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import {
  Play,
  Settings,
  Monitor,
  Tablet,
  Smartphone,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  Camera,
  Clock,
  ArrowRight,
} from "lucide-react";

interface FlowConfig {
  flowType: string;
  fillTestData: boolean;
  screenshotMode: "viewport" | "fullpage";
  viewport: "desktop" | "tablet" | "mobile";
  testData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    state: string;
  };
}

interface EvaluationStep {
  stepNumber: number;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  url?: string;
  screenshot?: string;
  duration?: string;
  error?: string;
}

const flowOptions = [
  { value: "mens-trt", label: "Men's TRT Evaluation" },
  { value: "womens-hrt", label: "Women's HRT Evaluation" },
];

const viewportOptions = [
  { value: "desktop", label: "Desktop", icon: Monitor, size: "1920×1080" },
  { value: "tablet", label: "Tablet", icon: Tablet, size: "768×1024" },
  { value: "mobile", label: "Mobile", icon: Smartphone, size: "375×812" },
];

function EvaluateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFlow = searchParams.get("flow") || "mens-trt";

  const [config, setConfig] = useState<FlowConfig>({
    flowType: initialFlow,
    fillTestData: false,
    screenshotMode: "viewport",
    viewport: "desktop",
    testData: {
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      phone: "555-123-4567",
      dateOfBirth: "1985-06-15",
      state: "California",
    },
  });

  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<EvaluationStep[]>([]);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartEvaluation = async () => {
    setIsRunning(true);
    setError(null);
    setSteps([]);
    setCurrentStep(0);

    try {
      const response = await fetch("/api/run-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
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
              setSteps(
                data.steps.map((name: string, idx: number) => ({
                  stepNumber: idx + 1,
                  name,
                  status: "pending",
                }))
              );
            } else if (data.type === "step-start") {
              setCurrentStep(data.stepNumber);
              setSteps((prev) =>
                prev.map((s) =>
                  s.stepNumber === data.stepNumber
                    ? { ...s, status: "running" }
                    : s
                )
              );
            } else if (data.type === "step-complete") {
              setSteps((prev) =>
                prev.map((s) =>
                  s.stepNumber === data.stepNumber
                    ? {
                        ...s,
                        status: "completed",
                        url: data.url,
                        screenshot: data.screenshot,
                        duration: data.duration,
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
              router.push(`/report/${data.evaluationId}`);
            } else if (data.type === "error") {
              setError(data.message);
              setIsRunning(false);
            }
          } catch {
            // Skip invalid JSON lines
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
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12">
            <h1 className="text-3xl font-bold mb-2">Run Evaluation</h1>
            <p className="text-[var(--foreground-muted)]">
              Configure and execute a flow evaluation
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Configuration Panel */}
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[var(--accent)]" />
                  Configuration
                </h2>

                {/* Flow Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                    Flow Type
                  </label>
                  <div className="relative">
                    <select
                      value={config.flowType}
                      onChange={(e) =>
                        setConfig({ ...config, flowType: e.target.value })
                      }
                      disabled={isRunning}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--background-subtle)] border border-[var(--border)] text-[var(--foreground)] appearance-none cursor-pointer hover:border-[var(--border-hover)] focus:border-[var(--accent)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {flowOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-muted)] pointer-events-none" />
                  </div>
                </div>

                {/* Viewport Selection */}
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
                          onClick={() =>
                            setConfig({
                              ...config,
                              viewport: opt.value as FlowConfig["viewport"],
                            })
                          }
                          disabled={isRunning}
                          className={`p-4 rounded-xl border text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            config.viewport === opt.value
                              ? "border-[var(--accent)] bg-[var(--accent-muted)]"
                              : "border-[var(--border)] bg-[var(--background-subtle)] hover:border-[var(--border-hover)]"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 mx-auto mb-2 ${
                              config.viewport === opt.value
                                ? "text-[var(--accent)]"
                                : "text-[var(--foreground-muted)]"
                            }`}
                          />
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs text-[var(--foreground-dim)]">
                            {opt.size}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Screenshot Mode */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
                    Screenshot Mode
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        setConfig({ ...config, screenshotMode: "viewport" })
                      }
                      disabled={isRunning}
                      className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        config.screenshotMode === "viewport"
                          ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]"
                          : "border-[var(--border)] bg-[var(--background-subtle)] text-[var(--foreground-muted)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      Viewport Only
                    </button>
                    <button
                      onClick={() =>
                        setConfig({ ...config, screenshotMode: "fullpage" })
                      }
                      disabled={isRunning}
                      className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        config.screenshotMode === "fullpage"
                          ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]"
                          : "border-[var(--border)] bg-[var(--background-subtle)] text-[var(--foreground-muted)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      Full Page
                    </button>
                  </div>
                </div>

                {/* Fill Test Data Toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--background-subtle)] border border-[var(--border)]">
                  <div>
                    <div className="text-sm font-medium">Fill Test Data</div>
                    <div className="text-xs text-[var(--foreground-dim)]">
                      Automatically fill forms with test data
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setConfig({ ...config, fillTestData: !config.fillTestData })
                    }
                    disabled={isRunning}
                    className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      config.fillTestData
                        ? "bg-[var(--accent)]"
                        : "bg-[var(--border)]"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        config.fillTestData ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartEvaluation}
                disabled={isRunning}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[#38bdf8] text-[var(--background)] font-semibold text-lg shadow-lg shadow-[var(--accent-glow)] hover:shadow-xl hover:shadow-[var(--accent-glow)] hover:scale-[1.01] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Running Evaluation...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Evaluation
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Progress Panel */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Camera className="w-5 h-5 text-[var(--accent)]" />
                Evaluation Progress
              </h2>

              {steps.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-[var(--background-subtle)] flex items-center justify-center mx-auto mb-4">
                    <Play className="w-8 h-8 text-[var(--foreground-dim)]" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Ready to Run</h3>
                  <p className="text-sm text-[var(--foreground-muted)] max-w-xs mx-auto">
                    Configure your evaluation settings and click Start to begin
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
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
                            <span className="text-sm font-medium">
                              {step.stepNumber}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{step.name}</div>
                          {step.url && (
                            <div className="text-xs text-[var(--foreground-dim)] truncate">
                              {step.url}
                            </div>
                          )}
                          {step.error && (
                            <div className="text-xs text-[var(--error)]">
                              {step.error}
                            </div>
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
                        Processing step {currentStep} of {steps.length}...
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

export default function EvaluatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    }>
      <EvaluateContent />
    </Suspense>
  );
}

