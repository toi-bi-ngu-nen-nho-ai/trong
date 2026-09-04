// @vitest-environment happy-dom
//
// Băng cảnh báo "không lưu được" của `TrangBaiViet` — khoảng hở coverage mà review toàn nhánh
// 2026-09-04 chỉ ra (khoản Minor #8). Cơ chế NỀN sinh ra cờ này (`taoHoacMoDoc` hết giờ ở lượt race
// đồng bộ đầu tiên rồi rơi về workspace chỉ-trong-bộ-nhớ) đã có ca kiểm ở phía `mo-doc`/
// `EdgelessBoard`; thứ CHƯA ai canh là bước cuối: component có thật sự VẼ băng ấy ra không.
//
// VÌ SAO PHẢI LÀ MỘT TỆP RIÊNG, VÀ PHẢI MOCK. `TrangBaiViet` gọi `taoHoacMoDoc(docId, 'bai-viet')`
// KHÔNG kèm tuỳ chọn nào, nên không có đường nào từ bên ngoài ép được `hanGioMs` hay một
// `DocSource` chậm để lượt race thật sự hết giờ. Mock là cách duy nhất — nhưng mock MỘT PHẦN:
// `importActual` giữ nguyên workspace/store THẬT (component vẫn dựng `BlockStdScope` thật, vẫn
// render cây Lit thật), chỉ ép đúng một trường boolean. Mock trọn `taoHoacMoDoc` sẽ làm
// `new BlockStdScope({ store })` vỡ và biến ca kiểm thành vô nghĩa.
// `vi.mock` có phạm vi CẢ TỆP nên không nhét chung được với `trang-bai-viet-mount.spec.ts` — file đó
// cần hành vi thật.
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbPut } from '../../lib/idb'
import { type MucMeta } from '../mucMeta'
import { TrangBaiViet } from '../TrangBaiViet'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

// `vi.hoisted` vì factory của `vi.mock` bị nâng lên trên mọi import — một `let` thường khai ở đây sẽ
// chưa tồn tại lúc factory chạy. Cờ để mở được CẢ HAI chiều trong cùng một tệp: có băng và không.
const ep = vi.hoisted(() => ({ khongLuuDuoc: false }))

vi.mock('../mo-doc', async (importActual) => {
  const that = await importActual<typeof import('../mo-doc')>()
  return {
    ...that,
    taoHoacMoDoc: async (...thamSo: Parameters<typeof that.taoHoacMoDoc>) => {
      const ketQua = await that.taoHoacMoDoc(...thamSo)
      return ep.khongLuuDuoc ? { ...ketQua, khongLuuDuoc: true } : ketQua
    },
  }
})

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Ngữ cảnh 2D chế tay — happy-dom trả `null`; cùng lý do đã ghi ở `trang-bai-viet-mount.spec.ts`.
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

const CHU_BANG = 'Bài viết đang ở chế độ không lưu — nội dung sẽ mất khi tải lại trang.'

let boc: HTMLDivElement
let root: Root

async function ghiMeta(id: string, ten: string) {
  await idbPut<MucMeta>(IDB_STORES.boards, {
    id,
    ten,
    taoLuc: Date.now(),
    capNhatLuc: Date.now(),
    chuyenKhoa: 'cardiology',
    tags: [],
    noiDungTimKiem: '',
  })
}

beforeEach(() => {
  ep.khongLuuDuoc = false
  boc = document.createElement('div')
  document.body.append(boc)
  root = createRoot(boc)
})

afterEach(async () => {
  await act(async () => root.unmount())
  boc.remove()
})

describe('TrangBaiViet — băng cảnh báo không lưu được', () => {
  it('hiện băng khi taoHoacMoDoc trả khongLuuDuoc: true', async () => {
    ep.khongLuuDuoc = true
    await ghiMeta('bv-kld-1', 'Bài thử')

    await act(async () => {
      root.render(createElement(TrangBaiViet, { docId: 'bv-kld-1' }))
    })

    await choDom(() => expect(boc.querySelector('drt-page-root')).not.toBeNull())

    const bang = await choDom(() => {
      const thay = [...boc.querySelectorAll('[role="status"]')].find((n) =>
        n.textContent?.includes('chế độ không lưu'),
      )
      expect(thay).toBeDefined()
      return thay!
    })

    // Nội dung nguyên văn: đây là câu người dùng thật đọc khi sắp mất bài đang gõ, nên nó là một
    // phần của hợp đồng, không phải chi tiết vặt.
    expect(bang.textContent?.trim()).toBe(CHU_BANG)
    // `aria-live="polite"` chứ không `assertive`: băng xuất hiện lúc mở bài; một thông báo chen
    // ngang đúng lúc người dùng vừa đặt tay xuống gõ thì phiền hơn là giúp.
    expect(bang.getAttribute('aria-live')).toBe('polite')
    // `pointer-events-none`: băng ghim đè lên đầu vùng soạn thảo, bắt chuột là nuốt mất cú bấm đặt
    // con trỏ vào dòng đầu tiên của bài.
    expect(bang.className).toContain('pointer-events-none')
  })

  it('KHÔNG hiện băng ở đường mở bình thường', async () => {
    await ghiMeta('bv-kld-2', 'Bài thử')

    await act(async () => {
      root.render(createElement(TrangBaiViet, { docId: 'bv-kld-2' }))
    })

    await choDom(() => expect(boc.querySelector('drt-page-root')).not.toBeNull())
    // Vế còn lại của cặp: một băng cảnh báo hiện SAI còn tệ hơn không có, vì nó dạy bác sĩ bỏ qua
    // cảnh báo. Thiếu ca này thì một `khongLuuDuoc={true}` viết cứng cũng làm ca trên xanh.
    expect(boc.textContent).not.toContain('chế độ không lưu')
  })
})
