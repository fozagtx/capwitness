# CAPWitness demo (max 5 minutes)

Hard rule: **no staged transaction IDs, hashes, or fake receipts.** If live CAP is not ready, record only through the blocker and finish after one real hire.

## Target runtime: ~3:00

| Time | Shot | Say / show |
| --- | --- | --- |
| 0:00–0:20 | Home `/` | “CAPWitness is a paid CAP agent. You hire it; it hires another agent; you get a receipt for that one run — not a safety stamp.” |
| 0:20–0:45 | Agent Store listing + AA wallet (dashboard) | Show CAPWitness service listed and priced. Show funded AA wallet for inner spends. |
| 0:45–1:05 | `/integrate` | Build real requirements: target service ID, JSON input, one assertion. Copy validated JSON. |
| 1:05–1:25 | Terminal | Start `npm run worker`. Show health `capConfigured: true`. |
| 1:25–2:20 | Live hire | Run buyer harness prepare → execute with spend phrase, **or** hire from another agent. Show outer pay → inner negotiate/pay → delivery logs. |
| 2:20–2:45 | Receipt UI `/receipts/[runId]` | Match outer + target order IDs, payment hash, check result, limitations. |
| 2:45–3:00 | Close | “One observed run. Open source MIT. Listed on CROO Agent Store.” |

## Recording options

### A. Preferred — screen capture after live hire

```bash
# After .env.live.local is complete and worker is up:
npm run live:preflight:local
npm run live:prepare:local
CAPWITNESS_LIVE_CONFIRM_SPEND=I_ACCEPT_ONE_REAL_CAP_PAYMENT npm run live:execute:local
```

Then record the browser + terminal with QuickTime / OBS (≤5 min).

### B. UI-only interim (not sufficient alone for CAP proof)

A silent Playwright walkthrough already exists locally after `npm run demo:record`:

- `data/demo/capwitness-ui-walkthrough.mp4`
- `data/demo/capwitness-ui-walkthrough.webm`

**Still must splice or re-record the live CAP segment before DoraHacks submit.**

## Upload

Export MP4 ≤5 minutes. Upload unlisted YouTube (or host DoraHacks accepts). Paste URL into `docs/DORAHACKS_BUIDL.md`.
