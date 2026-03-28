# Help

Show available NorthClaw commands when a user asks what the system can do.

## Trigger phrases
- /help
- "what can you do"
- "what commands are available"
- "how do I use this"
- First message in a new group

## Response format

Respond with this exact list, formatted cleanly:

**NorthClaw Commands**

📋 `/pipeline` — Morning briefing. Overdue follow-ups, today's meetings, stale contacts.
🎙️ `/debrief` — Process a meeting. Pulls transcript, extracts decisions and next steps.
🔍 `/discover [person or org]` — Pre-meeting research. Pulls context from everywhere.
📊 `/value-report [client]` — Monthly value report using the 5-layer model.
📝 `/proposal [prospect]` — Draft a proposal with value-based pricing.
📅 `/weekly` — Monday review. Revenue, pipeline, decisions, priorities.
🔒 `/egress add [domain]` — Allow a website through the network filter.
📤 `/consent-export --recipient [email]` — Export consent records for regulatory requests.
🔧 `/new-skill [name]` — Create a new custom skill.
📈 `/status` — System health. Active containers, costs, security profile.
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
