import { describe, expect, it } from "vitest";
import { exceedsDecimalAmount } from "../amount";
import {
  createOperatorSession,
  shouldUseSecureCookie,
  verifyOperatorSession,
  verifyOperatorToken,
} from "../auth";
import { getWorkerConfig } from "../config";
import { buildReceipt } from "../receipt";
import { runRequirementsSchema } from "../schema";

describe("operator authentication", () => {
  const secret = "test-only-operator-secret";

  it("uses an expiring signed session instead of storing the raw token", () => {
    const now = Date.UTC(2026, 6, 11);
    const session = createOperatorSession(secret, now);

    expect(session).not.toContain(secret);
    expect(verifyOperatorToken(secret, secret)).toBe(true);
    expect(verifyOperatorToken("incorrect", secret)).toBe(false);
    expect(verifyOperatorSession(session, secret, now + 1_000)).toBe(true);
    expect(verifyOperatorSession(session, secret, now + 3_700_000)).toBe(false);
  });

  it("keeps local HTTP usable while securing HTTPS deployments", () => {
    expect(shouldUseSecureCookie(new Request("http://127.0.0.1:3000"))).toBe(
      false,
    );
    expect(shouldUseSecureCookie(new Request("https://capwitness.example"))).toBe(
      true,
    );
    expect(
      shouldUseSecureCookie(
        new Request("http://internal:3000", {
          headers: { "x-forwarded-proto": "https" },
        }),
      ),
    ).toBe(true);
  });
});

describe("CAPWitness contracts", () => {
  it("compares integer and decimal CAP prices without floating-point loss", () => {
    expect(exceedsDecimalAmount("0.1000001", "0.1")).toBe(true);
    expect(exceedsDecimalAmount("10", "10.000")).toBe(false);
    expect(exceedsDecimalAmount("999999999999999999", "1000000000000000000")).toBe(
      false,
    );
  });

  it("rejects URLs as target service identifiers", () => {
    const result = runRequirementsSchema.safeParse({
      targetServiceId: "https://untrusted.example",
      input: {},
      assertions: [],
      timeoutMs: 90_000,
      publicReceipt: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects requirements when any explicit execution control is omitted", () => {
    const base = {
      targetServiceId: "target-service",
      input: {},
      assertions: [],
      timeoutMs: 90_000,
      publicReceipt: false,
    };

    for (const key of ["assertions", "timeoutMs", "publicReceipt"] as const) {
      const incomplete = Object.fromEntries(
        Object.entries(base).filter(([candidate]) => candidate !== key),
      );
      expect(runRequirementsSchema.safeParse(incomplete).success).toBe(false);
    }
  });

  it("fails closed when the operator omits the inner spend limit", () => {
    const environment = {
      CROO_API_URL: "https://api.croo.test",
      CROO_WS_URL: "wss://api.croo.test/ws",
      CROO_SDK_KEY: "test-only-sdk-key",
      CAPWITNESS_SERVICE_ID: "capwitness-service",
    };

    expect(() => getWorkerConfig(environment)).toThrow();
    expect(
      getWorkerConfig({
        ...environment,
        CAPWITNESS_MAX_INNER_PRICE: "1.25",
        CAPWITNESS_WORKFLOW_DB_URL: "file:./test-workflows.db",
      }),
    ).toMatchObject({
      maxInnerPrice: "1.25",
      sdkVersion: expect.any(String),
    });
  });

  it("marks a receipt failed when a deterministic assertion fails", () => {
    const receipt = buildReceipt({
      runId: "7c925b0a-cfac-4a68-b578-725ec9c29d43",
      public: true,
      targetServiceId: "target-service",
      inputHash:
        "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      outerNegotiationId: "outer-negotiation",
      outerOrderId: "outer-order",
      outerStatus: "paid",
      innerNegotiationId: "inner-negotiation",
      innerOrderId: "inner-order",
      innerStatus: "completed",
      startedAt: "2026-07-11T20:00:00.000Z",
      assertions: [
        {
          path: "status",
          operator: "equals",
          passed: false,
          expected: "ok",
          observed: "error",
          message: "Observed value differs.",
        },
      ],
      sdkVersion: "0.2.1",
    });

    expect(receipt.status).toBe("failed");
    expect(receipt.scope).toBe("one_observed_run");
    expect(receipt.limitations).toContain(
      "It is not a security audit, certification, or guarantee of future behavior.",
    );
  });
});

