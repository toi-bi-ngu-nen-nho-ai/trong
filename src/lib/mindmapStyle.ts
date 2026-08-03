// Màu và cỡ chữ của thẻ ghi chú trên bảng Sơ đồ tư duy.
//
// Tách ra file riêng vì thẻ ghi chú được vẽ ở HAI nơi bằng hai công nghệ khác nhau: trên bảng bằng
// HTML/CSS, và khi xuất ảnh PNG bằng canvas 2d. Nếu mỗi nơi tự khai báo màu nền, cỡ chữ, bán kính
// góc thì ảnh xuất ra sẽ không còn giống bảng người dùng đang thấy.

import type { MindNode, MindNodeSize, MindNodeStyle } from "../data/types"

// ─── Giấy nền ─────────────────────────────────────────────────────────────────
// Khai báo TRƯỚC bảng màu vì bảng màu tính ra một số màu bằng cách đối chiếu tương phản với mặt giấy.

export type PaperKind = "grid" | "dot" | "line" | "plain"

export const PAPER_LABELS: Record<PaperKind, string> = {
  grid: "Giấy kẻ ô",
  dot: "Giấy chấm",
  line: "Giấy kẻ ngang",
  plain: "Giấy trắng",
}

export const PAPER_STEP = 26
export const PAPER_BG = "#fcfdff"
export const PAPER_LINE = "rgba(148,163,184,.20)"
export const PAPER_DOT = "rgba(100,116,139,.30)"

// ─── Bảng màu (theo hệ màu của Notion) ────────────────────────────────────────
//
// Mười sắc màu, mỗi sắc là MỘT BỘ BA chứ không phải một mã màu rời:
//
//   text      — màu đậm: nền thẻ "Nền đặc", chữ của thẻ "Viền"/"Chữ trần", và màu mực.
//   bg        — màu nhạt: nền thẻ "Nền nhạt". Lấy đúng màu nền khối của Notion.
//   highlight — vệt bút dạ. Cùng sắc với `bg` nhưng ĐẬM HƠN (pha 45% về phía `text`), vì vệt bút dạ
//               được tô ở độ mờ 0.4 — lấy đúng `bg` thì tô xong gần như không thấy gì.
//
// Vì sao một bộ ba thay vì ba bảng rời như bản trước: thẻ chỉ lưu MỘT mã màu, còn "đậm hay nhạt" là
// do KIỂU thẻ quyết định. Nhờ vậy chọn sắc "Vàng" rồi đổi kiểu là ra ngay cả thẻ vàng đậm lẫn thẻ
// vàng nhạt — không phải nhớ hai mã màu khác nhau cho cùng một sắc, và bảng chọn màu chỉ còn mười ô
// thay vì hai mươi.
export interface MindColor {
  id: string
  name: string
  text: string
  bg: string
  highlight: string
}

export const MIND_COLORS: MindColor[] = [
  { id: "default", name: "Mặc định", text: "#37352F", bg: "#FFFFFF", highlight: "#A5A4A1" },
  { id: "gray", name: "Xám", text: "#787774", bg: "#F1F1EF", highlight: "#BBBAB8" },
  { id: "brown", name: "Nâu", text: "#9F6B53", bg: "#F4EEEE", highlight: "#CEB3A8" },
  { id: "orange", name: "Cam", text: "#D9730D", bg: "#FBECDD", highlight: "#ECB67F" },
  { id: "yellow", name: "Vàng", text: "#CB912F", bg: "#FBF3DB", highlight: "#E5C78E" },
  { id: "green", name: "Lục", text: "#448361", bg: "#EDF3EC", highlight: "#A1C1AD" },
  { id: "blue", name: "Xanh dương", text: "#337EA9", bg: "#E7F3F8", highlight: "#96BED4" },
  { id: "purple", name: "Tím", text: "#9065B0", bg: "#F6F3F9", highlight: "#C8B3D8" },
  { id: "pink", name: "Hồng", text: "#C14C8A", bg: "#FAF1F5", highlight: "#E0A7C5" },
  { id: "red", name: "Đỏ", text: "#D44C47", bg: "#FDEBEC", highlight: "#EBA3A2" },
]

// Bảng màu thẻ ghi chú: mười sắc, lấy màu đậm làm mã nhận diện của sắc đó.
export const NODE_COLORS = MIND_COLORS.map((c) => c.text)

// Sắc dùng khi app TỰ cấp màu (thẻ mới, nhánh mới, đổi màu cả nhóm): năm sắc rõ ràng nhất, bỏ qua
// mặc định/xám/nâu vốn để dành cho việc làm dịu bớt một ý, không phải để phân biệt các nhánh.
export const AUTO_COLORS = ["blue", "red", "green", "orange", "purple"].map(
  (id) => MIND_COLORS.find((c) => c.id === id)!.text,
)

// Màu bút dạ. Bỏ sắc "Mặc định" vì bút dạ xám-đen tô lên chữ là che mất chữ, không phải đánh dấu.
export const HIGHLIGHT_SWATCHES = MIND_COLORS.filter((c) => c.id !== "default").map((c) => ({
  color: c.highlight,
  name: c.name,
}))
export const HIGHLIGHT_COLORS = HIGHLIGHT_SWATCHES.map((s) => s.color)

// Độ mờ của nét bút dạ.
export const HIGHLIGHTER_ALPHA = 0.4

export function colorName(color: string): string {
  const lower = color.toLowerCase()
  const hit = MIND_COLORS.find(
    (c) => c.text.toLowerCase() === lower || c.bg.toLowerCase() === lower || c.highlight.toLowerCase() === lower,
  )
  return hit ? hit.name : color
}

// Màu đường nối khi không tra được thẻ ở đầu kia (dữ liệu cũ, thẻ vừa bị xoá).
export const EDGE_COLOR = "#94a3b8"

// Dây nối kiểu "Phác đồ/thuật toán" (MindEdge.kind === "algorithm") dùng MÀU CỐ ĐỊNH thay vì ăn
// theo màu thẻ con — khác hẳn dây "Quan hệ" (mặc định, xem edgeColor bên dưới). Lý do: một luồng
// xử lý/phác đồ thường đi QUA nhiều thẻ khác màu nhau (mỗi thẻ một bước, có thể đã gắn màu theo chủ
// đề riêng); nếu vẫn ăn theo màu thẻ thì luồng bị đứt đoạn thị giác thành nhiều màu, không còn đọc
// được là MỘT chuỗi bước duy nhất. Dùng lại đúng màu chủ đạo mà cả app đã dùng cho mọi hành
// động mang tính CẤU TRÚC/HỆ THỐNG khác (đường kéo-nối, viền thẻ đang chọn) — giữ ngôn ngữ màu nhất
// quán: xanh mòng két = có cấu trúc/hệ thống, không phải màu trang trí theo nhánh. Dùng biến
// --c-primary (không phải hex cứng) để tự đổi theo sáng/tối như mọi chỗ khác dùng màu chủ đạo.
export const ALGORITHM_EDGE_COLOR = "var(--c-primary)"

// Đường nối ăn theo MÀU CỦA THẺ CON, pha về phía xám trung tính (đúng màu nền của EDGE_COLOR) thay vì
// pha trắng.
//
// Trước đây mọi đường nối cùng một màu xám: bảng đông thẻ thì nhìn vào chỉ thấy một mớ dây xám như
// nhau, không đoán được nhánh nào thuộc về nhánh nào nếu không dò từng sợi bằng mắt. Lấy màu thẻ con
// thì cả một nhánh (thẻ + dây dẫn tới nó) thành một khối màu, liếc qua là thấy cấu trúc. Phải pha
// loãng vì dây đậm bằng thẻ sẽ giành mất sự chú ý của chính nội dung thẻ.
//
// Pha về phía TRẮNG (bản trước) làm độ tương phản với nền giấy gần trắng (#fcfdff) tụt dưới 3:1 —
// mức tối thiểu WCAG cho hình vẽ không phải chữ. Pha về phía xám trung tính #94a3b8 (giống hệt
// EDGE_COLOR) giữ được sắc màu riêng của từng nhánh mà vẫn đủ tối.
//
// Riêng nhóm màu SÁNG thì pha xám thôi chưa đủ (sợi nối màu vàng trên giấy trắng gần như biến mất),
// nên còn phải qua readableOn để ép về đúng ngưỡng 3:1 — không thể chỉ tin vào một hằng số pha.
export function edgeColor(childColor: string): string {
  return readableOn(mixHex(childColor, [148, 163, 184], 0.3), [PAPER_BG], 3)
}

export interface NodeMetrics {
  fontSize: number
  lineHeight: number
  padX: number
  padY: number
  radius: number
  maxWidth: number
}

// Thẻ ghi chú phải nhìn ra hình VIÊN THUỐC / cái nhãn dán, không phải một cái ô bảng tính bo góc.
//
// Hai điều làm nên chuyện đó, và bản trước thiếu cả hai:
//
// 1. Bán kính bo LỚN HƠN nửa chiều cao một dòng. Trước đây bo 16/20/26 — thiếu vài pixel so với nửa
//    chiều cao, nên hai đầu thẻ không tròn hẳn mà còn một đoạn cạnh thẳng rất ngắn. Chính đoạn thẳng
//    đó làm thẻ trông cứng: mắt đọc ra "hình chữ nhật bo góc" chứ không phải "viên thuốc".
//
//    Số ở đây là nửa chiều cao một dòng CỘNG THÊM 3 chứ không phải đúng bằng, vì viền thẻ (1.5–1.8px
//    mỗi bên, tuỳ kiểu) cũng tính vào chiều cao — lấy đúng bằng thì thẻ có viền lại hụt vài pixel.
//    Bo dư là an toàn: trình duyệt tự kẹp bán kính xuống tối đa nửa chiều cao, nên thẻ MỘT DÒNG luôn
//    tròn hẳn hai đầu ở mọi kiểu, còn thẻ nhiều dòng (cao hơn) vẫn giữ đúng độ bo ghi ở đây.
// 2. Đệm NGANG rộng gần gấp đôi đệm dọc (16→20 ở cỡ vừa). Đệm ngang xấp xỉ đệm dọc làm chữ bị kẹp
//    sát hai đầu tròn, thẻ trông chật và căng.
export const NODE_METRICS: Record<MindNodeSize, NodeMetrics> = {
  sm: { fontSize: 12.5, lineHeight: 18, padX: 16, padY: 9, radius: 21, maxWidth: 156 },
  md: { fontSize: 14, lineHeight: 20, padX: 20, padY: 12, radius: 25, maxWidth: 196 },
  lg: { fontSize: 17.5, lineHeight: 25, padX: 26, padY: 16, radius: 31, maxWidth: 240 },
}

export function nodeMetrics(node: MindNode): NodeMetrics {
  return NODE_METRICS[node.size ?? "md"]
}

export const NODE_FONT_STACK = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

// Đọc được cả "#abc", "#aabbcc" lẫn "rgb(r, g, b)" — vì mixHex TRẢ VỀ dạng rgb(), nên các hàm tính
// tương phản bên dưới phải nhận lại được chính thứ mixHex sinh ra.
function parseColor(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    const h = color.slice(1)
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
    return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
  }
  const nums = color.match(/[\d.]+/g)
  if (!nums || nums.length < 3) return [0, 0, 0]
  return [Number(nums[0]), Number(nums[1]), Number(nums[2])]
}

export function mixHex(hex: string, target: [number, number, number], t: number): string {
  const [r, g, b] = parseColor(hex)
  const to = (a: number, bb: number) => Math.round(a + (bb - a) * t)
  return `rgb(${to(r, target[0])}, ${to(g, target[1])}, ${to(b, target[2])})`
}

const mix = mixHex

// ─── Tương phản ───────────────────────────────────────────────────────────────
//
// Bản trước dò TAY từng hằng số cho vừa đủ qua ngưỡng WCAG. Bảng màu nay là hệ màu của Notion —
// vốn được thiết kế để làm MÀU CHỮ trên nền trắng, không phải làm nền thẻ — nhân với bốn kiểu thẻ,
// nên dò tay là chuyện không thể. Thay bằng TÍNH: mọi màu chữ dưới đây được chọn bằng cách đậm dần
// cho tới khi thật sự đạt ngưỡng trên đúng cái nền nó sẽ nằm lên.
//
// Đây không phải lo xa: đo thẳng hệ màu Notion thì màu vàng trên nền vàng chỉ đạt 2.48:1 và màu cam
// trên nền cam 2.83:1 — dùng nguyên si là chữ mờ tịt trên thẻ.

const INK_BLACK: [number, number, number] = [15, 23, 42]

function channelLum(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function luminance(color: string): number {
  const [r, g, b] = parseColor(color)
  return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// Độ sáng tối đa của nền mà chữ TRẮNG còn đạt 4.5:1. Suy thẳng từ công thức WCAG chứ không phải số
// ước lượng: 1.05 / (L + 0.05) ≥ 4.5  ⟺  L ≤ 1.05/4.5 − 0.05.
const WHITE_TEXT_MAX_LUM = 1.05 / 4.5 - 0.05

// Đậm dần `base` về phía mực đen cho tới khi đủ tương phản với MỌI nền trong `bgs` (nền thẻ là dải
// màu chuyển nên có hai đầu, phải đạt ở cả hai). Trả về mực đen nếu không màu nào của chính nó đạt.
function readableOn(base: string, bgs: string[], min: number): string {
  const ok = (c: string) => bgs.every((bg) => contrastRatio(c, bg) >= min)
  if (ok(base)) return base
  for (let t = 0.1; t <= 0.9; t += 0.05) {
    const c = mix(base, INK_BLACK, t)
    if (ok(c)) return c
  }
  return "#0f172a"
}

// Một ô màu trong thanh công cụ: màu vẽ ra, kèm TÊN của sắc đó. Phải đi thành cặp vì màu thật dùng
// để vẽ có thể đã bị chỉnh khỏi màu gốc trong bảng (xem INK_SWATCHES ngay dưới) — lúc đó tra ngược
// tên từ mã màu sẽ không ra gì, và nhãn trợ năng lại tụt về đọc mã "rgb(184, 133, 47)".
export interface Swatch {
  color: string
  name: string
}

// Bảng màu mực. Lấy màu đậm của mười sắc, nhưng ÉP qua ngưỡng 3:1 với mặt giấy trước: màu vàng của
// Notion (#CB912F) chỉ đạt 2.70:1 trên giấy trắng — một cây bút vẽ ra nét gần như không nhìn thấy thì
// có trong bảng cũng vô nghĩa. Sắc nào đã đủ đậm thì readableOn trả về nguyên vẹn, nên chỉ vàng và
// cam bị đậm thêm một chút.
//
// Khai báo Ở ĐÂY (không phải cạnh MIND_COLORS) vì nó phải chạy SAU readableOn và mix — cả hai đều là
// biến/hàm của module này, gọi trước lúc chúng được khởi tạo là lỗi ngay khi nạp file.
export const INK_SWATCHES: Swatch[] = MIND_COLORS.map((c) => ({
  color: readableOn(c.text, [PAPER_BG], 3),
  name: c.name,
}))
export const INK_COLORS = INK_SWATCHES.map((s) => s.color)

// Nền thẻ "Nền đặc" phải đủ tối để chữ TRẮNG trên đó đọc được. Hệ màu Notion là màu chữ dùng trên nền
// trắng nên phần lớn chưa đủ tối (cam 3.28:1, vàng 2.75:1) — đậm dần cho tới khi đạt, vẫn giữ nguyên
// sắc. Nhờ vậy cả mười sắc đều có một kiểu "nền đặc" nhìn chắc chắn như nhau.
function solidBase(color: string): string {
  if (luminance(color) <= WHITE_TEXT_MAX_LUM) return color
  for (let t = 0.05; t <= 0.9; t += 0.05) {
    const c = mix(color, INK_BLACK, t)
    if (luminance(c) <= WHITE_TEXT_MAX_LUM) return c
  }
  return "#0f172a"
}

// Tra màu nền nhạt đi kèm một sắc. Thẻ chỉ lưu màu đậm, nên đây là chỗ nối lại cặp đậm–nhạt.
const BG_BY_TEXT = new Map(MIND_COLORS.map((c) => [c.text.toLowerCase(), c.bg]))

export interface NodePaint {
  // Nền vẽ trên bảng (có thể là dải màu chuyển). `bgTop`/`bgBottom` là hai đầu dải màu, để phần xuất
  // ảnh dựng lại đúng dải đó bằng canvas.
  background: string
  bgTop: string
  bgBottom: string
  color: string
  border: string
  borderWidth: number
  shadow: boolean
  // Chuỗi box-shadow dùng trên bảng, và màu bóng thuần để canvas dựng lại đúng bóng đó khi xuất ảnh.
  shadowCss: string
  shadowColor: string
}

// Bóng đổ pha theo MÀU CỦA THẺ, không phải một màu xám chung.
//
// Bóng xám dưới một cái thẻ màu trông như thẻ bị dán đè lên ảnh chứ không phải nằm trên mặt giấy —
// đây là thứ làm thẻ nhìn "cứng" rõ nhất. Ngoài đời, bóng của một vật màu luôn ngả về chính màu đó.
// Pha 55% về phía mực đen: đủ tối để thành bóng thật, vẫn còn sắc màu của thẻ.
function shadowFor(color: string, alpha: number): string {
  const [r, g, b] = parseColor(mix(color, INK_BLACK, 0.55))
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Hai lớp bóng, cả hai đều dùng bán kính âm (spread âm) để bóng tụ lại quanh chân thẻ thay vì loang
// đều ra bốn phía: một lớp mềm và xa cho cảm giác thẻ nổi lên khỏi giấy, một lớp sát và đậm hơn để
// chân thẻ có điểm tựa. Bóng loang đều (bản trước) đọc ra là "một lớp xám phẳng", không ra khối.
function shadowCssFor(color: string): string {
  return `0 10px 22px -8px ${shadowFor(color, 0.5)}, 0 4px 9px -4px ${shadowFor(color, 0.3)}`
}

// Nền thẻ là DẢI MÀU CHUYỂN nhẹ (trên sáng hơn dưới một chút) chứ không phải một mảng màu phẳng —
// cùng một màu nhưng nhìn có khối, mềm hơn hẳn. Mắt gần như không nhận ra dải màu, chỉ thấy "đỡ khô".
//
// Màu CHỮ không còn là một công thức cố định mà được chọn theo đúng cái nền nó nằm lên (xem
// readableOn): thẻ nền tối thì chữ trắng, thẻ nền sáng thì chữ là chính màu đó đậm lại vừa đủ. Nhờ
// vậy cùng một kiểu thẻ dùng được cho cả màu đậm lẫn màu sáng — điều bắt buộc từ khi bảng màu có cả
// hai nhóm.
function computePaint(color: string, style: MindNodeStyle): NodePaint {
  if (style === "plain") {
    // Chữ trần trên giấy: không nền, không viền, không bóng — để vẽ trang trí quanh chữ.
    return {
      background: "transparent",
      bgTop: "transparent",
      bgBottom: "transparent",
      color: readableOn(color, [PAPER_BG], 4.5),
      border: "transparent",
      borderWidth: 0,
      shadow: false,
      shadowCss: "none",
      shadowColor: "transparent",
    }
  }

  if (style === "soft") {
    // Nền lấy ĐÚNG màu nền khối của Notion nếu thẻ đang mang một sắc trong bảng. Chỉ những màu lạ
    // (bảng cũ, hoặc file nhập từ máy khác) mới phải tự pha nhạt ra như trước.
    const base = BG_BY_TEXT.get(color.toLowerCase()) ?? mix(color, [255, 255, 255], 0.88)
    const top = mix(base, [255, 255, 255], 0.4)
    const bottom = base
    return {
      background: `linear-gradient(170deg, ${top}, ${bottom})`,
      bgTop: top,
      bgBottom: bottom,
      color: readableOn(color, [top, bottom], 4.5),
      // Viền nằm ở RANH GIỚI giữa nền thẻ và nền giấy nên phải thấy được so với CẢ HAI — chỉ xét một
      // bên là kiểu sót lỗi rất dễ mắc (xét nền trắng thì đạt, ra tới giấy thật lại hụt).
      // 3:1 là ngưỡng WCAG cho đường nét không phải chữ.
      border: readableOn(mix(base, parseColor(color), 0.45), [PAPER_BG, top], 3),
      borderWidth: 1.5,
      shadow: true,
      shadowCss: shadowCssFor(color),
      shadowColor: shadowFor(color, 0.34),
    }
  }

  if (style === "outline") {
    return {
      background: "#ffffff",
      bgTop: "#ffffff",
      bgBottom: "#ffffff",
      color: readableOn(color, ["#ffffff"], 4.5),
      // Màu sáng (vàng, lục nhạt) để nguyên làm viền thì gần như tàng hình — đậm lại cho tới khi đạt
      // 3:1 với CẢ ruột thẻ (trắng) LẪN nền giấy bên ngoài. Giấy (#fcfdff) tối hơn trắng một chút
      // nên chỉ xét nền trắng là chưa đủ: xanh dương nhạt đạt đúng 3.00 trên trắng nhưng rớt còn
      // 2.96 khi ra tới giấy.
      border: readableOn(color, ["#ffffff", PAPER_BG], 3),
      borderWidth: 1.8,
      shadow: true,
      shadowCss: shadowCssFor(color),
      shadowColor: shadowFor(color, 0.34),
    }
  }

  // "solid" — nền đặc, chữ trắng, cho MỌI sắc. Nền được đậm dần trước (solidBase) cho tới khi chữ
  // trắng đọc được, nên mười sắc cho ra mười cái thẻ nhìn chắc chắn như nhau — không có cái nào bỗng
  // dưng thành chữ tối trên nền nhạt, thứ vốn đã là việc của kiểu "Nền nhạt".
  const base = solidBase(color)
  const top = mix(base, INK_BLACK, 0.04)
  const bottom = mix(base, INK_BLACK, 0.16)
  return {
    background: `linear-gradient(170deg, ${top}, ${bottom})`,
    bgTop: top,
    bgBottom: bottom,
    color: "#ffffff",
    border: "transparent",
    borderWidth: 0,
    shadow: true,
    shadowCss: shadowCssFor(base),
    shadowColor: shadowFor(base, 0.38),
  }
}

// Nhớ lại kết quả theo cặp (màu, kiểu). readableOn phải dò dần nên tốn hơn một phép nhân đơn thuần,
// mà hàm này chạy cho MỌI thẻ trong MỖI lần vẽ lại bảng. Số cặp thực tế bị chặn bởi số màu người dùng
// dùng, nên bộ nhớ đệm luôn nhỏ; vẫn có mức trần phòng dữ liệu nhập từ máy khác có màu lạ.
const paintCache = new Map<string, NodePaint>()

export function nodePaint(node: MindNode): NodePaint {
  const style: MindNodeStyle = node.style ?? "solid"
  const key = `${node.color}|${style}`
  const hit = paintCache.get(key)
  if (hit) return hit
  const paint = computePaint(node.color, style)
  if (paintCache.size > 400) paintCache.clear()
  paintCache.set(key, paint)
  return paint
}

// Ảnh nền của mặt bảng, giãn theo mức phóng để lưới không bị rối khi thu nhỏ.
// (Các hằng số của giấy nền khai báo ở đầu file — bảng màu cần chúng để tính tương phản.)
export function paperBackground(kind: PaperKind, zoom: number): { backgroundImage: string; backgroundSize: string } {
  const step = PAPER_STEP * zoom
  if (kind === "plain") return { backgroundImage: "none", backgroundSize: "auto" }
  if (kind === "dot") {
    return {
      backgroundImage: `radial-gradient(${PAPER_DOT} ${Math.max(0.9, 1.1 * zoom)}px, transparent ${Math.max(1, 1.2 * zoom)}px)`,
      backgroundSize: `${step}px ${step}px`,
    }
  }
  if (kind === "line") {
    return {
      backgroundImage: `linear-gradient(to bottom, ${PAPER_LINE} 1px, transparent 1px)`,
      backgroundSize: `${step}px ${step}px`,
    }
  }
  return {
    backgroundImage: `linear-gradient(to right, ${PAPER_LINE} 1px, transparent 1px), linear-gradient(to bottom, ${PAPER_LINE} 1px, transparent 1px)`,
    backgroundSize: `${step}px ${step}px`,
  }
}
