import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Bell, Check, Trash2, RefreshCw, AlertTriangle, CheckCircle2, PackageX } from 'lucide-react';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/notifications');
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // Auto refresh mỗi 15s
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      setAlerts((prev) => prev.map((a) => (a._id === id ? { ...a, isRead: true } : a)));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const deleteAlert = async (id) => {
    if (!window.confirm('Delete this alert?')) return;
    try {
      await apiClient.delete(`/notifications/${id}`);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error('Failed to delete alert:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = alerts.filter((a) => !a.isRead);
    await Promise.all(unread.map((a) => apiClient.put(`/notifications/${a._id}/read`).catch(() => {})));
    fetchAlerts();
  };

  const filteredAlerts = filter === 'unread' ? alerts.filter((a) => !a.isRead) : alerts;
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Bell size={28} color="var(--accent-primary)" />
          <h1 className="text-title" style={{ marginBottom: 0 }}>Stock Alerts</h1>
          {unreadCount > 0 && (
            <span className="badge badge-danger">{unreadCount} unread</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={fetchAlerts} style={{ background: 'var(--bg-glass)' }}>
            <RefreshCw size={16} /> Refresh
          </button>
          {unreadCount > 0 && (
            <button className="btn btn-primary" onClick={markAllAsRead}>
              <Check size={16} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('all')}
          style={{ borderRadius: '20px', padding: '0.4rem 1.2rem', fontSize: '0.9rem', background: filter === 'all' ? undefined : 'var(--bg-glass)' }}
        >
          All ({alerts.length})
        </button>
        <button
          className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('unread')}
          style={{ borderRadius: '20px', padding: '0.4rem 1.2rem', fontSize: '0.9rem', background: filter === 'unread' ? undefined : 'var(--bg-glass)' }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
          Loading alerts...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={40} color="var(--success)" />
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No {filter === 'unread' ? 'unread ' : ''}alerts</p>
          <p>All stock levels are healthy.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '0.5rem' }}>
          {filteredAlerts.map((alert) => {
            const isOver = alert.alertType === 'OVERSTOCK';
            const accent = isOver ? 'var(--warning)' : 'var(--danger)';
            const accentLight = isOver ? 'var(--warning-light)' : 'var(--danger-light)';
            return (
            <div
              key={alert._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.1rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '0.5rem',
                background: alert.isRead ? 'transparent' : accentLight,
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ color: alert.isRead ? 'var(--text-secondary)' : accent, flexShrink: 0 }}>
                {isOver ? <PackageX size={22} /> : <AlertTriangle size={22} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{alert.productName}</span>
                  <span className="badge" style={{ background: accentLight, color: accent, fontSize: '0.65rem' }}>
                    {isOver ? 'OVERSTOCK' : 'LOW STOCK'}
                  </span>
                  {!alert.isRead && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent, display: 'inline-block' }}></span>
                  )}
                  {alert.currentStock !== undefined && alert.threshold !== undefined && (
                    <span className="badge" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                      {alert.currentStock} / {alert.threshold}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{alert.message}</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {!alert.isRead && (
                  <button
                    className="btn btn-outline"
                    onClick={() => markAsRead(alert._id)}
                    title="Mark as read"
                    style={{ padding: '0.4rem 0.6rem', background: 'transparent' }}
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  className="btn btn-outline"
                  onClick={() => deleteAlert(alert._id)}
                  title="Delete alert"
                  style={{ padding: '0.4rem 0.6rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Alerts;
