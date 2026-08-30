// Xuất PNG THẬT của một sơ đồ: dựng lại ảnh TỪ TÀI LIỆU CRDT đã lưu, không phải đóng gói lại một
// ảnh chụp màn hình.
//
// ─── Vì sao module này tồn tại ───────────────────────────────────────────────────────────────
// Trước lượt sửa này, "Xuất PNG" ở menu "⋯" của thẻ chỉ vẽ lại `BangMeta.anhXemTruoc` — một ảnh
// chụp CANVAS KHUNG NHÌN lúc rời bảng, ép xuống 480×360 rồi mã hoá JPEG q=0.6 — lên một <canvas>
// và gọi `toDataURL('image/png')`. Ba lỗi người dùng báo (2026-08-30) đều là hệ quả trực tiếp của
// đúng một quyết định đó, không phải ba lỗi rời rạc:
//   • Khung ảnh đổi theo pan/zoom: ảnh CHÍNH LÀ khung nhìn, nên nhìn đâu xuất ra đó.
//   • Chất lượng bệt: 0,17 MP + JPEG 0.6; lượt bọc PNG sau đó chỉ đóng đinh artefact JPEG lại
//     vĩnh viễn chứ không khôi phục được gì (PNG ở đó chỉ là cái vỏ).
//   • Thẻ ở lưới tái hiện nét vẽ thay vì icon chuyên khoa: cùng một ảnh chụp đó làm thumbnail.
// Vì thế cách sửa KHÔNG phải nâng 480×360 lên số to hơn — nguồn vẫn sẽ là canvas khung nhìn ở độ
// phân giải màn hình, và khung vẫn sai. Phải đổi NGUỒN.
//
// Cách sửa: đóng khung theo `gfx.elementsBound` — hộp bao NỘI DUNG suy từ MÔ HÌNH, không đọc
// viewport một dòng nào — rồi vẽ lại ở tỉ lệ tuỳ ý. Tài liệu là CRDT vector còn nguyên trong
// IndexedDB (xem diTruBangCu.ts) nên dựng lại ở độ phân giải nào cũng được, không mất mát.
//
// ─── Vì sao KHÔNG gọi thẳng `ExportManager.edgelessToCanvas()` ───────────────────────────────
// Cây vendored CÓ sẵn `ExportManager` (affine/blocks/surface/src/extensions/export-manager), được
// `SurfaceViewExtension` đăng ký trong mọi bảng đang mở. Nhưng `edgelessToCanvas()` của nó mở đầu
// bằng `rootComponent.querySelector('.affine-block-children-container')` (sau bước đổi tên D16 là
// `.drt-block-children-container`) và `return` ngay nếu không thấy — mà root edgeless của bản
// vendored này KHÔNG BAO GIỜ dựng phần tử đó. Đo trên bản build 2026-08-30: `<drt-edgeless-root>`
// chỉ có `.edgeless-background`, `.drt-edgeless-surface-block-container`, `.edgeless-mount-point`
// và `.widgets-container` — kể cả sau khi thêm một khối note. Nên hàm đó trả `undefined` 100%
// lượt gọi, âm thầm. D11 cấm sửa `src/vendor/`, vì vậy phần dựng ảnh dưới đây tự ghép lại từ
// những mảnh CÔNG KHAI và ĐÃ KIỂM CHỨNG là chạy được:
//   • `CanvasRenderer.getCanvasByBound(bound, elements)` — nét vẽ, hình, đường nối, node mindmap;
//   • `html2canvas` trên từng component khối — thẻ ghi chú, ảnh chèn;
//   • màu nền lấy từ `.edgeless-background` đang áp, không tự chế bảng màu thứ hai.
// Thuật toán ghép (đệm 50px bốn phía, thứ tự vẽ, gốc toạ độ) giữ ĐÚNG như `edgelessToCanvas` để
// nếu thượng nguồn sửa lỗi kia thì việc quay lại dùng hàm gốc là một phép thay thế thẳng.
//
// Đánh đổi đã chấp nhận: xuất từ LƯỚI nên phải mở bảng ngầm (mount một trình soạn thảo ngoài màn
// hình) — tốn vài trăm ms và cần trạng thái "đang xuất" ở nút. Đổi lại người dùng không phải vào
// bảng rồi thoát ra chỉ để làm mới một ảnh chụp, và nút xuất vẫn ở đúng chỗ chủ dự án đã chốt
// (menu "⋯" của thẻ, phản hồi 2026-08-27).
//
// D11: KHÔNG sửa gì trong src/vendor/. Module này chỉ GỌI API công khai của cây vendored.
import { resolveTheme } from '../lib/theme'
import { batLopCssVendor } from './lop-css-vendor'

export type HopBao = { x: number; y: number; w: number; h: number }

/** Kết quả một lượt xuất — bên gọi dùng để chọn thông báo, xem DanhSachBang.tsx. */
export type KetQuaXuat = 'xong' | 'xong-thieu-the-ghi-chu' | 'trong' | 'dang-ban'

// Tỉ lệ TUYỆT ĐỐI (không nhân thêm devicePixelRatio của máy): sơ đồ 1200×900pt luôn ra ảnh
// ~2400×1800px dù xuất từ máy tính DPR 1 hay iPhone DPR 3. Chọn số tuyệt đối vì tệp xuất ra là
// thứ đem đi in/chiếu/gửi đồng nghiệp — nó không được phụ thuộc màn hình của người bấm nút.
export const TI_LE_XUAT_MAC_DINH = 2

// Trần <canvas> của trình duyệt. iOS Safari là bên chặt nhất: vượt trần thì canvas ra RỖNG hoặc
// ĐEN mà KHÔNG ném lỗi nào — đúng loại hỏng âm thầm mà module này tồn tại để diệt, nên phải tự
// hạ tỉ lệ trước thay vì cầu may.
export const DIEN_TICH_TOI_DA = 16_777_216
export const CANH_TOI_DA = 8192

// `ExportManager._createCanvas()` cộng thêm 100px vào MỖI chiều (đệm 50px bốn phía) trước khi
// nhân tỉ lệ. Phép tính trần dưới đây phải tính cả phần đệm đó, nếu không sẽ ước lượng thiếu.
const DEM_XUAT = 100

// Biên an toàn 0,5% cho hai phép chia sát trần — số dấu phẩy động chạm đúng biên có thể nhích lên
// trên vài ulp, và trần canvas là loại "vượt một pixel cũng trả về ảnh rỗng".
const BIEN_AN_TOAN = 0.995

/**
 * Tỉ lệ pixel dùng được cho một hộp bao, đã kẹp xuống dưới cả hai trần canvas.
 * Không bao giờ NÂNG quá `tiLeMongMuon`: phóng to hơn mức đó chỉ tạo pixel nội suy.
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
 * Đây là cần gạt DUY NHẤT điều khiển được độ phân giải mà không sửa cây vendored (D11), và may
 * mắn là nó nhất quán: cả ba tầng vẽ đều đọc đúng biến này —
 *   • `ExportManager._createCanvas()` (khung ảnh nền + đệm),
 *   • `CanvasRenderer.getCanvasByBound()` (nét vẽ, hình, đường nối, node mindmap),
 *   • `html2canvas` (thẻ ghi chú, mặc định `scale = window.devicePixelRatio`).
 * Đặt một lần là cả ba cùng lên tỉ lệ, không lệch nhau.
 *
 * `finally` là BẮT BUỘC chứ không phải cẩn thận thừa: bỏ sót thì một lượt xuất hỏng để lại tỉ lệ
 * giả cho TOÀN BỘ app tới khi tải lại trang — hỏng lan ra ngoài phạm vi tính năng.
 */
export async function voiTiLePixel<T>(tiLe: number, viec: () => T | Promise<T>): Promise<T> {
  const moTaGoc = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio')
  try {
    Object.defineProperty(window, 'devicePixelRatio', { value: tiLe, configurable: true })
    return await viec()
  } finally {
    // Không có mô tả RIÊNG nghĩa là giá trị vốn đến từ getter kế thừa trên prototype — xoá thuộc
    // tính riêng ta vừa gắn là getter đó tự lộ lại, đúng nguyên trạng.
    if (moTaGoc) Object.defineProperty(window, 'devicePixelRatio', moTaGoc)
    else delete (window as unknown as Record<string, unknown>).devicePixelRatio
  }
}

// Hình dạng TỐI THIỂU của component surface mà module này cần: chỉ một trường `renderer`.
// `std.view.getBlock()` khai trả về `BlockComponent` chung, không có `renderer`; import kiểu
// `SurfaceBlockComponent` thật vào đây thì kéo cả gói surface ra khỏi ranh giới nạp chậm (module
// này cố ý chỉ `import()` động mọi thứ chạm cây vendored, xem `phuThuocThat`).
type BlockComponentCoRenderer = { renderer: unknown }

/** Máy xuất đã sẵn sàng cho MỘT bảng — hình dạng tối thiểu mà `xuatPngBang` cần. */
type MayXuat = {
  /** Hộp bao NỘI DUNG (`gfx.elementsBound`). 0×0 nghĩa là bảng chưa vẽ gì. */
  hopBaoNoiDung: HopBao
  veRaCanvas: (hopBao: HopBao, tiLe: number) => Promise<{ canvas: HTMLCanvasElement; soKhoi: number } | undefined>
  /** Tháo cây Lit. Workspace do bên gọi tự đóng (nó cầm tham chiếu). */
  thao: () => void
}

type PhuThuoc = {
  moBang: (boardId: string) => Promise<{
    workspace: { forceStop: () => void }
    store: unknown
    /** `loaded` = nội dung subdoc ĐÃ được áp vào doc. Xem `doiNoiDungToi` để biết vì sao cần. */
    doc: { loaded: boolean } | null
  }>
  dungStd: (store: unknown, hop: HTMLElement, doc: { loaded: boolean } | null) => Promise<MayXuat>
  taiVe: (duLieu: string, tenTep: string) => void
}

// Ký tự cấm trong tên tệp trên Windows/macOS — cùng luật mà nút xuất cũ đã dùng, giữ nguyên để
// tên tệp không đổi kiểu giữa hai phiên bản.
function lamSachTenTep(ten: string): string {
  return ten.replace(/[\\/:*?"<>|]/g, '_')
}

function taiVeThat(duLieu: string, tenTep: string): void {
  const a = document.createElement('a')
  a.href = duLieu
  a.download = tenTep
  a.click()
}

// Hạn giờ chờ trình soạn thảo ngoài màn hình gắn xong. Rộng rãi so với thực tế (vài trăm ms) vì
// máy yếu mở một sơ đồ lớn có thể lâu hơn — nhưng HỮU HẠN, để một bảng hỏng không treo nút xuất
// vĩnh viễn (khoá `dangXuat` bên dưới chỉ mở lại trong `finally`).
const HAN_GIO_SAN_SANG_MS = 15_000

// Sau khi cây Lit đã gắn, ĐỢI THÊM chừng này cho phần tử canvas hiện ra trong mô hình.
//
// Cần một hạn giờ RIÊNG vì không có tín hiệu dứt khoát nào cho "đã nạp hết phần tử": `doc.loaded`
// bật ngay khi subdoc Y.Doc được đánh dấu nạp, TRƯỚC khi `SurfaceBlockModel` kịp dựng
// `elementModels` từ Y.Map của nó (đo thật 2026-08-30 trên bản build: cả lượt xuất xong dưới
// 800ms và báo "chưa có nội dung" cho một bảng có 4 phần tử, mở lại vẫn thấy đủ).
// Và KHÔNG thể đợi vô hạn: bảng trống thật thì hộp bao 0×0 là câu trả lời ĐÚNG, đợi mãi sẽ treo.
// 3 giây là hào phóng cho một lượt giải mã cục bộ, còn bảng trống chỉ tốn đúng 3 giây đó một lần.
const HAN_GIO_NOI_DUNG_MS = 3_000

// Đệm quanh nội dung, mỗi phía. Giữ đúng 50px như `ExportManager._createCanvas` để hai đường vẽ
// cho ra khung hình giống hệt nhau nếu sau này quay lại dùng hàm thượng nguồn.
const DEM_MOI_PHIA = 50

/** Hình dạng tối thiểu của một khối gfx mà bước vẽ cần — `xywh` là chuỗi JSON `[x,y,w,h]`. */
type KhoiGfx = { id: string; xywh: string }

/**
 * Ghép canvas cuối cùng: nền → khối (note/ảnh) → phần tử canvas (nét vẽ, hình, đường nối).
 *
 * Gọi BÊN TRONG `voiTiLePixel`, nên `window.devicePixelRatio` ở đây đã là tỉ lệ xuất mong muốn —
 * `getCanvasByBound` tự đọc biến đó, ta chỉ cần dùng đúng nó cho canvas nền.
 *
 * Trả kèm `soKhoi` = số khối (thẻ ghi chú/ảnh) nằm trong khung nhưng KHÔNG vào được ảnh; xem lý do
 * dài ở giữa hàm.
 */
async function veRaCanvasThat(
  bao: HopBao,
  renderer: { getCanvasByBound?: (b: HopBao, els: unknown[]) => HTMLCanvasElement },
  gfx: {
    getElementsByBound: (b: HopBao, tuyChon: { type: 'block' | 'canvas' }) => unknown[]
  },
  hop: HTMLElement,
): Promise<{ canvas: HTMLCanvasElement; soKhoi: number }> {
  const tiLe = window.devicePixelRatio || 1
  const rongLogic = bao.w + DEM_MOI_PHIA * 2
  const caoLogic = bao.h + DEM_MOI_PHIA * 2

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(rongLogic * tiLe)
  canvas.height = Math.ceil(caoLogic * tiLe)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('xuatPngBang: không lấy được ngữ cảnh 2D')
  ctx.scale(tiLe, tiLe)

  // Màu nền đọc từ `.edgeless-background` ĐANG ÁP trong hộp chứa — cùng nguồn sự thật với thứ
  // người dùng nhìn thấy, và tự đúng theo `data-theme` đã đặt trên hộp. Dự phòng trắng cho trường
  // hợp phần tử đó đổi tên ở thượng nguồn: thà nền trắng còn hơn nền TRONG SUỐT, vì PNG trong suốt
  // dán vào slide/Word sẽ ăn theo nền tối của chỗ dán và chữ đen biến mất.
  const nen = hop.querySelector('.edgeless-background')
  const mauNen = nen ? getComputedStyle(nen).backgroundColor : ''
  ctx.fillStyle = mauNen && mauNen !== 'rgba(0, 0, 0, 0)' ? mauNen : '#ffffff'
  ctx.fillRect(0, 0, rongLogic, caoLogic)

  // ─── Vì sao KHÔNG rasterize khối (thẻ ghi chú, ảnh chèn) ────────────────────────────────────
  // Khối edgeless là DOM thật, không phải nội dung canvas, nên cách duy nhất đưa chúng vào ảnh là
  // `html2canvas` — chính thứ `ExportManager` dùng. Đã thử và BỎ vì GIÁ THỜI GIAN, không phải vì
  // nó sai: đo trên một thẻ ghi chú THẬT (tạo bằng thanh công cụ, 400×92, dev build, máy để bàn)
  // được 7,9s → 6,9s → 4,6s cho ba lượt liên tiếp — ấm dần rồi chạm đáy khoảng 5 GIÂY MỖI KHỐI.
  // Một sơ đồ 5 thẻ ghi chú là ~25 giây cho một mục menu; trên điện thoại còn tệ hơn.
  // `foreignObjectRendering: true` KHÔNG cứu được (8,6s, đo cùng lượt). Nguyên nhân là html2canvas
  // nhân bản cả tài liệu kèm ~298 thẻ <style> mà chunk bảng vẽ tiêm vào <head>, cho MỖI lượt gọi.
  // Bẫy khi đo lại: (a) khối tạo bằng `store.addBlock()` trần KHÔNG render (`visibility:hidden`,
  // rỗng) nên mọi số đo trên nó đều vô nghĩa — phải tạo thẻ bằng thanh công cụ thật; (b) edgeless
  // CULL khối ngoài khung nhìn, khối bị cull đo ra 0×0 và html2canvas trả canvas rỗng.
  // Hướng "MỘT lượt html2canvas cho cả lớp khối" ĐÃ THỬ và bỏ (cùng ngày): phần chi phí thì giải
  // xong hẳn — một lượt chụp phần tử viewport kèm `ignoreElements` cắt <canvas> và mọi cây widget
  // đo được 1272ms nguội / 387-568ms ấm, và trên BẢNG ĐANG MỞ nó chụp đúng thẻ ghi chú kèm chữ.
  // Nhưng đường xuất mở bảng NGẦM, và trình soạn thảo ngầm KHÔNG BAO GIỜ render khối note:
  // `<drt-edgeless-note>` lên `block-active` mà `offsetWidth` vẫn 0 và `children.length` = 0 suốt
  // 1,5 giây. Đã loại: hộp chứa ngoài màn, chờ lâu hơn, pane bị ẩn, viewport chưa khớp hộp bao.
  // Chặn nằm ở KIẾN TRÚC, không phải tham số — xem HANDOFF mục 1.2 cho hai hướng còn lại.
  // Chọn ĐÚNG-VÀ-NHANH thay vì ĐỦ-NHƯNG-TREO: phần tử canvas (nét vẽ, hình, đường nối, chữ, node
  // mindmap) là toàn bộ chất liệu của một sơ đồ tư duy và vẽ được từ mô hình trong vài chục ms.
  // Bảng CÓ khối thì `xuatPngBang` trả 'xong-thieu-the-ghi-chu' để người dùng được BÁO, không phải
  // tự phát hiện thiếu khi mở tệp ra.
  const soKhoi = (gfx.getElementsByBound(bao, { type: 'block' }) as KhoiGfx[]).length

  const phanTu = gfx.getElementsByBound(bao, { type: 'canvas' })
  const canvasSurface = renderer.getCanvasByBound!(bao, phanTu)
  if (canvasSurface.width > 0 && canvasSurface.height > 0) {
    ctx.drawImage(canvasSurface, DEM_MOI_PHIA, DEM_MOI_PHIA, bao.w, bao.h)
  }

  return { canvas, soKhoi }
}

async function phuThuocThat(): Promise<PhuThuoc> {
  // PHẢI đứng TRƯỚC mọi `import()` chạm cây vendored: chunk bảng vẽ tiêm ~190 thẻ <style> vào
  // <head> ngay khi nạp, và bộ theo dõi của lop-css-vendor.ts chỉ bọc được thẻ rơi vào SAU khi nó
  // chạy. Không bọc thì CSS BlockSuite đè mọi utility Tailwind của app — hỏng cả những màn không
  // liên quan (xem ./lop-css-vendor.ts). Cùng lý do và cùng thứ tự với `layBang()` ở ./index.tsx.
  batLopCssVendor()

  const [mangBang, mangStd, mangGfx, mangSurface, mangLit] = await Promise.all([
    import('./EdgelessBoard'),
    import('@blocksuite/affine/std'),
    import('@blocksuite/affine/std/gfx'),
    import('@blocksuite/affine/blocks/surface'),
    import('lit'),
  ])
  const { taoHoacMoBang, layExtensionsEdgeless } = mangBang
  const { BlockStdScope } = mangStd
  const { GfxControllerIdentifier } = mangGfx
  void mangSurface
  const { render: litRender } = mangLit

  return {
    // `khongSeed`: đường xuất KHÔNG được tạo nội dung. Xem chú thích dài tại chính tuỳ chọn đó
    // trong EdgelessBoard.tsx — bỏ nó là quay lại lỗi làm hỏng tài liệu (2 root, 2 surface).
    moBang: async (boardId) => {
      const kq = await taoHoacMoBang(boardId, { khongSeed: true })
      return { ...kq, doc: kq.workspace.getDoc(boardId) }
    },

    dungStd: async (store, hop, doc) => {
      // KHÔNG thêm `ExportManagerExtension` vào đây. `SurfaceViewExtension` (đã có trong
      // ./extensions.ts) tự đăng ký nó rồi — xem affine/blocks/surface/src/view.ts dòng 31 — nên
      // thêm lần nữa là `Error: Service [ExportManager] already exists` ném ngay lúc dựng scope.
      // Đã đâm đúng lỗi này khi kiểm tay trên trình duyệt thật 2026-08-30; ca kiểm happy-dom không
      // bắt được vì phần điều phối chạy với bộ phụ thuộc giả.
      // Nói cách khác: máy xuất vẫn LUÔN sống trong mọi bảng đang mở từ trước tới nay — app chỉ
      // chưa bao giờ gọi tới nó.
      const std = new BlockStdScope({
        store: store as ConstructorParameters<typeof BlockStdScope>[0]['store'],
        extensions: layExtensionsEdgeless(),
      })
      litRender(std.render(), hop)

      // Đợi tài liệu nạp xong VÀ cây Lit gắn THẬT. Hai việc khác nhau, cả hai đều bất đồng bộ:
      //  • `store.root` null cho tới khi subdoc về (xem `khongSeed` ở EdgelessBoard.tsx);
      //  • khối surface chỉ vào `std.view` sau khi component Lit của nó render.
      // Hỏi sớm là được hộp bao rỗng và xuất ra ảnh trắng — đúng lớp lỗi âm thầm đang sửa, nên
      // phải chờ trạng thái THẬT chứ không phải một `setTimeout` đoán mò.
      const batDau = Date.now()
      const gfx = std.get(GfxControllerIdentifier)
      let khoiSurface: BlockComponentCoRenderer | null = null
      for (;;) {
        // `doc.loaded` là tín hiệu THẬT cho "nội dung subdoc đã áp xong" (TestDoc._onSubdocEvent).
        // Thiếu nó, vòng lặp thoát ngay khi khối gốc + component surface có mặt — nhưng phần tử
        // canvas (nét vẽ, hình, đường nối) chưa vào mô hình, nên `elementsBound` là 0×0 và lượt
        // xuất báo "sơ đồ chưa có nội dung" cho một bảng đầy nội dung. Đo được đúng ca này khi kiểm
        // tay trên bản build 2026-08-30: mở lại bảng thì thấy đủ 4 phần tử, mà lượt xuất vẫn nói
        // trống.
        const daNap = doc ? doc.loaded : true
        const goc = daNap ? std.store.root : null
        // Lấy surface từ CHÍNH children của root, KHÔNG dùng `gfx.surface`. `gfx.surface` do
        // `onSurfaceAdded` gán và có thể bám vào một surface MỒ CÔI nếu doc từng bị seed trùng —
        // khi đó `gfx.surfaceComponent` null vĩnh viễn dù `<drt-surface>` đúng vẫn đang render
        // (đo được 2026-08-30, trước khi có `khongSeed`). Đi qua root là đường duy nhất luôn trỏ
        // vào surface mà người dùng thật sự nhìn thấy.
        const mauSurface = goc?.children.find((khoi) => khoi.flavour === 'affine:surface')
        const khoi = mauSurface ? std.view.getBlock(mauSurface.id) : null
        if (khoi) {
          khoiSurface = khoi as unknown as BlockComponentCoRenderer
          break
        }
        if (Date.now() - batDau > HAN_GIO_SAN_SANG_MS) {
          // Nêu ĐÍCH DANH tầng nào chưa lên. Một câu "không gắn xong trong hạn giờ" trần trụi buộc
          // người gỡ lỗi kế tiếp phải dựng lại toàn bộ lượt mount trong console mới biết hỏng ở
          // đâu — đúng việc đã phải làm khi dựng module này (2026-08-30).
          throw new Error(
            `xuatPngBang: bảng ngầm không gắn xong trong ${HAN_GIO_SAN_SANG_MS}ms ` +
              `(host=${Boolean(std.host)}, đãNạp=${daNap}, gốc=${Boolean(goc)}, ` +
              `mẫuSurface=${Boolean(mauSurface)})`,
          )
        }
        await new Promise((r) => setTimeout(r, 50))
      }

      // Đợi hộp bao THẬT xuất hiện. Thoát sớm ngay khi có nội dung (trường hợp thường gặp), chỉ
      // bảng trống mới chờ hết hạn giờ.
      const batDauNoiDung = Date.now()
      while (Date.now() - batDauNoiDung < HAN_GIO_NOI_DUNG_MS) {
        const thu = gfx.elementsBound
        if (thu.w > 0 && thu.h > 0) break
        await new Promise((r) => setTimeout(r, 50))
      }

      const bao = gfx.elementsBound
      return {
        hopBaoNoiDung: { x: bao.x, y: bao.y, w: bao.w, h: bao.h },
        veRaCanvas: async (hopBao, tiLe) => {
          const renderer = khoiSurface.renderer as
            | { getCanvasByBound?: (b: HopBao, els: unknown[]) => HTMLCanvasElement }
            | undefined
          // Kiểm theo HÌNH DẠNG, không dùng `instanceof CanvasRenderer`: module này nạp gói surface
          // qua `import()` riêng, và nếu bộ đóng gói phát ra hai bản sao của lớp đó thì `instanceof`
          // sai dù đối tượng hoàn toàn đúng — hỏng âm thầm, chỉ lộ ra thành "không xuất được".
          if (typeof renderer?.getCanvasByBound !== 'function') {
            throw new Error('xuatPngBang: khối surface không có CanvasRenderer để vẽ')
          }
          return voiTiLePixel(tiLe, async () => veRaCanvasThat(hopBao, renderer, gfx, hop))
        },
        thao: () => litRender(null, hop),
      }
    },

    taiVe: taiVeThat,
  }
}

// Khoá một-lượt-một-lúc. Hai `TestWorkspace` cùng chạm một CSDL IndexedDB là công thức cho ghi đè
// chéo, mà bấm nút hai lần liên tiếp là thao tác bình thường chứ không phải ca hiếm.
let dangXuat = false

/**
 * Mở bảng NGẦM (ngoài màn hình), dựng lại ảnh từ tài liệu đã lưu rồi tải PNG về.
 *
 * `phuThuoc` CHỈ để ca kiểm tiêm bản giả — gọi hai đối số trong app thật.
 */
export async function xuatPngBang(
  boardId: string,
  tenBang: string,
  phuThuoc?: PhuThuoc,
): Promise<KetQuaXuat> {
  if (dangXuat) return 'dang-ban'
  dangXuat = true

  // Hộp chứa ngoài màn hình, nhưng có KÍCH THƯỚC THẬT và nằm TRONG document: thẻ ghi chú được
  // `html2canvas` chụp từ DOM đã layout, còn `getRootByEditorHost()`/`closest()` của cây vendored
  // chỉ chạy trên phần tử đã kết nối. Dời ra ngoài bằng `left` thay vì `display:none` hay
  // `visibility:hidden` — hai cách đó làm phần tử không có hộp layout, và mọi phép đo ra 0.
  const hop = document.createElement('div')
  hop.setAttribute('data-drt-xuat-anh', boardId)
  hop.setAttribute('aria-hidden', 'true')
  // Cùng bộ class/thuộc tính với lớp bọc trong EdgelessBoard.tsx — `drt-edgeless-viewport` là thứ
  // `closest()` của cây vendored tìm, `@container/viewport` cấp container-name mà nhiều widget
  // truy vấn, còn `data-theme` đã PHÂN GIẢI ("light"/"dark", không bao giờ "auto") là điều kiện để
  // bảng màu vendored áp đúng — thiếu nó, sơ đồ xuất ra luôn mang màu bản sáng.
  hop.className = 'drt-edgeless-viewport @container/viewport block relative overflow-clip'
  hop.dataset.theme = resolveTheme()
  hop.style.cssText =
    'position:fixed;left:-20000px;top:0;width:1280px;height:960px;pointer-events:none;'
  document.body.appendChild(hop)

  const pt = phuThuoc ?? (await phuThuocThat())
  let may: MayXuat | undefined
  let dongWorkspace: (() => void) | undefined
  try {
    const { workspace, store, doc } = await pt.moBang(boardId)
    dongWorkspace = () => workspace.forceStop()
    may = await pt.dungStd(store, hop, doc)

    const bao = may.hopBaoNoiDung
    // Bảng chưa vẽ gì: xuất một PNG toàn màu nền còn TỆ HƠN không xuất — người dùng tưởng đã lưu
    // được sơ đồ. Bên gọi hiện thông báo thay vì tải một tệp vô nghĩa về máy.
    if (!(bao.w > 0 && bao.h > 0)) return 'trong'

    const ve = await may.veRaCanvas(bao, tinhTiLeXuat(bao))
    // Hộp bao có kích thước thật mà máy xuất vẫn không trả canvas nào = HỎNG, không phải "bảng
    // trống". Gộp hai ca này vào cùng một giá trị trả về từng làm cả một lượt gỡ lỗi đi sai hướng
    // (2026-08-30): người dùng đọc "sơ đồ chưa có nội dung" cho một sơ đồ đầy nội dung.
    if (!ve) throw new Error('xuatPngBang: máy xuất không trả về canvas nào')

    pt.taiVe(ve.canvas.toDataURL('image/png'), `${lamSachTenTep(tenBang)}.png`)
    return ve.soKhoi > 0 ? 'xong-thieu-the-ghi-chu' : 'xong'
  } finally {
    may?.thao()
    dongWorkspace?.()
    hop.remove()
    dangXuat = false
  }
}
