import { describe, expect, it } from 'vitest'

import { laThietBiIOS } from '../viewport-ios'

describe('laThietBiIOS', () => {
  it('UA iPhone thật → true', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
      }),
    ).toBe(true)
  })

  it('UA iPad khai thẳng "iPad" → true', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        platform: 'iPad',
        maxTouchPoints: 5,
      }),
    ).toBe(true)
  })

  it('iPadOS 13+ giả UA Mac desktop nhưng có đa điểm chạm → true', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe(true)
  })

  it('Mac thật dùng chuột (platform MacIntel, không đa điểm chạm) → false', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      }),
    ).toBe(false)
  })

  it('Windows desktop → false', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        platform: 'Win32',
        maxTouchPoints: 0,
      }),
    ).toBe(false)
  })

  it('Android phone (có đa điểm chạm nhưng platform khác MacIntel) → false', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      }),
    ).toBe(false)
  })

  it('maxTouchPoints vắng mặt trên UA giả-Mac → không ném lỗi, trả false', () => {
    expect(
      laThietBiIOS({
        userAgent: 'Node.js/24',
        platform: 'MacIntel',
      }),
    ).toBe(false)
  })
})
