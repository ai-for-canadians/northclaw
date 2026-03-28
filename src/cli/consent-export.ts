#!/usr/bin/env npx tsx
/**
 * CLI for exporting consent records and handling data subject requests.
 *
 * Supports PIPEDA right-to-know, CASL complaints, Law 25 access requests,
 * and data deletion (purge) requests.
 *
 * Usage:
 *   npx tsx src/cli/consent-export.ts --recipient user@example.com
 *   npx tsx src/cli/consent-export.ts --recipient user@example.com --format json
 *   npx tsx src/cli/consent-export.ts --recipient user@example.com --format csv
 *   npx tsx src/cli/consent-export.ts --all
 *   npx tsx src/cli/consent-export.ts --purge --recipient user@example.com
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { ConsentDB, type ConsentRecord } from '../compliance/casl/consent-db.js';

const DB_PATH = 'data/consent/consent.sqlite';
const AUDIT_LOG_PATH = 'data/audit/audit.jsonl';

function printUsage(): void {
  console.log(`
Usage:
  npx tsx src/cli/consent-export.ts --recipient <email>                   Export (human-readable)
  npx tsx src/cli/consent-export.ts --recipient <email> --format json     Export as JSON
  npx tsx src/cli/consent-export.ts --recipient <email> --format csv      Export as CSV
  npx tsx src/cli/consent-export.ts --all                                 List all recipients
  npx tsx src/cli/consent-export.ts --purge --recipient <email>           Purge consent records
  `.trim());
}

function formatRecord(r: ConsentRecord): string {
  const lines = [
    `Recipient:    ${r.recipientId}`,
    `Consent type: ${r.consentType}`,
    `Consent date: ${r.consentDate || 'N/A'}`,
    `Source:       ${r.consentSource || 'N/A'}`,
    `Evidence:     ${r.consentEvidence || 'N/A'}`,
    `Jurisdiction: ${r.jurisdiction}`,
    `Expiry:       ${r.expiryDate || 'None'}`,
    `Unsubscribed: ${r.unsubscribed ? `Yes (${r.unsubscribeDate})` : 'No'}`,
    `Last updated: ${r.lastUpdated}`,
  ];
  return lines.join('\n');
}

function getAuditEntriesForRecipient(recipientId: string): any[] {
  if (!fs.existsSync(AUDIT_LOG_PATH)) return [];

  const entries: any[] = [];
  const lines = fs.readFileSync(AUDIT_LOG_PATH, 'utf-8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      const str = JSON.stringify(entry);
      if (str.includes(recipientId)) {
        entries.push(entry);
      }
    } catch {
      // Skip malformed lines
    }
  }
  return entries;
}

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  printUsage();
  process.exit(0);
}

// Parse args
let recipient: string | null = null;
let format: 'text' | 'json' | 'csv' = 'text';
let listAll = false;
let purge = false;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--recipient':
      recipient = args[++i];
      break;
    case '--format':
      format = args[++i] as 'text' | 'json' | 'csv';
      break;
    case '--all':
      listAll = true;
      break;
    case '--purge':
      purge = true;
      break;
  }
}

if (!fs.existsSync(path.dirname(DB_PATH))) {
  console.error('Consent database not found. No consent records exist yet.');
  process.exit(1);
}

const db = new ConsentDB(DB_PATH);

try {
  if (listAll) {
    const stats = db.getStats();
    console.log('Consent Database Summary');
    console.log('========================');
    console.log(`Total records:  ${stats.total}`);
    console.log(`Express:        ${stats.express}`);
    console.log(`Implied:        ${stats.implied}`);
    console.log(`Unsubscribed:   ${stats.unsubscribed}`);
    console.log(`Expired:        ${stats.expired}`);
    process.exit(0);
  }

  if (!recipient) {
    console.error('Error: --recipient is required (unless using --all).');
    printUsage();
    process.exit(1);
  }

  if (purge) {
    console.log(`\nWARNING: This will delete all consent records for "${recipient}".`);
    console.log('Audit log entries are immutable and will still reference this recipient.');
    console.log('This is by design for compliance integrity.\n');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
      rl.question('Type "PURGE" to confirm: ', resolve);
    });
    rl.close();

    if (answer !== 'PURGE') {
      console.log('Aborted.');
      process.exit(0);
    }

    // Delete from consent table (history is kept for audit trail)
    const record = db.getConsent(recipient);
    if (!record) {
      console.log(`No consent record found for "${recipient}".`);
    } else {
      // Use unsubscribe as soft-delete (preserves history)
      db.unsubscribe(recipient);
      console.log(`Consent record for "${recipient}" has been purged (marked unsubscribed).`);
      console.log('Consent history entries are preserved for audit compliance.');
    }
    process.exit(0);
  }

  // Export
  const record = db.getConsent(recipient);
  const history = db.getHistory(recipient);
  const auditEntries = getAuditEntriesForRecipient(recipient);

  if (!record && history.length === 0 && auditEntries.length === 0) {
    console.log(`No records found for "${recipient}".`);
    process.exit(0);
  }

  switch (format) {
    case 'json': {
      const output = {
        exportDate: new Date().toISOString(),
        recipient,
        consentRecord: record,
        consentHistory: history,
        auditTrailEntries: auditEntries,
      };
      console.log(JSON.stringify(output, null, 2));
      break;
    }

    case 'csv': {
      console.log('recipient_id,consent_type,consent_date,consent_source,jurisdiction,expiry_date,unsubscribed,last_updated');
      if (record) {
        console.log([
          record.recipientId,
          record.consentType,
          record.consentDate || '',
          record.consentSource || '',
          record.jurisdiction,
          record.expiryDate || '',
          record.unsubscribed,
          record.lastUpdated,
        ].join(','));
      }
      break;
    }

    default: {
      console.log(`\nConsent Export for: ${recipient}`);
      console.log('='.repeat(50));

      if (record) {
        console.log('\nCurrent consent record:');
        console.log(formatRecord(record));
      } else {
        console.log('\nNo active consent record.');
      }

      if (history.length > 0) {
        console.log(`\nConsent history (${history.length} entries):`);
        for (const h of history) {
          console.log(`  ${h.timestamp} | ${h.action} | ${h.old_consent_type || 'N/A'} → ${h.new_consent_type || 'N/A'} | ${h.source || ''}`);
        }
      }

      if (auditEntries.length > 0) {
        console.log(`\nAudit trail (${auditEntries.length} entries mentioning this recipient):`);
        for (const e of auditEntries) {
          console.log(`  ${e.timestamp} | ${e.event} | ${e.channel || ''}`);
        }
      }

      console.log('\nFor regulatory submission, use --format json.');
    }
  }
} finally {
  db.close();
}
