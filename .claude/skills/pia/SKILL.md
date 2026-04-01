# Privacy Impact Assessment

Generate an audit-ready Privacy Impact Assessment for a data processing activity.

## Trigger phrases
- /pia
- "run a privacy impact assessment"
- "PIA for [project/system]"

## What to do

1. Ask which jurisdiction(s) apply: GDPR (EU), PIPEDA (Canada), LGPD (Brazil), UK ICO, or multiple.

2. Walk through the questionnaire:

**Data Processing Details**
- What personal data is collected? (categories, not examples)
- What is the lawful basis / purpose?
- Who are the data subjects? (employees, customers, public)
- How is data collected? (directly, third party, automated)
- Where is data stored? (country, cloud provider, on-premise)
- Who has access? (roles, not names)
- How long is data retained?
- Is data shared with third parties? Who and why?
- Are there cross-border transfers?

**Risk Assessment**
Score each risk (likelihood x impact) on a 1-5 scale:
- Unauthorized access
- Data loss or corruption
- Excessive collection
- Purpose creep
- Cross-border transfer risks
- Re-identification of anonymized data
- Automated decision-making impact

3. Output the PIA document:

**[Project Name] — Privacy Impact Assessment**
- Date, assessor, jurisdiction(s)
- Processing description
- Necessity and proportionality analysis
- Risk matrix (table format)
- Mitigations for each high/critical risk
- Residual risk assessment
- Recommendation: Proceed / Proceed with conditions / Do not proceed
- Review date (12 months from assessment)

4. Map to framework requirements:
- GDPR Article 35 (mandatory DPIA triggers)
- PIPEDA Principle 4.4 (limiting collection)
- LGPD Article 38 (impact report)
- UK ICO DPIA guidance

## Do NOT
- Use real personal data in examples
- Skip the risk scoring — every risk needs a number
- Output without asking jurisdiction first
