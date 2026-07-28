import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Plus, Search, Image as ImageIcon, Tag, Filter, X, Save, Eye } from 'lucide-react';
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
  const { user } = useContext(AuthContext);
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
    unit: 'Chiếc',
    image: null
  });

  // Lock body scroll when modal is active
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
    formData.append('quantity', newProduct.quantity);
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
      setNewProduct({ name: '', sku: '', price: '', quantity: 0, category: 'Điện thoại & Tablet', unit: 'Chiếc', description: '', minStockLevel: 20, image: null });
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
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="text-title" style={{ marginBottom: 0 }}>Quản Lý Tồn Kho (Inventory)</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={18} /> Thêm Sản Phẩm Mới
        </button>
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
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '650px',
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
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={22} color="var(--accent-primary)" />
                <h3 className="text-subtitle" style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                  Thêm Sản Phẩm Mới Chi Nhánh Điện Máy
                </h3>
              </div>
              <button
                className="btn"
                style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Loại / Danh Mục Sản Phẩm</label>
                <select className="form-input" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                  {CATEGORY_CONFIG.filter(c => c.key !== 'ALL').map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Tên Sản Phẩm</label>
                <input required type="text" className="form-input" placeholder="Ví dụ: iPhone 15 Pro Max 256GB" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Mã SKU</label>
                <input required type="text" className="form-input" placeholder="Ví dụ: APP-IP15PM-256" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Đơn Giá (VNĐ)</label>
                  <input required type="number" className="form-input" placeholder="Ví dụ: 34990000" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Số Lượng Tồn Kho</label>
                  <input required type="number" className="form-input" placeholder="Ví dụ: 50" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Đơn Vị Tính</label>
                  <select className="form-input" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})}>
                    <option value="Chiếc">Chiếc</option>
                    <option value="Bộ">Bộ</option>
                    <option value="Cái">Cái</option>
                    <option value="Hộp">Hộp</option>
                  </select>
                </div>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Ngưỡng Báo Thiếu (Min)</label>
                  <input type="number" className="form-input" value={newProduct.minStockLevel} onChange={e => setNewProduct({...newProduct, minStockLevel: e.target.value})} />
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

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-outline" style={{ minWidth: '90px' }} onClick={() => setShowModal(false)}>Hủy Bỏ</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '130px', gap: '6px' }}>
                  <Save size={16} /> {submitting ? 'Đang lưu...' : 'Lưu Sản Phẩm'}
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
