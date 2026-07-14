import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Plus, Users, Search, Pencil, Trash2 } from 'lucide-react';

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullname: '',
    role: 'Staff',
    address: '',
    phone: '',
    gender: 'Male'
  });

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ fullname: '', role: 'Staff', phone: '', gender: 'Male' });
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Giả sử API Gateway map /users to identity-service findAll
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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/auth/register', newUser);
      setShowModal(false);
      setNewUser({
        email: '', password: '', fullname: '', role: 'Staff', address: '', phone: '', gender: 'Male'
      });
      fetchUsers();
    } catch (err) {
      alert('Error creating user: ' + (err.response?.data?.message || err.message));
    }
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditForm({
      fullname: u.fullname || '',
      role: u.role || 'Staff',
      phone: u.phone || '',
      gender: u.gender || 'Male',
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.patch(`/users/${editingUser._id}`, editForm);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert('Error updating user: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (u.email === user?.email) {
      alert("You can't delete your own account.");
      return;
    }
    if (!window.confirm(`Delete user "${u.fullname || u.email}"? This cannot be undone.`)) {
      return;
    }
    try {
      await apiClient.delete(`/users/${u._id}`);
      fetchUsers();
    } catch (err) {
      alert('Error deleting user: ' + (err.response?.data?.message || err.message));
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
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</td></tr>
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
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-icon" onClick={() => openEditModal(u)} title="Edit User">
                      <Pencil size={18} />
                    </button>
                    <button className="btn btn-icon" onClick={() => handleDeleteUser(u)} title="Delete User" style={{ color: 'var(--danger)' }}>
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-title" style={{ fontSize: '1.5rem' }}>Add New User</h3>
            <form onSubmit={handleCreateUser} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Email</label>
                <input required type="email" className="form-input" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Password</label>
                <input required type="password" className="form-input" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
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
                  <input type="text" className="form-input" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} />
                </div>
                <div className="form-group mb-4" style={{ flex: 1 }}>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Gender</label>
                  <select className="form-input" value={newUser.gender} onChange={e => setNewUser({...newUser, gender: e.target.value})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-title" style={{ fontSize: '1.5rem' }}>Edit User</h3>
            <form onSubmit={handleUpdateUser} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Email</label>
                <input disabled type="email" className="form-input" value={editingUser.email} style={{ opacity: 0.6 }} />
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Full Name</label>
                <input required type="text" className="form-input" value={editForm.fullname} onChange={e => setEditForm({ ...editForm, fullname: e.target.value })} />
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Role</label>
                <select className="form-input" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group mb-4" style={{ flex: 1 }}>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Phone</label>
                  <input type="text" className="form-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="form-group mb-4" style={{ flex: 1 }}>
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Gender</label>
                  <select className="form-input" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => setEditingUser(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
