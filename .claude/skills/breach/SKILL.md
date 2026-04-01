# Breach Notification Coordinator

Structured incident response for data breaches with jurisdiction-aware notification deadlines.

## Trigger phrases
- /breach
- "we have a data breach"
- "data incident"
- "potential breach"

## What to do

1. Assess the incident:
   - What happened? (unauthorized access, loss, disclosure, ransomware)
   - When was it discovered? (this starts the clock)
   - What data was affected? (categories and approximate volume)
   - Who is affected? (employees, customers, jurisdiction)
   - Is the breach ongoing or contained?
   - Was data encrypted at rest?

2. Calculate notification deadlines from discovery time:

| Jurisdiction | Regulator Deadline | Individual Deadline | Authority |
|-------------|-------------------|--------------------:|-----------|
| EU (GDPR) | 72 hours | Without undue delay | Supervisory authority |
| Canada (PIPEDA) | As soon as feasible | As soon as feasible | OPC |
| Quebec (Law 25) | With diligence | With diligence | CAI |
| California (CCPA) | Most expedient time | Most expedient time | AG |
| UK | 72 hours | Without undue delay | ICO |
| Brazil (LGPD) | Reasonable time | Reasonable time | ANPD |

3. Draft regulator notification letter containing:
   - Nature of the breach
   - Categories and approximate number of individuals
   - Categories of data affected
   - Likely consequences
   - Measures taken or proposed
   - Contact point for further information

4. Draft affected individual notification containing:
   - Plain language description of what happened
   - What data was involved
   - What you are doing about it
   - What they can do to protect themselves
   - Contact information for questions

5. Generate evidence preservation checklist:
   - Preserve logs, access records, network captures
   - Document timeline with timestamps
   - Identify forensic investigation needs
   - Note: do NOT delete or modify any evidence

6. Log everything to audit trail with timestamps.

## Do NOT
- Advise hiding or delaying notification beyond legal deadlines
- Minimize the severity of the breach
- Skip jurisdictions where affected individuals reside
