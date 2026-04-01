# Upstream NanoClaw Features — NorthClaw Backlog

Evaluated from upstream commits as of 2026-03-28. Cherry-pick when the timing is right.

## Evaluate later (medium effort)

### Task scripts for scheduled tasks
- **Upstream:** `f3644f1` (merge), `813e1c6`, `a29ca08`, `730ea0d`
- **What:** Scheduled tasks can run shell scripts directly, not just Claude prompts.
- **Effort:** 8 files, 142 insertions. Touches agent-runner, IPC, db, task-scheduler, types.
- **Why do it:** Direct script execution is faster/cheaper than prompting Claude for simple cron jobs.
- **Why wait:** NorthClaw's scheduled tasks already use Claude prompts, which is more flexible for business workflows. Risk of merge conflicts across core files.

### OneCLI Agent Vault
- **Upstream:** `8b53a95`, `d398ba5`, `a417465`, `4c6d924`
- **What:** Encrypted credential vault replaces plaintext `.env`. Runtime injection instead of file storage.
- **Effort:** Skill file only, BUT introduces `@onecli-sh/sdk` dependency which upstream has woven into core.
- **Why do it:** Defense-in-depth for credential storage. Better for shared/cloud deployments.
- **Why wait:** NorthClaw already protects credentials via the credential proxy (containers never see keys). The `.env` is gitignored and local. Adopt when deploying to shared infrastructure.

## Already adopted

| Commit | Description | Cherry-picked |
|--------|-------------|---------------|
| `a4fd4f2` | Command injection fix (stopContainer + mount paths) | 2026-03-28 |
| `c98205c` | Message history overflow (cap at 10 messages) | 2026-03-28 |
| `0f01fe2` | Env parser single-char crash | 2026-03-28 |
| `f537597` | IPC isMain preservation | 2026-03-28 |
| `0240f48` | isMain template fix for runtime registration | 2026-03-28 |
| `7b22e23` | pino → built-in logger (also removed yaml) | 2026-03-28 |
