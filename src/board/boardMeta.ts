// Kiểu dữ liệu + tiện ích RIÊNG của subsystem bảng vẽ cho object store "boards" của
// src/lib/idb.ts. KHÔNG viết CRUD danh sách ở đây — DanhSachBang.tsx dùng thẳng
// useIdbCollection<BangMeta>(IDB_STORES.boards) (src/lib/useIdbCollection.ts, đã có sẵn, cùng mẫu
// ECG lessons/bài viết đang dùng). Hàm dưới đây tồn tại vì nó được gọi từ NGOÀI cây component của
// DanhSachBang (EdgelessBoard.tsx lúc unmount, xem Task 3) — không có instance hook nào để gọi.
import { SPECIALTIES } from '../data'
import { IDB_STORES, idbGetAll, idbPut } from '../lib/idb'
import { normalizeSearch } from '../lib/ui'

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
      // Chuỗi RỖNG = "bảng không có gì để chụp, đừng đụng vào ảnh cũ" (xem EdgelessBoard.tsx). Cần
      // một quy ước như vậy vì lượt gọi này KHÔNG được phép bỏ qua khi bảng trống: nó còn gánh việc
      // bump capNhatLuc và backfill chuyenKhoa/tags/noiDungTimKiem cho bản ghi cũ.
      // Vì sao KHÔNG ghi đè: bảng trống chụp ra một ô MÀU PHẲNG (canvas trong suốt, xuất JPEG thành
      // một mảng đặc màu nền) — ghi đè là thay icon chuyên khoa đang hiện đẹp bằng một ô đặc vô
      // nghĩa, và hỏng vĩnh viễn vì lần sau mở lại vẫn trống nên vẫn ghi đè tiếp (lỗi thật
      // 2026-08-26: thẻ bảng mới hoá ô xanh đen trên máy người dùng, đo được ảnh 480×360 chỉ có
      // ĐÚNG MỘT màu rgb(20,22,43) = --c-surface bản tối).
      // Giữ ảnh CŨ chứ không xoá: một lượt mở-rồi-thoát-ngay có thể bắt được canvas chưa kịp vẽ,
      // xoá thì mất trắng ảnh đúng của bảng có nội dung — giữ ảnh hơi cũ ít hại hơn nhiều.
      anhXemTruoc: anhXemTruoc || hienCo.anhXemTruoc,
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

// Cấu trúc TỐI THIỂU cần để duyệt cây khối tìm chữ — KHÔNG import type thật từ BlockSuite
// (BlockModel) để giữ file này ngoài ranh giới nạp chậm D13 (xem Global Constraints của plan).
// Bất kỳ object nào có hình dạng này (kể cả `store.root` thật của BlockSuite) đều dùng được.
type KhoiCoTheCoChu = {
  props?: Record<string, unknown>
  children?: KhoiCoTheCoChu[]
}

function layChu(vanBan: unknown): string {
  if (vanBan && typeof (vanBan as { toString: () => string }).toString === 'function') {
    return String(vanBan).trim()
  }
  return ''
}

// Duyệt đệ quy `store.root` (note/paragraph/list...) gom mọi `props.text` thành một chuỗi — dùng
// để tìm kiếm, KHÔNG dùng để hiển thị (không giữ định dạng/thứ tự chính xác). Giới hạn độ sâu
// (mặc định 12) để tránh vòng lặp vô hạn nếu dữ liệu hỏng có cây tự tham chiếu.
export function trichVanBanTuKhoi(goc: KhoiCoTheCoChu, doSauToiDa = 12): string {
  const doanVan: string[] = []
  const duyet = (khoi: KhoiCoTheCoChu, doSau: number) => {
    if (doSau > doSauToiDa) return
    const chu = layChu(khoi.props?.text)
    if (chu) doanVan.push(chu)
    khoi.children?.forEach((con) => duyet(con, doSau + 1))
  }
  duyet(goc, 0)
  return doanVan.join(' ')
}

// Phần tử canvas (surface.elementModels — shape/connector/text/mindmap node) mang chữ trực tiếp
// trên field `.text` (Y.Text), KHÔNG lồng trong `.props` như khối — đã xác nhận qua
// element-model/{text,shape,connector}.ts của cây vendored, cả ba đều `text?: Y.Text`.
export function trichVanBanTuCanvas(danhSachPhanTu: Array<{ text?: unknown }>): string {
  return danhSachPhanTu
    .map((el) => layChu(el.text))
    .filter(Boolean)
    .join(' ')
}

const DO_DAI_TOI_DA_NOI_DUNG_TIM_KIEM = 5000

// Cắt bớt để tránh BangMeta phình quá to với bảng nhiều chữ — 5000 ký tự đủ cho tìm kiếm con
// chuỗi, không cần giữ nguyên vẹn toàn bộ nội dung (đó là việc của chính bảng, không phải snapshot
// tìm kiếm này).
export function ghepNoiDungTimKiem(vanBanKhoi: string, vanBanCanvas: string): string {
  return `${vanBanKhoi} ${vanBanCanvas}`.trim().slice(0, DO_DAI_TOI_DA_NOI_DUNG_TIM_KIEM)
}

// So khớp một bảng với một truy vấn tìm kiếm tự do — không phân biệt dấu/hoa-thường (qua
// normalizeSearch, src/lib/ui.ts). Gộp CẢ BỐN trường (tên, chuyên khoa, tags, nội dung trích từ
// khối/canvas) thành một chuỗi rồi tìm truy vấn như chuỗi con — đủ dùng cho ô tìm kiếm một dòng ở
// Task 8, không cần xếp hạng độ liên quan. Truy vấn rỗng/toàn khoảng trắng → luôn khớp (trạng thái
// "chưa lọc").
// Chuyên khoa được đưa vào chuỗi so khớp bằng TÊN HIỂN THỊ ("Tim mạch"), không phải id nội bộ
// ('cardiology'): chip lọc ở DanhSachBang.tsx hiện `kh.name`, nên đó mới là chữ bác sĩ gõ vào ô tìm
// kiếm. Id vẫn giữ lại trong chuỗi cho ai gõ đúng khoá kỹ thuật — vô hại.
// `bang.chuyenKhoa` PHẢI có giá trị dự phòng: bảng cũ thiếu hẳn trường này ở runtime (xem chú thích
// ba trường mới ở đầu file) và normalizeSearch(undefined) sẽ ném lỗi, làm sập cả lượt lọc danh sách.
export function bangKhopTimKiem(bang: BangMeta, truyVan: string): boolean {
  const q = normalizeSearch(truyVan)
  if (!q) return true
  const idChuyenKhoa = bang.chuyenKhoa ?? SPECIALTIES[0].id
  const tenChuyenKhoa = SPECIALTIES.find((kh) => kh.id === idChuyenKhoa)?.name ?? ''
  const doanKhop = [
    bang.ten,
    idChuyenKhoa,
    tenChuyenKhoa,
    ...(bang.tags ?? []),
    bang.noiDungTimKiem ?? '',
  ]
    .map(normalizeSearch)
    .join(' ')
  return doanKhop.includes(q)
}
