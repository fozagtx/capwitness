import { NextResponse } from "next/server";
import { z } from "zod";
import { getReceipt, publicReceipt } from "@/lib/proofrun/receipt-store";
import { isOperator } from "@/lib/proofrun/server-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  if (!z.uuid().safeParse(runId).success) {
    return NextResponse.json(
      { error: "Receipt ID is invalid." },
      { status: 400 },
    );
  }

  try {
    const receipt = await getReceipt(runId);
    if (!receipt) {
      return NextResponse.json(
        { error: "Receipt not found." },
        { status: 404 },
      );
    }

    const visible = publicReceipt(receipt);
    if (!visible && !(await isOperator())) {
      return NextResponse.json(
        { error: "This receipt is private." },
        { status: 403 },
      );
    }

    return NextResponse.json(visible ?? receipt, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Receipt storage could not be read." },
      { status: 500 },
    );
  }
}

