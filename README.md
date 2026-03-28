# NorthClaw

A CASL-compliant AI agent system built on [NanoClaw](https://github.com/qwibitai/nanoclaw). Containerized agents with consent gating, security profiles, tamper-evident audit trails, and Canadian data sovereignty controls.

---

## What NorthClaw Adds

NorthClaw is a fork of NanoClaw that adds a compliance and security layer for Canadian businesses:

- **CASL consent gate** on all outbound messages — every commercial message checks consent status before sending. Supports express consent, implied (EBR/inquiry/publication), and jurisdiction-aware enforcement (CASL for Canada, CAN-SPAM for US).
- **Security profiles** — `locked` (no internet), `selective` (domain allowlist through proxy), or `open` (full access). Default-deny network egress via internal Docker network.
- **Tamper-evident audit trail** — hash-chained JSONL log of every agent action. Each entry links to the previous via SHA-256. Show it to regulators when they ask what your AI did.
- **Per-group cost tracking** — token usage and estimated cost per client group, stored in SQLite. Know what each client's agents cost.
- **Container hardening** — seccomp profile (default-deny syscalls), read-only root filesystem, credential proxy isolation (containers never see API keys).
- **12 operational skills** — pipeline briefings, meeting debriefs, discovery prep, proposals, value reports, weekly reviews, and more. All via `/command` in any messaging channel.

Everything from NanoClaw still works: multi-channel messaging (WhatsApp, Telegram, Slack, Discord, Gmail), container isolation, scheduled tasks, agent swarms.

## Quick Start

```bash
git clone https://github.com/ai-for-canadians/northclaw.git
cd northclaw
claude
```

Then run `/setup`. Claude Code handles dependencies, authentication, container setup, and service configuration.

> **Note:** Commands prefixed with `/` are [Claude Code skills](https://code.claude.com/docs/en/skills). Type them inside the `claude` CLI prompt, not in your regular terminal.

## Security Profiles

| Profile | Network | Web Access | Use Case |
|---------|---------|------------|----------|
| `locked` | Internal only | None (API endpoint only) | Regulated clients |
| `selective` | Internal + proxy allowlist | Allowlisted domains | Default |
| `open` | Full internet | Everything | Development/testing |

Set `NORTHCLAW_SECURITY_PROFILE` in `.env`. Manage allowed domains with `/egress`.

## Skills

| Command | What it does |
|---------|-------------|
| `/pipeline` | Morning briefing. Overdue follow-ups, today's meetings, stale contacts. |
| `/debrief` | Process a meeting transcript. Extract decisions, commitments, next steps. |
| `/discover [person]` | Pre-meeting research from all available sources. |
| `/proposal [prospect]` | Draft a proposal with value-based pricing. |
| `/value-report [client]` | Monthly value report using the 5-layer model. |
| `/weekly` | Monday review. Revenue, pipeline, decisions, priorities. |
| `/status` | System health. Containers, costs, security profile. |
| `/demo` | Guided 5-minute walkthrough of NorthClaw capabilities. |
| `/egress` | Manage the network egress allowlist. |
| `/consent-export` | Export consent records for regulatory requests. |
| `/new-skill` | Create a new custom skill. |
| `/help` | Show all available commands. |

## Compliance

NorthClaw's consent gate covers CASL (Canada), CAN-SPAM (US), and Quebec's Law 25. Two enforcement modes:

- **`log-only`** (default) — logs what would be blocked, delivers anyway. Use while building your consent database.
- **`strict`** — actually blocks messages without valid consent. For production.

Every outbound message, consent check, and agent action is logged in the audit trail at `data/audit/audit.jsonl`. Export consent records for regulators with `/consent-export`.

## Architecture

```
Channels --> SQLite --> Polling loop --> Container (Claude Agent SDK) --> Consent Gate --> Response
```

Single Node.js process. Channels self-register at startup. Agents execute in isolated Linux containers with filesystem isolation — only mounted directories are accessible. The credential proxy injects API keys so containers never see them. The consent gate checks every outbound message before delivery.

For details: [docs/SECURITY.md](docs/SECURITY.md) | [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | [docs/THREAT-MODEL.md](docs/THREAT-MODEL.md) | [docs/VERTEX-AI.md](docs/VERTEX-AI.md)

## Requirements

- macOS or Linux
- Node.js 20+
- [Claude Code](https://claude.ai/download)
- [Docker](https://docker.com/products/docker-desktop) or [Apple Container](https://github.com/apple/container) (macOS)

## Relationship to NanoClaw

NorthClaw tracks upstream [NanoClaw](https://github.com/qwibitai/nanoclaw) for bug fixes and security patches. The compliance layer, security profiles, cost tracking, and operational skills are NorthClaw-specific additions. See [docs/UPSTREAM-BACKLOG.md](docs/UPSTREAM-BACKLOG.md) for pending upstream changes.

## License

MIT
