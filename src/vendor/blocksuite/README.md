# Mã vendored từ BlockSuite — KHÔNG SỬA

Xuất xứ: `AFFiNE/blocksuite/{framework,affine}`, phiên bản **0.27.0**. Giấy phép **MIT** —
xem `LICENSE` trong thư mục này. Dòng bản quyền phải ở lại: MIT bắt buộc giữ nó trong bản
phát hành, và PWA phục vụ JS cho trình duyệt chính là phát hành.

## Quy tắc

**Cấm sửa một chữ nào trong thư mục này.** Muốn đổi hành vi thì theo thứ tự:

1. Viết một extension — đúng cách AFFiNE tự dựng mọi thứ của họ
2. `di.override(...)` để thay một dịch vụ có sẵn
3. Bản đồ chuỗi / đổi tên lúc build (D12, D16) — xem `scripts/dich-vendor.mjs`
4. File vá áp lúc build (D14) — chỉ khi ba cách trên không đủ

Lý do: giữ bản chép sạch thì nâng cấp = xoá thư mục, chép bản mới. Sửa vào đây một chỗ là
mỗi lần nâng cấp phải tự tay ghép lại từng sửa đổi — tức là bị ghim.

## Cổng kiểm

```bash
npm run kiem:vendor
```

So từng file `.ts` với thượng nguồn sau khi chuẩn hoá xuống dòng. **Không dùng `cmp`** —
repo có `core.autocrlf=true` nên `cmp` báo khác trên mọi file dù nội dung giống hệt.
