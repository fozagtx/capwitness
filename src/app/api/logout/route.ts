import { NextResponse } from "next/server";
import { OPERATOR_COOKIE, shouldUseSecureCookie } from "@/lib/proofrun/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(OPERATOR_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: 0,
  });
  return response;
}

