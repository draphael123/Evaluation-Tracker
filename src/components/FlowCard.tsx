"use client";

import { ArrowRight, Users, Clock, CheckCircle2 } from "lucide-react";

interface FlowCardProps {
  title: string;
  description: string;
  flowType: string;
  icon: React.ReactNode;
  stats?: {
    lastRun?: string;
    totalRuns?: number;
    successRate?: number;
  };
  onSelect: (flowType: string) => void;
}

export default function FlowCard({
  title,
  description,
  flowType,
  icon,
  stats,
  onSelect,
}: FlowCardProps) {
  return (
    <button
      onClick={() => onSelect(flowType)}
      className="group relative w-full text-left p-6 rounded-2xl glass hover:border-[var(--accent)] transition-all duration-300 overflow-hidden"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-muted)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--background-subtle)] flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--background)] transition-all duration-300">
            {icon}
          </div>
          <ArrowRight className="w-5 h-5 text-[var(--foreground-dim)] group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all duration-300" />
        </div>

        <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--accent)] transition-colors">
          {title}
        </h3>
        <p className="text-sm text-[var(--foreground-muted)] mb-4 line-clamp-2">
          {description}
        </p>

        {stats && (
          <div className="flex items-center gap-4 pt-4 border-t border-[var(--border)]">
            {stats.lastRun && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-dim)]">
                <Clock className="w-3.5 h-3.5" />
                <span>{stats.lastRun}</span>
              </div>
            )}
            {stats.totalRuns !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-dim)]">
                <Users className="w-3.5 h-3.5" />
                <span>{stats.totalRuns} runs</span>
              </div>
            )}
            {stats.successRate !== undefined && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--success)]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{stats.successRate}%</span>
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

