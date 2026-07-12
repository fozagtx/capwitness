# CAPWitness

CAPWitness is a paid CROO Agent Protocol (CAP) provider that performs one bounded live spot-check against another CAP service. A buyer hires CAPWitness, CAPWitness hires the target through a second paid CAP order, and CAPWitness returns a redacted transaction evidence receipt.

CAPWitness does **not** certify that an agent is safe, correct, trustworthy, or reliable in the future. A receipt describes one observed run.

## Hackathon submission

Built for the [CROO Agent Hackathon](https://dorahacks.io/hackathon/croo-hackathon).

| Requirement | Where |
| --- | --- |
| **CROO Quick Start (CAPWitness)** | [docs/QUICK_START.md](docs/QUICK_START.md) |
| Build + CAP integrate | This repo (`src/worker`, `@croo-network/sdk`) |
| Agent Store list | [docs/AGENT_STORE_LISTING.md](docs/AGENT_STORE_LISTING.md) |
| Open source | MIT [`LICENSE`](LICENSE) · https://github.com/fozagtx/capwitness |
| Demo (≤5 min) | [docs/DEMO.md](docs/DEMO.md) |
| DoraHacks BUIDL copy | [docs/DORAHACKS_BUIDL.md](docs/DORAHACKS_BUIDL.md) |
| Full gate status | [docs/HACKATHON_SUBMISSION.md](docs/HACKATHON_SUBMISSION.md) |

**Tracks:** Data & Verification Agents · Open – Any A2A Agents

## What is implemented

- persistent CAP provider using `@croo-network/sdk`
- nested outer/inner order orchestration
- strict JSON requirement and receipt schemas
- bounded `exists`, `equals`, `type`, and wildcard assertions
- spend and timeout limits
- deterministic Mastra workflow lifecycle with typed Zod step boundaries
- durable suspend/resume snapshots in an explicit file-backed LibSQL store
- serialized, ensure-style side effects for duplicate CAP events
- atomic redacted receipt storage
- public product page and receipt view
- token-protected operator readiness console
- no models, agents, tools, memory, Studio, or LLM calls
- no simulated production activity or fake transaction data

## Architecture

```text
CAP buyer
   │  outer negotiate → pay
   ▼
Thin CAP WebSocket router
   │  wake hint
   ▼
Mastra workflow ───────────────┐
   │  inner negotiate → pay    │ durable LibSQL snapshots
   ▼                           │
Target CAP service             │
   │  deliver JSON             │
   ▼                           │
Bounded assertion engine       │
   │                           │
   └─ receipt → outer deliver ─┘
             │
             ▼
       Next.js receipt UI
```

The web application cannot initiate a payment. Spending remains inside the configured worker process.

Mastra owns valid lifecycle sequencing: accept the outer negotiation, suspend
until authoritative outer payment, ensure the correlated inner negotiation and
bounded payment, suspend until the target is terminal, evaluate and persist the
receipt, then ensure outer delivery. WebSocket events only wake a run; resumed
steps always re-read CAP state. The workflow is deterministic infrastructure,
not an AI workflow, and makes no model calls.

## CAP SDK integration

The worker uses `connectWebSocket`, negotiation get/list/accept/reject/create
methods, order get/pay/reject/deliver methods, and `getDelivery`. The event
router handles negotiation creation/rejection/expiry and order
creation/payment/completion/rejection/expiry as wake-up hints. Correlation
lookups paginate CAP list APIs, and startup reconstructs correlation from
Mastra runs plus the `capWitnessRunId` stored in inner negotiation metadata.

## Local setup

Requirements:

- Node.js 20+
- a listed CAPWitness service in the CROO Agent Store
- an SDK key bound to the CAPWitness provider agent
- a funded CAPWitness AA wallet for inner target orders
- official CROO API and WebSocket endpoints

Install and configure:

```bash
npm install
cp .env.example .env.local
```

Fill every required value in `.env.local` from the live CROO deployment. The
blank template intentionally fails closed. Generate a strong operator token:

```bash
openssl rand -hex 32
```

Run the web application and worker in separate terminals:

```bash
npm run dev
npm run dev:worker
```

Open `http://localhost:3000`. The worker refuses to start when required CAP
configuration is missing or malformed. `CAPWITNESS_WORKFLOW_DB_URL` is required
and must be an explicit `file:` URL for this single-worker deployment; no
in-memory workflow store is used.

## Live buyer validation harness

The live harness is deliberately fail-closed and has three hard gates:

1. `npm run live:preflight` validates every explicit live setting, the real
   requirements file, provider and buyer SDK-key reachability, and the deployed
   app health endpoint. It performs zero CROO mutations. The installed SDK has
   no service read method, so service existence is confirmed only by `prepare`.
2. `npm run live:prepare` repeats preflight and creates (or safely reuses) one
   correlated outer negotiation. **This creates an unpaid real CAP order.** It
   validates the authoritative order price and payment token and writes a
   mode-`0600` pending state containing no raw requirements or target output.
3. `npm run live:execute` repeats the gates, requires
   `CAPWITNESS_LIVE_CONFIRM_SPEND=I_ACCEPT_ONE_REAL_CAP_PAYMENT`, and may call
   `payOrder` once. **This spends real funds.** It then verifies the delivered
   receipt against authoritative CAP state and the authenticated app receipt.

Start from the blank template and supply exact production values; there are no
runtime samples or fallback values:

```bash
cp .env.live.example .env.live.local
npm run live:preflight:local
npm run live:prepare:local
CAPWITNESS_LIVE_CONFIRM_SPEND=I_ACCEPT_ONE_REAL_CAP_PAYMENT npm run live:execute:local
```

The non-`:local` scripts use shell-exported variables. The `:local` scripts use
Node's built-in `--env-file` support and add no dotenv dependency. Keep the
worker stopped while using the harness unless the live validation procedure
explicitly calls for it. The commands above document the workflow only; this
repository does not claim that live validation has been run.

## Buyer requirements

Open `/integrate` to construct and validate requirements from real target data.
The builder imports the same schema enforced by the worker and does not prefill
an ID, payload, timeout, assertion, or receipt.

Rules:

- `targetServiceId` must be a CROO service ID, not a URL.
- `input` must be JSON.
- At most eight assertions are accepted.
- `matches` uses a bounded `*` wildcard pattern, not arbitrary regular expressions.
- Buyer-supplied JavaScript, shell commands, templates, and fetch targets are never executed.

## Receipt evidence

Receipts contain the outer and inner CAP IDs, inner payment hash returned by the official SDK, timing, SHA-256 content hashes, assertion outcomes, typed failures, SDK version, and explicit limitations.

Public receipts exclude raw input, raw target output, SDK keys, private keys, and operator credentials.

## Failure behavior

| Failure | Behavior |
| --- | --- |
| Invalid requirements | Reject outer negotiation before payment |
| CAPWitness targets itself | Reject outer negotiation |
| Target price exceeds cap | Reject inner order and deliver failure receipt |
| Insufficient AA wallet balance | Deliver typed failure receipt |
| Target rejects or expires | Deliver typed terminal-state receipt |
| Target times out | Deliver typed timeout receipt |
| Target output is invalid or oversized JSON | Deliver typed delivery failure receipt |
| Missing CAP configuration | Worker fails closed at startup |
| Missing operator token | Console reports unavailable access |

## Three-minute demo

1. **0:00–0:25** — Show the public page and state the bounded claim: one observed paid run, not certification.
2. **0:25–0:55** — Show the listed CAPWitness and target services plus the funded CAPWitness AA wallet.
3. **0:55–1:20** — Submit an outer order with one target service ID and one deterministic assertion.
4. **1:20–2:05** — Follow logs as CAPWitness accepts the outer order, creates and pays the inner order, and receives target delivery.
5. **2:05–2:35** — Open the receipt and match both CAP order IDs, payment hash, timing, content hashes, and assertion result.
6. **2:35–3:00** — Show the receipt limitations and duplicate-event idempotency test.

Do not prerecord or stage transaction IDs. If the live target fails, show the resulting typed failure receipt.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Deterministic test inputs exist only under test files and never enter a runtime
bundle, receipt store, API response, or user-facing route.

## Documentation

- [Product requirements](docs/PRD.md)
- [Brand system](brand.md)
- [CROO documentation](https://docs.croo.network)
- [CROO Node SDK](https://github.com/CROO-Network/node-sdk)

## License

MIT
