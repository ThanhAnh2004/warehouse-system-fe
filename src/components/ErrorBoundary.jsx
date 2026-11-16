import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          margin: '1.5rem',
          color: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <AlertTriangle size={28} color="#ef4444" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#f87171' }}>
              Đã xảy ra lỗi hiển thị giao diện
            </h2>
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Chi tiết lỗi kỹ thuật:
          </p>
          <pre style={{
            background: '#0f172a',
            padding: '1rem',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.85rem',
            overflowX: 'auto',
            border: '1px solid #334155',
            whiteSpace: 'pre-wrap'
          }}>
            {this.state.error?.toString()}
          </pre>
          {this.state.errorInfo?.componentStack && (
            <details style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Xem Component Stack Trace</summary>
              <pre style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', overflowX: 'auto' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button
            className="btn btn-primary"
            onClick={() => {
              // Cache-busting reload
              window.location.href = window.location.pathname + '?_t=' + Date.now();
            }}
            style={{ marginTop: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={16} /> Tải lại trang (Làm mới)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
