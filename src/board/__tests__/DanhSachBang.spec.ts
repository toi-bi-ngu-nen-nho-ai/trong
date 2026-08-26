// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SPECIALTIES } from '../../data'
import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../../lib/idb'
import { DanhSachBang, nghiengOnDinh } from '../DanhSachBang'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('nghiengOnDinh', () => {
  it('cùng id → luôn cùng một góc (ổn định qua nhiều lần gọi)', () => {
    expect(nghiengOnDinh('bang-abc')).toBe(nghiengOnDinh('bang-abc'))
  })

  it('góc luôn nằm trong khoảng [-3, 3]', () => {
    const ids = ['bang-1', 'bang-2', 'bang-xyz', 'a', 'bang-' + 'x'.repeat(50)]
    for (const id of ids) {
      const goc = nghiengOnDinh(id)
      expect(goc).toBeGreaterThanOrEqual(-3)
      expect(goc).toBeLessThanOrEqual(3)
    }
  })

  it('id rỗng vẫn trả về một số hữu hạn hợp lệ, không NaN', () => {
    expect(Number.isFinite(nghiengOnDinh(''))).toBe(true)
  })
})

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

  it('rỗng lúc đầu → có lời mời và minh hoạ, KHÔNG chỉ mỗi nút "+" trần', async () => {
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })
    expect(container.textContent).toContain('Bắt đầu một sơ đồ tư duy mới')
    // Nút tạo vẫn đúng testid/aria-label — hai ca kiểm cũ dựa vào đúng hai giá trị này.
    const nut = container.querySelector('[data-testid="tao-bang"]') as HTMLButtonElement
    expect(nut.getAttribute('aria-label')).toBe('Tạo bảng mới')
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

  it('mặt thẻ có class "the-bang-vat", thẻ ngoài có biến CSS --tilt hợp lệ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-1', ten: 'Test nghiêng', taoLuc: bayGio, capNhatLuc: bayGio })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    const nut = container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement
    expect(nut.className).toContain('the-bang-vat')

    const the = container.querySelector('[data-testid="the-bang"]') as HTMLElement
    const tilt = the.style.getPropertyValue('--tilt')
    expect(tilt).toMatch(/^-?\d+(\.\d+)?deg$/)
    expect(tilt).toBe(`${nghiengOnDinh('bang-1')}deg`)
  })

  it('thẻ vừa tạo (taoLuc gần đây) có class "card-plop"; thẻ cũ có class "card-settle"', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-cu', ten: 'Thẻ cũ', taoLuc: bayGio - 10_000, capNhatLuc: bayGio - 10_000 })
    await idbPut(IDB_STORES.boards, { id: 'bang-moi', ten: 'Thẻ mới', taoLuc: bayGio, capNhatLuc: bayGio })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    const cac = Array.from(container.querySelectorAll('[data-testid="the-bang"]')) as HTMLElement[]
    const theCu = cac.find((el) => el.textContent?.includes('Thẻ cũ'))
    const theMoi = cac.find((el) => el.textContent?.includes('Thẻ mới'))
    expect(theCu?.className).toContain('card-settle')
    expect(theMoi?.className).toContain('card-plop')
  })

  it('bấm thẻ "+" → thẻ mới xuất hiện NGAY (state cục bộ, không đợi IndexedDB) VỚI ô đổi tên đã mở sẵn, KHÔNG mở thẳng vào canvas', async () => {
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

    // Trước đây bấm "+" gọi onMoBang() ngay, mở thẳng vào canvas — ba bảng tạo liên tiếp đều dừng ở
    // tên mặc định + ảnh xem trước giống hệt nhau, không phân biệt được trong lưới (critique lượt
    // 2, 2026-08-23). Giờ giữ người dùng lại ở danh sách, mở luôn ô đổi tên cho thẻ vừa tạo.
    expect(onMoBang).not.toHaveBeenCalled()
    expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    const oNhap = container.querySelector('[data-testid^="input-ten-"]') as HTMLInputElement
    expect(oNhap).not.toBeNull()
    expect(oNhap.value).toBe('Bảng chưa đặt tên')
    const idMoi = oNhap.getAttribute('data-testid')!.replace('input-ten-', '')
    expect(idMoi).toMatch(/^bang-/)

    // Bền vững thật xuống IndexedDB xảy ra NỀN (useIdbCollection.add không await idbPut) — chờ
    // bằng vi.waitFor (đọc thẳng bằng idbGetAll, không đụng state React nên không kẹt như trên)
    // thay vì đọc ngay, tránh ca kiểm chập chờn theo tốc độ máy.
    await vi.waitFor(async () => {
      const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
      expect(ds.map((b) => b.id)).toContain(idMoi)
    })
  })

  it('bấm thẻ "+", gõ tên rồi Enter → thoát ô đổi tên, bấm vào thẻ → GỌI onMoBang (mở canvas)', async () => {
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

    const oNhap = container.querySelector('[data-testid^="input-ten-"]') as HTMLInputElement
    // happy-dom: gán thẳng .value không đi qua setter React đã vá (_valueTracker) — dùng setter gốc,
    // cùng kỹ thuật ca kiểm "Đổi tên" ở trên đã dùng.
    const datGiaTriGoc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      if (datGiaTriGoc) datGiaTriGoc.call(oNhap, 'Chẩn đoán phân biệt đau ngực')
      else oNhap.value = 'Chẩn đoán phân biệt đau ngực'
      oNhap.dispatchEvent(new Event('input', { bubbles: true }))
      oNhap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(container.querySelector('[data-testid^="input-ten-"]')).toBeNull()
    expect(container.textContent).toContain('Chẩn đoán phân biệt đau ngực')

    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button.the-bang-vat') as HTMLButtonElement).click()
    })
    expect(onMoBang).toHaveBeenCalledTimes(1)
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

  it('bảng ĐÃ có ảnh xem trước → đổi tên → ảnh xem trước không bị mất (không bị update() đè bằng bản ghi thiếu anhXemTruoc)', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-1',
      ten: 'Tên cũ',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      anhXemTruoc: 'data:image/jpeg;base64,anh-that',
    })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })
    // Trước khi đổi tên: ảnh xem trước đã hiện đúng trên thẻ (không phải ô trống TheTrong).
    expect(container.querySelector('[data-testid="the-bang"] img')?.getAttribute('src')).toBe(
      'data:image/jpeg;base64,anh-that',
    )

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-bang-1"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="doi-ten-bang-1"]') as HTMLButtonElement).click()
    })

    const input = container.querySelector('[data-testid="input-ten-bang-1"]') as HTMLInputElement
    const datGiaTriGoc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      if (datGiaTriGoc) datGiaTriGoc.call(input, 'Tên mới')
      else input.value = 'Tên mới'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(container.textContent).toContain('Tên mới')
    // update() ghi ĐÈ TOÀN BỘ bản ghi bằng { ...bang, ten, capNhatLuc } — `bang` ở đây là snapshot
    // cục bộ CỦA HOOK lúc render này, nếu nó đã có anhXemTruoc thì trường đó phải sống sót nguyên
    // vẹn qua lượt ghi đè, cả trên thẻ NGAY lẫn trong IndexedDB sau đó.
    expect(container.querySelector('[data-testid="the-bang"] img')?.getAttribute('src')).toBe(
      'data:image/jpeg;base64,anh-that',
    )

    await vi.waitFor(async () => {
      const ds = await idbGetAll<{ id: string; ten: string; anhXemTruoc?: string }>(IDB_STORES.boards)
      const sau = ds.find((b) => b.id === 'bang-1')
      expect(sau?.ten).toBe('Tên mới')
      expect(sau?.anhXemTruoc).toBe('data:image/jpeg;base64,anh-that')
    })
  })

  it('bấm "⋯" rồi "Xoá" HAI lần liên tiếp → thẻ trượt ra (card-slide-out) rồi mới biến mất khỏi lưới, rồi được đánh dấu xoá MỀM trong metadata (không bị xoá hẳn)', async () => {
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

    // Chạm lần 2: bắt đầu xoá — thẻ CHƯA biến mất ngay, đang chạy .card-slide-out.
    await act(async () => {
      nutXoa().click()
    })
    const theDangXoa = container.querySelector('[data-testid="the-bang"]') as HTMLElement
    expect(theDangXoa).not.toBeNull()
    expect(theDangXoa.className).toContain('card-slide-out')
    expect(theDangXoa.style.pointerEvents).toBe('none')

    // Sau khoảng chờ animation (400ms, xem XOA_TRE_MS), thẻ mới thật sự biến mất khỏi state + IndexedDB.
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
    }, 3000)

    // Xoá MỀM: bản ghi vẫn còn thật trong IndexedDB (id vẫn có mặt), chỉ được đánh dấu daXoaLuc —
    // khác hành vi cũ (idbDelete thẳng, xoá vĩnh viễn không hoàn tác được).
    await vi.waitFor(async () => {
      const ds = await idbGetAll<{ id: string; daXoaLuc?: number }>(IDB_STORES.boards)
      const bang1 = ds.find((b) => b.id === 'bang-1')
      expect(bang1).not.toBeUndefined()
      expect(bang1?.daXoaLuc).toBeTypeOf('number')
    })
  })

  it('xoá thẻ rồi bấm "Hoàn tác" trong dải xác nhận → thẻ tái xuất hiện trong lưới, daXoaLuc gỡ bỏ khỏi metadata', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-1', ten: 'Xoá rồi hoàn tác', taoLuc: bayGio, capNhatLuc: bayGio })
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
    await act(async () => { nutXoa().click() })
    await act(async () => { nutXoa().click() })

    // Thẻ biến mất khỏi lưới (xoá mềm đã chạy) và dải "Hoàn tác" xuất hiện với đúng tên bảng.
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
    })
    await choDenKhi(() => {
      expect(container.textContent).toContain('Đã xoá')
      expect(container.textContent).toContain('Xoá rồi hoàn tác')
      expect(container.textContent).toContain('Hoàn tác')
    })

    const nutHoanTac = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Hoàn tác') as HTMLButtonElement
    expect(nutHoanTac).not.toBeUndefined()
    await act(async () => {
      nutHoanTac.click()
    })

    // Thẻ tái xuất hiện trong lưới NGAY (state cục bộ, không đợi IndexedDB).
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.textContent).toContain('Xoá rồi hoàn tác')

    await vi.waitFor(async () => {
      const ds = await idbGetAll<{ id: string; daXoaLuc?: number }>(IDB_STORES.boards)
      expect(ds.find((b) => b.id === 'bang-1')?.daXoaLuc).toBeUndefined()
    })
  })

  // "Hoàn tác" là đường phục hồi CUỐI CÙNG — nó phải chịu đúng lớp lỗi mà taoBangMoi/onDoiChuyenKhoa/
  // onLuuTen/onXoaTag đã vá: bảng được khôi phục thật trong IndexedDB nhưng KHÔNG khớp chip lọc đang
  // bật nên vô hình trong lưới, người dùng thấy "Hoàn tác" như không làm gì cả (review cuối nhánh,
  // mục 2 — call site dải toast).
  it('bấm chip lọc khoa KHÁC rồi bấm "Hoàn tác" ở dải toast → bảng khôi phục hiện lại, chip lọc tự về "Tất cả"', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Bảng tim mạch', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })
    await idbPut(IDB_STORES.boards, {
      id: 'b', ten: 'Bảng hô hấp', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'pulmonology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-a"]') as HTMLButtonElement).click()
    })
    const nutXoa = () => container.querySelector('[data-testid="xoa-a"]') as HTMLButtonElement
    await act(async () => { nutXoa().click() })
    await act(async () => { nutXoa().click() })
    await choDenKhi(() => {
      expect(container.textContent).toContain('Đã xoá')
    })

    // Bật chip lọc chuyên khoa KHÁC chuyên khoa của bảng vừa xoá — dải toast vẫn còn.
    await act(async () => {
      ;(container.querySelector('[data-testid="chip-chuyen-khoa-pulmonology"]') as HTMLButtonElement).click()
    })

    const nutHoanTac = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Hoàn tác') as HTMLButtonElement
    expect(nutHoanTac).not.toBeUndefined()
    await act(async () => {
      nutHoanTac.click()
    })

    await choDenKhi(() => {
      expect(container.textContent).toContain('Bảng tim mạch')
    })
    expect(
      (container.querySelector('[data-testid="chip-chuyen-khoa-tat-ca"]') as HTMLButtonElement).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('KHÔNG có bảng nào bị xoá mềm → không hiện nút "Đã xoá gần đây"', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-1', ten: 'Bảng còn sống', taoLuc: bayGio, capNhatLuc: bayGio })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-testid="mo-da-xoa-gan-day"]')).toBeNull()
  })

  // Mô phỏng đúng "vách đá im lặng" mà critique lượt 2 (2026-08-23) phát hiện: dải "Hoàn tác" 5s đã
  // tắt (mô phỏng bằng cách ghi thẳng daXoaLuc vào IndexedDB TRƯỚC khi mount, thay vì đợi 5 giây
  // thật) — bảng vẫn còn thật trong IndexedDB nhưng KHÔNG có toast nào đang hiện. Panel "Đã xoá gần
  // đây" là lưới an toàn duy nhất còn lại để lấy nó về.
  it('bảng đã xoá mềm TỪ TRƯỚC (dải "Hoàn tác" đã tắt) → panel "Đã xoá gần đây" cho phục hồi được', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-mo-coi',
      ten: 'Bảng lỡ mất dải hoàn tác',
      taoLuc: bayGio - 60_000,
      capNhatLuc: bayGio - 60_000,
      daXoaLuc: bayGio - 30_000,
    })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="mo-da-xoa-gan-day"]')).not.toBeNull()
    })
    // Bảng xoá mềm không hiện trong lưới thường, không có toast "Hoàn tác" nào (dải đó chỉ sống
    // trong state cục bộ của phiên vừa xoá, không phục hồi được từ IndexedDB lúc mount).
    expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
    expect(container.querySelector('[data-testid="mo-da-xoa-gan-day"]')?.textContent).toContain('(1)')

    await act(async () => {
      ;(container.querySelector('[data-testid="mo-da-xoa-gan-day"]') as HTMLButtonElement).click()
    })
    expect(container.textContent).toContain('Bảng lỡ mất dải hoàn tác')

    await act(async () => {
      ;(container.querySelector('[data-testid="hoan-tac-gan-day-bang-mo-coi"]') as HTMLButtonElement).click()
    })

    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.querySelector('[data-testid="mo-da-xoa-gan-day"]')).toBeNull()

    await vi.waitFor(async () => {
      const ds = await idbGetAll<{ id: string; daXoaLuc?: number }>(IDB_STORES.boards)
      expect(ds.find((b) => b.id === 'bang-mo-coi')?.daXoaLuc).toBeUndefined()
    })
  })

  it('xoá thẻ A (đang chạy card-slide-out) không đóng menu "⋯" đang mở của thẻ B', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-a', ten: 'Bảng A', taoLuc: bayGio - 20_000, capNhatLuc: bayGio - 20_000 })
    await idbPut(IDB_STORES.boards, { id: 'bang-b', ten: 'Bảng B', taoLuc: bayGio - 10_000, capNhatLuc: bayGio - 10_000 })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    // Mở menu của B trước.
    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-bang-b"]') as HTMLButtonElement).click()
    })
    expect(container.querySelector('[data-testid="doi-ten-bang-b"]')).not.toBeNull()

    // Xoá A (hai chạm) — KHÔNG mở menu của A trước, chỉ thao tác trực tiếp qua state nội bộ bằng
    // đúng luồng UI: mở menu A, chạm Xoá hai lần.
    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-bang-a"]') as HTMLButtonElement).click()
    })
    const nutXoaA = () => container.querySelector('[data-testid="xoa-bang-a"]') as HTMLButtonElement
    await act(async () => { nutXoaA().click() })
    await act(async () => { nutXoaA().click() })

    // Menu của B mở lúc đầu đã bị đóng bởi bước mở-menu-A (đúng hành vi sẵn có: mở menu khác thì
    // đóng menu cũ, dangMoMenuId chỉ giữ MỘT id) — kiểm đúng điều đó, không phải lỗi mới.
    expect(container.querySelector('[data-testid="doi-ten-bang-b"]')).toBeNull()
    // Thẻ B vẫn còn nguyên, không bị ảnh hưởng bởi việc A đang trượt ra.
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.textContent).toContain('Bảng B')
  })

  it('bấm chip một chuyên khoa → chỉ còn bảng đúng chuyên khoa đó trong lưới', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'tim-mach-1', ten: 'Bảng tim mạch', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })
    await idbPut(IDB_STORES.boards, {
      id: 'ho-hap-1', ten: 'Bảng hô hấp', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'pulmonology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    const chipTimMach = container.querySelector('[data-testid="chip-chuyen-khoa-cardiology"]') as HTMLButtonElement
    await act(async () => {
      chipTimMach.click()
    })

    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.textContent).toContain('Bảng tim mạch')
    expect(container.textContent).not.toContain('Bảng hô hấp')
  })

  it('bảng THIẾU chuyenKhoa (bản ghi cũ chưa backfill) → coi như chuyên khoa đầu tiên trong SPECIALTIES', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'cu-1', ten: 'Bảng cũ chưa gắn khoa', taoLuc: bayGio, capNhatLuc: bayGio,
    } as unknown as { id: string; ten: string; taoLuc: number; capNhatLuc: number })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    const chipDauTien = container.querySelector(
      `[data-testid="chip-chuyen-khoa-${SPECIALTIES[0].id}"]`,
    ) as HTMLButtonElement
    await act(async () => {
      chipDauTien.click()
    })

    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
  })

  it('đang lọc theo MỘT chuyên khoa (khác chuyên khoa đầu tiên) → bấm "+" vẫn phải thấy thẻ mới + ô đổi tên (không bị chip lọc cũ nuốt mất)', async () => {
    const bayGio = Date.now()
    // Seed một bảng thuộc chuyên khoa THỨ HAI (không phải SPECIALTIES[0]) — bảng mới tạo luôn được
    // gán chuyenKhoa: SPECIALTIES[0].id, nên nếu chip lọc không tự reset về "Tất cả" khi tạo, thẻ
    // mới sẽ bị chính bộ lọc đang chọn (chuyên khoa thứ hai) loại khỏi lưới ngay khi vừa ghi xong.
    await idbPut(IDB_STORES.boards, {
      id: 'khoa-2-1', ten: 'Bảng khoa thứ hai', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[1].id, tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    const chipKhoa2 = container.querySelector(
      `[data-testid="chip-chuyen-khoa-${SPECIALTIES[1].id}"]`,
    ) as HTMLButtonElement
    await act(async () => {
      chipKhoa2.click()
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="tao-bang"]') as HTMLButtonElement).click()
    })

    // Thẻ mới phải HIỆN RA ngay (2 thẻ trong lưới) với ô đổi tên đã mở sẵn — không bị chip lọc cũ
    // (chuyên khoa thứ hai) âm thầm nuốt mất thẻ vừa tạo (chuyenKhoa mặc định là SPECIALTIES[0].id).
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })
    expect(container.querySelector('[data-testid^="input-ten-"]')).not.toBeNull()
  })

  it('bảng CHƯA có anhXemTruoc → huy hiệu chuyên khoa khớp bang.chuyenKhoa', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-khoa-1', ten: 'Bảng tim mạch', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    const huyHieu = container.querySelector('[data-testid="the-bang"] [data-testid="huy-hieu-chuyen-khoa"]')
    expect(huyHieu).not.toBeNull()
    expect(huyHieu?.getAttribute('data-khoa')).toBe('cardiology')
  })

  it('đổi chuyên khoa qua popover "Chuyên khoa/tag" → huy hiệu đổi theo NGAY, không cần mở lại thẻ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-khoa-2', ten: 'Bảng chờ đổi khoa', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="menu-bang-bang-khoa-2"]')).not.toBeNull()
    })

    expect(
      container.querySelector('[data-testid="the-bang"] [data-testid="huy-hieu-chuyen-khoa"]')?.getAttribute('data-khoa'),
    ).toBe('cardiology')

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-bang-khoa-2"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-bang-khoa-2"]') as HTMLButtonElement).click()
    })
    const chon = container.querySelector('[data-testid="chon-chuyen-khoa-bang-khoa-2"]') as HTMLSelectElement
    await act(async () => {
      chon.value = 'pulmonology'
      chon.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(
      container.querySelector('[data-testid="the-bang"] [data-testid="huy-hieu-chuyen-khoa"]')?.getAttribute('data-khoa'),
    ).toBe('pulmonology')
  })

  it('bảng THIẾU chuyenKhoa (bản ghi cũ) → huy hiệu coi như chuyên khoa đầu tiên, không NHẢY xuống icon mặc định', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-khoa-cu', ten: 'Bảng cũ', taoLuc: bayGio, capNhatLuc: bayGio })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    const huyHieu = container.querySelector('[data-testid="the-bang"] [data-testid="huy-hieu-chuyen-khoa"]')
    expect(huyHieu?.getAttribute('data-khoa')).toBe(SPECIALTIES[0].id)
  })

  it('bảng ĐÃ có anhXemTruoc (ảnh thật) → KHÔNG hiện huy hiệu, tránh đè lên nét vẽ thật', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-co-anh', ten: 'Bảng có ảnh', taoLuc: bayGio, capNhatLuc: bayGio,
      anhXemTruoc: 'data:image/png;base64,iVBORw0KGgo=', chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"] img')).not.toBeNull()
    })

    expect(container.querySelector('[data-testid="the-bang"] [data-testid="huy-hieu-chuyen-khoa"]')).toBeNull()
  })

  it('lưới rỗng toàn bộ, CHƯA lọc chuyên khoa → huy hiệu trung tính (data-khoa rỗng)', async () => {
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })

    // Lưới hoàn toàn không có bảng nào → dải chip lọc chuyên khoa cũng không render (gate cùng
    // điều kiện `danhSach.filter(...).length > 0` với ô tìm, xem DanhSachBang.tsx) — huy hiệu ở
    // trạng thái rỗng vẫn phải render, chỉ là trung tính (không có chip nào để lọc theo).
    const huyHieu = container.querySelector('[data-testid="huy-hieu-chuyen-khoa"]')
    expect(huyHieu).not.toBeNull()
    expect(huyHieu?.getAttribute('data-khoa')).toBe('')
  })

  it('lưới rỗng do LỌC hết (chip chuyên khoa) → huy hiệu đổi theo chip đang chọn', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-khoa-khac', ten: 'Bảng tim mạch', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="chip-chuyen-khoa-pulmonology"]')).not.toBeNull()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="chip-chuyen-khoa-pulmonology"]') as HTMLButtonElement).click()
    })

    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
    })

    const huyHieu = container.querySelector('[data-testid="huy-hieu-chuyen-khoa"]')
    expect(huyHieu?.getAttribute('data-khoa')).toBe('pulmonology')
  })
})

describe('DanhSachBang — sửa chuyên khoa/tag', () => {
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

  it('mở menu "⋯" → bấm "Chuyên khoa/tag" → đổi select → ghi ngay vào IndexedDB', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'b1', ten: 'Bảng A', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="menu-bang-b1"]')).not.toBeNull()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-b1"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-b1"]') as HTMLButtonElement).click()
    })

    const chon = container.querySelector('[data-testid="chon-chuyen-khoa-b1"]') as HTMLSelectElement
    expect(chon.value).toBe('cardiology')

    await act(async () => {
      chon.value = 'pulmonology'
      chon.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const ds = await idbGetAll<{ id: string; chuyenKhoa: string }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'b1')?.chuyenKhoa).toBe('pulmonology')
  })

  // Panel sửa (dangSuaTag) và menu "⋯" (dangMoMenu) cùng ghim `top:30 right:4` với cùng zIndex —
  // panel render SAU trong DOM nên luôn vẽ ĐÈ lên menu. Nếu mở menu không xoá dangSuaTagId thì mục
  // "Chuyên khoa/tag" (đường DUY NHẤT đóng panel, vì nó là toggle) nằm bên dưới panel, không bấm
  // tới được nữa: panel mở ra là kẹt vĩnh viễn cho tới khi thẻ unmount (review cuối nhánh, mục 1).
  it('panel "Chuyên khoa/tag" đang mở → bấm "⋯" đóng panel, menu hiện lại bấm được', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'b5', ten: 'Bảng E', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id, tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="menu-bang-b5"]')).not.toBeNull()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-b5"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-b5"]') as HTMLButtonElement).click()
    })
    expect(container.querySelector('[data-testid="sua-chuyen-khoa-tag-b5"]')).not.toBeNull()

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-b5"]') as HTMLButtonElement).click()
    })

    expect(container.querySelector('[data-testid="sua-chuyen-khoa-tag-b5"]')).toBeNull()
    expect(container.querySelector('[data-testid="sua-tag-b5"]')).not.toBeNull()
  })

  // <label> trong panel là nhãn TRẦN (không htmlFor, control không có id) — trình đọc màn hình
  // không nối được nhãn với ô nào cả, cả select lẫn input đọc ra là "không tên". Cùng mức chăm sóc
  // a11y mà file này đã áp cho ô tìm ("Tìm kiếm bảng"), nút × ("Xoá tag …"), ô đổi tên ("Đổi tên
  // bảng") — review cuối nhánh, mục 4.
  it('select chuyên khoa và ô nhập tag trong panel có nhãn truy cập', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'b6', ten: 'Bảng F', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id, tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="menu-bang-b6"]')).not.toBeNull()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-b6"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-b6"]') as HTMLButtonElement).click()
    })

    expect(
      (container.querySelector('[data-testid="chon-chuyen-khoa-b6"]') as HTMLSelectElement).getAttribute('aria-label'),
    ).toBe('Chuyên khoa')
    expect(
      (container.querySelector('[data-testid="nhap-tag-b6"]') as HTMLInputElement).getAttribute('aria-label'),
    ).toBe('Thêm tag')
  })

  it('nhập tag rồi Enter → thêm vào danh sách tag, ghi IndexedDB; bấm × → xoá tag', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'b2', ten: 'Bảng B', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id, tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="menu-bang-b2"]')).not.toBeNull()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-b2"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-b2"]') as HTMLButtonElement).click()
    })

    const oNhap = container.querySelector('[data-testid="nhap-tag-b2"]') as HTMLInputElement
    // happy-dom: gán thẳng .value không đi qua setter React đã vá (_valueTracker) — onChange im
    // lặng không bắn (cùng vướng mắc đã ghi chú ở các ca kiểm "Đổi tên" phía trên). Dùng setter gốc
    // của HTMLInputElement.prototype để mô phỏng đúng như người dùng gõ thật.
    const datGiaTriGoc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      if (datGiaTriGoc) datGiaTriGoc.call(oNhap, 'suy tim')
      else oNhap.value = 'suy tim'
      oNhap.dispatchEvent(new Event('input', { bubbles: true }))
      oNhap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    await choDenKhi(() => {
      expect(container.querySelector('[aria-label="Xoá tag suy tim"]')).not.toBeNull()
    })
    let ds = await idbGetAll<{ id: string; tags: string[] }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'b2')?.tags).toEqual(['suy tim'])

    const nutXoa = container.querySelector('[aria-label="Xoá tag suy tim"]') as HTMLButtonElement
    await act(async () => {
      nutXoa.click()
    })
    await choDenKhi(() => {
      expect(container.querySelector('[aria-label="Xoá tag suy tim"]')).toBeNull()
    })
    ds = await idbGetAll<{ id: string; tags: string[] }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'b2')?.tags).toEqual([])
  })

  // Cùng lớp lỗi review Task 2 đã bắt ở taoBangMoi (tạo bảng mới trong khi chip lọc đang chọn một
  // chuyên khoa KHÁC khiến thẻ vừa tạo biến mất khỏi lưới ngay lập tức) — ở đây là ĐỔI chuyên khoa
  // của một bảng đang hiển thị dưới chip lọc. Không reset chip lọc thì cả thẻ lẫn panel đang mở sẽ
  // unmount NGAY khi update() chạy, không một lời giải thích.
  it('đang lọc theo chuyên khoa A, đổi chuyên khoa của bảng đang xem sang khoa B → panel không biến mất, chip lọc tự về "Tất cả"', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'b3', ten: 'Bảng lọc', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id, tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector(`[data-testid="chip-chuyen-khoa-${SPECIALTIES[0].id}"]`)).not.toBeNull()
    })

    // Bật chip lọc đúng chuyên khoa hiện tại của b3 trước — b3 vẫn hiện.
    await act(async () => {
      ;(container.querySelector(`[data-testid="chip-chuyen-khoa-${SPECIALTIES[0].id}"]`) as HTMLButtonElement).click()
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-b3"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-b3"]') as HTMLButtonElement).click()
    })
    expect(container.querySelector('[data-testid="sua-chuyen-khoa-tag-b3"]')).not.toBeNull()

    const chon = container.querySelector('[data-testid="chon-chuyen-khoa-b3"]') as HTMLSelectElement
    await act(async () => {
      chon.value = SPECIALTIES[1].id
      chon.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Thẻ KHÔNG biến mất khỏi lưới, panel sửa vẫn còn mở — chip lọc tự trả về "Tất cả".
    expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    expect(container.querySelector('[data-testid="sua-chuyen-khoa-tag-b3"]')).not.toBeNull()
    expect(
      (container.querySelector('[data-testid="chip-chuyen-khoa-tat-ca"]') as HTMLButtonElement).getAttribute(
        'aria-pressed',
      ),
    ).toBe('true')

    const ds = await idbGetAll<{ id: string; chuyenKhoa: string }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'b3')?.chuyenKhoa).toBe(SPECIALTIES[1].id)
  })

  // Invariant có sẵn từ commit ddcf250: capNhatLuc CHỈ bump khi có sửa NỘI DUNG thật (onLuuTen đã
  // tuân theo, xem nhánh `if (tenSach === bang.ten) return` phía trên). Đổi chuyên khoa/tag CŨNG là
  // sửa nội dung thật theo đúng nghĩa đó — review lượt 1 (2026-08-24) bắt đúng chỗ ba callback này
  // thiếu dòng bump, khác hẳn onLuuTen ngay cạnh chúng trong cùng file.
  it('đổi chuyên khoa, thêm tag, xoá tag → capNhatLuc bump lên mới hơn sau MỖI thao tác', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'b4', ten: 'Bảng D', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id, tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="menu-bang-b4"]')).not.toBeNull()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-b4"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-b4"]') as HTMLButtonElement).click()
    })

    // 1) Đổi chuyên khoa — capNhatLuc phải bump so với bayGio.
    await new Promise((r) => setTimeout(r, 2))
    const chon = container.querySelector('[data-testid="chon-chuyen-khoa-b4"]') as HTMLSelectElement
    await act(async () => {
      chon.value = SPECIALTIES[1].id
      chon.dispatchEvent(new Event('change', { bubbles: true }))
    })
    let ds = await idbGetAll<{ id: string; capNhatLuc: number }>(IDB_STORES.boards)
    const sauDoiKhoa = ds.find((b) => b.id === 'b4')!.capNhatLuc
    expect(sauDoiKhoa).toBeGreaterThan(bayGio)

    // 2) Thêm tag — capNhatLuc phải bump tiếp so với mốc trên.
    await new Promise((r) => setTimeout(r, 2))
    const oNhap = container.querySelector('[data-testid="nhap-tag-b4"]') as HTMLInputElement
    const datGiaTriGoc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      if (datGiaTriGoc) datGiaTriGoc.call(oNhap, 'khó thở')
      else oNhap.value = 'khó thở'
      oNhap.dispatchEvent(new Event('input', { bubbles: true }))
      oNhap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[aria-label="Xoá tag khó thở"]')).not.toBeNull()
    })
    ds = await idbGetAll<{ id: string; capNhatLuc: number }>(IDB_STORES.boards)
    const sauThemTag = ds.find((b) => b.id === 'b4')!.capNhatLuc
    expect(sauThemTag).toBeGreaterThan(sauDoiKhoa)

    // 3) Xoá tag — capNhatLuc phải bump tiếp so với mốc trên.
    await new Promise((r) => setTimeout(r, 2))
    const nutXoa = container.querySelector('[aria-label="Xoá tag khó thở"]') as HTMLButtonElement
    await act(async () => {
      nutXoa.click()
    })
    await choDenKhi(() => {
      expect(container.querySelector('[aria-label="Xoá tag khó thở"]')).toBeNull()
    })
    ds = await idbGetAll<{ id: string; capNhatLuc: number }>(IDB_STORES.boards)
    const sauXoaTag = ds.find((b) => b.id === 'b4')!.capNhatLuc
    expect(sauXoaTag).toBeGreaterThan(sauThemTag)
  })
})

describe('DanhSachBang — ô tìm kiếm nội bộ', () => {
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

  // happy-dom: gán thẳng `.value` KHÔNG đi qua setter React đã vá (_valueTracker) nên onChange im
  // lặng không bắn — cùng vướng mắc đã ghi chú ở các ca kiểm "Đổi tên"/"nhập tag" phía trên. Gom
  // lại thành một hàm để mọi ca kiểm dưới đây gõ đúng như người dùng thật.
  async function goVaoOTim(o: HTMLInputElement, chu: string) {
    const datGiaTriGoc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      if (datGiaTriGoc) datGiaTriGoc.call(o, chu)
      else o.value = chu
      o.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  it('gõ tên bảng → chỉ còn bảng khớp trong lưới', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Suy tim EF giảm', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })
    await idbPut(IDB_STORES.boards, {
      id: 'b', ten: 'Hen phế quản', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'pulmonology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    const oTim = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    expect(oTim).not.toBeNull()
    await goVaoOTim(oTim, 'suy tim')

    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.textContent).toContain('Suy tim EF giảm')
    expect(container.textContent).not.toContain('Hen phế quản')
  })

  it('gõ không dấu / khác hoa-thường vẫn khớp; xoá trắng truy vấn → mọi bảng trở lại', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Suy tim EF giảm', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })
    await idbPut(IDB_STORES.boards, {
      id: 'b', ten: 'Hen phế quản', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'pulmonology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    const oTim = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    await goVaoOTim(oTim, 'HEN PHE QUAN')
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.textContent).toContain('Hen phế quản')

    // Truy vấn rỗng = trạng thái "chưa lọc" (bangKhopTimKiem trả true) — không được kẹt ở kết quả cũ.
    await goVaoOTim(oTim, '')
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })
  })

  it('gõ tag → khớp bảng mang tag đó, dù tên bảng không chứa chữ nào của truy vấn', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Bảng một', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id, tags: ['khó thở kịch phát'], noiDungTimKiem: '',
    })
    await idbPut(IDB_STORES.boards, {
      id: 'b', ten: 'Bảng hai', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id, tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    await goVaoOTim(container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement, 'kich phat')
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.textContent).toContain('Bảng một')
  })

  // Ô tìm phải SỐNG SÓT qua lượt render không còn kết quả nào — nếu nó bị gắn vào nhánh
  // `danhSachSapXep.length === 0` (nhánh rỗng) thì gõ tới ký tự không khớp sẽ unmount chính ô đang
  // gõ: mất focus giữa chừng, không xoá bớt ký tự để quay lại được. Cổng riêng vì đây là cái bẫy
  // duy nhất khiến tính năng này hỏng hẳn trên máy thật mà vẫn "xanh" ở các ca kiểm đếm thẻ trên.
  it('gõ truy vấn KHÔNG khớp bảng nào → lưới rỗng nhưng ô tìm vẫn còn, vẫn giữ nguyên chữ đã gõ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Suy tim EF giảm', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    const oTim = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    await goVaoOTim(oTim, 'khong co gi khop')
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
    })

    const oTimSau = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    expect(oTimSau).not.toBeNull()
    expect(oTimSau.value).toBe('khong co gi khop')
  })

  // Cùng lớp lỗi mà taoBangMoi() đã phải vá cho chip lọc chuyên khoa (xem chú thích ở
  // DanhSachBang.tsx): bảng mới luôn tên "Bảng chưa đặt tên", nên nếu ô tìm còn giữ truy vấn cũ thì
  // thẻ vừa tạo KHÔNG khớp và biến mất ngay khi vừa ghi xong — bấm "+" trông như không phản ứng gì,
  // trong khi một bản ghi mồ côi đã lặng lẽ vào IndexedDB.
  it('đang gõ tìm kiếm → bấm "+" vẫn phải thấy thẻ mới + ô đổi tên (ô tìm tự xoá trắng)', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Hen phế quản', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'pulmonology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    const oTim = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    await goVaoOTim(oTim, 'hen')
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="tao-bang"]') as HTMLButtonElement).click()
    })

    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })
    expect(container.querySelector('[data-testid^="input-ten-"]')).not.toBeNull()
    expect((container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement).value).toBe('')
  })

  it('ô tìm chỉ hiện khi đã có ít nhất một bảng — lưới rỗng hoàn toàn thì không hiện', async () => {
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-testid="tim-kiem-bang"]')).toBeNull()
  })

  it('ô tìm có nhãn truy cập và vùng chạm tối thiểu 44px', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Bảng bất kỳ', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id, tags: [], noiDungTimKiem: '',
    })
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tim-kiem-bang"]')).not.toBeNull()
    })

    const oTim = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    expect(oTim.getAttribute('aria-label')).toBe('Tìm kiếm bảng')
    expect(oTim.className).toContain('mind-focus-ring')
    // happy-dom không dựng layout thật (getBoundingClientRect trả 0) — kiểm thẳng style nội tuyến,
    // đúng thứ quyết định chiều cao vùng chạm trên máy thật.
    expect(parseFloat(oTim.style.minHeight)).toBeGreaterThanOrEqual(44)
  })

  // Ca TỆ NHẤT của lớp lỗi "bảng rớt khỏi bộ lọc giữa chừng thao tác": truy vấn chỉ khớp NHỜ một
  // tag, người dùng mở panel sửa tag rồi bấm × đúng cái tag đó. Không vá thì update() làm bảng thôi
  // khớp truyVan ngay CÙNG lượt render — thẻ rớt khỏi lưới kéo theo chính panel đang mở (dangSuaTag)
  // unmount ngay dưới con trỏ. taoBangMoi() và onDoiChuyenKhoa (chip lọc) đã vá lớp lỗi này rồi,
  // onXoaTag thì chưa.
  it('truy vấn chỉ khớp nhờ MỘT tag → bấm × xoá đúng tag đó khi panel sửa đang mở: thẻ + panel không biến mất, ô tìm tự xoá trắng', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Bảng một', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id, tags: ['kịch phát'], noiDungTimKiem: '',
    })
    await idbPut(IDB_STORES.boards, {
      id: 'b', ten: 'Bảng hai', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id, tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    const oTim = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    await goVaoOTim(oTim, 'kich phat')
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-a"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-a"]') as HTMLButtonElement).click()
    })
    expect(container.querySelector('[data-testid="sua-chuyen-khoa-tag-a"]')).not.toBeNull()

    await act(async () => {
      ;(container.querySelector('[aria-label="Xoá tag kịch phát"]') as HTMLButtonElement).click()
    })

    // Thẻ vẫn còn trong lưới và panel sửa vẫn mở — truy vấn tự xoá trắng nên bảng không bị lọc ra.
    expect(container.textContent).toContain('Bảng một')
    expect(container.querySelector('[data-testid="sua-chuyen-khoa-tag-a"]')).not.toBeNull()
    expect((container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement).value).toBe('')

    const ds = await idbGetAll<{ id: string; tags: string[] }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'a')?.tags).toEqual([])
  })

  // onDoiChuyenKhoa đã vá cho chip lọc (chuyenKhoaLoc) từ review Task 2 nhưng KHÔNG vá cho ô tìm.
  // bangKhopTimKiem so khớp cả TÊN HIỂN THỊ của chuyên khoa (boardMeta.ts) nên truy vấn "tim mach"
  // khớp được bảng khoa Tim mạch — đổi sang khoa khác là thẻ lẫn panel biến mất y hệt ca chip lọc.
  it('truy vấn chỉ khớp nhờ TÊN CHUYÊN KHOA → đổi chuyên khoa khi panel sửa đang mở: thẻ + panel không biến mất, ô tìm tự xoá trắng', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Bảng X', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })
    await idbPut(IDB_STORES.boards, {
      id: 'b', ten: 'Bảng Y', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'pulmonology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    const oTim = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    await goVaoOTim(oTim, 'tim mach')
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.textContent).toContain('Bảng X')

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-a"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-a"]') as HTMLButtonElement).click()
    })

    const chon = container.querySelector('[data-testid="chon-chuyen-khoa-a"]') as HTMLSelectElement
    await act(async () => {
      chon.value = 'pulmonology'
      chon.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(container.textContent).toContain('Bảng X')
    expect(container.querySelector('[data-testid="sua-chuyen-khoa-tag-a"]')).not.toBeNull()
    expect((container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement).value).toBe('')
  })

  // Nhẹ hơn hai ca trên (ô đổi tên đã tự đóng trước khi update chạy nên không có panel nào bị giật
  // mất) nhưng vẫn là "vừa lưu xong thì thẻ biến mất": đổi tên ra ngoài truy vấn đang gõ.
  it('đổi tên bảng ra NGOÀI truy vấn đang lọc → thẻ vừa đổi tên không biến mất, ô tìm tự xoá trắng', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Suy tim EF giảm', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'pulmonology', tags: [], noiDungTimKiem: '',
    })
    await idbPut(IDB_STORES.boards, {
      id: 'b', ten: 'Hen phế quản', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'pulmonology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    const oTim = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    await goVaoOTim(oTim, 'suy tim')
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-a"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="doi-ten-a"]') as HTMLButtonElement).click()
    })

    const oTen = container.querySelector('[data-testid="input-ten-a"]') as HTMLInputElement
    const datGiaTriGoc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      if (datGiaTriGoc) datGiaTriGoc.call(oTen, 'Viêm phổi cộng đồng')
      else oTen.value = 'Viêm phổi cộng đồng'
      oTen.dispatchEvent(new Event('input', { bubbles: true }))
      oTen.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(container.textContent).toContain('Viêm phổi cộng đồng')
    expect((container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement).value).toBe('')
  })

  // Call site thứ hai của "Hoàn tác" (panel "Đã xoá gần đây") — cùng lỗ hổng với dải toast: bảng
  // khôi phục xong nhưng không khớp truy vấn đang gõ nên vẫn vô hình, nút trông như bấm hụt (review
  // cuối nhánh, mục 2).
  it('đang gõ tìm kiếm → bấm "Hoàn tác" trong panel "Đã xoá gần đây": bảng khôi phục hiện lại, ô tìm tự xoá trắng', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Suy tim EF giảm', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })
    await idbPut(IDB_STORES.boards, {
      id: 'b', ten: 'Hen phế quản', taoLuc: bayGio - 60_000, capNhatLuc: bayGio - 60_000,
      daXoaLuc: bayGio - 30_000,
      chuyenKhoa: 'pulmonology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    const oTim = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    await goVaoOTim(oTim, 'suy tim')
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="mo-da-xoa-gan-day"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="hoan-tac-gan-day-b"]') as HTMLButtonElement).click()
    })

    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })
    expect(container.textContent).toContain('Hen phế quản')
    expect((container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement).value).toBe('')
  })

  // Lưới rỗng vì bộ lọc KHÔNG phải lưới rỗng vì chưa có bảng nào: mời "Bắt đầu một sơ đồ tư duy
  // mới" ở đây vừa sai sự thật (bảng vẫn còn đó, chỉ bị lọc) vừa dẫn người dùng đi tạo bảng thừa
  // thay vì sửa truy vấn (review cuối nhánh, mục 7).
  it('lưới rỗng vì truy vấn không khớp → hiện thông báo không tìm thấy, KHÔNG phải lời mời tạo bảng đầu tiên', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Suy tim EF giảm', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    await goVaoOTim(container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement, 'khong co gi khop')
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
    })

    expect(container.textContent).toContain('Không tìm thấy bảng nào khớp')
    expect(container.textContent).not.toContain('Bắt đầu một sơ đồ tư duy mới')
  })

  // Cùng nhánh copy, nhưng nguyên nhân là chip lọc chứ không phải ô tìm — cả hai đều phải kích hoạt
  // thông báo "không khớp", nếu không thì lọc theo một khoa chưa có bảng nào cũng ra lời mời sai.
  it('lưới rỗng vì chip lọc chuyên khoa → hiện thông báo không tìm thấy', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Bảng tim mạch', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="chip-chuyen-khoa-pulmonology"]') as HTMLButtonElement).click()
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
    })

    expect(container.textContent).toContain('Không tìm thấy bảng nào khớp')
    expect(container.textContent).not.toContain('Bắt đầu một sơ đồ tư duy mới')
  })
})
