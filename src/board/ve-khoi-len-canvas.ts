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
  font: string
  mau: string
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
): Array<{ chu: string; trai: number; giua: number }> {
  const s = nodeChu.textContent ?? ''
  if (s.length === 0) return []

  const r = taoRange()
  r.selectNodeContents(nodeChu)
  const hopDong = Array.from(r.getClientRects())
  if (hopDong.length === 0) return []
  if (hopDong.length === 1) {
    const h = hopDong[0]
    return [{ chu: s, trai: h.left, giua: (h.top + h.bottom) / 2 }]
  }

  const graphemes = tachGrapheme(s)
  if (graphemes.length > TRAN_GRAPHEME) {
    // Đường lùi: chia chuỗi cho các hộp dòng theo tỉ lệ bề rộng. Ngắt dòng có thể lệch vài ký tự,
    // nhưng không treo — và ca này chỉ chạm tới ở khối dài bất thường.
    return chiaDeuTheoHop(s, hopDong)
  }

  const ra: Array<{ chu: string; trai: number; giua: number }> = []
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
    if (cuoi && Math.abs(cuoi.giua - giua) < 0.5) cuoi.chu += g
    else ra.push({ chu: g, trai: b.left, giua })
  }
  return ra
}

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

function chiaDeuTheoHop(
  s: string,
  hop: DOMRect[],
): Array<{ chu: string; trai: number; giua: number }> {
  const tong = hop.reduce((t, h) => t + h.width, 0) || 1
  const ra: Array<{ chu: string; trai: number; giua: number }> = []
  let dau = 0
  hop.forEach((h, idx) => {
    const cuoi = idx === hop.length - 1 ? s.length : dau + Math.round((h.width / tong) * s.length)
    ra.push({ chu: s.slice(dau, cuoi), trai: h.left, giua: (h.top + h.bottom) / 2 })
    dau = cuoi
  })
  return ra
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

      const cs = getComputedStyle(span)
      // `font-size` computed KHÔNG bị `transform: scale(zoom)` của viewport đụng vào, nên nó đã là
      // cỡ chữ trong hệ toạ độ MÔ HÌNH — đúng thứ canvas xuất cần, không phải quy đổi.
      const font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize)}px ${cs.fontFamily}`
      for (const d of ngatDong(nodeChu)) {
        if (d.chu.trim() === '') continue
        const [x, y] = doiToaDo(d.trai, d.giua)
        chu.push({ chu: d.chu, x, y, font, mau: cs.color })
      }
    }

    // ── Dấu đầu mục: SỐ THỨ TỰ ──────────────────────────────────────────────────────────────
    // Text node TRẦN ngay trong div dấu đầu mục — không có `data-v-text` nên vòng lặp chữ ở trên
    // không bao giờ thấy. Đọc ĐÚNG các con text trực tiếp (không đệ quy) để không chạm nhầm vào
    // chữ của trình soạn nội tuyến nằm sâu hơn, và không kéo theo chữ mờ gợi ý.
    for (const dau of Array.from(khoi.querySelectorAll(CHON_DAU_MUC))) {
      if (dau.closest(CHON_BO_QUA) || laPhanTuAn(dau)) continue
      const cs = getComputedStyle(dau)
      const font = `${cs.fontStyle} ${cs.fontWeight} ${parseFloat(cs.fontSize)}px ${cs.fontFamily}`
      for (const con of Array.from(dau.childNodes)) {
        if (con.nodeType !== 3 /* TEXT_NODE */) continue
        const t = con as Text
        if ((t.textContent ?? '').trim() === '') continue
        for (const d of ngatDong(t)) {
          if (d.chu.trim() === '') continue
          const [x, y] = doiToaDo(d.trai, d.giua)
          chu.push({ chu: d.chu, x, y, font, mau: cs.color })
        }
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
    ctx.font = d.font
    ctx.fillStyle = d.mau
    ctx.fillText(d.chu, x, y)
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
