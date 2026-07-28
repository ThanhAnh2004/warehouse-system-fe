import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { User, Phone, MapPin, Mail, Shield, Edit2, Lock, Eye, EyeOff } from 'lucide-react';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Form states
  const [editForm, setEditForm] = useState({ fullname: '', phone: '', gender: 'Male', address: '' });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });

  // Password visibility
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

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
      const response = await apiClient.patch(`/users/${user.id}`, editForm);
      if (response.data.success) {
        updateUser({ fullname: editForm.fullname });
        setShowEditModal(false);
        fetchProfile();
        alert('Cập nhật thông tin cá nhân thành công!');
      } else {
        alert('Cập nhật thất bại: ' + response.data.message);
      }
    } catch (error) {
      alert('Lỗi cập nhật thông tin: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Mật khẩu mới nhập lại không khớp!");
      return;
    }
    try {
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
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Đang tải thông tin cá nhân...</div>;
  }

  return (
    <div className="animate-slide-up">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h2 className="text-title">Thông Tin Tài Khoản Cá Nhân</h2>
      </div>

      <div className="grid grid-cols-1" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Profile Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="avatar" style={{ width: '96px', height: '96px', borderRadius: '50%', fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent-primary) 0%, #868cff 100%)', color: 'white', marginBottom: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
            {profileData?.fullname?.[0]?.toUpperCase() || profileData?.email?.[0]?.toUpperCase()}
          </div>
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
          <h3 className="text-title" style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Chi Tiết Lý Lịch</h3>
          
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

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 className="text-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Cập Nhật Thông Tin</h3>
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Email (Cố định)</label>
                <input type="text" className="form-input" value={profileData?.email} disabled style={{ opacity: 0.7, background: 'var(--bg-primary)' }} />
              </div>
              
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Họ Và Tên</label>
                <input required type="text" className="form-input" value={editForm.fullname} onChange={e => setEditForm({ ...editForm, fullname: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Số Điện Thoại</label>
                  <input required type="text" pattern="[0-9]{10,11}" title="Số điện thoại phải từ 10-11 chữ số" className="form-input" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="text-subtitle" style={{ fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Giới Tính</label>
                  <select required className="form-input" value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option value="Male">Nam</option>
                    <option value="Female">Nữ</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Địa Chỉ</label>
                <input required type="text" className="form-input" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => setShowEditModal(false)}>Hủy Bỏ</button>
                <button type="submit" className="btn btn-primary">Lưu Thay Đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-up" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 className="text-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Đổi Mật Khẩu Tài Khoản</h3>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Mật Khẩu Hiện Tại</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showOldPass ? "text" : "password"} className="form-input" value={passwordForm.oldPassword} onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })} />
                  <button type="button" onClick={() => setShowOldPass(!showOldPass)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    {showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Mật Khẩu Mới</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showNewPass ? "text" : "password"} minLength={6} className="form-input" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="text-subtitle" style={{ fontSize: '0.85rem', marginBottom: '0.35rem', display: 'block' }}>Nhập Lại Mật Khẩu Mới</label>
                <div style={{ position: 'relative' }}>
                  <input required type={showConfirmPass ? "text" : "password"} minLength={6} className="form-input" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" style={{ background: 'var(--bg-glass)' }} onClick={() => setShowPasswordModal(false)}>Hủy Bỏ</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--danger)' }}>Cập Nhật Mật Khẩu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
