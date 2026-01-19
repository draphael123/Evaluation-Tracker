"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { DynamicFlow, TestDataField } from "@/lib/types";
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
  AlertCircle,
  ExternalLink,
  Info,
} from "lucide-react";

interface EvaluationStep {
  stepNumber: number;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  url?: string;
  screenshot?: string;
  duration?: string;
  error?: string;
}

const viewportOptions = [
  { value: "desktop", label: "Desktop", icon: Monitor, size: "1920×1080" },
  { value: "tablet", label: "Tablet", icon: Tablet, size: "768×1024" },
  { value: "mobile", label: "Mobile", icon: Smartphone, size: "375×812" },
];

function EvaluateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flowIdParam = searchParams.get("flow");

  const [flows, setFlows] = useState<DynamicFlow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>(flowIdParam || "");
  const [selectedFlow, setSelectedFlow] = useState<DynamicFlow | null>(null);
  const [isLoadingFlows, setIsLoadingFlows] = useState(true);
  const [canRunEvaluations, setCanRunEvaluations] = useState<boolean | null>(null);
  const [isVercel, setIsVercel] = useState(false);

  const [config, setConfig] = useState({
    fillTestData: false,
    screenshotMode: "viewport" as "viewport" | "fullpage",
    viewport: "desktop" as "desktop" | "tablet" | "mobile",
    testData: {} as Record<string, string>,
  });

  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<EvaluationStep[]>([]);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch config and flows
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
        setCanRunEvaluations(true); // Assume local if config fails
      }
    };

    const fetchFlows = async () => {
      try {
        const response = await fetch("/api/flows");
        if (response.ok) {
          const data = await response.json();
          setFlows(data);

          // Auto-select flow from URL param
          if (flowIdParam && data.find((f: DynamicFlow) => f.id === flowIdParam)) {
            setSelectedFlowId(flowIdParam);
          }
        }
      } catch (error) {
        console.error("Failed to fetch flows:", error);
      } finally {
        setIsLoadingFlows(false);
      }
    };

    fetchConfig();
    fetchFlows();
  }, [flowIdParam]);

  // Update selected flow when selection changes
  useEffect(() => {
    const flow = flows.find((f) => f.id === selectedFlowId);
    setSelectedFlow(flow || null);

    // Initialize test data with default values
    if (flow) {
      const defaultTestData: Record<string, string> = {};
      flow.testDataFields.forEach((field) => {
        defaultTestData[field.key] = field.defaultValue;
      });
      setConfig((prev) => ({ ...prev, testData: defaultTestData }));
    }
  }, [selectedFlowId, flows]);

  const handleStartEvaluation = async () => {
    if (!selectedFlow) {
      setError("Please select a flow to evaluate");
      return;
    }

    setIsRunning(true);
    setError(null);
    setSteps([]);
    setCurrentStep(0);

    try {
      const response = await fetch("/api/run-evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowId: selectedFlow.id,
          ...config,
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
                  s.stepNumber === data.stepNumber ? { ...s, status: "running" } : s
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

  const updateTestData = (key: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      testData: { ...prev.testData, [key]: value },
    }));
  };

  if (isLoadingFlows) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Run Evaluation</h1>
            <p className="text-[var(--foreground-muted)]">
              Configure and execute a flow evaluation
            </p>
          </div>

          {/* Setup Banner */}
          {isVercel && canRunEvaluations === false && (
            <div className="mb-8 p-6 rounded-2xl bg-[var(--warning)]/10 border border-[var(--warning)]/30">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--warning)]/20 flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-[var(--warning)]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--warning)] mb-2">
                    Cloud Browser Setup Required
                  </h3>
                  <p className="text-sm text-[var(--foreground-muted)] mb-4">
                    To run evaluations from this website, you need to connect a cloud browser service.
                    This is a one-time setup that takes 2 minutes.
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--warning)]/20 text-[var(--warning)] flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <span>
                        Sign up for a free account at{" "}
                        <a
                          href="https://browserless.io"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                        >
                          browserless.io
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--warning)]/20 text-[var(--warning)] flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <span>Copy your API token from the dashboard</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--warning)]/20 text-[var(--warning)] flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <span>
                        Add it to{" "}
                        <a
                          href="https://vercel.com/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                        >
                          Vercel Environment Variables
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {" "}as <code className="px-1.5 py-0.5 rounded bg-[var(--background-subtle)] font-mono text-xs">BROWSERLESS_TOKEN</code>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--warning)]/20 text-[var(--warning)] flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                      <span>Redeploy your app</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {flows.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <AlertCircle className="w-12 h-12 text-[var(--foreground-dim)] mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Flows Available</h3>
              <p className="text-sm text-[var(--foreground-muted)] mb-6">
                Create a flow first before running an evaluation.
              </p>
              <button
                onClick={() => router.push("/flows/new")}
                className="px-6 py-3 rounded-xl bg-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
              >
                Create Your First Flow
              </button>
            </div>
          ) : (
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
                      Select Flow
                    </label>
                    <div className="relative">
                      <select
                        value={selectedFlowId}
                        onChange={(e) => setSelectedFlowId(e.target.value)}
                        disabled={isRunning}
                        className="w-full px-4 py-3 rounded-xl bg-[var(--background-subtle)] border border-[var(--border)] text-[var(--foreground)] appearance-none cursor-pointer hover:border-[var(--border-hover)] focus:border-[var(--accent)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">-- Select a flow --</option>
                        {flows.map((flow) => (
                          <option key={flow.id} value={flow.id}>
                            {flow.iconEmoji} {flow.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-muted)] pointer-events-none" />
                    </div>
                    {selectedFlow && (
                      <p className="text-xs text-[var(--foreground-dim)] mt-2">
                        {selectedFlow.websiteUrl} • {selectedFlow.steps.length} steps
                      </p>
                    )}
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
                              setConfig({ ...config, viewport: opt.value as typeof config.viewport })
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
                            <div className="text-xs text-[var(--foreground-dim)]">{opt.size}</div>
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
                        onClick={() => setConfig({ ...config, screenshotMode: "viewport" })}
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
                        onClick={() => setConfig({ ...config, screenshotMode: "fullpage" })}
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

                  {/* Test Data Fields */}
                  {selectedFlow && selectedFlow.testDataFields.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-[var(--foreground-muted)]">
                          Test Data
                        </label>
                        <button
                          onClick={() =>
                            setConfig({ ...config, fillTestData: !config.fillTestData })
                          }
                          disabled={isRunning}
                          className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                            config.fillTestData ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              config.fillTestData ? "translate-x-7" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      {config.fillTestData && (
                        <div className="space-y-3 p-4 rounded-xl bg-[var(--background-subtle)] border border-[var(--border)]">
                          {selectedFlow.testDataFields.map((field) => (
                            <div key={field.key}>
                              <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1">
                                {field.label}
                              </label>
                              <input
                                type={field.type === "email" ? "email" : field.type === "date" ? "date" : "text"}
                                value={config.testData[field.key] || ""}
                                onChange={(e) => updateTestData(field.key, e.target.value)}
                                disabled={isRunning}
                                placeholder={field.defaultValue}
                                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Start Button */}
                <button
                  onClick={handleStartEvaluation}
                  disabled={isRunning || !selectedFlowId}
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
                      Select a flow and click Start to begin the evaluation
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
                              <span className="text-sm font-medium">{step.stepNumber}</span>
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
                          Processing step {currentStep} of {steps.length}...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function EvaluatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      }
    >
      <EvaluateContent />
    </Suspense>
  );
}
