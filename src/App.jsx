import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import ProductDetails from './pages/ProductDetails';
import Transactions from './pages/Transactions';
import StockAdjustment from './pages/StockAdjustment';
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import SystemHealth from './pages/SystemHealth';
import Profile from './pages/Profile';
import RoleManagement from './pages/RoleManagement';
import WarehouseMap from './pages/WarehouseMap';
import LocationManagement from './pages/LocationManagement';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<Layout />}>
            {/* Dashboard / Trang chủ */}
            <Route element={<ProtectedRoute requiredPermission="reports:read" allowedRoles={['Admin', 'Manager']} />}>
              <Route path="/" element={<Dashboard />} />
            </Route>

            {/* Sơ đồ & Danh mục Kệ kho */}
            <Route element={<ProtectedRoute requiredPermission="locations:read" allowedRoles={['Admin', 'Manager']} />}>
              <Route path="/warehouse-map" element={<WarehouseMap />} />
              <Route path="/locations" element={<LocationManagement />} />
            </Route>

            {/* Báo cáo & Thống kê */}
            <Route element={<ProtectedRoute requiredPermission="reports:read" allowedRoles={['Admin', 'Manager']} />}>
              <Route path="/reports" element={<Reports />} />
            </Route>

            {/* Cảnh báo kho hàng */}
            <Route element={<ProtectedRoute requiredPermission="alerts:read" allowedRoles={['Admin', 'Manager']} />}>
              <Route path="/alerts" element={<Alerts />} />
            </Route>

            {/* Vận hành Kho hàng */}
            <Route element={<ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']} />}>
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/inventory/:sku" element={<ProductDetails />} />
              <Route path="/products/:sku" element={<ProductDetails />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/adjustments" element={<StockAdjustment />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Quản trị Hệ thống */}
            <Route element={<ProtectedRoute requiredPermission="users:read" allowedRoles={['Admin']} />}>
              <Route path="/users" element={<UserManagement />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="/role-management" element={<RoleManagement />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="system:read" allowedRoles={['Admin']} />}>
              <Route path="/system-health" element={<SystemHealth />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
