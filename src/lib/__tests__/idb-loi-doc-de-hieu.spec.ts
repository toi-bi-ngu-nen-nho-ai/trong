// @vitest-environment happy-dom
//
// I2 (BAN-GIAO-PHIEN-SAU.md, mục 2) — `idbGetAllCoKetQua` phân biệt "câu tiếng Việt app tự viết"
// (openDb() ở hai nhánh "IndexedDB không khả dụng"/"tab khác đang mở") với "DOMException của chính
// IndexedDB" bằng `loi instanceof Error` — SAI: DOMException LÀ instanceof Error trong runtime thật
// (kiểm bằng `node -e "new DOMException('x') instanceof Error"` → true), nên nhánh phân biệt này
// KHÔNG BAO GIỜ hoạt động, và một DOMException kỹ thuật (ví dụ "No objectStore named … in this
// database") lọt thẳng ra `loiDoc` — nơi hiển thị cấp app đưa nó cho người dùng là bác sĩ đọc.
import 'fake-indexeddb/auto'

import { describe, expect, it } from 'vitest'

import { idbGetAllCoKetQua } from '../idb'

describe('I2 — idbGetAllCoKetQua phải trả câu tiếng Việt đọc được, kể cả khi lỗi là DOMException', () => {
  it('DOMException instanceof Error đúng như giả định SAI của mã cũ (canh giả định, không phải hành vi app)', () => {
    expect(new DOMException('x') instanceof Error).toBe(true)
  })

  it('store không tồn tại ném DOMException thật (NotFoundError) ⇒ loi phải là câu tiếng Việt, không phải thông điệp trình duyệt', async () => {
    const kq = await idbGetAllCoKetQua('store-khong-ton-tai-trong-schema')
    expect(kq.ok).toBe(false)
    if (kq.ok) return
    // Không khẳng định đúng-nguyên-văn câu tiếng Việt (đó là chi tiết cài đặt) — chỉ khẳng định
    // ĐIỀU BẤT BIẾN: không được là thông điệp DOMException gốc, thứ luôn nhắc tên "objectStore" bằng
    // tiếng Anh kỹ thuật (mọi runtime chuẩn IndexedDB, kể cả fake-indexeddb, đều nêu đúng từ này).
    expect(kq.loi.toLowerCase()).not.toContain('objectstore')
    expect(kq.loi).toMatch(/[À-ỹ]/) // có dấu tiếng Việt — dấu hiệu đây là câu app tự viết, không phải câu trình duyệt sinh ra
  })
})
