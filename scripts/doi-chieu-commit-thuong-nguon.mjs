// Cây vendored được chép từ MỘT commit AFFiNE cụ thể. Cổng D11 (`kiem-vendor.mjs`) so nó với một
// checkout AFFiNE trên đĩa — nhưng checkout đó là repo của người dùng, nó đi đâu là chuyện của họ.
//
// Khi nó đi khỏi bản đã pin, cổng in ra hàng chục dòng `LỆCH:` và không nói gì thêm. Chuyện đã xảy
// ra thật (2026-08-29): một lượt clone lại AFFiNE rơi vào `canary` mới nhất, cổng in 84 dòng LỆCH,
// và phải mất cả một lượt điều tra — đọc `git reflog` của checkout, so từng file, tra `git log` của
// một file lệch — mới ra kết luận "cây vendored KHÔNG hỏng, thượng nguồn nhảy lên trước".
//
// Toàn bộ lượt điều tra đó là thứ cổng ĐÃ CÓ ĐỦ DỮ KIỆN để nói ngay: nó biết mình pin ở commit nào
// và biết checkout đang ở commit nào. Module này biến hai dữ kiện đó thành một câu tự giải thích.
//
// Hàm THUẦN, không chạy git, không đọc đĩa — nhờ vậy ca kiểm dựng được mọi tổ hợp (khớp, lệch,
// không biết, chưa pin) mà không cần một checkout git thật. Cùng lối đã dùng cho
// `tom-tat-doi-chieu.mjs`.

/**
 * @param {{ pin?: string | null, thucTe?: string | null, duongDan?: string }} arg
 *   `pin`: SHA đầy đủ mà cây vendored được chép từ đó (xem COMMIT-THUONG-NGUON).
 *   `thucTe`: SHA mà checkout AFFiNE trên đĩa đang đứng, hoặc null/'' nếu không đọc được.
 *   `duongDan`: đường dẫn checkout đó, để lệnh sửa in ra là DÁN LÀ CHẠY chứ không có placeholder —
 *   cổng biết chính xác nó đang so với thư mục nào, bắt người đọc tự điền lại là vứt đi một dữ kiện
 *   đã có sẵn, đúng lúc họ đang bối rối vì hàng chục dòng LỆCH.
 * @returns {{ khop: boolean, canhBao: string }}
 */
export function doiChieuCommitThuongNguon({ pin, thucTe, duongDan }) {
  // Thiếu một trong hai vế thì KHÔNG kết luận gì. Một cảnh báo dựng trên dữ kiện không có còn tệ
  // hơn im lặng: nó dạy người đọc bỏ qua cảnh báo của cổng này. Cổng vẫn còn phép so nguyên văn của
  // chính nó, không mất gì.
  if (!pin || !thucTe) return { khop: true, canhBao: '' }

  // So ĐẦY ĐỦ 40 ký tự, không so tiền tố: hai commit khác nhau trùng 10 ký tự đầu là chuyện hiếm
  // nhưng có thật, và một cổng bảo chứng tính toàn vẹn thì không được phép chấp nhận "gần giống".
  if (pin === thucTe) return { khop: true, canhBao: '' }

  const ngan = (s) => s.slice(0, 10)
  return {
    khop: false,
    canhBao: [
      '',
      '─'.repeat(78),
      'CHECKOUT THƯỢNG NGUỒN KHÔNG Ở BẢN ĐÃ PIN — mọi dòng LỆCH bên dưới có thể chỉ là hệ quả,',
      'không phải cây vendored hỏng.',
      '',
      `  cây vendored chép từ : ${ngan(pin)}`,
      `  checkout đang đứng ở : ${ngan(thucTe)}`,
      '',
      'Hai đường xử lý:',
      '',
      '  1. Đưa checkout về đúng bản đã pin (rẻ, khôi phục cổng ngay, không đụng mã dự án):',
      `       git -C "${duongDan ?? '.'}" checkout --detach ${pin}`,
      '',
      '  2. Nâng cây vendored lên bản mới — việc LỚN: dựng lại toàn bộ, chạy lại pipeline',
      '     đổi tên/dịch, kiểm hồi quy cả màn Mindmap. Chỉ làm khi thật sự cần bản vá của',
      '     thượng nguồn, và khi xong thì ghi SHA mới vào commit-thuong-nguon.txt ở gốc repo.',
      '─'.repeat(78),
    ].join('\n'),
  }
}
