import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client';
import { 
  Map, Box, Search, RefreshCw, ArrowRightLeft, Sparkles, 
  Truck, Cpu, Compass, LayoutGrid, Laptop, Tv, Keyboard, Shield, Zap, Info, Layers, Table, PlusCircle, Package, X, AlertCircle
} from 'lucide-react';

const ZONE_CONFIG = {
  'ZONE-HIGH-VAL': { labelVi: 'Hàng Giá Trị Cao', name: 'Khu Hàng Giá Trị Cao (Laptop, Smartphone)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', desc: 'Dãy A (A01 - A06): Khu Nhặt Hàng Nhanh - Smartphone, Laptop, Drone' },
  'ZONE-LARGE-APPLIANCE': { labelVi: 'Điện Tử Cỡ Lớn', name: 'Khu Điện Tử Cỡ Lớn (Smart TV, Loa)', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', desc: 'Dãy B (B01 - B08): Khu Luân Chuyển Vừa - Smart TV, Loa, Máy chiếu' },
  'ZONE-ACCESSORIES': { labelVi: 'Linh Kiện & Phụ Kiện', name: 'Khu Linh Kiện & Phụ Kiện (High-Bay)', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', desc: 'Dãy C (C01 - C04): Khu Lưu Trữ Mật Độ Cao - Bàn phím, Chuột, RAM/SSD' },
  'ZONE-ESD-TEMP': { labelVi: 'Chống Tĩnh Điện ESD', name: 'Khu Chống Tĩnh Điện & Bán Dẫn (Phòng ESD)', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', desc: 'Dãy D (D01 - D02): Phòng ESD kiểm soát độ ẩm 45% (Chipset, Board)' },
};

const PRODUCT_PALETTE = [
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#6366f1',
  '#14b8a6',
  '#a855f7',
  '#e11d48',
];

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBaseUrl}${cleanUrl}`;
};

const WarehouseMap = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRack, setSelectedRack] = useState(null);

  // View mode: 'SPATIAL' (Architectural Blueprint Map) vs 'TABLE' (Table View)
  const [viewMode, setViewMode] = useState('SPATIAL');

  // Relocate state
  const [relocateItem, setRelocateItem] = useState(null);
  const [targetLocation, setTargetLocation] = useState('');
  const [relocateQty, setRelocateQty] = useState(1);
  const [relocateLoading, setRelocateLoading] = useState(false);

  // Add Product to Rack state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addProductId, setAddProductId] = useState('');
  const [addQty, setAddQty] = useState(10);
  const [addLoading, setAddLoading] = useState(false);
  const [addProductSearch, setAddProductSearch] = useState('');
  const [showAddProductDropdown, setShowAddProductDropdown] = useState(false);

  // Putaway suggestion state
  const [putawayProductId, setPutawayProductId] = useState('');
  const [putawaySearch, setPutawaySearch] = useState('');
  const [showPutawayDropdown, setShowPutawayDropdown] = useState(false);
  const [putawayQty, setPutawayQty] = useState(10);
  const [putawayResult, setPutawayResult] = useState(null);
  const [allProducts, setAllProducts] = useState([]);

  // Unallocated products state & modal
  const [unallocatedProducts, setUnallocatedProducts] = useState([]);
  const [showUnallocatedModal, setShowUnallocatedModal] = useState(false);
  const [unallocatedLoading, setUnallocatedLoading] = useState(false);

  useEffect(() => {
    fetchLocations();
    fetchProducts();
    fetchUnallocatedProducts();

    const handleClickOutside = (e) => {
      if (!e.target.closest('.suggestion-item') && !e.target.closest('.form-input')) {
        setShowSuggestions(false);
        setShowAddProductDropdown(false);
        setShowPutawayDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchUnallocatedProducts = async () => {
    try {
      setUnallocatedLoading(true);
      const res = await apiClient.get('/inventory/locations/unallocated');
      setUnallocatedProducts(res.data || []);
    } catch (err) {
      console.error('Failed to fetch unallocated products:', err);
    } finally {
      setUnallocatedLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/inventory/locations');
      const data = res.data || [];
      setLocations(data);
      // Keep selected rack data updated if modal is open
      if (selectedRack) {
        const updated = data.find(l => l.code === selectedRack.code);
        if (updated) setSelectedRack(updated);
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/inventory/products?limit=100');
      setAllProducts(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const handleSuggestPutaway = async () => {
    if (!putawayProductId) return alert('Vui lòng chọn sản phẩm!');
    try {
      const res = await apiClient.get(`/inventory/locations/suggest-putaway?productId=${putawayProductId}&quantity=${putawayQty}`);
      setPutawayResult(res.data);
    } catch (err) {
      alert('Lỗi gợi ý vị trí: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRelocate = async () => {
    if (!relocateItem || !targetLocation) return alert('Vui lòng chọn kệ đích!');
    try {
      setRelocateLoading(true);
      await apiClient.post('/inventory/locations/relocate', {
        productId: relocateItem.productId,
        fromLocation: selectedRack.code,
        toLocation: targetLocation,
        quantity: Number(relocateQty),
      });
      alert('Chuyển vị trí sản phẩm thành công!');
      setRelocateItem(null);
      fetchLocations();
    } catch (err) {
      alert('Lỗi chuyển vị trí: ' + (err.response?.data?.message || err.message));
    } finally {
      setRelocateLoading(false);
    }
  };

  const handleAddStockToRack = async (e) => {
    e.preventDefault();
    if (!addProductId) return alert('Vui lòng chọn sản phẩm muốn xếp vào kệ!');
    if (!addQty || addQty <= 0) return alert('Số lượng nhập phải lớn hơn 0!');

    const remaining = selectedRack.maxCapacity - (selectedRack.currentItemsCount || 0);
    if (addQty > remaining) {
      if (!window.confirm(`Cảnh báo: Kệ ${selectedRack.code} chỉ còn trống ${remaining} chỗ. Bạn vẫn muốn xếp vượt sức chứa?`)) {
        return;
      }
    }

    try {
      setAddLoading(true);
      await apiClient.post('/inventory/locations/add-stock', {
        productId: addProductId,
        location: selectedRack.code,
        quantity: Number(addQty)
      });
      alert(`Đã thêm thành công ${addQty} sản phẩm vào kệ ${selectedRack.code}!`);
      setShowAddForm(false);
      setAddProductId('');
      setAddQty(10);
      fetchLocations();
    } catch (err) {
      alert('Lỗi thêm sản phẩm vào kệ: ' + (err.response?.data?.message || err.message));
    } finally {
      setAddLoading(false);
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

  const getHeatmapBadge = (rate) => {
    if (rate >= 90) return { label: 'ĐẦY KỆ', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' };
    if (rate >= 50) return { label: 'SẮP ĐẦY', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' };
    return { label: 'CÒN TRỐNG', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' };
  };

  // Group locations for the architectural layout (Filled 20 Racks)
  const compactRacks = filteredLocations.filter(l => l.code.startsWith('C'));
  const esdRacks = filteredLocations.filter(l => l.code.startsWith('D'));
  const medRotRacksLeft = filteredLocations.filter(l => l.code === 'B01' || l.code === 'B02' || l.code === 'B03' || l.code === 'B04');
  const purePickingRacks = filteredLocations.filter(l => l.code.startsWith('A'));
  const medRotRacksRight = filteredLocations.filter(l => l.code === 'B05' || l.code === 'B06' || l.code === 'B07' || l.code === 'B08');

  const [showSuggestions, setShowSuggestions] = useState(false);

  const matchedProductSuggestions = (allProducts || []).filter(p => {
    if (!searchTerm.trim()) return false;
    const normQ = normalizeText(searchTerm);
    const normName = normalizeText(p.name);
    const normSku = normalizeText(p.sku);
    return normName.includes(normQ) || normSku.includes(normQ);
  }).slice(0, 10).map(p => {
    const foundLocs = locations.filter(loc => loc.items?.some(it => it.productId === p.id && it.quantity > 0));
    const storedLocationsText = foundLocs.length > 0 
      ? foundLocs.map(l => `Tầng ${l.code}`).join(', ')
      : 'Hàng chờ phân kệ';
    return { ...p, storedLocationsText, firstLocation: foundLocs[0] || null };
  });

  const handleSelectProductSuggestion = (p) => {
    setSearchTerm(p.name);
    setShowSuggestions(false);
    if (p.firstLocation) {
      setSelectedRack(p.firstLocation);
    }
  };

  const handleSelectLocationSuggestion = (loc) => {
    setSearchTerm(loc.code);
    setShowSuggestions(false);
    setSelectedRack(loc);
  };

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* Header Title Bar */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Map size={28} color="var(--accent-primary)" />
          <div>
            <h1 className="text-title" style={{ marginBottom: 0 }}>Sơ Đồ Kiến Trúc Mặt Bằng Kho Thực Tế (Tận Dụng Lối Đi)</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Mô hình không gian 20 kệ đầy đủ: Cửa Cảng Nhập/Xuất [A], Khu Tụ Hàng [B/E], Khu Mật Độ Cao [C], Khu Nhặt Hàng Nhanh [D], Khu Luân Chuyển Vừa.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* View Mode Switcher */}
          <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              className="btn"
              onClick={() => setViewMode('SPATIAL')}
              style={{
                padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px',
                background: viewMode === 'SPATIAL' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'SPATIAL' ? '#fff' : 'var(--text-secondary)', border: 'none'
              }}
            >
              <Compass size={16} style={{ marginRight: '6px' }} /> Sơ Đồ Mặt Bằng 2D
            </button>
            <button
              className="btn"
              onClick={() => setViewMode('TABLE')}
              style={{
                padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '6px',
                background: viewMode === 'TABLE' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'TABLE' ? '#fff' : 'var(--text-secondary)', border: 'none'
              }}
            >
              <Table size={16} style={{ marginRight: '6px' }} /> Bảng Danh Mục Kệ
            </button>
          </div>

          <button 
            className="btn" 
            onClick={() => { fetchUnallocatedProducts(); setShowUnallocatedModal(true); }} 
            style={{ 
              background: 'rgba(234, 179, 8, 0.15)', 
              color: '#d97706', 
              border: '1px solid rgba(234, 179, 8, 0.4)', 
              padding: '0.4rem 0.85rem', 
              fontSize: '0.85rem', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontWeight: 600 
            }}
            title="Xem danh sách sản phẩm chưa được xếp vào kệ kho"
          >
            <Package size={16} /> Hàng Chờ Phân Kệ
            {unallocatedProducts.length > 0 && (
              <span style={{ background: '#f59e0b', color: '#fff', borderRadius: '999px', padding: '1px 7px', fontSize: '0.75rem', fontWeight: 700 }}>
                {unallocatedProducts.length}
              </span>
            )}
          </button>

          <button className="btn btn-outline" onClick={() => { fetchLocations(); fetchUnallocatedProducts(); }} style={{ background: 'var(--bg-glass)' }}>
            <RefreshCw size={16} /> Làm mới
          </button>
        </div>
      </div>

      {/* Filter and AI Smart Putaway Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Left: Zone Filters & Search */}
        <div className="glass-card" style={{ padding: '1.25rem', position: 'relative', overflow: 'visible', zIndex: 50 }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 2 }} />
              <input
                type="text"
                className="form-input"
                placeholder="Tìm mã kệ (A01, B01...) hoặc tên sản phẩm..."
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                style={{ paddingLeft: '2.2rem', fontSize: '0.85rem' }}
              />

              {/* FLOATING AUTOCOMPLETE SUGGESTION DROPDOWN */}
              {showSuggestions && searchTerm.trim().length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    minWidth: '400px',
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '12px',
                    boxShadow: '0 16px 36px rgba(0, 0, 0, 0.28)',
                    zIndex: 9999,
                    maxHeight: '480px',
                    overflowY: 'auto',
                    padding: '0.5rem'
                  }}
                >
                  {/* Matching Products Only */}
                  {matchedProductSuggestions.length > 0 ? (
                    <div>
                      <div style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📦 Gợi ý Sản Phẩm ({matchedProductSuggestions.length}):
                      </div>
                      {matchedProductSuggestions.map(p => (
                        <div
                          key={p.id || p.sku}
                          style={{
                            padding: '0.45rem 0.6rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'space-between',
                            gap: '0.75rem',
                            transition: 'background 0.15s ease',
                            marginBottom: '2px',
                            borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.04))'
                          }}
                          className="suggestion-item"
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-light, rgba(99, 102, 241, 0.08))'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          onClick={() => handleSelectProductSuggestion(p)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                            {getImageUrl(p.imageUrl) ? (
                              <img src={getImageUrl(p.imageUrl)} alt="" style={{ width: '28px', height: '28px', borderRadius: '5px', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '28px', height: '28px', borderRadius: '5px', background: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Package size={14} />
                              </div>
                            )}
                            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>SKU: {p.sku} | {p.category || 'Điện tử'}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <span className="badge badge-primary" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '2px 8px' }}>
                              📍 {p.storedLocationsText}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '0.85rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      Không tìm thấy sản phẩm nào phù hợp với "{searchTerm}"
                    </div>
                  )}
                </div>
              )}
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lọc phân khu:</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className={`btn ${selectedZone === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedZone('ALL')}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              Tất cả khu vực ({locations.length} Kệ)
            </button>

            {Object.entries(ZONE_CONFIG).map(([zKey, zConfig]) => (
              <button
                key={zKey}
                className={`btn ${selectedZone === zKey ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedZone(zKey)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderLeft: `3px solid ${zConfig.color}` }}
              >
                {zConfig.labelVi}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Smart Putaway Suggestion Widget */}
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent-primary)', position: 'relative', overflow: 'visible', zIndex: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Sparkles size={20} color="var(--accent-primary)" />
            <strong style={{ fontSize: '0.95rem' }}>Gợi Ý Vị Trí Cất Hàng</strong>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', position: 'relative' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 Tìm tên hoặc SKU sản phẩm..."
                value={putawaySearch}
                onChange={e => {
                  setPutawaySearch(e.target.value);
                  if (putawayProductId) setPutawayProductId('');
                  setShowPutawayDropdown(true);
                }}
                onFocus={() => setShowPutawayDropdown(true)}
                style={{ fontSize: '0.8rem', paddingRight: putawayProductId ? '2.5rem' : '0.5rem' }}
              />

              {putawayProductId && (
                <button
                  type="button"
                  onClick={() => {
                    setPutawayProductId('');
                    setPutawaySearch('');
                    setShowPutawayDropdown(true);
                  }}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    padding: '2px 5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ✕ Đổi
                </button>
              )}

              {showPutawayDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    minWidth: '320px',
                    width: 'max(100%, 320px)',
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    borderRadius: '10px',
                    boxShadow: '0 14px 32px rgba(0,0,0,0.35)',
                    zIndex: 99999,
                    maxHeight: '360px',
                    overflowY: 'auto',
                    padding: '0.4rem'
                  }}
                >
                  {allProducts.filter(p => {
                    if (!putawaySearch.trim() || putawayProductId) return true;
                    const normQ = normalizeText(putawaySearch);
                    return normalizeText(p.name).includes(normQ) || normalizeText(p.sku).includes(normQ);
                  }).map(p => (
                    <div
                      key={p.id}
                      style={{
                        padding: '0.45rem 0.6rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        marginBottom: '2px',
                        background: putawayProductId === p.id ? 'var(--accent-light, rgba(99, 102, 241, 0.15))' : 'transparent',
                        borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.04))'
                      }}
                      className="suggestion-item"
                      onMouseEnter={(e) => {
                        if (putawayProductId !== p.id) e.currentTarget.style.background = 'var(--bg-secondary, rgba(0,0,0,0.05))';
                      }}
                      onMouseLeave={(e) => {
                        if (putawayProductId !== p.id) e.currentTarget.style.background = 'transparent';
                      }}
                      onClick={() => {
                        setPutawayProductId(p.id);
                        setPutawaySearch(`${p.name} (${p.sku})`);
                        setShowPutawayDropdown(false);
                      }}
                    >
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{p.name}</strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>SKU: {p.sku}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <input
              type="number"
              min="1"
              className="form-input"
              style={{ width: '110px', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center', padding: '0.4rem 0.5rem', flexShrink: 0 }}
              value={putawayQty}
              onChange={e => setPutawayQty(Number(e.target.value))}
            />
            <button className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', flexShrink: 0 }} onClick={handleSuggestPutaway}>
              Tìm Vị Trí
            </button>
          </div>

          {putawayResult && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
              🎯 Vị trí tối ưu: <b>Kệ {putawayResult.suggestedLocation}</b> ({
                putawayResult.reason
                  ?.replace(/ZONE-ACCESSORIES/g, 'Khu Linh Kiện & Phụ Kiện')
                  ?.replace(/ZONE-HIGH-VAL/g, 'Khu Hàng Giá Trị Cao')
                  ?.replace(/ZONE-LARGE-APPLIANCE/g, 'Khu Điện Tử Cỡ Lớn')
                  ?.replace(/ZONE-ESD-TEMP/g, 'Khu Chống Tĩnh Điện ESD')
              })
            </div>
          )}
        </div>
      </div>

      {viewMode === 'SPATIAL' ? (
        /* ARCHITECTURAL WAREHOUSE BLUEPRINT (2D CANVAS GRID) */
        <div className="glass-card" style={{ padding: '1.5rem', background: '#0b1329', color: '#f8fafc', border: '1px solid #1e293b' }}>
          
          {/* TOP ENTRY & EXIT DOCK ZONES (CỬA NHẬP / XUẤT HÀNG) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ border: '2px dashed #10b981', borderRadius: '10px', padding: '0.75rem 1.25rem', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Truck size={24} color="#10b981" />
                <div>
                  <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>[CẢNG A] CỬA NHẬP HÀNG (LOADING DOCK IN)</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tiếp nhận Container & Phân loại Pallet ban đầu</div>
                </div>
              </div>
              <span className="badge" style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem' }}>CỬA 01 - IN</span>
            </div>

            <div style={{ border: '2px dashed #ef4444', borderRadius: '10px', padding: '0.75rem 1.25rem', background: 'rgba(239, 68, 68, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Truck size={24} color="#ef4444" />
                <div>
                  <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.95rem' }}>[CẢNG A] CỬA XUẤT HÀNG (STAGING & SHIPPING DOCK)</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Đóng gói, dán tem vận chuyển & Đóng xe giao siêu thị</div>
                </div>
              </div>
              <span className="badge" style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem' }}>CỬA 02 - OUT</span>
            </div>
          </div>

          {/* MAIN WAREHOUSE SPATIAL LAYOUT GRID */}
          <div style={{ border: '1px solid #1e293b', padding: '1.25rem', borderRadius: '12px', background: '#0f172a', width: '100%', boxSizing: 'border-box', overflowX: 'auto' }}>
            
            {/* BluePrint Header Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontWeight: 700 }}>
                <LayoutGrid size={18} /> SƠ ĐỒ MẶT BẰNG KHO: 4 KỆ CHÍNH (KỆ A, B, C, D) & 20 TẦNG PHÂN KHU (MULTI-SKU)
              </div>

              {/* Legend Badges */}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }}></span> Trống (&lt;50%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px' }}></span> Sắp đầy (50-90%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px' }}></span> Đầy (≥90%)</span>
              </div>
            </div>

            {/* 4 MAIN SPATIAL COLUMNS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(190px, 1fr))', gap: '0.85rem', alignItems: 'start', width: '100%', boxSizing: 'border-box' }}>
              
              {/* COLUMN 1 (LEFT): KHU LƯU TRỮ MẬT ĐỘ CAO (C01 - C04) & PHÒNG ESD (D01 - D02) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                {/* Block C: Compact High-Bay */}
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.4)', borderRadius: '10px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#c084fc', marginBottom: '0.25rem', textAlign: 'center', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', paddingBottom: '0.4rem' }}>
                    [KỆ C] KHU MẬT ĐỘ CAO
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textAlign: 'center', marginBottom: '0.75rem' }}>Kệ C (4 Tầng Linh Kiện: C01 - C04)</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {compactRacks.map(loc => {
                      const badge = getHeatmapBadge(loc.occupancyRate);
                      return (
                        <div
                          key={loc.id}
                          onClick={() => setSelectedRack(loc)}
                          style={{
                            padding: '0.65rem 0.75rem',
                            background: '#1e293b',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            borderLeft: `4px solid ${badge.color}`,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>Tầng {loc.code}</strong>
                            <span style={{ background: badge.bg, color: badge.color, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>{loc.occupancyRate}%</span>
                          </div>
                          <div style={{ height: '6px', background: '#0f172a', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                            <div style={{ width: `${loc.occupancyRate}%`, height: '100%', background: badge.color }}></div>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {loc.description || 'Tầng đa năng High-Bay'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Block D: ESD & Temperature Sensitive Room */}
                <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: '10px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#22d3ee', marginBottom: '0.25rem', textAlign: 'center', borderBottom: '1px solid rgba(6, 182, 212, 0.3)', paddingBottom: '0.4rem' }}>
                    [KỆ D] PHÒNG CHỐNG TĨNH ĐIỆN ESD
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textAlign: 'center', marginBottom: '0.75rem' }}>Kệ D (2 Tầng Phòng Sạch: D01 - D02)</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {esdRacks.map(loc => {
                      const badge = getHeatmapBadge(loc.occupancyRate);
                      return (
                        <div
                          key={loc.id}
                          onClick={() => setSelectedRack(loc)}
                          style={{
                            padding: '0.65rem 0.75rem',
                            background: '#1e293b',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            borderLeft: `4px solid ${badge.color}`,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>Tầng {loc.code}</strong>
                            <span style={{ background: badge.bg, color: badge.color, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>{loc.occupancyRate}%</span>
                          </div>
                          <div style={{ height: '6px', background: '#0f172a', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                            <div style={{ width: `${loc.occupancyRate}%`, height: '100%', background: badge.color }}></div>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {loc.description || 'Tầng ESD kiểm soát độ ẩm'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* COLUMN 2: KHU LUÂN CHUYỂN VỪA (KỆ B TRÁI: B01 - B04) */}
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '10px', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#60a5fa', marginBottom: '0.25rem', textAlign: 'center', borderBottom: '1px solid rgba(59, 130, 246, 0.3)', paddingBottom: '0.4rem' }}>
                  KỆ B (Dãy Trái: B01 - B04)
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textAlign: 'center', marginBottom: '0.75rem' }}>Kệ B (Tầng B01 ➔ B04 - Điện Tử Cỡ Lớn)</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {medRotRacksLeft.map(loc => {
                    const badge = getHeatmapBadge(loc.occupancyRate);
                    return (
                      <div
                        key={loc.id}
                        onClick={() => setSelectedRack(loc)}
                        style={{
                          padding: '0.65rem 0.75rem',
                          background: '#1e293b',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          borderLeft: `4px solid ${badge.color}`,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>Tầng {loc.code}</strong>
                          <span style={{ background: badge.bg, color: badge.color, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>{loc.occupancyRate}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#0f172a', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                          <div style={{ width: `${loc.occupancyRate}%`, height: '100%', background: badge.color }}></div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {loc.description || 'Pallet tầng - Smart TV & Loa'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUMN 3 (CENTER): KHU NHẶT HÀNG NHANH TRUNG TÂM (KỆ A: A01 - A06) */}
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '2px solid rgba(16, 185, 129, 0.5)', borderRadius: '10px', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34d399', marginBottom: '0.25rem', textAlign: 'center', borderBottom: '1px solid rgba(16, 185, 129, 0.3)', paddingBottom: '0.4rem' }}>
                  [KỆ A] KHU NHẶT HÀNG CHUYÊN BIỆT
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textAlign: 'center', marginBottom: '0.75rem' }}>Kệ A (6 Tầng Hàng Giá Trị Cao: A01 - A06)</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {purePickingRacks.map(loc => {
                    const badge = getHeatmapBadge(loc.occupancyRate);
                    return (
                      <div
                        key={loc.id}
                        onClick={() => setSelectedRack(loc)}
                        style={{
                          padding: '0.65rem 0.75rem',
                          background: '#1e293b',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          borderLeft: `4px solid ${badge.color}`,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>Tầng {loc.code}</strong>
                          <span style={{ background: badge.bg, color: badge.color, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>{loc.occupancyRate}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#0f172a', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                          <div style={{ width: `${loc.occupancyRate}%`, height: '100%', background: badge.color }}></div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {loc.description || 'Tủ kính an ninh cao'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* COLUMN 4 (RIGHT): KHU LUÂN CHUYỂN VỪA (KỆ B PHẢI: B05 - B08) */}
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '10px', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#60a5fa', marginBottom: '0.25rem', textAlign: 'center', borderBottom: '1px solid rgba(59, 130, 246, 0.3)', paddingBottom: '0.4rem' }}>
                  KỆ B (Dãy Phải: B05 - B08)
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', textAlign: 'center', marginBottom: '0.75rem' }}>Kệ B (Tầng B05 ➔ B08 - Điện Tử Cỡ Lớn)</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {medRotRacksRight.map(loc => {
                    const badge = getHeatmapBadge(loc.occupancyRate);
                    return (
                      <div
                        key={loc.id}
                        onClick={() => setSelectedRack(loc)}
                        style={{
                          padding: '0.65rem 0.75rem',
                          background: '#1e293b',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          borderLeft: `4px solid ${badge.color}`,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>Tầng {loc.code}</strong>
                          <span style={{ background: badge.bg, color: badge.color, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>{loc.occupancyRate}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#0f172a', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                          <div style={{ width: `${loc.occupancyRate}%`, height: '100%', background: badge.color }}></div>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {loc.description || 'Kệ khung thép chịu tải màn hình'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        /* TABLE VIEW (RACK & LEVEL TABLE) */
        <div className="glass-card" style={{ padding: '0.5rem', overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-primary)', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem' }}>MÃ KỆ (RACK)</th>
                <th style={{ padding: '1rem' }}>VỊ TRÍ TẦNG (LEVEL)</th>
                <th style={{ padding: '1rem' }}>PHÂN KHU (ZONE)</th>
                <th style={{ padding: '1rem' }}>SỨC CHỨA TẦNG</th>
                <th style={{ padding: '1rem' }}>TẢI TRỌNG TỐI ĐA</th>
                <th style={{ padding: '1rem' }}>TRẠNG THÁI KHÔNG GIAN TẦNG</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocations.map(loc => {
                const zMeta = ZONE_CONFIG[loc.zone] || ZONE_CONFIG['ZONE-ACCESSORIES'];
                const remaining = loc.maxCapacity - loc.currentItemsCount;
                const isFull = loc.occupancyRate >= 100;
                const isHigh = loc.occupancyRate >= 80;

                return (
                  <tr key={loc.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => setSelectedRack(loc)}>
                    <td style={{ padding: '1rem', fontWeight: 700, fontSize: '1.05rem', color: '#60a5fa' }}>
                      Kệ {loc.aisle}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-primary)' }}>
                      Tầng {loc.code}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge" style={{ background: zMeta.bg, color: zMeta.color, fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}>
                        {zMeta.labelVi}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700 }}>{loc.maxCapacity} sản phẩm</td>
                    <td style={{ padding: '1rem' }}>{Number(loc.maxWeightKg).toFixed(2)} kg</td>
                    <td style={{ padding: '1rem' }}>
                      {isFull ? (
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                          🔴 ĐÃ ĐẦY TẦNG (100%)
                        </span>
                      ) : isHigh ? (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                          🟡 SẮP ĐẦY (Còn trống {remaining} ô - {loc.occupancyRate}%)
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                          🟢 CÒN TRỐNG {remaining} Ô ({loc.occupancyRate}% đã dùng)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rack Details Modal & Direct Add Product to Rack Action */}
      {selectedRack && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '650px', padding: '1.5rem', background: 'var(--bg-secondary)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Chi Tiết Tầng Kho: <code style={{ color: 'var(--accent-primary)', fontSize: '1.4rem' }}>Tầng {selectedRack.code}</code>
                </h2>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Thuộc Kệ {selectedRack.aisle} | Phân khu: {ZONE_CONFIG[selectedRack.zone]?.name || selectedRack.zone}
                </span>
              </div>
              <button className="btn btn-outline" onClick={() => { setSelectedRack(null); setRelocateItem(null); setShowAddForm(false); }}>✕ Đóng</button>
            </div>

            {/* CAPACITY & AVAILABILITY DISPLAY CARD */}
            {(() => {
              const currentUsed = selectedRack.currentItemsCount || 0;
              const maxCap = selectedRack.maxCapacity || 500;
              const remaining = Math.max(0, maxCap - currentUsed);
              const freePercent = Math.round((remaining / maxCap) * 100);

              return (
                <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sức Chứa Tối Đa Tầng</div>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{maxCap} sản phẩm</strong>
                    </div>
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Đã Lưu Trên Tầng Này</div>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{currentUsed} sản phẩm</strong>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.5rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Còn Trống Tầng</div>
                      <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>{remaining} chỗ</strong>
                    </div>
                  </div>

                  {/* Visual Multi-Product Color Segmented Capacity Bar */}
                  <div style={{
                    height: '14px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '7px',
                    overflow: 'hidden',
                    marginBottom: '0.65rem',
                    display: 'flex',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
                  }}>
                    {selectedRack.items && selectedRack.items.length > 0 ? (
                      selectedRack.items.map((it, idx) => {
                        const color = PRODUCT_PALETTE[idx % PRODUCT_PALETTE.length];
                        const pQty = it.quantity || 0;
                        const widthPct = (pQty / maxCap) * 100;
                        const pName = it.productName || it.product?.name || `Sản phẩm ${idx + 1}`;
                        return (
                          <div
                            key={idx}
                            style={{
                              width: `${widthPct}%`,
                              height: '100%',
                              background: color,
                              borderRight: '1px solid rgba(255,255,255,0.4)',
                              transition: 'width 0.3s ease'
                            }}
                            title={`${pName}: ${pQty} món (${Math.round(widthPct)}% dung lượng tầng)`}
                          />
                        );
                      })
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    <span>Tải trọng tối đa tầng: <b>{selectedRack.maxWeightKg} kg</b></span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>🟢 Khả dụng {freePercent}% dung lượng tầng</span>
                  </div>
                </div>
              );
            })()}

            {/* TITLE BAR: PRODUCTS ON THIS RACK */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Các sản phẩm đang xếp trên tầng này ({selectedRack.items?.length || 0}):</h4>
            </div>

            {/* List of items on this Rack Level */}
            {selectedRack.items && selectedRack.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem' }}>
                {selectedRack.items.map((it, idx) => {
                  const color = PRODUCT_PALETTE[idx % PRODUCT_PALETTE.length];
                  return (
                    <div key={idx} style={{ padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} title={`Màu phân đoạn trên thanh tải trọng`} />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{it.productName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SKU: {it.productSku} | Số lượng: <b>{it.quantity} món</b></div>
                        </div>
                      </div>
                      <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => { setRelocateItem(it); setRelocateQty(it.quantity); setShowAddForm(false); }}>
                        <ArrowRightLeft size={14} /> Chuyển Tầng
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', padding: '1rem', textAlign: 'center', background: 'var(--bg-primary)', borderRadius: '8px', marginBottom: '1rem' }}>Tầng này hiện đang trống hoàn toàn.</p>
            )}

            {/* Relocate Form */}
            {relocateItem && (
              <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '10px', border: '1px solid var(--accent-primary)', marginTop: '0.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--accent-primary)', fontSize: '0.95rem' }}>🔄 Chuyển Tầng Cho: {relocateItem.productName}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Số lượng chuyển:</label>
                    <input type="number" min="1" max={relocateItem.quantity} className="form-input" value={relocateQty} onChange={e => setRelocateQty(Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Chọn Tầng đích đến:</label>
                    <select className="form-input" value={targetLocation} onChange={e => setTargetLocation(e.target.value)}>
                      <option value="">-- Chọn Tầng đến --</option>
                      {locations.filter(l => l.code !== selectedRack.code).map(l => (
                        <option key={l.id} value={l.code}>Tầng {l.code} (Kệ {l.aisle} - Trống {l.maxCapacity - l.currentItemsCount} chỗ)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" onClick={() => setRelocateItem(null)}>Hủy</button>
                  <button className="btn btn-primary" onClick={handleRelocate} disabled={relocateLoading}>
                    {relocateLoading ? 'Đang chuyển...' : 'Xác Nhận Chuyển'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UNALLOCATED PRODUCTS MODAL */}
      {showUnallocatedModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: '280px',
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1.5rem',
        }}>
          <div className="glass-card animate-scale-up" style={{
            width: '100%',
            maxWidth: '880px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.75rem',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary, #1e293b)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={24} color="#f59e0b" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sản Phẩm Đang Chờ Phân Kệ Kho</h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Danh sách hàng mới nhập chưa được sắp xếp vào các vị trí kệ kho thực tế (Unallocated Stock)</p>
                </div>
              </div>
              <button className="btn btn-outline" style={{ padding: '0.4rem', borderRadius: '8px' }} onClick={() => setShowUnallocatedModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Sub-header Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tổng sản phẩm chưa xếp kệ:</span>
                <strong style={{ fontSize: '1.1rem', color: '#f59e0b' }}>{unallocatedProducts.length} mặt hàng</strong>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tổng số lượng chờ cất kho:</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--accent-primary)' }}>
                  {unallocatedProducts.reduce((sum, p) => sum + p.unallocatedQty, 0)} {unallocatedProducts[0]?.unit || 'Chiếc'}
                </strong>
              </div>
            </div>

            {/* Product List Table / Card */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {unallocatedProducts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {unallocatedProducts.map((p) => (
                    <div key={p.productId} style={{
                      padding: '1rem',
                      background: 'var(--bg-primary)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      display: 'grid',
                      gridTemplateColumns: '60px 2fr 1fr 1fr 150px',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        {getImageUrl(p.imageUrl) ? (
                          <img src={getImageUrl(p.imageUrl)} alt={p.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Box size={24} color="var(--text-secondary)" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                          <span>SKU: <b style={{ color: 'var(--accent-primary)' }}>{p.sku}</b></span>
                          <span>| Danh mục: <b>{p.category || 'Điện tử'}</b></span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.85rem' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Tổng tồn kho:</div>
                        <strong>{p.totalStock} {p.unit}</strong>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Chờ phân kệ:</div>
                        <span style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#d97706',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'inline-block'
                        }}>
                          {p.unallocatedQty} {p.unit}
                        </span>
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', gap: '4px', justifyContent: 'center' }}
                        onClick={() => {
                          setPutawayProductId(p.productId);
                          setPutawayQty(p.unallocatedQty);
                          setShowUnallocatedModal(false);
                          // Auto trigger AI Suggestion
                          apiClient.get(`/inventory/locations/suggest-putaway?productId=${p.productId}&quantity=${p.unallocatedQty}`)
                            .then(res => setPutawayResult(res.data))
                            .catch(() => {});
                        }}
                      >
                        <Sparkles size={14} /> Gợi Ý Kệ
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                  <Package size={42} color="var(--success)" style={{ marginBottom: '0.75rem' }} />
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Tất cả sản phẩm đã được xếp vào các kệ kho đầy đủ!</p>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.82rem' }}>Không có mặt hàng nào đang ở trạng thái chờ phân kệ.</p>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setShowUnallocatedModal(false)}>Đóng</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WarehouseMap;
