import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client';
import { Layers, RefreshCw, Search, Plus, Edit2, Trash2, X, Save, AlertTriangle } from 'lucide-react';

const ZONE_TRANSLATIONS = {
  'ZONE-HIGH-VAL': { label: 'Khu Hàng Giá Trị Cao', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  'ZONE-LARGE-APPLIANCE': { label: 'Khu Điện Tử Cỡ Lớn', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  'ZONE-ACCESSORIES': { label: 'Khu Linh Kiện & Phụ Kiện', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  'ZONE-ESD-TEMP': { label: 'Khu Chống Tĩnh Điện ESD', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
};

const LocationManagement = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [deletingLoc, setDeletingLoc] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: '',
    zone: 'ZONE-ACCESSORIES',
    aisle: 'Kệ A',
    maxCapacity: 60,
    maxWeightKg: 500,
    description: '',
  });

  // Lock body scroll when modal is active
  useEffect(() => {
    if (showAddModal || editingLoc || deletingLoc) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showAddModal, editingLoc, deletingLoc]);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/inventory/locations');
      setLocations(res.data || []);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setForm({
      code: '',
      zone: 'ZONE-ACCESSORIES',
      aisle: 'Kệ A',
      maxCapacity: 60,
      maxWeightKg: 500,
      description: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (loc) => {
    setEditingLoc(loc);
    setForm({
      code: loc.code || '',
      zone: loc.zone || 'ZONE-ACCESSORIES',
      aisle: loc.aisle || 'Dãy A',
      maxCapacity: loc.maxCapacity || 300,
      maxWeightKg: loc.maxWeightKg || 500,
      description: loc.description || '',
    });
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) return alert('Vui lòng nhập Mã Tầng kho!');

    try {
      setSubmitting(true);
      await apiClient.post('/inventory/locations', form);
      alert('Đã thêm Tầng kho mới thành công!');
      setShowAddModal(false);
      fetchLocations();
    } catch (err) {
      alert('Lỗi tạo Tầng kho: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingLoc) return;

    try {
      setSubmitting(true);
      await apiClient.patch(`/inventory/locations/${editingLoc.id}`, form);
      alert('Đã cập nhật Tầng kho thành công!');
      setEditingLoc(null);
      fetchLocations();
    } catch (err) {
      alert('Lỗi cập nhật Tầng kho: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingLoc) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/inventory/locations/${deletingLoc.id}`);
      alert(`Đã xóa Tầng kho [${deletingLoc.code}] thành công!`);
      setDeletingLoc(null);
      fetchLocations();
    } catch (err) {
      alert('Lỗi xóa Tầng kho: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const normalizeText = (str) => {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
  };

  const matchLocationSearch = (loc, query) => {
    if (!query || !query.trim()) return true;

    const normQ = normalizeText(query);
    const code = (loc.code || '').toUpperCase();
    const aisle = (loc.aisle || '').toUpperCase();
    const desc = (loc.description || '').toLowerCase();

    const normCode = normalizeText(code);
    const normAisle = normalizeText(aisle);
    const normDesc = normalizeText(desc);

    // 1. Direct code/aisle/desc includes
    if (normCode.includes(normQ) || normAisle.includes(normQ) || normDesc.includes(normQ)) return true;

    // 2. Prefix matching ("Tầng A01", "Level A01", "Kệ A01", "Dãy A01")
    const codeWithPrefix = `tang ${normCode} ke ${normCode} level ${normCode} day ${normCode}`;
    if (codeWithPrefix.includes(normQ)) return true;

    // 3. Reverse check (if search query contains the location code e.g. "xem tầng A01")
    if (normQ.includes(normCode)) return true;

    // 4. Letter + Digit combination matching (e.g. "A 01", "a-01", "A 1", "tầng A1")
    const digitMatch = normQ.match(/\d+/);
    const letterMatch = normQ.match(/[a-d]/i);

    if (letterMatch && digitMatch) {
      const searchLetter = letterMatch[0].toUpperCase();
      const searchDigits = digitMatch[0];
      const formattedDigits = searchDigits.padStart(2, '0');
      const targetCode1 = `${searchLetter}${searchDigits}`;
      const targetCode2 = `${searchLetter}${formattedDigits}`;

      if (code === targetCode1 || code === targetCode2) return true;
    }

    // 5. Match items inside this location
    if (loc.items && Array.isArray(loc.items)) {
      const itemMatch = loc.items.some(item => {
        const pName = normalizeText(item.productName || item.name);
        const pSku = normalizeText(item.productSku || item.sku);
        return pName.includes(normQ) || pSku.includes(normQ);
      });
      if (itemMatch) return true;
    }

    return false;
  };

  const filteredLocations = locations.filter(loc => {
    const matchesZone = selectedZone === 'ALL' || loc.zone === selectedZone;
    const matchesSearch = matchLocationSearch(loc, searchTerm);
    return matchesZone && matchesSearch;
  });

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

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* Header Title Bar */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Layers size={28} color="var(--accent-primary)" />
          <div>
            <h1 className="text-title" style={{ marginBottom: 0 }}>Danh Mục Kệ Kho & Phân Khu (Location & Rack Management)</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Quản lý định vị Tầng kho, Phân khu chuyên dụng, Sức chứa tối đa & Trạng thái không gian thời gian thực.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={fetchLocations} style={{ background: 'var(--bg-glass)' }}>
            <RefreshCw size={16} /> Làm mới
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo mã tầng (A01, B01, D01...)..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn ${selectedZone === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedZone('ALL')}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            Tất cả Phân Khu ({locations.length})
          </button>

          {Object.entries(ZONE_TRANSLATIONS).map(([zKey, zMeta]) => (
            <button
              key={zKey}
              className={`btn ${selectedZone === zKey ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedZone(zKey)}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderLeft: `3px solid ${zMeta.color}` }}
            >
              {zMeta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Location Table */}
      <div className="table-container glass-card" style={{ padding: '0.5rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã Kệ (Rack)</th>
              <th>Vị Trí Tầng (Level Code)</th>
              <th>Phân Khu (Zone)</th>
              <th>Sức Chứa Tầng</th>
              <th>Tải Trọng Tối Đa</th>
              <th>Trạng Thái Không Gian Tầng</th>
              <th style={{ textAlign: 'center', width: '90px' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Đang tải danh mục Tầng kho...
                </td>
              </tr>
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Không tìm thấy Tầng kho phù hợp.
                </td>
              </tr>
            ) : (
              filteredLocations.map(loc => {
                const zMeta = ZONE_TRANSLATIONS[loc.zone] || { label: loc.zone, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' };
                const currentCount = loc.currentItemsCount || 0;
                const remaining = loc.maxCapacity - currentCount;
                const rate = loc.occupancyRate || 0;
                const isFull = rate >= 100;
                const isHigh = rate >= 80;

                const rackName = loc.aisle ? (loc.aisle.startsWith('Kệ') || loc.aisle.startsWith('Dãy') ? loc.aisle : `Kệ ${loc.aisle}`) : `Kệ ${loc.code[0] || 'A'}`;

                return (
                  <tr key={loc.id}>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#60a5fa' }}>{rackName}</span>
                    </td>
                    <td>
                      <code style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-primary)' }}>Tầng {loc.code}</code>
                      {loc.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {loc.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge" style={{ background: zMeta.bg, color: zMeta.color, fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}>
                        {zMeta.label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{loc.maxCapacity} sản phẩm</td>
                    <td>{Number(loc.maxWeightKg).toFixed(2)} kg</td>
                    <td>
                      {isFull ? (
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                          🔴 ĐÃ ĐẦY TẦNG (100%)
                        </span>
                      ) : isHigh ? (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                          🟡 SẮP ĐẦY (Còn trống {remaining} ô - {rate}%)
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                          🟢 CÒN TRỐNG {remaining} Ô ({rate}% đã dùng)
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '5px 7px', fontSize: '0.75rem', background: 'transparent' }}
                          onClick={() => handleOpenEdit(loc)}
                          title="Sửa kệ"
                        >
                          <Edit2 size={14} color="var(--accent-primary)" />
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '5px 7px', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}
                          onClick={() => setDeletingLoc(loc)}
                          title="Xóa kệ"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Location Modal via Portal */}
      {(showAddModal || editingLoc) && createPortal(
        <div
          style={modalBackdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false);
              setEditingLoc(null);
            }
          }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '520px',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={22} color="var(--accent-primary)" />
                <h3 className="text-subtitle" style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                  {editingLoc ? 'Sửa Thông Tin Tầng Kho' : 'Thêm Tầng Kho Mới'}
                </h3>
              </div>
              <button
                className="btn"
                style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLoc(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editingLoc ? handleSaveEdit : handleSaveAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Mã Vị Trí Tầng (Level Code)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: A07, B09, C05..."
                  value={form.code}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setForm({
                      ...form,
                      code: val,
                      aisle: val ? (val[0] === 'A' ? 'Kệ A' : val[0] === 'B' ? 'Kệ B' : val[0] === 'C' ? 'Kệ C' : val[0] === 'D' ? 'Kệ D' : `Kệ ${val[0]}`) : form.aisle,
                    });
                  }}
                  required
                />
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Phân Khu Chuyên Dụng (Zone)</label>
                <select className="form-input" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
                  {Object.entries(ZONE_TRANSLATIONS).map(([zKey, zMeta]) => (
                    <option key={zKey} value={zKey}>{zMeta.label} ({zKey})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Tên Kệ Kho (Rack Name)</label>
                  <select
                    className="form-input"
                    value={form.aisle}
                    onChange={(e) => setForm({ ...form, aisle: e.target.value })}
                    required
                  >
                    <option value="Kệ A">Kệ A</option>
                    <option value="Kệ B">Kệ B</option>
                    <option value="Kệ C">Kệ C</option>
                    <option value="Kệ D">Kệ D</option>
                  </select>
                </div>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Sức Chứa Tối Đa Tầng (SP)</label>
                  <input
                    type="number"
                    min="10"
                    className="form-input"
                    value={form.maxCapacity}
                    onChange={(e) => setForm({ ...form, maxCapacity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Tải Trọng Tối Đa Tầng (kg)</label>
                <input
                  type="number"
                  min="50"
                  step="0.01"
                  className="form-input"
                  value={form.maxWeightKg}
                  onChange={(e) => setForm({ ...form, maxWeightKg: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Mô tả / Ghi chú về Tầng kho</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Tầng kính bảo vệ - Smartphone & Tablet..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ minWidth: '90px' }}
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLoc(null);
                  }}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '130px', gap: '6px' }}>
                  <Save size={16} /> {submitting ? 'Đang lưu...' : (editingLoc ? 'Lưu Thay Đổi' : 'Tạo Tầng Mới')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm Modal via Portal */}
      {deletingLoc && createPortal(
        <div
          style={modalBackdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingLoc(null);
          }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '440px',
              width: '92%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'var(--bg-card, #ffffff)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--danger-light, rgba(239, 68, 68, 0.15))',
                color: 'var(--danger, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                margin: '0 auto 1.25rem'
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Xác Nhận Xóa Tầng Kho?
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Bạn có chắc chắn muốn xóa Tầng kho <b style={{ color: 'var(--accent-primary)' }}>"[{deletingLoc.code}]"</b> không?<br />
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '4px', display: 'inline-block' }}>
                ⚠️ Chỉ có thể xóa Tầng trống không chứa hàng hóa!
              </span>
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1, padding: '0.65rem 1rem' }}
                onClick={() => setDeletingLoc(null)}
                disabled={submitting}
              >
                Hủy Bỏ
              </button>
              <button
                className="btn"
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  background: 'var(--danger, #ef4444)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm, 8px)',
                  cursor: 'pointer'
                }}
                onClick={handleConfirmDelete}
                disabled={submitting}
              >
                {submitting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LocationManagement;
