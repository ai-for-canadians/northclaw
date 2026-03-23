# New Skill Template

When the user wants to create a new skill for NorthClaw, use this template.

## Trigger phrases
- /new-skill [name]
- "create a skill for [task]"
- "add a new agent for [purpose]"

## What to do

1. Ask the user:
   - What should this skill do? (one sentence)
   - What triggers it? (command name and natural language phrases)
   - What data sources does it need? (Granola, knowledge graph, web, files)
   - Who sees the output? (internal only, or client-facing?)

2. Create a new folder at `.claude/skills/[skill-name]/SKILL.md` using this structure:

```markdown
# [Skill Name]

[One sentence description of what this skill does.]

## Trigger phrases
- /[command]
- "[natural language trigger 1]"
- "[natural language trigger 2]"

## What to do

1. [First step — gather context]
2. [Second step — process/analyze]
3. [Third step — format output]

## Voice
[How should the output sound? Reference system defaults if client-facing.]

## Do NOT
- [Guardrail 1]
- [Guardrail 2]
```

3. If the skill needs a CLI tool (not just Claude Code instructions), also create `src/cli/[skill-name].ts` with the implementation.

4. Test the skill by running the trigger phrase in Claude Code.

## Rules for all skills
- Skills are SKILL.md instruction files, not code PRs to the core
- One skill per folder in .claude/skills/
- Skills can reference project knowledge, Granola, web search, and the knowledge graph
- Client-facing output follows system defaults (voice, banned words, simplify pass)
- Internal output can be rough
- Never reveal methodology or framework names in client-facing skill output
