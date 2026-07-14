import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Package, ArrowLeftRight, LogOut, Users, FileText, Bell, Trash2, Sun, Moon } from 'lucide-react';
import apiClient from '../api/client';
import './Layout.css';

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
          {user?.role !== 'Staff' && (
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
          )}
          
          <NavLink to="/inventory" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Package size={20} />
            <span>Inventory</span>
          </NavLink>

          <NavLink to="/transactions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ArrowLeftRight size={20} />
            <span>Transactions</span>
          </NavLink>

          {user?.role === 'Admin' && (
            <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              <span>Users</span>
            </NavLink>
          )}

          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <FileText size={20} />
              <span>Reports</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }} title="My Account">
            <div className="avatar">{user?.fullname?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}</div>
            <div className="user-details">
              <span className="username" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }} title={user?.fullname || user?.email}>
                {user?.fullname || user?.email}
              </span>
              <span className="role">{user?.role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="header-title">
            <h1 className="text-title" style={{ fontSize: '1.5rem', marginBottom: 0 }}>Welcome back, {user?.fullname || user?.email} 👋</h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button 
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
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
                      <h3 className="text-subtitle" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Notifications</h3>
                    </div>
                  <div style={{ padding: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No new notifications.</p>
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
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {!notif.isRead && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)' }}></span>}
                              Low Stock Alert
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {new Date(notif.createdAt).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}
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
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{notif.message.replace('Sản phẩm', 'Product').replace('đã giảm xuống dưới mức an toàn', 'has fallen below the minimum stock level')}</p>
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
