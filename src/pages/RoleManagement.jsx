import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import apiClient from '../api/client';
import { useDialog } from '../context/DialogContext';
import { AuthContext } from '../context/AuthContext';
import {
  Shield,
  Save,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Key,
  Plus,
  Trash2,
  Users,
  Edit,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  X,
} from 'lucide-react';
import './RoleManagement.css';

const CATEGORY_NAMES = {
  dashboard: 'TỔNG QUAN HỆ THỐNG (TRANG CHỦ)',
  users: 'QUẢN LÝ NGƯỜI DÙNG',
  roles: 'QUẢN LÝ VAI TRÒ & PHÂN QUYỀN',
  products: 'QUẢN LÝ DANH MỤC SẢN PHẨM',
  stock: 'QUẢN LÝ TỒN KHO THỰC TẾ',
  orders: 'QUẢN LÝ ĐƠN HÀNG & SOẠN HÀNG (CỬA 02)',
  procurement: 'MUA HÀNG & NHÀ CUNG CẤP (CỬA 01)',
  transactions: 'LỊCH SỬ GIAO DỊCH KHO',
  adjustments: 'KIỂM KÊ & ĐIỀU CHỈNH KHO',
  locations: 'SƠ ĐỒ & KỆ KHO (GỢI Ý VỊ TRÍ & PHÂN KỆ)',
  reports: 'BÁO CÁO, THỐNG KÊ & XUẤT EXCEL',
  forecast: 'DỰ BÁO NHU CẦU & CÔNG THỨC AI',
  alerts: 'CẢNH BÁO KHO HÀNG & THÔNG BÁO',
  system: 'GIÁM SÁT HỆ THỐNG & MESSAGE BUS',
};

const isRootAdminRole = (roleObj) => {
  if (!roleObj) return false;
  if (roleObj.isSystemAdmin) return true;
  const normalized = (roleObj.name || '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'quản trị viên';
};

const isBuiltInProtectedRole = (roleObj) => {
  if (!roleObj) return false;
  if (isRootAdminRole(roleObj)) return true;
  return ['Manager', 'Staff', 'Quản lý kho', 'Nhân viên kho'].includes(roleObj.name);
};

const RoleManagement = () => {
  const { showAlert, showConfirm } = useDialog();
  const { user, updateUser, hasPermission } = useContext(AuthContext);
  const canManage = hasPermission('roles:manage');

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('permissions');

  // Create Role Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [cloneFromRole, setCloneFromRole] = useState('');

  // Edit Role Modal State
  const [editingRole, setEditingRole] = useState(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');

  // Delete + Reassign Modal State (when role still has assigned users)
  const [deletingRoleObj, setDeletingRoleObj] = useState(null);
  const [reassignTargetRole, setReassignTargetRole] = useState('');

  const fetchData = async (focusRoleName = null) => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get('/users/roles'),
        apiClient.get('/users/permissions'),
      ]);
      const roleList = rolesRes.data || [];
      setRoles(roleList);
      setPermissions(permsRes.data || []);

      if (roleList.length > 0) {
        const target =
          (focusRoleName && roleList.find((r) => r.name === focusRoleName)) ||
          (selectedRole && roleList.find((r) => r.name === selectedRole.name)) ||
          roleList[0];
        setSelectedRole(target);
        setSelectedPermissions(target.permissions || []);
      } else {
        setSelectedRole(null);
        setSelectedPermissions([]);
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

  // Lock body scroll when modal active
  useEffect(() => {
    if (showCreateModal || editingRole || deletingRoleObj) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showCreateModal, editingRole, deletingRoleObj]);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions || []);
    setMessage({ type: '', text: '' });
  };

  const handlePermissionToggle = (key) => {
    if (isRootAdminRole(selectedRole) || !canManage) return;

    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter((k) => k !== key));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  };

  const handleSelectAll = () => {
    if (isRootAdminRole(selectedRole) || !canManage) return;
    setSelectedPermissions(permissions.map((p) => p.key));
  };

  const handleDeselectAll = () => {
    if (isRootAdminRole(selectedRole) || !canManage) return;
    setSelectedPermissions([]);
  };

  const handleResetPermissions = () => {
    if (selectedRole) {
      setSelectedPermissions(selectedRole.permissions || []);
    }
  };

  const handleSave = async () => {
    if (!selectedRole || !canManage) return;
    if (isRootAdminRole(selectedRole)) {
      showAlert('Không thể thay đổi quyền hạn của Quản trị viên hệ thống.');
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      await apiClient.patch(`/users/roles/${encodeURIComponent(selectedRole.name)}`, {
        permissions: selectedPermissions,
      });

      const updatedRoles = roles.map((r) =>
        r.name === selectedRole.name ? { ...r, permissions: selectedPermissions } : r
      );
      setRoles(updatedRoles);
      setSelectedRole({ ...selectedRole, permissions: selectedPermissions });
      const msgText = `Đã cập nhật thành công ${selectedPermissions.length} quyền hạn cho vai trò ${selectedRole.name}!`;
      setMessage({ type: 'success', text: msgText });
      showAlert(msgText, 'success', 'Lưu Phân Quyền Thành Công');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Có lỗi xảy ra khi lưu quyền hạn.';
      setMessage({ type: 'error', text: errMsg });
      showAlert(errMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setNewRoleName('');
    setNewRoleDesc('');
    setCloneFromRole('');
    setShowCreateModal(true);
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    const trimmed = newRoleName.trim();
    if (!trimmed) {
      showAlert('Tên vai trò không được để trống.');
      return;
    }
    if (trimmed.length < 2) {
      showAlert('Tên vai trò phải có ít nhất 2 ký tự.');
      return;
    }
    if (/[/?#%]/.test(trimmed)) {
      showAlert('Tên vai trò không được chứa các ký tự đặc biệt (/ ? # %).');
      return;
    }

    const templatePerms = cloneFromRole
      ? roles.find((r) => r.name === cloneFromRole)?.permissions || []
      : [];

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const res = await apiClient.post('/users/roles', {
        name: trimmed,
        description: newRoleDesc.trim(),
        permissions: templatePerms,
      });
      const created = res.data?.data || res.data;
      setShowCreateModal(false);
      await fetchData(created?.name || trimmed);
      setActiveTab('permissions');
      showAlert(
        `Đã tạo vai trò "${created?.name || trimmed}" thành công! Bạn có thể tùy chỉnh chi tiết quyền hạn ngay trên bảng bên phải.`,
        'success',
        'Tạo Vai Trò Mới'
      );
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.message || 'Có lỗi xảy ra khi tạo vai trò mới.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditRoleModal = (role) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDesc(role.description || '');
  };

  const handleUpdateRoleSubmit = async (e) => {
    e.preventDefault();
    if (!editingRole) return;
    const trimmedNewName = editRoleName.trim();
    if (!trimmedNewName) {
      showAlert('Tên vai trò không được để trống.');
      return;
    }
    if (/[/?#%]/.test(trimmedNewName)) {
      showAlert('Tên vai trò không được chứa các ký tự đặc biệt (/ ? # %).');
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const payload = {
        description: editRoleDesc.trim(),
      };
      if (trimmedNewName !== editingRole.name) {
        payload.newName = trimmedNewName;
      }

      const res = await apiClient.patch(`/users/roles/${encodeURIComponent(editingRole.name)}`, payload);
      const updated = res.data?.data || {
        ...editingRole,
        name: payload.newName || editingRole.name,
        description: payload.description,
      };

      if (payload.newName && user?.role === editingRole.name) {
        updateUser({ role: updated.name });
      }

      setEditingRole(null);
      await fetchData(updated.name);
      showAlert(`Đã cập nhật vai trò "${updated.name}" thành công!`, 'success', 'Cập Nhật Vai Trò');
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.message || 'Cập nhật vai trò thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteRole = async (role) => {
    if (isRootAdminRole(role)) {
      showAlert('Không thể xóa vai trò Quản trị viên hệ thống.', 'warning');
      return;
    }

    const assignedCount = role.userCount || 0;
    if (assignedCount > 0) {
      const otherRoles = roles.filter((r) => r.name !== role.name && !isRootAdminRole(r));
      const fallbackList = otherRoles.length > 0 ? otherRoles : roles.filter((r) => r.name !== role.name);
      setReassignTargetRole(fallbackList[0]?.name || '');
      setDeletingRoleObj(role);
      return;
    }

    const confirmed = await showConfirm(
      `Bạn có chắc chắn muốn xóa vai trò "${role.name}"? Hành động này không thể hoàn tác.`,
      { title: 'Xác Nhận Xóa Vai Trò', confirmText: 'Xóa Vai Trò', variant: 'danger' }
    );
    if (!confirmed) return;

    await executeDeleteRole(role.name);
  };

  const executeDeleteRole = async (name, reassignTo = '') => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const query = reassignTo ? `?reassignTo=${encodeURIComponent(reassignTo)}` : '';
      await apiClient.delete(`/users/roles/${encodeURIComponent(name)}${query}`);
      setDeletingRoleObj(null);
      await fetchData();
      showAlert(`Đã xóa vai trò "${name}" thành công!`, 'success', 'Xóa Vai Trò');
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.message || 'Xóa vai trò thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredPermissions = permissions.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.key.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  const getGroupedPermissions = () => {
    const groups = {};
    filteredPermissions.forEach((p) => {
      const category = p.key.split(':')[0] || 'Phân Quyền Khác';
      if (!groups[category]) groups[category] = [];
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
  const isAdminRole = isRootAdminRole(selectedRole);

  const modalBackdropStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(15, 23, 42, 0.72)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '1rem',
  };

  return (
    <div className="role-management-container animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Shield size={34} className="header-icon" color="var(--accent-primary)" />
          <div>
            <h2 className="text-title" style={{ margin: 0 }}>Cấu Hình Phân Quyền &amp; Vai Trò (RBAC Matrix)</h2>
            <p className="text-subtitle" style={{ fontSize: '0.88rem', marginTop: '0.25rem', marginBottom: 0 }}>
              Quản lý thêm, sửa, xóa vai trò &amp; phân bổ quyền hạn chi tiết cho từng vai trò trong hệ thống kho
            </p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem' }}
          >
            <Plus size={18} />
            <span>Thêm Vai Trò Mới</span>
          </button>
        )}
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
        <div className="role-management-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          {/* Left Side: Role Selector with Add / Edit / Delete actions */}
          <div className="glass-card role-selector-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h3 className="card-title" style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="var(--accent-primary)" />
                Vai Trò ({roles.length})
              </h3>
              {canManage && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={openCreateModal}
                  title="Thêm vai trò mới"
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> Thêm
                </button>
              )}
            </div>

            <div className="role-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 0 }}>
              {roles.map((role) => {
                const isActive = selectedRole?.name === role.name;
                const isRootAdmin = isRootAdminRole(role);
                const isBuiltInRole = isBuiltInProtectedRole(role);
                return (
                  <div
                    key={role.name}
                    className={`role-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleRoleChange(role)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      background: isActive ? 'var(--accent-light)' : 'var(--bg-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div className="role-btn-info" style={{ flex: 1, minWidth: 0 }}>
                        <div className="role-name" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>{role.name}</span>
                          {isRootAdmin && <Lock size={13} color="var(--accent-primary)" title="Vai trò hệ thống gốc" />}
                        </div>
                        <div className="role-desc" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                          {role.description || 'Chưa có mô tả'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                          {(role.permissions || []).length} quyền
                        </span>
                        <span className="badge badge-outline" style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                          {role.userCount || 0} tài khoản
                        </span>
                      </div>

                      {canManage && (
                        <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => openEditRoleModal(role)}
                            title="Sửa tên & mô tả vai trò"
                            style={{ padding: '4px 7px', borderRadius: '6px', background: 'transparent' }}
                          >
                            <Edit size={13} color="var(--accent-primary)" />
                          </button>
                          {!isBuiltInRole && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={() => requestDeleteRole(role)}
                              title="Xóa vai trò"
                              style={{ padding: '4px 7px', borderRadius: '6px', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
                    ? '🔒 Vai trò Quản trị viên (Admin) luôn có toàn quyền hệ thống.'
                    : `Tích chọn các quyền chức năng cho phép vai trò ${selectedRole?.name} thực hiện`}
                </p>
              </div>

              {!isAdminRole && canManage && (
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
                            className={`permission-item-card ${isChecked ? 'selected' : ''} ${(isAdminRole || !canManage) ? 'disabled' : ''}`}
                            onClick={() => handlePermissionToggle(perm.key)}
                            style={{
                              padding: '0.85rem',
                              borderRadius: '8px',
                              border: isChecked ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                              background: isChecked ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                              cursor: (isAdminRole || !canManage) ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              gap: '0.65rem',
                              alignItems: 'flex-start',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div className="perm-checkbox-wrapper" style={{ marginTop: '2px' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isAdminRole || !canManage}
                                onChange={() => {}}
                                style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                              />
                            </div>
                            <div className="perm-details" style={{ flex: 1, minWidth: 0 }}>
                              <div className="perm-name" style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{perm.name}</div>
                              <div className="perm-key" style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontFamily: 'monospace', margin: '2px 0' }}>{perm.key}</div>
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
        /* TAB 2: ROLES DIRECTORY TABLE */
        <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="card-title" style={{ fontSize: '1.15rem', margin: 0 }}>
              Danh Sách Vai Trò Hệ Thống ({roles.length})
            </h3>
            {canManage && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreateModal}
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <Plus size={16} /> Thêm Vai Trò Mới
              </button>
            )}
          </div>

          <div className="table-container">
            <table className="data-table" style={{ width: '100%', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th>Tên Vai Trò</th>
                  <th>Mô Tả Vai Trò</th>
                  <th style={{ textAlign: 'center' }}>Số Tài Khoản</th>
                  <th style={{ textAlign: 'center' }}>Số Quyền Được Gán</th>
                  <th style={{ textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => {
                  const isRootAdmin = isRootAdminRole(r);
                  const isBuiltInRole = isBuiltInProtectedRole(r);
                  return (
                    <tr key={r.name}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{r.name}</strong>
                        {isRootAdmin ? (
                          <span className="badge badge-primary" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>
                            Toàn Quyền System
                          </span>
                        ) : isBuiltInRole ? (
                          <span className="badge badge-outline" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>
                            Mặc định
                          </span>
                        ) : null}
                      </td>
                      <td>{r.description || 'Chưa có mô tả'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-outline" style={{ fontWeight: 600 }}>
                          {r.userCount || 0} tài khoản
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                          {(r.permissions || []).length} / {permissions.length} quyền
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => {
                              handleRoleChange(r);
                              setActiveTab('permissions');
                            }}
                          >
                            <Key size={13} /> Phân Quyền
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => openEditRoleModal(r)}
                            >
                              <Edit size={13} /> Sửa
                            </button>
                          )}

                          {canManage && !isBuiltInRole && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', borderColor: 'var(--danger)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => requestDeleteRole(r)}
                            >
                              <Trash2 size={13} /> Xóa
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
      )}

      {/* MODAL 1: THÊM VAI TRÒ MỚI */}
      {showCreateModal && ReactDOM.createPortal(
        <div style={modalBackdropStyle} onClick={() => setShowCreateModal(false)}>
          <div
            role="dialog"
            aria-modal="true"
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '500px',
              width: '94%',
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'var(--bg-secondary, #ffffff)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
              border: '1.5px solid var(--border-color)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Plus size={22} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Thêm Vai Trò Mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'var(--bg-primary, #f1f5f9)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Tên Vai Trò <span className="req">*</span>
                </label>
                <input
                  required
                  type="text"
                  className="input"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="VD: Accountant, Supervisor, Nhân viên Kiểm Kê..."
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Mô Tả Nhiệm Vụ
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Mô tả phạm vi công việc & trách nhiệm của vai trò..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Sao chép quyền mẫu từ vai trò (Tùy chọn)
                </label>
                <select
                  className="input select"
                  value={cloneFromRole}
                  onChange={(e) => setCloneFromRole(e.target.value)}
                >
                  <option value="">-- Khởi tạo trống (0 quyền, chọn thủ công sau) --</option>
                  {roles.map((r) => (
                    <option key={r.name} value={r.name}>
                      Kế thừa từ {r.name} ({(r.permissions || []).length} quyền)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} />
                  {saving ? 'Đang tạo...' : 'Tạo Vai Trò Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: CHỈNH SỬA VAI TRÒ */}
      {editingRole && ReactDOM.createPortal(
        <div style={modalBackdropStyle} onClick={() => setEditingRole(null)}>
          <div
            role="dialog"
            aria-modal="true"
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '480px',
              width: '94%',
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'var(--bg-secondary, #ffffff)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
              border: '1.5px solid var(--border-color)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Edit size={20} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Chỉnh Sửa Vai Trò: {editingRole.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                style={{ background: 'var(--bg-primary, #f1f5f9)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateRoleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Tên Vai Trò <span className="req">*</span>
                </label>
                <input
                  required
                  type="text"
                  className="input"
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                />
                {isRootAdminRole(editingRole) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    ℹ️ Vai trò quản trị tối cao: bạn có thể đổi tên và mô tả, toàn quyền hệ thống vẫn được bảo toàn.
                  </div>
                )}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Mô Tả Vai Trò
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingRole(null)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={16} />
                  {saving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: XÓA & CHUYỂN ĐỔI VAI TRÒ CHO TÀI KHOẢN HIỆN TẠI */}
      {deletingRoleObj && ReactDOM.createPortal(
        <div style={modalBackdropStyle} onClick={() => setDeletingRoleObj(null)}>
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '480px',
              width: '94%',
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'var(--bg-secondary, #ffffff)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.45)',
              border: '1.5px solid var(--border-color)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#ef4444' }}>
                <Trash2 size={22} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Xác Nhận Xóa Vai Trò
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingRoleObj(null)}
                style={{ background: 'var(--bg-primary, #f1f5f9)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 0 }}>
              Vai trò <strong style={{ color: 'var(--text-primary)' }}>{deletingRoleObj.name}</strong> hiện đang được gán cho{' '}
              <strong style={{ color: '#ef4444' }}>{deletingRoleObj.userCount} tài khoản</strong>. Vui lòng chọn vai trò thay thế cho các tài khoản này trước khi xóa:
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Chuyển tài khoản sang vai trò:
              </label>
              <select
                className="input select"
                value={reassignTargetRole}
                onChange={(e) => setReassignTargetRole(e.target.value)}
              >
                {roles
                  .filter((r) => r.name !== deletingRoleObj.name)
                  .map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name} ({(r.permissions || []).length} quyền)
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setDeletingRoleObj(null)}>
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn"
                disabled={saving || !reassignTargetRole}
                onClick={() => executeDeleteRole(deletingRoleObj.name, reassignTargetRole)}
                style={{ background: '#ef4444', color: '#ffffff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={16} />
                {saving ? 'Đang xóa...' : 'Chuyển & Xóa Vai Trò'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RoleManagement;
