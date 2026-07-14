import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Plus, Users, Search, Edit, Trash2 } from 'lucide-react';

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullname: '',
    role: 'Staff',
    address: '',
    phone: '',
    gender: 'Male'
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    setNewUser({
      email: '', password: '', fullname: '', role: 'Staff', address: '', phone: '', gender: 'Male'
    });
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setIsEditMode(true);
    setEditingUserId(u._id);
    setNewUser({
      email: u.email,
      password: '',
      fullname: u.fullname,
      role: u.role,
      address: u.address || '',
      phone: u.phone || '',
      gender: u.gender || 'Male'
    });
    setShowModal(true);
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await apiClient.delete(`/users/${id}`);
        fetchUsers();
      } catch (err) {
        alert('Error deleting user: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        // Send only fields allowed by UpdateUserDto
        const payload = {
          fullname: newUser.fullname,
          role: newUser.role,
          address: newUser.address,
          phone: newUser.phone,
          gender: newUser.gender
        };
        await apiClient.patch(`/users/${editingUserId}`, payload);
      } else {
        await apiClient.post('/auth/register', newUser);
      }
      setShowModal(false);
      setNewUser({
        email: '', password: '', fullname: '', role: 'Staff', address: '', phone: '', gender: 'Male'
      });
      fetchUsers();
    } catch (err) {
      alert(`Error ${isEditMode ? 'updating' : 'creating'} user: ` + (err.response?.data?.message || err.message));
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.fullname?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h2 className="text-title">User Management</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Add User
        </button>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', marginBottom: '1.5rem', paddingBottom: '1rem' }}>
          <div className="search-box">
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Search by email or name..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Fullname</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</td></tr>
              ) : filteredUsers.map(u => (
                <tr key={u._id}>
                  <td><strong>{u.email}</strong></td>
                  <td style={{ fontWeight: 600 }}>{u.fullname}</td>
                  <td>
                    <span className={`badge ${u.role === 'Admin' ? 'badge-danger' : (u.role === 'Manager' ? 'badge-primary' : 'badge-success')}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.phone || 'N/A'}</td>
                  <td>{u.gender || 'N/A'}</td>
                  <td>{u.address || 'N/A'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.5rem', background: 'transparent' }}
                        onClick={() => openEditModal(u)}
                        title="Edit User"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.25rem 0.5rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}
                        onClick={() => handleDeleteUser(u._id)}
                        title="Delete User"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-title" style={{ fontSize: '1.5rem' }}>{isEditMode ? 'Edit User' : 'Add New User'}</h3>
            <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Email</label>
                <input required type="email" disabled={isEditMode} className="form-input" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              </div>
              {!isEditMode && (
                <div className="form-group mb-4">
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Password</label>
                  <input required type="password" className="form-input" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                </div>
              )}
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Full Name</label>
                <input required type="text" className="form-input" value={newUser.fullname} onChange={e => setNewUser({...newUser, fullname: e.target.value})} />
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Role</label>
                <select className="form-input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group mb-4" style={{ flex: 1 }}>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Phone</label>
                  <input 
                    required 
                    type="text" 
                    pattern="[0-9]{10,11}" 
                    title="Phone number must be between 10 and 11 digits"
                    className="form-input" 
                    value={newUser.phone} 
                    onChange={e => setNewUser({...newUser, phone: e.target.value})} 
                  />
                </div>
                <div className="form-group mb-4" style={{ flex: 1 }}>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Gender</label>
                  <select required className="form-input" value={newUser.gender} onChange={e => setNewUser({...newUser, gender: e.target.value})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Address</label>
                <input required type="text" className="form-input" value={newUser.address} onChange={e => setNewUser({...newUser, address: e.target.value})} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditMode ? 'Save Changes' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
