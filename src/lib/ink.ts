// ─── Engine mực ───────────────────────────────────────────────────────────────
//
// Đây là phần quyết định "cảm giác viết" — thứ tách một app ghi chép dùng được khỏi một app ghi
// chép dùng sướng. Ba việc, theo đúng thứ tự ảnh hưởng:
//
// 1. LẤY ĐỦ MẪU. Trình duyệt gom các sự kiện `pointermove` lại và chỉ bắn ra mỗi khung hình một
//    lần. Bút cảm ứng hiện đại lấy mẫu ở 120–240Hz, màn hình vẽ lại ở 60Hz — nghĩa là đọc
//    `e.clientX` không thôi là VỨT ĐI 2–4 mẫu trên mỗi 1 mẫu giữ lại. Nét chậm không lộ, nhưng
//    vung tay nhanh một cái là thấy ngay các đoạn thẳng gãy khúc. `getCoalescedEvents()` trả lại
//    đúng những mẫu đã bị gom đó.
//
// 2. LỌC RUNG. Mẫu thô từ màn hình cảm ứng luôn có nhiễu ±1–2px, cộng với rung tay thật của người
//    viết. Làm mượt bằng cách lấy trung bình trượt thì hết rung nhưng nét bị "trễ" và cắt góc.
//    Bộ lọc One-Euro giải đúng bài toán này: đi chậm thì lọc mạnh (hết rung), đi nhanh thì gần như
//    không lọc (không trễ, giữ nguyên góc nhọn).
//
// 3. BỀ DÀY. Bút cảm ứng báo lực nhấn thật; ngón tay và chuột thì không, phải suy từ tốc độ. Cả hai
//    đường đều phải vuốt mảnh ở đầu và cuối nét — chỗ đặt bút xuống và nhấc bút lên.
//
// Phần làm mượt ĐƯỜNG ĐI (Catmull-Rom) nằm ở mindmapGeometry.ts vì nó dùng chung cho cả lúc vẽ,
// lúc vẽ lại từ dữ liệu đã lưu, và lúc xuất ảnh PNG.

import type { MindPenNib } from "../data/types"

// ─── Bộ lọc One-Euro ──────────────────────────────────────────────────────────
//
// Bộ lọc thông thấp có tần số cắt THAY ĐỔI theo tốc độ:
//   cutoff = minCutoff + beta × |vận tốc đã lọc|
// Đi chậm → cutoff thấp → lọc mạnh → hết rung khi viết chữ nhỏ.
// Đi nhanh → cutoff cao → gần như không lọc → nét không bị trễ dưới đầu bút.
//
// Nguồn thuật toán: Casiez, Roussel, Vogel — "1€ Filter" (CHI 2012).

function lowPassAlpha(cutoff: number, dtMs: number): number {
  const tau = 1 / (2 * Math.PI * cutoff)
  const te = dtMs / 1000
  return 1 / (1 + tau / te)
}

class Scalar1Euro {
  private prev: number | null = null
  private prevDeriv = 0

  constructor(
    private minCutoff: number,
    private beta: number,
    private derivCutoff: number,
  ) {}

  filter(value: number, dtMs: number): number {
    if (this.prev == null) {
      this.prev = value
      return value
    }
    const te = Math.max(1, dtMs) / 1000
    // Đạo hàm (vận tốc) cũng phải lọc, nếu không nhiễu của nó lại điều khiển ngược lại cutoff.
    const deriv = (value - this.prev) / te
    const aD = lowPassAlpha(this.derivCutoff, dtMs)
    this.prevDeriv = aD * deriv + (1 - aD) * this.prevDeriv
    const cutoff = this.minCutoff + this.beta * Math.abs(this.prevDeriv)
    const a = lowPassAlpha(cutoff, dtMs)
    const out = a * value + (1 - a) * this.prev
    this.prev = out
    return out
  }
}

// Tham số đã chỉnh cho toạ độ tính bằng pixel MÀN HÌNH:
// - minCutoff 1.7Hz: đủ thấp để chữ viết nhỏ hết rung, chưa thấp tới mức nét thấy trễ.
// - beta 0.012: hệ số nhả lọc theo tốc độ. Cao hơn thì nét nhanh bám tay hơn nhưng rung lọt lại.
// Toạ độ x và y lọc độc lập — chuẩn của bộ lọc này.
export class PointerSmoother {
  private fx = new Scalar1Euro(1.7, 0.012, 1)
  private fy = new Scalar1Euro(1.7, 0.012, 1)
  private lastT: number | null = null

  filter(x: number, y: number, t: number): { x: number; y: number } {
    const dt = this.lastT == null ? 16 : Math.max(1, t - this.lastT)
    this.lastT = t
    return { x: this.fx.filter(x, dt), y: this.fy.filter(y, dt) }
  }
}

// ─── Lấy mẫu từ sự kiện con trỏ ───────────────────────────────────────────────

export interface InkSample {
  x: number
  y: number
  // 0 khi thiết bị không báo lực nhấn thật (ngón tay, chuột).
  pressure: number
  t: number
}

// Toàn bộ mẫu của một sự kiện `pointermove`, kể cả những mẫu trình duyệt đã gom lại.
//
// `getCoalescedEvents` chỉ có trên PointerEvent thật; React truyền qua `nativeEvent`. Trình duyệt cũ
// không có hàm này thì rơi về đúng một mẫu — vẫn chạy, chỉ là không mượt bằng.
//
// Lưu ý về mốc thời gian: các mẫu gom lại mang `timeStamp` RIÊNG của từng mẫu (đó chính là điều làm
// chúng có giá trị). Nhưng vài trình duyệt trả timeStamp bằng 0 cho mẫu gom — khi đó nội suy đều
// giữa mốc trước và mốc hiện tại, còn hơn là dồn hết vào một mốc rồi bộ lọc coi dt = 0.
export function coalescedSamples(e: PointerEvent, fallbackT: number): InkSample[] {
  const list: PointerEvent[] =
    typeof e.getCoalescedEvents === "function" ? (e.getCoalescedEvents() as PointerEvent[]) : []
  if (list.length <= 1) {
    return [{ x: e.clientX, y: e.clientY, pressure: rawPressure(e), t: e.timeStamp || fallbackT }]
  }
  const endT = e.timeStamp || fallbackT
  const startT = list[0].timeStamp || endT
  const span = endT - startT
  return list.map((s, i) => ({
    x: s.clientX,
    y: s.clientY,
    pressure: rawPressure(s),
    t: s.timeStamp || (span > 0 ? startT + (span * i) / (list.length - 1) : endT),
  }))
}

// Lực nhấn THẬT hay không. Chuột và ngón tay báo 0.5 cố định (hoặc 0) — con số đó không mang thông
// tin gì, dùng nó để tính bề dày thì mọi nét đều dày đúng như nhau và mất hẳn cảm giác bút.
function rawPressure(e: PointerEvent): number {
  if (e.pointerType !== "pen") return 0
  if (e.pressure <= 0 || e.pressure === 0.5) return 0
  return e.pressure
}

// ─── Bề dày nét: hồ sơ NGÒI BÚT ───────────────────────────────────────────────
//
// Trước đây đúng MỘT công thức bề dày dùng chung, và chỉ bút máy được dùng nó — ba cây còn lại vẽ nét
// đều tăm tắp, khác nhau mỗi độ mờ. Kết quả là bộ bút không có cây nào NHẬN RA ĐƯỢC từ chính nét nó
// để lại: nét chì chẳng giống chì, vệt bút dạ chẳng giống bút dạ, băng dính nhìn y hệt bút dạ to.
//
// Nay mỗi ngòi là một HỒ SƠ số liệu riêng, và bốn con số dưới đây là toàn bộ khác biệt về "cảm giác
// viết" giữa chúng:
//
//   1. DẢI BỀ DÀY (min…max). Bút bi gần như không đổi (0,90–1,06 lần cỡ đặt) — đó chính là điều làm
//      một cái bút bi là bút bi. Bút lông đổi gần chín lần (0,22–1,95).
//   2. NGUỒN ĐIỀU KHIỂN. Bút cảm ứng cho lực nhấn thật; ngón tay/chuột thì phải suy từ TỐC ĐỘ.
//      `speedK` là mức nhạy với tốc độ, `pressExp` là độ cong của đường cong lực nhấn.
//   3. NGÒI DẸT (chisel). Ngòi bút máy và đầu nỉ bút dạ đều là một CẠNH THẲNG, không phải một điểm
//      tròn: nét dày hay mảnh phụ thuộc HƯỚNG ĐI so với cạnh đó. Đây là thứ mắt nhận ra ngay lập tức
//      và cũng là thứ không mô phỏng nổi bằng độ mờ — bút dạ quét ngang thì bản rộng hết cỡ, kéo dọc
//      xuống thì chỉ còn một sợi mảnh. Không có nó thì bút dạ chỉ là một cây bút rất to.
//   4. VUỐT ĐẦU/CUỐI. Bút mực nhấc lên là nét thon dần; bút dạ và băng dính thì KHÔNG — chúng cắt
//      ngang phẳng lì, vì đó là vật liệu chứ không phải mực thấm vào giấy.
export type PenNib = MindPenNib
export type InkProfileId = PenNib | "pencil" | "highlighter" | "tape"

export interface NibProfile {
  // Dải hệ số bề dày quanh cỡ nét người dùng đặt.
  min: number
  max: number
  // Mức nhạy với tốc độ (px/ms → hệ số). 0 = bề dày không phụ thuộc tốc độ.
  speedK: number
  // Độ cong của đường cong lực nhấn. <1 thì nhấn nhẹ đã ra nét rõ (viết nhẹ tay được).
  pressExp: number
  // Quãng đường (px màn hình) để nét đạt bề dày đầy đủ kể từ lúc đặt bút; 0 = không vuốt đầu.
  taperIn: number
  startFactor: number
  // Vuốt cuối nét: tỉ lệ số điểm cuối bị vuốt, và mức thu nhỏ tại điểm cuối cùng. 0 = cắt phẳng.
  tailFrac: number
  tailDrop: number
  // Góc CẠNH NGÒI (radian) và bề dày còn lại khi đi ĐÚNG dọc theo cạnh đó (1 = ngòi tròn, không dẹt).
  chiselAngle: number
  chiselRatio: number
  // Bề dày đổi tối đa bao nhiêu phần về phía giá trị mới mỗi mẫu — chống nét gấp khúc chỗ dày chỗ mỏng.
  smooth: number
  // Rung bề dày ngẫu nhiên (±tỉ lệ) — mực ra không đều của bút bi, hạt than của bút chì.
  jitter: number
}

export const NIB_PROFILES: Record<InkProfileId, NibProfile> = {
  // Bút bi: gần như MỘT bề dày duy nhất. Chống lại mọi bản năng "thêm hiệu ứng" — cái làm nên bút bi
  // chính là sự đều đặn không cảm xúc của nó, cộng một chút mực ra không đều (jitter).
  ball: {
    min: 0.88, max: 1.08, speedK: 0.04, pressExp: 0.4,
    taperIn: 7, startFactor: 0.84, tailFrac: 0.08, tailDrop: 0.2,
    chiselAngle: 0, chiselRatio: 1, smooth: 0.5, jitter: 0.045,
  },
  // Bút máy: ngòi dẹt cắt 45°. Nét kéo xuống-phải dày hết cỡ, nét hất lên-phải mảnh như sợi tóc —
  // đúng chữ viết tay bằng bút máy thật, và là thứ khiến chữ nghiêng bỗng có nhịp.
  fountain: {
    min: 0.4, max: 1.32, speedK: 0.26, pressExp: 0.75,
    taperIn: 24, startFactor: 0.45, tailFrac: 0.14, tailDrop: 0.68,
    chiselAngle: -Math.PI / 4, chiselRatio: 0.5, smooth: 0.3, jitter: 0,
  },
  // Bút lông: dải bề dày rộng nhất, phản ứng chậm nhất (smooth thấp = bề dày còn "trôi" theo tay sau
  // khi tay đã đổi tốc độ, đúng như một búi lông có quán tính), đuôi vuốt gần như mất hẳn.
  brush: {
    min: 0.2, max: 2, speedK: 0.55, pressExp: 0.55,
    taperIn: 34, startFactor: 0.26, tailFrac: 0.22, tailDrop: 0.88,
    chiselAngle: 0, chiselRatio: 1, smooth: 0.19, jitter: 0.02,
  },
  // Bút chì: bề dày gần đều (chì không phình ra vì nhấn mạnh, nó chỉ ĐẬM hơn), hơi dẹt vì đầu chì
  // luôn mòn vẹt một bên, và rung mạnh nhất trong cả bộ — hạt than bám không đều lên vân giấy. Phần
  // "giống chì" còn lại nằm ở lớp vân (filter mind-pencil-grain), không nằm ở hình học.
  pencil: {
    min: 0.76, max: 1.16, speedK: 0.1, pressExp: 0.5,
    taperIn: 10, startFactor: 0.8, tailFrac: 0.1, tailDrop: 0.28,
    chiselAngle: -Math.PI / 4, chiselRatio: 0.8, smooth: 0.42, jitter: 0.1,
  },
  // Bút dạ: đầu nỉ CẮT NGANG. Góc π/2 nghĩa là quét ngang được bản rộng nhất (đúng tư thế tô một
  // dòng chữ), kéo dọc chỉ còn 28% — cái vệt hẹp lại ở khúc cua chính là chữ ký của bút dạ. Không
  // vuốt đầu, không vuốt đuôi: vệt bắt đầu và kết thúc bằng một cạnh phẳng.
  highlighter: {
    min: 1, max: 1, speedK: 0, pressExp: 1,
    taperIn: 0, startFactor: 1, tailFrac: 0, tailDrop: 0,
    chiselAngle: Math.PI / 2, chiselRatio: 0.28, smooth: 0.55, jitter: 0,
  },
  // Băng dính: một dải vật liệu có bề rộng CỐ ĐỊNH. Không ngòi, không lực nhấn, không gì cả — mọi
  // khác biệt của nó nằm ở vật liệu (vân, ánh bóng, bóng đổ), không ở đường nét.
  tape: {
    min: 1, max: 1, speedK: 0, pressExp: 1,
    taperIn: 0, startFactor: 1, tailFrac: 0, tailDrop: 0,
    chiselAngle: 0, chiselRatio: 1, smooth: 1, jitter: 0,
  },
}

// Hồ sơ ngòi của một công cụ. Chỉ bút mực mới có nhiều ngòi để chọn; ba cây còn lại mỗi cây một hồ
// sơ cố định, vì "bút chì ngòi lông" là một thứ không tồn tại.
export function nibProfile(tool: string, nib: PenNib | undefined): NibProfile {
  if (tool === "pencil" || tool === "highlighter" || tool === "tape") return NIB_PROFILES[tool]
  return NIB_PROFILES[nib ?? "fountain"]
}

export interface InkWidthState {
  // Bề dày ở điểm trước — để làm trơn, nét không nhảy bậc.
  width: number
  // Mốc để tính tốc độ.
  t: number
  x: number
  y: number
  // Tổng chiều dài nét đã đi (px màn hình) — dùng cho vuốt mảnh đầu nét.
  travelled: number
  // Hướng đi đã LỌC. Ngòi dẹt tính bề dày theo hướng, mà hướng thô giữa hai mẫu liền nhau nhiễu
  // kinh khủng ở tốc độ chậm (hai điểm cách nhau 1px thì góc gần như ngẫu nhiên) — dùng thẳng sẽ ra
  // một nét phập phồng dày mỏng loạn xạ thay vì một nét bút dẹt.
  dx: number
  dy: number
  profile: NibProfile
}

export function initInkWidth(base: number, x: number, y: number, t: number, profile: NibProfile): InkWidthState {
  // Đặt bút xuống: bắt đầu từ nét mảnh rồi phình dần trong khoảng taperIn đầu tiên.
  return { width: base * profile.startFactor, t, x, y, travelled: 0, dx: 0, dy: 0, profile }
}

// Bề dày còn lại của một ngòi DẸT khi đi theo hướng (dx, dy). Cạnh ngòi nằm ở góc `chiselAngle`; đi
// vuông góc với cạnh đó thì được cả bản, đi dọc theo nó thì chỉ còn `chiselRatio`.
function chiselFactor(dx: number, dy: number, p: NibProfile): number {
  if (p.chiselRatio >= 1) return 1
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return 1
  const dir = Math.atan2(dy, dx)
  const across = Math.abs(Math.sin(dir - p.chiselAngle))
  return p.chiselRatio + (1 - p.chiselRatio) * across
}

export function nextInkWidth(sample: InkSample, base: number, st: InkWidthState): number {
  const p = st.profile
  const dt = Math.max(4, sample.t - st.t)
  const mx = sample.x - st.x
  const my = sample.y - st.y
  const step = Math.hypot(mx, my)
  const speed = step / dt // px/ms trên MÀN HÌNH → cảm giác nét giống nhau ở mọi mức phóng
  st.travelled += step
  st.t = sample.t
  st.x = sample.x
  st.y = sample.y
  // Lọc hướng bằng trung bình trượt có trọng số — xem ghi chú ở InkWidthState.dx.
  if (step > 0.01) {
    const a = 0.35
    st.dx += (mx / step - st.dx) * a
    st.dy += (my / step - st.dy) * a
  }

  const factor =
    sample.pressure > 0
      ? // Bút cảm ứng: lực nhấn thật. Đường cong hơi lồi (pressExp < 1) vì cảm nhận về độ đậm không
        // tuyến tính với lực — nhấn nhẹ mà nét đã hiện rõ thì viết mới nhẹ tay được.
        p.min + Math.pow(sample.pressure, p.pressExp) * (p.max - p.min)
      : // Ngón tay/chuột: suy từ tốc độ. Đi chậm/dừng → đậm, vung nhanh → mảnh, giống bút mực thật.
        Math.max(p.min, Math.min(p.max, p.max - speed * p.speedK))

  const chisel = chiselFactor(st.dx, st.dy, p)
  const noise = p.jitter > 0 ? 1 + (Math.random() * 2 - 1) * p.jitter : 1
  // Vuốt mảnh đầu nét, tắt dần theo quãng đường đã đi.
  const intro = p.taperIn > 0 ? Math.min(1, st.travelled / p.taperIn) : 1
  const target = base * factor * chisel * noise * (p.startFactor + (1 - p.startFactor) * intro)
  st.width += (target - st.width) * p.smooth
  return st.width
}

// Vuốt mảnh CUỐI nét — gọi một lần khi nhấc tay. Bút thật nhấc lên thì nét nhỏ dần chứ không cắt
// ngang đột ngột; không có bước này, mọi nét đều kết thúc bằng một đầu tù bằng nhau. Bút dạ và băng
// dính có tailDrop = 0 nên hàm này không đụng tới chúng — đúng chủ ý, xem NIB_PROFILES.
export function taperTail(widths: number[], profile: NibProfile): void {
  const n = widths.length
  if (n < 4 || profile.tailDrop <= 0) return
  // Số điểm cuối được vuốt: tỉ lệ với độ dài nét nhưng có trần, để nét ngắn không bị vuốt gần hết
  // chiều dài của chính nó.
  const tail = Math.min(10, Math.max(2, Math.round(n * profile.tailFrac)))
  for (let i = 0; i < tail; i++) {
    const idx = n - tail + i
    const k = 1 - (i / (tail - 1)) * profile.tailDrop
    widths[idx] = widths[idx] * k
  }
}
