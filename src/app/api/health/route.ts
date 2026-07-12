import { NextResponse } from "next/server";
import { getReadiness, isWorkerReady } from "@/lib/proofrun/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = getReadiness().filter((item) => item.key !== "operator");
  const ready = isWorkerReady();

  return NextResponse.json(
    {
      service: "capwitness",
      status: ready ? "ready" : "degraded",
      capConfigured: readiness.every((item) => item.ready),
      checkedAt: new Date().toISOString(),
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

