# NorthClaw Threat Model

## Attack Surface

### Container Escape

**Threat:** A compromised agent escapes the Docker container to access the host system.

**Mitigations:**
- Seccomp profile blocks `mount`, `ptrace`, `pivot_root`, and other escape-enabling syscalls
- Read-only root filesystem prevents modifying container binaries
- Non-root execution (node user, UID 1000)
- Ephemeral containers (`--rm`) — no persistent state across runs

### Credential Leakage

**Threat:** Agent extracts real API keys or OAuth tokens from the container environment.

**Mitigations:**
- Real credentials never enter containers — only placeholders
- `.env` file shadowed to `/dev/null` in project root mount
- Credential proxy injects auth headers transparently
- Blocked mount patterns prevent access to `.ssh`, `.aws`, `.gnupg`, etc.

### Network Data Exfiltration

**Threat:** Agent sends sensitive data to external servers.

**Mitigations:**
- `northclaw-internal` Docker network blocks all outbound internet access
- Only the credential proxy (host) is reachable from containers
- Egress allowlist restricts which upstream hosts the proxy forwards to
- Audit logging records all outbound message attempts

### IPC Privilege Escalation

**Threat:** Non-main group manipulates IPC files to send messages as another group or create unauthorized tasks.

**Mitigations:**
- Per-group IPC namespace isolation
- IPC authorization checks: non-main groups can only send to their own JID
- Task creation restricted to main group
- File-based IPC with group folder identity verification

### Outbound Spam / Compliance Violation

**Threat:** Agent sends unauthorized commercial messages violating CASL ($10M penalty).

**Mitigations:**
- Centralized consent gate on all 5 outbound message paths
- Consent database with express/implied tracking and expiry
- Hash-chained audit log for compliance evidence
- `strict` mode blocks messages without valid consent

### CLOUD Act Exposure

**Threat:** US-hosted inference providers subject to CLOUD Act compelled disclosure.

**Current status:** Inference routes to Anthropic API (US) or Vertex AI us-east5 (US).

**Mitigations in place:**
- All persistent data (consent DB, audit logs, CLAUDE.md memory) stays in Canada
- Credential proxy architecture supports provider switching
- Egress allowlist controls which endpoints receive data

**Roadmap:**
- Canadian sovereign AI compute with open-weight models (Llama, Mistral) on Canadian GPUs
- Full data sovereignty with no US jurisdiction exposure
- See `docs/VERTEX-AI.md` for details
