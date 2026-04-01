# PII Detection and Redaction

Scan documents for personal data, classify findings, and offer redaction.

## Trigger phrases
- /pii-scan
- "scan this document for personal data"
- "find PII in this file"
- "redact personal information"

## What to do

1. Accept the document (file path, pasted text, or attachment).

2. Scan for these PII categories:

| Category | Examples | Sensitivity |
|----------|----------|-------------|
| Direct identifiers | Full names, email addresses, phone numbers | High |
| Government IDs | SIN, SSN, passport, driver's license | Critical |
| Financial | Credit card, bank account, tax ID | Critical |
| Health | Medical records, prescriptions, conditions | Critical |
| Biometric | Fingerprints, facial recognition data | Critical |
| Location | Home address, GPS coordinates | High |
| Online identifiers | IP addresses, device IDs, cookies | Medium |
| Employment | Employee ID, salary, performance reviews | High |

3. For each finding, report:
   - Line/location in document
   - PII type and sensitivity level
   - Jurisdiction-relevant classification (GDPR special category, PIPEDA sensitive, HIPAA PHI)
   - Recommended action: redact / pseudonymize / encrypt / flag for review

4. Offer redaction options:
   - Full redaction: replace with `[REDACTED]`
   - Pseudonymization: replace with consistent fake data (Person A, person-a@example.com)
   - Partial: mask middle characters (J*** D**, ***-**-1234)

5. Generate a data inventory record:
   - Document name, scan date
   - PII categories found (counts per category)
   - Sensitivity classification
   - Recommended handling

## Do NOT
- Send document content outside the container
- Store the scanned document after processing
- Skip any PII category — scan for all types regardless of jurisdiction
- Treat pseudonymized data as anonymous (it isn't under GDPR)
