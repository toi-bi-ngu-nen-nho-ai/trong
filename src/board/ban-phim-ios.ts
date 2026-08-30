import { laThietBiIOS, type ThongTinThietBi } from './viewport-ios'

// ─── Mồi bàn phím ảo cho Safari iOS ──────────────────────────────────────────────────────────────
//
// Vấn đề (HANDOFF §1.1, nhật ký mục 7): mọi lượt `focusTextModel()` trong cây vendored đều hoãn qua
// `requestAnimationFrame`/`.then()`. Safari iOS CHỈ mở bàn phím khi `.focus()` vào một phần tử nhập
// THẬT chạy ĐỒNG BỘ trong handler cử chỉ — tới lúc lượt focus bị hoãn của BlockSuite chạy thì cú
// chạm đã hết, iOS bỏ qua. Kết quả: chạm vào node text / thẻ ghi chú trên bảng vẽ không hiện bàn
// phím, không gõ được.
//
// Cách mồi: nghe `touchend` NGAY trên host của cây Lit. Trong chính handler đó — vẫn còn trong cửa
// sổ cử chỉ — `.focus()` một `<input>` thật, vô hình, do module này sở hữu. Bàn phím bật lên. Ngay
// sau đó BlockSuite tự đưa focus (đã hoãn ~1 frame) sang contenteditable của editor thật; trên iOS,
// khi bàn phím ĐANG hiện, chuyển focus giữa hai phần tử nhập không cần cử chỉ mới — bàn phím ở lại.
//
// Đây KHÔNG phải "hướng B" đã bị loại (nhật ký mục 37): hướng đó mồi bằng một `contenteditable` ẩn
// và hỏng vì chính `contenteditable` (bàn thử lượt 2 xác nhận: `<input>` mở được bàn phím, phần tử
// giàu định dạng thì không). Ở đây phần tử mồi là `<input>` trần.
//
// Phạm vi: chỉ chạy trên thiết bị iOS thật. Trên mọi nền khác hàm trả về no-op — desktop/Android mở
// bàn phím bằng lượt focus của script bình thường, không cần mồi.

// Ngưỡng dịch ngón tay (px) để coi cú chạm là PAN/kéo chọn chứ không phải tap — không mồi trong ca đó.
const NGUONG_KEO_PX = 10

// Bao lâu sau khi mồi thì bỏ focus phần tử mồi nếu KHÔNG có editor thật nào nhận focus. Đủ dài để
// lượt `focusTextModel()` bị hoãn của BlockSuite kịp chạy (nó chỉ hoãn 1–2 frame), đủ ngắn để một
// cú chạm không-phải-sửa (pan, chọn) không để lại bàn phím lơ lửng.
const HAN_CHO_EDITOR_MS = 500

// Phần tử được coi là "editor thật đã nhận focus" — khi một trong số này focus sau lúc mồi thì trao
// tay xong, bỏ focus phần tử mồi. `.inline-editor` / `v-line` phủ rich-text của note; contenteditable
// phủ edgeless-text + node mindmap; input/textarea phủ mọi ô nhập vendored khác (KHÔNG kể phần tử mồi).
function laEditorThat(el: Element | null, moi: HTMLInputElement): boolean {
  if (!el || el === moi) return false
  if (el.matches('[contenteditable="true"], [contenteditable=""], input, textarea')) return true
  return el.closest('.inline-editor, v-line, rich-text, edgeless-text-editor') !== null
}

/**
 * Gắn phép mồi bàn phím vào `host` (div React giữ chỗ cho cây Lit trong EdgelessBoard). Trả về hàm
 * gỡ — gọi trong cleanup của effect. `nav` chỉ để ca kiểm tiêm; app thật gọi một đối số.
 */
export function ganMoiBanPhimIOS(
  host: HTMLElement,
  nav: ThongTinThietBi | undefined = typeof navigator === 'undefined' ? undefined : navigator,
): () => void {
  if (!nav || !laThietBiIOS(nav)) return () => {}

  const moi = host.ownerDocument.createElement('input')
  moi.type = 'text'
  moi.setAttribute('aria-hidden', 'true')
  moi.setAttribute('tabindex', '-1')
  moi.autocapitalize = 'off'
  moi.autocomplete = 'off'
  moi.spellcheck = false
  // `font-size: 16px` chặn Safari iOS tự phóng to trang khi focus vào ô nhỏ hơn. Vô hình nhưng VẪN
  // focus được: `opacity: 0` cho phép focus, khác `display:none`/`visibility:hidden` thì không.
  // `position: fixed; bottom: 0` giữ nó ngoài luồng bố cục và không đẩy cuộn.
  moi.style.cssText =
    'position:fixed;bottom:0;left:0;width:1px;height:1px;opacity:0;padding:0;border:0;' +
    'font-size:16px;pointer-events:none;z-index:-1;caret-color:transparent;background:transparent'
  host.appendChild(moi)

  let xBatDau = 0
  let yBatDau = 0
  let idHanCho: ReturnType<typeof setTimeout> | undefined

  const huyHanCho = () => {
    if (idHanCho !== undefined) {
      clearTimeout(idHanCho)
      idHanCho = undefined
    }
  }

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    xBatDau = e.touches[0].clientX
    yBatDau = e.touches[0].clientY
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (e.changedTouches.length !== 1) return

    const t = e.changedTouches[0]
    if (Math.hypot(t.clientX - xBatDau, t.clientY - yBatDau) > NGUONG_KEO_PX) return

    const dangFocus = host.ownerDocument.activeElement
    // Đang gõ trong một editor thật rồi → đừng cướp focus giữa chừng.
    if (laEditorThat(dangFocus, moi)) return

    // MỒI: focus đồng bộ, ngay trong cử chỉ. `preventScroll` để iOS không giật trang khi ô nằm ở
    // đáy màn hình.
    try {
      moi.focus({ preventScroll: true })
    } catch {
      moi.focus()
    }

    // Chờ editor thật của BlockSuite nhận focus (lượt `focusTextModel()` bị hoãn). Nhận được thì bỏ
    // focus phần tử mồi — bàn phím đã ở tay editor. Không nhận được trong hạn thì cú chạm này không
    // mở editor nào (pan/chọn) → bỏ focus để bàn phím không lơ lửng.
    huyHanCho()
    idHanCho = setTimeout(() => {
      idHanCho = undefined
      if (host.ownerDocument.activeElement === moi) moi.blur()
    }, HAN_CHO_EDITOR_MS)
  }

  const onFocusIn = (e: FocusEvent) => {
    if (idHanCho === undefined) return
    if (laEditorThat(e.target as Element | null, moi)) {
      huyHanCho()
      if (host.ownerDocument.activeElement === moi) moi.blur()
    }
  }

  // Capture: bắt trước khi cây Lit bên trong có thể `stopPropagation()`.
  host.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
  host.addEventListener('touchend', onTouchEnd, { capture: true, passive: true })
  host.addEventListener('focusin', onFocusIn, { capture: true })

  return () => {
    huyHanCho()
    host.removeEventListener('touchstart', onTouchStart, { capture: true })
    host.removeEventListener('touchend', onTouchEnd, { capture: true })
    host.removeEventListener('focusin', onFocusIn, { capture: true })
    moi.remove()
  }
}
