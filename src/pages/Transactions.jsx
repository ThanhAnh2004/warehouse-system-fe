import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Plus } from 'lucide-react';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [transRes, prodRes] = await Promise.all([
          apiClient.get('/transactions'),
          apiClient.get('/inventory/products?limit=1000') // Fetch products for mapping
        ]);
        
        const map = {};
        if (prodRes.data && prodRes.data.data) {
          prodRes.data.data.forEach(p => {
            map[p.sku] = p.name;
          });
        }
        setProductMap(map);
        setTransactions(transRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 className="text-title">Transactions History</h2>
        <button className="btn btn-primary">
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
                    {productMap[t.productId] || t.productId}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '2px' }}>
                      SKU: {t.productId}
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
    </div>
  );
};

export default Transactions;
