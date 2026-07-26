import React, { useState, useEffect } from 'react';
import { Download, Database, Package, ArrowUpRight, ArrowDownRight, TrendingUp, PieChart } from 'lucide-react';
import apiClient from '../api/client';
import * as XLSX from 'xlsx';

const Reports = () => {
  const [reportData, setReportData] = useState(null);
  const [forecastTrends, setForecastTrends] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastDays, setForecastDays] = useState(7);

  useEffect(() => {
    fetchReport();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    fetchForecastTrends();
  }, [forecastDays]);

  const fetchReport = async () => {
    try {
      const response = await apiClient.get('/reports/summary');
      setReportData(response.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get('/reports/analytics', { params: { trendDays: 14 } });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchForecastTrends = async () => {
    try {
      setForecastLoading(true);
      const response = await apiClient.get('/reports/forecast-trends', {
        params: { topN: 5, days: forecastDays },
      });
      setForecastTrends(response.data);
    } catch (error) {
      console.error('Failed to fetch forecast trends:', error);
    } finally {
      setForecastLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng hợp tồn kho
    const summarySheet = XLSX.utils.json_to_sheet([
      {
        'Total Products': reportData.totalProducts,
        'Total Inventory Value (VND)': reportData.totalInventoryValue,
        'Total Inbound Quantity': reportData.totalImports,
        'Total Outbound Quantity': reportData.totalExports,
        'Low Stock Items': reportData.lowStock,
        'Report Date': new Date(reportData.reportDate).toLocaleString('en-US'),
      },
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary Report');

    // Sheet 2: Dự báo nhu cầu theo sản phẩm
    if (forecastTrends && forecastTrends.products && forecastTrends.products.length > 0) {
      const forecastSheet = XLSX.utils.json_to_sheet(
        forecastTrends.products.map((p) => ({
          Product: p.name,
          SKU: p.sku,
          'Current Stock': p.currentStock,
          'Total Outbound (history)': p.outboundTotal,
          [`Forecast Total (${forecastTrends.days} days)`]: p.totalForecast,
          'Avg Daily Forecast': p.avgDailyForecast,
        }))
      );
      XLSX.utils.book_append_sheet(wb, forecastSheet, 'Demand Forecast');
    }

    XLSX.writeFile(wb, `Inventory_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading report...</div>;

  const fmtVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

  const hasForecast = forecastTrends && forecastTrends.aggregatedTrend && forecastTrends.aggregatedTrend.length > 0;

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
      )}

      {/* ============ INVENTORY ANALYTICS ============ */}
      {analytics && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '2.5rem 0 1.25rem' }}>
            <PieChart size={24} color="var(--accent-primary)" />
            <h2 className="text-title" style={{ marginBottom: 0 }}>Inventory Analytics</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {/* Category breakdown */}
            <div className="glass-card">
              <h3 className="text-subtitle" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Value by Category</h3>
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Items</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.categoryBreakdown.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>No data</td></tr>
                    ) : analytics.categoryBreakdown.map((c) => (
                      <tr key={c.category}>
                        <td style={{ fontWeight: 600 }}>{c.category}</td>
                        <td style={{ textAlign: 'right' }}>{c.count}</td>
                        <td style={{ textAlign: 'right' }}>{c.totalQty}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{fmtVND(c.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top products by value */}
            <div className="glass-card">
              <h3 className="text-subtitle" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Top Products by Stock Value</h3>
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th style={{ textAlign: 'right' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topProductsByValue.length === 0 ? (
                      <tr><td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>No data</td></tr>
                    ) : analytics.topProductsByValue.map((p) => (
                      <tr key={p.sku}>
                        <td style={{ fontWeight: 600 }}>{p.name}<div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>{p.sku}</div></td>
                        <td style={{ textAlign: 'right' }}>{p.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{fmtVND(p.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ============ DEMAND FORECAST TRENDS (AI) ============ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', margin: '2.5rem 0 1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <TrendingUp size={24} color="var(--accent-primary)" />
          <h2 className="text-title" style={{ marginBottom: 0 }}>Demand Forecast Trends</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Horizon:</span>
          <select
            value={forecastDays}
            onChange={(e) => setForecastDays(Number(e.target.value))}
            className="form-input"
            style={{ width: 'auto', padding: '0.5rem 1rem' }}
          >
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
          </select>
        </div>
      </div>

      {forecastLoading ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
          Loading forecast data...
        </div>
      ) : hasForecast ? (
        <>
          {/* Per-product forecast table */}
          <div className="glass-card">
            <h3 className="text-subtitle" style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Top {forecastTrends.products.length} Products - Predicted Demand ({forecastTrends.days} days)
            </h3>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th style={{ textAlign: 'right' }}>Current Stock</th>
                    <th style={{ textAlign: 'right' }}>Outbound (history)</th>
                    <th style={{ textAlign: 'right' }}>Forecast Total</th>
                    <th style={{ textAlign: 'right' }}>Avg / Day</th>
                    <th style={{ textAlign: 'center' }}>Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastTrends.products.map((p) => {
                    // Cảnh báo: nếu dự báo nhu cầu vượt tồn kho hiện tại -> cần nhập thêm
                    const needRestock = p.totalForecast > p.currentStock;
                    return (
                      <tr key={p.productId}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{p.sku}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.currentStock}</td>
                        <td style={{ textAlign: 'right' }}>{p.outboundTotal}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{p.totalForecast}</td>
                        <td style={{ textAlign: 'right' }}>{p.avgDailyForecast}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="badge"
                            style={{
                              background: needRestock ? 'var(--danger-light)' : 'var(--success-light)',
                              color: needRestock ? 'var(--danger)' : 'var(--success)',
                              fontWeight: 600,
                            }}
                          >
                            {needRestock ? 'Restock' : 'Healthy'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
          Not enough outbound transaction history to generate demand forecasts yet.
        </div>
      )}
    </div>
  );
};

export default Reports;
