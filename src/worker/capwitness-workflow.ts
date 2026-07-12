import {
  DeliverableType,
  isInsufficientBalance,
  type Delivery,
  type Negotiation,
  type Order,
} from "@croo-network/sdk";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { exceedsDecimalAmount } from "@/lib/proofrun/amount";
import { evaluateAssertions, parseDeliverable } from "@/lib/proofrun/assertions";
import { canonicalJson, hashJson, sha256 } from "@/lib/proofrun/hashing";
import { buildReceipt } from "@/lib/proofrun/receipt";
import { saveReceipt } from "@/lib/proofrun/receipt-store";
import {
  failureCategorySchema,
  receiptSchema,
  runRequirementsSchema,
  type FailureCategory,
  type Receipt,
} from "@/lib/proofrun/schema";
import type { WorkerConfig } from "@/lib/proofrun/config";

export type CrooClient = Pick<
  import("@croo-network/sdk").AgentClient,
  | "acceptNegotiation"
  | "deliverOrder"
  | "getDelivery"
  | "getNegotiation"
  | "getOrder"
  | "listNegotiations"
  | "listOrders"
  | "negotiateOrder"
  | "payOrder"
  | "rejectNegotiation"
  | "rejectOrder"
>;

const PAGE_SIZE = 100;
const MAX_PAGES = 10_000;

const workflowInputSchema = z.object({
  outerNegotiationId: z.string().min(1),
  requirements: runRequirementsSchema,
  startedAt: z.iso.datetime(),
});

const failureSchema = z.object({
  category: failureCategorySchema,
  message: z.string().max(500),
});

export const lifecycleSchema = z.object({
  runId: z.uuid(),
  requirements: runRequirementsSchema,
  inputHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  startedAt: z.iso.datetime(),
  targetStartedAt: z.iso.datetime().optional(),
  targetCompletedAt: z.iso.datetime().optional(),
  deadlineAt: z.iso.datetime().optional(),
  outerNegotiationId: z.string().min(1),
  outerOrderId: z.string().min(1).optional(),
  outerStatus: z.string(),
  innerNegotiationId: z.string().min(1).optional(),
  innerOrderId: z.string().min(1).optional(),
  innerStatus: z.string(),
  paymentTxHash: z.string().optional(),
  deliverableContent: z.string().optional(),
  deliverableType: z.string().optional(),
  failure: failureSchema.optional(),
});

const lifecycleWithReceiptSchema = lifecycleSchema.extend({
  receipt: receiptSchema,
});

const wakeSchema = z.object({
  reason: z.enum(["event", "startup", "timer"]),
  observedAt: z.iso.datetime(),
});

export type LifecycleState = z.infer<typeof lifecycleSchema>;

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message.slice(0, 500)
    : "Unknown CAP operation error.";
}

function metadataRunId(negotiation: Negotiation): string | undefined {
  try {
    const metadata = JSON.parse(negotiation.metadata) as unknown;
    if (
      metadata &&
      typeof metadata === "object" &&
      "capWitnessRunId" in metadata &&
      typeof metadata.capWitnessRunId === "string"
    ) {
      return metadata.capWitnessRunId;
    }
  } catch {
    return undefined;
  }
}

export async function listAllNegotiations(
  client: CrooClient,
  role: "provider" | "requester",
): Promise<Negotiation[]> {
  const records: Negotiation[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await client.listNegotiations({ role, page, pageSize: PAGE_SIZE });
    records.push(...batch);
    if (batch.length < PAGE_SIZE) return records;
  }
  throw new Error("CAP negotiation pagination exceeded the safety bound.");
}

export async function listAllOrders(
  client: CrooClient,
  role: "provider" | "buyer",
): Promise<Order[]> {
  const records: Order[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await client.listOrders({ role, page, pageSize: PAGE_SIZE });
    records.push(...batch);
    if (batch.length < PAGE_SIZE) return records;
  }
  throw new Error("CAP order pagination exceeded the safety bound.");
}

async function findOrderForNegotiation(
  client: CrooClient,
  role: "provider" | "buyer",
  negotiationId: string,
): Promise<Order | undefined> {
  return (await listAllOrders(client, role)).find(
    (order) => order.negotiationId === negotiationId,
  );
}

function withFailure(
  state: LifecycleState,
  category: FailureCategory,
  message: string,
): LifecycleState {
  return {
    ...state,
    targetCompletedAt: state.targetCompletedAt ?? new Date().toISOString(),
    innerStatus:
      category === "target_timeout" || category === "target_expired"
        ? "expired"
        : category === "target_rejected"
          ? "rejected"
          : "failed",
    failure: { category, message: message.slice(0, 500) },
  };
}

function receiptDraft(state: LifecycleState) {
  return {
    runId: state.runId,
    public: state.requirements.publicReceipt,
    targetServiceId: state.requirements.targetServiceId,
    inputHash: state.inputHash as `sha256:${string}`,
    outerNegotiationId: state.outerNegotiationId,
    outerOrderId: state.outerOrderId,
    outerStatus: state.outerStatus,
    innerNegotiationId: state.innerNegotiationId,
    innerOrderId: state.innerOrderId,
    innerStatus: state.innerStatus,
    paymentTxHash: state.paymentTxHash,
    startedAt: state.startedAt,
    targetStartedAt: state.targetStartedAt,
    targetCompletedAt: state.targetCompletedAt,
  };
}

function deliveryContent(delivery: Delivery): string {
  return delivery.deliverableType === DeliverableType.Schema
    ? delivery.deliverableSchema
    : delivery.deliverableText;
}

export function createCAPWitnessWorkflow(
  client: CrooClient,
  config: WorkerConfig,
) {
  const ensureOuterAccepted = createStep({
    id: "ensure-outer-accepted",
    inputSchema: workflowInputSchema,
    outputSchema: lifecycleSchema,
    resumeSchema: wakeSchema,
    suspendSchema: z.object({
      outerNegotiationId: z.string().min(1),
      outerStatus: z.string(),
    }),
    retries: 0,
    execute: async ({ inputData, runId, suspend }) => {
      let negotiation = await client.getNegotiation(inputData.outerNegotiationId);
      let order = await findOrderForNegotiation(
        client,
        "provider",
        negotiation.negotiationId,
      );

      if (negotiation.status === "pending") {
        try {
          const accepted = await client.acceptNegotiation(negotiation.negotiationId);
          negotiation = accepted.negotiation;
          order = accepted.order;
        } catch (error) {
          negotiation = await client.getNegotiation(negotiation.negotiationId);
          order = await findOrderForNegotiation(
            client,
            "provider",
            negotiation.negotiationId,
          );
          if (negotiation.status !== "accepted") throw error;
        }
      }

      if (negotiation.status !== "accepted") {
        throw new Error(`Outer negotiation is ${negotiation.status}, not accepted.`);
      }
      if (!order) {
        return suspend({
          outerNegotiationId: negotiation.negotiationId,
          outerStatus: negotiation.status,
        });
      }

      return {
        runId,
        requirements: inputData.requirements,
        inputHash: hashJson(inputData.requirements.input),
        startedAt: inputData.startedAt,
        outerNegotiationId: negotiation.negotiationId,
        outerOrderId: order.orderId,
        outerStatus: order.status,
        innerStatus: "not_started",
      };
    },
  });

  const awaitOuterPaid = createStep({
    id: "await-authoritative-outer-paid",
    inputSchema: lifecycleSchema,
    outputSchema: lifecycleSchema,
    resumeSchema: wakeSchema,
    suspendSchema: lifecycleSchema.pick({
      outerNegotiationId: true,
      outerOrderId: true,
      outerStatus: true,
    }),
    retries: 0,
    execute: async ({ inputData, suspend }) => {
      const order =
        (inputData.outerOrderId
          ? await client.getOrder(inputData.outerOrderId)
          : await findOrderForNegotiation(
              client,
              "provider",
              inputData.outerNegotiationId,
            ));

      if (!order || !["paid", "completed"].includes(order.status)) {
        return suspend({
          outerNegotiationId: inputData.outerNegotiationId,
          outerOrderId: order?.orderId,
          outerStatus: order?.status ?? inputData.outerStatus,
        });
      }
      return {
        ...inputData,
        outerOrderId: order.orderId,
        outerStatus: order.status,
      };
    },
  });

  const ensureInnerNegotiation = createStep({
    id: "ensure-inner-negotiation",
    inputSchema: lifecycleSchema,
    outputSchema: lifecycleSchema,
    retries: 0,
    execute: async ({ inputData, runId }) => {
      if (inputData.failure) return inputData;
      const targetStartedAt =
        inputData.targetStartedAt ?? new Date().toISOString();
      const deadlineAt =
        inputData.deadlineAt ??
        new Date(
          Date.parse(targetStartedAt) + inputData.requirements.timeoutMs,
        ).toISOString();
      let negotiation = inputData.innerNegotiationId
        ? await client.getNegotiation(inputData.innerNegotiationId)
        : (await listAllNegotiations(client, "requester")).find(
            (item) => metadataRunId(item) === runId,
          );

      if (!negotiation) {
        try {
          negotiation = await client.negotiateOrder({
            serviceId: inputData.requirements.targetServiceId,
            requirements: canonicalJson(inputData.requirements.input),
            metadata: canonicalJson({ capWitnessRunId: runId }),
          });
        } catch (error) {
          negotiation = (await listAllNegotiations(client, "requester")).find(
            (item) => metadataRunId(item) === runId,
          );
          if (!negotiation) throw error;
        }
      }

      return {
        ...inputData,
        targetStartedAt,
        deadlineAt,
        innerNegotiationId: negotiation.negotiationId,
        innerStatus: negotiation.status,
      };
    },
  });

  const ensureInnerOrderAndPayment = createStep({
    id: "await-ensure-inner-order-and-payment",
    inputSchema: lifecycleSchema,
    outputSchema: lifecycleSchema,
    resumeSchema: wakeSchema,
    suspendSchema: lifecycleSchema.pick({
      innerNegotiationId: true,
      innerOrderId: true,
      innerStatus: true,
      deadlineAt: true,
    }),
    retries: 0,
    execute: async ({ inputData, suspend }) => {
      if (inputData.failure) return inputData;
      if (!inputData.innerNegotiationId) {
        throw new Error("Inner negotiation correlation is missing.");
      }

      const negotiation = await client.getNegotiation(
        inputData.innerNegotiationId,
      );
      let order = inputData.innerOrderId
        ? await client.getOrder(inputData.innerOrderId)
        : await findOrderForNegotiation(
            client,
            "buyer",
            inputData.innerNegotiationId,
          );

      if (!order) {
        if (negotiation.status === "rejected") {
          return withFailure(
            inputData,
            "target_rejected",
            negotiation.rejectReason || "Target rejected the negotiation.",
          );
        }
        if (negotiation.status === "expired") {
          return withFailure(
            inputData,
            "target_expired",
            "Target negotiation expired.",
          );
        }
        if (inputData.deadlineAt && Date.now() >= Date.parse(inputData.deadlineAt)) {
          return withFailure(
            inputData,
            "target_timeout",
            "Target did not create an order before the configured deadline.",
          );
        }
        return suspend({
          innerNegotiationId: inputData.innerNegotiationId,
          innerStatus: negotiation.status,
          deadlineAt: inputData.deadlineAt,
        });
      }

      let state: LifecycleState = {
        ...inputData,
        innerOrderId: order.orderId,
        innerStatus: order.status,
        paymentTxHash: inputData.paymentTxHash || order.payTxHash || undefined,
      };

      if (order.status === "created") {
        if (exceedsDecimalAmount(order.price, config.maxInnerPrice)) {
          try {
            await client.rejectOrder(
              order.orderId,
              "Target price exceeds the configured CAPWitness spend limit.",
            );
          } catch (error) {
            order = await client.getOrder(order.orderId);
            if (order.status !== "rejected") throw error;
          }
          return withFailure(
            { ...state, innerStatus: order.status },
            "spend_limit",
            "Target price exceeds the configured CAPWitness spend limit.",
          );
        }

        try {
          const paid = await client.payOrder(order.orderId);
          state = {
            ...state,
            innerStatus: paid.order.status,
            paymentTxHash: paid.txHash,
          };
        } catch (error) {
          order = await client.getOrder(order.orderId);
          if (isInsufficientBalance(error) && order.status === "created") {
            return withFailure(
              state,
              "insufficient_balance",
              "The CAPWitness AA wallet does not have enough payment tokens.",
            );
          }
          if (!["paid", "completed", "delivering"].includes(order.status)) {
            throw error;
          }
          state = {
            ...state,
            innerStatus: order.status,
            paymentTxHash: state.paymentTxHash || order.payTxHash || undefined,
          };
        }
      }
      return state;
    },
  });

  const awaitTargetTerminal = createStep({
    id: "await-target-terminal",
    inputSchema: lifecycleSchema,
    outputSchema: lifecycleSchema,
    resumeSchema: wakeSchema,
    suspendSchema: lifecycleSchema.pick({
      innerNegotiationId: true,
      innerOrderId: true,
      innerStatus: true,
      deadlineAt: true,
    }),
    retries: 0,
    execute: async ({ inputData, suspend }) => {
      if (inputData.failure) return inputData;
      if (!inputData.innerOrderId) {
        throw new Error("Inner order correlation is missing.");
      }
      const order = await client.getOrder(inputData.innerOrderId);
      const state = {
        ...inputData,
        innerStatus: order.status,
        paymentTxHash: inputData.paymentTxHash || order.payTxHash || undefined,
      };

      if (order.status === "completed") {
        const delivery = await client.getDelivery(order.orderId);
        return {
          ...state,
          targetCompletedAt: new Date().toISOString(),
          deliverableContent: deliveryContent(delivery),
          deliverableType: delivery.deliverableType,
        };
      }
      if (order.status === "rejected") {
        return withFailure(
          state,
          "target_rejected",
          order.rejectReason || "Target order was rejected.",
        );
      }
      if (order.status === "expired") {
        return withFailure(state, "target_expired", "Target order expired.");
      }
      if (state.deadlineAt && Date.now() >= Date.parse(state.deadlineAt)) {
        return withFailure(
          state,
          "target_timeout",
          "Target did not complete within the configured timeout.",
        );
      }
      return suspend({
        innerNegotiationId: state.innerNegotiationId,
        innerOrderId: state.innerOrderId,
        innerStatus: state.innerStatus,
        deadlineAt: state.deadlineAt,
      });
    },
  });

  const evaluateReceipt = createStep({
    id: "evaluate-delivery-build-receipt",
    inputSchema: lifecycleSchema,
    outputSchema: lifecycleWithReceiptSchema,
    retries: 0,
    execute: async ({ inputData }) => {
      let state = inputData;
      let receipt: Receipt;
      if (state.failure) {
        receipt = buildReceipt({
          ...receiptDraft(state),
          failure: state.failure,
          sdkVersion: config.sdkVersion,
        });
      } else {
        const content = state.deliverableContent;
        if (content === undefined) {
          state = withFailure(
            state,
            "target_delivery",
            "Completed target order has no delivery content.",
          );
          receipt = buildReceipt({
            ...receiptDraft(state),
            failure: state.failure,
            sdkVersion: config.sdkVersion,
          });
        } else {
          try {
            const assertions = evaluateAssertions(
              parseDeliverable(content),
              state.requirements.assertions,
            );
            receipt = buildReceipt({
              ...receiptDraft(state),
              deliverableHash: sha256(content),
              deliverableType: state.deliverableType,
              assertions,
              sdkVersion: config.sdkVersion,
            });
          } catch (error) {
            state = withFailure(state, "target_delivery", errorMessage(error));
            receipt = buildReceipt({
              ...receiptDraft(state),
              deliverableHash: sha256(content),
              deliverableType: state.deliverableType,
              failure: state.failure,
              sdkVersion: config.sdkVersion,
            });
          }
        }
      }
      return { ...state, receipt };
    },
  });

  const persistReceipt = createStep({
    id: "persist-receipt",
    inputSchema: lifecycleWithReceiptSchema,
    outputSchema: lifecycleWithReceiptSchema,
    retries: 0,
    execute: async ({ inputData }) => {
      await saveReceipt(inputData.receipt, config.receiptDir);
      return inputData;
    },
  });

  const ensureOuterDelivery = createStep({
    id: "ensure-outer-delivery",
    inputSchema: lifecycleWithReceiptSchema,
    outputSchema: lifecycleWithReceiptSchema,
    retries: 0,
    execute: async ({ inputData }) => {
      if (!inputData.outerOrderId) {
        throw new Error("Outer order correlation is missing.");
      }
      let outer = await client.getOrder(inputData.outerOrderId);
      if (outer.status === "paid") {
        try {
          const delivered = await client.deliverOrder(outer.orderId, {
            deliverableType: DeliverableType.Text,
            deliverableText: canonicalJson(inputData.receipt),
          });
          outer = delivered.order;
        } catch (error) {
          outer = await client.getOrder(outer.orderId);
          if (!["delivering", "completed"].includes(outer.status)) throw error;
        }
      }
      if (!["delivering", "completed"].includes(outer.status)) {
        throw new Error(
          `Outer order is ${outer.status}; delivery cannot be ensured safely.`,
        );
      }
      return { ...inputData, outerStatus: outer.status };
    },
  });

  const awaitOuterDelivery = createStep({
    id: "await-authoritative-outer-delivery",
    inputSchema: lifecycleWithReceiptSchema,
    outputSchema: receiptSchema,
    resumeSchema: wakeSchema,
    suspendSchema: lifecycleSchema.pick({
      outerOrderId: true,
      outerStatus: true,
    }),
    retries: 0,
    execute: async ({ inputData, suspend }) => {
      if (!inputData.outerOrderId) {
        throw new Error("Outer order correlation is missing.");
      }
      const outer = await client.getOrder(inputData.outerOrderId);
      if (outer.status !== "completed") {
        if (outer.status !== "delivering") {
          throw new Error(
            `Outer delivery entered unexpected status ${outer.status}.`,
          );
        }
        return suspend({
          outerOrderId: outer.orderId,
          outerStatus: outer.status,
        });
      }
      return inputData.receipt;
    },
  });

  return createWorkflow({
    id: "capwitness-run",
    inputSchema: workflowInputSchema,
    outputSchema: receiptSchema,
  })
    .then(ensureOuterAccepted)
    .then(awaitOuterPaid)
    .then(ensureInnerNegotiation)
    .then(ensureInnerOrderAndPayment)
    .then(awaitTargetTerminal)
    .then(evaluateReceipt)
    .then(persistReceipt)
    .then(ensureOuterDelivery)
    .then(awaitOuterDelivery)
    .commit();
}

