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
// Đọc-sửa-ghi trực tiếp qua idb.ts (không qua hook, vì gọi từ ngoài React) — DanhSachBang.tsx đọc
// lại giá trị mới nhất mỗi lần MOUNT (useIdbCollection tự fetch khi mount), và nó luôn mount lại
// mỗi khi người dùng quay về danh sách (xem BoardGallery.tsx, Task 6), nên không cần cơ chế báo
// cho instance hook đang sống cập nhật theo thời gian thực.
export async function capNhatAnhXemTruoc(id: string, anhXemTruoc: string): Promise<void> {
  const ds = await idbGetAll<BangMeta>(IDB_STORES.boards)
  const hienCo = ds.find((b) => b.id === id)
  if (!hienCo) return
  await idbPut(IDB_STORES.boards, { ...hienCo, anhXemTruoc, capNhatLuc: Date.now() })
}
