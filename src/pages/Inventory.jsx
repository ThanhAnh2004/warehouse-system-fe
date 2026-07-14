import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Plus, Search, Image as ImageIcon, Pencil, Trash2 } from 'lucide-react';
import './Inventory.css'; // We will create this

const Inventory = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', price: '', orderingCost: '', holdingCostRate: '', image: null });

  // Edit modal state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', orderingCost: '', holdingCostRate: '' });
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/inventory/products', {
        params: { page, limit: 10, search }
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
  }, [page, search]);

  const handleFileChange = (e) => {
    setNewProduct({ ...newProduct, image: e.target.files[0] });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', newProduct.name);
    formData.append('sku', newProduct.sku);
    formData.append('price', newProduct.price);
    if (newProduct.orderingCost) formData.append('orderingCost', newProduct.orderingCost);
    if (newProduct.holdingCostRate) formData.append('holdingCostRate', newProduct.holdingCostRate);
    if (newProduct.image) {
      formData.append('image', newProduct.image);
    }

    try {
      await apiClient.post('/inventory/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false);
      setNewProduct({ name: '', sku: '', price: '', orderingCost: '', holdingCostRate: '', image: null });
      fetchProducts(); // refresh
    } catch (err) {
      console.error(err);
      alert('Failed to add product');
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      price: product.price,
      orderingCost: product.orderingCost ?? '',
      holdingCostRate: product.holdingCostRate ?? '',
    });
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch(`/inventory/products/${editingProduct.sku}`, {
        name: editForm.name,
        price: Number(editForm.price),
        orderingCost: editForm.orderingCost ? Number(editForm.orderingCost) : undefined,
        holdingCostRate: editForm.holdingCostRate ? Number(editForm.holdingCostRate) : undefined,
      });
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to update product: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete product "${product.name}" (${product.sku})? This cannot be undone.`)) {
      return;
    }
    try {
      await apiClient.delete(`/inventory/products/${product.sku}`);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to delete product: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="inventory-page animate-slide-up">
      <div className="page-header">
        <h2 className="text-title">Inventory Management</h2>
        {user?.role !== 'Staff' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Add Product
          </button>
        )}
      </div>

      <div className="glass-card">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="total-count">Total: {total} products</div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>SKU</th>
                <th>Name</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
              ) : products.map(p => (
                <tr key={p.id}>
                  <td>
                    {p.imageUrl ? 
                      <img src={p.imageUrl} alt={p.name} className="product-img" /> : 
                      <div className="product-img-placeholder"><ImageIcon size={20} /></div>
                    }
                  </td>
                  <td><strong>{p.sku}</strong></td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ fontWeight: 700 }}><span className="text-gradient">{Number(p.price).toLocaleString()} VND</span></td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-icon"
                      onClick={() => window.location.href = `/inventory/${p.sku}`}
                      title="View Details"
                    >
                      <Plus style={{ transform: 'rotate(45deg)' }} size={18} />
                    </button>
                    {user?.role !== 'Staff' && (
                      <>
                        <button
                          className="btn btn-icon"
                          onClick={() => openEditModal(p)}
                          title="Edit Product"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          className="btn btn-icon"
                          onClick={() => handleDeleteProduct(p)}
                          title="Delete Product"
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-up">
            <h3 className="text-title" style={{ fontSize: '1.5rem' }}>Add New Product</h3>
            <form onSubmit={handleAddProduct} style={{ marginTop: '1.5rem' }}>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Product Name</label>
                <input required type="text" className="form-input" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>SKU</label>
                <input required type="text" className="form-input" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} />
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Price</label>
                <input required type="number" className="form-input" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group mb-4" style={{ flex: 1 }}>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Ordering Cost (S, VND) <span style={{ fontWeight: 'normal' }}>- optional, default 50,000</span></label>
                  <input type="number" className="form-input" value={newProduct.orderingCost} onChange={e => setNewProduct({...newProduct, orderingCost: e.target.value})} />
                </div>
                <div className="form-group mb-4" style={{ flex: 1 }}>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Holding Cost Rate (H) <span style={{ fontWeight: 'normal' }}>- optional, default 0.2 (20%/yr)</span></label>
                  <input type="number" step="0.01" className="form-input" value={newProduct.holdingCostRate} onChange={e => setNewProduct({...newProduct, holdingCostRate: e.target.value})} />
                </div>
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Image</label>
                <input type="file" accept="image/*" className="form-input" onChange={handleFileChange} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-up">
            <h3 className="text-title" style={{ fontSize: '1.5rem' }}>Edit Product</h3>
            <form onSubmit={handleUpdateProduct} style={{ marginTop: '1.5rem' }}>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>SKU</label>
                <input disabled type="text" className="form-input" value={editingProduct.sku} style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Product Name</label>
                <input required type="text" className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Price</label>
                <input required type="number" className="form-input" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group mb-4" style={{ flex: 1 }}>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Ordering Cost (S, VND)</label>
                  <input type="number" className="form-input" placeholder="Default 50,000" value={editForm.orderingCost} onChange={e => setEditForm({ ...editForm, orderingCost: e.target.value })} />
                </div>
                <div className="form-group mb-4" style={{ flex: 1 }}>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Holding Cost Rate (H)</label>
                  <input type="number" step="0.01" className="form-input" placeholder="Default 0.2" value={editForm.holdingCostRate} onChange={e => setEditForm({ ...editForm, holdingCostRate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => setEditingProduct(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
