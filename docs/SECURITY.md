# NorthClaw Security Model

## Trust Model

| Entity | Trust Level | Rationale |
|--------|-------------|-----------|
| Main group | Trusted | Private self-chat, admin control |
| Non-main groups | Untrusted | Other users may be malicious |
| Container agents | Sandboxed | Isolated execution environment |
| WhatsApp messages | User input | Potential prompt injection |

## Security Boundaries

### 1. Container Isolation (Primary Boundary)

Agents execute in containers (lightweight Linux VMs), providing:
- **Process isolation** - Container processes cannot affect the host
- **Filesystem isolation** - Only explicitly mounted directories are visible
- **Non-root execution** - Runs as unprivileged `node` user (uid 1000)
- **Ephemeral containers** - Fresh environment per invocation (`--rm`)

This is the primary security boundary. Rather than relying on application-level permission checks, the attack surface is limited by what's mounted.

### 2. Mount Security

**External Allowlist** - Mount permissions stored at `~/.config/nanoclaw/mount-allowlist.json`, which is:
- Outside project root
- Never mounted into containers
- Cannot be modified by agents

**Default Blocked Patterns:**
```
.ssh, .gnupg, .aws, .azure, .gcloud, .kube, .docker,
credentials, .env, .netrc, .npmrc, id_rsa, id_ed25519,
private_key, .secret
```

**Protections:**
- Symlink resolution before validation (prevents traversal attacks)
- Container path validation (rejects `..` and absolute paths)
- `nonMainReadOnly` option forces read-only for non-main groups

**Read-Only Project Root:**

The main group's project root is mounted read-only. Writable paths the agent needs (group folder, IPC, `.claude/`) are mounted separately. This prevents the agent from modifying host application code (`src/`, `dist/`, `package.json`, etc.) which would bypass the sandbox entirely on next restart.

### 3. Session Isolation

Each group has isolated Claude sessions at `data/sessions/{group}/.claude/`:
- Groups cannot see other groups' conversation history
- Session data includes full message history and file contents read
- Prevents cross-group information disclosure

### 4. IPC Authorization

Messages and task operations are verified against group identity:

| Operation | Main Group | Non-Main Group |
|-----------|------------|----------------|
| Send message to own chat | ✓ | ✓ |
| Send message to other chats | ✓ | ✗ |
| Schedule task for self | ✓ | ✓ |
| Schedule task for others | ✓ | ✗ |
| View all tasks | ✓ | Own only |
| Manage other groups | ✓ | ✗ |

### 5. Credential Isolation (Credential Proxy)

Real API credentials **never enter containers**. Instead, the host runs an HTTP credential proxy that injects authentication headers transparently.

**How it works:**
1. Host starts a credential proxy on `CREDENTIAL_PROXY_PORT` (default: 3001)
2. Containers receive `ANTHROPIC_BASE_URL=http://host.docker.internal:<port>` and `ANTHROPIC_API_KEY=placeholder`
3. The SDK sends API requests to the proxy with the placeholder key
4. The proxy strips placeholder auth, injects real credentials (`x-api-key` or `Authorization: Bearer`), and forwards to `api.anthropic.com`
5. Agents cannot discover real credentials — not in environment, stdin, files, or `/proc`

**NOT Mounted:**
- WhatsApp session (`store/auth/`) - host only
- Mount allowlist - external, never mounted
- Any credentials matching blocked patterns
- `.env` is shadowed with `/dev/null` in the project root mount

## Privilege Comparison

| Capability | Main Group | Non-Main Group |
|------------|------------|----------------|
| Project root access | `/workspace/project` (ro) | None |
| Group folder | `/workspace/group` (rw) | `/workspace/group` (rw) |
| Global memory | Implicit via project | `/workspace/global` (ro) |
| Additional mounts | Configurable | Read-only unless allowed |
| Network access | Internal only (proxy) | Internal only (proxy) |
| MCP tools | All (via proxy) | All (via proxy) |

## Security Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        UNTRUSTED ZONE                             │
│  WhatsApp Messages (potentially malicious)                        │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼ Trigger check, input escaping
┌──────────────────────────────────────────────────────────────────┐
│                     HOST PROCESS (TRUSTED)                        │
│  • Message routing                                                │
│  • IPC authorization                                              │
│  • Mount validation (external allowlist)                          │
│  • Container lifecycle                                            │
│  • Credential proxy (injects auth headers)                       │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼ Explicit mounts only, no secrets
┌──────────────────────────────────────────────────────────────────┐
│                CONTAINER (ISOLATED/SANDBOXED)                     │
│  • Agent execution                                                │
│  • Bash commands (sandboxed)                                      │
│  • File operations (limited to mounts)                            │
│  • API calls routed through credential proxy                     │
│  • No real credentials in environment or filesystem              │
│  • Internal network: no direct internet access                  │
└──────────────────────────────────────────────────────────────────┘
```

### 6. Default-Deny Network Egress

Containers run on the `northclaw-internal` Docker network (`--internal`):
- **All outbound internet access is blocked** — containers cannot reach external services
- The only reachable endpoint is the credential proxy via `host.docker.internal:3001`
- The proxy enforces an egress allowlist (`~/.config/nanoclaw/egress-allowlist.json`) with wildcard support
- Web search from agents is disabled by default. To enable, add domains to the egress allowlist.

### 7. Seccomp Profile

Container syscalls are restricted via `northclaw-seccomp.json`:
- Default-deny policy with explicit allowlist
- Permits Chromium-required syscalls (`clone`, `unshare`, `seccomp`)
- Blocks dangerous syscalls: `mount`, `ptrace`, `kexec_load`, `pivot_root`, etc.
- Uses `SCMP_ACT_ERRNO` (return EPERM) to avoid hard crashes

### 8. Read-Only Root Filesystem

Container root is mounted read-only (`--read-only`):
- `/tmp` is writable via tmpfs (512MB, noexec, nosuid)
- `/workspace` directories are writable via bind mounts
- Prevents agents from modifying container system files

### 9. CASL Consent Gate

Every outbound message passes through a centralized consent gate (`src/outbound.ts`):
- Runs on the host process — compromised agents cannot bypass it
- Classifies messages as commercial or transactional
- Applies CASL (Canadian) or CAN-SPAM (US) rules based on recipient jurisdiction
- Supports `log-only` mode (default) or `strict` enforcement via `NORTHCLAW_CONSENT_MODE`
- Hash-chained audit log at `data/audit/audit.jsonl` for tamper-evident trail
