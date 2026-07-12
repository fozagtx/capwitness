import {
  type AgentClient,
  EventType,
  type Event,
  type Negotiation,
} from "@croo-network/sdk";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { runRequirementsSchema } from "@/lib/proofrun/schema";
import type { WorkerConfig } from "@/lib/proofrun/config";
import {
  createCAPWitnessWorkflow,
  lifecycleSchema,
  listAllNegotiations,
  listAllOrders,
  type CrooClient,
  type LifecycleState,
} from "./capwitness-workflow";

type WorkerClient = CrooClient & Pick<AgentClient, "connectWebSocket">;

type WorkerLogger = Pick<Console, "error" | "info" | "warn">;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return "Unknown worker error.";
}

function innerRunId(negotiation: Negotiation): string | undefined {
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

export class CAPWitnessWorker {
  private readonly workflow;
  private readonly storage;
  private readonly mastra;
  private readonly runResources = new Map<string, string>();
  private readonly outerNegotiations = new Map<string, string>();
  private readonly outerOrders = new Map<string, string>();
  private readonly innerNegotiations = new Map<string, string>();
  private readonly innerOrders = new Map<string, string>();
  private readonly queues = new Map<string, Promise<void>>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private stopped = false;

  constructor(
    private readonly client: WorkerClient,
    private readonly config: WorkerConfig,
    private readonly logger: WorkerLogger = console,
  ) {
    this.storage = new LibSQLStore({
      id: "capwitness-workflow-store",
      url: config.workflowDbUrl,
    });
    this.workflow = createCAPWitnessWorkflow(client, config);
    this.mastra = new Mastra({
      storage: this.storage,
      workflows: { capwitnessRun: this.workflow },
    });
  }

  async start(): Promise<() => void> {
    await this.storage.init();
    await this.rebuildCorrelations();
    const stream = await this.client.connectWebSocket();

    stream.on(EventType.NegotiationCreated, (event) => {
      void this.guard("negotiation_created", () =>
        this.routeNegotiationCreated(event),
      );
    });
    for (const type of [
      EventType.OrderPaid,
      EventType.OrderCreated,
      EventType.OrderCompleted,
      EventType.OrderRejected,
      EventType.OrderExpired,
      EventType.NegotiationRejected,
      EventType.NegotiationExpired,
    ]) {
      stream.on(type, (event) => {
        void this.guard(type, () => this.routeWakeHint(event));
      });
    }

    await this.reconcileOnStartup();
    this.logger.info("CAPWitness worker connected.");

    return () => {
      this.stopped = true;
      for (const timer of this.timers.values()) clearTimeout(timer);
      this.timers.clear();
      stream.close();
      void this.storage.close();
    };
  }

  private async guard(label: string, action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      this.logger.error(`CAPWitness ${label} handler failed: ${errorMessage(error)}`);
    }
  }

  private index(state: LifecycleState, targetWaitSuspended: boolean) {
    this.outerNegotiations.set(state.outerNegotiationId, state.runId);
    if (state.outerOrderId) this.outerOrders.set(state.outerOrderId, state.runId);
    if (state.innerNegotiationId) {
      this.innerNegotiations.set(state.innerNegotiationId, state.runId);
    }
    if (state.innerOrderId) this.innerOrders.set(state.innerOrderId, state.runId);
    if (targetWaitSuspended) this.armDeadline(state);
    else this.clearDeadline(state.runId);
  }

  private extractLifecycle(
    steps: Record<string, unknown> | undefined,
  ): LifecycleState | undefined {
    if (!steps) return undefined;
    const ordered = [
      "ensure-outer-delivery",
      "persist-receipt",
      "evaluate-delivery-build-receipt",
      "await-target-terminal",
      "await-ensure-inner-order-and-payment",
      "ensure-inner-negotiation",
      "await-authoritative-outer-paid",
      "ensure-outer-accepted",
    ];
    for (const id of ordered) {
      const step = steps[id];
      const candidates = Array.isArray(step) ? step : [step];
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") continue;
        const output = "output" in candidate ? candidate.output : undefined;
        const parsed = lifecycleSchema.safeParse(output);
        if (parsed.success) return parsed.data;
      }
    }
    return undefined;
  }

  private async refreshRun(runId: string) {
    const state = await this.workflow.getWorkflowRunById(runId, {
      fields: ["steps", "suspendedPaths"],
    });
    const lifecycle = this.extractLifecycle(
      state?.steps as Record<string, unknown> | undefined,
    );
    if (lifecycle) {
      const suspendedSteps = new Set(Object.keys(state?.suspendedPaths ?? {}));
      this.index(
        lifecycle,
        suspendedSteps.has("await-ensure-inner-order-and-payment") ||
          suspendedSteps.has("await-target-terminal"),
      );
    }
  }

  private async rebuildCorrelations() {
    this.runResources.clear();
    this.outerNegotiations.clear();
    this.outerOrders.clear();
    this.innerNegotiations.clear();
    this.innerOrders.clear();

    const { runs } = await this.workflow.listWorkflowRuns({ perPage: false });
    for (const run of runs) {
      if (run.resourceId) {
        this.runResources.set(run.runId, run.resourceId);
        this.outerNegotiations.set(run.resourceId, run.runId);
      }
      await this.refreshRun(run.runId);
    }

    const [innerNegotiations, providerOrders, requesterOrders] = await Promise.all([
      listAllNegotiations(this.client, "requester"),
      listAllOrders(this.client, "provider"),
      listAllOrders(this.client, "requester"),
    ]);
    for (const negotiation of innerNegotiations) {
      const runId = innerRunId(negotiation);
      if (runId && this.runResources.has(runId)) {
        this.innerNegotiations.set(negotiation.negotiationId, runId);
      }
    }
    for (const order of providerOrders) {
      const runId = this.outerNegotiations.get(order.negotiationId);
      if (runId) this.outerOrders.set(order.orderId, runId);
    }
    for (const order of requesterOrders) {
      const runId = this.innerNegotiations.get(order.negotiationId);
      if (runId) this.innerOrders.set(order.orderId, runId);
    }
  }

  private armDeadline(state: LifecycleState) {
    if (!state.deadlineAt || this.timers.has(state.runId)) return;
    const remaining = Math.max(0, Date.parse(state.deadlineAt) - Date.now());
    const timer = setTimeout(() => {
      this.timers.delete(state.runId);
      void this.guard("target_timeout", () => this.enqueueWake(state.runId, "timer"));
    }, remaining);
    this.timers.set(state.runId, timer);
  }

  private clearDeadline(runId: string) {
    const timer = this.timers.get(runId);
    if (timer) clearTimeout(timer);
    this.timers.delete(runId);
  }

  private enqueue(key: string, action: () => Promise<void>): Promise<void> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(action);
    this.queues.set(key, current);
    return current.finally(() => {
      if (this.queues.get(key) === current) this.queues.delete(key);
    });
  }

  private runQueueKey(runId: string): string {
    const resourceId = this.runResources.get(runId);
    return resourceId ? `outer:${resourceId}` : `run:${runId}`;
  }

  private async rejectInvalid(
    negotiation: Negotiation,
    message: string,
  ): Promise<void> {
    if (negotiation.status !== "pending") return;
    try {
      await this.client.rejectNegotiation(negotiation.negotiationId, message);
    } catch (error) {
      const observed = await this.client.getNegotiation(negotiation.negotiationId);
      if (observed.status !== "rejected") throw error;
    }
  }

  private async startOuter(outerNegotiationId: string) {
    return this.enqueue(`outer:${outerNegotiationId}`, async () => {
      if (this.outerNegotiations.has(outerNegotiationId) || this.stopped) return;
      const negotiation = await this.client.getNegotiation(outerNegotiationId);
      let decoded: unknown;
      try {
        decoded = JSON.parse(negotiation.requirements);
      } catch {
        await this.rejectInvalid(
          negotiation,
          "Requirements must match the bounded CAPWitness JSON contract.",
        );
        return;
      }
      const parsed = runRequirementsSchema.safeParse(decoded);
      if (!parsed.success) {
        await this.rejectInvalid(
          negotiation,
          "Requirements must match the bounded CAPWitness JSON contract.",
        );
        return;
      }
      if (parsed.data.targetServiceId === this.config.serviceId) {
        await this.rejectInvalid(
          negotiation,
          "CAPWitness cannot target its own service.",
        );
        return;
      }
      const existing = await this.workflow.listWorkflowRuns({
        resourceId: outerNegotiationId,
        perPage: false,
      });
      if (existing.runs.length > 0) {
        this.outerNegotiations.set(
          outerNegotiationId,
          existing.runs[0]!.runId,
        );
        return;
      }
      const run = await this.workflow.createRun({
        resourceId: outerNegotiationId,
      });
      this.runResources.set(run.runId, outerNegotiationId);
      this.outerNegotiations.set(outerNegotiationId, run.runId);
      await run.start({
        inputData: {
          outerNegotiationId,
          requirements: parsed.data,
          startedAt: new Date().toISOString(),
        },
      });
      await this.refreshRun(run.runId);
    });
  }

  private async enqueueWake(
    runId: string,
    reason: "event" | "startup" | "timer",
  ) {
    return this.enqueue(this.runQueueKey(runId), async () => {
      if (this.stopped) return;
      const state = await this.workflow.getWorkflowRunById(runId, {
        fields: ["steps", "suspendedPaths"],
      });
      if (!state || state.status === "success" || state.status === "failed") {
        this.clearDeadline(runId);
        return;
      }
      const run = await this.workflow.createRun({
        runId,
        resourceId: state.resourceId,
      });
      if (state.status === "suspended") {
        await run.resume({
          resumeData: { reason, observedAt: new Date().toISOString() },
        });
      } else if (["running", "pending", "waiting"].includes(state.status)) {
        await run.restart();
      }
      await this.refreshRun(runId);
      const refreshed = await this.workflow.getWorkflowRunById(runId);
      if (refreshed?.status === "success" || refreshed?.status === "failed") {
        this.clearDeadline(runId);
      }
    });
  }

  private async routeNegotiationCreated(event: Event) {
    if (!event.negotiation_id) return;
    if (event.service_id === this.config.serviceId) {
      await this.startOuter(event.negotiation_id);
      return;
    }
    await this.routeWakeHint(event);
  }

  private async routeWakeHint(event: Event) {
    let runId =
      (event.order_id &&
        (this.outerOrders.get(event.order_id) ||
          this.innerOrders.get(event.order_id))) ||
      (event.negotiation_id &&
        (this.outerNegotiations.get(event.negotiation_id) ||
          this.innerNegotiations.get(event.negotiation_id)));
    if (!runId) {
      await this.rebuildCorrelations();
      runId =
        (event.order_id &&
          (this.outerOrders.get(event.order_id) ||
            this.innerOrders.get(event.order_id))) ||
        (event.negotiation_id &&
          (this.outerNegotiations.get(event.negotiation_id) ||
            this.innerNegotiations.get(event.negotiation_id)));
    }
    if (runId) await this.enqueueWake(runId, "event");
  }

  private async reconcileOnStartup() {
    const { runs } = await this.workflow.listWorkflowRuns({ perPage: false });
    for (const run of runs) {
      if (["suspended", "running", "pending", "waiting"].includes(
        typeof run.snapshot === "string"
          ? JSON.parse(run.snapshot).status
          : run.snapshot.status,
      )) {
        await this.enqueueWake(run.runId, "startup");
      }
    }

    const providerNegotiations = await listAllNegotiations(
      this.client,
      "provider",
    );
    for (const negotiation of providerNegotiations) {
      if (
        negotiation.serviceId === this.config.serviceId &&
        ["pending", "accepted"].includes(negotiation.status) &&
        !this.outerNegotiations.has(negotiation.negotiationId)
      ) {
        await this.startOuter(negotiation.negotiationId);
      }
    }
  }
}

