// Dòng tổng kết + mã thoát của cổng D11, sinh ra từ MỘT phép tính duy nhất.
//
// Vì sao tách khỏi `kiem-vendor.mjs`: trước lượt này dòng chữ và mã thoát là hai biểu thức viết
// tay nằm cách nhau vài dòng, và chúng đã lệch nhau thật — dòng chữ cộng `thua + thieu`, mã thoát
// xét thêm `gocThua`. Kết quả: một cây hỏng vì thư mục gốc thừa in "không đối chiếu được 0" rồi
// thoát 1, tức bản báo cáo mà con người đọc lại nói ngược với bản báo cáo mà CI đọc. Gộp về một
// hàm thuần là cách duy nhất làm cho hai bản đó KHÔNG THỂ lệch, thay vì trông cậy vào việc người
// sửa sau nhớ sửa cả hai chỗ.
//
// Hàm thuần, không đọc đĩa, không in gì — nhờ vậy ca kiểm dựng được mọi tổ hợp hỏng mà không cần
// bịa ra một cây vendor giả trên đĩa.

/**
 * @param {{ tong: number, lech: number, loiBam: number, thua: number, thieu: number, gocThua: number }} so
 *   `tong`/`lech`: số file đã so và số file khác nội dung. `loiBam`: số lỗi của phép đối chiếu
 *   bảng băm. `thua`/`thieu`/`gocThua`: ba dạng "không đối chiếu được" — file cục bộ không có ở
 *   thượng nguồn, file thượng nguồn không có ở cây vendor, và thư mục gốc chỉ có ở cây vendor.
 * @returns {{ dong: string, khongDoiChieuDuoc: number, sach: boolean, ma: 0 | 1 }}
 */
export function tomTatDoiChieu({ tong, lech, loiBam, thua, thieu, gocThua }) {
  // Đúng ba vế này, không hơn không kém: đây là định nghĩa của "không đối chiếu được" — file
  // không tìm được bản tương ứng để so. `lech`/`loiBam` là file SO ĐƯỢC nhưng khác nội dung, thuộc
  // phạm trù khác, nên chúng làm đỏ mã thoát mà không làm tăng phép đếm này.
  const khongDoiChieuDuoc = thua + thieu + gocThua
  const sach = loiBam === 0 && lech === 0 && khongDoiChieuDuoc === 0
  return {
    dong: `\nĐã so ${tong} file với thượng nguồn, lệch ${lech}, không đối chiếu được ${khongDoiChieuDuoc}`,
    khongDoiChieuDuoc,
    sach,
    ma: sach ? 0 : 1,
  }
}
