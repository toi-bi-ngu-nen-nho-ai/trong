// Chưa có bài học ECG dựng sẵn — màn "ECG" (truy cập từ Trang chủ) chỉ hiển thị các bài người
// dùng tự nhập, kèm ảnh nếu có. Dữ liệu tự nhập được lưu trong IndexedDB của trình duyệt
// (xem src/lib/ecgStorage.ts), không phải trong file này, vì ảnh có thể khá nặng.
import type { EcgLesson } from "./types"

export const ECG_LESSONS: EcgLesson[] = []
