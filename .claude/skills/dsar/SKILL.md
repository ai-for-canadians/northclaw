# Data Subject Access Request

Triage and process Data Subject Access Requests with jurisdiction-aware deadlines and templates.

## Trigger phrases
- /dsar
- "data subject access request"
- "someone wants their data"
- "right to access request"

## What to do

1. Collect request details:
   - Who is requesting? (name, email, relationship to org)
   - What are they requesting? (access, deletion, correction, portability, restriction)
   - Which jurisdiction? (detect from address, language, or ask)

2. Apply correct framework and deadline:

| Jurisdiction | Framework | Deadline | Extension |
|-------------|-----------|----------|-----------|
| EU/EEA | GDPR | 30 days | +60 days (complex) |
| California | CCPA/CPRA | 45 days | +45 days |
| Brazil | LGPD | 15 days | None |
| Canada | PIPEDA | 30 days | +30 days |
| UK | UK GDPR | 30 days | +60 days |
| Quebec | Law 25 | 30 days | +10 days |

3. Flag identity verification needs:
   - Sufficient: government ID, account login, signed letter
   - Insufficient: email alone (for sensitive data)
   - Note: verification must not collect more data than necessary

4. Generate response template with required elements per framework:
   - Acknowledgment (within 3 business days)
   - Categories of data held
   - Purposes of processing
   - Recipients or categories of recipients
   - Retention periods
   - Source of data (if not from the individual)
   - Rights explanation (further complaints, supervisory authority)

5. Log to audit trail:
   - Request received date, type, jurisdiction, deadline, status

## Do NOT
- Ignore requests or suggest ignoring them
- Recommend charging fees unless GDPR manifestly unfounded/excessive criteria are met
- Skip identity verification for sensitive data requests
