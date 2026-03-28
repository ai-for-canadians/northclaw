# Demo

Guided walkthrough of NorthClaw capabilities using sample data. Takes 5 minutes. Designed for prospects and new users who want to see what NorthClaw does before using it with real data.

## Trigger phrases
- /demo
- "show me what this can do"
- "give me a walkthrough"
- "demo mode"

## What to do

Walk through 5 capabilities in sequence. Use sample/fictional data so nothing sensitive is involved. Pause briefly between each step so the user can see what happened.

### Step 1: Memory (30 seconds)
"Let me show you how NorthClaw remembers context across conversations."

Write a sample memory entry to this group's CLAUDE.md:
```
## Memory
- [today's date] Demo: Sample client Acme Corp has 25 employees, $2M revenue, needs AI training
```

Then say: "I just saved a fact about a fictional client. Next time we talk, I'll remember Acme Corp has 25 employees. This happens automatically after every real conversation."

### Step 2: Consent Gate (45 seconds)
"Now let me show you the CASL compliance layer."

Explain what happens when a message goes out:
- "If I were sending an email to a Canadian contact, the system checks: Do we have consent? Is it commercial or transactional? Is the recipient in Canada or the US?"
- "For a Canadian recipient with no consent on file, the message gets blocked. For a US recipient, CAN-SPAM rules apply instead (opt-out, not opt-in)."
- "Every decision is logged in the audit trail."

Show a sample audit entry:
```
[timestamp] CONSENT_CHECK | recipient: demo@example.ca | jurisdiction: CA | consent: none | result: BLOCKED
```

### Step 3: Security (45 seconds)
"Here's what happens if an agent tries to send your data somewhere it shouldn't."

Run (or simulate): `curl https://example.com` from inside a container context.
Explain: "That request fails. The agent container can't reach the internet. Default-deny. Even if someone tricks the AI into trying to exfiltrate data, the network blocks it."

Show the current security profile:
```
Security profile: selective
Allowed domains: api.anthropic.com, google.com, wikipedia.org, linkedin.com + [N] more
Everything else: blocked and logged
```

### Step 4: Pipeline Briefing (60 seconds)
"Let me show you a pipeline briefing using sample data."

Generate a sample briefing using fictional data:
```
Pipeline Briefing — [today's date]

Overdue:
- Sarah Chen at Acme Corp: Proposal was due March 20. Send today or call to reset timeline.

Active this week:
- BetaCo: Discovery call scheduled Thursday. 25-person team, AI training interest.
- GammaTech: Value report due end of month. Collecting session data.

Stale (no contact 14+ days):
- Delta Partners: Last contact March 10. Suggested: share relevant case study.

Today's meetings:
- None scheduled (demo mode)
```

Say: "In production, this pulls from your actual calendar, meeting transcripts, and client database. You'd get this every morning at 9 AM in Slack."

### Step 5: Audit Trail (45 seconds)
"Finally, the audit trail. Every action the AI takes is logged with a tamper-proof hash chain."

Show sample audit entries:
```
Recent activity:
[09:01] AGENT_START | group: demo | container: northclaw-demo-abc123
[09:01] FILE_READ | group: demo | detail: Read CLAUDE.md (memory)
[09:02] CONSENT_CHECK | recipient: demo@example.ca | result: BLOCKED
[09:02] MESSAGE_SENT | group: demo | detail: Response sent (342 chars)
[09:02] MEMORY_WRITE | group: demo | detail: Added 1 fact to CLAUDE.md
[09:02] CONTAINER_STOP | group: demo | duration: 8.4s
```

Say: "Each entry includes a SHA-256 hash linking it to the previous entry. If anyone modifies a historical record, the chain breaks and we detect it. This is what you show regulators when they ask what your AI did."

### Closing
"That's NorthClaw. Compliant AI agents with persistent memory, CASL consent gating, default-deny networking, and tamper-evident audit trails. All running on your machine, all open source."

"Type `/help` to see all available commands, or just start messaging me with real work."

## Clean up
After the demo, remove the sample memory entry from CLAUDE.md (delete the "Demo: Sample client Acme Corp" line).

## Do NOT
- Use real client data in the demo
- Actually send emails or messages to external addresses
- Modify any real configuration
- Skip steps or rush through
