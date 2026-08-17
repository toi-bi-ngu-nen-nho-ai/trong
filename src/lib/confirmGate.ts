// ─── Khoá xác nhận lần hai cho hành động hậu quả cao ───────────────────────────
//
// P0 (nợ thiết kế DungThuocScreen): xác nhận "liều gấp N lần bình thường" ở InfusionCalculator chỉ
// mở khoá NHÌN kết quả (biến `confirmed` cục bộ), không chặn hành động GHIM vào Đang truyền hay
// CHÉP câu Cách dùng — hai hành động có hậu quả cao hơn hẳn việc nhìn. Hai hàm này là quyết định
// thuần đứng sau khoá double-tap riêng cho hai nút đó (confirmPin/confirmCopyExtreme trong App.tsx).

// Chỉ liều severity high/extreme mới cần chạm xác nhận thứ hai — mức thấp hơn (above/below/
// far-below/unknown/ok) đã đủ an toàn với đúng một lần xác nhận NHÌN kết quả.
export function shouldRequireExtraConfirm(severity: string): boolean {
  return severity === "high" || severity === "extreme"
}

// armed: khoá đã được vũ trang từ chạm trước đó chưa (và còn hiệu lực — hết hạn thì gọi nơi khác
// tự đặt lại false, hàm này không biết gì về thời gian).
// needsConfirm: severity hiện tại có đòi khoá này không (shouldRequireExtraConfirm ở trên).
//
// "arm": chạm 1 khi cần khoá mà chưa vũ trang — chỉ đổi trạng thái nút, CHƯA chạy hành động thật.
// "execute": mọi trường hợp còn lại — không cần khoá (severity thấp), hoặc đã vũ trang từ chạm
// trước (chạm 2) — chạy hành động thật.
export function resolveConfirmTap(armed: boolean, needsConfirm: boolean): "arm" | "execute" {
  if (needsConfirm && !armed) return "arm"
  return "execute"
}
