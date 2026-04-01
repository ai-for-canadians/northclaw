# NorthClaw Agent Registry

Available agents and their roles in the multi-agent system.

## Architecture

NorthClaw uses a Supervisor/Worker pattern. The Orchestrator is the only agent that can spawn other agents. All inter-agent communication routes through the Orchestrator via structured JSON over IPC. Agents never communicate directly with each other.

```
                    ┌─────────────┐
                    │ Orchestrator│ (privileged, coordinates all)
                    └──────┬──────┘
          ┌────────┬───────┼───────┬────────┬────────┐
          ▼        ▼       ▼       ▼        ▼        ▼
     ┌────────┐┌───────┐┌─────┐┌──────┐┌───────┐┌────────┐
     │Complian││Audit  ││Doc  ││Reg   ││Securit││Research│
     │Monitor ││Trail  ││Proc ││Report││Watcher││Agent   │
     └────────┘└───────┘└─────┘└──────┘└───────┘└────────┘
     (locked)  (locked) (lock) (lock)  (locked) (selective)

                    ┌─────────────┐
                    │Inbox Triage │ (selective, channel access)
                    └─────────────┘
```

## Agent catalog

| Agent | Container | Security | Schedule | Purpose |
|-------|-----------|----------|----------|---------|
| orchestrator | Privileged | Locked + IPC | On-demand | Coordinates multi-agent workflows |
| compliance-monitor | Isolated | Locked | Daily 7 AM | Scans for compliance violations |
| audit-trail | Isolated | Locked | Hourly + on-demand | Verifies audit chain, generates reports |
| doc-processor | Isolated | Locked | On-demand | Classifies, scans, compliance-checks documents |
| reg-reporter | Isolated | Locked | Monthly + on-demand | Generates regulatory compliance reports |
| security-watcher | Isolated | Locked + Docker API | Every 15 min | Monitors for threats and anomalies |
| inbox-triage | Isolated | Selective | On every message | Classifies and routes incoming messages |
| research | Isolated | Selective | On-demand | Deep research with source verification |

## Adding custom agents

Create a new directory in `.claude/agents/[name]/` with an AGENT.md file.

Required sections in AGENT.md:
- **Identity**: Who the agent is and what it does
- **Trigger**: When it runs (scheduled, on-demand, automatic)
- **Core functions**: What it does step by step
- **Output format**: What its reports look like
- **Security**: Container profile and access restrictions

Register the agent by running:
```
> /new-agent [name]
```

## Multi-agent workflow examples

**"Review this contract and assess the vendor"**
Orchestrator → Doc Processor (extract clauses) → Research (vendor background) → Audit Trail (our history with vendor) → Synthesize vendor risk assessment

**"Are we GDPR compliant?"**
Orchestrator → Compliance Monitor (scan current state) → Audit Trail (verify evidence) → Reg Reporter (generate GDPR report) → Synthesize compliance status

**"We have a data breach"**
Orchestrator → Security Watcher (assess scope) → Compliance Monitor (identify affected data) → Reg Reporter (draft notifications per jurisdiction) → Inbox Triage (alert stakeholders)

**"Process these 5 contracts in parallel"**
Orchestrator → 4x Doc Processor (parallel, one per contract, last one queued) → Synthesize comparison report
