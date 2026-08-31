// Vẽ LỚP KHỐI (thẻ ghi chú, ảnh chèn) lên canvas xuất — KHÔNG dùng html2canvas.
//
// ─── Vì sao không phải html2canvas ───────────────────────────────────────────────────────────
// html2canvas nhân bản CẢ tài liệu kèm ~298 thẻ `<style>` mà chunk bảng vẽ tiêm vào `<head>`, và
// làm phần lớn việc đó ĐỒNG BỘ trên luồng chính: đo 2026-08-31 trên bảng đang mở có đúng MỘT thẻ
// ghi chú → treo >36 giây, không tự xong; `Promise.race` với `setTimeout` cũng vô dụng vì
// `setTimeout` không chạy khi luồng chính bị chẹn. Bốn lượt đào đều tắc ở đó (HANDOFF §1.1).
//
// ─── Cách ở đây ──────────────────────────────────────────────────────────────────────────────
// Trình duyệt ĐÃ tính xong layout của khối rồi — không việc gì phải bắt nó tính lại từ một bản sao
// tài liệu. Module này chỉ ĐỌC lại kết quả đó:
//   • hình thẻ: `getBoundingClientRect()` của `edgeless-note-background` + `getComputedStyle` cho
//     màu nền / bo góc / viền (đã phân giải theo `data-theme`, nên tự đúng sáng/tối);
//   • từng DÒNG chữ: `Range` trên chính text node, gom theo toạ độ dòng — nên bản xuất ngắt dòng
//     y hệt thứ người dùng đang nhìn, không phải một phép ngắt dòng thứ hai tự chế;
//   • ảnh chèn: chính phần tử `<img>` đã tải xong, đưa thẳng cho `drawImage`.
// Không nhân bản DOM, không đụng `<head>`, không tải lại phông. Đo được: vài mili-giây.
//
// Cùng KỸ THUẬT với `queryLayout` của turbo renderer thượng nguồn
// (`affine/gfx/turbo-renderer/src/text-utils.ts`) nhưng KHÔNG dùng lại nó, có lý do đo được:
// `getSentenceRects` ở đó ước lượng bề rộng trung bình mỗi ký tự rồi chia câu vào các rect — sai
// số tích luỹ làm chữ nhảy dòng lệch. Ở đây đi theo GRAPHEME thật nên vị trí ngắt dòng là chính
// xác, và tiếng Việt có dấu không bị tách rời (`Intl.Segmenter` granularity 'grapheme').
//
// Tách làm HAI nửa để kiểm được: `docLopKhoi()` chỉ ĐỌC DOM ra một bản mô tả bằng số, còn
// `veLopKhoi()` chỉ VẼ bản mô tả đó. Không nửa nào cần cả hai thứ cùng lúc.

/** Toạ độ MÔ HÌNH (không phải pixel màn hình). */
export type TheKhoi = {
  x: number
  y: number
  w: number
  h: number
  mauNen: string
  banKinh: number
  vienMau: string
  vienDay: number
}

/** Một dòng chữ đã ngắt sẵn. `y` là ĐƯỜNG GIỮA dòng (vẽ với `textBaseline: 'middle'`). */
export type DongChu = {
  chu: string
  x: number
  y: number
  /**
   * Bề rộng và chiều cao HỘP DÒNG, toạ độ mô hình. Đo ở lượt ĐỌC (từ `Range`) chứ không đo lại
   * bằng `ctx.measureText` lúc vẽ: giữ `veLopKhoi()` thuần (không đo gì), và số của trình duyệt
   * bao giờ cũng đúng hơn phép đo lại bằng một phông có thể phân giải khác đi trên canvas.
   */
  rong: number
  cao: number
  /** Cỡ chữ (px, hệ mô hình) — quyết định độ dày và độ sâu của gạch chân. */
  coChu: number
  font: string
  mau: string
  gachChan?: boolean
  gachNgang?: boolean
  /** Màu nền tô chữ (bút dạ quang, nền chữ inline-code). Rỗng/thiếu = không tô. */
  nen?: string
}

export type AnhKhoi = {
  nguon: CanvasImageSource
  x: number
  y: number
  w: number
  h: number
}

/**
 * Một biểu tượng SVG nội tuyến đã tuần tự hoá thành `data:` URL TỰ CHỨA (currentColor đã ghim
 * thành màu thật). Chưa vẽ được — phải qua `napBieuTuong()` để thành `AnhKhoi`, vì giải mã ảnh là
 * việc bất đồng bộ còn `docLopKhoi()` cố ý ở lại đồng bộ (chỉ đọc, kiểm được bằng DOM giả).
 */
export type BieuTuongKhoi = {
  duLieu: string
  x: number
  y: number
  w: number
  h: number
}

export type MoTaLopKhoi = {
  the: TheKhoi[]
  chu: DongChu[]
  anh: AnhKhoi[]
  /** Không bắt buộc: `veLopKhoi()` không cần tới nó (đã nhập vào `anh` từ trước khi vẽ). */
  bieuTuong?: BieuTuongKhoi[]
}

/** Đổi một điểm màn hình sang toạ độ mô hình. App thật truyền `gfx.viewport.toModelCoord`. */
export type DoiToaDo = (x: number, y: number) => [number, number]

// Phần tử inline-editor mang chữ thật. CÙNG selector mà turbo renderer thượng nguồn dùng
// (`paragraph-layout-handler.ts`) — nó không dính chữ mờ gợi ý (`.drt-paragraph-placeholder` là
// div RIÊNG), nên không có nguy cơ xuất ra "Gõ '/' để chèn".
const CHON_CHU = '[data-v-text="true"]'

// Cây con chỉ là lớp phủ thao tác, không phải nội dung: mặt nạ note (bắt chuột), khung chọn.
const CHON_BO_QUA = 'edgeless-note-mask, drt-block-selection, .drt-note-mask'

// Phần tử bọc một đoạn chữ CÓ ĐỊNH DẠNG. Lớp `AffineText` (nguồn thượng nguồn
// `inlines/preset/src/nodes/affine-text.ts`) dựng `<span style="..."><v-text><span data-v-text="true">`
// và đặt TOÀN BỘ định dạng lên span NGOÀI (shared/src/styles/text.ts).
//
// Màu và font tới được span trong vì chúng KẾ THỪA. `text-decoration` và `background-color` thì
// KHÔNG: trình duyệt vẽ chúng từ phần tử cha phủ lên con, nên `getComputedStyle` ở span trong trả
// "none" và "rgba(0, 0, 0, 0)". Đo trên Chrome thật 2026-08-31, đúng hình dạng DOM này. Vì thế phải
// đi NGƯỢC lên tìm — và phải có CHẶN, nếu không vòng lặp trèo tiếp tới `edgeless-note-background`
// rồi tô màu thân thẻ thành "nền chữ".
//
// CHỈ `drt-text`, KHÔNG kèm `affine-text`. Bản đầu viết hai vế cho "chắc ăn", nhưng vế `affine-text`
// vừa là mã chết vừa làm ĐỎ cổng: cây vendored đăng ký đúng MỘT tên thẻ —
// `customElements.define('drt-text', AffineText)` ở
// `.vendor-build/affine/inlines/preset/src/effects.js:3` (D11 đổi tiền tố affine-→drt- lúc dựng
// vendor) — nên không DOM nào từng có thẻ `<affine-text>`; chuỗi "affine-text" còn sót trong cây
// build chỉ là ĐƯỜNG DẪN module (`import … from './nodes/affine-text'`), bundler nuốt hết. Giữ vế
// đó lại thì chuỗi "affine-" lọt vào bản phát hành và `kiem-dist` báo D16 ĐỎ (đỏ suốt từ f12c0c3
// tới 2026-08-31). Thượng nguồn đổi tên thẻ thì `kiem:vendor`/`kiem:dist` báo trước — đừng thêm lại
// vế dự phòng.
const CHON_BOC_CHU = 'drt-text'

// Những phần tử NGOÀI thân thẻ mà trình duyệt sơn bằng nền/viền, và vì thế không lọt vào lượt đọc
// chữ lẫn lượt đọc ảnh: đường kẻ ngang (`<hr>` `border-top`, blocks/divider/src/styles.ts), ô bảng
// (`<td>` `border: 1px solid`, blocks/table/src/table-cell-css.ts), mã inline (`<code>` nền + viền,
// shared/src/styles/text.ts).
//
// DANH SÁCH TRẮNG có chủ đích, KHÔNG quét đoán. Một phép "phần tử nào có nền thì vẽ" sẽ tô luôn mọi
// div bọc và lớp phủ đang có nền — đổi một lượt xuất đang đúng lấy một lượt xuất đoán mò.
const CHON_HOP_TRANG_TRI = 'hr, code, td, th'

// Vạch dọc bên trái khối trích dẫn là PSEUDO-ELEMENT `.quote::after` (blocks/paragraph/src/styles.ts)
// — không có phần tử thật nên `getBoundingClientRect` không với tới. Đọc bằng
// `getComputedStyle(el, '::after')` rồi tự đặt vào hệ toạ độ của `.quote` (nó `position: relative`).
const CHON_TRICH_DAN = '.quote'

// Trần grapheme cho phép đi từng ký tự. Trên một thẻ ghi chú bình thường (vài trăm ký tự) phép đo
// từng grapheme là vài mili-giây; nhưng một khối dán cả trang văn bản vào thì phải có đường lùi,
// nếu không lượt xuất tự biến thành thứ mà cả chặng này sinh ra để diệt.
const TRAN_GRAPHEME = 4000

// Dấu đầu mục của danh sách: chấm, số thứ tự, ô tick, mũi gập. BlockSuite dựng chúng NGOÀI trình
// soạn nội tuyến — một `div` anh em của `rich-text` (`affine/blocks/list/src/utils/get-list-icon.ts`)
// — nên KHÔNG selector nào ở trên chạm tới: chấm/ô tick/mũi gập là `<svg>` nội tuyến (không phải
// `<img>`), còn số thứ tự là một TEXT NODE TRẦN ngay trong div (không mang `data-v-text`). Đó là
// nguyên nhân gốc của "xuất ra được chữ nhưng mất sạch chấm, số, ô tick" (đo trên trình duyệt thật
// 2026-08-31: ba thẻ danh sách ra ảnh thành ba hình chữ nhật rỗng).
// Khớp `[class*=...]` để trúng cả `affine-list-block__prefix` (thượng nguồn) lẫn
// `drt-list-block__prefix` (sau pipeline đổi tên, scripts/doi-ten-vendor.mjs) — một lượt đổi tiền
// tố nữa không được phép âm thầm tắt lại đường này.
const CHON_DAU_MUC = '[class*="list-block__prefix"]'

// Biểu tượng vẽ ra ảnh xuất ở tỉ lệ tới 2×, mà `drawImage` chỉ PHÓNG ẢNH BITMAP đã rasterise ở kích
// thước nội tại của SVG. Ghim kích thước nội tại lên 4× cỡ hiển thị để phần phóng luôn là thu nhỏ,
// không phải nội suy lên (icon 24px → bitmap 96px, chi phí không đáng kể).
const TI_LE_NET_BIEU_TUONG = 4

// Gạch chân/gạch ngang vẽ tay: canvas không có `text-decoration`. Hai con số này bắt chước cách
// trình duyệt vẽ — dày bằng ~1/14 cỡ chữ, và gạch chân nằm dưới đường GIỮA dòng khoảng 0,38 cỡ chữ
// (vẽ với `textBaseline: 'middle'` nên mọi thứ tính từ đường giữa, không phải từ baseline).
const DO_MANH_GACH = 14
const SAU_GACH_CHAN = 0.38

// Trần chờ giải mã một biểu tượng. `data:` URL giải mã gần như tức thì, nhưng một lượt treo ở đây
// sẽ treo CẢ nút xuất — thà mất cái chấm còn hơn mất lượt xuất.
const HAN_NAP_BIEU_TUONG_MS = 2000

function laPhanTuAn(el: Element): boolean {
  const cs = getComputedStyle(el)
  if (cs.display === 'none' || cs.visibility === 'hidden') return true
  // `Number('')` là 0 — nên đọc opacity thẳng qua `Number()` biến MỌI phần tử chưa đặt opacity
  // thành "đang ẩn", và lượt xuất mất sạch thẻ ghi chú. Chỉ coi là ẩn khi opacity phân giải ra
  // một con số thật bằng 0. (Bắt được bằng ca kiểm, không phải trên trình duyệt: trình duyệt thật
  // luôn trả "1" nên lỗi này ngủ yên tới khi gặp một môi trường trả chuỗi rỗng.)
  const o = parseFloat(cs.opacity)
  return Number.isFinite(o) && o === 0
}

/**
 * Ngắt nội dung một text node thành các DÒNG THẬT, kèm mép trái và đường giữa (toạ độ màn hình).
 *
 * Đường nhanh: `Range.getClientRects()` trả đúng MỘT hộp nghĩa là cả phần tử nằm gọn một dòng —
 * lấy luôn, không cần đi từng ký tự (ca thường gặp nhất).
 * Đường chậm: đi từng grapheme, ký tự nào có đường giữa khác dòng đang gom thì mở dòng mới. Chính
 * xác tuyệt đối vì hỏi thẳng trình duyệt vị trí từng ký tự, không ước lượng bề rộng.
 */
export function ngatDongTheoRange(
  nodeChu: Text,
  taoRange: () => Range = () => document.createRange(),
): DongTho[] {
  const s = nodeChu.textContent ?? ''
  if (s.length === 0) return []

  const r = taoRange()
  r.selectNodeContents(nodeChu)
  const hopDong = Array.from(r.getClientRects())
  if (hopDong.length === 0) return []
  if (hopDong.length === 1) {
    const h = hopDong[0]
    return [{ chu: s, trai: h.left, giua: (h.top + h.bottom) / 2, rong: h.width, cao: h.height }]
  }

  const graphemes = tachGrapheme(s)
  if (graphemes.length > TRAN_GRAPHEME) {
    // Đường lùi: chia chuỗi cho các hộp dòng theo tỉ lệ bề rộng. Ngắt dòng có thể lệch vài ký tự,
    // nhưng không treo — và ca này chỉ chạm tới ở khối dài bất thường.
    return chiaDeuTheoHop(s, hopDong)
  }

  const ra: DongTho[] = []
  let i = 0
  for (const g of graphemes) {
    r.setStart(nodeChu, i)
    r.setEnd(nodeChu, i + g.length)
    const b = r.getBoundingClientRect()
    i += g.length
    if (b.width === 0 && b.height === 0) continue
    const giua = (b.top + b.bottom) / 2
    const cuoi = ra[ra.length - 1]
    // Cùng dòng khi đường giữa trùng nhau (sai số nửa pixel cho màn DPR lẻ).
    if (cuoi && Math.abs(cuoi.giua - giua) < 0.5) {
      cuoi.chu += g
      // Nới mép phải theo ký tự vừa thêm — bề rộng dòng là khoảng cách từ mép trái tới đó.
      cuoi.rong = Math.max(cuoi.rong, b.left + b.width - cuoi.trai)
      cuoi.cao = Math.max(cuoi.cao, b.height)
    } else {
      ra.push({ chu: g, trai: b.left, giua, rong: b.width, cao: b.height })
    }
  }
  return ra
}

/** Một dòng đã ngắt, còn ở toạ độ MÀN HÌNH. `giua` là đường giữa dòng. */
type DongTho = { chu: string; trai: number; giua: number; rong: number; cao: number }

function tachGrapheme(s: string): string[] {
  // `Intl.Segmenter` giữ nguyên cụm dấu tiếng Việt (ế, ườ...) — cắt bằng `[...s]` sẽ xé dấu ra khỏi
  // nguyên âm ở chuỗi tổ hợp (NFD), làm chữ xuất ra sai chính tả.
  const Seg = (
    globalThis as {
      Intl?: {
        Segmenter?: new (
          l?: string,
          o?: { granularity: string },
        ) => { segment(s: string): Iterable<{ segment: string }> }
      }
    }
  ).Intl?.Segmenter
  if (!Seg) return [...s]
  return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(s), (x) => x.segment)
}

function chiaDeuTheoHop(s: string, hop: DOMRect[]): DongTho[] {
  const tong = hop.reduce((t, h) => t + h.width, 0) || 1
  const ra: DongTho[] = []
  let dau = 0
  hop.forEach((h, idx) => {
    const cuoi = idx === hop.length - 1 ? s.length : dau + Math.round((h.width / tong) * s.length)
    ra.push({
      chu: s.slice(dau, cuoi),
      trai: h.left,
      giua: (h.top + h.bottom) / 2,
      rong: h.width,
      cao: h.height,
    })
    dau = cuoi
  })
  return ra
}

function coMau(m: string | undefined): boolean {
  return !!m && m !== 'rgba(0, 0, 0, 0)' && m !== 'transparent'
}

function khongVien(kieu: string | undefined): boolean {
  return !kieu || kieu === 'none' || kieu === 'hidden'
}

/**
 * Một phần tử trong danh sách trắng → hộp vẽ được, hoặc `null` nếu nó chẳng sơn gì.
 *
 * Ca ĐẶC BIỆT là phần tử CHỈ có viền trên (`<hr>` của khối kẻ ngang): hộp của nó cao 0, kẻ khung
 * quanh một hộp cao 0 thì hoặc mất hút hoặc ra hai vạch chồng nhau. Vẽ nó thành một VỆT ĐẶC dày
 * đúng bằng viền — đó cũng chính là thứ người dùng nhìn thấy.
 */
function docHopTrangTri(el: Element, doiToaDo: DoiToaDo): TheKhoi | null {
  const r = el.getBoundingClientRect()
  if (r.width <= 0) return null
  const cs = getComputedStyle(el)
  const day = khongVien(cs.borderTopStyle) ? 0 : parseFloat(cs.borderTopWidth) || 0
  const nen = cs.backgroundColor
  if (day === 0 && !coMau(nen)) return null

  const chiVienTren =
    day > 0 &&
    khongVien(cs.borderRightStyle) &&
    khongVien(cs.borderBottomStyle) &&
    khongVien(cs.borderLeftStyle)

  const [x, y] = doiToaDo(r.left, r.top)
  const [x2, y2] = doiToaDo(r.right, chiVienTren ? r.top + day : r.bottom)
  if (chiVienTren) {
    return {
      x,
      y,
      w: x2 - x,
      h: y2 - y,
      mauNen: cs.borderTopColor,
      banKinh: 0,
      vienMau: '',
      vienDay: 0,
    }
  }
  return {
    x,
    y,
    w: x2 - x,
    h: y2 - y,
    mauNen: coMau(nen) ? nen : '',
    banKinh: parseFloat(cs.borderRadius) || 0,
    vienMau: cs.borderTopColor,
    vienDay: day,
  }
}

/**
 * Vạch dọc bên trái khối trích dẫn — `.quote::after`, một pseudo-element nên không có phần tử thật
 * để đo. `getComputedStyle(el, '::after')` trả về bề rộng/chiều cao/màu ĐÃ giải (kể cả
 * `calc(100% - 20px)`), còn vị trí thì suy từ chính `.quote`: nó `position: relative` nên `left`/
 * `top` của pseudo tính từ mép hộp đó.
 */
function docVachTrichDan(q: Element, doiToaDo: DoiToaDo): TheKhoi | null {
  let cs: CSSStyleDeclaration
  try {
    cs = getComputedStyle(q, '::after')
  } catch {
    return null
  }
  const rong = parseFloat(cs.width) || 0
  const cao = parseFloat(cs.height) || 0
  if (rong <= 0 || cao <= 0 || !coMau(cs.backgroundColor)) return null
  const r = q.getBoundingClientRect()
  if (r.width <= 0) return null
  const trai = r.left + (parseFloat(cs.left) || 0)
  const tren = r.top + (parseFloat(cs.top) || 0) + (parseFloat(cs.marginTop) || 0)
  const [x, y] = doiToaDo(trai, tren)
  const [x2, y2] = doiToaDo(trai + rong, tren + cao)
  return {
    x,
    y,
    w: x2 - x,
    h: y2 - y,
    mauNen: cs.backgroundColor,
    banKinh: parseFloat(cs.borderRadius) || 0,
    vienMau: '',
    vienDay: 0,
  }
}

/**
 * Gạch chân / gạch ngang / nền tô của một đoạn chữ — đọc bằng cách đi NGƯỢC lên cha, CHẶN ở
 * `CHON_BOC_CHU`. Xem chú thích ở hằng đó: hai thuộc tính này không kế thừa nên không thể đọc tại
 * chỗ, và không có chặn thì phép đi ngược sẽ vớ luôn màu thân thẻ ghi chú.
 */
function docTrangTriChu(span: Element): { gachChan: boolean; gachNgang: boolean; nen: string } {
  const kq = { gachChan: false, gachNgang: false, nen: '' }
  const boc = span.closest(CHON_BOC_CHU)
  if (!boc) return kq
  for (let el: Element | null = span; el; el = el.parentElement) {
    const cs = getComputedStyle(el)
    // `textDecorationLine` là dạng đã tách; đọc thêm `textDecoration` cho môi trường chỉ giữ dạng
    // rút gọn (happy-dom của bộ kiểm là một).
    const gach = `${cs.textDecorationLine || ''} ${cs.textDecoration || ''}`
    if (gach.includes('underline')) kq.gachChan = true
    if (gach.includes('line-through')) kq.gachNgang = true
    // Nền của `<code>` do lượt đọc HỘP lo (nó còn có viền + bo góc mà một dải nền sau chữ không tả
    // được). Lấy cả ở đây là vẽ hai lần cùng một màu, chồng lệch nhau.
    const nen = el.tagName === 'CODE' ? '' : cs.backgroundColor
    if (!kq.nen && nen && nen !== 'rgba(0, 0, 0, 0)' && nen !== 'transparent') kq.nen = nen
    if (el === boc) break
  }
  return kq
}

/**
 * Đọc các phần tử khối (`<drt-edgeless-note>`…) ra bản mô tả bằng SỐ, toạ độ MÔ HÌNH.
 *
 * Chỉ đọc, không vẽ, không sửa DOM — nên kiểm được bằng DOM giả.
 */
export function docLopKhoi(
  khoiEls: Element[],
  doiToaDo: DoiToaDo,
  taoRange?: () => Range,
): MoTaLopKhoi {
  const the: TheKhoi[] = []
  const chu: DongChu[] = []
  const anh: AnhKhoi[] = []
  const bieuTuong: BieuTuongKhoi[] = []
  const ngatDong = (n: Text) => (taoRange ? ngatDongTheoRange(n, taoRange) : ngatDongTheoRange(n))

  /** Đọc một text node ra các `DongChu` đã đổi sang toạ độ mô hình. Dùng cho CẢ chữ lẫn số thứ tự. */
  const themChu = (node: Text, chuaChu: Element, cs: CSSStyleDeclaration) => {
    const font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize)}px ${cs.fontFamily}`
    const trangTri = docTrangTriChu(chuaChu)
    for (const d of ngatDong(node)) {
      if (d.chu.trim() === '') continue
      const [x, y] = doiToaDo(d.trai, d.giua)
      const [x2, y2] = doiToaDo(d.trai + d.rong, d.giua + d.cao)
      chu.push({
        chu: d.chu,
        x,
        y,
        rong: x2 - x,
        cao: y2 - y,
        coChu: parseFloat(cs.fontSize) || 0,
        font,
        mau: cs.color,
        ...trangTri,
      })
    }
  }

  for (const khoi of khoiEls) {
    // ── Thân thẻ (nền + bo góc + viền) ──────────────────────────────────────────────────────
    const nen = khoi.querySelector('edgeless-note-background')
    if (nen && !laPhanTuAn(nen)) {
      const r = nen.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        const cs = getComputedStyle(nen)
        const [x, y] = doiToaDo(r.left, r.top)
        const [x2, y2] = doiToaDo(r.right, r.bottom)
        the.push({
          x,
          y,
          w: x2 - x,
          h: y2 - y,
          mauNen: cs.backgroundColor,
          // `borderRadius` có thể là "8px" hoặc "8px 8px 8px 8px" — lấy giá trị đầu là đủ cho thẻ
          // ghi chú (bốn góc luôn bằng nhau ở bản này).
          banKinh: parseFloat(cs.borderRadius) || 0,
          vienMau: cs.borderTopColor,
          vienDay: cs.borderTopStyle === 'none' ? 0 : parseFloat(cs.borderTopWidth) || 0,
        })
      }
    }

    // ── Hộp CSS ngoài thân thẻ (kẻ ngang, ô bảng, mã inline, vạch trích dẫn) ───────────────
    for (const el of Array.from(khoi.querySelectorAll(CHON_HOP_TRANG_TRI))) {
      if (el.closest(CHON_BO_QUA) || laPhanTuAn(el)) continue
      const hop = docHopTrangTri(el, doiToaDo)
      if (hop) the.push(hop)
    }
    for (const q of Array.from(khoi.querySelectorAll(CHON_TRICH_DAN))) {
      if (q.closest(CHON_BO_QUA) || laPhanTuAn(q)) continue
      const vach = docVachTrichDan(q, doiToaDo)
      if (vach) the.push(vach)
    }

    // ── Ảnh chèn ────────────────────────────────────────────────────────────────────────────
    for (const img of Array.from(khoi.querySelectorAll('img'))) {
      if (img.closest(CHON_BO_QUA) || laPhanTuAn(img)) continue
      // Ảnh chưa tải xong thì `drawImage` ném — bỏ qua, phần còn lại của thẻ vẫn vào ảnh.
      if (!img.complete || img.naturalWidth === 0) continue
      const r = img.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const [x, y] = doiToaDo(r.left, r.top)
      const [x2, y2] = doiToaDo(r.right, r.bottom)
      anh.push({ nguon: img, x, y, w: x2 - x, h: y2 - y })
    }

    // ── Chữ ─────────────────────────────────────────────────────────────────────────────────
    for (const span of Array.from(khoi.querySelectorAll(CHON_CHU))) {
      if (span.closest(CHON_BO_QUA) || laPhanTuAn(span)) continue
      const nodeChu = Array.from(span.childNodes).find(
        (n): n is Text => n.nodeType === 3 /* TEXT_NODE */,
      )
      if (!nodeChu) continue

      // `font-size` computed KHÔNG bị `transform: scale(zoom)` của viewport đụng vào, nên nó đã là
      // cỡ chữ trong hệ toạ độ MÔ HÌNH — đúng thứ canvas xuất cần, không phải quy đổi.
      themChu(nodeChu, span, getComputedStyle(span))
    }

    // ── Dấu đầu mục: SỐ THỨ TỰ ──────────────────────────────────────────────────────────────
    // Text node TRẦN ngay trong div dấu đầu mục — không có `data-v-text` nên vòng lặp chữ ở trên
    // không bao giờ thấy. Đọc ĐÚNG các con text trực tiếp (không đệ quy) để không chạm nhầm vào
    // chữ của trình soạn nội tuyến nằm sâu hơn, và không kéo theo chữ mờ gợi ý.
    for (const dau of Array.from(khoi.querySelectorAll(CHON_DAU_MUC))) {
      if (dau.closest(CHON_BO_QUA) || laPhanTuAn(dau)) continue
      const cs = getComputedStyle(dau)
      for (const con of Array.from(dau.childNodes)) {
        if (con.nodeType !== 3 /* TEXT_NODE */) continue
        const t = con as Text
        if ((t.textContent ?? '').trim() === '') continue
        themChu(t, dau, cs)
      }
    }

    // ── Biểu tượng SVG nội tuyến: chấm đầu dòng, ô tick, mũi gập ───────────────────────────
    // Quét CẢ khối chứ không riêng dấu đầu mục: cùng một cơ chế cũng đưa được icon của thẻ nhúng
    // (bookmark, liên kết tài liệu) vào ảnh, và mọi lớp phủ thao tác đã bị `CHON_BO_QUA` chặn.
    for (const svg of Array.from(khoi.querySelectorAll('svg'))) {
      if (svg.closest(CHON_BO_QUA) || laPhanTuAn(svg)) continue
      // SVG lồng trong SVG đã nằm trong bản tuần tự hoá của cha — vẽ lần nữa là vẽ chồng.
      if (svg.parentElement?.closest('svg')) continue
      const r = svg.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const duLieu = svgThanhDuLieu(svg, r.width, r.height)
      if (!duLieu) continue
      const [x, y] = doiToaDo(r.left, r.top)
      const [x2, y2] = doiToaDo(r.right, r.bottom)
      bieuTuong.push({ duLieu, x, y, w: x2 - x, h: y2 - y })
    }
  }

  return { the, chu, anh, bieuTuong }
}

/**
 * Một `<svg>` nội tuyến → `data:` URL TỰ CHỨA.
 *
 * Hai điều bắt buộc, cả hai đều là loại hỏng-âm-thầm nếu quên:
 *   • `currentColor` trong một tệp SVG rời không còn gì để kế thừa → icon ra ĐEN (hoặc mất hút trên
 *     nền tối). Phải ghim màu đã phân giải vào chính phần tử gốc.
 *   • kích thước nội tại phải lớn hơn cỡ vẽ cuối, xem `TI_LE_NET_BIEU_TUONG`.
 *
 * Trả `null` cho SVG tham chiếu tài nguyên ngoài miền: vẽ nó lên canvas sẽ NHUỘM BẨN canvas và
 * `toDataURL()` ném ở tận cuối lượt xuất — mất cả ảnh chỉ vì một cái icon.
 */
function svgThanhDuLieu(svg: Element, rong: number, cao: number): string | null {
  const ban = svg.cloneNode(true) as Element
  ban.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  // Không có `viewBox` thì phóng khung chỉ làm khung to ra chứ không phóng nét — giữ nguyên cỡ.
  const heSo = ban.getAttribute('viewBox') ? TI_LE_NET_BIEU_TUONG : 1
  ban.setAttribute('width', String(Math.max(1, Math.round(rong * heSo))))
  ban.setAttribute('height', String(Math.max(1, Math.round(cao * heSo))))
  const mau = getComputedStyle(svg).color
  if (mau) ban.setAttribute('style', `${ban.getAttribute('style') ?? ''};color:${mau}`)

  let chuoi: string
  try {
    chuoi = new XMLSerializer().serializeToString(ban)
  } catch {
    return null
  }
  // Chỉ chặn THAM CHIẾU TÀI NGUYÊN ra ngoài miền. KHÔNG được lọc "http" trần: mọi SVG đều mang
  // `xmlns="http://www.w3.org/2000/svg"`, nên phép lọc thô loại sạch 100% biểu tượng — và loại
  // ÂM THẦM, ảnh vẫn xuất ra, chỉ thiếu đúng thứ chặng này sinh ra để thêm vào.
  if (/(?:xlink:)?href\s*=\s*["']?\s*https?:/i.test(chuoi)) return null
  if (/url\(\s*["']?\s*https?:/i.test(chuoi)) return null
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(chuoi)}`
}

/**
 * Giải mã các biểu tượng thành ảnh vẽ được và nhập vào lớp ảnh. Gọi SAU `docLopKhoi()`, TRƯỚC
 * `veLopKhoi()`.
 *
 * Một biểu tượng hỏng/quá hạn chỉ mất đúng biểu tượng đó — phần còn lại của bản xuất vẫn ra.
 * `taoAnh` CHỈ để ca kiểm tiêm.
 */
export async function napBieuTuong(
  moTa: MoTaLopKhoi,
  taoAnh: () => HTMLImageElement = () => new Image(),
): Promise<MoTaLopKhoi> {
  const ds = moTa.bieuTuong ?? []
  if (ds.length === 0) return { ...moTa, bieuTuong: [] }
  const nap = await Promise.all(ds.map((b) => napMotBieuTuong(b, taoAnh)))
  return {
    ...moTa,
    anh: [...moTa.anh, ...nap.filter((a): a is AnhKhoi => a !== null)],
    bieuTuong: [],
  }
}

async function napMotBieuTuong(
  b: BieuTuongKhoi,
  taoAnh: () => HTMLImageElement,
): Promise<AnhKhoi | null> {
  try {
    const img = taoAnh()
    img.src = b.duLieu
    // `decode()` là đường chính; `onload` là đường lùi cho môi trường không có nó.
    const xong = img.decode
      ? img.decode()
      : new Promise<void>((ok, hong) => {
          img.onload = () => ok()
          img.onerror = () => hong(new Error('napBieuTuong: không tải được biểu tượng'))
        })
    await doiCoHan(xong, HAN_NAP_BIEU_TUONG_MS)
    return { nguon: img, x: b.x, y: b.y, w: b.w, h: b.h }
  } catch {
    return null
  }
}

// Hạn giờ đi bằng `setTimeout` (KHÔNG `requestAnimationFrame`: rAF đứng im khi tài liệu ẩn, đã
// từng treo vĩnh viễn cả lượt xuất — xem xuatAnhBang.ts).
function doiCoHan<T>(p: Promise<T>, ms: number): Promise<T> {
  let dong: ReturnType<typeof setTimeout>
  return Promise.race([
    p.finally(() => clearTimeout(dong)),
    new Promise<T>((_, hong) => {
      dong = setTimeout(() => hong(new Error('napBieuTuong: hết giờ giải mã')), ms)
    }),
  ])
}

/**
 * Vẽ bản mô tả lên `ctx`. `doiSangCanvas` đưa một điểm MÔ HÌNH về toạ độ canvas xuất.
 *
 * Thuần theo nghĩa quan trọng nhất: không đọc DOM, không đo gì — nên kiểm được bằng ctx giả.
 */
export function veLopKhoi(
  ctx: CanvasRenderingContext2D,
  moTa: MoTaLopKhoi,
  doiSangCanvas: (x: number, y: number) => [number, number],
): void {
  for (const t of moTa.the) {
    const [x, y] = doiSangCanvas(t.x, t.y)
    ctx.save()
    ctx.beginPath()
    veHinhChuNhatBoGoc(ctx, x, y, t.w, t.h, t.banKinh)
    if (t.mauNen && t.mauNen !== 'rgba(0, 0, 0, 0)') {
      ctx.fillStyle = t.mauNen
      ctx.fill()
    }
    if (t.vienDay > 0 && t.vienMau && t.vienMau !== 'rgba(0, 0, 0, 0)') {
      ctx.lineWidth = t.vienDay
      ctx.strokeStyle = t.vienMau
      ctx.stroke()
    }
    ctx.restore()
  }

  for (const a of moTa.anh) {
    const [x, y] = doiSangCanvas(a.x, a.y)
    try {
      ctx.drawImage(a.nguon, x, y, a.w, a.h)
    } catch {
      // Ảnh chéo miền chưa bật CORS làm `drawImage` ném (và sẽ nhuộm bẩn canvas) — bỏ đúng tấm đó,
      // giữ lại phần còn lại của bản xuất thay vì hỏng cả lượt.
    }
  }

  ctx.save()
  ctx.textBaseline = 'middle'
  for (const d of moTa.chu) {
    const [x, y] = doiSangCanvas(d.x, d.y)
    // Nền tô trước, nếu không nó đè mất chính dòng chữ nó tô cho.
    if (d.nen) {
      ctx.fillStyle = d.nen
      ctx.fillRect(x, y - d.cao / 2, d.rong, d.cao)
    }
    ctx.font = d.font
    ctx.fillStyle = d.mau
    ctx.fillText(d.chu, x, y)
    if (d.gachChan || d.gachNgang) {
      // Cùng màu chữ: `text-decoration` không nêu màu thì trình duyệt lấy `currentColor`.
      ctx.fillStyle = d.mau
      const day = Math.max(1, d.coChu / DO_MANH_GACH)
      if (d.gachNgang) ctx.fillRect(x, y - day / 2, d.rong, day)
      if (d.gachChan) ctx.fillRect(x, y + d.coChu * SAU_GACH_CHAN, d.rong, day)
    }
  }
  ctx.restore()
}

function veHinhChuNhatBoGoc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const bk = Math.max(0, Math.min(r, w / 2, h / 2))
  // `roundRect` chưa có ở mọi nơi (và không có trong happy-dom của bộ kiểm) — tự dựng đường bo góc
  // để cùng một nhánh mã chạy ở mọi môi trường, không phải một nhánh chỉ chạy trên máy thật.
  ctx.moveTo(x + bk, y)
  ctx.lineTo(x + w - bk, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + bk)
  ctx.lineTo(x + w, y + h - bk)
  ctx.quadraticCurveTo(x + w, y + h, x + w - bk, y + h)
  ctx.lineTo(x + bk, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - bk)
  ctx.lineTo(x, y + bk)
  ctx.quadraticCurveTo(x, y, x + bk, y)
  ctx.closePath()
}
