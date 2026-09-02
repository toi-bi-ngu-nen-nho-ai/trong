// ─── Khai báo "bảng này là edgeless" cho cây BlockSuite ─────────────────────────────────────────
//
// LỖI GỐC (đo thật 2026-09-02, đối chiếu video demo AFFiNE): chọn BẤT KỲ đối tượng nào trên bảng
// vẽ — hình, đường nối, sơ đồ tư duy, ảnh, nhãn dán — đều KHÔNG hiện thanh công cụ nổi. Tức là
// người dùng không có đường nào để đổi màu, đổi kiểu hình, thêm chữ, đổi kiểu/hướng đường nối, đổi
// phong cách/bố cục sơ đồ tư duy, đổi thứ tự lớp, nhân bản, khoá hay xoá bằng menu. Gần như toàn bộ
// khả năng chỉnh sửa từng phần tử biến mất, trong khi mã dựng ra chúng vẫn nằm đủ trong bundle.
//
// Chuỗi nhân quả:
//   1. `FoundationViewExtension` đăng ký `DocModeService` — bản MẶC ĐỊNH của thượng nguồn, dành cho
//      môi trường chưa có app chủ. `getEditorMode()` của nó trả thẳng `null`
//      (affine/shared/src/services/doc-mode-service.ts). App thật của AFFiNE ghi đè service này ở
//      lớp `packages/frontend/core`; ta chưa từng ghi đè, nên `null` là thứ cây vendored nhận được.
//   2. `ToolbarContext.editorMode` = `getEditorMode() ?? 'page'` → `'page'`, nên `isPageMode` TRUE
//      và `isEdgelessMode` FALSE, dù ta đang đứng giữa một bảng edgeless.
//   3. `affine/widgets/toolbar/src/toolbar.ts` — nhánh "Selects elements in edgeless" mở đầu bằng
//      `if (context.isPageMode) { … context.reset(); return }`. Mọi lượt chọn phần tử trên canvas
//      thoát ngay tại dòng đó; cờ toolbar đứng mãi ở 0 và `editor-toolbar` giữ `display: none`.
//
// Đo trên trình duyệt thật trước khi vá: 20 module toolbar (`affine:surface:shape`, `:mindmap`,
// `:connector`, `:image`, `:frame`, `:group`, `:text`, `affine:surface:*`, `:locked` …) ĐỀU đã đăng
// ký đúng — không thiếu một cấu hình nào. Gán tay `getEditorMode = () => 'edgeless'` trong console
// là thanh công cụ hiện đầy đủ ngay lập tức, đúng bố cục video. Nghĩa là chỉ MỘT mắt xích sai, và
// nó nằm hoàn toàn ở phía app.
//
// HAI CHỖ HỎNG NỮA cùng gốc, không liên quan thanh công cụ (nên được vá kèm, không cần thêm gì):
//   - `topContenteditableElement` của paragraph/list/code/database so `getEditorMode() === 'edgeless'`
//     để trả về thẻ ghi chú BỌC NGOÀI thay vì root. Sai chế độ ⇒ trả root ⇒ phạm vi soạn thảo và
//     định vị thanh định dạng trong thẻ ghi chú trên canvas tính nhầm gốc.
//   - `image-resize-manager.ts` chỉ đọc `viewport.zoom` khi ở edgeless; sai chế độ ⇒ `_zoom = 1`,
//     tức kéo đổi cỡ ảnh trong thẻ ghi chú lệch đúng bằng hệ số thu phóng (ở 72% là lệch ~39%).
//
// VÌ SAO GHI ĐÈ CHỨ KHÔNG CẮT `DocModeService` khỏi FoundationViewExtension: `DocModeProvider` còn
// ba phương thức khác (`getPrimaryMode`/`setPrimaryMode`/`onPrimaryModeChange`) mà thượng nguồn
// hiện thực bằng map ở cấp module; cắt đi là mất luôn chúng. Kế thừa rồi ghi đè ĐÚNG MỘT phương
// thức giữ nguyên phần còn lại, và `DocModeExtension()` (cũng của thượng nguồn) đã sẵn có đường
// `di.override` cho đúng việc này.
//
// PHẠM VI CỐ Ý HẸP: chỉ `getEditorMode`. `getPrimaryMode` vẫn để nguyên mặc định `'page'` — nó nói
// về chế độ CHÍNH của một tài liệu khi bị tài liệu khác tham chiếu tới (biểu tượng của thẻ tham
// chiếu inline), không phải chế độ trình soạn đang mở, và không có gì trong lỗi đo được đụng tới
// nó. Đổi thêm là mở rộng diện rủi ro cho một thứ chưa đo.
import type { DocMode } from '@blocksuite/affine-model'
import { DocModeExtension, DocModeService } from '@blocksuite/affine-shared/services'

class CheDoLuonEdgeless extends DocModeService {
  override getEditorMode(): DocMode {
    return 'edgeless'
  }
}

/**
 * Extension ghi đè `DocModeProvider`. PHẢI đứng SAU `viewManager.get('edgeless')` trong mảng truyền
 * cho `BlockStdScope` — `di.override` chỉ thay được một hiện thực đã đăng ký, mà `DocModeService`
 * gốc do `FoundationViewExtension` (phần tử ĐẦU của `viewExtensions`) đăng ký.
 */
export const cheDoEdgeless = DocModeExtension(new CheDoLuonEdgeless())
