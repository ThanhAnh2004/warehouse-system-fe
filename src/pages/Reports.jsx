import React, { useState, useEffect } from 'react';
import { Download, Printer, Database, Package, ArrowUpRight, ArrowDownRight, Layers, AlertTriangle, TrendingUp, Calendar, DollarSign, Award, ShoppingBag, FileText } from 'lucide-react';
import apiClient from '../api/client';
import * as XLSX from 'xlsx';

const ZONE_NAMES = {
  'ZONE-HIGH-VAL': 'Khu Hàng Giá Trị Cao',
  'ZONE-LARGE-APPLIANCE': 'Khu Điện Tử Cỡ Lớn',
  'ZONE-ACCESSORIES': 'Khu Linh Kiện High-Bay',
  'ZONE-ESD-TEMP': 'Phòng Chống Tĩnh Điện ESD'
};

const fmtVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

const Reports = () => {
  const [reportData, setReportData] = useState(null);
  const [productsMap, setProductsMap] = useState({});
  const [productsList, setProductsList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState('CURRENT'); // 'CURRENT', 'PREVIOUS', 'ALL'

  useEffect(() => {
    fetchAllReportData();
  }, []);

  const fetchAllReportData = async () => {
    try {
      setLoading(true);
      const [summaryRes, prodRes, txRes, locationsRes] = await Promise.all([
        apiClient.get('/reports/summary'),
        apiClient.get('/inventory/products?limit=1000'),
        apiClient.get('/transactions?limit=100000'),
        apiClient.get('/inventory/locations')
      ]);

      setReportData(summaryRes.data);

      const pList = prodRes.data?.data || [];
      setProductsList(pList);

      const map = {};
      pList.forEach(p => {
        map[p.id] = p;
      });
      setProductsMap(map);

      const tList = Array.isArray(txRes.data)
        ? txRes.data
        : (txRes.data && Array.isArray(txRes.data.data) ? txRes.data.data : []);
      setTransactions(tList);

      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch detailed report data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions based on selected month
  const getFilteredTransactions = () => {
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth(); // 0-indexed

    return transactions.filter(t => {
      if (!t.createdAt) return false;
      const d = new Date(t.createdAt);
      if (monthFilter === 'CURRENT') {
        return d.getFullYear() === currYear && d.getMonth() === currMonth;
      }
      if (monthFilter === 'PREVIOUS') {
        const prevMonthDate = new Date(currYear, currMonth - 1, 1);
        return d.getFullYear() === prevMonthDate.getFullYear() && d.getMonth() === prevMonthDate.getMonth();
      }
      return true;
    });
  };

  const filteredTx = getFilteredTransactions();

  // 1. Calculate Monthly Outbound Totals & Top Best-Selling Products (Top Sản Phẩm Bán Chạy Nhất)
  const outboundByProductMap = {};
  filteredTx.forEach(t => {
    if (t.type === 'OUTBOUND' && t.productId) {
      if (!outboundByProductMap[t.productId]) {
        outboundByProductMap[t.productId] = { qty: 0, count: 0 };
      }
      outboundByProductMap[t.productId].qty += Number(t.quantity || 0);
      outboundByProductMap[t.productId].count += 1;
    }
  });

  const bestSellingProducts = productsList.map(p => {
    const outMeta = outboundByProductMap[p.id] || { qty: 0, count: 0 };
    const price = parseFloat(p.price) || 0;
    const revenue = outMeta.qty * price;
    return {
      ...p,
      outboundQty: outMeta.qty,
      txCount: outMeta.count,
      revenue
    };
  }).filter(p => p.outboundQty > 0 || monthFilter === 'ALL');

  // Sort 1: Top Bán Chạy Nhất (Theo số lượng xuất)
  const topSellingByQty = [...bestSellingProducts].sort((a, b) => b.outboundQty - a.outboundQty).slice(0, 10);

  // Sort 2: Top Doanh Số (Theo giá trị xuất)
  const topSellingByRevenue = [...bestSellingProducts].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Monthly summary metrics
  const monthlyInboundQty = filteredTx.filter(t => t.type === 'INBOUND').reduce((s, t) => s + (t.quantity || 0), 0);
  const monthlyOutboundQty = filteredTx.filter(t => t.type === 'OUTBOUND').reduce((s, t) => s + (t.quantity || 0), 0);

  const monthlyOutboundRevenue = filteredTx.filter(t => t.type === 'OUTBOUND').reduce((s, t) => {
    const p = productsMap[t.productId];
    const unitPrice = p ? parseFloat(p.price || 0) : 0;
    return s + (t.quantity * unitPrice);
  }, 0);

  const monthlyInboundValue = filteredTx.filter(t => t.type === 'INBOUND').reduce((s, t) => {
    const p = productsMap[t.productId];
    const unitPrice = p ? parseFloat(p.price || 0) : 0;
    return s + (t.quantity * unitPrice);
  }, 0);

  // Multi-Sheet Excel Export with formatted currency and auto column widths
  const exportMultiSheetExcel = () => {
    const wb = XLSX.utils.book_new();

    const monthLabel = monthFilter === 'CURRENT' ? 'Tháng 8/2026' : monthFilter === 'PREVIOUS' ? 'Tháng 7/2026' : 'Toàn Thời Gian';

    // Sheet 1: Báo Cáo Thống Kê Theo Tháng
    const summaryRows = [
      { 'Tên Chỉ Số Báo Cáo': 'Thời Gian Xuất Báo Cáo', 'Giá Trị Chi Tiết': new Date().toLocaleString('vi-VN') },
      { 'Tên Chỉ Số Báo Cáo': 'Kỳ Thống Kê', 'Giá Trị Chi Tiết': monthLabel },
      { 'Tên Chỉ Số Báo Cáo': 'Tổng Doanh Số Xuất Kho Trong Kỳ', 'Giá Trị Chi Tiết': fmtVND(monthlyOutboundRevenue) },
      { 'Tên Chỉ Số Báo Cáo': 'Tổng Lượng Xuất Kho', 'Giá Trị Chi Tiết': `${monthlyOutboundQty.toLocaleString('vi-VN')} món` },
      { 'Tên Chỉ Số Báo Cáo': 'Tổng Giá Trị Nhập Kho Trong Kỳ', 'Giá Trị Chi Tiết': fmtVND(monthlyInboundValue) },
      { 'Tên Chỉ Số Báo Cáo': 'Tổng Lượng Nhập Kho', 'Giá Trị Chi Tiết': `${monthlyInboundQty.toLocaleString('vi-VN')} món` },
      { 'Tên Chỉ Số Báo Cáo': 'Tổng Số Loại Sản Phẩm Trong Kho (SKU)', 'Giá Trị Chi Tiết': `${reportData?.totalProducts || 0} mặt hàng` },
      { 'Tên Chỉ Số Báo Cáo': 'Tổng Giá Trị Tồn Kho Hiện Tại', 'Giá Trị Chi Tiết': fmtVND(reportData?.totalInventoryValue) },
      { 'Tên Chỉ Số Báo Cáo': 'Số Sản Phẩm Dưới Ngưỡng An Toàn (Low Stock)', 'Giá Trị Chi Tiết': `${reportData?.lowStock || 0} mặt hàng` },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 45 }, { wch: 38 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Tong_Quan_Thang');

    // Sheet 2: Top Sản Phẩm Bán Chạy Nhất (Theo Số Lượng)
    const topQtyRows = topSellingByQty.map((p, idx) => ({
      'STT': idx + 1,
      'Mã SKU': p.sku,
      'Tên Sản Phẩm': p.name,
      'Danh Mục': p.category || 'Khác',
      'Đơn Giá (VNĐ)': fmtVND(parseFloat(p.price || 0)),
      'Số Lượng Xuất Kho': `${p.outboundQty.toLocaleString('vi-VN')} món`,
      'Tổng Doanh Số Tương Ứng': fmtVND(p.revenue),
      'Số Lượng Tồn Hiện Tại': `${(p.quantity || 0).toLocaleString('vi-VN')} món`
    }));
    const topQtySheet = XLSX.utils.json_to_sheet(topQtyRows);
    topQtySheet['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 45 }, { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 28 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, topQtySheet, 'Top_Ban_Chay_Thang');

    // Sheet 3: Top Doanh Số Xuất Kho (Theo Giá Trị VNĐ)
    const topRevRows = topSellingByRevenue.map((p, idx) => ({
      'STT': idx + 1,
      'Mã SKU': p.sku,
      'Tên Sản Phẩm': p.name,
      'Danh Mục': p.category || 'Khác',
      'Đơn Giá (VNĐ)': fmtVND(parseFloat(p.price || 0)),
      'Số Lượng Xuất Kho': `${p.outboundQty.toLocaleString('vi-VN')} món`,
      'Doanh Số Xuất Kho': fmtVND(p.revenue),
      'Số Lượng Tồn Hiện Tại': `${(p.quantity || 0).toLocaleString('vi-VN')} món`
    }));
    const topRevSheet = XLSX.utils.json_to_sheet(topRevRows);
    topRevSheet['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 45 }, { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 28 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, topRevSheet, 'Top_Doanh_So_Thang');

    // Sheet 4: Danh Sách Sản Phẩm Cần Nhập Thêm
    if (reportData?.lowStockItems && reportData.lowStockItems.length > 0) {
      const lowStockRows = reportData.lowStockItems.map((p, idx) => ({
        'STT': idx + 1,
        'Mã SKU': p.sku,
        'Tên Sản Phẩm': p.name,
        'Danh Mục': p.category || 'Điện tử',
        'Tồn Hiện Tại': `${(p.quantity || 0).toLocaleString('vi-VN')} món`,
        'Ngưỡng An Toàn (Min)': `${(p.minStockLevel || 10).toLocaleString('vi-VN')} món`,
        'Số Lượng Cần Bổ Sung': `${Math.max(0, (p.minStockLevel || 10) - (p.quantity || 0)).toLocaleString('vi-VN')} món`,
        'Đơn Giá (VNĐ)': fmtVND(parseFloat(p.price || 0)),
        'Chi Phí Nhập Dự Kiến': fmtVND(Math.max(0, (p.minStockLevel || 10) - (p.quantity || 0)) * (parseFloat(p.price) || 0))
      }));
      const lowStockSheet = XLSX.utils.json_to_sheet(lowStockRows);
      lowStockSheet['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 45 }, { wch: 24 }, { wch: 20 }, { wch: 22 }, { wch: 24 }, { wch: 24 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, lowStockSheet, 'Can_Nhap_Bo_Sung');
    }

    XLSX.writeFile(wb, `Bao_Cao_Kho_Thang_${monthFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tổng hợp báo cáo thống kê theo tháng...</div>;
  }

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* Header & Controls */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-title" style={{ margin: 0 }}>Báo Cáo & Thống Kê Hoạt Động Kho Hàng</h1>
          <p className="text-subtitle" style={{ fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Phân tích Top sản phẩm bán chạy, Doanh số xuất kho, Cảnh báo tồn kho & Biến động theo tháng.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Month Selector Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-glass)', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <Calendar size={18} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Kỳ Thống Kê:</span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="form-input"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', border: 'none', background: 'transparent', fontWeight: 700, color: 'var(--accent-primary)', cursor: 'pointer' }}
            >
              <option value="CURRENT">Tháng Này (Tháng 8/2026)</option>
              <option value="PREVIOUS">Tháng Trước (Tháng 7/2026)</option>
              <option value="ALL">Toàn Thời Gian</option>
            </select>
          </div>

          <button onClick={exportMultiSheetExcel} className="btn btn-primary" style={{ display: 'flex', gap: '0.5rem', background: 'var(--success)' }}>
            <Download size={18} /> Xuất File Excel
          </button>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW BAR FOR SELECTED MONTH */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-card flex justify-between items-center" style={{ padding: '1.25rem' }}>
          <div>
            <p className="text-subtitle" style={{ marginBottom: '0.35rem', fontSize: '0.82rem' }}>Doanh Số Xuất Kho Trong Kỳ</p>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-primary)', margin: 0 }}>
              {fmtVND(monthlyOutboundRevenue)}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tổng {monthlyOutboundQty} món xuất</span>
          </div>
          <div style={{ padding: '0.85rem', background: 'var(--accent-light)', color: 'var(--accent-primary)', borderRadius: '50%' }}>
            <DollarSign size={24} />
          </div>
        </div>

        <div className="glass-card flex justify-between items-center" style={{ padding: '1.25rem' }}>
          <div>
            <p className="text-subtitle" style={{ marginBottom: '0.35rem', fontSize: '0.82rem' }}>Tổng Giá Trị Nhập Kho Trong Kỳ</p>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--success)', margin: 0 }}>
              {fmtVND(monthlyInboundValue)}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tổng {monthlyInboundQty} món nhập</span>
          </div>
          <div style={{ padding: '0.85rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '50%' }}>
            <ArrowDownRight size={24} />
          </div>
        </div>

        <div className="glass-card flex justify-between items-center" style={{ padding: '1.25rem' }}>
          <div>
            <p className="text-subtitle" style={{ marginBottom: '0.35rem', fontSize: '0.82rem' }}>Tổng Giá Trị Tồn Kho Hiện Tại</p>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {fmtVND(reportData?.totalInventoryValue)}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{reportData?.totalStockQuantity || 0} món / {reportData?.totalProducts || 0} SKU</span>
          </div>
          <div style={{ padding: '0.85rem', background: 'rgba(99, 102, 241, 0.1)', color: 'rgb(99, 102, 241)', borderRadius: '50%' }}>
            <Database size={24} />
          </div>
        </div>

        <div className="glass-card flex justify-between items-center" style={{ padding: '1.25rem' }}>
          <div>
            <p className="text-subtitle" style={{ marginBottom: '0.35rem', fontSize: '0.82rem' }}>Sản Phẩm Cần Nhập Thêm</p>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--danger)', margin: 0 }}>
              {reportData?.lowStock || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>mặt hàng</span>
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>Cảnh báo dưới minStock</span>
          </div>
          <div style={{ padding: '0.85rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '50%' }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* SECTION 1 & 2: TOP BÁN CHẠY NHẤT & TOP DOANH SỐ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Table 1: Top Sản Phẩm Bán Chạy Nhất (Số lượng xuất) */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Award size={22} color="var(--accent-primary)" />
              <h2 className="text-title" style={{ fontSize: '1.15rem', margin: 0 }}>1. Top Sản Phẩm Bán Chạy Nhất Trong Kỳ</h2>
            </div>
            <span style={{ fontSize: '0.75rem', className: 'badge badge-primary', fontWeight: 600 }}>Theo Số Lượng Xuất</span>
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                  <th>SẢN PHẨM / SKU</th>
                  <th style={{ textAlign: 'right' }}>ĐƠN GIÁ</th>
                  <th style={{ textAlign: 'center' }}>ĐÃ XUẤT KHO</th>
                  <th style={{ textAlign: 'right' }}>DOANH SỐ (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                {topSellingByQty.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>Chưa có giao dịch xuất kho trong kỳ này</td></tr>
                ) : topSellingByQty.map((p, idx) => (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: idx < 3 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                      {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{p.name}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>SKU: {p.sku} | {p.category || 'Khác'}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>{fmtVND(p.price)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-primary" style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                        🔥 {p.outboundQty} món
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{fmtVND(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Top Doanh Số Bán Hàng (Giá trị xuất) */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <TrendingUp size={22} color="var(--success)" />
              <h2 className="text-title" style={{ fontSize: '1.15rem', margin: 0 }}>2. Top Sản Phẩm Doanh Số Cao Nhất Trong Kỳ</h2>
            </div>
            <span style={{ fontSize: '0.75rem', className: 'badge badge-success', fontWeight: 600, background: 'var(--success-light)', color: 'var(--success)', padding: '2px 8px', borderRadius: '6px' }}>
              Theo Giá Trị (VNĐ)
            </span>
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                  <th>SẢN PHẨM / SKU</th>
                  <th style={{ textAlign: 'right' }}>ĐƠN GIÁ</th>
                  <th style={{ textAlign: 'center' }}>ĐÃ XUẤT</th>
                  <th style={{ textAlign: 'right' }}>TỔNG DOANH SỐ</th>
                </tr>
              </thead>
              <tbody>
                {topSellingByRevenue.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>Chưa có giao dịch xuất kho trong kỳ này</td></tr>
                ) : topSellingByRevenue.map((p, idx) => (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: idx < 3 ? 'var(--success)' : 'var(--text-secondary)' }}>
                      {idx === 0 ? '👑 1' : idx === 1 ? '🌟 2' : idx === 2 ? '⭐ 3' : idx + 1}
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{p.name}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>SKU: {p.sku}</div>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>{fmtVND(p.price)}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{p.outboundQty} món</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>{fmtVND(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: BẢNG CẢNH BÁO & DANH SÁCH SẢN PHẨM CẦN NHẬP THÊM */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={22} color="var(--warning)" />
            <h2 className="text-title" style={{ fontSize: '1.2rem', margin: 0 }}>3. Danh Sách Sản Phẩm Dưới Ngưỡng An Toàn (Cần Nhập Bổ Sung)</h2>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>
            ⚠️ Tồn kho hiện tại ≤ Min Stock Level (10 món)
          </span>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                <th>MÃ SKU</th>
                <th>TÊN SẢN PHẨM</th>
                <th>DANH MỤC</th>
                <th style={{ textAlign: 'right' }}>ĐƠN GIÁ (VNĐ)</th>
                <th style={{ textAlign: 'center' }}>TỒN HIỆN TẠI</th>
                <th style={{ textAlign: 'center' }}>NGƯỠNG MIN</th>
                <th style={{ textAlign: 'center' }}>CẦN NHẬP THÊM</th>
                <th style={{ textAlign: 'right' }}>CHI PHÍ DỰ KIẾN (VNĐ)</th>
              </tr>
            </thead>
            <tbody>
              {!reportData?.lowStockItems || reportData.lowStockItems.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>🎉 Tất cả sản phẩm đều đang đạt ngưỡng tồn kho an toàn!</td></tr>
              ) : reportData.lowStockItems.map((p, idx) => {
                const curQty = p.quantity || 0;
                const minVal = p.minStockLevel ?? 10;
                const needVal = Math.max(0, minVal - curQty);
                const unitPrice = parseFloat(p.price || 0);
                const estCost = needVal * unitPrice;

                return (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{p.sku}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td><span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{p.category || 'Điện tử'}</span></td>
                    <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>{fmtVND(unitPrice)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem' }}>
                        🔴 {curQty} món
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{minVal} món</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--warning)', fontSize: '0.9rem' }}>+{needVal} món</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>{fmtVND(estCost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: BÁO CÁO CÔNG SUẤT SỨC CHỨA TỪNG TẦNG KHO */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={22} color="var(--accent-primary)" />
            <h2 className="text-title" style={{ fontSize: '1.2rem', margin: 0 }}>4. Báo Cáo Phân Phối Sức Chứa & Lấp Đầy Tầng Kho (20 Tầng Kho)</h2>
          </div>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                <th>MÃ TẦNG KHO</th>
                <th>TÊN KỆ (RACK)</th>
                <th>PHÂN KHU KHO</th>
                <th style={{ textAlign: 'center' }}>SỨC CHỨA TỐI ĐA</th>
                <th style={{ textAlign: 'center' }}>ĐANG LƯU TRỮ</th>
                <th style={{ textAlign: 'center', width: '180px' }}>TỶ LỆ LẤP ĐẦY (%)</th>
                <th style={{ textAlign: 'center' }}>TRẠNG THÁI KHÔNG GIAN</th>
              </tr>
            </thead>
            <tbody>
              {locations.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>Chưa có dữ liệu tầng kho</td></tr>
              ) : locations.map((loc, idx) => {
                const currentQty = loc.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0;
                const maxCap = loc.maxCapacity || 60;
                const rate = Math.round((currentQty / maxCap) * 100);

                const statusBg = rate >= 90 ? 'var(--danger-light)' : rate >= 50 ? 'var(--warning-light)' : 'var(--success-light)';
                const statusColor = rate >= 90 ? 'var(--danger)' : rate >= 50 ? 'var(--warning)' : 'var(--success)';
                const statusText = rate >= 90 ? '🔴 Đầy Kệ' : rate >= 50 ? '🟡 Sắp Đầy' : '🟢 Còn Trống';

                return (
                  <tr key={loc.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Tầng {loc.code}</td>
                    <td style={{ fontWeight: 600 }}>{loc.aisle || 'Kệ A'}</td>
                    <td><span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{ZONE_NAMES[loc.zone] || loc.zone}</span></td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{maxCap} món</td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{currentQty} món</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, rate)}%`, height: '100%', background: statusColor, borderRadius: '4px' }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: statusColor, width: '38px', textAlign: 'right' }}>{rate}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge" style={{ background: statusBg, color: statusColor, fontWeight: 600, fontSize: '0.78rem' }}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
