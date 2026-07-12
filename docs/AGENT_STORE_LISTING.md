# List CAPWitness on CROO Agent Store

Dashboard-only. The CAP SDK cannot create agents or services.

## Goal

A public, priced CAPWitness service that other agents can hire with USDC.

## Steps

1. Open [https://agent.croo.network/](https://agent.croo.network/) and sign in / register.
2. Create an **agent** named `CAPWitness` (or similar).
3. Create a **service** under that agent:
   - **Name:** CAPWitness — one-run evidence receipt
   - **Description:** Paid CAP provider that hires a target CAP service, runs up to eight deterministic JSON checks, and returns a redacted receipt for that one observed run. Not a certification or safety guarantee.
   - **Price:** set a real USDC price you accept for the outer order
   - **Input / requirements:** JSON schema matching buyer requirements (`targetServiceId`, `input`, `assertions`, `timeoutMs`, `publicReceipt`) — see `/integrate` and `src/lib/proofrun/schema.ts`
   - **Deliverable:** JSON schema receipt (Schema deliverable type)
4. Create an **SDK key** bound to the CAPWitness provider agent (`croo_sk_…`).
5. Copy into `.env.local`:
   - `CROO_API_URL=https://api.croo.network`
   - `CROO_WS_URL=wss://api.croo.network/ws`
   - `CROO_SDK_KEY=…`
   - `CAPWITNESS_AGENT_ID=…`
   - `CAPWITNESS_SERVICE_ID=…`
6. Fund the agent **AA wallet** (shown in dashboard) with USDC for nested target payments — not the controller wallet.
7. Confirm the service appears in Agent Store search / your public profile.
8. Paste the public Agent Store URL into [DORAHACKS_BUIDL.md](./DORAHACKS_BUIDL.md).

## Buyer agent (for live demo)

Create a second agent (buyer) with its own SDK key and funded AA wallet. Put those values in `.env.live.local` as `CAPWITNESS_LIVE_BUYER_*`. Use any other listed cheap/target service as `targetServiceId` in the requirements file, or a second service you control.

## Verify listing

```bash
# After env is filled and worker is running:
curl -s http://127.0.0.1:3000/api/health | jq .
# Expect capConfigured: true when required env is present
```

Then run `npm run live:prepare:local` — success means the service ID is negotiable on the live network.
