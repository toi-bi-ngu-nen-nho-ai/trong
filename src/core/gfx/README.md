# `src/core/gfx/` — mã **port** từ BlockSuite, không phải mã tự viết

Nếu bạn mở `element-model.ts` và thấy 617 dòng comment tiếng Anh giữa một dự án tiếng Việt: đúng
vậy, đó không phải phần "chưa ai dịch". **Đừng dịch nó.** Đây là mã port nguyên thân hàm từ
thượng nguồn BlockSuite, chỉ sửa đường dẫn import.

## Xuất xứ

`AFFiNE/blocksuite/framework/std/src/gfx/`, phiên bản **0.27.0**.

## Luật port (khác với `src/vendor/blocksuite/`)

`src/vendor/blocksuite/` (D11) **cấm sửa hoàn toàn** — kể cả import, kể cả chiều lint — vì mục
tiêu là thay bằng dependency npm nguyên khối ngay khi `0.27.0` được publish.

`src/core/gfx/` **khác**: thượng nguồn dùng Lit, dự án này dùng React, nên tầng này bắt buộc phải
port (chép rồi sửa) chứ không thể vendor nguyên khối. Luật ở đây lỏng hơn D11 nhưng vẫn nghiêm:

- **Giữ nguyên thân hàm và comment gốc (tiếng Anh)** của thượng nguồn. Không "dọn dẹp", không
  dịch, không rút gọn, không đổi tên biến/hàm/kiểu.
- **Chỉ được sửa đường dẫn import** — bỏ đuôi `.js` để khớp resolver của dự án, đổi sang alias
  `@blocksuite/*` khi trỏ vào tầng vendored, đổi đường dẫn tương đối khi cấu trúc thư mục port
  khác thượng nguồn.
- Cần đổi hành vi thật sự (không chỉ import)? Bọc ở một lớp khác, đừng sửa trực tiếp thân hàm đã
  port. Ghi lại lý do trong commit hoặc kế hoạch liên quan.

## Trước khi sửa bất cứ gì ở đây

Chạy `diff --strip-trailing-cr` với file gốc tương ứng trong
`AFFiNE/blocksuite/framework/std/src/gfx/` để biết chính xác đang lệch chỗ nào so với thượng
nguồn, trước khi đổi bất cứ dòng nào — kể cả sửa lỗi, kể cả thêm export vào barrel.

Xem thêm `docs/superpowers/plans/2026-08-11-p0b-tang-model-gfx.md` và
`docs/superpowers/specs/2026-08-11-blockkit-edgeless-design.md` (D10/D11) để có bối cảnh đầy đủ.
