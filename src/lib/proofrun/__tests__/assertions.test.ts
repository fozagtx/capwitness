import { describe, expect, it } from "vitest";
import { evaluateAssertions, parseDeliverable } from "../assertions";

describe("bounded assertions", () => {
  it("evaluates nested JSON without executing buyer code", () => {
    const results = evaluateAssertions(
      {
        status: "ok",
        result: { count: 3, label: "proof-run-2026" },
      },
      [
        { path: "status", operator: "equals", expected: "ok" },
        { path: "result.count", operator: "type", expected: "number" },
        { path: "result.label", operator: "matches", expected: "proof-*" },
        { path: "result.missing", operator: "exists" },
      ],
    );

    expect(results.map((result) => result.passed)).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it("rejects non-JSON and oversized target deliveries", () => {
    expect(() => parseDeliverable("not json")).toThrow("not valid JSON");
    expect(() => parseDeliverable(`"${"x".repeat(100_001)}"`)).toThrow(
      "100 KB",
    );
  });
});

