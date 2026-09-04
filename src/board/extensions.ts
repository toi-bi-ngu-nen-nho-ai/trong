// Danh sách extension cắt gọn (D13).
//
// GIỮ 55 / 58 view extension của thượng nguồn (`getInternalViewExtensions()` trong
// src/vendor/blocksuite/affine/all/src/extensions/view.ts). MỌI THỨ KHÔNG CÓ TRONG MẢNG BÊN DƯỚI
// LÀ ĐÃ BỎ — kể từ Task 13 (bật xong bốn nhóm page mode) chỉ còn ĐÚNG 3 mục, đủ ngắn để liệt kê
// thẳng ở đây (vẫn nên so mảng dưới với file thượng nguồn nói trên nếu cần chắc chắn tuyệt đối, vì
// một con số chép tay có thể mục theo lần nâng cấp cây vendored tiếp theo):
//   - LatexViewExtension (block, khối công thức toán trên canvas — khác InlineLatexViewExtension ở
//     nhóm Inline, nhóm đó ĐÃ bật đủ) — HOÃN, không phải bỏ hẳn. Thử bật hai lần đều phải gỡ lại vì
//     kéo theo DOMPurify/KaTeX chạy đồng bộ ở cấp module, gây timeout chập chờn cho các ca dùng
//     SlashMenu khi chạy TRỌN bộ test. Xem điều tra đầy đủ (và đường thử lại nếu cần) ở đoạn "THỬ
//     bật HAI LẦN" trong docs/superpowers/NHAT-KY-EXTENSIONS.md, và §6.1 của
//     docs/superpowers/specs/2026-09-04-kho-bai-viet-page-mode-design.md.
//   - RemoteSelectionViewExtension (widget, vẽ con trỏ + vùng chọn của người dùng KHÁC trên cùng
//     tài liệu) — BỎ HẲN: ứng dụng hiện chỉ phục vụ một người dùng offline trên một máy, không có
//     kênh đồng bộ nhiều người để cần hiển thị con trỏ ai khác.
//   - AdapterPanelViewExtension (fragment, panel DEBUG hiển thị kết quả các adapter chuyển đổi định
//     dạng tài liệu — Markdown/HTML/Notion...) — BỎ HẲN: công cụ dành cho người phát triển BlockSuite
//     tự kiểm adapter, không phải tính năng người dùng cuối của app này.
// Theo nhóm thượng nguồn: Foundation 1/1, Gfx 10/10, Block 19/20 (thiếu Latex), Inline 7/7, Widget
// 15/16 (thiếu RemoteSelection), Fragment 3/4 (thiếu AdapterPanel) — cộng lại 55/58. Đếm bằng tay
// trên mảng bên dưới mỗi lần sửa số này — đừng suy diễn từ lượt trước (chặng Task 11 từng đếm sai
// một lần).
//
// LỊCH SỬ BẬT/TẮT THEO TỪNG CHẶNG đã chuyển sang docs/superpowers/NHAT-KY-EXTENSIONS.md
// (2026-09-05). Ở đó có: vì sao mỗi chặng bật thêm cái gì, số đo dung lượng chunk sau mỗi nhóm,
// và các đường đã thử rồi phải gỡ — đáng đọc TRƯỚC khi bật/tắt thêm bất cứ extension nào, nhất là
// đoạn "THỬ bật HAI LẦN" về LatexViewExtension.
//
// Thứ tự widget ảnh hưởng z-index — giữ đúng thứ tự thượng nguồn khai trong
// `affine/all/src/extensions/view.ts`.
import { AttachmentViewExtension } from '@blocksuite/affine-block-attachment/view'
import { BookmarkViewExtension } from '@blocksuite/affine-block-bookmark/view'
import { CalloutViewExtension } from '@blocksuite/affine-block-callout/view'
import { CodeBlockViewExtension } from '@blocksuite/affine-block-code/view'
import { DataViewViewExtension } from '@blocksuite/affine-block-data-view/view'
import { DatabaseViewExtension } from '@blocksuite/affine-block-database/view'
import { DividerViewExtension } from '@blocksuite/affine-block-divider/view'
import { EdgelessTextViewExtension } from '@blocksuite/affine-block-edgeless-text/view'
import { EmbedViewExtension } from '@blocksuite/affine-block-embed/view'
import { EmbedDocViewExtension } from '@blocksuite/affine-block-embed-doc/view'
import { FrameViewExtension } from '@blocksuite/affine-block-frame/view'
import { ImageViewExtension } from '@blocksuite/affine-block-image/view'
import { ListViewExtension } from '@blocksuite/affine-block-list/view'
import { NoteViewExtension } from '@blocksuite/affine-block-note/view'
import { ParagraphViewExtension } from '@blocksuite/affine-block-paragraph/view'
import { RootViewExtension } from '@blocksuite/affine-block-root/view'
import { SurfaceViewExtension } from '@blocksuite/affine-block-surface/view'
import { SurfaceRefViewExtension } from '@blocksuite/affine-block-surface-ref/view'
import { TableViewExtension } from '@blocksuite/affine-block-table/view'
import { FoundationViewExtension } from '@blocksuite/affine-foundation/view'
import { DocTitleViewExtension } from '@blocksuite/affine-fragment-doc-title/view'
import { FramePanelViewExtension } from '@blocksuite/affine-fragment-frame-panel/view'
import { OutlineViewExtension } from '@blocksuite/affine-fragment-outline/view'
import { BrushViewExtension } from '@blocksuite/affine-gfx-brush/view'
import { ConnectorViewExtension } from '@blocksuite/affine-gfx-connector/view'
import { GroupViewExtension } from '@blocksuite/affine-gfx-group/view'
import { LinkViewExtension as GfxLinkViewExtension } from '@blocksuite/affine-gfx-link/view'
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
import { EdgelessAutoConnectViewExtension } from '@blocksuite/affine-widget-edgeless-auto-connect/view'
import { EdgelessDraggingAreaViewExtension } from '@blocksuite/affine-widget-edgeless-dragging-area/view'
import { EdgelessSelectedRectViewExtension } from '@blocksuite/affine-widget-edgeless-selected-rect/view'
import { EdgelessToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-toolbar/view'
import { EdgelessZoomToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-zoom-toolbar/view'
import { FrameTitleViewExtension } from '@blocksuite/affine-widget-frame-title/view'
import { KeyboardToolbarViewExtension } from '@blocksuite/affine-widget-keyboard-toolbar/view'
import { LinkedDocViewExtension } from '@blocksuite/affine-widget-linked-doc/view'
import { NoteSlicerViewExtension } from '@blocksuite/affine-widget-note-slicer/view'
import { PageDraggingAreaViewExtension } from '@blocksuite/affine-widget-page-dragging-area/view'
import { ScrollAnchoringViewExtension } from '@blocksuite/affine-widget-scroll-anchoring/view'
import { SlashMenuViewExtension } from '@blocksuite/affine-widget-slash-menu/view'
import { ToolbarViewExtension } from '@blocksuite/affine-widget-toolbar/view'
import { ViewportOverlayViewExtension } from '@blocksuite/affine-widget-viewport-overlay/view'
import { ViewExtensionManager } from '@blocksuite/affine/ext-loader'

import { banPhimAoTrang } from './ban-phim-ao'
import { cheDoEdgeless, cheDoTrang } from './che-do-co-dinh'
import { phongChuBangExtension } from './phong-chu-bang'

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
  GfxLinkViewExtension,

  AttachmentViewExtension,
  BookmarkViewExtension,
  CalloutViewExtension,
  CodeBlockViewExtension,
  DataViewViewExtension,
  DatabaseViewExtension,
  DividerViewExtension,
  EdgelessTextViewExtension,
  EmbedViewExtension,
  EmbedDocViewExtension,
  FrameViewExtension,
  ImageViewExtension,
  ListViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,
  SurfaceRefViewExtension,
  TableViewExtension,
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
  EdgelessAutoConnectViewExtension,
  FrameTitleViewExtension,
  KeyboardToolbarViewExtension,
  LinkedDocViewExtension,
  ScrollAnchoringViewExtension,
  SlashMenuViewExtension,
  ToolbarViewExtension,
  ViewportOverlayViewExtension,
  EdgelessZoomToolbarViewExtension,
  PageDraggingAreaViewExtension,
  EdgelessSelectedRectViewExtension,
  EdgelessDraggingAreaViewExtension,
  NoteSlicerViewExtension,
  EdgelessToolbarViewExtension,

  DocTitleViewExtension,
  FramePanelViewExtension,
  OutlineViewExtension,
]

const viewManager = new ViewExtensionManager(viewExtensions)

/**
 * Bộ extension cho chế độ edgeless, lấy từ ĐÚNG `viewManager` singleton của module này.
 *
 * Có hàm này vì `xuatAnhBang.ts` cũng cần mount một cây Lit (bảng ngầm để xuất PNG) và KHÔNG được
 * phép tự dựng một `ViewExtensionManager` thứ hai: `.get('edgeless')` chạy chuỗi
 * `ViewExtensionProvider.setup() → effect() → effects()`, tức là `customElements.define(...)` cho
 * toàn bộ thẻ Lit — gọi lần hai trên cùng tên thẻ là `NotSupportedError` ném thẳng ra, hỏng cả
 * bảng vẽ lẫn lượt xuất. Xuất một hàm rẻ hơn xuất chính `viewManager` (bên ngoài không cần biết
 * manager tồn tại, chỉ cần đúng mảng extension).
 *
 * `cheDoEdgeless` nối vào CUỐI, sau mọi view extension: nó `di.override` `DocModeProvider` mà
 * `FoundationViewExtension` (phần tử đầu mảng) vừa đăng ký. Không có nó thì `getEditorMode()` trả
 * `null` và TOÀN BỘ thanh công cụ phần tử tắt câm — xem ./che-do-co-dinh.ts để biết chuỗi nhân quả
 * đầy đủ. Đặt trong hàm dùng chung này để mọi đường mount cây Lit đều nhận đúng một bộ.
 *
 * `phongChuBangExtension` cùng lớp lý do: `FoundationViewExtension` chỉ đăng ký cấu hình phông KHI
 * được truyền `options.fontConfig`, mà ta gọi `.get('edgeless')` không kèm options — nên không có
 * FontFace nào mang tên họ `blocksuite:surface:*` và MỌI ô chọn phông/kiểu chữ mở ra đều rỗng. Xem
 * ./phong-chu-bang.ts.
 */
export function layExtensionsEdgeless() {
  return [...viewManager.get('edgeless'), cheDoEdgeless, phongChuBangExtension]
}

/**
 * Bộ extension cho CHẾ ĐỘ TRANG, lấy từ ĐÚNG `viewManager` singleton của module này.
 *
 * Phải dùng chung manager với `layExtensionsEdgeless()`, không được dựng manager thứ hai: `.get()`
 * chạy chuỗi `ViewExtensionProvider.setup() → effect() → effects()`, tức `customElements.define(...)`
 * cho toàn bộ thẻ Lit — lý do đầy đủ đã ghi ở JSDoc của `layExtensionsEdgeless` ngay trên.
 *
 * `cheDoTrang` nối vào CUỐI vì `di.override` chỉ thay được một hiện thực ĐÃ đăng ký, mà
 * `DocModeService` gốc do `FoundationViewExtension` (phần tử đầu mảng) đăng ký.
 *
 * `phongChuBangExtension` giữ nguyên như edgeless: `FoundationViewExtension` chỉ đăng ký cấu hình
 * phông KHI được truyền `options.fontConfig`, mà ta gọi `.get()` không kèm options.
 *
 * `banPhimAoTrang` CHỈ có ở đây, không có ở `layExtensionsEdgeless()`: `KeyboardToolbarViewExtension`
 * gắn widget bàn phím khi `scope === 'page'` VÀ `IS_MOBILE`, rồi widget ấy gọi
 * `std.get(VirtualKeyboardProvider)` — `get`, không `getOptional` — nên NÉM ở `connectedCallback()`
 * nếu app chủ chưa cấp. Lỗi chỉ hiện trên thiết bị di động. Xem ./ban-phim-ao.ts cho chuỗi nhân quả
 * đầy đủ và lý do provider tĩnh là đúng.
 */
export function layExtensionsTrang() {
  return [...viewManager.get('page'), cheDoTrang, phongChuBangExtension, banPhimAoTrang]
}
