import { NextResponse } from "next/server";
import { initializeDatabase, isDatabaseConfigured } from "@/lib/db";

export async function POST() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured. Add POSTGRES_URL to environment variables." },
      { status: 500 }
    );
  }

  const result = await initializeDatabase();

  if (result.success) {
    return NextResponse.json({ message: "Database initialized successfully" });
  } else {
    return NextResponse.json(
      { error: "Failed to initialize database", details: result.error },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    configured: isDatabaseConfigured(),
    message: isDatabaseConfigured()
      ? "Database is configured. POST to this endpoint to initialize tables."
      : "Database not configured. Add POSTGRES_URL to environment variables.",
  });
}

