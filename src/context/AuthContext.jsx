import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import Cookies from 'js-cookie';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const performLoginState = (token, refreshToken) => {
    // Decode JWT token to get user info
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userData = { 
      email: payload.email, 
      id: payload.sub, 
      role: payload.role, 
      permissions: payload.permissions || [],
      fullname: payload.fullname 
    };
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (refreshToken) {
      Cookies.set('refreshToken', refreshToken, { expires: 30 }); // expires in 30 days
    }
    setUser(userData);
    return userData;
  };

  const refreshAuthToken = async (refreshToken) => {
    try {
      const response = await apiClient.post('/auth/refresh', { refreshToken });
      if (response.data.success && response.data.token) {
        performLoginState(response.data.token, response.data.refreshToken);
        return true;
      }
    } catch (e) {
      console.error("Failed to refresh token", e);
    }
    return false;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const refreshToken = Cookies.get('refreshToken');

      // Attempt to load from localStorage first
      if (token && storedUser && storedUser !== "undefined") {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse stored user", e);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } else if (refreshToken) {
        // If no token but we have a refresh token, try to refresh
        await refreshAuthToken(refreshToken);
      }
      setLoading(false);
    };

    initializeAuth();

    const handleUnauthorized = async () => {
      const refreshToken = Cookies.get('refreshToken');
      if (refreshToken) {
        // Try refreshing if access token expires
        const refreshed = await refreshAuthToken(refreshToken);
        if (refreshed) {
          // Note: The failed request would need to be retried here ideally,
          // but for simplicity, we just refresh state so the user can click again.
          return;
        }
      }
      // If no refresh token or refresh failed, log out entirely
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (!response.data.success || !response.data.token) {
       throw new Error(response.data.message || 'Login failed');
    }
    
    return performLoginState(response.data.token, response.data.refreshToken);
  };

  const logout = async () => {
    const refreshToken = Cookies.get('refreshToken');
    const userStored = localStorage.getItem('user');
    
    // Attempt backend logout if possible
    if (userStored || refreshToken) {
       let userId;
       try { userId = JSON.parse(userStored)?.id; } catch(e){}
       
       try {
         await apiClient.post('/auth/logout', { userId, refreshToken });
       } catch (e) {
         console.error("Backend logout failed", e);
       }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    Cookies.remove('refreshToken');
    setUser(null);
  };

  const updateUser = (newUserData) => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const updated = { ...JSON.parse(storedUser), ...newUserData };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

