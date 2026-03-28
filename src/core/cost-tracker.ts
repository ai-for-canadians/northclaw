/**
 * NorthClaw Cost Tracker
 *
 * Estimates API token usage and cost per request.
 * Reads response headers from the credential proxy to extract token counts.
 * Stores running totals per group in SQLite.
 *
 * Token-efficient: no external dependencies beyond better-sqlite3.
 */

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Pricing per million tokens (as of March 2026, Claude Sonnet 4)
const PRICING = {
  "claude-sonnet-4": { input: 3.0, output: 15.0 },
  "claude-opus-4": { input: 15.0, output: 75.0 },
  "claude-haiku-4": { input: 0.8, output: 4.0 },
  default: { input: 3.0, output: 15.0 },
};

interface UsageRecord {
  groupId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  timestamp: string;
}

export class CostTracker {
  private db: Database.Database;

  constructor(dbPath: string = "data/cost/usage.sqlite") {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        estimated_cost_usd REAL NOT NULL,
        timestamp TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_usage_group ON usage(group_id);
      CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage(timestamp);
    `);
  }

  /**
   * Record a single API call's token usage.
   * Call this from the credential proxy after each response.
   */
  record(
    groupId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): void {
    const pricing =
      PRICING[model as keyof typeof PRICING] || PRICING.default;
    const cost =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;

    this.db
      .prepare(
        `INSERT INTO usage (group_id, model, input_tokens, output_tokens, estimated_cost_usd, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        groupId,
        model,
        inputTokens,
        outputTokens,
        Math.round(cost * 10000) / 10000,
        new Date().toISOString(),
      );
  }

  /**
   * Get total spend for a group this month.
   */
  getMonthlySpend(groupId?: string): { totalUsd: number; totalTokens: number } {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const query = groupId
      ? `SELECT COALESCE(SUM(estimated_cost_usd), 0) as total_usd,
                COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
         FROM usage WHERE group_id = ? AND timestamp >= ?`
      : `SELECT COALESCE(SUM(estimated_cost_usd), 0) as total_usd,
                COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
         FROM usage WHERE timestamp >= ?`;

    const row = groupId
      ? (this.db.prepare(query).get(groupId, startOfMonth.toISOString()) as any)
      : (this.db.prepare(query).get(startOfMonth.toISOString()) as any);

    return {
      totalUsd: Math.round(row.total_usd * 100) / 100,
      totalTokens: row.total_tokens,
    };
  }

  /**
   * Get spend breakdown by group for current month.
   */
  getSpendByGroup(): Array<{ groupId: string; totalUsd: number; requests: number }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return this.db
      .prepare(
        `SELECT group_id as groupId,
              ROUND(SUM(estimated_cost_usd), 2) as totalUsd,
              COUNT(*) as requests
       FROM usage WHERE timestamp >= ?
       GROUP BY group_id ORDER BY totalUsd DESC`,
      )
      .all(startOfMonth.toISOString()) as any[];
  }

  close(): void {
    this.db.close();
  }
}
