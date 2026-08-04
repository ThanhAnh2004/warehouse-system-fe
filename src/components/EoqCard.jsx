import React, { useState } from 'react';
import { Calculator, Settings2 } from 'lucide-react';

const fmtVND = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

const EoqCard = ({ product, forecast }) => {
  const [orderingCost, setOrderingCost] = useState(100000); // S (VND/đơn)
  const [holdingRatePct, setHoldingRatePct] = useState(20); // % đơn giá/năm
  const [leadTime, setLeadTime] = useState(7); // ngày chờ hàng về
  const [showSettings, setShowSettings] = useState(false);

  const avgDailyDemand = forecast && forecast.length
    ? forecast.reduce((acc, f) => acc + (f.predictedQuantity || 0), 0) / forecast.length
    : 0;

  const annualDemand = avgDailyDemand * 365;
  const unitPrice = Number(product?.price) || 0;
  const holdingCostPerUnit = (holdingRatePct / 100) * unitPrice; // H
  const canCompute = annualDemand > 0 && holdingCostPerUnit > 0;

  const eoq = canCompute ? Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit) : 0;
  const ordersPerYear = eoq > 0 ? annualDemand / eoq : 0;
  const cycleDays = ordersPerYear > 0 ? 365 / ordersPerYear : 0;
  const reorderPoint = avgDailyDemand * leadTime;
  const totalAnnualCost = eoq > 0 ? (annualDemand / eoq) * orderingCost + (eoq / 2) * holdingCostPerUnit : 0;

  const Metric = ({ label, value, highlight }) => (
    <div style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{label}</span>
      <strong style={{ fontSize: highlight ? '1.6rem' : '1.1rem', color: highlight ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{value}</strong>
    </div>
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calculator size={22} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.25rem' }}>EOQ - Mô Hình Lượng Đặt Hàng Tối Ưu</h3>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => setShowSettings((s) => !s)}
          style={{ padding: '0.4rem 0.6rem', background: 'transparent' }}
          title="Tùy chỉnh thông số chi phí"
        >
          <Settings2 size={16} />
        </button>
      </div>

      {showSettings && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '10px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Chi phí đặt đơn (S) - VNĐ</label>
            <input type="number" min="0" className="form-input" value={orderingCost} onChange={(e) => setOrderingCost(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Tỷ lệ lưu kho (H) - %/năm</label>
            <input type="number" min="0" className="form-input" value={holdingRatePct} onChange={(e) => setHoldingRatePct(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Thời gian nhập hàng (ngày)</label>
            <input type="number" min="0" className="form-input" value={leadTime} onChange={(e) => setLeadTime(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem' }} />
          </div>
        </div>
      )}

      {canCompute ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <Metric label="Lượng đặt tối ưu (EOQ)" value={`${Math.round(eoq)} món`} highlight />
            <Metric label="Điểm đặt hàng lại (ROP)" value={`${Math.ceil(reorderPoint)} món`} />
            <Metric label="Số lần đặt / năm" value={`${ordersPerYear.toFixed(1)} lần`} />
            <Metric label="Chu kỳ đặt hàng" value={`${Math.round(cycleDays)} ngày`} />
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '0.75rem 1rem', background: 'var(--accent-light)', borderRadius: '10px' }}>
            Ước tính nhu cầu năm (từ AI dự báo): <b>{Math.round(annualDemand)}</b> sản phẩm ·
            Chi phí lưu kho: <b>{fmtVND(holdingCostPerUnit)}</b>/sản phẩm/năm ·
            Tổng chi phí quản lý kho năm tại điểm EOQ: <b>{fmtVND(totalAnnualCost)}</b>
          </div>
        </>
      ) : (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: '10px' }}>
          Chưa đủ dữ liệu lịch sử dự báo để tính toán EOQ. Cần có dữ liệu giao dịch xuất kho và đơn giá sản phẩm.
        </div>
      )}
    </div>
  );
};

export default EoqCard;
