import { NextResponse } from "next/server";
import {
  createOperatorSession,
  OPERATOR_COOKIE,
  OPERATOR_SESSION_SECONDS,
  shouldUseSecureCookie,
  verifyOperatorToken,
} from "@/lib/proofrun/auth";

export async function POST(request: Request) {
  let token = "";

  try {
    const body = (await request.json()) as unknown;
    if (
      body &&
      typeof body === "object" &&
      "token" in body &&
      typeof body.token === "string"
    ) {
      token = body.token;
    }
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (
    !process.env.CAPWITNESS_OPERATOR_TOKEN ||
    process.env.CAPWITNESS_OPERATOR_TOKEN.length < 12
  ) {
    return NextResponse.json(
      { error: "Operator access is not configured on this deployment." },
      { status: 503 },
    );
  }

  if (!verifyOperatorToken(token)) {
    return NextResponse.json(
      { error: "The operator token is incorrect." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(OPERATOR_COOKIE, createOperatorSession(), {
    httpOnly: true,
    sameSite: "strict",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: OPERATOR_SESSION_SECONDS,
  });
  return response;
}

