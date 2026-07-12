import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  DeliverableType,
  EventType,
  type AcceptNegotiationResult,
  type DeliverOrderRequest,
  type DeliverOrderResult,
  type Delivery,
  type Event,
  type EventTypeName,
  type NegotiateOrderRequest,
  type Negotiation,
  type Order,
  type PayOrderResult,
} from "@croo-network/sdk";
import { afterEach, describe, expect, it } from "vitest";
import type { WorkerConfig } from "@/lib/proofrun/config";
import { listReceipts } from "@/lib/proofrun/receipt-store";
import { CAPWitnessWorker } from "../proofrun-worker";

const NOW = "2026-07-11T20:00:00.000Z";
const TX_HASH = `0x${"a".repeat(64)}`;

class TestEventStream {
  private readonly handlers = new Map<string, Array<(event: Event) => void>>();

  on(type: EventTypeName | string, handler: (event: Event) => void) {
    const handlers = this.handlers.get(type) ?? [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
  }

  emit(type: EventTypeName, event: Omit<Event, "type" | "raw">) {
    const complete = { type, raw: {}, ...event };
    for (const handler of this.handlers.get(type) ?? []) handler(complete);
  }

  close() {
    this.handlers.clear();
  }
}

function negotiation(
  negotiationId: string,
  serviceId: string,
  requirements: string,
  status = "pending",
  metadata = "{}",
): Negotiation {
  return {
    negotiationId,
    serviceId,
    requesterAgentId: "requester-agent",
    providerAgentId: "provider-agent",
    requirements,
    status,
    rejectReason: "",
    metadata,
    expiresAt: NOW,
    createdTime: NOW,
    updatedTime: NOW,
  };
}

function order(
  orderId: string,
  negotiationId: string,
  serviceId: string,
  status = "created",
): Order {
  return {
    orderId,
    negotiationId,
    chainOrderId: orderId,
    serviceId,
    requesterAgentId: "requester-agent",
    providerAgentId: "provider-agent",
    buyerUserId: "buyer",
    requesterWalletAddress: "0xrequester",
    providerWalletAddress: "0xprovider",
    price: "0.25",
    paymentToken: "USDC",
    deliveryWindow: 60,
    status,
    rejectReason: "",
    createTxHash: TX_HASH,
    payTxHash: status === "paid" || status === "completed" ? TX_HASH : "",
    deliverTxHash: status === "completed" ? TX_HASH : "",
    rejectTxHash: "",
    clearTxHash: "",
    slaDeadline: NOW,
    payDeadline: NOW,
    createdTime: NOW,
    updatedTime: NOW,
    createdAt: NOW,
    paidAt: status === "paid" || status === "completed" ? NOW : "",
    deliveredAt: status === "completed" ? NOW : "",
    rejectedAt: "",
    expiredAt: "",
  };
}

class StatefulCAPClient {
  readonly calls = {
    acceptNegotiation: 0,
    negotiateOrder: 0,
    payOrder: 0,
    deliverOrder: 0,
  };
  readonly streams: TestEventStream[] = [];
  readonly negotiations = new Map<string, Negotiation>();
  readonly orders = new Map<string, Order>();
  completeDuringPayment = false;
  deferOuterCompletion = false;
  private delivery: Delivery | undefined;

  constructor(readonly outerNegotiationId: string, requirements: string) {
    this.negotiations.set(
      outerNegotiationId,
      negotiation(outerNegotiationId, "capwitness-service", requirements),
    );
  }

  get stream(): TestEventStream {
    const stream = this.streams.at(-1);
    if (!stream) throw new Error("Worker has not connected.");
    return stream;
  }

  async connectWebSocket() {
    const stream = new TestEventStream();
    this.streams.push(stream);
    return stream;
  }

  async getNegotiation(id: string) {
    const value = this.negotiations.get(id);
    if (!value) throw new Error(`Unknown negotiation ${id}`);
    return value;
  }

  async listNegotiations(input: {
    role?: "provider" | "requester";
    page?: number;
    pageSize?: number;
  }) {
    const values = [...this.negotiations.values()].filter((item) =>
      input.role === "provider"
        ? item.serviceId === "capwitness-service"
        : item.serviceId !== "capwitness-service",
    );
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    return values.slice((page - 1) * pageSize, page * pageSize);
  }

  async acceptNegotiation(id: string): Promise<AcceptNegotiationResult> {
    this.calls.acceptNegotiation += 1;
    const current = await this.getNegotiation(id);
    const accepted = { ...current, status: "accepted" };
    const outerOrder = order("outer-order", id, current.serviceId);
    this.negotiations.set(id, accepted);
    this.orders.set(outerOrder.orderId, outerOrder);
    return { negotiation: accepted, order: outerOrder };
  }

  async rejectNegotiation(id: string, reason: string) {
    const current = await this.getNegotiation(id);
    const rejected = { ...current, status: "rejected", rejectReason: reason };
    this.negotiations.set(id, rejected);
    return rejected;
  }

  async negotiateOrder(input: NegotiateOrderRequest): Promise<Negotiation> {
    this.calls.negotiateOrder += 1;
    const inner = negotiation(
      "inner-negotiation",
      input.serviceId,
      input.requirements ?? "",
      "pending",
      input.metadata,
    );
    this.negotiations.set(inner.negotiationId, inner);
    return inner;
  }

  async getOrder(id: string) {
    const value = this.orders.get(id);
    if (!value) throw new Error(`Unknown order ${id}`);
    return value;
  }

  async listOrders(input: {
    role?: "provider" | "requester";
    page?: number;
    pageSize?: number;
  }) {
    const values = [...this.orders.values()].filter((item) =>
      input.role === "provider"
        ? item.serviceId === "capwitness-service"
        : item.serviceId !== "capwitness-service",
    );
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    return values.slice((page - 1) * pageSize, page * pageSize);
  }

  createInnerOrder() {
    const inner = this.negotiations.get("inner-negotiation");
    if (!inner) throw new Error("Inner negotiation does not exist.");
    this.negotiations.set(inner.negotiationId, { ...inner, status: "accepted" });
    const created = order(
      "inner-order",
      inner.negotiationId,
      inner.serviceId,
    );
    this.orders.set(created.orderId, created);
    return created;
  }

  markOuterPaid() {
    const current = this.orders.get("outer-order");
    if (!current) throw new Error("Outer order does not exist.");
    this.orders.set(current.orderId, {
      ...current,
      status: "paid",
      payTxHash: TX_HASH,
      paidAt: NOW,
    });
  }

  completeInner() {
    const current = this.orders.get("inner-order");
    if (!current) throw new Error("Inner order does not exist.");
    this.orders.set(current.orderId, {
      ...current,
      status: "completed",
      payTxHash: TX_HASH,
      deliverTxHash: TX_HASH,
      paidAt: NOW,
      deliveredAt: NOW,
    });
    this.delivery = {
      deliveryId: "inner-delivery",
      orderId: current.orderId,
      providerAgentId: "target-agent",
      deliverableType: DeliverableType.Text,
      deliverableSchema: "",
      deliverableText: JSON.stringify({ status: "ok" }),
      contentHash: "",
      status: "accepted",
      submittedAt: NOW,
      verifiedAt: NOW,
      createdTime: NOW,
      updatedTime: NOW,
    };
  }

  completeOuter() {
    const current = this.orders.get("outer-order");
    if (!current) throw new Error("Outer order does not exist.");
    this.orders.set(current.orderId, {
      ...current,
      status: "completed",
      deliverTxHash: TX_HASH,
      deliveredAt: NOW,
    });
  }

  async payOrder(id: string): Promise<PayOrderResult> {
    this.calls.payOrder += 1;
    const current = await this.getOrder(id);
    const paid = { ...current, status: "paid", payTxHash: TX_HASH, paidAt: NOW };
    this.orders.set(id, paid);
    if (this.completeDuringPayment) {
      this.completeInner();
      this.stream.emit(EventType.OrderCompleted, { order_id: id });
    }
    return { order: paid, txHash: TX_HASH };
  }

  async rejectOrder(id: string, reason: string) {
    const current = await this.getOrder(id);
    const rejected = { ...current, status: "rejected", rejectReason: reason };
    this.orders.set(id, rejected);
    return rejected;
  }

  async getDelivery(id: string) {
    if (!this.delivery || this.delivery.orderId !== id) {
      throw new Error(`Unknown delivery for ${id}`);
    }
    return this.delivery;
  }

  async deliverOrder(
    id: string,
    request: DeliverOrderRequest,
  ): Promise<DeliverOrderResult> {
    this.calls.deliverOrder += 1;
    const current = await this.getOrder(id);
    const completed = {
      ...current,
      status: this.deferOuterCompletion ? "delivering" : "completed",
      deliverTxHash: TX_HASH,
      deliveredAt: this.deferOuterCompletion ? "" : NOW,
    };
    const delivery: Delivery = {
      deliveryId: "outer-delivery",
      orderId: id,
      providerAgentId: "capwitness-agent",
      deliverableType: request.deliverableType,
      deliverableSchema: request.deliverableSchema ?? "",
      deliverableText: request.deliverableText ?? "",
      contentHash: "",
      status: "accepted",
      submittedAt: NOW,
      verifiedAt: NOW,
      createdTime: NOW,
      updatedTime: NOW,
    };
    this.orders.set(id, completed);
    return { order: completed, delivery, txHash: TX_HASH };
  }
}

const directories: string[] = [];

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "capwitness-worker-"));
  directories.push(directory);
  const requirements = JSON.stringify({
    targetServiceId: "target-service",
    input: { prompt: "deterministic" },
    assertions: [{ path: "status", operator: "equals", expected: "ok" }],
    timeoutMs: 10_000,
    publicReceipt: true,
  });
  const client = new StatefulCAPClient("outer-negotiation", requirements);
  const config: WorkerConfig = {
    apiUrl: "https://api.croo.test",
    wsUrl: "wss://api.croo.test/ws",
    sdkKey: "test-only-sdk-key",
    serviceId: "capwitness-service",
    maxInnerPrice: "1",
    workflowDbUrl: `file:${path.join(directory, "workflows.db")}`,
    receiptDir: path.join(directory, "receipts"),
    sdkVersion: "0.2.1",
  };
  return { client, config };
}

async function waitFor(assertion: () => void | Promise<void>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  throw lastError;
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("CAPWitnessWorker Mastra lifecycle", () => {
  it("serializes sequential and concurrent duplicate wake hints", async () => {
    const { client, config } = await fixture();
    client.deferOuterCompletion = true;
    const worker = new CAPWitnessWorker(client as never, config);
    const stop = await worker.start();

    await waitFor(() => expect(client.calls.acceptNegotiation).toBe(1));
    client.markOuterPaid();
    for (let index = 0; index < 8; index += 1) {
      client.stream.emit(EventType.OrderPaid, { order_id: "outer-order" });
    }
    await waitFor(() => expect(client.calls.negotiateOrder).toBe(1));

    client.createInnerOrder();
    for (let index = 0; index < 8; index += 1) {
      client.stream.emit(EventType.OrderCreated, { order_id: "inner-order" });
    }
    await waitFor(() => expect(client.calls.payOrder).toBe(1));

    client.completeInner();
    for (let index = 0; index < 8; index += 1) {
      client.stream.emit(EventType.OrderCompleted, { order_id: "inner-order" });
    }
    await waitFor(() => expect(client.calls.deliverOrder).toBe(1));
    await waitFor(async () =>
      expect(await listReceipts(config.receiptDir)).toHaveLength(1),
    );
    for (let index = 0; index < 8; index += 1) {
      client.stream.emit(EventType.OrderCompleted, { order_id: "outer-order" });
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(client.calls.deliverOrder).toBe(1);

    client.completeOuter();
    client.stream.emit(EventType.OrderCompleted, { order_id: "outer-order" });

    expect(client.calls).toEqual({
      acceptNegotiation: 1,
      negotiateOrder: 1,
      payOrder: 1,
      deliverOrder: 1,
    });
    stop();
  });

  it("reconciles a completion hint emitted before the target wait suspends", async () => {
    const { client, config } = await fixture();
    const worker = new CAPWitnessWorker(client as never, config);
    const stop = await worker.start();

    client.markOuterPaid();
    client.stream.emit(EventType.OrderPaid, { order_id: "outer-order" });
    await waitFor(() => expect(client.calls.negotiateOrder).toBe(1));

    client.completeDuringPayment = true;
    client.createInnerOrder();
    client.stream.emit(EventType.OrderCreated, { order_id: "inner-order" });

    await waitFor(() => expect(client.calls.deliverOrder).toBe(1));
    expect(client.calls.payOrder).toBe(1);
    expect(await listReceipts(config.receiptDir)).toHaveLength(1);
    stop();
  });

  it("rebuilds durable correlation and resumes a suspended run after restart", async () => {
    const { client, config } = await fixture();
    const first = new CAPWitnessWorker(client as never, config);
    const stopFirst = await first.start();

    client.markOuterPaid();
    client.stream.emit(EventType.OrderPaid, { order_id: "outer-order" });
    await waitFor(() => expect(client.calls.negotiateOrder).toBe(1));
    stopFirst();
    await new Promise((resolve) => setTimeout(resolve, 20));

    const second = new CAPWitnessWorker(client as never, config);
    const stopSecond = await second.start();
    client.createInnerOrder();
    client.stream.emit(EventType.OrderCreated, { order_id: "inner-order" });
    await waitFor(() => expect(client.calls.payOrder).toBe(1));

    client.completeInner();
    client.stream.emit(EventType.OrderCompleted, { order_id: "inner-order" });
    await waitFor(() => expect(client.calls.deliverOrder).toBe(1));

    expect(client.calls.acceptNegotiation).toBe(1);
    expect(client.calls.negotiateOrder).toBe(1);
    expect(await listReceipts(config.receiptDir)).toHaveLength(1);
    stopSecond();
  });
});
