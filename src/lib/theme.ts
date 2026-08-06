// ─── Chủ đề sáng / tối ────────────────────────────────────────────────────────
//
// Vì sao không chỉ dựa vào cài đặt hệ điều hành: người trực đêm hầu như luôn để điện thoại ở chế
// độ sáng vì mọi app khác dùng ban ngày — riêng app này thì mở nhiều nhất lúc 2 giờ sáng trong
// buồng bệnh đã tắt đèn. Bắt họ đổi cài đặt toàn máy chỉ để mở một app là bắt sai chỗ.
//
// Ba lựa chọn: "auto" (theo máy) là mặc định, "light"/"dark" là người dùng chốt cứng.
// Giá trị được ghi thẳng lên thuộc tính data-theme của thẻ <html>, nơi các biến --c-* trong
// index.css đọc ra.

export type ThemeMode = "auto" | "light" | "dark"

const KEY = "drtrong:theme"

export function loadTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === "light" || v === "dark" ? v : "auto"
  } catch {
    return "auto"
  }
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement
  if (mode === "auto") root.removeAttribute("data-theme")
  else root.setAttribute("data-theme", mode)

  // Thanh trạng thái của máy (và vùng tai thỏ khi chạy toàn màn hình) lấy màu từ thẻ này. Không
  // cập nhật thì bản tối vẫn còn một dải xanh sáng chạy ngang đỉnh màn hình.
  const dark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", dark ? "#0c1919" : "#00766e")
}

export function saveTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // Không lưu được thì lần mở sau quay về "auto" — chấp nhận được, không chặn việc dùng app.
  }
  applyTheme(mode)
}

export const THEME_LABELS: Record<ThemeMode, string> = {
  auto: "Tự động",
  light: "Sáng",
  dark: "Tối",
}
