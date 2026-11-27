import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { Bell, Check, Trash2, RefreshCw, AlertTriangle, CheckCircle2, PackageX, Search, ShoppingBag } from 'lucide-react';

const Alerts = () => {
  const { hasPermission } = useContext(AuthContext);
  const { showAlert, showConfirm } = useDialog();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const [searchTerm, setSearchTerm] = useState('');

  const syncAndFetchAlerts = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      else setSyncing(true);
      const res = await apiClient.post('/notifications/sync');
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      try {
        const res = await apiClient.get('/notifications');
        setAlerts(Array.isArray(res.data) ? res.data : []);
      } catch (innerErr) {
        console.error('Failed to fetch alerts:', innerErr);
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    syncAndFetchAlerts(true);
    const interval = setInterval(() => syncAndFetchAlerts(false), 20000);
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
    if (!(await showConfirm('Bạn có chắc chắn muốn xóa cảnh báo này?'))) return;
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
    syncAndFetchAlerts(false);
  };

  const normalizedQ = searchTerm.trim().toLowerCase();
  const filteredAlerts = alerts
    .filter((a) => (filter === 'unread' ? !a.isRead : true))
    .filter(
      (a) =>
        !normalizedQ ||
        a.productName?.toLowerCase().includes(normalizedQ) ||
        a.message?.toLowerCase().includes(normalizedQ),
    );
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Bell size={28} color="var(--accent-primary)" />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h1 className="text-title" style={{ marginBottom: 0 }}>Cảnh Báo Tồn Kho & Thông Báo</h1>
              {unreadCount > 0 && (
                <span className="badge badge-danger">{unreadCount} chưa đọc</span>
              )}
            </div>
            <p className="text-subtitle" style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
              Đồng bộ tự động theo mức tồn kho thực tế và ngưỡng an toàn (Min Stock Level).
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline"
            onClick={() => syncAndFetchAlerts(false)}
            disabled={syncing}
            style={{ background: 'var(--bg-glass)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={16} /> {syncing ? 'Đang đồng bộ...' : 'Đồng bộ & Làm mới'}
          </button>
          {unreadCount > 0 && (
            <button className="btn btn-primary" onClick={markAllAsRead}>
              <Check size={16} /> Đánh dấu đã đọc tất cả
            </button>
          )}
          {hasPermission('procurement:create') && alerts.length > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/procurement')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ShoppingBag size={16} /> Tạo Đơn Nhập Hàng
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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

        <div className="search-box" style={{ minWidth: '280px', maxWidth: '400px', flex: 1 }}>
          <Search size={16} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Tìm theo tên sản phẩm hoặc nội dung cảnh báo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
          Đang đồng bộ cảnh báo tồn kho thực tế...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          {filter === 'unread' && alerts.length > 0 ? (
            <>
              <CheckCircle2 size={40} color="var(--success)" />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Tất cả {alerts.length} cảnh báo hiện có đều đã được đánh dấu đã đọc</p>
              <p>Chuyển sang tab &ldquo;Tất cả&rdquo; để theo dõi danh sách các sản phẩm cần nhập bổ sung.</p>
            </>
          ) : normalizedQ ? (
            <>
              <Search size={40} color="var(--text-secondary)" />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Không tìm thấy cảnh báo phù hợp với từ khóa &ldquo;{searchTerm}&rdquo;</p>
            </>
          ) : (
            <>
              <CheckCircle2 size={40} color="var(--success)" />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Không có cảnh báo tồn kho nào</p>
              <p>Tồn kho của tất cả các sản phẩm đang ở mức an toàn.</p>
            </>
          )}
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
                  {(alert.updatedAt || alert.createdAt) ? new Date(alert.updatedAt || alert.createdAt).toLocaleString('vi-VN') : ''}
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
                {hasPermission('alerts:manage') && (
                  <button
                    className="btn btn-outline"
                    onClick={() => deleteAlert(alert._id)}
                    title="Xóa cảnh báo"
                    style={{ padding: '0.4rem 0.6rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
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
