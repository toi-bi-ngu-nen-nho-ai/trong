// @vitest-environment happy-dom
//
// Canh việc ĐĂNG KÝ CUSTOM ELEMENT — tác dụng phụ duy nhất biến các lớp Lit thành thẻ DOM dùng
// được. Mất nó, màn hình chỉ còn một canvas trắng: không log, không ném lỗi, chỉ người ngồi nhìn
// mới thấy. `.vendor-build/affine/all/package.json` khai `"sideEffects": false` (khai báo làm nên
// gần một nửa mức giảm của chunk bảng nhờ tree-shaking), nên bundler ĐƯỢC PHÉP cắt mọi import chỉ
// lấy tác dụng phụ — đây là ca sẽ đỏ khi một bản nâng cấp bundler bắt đầu cắt thật.
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

import { viewExtensions } from '../extensions'

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
  })
})
