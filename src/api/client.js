import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 10000,
});

// Intercept request to add token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept response to handle generic errors (e.g. 401, 503, Network Error)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nếu là lỗi mất kết nối máy chủ / message bus
    if (!error.response || error.code === 'ERR_NETWORK' || error.response?.status === 503) {
      if (error.response?.data) {
        error.response.data.message = error.response.data.message || 'Lỗi: Mất kết nối đến hệ thống máy chủ hoặc Message Bus. Đang thử kết nối lại...';
      }
      window.dispatchEvent(new CustomEvent('wms:connection-lost', {
        detail: { message: 'Lỗi: Mất kết nối đến hệ thống máy chủ hoặc Message Bus. Đang thử kết nối lại...' }
      }));
    }

    if (error.response && error.response.status === 401) {
      // Chỉ logout khi token hết hạn thực sự
      const msg = error.response.data?.message || '';
      if (msg.includes('hết hạn') || msg.includes('không hợp lệ') || msg.includes('Missing') || msg.includes('Unauthorized')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
