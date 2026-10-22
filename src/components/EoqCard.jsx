import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Settings2, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  PackageX, 
  ShoppingCart, 
  ArrowRight, 
  Info,
  Layers,
  TrendingDown
} from 'lucide-react';
import apiClient from '../api/client';

const fmtVND = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n || 0);

const SERVICE_LEVEL_OPTIONS = [
  { label: '90% (Khách hàng thông thường - Z = 1.28)', value: 0.90, z: 1.28 },
  { label: '95% (Chuẩn bán lẻ điện tử - Z = 1.65)', value: 0.95, z: 1.65 },
  { label: '99% (Hàng trọng yếu/Đặc biệt - Z = 2.33)', value: 0.99, z: 2.33 },
];

const EoqCard = ({ product, forecast }) => {
  // Configurable parameters
  const [orderingCost, setOrderingCost] = useState(50000); // S (VNĐ/đơn)
  const [holdingRatePct, setHoldingRatePct] = useState(20); // H (% đơn giá/năm)
  const [leadTime, setLeadTime] = useState(7); // L (ngày chờ hàng về)
  const [serviceLevel, setServiceLevel] = useState(0.95); // Z-score
  const [showSettings, setShowSettings] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('');

  // 1. Phân tích chuỗi dự báo từ AI
  const quantities = forecast && forecast.length
    ? forecast.map((f) => Number(f.predictedQuantity) || 0)
    : [];

  const totalForecastDemand = quantities.reduce((sum, q) => sum + q, 0);
  const avgDailyDemand = quantities.length > 0 ? totalForecastDemand / quantities.length : 0;
  
  // Tính độ lệch chuẩn nhu cầu ngày (sigma_d)
  let stdDailyDemand = 0;
  if (quantities.length > 1) {
    const variance = quantities.reduce((acc, q) => acc + Math.pow(q - avgDailyDemand, 2), 0) / (quantities.length - 1);
    stdDailyDemand = Math.sqrt(variance);
  }
  if (stdDailyDemand === 0 && avgDailyDemand > 0) {
    stdDailyDemand = avgDailyDemand * 0.2; // Ước lượng tối thiểu
  }

  // 2. Thông số kinh tế & Tồn kho
  const unitPrice = Number(product?.price) || 0;
  const currentStock = Number(product?.quantity) || 0;
  const holdingCostPerUnit = (holdingRatePct / 100) * unitPrice; // H
  const annualDemand = Math.max(1, avgDailyDemand * 365); // D

  // Z-score
  const selectedSL = SERVICE_LEVEL_OPTIONS.find((o) => o.value === serviceLevel) || SERVICE_LEVEL_OPTIONS[1];
  const zScore = selectedSL.z;

  // 3. Công thức Quyết định Tồn kho chuẩn (Mục 2.5 & 3.4 PDF)
  // Safety Stock (SS) = Z * sigma_d * sqrt(L)
  const safetyStock = Math.ceil(zScore * stdDailyDemand * Math.sqrt(leadTime));

  // Lead-time Demand = avgDailyDemand * L
  const leadTimeDemand = avgDailyDemand * leadTime;

  // Reorder Point (ROP) = (avgDailyDemand * L) + Safety Stock
  const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

  // EOQ = sqrt(2 * D * S / H)
  const canComputeEOQ = annualDemand > 0 && holdingCostPerUnit > 0;
  const eoq = canComputeEOQ ? Math.round(Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit)) : 0;

  // Tồn kho dự phóng sau kỳ dự báo (Projected Stock = Current Stock - Expected Demand)
  const projectedStock = Math.round((currentStock - totalForecastDemand) * 10) / 10;

  // 4. Phân loại Rủi ro & Đề xuất (Decision Logic)
  let riskStatus = 'OPTIMAL';
  let badgeColor = '#10b981';
  let statusTitle = 'Tồn kho an toàn & Tối ưu';
  let statusDesc = `Tồn kho hiện tại (${currentStock}) cao hơn điểm đặt hàng ROP (${reorderPoint}). Đủ hàng phục vụ an toàn cho kỳ tới.`;
  let isReorderNeeded = false;
  let recommendedQty = 0;

  if (projectedStock <= 0) {
    riskStatus = 'CRITICAL_STOCKOUT';
    badgeColor = '#ef4444';
    statusTitle = 'NGUY CƠ THIẾU HÀNG TRẦM TRỌNG (Stockout Risk)';
    statusDesc = `Nhu cầu dự báo (${totalForecastDemand.toFixed(1)} cái) vượt quá lượng hàng có sẵn (${currentStock} cái). Tồn kho dự phóng sẽ âm (${projectedStock})!`;
    isReorderNeeded = true;
    recommendedQty = Math.max(eoq, Math.ceil(Math.abs(projectedStock) + safetyStock));
  } else if (currentStock <= reorderPoint) {
    riskStatus = 'BELOW_ROP';
    badgeColor = '#f59e0b';
    statusTitle = 'DƯỚI NGƯỠNG ĐẶT HÀNG (Below ROP - Cần đặt bổ sung)';
    statusDesc = `Tồn kho (${currentStock}) đã giảm xuống dưới Điểm đặt hàng lại ROP (${reorderPoint}). Cần kích hoạt đặt hàng bổ sung theo chính sách.`;
    isReorderNeeded = true;
    recommendedQty = eoq;
  } else if (currentStock > 3 * (avgDailyDemand * 30) && currentStock > 50) {
    riskStatus = 'OVERSTOCK';
    badgeColor = '#8b5cf6';
    statusTitle = 'CẢNH BÁO DƯ THỪA TỒN KHO (Overstock)';
    statusDesc = `Tồn kho hiện tại (${currentStock}) vượt quá 3 tháng nhu cầu dự báo. Khuyến nghị giảm nhập để tránh ứ đọng vốn và chi phí lưu kho.`;
    isReorderNeeded = false;
    recommendedQty = 0;
  }

  // Xử lý xác nhận tạo đề xuất bổ sung hàng
  const handleConfirmReplenishment = async () => {
    if (!product?.id || recommendedQty <= 0) return;
    setIsOrdering(true);
    try {
      // Ghi nhận giao dịch INBOUND dạng PENDING vào Transaction Service
      await apiClient.post('/transactions', {
        productId: product.id,
        type: 'INBOUND',
        quantity: recommendedQty,
        note: `[Hệ Thống Ra Quyết Định Đề Xuất] Nhập bổ sung ${recommendedQty} món theo mô hình EOQ (ROP=${reorderPoint}, Tồn=${currentStock})`,
      });
      setOrderSuccessMsg(`Đã tạo thành công Đề xuất Nhập hàng ${recommendedQty} ${product.unit || 'sản phẩm'} vào danh sách giao dịch!`);
      setTimeout(() => setOrderSuccessMsg(''), 6000);
    } catch (err) {
      console.error('Lỗi khi tạo đề xuất bổ sung:', err);
      alert('Không thể tạo đề xuất bổ sung hàng: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsOrdering(false);
    }
  };

  const MetricItem = ({ label, value, sub, highlight, color }) => (
    <div style={{
      padding: '0.9rem 1rem',
      background: 'var(--bg-primary)',
      borderRadius: '12px',
      border: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.2rem'
    }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{label}</span>
      <strong style={{ fontSize: highlight ? '1.45rem' : '1.15rem', color: color || (highlight ? 'var(--accent-primary)' : 'var(--text-primary)') }}>
        {value}
      </strong>
      {sub && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{sub}</span>}
    </div>
  );

  return (
    <div className="card" style={{ border: `1px solid ${badgeColor}33`, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldAlert size={24} color={badgeColor} />
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
              Hỗ Trợ Ra Quyết Định Tồn Kho (Inventory Decision Support)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Kết hợp Dự báo AI + Tồn kho an toàn (SS) + Điểm đặt lại (ROP) + Lượng đặt kinh tế (EOQ)
            </span>
          </div>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => setShowSettings((s) => !s)}
          style={{ padding: '0.45rem 0.75rem', background: showSettings ? 'var(--accent-light)' : 'transparent' }}
          title="Tùy chỉnh thông số bài toán tồn kho"
        >
          <Settings2 size={16} /> <span style={{ fontSize: '0.82rem', marginLeft: '4px' }}>Tham số</span>
        </button>
      </div>

      {/* Settings Form */}
      {showSettings && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          padding: '1rem',
          background: 'var(--bg-primary)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
              Thời gian giao hàng (Lead Time - L)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              className="form-input"
              value={leadTime}
              onChange={(e) => setLeadTime(Math.max(1, Number(e.target.value)))}
              style={{ padding: '0.45rem 0.65rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
              Mức phục vụ (Service Level - Z)
            </label>
            <select
              className="form-input"
              value={serviceLevel}
              onChange={(e) => setServiceLevel(Number(e.target.value))}
              style={{ padding: '0.45rem 0.65rem' }}
            >
              {SERVICE_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
              Chi phí đặt đơn (S - VNĐ)
            </label>
            <input
              type="number"
              min="1000"
              step="5000"
              className="form-input"
              value={orderingCost}
              onChange={(e) => setOrderingCost(Number(e.target.value))}
              style={{ padding: '0.45rem 0.65rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
              Tỷ lệ lưu kho hàng năm (H - %)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              className="form-input"
              value={holdingRatePct}
              onChange={(e) => setHoldingRatePct(Number(e.target.value))}
              style={{ padding: '0.45rem 0.65rem' }}
            />
          </div>
        </div>
      )}

      {/* Decision Banner (Phân loại rủi ro & Hành động) */}
      <div style={{
        padding: '1.1rem 1.25rem',
        borderRadius: '12px',
        background: `${badgeColor}12`,
        border: `1.5px solid ${badgeColor}`,
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', maxWidth: '680px' }}>
          {riskStatus === 'CRITICAL_STOCKOUT' && <ShieldAlert size={28} color={badgeColor} style={{ flexShrink: 0, marginTop: '2px' }} />}
          {riskStatus === 'BELOW_ROP' && <AlertTriangle size={28} color={badgeColor} style={{ flexShrink: 0, marginTop: '2px' }} />}
          {riskStatus === 'OPTIMAL' && <CheckCircle2 size={28} color={badgeColor} style={{ flexShrink: 0, marginTop: '2px' }} />}
          {riskStatus === 'OVERSTOCK' && <PackageX size={28} color={badgeColor} style={{ flexShrink: 0, marginTop: '2px' }} />}
          <div>
            <strong style={{ fontSize: '1rem', color: badgeColor, display: 'block', marginBottom: '0.2rem' }}>
              {statusTitle}
            </strong>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {statusDesc}
            </span>
          </div>
        </div>

        {/* Action Button: Replenish recommendation */}
        {isReorderNeeded && (
          <div>
            <button
              className="btn btn-primary"
              onClick={handleConfirmReplenishment}
              disabled={isOrdering}
              style={{
                background: badgeColor,
                borderColor: badgeColor,
                padding: '0.6rem 1.1rem',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: `0 4px 12px ${badgeColor}40`
              }}
            >
              <ShoppingCart size={16} />
              {isOrdering ? 'Đang tạo đề xuất...' : `Đặt bổ sung ngay (${recommendedQty} món)`}
            </button>
          </div>
        )}
      </div>

      {orderSuccessMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#10b98120', border: '1px solid #10b981', borderRadius: '10px', color: '#10b981', fontSize: '0.85rem', marginBottom: '1rem' }}>
          ✓ {orderSuccessMsg}
        </div>
      )}

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
        <MetricItem
          label="Tồn kho thực tế (On-hand)"
          value={`${currentStock} ${product?.unit || 'món'}`}
          color="var(--accent-primary)"
          sub={`Ngưỡng tối thiểu: ${product?.minStockLevel || 20}`}
        />

        <MetricItem
          label="Tồn kho an toàn (Safety Stock)"
          value={`${safetyStock} ${product?.unit || 'món'}`}
          color="#3b82f6"
          sub={`Z = ${zScore} · Độ lệch σ = ${stdDailyDemand.toFixed(1)}`}
          highlight
        />

        <MetricItem
          label="Điểm đặt hàng lại (ROP)"
          value={`${reorderPoint} ${product?.unit || 'món'}`}
          color="#f59e0b"
          sub={`Lead-time demand: ${leadTimeDemand.toFixed(1)}`}
          highlight
        />

        <MetricItem
          label="Lượng đặt tối ưu (EOQ)"
          value={`${eoq} ${product?.unit || 'món'}`}
          color="#10b981"
          sub="Cân bằng chi phí đặt & lưu kho"
          highlight
        />

        <MetricItem
          label="Nhu cầu TB (AI Dự Báo)"
          value={`${avgDailyDemand.toFixed(1)}/ngày`}
          color="var(--text-primary)"
          sub={`Tổng ${quantities.length} ngày: ${totalForecastDemand.toFixed(0)}`}
        />

        <MetricItem
          label="Tồn kho dự phóng"
          value={`${projectedStock} ${product?.unit || 'món'}`}
          color={projectedStock <= 0 ? '#ef4444' : 'var(--text-primary)'}
          sub={`Sau ${quantities.length} ngày tới`}
        />
      </div>

      {/* Academic theory explanation note (Theo đúng Section 1 & 2.5 của Đề tài) */}
      <div style={{
        marginTop: '1.25rem',
        padding: '0.85rem 1rem',
        background: 'var(--bg-primary)',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
          <Info size={14} color="var(--accent-primary)" />
          <span>Nguyên tắc quản trị tồn kho lý thuyết:</span>
        </div>
        • <b>Điểm đặt hàng lại (ROP = {reorderPoint}):</b> Trả lời câu hỏi <i>"Khi nào nên đặt?"</i>. Khi tồn kho giảm xuống bằng hoặc dưới ROP, hệ thống cảnh báo cần đặt hàng ngay.<br />
        • <b>Lượng đặt hàng kinh tế (EOQ = {eoq}):</b> Trả lời câu hỏi <i>"Nên đặt bao nhiêu?"</i> để tổng chi phí lưu kho ({fmtVND(holdingCostPerUnit)}/năm) và chi phí đặt hàng ({fmtVND(orderingCost)}/đơn) là tối ưu nhất. <u>Không dùng EOQ làm ngưỡng đặt hàng</u>.<br />
        • <b>Tồn kho an toàn (Safety Stock = {safetyStock}):</b> Đóng vai trò là gối đệm bảo hiểm bảo vệ kho trước sự biến động ngẫu nhiên của nhu cầu khách hàng.
      </div>
    </div>
  );
};

export default EoqCard;
