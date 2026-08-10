// Thay ràng buộc Lit của BlockSuite ở tầng model.
//
// `model/base.ts` và `model/gfx-block-model.ts` của thượng nguồn khai
// `import type { EditorHost } from '../../view/...'` — EditorHost là một Lit custom element.
// Nhưng cả hai đều là `import type`: nó CHỈ dùng làm kiểu, không có mã Lit nào chạy. Vì thế
// ta khai một kiểu tối giản thay vì port cả tầng `view/`.
//
// Khi P1.0 dựng EdgelessHost bằng React, kiểu này là chỗ khai những gì host thật phải cung cấp.
// Hiện tại tầng model chỉ dùng nó ở vị trí tham số nên để rỗng là đủ và trung thực — thêm thành
// viên khi có chỗ thật sự cần, không đoán trước.
export interface EditorHost {}
