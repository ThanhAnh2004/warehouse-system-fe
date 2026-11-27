import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext, getLandingPath, isSystemAdminUser } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles, requiredPermission, requiredAnyPermissions }) => {
  const { user, loading, hasPermission, hasAnyPermission } = useContext(AuthContext);

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
  if (isSystemAdminUser(user)) {
    return <Outlet />;
  }

  const fallback = getLandingPath(user);

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallback} replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={fallback} replace />;
  }

  if (requiredAnyPermissions && !hasAnyPermission(requiredAnyPermissions)) {
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
