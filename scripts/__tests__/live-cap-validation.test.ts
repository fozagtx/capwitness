import { describe, expect, it } from "vitest";
import {
  assertCanonicalReceiptMatch,
  crossCheckReceipt,
  parseLiveConfig,
  parsePendingState,
  requireSpendConfirmation,
  validatePendingState,
  validatePriceAndToken,
} from "../live-cap-validation";
import {
  PUBLIC_RECEIPT_LIMITATIONS,
  receiptSchema,
  runRequirementsSchema,
} from "../../src/lib/proofrun/schema";
import { hashJson } from "../../src/lib/proofrun/hashing";

const providerAgentId = "agent_provider_test";
const buyerAgentId = "agent_buyer_test";
const serviceId = "service_capwitness_test";
const targetServiceId = "service_target_test";
const paymentToken = "0x1111111111111111111111111111111111111111";

function validEnvironment(): Record<string, string> {
  return {
    CROO_API_URL: "https://api.test.invalid",
    CROO_WS_URL: "wss://ws.test.invalid",
    CROO_SDK_KEY: "provider-key-test-only",
    CAPWITNESS_AGENT_ID: providerAgentId,
    CAPWITNESS_SERVICE_ID: serviceId,
    CAPWITNESS_LIVE_BUYER_SDK_KEY: "buyer-key-test-only",
    CAPWITNESS_LIVE_BUYER_AGENT_ID: buyerAgentId,
    CAPWITNESS_LIVE_REQUIREMENTS_FILE: "/tmp/test-requirements.json",
    CAPWITNESS_LIVE_MAX_OUTER_PRICE: "1.25",
    CAPWITNESS_LIVE_EXPECTED_PAYMENT_TOKEN: paymentToken,
    CAPWITNESS_LIVE_WAIT_TIMEOUT_MS: "10000",
    CAPWITNESS_LIVE_PENDING_STATE_FILE: "/tmp/test-pending.json",
    CAPWITNESS_LIVE_RESULT_DIR: "/tmp/test-results",
    CAPWITNESS_LIVE_APP_URL: "https://app.test.invalid",
    CAPWITNESS_WORKFLOW_DB_URL: "file:./data/test-workflows.db",
    CAPWITNESS_RECEIPT_DIR: "/tmp/test-receipts",
    CAPWITNESS_OPERATOR_TOKEN: "operator-token-test-only",
  };
}

const requirements = runRequirementsSchema.parse({
  targetServiceId,
  input: { testOnly: true },
  assertions: [{ path: "ok", operator: "equals", expected: true }],
  timeoutMs: 10_000,
  publicReceipt: false,
});

function validPendingState() {
  return parsePendingState({
    version: 1,
    outerNegotiationId: "negotiation_outer_test",
    outerOrderId: "order_outer_test",
    serviceId,
    requesterAgentId: buyerAgentId,
    providerAgentId,
    observedPrice: "1.25",
    observedPaymentToken: paymentToken,
    targetServiceId,
    inputHash: hashJson(requirements.input),
    requirementsHash: hashJson(requirements),
    negotiationCreatedAt: "2026-01-01T00:00:00.000Z",
    orderCreatedAt: "2026-01-01T00:00:01.000Z",
    preparedAt: "2026-01-01T00:00:02.000Z",
  });
}

function validReceipt() {
  return receiptSchema.parse({
    version: "1.0",
    runId: "123e4567-e89b-42d3-a456-426614174000",
    scope: "one_observed_run",
    status: "completed",
    public: false,
    targetServiceId,
    inputHash: hashJson(requirements.input),
    outer: {
      negotiationId: "negotiation_outer_test",
      orderId: "order_outer_test",
      status: "completed",
    },
    inner: {
      negotiationId: "negotiation_inner_test",
      orderId: "order_inner_test",
      status: "completed",
      paymentTxHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    timing: {
      startedAt: "2026-01-01T00:00:00.000Z",
      targetStartedAt: "2026-01-01T00:00:01.000Z",
      targetCompletedAt: "2026-01-01T00:00:03.000Z",
      completedAt: "2026-01-01T00:00:04.000Z",
      observedLatencyMs: 2_000,
    },
    assertions: [],
    sdk: { package: "@croo-network/sdk", version: "0.2.1" },
    limitations: [...PUBLIC_RECEIPT_LIMITATIONS],
  });
}

describe("live buyer fail-closed gates", () => {
  it("rejects missing configuration and shared credentials", () => {
    const missing = validEnvironment();
    delete missing.CAPWITNESS_LIVE_EXPECTED_PAYMENT_TOKEN;
    expect(() => parseLiveConfig(missing)).toThrow();

    const shared = validEnvironment();
    shared.CAPWITNESS_LIVE_BUYER_SDK_KEY = shared.CROO_SDK_KEY;
    shared.CAPWITNESS_LIVE_BUYER_AGENT_ID = shared.CAPWITNESS_AGENT_ID;
    expect(() => parseLiveConfig(shared)).toThrow(/distinct/u);
  });

  it("rejects prices above the ceiling and token mismatches", () => {
    expect(() =>
      validatePriceAndToken("1.2501", paymentToken, "1.25", paymentToken),
    ).toThrow(/ceiling/u);
    expect(() =>
      validatePriceAndToken(
        "1.25",
        "0x2222222222222222222222222222222222222222",
        "1.25",
        paymentToken,
      ),
    ).toThrow(/token/u);
    expect(() =>
      validatePriceAndToken("1.2500", paymentToken, "1.25", paymentToken),
    ).not.toThrow();
  });

  it("validates pending state against the current explicit inputs", () => {
    const config = parseLiveConfig(validEnvironment());
    const state = validPendingState();
    expect(() =>
      validatePendingState(state, config, {
        requirements,
        inputHash: hashJson(requirements.input),
        requirementsHash: hashJson(requirements),
      }),
    ).not.toThrow();

    expect(() =>
      validatePendingState(
        { ...state, targetServiceId: "service_other_test" },
        config,
        {
          requirements,
          inputHash: hashJson(requirements.input),
          requirementsHash: hashJson(requirements),
        },
      ),
    ).toThrow(/does not match/u);
    expect(() =>
      parsePendingState({ ...state, rawRequirements: requirements }),
    ).toThrow();
  });

  it("cross-checks delivered and authenticated receipts canonically", () => {
    const receipt = validReceipt();
    const state = validPendingState();
    expect(() => crossCheckReceipt(receipt, state, "0.2.1")).not.toThrow();
    expect(() =>
      crossCheckReceipt(
        {
          ...receipt,
          inner: { ...receipt.inner, paymentTxHash: undefined },
        },
        state,
        "0.2.1",
      ),
    ).toThrow(/missing inner/u);
    expect(() =>
      assertCanonicalReceiptMatch(receipt, {
        ...receipt,
        assertions: [...receipt.assertions],
      }),
    ).not.toThrow();
    expect(() =>
      assertCanonicalReceiptMatch(receipt, {
        ...receipt,
        inner: { ...receipt.inner, status: "rejected" },
      }),
    ).toThrow(/does not match/u);
  });

  it("requires the exact one-payment confirmation phrase", () => {
    expect(() =>
      requireSpendConfirmation("I_ACCEPT_ONE_REAL_CAP_PAYMENT"),
    ).not.toThrow();
    expect(() =>
      requireSpendConfirmation("I_ACCEPT_ONE_REAL_CAP_PAYMENT "),
    ).toThrow(/exactly equal/u);
    expect(() => requireSpendConfirmation(undefined)).toThrow(/exactly equal/u);
  });
});
