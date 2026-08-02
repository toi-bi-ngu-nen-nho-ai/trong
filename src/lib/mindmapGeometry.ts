// Tính toán hình học cho bảng Sơ đồ tư duy — tách khỏi component để MindmapBoard chỉ còn phần
// tương tác, và để cùng MỘT công thức được dùng cho ba nơi vẽ khác nhau: React (vẽ lần đầu),
// cập nhật trực tiếp DOM khi đang kéo ngón tay, và xuất ảnh PNG bằng canvas. Ba nơi vẽ lệch công
// thức là lỗi rất dễ xảy ra (đường nối "nhảy" một nhịp khi thả tay), nên chỉ có một nguồn duy nhất.

import type { MindEdge, MindImage, MindNode, MindmapData } from "../data/types"

export type ShapeKind = "line" | "arrow" | "rect" | "ellipse"

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

// Kích thước thẻ ghi chú dùng khi CHƯA đo được thẻ thật (thẻ vừa tạo, hoặc lúc xuất ảnh trước khi
// React kịp đo). Chỉ là giá trị tạm để đường nối không bị chụm về một điểm.
export const NODE_FALLBACK: { w: number; h: number } = { w: 116, h: 42 }

// ─── Nét vẽ ───────────────────────────────────────────────────────────────────

// Đường đi của một nét. Nét viết tay được làm mượt bằng đường bậc hai qua trung điểm từng cặp điểm
// (rẻ và đủ mượt, không cần thư viện ngoài). Hình vẽ (`straight`) nối thẳng để góc khung không bị
// bo tròn và mũi tên không bị cụt đầu.
export function strokePath(points: number[], straight = false): string {
  if (points.length < 4) {
    // Nét chỉ có một điểm (chạm rồi nhấc): vẽ một đoạn cực ngắn để thành dấu chấm nhìn thấy được.
    if (points.length === 2) return `M ${points[0]} ${points[1]} L ${points[0] + 0.1} ${points[1]}`
    return ""
  }
  let d = `M ${points[0]} ${points[1]}`
  if (straight) {
    for (let i = 2; i < points.length; i += 2) d += ` L ${points[i]} ${points[i + 1]}`
    return d
  }
  for (let i = 2; i < points.length - 2; i += 2) {
    const mx = (points[i] + points[i + 2]) / 2
    const my = (points[i + 1] + points[i + 3]) / 2
    d += ` Q ${points[i]} ${points[i + 1]} ${mx} ${my}`
  }
  d += ` L ${points[points.length - 2]} ${points[points.length - 1]}`
  return d
}

// Điểm của một hình vẽ, xuất ra cùng dạng "danh sách điểm" như nét viết tay — nhờ vậy hình vẽ dùng
// lại được toàn bộ phần lưu trữ, tẩy, hoàn tác và xuất ảnh của nét thường, không cần kiểu dữ liệu
// riêng. Mũi tên: vẽ thân rồi quay lại đầu mút để quét hai cạnh đầu mũi bằng cùng một đường.
export function shapePoints(kind: ShapeKind, x1: number, y1: number, x2: number, y2: number): number[] {
  if (kind === "line") return [x1, y1, x2, y2]

  if (kind === "arrow") {
    const len = Math.hypot(x2 - x1, y2 - y1)
    if (len < 1) return [x1, y1, x2, y2]
    const head = Math.max(9, Math.min(26, len * 0.24))
    const ang = Math.atan2(y2 - y1, x2 - x1)
    const a1 = ang + Math.PI * 0.82
    const a2 = ang - Math.PI * 0.82
    return [
      x1,
      y1,
      x2,
      y2,
      x2 + Math.cos(a1) * head,
      y2 + Math.sin(a1) * head,
      x2,
      y2,
      x2 + Math.cos(a2) * head,
      y2 + Math.sin(a2) * head,
    ]
  }

  if (kind === "rect") {
    return [x1, y1, x2, y1, x2, y2, x1, y2, x1, y1]
  }

  // Hình bầu dục nội tiếp khung người dùng kéo — lấy 44 điểm là đủ tròn ở mọi mức phóng thường dùng.
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const rx = Math.abs(x2 - x1) / 2
  const ry = Math.abs(y2 - y1) / 2
  const pts: number[] = []
  const steps = 44
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    pts.push(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry)
  }
  return pts
}

// ─── Nét bút có bề dày thay đổi ───────────────────────────────────────────────
//
// Nét viết bằng đường kẻ đều dày (một `stroke` duy nhất) luôn trông như nét bút bi ép cùng một lực
// từ đầu đến cuối. Nét bút thật thì đầu nét nhẹ, giữa đậm, lúc nhấc tay lại mảnh. Muốn vẽ được như
// vậy trên SVG thì không thể dùng `stroke` (một nét chỉ có một `stroke-width`) — phải tự dựng VÙNG
// TÔ: đi dọc nét, ở mỗi điểm lấy pháp tuyến rồi đẩy ra hai bên đúng nửa bề dày tại điểm đó, được hai
// đường biên; nối biên trái đi xuôi với biên phải đi ngược lại thành một hình khép kín rồi tô đầy.
//
// Hai đầu nét bo tròn bằng cung nửa vòng (`A`), nếu để phẳng thì nét trông như bị cắt cụt.
//
// Ở khúc cua gấp, hai biên có thể tự cắt nhau và sinh một vệt phình nhỏ. Đây là nhược điểm cố hữu của
// cách dựng biên này; chấp nhận được vì nét viết tay hiếm khi gập 180°, và dùng quy tắc tô mặc định
// (nonzero) thì chỗ chồng nhau vẫn tô kín chứ không thành lỗ trống.
function normalAt(points: number[], i: number): { nx: number; ny: number } {
  const n = points.length / 2
  const prev = Math.max(0, i - 1)
  const next = Math.min(n - 1, i + 1)
  const dx = points[next * 2] - points[prev * 2]
  const dy = points[next * 2 + 1] - points[prev * 2 + 1]
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return { nx: 0, ny: 0 }
  // Pháp tuyến = tiếp tuyến quay 90°.
  return { nx: -dy / len, ny: dx / len }
}

export function strokeOutline(points: number[], widths: number[]): string {
  const n = Math.min(points.length / 2, widths.length)
  if (n === 0) return ""
  if (n === 1) {
    // Chạm một điểm rồi nhấc: một dấu chấm tròn đúng bề dày tại điểm đó.
    const r = Math.max(0.4, widths[0] / 2)
    const [x, y] = [points[0], points[1]]
    return `M ${x - r} ${y} A ${r} ${r} 0 1 0 ${x + r} ${y} A ${r} ${r} 0 1 0 ${x - r} ${y} Z`
  }

  const left: number[] = []
  const right: number[] = []
  for (let i = 0; i < n; i++) {
    const { nx, ny } = normalAt(points, i)
    const half = Math.max(0.25, widths[i] / 2)
    const x = points[i * 2]
    const y = points[i * 2 + 1]
    left.push(x + nx * half, y + ny * half)
    right.push(x - nx * half, y - ny * half)
  }

  const rEnd = Math.max(0.25, widths[n - 1] / 2)
  const rStart = Math.max(0.25, widths[0] / 2)

  let d = `M ${left[0]} ${left[1]}`
  // Biên trái đi xuôi, làm mượt bằng đường bậc hai qua trung điểm — cùng cách làm mượt với nét đều.
  for (let i = 1; i < n - 1; i++) {
    const mx = (left[i * 2] + left[i * 2 + 2]) / 2
    const my = (left[i * 2 + 1] + left[i * 2 + 3]) / 2
    d += ` Q ${left[i * 2]} ${left[i * 2 + 1]} ${mx} ${my}`
  }
  d += ` L ${left[(n - 1) * 2]} ${left[(n - 1) * 2 + 1]}`
  // Bo tròn đầu cuối sang biên phải.
  d += ` A ${rEnd} ${rEnd} 0 0 1 ${right[(n - 1) * 2]} ${right[(n - 1) * 2 + 1]}`
  // Biên phải đi ngược về.
  for (let i = n - 2; i > 0; i--) {
    const mx = (right[i * 2] + right[i * 2 + 2]) / 2
    const my = (right[i * 2 + 1] + right[i * 2 + 3]) / 2
    d += ` Q ${right[i * 2 + 2]} ${right[i * 2 + 3]} ${mx} ${my}`
  }
  d += ` L ${right[0]} ${right[1]}`
  // Bo tròn đầu bắt đầu, đóng hình.
  d += ` A ${rStart} ${rStart} 0 0 1 ${left[0]} ${left[1]} Z`
  return d
}

// ─── Khoanh vùng (lasso) ──────────────────────────────────────────────────────

// Điểm có nằm trong vùng khoanh không — thuật toán ray casting (đếm số lần tia ngang cắt biên).
export function pointInPolygon(poly: number[], px: number, py: number): boolean {
  let inside = false
  const n = poly.length / 2
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2]
    const yi = poly[i * 2 + 1]
    const xj = poly[j * 2]
    const yj = poly[j * 2 + 1]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Nét được coi là "đã khoanh" khi phần lớn điểm của nó nằm trong vùng — khoanh chạm nhẹ vào cái đuôi
// của một nét dài thì không kéo theo cả nét đó.
export function strokeMostlyInside(points: number[], poly: number[], ratio = 0.6): boolean {
  const n = points.length / 2
  if (n === 0) return false
  let hits = 0
  for (let i = 0; i < n; i++) {
    if (pointInPolygon(poly, points[i * 2], points[i * 2 + 1])) hits++
  }
  return hits / n >= ratio
}

// Hộp (thẻ ghi chú, ảnh) được coi là đã khoanh khi TÂM của nó nằm trong vùng.
export function boxCenterInside(box: Box, poly: number[]): boolean {
  return pointInPolygon(poly, box.x + box.w / 2, box.y + box.h / 2)
}

// Khoảng cách từ một điểm tới đoạn thẳng AB — dùng cho tẩy.
function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// Tẩy có trúng nét này không. Xét theo TỪNG ĐOẠN giữa hai điểm liên tiếp, không chỉ xét các điểm:
// vẽ nhanh thì hai điểm liên tiếp cách nhau khá xa, xét theo điểm sẽ để tẩy "lọt" qua giữa nét mà
// không xoá được — đúng cái cảm giác tẩy không nhạy.
export function strokeHit(points: number[], width: number, cx: number, cy: number, radius: number): boolean {
  const reach = radius + width / 2
  if (points.length === 2) return Math.hypot(cx - points[0], cy - points[1]) <= reach
  for (let i = 0; i + 3 < points.length; i += 2) {
    if (distToSegment(cx, cy, points[i], points[i + 1], points[i + 2], points[i + 3]) <= reach) return true
  }
  return false
}

// ─── Thẻ ghi chú và đường nối ─────────────────────────────────────────────────

export function nodeBox(node: MindNode, size?: { w: number; h: number }): Box {
  return { x: node.x, y: node.y, w: size?.w ?? NODE_FALLBACK.w, h: size?.h ?? NODE_FALLBACK.h }
}

// Điểm nằm trên viền hộp, theo hướng từ tâm hộp tới (tx, ty) — để đường nối dừng đúng ở mép thẻ
// thay vì chạy xuyên qua chữ.
function boxBorderPoint(box: Box, tx: number, ty: number): { x: number; y: number } {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const dx = tx - cx
  const dy = ty - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const hw = box.w / 2
  const hh = box.h / 2
  // Tỉ lệ cần nhân vào hướng (dx, dy) để chạm cạnh gần nhất của hình chữ nhật.
  const sx = dx === 0 ? Infinity : hw / Math.abs(dx)
  const sy = dy === 0 ? Infinity : hh / Math.abs(dy)
  const s = Math.min(sx, sy)
  return { x: cx + dx * s, y: cy + dy * s }
}

export interface EdgeGeometry {
  // Đường cong thân nối.
  d: string
  // Tam giác đầu mũi ở phía thẻ đích.
  head: string
  // Điểm giữa cung — chỗ đặt nút xoá khi người dùng chạm chọn đường nối.
  mid: { x: number; y: number }
}

interface EdgeCurve {
  a: { x: number; y: number }
  b: { x: number; y: number }
  ctrl: { x: number; y: number }
}

// Cung nối hai thẻ: cong nhẹ (12% chiều dài) thay vì đoạn thẳng — nhiều nối cùng lúc vẫn phân biệt
// được nhau và trông giống sơ đồ tư duy vẽ tay hơn. Tách riêng để phần vẽ và phần xét chạm trúng
// dùng CHUNG một đường cong, không thể lệch nhau.
function edgeCurve(from: Box, to: Box): EdgeCurve {
  const c1 = { x: from.x + from.w / 2, y: from.y + from.h / 2 }
  const c2 = { x: to.x + to.w / 2, y: to.y + to.h / 2 }
  const a = boxBorderPoint(from, c2.x, c2.y)
  const b = boxBorderPoint(to, c1.x, c1.y)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return { a, b, ctrl: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
  const bow = Math.min(26, len * 0.12)
  // Điểm điều khiển: trung điểm đẩy lệch theo phương vuông góc.
  return { a, b, ctrl: { x: (a.x + b.x) / 2 - (dy / len) * bow, y: (a.y + b.y) / 2 + (dx / len) * bow } }
}

function curveAt(c: EdgeCurve, t: number): { x: number; y: number } {
  const u = 1 - t
  return {
    x: u * u * c.a.x + 2 * u * t * c.ctrl.x + t * t * c.b.x,
    y: u * u * c.a.y + 2 * u * t * c.ctrl.y + t * t * c.b.y,
  }
}

export function edgeGeometry(from: Box, to: Box): EdgeGeometry {
  const c = edgeCurve(from, to)
  const { a, b, ctrl } = c
  const mid = curveAt(c, 0.5)
  if (Math.hypot(b.x - a.x, b.y - a.y) < 1) {
    return { d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`, head: "", mid }
  }

  // Hướng đầu mũi lấy theo tiếp tuyến cuối cung (từ điểm điều khiển tới đích), không lấy theo
  // đường thẳng a→b, nếu không mũi sẽ lệch khỏi nét cong.
  const hAng = Math.atan2(b.y - ctrl.y, b.x - ctrl.x)
  const hl = 9
  const h1 = { x: b.x - Math.cos(hAng - 0.42) * hl, y: b.y - Math.sin(hAng - 0.42) * hl }
  const h2 = { x: b.x - Math.cos(hAng + 0.42) * hl, y: b.y - Math.sin(hAng + 0.42) * hl }

  return {
    d: `M ${a.x} ${a.y} Q ${ctrl.x} ${ctrl.y} ${b.x} ${b.y}`,
    head: `M ${b.x} ${b.y} L ${h1.x} ${h1.y} L ${h2.x} ${h2.y} Z`,
    mid,
  }
}

// Khoảng cách từ một điểm tới cung nối — để biết người dùng có chạm trúng đường nối hay không.
// Lấy 18 điểm trên cung là đủ chính xác cho việc xét trúng bằng ngón tay.
export function edgeDistance(from: Box, to: Box, px: number, py: number): number {
  const c = edgeCurve(from, to)
  let best = Infinity
  let prev = curveAt(c, 0)
  for (let i = 1; i <= 18; i++) {
    const cur = curveAt(c, i / 18)
    const d = distToSegment(px, py, prev.x, prev.y, cur.x, cur.y)
    if (d < best) best = d
    prev = cur
  }
  return best
}

export function edgeKey(e: MindEdge): string {
  return `${e.from}->${e.to}`
}

// ─── Khung chứa toàn bộ nội dung ───────────────────────────────────────────────

// Hình chữ nhật nhỏ nhất chứa mọi thứ đang có trên bảng — dùng cho nút "vừa khung" và cho xuất ảnh.
// Trả về null khi bảng trống hoàn toàn.
export function contentBounds(
  data: MindmapData,
  sizes: Record<string, { w: number; h: number }>,
): Box | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let has = false

  const grow = (x: number, y: number) => {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    has = true
  }

  data.nodes.forEach((n) => {
    const b = nodeBox(n, sizes[n.id])
    grow(b.x, b.y)
    grow(b.x + b.w, b.y + b.h)
  })
  ;(data.images ?? []).forEach((im: MindImage) => {
    grow(im.x, im.y)
    grow(im.x + im.w, im.y + im.h)
  })
  ;(data.strokes ?? []).forEach((s) => {
    // Nét bề dày thay đổi có thể phình rộng hơn `width` danh nghĩa — lấy chỗ dày nhất để khung không
    // cắt mất một bên nét khi xuất ảnh.
    const half = Math.max(s.width, ...(s.widths ?? [0])) / 2
    for (let i = 0; i + 1 < s.points.length; i += 2) {
      grow(s.points[i] - half, s.points[i + 1] - half)
      grow(s.points[i] + half, s.points[i + 1] + half)
    }
  })

  if (!has) return null
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) }
}

// Vị trí đặt một nhánh con mới quanh thẻ cha: quay quanh cha theo số nhánh đã có, ưu tiên toả sang
// phải/trái rồi mới xuống — cách xếp này cho hình dạng gần với sơ đồ tư duy vẽ tay, và nhánh mới
// không bao giờ đè lên nhánh vừa tạo.
const BRANCH_ANGLES = [0, Math.PI, -0.55, Math.PI + 0.55, 0.55, Math.PI - 0.55, -1.25, Math.PI + 1.25, 1.25, Math.PI - 1.25]

export function branchPosition(
  parent: Box,
  childIndex: number,
  childSize: { w: number; h: number } = NODE_FALLBACK,
): { x: number; y: number } {
  const ang = BRANCH_ANGLES[childIndex % BRANCH_ANGLES.length]
  const radius = 132 + Math.floor(childIndex / BRANCH_ANGLES.length) * 74
  const cx = parent.x + parent.w / 2 + Math.cos(ang) * (radius + parent.w / 2)
  const cy = parent.y + parent.h / 2 + Math.sin(ang) * (radius * 0.62 + parent.h / 2)
  return { x: Math.round(cx - childSize.w / 2), y: Math.round(cy - childSize.h / 2) }
}

// ─── Cây nhánh ────────────────────────────────────────────────────────────────
//
// Đường nối có chiều (from → to) nên các thẻ tạo thành một cái cây. Nhưng người dùng nối tay được
// nên đồ hình CÓ THỂ có vòng (A→B→C→A) hoặc một thẻ có hai cha. Mọi hàm đi theo cây dưới đây vì vậy
// đều mang theo một tập "đã thăm": không có nó thì một vòng nối là app đứng máy vì lặp vô tận.

export function childrenMap(edges: MindEdge[]): Map<string, string[]> {
  const m = new Map<string, string[]>()
  edges.forEach((e) => {
    const list = m.get(e.from)
    if (list) list.push(e.to)
    else m.set(e.from, [e.to])
  })
  return m
}

// Mọi thẻ nằm bên dưới một thẻ, không tính chính nó.
export function descendantsOf(rootId: string, kids: Map<string, string[]>): Set<string> {
  const out = new Set<string>()
  const stack = [...(kids.get(rootId) ?? [])]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (id === rootId || out.has(id)) continue
    out.add(id)
    ;(kids.get(id) ?? []).forEach((c) => stack.push(c))
  }
  return out
}

// Chuỗi thẻ cha, ông... của một thẻ, từ gần tới xa. Dùng khi nhảy tới một thẻ đang nằm trong nhánh
// bị gấp: phải mở lại đúng những thẻ cha đang gấp thì mới thấy được nó.
export function ancestorsOf(nodeId: string, edges: MindEdge[]): string[] {
  const parent = new Map<string, string>()
  edges.forEach((e) => {
    if (!parent.has(e.to)) parent.set(e.to, e.from)
  })
  const out: string[] = []
  const seen = new Set<string>([nodeId])
  let cur = parent.get(nodeId)
  while (cur && !seen.has(cur)) {
    seen.add(cur)
    out.push(cur)
    cur = parent.get(cur)
  }
  return out
}

// Những thẻ đang bị ẩn vì nằm dưới một thẻ đang gấp, kèm số thẻ ẩn của TỪNG thẻ đang gấp (để in lên
// dấu tròn "còn N thẻ nữa" — người dùng phải biết mình đang giấu bao nhiêu thứ ở đây).
export function hiddenByCollapse(
  nodes: MindNode[],
  edges: MindEdge[],
): { hidden: Set<string>; counts: Map<string, number> } {
  const counts = new Map<string, number>()
  const hidden = new Set<string>()
  const collapsed = nodes.filter((n) => n.collapsed)
  if (collapsed.length === 0) return { hidden, counts }
  const kids = childrenMap(edges)
  collapsed.forEach((n) => {
    const under = descendantsOf(n.id, kids)
    counts.set(n.id, under.size)
    under.forEach((id) => hidden.add(id))
  })
  // Thẻ đang gấp thì bản thân nó luôn hiện — nếu không, gấp một nhánh có vòng nối sẽ làm biến mất
  // luôn cả thẻ vừa bấm và không còn cách nào mở lại.
  collapsed.forEach((n) => hidden.delete(n.id))
  return { hidden, counts }
}

// ─── Xếp lại cả nhánh ─────────────────────────────────────────────────────────
//
// Kiểu xếp: thẻ gốc đứng giữa, các nhánh con toả sang PHẢI và TRÁI thành hai cột, đời sau lại toả
// tiếp cùng hướng với đời trước. Đây là hình dạng chuẩn của sơ đồ tư duy và quan trọng hơn cả là nó
// KHÔNG BAO GIỜ để hai thẻ chồng nhau: chiều cao mỗi nhánh được tính từ dưới lên (chiều cao của một
// nhánh = tổng chiều cao các nhánh con của nó), rồi mới chia chỗ từ trên xuống.
//
// Bản trước chỉ xếp được các con TRỰC TIẾP theo vòng tròn quanh cha, nên vừa xếp xong là các cháu
// nằm đè lên nhau ở đâu đó.
const TIDY_GAP_X = 56
const TIDY_GAP_Y = 18

interface TidyNode {
  id: string
  w: number
  h: number
  kids: TidyNode[]
  // Chiều cao chỗ mà cả nhánh này chiếm.
  block: number
}

type Sizes = Record<string, { w: number; h: number }>

function buildTidy(
  id: string,
  byId: Map<string, MindNode>,
  kids: Map<string, string[]>,
  sizes: Sizes,
  seen: Set<string>,
): TidyNode {
  const node = byId.get(id)!
  const size = sizes[id] ?? NODE_FALLBACK
  const children: TidyNode[] = []
  // Nhánh đang gấp được coi như một thẻ lá: đang ẩn thì không xếp chỗ cho nó làm gì.
  if (!node.collapsed) {
    ;(kids.get(id) ?? []).forEach((cid) => {
      if (seen.has(cid) || !byId.has(cid)) return
      seen.add(cid)
      children.push(buildTidy(cid, byId, kids, sizes, seen))
    })
  }
  const stack =
    children.reduce((s, c) => s + c.block, 0) + Math.max(0, children.length - 1) * TIDY_GAP_Y
  return { id, w: size.w, h: size.h, kids: children, block: Math.max(size.h, stack) }
}

// `x` là mép TRONG của thẻ: mép trái khi nhánh toả sang phải, mép phải khi toả sang trái.
function placeTidy(
  t: TidyNode,
  x: number,
  yTop: number,
  dir: 1 | -1,
  out: Map<string, { x: number; y: number }>,
): void {
  const nx = dir === 1 ? x : x - t.w
  out.set(t.id, { x: Math.round(nx), y: Math.round(yTop + (t.block - t.h) / 2) })
  const childX = dir === 1 ? nx + t.w + TIDY_GAP_X : nx - TIDY_GAP_X
  let cy = yTop
  t.kids.forEach((c) => {
    placeTidy(c, childX, cy, dir, out)
    cy += c.block + TIDY_GAP_Y
  })
}

// Vị trí mới cho MỌI thẻ nằm dưới `rootId`. Thẻ gốc giữ nguyên chỗ đang đứng — người dùng bấm "xếp
// lại" là muốn dọn phần bên dưới, không muốn cả bảng nhảy đi chỗ khác.
export function layoutSubtree(
  rootId: string,
  nodes: MindNode[],
  edges: MindEdge[],
  sizes: Sizes,
): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>()
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const root = byId.get(rootId)
  if (!root || root.collapsed) return out

  const kids = childrenMap(edges)
  const seen = new Set<string>([rootId])
  const trees: TidyNode[] = []
  ;(kids.get(rootId) ?? []).forEach((cid) => {
    if (seen.has(cid) || !byId.has(cid)) return
    seen.add(cid)
    trees.push(buildTidy(cid, byId, kids, sizes, seen))
  })
  if (trees.length === 0) return out

  // Chia đôi: nửa đầu sang phải, nửa sau sang trái — giữ nguyên thứ tự người dùng đã tạo nhánh, nên
  // xếp lại lần nữa vẫn ra đúng hình cũ chứ không xáo trộn.
  const half = Math.ceil(trees.length / 2)
  const rootSize = sizes[rootId] ?? NODE_FALLBACK
  const cy = root.y + rootSize.h / 2

  const side = (list: TidyNode[], dir: 1 | -1) => {
    if (list.length === 0) return
    const total = list.reduce((s, t) => s + t.block, 0) + (list.length - 1) * TIDY_GAP_Y
    const x = dir === 1 ? root.x + rootSize.w + TIDY_GAP_X : root.x - TIDY_GAP_X
    let y = cy - total / 2
    list.forEach((t) => {
      placeTidy(t, x, y, dir, out)
      y += t.block + TIDY_GAP_Y
    })
  }
  side(trees.slice(0, half), 1)
  side(trees.slice(half), -1)
  return out
}
