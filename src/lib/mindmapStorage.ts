import type { MindmapData, MindNode, MindEdge, MindImage, MindStroke } from "../data/types"
import { IDB_STORES, idbDelete, idbGetAll, idbPut } from "./idb"
import { removeCollection } from "./storage"

// Lưu dữ liệu THẬT (node, cạnh, nét vẽ, ảnh) của từng bảng Sơ đồ tư duy vào IndexedDB — một bản ghi
// cho MỖI bảng, id bản ghi trùng với MindBoard.id (xem lib/boards.ts quản lý danh sách bảng). Trước
// khi có nhiều bảng, cả app chỉ dùng đúng một bản ghi cố định "main" — id đó vẫn được giữ nguyên cho
// bảng đầu tiên khi di trú máy cũ, để không có ai mất dữ liệu chỉ vì app lên đời.
//
// Vì sao IndexedDB chứ không phải localStorage như trước: từ khi bảng có nét vẽ tay, một buổi vẽ có
// thể sinh ra hàng nghìn điểm toạ độ — vượt xa hạn mức ~5MB mà localStorage chia sẻ cho cả origin,
// và tràn localStorage sẽ làm hỏng cả các mục tự nhập khác. IndexedDB không có giới hạn chật như vậy.

// Khoá localStorage của bản cũ nhất (chỉ có node + cạnh nối, một bảng duy nhất) — đọc một lần để di
// trú rồi xoá. Bản cũ hơn nữa (trước khi có nhiều bảng nhưng đã ở IndexedDB) dùng id bản ghi "main".
const LEGACY_KEY = "mindmap"
const LEGACY_BOARD_ID = "main"

interface MindmapRecord extends MindmapData {
  id: string
}

export const DEFAULT_MINDMAP: MindmapData = {
  nodes: [{ id: "n1", x: 150, y: 170, text: "Chủ đề trung tâm", color: "var(--c-primary)", style: "solid", size: "lg" }],
  edges: [],
  strokes: [],
  images: [],
}

// ─── Lọc dữ liệu hỏng ─────────────────────────────────────────────────────────
// Bảng vẽ đọc thẳng vào các trường này lúc dựng hình (vd. `s.points.length`, `n.x`) mà KHÔNG kiểm
// tra gì thêm — cả app không có màn hình "đã có lỗi" nào bắt lại được nếu một bản ghi thiếu trường
// hay sai kiểu lọt vào tới đó, nên một bản ghi hỏng (đĩa bị lỗi, hoặc — đường đi thật hơn — một file
// sao lưu bị sửa tay/hỏng giữa chừng rồi NHẬP vào) làm sập thẳng cả cây React, trắng xoá toàn app.
// Lọc ở NGAY CỬA VÀO của dữ liệu (đọc từ IndexedDB ở đây, và lúc nhập file ở App.tsx) — phần tử nào
// sai kiểu bị bỏ âm thầm, còn lại vẫn hiện đủ, hơn hẳn mất trắng cả bảng vì đúng MỘT nét vẽ hỏng.
function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v)
}

function sanitizeNode(raw: unknown): MindNode | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== "string" || !o.id) return null
  if (!isFiniteNum(o.x) || !isFiniteNum(o.y)) return null
  if (typeof o.text !== "string" || typeof o.color !== "string") return null
  const node: MindNode = { id: o.id, x: o.x, y: o.y, text: o.text, color: o.color }
  if (o.style === "solid" || o.style === "soft" || o.style === "outline" || o.style === "plain") node.style = o.style
  if (o.size === "sm" || o.size === "md" || o.size === "lg") node.size = o.size
  if (typeof o.link === "string") node.link = o.link
  if (typeof o.collapsed === "boolean") node.collapsed = o.collapsed
  return node
}

function sanitizeEdge(raw: unknown, nodeIds: Set<string>): MindEdge | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  // Cạnh trỏ tới một thẻ không tồn tại (thẻ đó bị lọc ở bước trên, hoặc file nhập thiếu thẻ) vẽ ra
  // một đường nối lửng — bỏ luôn, không cố vẽ nửa chừng.
  if (typeof o.from !== "string" || typeof o.to !== "string" || !nodeIds.has(o.from) || !nodeIds.has(o.to)) return null
  const edge: MindEdge = { from: o.from, to: o.to }
  if (typeof o.label === "string") edge.label = o.label
  if (o.kind === "relationship" || o.kind === "algorithm") edge.kind = o.kind
  return edge
}

function sanitizeStroke(raw: unknown): MindStroke | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== "string" || !o.id) return null
  // Lẻ hoặc rỗng: strokePath()/strokeOutline() đọc theo cặp (x, y) — số lẻ nghĩa là điểm cuối thiếu
  // một toạ độ, sẽ đọc tràn sang điểm của nét kế tiếp trong một mảng phẳng.
  if (!Array.isArray(o.points) || o.points.length < 4 || o.points.length % 2 !== 0) return null
  if (!o.points.every(isFiniteNum)) return null
  if (typeof o.color !== "string" || !isFiniteNum(o.width)) return null
  if (o.tool !== "pen" && o.tool !== "pencil" && o.tool !== "highlighter" && o.tool !== "tape") return null
  const stroke: MindStroke = { id: o.id, points: o.points as number[], color: o.color, width: o.width, tool: o.tool }
  if (typeof o.straight === "boolean") stroke.straight = o.straight
  if (Array.isArray(o.widths) && o.widths.every(isFiniteNum)) stroke.widths = o.widths as number[]
  if (o.dash === "dash" || o.dash === "dot") stroke.dash = o.dash
  return stroke
}

function sanitizeImage(raw: unknown): MindImage | null {
  if (!raw || typeof raw !== "object") return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== "string" || !o.id) return null
  if (!isFiniteNum(o.x) || !isFiniteNum(o.y) || !isFiniteNum(o.w) || !isFiniteNum(o.h)) return null
  if (typeof o.dataUrl !== "string") return null
  return { id: o.id, x: o.x, y: o.y, w: o.w, h: o.h, dataUrl: o.dataUrl }
}

// Lọc TOÀN BỘ một bảng: dùng ở cả đường đọc từ IndexedDB (normalize(), bên dưới) lẫn đường nhập file
// sao lưu (App.tsx) — cùng một nguồn có thể hỏng theo cùng một cách, phải cùng một bộ lọc.
export function sanitizeMindmapData(data: { nodes: unknown[]; edges: unknown[]; strokes?: unknown[]; images?: unknown[] }): MindmapData {
  const nodes = data.nodes.map(sanitizeNode).filter((n): n is MindNode => n !== null)
  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges = data.edges.map((e) => sanitizeEdge(e, nodeIds)).filter((e): e is MindEdge => e !== null)
  const strokes = Array.isArray(data.strokes) ? data.strokes.map(sanitizeStroke).filter((s): s is MindStroke => s !== null) : []
  const images = Array.isArray(data.images) ? data.images.map(sanitizeImage).filter((im): im is MindImage => im !== null) : []
  return { nodes, edges, strokes, images }
}

function normalize(data: Partial<MindmapData> | null | undefined): MindmapData {
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) return DEFAULT_MINDMAP
  return sanitizeMindmapData(data as { nodes: unknown[]; edges: unknown[]; strokes?: unknown[]; images?: unknown[] })
}

function readLegacyLocalStorage(): MindmapData | null {
  try {
    const raw = localStorage.getItem(`drtrong:${LEGACY_KEY}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges) ? (parsed as MindmapData) : null
  } catch {
    return null
  }
}

// Máy này có từng dùng Sơ đồ tư duy TRƯỚC KHI app hỗ trợ nhiều bảng hay không (bản ghi "main" trong
// IndexedDB, hoặc dữ liệu rất cũ còn sót ở localStorage). Dùng để lib/boards.ts quyết định lúc tạo
// danh sách bảng lần đầu: di trú thành bảng "Bảng của tôi" thay vì tạo một bảng trống.
export async function hasLegacyMindmap(): Promise<boolean> {
  const rows = await idbGetAll<MindmapRecord>(IDB_STORES.mindmap)
  if (rows.some((r) => r.id === LEGACY_BOARD_ID)) return true
  return readLegacyLocalStorage() !== null
}

// Đọc dữ liệu đã lưu của một bảng. Lần chạy đầu sau khi cập nhật app lên bản có nhiều bảng, dữ liệu
// cũ trong localStorage (nếu còn) được chuyển sang IndexedDB rồi mới xoá khoá cũ — chỉ áp dụng cho
// đúng bảng "main" (bảng duy nhất tồn tại trước đây); các bảng tạo mới sau này không có gì ở đây.
export async function loadMindmap(boardId: string): Promise<MindmapData> {
  const rows = await idbGetAll<MindmapRecord>(IDB_STORES.mindmap)
  const found = rows.find((r) => r.id === boardId)
  if (found) return normalize(found)

  if (boardId === LEGACY_BOARD_ID) {
    const legacy = readLegacyLocalStorage()
    if (legacy) {
      const data = normalize(legacy)
      if (await saveMindmap(boardId, data)) removeCollection(LEGACY_KEY)
      return data
    }
  }
  return DEFAULT_MINDMAP
}

export async function saveMindmap(boardId: string, data: MindmapData): Promise<boolean> {
  return idbPut<MindmapRecord>(IDB_STORES.mindmap, { id: boardId, ...data })
}

// Node của TOÀN BỘ các bảng, gộp một lượt — dùng cho ô tìm ở màn danh sách (App.tsx), nơi người
// dùng không nhớ ghi chú họ cần nằm ở bảng nào. `idbGetAll` không lọc theo id nên đây vốn đã là MỘT
// lần đọc IndexedDB duy nhất, dù có bao nhiêu bảng — không cần mở/tải từng bảng như loadMindmap().
export interface BoardNode {
  boardId: string
  node: MindmapData["nodes"][number]
}

export async function loadAllMindmapNodes(): Promise<BoardNode[]> {
  const rows = await idbGetAll<MindmapRecord>(IDB_STORES.mindmap)
  const out: BoardNode[] = []
  rows.forEach((r) => {
    ;(Array.isArray(r.nodes) ? r.nodes : []).forEach((node) => out.push({ boardId: r.id, node }))
  })
  return out
}

// Xoá hẳn dữ liệu của một bảng — gọi khi người dùng xoá bảng đó (xem lib/boards.ts).
export async function deleteMindmap(boardId: string): Promise<boolean> {
  return idbDelete(IDB_STORES.mindmap, boardId)
}

// Gộp bảng nhập từ file (Đồng bộ dữ liệu) với bảng hiện có trên máy — theo đúng nguyên tắc
// "merge theo id, không xoá mất dữ liệu hiện có" dùng chung cho mọi mục tự nhập trong app:
// - Node, nét vẽ và ảnh cùng id ở file nhập sẽ đè lên bản hiện có; id mới được thêm vào.
// - Cạnh nối gộp và loại trùng theo cặp (from, to) không phân biệt chiều, giống cách bảng tự loại
//   trùng khi người dùng nối 2 node đã có cạnh.
export function mergeMindmaps(current: MindmapData, incoming: MindmapData): MindmapData {
  const nodesById = new Map(current.nodes.map((n) => [n.id, n]))
  incoming.nodes.forEach((n) => nodesById.set(n.id, n))

  const edgeKey = (e: MindEdge) => [e.from, e.to].sort().join("::")
  const edgesByKey = new Map(current.edges.map((e) => [edgeKey(e), e]))
  incoming.edges.forEach((e) => edgesByKey.set(edgeKey(e), e))

  const strokesById = new Map<string, MindStroke>((current.strokes ?? []).map((s) => [s.id, s]))
  ;(incoming.strokes ?? []).forEach((s) => strokesById.set(s.id, s))

  const imagesById = new Map<string, MindImage>((current.images ?? []).map((im) => [im.id, im]))
  ;(incoming.images ?? []).forEach((im) => imagesById.set(im.id, im))

  return {
    nodes: Array.from(nodesById.values()),
    edges: Array.from(edgesByKey.values()),
    strokes: Array.from(strokesById.values()),
    images: Array.from(imagesById.values()),
  }
}
