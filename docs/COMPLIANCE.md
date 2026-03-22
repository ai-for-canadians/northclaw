# NorthClaw Compliance

## CASL Consent Gate

Canada's Anti-Spam Legislation (CASL) requires consent before sending commercial electronic messages (CEMs) to Canadian recipients. NorthClaw enforces this at the infrastructure level.

### How It Works

1. Every outbound message passes through `src/outbound.ts` before delivery
2. The consent gate classifies the message as commercial or transactional
3. Jurisdiction is detected (CA, US, or OTHER) based on recipient identifier
4. CASL or CAN-SPAM rules are applied based on jurisdiction
5. Messages are allowed, logged, or blocked depending on consent status and enforcement mode

### Consent Types

| Type | Description | Expiry |
|------|-------------|--------|
| `express` | Recipient explicitly opted in | Never |
| `implied_ebr` | Existing Business Relationship | 2 years from last transaction |
| `implied_inquiry` | Inquiry-based | 6 months from inquiry date |
| `implied_publication` | Conspicuously published address | No expiry (must relate to role) |

### Enforcement Modes

Set via `NORTHCLAW_CONSENT_MODE` environment variable:

- **`log-only`** (default): Logs consent check results but delivers all messages. Use during onboarding to populate consent records before enforcing.
- **`strict`**: Blocks messages that fail consent checks. Messages to unsubscribed or expired recipients are not delivered.

### CASL Requirements for CEMs

Every commercial message must include (CASL s.6(2)):
- Sender identification (name)
- Mailing address
- Contact method
- Unsubscribe mechanism

Configure these via environment variables:
- `NORTHCLAW_SENDER_NAME`
- `NORTHCLAW_MAILING_ADDRESS`
- `NORTHCLAW_CONTACT_URL`
- `NORTHCLAW_UNSUBSCRIBE_URL`

## Audit Logging

Hash-chained, append-only audit log at `data/audit/audit.jsonl`.

### Event Types

`message_sent`, `message_blocked`, `consent_check`, `consent_update`, `unsubscribe`, `container_start`, `container_stop`, `container_timeout`, `egress_blocked`, `egress_allowed`, `error`

### Tamper Evidence

Each audit record includes:
- SHA-256 hash of the record content
- Previous record's hash (chain link)
- Sequential ID

If any historical record is modified, all subsequent hashes break. Verification: `AuditLogger.verify()` performs a single-pass chain check.

### Storage

- Location: `data/audit/audit.jsonl` (JSONL format)
- Outside container reach — agents cannot read or modify audit logs
- Consent database: `data/consent/consent.sqlite` (separate from main DB)
