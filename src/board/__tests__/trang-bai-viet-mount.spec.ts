// @vitest-environment happy-dom
//
// Cầu nối React↔Lit cho CHẾ ĐỘ TRANG — thứ mà `trang-mount.spec.ts` không chạm (file đó gọi thẳng
// BlockStdScope, nên xoá sạch component TrangBaiViet nó vẫn xanh). Song sinh của
// `edgeless-board-mount.spec.ts`; đọc file đó trước.
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { IDB_STORES, idbGetAll, idbPut } from '../../lib/idb'
import type { MucMeta } from '../mucMeta'
import { TrangBaiViet } from '../TrangBaiViet'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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

let boc: HTMLDivElement
let root: Root

async function ghiMeta(id: string, ten: string, noiDungTimKiem = '') {
  await idbPut<MucMeta>(IDB_STORES.boards, {
    id,
    ten,
    taoLuc: Date.now(),
    capNhatLuc: Date.now(),
    chuyenKhoa: 'cardiology',
    tags: [],
    noiDungTimKiem,
  })
}

beforeEach(() => {
  boc = document.createElement('div')
  document.body.append(boc)
  root = createRoot(boc)
})

afterEach(async () => {
  await act(async () => root.unmount())
  boc.remove()
})

describe('TrangBaiViet', () => {
  it('mount ra thẻ gốc page và một vùng soạn thảo', async () => {
    await ghiMeta('bv-mount-1', 'Bài thử')

    await act(async () => {
      root.render(createElement(TrangBaiViet, { docId: 'bv-mount-1' }))
    })

    await choDom(() => expect(boc.querySelector('drt-page-root')).not.toBeNull())
    await choDom(() => expect(boc.querySelector('[contenteditable="true"]')).not.toBeNull())
  })

  it('KHÔNG khoá chỉ-đọc dù matchMedia báo khung hẹp', async () => {
    // Luật chỉ-đọc-khung-hẹp CHỈ áp cho sơ đồ (spec quyết định 8). Bài viết phải gõ được trên điện
    // thoại dọc — đó là cả lý do bật thanh công cụ bàn phím ảo ở Task 10.
    //
    // happy-dom KHÔNG bắn sự kiện change của matchMedia khi đổi kích thước
    // ([[feedback_resize-window-khong-ban-matchmedia-change]]), nên ca này ép `matchMedia` báo
    // "khớp" ngay từ lúc mount thay vì cố đổi bề ngang.
    const matchMediaCu = window.matchMedia
    window.matchMedia = ((q: string) => ({
      matches: true,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    try {
      await ghiMeta('bv-mount-2', 'Bài hẹp')

      await act(async () => {
        root.render(createElement(TrangBaiViet, { docId: 'bv-mount-2' }))
      })

      await choDom(() => expect(boc.querySelector('drt-page-root')).not.toBeNull())
      // Vùng soạn thảo còn sống ⇒ store không bị đặt readonly.
      expect(boc.querySelector('[contenteditable="true"]')).not.toBeNull()
    } finally {
      window.matchMedia = matchMediaCu
    }
  })

  it('rời bài viết thì ghi lại metadata', async () => {
    // Seed `noiDungTimKiem: 'RAC-CU'` (khác chuỗi rỗng) thay vì '' — đây là bằng chứng lượt unmount
    // THẬT SỰ chạy `capNhatSauKhiRoiMuc`, không chỉ "bản ghi vẫn còn đó" (chuyện đã đúng ngay từ
    // TRƯỚC khi mount, không cần component làm gì). Chuỗi rác này phải bị GHI ĐÈ thành '' sau khi
    // rời bài — bài rỗng không có chữ nào để `trichVanBanTuKhoi` trích ra, và `capNhatSauKhiRoiMuc`
    // ghi `noiDungTimKiemMoi ?? hienCo.noiDungTimKiem ?? ''` (mucMeta.ts:95): chuỗi rỗng '' KHÔNG
    // phải nullish nên `?? ''` không giữ lại 'RAC-CU' — nó phải bị thay bằng ''. Xoá lời gọi
    // `capNhatSauKhiRoiMuc` trong cleanup thì 'RAC-CU' còn nguyên và ca này phải đỏ (kiểm bằng tay ở
    // bước tự soát, xem báo cáo).
    const capNhatLucGoc = Date.now()
    await idbPut<MucMeta>(IDB_STORES.boards, {
      id: 'bv-mount-3',
      ten: 'Bài rời',
      taoLuc: capNhatLucGoc,
      capNhatLuc: capNhatLucGoc,
      chuyenKhoa: 'cardiology',
      tags: [],
      noiDungTimKiem: 'RAC-CU',
    })

    await act(async () => {
      root.render(createElement(TrangBaiViet, { docId: 'bv-mount-3' }))
    })
    await choDom(() => expect(boc.querySelector('drt-page-root')).not.toBeNull())

    await act(async () => root.unmount())

    // `capNhatSauKhiRoiMuc` là fire-and-forget; chờ tới khi bản ghi hiện ra.
    await choDom(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.boards)
      const muc = ds.find((m) => m.id === 'bv-mount-3')
      expect(muc, 'metadata phải còn sau khi rời bài').toBeDefined()
      // (a) noiDungTimKiem phải bị ghi đè về '' — bằng chứng lượt ghi metadata lúc unmount THẬT SỰ
      // chạy, không phải bản ghi seed sẵn còn nguyên.
      expect(muc!.noiDungTimKiem).toBe('')
      // (b) Chỉ MỞ RỒI RỜI, không gõ gì ⇒ coThayDoiNoiDung=false ⇒ capNhatLuc KHÔNG được nhảy (cùng
      // luật với bảng vẽ) — so với ĐÚNG giá trị đã seed, không phải "còn tồn tại là đủ".
      expect(muc!.capNhatLuc).toBe(capNhatLucGoc)
      expect(muc!.ten).toBe('Bài rời')
    })
  })
})
