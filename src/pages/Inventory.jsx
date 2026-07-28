import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Plus, Search, Image as ImageIcon, Tag, Filter } from 'lucide-react';
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

const Inventory = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [loading, setLoading] = useState(false);
  
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
      await apiClient.post('/inventory/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false);
      setNewProduct({ name: '', sku: '', price: '', quantity: 0, category: 'Điện thoại & Tablet', unit: 'Chiếc', description: '', minStockLevel: 20, image: null });
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Thêm sản phẩm thất bại!');
    }
  };

  const getCategoryMeta = (catName) => {
    return CATEGORY_CONFIG.find(c => c.key === catName) || { label: catName || 'Khác', color: 'var(--accent-primary)', bg: 'rgba(99, 102, 241, 0.12)' };
  };

  return (
    <div className="inventory-page animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div className="page-header">
        <div>
          <h2 className="text-title" style={{ margin: 0 }}>Quản Lý Tồn Kho Siêu Thị Điện Máy</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Hệ thống phân loại & sắp xếp danh mục mặt hàng chuẩn Thế Giới Di Động / Điện Máy Xanh.
          </p>
        </div>

        {user?.role !== 'Staff' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Thêm Sản Phẩm Mới
          </button>
        )}
      </div>

      {/* Category Pills Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {CATEGORY_CONFIG.map(cat => (
          <button
            key={cat.key}
            className={`btn ${selectedCategory === cat.key ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setSelectedCategory(cat.key); setPage(1); }}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.82rem',
              borderLeft: selectedCategory !== cat.key ? `3px solid ${cat.color}` : 'none'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="glass-card">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Tìm kiếm sản phẩm theo tên, SKU..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="total-count">Tổng số: <b>{total}</b> sản phẩm</div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                <th>Hình Ảnh</th>
                <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Mã SKU {sortBy === 'sku' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Tên Sản Phẩm {sortBy === 'name' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
                <th>Phân Loại / Danh Mục</th>
                <th onClick={() => handleSort('price')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Đơn Giá {sortBy === 'price' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Số Lượng Tồn {sortBy === 'quantity' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Đang tải danh sách sản phẩm...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Không tìm thấy sản phẩm thuộc danh mục này.</td></tr>
              ) : products.map((p, index) => {
                const catMeta = getCategoryMeta(p.category);
                return (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {(page - 1) * 10 + index + 1}
                    </td>
                    <td>
                      {p.imageUrl ? 
                        <img src={p.imageUrl} alt={p.name} className="product-img" /> : 
                        <div className="product-img-placeholder"><ImageIcon size={20} /></div>
                      }
                    </td>
                    <td><strong>{p.sku}</strong></td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>
                      <span className="badge" style={{ background: catMeta.bg, color: catMeta.color, fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '12px', fontSize: '0.78rem' }}>
                        {catMeta.label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}><span className="text-gradient">{Number(p.price).toLocaleString('vi-VN')} VNĐ</span></td>
                    <td>
                      {(() => {
                        const qty = p.quantity ?? 0;
                        const isLow = qty < (p.minStockLevel || 20);
                        const color = isLow ? 'var(--danger)' : 'var(--text-primary)';
                        return (
                          <>
                            <span style={{ fontWeight: 700, color }}>{qty} {p.unit || 'món'}</span>
                            {isLow && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 600 }}>
                                Thiếu hàng
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td>
                      <button 
                        className="btn btn-outline" 
                        onClick={() => window.location.href = `/inventory/${p.sku}`}
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                      >
                        Xem Chi Tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {Math.ceil(total / 10) > 1 && (
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

      {/* Add Product Modal */}
      {showModal && ReactDOM.createPortal(
        <div 
          className="modal-backdrop" 
          onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) setShowModal(false); }}
        >
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-title" style={{ fontSize: '1.5rem' }}>Thêm Sản Phẩm Mới Chi Nhánh Điện Máy</h3>
            <form onSubmit={handleAddProduct} style={{ marginTop: '1.5rem' }}>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Loại / Danh Mục Sản Phẩm</label>
                <select className="form-input" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                  {CATEGORY_CONFIG.filter(c => c.key !== 'ALL').map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Tên Sản Phẩm</label>
                <input required type="text" className="form-input" placeholder="Ví dụ: iPhone 15 Pro Max 256GB" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Mã SKU</label>
                <input required type="text" className="form-input" placeholder="Ví dụ: APP-IP15PM-256" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="mb-4">
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Đơn Giá (VNĐ)</label>
                  <input required type="number" className="form-input" placeholder="Ví dụ: 34990000" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                </div>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Số Lượng Tồn Kho</label>
                  <input required type="number" className="form-input" placeholder="Ví dụ: 50" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="mb-4">
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Đơn Vị Tính</label>
                  <select className="form-input" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})}>
                    <option value="Chiếc">Chiếc</option>
                    <option value="Bộ">Bộ</option>
                    <option value="Cái">Cái</option>
                    <option value="Hộp">Hộp</option>
                  </select>
                </div>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Ngưỡng Báo Thiếu (Min)</label>
                  <input type="number" className="form-input" value={newProduct.minStockLevel} onChange={e => setNewProduct({...newProduct, minStockLevel: e.target.value})} />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Mô Tả Sản Phẩm</label>
                <textarea className="form-input" rows="3" style={{ resize: 'none' }} placeholder="Mô tả thông số kỹ thuật..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
              </div>

              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Hình Ảnh Sản Phẩm</label>
                <input type="file" accept="image/*" className="form-input" onChange={handleFileChange} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => setShowModal(false)}>Hủy Bỏ</button>
                <button type="submit" className="btn btn-primary">Lưu Sản Phẩm</button>
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
