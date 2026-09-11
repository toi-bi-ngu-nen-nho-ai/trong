
// Cùng giá trị CONFIRM_DELETE_RESET_MS của App.tsx (5000) — viết hằng số riêng thay vì import vì
// component gốc (ConfirmIconButton) là private, phụ thuộc `icons` cũng private của file 11.000+
// dòng đó. Xem Global Constraints của kế hoạch này.
export const XAC_NHAN_XOA_MS = 5000

// Ngưỡng thời gian TỐI THIỂU giữa lần chạm "vào trạng thái xác nhận" và lần chạm "xác nhận thật" —
// không có ngưỡng này, "Xoá" → "Chắc chắn xoá?" → xoá thật chỉ là MỘT cử chỉ hai-chạm-liên-tiếp
// (double-tap ~100-300ms, phản xạ quen tay từ double-tap-to-zoom, tay run, bấm lại vì lo lắng) xuyên
// thủng hoàn toàn — đo được trực tiếp: 2 click cách nhau 50ms thực thi xoá ngay, y hệt không hề có
// bước xác nhận (critique 2026-09-02 lượt 3, P1). 450ms nằm trên ngưỡng double-tap của con người
// (thường <300ms) nhưng vẫn ngắn hơn hẳn cảm giác "phải đợi" của một lần chạm CHỦ Ý thứ hai.
export const NGUONG_XAC_NHAN_MS = 450

// Ngưỡng coi một thẻ là "vừa tạo" (dùng .card-plop thay vì .card-settle êm) — xem §3.2/§3.3 spec.
export const VUA_TAO_NGUONG_MS = 3000

// Tên gán cho bảng mới tạo. Trước đây chuỗi này viết cứng ở `taoBangMoi`, còn ô đổi tên thì so
// bằng mắt người đọc mã — hai chỗ phải khớp nhau mới đúng, và không gì bắt chúng khớp. Nay ô đổi
// tên dùng chính hằng số này để quyết định hiện RỖNG hay hiện tên thật (xem `TheBang`).
export const TEN_MAC_DINH = 'Bảng chưa đặt tên'

// Chuyên khoa đang lọc — NGOẠI LỆ có chủ đích với quy ước "bộ lọc chỉ sống trong phiên" của phần
// còn lại của app (SearchScreen.activeFilter và các bộ lọc tạm thời khác): một board Mindmap là tài
// sản dài hạn (tháng/năm), không phải một lượt tra cứu nhất thời — bác sĩ luôn làm việc trong một
// chuyên khoa cố định phải "Thêm +N" rồi chọn lại chip đó mỗi lần mở tab là phí lặp lại thật cho
// đúng người dùng trung thành nhất (critique 2026-09-01, P2; xác nhận lại với chủ dự án trước khi
// làm — KHÔNG áp dụng ngoại lệ này cho `truyVan`/`moChonKhoa`, hai state đó vẫn đúng nghĩa tạm
// thời của một phiên xem lưới, giữ nguyên không lưu).
export const CHUYEN_KHOA_LOC_KEY = 'drtrong:mindmap-chuyen-khoa-loc'

// Thời lượng .card-slide-out (src/index.css) — thẻ giữ mount đúng bằng ngần này trước khi đánh dấu
// xoá mềm (daXoaLuc) chạy, để animation kịp chạy hết trước khi thẻ biến mất khỏi lưới. PHẢI khớp
// đúng thời lượng animation CSS (0.4s, tăng từ 0.2s cũ — debug 2026-08-26, "xoá quá nhanh, có như
// không có") — lệch hai số này là jump-cut hoặc khoảng trắng chết, xem comment tại .card-slide-out.
export const XOA_TRE_MS = 400

// Cửa sổ "Hoàn tác" sau khi xoá mềm một bảng — cùng độ dài với XAC_NHAN_XOA_MS (quy ước sẵn có của
// đúng màn này cho "khoảng ân hạn"), đủ lâu để đọc tên bảng vừa xoá và quyết định, không quá lâu
// tới mức dải xác nhận cảm giác bị kẹt trên màn hình.
export const HOAN_TAC_XOA_MS = 5000

// Panel "Đã xoá gần đây" hiện tối đa ngần này dòng khi CHƯA bấm "Xem tất cả" — đủ để bắt lại một
// hai bảng vừa lỡ tay mà không đổ nguyên danh sách thùng rác ra giữa màn (phản hồi 2026-08-30).
export const RUT_GON_DA_XOA = 4

// Nhấn-giữ trên thẻ TỪNG mở CÙNG menu mà nút "⋯" mở (thêm 2026-08-28, P2, làm lối vào THỨ HAI cho
// đúng menu đó) — GỠ 2026-09-02 (distill, critique P3): ba vòng critique độc lập sau đó đều thấy cử
// chỉ này vô hình, không ai tìm ra được nó, và mỗi lần đội chỉ "thêm lối vào song song" (nút "⋯" đã
// có sẵn từ trước, rồi "Chọn" cho xoá hàng loạt) thay vì sửa/bỏ chính cử chỉ ẩn. Vì nó chưa từng làm
// gì mà "⋯" không làm được — luôn là lối vào THỨ HAI tới CÙNG menu, không phải khả năng riêng — bỏ
