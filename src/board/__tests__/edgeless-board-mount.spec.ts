// @vitest-environment happy-dom
//
// Ca kiểm CẦU NỐI React↔Lit — thứ mà `edgeless-board.spec.ts` không chạm tới (file đó chỉ gọi
// `taoHoacMoDoc()`, nên xoá sạch component `EdgelessBoard` nó vẫn xanh).
//
// Vì sao có dòng `@vitest-environment happy-dom` ở đầu file: environment mặc định của dự án là
// 'node' (xem vite.config.ts) và mọi thứ chạm DOM sẽ đâm `DOMRect is not defined`. Chỉ thị trên
// đổi environment CHO RIÊNG FILE NÀY, không đụng 15 file spec còn lại — rẻ hơn nhiều so với đổi
// environment toàn cục, và không phải tự chế global giả bằng tay (một DOM tự chế sẽ khác DOM thật
// đúng ở những chỗ ta không lường trước). Chọn 'happy-dom' chứ không phải 'jsdom' vì chính
// BlockSuite chạy bộ test của họ trên happy-dom (xem affine/all/vitest.config.ts trong cây
// vendored) — cùng một môi trường thượng nguồn đã kiểm chứng cho chính đống mã Lit này.
import 'fake-indexeddb/auto'

import { Text } from '@blocksuite/store'
import { act } from 'react'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbGetAll, idbPut } from '../../lib/idb'
import * as mucMeta from '../mucMeta'
import { EdgelessBoard } from '../EdgelessBoard'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

// React 19 yêu cầu cờ này để `act()` không cảnh báo; vitest không tự đặt.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Ngữ cảnh 2D của <canvas> là thứ DUY NHẤT phải chế tay ở đây, và không môi trường DOM thuần
// JavaScript nào cấp được: happy-dom lẫn jsdom đều trả `null` từ `getContext('2d')` (jsdom cần gói
// native `canvas`, biên dịch được trên Windows là chuyện hên xui). `SurfaceBlockComponent`
// .firstUpdated gọi `CanvasRenderer._render` → `ctx.clearRect(...)` trên `null` và ném lỗi BẤT ĐỒNG
// BỘ (qua requestIdleCallback) SAU khi ca kiểm đã xong — vitest đếm nó vào "unhandled errors" và
// trả exit code 1 dù mọi expect đều xanh.
// Proxy dưới đây nuốt mọi lời gọi vẽ (trả về chính nó, và ép về số 0 khi bị dùng trong phép tính),
// nên phần vẽ ra pixel trở thành no-op. KHÔNG ca kiểm nào dựa vào nó: các expect bên dưới chỉ đọc
// cây DOM (thẻ custom element, `closest()`, `innerHTML`) — thứ happy-dom cấp thật.
const taoCtxGia = (canvas: HTMLCanvasElement): unknown =>
  new Proxy(function () {} as unknown as object, {
    get(_t, p) {
      if (p === 'canvas') return canvas
      if (p === Symbol.toPrimitive) return () => 0
      return taoCtxGia(canvas)
    },
    set: () => true,
    apply: () => taoCtxGia(canvas),
  })
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  return taoCtxGia(this)
} as HTMLCanvasElement['getContext']

describe('EdgelessBoard — cầu nối React↔Lit', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    // Phải nằm trong document thật: `closest()` và vòng đời custom element chỉ chạy khi phần tử
    // đã được kết nối vào cây tài liệu.
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    // Tháo cây React TRƯỚC khi xoá container khỏi tài liệu. Chỉ gọi `container.remove()` (bản cũ)
    // để lại `TestWorkspace`/`DocEngine` của bất kỳ ca kiểm nào kết thúc mà không tự unmount (2 ca
    // kiểm mới hơn trong file này làm vậy) vẫn chạy nền, tiếp tục đồng bộ với CÙNG CSDL giả lập
    // 'drtrong-board' trong lúc các ca kiểm sau chạy — một nguồn nhiễu chéo thật giữa các ca kiểm,
    // từng bị nhầm là "chập chờn" thuần tuý ở các lượt trước trong lịch sử nhánh này.
    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('dựng cây Lit trong thẻ div của React, có tổ tiên viewport, và dọn sạch khi tháo', async () => {
    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'board' }))
    })

    // taoHoacMoDoc() giờ bất đồng bộ (đợi đồng bộ IndexedDB, dù cục bộ và nhanh) — cây Lit chỉ
    // được gắn SAU khi promise đó xong, không còn ngay trong lượt act() đầu tiên. Đợi tường minh
    // thay vì giả định act() một lượt là đủ.
    // Bọc trong act(): taoHoacMoDoc() resolve xong còn kéo theo setDangMo(false) — một cập nhật
    // state React thật, cần một lượt render nữa để gỡ div "Đang mở bảng…" khỏi DOM. vi.waitFor
    // trần (không bọc act) chỉ đợi được điều kiện của nó, không flush lượt render đó: React cảnh
    // báo "not wrapped in act(...)" và div loading vẫn còn nằm trước div gắn Lit, khiến phép kiểm
    // `:scope > div` bên dưới chọn nhầm div loading (không có editor-host) thay vì div hostRef.
    await act(async () => {
      await choDom(() => {
        expect(document.querySelector('drt-edgeless-root')).not.toBeNull()
      })
    })

    // 1) Cây Lit thật sự được dựng: thẻ gốc edgeless (đã đổi tên affine-→drt- ở bước build vendor)
    //    phải có mặt trong tài liệu. Nếu `viewExtensions` bị rỗng/xáo trộn thì RootViewExtension
    //    không còn, và thẻ này không bao giờ xuất hiện.
    const goc = document.querySelector('drt-edgeless-root')
    expect(goc).not.toBeNull()

    // 2) Ranh giới nhúng: `ViewportElementExtension('.drt-edgeless-viewport')` đi NGƯỢC LÊN từ
    //    editor host bằng `closest()`. Bọc thiếu tổ tiên mang đúng class này là lỗi
    //    "viewport element is not found" lúc chạy.
    const host = document.querySelector('editor-host')
    expect(host).not.toBeNull()
    const boc = container.querySelector('.drt-edgeless-viewport')
    expect(boc).not.toBeNull()
    expect(host!.closest('.drt-edgeless-viewport')).toBe(boc)

    // 3) Dọn dẹp: `litRender(null, el)` trong hàm trả về của useEffect. Thiếu nó thì cây Lit cũ
    //    còn sống sau khi React tháo component (listener, rAF vẫn chạy).
    //
    //    Phải giữ tham chiếu tới ĐÚNG thẻ div mà Lit render vào (con của thẻ bọc) TRƯỚC khi tháo:
    //    sau khi tháo, React gỡ cả thẻ bọc khỏi `container` nên mọi phép kiểm nhìn từ `container`
    //    hay từ `document` đều xanh dù có dọn hay không — đã kiểm chứng bằng đột biến: xoá hẳn
    //    `litRender(null, el)` mà hai expect cuối vẫn xanh. Thẻ div này thì khác: nó bị React gỡ
    //    khỏi tài liệu nhưng KHÔNG bị React dọn ruột (ruột là do Lit đặt vào, React không biết),
    //    nên `editor-host` bên trong chỉ biến mất khi `litRender(null, el)` thật sự chạy.
    //
    //    `:last-child` chứ không phải con ĐẦU: thẻ hostRef div luôn đứng SAU băng cảnh báo "không
    //    lưu" nếu nó render (xem EdgelessBoard.tsx) — nếu lượt đồng bộ giả lập này tình cờ chạm hạn
    //    giờ dưới tải CPU cao, `khongLuuDuoc` thành true và con ĐẦU của thẻ bọc sẽ là băng cảnh báo
    //    chứ không phải hostRef div, làm phép kiểm dưới đây chọn nhầm và đỏ giả không liên quan gì
    //    tới việc dọn dẹp đang canh.
    const noiLitRender = boc!.querySelector(':scope > div:last-child')
    expect(noiLitRender).not.toBeNull()
    expect(noiLitRender!.querySelector('editor-host')).not.toBeNull()

    await act(async () => {
      root.unmount()
    })
    expect(noiLitRender!.querySelector('editor-host')).toBeNull()
    // Hai phép kiểm dưới đây KHÔNG thay thế phép kiểm trên (chúng xanh cả khi thiếu dọn dẹp) —
    // giữ lại vì chúng canh phần việc của React: thẻ bọc phải được gỡ khỏi container.
    expect(container.innerHTML).toBe('')
    expect(document.querySelector('drt-edgeless-root')).toBeNull()
  })

  it('hiện "Đang mở bảng…" trước, biến mất sau khi đồng bộ xong và cây Lit đã gắn', async () => {
    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'board' }))
    })

    // Ngay sau lượt render đầu — trước khi taoHoacMoDoc() kịp resolve — trạng thái chờ phải đã
    // hiện. Đây là khẳng định "hiện TRƯỚC", không chỉ "cuối cùng có hiện qua" — nếu bỏ qua bước
    // này, một cài đặt render đồng thời cả hai trạng thái vẫn qua được ca kiểm dưới.
    expect(container.textContent).toContain('Đang mở bảng…')

    await act(async () => {
      await choDom(() => {
        expect(document.querySelector('editor-host')).not.toBeNull()
      })
    })

    // Sau khi cây Lit đã gắn, trạng thái chờ phải biến mất — không đè lên nội dung thật.
    expect(container.textContent).not.toContain('Đang mở bảng…')
  })

  it('nội dung sống sót qua unmount rồi mount lại (cùng tên CSDL)', async () => {
    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'board' }))
    })
    await act(async () => {
      await choDom(() => {
        expect(document.querySelector('editor-host')).not.toBeNull()
      })
    })

    // Đếm số block affine:page hiện có trong DOM trước khi tháo — dùng làm mốc so sánh sau khi
    // mount lại. Không sửa nội dung qua UI thật ở đây (không có input giả lập bàn phím trong ca
    // kiểm này) — chỉ cần xác nhận KHÔNG NHÂN ĐÔI khi mount lại, đúng phạm vi §3 của spec. Việc
    // gõ nội dung thật rồi kiểm tra nó còn nguyên là việc của bước kiểm tay trên trình duyệt thật
    // (spec §9 mục 6) — DOM giả lập ở đây không có input bàn phím đáng tin để mô phỏng việc đó.
    const soTrangTruoc = document.querySelectorAll('affine-page-root, affine-edgeless-root').length

    await act(async () => {
      root.unmount()
    })

    // Mount lại — TestWorkspace mới, nhưng cùng docSources/blobSources thật (IndexedDB thật hoặc
    // polyfill của Step 1 Task 1, cùng tên CSDL 'drtrong-board') và CÙNG boardId 'board' truyền
    // vào createElement ở trên nên phải đọc lại được đúng doc 'board' đã lưu.
    root = createRoot(container)
    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'board' }))
    })
    await act(async () => {
      await choDom(() => {
        expect(document.querySelector('editor-host')).not.toBeNull()
      })
    })

    const soTrangSau = document.querySelectorAll('affine-page-root, affine-edgeless-root').length
    expect(soTrangSau).toBe(soTrangTruoc)
    // Không ném lỗi "doc already exists" trong lúc mount lại — nếu có, act() ở trên đã ném rồi,
    // ca kiểm này sẽ tự đỏ trước khi chạm tới expect cuối.
  })

  it('unmount ngay khi đang chờ đồng bộ không ném lỗi "set state sau unmount"', async () => {
    // Giữ khung bắt console.error làm lưới an toàn phụ (không phải khẳng định chính — xem lý do
    // bên dưới), lỡ có lỗi console khác nổi lên trong lúc ca kiểm này chạy.
    const loiConsole: unknown[][] = []
    const consoleErrorGoc = console.error
    console.error = (...doiSo: unknown[]) => {
      loiConsole.push(doiSo)
      consoleErrorGoc(...doiSo)
    }

    try {
      await act(async () => {
        root.render(createElement(EdgelessBoard, { boardId: 'board' }))
      })
      // Giữ tham chiếu tới ĐÚNG thẻ div hostRef TRƯỚC khi tháo — cùng kỹ thuật ca kiểm đầu file
      // này đã dùng (xem chú thích ở đó). Sau khi React tháo, thẻ bọc `.drt-edgeless-viewport` bị
      // gỡ khỏi `container`/`document` nên MỌI truy vấn xuất phát từ `container`/`document` trả về
      // null bất kể guard `huyBo` có hoạt động hay không — một khẳng định như vậy KHÔNG THỂ ĐỎ dù
      // guard có hỏng (đây đúng là lỗ hổng của bản trước, bắt được ở lượt review toàn nhánh). Thẻ
      // hostRef div (con CUỐI CÙNG của thẻ bọc — luôn đứng sau băng cảnh báo/lỗi/"Đang mở bảng…"
      // nếu chúng có mặt) thì khác: nó không bị React dọn ruột (ruột do Lit đặt vào), nên chỉ trống
      // nếu `litRender()` THẬT SỰ chưa từng chạy vào đó.
      const boc = container.querySelector('.drt-edgeless-viewport')!
      const hostDiv = boc.querySelector(':scope > div:last-child')!
      // KHÔNG đợi taoHoacMoDoc() xong — tháo component NGAY trong lúc còn "Đang mở bảng…".
      await act(async () => {
        root.unmount()
      })
      // Cho vòng lặp sự kiện thêm một nhịp để promise taoHoacMoDoc() (nếu vẫn đang chạy) có cơ
      // hội resolve VÀ chạm nhánh `huyBo` — đây chính là nhánh ca kiểm này canh.
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Nếu guard `huyBo` KHÔNG chặn được `litRender()`, Lit sẽ gắn `editor-host` vào đúng thẻ
      // hostDiv này dù đã bị gỡ khỏi tài liệu — bằng chứng ca kiểm này thật sự canh được lỗi, không
      // phải vô hại dù guard có hỏng hay không.
      expect(hostDiv.querySelector('editor-host')).toBeNull()
    } finally {
      console.error = consoleErrorGoc
    }

    // Lưới an toàn phụ — React 19 đã bỏ chuỗi cảnh báo "unmounted component" nên khẳng định này
    // luôn đúng bất kể guard có hoạt động hay không (không còn tín hiệu thật); khẳng định CHÍNH là
    // `hostDiv.querySelector('editor-host')` ở trên. Giữ lại khối bắt console.error vì nó vẫn có
    // giá trị canh những lỗi console KHÁC nổi lên trong lúc ca kiểm chạy.
    const coLoiSetStateSauUnmount = loiConsole.some((doiSo) =>
      doiSo.some((phan) => typeof phan === 'string' && phan.includes('unmounted component')),
    )
    expect(coLoiSetStateSauUnmount).toBe(false)
  })

  it('unmount → gọi capNhatSauKhiRoiMuc với đúng boardId, KHÔNG phụ thuộc canvas', async () => {
    const spy = vi.spyOn(mucMeta, 'capNhatSauKhiRoiMuc').mockResolvedValue(undefined)

    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'bang-roi-ra' }))
    })
    await act(async () => {
      await choDom(() => {
        expect(document.querySelector('editor-host')).not.toBeNull()
      })
    })

    // KHÔNG gán kích thước cho canvas ở đây — và đó chính là điều ca kiểm này canh. Trước
    // 2026-08-30 lượt gọi cập nhật metadata nằm LỒNG trong `if (canvasGoc && canvasGoc.width > 0)`,
    // tức điều kiện của việc CHỤP ẢNH; happy-dom cho canvas 0×0 nên ca kiểm cũ phải tự gán
    // width/height giả chỉ để lượt cập nhật chịu chạy. Cơ chế chụp ảnh đã bị gỡ, nên bump
    // capNhatLuc / backfill chuyenKhoa-tags / ghi noiDungTimKiem giờ VÔ ĐIỀU KIỆN — nếu ai đó lại
    // buộc nó vào trạng thái canvas lần nữa, ca kiểm này đỏ.
    await act(async () => {
      root.unmount()
    })

    // Không tương tác gì với bảng ở ca này (mount rồi unmount ngay) nên coThayDoiNoiDung phải là
    // false — xem cơ chế theo dõi blockUpdated/element{Added,Updated,Removed} ở EdgelessBoard.tsx.
    // Tham số thứ 3 (noiDungTimKiemMoi) là chuỗi rỗng — bảng không có chữ nào để trích.
    expect(spy).toHaveBeenCalledWith('bang-roi-ra', false, expect.any(String))
    spy.mockRestore()
  })

  it('có thêm khối THẬT (store.addBlock) trong phiên mở → unmount gọi capNhatSauKhiRoiMuc với coThayDoiNoiDung=true', async () => {
    const spy = vi.spyOn(mucMeta, 'capNhatSauKhiRoiMuc').mockResolvedValue(undefined)

    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'bang-co-sua' }))
    })
    await act(async () => {
      await choDom(() => {
        expect(document.querySelector('editor-host')).not.toBeNull()
      })
    })

    // store.addBlock() — CHÍNH API công khai mà mọi thao tác thêm nội dung thật (gõ chữ, chèn note,
    // dán ảnh...) đi qua, không phải lối tắt riêng cho ca kiểm này (cùng nguyên tắc đã dùng ở
    // edgeless-board-reorder.spec.ts). Đây là điểm khác biệt DUY NHẤT với ca kiểm phía trên.
    const eh = document.querySelector('editor-host') as unknown as {
      std: { store: { root: { id: string } | null; addBlock: (flavour: string, props: object, parent: string) => void } }
    }
    await act(async () => {
      const store = eh.std.store
      if (store.root) store.addBlock('affine:note', {}, store.root.id)
    })

    await act(async () => {
      root.unmount()
    })

    // Tham số thứ 3 (noiDungTimKiemMoi): khối thêm vào là note trống (không paragraph/text), nên
    // chuỗi trích ra vẫn rỗng — chỉ `coThayDoiNoiDung` mới đổi thành true ở ca này.
    expect(spy).toHaveBeenCalledWith('bang-co-sua', true, expect.any(String))
    spy.mockRestore()
  })

  it('rời bảng có ghi chú thật → noiDungTimKiem trong MucMeta chứa đúng chữ đó', async () => {
    // Seed một MucMeta tối thiểu cho id 'bang-trich-chu' TRƯỚC khi mount — capNhatSauKhiRoiMuc()
    // chỉ ghi nếu bản ghi ĐÃ tồn tại (xem mucMeta.ts, `if (!hienCo) return`).
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-trich-chu', ten: 'Bảng test', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'bang-trich-chu' }))
    })
    await act(async () => {
      await choDom(() => {
        expect(document.querySelector('editor-host')).not.toBeNull()
      })
    })

    // Thêm một note+paragraph có chữ thật vào store đang mở — CHÍNH API công khai
    // (store.addBlock) mà mọi thao tác thêm nội dung thật đi qua, cùng mẫu hình các ca kiểm khác
    // trong file này đã dùng (xem ca "có thêm khối THẬT" phía trên).
    const eh = document.querySelector('editor-host') as unknown as {
      std: { store: { root: { id: string } | null; addBlock: (f: string, p?: object, parent?: string) => string } }
    }
    await act(async () => {
      const store = eh.std.store
      if (store.root) {
        const noteId = store.addBlock('affine:note', {}, store.root.id)
        store.addBlock('affine:paragraph', { text: new Text('Ghi chú suy tim EF giảm') }, noteId)
      }
    })

    // KHÔNG cần dựng kích thước canvas giả nữa: lượt trích văn bản + ghi metadata đã tách khỏi
    // nhánh chụp ảnh (cơ chế chụp bị gỡ 2026-08-30) nên nó chạy vô điều kiện lúc unmount.
    await act(async () => {
      root.unmount()
    })

    await choDom(async () => {
      const ds = await idbGetAll<{ id: string; noiDungTimKiem: string }>(IDB_STORES.boards)
      expect(ds.find((b) => b.id === 'bang-trich-chu')?.noiDungTimKiem).toContain(
        'Ghi chú suy tim EF giảm',
      )
    })
  })
})
