import type { Article, FlashCard } from "../data/types"

// Đếm số bài viết THẬT thuộc một chuyên khoa — gồm cả bài dựng sẵn (builtIn) và bài người dùng tự
// thêm (custom). Thay thế cho field `count` cũ vốn là số cố định không khớp dữ liệu thật.
export function countArticlesFor(specialtyName: string, builtIn: Article[], custom: Article[]): number {
  return builtIn.filter((a) => a.specialty === specialtyName).length + custom.filter((a) => a.specialty === specialtyName).length
}

// Đếm số thẻ ghi nhớ THẬT thuộc một chuyên khoa, cùng nguyên tắc như trên — thay cho ước tính
// `count * 0.7` cũ (vừa ăn theo số liệu ảo, vừa không khớp vì FLASHCARDS trước đây dùng tên chuyên
// khoa tiếng Anh trong khi Specialty.name dùng tiếng Việt).
export function countFlashcardsFor(specialtyName: string, builtIn: FlashCard[], custom: FlashCard[]): number {
  return builtIn.filter((f) => f.specialty === specialtyName).length + custom.filter((f) => f.specialty === specialtyName).length
}
