# Vendor Risk Assessment

Assess vendor security posture and generate a board-ready risk report.

## Trigger phrases
- /vendor-risk
- "assess this vendor"
- "vendor security review"
- "third-party risk assessment"

## What to do

1. Collect vendor information:
   - Vendor name and website
   - Service description (what data they process)
   - Data categories they handle (PII, financial, health, etc.)
   - Hosting location (country/region)
   - Security questionnaire responses (if available)

2. Cross-reference via allowed web domains:
   - Public breach history (news, HaveIBeenPwned disclosures)
   - Certifications (SOC 2, ISO 27001, ISO 27701, PCI DSS)
   - Regulatory actions or fines
   - Company stability indicators (layoffs, acquisitions)

3. Score against framework requirements:

| Requirement | Framework | Score (1-5) |
|-------------|-----------|-------------|
| Data processing agreement | GDPR Art 28 | |
| Sub-processor management | GDPR Art 28(2) | |
| Breach notification capability | GDPR Art 33 | |
| Cross-border transfer mechanism | GDPR Ch V | |
| ICT risk management | DORA Art 5-16 | |
| Third-party risk monitoring | DORA Art 28-30 | |
| Security controls evidence | SOC 2 CC6-CC7 | |
| Incident response capability | SOC 2 CC7.3-CC7.5 | |
| Business continuity | SOC 2 A1.2 | |
| Data deletion capability | GDPR Art 17 | |

4. Generate structured risk score:
   - Overall: Critical / High / Medium / Low
   - Category breakdown (security, compliance, operational, financial)
   - Residual risk after proposed mitigations

5. Output board-ready vendor risk report:
   - Executive summary (3 sentences)
   - Risk matrix (visual table)
   - Key findings (top 5)
   - Recommended mitigations
   - Recommendation: Approve / Approve with conditions / Reject
   - Review cadence: Annual / Semi-annual / Quarterly (based on risk)

## Do NOT
- Approve vendors without checking breach history
- Accept certifications at face value without checking validity dates
- Skip DORA requirements for financial sector vendors
