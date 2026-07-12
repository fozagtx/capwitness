import { z } from "zod";

const identifier = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9_:.~-]+$/, "Use a CROO identifier, not a URL.");

const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string().max(20_000),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValue).max(100),
    z.record(z.string().max(120), jsonValue),
  ]),
);

export const assertionSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .max(160)
      .regex(
        /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/,
        "Use a dot-separated JSON path.",
      ),
    operator: z.enum(["exists", "equals", "type", "matches"]),
    expected: jsonValue.optional(),
  })
  .superRefine((assertion, context) => {
    if (assertion.operator !== "exists" && assertion.expected === undefined) {
      context.addIssue({
        code: "custom",
        path: ["expected"],
        message: `${assertion.operator} requires an expected value.`,
      });
    }

    if (
      assertion.operator === "matches" &&
      (typeof assertion.expected !== "string" ||
        assertion.expected.length > 200)
    ) {
      context.addIssue({
        code: "custom",
        path: ["expected"],
        message: "matches requires a string pattern up to 200 characters.",
      });
    }
  });

export const runRequirementsSchema = z.object({
  targetServiceId: identifier,
  input: jsonValue,
  assertions: z.array(assertionSchema).max(8),
  timeoutMs: z.number().int().min(10_000).max(120_000),
  publicReceipt: z.boolean(),
});

export type RunRequirements = z.infer<typeof runRequirementsSchema>;
export type Assertion = z.infer<typeof assertionSchema>;

export const assertionResultSchema = z.object({
  path: z.string(),
  operator: assertionSchema.shape.operator,
  passed: z.boolean(),
  expected: jsonValue.optional(),
  observed: jsonValue.optional(),
  message: z.string(),
});

export const failureCategorySchema = z.enum([
  "configuration",
  "invalid_request",
  "insufficient_balance",
  "spend_limit",
  "target_rejected",
  "target_expired",
  "target_timeout",
  "target_delivery",
  "cap_api",
  "internal",
]);

export const receiptSchema = z.object({
  version: z.literal("1.0"),
  runId: z.uuid(),
  scope: z.literal("one_observed_run"),
  status: z.enum(["completed", "failed", "partial"]),
  public: z.boolean(),
  targetServiceId: identifier,
  inputHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  deliverableHash: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
  deliverableType: z.string().max(40).optional(),
  outer: z.object({
    negotiationId: identifier,
    orderId: identifier.optional(),
    status: z.string().max(40),
  }),
  inner: z.object({
    negotiationId: identifier.optional(),
    orderId: identifier.optional(),
    status: z.string().max(40),
    paymentTxHash: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/)
      .optional(),
  }),
  timing: z.object({
    startedAt: z.iso.datetime(),
    targetStartedAt: z.iso.datetime().optional(),
    targetCompletedAt: z.iso.datetime().optional(),
    completedAt: z.iso.datetime(),
    observedLatencyMs: z.number().int().nonnegative().optional(),
  }),
  assertions: z.array(assertionResultSchema),
  failure: z
    .object({
      category: failureCategorySchema,
      message: z.string().max(500),
    })
    .optional(),
  sdk: z.object({
    package: z.literal("@croo-network/sdk"),
    version: z.string(),
  }),
  limitations: z.array(z.string()).min(1),
});

export type Receipt = z.infer<typeof receiptSchema>;
export type AssertionResult = z.infer<typeof assertionResultSchema>;
export type FailureCategory = z.infer<typeof failureCategorySchema>;

export const PUBLIC_RECEIPT_LIMITATIONS = [
  "This receipt describes one observed run only.",
  "It is not a security audit, certification, or guarantee of future behavior.",
  "Assertions are deterministic checks over the observed deliverable.",
] as const;

