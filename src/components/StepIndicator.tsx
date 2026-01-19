"use client";

interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface StepIndicatorProps {
  steps: Step[];
}

export default function StepIndicator({ steps }: StepIndicatorProps) {
  return (
    <div className="relative">
      {/* Connection line */}
      <div className="absolute top-8 left-8 right-8 h-0.5 bg-gradient-to-r from-[var(--accent)] via-[var(--accent)] to-[var(--border)] hidden md:block" />

      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step, index) => (
          <div key={step.number} className="relative">
            <div className="flex flex-col items-center text-center">
              {/* Step circle */}
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#38bdf8] flex items-center justify-center text-[var(--background)] shadow-lg shadow-[var(--accent-glow)] mb-4">
                {step.icon}
              </div>

              {/* Step number badge */}
              <div className="absolute -top-1 -right-1 md:right-auto md:left-[calc(50%+1.5rem)] w-6 h-6 rounded-full bg-[var(--background-elevated)] border-2 border-[var(--accent)] flex items-center justify-center">
                <span className="text-xs font-bold text-[var(--accent)]">
                  {step.number}
                </span>
              </div>

              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-[var(--foreground-muted)] leading-relaxed max-w-xs">
                {step.description}
              </p>
            </div>

            {/* Mobile connector */}
            {index < steps.length - 1 && (
              <div className="flex justify-center my-4 md:hidden">
                <div className="w-0.5 h-8 bg-gradient-to-b from-[var(--accent)] to-[var(--border)]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

