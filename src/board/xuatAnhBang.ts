// Xuất PNG THẬT của một sơ đồ — dựng lại TỪ MÔ HÌNH của BẢNG ĐANG MỞ, không đóng gói lại ảnh chụp
// màn hình.
//
// ─── Vì sao module này tồn tại ───────────────────────────────────────────────────────────────
// Cơ chế cũ nhất chỉ vẽ lại `BangMeta.anhXemTruoc` (ảnh chụp CANVAS KHUNG NHÌN, 480×360 JPEG q=0.6)
// lên <canvas> rồi `toDataURL`. Ba lỗi người dùng báo (2026-08-30) đều là hệ quả trực tiếp của đúng
// quyết định đó: khung ảnh đổi theo pan/zoom (ảnh CHÍNH LÀ khung nhìn), chất lượng bệt (0,17 MP +
// JPEG), thẻ ở lưới tái hiện nét vẽ (cùng ảnh chụp làm thumbnail). Sửa = đổi NGUỒN: đóng khung theo
// `gfx.elementsBound` (hộp bao NỘI DUNG suy từ MÔ HÌNH) rồi vẽ lại ở tỉ lệ tuỳ ý — độc lập hoàn
// toàn với chỗ người dùng đang nhìn.
//
// Bản kế tiếp mở một bảng NGẦM (ngoài màn hình) để xuất từ LƯỚI. Bỏ 2026-08-31 (phản hồi chủ dự
// án): trình soạn thảo ngầm KHÔNG BAO GIỜ render khối note nên thẻ ghi chú không bao giờ vào được
// ảnh. Nút xuất nay sống Ở MÀN VẼ (BoardGallery.tsx), xuất từ chính `std`/host của bảng người dùng
// đang mở.
//
// ─── Vì sao lớp KHỐI (thẻ ghi chú, ảnh chèn) KHÔNG vào được ảnh ──────────────────────────────
// Khối edgeless là DOM thật, không phải nội dung canvas — cách duy nhất đưa chúng vào ảnh là
// `html2canvas`. Đã thử NHIỀU hướng (mở bảng ngầm, chụp lớp nền bảng đang mở) và BỎ:
//   • html2canvas nhân bản cả tài liệu kèm ~298 thẻ <style> mà chunk bảng vẽ tiêm vào <head> cho
//     MỖI lượt gọi, và làm phần lớn việc đó ĐỒNG BỘ trên luồng chính — đo 2026-08-31 trên bảng
//     đang mở có 1 note: TREO >36s, một `Promise.race` với timeout cũng không cứu được vì
//     `setTimeout` không chạy khi luồng chính bị chẹn.
//   • `foreignObjectRendering: true` không cứu (8,6s, đo 2026-08-30).
// Chọn ĐÚNG-VÀ-NHANH cho phần LÀM ĐƯỢC: phần tử canvas (nét vẽ, hình, đường nối, chữ, node mindmap)
// là toàn bộ chất liệu của một sơ đồ tư duy và vẽ được từ mô hình trong vài chục ms. Bảng CÓ khối
// thì `xuatPngBang` trả `'xong-thieu-the-ghi-chu'` để người dùng được BÁO ngay lúc bấm, thay vì tự
// phát hiện thiếu khi mở tệp ra giữa ca trực. Xem HANDOFF §1.1 cho lịch sử đầy đủ.
//
// ─── Vì sao KHÔNG gọi thẳng `ExportManager.edgelessToCanvas()` ───────────────────────────────
// Cây vendored CÓ sẵn `ExportManager`, nhưng `edgelessToCanvas()` mở đầu bằng
// `rootComponent.querySelector('.drt-block-children-container')` và `return` ngay nếu không thấy —
// mà root edgeless bản này KHÔNG BAO GIỜ dựng phần tử đó (đo 2026-08-30). Nên hàm đó trả `undefined`
// 100% lượt gọi, âm thầm. D11 cấm sửa `src/vendor/`, nên phần dựng ảnh dưới đây tự ghép từ những
// mảnh CÔNG KHAI đã kiểm chứng: `CanvasRenderer.getCanvasByBound(bound, elements)` + màu nền đọc từ
// `.edgeless-background` đang áp. Thứ tự vẽ (nền → phần tử canvas) và đệm 50px giữ đúng như
// `edgelessToCanvas` để nếu thượng nguồn sửa lỗi kia thì quay lại dùng hàm gốc là phép thay thế thẳng.
//
// D11: KHÔNG sửa gì trong src/vendor/. Module này chỉ GỌI API công khai của cây vendored.

export type HopBao = { x: number; y: number; w: number; h: number }

/** Kết quả một lượt xuất — bên gọi (BoardGallery.tsx) dùng để chọn thông báo. */
export type KetQuaXuat = 'xong' | 'xong-thieu-the-ghi-chu' | 'trong' | 'dang-ban'

// Tỉ lệ TUYỆT ĐỐI (không nhân devicePixelRatio của máy): sơ đồ 1200×900pt luôn ra ảnh ~2400×1800px
// dù xuất từ máy DPR 1 hay iPhone DPR 3. Tệp xuất ra đem đi in/chiếu/gửi — không được phụ thuộc màn
// hình của người bấm nút.
export const TI_LE_XUAT_MAC_DINH = 2

// Trần <canvas> của trình duyệt. iOS Safari chặt nhất: vượt trần thì canvas ra RỖNG/ĐEN mà KHÔNG
// ném lỗi — đúng loại hỏng âm thầm module này tồn tại để diệt, nên phải tự hạ tỉ lệ trước.
export const DIEN_TICH_TOI_DA = 16_777_216
export const CANH_TOI_DA = 8192

// `ExportManager._createCanvas()` cộng 100px vào MỖI chiều (đệm 50px bốn phía) trước khi nhân tỉ
// lệ. Phép tính trần phải tính cả phần đệm đó.
const DEM_XUAT = 100

// Biên an toàn 0,5% cho hai phép chia sát trần — số dấu phẩy động chạm đúng biên có thể nhích lên
// vài ulp, và trần canvas là loại "vượt một pixel cũng trả ảnh rỗng".
const BIEN_AN_TOAN = 0.995

// Đệm quanh nội dung, mỗi phía. Giữ đúng 50px như `ExportManager._createCanvas`.
const DEM_MOI_PHIA = 50

/**
 * Tỉ lệ pixel dùng được cho một hộp bao, đã kẹp xuống dưới cả hai trần canvas. Không bao giờ NÂNG
 * quá `tiLeMongMuon`: phóng to hơn mức đó chỉ tạo pixel nội suy.
 */
export function tinhTiLeXuat(
  hopBao: { w: number; h: number },
  tiLeMongMuon: number = TI_LE_XUAT_MAC_DINH,
  gioiHan: { dienTich: number; canh: number } = { dienTich: DIEN_TICH_TOI_DA, canh: CANH_TOI_DA },
): number {
  const rong = Math.max(1, hopBao.w + DEM_XUAT)
  const cao = Math.max(1, hopBao.h + DEM_XUAT)
  // Hai trần kiểm ĐỘC LẬP: một sơ đồ 9000×200 lọt trần diện tích nhưng vẫn vượt trần cạnh.
  const theoCanh = Math.min(gioiHan.canh / rong, gioiHan.canh / cao)
  const theoDienTich = Math.sqrt(gioiHan.dienTich / (rong * cao))
  return Math.min(tiLeMongMuon, Math.min(theoCanh, theoDienTich) * BIEN_AN_TOAN)
}

/**
 * Chạy `viec()` với `window.devicePixelRatio` bị đặt tạm thành `tiLe`, rồi TRẢ LẠI NGUYÊN TRẠNG.
 *
 * Cần gạt DUY NHẤT điều khiển độ phân giải mà không sửa cây vendored (D11): `CanvasRenderer
 * .getCanvasByBound()` tự đọc biến này. `finally` là BẮT BUỘC: bỏ sót thì một lượt xuất hỏng để lại
 * tỉ lệ giả cho TOÀN BỘ app tới khi tải lại trang.
 */
export async function voiTiLePixel<T>(tiLe: number, viec: () => T | Promise<T>): Promise<T> {
  const moTaGoc = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio')
  try {
    Object.defineProperty(window, 'devicePixelRatio', { value: tiLe, configurable: true })
    return await viec()
  } finally {
    if (moTaGoc) Object.defineProperty(window, 'devicePixelRatio', moTaGoc)
    else delete (window as unknown as Record<string, unknown>).devicePixelRatio
  }
}

function lamSachTenTep(ten: string): string {
  // Ký tự cấm trong tên tệp trên Windows/macOS. Tên rỗng/toàn khoảng trắng → tên mặc định, để
  // không tải về một tệp tên ".png".
  const sach = ten.replace(/[\\/:*?"<>|]/g, '_').trim()
  return sach.length > 0 ? sach : 'so-do'
}

function taiVeThat(duLieu: string, tenTep: string): void {
  const a = document.createElement('a')
  a.href = duLieu
  a.download = tenTep
  a.click()
}

// ─── Hình dạng tối thiểu của cây vendored mà module này chạm ──────────────────────────────────
// KHAI TẠI CHỖ, không import kiểu xuyên ranh giới D13 (kéo cả gói surface ra khỏi chunk nạp chậm).

type CanvasRendererLike = { getCanvasByBound(b: HopBao, els: unknown[]): HTMLCanvasElement }

export type GfxXuat = {
  readonly elementsBound: HopBao
  getElementsByBound(b: HopBao, tuyChon: { type: 'block' | 'canvas' }): unknown[]
  readonly surfaceComponent: (CanvasRendererLike & { renderer?: unknown }) | null
}

/** Bộ phụ thuộc — CHỈ để ca kiểm tiêm bản giả. App thật gọi `xuatPngBang(std, host, tenBang)`. */
export type PhuThuocXuat = {
  layGfx: (std: unknown) => GfxXuat
  /** `CanvasRenderer` của bảng đang mở, để `getCanvasByBound`. */
  layRenderer: (gfx: GfxXuat) => CanvasRendererLike | null
  taiVe: (duLieu: string, tenTep: string) => void
}

function layRendererTuGfx(gfx: GfxXuat): CanvasRendererLike | null {
  const sc = gfx.surfaceComponent
  if (!sc) return null
  if (typeof (sc as CanvasRendererLike).getCanvasByBound === 'function') return sc as CanvasRendererLike
  const r = (sc as { renderer?: CanvasRendererLike }).renderer
  return r && typeof r.getCanvasByBound === 'function' ? r : null
}

async function phuThuocThat(): Promise<PhuThuocXuat> {
  const { GfxControllerIdentifier } = await import('@blocksuite/affine/std/gfx')
  return {
    layGfx: (std) => (std as { get(id: unknown): GfxXuat }).get(GfxControllerIdentifier),
    layRenderer: layRendererTuGfx,
    taiVe: taiVeThat,
  }
}

// Khoá một-lượt-một-lúc: bấm nút hai lần liên tiếp là thao tác bình thường, và hai lượt vẽ chồng
// nhau cùng động vào `window.devicePixelRatio` (voiTiLePixel) là công thức cho ảnh hỏng.
let dangXuat = false

/**
 * Xuất PNG của bảng ĐANG MỞ. `std` + `host` là của cây Lit mà EdgelessBoard vừa mount.
 *
 * Đóng khung theo `gfx.elementsBound` (nội dung, không phải khung nhìn). Vẽ nhanh (~vài chục ms),
 * không chờ, không đụng khung nhìn của người dùng.
 *
 * `pt` CHỈ để ca kiểm tiêm — app thật gọi ba đối số.
 */
export async function xuatPngBang(
  std: unknown,
  host: HTMLElement,
  tenBang: string,
  pt?: PhuThuocXuat,
): Promise<KetQuaXuat> {
  if (dangXuat) return 'dang-ban'
  dangXuat = true
  try {
    const p = pt ?? (await phuThuocThat())
    const gfx = p.layGfx(std)
    const bao = gfx.elementsBound
    // Bảng chưa vẽ gì: xuất PNG toàn màu nền còn TỆ HƠN không xuất — người dùng tưởng đã lưu được
    // sơ đồ. Bên gọi hiện thông báo thay vì tải tệp vô nghĩa về máy.
    if (!(bao.w > 0 && bao.h > 0)) return 'trong'

    const renderer = p.layRenderer(gfx)
    if (!renderer || typeof renderer.getCanvasByBound !== 'function') {
      throw new Error('xuatPngBang: khối surface không có CanvasRenderer để vẽ')
    }
    const soKhoi = (gfx.getElementsByBound(bao, { type: 'block' }) as unknown[]).length

    const canvas = await voiTiLePixel(tinhTiLeXuat(bao), () => ghepCanvas(bao, gfx, renderer, host))
    p.taiVe(canvas.toDataURL('image/png'), `${lamSachTenTep(tenBang)}.png`)
    return soKhoi > 0 ? 'xong-thieu-the-ghi-chu' : 'xong'
  } finally {
    dangXuat = false
  }
}

/**
 * Ghép canvas cuối: nền → lớp canvas (nét vẽ, hình, đường nối, chữ, node mindmap, qua
 * `getCanvasByBound`). Gọi BÊN TRONG `voiTiLePixel` nên `window.devicePixelRatio` ở đây đã là tỉ lệ
 * xuất.
 */
function ghepCanvas(
  bao: HopBao,
  gfx: GfxXuat,
  renderer: CanvasRendererLike,
  host: HTMLElement,
): HTMLCanvasElement {
  const tiLe = window.devicePixelRatio || 1
  const rongLogic = bao.w + DEM_MOI_PHIA * 2
  const caoLogic = bao.h + DEM_MOI_PHIA * 2

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(rongLogic * tiLe)
  canvas.height = Math.ceil(caoLogic * tiLe)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('xuatPngBang: không lấy được ngữ cảnh 2D')
  ctx.scale(tiLe, tiLe)

  // Màu nền đọc từ `.edgeless-background` ĐANG ÁP — cùng nguồn sự thật với thứ người dùng thấy, tự
  // đúng theo `data-theme`. Dự phòng trắng: PNG trong suốt dán vào slide/Word ăn theo nền tối chỗ
  // dán, chữ đen biến mất.
  const nen = host.querySelector('.edgeless-background')
  const mauNen = nen ? getComputedStyle(nen).backgroundColor : ''
  ctx.fillStyle = mauNen && mauNen !== 'rgba(0, 0, 0, 0)' ? mauNen : '#ffffff'
  ctx.fillRect(0, 0, rongLogic, caoLogic)

  const phanTu = gfx.getElementsByBound(bao, { type: 'canvas' })
  const canvasSurface = renderer.getCanvasByBound(bao, phanTu)
  if (canvasSurface.width > 0 && canvasSurface.height > 0) {
    ctx.drawImage(canvasSurface, DEM_MOI_PHIA, DEM_MOI_PHIA, bao.w, bao.h)
  }

  return canvas
}
