// Canh rằng CHẾ ĐỘ TÀI LIỆU thật sự quyết định `getEditorMode()` trả ra chuỗi nào.
//
// Vì sao cần ca này dù `trang-mount.spec.ts` đã xanh: ca kia chỉ chứng minh "page mode dựng ra
// drt-page-root". Nó KHÔNG chứng minh `cheDoTrang` là thứ gây ra điều đó — nếu ai đó gỡ `cheDoTrang`
// khỏi `layExtensionsTrang()`, hoặc Task 3 gộp hai lớp lại mà gộp sai, ca kia vẫn có thể xanh (vì
// `viewManager.get('page')` tự nó đã đăng ký BlockViewExtension('affine:page', 'affine-page-root')).
//
// Ca dưới đây kiểm đúng mắt xích mà `ToolbarContext.editorMode` tiêu thụ — xem chuỗi nhân quả đầy
// đủ ở đầu che-do-co-dinh.ts.
import { describe, expect, it } from 'vitest'

import { cheDoEdgeless, cheDoTrang } from '../che-do-co-dinh'

/**
 * Lấy lại instance `DocModeService` mà `DocModeExtension(service)` bọc bên trong, bằng cách chạy
 * `setup()` với một container giả chỉ ghi lại thứ được đăng ký. Rẻ hơn nhiều so với dựng cả
 * `BlockStdScope`, và kiểm đúng thứ cần kiểm.
 *
 * Tên phương thức của container giả phải khớp thứ `DocModeExtension.setup` thật sự gọi — đọc
 * `affine/shared/src/services/doc-mode-service.ts` (Step 1) trước khi sửa hàm này.
 */
function layService(ext: unknown): { getEditorMode: () => string } {
  const daDangKy: unknown[] = []
  const ghiLai = (_id: unknown, thu: unknown) => {
    daDangKy.push(typeof thu === 'function' ? (thu as () => unknown)() : thu)
  }
  const diGia = { override: ghiLai, addImpl: ghiLai, add: ghiLai }
  ;(ext as { setup: (di: unknown) => void }).setup(diGia)

  const service = daDangKy[0] as { getEditorMode: () => string } | undefined
  if (!service || typeof service.getEditorMode !== 'function') {
    throw new Error(
      'Không lấy được DocModeService từ extension — hình dạng setup() đã đổi. Đọc ' +
        'affine/shared/src/services/doc-mode-service.ts rồi sửa layService, GIỮ NGUYÊN ba expect.',
    )
  }
  return service
}

describe('chế độ tài liệu cố định', () => {
  it('cheDoTrang trả về page', () => {
    expect(layService(cheDoTrang).getEditorMode()).toBe('page')
  })

  it('cheDoEdgeless trả về edgeless', () => {
    expect(layService(cheDoEdgeless).getEditorMode()).toBe('edgeless')
  })

  it('hai chế độ KHÁC nhau', () => {
    // Ca này đỏ nếu ai đó gộp hai lớp lại mà quên truyền tham số — đúng rủi ro của Task 3.
    expect(layService(cheDoTrang).getEditorMode()).not.toBe(
      layService(cheDoEdgeless).getEditorMode(),
    )
  })
})
