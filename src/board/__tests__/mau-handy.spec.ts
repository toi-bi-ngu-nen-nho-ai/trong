// HandyTemplateManager — nửa "logic" của việc bơm mẫu mũi tên (xem scripts/dung-mau-handy.mjs cho
// nửa "dữ liệu"). Canh HỢP ĐỒNG với panel vendored: `categories()`/`list()`/`search()` trả đúng
// hình dạng mà `EdgelessTemplatePanel` tiêu thụ, và mỗi `content` qua được `DocSnapshotSchema.parse`
// — thứ `TemplateJob.insertTemplate` gọi đầu tiên (ném ở đó = panel nuốt lỗi, sticker không hiện).
import { DocSnapshotSchema } from '@blocksuite/store'
import { describe, expect, it } from 'vitest'

import { HandyTemplateManager } from '../mau-handy'
import { MAU_MUI_TEN } from '../mau-handy.sinh'

const DANH_MUC = 'Mũi tên'
const qtl = new HandyTemplateManager()

describe('HandyTemplateManager', () => {
  it('có đúng một danh mục "Mũi tên"', () => {
    expect(qtl.categories()).toEqual([DANH_MUC])
  })

  it('list("Mũi tên") trả đủ số mẫu đã sinh, list danh mục lạ trả rỗng', () => {
    expect(qtl.list(DANH_MUC)).toHaveLength(MAU_MUI_TEN.length)
    expect(MAU_MUI_TEN.length).toBeGreaterThan(100)
    expect(qtl.list('không-có')).toEqual([])
  })

  it('mỗi mẫu là sticker hợp lệ: DocSnapshot parse được, đúng 1 asset khớp sourceId của khối ảnh', () => {
    for (const mau of qtl.list(DANH_MUC)) {
      expect(mau.type).toBe('sticker')
      expect(mau.name).toBeTruthy()
      expect(mau.preview).toMatch(/^\/static\/templates\/arrows\/.+\.svg$/)

      expect(() => DocSnapshotSchema.parse(mau.content)).not.toThrow()

      const khoiAnh = (
        mau.content as { blocks: { children: { children: { flavour: string; props: Record<string, unknown> }[] }[] } }
      ).blocks.children[0].children[0]
      expect(khoiAnh.flavour).toBe('affine:image')

      const khoaAsset = Object.keys(mau.assets ?? {})
      expect(khoaAsset).toHaveLength(1)
      expect(khoaAsset[0]).toBe(khoiAnh.props.sourceId)
      // sourceId không được bắt đầu bằng "/" — ImageBlockTransformer.fromSnapshot bỏ qua writeToBlob nếu có.
      expect(String(khoiAnh.props.sourceId).startsWith('/')).toBe(false)
      expect(mau.assets![khoaAsset[0]]).toBe(mau.preview)
    }
  })

  it('xywh của khối ảnh khớp kích thước trong tệp sinh', () => {
    const theoTen = new Map(qtl.list(DANH_MUC).map((m) => [m.name, m]))
    for (const { id, w, h } of MAU_MUI_TEN) {
      const mau = theoTen.get(`Mũi tên ${id}`)
      expect(mau, `thiếu mẫu id ${id}`).toBeDefined()
      const props = (
        mau!.content as { blocks: { children: { children: { props: Record<string, unknown> }[] }[] } }
      ).blocks.children[0].children[0].props
      expect(props.xywh).toBe(`[0,0,${w},${h}]`)
      expect(props.width).toBe(w)
      expect(props.height).toBe(h)
    }
  })

  it('search: khớp theo tên, rỗng trả tất cả, danh mục lạ trả rỗng', () => {
    const idMau = MAU_MUI_TEN[5].id
    const kq = qtl.search(`mũi tên ${idMau}`)
    expect(kq.some((m) => m.name === `Mũi tên ${idMau}`)).toBe(true)

    expect(qtl.search('')).toHaveLength(MAU_MUI_TEN.length)
    expect(qtl.search('zzz-không-khớp-gì')).toEqual([])
    expect(qtl.search('mũi tên', 'danh-mục-lạ')).toEqual([])
  })
})
