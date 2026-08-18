import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles, requiredPermission }) => {
  const { user, loading, hasPermission } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="loading-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin always has full access
  if (user.role === 'Admin') {
    return <Outlet />;
  }

  // Check if role is in allowedRoles
  const isRoleAllowed = !allowedRoles || allowedRoles.includes(user.role);

  // Check if user has required permission key
  const isPermAllowed = requiredPermission ? hasPermission(requiredPermission) : true;

  if (!isRoleAllowed && !isPermAllowed) {
    const fallback = user.permissions?.includes('stock:read') ? '/inventory' : '/login';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
