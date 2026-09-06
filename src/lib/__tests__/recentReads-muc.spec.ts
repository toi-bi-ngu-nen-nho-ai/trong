// @vitest-environment happy-dom
//
// Cùng lý do pragma này xuất hiện ở uiState.spec.ts: môi trường mặc định của bộ test là 'node'
// (xem vite.config.ts), không có `localStorage` toàn cục — recordRead/loadRecentReads (recentReads.ts)
// đọc/ghi thẳng localStorage nên thiếu pragma này ca kiểm đỏ SAI LÝ DO (localStorage undefined bị
// try/catch nuốt, không phải vì ReadKind từ chối "muc").
import { describe, expect, it } from 'vitest'

import { recordRead, loadRecentReads } from '../recentReads'

describe('recentReads — kind muc', () => {
  it('ghi nhận được kind "muc"', () => {
    recordRead('muc', 'muc-1')
    expect(loadRecentReads()[0]).toMatchObject({ kind: 'muc', id: 'muc-1' })
  })
})
