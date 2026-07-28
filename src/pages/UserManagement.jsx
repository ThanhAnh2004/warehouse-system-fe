import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { Plus, Users, Search, Edit, Trash2, Key, Eye, EyeOff, X, Save, AlertTriangle, UserPlus } from 'lucide-react';

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  // Lock body scroll when any modal is active
  useEffect(() => {
    if (showModal || deletingUser) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showModal, deletingUser]);

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

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/users/${deletingUser._id}`);
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      alert('Lỗi xóa người dùng: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (isEditMode) {
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
      alert(`Lỗi ${isEditMode ? 'cập nhật' : 'tạo mới'} người dùng: ` + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.fullname?.toLowerCase().includes(search.toLowerCase())
  );

  const isMobile = window.innerWidth <= 768;
  const modalBackdropStyle = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: isMobile ? 0 : 'var(--sidebar-width, 280px)',
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  };

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Users size={28} color="var(--accent-primary)" />
          <h1 className="text-title" style={{ marginBottom: 0 }}>Quản Lý Người Dùng & Tài Khoản</h1>
        </div>
        <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={18} /> Thêm Người Dùng Mới
        </button>
      </div>

      <div className="glass-card">
        <div style={{ display: 'flex', marginBottom: '1.5rem', paddingBottom: '1rem' }}>
          <div className="search-box">
            <Search size={18} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Tìm kiếm theo email hoặc họ tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                <th>Email</th>
                <th>Họ Và Tên</th>
                <th>Vai Trò (Role)</th>
                <th>Số Điện Thoại</th>
                <th>Giới Tính</th>
                <th>Địa Chỉ</th>
                <th style={{ textAlign: 'center', width: '90px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ padding: '2rem', textAlign: 'center' }}>Đang tải danh sách người dùng...</td></tr>
              ) : filteredUsers.map((u, idx) => (
                <tr key={u._id}>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                  <td><strong>{u.email}</strong></td>
                  <td style={{ fontWeight: 600 }}>{u.fullname}</td>
                  <td>
                    <span className={`badge ${u.role === 'Admin' ? 'badge-danger' : (u.role === 'Manager' ? 'badge-primary' : 'badge-success')}`}>
                      {u.role === 'Admin' ? 'Quản trị viên (Admin)' : u.role === 'Manager' ? 'Quản lý (Manager)' : 'Nhân viên (Staff)'}
                    </span>
                  </td>
                  <td>{u.phone || 'Chưa cập nhật'}</td>
                  <td>{u.gender === 'Male' ? 'Nam' : u.gender === 'Female' ? 'Nữ' : 'Khác'}</td>
                  <td>{u.address || 'Chưa cập nhật'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '5px 7px', fontSize: '0.75rem', background: 'transparent' }}
                        onClick={() => openEditModal(u)}
                        title="Sửa thông tin"
                      >
                        <Edit size={14} color="var(--accent-primary)" />
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '5px 7px', fontSize: '0.75rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'transparent' }}
                        onClick={() => setDeletingUser(u)}
                        title="Xóa tài khoản"
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

      {/* Modern Add / Edit User Modal via Portal */}
      {showModal && createPortal(
        <div
          style={modalBackdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '650px',
              width: '92%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'var(--bg-card, #ffffff)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isEditMode ? <Edit size={22} color="var(--accent-primary)" /> : <UserPlus size={22} color="var(--accent-primary)" />}
                <h3 className="text-subtitle" style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                  {isEditMode ? 'Chỉnh Sửa Người Dùng' : 'Thêm Người Dùng Mới'}
                </h3>
              </div>
              <button
                className="btn"
                style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" name="fake_email_prevent_autofill" style={{ display: 'none' }} tabIndex="-1" />
              <input type="password" name="fake_password_prevent_autofill" style={{ display: 'none' }} tabIndex="-1" />

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Email</label>
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
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Mật Khẩu</label>
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
                        justify: 'center',
                        padding: '0.2rem',
                        transition: 'color 0.2s'
                      }}
                      title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Họ Và Tên</label>
                <input required type="text" className="form-input" value={newUser.fullname} onChange={e => setNewUser({...newUser, fullname: e.target.value})} />
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Vai Trò (Role)</label>
                <select className="form-input" value={newUser.role} onChange={e => handleRoleChange(e.target.value)}>
                  {roles.map(r => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Số Điện Thoại</label>
                  <input
                    required
                    type="text"
                    pattern="[0-9]{10,11}"
                    title="Số điện thoại phải từ 10 đến 11 chữ số"
                    className="form-input"
                    value={newUser.phone}
                    onChange={e => setNewUser({...newUser, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Giới Tính</label>
                  <select required className="form-input" value={newUser.gender} onChange={e => setNewUser({...newUser, gender: e.target.value})}>
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Địa Chỉ</label>
                <input required type="text" className="form-input" value={newUser.address} onChange={e => setNewUser({...newUser, address: e.target.value})} />
              </div>

              {/* Custom user permissions section */}
              {isEditMode && newUser.role !== 'Admin' && (
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.75rem', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <label className="text-title" style={{ fontSize: '1rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Key size={18} color="var(--accent-primary)" />
                      Ghi Đè Quyền Hạn Riêng Cho Cá Nhân
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                      <input
                        type="checkbox"
                        checked={isCustomPermissions}
                        onChange={e => handleCustomPermissionsToggle(e.target.checked)}
                      />
                      Tùy chỉnh quyền riêng
                    </label>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '0.75rem',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      padding: '0.75rem',
                      background: 'var(--bg-primary, rgba(0,0,0,0.02))',
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

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-outline" style={{ minWidth: '90px' }} onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '130px', gap: '6px' }}>
                  <Save size={16} /> {submitting ? 'Đang lưu...' : (isEditMode ? 'Lưu Thay Đổi' : 'Tạo Người Dùng')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete User Confirm Modal via Portal */}
      {deletingUser && createPortal(
        <div
          style={modalBackdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingUser(null);
          }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '440px',
              width: '92%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'var(--bg-card, #ffffff)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--danger-light, rgba(239, 68, 68, 0.15))',
                color: 'var(--danger, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                margin: '0 auto 1.25rem'
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Xác Nhận Xóa Tài Khoản?
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Bạn có chắc chắn muốn xóa tài khoản người dùng <b style={{ color: 'var(--text-primary)' }}>"{deletingUser.fullname}"</b> ({deletingUser.email}) không?<br />
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '4px', display: 'inline-block' }}>
                ⚠️ Thao tác này sẽ xóa vĩnh viễn tài khoản khỏi hệ thống!
              </span>
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1, padding: '0.65rem 1rem' }}
                onClick={() => setDeletingUser(null)}
                disabled={submitting}
              >
                Hủy Bỏ
              </button>
              <button
                className="btn"
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  background: 'var(--danger, #ef4444)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm, 8px)',
                  cursor: 'pointer'
                }}
                onClick={handleConfirmDelete}
                disabled={submitting}
              >
                {submitting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UserManagement;
