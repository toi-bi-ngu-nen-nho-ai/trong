// Xếp ô ghi chú do nút "+" (auto-complete) tạo ra vào ĐÚNG ô lưới của khung chứa nó.
//
// ─── LỖI GỐC (người dùng báo 2026-09-03: "LỖI RẤT NẶNG") ─────────────────────────────────────
// Thả mẫu SWOT ra rồi chọn một ô ghi chú, nút "+" hiện ở hai cạnh. Bấm nó thì:
//   • ô mới ĐÈ LÊN ô sẵn có — đo trên trình duyệt thật: ô 1 của "Điểm mạnh" ở x = 104,2, bấm "+"
//     phải sinh ô mới ở x = 568,2, trong khi ô 2 đang nằm ở x = 540,1.
//   • ô mới CHUI RA NGOÀI khung — bấm "+" phải của ô thứ 3 trong "Cơ hội" (x = 976,0) sinh ô ở
//     x = 1440,0, mà mép phải của "Cơ hội" là 1412. Ô mới nằm vắt sang ô "Nguy cơ" và đè luôn lên
//     ô ghi chú của khung đó.
//
// Nguyên nhân nằm trong cây vendored: `_computeNextBound` của
// `affine/widgets/edgeless-selected-rect/src/edgeless-auto-complete.ts:333` với khối ghi chú chỉ
// làm đúng một phép `bound.x += bound.w + MAIN_GAP` — KHÔNG kiểm ô đã có, KHÔNG biết có khung chứa.
// (Nhánh dành cho HÌNH thì gọi `nextBound()` có tránh va chạm; chỉ ghi chú bị bỏ rơi.) Luật D11 cấm
// sửa cây vendored, nên bản vá phải nằm ở lớp app: nghe sự kiện thêm khối rồi ĐẶT LẠI ô mới.
//
// ─── VÌ SAO NHẬN DIỆN ĐƯỢC "ô do nút + tạo ra" MÀ KHÔNG ĐỘNG VÀO Ô KHÁC ──────────────────────
// Không dùng phép đoán "ô mới có đè lên ô cũ không" — thả mẫu hai lần chồng nhau cũng thoả điều
// kiện đó, và khi ấy 21 ô của mẫu sẽ bị xô đi hết.
//
// Dùng DẤU VÂN TAY của chính phép tính thượng nguồn: ô do "+" tạo ra luôn cách ô nguồn ĐÚNG
// `w + 100` (hoặc `h + 100`) theo một trong bốn hướng — `MAIN_GAP = 100`
// (`edgeless-selected-rect/src/utils.ts:41`). Khoảng cách đó KHÁC hẳn bước lưới của mọi mẫu đang
// ship: SWOT bước ngang 435,88 (so với w + 100 = 464) và bước dọc 193,35 (so với h + 100 = 220,33);
// bảng gợi ý bên trái bước 476,94 / 180,90. Nên phép nhận diện này không thể bắt nhầm một ô của mẫu.
//
// Tìm được ô nguồn cũng chính là tìm được KHUNG CHỨA (hình bao nhỏ nhất chứa trọn ô nguồn) và LƯỚI
// (suy từ các ô đang nằm trong khung đó) — hai thứ mà thượng nguồn không hề có.
//
// ─── HÀNH VI SAU BẢN VÁ ──────────────────────────────────────────────────────────────────────
// 1. Bấm "+" theo hướng nào thì thử ĐÚNG ô lưới theo hướng đó trước — không cướp quyền quyết định
//    của người dùng khi chỗ đó còn trống và vẫn nằm trong khung.
// 2. Chỗ đó bị chiếm hoặc tràn khung → quét lưới theo THỨ TỰ ĐỌC (trái→phải, hết hàng thì xuống
//    hàng) và lấy ô trống đầu tiên.
// 3. Khung đã đầy → nối thêm hàng mới bên dưới, vẫn trái→phải.
// 4. Ô nguồn không nằm trong khung nào → không có khái niệm "tràn bảng"; chỉ dịch đi cho tới khi
//    không đè lên ai. Vẫn tốt hơn hành vi thượng nguồn là đè thẳng lên.

/** Hộp bao của một phần tử trên bảng vẽ. Khai tại chỗ để không import kiểu xuyên ranh giới D11. */
export type Hop = { x: number; y: number; w: number; h: number }

/** Khoảng cách mà `_computeNextBound` cộng thêm — `MAIN_GAP` của cây vendored. */
export const KHE_AUTO_COMPLETE = 100

/** Sai số cho phép khi so hai toạ độ float của cùng một lưới. */
const SAI_SO = 0.5

/** Trần số ô quét, chặn vòng lặp vô hạn khi khung hẹp hơn một cột. */
const TRAN_QUET = 400

const phai = (h: Hop) => h.x + h.w
const duoi = (h: Hop) => h.y + h.h

/** Hai hộp có phần chung thực sự (chạm mép không tính). */
export function deNhau(a: Hop, b: Hop): boolean {
  return a.x < phai(b) - SAI_SO && b.x < phai(a) - SAI_SO && a.y < duoi(b) - SAI_SO && b.y < duoi(a) - SAI_SO
}

/** `ngoai` chứa trọn `trong`. */
function chuaTron(ngoai: Hop, trong: Hop): boolean {
  return (
    trong.x >= ngoai.x - SAI_SO &&
    trong.y >= ngoai.y - SAI_SO &&
    phai(trong) <= phai(ngoai) + SAI_SO &&
    duoi(trong) <= duoi(ngoai) + SAI_SO
  )
}

const gan = (a: number, b: number) => Math.abs(a - b) <= SAI_SO

export type Huong = 'phai' | 'trai' | 'tren' | 'duoi'

/**
 * Tìm ô ghi chú mà nút "+" đã nhân bản ra `moi`, cùng hướng đã bấm.
 *
 * Điều kiện là ĐẲNG THỨC CHÍNH XÁC (sai số 0,5) chứ không phải "gần đúng": đó là điều làm cho phép
 * nhận diện này không đụng vào ô người dùng tự kéo hay ô của mẫu.
 */
export function timONguon(moi: Hop, daCo: readonly Hop[]): { nguon: Hop; huong: Huong } | null {
  for (const n of daCo) {
    if (!gan(n.w, moi.w) || !gan(n.h, moi.h)) continue
    if (gan(n.y, moi.y)) {
      if (gan(moi.x, phai(n) + KHE_AUTO_COMPLETE)) return { nguon: n, huong: 'phai' }
      if (gan(n.x, phai(moi) + KHE_AUTO_COMPLETE)) return { nguon: n, huong: 'trai' }
    }
    if (gan(n.x, moi.x)) {
      if (gan(moi.y, duoi(n) + KHE_AUTO_COMPLETE)) return { nguon: n, huong: 'duoi' }
      if (gan(n.y, duoi(moi) + KHE_AUTO_COMPLETE)) return { nguon: n, huong: 'tren' }
    }
  }
  return null
}

/** Hình bao NHỎ NHẤT chứa trọn `o`. Không có thì trả `null`. */
export function timKhungChua(o: Hop, hinh: readonly Hop[]): Hop | null {
  let ra: Hop | null = null
  for (const k of hinh) {
    if (!chuaTron(k, o)) continue
    if (ra === null || k.w * k.h < ra.w * ra.h) ra = k
  }
  return ra
}

type Luoi = { x0: number; y0: number; buocX: number; buocY: number }

/**
 * Suy lưới từ những ô đang nằm trong khung.
 *
 * Bước lưới là KHOẢNG CÁCH DƯƠNG NHỎ NHẤT giữa hai toạ độ khác nhau, không phải trung bình: mẫu có
 * thể có hàng khuyết (SWOT "Cơ hội" có 3 ô hàng trên, 1 ô hàng dưới), và trung bình của một tập
 * khuyết cho ra bước sai.
 *
 * Thiếu dữ liệu thì lùi về khe NGANG cho cả hai chiều — giữ khoảng cách giữa các ô đồng đều, thay
 * vì bịa ra một tỉ lệ.
 */
function suyLuoi(trongKhung: readonly Hop[], moi: Hop): Luoi {
  // Bỏ QUA mọi khoảng cách nhỏ hơn kích thước một ô: đó không thể là bước lưới, chỉ có thể là hai ô
  // đang chồng nhau. Bảng của người dùng đã lỡ dính lỗi cũ thì luôn có sẵn cặp chồng nhau như vậy
  // (đo thật trên bảng thử 2026-09-03: một ô lạc ở 568,2 nằm cách ô 540,1 đúng 28,1) — lấy cả nó vào
  // là bước lưới tụt xuống 28 và cả phép xếp trở nên vô nghĩa.
  const buoc = (gt: readonly number[], toiThieu: number) => {
    let nho = Infinity
    for (const a of gt) for (const b of gt) if (b - a >= toiThieu - SAI_SO && b - a < nho) nho = b - a
    return nho
  }
  const xs = trongKhung.map((o) => o.x)
  const ys = trongKhung.map((o) => o.y)
  const bx = buoc(xs, moi.w)
  const buocX = Number.isFinite(bx) ? bx : moi.w + KHE_AUTO_COMPLETE
  const by = buoc(ys, moi.h)
  const buocY = Number.isFinite(by) ? by : moi.h + (buocX - moi.w)
  return {
    x0: xs.length > 0 ? Math.min(...xs) : moi.x,
    y0: ys.length > 0 ? Math.min(...ys) : moi.y,
    buocX,
    buocY,
  }
}

const oTaiSlot = (l: Luoi, cot: number, hang: number, moi: Hop): Hop => ({
  x: l.x0 + cot * l.buocX,
  y: l.y0 + hang * l.buocY,
  w: moi.w,
  h: moi.h,
})

/**
 * Vị trí nên đặt cho ô vừa được nút "+" tạo ra. `null` = không phải ô của nút "+", đừng đụng vào.
 *
 * @param moi   hộp mà thượng nguồn vừa đặt cho ô mới
 * @param daCo  hộp của MỌI ô ghi chú khác đang có trên bảng
 * @param hinh  hộp của mọi hình trên mặt phẳng (ứng viên làm khung chứa)
 */
export function viTriMoiChoO(
  moi: Hop,
  daCo: readonly Hop[],
  hinh: readonly Hop[],
): { x: number; y: number } | null {
  const nguon = timONguon(moi, daCo)
  if (!nguon) return null

  const trong = (o: Hop) => daCo.every((k) => !deNhau(o, k))
  const khung = timKhungChua(nguon.nguon, hinh)

  if (!khung) {
    // Không có khung → không có "tràn bảng". Chỉ đẩy đi cho khỏi đè, theo đúng hướng đã bấm khi
    // hướng đó nằm ngang, còn lại thì sang phải.
    if (trong(moi)) return null
    const dx = nguon.huong === 'trai' ? -(moi.w + KHE_AUTO_COMPLETE) : moi.w + KHE_AUTO_COMPLETE
    let o: Hop = { ...moi }
    for (let i = 0; i < TRAN_QUET; i += 1) {
      o = { ...o, x: o.x + dx }
      if (trong(o)) return { x: o.x, y: o.y }
    }
    return null
  }

  const trongKhung = daCo.filter((o) => chuaTron(khung, o))
  const luoi = suyLuoi(trongKhung, moi)
  const vua = (o: Hop) => o.x >= khung.x - SAI_SO && phai(o) <= phai(khung) + SAI_SO

  // (1) Đúng ô lưới theo hướng đã bấm, nếu còn trống và không tràn khung.
  const cotNguon = Math.round((nguon.nguon.x - luoi.x0) / luoi.buocX)
  const hangNguon = Math.round((nguon.nguon.y - luoi.y0) / luoi.buocY)
  const buocHuong: Record<Huong, readonly [number, number]> = {
    phai: [1, 0],
    trai: [-1, 0],
    duoi: [0, 1],
    tren: [0, -1],
  }
  const [dc, dh] = buocHuong[nguon.huong]
  const cotDich = cotNguon + dc
  const hangDich = hangNguon + dh
  if (cotDich >= 0 && hangDich >= 0) {
    const o = oTaiSlot(luoi, cotDich, hangDich, moi)
    if (vua(o) && trong(o)) return { x: o.x, y: o.y }
  }

  // (2) Quét theo thứ tự đọc. Hàng chạy quá đáy khung là CỐ Ý: đầy khung thì nối thêm hàng còn hơn
  //     đặt chồng lên ô đã có.
  let daQuet = 0
  for (let hang = 0; daQuet < TRAN_QUET; hang += 1) {
    let coOTrongHang = false
    for (let cot = 0; daQuet < TRAN_QUET; cot += 1) {
      const o = oTaiSlot(luoi, cot, hang, moi)
      if (!vua(o)) break
      coOTrongHang = true
      daQuet += 1
      if (trong(o)) return { x: o.x, y: o.y }
    }
    // Khung hẹp hơn một ô → không hàng nào chứa nổi, dừng thay vì lặp vô hạn.
    if (!coOTrongHang) return null
  }
  return null
}
