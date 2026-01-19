"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

export interface EvaluationRun {
  id: string;
  flowType: string;
  flowName: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed";
  stepsCompleted: number;
  totalSteps: number;
  duration?: string;
}

interface RecentEvaluationsProps {
  evaluations: EvaluationRun[];
}

const statusConfig = {
  running: {
    icon: Loader2,
    class: "status-warning",
    label: "Running",
    iconClass: "animate-spin",
  },
  completed: {
    icon: CheckCircle2,
    class: "status-success",
    label: "Completed",
    iconClass: "",
  },
  failed: {
    icon: XCircle,
    class: "status-error",
    label: "Failed",
    iconClass: "",
  },
};

export default function RecentEvaluations({
  evaluations,
}: RecentEvaluationsProps) {
  if (evaluations.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--background-subtle)] flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-[var(--foreground-dim)]" />
        </div>
        <h3 className="text-lg font-medium mb-2">No evaluations yet</h3>
        <p className="text-sm text-[var(--foreground-muted)]">
          Run your first evaluation to see results here
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider px-6 py-4">
                Flow
              </th>
              <th className="text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider px-6 py-4">
                Status
              </th>
              <th className="text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider px-6 py-4">
                Progress
              </th>
              <th className="text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider px-6 py-4">
                Duration
              </th>
              <th className="text-left text-xs font-medium text-[var(--foreground-muted)] uppercase tracking-wider px-6 py-4">
                Time
              </th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((evaluation) => {
              const status = statusConfig[evaluation.status];
              const StatusIcon = status.icon;

              return (
                <tr
                  key={evaluation.id}
                  className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--background-subtle)] transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{evaluation.flowName}</div>
                      <div className="text-xs text-[var(--foreground-dim)] font-mono">
                        {evaluation.flowType}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.class}`}
                    >
                      <StatusIcon className={`w-3.5 h-3.5 ${status.iconClass}`} />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-[var(--background-subtle)] rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                          style={{
                            width: `${(evaluation.stepsCompleted / evaluation.totalSteps) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-[var(--foreground-muted)] tabular-nums">
                        {evaluation.stepsCompleted}/{evaluation.totalSteps}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[var(--foreground-muted)] tabular-nums">
                      {evaluation.duration || "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-[var(--foreground-muted)]">
                      {formatDistanceToNow(new Date(evaluation.startedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/report/${evaluation.id}`}
                      className="inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                    >
                      View
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

