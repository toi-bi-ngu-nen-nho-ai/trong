// Duyệt đệ quy một cây thư mục, trả về mọi file .js.
//
// Xuất ra dùng chung vì hai bước hậu xử lý .vendor-build/ — đổi tên (D16) và dịch chuỗi (D12) —
// duyệt đúng một cây theo đúng một cách. Để mỗi bên giữ một bản sao y hệt là mời gọi chúng lệch
// nhau đúng vào lúc một bên cần đổi cách duyệt (bỏ qua một thư mục, đổi phần mở rộng), rồi bên
// kia lặng lẽ ở lại cách cũ.
//
// Tiền lệ trong repo: scripts/tao-bam-vendor.mjs cũng xuất dietFileVendor để dùng chung. Các hàm
// duyệt khác (kiem-vendor.mjs, kiem-dist.mjs) KHÔNG gộp vào đây vì chúng khác chữ ký và khác bộ
// lọc thật — gộp chúng lại sẽ đẻ ra tham số cấu hình cho một việc vốn đơn giản.
import { readdir } from 'node:fs/promises'
import path from 'node:path'

export async function* dietJs(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) yield* dietJs(f)
    else if (e.name.endsWith('.js')) yield f
  }
}
