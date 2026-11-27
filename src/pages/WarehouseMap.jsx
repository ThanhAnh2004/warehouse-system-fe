import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { 
  Map as MapIcon, Box, Search, RefreshCw, ArrowRightLeft, Sparkles, 
  Truck, Cpu, Compass, LayoutGrid, Laptop, Tv, Keyboard, Shield, Zap, Info, Layers, Table, PlusCircle, Package, X, AlertCircle
} from 'lucide-react';

const ZONE_CONFIG = {
  'ZONE-ACCESSORIES': { 
    labelVi: 'Khu Mật Độ Cao', 
    name: 'Khu Lưu Trữ Mật Độ Cao (Kệ C & Kệ D)', 
    color: '#8b5cf6', 
    bg: 'rgba(139, 92, 246, 0.12)', 
    desc: 'Kệ C (4 Tầng Phụ Kiện, Linh Kiện) & Kệ D (3 Tầng Kỹ Thuật, Đổi Trả 30 Ngày & Bảo Hành)' 
  },
  'ZONE-LARGE-APPLIANCE': { 
    labelVi: 'Khu Luân Chuyển Vừa', 
    name: 'Khu Luân Chuyển Vừa (Điện Máy & Điện Lạnh Cỡ Lớn)', 
    color: '#3b82f6', 
    bg: 'rgba(59, 130, 246, 0.12)', 
    desc: 'Kệ B1 (4 Tầng Smart TV & Loa) & Kệ B2 (4 Tầng Tủ Lạnh, Máy Giặt, Điều Hòa)' 
  },
  'ZONE-HIGH-VAL': { 
    labelVi: 'Khu Nhặt Hàng Nhanh', 
    name: 'Khu Nhặt Hàng Nhanh (Công Nghệ Giá Trị Cao)', 
    color: '#10b981', 
    bg: 'rgba(16, 185, 129, 0.12)', 
    desc: 'Kệ A1 (3 Tầng Smartphone & Smartwatch) & Kệ A2 (3 Tầng MacBook, Laptop & iPad)' 
  },
};

const getZoneMeta = (zoneKey) => {
  if (zoneKey === 'ZONE-SERVICE-RMA' || zoneKey === 'ZONE-ESD-TEMP') {
    return ZONE_CONFIG['ZONE-ACCESSORIES'];
  }
  return ZONE_CONFIG[zoneKey] || ZONE_CONFIG['ZONE-ACCESSORIES'];
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
  const { hasPermission } = useContext(AuthContext);
  const { showAlert, showConfirm } = useDialog();
  const canAllocate = hasPermission('locations:allocate');
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
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  useEffect(() => {
    setRelocateItem(null);
    setShowAddForm(false);
    setAddProductId('');
    setAddProductSearch('');
    setAddQty(1);
  }, [selectedRack?.code]);

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

  const fetchLocations = async (keepSelectedCode = null) => {
    try {
      setLoading(true);
      const res = await apiClient.get('/inventory/locations');
      const data = res.data || [];
      setLocations(data);
      // Keep selected rack data updated if modal is open
      const codeToKeep = keepSelectedCode || selectedRack?.code;
      if (codeToKeep) {
        const updated = data.find(l => l.code === codeToKeep);
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
    if (!putawayProductId) return showAlert('Vui lòng chọn sản phẩm!');
    try {
      const res = await apiClient.get(`/inventory/locations/suggest-putaway?productId=${putawayProductId}&quantity=${putawayQty}`);
      setPutawayResult(res.data);
    } catch (err) {
      showAlert('Lỗi gợi ý vị trí: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRelocate = async () => {
    if (!relocateItem || !targetLocation) return showAlert('Vui lòng chọn kệ đích!');
    try {
      setRelocateLoading(true);
      await apiClient.post('/inventory/locations/relocate', {
        productId: relocateItem.productId,
        fromLocation: selectedRack.code,
        toLocation: targetLocation,
        quantity: Number(relocateQty),
      });
      showAlert('Chuyển vị trí sản phẩm thành công!');
      setRelocateItem(null);
      await fetchLocations(selectedRack.code);
    } catch (err) {
      showAlert('Lỗi chuyển vị trí: ' + (err.response?.data?.message || err.message));
    } finally {
      setRelocateLoading(false);
    }
  };

  const handleAllocateFromQueue = async (e) => {
    e.preventDefault();
    if (!addProductId) return showAlert('Vui lòng chọn sản phẩm trong hàng chờ phân kệ!');
    const chosenProd = unallocatedProducts.find(p => p.productId === addProductId);
    const qty = Number(addQty);
    if (!qty || qty <= 0) return showAlert('Số lượng thêm vào kệ phải lớn hơn 0!');
    if (chosenProd && qty > chosenProd.unallocatedQty) {
      return showAlert(`Sản phẩm này chỉ còn ${chosenProd.unallocatedQty} ${chosenProd.unit || 'sản phẩm'} trong hàng chờ phân kệ!`);
    }

    const remaining = selectedRack.maxCapacity > 0
      ? Math.max(0, selectedRack.maxCapacity - (selectedRack.currentItemsCount || 0))
      : Number.MAX_SAFE_INTEGER;
    if (selectedRack.maxCapacity > 0 && qty > remaining) {
      return showAlert(`Kệ ${selectedRack.code} chỉ còn trống ${remaining} chỗ, không thể xếp vượt sức chứa!`);
    }

    try {
      setAddLoading(true);
      const res = await apiClient.post('/inventory/locations/allocate', {
        productId: addProductId,
        toLocation: selectedRack.code,
        quantity: qty,
      });
      await Promise.all([
        fetchLocations(selectedRack.code),
        fetchUnallocatedProducts(),
      ]);
      setShowAddForm(false);
      setAddProductId('');
      setAddProductSearch('');
      setAddQty(1);
      showAlert(res.data?.message || `Đã thêm thành công ${qty} ${chosenProd?.unit || 'sản phẩm'} vào kệ ${selectedRack.code}!`);
    } catch (err) {
      showAlert('Lỗi xếp sản phẩm vào kệ: ' + (err.response?.data?.message || err.message));
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
    const rack = (loc.rack || '').toUpperCase();
    const desc = (loc.description || '').toLowerCase();
    const shelfLevel = String(loc.shelfLevel || '');

    const normCode = normalizeText(code);
    const normAisle = normalizeText(aisle);
    const normRack = normalizeText(rack);
    const normDesc = normalizeText(desc);

    // 1. Direct code/aisle/rack/desc includes
    if (normCode.includes(normQ) || normAisle.includes(normQ) || normRack.includes(normQ) || normDesc.includes(normQ)) return true;

    // 2. Prefix matching ("Tầng 1", "Tầng A1-L1", "Kệ A1", "Rack A1")
    const searchAliases = `tang ${shelfLevel} level ${shelfLevel} ke ${normRack} ${normRack} ${normCode} tang ${normCode}`;
    if (searchAliases.includes(normQ)) return true;

    // 3. Reverse check
    if (normQ.includes(normCode) || (normRack && normQ.includes(normRack))) return true;

    // 4. Letter + Digit combination matching (e.g. "A1", "B2", "C1")
    const digitMatch = normQ.match(/\d+/);
    const letterMatch = normQ.match(/[a-d]/i);
    if (letterMatch && digitMatch) {
      const searchLetter = letterMatch[0].toUpperCase();
      const searchDigits = digitMatch[0];
      const targetPrefix = `${searchLetter}${searchDigits}`;
      if (code.startsWith(targetPrefix) || normRack.includes(targetPrefix.toLowerCase())) return true;
    }

    // 5. Match items inside this location (Multi-SKU)
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

  const filteredLocations = (locations || []).filter(loc => {
    if (!loc) return false;
    const normZone = loc.zone === 'ZONE-ESD-TEMP' ? 'ZONE-SERVICE-RMA' : loc.zone;
    const matchesZone = selectedZone === 'ALL' || loc.zone === selectedZone || normZone === selectedZone;
    const matchesSearch = matchLocationSearch(loc, searchTerm);
    return matchesZone && matchesSearch;
  });

  const getHeatmapBadge = (rate) => {
    if (rate >= 90) return { label: 'ĐẦY KỆ', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' };
    if (rate >= 50) return { label: 'SẮP ĐẦY', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' };
    return { label: 'CÒN TRỐNG', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)' };
  };

  // Group locations by Rack (Kệ Hàng)
  const groupLocationsByRack = (locList) => {
    const racksMap = new Map();
    (locList || []).forEach(loc => {
      if (!loc) return;
      const rackName = loc.rack || `Kệ ${(loc.code || '').split('-')[0] || loc.aisle || 'A1'}`;
      if (!racksMap.has(rackName)) {
        racksMap.set(rackName, {
          rackName,
          aisle: loc.aisle || '',
          zone: loc.zone || 'ZONE-ACCESSORIES',
          levels: []
        });
      }
      racksMap.get(rackName).levels.push(loc);
    });

    // Sort levels in descending order: Tầng 3 (Top) -> Tầng 2 (Eye level) -> Tầng 1 (Floor level)
    racksMap.forEach(r => {
      r.levels.sort((a, b) => (b.shelfLevel || 1) - (a.shelfLevel || 1));
      r.totalItems = r.levels.reduce((sum, l) => sum + (l.currentItemsCount || 0), 0);
      r.totalCapacity = r.levels.reduce((sum, l) => sum + (l.maxCapacity || 0), 0);
      r.occupancyRate = r.totalCapacity > 0 ? Math.round((r.totalItems / r.totalCapacity) * 100) : 0;
    });

    return Array.from(racksMap.values());
  };

  // Grouped Racks for the 4 blueprint columns
  const zoneARacks = groupLocationsByRack((filteredLocations || []).filter(l => l && l.zone === 'ZONE-HIGH-VAL'));
  zoneARacks.sort((a, b) => (a.rackName || '').localeCompare(b.rackName || ''));

  const allZoneBRacks = groupLocationsByRack((filteredLocations || []).filter(l => l && l.zone === 'ZONE-LARGE-APPLIANCE'));
  const zoneBRacksLeft = allZoneBRacks.filter(r => (r.rackName || '').includes('B1') || (r.levels || []).some(l => (l.code || '').startsWith('B01') || (l.code || '').startsWith('B02') || (l.code || '').startsWith('B03') || (l.code || '').startsWith('B04')));
  const zoneBRacksRight = allZoneBRacks.filter(r => (r.rackName || '').includes('B2') || (r.levels || []).some(l => (l.code || '').startsWith('B05') || (l.code || '').startsWith('B06') || (l.code || '').startsWith('B07') || (l.code || '').startsWith('B08')));
  const finalZoneBLeft = zoneBRacksLeft.length > 0 ? zoneBRacksLeft : allZoneBRacks.slice(0, Math.ceil(allZoneBRacks.length / 2));
  const finalZoneBRight = zoneBRacksRight.length > 0 ? zoneBRacksRight : allZoneBRacks.slice(Math.ceil(allZoneBRacks.length / 2));

  // Khu Mật Độ Cao: Gồm Kệ C (4 Tầng Phụ Kiện) và Kệ D (3 Tầng Kỹ Thuật / Đổi Trả)
  const zoneCRacks = groupLocationsByRack((filteredLocations || []).filter(l => l && (l.zone === 'ZONE-ACCESSORIES' || l.zone === 'ZONE-SERVICE-RMA' || l.zone === 'ZONE-ESD-TEMP')));
  zoneCRacks.sort((a, b) => (a.rackName || '').localeCompare(b.rackName || ''));

  const matchedProductSuggestions = (allProducts || []).filter(p => {
    if (!searchTerm.trim()) return false;
    const normQ = normalizeText(searchTerm);
    const normName = normalizeText(p.name);
    const normSku = normalizeText(p.sku);
    return normName.includes(normQ) || normSku.includes(normQ);
  }).slice(0, 10).map(p => {
    const foundLocs = locations.filter(loc => loc.items?.some(it => it.productId === p.id && it.quantity > 0));
    const storedLocationsText = foundLocs.length > 0 
      ? foundLocs.map(l => `${l.rack || ('Kệ ' + l.aisle)} - Tầng ${l.shelfLevel || 1} (${l.code})`).join(', ')
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

  const renderRackBox = (rackObj, borderColor = 'rgba(139, 92, 246, 0.4)') => {
    if (!rackObj) return null;
    const overallBadge = getHeatmapBadge(rackObj.occupancyRate || 0);
    return (
      <div
        key={rackObj.rackName}
        style={{
          background: 'rgba(30, 41, 59, 0.85)',
          border: `1px solid ${borderColor}`,
          borderRadius: '10px',
          padding: '0.75rem',
          marginBottom: '0.85rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Rack Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.4rem' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={14} style={{ color: '#60a5fa' }} />
              {rackObj.rackName}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {rackObj.levels.length} tầng • {rackObj.totalItems}/{rackObj.totalCapacity} món
            </div>
          </div>
          <span style={{ background: overallBadge.bg, color: overallBadge.color, padding: '2px 7px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
            {rackObj.occupancyRate}%
          </span>
        </div>

        {/* Stacked Levels (Top to Bottom: L3 -> L2 -> L1) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {rackObj.levels.map(loc => {
            const badge = getHeatmapBadge(loc.occupancyRate);
            const isSelected = selectedRack?.code === loc.code;
            const items = loc.items || [];
            return (
              <div
                key={loc.id}
                onClick={() => setSelectedRack(loc)}
                style={{
                  padding: '0.55rem 0.65rem',
                  background: isSelected ? 'rgba(99, 102, 241, 0.25)' : '#0f172a',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${badge.color}`,
                  borderTop: isSelected ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.05)',
                  borderRight: isSelected ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.05)',
                  borderBottom: isSelected ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.05)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(51, 65, 85, 0.8)'}
                onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'rgba(99, 102, 241, 0.25)' : '#0f172a'}
                title={`Click xem chi tiết Tầng ${loc.shelfLevel || 1} (${loc.code})`}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>
                      Tầng {loc.shelfLevel || 1}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '3px' }}>
                      {loc.code}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: badge.color, fontWeight: 700 }}>
                    {loc.currentItemsCount || 0}/{loc.maxCapacity} món ({loc.occupancyRate}%)
                  </span>
                </div>

                {/* Occupancy progress bar */}
                <div style={{ height: '4px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
                  <div style={{ width: `${Math.min(100, loc.occupancyRate)}%`, height: '100%', background: badge.color }}></div>
                </div>

                {/* Multi-SKU preview badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                  {items.length > 0 ? (
                    items.slice(0, 2).map((it, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.62rem',
                          background: 'rgba(255,255,255,0.07)',
                          color: '#cbd5e1',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {it.productName || it.name}: {it.quantity}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.62rem', color: '#64748b', fontStyle: 'italic' }}>Tầng trống</span>
                  )}
                  {items.length > 2 && (
                    <span style={{ fontSize: '0.62rem', color: '#93c5fd', fontWeight: 600 }}>
                      +{items.length - 2} hàng
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* Header Title Bar */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <MapIcon size={28} color="var(--accent-primary)" />
          <div>
            <h1 className="text-title" style={{ marginBottom: 0 }}>Sơ Đồ Kiến Trúc Kho Hàng (Thế Giới Di Động & Điện Máy Xanh)</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
              Hệ thống phân cấp: 3 Phân Khu Chức Năng • 6 Kệ Hàng (Rack) • {locations.length} Vị Trí Tầng Kệ (Level) đa mặt hàng (Multi-SKU).
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
                placeholder="Tìm kệ (Kệ C, Kệ D, Kệ A1...), tầng (Tầng 1, C01, D01...) hoặc tên sản phẩm..."
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
                              <img src={getImageUrl(p.imageUrl)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ width: '28px', height: '28px', borderRadius: '5px', objectFit: 'cover', flexShrink: 0 }} />
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
              Tất cả khu vực ({locations.length} Tầng Kệ)
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
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div>
                🎯 Vị trí tối ưu: <b>{putawayResult.rack ? `${putawayResult.rack} - Tầng ${putawayResult.shelfLevel} (${putawayResult.suggestedLocation})` : `Vị trí ${putawayResult.suggestedLocation}`}</b> ({
                  putawayResult.reason
                    ?.replace(/ZONE-ACCESSORIES/g, 'Khu Mật Độ Cao')
                    ?.replace(/ZONE-HIGH-VAL/g, 'Khu Nhặt Hàng Nhanh')
                    ?.replace(/ZONE-LARGE-APPLIANCE/g, 'Khu Luân Chuyển Vừa')
                    ?.replace(/ZONE-SERVICE-RMA/g, 'Khu Mật Độ Cao')
                    ?.replace(/ZONE-ESD-TEMP/g, 'Khu Mật Độ Cao')
                })
              </div>
              {(() => {
                const targetBin = locations.find((l) => l.code === putawayResult.suggestedLocation);
                if (!targetBin) return null;
                return (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setSelectedRack(targetBin)}
                    style={{ padding: '3px 8px', fontSize: '0.75rem', borderColor: 'rgba(16,185,129,0.5)', color: '#059669', background: 'var(--bg-secondary)', whiteSpace: 'nowrap' }}
                  >
                    Xem Kệ {targetBin.code}
                  </button>
                );
              })()}
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
                <LayoutGrid size={18} /> SƠ ĐỒ MẶT BẰNG KHO: 3 PHÂN KHU CHỨC NĂNG • 6 KỆ HÀNG • {locations.length} TẦNG LƯU TRỮ ĐA HÀNG HÓA (MULTI-SKU)
              </div>

              {/* Legend Badges */}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }}></span> Trống (&lt;50%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px' }}></span> Sắp đầy (50-90%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px' }}></span> Đầy (≥90%)</span>
              </div>
            </div>

            {/* 4 MAIN SPATIAL COLUMNS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(220px, 1fr))', gap: '1rem', alignItems: 'start', width: '100%', boxSizing: 'border-box' }}>
              
              {/* COLUMN 1: KHU MẬT ĐỘ CAO (KỆ C & KỆ D) */}
              <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#c084fc', marginBottom: '0.2rem', textAlign: 'center', borderBottom: '1px solid rgba(139, 92, 246, 0.25)', paddingBottom: '0.35rem' }}>
                  KHU MẬT ĐỘ CAO (KỆ C & KỆ D)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center', marginBottom: '0.65rem' }}>
                  Kệ C (4 Tầng Phụ Kiện) & Kệ D (3 Tầng Kỹ Thuật, Đổi Trả)
                </div>
                {zoneCRacks.length > 0 ? (
                  zoneCRacks.map(r => renderRackBox(r, 'rgba(139, 92, 246, 0.35)'))
                ) : (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>Không có kệ phù hợp bộ lọc</div>
                )}
              </div>

              {/* COLUMN 2: KHU LUÂN CHUYỂN VỪA - DÃY 1 (KỆ B1) */}
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#60a5fa', marginBottom: '0.2rem', textAlign: 'center', borderBottom: '1px solid rgba(59, 130, 246, 0.25)', paddingBottom: '0.35rem' }}>
                  KHU LUÂN CHUYỂN VỪA - DÃY 1 (KỆ B1)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center', marginBottom: '0.65rem' }}>
                  Kệ B1: 4 Tầng Smart TV & Dàn Âm Thanh
                </div>
                {finalZoneBLeft.length > 0 ? (
                  finalZoneBLeft.map(r => renderRackBox(r, 'rgba(59, 130, 246, 0.35)'))
                ) : (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>Không có kệ phù hợp bộ lọc</div>
                )}
              </div>

              {/* COLUMN 3: KHU NHẶT HÀNG NHANH (KỆ A1 & KỆ A2) */}
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '2px solid rgba(16, 185, 129, 0.4)', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#34d399', marginBottom: '0.2rem', textAlign: 'center', borderBottom: '1px solid rgba(16, 185, 129, 0.25)', paddingBottom: '0.35rem' }}>
                  KHU NHẶT HÀNG NHANH (KỆ A1 & KỆ A2)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center', marginBottom: '0.65rem' }}>
                  Kệ A1 (3 Tầng Smartphone) & Kệ A2 (3 Tầng Laptop & MacBook)
                </div>
                {zoneARacks.length > 0 ? (
                  zoneARacks.map(r => renderRackBox(r, 'rgba(16, 185, 129, 0.45)'))
                ) : (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>Không có kệ phù hợp bộ lọc</div>
                )}
              </div>

              {/* COLUMN 4: KHU LUÂN CHUYỂN VỪA - DÃY 2 (KỆ B2) */}
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#60a5fa', marginBottom: '0.2rem', textAlign: 'center', borderBottom: '1px solid rgba(59, 130, 246, 0.25)', paddingBottom: '0.35rem' }}>
                  KHU LUÂN CHUYỂN VỪA - DÃY 2 (KỆ B2)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'center', marginBottom: '0.65rem' }}>
                  Kệ B2: 4 Tầng Tủ Lạnh, Máy Giặt & Điều Hòa
                </div>
                {finalZoneBRight.length > 0 ? (
                  finalZoneBRight.map(r => renderRackBox(r, 'rgba(59, 130, 246, 0.35)'))
                ) : (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>Không có kệ phù hợp bộ lọc</div>
                )}
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
                <th style={{ padding: '0.85rem' }}>MÃ VỊ TRÍ</th>
                <th style={{ padding: '0.85rem' }}>KỆ HÀNG (RACK)</th>
                <th style={{ padding: '0.85rem' }}>VỊ TRÍ TẦNG</th>
                <th style={{ padding: '0.85rem' }}>PHÂN KHU (ZONE)</th>
                <th style={{ padding: '0.85rem' }}>MẶT HÀNG LƯU TRỮ (MULTI-SKU)</th>
                <th style={{ padding: '0.85rem' }}>SỐ LƯỢNG / SỨC CHỨA</th>
                <th style={{ padding: '0.85rem' }}>TẢI TRỌNG</th>
                <th style={{ padding: '0.85rem' }}>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {filteredLocations.map(loc => {
                const zMeta = getZoneMeta(loc.zone);
                const remaining = loc.maxCapacity - (loc.currentItemsCount || 0);
                const isFull = loc.occupancyRate >= 100;
                const isHigh = loc.occupancyRate >= 80;
                const items = loc.items || [];

                return (
                  <tr key={loc.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => setSelectedRack(loc)}>
                    <td style={{ padding: '0.85rem', fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                      {loc.code}
                    </td>
                    <td style={{ padding: '0.85rem', fontWeight: 700, color: '#60a5fa', fontSize: '0.9rem' }}>
                      {loc.rack || `Kệ ${loc.aisle}`}
                    </td>
                    <td style={{ padding: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      Tầng {loc.shelfLevel || 1}
                    </td>
                    <td style={{ padding: '0.85rem' }}>
                      <span className="badge" style={{ background: zMeta.bg, color: zMeta.color, fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem' }}>
                        {zMeta.labelVi}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem', maxWidth: '300px' }}>
                      {items.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8' }}>
                            {items.length} mặt hàng cùng lưu:
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {items.map((it, idx) => (
                              <span key={idx} style={{ fontSize: '0.68rem', background: 'var(--bg-secondary)', padding: '2px 5px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                {it.productName || it.name}: <b>{it.quantity}</b>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontStyle: 'italic' }}>Chưa có sản phẩm (Tầng trống)</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem', fontWeight: 700, fontSize: '0.9rem' }}>
                      <span style={{ color: isFull ? '#ef4444' : isHigh ? '#f59e0b' : '#10b981' }}>
                        {loc.currentItemsCount || 0}
                      </span> / {loc.maxCapacity} món ({loc.occupancyRate}%)
                    </td>
                    <td style={{ padding: '0.85rem', fontSize: '0.85rem' }}>{Number(loc.maxWeightKg).toFixed(1)} kg</td>
                    <td style={{ padding: '0.85rem' }}>
                      {isFull ? (
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem' }}>
                          🔴 ĐẦY TẦNG (100%)
                        </span>
                      ) : isHigh ? (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem' }}>
                          🟡 SẮP ĐẦY (Trống {remaining})
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '20px', fontSize: '0.72rem' }}>
                          🟢 TRỐNG {remaining} Ô
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

      {/* Rack Details Modal via Portal (Strict Viewport Center) */}
      {selectedRack && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedRack(null);
              setRelocateItem(null);
              setShowAddForm(false);
              setAddProductId('');
              setAddProductSearch('');
            }
          }}
        >
          <div role="dialog" aria-modal="true" className="glass-card animate-slide-up" style={{ width: '100%', maxWidth: '650px', padding: '1.5rem', background: 'var(--bg-secondary)', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.45)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Chi Tiết Vị Trí: <code style={{ color: 'var(--accent-primary)', fontSize: '1.4rem' }}>{selectedRack.rack || `Kệ ${selectedRack.aisle}`} - Tầng {selectedRack.shelfLevel || 1}</code>
                </h2>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Mã vị trí: <b>{selectedRack.code}</b> | Phân khu: {getZoneMeta(selectedRack.zone)?.name || selectedRack.zone}
                </span>
              </div>
              <button className="btn btn-outline" onClick={() => { setSelectedRack(null); setRelocateItem(null); setShowAddForm(false); setAddProductId(''); setAddProductSearch(''); }}>✕ Đóng</button>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Các sản phẩm đang xếp trên tầng này ({selectedRack.items?.length || 0}):</h4>
              {canAllocate && (
                <button
                  type="button"
                  className={showAddForm ? 'btn btn-outline' : 'btn btn-primary'}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    const nextOpen = !showAddForm;
                    setShowAddForm(nextOpen);
                    setRelocateItem(null);
                    setAddProductId('');
                    setAddProductSearch('');
                    setAddQty(1);
                    if (nextOpen) fetchUnallocatedProducts();
                  }}
                >
                  <PlusCircle size={15} />
                  {showAddForm ? 'Đóng Form Thêm' : 'Thêm SP từ hàng chờ'}
                  {!showAddForm && unallocatedProducts.length > 0 && (
                    <span style={{
                      background: 'rgba(255,255,255,0.25)',
                      color: '#fff',
                      borderRadius: '999px',
                      padding: '1px 7px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}>
                      {unallocatedProducts.length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Inline Add Product From Unallocated Queue Form */}
            {showAddForm && canAllocate && (() => {
              const currentUsed = selectedRack.currentItemsCount || 0;
              const maxCap = selectedRack.maxCapacity || 0;
              const remaining = maxCap > 0 ? Math.max(0, maxCap - currentUsed) : 999999;
              const filteredQueue = unallocatedProducts.filter((p) => {
                const q = normalizeText(addProductSearch);
                if (!q) return true;
                return normalizeText(p.name).includes(q) || normalizeText(p.sku).includes(q);
              });
              const chosenProd = unallocatedProducts.find((p) => p.productId === addProductId);
              const maxAllowed = chosenProd ? Math.max(0, Math.min(chosenProd.unallocatedQty, remaining)) : 0;

              return (
                <form
                  onSubmit={handleAllocateFromQueue}
                  style={{
                    padding: '1rem',
                    background: 'rgba(16, 185, 129, 0.08)',
                    borderRadius: '10px',
                    border: '1px solid rgba(16, 185, 129, 0.45)',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, color: '#059669', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={16} /> Thêm Sản Phẩm Từ Hàng Chờ Vào {selectedRack.rack || `Kệ ${selectedRack.aisle}`} - Tầng {selectedRack.shelfLevel || 1} ({selectedRack.code})
                    </h4>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: remaining > 0 ? '#059669' : '#dc2626' }}>
                      {maxCap > 0 ? `Còn trống: ${remaining} chỗ` : 'Không giới hạn chỗ'}
                    </span>
                  </div>

                  {unallocatedLoading && unallocatedProducts.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.5rem 0' }}>
                      Đang tải danh sách hàng chờ phân kệ...
                    </div>
                  ) : unallocatedProducts.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0.75rem', background: 'var(--bg-primary)', borderRadius: '8px', textAlign: 'center' }}>
                      Hiện không có sản phẩm nào trong hàng chờ phân kệ.
                    </div>
                  ) : maxCap > 0 && remaining <= 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#dc2626', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px' }}>
                      Tầng kệ {selectedRack.code} đã đạt sức chứa tối đa ({maxCap} sản phẩm). Vui lòng chọn tầng khác còn trống hoặc chuyển bớt hàng ra ngoài trước.
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: '0.65rem' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: 600 }}>
                          Tìm & chọn sản phẩm trong hàng chờ phân kệ ({unallocatedProducts.length} sản phẩm):
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Lọc nhanh theo tên sản phẩm hoặc mã SKU..."
                          value={addProductSearch}
                          onChange={(e) => setAddProductSearch(e.target.value)}
                          style={{ fontSize: '0.84rem', marginBottom: '0.5rem' }}
                        />
                        <select
                          className="form-input"
                          value={addProductId}
                          onChange={(e) => {
                            const nextId = e.target.value;
                            setAddProductId(nextId);
                            const picked = unallocatedProducts.find((p) => p.productId === nextId);
                            if (picked) {
                              setAddQty(Math.max(1, Math.min(picked.unallocatedQty, remaining)));
                            }
                          }}
                          required
                          style={{ fontSize: '0.85rem' }}
                        >
                          <option value="">-- Chọn sản phẩm trong hàng chờ phân kệ ({filteredQueue.length}) --</option>
                          {filteredQueue.map((p) => (
                            <option key={p.productId} value={p.productId}>
                              {p.name} ({p.sku}) — Chờ kệ: {p.unallocatedQty} {p.unit || 'Chiếc'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {chosenProd && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'end', marginBottom: '0.75rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 600 }}>
                              Số lượng xếp lên kệ (Chờ kệ: {chosenProd.unallocatedQty} {chosenProd.unit || 'Chiếc'} | Tối đa có thể xếp: {maxAllowed}):
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={maxAllowed}
                              className="form-input"
                              value={addQty}
                              onChange={(e) => setAddQty(e.target.value === '' ? '' : Number(e.target.value))}
                              required
                            />
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem' }}
                            onClick={() => setAddQty(maxAllowed)}
                          >
                            Tối đa ({maxAllowed})
                          </button>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => {
                            setShowAddForm(false);
                            setAddProductId('');
                            setAddProductSearch('');
                          }}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={addLoading || !addProductId || Number(addQty) <= 0 || Number(addQty) > maxAllowed}
                        >
                          {addLoading ? 'Đang xếp vào kệ...' : 'Xác Nhận Thêm Vào Kệ'}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              );
            })()}

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
                      {canAllocate && (
                        <button className="btn btn-outline" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }} onClick={() => { setRelocateItem(it); setRelocateQty(it.quantity); setShowAddForm(false); }}>
                          <ArrowRightLeft size={14} /> Chuyển Tầng
                        </button>
                      )}
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
                      <option value="">-- Chọn Vị Trí / Tầng đến --</option>
                      {locations.filter(l => l.code !== selectedRack.code).map(l => (
                        <option key={l.id} value={l.code}>
                          {l.rack || `Kệ ${l.aisle}`} - Tầng {l.shelfLevel || 1} ({l.code}) [Trống {l.maxCapacity - (l.currentItemsCount || 0)} chỗ]
                        </option>
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
        </div>,
        document.body
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
                          <img
                            src={getImageUrl(p.imageUrl)}
                            alt={p.name}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex';
                            }}
                            style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }}
                          />
                        ) : null}
                        <div style={{ width: '48px', height: '48px', background: 'var(--bg-secondary)', borderRadius: '8px', display: getImageUrl(p.imageUrl) ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                          <Box size={24} color="var(--text-secondary)" />
                        </div>
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

                      {canAllocate && (
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
                      )}
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
