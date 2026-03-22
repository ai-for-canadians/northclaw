/**
 * NorthClaw Slack Channel Adapter
 *
 * Uses Slack Socket Mode — no public URL or ngrok needed.
 * Conforms to NanoClaw's Channel interface and self-registers
 * via the channel registry.
 *
 * Consent gate logic is NOT in this adapter — it lives in the
 * centralized outbound path (src/outbound.ts). This adapter
 * only handles inbound message delivery and outbound sendMessage.
 *
 * Setup: Run `/add-slack` in Claude Code to configure.
 * Requires: SLACK_BOT_TOKEN and SLACK_APP_TOKEN env vars.
 */

import https from 'node:https';
import { WebSocket } from 'ws';

import { logger } from '../logger.js';
import { Channel, NewMessage } from '../types.js';
import { registerChannel, ChannelOpts } from './registry.js';
import { readEnvFile } from '../env.js';

// --- Types ---

interface SlackMessage {
  type: string;
  subtype?: string;
  channel: string;
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
}

interface SlackEnvelope {
  envelope_id: string;
  type: string;
  payload: {
    event?: SlackMessage;
    [key: string]: unknown;
  };
}

// --- Slack API Helpers ---

function slackApi(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      `https://slack.com/api/${method}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(
              new Error(`Slack API parse error: ${raw.slice(0, 200)}`),
            );
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function openSocketConnection(appToken: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({});
    const req = https.request(
      'https://slack.com/api/apps.connections.open',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appToken}`,
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.ok && parsed.url) resolve(parsed.url as string);
            else
              reject(
                new Error(`Socket open failed: ${raw.slice(0, 200)}`),
              );
          } catch {
            reject(new Error('Socket open parse error'));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// --- JID Convention ---
// Slack JIDs use the format: slack:<channel_id>
// e.g., slack:C0123456789

function slackJid(channelId: string): string {
  return `slack:${channelId}`;
}

function channelIdFromJid(jid: string): string | null {
  if (!jid.startsWith('slack:')) return null;
  return jid.slice('slack:'.length);
}

// --- Channel Implementation ---

function createSlackChannel(opts: ChannelOpts): Channel | null {
  const secrets = readEnvFile(['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN']);
  const botToken = secrets.SLACK_BOT_TOKEN;
  const appToken = secrets.SLACK_APP_TOKEN;

  if (!botToken || !appToken) return null;

  let ws: WebSocket | null = null;
  let connected = false;
  let botUserId = '';
  let reconnectAttempts = 0;
  const maxReconnects = 10;
  // Track known channel IDs for ownsJid
  const knownChannels = new Set<string>();

  async function connectSocket(): Promise<void> {
    const wsUrl = await openSocketConnection(appToken);
    ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      reconnectAttempts = 0;
      connected = true;
      logger.info('Slack Socket Mode connected');
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const envelope: SlackEnvelope = JSON.parse(data.toString());

        // Acknowledge immediately (Slack requires within 3 seconds)
        if (envelope.envelope_id) {
          ws?.send(JSON.stringify({ envelope_id: envelope.envelope_id }));
        }

        if (envelope.type === 'events_api' && envelope.payload.event) {
          await handleEvent(envelope.payload.event as SlackMessage);
        }
      } catch (err) {
        logger.error({ err }, 'Slack message processing error');
      }
    });

    ws.on('close', () => {
      connected = false;
      logger.warn('Slack socket closed, reconnecting');
      reconnect();
    });

    ws.on('error', (err) => {
      logger.error({ err }, 'Slack socket error');
    });
  }

  function reconnect(): void {
    if (reconnectAttempts >= maxReconnects) {
      logger.error('Slack max reconnection attempts reached');
      return;
    }
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    logger.info(
      { delay, attempt: reconnectAttempts },
      'Slack reconnecting',
    );
    setTimeout(() => connectSocket(), delay);
  }

  async function handleEvent(event: SlackMessage): Promise<void> {
    // Ignore bot's own messages
    if (event.user === botUserId) return;
    // Ignore subtypes (edits, joins, etc.)
    if (event.subtype) return;
    // Only handle message events with text
    if (event.type !== 'message' || !event.text) return;

    const jid = slackJid(event.channel);
    knownChannels.add(event.channel);

    // Deliver inbound message via NanoClaw's standard callback
    const msg: NewMessage = {
      id: event.ts, // Slack uses ts as unique message ID
      chat_jid: jid,
      sender: event.user,
      sender_name: event.user, // Slack user ID; name resolution deferred
      content: event.text,
      timestamp: new Date(parseFloat(event.ts) * 1000).toISOString(),
      is_from_me: false,
      is_bot_message: false,
    };

    opts.onChatMetadata(jid, msg.timestamp, undefined, 'slack', true);
    opts.onMessage(jid, msg);
  }

  const channel: Channel = {
    name: 'slack',

    async connect(): Promise<void> {
      // Get bot user ID to ignore own messages
      const auth = (await slackApi(botToken, 'auth.test', {})) as {
        ok: boolean;
        user_id?: string;
      };
      if (auth.ok && auth.user_id) botUserId = auth.user_id;

      await connectSocket();
      logger.info('Slack channel connected');
    },

    async sendMessage(jid: string, text: string): Promise<void> {
      const channelId = channelIdFromJid(jid);
      if (!channelId) {
        throw new Error(`Invalid Slack JID: ${jid}`);
      }
      await slackApi(botToken, 'chat.postMessage', {
        channel: channelId,
        text,
      });
    },

    isConnected(): boolean {
      return connected;
    },

    ownsJid(jid: string): boolean {
      return jid.startsWith('slack:');
    },

    async disconnect(): Promise<void> {
      if (ws) {
        ws.close();
        ws = null;
      }
      connected = false;
      logger.info('Slack channel disconnected');
    },

    async setTyping(jid: string, _isTyping: boolean): Promise<void> {
      // Slack doesn't have a direct typing indicator API for bots.
      // We could use reactions as a thinking indicator but that's
      // handled at a higher level if needed.
      void jid;
    },
  };

  return channel;
}

// Self-register when this module is imported
registerChannel('slack', createSlackChannel);
