/**
 * NorthClaw Security Profiles
 *
 * Three tiers controlling network egress and agent capabilities.
 * Set via NORTHCLAW_SECURITY_PROFILE in .env
 *
 * locked    - No egress. Maximum security. For regulated clients.
 * selective - Egress through proxy with domain allowlist. Default.
 * open      - Full internet. For development/testing. Logged as reduced security.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export type SecurityProfile = "locked" | "selective" | "open";

interface ProfileConfig {
  name: SecurityProfile;
  useInternalNetwork: boolean;
  defaultAllowlist: string[];
  description: string;
}

const PROFILES: Record<SecurityProfile, ProfileConfig> = {
  locked: {
    name: "locked",
    useInternalNetwork: true,
    defaultAllowlist: ["api.anthropic.com"],
    description: "No web access. Agents can only reach the AI inference endpoint.",
  },
  selective: {
    name: "selective",
    useInternalNetwork: true,
    defaultAllowlist: [
      "api.anthropic.com",
      "www.google.com",
      "www.bing.com",
      "en.wikipedia.org",
      "www.linkedin.com",
      "api.linkedin.com",
      "github.com",
      "api.github.com",
    ],
    description:
      "Web access through proxy with domain allowlist. Add domains with /egress add.",
  },
  open: {
    name: "open",
    useInternalNetwork: false,
    defaultAllowlist: [],
    description:
      "Full internet access. No egress filtering. For development only. All activity logged.",
  },
};

/**
 * Get the active security profile from env.
 */
export function getSecurityProfile(): ProfileConfig {
  const env = (process.env.NORTHCLAW_SECURITY_PROFILE || "selective")
    .toLowerCase()
    .trim() as SecurityProfile;

  if (!PROFILES[env]) {
    console.warn(
      `[security] Unknown profile "${env}", falling back to selective`,
    );
    return PROFILES.selective;
  }

  return PROFILES[env];
}

/**
 * Get the effective egress allowlist.
 * Merges profile defaults with user customizations from config file.
 */
export function getEffectiveAllowlist(): string[] {
  const profile = getSecurityProfile();

  if (profile.name === "open") {
    return []; // No filtering in open mode
  }

  const userAllowlistPath = path.join(
    os.homedir(),
    ".config",
    "northclaw",
    "egress-allowlist.json",
  );

  let userDomains: string[] = [];
  if (fs.existsSync(userAllowlistPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(userAllowlistPath, "utf-8"));
      userDomains = data.allowedUpstreams || [];
    } catch {
      console.warn("[security] Failed to parse user egress allowlist");
    }
  }

  // Merge: profile defaults + user additions, deduplicated
  const merged = [...new Set([...profile.defaultAllowlist, ...userDomains])];
  return merged;
}

/**
 * Check if a hostname is allowed under the current profile.
 */
export function isHostAllowed(hostname: string): boolean {
  const profile = getSecurityProfile();

  if (profile.name === "open") return true;

  const allowlist = getEffectiveAllowlist();

  for (const pattern of allowlist) {
    if (pattern.startsWith("*.")) {
      // Wildcard: *.googleapis.com matches foo.googleapis.com
      const suffix = pattern.slice(1); // .googleapis.com
      if (hostname.endsWith(suffix) || hostname === pattern.slice(2)) {
        return true;
      }
    } else if (hostname === pattern) {
      return true;
    }
  }

  return false;
}

/**
 * Get Docker network args based on profile.
 */
export function profileNetworkArgs(): string[] {
  const profile = getSecurityProfile();

  if (profile.name === "open") {
    return []; // Default bridge network, full internet
  }

  return ["--network=northclaw-internal"];
}

/**
 * Log the active profile at startup.
 */
export function logSecurityProfile(): void {
  const profile = getSecurityProfile();
  const allowlist = getEffectiveAllowlist();

  console.log(`[security] Profile: ${profile.name}`);
  console.log(`[security] ${profile.description}`);

  if (profile.name === "open") {
    console.warn("[security] WARNING: Running in open mode. All egress allowed. All activity logged.");
  } else {
    console.log(`[security] Allowlist: ${allowlist.length} domains`);
  }
}
