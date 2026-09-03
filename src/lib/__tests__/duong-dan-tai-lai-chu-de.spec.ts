// saveTheme() ép tải lại trang khi app chạy PWA standalone (xem lib/theme.ts) — hệ điều hành chỉ
// đọc lại thẻ theme-color lúc MỞ app, không nghe JS sửa nó khi app đang chạy.
//
// Vì sao đây là một ca kiểm: bản `location.reload()` cũ giữ nguyên URL hiện tại, vốn KHÔNG mang
// tham số `?screen=` vì điều hướng trong app chạy bằng state React, không đụng URL. ThemeToggle
// từng chỉ có ở Trang chủ nên việc đó vô hại — tải lại thì initialScreen() đọc URL, không thấy
// `screen`, rơi về "home", mà "home" cũng chính là màn đang đứng. Từ khi ThemeToggle có thêm bản
// inline trong DungThuocScreen (bác sĩ trực đêm đổi chủ đề mà không phải rời màn hình đang xem),
// bấm nút đó trong PWA standalone tải lại trang và initialScreen() vẫn rơi về "home" — bác sĩ đang
// xem "Dùng thuốc" bị đẩy thẳng về Trang chủ. `duongDanTaiLaiChuDe` gắn `?screen=` vào URL trước khi
// tải lại, đúng lối tắt PWA `initialScreen()` đã biết đọc, để trang tải lại xong tự vào lại đúng
// màn hình cũ thay vì rơi về "home".
import { describe, expect, it } from 'vitest'

import { duongDanTaiLaiChuDe } from '../theme'

describe('duongDanTaiLaiChuDe', () => {
  it('không truyền màn hình cần giữ thì trả nguyên URL', () => {
    expect(duongDanTaiLaiChuDe('https://a.vn/')).toBe('https://a.vn/')
  })

  it('gắn tham số screen để initialScreen() đọc lại đúng màn hình sau khi tải lại', () => {
    expect(duongDanTaiLaiChuDe('https://a.vn/', 'mixing')).toBe('https://a.vn/?screen=mixing')
  })

  it('URL đã có tham số khác thì giữ nguyên, chỉ thêm/ghi đè screen', () => {
    expect(duongDanTaiLaiChuDe('https://a.vn/?ma=abc', 'mixing')).toBe(
      'https://a.vn/?ma=abc&screen=mixing',
    )
  })
})
