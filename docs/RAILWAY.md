# Deploy CAPWitness on Railway (web + always-on worker)

You need **two services** from the same GitHub repo so the agent stays Online:

1. **web** — Next.js UI / health / receipts  
2. **worker** — CAP WebSocket provider (`npm run worker:prod`)

## One-time setup

```bash
cd proofrun
railway login   # if needed
railway init    # create project "capwitness"
```

### Service A — web

- Root directory: repo root
- Build: Dockerfile
- Start: `npm run start`
- Public networking: generate domain
- Volume (optional but recommended): mount `/data`

### Service B — worker

- Same repo / Dockerfile
- Start: `npm run worker:prod`
- No public domain required
- Volume: mount `/data` (same project volume if possible)

## Environment variables (both services)

Copy from local `.env.local`, but use Railway paths:

```bash
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=...
CAPWITNESS_AGENT_ID=...
CAPWITNESS_SERVICE_ID=...
CAPWITNESS_MAX_INNER_PRICE=1.00
CAPWITNESS_OPERATOR_TOKEN=...
CAPWITNESS_WORKFLOW_DB_URL=file:/data/capwitness-workflows.db
CAPWITNESS_RECEIPT_DIR=/data/receipts
```

Set variables via dashboard or:

```bash
railway variables --set "CROO_API_URL=https://api.croo.network"
# …repeat for each key (prefer dashboard for secrets)
```

## After deploy

1. Open the web URL → `/api/health` should show CAP configured when env is set.
2. Agent Store status should show **Online** while the worker service is running.
3. Point DoraHacks / demo at the public web URL.
