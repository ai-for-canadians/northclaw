# Whistleblower Report Triage

Triage incoming whistleblower reports with jurisdiction-aware deadlines and anonymity protection.

## Trigger phrases
- /whistleblower
- "new whistleblower report"
- "anonymous report received"
- "ethics hotline report"

## What to do

1. Collect report details (protect anonymity throughout):
   - Report category: fraud, corruption, data protection, safety, discrimination, other
   - Severity: Critical (imminent harm) / High (ongoing violation) / Medium / Low
   - Date received
   - Channel received through (hotline, email, portal, in-person)
   - Is reporter identity known? (never reveal if so)

2. Apply jurisdiction-specific requirements:

| Jurisdiction | Framework | Feedback Deadline | Key Requirements |
|-------------|-----------|-------------------|------------------|
| EU | Directive 2019/1937 | 90 days from acknowledgment | 7-day acknowledgment, designated channel |
| France | Sapin II + Waserman | 90 days | External reporting to authorities permitted |
| Germany | HinSchG | 90 days | Anonymous reports must be accepted |
| UK | PIDA 1998 | No statutory deadline | Protected disclosure framework |
| US | SOX / Dodd-Frank | Varies by agency | SEC bounty program, retaliation protection |
| Canada | PSDPA (federal) | 60 days initial response | Commissioner investigation option |

3. Triage workflow:
   - Acknowledge receipt (within 7 days for EU)
   - Assign case ID (never linked to reporter identity)
   - Determine if external reporting is required (regulator, law enforcement)
   - Flag conflicts of interest in investigation team
   - Set follow-up deadline in calendar

4. Verify anonymity protection:
   - Reporter identity NOT in case notes (use case ID only)
   - Reporter identity NOT in audit trail entries
   - Reporter identity NOT shared with investigation subjects
   - Communication channel preserves anonymity

5. Generate investigation plan:
   - Scope of investigation
   - Evidence to collect
   - Persons to interview (not the reporter unless they consent)
   - Timeline with regulatory deadlines
   - Escalation criteria

6. Detect patterns:
   - Check if similar reports exist (by category, department, subject)
   - Flag if this is the Nth report about the same issue
   - Recommend systemic investigation if pattern detected

7. Log to audit trail:
   - Case opened, category, severity, deadlines
   - Process steps completed with timestamps
   - NEVER log reporter identity even in audit trail

## Do NOT
- Store, display, or log reporter identity anywhere
- Share report details with the subject of the report before investigation
- Dismiss reports without documented assessment
- Skip the 7-day acknowledgment for EU reports
