// ─── Cấp `VirtualKeyboardProvider` cho chế độ trang ─────────────────────────────────────────────
//
// LỖI GỐC (đo trên trình duyệt 2026-09-04): mở bài viết ở chế độ mobile ném
// `Uncaught … Service [VirtualKeyboardProvider] not found in container`, MỖI lần mở.
//
// Chuỗi nhân quả, truy tới tận dòng:
//   1. `widgets/keyboard-toolbar/src/view.ts:20-25` gắn `keyboardToolbarWidget` khi
//      `scope === 'mobile-page'` HOẶC (`scope === 'page'` VÀ `IS_MOBILE`). Bộ
//      `viewManager.get('page')` mà `layExtensionsTrang()` dùng rơi vào vế thứ hai — nên lỗi CHỈ
//      xuất hiện trên thiết bị di động, còn máy để bàn im lặng.
//   2. `widgets/keyboard-toolbar/src/widget.ts:27` — getter `keyboard` gọi
//      `this.std.get(VirtualKeyboardProvider)`, dùng `get` chứ KHÔNG phải `getOptional`, nên nó NÉM
//      khi app chủ chưa đăng ký.
//   3. Trớ trêu nhất: ngay dưới đó (widget.ts:30-47) thượng nguồn đã có sẵn một nhánh
//      `fallback: true` tự dựng bàn phím dự phòng bằng `inputMode`. Nhánh ấy KHÔNG BAO GIỜ tới được
//      vì `get` đã ném ở dòng trên.
//   4. Điểm gọi là `connectedCallback()` (widget.ts:70) — tức ném ngay lúc gắn widget, đúng lớp lỗi
//      mà một extension ném trong `mounted()` từng cắt ngang cả `BlockStdScope.mount()`.
//
// Cùng lớp với `ViewportElementProvider` đã bắt được ở cổng chặn Task 1: một service mà APP CHỦ
// phải cấp, AFFiNE thật có cấp ở `packages/frontend/core`, dự án này thì chưa. D11 cấm sửa cây
// vendored ⇒ vá đúng chỗ là phía app.
//
// VÌ SAO PROVIDER TĨNH (mọi signal đứng yên) LÀ ĐÚNG, KHÔNG PHẢI KÊ TẠM. Đọc kỹ bên tiêu thụ trước
// khi chọn giá trị — thượng nguồn đã thiết kế sẵn đường degrade cho đúng trường hợp "app chủ không
// đo được bàn phím thật":
//   - `keyboard-toolbar.ts:52-64` `panelHeight`: `visible$` false ⇒ nếu panel đang mở thì dùng
//     `staticHeight$ !== 0 ? staticHeight$ : 330` — tức số 0 của ta kích hoạt ĐÚNG mặc định 330px
//     của thượng nguồn; ngoài ra trả `appTabSafeArea$` ('0px' = không chừa lề, đúng vì app này
//     không có tab bar dưới đáy như AFFiNE mobile).
//   - `keyboard-toolbar.ts:251-257` nút bàn phím: `staticHeight$ === 0` ⇒ đi nhánh
//     `_closeToolPanel()`, và nhánh đó gọi `keyboard.show()` (dòng 72) — chính là `show` dự phòng
//     bằng `inputMode` của widget. Bàn phím mềm vẫn bật lên được.
// Đo được chiều cao bàn phím thật đòi `visualViewport` + theo dõi resize; đó là một chặng riêng,
// và làm sai nó còn tệ hơn số 0 (toolbar nhảy loạn theo số đo rác).
//
// VÌ SAO CỐ Ý KHÔNG CÓ `show`/`hide`. `isVirtualKeyboardProviderWithAction()`
// (shared/src/services/virtual-keyboard-service.ts) chỉ kiểm `'show' in provider`. Trả false là
// widget tự dựng nhánh `fallback` điều khiển bàn phím bằng `inputMode` của chính nó — đúng thứ ta
// muốn. Thêm `show`/`hide` rỗng vào đây sẽ TẮT nhánh fallback ấy và làm bàn phím mềm không bật lên
// được nữa: một bản vá trông "đầy đủ hơn" mà hỏng nặng hơn.
//
// PHẠM VI: chỉ chế độ trang. `layExtensionsEdgeless()` KHÔNG lấy extension này — widget bàn phím
// chỉ gắn cho scope `page`, đăng ký thừa là mở rộng diện rủi ro cho một thứ không ai dùng. Ca kiểm
// `ban-phim-ao-trang.spec.ts` canh cả hai chiều.
import { VirtualKeyboardProvider } from '@blocksuite/affine-shared/services'
import type { ExtensionType } from '@blocksuite/store'
import { signal } from '@preact/signals-core'

// Signal cấp module, dựng một lần: bốn giá trị này BẤT BIẾN trong hiện thực tĩnh, nên chia sẻ giữa
// mọi trình soạn thảo là rẻ và không tạo trạng thái dùng chung nào có thể lệch. Ngày nào đo được
// bàn phím thật thì đổi thành factory theo từng container.
const khongHien = signal(false)
const khongCao = signal(0)
const khongLeAnToan = signal('0px')

/**
 * Hiện thực tối thiểu của `interface VirtualKeyboardProvider` — đúng bốn signal, không hơn.
 *
 * CỐ Ý không dùng `satisfies VirtualKeyboardProvider`: định danh
 * `VirtualKeyboardProvider` được xuất vừa là interface vừa là identifier DI, và ràng kiểu ở đây
 * không ngăn được đúng cái sai đáng sợ nhất — lỡ tay thêm `show`/`hide`. Ca kiểm canh việc đó.
 */
const banPhimAoTinh = {
  visible$: khongHien,
  height$: khongCao,
  staticHeight$: khongCao,
  appTabSafeArea$: khongLeAnToan,
}

/**
 * Extension đăng ký `VirtualKeyboardProvider` cho CHẾ ĐỘ TRANG.
 *
 * Dùng `addImpl` chứ không `override`: `override` chỉ thay được một hiện thực ĐÃ đăng ký, mà không
 * ai trong `viewManager.get('page')` đăng ký service này (đó chính là lỗi gốc). Truyền thẳng đối
 * tượng — `ContainerEditor.addImpl` (framework/global/src/di/container.ts:335-345) rẽ sang
 * `addValue` cho mọi thứ không phải `Function`.
 */
export const banPhimAoTrang: ExtensionType = {
  setup: di => {
    di.addImpl(VirtualKeyboardProvider, banPhimAoTinh)
  },
}
