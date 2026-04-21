/**
 * NorthClaw Observability Dashboard — read-only Express server.
 *
 * Binds to 127.0.0.1:8088 only (never 0.0.0.0).
 * Opens all databases with { readonly: true }.
 * No writes. No auth (local-only by design).
 *
 * Does NOT touch: credential-proxy, consent-gate, outbound, or container lifecycle.
 */

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import Database from 'better-sqlite3';

import { getSecurityProfile, getEffectiveAllowlist } from '../security/security-profiles.js';

export const DASHBOARD_HOST = '127.0.0.1';
export const DASHBOARD_PORT = 8088;
export const DASHBOARD_URL = `http://${DASHBOARD_HOST}:${DASHBOARD_PORT}`;

const AUDIT_LOG = path.join(process.cwd(), 'data', 'audit', 'audit.jsonl');
const CONSENT_DB = path.join(process.cwd(), 'data', 'consent', 'consent.sqlite');
const COST_DB = path.join(process.cwd(), 'data', 'cost', 'usage.sqlite');
const UI_DIST = path.join(process.cwd(), 'src', 'dashboard', 'ui', 'dist');

function readAuditTail(limit: number): unknown[] {
  if (!fs.existsSync(AUDIT_LOG)) return [];
  const content = fs.readFileSync(AUDIT_LOG, 'utf-8').trim();
  if (!content) return [];
  return content
    .split('\n')
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter((e): e is unknown => e !== null)
    .slice(-limit);
}

export function startDashboard(): void {
  const app = express();

  // Serve static UI files
  if (fs.existsSync(UI_DIST)) {
    app.use(express.static(UI_DIST));
  }

  // ── GET /api/audit/recent?limit=100 ──────────────────────────────────────
  app.get('/api/audit/recent', (req, res) => {
    const raw = parseInt(String(req.query.limit ?? '100'), 10);
    const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 1000) : 100;
    res.json(readAuditTail(limit));
  });

  // ── GET /api/audit/stream (SSE) ───────────────────────────────────────────
  app.get('/api/audit/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Start at end of file so we only stream new entries
    let position = fs.existsSync(AUDIT_LOG)
      ? fs.statSync(AUDIT_LOG).size
      : 0;

    const send = () => {
      try {
        if (!fs.existsSync(AUDIT_LOG)) return;
        const { size } = fs.statSync(AUDIT_LOG);
        if (size <= position) return;

        const length = size - position;
        const buf = Buffer.alloc(length);
        const fd = fs.openSync(AUDIT_LOG, 'r');
        fs.readSync(fd, buf, 0, length, position);
        fs.closeSync(fd);
        position = size;

        for (const line of buf.toString('utf-8').split('\n')) {
          if (line.trim()) res.write(`data: ${line}\n\n`);
        }
      } catch {
        // File may have been rotated; reset position
        position = 0;
      }
    };

    const timer = setInterval(send, 500);
    req.on('close', () => clearInterval(timer));
  });

  // ── GET /api/consent/summary ──────────────────────────────────────────────
  app.get('/api/consent/summary', (_req, res) => {
    if (!fs.existsSync(CONSENT_DB)) {
      res.json({ available: false, data: [] });
      return;
    }
    const db = new Database(CONSENT_DB, { readonly: true });
    try {
      const data = db
        .prepare(
          `SELECT jurisdiction,
                  consent_type,
                  COUNT(*) AS count,
                  SUM(CASE WHEN unsubscribed = 1 THEN 1 ELSE 0 END) AS unsubscribed,
                  SUM(CASE WHEN expiry_date IS NOT NULL
                            AND expiry_date < datetime('now')
                            AND consent_type LIKE 'implied_%' THEN 1 ELSE 0 END) AS expired
           FROM consent
           GROUP BY jurisdiction, consent_type
           ORDER BY jurisdiction, consent_type`,
        )
        .all();
      res.json({ available: true, data });
    } finally {
      db.close();
    }
  });

  // ── GET /api/costs/by-group ───────────────────────────────────────────────
  app.get('/api/costs/by-group', (_req, res) => {
    if (!fs.existsSync(COST_DB)) {
      res.json({ available: false, thisMonth: [], allTime: null });
      return;
    }
    const db = new Database(COST_DB, { readonly: true });
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const thisMonth = db
        .prepare(
          `SELECT group_id AS groupId,
                  ROUND(SUM(estimated_cost_usd), 4) AS totalUsd,
                  SUM(input_tokens)  AS inputTokens,
                  SUM(output_tokens) AS outputTokens,
                  COUNT(*) AS requests
           FROM usage
           WHERE timestamp >= ?
           GROUP BY group_id
           ORDER BY totalUsd DESC`,
        )
        .all(startOfMonth.toISOString());

      const allTime = db
        .prepare(
          `SELECT ROUND(SUM(estimated_cost_usd), 4) AS totalUsd,
                  SUM(input_tokens + output_tokens)  AS totalTokens
           FROM usage`,
        )
        .get() as { totalUsd: number; totalTokens: number } | undefined;

      res.json({ available: true, thisMonth, allTime });
    } finally {
      db.close();
    }
  });

  // ── GET /api/security/profile ─────────────────────────────────────────────
  app.get('/api/security/profile', (_req, res) => {
    const profile = getSecurityProfile();
    const effectiveAllowlist = getEffectiveAllowlist();

    // Read user's custom egress allowlist (supports both northclaw/nanoclaw paths)
    let userAllowlist: string[] = [];
    for (const dir of ['northclaw', 'nanoclaw']) {
      const p = path.join(os.homedir(), '.config', dir, 'egress-allowlist.json');
      if (fs.existsSync(p)) {
        try {
          const data = JSON.parse(fs.readFileSync(p, 'utf-8')) as { allowedUpstreams?: string[] };
          userAllowlist = data.allowedUpstreams ?? [];
          break;
        } catch {
          // malformed file — skip
        }
      }
    }

    res.json({
      profile: profile.name,
      description: profile.description,
      effectiveAllowlist,
      userAllowlist,
    });
  });

  // ── SPA catch-all ─────────────────────────────────────────────────────────
  app.get('*', (_req, res) => {
    const indexPath = path.join(UI_DIST, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send(
        '<!doctype html><html><body>' +
          '<h2>Dashboard UI not built</h2>' +
          '<p>Run <code>npm run dashboard:build</code> first.</p>' +
          '</body></html>',
      );
    }
  });

  app.listen(DASHBOARD_PORT, DASHBOARD_HOST, () => {
    console.log(`\nNorthClaw Dashboard → ${DASHBOARD_URL}\n`);
  });
}
