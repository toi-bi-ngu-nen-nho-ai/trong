// @vitest-environment happy-dom
//
// happy-dom KHÔNG tính layout: `getClientRects()`/`getBoundingClientRect()` luôn trả 0. Nên file
// này KHÔNG canh pixel — nó canh HỢP ĐỒNG ĐỌC (đọc đúng phần tử nào, bỏ đúng phần tử nào, đổi toạ
// độ ra sao) và PHÉP NGẮT DÒNG, bằng cách tiêm một `Range` giả có layout biết trước. Độ trung thực
// hình ảnh kiểm bằng trình duyệt thật.
import { describe, expect, it, vi } from 'vitest'

import { docLopKhoi, ngatDongTheoRange, veLopKhoi, type MoTaLopKhoi } from '../ve-khoi-len-canvas'

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
        { chu: 'Sốc nhiễm khuẩn', x: 30, y: 40, font: 'normal 600 26px X', mau: 'rgb(18,18,18)' },
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
      chu: [{ chu: 'còn đây', x: 1, y: 2, font: 'normal 400 15px X', mau: '#000' }],
    }
    expect(() => veLopKhoi(ctx as unknown as CanvasRenderingContext2D, moTa, doiSang)).not.toThrow()
    expect(ctx.fillText).toHaveBeenCalledWith('còn đây', 6, 7)
  })
})
