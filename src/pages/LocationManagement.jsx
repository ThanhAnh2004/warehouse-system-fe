import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Layers, RefreshCw, Box, Database, Search } from 'lucide-react';

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

  const filteredLocations = locations.filter(loc => {
    const matchesZone = selectedZone === 'ALL' || loc.zone === selectedZone;
    const matchesSearch = loc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (loc.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesZone && matchesSearch;
  });

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* Header Title Bar */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Layers size={28} color="var(--accent-primary)" />
          <div>
            <h1 className="text-title" style={{ marginBottom: 0 }}>Danh Mục Kệ Kho & Phân Khu (Location Management)</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Quản lý định vị Kệ kho, Phân khu chuyên dụng, Sức chứa tối đa & Trạng thái không gian thời gian thực.
            </p>
          </div>
        </div>

        <button className="btn btn-outline" onClick={fetchLocations} style={{ background: 'var(--bg-glass)' }}>
          <RefreshCw size={16} /> Làm mới
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Tìm theo mã kệ (A01, B01, D01...)..."
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
              <th>Mã Kệ (Location Code)</th>
              <th>Phân Khu (Zone)</th>
              <th>Dãy (Aisle)</th>
              <th>Sức Chứa Tối Đa</th>
              <th>Tải Trọng Tối Đa</th>
              <th>Trạng Thái Không Gian</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Đang tải danh mục Kệ kho...
                </td>
              </tr>
            ) : filteredLocations.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Không tìm thấy Kệ kho phù hợp.
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

                return (
                  <tr key={loc.id}>
                    <td>
                      <code style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-primary)' }}>{loc.code}</code>
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
                    <td style={{ fontWeight: 600 }}>Dãy {loc.aisle}</td>
                    <td style={{ fontWeight: 700 }}>{loc.maxCapacity} sản phẩm</td>
                    <td>{Number(loc.maxWeightKg).toFixed(2)} kg</td>
                    <td>
                      {isFull ? (
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                          🔴 ĐÃ ĐẦY KỆ (100%)
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LocationManagement;
