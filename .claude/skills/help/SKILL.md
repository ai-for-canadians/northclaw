# Help

Show available NorthClaw commands when a user asks what the system can do.

## Trigger phrases
- /help
- "what can you do"
- "what commands are available"
- "how do I use this"
- First message in a new group

## Response format

Respond with this list, formatted cleanly:

**NorthClaw Commands**

**Compliance**
🔒 `/pia` — Privacy Impact Assessment. Structured questionnaire, risk scoring, audit-ready output.
📋 `/dsar` — Data Subject Access Request. Triage, jurisdiction detection, deadline tracking, response templates.
📡 `/reg-monitor` — Regulatory change monitor. Recent privacy law changes, gap analysis, action items.
🚨 `/breach` — Breach notification coordinator. Incident assessment, jurisdiction deadlines, draft notifications.
🔍 `/pii-scan` — PII detection and redaction. Scan documents, classify findings, offer redaction.
📄 `/contract-review` — Contract clause review. Data protection terms, redline suggestions, regulatory mapping.
🏢 `/vendor-risk` — Vendor risk assessment. Security posture scoring, framework mapping, board-ready report.
🤖 `/ai-governance` — AI Act compliance. System classification, conformity docs, governance reporting.
🔔 `/whistleblower` — Whistleblower report triage. Anonymity protection, jurisdiction deadlines, investigation plan.
📤 `/consent-export` — Export consent records for regulatory requests.

**Developer Tools**
🛡️ `/code-review` — Compliance-aware security review. Vulnerability detection, framework mapping, remediation code.
📦 `/sbom` — Software Bill of Materials. Dependencies, vulnerabilities, license conflicts.
🔑 `/secrets-scan` — Scan files and git history for leaked credentials. Rotation procedures.
🏗️ `/iac-scan` — Infrastructure-as-Code scanner. CIS benchmarks, PCI DSS, HIPAA, SOC 2 checks.

**Business**
📋 `/pipeline` — Morning briefing. Overdue follow-ups, today's meetings, stale contacts.
🎙️ `/debrief` — Process a meeting. Extract decisions, commitments, next steps.
🔍 `/discover [person]` — Pre-meeting research from all available sources.
📝 `/proposal [prospect]` — Draft a proposal with value-based pricing.
📊 `/value-report [client]` — Monthly value report using the 5-layer model.
📅 `/weekly` — Monday review. Revenue, pipeline, decisions, priorities.

**System**
📈 `/status` — System health. Active containers, costs, security profile.
🔒 `/egress add [domain]` — Allow a website through the network filter.
🔧 `/new-skill [name]` — Create a new custom skill.
🎯 `/demo` — Guided 5-minute walkthrough of NorthClaw capabilities.
❓ `/help` — This list.

**Quick tips:**
- Just message naturally. You don't need slash commands for everything.
- "Summarize this document" works. So does "draft an email to Sarah."
- Your data stays on your machine. Every action is logged.
- Type `/egress add google.com` if you need web search.

## For first messages

When a group receives its very first message ever (no prior conversation history in CLAUDE.md), prepend a brief welcome before answering their question:

"Welcome to NorthClaw. Here's what I can do:" then show the command list above, then answer their actual question.

Only do this once per group. If CLAUDE.md has any existing memory entries, skip the welcome.

## Do NOT
- Show this unprompted after the first interaction
- Include technical details about Docker, containers, or security profiles
- Mention internal skill file paths
