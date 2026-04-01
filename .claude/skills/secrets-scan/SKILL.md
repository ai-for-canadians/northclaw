# Secrets Detection

Scan files and git history for leaked credentials.

## Trigger phrases
- /secrets-scan
- "scan for leaked credentials"
- "check for secrets in the code"
- "are there any exposed API keys"

## What to do

1. Scan the current working directory for:

| Secret Type | Pattern |
|-------------|---------|
| API keys | High-entropy strings near `key`, `api`, `token` |
| AWS credentials | `AKIA[0-9A-Z]{16}`, `aws_secret_access_key` |
| Private keys | `-----BEGIN (RSA\|EC\|OPENSSH) PRIVATE KEY-----` |
| Connection strings | `mongodb://`, `postgres://`, `mysql://` with credentials |
| OAuth tokens | `ghp_`, `gho_`, `github_pat_`, `sk-`, `xoxb-`, `xoxp-` |
| Passwords | Variables named `password`, `passwd`, `secret` with literal values |
| JWT secrets | `JWT_SECRET`, `TOKEN_SECRET` with values |
| Cloud credentials | GCP service account JSON, Azure connection strings |

2. Check git history (last 100 commits):
   - `git log -p` for secrets that were committed then removed
   - These are still in history and accessible

3. For each finding, report:
   - File path and line number (or commit hash if in history)
   - Secret type
   - Blast radius: What systems does this credential access?
   - Status: Active (needs immediate rotation) / Revoked / Unknown
   - Severity: Critical (cloud/infra access) / High (service access) / Medium (limited scope)

4. Generate rotation procedure per secret type:
   - Where to revoke the old credential
   - How to generate a new one
   - Where to update the new credential
   - How to verify rotation worked

5. If live credentials found, generate an incident report:
   - Discovery timestamp
   - Credential type and scope
   - Exposure window (first commit to now)
   - Remediation steps taken
   - Log to audit trail

## Do NOT
- Display full secret values in output (mask middle characters)
- Skip git history — removed secrets are still exposed
- Ignore `.env.example` files (they sometimes contain real values)
