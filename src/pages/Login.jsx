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
      // "/" (Dashboard) chỉ dành cho Admin/Manager; Staff phải vào thẳng trang họ được phép xem.
      navigate(loggedInUser.role === 'Staff' ? '/inventory' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
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
          <h1 className="banner-title">WAREHOUSE<br />MANAGEMENT SYSTEM</h1>
          <p className="banner-subtitle">
            Experience the next generation of logistics management. Seamlessly track inventory, process transactions, and generate insightful reports.
          </p>
          <div className="banner-stats">
            <div className="stat-item">
              <h3>Real-time</h3>
              <p>Inventory Tracking</p>
            </div>
            <div className="stat-item">
              <h3>Secure</h3>
              <p>Role-based Access</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="login-form-container">
        <div className="login-glass-card animate-fade-in">
          <div className="login-header">
            <h2>Welcome back</h2>
            <p>Please enter your details to sign in.</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="Enter your email"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input password-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  placeholder="Enter your password"
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
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

