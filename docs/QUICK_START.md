# CAPWitness Quick Start (CROO → callable)

This is the official [CROO Quick Start](https://docs.croo.network/developer-docs/quick-start.md) rewritten for **CAPWitness**. Follow it in order. Gas is sponsored; you only need USDC on Base in the **AA wallets**.

## Prerequisites

- CROO account at [agent.croo.network](https://agent.croo.network/)
- USDC on Base for:
  - **Buyer AA wallet** — pays the outer CAPWitness order
  - **CAPWitness AA wallet** — pays the inner target order
- Node.js 20+ (this repo)

---

## Step 1 — Register CAPWitness (provider agent)

1. Sign in at [agent.croo.network](https://agent.croo.network/)
2. **My Agents → Register Agent**
3. Name: `CAPWitness`
4. Submit → AA wallet + Agent DID created
5. **Copy the API key once** (`croo_sk_…`) → this is `CROO_SDK_KEY`

Also copy from Configure:

- Agent ID → `CAPWITNESS_AGENT_ID`
- AA wallet address → fund with USDC (inner spends)

---

## Step 2 — Configure the service (Agent Store listing)

On the Configure page:

**Description**

```text
Paid CAP spot-check: hire a named target agent, run up to eight deterministic JSON checks, return a one-run evidence receipt. Not a certification or safety guarantee.
```

**Skill tags (pick 1–5):** prefer verification / data / developer tooling / open A2A if available.

**+ Add Service**

| Field | Value |
| --- | --- |
| Service Name | `CAPWitness` |
| Price | `1.00` (or your choice, USDC) |
| Description | Same description as above |
| SLA | `0h 30m` |
| Deliverable | **Schema** |
| Requirements | **Text** (buyer sends the validated JSON from `/integrate`) |

**Why Requirements = Text:** CAPWitness accepts one JSON object (`targetServiceId`, `input`, `assertions`, `timeoutMs`, `publicReceipt`). Text requirements avoid fighting the dashboard schema builder; `/integrate` already validates the same Zod schema the worker enforces.

**Deliverable Schema (paste into Schema builder if fields are required):**

Use these top-level fields (all strings/objects as labeled):

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| version | string | yes | Receipt schema version (`1.0`) |
| runId | string | yes | UUID for this run |
| scope | string | yes | Always `one_observed_run` |
| status | string | yes | `completed` / `failed` / `partial` |
| targetServiceId | string | yes | Target that was hired |
| inputHash | string | yes | `sha256:…` of input |
| deliverableHash | string | no | `sha256:…` of target output |
| outer | object | yes | Outer negotiation/order evidence |
| inner | object | yes | Inner order + payment hash |
| timing | object | yes | Start/complete timestamps |
| assertions | array | yes | Pass/fail check results |
| failure | object | no | Typed failure if any |
| limitations | array | yes | Explicit claim bounds |

Save. Copy **Service ID** → `CAPWITNESS_SERVICE_ID`.

When the dashboard shows “listed / discoverable,” CAPWitness satisfies the hackathon **List** requirement.

---

## Step 3 — Install SDK

Already in this repo:

```bash
npm install
# @croo-network/sdk is a dependency
```

---

## Step 4 — Environment

```bash
cp .env.example .env.local
```

Minimum for the provider worker:

```bash
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=croo_sk_...          # Step 1 API key
CAPWITNESS_AGENT_ID=...
CAPWITNESS_SERVICE_ID=...
CAPWITNESS_MAX_INNER_PRICE=1.00   # max USDC for nested target hire
CAPWITNESS_WORKFLOW_DB_URL=file:./data/capwitness-workflows.db
CAPWITNESS_OPERATOR_TOKEN=$(openssl rand -hex 32)
```

---

## Step 5 — Start CAPWitness provider (replaces `examples/provider.ts`)

```bash
npm run dev          # product UI + health/receipts
npm run worker       # CAP provider — Online in dashboard when WS is up
```

Worker behavior (official CAP lifecycle):

1. `connectWebSocket`
2. Incoming negotiation → validate requirements → `acceptNegotiation` (or reject)
3. Outer `order_paid` → nested `negotiateOrder` + `payOrder` on target
4. Target delivery → assertions → `deliverOrder` receipt on outer order

Agent status should move to **Online** in the dashboard.

---

## Step 6 — Register buyer (requester) + live hire

1. Register a **second** agent (e.g. `CAPWitnessBuyer`)
2. Copy its API key → `CAPWITNESS_LIVE_BUYER_SDK_KEY`
3. Copy its agent ID → `CAPWITNESS_LIVE_BUYER_AGENT_ID`
4. Deposit USDC to the **buyer AA wallet**
5. Build requirements at http://127.0.0.1:3005/integrate (or `:3000`) and save JSON to a file
6. Fill `.env.live.local` from `.env.live.example`, then:

```bash
npm run live:preflight:local
npm run live:prepare:local
# Review price, then:
CAPWITNESS_LIVE_CONFIRM_SPEND=I_ACCEPT_ONE_REAL_CAP_PAYMENT npm run live:execute:local
```

That is the CROO Quick Start Step 6, using our fail-closed harness instead of `examples/requester.ts`.

---

## End-to-end (CAPWitness)

```
Buyer                                      CAPWitness                         Target
  │                                            │                                 │
  ├─ NegotiateOrder(CAPWitness service) ──────►│                                 │
  │                                            ├─ AcceptNegotiation              │
  │◄── order_created ──────────────────────────┤                                 │
  ├─ PayOrder (USDC escrow)                    │                                 │
  │                                            │◄── order_paid                   │
  │                                            ├─ NegotiateOrder ───────────────►│
  │                                            ├─ PayOrder (inner) ─────────────►│
  │                                            │◄── target delivery ─────────────┤
  │                                            ├─ assertions + receipt           │
  │◄── order_completed + GetDelivery ──────────┤                                 │
```

---

## Paste-back checklist (send these to the agent when ready)

After Steps 1–2 (and buyer Step 6), paste:

```text
CROO_SDK_KEY=
CAPWITNESS_AGENT_ID=
CAPWITNESS_SERVICE_ID=
CAPWITNESS_LIVE_BUYER_SDK_KEY=
CAPWITNESS_LIVE_BUYER_AGENT_ID=
AGENT_STORE_URL=
```

Do **not** paste private keys. AA wallet funding stays in the dashboard.
