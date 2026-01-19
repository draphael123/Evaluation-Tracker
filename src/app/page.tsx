"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import FeatureCard from "@/components/FeatureCard";
import StepIndicator from "@/components/StepIndicator";
import RecentEvaluations, { EvaluationRun } from "@/components/RecentEvaluations";
import { DynamicFlow } from "@/lib/types";
import {
  Play,
  Camera,
  FileJson,
  AlertTriangle,
  GitCompare,
  Settings2,
  Sparkles,
  Eye,
  Zap,
  Plus,
  ArrowRight,
  Globe,
  Edit3,
  Trash2,
  MoreVertical,
  Loader2,
  MousePointer,
} from "lucide-react";

const howItWorksSteps = [
  {
    number: 1,
    title: "Create Flow",
    description:
      "Define your evaluation flow with our visual builder — no coding required.",
    icon: <Settings2 className="w-7 h-7" />,
  },
  {
    number: 2,
    title: "Run Evaluation",
    description:
      "The tool automatically navigates through the flow, capturing screenshots and data.",
    icon: <Play className="w-7 h-7" />,
  },
  {
    number: 3,
    title: "Review Report",
    description:
      "View a visual report with screenshots, metadata, and any detected issues.",
    icon: <Eye className="w-7 h-7" />,
  },
];

const features = [
  {
    icon: <Camera className="w-5 h-5" />,
    title: "Screenshot Capture",
    description:
      "Automatic full-page screenshots at every step of any user journey.",
  },
  {
    icon: <FileJson className="w-5 h-5" />,
    title: "Page Metadata",
    description:
      "Collect titles, forms, buttons, load times, and all page elements.",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Visual Flow Builder",
    description:
      "Create evaluation flows for any website using our no-code visual builder.",
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Error Detection",
    description:
      "Automatically detect and highlight errors, broken elements, or issues.",
  },
  {
    icon: <GitCompare className="w-5 h-5" />,
    title: "Run Comparison",
    description:
      "Compare evaluations over time to detect UI changes and regressions.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Performance Tracking",
    description:
      "Monitor page load times and overall flow performance metrics.",
  },
];

export default function Home() {
  const router = useRouter();
  const [flows, setFlows] = useState<DynamicFlow[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRun[]>([]);
  const [isLoadingFlows, setIsLoadingFlows] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        const response = await fetch("/api/flows");
        if (response.ok) {
          const data = await response.json();
          setFlows(data);
        }
      } catch (error) {
        console.error("Failed to fetch flows:", error);
      } finally {
        setIsLoadingFlows(false);
      }
    };

    const fetchReports = async () => {
      try {
        const response = await fetch("/api/get-reports");
        if (response.ok) {
          const data = await response.json();
          const transformed: EvaluationRun[] = data.slice(0, 5).map((report: any) => ({
            id: report.id,
            flowType: report.flowId || report.flowType,
            flowName: report.flowName,
            startedAt: report.runDate,
            status: report.status === "partial" ? "failed" : report.status,
            stepsCompleted: report.completedSteps,
            totalSteps: report.totalSteps,
            duration: report.totalDuration,
          }));
          setEvaluations(transformed);
        }
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      } finally {
        setIsLoadingReports(false);
      }
    };

    fetchFlows();
    fetchReports();
  }, []);

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm("Are you sure you want to delete this flow?")) return;

    try {
      const response = await fetch(`/api/flows/${flowId}`, { method: "DELETE" });
      if (response.ok) {
        setFlows(flows.filter((f) => f.id !== flowId));
      }
    } catch (error) {
      console.error("Failed to delete flow:", error);
    }
    setActiveMenu(null);
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(45, 212, 191, 0.15), transparent)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px),
              linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-muted)] text-[var(--accent)] text-sm font-medium mb-6 animate-fade-in-up">
              <Sparkles className="w-4 h-4" />
              Works with any website
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up-delay-1">
              Universal{" "}
              <span className="gradient-text">Flow Evaluator</span>
            </h1>

            <p className="text-xl text-[var(--foreground-muted)] mb-10 leading-relaxed animate-fade-in-up-delay-2">
              Monitor and document any website&apos;s user flows. Create custom evaluations
              with our visual builder — no coding required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-3">
              <Link
                href="/quick-evaluate"
                className="group px-8 py-4 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[#38bdf8] text-[var(--background)] font-semibold text-lg shadow-lg shadow-[var(--accent-glow)] hover:shadow-xl hover:shadow-[var(--accent-glow)] hover:scale-[1.02] transition-all duration-300 flex items-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Quick Evaluate
              </Link>
              <Link
                href="/flows/new"
                className="px-8 py-4 rounded-xl glass text-[var(--foreground)] font-medium hover:border-[var(--accent)] transition-all duration-300 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Custom Flow
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-[var(--foreground-muted)] max-w-2xl mx-auto">
              A simple three-step process to evaluate any website flow
            </p>
          </div>
          <StepIndicator steps={howItWorksSteps} />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[var(--background-elevated)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-[var(--foreground-muted)] max-w-2xl mx-auto">
              Everything you need to monitor and document any user flow
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Your Flows Section */}
      <section id="flows-section" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Your Flows</h2>
              <p className="text-[var(--foreground-muted)]">
                Create and manage evaluation flows for any website
              </p>
            </div>
            <Link
              href="/flows/new"
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--background)] font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              New Flow
            </Link>
          </div>

          {isLoadingFlows ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
            </div>
          ) : flows.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--background-subtle)] flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-[var(--foreground-dim)]" />
              </div>
              <h3 className="text-lg font-medium mb-2">No flows yet</h3>
              <p className="text-sm text-[var(--foreground-muted)] mb-6 max-w-md mx-auto">
                Create your first evaluation flow to start monitoring any website&apos;s user journey.
              </p>
              <Link
                href="/flows/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-[var(--background)] font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-5 h-5" />
                Create Your First Flow
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {flows.map((flow) => (
                <div
                  key={flow.id}
                  className="group relative glass rounded-2xl p-6 hover:border-[var(--accent)] transition-all duration-300"
                >
                  {/* Menu Button */}
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === flow.id ? null : flow.id);
                      }}
                      className="p-2 rounded-lg hover:bg-[var(--background-subtle)] text-[var(--foreground-muted)] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeMenu === flow.id && (
                      <div className="absolute right-0 top-10 w-40 py-1 rounded-lg glass border border-[var(--border)] shadow-xl z-10">
                        <Link
                          href={`/flows/${flow.id}/edit`}
                          className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--background-subtle)] transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit Flow
                        </Link>
                        <button
                          onClick={() => handleDeleteFlow(flow.id)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors w-full"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--background-subtle)] flex items-center justify-center text-2xl">
                      {flow.iconEmoji || "🌐"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{flow.name}</h3>
                      <p className="text-sm text-[var(--foreground-muted)] truncate">
                        {flow.websiteName || new URL(flow.websiteUrl).hostname}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--foreground-muted)] mb-4 line-clamp-2">
                    {flow.description || `${flow.steps.length} steps defined`}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                    <span className="text-xs text-[var(--foreground-dim)]">
                      {flow.steps.length} steps
                    </span>
                    <Link
                      href={`/evaluate?flow=${flow.id}`}
                      className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                    >
                      Run Evaluation
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}

              {/* Add New Flow Card */}
              <Link
                href="/flows/new"
                className="group glass rounded-2xl p-6 border-dashed border-2 border-[var(--border)] hover:border-[var(--accent)] transition-all duration-300 flex flex-col items-center justify-center min-h-[200px]"
              >
                <div className="w-12 h-12 rounded-full bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--background)] transition-colors mb-3">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-[var(--foreground-muted)] group-hover:text-[var(--foreground)]">
                  Add New Flow
                </span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Recent Evaluations Section */}
      <section className="py-20 bg-[var(--background-elevated)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Recent Evaluations</h2>
              <p className="text-[var(--foreground-muted)]">
                View and compare past evaluation runs
              </p>
            </div>
            <button className="px-4 py-2 rounded-lg glass text-sm font-medium hover:border-[var(--accent)] transition-colors">
              View All
            </button>
          </div>
          <RecentEvaluations evaluations={evaluations} />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-[var(--foreground-dim)]">
              Universal Flow Evaluator — Works with any website
            </div>
            <div className="text-sm text-[var(--foreground-dim)]">
              Built with Next.js + Playwright
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
