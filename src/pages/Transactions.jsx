import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Plus } from 'lucide-react';

const TRANSACTION_TYPES = ['INBOUND', 'OUTBOUND', 'TRANSFER', 'ADJUSTMENT'];

const emptyForm = {
  type: 'INBOUND',
  productId: '',
  quantity: '',
  locationFrom: '',
  locationTo: '',
  note: '',
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, prodRes] = await Promise.all([
        apiClient.get('/transactions'),
        apiClient.get('/inventory/products?limit=1000') // Fetch products for mapping
      ]);

      const list = (prodRes.data && prodRes.data.data) || [];
      const map = {};
      list.forEach(p => {
        map[p.id] = { name: p.name, sku: p.sku };
      });
      setProducts(list);
      setProductMap(map);
      setTransactions(transRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = () => {
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.productId || !form.quantity) {
      setFormError('Please select a product and enter a quantity.');
      return;
    }
    if (form.type === 'OUTBOUND' && !form.locationFrom) {
      setFormError('Please specify the source location for an outbound movement.');
      return;
    }
    if (form.type === 'INBOUND' && !form.locationTo) {
      setFormError('Please specify the destination location for an inbound movement.');
      return;
    }
    if (form.type === 'TRANSFER' && (!form.locationFrom || !form.locationTo)) {
      setFormError('Please specify both source and destination locations for a transfer.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/transactions', {
        type: form.type,
        productId: form.productId,
        quantity: Number(form.quantity),
        locationFrom: form.locationFrom || undefined,
        locationTo: form.locationTo || undefined,
        note: form.note || undefined,
      });
      setShowModal(false);
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 className="text-title">Transactions History</h2>
        <button className="btn btn-primary" onClick={openModal}>
          <Plus size={18} /> New Transaction
        </button>
      </div>

      <div className="glass-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id}>
                  <td>
                    <span className={`badge ${t.type === 'INBOUND' ? 'badge-success' : 'badge-danger'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {productMap[t.productId]?.name || 'Unknown Product'}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '2px' }}>
                      SKU: {productMap[t.productId]?.sku || t.productId}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{t.quantity}</td>
                  <td>
                    <span className="badge" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && !loading && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-title" style={{ fontSize: '1.5rem' }}>New Transaction</h3>
            <form onSubmit={handleCreateTransaction} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Type</label>
                <select
                  className="form-input"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                >
                  {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Product</label>
                <select
                  required
                  className="form-input"
                  value={form.productId}
                  onChange={e => setForm({ ...form, productId: e.target.value })}
                >
                  <option value="" disabled>Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Quantity</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="form-input"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                />
              </div>

              {(form.type === 'OUTBOUND' || form.type === 'TRANSFER') && (
                <div className="form-group mb-4">
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>From Location</label>
                  <input
                    type="text"
                    placeholder="e.g. DEFAULT_WAREHOUSE"
                    className="form-input"
                    value={form.locationFrom}
                    onChange={e => setForm({ ...form, locationFrom: e.target.value })}
                  />
                </div>
              )}

              {(form.type === 'INBOUND' || form.type === 'TRANSFER') && (
                <div className="form-group mb-4">
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>To Location</label>
                  <input
                    type="text"
                    placeholder="e.g. DEFAULT_WAREHOUSE"
                    className="form-input"
                    value={form.locationTo}
                    onChange={e => setForm({ ...form, locationTo: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Note</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                />
              </div>

              {formError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{formError}</div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Transaction'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
