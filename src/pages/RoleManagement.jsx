import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Shield, Save, Lock, CheckCircle2, AlertTriangle, Key, Plus, Trash2, Users, Edit, Search, CheckSquare, Square, RefreshCw, Cpu, Layers, FileSpreadsheet, Package } from 'lucide-react';
import './RoleManagement.css';

const CATEGORY_NAMES = {
  users: 'QUẢN LÝ NGƯỜI DÙNG & VAI TRÒ',
  products: 'QUẢN LÝ DANH MỤC SẢN PHẨM',
  stock: 'QUẢN LÝ TỒN KHO THỰC TẾ',
  adjustments: 'KIỂM KÊ & ĐIỀU CHỈNH KHO',
  transactions: 'LỊCH SỬ GIAO DỊCH KHO',
  locations: 'SƠ ĐỒ & KỆ KHO (GỢI Ý VỊ TRÍ & PHÂN KỆ)',
  reports: 'BÁO CÁO, THỐNG KÊ & XUẤT EXCEL',
  forecast: 'DỰ BÁO NHU CẦU & CÔNG THỨC AI',
  alerts: 'CẢNH BÁO KHO HÀNG & HẾT HÀNG',
  system: 'GIÁM SÁT HỆ THỐNG & LOGS',
};

const RoleManagement = () => {
  const { user } = useContext(AuthContext);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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
      setRoles(rolesRes.data || []);
      setPermissions(permsRes.data || []);
      
      if (rolesRes.data && rolesRes.data.length > 0) {
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

  const handleSelectAll = () => {
    if (selectedRole?.name === 'Admin') return;
    const allKeys = permissions.map(p => p.key);
    setSelectedPermissions(allKeys);
  };

  const handleDeselectAll = () => {
    if (selectedRole?.name === 'Admin') return;
    setSelectedPermissions([]);
  };

  const handleResetPermissions = () => {
    if (selectedRole) {
      setSelectedPermissions(selectedRole.permissions || []);
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
      setMessage({ type: 'success', text: `🎉 Đã cập nhật thành công ${selectedPermissions.length} quyền hạn cho vai trò ${selectedRole.name}!` });
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
        setMessage({ type: 'success', text: `🎉 Tạo vai trò "${newlyCreatedRole.name}" thành công!` });
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

  const filteredPermissions = permissions.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
  });

  const getGroupedPermissions = () => {
    const groups = {};
    filteredPermissions.forEach(p => {
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
      <div className="loading-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Đang tải ma trận phân quyền hệ thống WMS...</p>
      </div>
    );
  }

  const groupedPermissions = getGroupedPermissions();
  const isAdminRole = selectedRole?.name === 'Admin';

  return (
    <div className="role-management-container animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="text-title" style={{ margin: 0 }}>Cấu Hình Phân Quyền & Vai Trò (RBAC Matrix)</h2>
          <p className="text-subtitle" style={{ fontSize: '0.88rem', marginTop: '0.35rem' }}>
            Quản lý, phân quyền chi tiết & phân bổ chức năng cho từng vai trò người dùng trong hệ thống kho
          </p>
        </div>
        <Shield size={36} className="header-icon" color="var(--accent-primary)" />
      </div>

      {/* Tabs navigation */}
      <div className="tabs-header" style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginTop: '1.5rem' }}>
        <button
          className={`btn ${activeTab === 'permissions' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('permissions')}
          style={{ borderRadius: '20px', padding: '0.4rem 1.2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Shield size={16} />
          Ma Trận Phân Quyền ({permissions.length} quyền)
        </button>
        <button
          className={`btn ${activeTab === 'roles' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('roles')}
          style={{ borderRadius: '20px', padding: '0.4rem 1.2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Users size={16} />
          Danh Sách Vai Trò ({roles.length} vai trò)
        </button>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`} style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {message.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {activeTab === 'permissions' ? (
        <div className="role-management-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          {/* Left Side: Role Selector */}
          <div className="glass-card role-selector-card" style={{ padding: '1.25rem' }}>
            <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="var(--accent-primary)" />
              Vai Trò Hệ Thống
            </h3>
            <div className="role-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {roles.map((role) => (
                <button
                  key={role.name}
                  className={`role-btn ${selectedRole?.name === role.name ? 'active' : ''}`}
                  onClick={() => handleRoleChange(role)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '10px',
                    border: selectedRole?.name === role.name ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: selectedRole?.name === role.name ? 'var(--accent-light)' : 'var(--bg-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div className="role-btn-info">
                    <div className="role-name" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{role.name}</div>
                    <div className="role-desc" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{role.description || 'Chưa có mô tả'}</div>
                  </div>
                  <span className="badge badge-primary" style={{ fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                    {(role.permissions || []).length} quyền
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Side: Permissions Matrix */}
          <div className="glass-card permissions-matrix-card" style={{ padding: '1.5rem' }}>
            <div className="matrix-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Chi Tiết Phân Quyền - Vai Trò: <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{selectedRole?.name}</span>
                </h3>
                <p className="card-subtitle" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.35rem', margin: 0 }}>
                  {isAdminRole 
                    ? '🔒 Vai trò Quản trị viên (Admin) có toàn quyền hệ thống và không thể sửa đổi.'
                    : `Tích chọn các quyền chức năng cho phép vai trò ${selectedRole?.name} thực hiện`}
                </p>
              </div>

              {!isAdminRole && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-outline" onClick={handleSelectAll} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckSquare size={14} /> Chọn Tất Cả
                  </button>
                  <button className="btn btn-outline" onClick={handleDeselectAll} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Square size={14} /> Bỏ Chọn Tất Cả
                  </button>
                  <button className="btn btn-outline" onClick={handleResetPermissions} style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <RefreshCw size={14} /> Đặt Lại
                  </button>
                  <button 
                    className="btn btn-primary btn-save" 
                    onClick={handleSave}
                    disabled={saving}
                    style={{ fontSize: '0.85rem', padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Save size={16} />
                    {saving ? 'Đang lưu...' : 'Lưu Phân Quyền'}
                  </button>
                </div>
              )}
            </div>

            {/* SEARCH PERMISSIONS BAR */}
            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Gõ tên quyền hoặc mã key để lọc (ví dụ: locations:allocate, reports:export)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
              />
            </div>

            <div className="permissions-groups" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {Object.keys(groupedPermissions).length > 0 ? (
                Object.keys(groupedPermissions).map((groupName) => (
                  <div key={groupName} className="permission-group-section" style={{ background: 'var(--bg-primary)', padding: '1.1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h4 className="group-category-title" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <Key size={16} />
                      <span>{CATEGORY_NAMES[groupName] || `QUẢN LÝ ${groupName.toUpperCase()}`}</span>
                      <span className="badge badge-outline" style={{ fontSize: '0.7rem', marginLeft: 'auto' }}>
                        {groupedPermissions[groupName].length} quyền
                      </span>
                    </h4>
                    <div className="permission-items-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
                      {groupedPermissions[groupName].map((perm) => {
                        const isChecked = isAdminRole || selectedPermissions.includes(perm.key);
                        return (
                          <div 
                            key={perm.key} 
                            className={`permission-item-card ${isChecked ? 'selected' : ''} ${isAdminRole ? 'disabled' : ''}`}
                            onClick={() => handlePermissionToggle(perm.key)}
                            style={{
                              padding: '0.85rem',
                              borderRadius: '8px',
                              border: isChecked ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                              background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                              cursor: isAdminRole ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              gap: '0.65rem',
                              alignItems: 'flex-start',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div className="perm-checkbox-wrapper" style={{ marginTop: '2px' }}>
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                disabled={isAdminRole}
                                onChange={() => {}}
                                style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                              />
                            </div>
                            <div className="perm-details" style={{ flex: 1, minWidth: 0 }}>
                              <div className="perm-name" style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{perm.name}</div>
                              <div className="perm-key" style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontFamily: 'monospace', margin: '2px 0' }}>`{perm.key}`</div>
                              <div className="perm-desc" style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{perm.description}</div>
                            </div>
                            {isAdminRole && <Lock size={14} className="lock-icon" style={{ color: 'var(--text-secondary)' }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  Không tìm thấy quyền hạn nào khớp với từ khóa "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="role-management-grid" style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
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
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Mô Tả Vai Trò</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="Mô tả nhiệm vụ & phạm vi quyền của vai trò..."
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Plus size={16} />
                {saving ? 'Đang xử lý...' : 'Tạo Vai Trò Mới'}
              </button>
            </form>
          </div>

          {/* Right Card: Roles List Table */}
          <div className="glass-card permissions-matrix-card" style={{ padding: '1.5rem' }}>
            <h3 className="card-title" style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Danh Sách Vai Trò Hệ Thống ({roles.length})</h3>
            <div className="table-container">
              <table className="data-table" style={{ width: '100%', fontSize: '0.88rem' }}>
                <thead>
                  <tr>
                    <th>Tên Vai Trò</th>
                    <th>Mô Tả Vai Trò</th>
                    <th style={{ textAlign: 'center' }}>Số Quyền Được Gán</th>
                    <th style={{ textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => {
                    const isProtected = ['Admin', 'Manager', 'Staff'].includes(r.name);
                    return (
                      <tr key={r.name}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{r.name}</strong>
                          {r.name === 'Admin' && <span className="badge badge-primary" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>Toàn Quyền System</span>}
                        </td>
                        <td>
                          {editingRole?.name === r.name ? (
                            <form onSubmit={handleUpdateRoleDesc} style={{ display: 'flex', gap: '0.5rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={editRoleDesc}
                                onChange={e => setEditRoleDesc(e.target.value)}
                                style={{ fontSize: '0.82rem', padding: '0.25rem 0.5rem' }}
                              />
                              <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}>Lưu</button>
                              <button type="button" className="btn btn-outline" onClick={() => setEditingRole(null)} style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}>Hủy</button>
                            </form>
                          ) : (
                            <span>{r.description || 'Chưa có mô tả'}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-outline" style={{ fontWeight: 700 }}>{(r.permissions || []).length} / {permissions.length} quyền</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                              onClick={() => { setEditingRole(r); setEditRoleDesc(r.description || ''); }}
                              title="Sửa mô tả"
                            >
                              <Edit size={14} /> Sửa Mô Tả
                            </button>
                            {!isProtected && (
                              <button
                                className="btn btn-outline"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                                onClick={() => handleDeleteRole(r.name)}
                                title="Xóa vai trò"
                              >
                                <Trash2 size={14} /> Xóa
                              </button>
                            )}
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
    </div>
  );
};

export default RoleManagement;
