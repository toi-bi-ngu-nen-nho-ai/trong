// Setup file cho @testing-library/react (thêm từ Task 4, kho-bai-viet-giai-doan-5-6 —
// ChonDanhMuc.spec.tsx là ca kiểm đầu tiên dùng `render`/`screen` của thư viện này). RTL tự dọn DOM
// sau mỗi ca (`cleanup()`) CHỈ khi nó tìm thấy `afterEach` toàn cục — cơ chế đó đọc `globalThis`, và
// dự án này KHÔNG bật `test.globals` trong vite.config.ts (mọi file spec khác import
// `describe/it/expect` tường minh từ 'vitest', không dựa vào global). Thiếu bước này, DOM của một
// `render()` còn nguyên sang ca kế tiếp TRONG CÙNG FILE (happy-dom không tự reset `document` giữa
// các `it()`) — đo trực tiếp: ca "sơ đồ chỉ có BA" thấy nút "Hướng dẫn" sót lại từ ca bài-viết ngay
// trước, và ca "bấm một danh mục" tìm thấy BA nút "ECG" chồng từ ba lượt render trước đó.
//
// Đăng ký qua `test.setupFiles` (vite.config.ts) — chạy MỘT LẦN cho mỗi worker trước khi bộ test của
// nó bắt đầu, áp dụng cho mọi file spec dùng RTL từ nay, không phải sửa riêng từng file.
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
