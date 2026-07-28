import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../api/client';
import { Package, AlertTriangle, ArrowLeftRight, Database, TrendingUp, PieChart, ShoppingCart } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const fmtVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

const Dashboard = () => {
  const [reportData, setReportData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [forecastTrends, setForecastTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastDays, setForecastDays] = useState(7);
  const [showLowStockModal, setShowLowStockModal] = useState(false);

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
      console.error('Failed to fetch dashboard summary:', error);
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

  const chartData = reportData ? {
    labels: ['Tổng Nhập Kho', 'Tổng Xuất Kho'],
    datasets: [
      {
        label: 'Số lượng Sản phẩm',
        data: [reportData.totalImports, reportData.totalExports],
        backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(249, 115, 22, 0.7)'],
        borderColor: ['rgb(16, 185, 129)', 'rgb(249, 115, 22)'],
        borderWidth: 1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: 'var(--text-primary)' } },
      title: { display: true, text: 'Tỷ lệ Tương quan Nhập / Xuất Kho', font: { size: 16 }, color: 'var(--text-primary)' },
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: 'var(--text-secondary)' } },
      x: { ticks: { color: 'var(--text-secondary)' } },
    },
  };

  const stockStatusData = analytics ? {
    labels: ['Tồn An Toàn', 'Thiếu Tồn Kho'],
    datasets: [
      {
        data: [analytics.stockStatus.healthy, analytics.stockStatus.low],
        backgroundColor: ['rgba(5, 150, 105, 0.75)', 'rgba(220, 38, 38, 0.75)'],
        borderColor: ['rgb(5, 150, 105)', 'rgb(220, 38, 38)'],
        borderWidth: 1,
      },
    ],
  } : null;

  const stockStatusOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: 'var(--text-primary)' } },
      title: { display: true, text: 'Phân Bố Trạng Thái Tồn Kho', font: { size: 16 }, color: 'var(--text-primary)' },
    },
  };

  const trendData = analytics ? {
    labels: analytics.transactionTrend.map((d) => d.date.slice(5)),
    datasets: [
      {
        label: 'Nhập kho',
        data: analytics.transactionTrend.map((d) => d.inbound),
        borderColor: 'rgb(5, 150, 105)',
        backgroundColor: 'rgba(5, 150, 105, 0.15)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Xuất kho',
        data: analytics.transactionTrend.map((d) => d.outbound),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.15)',
        tension: 0.3,
        fill: true,
      },
    ],
  } : null;

  const trendOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: 'var(--text-primary)' } },
      title: { display: true, text: `Xu Hướng Biến Động Nhập / Xuất (${analytics?.trendDays ?? 14} ngày gần nhất)`, font: { size: 16 }, color: 'var(--text-primary)' },
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: 'var(--text-secondary)' } },
      x: { ticks: { color: 'var(--text-secondary)' } },
    },
  };

  const hasForecast = forecastTrends && forecastTrends.aggregatedTrend && forecastTrends.aggregatedTrend.length > 0;

  const forecastChartData = hasForecast ? {
    labels: forecastTrends.aggregatedTrend.map((d) => d.date),
    datasets: [
      {
        label: 'Nhu cầu Dự báo Tổng cộng (Đơn vị sản phẩm)',
        data: forecastTrends.aggregatedTrend.map((d) => d.predictedQuantity),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: 'rgb(99, 102, 241)',
      },
    ],
  } : null;

  const forecastChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: 'var(--text-primary)' } },
      title: {
        display: true,
        text: `Dự Báo Xu Hướng Nhu Cầu Tiêu Thụ - ${forecastTrends?.days ?? 7} Ngày Tới`,
        font: { size: 16 },
        color: 'var(--text-primary)',
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: 'var(--text-secondary)' } },
      x: { ticks: { color: 'var(--text-secondary)' } },
    },
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải bảng tổng quan...</div>;
  }

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <h2 className="text-title mb-8">Tổng Quan Hệ Thống</h2>

      {reportData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-card flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.5rem' }}>Tổng Số Loại Sản Phẩm</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>{reportData.totalProducts}</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--accent-light)', color: 'var(--accent-primary)', borderRadius: '50%' }}>
              <Package size={32} />
            </div>
          </div>

          {/* CARD 2: REPLACED "Tổng Giá Trị Tồn Kho" WITH "Tổng Số Lượng Sản Phẩm (Tồn Kho)" */}
          <div className="glass-card flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.5rem' }}>Tổng Số Lượng Sản Phẩm</h3>
              <div style={{ fontSize: '2.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {(reportData.totalStockQuantity || 0).toLocaleString('vi-VN')} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>món</span>
              </div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', color: 'rgb(99, 102, 241)', borderRadius: '50%' }}>
              <Database size={32} />
            </div>
          </div>

          {/* CARD 3: CLICKABLE "Mặt Hàng Cần Nhập Thêm" */}
          <div
            className="glass-card flex justify-between items-center"
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '2px solid rgba(245, 158, 11, 0.4)',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)'
            }}
            onClick={() => setShowLowStockModal(true)}
            title="Click để xem chi tiết các mặt hàng cần nhập thêm"
          >
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.5rem' }}>Mặt Hàng Cần Nhập Thêm</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--warning)' }}>{reportData.lowStock || 0}</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '50%' }}>
              <AlertTriangle size={32} />
            </div>
          </div>

          {/* CARD 4: REPLACED "Tổng Giao Dịch" WITH "Tổng Giao Dịch Trong Tháng" */}
          <div className="glass-card flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.5rem' }}>Tổng Giao Dịch Trong Tháng</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--success)' }}>
                {(reportData.monthlyTransactionsCount ?? (reportData.totalImports + reportData.totalExports)).toLocaleString('vi-VN')}
              </div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '50%' }}>
              <ArrowLeftRight size={32} />
            </div>
          </div>
        </div>
      )}

      {/* ============ CHARTS ============ */}
      {analytics && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0.5rem 0 1.25rem' }}>
            <PieChart size={24} color="var(--accent-primary)" />
            <h2 className="text-title" style={{ marginBottom: 0 }}>Biểu Đồ Phân Tích Kho Hàng</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ maxWidth: '320px', width: '100%' }}>
                {stockStatusData && <Doughnut options={stockStatusOptions} data={stockStatusData} />}
              </div>
            </div>
            <div className="glass-card">
              {trendData && <Line options={trendOptions} data={trendData} />}
            </div>
          </div>

          <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto 2rem' }}>
            {chartData && <Bar options={chartOptions} data={chartData} />}
          </div>
        </>
      )}

      {/* ============ DEMAND FORECAST ============ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', margin: '2.5rem 0 1.25rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <TrendingUp size={24} color="var(--accent-primary)" />
          <h2 className="text-title" style={{ marginBottom: 0 }}>Biểu Đồ Dự Đoán Nhu Cầu Tiêu Thụ</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Thời gian dự báo:</span>
          <select
            value={forecastDays}
            onChange={(e) => setForecastDays(Number(e.target.value))}
            className="form-input"
            style={{ width: 'auto', padding: '0.5rem 1rem' }}
          >
            <option value={7}>7 ngày tới</option>
            <option value={14}>14 ngày tới</option>
            <option value={30}>30 ngày tới</option>
          </select>
        </div>
      </div>

      {forecastLoading ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
          Đang tính toán dữ liệu dự báo...
        </div>
      ) : hasForecast ? (
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <Line options={forecastChartOptions} data={forecastChartData} />
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
          Chưa đủ lịch sử giao dịch xuất kho để tạo biểu đồ dự báo nhu cầu.
        </div>
      )}

      {/* LOW STOCK ITEMS MODAL */}
      {showLowStockModal && ReactDOM.createPortal(
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) setShowLowStockModal(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
        >
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '780px', maxHeight: '85vh', overflowY: 'auto', padding: '1.75rem', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={24} color="var(--warning)" />
                <div>
                  <h3 className="text-title" style={{ fontSize: '1.3rem', margin: 0 }}>Danh Sách Mặt Hàng Cần Nhập Thêm</h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Các sản phẩm có số lượng tồn kho dưới ngưỡng an toàn (Min Stock Level)
                  </span>
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => setShowLowStockModal(false)}>✕ Đóng</button>
            </div>

            {reportData?.lowStockItems && reportData.lowStockItems.length > 0 ? (
              <div className="table-container" style={{ marginTop: '1rem' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>SẢN PHẨM</th>
                      <th>DANH MỤC</th>
                      <th>TỒN HIỆN TẠI</th>
                      <th>NGƯỠNG AN TOÀN</th>
                      <th>CẦN BỔ SUNG</th>
                      <th>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.lowStockItems.map(p => {
                      const curQty = p.quantity || 0;
                      const minVal = p.minStockLevel ?? 20;
                      const needVal = Math.max(0, minVal - curQty);

                      return (
                        <tr key={p.id}>
                          <td>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{p.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>SKU: {p.sku}</div>
                          </td>
                          <td>
                            <span className="badge badge-primary" style={{ fontSize: '0.78rem' }}>{p.category || 'Điện tử'}</span>
                          </td>
                          <td>
                            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700, padding: '0.35rem 0.75rem' }}>
                              🔴 {curQty} món
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{minVal} món</td>
                          <td style={{ fontWeight: 700, color: 'var(--warning)' }}>+{needVal} món</td>
                          <td>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => {
                                window.location.href = `/transactions`;
                              }}
                            >
                              <ShoppingCart size={14} /> Nhập Hàng
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                🎉 Tất cả sản phẩm đều đang đạt ngưỡng tồn kho an toàn!
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Dashboard;
