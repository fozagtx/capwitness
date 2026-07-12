# CAPWitness Product Requirements

## Product

CAPWitness is a paid CROO Agent Protocol (CAP) provider that performs one bounded, live spot-check against a target CAP service. A buyer hires CAPWitness through CAP with a target service ID, deterministic input, and deterministic assertions. CAPWitness then hires the target service through a second CAP order and returns a redacted evidence receipt containing the observed lifecycle, transaction references, latency, and assertion results.

CAPWitness does not certify safety, correctness, trustworthiness, or future reliability. Every receipt describes one observed run.

## Objective

Ship one credible hackathon demonstration:

1. An outer CAP order hires CAPWitness.
2. CAPWitness autonomously creates and pays an inner CAP order.
3. The target delivers a result.
4. CAPWitness evaluates bounded deterministic assertions.
5. CAPWitness delivers a receipt through the outer CAP order.

## Non-Negotiables

- Real CAP lifecycle evidence is never replaced with production-looking mock data.
- No fake transaction hashes, order IDs, balances, agent identities, or explorer links.
- Fixture data is allowed only in tests and must be labeled as a fixture.
- The live provider rejects work when its AA wallet or required configuration is unavailable.
- Duplicate WebSocket events cannot trigger duplicate payment or delivery.
- Mastra workflow snapshots, stored in configured file-backed LibSQL, are the
  authoritative lifecycle state.
- CAPWitness is deterministic infrastructure: it has no model, agent, tool,
  memory, Studio, AI SDK, LangChain, or LLM dependency.
- Raw SDK keys, private keys, controller addresses, and unredacted buyer payloads never reach the browser.
- Receipts make bounded factual claims about one run only.

## Users And Roles

| Role | Description | Can | Cannot |
| --- | --- | --- | --- |
| Visitor | Unauthenticated website visitor | Read the product explanation, integration model, claim limits, and public redacted receipts | View operator configuration, secrets, raw requirements, or trigger live actions |
| Buyer / CAP caller | Agent or human that hires CAPWitness through CROO | Submit a target service ID, input, and supported deterministic assertions through the CAP order requirements | Supply executable code, arbitrary network targets, secrets, or claim a receipt is certification |
| Operator | Maintainer with the configured operator access token | View readiness, receipt index, failure categories, and redacted run details | View SDK keys/private keys in the UI or fabricate successful runs |
| CAPWitness worker | Server-side autonomous CAP agent | Accept valid paid work, hire the named target, reconcile events, evaluate assertions, and deliver receipts | Exceed configured spend/time limits, execute arbitrary buyer code, or silently downgrade to simulation |

## Route Map And Permissions

| Route | Purpose | Visitor | Buyer | Operator | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| `/` | Public product and protocol overview | Allowed | Allowed | Allowed | Static explanation remains available |
| `/access` | Operator token gate | Allowed | Allowed | Redirects to console when authenticated | Shows an inline, recoverable authentication error |
| `/console` | Operational readiness and receipt index | Full-page access gate only | Full-page access gate only | Allowed | Never renders protected shell before authentication |
| `/receipts/[runId]` | Public redacted receipt | Allowed when receipt is marked public | Allowed | Allowed | Honest not-found or unavailable state |
| `/api/health` | Sanitized service health/readiness | Allowed | Allowed | Allowed | Returns a typed degraded response |
| `/api/access` | Establish operator HTTP-only session | POST allowed | POST allowed | POST allowed | Rejects missing/incorrect token |
| `/api/logout` | Clear operator session | POST allowed | POST allowed | POST allowed | Idempotently clears cookie |
| `/api/operator/status` | Full configuration readiness without secret values | Blocked | Blocked | Allowed | 401 JSON response |
| `/api/operator/receipts` | Redacted receipt index | Blocked | Blocked | Allowed | 401 JSON response |
| `/api/receipts/[runId]` | Public receipt JSON | Allowed only for public receipt | Allowed | Allowed | 404/410 typed response |

Browser route gates are UX only. API routes independently validate the operator HTTP-only cookie.

## App Shell

- Public shell: CAPWitness wordmark, “How it works,” “Claims,” “Source,” and operator-access link.
- Protected shell: compact left rail on desktop and top navigation on mobile.
- Protected navigation: Overview, Receipts, Configuration, Documentation.
- The primary operator action is diagnostic: copy setup commands or re-check readiness. The web UI does not spend funds or initiate live orders.

## Required Flows

### Public understanding

1. Visitor opens `/`.
2. Visitor understands the nested paid-order model in under 30 seconds.
3. Visitor sees exactly what a receipt proves and does not prove.
4. Visitor can inspect a real public receipt when one exists.

### Operator access

1. Operator opens `/access`.
2. Operator enters the configured access token.
3. Server compares a digest-safe value and establishes an HTTP-only, same-site cookie.
4. Operator reaches `/console`.
5. Invalid access preserves the form and provides a specific retry message.

### Worker execution

1. Worker connects to CAP WebSocket.
2. The thin event router may reject invalid or self-targeting requirements before
   creating a run; valid work starts one Mastra workflow whose `resourceId` is
   the outer negotiation ID.
3. Mastra ensures outer acceptance, then durably suspends until a fresh CAP read
   confirms that the outer order is paid.
4. Mastra ensures one inner negotiation with `capWitnessRunId` metadata, then
   durably suspends until a fresh CAP read finds the inner order.
5. Mastra checks the configured spend bound and ensures one payment. Side-effect
   steps have no framework retries: they inspect remote state before acting and
   re-inspect after ambiguous errors.
6. Mastra durably suspends until fresh CAP reads show target completion,
   rejection, expiry, or the persisted absolute deadline has elapsed.
7. Mastra retrieves delivery, evaluates deterministic assertions, and persists
   a redacted receipt atomically.
8. Mastra ensures outer delivery exactly once.
9. WebSocket events and restart-safe timers are wake-up hints only. All start,
   resume, completion, and timeout work enters the same per-run serialization
   boundary.
10. On restart, the worker rebuilds correlation from Mastra runs and paginated
    CAP negotiation/order lists, then reconciles suspended runs.

## Supported Input Contract

```json
{
  "targetServiceId": "service-id",
  "input": {},
  "assertions": [
    { "path": "status", "operator": "equals", "expected": "ok" }
  ],
  "timeoutMs": 90000,
  "publicReceipt": true
}
```

Constraints:

- `targetServiceId` is a CROO service ID, not a URL.
- `input` must be JSON and is size-limited.
- Assertions support `exists`, `equals`, `type`, and `matches` with safe bounded patterns.
- No buyer-supplied JavaScript, shell, template code, or arbitrary fetch target is executed.
- Time and target spend are capped by operator environment settings.

## Receipt Contract

A receipt contains:

- receipt version and run ID
- scope: `one_observed_run`
- target service ID
- SHA-256 input hash, never raw input on public receipts
- outer and inner CAP negotiation/order IDs
- payment transaction hash when returned by the official SDK
- lifecycle timestamps and observed latency
- deliverable type and SHA-256 deliverable hash
- deterministic assertion results
- terminal status and typed failure category
- official SDK version
- explicit limitations

## UI System

- Framework: Next.js App Router + TypeScript.
- Styling: Tailwind CSS v4 with shadcn semantic tokens.
- Components: shadcn-style Button, Input, Label, Badge, Card, Table, Separator, and Alert primitives.
- Icons: Lucide only; decorative icons are hidden from assistive technology.
- Typography: Geist Sans for product UI and Geist Mono for IDs, hashes, statuses, and numbers.
- Brand: Ledger Blue, dark-first, technical, restrained, one blue accent.
- Navigation: public top bar; protected compact rail/top bar.
- Forms: visible labels, inline validation, preserved values, explicit submit.
- Tables/lists: responsive receipt rows with a card fallback on narrow screens.
- Motion: restrained opacity/transform entrance for secondary sections only; primary action is immediately available; reduced motion is fully respected.
- Visual restrictions: no gradients, blobs, glass effects, giant rounded cards, fake charts, decorative crypto imagery, or low-contrast gray text.

## UI States

Every data-driven surface implements:

- idle/initial
- loading with shape-preserving skeletons
- empty with the next real action
- error with a recovery action
- success with a next step

The empty console says no receipts exist yet and links to live setup documentation. It never inserts sample receipts.

## No-Fake-Demo Rules

Allowed only when clearly labeled and confined to tests:

- deterministic fixture provider
- unit-test order IDs
- synthetic SDK event sequences
- local receipt fixtures

Never allowed in user-facing live mode:

- fake success or certification
- fake transaction hashes/explorer links
- fake wallet balances
- fake completed orders
- fixture-created mainnet/testnet actions
- hardcoded production-looking activity
- a simulated inner order described as CAP integration

If CROO credentials are absent, the console must show `Not configured`; the worker must refuse to start.

## Security And Privacy

- SDK keys and operator access tokens are server-only environment variables.
- Operator cookie is HTTP-only, same-site strict, secure in production, and short-lived.
- Token comparison uses constant-time comparison on fixed-length hashes.
- Public receipts are allowlisted field-by-field and exclude raw requirements and deliverables.
- Logs redact keys, bearer headers, raw input, and raw deliverables.
- Receipt filenames are generated internally; user-controlled paths are never used.
- Atomic write/rename prevents partially written receipts.
- Maximum request size, assertion count, timeout, and spend limits are enforced before acceptance.

## Acceptance Criteria

- Public and protected route behavior matches the permission matrix.
- Direct navigation to `/console` shows only the full-page access gate when unauthenticated.
- API routes independently reject unauthorized requests.
- No mock or simulated success is rendered in the application.
- Requirements and receipts validate against strict schemas.
- Duplicate events do not call `payOrder` or `deliverOrder` twice.
- Sequential and concurrent duplicate hints, event-before-suspend races, and
  durable restart/recovery are covered by lifecycle tests using test-only CAP
  fixtures and a real file-backed Mastra store.
- Public receipt serialization excludes raw inputs, raw deliverables, and secrets.
- Missing CROO configuration fails closed with actionable messages.
- Missing or non-file `CAPWITNESS_WORKFLOW_DB_URL` fails closed; runtime never
  silently substitutes an in-memory workflow store.
- Keyboard navigation, focus visibility, labels, touch targets, loading/empty/error states, and reduced motion meet the UI rules.
- Unit tests, TypeScript, ESLint, and the production build pass.

