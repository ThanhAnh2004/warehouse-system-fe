import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal';
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
  const { hasPermission } = useContext(AuthContext);
  const { showAlert, showConfirm } = useDialog();
  const [reportData, setReportData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [forecastTrends, setForecastTrends] = useState(null);
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [forecastDays, setForecastDays] = useState(7);

  // Low stock & replenishment PO modal state
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [inboundProduct, setInboundProduct] = useState(null);
  const [inboundNeedQty, setInboundNeedQty] = useState(10);
  const [inboundNotes, setInboundNotes] = useState('');

  useEffect(() => {
    fetchReport();
    fetchAnalytics();
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchForecastTrends();
  }, [forecastDays]);

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (showLowStockModal || showCreatePOModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showLowStockModal, showCreatePOModal]);

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

  const handleOpenInboundModal = (p) => {
    const minVal = p.minStockLevel ?? 10;
    const curQty = p.quantity || 0;
    const needVal = Math.max(1, minVal - curQty);

    setInboundProduct(p);
    setInboundNeedQty(needVal);
    setInboundNotes(`Nhập bổ sung tồn kho an toàn cho sản phẩm ${p.name} (SKU: ${p.sku})`);
    setShowCreatePOModal(true);
  };

  // Zone capacity metric helper theo 3 phân khu chức năng chuẩn của kho
  const getZoneMetricByZoneType = (zoneType, rackCodes) => {
    const locs = locations.filter(l => 
      l.zone === zoneType || (rackCodes && rackCodes.some(prefix => l.code.startsWith(prefix)))
    );
    if (locs.length === 0) return { count: 0, used: 0, max: 100, rate: 0 };
    const used = locs.reduce((sum, l) => sum + (l.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0), 0);
    const max = locs.reduce((sum, l) => sum + (l.maxCapacity || 60), 0);
    const rate = max > 0 ? Math.round((used / max) * 100) : 0;
    return { count: locs.length, used, max, rate };
  };

  // 1. Khu Nhặt Hàng Nhanh (Kệ A1 & A2 - 6 Tầng A01 -> A06)
  const zoneHighVal = getZoneMetricByZoneType('ZONE-HIGH-VAL', ['A']);
  // 2. Khu Luân Chuyển Vừa (Kệ B1 & B2 - 8 Tầng B01 -> B08)
  const zoneLargeAppliance = getZoneMetricByZoneType('ZONE-LARGE-APPLIANCE', ['B']);
  // 3. Khu Mật Độ Cao (Kệ C & Kệ D - 7 Tầng C01 -> C04 & D01 -> D03)
  const zoneAccessories = getZoneMetricByZoneType('ZONE-ACCESSORIES', ['C', 'D']);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Layers size={24} color="var(--accent-primary)" />
            <div>
              <h3 className="text-title" style={{ fontSize: '1.15rem', margin: 0 }}>Tổng Quan Tỷ Lệ Lấp Đầy Kho (Rack Capacity Overview)</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Phân bố dung lượng không gian lưu trữ hiện tại theo đúng 3 phân khu kệ kho chức năng</p>
            </div>
          </div>
          {reportData && (() => {
            const onRackTotal = zoneHighVal.used + zoneLargeAppliance.used + zoneAccessories.used;
            const unallocatedTotal = Math.max(0, (reportData.totalStockQuantity || 0) - onRackTotal);
            if (unallocatedTotal <= 0) return null;
            return (
              <span
                className="badge"
                style={{
                  background: 'rgba(245, 158, 11, 0.14)',
                  color: '#d97706',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                Chờ xếp kệ: {unallocatedTotal.toLocaleString('vi-VN')} món
              </span>
            );
          })()}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {/* PHÂN KHU 1: KHU NHẶT HÀNG NHANH */}
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#10b981' }}>KHU NHẶT HÀNG NHANH (KỆ A1 & A2)</span>
              <span className="badge" style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>{zoneHighVal.rate}% sử dụng</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>{zoneHighVal.count} Tầng A01 ➔ A06 (Laptop & Smartphones)</div>
            <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
              <div style={{ width: `${zoneHighVal.rate}%`, height: '100%', background: '#10b981' }}></div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Đã lưu: <b>{zoneHighVal.used} món</b></span>
              <span>Còn trống: <b style={{ color: '#10b981' }}>{Math.max(0, zoneHighVal.max - zoneHighVal.used)} chỗ</b></span>
            </div>
          </div>

          {/* PHÂN KHU 2: KHU LUÂN CHUYỂN VỪA */}
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#3b82f6' }}>KHU LUÂN CHUYỂN VỪA (KỆ B1 & B2)</span>
              <span className="badge" style={{ background: '#3b82f6', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>{zoneLargeAppliance.rate}% sử dụng</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>{zoneLargeAppliance.count} Tầng B01 ➔ B08 (Tivi, Tủ Lạnh & Máy Giặt)</div>
            <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
              <div style={{ width: `${zoneLargeAppliance.rate}%`, height: '100%', background: '#3b82f6' }}></div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Đã lưu: <b>{zoneLargeAppliance.used} món</b></span>
              <span>Còn trống: <b style={{ color: '#3b82f6' }}>{Math.max(0, zoneLargeAppliance.max - zoneLargeAppliance.used)} chỗ</b></span>
            </div>
          </div>

          {/* PHÂN KHU 3: KHU MẬT ĐỘ CAO */}
          <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#8b5cf6' }}>KHU MẬT ĐỘ CAO (KỆ C & KỆ D)</span>
              <span className="badge" style={{ background: '#8b5cf6', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>{zoneAccessories.rate}% sử dụng</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.6rem' }}>{zoneAccessories.count} Tầng C01 ➔ C04 & D01 ➔ D03 (Phụ Kiện & Bảo Hành)</div>
            <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.4rem' }}>
              <div style={{ width: `${zoneAccessories.rate}%`, height: '100%', background: '#8b5cf6' }}></div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Đã lưu: <b>{zoneAccessories.used} món</b></span>
              <span>Còn trống: <b style={{ color: '#8b5cf6' }}>{Math.max(0, zoneAccessories.max - zoneAccessories.used)} chỗ</b></span>
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

          <div className="glass-card" style={{ width: '100%', maxWidth: '800px', margin: '0 auto 2rem' }}>
            {chartData && <Bar options={chartOptions} data={chartData} />}
          </div>
        </>
      )}

      {/* LOW STOCK ITEMS MODAL */}
      {showLowStockModal && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(7, 13, 36, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            margin: 0,
            boxSizing: 'border-box',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLowStockModal(false); }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: 'min(1440px, 98vw)',
              width: '98vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.25rem 1.5rem',
              borderRadius: '16px',
              background: 'var(--bg-secondary, #ffffff)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
              border: '1.5px solid var(--border-color)'
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
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', fontSize: '0.86rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center', width: '45px', padding: '0.75rem 0.5rem' }}>STT</th>
                      <th style={{ minWidth: '160px', padding: '0.75rem 0.65rem' }}>Sản Phẩm</th>
                      <th style={{ minWidth: '105px', padding: '0.75rem 0.65rem' }}>Danh Mục</th>
                      <th style={{ textAlign: 'center', minWidth: '90px', whiteSpace: 'nowrap', padding: '0.75rem 0.5rem' }}>Tồn Hiện Tại</th>
                      <th style={{ textAlign: 'center', minWidth: '90px', whiteSpace: 'nowrap', padding: '0.75rem 0.5rem' }}>Ngưỡng An Toàn</th>
                      <th style={{ textAlign: 'center', minWidth: '90px', whiteSpace: 'nowrap', padding: '0.75rem 0.5rem' }}>Cần Bổ Sung</th>
                      <th style={{ textAlign: 'right', minWidth: '95px', whiteSpace: 'nowrap', padding: '0.75rem 0.65rem' }}>Đơn Giá</th>
                      <th style={{ textAlign: 'right', minWidth: '110px', whiteSpace: 'nowrap', padding: '0.75rem 0.65rem' }}>Chi Phí Dự Kiến</th>
                      {hasPermission('procurement:create') && (
                        <th style={{ textAlign: 'center', width: '135px', minWidth: '135px', whiteSpace: 'nowrap', padding: '0.75rem 0.65rem' }}>Thao Tác</th>
                      )}
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
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span className="badge badge-danger" style={{ fontWeight: 700 }}>{curQty} món</span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{minVal} món</td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <strong style={{ color: 'var(--warning)', fontSize: '0.95rem' }}>+{needQty} món</strong>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500, whiteSpace: 'nowrap' }}>{fmtVND(unitPrice)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>{fmtVND(estCost)}</td>
                          {hasPermission('procurement:create') && (
                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{
                                  padding: '0.42rem 0.85rem',
                                  fontSize: '0.82rem',
                                  fontWeight: 600,
                                  background: 'var(--success)',
                                  color: '#ffffff',
                                  whiteSpace: 'nowrap',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  borderRadius: '8px',
                                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                                onClick={() => {
                                  setShowLowStockModal(false);
                                  handleOpenInboundModal(p);
                                }}
                              >
                                <Plus size={15} /> Nhập Hàng
                              </button>
                            </td>
                          )}
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

      {/* CREATE REPLENISHMENT PO MODAL (IDENTICAL TO PROCUREMENT PO FORM) */}
      <CreatePurchaseOrderModal
        isOpen={showCreatePOModal}
        onClose={() => {
          setShowCreatePOModal(false);
          setInboundProduct(null);
        }}
        title="Tạo Giao Dịch Nhập Kho Mới"
        subtitle={
          <>
            Lập đơn đặt hàng nhập kho từ nhà cung cấp chính hãng qua{' '}
            <strong>CỬA 01 - IN (CẢNG TIẾP NHẬN A)</strong>
          </>
        }
        submitLabel="Tạo đơn đặt hàng mới"
        initialProductId={inboundProduct?.id || ''}
        initialProduct={inboundProduct}
        initialQuantity={inboundNeedQty}
        initialNotes={inboundNotes}
        onSuccess={() => {
          fetchReport();
          fetchAnalytics();
        }}
      />
    </div>
  );
};

export default Dashboard;
