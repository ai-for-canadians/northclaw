# Infrastructure-as-Code Compliance Scanner

Scan IaC files against security benchmarks and compliance frameworks.

## Trigger phrases
- /iac-scan
- "check my terraform for compliance"
- "scan infrastructure code"
- "is my kubernetes config secure"

## What to do

1. Detect IaC type and read files:
   - Terraform (`.tf`, `.tfvars`)
   - CloudFormation (`.yaml`, `.json` with `AWSTemplateFormatVersion`)
   - Kubernetes (`.yaml` with `apiVersion`)
   - Docker Compose (`docker-compose.yml`, `compose.yml`)
   - Dockerfile

2. Check against these benchmarks:

**CIS Benchmarks**
- Encryption at rest and in transit
- Network segmentation and least-privilege access
- Logging and monitoring enabled
- Default credentials removed
- Public access disabled where not required

**Framework-specific checks:**

| Check | Frameworks |
|-------|-----------|
| Data encrypted at rest | PCI DSS 3.4, HIPAA 164.312(a)(2)(iv), SOC 2 CC6.1 |
| Data encrypted in transit | PCI DSS 4.1, NIST SC-8 |
| Access logging enabled | SOC 2 CC7.2, NIST AU-2 |
| Least-privilege IAM | NIST AC-6, PCI DSS 7.1 |
| No public S3/storage buckets | CIS AWS 2.1.5, SOC 2 CC6.1 |
| No hardcoded secrets | PCI DSS 6.5.3, NIST IA-5 |
| Container runs as non-root | CIS Docker 4.1, NIST CM-7 |
| Resource limits set | CIS Kubernetes 5.2 |
| Network policies defined | CIS Kubernetes 5.3, NIST SC-7 |

3. For each finding:
   - File, line number, resource name
   - Severity: Critical / High / Medium / Low
   - Current (insecure) configuration
   - Compliant replacement code (drop-in fix)
   - Which requirement the fix satisfies

4. Summary report:
   - Total resources scanned
   - Findings by severity
   - Compliance coverage (% of applicable controls passing)
   - Top 3 priority fixes

## Do NOT
- Modify IaC files without user approval
- Skip Dockerfile scans — container security is IaC security
- Ignore `.tfvars` files (they often contain secrets)
