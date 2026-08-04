import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client';
import { ClipboardList, AlertTriangle, Send, PackageMinus, PackagePlus, Edit2, Trash2, X, Save } from 'lucide-react';

const ADJUSTMENT_TYPES = [
  { key: 'DAMAGED', label: 'Hàng hư hỏng / Bổ vỡ', direction: 'OUTBOUND' },
  { key: 'LOST', label: 'Thất thoát / Thất lạc', direction: 'OUTBOUND' },
  { key: 'EXPIRED', label: 'Hết hạn sử dụng', direction: 'OUTBOUND' },
  { key: 'FOUND', label: 'Phát hiện dôi dư', direction: 'INBOUND' },
  { key: 'COUNT_ADD', label: 'Điều chỉnh kiểm kê (+)', direction: 'INBOUND' },
  { key: 'COUNT_REMOVE', label: 'Điều chỉnh kiểm kê (-)', direction: 'OUTBOUND' },
];

const StockAdjustment = () => {
  const [products, setProducts] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [productSearch, setProductSearch] = useState('');

  const [form, setForm] = useState({ productId: '', typeKey: 'DAMAGED', quantity: 1, reason: '' });

  // Modals state
  const [editingTx, setEditingTx] = useState(null);
  const [editForm, setEditForm] = useState({ quantity: 1, note: '' });
  const [deletingTx, setDeletingTx] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (editingTx || deletingTx) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [editingTx, deletingTx]);

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/inventory/products?limit=1000');
      const list = res.data?.data || [];
      setProducts(list);
      const map = {};
      list.forEach((p) => { map[p.id] = { name: p.name, sku: p.sku }; });
      setProductMap(map);
      if (list.length > 0) setForm((f) => ({ ...f, productId: list[0].id }));
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchRecent = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/transactions', {
        params: { type: 'ADJUSTMENT', limit: 100, sortBy: 'createdAt', sortOrder: 'DESC' }
      });
      setRecent(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch recent adjustments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchRecent();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    const qty = parseInt(form.quantity, 10);
    if (!form.productId) return setMessage({ type: 'error', text: 'Vui lòng chọn sản phẩm.' });
    if (isNaN(qty) || qty <= 0) return setMessage({ type: 'error', text: 'Số lượng phải lớn hơn 0.' });
    if (!form.reason.trim()) return setMessage({ type: 'error', text: 'Vui lòng nhập lý do / mô tả sự cố.' });

    const adjType = ADJUSTMENT_TYPES.find((t) => t.key === form.typeKey);
    const isIncrease = adjType.direction === 'INBOUND';

    const payload = {
      productId: form.productId,
      type: 'ADJUSTMENT',
      quantity: isIncrease ? qty : -qty,
      locationFrom: 'DEFAULT_WAREHOUSE',
      locationTo: 'DEFAULT_WAREHOUSE',
      note: `[${adjType.label}] ${form.reason.trim()}`,
    };

    try {
      setSubmitting(true);
      await apiClient.post('/transactions', payload);
      setMessage({ type: 'success', text: `Đã ghi nhận điều chỉnh kiểm kê: ${adjType.label} (${isIncrease ? '+' : '-'}${qty}).` });
      setForm((f) => ({ ...f, quantity: 1, reason: '' }));
      fetchRecent();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Ghi nhận điều chỉnh thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setEditForm({
      quantity: Math.abs(tx.quantity),
      note: tx.note || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTx) return;
    const isPositive = editingTx.quantity > 0;
    const qty = parseInt(editForm.quantity, 10);
    if (isNaN(qty) || qty <= 0) return alert('Số lượng phải lớn hơn 0!');

    try {
      setSubmitting(true);
      await apiClient.patch(`/transactions/${editingTx.id}`, {
        quantity: isPositive ? qty : -qty,
        note: editForm.note.trim(),
      });
      setMessage({ type: 'success', text: 'Đã cập nhật báo cáo điều chỉnh thành công.' });
      setEditingTx(null);
      fetchRecent();
    } catch (err) {
      alert('Lỗi cập nhật: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    try {
      setDeletingLoading(true);
      await apiClient.delete(`/transactions/${deletingTx.id}`);
      setMessage({ type: 'success', text: 'Đã xóa báo cáo điều chỉnh thành công.' });
      setDeletingTx(null);
      fetchRecent();
    } catch (err) {
      alert('Lỗi xóa báo cáo: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeletingLoading(false);
    }
  };

  const selectedType = ADJUSTMENT_TYPES.find((t) => t.key === form.typeKey);

  const isMobile = window.innerWidth <= 768;
  const modalBackdropStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: isMobile ? 0 : 'var(--sidebar-width, 280px)',
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  };

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <ClipboardList size={28} color="var(--accent-primary)" />
        <h1 className="text-title" style={{ marginBottom: 0 }}>Kiểm Kê Kho & Báo Cáo Sự Cố</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Form */}
        <div className="glass-card">
          <h3 className="text-subtitle" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Báo cáo Sự cố / Kiểm kê</h3>

          {message.text && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.9rem',
                background: message.type === 'error' ? 'var(--danger-light)' : 'var(--success-light)',
                color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
              }}
            >
              <AlertTriangle size={16} /> {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="text-subtitle" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Sản Phẩm</label>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 Lọc theo tên hoặc SKU..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  const matched = products.filter((p) =>
                    p.name?.toLowerCase().includes(e.target.value.toLowerCase()) ||
                    p.sku?.toLowerCase().includes(e.target.value.toLowerCase())
                  );
                  if (matched.length > 0) setForm((f) => ({ ...f, productId: matched[0].id }));
                }}
                style={{ marginBottom: '0.5rem' }}
              />
              <select required className="form-input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
                {filteredProducts.length === 0 && <option value="" disabled>Không tìm thấy sản phẩm</option>}
              </select>
            </div>

            <div>
              <label className="text-subtitle" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Loại Sự Cố / Kiểm Kê</label>
              <select className="form-input" value={form.typeKey} onChange={(e) => setForm({ ...form, typeKey: e.target.value })}>
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {selectedType.direction === 'INBOUND'
                  ? <><PackagePlus size={15} color="var(--success)" /> Tăng số lượng tồn kho (+)</>
                  : <><PackageMinus size={15} color="var(--danger)" /> Giảm số lượng tồn kho (-)</>}
              </div>
            </div>

            <div>
              <label className="text-subtitle" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Số lượng ảnh hưởng</label>
              <input required type="number" min="1" className="form-input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>

            <div>
              <label className="text-subtitle" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Lý do / Mô tả chi tiết</label>
              <textarea required className="form-input" rows="3" style={{ resize: 'none', fontFamily: 'inherit' }} placeholder="Ví dụ: 3 chiếc bị vỡ do bốc xếp..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '0.5rem' }}>
              <Send size={16} /> {submitting ? 'Đang gửi...' : 'Gửi Báo Cáo'}
            </button>
          </form>
        </div>

        {/* Recent adjustments */}
        <div className="glass-card">
          <h3 className="text-subtitle" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Lịch sử điều chỉnh gần đây</h3>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                  <th>Loại Điều Chỉnh</th>
                  <th>Sản Phẩm</th>
                  <th style={{ textAlign: 'right' }}>Số Lượng</th>
                  <th>Lý Do / Ghi Chú</th>
                  <th>Thời Gian</th>
                  <th style={{ textAlign: 'center', width: '90px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải...</td></tr>
                ) : recent.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Chưa có báo cáo điều chỉnh nào.</td></tr>
                ) : recent.map((t, idx) => {
                  const isPositive = t.quantity > 0;
                  const reason = t.note || 'Điều chỉnh kiểm kê';
                  return (
                    <tr key={t.id}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                      <td>
                        <span className={`badge ${isPositive ? 'badge-success' : 'badge-danger'}`}>
                          {isPositive ? 'Tăng tồn (+)' : 'Giảm tồn (-)'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {productMap[t.productId]?.name || t.productId}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{productMap[t.productId]?.sku || ''}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
                        {isPositive ? '+' : ''}{t.quantity}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{reason}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(t.createdAt).toLocaleString('vi-VN')}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '5px 7px', fontSize: '0.75rem', background: 'transparent' }}
                            onClick={() => handleOpenEdit(t)}
                            title="Sửa báo cáo"
                          >
                            <Edit2 size={14} color="var(--accent-primary)" />
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '5px 7px', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}
                            onClick={() => setDeletingTx(t)}
                            title="Xóa báo cáo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modern Workspace-Centered Edit Modal via Portal */}
      {editingTx && createPortal(
        <div
          style={modalBackdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingTx(null);
          }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '520px',
              width: '92%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'var(--bg-card, #ffffff)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={22} color="var(--accent-primary)" />
                <h3 className="text-subtitle" style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>Sửa Báo Cáo / Điều Chỉnh</h3>
              </div>
              <button
                className="btn"
                style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setEditingTx(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'var(--bg-primary, rgba(0,0,0,0.03))', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <label className="text-subtitle" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Sản Phẩm Điều Chỉnh</label>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                  {productMap[editingTx.productId]?.name || editingTx.productId}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>SKU: {productMap[editingTx.productId]?.sku || 'N/A'}</div>
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>Số lượng ảnh hưởng</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  style={{ fontSize: '1rem', fontWeight: 600, padding: '0.65rem 0.85rem' }}
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>Lý do / Mô tả chi tiết</label>
                <textarea
                  className="form-input"
                  rows="3"
                  style={{ resize: 'none', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-outline" style={{ minWidth: '90px' }} onClick={() => setEditingTx(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '130px', gap: '6px' }}>
                  <Save size={16} /> {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Modern Workspace-Centered Confirm Delete Modal via Portal */}
      {deletingTx && createPortal(
        <div
          style={modalBackdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingTx(null);
          }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '440px',
              width: '92%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'var(--bg-card, #ffffff)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--danger-light, rgba(239, 68, 68, 0.15))',
                color: 'var(--danger, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                margin: '0 auto 1.25rem'
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Xác Nhận Xóa Báo Cáo?
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Bạn có chắc chắn muốn xóa báo cáo điều chỉnh cho sản phẩm <b style={{ color: 'var(--text-primary)' }}>"{productMap[deletingTx.productId]?.name || 'Sản phẩm'}"</b> không?<br />
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '4px', display: 'inline-block' }}>
                ⚠️ Thao tác này sẽ tự động hoàn tác số lượng tồn kho!
              </span>
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1, padding: '0.65rem 1rem' }}
                onClick={() => setDeletingTx(null)}
                disabled={deletingLoading}
              >
                Hủy Bỏ
              </button>
              <button
                className="btn"
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  background: 'var(--danger, #ef4444)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm, 8px)',
                  cursor: 'pointer'
                }}
                onClick={handleConfirmDelete}
                disabled={deletingLoading}
              >
                {deletingLoading ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StockAdjustment;
