// Kiểu dữ liệu + tiện ích RIÊNG của subsystem bảng vẽ cho object store "boards" của
// src/lib/idb.ts. KHÔNG viết CRUD danh sách ở đây — DanhSachBang.tsx dùng thẳng
// useIdbCollection<BangMeta>(IDB_STORES.boards) (src/lib/useIdbCollection.ts, đã có sẵn, cùng mẫu
// ECG lessons/bài viết đang dùng). Hàm dưới đây tồn tại vì nó được gọi từ NGOÀI cây component của
// DanhSachBang (EdgelessBoard.tsx lúc unmount, xem Task 3) — không có instance hook nào để gọi.
import { SPECIALTIES } from '../data'
import { IDB_STORES, idbGetAll, idbPut } from '../lib/idb'

export type BangMeta = {
  id: string
  ten: string
  taoLuc: number
  capNhatLuc: number
  anhXemTruoc?: string
  // Xoá MỀM — mốc thời gian đánh dấu "đã xoá", KHÔNG xoá bản ghi khỏi IndexedDB. DanhSachBang.tsx
  // lọc bỏ mọi bang có trường này khỏi lưới hiển thị; "Hoàn tác" chỉ cần xoá lại trường này (set
  // undefined) để bang tái xuất hiện, không cần dựng lại object từ đầu. Không có cơ chế dọn vĩnh
  // viễn tự động — bang xoá mềm ở lại trong IndexedDB, đợi một màn "thùng rác" sau này.
  daXoaLuc?: number
  // Ba trường MỚI — bắt buộc cho bảng tạo từ nay trở đi (taoBangMoi(), DanhSachBang.tsx). Bảng cũ
  // tạo TRƯỚC lượt này thiếu cả ba ở runtime dù kiểu khai bắt buộc — capNhatAnhXemTruoc() bên dưới
  // tự backfill giá trị mặc định vào lần bảng đó được MỞ RỒI RỜI kế tiếp (không cần script di trú
  // riêng: đây vốn là hook DUY NHẤT đã chạy ở mọi lượt rời bảng, xem EdgelessBoard.tsx). Mọi nơi
  // ĐỌC ba trường này trước khi bảng đó từng được mở lại (chip lọc, tìm kiếm) phải tự
  // `?? SPECIALTIES[0].id`/`?? []`/`?? ''` — xem Task 2/3/7.
  chuyenKhoa: string
  tags: string[]
  noiDungTimKiem: string
}

export function taoIdBang(): string {
  return `bang-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Gọi lúc rời một bảng (xem EdgelessBoard.tsx). Ảnh xem trước LUÔN được ghi lại (phản ánh đúng
// khung nhìn cuối cùng người dùng thấy, kể cả khi họ chỉ pan/zoom mà không sửa gì) — nhưng
// `capNhatLuc` CHỈ bump khi `coThayDoiNoiDung` true. Trước đây (tới mục 30 của HANDOFF.md) hai
// việc này gộp làm một vì "chặng đó chưa dựng cơ chế phát hiện thay đổi thật" — hệ quả là MỞ bảng
// ra xem rồi quay lại (không sửa gì) vẫn khiến nhãn "cập nhật lần cuối" nhảy thành "Vừa xong", ghi
// nợ ở mục 30 (P2). Mục 31 vá phần sâu: EdgelessBoard.tsx giờ theo dõi
// `store.slots.blockUpdated`/`surface.element{Added,Updated,Removed}` (chỉ đếm sự kiện có
// `isLocal`/`local` true — bỏ qua sự kiện đến từ đồng bộ/hydrate) trong suốt phiên mở bảng, rồi
// truyền kết quả vào đây lúc unmount.
// Đọc-sửa-ghi trực tiếp qua idb.ts (không qua hook, vì gọi từ ngoài React) — fire-and-forget, gọi
// lúc EdgelessBoard UNMOUNT nên không có instance hook nào đang sống để báo lại. DanhSachBang.tsx
// đọc lại giá trị mới nhất mỗi lần MOUNT (useIdbCollection tự fetch khi mount) — NHƯNG lượt đọc đó
// có thể chạy TRƯỚC KHI lượt ghi này kịp xong (đua giữa "rời bảng" và "mount lại danh sách" ngay
// sau đó, cùng lúc). Đó là lý do có `doiGhiAnhXongNeuCo()` ngay dưới đây: BoardGallery.tsx đợi nó
// trước khi cho DanhSachBang mount lại, thay vì tin lượt đọc-lúc-mount luôn thấy dữ liệu mới nhất.
let ghiAnhDangCho: Promise<void> | null = null

export function capNhatAnhXemTruoc(
  id: string,
  anhXemTruoc: string,
  coThayDoiNoiDung: boolean,
  noiDungTimKiemMoi?: string,
): Promise<void> {
  const p = (async () => {
    const ds = await idbGetAll<BangMeta>(IDB_STORES.boards)
    const hienCo = ds.find((b) => b.id === id)
    if (!hienCo) return
    await idbPut(IDB_STORES.boards, {
      ...hienCo,
      anhXemTruoc,
      capNhatLuc: coThayDoiNoiDung ? Date.now() : hienCo.capNhatLuc,
      chuyenKhoa: hienCo.chuyenKhoa ?? SPECIALTIES[0].id,
      tags: hienCo.tags ?? [],
      noiDungTimKiem: noiDungTimKiemMoi ?? hienCo.noiDungTimKiem ?? '',
    })
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
