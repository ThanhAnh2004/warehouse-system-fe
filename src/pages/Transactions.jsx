import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../api/client';
import {
  Plus, Search, Download, Calendar, ChevronDown, ChevronUp, ChevronRight,
  FileText, ArrowRight, ArrowDownCircle, ArrowUpCircle, Repeat, SlidersHorizontal, Info, X
} from 'lucide-react';

const PAGE_SIZE = 10;

const TX_TYPES = [
  { key: 'INBOUND', label: 'Nhập Kho (Inbound)', badge: 'badge-success', Icon: ArrowDownCircle },
  { key: 'OUTBOUND', label: 'Xuất Kho (Outbound)', badge: 'badge-danger', Icon: ArrowUpCircle },
  { key: 'TRANSFER', label: 'Điều Chuyển Kệ (Transfer)', badge: 'badge-primary', Icon: Repeat },
  { key: 'ADJUSTMENT', label: 'Kiểm Kê / Điều Chỉnh (Adjustment)', badge: 'badge-warning', Icon: SlidersHorizontal },
];

const fmtVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const Transactions = () => {
  const [productMap, setProductMap] = useState({});
  const [products, setProducts] = useState([]);
  const [warehouseLocations, setWarehouseLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datePreset, setDatePreset] = useState('ALL');
  const [expandedTxId, setExpandedTxId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [newTransaction, setNewTransaction] = useState({
    productId: '',
    type: 'OUTBOUND',
    quantity: 1,
    locationFrom: '',
    locationTo: '',
    note: ''
  });

  const [counts, setCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(true);

  const [expanded, setExpanded] = useState({});
  const [groups, setGroups] = useState({});

  // Lock body scroll when modal is active
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showModal]);

  const isMobile = window.innerWidth <= 768;
  const modalBackdropStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: isMobile ? 0 : 'var(--sidebar-width, 280px)',
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  };

  useEffect(() => {
    fetchProducts();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await apiClient.get('/inventory/locations');
      setWarehouseLocations(res.data || []);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    }
  };

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

  // Find locations containing the selected product for OUTBOUND / TRANSFER
  const getProductLocations = (productId) => {
    if (!productId) return [];
    return warehouseLocations.filter(loc =>
      loc.items?.some(it => it.productId === productId && it.quantity > 0)
    );
  };

  const productRacks = getProductLocations(newTransaction.productId);

  // Auto-set locationFrom when product or type changes
  useEffect(() => {
    if (newTransaction.type === 'OUTBOUND' || newTransaction.type === 'TRANSFER') {
      if (productRacks.length > 0) {
        const hasCurrent = productRacks.some(r => r.code === newTransaction.locationFrom);
        if (!hasCurrent) {
          setNewTransaction(prev => ({ ...prev, locationFrom: productRacks[0].code }));
        }
      } else {
        setNewTransaction(prev => ({ ...prev, locationFrom: '' }));
      }
    }
  }, [newTransaction.productId, newTransaction.type, warehouseLocations]);

  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7DAYS') {
      const past = new Date(now.getTime() - 7 * 86400000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30DAYS') {
      const past = new Date(now.getTime() - 30 * 86400000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await apiClient.get('/transactions', {
        params: { page: 1, limit: 5000, search: search.trim(), sortBy, sortOrder, startDate, endDate }
      });
      const list = res.data?.data || [];
      if (list.length === 0) {
        alert('Không tìm thấy giao dịch nào để xuất CSV.');
        return;
      }

      const headers = ['Mã Giao Dịch', 'Loại Giao Dịch', 'Tên Sản Phẩm', 'Mã SKU', 'Số Lượng', 'Đơn Giá (VNĐ)', 'Tổng Giá Trị (VNĐ)', 'Trạng Thái', 'Thời Gian', 'Ghi Chú'];
      const rows = list.map(t => {
        const prod = productMap[t.productId];
        const unitPrice = prod?.price || 0;
        const totalVal = Math.abs(t.quantity * unitPrice);
        const dateStr = new Date(t.createdAt).toLocaleString('vi-VN');
        return [
          `"${t.id}"`,
          `"${t.type}"`,
          `"${(prod?.name || 'Không xác định').replace(/"/g, '""')}"`,
          `"${(prod?.sku || '').replace(/"/g, '""')}"`,
          t.quantity,
          unitPrice,
          totalVal,
          `"${t.status}"`,
          `"${dateStr}"`,
          `"${(t.note || '').replace(/"/g, '""')}"`
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Bao_Cao_Giao_Dich_Kho_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Xuất file CSV thất bại: ' + err.message);
    }
  };

  const handleOpenModal = () => {
    setProductSearch('');
    fetchLocations();
    if (products.length > 0) {
      const firstProdId = products[0].id;
      const racks = getProductLocations(firstProdId);
      setNewTransaction({
        productId: firstProdId,
        type: 'OUTBOUND',
        quantity: 1,
        locationFrom: racks.length > 0 ? racks[0].code : '',
        locationTo: '',
        note: ''
      });
    }
    setShowModal(true);
  };

  const filteredProductsForSelect = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  useEffect(() => {
    const fetchCounts = async () => {
      setCountsLoading(true);
      try {
        const results = await Promise.all(
          TX_TYPES.map(t => apiClient.get('/transactions', {
            params: { type: t.key, limit: 1, search: search.trim(), startDate, endDate }
          }))
        );
        const next = {};
        results.forEach((res, i) => { next[TX_TYPES[i].key] = res.data.total || 0; });
        setCounts(next);
      } catch (err) {
        console.error(err);
      } finally {
        setCountsLoading(false);
      }
    };
    fetchCounts();
  }, [search, startDate, endDate, refreshKey]);

  const fetchGroup = async (type, page = 1) => {
    setGroups(prev => ({ ...prev, [type]: { ...(prev[type] || {}), loading: true } }));
    try {
      const res = await apiClient.get('/transactions', {
        params: { type, page, limit: PAGE_SIZE, search: search.trim(), sortBy, sortOrder, startDate, endDate }
      });
      setGroups(prev => ({
        ...prev,
        [type]: { data: res.data.data || [], total: res.data.total || 0, page, loading: false }
      }));
    } catch (err) {
      console.error(err);
      setGroups(prev => ({ ...prev, [type]: { ...(prev[type] || {}), loading: false } }));
    }
  };

  const toggleGroup = (type) => {
    const willExpand = !expanded[type];
    setExpanded(prev => ({ ...prev, [type]: willExpand }));
    if (willExpand) fetchGroup(type, 1);
  };

  useEffect(() => {
    Object.keys(expanded).forEach(type => {
      if (expanded[type]) fetchGroup(type, 1);
    });
  }, [search, sortBy, sortOrder, startDate, endDate, refreshKey]);

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      const qty = parseInt(newTransaction.quantity, 10);
      if (isNaN(qty) || (newTransaction.type === 'ADJUSTMENT' ? qty === 0 : qty <= 0)) {
        alert(
          newTransaction.type === 'ADJUSTMENT'
            ? 'Vui lòng nhập số lượng khác 0 (Số âm để giảm tồn kho do hỏng hóc).'
            : 'Vui lòng nhập số lượng hợp lệ lớn hơn 0.'
        );
        return;
      }

      if (newTransaction.type === 'OUTBOUND') {
        if (!newTransaction.locationFrom) {
          alert('Vui lòng chọn Kệ Kho cần xuất hàng!');
          return;
        }
      }

      const payload = {
        productId: newTransaction.productId,
        type: newTransaction.type,
        quantity: qty,
        note: newTransaction.note
      };

      if (newTransaction.type === 'INBOUND') {
        payload.locationTo = 'DEFAULT_WAREHOUSE';
      } else if (newTransaction.type === 'OUTBOUND') {
        payload.locationFrom = newTransaction.locationFrom;
      } else if (newTransaction.type === 'TRANSFER') {
        payload.locationFrom = newTransaction.locationFrom;
        payload.locationTo = newTransaction.locationTo;
      } else if (newTransaction.type === 'ADJUSTMENT') {
        payload.locationTo = newTransaction.locationFrom || 'DEFAULT_WAREHOUSE';
      }

      await apiClient.post('/transactions', payload);
      alert('Tạo giao dịch thành công!');
      setShowModal(false);
      setProductSearch('');

      setRefreshKey(prev => prev + 1);
      fetchLocations();
      setExpanded(prev => ({ ...prev, [payload.type]: true }));
    } catch (err) {
      alert('Lỗi tạo giao dịch: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
  };

  const totalAllTypes = TX_TYPES.reduce((sum, t) => sum + (counts[t.key] || 0), 0);

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-title" style={{ margin: 0 }}>Lịch Sử Giao Dịch Kho Hàng</h2>
          <p className="text-subtitle" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Phân loại theo nhóm giao dịch Nhập - Xuất - Chuyển kệ - Điều chỉnh kiểm kê.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleExportCSV} style={{ background: 'var(--bg-glass)' }}>
            <Download size={18} /> Xuất Báo Cáo CSV
          </button>
          <button className="btn btn-primary" onClick={handleOpenModal}>
            <Plus size={18} /> Tạo Giao Dịch Mới
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.2rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            Tổng Số Giao Dịch
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
            {countsLoading ? '...' : totalAllTypes.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Khớp với bộ lọc
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.2rem', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            Phạm Vi Thời Gian
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '0.4rem' }}>
            {datePreset === 'ALL' ? 'Toàn bộ lịch sử' : datePreset === 'CUSTOM' ? 'Tùy chọn khoảng ngày' : datePreset}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '240px' }}>
            <Search size={18} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Tìm kiếm giao dịch theo tên, SKU, ghi chú..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Calendar size={18} color="var(--text-secondary)" />
            <button
              className={`btn ${datePreset === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleDatePresetChange('ALL')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
            >
              Tất cả
            </button>
            <button
              className={`btn ${datePreset === 'TODAY' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleDatePresetChange('TODAY')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
            >
              Hôm nay
            </button>
            <button
              className={`btn ${datePreset === '7DAYS' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleDatePresetChange('7DAYS')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
            >
              7 ngày
            </button>
            <button
              className={`btn ${datePreset === '30DAYS' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => handleDatePresetChange('30DAYS')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
            >
              30 ngày
            </button>
          </div>
        </div>
      </div>

      {/* Accordion Transaction Groups */}
      <div className="glass-card" style={{ padding: '0.5rem' }}>
        {TX_TYPES.map((t, idx) => {
          const isOpen = !!expanded[t.key];
          const count = counts[t.key] || 0;
          const group = groups[t.key] || { data: [], total: 0, page: 1, loading: false };
          const totalPages = Math.max(1, Math.ceil((group.total || 0) / PAGE_SIZE));

          return (
            <div key={t.key} style={{ borderBottom: idx < TX_TYPES.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <button
                onClick={() => toggleGroup(t.key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.1rem 1rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <t.Icon size={20} color="var(--text-secondary)" />
                  <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{t.label}</span>
                  <span className={`badge ${t.badge}`}>{countsLoading ? '...' : count}</span>
                </div>
                {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>

              {isOpen && (
                <div style={{ padding: '0 0.5rem 1.25rem' }}>
                  {count === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                      Không có giao dịch {t.label.toLowerCase()} nào phù hợp với bộ lọc
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                            <th style={{ width: '30px' }}></th>
                            <th>SẢN PHẨM</th>
                            <th
                              onClick={() => handleSort('quantity')}
                              style={{ cursor: 'pointer', userSelect: 'none', color: sortBy === 'quantity' ? 'var(--accent-primary)' : 'inherit', fontWeight: sortBy === 'quantity' ? 700 : 'normal' }}
                            >
                              SỐ LƯỢNG {sortBy === 'quantity' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                            </th>
                            <th>TỔNG GIÁ TRỊ</th>
                            <th
                              onClick={() => handleSort('status')}
                              style={{ cursor: 'pointer', userSelect: 'none', color: sortBy === 'status' ? 'var(--accent-primary)' : 'inherit', fontWeight: sortBy === 'status' ? 700 : 'normal' }}
                            >
                              TRẠNG THÁI {sortBy === 'status' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                            </th>
                            <th
                              onClick={() => handleSort('createdAt')}
                              style={{ cursor: 'pointer', userSelect: 'none', color: sortBy === 'createdAt' ? 'var(--accent-primary)' : 'inherit', fontWeight: sortBy === 'createdAt' ? 700 : 'normal' }}
                            >
                              THỜI GIAN {sortBy === 'createdAt' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải...</td></tr>
                          ) : (group.data || []).map((tx, index) => {
                            const isExpanded = expandedTxId === tx.id;
                            const prod = productMap[tx.productId];
                            const unitPrice = prod?.price || 0;
                            const totalValue = Math.abs(tx.quantity * unitPrice);

                            return (
                              <React.Fragment key={tx.id}>
                                <tr
                                  style={{ cursor: 'pointer', background: isExpanded ? 'var(--accent-light)' : 'transparent' }}
                                  onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                                >
                                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {((group.page || 1) - 1) * PAGE_SIZE + index + 1}
                                  </td>
                                  <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </td>
                                  <td style={{ fontWeight: 600 }}>
                                    {prod ? prod.name : tx.productId}
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '2px' }}>
                                      SKU: {prod ? prod.sku : tx.productId}
                                    </div>
                                  </td>
                                  <td style={{ fontWeight: 700 }}>{tx.quantity}</td>
                                  <td>
                                    {prod ? (
                                      <>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmtVND(totalValue)}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{fmtVND(unitPrice)}/món</div>
                                      </>
                                    ) : '-'}
                                  </td>
                                  <td>
                                    <span className="badge badge-success">
                                      {tx.status === 'COMPLETED' ? 'HOÀN THÀNH' : tx.status}
                                    </span>
                                  </td>
                                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(tx.createdAt).toLocaleString('vi-VN')}</td>
                                </tr>

                                {isExpanded && (
                                  <tr style={{ background: 'var(--bg-glass-hover)' }}>
                                    <td colSpan="7" style={{ padding: '1.2rem 2rem', borderBottom: '2px solid var(--accent-primary)' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', alignItems: 'center' }}>
                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                            Mã Giao Dịch (ID)
                                          </div>
                                          <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
                                            {tx.id}
                                          </div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                                            Người tạo: <b>{tx.createdBy || 'Quản trị viên'}</b>
                                          </div>
                                        </div>

                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                            Vị Trí Kệ Kho Giao Dịch
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                            {tx.type === 'OUTBOUND' ? (
                                              <span style={{ color: '#ef4444' }}>🔴 Xuất từ Kệ {tx.locationFrom || 'A01'}</span>
                                            ) : tx.type === 'INBOUND' ? (
                                              <span style={{ color: '#10b981' }}>🟢 Nhập kho tổng</span>
                                            ) : (
                                              <>
                                                <span>Từ Kệ {tx.locationFrom}</span>
                                                <ArrowRight size={14} color="var(--accent-primary)" />
                                                <span>Đến Kệ {tx.locationTo}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                            Ghi Chú / Lý Do
                                          </div>
                                          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                                            {tx.note || 'Không có ghi chú.'}
                                          </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                          <button
                                            className="btn btn-outline"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              alert(`In phiếu giao dịch:\nMã ID: ${tx.id}\nSản phẩm: ${prod?.name}\nSố lượng: ${tx.quantity}\nThời gian: ${new Date(tx.createdAt).toLocaleString('vi-VN')}`);
                                            }}
                                          >
                                            <FileText size={14} /> In Phiếu Giao Dịch
                                          </button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>

                      {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
                          <button
                            className="btn btn-outline"
                            disabled={group.page === 1}
                            onClick={() => fetchGroup(t.key, group.page - 1)}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          >
                            Trang trước
                          </button>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Trang <b>{group.page}</b> / <b>{totalPages}</b>
                          </span>
                          <button
                            className="btn btn-outline"
                            disabled={group.page === totalPages}
                            onClick={() => fetchGroup(t.key, group.page + 1)}
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                          >
                            Trang sau
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE TRANSACTION MODAL */}
      {showModal && ReactDOM.createPortal(
        <div
          style={modalBackdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setProductSearch('');
            }
          }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '580px',
              width: '92%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'var(--bg-card, #ffffff)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={22} color="var(--accent-primary)" />
                  <h3 className="text-subtitle" style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                    Tạo Giao Dịch Kho Mới
                  </h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  Tạo đơn Nhập kho, Xuất kho từ Kệ, Điều chuyển kệ hoặc Điều chỉnh kiểm kê.
                </p>
              </div>
              <button
                className="btn"
                style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => { setShowModal(false); setProductSearch(''); }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Product Selector */}
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Sản Phẩm</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Gõ tên hoặc mã SKU để lọc nhanh..."
                  value={productSearch}
                  onChange={e => {
                    const searchVal = e.target.value;
                    setProductSearch(searchVal);
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
                      {p.name} ({p.sku}) {p.price ? `- ${p.price.toLocaleString('vi-VN')} VNĐ` : ''}
                    </option>
                  ))}
                  {filteredProductsForSelect.length === 0 && (
                    <option value="" disabled>Không tìm thấy sản phẩm phù hợp</option>
                  )}
                </select>
              </div>

              {/* Transaction Type */}
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Loại Giao Dịch</label>
                <select
                  className="form-input"
                  value={newTransaction.type}
                  onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value })}
                >
                  <option value="OUTBOUND">XUẤT KHO (Outbound)</option>
                  <option value="INBOUND">NHẬP KHO (Inbound)</option>
                  <option value="TRANSFER">ĐIỀU CHUYỂN KỆ (Transfer)</option>
                  <option value="ADJUSTMENT">ĐIỀU CHỈNH KIỂM KÊ (Adjustment)</option>
                </select>
              </div>

              {/* Quantity */}
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>
                  Số Lượng
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

              {/* OUTBOUND LOCATION FROM SELECTOR */}
              {newTransaction.type === 'OUTBOUND' && (
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>
                    Từ Kệ Kho (Xuất Hàng Từ Kệ Nào)
                  </label>
                  <select
                    required
                    className="form-input"
                    value={newTransaction.locationFrom}
                    onChange={e => setNewTransaction({ ...newTransaction, locationFrom: e.target.value })}
                  >
                    {productRacks.map(loc => {
                      const item = loc.items?.find(i => i.productId === newTransaction.productId);
                      return (
                        <option key={loc.code} value={loc.code}>
                          Kệ {loc.code} (Dãy {loc.aisle} - Đang lưu {item?.quantity || 0} sản phẩm)
                        </option>
                      );
                    })}
                    {productRacks.length === 0 && (
                      <option value="" disabled>⚠️ Sản phẩm này chưa được xếp vào kệ nào (Hoặc đã hết hàng trên kệ)</option>
                    )}
                  </select>
                  {productRacks.length > 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '4px' }}>
                      🟢 Sản phẩm đang có sẵn trên {productRacks.length} kệ kho. Xuất kho sẽ tự động trừ số lượng trên kệ này.
                    </div>
                  )}
                </div>
              )}

              {/* INBOUND HELPER NOTICE (NO RACK REQUIRED) */}
              {newTransaction.type === 'INBOUND' && (
                <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', fontSize: '0.82rem', color: '#10b981' }}>
                  <Info size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                  Hàng nhập kho sẽ được ghi nhận vào tồn kho tổng. Bạn không cần chọn kệ kho khi nhập hàng.
                </div>
              )}

              {/* TRANSFER LOCATIONS SELECTOR */}
              {newTransaction.type === 'TRANSFER' && (
                <>
                  <div className="form-group">
                    <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Từ Kệ Nguồn (Location From)</label>
                    <select
                      required
                      className="form-input"
                      value={newTransaction.locationFrom}
                      onChange={e => setNewTransaction({ ...newTransaction, locationFrom: e.target.value })}
                    >
                      {productRacks.map(loc => {
                        const item = loc.items?.find(i => i.productId === newTransaction.productId);
                        return (
                          <option key={loc.code} value={loc.code}>
                            Kệ {loc.code} (Dãy {loc.aisle} - Đang lưu {item?.quantity || 0} sản phẩm)
                          </option>
                        );
                      })}
                      {productRacks.length === 0 && (
                        <option value="" disabled>⚠️ Chưa có sản phẩm trên kệ nào để chuyển</option>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Đến Kệ Đích (Location To)</label>
                    <select
                      required
                      className="form-input"
                      value={newTransaction.locationTo}
                      onChange={e => setNewTransaction({ ...newTransaction, locationTo: e.target.value })}
                    >
                      <option value="">-- Chọn Kệ đến --</option>
                      {warehouseLocations.filter(l => l.code !== newTransaction.locationFrom).map(l => (
                        <option key={l.id} value={l.code}>
                          Kệ {l.code} (Dãy {l.aisle} - Trống {l.maxCapacity - (l.currentItemsCount || 0)} chỗ)
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* ADJUSTMENT LOCATION SELECTOR */}
              {newTransaction.type === 'ADJUSTMENT' && (
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Kệ Kho Kiểm Kê</label>
                  <select
                    className="form-input"
                    value={newTransaction.locationFrom}
                    onChange={e => setNewTransaction({ ...newTransaction, locationFrom: e.target.value })}
                  >
                    <option value="DEFAULT_WAREHOUSE">Kho tổng (Mặc định)</option>
                    {warehouseLocations.map(l => (
                      <option key={l.id} value={l.code}>Kệ {l.code} (Dãy {l.aisle})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Note */}
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Ghi Chú / Lý Do</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Nhập số hóa đơn, lý do xuất nhập kho..."
                  value={newTransaction.note}
                  onChange={e => setNewTransaction({ ...newTransaction, note: e.target.value })}
                  style={{ resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ background: 'var(--bg-glass)' }}
                  onClick={() => { setShowModal(false); setProductSearch(''); }}
                >
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  Xác Nhận Tạo Giao Dịch
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

export default Transactions;
