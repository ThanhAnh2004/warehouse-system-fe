import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Plus, Users, Search, Edit, Trash2, Key, Eye, EyeOff } from 'lucide-react';

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Custom permissions states
  const [systemPermissions, setSystemPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isCustomPermissions, setIsCustomPermissions] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);

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

  const fetchRolesAndPermissions = async () => {
    try {
      const [permsRes, rolesRes] = await Promise.all([
        apiClient.get('/users/permissions'),
        apiClient.get('/users/roles')
      ]);
      setSystemPermissions(permsRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      console.error('Failed to fetch system permissions or roles', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRolesAndPermissions();
  }, []);

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    setIsCustomPermissions(false);
    setUserPermissions([]);
    setShowPassword(false);
    setNewUser({
      email: '', password: '', fullname: '', role: 'Staff', address: '', phone: '', gender: 'Male'
    });
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setIsEditMode(true);
    setEditingUserId(u._id);
    setShowPassword(false);
    setNewUser({
      email: u.email,
      password: '',
      fullname: u.fullname,
      role: u.role,
      address: u.address || '',
      phone: u.phone || '',
      gender: u.gender || 'Male'
    });

    const hasCustom = u.permissions !== null && u.permissions !== undefined;
    setIsCustomPermissions(hasCustom);
    
    if (hasCustom) {
      setUserPermissions(u.permissions);
    } else {
      const matchedRole = roles.find(r => r.name === u.role);
      setUserPermissions(matchedRole ? matchedRole.permissions : []);
    }
    
    setShowModal(true);
  };

  const handleRoleChange = (selectedRoleName) => {
    setNewUser({ ...newUser, role: selectedRoleName });
    if (!isCustomPermissions) {
      const matchedRole = roles.find(r => r.name === selectedRoleName);
      setUserPermissions(matchedRole ? matchedRole.permissions : []);
    }
  };

  const handleCustomPermissionsToggle = (checked) => {
    setIsCustomPermissions(checked);
    if (!checked) {
      const matchedRole = roles.find(r => r.name === newUser.role);
      setUserPermissions(matchedRole ? matchedRole.permissions : []);
    }
  };

  const handlePermissionToggle = (key) => {
    if (!isCustomPermissions) return;
    if (userPermissions.includes(key)) {
      setUserPermissions(userPermissions.filter(k => k !== key));
    } else {
      setUserPermissions([...userPermissions, key]);
    }
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
          gender: newUser.gender,
          permissions: isCustomPermissions ? userPermissions : null
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
                <th style={{ width: '45px', textAlign: 'center' }}>#</th>
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
                <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center' }}>Loading users...</td></tr>
              ) : filteredUsers.map((u, idx) => (
                <tr key={u._id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
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
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="text-title" style={{ fontSize: '1.5rem' }}>{isEditMode ? 'Edit User' : 'Add New User'}</h3>
            <form onSubmit={handleSubmit} autoComplete="off" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Dummy hidden inputs to prevent Chrome / Edge password manager aggressive autofill */}
              <input type="text" name="fake_email_prevent_autofill" style={{ display: 'none' }} tabIndex="-1" />
              <input type="password" name="fake_password_prevent_autofill" style={{ display: 'none' }} tabIndex="-1" />

              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Email</label>
                <input 
                  required 
                  type="email" 
                  name="user_email_field"
                  autoComplete="off" 
                  disabled={isEditMode} 
                  className="form-input" 
                  value={newUser.email} 
                  onChange={e => setNewUser({...newUser, email: e.target.value})} 
                />
              </div>
              {!isEditMode && (
                <div className="form-group mb-4">
                  <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      required 
                      type={showPassword ? 'text' : 'password'} 
                      name="user_password_field"
                      autoComplete="new-password"
                      className="form-input" 
                      style={{ paddingRight: '2.5rem', width: '100%' }}
                      value={newUser.password} 
                      onChange={e => setNewUser({...newUser, password: e.target.value})} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.2rem',
                        transition: 'color 0.2s'
                      }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Full Name</label>
                <input required type="text" className="form-input" value={newUser.fullname} onChange={e => setNewUser({...newUser, fullname: e.target.value})} />
              </div>
              <div className="form-group mb-4">
                <label className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'block' }}>Role</label>
                <select className="form-input" value={newUser.role} onChange={e => handleRoleChange(e.target.value)}>
                  {roles.map(r => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
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

              {/* Custom user permissions section */}
              {isEditMode && newUser.role !== 'Admin' && (
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.75rem', paddingTop: '1.25rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <label className="text-title" style={{ fontSize: '1.1rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Key size={18} color="var(--accent-primary)" />
                      Individual Permission Overrides
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                      <input 
                        type="checkbox" 
                        checked={isCustomPermissions} 
                        onChange={e => handleCustomPermissionsToggle(e.target.checked)} 
                      />
                      Customize individual permissions
                    </label>
                  </div>

                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                      gap: '0.75rem', 
                      maxHeight: '220px', 
                      overflowY: 'auto',
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      opacity: isCustomPermissions ? 1 : 0.65,
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    {systemPermissions.map(perm => {
                      const isChecked = userPermissions.includes(perm.key);
                      return (
                        <label 
                          key={perm.key} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '0.5rem', 
                            fontSize: '0.8rem', 
                            cursor: isCustomPermissions ? 'pointer' : 'not-allowed',
                            padding: '0.4rem',
                            borderRadius: '4px',
                            background: isChecked ? 'rgba(67, 24, 255, 0.05)' : 'transparent',
                            border: isChecked ? '1px solid rgba(67, 24, 255, 0.15)' : '1px solid transparent',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            disabled={!isCustomPermissions}
                            onChange={() => handlePermissionToggle(perm.key)}
                            style={{ marginTop: '0.15rem' }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{perm.name}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{perm.key}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              
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
