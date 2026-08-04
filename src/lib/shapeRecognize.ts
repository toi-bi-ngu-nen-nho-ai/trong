// ─── Nhận dạng hình vẽ tay ────────────────────────────────────────────────────
//
// Cách dùng giống hệt GoodNotes: vẽ một hình nguệch ngoạc bằng bút mực bình thường, ĐỪNG NHẤC TAY,
// giữ yên khoảng nửa giây — nét vừa vẽ tự nắn thành hình chuẩn. Đây là cách vẽ hình duy nhất không
// bắt người dùng dừng lại chọn công cụ trước, mà chọn công cụ trước chính là chỗ giết mạch suy nghĩ
// khi đang vẽ sơ đồ.
//
// Chỗ khó nhất không phải nhận đúng, mà là KHÔNG nhận bừa: chữ viết tay có vô số nét cong khép kín
// (chữ o, chữ a, chữ d) và nét thẳng (chữ l, chữ t). Nhận bừa một chữ thành hình ellipse thì tính
// năng này thành thứ phải đi tắt. Vì vậy mọi ngưỡng dưới đây đều chọn theo hướng THÀ BỎ SÓT: hình
// phải khá giống mới nắn, còn không thì giữ nguyên nét tay.
//
// Kết quả trả về dùng chung kiểu "danh sách điểm" với nét thường (xem shapePoints trong
// mindmapGeometry.ts), nên hình nhận được lưu/tẩy/hoàn tác/xuất ảnh y hệt mọi nét khác.

export type RecognizedKind = "line" | "arrow" | "rect" | "triangle" | "polygon" | "ellipse"

export interface Recognized {
  kind: RecognizedKind
  points: number[]
}

// ─── Tiện ích hình học ────────────────────────────────────────────────────────

interface Pt {
  x: number
  y: number
}

function toPts(flat: number[]): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i + 1 < flat.length; i += 2) out.push({ x: flat[i], y: flat[i + 1] })
  return out
}

function flatten(pts: Pt[]): number[] {
  const out: number[] = []
  pts.forEach((p) => out.push(Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10))
  return out
}

function pathLength(pts: Pt[]): number {
  let d = 0
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return d
}

function bbox(pts: Pt[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  pts.forEach((p) => {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  })
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

// Ramer–Douglas–Peucker: rút gọn một đường thành ít đỉnh nhất mà vẫn nằm trong sai số cho phép.
// Số đỉnh còn lại chính là số "góc" của hình — cơ sở để phân biệt tam giác với chữ nhật.
function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts.slice()
  let maxD = 0
  let idx = 0
  const a = pts[0]
  const b = pts[pts.length - 1]
  for (let i = 1; i < pts.length - 1; i++) {
    const d = distToSegment(pts[i], a, b)
    if (d > maxD) {
      maxD = d
      idx = i
    }
  }
  if (maxD <= eps) return [a, b]
  const left = simplify(pts.slice(0, idx + 1), eps)
  const right = simplify(pts.slice(idx), eps)
  return [...left.slice(0, -1), ...right]
}

// Lấy lại mẫu đều theo chiều dài — RDP và các phép đo góc chỉ đáng tin khi các điểm cách đều nhau,
// còn mẫu thô thì dày ở chỗ viết chậm và thưa ở chỗ vung nhanh.
function resample(pts: Pt[], count: number): Pt[] {
  const total = pathLength(pts)
  if (total < 1e-6 || pts.length < 2) return pts.slice()
  const step = total / (count - 1)
  const out: Pt[] = [pts[0]]
  let acc = 0
  let i = 1
  let cur = pts[0]
  while (i < pts.length && out.length < count) {
    const next = pts[i]
    const d = Math.hypot(next.x - cur.x, next.y - cur.y)
    if (acc + d >= step) {
      const t = (step - acc) / d
      cur = { x: cur.x + (next.x - cur.x) * t, y: cur.y + (next.y - cur.y) * t }
      out.push(cur)
      acc = 0
    } else {
      acc += d
      cur = next
      i++
    }
  }
  while (out.length < count) out.push(pts[pts.length - 1])
  return out
}

// ─── Nhận dạng ────────────────────────────────────────────────────────────────

// Nét quá ngắn thì không đoán — một dấu chấm hay dấu phẩy không phải hình vẽ. Tính theo pixel MÀN
// HÌNH, xem ghi chú `scale` ở recognizeShape.
const MIN_LENGTH = 40
// Nét khép kín khi hai đầu cách nhau dưới 22% chiều dài đường đi.
const CLOSED_RATIO = 0.22
// Sai số cho là "thẳng": khoảng lệch lớn nhất so với đoạn nối hai đầu, chia cho chiều dài đoạn đó.
const LINE_TOLERANCE = 0.055
// Cạnh nhỏ nhất (px màn hình) để một nét KHÉP KÍN được coi là hình vẽ.
//
// Con số này tồn tại vì đúng một lý do: chữ cái. Chữ "o", "a", "d", "b" đều là nét cong khép kín
// gần tròn — không có ngưỡng kích thước thì viết chữ "o" rồi dừng tay một nhịp là nó biến thành
// hình bầu dục. 40px là cỡ chữ viết tay to nhất người ta thường dùng để chú thích, và là hình tròn
// nhỏ nhất người ta thường cố ý vẽ; đặt ranh giới ở đây bỏ sót ít nhất mà nhận bừa cũng ít nhất.
const MIN_CLOSED_SIZE = 40

// `scale` = số pixel màn hình trên một đơn vị toạ độ bảng (chính là mức phóng hiện tại).
//
// Vì sao phải có: mọi ngưỡng ở đây trả lời câu hỏi "người dùng ĐỊNH vẽ hình hay đang viết chữ", mà
// câu đó chỉ có nghĩa theo kích thước NHÌN THẤY trên màn hình. Cùng một chữ "o" viết tay, lúc phóng
// to 4× có toạ độ bảng nhỏ hơn 4 lần so với lúc thu nhỏ — đo theo toạ độ bảng thì cùng một hành vi
// lại cho hai kết quả khác nhau.
export function recognizeShape(flat: number[], scale = 1): Recognized | null {
  const raw = toPts(flat)
  if (raw.length < 4) return null
  const len = pathLength(raw)
  if (len * scale < MIN_LENGTH) return null

  const box = bbox(raw)
  const diag = Math.hypot(box.w, box.h)
  if (diag * scale < 20) return null

  const pts = resample(raw, 64)
  const start = pts[0]
  const end = pts[pts.length - 1]
  const gap = Math.hypot(end.x - start.x, end.y - start.y)
  const closed = gap / len < CLOSED_RATIO

  if (!closed) return recognizeOpen(pts, len, diag)
  return recognizeClosed(pts, diag, box, scale)
}

// ─── Nét hở: đường thẳng hoặc mũi tên ─────────────────────────────────────────

function recognizeOpen(pts: Pt[], len: number, diag: number): Recognized | null {
  const a = pts[0]
  const b = pts[pts.length - 1]
  const span = Math.hypot(b.x - a.x, b.y - a.y)
  if (span < 1) return null

  // Thẳng: mọi điểm nằm sát đoạn nối hai đầu.
  let maxDev = 0
  pts.forEach((p) => {
    const d = distToSegment(p, a, b)
    if (d > maxDev) maxDev = d
  })
  if (maxDev / span < LINE_TOLERANCE) {
    return { kind: "line", points: [a.x, a.y, b.x, b.y] }
  }

  // Mũi tên: một thân dài rồi gập lại thành đầu mũi. Rút gọn thành ít đỉnh rồi xét — thân phải
  // chiếm phần lớn chiều dài, và đoạn cuối phải gập một góc lớn so với thân.
  const simplified = simplify(pts, diag * 0.05)
  if (simplified.length >= 3 && simplified.length <= 5) {
    const shaftEnd = simplified[1]
    const shaftLen = Math.hypot(shaftEnd.x - a.x, shaftEnd.y - a.y)
    // Thân phải dài hơn hẳn phần còn lại, nếu không đây là một đường zigzag chứ không phải mũi tên.
    if (shaftLen > len * 0.5) {
      const tail = simplified[simplified.length - 1]
      const headLen = Math.hypot(tail.x - shaftEnd.x, tail.y - shaftEnd.y)
      if (headLen > diag * 0.06 && headLen < shaftLen * 0.6) {
        const shaftAng = Math.atan2(shaftEnd.y - a.y, shaftEnd.x - a.x)
        const headAng = Math.atan2(tail.y - shaftEnd.y, tail.x - shaftEnd.x)
        let turn = Math.abs(headAng - shaftAng)
        if (turn > Math.PI) turn = Math.PI * 2 - turn
        // Gập lại từ 100° trở lên mới coi là đầu mũi tên; dưới mức đó chỉ là một nét cong.
        if (turn > 1.75) return { kind: "arrow", points: arrowPoints(a, shaftEnd) }
      }
    }
  }
  return null
}

// Mũi tên chuẩn: thân từ a tới b, rồi quay lại đầu mút để quét hai cạnh đầu mũi bằng cùng một
// đường — cùng cách dựng với shapePoints("arrow") trong mindmapGeometry.ts để hai nơi không lệch.
function arrowPoints(a: Pt, b: Pt): number[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  const head = Math.max(9, Math.min(26, len * 0.24))
  const ang = Math.atan2(b.y - a.y, b.x - a.x)
  const a1 = ang + Math.PI * 0.82
  const a2 = ang - Math.PI * 0.82
  return [
    a.x, a.y,
    b.x, b.y,
    b.x + Math.cos(a1) * head, b.y + Math.sin(a1) * head,
    b.x, b.y,
    b.x + Math.cos(a2) * head, b.y + Math.sin(a2) * head,
  ]
}

// ─── Nét khép kín: chữ nhật, tam giác, ellipse ────────────────────────────────

function recognizeClosed(
  pts: Pt[],
  diag: number,
  box: { x: number; y: number; w: number; h: number },
  scale: number,
): Recognized | null {
  // Ngưỡng kích thước để không nắn nhầm chữ cái thành hình — xem MIN_CLOSED_SIZE ở trên.
  if (box.w * scale < MIN_CLOSED_SIZE || box.h * scale < MIN_CLOSED_SIZE) return null

  // Khép vòng lại trước khi rút gọn, để cạnh cuối (nối điểm cuối về điểm đầu) cũng được xét.
  const ring = [...pts, pts[0]]
  const simplified = simplify(ring, diag * 0.055)
  // Bỏ điểm đóng vòng trùng với điểm đầu.
  const corners = simplified.length > 1 ? simplified.slice(0, -1) : simplified

  if (corners.length === 3) {
    return { kind: "triangle", points: closedPoly(corners) }
  }

  if (corners.length === 4) {
    // Chỉ nắn thành chữ nhật khi các cạnh THỰC SỰ gần song song với trục màn hình. Một hình thoi
    // hay hình bình hành bị ép về chữ nhật vuông góc là kiểu "sửa hộ" mà người vẽ không hề muốn —
    // với chúng chỉ nắn thẳng bốn cạnh và giữ nguyên hình dạng, gọi đúng tên là đa giác.
    if (isAxisAligned(corners)) {
      return { kind: "rect", points: rectPoints(box) }
    }
    return { kind: "polygon", points: closedPoly(corners) }
  }

  // Nhiều đỉnh (đường cong trơn) → ellipse, nhưng phải kiểm tra thật sự tròn trịa: khoảng cách từ
  // tâm tới các điểm, sau khi chuẩn hoá theo bán trục, phải xấp xỉ bằng nhau. Không có bước này
  // thì mọi nét nguệch ngoạc khép kín đều biến thành ellipse.
  if (corners.length >= 5 && isEllipseLike(pts, box)) {
    return { kind: "ellipse", points: ellipsePoints(box) }
  }
  return null
}

// Bốn cạnh có gần song song với trục ngang/dọc không (lệch dưới ~18°).
function isAxisAligned(c: Pt[]): boolean {
  for (let i = 0; i < c.length; i++) {
    const a = c[i]
    const b = c[(i + 1) % c.length]
    const ang = Math.abs(Math.atan2(b.y - a.y, b.x - a.x))
    // Quy về góc lệch so với trục gần nhất (0° hoặc 90°).
    const off = Math.min(ang, Math.abs(ang - Math.PI / 2), Math.abs(ang - Math.PI))
    if (off > 0.31) return false
  }
  return true
}

function isEllipseLike(pts: Pt[], box: { x: number; y: number; w: number; h: number }): boolean {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const rx = box.w / 2
  const ry = box.h / 2
  if (rx < 6 || ry < 6) return false
  // Trên ellipse chuẩn, ((x−cx)/rx)² + ((y−cy)/ry)² = 1 tại mọi điểm. Lấy độ lệch trung bình so
  // với 1 làm thước đo độ "tròn trịa".
  let err = 0
  pts.forEach((p) => {
    const u = (p.x - cx) / rx
    const v = (p.y - cy) / ry
    err += Math.abs(Math.hypot(u, v) - 1)
  })
  return err / pts.length < 0.17
}

function closedPoly(c: Pt[]): number[] {
  return flatten([...c, c[0]])
}

function rectPoints(box: { x: number; y: number; w: number; h: number }): number[] {
  const { x, y, w, h } = box
  return [x, y, x + w, y, x + w, y + h, x, y + h, x, y]
}

function ellipsePoints(box: { x: number; y: number; w: number; h: number }): number[] {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const rx = box.w / 2
  const ry = box.h / 2
  const out: number[] = []
  const steps = 48
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    out.push(Math.round((cx + Math.cos(t) * rx) * 10) / 10, Math.round((cy + Math.sin(t) * ry) * 10) / 10)
  }
  return out
}

export const SHAPE_LABELS: Record<RecognizedKind, string> = {
  line: "Đường thẳng",
  arrow: "Mũi tên",
  rect: "Khung chữ nhật",
  triangle: "Tam giác",
  polygon: "Đa giác",
  ellipse: "Hình bầu dục",
}
