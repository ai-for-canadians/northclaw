/**
 * NorthClaw CASL Consent Gate
 *
 * Every outbound message passes through this gate before sending.
 * It runs on the HOST process, outside agent containers.
 * A compromised agent cannot bypass this check.
 *
 * Logic:
 * 1. Classify message as commercial or transactional
 * 2. Detect recipient jurisdiction (CA/US/other)
 * 3. Apply jurisdiction-appropriate consent rules
 * 4. Block or allow with full audit trail
 * 5. Inject required identification fields
 */

import { ConsentDB, ConsentRecord, ConsentCheckResult, Jurisdiction } from "./consent-db.js";

// --- Message Classification ---

interface OutboundMessage {
  recipient: string;
  subject?: string;
  body: string;
  channel: "email" | "slack" | "telegram" | "discord";
  groupId: string;
  agentId?: string;
}

interface GateResult extends ConsentCheckResult {
  injectedFields?: {
    senderName: string;
    mailingAddress: string;
    contactMethod: string;
    unsubscribeUrl: string;
  };
}

// Words/patterns that signal commercial intent
const COMMERCIAL_SIGNALS = [
  "buy", "purchase", "order", "sale", "discount", "promo",
  "offer", "deal", "pricing", "subscribe", "sign up",
  "free trial", "limited time", "act now", "special",
  "consultation", "demo", "schedule a call", "book a meeting",
  "our services", "we can help", "proposal", "quote",
];

// Transactional patterns (exempt from consent but still need ID + unsubscribe)
const TRANSACTIONAL_SIGNALS = [
  "your invoice", "your receipt", "order confirmation",
  "delivery update", "account update", "password reset",
  "appointment reminder", "meeting confirmed", "project update",
  "status update", "your report is ready",
];

export class ConsentGate {
  private db: ConsentDB;
  private senderConfig: {
    senderName: string;
    mailingAddress: string;
    contactMethod: string;
    unsubscribeBaseUrl: string;
  };

  constructor(db: ConsentDB, senderConfig?: typeof ConsentGate.prototype.senderConfig) {
    this.db = db;
    this.senderConfig = senderConfig || {
      senderName: process.env.NORTHCLAW_SENDER_NAME || "NorthClaw Agent",
      mailingAddress: process.env.NORTHCLAW_MAILING_ADDRESS || "",
      contactMethod: process.env.NORTHCLAW_CONTACT_URL || "",
      unsubscribeBaseUrl: process.env.NORTHCLAW_UNSUBSCRIBE_URL || "",
    };
  }

  /**
   * Main entry point. Call this before every outbound message.
   * Returns allowed:true or allowed:false with reason.
   */
  async check(message: OutboundMessage): Promise<GateResult> {
    const messageType = this.classifyMessage(message);
    const jurisdiction = this.detectJurisdiction(message.recipient);

    // Transactional messages: always allowed but still need ID fields
    if (messageType === "transactional") {
      return {
        allowed: true,
        recipientId: message.recipient,
        jurisdiction,
        appliedLaw: jurisdiction === "CA" ? "CASL" : "CAN-SPAM",
        consentType: "none",
        reason: "Transactional message (exempt from consent requirement)",
        note: "Identification and unsubscribe mechanism still required under CASL s.6(2)",
        injectedFields: this.buildInjectedFields(message.recipient),
      };
    }

    // US recipients: CAN-SPAM applies (opt-out model, no prior consent needed)
    if (jurisdiction === "US") {
      return {
        allowed: true,
        recipientId: message.recipient,
        jurisdiction: "US",
        appliedLaw: "CAN-SPAM",
        consentType: "none",
        reason: "US recipient: CAN-SPAM opt-out model applies. No prior consent required.",
        note: "Must include sender ID, physical address, and unsubscribe mechanism",
        injectedFields: this.buildInjectedFields(message.recipient),
      };
    }

    // Canadian recipients (or ambiguous): Full CASL compliance
    const consent = this.db.getConsent(message.recipient);

    // No consent record at all
    if (!consent) {
      return {
        allowed: false,
        recipientId: message.recipient,
        jurisdiction,
        appliedLaw: "CASL",
        consentType: "none",
        reason: `No consent record found for ${message.recipient}. CASL requires express or implied consent before sending commercial messages to Canadian recipients.`,
      };
    }

    // Unsubscribed: blocked regardless of consent type
    if (consent.unsubscribed) {
      return {
        allowed: false,
        recipientId: message.recipient,
        jurisdiction,
        appliedLaw: "CASL",
        consentType: consent.consentType,
        reason: `Recipient unsubscribed on ${consent.unsubscribeDate}. CASL s.11: must stop sending within 10 business days of unsubscribe request.`,
      };
    }

    // Expired implied consent
    if (this.db.isExpired(consent)) {
      return {
        allowed: false,
        recipientId: message.recipient,
        jurisdiction,
        appliedLaw: "CASL",
        consentType: consent.consentType,
        reason: `Implied consent expired on ${consent.expiryDate}. Original consent type: ${consent.consentType}. Must obtain express consent to continue sending.`,
      };
    }

    // Valid consent exists
    return {
      allowed: true,
      recipientId: message.recipient,
      jurisdiction,
      appliedLaw: "CASL",
      consentType: consent.consentType,
      reason: `Valid ${consent.consentType} consent from ${consent.consentDate}. Source: ${consent.consentSource}.`,
      injectedFields: this.buildInjectedFields(message.recipient),
    };
  }

  /**
   * Classify message as commercial or transactional.
   * When in doubt, classify as commercial (safer under CASL).
   */
  classifyMessage(message: OutboundMessage): "commercial" | "transactional" {
    const text = `${message.subject || ""} ${message.body}`.toLowerCase();

    // Check transactional signals first
    const transactionalScore = TRANSACTIONAL_SIGNALS.reduce(
      (score, signal) => score + (text.includes(signal) ? 1 : 0),
      0,
    );

    const commercialScore = COMMERCIAL_SIGNALS.reduce(
      (score, signal) => score + (text.includes(signal) ? 1 : 0),
      0,
    );

    // If clearly transactional and not commercial
    if (transactionalScore > 0 && commercialScore === 0) return "transactional";

    // Default to commercial (CASL-safe: commercial requires consent, transactional doesn't)
    return "commercial";
  }

  /**
   * Detect jurisdiction from recipient address.
   * Defaults to CA (strictest) when ambiguous.
   */
  detectJurisdiction(recipient: string): Jurisdiction {
    const lower = recipient.toLowerCase();

    // Check consent DB for stored jurisdiction
    const consent = this.db.getConsent(recipient);
    if (consent?.jurisdiction) return consent.jurisdiction;

    // Canadian TLD
    if (lower.endsWith(".ca") || lower.endsWith(".gc.ca")) return "CA";

    // US TLDs and common US domains
    if (lower.endsWith(".us") || lower.endsWith(".gov") || lower.endsWith(".mil")) return "US";

    // Common US email providers (not definitive but useful signal)
    const usDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"];
    const domain = lower.split("@")[1];

    // For generic domains, default to CA (strictest)
    // This is deliberately conservative. Better to over-comply than under-comply.
    if (usDomains.includes(domain)) return "OTHER"; // Can't determine, apply CASL

    return "CA"; // Default: apply CASL (strictest)
  }

  /**
   * Build the required CASL identification fields for injection into messages.
   * CASL s.6(2): Every CEM must include sender ID, mailing address,
   * contact method, and unsubscribe mechanism.
   */
  private buildInjectedFields(recipientId: string) {
    return {
      senderName: this.senderConfig.senderName,
      mailingAddress: this.senderConfig.mailingAddress,
      contactMethod: this.senderConfig.contactMethod,
      unsubscribeUrl: `${this.senderConfig.unsubscribeBaseUrl}?id=${encodeURIComponent(recipientId)}`,
    };
  }

  /**
   * Get consents expiring soon. Use in daily briefings to prompt
   * conversion from implied to express consent.
   */
  getExpiringConsents(withinDays: number = 30) {
    return this.db.getExpiringConsents(withinDays);
  }

  /**
   * Process unsubscribe request. CASL requires processing within 10 business days.
   * NorthClaw targets same-day processing.
   */
  processUnsubscribe(recipientId: string): void {
    this.db.unsubscribe(recipientId);
  }
}
