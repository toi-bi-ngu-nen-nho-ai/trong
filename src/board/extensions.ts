// Danh sách extension cắt gọn (D13).
//
// GIỮ 37 / 58 view extension của thượng nguồn (`getInternalViewExtensions()` trong
// src/vendor/blocksuite/affine/all/src/extensions/view.ts). MỌI THỨ KHÔNG CÓ TRONG MẢNG BÊN DƯỚI
// LÀ ĐÃ BỎ — 21 mục, cố tình không liệt kê ra đây vì một danh sách chép tay sẽ mục ngay lần nâng
// cấp cây vendored tiếp theo; muốn biết chính xác thì so mảng dưới với file thượng nguồn nói trên.
// Phần bỏ đi trải trên bốn nhóm của thượng nguồn: 1 gfx (link), 9 block (Bookmark, Callout,
// DataView — cố tình không bật, xem spec, Divider, EdgelessText, Embed, EmbedDoc, LatexViewExtension
// — khối, xem lý do dưới, Table), 7 widget và TOÀN BỘ 4 fragment (1+9+7+4 = 21 — nhóm inline giờ
// ĐỦ 7/7, không còn góp vào phần loại).
//
// Chặng 2026-08-21 "Database + Note đầy đủ" (xem
// docs/superpowers/specs/2026-08-21-database-note-day-du-design.md) bật thêm 10 extension:
// DatabaseViewExtension, SlashMenuViewExtension, DragHandleViewExtension, và toàn bộ 7 extension
// Inline (trước đó nhóm Inline bị loại 100%). Hệ quả: Note trên canvas giờ có đầy đủ định dạng
// inline (đậm/nghiêng/@nhắc/liên kết/chú thích/công thức/bình luận) — không chỉ riêng ô Database.
// SlashMenu (gõ "/") là đường DUY NHẤT để chèn khối Database vào một Note — không có nút riêng.
//
// Chặng 2026-08-31 bật thêm 1: EdgelessTextViewExtension — điều tra lỗi người dùng báo "Chữ tự do:
// bấm là vào hư vô". Công cụ Chữ tự do (menu Sơ đồ tư duy) chèn khối `affine:edgeless-text` qua
// `insertEdgelessTextCommand` vì cờ `enable_edgeless_text` mặc định BẬT — nhưng không có extension
// này thì không ai đăng ký `BlockViewExtension('affine:edgeless-text', …)` lẫn thẻ
// `drt-edgeless-text`, nên khối vào store mà không có gì vẽ ra. Xem
// src/board/__tests__/cong-cu-chu-tu-do.spec.ts. Ghi chú lịch sử: câu "9 block … EdgelessText" ở
// đoạn đầu file nói về diện BỎ lúc D13 — kể từ chặng này EdgelessText KHÔNG còn trong diện đó nữa.
//
// Chặng 2026-08-23 (xem docs/superpowers/specs/2026-08-22-dich-be-mat-hien-thi-dot-2-design.md
// mục "Ngoài phạm vi") bật thêm 4: AttachmentViewExtension, CodeBlockViewExtension,
// ImageViewExtension, SurfaceRefViewExtension — để 7/8 chuỗi dịch bị gỡ ở chặng "Dịch bề mặt hiển
// thị đợt 2" (mục 21 HANDOFF.md) có nơi hiển thị. ĐÃ ĐO kích thước bundle (xem ghi chú dưới).
//
// LatexViewExtension (khối, khác InlineLatexViewExtension ở nhóm Inline) THỬ bật HAI LẦN, cả hai
// đều PHẢI GỠ LẠI:
//
// Lần 1 (2026-08-23): `affine/blocks/latex/src/configs/tooltips.ts:34` gọi `unsafeHTML()` →
// `sanitizeHTML()` → `DOMPurify.sanitize()` NGAY Ở CẤP MODULE (khi `view.ts` được import, không
// đợi tới lúc dùng thật) — `dompurify` tự phát hiện `window` LÚC IMPORT để quyết định hình dạng
// export; environment 'node' (đa số file spec, xem vite.config.ts) không có `window` nên default
// export là hàm factory trần, không `.sanitize` → `TypeError: default.sanitize is not a function`
// ngay khi `diTruBangCu.spec.ts`/`edgeless-board.spec.ts` IMPORT module, dù bản thân hai ca kiểm đó
// không đụng gì tới Latex.
//
// ĐÃ TÌM ĐÚNG GỐC RỄ VÀ VÁ ĐƯỢC (không đụng vendor): thêm `test.alias` cho `dompurify` trong
// `vite.config.ts` trỏ sang `src/__test-stubs__/dompurify.ts` — RED→GREEN xác nhận cả hai file
// trên xanh sau khi vá. Nhưng chạy TRỌN bộ 34 file thì lộ vấn đề khác: KaTeX
// (`katex.renderToString()`, cũng chạy đồng bộ ở cấp module cùng chỗ) cộng dồn thời gian IMPORT
// cho MỌI file test board (không riêng Latex) — ba ca dùng SlashMenu chờ khối mới xuất hiện
// (`edgeless-board-database.spec.ts`, `-dark-mode.spec.ts`, `-reorder.spec.ts`) timeout 5000ms khi
// chạy TRỌN bộ, nhưng XANH khi chạy RIÊNG LẺ (3355ms, dư nhiều so với 5000ms) — đúng dạng "chập
// chờn do tải" mục 6 đã ghi, không phải lỗi logic. Nhưng đây là CHI PHÍ THẬT (thêm độ trễ import
// cho toàn bộ suite, siết hẹp biên độ timeout mặc định 5s ở MỌI file, không riêng Latex) đổi lấy
// ĐÚNG MỘT chuỗi ("Equation") — không đáng. Quyết định: GỠ Latex; gỡ luôn `test.alias`/stub
// `dompurify` vì không còn gì dùng tới (YAGNI, cùng tinh thần "không danh sách miễn ngầm" mục 11).
// Toàn bộ điều tra (bao gồm cách vá đúng nếu cần thử lại) chép ở HANDOFF.md mục 23 — chặng sau
// muốn thử lại (ví dụ nếu nâng `testTimeout` mặc định vì lý do khác, hoặc thượng nguồn sửa
// `tooltips.ts` để không render KaTeX đồng bộ lúc import) thì đọc đó, đừng điều tra lại từ đầu.
// "Equation" VẪN nằm trong diện hoãn.
//
// Phía STORE thì KHÔNG cắt: `getInternalStoreExtensions()` trong EdgelessBoard.tsx vẫn nạp nguyên
// bộ schema của mọi loại block, kể cả những loại không có view ở đây. Nghĩa là một tài liệu chứa
// block lạ vẫn nạp được vào store mà không vỡ, chỉ là không có gì vẽ nó ra. Cắt phía store là
// việc riêng, chưa làm.
//
// Đo được ở lần dựng ngày 2026-08-12 (npm run build, cùng một máy, chỉ đổi mảng dưới đây):
//   - đầy đủ 58 extension: chunk bảng 6.368,52 kB → 1.703,89 kB gzip, tổng 309 file .js trong dist/
//     (phần bỏ đi kéo theo Shiki với ~300 chunk ngôn ngữ, KaTeX, pdfmake, mammoth).
//   - cắt gọn 22 extension: chunk bảng 4.031,25 kB → 993,69 kB gzip, tổng 6 file .js.
// Tức còn ~58% dung lượng gzip và 6/309 số file. Vỏ app không đổi ở cả hai: 332,01 kB gzip.
//
// TemplateViewExtension thêm 2026-08-21 (23 extension) — số đo lại ở commit thêm nó, xem
// `git log -p -- src/board/extensions.ts` nếu cần con số chính xác thời điểm đó; ĐỪNG tin hai
// con số "22"/"cắt gọn" ở trên nữa cho mục đích đo dung lượng, chúng chỉ còn giá trị lịch sử.
//
// Thứ tự widget ảnh hưởng z-index — giữ đúng thứ tự thượng nguồn khai trong
// `affine/all/src/extensions/view.ts`.
import { AttachmentViewExtension } from '@blocksuite/affine-block-attachment/view'
import { CodeBlockViewExtension } from '@blocksuite/affine-block-code/view'
import { DatabaseViewExtension } from '@blocksuite/affine-block-database/view'
import { EdgelessTextViewExtension } from '@blocksuite/affine-block-edgeless-text/view'
import { FrameViewExtension } from '@blocksuite/affine-block-frame/view'
import { ImageViewExtension } from '@blocksuite/affine-block-image/view'
import { ListViewExtension } from '@blocksuite/affine-block-list/view'
import { NoteViewExtension } from '@blocksuite/affine-block-note/view'
import { ParagraphViewExtension } from '@blocksuite/affine-block-paragraph/view'
import { RootViewExtension } from '@blocksuite/affine-block-root/view'
import { SurfaceViewExtension } from '@blocksuite/affine-block-surface/view'
import { SurfaceRefViewExtension } from '@blocksuite/affine-block-surface-ref/view'
import { FoundationViewExtension } from '@blocksuite/affine-foundation/view'
import { BrushViewExtension } from '@blocksuite/affine-gfx-brush/view'
import { ConnectorViewExtension } from '@blocksuite/affine-gfx-connector/view'
import { GroupViewExtension } from '@blocksuite/affine-gfx-group/view'
import { MindmapViewExtension } from '@blocksuite/affine-gfx-mindmap/view'
import { NoteViewExtension as GfxNoteViewExtension } from '@blocksuite/affine-gfx-note/view'
import { PointerViewExtension } from '@blocksuite/affine-gfx-pointer/view'
import { ShapeViewExtension } from '@blocksuite/affine-gfx-shape/view'
import { TemplateViewExtension } from '@blocksuite/affine-gfx-template/view'
import { TextViewExtension } from '@blocksuite/affine-gfx-text/view'
import { InlineCommentViewExtension } from '@blocksuite/affine-inline-comment/view'
import { FootnoteViewExtension } from '@blocksuite/affine-inline-footnote/view'
import { LatexViewExtension as InlineLatexViewExtension } from '@blocksuite/affine-inline-latex/view'
import { LinkViewExtension } from '@blocksuite/affine-inline-link/view'
import { MentionViewExtension } from '@blocksuite/affine-inline-mention/view'
import { InlinePresetViewExtension } from '@blocksuite/affine-inline-preset/view'
import { ReferenceViewExtension } from '@blocksuite/affine-inline-reference/view'
import { DragHandleViewExtension } from '@blocksuite/affine-widget-drag-handle/view'
import { EdgelessDraggingAreaViewExtension } from '@blocksuite/affine-widget-edgeless-dragging-area/view'
import { EdgelessSelectedRectViewExtension } from '@blocksuite/affine-widget-edgeless-selected-rect/view'
import { EdgelessToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-toolbar/view'
import { EdgelessZoomToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-zoom-toolbar/view'
import { FrameTitleViewExtension } from '@blocksuite/affine-widget-frame-title/view'
import { SlashMenuViewExtension } from '@blocksuite/affine-widget-slash-menu/view'
import { ToolbarViewExtension } from '@blocksuite/affine-widget-toolbar/view'
import { ViewportOverlayViewExtension } from '@blocksuite/affine-widget-viewport-overlay/view'

export const viewExtensions = [
  FoundationViewExtension,

  PointerViewExtension,
  GfxNoteViewExtension,
  BrushViewExtension,
  ShapeViewExtension,
  MindmapViewExtension,
  ConnectorViewExtension,
  GroupViewExtension,
  TextViewExtension,
  TemplateViewExtension,

  AttachmentViewExtension,
  CodeBlockViewExtension,
  DatabaseViewExtension,
  EdgelessTextViewExtension,
  FrameViewExtension,
  ImageViewExtension,
  ListViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,
  SurfaceRefViewExtension,
  SurfaceViewExtension,
  RootViewExtension,

  InlineCommentViewExtension,
  FootnoteViewExtension,
  LinkViewExtension,
  ReferenceViewExtension,
  InlineLatexViewExtension,
  MentionViewExtension,
  InlinePresetViewExtension,

  DragHandleViewExtension,
  FrameTitleViewExtension,
  SlashMenuViewExtension,
  ToolbarViewExtension,
  ViewportOverlayViewExtension,
  EdgelessZoomToolbarViewExtension,
  EdgelessSelectedRectViewExtension,
  EdgelessDraggingAreaViewExtension,
  EdgelessToolbarViewExtension,
]
