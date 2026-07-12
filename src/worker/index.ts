import { AgentClient } from "@croo-network/sdk";
import { getWorkerConfig } from "@/lib/proofrun/config";
import { CAPWitnessWorker } from "./proofrun-worker";

function safeLogger() {
  return {
    info(message: string) {
      console.info(message);
    },
    warn(message: string) {
      console.warn(message);
    },
    error(message: string) {
      console.error(message);
    },
    debug() {
      // Debug output is intentionally suppressed to avoid logging payloads.
    },
  };
}

async function main() {
  const config = getWorkerConfig();
  const logger = safeLogger();
  const client = new AgentClient(
    {
      baseURL: config.apiUrl,
      wsURL: config.wsUrl,
      rpcURL: config.rpcUrl,
      logger,
    },
    config.sdkKey,
  );
  const worker = new CAPWitnessWorker(client, config, logger);
  const stop = await worker.start();

  const shutdown = () => {
    stop();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`CAPWitness worker failed to start: ${message}`);
  process.exit(1);
});

