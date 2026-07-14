import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Server, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const SystemHealth = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = async () => {
    try {
      const res = await apiClient.get('/admin/services/health');
      setServices(res.data);
      setLastChecked(new Date());
    } catch (err) {
      console.error('Failed to fetch service health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const upCount = services.filter(s => s.status === 'UP').length;

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 className="text-title">Microservices Infrastructure</h2>
          {lastChecked && (
            <p className="text-subtitle" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button className="btn btn-outline" onClick={fetchHealth} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {!loading && (
        <div className="glass-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '2rem' }}>
          <div>
            <p className="text-subtitle" style={{ fontSize: '0.9rem' }}>Services Online</p>
            <h3 style={{ fontSize: '2rem', fontWeight: 700, color: upCount === services.length ? 'var(--success)' : 'var(--warning)' }}>
              {upCount} / {services.length}
            </h3>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Checking services...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {services.map(svc => (
            <div key={svc.name} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Server size={20} color="var(--text-secondary)" />
                  <strong style={{ fontSize: '1rem' }}>{svc.name}</strong>
                </div>
                {svc.status === 'UP' ? (
                  <CheckCircle2 size={22} color="var(--success)" />
                ) : (
                  <XCircle size={22} color="var(--danger)" />
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {svc.host}:{svc.port}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge ${svc.status === 'UP' ? 'badge-success' : 'badge-danger'}`}>
                  {svc.status}
                </span>
                {svc.latencyMs !== null && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{svc.latencyMs} ms</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SystemHealth;
