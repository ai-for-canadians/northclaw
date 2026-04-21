# Dashboard

Open the NorthClaw observability dashboard in the browser.

## Trigger phrases
- /dashboard
- "open dashboard"
- "show dashboard"
- "open the dashboard"

## What to do

1. Check whether the dashboard is already listening:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8088/api/security/profile
   ```
   If the response is `200`, the server is already running — skip to step 3.

2. If not running, start it in the background:
   ```bash
   npm run dashboard &
   ```
   Wait up to 5 seconds for it to start, then verify with curl as above.

3. Print the URL clearly:
   ```
   Dashboard: http://localhost:8088
   ```

4. Open the browser:
   - macOS: `open http://localhost:8088`
   - Linux: `xdg-open http://localhost:8088`

## Tabs available in the dashboard

| Tab | Shows |
|-----|-------|
| Audit Log | Live-streaming hash-chained audit events (SSE) |
| Consent | Consent counts by jurisdiction and type |
| Costs | API spend by group this month + all-time totals |
| Security | Current security profile + effective egress allowlist |

## Do NOT
- Restart the dashboard if it's already running
- Modify any source files
- Expose the server on 0.0.0.0 — it binds to 127.0.0.1 only
