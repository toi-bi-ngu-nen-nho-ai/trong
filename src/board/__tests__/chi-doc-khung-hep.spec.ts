// @vitest-environment happy-dom
//
// Canh phép nhận diện "đang xem trên điện thoại" — cái quyết định bảng sơ đồ có bị khoá về chế độ
// chỉ đọc hay không (xem src/board/chi-doc-khung-hep.ts).
//
// Ngưỡng và cách theo dõi là do chủ dự án chốt 2026-09-03: bề ngang < 768 px (mốc `md` của
// Tailwind), theo dõi bằng `matchMedia` chứ không đọc `innerWidth` một lần, để xoay ngang/dọc là
// đổi ngay. Gọi là "khung hẹp" chứ không phải "điện thoại": không có ranh giới thật giữa hai loại
// máy, chỉ có bề ngang đo được.
import { afterEach, describe, expect, it, vi } from 'vitest'

import { laKhungHep, theoDoiKhungHep, TRUY_VAN_KHUNG_HEP } from '../chi-doc-khung-hep'

type NgheDoi = (e: { matches: boolean }) => void

/** Dựng `window.matchMedia` giả trả về `khop`, kèm cách bắn sự kiện đổi. */
function gaMatchMedia(khop: boolean) {
  const nghe = new Set<NgheDoi>()
  const mql = {
    matches: khop,
    media: TRUY_VAN_KHUNG_HEP,
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

describe('chi-doc-khung-hep', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('ngưỡng là bề ngang dưới 768 px', () => {
    // Chốt cứng con số: đây là ranh giới chủ dự án đã quyết, đổi nó là đổi hành vi trên máy thật.
    expect(TRUY_VAN_KHUNG_HEP).toBe('(max-width: 767.98px)')
  })

  it('laKhungHep() trả đúng kết quả của truy vấn', () => {
    const g1 = gaMatchMedia(true)
    expect(laKhungHep()).toBe(true)
    expect(g1.goi).toHaveBeenCalledWith(TRUY_VAN_KHUNG_HEP)

    vi.unstubAllGlobals()
    gaMatchMedia(false)
    expect(laKhungHep()).toBe(false)
  })

  it('theoDoiKhungHep() báo lại khi xoay máy đổi bề ngang', () => {
    const ga = gaMatchMedia(true)
    const thay = vi.fn()
    theoDoiKhungHep(thay)

    ga.doiThanh(false)
    expect(thay).toHaveBeenCalledWith(false)
    ga.doiThanh(true)
    expect(thay).toHaveBeenLastCalledWith(true)
  })

  it('hàm huỷ gỡ hẳn listener — không rò khi vào ra bảng nhiều lần', () => {
    const ga = gaMatchMedia(true)
    const huy = theoDoiKhungHep(() => {})
    expect(ga.soNghe()).toBe(1)
    huy()
    expect(ga.soNghe()).toBe(0)
  })

  it('môi trường không có matchMedia → coi như KHÔNG hẹp, và không ném', () => {
    // Đường này có thật: `xuatAnhBang.ts` mount một cây Lit ngầm, và mọi lượt chạy test môi trường
    // 'node' đều không có `matchMedia`. Khoá nhầm về chỉ-đọc ở đó là chặn cả lượt xuất ảnh.
    vi.stubGlobal('matchMedia', undefined)
    expect(laKhungHep()).toBe(false)
    expect(() => theoDoiKhungHep(() => {})()).not.toThrow()
  })
})
