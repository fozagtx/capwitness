import { canonicalJson } from "./hashing";
import type { Assertion, AssertionResult } from "./schema";

const MISSING = Symbol("missing");
const SUPPORTED_TYPES = new Set([
  "array",
  "boolean",
  "null",
  "number",
  "object",
  "string",
]);

function readPath(value: unknown, path: string): unknown | typeof MISSING {
  let current = value;

  for (const segment of path.split(".")) {
    if (
      current === null ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !(segment in current)
    ) {
      return MISSING;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function wildcardMatches(value: string, pattern: string): boolean {
  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");

  return new RegExp(`^${escaped}$`, "u").test(value.slice(0, 2_000));
}

function evaluate(assertion: Assertion, document: unknown): AssertionResult {
  const observed = readPath(document, assertion.path);
  const exists = observed !== MISSING;

  if (assertion.operator === "exists") {
    return {
      path: assertion.path,
      operator: assertion.operator,
      passed: exists,
      observed: exists ? observed : undefined,
      message: exists ? "Path exists." : "Path was not present.",
    };
  }

  if (!exists) {
    return {
      path: assertion.path,
      operator: assertion.operator,
      passed: false,
      expected: assertion.expected,
      message: "Path was not present.",
    };
  }

  if (assertion.operator === "equals") {
    const passed =
      canonicalJson(observed) === canonicalJson(assertion.expected);
    return {
      path: assertion.path,
      operator: assertion.operator,
      passed,
      expected: assertion.expected,
      observed,
      message: passed ? "Values are equal." : "Observed value differs.",
    };
  }

  if (assertion.operator === "type") {
    const expected =
      typeof assertion.expected === "string" ? assertion.expected : "";
    const observedType = typeOf(observed);
    const validExpected = SUPPORTED_TYPES.has(expected);
    const passed = validExpected && observedType === expected;
    return {
      path: assertion.path,
      operator: assertion.operator,
      passed,
      expected: assertion.expected,
      observed: observedType,
      message: validExpected
        ? passed
          ? "Type matches."
          : `Observed ${observedType}.`
        : "Expected type is unsupported.",
    };
  }

  const pattern =
    typeof assertion.expected === "string" ? assertion.expected : "";
  const passed =
    typeof observed === "string" && wildcardMatches(observed, pattern);

  return {
    path: assertion.path,
    operator: assertion.operator,
    passed,
    expected: assertion.expected,
    observed,
    message: passed
      ? "String matches the bounded wildcard pattern."
      : "String does not match the bounded wildcard pattern.",
  };
}

export function evaluateAssertions(
  document: unknown,
  assertions: Assertion[],
): AssertionResult[] {
  return assertions.map((assertion) => evaluate(assertion, document));
}

export function parseDeliverable(content: string): unknown {
  if (Buffer.byteLength(content, "utf8") > 100_000) {
    throw new Error("Target deliverable exceeds the 100 KB evaluation limit.");
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("Target deliverable is not valid JSON.");
  }
}

