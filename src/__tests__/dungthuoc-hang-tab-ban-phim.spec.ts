// @vitest-environment happy-dom
//
// Hàng 10 tab nhóm thuốc của DungThuocScreen khai `role="tablist"` + `role="tab"` + `aria-selected`,
// nhưng KHÔNG có điều hướng bàn phím — mẫu tablist của ARIA APG đòi hai thứ đi cùng nhau:
//   1. Trái/Phải chuyển tab (hàng này cuộn NGANG nên là Trái/Phải, không phải Lên/Xuống),
//   2. roving tabindex — chỉ tab đang chọn nằm trong thứ tự Tab của trình duyệt.
// Thiếu (2), người dùng bàn phím phải bấm Tab qua đủ 10 nút mới ra khỏi hàng; thiếu (1), họ không
// có cách nào khác để đi trong hàng.
//
// Khoản này đến từ nhánh critique DungThuocScreen 2026-08-15 (tag
// `luu/critique-dungthuocscreen-2026-08-15`, task 4) chưa bao giờ được gộp vào `main` — xem
// HANDOFF mục 40.5/41. Bản cũ điều hướng trên `MIXING_TABS` (thứ tự KHAI BÁO); `main` từ đó đã đổi
// sang `orderedTabs` (thứ tự HIỂN THỊ theo tần suất dùng, lib/tabUsage.ts), nên phép kiểm ở đây
// bám đúng thứ tự đang hiện trên màn — không phải thứ tự khai báo.
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { INFUSION_CATEGORIES } from '../data/categories'
import { DungThuocScreen } from '../App'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const khong = () => {}

function props() {
  return {
    customAntibiotics: [],
    diseases: [],
    customInfusions: Object.fromEntries(INFUSION_CATEGORIES.map((c) => [c.id, []])),
    onAddAntibiotic: khong,
    onAddInfusion: khong,
    onEditAntibiotic: khong,
    onEditInfusion: khong,
    onDeleteAntibiotic: khong,
    onDeleteInfusion: khong,
  } as never
}

describe('hàng tab nhóm thuốc — điều hướng bàn phím (ARIA APG tablist)', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    // Tấm phủ miễn trừ trách nhiệm (DisclaimerGate) bẫy focus và đặt `inert` lên toàn bộ nội dung
    // phía sau khi CHƯA xác nhận — đúng thiết kế, và ca kiểm này đã bắt được nó: `.focus()` trên
    // nút tab bị tấm phủ kéo về nút "Tôi đã hiểu". Trạng thái cần kiểm ở đây là màn hình BÌNH
    // THƯỜNG (người dùng chỉ thấy tấm phủ một lần), nên đặt sẵn dấu đã-xác-nhận.
    localStorage.setItem('drtrong:disclaimerAck', '2026-07')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(createElement(DungThuocScreen, props()))
    })
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  /** Các nút tab theo đúng thứ tự đang HIỂN THỊ trên màn. */
  function cacTab(): HTMLButtonElement[] {
    const hang = container.querySelector('[role="tablist"]')
    if (!hang) throw new Error('không thấy hàng tab (role="tablist")')
    return [...hang.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
  }

  function tabDangChon(): HTMLButtonElement {
    const t = cacTab().find((n) => n.getAttribute('aria-selected') === 'true')
    if (!t) throw new Error('không tab nào đang aria-selected')
    return t
  }

  it('roving tabindex: đúng MỘT tab nằm trong thứ tự Tab, và đó là tab đang chọn', () => {
    const tabs = cacTab()
    expect(tabs.length).toBeGreaterThan(1)
    const trongThuTuTab = tabs.filter((t) => t.tabIndex === 0)
    expect(trongThuTuTab).toHaveLength(1)
    expect(trongThuTuTab[0]).toBe(tabDangChon())
    // Mọi nút còn lại phải là -1 TƯỜNG MINH, không phải "không khai" (mặc định của <button> là 0).
    for (const t of tabs) {
      if (t !== trongThuTuTab[0]) expect(t.tabIndex).toBe(-1)
    }
  })

  it('Phải chuyển sang tab kế bên theo thứ tự đang hiển thị, và focus đi theo', async () => {
    const truoc = cacTab()
    const iTruoc = truoc.indexOf(tabDangChon())
    expect(iTruoc).toBeLessThan(truoc.length - 1) // ca này cần còn chỗ để đi sang phải

    await act(async () => {
      truoc[iTruoc].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })

    const sau = cacTab()
    expect(sau.indexOf(tabDangChon())).toBe(iTruoc + 1)
    expect(document.activeElement).toBe(sau[iTruoc + 1])
    expect(sau[iTruoc + 1].tabIndex).toBe(0)
    expect(sau[iTruoc].tabIndex).toBe(-1)
  })

  it('Trái quay lại tab liền trước', async () => {
    const tabs = cacTab()
    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    expect(cacTab().indexOf(tabDangChon())).toBe(1)

    await act(async () => {
      cacTab()[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    })
    expect(cacTab().indexOf(tabDangChon())).toBe(0)
    expect(document.activeElement).toBe(cacTab()[0])
  })

  it('DỪNG ở hai đầu, không chạy vòng tròn', async () => {
    const tabs = cacTab()
    expect(tabs.indexOf(tabDangChon())).toBe(0) // phiên mới: tab đầu đang chọn

    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    })
    // Vòng tròn sẽ nhảy về tab CUỐI — hàng này cuộn ngang và có dải mờ hai mép báo "còn cuộn được",
    // nhảy vòng làm mất đúng tín hiệu đó.
    expect(cacTab().indexOf(tabDangChon())).toBe(0)
  })

  it('chọn tab bằng phím đi CÙNG đường với chạm: cũng đếm vào tần suất dùng', async () => {
    // Không phải chi tiết vặt. Nút tab có onClick làm hai việc ngoài setTab — recordTabUse (thứ tự
    // hàng tab ở ca trực sau, lib/tabUsage.ts) và reset vị trí cuộn của vùng nội dung dùng CHUNG
    // cho mọi tab (thiếu nó thì tab mới thừa hưởng vị trí cuộn của tab cũ, rơi thẳng vào giữa danh
    // sách — đúng lỗi /impeccable critique 2026-08-18 đã vá cho đường chạm). Một nhánh bàn phím
    // riêng chỉ gọi setTab sẽ dựng lại y nguyên lỗi đó cho người dùng bàn phím.
    const tabs = cacTab()
    const idKeTiep = tabs[1].id.replace('mixing-tab-', '')
    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    const dem = JSON.parse(localStorage.getItem('drtrong:tabUsage') ?? '{}') as Record<string, number>
    expect(dem[idKeTiep]).toBe(1)
  })

  it('phím khác (vd Xuống) không đổi tab — hàng cuộn NGANG', async () => {
    const tabs = cacTab()
    const truoc = tabs.indexOf(tabDangChon())
    await act(async () => {
      tabs[truoc].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    expect(cacTab().indexOf(tabDangChon())).toBe(truoc)
  })
})
