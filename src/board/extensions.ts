// Danh sách extension cắt gọn (D13). Đo được: đầy đủ 1.856 kB gzip / 293 file JS;
// cắt gọn 1.131 kB gzip / 5 file. Phần bỏ đi kéo theo Shiki (~40 chunk ngôn ngữ), KaTeX,
// pdfmake, mammoth — thứ một bảng vẽ không dùng tới.
//
// Bỏ: database, table, data-view, code, latex, attachment, bookmark, embed, embed-doc,
//     image, callout, divider, surface-ref, edgeless-text.
// Giữ: nền tảng, các phần tử vẽ, Note với đoạn văn và danh sách, cùng nhóm widget làm nên
//     cảm giác thao tác.
//
// Thứ tự widget ảnh hưởng z-index — giữ đúng thứ tự thượng nguồn khai trong
// `affine/all/src/extensions/view.ts`.
import { FrameViewExtension } from '@blocksuite/affine-block-frame/view'
import { ListViewExtension } from '@blocksuite/affine-block-list/view'
import { NoteViewExtension } from '@blocksuite/affine-block-note/view'
import { ParagraphViewExtension } from '@blocksuite/affine-block-paragraph/view'
import { RootViewExtension } from '@blocksuite/affine-block-root/view'
import { SurfaceViewExtension } from '@blocksuite/affine-block-surface/view'
import { FoundationViewExtension } from '@blocksuite/affine-foundation/view'
import { BrushViewExtension } from '@blocksuite/affine-gfx-brush/view'
import { ConnectorViewExtension } from '@blocksuite/affine-gfx-connector/view'
import { GroupViewExtension } from '@blocksuite/affine-gfx-group/view'
import { MindmapViewExtension } from '@blocksuite/affine-gfx-mindmap/view'
import { NoteViewExtension as GfxNoteViewExtension } from '@blocksuite/affine-gfx-note/view'
import { PointerViewExtension } from '@blocksuite/affine-gfx-pointer/view'
import { ShapeViewExtension } from '@blocksuite/affine-gfx-shape/view'
import { TextViewExtension } from '@blocksuite/affine-gfx-text/view'
import { EdgelessDraggingAreaViewExtension } from '@blocksuite/affine-widget-edgeless-dragging-area/view'
import { EdgelessSelectedRectViewExtension } from '@blocksuite/affine-widget-edgeless-selected-rect/view'
import { EdgelessToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-toolbar/view'
import { EdgelessZoomToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-zoom-toolbar/view'
import { FrameTitleViewExtension } from '@blocksuite/affine-widget-frame-title/view'
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

  FrameViewExtension,
  ListViewExtension,
  NoteViewExtension,
  ParagraphViewExtension,
  SurfaceViewExtension,
  RootViewExtension,

  FrameTitleViewExtension,
  ToolbarViewExtension,
  ViewportOverlayViewExtension,
  EdgelessZoomToolbarViewExtension,
  EdgelessSelectedRectViewExtension,
  EdgelessDraggingAreaViewExtension,
  EdgelessToolbarViewExtension,
]
