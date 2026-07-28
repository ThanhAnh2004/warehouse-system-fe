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
      
      if (rolesRes.data.length > 0) {
        setSelectedRole(rolesRes.data[0]);
        setSelectedPermissions(rolesRes.data[0].permissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch roles and permissions', err);
      setMessage({ type: 'error', text: 'Không thể tải dữ liệu vai trò và quyền hạn.' });
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
    if (selectedRole?.name === 'Admin') return;

    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter(k => k !== key));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    if (selectedRole.name === 'Admin') {
      alert('Không thể thay đổi quyền hạn của Quản trị viên hệ thống (Admin).');
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      await apiClient.patch(`/users/roles/${selectedRole.name}`, {
        permissions: selectedPermissions
      });
      
      setRoles(roles.map(r => r.name === selectedRole.name ? { ...r, permissions: selectedPermissions } : r));
      setMessage({ type: 'success', text: `Đã cập nhật thành công quyền hạn cho vai trò ${selectedRole.name}!` });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu quyền hạn.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    const namePattern = /^[a-zA-Z0-9_]+$/;
    if (!newRoleName.trim()) {
      alert('Tên vai trò không được để trống.');
      return;
    }
    if (!namePattern.test(newRoleName)) {
      alert('Tên vai trò chỉ được chứa chữ cái không dấu, số và dấu gạch dưới (không khoảng trắng).');
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
        setMessage({ type: 'success', text: `Tạo vai trò "${newlyCreatedRole.name}" thành công!` });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Có lỗi xảy ra khi tạo vai trò mới.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (name) => {
    const protectedRoles = ['Admin', 'Manager', 'Staff'];
    if (protectedRoles.includes(name)) {
      alert('Không thể xóa các vai trò mặc định của hệ thống.');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa vai trò "${name}"? Hành động này không thể hoàn tác.`)) {
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
        setMessage({ type: 'success', text: `Đã xóa vai trò "${name}" thành công!` });
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: err.response?.data?.message || 'Xóa vai trò thất bại.' });
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
        setMessage({ type: 'success', text: `Đã cập nhật mô tả cho vai trò "${editingRole.name}" thành công!` });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Cập nhật mô tả thất bại.' });
    } finally {
      setSaving(false);
    }
  };

  const getGroupedPermissions = () => {
    const groups = {};
    permissions.forEach(p => {
      const category = p.key.split(':')[0] || 'Phân Quyền Khác';
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
        <p>Đang tải cấu hình phân quyền...</p>
      </div>
    );
  }

  const groupedPermissions = getGroupedPermissions();
  const isAdminRole = selectedRole?.name === 'Admin';

  return (
    <div className="role-management-container animate-slide-up">
      <div className="page-header">
        <div>
          <h2 className="text-title">Cấu Hình Phân Quyền & Vai Trò (RBAC)</h2>
          <p className="text-subtitle">Quản lý và gán quyền chi tiết cho từng vai trò người dùng trong hệ thống</p>
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
          Ma Trận Phân Quyền
        </button>
        <button
          className={`btn ${activeTab === 'roles' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('roles')}
          style={{ borderRadius: '20px', padding: '0.4rem 1.2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Users size={16} />
          Danh Sách Vai Trò
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
            <h3 className="card-title">Vai Trò Hệ Thống</h3>
            <div className="role-list">
              {roles.map((role) => (
                <button
                  key={role.name}
                  className={`role-btn ${selectedRole?.name === role.name ? 'active' : ''}`}
                  onClick={() => handleRoleChange(role)}
                >
                  <div className="role-btn-info">
                    <span className="role-name">{role.name}</span>
                    <span className="role-desc">{role.description || 'Chưa có mô tả'}</span>
                  </div>
                  <div className="role-badge">
                    {(role.permissions || []).length} quyền
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Permissions Matrix */}
          <div className="glass-card permissions-matrix-card">
            <div className="matrix-header">
              <div>
                <h3 className="card-title">Chi Tiết Quyền Hạn - Vai Trò: {selectedRole?.name}</h3>
                <p className="card-subtitle">
                  {isAdminRole 
                    ? 'Vai trò Quản trị viên (Admin) có toàn bộ quyền hạn trong hệ thống và không thể thay đổi.'
                    : `Tích chọn các chức năng cho phép vai trò ${selectedRole?.name} thực hiện`}
                </p>
              </div>
              {!isAdminRole && (
                <button 
                  className="btn btn-primary btn-save" 
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save size={18} />
                  {saving ? 'Đang lưu...' : 'Lưu Phân Quyền'}
                </button>
              )}
            </div>

            <div className="permissions-groups">
              {Object.keys(groupedPermissions).map((groupName) => (
                <div key={groupName} className="permission-group-section">
                  <h4 className="group-category-title">
                    <Key size={16} />
                    <span>Quản Lý {groupName.toUpperCase()}</span>
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
                              onChange={() => {}}
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
              Thêm Vai Trò Mới
            </h3>
            <form onSubmit={handleCreateRole} style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Tên Vai Trò (không khoảng trắng, không dấu)</label>
                <input
                  required
                  type="text"
                  className="form-input"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="Ví dụ: Accountant"
                  style={{ width: '100%', padding: '0.6rem 0.8rem' }}
                />
              </div>
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Mô Tả Vai Trò</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="Ví dụ: Kế toán quản lý hóa đơn và kiểm kê kho"
                  style={{ resize: 'none', width: '100%', padding: '0.6rem 0.8rem' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.6rem' }} disabled={saving}>
                {saving ? 'Đang tạo...' : 'Tạo Vai Trò'}
              </button>
            </form>
          </div>

          {/* Right Card: Roles List Table */}
          <div className="glass-card permissions-matrix-card" style={{ padding: '1.5rem', minHeight: 'fit-content' }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem', marginBottom: '1.25rem' }}>
              <Users size={18} color="var(--accent-primary)" />
              Danh Sách Vai Trò Hiện Có
            </h3>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem', width: '45px', textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Tên Vai Trò</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Mô Tả</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Số Quyền</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Thao Tác</th>
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
                              Mặc định
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {role.description || 'Chưa có mô tả'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className="role-badge" style={{ display: 'inline-block' }}>
                            {(role.permissions || []).length} quyền
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
                              title="Sửa mô tả vai trò"
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
                              title={isSystemRole ? "Không thể xóa vai trò mặc định" : "Xóa vai trò"}
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
            <h3 className="text-title" style={{ fontSize: '1.25rem' }}>Sửa Mô Tả Vai Trò: {editingRole.name}</h3>
            <form onSubmit={handleUpdateRoleDesc} style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Mô Tả Vai Trò</label>
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
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => setEditingRole(null)}>Hủy Bỏ</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
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
