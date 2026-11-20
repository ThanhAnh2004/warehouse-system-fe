/**
 * Công thức tính toán & gợi ý Ngưỡng báo thiếu (Min Stock Level) khoa học:
 * 1. Định mức tiêu thụ ngành hàng (Category Benchmark):
 *    - Tốc độ bán bình quân hàng ngày (d_avg) x Thời gian giao hàng Lead Time (L = 7 ngày) x Hệ số đệm an toàn (k = 1.2).
 * 2. Phân khúc giá trị hàng hóa (Price / ABC Tier):
 *    - Giá trị rất cao (> 15tr): Giữ ít (3 - 5 chiếc) để tối ưu vốn.
 *    - Giá trị cao (5tr - 15tr): 6 - 10 chiếc.
 *    - Giá trị trung bình (1tr - 5tr): 10 - 15 chiếc.
 *    - Giá trị thấp (< 1tr): 20 - 30 chiếc.
 * 3. Tỷ lệ lô hàng khởi tạo (Initial Batch): 20% - 25% nếu có nhập số lượng ban đầu.
 */

export const CATEGORY_BENCHMARKS = {
  'Điện thoại & Tablet': { dailyAvg: 1.2, baseMin: 10, note: 'Tốc độ quay vòng cao, chu kỳ luân chuyển 7 ngày' },
  'Laptop & Máy tính': { dailyAvg: 0.8, baseMin: 7, note: 'Giá trị cao, ưu tiên tối ưu chi phí vốn lưu kho' },
  'Tivi & Thiết bị giải trí': { dailyAvg: 0.6, baseMin: 5, note: 'Hàng cồng kềnh, tồn an toàn mức vừa phải' },
  'Tủ lạnh & Điện lạnh': { dailyAvg: 0.5, baseMin: 5, note: 'Hàng cồng kềnh chiếm diện tích, Min tinh gọn' },
  'Máy giặt & Gia dụng lớn': { dailyAvg: 0.5, baseMin: 5, note: 'Hàng gia dụng diện tích lớn' },
  'Phụ kiện & Thiết bị đeo': { dailyAvg: 3.2, baseMin: 25, note: 'Hàng tiêu dùng nhanh, giá rẻ, Min cao tránh đứt hàng' },
  'Linh kiện & Bán dẫn': { dailyAvg: 2.5, baseMin: 20, note: 'Vật tư thay thế, Min đủ đáp ứng sửa chữa' },
  'Khác': { dailyAvg: 1.0, baseMin: 10, note: 'Áp dụng định mức tiêu chuẩn kho' }
};

export const calculateSuggestedMinStock = ({ category, price, initialQuantity }) => {
  const catInfo = CATEGORY_BENCHMARKS[category] || CATEGORY_BENCHMARKS['Khác'];
  const numPrice = Number(price) || 0;
  const numQty = Number(initialQuantity) || 0;

  let suggested = catInfo.baseMin;
  let rationale = `Định mức theo nhóm [${category}] (~${catInfo.dailyAvg} món/ngày)`;

  // Điều chỉnh theo phân khúc giá (Price Tier)
  if (numPrice >= 20000000) {
    suggested = Math.min(suggested, 4);
    rationale += ' · Giảm Min do đơn giá cao (>20tr) giúp tránh chôn vốn';
  } else if (numPrice >= 10000000) {
    suggested = Math.min(suggested, 6);
    rationale += ' · Cân đối Min theo đơn giá cận cao cấp (10-20tr)';
  } else if (numPrice > 0 && numPrice <= 500000) {
    suggested = Math.max(suggested, 20);
    rationale += ' · Tăng Min do phụ kiện/hàng giá rẻ (<500k)';
  }

  // Nếu người dùng nhập lô hàng khởi tạo lớn (> 50 cái), đảm bảo Min tối thiểu 20%
  if (numQty >= 30) {
    const qty20Pct = Math.round(numQty * 0.2);
    if (qty20Pct > suggested) {
      suggested = qty20Pct;
      rationale += ` · Điều chỉnh theo 20% lượng nhập ban đầu (${numQty} món)`;
    }
  }

  return {
    suggestedMin: Math.max(1, suggested),
    rationale
  };
};
