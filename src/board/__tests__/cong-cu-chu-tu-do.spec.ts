// @vitest-environment happy-dom
//
// Canh công cụ "Chữ tự do" (Edgeless Text) — mục nằm trong menu của công cụ Sơ đồ tư duy trên thanh
// công cụ bảng vẽ (`affine/gfx/mindmap/src/toolbar/mindmap-menu.ts`, data-tip "Edgeless Text").
//
// LỖI GỐC (người dùng báo 2026-08-31: "bấm là vào hư vô không có gì cả"): cả `TextTool.click()`
// (affine/gfx/text/src/tool.ts) lẫn `textRender` của giỏ kéo-thả (gfx/mindmap/.../basket-elements.ts)
// đều kiểm cờ `enable_edgeless_text` — MẶC ĐỊNH `true` ở
// `affine/shared/src/services/feature-flag-service.ts` — rồi chạy `insertEdgelessTextCommand`, tức
// thêm một khối `affine:edgeless-text` vào surface. Nhưng `EdgelessTextViewExtension` KHÔNG có
// trong `viewExtensions`, nên:
//   - thẻ `drt-edgeless-text` chưa bao giờ được `customElements.define`, và
//   - `BlockViewExtension('affine:edgeless-text', …)` chưa bao giờ được đăng ký,
// nên khối được tạo thật trong store nhưng KHÔNG có gì vẽ nó ra. Người dùng thấy "hư vô" — và tệ
// hơn, tài liệu tích dần những khối vô hình không xoá được bằng mắt.
//
// Đo trên trình duyệt thật trước khi vá: `customElements.get('drt-edgeless-text')` trả về undefined
// trong khi `drt-code`/`drt-paragraph`/`drt-note` đều đã đăng ký.
import { ViewExtensionManager } from '@blocksuite/affine/ext-loader'
import { describe, expect, it } from 'vitest'

import { viewExtensions } from '../extensions'

describe('công cụ Chữ tự do có nơi hiển thị', () => {
  it('đăng ký thẻ drt-edgeless-text khi nạp scope edgeless', () => {
    new ViewExtensionManager(viewExtensions).get('edgeless')

    // Đối chứng: một thẻ khối khác chắc chắn đã đăng ký, để ca này không xanh/đỏ vì lý do khác.
    expect(customElements.get('drt-code')).toBeDefined()

    expect(customElements.get('drt-edgeless-text')).toBeDefined()
  })
})
