// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import { DanhSachBang } from '../DanhSachBang'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// `act(async () => { await vi.waitFor(() => { expect(...) }) })` — một act() DUY NHẤT bọc ngoài
// toàn bộ vòng lặp poll — TREO VÔ THỜI HẠN khi điều kiện chờ phụ thuộc một cập nhật state React
// (như `loading` của useIdbCollection sau khi idbGetAll xong). Lý do (đã xác nhận bằng cách đọc
// thẳng exports.act trong node_modules/react/cjs/react.development.js, rồi đo thật với hạn tới
// 8000ms vẫn treo): act() chỉ flush hàng đợi cập nhật đã lên lịch SAU KHI promise callback của
// chính nó resolve — nhưng vi.waitFor bên trong không resolve cho tới khi điều kiện (chính là kết
// quả của cú flush đó) trở thành true. Hai bên chờ nhau vô hạn. Mẫu này vẫn ổn ở nơi khác trong dự
// án (edgeless-board-mount.spec.ts) vì ở đó điều kiện chờ là một node DOM do Lit gắn trực tiếp
// (ngoài vòng render/commit của React) — không đụng tới act queue nên không kẹt.
// Khắc phục: chờ qua NHIỀU lượt act() rời nhau, mỗi lượt chỉ ngủ một khoảng ngắn — mỗi lượt tự
// flush xong TRƯỚC KHI lượt sau kiểm tra lại điều kiện.
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

describe('DanhSachBang', () => {
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

  it('rỗng lúc đầu → chỉ hiện thẻ "+"', async () => {
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })
    expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
  })

  it('có sẵn bảng trong metadata (ghi thẳng qua idb.ts, mô phỏng phiên trước) → hiện đúng tên trên thẻ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-1', ten: 'Phác đồ sốc nhiễm khuẩn', taoLuc: bayGio, capNhatLuc: bayGio })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.textContent).toContain('Phác đồ sốc nhiễm khuẩn')
  })

  it('bấm thẻ "+" → gọi onMoBang với id mới NGAY, thẻ mới xuất hiện NGAY (state cục bộ, không đợi IndexedDB)', async () => {
    const onMoBang = vi.fn()
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="tao-bang"]') as HTMLButtonElement).click()
    })

    expect(onMoBang).toHaveBeenCalledTimes(1)
    const idMoi = onMoBang.mock.calls[0][0] as string
    expect(idMoi).toMatch(/^bang-/)
    expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)

    // Bền vững thật xuống IndexedDB xảy ra NỀN (useIdbCollection.add không await idbPut) — chờ
    // bằng vi.waitFor (đọc thẳng bằng idbGetAll, không đụng state React nên không kẹt như trên)
    // thay vì đọc ngay, tránh ca kiểm chập chờn theo tốc độ máy.
    await vi.waitFor(async () => {
      const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
      expect(ds.map((b) => b.id)).toContain(idMoi)
    })
  })

  it('bấm "⋯" rồi "Đổi tên", sửa ô nhập, Enter → tên cập nhật trên thẻ NGAY, rồi trong metadata', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-1', ten: 'Tên cũ', taoLuc: bayGio, capNhatLuc: bayGio })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-bang-1"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="doi-ten-bang-1"]') as HTMLButtonElement).click()
    })

    const input = container.querySelector('[data-testid="input-ten-bang-1"]') as HTMLInputElement
    expect(input).not.toBeNull()

    // happy-dom: gán thẳng input.value = ... không đi qua setter mà React đã vá để theo dõi giá
    // trị (_valueTracker) — onChange do React lắp qua sự kiện 'input' im lặng không bắn (đã xác
    // nhận bằng thực nghiệm: dùng setter gốc của HTMLInputElement.prototype thì tên đổi được ngay,
    // gán thẳng .value thì không). Lấy setter gốc để mô phỏng đúng như người dùng gõ thật.
    const datGiaTriGoc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set

    await act(async () => {
      if (datGiaTriGoc) datGiaTriGoc.call(input, 'Tên mới')
      else input.value = 'Tên mới'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(container.textContent).toContain('Tên mới')

    await vi.waitFor(async () => {
      const ds = await idbGetAll<{ id: string; ten: string }>(IDB_STORES.boards)
      expect(ds.find((b) => b.id === 'bang-1')?.ten).toBe('Tên mới')
    })
  })

  it('mở sửa tên, gõ nháp, Escape (huỷ), rồi mở sửa tên LẦN NỮA → ô nhập hiện đúng tên thật hiện tại, không phải bản nháp đã huỷ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-1', ten: 'Tên thật', taoLuc: bayGio, capNhatLuc: bayGio })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    const moMenuRoiSuaTen = async () => {
      await act(async () => {
        ;(container.querySelector('[data-testid="menu-bang-bang-1"]') as HTMLButtonElement).click()
      })
      await act(async () => {
        ;(container.querySelector('[data-testid="doi-ten-bang-1"]') as HTMLButtonElement).click()
      })
    }

    // Lần 1: mở sửa tên, gõ nháp, rồi Escape — HUỶ, không lưu.
    await moMenuRoiSuaTen()
    const input1 = container.querySelector('[data-testid="input-ten-bang-1"]') as HTMLInputElement
    const datGiaTriGoc1 = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      if (datGiaTriGoc1) datGiaTriGoc1.call(input1, 'Nháp')
      else input1.value = 'Nháp'
      input1.dispatchEvent(new Event('input', { bubbles: true }))
      input1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    // Huỷ đúng nghĩa: tên trên thẻ vẫn là tên thật, KHÔNG phải bản nháp.
    expect(container.textContent).toContain('Tên thật')
    expect(container.textContent).not.toContain('Nháp')

    // Lần 2: mở sửa tên LẠI — ô nhập phải hiện tên THẬT hiện tại, không phải "Nháp" còn sót từ
    // state cục bộ của lần trước (đây chính là lỗi mất-dữ-liệu-im-lặng: nếu ô nhập còn hiện
    // "Nháp" và người dùng lỡ blur ra ngoài, onLuuTen sẽ ghi đè tên thật bằng bản nháp đã huỷ).
    await moMenuRoiSuaTen()
    const input2 = container.querySelector('[data-testid="input-ten-bang-1"]') as HTMLInputElement
    expect(input2.value).toBe('Tên thật')
  })

  it('bấm "⋯" rồi "Xoá" HAI lần liên tiếp → bảng biến mất khỏi lưới NGAY, rồi khỏi metadata', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-1', ten: 'Sẽ bị xoá', taoLuc: bayGio, capNhatLuc: bayGio })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-bang-1"]') as HTMLButtonElement).click()
    })
    const nutXoa = () => container.querySelector('[data-testid="xoa-bang-1"]') as HTMLButtonElement

    // Chạm lần 1: chỉ đổi nhãn, CHƯA xoá.
    await act(async () => {
      nutXoa().click()
    })
    expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    expect(nutXoa().textContent).toContain('Chắc chắn')

    // Chạm lần 2: xoá thật.
    await act(async () => {
      nutXoa().click()
    })
    expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)

    await vi.waitFor(async () => {
      const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
      expect(ds.map((b) => b.id)).not.toContain('bang-1')
    })
  })
})
