"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import FlowBuilder from "@/components/FlowBuilder";
import { DynamicFlow } from "@/lib/types";
import { Loader2, AlertTriangle } from "lucide-react";

export default function EditFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [flow, setFlow] = useState<DynamicFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlow = async () => {
      try {
        const response = await fetch(`/api/flows/${id}`);
        if (!response.ok) {
          throw new Error("Flow not found");
        }
        const data = await response.json();
        setFlow(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load flow");
      } finally {
        setLoading(false);
      }
    };

    fetchFlow();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-16 px-6">
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !flow) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-16 px-6">
          <div className="text-center py-32">
            <div className="w-16 h-16 rounded-full bg-[var(--error)]/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-[var(--error)]" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Flow Not Found</h2>
            <p className="text-[var(--foreground-muted)] mb-6">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-lg glass hover:border-[var(--accent)] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 px-6">
        <FlowBuilder initialFlow={flow} isEditing />
      </main>
    </div>
  );
}

