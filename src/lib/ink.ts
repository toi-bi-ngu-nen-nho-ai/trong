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

// ─── Bề dày nét ───────────────────────────────────────────────────────────────

export interface InkWidthState {
  // Bề dày ở điểm trước — để làm trơn, nét không nhảy bậc.
  width: number
  // Mốc để tính tốc độ.
  t: number
  x: number
  y: number
  // Tổng chiều dài nét đã đi (px màn hình) — dùng cho vuốt mảnh đầu nét.
  travelled: number
}

export function initInkWidth(base: number, x: number, y: number, t: number): InkWidthState {
  // Đặt bút xuống: bắt đầu từ nét mảnh rồi phình dần trong khoảng TAPER_IN đầu tiên.
  return { width: base * START_FACTOR, t, x, y, travelled: 0 }
}

const START_FACTOR = 0.45
// Chiều dài (px màn hình) để nét đạt bề dày đầy đủ kể từ lúc đặt bút.
const TAPER_IN = 26
// Bề dày đổi tối đa 30% về phía giá trị mới mỗi mẫu — chống nét gấp khúc chỗ dày chỗ mỏng.
const SMOOTH = 0.3

export function nextInkWidth(sample: InkSample, base: number, st: InkWidthState): number {
  const dt = Math.max(4, sample.t - st.t)
  const step = Math.hypot(sample.x - st.x, sample.y - st.y)
  const speed = step / dt // px/ms trên MÀN HÌNH → cảm giác nét giống nhau ở mọi mức phóng
  st.travelled += step
  st.t = sample.t
  st.x = sample.x
  st.y = sample.y

  const factor =
    sample.pressure > 0
      ? // Bút cảm ứng: lực nhấn thật. Đường cong hơi lồi (mũ 0.75) vì cảm nhận về độ đậm không
        // tuyến tính với lực — nhấn nhẹ mà nét đã hiện rõ thì viết mới nhẹ tay được.
        0.35 + Math.pow(sample.pressure, 0.75) * 1.0
      : // Ngón tay/chuột: suy từ tốc độ. Đi chậm/dừng → đậm, vung nhanh → mảnh, giống bút mực thật.
        Math.max(0.5, Math.min(1.3, 1.3 - speed * 0.26))

  // Vuốt mảnh đầu nét, tắt dần theo quãng đường đã đi.
  const intro = Math.min(1, st.travelled / TAPER_IN)
  const target = base * factor * (START_FACTOR + (1 - START_FACTOR) * intro)
  st.width += (target - st.width) * SMOOTH
  return st.width
}

// Vuốt mảnh CUỐI nét — gọi một lần khi nhấc tay. Bút thật nhấc lên thì nét nhỏ dần chứ không cắt
// ngang đột ngột; không có bước này, mọi nét đều kết thúc bằng một đầu tù bằng nhau.
export function taperTail(widths: number[]): void {
  const n = widths.length
  if (n < 4) return
  // Số điểm cuối được vuốt: tỉ lệ với độ dài nét nhưng không quá 8 điểm, để nét ngắn không bị vuốt
  // gần hết chiều dài của chính nó.
  const tail = Math.min(8, Math.max(2, Math.round(n * 0.14)))
  for (let i = 0; i < tail; i++) {
    const idx = n - tail + i
    // Nhỏ dần về 35% bề dày tại điểm bắt đầu vuốt.
    const k = 1 - (i / (tail - 1)) * 0.65
    widths[idx] = widths[idx] * k
  }
}
