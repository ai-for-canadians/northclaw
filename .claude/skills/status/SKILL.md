# Status

System health check. Shows what's running, what it's costing, and whether security is working.

## Trigger phrases
- /status
- "system status"
- "what's running"
- "how much have I spent"
- "is everything working"

## What to do

Gather and present:

### 1. Security Profile
Read NORTHCLAW_SECURITY_PROFILE env var. Show:
- Current profile: locked / selective / open
- If selective: how many domains on the egress allowlist

### 2. Active Containers
Run: `docker ps --filter "network=northclaw-internal" --format "{{.Names}} {{.Status}} {{.RunningFor}}"`
Show each container name, how long it's been running, and its status.
If no containers: "No active agents."

### 3. Recent Audit Log
Read last 5 lines of `data/audit/audit.jsonl`. Show:
- Timestamp, action type, result (success/blocked/error)
- If any blocked messages, highlight them

### 4. Consent Gate Stats
Count entries in `data/audit/audit.jsonl` from the current week:
- Messages sent (result: success)
- Messages blocked (result: blocked)
- Consent mode: log-only or strict

### 5. API Spend (if cost tracker is active)
Read from `data/cost/usage.sqlite`:
- Total spend this month (estimated USD)
- Total tokens this month
- Breakdown by group if available

If the database doesn't exist: "Cost tracking starts on first API call."

### 6. Disk Usage
Show sizes of:
- `data/audit/` (audit logs)
- `data/consent/` (consent database)
- `data/groups/` (agent memory and outputs)

## Format

Present as a clean text block, not a table. Example:

```
NorthClaw Status
─────────────────
Security: selective (8 domains allowed)
Containers: 0 active
Consent: 47 sent, 3 blocked this week (mode: log-only)
API spend: ~$12.40 this month (284K tokens)
Disk: 2.1 MB audit, 0.4 MB consent, 18 MB groups
Last activity: 2 hours ago
```

## Do NOT
- Show raw JSON or file paths
- Include Docker technical details
- Suggest changes to security profile unless asked
