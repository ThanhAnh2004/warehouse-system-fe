import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../api/client';
import {
  Plus, Search, Download, Calendar, ChevronDown, ChevronUp, ChevronRight,
  FileText, ArrowRight, ArrowDownCircle, ArrowUpCircle, Repeat, SlidersHorizontal,
} from 'lucide-react';

const PAGE_SIZE = 10;

const TX_TYPES = [
  { key: 'INBOUND', label: 'Inbound', badge: 'badge-success', Icon: ArrowDownCircle },
  { key: 'OUTBOUND', label: 'Outbound', badge: 'badge-danger', Icon: ArrowUpCircle },
  { key: 'TRANSFER', label: 'Transfer', badge: 'badge-primary', Icon: Repeat },
  { key: 'ADJUSTMENT', label: 'Adjustment', badge: 'badge-warning', Icon: SlidersHorizontal },
];

const fmtVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const Transactions = () => {
  const [productMap, setProductMap] = useState({});
  const [products, setProducts] = useState([]);
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
    type: 'INBOUND',
    quantity: 1,
    locationFrom: 'DEFAULT_WAREHOUSE',
    locationTo: 'DEFAULT_WAREHOUSE',
    note: ''
  });

  // Số lượng giao dịch theo từng loại (badge trên header mỗi nhóm)
  const [counts, setCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(true);

  // Nhóm nào đang mở, và dữ liệu/phân trang riêng của từng nhóm
  const [expanded, setExpanded] = useState({});
  const [groups, setGroups] = useState({});

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
        alert('No transactions found to export.');
        return;
      }

      const headers = ['Transaction ID', 'Type', 'Product Name', 'SKU', 'Quantity', 'Unit Price (VND)', 'Total Value (VND)', 'Status', 'Date', 'Note'];
      const rows = list.map(t => {
        const prod = productMap[t.productId];
        const unitPrice = prod?.price || 0;
        const totalVal = Math.abs(t.quantity * unitPrice);
        const dateStr = new Date(t.createdAt).toLocaleString();
        return [
          `"${t.id}"`,
          `"${t.type}"`,
          `"${(prod?.name || 'Unknown').replace(/"/g, '""')}"`,
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
      link.setAttribute('download', `Warehouse_Transactions_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const handleOpenModal = () => {
    setProductSearch('');
    if (products.length > 0) {
      setNewTransaction(prev => ({ ...prev, productId: products[0].id }));
    }
    setShowModal(true);
  };

  const filteredProductsForSelect = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Fetch products once on mount
  useEffect(() => {
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
    fetchProducts();
  }, []);

  // Đếm số giao dịch theo từng loại - phục vụ hiển thị badge trên mỗi nhóm
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

  // Khi search/sort/khoảng ngày đổi hoặc có giao dịch mới, làm mới các nhóm đang mở (về trang 1)
  useEffect(() => {
    Object.keys(expanded).forEach(type => {
      if (expanded[type]) fetchGroup(type, 1);
    });
  }, [search, sortBy, sortOrder, startDate, endDate, refreshKey]);

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    try {
      const qty = parseInt(newTransaction.quantity, 10);
      // ADJUSTMENT cho phep so luong am (giam ton kho thuc te), cac loai con lai phai duong.
      if (isNaN(qty) || (newTransaction.type === 'ADJUSTMENT' ? qty === 0 : qty <= 0)) {
        alert(
          newTransaction.type === 'ADJUSTMENT'
            ? 'Please enter a non-zero quantity (negative to reduce stock).'
            : 'Please enter a valid quantity greater than 0'
        );
        return;
      }
      const payload = {
        productId: newTransaction.productId,
        type: newTransaction.type,
        quantity: qty,
        note: newTransaction.note
      };

      if (newTransaction.type === 'INBOUND') {
        payload.locationTo = newTransaction.locationTo;
      } else if (newTransaction.type === 'OUTBOUND') {
        payload.locationFrom = newTransaction.locationFrom;
      } else if (newTransaction.type === 'TRANSFER') {
        payload.locationFrom = newTransaction.locationFrom;
        payload.locationTo = newTransaction.locationTo;
      } else if (newTransaction.type === 'ADJUSTMENT') {
        // Backend chi yeu cau locationFrom HOAC locationTo - dung locationTo (kho dang dieu chinh).
        payload.locationTo = newTransaction.locationTo;
      }

      await apiClient.post('/transactions', payload);
      setShowModal(false);
      setProductSearch('');

      setNewTransaction({
        productId: products.length > 0 ? products[0].id : '',
        type: 'INBOUND',
        quantity: 1,
        locationFrom: 'DEFAULT_WAREHOUSE',
        locationTo: 'DEFAULT_WAREHOUSE',
        note: ''
      });

      // Mở luôn nhóm vừa tạo giao dịch để người dùng thấy ngay kết quả
      setExpanded(prev => ({ ...prev, [payload.type]: true }));
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      alert('Error creating transaction: ' + (err.response?.data?.message || err.message));
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
    <div className="animate-slide-up">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-title" style={{ margin: 0 }}>Transactions History</h2>
          <p className="text-subtitle" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Grouped by type - click a group to see its detailed audit log
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleExportCSV} style={{ background: 'var(--bg-glass)' }}>
            <Download size={18} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={handleOpenModal}>
            <Plus size={18} /> New Transaction
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.2rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Filtered Records
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
            {countsLoading ? '...' : totalAllTypes.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Transactions matched
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.2rem', borderLeft: '4px solid var(--accent-primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
            Active Date Scope
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '0.4rem' }}>
            {datePreset === 'ALL' ? 'All Time History' : datePreset === 'CUSTOM' ? 'Custom Range' : datePreset}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {startDate ? `${startDate} ~ ${endDate}` : 'No date restriction'}
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1rem', flex: 1, flexWrap: 'wrap', alignItems: 'center', maxWidth: '700px' }}>
              <div className="search-box" style={{ flex: 1, minWidth: '220px' }}>
                <Search size={18} color="var(--text-secondary)" />
                <input
                  type="text"
                  placeholder="Search by product, SKU, note..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Date Preset Filter */}
              <select
                className="form-input"
                value={datePreset}
                onChange={e => handleDatePresetChange(e.target.value)}
                style={{ width: 'auto', minWidth: '130px', cursor: 'pointer' }}
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="7DAYS">Last 7 Days</option>
                <option value="30DAYS">Last 30 Days</option>
                <option value="MONTH">This Month</option>
              </select>

              {/* Sort Control Dropdown */}
              <select
                className="form-input"
                value={`${sortBy}:${sortOrder}`}
                onChange={e => {
                  const [field, order] = e.target.value.split(':');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                style={{ width: 'auto', minWidth: '170px', cursor: 'pointer' }}
              >
                <option value="createdAt:DESC">Date (Newest First)</option>
                <option value="createdAt:ASC">Date (Oldest First)</option>
                <option value="quantity:DESC">Quantity (High to Low)</option>
                <option value="quantity:ASC">Quantity (Low to High)</option>
                <option value="status:ASC">Status (A-Z)</option>
              </select>
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
              Total: {countsLoading ? '...' : totalAllTypes} transactions
            </div>
          </div>

          {/* Date Picker Custom Inputs Row */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={15} /> Date Range:
            </span>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setDatePreset('CUSTOM'); }}
              style={{ width: 'auto', padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>to</span>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setDatePreset('CUSTOM'); }}
              style={{ width: 'auto', padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
            />
            {(startDate || endDate) && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => handleDatePresetChange('ALL')}
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
              >
                Clear Range
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grouped by type */}
      <div className="glass-card" style={{ padding: '0.5rem' }}>
        {TX_TYPES.map((t, idx) => {
          const isOpen = !!expanded[t.key];
          const group = groups[t.key] || {};
          const count = counts[t.key] || 0;
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
                      No {t.label.toLowerCase()} transactions found matching criteria
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                            <th style={{ width: '30px' }}></th>
                            <th>PRODUCT</th>
                            <th
                              onClick={() => handleSort('quantity')}
                              style={{ cursor: 'pointer', userSelect: 'none', color: sortBy === 'quantity' ? 'var(--accent-primary)' : 'inherit', fontWeight: sortBy === 'quantity' ? 700 : 'normal' }}
                            >
                              QUANTITY {sortBy === 'quantity' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                            </th>
                            <th>TOTAL VALUE</th>
                            <th
                              onClick={() => handleSort('status')}
                              style={{ cursor: 'pointer', userSelect: 'none', color: sortBy === 'status' ? 'var(--accent-primary)' : 'inherit', fontWeight: sortBy === 'status' ? 700 : 'normal' }}
                            >
                              STATUS {sortBy === 'status' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                            </th>
                            <th
                              onClick={() => handleSort('createdAt')}
                              style={{ cursor: 'pointer', userSelect: 'none', color: sortBy === 'createdAt' ? 'var(--accent-primary)' : 'inherit', fontWeight: sortBy === 'createdAt' ? 700 : 'normal' }}
                            >
                              DATE {sortBy === 'createdAt' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
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
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{fmtVND(unitPrice)}/unit</div>
                                      </>
                                    ) : '-'}
                                  </td>
                                  <td>
                                    <span className="badge" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                                      {tx.status}
                                    </span>
                                  </td>
                                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(tx.createdAt).toLocaleString()}</td>
                                </tr>

                                {/* Expandable master-detail drawer */}
                                {isExpanded && (
                                  <tr style={{ background: 'var(--bg-glass-hover)' }}>
                                    <td colSpan="7" style={{ padding: '1.2rem 2rem', borderBottom: '2px solid var(--accent-primary)' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.2rem', alignItems: 'center' }}>
                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                            Transaction ID
                                          </div>
                                          <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
                                            {tx.id}
                                          </div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                                            Created By: <b>{tx.createdBy || 'System Admin'}</b>
                                          </div>
                                        </div>

                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                            Location Flow
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', fontSize: '0.9rem', fontWeight: 600 }}>
                                            <span>{tx.locationFrom || 'SUPPLIER'}</span>
                                            <ArrowRight size={14} color="var(--accent-primary)" />
                                            <span>{tx.locationTo || 'CUSTOMER'}</span>
                                          </div>
                                        </div>

                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                            Notes / Reason
                                          </div>
                                          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                                            {tx.note || 'No notes specified for this transaction.'}
                                          </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                          <button
                                            className="btn btn-outline"
                                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              alert(`Printing Dispatch Slip for Transaction:\nID: ${tx.id}\nProduct: ${prod?.name}\nQty: ${tx.quantity}\nDate: ${new Date(tx.createdAt).toLocaleString()}`);
                                            }}
                                          >
                                            <FileText size={14} /> Print Slip
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
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', alignItems: 'center' }}>
                          <button
                            className="btn btn-outline"
                            disabled={(group.page || 1) === 1}
                            onClick={() => fetchGroup(t.key, (group.page || 1) - 1)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            Previous
                          </button>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            Page <strong>{group.page || 1}</strong> of <strong>{totalPages}</strong>
                          </span>
                          <button
                            className="btn btn-outline"
                            disabled={(group.page || 1) === totalPages}
                            onClick={() => fetchGroup(t.key, (group.page || 1) + 1)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                          >
                            Next
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

      {/* Modal - rendered via portal so it always overlays the whole page regardless of scroll containers */}
      {showModal && ReactDOM.createPortal(
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) { setShowModal(false); setProductSearch(''); } }}
        >
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <h3 className="text-title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>New Transaction</h3>
            <p className="text-subtitle" style={{ fontSize: '0.85rem', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
              Create a new inbound, outbound, transfer, or stock adjustment order.
            </p>

            <form onSubmit={handleCreateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Product</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Type product name or SKU to filter..."
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
                      {p.name} ({p.sku}) {p.price ? `- ${p.price.toLocaleString()} VND` : ''}
                    </option>
                  ))}
                  {filteredProductsForSelect.length === 0 && (
                    <option value="" disabled>No products match your search</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Transaction Type</label>
                <select
                  className="form-input"
                  value={newTransaction.type}
                  onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value })}
                >
                  <option value="INBOUND">INBOUND (Import / Restock)</option>
                  <option value="OUTBOUND">OUTBOUND (Export / Sale)</option>
                  <option value="TRANSFER">TRANSFER (Internal Relocation)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT (Stock Count Correction)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>
                  Quantity
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
                {newTransaction.type === 'ADJUSTMENT' && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                    Note: Use negative numbers to reduce stock (e.g. -5 for damaged items).
                  </span>
                )}
              </div>

              {newTransaction.type !== 'INBOUND' && newTransaction.type !== 'ADJUSTMENT' && (
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Location From</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    value={newTransaction.locationFrom}
                    onChange={e => setNewTransaction({ ...newTransaction, locationFrom: e.target.value })}
                  />
                </div>
              )}

              {newTransaction.type !== 'OUTBOUND' && (
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Location To</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    value={newTransaction.locationTo}
                    onChange={e => setNewTransaction({ ...newTransaction, locationTo: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Note / Remarks</label>
                <textarea
                  className="form-input"
                  rows="3"
                  placeholder="Specify reason, invoice number, or details..."
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
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Order
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
