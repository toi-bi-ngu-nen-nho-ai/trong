// Khai kiểu cho scripts/doi-chieu-commit-thuong-nguon.mjs, để ca kiểm .ts import được mà
// `tsc --noEmit` vẫn xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào
// tsconfig — cùng quy ước với tom-tat-doi-chieu.d.mts và các .d.mts anh em trong thư mục này.
export declare function doiChieuCommitThuongNguon(arg: {
  /** SHA đầy đủ mà cây vendored được chép từ đó (commit-thuong-nguon.txt ở gốc repo). */
  pin?: string | null
  /** SHA checkout AFFiNE trên đĩa đang đứng; null/'' khi không đọc được. */
  thucTe?: string | null
  /** Đường dẫn checkout đó — để lệnh sửa in ra là dán-là-chạy, không có placeholder. */
  duongDan?: string
}): { khop: boolean; canhBao: string }
