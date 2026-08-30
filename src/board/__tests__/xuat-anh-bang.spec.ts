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
import { describe, expect, it, vi } from 'vitest'

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

// Bộ giả tối thiểu cho phần điều phối: đủ hình dạng để xuatPngBang() chạy hết vòng đời, không cần
// BlockSuite thật (cây Lit thật đã có ca kiểm riêng ở edgeless-board-mount.spec.ts).
function dungPhuThuocGia(ghiDe: Record<string, unknown> = {}) {
  return {
    moBang: vi.fn(async () => ({ workspace: { forceStop: vi.fn() }, store: {}, doc: { loaded: true } })),
    dungStd: vi.fn(async () => ({
      hopBaoNoiDung: { x: 0, y: 0, w: 800, h: 600 },
      veRaCanvas: vi.fn(async () => {
        const c = document.createElement('canvas')
        c.width = 1800
        c.height = 1400
        return { canvas: c, soKhoi: 0 }
      }),
      thao: vi.fn(),
    })),
    taiVe: vi.fn(),
    ...ghiDe,
  }
}

describe('xuatPngBang — vòng đời của lượt mở bảng ngầm', () => {
  it('đóng khung theo HỘP BAO NỘI DUNG, không theo khung nhìn', async () => {
    const pt = dungPhuThuocGia()
    await xuatPngBang('bang-1', 'So do', pt as never)
    const may = await (pt.dungStd as ReturnType<typeof vi.fn>).mock.results[0].value
    // veRaCanvas nhận đúng hộp bao mà máy xuất báo cáo — không tham số nào lấy từ viewport.
    expect(may.veRaCanvas).toHaveBeenCalledWith(may.hopBaoNoiDung, expect.any(Number))
  })

  it('gọi taiVe với data URL PNG thật và tên tệp đã làm sạch', async () => {
    const pt = dungPhuThuocGia()
    await xuatPngBang('bang-1', 'Suy tim/EF <40%', pt as never)
    expect(pt.taiVe).toHaveBeenCalledTimes(1)
    const [duLieu, ten] = (pt.taiVe as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(duLieu).startsWith('data:image/png')).toBe(true)
    expect(ten).toBe('Suy tim_EF _40%.png')
  })

  it('bảng TRỐNG (hộp bao 0×0) → trả "trong", không tải tệp rỗng về', async () => {
    // Xuất một PNG toàn màu nền cho bảng chưa vẽ gì còn tệ hơn không xuất: người dùng tưởng đã
    // lưu được sơ đồ. Bên gọi dùng giá trị trả về này để hiện thông báo tử tế.
    const pt = dungPhuThuocGia({
      dungStd: vi.fn(async () => ({
        hopBaoNoiDung: { x: 0, y: 0, w: 0, h: 0 },
        veRaCanvas: vi.fn(),
        thao: vi.fn(),
      })),
    })
    expect(await xuatPngBang('bang-trong', 'Trong', pt as never)).toBe('trong')
    expect(pt.taiVe).not.toHaveBeenCalled()
  })

  it('dọn SẠCH (tháo cây Lit, đóng workspace, gỡ hộp chứa khỏi DOM) kể cả khi vẽ ném lỗi', async () => {
    // Bỏ sót bước này thì mỗi lượt xuất hỏng để lại một trình soạn thảo ngoài màn hình còn sống
    // kèm một DocEngine chạy nền vô thời hạn — không còn ai giữ tham chiếu để đóng nó nữa.
    const thao = vi.fn()
    const forceStop = vi.fn()
    const pt = dungPhuThuocGia({
      moBang: vi.fn(async () => ({ workspace: { forceStop }, store: {}, doc: { loaded: true } })),
      dungStd: vi.fn(async () => ({
        hopBaoNoiDung: { x: 0, y: 0, w: 800, h: 600 },
        veRaCanvas: vi.fn(async () => {
          throw new Error('renderer hỏng')
        }),
        thao,
      })),
    })
    const soHopTruoc = document.querySelectorAll('[data-drt-xuat-anh]').length
    await expect(xuatPngBang('bang-1', 'So do', pt as never)).rejects.toThrow('renderer hỏng')
    expect(thao).toHaveBeenCalledTimes(1)
    expect(forceStop).toHaveBeenCalledTimes(1)
    expect(document.querySelectorAll('[data-drt-xuat-anh]').length).toBe(soHopTruoc)
  })

  it('bảng có thẻ ghi chú → vẫn tải ảnh về NHƯNG báo là thiếu, không im lặng', async () => {
    // Khối edgeless (thẻ ghi chú, ảnh chèn) không vào được ảnh — lý do đo đạc nằm ở giữa
    // `veRaCanvasThat` trong xuatAnhBang.ts. Điều ca kiểm này khoá là phần CƯ XỬ: người dùng phải
    // được BÁO ngay lúc bấm, thay vì tự phát hiện thiếu khi mở tệp ra giữa ca trực.
    const pt = dungPhuThuocGia({
      dungStd: vi.fn(async () => ({
        hopBaoNoiDung: { x: 0, y: 0, w: 800, h: 600 },
        veRaCanvas: vi.fn(async () => {
          const c = document.createElement('canvas')
          c.width = 1800
          c.height = 1400
          return { canvas: c, soKhoi: 2 }
        }),
        thao: vi.fn(),
      })),
    })
    expect(await xuatPngBang('bang-co-note', 'Co note', pt as never)).toBe('xong-thieu-the-ghi-chu')
    // Ảnh VẪN được tải về — báo thiếu không có nghĩa là bỏ lượt xuất.
    expect(pt.taiVe).toHaveBeenCalledTimes(1)
  })

  it('bảng KHÔNG có khối nào → trả "xong" trơn, không có cảnh báo thừa', async () => {
    const pt = dungPhuThuocGia()
    expect(await xuatPngBang('bang-1', 'So do', pt as never)).toBe('xong')
  })

  it('hai lượt xuất chồng nhau: lượt sau bị từ chối thay vì mở hai bảng ngầm cùng lúc', async () => {
    // Hai TestWorkspace cùng chạm một CSDL IndexedDB là công thức cho ghi đè chéo. Bấm nút hai
    // lần liên tiếp là thao tác bình thường của người dùng, không phải ca hiếm.
    let giai: (() => void) | undefined
    const pt = dungPhuThuocGia({
      moBang: vi.fn(async () => {
        await new Promise<void>((r) => {
          giai = r
        })
        return { workspace: { forceStop: vi.fn() }, store: {}, doc: { loaded: true } }
      }),
    })
    const dau = xuatPngBang('bang-1', 'So do', pt as never)
    expect(await xuatPngBang('bang-2', 'So do 2', pt as never)).toBe('dang-ban')
    giai?.()
    await dau
  })
})
