// @vitest-environment happy-dom
//
// Lỗi "chạm tay vào thì con trỏ hiện lệch một khoảng" — đo được trên trình duyệt thật 2026-08-29.
//
// BẰNG CHỨNG. Mở một bảng rồi hỏi hai bên cùng một câu:
//   DOM thật  (`.drt-edgeless-viewport`.getBoundingClientRect()) → left 0,  top 0,   375×760
//   BlockSuite (`gfx.viewport`)                                  → left 20, top 200, 184×132
// Mọi lượt chạm đều đi qua `toModelCoord(clientX - _left, clientY - _top)`, nên lệch nguyên khối
// 20px ngang / 200px dọc, cộng sai tỉ lệ. Đo thẳng: chạm tại x=117 thì note ra đời tại x=154.
//
// VÌ SAO SỐ CỦA BLOCKSUITE LÀ SỐ CŨ. `Viewport.setShellElement()` (vendored
// `framework/std/src/gfx/viewport.ts:749-763`) đo `getBoundingClientRect()` ĐÚNG MỘT LẦN lúc gắn,
// rồi từ đó chỉ đo lại khi `ResizeObserver` bắn. Mà `ResizeObserver` theo dõi KÍCH THƯỚC HỘP —
// `transform: scale()/translate()` không đổi kích thước hộp nên nó KHÔNG BAO GIỜ bắn vì transform.
// Bảng lại mount BÊN TRONG lớp bọc đang chạy hiệu ứng FLIP vào màn (`board-flip-run`,
// BoardGallery.tsx) — `getBoundingClientRect()` thì CÓ tính transform. Bảng nào mount kịp trong
// ~380ms transform còn sống sẽ đóng đinh số đo méo đó vĩnh viễn: không có đường nào tự sửa.
// Đúng lớp lỗi "phép đo đúng và phép đo sai chỉ khác nhau lúc nào chụp" đã ghi ở HANDOFF mục 36.
//
// CÁCH VÁ, không đụng vendor: sau khi hiệu ứng kết thúc, so số của BlockSuite với DOM thật; lệch
// thì bảo nó đo lại bằng hai lệnh CÔNG KHAI `clearViewportElement()` + `setShellElement()`.
// `clearViewportElement()` là bắt buộc, không phải cho gọn: nó ngắt `ResizeObserver` cũ, thiếu nó
// thì mỗi lượt đồng bộ để lại một observer rò rỉ vẫn đang theo dõi cùng phần tử.
import { beforeEach, describe, expect, it } from 'vitest'

import { dongBoToaDoNeuLech, ganDongBoToaDoSauHieuUng } from '../dong-bo-toa-do-viewport'

/** Bản nhái tối thiểu của `Viewport` — chỉ bốn số và hai lệnh mà phép vá dùng tới. */
function taoViewportGia(soDo: { left: number; top: number; width: number; height: number }) {
  const v = {
    ...soDo,
    soLanXoa: 0,
    soLanGan: 0,
    ganVoi: null as HTMLElement | null,
    clearViewportElement() {
      v.soLanXoa++
    },
    setShellElement(el: HTMLElement) {
      v.soLanGan++
      v.ganVoi = el
      // Đúng thứ bản thật làm: đo lại từ DOM.
      const r = el.getBoundingClientRect()
      v.left = r.left
      v.top = r.top
      v.width = r.width
      v.height = r.height
    },
  }
  return v
}

function taoPhanTu(r: { left: number; top: number; width: number; height: number }) {
  const el = document.createElement('div')
  el.getBoundingClientRect = () =>
    ({
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      right: r.left + r.width,
      bottom: r.top + r.height,
      x: r.left,
      y: r.top,
      toJSON: () => ({}),
    }) as DOMRect
  return el
}

describe('dongBoToaDoNeuLech', () => {
  it('khớp rồi thì KHÔNG đụng gì — phép vá phải là no-op ở đường bình thường', () => {
    const el = taoPhanTu({ left: 0, top: 0, width: 375, height: 760 })
    const v = taoViewportGia({ left: 0, top: 0, width: 375, height: 760 })
    expect(dongBoToaDoNeuLech(v, el)).toBe(false)
    expect(v.soLanXoa).toBe(0)
    expect(v.soLanGan).toBe(0)
  })

  it('đúng ca thật đã đo: (20,200,184,132) so với (0,0,375,760) → đo lại, số về khớp DOM', () => {
    const el = taoPhanTu({ left: 0, top: 0, width: 375, height: 760 })
    const v = taoViewportGia({ left: 20, top: 200, width: 184, height: 132 })
    expect(dongBoToaDoNeuLech(v, el)).toBe(true)
    expect({ left: v.left, top: v.top, width: v.width, height: v.height }).toEqual({
      left: 0,
      top: 0,
      width: 375,
      height: 760,
    })
  })

  it('LUÔN gọi clearViewportElement TRƯỚC setShellElement — nếu không, mỗi lượt rò một ResizeObserver', () => {
    const el = taoPhanTu({ left: 0, top: 0, width: 375, height: 760 })
    const v = taoViewportGia({ left: 20, top: 200, width: 184, height: 132 })
    dongBoToaDoNeuLech(v, el)
    expect(v.soLanXoa).toBe(1)
    expect(v.soLanGan).toBe(1)
    expect(v.ganVoi).toBe(el)
  })

  it('lệch dưới nửa pixel (làm tròn của trình duyệt) thì bỏ qua, không đo lại vô ích', () => {
    const el = taoPhanTu({ left: 0.2, top: 0, width: 375, height: 760 })
    const v = taoViewportGia({ left: 0, top: 0, width: 375, height: 760 })
    expect(dongBoToaDoNeuLech(v, el)).toBe(false)
  })

  it('chỉ lệch KÍCH THƯỚC (không lệch gốc) cũng phải đo lại', () => {
    const el = taoPhanTu({ left: 0, top: 0, width: 375, height: 760 })
    const v = taoViewportGia({ left: 0, top: 0, width: 184, height: 760 })
    expect(dongBoToaDoNeuLech(v, el)).toBe(true)
  })

  it('phần tử chưa có kích thước (bảng đang tháo) thì KHÔNG đo lại — đóng đinh số 0 còn tệ hơn', () => {
    const el = taoPhanTu({ left: 0, top: 0, width: 0, height: 0 })
    const v = taoViewportGia({ left: 20, top: 200, width: 184, height: 132 })
    expect(dongBoToaDoNeuLech(v, el)).toBe(false)
    expect(v.soLanGan).toBe(0)
  })
})

describe('ganDongBoToaDoSauHieuUng', () => {
  let el: HTMLElement
  let v: ReturnType<typeof taoViewportGia>

  beforeEach(() => {
    document.body.innerHTML = ''
    el = taoPhanTu({ left: 0, top: 0, width: 375, height: 760 })
    document.body.appendChild(el)
    v = taoViewportGia({ left: 20, top: 200, width: 184, height: 132 })
  })

  const gan = (layViewport: () => typeof v | undefined = () => v) =>
    ganDongBoToaDoSauHieuUng({ viewport: el, layViewport })

  it('transitionend của hiệu ứng FLIP → đồng bộ lại', () => {
    const go = gan()
    window.dispatchEvent(new Event('transitionend'))
    expect(v.soLanGan).toBe(1)
    go()
  })

  it('animationend (đường .board-in, bảng mở không có thẻ nguồn) → cũng đồng bộ lại', () => {
    const go = gan()
    window.dispatchEvent(new Event('animationend'))
    expect(v.soLanGan).toBe(1)
    go()
  })

  it('hiệu ứng chạy xong nhiều lần: đã khớp rồi thì lượt sau không đo lại nữa', () => {
    const go = gan()
    window.dispatchEvent(new Event('transitionend'))
    window.dispatchEvent(new Event('transitionend'))
    window.dispatchEvent(new Event('animationend'))
    expect(v.soLanGan).toBe(1)
    go()
  })

  it('bảng chưa dựng xong (chưa có viewport) thì im lặng bỏ qua, không ném', () => {
    const go = gan(() => undefined)
    expect(() => window.dispatchEvent(new Event('transitionend'))).not.toThrow()
    go()
  })

  it('đọc viewport mà ném (API nội bộ vendored đổi hình dạng) thì nuốt, không hỏng thao tác', () => {
    const go = ganDongBoToaDoSauHieuUng({
      viewport: el,
      layViewport: () => {
        throw new Error('gfx chưa sẵn sàng')
      },
    })
    expect(() => window.dispatchEvent(new Event('transitionend'))).not.toThrow()
    go()
  })

  it('gỡ gắn: sự kiện sau đó không còn tác dụng', () => {
    const go = gan()
    go()
    window.dispatchEvent(new Event('transitionend'))
    expect(v.soLanGan).toBe(0)
  })

  it('bắt cả sự kiện của phần tử NGOÀI cây viewport — lớp bọc FLIP là TỔ TIÊN, sự kiện của nó không bao giờ đi qua viewport', () => {
    const go = gan()
    const ngoai = document.createElement('div')
    document.body.appendChild(ngoai)
    ngoai.dispatchEvent(new Event('transitionend', { bubbles: true }))
    expect(v.soLanGan).toBe(1)
    go()
  })
})
