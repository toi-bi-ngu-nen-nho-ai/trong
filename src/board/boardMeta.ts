// Kiểu dữ liệu + tiện ích RIÊNG của subsystem bảng vẽ cho object store "boards" của
// src/lib/idb.ts. KHÔNG viết CRUD danh sách ở đây — DanhSachBang.tsx dùng thẳng
// useIdbCollection<BangMeta>(IDB_STORES.boards) (src/lib/useIdbCollection.ts, đã có sẵn, cùng mẫu
// ECG lessons/bài viết đang dùng). Hàm dưới đây tồn tại vì nó được gọi từ NGOÀI cây component của
// DanhSachBang (EdgelessBoard.tsx lúc unmount, xem Task 3) — không có instance hook nào để gọi.
import { IDB_STORES, idbGetAll, idbPut } from '../lib/idb'

export type BangMeta = {
  id: string
  ten: string
  taoLuc: number
  capNhatLuc: number
  anhXemTruoc?: string
}

export function taoIdBang(): string {
  return `bang-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Gọi lúc rời một bảng (xem EdgelessBoard.tsx) — đồng thời đóng vai trò cập nhật "sửa lúc" vì
// chặng này chưa dựng cơ chế phát hiện thay đổi thật; thời điểm rời bảng là xấp xỉ hợp lý.
// Đọc-sửa-ghi trực tiếp qua idb.ts (không qua hook, vì gọi từ ngoài React) — fire-and-forget, gọi
// lúc EdgelessBoard UNMOUNT nên không có instance hook nào đang sống để báo lại. DanhSachBang.tsx
// đọc lại giá trị mới nhất mỗi lần MOUNT (useIdbCollection tự fetch khi mount) — NHƯNG lượt đọc đó
// có thể chạy TRƯỚC KHI lượt ghi này kịp xong (đua giữa "rời bảng" và "mount lại danh sách" ngay
// sau đó, cùng lúc). Đó là lý do có `doiGhiAnhXongNeuCo()` ngay dưới đây: BoardGallery.tsx đợi nó
// trước khi cho DanhSachBang mount lại, thay vì tin lượt đọc-lúc-mount luôn thấy dữ liệu mới nhất.
let ghiAnhDangCho: Promise<void> | null = null

export function capNhatAnhXemTruoc(id: string, anhXemTruoc: string): Promise<void> {
  const p = (async () => {
    const ds = await idbGetAll<BangMeta>(IDB_STORES.boards)
    const hienCo = ds.find((b) => b.id === id)
    if (!hienCo) return
    await idbPut(IDB_STORES.boards, { ...hienCo, anhXemTruoc, capNhatLuc: Date.now() })
  })()
  ghiAnhDangCho = p
  return p
}

// Cho BoardGallery đợi lượt ghi ảnh xem trước (nếu có) trước khi hiện lại danh sách — tránh đọc
// phải bản ghi cũ (đua với lượt ghi fire-and-forget lúc unmount, xem chú thích trên). Có hạn giờ vì
// đây KHÔNG được phép chặn thao tác quay lại của người dùng vô thời hạn nếu việc ghi có vấn đề.
export async function doiGhiAnhXongNeuCo(hanGioMs = 800): Promise<void> {
  if (!ghiAnhDangCho) return
  await Promise.race([ghiAnhDangCho, new Promise((r) => setTimeout(r, hanGioMs))])
}
