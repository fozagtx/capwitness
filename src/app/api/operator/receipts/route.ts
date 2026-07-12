import { NextResponse } from "next/server";
import { listReceipts } from "@/lib/proofrun/receipt-store";
import { isOperator } from "@/lib/proofrun/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOperator())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const receipts = await listReceipts();
  return NextResponse.json(
    { receipts },
    { headers: { "Cache-Control": "no-store" } },
  );
}

