import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import './Login.css';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loggedInUser = await login(formData.email, formData.password);
      navigate(loggedInUser.role === 'Staff' ? '/inventory' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (e) => {
    e.preventDefault();
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-wrapper">
      {/* Left Branding Side */}
      <div className="login-banner">
        <div className="login-banner-overlay"></div>
        <div className="login-banner-content animate-fade-in-up">
          <div className="login-logo-large">
            <Package size={56} color="#fff" />
          </div>
          <h1 className="banner-title">HỆ THỐNG QUẢN LÝ<br />KHO HÀNG THÔNG MINH</h1>
          <p className="banner-subtitle">
            Giải pháp quản lý kho hàng hiện đại tích hợp AI dự báo nhu cầu tiêu thụ, lập bản đồ vị trí kệ kho 2D và quản lý chuỗi cung ứng thông suốt.
          </p>
          <div className="banner-stats">
            <div className="stat-item">
              <h3>Thời gian thực</h3>
              <p>Theo dõi tồn kho 24/7</p>
            </div>
            <div className="stat-item">
              <h3>An toàn</h3>
              <p>Phân quyền RBAC & AI</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="login-form-container">
        <div className="login-glass-card animate-fade-in">
          <div className="login-header">
            <h2>Đăng nhập hệ thống</h2>
            <p>Vui lòng nhập tài khoản để tiếp tục truy cập WMS</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
            <div className="form-group">
              <label className="form-label">Địa chỉ Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="Nhập email của bạn..."
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input password-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Nhập mật khẩu..."
                  autoComplete="new-password"
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
