import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export const OPERATOR_COOKIE = "capwitness_operator";
export const OPERATOR_SESSION_SECONDS = 60 * 60;

export function shouldUseSecureCookie(request: Request): boolean {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  return forwardedProtocol
    ? forwardedProtocol === "https"
    : new URL(request.url).protocol === "https:";
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function verifyOperatorToken(
  candidate: string,
  configured = process.env.CAPWITNESS_OPERATOR_TOKEN,
): boolean {
  if (!configured || configured.length < 12 || !candidate) {
    return false;
  }

  return timingSafeEqual(digest(candidate), digest(configured));
}

function signature(expiry: number, configured: string): string {
  return createHmac("sha256", configured)
    .update(`capwitness-operator:${expiry}`)
    .digest("base64url");
}

export function createOperatorSession(
  configured = process.env.CAPWITNESS_OPERATOR_TOKEN,
  now = Date.now(),
): string {
  if (!configured || configured.length < 12) {
    throw new Error("CAPWITNESS_OPERATOR_TOKEN is not configured.");
  }

  const expiry = Math.floor(now / 1_000) + OPERATOR_SESSION_SECONDS;
  return `${expiry}.${signature(expiry, configured)}`;
}

export function verifyOperatorSession(
  value: string | undefined,
  configured = process.env.CAPWITNESS_OPERATOR_TOKEN,
  now = Date.now(),
): boolean {
  if (!configured || configured.length < 12 || !value) {
    return false;
  }

  const [rawExpiry, providedSignature, ...extra] = value.split(".");
  const expiry = Number(rawExpiry);
  if (
    extra.length > 0 ||
    !providedSignature ||
    !Number.isSafeInteger(expiry) ||
    expiry <= Math.floor(now / 1_000)
  ) {
    return false;
  }

  const expected = signature(expiry, configured);
  return timingSafeEqual(digest(providedSignature), digest(expected));
}

