// DongNaoTemplateManager + dữ liệu 5 mẫu bảng đã sinh (public/static/templates/dongnao/*.json).
// `fetch` được thay bằng bản đọc thẳng từ public/ — bài này canh DỮ LIỆU ĐÃ SINH chứ không canh
// mạng, và dữ liệu đó là thứ tới tay người dùng.
//
// Ba khẳng định quan trọng nhất, mỗi cái ứng với một cách hỏng đã thấy thật:
//   - Không còn `affine-` (D16 luật A của scripts/kiem-dist.mjs).
//   - Mọi `--drt-*` được DÙNG đều được ĐỊNH NGHĨA (luật B của cổng đó, áp sớm ở tầng dữ liệu —
//     token không phân giải được thì console sạch, hình sai, mắt thường không thấy).
//   - Không còn chuỗi tiếng Anh nào của bảng dịch.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { DocSnapshotSchema } from '@blocksuite/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DongNaoTemplateManager } from '../mau-dongnao'
import { DANH_MUC_DONG_NAO, MAU_DONG_NAO } from '../mau-dongnao.sinh'

const GOC = join(__dirname, '../../..')
const THU_MUC = join(GOC, 'public/static/templates/dongnao')
const THEME_CSS = readFileSync(join(GOC, '.vendor-build/theme/style.css'), 'utf8')
const BANG_DICH = JSON.parse(readFileSync(join(GOC, 'scripts/dich-dongnao.json'), 'utf8')) as {
  _ten: Record<string, string>
  _chuoi: Record<string, string>
}

// `--affine-palette-transparent` (nay `--drt-`) KHÔNG phải biến CSS: thượng nguồn khai nó là "special
// value added for the sake of logical consistency" (shared/src/theme/css-variables.ts) và
// components/src/color-picker/utils.js so chuỗi `value.endsWith('transparent')` rồi trả thẳng
// `transparent`, không bao giờ gọi `var()`. Vì thế nó vắng mặt trong style.css một cách hợp lệ.
const SENTINEL_KHONG_CAN_DINH_NGHIA = new Set(['--drt-palette-transparent'])

function docTep(slug: string): string {
  return readFileSync(join(THU_MUC, `${slug}.json`), 'utf8')
}

function fetchGia(url: string) {
  const slug = String(url).replace('/static/templates/dongnao/', '').replace('.json', '')
  return Promise.resolve({ ok: true, json: async () => JSON.parse(docTep(slug)) })
}

/** Mọi `insert` không rỗng trong một cây snapshot. */
function moiChuoi(nut: unknown, ra: string[] = []): string[] {
  if (Array.isArray(nut)) {
    nut.forEach((v) => moiChuoi(v, ra))
    return ra
  }
  if (!nut || typeof nut !== 'object') return ra
  for (const [khoa, giaTri] of Object.entries(nut)) {
    if (khoa === 'insert' && typeof giaTri === 'string') {
      if (giaTri.trim() !== '') ra.push(giaTri)
    } else moiChuoi(giaTri, ra)
  }
  return ra
}

describe('DongNaoTemplateManager', () => {
  let qtl: DongNaoTemplateManager

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchGia)
    qtl = new DongNaoTemplateManager()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('một danh mục "Động não", danh mục lạ trả rỗng', async () => {
    expect(qtl.categories()).toEqual([DANH_MUC_DONG_NAO])
    expect(await qtl.list('không-có')).toEqual([])
  })

  it('5 mẫu kiểu template, DocSnapshot parse được, preview trỏ tới bìa .svg', async () => {
    const ds = await qtl.list(DANH_MUC_DONG_NAO)
    expect(ds).toHaveLength(MAU_DONG_NAO.length)
    expect(ds).toHaveLength(5)
    for (const mau of ds) {
      expect(mau.type).toBe('template')
      expect(mau.name).toBeTruthy()
      expect(mau.preview).toMatch(/^\/static\/templates\/dongnao\/[a-z0-9-]+\.svg$/)
      expect(() => DocSnapshotSchema.parse(mau.content)).not.toThrow()
    }
    expect(ds.map((m) => m.name)).toEqual(MAU_DONG_NAO.map((m) => m.ten))
  })

  // `replaceIdMiddleware` chạy `Object.entries(blockJson.props.childElementIds)` cho MỌI khối
  // `affine:frame` (`gfx/template/src/services/template-middlewares.ts`, nhánh cuối
  // `regenerateBlockId`). `assertType` ngay trên nó là no-op lúc chạy nên KHÔNG chặn gì. Snapshot
  // gốc của AFFiNE thiếu hẳn prop này (đã kiểm trong .zip nguồn: 3 khung của Concept Map và 2 khung
  // của Flowchart đều thiếu) → mỗi lần thả mẫu ném một `TypeError: Cannot convert undefined or null
  // to object` cho MỖI khung, đúng số khung, bắt được trên trình duyệt thật 2026-09-01.
  // `frame-model.ts:51` mặc định prop này là object rỗng, nên `{}` là giá trị đúng để bù.
  it('mọi khối affine:frame đều có props.childElementIds là object', () => {
    let soKhung = 0
    for (const { slug } of MAU_DONG_NAO) {
      const j = JSON.parse(docTep(slug))
      const khung: { props?: Record<string, unknown> }[] = []
      const di = (v: unknown): void => {
        if (Array.isArray(v)) return v.forEach(di)
        if (!v || typeof v !== 'object') return
        if ((v as { flavour?: string }).flavour === 'affine:frame') khung.push(v)
        Object.values(v).forEach(di)
      }
      di(j.content)
      soKhung += khung.length
      for (const k of khung) {
        const ids = k.props?.childElementIds
        expect(ids, `${slug}: khung thiếu childElementIds`).toBeDefined()
        expect(typeof ids, `${slug}: childElementIds không phải object`).toBe('object')
      }
    }
    // Chốt số: nếu thượng nguồn đổi bộ mẫu mà không còn khung nào thì ca này thành vô nghĩa.
    expect(soKhung, 'không còn khối affine:frame nào — bản vá này có thể đã thừa').toBe(5)
  })

  it('không tệp nào còn chuỗi "affine-" (D16 luật A)', () => {
    for (const { slug } of MAU_DONG_NAO) {
      expect(docTep(slug), slug).not.toMatch(/\baffine-/)
      expect(readFileSync(join(THU_MUC, `${slug}.svg`), 'utf8'), `${slug}.svg`).not.toMatch(/\baffine-/)
    }
  })

  it('mọi --drt-* được dùng đều có định nghĩa trong theme (D16 luật B, áp sớm)', () => {
    const dung = new Set<string>()
    for (const { slug } of MAU_DONG_NAO) {
      for (const t of docTep(slug).match(/--drt-[a-z0-9-]+/g) ?? []) dung.add(t)
    }
    expect(dung.size).toBeGreaterThan(10)
    const thieu = [...dung].filter((t) => !SENTINEL_KHONG_CAN_DINH_NGHIA.has(t) && !THEME_CSS.includes(t))
    expect(thieu, `token dùng mà không định nghĩa: ${thieu.join(', ')}`).toEqual([])
  })

  it('không còn chuỗi tiếng Anh nào của bảng dịch', () => {
    // Bỏ qua các mục dịch-thành-chính-nó (chữ cái SMART, "SWOT"): chúng còn nguyên là ĐÚNG.
    const conAnh = Object.entries(BANG_DICH._chuoi)
      .filter(([goc, ban]) => goc !== ban)
      .map(([goc]) => goc)

    for (const { slug } of MAU_DONG_NAO) {
      const chuoi = new Set(moiChuoi(JSON.parse(docTep(slug))))
      const sot = conAnh.filter((s) => chuoi.has(s))
      expect(sot, `${slug} còn tiếng Anh: ${sot.join(' | ')}`).toEqual([])
    }
    // Tên mẫu cũng phải là bản dịch, không phải tên tệp gốc.
    expect(MAU_DONG_NAO.map((m) => m.ten)).toEqual(Object.values(BANG_DICH._ten))
  })

  it('search: lọc theo tên mà không cần mạng khi không mẫu nào khớp', async () => {
    const goiFetch = vi.fn(fetchGia)
    vi.stubGlobal('fetch', goiFetch)
    const m = new DongNaoTemplateManager()

    expect(await m.search('zzz-không-khớp-gì')).toEqual([])
    expect(goiFetch).not.toHaveBeenCalled()

    const ten = MAU_DONG_NAO[0].ten
    expect((await m.search(ten)).some((t) => t.name === ten)).toBe(true)
    expect(goiFetch).toHaveBeenCalled()
    expect(await m.search(ten, 'danh-mục-lạ')).toEqual([])
  })

  // `builtInTemplates.list()` gộp mọi manager bằng MỘT Promise.all (toolbar/builtin-templates.ts):
  // ném ở đây là xoá trắng cả bốn tab nhãn dán. Phải hỏng mềm.
  it('fetch hỏng → trả rỗng, KHÔNG ném, và lần sau thử lại', async () => {
    let hong = true
    vi.stubGlobal('fetch', (url: string) => (hong ? Promise.reject(new Error('mạng hỏng')) : fetchGia(url)))
    const loi = vi.spyOn(console, 'error').mockImplementation(() => {})
    const m = new DongNaoTemplateManager()

    await expect(m.list(DANH_MUC_DONG_NAO)).resolves.toEqual([])
    expect(loi).toHaveBeenCalled()

    hong = false
    await expect(m.list(DANH_MUC_DONG_NAO)).resolves.toHaveLength(5)
    loi.mockRestore()
  })
})
