#!/usr/bin/env bash
# Interactive gate: wait until Agent Store credentials are present, then preflight.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env.live.local"

echo "CAPWitness live unblock"
echo "1) List CAPWitness on https://agent.croo.network/ (My Agents → Register → Add Service)"
echo "2) Create a buyer agent + fund both AA wallets with USDC on Base"
echo "3) Copy .env.live.example → .env.live.local and fill every blank"
echo "4) Leave this script running; it will preflight when the file is ready"
echo

if [[ ! -f "$ENV_FILE" ]]; then
  cp "${ROOT}/.env.live.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE — fill it now."
fi

required=(
  CROO_API_URL
  CROO_WS_URL
  CROO_SDK_KEY
  CAPWITNESS_AGENT_ID
  CAPWITNESS_SERVICE_ID
  CAPWITNESS_LIVE_BUYER_SDK_KEY
  CAPWITNESS_LIVE_BUYER_AGENT_ID
  CAPWITNESS_LIVE_REQUIREMENTS_FILE
  CAPWITNESS_LIVE_MAX_OUTER_PRICE
  CAPWITNESS_LIVE_EXPECTED_PAYMENT_TOKEN
  CAPWITNESS_LIVE_WAIT_TIMEOUT_MS
  CAPWITNESS_LIVE_PENDING_STATE_FILE
  CAPWITNESS_LIVE_RESULT_DIR
  CAPWITNESS_LIVE_APP_URL
  CAPWITNESS_WORKFLOW_DB_URL
  CAPWITNESS_RECEIPT_DIR
  CAPWITNESS_OPERATOR_TOKEN
)

while true; do
  missing=0
  # shellcheck disable=SC1090
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^[A-Z0-9_]+=' "$ENV_FILE" | sed 's/\r$//')
  set +a
  for key in "${required[@]}"; do
    if [[ -z "${!key:-}" ]]; then
      echo "missing: $key"
      missing=1
    fi
  done
  if [[ "$missing" -eq 0 ]]; then
    echo "All required live env keys present. Running preflight…"
    cd "$ROOT"
    npm run live:preflight:local
    exit $?
  fi
  echo "Waiting 15s for you to finish filling .env.live.local…"
  sleep 15
done
