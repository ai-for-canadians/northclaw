/**
 * Centralized outbound message path.
 *
 * Every outbound message in NanoClaw passes through this module.
 * It applies CASL consent checks, audit logging, and message formatting
 * before delivering via the appropriate channel.
 *
 * The consent gate runs on the HOST process, outside agent containers.
 * A compromised agent cannot bypass this check.
 *
 * Consent mode (NORTHCLAW_CONSENT_MODE env var):
 * - "log-only" (default): logs consent check results but always delivers
 * - "strict": blocks messages that fail consent checks
 */

import { AuditLogger } from './compliance/audit-logger.js';
import {
  ConsentGate,
  type OutboundMessage,
} from './compliance/casl/consent-gate.js';
import { logger } from './logger.js';
import { findChannel, formatOutbound } from './router.js';
import { Channel } from './types.js';

// --- Module state (set via initOutbound) ---

let _channels: Channel[] = [];
let _gate: ConsentGate | null = null;
let _audit: AuditLogger | null = null;

const consentMode: 'log-only' | 'strict' =
  (process.env.NORTHCLAW_CONSENT_MODE as 'log-only' | 'strict') || 'log-only';

/**
 * Initialize the outbound module. Must be called from main() after
 * channels are connected and compliance modules are created.
 */
export function initOutbound(
  channels: Channel[],
  gate: ConsentGate,
  audit: AuditLogger,
): void {
  _channels = channels;
  _gate = gate;
  _audit = audit;
  logger.info({ consentMode }, 'Outbound module initialized');
}

export type OutboundSource =
  | 'agent'
  | 'scheduler'
  | 'ipc'
  | 'remote-control';

/**
 * Send an outbound message through the consent gate and audit logger.
 *
 * All outbound paths in NanoClaw must call this function instead of
 * channel.sendMessage() directly.
 */
export async function sendOutbound(
  jid: string,
  rawText: string,
  source: OutboundSource,
  groupId: string,
): Promise<void> {
  const text = formatOutbound(rawText);
  if (!text) return;

  const channel = findChannel(_channels, jid);
  if (!channel) {
    logger.warn({ jid, source }, 'No channel for JID, cannot send message');
    return;
  }

  // Run consent check if gate is initialized
  if (_gate) {
    const outbound: OutboundMessage = {
      recipient: jid,
      body: text,
      channel: detectChannelType(channel.name),
      groupId,
    };

    const result = await _gate.check(outbound);

    _audit?.log({
      type: result.allowed ? 'consent_check' : 'message_blocked',
      groupId,
      target: jid,
      detail: result.reason,
      result: result.allowed ? 'success' : 'blocked',
    });

    if (!result.allowed) {
      if (consentMode === 'strict') {
        logger.warn(
          { jid, source, reason: result.reason },
          'Outbound message blocked by consent gate',
        );
        return;
      }
      // log-only mode: log the block but deliver anyway
      logger.info(
        { jid, source, reason: result.reason },
        'Consent gate would block (log-only mode, delivering anyway)',
      );
    }
  }

  await channel.sendMessage(jid, text);

  _audit?.log({
    type: 'message_sent',
    groupId,
    target: jid,
    detail: `${source}: ${text.length} chars`,
    result: 'success',
  });
}

/**
 * Map NanoClaw channel name to consent gate channel type.
 */
function detectChannelType(
  channelName: string,
): 'email' | 'slack' | 'telegram' | 'discord' {
  switch (channelName) {
    case 'slack':
      return 'slack';
    case 'telegram':
      return 'telegram';
    case 'discord':
      return 'discord';
    case 'gmail':
      return 'email';
    default:
      // Default to slack for unknown channel types
      return 'slack';
  }
}
