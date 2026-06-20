#!/bin/bash
# Force-opens all deliverable pages with a cache-busting timestamp query param.
# Run this after any deployment to ensure the browser fetches fresh copies.

TS=$(date +%s)
BASE="https://signal-and-friction.com"
SLUGS=("acme-corp" "growthly" "payflux" "startuphub")

echo "Cache Extermination — opening all deliverable pages with ?v=${TS}"
echo ""

for slug in "${SLUGS[@]}"; do
  URL="${BASE}/deliverable/${slug}/?v=${TS}"
  echo "  → ${URL}"
  open "${URL}"
  sleep 0.4
done

echo ""
echo "Done. All 4 deliverable pages opened with fresh cache keys."
echo "Server-side verification:"
echo ""

for slug in "${SLUGS[@]}"; do
  STATUS=$(curl -sIL "${BASE}/deliverable/${slug}/" | grep "^HTTP" | tail -1 | awk '{print $2}')
  echo "  /deliverable/${slug}/ → HTTP ${STATUS}"
done
