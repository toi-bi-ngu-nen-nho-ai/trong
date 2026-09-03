// @vitest-environment happy-dom
//
// Canh phép nhận diện "đang xem trên điện thoại" — cái quyết định bảng sơ đồ có bị khoá về chế độ
// chỉ đọc hay không (xem src/board/chi-doc-tren-dien-thoai.ts).
//
// Ngưỡng và cách theo dõi là do chủ dự án chốt 2026-09-03: bề ngang < 768 px (mốc `md` của
// Tailwind — iPad dọc 768 px và mọi máy tính bảng vẫn chỉnh sửa bình thường), và phải theo dõi
// bằng `matchMedia` chứ không đọc `innerWidth` một lần, để xoay ngang/dọc là đổi ngay.
import { afterEach, describe, expect, it, vi } from 'vitest'

import { laDienThoai, theoDoiDienThoai, TRUY_VAN_DIEN_THOAI } from '../chi-doc-tren-dien-thoai'

type NgheDoi = (e: { matches: boolean }) => void

/** Dựng `window.matchMedia` giả trả về `khop`, kèm cách bắn sự kiện đổi. */
function gaMatchMedia(khop: boolean) {
  const nghe = new Set<NgheDoi>()
  const mql = {
    matches: khop,
    media: TRUY_VAN_DIEN_THOAI,
    addEventListener: (_ten: string, cb: NgheDoi) => nghe.add(cb),
    removeEventListener: (_ten: string, cb: NgheDoi) => nghe.delete(cb),
  }
  const goi = vi.fn(() => mql)
  vi.stubGlobal('matchMedia', goi)
  return {
    goi,
    soNghe: () => nghe.size,
    doiThanh: (moi: boolean) => {
      mql.matches = moi
      nghe.forEach((cb) => cb({ matches: moi }))
    },
  }
}

describe('chi-doc-tren-dien-thoai', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('ngưỡng là bề ngang dưới 768 px', () => {
    // Chốt cứng con số: đây là ranh giới chủ dự án đã quyết, đổi nó là đổi hành vi trên máy thật.
    expect(TRUY_VAN_DIEN_THOAI).toBe('(max-width: 767.98px)')
  })

  it('laDienThoai() trả đúng kết quả của truy vấn', () => {
    const g1 = gaMatchMedia(true)
    expect(laDienThoai()).toBe(true)
    expect(g1.goi).toHaveBeenCalledWith(TRUY_VAN_DIEN_THOAI)

    vi.unstubAllGlobals()
    gaMatchMedia(false)
    expect(laDienThoai()).toBe(false)
  })

  it('theoDoiDienThoai() báo lại khi xoay máy đổi bề ngang', () => {
    const ga = gaMatchMedia(true)
    const thay = vi.fn()
    theoDoiDienThoai(thay)

    ga.doiThanh(false)
    expect(thay).toHaveBeenCalledWith(false)
    ga.doiThanh(true)
    expect(thay).toHaveBeenLastCalledWith(true)
  })

  it('hàm huỷ gỡ hẳn listener — không rò khi vào ra bảng nhiều lần', () => {
    const ga = gaMatchMedia(true)
    const huy = theoDoiDienThoai(() => {})
    expect(ga.soNghe()).toBe(1)
    huy()
    expect(ga.soNghe()).toBe(0)
  })

  it('môi trường không có matchMedia → coi như KHÔNG phải điện thoại, và không ném', () => {
    // Đường này có thật: `xuatAnhBang.ts` mount một cây Lit ngầm, và mọi lượt chạy test môi trường
    // 'node' đều không có `matchMedia`. Khoá nhầm về chỉ-đọc ở đó là chặn cả lượt xuất ảnh.
    vi.stubGlobal('matchMedia', undefined)
    expect(laDienThoai()).toBe(false)
    expect(() => theoDoiDienThoai(() => {})()).not.toThrow()
  })
})
