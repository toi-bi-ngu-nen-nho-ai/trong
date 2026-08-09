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

// Màu dự phòng, chỉ dùng khi chưa đọc được biến CSS (biến --c-surface trong index.css mới là
// nguồn thật). Phải khớp đúng giá trị --c-surface của từng bản.
const SURFACE_FALLBACK = { light: "#ffffff", dark: "#14162c" }

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement
  if (mode === "auto") root.removeAttribute("data-theme")
  else root.setAttribute("data-theme", mode)

  // Thanh trạng thái của máy lấy màu từ thẻ <meta name="theme-color">. Từ khi bỏ
  // `black-translucent` (xem index.html để biết vì sao — nó là nguyên nhân gốc của khoảng trống ở
  // đáy màn hình iPhone), vùng thanh trạng thái KHÔNG còn trong suốt nữa mà được tô bằng đúng màu
  // này. Nên nó phải bằng --c-surface (nền phần đầu app) thì dải trên cùng mới liền mạch với app
  // thay vì thành một vạch màu lạ vắt ngang đỉnh màn hình.
  //
  // Đọc thẳng từ biến CSS thay vì chép cứng mã màu: trước đây hàm này ghi cứng #00766e/#0c1919 —
  // teal đời đầu, sót lại qua HAI lần đổi bảng màu (teal → azure → indigo). Tệ hơn, nó chạy lúc
  // khởi động nên ÂM THẦM GHI ĐÈ giá trị đúng đặt trong index.html: sửa ở đó không bao giờ có tác
  // dụng. Đọc từ --c-surface thì không còn nguồn sự thật thứ hai nào để lệch nữa.
  const dark = mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  const surface =
    getComputedStyle(root).getPropertyValue("--c-surface").trim() || SURFACE_FALLBACK[dark ? "dark" : "light"]
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute("content", surface)
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
