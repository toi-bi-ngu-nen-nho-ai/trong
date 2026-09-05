// @vitest-environment happy-dom
//
// Ca kiểm hồi quy cho cờ `enable_mobile_keyboard_toolbar` — nửa CÒN LẠI của tiêu chí 5 Plan 1
// ("dưới 768 px vẫn gõ được, thanh công cụ bàn phím ảo hiện ra"). `ban-phim-ao-trang.spec.ts` canh
// vế thứ nhất (provider có mặt nên widget không NÉM); tệp này canh vế thứ hai (widget thật sự
// RENDER ra gì đó).
//
// LỖI GỐC (đo 2026-09-05 trên Chrome thật qua CDP, giả lập Pixel 8 — Browser pane không làm được vì
// nó không sinh sự kiện chuẩn hoá của `UIEventDispatcher`): mở bài viết ở 390 px, gõ được chữ,
// widget `drt-keyboard-toolbar-widget` ĐÃ gắn, `_show$` true, `readonly` false, `IS_MOBILE` true —
// mà không có thanh công cụ nào. Truy nguyên tới tận dòng:
//   - `widgets/keyboard-toolbar/src/widget.ts:100-104` `render()` trả `nothing` khi
//     `!store.get(FeatureFlagService).getFlag('enable_mobile_keyboard_toolbar')`.
//   - Cờ đó mặc định `false` (`affine/shared/src/services/feature-flag-service.ts:40`) và app này
//     chưa bật ở đâu cả — `grep -rn enable_mobile_keyboard_toolbar src/` chỉ ra cây vendored.
// Chứng minh bằng thí nghiệm trên chính trang đang chạy: đọc cờ ⇒ `false`; gọi
// `setFlag(..., true)` ⇒ thanh công cụ hiện tức thì, 390×46 px sát đáy, đủ nút (+, Aa, ảnh,
// undo/redo, thụt lề, bullet, đánh số, bàn phím). Tức mọi mảnh khác đã đúng, chỉ thiếu một lượt bật.
//
// VÌ SAO BẬT Ở `taoHoacMoDoc` CHỨ KHÔNG PHẢI TRONG `extensions.ts`. `FeatureFlagService` là
// `StoreExtension` (tầng Store), không phải view extension — nó nằm trong `storeManager.get('store')`
// và chỉ với được qua một `Store` đã dựng. `layExtensionsTrang()` trả extension của tầng view, không
// chạm được cờ này.
//
// VÌ SAO CHỈ BẬT CHO BÀI VIẾT. Widget bàn phím chỉ gắn ở scope `page` (xem
// `ban-phim-ao-trang.spec.ts`), nên bật cho sơ đồ là mở rộng diện rủi ro cho một thứ không ai dùng
// — cùng lập luận đã dùng để giữ `banPhimAoTrang` khỏi `layExtensionsEdgeless()`. Ca thứ hai dưới
// đây canh chiều đó.
import 'fake-indexeddb/auto'

import { FeatureFlagService } from '@blocksuite/affine-shared/services'
import { describe, expect, it } from 'vitest'

import { taoHoacMoDoc } from '../mo-doc'

describe('cờ enable_mobile_keyboard_toolbar', () => {
  it('BẬT cho doc bài viết — nếu không, thanh công cụ bàn phím không bao giờ render', async () => {
    const { store, workspace } = await taoHoacMoDoc('co-ban-phim-1', 'bai-viet')

    expect(store.get(FeatureFlagService).getFlag('enable_mobile_keyboard_toolbar')).toBe(true)

    workspace.forceStop()
  })

  it('KHÔNG bật cho doc sơ đồ — widget bàn phím không gắn ở scope edgeless', async () => {
    const { store, workspace } = await taoHoacMoDoc('co-ban-phim-2', 'so-do')

    expect(store.get(FeatureFlagService).getFlag('enable_mobile_keyboard_toolbar')).toBe(false)

    workspace.forceStop()
  })
})
