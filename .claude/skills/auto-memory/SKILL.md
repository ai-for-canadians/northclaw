# Auto Memory

After every agent session that produces meaningful output, automatically extract and append key facts to the group's CLAUDE.md memory file.

## Trigger
This skill runs automatically at the end of every agent session. No command needed. The agent checks if anything worth remembering happened and writes it if so.

## What to remember

Extract ONLY facts that would be useful in a future conversation:

- Decisions made ("Budget set at $50K", "Chose Slack over Teams")
- Commitments ("Will send proposal by Friday", "Follow-up scheduled for April 3")
- Preferences learned ("Prefers PDF over docx", "Morning meetings only")
- Key numbers ("Team size: 14", "Annual revenue: $2.3M", "Contract value: $8K")
- Relationship context ("Met through [referral source]", "Reports to Sarah", "Skeptical of AI")
- Status changes ("Moved from prospect to active client", "Proposal accepted")

## What NOT to remember

- Conversation filler or greetings
- Information already in CLAUDE.md
- Temporary context that won't matter next session
- Anything the user explicitly says is off-record

## Format

Append to the group's CLAUDE.md under a `## Memory` section:

```
## Memory

- [2026-03-25] Budget confirmed at $50K for Q2 engagement
- [2026-03-25] Prefers brief emails, no attachments
- [2026-03-26] Proposal sent, waiting for board review by April 10
```

Each entry: date, one line, specific. No paragraphs. No analysis.

## Implementation

At session end, before the container is destroyed:

1. Review the conversation for memorable facts (use the criteria above)
2. If nothing worth remembering, skip silently
3. If facts found, read current CLAUDE.md from the group's workspace
4. Check for duplicates (don't re-add known facts)
5. Append new entries under `## Memory` with today's date
6. Write back to CLAUDE.md

The memory file persists across sessions because it's on the bind-mounted workspace, not inside the ephemeral container.

## Token efficiency

Keep memory entries to ONE line each. The entire Memory section should stay under 100 lines. If it exceeds 100 lines, summarize the oldest 20 entries into 5 consolidated entries and remove the originals. This prevents CLAUDE.md from growing unbounded and consuming context window.
