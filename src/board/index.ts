// Nạp chậm (D13): 993,69 kB gzip chỉ tải khi người dùng thật sự mở một bảng — gấp ba lần vỏ app,
// vốn giữ nguyên 332,01 kB gzip. Import tĩnh ở đây là mất trọn lợi ích đó.
// (Hai số trên đo bằng `npm run build` ngày 2026-08-12; con số 1.131 kB ghi ở đây trước kia chưa
// bao giờ dựng lại được.)
import { lazy } from 'react'

export const EdgelessBoard = lazy(() =>
  import('./EdgelessBoard').then((m) => ({ default: m.EdgelessBoard }))
)
