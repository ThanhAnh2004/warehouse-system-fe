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
    const interval = setInterval(fetchAlerts, 15000);
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
    if (!window.confirm('Bạn có chắc chắn muốn xóa cảnh báo này?')) return;
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
          <h1 className="text-title" style={{ marginBottom: 0 }}>Cảnh Báo Tồn Kho & Thông Báo</h1>
          {unreadCount > 0 && (
            <span className="badge badge-danger">{unreadCount} chưa đọc</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={fetchAlerts} style={{ background: 'var(--bg-glass)' }}>
            <RefreshCw size={16} /> Làm mới
          </button>
          {unreadCount > 0 && (
            <button className="btn btn-primary" onClick={markAllAsRead}>
              <Check size={16} /> Đánh dấu đã đọc tất cả
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
          Tất cả ({alerts.length})
        </button>
        <button
          className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setFilter('unread')}
          style={{ borderRadius: '20px', padding: '0.4rem 1.2rem', fontSize: '0.9rem', background: filter === 'unread' ? undefined : 'var(--bg-glass)' }}
        >
          Chưa đọc ({unreadCount})
        </button>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
          Đang tải cảnh báo...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={40} color="var(--success)" />
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Không có cảnh báo {filter === 'unread' ? 'chưa đọc ' : ''}nào</p>
          <p>Tồn kho của tất cả các sản phẩm đang ở mức an toàn.</p>
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
                    {isOver ? 'TỒN QUÁ NHIỀU' : 'THIẾU TỒN KHO'}
                  </span>
                  {!alert.isRead && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent, display: 'inline-block' }}></span>
                  )}
                  {alert.currentStock !== undefined && alert.threshold !== undefined && (
                    <span className="badge" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                      Hiện tại: {alert.currentStock} / Ngưỡng: {alert.threshold}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {(() => {
                    const msg = alert.message || '';
                    if (msg.includes('has fallen below the minimum stock level')) {
                      return `Sản phẩm ${alert.productName || ''} đã giảm xuống dưới mức tồn kho tối thiểu (Hiện tại: ${alert.currentStock} / Tối thiểu: ${alert.threshold}).`;
                    }
                    if (msg.includes('is running out of stock!')) {
                      return `Sản phẩm ${alert.productName || ''} sắp hết hàng trong kho! (Số lượng hiện tại: ${alert.currentStock}).`;
                    }
                    if (msg.includes('has exceeded the maximum stock level')) {
                      return `Sản phẩm ${alert.productName || ''} đã vượt quá mức tồn kho tối đa (Hiện tại: ${alert.currentStock} / Tối đa: ${alert.threshold}).`;
                    }
                    return msg;
                  })()}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {alert.createdAt ? new Date(alert.createdAt).toLocaleString('vi-VN') : ''}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                {!alert.isRead && (
                  <button
                    className="btn btn-outline"
                    onClick={() => markAsRead(alert._id)}
                    title="Đánh dấu đã đọc"
                    style={{ padding: '0.4rem 0.6rem', background: 'transparent' }}
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  className="btn btn-outline"
                  onClick={() => deleteAlert(alert._id)}
                  title="Xóa cảnh báo"
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
