// ─── Cấp `QuickSearchProvider` cho bảng vẽ — nút "Liên kết" trong menu Ghi chú ──────────────────
//
// LỖI GỐC (nợ §1.1 của HANDOFF.md, chủ dự án hoãn 2026-08-31, mở lại 2026-09-05):
// bấm nút "Liên kết" trong menu Ghi chú trên bảng vẽ KHÔNG có phản hồi nào.
//
// Chuỗi nhân quả, truy tới tận dòng:
//   1. `gfx/note/src/toolbar/note-menu.ts:68-71` — nút chạy `insertLinkByQuickSearchCommand`.
//   2. `blocks/bookmark/src/commands/insert-link-by-quick-search.ts:22-25` — dòng đầu của lệnh:
//      `const s = std.getOptional(QuickSearchProvider); if (!s) return`. Thoát im lặng, KHÔNG gọi
//      `next()`.
//   3. Vì `next()` không chạy, `insertedLinkType` là `undefined`, nên `?.then(...)` ở note-menu.ts
//      cũng thành no-op. Không lỗi, không toast, không gì cả.
// `QuickSearchProvider` là service APP CHỦ phải cấp (AFFiNE cấp hộp thoại tìm tài liệu / dán URL).
// Cùng lớp với `ViewportElementProvider` và `VirtualKeyboardProvider` (xem ./ban-phim-ao.ts).
//
// PHẠM VI: CHỈ edgeless. Quét cả cây vendored, `QuickSearchProvider` có ĐÚNG MỘT bên tiêu thụ là
// lệnh ở (2), và lệnh ấy chỉ được gọi từ `note-menu.ts` — thanh công cụ Ghi chú của bảng vẽ, dùng
// `this.edgeless.service.std`. `layExtensionsTrang()` KHÔNG lấy extension này.
//
// ─── Vì sao KHÔNG dùng `toggleEmbedCardCreateModal()` của thượng nguồn ─────────────────────────
//
// Thượng nguồn có sẵn helper ấy (`components/src/embed-card-modal/embed-card-create-modal.ts:180`)
// và nó gần đúng thứ ta cần: chế độ `edgeless` nhận `onSave(url)` rồi trả URL về cho bên gọi thay
// vì tự chèn khối. Nhưng đọc kỹ vòng đời của modal thì nó có BA đường thoát:
//   - `_onCancel` (bấm nền mờ)     → chỉ `this.remove()`
//   - phím Escape                  → chỉ `this.remove()`
//   - `_onConfirm` (bấm xác nhận)  → `onSave(url)` → `this.onConfirm(...)` → `this.remove()`
// Promise mà helper trả về CHỈ resolve trong `onConfirm`. Nghĩa là người dùng mở hộp thoại rồi bấm
// Escape thì promise treo VĨNH VIỄN — `openQuickSearch()` không bao giờ settle, `insertedLinkType`
// không bao giờ settle, và `?.then` ở note-menu.ts không bao giờ chạy. Đó là đổi một lỗi im lặng
// lấy một promise rò rỉ: nhìn từ người dùng vẫn là "bấm huỷ xong không sao", nhưng để lại rác.
//
// Nên ở đây tự dựng modal (đúng 6 dòng helper kia làm) để GIỮ tham chiếu, rồi móc vào `remove()` —
// điểm chung DUY NHẤT của cả ba đường thoát. Kết quả: huỷ resolve `null`, lưu resolve
// `{ externalUrl }`, không đường nào treo.
//
// RỦI RO ĐÃ BIẾT của phép móc này: nếu bản nâng cấp cây vendored sau đổi cách gỡ modal (ví dụ dùng
// `parentNode.removeChild(this)` thay vì `this.remove()`), phép móc mất tác dụng và promise quay về
// trạng thái treo — tức đúng bằng hành vi TRƯỚC bản vá, không tệ hơn. `tim-nhanh-lien-ket.spec.ts`
// canh cả hai đường (huỷ và lưu) nên lượt nâng cấp ấy sẽ thấy đỏ.
import { EmbedCardCreateModal } from '@blocksuite/affine-components/embed-card-modal'
import {
  QuickSearchProvider,
  type QuickSearchResult,
} from '@blocksuite/affine-shared/services'
import type { ServiceProvider } from '@blocksuite/global/di'
import { StdIdentifier } from '@blocksuite/std'
import type { ExtensionType } from '@blocksuite/store'

// Hai chuỗi này do BÊN GỌI truyền vào modal (`titleText`/`descriptionText`), nên chúng là chữ của
// app — viết tiếng Việt thẳng ở đây, không đi qua pipeline dịch D12. Ba chuỗi CÒN LẠI của modal
// (placeholder "Input in https://...", nút "Confirm", toast "Invalid link") viết cứng trong cây
// vendored nên phải qua D12; làm ở lượt riêng.
const TIEU_DE = 'Chèn liên kết'
const MO_TA = 'Liên kết dán vào sẽ hiện thành một thẻ trên bảng.'

/**
 * Extension đăng ký `QuickSearchProvider` cho CHẾ ĐỘ BẢNG VẼ.
 *
 * `addImpl` với một HÀM (không phải đối tượng): `ContainerEditor.addImpl` rẽ mọi thứ là `Function`
 * sang `addFactory`, và factory nhận `provider` — cách duy nhất lấy được `std` (rồi `std.host`) tại
 * thời điểm gọi. Cùng khuôn `ViewportElementExtension` của thượng nguồn dùng
 * (`shared/src/services/viewport-element-service.ts:17-20`). Không dùng helper
 * `QuickSearchExtension()` của thượng nguồn vì nó chỉ nhận một đối tượng dựng sẵn, không có đường
 * chạm tới `provider`.
 */
export const timNhanhLienKet: ExtensionType = {
  setup: (di) => {
    di.addImpl(QuickSearchProvider, (provider: ServiceProvider) => ({
      openQuickSearch: () =>
        new Promise<QuickSearchResult>((giaiQuyet) => {
          // `provider.get()` trả `unknown` ở ngữ cảnh biên dịch của app (cùng lớp nhiễu kiểu với
          // `ShadowlessElement` ghi bên dưới). Rút kiểu THẲNG TỪ thuộc tính sắp nhận nó thay vì
          // import thêm `EditorHost`: nếu thượng nguồn đổi kiểu của `host`, dòng này đổi theo, không
          // âm thầm lệch.
          const std = provider.get(StdIdentifier) as {
            host: EmbedCardCreateModal['host']
          }

          const modal = new EmbedCardCreateModal()
          modal.host = std.host
          modal.titleText = TIEU_DE
          modal.descriptionText = MO_TA
          modal.onConfirm = () => {}

          // `mode: 'edgeless'` không có nghĩa "chỉ chạy trên canvas" — nó là nhánh TRẢ URL VỀ cho
          // bên gọi (`onSave`) thay vì nhánh `'page'` vốn tự `addBlock` vào một parentModel. Ta cần
          // đúng nhánh trả về, vì việc chèn khối do lệnh thượng nguồn làm tiếp (nó thử
          // `insertEmbedIframeWithUrlCommand` rồi mới `insertBookmarkCommand`).
          let ketQua: QuickSearchResult = null
          modal.createOptions = {
            mode: 'edgeless',
            onSave: (url) => {
              ketQua = { externalUrl: url }
            },
          }

          // `EmbedCardCreateModal` kế thừa `ShadowlessElement` của cây vendored, mà kiểu ấy KHÔNG
          // phân giải ra `HTMLElement` trong ngữ cảnh biên dịch của app (tsc báo thiếu 315 thuộc
          // tính) — một hệ quả của cách cây vendored được dựng, không phải dấu hiệu sai ở đây: lúc
          // chạy nó vẫn là một custom element thật. Ép kiểu ĐÚNG MỘT LẦN ở đây rồi dùng biến đã ép,
          // thay vì rải `as any` khắp nơi.
          const nut = modal as unknown as HTMLElement

          // Móc vào `remove()` của RIÊNG thực thể này (không đụng prototype, không đụng cây
          // vendored — D11). Cả ba đường thoát của modal đều đi qua đây, nên đây là chỗ duy nhất
          // bảo đảm promise luôn settle đúng một lần.
          const goKhoiDom = HTMLElement.prototype.remove.bind(nut)
          nut.remove = () => {
            goKhoiDom()
            giaiQuyet(ketQua)
          }

          document.body.append(nut)
        }),
    }))
  },
}
