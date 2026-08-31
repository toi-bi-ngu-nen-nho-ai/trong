// @vitest-environment happy-dom
//
// happy-dom KHÔNG tính layout: `getClientRects()`/`getBoundingClientRect()` luôn trả 0. Nên file
// này KHÔNG canh pixel — nó canh HỢP ĐỒNG ĐỌC (đọc đúng phần tử nào, bỏ đúng phần tử nào, đổi toạ
// độ ra sao) và PHÉP NGẮT DÒNG, bằng cách tiêm một `Range` giả có layout biết trước. Độ trung thực
// hình ảnh kiểm bằng trình duyệt thật.
import { describe, expect, it, vi } from 'vitest'

import {
  docLopKhoi,
  napBieuTuong,
  ngatDongTheoRange,
  veLopKhoi,
  type MoTaLopKhoi,
} from '../ve-khoi-len-canvas'

function hcn(x: number, y: number, w: number, h: number): DOMRect {
  return { x, y, width: w, height: h, left: x, top: y, right: x + w, bottom: y + h } as DOMRect
}

/**
 * Range giả với layout biết trước: chữ chảy thành dòng, mỗi dòng `soKyTuMoiDong` ký tự, mỗi ký tự
 * rộng `RONG`, mỗi dòng cao `CAO`. Đủ để canh phép gom dòng mà không cần engine layout thật.
 */
const RONG = 10
const CAO = 20
function taoRangeGia(soKyTuMoiDong: number) {
  let node: Text | null = null
  let s = 0
  let e = 0
  return () =>
    ({
      selectNodeContents(n: Text) {
        node = n
        s = 0
        e = (n.textContent ?? '').length
      },
      setStart(n: Text, i: number) {
        node = n
        s = i
      },
      setEnd(_n: Text, i: number) {
        e = i
      },
      getClientRects() {
        const len = (node?.textContent ?? '').length
        const soDong = Math.max(1, Math.ceil(len / soKyTuMoiDong))
        return Array.from({ length: soDong }, (_, k) => hcn(0, k * CAO, soKyTuMoiDong * RONG, CAO))
      },
      getBoundingClientRect() {
        const dong = Math.floor(s / soKyTuMoiDong)
        const cot = s % soKyTuMoiDong
        return hcn(cot * RONG, dong * CAO, Math.max(1, e - s) * RONG, CAO)
      },
    }) as unknown as Range
}

function nodeChu(s: string): Text {
  return document.createTextNode(s)
}

describe('ngatDongTheoRange — ngắt dòng theo ĐÚNG chỗ trình duyệt đã ngắt', () => {
  it('chữ nằm gọn một dòng → một dòng, giữ nguyên toàn bộ chuỗi', () => {
    const dong = ngatDongTheoRange(nodeChu('Sốc nhiễm khuẩn'), taoRangeGia(100))
    expect(dong).toHaveLength(1)
    expect(dong[0].chu).toBe('Sốc nhiễm khuẩn')
    // Đường GIỮA dòng, không phải mép trên — `veLopKhoi` vẽ với textBaseline 'middle'.
    expect(dong[0].giua).toBe(CAO / 2)
  })

  it('chữ tràn nhiều dòng → tách đúng số dòng, KHÔNG mất và KHÔNG lặp ký tự nào', () => {
    const s = 'abcdefghijklmnopqrstuvwxyz' // 26 ký tự, 10 mỗi dòng → 3 dòng
    const dong = ngatDongTheoRange(nodeChu(s), taoRangeGia(10))
    expect(dong).toHaveLength(3)
    expect(dong.map((d) => d.chu).join('')).toBe(s)
    expect(dong[0].chu).toBe('abcdefghij')
    expect(dong[2].chu).toBe('uvwxyz')
    // Mỗi dòng một đường giữa riêng, cách nhau đúng chiều cao dòng.
    expect(dong[1].giua - dong[0].giua).toBe(CAO)
  })

  it('KHÔNG xé cụm dấu tiếng Việt (chuỗi tổ hợp NFD) khi ngắt dòng', () => {
    // "ế" dạng NFD = "e" + dấu kết hợp — cắt theo code unit sẽ tách dấu ra khỏi nguyên âm và chữ
    // xuất ra sai chính tả. `Intl.Segmenter` granularity 'grapheme' giữ nguyên cụm.
    const s = 'tình trạng nguy kịch chuyển tuyến'.normalize('NFD')
    const dong = ngatDongTheoRange(nodeChu(s), taoRangeGia(8))
    expect(dong.length).toBeGreaterThan(1)
    expect(dong.map((d) => d.chu).join('')).toBe(s)
    // Không dòng nào được BẮT ĐẦU bằng một dấu kết hợp mồ côi (U+0300–U+036F).
    for (const d of dong) {
      expect(/^[̀-ͯ]/.test(d.chu)).toBe(false)
    }
  })

  it('text node rỗng → không dòng nào', () => {
    expect(ngatDongTheoRange(nodeChu(''), taoRangeGia(10))).toEqual([])
  })
})

// ─── docLopKhoi ────────────────────────────────────────────────────────────────────────────────

function dungKhoiGia(html: string): HTMLElement {
  const el = document.createElement('drt-edgeless-note')
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

/** Gắn rect cho một phần tử (happy-dom không tự có layout). */
function datRect(el: Element, r: DOMRect) {
  el.getBoundingClientRect = () => r
}

/** Toạ độ mô hình = màn hình / 2 — đủ để chứng minh phép đổi toạ độ THẬT SỰ được áp dụng. */
const doiToaDoGia = (x: number, y: number): [number, number] => [x / 2, y / 2]

describe('docLopKhoi — đọc DOM đã layout ra bản mô tả bằng số', () => {
  it('đọc thân thẻ từ edgeless-note-background: màu nền, bo góc, viền — và đổi sang toạ độ mô hình', () => {
    const khoi = dungKhoiGia('<edgeless-note-background></edgeless-note-background>')
    const nen = khoi.querySelector('edgeless-note-background')! as HTMLElement
    datRect(nen, hcn(100, 200, 400, 300))
    nen.style.backgroundColor = 'rgb(255, 245, 171)'
    nen.style.borderRadius = '8px'
    nen.style.borderTop = '2px solid rgb(10, 20, 30)'

    const moTa = docLopKhoi([khoi], doiToaDoGia)
    expect(moTa.the).toHaveLength(1)
    const t = moTa.the[0]
    expect([t.x, t.y, t.w, t.h]).toEqual([50, 100, 200, 150])
    expect(t.mauNen).toBe('rgb(255, 245, 171)')
    expect(t.banKinh).toBe(8)
    expect(t.vienDay).toBe(2)
    khoi.remove()
  })

  it('viền borderStyle "none" → vienDay 0 (không vẽ viền ma)', () => {
    const khoi = dungKhoiGia('<edgeless-note-background></edgeless-note-background>')
    const nen = khoi.querySelector('edgeless-note-background')! as HTMLElement
    datRect(nen, hcn(0, 0, 100, 100))
    nen.style.borderTop = '4px none rgb(0,0,0)'
    expect(docLopKhoi([khoi], doiToaDoGia).the[0].vienDay).toBe(0)
    khoi.remove()
  })

  it('nền có kích thước 0 (khối bị cull) → không dựng thẻ nào', () => {
    const khoi = dungKhoiGia('<edgeless-note-background></edgeless-note-background>')
    datRect(khoi.querySelector('edgeless-note-background')!, hcn(0, 0, 0, 0))
    expect(docLopKhoi([khoi], doiToaDoGia).the).toHaveLength(0)
    khoi.remove()
  })

  it('BỎ QUA chữ nằm trong lớp phủ thao tác (mặt nạ note) — không phải nội dung', () => {
    const khoi = dungKhoiGia(
      '<edgeless-note-mask><div class="drt-note-mask">' +
        '<span data-v-text="true">che chuột</span>' +
        '</div></edgeless-note-mask>',
    )
    expect(docLopKhoi([khoi], doiToaDoGia).chu).toHaveLength(0)
    khoi.remove()
  })

  it("BỎ QUA chữ mờ gợi ý (placeholder) — nó không mang data-v-text", () => {
    const khoi = dungKhoiGia('<div class="drt-paragraph-placeholder">Go / de chen</div>')
    expect(docLopKhoi([khoi], doiToaDoGia).chu).toHaveLength(0)
    khoi.remove()
  })

  it('BỎ QUA phần tử bị ẩn (display:none)', () => {
    const khoi = dungKhoiGia('<span data-v-text="true" style="display:none">ẩn</span>')
    expect(docLopKhoi([khoi], doiToaDoGia).chu).toHaveLength(0)
    khoi.remove()
  })

  it('bỏ qua <img> chưa tải xong — drawImage trên nó sẽ ném', () => {
    const khoi = dungKhoiGia('<img>')
    const img = khoi.querySelector('img')!
    datRect(img, hcn(0, 0, 50, 50))
    Object.defineProperty(img, 'complete', { value: false })
    expect(docLopKhoi([khoi], doiToaDoGia).anh).toHaveLength(0)
    khoi.remove()
  })
})

// ─── veLopKhoi ─────────────────────────────────────────────────────────────────────────────────

function ctxGia() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textBaseline: '',
  }
}

const theMau = {
  x: 10,
  y: 20,
  w: 100,
  h: 50,
  mauNen: 'rgb(255,245,171)',
  banKinh: 8,
  vienMau: 'rgb(0,0,0)',
  vienDay: 0,
}

describe('veLopKhoi — vẽ bản mô tả, không đọc DOM', () => {
  const doiSang = (x: number, y: number): [number, number] => [x + 5, y + 5]

  it('vẽ nền thẻ và chữ với textBaseline "middle", ở đúng toạ độ đã đổi', () => {
    const ctx = ctxGia()
    const moTa: MoTaLopKhoi = {
      the: [theMau],
      chu: [
        {
          chu: 'Sốc nhiễm khuẩn',
          x: 30,
          y: 40,
          rong: 200,
          cao: 30,
          coChu: 26,
          font: 'normal 600 26px X',
          mau: 'rgb(18,18,18)',
        },
      ],
      anh: [],
    }
    veLopKhoi(ctx as unknown as CanvasRenderingContext2D, moTa, doiSang)
    expect(ctx.fill).toHaveBeenCalledTimes(1)
    expect(ctx.textBaseline).toBe('middle')
    expect(ctx.fillText).toHaveBeenCalledWith('Sốc nhiễm khuẩn', 35, 45)
  })

  it('nền trong suốt → KHÔNG tô (nếu tô sẽ đè mất nét vẽ bên dưới)', () => {
    const ctx = ctxGia()
    veLopKhoi(
      ctx as unknown as CanvasRenderingContext2D,
      { the: [{ ...theMau, mauNen: 'rgba(0, 0, 0, 0)' }], chu: [], anh: [] },
      doiSang,
    )
    expect(ctx.fill).not.toHaveBeenCalled()
  })

  it('có viền dày > 0 → vẽ viền; vienDay 0 → không', () => {
    const co = ctxGia()
    veLopKhoi(
      co as unknown as CanvasRenderingContext2D,
      { the: [{ ...theMau, vienDay: 3 }], chu: [], anh: [] },
      doiSang,
    )
    expect(co.stroke).toHaveBeenCalledTimes(1)

    const khong = ctxGia()
    veLopKhoi(
      khong as unknown as CanvasRenderingContext2D,
      { the: [theMau], chu: [], anh: [] },
      doiSang,
    )
    expect(khong.stroke).not.toHaveBeenCalled()
  })

  it('drawImage ném (ảnh chéo miền) → nuốt đúng tấm đó, CHỮ vẫn được vẽ', () => {
    const ctx = ctxGia()
    ctx.drawImage = vi.fn(() => {
      throw new Error('tainted canvas')
    })
    const moTa: MoTaLopKhoi = {
      the: [],
      anh: [{ nguon: {} as CanvasImageSource, x: 0, y: 0, w: 10, h: 10 }],
      chu: [
        { chu: 'còn đây', x: 1, y: 2, rong: 50, cao: 18, coChu: 15, font: 'normal 400 15px X', mau: '#000' },
      ],
    }
    expect(() => veLopKhoi(ctx as unknown as CanvasRenderingContext2D, moTa, doiSang)).not.toThrow()
    expect(ctx.fillText).toHaveBeenCalledWith('còn đây', 6, 7)
  })
})

// ─── Dấu đầu mục (chấm, số thứ tự, ô tick) ─────────────────────────────────────────────────────
//
// Ba thứ này KHÔNG nằm trong trình soạn nội tuyến: BlockSuite dựng chúng ở một `div` anh em
// (`drt-list-block__prefix`) — chấm/ô tick/mũi gập là `<svg>` nội tuyến, số thứ tự là một TEXT NODE
// TRẦN ngay trong div. Không selector nào của lượt đọc cũ (`[data-v-text="true"]`, `img`) chạm tới,
// nên cả ba biến mất khỏi ảnh xuất trong khi nội dung ghi chú vẫn ra đủ (đo trên trình duyệt thật
// 2026-08-31: ba thẻ danh sách xuất ra ba hình chữ nhật rỗng).

describe('docLopKhoi — dấu đầu mục danh sách', () => {
  it('chấm đầu dòng (SVG nội tuyến) → một biểu tượng, currentColor đã phân giải thành màu thật', () => {
    const khoi = dungKhoiGia(
      '<div class="drt-list-block__prefix">' +
        '<svg viewBox="0 0 24 24"><circle cx="7" cy="12" r="3" fill="currentColor"></circle></svg>' +
        '</div>',
    )
    const svg = khoi.querySelector('svg')!
    datRect(svg, hcn(100, 200, 24, 24))
    ;(svg as unknown as HTMLElement).style.color = 'rgb(55, 106, 154)'

    const moTa = docLopKhoi([khoi], doiToaDoGia)
    expect(moTa.bieuTuong).toHaveLength(1)
    const b = moTa.bieuTuong![0]
    expect([b.x, b.y, b.w, b.h]).toEqual([50, 100, 12, 12])
    expect(b.duLieu.startsWith('data:image/svg+xml')).toBe(true)
    const svgChuoi = decodeURIComponent(b.duLieu.split(',')[1])
    expect(svgChuoi).toContain('circle')
    // `currentColor` trong một tệp SVG rời không có gì để kế thừa — phải ghim màu vào chính nó.
    expect(svgChuoi).toContain('rgb(55, 106, 154)')
    khoi.remove()
  })

  it('số thứ tự (text node trần, KHÔNG có data-v-text) vào lớp chữ', () => {
    const khoi = dungKhoiGia(
      '<div class="drt-list-block__prefix drt-list-block__numbered">1.</div>',
    )
    const dau = khoi.querySelector('div')! as HTMLElement
    datRect(dau, hcn(0, 0, 22, 24))
    dau.style.color = 'rgb(55, 106, 154)'

    const moTa = docLopKhoi([khoi], doiToaDoGia, taoRangeGia(10))
    expect(moTa.chu.map((c) => c.chu)).toContain('1.')
    expect(moTa.chu[0].mau).toBe('rgb(55, 106, 154)')
    khoi.remove()
  })

  it('BỎ QUA svg trong lớp phủ thao tác — không phải nội dung', () => {
    const khoi = dungKhoiGia(
      '<edgeless-note-mask><svg viewBox="0 0 24 24"><path d="M0 0"/></svg></edgeless-note-mask>',
    )
    datRect(khoi.querySelector('svg')!, hcn(0, 0, 24, 24))
    expect(docLopKhoi([khoi], doiToaDoGia).bieuTuong ?? []).toHaveLength(0)
    khoi.remove()
  })

  it('KHÔNG đếm svg lồng trong svg hai lần', () => {
    const khoi = dungKhoiGia(
      '<div class="drt-list-block__prefix"><svg viewBox="0 0 24 24"><svg viewBox="0 0 8 8"></svg></svg></div>',
    )
    for (const s of Array.from(khoi.querySelectorAll('svg'))) datRect(s, hcn(0, 0, 24, 24))
    expect(docLopKhoi([khoi], doiToaDoGia).bieuTuong).toHaveLength(1)
    khoi.remove()
  })
})

describe('napBieuTuong — nạp biểu tượng SVG thành ảnh vẽ được', () => {
  function anhGia(ket: 'xong' | 'hong') {
    return () => {
      const img = { decode: () => (ket === 'xong' ? Promise.resolve() : Promise.reject(new Error('hỏng'))) } as unknown as HTMLImageElement
      return img
    }
  }

  it('biểu tượng nạp xong → thành phần tử trong lớp ảnh, danh sách biểu tượng rỗng đi', async () => {
    const moTa: MoTaLopKhoi = {
      the: [],
      chu: [],
      anh: [],
      bieuTuong: [{ duLieu: 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E', x: 1, y: 2, w: 3, h: 4 }],
    }
    const ra = await napBieuTuong(moTa, anhGia('xong'))
    expect(ra.anh).toHaveLength(1)
    expect([ra.anh[0].x, ra.anh[0].y, ra.anh[0].w, ra.anh[0].h]).toEqual([1, 2, 3, 4])
    expect(ra.bieuTuong ?? []).toHaveLength(0)
  })

  it('một biểu tượng hỏng → bỏ đúng cái đó, phần còn lại của bản mô tả giữ nguyên', async () => {
    const moTa: MoTaLopKhoi = {
      the: [],
      chu: [
        { chu: 'còn đây', x: 0, y: 0, rong: 50, cao: 18, coChu: 15, font: 'normal 400 15px X', mau: '#000' },
      ],
      anh: [],
      bieuTuong: [{ duLieu: 'data:image/svg+xml,x', x: 0, y: 0, w: 1, h: 1 }],
    }
    const ra = await napBieuTuong(moTa, anhGia('hong'))
    expect(ra.anh).toHaveLength(0)
    expect(ra.chu).toHaveLength(1)
  })
})

// ─── Định dạng chữ: gạch chân, gạch ngang, nền tô ──────────────────────────────────────────────
//
// `affine-text` bọc chữ thành `<span style="...">​<v-text><span data-v-text="true">`. Màu và font
// đặt ở span NGOÀI vẫn tới được span trong vì chúng là thuộc tính KẾ THỪA — nhưng
// `text-decoration` và `background-color` thì KHÔNG kế thừa: trình duyệt vẽ chúng từ phần tử cha
// phủ lên con. Đo trên Chrome thật (2026-08-31) ngay trên hình dạng DOM đó: ở span trong,
// `textDecorationLine` = "none" và `backgroundColor` = "rgba(0, 0, 0, 0)" trong khi span ngoài có
// đủ. Nên lượt đọc cũ — chỉ `getComputedStyle` trên `[data-v-text]` — mù đúng hai thứ này.

describe('docLopKhoi — định dạng nằm ở phần tử KHÔNG kế thừa xuống', () => {
  function dungChuCoDinhDang(styleNgoai: string): HTMLElement {
    const khoi = dungKhoiGia(
      `<drt-text><span style="${styleNgoai}"><v-text>` +
        '<span data-v-text="true">nguy kịch</span>' +
        '</v-text></span></drt-text>',
    )
    return khoi
  }

  it('gạch chân + gạch ngang đọc từ span bọc, không phải từ span mang chữ', () => {
    const khoi = dungChuCoDinhDang('text-decoration: underline line-through')
    const moTa = docLopKhoi([khoi], doiToaDoGia, taoRangeGia(50))
    expect(moTa.chu).toHaveLength(1)
    expect(moTa.chu[0].gachChan).toBe(true)
    expect(moTa.chu[0].gachNgang).toBe(true)
    khoi.remove()
  })

  it('nền tô chữ đọc từ span bọc', () => {
    const khoi = dungChuCoDinhDang('background-color: rgb(255, 220, 0)')
    const moTa = docLopKhoi([khoi], doiToaDoGia, taoRangeGia(50))
    expect(moTa.chu[0].nen).toBe('rgb(255, 220, 0)')
    khoi.remove()
  })

  it('chữ không định dạng → không cờ nào bật, không nền', () => {
    const khoi = dungKhoiGia('<span data-v-text="true">bình thường</span>')
    const moTa = docLopKhoi([khoi], doiToaDoGia, taoRangeGia(50))
    expect(moTa.chu[0].gachChan).toBeFalsy()
    expect(moTa.chu[0].gachNgang).toBeFalsy()
    expect(moTa.chu[0].nen).toBeFalsy()
    khoi.remove()
  })

  it('KHÔNG lấy nền của thân thẻ làm nền chữ — phép đi ngược dừng ở drt-text', () => {
    // Nếu vòng đi ngược không có chặn, nó sẽ trèo tới `edgeless-note-background` và tô một vệt
    // nền thẻ dài đúng bằng dòng chữ — sai hẳn cả về màu lẫn ý nghĩa.
    const khoi = dungKhoiGia(
      '<edgeless-note-background style="background-color: rgb(255, 245, 171)">' +
        '<drt-text><span style="font-style: italic"><v-text>' +
        '<span data-v-text="true">nguy kịch</span>' +
        '</v-text></span></drt-text></edgeless-note-background>',
    )
    const moTa = docLopKhoi([khoi], doiToaDoGia, taoRangeGia(50))
    expect(moTa.chu[0].nen).toBeFalsy()
    khoi.remove()
  })

  it('mang theo bề rộng + chiều cao dòng (toạ độ mô hình) để vẽ nền và gạch', () => {
    const khoi = dungKhoiGia('<span data-v-text="true">abcde</span>')
    const moTa = docLopKhoi([khoi], doiToaDoGia, taoRangeGia(50))
    // Range giả: 50 ký tự mỗi dòng × RONG=10 → hộp rộng 500, cao CAO=20; toạ độ mô hình = /2.
    expect(moTa.chu[0].rong).toBe(250)
    expect(moTa.chu[0].cao).toBe(10)
  })
})

describe('veLopKhoi — vẽ định dạng chữ', () => {
  const doiSang = (x: number, y: number): [number, number] => [x, y]
  const dongMau = {
    chu: 'nguy kịch',
    x: 0,
    y: 100,
    rong: 80,
    cao: 20,
    coChu: 16,
    font: 'normal 400 16px X',
    mau: 'rgb(18,18,18)',
  }

  it('nền tô vẽ TRƯỚC chữ, đúng hộp dòng', () => {
    const ctx = ctxGia()
    const thuTu: string[] = []
    ctx.fillRect = vi.fn(() => void thuTu.push('nen'))
    ctx.fillText = vi.fn(() => void thuTu.push('chu'))
    veLopKhoi(
      ctx as unknown as CanvasRenderingContext2D,
      { the: [], anh: [], chu: [{ ...dongMau, nen: 'rgb(255, 220, 0)' }] },
      doiSang,
    )
    expect(thuTu).toEqual(['nen', 'chu'])
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 90, 80, 20)
  })

  it('gạch ngang vẽ qua giữa dòng, gạch chân vẽ dưới đường giữa', () => {
    const ctx = ctxGia()
    veLopKhoi(
      ctx as unknown as CanvasRenderingContext2D,
      { the: [], anh: [], chu: [{ ...dongMau, gachChan: true, gachNgang: true }] },
      doiSang,
    )
    const veCac = (ctx.fillRect as unknown as { mock: { calls: number[][] } }).mock.calls
    expect(veCac).toHaveLength(2)
    // Cả hai chạy hết bề rộng dòng.
    for (const g of veCac) expect(g[2]).toBe(80)
    const yNgang = veCac.find((g) => g[1] < 100)![1]
    const yChan = veCac.find((g) => g[1] > 100)![1]
    expect(yNgang).toBeLessThan(100)
    expect(yChan).toBeGreaterThan(100)
  })

  it('chữ không định dạng → KHÔNG vẽ hình chữ nhật nào (không có vệt thừa trong ảnh)', () => {
    const ctx = ctxGia()
    veLopKhoi(
      ctx as unknown as CanvasRenderingContext2D,
      { the: [], anh: [], chu: [dongMau] },
      doiSang,
    )
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })
})

// ─── Hộp CSS ngoài thân thẻ ────────────────────────────────────────────────────────────────────
//
// Lượt đọc hộp trước đây chỉ nhìn `edgeless-note-background`, nên mọi thứ khác trình duyệt sơn
// bằng nền/viền đều không vào ảnh: đường kẻ ngang (`<hr>` với `border-top`, xem
// `affine/blocks/divider/src/styles.ts`), ô bảng (`<td>` `border: 1px solid`,
// `table-cell-css.ts`), viền mã inline (`<code>` trong `affine-text`).
//
// DANH SÁCH TRẮNG, không quét đoán: một phép "phần tử nào có nền thì vẽ" sẽ tô luôn cả các div bọc
// và lớp phủ, làm bẩn mọi bản xuất — đổi một tính năng đang chạy đúng lấy một tính năng đoán mò.

describe('docLopKhoi — hộp CSS ngoài thân thẻ', () => {
  it('đường kẻ ngang (<hr> chỉ có border-top) → một VỆT ĐẶC, không phải cái khung', () => {
    const khoi = dungKhoiGia('<hr>')
    const hr = khoi.querySelector('hr')! as HTMLElement
    datRect(hr, hcn(20, 100, 400, 0))
    hr.style.borderTop = '2px solid rgb(220, 220, 230)'

    const the = docLopKhoi([khoi], doiToaDoGia).the
    expect(the).toHaveLength(1)
    // Tô ĐẶC bằng màu viền — kẻ khung quanh một hộp cao 0 thì hoặc mất hút hoặc thành hai vạch.
    expect(the[0].mauNen).toBe('rgb(220, 220, 230)')
    expect(the[0].vienDay).toBe(0)
    expect(the[0].h).toBe(1) // 2px màn hình → 1 đơn vị mô hình (doiToaDoGia chia đôi)
    expect(the[0].w).toBe(200)
  })

  it('ô bảng (<td> viền đủ bốn cạnh) → hộp CÓ VIỀN', () => {
    const khoi = dungKhoiGia('<table><tr><td>ô</td></tr></table>')
    const td = khoi.querySelector('td')! as HTMLElement
    datRect(td, hcn(0, 0, 120, 40))
    td.style.border = '1px solid rgb(10, 20, 30)'

    const the = docLopKhoi([khoi], doiToaDoGia).the
    expect(the).toHaveLength(1)
    expect(the[0].vienDay).toBe(1)
    expect(the[0].vienMau).toBe('rgb(10, 20, 30)')
  })

  it('mã inline (<code> nền + viền) → hộp có cả nền lẫn viền', () => {
    const khoi = dungKhoiGia('<code>mg/kg</code>')
    const code = khoi.querySelector('code')! as HTMLElement
    datRect(code, hcn(0, 0, 60, 20))
    code.style.backgroundColor = 'rgb(245, 245, 245)'
    code.style.border = '1px solid rgb(200, 200, 200)'
    code.style.borderRadius = '4px'

    const the = docLopKhoi([khoi], doiToaDoGia).the
    expect(the).toHaveLength(1)
    expect(the[0].mauNen).toBe('rgb(245, 245, 245)')
    expect(the[0].vienDay).toBe(1)
    expect(the[0].banKinh).toBe(4)
  })

  it('nền của <code> KHÔNG bị vẽ hai lần — dòng chữ bỏ nền, hộp lo phần đó', () => {
    const khoi = dungKhoiGia(
      '<drt-text><code style="background-color: rgb(245, 245, 245)"><v-text>' +
        '<span data-v-text="true">mg/kg</span>' +
        '</v-text></code></drt-text>',
    )
    datRect(khoi.querySelector('code')!, hcn(0, 0, 60, 20))
    const moTa = docLopKhoi([khoi], doiToaDoGia, taoRangeGia(50))
    expect(moTa.chu[0].nen).toBeFalsy()
    khoi.remove()
  })

  it('phần tử không nền KHÔNG viền → không dựng hộp nào (không có vệt ma trong ảnh)', () => {
    const khoi = dungKhoiGia('<table><tr><td>trống trơn</td></tr></table>')
    datRect(khoi.querySelector('td')!, hcn(0, 0, 100, 30))
    expect(docLopKhoi([khoi], doiToaDoGia).the).toHaveLength(0)
  })

  it('hộp trong lớp phủ thao tác bị bỏ qua', () => {
    const khoi = dungKhoiGia('<edgeless-note-mask><hr></edgeless-note-mask>')
    const hr = khoi.querySelector('hr')! as HTMLElement
    datRect(hr, hcn(0, 0, 100, 0))
    hr.style.borderTop = '1px solid rgb(0, 0, 0)'
    expect(docLopKhoi([khoi], doiToaDoGia).the).toHaveLength(0)
  })
})
