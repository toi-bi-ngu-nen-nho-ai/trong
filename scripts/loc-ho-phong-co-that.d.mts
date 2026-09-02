// Khai kiểu cho scripts/loc-ho-phong-co-that.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
//
// File này KHÔNG phải thủ tục thừa: quên nó là `tsc` đỏ với TS7016 — đúng vết xe đã đổ ở lượt thêm
// `thayChuTranTrongDiv`/`thayNutHomNay` vào luat-vi-tri-dich.mjs (2026-09-02), lọt qua HAI commit vì
// vitest và esbuild đều không kiểm kiểu.
export declare function vaLocHoPhong(js: string, tenFile?: string): { js: string; daVa: boolean }
