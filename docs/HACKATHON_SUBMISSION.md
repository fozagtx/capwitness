# CROO Agent Hackathon — CAPWitness submission gate

Deadline: **2026-07-12 09:00** (DoraHacks). Every BUIDL must satisfy all five requirements.

## Status matrix

| # | Requirement | Status | Evidence / blocker |
| --- | --- | --- | --- |
| 1 | **Build** — agent in any framework, sovereign data/execution | **Met** | Next.js app + Mastra durable worker under your process; no CROO-hosted execution of assertion logic |
| 2 | **Integrate CAP** — callable, accepts USDC, settles on-chain | **Code met · Live pending credentials** | Official `@croo-network/sdk` provider + nested buyer. Live hire blocked until Agent Store listing + SDK keys + funded AA wallet |
| 3 | **List** on CROO Agent Store | **Pending dashboard action** | See [AGENT_STORE_LISTING.md](./AGENT_STORE_LISTING.md) |
| 4 | **Open-source + demo** — public MIT/Apache repo + ≤5 min video | **Repo public · Demo recording pending live CAP** | https://github.com/fozagtx/capwitness · MIT · Demo: [DEMO.md](./DEMO.md) |
| 5 | **Submit** BUIDL on DoraHacks | **Pending file** | Copy fields from [DORAHACKS_BUIDL.md](./DORAHACKS_BUIDL.md) |

## Tracks (max 2)

Primary: **Data & Verification Agents** — paid output checks with a bounded evidence receipt.

Secondary: **Open – Any A2A Agents** — nested CAP hire proves A2A composability (buyer → CAPWitness → target).

Optional alternate secondary: **Developer Tooling Agents** — `/integrate` builder + live harness for other CAP builders.

## CAP SDK methods used

Provider path (worker):

- `connectWebSocket`
- `listNegotiations` / `getNegotiation` / `acceptNegotiation` / `rejectNegotiation`
- `listOrders` / `getOrder` / `payOrder` / `rejectOrder` / `deliverOrder` / `getDelivery`
- `negotiateOrder` (inner hire of the target service)

Buyer harness (`scripts/live-cap-validation.ts`):

- `negotiateOrder` / `payOrder` / `getOrder` / `getDelivery` / `getNegotiation`

Payment token: whatever the listed CAPWitness service prices in the Agent Store (USDC on Base per CROO settlement).

## Callable definition (pass / fail)

CAPWitness is **callable on the platform** only when all of these are true:

1. CAPWitness agent + service are listed and discoverable on [Agent Store](https://agent.croo.network/).
2. Worker is online with a real `CROO_SDK_KEY` bound to that agent.
3. Another agent (or the live buyer harness) can `negotiateOrder` against `CAPWITNESS_SERVICE_ID`.
4. After USDC payment, the worker accepts, runs the nested hire, and `deliverOrder` returns a receipt.

Until (1)–(4) succeed once, do **not** claim live callable status in the DoraHacks form.

## Recursive unblock order

1. List agent + service on Agent Store → copy service ID, agent ID, SDK key, AA wallet.
2. Fund AA wallet with USDC for inner orders.
3. Fill `.env.local` + `.env.live.local` from templates (no blanks).
4. `npm run dev` + `npm run worker` → `/api/health` shows CAP configured.
5. `npm run live:preflight:local` → `prepare` → explicit spend phrase → `execute`.
6. Record demo using the real receipt (no staged IDs).
7. Push public GitHub (this repo) and file DoraHacks BUIDL with store link + video + repo.
