// Task 4 (kho-bai-viet-giai-doan-5-6): bấm "+" giờ mở BẢNG CHỌN DANH MỤC (ChonDanhMuc) trước khi
// ghi bất kỳ bản ghi nào — quyết định 7 của spec cấm trạng thái chưa-phân-loại. Nhiều file spec của
// LuoiMuc (LuoiMuc.spec.ts, LuoiMuc-loi-luu-tru.spec.ts) seed `loaiTaoDuoc: ['so-do']` mà KHÔNG
// truyền `danhMuc`, đúng cấu hình thật của tab Mindmap (BoardGallery.tsx không lọc theo danh mục —
// xem taoBangMoi trong LuoiMuc.tsx: chỉ khi có prop `danhMuc` mới bỏ qua bảng chọn), nên mọi lượt
// bấm "+" ở các file đó đều phải đi qua bảng chọn trước khi thẻ mới xuất hiện.
//
// Một hàm dùng chung ở đây (thay vì chép tay vào từng file spec) — cùng lý do choDenKhi/choDom ở
// cho-den-khi.ts đã nêu: sửa một chỗ, không phải lan ra nhiều bản chép lệch nhau.
//
// Bấm "Tiếp cận vấn đề" — lựa chọn ĐẦU TIÊN mà bảng chọn hiện cho sơ đồ — vì các ca gọi hàm này kiểm
// hành vi tạo/đổi tên/khoá chống bấm đúp/báo lỗi ghi, không kiểm giá trị `danhMuc` cụ thể.
//
// Nhận `container` làm tham số (không đọc biến ngoài) vì nhiều file/describe có `container` cục bộ
// riêng. PHẢI gọi trong `act()` của người gọi (hàm không tự bọc) vì một số ca cần kiểm trạng thái
// NGAY SAU cú bấm "+" (bảng chọn đang mở) trước khi gọi hàm này.
export function chonDanhMucDauTien(container: ParentNode) {
  const nutDanhMuc = Array.from(container.querySelectorAll('[role="dialog"] button')).find(
    (b) => b.textContent === 'Tiếp cận vấn đề',
  ) as HTMLButtonElement | undefined
  if (!nutDanhMuc) throw new Error('Bấm "+" phải mở bảng chọn danh mục (role="dialog") trước')
  nutDanhMuc.click()
}
