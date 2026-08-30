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

  it('tap (không kéo) → phần tử mồi nhận focus', () => {
    host = dungHost()
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)
    host.dispatchEvent(chamEvent('touchstart', 100, 100))
    host.dispatchEvent(chamEvent('touchend', 103, 104))
    expect(document.activeElement).toBe(oMoi(host))
  })

  it('kéo quá ngưỡng → KHÔNG mồi', () => {
    host = dungHost()
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)
    host.dispatchEvent(chamEvent('touchstart', 100, 100))
    host.dispatchEvent(chamEvent('touchend', 100, 140))
    expect(document.activeElement).not.toBe(oMoi(host))
  })

  it('sau khi mồi, editor thật nhận focus → phần tử mồi bị bỏ focus', () => {
    host = dungHost()
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    editor.tabIndex = 0
    host.appendChild(editor)
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)

    host.dispatchEvent(chamEvent('touchstart', 50, 50))
    host.dispatchEvent(chamEvent('touchend', 50, 50))
    expect(document.activeElement).toBe(oMoi(host))

    editor.focus()
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    expect(document.activeElement).toBe(editor)
  })

  it('đang gõ trong editor thật → tap KHÔNG cướp focus', () => {
    host = dungHost()
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    editor.tabIndex = 0
    host.appendChild(editor)
    dispose = ganMoiBanPhimIOS(host, NAV_IOS)

    editor.focus()
    host.dispatchEvent(chamEvent('touchstart', 50, 50))
    host.dispatchEvent(chamEvent('touchend', 50, 50))
    expect(document.activeElement).toBe(editor)
  })
})
