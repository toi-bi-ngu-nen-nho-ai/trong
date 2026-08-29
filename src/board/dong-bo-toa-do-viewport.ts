// Buộc BlockSuite đo lại toạ độ viewport sau khi hiệu ứng vào màn chạy xong.
//
// TRIỆU CHỨNG: chạm tay vào bảng thì con trỏ/note hiện lệch một khoảng so với chỗ ngón tay đặt.
//
// ĐO ĐƯỢC (trình duyệt thật, 375×812 giả lập cảm ứng, 2026-08-29) — hỏi hai bên cùng một câu:
//   DOM thật  (`.drt-edgeless-viewport`.getBoundingClientRect()) → left 0,  top 0,   375×760
//   BlockSuite (`gfx.viewport`)                                  → left 20, top 200, 184×132
// Chạm tại x=117 → note ra đời tại x=154.
//
// CƠ CHẾ. `Viewport.setShellElement()` (vendored `framework/std/src/gfx/viewport.ts:749-763`) đo
// `getBoundingClientRect()` ĐÚNG MỘT LẦN lúc gắn, sau đó chỉ đo lại khi `ResizeObserver` bắn.
// `ResizeObserver` theo dõi KÍCH THƯỚC HỘP, mà `transform` không đổi kích thước hộp — nên nó không
// bao giờ bắn vì transform. Nhưng `getBoundingClientRect()` thì CÓ tính transform. Bảng mount bên
// trong lớp bọc đang chạy hiệu ứng FLIP (`board-flip-run`, BoardGallery.tsx, transform sống ~380ms):
// bảng nào mount kịp trong cửa sổ đó đóng đinh số đo méo vĩnh viễn, không đường nào tự sửa. Mọi lượt
// chạm sau đó đi qua `toModelCoord(clientX - _left, clientY - _top)` nên lệch nguyên khối.
//
// Vì sao KHÔNG vá bằng cách hoãn mount bảng tới khi hiệu ứng xong: bảng nặng, mount song song với
// hiệu ứng chính là thứ làm lượt mở bảng thấy nhanh. Đổi lấy vài trăm ms cho một phép đo là đắt.
//
// Vì sao KHÔNG đụng vendor: luật D11. Hai lệnh dùng ở đây đều CÔNG KHAI.

/** Phần API của `Viewport` mà phép đồng bộ này cần — không có kiểu công khai nào để import. */
export type ViewportCoDoLai = {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
  clearViewportElement(): void
  setShellElement(el: HTMLElement): void
}

/**
 * Nửa pixel: dưới ngưỡng này là sai số làm tròn của trình duyệt trên màn hình DPR lẻ, không phải
 * lệch thật. Đo lại vì một phần nghìn pixel chỉ tốn công và làm nhiễu.
 */
export const NGUONG_LECH_PX = 0.5

/**
 * So số của BlockSuite với DOM thật; lệch thì buộc đo lại. Trả `true` nếu đã đo lại.
 *
 * `clearViewportElement()` phải đứng TRƯỚC `setShellElement()` và không phải cho gọn: nó ngắt và
 * huỷ `ResizeObserver` cũ. Thiếu nó, mỗi lượt đồng bộ để lại một observer vẫn đang theo dõi cùng
 * phần tử — `setShellElement()` gán đè `this._resizeObserver` mà không huỷ cái trước.
 */
export function dongBoToaDoNeuLech(v: ViewportCoDoLai, el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  // Phần tử chưa có kích thước (bảng đang tháo, hoặc `display:none` tạm thời): đo lại lúc này chỉ
  // đóng đinh một khung 0×0 vào chỗ của số cũ — tệ hơn số cũ. Đợi lượt sự kiện sau.
  if (r.width === 0 || r.height === 0) return false

  const lech =
    Math.abs(v.left - r.left) > NGUONG_LECH_PX ||
    Math.abs(v.top - r.top) > NGUONG_LECH_PX ||
    Math.abs(v.width - r.width) > NGUONG_LECH_PX ||
    Math.abs(v.height - r.height) > NGUONG_LECH_PX
  if (!lech) return false

  v.clearViewportElement()
  v.setShellElement(el)
  return true
}

export type ThamSoDongBo = {
  /** Lớp bọc `.drt-edgeless-viewport` — chính phần tử mà BlockSuite lấy làm shell. */
  viewport: HTMLElement
  /** Đọc `gfx.viewport`; trả `undefined` khi bảng chưa dựng xong. */
  layViewport: () => ViewportCoDoLai | undefined
}

/**
 * Nghe `transitionend`/`animationend` và đồng bộ lại khi cần. Trả về hàm gỡ.
 *
 * Nghe ở pha CAPTURE trên `window`, không phải trên chính viewport: lớp bọc chạy hiệu ứng là TỔ
 * TIÊN của viewport (`[data-testid="boc-bang"]` trong BoardGallery), nên sự kiện của nó không bao
 * giờ đi qua viewport dù `transitionend` có nổi bọt.
 *
 * Hai đường hiệu ứng đều được phủ: `.board-flip-run` dùng CSS transition (`transitionend`),
 * `.board-in` — đường mở bảng không có thẻ nguồn — dùng CSS animation (`animationend`).
 *
 * Không đặt hẹn giờ dự phòng: nếu hiệu ứng KHÔNG chạy thì cũng không có transform nào làm méo phép
 * đo, tức đúng cái ca không cần vá. Chỉ đường "có hiệu ứng" mới cần, và đường đó luôn kết thúc bằng
 * một trong hai sự kiện trên.
 */
export function ganDongBoToaDoSauHieuUng({ viewport, layViewport }: ThamSoDongBo): () => void {
  const xuLy = () => {
    let v: ViewportCoDoLai | undefined
    try {
      v = layViewport()
    } catch {
      // `layViewport` đi qua API nội bộ của cây vendored — thượng nguồn đổi hình dạng thì mất phép
      // đồng bộ, chứ không được làm hỏng thao tác đang diễn ra.
      return
    }
    if (!v) return
    try {
      dongBoToaDoNeuLech(v, viewport)
    } catch {
      // Như trên: `clearViewportElement`/`setShellElement` cũng là bề mặt vendored.
    }
  }

  window.addEventListener('transitionend', xuLy, true)
  window.addEventListener('animationend', xuLy, true)
  return () => {
    window.removeEventListener('transitionend', xuLy, true)
    window.removeEventListener('animationend', xuLy, true)
  }
}
