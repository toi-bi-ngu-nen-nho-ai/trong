// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import type { BangMeta } from '../boardMeta'
import { BoardGallery } from '../BoardGallery'

// Ghi thẳng qua idb.ts thay vì đi qua UI/hook — file này canh hành vi ĐIỀU HƯỚNG của BoardGallery
// (mount/unmount/ẩn), không phải hành vi tạo bảng (đã canh riêng ở DanhSachBang.spec.ts).
function taoBangGia(ten: string): BangMeta {
  const bayGio = Date.now()
  const meta: BangMeta = { id: `bang-gia-${bayGio}-${Math.random().toString(36).slice(2, 6)}`, ten, taoLuc: bayGio, capNhatLuc: bayGio }
  return meta
}

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Giả EdgelessBoard thật (chunk nặng, cần DOM canvas) bằng một component tối giản có thể quan sát
// được prop boardId — đủ để canh ĐÚNG hành vi điều hướng/ẩn-hiện mà file này chịu trách nhiệm,
// không lặp lại phạm vi của edgeless-board-mount.spec.ts.
vi.mock('../index', () => ({
  EdgelessBoard: ({ boardId }: { boardId: string }) =>
    createElement('div', { 'data-testid': 'bang-gia', 'data-board-id': boardId }, 'BẢNG GIẢ'),
}))

// `act(async () => { await vi.waitFor(() => { expect(...) } ) })` — một act() DUY NHẤT bọc ngoài
// toàn bộ vòng lặp poll — TREO VÔ THỜI HẠN khi điều kiện chờ phụ thuộc một cập nhật state React
// (đã xác nhận đúng nguyên nhân này ở DanhSachBang.spec.ts, cùng gốc: `loading` của
// useIdbCollection bên trong DanhSachBang mà BoardGallery render). Khắc phục giống hệt: chờ qua
// NHIỀU lượt act() rời nhau, mỗi lượt tự flush xong TRƯỚC KHI lượt sau kiểm tra lại điều kiện.
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

describe('BoardGallery', () => {
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
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
  })

  it('mặc định hiện lưới danh sách, chưa có bảng nào mount', async () => {
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-testid="bang-gia"]')).toBeNull()
  })

  it('bấm một thẻ bảng → mount EdgelessBoard với đúng boardId, lưới ẩn đi', async () => {
    const meta = taoBangGia('Bảng test')
    await idbPut(IDB_STORES.boards, meta)
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })

    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-testid="bang-gia"]')?.getAttribute('data-board-id')).toBe(meta.id)
    expect(container.querySelector('[data-testid="tao-bang"]')).toBeNull()
  })

  it('dangHienTab=false trong khi có bảng mở → EdgelessBoard VẪN mount (không unmount), chỉ ẩn', async () => {
    const meta = taoBangGia('Bảng test')
    await idbPut(IDB_STORES.boards, meta)
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())

    const noiBangThat = container.querySelector('[data-testid="bang-gia"]')

    // Mô phỏng người dùng chuyển sang tab khác (Home) — App.tsx sẽ đổi prop này, KHÔNG unmount.
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: false }))
    })

    // Vẫn còn trong DOM (đúng kỹ thuật ẩn-không-tháo đã đo cho ResizeObserver) — VÀ vẫn ĐÚNG node
    // DOM cũ (không phải một node mới do unmount+remount tình cờ trùng testid), để loại trừ khả
    // năng cài đặt sai kiểu "render null rồi render lại" mà vẫn qua được ca kiểm này.
    const noiBangSauKhiAn = container.querySelector('[data-testid="bang-gia"]')
    expect(noiBangSauKhiAn).toBe(noiBangThat)
    expect(noiBangSauKhiAn?.getAttribute('data-board-id')).toBe(meta.id)
    const boc = container.querySelector('[data-testid="boc-bang"]')
    expect(boc?.className).toContain('invisible')
  })

  it('bấm nút quay lại → EdgelessBoard unmount thật, lưới hiện lại', async () => {
    await idbPut(IDB_STORES.boards, taoBangGia('Bảng test'))
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await choDenKhi(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())

    await act(async () => {
      ;(container.querySelector('[data-testid="quay-lai"]') as HTMLButtonElement).click()
    })

    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-testid="bang-gia"]')).toBeNull()
  })
})
