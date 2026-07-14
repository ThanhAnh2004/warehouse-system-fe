import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Plus, Search, Image as ImageIcon } from 'lucide-react';
import './Inventory.css'; // We will create this

const Inventory = () => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [loading, setLoading] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', sku: '', price: '', quantity: 0, description: '', image: null });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/inventory/products', {
        params: { page, limit: 10, search, sortBy, sortOrder }
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
  }, [page, search, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('ASC');
    }
    setPage(1); // Reset page on sort
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
    formData.append('description', newProduct.description);
    if (newProduct.image) {
      formData.append('image', newProduct.image);
    }

    try {
      await apiClient.post('/inventory/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowModal(false);
      setNewProduct({ name: '', sku: '', price: '', quantity: 0, description: '', image: null });
      fetchProducts(); // refresh
    } catch (err) {
      console.error(err);
      alert('Failed to add product');
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
                <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  SKU {sortBy === 'sku' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Name {sortBy === 'name' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
                 <th onClick={() => handleSort('price')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Price {sortBy === 'price' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Quantity {sortBy === 'quantity' ? (sortOrder === 'ASC' ? '▲' : '▼') : ''}
                </th>
                <th>View Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
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
                  <td>
                    <span style={{ fontWeight: 700, color: (p.quantity ?? 0) < 20 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {p.quantity ?? 0}
                    </span>
                    {(p.quantity ?? 0) < 20 && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 600 }}>
                        Low Stock
                      </span>
                    )}
                  </td>
                  <td>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => window.location.href = `/inventory/${p.sku}`}
                      style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
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
                Previous
              </button>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Page <strong>{page}</strong> of <strong>{Math.ceil(total / 10)}</strong>
              </span>
              <button 
                className="btn btn-outline" 
                disabled={page === Math.ceil(total / 10)} 
                onClick={() => setPage(page + 1)}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                Next
              </button>
            </div>
          )}
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
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Initial Stock</label>
                <input required type="number" className="form-input" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} />
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Description</label>
                <textarea className="form-input" rows="3" style={{ resize: 'none' }} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
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
    </div>
  );
};

export default Inventory;
