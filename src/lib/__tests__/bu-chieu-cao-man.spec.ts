// @vitest-environment happy-dom
//
// `doPhanThieu()` quyết định app có cộng thêm chiều cao vào <body> hay không. Sai ở đây là hỏng bố
// cục toàn app, và LỊCH SỬ ĐÃ CHỨNG MINH: hai lượt đoán con số này trong CSS thuần đều hỏng — một
// lượt cắt mất nửa dưới thanh nav, một lượt để hở dải ở đáy (2026-09-10).
//
// Ca nguy hiểm nhất nằm ở nhánh TRÌNH DUYỆT THƯỜNG: ở đó `screen.height − innerHeight` chính là
// chiều cao thanh địa chỉ + thanh công cụ — một con số lớn và hoàn toàn đúng đắn. Bù nó là đẩy nửa
// trang xuống dưới mép màn hình. Phải trả 0.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { doPhanThieu } from '../buChieuCaoMan'

/** Dựng một môi trường máy giả: đã cài hay chưa, màn hình cao bao nhiêu, khung nhìn cao bao nhiêu. */
function dungMay({ daCai, man, khung }: { daCai: boolean; man: number; khung: number }): void {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: daCai && (q.includes('standalone') || q.includes('fullscreen')),
    media: q,
  }))
  vi.stubGlobal('navigator', { standalone: undefined })
  vi.stubGlobal('screen', { height: man })
  vi.stubGlobal('innerHeight', khung)
}

afterEach(() => vi.unstubAllGlobals())

describe('doPhanThieu', () => {
  it('app đã cài, khung nhìn thiếu 68px ⇒ bù đúng 68', () => {
    dungMay({ daCai: true, man: 912, khung: 844 })
    expect(doPhanThieu()).toBe(68)
  })

  it('app đã cài, khung nhìn đã phủ đủ ⇒ không bù (đây là ca từng CẮT MẤT thanh nav)', () => {
    dungMay({ daCai: true, man: 912, khung: 912 })
    expect(doPhanThieu()).toBe(0)
  })

  // Lớp chặn quan trọng nhất của cả file: trong trình duyệt, chênh lệch đó là thanh địa chỉ.
  it('TRÌNH DUYỆT THƯỜNG ⇒ luôn 0, dù chênh lệch có lớn tới đâu', () => {
    dungMay({ daCai: false, man: 912, khung: 700 })
    expect(doPhanThieu()).toBe(0)
  })

  it('chênh lệch vượt trần 120px ⇒ không bù, thà hở còn hơn đẩy thanh nav khỏi màn hình', () => {
    dungMay({ daCai: true, man: 912, khung: 700 })
    expect(doPhanThieu()).toBe(0)
  })

  it('chênh lệch âm (khung nhìn cao hơn màn hình) ⇒ không bù', () => {
    dungMay({ daCai: true, man: 800, khung: 900 })
    expect(doPhanThieu()).toBe(0)
  })

  it('thiếu số đo (máy không báo screen.height) ⇒ không bù, không ném', () => {
    dungMay({ daCai: true, man: 0, khung: 844 })
    expect(doPhanThieu()).toBe(0)
  })

  it('đúng mốc trần 120px vẫn bù (trần là "vượt quá", không phải "bằng")', () => {
    dungMay({ daCai: true, man: 964, khung: 844 })
    expect(doPhanThieu()).toBe(120)
  })
})
