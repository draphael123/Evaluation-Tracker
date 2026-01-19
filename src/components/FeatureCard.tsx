"use client";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <div className="group p-6 rounded-2xl bg-[var(--background-elevated)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all duration-300">
      <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)] mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
        {description}
      </p>
    </div>
  );
}

