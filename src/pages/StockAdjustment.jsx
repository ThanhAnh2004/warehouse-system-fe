import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { ClipboardList, AlertTriangle, Send, PackageMinus, PackagePlus } from 'lucide-react';

/**
 * Báo cáo tác nghiệp cho Nhân viên kho (đề tài: "Cập nhật các sự cố hoặc thay đổi trạng thái
 * hàng hóa trực tiếp lên hệ thống").
 *
 * Mỗi loại sự cố được ánh xạ sang một giao dịch điều chỉnh tồn kho:
 *  - Hàng hỏng / mất / hết hạn  -> giảm tồn (OUTBOUND)
 *  - Tìm thấy thêm / kiểm kê tăng -> tăng tồn (INBOUND)
 * Ghi chú được đánh dấu "[ADJUSTMENT:<type>]" để phân biệt với nhập/xuất thông thường.
 *
 * Ghi chú nâng cấp: khi Transaction Service hỗ trợ type 'ADJUSTMENT' gốc, chỉ cần đổi
 * `type` gửi lên thành 'ADJUSTMENT' kèm quantity có dấu (âm/dương) - phần UI giữ nguyên.
 */
const ADJUSTMENT_TYPES = [
  { key: 'DAMAGED', label: 'Damaged goods', direction: 'OUTBOUND' },
  { key: 'LOST', label: 'Lost / Theft', direction: 'OUTBOUND' },
  { key: 'EXPIRED', label: 'Expired', direction: 'OUTBOUND' },
  { key: 'FOUND', label: 'Surplus found', direction: 'INBOUND' },
  { key: 'COUNT_ADD', label: 'Recount correction (+)', direction: 'INBOUND' },
  { key: 'COUNT_REMOVE', label: 'Recount correction (-)', direction: 'OUTBOUND' },
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
    if (!form.productId) return setMessage({ type: 'error', text: 'Please select a product.' });
    if (isNaN(qty) || qty <= 0) return setMessage({ type: 'error', text: 'Quantity must be greater than 0.' });
    if (!form.reason.trim()) return setMessage({ type: 'error', text: 'Please describe the incident / reason.' });

    const adjType = ADJUSTMENT_TYPES.find((t) => t.key === form.typeKey);
    const payload = {
      productId: form.productId,
      type: adjType.direction, // ánh xạ sang INBOUND/OUTBOUND (backend hiện tại)
      quantity: qty,
      note: `[ADJUSTMENT:${adjType.key}] ${form.reason.trim()}`,
    };
    if (adjType.direction === 'INBOUND') payload.locationTo = 'DEFAULT_WAREHOUSE';
    else payload.locationFrom = 'DEFAULT_WAREHOUSE';

    try {
      setSubmitting(true);
      await apiClient.post('/transactions', payload);
      setMessage({ type: 'success', text: `Adjustment recorded: ${adjType.label} (${adjType.direction === 'INBOUND' ? '+' : '-'}${qty}).` });
      setForm((f) => ({ ...f, quantity: 1, reason: '' }));
      fetchRecent();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to record adjustment.' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType = ADJUSTMENT_TYPES.find((t) => t.key === form.typeKey);

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <ClipboardList size={28} color="var(--accent-primary)" />
        <h1 className="text-title" style={{ marginBottom: 0 }}>Stock Adjustments & Incidents</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Form */}
        <div className="glass-card">
          <h3 className="text-subtitle" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Report an incident</h3>

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
              <label className="text-subtitle" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Product</label>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 Filter by name or SKU..."
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
                {filteredProducts.length === 0 && <option value="" disabled>No products match</option>}
              </select>
            </div>

            <div>
              <label className="text-subtitle" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Incident type</label>
              <select className="form-input" value={form.typeKey} onChange={(e) => setForm({ ...form, typeKey: e.target.value })}>
                {ADJUSTMENT_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {selectedType.direction === 'INBOUND'
                  ? <><PackagePlus size={15} color="var(--success)" /> Increases stock (+)</>
                  : <><PackageMinus size={15} color="var(--danger)" /> Decreases stock (-)</>}
              </div>
            </div>

            <div>
              <label className="text-subtitle" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Quantity affected</label>
              <input required type="number" min="1" className="form-input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>

            <div>
              <label className="text-subtitle" style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.35rem' }}>Reason / description</label>
              <textarea required className="form-input" rows="3" style={{ resize: 'none', fontFamily: 'inherit' }} placeholder="e.g. 3 units damaged during unloading" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: '0.5rem' }}>
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>

        {/* Recent adjustments */}
        <div className="glass-card">
          <h3 className="text-subtitle" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Recent adjustments</h3>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                ) : recent.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No adjustments recorded yet.</td></tr>
                ) : recent.map((t, idx) => {
                  const isIn = t.type === 'INBOUND';
                  const reason = t.note.replace(/^\[ADJUSTMENT:[^\]]*\]\s*/, '');
                  const typeLabel = (t.note.match(/^\[ADJUSTMENT:([^\]]*)\]/) || [])[1] || '-';
                  return (
                    <tr key={t.id}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                      <td>
                        <span className={`badge ${isIn ? 'badge-success' : 'badge-danger'}`}>{typeLabel}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {productMap[t.productId]?.name || t.productId}
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{productMap[t.productId]?.sku || ''}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: isIn ? 'var(--success)' : 'var(--danger)' }}>{isIn ? '+' : '-'}{t.quantity}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{reason}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{new Date(t.createdAt).toLocaleString()}</td>
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
