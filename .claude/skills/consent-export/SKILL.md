# Consent Export and Data Subject Requests

When the user needs to export consent records, respond to a regulatory request, or purge data for a specific recipient, use the consent export CLI.

## Commands

```bash
# Export all records for a recipient (human-readable)
npx tsx src/cli/consent-export.ts --recipient user@example.com

# Export as JSON (includes audit trail, for regulatory submission)
npx tsx src/cli/consent-export.ts --recipient user@example.com --format json

# Export as CSV (consent records only)
npx tsx src/cli/consent-export.ts --recipient user@example.com --format csv

# List all recipients in the consent database
npx tsx src/cli/consent-export.ts --all

# Purge all records for a recipient (PIPEDA deletion request)
npx tsx src/cli/consent-export.ts --purge --recipient user@example.com
```

## Context

This tool supports compliance with:
- **PIPEDA right-to-know requests:** Export all data held about a specific individual
- **CASL complaints:** Provide evidence of consent status at time of message
- **Law 25 access requests:** Full export of automated decision history involving a person
- **Data deletion requests:** Purge consent records (audit log entries are append-only and cannot be purged, document this)

The JSON export includes consent records, consent history (all changes), and audit trail entries mentioning the recipient. This is the format to provide to regulators.

When purging, warn the user that audit log entries are immutable and will still contain references to the recipient. This is by design for compliance integrity.
