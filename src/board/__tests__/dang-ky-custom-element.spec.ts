// @vitest-environment happy-dom
//
// Canh việc ĐĂNG KÝ CUSTOM ELEMENT — tác dụng phụ duy nhất biến các lớp Lit thành thẻ DOM dùng
// được. Mất nó, màn hình chỉ còn một canvas trắng: không log, không ném lỗi, chỉ người ngồi nhìn
// mới thấy. Đây KHÔNG phải ca kiểm tree-shaking: vitest chạy qua transform dev của Vite, không
// tree-shake gì cả, nên ca này không thể đỏ vì lý do đó. Đường đăng ký hiện đi qua một chuỗi gọi
// hàm đang SỐNG trong luồng thật (`ViewExtensionManager.get() → setup() → effect() → effects()`,
// xem đoạn dưới), không phải một import chỉ-lấy-tác-dụng-phụ nên vốn dĩ không có gì để tree-shake.
// Cái ca này thật sự canh: chuỗi gọi đó còn sống sót qua các lần sửa `viewExtensions` (thêm/bớt/
// đổi thứ tự extension, đổi cách `EdgelessBoard.tsx` dựng `ViewExtensionManager`...). Refactor nào
// làm đứt mạch thì `customElements.get(...)` trả về `undefined` và ca này đỏ ngay, thay vì im lặng
// thành canvas trắng ở runtime.
//
// PHÁT HIỆN quan trọng khi viết ca này: đường đăng ký KHÔNG đi qua `import '@blocksuite/affine/effects'`.
// Ở bản vendored (BlockSuite 0.27), `affine/all/src/effects.ts` chỉ toàn `import { type effects ... }`
// — nhập KIỂU — nên `tsc` biên dịch nó thành đúng một dòng `export {};` (tự kiểm:
// `cat .vendor-build/affine/all/src/effects.js`). Một file rỗng thì không đăng ký gì cả; ca kiểm
// đầu tiên viết theo hướng đó đã đỏ với "expected undefined to be defined".
// Nơi thật sự gọi `customElements.define(...)` là các ViewExtension: `ViewExtensionProvider.setup()`
// gọi `effect()` MỘT LẦN cho mỗi lớp provider, và `effect()` của từng gói gọi `effects()` của gói đó
// (xem affine/blocks/root/src/view.ts, dòng `effects()` trong `override effect()`).
// Vì vậy ca này canh đúng đường đó: dựng `ViewExtensionManager` từ `viewExtensions` của dự án —
// y hệt điều `EdgelessBoard.tsx` làm — rồi kiểm các thẻ đã được đăng ký.
import { ViewExtensionManager } from '@blocksuite/affine/ext-loader'
import { describe, expect, it } from 'vitest'

import { layExtensionsTrang, viewExtensions } from '../extensions'

describe('đăng ký custom element từ danh sách view extension', () => {
  it('nạp scope edgeless là các thẻ Lit có mặt trong customElements', () => {
    new ViewExtensionManager(viewExtensions).get('edgeless')

    // Đại diện phía bảng vẽ (tên đã đổi affine-→drt- ở bước build vendor).
    expect(customElements.get('drt-edgeless-root')).toBeDefined()
    // Đại diện phía khung chạy — do `@blocksuite/std/effects` đăng ký, kéo theo qua chuỗi
    // effect() ở trên. Tên này thượng nguồn không mang tiền tố affine- nên không đổi.
    expect(customElements.get('editor-host')).toBeDefined()

    // Đối chứng: tên chưa bao giờ được đăng ký phải là undefined. Thiếu dòng này thì hai kỳ vọng
    // trên có thể xanh chỉ vì `customElements.get` trả về thứ gì đó cho mọi tên.
    expect(customElements.get('drt-khong-bao-gio-dang-ky')).toBeUndefined()

    // Hai kỳ vọng trên (root, editor-host) xanh ngay cả khi `viewExtensions` chỉ còn ĐÚNG hai
    // phần tử đó — chúng không canh được việc BỚT một extension đơn lẻ khỏi danh sách 22 phần tử.
    // Hai dòng dưới bịt lỗ đó: kiểm hai thẻ Lit riêng của HAI widget khác trong danh sách —
    // EdgelessZoomToolbarViewExtension và EdgelessDraggingAreaViewExtension. Chọn đúng hai widget
    // này vì tên thẻ của chúng là chuỗi chữ (literal) trong effects.ts thượng nguồn, không mang
    // tiền tố affine- nên không đi qua bước đổi tên affine-→drt- ở build vendor — kiểm không phụ
    // thuộc pipeline đổi tên. Bớt (hoặc quên thêm lại) MỘT TRONG HAI widget này khỏi mảng
    // `viewExtensions` khiến `effect()` của nó không bao giờ chạy, nên thẻ tương ứng không được
    // đăng ký và dòng dưới đỏ ngay — khác với hai kỳ vọng đầu, vốn chỉ đỏ khi mảng bị xoá gần sạch.
    expect(customElements.get('edgeless-zoom-toolbar')).toBeDefined()
    expect(customElements.get('edgeless-dragging-area-rect')).toBeDefined()
  })

  it('nhóm 1 page mode: đăng ký đủ thẻ Lit', () => {
    // `layExtensionsTrang()` gọi `viewManager.get('page')` — chạy chuỗi setup → effect → effects()
    // cho MỌI provider trong `viewExtensions` (không riêng những cái đăng ký extension cho scope
    // 'page'; `effect()` không nhận tham số scope, xem ext-loader/src/view-provider.ts), tức
    // `customElements.define(...)` cho toàn bộ thẻ Lit. Đây là đường THẬT `TrangBaiViet.tsx` dùng
    // (extensions.ts), thay vì tự dựng một `ViewExtensionManager` thứ hai như ca trên.
    layExtensionsTrang()

    // Tên thẻ lấy từ cây vendored (task-10-brief.md Step 2), đổi tiền tố affine- → drt- ở bước
    // build vendor — TRỪ DocTitle: `fragments/doc-title/src/effects.ts` viết thẳng
    // `customElements.define('doc-title', DocTitle)`, không có tiền tố affine- nào từ đầu, nên luật
    // đổi tên `\baffine-` của scripts/doi-ten-vendor.mjs không đụng tới — tên thật ở runtime vẫn là
    // `doc-title`, y hệt thượng nguồn. Bốn thẻ còn lại ĐỀU có tiền tố affine- gốc nên đổi bình
    // thường.
    expect(customElements.get('doc-title'), 'DocTitle').toBeDefined()
    expect(customElements.get('drt-keyboard-toolbar-widget'), 'KeyboardToolbar').toBeDefined()
    expect(customElements.get('drt-page-dragging-area-widget'), 'PageDraggingArea').toBeDefined()
    expect(customElements.get('drt-scroll-anchoring-widget'), 'ScrollAnchoring').toBeDefined()
    expect(customElements.get('drt-divider'), 'Divider').toBeDefined()
  })
})
