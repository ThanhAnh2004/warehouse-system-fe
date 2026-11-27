import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../api/client';
import { useDialog } from '../context/DialogContext';
import { AuthContext } from '../context/AuthContext';
import CreatePurchaseOrderModal from '../components/CreatePurchaseOrderModal';
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
  Edit3,
  Link2,
  Save,
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
  'SUP-PANASONIC': { gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)', badge: 'PN', category: 'Điện máy gia dụng & Tủ lạnh' },
  'SUP-ACER': { gradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 100%)', badge: 'AC', category: 'Laptop Predator & Màn hình gaming' },
  'SUP-DIST-PC': { gradient: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)', badge: 'PC', category: 'Phụ Kiện Máy Tính & Gaming Gear' },
  'SUP-DIST-APPLIANCE': { gradient: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)', badge: 'GD', category: 'Điện Lạnh & Gia Dụng Cao Cấp' },
  'SUP-DIST-DIGITAL': { gradient: 'linear-gradient(135deg, #b91c1c 0%, #f97316 100%)', badge: 'DG', category: 'Thiết Bị Số, Camera & Âm Thanh' },
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
  const { showAlert, showConfirm } = useDialog();
  const { user, isSystemAdmin, hasPermission } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'suppliers'
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  // Modals
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showCreateSupModal, setShowCreateSupModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSupplier, setCatalogSupplier] = useState(null);
  const [catalogForm, setCatalogForm] = useState({
    productId: '',
    supplyPrice: '',
    minOrderQty: 5,
    leadTimeDays: 3,
  });
  const [editingPriceId, setEditingPriceId] = useState(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const [catalogSaving, setCatalogSaving] = useState(false);

  // Create PO Modal options
  const [poModalOpts, setPoModalOpts] = useState({
    supplierId: '',
    notes: '',
  });

  // Create / Edit Supplier Form
  const [editingSupplierId, setEditingSupplierId] = useState(null);
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
    if (showCreatePOModal || showCreateSupModal || showDetailModal || showCatalogModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showCreatePOModal, showCreateSupModal, showDetailModal, showCatalogModal]);

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
      const res = await apiClient.get('/inventory/products?limit=200');
      const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setAvailableProducts(list);
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    }
  };

  const handleApprovePO = async (id) => {
    try {
      await apiClient.post(`/procurement/purchase-orders/${id}/approve`);
      showAlert('Đã phê duyệt đơn mua hàng thành công!', 'success', 'Phê Duyệt Đơn Hàng');
      fetchPOs();
    } catch (err) {
      showAlert('Lỗi duyệt PO: ' + (err.response?.data?.message || err.message), 'error', 'Lỗi Phê Duyệt');
    }
  };

  const handleReceivePO = async (id) => {
    if (!(await showConfirm('Xác nhận tiếp nhận hàng về kho qua CỬA 01 - IN? Số lượng tồn kho sẽ được cập nhật tự động.'))) return;
    try {
      await apiClient.post(`/procurement/purchase-orders/${id}/receive`);
      showAlert('Đã tiếp nhận hàng thành công qua CỬA 01 - IN! Tồn kho hệ thống đã được gia tăng.', 'success', 'Nhập Kho Thành Công');
      fetchPOs();
      if (showDetailModal) setShowDetailModal(false);
    } catch (err) {
      showAlert('Lỗi nhập kho: ' + (err.response?.data?.message || err.message), 'error', 'Lỗi Nhập Kho');
    }
  };

  const openCreatePOModal = () => {
    setPoModalOpts({ supplierId: '', notes: '' });
    setShowCreatePOModal(true);
  };

  const openCreateSupplierModal = () => {
    setEditingSupplierId(null);
    setSupForm({
      code: '',
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      paymentTerms: 'Net 30',
    });
    setShowCreateSupModal(true);
  };

  const openEditSupplierModal = (sup) => {
    setEditingSupplierId(sup.id);
    setSupForm({
      code: sup.code || '',
      name: sup.name || '',
      contactPerson: sup.contactPerson || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      paymentTerms: sup.paymentTerms || 'Net 30',
    });
    setShowCreateSupModal(true);
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplierId) {
        await apiClient.patch(`/procurement/suppliers/${editingSupplierId}`, supForm);
        showAlert('Cập nhật thông tin nhà cung cấp thành công!', 'success', 'Cập Nhật Nhà Cung Cấp');
      } else {
        await apiClient.post('/procurement/suppliers', supForm);
        showAlert('Thêm nhà cung cấp mới thành công!', 'success', 'Thêm Nhà Cung Cấp');
      }
      setShowCreateSupModal(false);
      setEditingSupplierId(null);
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
      showAlert('Lỗi lưu NCC: ' + (err.response?.data?.message || err.message), 'error', 'Lỗi Nhà Cung Cấp');
    }
  };

  const handleDeleteSupplier = async (sup) => {
    const confirmed = await showConfirm(
      `Xác nhận xóa nhà cung cấp "${sup.name}" (${sup.code})? Chỉ có thể xóa nhà cung cấp chưa phát sinh đơn mua hàng (PO).`,
      'Xác Nhận Xóa Nhà Cung Cấp',
    );
    if (!confirmed) return;
    try {
      await apiClient.delete(`/procurement/suppliers/${sup.id}`);
      showAlert(`Đã xóa nhà cung cấp "${sup.name}" thành công.`, 'success', 'Đã Xóa Nhà Cung Cấp');
      fetchSuppliers();
    } catch (err) {
      showAlert('Không thể xóa NCC: ' + (err.response?.data?.message || err.message), 'error', 'Lỗi Xóa NCC');
    }
  };

  const handleQuickCreatePO = (sup) => {
    setPoModalOpts({
      supplierId: sup.id,
      notes: `Đơn nhập hàng chính ngạch từ đối tác ${sup.name}`,
    });
    setShowCreatePOModal(true);
  };

  const refreshSuppliersAndSelected = async (targetSupplierId) => {
    try {
      const res = await apiClient.get('/procurement/suppliers');
      const list = res.data || [];
      setSuppliers(list);
      if (targetSupplierId) {
        const updated = list.find((s) => s.id === targetSupplierId) || null;
        setCatalogSupplier(updated);
      }
    } catch (err) {
      console.error('Lỗi làm mới danh mục NCC:', err);
    }
  };

  const openCatalogModal = (sup) => {
    setCatalogSupplier(sup);
    setCatalogForm({ productId: '', supplyPrice: '', minOrderQty: 5, leadTimeDays: 3 });
    setEditingPriceId(null);
    setEditingPriceValue('');
    setShowCatalogModal(true);
  };

  const handleCatalogSelectNewProduct = (productId) => {
    const prod = availableProducts.find((p) => p.id === productId);
    setCatalogForm((prev) => ({
      ...prev,
      productId,
      supplyPrice: prod ? String(Math.round(Number(prod.price || 0) * 0.75)) : '',
    }));
  };

  const handleAddCatalogProduct = async (e) => {
    e.preventDefault();
    if (!catalogSupplier || !catalogForm.productId) {
      showAlert('Vui lòng chọn sản phẩm cần gán cho nhà cung cấp!', 'error', 'Thiếu Thông Tin');
      return;
    }
    const prod = availableProducts.find((p) => p.id === catalogForm.productId);
    try {
      setCatalogSaving(true);
      await apiClient.post(`/procurement/suppliers/${catalogSupplier.id}/products`, {
        productId: catalogForm.productId,
        productSku: prod?.sku,
        productName: prod?.name,
        supplyPrice: catalogForm.supplyPrice
          ? Number(catalogForm.supplyPrice)
          : Math.round(Number(prod?.price || 0) * 0.75),
        minOrderQty: Number(catalogForm.minOrderQty) || 5,
        leadTimeDays: Number(catalogForm.leadTimeDays) || 3,
      });
      setCatalogForm({ productId: '', supplyPrice: '', minOrderQty: 5, leadTimeDays: 3 });
      await refreshSuppliersAndSelected(catalogSupplier.id);
      showAlert('Đã cập nhật sản phẩm vào danh mục nhà cung cấp!', 'success', 'Cập Nhật Danh Mục');
    } catch (err) {
      showAlert('Lỗi gán sản phẩm: ' + (err.response?.data?.message || err.message), 'error', 'Lỗi');
    } finally {
      setCatalogSaving(false);
    }
  };

  const handleSaveCatalogPrice = async (sp) => {
    if (!catalogSupplier) return;
    const priceNum = Number(editingPriceValue);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      showAlert('Đơn giá nhập sỉ không hợp lệ!', 'error', 'Lỗi Dữ Liệu');
      return;
    }
    try {
      setCatalogSaving(true);
      await apiClient.patch(`/procurement/suppliers/${catalogSupplier.id}/products/${sp.productId}`, {
        productSku: sp.productSku,
        productName: sp.productName,
        supplyPrice: priceNum,
      });
      setEditingPriceId(null);
      setEditingPriceValue('');
      await refreshSuppliersAndSelected(catalogSupplier.id);
    } catch (err) {
      showAlert('Lỗi cập nhật đơn giá: ' + (err.response?.data?.message || err.message), 'error', 'Lỗi');
    } finally {
      setCatalogSaving(false);
    }
  };

  const handleRemoveCatalogProduct = async (sp) => {
    if (!catalogSupplier) return;
    const confirmed = await showConfirm(
      `Gỡ sản phẩm "${sp.productName}" (${sp.productSku}) khỏi danh mục của ${catalogSupplier.name}?`,
      'Xác Nhận Gỡ Sản Phẩm',
    );
    if (!confirmed) return;
    try {
      setCatalogSaving(true);
      await apiClient.delete(`/procurement/suppliers/${catalogSupplier.id}/products/${sp.productId}`);
      await refreshSuppliersAndSelected(catalogSupplier.id);
      showAlert('Đã gỡ sản phẩm khỏi danh mục nhà cung cấp.', 'success', 'Đã Gỡ Sản Phẩm');
    } catch (err) {
      showAlert('Lỗi gỡ sản phẩm: ' + (err.response?.data?.message || err.message), 'error', 'Lỗi');
    } finally {
      setCatalogSaving(false);
    }
  };

  const filteredSuppliers = suppliers.filter((sup) => {
    const q = supplierSearch.trim().toLowerCase();
    return (
      !q ||
      sup.name?.toLowerCase().includes(q) ||
      sup.code?.toLowerCase().includes(q) ||
      sup.contactPerson?.toLowerCase().includes(q) ||
      sup.phone?.includes(q) ||
      sup.email?.toLowerCase().includes(q) ||
      sup.address?.toLowerCase().includes(q)
    );
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
          {(isSystemAdmin || hasPermission('procurement:create')) && (
            <button
              className="btn btn-primary"
              onClick={openCreatePOModal}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} />
              <span>Tạo đơn đặt hàng mới</span>
            </button>
          )}
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
              {['ALL', 'APPROVED', 'ORDERED', 'RECEIVED'].map((st) => (
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
                  <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Trạng Thái</th>
                  <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Tổng Tiền Nhập</th>
                  <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Cổng Tiếp Nhận</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem' }}>
                      Đang tải danh sách đơn PO...
                    </td>
                  </tr>
                ) : purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                      Chưa có đơn mua hàng nào. Bấm <strong>Tạo đơn đặt hàng mới</strong> để tạo đơn mua hàng mới!
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
                          <span
                            className={`status-pill status-pill-${po.status?.toLowerCase().replace(/_/g, '-')}`}
                            style={{
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
                          <span style={{ background: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid var(--warning)', padding: '3px 8px', borderRadius: 4, fontWeight: 600, fontSize: '0.75rem' }}>
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

                            {po.status === 'DRAFT' && (isSystemAdmin || hasPermission('procurement:approve')) && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleApprovePO(po.id)}
                                style={{ padding: '4px 8px' }}
                              >
                                <CheckCircle2 size={14} />
                                <span style={{ marginLeft: 4, fontSize: '0.75rem' }}>Duyệt</span>
                              </button>
                            )}

                            {po.status === 'APPROVED' && (isSystemAdmin || hasPermission('procurement:receive')) && (
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
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ffedd5', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cổng Nhập Chính</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c2410c' }}>CỬA 01 - IN</div>
              </div>
            </div>
          </div>

          {/* Search & Add Supplier Action */}
          <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px', maxWidth: '460px' }}>
              <input
                type="text"
                className="input"
                placeholder="Tìm tên, mã, người liên hệ, SĐT..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Hiển thị {filteredSuppliers.length} / {suppliers.length} nhà cung cấp
              </span>

              {(isSystemAdmin || hasPermission('procurement:create')) && (
                <button
                  className="btn btn-primary"
                  onClick={openCreateSupplierModal}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Plus size={16} />
                  <span>Thêm Nhà Cung Cấp Mới</span>
                </button>
              )}
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
                      </div>

                      {/* Category Tag */}
                      <div style={{ marginBottom: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.08)', color: 'var(--accent-primary)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600, display: 'inline-block' }}>
                          📦 {meta.category}
                        </span>
                        <span
                          onClick={() => openCatalogModal(sup)}
                          title="Xem & quản lý danh mục sản phẩm cung ứng"
                          style={{
                            fontSize: '0.75rem',
                            background: (sup.products?.length || 0) > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.12)',
                            color: (sup.products?.length || 0) > 0 ? '#059669' : '#d97706',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <Package size={12} />
                          {sup.products?.length || 0} SP cung ứng
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
                        gap: '0.4rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => openCatalogModal(sup)}
                          title="Xem & quản lý sản phẩm của nhà cung cấp này"
                          style={{ padding: '5px 9px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={13} />
                          <span>Xem Sản Phẩm ({sup.products?.length || 0})</span>
                        </button>
                        {(isSystemAdmin || hasPermission('procurement:create')) && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => openEditSupplierModal(sup)}
                              title="Chỉnh sửa nhà cung cấp"
                              style={{ padding: '5px 7px' }}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => handleDeleteSupplier(sup)}
                              title="Xóa nhà cung cấp"
                              style={{ padding: '5px 7px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.35)' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                      {(isSystemAdmin || hasPermission('procurement:create')) && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleQuickCreatePO(sup)}
                          style={{ padding: '5px 9px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <ShoppingBag size={13} />
                          <span>Tạo đơn đặt hàng mới</span>
                        </button>
                      )}
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
                    {editingSupplierId ? 'Cập Nhật Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {editingSupplierId
                      ? 'Chỉnh sửa thông tin liên hệ đối tác cung ứng'
                      : 'Khởi tạo hồ sơ đối tác cung ứng thiết bị điện máy chính hãng'}
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
                      disabled={!!editingSupplierId}
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
      {/* MODAL 2: TẠO ĐƠN ĐẶT HÀNG PO THỦ CÔNG (SHARED COMPONENT) */}
      {/* ========================================================================= */}
      <CreatePurchaseOrderModal
        isOpen={showCreatePOModal}
        onClose={() => setShowCreatePOModal(false)}
        title="Tạo Đơn Đặt Hàng Mới"
        submitLabel="Tạo đơn đặt hàng mới"
        suppliers={suppliers}
        availableProducts={availableProducts}
        initialSupplierId={poModalOpts.supplierId}
        initialNotes={poModalOpts.notes}
        onSuccess={() => fetchPOs()}
        onOpenSupplierCatalog={(sup) => openCatalogModal(sup)}
      />

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
                      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                        {it.requestedQuantity} {availableProducts.find((p) => p.id === it.productId)?.unit || 'chiếc'}
                      </div>
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
                {selectedPO.status === 'APPROVED' && (isSystemAdmin || hasPermission('procurement:receive')) && (
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

      {/* ========================================================================= */}
      {/* MODAL 4: QUẢN LÝ DANH MỤC SẢN PHẨM CUNG ỨNG THEO NCC                     */}
      {/* ========================================================================= */}
      {showCatalogModal && catalogSupplier && ReactDOM.createPortal(
        (() => {
          const canEditCatalog = isSystemAdmin || hasPermission('procurement:create');
          const assignedIds = new Set((catalogSupplier.products || []).map((sp) => sp.productId));
          const unassignedProducts = [...availableProducts]
            .filter((p) => !assignedIds.has(p.id))
            .sort((a, b) => (a.sku || '').localeCompare(b.sku || ''));
          const catalogVisual = BRAND_VISUALS[catalogSupplier.code] || {
            gradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
            badge: (catalogSupplier.code || 'SP').slice(-2),
            category: 'Thiết bị điện tử & Gia dụng',
          };

          return (
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
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(4px)',
                padding: '1rem',
              }}
              onClick={() => setShowCatalogModal(false)}
            >
              <div
                className="modal-content"
                style={{
                  maxWidth: '880px',
                  width: '100%',
                  maxHeight: '88vh',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 0,
                  overflow: 'hidden',
                  borderRadius: '16px',
                  background: 'var(--bg-secondary, #ffffff)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.15rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary, #f8fafc)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: catalogVisual.gradient, color: 'white', width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      {catalogVisual.badge}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Danh Mục Sản Phẩm — {catalogSupplier.name}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Mã NCC: <strong>{catalogSupplier.code}</strong> · Đang cung ứng{' '}
                        <strong style={{ color: 'var(--accent-primary)' }}>{catalogSupplier.products?.length || 0}</strong> mặt hàng
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setShowCatalogModal(false)}
                    style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {canEditCatalog && (
                    <form
                      onSubmit={handleAddCatalogProduct}
                      style={{
                        background: 'var(--bg-primary, #f8fafc)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '0.9rem 1rem',
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Link2 size={14} color="var(--accent-primary)" />
                        <span>Gán Thêm Sản Phẩm Kho Vào Nhà Cung Cấp Này</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1.2fr 0.7fr auto', gap: '0.6rem', alignItems: 'end' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Chọn Sản Phẩm Chưa Thuộc NCC ({unassignedProducts.length})
                          </label>
                          <select
                            className="input"
                            style={{ padding: '0.45rem 0.6rem', fontSize: '0.82rem' }}
                            value={catalogForm.productId}
                            onChange={(e) => handleCatalogSelectNewProduct(e.target.value)}
                          >
                            <option value="">-- Chọn sản phẩm cần gán --</option>
                            {unassignedProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.sku} - {p.name} ({formatVND(p.price)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            Đơn Giá Nhập Sỉ (VNĐ)
                          </label>
                          <input
                            type="number"
                            min="0"
                            className="input"
                            style={{ padding: '0.45rem 0.6rem', fontSize: '0.82rem' }}
                            placeholder="VD: 15000000"
                            value={catalogForm.supplyPrice}
                            onChange={(e) => setCatalogForm({ ...catalogForm, supplyPrice: e.target.value })}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.73rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            SL Tối Thiểu
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="input"
                            style={{ padding: '0.45rem 0.5rem', fontSize: '0.82rem', textAlign: 'center' }}
                            value={catalogForm.minOrderQty}
                            onChange={(e) => setCatalogForm({ ...catalogForm, minOrderQty: e.target.value })}
                          />
                        </div>

                        <button
                          type="submit"
                          className="btn btn-primary btn-sm"
                          disabled={catalogSaving || !catalogForm.productId}
                          style={{ padding: '0.48rem 0.9rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                        >
                          <Plus size={14} />
                          <span>Thêm Vào NCC</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Catalog Table */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-primary, #f1f5f9)', color: 'var(--text-secondary)', textAlign: 'left', fontSize: '0.74rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '0.65rem 0.85rem' }}>SKU</th>
                          <th style={{ padding: '0.65rem 0.85rem' }}>Tên Sản Phẩm</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Giá Nhập Sỉ</th>
                          <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>MOQ</th>
                          {canEditCatalog && <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>Thao Tác</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {(!catalogSupplier.products || catalogSupplier.products.length === 0) ? (
                          <tr>
                            <td colSpan={canEditCatalog ? 5 : 4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              Nhà cung cấp này chưa có sản phẩm nào trong danh mục cung ứng.
                            </td>
                          </tr>
                        ) : (
                          catalogSupplier.products.map((sp) => {
                            const isEditing = editingPriceId === sp.productId;
                            return (
                              <tr key={sp.id || sp.productId} style={{ borderTop: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)' }}>
                                  {sp.productSku}
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                  {sp.productName}
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', fontWeight: 700 }}>
                                  {isEditing ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        className="input"
                                        style={{ width: '130px', padding: '0.25rem 0.45rem', textAlign: 'right', fontSize: '0.82rem' }}
                                        value={editingPriceValue}
                                        onChange={(e) => setEditingPriceValue(e.target.value)}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-primary"
                                        disabled={catalogSaving}
                                        onClick={() => handleSaveCatalogPrice(sp)}
                                        style={{ padding: '4px 7px' }}
                                        title="Lưu đơn giá"
                                      >
                                        <Save size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline"
                                        onClick={() => {
                                          setEditingPriceId(null);
                                          setEditingPriceValue('');
                                        }}
                                        style={{ padding: '4px 7px' }}
                                        title="Hủy"
                                      >
                                        <X size={13} />
                                      </button>
                                    </div>
                                  ) : (
                                    formatVND(sp.supplyPrice)
                                  )}
                                </td>
                                <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                  {sp.minOrderQty || 1}
                                </td>
                                {canEditCatalog && (
                                  <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline"
                                        onClick={() => {
                                          setEditingPriceId(sp.productId);
                                          setEditingPriceValue(String(Math.round(Number(sp.supplyPrice) || 0)));
                                        }}
                                        style={{ padding: '3px 7px', fontSize: '0.75rem' }}
                                        title="Sửa giá nhập sỉ"
                                      >
                                        <Edit3 size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline"
                                        onClick={() => handleRemoveCatalogProduct(sp)}
                                        style={{ padding: '3px 7px', fontSize: '0.75rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                                        title="Gỡ khỏi danh mục NCC"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary, #f8fafc)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Khi tạo PO cho <strong>{catalogSupplier.name}</strong>, hệ thống chỉ cho phép chọn các sản phẩm trong danh sách trên.
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowCatalogModal(false)}
                    style={{ padding: '0.45rem 1.15rem' }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};

export default Procurement;
