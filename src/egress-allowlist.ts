/**
 * Egress allowlist for the credential proxy.
 *
 * Controls which upstream hosts the credential proxy is allowed to forward
 * requests to. Stored at ~/.config/nanoclaw/egress-allowlist.json — outside
 * the project root so containers cannot read or modify it.
 *
 * Supports wildcard patterns (e.g., *.googleapis.com) for Vertex AI endpoints
 * that vary by region.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

import { logger } from './logger.js';

export interface EgressAllowlist {
  allowedUpstreams: string[];
}

const EGRESS_ALLOWLIST_PATH = path.join(
  os.homedir(),
  '.config',
  'nanoclaw',
  'egress-allowlist.json',
);

let cachedAllowlist: EgressAllowlist | null = null;

/**
 * Load the egress allowlist from disk. Returns null if the file doesn't exist
 * (in which case the proxy only forwards to its configured upstream).
 */
export function loadEgressAllowlist(): EgressAllowlist | null {
  if (cachedAllowlist) return cachedAllowlist;

  if (!fs.existsSync(EGRESS_ALLOWLIST_PATH)) {
    logger.debug('No egress allowlist found, using default (upstream only)');
    return null;
  }

  try {
    const raw = fs.readFileSync(EGRESS_ALLOWLIST_PATH, 'utf-8');
    cachedAllowlist = JSON.parse(raw) as EgressAllowlist;
    logger.info(
      { count: cachedAllowlist.allowedUpstreams.length },
      'Egress allowlist loaded',
    );
    return cachedAllowlist;
  } catch (err) {
    logger.error({ err }, 'Failed to load egress allowlist');
    return null;
  }
}

/**
 * Check if a hostname is allowed by the egress allowlist.
 * Supports wildcard patterns: *.googleapis.com matches
 * us-east5-aiplatform.googleapis.com.
 *
 * If no allowlist is configured, only the configured upstream
 * (ANTHROPIC_BASE_URL) is allowed — enforced by the proxy itself.
 */
export function isHostAllowed(
  hostname: string,
  allowlist: EgressAllowlist | null,
): boolean {
  if (!allowlist) return false;

  const lower = hostname.toLowerCase();
  for (const pattern of allowlist.allowedUpstreams) {
    const p = pattern.toLowerCase();
    if (p === lower) return true;

    // Wildcard matching: *.example.com matches sub.example.com
    if (p.startsWith('*.')) {
      const suffix = p.slice(1); // .example.com
      if (lower.endsWith(suffix) && lower.length > suffix.length) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Generate a template egress allowlist for first-time setup.
 */
export function generateEgressAllowlistTemplate(): string {
  return JSON.stringify(
    {
      allowedUpstreams: [
        'api.anthropic.com',
        '*.aiplatform.googleapis.com',
      ],
      _comment:
        'Hosts the credential proxy is allowed to forward to. Supports wildcards.',
    },
    null,
    2,
  );
}
