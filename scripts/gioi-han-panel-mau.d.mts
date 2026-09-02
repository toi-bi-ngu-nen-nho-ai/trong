// Khai kiểu cho scripts/gioi-han-panel-mau.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
export declare function vaKichThuocPanelMau(
  js: string,
  tenFile?: string,
): { js: string; daVa: boolean }

export declare function vaViTriPanelMau(
  js: string,
  tenFile?: string,
): { js: string; daVa: boolean }

export declare function thuGonThanhTimKiemPanelMau(
  js: string,
  tenFile?: string,
): { js: string; daVa: boolean }
