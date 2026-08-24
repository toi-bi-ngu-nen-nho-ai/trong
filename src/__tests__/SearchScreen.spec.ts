// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import { SearchScreen } from '../App'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Chờ qua NHIỀU lượt act() rời nhau thay vì một act() bọc ngoài vi.waitFor — cùng lý do đã ghi kỹ
// trong src/board/__tests__/DanhSachBang.spec.ts: act() chỉ flush hàng đợi cập nhật SAU KHI callback
// của chính nó resolve, nên poll BÊN TRONG một act() duy nhất sẽ treo vô hạn khi điều kiện chờ phụ
// thuộc chính cú flush đó (ở đây là `loading`/`items` của useIdbCollection sau khi idbGetAll xong).
async function choDenKhi(dieuKien: () => void, timeoutMs = 3000, buocMs = 50) {
  const hetHan = Date.now() + timeoutMs
  for (;;) {
    try {
      dieuKien()
      return
    } catch (loi) {
      if (Date.now() >= hetHan) throw loi
    }
    await act(async () => {
      await new Promise((r) => setTimeout(r, buocMs))
    })
  }
}

// happy-dom: gán thẳng `.value` KHÔNG đi qua setter React đã vá (_valueTracker) nên onChange im
// lặng không bắn, ô tìm kiếm đứng yên ở trạng thái rỗng. Phải gọi setter GỐC của
// HTMLInputElement.prototype rồi mới bắn 'input' — cùng mẫu đã dùng ở
// src/board/__tests__/DanhSachBang.spec.ts (goVaoOTim).
async function goVaoOTim(o: HTMLInputElement, chu: string) {
  const datGiaTriGoc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    if (datGiaTriGoc) datGiaTriGoc.call(o, chu)
    else o.value = chu
    o.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('SearchScreen — kết quả loại "board"', () => {
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
    // fake-indexeddb giữ state giữa các ca trong cùng file — dọn sạch để ca sau không thấy bảng cũ.
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
  })

  it('gõ tên một bảng đã lưu → xuất hiện trong kết quả, bấm vào gọi onNavigate("mindmap", id)', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-1',
      ten: 'Suy tim EF giảm',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology',
      tags: ['nội trú'],
      noiDungTimKiem: '',
    })

    const onNavigate = vi.fn()
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate,
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'suy tim')

    await choDenKhi(() => {
      expect(container.textContent).toContain('Suy tim EF giảm')
    })

    const ketQua = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Suy tim EF giảm'),
    ) as HTMLButtonElement
    await act(async () => {
      ketQua.click()
    })

    expect(onNavigate).toHaveBeenCalledWith('mindmap', 'bang-1')
  })

  it('bảng đã xoá mềm (daXoaLuc) KHÔNG lọt vào kết quả tìm kiếm', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-da-xoa',
      // Tên cố ý KHÔNG trùng bất kỳ bài viết dựng sẵn nào trong ARTICLES — nếu đặt trùng (vd "Viêm
      // phổi cộng đồng", vốn đã là một bài có sẵn) thì kết quả tìm được là BÀI VIẾT đó chứ không
      // phải bảng, và ca kiểm sẽ đỏ vì lý do chẳng liên quan gì tới xoá mềm.
      ten: 'Bảng nháp vứt đi',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      daXoaLuc: bayGio,
      chuyenKhoa: 'pulmonology',
      tags: [],
      noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate: vi.fn(),
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'bảng nháp vứt đi')

    // Đợi hook nạp xong danh sách bảng rồi mới khẳng định "không có" — nếu khẳng định ngay lập tức
    // thì ca kiểm này xanh giả (lúc đó `boards` còn rỗng vì IndexedDB đọc bất đồng bộ).
    await choDenKhi(() => {
      expect(container.textContent).toContain('Không có kết quả')
    })
    expect(container.textContent).not.toContain('Bảng nháp vứt đi')
  })

  it('bảng cũ THIẾU chuyenKhoa/tags (bản ghi trước lượt di trú) không làm sập ô tìm kiếm', async () => {
    const bayGio = Date.now()
    // Cố ý ghi bản ghi KHÔNG có chuyenKhoa/tags/noiDungTimKiem — đúng hình dạng bảng tạo trước
    // Task 1 ở runtime (kiểu BangMeta khai bắt buộc, nhưng dữ liệu cũ trong IndexedDB thì không có).
    await idbPut(IDB_STORES.boards, {
      id: 'bang-cu',
      ten: 'Sốc nhiễm khuẩn',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
    })

    const onNavigate = vi.fn()
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate,
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await goVaoOTim(oTim, 'sốc nhiễm')

    await choDenKhi(() => {
      expect(container.textContent).toContain('Sốc nhiễm khuẩn')
    })

    const ketQua = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sốc nhiễm khuẩn'),
    ) as HTMLButtonElement
    await act(async () => {
      ketQua.click()
    })

    expect(onNavigate).toHaveBeenCalledWith('mindmap', 'bang-cu')
  })
})
