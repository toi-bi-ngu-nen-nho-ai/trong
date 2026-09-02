// HandyTemplateManager — nửa "logic" của việc bơm mẫu nhãn dán (xem scripts/dung-mau-handy.mjs và
// scripts/dung-mau-sticker.mjs cho nửa "dữ liệu"). Canh HỢP ĐỒNG với panel vendored:
// `categories()`/`list()`/`search()` trả đúng hình dạng mà `EdgelessTemplatePanel` tiêu thụ, và mỗi
// `content` qua được `DocSnapshotSchema.parse` — thứ `TemplateJob.insertTemplate` gọi đầu tiên
// (ném ở đó = panel nuốt lỗi, sticker không hiện).
import { DocSnapshotSchema } from '@blocksuite/store'
import { describe, expect, it } from 'vitest'

import { CANH_DAI, HandyTemplateManager } from '../mau-handy'
import { MAU_MUI_TEN } from '../mau-handy.sinh'
import { MAU_STICKER } from '../mau-sticker.sinh'

const DANH_MUC = 'Mũi tên'
const TONG = MAU_MUI_TEN.length + MAU_STICKER.reduce((s, n) => s + n.mau.length, 0)
const qtl = new HandyTemplateManager()

/** Props của khối `affine:image` duy nhất trong một sticker. */
function propsAnh(mau: { content: unknown }): Record<string, unknown> {
  return (mau.content as { blocks: { children: { children: { props: Record<string, unknown> }[] }[] } }).blocks
    .children[0].children[0].props
}

describe('HandyTemplateManager', () => {
  it('bốn danh mục, "Mũi tên" đứng đầu', () => {
    expect(qtl.categories()).toEqual([DANH_MUC, 'Heo mập', 'Nhãn dán', 'Giấy nhớ'])
  })

  it('list trả đủ số mẫu từng danh mục, danh mục lạ trả rỗng', () => {
    expect(qtl.list(DANH_MUC)).toHaveLength(MAU_MUI_TEN.length)
    expect(MAU_MUI_TEN.length).toBeGreaterThan(100)
    for (const n of MAU_STICKER) {
      expect(qtl.list(n.danhMuc), n.danhMuc).toHaveLength(n.mau.length)
    }
    expect(qtl.list('không-có')).toEqual([])
  })

  it('mỗi mẫu là sticker hợp lệ: DocSnapshot parse được, đúng 1 asset khớp sourceId của khối ảnh', () => {
    for (const danhMuc of qtl.categories()) {
      for (const mau of qtl.list(danhMuc)) {
        expect(mau.type).toBe('sticker')
        expect(mau.name).toBeTruthy()
        expect(mau.preview).toMatch(/^\/static\/templates\/(arrows|stickers\/[a-z-]+)\/.+\.svg$/)

        expect(() => DocSnapshotSchema.parse(mau.content)).not.toThrow()

        const khoiAnh = (
          mau.content as {
            blocks: { children: { children: { flavour: string; props: Record<string, unknown> }[] }[] }
          }
        ).blocks.children[0].children[0]
        expect(khoiAnh.flavour).toBe('affine:image')

        const khoaAsset = Object.keys(mau.assets ?? {})
        expect(khoaAsset).toHaveLength(1)
        expect(khoaAsset[0]).toBe(khoiAnh.props.sourceId)
        // sourceId không được bắt đầu bằng "/" — ImageBlockTransformer.fromSnapshot bỏ qua writeToBlob nếu có.
        expect(String(khoiAnh.props.sourceId).startsWith('/')).toBe(false)
        expect(mau.assets![khoaAsset[0]]).toBe(mau.preview)
      }
    }
  })

  // Bốn danh mục chia nhau một không gian sourceId. Trùng nghĩa là thả nhãn này ra hình nhãn kia
  // ngay trong lượt đầu (trước khi `replaceIdMiddleware` kịp sinh id mới), nên canh toàn cục.
  it('sourceId duy nhất trên cả bốn danh mục', () => {
    const thay = new Set<string>()
    for (const danhMuc of qtl.categories()) {
      for (const mau of qtl.list(danhMuc)) {
        const sid = Object.keys(mau.assets ?? {})[0]
        expect(thay.has(sid), `sourceId trùng: ${sid}`).toBe(false)
        thay.add(sid)
      }
    }
    expect(thay.size).toBe(TONG)
  })

  // D16 luật A: không chuỗi `affine-` (có gạch nối) nào được tới bản phát hành. Ba nhãn dán mang
  // thương hiệu thượng nguồn đã bị `dung-mau-sticker.mjs` loại; bài này canh phía dữ liệu đã sinh.
  it('không tên/URL nào chứa "affine-"', () => {
    for (const danhMuc of qtl.categories()) {
      for (const mau of qtl.list(danhMuc)) {
        expect(`${mau.name} ${mau.preview}`.toLowerCase()).not.toContain('affine-')
      }
    }
  })

  // `width`/`height` là kích thước TỰ NHIÊN của ảnh (giữ nguyên từ viewBox); `xywh` là KHUNG THẢ
  // trên canvas, đã phóng theo cạnh dài lên CANH_DAI để mẫu không ra bé xíu — xem chú thích
  // `khungTha` trong mau-handy.ts. Hai thứ khác nhau, đừng gộp lại.
  it('width/height giữ kích thước gốc, xywh phóng theo cạnh dài lên CANH_DAI và không méo', () => {
    const theoTen = new Map(qtl.list(DANH_MUC).map((m) => [m.name, m]))
    for (const { id, w, h } of MAU_MUI_TEN) {
      const mau = theoTen.get(`Mũi tên ${id}`)
      expect(mau, `thiếu mẫu id ${id}`).toBeDefined()
      const props = propsAnh(mau!)
      expect(props.width).toBe(w)
      expect(props.height).toBe(h)

      const khop = String(props.xywh).match(/^\[0,0,(\d+),(\d+)\]$/)
      expect(khop, `xywh sai dạng ở mẫu ${id}: ${String(props.xywh)}`).not.toBeNull()
      const kw = Number(khop![1])
      const kh = Number(khop![2])
      // Cạnh dài đúng bằng CANH_DAI (Math.round nên cho phép lệch 1px).
      expect(Math.abs(Math.max(kw, kh) - CANH_DAI), `mẫu ${id}`).toBeLessThanOrEqual(1)
      // Không méo: tỷ lệ khung lệch dưới 2% so với tỷ lệ gốc.
      expect(Math.abs(kw / kh - w / h) / (w / h), `mẫu ${id} bị méo`).toBeLessThan(0.02)
    }
  })

  it('nhãn dán mới cũng được phóng khung theo cùng luật', () => {
    for (const n of MAU_STICKER) {
      const theoTen = new Map(qtl.list(n.danhMuc).map((m) => [m.name, m]))
      for (const { ten, w, h } of n.mau) {
        const props = propsAnh(theoTen.get(ten)!)
        const khop = String(props.xywh).match(/^\[0,0,(\d+),(\d+)\]$/)!
        expect(Math.abs(Math.max(Number(khop[1]), Number(khop[2])) - CANH_DAI), ten).toBeLessThanOrEqual(1)
        expect(props.width).toBe(w)
        expect(props.height).toBe(h)
      }
    }
  })

  it('search: khớp theo tên, rỗng trả tất cả, giới hạn được theo danh mục', () => {
    const idMau = MAU_MUI_TEN[5].id
    const kq = qtl.search(`mũi tên ${idMau}`)
    expect(kq.some((m) => m.name === `Mũi tên ${idMau}`)).toBe(true)

    expect(qtl.search('')).toHaveLength(TONG)
    expect(qtl.search('', DANH_MUC)).toHaveLength(MAU_MUI_TEN.length)
    expect(qtl.search('zzz-không-khớp-gì')).toEqual([])
    expect(qtl.search('mũi tên', 'danh-mục-lạ')).toEqual([])
    // Tên nhãn dán mới tìm được, và không lẫn sang danh mục khác.
    const tenMau = MAU_STICKER[0].mau[0].ten
    expect(qtl.search(tenMau, MAU_STICKER[0].danhMuc).some((m) => m.name === tenMau)).toBe(true)
    expect(qtl.search(tenMau, DANH_MUC)).toEqual([])
  })
})
