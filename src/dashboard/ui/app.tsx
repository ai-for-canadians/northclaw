import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: number;
  timestamp: string;
  type: string;
  groupId: string;
  agentId?: string;
  target?: string;
  detail?: string;
  result?: string;
  tokensUsed?: number;
  piiDetected?: boolean;
}

interface ConsentRow {
  jurisdiction: string;
  consent_type: string;
  count: number;
  unsubscribed: number;
  expired: number;
}

interface CostRow {
  groupId: string;
  totalUsd: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
}

interface SecurityData {
  profile: string;
  description: string;
  effectiveAllowlist: string[];
  userAllowlist: string[];
}

type Tab = 'audit' | 'consent' | 'costs' | 'security';

// ── Styles ─────────────────────────────────────────────────────────────────

const css = {
  root: {
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
    fontSize: 13,
    background: '#0d1117',
    color: '#e6edf3',
    minHeight: '100vh',
    margin: 0,
    padding: 0,
  } as React.CSSProperties,
  header: {
    borderBottom: '1px solid #21262d',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#161b22',
  } as React.CSSProperties,
  logo: { fontSize: 15, fontWeight: 700, color: '#58a6ff', letterSpacing: -0.5 },
  badge: (color: string) =>
    ({
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 20,
      background: color,
      color: '#fff',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    }) as React.CSSProperties,
  tabs: {
    display: 'flex',
    gap: 0,
    padding: '0 20px',
    borderBottom: '1px solid #21262d',
    background: '#161b22',
  } as React.CSSProperties,
  tab: (active: boolean) =>
    ({
      padding: '10px 16px',
      cursor: 'pointer',
      color: active ? '#58a6ff' : '#8b949e',
      fontFamily: 'inherit',
      fontSize: 13,
      background: 'none',
      border: 'none',
      borderBottom: active ? '2px solid #58a6ff' : '2px solid transparent',
      transition: 'color 0.15s',
    }) as React.CSSProperties,
  content: { padding: 20 } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 12,
  },
  th: {
    textAlign: 'left' as const,
    padding: '8px 10px',
    borderBottom: '1px solid #21262d',
    color: '#8b949e',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: '7px 10px',
    borderBottom: '1px solid #161b22',
    verticalAlign: 'top' as const,
  },
  pill: (type: string) => {
    const colors: Record<string, string> = {
      message_sent: '#238636',
      message_blocked: '#b91c1c',
      consent_check: '#1d4ed8',
      consent_update: '#0e7490',
      api_call: '#374151',
      container_start: '#065f46',
      container_stop: '#374151',
      container_timeout: '#92400e',
      egress_blocked: '#7c2d12',
      egress_allowed: '#14532d',
      error: '#b91c1c',
      decision_made: '#4c1d95',
      human_approval: '#064e3b',
      unsubscribe: '#7c2d12',
      file_read: '#1e3a5f',
      file_write: '#3b1f6a',
    };
    return {
      display: 'inline-block',
      padding: '2px 7px',
      borderRadius: 4,
      background: colors[type] ?? '#374151',
      color: '#e6edf3',
      fontSize: 11,
      fontWeight: 600,
    } as React.CSSProperties;
  },
  resultDot: (result?: string) => {
    const colors: Record<string, string> = {
      success: '#3fb950',
      blocked: '#f85149',
      error: '#f85149',
      timeout: '#d29922',
      approved: '#3fb950',
      rejected: '#f85149',
    };
    return {
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: result ? (colors[result] ?? '#8b949e') : '#8b949e',
      marginRight: 5,
    } as React.CSSProperties;
  },
  emptyState: {
    color: '#484f58',
    textAlign: 'center' as const,
    padding: '60px 20px',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#8b949e',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 0,
  },
  card: {
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 16,
  } as React.CSSProperties,
  liveIndicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    color: '#3fb950',
    marginLeft: 'auto',
  } as React.CSSProperties,
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#3fb950',
    animation: 'pulse 2s infinite',
  } as React.CSSProperties,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

function useFetch<T>(url: string, deps: unknown[] = []): { data: T | null; error: string | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((d: T) => { setData(d); setError(null); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  return { data, error, loading };
}

// ── Audit Tab ──────────────────────────────────────────────────────────────

function AuditTab() {
  const { data: recent, loading } = useFetch<AuditEntry[]>('/api/audit/recent?limit=100');
  const [live, setLive] = useState<AuditEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const es = new EventSource('/api/audit/stream');
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const entry: AuditEntry = JSON.parse(e.data);
        setLive((prev) => [...prev.slice(-199), entry]);
      } catch { /* ignore malformed */ }
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (autoScroll && tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
  }, [live, autoScroll]);

  const allEntries = [...(recent ?? []), ...live];
  // Deduplicate by id (recent + live may overlap briefly)
  const seen = new Set<number>();
  const entries = allEntries.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <p style={css.sectionTitle}>Audit Log</p>
        {connected && (
          <span style={css.liveIndicator}>
            <span style={css.dot} /> Live
          </span>
        )}
      </div>

      <div
        ref={tableRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
        }}
        style={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', borderRadius: 6, border: '1px solid #21262d' }}
      >
        {loading && entries.length === 0 ? (
          <div style={css.emptyState}>Loading…</div>
        ) : entries.length === 0 ? (
          <div style={css.emptyState}>No audit entries yet.<br />Entries appear here as agents act.</div>
        ) : (
          <table style={css.table}>
            <thead style={{ position: 'sticky', top: 0, background: '#0d1117' }}>
              <tr>
                <th style={css.th}>#</th>
                <th style={css.th}>Time</th>
                <th style={css.th}>Type</th>
                <th style={css.th}>Group</th>
                <th style={css.th}>Result</th>
                <th style={css.th}>Detail</th>
                <th style={css.th}>Tokens</th>
              </tr>
            </thead>
            <tbody>
              {[...entries].reverse().map((e) => (
                <tr key={e.id}>
                  <td style={{ ...css.td, color: '#484f58', fontSize: 11 }}>{e.id}</td>
                  <td style={{ ...css.td, color: '#8b949e', whiteSpace: 'nowrap', fontSize: 11 }}>
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </td>
                  <td style={css.td}>
                    <span style={css.pill(e.type)}>{e.type.replace(/_/g, ' ')}</span>
                  </td>
                  <td style={{ ...css.td, color: '#cdd9e5' }}>{e.groupId}</td>
                  <td style={css.td}>
                    {e.result && (
                      <>
                        <span style={css.resultDot(e.result)} />
                        {e.result}
                      </>
                    )}
                  </td>
                  <td style={{ ...css.td, color: '#8b949e', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.detail ?? e.target ?? ''}
                  </td>
                  <td style={{ ...css.td, color: '#8b949e', textAlign: 'right' }}>
                    {e.tokensUsed != null ? e.tokensUsed.toLocaleString() : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Consent Tab ────────────────────────────────────────────────────────────

function ConsentTab() {
  const { data, loading, error } = useFetch<{ available: boolean; data: ConsentRow[] }>('/api/consent/summary');

  if (loading) return <div style={css.emptyState}>Loading…</div>;
  if (error) return <div style={css.emptyState}>Error: {error}</div>;
  if (!data?.available) return <div style={css.emptyState}>No consent database yet.<br />Records appear after the first outbound message.</div>;

  const jurisdictions = [...new Set(data.data.map((r) => r.jurisdiction))];

  return (
    <div>
      <p style={css.sectionTitle}>Consent Summary</p>
      {jurisdictions.map((jur) => {
        const rows = data.data.filter((r) => r.jurisdiction === jur);
        const totals = rows.reduce(
          (acc, r) => ({
            count: acc.count + r.count,
            unsubscribed: acc.unsubscribed + r.unsubscribed,
            expired: acc.expired + r.expired,
          }),
          { count: 0, unsubscribed: 0, expired: 0 },
        );
        return (
          <div key={jur} style={css.card}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
              <strong style={{ fontSize: 14, color: '#cdd9e5' }}>{jur}</strong>
              <span style={{ color: '#8b949e', fontSize: 12 }}>
                {totals.count} recipients · {totals.unsubscribed} unsubscribed · {totals.expired} expired
              </span>
            </div>
            <table style={css.table}>
              <thead>
                <tr>
                  <th style={css.th}>Consent Type</th>
                  <th style={{ ...css.th, textAlign: 'right' }}>Count</th>
                  <th style={{ ...css.th, textAlign: 'right' }}>Unsubscribed</th>
                  <th style={{ ...css.th, textAlign: 'right' }}>Expired</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.consent_type}>
                    <td style={css.td}><span style={css.pill(r.consent_type)}>{r.consent_type.replace(/_/g, ' ')}</span></td>
                    <td style={{ ...css.td, textAlign: 'right' }}>{r.count}</td>
                    <td style={{ ...css.td, textAlign: 'right', color: r.unsubscribed > 0 ? '#f85149' : '#8b949e' }}>{r.unsubscribed}</td>
                    <td style={{ ...css.td, textAlign: 'right', color: r.expired > 0 ? '#d29922' : '#8b949e' }}>{r.expired}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ── Costs Tab ──────────────────────────────────────────────────────────────

function CostsTab() {
  const { data, loading, error } = useFetch<{
    available: boolean;
    thisMonth: CostRow[];
    allTime: { totalUsd: number; totalTokens: number } | null;
  }>('/api/costs/by-group');

  if (loading) return <div style={css.emptyState}>Loading…</div>;
  if (error) return <div style={css.emptyState}>Error: {error}</div>;
  if (!data?.available) return (
    <div style={css.emptyState}>No cost data yet.<br />Usage is recorded after the first API call.</div>
  );

  const monthTotal = data.thisMonth.reduce((s, r) => s + r.totalUsd, 0);

  return (
    <div>
      <p style={css.sectionTitle}>API Costs</p>

      {data.allTime && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ ...css.card, flex: 1, marginBottom: 0 }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>THIS MONTH</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#3fb950' }}>
              ${monthTotal.toFixed(4)}
            </div>
          </div>
          <div style={{ ...css.card, flex: 1, marginBottom: 0 }}>
            <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 4 }}>ALL TIME</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#58a6ff' }}>
              ${data.allTime.totalUsd.toFixed(4)}
            </div>
            <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
              {data.allTime.totalTokens.toLocaleString()} tokens
            </div>
          </div>
        </div>
      )}

      {data.thisMonth.length === 0 ? (
        <div style={css.emptyState}>No usage this month yet.</div>
      ) : (
        <div style={{ ...css.card, padding: 0, overflow: 'hidden' }}>
          <table style={css.table}>
            <thead style={{ background: '#0d1117' }}>
              <tr>
                <th style={css.th}>Group</th>
                <th style={{ ...css.th, textAlign: 'right' }}>Cost (USD)</th>
                <th style={{ ...css.th, textAlign: 'right' }}>Input tokens</th>
                <th style={{ ...css.th, textAlign: 'right' }}>Output tokens</th>
                <th style={{ ...css.th, textAlign: 'right' }}>Requests</th>
              </tr>
            </thead>
            <tbody>
              {data.thisMonth.map((r) => (
                <tr key={r.groupId}>
                  <td style={{ ...css.td, fontWeight: 600 }}>{r.groupId}</td>
                  <td style={{ ...css.td, textAlign: 'right', color: '#3fb950' }}>${r.totalUsd.toFixed(4)}</td>
                  <td style={{ ...css.td, textAlign: 'right', color: '#8b949e' }}>{r.inputTokens.toLocaleString()}</td>
                  <td style={{ ...css.td, textAlign: 'right', color: '#8b949e' }}>{r.outputTokens.toLocaleString()}</td>
                  <td style={{ ...css.td, textAlign: 'right', color: '#8b949e' }}>{r.requests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Security Tab ───────────────────────────────────────────────────────────

function SecurityTab() {
  const { data, loading, error } = useFetch<SecurityData>('/api/security/profile');

  if (loading) return <div style={css.emptyState}>Loading…</div>;
  if (error) return <div style={css.emptyState}>Error: {error}</div>;
  if (!data) return null;

  const profileColor: Record<string, string> = {
    locked: '#b91c1c',
    selective: '#1d4ed8',
    open: '#92400e',
  };

  return (
    <div>
      <p style={css.sectionTitle}>Security Profile</p>

      <div style={{ ...css.card, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            background: profileColor[data.profile] ?? '#374151',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {data.profile}
        </div>
        <div>
          <div style={{ color: '#cdd9e5', marginBottom: 4 }}>{data.description}</div>
          <div style={{ color: '#8b949e', fontSize: 12 }}>
            Set via <code style={{ background: '#21262d', padding: '1px 5px', borderRadius: 3 }}>NORTHCLAW_SECURITY_PROFILE</code> in .env
          </div>
        </div>
      </div>

      <div style={css.card}>
        <div style={{ ...css.sectionTitle, marginBottom: 8 }}>
          Effective Egress Allowlist
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8, color: '#58a6ff' }}>
            {data.effectiveAllowlist.length} domains
          </span>
        </div>
        {data.profile === 'open' ? (
          <div style={{ color: '#d29922' }}>All outbound traffic allowed (open mode). No filtering applied.</div>
        ) : data.effectiveAllowlist.length === 0 ? (
          <div style={{ color: '#484f58' }}>No domains allowed (locked mode).</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.effectiveAllowlist.map((d) => (
              <span
                key={d}
                style={{
                  background: data.userAllowlist.includes(d) ? '#1f3d1f' : '#1c2128',
                  border: `1px solid ${data.userAllowlist.includes(d) ? '#238636' : '#21262d'}`,
                  borderRadius: 4,
                  padding: '3px 9px',
                  fontSize: 12,
                  color: data.userAllowlist.includes(d) ? '#3fb950' : '#8b949e',
                }}
                title={data.userAllowlist.includes(d) ? 'User-added' : 'Profile default'}
              >
                {d}
              </span>
            ))}
          </div>
        )}
        {data.userAllowlist.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 11, color: '#484f58' }}>
            <span style={{ color: '#3fb950' }}>■</span> User-added &nbsp;
            <span style={{ color: '#8b949e' }}>■</span> Profile default
          </div>
        )}
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────

function App() {
  const [tab, setTab] = useState<Tab>('audit');
  const { data: secData } = useFetch<SecurityData>('/api/security/profile');

  const profileColor: Record<string, string> = {
    locked: '#b91c1c',
    selective: '#2563eb',
    open: '#b45309',
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'audit', label: 'Audit Log' },
    { id: 'consent', label: 'Consent' },
    { id: 'costs', label: 'Costs' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <div style={css.root}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #0d1117; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #21262d; border-radius: 3px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      <div style={css.header}>
        <span style={css.logo}>NorthClaw</span>
        <span style={{ color: '#484f58', fontSize: 12 }}>Observability Dashboard</span>
        {secData && (
          <span style={css.badge(profileColor[secData.profile] ?? '#374151')}>
            {secData.profile}
          </span>
        )}
      </div>

      <div style={css.tabs}>
        {tabs.map(({ id, label }) => (
          <button key={id} style={css.tab(tab === id)} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div style={css.content}>
        {tab === 'audit' && <AuditTab />}
        {tab === 'consent' && <ConsentTab />}
        {tab === 'costs' && <CostsTab />}
        {tab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}

// ── Mount ──────────────────────────────────────────────────────────────────

const root = document.getElementById('root');
if (root) createRoot(root).render(<App />);
