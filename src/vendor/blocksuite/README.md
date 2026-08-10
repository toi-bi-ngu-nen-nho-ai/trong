# Mã vendored từ BlockSuite — KHÔNG SỬA

Xuất xứ: `AFFiNE/blocksuite/framework/{global,store}/src`, phiên bản **0.27.0**.
Chép nguyên văn ngày 2026-08-11.

## Vì sao chép mà không cài từ npm

npm mới publish tới `0.22.4`. Bản `0.27.0` chỉ có trong workspace AFFiNE, và nó là bản duy
nhất chứa `viewportRuntimeConfig` / `getEffectiveDpr` / `SKIP_REFRESH_DURING_GESTURE` — phần
giữ WKWebView khỏi sập lúc pan/zoom trên iPhone, tức rủi ro số một của dự án.

Xem D10 và D11 trong `docs/superpowers/specs/2026-08-11-blockkit-edgeless-design.md`.

## Quy tắc

**Cấm sửa một chữ nào trong thư mục này** — kể cả import, kể cả chiều lint.
Cần đổi hành vi thì bọc ở tầng trên (`src/core/`).

Lý do: khi `0.27.0` được publish, việc thay thư mục này bằng dependency npm phải chỉ là xoá
thư mục và bỏ alias trong `tsconfig.json` + `vite.config.ts`. Sửa một chỗ ở đây là mất khả
năng đó.

Specifier kiểu `./vec.js` trỏ vào file `.ts` được plugin `vendor-js-to-ts` trong
`vite.config.ts` xử lý, **không** phải bằng cách sửa mã.

## Đã bỏ khi chép

- `global/src/lit/` — chỗ duy nhất dùng Lit; React thay tầng khung nhìn
- `store/src/test/`, mọi `__tests__/` — khung kiểm thử của thượng nguồn, ta không dùng
