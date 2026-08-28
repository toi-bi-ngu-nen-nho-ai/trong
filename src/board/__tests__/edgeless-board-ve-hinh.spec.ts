// @vitest-environment happy-dom
//
// Đóng khoản "chưa nghiệm thu" số 2 ở HANDOFF mục 7: `ShapeViewExtension`/`BrushViewExtension`/
// `ConnectorViewExtension` đều đã đăng ký nhưng **chưa từng có bằng chứng nào cho thấy chúng vẽ ra
// một phần tử thật** — mọi lần kiểm trước đều dừng ở "công cụ nhận được sự kiện".
//
// Ca kiểm ở đây đi ĐÚNG đường sản phẩm: đặt công cụ đang chọn qua `gfx.tool` (chính là thứ nút
// toolbar làm), rồi bắn chuỗi `pointerdown` → `pointermove` → `pointerup` lên canvas thật, và
// khẳng định bằng **số phần tử trong `surface`** — tức sản phẩm cuối, không phải trạng thái trung
// gian của công cụ. Kỹ thuật đặt công cụ + bắn pointer chép từ `taoNoteQuaCongCuThat()`
// (helpers/note-interaction.ts) đã kiểm chứng qua nhiều chặng.
//
// GIỚI HẠN CÒN LẠI, ghi rõ để không ai đọc nhầm ca này thành "đã test trên thiết bị thật": đây vẫn
// là PointerEvent tổng hợp trong happy-dom, không phải ngón tay trên kính hay chuột thật của hệ
// điều hành. Cái nó đóng là câu hỏi "công cụ vẽ có tạo ra phần tử không" (trước đây chưa ai trả lời
// được bằng máy); cái nó KHÔNG đóng là cảm giác nét vẽ/độ trễ/áp lực bút trên phần cứng thật.
import { act } from 'react'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EdgelessBoard } from '../EdgelessBoard'
import type { GfxLike } from './helpers/note-interaction'
// Import vì tác dụng phụ: dựng proxy canvas + các polyfill happy-dom mà cây Lit cần lúc mount.
import './helpers/note-interaction'

// happy-dom chưa cài `document.elementsFromPoint()` — `std/src/event/dispatcher` gọi thẳng nó để
// biết con trỏ đang nằm trên phần tử nào, nên MỌI sự kiện pointer ném TypeError trước khi tới công
// cụ vẽ. Cùng lớp thiếu-API với `getTargetRanges`/`animate` đã vá ở helpers/note-interaction.ts.
// Trả về canvas của bảng: trong ca này con trỏ luôn ở trên nền canvas, đúng cái trình duyệt thật
// trả về khi bấm vào vùng trống của bảng vẽ.
if (!('elementsFromPoint' in document)) {
  ;(document as unknown as { elementsFromPoint(x: number, y: number): Element[] }).elementsFromPoint = () => {
    const canvas = document.querySelector('canvas')
    return canvas ? [canvas] : []
  }
}

type SurfaceLike = { elementModels: ReadonlyArray<{ type: string }> }
type RootLike = { gfx: GfxLike & { surface: SurfaceLike } }

function bienCo(ten: string, x: number, y: number): PointerEvent {
  return new PointerEvent(ten, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
    isPrimary: true,
  })
}

/** Kéo một nét từ (x1,y1) tới (x2,y2) trên canvas — ba chặng đúng như thao tác tay. */
function keoTren(canvas: HTMLElement, x1: number, y1: number, x2: number, y2: number) {
  canvas.dispatchEvent(bienCo('pointerdown', x1, y1))
  // Nhiều chặng move: `brush-tool.dragMove()` gom từng điểm vào nét, một điểm duy nhất không đủ
  // để thành đường; shape-tool thì chỉ cần biết ô chữ nhật đã đủ lớn.
  canvas.dispatchEvent(bienCo('pointermove', (x1 + x2) / 2, (y1 + y2) / 2))
  canvas.dispatchEvent(bienCo('pointermove', x2, y2))
  canvas.dispatchEvent(bienCo('pointerup', x2, y2))
}

async function moBang(root: Root, boardId: string) {
  await act(async () => {
    root.render(createElement(EdgelessBoard, { boardId }))
  })
  await act(async () => {
    await vi.waitFor(() => {
      expect(document.querySelector('editor-host')).not.toBeNull()
    })
  })
  return document.querySelector('drt-edgeless-root') as unknown as RootLike
}

describe('EdgelessBoard — công cụ vẽ tạo ra phần tử thật trên surface', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('công cụ Hình: kéo một ô trên canvas → surface có thêm đúng một phần tử "shape"', async () => {
    const edgeless = await moBang(root, 'bang-ve-hinh')
    const surface = edgeless.gfx.surface
    const truoc = surface.elementModels.length

    await act(async () => {
      edgeless.gfx.tool.currentToolName$.value = 'shape'
      const cur = edgeless.gfx.tool.currentTool$.peek()!
      // `shape-tool.activate()` đọc `shapeName` từ `activatedOption` — thiếu nó thì công cụ bật
      // nhưng không biết vẽ hình gì. Đây chính là option mà nút "Hình" trên toolbar truyền vào.
      const opt = { shapeName: 'rect' }
      cur.activatedOption = opt
      cur.activate(opt)

      keoTren(container.querySelector('canvas')!, 120, 120, 260, 220)
    })

    await vi.waitFor(() => {
      expect(surface.elementModels.length).toBe(truoc + 1)
    })
    expect(surface.elementModels.at(-1)?.type).toBe('shape')
  })

  it('công cụ Bút: kéo một nét → surface có thêm đúng một phần tử "brush"', async () => {
    const edgeless = await moBang(root, 'bang-ve-but')
    const surface = edgeless.gfx.surface
    const truoc = surface.elementModels.length

    await act(async () => {
      edgeless.gfx.tool.currentToolName$.value = 'brush'
      const cur = edgeless.gfx.tool.currentTool$.peek()!
      cur.activate({})

      keoTren(container.querySelector('canvas')!, 140, 140, 300, 240)
    })

    await vi.waitFor(() => {
      expect(surface.elementModels.length).toBe(truoc + 1)
    })
    expect(surface.elementModels.at(-1)?.type).toBe('brush')
  })
})
