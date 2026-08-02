// Xuất bảng Sơ đồ tư duy thành một ảnh PNG.
//
// Vì sao vẽ lại bằng canvas thay vì "chụp" phần HTML đang hiển thị: bảng là canvas vô hạn, phần
// nhìn thấy trên màn hình điện thoại chỉ là một ô cửa nhỏ — chụp màn hình sẽ mất gần hết nội dung.
// Vẽ lại thì lấy được ĐÚNG khung chứa mọi thứ trên bảng, ở độ phân giải gấp đôi, dù bảng rộng bao
// nhiêu. Cách này cũng không cần thư viện ngoài (html2canvas...) và chạy hoàn toàn trên máy.

import type { MindmapData, MindNode } from "../data/types"
import { contentBounds, edgeGeometry, nodeBox, strokeOutline, strokePath } from "./mindmapGeometry"
import {
  ALGORITHM_EDGE_COLOR,
  EDGE_COLOR,
  HIGHLIGHTER_ALPHA,
  NODE_FONT_STACK,
  PAPER_BG,
  PAPER_DOT,
  PAPER_LINE,
  PAPER_STEP,
  edgeColor,
  nodeMetrics,
  nodePaint,
  type PaperKind,
} from "./mindmapStyle"

const PADDING = 48
// Trần số điểm ảnh của ảnh xuất ra. Safari trên iPhone giới hạn diện tích canvas quanh mức 16,7
// triệu điểm ảnh và khi vượt thì trả về ảnh TRẮNG thay vì báo lỗi — nên phải tự chặn dưới ngưỡng đó.
const MAX_PIXELS = 12_000_000

type Sizes = Record<string, { w: number; h: number }>

function loadImage(dataUrl: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

// Ngắt dòng giống cách trình duyệt ngắt trong thẻ ghi chú: tôn trọng dấu xuống dòng người dùng gõ,
// còn lại ngắt theo từ khi vượt quá bề rộng phần chữ.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = []
  text.split("\n").forEach((para) => {
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      out.push("")
      return
    }
    let line = words[0]
    for (let i = 1; i < words.length; i++) {
      const next = `${line} ${words[i]}`
      if (ctx.measureText(next).width <= maxWidth) line = next
      else {
        out.push(line)
        line = words[i]
      }
    }
    out.push(line)
  })
  return out
}

function drawPaper(ctx: CanvasRenderingContext2D, kind: PaperKind, x: number, y: number, w: number, h: number) {
  if (kind === "plain") return
  const startX = Math.floor(x / PAPER_STEP) * PAPER_STEP
  const startY = Math.floor(y / PAPER_STEP) * PAPER_STEP

  if (kind === "dot") {
    ctx.fillStyle = PAPER_DOT
    for (let gx = startX; gx <= x + w; gx += PAPER_STEP) {
      for (let gy = startY; gy <= y + h; gy += PAPER_STEP) {
        ctx.beginPath()
        ctx.arc(gx, gy, 1.1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    return
  }

  ctx.strokeStyle = PAPER_LINE
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let gy = startY; gy <= y + h; gy += PAPER_STEP) {
    ctx.moveTo(x, gy)
    ctx.lineTo(x + w, gy)
  }
  if (kind === "grid") {
    for (let gx = startX; gx <= x + w; gx += PAPER_STEP) {
      ctx.moveTo(gx, y)
      ctx.lineTo(gx, y + h)
    }
  }
  ctx.stroke()
}

function drawNode(ctx: CanvasRenderingContext2D, node: MindNode, sizes: Sizes) {
  const box = nodeBox(node, sizes[node.id])
  const m = nodeMetrics(node)
  const paint = nodePaint(node)

  ctx.font = `600 ${m.fontSize}px ${NODE_FONT_STACK}`
  const lines = wrapText(ctx, node.text, box.w - m.padX * 2)
  // Canvas đo chữ không giống trình duyệt ngắt dòng đến từng pixel, nên số dòng ở đây có thể nhiều
  // hơn số dòng trên bảng một dòng. Cho thẻ cao thêm cho vừa chữ thay vì để chữ tràn ra ngoài thẻ.
  const h = Math.max(box.h, lines.length * m.lineHeight + m.padY * 2)

  if (paint.shadow) {
    ctx.save()
    // Bóng pha theo MÀU CỦA THẺ, lấy thẳng từ nodePaint — bảng và ảnh xuất ra phải cùng một màu bóng,
    // nếu không thẻ trên ảnh sẽ trông "dán lên" trong khi trên bảng nó nổi mềm.
    ctx.shadowColor = paint.shadowColor
    ctx.shadowBlur = 20
    ctx.shadowOffsetY = 7
    roundRect(ctx, box.x, box.y, box.w, h, m.radius)
    // Dải màu chuyển dựng lại đúng hai đầu màu mà bảng đang dùng.
    const grad = ctx.createLinearGradient(box.x, box.y, box.x, box.y + h)
    grad.addColorStop(0, paint.bgTop)
    grad.addColorStop(1, paint.bgBottom)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.restore()
  }

  if (paint.borderWidth > 0) {
    roundRect(ctx, box.x, box.y, box.w, h, m.radius)
    ctx.strokeStyle = paint.border
    ctx.lineWidth = paint.borderWidth
    ctx.stroke()
  }

  ctx.fillStyle = paint.color
  ctx.textBaseline = "middle"
  // Căn GIỮA, khớp với textAlign của thẻ trên bảng (xem MindmapBoard). Để "left" ở đây thì thẻ nhiều
  // dòng trên ảnh xuất ra xếp chữ khác hẳn thẻ đang thấy trên bảng.
  ctx.textAlign = "center"
  const cx = box.x + box.w / 2
  let ty = box.y + h / 2 - (lines.length * m.lineHeight) / 2 + m.lineHeight / 2
  lines.forEach((line) => {
    ctx.fillText(line, cx, ty)
    ty += m.lineHeight
  })
}

// Vẽ cả bảng ra một Blob PNG. Trả về null nếu bảng chưa có gì để xuất.
export async function exportMindmapPng(data: MindmapData, sizes: Sizes, paper: PaperKind): Promise<Blob | null> {
  const bounds = contentBounds(data, sizes)
  if (!bounds) return null

  const boardW = bounds.w + PADDING * 2
  const boardH = bounds.h + PADDING * 2
  const scale = Math.min(2, Math.sqrt(MAX_PIXELS / (boardW * boardH)))

  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(boardW * scale))
  canvas.height = Math.max(1, Math.round(boardH * scale))
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.fillStyle = PAPER_BG
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.scale(scale, scale)
  ctx.translate(PADDING - bounds.x, PADDING - bounds.y)

  drawPaper(ctx, paper, bounds.x - PADDING, bounds.y - PADDING, boardW, boardH)

  // Ảnh dán nằm dưới cùng, giống thứ tự lớp trên bảng.
  const images = data.images ?? []
  const loaded = await Promise.all(images.map((im) => loadImage(im.dataUrl)))
  images.forEach((im, i) => {
    const el = loaded[i]
    if (!el) return
    ctx.save()
    ctx.shadowColor = "rgba(15,23,42,.18)"
    ctx.shadowBlur = 10
    ctx.shadowOffsetY = 3
    roundRect(ctx, im.x, im.y, im.w, im.h, 10)
    ctx.fillStyle = "#fff"
    ctx.fill()
    ctx.restore()
    ctx.save()
    roundRect(ctx, im.x, im.y, im.w, im.h, 10)
    ctx.clip()
    ctx.drawImage(el, im.x, im.y, im.w, im.h)
    ctx.restore()
  })

  // Nét bút dạ trước (chìm dưới), rồi nét mực.
  const strokes = data.strokes ?? []
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  for (const pass of ["highlighter", "pen"] as const) {
    strokes
      .filter((s) => s.tool === pass)
      .forEach((s) => {
        ctx.globalAlpha = pass === "highlighter" ? HIGHLIGHTER_ALPHA : 1
        // Nét có bề dày thay đổi là một VÙNG TÔ, không phải đường kẻ — phải tô (fill) chứ không stroke,
        // nếu không ảnh xuất ra sẽ khác hẳn nét đang thấy trên bảng.
        if (s.widths && s.widths.length > 1 && !s.straight) {
          const d = strokeOutline(s.points, s.widths)
          if (!d) return
          ctx.fillStyle = s.color
          ctx.fill(new Path2D(d))
          return
        }
        const d = strokePath(s.points, s.straight)
        if (!d) return
        ctx.strokeStyle = s.color
        ctx.lineWidth = s.width
        ctx.stroke(new Path2D(d))
      })
  }
  ctx.globalAlpha = 1

  // Đường nối — mỗi sợi mang màu của thẻ con và nét đứt/liền đúng như đang thấy trên bảng (xem
  // MindEdge.kind trong data/types.ts và khối vẽ tương ứng trong MindmapBoard.tsx).
  const byId = new Map(data.nodes.map((n) => [n.id, n]))
  data.edges.forEach((e) => {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) return
    const isAlgorithm = e.kind === "algorithm"
    const color = isAlgorithm ? ALGORITHM_EDGE_COLOR : edgeColor(b.color) || EDGE_COLOR
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = isAlgorithm ? 2.6 : 2
    ctx.setLineDash(isAlgorithm ? [] : [5, 4])
    const g = edgeGeometry(nodeBox(a, sizes[a.id]), nodeBox(b, sizes[b.id]))
    ctx.stroke(new Path2D(g.d))
    ctx.setLineDash([])
    if (g.head) ctx.fill(new Path2D(g.head))
  })

  data.nodes.forEach((n) => drawNode(ctx, n, sizes))

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"))
}

// Đưa ảnh vừa vẽ cho người dùng. Trên iPhone, bảng chia sẻ của iOS (Web Share) là cách duy nhất lưu
// được vào Ảnh hoặc gửi đi ngay; máy nào không có thì tải file về như bình thường.
// Trả về "share" | "download" để màn hình báo đúng việc vừa xảy ra.
export async function deliverPng(blob: Blob, fileName: string): Promise<"share" | "download"> {
  const file = new File([blob], fileName, { type: "image/png" })
  const nav = navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean }
  if (typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return "share"
    } catch {
      // Người dùng đóng bảng chia sẻ, hoặc iOS từ chối vì đã quá xa cử chỉ chạm — tải file thay thế.
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return "download"
}
