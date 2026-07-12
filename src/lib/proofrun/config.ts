import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { z } from "zod";

const require = createRequire(import.meta.url);
const sdkPackageSchema = z.object({ version: z.string().min(1) });

function installedCrooSdkVersion(): string {
  const entry = require.resolve("@croo-network/sdk");
  const packageFile = path.join(path.dirname(entry), "..", "package.json");
  const packageData = JSON.parse(readFileSync(packageFile, "utf8")) as unknown;
  return sdkPackageSchema.parse(packageData).version;
}

const workerEnvironmentSchema = z.object({
  CROO_API_URL: z.url().refine((value) => value.startsWith("https://"), {
    message: "CROO_API_URL must use HTTPS.",
  }),
  CROO_WS_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith("wss://"), {
      message: "CROO_WS_URL must use WSS.",
    }),
  CROO_SDK_KEY: z.string().min(12),
  CAPWITNESS_SERVICE_ID: z.string().min(1).max(160),
  CAPWITNESS_AGENT_ID: z.string().min(1).max(160).optional(),
  BASE_RPC_URL: z.url().optional(),
  CAPWITNESS_MAX_INNER_PRICE: z
    .string()
    .regex(/^\d+(?:\.\d+)?$/),
  CAPWITNESS_WORKFLOW_DB_URL: z
    .string()
    .regex(
      /^file:(?:\/|\.{1,2}\/).+$/,
      "CAPWITNESS_WORKFLOW_DB_URL must be an explicit file: URL.",
    ),
  CAPWITNESS_RECEIPT_DIR: z.string().min(1).optional(),
});
const operatorTokenSchema = z.string().min(12);

export type WorkerConfig = {
  apiUrl: string;
  wsUrl: string;
  sdkKey: string;
  serviceId: string;
  agentId?: string;
  rpcUrl?: string;
  maxInnerPrice: string;
  workflowDbUrl: string;
  receiptDir?: string;
  sdkVersion: string;
};

export function getWorkerConfig(
  environment: Record<string, string | undefined> = process.env,
): WorkerConfig {
  const parsed = workerEnvironmentSchema.parse(environment);

  return {
    apiUrl: parsed.CROO_API_URL,
    wsUrl: parsed.CROO_WS_URL,
    sdkKey: parsed.CROO_SDK_KEY,
    serviceId: parsed.CAPWITNESS_SERVICE_ID,
    agentId: parsed.CAPWITNESS_AGENT_ID,
    rpcUrl: parsed.BASE_RPC_URL,
    maxInnerPrice: parsed.CAPWITNESS_MAX_INNER_PRICE,
    workflowDbUrl: parsed.CAPWITNESS_WORKFLOW_DB_URL,
    receiptDir: parsed.CAPWITNESS_RECEIPT_DIR,
    sdkVersion: installedCrooSdkVersion(),
  };
}

export type ReadinessItem = {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
};

export function getReadiness(
  environment: Record<string, string | undefined> = process.env,
): ReadinessItem[] {
  const apiReady = workerEnvironmentSchema.shape.CROO_API_URL.safeParse(
    environment.CROO_API_URL,
  ).success;
  const websocketReady = workerEnvironmentSchema.shape.CROO_WS_URL.safeParse(
    environment.CROO_WS_URL,
  ).success;
  const sdkKeyReady = workerEnvironmentSchema.shape.CROO_SDK_KEY.safeParse(
    environment.CROO_SDK_KEY,
  ).success;
  const serviceReady = workerEnvironmentSchema.shape.CAPWITNESS_SERVICE_ID.safeParse(
    environment.CAPWITNESS_SERVICE_ID,
  ).success;
  const spendLimitReady =
    workerEnvironmentSchema.shape.CAPWITNESS_MAX_INNER_PRICE.safeParse(
      environment.CAPWITNESS_MAX_INNER_PRICE,
    ).success;
  const workflowStorageReady =
    workerEnvironmentSchema.shape.CAPWITNESS_WORKFLOW_DB_URL.safeParse(
      environment.CAPWITNESS_WORKFLOW_DB_URL,
    ).success;
  const operatorReady = operatorTokenSchema.safeParse(
    environment.CAPWITNESS_OPERATOR_TOKEN,
  ).success;

  return [
    {
      key: "api",
      label: "CROO API",
      ready: apiReady,
      detail: apiReady
        ? "Valid HTTPS endpoint configured"
        : environment.CROO_API_URL
          ? "CROO_API_URL is invalid"
          : "Set CROO_API_URL",
    },
    {
      key: "websocket",
      label: "CROO WebSocket",
      ready: websocketReady,
      detail: websocketReady
        ? "Valid WSS endpoint configured"
        : environment.CROO_WS_URL
          ? "CROO_WS_URL is invalid"
          : "Set CROO_WS_URL",
    },
    {
      key: "sdk",
      label: "Provider SDK key",
      ready: sdkKeyReady,
      detail: sdkKeyReady
        ? "Secret present"
        : environment.CROO_SDK_KEY
          ? "CROO_SDK_KEY is invalid"
          : "Set CROO_SDK_KEY",
    },
    {
      key: "service",
      label: "CAPWitness service",
      ready: serviceReady,
      detail: serviceReady
        ? "Service ID configured"
        : environment.CAPWITNESS_SERVICE_ID
          ? "CAPWITNESS_SERVICE_ID is invalid"
          : "Set CAPWITNESS_SERVICE_ID",
    },
    {
      key: "spend-limit",
      label: "Inner spend limit",
      ready: spendLimitReady,
      detail: spendLimitReady
        ? "Explicit limit configured"
        : environment.CAPWITNESS_MAX_INNER_PRICE
          ? "CAPWITNESS_MAX_INNER_PRICE is invalid"
          : "Set CAPWITNESS_MAX_INNER_PRICE",
    },
    {
      key: "workflow-storage",
      label: "Mastra workflow storage",
      ready: workflowStorageReady,
      detail: workflowStorageReady
        ? "Explicit file-backed LibSQL URL configured"
        : environment.CAPWITNESS_WORKFLOW_DB_URL
          ? "CAPWITNESS_WORKFLOW_DB_URL must be a file: URL"
          : "Set CAPWITNESS_WORKFLOW_DB_URL",
    },
    {
      key: "operator",
      label: "Operator access",
      ready: operatorReady,
      detail: operatorReady
        ? "Access token configured"
        : environment.CAPWITNESS_OPERATOR_TOKEN
          ? "CAPWITNESS_OPERATOR_TOKEN is invalid"
          : "Set CAPWITNESS_OPERATOR_TOKEN",
    },
  ];
}

export function isWorkerReady(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  try {
    getWorkerConfig(environment);
    return true;
  } catch {
    return false;
  }
}

