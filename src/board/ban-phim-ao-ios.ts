// Mở bàn phím ảo iOS khi chạm vào bảng vẽ để soạn chữ — HƯỚNG B của HANDOFF mục 7.
//
// VẤN ĐỀ. Safari trên iOS chỉ bật bàn phím ảo khi `.focus()` lên một phần tử soạn thảo được gọi
// ĐỒNG BỘ, ngay bên trong handler của cử chỉ người dùng (`touchend`/`pointerup`). Cây vendored
// không làm được điều đó và không phải vì một dòng lệch: `note-tool.ts` gọi `focusTextModel()`
// bên trong `requestAnimationFrame`, còn `focusTextModel()` tự nó KHÔNG gọi `.focus()` — nó chỉ
// đặt một `TextSelection` trong store, và `.focus()` thật xảy ra sau đó qua một tầng reactive nữa.
// Mỗi lớp hoãn là một lần cắt chuỗi "user gesture"; Safari lặng lẽ từ chối, không lỗi, không cảnh
// báo. Toàn bộ cây (paragraph, list, callout, note, doc-title, edgeless-text) đều hoãn kiểu này —
// đây là kiến trúc focus-qua-selection-reactive của AFFiNE, không phải một dòng lệch vá được.
//
// VÌ SAO VÁ Ở ĐÂY CHỨ KHÔNG VÁ CHỖ HỎNG. Hai file kia nằm trong `src/vendor/blocksuite/`, luật D11
// bắt khớp thượng nguồn nguyên văn. Vá thượng nguồn nghĩa là mang một vết lệch vĩnh viễn phải
// rebase mỗi lần nâng cấp vendor, cho một hành vi mà bản thân thượng nguồn có thể sửa khác đi.
// Bọc phía app đắt hơn về mặt tinh tế nhưng không nợ gì cây vendored.
//
// CÁCH LÀM. Lúc `pointerup`, phần tử soạn thảo THẬT của một note mới chưa tồn tại — nó chỉ ra đời
// sau khi công cụ chạy xong. Nên không thể "focus phần tử gần nhất". Thay vào đó focus một phần tử
// MỒI đã nằm sẵn trong DOM: Safari mở bàn phím vì lệnh gọi nằm đúng trong cử chỉ, rồi vài nhịp sau
// cơ chế reactive của BlockSuite tự chuyển focus sang phần tử thật. Safari GIỮ bàn phím khi focus
// chuyển giữa hai phần tử soạn thảo — nó chỉ khắt khe ở lúc MỞ.
//
// BA CHỖ DỄ HỎNG, đã tính trước:
//  1. Chạm để chọn/kéo mà cũng bật bàn phím thì tệ hơn là không có bàn phím. Nên chỉ mượn mồi khi
//     công cụ đang bật là công cụ TẠO CHỮ; mọi công cụ khác không đụng gì.
//  2. Nếu không có gì nhận bàn giao (người dùng huỷ, công cụ không tạo được note), mồi phải tự
//     buông sau `hanChoMs` để bàn phím đóng lại thay vì treo trên một ô vô hình.
//  3. Chạm vào chữ ĐÃ có sẵn thì phần tử soạn thảo đang nằm ngay dưới ngón tay — focus thẳng vào
//     nó, không mượn mồi, để không có nhịp bàn giao nào cả.

/** Tên công cụ mà một lượt chạm sẽ đẻ ra chỗ soạn chữ — đọc từ `gfx.tool.currentToolName$`. */
export const CONG_CU_TAO_CHU: ReadonlySet<string> = new Set([
  'affine:note',
  'affine:edgeless-text',
  // Công cụ "Chữ" của thanh công cụ: cùng đường tạo edgeless-text nhưng tên khác tuỳ lối vào.
  'text',
])

export type ThamSoBanPhimAo = {
  /** Lớp bọc `.drt-edgeless-viewport` — nơi gắn listener. */
  viewport: HTMLElement
  /** Phần tử mồi (contenteditable vô hình), phải đã nằm trong DOM trước lượt chạm đầu tiên. */
  moi: HTMLElement
  /** Chỉ gắn trên iOS. Máy tính bàn có bàn phím thật, mượn focus ở đó chỉ gây hại. */
  laIOS: boolean
  /** Đọc tên công cụ đang bật; trả `undefined` khi bảng chưa dựng xong. */
  layTenCongCu: () => string | undefined
  /** Hạn chờ bàn giao focus trước khi mồi tự buông. */
  hanChoMs?: number
}

/**
 * Gắn cơ chế mở bàn phím ảo. Trả về hàm gỡ — gọi khi component unmount.
 *
 * CHƯA NGHIỆM THU TRÊN THIẾT BỊ THẬT. Bộ ca kiểm `__tests__/ban-phim-ao-ios.spec.ts` canh được
 * "cái gì được focus, đồng bộ hay không, trong tình huống nào", nhưng happy-dom không có bàn phím
 * ảo nên nó KHÔNG chứng minh Safari iOS chịu mở. Khoản đó phải nghiệm thu trên iPhone thật.
 */
export function ganMoBanPhimAoIOS({
  viewport,
  moi,
  laIOS,
  layTenCongCu,
  hanChoMs = 1200,
}: ThamSoBanPhimAo): () => void {
  if (!laIOS) return () => {}

  let hen: ReturnType<typeof setTimeout> | undefined

  // Buông mồi CHỈ KHI nó vẫn đang giữ focus: nếu BlockSuite đã bàn giao xong thì `activeElement` là
  // phần tử soạn thảo thật, và blur ở đây sẽ đóng đúng cái bàn phím ta vừa mở ra.
  const buongMoi = () => {
    if (document.activeElement === moi) moi.blur()
    // Dọn chữ người dùng lỡ gõ vào mồi trong khoảng bàn giao. Mồi vô hình nên chữ sót lại không ai
    // thấy, nhưng nó sẽ được đọc lên bởi trình đọc màn hình và dính vào lượt chạm sau.
    if (moi.textContent) moi.textContent = ''
  }

  const huyHen = () => {
    if (hen !== undefined) {
      clearTimeout(hen)
      hen = undefined
    }
  }

  const khiCham = (e: PointerEvent) => {
    // Chuột/bút trên iPad kèm bàn phím rời: không có bàn phím ảo để mở, mượn focus chỉ cướp con trỏ.
    if (e.pointerType === 'mouse') return

    const dich = e.target
    if (dich instanceof Element) {
      // Vùng soạn thảo đã có sẵn dưới ngón tay (chạm vào chữ của một note đang mở) — focus thẳng,
      // không qua mồi. Loại trừ chính mồi để một lượt chạm trúng nó không tự khoá vào nhau.
      const oSoan = dich.closest('[contenteditable="true"]')
      if (oSoan instanceof HTMLElement && oSoan !== moi) {
        huyHen()
        if (document.activeElement !== oSoan) oSoan.focus({ preventScroll: true })
        return
      }
    }

    // `layTenCongCu` đi qua API nội bộ của cây vendored (`gfx.tool.currentToolName$`) và có thể ném
    // khi bảng chưa dựng xong hoặc khi thượng nguồn đổi hình dạng. Một lượt chạm không mở được bàn
    // phím là phiền; một lượt chạm ném lỗi giữa handler là hỏng cả thao tác.
    let ten: string | undefined
    try {
      ten = layTenCongCu()
    } catch {
      return
    }
    if (!ten || !CONG_CU_TAO_CHU.has(ten)) return

    // ĐỒNG BỘ, ngay tại đây: mọi lớp hoãn (rAF/microtask/setTimeout) đều cắt chuỗi user-gesture và
    // Safari sẽ từ chối. Đây là toàn bộ lý do file này tồn tại — đừng "gọn hoá" bằng cách hoãn.
    moi.focus({ preventScroll: true })

    huyHen()
    hen = setTimeout(() => {
      hen = undefined
      buongMoi()
    }, hanChoMs)
  }

  viewport.addEventListener('pointerup', khiCham)

  return () => {
    viewport.removeEventListener('pointerup', khiCham)
    huyHen()
    buongMoi()
  }
}
