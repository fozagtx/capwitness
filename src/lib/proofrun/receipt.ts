import type { AssertionResult, FailureCategory, Receipt } from "./schema";
import { PUBLIC_RECEIPT_LIMITATIONS, receiptSchema } from "./schema";

export type ReceiptDraft = {
  runId: string;
  public: boolean;
  targetServiceId: string;
  inputHash: `sha256:${string}`;
  outerNegotiationId: string;
  outerOrderId?: string;
  outerStatus: string;
  innerNegotiationId?: string;
  innerOrderId?: string;
  innerStatus: string;
  paymentTxHash?: string;
  startedAt: string;
  targetStartedAt?: string;
  targetCompletedAt?: string;
  deliverableHash?: `sha256:${string}`;
  deliverableType?: string;
  assertions?: AssertionResult[];
  failure?: {
    category: FailureCategory;
    message: string;
  };
  sdkVersion: string;
};

export function buildReceipt(draft: ReceiptDraft): Receipt {
  const completedAt = new Date().toISOString();
  const targetStarted = draft.targetStartedAt
    ? Date.parse(draft.targetStartedAt)
    : undefined;
  const targetCompleted = draft.targetCompletedAt
    ? Date.parse(draft.targetCompletedAt)
    : undefined;
  const assertionFailed = draft.assertions?.some((item) => !item.passed);

  return receiptSchema.parse({
    version: "1.0",
    runId: draft.runId,
    scope: "one_observed_run",
    status: draft.failure || assertionFailed ? "failed" : "completed",
    public: draft.public,
    targetServiceId: draft.targetServiceId,
    inputHash: draft.inputHash,
    deliverableHash: draft.deliverableHash,
    deliverableType: draft.deliverableType,
    outer: {
      negotiationId: draft.outerNegotiationId,
      orderId: draft.outerOrderId,
      status: draft.outerStatus,
    },
    inner: {
      negotiationId: draft.innerNegotiationId,
      orderId: draft.innerOrderId,
      status: draft.innerStatus,
      paymentTxHash: draft.paymentTxHash,
    },
    timing: {
      startedAt: draft.startedAt,
      targetStartedAt: draft.targetStartedAt,
      targetCompletedAt: draft.targetCompletedAt,
      completedAt,
      observedLatencyMs:
        targetStarted !== undefined && targetCompleted !== undefined
          ? Math.max(0, targetCompleted - targetStarted)
          : undefined,
    },
    assertions: draft.assertions ?? [],
    failure: draft.failure,
    sdk: {
      package: "@croo-network/sdk",
      version: draft.sdkVersion,
    },
    limitations: [...PUBLIC_RECEIPT_LIMITATIONS],
  });
}

