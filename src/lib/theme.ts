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

// Chế độ đang áp — cần nhớ lại để chạy lại applyTheme() khi HỆ ĐIỀU HÀNH đổi sáng/tối trong lúc app
// đang mở ở chế độ "auto" (xem watchSystemTheme bên dưới).
let currentMode: ThemeMode = "auto"

export function applyTheme(mode: ThemeMode): void {
  currentMode = mode
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
  // querySelectorAll, KHÔNG phải querySelector: index.html khai BA thẻ theme-color (một cho
  // prefers-color-scheme light, một cho dark, một không điều kiện làm dự phòng — xem lý do ở đó).
  // querySelector trả về thẻ ĐẦU TIÊN, tức thẻ `media="(prefers-color-scheme: light)"` — nên chọn tay
  // "Sáng" trong lúc máy đang để chế độ TỐI chỉ ghi màu trắng vào một thẻ mà hệ điều hành không hề
  // đọc (nó đang khớp thẻ dark, giá trị #14162c cứng), còn chọn tay "Tối" trong lúc máy để chế độ
  // SÁNG thì ngược lại. Kết quả: dải thanh trạng thái ở đỉnh màn hình kẹt lại ở bản màu của HỆ ĐIỀU
  // HÀNH trong khi cả app đã đổi theo lựa chọn tay — nửa trên một màu, nửa dưới một màu.
  //
  // Ghi cùng một giá trị vào CẢ BA thẻ thì thẻ nào được hệ điều hành chọn cũng ra đúng màu, mà vẫn
  // giữ nguyên tác dụng của `media` lúc mở lạnh (trước khi JS kịp chạy) — xem index.html.
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  for (const meta of metas) meta.setAttribute("content", surface)
}

// Máy đổi sáng/tối trong lúc app đang mở: các biến --c-* tự đổi theo @media, nhưng thẻ theme-color thì
// không — applyTheme() đã ghi đè cả ba thẻ bằng một giá trị cố định ở trên, nên `media` không còn tự
// chọn giúp được nữa. Phải chạy lại để đọc --c-surface mới. Chỉ có ý nghĩa ở chế độ "auto"; hai chế độ
// chốt cứng không quan tâm hệ điều hành đang ở đâu.
export function watchSystemTheme(): () => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  const onChange = () => {
    if (currentMode === "auto") applyTheme("auto")
  }
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

export function saveTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // Không lưu được thì lần mở sau quay về "auto" — chấp nhận được, không chặn việc dùng app.
  }
  applyTheme(mode)
  // ─── PWA cài ra màn hình chính: thanh trạng thái không tự vẽ lại khi app đang chạy ──────────
  // applyTheme() ở trên đã ghi ĐÚNG màu vào cả ba thẻ theme-color, và mọi thứ TRONG trang đổi màu
  // ngay lập tức — nhưng đo được thực tế: khi app chạy standalone (đã "Thêm vào màn hình chính"),
  // bấm nút đổi chủ đề trong lúc app đang mở KHÔNG làm thanh trạng thái vẽ lại; phải tắt hẳn app rồi
  // mở lại nó mới đúng màu. Hệ điều hành chỉ đọc theme-color lúc MỞ app, không nghe JS sửa nội dung
  // thẻ meta khi app đang chạy — một giới hạn của chế độ standalone, không phải lỗi ở phép ghi trên.
  //
  // Tự động hoá đúng thao tác "tắt rồi mở lại" đó bằng reload. An toàn để làm NGAY Ở ĐÂY: nút đổi
  // chủ đề (ThemeToggle) chỉ hiện trên Trang chủ — không có ô nhập nào đang dở để mất, và bệnh nhân/
  // tab/thuốc đang chọn đều đã nằm trong localStorage/sessionStorage nên sau reload vẫn y nguyên
  // (xem lib/patient.ts, lib/uiState.ts). KHÔNG gọi ở applyTheme(): applyTheme() còn được main.tsx
  // gọi mỗi lần MỞ app — reload ở đó sẽ vòng lặp vô hạn ngay từ lúc mở.
  if (isStandalonePwa()) window.location.reload()
}

// Đang chạy như PWA đã cài ra màn hình chính (display: standalone trong manifest.json), hay đang mở
// trong một tab trình duyệt bình thường. `navigator.standalone` là API riêng của iOS Safari (media
// query display-mode không được vài bản iOS cũ hỗ trợ đầy đủ) — kiểm tra cả hai cho chắc.
function isStandalonePwa(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export const THEME_LABELS: Record<ThemeMode, string> = {
  auto: "Tự động",
  light: "Sáng",
  dark: "Tối",
}
