// Hàm hỗ trợ cho nội dung dạng block (xem ContentBlock trong src/data/types.ts) — tạo block mới,
// dọn block rỗng trước khi lưu, và ĐỌC NGƯỢC dữ liệu đời cũ (bài học ECG có `content` + mảng
// `images` riêng) thành danh sách block để mọi màn hình chỉ cần xử lý một cấu trúc duy nhất.
import type { ContentBlock, EcgLesson } from "../data/types"
import { stripInlineMarkers } from "./richText"

export function newBlockId(): string {
  return `blk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function emptyTextBlock(): ContentBlock {
  return { id: newBlockId(), type: "text", text: "" }
}

// Block chữ rỗng (người dùng gõ Enter tạo dòng mới rồi bỏ trống) và block ảnh hỏng bị loại trước
// khi lưu, để nội dung hiển thị không có khoảng trắng thừa.
export function cleanBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.filter((b) => (b.type === "image" ? Boolean(b.dataUrl) : (b.text ?? "").trim().length > 0))
}

// Văn bản thuần của toàn bộ nội dung — dùng để tạo tóm tắt tự động và ước lượng thời gian đọc.
// Bỏ luôn các dấu định dạng nội dòng (**đậm**, ==tô sáng==, [[liên kết]]…) để tóm tắt đọc xuôi.
export function blocksToPlainText(blocks: ContentBlock[]): string {
  return blocks
    .map((b) => stripInlineMarkers(b.type === "image" ? (b.caption ?? "") : (b.text ?? "")))
    .filter((t) => t.trim().length > 0)
    .join("\n")
}

// Mục lục của bài: mỗi dòng kiểu "heading" là một mục.
export function blocksToToc(blocks: ContentBlock[]): { id: string; label: string }[] {
  return blocks
    .filter((b) => b.type === "heading" && (b.text ?? "").trim().length > 0)
    .map((b) => ({ id: b.id, label: stripInlineMarkers(b.text ?? "").trim() }))
}

export function firstImageUrl(blocks: ContentBlock[]): string | undefined {
  return blocks.find((b) => b.type === "image" && b.dataUrl)?.dataUrl
}

export function countImages(blocks: ContentBlock[]): number {
  return blocks.filter((b) => b.type === "image" && b.dataUrl).length
}

// Nội dung bài học ECG dưới dạng block. Bài cũ: ảnh nằm gọn một cụm rồi tới phần chữ — giữ đúng
// thứ tự hiển thị mà bản cũ đang dùng để bài đã lưu trông không đổi.
export function ecgBlocks(lesson: EcgLesson): ContentBlock[] {
  if (lesson.blocks?.length) return lesson.blocks
  const out: ContentBlock[] = []
  lesson.images?.forEach((img) => {
    out.push({ id: img.id, type: "image", dataUrl: img.dataUrl, caption: img.caption })
  })
  const content = lesson.content?.trim()
  if (content) out.push({ id: `${lesson.id}-content`, type: "text", text: content })
  return out
}

// Danh sách block dùng để MỞ trình soạn thảo: luôn có ít nhất một dòng trống để gõ ngay.
export function blocksForEditing(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.length > 0 ? blocks : [emptyTextBlock()]
}
