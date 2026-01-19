"use client";

import Link from "next/link";
import { Activity, History, Settings, Zap } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#38bdf8] flex items-center justify-center shadow-lg shadow-[var(--accent-glow)] group-hover:shadow-xl group-hover:shadow-[var(--accent-glow)] transition-shadow">
              <Activity className="w-5 h-5 text-[var(--background)]" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Flow<span className="text-[var(--foreground-muted)]">Evaluator</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/quick-evaluate"
              className="px-4 py-2 text-sm font-medium text-[var(--accent)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Quick Evaluate
            </Link>
            <Link
              href="/evaluate"
              className="px-4 py-2 text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              Custom Flows
            </Link>
            <button className="p-2 rounded-lg hover:bg-[var(--background-subtle)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

