# Compliance-Aware Code Security Review

Analyze code for security vulnerabilities and map findings to compliance frameworks.

## Trigger phrases
- /code-review
- "review this code for security"
- "security audit this file"
- "check for vulnerabilities"

## What to do

1. Accept the code (file path, pasted code, or PR diff).

2. Scan for these vulnerability classes:

**Critical**
- Hardcoded secrets (API keys, tokens, passwords, connection strings)
- SQL injection (string concatenation in queries)
- Command injection (unsanitized input in exec/spawn)
- Insecure deserialization (untrusted data in JSON.parse with eval-like behavior)

**High**
- XSS (unescaped user input in HTML output)
- Missing input validation (user input used without sanitization)
- Broken authentication (weak session handling, missing CSRF)
- Sensitive data exposure (PII in logs, error messages, URLs)

**Medium**
- Weak cryptography (MD5, SHA1 for security, ECB mode, short keys)
- Missing rate limiting on authentication endpoints
- Overly permissive CORS
- Logging PII or sensitive data

**Low**
- Missing security headers
- Verbose error messages in production
- Deprecated functions

3. For each finding, provide:
   - File, line number, code snippet
   - Severity: Critical / High / Medium / Low
   - Description of the vulnerability
   - Compliance mapping (which framework requirement it violates)
   - Remediation code (drop-in replacement)

4. Map to frameworks:
   - PCI DSS (Req 6.5 — secure coding)
   - SOC 2 (CC6.1 — logical access, CC7.1 — system operations)
   - HIPAA (164.312 — technical safeguards)
   - NIST 800-53 (SI-10, SC-28, AC-3)

## Do NOT
- Send code outside the container
- Ignore findings because "it's just internal code"
- Generate remediation that introduces new vulnerabilities
