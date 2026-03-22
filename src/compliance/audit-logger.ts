/**
 * NorthClaw Audit Logger
 *
 * Append-only, hash-chained audit log for every agent action.
 * Stored OUTSIDE container reach. Agents cannot read or modify this.
 *
 * Hash chain: each entry includes the hash of the previous entry.
 * If anyone modifies a historical record, all subsequent hashes break.
 * Verification can detect tampering with a single pass through the log.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// --- Types ---

export interface AuditEvent {
  type:
    | "message_sent"
    | "message_blocked"
    | "file_read"
    | "file_write"
    | "api_call"
    | "consent_check"
    | "consent_update"
    | "unsubscribe"
    | "decision_made"
    | "human_approval"
    | "container_start"
    | "container_stop"
    | "container_timeout"
    | "egress_blocked"
    | "egress_allowed"
    | "error";
  groupId: string;
  agentId?: string;
  target?: string;
  detail?: string;
  result?: "success" | "blocked" | "error" | "timeout" | "approved" | "rejected";
  tokensUsed?: number;
  piiDetected?: boolean;
}

interface AuditRecord extends AuditEvent {
  id: number;
  timestamp: string;
  prevHash: string;
  hash: string;
}

// --- Logger ---

export class AuditLogger {
  private logPath: string;
  private prevHash: string = "0".repeat(64);
  private nextId: number = 1;

  constructor(logDir: string = "data/audit") {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    this.logPath = path.join(logDir, "audit.jsonl");
    this.loadLastHash();
  }

  /**
   * Read the last entry to resume the hash chain after restart.
   */
  private loadLastHash(): void {
    if (!fs.existsSync(this.logPath)) return;

    const content = fs.readFileSync(this.logPath, "utf-8").trim();
    if (!content) return;

    const lines = content.split("\n");
    const lastLine = lines[lines.length - 1];
    try {
      const last = JSON.parse(lastLine) as AuditRecord;
      this.prevHash = last.hash;
      this.nextId = last.id + 1;
    } catch {
      // Corrupted last line. Start fresh chain segment.
      this.prevHash = "CHAIN_BREAK_" + new Date().toISOString();
    }
  }

  /**
   * Log an event. Returns the audit record with hash.
   */
  log(event: AuditEvent): AuditRecord {
    const record: AuditRecord = {
      ...event,
      id: this.nextId++,
      timestamp: new Date().toISOString(),
      prevHash: this.prevHash,
      hash: "", // computed below
    };

    // Hash = SHA-256(prevHash + JSON of record without hash field)
    const { hash: _, ...hashable } = record;
    const payload = JSON.stringify(hashable);
    record.hash = crypto.createHash("sha256").update(this.prevHash + payload).digest("hex");
    this.prevHash = record.hash;

    // Append to log file
    fs.appendFileSync(this.logPath, JSON.stringify(record) + "\n");

    return record;
  }

  /**
   * Verify the integrity of the entire audit log.
   * Returns the first broken entry or null if chain is intact.
   */
  verify(): { valid: boolean; brokenAt?: number; expected?: string; found?: string } {
    if (!fs.existsSync(this.logPath)) return { valid: true };

    const content = fs.readFileSync(this.logPath, "utf-8").trim();
    if (!content) return { valid: true };

    const lines = content.split("\n");
    let expectedPrevHash = "0".repeat(64);

    for (const line of lines) {
      let record: AuditRecord;
      try {
        record = JSON.parse(line);
      } catch {
        return { valid: false, brokenAt: -1 };
      }

      // Check prevHash links to previous record's hash
      if (record.prevHash !== expectedPrevHash && !record.prevHash.startsWith("CHAIN_BREAK_")) {
        return {
          valid: false,
          brokenAt: record.id,
          expected: expectedPrevHash,
          found: record.prevHash,
        };
      }

      // Recompute hash and verify
      const { hash: storedHash, ...hashable } = record;
      const payload = JSON.stringify(hashable);
      const computedHash = crypto.createHash("sha256").update(record.prevHash + payload).digest("hex");

      if (computedHash !== storedHash) {
        return {
          valid: false,
          brokenAt: record.id,
          expected: computedHash,
          found: storedHash,
        };
      }

      expectedPrevHash = record.hash;
    }

    return { valid: true };
  }

  /**
   * Get recent entries for a specific group. Used in daily briefings.
   */
  getRecent(groupId: string, limit: number = 50): AuditRecord[] {
    if (!fs.existsSync(this.logPath)) return [];

    const content = fs.readFileSync(this.logPath, "utf-8").trim();
    if (!content) return [];

    return content
      .split("\n")
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter((r): r is AuditRecord => r !== null && r.groupId === groupId)
      .slice(-limit);
  }

  /**
   * Get summary stats for reporting.
   */
  getStats(sinceDate?: string): Record<string, number> {
    if (!fs.existsSync(this.logPath)) return {};

    const content = fs.readFileSync(this.logPath, "utf-8").trim();
    if (!content) return {};

    const counts: Record<string, number> = {};

    for (const line of content.split("\n")) {
      try {
        const record = JSON.parse(line) as AuditRecord;
        if (sinceDate && record.timestamp < sinceDate) continue;
        counts[record.type] = (counts[record.type] || 0) + 1;
      } catch {
        continue;
      }
    }

    return counts;
  }
}
