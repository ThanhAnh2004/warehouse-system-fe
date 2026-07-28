import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { ClipboardList, AlertTriangle, Send, PackageMinus, PackagePlus } from 'lucide-react';

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
      const res = await apiClient.get('/transactions', { params: { limit: 100, sortBy: 'createdAt', sortOrder: 'DESC' } });
      const all = res.data?.data || [];
      setRecent(all.filter((t) => typeof t.note === 'string' && t.note.startsWith('[ADJUSTMENT')));
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
    const payload = {
      productId: form.productId,
      type: adjType.direction,
      quantity: qty,
      note: `[ADJUSTMENT:${adjType.key}] ${form.reason.trim()}`,
    };
    if (adjType.direction === 'INBOUND') payload.locationTo = 'Z-STD-A01-R01-S1-A';
    else payload.locationFrom = 'Z-STD-A01-R01-S1-A';

    try {
      setSubmitting(true);
      await apiClient.post('/transactions', payload);
      setMessage({ type: 'success', text: `Đã ghi nhận điều chỉnh: ${adjType.label} (${adjType.direction === 'INBOUND' ? '+' : '-'}${qty}).` });
      setForm((f) => ({ ...f, quantity: 1, reason: '' }));
      fetchRecent();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Ghi nhận điều chỉnh thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = ADJUSTMENT_TYPES.find((t) => t.key === form.typeKey);

  return (
    <div className="animate-slide-up">
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
                  <th>Loại</th>
                  <th>Sản Phẩm</th>
                  <th style={{ textAlign: 'right' }}>Số Lượng</th>
                  <th>Lý Do / Ghi Chú</th>
                  <th>Thời Gian</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải...</td></tr>
                ) : recent.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Chưa có báo cáo điều chỉnh nào.</td></tr>
                ) : recent.map((t, idx) => {
                  const isIn = t.type === 'INBOUND';
                  const reason = t.note.replace(/^\[ADJUSTMENT:[^\]]*\]\s*/, '');
                  const typeKey = (t.note.match(/^\[ADJUSTMENT:([^\]]*)\]/) || [])[1] || '-';
                  const typeMeta = ADJUSTMENT_TYPES.find(a => a.key === typeKey);
                  return (
                    <tr key={t.id}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                      <td>
                        <span className={`badge ${isIn ? 'badge-success' : 'badge-danger'}`}>{typeMeta?.label || typeKey}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {productMap[t.productId]?.name || t.productId}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{productMap[t.productId]?.sku || ''}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: isIn ? 'var(--success)' : 'var(--danger)' }}>{isIn ? '+' : '-'}{t.quantity}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{reason}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(t.createdAt).toLocaleString('vi-VN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockAdjustment;
