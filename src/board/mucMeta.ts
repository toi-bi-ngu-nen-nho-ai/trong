// Kiểu dữ liệu + tiện ích RIÊNG của subsystem mục (bài viết + sơ đồ) cho object store "boards" của
// src/lib/idb.ts. KHÔNG viết CRUD danh sách ở đây — LuoiMuc.tsx dùng thẳng
// useIdbCollection<MucMeta>(IDB_STORES.boards) (src/lib/useIdbCollection.ts, đã có sẵn, cùng mẫu
// ECG lessons/bài viết đang dùng). Hàm dưới đây tồn tại vì nó được gọi từ NGOÀI cây component của
// LuoiMuc (EdgelessBoard.tsx lúc unmount, xem Task 3) — không có instance hook nào để gọi.
import { SPECIALTIES } from '../data'
import { IDB_STORES, idbGetAll, idbPut } from '../lib/idb'
import { normalizeSearch } from '../lib/ui'

export type MucMeta = {
  id: string
  ten: string
  taoLuc: number
  capNhatLuc: number
  // Xoá MỀM — mốc thời gian đánh dấu "đã xoá", KHÔNG xoá bản ghi khỏi IndexedDB. LuoiMuc.tsx
  // lọc bỏ mọi bang có trường này khỏi lưới hiển thị; "Hoàn tác" chỉ cần xoá lại trường này (set
  // undefined) để bang tái xuất hiện, không cần dựng lại object từ đầu. Không có cơ chế dọn vĩnh
  // viễn tự động — bang xoá mềm ở lại trong IndexedDB, đợi một màn "thùng rác" sau này.
  daXoaLuc?: number
  // Ba trường MỚI — bắt buộc cho bảng tạo từ nay trở đi (taoBangMoi(), LuoiMuc.tsx). Bảng cũ
  // tạo TRƯỚC lượt này thiếu cả ba ở runtime dù kiểu khai bắt buộc — capNhatSauKhiRoiMuc() bên dưới
  // tự backfill giá trị mặc định vào lần bảng đó được MỞ RỒI RỜI kế tiếp (không cần script di trú
  // riêng: đây vốn là hook DUY NHẤT đã chạy ở mọi lượt rời bảng, xem EdgelessBoard.tsx). Mọi nơi
  // ĐỌC ba trường này trước khi bảng đó từng được mở lại (chip lọc, tìm kiếm) phải tự
  // `?? SPECIALTIES[0].id`/`?? []`/`?? ''` — xem Task 2/3/7.
  chuyenKhoa: string
  tags: string[]
  noiDungTimKiem: string
  // Hue (độ, [260,330)) cho badge/chấm màu khi bảng CHƯA gắn chuyên khoa — gán MỘT LẦN lúc tạo
  // (taoBangMoi, LuoiMuc.tsx) bằng thuật toán chọn xa nhất các bảng đang có (mauHueChongTrung),
  // KHÔNG phải hash thuần theo id: hai bảng tạo liên tiếp từng đo được hue cách nhau chỉ 6° — gần
  // như cùng màu (critique 2026-09-02 lượt 3, P2). Lưu cố định vào bản ghi để màu KHÔNG đổi sau đó
  // dù bảng khác được thêm/xoá (đúng triết lý "tờ giấy nằm yên trên bàn" — mauOnDinh(id) đã dùng cho
  // mục đích khác, chỉ còn là fallback tại đây). Optional, KHÔNG backfill: bảng cũ tạo trước lượt
  // này thiếu trường, mọi nơi đọc phải tự `?? mauOnDinh(id)` — không đổi màu bảng cũ người dùng đã
  // quen mắt.
  mauHue?: number
}

export function taoIdMuc(): string {
  // Tiền tố `bang-` GIỮ NGUYÊN dù hàm đã đổi tên: đổi nó là đổi id của mọi mục tạo từ nay, trong
  // khi id cũ trong IndexedDB vẫn mang tiền tố cũ — hai họ id trong cùng một store, không được gì.
  return `bang-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// Lượt ghi metadata đang chờ — tên biến giữ nguyên chữ "ghi" chung chung vì nó canh CUỘC ĐUA,
// không canh nội dung được ghi (xem doiGhiAnhXongNeuCo bên dưới).
let ghiAnhDangCho: Promise<void> | null = null

/**
 * Gọi lúc RỜI một bảng (xem EdgelessBoard.tsx). Cập nhật metadata của bảng vừa đóng:
 * `capNhatLuc` (CHỈ khi có sửa nội dung thật), `noiDungTimKiem`, và backfill chuyenKhoa/tags cho
 * bản ghi cũ.
 *
 * `capNhatLuc` chỉ bump khi `coThayDoiNoiDung` — trước đây (tới mục 30 của HANDOFF.md) hai việc
 * này gộp làm một vì "chặng đó chưa dựng cơ chế phát hiện thay đổi thật", hệ quả là MỞ bảng ra xem
 * rồi quay lại (không sửa gì) vẫn khiến nhãn "cập nhật lần cuối" nhảy thành "Vừa xong". Mục 31 vá
 * phần sâu: EdgelessBoard.tsx theo dõi `store.slots.blockUpdated` /
 * `surface.element{Added,Updated,Removed}` (chỉ đếm sự kiện `isLocal`/`local` — bỏ qua đồng bộ/
 * hydrate) suốt phiên mở bảng rồi truyền kết quả vào đây lúc unmount.
 *
 * Đọc-sửa-ghi thẳng qua idb.ts (không qua hook, vì gọi từ NGOÀI cây React) — fire-and-forget, lúc
 * unmount không còn instance hook nào sống để báo lại. LuoiMuc.tsx đọc lại khi MOUNT, nhưng
 * lượt đọc đó có thể chạy TRƯỚC khi lượt ghi này xong (đua giữa "rời bảng" và "mount lại danh
 * sách"); `doiGhiAnhXongNeuCo()` ngay dưới tồn tại vì cuộc đua đó.
 *
 * ĐỔI TÊN 2026-08-30 (trước là `capNhatAnhXemTruoc`, có thêm tham số `anhXemTruoc: string`): hàm
 * này không còn ghi ảnh nào. Ảnh xem trước từng là một ảnh chụp CANVAS KHUNG NHÌN 480×360 JPEG
 * q=0.6 làm thumbnail thẻ kiêm nguồn cho "Xuất PNG" — cả hai vai trò đó đã đi (thẻ luôn dùng huy
 * hiệu chuyên khoa, xuất PNG dựng lại từ tài liệu qua ./xuatAnhBang.ts), nên giữ tên cũ chỉ là một
 * lời nói dối về việc hàm này làm gì.
 */
export function capNhatSauKhiRoiMuc(
  id: string,
  coThayDoiNoiDung: boolean,
  noiDungTimKiemMoi?: string,
): Promise<void> {
  const p = (async () => {
    const ds = await idbGetAll<MucMeta>(IDB_STORES.boards)
    const hienCo = ds.find((b) => b.id === id)
    if (!hienCo) return
    // Bóc `anhXemTruoc` RA KHỎI bản ghi trước khi ghi lại. Không có bước này thì spread `...hienCo`
    // chép nguyên data URL JPEG cũ (hàng trăm kB mỗi bảng) sang bản ghi mới và giữ nó trong
    // IndexedDB vĩnh viễn dù không còn ai đọc — người dùng đang hỏi thẳng "lưu trữ sơ đồ đã đạt
    // chất lượng chưa", nên để lại rác của cơ chế vừa gỡ là câu trả lời sai. Mỗi bảng tự dọn ở lần
    // đóng kế tiếp, không cần script di trú riêng: đây vốn là hook DUY NHẤT chạy ở mọi lượt rời
    // bảng. Kiểu `MucMeta` không còn khai trường này, nên phải đọc qua một kiểu nới rộng.
    const { anhXemTruoc: _anhCu, ...conLai } = hienCo as MucMeta & { anhXemTruoc?: string }
    void _anhCu
    await idbPut(IDB_STORES.boards, {
      ...conLai,
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

// Cắt bớt để tránh MucMeta phình quá to với bảng nhiều chữ — 5000 ký tự đủ cho tìm kiếm con
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
// ('cardiology'): chip lọc ở LuoiMuc.tsx hiện `kh.name`, nên đó mới là chữ bác sĩ gõ vào ô tìm
// kiếm. Id vẫn giữ lại trong chuỗi cho ai gõ đúng khoá kỹ thuật — vô hại.
// `muc.chuyenKhoa` PHẢI có giá trị dự phòng: bảng cũ thiếu hẳn trường này ở runtime (xem chú thích
// ba trường mới ở đầu file) và normalizeSearch(undefined) sẽ ném lỗi, làm sập cả lượt lọc danh sách.
export function mucKhopTimKiem(muc: MucMeta, truyVan: string): boolean {
  const q = normalizeSearch(truyVan)
  if (!q) return true
  const idChuyenKhoa = muc.chuyenKhoa ?? SPECIALTIES[0].id
  const tenChuyenKhoa = SPECIALTIES.find((kh) => kh.id === idChuyenKhoa)?.name ?? ''
  const doanKhop = [
    muc.ten,
    idChuyenKhoa,
    tenChuyenKhoa,
    ...(muc.tags ?? []),
    muc.noiDungTimKiem ?? '',
  ]
    .map(normalizeSearch)
    .join(' ')
  return doanKhop.includes(q)
}
