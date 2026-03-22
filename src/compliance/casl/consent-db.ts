/**
 * NorthClaw CASL Consent Database
 *
 * SQLite-backed consent tracking for CASL compliance.
 * Every outbound commercial message must pass through this
 * before sending. No exceptions.
 *
 * Consent types:
 * - express: Recipient explicitly opted in. Never expires.
 * - implied_ebr: Existing Business Relationship. Expires 2 years from last transaction.
 * - implied_inquiry: Inquiry-based. Expires 6 months from inquiry date.
 * - implied_publication: Conspicuously published address. No expiry but must relate to role.
 *
 * CASL penalties: $10M per violation for businesses.
 * This database is the audit trail proving compliance.
 */

import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// --- Types ---

export type ConsentType =
  | "express"
  | "implied_ebr"
  | "implied_inquiry"
  | "implied_publication"
  | "none";

export type Jurisdiction = "CA" | "US" | "OTHER";

export interface ConsentRecord {
  recipientId: string;
  consentType: ConsentType;
  consentDate: string;
  consentSource: string;
  consentEvidence: string;
  expiryDate?: string | null;
  jurisdiction: Jurisdiction;
  unsubscribed: boolean;
  unsubscribeDate?: string | null;
  lastUpdated: string;
}

export interface ConsentCheckResult {
  allowed: boolean;
  recipientId: string;
  jurisdiction: Jurisdiction;
  appliedLaw: "CASL" | "CAN-SPAM" | "STRICTEST";
  consentType: ConsentType;
  reason: string;
  note?: string;
}

// --- Database ---

export class ConsentDB {
  private db: Database.Database;

  constructor(dbPath: string = "data/consent/consent.sqlite") {
    if (dbPath !== ":memory:") {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS consent (
        recipient_id TEXT PRIMARY KEY,
        consent_type TEXT NOT NULL DEFAULT 'none',
        consent_date TEXT,
        consent_source TEXT,
        consent_evidence TEXT,
        expiry_date TEXT,
        jurisdiction TEXT NOT NULL DEFAULT 'CA',
        unsubscribed INTEGER NOT NULL DEFAULT 0,
        unsubscribe_date TEXT,
        last_updated TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS consent_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_id TEXT NOT NULL,
        action TEXT NOT NULL,
        old_consent_type TEXT,
        new_consent_type TEXT,
        timestamp TEXT NOT NULL,
        source TEXT,
        evidence TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_consent_jurisdiction
        ON consent(jurisdiction);
      CREATE INDEX IF NOT EXISTS idx_consent_unsubscribed
        ON consent(unsubscribed);
      CREATE INDEX IF NOT EXISTS idx_consent_expiry
        ON consent(expiry_date);
    `);
  }

  addConsent(record: Omit<ConsentRecord, "unsubscribed" | "unsubscribeDate" | "lastUpdated">): void {
    const now = new Date().toISOString();
    const existing = this.getConsent(record.recipientId);

    const stmt = this.db.prepare(`
      INSERT INTO consent (
        recipient_id, consent_type, consent_date, consent_source,
        consent_evidence, expiry_date, jurisdiction, unsubscribed, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      ON CONFLICT(recipient_id) DO UPDATE SET
        consent_type = excluded.consent_type,
        consent_date = excluded.consent_date,
        consent_source = excluded.consent_source,
        consent_evidence = excluded.consent_evidence,
        expiry_date = excluded.expiry_date,
        jurisdiction = excluded.jurisdiction,
        last_updated = excluded.last_updated
    `);

    stmt.run(
      record.recipientId,
      record.consentType,
      record.consentDate,
      record.consentSource,
      record.consentEvidence,
      record.expiryDate || null,
      record.jurisdiction || "CA",
      now,
    );

    // Log the change
    this.db.prepare(`
      INSERT INTO consent_history (
        recipient_id, action, old_consent_type, new_consent_type,
        timestamp, source, evidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.recipientId,
      existing ? "update" : "create",
      existing?.consentType || null,
      record.consentType,
      now,
      record.consentSource,
      record.consentEvidence,
    );
  }

  getConsent(recipientId: string): ConsentRecord | null {
    const row = this.db.prepare(
      "SELECT * FROM consent WHERE recipient_id = ?"
    ).get(recipientId) as any;

    if (!row) return null;

    return {
      recipientId: row.recipient_id,
      consentType: row.consent_type,
      consentDate: row.consent_date,
      consentSource: row.consent_source,
      consentEvidence: row.consent_evidence,
      expiryDate: row.expiry_date,
      jurisdiction: row.jurisdiction,
      unsubscribed: !!row.unsubscribed,
      unsubscribeDate: row.unsubscribe_date,
      lastUpdated: row.last_updated,
    };
  }

  unsubscribe(recipientId: string): void {
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE consent
      SET unsubscribed = 1, unsubscribe_date = ?, last_updated = ?
      WHERE recipient_id = ?
    `).run(now, now, recipientId);

    this.db.prepare(`
      INSERT INTO consent_history (
        recipient_id, action, old_consent_type, new_consent_type,
        timestamp, source, evidence
      ) VALUES (?, 'unsubscribe', NULL, NULL, ?, 'recipient_request', 'unsubscribe_action')
    `).run(recipientId, now);
  }

  isExpired(record: ConsentRecord): boolean {
    if (record.consentType === "express") return false;
    if (record.consentType === "implied_publication") return false;
    if (!record.expiryDate) return false;
    return new Date(record.expiryDate) < new Date();
  }

  getExpiringConsents(withinDays: number = 30): ConsentRecord[] {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    const rows = this.db.prepare(`
      SELECT * FROM consent
      WHERE expiry_date IS NOT NULL
        AND expiry_date <= ?
        AND expiry_date > datetime('now')
        AND unsubscribed = 0
        AND consent_type LIKE 'implied_%'
    `).all(futureDate.toISOString()) as any[];

    return rows.map(this.rowToRecord);
  }

  getHistory(recipientId: string): any[] {
    return this.db.prepare(
      "SELECT * FROM consent_history WHERE recipient_id = ? ORDER BY timestamp DESC"
    ).all(recipientId);
  }

  getStats(): { total: number; express: number; implied: number; unsubscribed: number; expired: number } {
    const total = (this.db.prepare("SELECT COUNT(*) as c FROM consent").get() as any).c;
    const express = (this.db.prepare("SELECT COUNT(*) as c FROM consent WHERE consent_type = 'express'").get() as any).c;
    const implied = (this.db.prepare("SELECT COUNT(*) as c FROM consent WHERE consent_type LIKE 'implied_%'").get() as any).c;
    const unsubscribed = (this.db.prepare("SELECT COUNT(*) as c FROM consent WHERE unsubscribed = 1").get() as any).c;
    const expired = (this.db.prepare("SELECT COUNT(*) as c FROM consent WHERE expiry_date IS NOT NULL AND expiry_date < datetime('now') AND consent_type LIKE 'implied_%'").get() as any).c;
    return { total, express, implied, unsubscribed, expired };
  }

  close(): void {
    this.db.close();
  }

  private rowToRecord(row: any): ConsentRecord {
    return {
      recipientId: row.recipient_id,
      consentType: row.consent_type,
      consentDate: row.consent_date,
      consentSource: row.consent_source,
      consentEvidence: row.consent_evidence,
      expiryDate: row.expiry_date,
      jurisdiction: row.jurisdiction,
      unsubscribed: !!row.unsubscribed,
      unsubscribeDate: row.unsubscribe_date,
      lastUpdated: row.last_updated,
    };
  }
}
