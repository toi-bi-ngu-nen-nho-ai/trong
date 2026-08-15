import { useEffect } from "react"

// ─── Bộ token giao diện cho màn "Dùng thuốc" ─────────────────────────────────
//
// Vì sao cần file này: màn pha thuốc trước đây trộn 7 cỡ chữ (10 / 10.5 / 11 / 12 / 13 / 14 / 18px),
// 5 bán kính bo góc và đủ kiểu padding lẻ. Mỗi khối nhìn riêng thì ổn, xếp cạnh nhau thì tiêu đề
// không thẳng hàng và chữ xuống dòng loạn xạ. Chỗ nào cũng "gần giống" nhau nhưng không chỗ nào
// bằng nhau — đó đúng là kiểu lộn xộn gây khó chịu nhất.
//
// Nguyên tắc: CHỈ dùng các hằng số trong file này cho màn Dùng thuốc. Muốn thêm cỡ chữ mới thì sửa
// ở đây, không viết class rời rạc tại chỗ.

// ─── Thang chữ: 7 bậc ─────────────────────────────────────────────────────────
// Trước đây khai 6 bậc nhưng `meta` (11px) và `body` (13px) gánh gần như toàn bộ nội dung — câu
// cảnh báo tương tác thuốc, dòng "Ghim 14:05 · 3 giờ trước", tên nguồn tài liệu VÀ con số đặt bơm
// đều 11px như nhau, tức là không còn thứ bậc thông tin nào cả. Màn hình này dùng trong buồng tối,
// đôi khi qua kính bảo hộ — 11px là cỡ chữ của chân trang, không phải của nội dung lâm sàng. Nâng
// nền của thang lên (meta 11→12, body 13→14) và thêm một bậc `critical` 15px riêng cho những con
// số/tên KHÔNG được đọc nhầm: số đặt bơm, tên thuốc đang chạy, cảnh báo "KHÔNG tương hợp".
export const T = {
  // Nhãn mục — trước đây IN HOA + giãn chữ 0.05em ở 11px; với tiếng Việt, chữ hoa cỡ nhỏ làm dấu
  // thanh/dấu mũ (Ầ, Ữ, Ỗ) dồn sát đường ascender và mất khả năng phân biệt. Bỏ hẳn uppercase,
  // dùng chữ thường đậm vừa — đọc nhanh hơn mà vẫn giữ được vai trò "nhãn" nhờ cỡ nhỏ + đậm.
  label: "text-[12px] font-semibold leading-[1.4]",
  // Chú thích, ghi chú phụ
  meta: "text-[12px] leading-[1.45]",
  // Chữ chính
  body: "text-[14px] leading-[1.5]",
  bodyStrong: "text-[14px] font-semibold leading-[1.5]",
  // Chữ trên nút bấm / chip chọn — nhỉnh hơn nhãn một bậc cho dễ đọc khi bấm vội
  chip: "text-[12px] font-semibold",
  // Số/tên KHÔNG được đọc nhầm: số đặt bơm thật sự đem đi chỉnh máy, tên thuốc đang chạy trên
  // người bệnh, dòng "KHÔNG tương hợp" — tất cả đọc ở khoảng cách tay dài, đôi khi qua kính bảo hộ.
  critical: "text-[15px] font-bold leading-[1.35]",
  // Tên thuốc / tiêu đề thẻ
  title: "text-[15px] font-bold leading-[1.3]",
  // Con số kết quả — luôn kèm tabular-nums để các hàng số thẳng cột với nhau
  metric: "text-[24px] font-bold leading-none tabular-nums",
} as const

// Mọi con số trong bảng/kết quả đều phải có class này, nếu không chữ số rộng khác nhau sẽ làm
// các dòng lệch nhau từng chút một.
export const NUM = "tabular-nums"

// Font đơn cách dành RIÊNG cho số liều/nồng độ/tốc độ bơm — DESIGN.md quy định JetBrains Mono cho
// đúng nhóm này để đọc rõ từng ký tự (buồng tối, qua kính bảo hộ, 1/l và 0/O dễ đọc nhầm ở font
// thường). Cố ý KHÔNG gộp vào `NUM`: rất nhiều chỗ dùng `NUM` chỉ để canh cột tabular-nums cho một
// câu tiếng Việt bình thường (vd "Ghim 14:05 · 3 giờ trước") — đổi cả câu đó sang monospace không
// đúng mục đích của quy tắc. Chỉ ghép NUM_DOSE vào đúng span hiển thị con số liều/tốc độ QUYẾT ĐỊNH
// việc đặt bơm, không phải mọi nơi có số.
export const NUM_DOSE = "tabular-nums font-mono-dose"

// ─── Bo góc: đúng 4 giá trị ──────────────────────────────────────────────────
// Bo góc mềm hơn hẳn (đợt đổi bảng màu 2026-08, 10/12/16px → 14/14/20px) — cùng hướng cao cấp hơn
// với --c-primary indigo mới. input/box dùng chung 14px để đường viền ô nhập và khối/thẻ nhỏ khớp
// nhau khi đứng cạnh nhau (vd input + khối chọn đơn vị Creatinin); card nới rộng hơn một bậc rõ
// rệt để phân biệt "khối lớn nhất màn" khỏi "khối vừa" bằng mắt, không chỉ bằng kích thước.
export const R = {
  input: "rounded-[14px]",
  box: "rounded-[14px]",
  card: "rounded-[20px]",
  pill: "rounded-full",
} as const

// ─── Màu ngữ nghĩa ───────────────────────────────────────────────────────────
export const C = {
  primary: "var(--c-primary)",
  primarySoft: "var(--c-primary-soft)",
  primaryLine: "var(--c-primary-line)",
  accent: "var(--c-accent)",
  accentSoft: "var(--c-accent-soft)",
  accentLine: "var(--c-accent-line)",
  danger: "var(--c-danger)",
  dangerIcon: "var(--c-danger-icon)",
  dangerSoft: "var(--c-danger-soft)",
  dangerLine: "var(--c-danger-line)",
  warn: "var(--c-warn)",
  warnIcon: "var(--c-warn-icon)",
  warnSoft: "var(--c-warn-soft)",
  warnLine: "var(--c-warn-line)",
  text: "var(--c-text)",
  textSoft: "var(--c-text-soft)",
  muted: "var(--c-muted)",
  line: "var(--c-line)",
  lineSoft: "var(--c-line-soft)",
  surface: "var(--c-surface)",
  surfaceAlt: "var(--c-surface-alt)",
} as const

// ─── Ô nhập: cao 44px cho đủ vùng chạm khi đeo găng ─────────────────────────
export const FIELD = `w-full h-11 px-3 ${R.input} ${T.body} border outline-none ${NUM}`
export const FIELD_STYLE = { borderColor: C.line, background: C.surface }

// `dose-press` (index.css) cho mọi nút một phản hồi chạm giống nhau: thu nhẹ 0,96 trong 0,16s.
// Gắn vào token thay vì từng chỗ, để không có nút nào bị bỏ sót.
// Nút bấm nhỏ (chip) vẫn phải đủ 44px chiều cao vùng chạm.
export const CHIP = `flex-none h-11 px-3.5 ${R.pill} ${T.chip} whitespace-nowrap border dose-press`
// Nút phụ trong thẻ (thao tác thứ cấp): 36px — vẫn bấm được khi đeo găng, không chiếm chỗ như 44px.
export const BTN_SM = `h-9 px-3 ${R.pill} ${T.chip} border dose-press`
// Nút hành động chiếm trọn bề ngang.
export const BTN_BLOCK = `w-full h-11 ${R.box} ${T.chip} border dose-press`

// Nút có NHÃN DÀI ("Tôi đã kiểm tra lại — vẫn muốn xem kết quả"). Khác BTN_BLOCK ở đúng một điểm
// sống còn: `min-h-[44px]` thay cho `h-11`.
//
// Vì sao: `h-11` khoá chiều cao ở 44px. Nhãn dài xuống hai dòng trên máy hẹp là tràn ra ngoài khung
// nút và ĐÈ LÊN dòng chữ bên dưới. Chuyện này từng xảy ra với đúng mấy nút xác nhận vượt liều —
// tức là nút quan trọng nhất trong màn hình lại là nút hiển thị vỡ.
// (Bốn nút đó trước đây còn thiếu hẳn class cỡ chữ và bo góc do một lần dọn mã để sót, nên chữ
// nhảy lên 16px và nút vuông góc — càng dễ tràn.)
export const BTN_TALL = `w-full min-h-[44px] px-3 py-2.5 ${R.box} ${T.chip} leading-[1.35] border dose-press`
export const TAP = "min-h-[44px]"

// ─── Định dạng số cho các hàng thẳng cột ─────────────────────────────────────
// formatDoseNumber() đổi số chữ số thập phân theo độ lớn (0.0800 / 5.00 / 168) nên khi xếp thành
// bảng thì các hàng nhấp nhô. Với những chỗ hiển thị theo cột, dùng hàm này để chốt số lẻ.
export function fixed(value: number, decimals: number): string {
  return value.toFixed(decimals)
}

// Bỏ số 0 thừa ở đuôi nhưng vẫn giữ tối đa `max` chữ số thập phân — dùng cho thể tích, số ống.
//
// Chỉ bỏ số 0 THUỘC PHẦN THẬP PHÂN vừa được toFixed() thêm vào — không được đụng vào số 0 nằm
// trong chính phần nguyên. Trước đây quên kiểm tra việc này: khi max=0, toFixed(0) không hề sinh
// dấu chấm ("20" chứ không phải "20."), nên regex cũ vẫn tưởng số 0 cuối "20" là số 0 thập phân
// thừa và cắt mất, biến trim(20, 0) thành "2" — 20 ống bị hiển thị thành 2 ống, 20 giọt/phút thành
// 2 giọt/phút. Chỉ được cắt khi CÓ dấu chấm thật sự trong chuỗi.
export function trim(value: number, max = 2): string {
  const s = value.toFixed(max)
  if (!s.includes(".")) return s
  return s.replace(/0+$/, "").replace(/\.$/, "")
}

// Tên rút gọn cho chip chọn thuốc. Tên đầy đủ ("Adrenaline (Epinephrine) — liều co bóp") dài gấp
// ba lần chỗ chứa nên chip nào cũng tràn xuống dòng, làm hàng chip so le. Bỏ phần trong ngoặc, giữ
// lại phần đuôi phân biệt để không lẫn hai mục cùng hoạt chất.
export function shortDrugName(name: string): string {
  const parts = name.split(/\s+—\s+/)
  const head = parts[0].replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim()
  const tail = parts[1]?.replace(/^liều\s+/i, "").trim()
  return tail ? `${head} · ${tail}` : head
}

// Đường dùng rút gọn cho chip: "Tiêm/truyền tĩnh mạch (IV)" → "IV", "Truyền tĩnh mạch (TTM)" →
// "TTM". Tên đầy đủ vẫn hiện trong thẻ thuốc; chip chỉ cần đủ để phân biệt.
export function shortRoute(route: string): string {
  const m = /\(([^)]{1,8})\)\s*$/.exec(route.trim())
  return m ? m[1] : route
}

// Đường TIÊM/TRUYỀN có thể suy ra được từ câu chữ `route` hay không — CHỈ bốn đường này mới cần
// hoàn nguyên/pha loãng (bảng pha): truyền tĩnh mạch (TTM), tiêm tĩnh mạch chậm (TMC), tiêm bắp (IM),
// tiêm dưới da (TDD). Đường khác (uống, nhỏ mắt...) không có gì để pha nên KHÔNG được hiện "Bảng pha
// thuốc". Đây là cổng duy nhất quyết định nút đó có hiện hay không (xem AntibioticDoseCard).
export type AdminRoute = "TTM" | "TMC" | "IM" | "TDD"

// Đọc CHỮ VIẾT TẮT cuối chuỗi (trong ngoặc, xem shortRoute) thay vì dò cả câu — dò cả câu sẽ hiểu
// nhầm "Tiêm/truyền tĩnh mạch (IV)" (chứa sẵn cụm "truyền tĩnh mạch") thành CHỈ truyền được, mất hẳn
// khả năng tiêm chậm mà câu chữ đó thật ra cho phép.
// - "(TTM)" → CHỈ truyền tĩnh mạch. "(TMC)" → CHỈ tiêm tĩnh mạch chậm. Một kháng sinh ghi rõ một
//   trong hai đường này (vd Vancomycin "Truyền tĩnh mạch (TTM)") thì KHÔNG được phép đổi sang đường
//   còn lại — nhiều thuốc tiêm nhanh (TMC) là sai lầm nguy hiểm (vd Vancomycin gây hội chứng người đỏ).
// - "(IV)" chung chung (chưa phân biệt) → cho cả hai, để bác sĩ tự chọn theo từng thuốc thật.
// - "(TB)"/"(IM)" → tiêm bắp. "(TDD)"/"(SC)" → tiêm dưới da.
// - Không khớp gì (uống, nhỏ mắt, vị trí khác...) → mảng rỗng, không có bảng pha.
export function inferAdminRoutes(route: string): AdminRoute[] {
  const abbr = shortRoute(route).trim().toUpperCase()
  if (abbr === "TTM") return ["TTM"]
  if (abbr === "TMC") return ["TMC"]
  if (abbr === "IV") return ["TTM", "TMC"]
  if (abbr === "TB" || abbr === "IM") return ["IM"]
  // Giữ "SC" làm bí danh ĐỌC VÀO dù mã nội bộ đã đổi sang "TDD": dữ liệu thuốc còn ghi
  // "Tiêm dưới da (SC)" (xem src/data/others.ts). Bỏ nhánh này thì thuốc đó trả về mảng rỗng và
  // nút "Bảng pha thuốc" của nó lặng lẽ biến mất — không lỗi, không cảnh báo, tsc không bắt được.
  if (abbr === "TDD" || abbr === "SC") return ["TDD"]
  return []
}

// Nhãn hiển thị đầy đủ cho một đường dùng — dùng chung cho chip chọn đường và câu chữ "Cách dùng".
export function adminRouteLabel(r: AdminRoute): string {
  switch (r) {
    case "TTM":
      return "TTM · Truyền tĩnh mạch"
    case "TMC":
      return "TMC · Tiêm tĩnh mạch chậm"
    case "IM":
      return "IM · Tiêm bắp"
    case "TDD":
      return "TDD · Tiêm dưới da"
  }
}

// ─── Bẫy focus cho tấm phủ toàn màn (CalcLogSheet, DisclaimerGate) ───────────
// Cả hai đều là lớp phủ CHE HẾT màn hình sau nhưng trước đây không có role="dialog"/aria-modal, không
// khoá Tab bên trong, không tự đặt focus khi mở — người dùng bàn phím/trình đọc màn hình Tab xuyên
// qua tấm phủ vào thẳng nội dung ẩn phía sau, hoặc không hề được báo là vừa có một lớp phủ mở ra.
// `onEscape` để trống cho DisclaimerGate: đó là màn xác nhận BẮT BUỘC đọc, không được phép thoát bằng
// phím Esc như một lối tắt né tránh.
export function useDialogFocus(containerRef: { current: HTMLElement | null }, options: { onEscape?: () => void } = {}): void {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    function focusable(): HTMLElement[] {
      return Array.from(
        container!.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      ).filter((el) => !el.hasAttribute("disabled"))
    }

    focusable()[0]?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && options.onEscape) {
        e.preventDefault()
        options.onEscape()
        return
      }
      if (e.key !== "Tab") return
      const items = focusable()
      if (items.length === 0) return
      const activeIndex = items.indexOf(document.activeElement as HTMLElement)
      if (e.shiftKey) {
        if (activeIndex <= 0) {
          e.preventDefault()
          items[items.length - 1].focus()
        }
      } else if (activeIndex === items.length - 1 || activeIndex === -1) {
        e.preventDefault()
        items[0].focus()
      }
    }

    container.addEventListener("keydown", onKeyDown)
    return () => {
      container.removeEventListener("keydown", onKeyDown)
      previouslyFocused?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// Cuộn tới một phần tử. Tách ra thành hàm riêng vì hai lý do, cả hai đều đã cắn một lần:
//   1. "Giảm chuyển động" của hệ điều hành phải được tôn trọng — app đã tắt hoạt ảnh chip theo cờ
//      này thì không có lý do gì cú cuộn lại vẫn trượt dài.
//   2. Cuộn mượt do trình duyệt chạy theo từng khung hình, nên nếu trang đang không vẽ khung hình
//      (người dùng chuyển sang app khác đúng lúc đó) thì cú cuộn KHÔNG bao giờ hoàn tất và người
//      dùng quay lại vẫn thấy màn hình ở chỗ cũ. Cuộn tức thì không có vấn đề này.
export function scrollElementIntoView(el: HTMLElement | null | undefined): void {
  if (!el) return
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const hidden = typeof document !== "undefined" && document.visibilityState === "hidden"
  el.scrollIntoView({ behavior: reduced || hidden ? "auto" : "smooth", block: "start" })
}

// Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu ("noradre" tìm được "Noradrenaline",
// "loan nhip" tìm được "Rối loạn nhịp").
export function normalizeSearch(text: string): string {
  return text
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
}
