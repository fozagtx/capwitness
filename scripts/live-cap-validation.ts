import { randomUUID } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  rm,
} from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  AgentClient,
  APIError,
  DeliverableType,
  type Delivery,
  type Negotiation,
  type Order,
} from "@croo-network/sdk";
import { z } from "zod";
import { exceedsDecimalAmount } from "../src/lib/proofrun/amount";
import {
  canonicalJson,
  hashJson,
} from "../src/lib/proofrun/hashing";
import {
  PUBLIC_RECEIPT_LIMITATIONS,
  receiptSchema,
  runRequirementsSchema,
  type Receipt,
  type RunRequirements,
} from "../src/lib/proofrun/schema";

const require = createRequire(import.meta.url);
const CONFIRM_SPEND_PHRASE = "I_ACCEPT_ONE_REAL_CAP_PAYMENT";
const PAGE_SIZE = 100;
const MAX_PAGES = 1_000;
const POLL_INTERVAL_MS = 2_000;
const MIN_WAIT_TIMEOUT_MS = 10_000;
const MAX_WAIT_TIMEOUT_MS = 30 * 60_000;
const REQUEST_TIMEOUT_MS = 30_000;
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_:.~-]+$/u;
const PAYMENT_TOKEN_PATTERN = /^0x[a-fA-F0-9]{40}$/u;

type Environment = Record<string, string | undefined>;
type BuyerClient = Pick<
  AgentClient,
  | "getDelivery"
  | "getNegotiation"
  | "getOrder"
  | "listNegotiations"
  | "listOrders"
  | "negotiateOrder"
  | "payOrder"
>;
type ReachabilityClient = Pick<AgentClient, "listNegotiations">;

const absolutePathSchema = z
  .string()
  .min(1)
  .refine(path.isAbsolute, "Must be an absolute path.");
const identifierSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(IDENTIFIER_PATTERN);
const httpsUrlSchema = z
  .url()
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Must use HTTPS.",
  });
const wssUrlSchema = z
  .url()
  .refine((value) => new URL(value).protocol === "wss:", {
    message: "Must use WSS.",
  });
const fileUrlSchema = z
  .string()
  .regex(
    /^file:(?:\/|\.{1,2}\/).+$/u,
    "Must be an explicit file: URL, not an in-memory database.",
  );
const decimalSchema = z
  .string()
  .regex(/^\d+(?:\.\d+)?$/u, "Must be an explicit non-negative decimal.");

const liveEnvironmentSchema = z
  .object({
    CROO_API_URL: httpsUrlSchema,
    CROO_WS_URL: wssUrlSchema,
    CROO_SDK_KEY: z.string().min(12),
    CAPWITNESS_AGENT_ID: identifierSchema,
    CAPWITNESS_SERVICE_ID: identifierSchema,
    CAPWITNESS_LIVE_BUYER_SDK_KEY: z.string().min(12),
    CAPWITNESS_LIVE_BUYER_AGENT_ID: identifierSchema,
    CAPWITNESS_LIVE_REQUIREMENTS_FILE: absolutePathSchema,
    CAPWITNESS_LIVE_MAX_OUTER_PRICE: decimalSchema,
    CAPWITNESS_LIVE_EXPECTED_PAYMENT_TOKEN: z
      .string()
      .regex(PAYMENT_TOKEN_PATTERN),
    CAPWITNESS_LIVE_WAIT_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(MIN_WAIT_TIMEOUT_MS)
      .max(MAX_WAIT_TIMEOUT_MS),
    CAPWITNESS_LIVE_PENDING_STATE_FILE: absolutePathSchema,
    CAPWITNESS_LIVE_RESULT_DIR: absolutePathSchema,
    CAPWITNESS_LIVE_APP_URL: httpsUrlSchema,
    CAPWITNESS_WORKFLOW_DB_URL: fileUrlSchema,
    CAPWITNESS_RECEIPT_DIR: absolutePathSchema,
    CAPWITNESS_OPERATOR_TOKEN: z.string().min(12),
    BASE_RPC_URL: httpsUrlSchema.optional(),
  })
  .strict()
  .superRefine((environment, context) => {
    if (environment.CROO_SDK_KEY === environment.CAPWITNESS_LIVE_BUYER_SDK_KEY) {
      context.addIssue({
        code: "custom",
        path: ["CAPWITNESS_LIVE_BUYER_SDK_KEY"],
        message: "Provider and buyer SDK keys must be distinct.",
      });
    }
    if (
      environment.CAPWITNESS_AGENT_ID ===
      environment.CAPWITNESS_LIVE_BUYER_AGENT_ID
    ) {
      context.addIssue({
        code: "custom",
        path: ["CAPWITNESS_LIVE_BUYER_AGENT_ID"],
        message: "Provider and buyer agent IDs must be distinct.",
      });
    }
  });

export type LiveConfig = {
  apiUrl: string;
  wsUrl: string;
  providerSdkKey: string;
  providerAgentId: string;
  buyerSdkKey: string;
  buyerAgentId: string;
  serviceId: string;
  requirementsFile: string;
  maxOuterPrice: string;
  expectedPaymentToken: string;
  waitTimeoutMs: number;
  pendingStateFile: string;
  resultDir: string;
  appUrl: string;
  workflowDbUrl: string;
  receiptDir: string;
  operatorToken: string;
  rpcUrl?: string;
};

const pendingStateSchema = z
  .object({
    version: z.literal(1),
    outerNegotiationId: identifierSchema,
    outerOrderId: identifierSchema,
    serviceId: identifierSchema,
    requesterAgentId: identifierSchema,
    providerAgentId: identifierSchema,
    observedPrice: decimalSchema,
    observedPaymentToken: z.string().regex(PAYMENT_TOKEN_PATTERN),
    targetServiceId: identifierSchema,
    inputHash: z.string().regex(SHA256_PATTERN),
    requirementsHash: z.string().regex(SHA256_PATTERN),
    negotiationCreatedAt: z.iso.datetime(),
    orderCreatedAt: z.iso.datetime(),
    preparedAt: z.iso.datetime(),
  })
  .strict();

export type PendingState = z.infer<typeof pendingStateSchema>;

const healthSchema = z
  .object({
    service: z.literal("capwitness"),
    status: z.literal("ready"),
    capConfigured: z.literal(true),
    checkedAt: z.iso.datetime(),
  })
  .passthrough();

const artifactSchema = z
  .object({
    version: z.literal(1),
    kind: z.literal("capwitness_live_buyer_validation"),
    validatedAt: z.iso.datetime(),
    outerNegotiationId: identifierSchema,
    outerOrderId: identifierSchema,
    observedPrice: decimalSchema,
    observedPaymentToken: z.string().regex(PAYMENT_TOKEN_PATTERN),
    receipt: receiptSchema,
    checks: z.object({
      authoritativeOuterState: z.literal(true),
      receiptContract: z.literal(true),
      appReceiptCanonicalMatch: z.literal(true),
    }),
  })
  .strict();

type PreflightResult = {
  requirements: RunRequirements;
  inputHash: `sha256:${string}`;
  requirementsHash: `sha256:${string}`;
};

function selectedEnvironment(environment: Environment): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(liveEnvironmentSchema.shape).map((key) => [
      key,
      environment[key],
    ]),
  );
}

export function parseLiveConfig(environment: Environment): LiveConfig {
  const parsed = liveEnvironmentSchema.parse(selectedEnvironment(environment));
  return {
    apiUrl: parsed.CROO_API_URL.replace(/\/+$/u, ""),
    wsUrl: parsed.CROO_WS_URL,
    providerSdkKey: parsed.CROO_SDK_KEY,
    providerAgentId: parsed.CAPWITNESS_AGENT_ID,
    buyerSdkKey: parsed.CAPWITNESS_LIVE_BUYER_SDK_KEY,
    buyerAgentId: parsed.CAPWITNESS_LIVE_BUYER_AGENT_ID,
    serviceId: parsed.CAPWITNESS_SERVICE_ID,
    requirementsFile: parsed.CAPWITNESS_LIVE_REQUIREMENTS_FILE,
    maxOuterPrice: parsed.CAPWITNESS_LIVE_MAX_OUTER_PRICE,
    expectedPaymentToken:
      parsed.CAPWITNESS_LIVE_EXPECTED_PAYMENT_TOKEN.toLowerCase(),
    waitTimeoutMs: parsed.CAPWITNESS_LIVE_WAIT_TIMEOUT_MS,
    pendingStateFile: parsed.CAPWITNESS_LIVE_PENDING_STATE_FILE,
    resultDir: parsed.CAPWITNESS_LIVE_RESULT_DIR,
    appUrl: parsed.CAPWITNESS_LIVE_APP_URL.replace(/\/+$/u, ""),
    workflowDbUrl: parsed.CAPWITNESS_WORKFLOW_DB_URL,
    receiptDir: parsed.CAPWITNESS_RECEIPT_DIR,
    operatorToken: parsed.CAPWITNESS_OPERATOR_TOKEN,
    rpcUrl: parsed.BASE_RPC_URL,
  };
}

export function requireSpendConfirmation(value: string | undefined): void {
  if (value !== CONFIRM_SPEND_PHRASE) {
    throw new Error(
      `CAPWITNESS_LIVE_CONFIRM_SPEND must exactly equal ${CONFIRM_SPEND_PHRASE}.`,
    );
  }
}

export function validatePriceAndToken(
  price: string,
  paymentToken: string,
  maxPrice: string,
  expectedPaymentToken: string,
): void {
  if (exceedsDecimalAmount(price, maxPrice)) {
    throw new Error("Outer order price exceeds the explicit live spend ceiling.");
  }
  if (
    !PAYMENT_TOKEN_PATTERN.test(paymentToken) ||
    paymentToken.toLowerCase() !== expectedPaymentToken.toLowerCase()
  ) {
    throw new Error("Outer order payment token does not match the explicit token.");
  }
}

export function parsePendingState(value: unknown): PendingState {
  return pendingStateSchema.parse(value);
}

export function validatePendingState(
  state: PendingState,
  config: LiveConfig,
  preflight: PreflightResult,
): void {
  if (
    state.serviceId !== config.serviceId ||
    state.providerAgentId !== config.providerAgentId ||
    state.requesterAgentId !== config.buyerAgentId ||
    state.targetServiceId !== preflight.requirements.targetServiceId ||
    state.inputHash !== preflight.inputHash ||
    state.requirementsHash !== preflight.requirementsHash
  ) {
    throw new Error("Pending state does not match the explicit live inputs.");
  }
  validatePriceAndToken(
    state.observedPrice,
    state.observedPaymentToken,
    config.maxOuterPrice,
    config.expectedPaymentToken,
  );
}

function assertOrderIdentity(
  order: Order,
  state: Pick<
    PendingState,
    | "outerNegotiationId"
    | "outerOrderId"
    | "serviceId"
    | "requesterAgentId"
    | "providerAgentId"
  >,
): void {
  if (
    order.orderId !== state.outerOrderId ||
    order.negotiationId !== state.outerNegotiationId ||
    order.serviceId !== state.serviceId ||
    order.requesterAgentId !== state.requesterAgentId ||
    order.providerAgentId !== state.providerAgentId
  ) {
    throw new Error("Authoritative outer order identity does not match pending state.");
  }
}

function parseTime(value: string, label: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Receipt ${label} is not a valid timestamp.`);
  }
  return timestamp;
}

export function crossCheckReceipt(
  receipt: Receipt,
  state: PendingState,
  sdkVersion: string,
): void {
  if (
    receipt.outer.negotiationId !== state.outerNegotiationId ||
    receipt.outer.orderId !== state.outerOrderId
  ) {
    throw new Error("Receipt outer IDs do not match the pending outer order.");
  }
  if (
    receipt.targetServiceId !== state.targetServiceId ||
    receipt.inputHash !== state.inputHash
  ) {
    throw new Error("Receipt target or input hash does not match pending state.");
  }
  if (
    !receipt.inner.negotiationId ||
    !receipt.inner.orderId ||
    !receipt.inner.paymentTxHash
  ) {
    throw new Error("Receipt is missing inner CAP IDs or the inner payment hash.");
  }
  if (
    receipt.scope !== "one_observed_run" ||
    receipt.sdk.package !== "@croo-network/sdk" ||
    receipt.sdk.version !== sdkVersion
  ) {
    throw new Error("Receipt scope or SDK provenance is invalid.");
  }
  if (
    canonicalJson(receipt.limitations) !==
    canonicalJson([...PUBLIC_RECEIPT_LIMITATIONS])
  ) {
    throw new Error("Receipt limitations do not match the production contract.");
  }

  const startedAt = parseTime(receipt.timing.startedAt, "startedAt");
  const targetStartedAt = receipt.timing.targetStartedAt
    ? parseTime(receipt.timing.targetStartedAt, "targetStartedAt")
    : undefined;
  const targetCompletedAt = receipt.timing.targetCompletedAt
    ? parseTime(receipt.timing.targetCompletedAt, "targetCompletedAt")
    : undefined;
  const completedAt = parseTime(receipt.timing.completedAt, "completedAt");
  if (
    targetStartedAt === undefined ||
    targetCompletedAt === undefined ||
    startedAt > targetStartedAt ||
    targetStartedAt > targetCompletedAt ||
    targetCompletedAt > completedAt ||
    receipt.timing.observedLatencyMs !== targetCompletedAt - targetStartedAt
  ) {
    throw new Error("Receipt timing is incomplete or internally inconsistent.");
  }
}

export function assertCanonicalReceiptMatch(
  delivered: Receipt,
  appReceipt: unknown,
): void {
  const parsedAppReceipt = receiptSchema.parse(appReceipt);
  if (canonicalJson(delivered) !== canonicalJson(parsedAppReceipt)) {
    throw new Error("Delivered receipt does not match the authenticated app receipt.");
  }
}

function safeLogger() {
  return {
    info() {},
    warn() {},
    error() {},
    debug() {},
  };
}

function createClients(config: LiveConfig): {
  provider: AgentClient;
  buyer: AgentClient;
} {
  const common = {
    baseURL: config.apiUrl,
    wsURL: config.wsUrl,
    rpcURL: config.rpcUrl,
    logger: safeLogger(),
  };
  return {
    provider: new AgentClient(common, config.providerSdkKey),
    buyer: new AgentClient(common, config.buyerSdkKey),
  };
}

async function bounded<T>(
  operation: Promise<T>,
  label: string,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} exceeded the request timeout.`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchJson(
  url: string,
  init: RequestInit,
  label: string,
): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
    });
    const body = (await response.json()) as unknown;
    if (!response.ok) {
      throw new Error(`${label} returned HTTP ${response.status}.`);
    }
    return { response, body };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${label} exceeded the request timeout.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function readRequirements(file: string): Promise<RunRequirements> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(await readFile(file, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      error instanceof SyntaxError
        ? "Requirements file is not valid JSON."
        : "Requirements file could not be read.",
    );
  }
  return runRequirementsSchema.parse(decoded);
}

export async function runPreflight(
  config: LiveConfig,
  clients: {
    provider: ReachabilityClient;
    buyer: ReachabilityClient;
  },
): Promise<PreflightResult> {
  const requirements = await readRequirements(config.requirementsFile);

  await bounded(
    clients.provider.listNegotiations({
      role: "provider",
      agentId: config.providerAgentId,
      page: 1,
      pageSize: 1,
    }),
    "Provider CROO reachability check",
  );
  await bounded(
    clients.buyer.listNegotiations({
      role: "requester",
      agentId: config.buyerAgentId,
      page: 1,
      pageSize: 1,
    }),
    "Buyer CROO reachability check",
  );

  const { body } = await fetchJson(
    `${config.appUrl}/api/health`,
    { method: "GET", cache: "no-store" },
    "CAPWitness app health check",
  );
  healthSchema.parse(body);

  return {
    requirements,
    inputHash: hashJson(requirements.input),
    requirementsHash: hashJson(requirements),
  };
}

export async function listAllNegotiations(
  client: Pick<AgentClient, "listNegotiations">,
  role: "provider" | "requester",
  agentId: string,
): Promise<Negotiation[]> {
  const records: Negotiation[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await bounded(
      client.listNegotiations({ role, agentId, page, pageSize: PAGE_SIZE }),
      "CROO negotiation list",
    );
    records.push(...batch);
    if (batch.length < PAGE_SIZE) return records;
  }
  throw new Error("CROO negotiation pagination exceeded its safety bound.");
}

export async function listAllOrders(
  client: Pick<AgentClient, "listOrders">,
  role: "provider" | "buyer",
  agentId: string,
): Promise<Order[]> {
  const records: Order[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await bounded(
      client.listOrders({ role, agentId, page, pageSize: PAGE_SIZE }),
      "CROO order list",
    );
    records.push(...batch);
    if (batch.length < PAGE_SIZE) return records;
  }
  throw new Error("CROO order pagination exceeded its safety bound.");
}

function metadataCorrelationId(negotiation: Negotiation): string | undefined {
  try {
    const metadata = JSON.parse(negotiation.metadata) as unknown;
    if (
      metadata &&
      typeof metadata === "object" &&
      "capWitnessLiveCorrelationId" in metadata &&
      typeof metadata.capWitnessLiveCorrelationId === "string"
    ) {
      return metadata.capWitnessLiveCorrelationId;
    }
  } catch {
    return undefined;
  }
}

async function reconcileNegotiation(
  client: BuyerClient,
  config: LiveConfig,
  correlationId: string,
): Promise<Negotiation | undefined> {
  const deadline = Date.now() + Math.min(config.waitTimeoutMs, REQUEST_TIMEOUT_MS);
  while (Date.now() < deadline) {
    const matches = (await listAllNegotiations(
      client,
      "requester",
      config.buyerAgentId,
    )).filter(
      (item) =>
        item.serviceId === config.serviceId &&
        item.requesterAgentId === config.buyerAgentId &&
        metadataCorrelationId(item) === correlationId,
    );
    if (matches.length > 1) {
      throw new Error(
        "Negotiation reconciliation found duplicate correlation IDs.",
      );
    }
    if (matches[0]) return matches[0];
    await sleepUntil(deadline);
  }
  return undefined;
}

function isAmbiguousMutationError(error: unknown): boolean {
  return !(
    error instanceof APIError &&
    error.httpStatus >= 400 &&
    error.httpStatus < 500 &&
    ![408, 429].includes(error.httpStatus)
  );
}

async function findOrderForNegotiation(
  client: BuyerClient,
  config: LiveConfig,
  negotiationId: string,
): Promise<Order | undefined> {
  return (await listAllOrders(client, "buyer", config.buyerAgentId)).find(
    (order) => order.negotiationId === negotiationId,
  );
}

async function waitForOuterOrder(
  client: BuyerClient,
  config: LiveConfig,
  negotiationId: string,
): Promise<{ negotiation: Negotiation; order: Order }> {
  const deadline = Date.now() + config.waitTimeoutMs;
  while (Date.now() < deadline) {
    const negotiation = await bounded(
      client.getNegotiation(negotiationId),
      "CROO negotiation read",
    );
    if (
      negotiation.serviceId !== config.serviceId ||
      negotiation.requesterAgentId !== config.buyerAgentId ||
      negotiation.providerAgentId !== config.providerAgentId
    ) {
      throw new Error("Authoritative outer negotiation identity is invalid.");
    }
    if (["rejected", "expired"].includes(negotiation.status)) {
      throw new Error(`Outer negotiation became ${negotiation.status}.`);
    }

    const order = await findOrderForNegotiation(client, config, negotiationId);
    if (
      order &&
      negotiation.status === "accepted" &&
      ["created", "paid", "delivering", "completed"].includes(order.status)
    ) {
      return { negotiation, order };
    }
    if (order && ["create_failed", "rejected", "expired"].includes(order.status)) {
      throw new Error(`Outer order became ${order.status}.`);
    }
    await sleepUntil(deadline);
  }
  throw new Error("Timed out waiting for provider acceptance and order creation.");
}

async function sleepUntil(deadline: number): Promise<void> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return;
  await new Promise((resolve) =>
    setTimeout(resolve, Math.min(POLL_INTERVAL_MS, remaining)),
  );
}

async function atomicWriteJson(
  file: string,
  value: unknown,
  mode = 0o600,
): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(temporary, "wx", mode);
    await handle.writeFile(`${canonicalJson(value)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await chmod(temporary, mode);
    await rename(temporary, file);
    await chmod(file, mode);
  } finally {
    await handle?.close().catch(() => undefined);
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

async function readPendingState(file: string): Promise<PendingState> {
  const fileInfo = await lstat(file).catch(() => undefined);
  if (
    !fileInfo ||
    !fileInfo.isFile() ||
    fileInfo.isSymbolicLink() ||
    (fileInfo.mode & 0o777) !== 0o600
  ) {
    throw new Error("Pending state must be a regular mode-0600 owner-only file.");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(await readFile(file, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      error instanceof SyntaxError
        ? "Pending state file is not valid JSON."
        : "Pending state file could not be read.",
    );
  }
  return parsePendingState(decoded);
}

async function pendingStateIfPresent(
  file: string,
): Promise<PendingState | undefined> {
  let fileInfo;
  try {
    fileInfo = await lstat(file);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }
    throw new Error("Pending state file could not be read.");
  }
  if (
    !fileInfo.isFile() ||
    fileInfo.isSymbolicLink() ||
    (fileInfo.mode & 0o777) !== 0o600
  ) {
    throw new Error("Pending state must be a regular mode-0600 owner-only file.");
  }
  return readPendingState(file);
}

function installedSdkVersion(): string {
  const packageData = z
    .object({ version: z.string().min(1) })
    .parse(require("@croo-network/sdk/package.json") as unknown);
  return packageData.version;
}

async function revalidatePendingOrder(
  client: BuyerClient,
  config: LiveConfig,
  state: PendingState,
): Promise<Order> {
  const order = await bounded(
    client.getOrder(state.outerOrderId),
    "CROO outer order read",
  );
  assertOrderIdentity(order, state);
  validatePriceAndToken(
    order.price,
    order.paymentToken,
    config.maxOuterPrice,
    config.expectedPaymentToken,
  );
  if (
    order.price !== state.observedPrice ||
    order.paymentToken.toLowerCase() !==
      state.observedPaymentToken.toLowerCase()
  ) {
    throw new Error("Authoritative outer price or token changed from pending state.");
  }
  return order;
}

export async function runPrepare(
  config: LiveConfig,
  clients: { provider: ReachabilityClient; buyer: BuyerClient },
): Promise<PendingState> {
  const preflight = await runPreflight(config, clients);
  const existing = await pendingStateIfPresent(config.pendingStateFile);
  if (existing) {
    validatePendingState(existing, config, preflight);
    await revalidatePendingOrder(clients.buyer, config, existing);
    return existing;
  }

  const correlationId = randomUUID();
  let negotiation: Negotiation;
  try {
    negotiation = await bounded(
      clients.buyer.negotiateOrder({
        serviceId: config.serviceId,
        requesterAgentId: config.buyerAgentId,
        requirements: canonicalJson(preflight.requirements),
        metadata: canonicalJson({
          capWitnessLiveCorrelationId: correlationId,
        }),
      }),
      "CROO outer negotiation creation",
    );
  } catch (error) {
    if (!isAmbiguousMutationError(error)) throw error;
    const reconciled = await reconcileNegotiation(
      clients.buyer,
      config,
      correlationId,
    );
    if (!reconciled) throw error;
    negotiation = reconciled;
  }

  const observed = await waitForOuterOrder(
    clients.buyer,
    config,
    negotiation.negotiationId,
  );
  const identity = {
    outerNegotiationId: observed.negotiation.negotiationId,
    outerOrderId: observed.order.orderId,
    serviceId: config.serviceId,
    requesterAgentId: config.buyerAgentId,
    providerAgentId: config.providerAgentId,
  };
  assertOrderIdentity(observed.order, identity);
  validatePriceAndToken(
    observed.order.price,
    observed.order.paymentToken,
    config.maxOuterPrice,
    config.expectedPaymentToken,
  );

  const state = pendingStateSchema.parse({
    version: 1,
    ...identity,
    observedPrice: observed.order.price,
    observedPaymentToken: observed.order.paymentToken,
    targetServiceId: preflight.requirements.targetServiceId,
    inputHash: preflight.inputHash,
    requirementsHash: preflight.requirementsHash,
    negotiationCreatedAt: observed.negotiation.createdTime,
    orderCreatedAt: observed.order.createdTime || observed.order.createdAt,
    preparedAt: new Date().toISOString(),
  });
  await atomicWriteJson(config.pendingStateFile, state);
  return state;
}

async function waitForOuterTerminal(
  client: BuyerClient,
  config: LiveConfig,
  state: PendingState,
): Promise<Order> {
  const deadline = Date.now() + config.waitTimeoutMs;
  while (Date.now() < deadline) {
    const order = await revalidatePendingOrder(client, config, state);
    if (order.status === "completed") return order;
    if (["rejected", "expired"].includes(order.status)) {
      throw new Error(`Outer order became ${order.status}.`);
    }
    if (!["paid", "delivering"].includes(order.status)) {
      throw new Error(`Outer order entered unexpected status ${order.status}.`);
    }
    await sleepUntil(deadline);
  }
  throw new Error("Timed out waiting for the outer order to complete.");
}

function deliveryContent(delivery: Delivery): string {
  return delivery.deliverableType === DeliverableType.Schema
    ? delivery.deliverableSchema
    : delivery.deliverableText;
}

async function fetchAuthenticatedReceipt(
  config: LiveConfig,
  runId: string,
): Promise<unknown> {
  const auth = await fetchJson(
    `${config.appUrl}/api/access`,
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: config.operatorToken }),
    },
    "CAPWitness operator authentication",
  );
  const setCookie = auth.response.headers.get("set-cookie");
  const cookie = setCookie?.split(";", 1)[0];
  if (!cookie) {
    throw new Error("CAPWitness operator authentication returned no session.");
  }
  const { body } = await fetchJson(
    `${config.appUrl}/api/receipts/${encodeURIComponent(runId)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { Cookie: cookie },
    },
    "CAPWitness authenticated receipt read",
  );
  return body;
}

export async function runExecute(
  config: LiveConfig,
  clients: { provider: ReachabilityClient; buyer: BuyerClient },
  confirmation: string | undefined,
): Promise<string> {
  requireSpendConfirmation(confirmation);
  const preflight = await runPreflight(config, clients);
  const state = await readPendingState(config.pendingStateFile);
  validatePendingState(state, config, preflight);

  let order = await revalidatePendingOrder(clients.buyer, config, state);
  if (order.status === "created") {
    try {
      const paid = await bounded(
        clients.buyer.payOrder(order.orderId),
        "CROO outer order payment",
      );
      order = paid.order;
    } catch (error) {
      order = await bounded(
        clients.buyer.getOrder(order.orderId),
        "CROO outer order payment reconciliation",
      );
      assertOrderIdentity(order, state);
      if (!["paid", "delivering", "completed"].includes(order.status)) {
        throw error;
      }
    }
    assertOrderIdentity(order, state);
    validatePriceAndToken(
      order.price,
      order.paymentToken,
      config.maxOuterPrice,
      config.expectedPaymentToken,
    );
    if (
      order.price !== state.observedPrice ||
      order.paymentToken.toLowerCase() !==
        state.observedPaymentToken.toLowerCase()
    ) {
      throw new Error("Paid outer price or token changed from the prepared state.");
    }
    if (!["paid", "delivering", "completed"].includes(order.status)) {
      throw new Error(
        `Payment returned unexpected outer order status ${order.status}.`,
      );
    }
  } else if (!["paid", "delivering", "completed"].includes(order.status)) {
    throw new Error(`Outer order is ${order.status}; payment is not permitted.`);
  }

  const completedOrder =
    order.status === "completed"
      ? order
      : await waitForOuterTerminal(clients.buyer, config, state);
  const delivery = await bounded(
    clients.buyer.getDelivery(completedOrder.orderId),
    "CROO outer delivery read",
  );
  let deliveredJson: unknown;
  try {
    deliveredJson = JSON.parse(deliveryContent(delivery)) as unknown;
  } catch {
    throw new Error("Outer delivery is not valid receipt JSON.");
  }
  const receipt = receiptSchema.parse(deliveredJson);
  crossCheckReceipt(receipt, state, installedSdkVersion());
  const appReceipt = await fetchAuthenticatedReceipt(config, receipt.runId);
  assertCanonicalReceiptMatch(receipt, appReceipt);

  const artifact = artifactSchema.parse({
    version: 1,
    kind: "capwitness_live_buyer_validation",
    validatedAt: new Date().toISOString(),
    outerNegotiationId: state.outerNegotiationId,
    outerOrderId: state.outerOrderId,
    observedPrice: completedOrder.price,
    observedPaymentToken: completedOrder.paymentToken,
    receipt,
    checks: {
      authoritativeOuterState: true,
      receiptContract: true,
      appReceiptCanonicalMatch: true,
    },
  });
  const resultFile = path.join(
    config.resultDir,
    `capwitness-live-${receipt.runId}.json`,
  );
  await atomicWriteJson(resultFile, artifact);
  return resultFile;
}

function safeFailureMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return `Validation failed: ${error.issues
      .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
      .join("; ")}`;
  }
  if (error instanceof APIError) {
    return `CROO API request failed (HTTP ${error.httpStatus}, ${error.reason}).`;
  }
  if (error instanceof Error && error.message.length <= 300) {
    return error.message;
  }
  return "Live validation failed without logging sensitive response data.";
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!["preflight", "prepare", "execute"].includes(command ?? "")) {
    throw new Error(
      "Usage: tsx scripts/live-cap-validation.ts <preflight|prepare|execute>",
    );
  }
  const config = parseLiveConfig(process.env);
  const clients = createClients(config);

  if (command === "preflight") {
    await runPreflight(config, clients);
    console.info("Preflight passed with zero CROO mutations.");
    console.info(
      "CAPWitness service existence is not confirmed here because the installed SDK has no service read method; prepare confirms it through negotiation/order state.",
    );
    return;
  }
  if (command === "prepare") {
    const state = await runPrepare(config, clients);
    console.info(
      `Prepared unpaid outer order ${state.outerOrderId}; no payment was attempted.`,
    );
    console.info(
      `Observed price: ${state.observedPrice}; payment token: ${state.observedPaymentToken}.`,
    );
    console.info(
      `Execution remains locked until CAPWITNESS_LIVE_CONFIRM_SPEND exactly equals ${CONFIRM_SPEND_PHRASE}.`,
    );
    return;
  }

  const resultFile = await runExecute(
    config,
    clients,
    process.env.CAPWITNESS_LIVE_CONFIRM_SPEND,
  );
  console.info(`Live validation artifact saved to ${resultFile}.`);
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isEntrypoint) {
  main().catch((error) => {
    console.error(safeFailureMessage(error));
    process.exitCode = 1;
  });
}
