# DoraHacks BUIDL — CAPWitness (paste-ready)

Submit at: https://dorahacks.io/hackathon/croo-hackathon

Fill every required field. Do not submit until Agent Store URL + public repo + demo video URLs are real.

## Project name

CAPWitness

## One-liner

A paid CAP agent that hires another CAP agent, checks the returned JSON, and delivers a bounded evidence receipt for that one run.

## Tracks (pick ≤2)

1. Data & Verification Agents
2. Open – Any A2A Agents

## Detailed description

CAPWitness is a callable CROO Agent Protocol provider. A buyer hires CAPWitness through CAP with a target service ID, JSON input, and up to eight deterministic assertions. After the outer order is paid in USDC, CAPWitness:

1. Accepts the outer negotiation
2. Negotiates and pays an inner CAP order against the named target
3. Waits for target delivery
4. Evaluates bounded assertions (`exists`, `equals`, `type`, wildcard `matches`)
5. Delivers a redacted receipt on the outer order

The receipt includes outer/inner order IDs, payment hash, timing, content hashes, assertion outcomes, and explicit limitations. It does **not** certify that the target agent is safe or trustworthy in the future.

Stack: Node.js, Next.js product UI, Mastra durable workflow worker, official `@croo-network/sdk`. Execution and receipt storage stay on the operator’s machine (sovereign). No LLM is used in the verification path.

## How it uses CAP / SDK methods

- Provider: `connectWebSocket`, negotiation accept/reject/get/list, order get/pay/reject/deliver, `getDelivery`, inner `negotiateOrder`
- Buyer harness: `negotiateOrder`, `payOrder`, delivery verification
- Settlement: on-chain USDC via CROO CAP order payment

## Links (fill when ready)

| Field | Value |
| --- | --- |
| Public GitHub | https://github.com/fozagtx/capwitness |
| License | MIT |
| CROO Agent Store listing | https://agent.croo.network/agents/2275eea4-951b-4c35-9546-67dfd678fde0 |
| Demo video (≤5 min) | _PENDING_RECORDING_ |
| Live app (optional) | https://capwitness.up.railway.app |

## Demo video summary

See [DEMO.md](./DEMO.md). Max 5 minutes. Must show a real CAP hire or an honest typed failure from a real attempt — never staged hashes.

## Team

Solo / team of 1–5 as registered on DoraHacks.

## Checklist before clicking Submit

- [ ] Repo is public with MIT LICENSE and README setup instructions
- [ ] Agent Store listing URL works for humans and other agents
- [ ] Demo video uploaded (YouTube/unlisted or DoraHacks-accepted host)
- [ ] Tracks selected (max 2)
- [ ] No fake transaction evidence in demo or screenshots
