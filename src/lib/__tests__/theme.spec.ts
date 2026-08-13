// @vitest-environment happy-dom
//
// Phân giải chủ đề cho bảng vẽ nhúng.
//
// Vì sao ca kiểm này tồn tại: bảng màu vendored của bảng vẽ khoá bản tối vào đúng một bộ chọn
// `[data-theme=dark]`, không có nhánh `prefers-color-scheme` dự phòng. Còn chế độ mặc định của app
// là "auto", nơi applyTheme() CỐ Ý gỡ hẳn data-theme khỏi <html>. Nếu resolveTheme() trả về "auto"
// (hoặc trả "light" trong lúc máy đang tối), thẻ bọc bảng vẽ mang một giá trị không khớp bộ chọn
// nào và bảng vẽ trắng loá giữa một app tối — đúng lỗi mà lượt sửa này chữa.
// Ca kiểm đòi: (1) hai chế độ chốt cứng bỏ qua hệ điều hành, (2) "auto" đi theo hệ điều hành,
// (3) không đối số thì lấy chế độ đang áp, (4) người nghe được báo cả khi người dùng bấm nút lẫn
// khi hệ điều hành lật sáng/tối, (5) huỷ đăng ký thì thôi nhận.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { applyTheme, resolveTheme, watchResolvedTheme, watchSystemTheme } from '../theme'

// Máy đang để nền tối hay không — ca kiểm bật/tắt cờ này để giả lập hệ điều hành.
let mayDangToi = false
// Những callback mà watchSystemTheme() đã gắn vào media query; banHeDieuHanhLat() gọi lại chúng
// đúng như trình duyệt làm khi người dùng lật sáng/tối trong lúc app đang mở.
let ngheMedia: (() => void)[] = []

function gaMatchMedia(query: string) {
  return {
    matches: query.includes('prefers-color-scheme: dark') ? mayDangToi : false,
    media: query,
    addEventListener: (_loai: string, cb: () => void) => {
      ngheMedia.push(cb)
    },
    removeEventListener: (_loai: string, cb: () => void) => {
      ngheMedia = ngheMedia.filter((x) => x !== cb)
    },
  }
}

function heDieuHanhLat(toi: boolean) {
  mayDangToi = toi
  for (const cb of [...ngheMedia]) cb()
}

let boWatchHeDieuHanh: (() => void) | null = null

beforeEach(() => {
  mayDangToi = false
  ngheMedia = []
  ;(window as unknown as { matchMedia: typeof gaMatchMedia }).matchMedia = gaMatchMedia
  // Trạng thái của module là biến toàn cục — đưa về mặc định "auto" trước mỗi ca.
  applyTheme('auto')
  boWatchHeDieuHanh = watchSystemTheme()
})

afterEach(() => {
  boWatchHeDieuHanh?.()
  boWatchHeDieuHanh = null
})

describe('resolveTheme', () => {
  it('chế độ chốt cứng bỏ qua hệ điều hành', () => {
    mayDangToi = true
    expect(resolveTheme('light')).toBe('light')
    mayDangToi = false
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('"auto" đi theo hệ điều hành, và KHÔNG BAO GIỜ trả về chuỗi "auto"', () => {
    mayDangToi = true
    expect(resolveTheme('auto')).toBe('dark')
    mayDangToi = false
    expect(resolveTheme('auto')).toBe('light')
  })

  it('không đối số thì lấy chế độ đang áp', () => {
    applyTheme('dark')
    expect(resolveTheme()).toBe('dark')
    applyTheme('light')
    expect(resolveTheme()).toBe('light')
    mayDangToi = true
    applyTheme('auto')
    expect(resolveTheme()).toBe('dark')
  })
})

describe('watchResolvedTheme', () => {
  it('báo khi người dùng đổi chủ đề trong lúc app đang mở', () => {
    const thay: string[] = []
    const bo = watchResolvedTheme((t) => thay.push(t))
    applyTheme('dark')
    applyTheme('light')
    bo()
    expect(thay).toEqual(['dark', 'light'])
  })

  it('báo khi hệ điều hành lật sáng/tối trong lúc app đang ở "auto"', () => {
    const thay: string[] = []
    const bo = watchResolvedTheme((t) => thay.push(t))
    applyTheme('auto')
    thay.length = 0

    heDieuHanhLat(true)
    heDieuHanhLat(false)

    bo()
    expect(thay).toEqual(['dark', 'light'])
  })

  it('KHÔNG báo khi hệ điều hành lật mà người dùng đã chốt cứng một bản', () => {
    applyTheme('dark')
    const thay: string[] = []
    const bo = watchResolvedTheme((t) => thay.push(t))

    heDieuHanhLat(true)

    bo()
    expect(thay).toEqual([])
  })

  it('huỷ đăng ký thì thôi nhận', () => {
    const thay: string[] = []
    const bo = watchResolvedTheme((t) => thay.push(t))
    bo()
    applyTheme('dark')
    expect(thay).toEqual([])
  })
})
