import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Shield, Save, Lock, CheckCircle2, AlertTriangle, Key, Plus, Trash2, Users, Edit } from 'lucide-react';
import './RoleManagement.css';

const RoleManagement = () => {
  const { user } = useContext(AuthContext);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('permissions');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [editingRole, setEditingRole] = useState(null);
  const [editRoleDesc, setEditRoleDesc] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get('/users/roles'),
        apiClient.get('/users/permissions')
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
      
      // Default select the first role
      if (rolesRes.data.length > 0) {
        setSelectedRole(rolesRes.data[0]);
        setSelectedPermissions(rolesRes.data[0].permissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles and permissions', err);
      setMessage({ type: 'error', text: 'Failed to load roles and permissions data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions || []);
    setMessage({ type: '', text: '' });
  };

  const handlePermissionToggle = (key) => {
    if (selectedRole?.name === 'Admin') return; // Admin has permanent full access

    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter(k => k !== key));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    if (selectedRole.name === 'Admin') {
      alert('Cannot modify permissions for System Administrator (Admin).');
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      await apiClient.patch(`/users/roles/${selectedRole.name}`, {
        permissions: selectedPermissions
      });
      
      // Update local roles state
      setRoles(roles.map(r => r.name === selectedRole.name ? { ...r, permissions: selectedPermissions } : r));
      setMessage({ type: 'success', text: `Permissions for role ${selectedRole.name} updated successfully!` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'An error occurred while saving permissions.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    const namePattern = /^[a-zA-Z0-9_]+$/;
    if (!newRoleName.trim()) {
      alert('Role name cannot be empty.');
      return;
    }
    if (!namePattern.test(newRoleName)) {
      alert('Role name must only contain alphanumeric characters and underscores (no spaces or special chars).');
      return;
    }
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const res = await apiClient.post('/users/roles', {
        name: newRoleName.trim(),
        description: newRoleDesc.trim()
      });
      if (res.data) {
        const newlyCreatedRole = res.data;
        setRoles([...roles, newlyCreatedRole]);
        setNewRoleName('');
        setNewRoleDesc('');
        setMessage({ type: 'success', text: `Role "${newlyCreatedRole.name}" created successfully!` });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'An error occurred while creating the new role.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (name) => {
    const protectedRoles = ['Admin', 'Manager', 'Staff'];
    if (protectedRoles.includes(name)) {
      alert('Cannot delete default system roles.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete the role "${name}"? This action cannot be undone.`)) {
      try {
        setMessage({ type: '', text: '' });
        await apiClient.delete(`/users/roles/${name}`);
        const remaining = roles.filter(r => r.name !== name);
        setRoles(remaining);
        if (selectedRole?.name === name) {
          if (remaining.length > 0) {
            setSelectedRole(remaining[0]);
            setSelectedPermissions(remaining[0].permissions || []);
          } else {
            setSelectedRole(null);
            setSelectedPermissions([]);
          }
        }
        setMessage({ type: 'success', text: `Role "${name}" deleted successfully!` });
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete role.' });
      }
    }
  };

  const handleUpdateRoleDesc = async (e) => {
    e.preventDefault();
    if (!editingRole) return;
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const res = await apiClient.patch(`/users/roles/${editingRole.name}`, {
        description: editRoleDesc.trim()
      });
      if (res.data) {
        setRoles(roles.map(r => r.name === editingRole.name ? { ...r, description: editRoleDesc.trim() } : r));
        setEditingRole(null);
        setEditRoleDesc('');
        setMessage({ type: 'success', text: `Role "${editingRole.name}" description updated successfully!` });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update role description.' });
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by category for a cleaner UI layout
  const getGroupedPermissions = () => {
    const groups = {};
    permissions.forEach(p => {
      const category = p.key.split(':')[0] || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(p);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading configuration data...</p>
      </div>
    );
  }

  const groupedPermissions = getGroupedPermissions();
  const isAdminRole = selectedRole?.name === 'Admin';

  return (
    <div className="role-management-container">
      <div className="page-header">
        <div>
          <h2 className="text-title">Access Control Configuration</h2>
          <p className="text-subtitle">Manage and dynamically assign permissions to user roles</p>
        </div>
        <Shield size={36} className="header-icon" />
      </div>

      {/* Tabs navigation */}
      <div className="tabs-header" style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginTop: '1.5rem' }}>
        <button
          className={`btn ${activeTab === 'permissions' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('permissions')}
          style={{ borderRadius: '20px', padding: '0.4rem 1.2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Shield size={16} />
          Permissions Matrix
        </button>
        <button
          className={`btn ${activeTab === 'roles' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('roles')}
          style={{ borderRadius: '20px', padding: '0.4rem 1.2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Users size={16} />
          Roles List
        </button>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`} style={{ marginTop: '1rem' }}>
          {message.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {activeTab === 'permissions' ? (
        <div className="role-management-grid">
          {/* Left Side: Role Selector */}
          <div className="glass-card role-selector-card">
            <h3 className="card-title">System Roles</h3>
            <div className="role-list">
              {roles.map((role) => (
                <button
                  key={role.name}
                  className={`role-btn ${selectedRole?.name === role.name ? 'active' : ''}`}
                  onClick={() => handleRoleChange(role)}
                >
                  <div className="role-btn-info">
                    <span className="role-name">{role.name}</span>
                    <span className="role-desc">{role.description || 'No description'}</span>
                  </div>
                  <div className="role-badge">
                    {(role.permissions || []).length} perms
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Permissions Matrix */}
          <div className="glass-card permissions-matrix-card">
            <div className="matrix-header">
              <div>
                <h3 className="card-title">Detailed Permissions - {selectedRole?.name}</h3>
                <p className="card-subtitle">
                  {isAdminRole 
                    ? 'The Admin role has full system privileges and cannot be modified.'
                    : `Select functions permitted for the ${selectedRole?.name} role`}
                </p>
              </div>
              {!isAdminRole && (
                <button 
                  className="btn btn-primary btn-save" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              )}
            </div>

            <div className="permissions-groups">
              {Object.keys(groupedPermissions).map((groupName) => (
                <div key={groupName} className="permission-group-section">
                  <h4 className="group-category-title">
                    <Key size={16} />
                    <span>{groupName.toUpperCase()} Management</span>
                  </h4>
                  <div className="permission-items-grid">
                    {groupedPermissions[groupName].map((perm) => {
                      const isChecked = isAdminRole || selectedPermissions.includes(perm.key);
                      return (
                        <div 
                          key={perm.key} 
                          className={`permission-item-card ${isChecked ? 'selected' : ''} ${isAdminRole ? 'disabled' : ''}`}
                          onClick={() => handlePermissionToggle(perm.key)}
                        >
                          <div className="perm-checkbox-wrapper">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              disabled={isAdminRole}
                              onChange={() => {}} // Controlled by div onClick
                            />
                          </div>
                          <div className="perm-details">
                            <span className="perm-name">{perm.name}</span>
                            <span className="perm-key">`{perm.key}`</span>
                            <span className="perm-desc">{perm.description}</span>
                          </div>
                          {isAdminRole && <Lock size={14} className="lock-icon" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="role-management-grid" style={{ gridTemplateColumns: '350px 1fr', marginTop: '1.5rem' }}>
          {/* Left Card: Add Role Form */}
          <div className="glass-card role-selector-card" style={{ padding: '1.5rem', height: 'fit-content' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
              <Plus size={18} color="var(--accent-primary)" />
              Create New Role
            </h3>
            <form onSubmit={handleCreateRole} style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Role Name (no spaces, no accents)</label>
                <input
                  required
                  type="text"
                  className="form-input"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="e.g. Accountant"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                />
              </div>
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Role Description</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="e.g. Accountant managing invoices and stock"
                  style={{ resize: 'none', width: '100%', padding: '0.6rem 0.8rem' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.6rem' }} disabled={saving}>
                {saving ? 'Creating...' : 'Create Role'}
              </button>
            </form>
          </div>

          {/* Right Card: Roles List Table */}
          <div className="glass-card permissions-matrix-card" style={{ padding: '1.5rem', minHeight: 'fit-content' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', marginBottom: '1.25rem' }}>
              <Users size={18} color="var(--accent-primary)" />
              Current Roles
            </h3>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', width: '45px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Role Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Description</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Permissions</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, idx) => {
                    const isSystemRole = ['Admin', 'Manager', 'Staff'].includes(role.name);
                    return (
                      <tr key={role.name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                        <td style={{ padding: '1rem' }}>
                          <strong style={{ 
                            color: role.name === 'Admin' ? '#ef4444' : (role.name === 'Manager' ? 'var(--accent-primary)' : 'var(--text-primary)') 
                          }}>
                            {role.name}
                          </strong>
                          {isSystemRole && (
                            <span style={{ 
                              marginLeft: '0.5rem', 
                              fontSize: '0.65rem', 
                              padding: '0.1rem 0.3rem', 
                              borderRadius: '4px', 
                              background: 'rgba(255,255,255,0.15)', 
                              color: 'var(--text-secondary)',
                              fontWeight: 600
                            }}>
                              Default
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {role.description || 'No description'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className="role-badge" style={{ display: 'inline-block' }}>
                            {(role.permissions || []).length} perms
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              className="btn btn-outline"
                              style={{ 
                                padding: '0.35rem 0.65rem', 
                                borderColor: 'var(--accent-primary)', 
                                color: 'var(--accent-primary)', 
                                background: 'transparent',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                setEditingRole(role);
                                setEditRoleDesc(role.description || '');
                              }}
                              title="Edit Role Description"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="btn btn-outline"
                              style={{ 
                                padding: '0.35rem 0.65rem', 
                                borderColor: isSystemRole ? 'var(--border-color)' : 'var(--danger)', 
                                color: isSystemRole ? 'var(--text-secondary)' : 'var(--danger)', 
                                background: 'transparent',
                                cursor: isSystemRole ? 'not-allowed' : 'pointer',
                                opacity: isSystemRole ? 0.35 : 1
                              }}
                              onClick={() => handleDeleteRole(role.name)}
                              disabled={isSystemRole}
                              title={isSystemRole ? "Cannot delete default system roles" : "Delete Role"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 className="text-title" style={{ fontSize: '1.25rem' }}>Edit Role Description: {editingRole.name}</h3>
            <form onSubmit={handleUpdateRoleDesc} style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Description</label>
                <textarea
                  required
                  className="form-input"
                  rows="3"
                  value={editRoleDesc}
                  onChange={e => setEditRoleDesc(e.target.value)}
                  style={{ resize: 'none', width: '100%', padding: '0.6rem 0.8rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => setEditingRole(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
