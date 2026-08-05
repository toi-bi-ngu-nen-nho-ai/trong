// Xuất bảng Sơ đồ tư duy thành một ảnh PNG.
//
// Vì sao vẽ lại bằng canvas thay vì "chụp" phần HTML đang hiển thị: bảng là canvas vô hạn, phần
// nhìn thấy trên màn hình điện thoại chỉ là một ô cửa nhỏ — chụp màn hình sẽ mất gần hết nội dung.
// Vẽ lại thì lấy được ĐÚNG khung chứa mọi thứ trên bảng, ở độ phân giải gấp đôi, dù bảng rộng bao
// nhiêu. Cách này cũng không cần thư viện ngoài (html2canvas...) và chạy hoàn toàn trên máy.

import type { MindmapData, MindNode } from "../data/types"
import { contentBounds, edgeGeometry, nodeBox, strokeOutline, strokePath } from "./mindmapGeometry"
import { parseInline, stripInlineMarkers, type InlineToken } from "./richText"
import {
  ALGORITHM_EDGE_COLOR,
  EDGE_COLOR,
  HIGHLIGHTER_ALPHA,
  NODE_FONT_STACK,
  PAPER_BG,
  PAPER_DOT,
  PAPER_LINE,
  PAPER_STEP,
  STYLE_FONT_STACKS,
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

// ─── Chữ có định dạng (đậm/nghiêng/gạch chân/tô sáng/cỡ/màu/font) ──────────────
//
// Trước đây `node.text` là một chuỗi phẳng, vẽ bằng ĐÚNG MỘT ctx.font. Từ khi có định dạng theo
// từng đoạn (richText.ts, xem RichNodeText trong MindmapBoard.tsx cho bản HTML/CSS tương ứng), mỗi
// TỪ có thể mang một font/màu/cỡ khác nhau — canvas không có khái niệm "đoạn chữ trong một dòng đổi
// font giữa chừng" như HTML, nên phải tự đo và vẽ TỪNG TỪ một, không còn vẽ nguyên cả dòng bằng một
// lệnh fillText() như bản trước.

interface RunStyle {
  font: string // chuỗi ctx.font đầy đủ, vd "italic 800 14px 'Source Serif 4', serif"
  color: string
  underline: boolean
  highlight: boolean
}

function styleFor(tok: InlineToken, baseFontSize: number, baseColor: string): RunStyle {
  let bold = false
  let italic = false
  let underline = false
  let highlight = false
  let color = baseColor
  let fontSize = baseFontSize
  let family = NODE_FONT_STACK
  if (tok.kind === "bold") bold = true
  else if (tok.kind === "italic") italic = true
  else if (tok.kind === "underline") underline = true
  else if (tok.kind === "highlight") highlight = true
  else if (tok.kind === "styled") {
    bold = !!tok.bold
    italic = !!tok.italic
    underline = !!tok.underline
    highlight = !!tok.highlight
    if (tok.color) color = tok.color
    if (tok.size === "lg") fontSize = baseFontSize * 1.2
    if (tok.font && STYLE_FONT_STACKS[tok.font]) family = STYLE_FONT_STACKS[tok.font]
  }
  // Chữ trong thẻ vốn đã đậm sẵn ở mức 600 (xem lời gọi ctx.font gốc trước đây) — "Đậm" chỉ có nghĩa
  // khi rõ ràng đậm HƠN mức nền đó, không phải chỉ bật/tắt so với 400 như văn bản thường.
  const weight = bold ? 800 : 600
  return { font: `${italic ? "italic " : ""}${weight} ${fontSize}px ${family}`, color, underline, highlight }
}

type Word = { text: string; style: RunStyle; width: number }
// Một dòng đã ngắt xong: danh sách từ theo đúng thứ tự, cộng bề rộng KHOẢNG TRẮNG dùng để nối chúng
// (đo bằng font của thẻ, không đo riêng theo từng từ — khác biệt không đáng để phức tạp hoá).
type Line = { words: Word[]; width: number }

// Ngắt dòng giống cách trình duyệt ngắt trong thẻ ghi chú: tôn trọng dấu xuống dòng người dùng gõ,
// còn lại ngắt theo từ khi vượt quá bề rộng phần chữ — nay còn phải theo dõi ĐÚNG font/màu của từng
// từ khi đo, vì một từ in nghiêng đo bằng font đứng sẽ ra bề rộng sai.
function wrapStyledText(ctx: CanvasRenderingContext2D, tokens: InlineToken[], baseFontSize: number, baseColor: string, maxWidth: number): Line[] {
  ctx.font = `600 ${baseFontSize}px ${NODE_FONT_STACK}`
  const spaceWidth = ctx.measureText(" ").width

  const lines: Line[] = []
  let cur: Word[] = []
  let curWidth = 0

  function pushLine() {
    lines.push({ words: cur, width: curWidth })
    cur = []
    curWidth = 0
  }

  tokens.forEach((tok) => {
    const style = styleFor(tok, baseFontSize, baseColor)
    const paragraphs = tok.text.split("\n")
    paragraphs.forEach((para, pi) => {
      if (pi > 0) pushLine()
      const words = para.split(/\s+/).filter(Boolean)
      words.forEach((w) => {
        ctx.font = style.font
        const width = ctx.measureText(w).width
        const addWidth = (cur.length > 0 ? spaceWidth : 0) + width
        if (cur.length > 0 && curWidth + addWidth > maxWidth) pushLine()
        cur.push({ text: w, style, width })
        curWidth += cur.length === 1 ? width : addWidth
      })
    })
  })
  // Dòng cuối (hoặc bảng trống toàn chuỗi rỗng) — luôn đẩy nốt, kể cả khi rỗng, để một node chỉ
  // toàn dấu xuống dòng vẫn cho đúng số dòng trống như trên bảng thật.
  pushLine()
  return lines
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

  const tokens = parseInline(node.text)
  const lines = wrapStyledText(ctx, tokens, m.fontSize, paint.color, box.w - m.padX * 2)
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

  // Căn GIỮA, khớp với textAlign của thẻ trên bảng (xem RichNodeText trong MindmapBoard.tsx). Mỗi
  // dòng nay có thể gồm nhiều TỪ khác font/màu nhau — không còn một lệnh fillText() cho cả dòng
  // được nữa, phải tính TỔNG bề rộng dòng rồi tự bước qua từng từ, giữ đúng cảm giác "canh giữa".
  ctx.textBaseline = "middle"
  ctx.textAlign = "left"
  const cx = box.x + box.w / 2
  const spaceWidth = (() => {
    ctx.font = `600 ${m.fontSize}px ${NODE_FONT_STACK}`
    return ctx.measureText(" ").width
  })()
  let ty = box.y + h / 2 - (lines.length * m.lineHeight) / 2 + m.lineHeight / 2
  lines.forEach((line) => {
    let x = cx - line.width / 2
    line.words.forEach((word) => {
      ctx.font = word.style.font
      if (word.style.highlight) {
        // Không tô vàng cố định — cùng lý do đã ghi ở RichNodeText (HTML): thẻ có thể mang bất kỳ
        // nền màu nào trong 10 sắc, tô đen mờ luôn "đậm hơn nền chính nó" trên mọi màu.
        ctx.fillStyle = "rgba(0,0,0,.16)"
        ctx.fillRect(x - 1, ty - m.lineHeight / 2 + 2, word.width + 2, m.lineHeight - 4)
      }
      ctx.fillStyle = word.style.color
      ctx.fillText(word.text, x, ty)
      if (word.style.underline) {
        ctx.strokeStyle = word.style.color
        ctx.lineWidth = Math.max(1, m.fontSize * 0.06)
        ctx.beginPath()
        const uy = ty + m.fontSize * 0.38
        ctx.moveTo(x, uy)
        ctx.lineTo(x + word.width, uy)
        ctx.stroke()
      }
      x += word.width + spaceWidth
    })
    ty += m.lineHeight
  })
}

// Nạp trước các font ĐỊNH DẠNG thật sự được dùng trong dữ liệu bảng này (không phải cả bốn font một
// lượt) — không có bước này, canvas ÂM THẦM vẽ bằng font hệ thống thay cho font đã chọn (không báo
// lỗi gì cả, chỉ ảnh xuất ra sai font), vì `fillText` không tự đợi font tải xong như CSS/HTML vẫn
// làm. Tải vài mức đậm/nghiêng đại diện cho mỗi font — đủ cho phần lớn tổ hợp thật gặp phải, không
// cần dò khớp chính xác từng cân nặng.
async function ensureFontsLoaded(data: MindmapData): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return
  const used = new Set<string>()
  data.nodes.forEach((n) => {
    parseInline(n.text).forEach((tok) => {
      if (tok.kind === "styled" && tok.font) used.add(tok.font)
    })
  })
  if (used.size === 0) return
  const specs: string[] = []
  used.forEach((f) => {
    const family = STYLE_FONT_STACKS[f]
    if (!family) return
    specs.push(`600 16px ${family}`, `800 16px ${family}`, `italic 600 16px ${family}`)
  })
  try {
    await Promise.all(specs.map((spec) => document.fonts.load(spec, "Aa")))
    await document.fonts.ready
  } catch {
    // Tải lỗi (mạng, CSP chặn font ngoài) thì vẽ tiếp bằng font hệ thống — vẫn ra được ảnh, chỉ sai
    // font, còn hơn là chặn luôn cả việc xuất ảnh vì một font phụ không tải được.
  }
}

// Vẽ cả bảng ra một canvas. Tách riêng khỏi phần đóng gói file để PNG và PDF dùng CHUNG đúng một
// đường vẽ — hai đường vẽ riêng là hai thứ sẽ lệch nhau dần, và người dùng sẽ thấy file PDF khác
// file PNG của cùng một bảng.
async function renderMindmapCanvas(data: MindmapData, sizes: Sizes, paper: PaperKind): Promise<HTMLCanvasElement | null> {
  const bounds = contentBounds(data, sizes)
  if (!bounds) return null

  await ensureFontsLoaded(data)

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

// ─── Xuất văn bản có cấu trúc ──────────────────────────────────────────────────
//
// Ảnh/PDF chỉ để XEM — không dán được vào ghi chú bệnh án, email, hay bất kỳ ô nhập chữ nào. Hàm
// này dựng lại cây thẻ (cha/con theo đường nối) thành một dàn ý thụt lề bằng dấu gạch đầu dòng
// thường, không ký tự đặc biệt nào — dán vào đâu cũng đọc được.

// Dựng cây từ `edges`: thẻ không có cạnh nào TRỎ TỚI nó là gốc của một nhánh. Bảng là đồ thị chung
// (một thẻ có thể có nhiều "cha" nếu người dùng nối chéo), không phải cây thuần, nên một thẻ có thể
// gặp lại lần hai — lần đầu in đầy đủ, các lần sau chỉ in tên kèm "(xem ở trên)" để không lặp vô hạn
// và không làm dàn ý phình to gấp nhiều lần nội dung thật.
export function buildOutlineText(data: MindmapData): string {
  const nodeById = new Map(data.nodes.map((n) => [n.id, n]))
  const childrenOf = new Map<string, { to: string; label?: string }[]>()
  const hasIncoming = new Set<string>()
  const touched = new Set<string>()
  data.edges.forEach((e) => {
    if (!nodeById.has(e.from) || !nodeById.has(e.to)) return
    const list = childrenOf.get(e.from) ?? []
    list.push({ to: e.to, label: e.label })
    childrenOf.set(e.from, list)
    hasIncoming.add(e.to)
    touched.add(e.from)
    touched.add(e.to)
  })

  const lines: string[] = []
  const printed = new Set<string>()

  function printNode(id: string, depth: number, label?: string) {
    const node = nodeById.get(id)
    if (!node) return
    const indent = "  ".repeat(depth)
    const text = stripInlineMarkers(node.text).trim() || "(trống)"
    const prefix = label ? `[${label}] ` : ""
    if (printed.has(id)) {
      lines.push(`${indent}- ${prefix}${text} (xem ở trên)`)
      return
    }
    printed.add(id)
    lines.push(`${indent}- ${prefix}${text}`)
    ;(childrenOf.get(id) ?? []).forEach((k) => printNode(k.to, depth + 1, k.label))
  }

  data.nodes.filter((n) => touched.has(n.id) && !hasIncoming.has(n.id)).forEach((r) => printNode(r.id, 0))
  // Cụm có cạnh nhưng không có gốc nào (toàn bộ nằm trong một vòng lặp khép kín) — vẫn phải in ra,
  // không được lặng lẽ bỏ qua chỉ vì không thẻ nào "không có cha".
  data.nodes.forEach((n) => {
    if (touched.has(n.id) && !printed.has(n.id)) printNode(n.id, 0)
  })

  const isolated = data.nodes.filter((n) => !touched.has(n.id))
  if (isolated.length > 0) {
    if (lines.length > 0) lines.push("")
    lines.push("Ghi chú rời:")
    isolated.forEach((n) => lines.push(`- ${stripInlineMarkers(n.text).trim() || "(trống)"}`))
  }

  return lines.join("\n")
}

// Sao chép thẳng vào clipboard — đúng thứ người dùng cần để dán vào bệnh án/email, không phải tải
// một file rồi tự mở lên copy lại. Trả `false` khi Clipboard API không dùng được (quyền bị chặn,
// trình duyệt cũ) để màn hình tự chuyển sang tải file .txt thay thế.
export async function copyOutlineText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Phương án dự phòng khi không sao chép được — cùng kiểu tải file bằng thẻ <a> đã dùng ở
// deliverPng() phía trên.
export function downloadOutlineText(text: string, fileName: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Tên file ─────────────────────────────────────────────────────────────────
//
// Bỏ dấu tiếng Việt và mọi ký tự lạ. Tên có dấu trông thân thiện trên máy tính nhưng gây lỗi thật
// khi gửi đi: một số máy chủ và ứng dụng nhận file cắt luôn phần tên không phải ASCII, có nơi file
// về tới đầu bên kia thành tên rỗng và không mở được.
export function safeFileName(raw: string, fallback = "so-do-tu-duy"): string {
  const noAccent = raw
    .normalize("NFD")
    // Bỏ các dấu thanh/dấu mũ đã tách ra sau khi chuẩn hoá NFD.
    .replace(/[̀-ͯ]/g, "")
    // Chữ đ/Đ không phải là "d + dấu" nên NFD không tách được, phải thay tay.
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
  const slug = noAccent
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  // Tên quá dài bị một số hệ thống tệp cắt cụt giữa chừng, mất luôn phần đuôi mở rộng.
  return (slug || fallback).slice(0, 60)
}
