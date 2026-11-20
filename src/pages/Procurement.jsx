import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../api/client';
import {
  Building2,
  FileText,
  Sparkles,
  Plus,
  CheckCircle2,
  Clock,
  ArrowDownToLine,
  Search,
  Eye,
  Star,
  MapPin,
  Phone,
  Mail,
  UserCheck,
  X,
  AlertCircle,
  Truck,
  Trash2,
  CreditCard,
  ShoppingBag,
  Calendar,
  Layers,
  Tag,
  DollarSign,
  Package,
  ShieldCheck,
  Award,
} from 'lucide-react';

const BRAND_VISUALS = {
  'SUP-APPLE': { gradient: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)', badge: 'AP', category: 'Thiết bị Apple & iOS' },
  'SUP-SAMSUNG': { gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', badge: 'SS', category: 'Điện thoại Galaxy & Smart TV' },
  'SUP-SONY': { gradient: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)', badge: 'SN', category: 'PlayStation & Thiết bị Âm thanh' },
  'SUP-LG': { gradient: 'linear-gradient(135deg, #be123c 0%, #f43f5e 100%)', badge: 'LG', category: 'Màn hình OLED & Điện gia dụng' },
  'SUP-XIAOMI': { gradient: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)', badge: 'MI', category: 'Smartphone & Thiết bị Smart Home' },
  'SUP-ASUS': { gradient: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)', badge: 'AS', category: 'Laptop ROG & Linh kiện PC' },
  'SUP-DELL': { gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)', badge: 'DL', category: 'Laptop Doanh nghiệp & Màn hình' },
  'SUP-HP': { gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)', badge: 'HP', category: 'Máy tính HP & Thiết bị in ấn' },
  'SUP-LENOVO': { gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', badge: 'LN', category: 'ThinkPad & Legion Gaming' },
  'SUP-LOGITECH': { gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', badge: 'LT', category: 'Bàn phím cơ & Chuột công thái học' },
  'SUP-PANASONIC': { gradient: 'linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)', badge: 'PN', category: 'Thiết bị gia dụng & Điện lạnh' },
  'SUP-CANON': { gradient: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)', badge: 'CN', category: 'Máy ảnh Mirrorless & Máy scan' },
  'SUP-ANKER': { gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', badge: 'AK', category: 'Củ sạc GaN & Pin dự phòng' },
  'SUP-ACER': { gradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)', badge: 'AC', category: 'Laptop Predator & Màn hình gaming' },
};

const getBrandMeta = (sup) => {
  if (sup?.code && BRAND_VISUALS[sup.code]) {
    return BRAND_VISUALS[sup.code];
  }
  const initials = (sup?.name || 'NCC')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return {
    gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    badge: initials || 'NC',
    category: 'Đối tác thiết bị công nghệ',
  };
};

const PAYMENT_TERMS_COLORS = {
  'Net 15': { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  'Net 30': { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  'Net 45': { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
  'Net 60': { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
};

const PO_STATUS_COLORS = {
  DRAFT: { label: 'Bản thảo', bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  APPROVED: { label: 'Đã duyệt (Chờ giao)', bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
  ORDERED: { label: 'Đang vận chuyển', bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
  RECEIVED: { label: 'Đã nhập kho (Cửa 01)', bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  CANCELLED: { label: 'Đã hủy', bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
};

const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const Procurement = () => {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'suppliers'
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierTermFilter, setSupplierTermFilter] = useState('ALL');

  // Modals
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showCreateSupModal, setShowCreateSupModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);

  // Create PO Form
  const [poForm, setPoForm] = useState({
    supplierId: '',
    expectedDeliveryDays: 3,
    notes: '',
    items: [{ productId: '', sku: '', productName: '', requestedQuantity: 10, unitPrice: '' }],
  });

  // Create Supplier Form
  const [supForm, setSupForm] = useState({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    paymentTerms: 'Net 30',
  });

  // Lock body scroll when modal is active
  useEffect(() => {
    if (showCreatePOModal || showCreateSupModal || showDetailModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showCreatePOModal, showCreateSupModal, showDetailModal]);

  useEffect(() => {
    fetchPOs();
    fetchSuppliers();
    fetchProducts();
  }, [statusFilter]);

  const fetchPOs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;
      const res = await apiClient.get('/procurement/purchase-orders', { params });
      setPurchaseOrders(res.data || []);
    } catch (err) {
      console.error('Lỗi tải Purchase Orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await apiClient.get('/procurement/suppliers');
      setSuppliers(res.data || []);
    } catch (err) {
      console.error('Lỗi tải nhà cung cấp:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/inventory/products?limit=100');
      const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setAvailableProducts(list);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    }
  };

  const handleApprovePO = async (id) => {
    try {
      await apiClient.post(`/procurement/purchase-orders/${id}/approve`);
      alert('Đã phê duyệt đơn mua hàng thành công!');
      fetchPOs();
    } catch (err) {
      alert('Lỗi duyệt PO: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReceivePO = async (id) => {
    if (!window.confirm('Xác nhận tiếp nhận hàng về kho qua CỬA 01 - IN? Số lượng tồn kho sẽ được cập nhật tự động.')) return;
    try {
      await apiClient.post(`/procurement/purchase-orders/${id}/receive`);
      alert('Đã tiếp nhận hàng thành công qua CỬA 01 - IN! Tồn kho hệ thống đã được gia tăng.');
      fetchPOs();
      if (showDetailModal) setShowDetailModal(false);
    } catch (err) {
      alert('Lỗi nhập kho: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleProductSelect = (index, productId) => {
    const prod = availableProducts.find((p) => p.id === productId);
    if (!prod) return;
    const newItems = [...poForm.items];
    const wholesalePrice = prod.price > 0 ? Math.round(prod.price * 0.75) : '';
    newItems[index] = {
      productId: prod.id,
      sku: prod.sku,
      productName: prod.name,
      requestedQuantity: newItems[index]?.requestedQuantity || 10,
      unitPrice: wholesalePrice,
    };
    setPoForm({ ...poForm, items: newItems });
  };

  const addPOItem = () => {
    setPoForm({
      ...poForm,
      items: [
        ...poForm.items,
        { productId: '', sku: '', productName: '', requestedQuantity: 10, unitPrice: '' },
      ],
    });
  };

  const removePOItem = (index) => {
    if (poForm.items.length <= 1) return;
    const newItems = poForm.items.filter((_, i) => i !== index);
    setPoForm({ ...poForm, items: newItems });
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    try {
      const validItems = poForm.items
        .filter((i) => i.productId)
        .map((i) => ({
          ...i,
          requestedQuantity: Number(i.requestedQuantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
        }));
      if (validItems.length === 0) {
        alert('Vui lòng chọn ít nhất một sản phẩm!');
        return;
      }
      await apiClient.post('/procurement/purchase-orders', {
        ...poForm,
        items: validItems,
      });
      alert('Tạo đơn mua hàng thành công!');
      setShowCreatePOModal(false);
      setPoForm({
        supplierId: '',
        expectedDeliveryDays: 3,
        notes: '',
        items: [{ productId: '', sku: '', productName: '', requestedQuantity: 10, unitPrice: '' }],
      });
      fetchPOs();
    } catch (err) {
      alert('Lỗi tạo PO: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/procurement/suppliers', supForm);
      alert('Thêm nhà cung cấp mới thành công!');
      setShowCreateSupModal(false);
      setSupForm({
        code: '',
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        paymentTerms: 'Net 30',
      });
      fetchSuppliers();
    } catch (err) {
      alert('Lỗi thêm NCC: ' + (err.response?.data?.message || err.message));
    }
  };

  const calculatedPOTotal = poForm.items.reduce(
    (sum, it) => sum + (Number(it.requestedQuantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );

  const handleQuickCreatePO = (sup) => {
    setPoForm({
      supplierId: sup.id,
      expectedDeliveryDays: 3,
      notes: `Đơn nhập hàng chính ngạch từ đối tác ${sup.name}`,
      items: [{ productId: '', sku: '', productName: '', requestedQuantity: 10, unitPrice: '' }],
    });
    setShowCreatePOModal(true);
  };

  const filteredSuppliers = suppliers.filter((sup) => {
    const q = supplierSearch.trim().toLowerCase();
    const matchSearch =
      !q ||
      sup.name?.toLowerCase().includes(q) ||
      sup.code?.toLowerCase().includes(q) ||
      sup.contactPerson?.toLowerCase().includes(q) ||
      sup.phone?.includes(q) ||
      sup.email?.toLowerCase().includes(q) ||
      sup.address?.toLowerCase().includes(q);

    if (!matchSearch) return false;

    if (supplierTermFilter === 'VIP') return Number(sup.rating) >= 4.8;
    if (supplierTermFilter !== 'ALL') return sup.paymentTerms === supplierTermFilter;

    return true;
  });

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Building2 size={28} color="var(--accent-primary)" />
            Quản Lý Nhà Cung Cấp
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Tiếp nhận nhập kho tại <strong>CỬA 01 - IN</strong> và quản lý mạng lưới nhà cung ứng chính hãng.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreatePOModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            <span>Tạo PO Thủ Công</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'orders' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <FileText size={18} />
          Đơn Mua Hàng ({purchaseOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'suppliers' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'suppliers' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Building2 size={18} />
          Nhà Cung Cấp Chính Hãng ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'orders' && (
        <>
          <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['ALL', 'DRAFT', 'APPROVED', 'RECEIVED'].map((st) => (
                <button
                  key={st}
                  className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'ALL' ? 'Tất cả trạng thái' : PO_STATUS_COLORS[st]?.label || st}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', minWidth: '280px' }}>
              <input
                type="text"
                className="input"
                placeholder="Tìm mã PO, nhà cung cấp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="btn btn-outline" onClick={fetchPOs}>
                <Search size={16} />
              </button>
            </div>
          </div>

          <div className="card table-container" style={{ overflowX: 'auto', padding: 0 }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Số Đơn PO</th>
                  <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Nhà Cung Cấp</th>
                  <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Nguồn Tạo</th>
                  <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Trạng Thái</th>
                  <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Tổng Tiền Nhập</th>
                  <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Cổng Tiếp Nhận</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>
                      Đang tải danh sách đơn PO...
                    </td>
                  </tr>
                ) : purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                      Chưa có đơn mua hàng nào. Bấm <strong>Tạo PO Thủ Công</strong> để tạo đơn mua hàng mới!
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => {
                    const st = PO_STATUS_COLORS[po.status] || PO_STATUS_COLORS.DRAFT;
                    return (
                      <tr key={po.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, borderRight: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--accent-primary)' }}>{po.poNumber}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, borderRight: '1px solid var(--border-color)' }}>{po.supplierName}</td>
                        <td style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>
                          {po.triggerSource === 'AI_AUTO_SUGGESTION' ? (
                            <span style={{ background: '#f5f3ff', color: '#6d28d9', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Sparkles size={12} /> AI ROP/EOQ
                            </span>
                          ) : (
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
                              Thủ công
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 6,
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              background: st.bg,
                              color: st.text,
                              border: `1px solid ${st.border}`,
                            }}
                          >
                            {po.status === 'APPROVED' && <CheckCircle2 size={13} />}
                            {po.status === 'RECEIVED' && <ArrowDownToLine size={13} />}
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--accent-primary)', borderRight: '1px solid var(--border-color)' }}>
                          {formatVND(po.totalAmount)}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', borderRight: '1px solid var(--border-color)' }}>
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 4, fontWeight: 600, fontSize: '0.75rem' }}>
                            {po.receivingDock || 'CỬA 01 - IN'}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => {
                                setSelectedPO(po);
                                setShowDetailModal(true);
                              }}
                              style={{ padding: '4px 8px' }}
                            >
                              <Eye size={14} />
                              <span style={{ marginLeft: 4, fontSize: '0.75rem' }}>Chi tiết</span>
                            </button>

                            {po.status === 'DRAFT' && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleApprovePO(po.id)}
                                style={{ padding: '4px 8px' }}
                              >
                                <CheckCircle2 size={14} />
                                <span style={{ marginLeft: 4, fontSize: '0.75rem' }}>Duyệt</span>
                              </button>
                            )}

                            {po.status === 'APPROVED' && (
                              <button
                                className="btn btn-sm"
                                onClick={() => handleReceivePO(po.id)}
                                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px' }}
                              >
                                <ArrowDownToLine size={14} />
                                <span style={{ marginLeft: 4, fontSize: '0.75rem' }}>Nhập Cửa 01</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* TAB 2: SUPPLIERS */}
      {activeTab === 'suppliers' && (
        <>
          {/* KPI Summary Header for Suppliers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tổng Nhà Cung Cấp</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{suppliers.length} đối tác</div>
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Đối Tác VIP (Rating ≥ 4.8)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#b45309' }}>
                  {suppliers.filter((s) => Number(s.rating) >= 4.8).length} hãng
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ecfdf5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kỳ Hạn Chuẩn</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#047857' }}>Net 30</div>
              </div>
            </div>

            <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ffedd5', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cổng Nhập Chính</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c2410c' }}>CỬA 01 - IN</div>
              </div>
            </div>
          </div>

          {/* Search, Filter & Add Supplier Action */}
          <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: `Tất cả (${suppliers.length})` },
                { key: 'VIP', label: '⭐ VIP (4.8+)' },
                { key: 'Net 15', label: 'Net 15' },
                { key: 'Net 30', label: 'Net 30' },
                { key: 'Net 45', label: 'Net 45' },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`btn btn-sm ${supplierTermFilter === f.key ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSupplierTermFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.5rem', minWidth: '280px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Tìm tên, mã, người liên hệ, SĐT..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={() => setShowCreateSupModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={16} />
                <span>Thêm Nhà Cung Cấp Mới</span>
              </button>
            </div>
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              Không tìm thấy nhà cung cấp nào phù hợp với điều kiện tìm kiếm.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {filteredSuppliers.map((sup) => {
                const meta = getBrandMeta(sup);
                const termStyle = PAYMENT_TERMS_COLORS[sup.paymentTerms] || PAYMENT_TERMS_COLORS['Net 30'];

                return (
                  <div
                    key={sup.id}
                    className="card"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: '14px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-glass)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div>
                      {/* Top Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {/* Brand Initials Avatar */}
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '12px',
                              background: meta.gradient,
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '1.1rem',
                              letterSpacing: '1px',
                              flexShrink: 0,
                              boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                            }}
                          >
                            {meta.badge}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                {sup.code}
                              </span>
                              <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <ShieldCheck size={12} /> Chính ngạch
                              </span>
                            </div>

                            <h3 style={{ margin: '0.35rem 0 0 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                              {sup.name}
                            </h3>
                          </div>
                        </div>

                        {/* Rating Pill */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#fef3c7',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '3px 8px',
                            borderRadius: '999px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            flexShrink: 0,
                          }}
                        >
                          <Star size={14} fill="#f59e0b" color="#f59e0b" />
                          <span>{Number(sup.rating || 5.0).toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Category Tag */}
                      <div style={{ marginBottom: '0.85rem' }}>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.08)', color: 'var(--accent-primary)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, display: 'inline-block' }}>
                          📦 {meta.category}
                        </span>
                      </div>

                      {/* Contact Info Box */}
                      <div
                        style={{
                          background: 'var(--bg-secondary)',
                          borderRadius: '10px',
                          padding: '0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <UserCheck size={14} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                          <span>Đại diện B2B: <strong style={{ color: 'var(--text-primary)' }}>{sup.contactPerson || 'Bộ phận B2B'}</strong></span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Phone size={14} color="#16a34a" style={{ flexShrink: 0 }} />
                          <span>Hotline: <strong style={{ color: 'var(--text-primary)' }}>{sup.phone || '0901234567'}</strong></span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Mail size={14} color="#0284c7" style={{ flexShrink: 0 }} />
                          <span style={{ wordBreak: 'break-all' }}>Email: {sup.email || 'b2b@brand.com'}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <MapPin size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ lineHeight: 1.35 }}>{sup.address || 'TP. Hồ Chí Minh'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div
                      style={{
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.5rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Kỳ hạn:</span>
                        <span
                          style={{
                            fontWeight: 700,
                            background: termStyle.bg,
                            color: termStyle.text,
                            border: `1px solid ${termStyle.border}`,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                          }}
                        >
                          {sup.paymentTerms || 'Net 30'}
                        </span>
                      </div>

                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleQuickCreatePO(sup)}
                        style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ShoppingBag size={13} />
                        <span>Tạo PO Nhanh</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: THÊM NHÀ CUNG CẤP MỚI (PORTAL TO BODY - STRICT CENTER) */}
      {/* ========================================================================= */}
      {showCreateSupModal && ReactDOM.createPortal(
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateSupModal(false);
          }}
        >
          <div
            className="modal-content animate-scale-in"
            style={{
              maxWidth: '560px',
              width: '95%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-secondary, #ffffff)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}
          >
            {/* Header (Fixed) */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Thêm Nhà Cung Cấp Mới
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Khởi tạo hồ sơ đối tác cung ứng thiết bị điện máy chính hãng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateSupModal(false)}
                style={{ background: 'var(--bg-primary, #f1f5f9)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateSupplier} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: 3 }}>
                      <Tag size={13} color="var(--accent-primary)" />
                      Mã NCC <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="SUP-ASUS"
                      value={supForm.code}
                      onChange={(e) => setSupForm({ ...supForm, code: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: 3 }}>
                      <Building2 size={13} color="var(--accent-primary)" />
                      Tên Nhà Cung Cấp <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="Công ty TNHH ASUS Việt Nam"
                      value={supForm.name}
                      onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: 3 }}>
                      <UserCheck size={13} color="var(--accent-primary)" />
                      Người đại diện
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Nguyễn Văn A"
                      value={supForm.contactPerson}
                      onChange={(e) => setSupForm({ ...supForm, contactPerson: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: 3 }}>
                      <Phone size={13} color="var(--accent-primary)" />
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="0912 345 678"
                      value={supForm.phone}
                      onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: 3 }}>
                      <Mail size={13} color="var(--accent-primary)" />
                      Email báo giá
                    </label>
                    <input
                      type="email"
                      className="input"
                      placeholder="contact@asus.vn"
                      value={supForm.email}
                      onChange={(e) => setSupForm({ ...supForm, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: 3 }}>
                      <CreditCard size={13} color="var(--accent-primary)" />
                      Điều khoản nợ
                    </label>
                    <select
                      className="input"
                      value={supForm.paymentTerms}
                      onChange={(e) => setSupForm({ ...supForm, paymentTerms: e.target.value })}
                    >
                      <option value="Net 30">Net 30 (30 ngày)</option>
                      <option value="Net 15">Net 15 (15 ngày)</option>
                      <option value="Net 45">Net 45 (45 ngày)</option>
                      <option value="Net 60">Net 60 (60 ngày)</option>
                      <option value="COD">Thanh toán ngay (COD)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: 3 }}>
                    <MapPin size={13} color="var(--accent-primary)" />
                    Địa chỉ văn phòng / Kho
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Tòa nhà Viettel Tower, 285 Cách Mạng Tháng 8, Q.10, TP. HCM"
                    value={supForm.address}
                    onChange={(e) => setSupForm({ ...supForm, address: e.target.value })}
                  />
                </div>
              </div>

              {/* Footer (Always Visible at bottom) */}
              <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary, #f8fafc)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateSupModal(false)}
                  style={{ padding: '0.5rem 1.1rem' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.35rem' }}
                >
                  <CheckCircle2 size={16} />
                  <span>Lưu Nhà Cung Cấp</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TẠO ĐƠN ĐẶT HÀNG PO THỦ CÔNG (PORTAL TO BODY - STRICT CENTER) */}
      {/* ========================================================================= */}
      {showCreatePOModal && ReactDOM.createPortal(
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreatePOModal(false);
          }}
        >
          <div
            className="modal-content animate-scale-in"
            style={{
              maxWidth: '820px',
              width: '95%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-secondary, #ffffff)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}
          >
            {/* Header (Fixed) */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Tạo Đơn Đặt Hàng Mới
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Lập phiếu nhập hàng chính hãng chuyển về kho qua <strong>CỬA 01 - IN (CẢNG TIẾP NHẬN A)</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreatePOModal(false)}
                style={{ background: 'var(--bg-primary, #f1f5f9)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleCreatePO} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
                {/* Config section */}
                <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: '1rem', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: 3 }}>
                      <Building2 size={13} color="var(--accent-primary)" />
                      Nhà Cung Cấp Chính Hãng <span className="req">*</span>
                    </label>
                    <select
                      required
                      className="input"
                      value={poForm.supplierId}
                      onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                    >
                      <option value="">-- Chọn nhà phân phối thiết bị --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code}) - {s.paymentTerms}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: 3 }}>
                      <Calendar size={13} color="var(--accent-primary)" />
                      Thời gian giao hàng dự kiến
                    </label>
                    <select
                      className="input"
                      value={poForm.expectedDeliveryDays}
                      onChange={(e) => setPoForm({ ...poForm, expectedDeliveryDays: Number(e.target.value) })}
                    >
                      <option value="1">1 ngày (Giao gấp / Hỏa tốc)</option>
                      <option value="3">3 ngày (Tiêu chuẩn đường bộ)</option>
                      <option value="5">5 ngày (Vận chuyển liên tỉnh)</option>
                      <option value="7">7 ngày (Hàng dự án / số lượng lớn)</option>
                    </select>
                  </div>
                </div>

                {/* Items header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Package size={16} color="var(--accent-primary)" />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Danh Mục Thiết Bị Cần Nhập Sỉ</span>
                    <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
                      {poForm.items.length} mặt hàng
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={addPOItem}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: '0.78rem' }}
                  >
                    <Plus size={13} /> Thêm sản phẩm
                  </button>
                </div>

                {/* Items Table Container */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.4fr 1.4fr 36px', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--bg-primary, #f1f5f9)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    <div>Sản Phẩm Thiết Bị</div>
                    <div style={{ textAlign: 'center' }}>Số Lượng</div>
                    <div>Đơn Giá Sỉ (VNĐ)</div>
                    <div style={{ textAlign: 'right' }}>Thành Tiền</div>
                    <div></div>
                  </div>

                  <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '0.4rem' }}>
                    {poForm.items.map((item, idx) => {
                      const rowSubtotal = (Number(item.requestedQuantity) || 0) * (Number(item.unitPrice) || 0);
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '3fr 1fr 1.4fr 1.4fr 36px',
                            gap: '0.5rem',
                            alignItems: 'center',
                            padding: '0.45rem 0.5rem',
                            borderRadius: 6,
                            marginBottom: 4,
                            background: 'var(--bg-secondary, #ffffff)',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <select
                            className="input"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                            value={item.productId}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            required
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {availableProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.sku} - {p.name}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min="1"
                            placeholder="1"
                            className="input"
                            style={{ padding: '0.4rem 0.3rem', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem' }}
                            value={item.requestedQuantity ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newItems = [...poForm.items];
                              newItems[idx].requestedQuantity = val === '' ? '' : Math.max(1, Number(val));
                              setPoForm({ ...poForm, items: newItems });
                            }}
                            onBlur={() => {
                              if (!item.requestedQuantity) {
                                const newItems = [...poForm.items];
                                newItems[idx].requestedQuantity = 1;
                                setPoForm({ ...poForm, items: newItems });
                              }
                            }}
                          />

                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            className="input"
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                            value={item.unitPrice ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const newItems = [...poForm.items];
                              newItems[idx].unitPrice = val === '' ? '' : Math.max(0, Number(val));
                              setPoForm({ ...poForm, items: newItems });
                            }}
                            onBlur={() => {
                              if (item.unitPrice === '') {
                                const newItems = [...poForm.items];
                                newItems[idx].unitPrice = 0;
                                setPoForm({ ...poForm, items: newItems });
                              }
                            }}
                          />

                          <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                            {formatVND(rowSubtotal)}
                          </div>

                          <div style={{ textAlign: 'center' }}>
                            {poForm.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePOItem(idx)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                                title="Xóa dòng"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer (Always Visible at bottom) */}
              <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary, #f8fafc)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={12} color="#16a34a" /> Cổng tiếp nhận: <strong>CỬA 01 - IN</strong>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    Tổng tiền: {formatVND(calculatedPOTotal)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowCreatePOModal(false)}
                    style={{ padding: '0.5rem 1.1rem' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.35rem' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Xác Nhận Tạo Đơn PO</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CHI TIẾT ĐƠN PO (PORTAL TO BODY - STRICT CENTER) */}
      {/* ========================================================================= */}
      {showDetailModal && selectedPO && ReactDOM.createPortal(
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDetailModal(false);
          }}
        >
          <div
            className="modal-content animate-scale-in"
            style={{
              maxWidth: '640px',
              width: '95%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-secondary, #ffffff)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>
                  PO: {selectedPO.poNumber}
                </span>
                <h3 style={{ margin: '0.3rem 0 0 0', fontSize: '1.15rem' }}>{selectedPO.supplierName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                style={{ background: 'var(--bg-primary, #f1f5f9)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', padding: '0.85rem', background: 'var(--bg-primary, #f8fafc)', borderRadius: 10, border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <div>Cổng giao nhận: <strong>{selectedPO.receivingDock || 'CỬA 01 - IN'}</strong></div>
                <div>Trạng thái: <strong>{selectedPO.status}</strong></div>
                <div>Ngày dự kiến: <strong>{new Date(selectedPO.expectedDeliveryDate).toLocaleDateString('vi-VN')}</strong></div>
                <div>Nguồn tạo: <strong>{selectedPO.triggerSource === 'AI_AUTO_SUGGESTION' ? 'AI ROP/EOQ Tự động' : 'Thủ công'}</strong></div>
              </div>

              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Danh mục thiết bị:</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto' }}>
                {(selectedPO.items || []).map((it) => (
                  <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'var(--bg-secondary, #ffffff)', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{it.productName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Mã SKU: {it.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{it.requestedQuantity} chiếc</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--accent-primary)' }}>{formatVND(it.unitPrice)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary, #f8fafc)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tổng thanh toán PO:</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                  {formatVND(selectedPO.totalAmount)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" onClick={() => setShowDetailModal(false)} style={{ padding: '0.5rem 1rem' }}>
                  Đóng
                </button>
                {selectedPO.status === 'APPROVED' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleReceivePO(selectedPO.id)}
                    style={{ background: '#16a34a', border: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.25rem' }}
                  >
                    <ArrowDownToLine size={16} /> Nhập Kho Cửa 01 - IN
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Procurement;
