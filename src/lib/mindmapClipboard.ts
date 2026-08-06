import type { MindNode, MindEdge, MindStroke, MindImage } from "../data/types"

// "Bảng nhớ tạm" cho việc sao chép một nhánh (hoặc một nhóm đang khoanh) từ bảng Sơ đồ tư duy này
// sang bảng KHÁC — nhân bản tại chỗ (duplicateNode) không giúp được gì khi đích là một bảng khác hẳn.
//
// Dùng sessionStorage (không phải IndexedDB): nội dung sao chép chỉ có ý nghĩa trong ĐÚNG một phiên
// dùng app (sao chép rồi dán ngay sau đó), không cần sống sót qua việc đóng hẳn app — và ghi/đọc
// đồng bộ ngay lập tức, không phải chờ một promise chỉ để bật/tắt nút "Dán".
const KEY = "drtrong:mindmap-clipboard"

export interface MindmapClip {
  nodes: MindNode[]
  edges: MindEdge[]
  strokes: MindStroke[]
  images: MindImage[]
}

export function writeMindmapClip(clip: MindmapClip): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(clip))
  } catch {
    // Hết chỗ lưu tạm (rất hiếm với vài chục thẻ) thì bỏ qua — chỉ mất khả năng dán, không ảnh
    // hưởng gì tới bảng đang xem.
  }
}

export function readMindmapClip(): MindmapClip | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<MindmapClip> | null
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null
    return {
      nodes: parsed.nodes,
      edges: parsed.edges,
      strokes: Array.isArray(parsed.strokes) ? parsed.strokes : [],
      images: Array.isArray(parsed.images) ? parsed.images : [],
    }
  } catch {
    return null
  }
}

// Có gì để dán không — dùng để chỉ hiện nút "Dán nhánh" khi thật sự có nội dung, đọc lại MỖI LẦN
// hỏi (không cache) vì việc sao chép có thể vừa xảy ra ở một bảng khác trong cùng phiên.
export function hasMindmapClip(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== null
  } catch {
    return false
  }
}
