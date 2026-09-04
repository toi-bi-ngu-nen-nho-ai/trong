// @vitest-environment happy-dom
//
// Ca kiểm hồi quy cho `VirtualKeyboardProvider` — CÙNG LỚP LỖI với `ViewportElementProvider` mà
// `trang-mount.spec.ts` canh: một service mà APP CHỦ phải cấp, AFFiNE thật có cấp, dự án này thì
// chưa. Đọc `trang-mount.spec.ts` trước để hiểu khuôn dựng `BlockStdScope`.
//
// LỖI GỐC (đo 2026-09-04): mở bài viết ở chế độ mobile ném
// `Uncaught … Service [VirtualKeyboardProvider] not found in container`. Truy nguyên tới tận dòng:
//   - `widgets/keyboard-toolbar/src/view.ts:20-25` gắn widget khi `scope === 'mobile-page'` HOẶC
//     (`scope === 'page'` VÀ `IS_MOBILE`) — tức đúng bộ `viewManager.get('page')` mà
//     `layExtensionsTrang()` dùng, chỉ khác là trên máy để bàn cổng IS_MOBILE đóng nên không lộ.
//   - `widgets/keyboard-toolbar/src/widget.ts:27` getter `keyboard` gọi
//     `this.std.get(VirtualKeyboardProvider)` — `get`, KHÔNG phải `getOptional` — nên NÉM khi chưa
//     ai đăng ký. Trớ trêu: ngay dưới đó (dòng 30-47) thượng nguồn có sẵn nhánh `fallback: true`
//     dựng bàn phím dự phòng bằng `inputMode`; nhánh ấy không bao giờ tới được vì `get` ném trước.
//   - Gọi từ `connectedCallback()` (dòng 70), tức ném NGAY lúc gắn widget.
// D11 cấm sửa cây vendored ⇒ vá phía app: đăng ký provider trong `layExtensionsTrang()`.
//
// VÌ SAO KHÔNG GIẢ LẬP `IS_MOBILE` Ở ĐÂY. `IS_MOBILE` là hằng số tính một lần lúc nạp module
// (`framework/global/src/env/index.ts:31`), và `viewManager` là singleton cấp module — `.get('page')`
// chạy `setup()` đúng một lần cho cả tiến trình test, nên một `vi.mock` trong tệp này không đảo được
// quyết định đã chốt ở lượt `.get()` đầu tiên của tiến trình. Ca kiểm dưới đây thay vào đó khẳng
// định thẳng ĐIỀU KIỆN CẦN VÀ ĐỦ để widget không ném: container của chế độ trang PHẢI phân giải
// được `VirtualKeyboardProvider`. Gỡ `banPhimAoTrang` khỏi `layExtensionsTrang()` là hai ca đầu đỏ
// ngay — đã chứng minh bằng cách chạy chúng TRƯỚC khi có bản vá.
import 'fake-indexeddb/auto'

import { VirtualKeyboardProvider } from '@blocksuite/affine-shared/services'
import { BlockStdScope } from '@blocksuite/affine/std'
import { describe, expect, it } from 'vitest'

import { layExtensionsEdgeless, layExtensionsTrang } from '../extensions'
import { taoHoacMoDoc } from '../mo-doc'

describe('VirtualKeyboardProvider ở chế độ trang', () => {
  it('container chế độ trang phân giải được VirtualKeyboardProvider (không ném)', async () => {
    const { store, workspace } = await taoHoacMoDoc('ban-phim-ao-1', 'bai-viet')
    const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })

    expect(() => std.get(VirtualKeyboardProvider)).not.toThrow()

    workspace.forceStop()
  })

  it('cấp đủ bốn signal của interface và CỐ Ý không có show/hide', async () => {
    const { store, workspace } = await taoHoacMoDoc('ban-phim-ao-2', 'bai-viet')
    const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })

    const provider = std.get(VirtualKeyboardProvider)

    // Bốn signal là TOÀN BỘ `interface VirtualKeyboardProvider`
    // (affine/shared/src/services/virtual-keyboard-service.ts). Thiếu một cái là thượng nguồn đọc
    // `undefined.value` ở chỗ khác.
    expect(provider.visible$.value).toBe(false)
    expect(provider.height$.value).toBe(0)
    expect(provider.staticHeight$.value).toBe(0)
    expect(provider.appTabSafeArea$.value).toBe('0px')

    // KHÔNG có `show`/`hide` là CÓ CHỦ Ý, không phải thiếu sót:
    // `isVirtualKeyboardProviderWithAction()` chỉ kiểm `'show' in provider`, và khi nó trả false thì
    // widget thượng nguồn tự dựng nhánh `fallback` điều khiển bàn phím bằng `inputMode` của chính
    // nó — đúng hành vi ta muốn. Thêm `show`/`hide` rỗng vào đây sẽ TẮT nhánh fallback đó và làm
    // bàn phím mềm không bật lên được nữa.
    expect('show' in provider).toBe(false)
    expect('hide' in provider).toBe(false)

    workspace.forceStop()
  })

  it('chế độ bảng vẽ KHÔNG đăng ký provider này — bản vá đúng phạm vi', async () => {
    const { store, workspace } = await taoHoacMoDoc('ban-phim-ao-3', 'so-do')
    const std = new BlockStdScope({ store, extensions: layExtensionsEdgeless() })

    // Widget bàn phím chỉ gắn cho scope `page` (view.ts:20-25) nên edgeless không cần provider.
    // Ca này canh PHẠM VI bản vá: nhét `banPhimAoTrang` vào `layExtensionsEdgeless()` là đỏ.
    expect(std.getOptional(VirtualKeyboardProvider) ?? null).toBeNull()

    workspace.forceStop()
  })
})
