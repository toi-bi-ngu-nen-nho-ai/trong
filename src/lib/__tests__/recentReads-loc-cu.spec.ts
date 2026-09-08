// @vitest-environment happy-dom
//
// Giai đoạn 8 (Task 6/7) gỡ hẳn ba hệ đọc bài cũ — bài viết dựng sẵn (kind "article"), bài viết tự
// nhập (kind "custom") và bài học ECG (kind "ecg" — Task 7). Bản ghi "Đã đọc gần đây" của ba kind đó VẪN
// NẰM trong localStorage của mọi máy đã dùng app trước đợt xoá; nếu `loadRecentReads()` trả chúng
// về thì panel Trang chủ hiện ra những dòng bấm vào KHÔNG mở được gì (spec §3.6 — "không hiện ra
// dưới dạng mục chết"). Ca kiểm này ghim đúng hành vi LỌC đó, đi qua đường thật (localStorage →
// loadRecentReads), không gọi tắt `isEntry`.
//
// Pragma happy-dom vì lý do đã ghi ở recentReads-muc.spec.ts: môi trường mặc định của bộ test là
// 'node', không có `localStorage` toàn cục, và recentReads.ts nuốt lỗi bằng try/catch nên ca kiểm
// sẽ đỏ SAI LÝ DO thay vì vì `ReadKind` chưa thu hẹp.
import { beforeEach, describe, expect, it } from 'vitest'

import { loadRecentReads, recordRead } from '../recentReads'

// storage.ts gắn tiền tố NAMESPACE "drtrong:" cho mọi khoá (xem storageKey) — viết thẳng
// 'recentReads' là ghi vào một khoá KHÁC, loadRecentReads() đọc không ra và ca kiểm đỏ sai lý do.
const KHOA = 'drtrong:recentReads'

describe('recentReads — lọc bỏ bản ghi của hệ cũ (giai đoạn 8)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('bản ghi kind "article"/"custom"/"ecg" của hệ cũ bị LỌC khi đọc, chỉ còn "muc"', () => {
    localStorage.setItem(
      KHOA,
      JSON.stringify([
        { kind: 'article', id: 'mi', at: 1 },
        { kind: 'custom', id: 'bai-tu-nhap', at: 3 },
        { kind: 'ecg', id: 'bai-hoc-ecg', at: 4 },
        { kind: 'muc', id: 'm1', at: 2 },
      ]),
    )

    expect(loadRecentReads().map((e) => e.kind)).toEqual(['muc'])
    expect(loadRecentReads().map((e) => e.id)).toEqual(['m1'])
  })

  it('bản ghi hệ cũ không làm mất bản ghi "muc" ghi thêm sau đó', () => {
    localStorage.setItem(
      KHOA,
      JSON.stringify([
        { kind: 'article', id: 'mi', at: 10 },
        { kind: 'custom', id: 'bai-tu-nhap', at: 9 },
        { kind: 'ecg', id: 'bai-hoc-ecg', at: 8 },
      ]),
    )

    const sau = recordRead('muc', 'm2', 100)
    expect(sau.map((e) => e.kind)).toEqual(['muc'])
    expect(loadRecentReads().map((e) => e.id)).toEqual(['m2'])
  })
})
