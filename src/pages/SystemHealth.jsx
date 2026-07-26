import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Server, Database, Cpu, Box, Radio, RefreshCw, CheckCircle2, XCircle, Activity } from 'lucide-react';

const CATEGORY_META = {
  gateway: { label: 'API Gateway', icon: Radio },
  microservice: { label: 'Microservice', icon: Server },
  python: { label: 'AI / Python Service', icon: Cpu },
  database: { label: 'Database', icon: Database },
  broker: { label: 'Message Broker', icon: Box },
};

const SystemHealth = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [mbData, setMbData] = useState(null);

  const fetchHealth = async () => {
    try {
      setError('');
      const [resHealth, resMb] = await Promise.all([
        apiClient.get('/system/health'),
        apiClient.get('/system/message-bus/status').catch(() => null),
      ]);
      setData(resHealth.data);
      if (resMb) setMbData(resMb.data);
    } catch (err) {
      console.error('Failed to fetch system health:', err);
      setError(err.response?.data?.message || 'Could not load system health.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Auto refresh mỗi 10s
    return () => clearInterval(interval);
  }, []);

  const summary = data?.summary;
  const allHealthy = summary && summary.down === 0;

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={28} color="var(--accent-primary)" />
          <h1 className="text-title" style={{ marginBottom: 0 }}>System Monitoring</h1>
        </div>
        <button className="btn btn-outline" onClick={fetchHealth} style={{ background: 'var(--bg-glass)' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
          Checking services...
        </div>
      ) : error ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--danger)', padding: '2rem' }}>
          {error}
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Overall Status</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: allHealthy ? 'var(--success)' : 'var(--danger)' }}>
                  {allHealthy ? 'Operational' : 'Degraded'}
                </h3>
              </div>
              <div style={{ padding: '1rem', borderRadius: '50%', background: allHealthy ? 'var(--success-light)' : 'var(--danger-light)', color: allHealthy ? 'var(--success)' : 'var(--danger)' }}>
                {allHealthy ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Services Up</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{summary.up}<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}> / {summary.total}</span></h3>
              </div>
              <div style={{ padding: '1rem', borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success)' }}>
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Services Down</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 700, color: summary.down > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{summary.down}</h3>
              </div>
              <div style={{ padding: '1rem', borderRadius: '50%', background: 'var(--danger-light)', color: 'var(--danger)' }}>
                <XCircle size={24} />
              </div>
            </div>
          </div>

          {/* Service cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {data.services.map((svc) => {
              const meta = CATEGORY_META[svc.category] || CATEGORY_META.microservice;
              const Icon = meta.icon;
              const isUp = svc.status === 'up';
              return (
                <div key={svc.name} className="glass-card" style={{ padding: '1.25rem', borderLeft: `4px solid ${isUp ? 'var(--success)' : 'var(--danger)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ color: 'var(--accent-primary)' }}><Icon size={22} /></div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{svc.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{meta.label}</div>
                      </div>
                    </div>
                    <span
                      className="badge"
                      style={{
                        background: isUp ? 'var(--success-light)' : 'var(--danger-light)',
                        color: isUp ? 'var(--success)' : 'var(--danger)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isUp ? 'var(--success)' : 'var(--danger)' }}></span>
                      {isUp ? 'UP' : 'DOWN'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>{svc.host}:{svc.port}</span>
                    <span>{svc.latencyMs} ms</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Bus Resilience & DLQ Status */}
          {mbData && (
            <div className="glass-card" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Box size={22} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Message Bus Resilience & Dead Letter Queues (DLQ)</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Broker Status</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: mbData.broker.status === 'HEALTHY' ? 'var(--success)' : 'var(--danger)' }}>
                    {mbData.broker.status} ({mbData.broker.latencyMs || 0} ms)
                  </div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Dead Letter Exchange</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {mbData.resilienceStrategy.dlxExchange}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Auto-Reconnect Strategy</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>
                    Enabled (Every {mbData.resilienceStrategy.reconnectIntervalSec}s)
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Monitored Queues & Associated DLQs</h4>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Active Message Queue</th>
                      <th>Dead Letter Queue (DLQ)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mbData.monitoredQueues.map((q) => (
                      <tr key={q.queue}>
                        <td><code style={{ color: 'var(--accent-primary)' }}>{q.queue}</code></td>
                        <td><code style={{ color: 'var(--warning)' }}>{q.deadLetterQueue}</code></td>
                        <td>
                          <span className="badge badge-success">{q.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
            Last checked: {new Date(data.checkedAt).toLocaleTimeString()} · Auto-refreshes every 10s
          </p>
        </>
      )}
    </div>
  );
};

export default SystemHealth;
