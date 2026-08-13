// Nút "Tải lại trang" của boundary gốc (src/components/ErrorBoundary.tsx) phải đưa người dùng
// RA KHỎI màn hình vừa gây lỗi, không đưa họ quay lại đúng chỗ đó.
//
// Vì sao đây là một ca kiểm chứ không phải một dòng comment: lối tắt PWA `/?screen=mindmap` cài ra
// màn hình chính, App đọc tham số đó lúc mount, và bản `location.reload()` cũ giữ nguyên tham số —
// tức là lỗi ở màn hình đó tạo thành vòng lặp kín, không thoát được trong PWA standalone (không có
// thanh địa chỉ). Một `delete` bị xoá đi trong lúc refactor sẽ đưa vòng lặp đó quay lại mà không
// hề có triệu chứng nào ở bản build.
import { describe, expect, it } from 'vitest'

import { duongDanPhucHoi } from '../components/ErrorBoundary'

describe('duongDanPhucHoi', () => {
  it('gỡ tham số screen — lối tắt PWA không tái hiện được màn hình vừa chết', () => {
    expect(duongDanPhucHoi('https://a.vn/?screen=mindmap')).toBe('https://a.vn/')
  })

  it('giữ nguyên các tham số khác và cả fragment', () => {
    expect(duongDanPhucHoi('https://a.vn/?screen=mindmap&ma=abc#phan-1')).toBe(
      'https://a.vn/?ma=abc#phan-1',
    )
  })

  it('không đụng gì khi URL vốn không có tham số screen', () => {
    expect(duongDanPhucHoi('https://a.vn/trang?ma=abc')).toBe('https://a.vn/trang?ma=abc')
  })
})
