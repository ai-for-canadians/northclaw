# Contract Data Protection Clause Review

Scan contracts for data protection terms and generate redline suggestions.

## Trigger phrases
- /contract-review
- "review this contract for data clauses"
- "check the DPA"
- "data protection terms in this agreement"

## What to do

1. Accept the contract (file path, pasted text, or attachment).

2. Scan for these clause categories:

| Category | What to check | Key regulation |
|----------|--------------|----------------|
| Data processing terms | Purpose limitation, lawful basis, data categories | GDPR Art 28 |
| Cross-border transfers | SCCs, BCRs, adequacy decisions, transfer impact assessment | GDPR Ch V |
| Breach notification | Timeframes, content requirements, notification chain | GDPR Art 33-34 |
| Sub-processor requirements | Prior authorization, flow-down obligations, sub-processor list | GDPR Art 28(2)(4) |
| Data retention | Retention periods, deletion obligations, return of data | GDPR Art 28(3)(g) |
| Liability caps | Data incident carve-outs, indemnification, limitation exclusions | Commercial |
| Audit rights | Right to audit, frequency, scope, notice period | GDPR Art 28(3)(h) |
| Data subject rights | Assistance obligations, response timeframes | GDPR Art 28(3)(e) |
| Technical measures | Security requirements, encryption, pseudonymization | GDPR Art 32 |

3. For each finding:
   - Clause reference (section/paragraph number)
   - Current language (quote the relevant text)
   - Assessment: Compliant / Partially compliant / Non-compliant / Missing
   - Regulatory requirement it maps to
   - Risk if unchanged: High / Medium / Low

4. For non-compliant or missing clauses, generate redline suggestions:
   - Proposed replacement language
   - Regulatory justification for the change
   - Negotiation priority: Must-have / Should-have / Nice-to-have

5. Output a summary:
   - Total clauses reviewed
   - Compliant / Partially compliant / Non-compliant / Missing counts
   - Top 3 priority redlines
   - Overall assessment: Acceptable / Needs revision / Do not sign

## Do NOT
- Send contract text outside the container
- Provide legal advice — flag that this is a compliance review, not legal counsel
- Skip any category even if the contract appears standard
