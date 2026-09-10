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

// Chủ đề ĐÃ PHÂN GIẢI: "auto" đã được quy về một trong hai bản thật. Xem resolveTheme bên dưới.
export type ResolvedTheme = "light" | "dark"

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
const SURFACE_FALLBACK = { light: "#ffffff", dark: "#252525" }

// Chế độ đang áp — cần nhớ lại để chạy lại applyTheme() khi HỆ ĐIỀU HÀNH đổi sáng/tối trong lúc app
// đang mở ở chế độ "auto" (xem watchSystemTheme bên dưới).
let currentMode: ThemeMode = "auto"

// ─── Phân giải "auto" → "light" | "dark" ─────────────────────────────────────────────────────────
// Phép quy đổi này TRƯỚC ĐÂY chỉ tồn tại như một dòng cục bộ bên trong applyTheme(). Nó được tách
// ra thành hàm xuất khẩu vì bảng vẽ nhúng (src/board) cần đúng giá trị đó: bảng màu vendored khoá
// bản tối vào bộ chọn `[data-theme=dark]` và KHÔNG có nhánh `prefers-color-scheme` dự phòng, nên ở
// chế độ "auto" — lúc <html> cố tình KHÔNG mang data-theme — bảng vẽ đứng nguyên bản sáng dù máy
// đang tối. Bảng vẽ phải tự ghi một data-theme đã phân giải lên thẻ bọc của nó.
// Tách hàm, KHÔNG chép logic sang board: chính file này đã một lần mang lỗi màu cũ vì có nguồn sự
// thật thứ hai (xem chú thích #00766e bên dưới) — thêm một bản sao nữa là mời lại đúng loại lỗi đó.
export function resolveTheme(mode: ThemeMode = currentMode): ResolvedTheme {
  return mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ? "dark"
    : "light"
}

// Người nghe chủ đề đã phân giải. Không phải một đường thông báo THỨ HAI: applyTheme() dưới đây là
// nơi DUY NHẤT chủ đề thật sự đổi (main.tsx gọi lúc mở app, saveTheme gọi khi người dùng bấm nút,
// watchSystemTheme gọi khi hệ điều hành lật sáng/tối trong lúc app đang ở "auto"), nên phát tín
// hiệu ngay tại đó là bắt được trọn cả ba lối — không cần component nào tự nghe matchMedia riêng.
const nguoiNgheChuDe = new Set<(t: ResolvedTheme) => void>()

export function watchResolvedTheme(cb: (t: ResolvedTheme) => void): () => void {
  nguoiNgheChuDe.add(cb)
  return () => {
    nguoiNgheChuDe.delete(cb)
  }
}

export function applyTheme(mode: ThemeMode): void {
  currentMode = mode
  const root = document.documentElement
  const resolved = resolveTheme(mode)
  // Luôn ghi giá trị ĐÃ PHÂN GIẢI ("light"/"dark"), kể cả ở "auto" — không gỡ thuộc tính nữa.
  // Lý do: ThemeObserver của AFFiNE (dùng cho <editor-toolbar> của bảng vẽ nhúng) đọc data-theme
  // trên CHÍNH <html>, không đọc biến --c-* hay thẻ bọc riêng của bảng vẽ. Ở "auto", việc gỡ hẳn
  // thuộc tính khiến observer đó không thấy gì và bảng vẽ giữ nguyên toolbar sáng dù canvas đã tối
  // theo hệ điều hành. Ghi resolved — KHÔNG BAO GIỜ chuỗi "auto" — thì observer luôn thấy đúng bản
  // đã phân giải, còn CSS trong index.css vẫn ra đúng bảng màu cũ (xem hai bộ chọn
  // `:root:not([data-theme="light"])` trong khối `@media (prefers-color-scheme: dark)` và
  // `:root[data-theme="dark"]` — cả hai đều đã tương thích với giá trị "dark"/"light" tường minh,
  // không riêng gì trạng thái "không có thuộc tính").
  root.setAttribute("data-theme", resolved)

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
  const surface = getComputedStyle(root).getPropertyValue("--c-surface").trim() || SURFACE_FALLBACK[resolved]
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
  //
  // Từ 2026-09-04, một script NỘI TUYẾN trong <head> (index.html) đã làm đúng phép ghi này TRƯỚC
  // lần vẽ đầu tiên, nên tới lượt hàm này chạy thì ba thẻ thường đã đúng sẵn. Vòng lặp dưới đây
  // KHÔNG thừa: nó là đường DUY NHẤT cập nhật màu khi người dùng bấm đổi chủ đề hoặc khi hệ điều
  // hành lật sáng/tối trong lúc app đang mở — script nội tuyến chỉ chạy đúng một lần lúc tải trang.
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  for (const meta of metas) meta.setAttribute("content", surface)

  // iOS standalone KHÔNG đọc theme-color cho thanh trạng thái — chỉ đọc thẻ Apple này (xem chú
  // thích dài tại thẻ đó trong index.html). Ba giá trị cố định, không nhận mã màu.
  // Tối  → 'black-translucent': dải trong suốt, nội dung tràn lên dưới nó, chữ đồng hồ/pin trắng.
  // Sáng → 'default': nền trắng chữ đen. KHÔNG được dùng 'black-translucent' ở bản sáng — nó ép
  //        chữ thành trắng, mà nền app bản sáng cũng trắng ⇒ đồng hồ/pin biến mất.
  //
  // Vòng ghi này KHÔNG thừa dù script nội tuyến đã ghi đúng lúc tải trang: watchSystemTheme() gọi
  // lại applyTheme() khi hệ điều hành lật sáng/tối lúc app đang mở ở chế độ "auto", còn script nội
  // tuyến chỉ chạy đúng một lần. Bỏ qua đây thì thẻ Apple và thẻ theme-color nói hai chuyện khác
  // nhau — đúng loại lệch âm thầm mà cả khối chú thích ở trên đang cố ngăn.
  //
  // Đừng trông chờ iOS vẽ lại NGAY khi ghi: nó chỉ đọc thẻ này lúc tải trang, nên đường thật để
  // người dùng thấy dải đổi màu là cú tải lại trong saveTheme() ở chế độ standalone.
  const appleBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
  if (appleBar) appleBar.setAttribute("content", resolved === "dark" ? "black-translucent" : "default")

  // Báo cho những nơi KHÔNG đọc được biến --c-* qua CSS (bảng vẽ nhúng cần chính chuỗi
  // "light"/"dark" để ghi thành thuộc tính). Đặt ở cuối, sau khi <html> đã mang giá trị mới, để
  // người nghe nào đọc DOM cũng thấy trạng thái đã ổn định.
  for (const cb of nguoiNgheChuDe) cb(resolved)
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

// Đường dẫn để tải lại sau khi đổi chủ đề trong PWA standalone (xem saveTheme bên dưới): GIỮ NGUYÊN
// mọi thứ, THÊM tham số `screen` nếu có màn cần giữ.
//
// Vì sao: điều hướng trong app chạy bằng state React (App.tsx), không đụng tới URL, nên URL hiện
// tại thường KHÔNG mang `?screen=`. `location.reload()` giữ nguyên URL đó — sau khi tải lại,
// initialScreen() (App.tsx) đọc URL, không thấy `screen`, rơi về "home".
//
// HIỆN KHÔNG AI TRUYỀN `preserveScreen`: từ 2026-09-04, ThemeToggle chỉ còn ở Trang chủ (chủ dự án
// quyết), nên rơi về "home" đúng là rơi về đúng màn đang đứng. Hàm này ở lại vì nó là điều kiện
// BẮT BUỘC để đặt nút chủ đề ở bất kỳ màn nào khác: đã có một lượt đúng như thế (bản inline trong
// DungThuocScreen, 2026-08-26 → 2026-09-04) và nó ĐÃ sinh lỗi thật — bấm đổi chủ đề ở màn Dùng
// thuốc thì trang tải lại rồi đẩy người dùng về Trang chủ. Gắn `?screen=mixing` trước khi tải lại
// là cách chữa; ai dựng lại nút ở màn khác thì dùng lại đúng đường này thay vì phát hiện lại lỗi cũ.
export function duongDanTaiLaiChuDe(href: string, preserveScreen?: string): string {
  if (!preserveScreen) return href
  const url = new URL(href)
  url.searchParams.set('screen', preserveScreen)
  return url.toString()
}

export function saveTheme(mode: ThemeMode, preserveScreen?: string): void {
  let saved = true
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // Không lưu được thì lần mở sau quay về "auto" — chấp nhận được, không chặn việc dùng app.
    saved = false
  }

  // ─── PWA cài ra màn hình chính: thanh trạng thái không tự vẽ lại khi app đang chạy ──────────
  // Đo được thực tế: khi app chạy standalone (đã "Thêm vào màn hình chính"), bấm nút đổi chủ đề
  // trong lúc app đang mở KHÔNG làm thanh trạng thái vẽ lại dù applyTheme() đã ghi đúng màu vào cả
  // ba thẻ theme-color; phải tắt hẳn app rồi mở lại nó mới đúng màu. Hệ điều hành chỉ đọc
  // theme-color lúc MỞ app, không nghe JS sửa nội dung thẻ meta khi app đang chạy — một giới hạn của
  // chế độ standalone, không phải lỗi ở phép ghi kia. Reload chính là "tắt rồi mở lại" tự động.
  //
  // KHÔNG gọi applyTheme() trước cú reload. Đây là nguyên nhân gốc của "màu top đổi chậm hơn màu
  // nền": applyTheme() đổi màu cả trang NGAY LẬP TỨC, còn thanh trạng thái phải đợi hết cú tải lại
  // (cả trăm mili-giây) mới đổi theo — hai bên lệch nhau đúng bằng thời gian tải lại đó, và trang cũ
  // vẫn hiển thị suốt quãng chờ nên mắt nhìn thấy rõ mồn một. Bỏ hẳn phép đổi màu ngay đó thì trang
  // GIỮ NGUYÊN màu cũ cho tới khi bản dựng mới vẽ ra — mà đúng lúc ấy hệ điều hành cũng vừa đọc
  // theme-color mới. Hai bên đổi trong CÙNG một khung hình, không còn gì để lệch.
  //
  // An toàn để reload ngay ở đây: không có ô nhập nào đang dở để mất, và bệnh nhân/tab/thuốc đang
  // chọn đều đã nằm trong localStorage/sessionStorage nên sau reload vẫn y nguyên (xem lib/patient.ts,
  // lib/uiState.ts). Riêng MÀN ĐANG ĐỨNG (App.tsx `screen`) thì không — nó chỉ sống trong state React,
  // nên `preserveScreen` (nếu gọi có kèm) gắn tạm vào URL qua duongDanTaiLaiChuDe() ở trên để
  // initialScreen() đọc lại đúng sau khi trang tải xong (xem hàm đó để biết vì sao cần).
  //
  // KHÔNG gọi ở applyTheme(): applyTheme() còn được main.tsx gọi mỗi lần MỞ app — reload ở đó sẽ
  // vòng lặp vô hạn.
  //
  // Bắt buộc phải ghi được localStorage mới dám đi lối này: reload xong, lựa chọn được đọc lại từ
  // đúng chỗ vừa ghi. Ghi hỏng mà vẫn reload là chủ đề quay về "auto" ngay trước mắt người vừa bấm —
  // thà đổi màu trong trang (lệch với thanh trạng thái) còn hơn nút bấm không có tác dụng gì.
  if (saved && isStandalonePwa()) {
    if (preserveScreen) window.location.replace(duongDanTaiLaiChuDe(window.location.href, preserveScreen))
    else window.location.reload()
    return
  }

  // Trong trình duyệt thường: thanh công cụ/thanh trạng thái do trình duyệt tự tô theo thẻ
  // theme-color, và nó HOÀ MÀU DẦN chứ không đổi phắt — không có API nào ép nó nhanh lên. Nên kéo
  // phần trang chậm lại cho bằng, đúng như cách duy nhất còn lại để hai bên đổi cùng lúc.
  beginThemeShift()
  applyTheme(mode)
}

// ─── Hoà màu khi đổi chủ đề (chỉ trong trình duyệt thường, xem saveTheme) ─────────────────────────
// Gắn một lớp CSS lên thẻ <html> đúng bằng thời lượng hoà màu rồi gỡ ra. Vì sao không để transition
// thường trực trong index.css: nó sẽ làm chậm MỌI phép đổi nền khác của app (nhấn nút, đổi màn,
// chọn tab) — những chỗ cần đổi tức thì mới thấy nhạy tay. Lớp này chỉ sống đúng một lần đổi chủ đề.
const THEME_SHIFT_MS = 300
let shiftTimer: ReturnType<typeof setTimeout> | null = null

function beginThemeShift(): void {
  const root = document.documentElement
  // Máy xin giảm chuyển động: đổi phắt, đừng kéo dài thêm một hiệu ứng nào cả.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  root.style.setProperty("--theme-shift", `${THEME_SHIFT_MS}ms`)
  root.classList.add("theme-shift")
  if (shiftTimer) clearTimeout(shiftTimer)
  // Dư ra một chút để khung hình cuối của phép hoà màu chắc chắn đã vẽ xong trước khi gỡ lớp.
  shiftTimer = setTimeout(() => root.classList.remove("theme-shift"), THEME_SHIFT_MS + 60)
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
