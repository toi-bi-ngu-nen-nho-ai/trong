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

  // ═══ TỈ LỆ CHỮ / KHỔ MẪU ═══
  //
  // `toolbar/template-panel.ts:311-316` của cây vendored luôn thu khung nhìn cho vừa TOÀN BỘ mẫu
  // sau khi thả, chỉ chừa 20 px. Nên độ đọc được của một mẫu KHÔNG phụ thuộc cỡ chữ tuyệt đối mà
  // chỉ phụ thuộc tỉ số `cỡ chữ ÷ khổ mẫu` — và cả hai vế đó nằm trong dữ liệu đã sinh, tức kiểm
  // được ở đây, không cần trình duyệt. Ba ca dưới khoá đúng ba thứ đã hỏng thật ngày 2026-09-02.

  // Vùng vẽ đo được trên cửa sổ 1280×800 (thanh điều hướng dưới + header đã trừ). Con số cụ thể
  // không thiêng liêng — nó chỉ là mốc quy chiếu để ngưỡng px bên dưới có nghĩa.
  const VUNG_VE = { w: 1280, h: 743 }

  /** Khổ mẫu theo ĐÚNG công thức `_getTemplateBound()` của cây vendored (bỏ connector và group). */
  function khoMau(slug: string): { w: number; h: number } {
    const j = JSON.parse(docTep(slug))
    let minx = Infinity
    let miny = Infinity
    let maxx = -Infinity
    let maxy = -Infinity
    const gom = (xywh: string) => {
      const [x, y, w, h] = JSON.parse(xywh) as number[]
      minx = Math.min(minx, x)
      miny = Math.min(miny, y)
      maxx = Math.max(maxx, x + w)
      maxy = Math.max(maxy, y + h)
    }
    const di = (v: unknown): void => {
      if (Array.isArray(v)) return v.forEach(di)
      if (!v || typeof v !== 'object') return
      const nut = v as { flavour?: string; props?: Record<string, unknown> }
      if (nut.flavour && typeof nut.props?.xywh === 'string') gom(nut.props.xywh)
      if (nut.flavour === 'affine:surface') {
        for (const el of Object.values(nut.props?.elements as Record<string, Record<string, unknown>>)) {
          const loai = el.type as string
          if (typeof el.xywh === 'string' && loai !== 'connector' && loai !== 'group') gom(el.xywh)
        }
      }
      Object.values(v).forEach(di)
    }
    di(j.content.blocks)
    return { w: maxx - minx, h: maxy - miny }
  }

  /** Mức zoom mà panel đặt sau khi thả, ở mức zoom 1 (padding = 20 px mỗi cạnh). */
  function zoomSauKhiChen(slug: string): number {
    const { w, h } = khoMau(slug)
    return Math.min((VUNG_VE.w - 40) / w, (VUNG_VE.h - 40) / h)
  }

  /** Mọi phần tử mặt phẳng CÓ CHỮ, kèm cỡ chữ hiệu lực. */
  function phanTuCoChu(slug: string): { loai: string; fontSize: number | undefined; chu: string }[] {
    const j = JSON.parse(docTep(slug))
    const mp = j.content.blocks.children.find((c: { flavour: string }) => c.flavour === 'affine:surface')
    const ra: { loai: string; fontSize: number | undefined; chu: string }[] = []
    for (const el of Object.values(mp.props.elements) as Record<string, never>[]) {
      const t = el as unknown as {
        type: string
        fontSize?: number
        text?: { delta?: { insert?: string }[] }
      }
      if (t.type !== 'shape' && t.type !== 'text') continue
      const chu = (t.text?.delta ?? []).map((d) => d.insert ?? '').join('')
      if (chu.trim() === '') continue
      ra.push({ loai: t.type, fontSize: t.fontSize, chu })
    }
    return ra
  }

  // LỖI GỐC của lượt vá này: 14 hình của Lưu đồ không có prop `fontSize` trong snapshot thượng
  // nguồn nên rơi về mặc định `ShapeTextFontSize.MEDIUM = 20` (affine/model shape.ts:110) trong hộp
  // 304×156 — tỉ lệ chữ/hộp 0,128, ra 5,5 px trên màn sau khi chèn. Thiếu prop là hỏng IM LẶNG:
  // không lỗi, không cảnh báo, chỉ là chữ bé.
  it('mọi hình/khối chữ đều GHI RÕ fontSize, không rơi về mặc định', () => {
    for (const { slug } of MAU_DONG_NAO) {
      const thieu = phanTuCoChu(slug).filter((e) => typeof e.fontSize !== 'number')
      expect(thieu.map((e) => `${e.loai}:${e.chu.slice(0, 20)}`), `${slug} thiếu fontSize`).toEqual([])
    }
  })

  // Khẳng định NGƯỜI DÙNG THẤY: thả mẫu ra rồi phải đọc được ngay, không phải phóng to lên mới đọc
  // nổi. Trước lượt vá, bốn mẫu rơi vào 5,4–9,9 px.
  it('cỡ chữ nhỏ nhất của mọi mẫu ≥ 10 px trên màn ngay sau khi chèn', () => {
    for (const { slug, ten } of MAU_DONG_NAO) {
      const z = zoomSauKhiChen(slug)
      const cos = phanTuCoChu(slug).map((e) => e.fontSize as number)
      expect(cos.length, `${slug} không có phần tử chữ nào`).toBeGreaterThan(0)
      const nhoNhat = Math.min(...cos)
      expect(Math.round(nhoNhat * z * 10) / 10, `${ten} (${slug}) chữ nhỏ nhất trên màn`).toBeGreaterThanOrEqual(10)
    }
  })

  // Chốt khổ từng mẫu. Khổ là MẪU SỐ của tỉ số trên, nên một lượt sinh lại làm mẫu phình ra sẽ kéo
  // tụt cỡ chữ trên màn của MỌI phần tử cùng lúc — ca này chỉ đúng tên thủ phạm sớm hơn.
  // ═══ HỘP CHỮ vs BỀ RỘNG CHỮ Ở PHÔNG DỰ PHÒNG ═══
  //
  // LỖI GỐC (người dùng báo 2026-09-03): bảy nhãn cột trái của 5W2H hiện ra bị BẺ GIỮA TỪ —
  // "Who" → "Wh"/"o", "What" → "Wha"/"t", "where" → "wher"/"e", "How much" → "How"/"much".
  //
  // Chuỗi nhân quả: `w` trong snapshot thượng nguồn CHÍNH LÀ bề rộng chữ AFFiNE đo được bằng phông
  // thật của nó (Kalam, tải từ `cdn.affine.pro`). App này chỉ tự chứa DUY NHẤT họ Inter
  // (`src/board/phong-chu-bang.ts` — quyết định có chủ đích để chạy ngoại tuyến), nên
  // `getFontString()` của bộ vẽ (`gfx/text/src/element-renderer/utils.ts`) sinh ra
  // `"blocksuite:surface:Kalam", sans-serif` và trình duyệt rơi thẳng về phông sans-serif hệ thống
  // — RỘNG HƠN Kalam 11–23 %. `wrapText` so bề rộng đo được với `w` đã lưu, thấy tràn, và vì nhãn
  // chỉ có MỘT từ nên chỗ ngắt rơi vào giữa từ. Đo trên trình duyệt thật 2026-09-03: cả bảy nhãn
  // chỉ vừa 0,81–0,90 lần hộp của chúng.
  //
  // BẢN VÁ: căn PHẢI và kéo hộp về bên trái tới bề rộng cố định, giữ nguyên mép phải mà thượng
  // nguồn đã đặt. Hộp rộng hơn hẳn chữ ⇒ cách ngắt dòng thôi phụ thuộc phông dự phòng của nền tảng.
  // Ngưỡng 720 lấy từ số đo thật: nhãn dài nhất ("How much" cỡ 128) cần 565–677 px trên chín phông
  // sans-serif hệ thống phổ biến (rộng nhất là Verdana 677), sáu nhãn một-từ cần ≤ 393 px.
  it('bảy nhãn cột trái của 5W2H căn phải, chung mép phải, hộp đủ rộng cho mọi phông dự phòng', () => {
    const j = JSON.parse(docTep('5w2h'))
    const mp = j.content.blocks.children.find((c: { flavour: string }) => c.flavour === 'affine:surface')
    const nhan = (Object.values(mp.props.elements) as Record<string, never>[])
      .map((e) => e as unknown as { type: string; fontSize?: number; textAlign?: string; xywh: string })
      .filter((e) => e.type === 'text' && e.fontSize === 128)
    expect(nhan, 'số nhãn cột trái của 5W2H').toHaveLength(7)

    const mepPhai = new Set<number>()
    for (const e of nhan) {
      const [x, , w] = JSON.parse(e.xywh) as number[]
      expect(e.textAlign, `nhãn ${e.xywh} phải căn phải`).toBe('right')
      expect(w, `hộp nhãn ${e.xywh} phải rộng ≥ 720`).toBeGreaterThanOrEqual(720)
      mepPhai.add(x + w)
    }
    // Mép phải chung là thứ giữ cột nhãn thẳng hàng như thượng nguồn — nới hộp về TRÁI mới không
    // xê dịch chữ; nới về phải là đẩy nhãn vào sát các ô giải thích.
    expect([...mepPhai], 'bảy nhãn phải chung một mép phải').toHaveLength(1)
  })

  // Cùng lớp lỗi, mẫu khác. Hai nút gốc "Khái niệm A/B" dùng BebasNeue — cũng KHÔNG được nạp, cũng
  // vẽ bằng phông dự phòng. Lượt sinh trước chốt hộp 560 (lòng 520) dựa trên bề rộng đo được 496 px;
  // đo lại 2026-09-03 ra 518 px, tức chỉ còn dư 2 px, và phông dự phòng rộng nhất trong chín phông
  // hệ thống phổ biến cần ~535 px. Ngưỡng 700 (lòng 660) giữ biên 1,27 lần.
  it('hai nút gốc của Sơ đồ khái niệm đủ rộng cho chữ ở phông dự phòng', () => {
    const j = JSON.parse(docTep('concept-map'))
    const mp = j.content.blocks.children.find((c: { flavour: string }) => c.flavour === 'affine:surface')
    const nut = (Object.values(mp.props.elements) as Record<string, never>[])
      .map((e) => e as unknown as { type: string; xywh: string; text?: { delta?: { insert?: string }[] } })
      .filter((e) => e.type === 'shape' && (e.text?.delta ?? []).map((d) => d.insert ?? '').join('') !== '')
    expect(nut, 'số hình có chữ của Sơ đồ khái niệm').toHaveLength(2)
    for (const e of nut) {
      const [, , w] = JSON.parse(e.xywh) as number[]
      expect(w, `hộp nút ${e.xywh} phải rộng ≥ 700`).toBeGreaterThanOrEqual(700)
    }
  })

  it('khổ từng mẫu đúng như lượt sinh đã chốt', () => {
    const CHOT: Record<string, [number, number]> = {
      '5w2h': [3215, 1924],
      'concept-map': [6788, 3718],
      flowchart: [3067, 2545],
      smart: [4140, 2040],
      swot: [4305, 2009],
    }
    for (const { slug } of MAU_DONG_NAO) {
      const { w, h } = khoMau(slug)
      expect([Math.round(w), Math.round(h)], `${slug}`).toEqual(CHOT[slug])
    }
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
