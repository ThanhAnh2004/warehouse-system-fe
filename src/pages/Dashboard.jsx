import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Package, AlertTriangle, ArrowLeftRight } from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState({ totalProducts: 0, lowStock: 0, transactionsToday: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [summaryRes, analyticsRes] = await Promise.all([
          apiClient.get('/reports/summary'),
          apiClient.get('/reports/analytics'),
        ]);
        setData({
          totalProducts: summaryRes.data.totalProducts,
          lowStock: analyticsRes.data.lowStockCount,
          transactionsToday: summaryRes.data.totalImports + summaryRes.data.totalExports
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="animate-slide-up">
      <h2 className="text-title mb-8">Overview</h2>
      
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading data...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="glass-card flex justify-between items-center">
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.5rem' }}>Total Products</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {data.totalProducts}
              </div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--accent-light)', color: 'var(--accent-primary)', borderRadius: '50%' }}>
              <Package size={32} />
            </div>
          </div>
          
          <div className="glass-card flex justify-between items-center">
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.5rem' }}>Low Stock Alerts</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--warning)' }}>
                {data.lowStock}
              </div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '50%' }}>
              <AlertTriangle size={32} />
            </div>
          </div>
          
          <div className="glass-card flex justify-between items-center">
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.5rem' }}>Transactions</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--success)' }}>
                {data.transactionsToday}
              </div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '50%' }}>
              <ArrowLeftRight size={32} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
