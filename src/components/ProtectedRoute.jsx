import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // "/" chỉ dành cho Admin/Manager - nếu redirect thẳng về "/" cho Staff sẽ tạo vòng lặp
    // vô hạn (route đó cũng chặn Staff). Đưa về trang đầu tiên role đó chắc chắn xem được.
    const fallback = user.role === 'Staff' ? '/inventory' : '/';
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
