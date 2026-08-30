// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'

import { ganMoiBanPhimIOS } from '../ban-phim-ios'

const NAV_IOS = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari', platform: 'iPhone', maxTouchPoints: 5 }
const NAV_DESKTOP = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome', platform: 'Win32', maxTouchPoints: 0 }

let dispose: (() => void) | null = null
let host: HTMLElement | null = null

afterEach(() => {
  dispose?.()
  dispose = null
  host?.remove()
  host = null
})

function dungHost(): HTMLElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

// happy-dom không có hàm dựng TouchEvent — dựng Event trần rồi gắn touches/changedTouches.
function chamEvent(loai: 'touchstart' | 'touchend', x: number, y: number): Event {
  const e = new Event(loai, { bubbles: true, cancelable: true })
  const diem = [{ clientX: x, clientY: y }]
  Object.defineProperty(e, 'touches', { value: loai === 'touchstart' ? diem : [] })
  Object.defineProperty(e, 'changedTouches', { value: diem })
  return e
}

function oMoi(h: HTMLElement): HTMLInputElement | null {
  return h.querySelector('input[aria-hidden="true"][tabindex="-1"]')
}

/** Một cú CHẠM ĐƠN lên `dich`. */
function cham(dich: Element, x = 100, y = 100) {
  dich.dispatchEvent(chamEvent('touchstart', x, y))
  dich.dispatchEvent(chamEvent('touchend', x, y))
}

/** Hai cú chạm liên tiếp cùng chỗ = chạm đôi (cử chỉ vào sửa chữ của edgeless). */
function chamDoi(dich: Element, x = 100, y = 100) {
  cham(dich, x, y)
  cham(dich, x + 1, y + 1)
}

function themCon(h: HTMLElement, html: string): Element {
  const bao = document.createElement('div')
  bao.innerHTML = html
  const el = bao.firstElementChild!
  h.appendChild(el)
  return el
}

describe('ganMoiBanPhimIOS', () => {
  it('ngoài iOS → no-op, không chèn phần tử nào', () => {
    host = dungHost()
    dispose = ganMoiBanPhimIOS(host, NAV_DESKTOP)
    expect(oMoi(host)).toBeNull()
  })

  it('trên iOS → chèn một <input> vô hình vào host, disposer gỡ nó', () => {
    host = dungHost()
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)
    const o = oMoi(host)
    expect(o).not.toBeNull()
    expect(o!.style.opacity).toBe('0')
    expect(o!.style.fontSize).toBe('16px')
    dispose()
    dispose = null
    expect(oMoi(host)).toBeNull()
  })

  it('chạm ĐƠN lên vùng vẽ trống → KHÔNG mồi (chạm đơn chỉ chọn/pan, không mở trình soạn chữ)', () => {
    host = dungHost()
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)
    cham(host)
    expect(document.activeElement).not.toBe(oMoi(host))
  })

  it('chạm ĐÔI lên vùng vẽ → mồi (dblclick là cử chỉ vào sửa chữ của edgeless)', () => {
    host = dungHost()
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)
    chamDoi(host)
    expect(document.activeElement).toBe(oMoi(host))
  })

  it('kéo quá ngưỡng → KHÔNG mồi', () => {
    host = dungHost()
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)
    host.dispatchEvent(chamEvent('touchstart', 100, 100))
    host.dispatchEvent(chamEvent('touchend', 100, 140))
    expect(document.activeElement).not.toBe(oMoi(host))
  })

  // ─── Hồi quy: bàn phím bật lên khi bấm nút KHÔNG liên quan (báo 2026-08-31) ─────────────────
  // Bản mồi đầu tiên mồi cho MỌI cú chạm đơn trong host, mà host chứa cả thanh công cụ, bảng màu,
  // thanh thu phóng — nên bấm bất cứ nút nào cũng thấy bàn phím nhảy lên rồi tụt xuống.

  it('chạm nút trên THANH CÔNG CỤ → KHÔNG mồi', () => {
    host = dungHost()
    const nut = themCon(host, '<edgeless-toolbar><button>Bút</button></edgeless-toolbar>')
      .querySelector('button')!
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)
    cham(nut)
    expect(document.activeElement).not.toBe(oMoi(host))
  })

  it('chạm ĐÔI trên thanh công cụ (bấm nhanh hai lần) → VẪN không mồi', () => {
    host = dungHost()
    const nut = themCon(host, '<edgeless-toolbar><button>Hình</button></edgeless-toolbar>')
      .querySelector('button')!
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)
    chamDoi(nut)
    expect(document.activeElement).not.toBe(oMoi(host))
  })

  it('chạm ô CHỌN MÀU → KHÔNG mồi', () => {
    host = dungHost()
    const o = themCon(host, '<editor-toolbar><edgeless-color-picker-button role="button"></edgeless-color-picker-button></editor-toolbar>')
      .querySelector('[role="button"]')!
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)
    cham(o)
    expect(document.activeElement).not.toBe(oMoi(host))
  })

  it('chạm nút THU PHÓNG / điều hướng qua lại → KHÔNG mồi', () => {
    host = dungHost()
    const nut = themCon(host, '<div class="widgets-container"><button>+</button></div>')
      .querySelector('button')!
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)
    cham(nut)
    expect(document.activeElement).not.toBe(oMoi(host))
  })

  // ─── Những đường VẪN phải mồi (nếu mất, lỗi 1.1 sống lại) ──────────────────────────────────

  it('đang dùng công cụ CHỮ + chạm đơn → mồi (công cụ này tạo chữ bằng một cú chạm)', () => {
    host = dungHost()
    dispose = ganMoiBanPhimIOS(host, NAV_IOS, () => true)
    cham(host)
    expect(document.activeElement).toBe(oMoi(host))
  })

  it('chạm vào đoạn văn trong thẻ ghi chú (contenteditable thật) → mồi', () => {
    host = dungHost()
    const doanVan = themCon(host, '<div contenteditable="true">Sốc nhiễm khuẩn</div>')
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)
    cham(doanVan)
    expect(document.activeElement).toBe(oMoi(host))
  })

  it('sau khi mồi, editor thật nhận focus → phần tử mồi bị bỏ focus', () => {
    host = dungHost()
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    editor.tabIndex = 0
    host.appendChild(editor)
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)

    chamDoi(host, 50, 50)
    expect(document.activeElement).toBe(oMoi(host))

    editor.focus()
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(document.activeElement).toBe(editor)
  })

  it('đang gõ trong editor thật → chạm KHÔNG cướp focus', () => {
    host = dungHost()
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    editor.tabIndex = 0
    host.appendChild(editor)
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)

    editor.focus()
    chamDoi(host, 50, 50)
    expect(document.activeElement).toBe(editor)
  })
})
