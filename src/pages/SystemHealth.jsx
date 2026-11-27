import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { Server, Database, Cpu, Box, Radio, RefreshCw, CheckCircle2, XCircle, Activity, ExternalLink, RotateCcw, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';

const CATEGORY_META = {
  gateway: { label: 'API Gateway', icon: Radio },
  microservice: { label: 'Microservice', icon: Server },
  python: { label: 'Dịch Vụ AI Python', icon: Cpu },
  database: { label: 'Cơ Sở Dữ Liệu', icon: Database },
  broker: { label: 'Event Streaming & Broker', icon: Box },
};

const SystemHealth = () => {
  const { hasPermission } = useContext(AuthContext);
  const { showAlert, showConfirm } = useDialog();
  const canManageSystem = hasPermission('system:manage');
  const [data, setData] = useState(null);
  const [busData, setBusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const fetchHealth = async () => {
    try {
      setError('');
      const [healthRes, busRes] = await Promise.all([
        apiClient.get('/system/health'),
        apiClient.get('/system/message-bus/status').catch(() => null),
      ]);
      setData(healthRes.data);
      if (busRes?.data) setBusData(busRes.data);
    } catch (err) {
      console.error('Failed to fetch system health:', err);
      setError(err.response?.data?.message || 'Không thể lấy dữ liệu giám sát hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRequeueDlq = async (dlqName, targetQueue) => {
    try {
      setActionMessage(`Đang đẩy lại tin nhắn từ ${dlqName}...`);
      const res = await apiClient.post('/system/message-bus/requeue-dlq', { dlqName, targetQueue });
      showAlert(res.data.message);
      fetchHealth();
    } catch (err) {
      showAlert('Lỗi khi Replay DLQ: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionMessage('');
    }
  };

  const handlePurgeQueue = async (queueName) => {
    if (!(await showConfirm(`Bạn có chắc chắn muốn xóa toàn bộ tin nhắn lỗi trong hàng đợi [${queueName}]?`))) return;
    try {
      setActionMessage(`Đang xóa dọn dẹp hàng đợi ${queueName}...`);
      const res = await apiClient.post('/system/message-bus/purge-queue', { queueName });
      showAlert(res.data.message);
      fetchHealth();
    } catch (err) {
      showAlert('Lỗi khi dọn dẹp hàng đợi: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionMessage('');
    }
  };

  const summary = data?.summary;
  const allHealthy = summary && summary.down === 0;

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={28} color="var(--accent-primary)" />
          <h1 className="text-title" style={{ marginBottom: 0 }}>Giám Sát Hạ Tầng & Quản Lý Message Bus</h1>
        </div>
        <button className="btn btn-outline" onClick={fetchHealth} style={{ background: 'var(--bg-glass)' }}>
          <RefreshCw size={16} /> Làm Mới Trạng Thái
        </button>
      </div>

      {loading ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
          Đang kiểm tra toàn bộ Microservices & Hàng đợi RabbitMQ...
        </div>
      ) : error ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--danger)', padding: '2rem' }}>
          {error}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Trạng Thái Toàn Hệ Thống</p>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: allHealthy ? 'var(--success)' : 'var(--danger)' }}>
                  {allHealthy ? 'Hoạt Động Tốt' : 'Có Sự Cố'}
                </h3>
              </div>
              <div style={{ padding: '1rem', borderRadius: '50%', background: allHealthy ? 'var(--success-light)' : 'var(--danger-light)', color: allHealthy ? 'var(--success)' : 'var(--danger)' }}>
                {allHealthy ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Dịch Vụ Đang Chạy (UP)</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{summary.up}<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}> / {summary.total}</span></h3>
              </div>
              <div style={{ padding: '1rem', borderRadius: '50%', background: 'var(--success-light)', color: 'var(--success)' }}>
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p className="text-subtitle" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Dịch Vụ Bị Sập (DOWN)</p>
                <h3 style={{ fontSize: '2rem', fontWeight: 700, color: summary.down > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{summary.down}</h3>
              </div>
              <div style={{ padding: '1rem', borderRadius: '50%', background: 'var(--danger-light)', color: 'var(--danger)' }}>
                <XCircle size={24} />
              </div>
            </div>
          </div>

          {/* Microservices Grid */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 className="text-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                Danh Sách Dịch Vụ Hạ Tầng & Microservices
              </h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Tự động kiểm tra sức khỏe Heartbeat & TCP Ping thời gian thực toàn bộ 11 Containers
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea', border: '1px solid rgba(147, 51, 234, 0.3)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                ● Đã Tối Ưu Gộp Service
              </span>
              <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                ● 2 Service Mới (Cửa 01 & 02)
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
            {data.services.map((svc) => {
              const meta = CATEGORY_META[svc.category] || CATEGORY_META.microservice;
              const Icon = meta.icon;
              const isUp = svc.status === 'up';

              let noteColor = { bg: 'rgba(99, 102, 241, 0.1)', text: 'var(--accent-primary)', border: 'rgba(99, 102, 241, 0.3)' };
              if (svc.note?.includes('Đã gộp')) {
                noteColor = { bg: 'rgba(147, 51, 234, 0.12)', text: '#9333ea', border: 'rgba(147, 51, 234, 0.35)' };
              } else if (svc.note?.includes('Mới')) {
                noteColor = { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.35)' };
              } else if (svc.note?.includes('Streaming') || svc.note?.includes('Broker')) {
                noteColor = { bg: 'rgba(234, 88, 12, 0.12)', text: '#ea580c', border: 'rgba(234, 88, 12, 0.35)' };
              }

              return (
                <div
                  key={svc.name}
                  className="glass-card"
                  style={{
                    padding: '1.25rem',
                    borderLeft: `4px solid ${isUp ? 'var(--success)' : 'var(--danger)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div>
                    {/* Card Top */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                        <div style={{ color: 'var(--accent-primary)', background: 'var(--bg-primary, #f1f5f9)', padding: '7px', borderRadius: '10px', marginTop: 2 }}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.98rem', lineHeight: 1.3 }}>
                            {svc.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: 3, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                              {meta.label}
                            </span>
                            {svc.note && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: noteColor.bg,
                                  color: noteColor.text,
                                  border: `1px solid ${noteColor.border}`,
                                }}
                              >
                                {svc.note}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span
                        className="badge"
                        style={{
                          background: isUp ? 'var(--success-light)' : 'var(--danger-light)',
                          color: isUp ? 'var(--success)' : 'var(--danger)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isUp ? 'var(--success)' : 'var(--danger)' }}></span>
                        {isUp ? 'ĐANG CHẠY' : 'BỊ SẬP'}
                      </span>
                    </div>

                    {/* Card Description */}
                    {svc.description && (
                      <p style={{ margin: '0.5rem 0 0.85rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {svc.description}
                      </p>
                    )}
                  </div>

                  {/* Card Bottom Meta */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem' }}>
                    <span style={{ fontFamily: 'monospace' }}>{svc.host}:{svc.port}</span>
                    <span>Độ trễ: <strong style={{ color: isUp ? 'var(--success)' : 'var(--danger)' }}>{svc.latencyMs} ms</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Bus Error Management Section */}
          <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Box size={22} color="var(--accent-primary)" />
                  <h3 className="text-title" style={{ fontSize: '1.3rem', margin: 0 }}>Quản Lý Message Bus & Xử Lý Sự Cố Hàng Đợi (DLQ)</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Quản lý hàng đợi RabbitMQ, theo dõi lỗi Dead Letter Queue (DLQ) & khôi phục tin nhắn sự cố.
                </p>
              </div>

              <a
                href="http://localhost:15672"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ background: 'var(--bg-glass)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ExternalLink size={16} /> Mở RabbitMQ UI (Port 15672)
              </a>
            </div>

            {actionMessage && (
              <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {actionMessage}
              </div>
            )}

            {/* Queues & DLQ Table */}
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tên Dịch Vụ</th>
                    <th>Tên Hàng Đợi (Queue)</th>
                    <th>Kết Nối Lắng Nghe</th>
                    <th>Tin Nhắn Đang Chờ</th>
                    <th>Lỗi Hàng Đợi Thư Chết (DLQ)</th>
                    <th>Trạng Thái Queue</th>
                    {canManageSystem && <th style={{ textAlign: 'center' }}>Thao Tác Xử Lý Lỗi</th>}
                  </tr>
                </thead>
                <tbody>
                  {busData?.monitoredQueues?.map((q) => {
                    const hasErrors = q.dlqErrorCount > 0;
                    const isOnline = q.consumers > 0;

                    return (
                      <tr key={q.queue}>
                        <td style={{ fontWeight: 600 }}>{q.service}</td>
                        <td>
                          <code style={{ background: 'var(--bg-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>{q.queue}</code>
                        </td>
                        <td>
                          <span className={`badge ${isOnline ? 'badge-success' : 'badge-warning'}`}>
                            {q.consumers} Kết Nối Hoạt Động
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>{q.pendingMessages}</td>
                        <td>
                          {hasErrors ? (
                            <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={14} /> {q.dlqErrorCount} Tin nhắn lỗi
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>0 Lỗi (Sạch)</span>
                          )}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: hasErrors ? 'var(--danger-light)' : isOnline ? 'var(--success-light)' : 'var(--warning-light)',
                              color: hasErrors ? 'var(--danger)' : isOnline ? 'var(--success)' : 'var(--warning)',
                            }}
                          >
                            {hasErrors ? 'CÓ LỖI DLQ' : isOnline ? 'HOẠT ĐỘNG' : 'MẤT KẾT NỐI'}
                          </span>
                        </td>
                        {canManageSystem && (
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                className="btn btn-outline"
                                onClick={() => handleRequeueDlq(q.deadLetterQueue, q.queue)}
                                disabled={!hasErrors}
                                title="Thử lại toàn bộ tin nhắn lỗi trong Dead Letter Queue"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', opacity: hasErrors ? 1 : 0.4 }}
                              >
                                <RotateCcw size={14} /> Replay DLQ
                              </button>

                              <button
                                className="btn btn-outline"
                                onClick={() => handlePurgeQueue(q.deadLetterQueue)}
                                disabled={!hasErrors}
                                title="Xóa dọn dẹp Hàng đợi thư chết"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--danger)', opacity: hasErrors ? 1 : 0.4 }}
                              >
                                <Trash2 size={14} /> Clear DLQ
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={16} color="var(--success)" />
                <span>Dead Letter Exchange: <code>amq.direct</code> | Tự động kết nối lại: Đang bật (5s)</span>
              </div>
              <span>Kiểm tra lần cuối: {new Date().toLocaleTimeString('vi-VN')} · Tự động làm mới mỗi 8s</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemHealth;
