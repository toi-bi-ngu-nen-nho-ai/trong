// Điểm import duy nhất cho toàn bộ dữ liệu tĩnh của app — App.tsx và các màn hình chỉ cần
// `import { ... } from "./data"` (hoặc "../data") thay vì khai báo data ngay trong component.
// Toàn bộ file trong thư mục này là dữ liệu tĩnh, build kèm trong app — không gọi mạng, 100% offline.

export * from "./types"
export * from "./specialties"
export * from "./flashcards"
export * from "./antibiotics"
export * from "./diseases"
export * from "./inotropes"
export * from "./vasoactives"
export * from "./vasodilators"
export * from "./antiarrhythmics"
export * from "./electrolytes"
export * from "./others"
export * from "./antidotes"
export * from "./categories"
export * from "./ecg"
