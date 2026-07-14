import React, { useState, useEffect } from 'react';
import { Download, FileText, Database, Package, ArrowUpRight, ArrowDownRight, AlertTriangle, TrendingUp } from 'lucide-react';
import apiClient from '../api/client';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const [reportData, setReportData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const [summaryRes, analyticsRes] = await Promise.all([
        apiClient.get('/reports/summary'),
        apiClient.get('/reports/analytics'),
      ]);
      setReportData(summaryRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const ws = XLSX.utils.json_to_sheet([
      {
        'Total Products': reportData.totalProducts,
        'Total Inventory Value (VND)': reportData.totalInventoryValue,
        'Total Inbound Quantity': reportData.totalImports,
        'Total Outbound Quantity': reportData.totalExports,
        'Report Date': new Date(reportData.reportDate).toLocaleString('en-US')
      }
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary Report");
    XLSX.writeFile(wb, `Inventory_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading report...</div>;

  const chartData = reportData ? {
    labels: ['Total Inbound', 'Total Outbound'],
    datasets: [
      {
        label: 'Product Quantity',
        data: [reportData.totalImports, reportData.totalExports],
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)', // Green
          'rgba(249, 115, 22, 0.7)', // Orange
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(249, 115, 22)',
        ],
        borderWidth: 1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: 'var(--text-primary)' }
      },
      title: {
        display: true,
        text: 'Inbound / Outbound Ratio',
        font: { size: 16 },
        color: 'var(--text-primary)'
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: 'var(--text-secondary)' }
      },
      x: {
        ticks: { color: 'var(--text-secondary)' }
      }
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1 className="text-title">Summary Report</h1>
        <button
          onClick={exportToExcel}
          className="btn btn-primary"
          style={{ display: 'flex', gap: '0.5rem', background: 'var(--success)' }}
        >
          <Download size={20} />
          Export Excel
        </button>
      </div>

      {reportData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-card flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="text-subtitle" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Total Products</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{reportData.totalProducts}</h3>
              </div>
              <div style={{ padding: '1rem', background: 'var(--accent-light)', color: 'var(--accent-primary)', borderRadius: '50%' }}>
                <Package size={24} />
              </div>
            </div>

            <div className="glass-card flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="text-subtitle" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Inventory Value</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(reportData.totalInventoryValue)}
                </h3>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', color: 'rgb(99, 102, 241)', borderRadius: '50%' }}>
                <Database size={24} />
              </div>
            </div>

            <div className="glass-card flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="text-subtitle" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Total Inbound Qty</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{reportData.totalImports}</h3>
              </div>
              <div style={{ padding: '1rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '50%' }}>
                <ArrowDownRight size={24} />
              </div>
            </div>

            <div className="glass-card flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="text-subtitle" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Total Outbound Qty</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>{reportData.totalExports}</h3>
              </div>
              <div style={{ padding: '1rem', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '50%' }}>
                <ArrowUpRight size={24} />
              </div>
            </div>
          </div>

          {/* Biểu đồ Chart.js */}
          <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '2rem' }}>
            {chartData && <Bar options={chartOptions} data={chartData} />}
          </div>

          {/* Aggregate Demand Forecast */}
          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <TrendingUp size={22} color="var(--accent-primary)" />
              <h3 className="text-title" style={{ fontSize: '1.25rem' }}>Demand Forecast Trend (Next 7 Days, All Products)</h3>
            </div>

            {analytics?.forecastAvailable && analytics.demandForecast.length > 0 ? (
              <div style={{ width: '100%', height: '320px' }}>
                <ResponsiveContainer>
                  <LineChart data={analytics.demandForecast} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    />
                    <RechartsLegend />
                    <Line type="monotone" dataKey="predictedQuantity" stroke="var(--accent-primary)" strokeWidth={3} activeDot={{ r: 8 }} name="Total Predicted Demand" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                Forecasting service unavailable or not enough transaction history yet to build a demand forecast.
              </div>
            )}
          </div>

          {/* Inventory Status */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={22} color="var(--warning)" />
                <h3 className="text-title" style={{ fontSize: '1.25rem' }}>Inventory Status</h3>
              </div>
              {analytics && (
                <span className="badge badge-danger">{analytics.lowStockCount} low stock</span>
              )}
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Current Stock</th>
                    <th title="Economic Order Quantity - reorder threshold">EOQ</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.inventoryStatus?.length ? analytics.inventoryStatus.map(item => (
                    <tr key={item.productId}>
                      <td><strong>{item.sku}</strong></td>
                      <td>{item.name}</td>
                      <td style={{ fontWeight: 700 }}>{item.currentStock}</td>
                      <td>{item.eoq ?? 'N/A'}</td>
                      <td>
                        <span className={`badge ${item.lowStock ? 'badge-danger' : 'badge-success'}`}>
                          {item.lowStock ? 'Low Stock' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No products found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
