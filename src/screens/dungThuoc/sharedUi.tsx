import { useCallback, useState, useRef, useEffect, useId } from "react"
import type { SourceInfo } from "../../data/types"
import { tickHaptic } from "../../lib/haptics"
import { icons } from "../../components/icons"
import { C, CHIP, R, T, TAP, useDialogFocus } from "../../lib/ui"

export function useCountUp(target: number | null, decimals: number, finalText: string, durationMs = 380): string {
  const [display, setDisplay] = useState(finalText)
  const prevValueRef = useRef<number | null>(target)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    if (target == null) {
      prevValueRef.current = null
      setDisplay(finalText)
      return
    }
    const from = prevValueRef.current
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (from == null || from === target || reduceMotion) {
      prevValueRef.current = target
      setDisplay(finalText)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      // Cùng đường cong "đến nơi chắc chắn" dùng cho mọi hoạt ảnh xác nhận khác trong màn này.
      const eased = 1 - Math.pow(1 - t, 3)
      if (t < 1) {
        setDisplay((from + (target - from) * eased).toFixed(decimals))
        rafRef.current = requestAnimationFrame(tick)
      } else {
        prevValueRef.current = target
        setDisplay(finalText)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, finalText, decimals, durationMs])
  // Con số này là tốc độ bơm/CrCl — không được phép đứng ở một giá trị GIỮA CHỪNG lâu hơn cần thiết.
  // Trình duyệt thường tự tạm dừng requestAnimationFrame khi tab bị chuyển nền rồi tính bù khi quay
  // lại (t bị kẹp về 1 ở lần tick kế tiếp — tự đúng), nhưng hành vi tạm dừng rAF không phải chuẩn bắt
  // buộc trên mọi engine. Snap thẳng về finalText ngay khi tab ẩn đi, không đợi rAF tự sửa — cùng
  // tinh thần "sống sót qua gián đoạn" mà màn hình này đã áp dụng cho hoàn tác xoá bệnh nhân/khoá xác
  // nhận (critique /impeccable 2026-08-17T22-03, P1).
  useEffect(() => {
    function snapIfHidden() {
      if (!document.hidden || rafRef.current == null) return
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      prevValueRef.current = target
      setDisplay(finalText)
    }
    document.addEventListener("visibilitychange", snapIfHidden)
    return () => document.removeEventListener("visibilitychange", snapIfHidden)
  }, [target, finalText])
  return display
}

// ─── Mảnh giao diện dùng chung cho màn Dùng thuốc ────────────────────────────
// Mọi tiêu đề mục, ô tìm kiếm, chip chọn thuốc và khối gấp/mở đều đi qua đây, để không còn chuyện
// mỗi chỗ một cỡ chữ và một kiểu canh lề. Xem lib/ui.ts.

export function SectionLabel({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "accent" | "danger" }) {
  // C.muted (~3,1:1) chỉ đủ cho icon/placeholder, KHÔNG đủ cho chữ đọc được (dưới ngưỡng AA
  // 4,5:1) — đây là NHÃN MỤC thật, phải đọc được, nên dùng C.textSoft (~4,x:1) cho tone mặc định.
  const color = tone === "accent" ? "var(--c-primary-deep)" : tone === "danger" ? C.danger : C.textSoft
  return (
    <p className={`${T.label} mb-2`} style={{ color }}>
      {children}
    </p>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
  autoFocus,
  onClose,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoFocus?: boolean
  // Tuỳ chọn: nút đóng HẲN panel tìm kiếm, khác với nút xoá chữ bên dưới (chỉ xoá nội dung ô, panel
  // vẫn mở). Trước đây panel tìm xuyên nhóm chỉ đóng được bằng cách bấm lại đúng pill "Tìm" đã mở nó
  // — không có lối tắt nào NGAY TRONG panel (/impeccable critique 2026-08-18, ghi chú nhỏ).
  onClose?: () => void
}) {
  return (
    <div className={`mind-search-pill flex items-center gap-2.5 px-3.5 h-11 ${R.pill} mb-2.5`} style={{ background: C.lineSoft }}>
      <span style={{ color: C.muted }}>{icons.search(false)}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        // aria-label riêng, không dựa vào placeholder: placeholder biến mất khỏi cây accessibility
        // ngay khi người dùng gõ chữ đầu tiên — đúng lúc trình đọc màn hình cần biết ô này TÊN GÌ
        // nhất (đang điều hướng qua danh sách trường form) (/impeccable critique 2026-08-18, P2).
        aria-label={placeholder}
        // Ô này được mở CÓ CHỦ ĐÍCH bằng nút kính lúp — không tự focus là bắt người dùng chạm
        // thêm một lần nữa đúng lúc đang vội. type="search" + enterKeyHint cho bàn phím ảo đúng
        // nút "Tìm"; tắt viết-hoa-đầu-câu/tự-sửa-chính-tả vì đây là tên thuốc, không phải văn xuôi.
        autoFocus={autoFocus}
        type="search"
        enterKeyHint="search"
        autoCapitalize="off"
        autoCorrect="off"
        className={`flex-1 h-full bg-transparent  outline-none`}
      />
      {/* Ô còn chữ: X xoá chữ, panel vẫn mở (hành vi cũ, không đổi). Ô trống + có onClose: đổi
          sang X đóng hẳn panel — không hiện CẢ HAI nút cùng lúc, tránh hai icon X sát nhau gây
          nhầm "cái nào làm gì". */}
      {value ? (
        <button onClick={() => onChange("")} className="w-11 h-11 flex items-center justify-center flex-none" style={{ color: C.muted }} aria-label="Xoá tìm kiếm">
          {icons.x()}
        </button>
      ) : (
        onClose && (
          <button onClick={onClose} className="w-11 h-11 flex items-center justify-center flex-none" style={{ color: C.muted }} aria-label="Đóng ô tìm kiếm">
            {icons.x()}
          </button>
        )
      )}
    </div>
  )
}

// `index` bật hiệu ứng hiện lần lượt (lệch 28ms mỗi chip) — mắt bắt được thứ tự danh sách thay vì
// thấy cả mảng bật ra cùng lúc. Bỏ qua khi người dùng bật "Giảm chuyển động".
export function Chip({
  active,
  onClick,
  children,
  tone = "primary",
  index,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  tone?: "primary" | "accent"
  index?: number
}) {
  const on = tone === "accent" ? C.accent : C.primary
  return (
    <button
      onClick={() => {
        onClick()
        tickHaptic()
      }}
      className={`${CHIP}${index != null ? " rise-in" : ""}`}
      style={{
        ...(active ? { background: on, borderColor: on, color: "var(--c-on-primary)" } : { background: C.surface, borderColor: C.line, color: C.textSoft }),
        ...(index != null ? ({ "--i": index } as React.CSSProperties) : {}),
      }}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

// Khối gấp/mở. Ở ICU thứ cần nhìn ngay là tốc độ bơm, không phải bốn đoạn văn cảnh báo — nên mọi
// nội dung tham khảo đều nằm sau một dòng tiêu đề gấp lại được (progressive disclosure).
// `alert` = true thì tiêu đề đổi màu để cảnh báo mức cao không bị giấu mất.
export function Disclosure({
  label,
  count,
  alert,
  defaultOpen,
  children,
}: {
  label: string
  count?: number
  alert?: boolean
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  // ─── Trần chiều cao 1400px của `.disc-body` ─────────────────────────────────
  // Trần đó (index.css) chỉ là một con số "đủ lớn" để max-height có mốc mà chạy hoạt ảnh, nhưng nó
  // CẮT CỤT thật khi nội dung cao hơn: bảng pha thuốc lưu vài công thức đã tới ~1950px, và 550px bị
  // cắt rơi đúng vào ô "Đặt tên công thức mới" + nút "Lưu công thức mới" ở đáy — càng lưu nhiều công
  // thức càng không lưu thêm được, mà không có dấu hiệu gì ngoài việc chúng biến mất.
  //
  // Gỡ trần (`max-height: none`) CHỈ khi nội dung thật sự vượt, và chỉ SAU khi hoạt ảnh mở chạy xong:
  //   - gỡ sớm  → không còn mốc để nội suy, khối bung ra tức thì, mất đúng hoạt ảnh này sinh ra để có;
  //   - gỡ luôn cho mọi khối → khối ngắn (đa số) mất hoạt ảnh ĐÓNG, vì `none` → 0 cũng không nội suy được.
  // Nhờ điều kiện "thật sự vượt", chỉ những khối quá cao mới đóng tức thì — hiếm, và vẫn hơn hẳn việc
  // không bao giờ với tới được nửa dưới nội dung.
  // Ref đặt trên lớp TRONG (không phải `.disc-body`): `.disc-body` bị chính trần này kẹp lại nên
  // chiều cao của nó không còn phản ánh nội dung, và ResizeObserver gắn lên nó sẽ im lặng đúng lúc
  // nội dung vượt trần — tức đúng lúc cần biết.
  const innerRef = useRef<HTMLDivElement>(null)
  const [uncapped, setUncapped] = useState(false)
  useEffect(() => {
    if (!open) {
      setUncapped(false)
      return
    }
    const el = innerRef.current
    if (!el) return
    // Chỉ đo SAU khi hoạt ảnh mở (.28s trong index.css) chạy xong — ResizeObserver bắn ngay lần
    // observe() đầu tiên, đo lúc đó sẽ gỡ trần giữa chừng và khối bung ra tức thì.
    let ready = false
    const check = () => {
      if (ready) setUncapped(el.offsetHeight > 1400)
    }
    // Hẹn giờ chứ KHÔNG nghe `transitionend`: sự kiện đó không bắn khi thẻ đang ở nền hay hoạt ảnh bị
    // huỷ giữa chừng, mà nếu không bắn thì trần không bao giờ được gỡ — lại đúng lỗi cũ, chỉ hiếm hơn
    // nên khó tìm hơn.
    const t = setTimeout(() => {
      ready = true
      check()
    }, 320)
    // Đo lại mỗi khi nội dung đổi chiều cao (lưu thêm một công thức, mở một mục con...) — đo đúng một
    // lần lúc mở là không đủ: khối vừa vượt trần sau khi lưu sẽ bị cắt mà không ai đo lại.
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      clearTimeout(t)
      ro.disconnect()
    }
  }, [open])
  // C.muted (~3,1:1) chỉ đủ cho icon/placeholder — đây là tiêu đề mục thật, phải đọc được.
  const color = alert ? C.warn : C.textSoft
  const contentId = useId()
  return (
    <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: C.lineSoft }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 ${TAP} -my-2.5 py-2.5`}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span className={T.label} style={{ color }}>
          {label}
          {count != null && count > 0 ? ` · ${count}` : ""}
        </span>
        <span className="flex-none" style={{ color, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          {icons.chevronDown()}
        </span>
      </button>
      {/* Trước đây `{open && <div>}` — nội dung xuất hiện/biến mất TỨC THÌ và đẩy cả phần dưới
          nhảy theo, đặc biệt rõ trên thẻ có 4-5 Disclosure xếp chồng. `.disc-body` (index.css)
          co giãn bằng max-height nên chiều cao mượt mà không cần đo bằng JS — luôn render children,
          chỉ ẩn bằng max-height 0 + overflow hidden khi đóng.

          `max-height: none` sau khi mở XONG (xem settled bên dưới): trần 1400px của `.disc-body` chỉ
          là con số đủ lớn cho hoạt ảnh, nhưng nó CẮT CỤT thật khi nội dung dài hơn — bảng pha thuốc
          lưu vài công thức đã vượt 1900px, và phần bị cắt rơi đúng vào ô "Đặt tên công thức mới" +
          nút "Lưu công thức mới" ở đáy: càng lưu nhiều công thức càng không lưu thêm được, mà không
          có dấu hiệu gì ngoài việc chúng biến mất. */}
      <div
        id={contentId}
        className="disc-body"
        data-open={open}
        // Xem khối useEffect ở đầu component: chỉ gỡ trần cho khối THẬT SỰ cao hơn 1400px, và chỉ sau
        // khi hoạt ảnh mở đã chạy xong.
        style={uncapped ? { maxHeight: "none" } : undefined}
      >
        <div ref={innerRef}>{children}</div>
      </div>
    </div>
  )
}

// ─── Quy ước chung: các khung giờ "chạm lần nữa để xác nhận" ──────────────────
// Trước đây rải rác 3 con số (2.5s / 5s / 20s) không có một chỗ nào giải thích CẢ BA cạnh nhau, nên
// mỗi lần sửa một chỗ lại lệch khỏi hai chỗ còn lại (critique /impeccable, phản hồi người dùng
// 2026-08-18: "lỗi lặp đi lặp lại nhiều lần nhưng không học rút kinh nghiệm"). Nay CHỈ có hai loại,
// khai báo cạnh nhau để không ai sửa một bên mà quên bên kia:
//
// 1) CONFIRM_DELETE_RESET_MS — xoá dữ liệu ĐÃ LƯU (bài viết/sơ đồ/kháng sinh/thuốc truyền tự nhập/
//    công thức pha, VÀ bỏ ghim một thuốc khỏi "Đang truyền" ở RunningPanel) — hành động làm lại
//    được (dữ liệu vẫn còn trong danh mục gốc hoặc gõ lại vài giây), không có rủi ro bị cắt ngang
//    nghiêm trọng như xoá cả bệnh nhân. 5 giây — không ngắn (đủ để nhận ra vừa chạm nhầm) không dài
//    (không giữ khoá xoá mở quá lâu ngoài ý muốn).
// 2) CONFIRM_EXTREME_RESET_MS — xác nhận GHIM/CHÉP một liều đã tính vượt ngưỡng cực đoan (App.tsx,
//    InfusionCalculator). CỐ Ý NGẮN HƠN CONFIRM_DELETE_RESET_MS: mục đích ở đây là buộc hai chạm
//    sát nhau trong thời gian thực để chứng minh người dùng đang thật sự nhìn con số đó, không phải
//    "vô tình chạm lại" một khoá đã treo từ trước — khác hẳn mục đích của (1). KHÔNG gộp hai hằng số
//    này làm một: gộp sẽ hoặc làm khoá xoá dữ liệu quá ngắn, hoặc làm khoá xác nhận liều cực đoan
//    quá dài (dễ xác nhận nhầm liều nguy hiểm hơn) — xem thêm lib/confirmGate.ts.
export const CONFIRM_DELETE_RESET_MS = 5000
export const CONFIRM_EXTREME_RESET_MS = 2500
// "Xoá bệnh nhân" KHÔNG dùng chung hai hằng số trên — đây là chạm-hai KHỞI ĐỘNG cho cùng kịch bản bị
// cắt ngang (cuộc gọi, báo động) mà undoWindow 20 giây bên dưới (resetPatient) đã dùng để biện minh
// cho việc kéo dài: từng thử 10 giây, thấy quá ngắn cho tình huống đó (xem PatientPanel), NÊN GIỮ
// NGUYÊN 20 giây — không rút xuống theo quy ước (1)/(2) ở trên, vì đây là hành động phá huỷ nhất màn
// hình (xoá cả bệnh nhân lẫn bảng "Đang truyền"), không cùng mức rủi ro với xoá một mục dữ liệu.
export const CONFIRM_PATIENT_RESET_MS = 20_000

export function ConfirmIconButton({
  onConfirm,
  ariaLabel,
  className,
  style,
}: {
  onConfirm: () => void
  ariaLabel: string
  className?: string
  style?: React.CSSProperties
}) {
  const [confirm, setConfirm] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  return (
    <button
      onClick={() => {
        if (!confirm) {
          setConfirm(true)
          tickHaptic()
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setConfirm(false), CONFIRM_DELETE_RESET_MS)
          return
        }
        if (timer.current) clearTimeout(timer.current)
        setConfirm(false)
        onConfirm()
      }}
      className={className}
      style={{ ...(confirm ? { background: C.dangerIcon, color: "var(--c-on-bright)" } : style), position: "relative" }}
      // Nêu rõ thời hạn tự huỷ trong nhãn, giống hệt "Xoá bệnh nhân" bên PatientPanel — hai nút dùng
      // hai hình dạng đếm ngược khác nhau (vòng tròn quanh icon vs. thanh cạn ngang trên chữ) vì hai
      // hình dạng nút khác nhau (icon vuông vs. pill có chữ), nhưng phải nói cùng một điều bằng lời
      // để người dùng (và trình đọc màn hình) không phải học lại ngữ pháp mỗi lần gặp nút khác
      // (critique /impeccable 2026-08-18, P2).
      aria-label={confirm ? `${ariaLabel} — chạm lần nữa để xác nhận, tự huỷ sau ${(CONFIRM_DELETE_RESET_MS / 1000).toFixed(1)} giây` : ariaLabel}
    >
      {/* Chạm lần 1 trước đây chỉ đổi icon (thùng rác → cảnh báo) cùng kích thước, cùng vị trí,
          không chữ — rất dễ tưởng "máy không nhận" rồi chạm lại, mà lần chạm đó xoá thật. Vòng
          đếm ngược viền quanh icon cho biết rõ: đã nhận, đang chờ chạm lần hai, còn bấy nhiêu
          thời gian nữa thì tự huỷ. */}
      {confirm && (
        <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full" style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
          <circle
            cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55"
            strokeDasharray={2 * Math.PI * 15.5}
            style={{ animation: `confirmRing ${CONFIRM_DELETE_RESET_MS}ms linear forwards` }}
          />
        </svg>
      )}
      {confirm ? icons.alert() : icons.trash()}
    </button>
  )
}

// Hộp thông báo một kiểu duy nhất cho cả màn — trước đây mỗi chỗ tự chọn nền/viền/cỡ chữ riêng.
export function Note({ tone, children }: { tone: "info" | "warn" | "danger" | "ok"; children: React.ReactNode }) {
  const map = {
    info: { bg: C.primarySoft, fg: "var(--c-primary-deep)", line: C.primaryLine },
    warn: { bg: C.warnSoft, fg: C.warn, line: C.warnLine },
    danger: { bg: C.dangerSoft, fg: C.danger, line: C.dangerLine },
    ok: { bg: C.accentSoft, fg: "var(--c-primary-deep)", line: C.accentLine },
  }[tone]
  return (
    <p className={`${T.meta} px-2.5 py-2 ${R.box} mb-2`} style={{ background: map.bg, color: map.fg, border: `1px solid ${map.line}` }}>
      {children}
    </p>
  )
}

// ─── Nguồn dữ liệu & ngày rà soát ─────────────────────────────────────────────
// Không mục nào được phép im lặng về nguồn gốc: có nguồn thì ghi rõ, chưa có thì nói thẳng là chưa
// có. Đây là cách duy nhất để người dùng biết mục nào còn hợp thời — ví dụ đích nồng độ vancomycin
// đã đổi từ "đáy 15–20 mg/L" (2009) sang AUC/MIC (đồng thuận 2020).

export function formatReviewedOn(value: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(value.trim())
  return m ? `${m[2]}/${m[1]}` : value
}

export function SourceLine({ item, bare }: { item: SourceInfo; bare?: boolean }) {
  const hasAny = Boolean(item.source || item.reviewedOn)
  const inner = hasAny ? (
    <p className={T.meta} style={{ color: C.textSoft }}>
      {item.source && <>Nguồn: {item.source}</>}
      {item.source && item.reviewedOn && " · "}
      {item.reviewedOn && <>Rà soát: {formatReviewedOn(item.reviewedOn)}</>}
    </p>
  ) : (
    <p className={`${T.meta} px-2.5 py-2 ${R.box}`} style={{ background: C.warnSoft, color: C.warnIcon }}>
      {/* Trước đây "Chưa ghi nguồn · chưa có ngày rà soát" đọc như một lỗi/thiếu sót của app — phần
          lớn nội dung thuốc trong app này vốn tự biên soạn từ kinh nghiệm lâm sàng của tác giả
          (xem PRODUCT.md § Evidence on Hand), không phải mọi mục đều có tài liệu bên ngoài để dẫn.
          Câu mới nói đúng bản chất đó thay vì đọc như một ô trống quên điền (/impeccable critique
          2026-08-19T10-03, P2 "Noradrenaline chưa ghi nguồn"). Vẫn giữ khung màu cảnh báo: một bác
          sĩ trực thay ca vẫn nên biết đây KHÔNG phải trích dẫn từ tài liệu ngoài. */}
      Dựa trên kinh nghiệm lâm sàng tự biên soạn, chưa dẫn nguồn/tài liệu bên ngoài — bổ sung qua nút Sửa nếu muốn.
    </p>
  )
  if (bare) return inner
  return (
    <div className="mt-3 pt-2.5 border-t" style={{ borderColor: C.lineSoft }}>
      {inner}
    </div>
  )
}

// ─── Miễn trừ trách nhiệm ─────────────────────────────────────────────────────
// Một app tính liều thuốc vận mạch mà không có dòng nào nói rõ phạm vi sử dụng thì vừa là vấn đề an
// toàn vừa là vấn đề pháp lý cho chính tác giả. Hiện một lần bắt buộc đọc, sau đó vẫn giữ một dải
// nhắc thường trực ở đầu màn hình.

const DISCLAIMER_KEY = "drtrong:disclaimerAck"
const DISCLAIMER_VERSION = "2026-07"
const DISCLAIMER_TEXT =
  "Đây là sổ tay tra cứu nhanh cho nhân viên y tế, không thay thế phác đồ của cơ sở và tờ hướng dẫn sử dụng thuốc."

// Nâng trạng thái "đã đọc" lên component cha (thay vì state riêng trong DisclaimerGate) để cha biết
// LÚC NÀO tấm phủ đang mở — cần cho `inert` trên nội dung phía sau (xem useDisclaimerAck bên dưới).
export function useDisclaimerAck() {
  const [ack, setAck] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISCLAIMER_KEY) === DISCLAIMER_VERSION
    } catch {
      return false
    }
  })
  const acknowledge = useCallback(() => {
    try {
      localStorage.setItem(DISCLAIMER_KEY, DISCLAIMER_VERSION)
    } catch {
      // Không lưu được thì lần sau vẫn hiện lại — chấp nhận được, không chặn việc dùng app.
    }
    setAck(true)
  }, [])
  return { ack, acknowledge }
}

export function DisclaimerGate({ ack, onAcknowledge }: { ack: boolean; onAcknowledge: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  // Không truyền onEscape: đây là màn xác nhận BẮT BUỘC đọc trước khi dùng, không có lối tắt Esc để
  // né qua — chỉ đóng được bằng cách chạm "Tôi đã hiểu". Vẫn cần bẫy Tab để bàn phím không lọt ra
  // ngoài tấm phủ vào nội dung màn hình đang bị che phía sau.
  useDialogFocus(panelRef)
  if (ack) return null
  return (
    // Trước đây bung ra tức thì dù có rounded-t-3xl — trông như bottom sheet nhưng không có động
    // tác của bottom sheet. `.fade-in` cho nền phủ, `.mind-sheet` (trượt lên từ đáy) cho tấm sheet.
    <div className="absolute inset-0 z-50 flex items-end fade-in" style={{ background: "var(--c-scrim)" }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="disclaimer-gate-title"
        className="mind-sheet w-full rounded-t-3xl px-6 pt-6"
        style={{ background: C.surface, paddingBottom: "var(--nav-pad-bottom)" }}
      >
        <div className="flex items-center gap-2 mb-2" style={{ color: C.warnIcon }}>
          {icons.alert()}
          <p id="disclaimer-gate-title" className="text-[13px] font-bold">Trước khi dùng</p>
        </div>
        {/* Dòng nhắc "công cụ tham khảo" gộp vào ĐÂY (trước đây là DisclaimerBar — một dải thường
            trực trên đầu mọi lần mở màn, thứ đầu tiên bác sĩ vội nhìn thấy) — /impeccable critique
            2026-08-31, P2: lần đầu chỉ còn MỘT modal, các lần sau không còn dải nhắc chiếm chỗ. */}
        <p className="text-[13px] font-bold leading-[1.45] mb-2 max-w-[65ch]" style={{ color: C.text }}>
          Công cụ tham khảo — luôn kiểm tra lại trước khi thực hiện.
        </p>
        {/* max-w: sheet nền vẫn full-bleed (w-full ở div cha) đúng hình dạng bottom sheet, nhưng chữ
            đọc thì giới hạn measure — không giới hạn thì trên màn rộng (tablet/desktop) mỗi dòng kéo
            dài ~200 ký tự, quá ngưỡng đọc thoải mái (/impeccable critique 2026-08-18). */}
        <p className="text-[13px] text-slate-700 leading-[1.45] mb-3 max-w-[65ch]">{DISCLAIMER_TEXT}</p>
        <p className="text-[12px] text-slate-500 leading-[1.45] mb-4 max-w-[65ch]">
          Mỗi mục đều ghi nguồn và ngày rà soát ngay trên thẻ thuốc; mục nào chưa có thì được đánh dấu rõ.
        </p>
        <button
          onClick={onAcknowledge}
          className="w-full py-3.5 rounded-[20px] font-semibold text-[13px] mb-2"
          style={{ background: C.primary, color: "var(--c-on-primary)" }}
        >
          Tôi đã hiểu
        </button>
      </div>
    </div>
  )
}

// (DisclaimerBar đã bị gỡ 2026-08-31: dải nhắc "công cụ tham khảo" thường trực trên đầu mọi lần mở
// màn giờ gộp hẳn vào DisclaimerGate — xem dòng in đậm đầu thân sheet đó. Lần đầu chỉ còn một modal;
// các lần sau không còn dải chiếm chỗ phía trên khung bệnh nhân.)

// Dòng cảnh báo nhỏ cho một ô nhập (cân nặng gõ nhầm 700 kg, chiều cao 17 cm...).
export function InputWarning({ text, level }: { text: string; level: "check" | "implausible" }) {
  const color = level === "implausible" ? { bg: C.dangerSoft, fg: C.danger } : { bg: C.warnSoft, fg: C.warnIcon }
  return (
    <p className="fade-in text-[12px] font-semibold leading-[1.45] mt-1 px-2 py-1 rounded-lg" style={{ background: color.bg, color: color.fg }}>
      {text}
    </p>
  )
}

// ─── Khung thông số bệnh nhân ─────────────────────────────────────────────────

// Một ô nhập trong khung bệnh nhân. Điểm chính: hàng nhãn có CHIỀU CAO CỐ ĐỊNH, nên dù ô bên cạnh
// có hay không có nút phụ, đáy các ô nhập vẫn nằm trên cùng một đường.
//
// Cảnh báo (vd "dữ liệu dành cho NGƯỜI LỚN") KHÔNG còn vẽ bên trong ô này nữa: ô nằm trong lưới 2
// cột nên bề ngang chỉ còn một nửa màn hình, câu cảnh báo dài bị bóp xuống 5-6 dòng chữ hẹp. Cảnh
