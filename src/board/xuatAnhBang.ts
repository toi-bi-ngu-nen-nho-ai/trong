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
// ─── Lớp KHỐI (thẻ ghi chú, ảnh chèn) ────────────────────────────────────────────────────────
// Khối edgeless là DOM thật, không phải nội dung canvas. Bốn lượt đầu đều cố đưa chúng vào ảnh
// bằng `html2canvas` và đều tắc — lượt cuối (chụp lớp nền của bảng ĐANG MỞ) treo >36 giây cho đúng
// một thẻ ghi chú, vì html2canvas nhân bản cả tài liệu kèm ~298 thẻ <style> và làm phần lớn việc
// đó ĐỒNG BỘ trên luồng chính. Bỏ hẳn hướng đó.
// Cách đang dùng: `./ve-khoi-len-canvas.ts` ĐỌC LẠI layout mà trình duyệt đã tính xong (rect của
// nền thẻ, `Range` cho từng dòng chữ, `<img>` đã tải) rồi vẽ thẳng lên canvas xuất — vài mili-giây,
// không nhân bản gì. Khối chỉ render khi nằm TRONG khung nhìn (edgeless cull khối ngoài khung), nên
// lượt xuất fit khung nhìn ôm trọn nội dung, ĐỌC, rồi TRẢ LẠI khung cũ.
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

import { docLopKhoi, napBieuTuong, veLopKhoi, type MoTaLopKhoi } from './ve-khoi-len-canvas'

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

// Trần chờ lớp khối hiện ra sau khi fit khung nhìn. BlockSuite chia lô `maxConcurrentRenders` khối
// mỗi khung hình, nên một sơ đồ nhiều thẻ cần vài chục khung — 1,5 giây là hào phóng cho ca đó.
// Hết giờ vẫn ĐỌC tiếp: xấu nhất là thiếu thẻ ghi chú VÀ người dùng được báo, còn hơn treo nút.
const HAN_CHO_KHOI_HIEN_MS = 1500
const NHIP_CHO_MS = 32

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

/** Phần `Viewport` cần cho lượt fit-rồi-trả-lại. Tên khớp `framework/std/src/gfx/viewport.ts`. */
export type ViewportXuat = {
  readonly zoom: number
  readonly centerX: number
  readonly centerY: number
  toModelCoord(x: number, y: number): [number, number]
  setViewportByBound(bound: HopBao, padding?: [number, number, number, number], smooth?: boolean): void
  /**
   * `center` là `IVec` — MẢNG `[x, y]`, KHÔNG phải `{x, y}`. Thượng nguồn đọc thẳng `newCenter[0]`
   * / `newCenter[1]` (`framework/std/src/gfx/viewport.ts`), nên truyền object sẽ gán
   * `_center.x = undefined` mà KHÔNG ném lỗi: `centerX`/`centerY`/`viewportBounds` thành undefined
   * và khung nhìn của người dùng hỏng âm thầm sau mỗi lượt xuất. Đã đo đúng lỗi này 2026-08-31.
   */
  setViewport(zoom: number, center: [number, number], smooth?: boolean): void
}

export type GfxXuat = {
  readonly elementsBound: HopBao
  getElementsByBound(b: HopBao, tuyChon: { type: 'block' | 'canvas' }): unknown[]
  readonly surfaceComponent: (CanvasRendererLike & { renderer?: unknown }) | null
  readonly viewport: ViewportXuat
}

/** Bộ phụ thuộc — CHỈ để ca kiểm tiêm bản giả. App thật gọi `xuatPngBang(std, host, tenBang)`. */
export type PhuThuocXuat = {
  layGfx: (std: unknown) => GfxXuat
  /** `CanvasRenderer` của bảng đang mở, để `getCanvasByBound`. */
  layRenderer: (gfx: GfxXuat) => CanvasRendererLike | null
  /** Phần tử DOM của một khối theo id — `std.view.getBlock(id)`. */
  layPhanTuKhoi: (std: unknown, id: string) => Element | null
  /**
   * Chờ tới khi `xong()` đúng, hoặc hết hạn giờ. Ca kiểm tiêm bản trả về ngay.
   *
   * KHÔNG phải "chờ N khung hình": BlockSuite hoãn lượt render ĐẦU TIÊN của mỗi khối qua
   * `requestAnimationFrame` và chia lô `maxConcurrentRenders` khối mỗi khung
   * (`framework/std/src/gfx/viewport-element.ts`, `scheduleUpdateChildren`). Một sơ đồ nhiều thẻ
   * cần NHIỀU khung hình mới hiện đủ, và số khung đó không đoán trước được — nên phải kiểm THẲNG
   * trạng thái muốn có, đúng cách `doiNoiDungToi()` ở EdgelessBoard.tsx đã làm cho subdoc.
   */
  choKhoiHien: (xong: () => boolean) => Promise<void>
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
    layPhanTuKhoi: (std, id) =>
      (std as { view: { getBlock(id: string): Element | null } }).view.getBlock(id),
    // Nhịp chờ đi bằng `setTimeout`, KHÔNG bằng `requestAnimationFrame`: rAF không chạy khi tài
    // liệu đang ẩn (tab ở nền, cửa sổ thu nhỏ, pane bị giấu — Page Visibility tạm dừng vòng lặp
    // render). Chờ bằng rAF thì lượt xuất treo VĨNH VIỄN đúng ở đó: nút kẹt ở "Đang dựng ảnh…",
    // không lỗi nào được ném, không gì để gỡ. Đo được 2026-08-31 (rAF im lặng suốt 1007ms).
    // Trên tài liệu đang ẩn, khối cũng không bao giờ render được — nên hết hạn giờ ta ĐI TIẾP và
    // báo "thiếu thẻ ghi chú", thay vì đứng chờ một điều không thể tới.
    choKhoiHien: (xong) =>
      new Promise((r) => {
        const hetHan = Date.now() + HAN_CHO_KHOI_HIEN_MS
        const nhip = () => {
          if (xong() || Date.now() >= hetHan) return r()
          setTimeout(nhip, NHIP_CHO_MS)
        }
        nhip()
      }),
    taiVe: taiVeThat,
  }
}

/**
 * Khối đã dựng xong thân thẻ hay chưa. `edgeless-note-background` chỉ có mặt sau khi component Lit
 * hoàn tất lượt render đầu — mà lượt đó bị BlockSuite hoãn qua rAF và chia lô theo khung hình
 * (`framework/std/src/gfx/viewport-element.ts`, `scheduleUpdateChildren`), nên đây là tín hiệu
 * THẬT duy nhất, không suy ra được từ lớp CSS hay số khung hình đã trôi qua.
 */
function daRender(el: Element): boolean {
  return el.querySelector('edgeless-note-background') !== null
}

// Khoá một-lượt-một-lúc: bấm nút hai lần liên tiếp là thao tác bình thường, và hai lượt vẽ chồng
// nhau cùng động vào `window.devicePixelRatio` (voiTiLePixel) là công thức cho ảnh hỏng.
let dangXuat = false

/**
 * Xuất PNG của bảng ĐANG MỞ. `std` + `host` là của cây Lit mà EdgelessBoard vừa mount.
 *
 * Đóng khung theo `gfx.elementsBound` (nội dung, không phải khung nhìn).
 *
 * KHÔNG đụng khung nhìn của người dùng khi mọi khối đã render — đó là đường thường gặp nhất (xuất
 * đúng thứ đang nhìn) và khối đã render thì đọc được rect ngay. Chỉ khi còn khối CHƯA render (bị
 * cull vì nằm ngoài khung) mới fit tạm rồi trả lại khung cũ.
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
  let vp: ViewportXuat | undefined
  let khungCu: { zoom: number; x: number; y: number } | undefined
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

    // ── Đọc lớp khối (thẻ ghi chú, ảnh) ────────────────────────────────────────────────────
    const khoiModels = gfx.getElementsByBound(bao, { type: 'block' }) as Array<{ id: string }>
    let moTaKhoi: MoTaLopKhoi | undefined
    let soKhoiThieu = 0
    if (khoiModels.length > 0) {
      const els = khoiModels
        .map((m) => p.layPhanTuKhoi(std, m.id))
        .filter((el): el is Element => el !== null)
      const daRenderHet = els.length === khoiModels.length && els.every(daRender)

      // CHỈ dời khung nhìn khi THẬT SỰ cần. Khối đã render thì `getBoundingClientRect()` đọc được
      // ngay — kể cả phần đang nằm ngoài màn hình — nên fit lúc đó là dời bảng của người dùng mà
      // chẳng được gì. Bản trước fit VÔ ĐIỀU KIỆN: bảng thu nhỏ hết cỡ, đứng đó tới 1,5 giây chờ
      // một lượt render đã xong từ lâu, rồi nhảy về — đọc thành "màn hình cứ nhấp nháy" (phản hồi
      // thật 2026-08-31). Đo được: zoom 3,23 → 0,38 suốt 1445ms → 3,23.
      if (!daRenderHet) {
        vp = gfx.viewport
        // `centerX`/`centerY` là getter — chụp GIÁ TRỊ ngay bây giờ, không giữ tham chiếu.
        khungCu = { zoom: vp.zoom, x: vp.centerX, y: vp.centerY }
        vp.setViewportByBound(bao, [DEM_MOI_PHIA, DEM_MOI_PHIA, DEM_MOI_PHIA, DEM_MOI_PHIA], false)
        // Chờ tới khi khối THẬT SỰ dựng xong thân thẻ — không đoán theo số khung hình.
        await p.choKhoiHien(() => els.every(daRender))
      }

      moTaKhoi = docLopKhoi(els, (x, y) => gfx.viewport.toModelCoord(x, y))
      // Chấm đầu dòng / ô tick / mũi gập là `<svg>` nội tuyến — giải mã thành ảnh vẽ được TRƯỚC khi
      // vào `voiTiLePixel`, để phần vẽ ở dưới ở lại đồng bộ (không giữ `devicePixelRatio` giả qua
      // một lượt await nào).
      moTaKhoi = await napBieuTuong(moTaKhoi)
      // Khối có trong mô hình mà không đọc ra được thân thẻ nào = không vào được ảnh. Báo, đừng im.
      soKhoiThieu = Math.max(0, khoiModels.length - moTaKhoi.the.length)
    }

    const canvas = await voiTiLePixel(tinhTiLeXuat(bao), () =>
      ghepCanvas(bao, gfx, renderer, host, moTaKhoi),
    )
    p.taiVe(canvas.toDataURL('image/png'), `${lamSachTenTep(tenBang)}.png`)
    return soKhoiThieu > 0 ? 'xong-thieu-the-ghi-chu' : 'xong'
  } finally {
    // Trả khung nhìn về đúng chỗ người dùng đang đứng, kể cả khi lượt vẽ ném lỗi.
    if (vp && khungCu) vp.setViewport(khungCu.zoom, [khungCu.x, khungCu.y], false)
    dangXuat = false
  }
}

/**
 * Ghép canvas cuối: nền → lớp khối (thẻ ghi chú, ảnh) → lớp canvas (nét vẽ, hình, đường nối, chữ,
 * node mindmap, qua `getCanvasByBound`). Thứ tự này giữ đúng như `edgelessToCanvas` thượng nguồn.
 * Gọi BÊN TRONG `voiTiLePixel` nên `window.devicePixelRatio` ở đây đã là tỉ lệ xuất.
 */
function ghepCanvas(
  bao: HopBao,
  gfx: GfxXuat,
  renderer: CanvasRendererLike,
  host: HTMLElement,
  moTaKhoi?: MoTaLopKhoi,
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

  // Điểm MÔ HÌNH → điểm trên canvas xuất: dời về gốc hộp bao rồi cộng đệm.
  if (moTaKhoi) {
    veLopKhoi(ctx, moTaKhoi, (x, y) => [x - bao.x + DEM_MOI_PHIA, y - bao.y + DEM_MOI_PHIA])
  }

  const phanTu = gfx.getElementsByBound(bao, { type: 'canvas' })
  const canvasSurface = renderer.getCanvasByBound(bao, phanTu)
  if (canvasSurface.width > 0 && canvasSurface.height > 0) {
    ctx.drawImage(canvasSurface, DEM_MOI_PHIA, DEM_MOI_PHIA, bao.w, bao.h)
  }

  return canvas
}
