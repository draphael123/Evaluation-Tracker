"use client";

import Header from "@/components/Header";
import FlowBuilder from "@/components/FlowBuilder";

export default function NewFlowPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 px-6">
        <FlowBuilder />
      </main>
    </div>
  );
}

