// Khai kiểu cho scripts/tom-tat-doi-chieu.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
export declare function tomTatDoiChieu(so: {
  tong: number
  lech: number
  loiBam: number
  thua: number
  thieu: number
  gocThua: number
}): { dong: string; khongDoiChieuDuoc: number; sach: boolean; ma: 0 | 1 }
