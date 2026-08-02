import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { User, Phone, MapPin, Mail, Shield, Edit2, Lock, Eye, EyeOff, X, Save, UserCheck, Key, Camera } from 'lucide-react';

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBaseUrl}${cleanUrl}`;
};

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState({ fullname: '', phone: '', gender: 'Male', address: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  // Password visibility
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (showEditModal || showPasswordModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showEditModal, showPasswordModal]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/users/${user.id}`);
      setProfileData(res.data);
      setEditForm({
        fullname: res.data.fullname || '',
        phone: res.data.phone || '',
        gender: res.data.gender || 'Male',
        address: res.data.address || '',
      });
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('fullname', editForm.fullname);
      formData.append('phone', editForm.phone);
      formData.append('gender', editForm.gender);
      formData.append('address', editForm.address);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await apiClient.patch(`/users/${user.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data) {
        const updatedData = response.data.data || response.data;
        const newAvatarUrl = updatedData?.avatarUrl || profileData?.avatarUrl;
        updateUser({
          fullname: editForm.fullname,
          avatarUrl: newAvatarUrl
        });
        setShowEditModal(false);
        setAvatarFile(null);
        fetchProfile();
        alert('Cập nhật thông tin cá nhân và ảnh đại diện thành công!');
      } else {
        alert('Cập nhật thất bại: ' + response.data.message);
      }
    } catch (error) {
      alert('Lỗi cập nhật thông tin: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Mật khẩu mới nhập lại không khớp!");
      return;
    }
    try {
      setSubmitting(true);
      const response = await apiClient.post('/auth/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      if (response.data.success) {
        alert('Đổi mật khẩu thành công!');
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordModal(false);
      } else {
        alert('Đổi mật khẩu thất bại: ' + response.data.message);
      }
    } catch (error) {
      alert('Lỗi đổi mật khẩu: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải thông tin cá nhân...</div>;
  }

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
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="text-title" style={{ marginBottom: 0 }}>Thông Tin Tài Khoản Cá Nhân</h1>
      </div>

      <div className="grid grid-cols-1" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Profile Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
          {getImageUrl(profileData?.avatarUrl) ? (
            <img
              src={getImageUrl(profileData?.avatarUrl)}
              alt="Avatar"
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                objectFit: 'cover',
                marginBottom: '1.5rem',
                boxShadow: 'var(--shadow-lg)',
                border: '3px solid var(--accent-primary)'
              }}
            />
          ) : (
            <div
              className="avatar"
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                fontSize: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, #868cff 100%)',
                color: 'white',
                marginBottom: '1.5rem',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              {profileData?.fullname?.[0]?.toUpperCase() || profileData?.email?.[0]?.toUpperCase()}
            </div>
          )}

          <h3 className="text-title" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{profileData?.fullname}</h3>
          <p className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '2rem' }}>
            {profileData?.role === 'Admin' ? 'Quản Trị Viên (Admin)' : profileData?.role === 'Manager' ? 'Quản Lý Kho (Manager)' : 'Nhân Viên Kho (Staff)'}
          </p>

          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: 'auto' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowEditModal(true)}>
              <Edit2 size={16} /> Sửa Thông Tin
            </button>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPasswordModal(true)}>
              <Lock size={16} /> Đổi Mật Khẩu
            </button>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 className="text-subtitle" style={{ fontSize: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', margin: 0 }}>
            Chi Tiết Lý Lịch
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <Mail size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Địa Chỉ Email</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profileData?.email}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <Phone size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Số Điện Thoại</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profileData?.phone || 'Chưa cập nhật'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <User size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Giới Tính</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profileData?.gender === 'Male' ? 'Nam' : profileData?.gender === 'Female' ? 'Nữ' : 'Khác'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <MapPin size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Địa Chỉ Nơi Ở</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{profileData?.address || 'Chưa cập nhật'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Workspace-Centered Edit Profile Modal via Portal */}
      {showEditModal && createPortal(
        <div
          style={modalBackdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '520px',
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
                <UserCheck size={22} color="var(--accent-primary)" />
                <h3 className="text-subtitle" style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                  Cập Nhật Thông Tin Cá Nhân
                </h3>
              </div>
              <button
                className="btn"
                style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setShowEditModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Email (Cố định)</label>
                <input type="text" className="form-input" value={profileData?.email} disabled style={{ opacity: 0.7, background: 'var(--bg-primary)' }} />
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Họ Và Tên</label>
                <input required type="text" className="form-input" value={editForm.fullname} onChange={e => setEditForm({ ...editForm, fullname: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Số Điện Thoại</label>
                  <input required type="text" pattern="[0-9]{10,11}" title="Số điện thoại phải từ 10-11 chữ số" className="form-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Giới Tính</label>
                  <select required className="form-input" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Địa Chỉ Nơi Ở</label>
                <input required type="text" className="form-input" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                  <Camera size={16} color="var(--accent-primary)" /> Hình Ảnh Đại Diện (Avatar)
                </label>
                <input type="file" accept="image/*" className="form-input" onChange={e => setAvatarFile(e.target.files[0])} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-outline" style={{ minWidth: '90px' }} onClick={() => setShowEditModal(false)}>Hủy Bỏ</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '130px', gap: '6px' }}>
                  <Save size={16} /> {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modern Workspace-Centered Change Password Modal via Portal */}
      {showPasswordModal && createPortal(
        <div
          style={modalBackdropStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPasswordModal(false);
          }}
        >
          <div
            className="glass-card animate-scale-in"
            style={{
              maxWidth: '520px',
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
                <Key size={22} color="var(--accent-primary)" />
                <h3 className="text-subtitle" style={{ fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                  Đổi Mật Khẩu Tài Khoản
                </h3>
              </div>
              <button
                className="btn"
                style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setShowPasswordModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Mật Khẩu Hiện Tại</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showOldPass ? "text" : "password"} className="form-input" value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} />
                  <button type="button" onClick={() => setShowOldPass(!showOldPass)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    {showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Mật Khẩu Mới</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showNewPass ? "text" : "password"} minLength={6} className="form-input" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-subtitle" style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-primary)' }}>Nhập Lại Mật Khẩu Mới</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showConfirmPass ? "text" : "password"} minLength={6} className="form-input" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-outline" style={{ minWidth: '90px' }} onClick={() => setShowPasswordModal(false)}>Hủy Bỏ</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: '140px', gap: '6px' }}>
                  <Save size={16} /> {submitting ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Profile;
