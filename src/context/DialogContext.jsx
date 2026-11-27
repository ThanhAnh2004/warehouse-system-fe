import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, HelpCircle, X } from 'lucide-react';

const DialogContext = createContext(null);

const inferDialogMeta = (message = '', type, title) => {
  const msgLower = String(message).toLowerCase();

  let resolvedType = type;
  if (!resolvedType) {
    if (msgLower.includes('cảnh báo')) {
      resolvedType = 'warning';
    } else if (
      msgLower.includes('lỗi') ||
      msgLower.includes('thất bại') ||
      msgLower.includes('không thể') ||
      msgLower.includes('không khớp') ||
      msgLower.includes('không được') ||
      msgLower.includes('không tìm thấy')
    ) {
      resolvedType = 'error';
    } else if (
      msgLower.includes('vui lòng') ||
      msgLower.includes('phải lớn hơn') ||
      msgLower.includes('chỉ được chứa')
    ) {
      resolvedType = 'warning';
    } else if (
      msgLower.includes('thành công') ||
      msgLower.includes('🎉') ||
      msgLower.includes('đã thêm') ||
      msgLower.includes('đã cập nhật') ||
      msgLower.includes('đã xóa') ||
      msgLower.includes('đã phê duyệt') ||
      msgLower.includes('đã tiếp nhận') ||
      msgLower.includes('đã xuất kho')
    ) {
      resolvedType = 'success';
    } else {
      resolvedType = 'info';
    }
  }

  let resolvedTitle = title;
  if (!resolvedTitle) {
    if (resolvedType === 'success') resolvedTitle = 'Thông Báo Thành Công';
    else if (resolvedType === 'error') resolvedTitle = 'Thông Báo Lỗi';
    else if (resolvedType === 'warning') resolvedTitle = 'Lưu Ý Hệ Thống';
    else resolvedTitle = 'Thông Báo Hệ Thống';
  }

  return { resolvedType, resolvedTitle };
};

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState(null);
  const resolverRef = useRef(null);

  const closeDialog = useCallback((result) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setDialogState(null);
  }, []);

  const showAlert = useCallback((message, typeOrOptions, explicitTitle) => {
    return new Promise((resolve) => {
      if (resolverRef.current) {
        resolverRef.current(false);
      }
      resolverRef.current = resolve;

      let type;
      let title = explicitTitle;
      if (typeOrOptions && typeof typeOrOptions === 'object') {
        type = typeOrOptions.type;
        title = typeOrOptions.title || title;
      } else {
        type = typeOrOptions;
      }

      const { resolvedType, resolvedTitle } = inferDialogMeta(message, type, title);
      setDialogState({
        mode: 'alert',
        type: resolvedType,
        title: resolvedTitle,
        message: String(message || ''),
        confirmText: 'Đã hiểu & Xác nhận',
      });
    });
  }, []);

  const showConfirm = useCallback((message, titleOrOptions = {}) => {
    return new Promise((resolve) => {
      if (resolverRef.current) {
        resolverRef.current(false);
      }
      resolverRef.current = resolve;

      const opts = typeof titleOrOptions === 'string' ? { title: titleOrOptions } : titleOrOptions;
      const msgLower = String(message || '').toLowerCase();
      const isDanger = opts.variant === 'danger' || msgLower.includes('xóa') || msgLower.includes('vĩnh viễn');

      setDialogState({
        mode: 'confirm',
        type: isDanger ? 'warning' : opts.variant || 'confirm',
        title: opts.title || 'Xác Nhận Thao Tác',
        message: String(message || ''),
        confirmText: opts.confirmText || 'Xác Nhận',
        cancelText: opts.cancelText || 'Hủy Bỏ',
        isDanger,
      });
    });
  }, []);

  // Expose global fallback for non-hook utilities if needed
  useEffect(() => {
    window.__appShowAlert = showAlert;
    window.__appShowConfirm = showConfirm;
    return () => {
      delete window.__appShowAlert;
      delete window.__appShowConfirm;
    };
  }, [showAlert, showConfirm]);

  // Keyboard shortcuts (Escape / Enter)
  useEffect(() => {
    if (!dialogState) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDialog(false);
      } else if (e.key === 'Enter' && dialogState.mode === 'alert') {
        e.preventDefault();
        closeDialog(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogState, closeDialog]);

  const getVisuals = (state) => {
    if (!state) return {};
    switch (state.type) {
      case 'success':
        return {
          bg: 'rgba(22, 163, 74, 0.14)',
          color: '#16a34a',
          icon: <CheckCircle2 size={34} />,
          btnBg: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
        };
      case 'error':
        return {
          bg: 'rgba(239, 68, 68, 0.14)',
          color: '#ef4444',
          icon: <AlertCircle size={34} />,
          btnBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          icon: <AlertTriangle size={34} />,
          btnBg: state.isDanger
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
        };
      case 'confirm':
        return {
          bg: 'rgba(59, 130, 246, 0.14)',
          color: '#3b82f6',
          icon: <HelpCircle size={34} />,
          btnBg: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
        };
      default:
        return {
          bg: 'rgba(56, 189, 248, 0.14)',
          color: '#0284c7',
          icon: <Info size={34} />,
          btnBg: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
        };
    }
  };

  const visuals = getVisuals(dialogState);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {dialogState &&
        ReactDOM.createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(15, 23, 42, 0.68)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999999,
              padding: '1rem',
              margin: 0,
              boxSizing: 'border-box',
            }}
            onClick={() => closeDialog(false)}
          >
            <div
              className="animate-scale-in"
              role="dialog"
              aria-modal="true"
              style={{
                position: 'relative',
                background: 'var(--bg-secondary, #ffffff)',
                borderRadius: '18px',
                maxWidth: '440px',
                width: '92%',
                padding: '1.75rem',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
                border: '1.5px solid var(--border-color)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => closeDialog(false)}
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  background: 'var(--bg-primary, #f1f5f9)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={15} />
              </button>

              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: '50%',
                  background: visuals.bg,
                  color: visuals.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {visuals.icon}
              </div>

              <div style={{ width: '100%' }}>
                <h3
                  style={{
                    margin: '0 0 0.45rem 0',
                    fontSize: '1.18rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  {dialogState.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.92rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-line',
                    wordBreak: 'break-word',
                  }}
                >
                  {dialogState.message}
                </p>
              </div>

              {dialogState.mode === 'confirm' ? (
                <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => closeDialog(false)}
                    style={{
                      flex: 1,
                      padding: '0.68rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      justifyContent: 'center',
                      borderRadius: '10px',
                    }}
                  >
                    {dialogState.cancelText}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => closeDialog(true)}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '0.68rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      justifyContent: 'center',
                      borderRadius: '10px',
                      background: visuals.btnBg,
                      border: 'none',
                      color: '#ffffff',
                    }}
                  >
                    {dialogState.confirmText}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => closeDialog(true)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.68rem 1rem',
                    fontWeight: 600,
                    fontSize: '0.92rem',
                    justifyContent: 'center',
                    borderRadius: '10px',
                    marginTop: '0.35rem',
                    background: visuals.btnBg,
                    border: 'none',
                    color: '#ffffff',
                  }}
                >
                  {dialogState.confirmText}
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return ctx;
};
