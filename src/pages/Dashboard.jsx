import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../api/client';
import {
  Package,
  AlertTriangle,
  ArrowLeftRight,
  Database,
  TrendingUp,
  PieChart,
  Layers,
  Plus,
  Search,
  CheckCircle,
  BarChart3,
  DollarSign
} from 'lucide-react';
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
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastDays, setForecastDays] = useState(7);

  // Low stock & transaction modals state
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showCreateTxModal, setShowCreateTxModal] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [submittingTx, setSubmittingTx] = useState(false);
  const [newTxForm, setNewTxForm] = useState({
    productId: '',
    type: 'INBOUND',
    quantity: 1,
    note: ''
  });

  useEffect(() => {
    fetchReport();
    fetchAnalytics();
    fetchLocations();
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

  const fetchLocations = async () => {
    try {
      const res = await apiClient.get('/inventory/locations');
      setLocations(res.data || []);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
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

  const fetchProductsList = async () => {
    try {
      const res = await apiClient.get('/inventory/products?limit=1000');
      setProductsList(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch products list:', err);
    }
  };

  const handleOpenInboundModal = (p) => {
    if (productsList.length === 0) fetchProductsList();
    const minVal = p.minStockLevel ?? 10;
    const curQty = p.quantity || 0;
    const needVal = Math.max(1, minVal - curQty);

    setProductSearch('');
    setNewTxForm({
      productId: p.id,
      type: 'INBOUND',
      quantity: needVal,
      note: `Nhập bổ sung tồn kho an toàn cho sản phẩm ${p.name} (SKU: ${p.sku})`
    });
    setShowCreateTxModal(true);
  };

  const handleCreateTxSubmit = async (e) => {
    e.preventDefault();
    if (!newTxForm.productId) {
      alert('Vui lòng chọn sản phẩm!');
      return;
    }
    if (!newTxForm.quantity || Number(newTxForm.quantity) <= 0) {
      alert('Số lượng nhập phải lớn hơn 0!');
      return;
    }

    try {
      setSubmittingTx(true);
      const payload = {
        productId: newTxForm.productId,
        type: newTxForm.type,
        quantity: Number(newTxForm.quantity),
        note: newTxForm.note,
        locationTo: 'DEFAULT_WAREHOUSE',
      };

      await apiClient.post('/transactions', payload);
      alert('🎉 Tạo giao dịch nhập kho thành công!');
      setShowCreateTxModal(false);

      fetchReport();
      fetchAnalytics();
    } catch (err) {
      alert('Lỗi tạo giao dịch: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingTx(false);
    }
  };

  // Zone capacity metric helper
  const getZoneMetric = (prefix) => {
    const locs = locations.filter(l => l.code.startsWith(prefix));
    if (locs.length === 0) return { count: 0, used: 0, max: 100, rate: 0 };
    const used = locs.reduce((sum, l) => sum + (l.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0), 0);
    const max = locs.reduce((sum, l) => sum + (l.maxCapacity || 60), 0);
    const rate = max > 0 ? Math.round((used / max) * 100) : 0;
    return { count: locs.length, used, max, rate };
  };

  const zoneA = getZoneMetric('A');
  const zoneB = getZoneMetric('B');
  const zoneC = getZoneMetric('C');
  const zoneD = getZoneMetric('D');

  const chartData = reportData ? {
    labels: ['Tổng Nhập Kho', 'Tổng Xuất Kho'],
    datasets: [
      {
        label: 'Số lượng Sản phẩm',
        data: [reportData.totalImports, reportData.totalExports],
        backgroundColor: ['rgba(16, 185, 129, 0.75)', 'rgba(249, 115, 22, 0.75)'],
        borderColor: ['rgb(16, 185, 129)', 'rgb(249, 115, 22)'],
        borderWidth: 1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: 'var(--text-primary)' } },
      title: { display: true, text: 'Tỷ lệ Tương quan Nhập / Xuất Kho', font: { size: 15 }, color: 'var(--text-primary)' },
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
        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
        borderColor: ['rgb(16, 185, 129)', 'rgb(239, 68, 68)'],
        borderWidth: 1,
      },
    ],
  } : null;

  const stockStatusOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { color: 'var(--text-primary)' } },
      title: { display: true, text: 'Phân Bố Trạng Thái Tồn Kho', font: { size: 15 }, color: 'var(--text-primary)' },
    },
  };

  const trendData = analytics ? {
    labels: analytics.transactionTrend.map((d) => d.date.slice(5)),
    datasets: [
      {
        label: 'Nhập kho',
        data: analytics.transactionTrend.map((d) => d.inbound),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
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
      title: { display: true, text: `Xu Hướng Biến Động Nhập / Xuất (${analytics?.trendDays ?? 14} ngày gần nhất)`, font: { size: 15 }, color: 'var(--text-primary)' },
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
        label: 'Nhu cầu Dự báo Tổng cộng (Món)',
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
        text: `Dự Báo Nhu Cầu Tiêu Thụ (${forecastTrends?.days ?? 7} Ngày Tới)`,
        font: { size: 15 },
        color: 'var(--text-primary)',
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { color: 'var(--text-secondary)' } },
      x: { ticks: { color: 'var(--text-secondary)' } },
    },
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải tổng quan hệ thống...</div>;
  }

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* HEADER BAR */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="text-title" style={{ margin: 0 }}>Tổng Quan Hệ Thống Kho Hàng</h1>
        <p className="text-subtitle" style={{ fontSize: '0.88rem', marginTop: '0.35rem' }}>
          Báo cáo tổng hợp số liệu tồn kho, phân bố không gian lưu trữ & biểu đồ phân tích thời gian thực.
        </p>
      </div>

      {/* TOP 4 EXECUTIVE KPI CARDS */}
      {reportData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          {/* CARD 1: TOTAL SKUs */}
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.35rem', fontSize: '0.85rem' }}>Tổng Số Loại Sản Phẩm</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{reportData.totalProducts}</div>
            </div>
            <div style={{ padding: '0.9rem', background: 'var(--accent-light)', color: 'var(--accent-primary)', borderRadius: '12px' }}>
              <Package size={32} />
            </div>
          </div>

          {/* CARD 2: TOTAL STOCK QUANTITY */}
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.35rem', fontSize: '0.85rem' }}>Tổng Số Lượng Sản Phẩm</h3>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {(reportData.totalStockQuantity || 0).toLocaleString('vi-VN')} <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 600 }}>món</span>
              </div>
            </div>
            <div style={{ padding: '0.9rem', background: 'rgba(99, 102, 241, 0.12)', color: 'rgb(99, 102, 241)', borderRadius: '12px' }}>
              <Database size={32} />
            </div>
          </div>

          {/* CARD 3: REORDER NEEDED (CLICKABLE MODAL) */}
          <div
            className="glass-card"
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              padding: '1.25rem',
              cursor: 'pointer',
              border: '2px solid rgba(245, 158, 11, 0.5)',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)',
              transition: 'transform 0.15s ease'
            }}
            onClick={() => setShowLowStockModal(true)}
            title="Nhấp để xem danh sách mặt hàng cần nhập thêm"
          >
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.35rem', fontSize: '0.85rem' }}>Mặt Hàng Cần Nhập Thêm</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warning)' }}>{reportData.lowStock || 0}</div>
            </div>
            <div style={{ padding: '0.9rem', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '12px' }}>
              <AlertTriangle size={32} />
            </div>
          </div>

          {/* CARD 4: MONTHLY TRANSACTIONS COUNT */}
          <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
            <div>
              <h3 className="text-subtitle" style={{ marginBottom: '0.35rem', fontSize: '0.85rem' }}>Tổng Giao Dịch Trong Tháng</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)' }}>
                {(reportData.monthlyTransactionsCount ?? (reportData.totalImports + reportData.totalExports)).toLocaleString('vi-VN')}
              </div>
            </div>
            <div style={{ padding: '0.9rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '12px' }}>
              <ArrowLeftRight size={32} />
            </div>
          </div>
        </div>
      )}

      {/* OVERVIEW RACK OCCUPANCY SUMMARY */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid var(--accent-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <Layers size={24} color="var(--accent-primary)" />
          <div>
            <h3 className="text-title" style={{ fontSize: '1.15rem', margin: 0 }}>Tổng Quan Tỷ Lệ Lấp Đầy Kho (Rack Capacity Overview)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Phân bố dung lượng không gian lưu trữ hiện tại theo 4 phân khu kệ kho chính</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* ZONE A */}
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#10b981' }}>[KỆ A] HÀNG GIÁ TRỊ CAO</span>
              <span className="badge" style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>{zoneA.rate}% sử dụng</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>6 Tầng A01 ➔ A06 (Laptop & Smartphones)</div>
            <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
              <div style={{ width: `${zoneA.rate}%`, height: '100%', background: '#10b981' }}></div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Đã lưu: <b>{zoneA.used} món</b></span>
              <span>Còn trống: <b style={{ color: '#10b981' }}>{Math.max(0, zoneA.max - zoneA.used)} chỗ</b></span>
            </div>
          </div>

          {/* ZONE B */}
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#3b82f6' }}>[KỆ B] ĐIỆN TỬ CỠ LỚN</span>
              <span className="badge" style={{ background: '#3b82f6', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>{zoneB.rate}% sử dụng</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>8 Tầng B01 ➔ B08 (Tivi & Tủ Lạnh)</div>
            <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
              <div style={{ width: `${zoneB.rate}%`, height: '100%', background: '#3b82f6' }}></div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Đã lưu: <b>{zoneB.used} món</b></span>
              <span>Còn trống: <b style={{ color: '#3b82f6' }}>{Math.max(0, zoneB.max - zoneB.used)} chỗ</b></span>
            </div>
          </div>

          {/* ZONE C */}
          <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#8b5cf6' }}>[KỆ C] KHU MẬT ĐỘ CAO</span>
              <span className="badge" style={{ background: '#8b5cf6', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>{zoneC.rate}% sử dụng</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>4 Tầng C01 ➔ C04 (Bàn phím & Tai nghe)</div>
            <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
              <div style={{ width: `${zoneC.rate}%`, height: '100%', background: '#8b5cf6' }}></div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Đã lưu: <b>{zoneC.used} món</b></span>
              <span>Còn trống: <b style={{ color: '#8b5cf6' }}>{Math.max(0, zoneC.max - zoneC.used)} chỗ</b></span>
            </div>
          </div>

          {/* ZONE D */}
          <div style={{ padding: '1rem', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#06b6d4' }}>[KỆ D] PHÒNG SẠCH ESD</span>
              <span className="badge" style={{ background: '#06b6d4', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>{zoneD.rate}% sử dụng</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>2 Tầng D01 ➔ D02 (Vi Xử Lý & Chipset)</div>
            <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
              <div style={{ width: `${zoneD.rate}%`, height: '100%', background: '#06b6d4' }}></div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Đã lưu: <b>{zoneD.used} món</b></span>
              <span>Còn trống: <b style={{ color: '#06b6d4' }}>{Math.max(0, zoneD.max - zoneD.used)} chỗ</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ ANALYTICS CHARTS SECTION ============ */}
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

      {/* ============ DEMAND FORECAST CHARTS ============ */}
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
            style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
          >
            <option value={7}>7 ngày tới</option>
            <option value={14}>14 ngày tới</option>
            <option value={30}>30 ngày tới</option>
          </select>
        </div>
      </div>

      {forecastLoading ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
          Đang tính toán dữ liệu dự báo nhu cầu...
        </div>
      ) : hasForecast ? (
        <div className="glass-card" style={{ marginBottom: '1rem' }}>
          <Line options={forecastChartOptions} data={forecastChartData} />
        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
          Chưa đủ dữ liệu lịch sử giao dịch xuất kho để tạo biểu đồ dự báo nhu cầu.
        </div>
      )}

      {/* LOW STOCK ITEMS MODAL */}
      {showLowStockModal && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: window.innerWidth <= 768 ? 0 : 'var(--sidebar-width, 280px)',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLowStockModal(false); }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '980px',
              width: '95%',
              maxHeight: '88vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'var(--bg-card, #ffffff)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={26} color="var(--warning)" />
                <div>
                  <h3 className="text-title" style={{ fontSize: '1.35rem', margin: 0, color: 'var(--text-primary)' }}>Danh Sách Mặt Hàng Cần Nhập Thêm</h3>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Các sản phẩm có số lượng tồn kho dưới ngưỡng an toàn (Min Stock Level)
                  </span>
                </div>
              </div>
              <button className="btn btn-outline" onClick={() => setShowLowStockModal(false)}>✕ Đóng</button>
            </div>

            {reportData?.lowStockItems && reportData.lowStockItems.length > 0 ? (
              <div className="table-container">
                <table className="data-table" style={{ width: '100%', fontSize: '0.88rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', width: '50px' }}>STT</th>
                      <th>Sản Phẩm</th>
                      <th>Danh Mục</th>
                      <th style={{ textAlign: 'center' }}>Tồn Hiện Tại</th>
                      <th style={{ textAlign: 'center' }}>Ngưỡng An Toàn</th>
                      <th style={{ textAlign: 'center' }}>Cần Bổ Sung</th>
                      <th style={{ textAlign: 'right' }}>Đơn Giá</th>
                      <th style={{ textAlign: 'right' }}>Chi Phí Dự Kiến</th>
                      <th style={{ textAlign: 'center' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.lowStockItems.map((p, index) => {
                      const minVal = p.minStockLevel ?? 10;
                      const curQty = p.quantity || 0;
                      const needQty = Math.max(0, minVal - curQty);
                      const unitPrice = parseFloat(p.price) || 0;
                      const estCost = needQty * unitPrice;

                      return (
                        <tr key={p.id || index}>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{index + 1}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SKU: {p.sku}</div>
                          </td>
                          <td>
                            <span className="badge badge-outline" style={{ fontSize: '0.75rem' }}>{p.category || 'Khác'}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge badge-danger" style={{ fontWeight: 700 }}>{curQty} món</span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{minVal} món</td>
                          <td style={{ textAlign: 'center' }}>
                            <strong style={{ color: 'var(--warning)', fontSize: '0.95rem' }}>+{needQty} món</strong>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmtVND(unitPrice)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{fmtVND(estCost)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', background: 'var(--success)' }}
                              onClick={() => {
                                setShowLowStockModal(false);
                                handleOpenInboundModal(p);
                              }}
                            >
                              <Plus size={14} /> Nhập Hàng
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                🎉 Tất cả sản phẩm trong kho hiện tại đều đạt số lượng an toàn!
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* INBOUND TRANSACTION FORM MODAL */}
      {showCreateTxModal && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: window.innerWidth <= 768 ? 0 : 'var(--sidebar-width, 280px)',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreateTxModal(false); }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '600px',
              width: '95%',
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'var(--bg-card, #ffffff)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Plus size={24} color="var(--success)" />
                <h3 className="text-title" style={{ fontSize: '1.25rem', margin: 0 }}>Tạo Giao Dịch Nhập Kho Mới</h3>
              </div>
              <button className="btn btn-outline" onClick={() => setShowCreateTxModal(false)}>✕ Đóng</button>
            </div>

            <form onSubmit={handleCreateTxSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  Chọn Sản Phẩm Nhập Kho:
                </label>
                <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Gõ tên hoặc SKU để lọc sản phẩm..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
                  />
                </div>
                <select
                  required
                  className="form-input"
                  value={newTxForm.productId}
                  onChange={(e) => setNewTxForm({ ...newTxForm, productId: e.target.value })}
                  style={{ fontSize: '0.85rem', width: '100%' }}
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {productsList
                    .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - [Tồn: {p.quantity || 0} món]
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                    Loại Giao Dịch:
                  </label>
                  <input type="text" disabled className="form-input" value="NHẬP KHO (INBOUND)" style={{ background: 'var(--bg-secondary)', fontWeight: 700, color: 'var(--success)' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                    Số Lượng Nhập:
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="form-input"
                    value={newTxForm.quantity}
                    onChange={(e) => setNewTxForm({ ...newTxForm, quantity: e.target.value })}
                    style={{ fontSize: '0.9rem', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                  Ghi Chú Nhập Kho:
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Ghi chú chi tiết ví dụ: Nhập hàng từ nhà cung cấp theo HĐ..."
                  value={newTxForm.note}
                  onChange={(e) => setNewTxForm({ ...newTxForm, note: e.target.value })}
                  style={{ fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateTxModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submittingTx} style={{ background: 'var(--success)', minWidth: '130px' }}>
                  {submittingTx ? 'Đang tạo...' : 'Xác Nhận Nhập Kho'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Dashboard;
