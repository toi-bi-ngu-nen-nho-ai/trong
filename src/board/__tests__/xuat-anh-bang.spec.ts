// @vitest-environment happy-dom
//
// Ca kiểm cho ĐƯỜNG XUẤT PNG THẬT (xuatAnhBang.ts) — bản dựng lại từ tài liệu CRDT đã lưu, thay
// cho cơ chế cũ vốn chỉ đóng gói lại một ảnh chụp khung nhìn 480×360 JPEG q=0.6 (BangMeta
// .anhXemTruoc). Ba lỗi thật mà đường mới phải đóng, ghi lại ở đây để lần sau không ai "tối ưu"
// ngược trở lại:
//   1. Khung ảnh đổi theo pan/zoom — vì nguồn CHÍNH LÀ canvas khung nhìn. Nay đóng khung theo
//      `gfx.elementsBound` (hộp bao NỘI DUNG), độc lập hoàn toàn với chỗ người dùng đang nhìn.
//   2. Chất lượng bệt — 0,17 MP + JPEG 0.6, rồi bọc PNG nên artefact bị đóng đinh vĩnh viễn.
//   3. Thẻ ở lưới tái hiện nét vẽ thay vì giữ icon chuyên khoa.
//
// happy-dom KHÔNG rasterize: mọi phép vẽ pixel ở đây là no-op, nên file này canh HỢP ĐỒNG và
// VÒNG ĐỜI (đóng khung theo nội dung, tỉ lệ pixel, dọn dẹp) chứ không canh pixel. Độ trung thực
// hình ảnh được kiểm bằng trình duyệt thật.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CANH_TOI_DA,
  DIEN_TICH_TOI_DA,
  TI_LE_XUAT_MAC_DINH,
  tinhTiLeXuat,
  voiTiLePixel,
  xuatPngBang,
} from '../xuatAnhBang'

describe('tinhTiLeXuat — giữ ảnh dưới trần canvas của trình duyệt', () => {
  it('sơ đồ cỡ thường giữ nguyên tỉ lệ mong muốn', () => {
    expect(tinhTiLeXuat({ w: 1200, h: 900 }, TI_LE_XUAT_MAC_DINH)).toBe(2)
  })

  it('sơ đồ khổng lồ bị hạ tỉ lệ để không vượt trần DIỆN TÍCH', () => {
    // 4000×3000 ở tỉ lệ 2 → (4000+100)*2 × (3000+100)*2 = 8200×6200 = 50,8 MP, vượt xa trần
    // 16,7 MP của iOS Safari. Vượt trần thì canvas ra RỖNG/ĐEN mà KHÔNG ném lỗi — đúng loại hỏng
    // âm thầm mà cả lượt sửa này tồn tại để diệt, nên phải hạ tỉ lệ thay vì cầu may.
    const tiLe = tinhTiLeXuat({ w: 4000, h: 3000 }, TI_LE_XUAT_MAC_DINH)
    expect(tiLe).toBeLessThan(2)
    expect((4000 + 100) * tiLe * ((3000 + 100) * tiLe)).toBeLessThanOrEqual(DIEN_TICH_TOI_DA)
  })

  it('sơ đồ rất dài (một chiều) bị hạ tỉ lệ theo trần CẠNH, dù diện tích còn dư', () => {
    // 9000×200: diện tích ở tỉ lệ 2 chỉ ~7,4 MP (lọt trần diện tích) nhưng cạnh dài 18.200px
    // vượt trần cạnh — hai trần phải được kiểm ĐỘC LẬP, không suy ra được từ nhau.
    const tiLe = tinhTiLeXuat({ w: 9000, h: 200 }, TI_LE_XUAT_MAC_DINH)
    expect((9000 + 100) * tiLe).toBeLessThanOrEqual(CANH_TOI_DA)
  })

  it('không bao giờ trả về 0 hay số âm, kể cả với hộp bao vô lý', () => {
    expect(tinhTiLeXuat({ w: 1e9, h: 1e9 }, 2)).toBeGreaterThan(0)
  })

  it('không nâng tỉ lệ lên quá mức mong muốn cho sơ đồ tí hon', () => {
    // Ảnh 40×30 ở tỉ lệ 2 là đủ; phóng to thêm chỉ tạo pixel nội suy, không thêm thông tin nào.
    expect(tinhTiLeXuat({ w: 40, h: 30 }, TI_LE_XUAT_MAC_DINH)).toBe(2)
  })
})

describe('voiTiLePixel — cần lấy lại devicePixelRatio gốc bằng mọi giá', () => {
  it('đặt tỉ lệ trong lúc chạy rồi trả lại nguyên trạng', async () => {
    const goc = window.devicePixelRatio
    let thayTrongLuc = 0
    await voiTiLePixel(3, () => {
      thayTrongLuc = window.devicePixelRatio
    })
    expect(thayTrongLuc).toBe(3)
    expect(window.devicePixelRatio).toBe(goc)
  })

  it('trả lại nguyên trạng CẢ KHI việc bên trong ném lỗi', async () => {
    // Không có bước này thì một lượt xuất hỏng để lại devicePixelRatio giả cho TOÀN BỘ app — mọi
    // thứ vẽ bằng canvas sau đó (kể cả bảng vẽ khi mở lại) render sai tỉ lệ tới khi tải lại trang.
    // Đây là loại hỏng LAN RA NGOÀI phạm vi tính năng, nên finally là bắt buộc.
    const goc = window.devicePixelRatio
    await expect(
      voiTiLePixel(3, () => {
        throw new Error('vẽ hỏng')
      }),
    ).rejects.toThrow('vẽ hỏng')
    expect(window.devicePixelRatio).toBe(goc)
  })
})

// happy-dom KHÔNG dựng ngữ cảnh 2D — `ghepCanvas` bên trong `xuatPngBang` gọi thật
// `canvas.getContext('2d')` / `toDataURL`. Stub một ctx tối thiểu: đủ để phép toán toạ độ +
// `drawImage` chạy mà không ném. Không canh pixel (không có rasterize), canh HỢP ĐỒNG và TOẠ ĐỘ.
const ctxGia = () => ({
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textBaseline: '',
  scale: vi.fn(),
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  // Lớp khối vẽ thẻ bằng đường bo góc tự dựng (xem ve-khoi-len-canvas.ts) rồi tô chữ.
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
})
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctxGia() as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AA==')
})
afterEach(() => vi.restoreAllMocks())

// Bộ giả tối thiểu cho phần điều phối: đủ hình dạng để xuatPngBang() chạy hết vòng đời trên một
// `std` giả — cây BlockSuite thật đã có ca kiểm riêng (edgeless-board-mount.spec.ts).
/** Một `<drt-edgeless-note>` giả ĐỌC ĐƯỢC: có nền với kích thước thật. */
function noteGiaDocDuoc(): HTMLElement {
  const el = document.createElement('drt-edgeless-note')
  el.innerHTML = '<edgeless-note-background></edgeless-note-background>'
  const nen = el.querySelector('edgeless-note-background')!
  nen.getBoundingClientRect = () =>
    ({ x: 0, y: 0, width: 100, height: 60, left: 0, top: 0, right: 100, bottom: 60 }) as DOMRect
  document.body.appendChild(el)
  return el
}

function dungPhuThuocGia(ghiDe: { gfx?: Record<string, unknown>; pt?: Record<string, unknown> } = {}) {
  const getCanvasByBound = vi.fn((_b: unknown, _els: unknown[]) => ({ width: 900, height: 700 }))
  const setViewportByBound = vi.fn()
  const setViewport = vi.fn()
  const gfx = {
    elementsBound: { x: 0, y: 0, w: 800, h: 600 },
    getElementsByBound: vi.fn(() => [] as unknown[]),
    surfaceComponent: { getCanvasByBound },
    viewport: {
      zoom: 1,
      centerX: 400,
      centerY: 300,
      toModelCoord: (x: number, y: number) => [x, y] as [number, number],
      setViewportByBound,
      setViewport,
    },
    ...ghiDe.gfx,
  }
  return {
    _gfx: gfx,
    _getCanvasByBound: getCanvasByBound,
    _setViewportByBound: setViewportByBound,
    _setViewport: setViewport,
    pt: {
      layGfx: vi.fn(() => gfx),
      layRenderer: vi.fn(() => gfx.surfaceComponent),
      layPhanTuKhoi: vi.fn(() => null as Element | null),
      choKhoiHien: vi.fn(async () => {}),
      taiVe: vi.fn(),
      ...ghiDe.pt,
    },
  }
}

describe('xuatPngBang — xuất từ bảng ĐANG MỞ', () => {
  const HOST = document.createElement('div')
  HOST.innerHTML = '<div class="edgeless-background"></div>'

  it('đóng khung theo HỘP BAO NỘI DUNG (gfx.elementsBound), không đọc khung nhìn một dòng nào', async () => {
    const g = dungPhuThuocGia()
    await xuatPngBang({}, HOST, 'So do', g.pt as never)
    for (const call of (g._gfx.getElementsByBound as ReturnType<typeof vi.fn>).mock.calls) {
      expect(call[0]).toEqual(g._gfx.elementsBound)
    }
    // getCanvasByBound cũng đóng khung theo đúng elementsBound.
    expect(g._getCanvasByBound.mock.calls[0][0]).toEqual(g._gfx.elementsBound)
  })

  it('gọi taiVe với data URL PNG và tên tệp đã làm sạch', async () => {
    const g = dungPhuThuocGia()
    await xuatPngBang({}, HOST, 'Suy tim/EF <40%', g.pt as never)
    expect(g.pt.taiVe).toHaveBeenCalledTimes(1)
    const [duLieu, ten] = (g.pt.taiVe as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(duLieu).startsWith('data:image/png')).toBe(true)
    expect(ten).toBe('Suy tim_EF _40%.png')
  })

  it('tên rỗng/toàn khoảng trắng → rơi về tên mặc định, không tải tệp ".png"', async () => {
    const g = dungPhuThuocGia()
    await xuatPngBang({}, HOST, '   ', g.pt as never)
    expect((g.pt.taiVe as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe('so-do.png')
  })

  it('bảng TRỐNG (elementsBound 0×0) → "trong", không tải tệp, không vẽ', async () => {
    const g = dungPhuThuocGia({ gfx: { elementsBound: { x: 0, y: 0, w: 0, h: 0 } } })
    expect(await xuatPngBang({}, HOST, 'Trong', g.pt as never)).toBe('trong')
    expect(g.pt.taiVe).not.toHaveBeenCalled()
    expect(g._getCanvasByBound).not.toHaveBeenCalled()
  })

  it('KHÔNG có khối → "xong" trơn, và KHÔNG đụng khung nhìn của người dùng', async () => {
    const g = dungPhuThuocGia()
    expect(await xuatPngBang({}, HOST, 'So do', g.pt as never)).toBe('xong')
    expect(g.pt.taiVe).toHaveBeenCalledTimes(1)
    expect(g._setViewportByBound).not.toHaveBeenCalled()
    expect(g._setViewport).not.toHaveBeenCalled()
  })

  it('CÓ khối đọc được → "xong": fit khung nhìn ôm nội dung rồi TRẢ LẠI khung cũ', async () => {
    const note = noteGiaDocDuoc()
    const g = dungPhuThuocGia({
      gfx: {
        getElementsByBound: vi.fn((_b: unknown, o: { type: string }) =>
          o.type === 'block' ? [{ id: 'n1' }] : [],
        ),
      },
      pt: { layPhanTuKhoi: vi.fn(() => note) },
    })
    expect(await xuatPngBang({}, HOST, 'Co note', g.pt as never)).toBe('xong')
    // Khối bị cull khi ngoài khung nhìn → phải fit TRƯỚC khi đọc, và chờ trình duyệt sơn xong.
    expect(g._setViewportByBound).toHaveBeenCalledTimes(1)
    expect(g._setViewportByBound.mock.calls[0][0]).toEqual(g._gfx.elementsBound)
    expect(g.pt.choKhoiHien).toHaveBeenCalledTimes(1)
    // Trả lại ĐÚNG khung nhìn đã chụp trước lúc fit (zoom 1, tâm 400/300).
    expect(g._setViewport).toHaveBeenCalledTimes(1)
    expect(g._setViewport.mock.calls[0][0]).toBe(1)
    // MẢNG [x, y], không phải {x, y}: thượng nguồn đọc `newCenter[0]`/`[1]`, truyền object thì
    // tâm khung nhìn thành undefined và hỏng ÂM THẦM (đo được trên trình duyệt thật 2026-08-31).
    expect(g._setViewport.mock.calls[0][1]).toEqual([400, 300])
    note.remove()
  })

  it('CÓ khối nhưng KHÔNG đọc được thân thẻ nào → "xong-thieu-the-ghi-chu", vẫn tải ảnh về', async () => {
    // Người dùng phải được BÁO ngay lúc bấm, thay vì tự phát hiện thiếu khi mở tệp giữa ca trực.
    const g = dungPhuThuocGia({
      gfx: {
        getElementsByBound: vi.fn((_b: unknown, o: { type: string }) =>
          o.type === 'block' ? [{ id: 'a' }, { id: 'b' }] : [],
        ),
      },
      pt: { layPhanTuKhoi: vi.fn(() => null) },
    })
    expect(await xuatPngBang({}, HOST, 'Co note', g.pt as never)).toBe('xong-thieu-the-ghi-chu')
    expect(g.pt.taiVe).toHaveBeenCalledTimes(1)
  })

  it('khung nhìn được TRẢ LẠI kể cả khi lượt vẽ ném lỗi', async () => {
    const note = noteGiaDocDuoc()
    const g = dungPhuThuocGia({
      gfx: {
        getElementsByBound: vi.fn((_b: unknown, o: { type: string }) =>
          o.type === 'block' ? [{ id: 'n1' }] : [],
        ),
      },
      pt: {
        layPhanTuKhoi: vi.fn(() => note),
        layRenderer: vi.fn(() => ({
          getCanvasByBound: vi.fn(() => {
            throw new Error('renderer hỏng')
          }),
        })),
      },
    })
    await expect(xuatPngBang({}, HOST, 'X', g.pt as never)).rejects.toThrow('renderer hỏng')
    expect(g._setViewport).toHaveBeenCalledTimes(1)
    note.remove()
  })

  it('surface không có CanvasRenderer → ném lỗi rõ, và khoá được mở cho lượt sau', async () => {
    const g = dungPhuThuocGia({ gfx: { surfaceComponent: null }, pt: { layRenderer: vi.fn(() => null) } })
    await expect(xuatPngBang({}, HOST, 'X', g.pt as never)).rejects.toThrow('CanvasRenderer')
    // Khoá `dangXuat` đã mở: lượt kế tiếp (bảng lành) chạy được.
    const g2 = dungPhuThuocGia()
    expect(await xuatPngBang({}, HOST, 'Y', g2.pt as never)).toBe('xong')
  })

  it('devicePixelRatio được trả lại nguyên trạng KỂ CẢ khi getCanvasByBound ném lỗi', async () => {
    const goc = window.devicePixelRatio
    const g = dungPhuThuocGia({
      pt: {
        layRenderer: vi.fn(() => ({
          getCanvasByBound: vi.fn(() => {
            throw new Error('renderer hỏng')
          }),
        })),
      },
    })
    await expect(xuatPngBang({}, HOST, 'X', g.pt as never)).rejects.toThrow('renderer hỏng')
    expect(window.devicePixelRatio).toBe(goc)
  })

  it('hai lượt chồng nhau: lượt thứ hai (gọi trước khi lượt đầu xong) bị từ chối ("dang-ban")', async () => {
    const g = dungPhuThuocGia()
    const dau = xuatPngBang({}, HOST, 'A', g.pt as never) // chưa await — khoá `dangXuat` đang giữ
    expect(await xuatPngBang({}, HOST, 'B', dungPhuThuocGia().pt as never)).toBe('dang-ban')
    expect(await dau).toBe('xong')
  })
})
