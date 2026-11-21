import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../api/client';
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  PackageCheck,
  Truck,
  AlertCircle,
  Eye,
  FileCheck2,
  Barcode,
  Layers,
  MapPin,
  X,
  Sparkles,
  User,
  Phone,
  Home,
  Tag,
  Zap,
  Trash2,
  Package,
} from 'lucide-react';

const STATUS_COLORS = {
  PENDING: { label: 'Chờ xử lý', bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  ALLOCATED: { label: 'Đã giữ tồn kho (Saga)', bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
  PICKING: { label: 'Đang soạn hàng', bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
  PACKED: { label: 'Đã đóng gói + Serial', bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
  DISPATCHED: { label: 'Đã xuất xưởng (Cửa 02)', bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  OUT_OF_STOCK: { label: 'Hết hàng (Saga bù trừ)', bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
};

const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSagaModal, setShowSagaModal] = useState(false);
  const [showPickModal, setShowPickModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pickList, setPickList] = useState(null);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (showCreateModal || showSagaModal || showPickModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showCreateModal, showSagaModal, showPickModal]);

  // Products available for ordering
  const [availableProducts, setAvailableProducts] = useState([]);

  // Create Order Form State
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    shippingAddress: '',
    orderType: 'RETAIL_ONLINE',
    priority: 'NORMAL',
    notes: '',
    items: [{ productId: '', productName: '', sku: '', quantity: 1, unitPrice: 0 }],
  });
  const [submitting, setSubmitting] = useState(false);
  const [sagaFeedback, setSagaFeedback] = useState(null);

  // Pick Item Form State
  const [pickingItems, setPickingItems] = useState({});

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;
      const res = await apiClient.get('/orders', { params });
      setOrders(res.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/inventory/products?limit=100');
      const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
      setAvailableProducts(list);
    } catch (err) {
      console.error('Lỗi tải danh mục sản phẩm:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleProductSelect = (index, productId) => {
    const prod = availableProducts.find((p) => p.id === productId);
    if (!prod) return;
    const newItems = [...orderForm.items];
    newItems[index] = {
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      quantity: 1,
      unitPrice: Number(prod.price) || 0,
    };
    setOrderForm({ ...orderForm, items: newItems });
  };

  const handlePriceChange = (index, price) => {
    const newItems = [...orderForm.items];
    newItems[index].unitPrice = Math.max(0, Number(price));
    setOrderForm({ ...orderForm, items: newItems });
  };

  const handleQuantityChange = (index, qty) => {
    const newItems = [...orderForm.items];
    newItems[index].quantity = Math.max(1, Number(qty));
    setOrderForm({ ...orderForm, items: newItems });
  };

  const addOrderItem = () => {
    setOrderForm({
      ...orderForm,
      items: [
        ...orderForm.items,
        { productId: '', productName: '', sku: '', quantity: 1, unitPrice: 0 },
      ],
    });
  };

  const removeOrderItem = (index) => {
    if (orderForm.items.length <= 1) return;
    const newItems = orderForm.items.filter((_, i) => i !== index);
    setOrderForm({ ...orderForm, items: newItems });
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setSagaFeedback(null);
      const validItems = orderForm.items.filter((i) => i.productId);
      if (validItems.length === 0) {
        alert('Vui lòng chọn ít nhất một sản phẩm cho đơn hàng!');
        return;
      }

      const res = await apiClient.post('/orders', {
        ...orderForm,
        items: validItems,
      });

      const created = res.data;
      setSagaFeedback(created);
      fetchOrders();

      if (created.status === 'ALLOCATED') {
        setTimeout(() => {
          setShowCreateModal(false);
          setSagaFeedback(null);
          setOrderForm({
            customerName: '',
            customerPhone: '',
            shippingAddress: '',
            orderType: 'RETAIL_ONLINE',
            priority: 'NORMAL',
            notes: '',
            items: [{ productId: '', productName: '', sku: '', quantity: 1, unitPrice: 0 }],
          });
        }, 2500);
      }
    } catch (err) {
      alert('Lỗi tạo đơn hàng: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const openSagaTrace = (order) => {
    setSelectedOrder(order);
    setShowSagaModal(true);
  };

  const openPickList = async (order) => {
    setSelectedOrder(order);
    setShowPickModal(true);
    try {
      const res = await apiClient.get(`/orders/${order.id}/pick-list`);
      setPickList(res.data);
      const initInputs = {};
      (res.data?.items || []).forEach((it) => {
        initInputs[it.id] = {
          pickedQuantity: it.pickedQuantity || it.quantityToPick,
          serialNumbers: it.serialNumbers || '',
        };
      });
      setPickingItems(initInputs);
    } catch (err) {
      console.error('Lỗi tải Pick List:', err);
    }
  };

  const handleConfirmPick = async (itemId) => {
    const input = pickingItems[itemId] || {};
    try {
      await apiClient.post('/orders/pick-list-item/confirm', {
        itemId,
        pickedQuantity: Number(input.pickedQuantity) || 1,
        serialNumbers: input.serialNumbers || '',
      });
      alert('Đã cập nhật trạng thái nhặt hàng & Serial/IMEI thành công!');
      if (selectedOrder) {
        const res = await apiClient.get(`/orders/${selectedOrder.id}/pick-list`);
        setPickList(res.data);
      }
      fetchOrders();
    } catch (err) {
      alert('Lỗi cập nhật: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDispatch = async (orderId) => {
    if (!window.confirm('Xác nhận xuất xưởng đơn hàng qua [CỬA 02 - OUT]? Tồn kho thực tế sẽ được trừ vĩnh viễn.')) return;
    try {
      await apiClient.post(`/orders/${orderId}/dispatch`);
      alert('Đơn hàng đã xuất kho thành công qua CỬA 02 - OUT!');
      fetchOrders();
      if (showPickModal) setShowPickModal(false);
    } catch (err) {
      alert('Lỗi xuất xưởng: ' + (err.response?.data?.message || err.message));
    }
  };

  // Stats calculation
  const totalOrders = orders.length;
  const allocatedCount = orders.filter((o) => o.status === 'ALLOCATED').length;
  const packedCount = orders.filter((o) => o.status === 'PACKED').length;
  const dispatchedCount = orders.filter((o) => o.status === 'DISPATCHED').length;

  const calculatedOrderTotal = orderForm.items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <ShoppingCart size={28} color="var(--accent-primary)" />
            Quản Lý Đơn Hàng
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Điều phối bán hàng đa kênh, Lập phiếu soạn hàng (Pick List) tối ưu hóa lộ trình kệ & Quản lý Serial/IMEI.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={18} />
          <span>Tạo Đơn Hàng Mới</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingCart size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tổng số Đơn hàng</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{totalOrders}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Đã khóa tồn (Allocated)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1d4ed8' }}>{allocatedCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ffedd5', color: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PackageCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Đã đóng gói + Serial</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#c2410c' }}>{packedCount}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Đã xuất Cửa 02 - OUT</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#15803d' }}>{dispatchedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'ALLOCATED', 'PICKING', 'PACKED', 'DISPATCHED', 'OUT_OF_STOCK'].map((st) => (
            <button
              key={st}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setStatusFilter(st)}
            >
              {st === 'ALL' ? 'Tất cả trạng thái' : STATUS_COLORS[st]?.label || st}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', minWidth: '280px' }}>
          <input
            type="text"
            className="input"
            placeholder="Tìm theo Mã đơn, Tên KH, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-outline">
            <Search size={16} />
          </button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="card table-container" style={{ overflowX: 'auto', padding: 0 }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', textAlign: 'left', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Mã Đơn Hàng</th>
              <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Khách Hàng</th>
              <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Loại Đơn & Ưu Tiên</th>
              <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Trạng Thái</th>
              <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Tổng Tiền</th>
              <th style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>Ngày Tạo</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem' }}>
                  Đang tải danh sách đơn hàng...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                  Không tìm thấy đơn hàng nào phù hợp. Bấm <strong>Tạo Đơn Hàng Mới</strong> để bắt đầu lên đơn!
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const st = STATUS_COLORS[order.status] || STATUS_COLORS.PENDING;
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, borderRight: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--accent-primary)' }}>{order.orderNumber}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone || 'Không có SĐT'}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', borderRight: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.85rem' }}>
                        {order.orderType === 'RETAIL_ONLINE' && 'Bán Lẻ Online'}
                        {order.orderType === 'STORE_TRANSFER' && 'Điều Chuyển ĐMX'}
                        {order.orderType === 'WARRANTY_DISPATCH' && 'Đổi Trả Bảo Hành'}
                      </div>
                      {order.priority === 'HIGH' ? (
                        <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          ⚡ HỎA TỐC
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                          Tiêu chuẩn
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
                        {order.status === 'ALLOCATED' && <CheckCircle2 size={13} />}
                        {order.status === 'DISPATCHED' && <Truck size={13} />}
                        {order.status === 'OUT_OF_STOCK' && <AlertCircle size={13} />}
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--accent-primary)', borderRight: '1px solid var(--border-color)' }}>
                      {formatVND(order.totalAmount)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)' }}>
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          title="Xem Luồng Saga Pattern"
                          onClick={() => openSagaTrace(order)}
                          style={{ padding: '4px 8px' }}
                        >
                          <Eye size={14} />
                          <span style={{ marginLeft: 4, fontSize: '0.75rem' }}>Saga</span>
                        </button>

                        {(order.status === 'ALLOCATED' || order.status === 'PICKING' || order.status === 'PACKED') && (
                          <button
                            className="btn btn-sm btn-primary"
                            title="Phiếu Soạn Hàng Theo Kệ & Serial"
                            onClick={() => openPickList(order)}
                            style={{ padding: '4px 8px' }}
                          >
                            <Barcode size={14} />
                            <span style={{ marginLeft: 4, fontSize: '0.75rem' }}>Soạn Hàng</span>
                          </button>
                        )}

                        {order.status === 'PACKED' && (
                          <button
                            className="btn btn-sm"
                            title="Xuất xưởng Cửa 02 - OUT"
                            onClick={() => handleDispatch(order.id)}
                            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 8px' }}
                          >
                            <Truck size={14} />
                            <span style={{ marginLeft: 4, fontSize: '0.75rem' }}>Xuất Cửa 02</span>
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

            {/* ========================================================================= */}
      {/* MODAL 1: TẠO ĐƠN HÀNG MỚI (SAGA PATTERN) - PORTAL TO BODY - STRICT CENTER */}
      {/* ========================================================================= */}
      {showCreateModal && ReactDOM.createPortal(
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
            margin: 0,
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            className="modal-content animate-scale-in"
            style={{
              maxWidth: '860px',
              width: '95%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-secondary, #ffffff)',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              margin: 'auto',
            }}
          >
            {/* Header (Fixed) */}
            <div style={{ flexShrink: 0, padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary, #ffffff)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)' }}>
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Tạo Đơn Hàng Mới (Khóa Tồn Kho Phân Tán Saga)
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Tự động điều phối giữ hàng an toàn theo thời gian thực và sinh Phiếu Soạn Hàng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'var(--bg-primary, #f1f5f9)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', margin: 0 }}>
              {/* Scrollable Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem' }}>
                {/* Saga Feedback Alert */}
                {sagaFeedback && (
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 12,
                      marginBottom: '1.25rem',
                      background: sagaFeedback.status === 'ALLOCATED' ? '#dcfce7' : '#fee2e2',
                      border: `1.5px solid ${sagaFeedback.status === 'ALLOCATED' ? '#86efac' : '#fca5a5'}`,
                    }}
                  >
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: sagaFeedback.status === 'ALLOCATED' ? '#15803d' : '#b91c1c' }}>
                      {sagaFeedback.status === 'ALLOCATED' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                      {sagaFeedback.status === 'ALLOCATED'
                        ? '🎉 SAGA THÀNH CÔNG: Đã khóa tồn kho an toàn 100% & sinh Phiếu Soạn Hàng!'
                        : '⚠️ SAGA THẤT BẠI: Hết hàng tồn khả dụng. Giao dịch bù trừ tự động hoàn trả tồn kho!'}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.35rem', color: '#1e293b' }}>
                      Mã đơn: <strong>{sagaFeedback.orderNumber}</strong> - Trạng thái: <strong>{sagaFeedback.status}</strong>
                    </div>
                  </div>
                )}

                {/* Customer Info Card */}
                <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">
                        <User size={14} color="var(--accent-primary)" />
                        Tên khách hàng / Người nhận <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="input"
                        value={orderForm.customerName}
                        onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                        placeholder="VD: Anh Minh (Siêu thị ĐMX số 128)"
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">
                        <Phone size={14} color="var(--accent-primary)" />
                        Số điện thoại liên hệ
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={orderForm.customerPhone}
                        onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                        placeholder="VD: 0987 654 321"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0, marginBottom: '0.75rem' }}>
                    <label className="form-label">
                      <Home size={14} color="var(--accent-primary)" />
                      Địa chỉ giao hàng / Siêu thị nhận
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={orderForm.shippingAddress}
                      onChange={(e) => setOrderForm({ ...orderForm, shippingAddress: e.target.value })}
                      placeholder="VD: Siêu thị Điện Máy Xanh số 128 Trần Não, P. An Khánh, TP. Thủ Đức"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">
                        <Tag size={14} color="var(--accent-primary)" />
                        Kênh bán hàng / Phân loại
                      </label>
                      <select
                        className="input select"
                        value={orderForm.orderType}
                        onChange={(e) => setOrderForm({ ...orderForm, orderType: e.target.value })}
                      >
                        <option value="RETAIL_ONLINE">Bán Lẻ Trực Tuyến (Online Delivery)</option>
                        <option value="STORE_TRANSFER">Cấp Hàng Siêu Thị Điện Máy (Store Transfer)</option>
                        <option value="WARRANTY_DISPATCH">Xuất Đổi Trả / Bảo Hành Chính Hãng</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">
                        <Zap size={14} color="var(--accent-primary)" />
                        Mức độ ưu tiên
                      </label>
                      <select
                        className="input select"
                        value={orderForm.priority}
                        onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                      >
                        <option value="NORMAL">Tiêu Chuẩn (24h)</option>
                        <option value="HIGH">Hỏa Tốc Giao Ngay (2h Express)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Items Card */}
                <div style={{ background: 'var(--bg-primary, #f8fafc)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Package size={18} color="var(--accent-primary)" />
                      <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                        Danh Sách Thiết Bị Điện Máy
                      </strong>
                      <span style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-secondary)' }}>
                        {orderForm.items.length} món
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={addOrderItem}
                      style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Plus size={14} /> Thêm sản phẩm
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1.2fr 1.2fr 40px', gap: '0.75rem', padding: '0.5rem 0.75rem', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
                    <div>SẢN PHẨM THIẾT BỊ</div>
                    <div style={{ textAlign: 'center' }}>SỐ LƯỢNG</div>
                    <div style={{ textAlign: 'right' }}>ĐƠN GIÁ BÁN</div>
                    <div style={{ textAlign: 'right' }}>THÀNH TIỀN</div>
                    <div></div>
                  </div>

                  {orderForm.items.map((item, idx) => {
                    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2.5fr 1fr 1.2fr 1.2fr 40px',
                          gap: '0.75rem',
                          alignItems: 'center',
                          marginBottom: '0.65rem',
                          padding: '0.35rem 0',
                        }}
                      >
                        <select
                          required
                          className="input select"
                          value={item.productId}
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          style={{ fontSize: '0.88rem' }}
                        >
                          <option value="">-- Chọn sản phẩm --</option>
                          {availableProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="1"
                          required
                          className="input"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          style={{ textAlign: 'center', fontWeight: 700 }}
                        />

                        <input
                          type="number"
                          min="0"
                          className="input"
                          value={item.unitPrice}
                          onChange={(e) => handlePriceChange(idx, e.target.value)}
                          style={{ textAlign: 'right' }}
                        />

                        <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {formatVND(lineTotal)}
                        </div>

                        <div>
                          {orderForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOrderItem(idx)}
                              style={{
                                background: '#fee2e2',
                                border: 'none',
                                color: '#ef4444',
                                borderRadius: 8,
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
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

              {/* Fixed Footer */}
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', padding: '1rem 1.75rem', background: 'var(--bg-secondary, #ffffff)', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tổng giá trị đơn hàng:</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    {formatVND(calculatedOrderTotal)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowCreateModal(false)}
                    style={{ padding: '0.65rem 1.25rem' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem' }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{submitting ? 'Đang thực thi Saga...' : 'Xác Nhận Đặt Hàng (Saga)'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SAGA TIMELINE TRACE - PORTAL TO BODY - STRICT CENTER */}
      {/* ========================================================================= */}
      {showSagaModal && selectedOrder && ReactDOM.createPortal(
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
            margin: 0,
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSagaModal(false);
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
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              margin: 'auto',
            }}
          >
            {/* Header (Fixed) */}
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', padding: '1.25rem 1.5rem', background: 'var(--bg-secondary, #ffffff)' }}>
              <div>
                <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>
                  SAGA ORCHESTRATOR
                </span>
                <h3 style={{ margin: '0.35rem 0 0.1rem 0', fontSize: '1.25rem' }}>Lịch Sử Điều Phối Saga</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Mã đơn: <strong>{selectedOrder.orderNumber}</strong></div>
              </div>
              <button
                type="button"
                onClick={() => setShowSagaModal(false)}
                style={{ background: 'var(--bg-primary, #f1f5f9)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(selectedOrder.sagaTrace || []).map((step, idx) => {
                const isFail = step.status === 'FAILED';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '0.85rem',
                      alignItems: 'flex-start',
                      padding: '0.85rem 1rem',
                      borderRadius: 10,
                      background: isFail ? '#fee2e2' : 'var(--bg-primary, #f8fafc)',
                      borderLeft: `4px solid ${isFail ? '#ef4444' : '#10b981'}`,
                      border: '1px solid var(--border-color)',
                      borderLeftWidth: '4px',
                    }}
                  >
                    <div style={{ marginTop: 2, color: isFail ? '#ef4444' : '#10b981' }}>
                      {isFail ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <strong style={{ fontSize: '0.85rem', color: isFail ? '#b91c1c' : 'var(--text-primary)' }}>
                          {step.step}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {step.timestamp ? new Date(step.timestamp).toLocaleTimeString('vi-VN') : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{step.action}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pinned Footer */}
            <div style={{ flexShrink: 0, textAlign: 'right', borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem', background: 'var(--bg-secondary, #ffffff)' }}>
              <button className="btn btn-outline" onClick={() => setShowSagaModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PHIẾU SOẠN HÀNG (PICK LIST) - PORTAL TO BODY - STRICT CENTER */}
      {/* ========================================================================= */}
      {showPickModal && selectedOrder && ReactDOM.createPortal(
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
            margin: 0,
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPickModal(false);
          }}
        >
          <div
            className="modal-content animate-scale-in"
            style={{
              maxWidth: '840px',
              width: '95%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-secondary, #ffffff)',
              borderRadius: '20px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              margin: 'auto',
            }}
          >
            {/* Header (Fixed) */}
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', padding: '1.25rem 1.75rem', background: 'var(--bg-secondary, #ffffff)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Barcode size={22} color="var(--accent-primary)" />
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Phiếu Soạn Hàng (Pick List)</h3>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Đơn hàng: <strong>{selectedOrder.orderNumber}</strong> | Người soạn: <strong>{pickList?.pickerName || 'Nhân viên kho'}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPickModal(false)}
                style={{ background: 'var(--bg-primary, #f1f5f9)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(pickList?.items || []).map((item) => {
                const currentInput = pickingItems[item.id] || {
                  pickedQuantity: item.pickedQuantity,
                  serialNumbers: item.serialNumbers,
                };
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 12,
                      border: '1px solid var(--border-color)',
                      background: item.isPicked ? '#f0fdf4' : 'var(--bg-primary, #f8fafc)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{item.productName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mã SKU: {item.sku}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 600 }}>
                          <MapPin size={12} style={{ display: 'inline', marginRight: 2 }} />
                          Kệ {item.locationCode} ({item.zone})
                        </span>
                        {item.isPicked && (
                          <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
                            ✓ Đã Hoàn Tất
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr auto', gap: '1rem', alignItems: 'center' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>SL cần soạn:</label>
                        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--accent-primary)' }}>
                          {item.pickedQuantity} / {item.quantityToPick} chiếc
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 2 }}>Mã Serial / IMEI máy:</label>
                        <input
                          type="text"
                          className="input"
                          style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                          placeholder="Quét hoặc nhập mã Serial/IMEI thiết bị..."
                          value={currentInput.serialNumbers || ''}
                          disabled={item.isPicked}
                          onChange={(e) =>
                            setPickingItems({
                              ...pickingItems,
                              [item.id]: { ...currentInput, serialNumbers: e.target.value },
                            })
                          }
                        />
                      </div>

                      <div style={{ paddingTop: '1rem' }}>
                        {!item.isPicked ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleConfirmPick(item.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <CheckCircle2 size={14} /> Xác nhận
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>Đã khóa</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pinned Footer */}
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', padding: '1rem 1.75rem', background: 'var(--bg-secondary, #ffffff)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Trạng thái soạn hàng: <strong>{pickList?.status}</strong>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" onClick={() => setShowPickModal(false)}>
                  Đóng
                </button>
                {selectedOrder.status === 'PACKED' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleDispatch(selectedOrder.id)}
                    style={{ background: '#16a34a', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Truck size={16} /> Xuất xưởng (Cửa 02 - OUT)
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

export default Orders;
