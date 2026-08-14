// Khai kiểu cho scripts/duyet-cay-js.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn xanh.
// Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
export declare function dietJs(dir: string): AsyncGenerator<string>
