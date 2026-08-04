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

// Vẽ cả bảng ra một canvas. Tách riêng khỏi phần đóng gói file để PNG và PDF dùng CHUNG đúng một
// đường vẽ — hai đường vẽ riêng là hai thứ sẽ lệch nhau dần, và người dùng sẽ thấy file PDF khác
// file PNG của cùng một bảng.
async function renderMindmapCanvas(data: MindmapData, sizes: Sizes, paper: PaperKind): Promise<HTMLCanvasElement | null> {
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

  return canvas
}

// Vẽ cả bảng ra một Blob PNG. Trả về null nếu bảng chưa có gì để xuất.
export async function exportMindmapPng(data: MindmapData, sizes: Sizes, paper: PaperKind): Promise<Blob | null> {
  const canvas = await renderMindmapCanvas(data, sizes, paper)
  if (!canvas) return null
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"))
}

// ─── Xuất PDF ─────────────────────────────────────────────────────────────────
//
// Tự dựng file PDF thay vì kéo về một thư viện (jsPDF ~350KB): app này chạy hoàn toàn ngoại tuyến
// và được cài như PWA, mỗi kilobyte thêm vào là thêm thời gian tải lần đầu ở chỗ sóng yếu.
//
// PDF cần đúng một trang chứa một ảnh. Ảnh nhúng ở dạng JPEG vì PDF đọc thẳng được luồng JPEG qua
// bộ lọc DCTDecode — không phải giải nén rồi nén lại như PNG (PNG trong PDF phải chuyển sang
// FlateDecode trên dữ liệu điểm ảnh thô, tức là phải tự viết cả bộ nén zlib).

// Cạnh dài của trang, tính bằng point (1/72 inch). 842pt = cạnh dài khổ A4 — trang cỡ này mở ra
// trên mọi máy đọc đều vừa mắt, thay vì một trang khổng lồ theo đúng số điểm ảnh của bảng.
const PDF_LONG_EDGE = 842

function pdfEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

export async function exportMindmapPdf(
  data: MindmapData,
  sizes: Sizes,
  paper: PaperKind,
  title: string,
): Promise<Blob | null> {
  const canvas = await renderMindmapCanvas(data, sizes, paper)
  if (!canvas) return null

  const jpegBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92),
  )
  if (!jpegBlob) return null
  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer())

  // Trang giữ đúng tỉ lệ của bảng, cạnh dài cố định.
  const ratio = canvas.width / canvas.height
  const pageW = ratio >= 1 ? PDF_LONG_EDGE : Math.round(PDF_LONG_EDGE * ratio)
  const pageH = ratio >= 1 ? Math.round(PDF_LONG_EDGE / ratio) : PDF_LONG_EDGE

  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  let length = 0
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? enc.encode(chunk) : chunk
    parts.push(bytes)
    length += bytes.length
  }

  // Vị trí byte của từng đối tượng — bảng xref ở cuối file phải trỏ chính xác, sai một byte là máy
  // đọc báo file hỏng.
  const offsets: number[] = []
  const startObj = (n: number) => {
    offsets[n] = length
    push(`${n} 0 obj\n`)
  }

  push("%PDF-1.4\n")
  // Một dòng bình luận chứa byte > 127 để mọi công cụ nhận ra đây là file nhị phân, không phải văn bản.
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))

  startObj(1)
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

  startObj(2)
  push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")

  startObj(3)
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  )

  startObj(4)
  push(
    `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  )
  push(jpeg)
  push("\nendstream\nendobj\n")

  // Ma trận đặt ảnh: phóng ảnh cho vừa đúng khổ trang. PDF lấy gốc toạ độ ở góc DƯỚI trái.
  const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`
  startObj(5)
  push(`<< /Length ${enc.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`)

  startObj(6)
  push(`<< /Title (${pdfEscape(title)}) /Producer (Bac si Trong) >>\nendobj\n`)

  const xrefAt = length
  push("xref\n0 7\n0000000000 65535 f \n")
  for (let i = 1; i <= 6; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`)
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`)

  return new Blob(parts as BlobPart[], { type: "application/pdf" })
}

// Đưa ảnh vừa vẽ cho người dùng. Trên iPhone, bảng chia sẻ của iOS (Web Share) là cách duy nhất lưu
// được vào Ảnh hoặc gửi đi ngay; máy nào không có thì tải file về như bình thường.
// Trả về "share" | "download" để màn hình báo đúng việc vừa xảy ra.
export async function deliverPng(blob: Blob, fileName: string): Promise<"share" | "download"> {
  const file = new File([blob], fileName, { type: blob.type || "image/png" })
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
