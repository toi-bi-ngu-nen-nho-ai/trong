// Nạp chậm (D13): 1.131 kB gzip chỉ tải khi người dùng thật sự mở một bảng. Vỏ app giữ nguyên
// 331 kB. Import tĩnh ở đây là mất trọn lợi ích đó.
import { lazy } from 'react'

export const EdgelessBoard = lazy(() =>
  import('./EdgelessBoard').then((m) => ({ default: m.EdgelessBoard }))
)
