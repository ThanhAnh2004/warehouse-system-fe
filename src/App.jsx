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
import UserManagement from './pages/UserManagement';
import Reports from './pages/Reports';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<Layout />}>
            <Route element={<ProtectedRoute allowedRoles={['Admin', 'Manager']} />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/reports" element={<Reports />} />
            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={['Admin', 'Manager', 'Staff']} />}>
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/inventory/:sku" element={<ProductDetails />} />
              <Route path="/transactions" element={<Transactions />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="/users" element={<UserManagement />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
