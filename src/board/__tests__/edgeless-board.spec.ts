// Kiểm đúng thứ dự án sở hữu (D9): việc dựng bảng và hình dạng dữ liệu ban đầu.
// KHÔNG kiểm mã của AFFiNE — họ có bộ test riêng.
//
// File này CỐ Ý không render component: environment mặc định là 'node' (xem vite.config.ts) nên
// chạm DOM sẽ đâm `DOMRect is not defined`. Phần render — cầu nối React↔Lit — nằm ở
// `edgeless-board-mount.spec.ts`, file đó tự đổi environment sang happy-dom bằng chỉ thị
// `// @vitest-environment` ngay dòng đầu.
import { describe, expect, it } from 'vitest'

import { taoBangTrong } from '../EdgelessBoard'

describe('taoBangTrong', () => {
  it('dựng ra một store có root', () => {
    const store = taoBangTrong()
    expect(store.root).not.toBeNull()
  })

  it('bảng mới có đúng một surface', () => {
    const store = taoBangTrong()
    const surfaces = store.root!.children.filter((c) => c.flavour === 'affine:surface')
    expect(surfaces).toHaveLength(1)
  })

  it('surface mới chưa có phần tử nào', () => {
    const store = taoBangTrong()
    const surface = store.root!.children.find((c) => c.flavour === 'affine:surface')!
    expect((surface as unknown as { elementModels: unknown[] }).elementModels).toHaveLength(0)
  })
})
