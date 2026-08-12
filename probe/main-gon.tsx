// BẢN THỬ THỨ HAI — đo bundle khi CẮT GỌN danh sách extension.
//
// Bản thử đầu (`main.tsx`) nạp `getInternalViewExtensions()` — toàn bộ editor AFFiNE, kể cả
// database, bảng, code (kéo theo Shiki với ~40 ngôn ngữ), LaTeX (KaTeX), PDF, attachment,
// bookmark, embed. Đo được 1.856 kB gzip.
//
// Bảng của Bs Trọng không cần những thứ đó. File này giữ đúng phần một bảng edgeless dùng:
// nền tảng, các phần tử vẽ (mindmap/shape/connector/brush/text/note/group), khung Frame,
// Note với đoạn văn và danh sách, cộng nhóm widget làm nên cảm giác thao tác (khung chọn,
// vùng quét chọn, hai thanh công cụ, tiêu đề frame, lớp phủ viewport).
//
// Mục đích duy nhất: lấy con số gzip để so với 1.856 kB và với ngưỡng dự án.

import '@blocksuite/affine/effects'

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
import { ViewExtensionManager, StoreExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { BlockStdScope } from '@blocksuite/affine/std'
import { createAutoIncrementIdGenerator, TestWorkspace } from '@blocksuite/affine/store/test'
import { render as litRender } from 'lit'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

// Danh sách cắt gọn. Thứ tự widget ảnh hưởng z-index — giữ đúng thứ tự thượng nguồn khai.
const viewExtensions = [
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

const viewManager = new ViewExtensionManager(viewExtensions)
const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

function createBoardStore() {
  const workspace = new TestWorkspace({
    id: 'probe-workspace',
    idGenerator: createAutoIncrementIdGenerator(),
  })
  workspace.meta.initialize()

  const doc = workspace.createDoc('board')
  const store = doc.getStore({ extensions: storeManager.get('store') })
  doc.load()

  const rootId = store.addBlock('affine:page', {})
  store.addBlock('affine:surface', {}, rootId)

  return store
}

function EdgelessBoard() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [loi, setLoi] = useState<string | null>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    try {
      const std = new BlockStdScope({
        store: createBoardStore(),
        extensions: viewManager.get('edgeless'),
      })
      litRender(std.render(), el)
    } catch (e) {
      setLoi(e instanceof Error ? `${e.message}\n\n${e.stack ?? ''}` : String(e))
    }

    return () => {
      litRender(null, el)
    }
  }, [])

  if (loi) {
    return <pre style={{ padding: 16, whiteSpace: 'pre-wrap', fontSize: 12 }}>{loi}</pre>
  }

  return <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
}

createRoot(document.getElementById('root')!).render(
  <div style={{ position: 'fixed', inset: 0 }}>
    <EdgelessBoard />
  </div>
)
