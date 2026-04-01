# Network Egress Allowlist

When the user needs to manage the network egress allowlist (which hosts the credential proxy can forward to), use the egress CLI.

## Commands

```bash
# List all allowed hosts
npx tsx src/cli/egress-cli.ts --list

# Add a host to the allowlist
npx tsx src/cli/egress-cli.ts --add api.example.com

# Add a wildcard pattern
npx tsx src/cli/egress-cli.ts --add "*.googleapis.com"

# Remove a host from the allowlist
npx tsx src/cli/egress-cli.ts --remove api.example.com

# Test if a hostname would be allowed
npx tsx src/cli/egress-cli.ts --test us-east5-aiplatform.googleapis.com
```

## Context

NorthClaw containers run on an internal Docker network with no internet access. All API calls go through the credential proxy, which only forwards to hosts on the egress allowlist.

The allowlist lives at `~/.config/northclaw/egress-allowlist.json` — outside the project root so containers cannot read or modify it.

Default entries:
- `api.anthropic.com` — direct Anthropic API
- `*.aiplatform.googleapis.com` — Vertex AI (when `CLAUDE_CODE_USE_VERTEX=1`)

Wildcard patterns match subdomains: `*.googleapis.com` matches `us-east5-aiplatform.googleapis.com`.

After modifying the allowlist, restart NorthClaw for changes to take effect (the proxy caches the allowlist at startup).
