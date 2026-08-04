import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Server, Database, Cpu, Box, Radio, RefreshCw, CheckCircle2, XCircle, Activity, ExternalLink, RotateCcw, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';

const CATEGORY_META = {
  gateway: { label: 'API Gateway', icon: Radio },
  microservice: { label: 'Microservice', icon: Server },
  python: { label: 'Dịch Vụ AI Python', icon: Cpu },
  database: { label: 'Cơ Sở Dữ Liệu', icon: Database },
  broker: { label: 'Message Broker', icon: Box },
};

const SystemHealth = () => {
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
      alert(res.data.message);
      fetchHealth();
    } catch (err) {
      alert('Lỗi khi Replay DLQ: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionMessage('');
    }
  };

  const handlePurgeQueue = async (queueName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ tin nhắn lỗi trong hàng đợi [${queueName}]?`)) return;
    try {
      setActionMessage(`Đang xóa dọn dẹp hàng đợi ${queueName}...`);
      const res = await apiClient.post('/system/message-bus/purge-queue', { queueName });
      alert(res.data.message);
      fetchHealth();
    } catch (err) {
      alert('Lỗi khi dọn dẹp hàng đợi: ' + (err.response?.data?.message || err.message));
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
          <h2 className="text-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Danh Sách Các Dịch Vụ Hạ Tầng (Microservices)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
            {data.services.map((svc) => {
              const meta = CATEGORY_META[svc.category] || CATEGORY_META.microservice;
              const Icon = meta.icon;
              const isUp = svc.status === 'up';
              return (
                <div key={svc.name} className="glass-card" style={{ padding: '1.25rem', borderLeft: `4px solid ${isUp ? 'var(--success)' : 'var(--danger)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ color: 'var(--accent-primary)' }}><Icon size={22} /></div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{svc.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{meta.label}</div>
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
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isUp ? 'var(--success)' : 'var(--danger)' }}></span>
                      {isUp ? 'ĐANG CHẠY' : 'BỊ ĐẮT'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>{svc.host}:{svc.port}</span>
                    <span>Độ trễ: {svc.latencyMs} ms</span>
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
                    <th style={{ textAlign: 'center' }}>Thao Tác Xử Lý Lỗi</th>
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
