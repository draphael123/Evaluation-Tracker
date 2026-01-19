"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import FlowCard from "@/components/FlowCard";
import FeatureCard from "@/components/FeatureCard";
import StepIndicator from "@/components/StepIndicator";
import RecentEvaluations, { EvaluationRun } from "@/components/RecentEvaluations";
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
  Users,
  Heart,
} from "lucide-react";

const howItWorksSteps = [
  {
    number: 1,
    title: "Configure",
    description:
      "Select which flow to evaluate — Men's TRT, Women's HRT, or other patient journeys.",
    icon: <Settings2 className="w-7 h-7" />,
  },
  {
    number: 2,
    title: "Run",
    description:
      "The tool automatically navigates through the evaluation, capturing screenshots and data at each step.",
    icon: <Play className="w-7 h-7" />,
  },
  {
    number: 3,
    title: "Review",
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
      "Automatic full-page screenshots at every step of the patient journey.",
  },
  {
    icon: <FileJson className="w-5 h-5" />,
    title: "Page Metadata",
    description:
      "Collect titles, forms, buttons, load times, and all page elements.",
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "Visual Reports",
    description:
      "Step-by-step visual reports with timeline view and summary stats.",
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
  const [evaluations, setEvaluations] = useState<EvaluationRun[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch("/api/get-reports");
        if (response.ok) {
          const data = await response.json();
          // Transform API data to match EvaluationRun interface
          const transformed: EvaluationRun[] = data.slice(0, 5).map((report: any) => ({
            id: report.id,
            flowType: report.flowType,
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

    fetchReports();
  }, []);

  const handleFlowSelect = (flowType: string) => {
    router.push(`/evaluate?flow=${flowType}`);
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(45, 212, 191, 0.15), transparent)",
          }}
        />

        {/* Grid pattern overlay */}
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
              Internal Tool v1.0
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up-delay-1">
              Fountain{" "}
              <span className="gradient-text">Flow Evaluator</span>
            </h1>

            <p className="text-xl text-[var(--foreground-muted)] mb-10 leading-relaxed animate-fade-in-up-delay-2">
              Monitor and document the TRT/HRT patient evaluation experience.
              Automatically capture screenshots, collect data, and generate
              visual reports.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up-delay-3">
              <button
                onClick={() => router.push("/evaluate")}
                className="group px-8 py-4 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[#38bdf8] text-[var(--background)] font-semibold text-lg shadow-lg shadow-[var(--accent-glow)] hover:shadow-xl hover:shadow-[var(--accent-glow)] hover:scale-[1.02] transition-all duration-300 flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Run New Evaluation
              </button>
              <button className="px-8 py-4 rounded-xl glass text-[var(--foreground)] font-medium hover:border-[var(--accent)] transition-all duration-300">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-[var(--foreground-muted)] max-w-2xl mx-auto">
              A simple three-step process to evaluate and document patient flows
            </p>
          </div>

          <StepIndicator steps={howItWorksSteps} />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[var(--background-elevated)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-[var(--foreground-muted)] max-w-2xl mx-auto">
              Everything you need to monitor and document patient evaluation
              flows
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

      {/* Flow Selection Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Select a Flow to Evaluate
            </h2>
            <p className="text-[var(--foreground-muted)] max-w-2xl mx-auto">
              Choose which patient journey you want to monitor and document
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <FlowCard
              title="Men's TRT Evaluation"
              description="Testosterone Replacement Therapy evaluation flow for male patients including symptom assessment, health history, and treatment eligibility."
              flowType="mens-trt"
              icon={<Users className="w-6 h-6" />}
              stats={{
                lastRun: "30 min ago",
                totalRuns: 24,
                successRate: 95,
              }}
              onSelect={handleFlowSelect}
            />
            <FlowCard
              title="Women's HRT Evaluation"
              description="Hormone Replacement Therapy evaluation flow for female patients covering menopause symptoms, hormone levels, and treatment options."
              flowType="womens-hrt"
              icon={<Heart className="w-6 h-6" />}
              stats={{
                lastRun: "2 hours ago",
                totalRuns: 18,
                successRate: 100,
              }}
              onSelect={handleFlowSelect}
            />
          </div>
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
              Fountain Flow Evaluator — Internal Tool
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
