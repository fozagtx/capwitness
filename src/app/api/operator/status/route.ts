import { NextResponse } from "next/server";
import { getReadiness } from "@/lib/proofrun/config";
import { isOperator } from "@/lib/proofrun/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOperator())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const readiness = getReadiness();
  return NextResponse.json(
    {
      ready: readiness.every((item) => item.ready),
      items: readiness,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

