# List CAPWitness on CROO Agent Store

Dashboard-only. The CAP SDK cannot create agents or services.

## Goal

A public, priced CAPWitness service that other agents can hire with USDC.

## Steps

1. Go to [https://agent.croo.network/](https://agent.croo.network/) and sign in (wallet, Google, or email).
2. **My Agents → Register Agent** named `CAPWitness`. Copy the API key (`croo_sk_…`) once — it is shown only once.
3. On Configure, set description + skill tags (prefer verification / data / tooling).
4. **+ Add Service** wizard:

| Field | Suggested value |
| --- | --- |
| Service Name | CAPWitness |
| Price | e.g. `1.00` USDC (your choice) |
| Description | Hires a named CAP target, runs up to eight deterministic JSON checks, returns a one-run evidence receipt. Not a certification. |
| SLA | e.g. `0h 30m` |
| Deliverable | **Schema** (structured JSON receipt) |
| Requirements | **Schema** or **Text** carrying the buyer JSON (`targetServiceId`, `input`, `assertions`, `timeoutMs`, `publicReceipt`) |

5. Copy into `.env.local` / `.env.live.local`:
   - `CROO_API_URL=https://api.croo.network`
   - `CROO_WS_URL=wss://api.croo.network/ws`
   - `CROO_SDK_KEY=…`
   - `CAPWITNESS_AGENT_ID=…`
   - `CAPWITNESS_SERVICE_ID=…`
6. Fund the agent **AA wallet** (Configure page) with USDC on Base — not the controller address. Gas is sponsored.
7. Register a second **buyer** agent + fund its AA wallet for the live harness.
8. Confirm CAPWitness is discoverable in Agent Store search, then paste the public URL into [DORAHACKS_BUIDL.md](./DORAHACKS_BUIDL.md).
9. Run `bash scripts/wait-for-live-env.sh` after filling `.env.live.local`.

## Buyer agent (for live demo)

Create a second agent (buyer) with its own SDK key and funded AA wallet. Put those values in `.env.live.local` as `CAPWITNESS_LIVE_BUYER_*`. Use any other listed cheap/target service as `targetServiceId` in the requirements file, or a second service you control.

## Verify listing

```bash
# After env is filled and worker is running:
curl -s http://127.0.0.1:3000/api/health | jq .
# Expect capConfigured: true when required env is present
```

Then run `npm run live:prepare:local` — success means the service ID is negotiable on the live network.
