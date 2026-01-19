"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save,
  Play,
  ArrowLeft,
  MousePointer,
  Type,
  Navigation,
  Clock,
  CheckSquare,
  List,
  Eye,
  MoveVertical,
  Globe,
  Settings,
  AlertCircle,
} from "lucide-react";
import { DynamicFlow, FlowStep, StepAction, StepActionType, TestDataField } from "@/lib/types";

const actionTypes: { type: StepActionType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: "navigate", label: "Navigate", icon: <Navigation className="w-4 h-4" />, description: "Go to a URL" },
  { type: "click", label: "Click", icon: <MousePointer className="w-4 h-4" />, description: "Click an element" },
  { type: "fill", label: "Fill Input", icon: <Type className="w-4 h-4" />, description: "Fill a text field" },
  { type: "select", label: "Select Option", icon: <List className="w-4 h-4" />, description: "Select dropdown option" },
  { type: "check", label: "Check/Toggle", icon: <CheckSquare className="w-4 h-4" />, description: "Check a checkbox" },
  { type: "wait", label: "Wait", icon: <Clock className="w-4 h-4" />, description: "Wait for element/time" },
  { type: "scroll", label: "Scroll To", icon: <MoveVertical className="w-4 h-4" />, description: "Scroll to element" },
  { type: "screenshot", label: "Screenshot Only", icon: <Eye className="w-4 h-4" />, description: "Just capture screenshot" },
];

interface FlowBuilderProps {
  initialFlow?: DynamicFlow;
  isEditing?: boolean;
}

export default function FlowBuilder({ initialFlow, isEditing = false }: FlowBuilderProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set(["step-1"]));

  const [flow, setFlow] = useState<DynamicFlow>(
    initialFlow || {
      id: "",
      name: "",
      description: "",
      websiteUrl: "",
      websiteName: "",
      iconEmoji: "🌐",
      createdAt: "",
      updatedAt: "",
      steps: [
        {
          id: "step-1",
          name: "Landing Page",
          actions: [{ type: "screenshot", description: "Capture landing page" }],
          captureScreenshot: true,
        },
      ],
      testDataFields: [],
    }
  );

  const updateFlow = (updates: Partial<DynamicFlow>) => {
    setFlow((prev) => ({ ...prev, ...updates }));
  };

  const addStep = () => {
    const newStepId = `step-${Date.now()}`;
    const newStep: FlowStep = {
      id: newStepId,
      name: `Step ${flow.steps.length + 1}`,
      actions: [{ type: "screenshot", description: "Capture page" }],
      captureScreenshot: true,
    };
    updateFlow({ steps: [...flow.steps, newStep] });
    setExpandedSteps((prev) => new Set([...prev, newStepId]));
  };

  const updateStep = (stepId: string, updates: Partial<FlowStep>) => {
    updateFlow({
      steps: flow.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
    });
  };

  const deleteStep = (stepId: string) => {
    if (flow.steps.length <= 1) return;
    updateFlow({ steps: flow.steps.filter((s) => s.id !== stepId) });
  };

  const moveStep = (stepId: string, direction: "up" | "down") => {
    const index = flow.steps.findIndex((s) => s.id === stepId);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === flow.steps.length - 1) return;

    const newSteps = [...flow.steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    updateFlow({ steps: newSteps });
  };

  const addAction = (stepId: string) => {
    const step = flow.steps.find((s) => s.id === stepId);
    if (!step) return;

    const newAction: StepAction = { type: "click", selector: "", description: "" };
    updateStep(stepId, { actions: [...step.actions, newAction] });
  };

  const updateAction = (stepId: string, actionIndex: number, updates: Partial<StepAction>) => {
    const step = flow.steps.find((s) => s.id === stepId);
    if (!step) return;

    const newActions = step.actions.map((a, i) => (i === actionIndex ? { ...a, ...updates } : a));
    updateStep(stepId, { actions: newActions });
  };

  const deleteAction = (stepId: string, actionIndex: number) => {
    const step = flow.steps.find((s) => s.id === stepId);
    if (!step || step.actions.length <= 1) return;

    updateStep(stepId, { actions: step.actions.filter((_, i) => i !== actionIndex) });
  };

  const addTestDataField = () => {
    const newField: TestDataField = {
      key: `field_${Date.now()}`,
      label: "New Field",
      type: "text",
      defaultValue: "",
    };
    updateFlow({ testDataFields: [...flow.testDataFields, newField] });
  };

  const updateTestDataField = (index: number, updates: Partial<TestDataField>) => {
    const newFields = flow.testDataFields.map((f, i) => (i === index ? { ...f, ...updates } : f));
    updateFlow({ testDataFields: newFields });
  };

  const deleteTestDataField = (index: number) => {
    updateFlow({ testDataFields: flow.testDataFields.filter((_, i) => i !== index) });
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!flow.name.trim()) {
      setError("Please enter a flow name");
      return;
    }
    if (!flow.websiteUrl.trim()) {
      setError("Please enter a website URL");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `/api/flows/${flow.id}` : "/api/flows";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flow),
      });

      if (!response.ok) {
        throw new Error("Failed to save flow");
      }

      const savedFlow = await response.json();
      router.push(`/flows/${savedFlow.id}/edit`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save flow");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="p-2 rounded-lg hover:bg-[var(--background-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{isEditing ? "Edit Flow" : "Create New Flow"}</h1>
            <p className="text-sm text-[var(--foreground-muted)]">
              Define the steps to evaluate any website flow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEditing && (
            <button
              onClick={() => router.push(`/evaluate?flow=${flow.id}`)}
              className="px-4 py-2 rounded-lg glass flex items-center gap-2 hover:border-[var(--accent)] transition-colors"
            >
              <Play className="w-4 h-4" />
              Test Flow
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--background)] font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Flow"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-[var(--accent)]" />
          Flow Information
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
              Flow Name *
            </label>
            <input
              type="text"
              value={flow.name}
              onChange={(e) => updateFlow({ name: e.target.value })}
              placeholder="e.g., Fountain TRT Evaluation"
              className="w-full px-4 py-3 rounded-xl bg-[var(--background-subtle)] border border-[var(--border)] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
              Website Name
            </label>
            <input
              type="text"
              value={flow.websiteName}
              onChange={(e) => updateFlow({ websiteName: e.target.value })}
              placeholder="e.g., Fountain"
              className="w-full px-4 py-3 rounded-xl bg-[var(--background-subtle)] border border-[var(--border)] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
              Starting URL *
            </label>
            <input
              type="url"
              value={flow.websiteUrl}
              onChange={(e) => updateFlow({ websiteUrl: e.target.value })}
              placeholder="https://example.com/start"
              className="w-full px-4 py-3 rounded-xl bg-[var(--background-subtle)] border border-[var(--border)] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none transition-colors font-mono text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">
              Description
            </label>
            <textarea
              value={flow.description}
              onChange={(e) => updateFlow({ description: e.target.value })}
              placeholder="Describe what this flow evaluates..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-[var(--background-subtle)] border border-[var(--border)] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--accent)]" />
            Flow Steps ({flow.steps.length})
          </h2>
          <button
            onClick={addStep}
            className="px-3 py-1.5 rounded-lg bg-[var(--accent-muted)] text-[var(--accent)] text-sm font-medium flex items-center gap-1.5 hover:bg-[var(--accent)] hover:text-[var(--background)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Step
          </button>
        </div>

        <div className="space-y-3">
          {flow.steps.map((step, stepIndex) => (
            <div
              key={step.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--background-elevated)] overflow-hidden"
            >
              {/* Step Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--background-subtle)] transition-colors"
                onClick={() => toggleStep(step.id)}
              >
                <GripVertical className="w-4 h-4 text-[var(--foreground-dim)]" />
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--background)] flex items-center justify-center text-sm font-bold">
                  {stepIndex + 1}
                </div>
                <input
                  type="text"
                  value={step.name}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateStep(step.id, { name: e.target.value });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent font-medium focus:outline-none"
                  placeholder="Step name"
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(step.id, "up");
                    }}
                    disabled={stepIndex === 0}
                    className="p-1.5 rounded hover:bg-[var(--background-subtle)] text-[var(--foreground-muted)] disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveStep(step.id, "down");
                    }}
                    disabled={stepIndex === flow.steps.length - 1}
                    className="p-1.5 rounded hover:bg-[var(--background-subtle)] text-[var(--foreground-muted)] disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteStep(step.id);
                    }}
                    disabled={flow.steps.length <= 1}
                    className="p-1.5 rounded hover:bg-[var(--error)]/10 text-[var(--foreground-muted)] hover:text-[var(--error)] disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedSteps.has(step.id) ? (
                    <ChevronUp className="w-5 h-5 text-[var(--foreground-muted)]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[var(--foreground-muted)]" />
                  )}
                </div>
              </div>

              {/* Step Content */}
              {expandedSteps.has(step.id) && (
                <div className="px-4 pb-4 pt-2 border-t border-[var(--border)]">
                  {/* Wait For Selector */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-[var(--foreground-muted)] mb-1.5">
                      Wait for selector (optional)
                    </label>
                    <input
                      type="text"
                      value={step.waitForSelector || ""}
                      onChange={(e) => updateStep(step.id, { waitForSelector: e.target.value })}
                      placeholder='e.g., button[type="submit"], .form-container, #next-btn'
                      className="w-full px-3 py-2 rounded-lg bg-[var(--background-subtle)] border border-[var(--border)] text-sm font-mono focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-[var(--foreground-muted)]">
                        Actions
                      </label>
                      <button
                        onClick={() => addAction(step.id)}
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Action
                      </button>
                    </div>

                    <div className="space-y-2">
                      {step.actions.map((action, actionIndex) => (
                        <div
                          key={actionIndex}
                          className="flex items-start gap-2 p-3 rounded-lg bg-[var(--background-subtle)] border border-[var(--border)]"
                        >
                          <select
                            value={action.type}
                            onChange={(e) =>
                              updateAction(step.id, actionIndex, {
                                type: e.target.value as StepActionType,
                              })
                            }
                            className="px-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:border-[var(--accent)] focus:outline-none"
                          >
                            {actionTypes.map((at) => (
                              <option key={at.type} value={at.type}>
                                {at.label}
                              </option>
                            ))}
                          </select>

                          <div className="flex-1 space-y-2">
                            {(action.type === "click" ||
                              action.type === "fill" ||
                              action.type === "select" ||
                              action.type === "check" ||
                              action.type === "scroll" ||
                              action.type === "wait") && (
                              <input
                                type="text"
                                value={action.selector || ""}
                                onChange={(e) =>
                                  updateAction(step.id, actionIndex, { selector: e.target.value })
                                }
                                placeholder="CSS selector (e.g., #submit-btn, .next-button)"
                                className="w-full px-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm font-mono focus:border-[var(--accent)] focus:outline-none"
                              />
                            )}

                            {(action.type === "navigate" ||
                              action.type === "fill" ||
                              action.type === "select") && (
                              <input
                                type="text"
                                value={action.value || ""}
                                onChange={(e) =>
                                  updateAction(step.id, actionIndex, { value: e.target.value })
                                }
                                placeholder={
                                  action.type === "navigate"
                                    ? "URL to navigate to"
                                    : action.type === "fill"
                                    ? "Value to fill (or use test data key)"
                                    : "Option value to select"
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:border-[var(--accent)] focus:outline-none"
                              />
                            )}

                            {action.type === "fill" && flow.testDataFields.length > 0 && (
                              <select
                                value={action.testDataKey || ""}
                                onChange={(e) =>
                                  updateAction(step.id, actionIndex, {
                                    testDataKey: e.target.value || undefined,
                                  })
                                }
                                className="w-full px-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:border-[var(--accent)] focus:outline-none"
                              >
                                <option value="">Use static value above</option>
                                {flow.testDataFields.map((field) => (
                                  <option key={field.key} value={field.key}>
                                    Use test data: {field.label}
                                  </option>
                                ))}
                              </select>
                            )}

                            {action.type === "wait" && (
                              <input
                                type="number"
                                value={action.waitTime || ""}
                                onChange={(e) =>
                                  updateAction(step.id, actionIndex, {
                                    waitTime: parseInt(e.target.value) || undefined,
                                  })
                                }
                                placeholder="Wait time in milliseconds (optional)"
                                className="w-full px-2 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:border-[var(--accent)] focus:outline-none"
                              />
                            )}
                          </div>

                          <button
                            onClick={() => deleteAction(step.id, actionIndex)}
                            disabled={step.actions.length <= 1}
                            className="p-1.5 rounded hover:bg-[var(--error)]/10 text-[var(--foreground-muted)] hover:text-[var(--error)] disabled:opacity-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step Options */}
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={step.captureScreenshot !== false}
                        onChange={(e) => updateStep(step.id, { captureScreenshot: e.target.checked })}
                        className="rounded border-[var(--border)]"
                      />
                      <span className="text-[var(--foreground-muted)]">Capture screenshot</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={step.continueOnError || false}
                        onChange={(e) => updateStep(step.id, { continueOnError: e.target.checked })}
                        className="rounded border-[var(--border)]"
                      />
                      <span className="text-[var(--foreground-muted)]">Continue on error</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Test Data Fields */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Type className="w-5 h-5 text-[var(--accent)]" />
            Test Data Fields ({flow.testDataFields.length})
          </h2>
          <button
            onClick={addTestDataField}
            className="px-3 py-1.5 rounded-lg bg-[var(--accent-muted)] text-[var(--accent)] text-sm font-medium flex items-center gap-1.5 hover:bg-[var(--accent)] hover:text-[var(--background)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </button>
        </div>

        <p className="text-sm text-[var(--foreground-muted)] mb-4">
          Define fields that can be filled with test data during evaluations. Reference these in
          &quot;Fill Input&quot; actions.
        </p>

        {flow.testDataFields.length === 0 ? (
          <div className="text-center py-8 text-[var(--foreground-muted)]">
            No test data fields defined. Add fields to enable form filling during evaluations.
          </div>
        ) : (
          <div className="space-y-3">
            {flow.testDataFields.map((field, index) => (
              <div
                key={field.key}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--background-elevated)] border border-[var(--border)]"
              >
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) =>
                    updateTestDataField(index, { key: e.target.value.replace(/\s/g, "_") })
                  }
                  placeholder="field_key"
                  className="w-32 px-2 py-1.5 rounded-lg bg-[var(--background-subtle)] border border-[var(--border)] text-sm font-mono focus:border-[var(--accent)] focus:outline-none"
                />
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateTestDataField(index, { label: e.target.value })}
                  placeholder="Field Label"
                  className="flex-1 px-2 py-1.5 rounded-lg bg-[var(--background-subtle)] border border-[var(--border)] text-sm focus:border-[var(--accent)] focus:outline-none"
                />
                <select
                  value={field.type}
                  onChange={(e) =>
                    updateTestDataField(index, { type: e.target.value as TestDataField["type"] })
                  }
                  className="px-2 py-1.5 rounded-lg bg-[var(--background-subtle)] border border-[var(--border)] text-sm focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="date">Date</option>
                </select>
                <input
                  type="text"
                  value={field.defaultValue}
                  onChange={(e) => updateTestDataField(index, { defaultValue: e.target.value })}
                  placeholder="Default value"
                  className="w-40 px-2 py-1.5 rounded-lg bg-[var(--background-subtle)] border border-[var(--border)] text-sm focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  onClick={() => deleteTestDataField(index)}
                  className="p-1.5 rounded hover:bg-[var(--error)]/10 text-[var(--foreground-muted)] hover:text-[var(--error)]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

