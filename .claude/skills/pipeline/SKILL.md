# Pipeline Review

When the user asks for a pipeline review, status update, daily briefing, or asks about their prospects and follow-ups, run this skill.

## Trigger phrases
- /pipeline
- "pipeline status"
- "what's my pipeline look like"
- "any overdue follow-ups"
- "morning briefing"
- "what should I focus on today"

## What to do

1. Check Granola for meetings in the last 7 days. Extract any commitments, follow-ups, or next steps mentioned.

2. Check the knowledge graph (aifc_knowledge_graph_v2.json in project knowledge) for:
   - Active clients and last contact dates
   - Pipeline prospects and their stages
   - Any follow_up_status marked as OVERDUE
   - Contact gaps longer than 14 days for active clients

3. Check calendar for today's meetings. For each meeting, pull any existing context on the person/org from the knowledge graph and past conversations.

4. Present the briefing in this format:

**Overdue (action needed today)**
- [Name] at [Org]: [What was promised, when, what to do now]

**Active this week**
- [Client/prospect]: [Current status, next milestone]

**Today's meetings**
- [Time] [Meeting]: [Key context, what to prepare]

**Stale (no contact in 14+ days)**
- [Name] at [Org]: Last contact [date]. Suggested re-engagement: [one sentence]

**Opportunities spotted**
- [Anything from recent meetings that could become a deal, content, or partnership]

## Voice
Direct. No filler. Flag problems first, then status, then opportunities. If nothing is overdue, say so and move on.

## Do NOT
- List every contact in the database
- Include people with no active engagement
- Pad the briefing with generic advice
