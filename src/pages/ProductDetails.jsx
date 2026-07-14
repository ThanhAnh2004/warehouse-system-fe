import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, TrendingUp, PackageSearch } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ProductDetails = () => {
  const { sku } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [stock, setStock] = useState(0);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', price: '', description: '', image: null });

  const fetchDetails = async () => {
    try {
      setLoading(true);
      // 1. Fetch Product by SKU
      const prodRes = await apiClient.get(`/inventory/products/${sku}`);
      const prodData = prodRes.data;
      setProduct(prodData);

      if (prodData && prodData.id) {
        // 2. Fetch Stock
        const stockRes = await apiClient.get(`/inventory/stock/${prodData.id}`);
        const totalStock = Array.isArray(stockRes.data) 
          ? stockRes.data.reduce((sum, item) => sum + (item.currentQuantity || 0), 0) 
          : 0;
        setStock(totalStock);

        // 3. Fetch Forecast only if not Staff
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
      description: product.description || '', 
      quantity: stock,
      image: null 
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      if (editForm.image) {
        const formData = new FormData();
        formData.append('name', editForm.name);
        formData.append('price', editForm.price);
        formData.append('description', editForm.description);
        formData.append('quantity', editForm.quantity);
        formData.append('image', editForm.image);

        await apiClient.patch(`/inventory/products/${sku}`, formData);
      } else {
        await apiClient.patch(`/inventory/products/${sku}`, {
          name: editForm.name,
          price: Number(editForm.price),
          description: editForm.description,
          quantity: Number(editForm.quantity)
        });
      }
      fetchDetails();
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert('Failed to update product');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await apiClient.delete(`/inventory/products/${sku}`);
        navigate('/inventory');
      } catch (e) {
        console.error(e);
        alert('Failed to delete product');
      }
    }
  };

  if (loading) return <div className="page-container animate-fade-in">Loading product details...</div>;
  if (!product) return <div className="page-container animate-fade-in">Product not found.</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-outline" onClick={() => navigate('/inventory')} style={{ padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </button>
        <h2>Product Details: {product.name}</h2>
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
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Product Name</label>
                  <input 
                    required 
                    type="text" 
                    className="form-input" 
                    value={editForm.name} 
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Price</label>
                  <input 
                    required 
                    type="number" 
                    className="form-input" 
                    value={editForm.price} 
                    onChange={e => setEditForm({ ...editForm, price: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Description</label>
                  <textarea 
                    className="form-input" 
                    rows="3" 
                    style={{ resize: 'none' }}
                    value={editForm.description} 
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Stock Quantity</label>
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
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Product Image</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="form-input" 
                    onChange={e => setEditForm({ ...editForm, image: e.target.files[0] })} 
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                </div>
              </form>
            ) : (
              <>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{product.name}</h3>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>SKU: {product.sku}</div>

                {product.description && (
                  <div style={{ marginBottom: '1.5rem', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    <strong>Description:</strong><br />
                    {product.description}
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Price</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{Number(product.price).toLocaleString()} VND</strong>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Stock</span>
                  <strong style={{ fontSize: '1.2rem', color: stock < 20 ? 'var(--danger)' : 'var(--success)' }}>{stock}</strong>
                </div>

                {user?.role !== 'Staff' && (
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button 
                      className="btn" 
                      onClick={startEditing} 
                      style={{ flex: 1, backgroundColor: '#2563eb', color: '#ffffff', border: 'none', fontWeight: 600 }}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn" 
                      onClick={handleDelete} 
                      style={{ flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: AI Forecast Chart */}
        {user?.role !== 'Staff' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <TrendingUp size={24} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.25rem' }}>AI Demand Forecast (7 Days)</h3>
            </div>
            
            {forecast.length > 0 ? (
              <div style={{ width: '100%', height: '350px' }}>
                <ResponsiveContainer>
                  <LineChart data={forecast} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="date" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                      itemStyle={{ color: 'var(--accent-primary)' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="predicted_demand" stroke="var(--accent-primary)" strokeWidth={3} activeDot={{ r: 8 }} name="Predicted Demand" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                <p>Not enough transaction data to generate AI forecast yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
