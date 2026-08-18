import { afterEach, describe, expect, it } from 'vitest'

import { Viewport, viewportRuntimeConfig } from '@blocksuite/affine/std/gfx'

import { apDungViewportChoIOS, laThietBiIOS, type ThongTinThietBi } from '../viewport-ios'

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

const CAU_HINH_GOC = { ...viewportRuntimeConfig }

afterEach(() => {
  Object.assign(viewportRuntimeConfig, CAU_HINH_GOC)
  // Mảng — spread nông ở trên chỉ copy tham chiếu tới CÙNG một mảng gốc, nên phải gán lại một
  // mảng MỚI (bản sao) để ca sau không kế thừa mutation trên mảng cũ. Xem cùng bài học đã ghi ở
  // viewport-runtime-config.spec.ts.
  viewportRuntimeConfig.CANVAS_DPR_CAP_BY_ZOOM = [...CAU_HINH_GOC.CANVAS_DPR_CAP_BY_ZOOM]
})

const NAV_IPAD: ThongTinThietBi = {
  userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
  platform: 'iPad',
  maxTouchPoints: 5,
}

const NAV_WINDOWS: ThongTinThietBi = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  platform: 'Win32',
  maxTouchPoints: 0,
}

describe('apDungViewportChoIOS', () => {
  it('nav iOS → ghi đè cả 4 field vào viewportRuntimeConfig', () => {
    apDungViewportChoIOS(NAV_IPAD)

    expect(viewportRuntimeConfig.SKIP_REFRESH_DURING_GESTURE).toBe(true)
    expect(viewportRuntimeConfig.ZOOM_MIN).toBe(0.3)
    expect(viewportRuntimeConfig.CANVAS_DPR_CAP_BY_ZOOM).toEqual([
      [0.5, 1],
      [1, 2],
    ])
    expect(viewportRuntimeConfig.LOW_ZOOM_GESTURE_ACTIVE_BLOCK_LIMIT).toBe(24)
  })

  it('nav không phải iOS → viewportRuntimeConfig giữ nguyên mặc định thượng nguồn', () => {
    apDungViewportChoIOS(NAV_WINDOWS)

    expect(viewportRuntimeConfig.SKIP_REFRESH_DURING_GESTURE).toBe(false)
    expect(viewportRuntimeConfig.ZOOM_MIN).toBe(0.1)
    expect(viewportRuntimeConfig.CANVAS_DPR_CAP_BY_ZOOM).toEqual([])
    expect(viewportRuntimeConfig.LOW_ZOOM_GESTURE_ACTIVE_BLOCK_LIMIT).toBe(0)
  })

  it('gọi TRƯỚC khi dựng Viewport → instance mới ăn cả field initializer lẫn getter', () => {
    apDungViewportChoIOS(NAV_IPAD)

    const viewport = new Viewport()

    // ZOOM_MIN đọc qua getter động — ăn override dù đọc lúc nào.
    expect(viewport.ZOOM_MIN).toBe(0.3)
    // SKIP_REFRESH_DURING_GESTURE là field initializer — CHỈ ăn nếu override chạy TRƯỚC dòng
    // `new Viewport()` này, đúng thứ ca kiểm này cưỡng chế.
    expect(viewport.SKIP_REFRESH_DURING_GESTURE).toBe(true)
  })

  it('gọi không đối số trong môi trường test (Node thuần) → không ném lỗi, không đổi config', () => {
    expect(() => apDungViewportChoIOS()).not.toThrow()

    expect(viewportRuntimeConfig.SKIP_REFRESH_DURING_GESTURE).toBe(false)
    expect(viewportRuntimeConfig.ZOOM_MIN).toBe(0.1)
  })
})
