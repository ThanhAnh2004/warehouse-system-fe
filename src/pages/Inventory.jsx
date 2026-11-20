import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Plus, Search, Image as ImageIcon, Tag, Filter, X, Save, Eye, Sparkles } from 'lucide-react';
import { calculateSuggestedMinStock } from '../utils/minStockCalculator';
import './Inventory.css';

const CATEGORY_CONFIG = [
  { key: 'ALL', label: 'Tất Cả Mặt Hàng', color: 'var(--accent-primary)', bg: 'rgba(99, 102, 241, 0.12)' },
  { key: 'Điện thoại & Tablet', label: '📱 Điện thoại & Tablet', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  { key: 'Laptop & Máy tính', label: '💻 Laptop & Máy tính', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
  { key: 'Tivi & Thiết bị giải trí', label: '📺 Tivi & Giải trí', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  { key: 'Tủ lạnh & Điện lạnh', label: '❄️ Tủ lạnh & Điện lạnh', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
  { key: 'Máy giặt & Gia dụng lớn', label: '🧺 Máy giặt & Gia dụng', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { key: 'Phụ kiện & Thiết bị đeo', label: '🎧 Phụ kiện & Đeo', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
  { key: 'Linh kiện & Bán dẫn', label: '🔌 Linh kiện & Chipset', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
];

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBaseUrl}${cleanUrl}`;
};

const Inventory = () => {
  const navigate = useNavigate();
  const { user, hasPermission } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    price: '',
    quantity: 0,
    category: 'Điện thoại & Tablet',
    description: '',
    minStockLevel: 20,
    unit: 'Bộ',
    image: null
  });

  const [minRationale, setMinRationale] = useState('');

  const handleApplySuggestedMin = () => {
    const { suggestedMin, rationale } = calculateSuggestedMinStock({
      category: newProduct.category,
      price: newProduct.price,
      initialQuantity: newProduct.quantity
    });
    setNewProduct(prev => ({ ...prev, minStockLevel: suggestedMin }));
    setMinRationale(rationale);
  };
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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/inventory/products', {
        params: { page, limit: 10, search, category: selectedCategory, sortBy, sortOrder }
      });
      setProducts(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, selectedCategory, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setPage(1);
  };

  const handleFileChange = (e) => {
    setNewProduct({ ...newProduct, image: e.target.files[0] });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', newProduct.name);
    formData.append('sku', newProduct.sku);
    formData.append('price', newProduct.price);
    formData.append('quantity', 0); // Master data starts at 0, actual stock arrives via Procurement PO Cửa 01
    formData.append('category', newProduct.category);
    formData.append('unit', newProduct.unit);
    formData.append('description', newProduct.description);

    if (newProduct.minStockLevel) formData.append('minStockLevel', Number(newProduct.minStockLevel));

    if (newProduct.image) {
      formData.append('image', newProduct.image);
    }

    try {
      setSubmitting(true);
      await apiClient.post('/inventory/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false);
      setNewProduct({ name: '', sku: '', price: '', quantity: 0, category: 'Điện thoại & Tablet', unit: 'Bộ', description: '', minStockLevel: 20, image: null });
      fetchProducts();
    } catch (err) {
      alert('Lỗi tạo sản phẩm: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const isMobile = window.innerWidth <= 768;
  const modalBackdropStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  };

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="text-title" style={{ marginBottom: 0 }}>Quản Lý Tồn Kho (Inventory Service)</h2>
        {(user?.role === 'Admin' || user?.role === 'Manager' || hasPermission('products:create')) && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} /> Khai Báo Mã Sản Phẩm Mới
          </button>
        )}
      </div>

      <div className="glass-card mb-4" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {CATEGORY_CONFIG.map(cat => (
            <button
              key={cat.key}
              className={`btn ${selectedCategory === cat.key ? 'btn-primary' : 'btn-outline'}`}
              style={{
                fontSize: '0.85rem',
                padding: '0.4rem 0.8rem',
                whiteSpace: 'nowrap',
                background: selectedCategory === cat.key ? cat.color : 'transparent',
                borderColor: cat.color,
                color: selectedCategory === cat.key ? '#fff' : cat.color
              }}
              onClick={() => { setSelectedCategory(cat.key); setPage(1); }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
            <Search size={18} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Tìm kiếm theo Tên sản phẩm hoặc Mã SKU..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Hình Ảnh</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('sku')}>Mã SKU {sortBy === 'sku' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>Tên Sản Phẩm {sortBy === 'name' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}</th>
                <th>Danh Mục</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('price')}>Đơn Giá {sortBy === 'price' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('quantity')}>Tồn Kho {sortBy === 'quantity' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}</th>
                <th>Đơn Vị</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'center', width: '140px', whiteSpace: 'nowrap' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ padding: '2rem', textAlign: 'center' }}>Đang tải danh sách sản phẩm...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Không tìm thấy sản phẩm nào.</td></tr>
              ) : products.map((item) => {
                const isLowStock = item.quantity <= (item.minStockLevel || 10);
                const isOutOfStock = item.quantity === 0;

                return (
                  <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${item.sku}`)}>
                    <td>
                      {getImageUrl(item.imageUrl) ? (
                        <img src={getImageUrl(item.imageUrl)} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={20} color="var(--text-secondary)" />
                        </div>
                      )}
                    </td>
                    <td><strong style={{ color: 'var(--accent-primary)' }}>{item.sku}</strong></td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td><span className="badge badge-primary">{item.category}</span></td>
                    <td style={{ fontWeight: 600 }}>{item.price ? Number(item.price).toLocaleString('vi-VN') + ' VNĐ' : 'Chưa có giá'}</td>
                    <td style={{ fontWeight: 700, color: isOutOfStock ? 'var(--danger)' : isLowStock ? 'var(--warning)' : 'var(--text-primary)' }}>
                      {item.quantity}
                    </td>
                    <td>{item.unit || 'Chiếc'}</td>
                    <td>
                      {isOutOfStock ? (
                        <span className="badge badge-danger">Hết Hàng (0)</span>
                      ) : isLowStock ? (
                        <span className="badge badge-warning">Cảnh Báo Thiếu</span>
                      ) : (
                        <span className="badge badge-success">An Toàn</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn"
                        style={{
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          background: 'rgba(37, 99, 235, 0.12)',
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(37, 99, 235, 0.25)',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => navigate(`/products/${item.sku}`)}
                        title="Xem chi tiết sản phẩm"
                      >
                        <Eye size={15} color="var(--accent-primary)" /> Xem Chi Tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {total > 10 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', alignItems: 'center' }}>
              <button
                className="btn btn-outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                Trang trước
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Trang <strong>{page}</strong> / <strong>{Math.ceil(total / 10)}</strong>
              </span>
              <button
                className="btn btn-outline"
                disabled={page === Math.ceil(total / 10)}
                onClick={() => setPage(page + 1)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modern Centered Add Product Modal via Portal */}
      {showModal && ReactDOM.createPortal(
        <div
          style={modalBackdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            className="modal-content animate-scale-in"
            style={{
              maxWidth: '680px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)' }}>
                  <Plus size={22} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontSize: '1.18rem' }}>
                    Khai Báo Mã Sản Phẩm Mới (Master Data)
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Định nghĩa mã thiết bị vào danh mục. Tồn kho ban đầu = 0 (Nhập kho qua Đơn Mua Hàng Cửa 01)
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn"
                style={{ background: 'var(--bg-primary, #f1f5f9)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setShowModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', margin: 0 }}>
              {/* Scrollable Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                    Loại / Danh Mục Sản Phẩm <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select className="form-input" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                    {CATEGORY_CONFIG.filter(c => c.key !== 'ALL').map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                    Tên Sản Phẩm Thiết Bị <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input required type="text" className="form-input" placeholder="Ví dụ: iPhone 15 Pro Max 256GB" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                </div>

                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                    Mã SKU Quản Lý <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input required type="text" className="form-input" placeholder="Ví dụ: APP-IP15PM-256" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value.toUpperCase()})} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                      Đơn Giá Niêm Yết (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input required type="number" min="0" className="form-input" placeholder="Ví dụ: 34990000" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        Số Lượng Tồn Ban Đầu
                      </label>
                      <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                        🔒 Tồn = 0
                      </span>
                    </div>
                    <input
                      type="number"
                      disabled
                      className="form-input"
                      value={0}
                      style={{ background: 'var(--bg-primary, #f1f5f9)', cursor: 'not-allowed', color: 'var(--text-secondary)', fontWeight: 700 }}
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(99, 102, 241, 0.06)', padding: '0.75rem 1rem', borderRadius: 10, border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  ℹ️ <strong>Lưu ý nghiệp vụ:</strong> Sản phẩm mới khai báo có số lượng tồn kho ban đầu là <strong>0</strong>. Tồn kho sẽ được ghi nhận và sinh biên bản kiểm toán tự động khi tiếp nhận hàng từ <strong>Đơn Mua Hàng (Procurement Service - CỬA 01)</strong>.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Đơn Vị Tính</label>
                    <select className="form-input" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})}>
                      <option value="Bộ">Bộ</option>
                      <option value="Cái">Cái</option>
                      <option value="Chiếc">Chiếc</option>
                      <option value="Hộp">Hộp</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Ngưỡng Báo Thiếu (Min)</label>
                      <button
                        type="button"
                        onClick={handleApplySuggestedMin}
                        style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: 'var(--accent-primary)',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Tự động tính toán Min dựa vào Ngành hàng, Giá bán và Số lượng nhập"
                      >
                        <Sparkles size={12} /> Gợi ý Min tự động
                      </button>
                    </div>
                    <input type="number" min="1" className="form-input" value={newProduct.minStockLevel} onChange={e => { setNewProduct({...newProduct, minStockLevel: e.target.value}); setMinRationale(''); }} />
                    {minRationale && (
                      <span style={{ fontSize: '0.72rem', color: '#10b981', display: 'block', marginTop: '4px', lineHeight: 1.4 }}>
                        ✓ {minRationale}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Mô Tả Sản Phẩm</label>
                  <textarea className="form-input" rows="3" style={{ resize: 'none', fontFamily: 'inherit' }} placeholder="Mô tả thông số kỹ thuật..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                </div>

                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Hình Ảnh Sản Phẩm</label>
                  <input type="file" accept="image/*" className="form-input" onChange={handleFileChange} />
                </div>
              </div>

              {/* Fixed Footer */}
              <div style={{ flexShrink: 0, display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center', padding: '1rem 1.75rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary, #ffffff)' }}>
                <button type="button" className="btn btn-outline" style={{ minWidth: '90px' }} onClick={() => setShowModal(false)}>
                  Hủy Bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '150px', gap: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Save size={16} /> {submitting ? 'Đang lưu...' : 'Lưu Mã Hàng Mới'}
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

export default Inventory;
