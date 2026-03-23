#!/usr/bin/env npx tsx
/**
 * CLI for managing the network egress allowlist.
 *
 * The allowlist controls which upstream hosts the credential proxy
 * is allowed to forward requests to. Stored at
 * ~/.config/nanoclaw/egress-allowlist.json.
 *
 * Usage:
 *   npx tsx src/cli/egress-cli.ts --list
 *   npx tsx src/cli/egress-cli.ts --add api.example.com
 *   npx tsx src/cli/egress-cli.ts --add "*.googleapis.com"
 *   npx tsx src/cli/egress-cli.ts --remove api.example.com
 *   npx tsx src/cli/egress-cli.ts --test us-east5-aiplatform.googleapis.com
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  type EgressAllowlist,
  isHostAllowed,
  generateEgressAllowlistTemplate,
} from '../egress-allowlist.js';

const EGRESS_ALLOWLIST_PATH = path.join(
  os.homedir(),
  '.config',
  'nanoclaw',
  'egress-allowlist.json',
);

function loadAllowlist(): EgressAllowlist {
  if (!fs.existsSync(EGRESS_ALLOWLIST_PATH)) {
    return { allowedUpstreams: [] };
  }
  return JSON.parse(fs.readFileSync(EGRESS_ALLOWLIST_PATH, 'utf-8'));
}

function saveAllowlist(allowlist: EgressAllowlist): void {
  const dir = path.dirname(EGRESS_ALLOWLIST_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    EGRESS_ALLOWLIST_PATH,
    JSON.stringify(allowlist, null, 2) + '\n',
  );
}

function printUsage(): void {
  console.log(`
Usage:
  npx tsx src/cli/egress-cli.ts --list                 List allowed hosts
  npx tsx src/cli/egress-cli.ts --add <host>           Add a host or wildcard
  npx tsx src/cli/egress-cli.ts --remove <host>        Remove a host
  npx tsx src/cli/egress-cli.ts --test <hostname>      Test if a hostname is allowed
  npx tsx src/cli/egress-cli.ts --init                 Create template allowlist
  `.trim());
}

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  printUsage();
  process.exit(0);
}

const command = args[0];

switch (command) {
  case '--list': {
    const al = loadAllowlist();
    if (al.allowedUpstreams.length === 0) {
      console.log('No egress allowlist configured.');
      console.log(`Expected location: ${EGRESS_ALLOWLIST_PATH}`);
      console.log('Run with --init to create a template.');
    } else {
      console.log(`Egress allowlist (${EGRESS_ALLOWLIST_PATH}):\n`);
      for (const host of al.allowedUpstreams) {
        console.log(`  ${host}`);
      }
      console.log(`\n${al.allowedUpstreams.length} host(s) allowed.`);
    }
    break;
  }

  case '--add': {
    const host = args[1];
    if (!host) {
      console.error('Error: --add requires a hostname or wildcard pattern.');
      process.exit(1);
    }
    const al = loadAllowlist();
    if (al.allowedUpstreams.includes(host)) {
      console.log(`"${host}" is already in the allowlist.`);
    } else {
      al.allowedUpstreams.push(host);
      saveAllowlist(al);
      console.log(`Added "${host}" to egress allowlist.`);
    }
    break;
  }

  case '--remove': {
    const host = args[1];
    if (!host) {
      console.error('Error: --remove requires a hostname.');
      process.exit(1);
    }
    const al = loadAllowlist();
    const idx = al.allowedUpstreams.indexOf(host);
    if (idx === -1) {
      console.error(`"${host}" is not in the allowlist.`);
      process.exit(1);
    }
    al.allowedUpstreams.splice(idx, 1);
    saveAllowlist(al);
    console.log(`Removed "${host}" from egress allowlist.`);
    break;
  }

  case '--test': {
    const hostname = args[1];
    if (!hostname) {
      console.error('Error: --test requires a hostname.');
      process.exit(1);
    }
    const al = loadAllowlist();
    const allowed = isHostAllowed(hostname, al);
    if (allowed) {
      console.log(`ALLOWED: "${hostname}" matches the egress allowlist.`);
    } else {
      console.log(`BLOCKED: "${hostname}" does not match the egress allowlist.`);
      process.exit(1);
    }
    break;
  }

  case '--init': {
    if (fs.existsSync(EGRESS_ALLOWLIST_PATH)) {
      console.error(`Allowlist already exists at ${EGRESS_ALLOWLIST_PATH}`);
      console.error('Use --list to view, --add/--remove to modify.');
      process.exit(1);
    }
    const dir = path.dirname(EGRESS_ALLOWLIST_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(EGRESS_ALLOWLIST_PATH, generateEgressAllowlistTemplate() + '\n');
    console.log(`Created egress allowlist at ${EGRESS_ALLOWLIST_PATH}`);
    break;
  }

  default:
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
}
