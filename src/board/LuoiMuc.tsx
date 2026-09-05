// Lưới thẻ danh sách bảng — tạo/đổi tên/xoá. Nay phục vụ CẢ bài viết lẫn sơ đồ (props lọc riêng
// theo loại mục sẽ tới ở Plan 2). KHÔNG phụ thuộc BlockSuite (không import ./index hay
// ./EdgelessBoard) — giữ file này nhẹ, tách hẳn khỏi ranh giới nạp chậm 994 kB. BoardGallery.tsx
// (bao ngoài) mới là nơi quyết định khi nào mount bảng vẽ thật.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { SPECIALTIES } from '../data'
import { ScreenHeader } from '../components/ScreenHeader'
import { iconBangSoDo } from '../components/SpecialtyIcons'
import { VeChuyenKhoaDangTai } from './VeChuyenKhoaDangTai'
import { ChonDanhMuc } from './ChonDanhMuc'
import { IDB_STORES } from '../lib/idb'
import { formatReadTime } from '../lib/recentReads'
import { useIdbCollection } from '../lib/useIdbCollection'
import { mucKhopTimKiem, type IdDanhMuc, type LoaiMuc, type MucMeta, taoIdMuc } from './mucMeta'
import { donRacBlobBang, xoaNoiDungBang } from './xoaNoiDungBang'
import { normalizeSearch } from '../lib/ui'

// Cùng giá trị CONFIRM_DELETE_RESET_MS của App.tsx (5000) — viết hằng số riêng thay vì import vì
// component gốc (ConfirmIconButton) là private, phụ thuộc `icons` cũng private của file 11.000+
// dòng đó. Xem Global Constraints của kế hoạch này.
const XAC_NHAN_XOA_MS = 5000

// Ngưỡng thời gian TỐI THIỂU giữa lần chạm "vào trạng thái xác nhận" và lần chạm "xác nhận thật" —
// không có ngưỡng này, "Xoá" → "Chắc chắn xoá?" → xoá thật chỉ là MỘT cử chỉ hai-chạm-liên-tiếp
// (double-tap ~100-300ms, phản xạ quen tay từ double-tap-to-zoom, tay run, bấm lại vì lo lắng) xuyên
// thủng hoàn toàn — đo được trực tiếp: 2 click cách nhau 50ms thực thi xoá ngay, y hệt không hề có
// bước xác nhận (critique 2026-09-02 lượt 3, P1). 450ms nằm trên ngưỡng double-tap của con người
// (thường <300ms) nhưng vẫn ngắn hơn hẳn cảm giác "phải đợi" của một lần chạm CHỦ Ý thứ hai.
const NGUONG_XAC_NHAN_MS = 450

// Ngưỡng coi một thẻ là "vừa tạo" (dùng .card-plop thay vì .card-settle êm) — xem §3.2/§3.3 spec.
const VUA_TAO_NGUONG_MS = 3000

// Tên gán cho bảng mới tạo. Trước đây chuỗi này viết cứng ở `taoBangMoi`, còn ô đổi tên thì so
// bằng mắt người đọc mã — hai chỗ phải khớp nhau mới đúng, và không gì bắt chúng khớp. Nay ô đổi
// tên dùng chính hằng số này để quyết định hiện RỖNG hay hiện tên thật (xem `TheBang`).
const TEN_MAC_DINH = 'Bảng chưa đặt tên'

// Chuyên khoa đang lọc — NGOẠI LỆ có chủ đích với quy ước "bộ lọc chỉ sống trong phiên" của phần
// còn lại của app (SearchScreen.activeFilter và các bộ lọc tạm thời khác): một board Mindmap là tài
// sản dài hạn (tháng/năm), không phải một lượt tra cứu nhất thời — bác sĩ luôn làm việc trong một
// chuyên khoa cố định phải "Thêm +N" rồi chọn lại chip đó mỗi lần mở tab là phí lặp lại thật cho
// đúng người dùng trung thành nhất (critique 2026-09-01, P2; xác nhận lại với chủ dự án trước khi
// làm — KHÔNG áp dụng ngoại lệ này cho `truyVan`/`moChonKhoa`, hai state đó vẫn đúng nghĩa tạm
// thời của một phiên xem lưới, giữ nguyên không lưu).
const CHUYEN_KHOA_LOC_KEY = 'drtrong:mindmap-chuyen-khoa-loc'

// Thời lượng .card-slide-out (src/index.css) — thẻ giữ mount đúng bằng ngần này trước khi đánh dấu
// xoá mềm (daXoaLuc) chạy, để animation kịp chạy hết trước khi thẻ biến mất khỏi lưới. PHẢI khớp
// đúng thời lượng animation CSS (0.4s, tăng từ 0.2s cũ — debug 2026-08-26, "xoá quá nhanh, có như
// không có") — lệch hai số này là jump-cut hoặc khoảng trắng chết, xem comment tại .card-slide-out.
const XOA_TRE_MS = 400

// Vị trí/góc nghiêng/ảnh xem trước của đúng thẻ vừa bấm, chụp lại NGAY LÚC BẤM (getBoundingClientRect
// thật, không phải suy ra từ index lưới) — BoardGallery.tsx dùng để chạy chuyển cảnh FLIP thật từ
// thẻ sang canvas thay vì một cú phóng chung chung không neo vào đâu (hiến chương Mindmap, mục
// "Continuity of the visual anchor... mandatory" — critique 2026-08-26 P1).
export type BoardOpenOrigin = {
  top: number
  left: number
  width: number
  height: number
  tilt: number
  // Chuyên khoa của bảng — undefined khi mở KHÔNG qua một thẻ trong lưới (vd kết quả tìm kiếm toàn
  // app). Từ 2026-08-30 đây là NGUỒN DUY NHẤT cho hình ảnh của lớp phủ chuyển cảnh: trường
  // `anhXemTruoc` (ảnh chụp khung nhìn) đã bị gỡ khỏi đây cùng lượt gỡ nó khỏi thẻ, nên lớp phủ
  // FLIP morph đúng thứ người dùng vừa bấm — icon chuyên khoa — thay vì một ảnh chụp mà thẻ không
  // còn hiện nữa (xem BoardGallery.tsx).
  chuyenKhoa?: string
  // id của bảng — cùng lý do có mặt với chuyenKhoa ở trên: TheTrong dùng nó để tô màu trung tính ổn
  // định cho badge CHƯA gắn chuyên khoa (xem mauTrungTinhTheoBang), giữ lớp phủ FLIP khớp đúng màu
  // với thẻ gốc thay vì rơi về một xám trung tính chung cho mọi bảng chưa gắn khoa (critique
  // 2026-09-02 lượt 2, P2). undefined cùng điều kiện với chuyenKhoa ở trên.
  id?: string
  // Hue cố định đã gán lúc tạo bảng (MucMeta.mauHue) — cùng lý do id ở trên, ưu tiên hơn hash
  // mauOnDinh(id) khi có (critique 2026-09-02 lượt 3, P2).
  mauHue?: number
}

// Cửa sổ "Hoàn tác" sau khi xoá mềm một bảng — cùng độ dài với XAC_NHAN_XOA_MS (quy ước sẵn có của
// đúng màn này cho "khoảng ân hạn"), đủ lâu để đọc tên bảng vừa xoá và quyết định, không quá lâu
// tới mức dải xác nhận cảm giác bị kẹt trên màn hình.
const HOAN_TAC_XOA_MS = 5000

// Panel "Đã xoá gần đây" hiện tối đa ngần này dòng khi CHƯA bấm "Xem tất cả" — đủ để bắt lại một
// hai bảng vừa lỡ tay mà không đổ nguyên danh sách thùng rác ra giữa màn (phản hồi 2026-08-30).
const RUT_GON_DA_XOA = 4

// Nhấn-giữ trên thẻ TỪNG mở CÙNG menu mà nút "⋯" mở (thêm 2026-08-28, P2, làm lối vào THỨ HAI cho
// đúng menu đó) — GỠ 2026-09-02 (distill, critique P3): ba vòng critique độc lập sau đó đều thấy cử
// chỉ này vô hình, không ai tìm ra được nó, và mỗi lần đội chỉ "thêm lối vào song song" (nút "⋯" đã
// có sẵn từ trước, rồi "Chọn" cho xoá hàng loạt) thay vì sửa/bỏ chính cử chỉ ẩn. Vì nó chưa từng làm
// gì mà "⋯" không làm được — luôn là lối vào THỨ HAI tới CÙNG menu, không phải khả năng riêng — bỏ
// nó không mất chức năng thật nào, chỉ bỏ mã đếm giờ/đo trượt không ai chạm tới trong thực tế.

// Băm chuỗi id thành một góc nghiêng ỔN ĐỊNH trong khoảng [-3.0, 3.0] độ, bước 0.1 — KHÔNG dùng
// Math.random() vì góc phải giữ nguyên qua mọi lần re-render (đúng thẻ ảnh thật nằm yên trên bàn,
// không tự xoay mỗi khi có gì đó khiến component render lại).
export function nghiengOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 61) - 30) / 10
}

// Băm id thành một góc (độ hue) ỔN ĐỊNH trong khoảng [260, 330) — họ tím-hồng quanh --c-accent-2
// (~327°, xem src/index.css), CỐ TÌNH tránh xa đỏ/hổ phách/xanh lá (~0-50°, ~90-150°) vì ba màu đó
// dành riêng cho tín hiệu nguy hiểm/cảnh báo/thành công (Untouchable Signal Rule, DESIGN.md) — chấm
// phân biệt bảng không bao giờ được lẫn với tín hiệu an toàn — critique lượt 3 (2026-08-24): bảng
// mới tạo không phân biệt được trong lưới lẫn panel "Đã xoá gần đây" (11/15 bảng thật trên máy dev
// đọc y hệt "Bảng chưa đặt tên"). Từ 2026-09-02 lượt 3 chỉ còn FALLBACK cho bảng thiếu mauHue (xem
// mauHueChongTrung/mauTrungTinhTheoBang ngay dưới) — không còn dùng trực tiếp cho S/L nữa (đã bỏ
// --chip-s/--chip-l, xem chú thích tại mauTrungTinhTheoBang).
export function mauOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) | 0
  return 260 + (Math.abs(h) % 70)
}

// 3 mốc hue cách đều 30° trong [260,330) — "ứng viên" cho mauHueChongTrung() ngay dưới. TRƯỚC là 14
// mốc cách 5° (phủ gần hết 65° của dải): đo trực tiếp trên trình duyệt thật, farthest-point trên 14
// mốc mịn cho khoảng cách tối thiểu chỉ 14,4-15° ngay khi có 4 bảng chưa gắn khoa cùng sống — VI PHẠM
// claim "≥30°" của chính hàm này (critique 2026-09-03 lượt 4, P2), vì đây là giới hạn TOÁN HỌC
// (pigeonhole): rải N≥4 điểm trong 65° thì khoảng cách nhỏ nhất tốt nhất có thể đạt chỉ ~21,7°, không
// mốc mịn cỡ nào sửa được. 3 mốc cách ĐÚNG 30° thì lời hứa "≥30°" trở thành SỰ THẬT cho tối đa 3 bảng
// sống cùng lúc — ít hơn 14 nhưng không còn là lời hứa suông. Từ bảng thứ 4 trở đi, xem chú thích
// "khi bão hoà" tại mauHueChongTrung ngay dưới. KHÔNG mở rộng dải [260,330) để lấy thêm mốc: dải này
// cố tình áp sát nhưng chưa chạm đỏ/hổ phách (~0-50°, buffer 35° ở đầu 330) lẫn xanh lá (~90-150°,
// buffer 110° ở đầu 260) — nới rộng về phía nào cũng ăn bớt buffer an toàn đó (Untouchable Signal
// Rule, DESIGN.md) hoặc lấn sang hue của chính --c-primary (~232°), một quyết định thương hiệu vượt
// quá phạm vi một bản vá P2, cần chủ dự án xác nhận trước (xem câu hỏi cuối critique lượt 4).
const CAC_MOC_HUE: number[] = [260, 290, 320]

// Chọn MỘT hue trong CAC_MOC_HUE xa nhất (theo khoảng cách gần nhất) các hue ĐANG CÓ — greedy
// farthest-point, gọi MỘT LẦN lúc tạo bảng (taoBangMoi) rồi lưu cố định vào MucMeta.mauHue, KHÔNG
// gọi lại mỗi lần render. Vì sao không thể là hash thuần theo id: hai giá trị hash độc lập của hai id
// bất kỳ không có bảo đảm khoảng cách tối thiểu nào — đo được trực tiếp 2 bảng tạo liên tiếp ra hue
// cách nhau chỉ 6°, gần như cùng màu (critique 2026-09-02 lượt 3, P2). Thuật toán này thì có: nó NHÌN
// THẤY sibling hiện có trước khi gán, nên luôn chọn được mốc tách biệt nhất còn lại. Mảng rỗng (bảng
// đầu tiên) → mốc đầu tiên, không có gì để tránh.
//
// KHI BÃO HOÀ (bảng chưa-gắn-khoa thứ 4 trở đi, sống cùng lúc): cả 3 mốc đã dùng hết, mọi ứng viên
// còn lại đều có khoảng-cách-gần-nhất bằng 0 (trùng một mốc đã có) — vòng lặp dùng `>` (không phải
// `>=`) nên giữ nguyên `tot` ở giá trị KHỞI TẠO (CAC_MOC_HUE[0] = 260) thay vì đổi lung tung theo thứ
// tự duyệt mảng, tức bảng thứ 4 LUÔN lặp lại đúng màu bảng ĐẦU TIÊN — một sự trùng lặp NHẤT QUÁN, dễ
// đoán, còn hơn một sự trùng lặp ngẫu nhiên tuỳ thời điểm gọi. Đây là suy giảm CÓ CHỦ Ý, không phải
// lỗi: 3 bảng đầu vẫn tách biệt thật (đo được ≥30°); bảng thứ 4+ dựa vào tên riêng + số thứ tự trong
// aria-label (xem chỗ dùng formatReadTime ở TheBang) để phân biệt, không còn dựa vào màu.
export function mauHueChongTrung(hueHienCo: number[]): number {
  if (hueHienCo.length === 0) return CAC_MOC_HUE[0]
  let tot = CAC_MOC_HUE[0]
  let xaNhat = -1
  for (const moc of CAC_MOC_HUE) {
    const ganNhat = Math.min(...hueHienCo.map((h) => Math.abs(h - moc)))
    if (ganNhat > xaNhat) {
      xaNhat = ganNhat
      tot = moc
    }
  }
  return tot
}

// Màu badge cho bảng CHƯA gắn chuyên khoa — tô theo hue (mauHue nếu bảng đã có, tức tạo từ
// 2026-09-02 lượt 3 trở đi qua mauHueChongTrung; mauOnDinh(id) làm fallback cho bảng CŨ hơn, tạo
// trước khi trường này tồn tại — không đổi màu bảng cũ người dùng đã quen mắt) thay vì một xám trung
// tính DÙNG CHUNG cho mọi bảng chưa gắn khoa. Trước 2026-09-02 mọi bảng như vậy (nay là mặc định của
// bảng mới, xem taoBangMoi) đều đọc y hệt nhau trong lưới — cùng lớp lỗi "11/15 bảng đọc y hệt nhau"
// mà chính mauOnDinh() ở trên từng vá cho panel "Đã xoá gần đây" (critique 2026-09-02 lượt 2, P2).
// S/L CỐ ĐỊNH (không dùng --chip-s/--chip-l — hai token đó tự đổi theo theme cho nền --c-page/
// --c-surface, còn badge này luôn nằm TRÊN GIẤY (.mind-note-card), vốn KHÔNG theme-swap — trộn nhầm
// token theo-theme vào nền không theo-theme là đúng lớp bug 2,69:1 mà --c-on-note-muted bên dưới
// từng vá, xem chú thích P0 tại chỗ dùng). 50%/36% đo được ≥5,3:1 trên cả hai tông giấy (#fbfaf7
// sáng / #efece3 tối) xuyên suốt toàn bộ dải hue [260,330) — kiểm bằng script, không đoán. Panel "Đã
// xoá gần đây" dùng CHÍNH công thức này (không còn --chip-s/--chip-l riêng) để chấm màu ở đó và badge
// ở lưới chính luôn là MỘT màu cho cùng một bảng (critique 2026-09-02 lượt 3, P3).
export function mauTrungTinhTheoBang(id: string | undefined, mauHue?: number): string {
  if (!id) return 'var(--c-on-note-muted, #5c5f7a)'
  return `hsl(${mauHue ?? mauOnDinh(id)} 50% 36%)`
}

// Độ sáng tương đối (WCAG relative luminance, 0-1) của một màu hex "#rrggbb".
function doSangTuongDoi(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const tuyenTinh = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * tuyenTinh(r) + 0.7152 * tuyenTinh(g) + 0.0722 * tuyenTinh(b)
}

// Xấp xỉ độ sáng của --c-on-bright ở dark mode (#0b0c1c) — dùng làm ứng viên "chữ gần đen" thay vì
// đen tuyệt đối, để khớp đúng giá trị token thật app đang dùng ở mọi nơi khác.
const DO_SANG_GAN_DEN = doSangTuongDoi('#0b0c1c')

function tiLeTuongPhan(l1: number, l2: number): number {
  const [sang, toi] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (sang + 0.05) / (toi + 0.05)
}

// Chọn chữ trắng hoặc gần-đen tuỳ theo màu NỀN CỤ THỂ (kh.color) — KHÔNG dùng var(--c-on-bright)
// cứng cho nền này: token đó chỉ được hiệu chỉnh cho --c-primary (đổi độ sáng theo theme), còn
// kh.color là hằng số CỐ ĐỊNH qua cả hai theme (xem comment đầu specialties.ts: "chưa đổi theo chủ
// đề"). Ghép nhầm --c-on-bright vào nền này khiến cả 11/11 màu chuyên khoa xuống dưới AA ở dark mode
// (đo được 3.00-3.97:1, critique 2026-08-26 P1) — bài học từ chính lượt vá contrast trước, áp đúng
// công thức cho MỘT điểm chạm (chip "Tất cả", nền --c-primary) rồi lan sang điểm chạm khác có màu
// nền hoàn toàn khác bản chất. Hàm này tính tương phản thật với CẢ HAI ứng viên rồi chọn bên thắng —
// đúng cho bất kỳ giá trị hex nào, kể cả nếu sau này thêm chuyên khoa với màu sáng hơn hẳn 11 màu
// hiện tại (nơi trắng sẽ không còn thắng nữa).
function chuTrenNen(hexNen: string): string {
  const lNen = doSangTuongDoi(hexNen)
  const dungTrang = tiLeTuongPhan(1, lNen)
  const dungGanDen = tiLeTuongPhan(DO_SANG_GAN_DEN, lNen)
  return dungTrang >= dungGanDen ? '#ffffff' : '#0b0c1c'
}

// khoa: id chuyên khoa để tô màu + chọn icon cho huy hiệu — undefined khi không có ngữ cảnh chuyên
// khoa nào (lưới rỗng toàn bộ, chưa lọc gì). iconBangSoDo() đã tự xử lý id lạ/undefined bằng icon
// "bóng đèn + bút chì + bánh răng" (xem SpecialtyIcons.tsx — KHÔNG phải tờ giấy của specialtyIcon(),
// tờ giấy là icon của một BÀI VIẾT chuyên khoa lạ), nên TheTrong không cần thêm nhánh dự phòng cho
// icon — chỉ cần tự lo phần MÀU (spec undefined thì không có spec.color để đọc).
// id: id CỦA BẢNG (không phải chuyên khoa) — chỉ dùng khi spec undefined, để tô màu trung tính ổn
// định theo từng bảng thay vì một xám dùng chung cho mọi bảng chưa gắn khoa (mauTrungTinhTheoBang).
// mauHue: hue CỐ ĐỊNH đã gán lúc tạo bảng (MucMeta.mauHue, xem mauHueChongTrung) — ưu tiên hơn hash
// mauOnDinh(id) khi có, vì bảo đảm tách biệt khỏi sibling lúc tạo mà hash thuần không có.
// Export vì BoardGallery.tsx dùng CHÍNH component này cho lớp phủ chuyển cảnh FLIP: lớp phủ phải
// là đúng thứ người dùng vừa bấm, và từ 2026-08-30 thứ đó luôn là huy hiệu chuyên khoa. Dựng lại
// một bản sao ở đó là mở đường cho hai hình khác nhau trôi dạt khỏi nhau — đúng lúc chúng phải
// khớp từng pixel thì chuyển cảnh mới liền mạch (cùng lý do id/mauHue phải đi kèm chuyenKhoa trong
// BoardOpenOrigin, xem type đó).
export function TheTrong({
  khoa,
  id,
  mauHue,
  dangVe = false,
}: {
  khoa?: string
  id?: string
  mauHue?: number
  dangVe?: boolean
}) {
  const spec = SPECIALTIES.find((s) => s.id === khoa)
  return (
    <div className="relative w-full h-full" aria-hidden="true">
      {/* Không còn nền doodle vẽ tay — phản hồi thật (2026-08-26, test tay): "xóa ảnh background
          nét line đi". Huy hiệu chuyên khoa CHÍNH GIỮA khung 4:3 (50%,50%), không nền/viền tròn. */}
      <div
        aria-hidden="true"
        data-testid="huy-hieu-chuyen-khoa"
        data-khoa={khoa ?? ''}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '34%',
          aspectRatio: '1 / 1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Nhánh "chưa gắn chuyên khoa": tô theo mauTrungTinhTheoBang(id) — KHÔNG phải
          // --c-text-muted: huy hiệu này nằm TRÊN tờ giấy (.mind-note-card) vốn không đổi theo
          // theme, còn --c-text-muted thì lật sáng ở bản tối — cặp đó đo được 2,69:1 trên giấy bản
          // tối, dưới ngưỡng 3:1 của WCAG 1.4.11 cho đồ hoạ mang nghĩa (critique 2026-08-28, P0).
          // mauTrungTinhTheoBang giữ ≥5,3:1 ở cả hai bản (kiểm cho toàn dải hue, xem chú thích tại
          // đó) VÀ phân biệt được từng bảng bằng mắt — --c-on-note-muted (đồng nhất) chỉ còn là
          // fallback khi không có id. Nhánh spec.color không đổi: màu chuyên khoa đều đậm, thấp
          // nhất đo được 5,04:1 trên giấy nên vốn đã an toàn ở cả hai bản.
          color: spec ? spec.color : mauTrungTinhTheoBang(id, mauHue),
        }}
      >
        {/* `dangVe`: lớp phủ FLIP lúc MỞ bảng dùng nhánh này. Lớp phủ đó CHÍNH LÀ màn chờ ở đường
            mở-qua-thẻ — đo trên trình duyệt thật 2026-08-30: nó đứng opacity 1 suốt 2,5s rồi mới mở
            ra đúng lúc màn chờ bên dưới bị gỡ, nên mọi hoạt ảnh đặt DƯỚI nó không bao giờ thấy
            được (phản hồi thật: "tôi ấn mở thì bị che bởi một màn hình"). Huy hiệu tự vẽ ngay tại
            đây thì chỉ còn MỘT màn, và nó hạ cánh đúng chỗ cú FLIP phóng tới.
            Hai nhánh vẽ CÙNG một icon, cùng ô 34%, cùng màu — chỉ khác tĩnh/động. Mặc định (lưới,
            lớp phủ "gập lại" lúc đóng) vẫn tĩnh: cú gập chỉ dài 260ms, không đủ để vẽ gì. */}
        {dangVe ? <VeChuyenKhoaDangTai khoa={khoa} id={id} mauHue={mauHue} /> : iconBangSoDo(khoa, 'w-full h-full')}
      </div>
    </div>
  )
}

// Lời mời ở trạng thái lưới rỗng. ` ` là DẤU CÁCH KHÔNG NGẮT (non-breaking space) chèn vào
// giữa các âm tiết của cùng MỘT từ ghép — trình duyệt được phép xuống dòng ở bất kỳ dấu cách nào,
// mà tiếng Việt viết rời từng âm tiết nên "bức tranh" bị cắt thành "bức" cuối dòng trên / "tranh"
// đầu dòng dưới (phản hồi chủ dự án 2026-08-28, mục 2: 'chữ "bức tranh" phải sát nhau'). Khoá cứng
// bốn từ ghép mang nghĩa — "kiến thức", "bức tranh", "trực quan", "hình dung" — vẫn chừa đủ chỗ
// ngắt hợp lệ (sau "Biến", "thành", dấu phẩy, "dễ") để text-wrap:balance chia hai dòng cho đều.
// Dùng escape ` ` chứ KHÔNG dán ký tự thật vào chuỗi: ký tự thật nhìn y hệt dấu cách thường
// trong mã nguồn, người sửa sau sẽ vô tình gõ đè thành dấu cách thường mà không ai thấy.
const LOI_MOI_TRONG = 'Biến kiến thức thành bức tranh trực quan, dễ hình dung'

// Biểu tượng "Sơ đồ tư duy" cho trạng thái lưới rỗng — CÙNG icon với tab Mindmap ở thanh nav dưới
// (App.tsx: icons.mindmap, viewBox 0 0 608 608, tô currentColor). Hai <path> chép nguyên xi vào
// đây thay vì import: `icons` là object PRIVATE trong App.tsx (12.000+ dòng, không export) — cùng
// path nghĩa là cùng hình, không phải một icon mới. Thay cho hình tự vẽ trước đây (phản hồi chủ dự
// án 2026-08-29: "xoá hình bạn vẽ, thay bằng hình icon mindmap"). currentColor tự ăn theo màu div
// cha (--c-text-muted) nên hợp cả bản sáng lẫn tối.
function BieuTuongMindmap() {
  return (
    <svg
      viewBox="0 0 608 608"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      data-testid="bieu-tuong-mindmap"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <path d="M118.906410,117.928040 C133.539993,93.791702 152.227600,73.907448 174.708923,57.503590 C200.352142,38.792599 228.852142,26.546539 259.626648,19.118103 C284.605316,13.088681 310.035553,10.891353 335.406097,13.052048 C390.167786,17.715855 440.343872,35.114105 482.760406,71.374138 C513.184021,97.381973 533.056519,129.907104 542.523560,168.882431 C547.748108,190.391571 549.950562,212.173187 549.084106,234.197601 C548.410828,251.311401 545.916077,268.256165 542.856873,285.146790 C539.976929,301.047852 536.352783,316.690094 531.575073,332.125305 C526.484558,348.570923 519.520630,364.165344 511.599152,379.386566 C503.141602,395.637848 494.668274,411.887268 491.931366,430.348907 C491.761169,431.496979 491.421631,432.633301 491.373047,433.784058 C490.549103,453.301483 491.635590,472.695770 494.969452,491.965607 C498.648407,513.230286 502.889008,534.370544 508.256805,555.280212 C515.833496,584.794495 491.929840,601.507507 472.126221,601.426208 C388.142365,601.081543 304.154724,601.022156 220.172134,601.501404 C201.947968,601.605408 185.421768,588.026184 183.257233,568.591553 C182.531525,562.075745 184.842758,555.712952 186.290771,549.482422 C189.260284,536.705322 190.410797,523.900818 189.827454,510.857666 C189.381409,500.884186 187.789658,499.264038 178.091125,499.270538 C166.759811,499.278137 155.427979,499.331970 144.097275,499.246307 C119.581573,499.061005 98.586548,483.006256 92.253807,459.285339 C89.691040,449.685822 90.868210,439.740479 90.737724,429.936493 C90.650040,423.348450 90.728981,423.356384 84.127533,423.316833 C75.175163,423.263184 66.335518,423.764069 57.685825,419.815979 C41.548100,412.450043 30.176935,393.495789 33.040939,376.327148 C34.358864,368.426697 38.213509,361.257111 41.389156,353.935699 C51.321606,331.036499 61.435879,308.214386 71.159393,285.226929 C79.658264,265.134705 83.507843,244.008759 84.996986,222.264771 C85.914673,208.864944 88.538200,195.587204 91.995163,182.569504 C98.004524,159.940369 106.763206,138.416901 118.906410,117.928040 M362.500000,576.818054 C399.663788,576.824402 436.827576,576.843201 473.991364,576.827209 C481.949432,576.823792 486.990204,570.663574 485.314758,562.940369 C484.329041,558.396729 482.973999,553.933960 481.954865,549.396667 C475.579315,521.013062 470.159698,492.506226 467.635345,463.438446 C465.194733,435.334991 469.154510,408.681549 482.350250,383.625488 C489.490662,370.067291 496.914490,356.622772 502.501099,342.346741 C514.327942,312.124329 520.929932,280.661804 523.885010,248.381653 C526.256653,222.474197 524.510925,196.948700 517.844421,171.734299 C510.804016,145.106003 497.980194,121.749222 479.156677,101.693825 C463.003845,84.483917 443.887207,71.437988 422.757599,61.004940 C394.897430,47.248596 365.330109,39.739254 334.603119,37.523029 C304.361420,35.341805 274.476440,38.258488 245.491776,48.231949 C218.036438,57.679184 193.257233,71.550133 171.797791,91.159599 C150.392044,110.720009 134.986465,134.406982 124.116447,161.165649 C116.371666,180.230911 111.721420,200.078354 109.249153,220.456436 C107.710548,233.138687 107.285324,245.919037 104.633240,258.511047 C99.889656,281.033356 90.447861,301.768402 81.324013,322.652100 C73.796677,339.881500 66.106705,357.040558 58.680969,374.313385 C53.891441,385.454132 59.927811,396.323029 71.892288,398.974335 C79.175301,400.588257 86.540611,400.057312 93.799400,399.682220 C106.701424,399.015564 115.628586,409.585938 115.198555,421.361603 C114.876442,430.181793 115.058090,439.025208 115.183365,447.855865 C115.394127,462.713135 127.443565,474.692932 142.313324,474.808868 C155.311554,474.910217 168.311172,474.820251 181.310043,474.860138 C185.658722,474.873505 189.917816,475.519653 193.988953,477.141724 C209.152649,483.183258 212.921783,496.321045 214.133316,510.568420 C215.544693,527.166382 212.349792,543.416443 208.605438,559.475647 C205.818466,571.428711 209.695129,576.827393 222.010376,576.828552 C268.506927,576.832947 315.003448,576.822144 362.500000,576.818054 z" />
      <path d="M465.892609,173.131989 C477.955750,187.286011 480.877411,202.762497 472.907623,219.312363 C464.914276,235.911194 450.662140,243.710114 432.640930,244.031754 C423.179169,244.200623 414.280060,240.909821 406.642029,235.074432 C404.236481,233.236603 402.323212,233.321381 399.870056,234.741913 C386.611206,242.419754 373.322845,250.047974 359.975555,257.570709 C357.573853,258.924347 356.537964,260.077759 357.819885,262.996826 C364.359955,277.888855 363.944763,292.809998 356.774536,307.309113 C354.532196,311.843353 354.828613,314.430664 358.873138,317.750824 C366.457336,323.976746 373.517731,330.854187 380.629150,337.635620 C383.242767,340.127991 385.503693,340.545624 388.999817,339.179352 C411.180115,330.511444 432.222565,337.601868 444.855957,357.697327 C454.578156,373.162079 450.940582,396.408203 436.871338,408.723175 C412.747772,429.838837 378.165680,422.120972 365.824799,392.586853 C361.701843,382.719879 362.221100,372.384979 366.130005,362.429779 C367.110016,359.933868 367.365356,358.401062 365.191162,356.410400 C356.591766,348.536896 348.140900,340.499542 339.717133,332.437073 C337.868500,330.667755 336.363678,330.446411 334.020599,331.712433 C315.823853,341.544464 297.271027,342.452576 278.511719,333.342712 C276.172791,332.206909 274.843964,332.905945 273.429962,334.678833 C262.629089,348.220978 251.815506,361.753174 240.943573,375.238159 C239.299011,377.277985 239.598755,378.917786 240.809601,381.085022 C250.020264,397.570679 248.898926,415.157227 237.927521,428.746765 C226.770462,442.566345 206.963776,449.227966 190.218063,443.788269 C172.412979,438.004456 159.316437,422.716278 159.583115,402.207184 C159.820572,383.945435 172.800735,367.185333 190.808136,362.167999 C199.191910,359.832031 207.577332,360.058319 215.886505,362.229462 C219.034286,363.051910 220.906097,362.027649 222.749268,359.721680 C233.669327,346.059570 244.631546,332.431000 255.639557,318.839691 C257.021790,317.133118 257.755585,315.851501 256.304047,313.620728 C247.473648,300.049805 245.433990,285.280579 249.117950,269.643646 C249.548843,267.814636 248.942215,266.860718 247.474457,265.985504 C239.893906,261.465332 232.308838,256.950684 224.802567,252.309219 C222.569458,250.928375 221.196808,251.990326 219.506454,253.265472 C198.818207,268.872284 169.387131,263.407440 155.868225,241.496597 C140.995728,217.391861 153.118912,186.935577 180.816910,178.819702 C204.713394,171.817719 229.380859,185.700729 235.646530,209.714355 C237.181717,215.598038 236.755936,221.589233 236.233994,227.545578 C236.017670,230.014130 236.774200,231.603729 238.952759,232.855423 C245.448944,236.587723 251.901306,240.401443 258.279144,244.332062 C260.819946,245.897949 262.687469,245.599457 264.932373,243.646164 C272.024445,237.475235 279.725983,232.334335 289.184387,230.402786 C291.820557,229.864410 292.879333,228.023178 292.875214,225.267502 C292.837311,199.938263 292.822083,174.608627 292.955078,149.279922 C292.974335,145.608521 290.804077,144.504776 288.062317,143.340942 C274.240112,137.473679 264.808350,127.332130 262.077209,112.593864 C256.852478,84.399071 277.869568,64.741364 299.074036,62.192936 C320.553589,59.611446 341.525970,73.925781 347.014954,92.960762 C352.755768,112.869034 342.001343,135.469803 322.617523,143.053665 C318.340759,144.726913 316.774506,146.878326 316.812744,151.439545 C317.012390,175.267624 317.009033,199.098801 316.844879,222.927307 C316.813110,227.543472 318.381744,229.794708 322.899750,231.058273 C328.146332,232.525589 333.328613,234.561142 337.698792,238.038330 C340.122711,239.966980 342.427368,239.941406 345.043945,238.426834 C359.309967,230.169189 373.606781,221.964661 387.912720,213.776276 C389.877350,212.651764 390.488678,211.407867 390.140503,208.935608 C386.901550,185.938980 400.411163,166.129669 422.770264,160.403946 C439.600342,156.094116 453.466248,161.449875 465.892609,173.131989 M289.602570,311.917358 C302.271973,317.095734 314.664093,317.081055 325.844299,308.550995 C334.182190,302.189453 339.397125,293.281708 338.359467,282.666992 C336.518036,263.829742 322.422058,252.143723 303.333252,252.320084 C289.499878,252.447891 275.755585,262.867920 272.469421,275.718933 C268.691711,290.492340 275.021393,304.339142 289.602570,311.917358 M287.101257,96.777718 C281.872620,108.473328 289.195740,120.694138 302.059418,122.670181 C313.939575,124.495132 326.520844,112.872147 324.217407,101.894653 C322.341461,92.954506 316.027008,86.981010 306.902893,85.515076 C300.150909,84.430260 291.592834,89.053734 287.101257,96.777718 M418.231934,213.232635 C422.852417,218.130066 428.449310,220.231949 435.227081,219.744232 C446.711090,218.917877 455.233643,208.144119 452.425018,197.559311 C450.407867,189.957397 445.366425,184.937057 437.771179,183.553040 C429.429382,182.032974 421.610016,183.933823 416.812469,191.679001 C412.486633,198.662598 412.841614,205.880707 418.231934,213.232635 M212.677292,222.004974 C213.047638,211.728622 208.598633,205.264038 198.913986,202.006332 C190.104355,199.042953 179.540695,203.632889 175.360443,212.240387 C171.467224,220.256897 174.645584,230.146896 182.762451,235.272842 C193.805878,242.247025 208.494797,236.078705 212.677292,222.004974 M422.435974,388.846069 C427.471649,381.145233 427.153168,372.131531 421.641022,366.349152 C415.912659,360.339935 405.752167,358.237610 398.093506,361.476898 C390.116638,364.850769 385.131439,374.589752 387.440063,382.289215 C391.946198,397.317749 409.954437,401.025848 422.435974,388.846069 M222.638062,405.885406 C223.057495,395.107025 219.030197,389.060425 209.290344,385.845123 C200.451050,382.927185 191.060837,386.182922 186.128296,393.875824 C182.402374,399.686859 183.398682,409.979431 188.483307,415.215302 C197.259109,424.252106 217.927414,423.970337 222.638062,405.885406 z" />
    </svg>
  )
}

function TheBang({
  bang,
  index,
  dangXoa,
  dangSuaTen,
  dangMoMenu,
  dangXacNhanXoa,
  dangSuaTag,
  chonNhieu = false,
  daChonNhieu = false,
  onChuyenChonNhieu,
  onMo,
  onBatMenu,
  onBatSuaTen,
  onLuuTen,
  onXoa,
  onBatSuaTag,
  onDoiChuyenKhoa,
  onThemTag,
  onXoaTag,
}: {
  bang: MucMeta
  index: number
  dangXoa: boolean
  dangSuaTen: boolean
  dangMoMenu: boolean
  dangXacNhanXoa: boolean
  dangSuaTag: boolean
  // Chế độ chọn-nhiều trên lưới sống (critique 2026-09-01, P2) — khi bật, checkbox thay hẳn nút
  // "⋯" ở góc thẻ (xem render bên dưới); cha truyền onBatMenu rỗng lúc chonNhieu=true nên không có
  // gì mở ra, và onMo cũng bị cha đổi thành chọn/bỏ chọn thay vì mở bảng — TheBang không tự biết
  // "đang ở chế độ chọn" theo nghĩa hành vi, chỉ theo nghĩa HIỂN THỊ (icon nào vẽ ở góc thẻ).
  chonNhieu?: boolean
  daChonNhieu?: boolean
  onChuyenChonNhieu?: () => void
  onMo: (origin?: BoardOpenOrigin) => void
  onBatMenu: () => void
  onBatSuaTen: () => void
  onLuuTen: (tenMoi: string) => void
  onXoa: () => void
  onBatSuaTag: () => void
  onDoiChuyenKhoa: (id: string) => void
  onThemTag: (tag: string) => void
  onXoaTag: (tag: string) => void
}) {
  // Bảng còn mang tên MẶC ĐỊNH thì ô nhập để rỗng (tên mặc định lùi về làm placeholder) — xem chú
  // thích dài ở chính ô nhập bên dưới.
  const tenBanDau = (ten: string) => (ten === TEN_MAC_DINH ? '' : ten)
  const [tenNhap, setTenNhap] = useState(() => tenBanDau(bang.ten))
  // Ô rỗng KHÔNG được lưu thành tên rỗng: bấm "+" rồi đổi ý (chạm ra ngoài, Enter luôn) là luồng có
  // thật, và một thẻ không nhãn thì không cách nào phân biệt trong lưới — đúng lý do tên mặc định
  // tồn tại. Rỗng hoặc chỉ toàn khoảng trắng đều lùi về tên mặc định.
  const tenCanLuu = () => tenNhap.trim() || TEN_MAC_DINH
  const [tagNhap, setTagNhap] = useState('')
  const nutRef = useRef<HTMLButtonElement>(null)
  // Nút "⋯" — giữ ref để TRẢ FOCUS về đây khi đóng menu/panel bằng Escape (bàn phím/trình đọc màn
  // hình mở sheet ra rồi thoát, con trỏ tiêu điểm phải quay lại đúng chỗ vừa bấm, không rơi về
  // <body>). Đóng bằng bấm-ra-ngoài hoặc chọn một mục (Đổi tên/tag/Xoá) KHÔNG trả về đây — focus
  // đi theo hành động (ô đổi tên tự autoFocus, v.v.), đúng như mong đợi.
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const tagPanelRef = useRef<HTMLDivElement>(null)
  // Menu "⋯" mở LÊN TRÊN thay vì xuống dưới, khi dưới thẻ không còn chỗ. Xem useLayoutEffect ngay
  // dưới phần khai báo state — mặc định false (mở xuống) để lượt render đầu không nhấp nháy.
  const [menuMoLen, setMenuMoLen] = useState(false)
  // Nháy xác nhận khi HUỶ đổi tên bằng Escape — trước bản vá này, Escape hoàn tác đúng (tên cũ được
  // lưu lại) nhưng không có gì cho người gõ nhanh THẤY việc huỷ đã xảy ra, chỉ có thể tin (critique
  // 2026-09-02 lượt 3, P3). Tự tắt sau một nhịp ngắn — xem .ten-bang-vua-huy (index.css) cho hoạt
  // ảnh, tắt ở Escape handler bên dưới.
  const [vuaHuyDoiTen, setVuaHuyDoiTen] = useState(false)
  useEffect(() => {
    if (!vuaHuyDoiTen) return
    const id = setTimeout(() => setVuaHuyDoiTen(false), 300)
    return () => clearTimeout(id)
  }, [vuaHuyDoiTen])
  // Đặt góc nghiêng theo MỘT điểm (chuột đang hover HOẶC ngón tay đang ấn) — dùng chung cho cả hai
  // nhánh con trỏ/cảm ứng của onPointerDown/onPointerMove bên dưới, cùng một công thức toạ độ đọc
  // bởi Lớp B/C trong index.css (--con-tro-x/--con-tro-y, [0,1] theo bề rộng/cao nút).
  const datNghiengTheoDiem = (clientX: number, clientY: number) => {
    const el = nutRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--con-tro-x', String((clientX - r.left) / r.width))
    el.style.setProperty('--con-tro-y', String((clientY - r.top) / r.height))
  }
  // Gỡ góc nghiêng theo điểm chạm — gọi ở mọi điểm ngón tay/con trỏ RỜI thẻ (pointerup/
  // pointercancel/pointerleave), đúng lúc :hover/:active hết khớp nên tờ giấy phải TỰ SETTLE về góc
  // tĩnh (var(--tilt)) qua chính transition 0.18s đã có, không phải đứng khựng ở góc nghiêng cuối
  // cùng của lần chạm trước.
  const xoaNghiengConTro = () => {
    nutRef.current?.style.removeProperty('--con-tro-x')
    nutRef.current?.style.removeProperty('--con-tro-y')
  }
  // Tên chuyên khoa cho aria-label — huy hiệu chuyên khoa trong TheTrong là aria-hidden (nó lồng
  // vào artwork trang trí), nên người dùng trình đọc màn hình không có cách nào khác biết bảng này
  // thuộc chuyên khoa nào trong khi người dùng sáng mắt thấy ngay qua icon+màu (critique 2026-08-26 P3).
  const tenChuyenKhoa = SPECIALTIES.find((s) => s.id === (bang.chuyenKhoa ?? SPECIALTIES[0].id))?.name

  // Tính "vừa tạo" bằng ĐỒNG HỒ RIÊNG của thẻ, không phải mốc đông cứng lúc LuoiMuc mount —
  // trước đây parent chụp `Date.now()` một lần lúc MOUNT rồi so cho MỌI thẻ; bảng tạo SAU khi
  // gallery đã mở (đúng luồng "+" → mở ô đổi tên tại chỗ) có taoLuc > mốc đó, hiệu số luôn ÂM nên
  // `vuaTao` treo `true` suốt phiên xem thay vì tắt sau 3s — thẻ đóng băng ở khung hình đầu của
  // .card-plop, kéo theo vùng chạm "⋯" bị scale nhỏ lại (critique lượt 3, 2026-08-24). Đồng hồ
  // riêng + hẹn giờ tự tắt ở đây đảm bảo đúng hạn bất kể parent có re-render đúng lúc t+3s hay không.
  const [vuaTao, setVuaTao] = useState(() => Date.now() - bang.taoLuc < VUA_TAO_NGUONG_MS)
  useEffect(() => {
    if (!vuaTao) return
    const conLai = VUA_TAO_NGUONG_MS - (Date.now() - bang.taoLuc)
    if (conLai <= 0) {
      setVuaTao(false)
      return
    }
    const id = setTimeout(() => setVuaTao(false), conLai)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cần chạy lại khi ĐỔI bảng (khoá
    // theo id), không phải mỗi khi `vuaTao` tự nó đổi (tránh vòng lặp huỷ-rồi-lập-lại hẹn giờ).
  }, [bang.id, bang.taoLuc])

  // `tenNhap` chỉ khởi tạo MỘT LẦN từ `useState(bang.ten)` — không tự đồng bộ lại khi mở sửa tên
  // LẦN THỨ HAI. Không có effect này: gõ nháp → Escape (huỷ, không lưu nhưng cũng không reset ô
  // nhập) → mở sửa tên lại → ô nhập vẫn hiện bản nháp đã huỷ chứ không phải tên thật hiện tại →
  // lỡ tay blur ra ngoài thì `onLuuTen(tenNhap)` ÂM THẦM ghi đè tên bảng bằng bản nháp cũ — mất
  // dữ liệu thật, không chỉ hiển thị sai. Đồng bộ lại mỗi khi `dangSuaTen` chuyển sang true.
  useEffect(() => {
    if (dangSuaTen) setTenNhap(tenBanDau(bang.ten))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tenBanDau` là hàm thuần dựng lại mỗi
    // lượt render; đưa nó vào deps sẽ chạy effect mỗi render và xoá sạch bản nháp đang gõ dở.
  }, [dangSuaTen, bang.ten])

  // ─── Menu "⋯" luôn NEO VÀO THẺ, chỉ lật hướng khi hết chỗ ────────────────────────────────────
  //
  // Trước 2026-08-30, trên màn ≤640px index.css ghim menu này xuống ĐÁY MÀN HÌNH (bottom sheet), với
  // lý do "luôn trong tầm ngón cái" (critique 2026-08-26). Đo lại trên iPhone 375×812 cho thấy cái
  // giá của nó: bấm "⋯" của thẻ hàng đầu (nút ở y=196) thì menu hiện ở y=585 — CÁCH NÚT 345px, mép
  // dưới chạm đúng mép trên thanh nav (755). Menu mất hẳn liên hệ với thẻ đã mở nó: trên một lưới
  // nhiều thẻ, không có gì cho biết "Xoá" sắp xoá bảng nào. Chủ dự án gọi đây là lỗi RẤT NẶNG
  // (2026-08-30) và đúng: với một menu có mục phá huỷ, mất liên hệ chỉ-định nguy hiểm hơn hẳn việc
  // phải với xa vài centimet.
  // Neo vào thẻ giữ được liên hệ đó ở mọi bề rộng. Vấn đề mà bottom-sheet từng giải — thẻ ở HÀNG
  // CUỐI mở menu tràn xuống dưới màn — được xử lý đúng chỗ hơn: LẬT LÊN TRÊN khi phía dưới không đủ
  // chỗ, đúng cách mọi menu ngữ cảnh gốc của hệ điều hành làm.
  //
  // `useLayoutEffect` chứ không phải `useEffect`: đo rồi lật phải xong TRƯỚC lượt sơn, nếu không
  // người dùng thấy menu nhảy một nhịp từ dưới lên trên.
  useLayoutEffect(() => {
    if (!dangMoMenu) {
      setMenuMoLen(false)
      return
    }
    const el = menuRef.current
    const nut = menuBtnRef.current
    if (!el || !nut) return
    const cao = el.offsetHeight
    const nutR = nut.getBoundingClientRect()
    // Đáy dùng được = mép dưới khung nhìn trừ thanh nav (và safe-area của nó). `--above-nav` là
    // cùng token mà mọi thứ neo trên thanh nav trong app này dùng — không tự chế lại phép tính.
    //
    // Phải ĐO qua một phần tử thật, không `parseFloat` giá trị token: `--above-nav` là một
    // `calc(calc(51px + max(5px, 0px)) + 18px)` (có `env(safe-area-inset-bottom)` bên trong), và
    // `getPropertyValue` trả về nguyên văn chuỗi calc chứ không phải số đã giải — `parseFloat` trên
    // đó ra `NaN` (đo được 2026-08-30). Một div ẩn cao đúng bằng token buộc trình duyệt giải calc,
    // kể cả phần `env()` chỉ máy thật mới có giá trị khác 0.
    const thuoc = document.createElement('div')
    thuoc.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:var(--above-nav)'
    document.body.appendChild(thuoc)
    const aboveNav = thuoc.offsetHeight
    thuoc.remove()
    const dayAnToan = window.innerHeight - (aboveNav > 0 ? aboveNav : 76)
    const duChoDuoi = nutR.bottom + cao <= dayAnToan
    // Chỉ lật khi phía dưới thiếu chỗ VÀ phía trên đủ chỗ — thiếu cả hai thì mở xuống như cũ và để
    // vùng cuộn lo phần còn lại, thay vì đẩy menu lên khuất sau tiêu đề màn.
    const duChoTren = nutR.top - cao >= 0
    setMenuMoLen(!duChoDuoi && duChoTren)
  }, [dangMoMenu])

  // Quản lý tiêu điểm cho sheet "⋯" và panel chuyên khoa/tag — cả hai là <div> thường, không có
  // hành vi focus sẵn của control gốc (critique 2026-08-28 P2, persona Sam: mở sheet ra là focus
  // vẫn kẹt ở đầu lưới đã cuộn, Tab lại xổ trang ra xa sheet). Mở → đưa focus vào phần tử focus
  // được đầu tiên TRONG sheet. Đóng bằng Escape → trả về nút "⋯". Tab bị giam vòng trong sheet.
  // Deps là HAI cờ riêng (không phải `dangMoMenu || dangSuaTag`) để lượt chuyển menu→panel — hai
  // cờ đổi nhưng "có sheet nào mở" vẫn true — vẫn kích hoạt lại đúng ref mới.
  useEffect(() => {
    const el = dangMoMenu ? menuRef.current : dangSuaTag ? tagPanelRef.current : null
    if (!el) return
    const focusables = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => !n.hasAttribute('disabled'))
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        menuBtnRef.current?.focus()
        return
      }
      if (e.key !== 'Tab') return
      const f = focusables()
      if (f.length === 0) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [dangMoMenu, dangSuaTag])

  const lopVaoMan = dangXoa ? 'card-slide-out' : vuaTao ? 'card-plop' : 'card-settle'

  return (
    <div
      data-testid="the-bang"
      className={lopVaoMan}
      style={{
        position: 'relative',
        '--tilt': `${nghiengOnDinh(bang.id)}deg`,
        '--i': index,
        pointerEvents: dangXoa ? 'none' : undefined,
      } as React.CSSProperties}
    >
      <button
        ref={nutRef}
        type="button"
        onClick={() => {
          // Chỉ dựng origin khi rect đo được có kích thước thật (>0) — rect rỗng (0×0) xảy ra khi
          // phần tử chưa layout xong hoặc trong môi trường không có engine layout thật (vd ca kiểm
          // happy-dom). Không có kích thước thật thì FLIP không có gì để "First" từ đó — rơi về
          // .board-in (scale-fade) cũ thay vì một chuyển cảnh co về góc (0,0) vô nghĩa.
          const r = nutRef.current?.getBoundingClientRect()
          onMo(
            r && r.width > 0 && r.height > 0
              ? {
                  top: r.top,
                  left: r.left,
                  width: r.width,
                  height: r.height,
                  tilt: nghiengOnDinh(bang.id),
                  chuyenKhoa: bang.chuyenKhoa,
                  id: bang.id,
                  mauHue: bang.mauHue,
                }
              : undefined,
          )
        }}
        className="the-bang-vat the-bang-nghieng-con-tro mind-focus-ring"
        // Nghiêng theo vị trí con trỏ/ngón tay khi đang ấn — Lớp B/C ở index.css đọc hai biến này.
        // Nhấn-giữ ĐỂ MỞ MENU từng sống ở đúng ba handler này (removed 2026-09-02, distill P3): sau
        // 3 vòng critique độc lập, cử chỉ đó vẫn không ai tìm ra (comment cũ ghi thẳng điều này) —
        // "⋯" đã là lối vào DUY NHẤT và đầy đủ tới cùng menu, nên giữ một cử chỉ song song không ai
        // dùng chỉ còn là chi phí bảo trì (thêm nhánh onPointerDown/Move/Cancel, thêm bề mặt cho bug
        // tinh vi) không ai hưởng lợi — không mất chức năng thật nào khi bỏ.
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return
          // Nghiêng ngay từ lúc ngón tay chạm xuống — một cú chạm-mở-bảng bình thường không tạo
          // pointermove nào trước khi rời tay, nên thiếu dòng này thì .the-bang-vat:active của phần
          // lớn lượt chạm không bao giờ có góc nghiêng thật, chỉ scale phẳng (adapt cho cảm ứng,
          // critique 2026-09-02 P2 — trước đây Lớp C chỉ chạy qua :hover chuột, vô hình với đối
          // tượng dùng chính của PWA này).
          datNghiengTheoDiem(e.clientX, e.clientY)
        }}
        onPointerUp={xoaNghiengConTro}
        onPointerCancel={xoaNghiengConTro}
        onPointerMove={(e) => datNghiengTheoDiem(e.clientX, e.clientY)}
        onPointerLeave={xoaNghiengConTro}
        // WebkitTouchCallout/userSelect none: nút này là một hành động (mở bảng), không phải văn
        // bản để chọn — không tắt thì iOS bật bong bóng "Sao chép" và bôi đen tên bảng ngay giữa cú
        // chạm/ấn giữ bình thường. Không ảnh hưởng bàn phím/trình đọc màn hình.
        style={{
          display: 'block',
          width: '100%',
          border: 0,
          background: 'none',
          padding: 0,
          textAlign: 'left',
          WebkitTouchCallout: 'none',
          userSelect: 'none',
        }}
        // Mốc cập nhật tương đối gắn vào aria-label — cùng lý do/mẫu moTaXoa của panel "Đã xoá gần
        // đây" (critique 2026-09-01 P1, xem chú thích tại đó): trước bản vá này, mọi thẻ CHƯA gắn
        // chuyên khoa (mặc định của bảng mới từ 2026-09-02) có aria-label NGUYÊN VĂN giống hệt nhau
        // — "Mở bảng Bảng chưa đặt tên" — nên người dùng trình đọc màn hình không có cách nào phân
        // biệt N bảng như vậy trong lưới, dù bản vá màu-theo-id lượt 2 đã giúp người sáng mắt phân
        // biệt được (critique 2026-09-02 lượt 3, P1 — đúng lỗi đã vá RIÊNG ở panel trash nhưng chưa
        // mang sang lưới chính). Dùng capNhatLuc (đã hiển thị trên màn, xem <p> ngay dưới) chứ không
        // phải taoLuc: đây là mốc người dùng NHÌN THẤY, giữ hai nguồn tin đồng bộ với nhau.
        //
        // `formatReadTime` làm tròn mọi mốc dưới 60 giây thành "Vừa xong" — hai bảng tạo trong cùng
        // một phút (thao tác thật, phổ biến nhất: dựng vài khung liên tiếp đầu ca trực) vẫn đọc ra
        // câu byte-y-hệt nhau, tái lập chính lớp lỗi bản vá này định sửa (đo được trực tiếp, critique
        // 2026-09-03 lượt 4, P1). Tái dùng một giá trị ĐÃ LÀM TRÒN cho hiển thị làm nguồn phân biệt
        // là sai công cụ — thêm `index` (vị trí hiện tại trong lưới đã sắp xếp, luôn khác nhau giữa
        // hai bản ghi bất kỳ, không cần state mới) làm số thứ tự CHỈ cho nhánh chưa gắn khoa VÀ còn
        // mang tên mặc định — đúng nhánh gây nhầm lẫn, không đụng tới bảng đã có tên/khoa riêng.
        aria-label={
          tenChuyenKhoa
            ? `Mở bảng ${bang.ten}, chuyên khoa ${tenChuyenKhoa}, cập nhật ${formatReadTime(bang.capNhatLuc)}`
            : bang.ten === TEN_MAC_DINH
              ? `Mở bảng chưa đặt tên thứ ${index + 1}, cập nhật ${formatReadTime(bang.capNhatLuc)}`
              : `Mở bảng ${bang.ten}, cập nhật ${formatReadTime(bang.capNhatLuc)}`
        }
      >
        <div
          // .mind-note-card (index.css): tờ giấy ghim y hệt ảnh tham chiếu người dùng gửi lần 2
          // (2026-08-26) — trắng, mép dưới-trái cong lên (curl), có bóng đổ thật để "nổi" khỏi trang
          // (KHÔNG áp Floating-Layer-Only Rule ở đây — bề mặt Mindmap có luật vật liệu riêng, xem
          // surface brief "chân thực vật lý"). overflow KHÔNG hidden ở div này — góc cong + bóng cần
          // tràn ra ngoài khung 4:3; ảnh/doodle bên trong được bọc riêng một div overflow:hidden.
          className="mind-note-card"
          style={{ position: 'relative', aspectRatio: '4 / 3' }}
        >
          <div
            style={{
              position: 'absolute',
              // Thẻ LUÔN mang icon chuyên khoa — không bao giờ tái hiện nét vẽ bên trong bảng.
              //
              // Trước 2026-08-30, khi bảng đã có nội dung thì ô này thay icon bằng `bang.anhXemTruoc`
              // — một ảnh chụp CANVAS KHUNG NHÌN lúc rời bảng (480×360, JPEG q=0.6). Chủ dự án gọi
              // đó là "lỗi RẤT NẶNG": thẻ mất danh tính chuyên khoa ngay khi bảng bắt đầu có việc,
              // và cái thay vào là một hình bệt phụ thuộc chỗ người dùng vô tình dừng khung nhìn.
              // Nay lưới đọc được bằng MỘT ngôn ngữ thị giác duy nhất (icon + màu chuyên khoa), ổn
              // định qua mọi lần mở/đóng bảng.
              // Bỏ luôn `inset: 6` + viền trong: hai thứ đó tồn tại để tấm ảnh trông như được ghim
              // lên giấy, mà giờ không còn tấm ảnh nào. Icon là hoạ tiết của CHÍNH tờ giấy nên tràn
              // kín, đúng như nhánh TheTrong vẫn làm cho bảng trống từ trước tới nay.
              inset: 0,
              overflow: 'hidden',
              borderRadius: 2,
              color: 'var(--c-text-muted, #6b6e96)',
            }}
          >
            <TheTrong khoa={bang.chuyenKhoa ?? SPECIALTIES[0].id} id={bang.id} mauHue={bang.mauHue} />
          </div>
          {/* Không còn cây ghim vẽ trên thẻ — chủ dự án yêu cầu bỏ hẳn (2026-08-29: "xóa ghim").
              Phân biệt bảng cùng tên mặc định vẫn còn: icon + màu chuyên khoa trong TheTrong, tên,
              vị trí trong lưới, và chấm màu ổn định trong panel "Đã xoá gần đây". */}
        </div>
        {!dangSuaTen && (
          <>
            <p
              className={vuaHuyDoiTen ? 'ten-bang-vua-huy' : undefined}
              style={{
                fontSize: 13,
                fontWeight: 600,
                margin: '4px 0 0',
                lineHeight: 1.2,
                // Tên lâm sàng dài (vd danh sách chẩn đoán phân biệt) từng kéo cả HÀNG lưới cao theo
                // ô cao nhất (Grid stretch mặc định), để lại khoảng trắng chết ở thẻ liền kề tên
                // ngắn — chặn ở 2 dòng, cùng cỡ mọi thẻ trong cùng hàng luôn khớp nhau.
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bang.ten}
            </p>
            <p style={{ fontSize: 11, margin: '1px 0 0', color: 'var(--c-text-muted, #6b6e96)' }}>
              {formatReadTime(bang.capNhatLuc)}
            </p>
          </>
        )}
      </button>

      {dangSuaTen && (
        <input
          type="text"
          data-testid={`input-ten-${bang.id}`}
          value={tenNhap}
          autoFocus
          // aria-label TĨNH, không dựa vào `value` — nếu không, người dùng đọc màn hình xoá trắng ô
          // để gõ lại sẽ mất tên truy cập giữa chừng (critique lượt 3, 2026-08-24).
          aria-label="Đổi tên bảng"
          // Tên mặc định là PLACEHOLDER, ô để rỗng — không phải giá trị thật trong ô.
          //
          // Luồng phổ biến nhất là bấm "+" rồi gõ tên ngay. Bản vá trước dùng `onFocus` → `select()`
          // để ký tự đầu tiên ghi đè tên mặc định thay vì nối vào đuôi nó. Cách đó đủ trên máy có
          // chuột nhưng KHÔNG cứu được iPhone, và lý do đáng ghi lại: Safari không mở bàn phím cho
          // một `focus()` do script gọi (xem HANDOFF 1.1), nên người dùng BUỘC phải chạm vào ô mới
          // gõ được — chính cú chạm đó đặt lại caret và huỷ vùng vừa chọn. Vùng chọn không sống nổi
          // tới lúc phím đầu tiên được gõ, nên tên vẫn ra `"Bảng chưa đặt tênSốc nhiễm khuẩn"`
          // (chủ dự án báo trên máy thật 2026-08-29).
          //
          // Ô rỗng bỏ hẳn chỗ dựa vào vùng chọn: gõ ở bất kỳ vị trí caret nào cũng ra đúng thứ
          // người dùng gõ. `select()` vẫn giữ cho luồng đổi tên một bảng ĐÃ có tên thật.
          placeholder={TEN_MAC_DINH}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setTenNhap(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onLuuTen(tenCanLuu())
            if (e.key === 'Escape') {
              setVuaHuyDoiTen(true)
              onLuuTen(bang.ten)
            }
          }}
          onBlur={() => onLuuTen(tenCanLuu())}
          className="mind-focus-ring"
          // `input:focus{outline:none}` (index.css, reset toàn app) + Tailwind preflight đưa border
          // về 0 cộng lại xoá sạch MỌI tín hiệu đây là ô nhập — .mind-focus-ring chỉ bù lại lúc
          // :focus-visible (bàn phím), nên cần thêm viền nghỉ để ô này trông "có thể sửa" ngay cả
          // trước khi focus.
          style={{
            width: '100%',
            marginTop: 4,
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid var(--c-line, #d9ddf4)',
            borderRadius: 4,
            padding: '2px 4px',
            background: 'var(--c-surface, #fff)',
            // Ô này là ANH EM (không phải con) của nút .the-bang-vat mang rotate(var(--tilt)) —
            // transform không kế thừa qua CSS nên ô nhập trước đây đứng thẳng phẳng lệch với thẻ
            // giấy vẫn đang nghiêng ngay bên dưới, đúng lúc người dùng chú ý nhất (đặt tên bảng vừa
            // tạo) — một vết nứt nhỏ trong ảo giác "mọi thứ là vật thể thật" (critique 2026-09-02
            // lượt 2, P3). --tilt là custom property, CÓ kế thừa qua cây DOM dù transform thì không,
            // nên đọc lại đúng góc của outer wrapper là đủ, không cần đo/truyền lại giá trị nào mới.
            transform: 'rotate(var(--tilt, 0deg))',
          }}
        />
      )}

      {chonNhieu && (
        // Checkbox thay HẲN nút "⋯" (không chỉ che nó) khi đang ở chế độ chọn-nhiều — cùng vị trí
        // góc/44×44 nên mắt không phải học lại toạ độ, nhưng loại bỏ affordance mở menu từng-thẻ
        // trong khi đang thao tác hàng loạt (hai chế độ chọn xung đột nhau nếu cùng hiện).
        // Vùng chạm 44×44 bọc checkbox 20px — to hơn checkbox 17px của panel trash một chút vì thẻ
        // này lớn hơn hẳn dòng danh sách trash, cân đối thị giác hơn.
        <label
          style={{
            position: 'absolute', top: 4, right: 4, width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            data-testid={`chon-nhieu-song-${bang.id}`}
            checked={daChonNhieu}
            onChange={() => onChuyenChonNhieu?.()}
            aria-label={`Chọn bảng ${bang.ten}`}
            // colorScheme:'light' BẮT BUỘC ở đây, không kế thừa app.dark: checkbox này nằm TRÊN tờ
            // giấy .mind-note-card (không đổi theo theme, luôn gần-trắng) nhưng trình duyệt tự vẽ
            // khung checkbox CHƯA TÍCH theo color-scheme của TRANG (dark), ra một ô đặc tối gần như
            // không viền trên nền giấy sáng — đọc thành hoạ tiết trang trí hơn là control (critique
            // 2026-09-02 lượt 2, P3). Ép light cho riêng control này thì khung/viền luôn vẽ theo quy
            // ước sáng, khớp đúng nền giấy nó đứng trên — accentColor (trạng thái ĐÃ tích) không đổi.
            style={{ width: 20, height: 20, accentColor: 'var(--c-primary, #2d3a94)', colorScheme: 'light' }}
          />
        </label>
      )}
      <button
        ref={menuBtnRef}
        type="button"
        data-testid={`menu-bang-${bang.id}`}
        onClick={onBatMenu}
        aria-label="Tuỳ chọn bảng"
        aria-haspopup="menu"
        aria-expanded={dangMoMenu || dangSuaTag}
        hidden={chonNhieu}
        className="mind-focus-ring"
        // Vùng chạm 44×44 (chuẩn tối thiểu cho ngón tay, WCAG 2.2 AA + khuyến nghị thực hành) — giữ
        // cùng gốc top/right:4 như cũ (không đẩy ra ngoài mép thẻ, tránh chồng lên khoảng gap của
        // lưới) nên box lớn hơn ăn VÀO PHÍA TRONG thẻ; icon tự căn giữa lại bằng flex, dịch nhẹ
        // vào trong so với vị trí cũ — chấp nhận được, không phóng to một hình tròn nền/viền vốn
        // không tồn tại (nút này chưa từng có background/border thấy được, chỉ có ba dấu chấm).
        //
        // color BẮT BUỘC đặt ở đây, không để kế thừa: nút nằm TRÊN tờ giấy .mind-note-card (không
        // đổi theo theme) nhưng Tailwind preflight cho <button> `color: inherit`, nên trước lượt vá
        // này nó nhận --c-text — token LẬT sang near-white ở bản tối. Đo thật trên trang:
        // rgb(236,239,252) trên giấy rgb(239,236,227) = 1,03:1, tức nút mở TOÀN BỘ hành động của
        // thẻ (đổi tên, gắn khoa, xoá) VÔ HÌNH ở dark mode — đúng ca dùng ban đêm mà
        // DESIGN.md đặt làm ràng buộc hạng nhất (critique 2026-08-28, P0). --c-on-note giữ 17,3:1
        // bản sáng / 15,5:1 bản tối.
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 0,
          background: 'none',
          color: 'var(--c-on-note, #12142b)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Icon VẼ THẬT thay cho ký tự Unicode "⋯" dùng trước đây. Hai lý do: (1) glyph Unicode
            render khác nhau theo font/hệ điều hành và không nhận được cỡ/khoảng cách nhất quán như
            phần còn lại của hệ icon app (đều là SVG currentColor); (2) ba chấm đặc r=1.5 ở 18px
            đọc rõ hơn hẳn glyph text cùng ô — trực tiếp nới cái affordance vốn quá mờ nhạt
            (critique 2026-08-28, P2). currentColor nên tự ăn theo --c-on-note đặt ngay trên. */}
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
          <circle cx="3.5" cy="9" r="1.5" fill="currentColor" />
          <circle cx="9" cy="9" r="1.5" fill="currentColor" />
          <circle cx="14.5" cy="9" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {dangMoMenu && (
        // .mind-menu-bang: trên màn hẹp (mobile), src/index.css ghim panel này xuống ĐÁY màn hình
        // (bottom sheet, luôn trong tầm ngón cái) thay vì neo cứng top:30 relative-tới-thẻ — thẻ ở
        // HÀNG TRÊN CÙNG của lưới dài mở panel gần rìa trên, không phải vùng ngón cái thoải mái nhất
        // khi dùng một tay (critique 2026-08-26, minor observation). .mind-sheet thêm hiệu ứng trượt
        // lên nhẹ, nhất quán với các sheet khác của app.
        <div
          // mind-menu-compact: chỉ 3 dòng chữ ngắn (Chuyên khoa/tag, Đổi tên, Xoá) — KHÔNG cần trải
          // full-bleed như panel "Chuyên khoa/tag" ngay dưới (có select+chip+input, thật sự cần rộng).
          // Cả hai vốn dùng chung .mind-menu-bang nên trên mobile đều bị media query kéo full-bleed
          // như nhau, khiến menu thưa nội dung này đọc thành một menu quá khổ so với "các menu còn
          // lại" của app (phản hồi thật 2026-08-27, taste review). Modifier này cho index.css tách
          // riêng: vẫn ghim đáy màn hình trong tầm ngón cái (lý do gốc của bottom-sheet, giữ nguyên
          // critique 2026-08-26), chỉ bỏ ép trải hết bề ngang.
          ref={menuRef}
          role="menu"
          aria-label={`Tuỳ chọn bảng ${bang.ten}`}
          className="mind-menu-bang mind-menu-compact mind-sheet"
          style={{ position: 'absolute', top: menuMoLen ? 'auto' : 30, bottom: menuMoLen ? 30 : 'auto', right: 4, width: 'max-content', background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px var(--c-shadow), var(--c-shadow-glow)', border: '1px solid rgba(var(--c-accent-2-rgb, 184, 25, 111), 0.2)', borderRadius: 8, padding: 4, zIndex: 1 }}
        >
          {/* Vùng chạm 40px (display:flex+minHeight, không phải padding trần) + khoảng cách/đường
              phân trước mục xoá — trước đây hai dòng cao ~30.6px, cách nhau 0px, hành động phá huỷ
              đứng ngay sát hành động an toàn (critique lượt 3, 2026-08-24), nên tăng lên 44px. 44px
              sau đó tự đọc thành "dòng dãn cách quá xa" cho 3-4 dòng chữ 12px ngắn xếp chồng (phản
              hồi thật 2026-08-28) — hạ về 40px: vẫn vượt xa ngưỡng WCAG 2.5.8 AA (24px, không phải
              44 — 44 là mức khuyến nghị AAA/HIG, không bắt buộc), vẫn đủ rộng hơn hẳn 30.6px từng bị
              coi là lỗi, chỉ bớt khoảng đệm rỗng trên/dưới mỗi dòng chữ. Đường phân + marginTop trước
              "Xoá" giữ nguyên — đó là phần thật sự xử lý ranh giới phá huỷ/an toàn, độc lập với chiều
              cao từng dòng.
              width:'max-content' trên div ngoài + whiteSpace nowrap trên từng nhãn (mới thêm
              2026-08-26, phản hồi thật "cắt cụt ngang") — trước đây div ngoài KHÔNG có width tường
              minh, phải tự suy shrink-to-fit trong khi mọi <button> con lại đặt width:100% CỦA CHÍNH
              div đó — vòng phụ thuộc khiến trình duyệt suy ra độ rộng hẹp hơn nội dung thật, ngắt dòng
              ngay giữa nhãn dài nhất ("Chuyên khoa/tag" vỡ thành "Chuyên" / "khoa/tag" trên hai dòng).
              CHỌN 'max-content' thay vì một số minWidth cố định (thử trước, ĐÃ BỎ): số cố định đè
              lên đúng cơ chế "trải full-width" của bottom sheet mobile ngay dưới (.mind-menu-bang
              media max-width:640px đặt width:auto!important + left/right:12px) — !important CHỈ
              thắng width, không thắng min-width, nên minWidth cố định vẫn ăn vào SAU khi width:auto
              đã giải, ép menu bottom-sheet mobile co lại đúng bằng con số đó thay vì trải hết bề
              ngang (đo thật: 172px thay vì ~351px ở màn 375px — hồi quy tự phát hiện lúc kiểm tay).
              max-content không xung đột: nó là GIÁ TRỊ width thật (không phải min-width) nên bị
              width:auto!important ở mobile ghi đè đúng như ý, còn ở desktop trình duyệt tự suy đúng
              độ rộng cần thiết từ nội dung chữ dài nhất — không cần đoán một con số px. */}
          {/* fontSize 10 + fontWeight 600 — KHỚP đúng nhãn thanh nav dưới (App.tsx: text-[10px],
              fontWeight 500/700 tuỳ trạng thái). Ba nút này trước đây KHÔNG đặt fontSize nào, nên
              thừa kế cỡ chữ mặc định trình duyệt (~16px) — to hơn HẲN mọi chữ khác quanh nó (chip
              12px, nhãn "Chuyên khoa"/tag 11px) — vừa đọc "chữ menu quá bự", vừa kéo bề rộng
              max-content của cả thanh menu to theo (phản hồi thật 2026-08-27, layout review). Chữ
              nhỏ lại không thu hẹp vùng chạm: minHeight:40 vẫn giữ nguyên, chỉ khối TEXT bên trong
              gọn lại — không bị ép/cắt cụt vì max-content vẫn tự co đúng theo độ rộng chữ mới. */}
          <button
            type="button"
            data-testid={`sua-tag-${bang.id}`}
            onClick={onBatSuaTag}
            className="mind-focus-ring"
            role="menuitem"
            style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 40, textAlign: 'left', padding: '0 10px', border: 0, background: 'none', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600 }}
          >
            Chuyên khoa/tag
          </button>
          <button
            type="button"
            data-testid={`doi-ten-${bang.id}`}
            onClick={onBatSuaTen}
            className="mind-focus-ring"
            role="menuitem"
            style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 40, textAlign: 'left', padding: '0 10px', border: 0, background: 'none', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600 }}
          >
            Đổi tên
          </button>
          {/* "Xuất PNG" KHÔNG còn ở đây — chuyển ra nút tròn ở màn vẽ (BoardGallery.tsx), đối xứng
              với nút quay lại. Lý do: xuất từ lưới phải mount một bảng ngầm, mà trình soạn thảo
              ngầm không bao giờ render khối note nên thẻ ghi chú không vào được ảnh. Xuất từ bảng
              đang mở dựng ảnh từ chính cây đang render. Xem ./xuatAnhBang.ts và HANDOFF §1.1. */}
          <button
            type="button"
            data-testid={`xoa-${bang.id}`}
            onClick={onXoa}
            className="mind-focus-ring"
            role="menuitem"
            // aria-live + aria-atomic: chuyển "Xoá" → "Chắc chắn xoá?" chỉ là đổi CHỮ trên CÙNG nút,
            // không có phần tử mới nào mount lên để trình đọc màn hình tình cờ bắt được — không có
            // hai thuộc tính này, việc chuyển sang bước xác nhận phá huỷ hoàn toàn im lặng với AT
            // (critique 2026-09-02 lượt 2, P2). "polite" (không "assertive"): đây là xác nhận NGAY
            // SAU thao tác của chính người dùng trên đúng nút đang focus, không phải một cảnh báo hệ
            // thống cần cắt ngang những gì AT đang đọc dở.
            aria-live="polite"
            aria-atomic="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              minHeight: 40,
              textAlign: 'left',
              padding: '0 10px',
              marginTop: 2,
              border: 0,
              borderTop: '1px solid var(--c-line, #d9ddf4)',
              background: 'none',
              color: dangXacNhanXoa ? 'var(--c-danger, #c0392b)' : undefined,
              whiteSpace: 'nowrap',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {dangXacNhanXoa ? 'Chắc chắn xoá?' : 'Xoá'}
          </button>
        </div>
      )}

      {dangSuaTag && (
        <div
          ref={tagPanelRef}
          role="dialog"
          aria-label={`Chuyên khoa và tag cho bảng ${bang.ten}`}
          data-testid={`sua-chuyen-khoa-tag-${bang.id}`}
          // Cùng .mind-menu-bang/.mind-sheet với menu "⋯" ngay trên — cùng lý do (thẻ hàng trên
          // cùng, tầm ngón cái).
          className="mind-menu-bang mind-sheet"
          style={{ position: 'absolute', top: 30, right: 4, background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px var(--c-shadow), var(--c-shadow-glow)', border: '1px solid rgba(var(--c-accent-2-rgb, 184, 25, 111), 0.2)', borderRadius: 8, padding: 8, zIndex: 1, width: 200 }}
        >
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)', marginBottom: 2 }}>
            Chuyên khoa
          </label>
          <select
            data-testid={`chon-chuyen-khoa-${bang.id}`}
            // <label> ngay trên là nhãn TRẦN (không htmlFor, control không có id) nên trình đọc màn
            // hình không nối được nhãn với ô nào — ô này đọc ra là "không tên". Cùng mức chăm sóc
            // a11y file này đã áp cho ô tìm ("Tìm kiếm bảng"), nút × ("Xoá tag …"), ô đổi tên
            // ("Đổi tên bảng") — review cuối nhánh, mục 4.
            aria-label="Chuyên khoa"
            value={bang.chuyenKhoa ?? SPECIALTIES[0].id}
            onChange={(e) => onDoiChuyenKhoa(e.target.value)}
            className="mind-focus-ring"
            style={{ width: '100%', fontSize: 12.5, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--c-line, #d9ddf4)', marginBottom: 8 }}
          >
            {/* Bảng mới tạo (taoBangMoi) bắt đầu ở '' — lựa chọn này cho người dùng CHỦ ĐỘNG quay
                lại trạng thái đó (không chỉ tiến từ nó), thay vì buộc phải chọn một chuyên khoa thật
                cho một bảng hành chính/liên chuyên khoa không thuộc chuyên khoa nào. */}
            <option value="">— Chưa gắn chuyên khoa —</option>
            {SPECIALTIES.map((kh) => (
              <option key={kh.id} value={kh.id}>{kh.name}</option>
            ))}
          </select>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)', marginBottom: 2 }}>
            Tag
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
            {(bang.tags ?? []).map((t) => (
              <span
                key={t}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '2px 6px', borderRadius: 999, background: 'var(--c-surface-alt, #f6f7fd)' }}
              >
                {t}
                <button
                  type="button"
                  aria-label={`Xoá tag ${t}`}
                  onClick={() => onXoaTag(t)}
                  className="mind-focus-ring"
                  style={{ border: 0, background: 'none', padding: 0, fontSize: 11, lineHeight: 1, color: 'var(--c-text-muted, #6b6e96)' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            data-testid={`nhap-tag-${bang.id}`}
            // Cùng lý do với <select> ngay trên: nhãn "Tag" là <label> trần, không nối được với ô.
            // Placeholder KHÔNG thay được nhãn truy cập (nó biến mất ngay khi bắt đầu gõ).
            aria-label="Thêm tag"
            value={tagNhap}
            onChange={(e) => setTagNhap(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const tagSach = tagNhap.trim()
              if (tagSach) onThemTag(tagSach)
              setTagNhap('')
            }}
            placeholder="Thêm tag, Enter để lưu"
            className="mind-focus-ring"
            style={{ width: '100%', fontSize: 12.5, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--c-line, #d9ddf4)' }}
          />
          {/* Panel này trước đây không có lối thoát tường minh nào — chỉ Escape (không tồn tại trên
              bàn phím ảo di động) hoặc chạm ra ngoài (không tín hiệu thị giác gợi ý), lệch chuẩn
              "luôn có hành động tường minh cho mọi thao tác, kể cả thoát" mà menu "⋯" liền kề đang
              giữ (critique 2026-09-03 lượt 6, P2). `onBatSuaTag` vốn đã là một TOGGLE (mở nếu đang
              đóng, đóng nếu đang mở — xem chỗ gọi ở LuoiMuc) nên gọi lại chính nó lúc panel đang
              mở là đóng panel, không cần thêm prop/state mới. */}
          <button
            type="button"
            onClick={onBatSuaTag}
            className="mind-focus-ring"
            // minHeight 44 — cùng chuẩn vùng chạm tối thiểu mà checkbox chọn-nhiều (44×44) và nút
            // "⋯" (44×44) trong chính file này đang giữ; bản đầu chỉ cao 28px (padding 5px dọc),
            // đo được trên browser thật lúc polish (/impeccable polish 2026-09-03) — dưới chuẩn
            // ngay trên chính bề mặt vừa được ca ngợi vì tuân thủ 44px ở mọi nơi khác.
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 44, marginTop: 8, padding: '5px 0', borderRadius: 4, border: 0, background: 'var(--c-primary-soft, #eceefa)', color: 'var(--c-primary, #2d3a94)', fontSize: 12, fontWeight: 700, textAlign: 'center' }}
          >
            Xong
          </button>
        </div>
      )}
    </div>
  )
}

// Tiêu đề tab Mindmap dùng ScreenHeader chung (../components/ScreenHeader) — thống nhất với Thư viện/
// Dùng thuốc/Ôn tập (2026-08-28, phản hồi chủ dự án). KHÔNG còn header tự chế 17px + viền + nền, và
// KHÔNG còn nút "+ Bảng mới" trên header — ô "+" trong lưới (và ở trạng thái rỗng) đã đủ.

// Lưới giữ chỗ trong lúc useIdbCollection đọc lần đầu — trước đây `if (loading) return null` để
// nguyên tab TRỐNG TRƠN suốt lượt đọc IndexedDB đầu (critique 2026-08-28 P3): trên máy có nhiều
// bảng, mở app vội là một khung chết không gì neo vào. Tấm giấy ghim mờ "thở" nhẹ (empty-breathe
// đã gate reduced-motion) cho biết nội dung đang tới.
function LuoiChoTai() {
  return (
    // .mind-board-grid (index.css) — CÙNG lớp với lưới thật bên dưới, để khung giữ chỗ khớp đúng số
    // cột/cỡ ô của dữ liệu thật sắp thay thế nó, không nhảy layout khi useIdbCollection đọc xong.
    <div aria-hidden="true" className="mind-board-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="empty-breathe"
          style={{
            aspectRatio: '4 / 3',
            borderRadius: 2,
            background: 'var(--c-note, #fbfaf7)',
            boxShadow: '0 14px 22px -10px rgba(15, 15, 15, 0.16), 0 4px 8px rgba(15, 15, 15, 0.07)',
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Bốn trục lọc của lưới. Mọi trường optional và mặc định "không lọc" — đó là điều kiện để tab
 * Mindmap không đổi hành vi khi màn khác bắt đầu dùng chung component này (spec §3.5).
 */
export type BoLocMuc = {
  loai?: LoaiMuc
  danhMuc?: IdDanhMuc
  /** Riêng tab Thư viện. Prop RIÊNG thay vì nhồi ngữ nghĩa "trừ" vào `danhMuc` — spec §3.5. */
  danhMucLoaiTru?: IdDanhMuc[]
  chuyenKhoa?: string
}

/**
 * Lọc thuần, tách khỏi component để ca kiểm gọi được mà không phải dựng cả cây React (lưới có FLIP,
 * ResizeObserver và bảy state — dựng nó chỉ để hỏi "danh sách nào hiện ra" là đắt và giòn).
 *
 * Xoá mềm luôn bị loại ở đây, không phải một trục lọc: panel "Đã xoá gần đây" đọc `danhSach` gốc
 * chứ không đi qua hàm này.
 */
export function locTheoProps(ds: MucMeta[], p: BoLocMuc): MucMeta[] {
  return ds.filter((m) => {
    if (m.daXoaLuc) return false
    if (p.loai && m.loai !== p.loai) return false
    if (p.danhMuc && m.danhMuc !== p.danhMuc) return false
    if (p.danhMucLoaiTru?.includes(m.danhMuc)) return false
    // `chuyenKhoa: ''` nghĩa là CHƯA GẮN khoa (xem taoBangMoi) — nó không khớp bất kỳ khoa cụ thể
    // nào, và cũng không phải "khớp tất cả". So sánh thẳng là đúng ngữ nghĩa đó.
    if (p.chuyenKhoa && m.chuyenKhoa !== p.chuyenKhoa) return false
    return true
  })
}

export function LuoiMuc({
  onMoBang,
  dungTuBang,
  onHieuUngXong,
  tieuDe,
  loai,
  danhMuc,
  danhMucLoaiTru,
  chuyenKhoa,
  loaiTaoDuoc,
}: {
  // Tham số thứ tư `loai` — thêm ở Task 5: đường mở-qua-thẻ (đây, KHÁC đường `moBangYeuCau` của
  // App.tsx đi thẳng qua IndexedDB) là con đường CHÍNH người dùng dùng để mở một mục, nên nó phải tự
  // báo loại của bản ghi vừa bấm lên BoardGallery — thiếu tham số này thì BoardGallery không có cách
  // nào biết chọn vỏ EdgelessBoard hay TrangBaiViet cho MỌI lượt mở qua lưới.
  onMoBang: (boardId: string, origin?: BoardOpenOrigin, ten?: string, loai?: LoaiMuc) => void
  dungTuBang?: boolean
  onHieuUngXong?: () => void
  /** Tiêu đề màn — trước lượt này viết cứng "Sơ đồ tư duy" ở ba chỗ. */
  tieuDe: string
  /** `[]` = màn này KHÔNG có nút tạo (Thư viện, màn chuyên khoa). */
  loaiTaoDuoc: LoaiMuc[]
} & BoLocMuc) {
  // useIdbCollection tự nạp danh sách lúc mount (fetch một lần, xem src/lib/useIdbCollection.ts)
  // và cập nhật `items` CỤC BỘ NGAY khi add/update/remove được gọi — ghi IndexedDB chạy nền
  // (fire-and-forget), không chặn re-render. Đây là mẫu ĐÃ CÓ SẴN, dùng chung với ECG lessons/bài
  // viết — không tự viết state/fetch riêng cho danh sách bảng (xem cảnh báo ở Task 1).
  const {
    items: danhSach,
    loading,
    loiDoc,
    thuLaiDoc,
    loiGhi,
    soGhiCho,
    xoaLoiGhi,
    thuLaiGhi,
    add,
    update,
    // XOÁ VĨNH VIỄN — đường DUY NHẤT trong app gọi idbDelete thật (xoá mềm cố tình không gọi, xem
    // effect dangChoXoa). Chỉ panel "Đã xoá gần đây" bên dưới dùng: tích chọn kiểu Recycle Bin rồi
    // xoá hẳn hoặc khôi phục hàng loạt. Không hoàn tác được nên có bước xác nhận riêng.
    remove,
  } = useIdbCollection<MucMeta>(IDB_STORES.mucs)
  const [dangSuaTenId, setDangSuaTenId] = useState<string | null>(null)
  // Danh mục chưa chọn xong thì chưa có bản ghi nào — quyết định 7 cấm trạng thái chưa-phân-loại,
  // nên bảng chọn phải đứng TRƯỚC lượt `add()`, không phải sau.
  const [dangChonDanhMuc, setDangChonDanhMuc] = useState<LoaiMuc | null>(null)
  // Bản sao ĐỒNG BỘ của "đang có bảng chờ đặt tên", chỉ dùng làm khoá cho taoBangMoi — xem chú
  // thích dài tại đó. Ref chứ không phải state vì state React chỉ thấy được ở lượt render SAU.
  const dangSuaTenRef = useRef<string | null>(null)
  // Đồng bộ ref theo state ở MỌI lượt render (cố tình không có mảng deps). Ô đổi tên còn được mở/
  // đóng từ menu "⋯" và từ chính ô nhập, nên ref phải bám theo cả những đường đó; và không deps
  // nghĩa là dù `taoBangMoi` có ném giữa chừng sau khi đã gán khoá, lượt render kế tiếp bất kỳ cũng
  // trả nó về đúng state — khoá không thể kẹt vĩnh viễn làm chết nút "+". Giữa HAI cú click của một
  // lần bấm đúp thì không có lượt render nào, nên khoá vẫn nguyên vẹn ở đúng lúc cần.
  useEffect(() => {
    dangSuaTenRef.current = dangSuaTenId
  })
  const [dangMoMenuId, setDangMoMenuId] = useState<string | null>(null)
  const [dangSuaTagId, setDangSuaTagId] = useState<string | null>(null)
  const [dangXacNhanXoaId, setDangXacNhanXoaId] = useState<string | null>(null)
  // Mốc thời gian lúc dangXacNhanXoaId được ARM (không phải state — chỉ ĐỌC trong callback, không
  // cần kích render) — xem NGUONG_XAC_NHAN_MS ở đầu file.
  const hesXacNhanXoaLucRef = useRef(0)
  // "Xuất PNG" chuyển ra nút tròn ở màn vẽ (BoardGallery.tsx) — không còn state xuất ở lưới.
  // Mang cả OBJECT (không chỉ id) — cần đủ dữ liệu gốc để đánh dấu daXoaLuc rồi đưa thẳng cho dải
  // "Hoàn tác" mà không phải tra lại danhSach sau khi bang đã bị lọc khỏi danh sách hiển thị.
  const [dangChoXoa, setDangChoXoa] = useState<MucMeta | null>(null)
  // Bang vừa xoá mềm xong — điều khiển dải "Hoàn tác". null nghĩa là không có dải nào đang hiện.
  const [vuaXoa, setVuaXoa] = useState<MucMeta | null>(null)
  // ─── Chọn nhiều trên LƯỚI SỐNG (khác chonDaXoa — đó là chọn nhiều trong panel trash) ───────────
  // Bấm "Chọn" ở ScreenHeader bật dangChonNhieu; tap vào thẻ khi đang bật chuyển thành chọn/bỏ chọn
  // thay vì mở bảng (xem onMo đổi ở .map() bên dưới) — mượn NGUYÊN thị giác checkbox của panel trash
  // (critique 2026-09-01, P2; /impeccable shape đã xác nhận: nút "Chọn" riêng, v1 chỉ xoá hàng loạt,
  // thanh hành động ghim đáy — KHÁC drawer trash ghim trên, đúng quy ước tầm ngón cái của màn này).
  const [dangChonNhieu, setDangChonNhieu] = useState(false)
  const [chonNhieuSong, setChonNhieuSong] = useState<Set<string>>(() => new Set())
  // Xác nhận hai bước cho "Xoá (N)" hàng loạt trên lưới sống — TRƯỚC ĐÂY nút này xoá ngay ở lần
  // chạm đầu, trong khi xoá TỪNG bảng (dangXacNhanXoaId ở dưới) đã luôn đòi hai lần chạm. Bất nhất
  // đó tự nó là rủi ro: luồng xoá-đơn dạy người dùng kỳ vọng một khoảng dừng trước khi mất gì đó,
  // rồi luồng hàng loạt bỏ đúng khoảng dừng ấy ở chỗ phạm vi thiệt hại lớn nhất — một bác sĩ trực,
  // thao tác một tay, "Chọn tất cả" rồi "Xoá" là xong cả thư viện chỉ trong hai chạm vô tình
  // (critique 2026-09-02, P1). Cùng khuôn "Chắc chắn xoá?" + tự tắt sau XAC_NHAN_XOA_MS với
  // dangXacNhanXoaId/xacNhanXoaVinhVien bên dưới.
  const [xacNhanXoaNhieu, setXacNhanXoaNhieu] = useState(false)
  // Cùng lý do/ngưỡng với hesXacNhanXoaLucRef (xoá từng-bảng) — chặn double-tap xuyên thủng xác
  // nhận hàng loạt (critique 2026-09-02 lượt 3, P1).
  const hesXacNhanXoaNhieuLucRef = useRef(0)
  // Đổi lựa chọn (chọn thêm/bớt, "Chọn tất cả", bỏ chọn) GIỮA hai lần chạm huỷ luôn xác nhận đang
  // chờ — chạm "Xoá" lần hai chỉ được hiểu là đồng ý xoá ĐÚNG tập vừa xác nhận, không phải một tập
  // khác lỡ đổi sau đó.
  useEffect(() => setXacNhanXoaNhieu(false), [chonNhieuSong])
  // Cùng khuôn "chờ animation rồi mới đánh dấu xoá mềm" với dangChoXoa/vuaXoa ở trên — mảng thay vì
  // một object vì xoá NHIỀU bảng cùng lúc. TheBang đọc mảng này để biết thẻ nào đang chạy
  // .card-slide-out (xem dangXoa ở .map() bên dưới).
  const [dangChoXoaNhieu, setDangChoXoaNhieu] = useState<MucMeta[] | null>(null)
  const [vuaXoaNhieu, setVuaXoaNhieu] = useState<MucMeta[] | null>(null)
  // Dải "Hoàn tác" (vuaXoa) chỉ sống HOAN_TAC_XOA_MS rồi tắt im lặng — nếu người dùng bị gọi đi
  // giữa ca trực (đúng bối cảnh PRODUCT.md mô tả) và bỏ lỡ, bảng vẫn còn thật trong IndexedDB
  // (daXoaLuc được set) nhưng trước đây KHÔNG có đường nào lấy lại nữa — vi phạm thẳng lời hứa "xoá
  // mềm, phục hồi được". Panel này là lưới an toàn tối thiểu: không phải màn "thùng rác" đầy đủ (dọn
  // vĩnh viễn, sắp xếp theo ngày...), chỉ để mở lại được những gì vuaXoa đã bỏ lỡ.
  const [hienDaXoaGanDay, setHienDaXoaGanDay] = useState(false)
  // Panel "Đã xoá gần đây" — mặc định rút gọn còn RUT_GON_DA_XOA dòng mới nhất. "Xem tất cả" mở
  // toàn bộ + hiện ô tìm; tích chọn (checkbox) rồi khôi phục / xoá vĩnh viễn hàng loạt.
  const [xemTatCaDaXoa, setXemTatCaDaXoa] = useState(false)
  const [timDaXoa, setTimDaXoa] = useState('')
  const [chonDaXoa, setChonDaXoa] = useState<Set<string>>(() => new Set())
  // Xác nhận hai bước cho xoá VĨNH VIỄN (không hoàn tác) — cùng khuôn "Chắc chắn xoá?" + tự tắt sau
  // XAC_NHAN_XOA_MS mà nút xoá từng-bảng đã dùng.
  const [xacNhanXoaVinhVien, setXacNhanXoaVinhVien] = useState(false)
  // null = "Tất cả" (không lọc). Khởi tạo từ CHUYEN_KHOA_LOC_KEY (xem lý do ngoại lệ ở định nghĩa
  // hằng số đó) — validate lại với SPECIALTIES hiện tại phòng khi danh sách chuyên khoa đổi giữa các
  // bản build, tránh lọc "kẹt" vào một id không còn tồn tại. try/catch cùng khuôn mọi lượt đọc
  // localStorage khác trong app (Safari chặn storage/hết quota ẩn danh ném lỗi).
  const [chuyenKhoaLoc, setChuyenKhoaLoc] = useState<string | null>(() => {
    try {
      const luu = localStorage.getItem(CHUYEN_KHOA_LOC_KEY)
      return luu && SPECIALTIES.some((s) => s.id === luu) ? luu : null
    } catch {
      return null
    }
  })
  useEffect(() => {
    try {
      if (chuyenKhoaLoc) localStorage.setItem(CHUYEN_KHOA_LOC_KEY, chuyenKhoaLoc)
      else localStorage.removeItem(CHUYEN_KHOA_LOC_KEY)
    } catch {
      // Không ghi được thì lần mở tab sau quay về "Tất cả" — chấp nhận được, không chặn dùng app.
    }
  }, [chuyenKhoaLoc])
  // "Chuyên khoa ▾" mở một BẢNG CHỌN (bottom sheet ≤640px, popover neo dưới hàng chip trên PC) liệt
  // kê cả 11 khoa + số bảng mỗi khoa — THAY cho việc bung 11 chip inline vào chính dải cuộn ngang.
  // Dải bung ra là 13 mục đồng hạng, scrollWidth ~1122px trên máy 375px, "Tất cả" cuộn khuất khỏi
  // tầm mắt (critique 2026-09-01 P2 đã vá TẠM bằng fade tĩnh hai mép; critique 2026-09-03 nâng lên
  // bảng chọn thật, chủ dự án chốt hướng "nặng" 2026-09-04). Không lưu localStorage — KHÁC
  // chuyenKhoaLoc ở trên: đây là trạng thái mở/đóng của một phiên xem lưới; chip đang lọc luôn tự
  // ghim vào dải dù bảng chọn đóng (chipDangChonNgoaiVISIBLE bên dưới).
  const [moChonKhoa, setMoChonKhoa] = useState(false)
  const nutChonKhoaRef = useRef<HTMLButtonElement>(null)
  // Truy vấn ô tìm nội bộ — vẫn đúng quy ước "chỉ sống trong phiên xem lưới" của phần còn lại của
  // app (không vào URL/localStorage, KHÁC chuyenKhoaLoc ở trên): một chuỗi tìm kiếm cũ mở lại vài
  // ngày sau dễ đọc thành "sao lưới trống/lạ" hơn là hữu ích, không giống một chuyên khoa cố định.
  // Chuỗi rỗng = chưa lọc (mucKhopTimKiem trả true).
  const [truyVan, setTruyVan] = useState('')

  useEffect(() => {
    if (!dangXacNhanXoaId) return
    const id = setTimeout(() => setDangXacNhanXoaId(null), XAC_NHAN_XOA_MS)
    return () => clearTimeout(id)
  }, [dangXacNhanXoaId])

  // Cùng khuôn tự-huỷ với dangXacNhanXoaId: nếu người dùng bị gọi đi giữa lúc dải đỏ "Chắc chắn xoá
  // vĩnh viễn?" đang mở, nó tự rút lại sau XAC_NHAN_XOA_MS thay vì nằm chờ một cú bấm nhầm.
  useEffect(() => {
    if (!xacNhanXoaVinhVien) return
    const id = setTimeout(() => setXacNhanXoaVinhVien(false), XAC_NHAN_XOA_MS)
    return () => clearTimeout(id)
  }, [xacNhanXoaVinhVien])

  // Cùng khuôn tự-huỷ với xacNhanXoaVinhVien ngay trên, cho dải "Chắc chắn xoá?" của nút Xoá hàng
  // loạt (xem khai báo xacNhanXoaNhieu ở trên).
  useEffect(() => {
    if (!xacNhanXoaNhieu) return
    const id = setTimeout(() => setXacNhanXoaNhieu(false), XAC_NHAN_XOA_MS)
    return () => clearTimeout(id)
  }, [xacNhanXoaNhieu])

  // Đánh dấu XOÁ MỀM (daXoaLuc) sau khi .card-slide-out chạy xong — KHÔNG gọi idbDelete/remove()
  // nữa (trước đây xoá vĩnh viễn ngay, không hoàn tác được, ngược với lời hứa "xoá mềm" của
  // PRODUCT.md). update() vẫn ghi IndexedDB như cũ, chỉ đổi field nào được ghi.
  useEffect(() => {
    if (!dangChoXoa) return
    const bangBiXoa = dangChoXoa
    const id = setTimeout(() => {
      update({ ...bangBiXoa, daXoaLuc: Date.now() })
      setDangChoXoa(null)
      setVuaXoa(bangBiXoa)
    }, XOA_TRE_MS)
    return () => clearTimeout(id)
  }, [dangChoXoa, update])

  // Tự tắt dải "Hoàn tác" sau HOAN_TAC_XOA_MS — bang vẫn ở lại trạng thái xoá mềm sau khi dải tắt,
  // chỉ là không còn cách hoàn tác NHANH qua dải này nữa (chưa có màn "thùng rác" để hoàn tác sau).
  useEffect(() => {
    if (!vuaXoa) return
    const id = setTimeout(() => setVuaXoa(null), HOAN_TAC_XOA_MS)
    return () => clearTimeout(id)
  }, [vuaXoa])

  // Cặp effect XOÁ HÀNG LOẠT — mirror đúng cặp dangChoXoa/vuaXoa ở trên, chỉ khác thao tác trên
  // MẢNG thay vì một bảng. Giữ tách riêng (không gộp chung state) vì hai luồng có nguồn kích hoạt
  // khác nhau (nút "⋯" một thẻ so với thanh hành động chọn-nhiều) và không bao giờ chạy đồng thời
  // (checkbox thay hẳn nút "⋯" khi dangChonNhieu bật — xem TheBang), nên không có xung đột state.
  useEffect(() => {
    if (!dangChoXoaNhieu) return
    const bangBiXoa = dangChoXoaNhieu
    const id = setTimeout(() => {
      const luc = Date.now()
      for (const b of bangBiXoa) update({ ...b, daXoaLuc: luc })
      setDangChoXoaNhieu(null)
      setVuaXoaNhieu(bangBiXoa)
    }, XOA_TRE_MS)
    return () => clearTimeout(id)
  }, [dangChoXoaNhieu, update])

  useEffect(() => {
    if (!vuaXoaNhieu) return
    const id = setTimeout(() => setVuaXoaNhieu(null), HOAN_TAC_XOA_MS)
    return () => clearTimeout(id)
  }, [vuaXoaNhieu])

  // Hiệu ứng .board-out chỉ chạy MỘT LẦN khi vừa đóng một bảng (dungTuBang=true) — tự báo xong
  // sau khi animation (0,2s, xem index.css) kết thúc, cộng biên an toàn nhỏ. KHÔNG chạy khi
  // LuoiMuc mount vì lý do khác (vd lần đầu vào tab Mindmap) — dungTuBang khi đó là
  // undefined/false, effect này không làm gì.
  useEffect(() => {
    if (!dungTuBang) return
    const id = setTimeout(() => onHieuUngXong?.(), 220)
    return () => clearTimeout(id)
  }, [dungTuBang, onHieuUngXong])

  // Đóng menu "⋯"/panel "Chuyên khoa,tag" khi CHẠM/BẤM ra ngoài, hoặc bấm Escape — hai popover này
  // là <div> thường, không tự có hành vi "rời khỏi là đóng" như <input> (ô đổi tên NGAY DƯỚI, xem
  // dangSuaTenId, đã có blur-để-lưu + Escape-để-huỷ SẴN vì nó là control gốc trình duyệt). Thiếu
  // gần một năm không ai để ý vì mọi lượt kiểm/test tay của tính năng này đều làm trên iPhone, luôn
  // bấm ĐÚNG mục menu muốn chọn — không ai từng bấm RA NGOÀI để xem điều gì xảy ra. Trên PC (chuột)
  // và iPad (có trackpad qua Magic Keyboard, hoặc chỉ đơn giản chạm ra chỗ khác trên màn lớn), bấm ra
  // ngoài để đóng popover là phản xạ phổ biến nhất — thiếu nó, menu "⋯" bấm mở xong rồi bấm sang việc
  // khác sẽ ĐỨNG NGUYÊN, nổi lơ lửng đè lên thẻ khác cho tới khi tự tay bấm lại đúng "⋯" đó lần nữa
  // (phản hồi thật 2026-08-27: "chỉnh tương thích trên iPhone mà quên PC/iPad", dẫn đúng cách ô đổi
  // tên đã tương thích nhiều thiết bị để áp dụng lại ở đây).
  // `pointerdown` (không phải `mousedown`) — cùng họ Pointer Events mà .the-bang-nghieng-con-tro
  // (onPointerMove/onPointerLeave) đã dùng trong file này, bắt ĐỦ cả chuột/bút/chạm trong một API
  // duy nhất, không cần một nhánh `touchstart` riêng cho di động.
  useEffect(() => {
    if (!dangMoMenuId && !dangSuaTagId) return
    const dongNeuBenNgoai = (e: PointerEvent) => {
      const target = e.target as Element | null
      // Bấm vào chính nút "⋯"/"Chuyên khoa,tag" (mở/đóng bảng khác) hoặc vào TRONG panel đang mở
      // (một mục menu, select, ô nhập tag...) — để đúng onClick của các phần tử đó tự quyết định,
      // không chặn/giật trước.
      if (target?.closest('.mind-menu-bang, [data-testid^="menu-bang-"], [data-testid^="sua-tag-"]')) return
      setDangMoMenuId(null)
      setDangSuaTagId(null)
    }
    const dongNeuEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setDangMoMenuId(null)
      setDangSuaTagId(null)
    }
    document.addEventListener('pointerdown', dongNeuBenNgoai)
    document.addEventListener('keydown', dongNeuEscape)
    return () => {
      document.removeEventListener('pointerdown', dongNeuBenNgoai)
      document.removeEventListener('keydown', dongNeuEscape)
    }
  }, [dangMoMenuId, dangSuaTagId])

  // Đóng BẢNG CHỌN chuyên khoa ("Chuyên khoa ▾") khi bấm ra ngoài / Escape. KHÔNG gộp vào effect
  // trên: effect đó gác theo dangMoMenuId/dangSuaTagId (menu "⋯" từng thẻ), khác vòng đời hẳn. Bấm
  // vào chính nút mở (chip-chuyen-khoa-them) hoặc trong panel thì để onClick của phần tử đó tự lo.
  // Escape trả focus về đúng nút "Chuyên khoa ▾".
  useEffect(() => {
    if (!moChonKhoa) return
    const dongNeuNgoai = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (t?.closest('[data-testid="chon-khoa-panel"], [data-testid="chip-chuyen-khoa-them"]')) return
      setMoChonKhoa(false)
    }
    const dongNeuEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMoChonKhoa(false)
      nutChonKhoaRef.current?.focus()
    }
    document.addEventListener('pointerdown', dongNeuNgoai)
    document.addEventListener('keydown', dongNeuEsc)
    return () => {
      document.removeEventListener('pointerdown', dongNeuNgoai)
      document.removeEventListener('keydown', dongNeuEsc)
    }
  }, [moChonKhoa])

  // Chưa nạp xong lần đầu — hiện tiêu đề + lưới giấy giữ chỗ (KHÔNG còn `return null` để tab trống
  // trơn, critique 2026-08-28 P3). Nút "+" ở tiêu đề mờ đi tới khi có dữ liệu thật.
  if (loading)
    return (
      <div className="h-full flex flex-col">
        {/* Cùng lớp bọc cột nội dung với trạng thái lưới đầy đủ bên dưới — xem chú thích ở đó,
            gồm cả lý do cần `w-full` khi lớp bọc là con của flex column. */}
        <div className="mind-board-wrap w-full">
          <ScreenHeader title={tieuDe} />
        </div>
        <div className="scroll-ios flex-1">
          <div className="mind-board-wrap">
            <LuoiChoTai />
          </div>
        </div>
      </div>
    )

  // ĐỌC HỎNG — phải chặn TRƯỚC lưới, vì nếu để lọt xuống thì `danhSach` rỗng sẽ render trạng thái
  // rỗng "Bắt đầu một sơ đồ tư duy mới": một lời khẳng định SAI rằng người dùng chưa có bảng nào,
  // đúng vào lúc dữ liệu của họ chỉ đang không đọc được. Ca hay gặp nhất không hề hiếm — còn một
  // tab app bản cũ đang giữ IndexedDB thì openDb() rơi vào nhánh onblocked (xem idb.ts).
  // Không dùng chung dải cảnh báo nhỏ như lỗi ghi: lỗi ghi xảy ra CẠNH nội dung vẫn đang hiển thị,
  // còn lỗi đọc nghĩa là không có gì để hiển thị cả — nó phải chiếm chỗ của chính lưới bảng.
  if (loiDoc)
    return (
      <div className="h-full flex flex-col">
        {/* Cùng lớp bọc cột nội dung với trạng thái lưới đầy đủ bên dưới — xem chú thích ở đó,
            gồm cả lý do cần `w-full` khi lớp bọc là con của flex column. */}
        <div className="mind-board-wrap w-full">
          <ScreenHeader title={tieuDe} />
        </div>
        <div className="scroll-ios flex-1">
          <div className="mind-board-wrap">
            <div
              role="alert"
              data-testid="loi-doc-bang"
              className="flex flex-col items-center text-center gap-3 px-6"
              style={{ paddingTop: 48, paddingBottom: 48 }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3.6 2.7 19.2a1.2 1.2 0 0 0 1 1.8h16.6a1.2 1.2 0 0 0 1-1.8L12 3.6Z"
                  stroke="var(--c-danger-icon, #dc2626)"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path d="M12 9.6v4.2" stroke="var(--c-danger-icon, #dc2626)" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="12" cy="17" r="1.05" fill="var(--c-danger-icon, #dc2626)" />
              </svg>
              <p className="text-[15px] font-bold m-0" style={{ color: 'var(--c-text, #12142b)' }}>
                Chưa đọc được danh sách bảng
              </p>
              {/* Câu thứ hai là thông điệp từ idb.ts — nói ĐÚNG nguyên nhân và cách thoát cho từng
                  ca (đóng tab app bản cũ / trình duyệt đang chặn lưu trữ), thay vì một câu lỗi
                  chung chung. */}
              <p className="text-[13px] leading-snug m-0" style={{ color: 'var(--c-text-soft, #454870)', maxWidth: 340 }}>
                {loiDoc}
              </p>
              {/* Trấn an rõ ràng: mặc định người dùng sẽ đọc màn này thành "mất hết bảng rồi". */}
              <p className="text-[12.5px] leading-snug m-0" style={{ color: 'var(--c-text-muted, #6b6e96)', maxWidth: 340 }}>
                Các bảng của bạn vẫn nằm trên máy — app chỉ chưa mở được kho lưu trữ.
              </p>
              <button
                type="button"
                onClick={thuLaiDoc}
                data-testid="thu-lai-doc-bang"
                className="mind-btn mind-focus-ring"
                style={{
                  minHeight: 44,
                  padding: '0 20px',
                  marginTop: 4,
                  borderRadius: 9999,
                  border: 0,
                  background: 'var(--c-primary, #2d3a94)',
                  color: 'var(--c-on-bright, #ffffff)',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Thử lại
              </button>
            </div>
          </div>
        </div>
      </div>
    )

  // Bộ lọc bốn trục theo props màn (loai/danhMuc/danhMucLoaiTru/chuyenKhoa, xem locTheoProps —
  // hàm đó đã tự trừ xoá mềm). MỌI chỗ dựng lưới hiển thị dưới đây lấy từ biến này thay vì lọc lại
  // `danhSach` gốc, ĐỂ NGUYÊN hai ngoại lệ cố ý: panel "Đã xoá gần đây" (daXoaGanDay ngay dưới) và
  // `hueHienCo` trong taoBangMoi — cả hai cần đọc danhSach GỐC, xem chú thích tại từng chỗ.
  const danhSachTheoProp = locTheoProps(danhSach, { loai, danhMuc, danhMucLoaiTru, chuyenKhoa })
  // Chip chuyên khoa lọc THÊM sau đó — bang thiếu chuyenKhoa (bản ghi cũ chưa backfill, xem
  // mucMeta.ts) coi như thuộc chuyên khoa đầu tiên trong SPECIALTIES. Đây là bộ lọc PHIÊN của
  // riêng tab Mindmap (chip/ô tìm), khác `chuyenKhoa` ở trên (prop cấu hình theo MÀN).
  // Ô tìm lọc THÊM lần nữa (giao của cả hai, không phải hoặc): mucKhopTimKiem gộp tên/chuyên
  // khoa/tag/nội dung trích được và bỏ dấu hai phía (xem mucMeta.ts), truy vấn rỗng luôn khớp.
  const danhSachSapXep = danhSachTheoProp
    .filter((b) => !chuyenKhoaLoc || (b.chuyenKhoa ?? SPECIALTIES[0].id) === chuyenKhoaLoc)
    .filter((b) => mucKhopTimKiem(b, truyVan))
    .sort((a, b) => b.capNhatLuc - a.capNhatLuc)
  // Xoá gần đây nhất lên đầu — người mở panel này thường đang tìm đúng bảng vừa lỡ tay bấm Hoàn tác.
  // NGOẠI LỆ CỐ Ý (KHÔNG đổi): đọc thẳng `danhSach` gốc, không qua locTheoProps/danhSachTheoProp —
  // panel này phải liệt kê đúng những mục `daXoaLuc` có giá trị, bất kể mục đó thuộc loại/danh mục
  // nào của màn hiện tại.
  const daXoaGanDay = danhSach.filter((b) => b.daXoaLuc).sort((a, b) => (b.daXoaLuc ?? 0) - (a.daXoaLuc ?? 0))
  // Lưới rỗng vì BỘ LỌC hoàn toàn khác lưới rỗng vì chưa có bảng nào: mời "Bắt đầu một sơ đồ tư duy
  // mới" trong tình huống này vừa sai sự thật (bảng vẫn còn nguyên, chỉ đang bị lọc khuất) vừa đẩy
  // người dùng đi tạo một bảng thừa thay vì sửa truy vấn/tắt chip lọc (review cuối nhánh, mục 7).
  const rongDoBoLoc =
    danhSachSapXep.length === 0 &&
    (truyVan.trim().length > 0 || chuyenKhoaLoc !== null) &&
    danhSachTheoProp.length > 0

  // Lưới GẦN-trống (1-3 bảng thật, xem lời mời phía dưới .mind-board-grid): với chỉ vài thẻ, lưới
  // 2-4 cột chỉ lấp một hàng trên cùng, để lại phần lớn màn hình dưới nếp gấp là khoảng trắng chết —
  // đọc như một dashboard chưa xong hơn là "phòng não phải" đáng ở lại hàng giờ mà hiến chương
  // Mindmap mô tả (critique 2026-09-02, P3). KHÔNG lấp bằng nền có hoạ tiết bàn/vải (đã thử 2026-08-
  // 28, chủ dự án gỡ lại — tờ giấy tự mang trọng lượng vật liệu, nền lưới giữ nguyên --c-surface
  // phẳng) và KHÔNG lấp bằng thẻ giả/ô trống cùng cỡ (nested/decoy card là phản ví dụ). Thay vào đó
  // một dòng chữ mờ, MỘT câu, đặt Ý NGHĨA vào khoảng trắng thay vì lấp nó bằng hoạ tiết — chỉ hiện
  // khi lưới đang cho xem ĐÚNG toàn bộ thư viện thật (không lọc/tìm, không phải một tập con ngẫu
  // nhiên trông mỏng), nên "mới bắt đầu" luôn đúng sự thật khi nó hiện ra.
  const dangXemDayDuKhongLoc = !chuyenKhoaLoc && truyVan.trim().length === 0
  const tongSoBangConLai = danhSachTheoProp.length
  const ganTrong = dangXemDayDuKhongLoc && tongSoBangConLai > 0 && tongSoBangConLai <= 3

  // Bỏ xoá mềm cho một bảng (cả hai nút "Hoàn tác": dải toast và panel "Đã xoá gần đây").
  // "Hoàn tác" là đường phục hồi CUỐI CÙNG nên nó phải chịu ĐÚNG lớp lỗi mà taoBangMoi/
  // onDoiChuyenKhoa/onLuuTen/onXoaTag đã vá: bảng được ghi lại thật trong IndexedDB nhưng không
  // khớp chip lọc/ô tìm đang bật nên vẫn vô hình trong lưới — người dùng thấy nút "Hoàn tác" như
  // bấm hụt, không có gì xảy ra (review cuối nhánh, mục 2). Cùng cách vá với các callback kia: đưa
  // bộ lọc khiến bảng vừa thao tác rớt khỏi lưới về trạng thái không lọc.
  const khoiPhucBang = (b: MucMeta) => {
    const bangMoi = { ...b, daXoaLuc: undefined }
    update(bangMoi)
    // So cùng biểu thức với bộ lọc của lưới ở trên (bảng thiếu chuyenKhoa coi như SPECIALTIES[0]).
    if (chuyenKhoaLoc && (bangMoi.chuyenKhoa ?? SPECIALTIES[0].id) !== chuyenKhoaLoc) setChuyenKhoaLoc(null)
    // Ô tìm là bộ lọc THỨ HAI, rớt khỏi nó cũng giấu thẻ y hệt — phải canh riêng. Truy vấn rỗng
    // luôn khớp nên nhánh này tự im lặng khi chưa lọc gì.
    if (!mucKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
  }

  // ─── Thao tác hàng loạt trong panel "Đã xoá gần đây" (kiểu Recycle Bin) ───────────────────────
  // Nhận id (không phải object) vì checkbox chỉ giữ id; lọc lại theo daXoaLuc để bỏ qua id đã rớt
  // trạng thái giữa lúc chọn (vd người dùng bấm "Hoàn tác" một dòng trong khi vẫn còn tích dòng khác).
  const bangDaXoaTheoId = (ids: Iterable<string>) => {
    const tap = new Set(ids)
    return danhSach.filter((b) => b.daXoaLuc && tap.has(b.id))
  }
  const khoiPhucNhieu = (ids: Iterable<string>) => {
    for (const b of bangDaXoaTheoId(ids)) update({ ...b, daXoaLuc: undefined })
    setChonDaXoa(new Set())
    setXacNhanXoaVinhVien(false)
  }
  const xoaVinhVienNhieu = (ids: Iterable<string>) => {
    const bang = bangDaXoaTheoId(ids)
    for (const b of bang) remove(b.id)
    // META và NỘI DUNG nằm ở HAI kho khác nhau: `remove` chỉ xoá META (`drtrong-ecg`/`boards`), còn
    // toàn bộ nét vẽ + thẻ ghi chú nằm ở `drtrong-board`/`collection` do BlockSuite ghi và KHÔNG ai
    // xoá. Không có dòng dưới đây thì "xoá vĩnh viễn" chỉ làm bảng biến mất khỏi lưới trong khi dung
    // lượng không giảm một byte (đo 2026-08-31: xoá hết 4 bảng, store vẫn còn nguyên 5 bản ghi).
    // Không `await`: người dùng không phải chờ một lượt dọn kho để thấy lưới cập nhật, và hàm này tự
    // nuốt lỗi + cảnh báo.
    // Dọn nội dung TRƯỚC, gom rác ảnh SAU — bắt buộc theo thứ tự này: chừng nào doc của bảng vừa
    // xoá còn trong kho thì chính nó vẫn tham chiếu ảnh của nó, và lượt gom rác sẽ không thấy blob
    // nào mồ côi. Ảnh nằm ở hai DB riêng, đánh khoá theo băm nội dung chứ không theo id bảng.
    void xoaNoiDungBang(bang.map((b) => b.id)).then(() => donRacBlobBang())
    setChonDaXoa(new Set())
    setXacNhanXoaVinhVien(false)
  }
  const chuyenChon = (id: string) =>
    setChonDaXoa((truoc) => {
      const sau = new Set(truoc)
      if (sau.has(id)) sau.delete(id)
      else sau.add(id)
      // Rời khỏi trạng thái chọn thì dải xác nhận đỏ (nếu đang mở) không còn ngữ cảnh — rút lại.
      if (sau.size === 0) setXacNhanXoaVinhVien(false)
      return sau
    })

  // ─── Chọn nhiều trên LƯỚI SỐNG (khác chuyenChon/chonDaXoa ở trên — đó là panel trash) ──────────
  const chuyenChonNhieuSong = (id: string) =>
    setChonNhieuSong((truoc) => {
      const sau = new Set(truoc)
      if (sau.has(id)) sau.delete(id)
      else sau.add(id)
      return sau
    })
  // Thoát chế độ chọn — dùng cả khi bấm "Huỷ" lẫn sau khi xoá xong, để lưới luôn quay về trạng thái
  // bình thường (thẻ mở lại được bằng tap, "⋯" hoạt động trở lại) mà không cần nhớ dọn riêng từng cờ.
  const thoatChonNhieu = () => {
    setDangChonNhieu(false)
    setChonNhieuSong(new Set())
    setXacNhanXoaNhieu(false)
  }
  const xoaNhieuSong = () => {
    const bang = danhSachSapXep.filter((b) => chonNhieuSong.has(b.id))
    if (bang.length === 0) return
    // Cùng cơ chế "chờ .card-slide-out rồi mới đánh dấu xoá mềm thật" với xoá từng-thẻ (setDangChoXoa)
    // — xem effect dangChoXoaNhieu. Thoát chế độ chọn NGAY (thanh hành động biến mất tức thì); thẻ tự
    // chạy animation xoá độc lập nhờ dangXoa đọc dangChoXoaNhieu ở .map() bên dưới, không phụ thuộc
    // dangChonNhieu/chonNhieuSong nữa.
    setDangChoXoaNhieu(bang)
    thoatChonNhieu()
  }

  // Cú mousedown thứ hai của một double-click THẬT (e.detail>1) mặc định cướp focus từ ô đổi tên
  // đang mở của bảng vừa tạo, kích hoạt onBlur lưu-và-đóng ô đó TRƯỚC KHI click#2 (đã bị chặn trong
  // taoBangMoi ngay dưới) kịp chạy — đúng "CỬA SỔ THỨ HAI" mô tả tại taoBangMoi: khoá `detail>1` ở
  // đó chỉ chặn được việc TẠO bảng thứ hai, không chặn được cú cướp focus này (đo trực tiếp, critique
  // 2026-09-03 lượt 4, P2 — double-tap không nhân bản dữ liệu nữa nhưng vẫn để lại bảng mồ côi tên).
  // preventDefault ở mousedown giữ nguyên focus hiện tại (kỹ thuật chuẩn để giữ focus/selection khi
  // bấm một nút ngoài input) — CHỈ áp khi e.detail>1, không áp cho một cú bấm đơn kế tiếp thật sự (vd
  // bấm "+" lần nữa để bỏ dở tên bảng trước rồi tạo bảng mới) — flow đó vẫn cần blur bình thường.
  const giuFocusKhiBamDup = (e: React.MouseEvent) => {
    if (e.detail > 1) e.preventDefault()
  }

  const taoBangMoi = (e?: { detail?: number }) => {
    // Khoá chống bấm đúp: `add()` đồng bộ và không có cờ "đang tạo" riêng, nên hai lượt gọi liên
    // tiếp (bấm đúp nhanh, hoặc double-fire trên một số trình duyệt cảm ứng) từng tạo được HAI bảng
    // — `setDangSuaTenId` lần gọi thứ hai thắng, bảng đầu tiên vào lưới với tên mặc định mà không
    // có ô đổi tên nào tự mở, dễ mồ côi lúc vội (critique 2026-09-01, P3). Ý tưởng vẫn thế: còn một
    // bảng đang ở chế độ đổi tên thì "+" tạm không phản ứng — đúng luồng dự kiến (đặt tên xong bảng
    // này rồi mới tạo bảng kế) chứ không phải hạn chế mới.
    //
    // ĐỌC REF, KHÔNG ĐỌC STATE (sửa 2026-09-03). Bản đầu khoá bằng `if (dangSuaTenId) return` — một
    // state React, tức chỉ đổi ở lượt render SAU. Cú click thứ hai của một lần bấm đúp chạy trước
    // lượt render đó nên vẫn đọc `null` trong closure và lọt thẳng qua khoá: khoá KHÔNG hề chặn
    // được đúng cái nó sinh ra để chặn. Đo trên trình duyệt thật 2026-09-02: một lần bấm đúp vào
    // "+" đưa số bảng từ 10 lên 12, và 9 bảng rác của phiên đó có hai cặp sinh trong CÙNG MỘT GIÂY.
    // Ref được gán NGAY dưới đây nên cú click thứ hai thấy liền; effect ở dưới trả nó về null khi ô
    // đổi tên đóng lại.
    // CỬA SỔ THỨ HAI, và là cửa sổ thật sự lọt trên trình duyệt. Khoá ref ở trên chỉ đóng được
    // trường hợp "hai click, không lượt render nào xen giữa". Bấm đúp THẬT đi đường khác — nhật ký
    // sự kiện đo được 2026-09-03 khi khoá ref ĐÃ có:
    //     mousedown#2 (detail 2) → focusout trên ô đổi tên của bảng vừa tạo → click#2 (detail 2)
    // tức `onBlur` của ô đổi tên (dòng ~600 → onLuuTen → setDangSuaTenId(null)) MỞ khoá ra đúng
    // trước khi handler click thứ hai chạy. Không khoá nào dựa trên "đang có ô đổi tên mở" sống nổi
    // qua chuỗi đó, vì chính cú click thứ hai đóng ô đó lại.
    //
    // `detail` là số lần click liên tiếp của chuỗi hiện tại: cú thứ hai của một lần bấm đúp mang 2.
    // Bàn phím (Enter/Space trên <button>) và `.click()` lập trình đều cho 0 nên không bị chặn — hai
    // đường đó vẫn do khoá ref bên dưới trông.
    if ((e?.detail ?? 0) > 1) return
    if (dangSuaTenRef.current) return
    // Màn đã lọc sẵn theo một danh mục (thẻ Trang chủ) thì không hỏi lại — người dùng vừa đứng
    // trong đúng danh mục đó.
    if (danhMuc) {
      taoMucVoiDanhMuc(loaiTaoDuoc[0], danhMuc)
      return
    }
    setDangChonDanhMuc(loaiTaoDuoc[0])
  }

  // Phần TẠO BẢN GHI thật của taoBangMoi (xem chú thích khoá chống bấm đúp ở đó) — tách ra vì giờ có
  // HAI đường tới đây: bấm "+" khi màn đã lọc sẵn một danh mục (gọi thẳng), hoặc bấm "+" khi màn
  // KHÔNG lọc (đợi người dùng chọn qua ChonDanhMuc rồi mới gọi, xem `dangChonDanhMuc` bên dưới).
  // `loaiMuc`/`danhMucChon` truyền tay thay vì đọc `loaiTaoDuoc[0]`/`danhMuc` từ closure vì đường
  // thứ hai không có cả hai giá trị đó sẵn trong prop — chúng đến từ lựa chọn thật của người dùng.
  const taoMucVoiDanhMuc = (loaiMuc: LoaiMuc, danhMucChon: IdDanhMuc) => {
    // Khoá chống bấm đúp — CÙNG lớp lỗi đã vá cho nút "+" ở taoBangMoi (đọc chú thích dài ở đó),
    // nay lặp lại ở đường thứ hai: nút danh mục trong ChonDanhMuc không mang khoá `e.detail>1`
    // (component đó chỉ được phép import React + ./mucMeta — không thêm logic khoá), và `onChon`
    // gọi `setDangChonDanhMuc(null)` là một state React (chỉ có tác dụng ở lượt render SAU) trước
    // khi gọi ĐỒNG BỘ hàm này. Hai cú click trúng nút danh mục trước khi React kịp gỡ lớp phủ
    // (double-fire trên một số trình duyệt cảm ứng — xem taoBangMoi) sẽ chạy trọn hàm này hai lần
    // nếu không có khoá: `taoIdMuc()` sinh hai id khác nhau, `add()` ghi hai bản ghi cho một cú
    // bấm. `dangSuaTenRef` là ref — cập nhật NGAY (không đợi render) — nên cú gọi thứ hai đọc được
    // giá trị 'dang-tao' mà cú gọi đầu vừa gán và thoát sớm ở đây, trước khi tới `add()`.
    if (dangSuaTenRef.current) return
    dangSuaTenRef.current = 'dang-tao'
    const luc = Date.now()
    // Tính TRƯỚC lúc tạo bản ghi — mauHueChongTrung cần biết hue các bảng ĐANG SỐNG (bỏ qua xoá
    // mềm, đúng như mọi chỗ lọc lưới khác trong file) để chọn mốc xa nhất, không phải hue của MỌI
    // bản ghi từng có kể cả đã xoá (critique 2026-09-02 lượt 3, P2).
    const hueHienCo = danhSach.filter((b) => !b.daXoaLuc).map((b) => b.mauHue ?? mauOnDinh(b.id))
    const meta: MucMeta = {
      id: taoIdMuc(),
      loai: loaiMuc,
      danhMuc: danhMucChon,
      ten: TEN_MAC_DINH,
      taoLuc: luc,
      capNhatLuc: luc,
      mauHue: mauHueChongTrung(hueHienCo),
      // Bảng mới bắt đầu ở trạng thái CHƯA GẮN chuyên khoa ('' — không phải SPECIALTIES[0].id như
      // trước). Bảng là "tài sản dài hạn hàng tháng/năm" (xem chú thích CHUYEN_KHOA_LOC_KEY), ép nó
      // vào chuyên khoa đầu tiên trong danh sách trước khi người dùng chọn là một lời nói dối lặng
      // lẽ: aria-label, chip lọc, và panel "Đã xoá gần đây" đều đọc thẳng giá trị này, nên MỌI bảng
      // mới (kể cả bảng hành chính/liên chuyên khoa) từng bị tính nhầm vào "Tim mạch" cho tới khi ai
      // đó nhớ mở menu sửa lại — làm nhãn chuyên khoa mất độ tin cậy khi liếc nhanh (critique
      // 2026-09-02, P2). '' KHÔNG kích hoạt fallback `?? SPECIALTIES[0].id` ở mọi nơi đọc trường này
      // (nullish coalescing chỉ bắt null/undefined, không bắt chuỗi rỗng) — fallback đó vẫn đúng
      // nguyên cho bảng CŨ thật sự thiếu hẳn trường (dữ liệu tạo trước lượt thêm 3 trường bắt buộc,
      // xem mucMeta.ts). TheTrong/iconBangSoDo/VeChuyenKhoaDangTai đã sẵn nhánh trung tính cho
      // khoa lạ/rỗng — không cần sửa gì ở đó.
      chuyenKhoa: '',
      tags: [],
      noiDungTimKiem: '',
    }
    add(meta)
    // Trước đây mở thẳng vào canvas (onMoBang) — ba bảng tạo liên tiếp đều dừng lại ở tên mặc định
    // "Bảng chưa đặt tên" và ảnh xem trước GIỐNG HỆT NHAU byte-cho-byte (canvas trống chụp y hệt),
    // không cách nào phân biệt trong lưới. Giữ người dùng lại ở danh sách, mở luôn ô đổi tên cho thẻ
    // vừa tạo — họ đặt tên trước rồi mới bấm vào để vẽ, đúng lúc còn nhớ đang tạo bảng cho việc gì.
    dangSuaTenRef.current = meta.id
    setDangSuaTenId(meta.id)
    // Bảng mới chưa gắn chuyên khoa nào ('' — xem trên) — nếu chip lọc đang chọn MỘT chuyên khoa cụ
    // thể, thẻ vừa tạo sẽ không khớp bộ lọc đó và biến mất khỏi lưới ngay khi vừa ghi xong (bấm "+"
    // trông như không phản ứng gì, trong khi một bản ghi mồ côi đã lặng lẽ vào IndexedDB — review
    // lượt 1 phát hiện). Đưa bộ lọc về "Tất cả" ngay khi tạo để thẻ mới chắc chắn hiện ra.
    setChuyenKhoaLoc(null)
    // Ô tìm gây ĐÚNG lớp lỗi đó một lần nữa, còn dễ vấp hơn chip lọc: tên bảng mới luôn là "Bảng
    // chưa đặt tên", nên bất kỳ truy vấn nào đang gõ dở (trừ chuỗi khớp đúng tên mặc định) đều loại
    // thẻ vừa tạo khỏi lưới ngay lượt render kế tiếp. Xoá trắng truy vấn cùng lúc với chip lọc.
    setTruyVan('')
  }

  return (
    <>
    {/* `screen-transition` (index.css: fadeSlideIn) — CÙNG hiệu ứng vào màn với "Hướng dẫn"/"Thẻ ghi
        nhớ" (ComingSoonScreen) và mọi màn khác trong app. Trước đây tab Mindmap là màn DUY NHẤT
        thiếu nó, nên bấm nav "Mindmap" hiện ra khô khốc, lệch nhịp với các tab kề bên (phản hồi chủ
        dự án 2026-08-28). Chỉ chạy khi vào từ tab khác — lượt quay lại từ một bảng đang mở
        (`dungTuBang`) đã có `.board-out` riêng ở vùng cuộn bên dưới, chồng hai hiệu ứng là thừa. */}
    <div className={`h-full flex flex-col${dungTuBang ? '' : ' screen-transition'}`}>
      {/* Tiêu đề màn nằm TRONG cùng cột nội dung với ô tìm/dải chip/lưới (.mind-board-wrap, trần
          1040px căn giữa). ScreenHeader vốn trải full-bleed, nên trên PC 1280 nó đứng ở x=20 trong
          khi cả phần còn lại của màn bắt đầu ở x=140 — lệch 120px, đo trên trang thật 2026-08-30:
          tiêu đề trôi hẳn ra ngoài, không thuộc về khối nào bên dưới nó.
          Bọc tại CHỖ GỌI, không sửa ScreenHeader: component đó dùng chung cho mọi màn, phần lớn
          không có cột giới hạn bề ngang. Trên điện thoại lớp bọc rộng bằng màn nên không đổi gì. */}
      {/* `w-full`: lớp bọc này là con của một flex COLUMN, khác với lượt dùng .mind-board-wrap bên
          trong vùng cuộn (khối thường). Với flex item, `margin: 0 auto` tự co phần tử về bề rộng nội
          dung thay vì trải rồi căn giữa — đo được 162px và tiêu đề nhảy sang x=579. width:100% trả
          lại đúng hành vi "trải hết rồi kẹp ở 1040px". */}
      <div className="mind-board-wrap w-full">
        <ScreenHeader
          title={tieuDe}
          // Lối vào tường minh cho chọn-nhiều trên lưới sống (khác nhấn-giữ/"⋯" của từng thẻ) —
          // /impeccable shape 2026-09-01 đã xác nhận hướng này thay vì mượn nhấn-giữ (nhấn-giữ vẫn
          // vô hình qua 3 lượt critique, không nên chồng thêm một chức năng ẩn nữa lên nó). Ẩn khi
          // lưới trống thật (không có gì để chọn) — vẫn hiện nếu đang bật dở (dangChonNhieu) để
          // luôn có đường "Huỷ", kể cả khi bộ lọc vừa đổi làm lưới hiện tại trống.
          actions={
            danhSachSapXep.length > 0 || dangChonNhieu ? (
              <button
                type="button"
                data-testid="chon-nhieu-song-toggle"
                onClick={() => {
                  if (!dangChonNhieu) {
                    // Trước bản vá này, bật chọn-nhiều trong khi một ô đổi tên đang mở (autoFocus
                    // sau khi bấm "+") để lại CẢ HAI affordance chỉnh sửa cùng hiện trên một thẻ:
                    // checkbox (nhánh `chonNhieu &&`) và ô nhập tên (nhánh `dangSuaTen &&`) là hai
                    // điều kiện render ĐỘC LẬP, không cái nào biết tới cái kia (critique 2026-09-03
                    // lượt 6, P3). Blur() phần tử đang focus (nếu đúng là ô đổi tên) chạy lại CHÍNH
                    // luồng lưu đã có sẵn (`onBlur` → `onLuuTen(tenCanLuu())`) thay vì âm thầm bỏ
                    // qua/mất chữ đang gõ dở — không cần lift state `tenNhap` lên đây.
                    ;(document.activeElement as HTMLElement | null)?.blur?.()
                  }
                  dangChonNhieu ? thoatChonNhieu() : setDangChonNhieu(true)
                }}
                aria-pressed={dangChonNhieu}
                className="mind-focus-ring"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: 36,
                  padding: '0 14px',
                  borderRadius: 9999,
                  border: '1px solid var(--c-line, #d9ddf4)',
                  background: dangChonNhieu ? 'var(--c-primary, #2d3a94)' : 'none',
                  color: dangChonNhieu ? 'var(--c-on-bright, #fff)' : 'var(--c-text-muted, #6b6e96)',
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {dangChonNhieu ? 'Huỷ' : 'Chọn'}
              </button>
            ) : undefined
          }
        />
      </div>
      <div className={`scroll-ios flex-1${dungTuBang ? ' board-out' : ''}`}>
      {/* .mind-board-wrap (index.css) — bọc toàn bộ nội dung trong một cột co giãn tối đa, CĂN GIỮA.
          Trần nới từ 720px lên 1040px (2026-08-28, phản hồi thật: "không gian bảng bị ép hẹp hai
          bên") — 720px từng đúng khi lưới thẻ dùng minmax(110px,140px) cố định (4 cột thẻ ~140px
          vừa lấp đủ 720px), nhưng .mind-board-grid giờ dùng cột 1fr co GIÃN theo bề ngang khung chứa
          (xem index.css), nên trần hẹp cũ ép luôn cả 4 thẻ dừng ở ~140px trên PC/iPad rộng thay vì
          được lớn lên cùng khung — đúng triệu chứng người dùng báo. 1040px cho thẻ ~240px ở PC/iPad
          rộng (lớn hơn hẳn 140px cũ) mà vẫn có trần, không phình vô hạn trên màn siêu rộng. KHÔNG
          ảnh hưởng màn hẹp (điện thoại) — max-width chỉ có tác dụng khi khung cha rộng hơn nó. */}
      {/* .mind-board-wrap-trong CHỈ khi lưới rỗng — biến khung thành cột flex cao tối thiểu 100% để
          khối rỗng bên dưới (flex: 1) căn giữa trong đúng phần chiều cao còn lại. Xem chú thích tại
          lớp đó (index.css) về lý do không sửa thẳng .mind-board-wrap. */}
      <div className={`mind-board-wrap${danhSachSapXep.length === 0 ? ' mind-board-wrap-trong' : ''}`}>
      {/* Ô tìm đứng TRƯỚC "Đã xoá gần đây" — công cụ tìm chính phải nằm trên affordance phục hồi
          hiếm dùng (critique 2026-08-28: recovery-panel nằm trên ô tìm). Cổng hiện/ẩn gắn vào
          danhSach GỐC (chỉ trừ bang xoá mềm), KHÔNG phải danh sách đã lọc — gõ tới ký tự không khớp
          bảng nào mà unmount chính ô đang gõ thì mất focus giữa chừng, không xoá bớt để quay lại được. */}
      {/* Lề ngang 20px = ĐÚNG lề của ScreenHeader (`px-5`) ngay trên và của mọi tiêu đề mục ở Trang
          chủ — đo trên trang thật 2026-08-30: tiêu đề màn đứng ở x=20 còn cả cụm này trước đây ở
          x=16, một bậc lệch 4px chạy suốt chiều cao màn. Cả màn giờ dùng MỘT mép trái.
          Đáy 4px → 10px: đo được ô tìm cách tiêu đề 29px nhưng chỉ cách dải chip 4px — nhịp NGƯỢC,
          dải chip đọc thành dính vào đáy ô tìm thay vì là mục kế tiếp cùng nhóm (phản hồi chủ dự án:
          "căn chỉnh quá sát, nhìn đang ở không gian chật hẹp"). 10px đủ tách hai hàng mà vẫn giữ
          chúng trong cùng một cụm "thu hẹp danh sách", vẫn nhỏ hơn hẳn khoảng hở tới lưới bên dưới.
          Đỉnh 12px → 4px (2026-08-31, phản hồi thật: "thanh tìm kiếm ở vị trí quá thấp", cụ thể hoá
          qua hỏi lại: "khoảng cách title→ô tìm quá rộng"). ScreenHeader NGAY TRÊN đã tự mang `pb-3`
          (12px) của chính nó — cộng thêm 12px nữa ở đây ra 29px đo được, gần gấp ba khoảng 10px
          xuống dải chip ngay dưới, kéo cụm "tiêu đề → ô tìm" rời khỏi nhóm "thu hẹp danh sách" mà nó
          thuộc về. 4px đủ để hai viền không dính nhau mà không lặp lại đúng khoảng đệm ScreenHeader
          vừa cấp — gap còn lại đo được ~21px, dưới hẳn 29px cũ, vẫn trên hẳn 10px xuống dải chip. */}
      {danhSachTheoProp.length > 0 && (
        <div style={{ padding: '4px 20px 10px' }}>
          {/* CÙNG khuôn "pill" với ô tìm toàn app (HomeScreen / SearchScreen): nền --c-line-soft, bo
              2xl, icon kính lúp bên trái, nút × xoá nhanh khi có chữ. Trước đây là ô viền mảnh nền
              --c-surface, không khớp phần còn lại của app (phản hồi chủ dự án 2026-08-28) — chỉ đổi
              lớp vỏ, logic lọc (truyVan/setTruyVan) giữ nguyên. `.mind-search-pill` (index.css) lo
              vòng focus "ôm sát" dùng chung nên bỏ .mind-focus-ring khỏi input. KHÔNG đặt fontSize:
              index.css có `input,select,textarea{font-size:16px !important}` (chặn iOS Safari tự
              zoom) — mọi giá trị đặt ở đây đều bị nuốt. */}
          <div
            className="mind-search-pill flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: 'var(--c-line-soft, #eef0f8)', minHeight: 44 }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
              style={{ width: 20, height: 20, flexShrink: 0, color: 'var(--c-text-muted, #6b6e96)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              data-testid="tim-kiem-bang"
              value={truyVan}
              onChange={(e) => setTruyVan(e.target.value)}
              placeholder="Tìm bảng theo tên, tag, nội dung..."
              aria-label="Tìm kiếm bảng"
              className="flex-1"
              style={{ minWidth: 0, border: 0, background: 'transparent', color: 'var(--c-text, #12142b)' }}
            />
            {truyVan && (
              <button
                type="button"
                onClick={() => setTruyVan('')}
                aria-label="Xoá tìm kiếm"
                className="mind-focus-ring"
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  border: 0,
                  background: 'none',
                  padding: 2,
                  color: 'var(--c-text-muted, #6b6e96)',
                }}
              >
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style={{ width: 16, height: 16 }}>
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      {/* Dải chip chuyên khoa — cùng cổng `danhSachTheoProp > 0` với ô tìm ở trên (gắn vào danh sách
          đã lọc thì gõ ký tự không khớp sẽ unmount chính control đang thao tác). */}
      {danhSachTheoProp.length > 0 && (() => {
        // Số bảng mỗi khoa — TÍNH ĐÚNG như bộ lọc thật ở `danhSachSapXep` (`.filter` gộp bảng chưa
        // gắn khoa vào SPECIALTIES[0]), nên badge số khớp đúng thứ người dùng thấy sau khi bấm.
        // Đếm trên `danhSachTheoProp` (đã qua bốn trục props của màn), KHÔNG phải `danhSach` gốc —
        // nếu không, một màn lọc `loai: 'so-do'` sẽ đếm nhầm cả bài viết vào badge chuyên khoa.
        const demTheoKhoa = new Map<string, number>()
        for (const b of danhSachTheoProp) {
          const k = b.chuyenKhoa ?? SPECIALTIES[0].id
          demTheoKhoa.set(k, (demTheoKhoa.get(k) ?? 0) + 1)
        }
        const tongBang = danhSachTheoProp.length

        // Chip nào được lên dải: 3 khoa CÓ NHIỀU BẢNG NHẤT của chính người dùng này. Trước đây là
        // `SPECIALTIES.slice(0, 2)` — tức Tim mạch + Hô hấp, được chọn vì chúng đứng đầu MẢNG DỮ
        // LIỆU, không vì thư viện của người dùng có gì trong đó. Với một thư viện trải đều 10 khoa
        // (dựng thử 2026-09-04), dải quảng bá đúng hai khoa ngẫu nhiên và giấu tám khoa còn lại,
        // trong đó có thể là khoa người dùng dùng suốt ca trực. Lối tắt phải phản ánh thói quen
        // thật; khoa KHÔNG có bảng nào thì không bao giờ chiếm một chip.
        // Sắp xếp ổn định: số bảng giảm dần, hoà thì theo đúng thứ tự SPECIALTIES (không phải thứ tự
        // ngẫu nhiên của Map) — nếu không, mỗi lần thêm/xoá một bảng dải chip lại nhảy chỗ.
        const VISIBLE = 3
        const thuTuGoc = new Map(SPECIALTIES.map((kh, i) => [kh.id, i]))
        const khoaCoBang = SPECIALTIES.filter((kh) => (demTheoKhoa.get(kh.id) ?? 0) > 0).sort(
          (a, b) =>
            (demTheoKhoa.get(b.id) ?? 0) - (demTheoKhoa.get(a.id) ?? 0) ||
            (thuTuGoc.get(a.id) ?? 0) - (thuTuGoc.get(b.id) ?? 0),
        )
        const chipHien = khoaCoBang.slice(0, VISIBLE)
        const chipAn = SPECIALTIES.filter((kh) => !chipHien.some((c) => c.id === kh.id))
        // Chip ĐANG lọc mà không nằm trong 3 chip trên vẫn được ghim riêng vào dải — người dùng phải
        // thấy vì sao lưới đang bị lọc, kể cả khi họ chọn một khoa hiếm từ bảng chọn.
        const chipDangChonNgoaiVISIBLE = chipAn.filter((kh) => kh.id === chuyenKhoaLoc)
        // Số khoa CÒN LẠI thật sự có bảng — vừa là nhãn số trên nút mở bảng chọn, vừa là cổng ẩn/hiện
        // chính nút đó (xem chú thích tại nút).
        const conKhoaKhac = chipAn.filter((kh) => (demTheoKhoa.get(kh.id) ?? 0) > 0).length
        // Màu khoa đã nâng sáng cho nền tối — xem chú thích --c-khoa-nang (index.css). Ở bản sáng
        // --c-khoa-nang là 0% nên color-mix trả về đúng màu gốc, không lệch một chút nào.
        const mauKhoa = (hex: string) => `color-mix(in oklab, ${hex}, var(--c-khoa-nang-toi, #fff) var(--c-khoa-nang, 0%))`
        const chamKhoa = (hex: string, size: number) => (
          <span
            aria-hidden="true"
            style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: mauKhoa(hex) }}
          />
        )
        const hangChon = (dangChon: boolean): React.CSSProperties => ({
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          minHeight: 40,
          padding: '0 10px',
          textAlign: 'left',
          border: 0,
          borderRadius: 8,
          background: dangChon ? 'var(--c-primary-soft, #eceefa)' : 'none',
          color: 'var(--c-text, #12142b)',
          fontSize: 13,
          fontWeight: 600,
        })
        // Dấu tích ở MÉP PHẢI hàng đang chọn. Trước đây trạng thái "đang lọc khoa này" chỉ được báo
        // bằng một mảng nền --c-primary-soft rất nhạt (đo được ~1,1:1 so với nền bảng chọn ở bản
        // tối) — tức gần như CHỈ bằng màu, và bằng một sắc màu yếu. Dấu tích là tín hiệu thứ hai,
        // không phụ thuộc màu, và nó lấp đúng khoảng trống mép phải mà badge số vừa nhường lại.
        const dauTich = (
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" focusable="false" style={{ flexShrink: 0, color: 'var(--c-primary, #2d3a94)' }}>
            <path d="M2.6 7.4 5.6 10.4 11.4 4.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
        // Khuôn chung cho MỌI chip trên dải (Tất cả / khoa / nút mở bảng chọn) — một khuôn duy nhất
        // để hàng không còn ba kiểu viền khác nhau trong bốn nút như trước (đặc/viền liền/viền ĐỨT).
        const khuonChip: React.CSSProperties = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          minHeight: 40,
          fontSize: 12,
          fontWeight: 600,
          padding: '6px 12px',
          borderRadius: 999,
          border: '1px solid var(--c-line, #d9ddf4)',
        }
        const veChip = (kh: (typeof SPECIALTIES)[number]) => {
          const dangChon = chuyenKhoaLoc === kh.id
          return (
            <button
              key={kh.id}
              type="button"
              data-testid={`chip-chuyen-khoa-${kh.id}`}
              onClick={() => setChuyenKhoaLoc(kh.id)}
              aria-pressed={dangChon}
              className="mind-focus-ring"
              style={{
                ...khuonChip,
                background: dangChon ? kh.color : 'none',
                // chuTrenNen(kh.color), KHÔNG var(--c-on-bright) — xem comment tại định nghĩa hàm:
                // token đó chỉ đúng cho nền --c-primary, không đúng cho nền kh.color cố định qua theme
                // (critique 2026-08-26 P1, lượt 2).
                color: dangChon ? chuTrenNen(kh.color) : 'var(--c-text-muted, #6b6e96)',
              }}
            >
              {/* Chấm màu nhận diện khoa khi CHƯA chọn. Màu khoa vốn đã sống ở icon thẻ bảng, ở huy
                  hiệu, và ở bảng chọn — nhưng dải lọc, đúng nơi người dùng CHỌN theo khoa, lại là
                  nơi duy nhất nó biến mất (chip tắt trước đây chỉ có chữ xám + viền xám). Chấm 7px
                  đủ mang danh tính mà không tranh trọng lượng với chip đang bật. Chip ĐANG bật không
                  cần chấm: cả nền đã là màu khoa rồi, thêm chấm là nói hai lần.
                  Nền chip bật giữ hex GỐC (không qua mauKhoa): chuTrenNen() tính màu chữ từ chính
                  hex đó, nâng sáng nền mà không tính lại chữ là tự phá tương phản đã kiểm. */}
              {!dangChon && chamKhoa(kh.color, 7)}
              {kh.name}
            </button>
          )
        }
        return (
          // position:relative — mốc neo cho BẢNG CHỌN chuyên khoa (popover trên PC). Trên mobile
          // .mind-menu-bang media query đổi panel sang position:fixed bottom-sheet nên mốc này thành
          // vô hại ở đó.
          <div style={{ position: 'relative' }}>
            <div
              // role="group" + nút toggle aria-pressed là mẫu ARIA đúng cho một cụm nút bật/tắt độc
              // lập — KHÔNG dùng role="tablist" (mẫu điều hướng dạng tab, đòi role="tab" +
              // aria-selected + roving tabindex, không khớp cấu trúc button/aria-pressed ở đây).
              role="group"
              aria-label="Lọc theo chuyên khoa"
              className="mind-chip-scroll"
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px 8px' }}
            >
              <button
                type="button"
                data-testid="chip-chuyen-khoa-tat-ca"
                onClick={() => setChuyenKhoaLoc(null)}
                aria-pressed={chuyenKhoaLoc === null}
                className="mind-focus-ring"
                style={{
                  ...khuonChip,
                  background: chuyenKhoaLoc === null ? 'var(--c-primary, #2d3a94)' : 'none',
                  // Cùng vá với chip chuyên khoa (veChip ở trên): var(--c-on-bright) thay '#fff' cứng.
                  color: chuyenKhoaLoc === null ? 'var(--c-on-bright, #fff)' : 'var(--c-text-muted, #6b6e96)',
                }}
              >
                Tất cả
              </button>
              {chipHien.map(veChip)}
              {chipDangChonNgoaiVISIBLE.map(veChip)}
              {/* Nút mở bảng chọn CHỈ hiện khi còn khoa khác THẬT SỰ có bảng. Trước đây nó luôn hiện:
                  người mới có 2 bảng thấy một nút mở ra danh sách 11 khoa mà 9 khoa đếm 0 — bấm vào
                  khoa nào cũng ra lưới rỗng. Nút đi mất khi không còn gì để mở là bớt đúng một control
                  chết khỏi hàng. */}
              {conKhoaKhac > 0 && (
                <button
                  ref={nutChonKhoaRef}
                  type="button"
                  data-testid="chip-chuyen-khoa-them"
                  onClick={() => setMoChonKhoa((v) => !v)}
                  aria-expanded={moChonKhoa}
                  aria-haspopup="dialog"
                  className="mind-focus-ring"
                  // Viền LIỀN, không còn nét ĐỨT. Nét đứt trong app này đã có nghĩa riêng và được
                  // chủ dự án ghim: ô "+" tạo bảng mới (.mind-o-tao-bang.mind-o-moi, viền đứt + nền
                  // phớt) — mà ô đó nằm ngay dưới hàng chip, cách chưa tới 40px. Hai nghĩa khác hẳn
                  // nhau ("tạo mới" vs "mở thêm bộ lọc") dùng chung một quy ước thị giác thì cả hai
                  // cùng mờ nghĩa. Trả nét đứt về đúng chủ của nó; hàng chip giờ dùng MỘT khuôn viền
                  // duy nhất (khuonChip) cho cả bốn-năm nút.
                  style={{ ...khuonChip, background: 'none', color: 'var(--c-text-muted, #6b6e96)' }}
                >
                  Chuyên khoa
                  {/* Số trong NGOẶC, không phải số trần: "Chuyên khoa 1" đọc được thành "Chuyên khoa
                      số 1" (thấy ngay trên ảnh chụp 2026-09-04). Ngoặc + trọng lượng nhẹ hơn là đúng
                      khuôn đã dùng ngay trên màn này cho nút mở khay — "Đã xoá gần đây (9)". */}
                  <span style={{ fontWeight: 600, opacity: 0.7 }}>({conKhoaKhac})</span>
                  {/* Chevron SVG, không phải ký tự ▾/▴ mượn từ font hệ thống (mỗi máy vẽ một cỡ/một
                      baseline khác nhau). Cùng nét 1.7 với chevron của nút mở khay "Đã xoá gần đây". */}
                  <svg
                    width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" focusable="false"
                    style={{ flexShrink: 0, transition: 'transform .18s cubic-bezier(0.34, 1.4, 0.64, 1)', transform: moChonKhoa ? 'rotate(180deg)' : 'none' }}
                  >
                    <path d="M2.4 4.4 6 8l3.6-3.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
            {moChonKhoa && conKhoaKhac > 0 && (
              <div
                data-testid="chon-khoa-panel"
                role="dialog"
                aria-label="Lọc theo chuyên khoa"
                // .mind-menu-bang (KHÔNG kèm .mind-menu-compact) → trên ≤640px media query ở index.css
                // biến thành bottom-sheet full-width position:fixed (trong tầm ngón cái); trên PC giữ
                // đúng vị trí neo tuyệt đối dưới đây. .mind-sheet: trượt lên nhẹ, tôn trọng
                // prefers-reduced-motion (đã có trong khối @media ở index.css).
                className="mind-menu-bang mind-sheet"
                style={{
                  position: 'absolute',
                  top: 'calc(100% - 2px)',
                  left: 20,
                  // width cố định (KHÔNG `right: 20` cũ — kéo panel rộng cả 1000px trên PC, badge số
                  // bị đẩy xa nhãn cả màn hình, đọc rời rạc). 300px là bề rộng menu đọc thoải mái,
                  // badge số căn phải gọn qua flex:1 ở nhãn. Trên ≤640px .mind-menu-bang media query
                  // đặt left/right:12 + width:auto!important → sheet full-width tự thắng 300px này
                  // (inline không !important), nên KHÔNG cần maxWidth và tránh lệch trái ở bottom-sheet.
                  width: 300,
                  maxHeight: 320,
                  overflowY: 'auto',
                  background: 'var(--c-surface, #fff)',
                  boxShadow: '0 2px 8px var(--c-shadow), var(--c-shadow-glow)',
                  border: '1px solid var(--c-line, #d9ddf4)',
                  borderRadius: 12,
                  padding: 4,
                  zIndex: 30,
                }}
              >
                {/* "Tất cả" hàng đầu — cùng hành động chip "Tất cả" trên dải, để trong bảng chọn luôn
                    có đường về không-lọc, không phải đóng bảng rồi đi tìm chip. */}
                <button
                  type="button"
                  data-testid="chon-khoa-tat-ca"
                  onClick={() => {
                    setChuyenKhoaLoc(null)
                    setMoChonKhoa(false)
                  }}
                  aria-pressed={chuyenKhoaLoc === null}
                  className="mind-focus-ring"
                  style={hangChon(chuyenKhoaLoc === null)}
                >
                  {/* Ô giữ chỗ đúng cỡ chấm màu — không có nó, nhãn "Tất cả" bắt đầu ở x=27 trong khi
                      mọi nhãn khoa bắt đầu ở x=43 (đo thật 2026-09-04): hàng đầu tiên của bảng chọn
                      thụt ra ngoài cột chữ của cả danh sách. */}
                  <span aria-hidden="true" style={{ width: 8, flexShrink: 0 }} />
                  <span>Tất cả</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)' }}>{tongBang}</span>
                  <span style={{ flex: 1 }} />
                  {chuyenKhoaLoc === null && dauTich}
                </button>
                {SPECIALTIES.map((kh) => (
                  <button
                    key={kh.id}
                    type="button"
                    data-testid={`chon-khoa-${kh.id}`}
                    onClick={() => {
                      setChuyenKhoaLoc(kh.id)
                      setMoChonKhoa(false)
                    }}
                    aria-pressed={chuyenKhoaLoc === kh.id}
                    className="mind-focus-ring"
                    style={hangChon(chuyenKhoaLoc === kh.id)}
                  >
                    {/* Chấm màu nhận diện khoa — cùng `kh.color` với chip/huy hiệu (qua mauKhoa để
                        đọc được cả trên nền tối), aria-hidden vì tên khoa ngay cạnh đã mang đủ thông tin. */}
                    {chamKhoa(kh.color, 8)}
                    <span>{kh.name}</span>
                    {/* Số bảng ĐỨNG NGAY SAU tên, không còn bị `flex: 1` đẩy ra mép phải. Đo trên
                        iPhone 375: nhãn "Tim mạch" kết thúc ở x≈100 còn số "1" ngồi ở x=344 — 244px
                        khoảng chết giữa hai thứ thuộc về nhau (đúng lớp lỗi comment về `width: 300`
                        phía trên nói đã sửa cho PC, nhưng bottom-sheet mobile rộng cả màn nên nó
                        sống lại nguyên vẹn ở đúng thiết bị chính). Số là phần BỔ NGHĨA cho tên khoa,
                        nên nó phải đi cùng tên; mép phải để dành cho TRẠNG THÁI (dấu tích). */}
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)' }}>
                      {demTheoKhoa.get(kh.id) ?? 0}
                    </span>
                    <span style={{ flex: 1 }} />
                    {chuyenKhoaLoc === kh.id && dauTich}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })()}
      {daXoaGanDay.length > 0 && (() => {
        // Ô "Đã xoá gần đây" là lưới an toàn PHỤ, nằm dưới lưới bảng thật về mặt ưu tiên — nên nó phải
        // ĐỌC RA là một khay để-riêng, không phải một bảng dữ liệu ngang hàng. Các dòng bên trong để
        // phẳng, chỉ ngăn nhau bằng đường mảnh — thay cho ngăn xếp thẻ pill giống hệt nhau trước đây
        // (đọc thành bảng admin, hành động bị đẩy ra tận mép phải cách tên bảng cả một khoảng chết).
        //
        // ─── VỊ TRÍ: dưới dải chip, ngay trên lưới (đổi 2026-09-04) ─────────────────────────────
        // Luật đã ghim từ critique 2026-08-28 là "ô TÌM phải đứng TRƯỚC affordance phục hồi hiếm
        // dùng" — luật đó vẫn giữ nguyên. Cái sai là khối này từng chen vào GIỮA ô tìm và dải chip,
        // tức cắt đôi đúng cụm "thu hẹp danh sách" mà chính comment của ô tìm ở trên mô tả là MỘT
        // nhóm ("vẫn giữ chúng trong cùng một cụm"). Giá đo được trên iPhone 375×812: mở khay với 4
        // dòng thì lưới bảng thật bắt đầu ở y≈990/1218 — quá nửa khung nhìn dành cho những bảng
        // người dùng ĐÃ VỨT ĐI, trước khi thấy được một bảng thật nào. Đưa xuống dưới dải chip giữ
        // trọn luật cũ (vẫn sau ô tìm), trả lại cụm lọc cho nhau, và đặt lưới an toàn ngay cạnh thứ
        // nó bảo vệ.
        //
        // ─── ÍT vs NHIỀU bảng đã xoá ───────────────────────────────────────────────────────────
        // Khác nhau ở LỚP VỎ, không ở KHẢ NĂNG: mọi mức đều giữ ô tích + dải hành động hàng loạt,
        // nên đường "xoá vĩnh viễn" không bao giờ biến mất theo số lượng.
        //   • ÍT (≤2): KHÔNG khay. Các dòng nằm thẳng trên trang dưới nút mở — một khay
        //     --c-surface-alt bo góc + đệm 12px + chân "Xem tất cả" là bộ máy lưu trữ dựng cho một
        //     tờ giấy lỡ tay; đo được nó ngốn 210px chỉ để phục hồi MỘT bảng.
        //   • NHIỀU (≥3): giữ khay — lúc này nó thật sự là một danh sách cần được quây lại, và
        //     "Chọn tất cả" / "Xem tất cả" mới có việc để làm.
        const itBangDaXoa = daXoaGanDay.length <= 2
        const chevron = (
          <svg
            width="11" height="11" viewBox="0 0 12 12" aria-hidden="true" focusable="false"
            style={{ flexShrink: 0, transition: 'transform .18s cubic-bezier(0.34, 1.4, 0.64, 1)', transform: hienDaXoaGanDay ? 'rotate(90deg)' : 'none' }}
          >
            <path d="M4 2.4 8 6l-4 3.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
        // Cùng nút toggle dùng ở CẢ hai trạng thái (thu gọn: đứng một mình; mở: là tiêu đề của khay).
        const toggle = (
          <button
            type="button"
            data-testid="mo-da-xoa-gan-day"
            onClick={() => setHienDaXoaGanDay(!hienDaXoaGanDay)}
            className="mind-focus-ring"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 32,
              fontSize: 12.5, fontWeight: 700, color: 'var(--c-text-soft, #454870)',
              background: 'none', border: 0, padding: '2px 2px', borderRadius: 6,
            }}
            aria-expanded={hienDaXoaGanDay}
          >
            {chevron}
            <span>Đã xoá gần đây</span>
            <span style={{ fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)' }}>({daXoaGanDay.length})</span>
          </button>
        )

        if (!hienDaXoaGanDay) {
          return <div style={{ padding: '6px 20px 0' }}>{toggle}</div>
        }

        // Rút gọn RUT_GON_DA_XOA dòng mới nhất; "Xem tất cả" mở toàn bộ + ô tìm + cuộn trong hộp.
        const daLoc = xemTatCaDaXoa
          ? daXoaGanDay.filter((b) => mucKhopTimKiem(b, timDaXoa))
          : daXoaGanDay
        const hienThi = xemTatCaDaXoa ? daLoc : daXoaGanDay.slice(0, RUT_GON_DA_XOA)
        const soChon = chonDaXoa.size
        const conAn = daXoaGanDay.length - RUT_GON_DA_XOA
        // "Chọn tất cả" thao tác trên `daLoc` (ở chế độ rút gọn = TOÀN BỘ bảng đã xoá, không phải 4
        // dòng đang hiện; ở "Xem tất cả" = tập đã lọc theo ô tìm) — đúng nghĩa "xoá hết tất cả bảng"
        // mà không phải tự tay tick từng ô. Đã chọn hết thì nút lật thành "Bỏ chọn".
        const tatCaDaChon = daLoc.length > 0 && daLoc.every((b) => chonDaXoa.has(b.id))
        const nutPhu: React.CSSProperties = {
          minHeight: 34, padding: '4px 10px', fontSize: 12, fontWeight: 700,
          borderRadius: 9999, border: 0, background: 'none', whiteSpace: 'nowrap',
        }
        const nutFooter: React.CSSProperties = {
          display: 'block', width: '100%', textAlign: 'left', minHeight: 34,
          marginTop: 8, paddingTop: 8,
          borderWidth: 0, borderTopWidth: 1, borderStyle: 'solid',
          borderColor: 'var(--c-line-soft, #e9ebf9)', background: 'none',
          fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)',
        }
        // "Hoàn tác" TỪNG DÒNG — pill viền mảnh, chữ --c-text-soft. TRƯỚC ĐÂY là chữ trần
        // --c-accent-2 (magenta), "đồng ngôn ngữ màu với nút Hoàn tác ở toast" (critique 2026-08-26
        // P2). Lý do đảo: toast có ĐÚNG MỘT nút Hoàn tác, sống vài giây, là khoảnh khắc điểm nhấn
        // thật. Panel này có N — ảnh chụp bản tối 2026-09-04 cho thấy 4 dòng magenta + "Chọn tất cả"
        // magenta là năm mảng sáng nhất khay, trong khi TÊN BẢNG (thứ phải đọc để bấm đúng nút) là
        // chữ mờ nhất. Lặp lại một màu điểm nhấn N lần thì nó không còn là điểm nhấn, chỉ còn là
        // nhiễu — và ở đây nó còn đảo ngược trật tự đọc. Magenta rời hẳn panel này (xem thêm chú
        // thích tại nút "Khôi phục": nó cũng bỏ magenta, vì đứng cách "Xoá vĩnh viễn" đỏ đúng 4px).
        // Không mất mát gì: magenta là màu của MẶT BÀN VẼ Mindmap (DESIGN.md "The One Other Place
        // Rule"), còn đây là một khay quản lý danh sách — nó vẫn nguyên vẹn ở toast "Hoàn tác" và
        // trên canvas, đúng những nơi nó là điểm nhấn thật.
        // Viền --c-line ở bản tối khá mờ trên khay; chấp nhận được vì nhãn chữ + icon mới là
        // affordance chính, viền chỉ để nút có hình dạng.
        const nutHoanTac: React.CSSProperties = {
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
          minHeight: 32, padding: '5px 11px', borderRadius: 9999,
          border: '1px solid var(--c-line, #d9ddf4)', background: 'none',
          fontSize: 12, fontWeight: 600, color: 'var(--c-text-soft, #454870)', whiteSpace: 'nowrap',
        }

        // ÍT (≤2) thì bỏ hẳn vỏ khay: không nền --c-surface-alt, không bo góc, không đệm trong —
        // các dòng nằm thẳng trên trang, thẳng hàng với mọi thứ khác ở lề 20px. NHIỀU (≥3) mới quây
        // khay. `maxWidth 560` giữ nguyên ở cả hai để danh sách không kéo dài hết 1040px trên PC.
        const khungKhay: React.CSSProperties = itBangDaXoa
          ? { maxWidth: 560 }
          : { maxWidth: 560, borderRadius: 12, background: 'var(--c-surface-alt, #f6f7fd)', padding: '6px 12px 12px' }

        return (
          // Đáy 4px → 16px: số 4 được đặt khi khối này còn đứng TRƯỚC dải chip (hai hàng cùng một
          // cụm "thu hẹp danh sách" nên cố tình sát nhau). Sau khi chuyển xuống dưới dải chip, thứ
          // đứng kế tiếp là LƯỚI BẢNG — một mục khác hẳn — mà khoảng hở đo được chỉ còn 4px giữa
          // dòng cuối và ô "+", đọc thành hai khối dính vào nhau (rõ nhất ở nhánh ÍT, nơi không có
          // nền khay nào tự tách nó ra). 16px đủ tách hai mục mà vẫn nhỏ hơn nhịp giữa các mục lớn.
          <div style={{ padding: '10px 20px 16px' }}>
            <div style={khungKhay}>
              {/* Tiêu đề khay: toggle bên trái, "Chọn tất cả" bên phải — MỘT hàng, thay cho ba dòng
                  chữ xám 12px xếp chồng trước đây (tiêu đề / chọn tất cả / xem tất cả nhìn y hệt nhau). */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 34 }}>
                {toggle}
                {/* Hiện khi có >1 bảng đã xoá (1 bảng thì tick thẳng ô nhanh hơn). Ở chế độ rút gọn,
                    bấm chọn hết cũng MỞ LUÔN "Xem tất cả" nếu còn dòng bị giấu — để người dùng thấy
                    đúng những gì vừa chọn thay vì dải "N đã chọn" trong khi chỉ 4 ô tick hiện ra. */}
                {daLoc.length > 1 && (
                  <button
                    type="button"
                    data-testid="chon-tat-ca-da-xoa"
                    onClick={() => {
                      if (tatCaDaChon) {
                        setChonDaXoa(new Set())
                        setXacNhanXoaVinhVien(false)
                      } else {
                        setChonDaXoa(new Set(daLoc.map((b) => b.id)))
                        if (!xemTatCaDaXoa && conAn > 0) setXemTatCaDaXoa(true)
                      }
                    }}
                    className="mind-focus-ring"
                    // --c-text-soft, KHÔNG --c-accent-2: đây là công tắc tiện ích của khay, không
                    // phải một hành động điểm nhấn — xem chú thích dài ở `nutHoanTac` phía trên về
                    // việc gom magenta về đúng MỘT chỗ trong panel này.
                    style={{
                      marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', minHeight: 30,
                      padding: '4px 6px', fontSize: 12, fontWeight: 600,
                      color: 'var(--c-text-soft, #454870)', background: 'none', border: 0, whiteSpace: 'nowrap',
                    }}
                  >
                    {tatCaDaChon ? 'Bỏ chọn tất cả' : `Chọn tất cả (${daLoc.length})`}
                  </button>
                )}
              </div>

              {/* Ô tìm — CHỈ ở chế độ "Xem tất cả" (tìm trong ≤4 dòng rút gọn là thừa). type=search
                  dùng chung khuôn với các ô tìm khác của app (index.css bỏ appearance + nút xoá OS). */}
              {xemTatCaDaXoa && (
                <input
                  type="search"
                  data-testid="tim-da-xoa"
                  value={timDaXoa}
                  onChange={(e) => setTimDaXoa(e.target.value)}
                  placeholder="Tìm trong bảng đã xoá…"
                  aria-label="Tìm trong bảng đã xoá"
                  className="mind-focus-ring"
                  style={{
                    width: '100%', marginTop: 8, marginBottom: 2, padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--c-line, #d9ddf4)', background: 'var(--c-surface, #fff)',
                    color: 'var(--c-text, #12142b)',
                  }}
                />
              )}

              {/* Dải hành động hàng loạt — chỉ khi có ≥1 tích chọn. Không tô nền pill riêng (đọc thành
                  "một dòng nữa"); chỉ đường kẻ mảnh trên/dưới + hành động XÚM sát nhãn "N đã chọn",
                  không đẩy ra mép. Bước xác nhận đỏ giữ nền --c-danger-soft theo Untouchable Signal
                  Rule của DESIGN.md: PHẲNG, không bounce/glow — đây là khoảnh khắc phá huỷ thật. */}
              {soChon > 0 && (
                <div
                  data-testid="dai-chon-da-xoa"
                  style={
                    xacNhanXoaVinhVien
                      ? { margin: '8px 0 2px', borderRadius: 8, padding: '8px 10px', background: 'var(--c-danger-soft, #fef2f2)' }
                      : { margin: '6px 0 2px', padding: '8px 0', borderTop: '1px solid var(--c-line-soft, #e9ebf9)', borderBottom: '1px solid var(--c-line-soft, #e9ebf9)' }
                  }
                >
                  {xacNhanXoaVinhVien ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: 'var(--c-danger-deep, #991b1b)' }}>
                        Xoá vĩnh viễn {soChon} bảng? Không khôi phục lại được.
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setXacNhanXoaVinhVien(false)}
                          className="mind-focus-ring"
                          style={{ ...nutPhu, color: 'var(--c-text-muted, #6b6e96)' }}
                        >
                          Huỷ
                        </button>
                        <button
                          type="button"
                          data-testid="xoa-vinh-vien-chon"
                          onClick={() => xoaVinhVienNhieu(chonDaXoa)}
                          className="mind-focus-ring"
                          style={{ ...nutPhu, padding: '4px 14px', background: 'var(--c-danger, #b91c1c)', color: 'var(--c-on-bright, #fff)' }}
                        >
                          Xoá vĩnh viễn
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ flexShrink: 0, marginRight: 4, fontSize: 12, fontWeight: 700, color: 'var(--c-text-soft, #454870)' }}>
                        {soChon} đã chọn
                      </span>
                      <button
                        type="button"
                        data-testid="khoi-phuc-chon"
                        onClick={() => khoiPhucNhieu(chonDaXoa)}
                        className="mind-focus-ring"
                        // --c-text-soft, KHÔNG --c-accent-2. Đo trên trang thật (bản tối,
                        // 2026-09-04): magenta #f175a6 của "Khôi phục" và đỏ #ff8585 của "Xoá vĩnh
                        // viễn" cách nhau ΔE(CIE76) = 26 và đứng cách nhau ĐÚNG 4px — hai chữ hồng
                        // 12px kề nhau, một cái phục hồi, một cái phá huỷ vĩnh viễn. Ở 2 giờ sáng
                        // giữa ca trực, cái đọc ra là "hai chữ hồng". Đây đúng lớp rủi ro mà kiến
                        // trúc màu của DESIGN.md dựng ra để chặn (chọn indigo thay vì xanh lá/teal
                        // cốt để màu thương hiệu không bao giờ lẫn với màu tín hiệu an toàn).
                        // Trong một dải hành động hàng loạt, thứ PHẢI được đánh dấu bằng màu là hành
                        // động PHÁ HUỶ, không phải hành động an toàn — "Khôi phục" không cần màu để
                        // tìm thấy, nó chỉ cần đọc được. Bỏ magenta ở đây để --c-danger là màu DUY
                        // NHẤT trong dải, đúng thứ tự ưu tiên cảnh báo.
                        style={{ ...nutPhu, color: 'var(--c-text-soft, #454870)' }}
                      >
                        Khôi phục
                      </button>
                      <button
                        type="button"
                        data-testid="hoi-xoa-vinh-vien"
                        onClick={() => setXacNhanXoaVinhVien(true)}
                        className="mind-focus-ring"
                        style={{ ...nutPhu, color: 'var(--c-danger, #b91c1c)' }}
                      >
                        Xoá vĩnh viễn
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  marginTop: 6,
                  ...(xemTatCaDaXoa ? { maxHeight: 240, overflowY: 'auto', WebkitOverflowScrolling: 'touch' } : null),
                }}
              >
                {hienThi.map((b, i) => {
                  const daChon = chonDaXoa.has(b.id)
                  // Hai bảng trùng tên mặc định "Bảng chưa đặt tên" trước đây CHỈ phân biệt được bằng
                  // chấm màu — nhưng chấm đó mang aria-hidden, nên người dùng đọc màn hình nghe hai
                  // dòng giống hệt nhau, không biết "Hoàn tác" nào khôi phục đúng bảng cần (critique
                  // 2026-09-01, P1). Mốc xoá tương đối (daXoaLuc, không phải capNhatLuc — đúng thứ
                  // panel này sắp theo, xem daXoaGanDay ở trên) vừa hiện ra cho mắt, vừa gắn vào
                  // aria-label của checkbox/nút để trình đọc màn hình có tín hiệu phân biệt thật.
                  const moTaXoa = b.daXoaLuc ? `, xoá ${formatReadTime(b.daXoaLuc)}` : ''
                  return (
                    <div
                      key={b.id}
                      data-testid={`da-xoa-gan-day-${b.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--c-line-soft, #e9ebf9)',
                        background: daChon ? 'var(--c-primary-soft, #eceefa)' : 'transparent',
                      }}
                    >
                      {/* Vùng chạm 34px quanh ô tích 18px — vẫn xa ngưỡng WCAG 2.5.8 (24px), gọn hơn
                          gutter 40px cũ vốn đọc thành một khoảng trống rộng trước một ô tí xíu.
                          `.mind-check` (index.css) thay hẳn ô tích NGUYÊN BẢN của trình duyệt: xem
                          chú thích tại lớp đó — `accentColor` chỉ tô trạng thái ĐÃ tích, ô CHƯA tích
                          vẫn là khối xám hệ điều hành, lạc khỏi bảng màu app ở bản tối. */}
                      <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 34, minHeight: 34, flexShrink: 0, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          data-testid={`chon-da-xoa-${b.id}`}
                          checked={daChon}
                          onChange={() => chuyenChon(b.id)}
                          aria-label={`Chọn bảng ${b.ten}${moTaXoa}`}
                          className="mind-check mind-focus-ring"
                        />
                      </label>
                      {/* HAI DÒNG, không phải một — đây là phép đo, không phải sở thích. Ở 375px, bề
                          rộng dùng được của một dòng là 303px; trừ vùng chạm ô tích (34+10) và nút
                          "Hoàn tác" (~95 kể cả gap) còn 164px cho chấm + tên + mốc thời gian. Riêng
                          "Bảng chưa đặt tên" @13/600 đã ~112px và "17 phút trước" @11 ~72px = 184px
                          — nên bố cục một dòng BUỘC phải cắt cụt tên, đúng như đo được: tên bị cắt
                          thành "Bảng chưa đặt t…" ngay cả khi khay chỉ có MỘT dòng và còn 200px
                          trống bên phải. Tách mốc thời gian xuống dòng dưới trả lại 150px cho tên
                          (đủ, không cắt) mà chiều cao dòng gần như không đổi (~49px, y hệt cũ).
                          Mốc thời gian thụt vào 13px = chấm 6 + gap 7, để nó thẳng cột với tên.
                          THỨ BẬC MÀU ba bậc, sửa đúng chỗ trước đây bị đảo (tên là chữ mờ nhất khay
                          trong khi động từ "Hoàn tác" là chữ sáng nhất): tên --c-text (đậm nhất) >
                          nút --c-text-soft > mốc thời gian --c-text-muted. */}
                      <span style={{ flex: '1 1 auto', minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          {/* Chấm màu ổn định theo id ÔM SÁT tên — phân biệt hai bảng trùng tên
                              "Bảng chưa đặt tên" trước khi bấm nhầm (critique lượt 3). */}
                          <span
                            aria-hidden="true"
                            style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: mauTrungTinhTheoBang(b.id, b.mauHue) }}
                          />
                          <span style={{ minWidth: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: 'var(--c-text, #12142b)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.ten}
                          </span>
                        </span>
                        {b.daXoaLuc && (
                          <span style={{ display: 'block', marginLeft: 13, marginTop: 1, fontSize: 11, lineHeight: 1.25, color: 'var(--c-text-muted, #6b6e96)' }}>
                            Xoá {formatReadTime(b.daXoaLuc)}
                          </span>
                        )}
                      </span>
                      {/* "Hoàn tác" từng-dòng chỉ khi CHƯA chọn gì — có tích chọn thì dải hàng loạt ở
                          trên tiếp quản. Nút NEO CỨNG vào mép phải (cụm tên `flex: 1 1 auto` nuốt hết
                          chỗ thừa) — bố cục cũ để nút chạy ngay sau tên nên mép phải răng cưa theo độ
                          dài tên, đo được lệch 18px giữa các dòng (339/339/339/321). Cột phải thẳng
                          băng thì bốn-chín dòng đọc ra một danh sách, không phải mấy dòng xô lệch.
                          Icon mũi tên quay-lại (nét 1.7, cùng khuôn với chevron của nút mở khay) đứng
                          trước nhãn: động từ lặp N lần cần một mỏ neo hình để mắt bắt nhanh hơn đọc.
                          aria-label riêng (khác chữ hiện "Hoàn tác" trần) — cùng lý do moTaXoa ở trên. */}
                      {soChon === 0 && (
                        <button
                          type="button"
                          data-testid={`hoan-tac-gan-day-${b.id}`}
                          onClick={() => khoiPhucBang(b)}
                          aria-label={`Hoàn tác xoá bảng ${b.ten}${moTaXoa}`}
                          className="mind-focus-ring"
                          style={nutHoanTac}
                        >
                          <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
                            <path d="M2.2 5.4h6.3a3.4 3.4 0 1 1 0 6.8H5.1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M4.6 2.6 1.9 5.4l2.7 2.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Hoàn tác
                        </button>
                      )}
                    </div>
                  )
                })}
                {xemTatCaDaXoa && daLoc.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--c-text-muted, #6b6e96)', padding: '8px 4px', margin: 0 }}>
                    Không có bảng đã xoá nào khớp “{timDaXoa}”.
                  </p>
                )}
              </div>

              {!xemTatCaDaXoa && conAn > 0 && (
                <button
                  type="button"
                  data-testid="xem-tat-ca-da-xoa"
                  onClick={() => setXemTatCaDaXoa(true)}
                  className="mind-focus-ring"
                  style={nutFooter}
                >
                  Xem tất cả ({daXoaGanDay.length}) →
                </button>
              )}
              {xemTatCaDaXoa && (
                <button
                  type="button"
                  data-testid="thu-gon-da-xoa"
                  onClick={() => {
                    setXemTatCaDaXoa(false)
                    setTimDaXoa('')
                    setChonDaXoa(new Set())
                    setXacNhanXoaVinhVien(false)
                  }}
                  className="mind-focus-ring"
                  style={nutFooter}
                >
                  Thu gọn
                </button>
              )}
            </div>
          </div>
        )
      })()}
      {danhSachSapXep.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            // flex:1 + minHeight:0 thay cho `height: '70%'`. Phần trăm đó KHÔNG bao giờ chạy như
            // viết: cha (.mind-board-wrap) cao auto nên CSS giải "70%" về "auto", khối chỉ cao bằng
            // nội dung — đo được 205px, kết thúc ở y=499 trong vùng cuộn cao 755px, để lại 256px
            // (34%) khoảng chết bên dưới và đẩy cả cụm lên một phần ba trên màn. Với
            // .mind-board-wrap-trong ở cha, flex:1 cho khối ăn đúng chiều cao còn lại và
            // justifyContent:center căn nó vào GIỮA phần đó — thứ mà "70%" chỉ định làm chứ chưa
            // từng làm được. paddingBottom rộng hơn để cụm không tì vào mép dưới vùng cuộn.
            flex: 1,
            minHeight: 0,
            gap: 12,
            padding: '16px 16px 40px',
            textAlign: 'center',
          }}
        >
          {/* Kích thước CO GIÃN theo không gian, không phải một số px cố định.
              92px cố định đo ra 7,3% bề ngang trên PC 1280 (cân đối) nhưng 24,5% trên iPhone 375 —
              gấp 3,4 lần về tỉ lệ, nên cùng một hình đọc thành "vừa vặn" ở màn rộng và "chiếm chỗ"
              ở màn hẹp (phản hồi chủ dự án 2026-08-30). clamp giữ nguyên cỡ đã đúng ở PC (8vw của
              1280 = 102 → chạm trần 96, gần y hệt 92 cũ) và kéo iPhone xuống sàn 56px (14,9% bề
              ngang). Vế `min(...,14vh)` là chốt cho màn NGANG thấp (điện thoại xoay ngang): ở đó
              8vw sẽ lớn hơn cả chiều cao khối rỗng, vh mới là chiều thật sự khan hiếm.
              Sàn 56px là mức icon còn đọc được ra hình cái đầu có các nút nối — dưới nữa thì nét
              trong hình dính vào nhau. */}
          <div
            className="empty-breathe"
            style={{
              width: 'clamp(56px, min(8vw, 14vh), 96px)',
              aspectRatio: '1 / 1',
              flexShrink: 0,
              color: 'var(--c-text-muted, #6b6e96)',
            }}
          >
            <BieuTuongMindmap />
          </div>
          {/* Lưới THẬT SỰ trống: một câu nói thẳng giá trị của bề mặt (hiến chương: biến lý thuyết
              thành một bức tranh trực quan, dễ hình dung) TRƯỚC dòng mời cũ — người lần đầu không có
              cách nào biết vì sao đây là "phòng não phải" ≥50% công sức thiết kế nếu chỉ thấy một
              dòng xám (critique 2026-08-28 P3, persona Jordan). `textWrap: 'balance'` cho hai dòng
              chữ khi xuống hàng dài gần bằng nhau, không lệch bậc thang (phản hồi chủ dự án
              2026-08-28: "căn chỉnh cho đều hàng"). Đã bỏ dòng "Ghi chú nối thẳng tới bài viết…
              phác đồ điều trị" — hứa hẹn một năng lực liên kết chưa hiện diện rõ trong luồng, gây
              rối hơn là dẫn dắt (cùng phản hồi). */}
          {!rongDoBoLoc && (
            <p style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--c-text, #12142b)', margin: 0, maxWidth: 280, lineHeight: 1.3, textWrap: 'balance' }}>
              {LOI_MOI_TRONG}
            </p>
          )}
          {/* rongDoBoLoc: dòng này ĐỨNG MỘT MÌNH làm dòng đầu (headline ấm ở trên bị ẩn), nên mượn
              đúng trọng lượng chữ của headline đó (15.5/700 thay vì 14/400) — không thêm copy mới,
              chỉ để trạng thái rỗng-do-lọc không đọc lạnh/tuột bậc hơn rỗng-thật (critique
              2026-09-01, P3). */}
          <p
            style={
              rongDoBoLoc
                ? { fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--c-text, #12142b)', margin: 0, maxWidth: 280, lineHeight: 1.3, textWrap: 'balance' }
                : { fontSize: 14, color: 'var(--c-text-muted, #6b6e96)', margin: 0, maxWidth: 280, textWrap: 'balance' }
            }
          >
            {rongDoBoLoc ? 'Không tìm thấy bảng nào khớp' : 'Bắt đầu một sơ đồ tư duy mới'}
          </p>
          {rongDoBoLoc && (
            // Ô tìm và dải chip vẫn hiện ngay phía trên (cả hai gắn vào danhSach GỐC, không phải
            // danh sách đã lọc) nên không cần thêm nút "xoá bộ lọc" riêng — chỉ cần chỉ đúng chỗ.
            <p style={{ fontSize: 12.5, color: 'var(--c-text-muted, #6b6e96)', margin: 0 }}>
              Thử từ khoá khác hoặc bỏ bớt bộ lọc.
            </p>
          )}
          {rongDoBoLoc ? (
            // Rỗng DO LỌC thì lối thoát đúng là GỠ BỘ LỌC, không phải tạo bảng mới (critique
            // 2026-08-29, P2). Ô tìm và dải chip vẫn hiện phía trên nên người dùng VỚI TỚI được
            // đường thoát — nhưng phần tử lớn nhất, màu nhất của khung nhìn lại đang mời làm một
            // việc KHÁC hẳn việc họ vừa cố làm; người vội bấm vào là có một bảng rác. Đổi đích của
            // đúng cái nút to đó, không thêm nút mới.
            // KHÔNG còn .mind-o-tao-bang. Lớp đó là VẬT LIỆU GIẤY dành riêng cho "tờ giấy chưa
            // viết" = tạo bảng mới — chính comment của nó ở index.css đã ghi "CHỈ ô này, KHÔNG áp
            // cho nút Xoá bộ lọc", nhưng mã lại đang mâu thuẫn với comment. Hai hệ quả đo được ở
            // bản tối: (1) nút reset mặc bộ đồ của hành động TẠO MỚI — một tấm giấy kem gần trắng,
            // vật thể sáng nhất và tương phản mạnh nhất toàn màn, mời làm đúng cái việc KHÁC hẳn
            // việc người dùng vừa cố làm; (2) chữ --c-accent-2 (#f175a6) trên nền --c-note
            // (#efece3) chỉ đạt 2,27:1 — trượt hẳn AA 4,5:1. Đây là lỗi tiếp cận thật, không phải
            // chuyện gu.
            // Thay bằng đúng thứ nó là: một nút PHỤ của app — pill (bo tròn như mọi nút khác trên
            // màn, thay cho bo 2px của vật liệu giấy), nền --c-surface, viền 1px --c-line, chữ
            // --c-text (15,5:1 ở bản tối, 16,6:1 ở bản sáng). Hành động thì giữ nguyên: gỡ bộ lọc,
            // không phải tạo bảng mới (critique 2026-08-29, P2).
            <button
              type="button"
              data-testid="xoa-bo-loc"
              onClick={() => {
                setTruyVan('')
                setChuyenKhoaLoc(null)
              }}
              // dose-press: phản hồi chạm scale(0.96) dùng chung toàn app (DESIGN.md — mọi control
              // bấm được đều nhún, kể cả dưới prefers-reduced-motion).
              className="mind-focus-ring dose-press"
              // Mảng nền --c-primary-soft + viền --c-primary-line + chữ --c-primary: khuôn "nút phụ
              // trong thương hiệu" mà DESIGN.md đã định nghĩa cho --c-primary-soft ("background tint
              // cho bề mặt phụ muốn nằm trong thương hiệu mà không cần màu full-strength"). Đo trên
              // trang thật: chữ đạt 6,54:1 (tối) và 8,48:1 (sáng) — vượt AA thoải mái.
              // Vì sao KHÔNG để nền trong suốt + viền không: không token viền nào của app đạt nổi 3:1
              // trên nền trang (--c-line đo được 1,61 tối / 1,21 sáng; --c-primary-line 1,99 / 1,45),
              // nên một nút "chỉ có viền" trên màn rỗng gần như không có hình dạng. Mảng nền cấp hình,
              // viền cấp mép, nhãn màu thương hiệu cấp nhận diện.
              // Vì sao KHÔNG tô đặc --c-primary (khuôn nút chính của DESIGN.md): việc người dùng đang
              // làm là TÌM một bảng, không phải "xoá bộ lọc" — nút này là bậc thang gỡ bí, không phải
              // đích đến của màn. Đúng lý do critique 2026-08-29 P2 gỡ ô "+" khỏi đây ngay từ đầu.
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 44,
                padding: '10px 20px',
                borderRadius: 9999,
                border: '1px solid var(--c-primary-line, #c3caf0)',
                background: 'var(--c-primary-soft, #eceefa)',
                color: 'var(--c-primary, #2d3a94)',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Xoá bộ lọc
            </button>
          ) : (
            // `loaiTaoDuoc.length > 0`: màn không có quyền tạo (Thư viện, màn chuyên khoa) không
            // được mời tạo gì — ô "+" biến mất hẳn thay vì hiện ra rồi vô hiệu.
            loaiTaoDuoc.length > 0 && (
              <button
                type="button"
                data-testid="tao-bang"
                onClick={taoBangMoi}
                onMouseDown={giuFocusKhiBamDup}
                // .mind-o-tao-bang + .mind-o-moi (index.css): viền ĐỨT nét ngắn + nền phớt --c-accent-2
                // nhạt, dấu "+" magenta (DESIGN.md "The One Other Place Rule") — tự đổi sáng/tối.
                // .mind-o-moi CHỈ trên ô "+", không trên nút "Xoá bộ lọc" cũng mượn .mind-o-tao-bang.
                className="mind-focus-ring mind-o-tao-bang mind-o-moi"
                style={{ width: 104, height: 78, fontSize: 28 }}
                aria-label="Tạo bảng mới"
              >
                +
              </button>
            )
          )}
        </div>
      ) : (
        // .mind-board-grid (index.css) — 4 cột 1fr cố định trên PC/iPad, rút về 2 cột dưới
        // @media max-width:640px cho iPhone (2026-08-28, thay cho repeat(auto-fill, minmax(110px,
        // 140px)) cũ). Cột cố định + 1fr (thay vì auto-fill dò cột theo cỡ ô cố định) là đổi hướng
        // CÓ CHỦ Ý: yêu cầu mới là đúng 2 mức cột theo LỚP THIẾT BỊ (iPhone/PC-iPad), không phải một
        // dải liên tục co giãn theo từng px màn hình — 1fr khiến thẻ DÃN lấp đúng 1/4 hoặc 1/2 bề
        // ngang khung .mind-board-wrap thay vì đứng yên ở cỡ tối đa 140px cũ (đúng phản hồi "bảng nên
        // to hơn"). Ít bảng hơn số cột (vd 2 bảng trong lưới 4 cột) để trống các cột còn lại bên phải
        // thay vì tự co lưới lại/căn giữa — hành vi lưới-căn-trái tiêu chuẩn (Google Drive, Notion…),
        // khoảng trống thừa nhỏ hơn NHIỀU so với ca "không cân đối" đã sửa trước đây (ca đó phát sinh
        // từ auto-fill dò RA THÊM cột rỗng vô hình để lấp hết bề ngang một container rộng trong khi
        // mỗi cột bị ghim cỡ nhỏ cố định — vấn đề gốc đã biến mất cùng với chính cơ chế auto-fill).
        <>
        <div className="mind-board-grid" style={dangChonNhieu ? { paddingBottom: 64 } : undefined}>
          {/* Ô "+" là ô ĐẦU TIÊN của lưới, không phải ô cuối (critique 2026-08-29, P1). Lưới sắp
              theo `capNhatLuc` giảm dần nên vị trí ô cuối DỊCH CHUYỂN mỗi lần thêm bảng, và ở 2 cột
              trên iPhone thì 20 bảng = 10 hàng: hành động chính của màn trôi xuống sau ~10 hàng
              cuộn, ngày càng xa theo mức độ dùng app. Đưa lên đầu vừa ghim vị trí cố định vừa đưa
              nó về vùng ngón cái với tới ngay khi mở màn. Ngôn ngữ thị giác giữ nguyên. */}
          {loaiTaoDuoc.length > 0 && (
            <button
              type="button"
              data-testid="tao-bang"
              onClick={taoBangMoi}
              onMouseDown={giuFocusKhiBamDup}
              // disabled khi đang chọn-nhiều: tạo bảng mới tự mở ô đổi tên (taoBangMoi) — trộn với chế
              // độ chọn (checkbox thay "⋯") ra một thẻ vừa mời gõ tên vừa mời tích chọn cùng lúc, rối
              // hơn là hữu ích. "Chọn" ở header vẫn còn đó để thoát trước khi tạo bảng mới.
              disabled={dangChonNhieu}
              // Cùng .mind-o-tao-bang + .mind-o-moi với ô "+" ở trạng thái rỗng phía trên — một nguồn
              // sự thật cho viền đứt/nền/màu, đây chỉ khác cỡ (dãn theo ô lưới thay vì cố định).
              className="mind-focus-ring mind-o-tao-bang mind-o-moi"
              // height:100% (thay aspectRatio:'4/3' cũ) — thẻ .the-bang cao = mặt 4:3 CỘNG hai dòng
              // tên + mốc thời gian bên dưới, nên ô "+" 4:3-trơn thấp hơn thẻ cùng hàng ~37px, để lại
              // một khe trống dưới hành động chính ngay ở màn hình đầu, đọc thành lỗi render (critique
              // 2026-09-03, P3). Grid item mặc định `align-self: stretch` nên bỏ chiều cao cố định là
              // ô tự cao bằng hàng; display:grid + placeItems:center giữ dấu "+" ở giữa toàn bộ chiều
              // cao mới đó. minHeight 96 chỉ là sàn cho ca suy biến (một hàng chỉ có ô "+" + một thẻ
              // tên rất ngắn) — hàng có thẻ thật luôn cao hơn nhiều.
              style={{ height: '100%', minHeight: 96, display: 'grid', placeItems: 'center', fontSize: 24, opacity: dangChonNhieu ? 0.4 : 1 }}
              aria-label="Tạo bảng mới"
            >
              +
            </button>
          )}
          {danhSachSapXep.map((bang, index) => (
            <TheBang
              key={bang.id}
              bang={bang}
              index={index}
              dangXoa={dangChoXoa?.id === bang.id || (dangChoXoaNhieu?.some((b) => b.id === bang.id) ?? false)}
              dangSuaTen={dangSuaTenId === bang.id}
              dangMoMenu={dangMoMenuId === bang.id}
              dangXacNhanXoa={dangXacNhanXoaId === bang.id}
              dangSuaTag={dangSuaTagId === bang.id}
              chonNhieu={dangChonNhieu}
              daChonNhieu={chonNhieuSong.has(bang.id)}
              onChuyenChonNhieu={() => chuyenChonNhieuSong(bang.id)}
              // Đang chọn-nhiều thì tap vào thẻ = chọn/bỏ chọn, KHÔNG mở bảng — đổi ngay tại đây,
              // không phải trong TheBang, nên nút vật lý/pointer-handling của TheBang không cần biết
              // gì về chế độ chọn (xem chú thích tại prop chonNhieu của TheBang).
              onMo={dangChonNhieu ? () => chuyenChonNhieuSong(bang.id) : (origin) => onMoBang(bang.id, origin, bang.ten, bang.loai)}
              onBatMenu={
                dangChonNhieu
                  ? () => {}
                  : () => {
                      const dangMo = dangMoMenuId === bang.id
                      setDangMoMenuId(dangMo ? null : bang.id)
                      // Panel sửa chuyên khoa/tag và menu "⋯" ghim CÙNG toạ độ (top:30 right:4) với cùng
                      // zIndex, panel render SAU nên luôn vẽ ĐÈ lên menu. Mục "Chuyên khoa/tag" là đường
                      // DUY NHẤT đóng panel (nó là toggle), mà nó nằm trong menu bị che — panel mở ra là
                      // kẹt cho tới khi thẻ unmount. Mở menu thì đóng panel trước: "⋯" luôn là đường thoát.
                      if (!dangMo) setDangSuaTagId(null)
                    }
              }
              onBatSuaTen={() => {
                setDangMoMenuId(null)
                setDangSuaTenId(bang.id)
              }}
              onBatSuaTag={() => {
                setDangMoMenuId(null)
                setDangSuaTagId(dangSuaTagId === bang.id ? null : bang.id)
              }}
              onDoiChuyenKhoa={(id) => {
                const bangMoi = { ...bang, chuyenKhoa: id, capNhatLuc: Date.now() }
                update(bangMoi)
                // Chip lọc đang chọn MỘT chuyên khoa khác id vừa gán → bảng sẽ rớt khỏi danhSachSapXep
                // ngay khi update() cập nhật state cục bộ (cùng lượt render), kéo theo panel đang mở
                // (dangSuaTag) unmount cùng lúc — người dùng vừa đổi chuyên khoa thì cả thẻ lẫn panel
                // biến mất không một lời giải thích. Đúng lớp lỗi review Task 2 đã bắt ở taoBangMoi
                // (tạo bảng dưới chip lọc khác cũng làm thẻ mới biến mất) — cùng cách vá: đưa bộ lọc
                // về "Tất cả" ngay khi thao tác khiến bảng đang thao tác rớt khỏi bộ lọc hiện tại.
                if (chuyenKhoaLoc && chuyenKhoaLoc !== id) setChuyenKhoaLoc(null)
                // Ô tìm (Task 8) là bộ lọc THỨ HAI, rớt khỏi nó cũng làm thẻ + panel biến mất y hệt,
                // nên phải vá RIÊNG — chặn được chip lọc không có nghĩa là chặn được ô tìm.
                // mucKhopTimKiem gộp cả TÊN HIỂN THỊ của chuyên khoa ("Tim mạch", xem mucMeta.ts)
                // nên đổi khoa thật sự đổi kết quả so khớp. Kiểm bằng chính bản ghi MỚI (bangMoi):
                // `bang` trong closure vẫn là bản cũ, so khớp nó sẽ ra kết luận sai. Truy vấn rỗng
                // luôn khớp nên nhánh này tự im lặng khi chưa lọc gì.
                if (!mucKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
              }}
              onLuuTen={(tenMoi) => {
                setDangSuaTenId(null)
                const tenSach = tenMoi.trim() || bang.ten
                // Bỏ qua nếu tên KHÔNG đổi (Escape-huỷ, hoặc blur không gõ gì) — trước đây luôn
                // ghi update() dù tên y hệt, bump capNhatLuc thành "Vừa xong" cho một thao tác
                // không làm gì cả, khiến tín hiệu "cập nhật gần đây" càng thêm sai lệch (critique
                // lượt 3, 2026-08-24 — xác nhận trực tiếp bằng Escape trên Browser pane thật).
                if (tenSach === bang.ten) return
                const bangMoi = { ...bang, ten: tenSach, capNhatLuc: Date.now() }
                update(bangMoi)
                // Đổi tên ra NGOÀI truy vấn đang lọc thì thẻ vừa lưu biến mất ngay lượt render kế
                // tiếp — nhẹ hơn hai ca kia (ô đổi tên đã tự đóng ở dòng đầu callback nên không có
                // panel nào bị giật mất) nhưng vẫn là "vừa lưu xong thì mất thẻ". Cùng cách vá với
                // chip lọc ngay trên: xoá trắng bộ lọc khiến bảng đang thao tác rớt khỏi lưới.
                if (!mucKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
              }}
              onXoa={() => {
                if (dangXacNhanXoaId !== bang.id) {
                  setDangXacNhanXoaId(bang.id)
                  hesXacNhanXoaLucRef.current = Date.now()
                  return
                }
                // Chạm "xác nhận" tới quá sớm sau chạm ARM = double-tap vô tình, không phải hai
                // quyết định riêng biệt — bỏ qua, GIỮ NGUYÊN trạng thái "Chắc chắn xoá?" để lần
                // chạm chủ ý thật (sau ngưỡng) vẫn xoá được, không phải bắt đầu lại từ đầu.
                if (Date.now() - hesXacNhanXoaLucRef.current < NGUONG_XAC_NHAN_MS) return
                setDangXacNhanXoaId(null)
                setDangMoMenuId(null)
                setDangChoXoa(bang)
              }}
              onThemTag={(tag) => {
                const hienCo = bang.tags ?? []
                // So khớp CHUẨN HOÁ (bỏ dấu, không phân biệt hoa/thường — cùng hàm `normalizeSearch`
                // dùng cho tìm kiếm, `mucMeta.ts`), không phải `Array.includes` thô: trước bản vá
                // này, "Tim mạch" rồi "tim mạch" (gõ lại, quên đã có) thành hai tag khác nhau, hai
                // chip gần giống hệt nhau xếp cạnh nhau không cách nào hợp nhất ngoài xoá thủ công
                // (critique 2026-09-03 lượt 6, P3). Giữ NGUYÊN VĂN bản gõ trước (không ép về tag đã
                // có) — chuẩn hoá chỉ dùng để SO SÁNH, không dùng để LƯU.
                if (hienCo.some((t) => normalizeSearch(t) === normalizeSearch(tag))) return
                update({ ...bang, tags: [...hienCo, tag], capNhatLuc: Date.now() })
              }}
              onXoaTag={(tag) => {
                const bangMoi = { ...bang, tags: (bang.tags ?? []).filter((t) => t !== tag), capNhatLuc: Date.now() }
                update(bangMoi)
                // Ca TỆ NHẤT của lớp lỗi này: truy vấn khớp bảng CHỈ nhờ đúng cái tag vừa bị bấm ×.
                // Panel sửa tag đang mở ngay dưới con trỏ, xoá xong là bảng thôi khớp truyVan → thẻ
                // rớt khỏi lưới kéo panel unmount cùng lượt render, người dùng mất chỗ đang thao tác
                // giữa chừng. Cùng cách vá với chip lọc ở onDoiChuyenKhoa phía trên.
                if (!mucKhopTimKiem(bangMoi, truyVan)) setTruyVan('')
              }}
            />
          ))}
        </div>
        {/* Chỉ MỘT câu, mượn đúng cỡ/màu chữ phụ đã dùng cho "Thử từ khoá khác…" ở trạng thái rỗng
            phía trên — không icon, không nút, không khung: nó không mời làm gì (ô "+" trong lưới đã
            mời rồi), chỉ giải thích khoảng trắng bên dưới là CHỖ CÒN CHỖ, không phải lỗi/thiếu. */}
        {ganTrong && !dangChonNhieu && (
          <p style={{ fontSize: 13, color: 'var(--c-text-muted, #6b6e96)', textAlign: 'center', margin: '18px auto 0', maxWidth: 320, textWrap: 'balance' }}>
            Còn nhiều chỗ — mỗi chuyên khoa hay dự án một bảng riêng cũng được, thêm bao nhiêu tuỳ ý.
          </p>
        )}
        </>
      )}
      </div>
      </div>
    </div>
    {/* Dải BÁO LỖI GHI — hiện khi useIdbCollection báo một lượt ghi IndexedDB thất bại thật (xem
        loiGhi ở đó). Đặt TRƯỚC dải "Hoàn tác" và không tự tắt: người dùng phải tự đóng, vì thứ nó
        báo là "thao tác vừa rồi CÓ THỂ chưa được lưu", không phải một xác nhận thoáng qua.
        Trình bày theo Untouchable Signal Rule của DESIGN.md: nền/viền/chữ đọc từ họ token
        --c-danger-*, PHẲNG và nghiêm túc — không bounce, không glow, không đếm ngược như dải xanh
        bên dưới. Không chỉ dùng màu để truyền tin (colorblind-safe): có icon cảnh báo + câu chữ
        nói rõ vấn đề VÀ đường thoát (xuất file sao lưu), đúng yêu cầu "errors name the problem and
        the recovery". role="alert" thay vì "status" — đây là thứ phải cắt ngang, không phải thông
        báo lịch sự.
        aria-live mặc định của role="alert" là assertive, không cần khai thêm. */}
    {loiGhi && (
      <div
        role="alert"
        className="absolute flex items-start gap-2.5 px-4 py-3 rounded-2xl z-50"
        // bottom: 10 (KHÔNG var(--above-nav)) — cùng lý do dải "Hoàn tác" ngay dưới: dải này
        // position:absolute trong <main class="has-nav">, mà <main> đã dừng ở mép trên thanh nav.
        // var(--above-nav) chỉ đúng cho thứ neo vào khung nhìn / #app-shell (dùng ở đây trừ nav 2 lần).
        style={{
          left: 12,
          right: 12,
          bottom: 10,
          background: 'var(--c-danger-soft, #fef2f2)',
          border: '1px solid var(--c-danger-line, #fecaca)',
          color: 'var(--c-danger-deep, #991b1b)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}>
          <path
            d="M12 3.6 2.7 19.2a1.2 1.2 0 0 0 1 1.8h16.6a1.2 1.2 0 0 0 1-1.8L12 3.6Z"
            stroke="var(--c-danger-icon, #dc2626)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M12 9.6v4.2" stroke="var(--c-danger-icon, #dc2626)" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1.05" fill="var(--c-danger-icon, #dc2626)" />
        </svg>
        <div className="flex-1 flex flex-col items-start gap-1.5">
          <span className="text-[12.5px] leading-snug">
            {/* Nói SỐ thay đổi chưa lưu thay vì "có lỗi xảy ra": người dùng cần biết mình đang mất
                bao nhiêu việc để quyết định thử lại hay xuất file ngay. soGhiCho chạm trần 100 thì
                lời khuyên "thử lại" không còn đủ — xem TRAN_HANG_CHO trong useIdbCollection. */}
            {soGhiCho > 1
              ? `${soGhiCho} thay đổi chưa lưu được vào bộ nhớ máy.`
              : 'Không lưu được thay đổi vào bộ nhớ máy.'}{' '}
            Chúng có thể mất khi bạn đóng app — thử lại, hoặc xuất bản sao ra file trước khi tiếp tục.
          </span>
          <button
            type="button"
            onClick={() => void thuLaiGhi()}
            data-testid="thu-lai-ghi-bang"
            className="mind-focus-ring"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 36,
              padding: '0 12px',
              marginLeft: -12,
              borderRadius: 9999,
              border: 0,
              background: 'none',
              color: 'var(--c-danger-deep, #991b1b)',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Thử lại
          </button>
        </div>
        <button
          type="button"
          onClick={xoaLoiGhi}
          aria-label="Đóng thông báo lỗi lưu"
          className="mind-focus-ring"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 44,
            minWidth: 44,
            margin: -10,
            color: 'var(--c-danger-deep, #991b1b)',
            background: 'none',
            border: 0,
            flex: 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    )}
    {/* Dải kết quả xuất PNG đã chuyển sang màn vẽ cùng nút xuất (BoardGallery.tsx). */}
    {vuaXoa && (
        <div
          key={vuaXoa.id}
          role="status"
          aria-live="polite"
          className="toast-in-full absolute flex items-center gap-2.5 px-4 py-2.5 rounded-2xl z-40 overflow-hidden"
          // bottom: 10 (KHÔNG var(--above-nav)) — dải này `position: absolute` bên trong
          // <main class="has-nav"> (App.tsx), mà <main> đã kết thúc ĐÚNG ở mép trên thanh nav rồi
          // (flex-1, thanh nav là flex-none ngay dưới). var(--above-nav) = nguyên chiều cao nav + 18px
          // là công thức cho thứ neo vào KHUNG NHÌN / #app-shell (vd .mind-menu-bang position:fixed) —
          // dùng ở đây thì TRỪ nav HAI LẦN, đo được dải nổi 56px trên nav (iPhone có home-indicator:
          // ~103px), đúng triệu chứng "thanh thông báo xóa bị tràn lên giữa" (phản hồi thật
          // 2026-08-29). 10px là khoảng hở thị giác tới mép nav, trong khoảng 5-10px chủ dự án yêu cầu.
          // Nền + chữ + nút đọc từ token --c-toast-* (index.css): trước đây nền là rgba(15,23,42,.94)
          // viết cứng (vi phạm "mọi màu là token") và nút "Hoàn tác" tô --c-accent-2 bản sáng chỉ đạt
          // 2,90:1 trên nền tối này — dưới AA (critique 2026-08-28 P1). --c-toast-action là sắc
          // magenta bản-tối, ~8,2:1 trên nền dải, vẫn thuộc "One Other Place Rule" của Mindmap.
          style={{ left: 12, right: 12, bottom: 10, background: 'var(--c-toast-surface, rgba(15,23,42,.94))' }}
        >
          <span className="flex-1 text-[12.5px] leading-snug" style={{ color: 'var(--c-toast-text, #f4f6fb)' }}>Đã xoá "{vuaXoa.ten}"</span>
          <button
            type="button"
            onClick={() => {
              khoiPhucBang(vuaXoa)
              setVuaXoa(null)
            }}
            className="mind-focus-ring"
            // minHeight 44 → 36 (2026-08-31, phản hồi thật: "thanh thông báo khi xóa chiếm không gian
            // màn hình nhiều"). Toast này là `flex items-center` nên chiều cao CẢ HÀNG bị ép theo
            // chính nút này — đo được 62,7px cho một dòng chữ 12,5px, gần hết là khoảng đệm rỗng do
            // 44px là mức khuyến nghị AAA/HIG, không phải sàn bắt buộc (WCAG 2.5.8 AA chỉ cần 24px —
            // cùng lý lẽ mà `menu-bang` phía trên đã áp dụng để hạ 44→40). 36 vẫn cách xa sàn 24px,
            // toast co còn ~54px — nhỏ hơn hẳn nhưng "Hoàn tác" vẫn dễ bấm trên di động.
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 36,
              minWidth: 44,
              color: 'var(--c-toast-action, #f175a6)',
              fontWeight: 600,
              fontSize: 13,
              background: 'none',
              border: 0,
              whiteSpace: 'nowrap',
              padding: '4px 6px',
            }}
          >
            Hoàn tác
          </button>
          {/* Thanh đếm ngược — cho biết còn bao lâu trước khi dải tự tắt (critique 2026-08-28 P1:
              "không có countdown ở khoảnh khắc căng nhất"). key={vuaXoa.id} ở div cha khiến cả dải
              remount mỗi bảng bị xoá nên animation luôn chạy lại từ đầu. */}
          <span
            aria-hidden="true"
            className="toast-countdown-bar"
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              height: 2,
              width: '100%',
              background: 'var(--c-toast-action, #f175a6)',
              opacity: 0.55,
              '--toast-countdown-ms': `${HOAN_TAC_XOA_MS}ms`,
            } as React.CSSProperties}
          />
        </div>
      )}
    {vuaXoaNhieu && (
        // Mirror đúng dải "Hoàn tác" đơn ở trên (vuaXoa) — chỉ khác text số nhiều + khôi phục CẢ mảng
        // cùng lúc thay vì một bảng. Không dùng chung một khối JSX với vuaXoa: kiểu dữ liệu khác hẳn
        // (object đơn so với mảng) khiến một khối gộp chung phải nhánh if/else ngay trong JSX, khó
        // đọc hơn là hai khối riêng song song — cùng tinh thần soGhiCho số ít/nhiều trong file này.
        <div
          key={vuaXoaNhieu.map((b) => b.id).join(',')}
          role="status"
          aria-live="polite"
          className="toast-in-full absolute flex items-center gap-2.5 px-4 py-2.5 rounded-2xl z-40 overflow-hidden"
          style={{ left: 12, right: 12, bottom: 10, background: 'var(--c-toast-surface, rgba(15,23,42,.94))' }}
        >
          <span className="flex-1 text-[12.5px] leading-snug" style={{ color: 'var(--c-toast-text, #f4f6fb)' }}>
            Đã xoá {vuaXoaNhieu.length} bảng
          </span>
          <button
            type="button"
            onClick={() => {
              for (const b of vuaXoaNhieu) khoiPhucBang(b)
              setVuaXoaNhieu(null)
            }}
            className="mind-focus-ring"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 36, minWidth: 44, color: 'var(--c-toast-action, #f175a6)',
              fontWeight: 600, fontSize: 13, background: 'none', border: 0,
              whiteSpace: 'nowrap', padding: '4px 6px',
            }}
          >
            Hoàn tác
          </button>
          <span
            aria-hidden="true"
            className="toast-countdown-bar"
            style={{
              position: 'absolute', left: 0, bottom: 0, height: 2, width: '100%',
              background: 'var(--c-toast-action, #f175a6)', opacity: 0.55,
              '--toast-countdown-ms': `${HOAN_TAC_XOA_MS}ms`,
            } as React.CSSProperties}
          />
        </div>
      )}
    {dangChonNhieu && (() => {
      // Thanh hành động chọn-nhiều trên lưới sống — ghim ĐÁY (khác thanh trên của panel trash, xem
      // chú thích dangChonNhieu ở khai báo state) — cùng công thức vị trí left:12/right:12/bottom:10
      // với dải "Hoàn tác" ngay trên (position:absolute bên trong <main>, KHÔNG var(--above-nav) —
      // xem chú thích dài tại đó). Không phải toast tự tắt: sống suốt lúc dangChonNhieu còn bật.
      const soChonSong = chonNhieuSong.size
      const tatCaDaChonSong = danhSachSapXep.length > 0 && danhSachSapXep.every((b) => chonNhieuSong.has(b.id))
      return (
        <div
          role="toolbar"
          aria-label="Thao tác hàng loạt"
          className="absolute flex items-center gap-2 px-4 py-2.5 rounded-2xl z-40"
          style={{ left: 12, right: 12, bottom: 10, background: 'var(--c-toast-surface, rgba(15,23,42,.94))' }}
        >
          {/* aria-live/aria-atomic: cùng lý do với nút Xoá ngay bên phải trong CÙNG thanh này (xem
              chú thích tại đó) — người dùng trình đọc màn hình tick/bỏ tick từng checkbox trên lưới
              (mỗi checkbox có aria-label riêng) nhưng trước bản vá này không nghe được số đếm tổng
              cập nhật real-time ở đây, phải tự quay lại đúng dòng này mới biết đã chọn bao nhiêu
              (critique 2026-09-03 lượt 6, P2). */}
          <span
            aria-live="polite"
            aria-atomic="true"
            className="flex-1 text-[12.5px] leading-snug font-semibold"
            style={{ color: 'var(--c-toast-text, #f4f6fb)' }}
          >
            {soChonSong > 0 ? `${soChonSong} đã chọn` : 'Chọn bảng cần xoá'}
          </span>
          <button
            type="button"
            data-testid="chon-tat-ca-song"
            onClick={() =>
              setChonNhieuSong(tatCaDaChonSong ? new Set() : new Set(danhSachSapXep.map((b) => b.id)))
            }
            className="mind-focus-ring"
            style={{
              display: 'inline-flex', alignItems: 'center', minHeight: 36, padding: '0 10px',
              color: 'var(--c-toast-action, #f175a6)', fontWeight: 600, fontSize: 12.5,
              background: 'none', border: 0, whiteSpace: 'nowrap',
            }}
          >
            {tatCaDaChonSong ? 'Bỏ chọn' : `Chọn tất cả (${danhSachSapXep.length})`}
          </button>
          {/* Nút Xoá theo Untouchable Signal Rule (DESIGN.md): họ màu --c-danger, PHẲNG — không
              bounce/glow dù đứng trong một thanh có thể trượt lên bằng .toast-in-full ở nơi khác.
              disabled khi chưa chọn gì, thay vì ẩn hẳn — thanh vẫn hiện ngay khi bật chế độ chọn
              (để "Chọn tất cả" luôn với tới được), nút Xoá chỉ có tác dụng khi có gì để xoá.
              Hai lần chạm khi có gì để xoá — cùng khuôn "Chắc chắn xoá?" với xoá TỪNG bảng (nút
              trong menu "⋯"), xem xacNhanXoaNhieu. Chạm đầu chỉ ĐỔI NHÃN, không xoá gì. */}
          <button
            type="button"
            data-testid="xoa-nhieu-song"
            onClick={() => {
              if (soChonSong === 0) return
              if (!xacNhanXoaNhieu) {
                setXacNhanXoaNhieu(true)
                hesXacNhanXoaNhieuLucRef.current = Date.now()
                return
              }
              // Cùng lý do với onXoa (xoá từng-bảng): chạm tới quá sớm sau ARM là double-tap vô
              // tình, bỏ qua và GIỮ NGUYÊN "Chắc chắn xoá?" thay vì xoá ngay hoặc rút lại xác nhận.
              if (Date.now() - hesXacNhanXoaNhieuLucRef.current < NGUONG_XAC_NHAN_MS) return
              setXacNhanXoaNhieu(false)
              xoaNhieuSong()
            }}
            disabled={soChonSong === 0}
            className="mind-focus-ring"
            // aria-live/aria-atomic: cùng lý do với nút Xoá từng-bảng trong menu "⋯" — đổi nhãn
            // "Xoá (N)" → "Chắc chắn xoá?" trên CÙNG nút, không có phần tử mới nào mount để AT tình
            // cờ bắt được (critique 2026-09-02 lượt 2, P2). Đây giờ là hành động phạm vi thiệt hại
            // lớn nhất màn hình (xoá cả N bảng cùng lúc), càng cần công bố rõ, không chỉ dựa vào
            // trình đọc màn hình tự đọc lại accessible-name của phần tử đang focus.
            aria-live="polite"
            aria-atomic="true"
            style={{
              display: 'inline-flex', alignItems: 'center', minHeight: 36, padding: '0 14px',
              borderRadius: 9999, border: 0,
              background: soChonSong === 0 ? 'var(--c-line-soft, #e9ebf9)' : 'var(--c-danger, #b91c1c)',
              color: soChonSong === 0 ? 'var(--c-text-muted, #6b6e96)' : 'var(--c-on-bright, #fff)',
              fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap',
              opacity: soChonSong === 0 ? 0.6 : 1,
            }}
          >
            {soChonSong === 0 ? 'Xoá' : xacNhanXoaNhieu ? 'Chắc chắn xoá?' : `Xoá (${soChonSong})`}
          </button>
        </div>
      )
    })()}
    {dangChonDanhMuc && (
      <ChonDanhMuc
        loai={dangChonDanhMuc}
        onChon={(d) => {
          setDangChonDanhMuc(null)
          taoMucVoiDanhMuc(dangChonDanhMuc, d)
        }}
        onHuy={() => setDangChonDanhMuc(null)}
      />
    )}
    </>
  )
}
