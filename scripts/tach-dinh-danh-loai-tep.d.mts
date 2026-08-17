// Khai kiểu cho scripts/tach-dinh-danh-loai-tep.mjs, để ca kiểm .ts import được mà `tsc --noEmit`
// vẫn xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
export declare function tachDinhDanhLoaiTep(
  js: string,
  tenFile?: string,
): { js: string; danhSachId: string[] }
