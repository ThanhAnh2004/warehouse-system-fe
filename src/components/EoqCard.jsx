import React, { useState } from 'react';
import { Calculator, Settings2 } from 'lucide-react';

/**
 * EOQ (Economic Order Quantity) - Mô hình lượng đặt hàng kinh tế.
 *
 * Công thức: EOQ = sqrt( (2 * D * S) / H )
 *   D = nhu cầu hằng năm (ước lượng từ số liệu DỰ BÁO: nhu cầu TB/ngày * 365)
 *   S = chi phí đặt 1 đơn hàng (ordering cost)
 *   H = chi phí lưu kho 1 đơn vị/năm = tỉ lệ lưu kho * đơn giá
 *
 * Hiện tính trực tiếp ở frontend từ dữ liệu dự báo + đơn giá. Khi Forecasting/EOQ
 * Service của backend cung cấp endpoint EOQ chính thức, chỉ cần thay khối tính toán
 * bằng dữ liệu trả về từ API (giữ nguyên phần hiển thị).
 */
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
          <h3 style={{ fontSize: '1.25rem' }}>EOQ - Optimal Order Quantity</h3>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => setShowSettings((s) => !s)}
          style={{ padding: '0.4rem 0.6rem', background: 'transparent' }}
          title="Adjust cost parameters"
        >
          <Settings2 size={16} />
        </button>
      </div>

      {showSettings && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '10px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Ordering cost (S) - VND</label>
            <input type="number" min="0" className="form-input" value={orderingCost} onChange={(e) => setOrderingCost(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Holding rate (H) - %/year</label>
            <input type="number" min="0" className="form-input" value={holdingRatePct} onChange={(e) => setHoldingRatePct(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Lead time - days</label>
            <input type="number" min="0" className="form-input" value={leadTime} onChange={(e) => setLeadTime(Number(e.target.value))} style={{ padding: '0.5rem 0.75rem' }} />
          </div>
        </div>
      )}

      {canCompute ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <Metric label="EOQ (units/order)" value={Math.round(eoq)} highlight />
            <Metric label="Reorder Point" value={Math.ceil(reorderPoint)} />
            <Metric label="Orders / year" value={ordersPerYear.toFixed(1)} />
            <Metric label="Order cycle (days)" value={Math.round(cycleDays)} />
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '0.75rem 1rem', background: 'var(--accent-light)', borderRadius: '10px' }}>
            Estimated annual demand (from forecast): <b>{Math.round(annualDemand)}</b> units ·
            Holding cost: <b>{fmtVND(holdingCostPerUnit)}</b>/unit/year ·
            Total annual cost at EOQ: <b>{fmtVND(totalAnnualCost)}</b>
          </div>
        </>
      ) : (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-primary)', borderRadius: '10px' }}>
          Not enough forecast/price data to compute EOQ. Ensure the product has outbound history and a unit price.
        </div>
      )}
    </div>
  );
};

export default EoqCard;
