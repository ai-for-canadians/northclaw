# NorthClaw Vertex AI Integration

## Data Sovereignty Assessment

### What stays in Canada

- Persistent data: consent database (`data/consent/consent.sqlite`)
- Audit logs (`data/audit/audit.jsonl`)
- Agent memory (`CLAUDE.md` files, group folders)
- Message history (SQLite database)
- Session data and IPC files
- All configuration files

### What doesn't stay in Canada (yet)

- **Inference processing** routes to Vertex AI `us-east5` (Columbus, Ohio)
- Prompt content and agent responses transit through US infrastructure
- This is the closest Vertex AI region to Canada with Claude availability

### Why

Claude is not yet available in Canadian Vertex AI regions (`northamerica-northeast1` / Montreal). Google Cloud offers the Montreal region for many services, but Anthropic's Claude models are not deployed there as of this writing.

### Configuration

```bash
# Enable Vertex AI routing
CLAUDE_CODE_USE_VERTEX=1
CLOUD_ML_REGION=us-east5  # Default: closest to Canada
```

The credential proxy automatically rewrites Anthropic API calls to the Vertex AI endpoint when `CLAUDE_CODE_USE_VERTEX=1` is set. The region is configurable via `CLOUD_ML_REGION`.

### CLOUD Act Caveat

US-hosted inference providers (including Vertex AI us-east5) are subject to the CLOUD Act, which allows US law enforcement to compel disclosure of data stored or processed by US companies, regardless of where the data is physically located. While NorthClaw's persistent data stays in Canada, inference requests transit through US jurisdiction.

### Roadmap: Full Canadian Sovereignty

**Near-term:**
- Vertex AI Montreal (`northamerica-northeast1`) when Claude becomes available there
- One-line configuration change: `CLOUD_ML_REGION=northamerica-northeast1`

**Medium-term:**
- **Telus Sovereign AI Factory** (Kamloops, BC) — `NORTHCLAW_INFERENCE_PROVIDER=telus`
- MaaS endpoints with Llama, Mistral on Canadian H200 GPUs
- Eliminates CLOUD Act exposure entirely
- Architecture is ready: credential proxy supports provider switching

**Long-term:**
- Open-weight models on Canadian sovereign compute
- ThinkOn (Ontario) and Micro Logic (Quebec) data centers
- Full data sovereignty with no US jurisdiction exposure
