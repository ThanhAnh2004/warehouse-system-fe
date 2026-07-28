import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Package, AlertTriangle, ArrowLeftRight, Database, TrendingUp, PieChart } from 'lucide-react';
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
    <div className="animate-slide-up">
      <h2 className="text-title mb-8">Tổng Quan Hệ Thống</h2>

      {reportData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="glass-card flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.5rem' }}>Tổng Số Sản Phẩm</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>{reportData.totalProducts}</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--accent-light)', color: 'var(--accent-primary)', borderRadius: '50%' }}>
              <Package size={32} />
            </div>
          </div>

          <div className="glass-card flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.5rem' }}>Tổng Giá Trị Tồn Kho</h3>
              <div style={{ fontSize: '1.6rem', fontWeight: '700', color: 'var(--text-primary)' }}>{fmtVND(reportData.totalInventoryValue)}</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', color: 'rgb(99, 102, 241)', borderRadius: '50%' }}>
              <Database size={32} />
            </div>
          </div>

          <div className="glass-card flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.5rem' }}>Mặt Hàng Cần Nhập Thêm</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--warning)' }}>{reportData.lowStock || 0}</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '50%' }}>
              <AlertTriangle size={32} />
            </div>
          </div>

          <div className="glass-card flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.5rem' }}>Tổng Giao Dịch</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--success)' }}>{reportData.totalImports + reportData.totalExports}</div>
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
          <h2 className="text-title" style={{ marginBottom: 0 }}>Biểu Đồ Dự Báo Nhu Cầu AI</h2>
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
      )
      }
    </div>
  );
};

export default Dashboard;
