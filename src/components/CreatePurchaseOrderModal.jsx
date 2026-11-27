import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../api/client';
import { useDialog } from '../context/DialogContext';
import {
  Building2,
  CheckCircle2,
  MapPin,
  Package,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';

const formatVND = (amount) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const createEmptyItem = () => ({
  productId: '',
  sku: '',
  productName: '',
  requestedQuantity: 10,
  unitPrice: '',
});

const CreatePurchaseOrderModal = ({
  isOpen,
  onClose,
  title = 'Tạo Đơn Đặt Hàng Mới',
  subtitle = null,
  submitLabel = 'Tạo đơn đặt hàng mới',
  suppliers: propSuppliers = null,
  availableProducts: propProducts = null,
  initialSupplierId = '',
  initialProductId = '',
  initialProduct = null,
  initialQuantity = 10,
  initialNotes = '',
  onSuccess = null,
  onOpenSupplierCatalog = null,
}) => {
  const { showAlert } = useDialog();
  const [suppliers, setSuppliers] = useState(Array.isArray(propSuppliers) ? propSuppliers : []);
  const [availableProducts, setAvailableProducts] = useState(
    Array.isArray(propProducts) ? propProducts : [],
  );
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const didInitRef = useRef(false);

  const [poForm, setPoForm] = useState({
    supplierId: '',
    expectedDeliveryDays: 3,
    notes: '',
    items: [createEmptyItem()],
  });

  // Sync externally supplied catalogs whenever provided
  useEffect(() => {
    if (Array.isArray(propSuppliers)) {
      setSuppliers(propSuppliers);
    }
  }, [propSuppliers]);

  useEffect(() => {
    if (Array.isArray(propProducts)) {
      setAvailableProducts(propProducts);
    }
  }, [propProducts]);

  // Self-load suppliers & products if parent page didn't pass them
  useEffect(() => {
    if (!isOpen) {
      didInitRef.current = false;
      setCatalogReady(false);
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const shouldFetchSuppliers = !Array.isArray(propSuppliers) || propSuppliers.length === 0;
    const shouldFetchProducts = !Array.isArray(propProducts) || propProducts.length === 0;

    if (shouldFetchSuppliers || shouldFetchProducts) {
      setLoadingCatalog(true);
      setCatalogReady(false);
      Promise.all([
        shouldFetchSuppliers
          ? apiClient.get('/procurement/suppliers').then((r) => r.data || [])
          : Promise.resolve(propSuppliers),
        shouldFetchProducts
          ? apiClient
              .get('/inventory/products?limit=200')
              .then((r) => r.data?.data || r.data?.items || (Array.isArray(r.data) ? r.data : []))
          : Promise.resolve(propProducts),
      ])
        .then(([sups, prods]) => {
          if (shouldFetchSuppliers) setSuppliers(sups);
          if (shouldFetchProducts) setAvailableProducts(prods);
        })
        .catch((err) => {
          console.error('Lỗi tải danh sách nhà cung cấp / sản phẩm:', err);
        })
        .finally(() => {
          setLoadingCatalog(false);
          setCatalogReady(true);
        });
    } else {
      setCatalogReady(true);
    }

    return () => {
      document.body.style.overflow = prevOverflow || 'auto';
    };
  }, [isOpen, propSuppliers, propProducts]);

  // Initialize form cleanly once per open (waiting until suppliers catalog is loaded)
  useEffect(() => {
    if (!isOpen || didInitRef.current) return;
    if (!catalogReady && suppliers.length === 0) return;

    let resolvedSupplierId = initialSupplierId || '';
    let initialItems = [createEmptyItem()];

    if (initialProductId && suppliers.length > 0) {
      const targetSuppliers = suppliers.filter((s) =>
        (s.products || []).some((sp) => sp.productId === initialProductId),
      );
      const chosenSupplier =
        (resolvedSupplierId && targetSuppliers.find((s) => s.id === resolvedSupplierId)) ||
        targetSuppliers[0] ||
        null;

      if (chosenSupplier) {
        resolvedSupplierId = chosenSupplier.id;
        const catalogEntry = (chosenSupplier.products || []).find(
          (sp) => sp.productId === initialProductId,
        );
        const invProduct =
          availableProducts.find((p) => p.id === initialProductId) || initialProduct;

        if (catalogEntry) {
          initialItems = [
            {
              productId: catalogEntry.productId,
              sku: catalogEntry.productSku || invProduct?.sku || '',
              productName: catalogEntry.productName || invProduct?.name || '',
              requestedQuantity: Math.max(
                1,
                Number(initialQuantity) || catalogEntry.minOrderQty || 10,
              ),
              unitPrice:
                Number(catalogEntry.supplyPrice) ||
                Math.round(Number(invProduct?.price || 0) * 0.75),
            },
          ];
        }
      }
    }

    setPoForm({
      supplierId: resolvedSupplierId,
      expectedDeliveryDays: 3,
      notes: initialNotes || '',
      items: initialItems,
    });
    didInitRef.current = true;
  }, [
    isOpen,
    catalogReady,
    suppliers,
    availableProducts,
    initialSupplierId,
    initialProductId,
    initialProduct,
    initialQuantity,
    initialNotes,
  ]);

  if (!isOpen) return null;

  const selectedSupplierObj = suppliers.find((s) => s.id === poForm.supplierId) || null;
  const supplierCatalogProducts = selectedSupplierObj?.products || [];

  // Put suppliers carrying initialProductId first so user sees best matches immediately
  const orderedSuppliers = initialProductId
    ? [...suppliers].sort((a, b) => {
        const aHas = (a.products || []).some((sp) => sp.productId === initialProductId) ? 1 : 0;
        const bHas = (b.products || []).some((sp) => sp.productId === initialProductId) ? 1 : 0;
        return bHas - aHas;
      })
    : suppliers;

  const handlePOSupplierChange = (newSupplierId) => {
    const sup = suppliers.find((s) => s.id === newSupplierId);
    const catalog = sup?.products || [];

    // Keep preselected product if newly selected supplier also supplies it
    if (initialProductId) {
      const matchInNewSup = catalog.find((sp) => sp.productId === initialProductId);
      if (matchInNewSup) {
        const invProduct =
          availableProducts.find((p) => p.id === initialProductId) || initialProduct;
        setPoForm((prev) => ({
          ...prev,
          supplierId: newSupplierId,
          items: [
            {
              productId: matchInNewSup.productId,
              sku: matchInNewSup.productSku || invProduct?.sku || '',
              productName: matchInNewSup.productName || invProduct?.name || '',
              requestedQuantity: Math.max(1, Number(initialQuantity) || matchInNewSup.minOrderQty || 10),
              unitPrice:
                Number(matchInNewSup.supplyPrice) ||
                Math.round(Number(invProduct?.price || 0) * 0.75),
            },
          ],
        }));
        return;
      }
    }

    setPoForm((prev) => ({
      ...prev,
      supplierId: newSupplierId,
      items: [createEmptyItem()],
    }));
  };

  const handleCatalogProductSelect = (index, productId) => {
    const catalogEntry = supplierCatalogProducts.find((sp) => sp.productId === productId);
    const invProduct = availableProducts.find((p) => p.id === productId);
    const newItems = [...poForm.items];
    if (catalogEntry) {
      newItems[index] = {
        ...newItems[index],
        productId: catalogEntry.productId,
        sku: catalogEntry.productSku || invProduct?.sku || '',
        productName: catalogEntry.productName || invProduct?.name || '',
        unitPrice:
          Number(catalogEntry.supplyPrice) ||
          Math.round(Number(invProduct?.price || 0) * 0.75),
        requestedQuantity: newItems[index].requestedQuantity || catalogEntry.minOrderQty || 10,
      };
    } else if (invProduct) {
      newItems[index] = {
        ...newItems[index],
        productId: invProduct.id,
        sku: invProduct.sku,
        productName: invProduct.name,
        unitPrice: Math.round(Number(invProduct.price || 0) * 0.75),
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        productId: '',
        sku: '',
        productName: '',
        unitPrice: '',
      };
    }
    setPoForm({ ...poForm, items: newItems });
  };

  const addPOItem = () => {
    if (!poForm.supplierId || supplierCatalogProducts.length === 0) return;
    setPoForm({
      ...poForm,
      items: [...poForm.items, createEmptyItem()],
    });
  };

  const removePOItem = (index) => {
    if (poForm.items.length <= 1) return;
    setPoForm({
      ...poForm,
      items: poForm.items.filter((_, i) => i !== index),
    });
  };

  const calculatedPOTotal = poForm.items.reduce(
    (sum, it) => sum + (Number(it.requestedQuantity) || 0) * (Number(it.unitPrice) || 0),
    0,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!poForm.supplierId) {
      showAlert('Vui lòng chọn nhà cung cấp chính hãng trước!', 'error', 'Thiếu Thông Tin');
      return;
    }

    const validItems = poForm.items
      .filter((i) => i.productId)
      .map((i) => ({
        ...i,
        requestedQuantity: Number(i.requestedQuantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
      }));
    if (validItems.length === 0) {
      showAlert('Vui lòng chọn ít nhất một sản phẩm!', 'error', 'Thiếu Thông Tin');
      return;
    }

    const allowedIds = new Set(supplierCatalogProducts.map((sp) => sp.productId));
    const invalidItem = validItems.find((i) => !allowedIds.has(i.productId));
    if (invalidItem) {
      showAlert(
        `Sản phẩm "${invalidItem.productName || invalidItem.sku}" không thuộc danh mục cung ứng của nhà cung cấp đã chọn.`,
        'error',
        'Sai Danh Mục Nhà Cung Cấp',
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.post('/procurement/purchase-orders', {
        ...poForm,
        expectedDeliveryDays: Math.max(1, Number(poForm.expectedDeliveryDays) || 3),
        items: validItems,
      });
      const created = res.data?.data || res.data;
      const poCode = created?.poNumber ? ` (${created.poNumber})` : '';
      showAlert(
        `Tạo đơn đặt hàng mới${poCode} thành công!`,
        'success',
        'Tạo Đơn Đặt Hàng Mới',
      );
      onClose();
      if (onSuccess) onSuccess(created);
    } catch (err) {
      showAlert(
        'Lỗi tạo đơn: ' + (err.response?.data?.message || err.message),
        'error',
        'Lỗi Tạo Đơn',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
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
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="modal-content animate-scale-in"
        style={{
          maxWidth: '820px',
          width: '95%',
          maxHeight: '88vh',
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
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {subtitle || (
                  <>
                    Lập phiếu nhập hàng chính hãng chuyển về kho qua{' '}
                    <strong>CỬA 01 - IN (CẢNG TIẾP NHẬN A)</strong>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'var(--bg-primary, #f1f5f9)',
              border: 'none',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
            {/* Config section */}
            <div
              style={{
                background: 'var(--bg-primary, #f8fafc)',
                padding: '1rem',
                borderRadius: 10,
                border: '1px solid var(--border-color)',
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: 4 }}>
                  <Building2 size={13} color="var(--accent-primary)" />
                  Nhà Cung Cấp Chính Hãng <span className="req">*</span>
                </label>
                <select
                  required
                  className="input"
                  value={poForm.supplierId}
                  onChange={(e) => handlePOSupplierChange(e.target.value)}
                  disabled={loadingCatalog && suppliers.length === 0}
                >
                  <option value="">
                    {loadingCatalog && suppliers.length === 0
                      ? 'Đang tải danh sách nhà cung cấp...'
                      : '-- Chọn nhà phân phối thiết bị --'}
                  </option>
                  {orderedSuppliers.map((s) => {
                    const suppliesTarget =
                      initialProductId &&
                      (s.products || []).some((sp) => sp.productId === initialProductId);
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) - {s.products?.length || 0} SP
                        {suppliesTarget ? ' ★ Cung ứng SP này' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 3 }}>
                    Dự Kiến Giao (Ngày)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    className="input"
                    style={{ padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
                    value={poForm.expectedDeliveryDays}
                    onChange={(e) =>
                      setPoForm({
                        ...poForm,
                        expectedDeliveryDays: e.target.value === '' ? '' : Math.max(1, Number(e.target.value)),
                      })
                    }
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 3 }}>
                    Ghi Chú Đơn Đặt Hàng
                  </label>
                  <input
                    type="text"
                    className="input"
                    style={{ padding: '0.45rem 0.7rem', fontSize: '0.82rem' }}
                    placeholder="Ghi chú tùy chỉnh (VD: Đơn đặt bổ sung tồn kho an toàn...)"
                    value={poForm.notes}
                    onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Items header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <Package size={16} color="var(--accent-primary)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Danh Mục Thiết Bị Cần Nhập Sỉ</span>
                <span
                  style={{
                    background: '#e0e7ff',
                    color: '#4338ca',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 10,
                  }}
                >
                  {poForm.items.length} mặt hàng
                </span>
                {selectedSupplierObj && (
                  <span
                    style={{
                      background:
                        supplierCatalogProducts.length > 0
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(245, 158, 11, 0.14)',
                      color: supplierCatalogProducts.length > 0 ? '#059669' : '#d97706',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    {supplierCatalogProducts.length} SP thuộc {selectedSupplierObj.code}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={addPOItem}
                disabled={!poForm.supplierId || supplierCatalogProducts.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  fontSize: '0.78rem',
                  opacity: !poForm.supplierId || supplierCatalogProducts.length === 0 ? 0.55 : 1,
                  cursor:
                    !poForm.supplierId || supplierCatalogProducts.length === 0
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                <Plus size={13} /> Thêm sản phẩm
              </button>
            </div>

            {selectedSupplierObj && supplierCatalogProducts.length === 0 && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: 8,
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#b45309',
                  fontSize: '0.8rem',
                  marginBottom: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span>
                  Nhà cung cấp <strong>{selectedSupplierObj.name}</strong> chưa có sản phẩm nào trong danh mục cung ứng.
                </span>
                {onOpenSupplierCatalog && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      onClose();
                      onOpenSupplierCatalog(selectedSupplierObj);
                    }}
                    style={{ fontSize: '0.74rem', padding: '3px 8px', whiteSpace: 'nowrap' }}
                  >
                    Xem & Gán Sản Phẩm
                  </button>
                )}
              </div>
            )}

            {/* Items Table Container */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 1fr 1.4fr 1.4fr 36px',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-primary, #f1f5f9)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                }}
              >
                <div>Sản Phẩm Thiết Bị</div>
                <div style={{ textAlign: 'center' }}>Số Lượng</div>
                <div>Đơn Giá Sỉ (VNĐ)</div>
                <div style={{ textAlign: 'right' }}>Thành Tiền</div>
                <div></div>
              </div>

              <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '0.4rem' }}>
                {poForm.items.map((item, idx) => {
                  const rowSubtotal =
                    (Number(item.requestedQuantity) || 0) * (Number(item.unitPrice) || 0);
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
                        disabled={!poForm.supplierId || supplierCatalogProducts.length === 0}
                        onChange={(e) => handleCatalogProductSelect(idx, e.target.value)}
                        required
                      >
                        <option value="">
                          {!poForm.supplierId
                            ? '-- Chọn nhà cung cấp trước --'
                            : supplierCatalogProducts.length === 0
                              ? '-- NCC chưa có sản phẩm --'
                              : `-- Chọn sản phẩm thuộc NCC (${supplierCatalogProducts.length}) --`}
                        </option>
                        {supplierCatalogProducts.map((sp) => (
                          <option key={sp.productId} value={sp.productId}>
                            {sp.productSku} - {sp.productName} ({formatVND(sp.supplyPrice)})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        className="input"
                        style={{
                          padding: '0.4rem 0.3rem',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}
                        value={item.requestedQuantity ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newItems = [...poForm.items];
                          newItems[idx].requestedQuantity =
                            val === '' ? '' : Math.max(1, Number(val));
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

                      <div
                        style={{
                          textAlign: 'right',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                          fontSize: '0.85rem',
                        }}
                      >
                        {formatVND(rowSubtotal)}
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        {poForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePOItem(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 2,
                            }}
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
          <div
            style={{
              padding: '0.85rem 1.5rem',
              borderTop: '1px solid var(--border-color)',
              background: 'var(--bg-primary, #f8fafc)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
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
                onClick={onClose}
                style={{ padding: '0.5rem 1.1rem' }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !poForm.supplierId || supplierCatalogProducts.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1.35rem',
                  opacity:
                    submitting || !poForm.supplierId || supplierCatalogProducts.length === 0
                      ? 0.6
                      : 1,
                }}
              >
                <CheckCircle2 size={16} />
                <span>{submitting ? 'Đang tạo đơn...' : submitLabel}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default CreatePurchaseOrderModal;
