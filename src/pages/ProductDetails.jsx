import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, TrendingUp, PackageSearch, Tag } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import EoqCard from '../components/EoqCard';

const CATEGORIES = [
  'Điện thoại & Tablet',
  'Laptop & Máy tính',
  'Tivi & Thiết bị giải trí',
  'Tủ lạnh & Điện lạnh',
  'Máy giặt & Gia dụng lớn',
  'Phụ kiện & Thiết bị đeo',
  'Linh kiện & Bán dẫn'
];

const ProductDetails = () => {
  const { sku } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [stock, setStock] = useState(0);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    category: 'Điện thoại & Tablet',
    description: '',
    quantity: 0,
    minStockLevel: 20,
    image: null
  });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const prodRes = await apiClient.get(`/inventory/products/${sku}`);
      const prodData = prodRes.data;
      setProduct(prodData);

      if (prodData && prodData.id) {
        const stockRes = await apiClient.get(`/inventory/stock/${prodData.id}`);
        const totalStock = Array.isArray(stockRes.data) 
          ? stockRes.data.reduce((sum, item) => sum + (item.currentQuantity || 0), 0) 
          : 0;
        setStock(totalStock);

        if (user?.role !== 'Staff') {
          try {
            const forecastRes = await apiClient.get(`/inventory/forecast/${prodData.id}`);
            if (forecastRes.data && forecastRes.data.forecast) {
              setForecast(forecastRes.data.forecast);
            }
          } catch (e) {
            console.warn("Forecast not available yet or not enough data.");
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [sku, user]);

  const startEditing = () => {
    setEditForm({ 
      name: product.name, 
      price: Number(product.price), 
      category: product.category || 'Điện thoại & Tablet',
      description: product.description || '', 
      quantity: stock,
      minStockLevel: product.minStockLevel || 20,
      image: null 
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: editForm.name,
        price: Number(editForm.price),
        category: editForm.category,
        description: editForm.description,
        quantity: Number(editForm.quantity),
        minStockLevel: Number(editForm.minStockLevel)
      };

      if (editForm.image) {
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
          if (payload[key] !== null && payload[key] !== undefined) {
            formData.append(key, payload[key]);
          }
        });
        formData.append('image', editForm.image);

        await apiClient.patch(`/inventory/products/${sku}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await apiClient.patch(`/inventory/products/${sku}`, payload);
      }
      fetchDetails();
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert('Cập nhật sản phẩm thất bại!');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      try {
        await apiClient.delete(`/inventory/products/${sku}`);
        navigate('/inventory');
      } catch (e) {
        console.error(e);
        alert('Xóa sản phẩm thất bại!');
      }
    }
  };

  if (loading) return <div className="page-container animate-fade-in">Đang tải chi tiết sản phẩm...</div>;
  if (!product) return <div className="page-container animate-fade-in">Không tìm thấy sản phẩm.</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-outline" onClick={() => navigate('/inventory')} style={{ padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </button>
        <h2>Chi Tiết Sản Phẩm: {product.name}</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: user?.role !== 'Staff' ? '1fr 2fr' : '1fr', gap: '2rem' }}>
        {/* Left Column: Product Info */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: user?.role === 'Staff' ? '600px' : 'none' }}>
          <div style={{ textAlign: 'center' }}>
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} style={{ width: '100%', maxWidth: '200px', borderRadius: '12px', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '200px', backgroundColor: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                <PackageSearch size={48} />
              </div>
            )}
          </div>
          <div>
            {isEditing ? (
              <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Loại / Danh Mục Sản Phẩm</label>
                  <select className="form-input" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Tên Sản Phẩm</label>
                  <input 
                    required 
                    type="text" 
                    className="form-input" 
                    value={editForm.name} 
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Đơn Giá (VNĐ)</label>
                  <input 
                    required 
                    type="number" 
                    className="form-input" 
                    value={editForm.price} 
                    onChange={e => setEditForm({ ...editForm, price: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Mô Tả Sản Phẩm</label>
                  <textarea 
                    className="form-input" 
                    rows="3" 
                    style={{ resize: 'none' }}
                    value={editForm.description} 
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Số Lượng Tồn Kho</label>
                  <input 
                    required 
                    type="number" 
                    min="0"
                    className="form-input" 
                    value={editForm.quantity} 
                    onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Ngưỡng Báo Thiếu (Min)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editForm.minStockLevel} 
                    onChange={e => setEditForm({ ...editForm, minStockLevel: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Thay Đổi Ảnh Sản Phẩm</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="form-input" 
                    onChange={e => setEditForm({ ...editForm, image: e.target.files[0] })} 
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Lưu Thay Đổi</button>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Hủy</button>
                </div>
              </form>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="badge badge-primary" style={{ fontWeight: 700, padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
                    🏷️ {product.category || 'Chưa phân loại'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{product.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Mã SKU: <strong>{product.sku}</strong></p>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: '1.5rem' }}>
                  {Number(product.price).toLocaleString('vi-VN')} VNĐ
                </div>
                
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Thông tin Kho:</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Số lượng tồn kho:</span>
                    {(() => {
                      const isLow = stock < (product.minStockLevel || 20);
                      const color = isLow ? 'var(--danger)' : 'var(--text-primary)';
                      return (
                        <span style={{ fontWeight: 700, color }}>
                          {stock} {product.unit || 'món'}
                          {isLow && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 600 }}>
                              Thiếu hàng
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ngưỡng báo thiếu (Min):</span>
                    <strong>{product.minStockLevel || 20} món</strong>
                  </div>
                </div>

                {product.description && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Mô tả sản phẩm:</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>{product.description}</p>
                  </div>
                )}

                {user?.role !== 'Staff' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={startEditing}>Chỉnh Sửa</button>
                    <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDelete}>Xóa</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Analytics & Forecast */}
        {user?.role !== 'Staff' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <EoqCard product={product} forecast={forecast} />

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <TrendingUp size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Dự Báo Nhu Cầu Tồn Kho (AI Demand Forecast)</h3>
              </div>

              {forecast && forecast.length > 0 ? (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart data={forecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="date" stroke="var(--text-secondary)" />
                      <YAxis stroke="var(--text-secondary)" />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                      <Legend />
                      <Line type="monotone" dataKey="predictedQuantity" name="Số lượng dự báo (Sản phẩm/Ngày)" stroke="var(--accent-primary)" strokeWidth={3} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Chưa có đủ dữ liệu lịch sử giao dịch để chạy mô hình AI dự báo nhu cầu.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
