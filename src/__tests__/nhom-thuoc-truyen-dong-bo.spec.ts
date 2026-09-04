// @vitest-environment happy-dom
//
// Danh mục nhóm thuốc truyền (data/categories.ts) và những chỗ PHẢI đi theo nó.
//
// LỖI ĐÃ SINH RA CỔNG NÀY: commit f516701 ("xóa nhóm thuốc An thần + Thần kinh") chỉ sửa
// data/categories.ts. Hai chỗ khác bị bỏ lại:
//   • `infusionCols` trong App.tsx vẫn khai `sedation`/`neuro`. Vì `infusionCategory()` với id lạ
//     im lặng trả về NHÓM ĐẦU TIÊN, hai dòng đó mở thêm hai collection trỏ vào đúng khoá
//     "customInotropes" của nhóm Co bóp — không hỏng dữ liệu (không ai đọc chúng, và
//     useLocalCollection chỉ ghi khi add/update/remove) nhưng `tsc --noEmit` đỏ ba lỗi.
//   • Không cổng nào trong repo chạy `tsc` (predev/prebuild/pretest chỉ kiểm cây vendor), nên ba
//     lỗi đó sống nguyên một ngày. Vì thế phép canh phải nằm trong `npm test` — cổng DUY NHẤT
//     thật sự chạy — chứ không trông vào trình biên dịch.
//
// Ca cuối canh một hệ quả KHÁC của cùng nhánh dự phòng đó, ở phía người dùng: tab đang mở được nhớ
// trong sessionStorage, mà bản cập nhật ứng dụng có thể gỡ một nhóm ngay giữa phiên trình duyệt
// (service worker nạp bundle mới ở lần tải lại kế tiếp, sessionStorage sống nguyên qua đó). Đo được
// trên trang thật trước khi vá, với giá trị "sedation": tiêu đề màn RỖNG, KHÔNG tab nào sáng, mà
// thân màn vẫn hiện nhóm Co bóp.
import 'fake-indexeddb/auto'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { INFUSION_CATEGORIES, infusionCategory } from '../data/categories'
import { DungThuocScreen } from '../App'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const GOC = join(__dirname, '../..')

describe('danh mục nhóm thuốc truyền — bất biến nội tại', () => {
  it('id, storageKey và backupKey đều duy nhất', () => {
    // storageKey trùng nhau = hai nhóm ghi đè dữ liệu tự nhập của nhau trong localStorage;
    // backupKey trùng nhau = file sao lưu mất một nhóm. Cả hai đều im lặng.
    for (const truong of ['id', 'storageKey', 'backupKey'] as const) {
      const gt = INFUSION_CATEGORIES.map((c) => c[truong])
      expect(new Set(gt).size, `"${truong}" bị trùng: ${gt.join(', ')}`).toBe(gt.length)
    }
  })

  it('infusionCategory() trả đúng nhóm cho mọi id trong danh mục', () => {
    for (const c of INFUSION_CATEGORIES) expect(infusionCategory(c.id).id).toBe(c.id)
  })
})

describe('App.tsx phải khai đúng những nhóm mà danh mục có', () => {
  it('khoá của `infusionCols` khớp danh mục, không thừa không thiếu', () => {
    const nguon = readFileSync(join(GOC, 'src/App.tsx'), 'utf8')
    // Object literal viết tay (luật hook của React cấm gọi hook trong vòng lặp — xem chú thích tại
    // chỗ khai). Cắt từ dòng khai tới dấu `}` đầu tiên đứng một mình ở mức thụt lề của nó.
    const mo = nguon.indexOf('const infusionCols:')
    expect(mo, 'không còn `const infusionCols:` trong App.tsx — sửa phép trích ở đây').toBeGreaterThan(-1)
    const than = nguon.slice(mo, nguon.indexOf('\n  }', mo))
    const khoa = [...than.matchAll(/^\s{4}([A-Za-z]+):\s*useLocalCollection/gm)].map((m) => m[1])

    expect(khoa.length, 'không đọc được khoá nào — hình dạng object đã đổi, sửa phép trích').toBeGreaterThan(0)
    expect([...khoa].sort()).toEqual(INFUSION_CATEGORIES.map((c) => c.id).sort())
  })
})

describe('tab đã lưu trỏ vào một nhóm KHÔNG CÒN TỒN TẠI', () => {
  let container: HTMLDivElement
  let root: Root

  const khong = () => {}
  const props = () =>
    ({
      customAntibiotics: [],
      diseases: [],
      customInfusions: Object.fromEntries(INFUSION_CATEGORIES.map((c) => [c.id, []])),
      onAddAntibiotic: khong,
      onAddInfusion: khong,
      onEditAntibiotic: khong,
      onEditInfusion: khong,
      onDeleteAntibiotic: khong,
      onDeleteInfusion: khong,
    }) as never

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    // DisclaimerGate đặt `inert` lên toàn bộ nội dung nền khi chưa xác nhận — trạng thái cần kiểm ở
    // đây là màn hình BÌNH THƯỜNG (cùng lý do đã ghi ở dungthuoc-hang-tab-ban-phim.spec.ts).
    localStorage.setItem('drtrong:disclaimerAck', '2026-07')
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

  async function mo() {
    await act(async () => {
      root.render(createElement(DungThuocScreen, props()))
    })
  }

  it('rơi về "Kháng sinh" thay vì màn nửa vời không tiêu đề', async () => {
    // Đúng khoá mà lib/uiState.ts dùng: sessionStorage, tiền tố "drtrong:ui:".
    sessionStorage.setItem('drtrong:ui:dungthuoc.tab', JSON.stringify('sedation'))
    await mo()

    const dangChon = [...container.querySelectorAll('[role="tab"]')].filter(
      (t) => t.getAttribute('aria-selected') === 'true',
    )
    expect(dangChon.map((t) => t.textContent), 'phải có ĐÚNG MỘT tab sáng').toEqual(['Kháng sinh'])
    expect(container.textContent).toContain('Kháng sinh theo CrCl')
    // Thân màn KHÔNG được lặng lẽ hiện nhóm đầu tiên: đó là chế độ hỏng đã đo trên trang thật.
    expect(container.textContent, 'không được rơi vào nhóm Co bóp').not.toContain('Thuốc co bóp cơ tim')
  })

  it('tab hợp lệ vẫn được nhớ như cũ', async () => {
    sessionStorage.setItem('drtrong:ui:dungthuoc.tab', JSON.stringify('vasoactive'))
    await mo()
    expect(container.textContent).toContain('Thuốc vận mạch')
  })
})
