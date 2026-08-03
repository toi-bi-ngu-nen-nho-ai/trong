import type { MindmapData, MindEdge, MindImage, MindStroke } from "../data/types"
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

function normalize(data: Partial<MindmapData> | null | undefined): MindmapData {
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) return DEFAULT_MINDMAP
  return {
    nodes: data.nodes,
    edges: data.edges,
    strokes: Array.isArray(data.strokes) ? data.strokes : [],
    images: Array.isArray(data.images) ? data.images : [],
  }
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
