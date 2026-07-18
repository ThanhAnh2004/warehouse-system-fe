import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Plus, Search } from 'lucide-react';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [newTransaction, setNewTransaction] = useState({
    productId: '',
    type: 'INBOUND',
    quantity: 1,
    locationFrom: 'DEFAULT_WAREHOUSE',
    locationTo: 'DEFAULT_WAREHOUSE',
    note: ''
  });

  const handleOpenModal = () => {
    setProductSearch('');
    if (products.length > 0) {
      setNewTransaction(prev => ({ ...prev, productId: products[0].id }));
    }
    setShowModal(true);
  };

  const filteredProductsForSelect = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Fetch products once on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const prodRes = await apiClient.get('/inventory/products?limit=1000');
        const map = {};
        const list = prodRes.data?.data || [];
        list.forEach(p => {
          map[p.id] = { name: p.name, sku: p.sku, price: parseFloat(p.price) || 0 };
        });
        setProductMap(map);
        setProducts(list);
        if (list.length > 0) {
          setNewTransaction(prev => ({ ...prev, productId: list[0].id }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProducts();
  }, []);

  // Fetch transactions on search, page, sort change
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const transRes = await apiClient.get('/transactions', {
          params: { page, limit: 10, search, sortBy, sortOrder }
        });
        setTransactions(transRes.data.data || []);
        setTotal(transRes.data.total || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [page, search, sortBy, sortOrder, refreshKey]);

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      const qty = parseInt(newTransaction.quantity, 10);
      // ADJUSTMENT cho phep so luong am (giam ton kho thuc te), cac loai con lai phai duong.
      if (isNaN(qty) || (newTransaction.type === 'ADJUSTMENT' ? qty === 0 : qty <= 0)) {
        alert(
          newTransaction.type === 'ADJUSTMENT'
            ? 'Please enter a non-zero quantity (negative to reduce stock).'
            : 'Please enter a valid quantity greater than 0'
        );
        return;
      }
      const payload = {
        productId: newTransaction.productId,
        type: newTransaction.type,
        quantity: qty,
        note: newTransaction.note
      };

      if (newTransaction.type === 'INBOUND') {
        payload.locationTo = newTransaction.locationTo;
      } else if (newTransaction.type === 'OUTBOUND') {
        payload.locationFrom = newTransaction.locationFrom;
      } else if (newTransaction.type === 'TRANSFER') {
        payload.locationFrom = newTransaction.locationFrom;
        payload.locationTo = newTransaction.locationTo;
      } else if (newTransaction.type === 'ADJUSTMENT') {
        // Backend chi yeu cau locationFrom HOAC locationTo - dung locationTo (kho dang dieu chinh).
        payload.locationTo = newTransaction.locationTo;
      }

      await apiClient.post('/transactions', payload);
      setShowModal(false);
      setProductSearch('');
      
      // Reset form (keep the first product selected)
      setNewTransaction({
        productId: products.length > 0 ? products[0].id : '',
        type: 'INBOUND',
        quantity: 1,
        locationFrom: 'DEFAULT_WAREHOUSE',
        locationTo: 'DEFAULT_WAREHOUSE',
        note: ''
      });
      
      setPage(1);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      alert('Error creating transaction: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 className="text-title">Transactions History</h2>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={18} /> New Transaction
        </button>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem', padding: '0.5rem' }}>
          <div className="search-box" style={{ flex: 1, maxWidth: '400px' }}>
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Search transactions..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }} 
            />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
            Total: {total} transactions
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('type')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Type {sortBy === 'type' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
                <th>Product</th>
                <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Quantity {sortBy === 'quantity' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
                <th>Value</th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Status {sortBy === 'status' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Date {sortBy === 'createdAt' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id}>
                  <td>
                    <span className={`badge ${t.type === 'INBOUND' ? 'badge-success' : 'badge-danger'}`}>
                      {t.type}
                    </span>
                  </td>
                   <td style={{ fontWeight: 600 }}>
                    {productMap[t.productId] ? productMap[t.productId].name : t.productId}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '2px' }}>
                      SKU: {productMap[t.productId] ? productMap[t.productId].sku : t.productId}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{t.quantity}</td>
                  <td>
                    {productMap[t.productId] ? (
                      <>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(productMap[t.productId].price * t.quantity)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(productMap[t.productId].price)}/unit
                        </div>
                      </>
                    ) : '-'}
                  </td>
                  <td>
                    <span className="badge" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {transactions.length === 0 && !loading && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No transactions found</td></tr>
              )}
            </tbody>
          </table>

          {Math.ceil(total / 10) > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', alignItems: 'center' }}>
              <button 
                className="btn btn-outline" 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Page <strong>{page}</strong> of <strong>{Math.ceil(total / 10)}</strong>
              </span>
              <button 
                className="btn btn-outline" 
                disabled={page === Math.ceil(total / 10)} 
                onClick={() => setPage(page + 1)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-title" style={{ fontSize: '1.5rem' }}>New Transaction</h3>
            <form onSubmit={handleCreateTransaction} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Product</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="🔍 Type product name or SKU to filter..." 
                  value={productSearch}
                  onChange={e => {
                    const searchVal = e.target.value;
                    setProductSearch(searchVal);
                    // Proactively set selected product to first match
                    const matched = products.filter(p =>
                      p.name?.toLowerCase().includes(searchVal.toLowerCase()) ||
                      p.sku?.toLowerCase().includes(searchVal.toLowerCase())
                    );
                    if (matched.length > 0) {
                      setNewTransaction(prev => ({ ...prev, productId: matched[0].id }));
                    }
                  }}
                  style={{ marginBottom: '0.5rem' }}
                />
                <select 
                  required
                  className="form-input" 
                  value={newTransaction.productId} 
                  onChange={e => setNewTransaction({ ...newTransaction, productId: e.target.value })}
                >
                  {filteredProductsForSelect.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                  {filteredProductsForSelect.length === 0 && (
                    <option value="" disabled>No products match your search</option>
                  )}
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Type</label>
                <select 
                  className="form-input" 
                  value={newTransaction.type} 
                  onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value })}
                >
                  <option value="INBOUND">INBOUND</option>
                  <option value="OUTBOUND">OUTBOUND</option>
                  <option value="TRANSFER">TRANSFER</option>
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>
                  Quantity {newTransaction.type === 'ADJUSTMENT' && <span style={{ fontWeight: 'normal' }}>(can be negative, e.g. -5 for shrinkage)</span>}
                </label>
                <input
                  required
                  type="number"
                  min={newTransaction.type === 'ADJUSTMENT' ? undefined : '1'}
                  className="form-input"
                  value={newTransaction.quantity}
                  onChange={e => {
                    const val = e.target.value;
                    setNewTransaction({ ...newTransaction, quantity: val === '' ? '' : parseInt(val, 10) });
                  }}
                />
              </div>

              {newTransaction.type !== 'INBOUND' && newTransaction.type !== 'ADJUSTMENT' && (
                <div className="form-group mb-4">
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Location From</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    value={newTransaction.locationFrom}
                    onChange={e => setNewTransaction({ ...newTransaction, locationFrom: e.target.value })}
                  />
                </div>
              )}

              {newTransaction.type !== 'OUTBOUND' && (
                <div className="form-group mb-4">
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Location To</label>
                  <input 
                    required
                    type="text" 
                    className="form-input" 
                    value={newTransaction.locationTo} 
                    onChange={e => setNewTransaction({ ...newTransaction, locationTo: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Note</label>
                <textarea 
                  className="form-input" 
                  value={newTransaction.note} 
                  onChange={e => setNewTransaction({ ...newTransaction, note: e.target.value })}
                  style={{ minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => { setShowModal(false); setProductSearch(''); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
