import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Package, ArrowLeftRight, LogOut, Users, FileText, Bell, Trash2, Sun, Moon, Shield, Activity, ClipboardList, Map, Layers } from 'lucide-react';
import apiClient from '../api/client';
import './Layout.css';

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBaseUrl}${cleanUrl}`;
};

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (user?.role === 'Admin' || user?.role === 'Manager') {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">
            <Package size={24} />
          </div>
          <h2>WMS Pro</h2>
        </div>
        
        <nav className="sidebar-nav">
          {/* Nhóm 1: Tổng Quan */}
          {user?.role !== 'Staff' && (
            <>
              <div className="nav-section-title">Tổng Quan</div>
              <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={20} />
                <span>Trang chủ</span>
              </NavLink>
            </>
          )}

          {/* Nhóm 2: Vận Hành Kho hàng */}
          <div className="nav-section-title">Vận Hành Kho Hàng</div>
          <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Package size={20} />
            <span>Quản lý Tồn kho</span>
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ArrowLeftRight size={20} />
            <span>Lịch sử Giao dịch</span>
          </NavLink>
          <NavLink to="/adjustments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ClipboardList size={20} />
            <span>Kiểm kê & Điều chỉnh</span>
          </NavLink>

          {/* Nhóm 3: Sơ Đồ & Vị Trí Kệ Kho */}
          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <>
              <div className="nav-section-title">Mặt Bằng, Kệ & Tầng Kho</div>
              <NavLink to="/warehouse-map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Map size={20} />
                <span>Sơ đồ Kệ kho</span>
              </NavLink>
              <NavLink to="/locations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Layers size={20} />
                <span>Danh mục Kệ kho</span>
              </NavLink>
            </>
          )}

          {/* Nhóm 4: Thông Báo & Báo Cáo */}
          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <>
              <div className="nav-section-title">Thông Báo & Báo Cáo</div>
              <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <FileText size={20} />
                <span>Báo cáo & Thống kê</span>
              </NavLink>
              <NavLink to="/alerts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Bell size={20} />
                <span>Cảnh báo Kho hàng</span>
                {unreadCount > 0 && (
                  <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: '#fff', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, minWidth: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            </>
          )}

          {/* Nhóm 5: Quản Trị Hệ Thống (Dành cho Admin) */}
          {user?.role === 'Admin' && (
            <>
              <div className="nav-section-title">Quản Trị Hệ Thống</div>
              <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={20} />
                <span>Quản lý Người dùng</span>
              </NavLink>
              <NavLink to="/role-management" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Shield size={20} />
                <span>Phân quyền Vai trò</span>
              </NavLink>
              <NavLink to="/system-health" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Activity size={20} />
                <span>Giám sát Hệ thống</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title="Tài khoản của tôi">
            {getImageUrl(user?.avatarUrl) ? (
              <img src={getImageUrl(user?.avatarUrl)} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
            ) : (
              <div className="avatar">{user?.fullname?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}</div>
            )}
            <div className="user-details">
              <span className="username" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }} title={user?.fullname || user?.email}>
                {user?.fullname || user?.email}
              </span>
              <span className="role">{user?.role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Đăng xuất">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="header-title">
            <h1 className="text-title" style={{ fontSize: '1.5rem', marginBottom: 0 }}>Xin chào trở lại, {user?.fullname || user?.email} 👋</h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button 
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={theme === 'light' ? 'Chuyển sang Chế độ Tối' : 'Chuyển sang Chế độ Sáng'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {(user?.role === 'Admin' || user?.role === 'Manager') && (
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="notification-btn"
                >
                  <Bell size={24} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="notification-dropdown">
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.3)' }}>
                      <h3 className="text-subtitle" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Thông báo mới</h3>
                    </div>
                  <div style={{ padding: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Không có thông báo mới nào.</p>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif._id} 
                          style={{
                            padding: '1rem',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '0.5rem',
                            cursor: 'pointer',
                            background: notif.isRead ? 'transparent' : 'var(--danger-light)',
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => !notif.isRead && markAsRead(notif._id)}
                        >
                          <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: notif.alertType === 'OVERSTOCK' ? 'var(--warning)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {!notif.isRead && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: notif.alertType === 'OVERSTOCK' ? 'var(--warning)' : 'var(--danger)' }}></span>}
                              {notif.alertType === 'OVERSTOCK' ? 'Cảnh báo Tồn quá nhiều' : 'Cảnh báo Thiếu tồn kho'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {new Date(notif.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notif._id);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-secondary)',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: '4px',
                                  transition: 'color 0.2s, background-color 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                            {(() => {
                              const msg = notif.message || '';
                              if (msg.includes('has fallen below the minimum stock level')) {
                                return `Sản phẩm ${notif.productName || ''} đã giảm xuống dưới mức tồn kho tối thiểu (Hiện tại: ${notif.currentStock} / Tối thiểu: ${notif.threshold}).`;
                              }
                              if (msg.includes('is running out of stock!')) {
                                return `Sản phẩm ${notif.productName || ''} sắp hết hàng trong kho! (Số lượng hiện tại: ${notif.currentStock}).`;
                              }
                              if (msg.includes('has exceeded the maximum stock level')) {
                                return `Sản phẩm ${notif.productName || ''} đã vượt quá mức tồn kho tối đa (Hiện tại: ${notif.currentStock} / Tối đa: ${notif.threshold}).`;
                              }
                              return msg;
                            })()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
        
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
