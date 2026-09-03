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
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { EdgelessCRUDIdentifier } from '@blocksuite/affine-block-surface'
import { ConnectorMode } from '@blocksuite/affine-model'

import { EdgelessBoard } from '../EdgelessBoard'
import type { GfxLike } from './helpers/note-interaction'
// Import vì tác dụng phụ: dựng proxy canvas + các polyfill happy-dom mà cây Lit cần lúc mount.
import './helpers/note-interaction'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

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
// `std` chỉ dùng cho ca Mindmap (đường tạo của nó không đi qua `gfx.tool`) — khai ở đây thay vì
// nới `GfxLike` dùng chung, để helper giữ đúng bề mặt tối thiểu nó cần.
// Bề mặt tối thiểu của `EdgelessCRUDExtension` mà ca Mindmap dùng tới — khai tại đây thay vì import
// kiểu thật từ cây vendored (giữ file test ngoài ranh giới D11, cùng lý do `SurfaceLike`/`GfxLike`
// bên trên tồn tại). Chữ ký khớp crud-extension.ts: `addElement(type, props)`.
type CrudLike = { addElement(type: string, props: Record<string, unknown>): unknown }
// `T` PHẢI được truyền tường minh ở chỗ gọi (`std.get<CrudLike>(...)`), không suy ra từ đối số:
// `EdgelessCRUDIdentifier` đi qua alias package nên kiểu `ServiceIdentifier<EdgelessCRUDExtension>`
// không tới được đây, không còn chỗ nào để `T` neo vào. Bản trước khai tham số là
// `{ identifierName: string } | unknown` — hợp `X | unknown` rút gọn thành `unknown`, nên `T` rơi
// về `unknown` và gọi `.addElement()` lên nó là lỗi tsc TS2571 "Object is of type 'unknown'".
type StdLike = { get<T>(id: { identifierName: string }): T }
type RootLike = { gfx: GfxLike & { surface: SurfaceLike; std: StdLike } }

function bienCo(ten: string, x: number, y: number): PointerEvent {
  const e = new PointerEvent(ten, {
    bubbles: true,
    cancelable: true,
    composed: true,
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
    isPrimary: true,
  })
  // happy-dom chưa cài hai bí danh `x`/`y` của MouseEvent (chuẩn: đồng nghĩa `clientX`/`clientY`).
  // KHÔNG phải chi tiết vụn: `isFarEnough()` (framework/std/src/event/utils.ts) đo quãng đường kéo
  // bằng ĐÚNG hai thuộc tính đó — thiếu chúng thì phép trừ ra `NaN`, `NaN > 4` là false, nên
  // `DragController` KHÔNG BAO GIỜ chuyển sang trạng thái kéo. Trước lượt vá này, hai ca "kéo" bên
  // dưới thật ra chạy qua nhánh `click()` của công cụ (cả shape-tool lẫn brush-tool đều có nhánh đó
  // và cũng tạo ra phần tử), nên chúng xanh mà không hề chứng minh được đường kéo.
  Object.defineProperty(e, 'x', { value: x })
  Object.defineProperty(e, 'y', { value: y })
  return e
}

/** Kéo một nét từ (x1,y1) tới (x2,y2) trên canvas — ba chặng đúng như thao tác tay. */
function keoTren(canvas: HTMLElement, x1: number, y1: number, x2: number, y2: number) {
  // `pointerenter` TRƯỚC, trên chính `editor-host`: `UIEventDispatcher` bắt đầu ở trạng thái
  // `active === false` và `run()` thoát ngay khi chưa active (dispatcher.ts:433). Trên trình duyệt
  // thật, ngón tay/chuột luôn đi VÀO host trước khi nhấn, nên `pointerenter` đánh thức dispatcher
  // trước `pointerdown`. Bắn thẳng `pointerdown` lên canvas như trước làm mất riêng hook
  // `pointerDown` của công cụ (những sự kiện sau đó vẫn tới, vì `focus` kịp bật active) — vô hại với
  // shape/brush nhưng giết hẳn connector-tool, thứ đặt điểm nguồn trong `pointerDown`.
  // `pointerenter` KHÔNG nổi bọt (chuẩn DOM) nên phải bắn đúng vào phần tử dispatcher đang nghe.
  document.querySelector('editor-host')?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }))
  canvas.dispatchEvent(bienCo('pointerdown', x1, y1))
  // Nhiều chặng move: `brush-tool.dragMove()` gom từng điểm vào nét, một điểm duy nhất không đủ
  // để thành đường; shape-tool thì chỉ cần biết ô chữ nhật đã đủ lớn.
  canvas.dispatchEvent(bienCo('pointermove', (x1 + x2) / 2, (y1 + y2) / 2))
  canvas.dispatchEvent(bienCo('pointermove', x2, y2))
  canvas.dispatchEvent(bienCo('pointerup', x2, y2))
}

/**
 * Bấm đúp lên một điểm của canvas — HAI cặp pointerdown/pointerup tại cùng chỗ.
 *
 * `PointerController._up()` (framework/std/src/event/control/pointer.ts:141) tự tổng hợp
 * `doubleClick` từ `_pointerDownCount === 2`; không có sự kiện DOM `dblclick` nào được nghe cả, nên
 * bắn `new MouseEvent('dblclick')` là không tới được công cụ.
 *
 * `pointermove` ĐẦU TIÊN LÀ BẮT BUỘC, đừng bỏ. `GfxViewEventManager.dispatch()`
 * (framework/std/src/gfx/interactivity/gfx-view-event-handler.ts:24) đẩy MỌI sự kiện không phải
 * `pointermove`/`drag*` tới `last(this._hoveredElementsStack)`, mà ngăn xếp đó CHỈ được
 * `_handlePointerMove` nạp. Thiếu lượt di chuột thì ngăn xếp rỗng và `dblclick` của phần tử không
 * bao giờ chạy — chuột thật luôn đi qua điểm đó trước khi bấm nên trên trình duyệt không thấy.
 * Đã kiểm A/B trên Chrome thật 2026-09-03: cùng một đường nối, cùng một điểm, bỏ `pointermove` thì
 * trình soạn nhãn KHÔNG mở; thêm đúng một lượt thì mở và tạo `text` + `labelXYWH`.
 */
function bamDupTren(canvas: HTMLElement, x: number, y: number) {
  document.querySelector('editor-host')?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }))
  canvas.dispatchEvent(bienCo('pointermove', x, y))
  for (let lan = 0; lan < 2; lan += 1) {
    canvas.dispatchEvent(bienCo('pointerdown', x, y))
    canvas.dispatchEvent(bienCo('pointerup', x, y))
  }
}

async function moBang(root: Root, boardId: string) {
  await act(async () => {
    root.render(createElement(EdgelessBoard, { boardId }))
  })
  await act(async () => {
    await choDom(() => {
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

    await choDom(() => {
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

    await choDom(() => {
      expect(surface.elementModels.length).toBe(truoc + 1)
    })
    expect(surface.elementModels.at(-1)?.type).toBe('brush')
  })
})

// ─── Connector + Mindmap (bổ sung 2026-08-29) ──────────────────────────────────────────────────
//
// HANDOFF mục 7 ghi: `ConnectorViewExtension`/`MindmapViewExtension` "đã đăng ký nhưng chưa có ca
// nào". Hai ca dưới trả nốt khoản đó, cùng chuẩn bằng chứng như hai ca trên: đếm phần tử THẬT trên
// `surface`, không phải trạng thái trung gian của công cụ.
//
// Hai đường tạo KHÁC NHAU, nên hai ca không đối xứng — đó là sự thật của thượng nguồn, không phải
// bất cẩn: Connector có công cụ riêng (`gfx.tool` tên `connector`, kéo trên canvas), còn Mindmap
// KHÔNG có công cụ nào — nó ra đời qua `EdgelessCRUDIdentifier.addElement('mindmap', ...)` mà nút
// toolbar gọi khi thả thẻ mindmap xuống bảng (`getMindmapRender()` ở
// affine/gfx/mindmap/src/toolbar/basket-elements.ts). Bắn pointer lên canvas với công cụ tên
// 'mindmap' sẽ không bao giờ tạo ra gì, vì công cụ đó không tồn tại.
describe('EdgelessBoard — Connector và Mindmap tạo ra phần tử thật trên surface', () => {
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

  it('công cụ Nối: kéo một đường trên nền trống → surface có thêm đúng một phần tử "connector"', async () => {
    const edgeless = await moBang(root, 'bang-ve-connector')
    const surface = edgeless.gfx.surface
    const truoc = surface.elementModels.length

    await act(async () => {
      edgeless.gfx.tool.currentToolName$.value = 'connector'
      const cur = edgeless.gfx.tool.currentTool$.peek()!
      // `connector-tool._createConnector()` đọc `this.activatedOption.mode` — thiếu nó thì đường
      // nối ra đời với `mode: undefined`. Đây đúng là option nút "Đường nối" truyền vào.
      const opt = { mode: ConnectorMode.Curve }
      cur.activatedOption = opt
      cur.activate(opt)

      keoTren(container.querySelector('canvas')!, 120, 120, 320, 260)
    })

    await choDom(() => {
      expect(surface.elementModels.length).toBe(truoc + 1)
    })
    expect(surface.elementModels.at(-1)?.type).toBe('connector')
  })

  // Người dùng báo 2026-09-03: "thanh công cụ → công cụ nối → nhập chữ có bị lỗi không". Ca trên chỉ
  // chứng minh được VẼ RA đường nối; nhập chữ lên nó là một chuỗi khác hẳn và chưa từng được kiểm:
  //   bấm đúp → `ConnectorElementView.on('dblclick')` (gfx/connector/src/view/view.ts:173)
  //   → `mountConnectorLabelEditor` (text/edgeless-connector-label-editor.ts:31)
  //   → tìm `.edgeless-mount-point` trong khối gốc, tạo `Y.Text` cho `connector.text`, gắn
  //     `<edgeless-connector-label-editor>` vào đó.
  // Đây đúng là lớp lỗi mà `extensions.ts` của app đã dính hai lần (giữ 37/58 view extension của
  // thượng nguồn): công cụ vẫn vẽ được, nhưng phần soạn chữ im lặng không mở ra.
  it('công cụ Nối: bấm đúp lên đường nối → trình soạn nhãn gắn vào bảng và phần tử có ô chữ', async () => {
    const edgeless = await moBang(root, 'bang-noi-nhap-chu')
    const surface = edgeless.gfx.surface
    const canvas = container.querySelector('canvas')!

    await act(async () => {
      edgeless.gfx.tool.currentToolName$.value = 'connector'
      const cur = edgeless.gfx.tool.currentTool$.peek()!
      const opt = { mode: ConnectorMode.Straight }
      cur.activatedOption = opt
      cur.activate(opt)
      keoTren(canvas, 120, 120, 320, 260)
    })
    await choDom(() => {
      expect(surface.elementModels.at(-1)?.type).toBe('connector')
    })
    const noi = surface.elementModels.at(-1) as unknown as { text?: { toString(): string }; labelXYWH?: number[] }
    expect(noi.text, 'đường nối vừa vẽ chưa được có sẵn ô chữ').toBeUndefined()

    // Bấm đúp vào GIỮA đường nối — cùng hệ toạ độ client mà cú kéo ở trên đã dùng.
    await act(async () => {
      bamDupTren(canvas, 220, 190)
    })

    await choDom(() => {
      expect(
        document.querySelector('edgeless-connector-label-editor'),
        'bấm đúp lên đường nối phải mở trình soạn nhãn',
      ).not.toBeNull()
    })
    expect(noi.text, 'mở trình soạn nhãn phải tạo ô chữ trên phần tử').toBeDefined()
    expect(noi.labelXYWH, 'ô chữ phải có khung đặt trên đường nối').toBeDefined()
  })

  it('Mindmap: thả một thẻ mindmap → surface có phần tử "mindmap" VÀ các nút con là "shape" thật', async () => {
    const edgeless = await moBang(root, 'bang-ve-mindmap')
    const surface = edgeless.gfx.surface
    const truoc = surface.elementModels.length

    // Cùng hình dạng cây mà `getMindmapRender()` dựng khi thả thẻ: một gốc + ba nhánh.
    await act(async () => {
      edgeless.gfx.std.get<CrudLike>(EdgelessCRUDIdentifier).addElement('mindmap', {
        children: {
          text: 'Gốc',
          xywh: '[0,0,100,32]',
          children: [
            { text: 'Nhánh 1', xywh: '[300,-50,100,32]', children: [] },
            { text: 'Nhánh 2', xywh: '[300,0,100,32]', children: [] },
            { text: 'Nhánh 3', xywh: '[300,50,100,32]', children: [] },
          ],
        },
      })
    })

    await choDom(() => {
      expect(surface.elementModels.length).toBeGreaterThan(truoc)
    })

    const them = surface.elementModels.slice(truoc)
    // Một phần tử `mindmap` (bản thân cây) + bốn `shape` (gốc và ba nhánh). Đếm theo loại chứ
    // không theo tổng: thượng nguồn có thể thêm phần tử phụ, nhưng thiếu `mindmap` hoặc thiếu nút
    // con thì extension coi như chưa vẽ được gì — đúng câu hỏi mục 7 đặt ra.
    expect(them.filter((e) => e.type === 'mindmap')).toHaveLength(1)
    expect(them.filter((e) => e.type === 'shape').length).toBeGreaterThanOrEqual(4)
  })
})
