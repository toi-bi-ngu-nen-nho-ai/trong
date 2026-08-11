# Test của tầng lõi

## `accessor-support.spec.ts` — ca canh gác vật cản `accessor`

File này chỉ có một ca: dịch được một class `accessor x: number = 1` và đọc/ghi được giá trị
qua nó. Nó tồn tại để **canh gác** vật cản mô tả bên dưới — nếu ai đó sau này đổi
`vite.config.ts` (nâng cấp Vite/rolldown/oxc, đổi cách nối Babel, ...) và vô tình làm gãy khả
năng dịch `accessor`, ca này đỏ trước, thay vì phải chờ tới khi `surface.spec.ts` đỏ hàng loạt
mới lần ra nguyên nhân.

### Vì sao `accessor` quan trọng

`accessor` là cách BlockSuite khai **mọi thuộc tính của mọi element** — luôn đi kèm decorator
kiểu `@field()`/`@local()`/`@derive()`. Trong bản port hiện tại nó xuất hiện ở:

- `src/core/gfx/model/surface/element-model.ts`
- `src/core/gfx/model/surface/local-element-model.ts`
- `src/core/__tests__/fixtures/test-gfx-element.ts`

Mọi phần tử của P1 (shape, connector, brush, text, mindmap) sẽ khai bằng cú pháp này, nên đây
từng là vật cản của cả P1, không riêng gì test.

## `surface.spec.ts` — 22 ca hành vi của tầng model (đã bật)

Bản port của `framework/std/src/__tests__/gfx/surface.unit.spec.ts` (26 ca ở bản gốc; 22 ca
sống sót qua Task 5 — bốn ca chênh lệch là việc porting trước đó, không phải của Task 6, chưa
điều tra ở đây), phủ `SurfaceBlockModel.addElement/updateElement/deleteElement`, observer, giá
trị mặc định của element model, `stash`/`pop`, và cả bốn decorator `field`/`derive`/`local`/
`convert`.

Từng nằm ở đuôi `.pending` vì toolchain không dịch được `accessor` (xem lịch sử git). Đã gỡ ở
Task 6 P0-B — xem `vite.config.ts`, hàm `accessorSupport()`, có giải thích đầy đủ cách gỡ và
hai hướng đã thử hỏng trước đó.

### Tóm tắt vật cản đã gỡ

Toolchain của dự án (Vite 8.1.5 → rolldown + oxc, không có Babel tích hợp) **phân tích cú pháp**
được từ khoá `accessor` nhưng **không hạ cấp (lower)** nó — giữ nguyên văn trong output. Trình
chạy JS (Node lúc test, engine trình duyệt lúc build) mới là nơi thực sự ném:

```
SyntaxError: Unexpected identifier 'x'
   class A { accessor x: number = 1 }
```

Đổi `target` trong cấu hình oxc không có tác dụng — đã kiểm chứng lại ở Task 6 bằng cách gọi
thẳng `transformSync` của oxc với nhiều `target` khác nhau, output giống hệt nhau. Đây không
phải chuyện esnext-hoá cú pháp đã hỗ trợ, mà là tính năng oxc chưa cài đặt transform.

**Cách gỡ:** thêm một Vite plugin (`accessorSupport()` trong `vite.config.ts`, `enforce: 'pre'`)
chạy Babel (`@babel/plugin-proposal-decorators` bản `2023-05`) làm bước biên dịch trước oxc,
**chỉ** cho file trong `src/core/**` có chứa từ khoá `accessor` (lọc theo nội dung, không theo
cả thư mục — hiện tại 3 file). Chạy **hai lượt** Babel riêng biệt (strip TypeScript trước, hạ
decorator+accessor sau) vì gộp chung một lượt gây xung đột visitor giữa `preset-typescript` và
`plugin-proposal-decorators` trên field kiểu `x!: T;` không initializer nằm chung class với
field có `accessor` (xem comment đầy đủ trong `vite.config.ts` — có ghi cả hai hướng thử hỏng
trước khi ra cách này).

**Chi phí đo được** (`npm run build`, xem `.superpowers/sdd/task-6-report.md` để có số đầy đủ):
kích thước bundle **không đổi** (995.95 kB / gzip 331.38 kB — bit-for-bit giống hệt trước và
sau) vì hiện chưa có gì trong app import tầng model này, bundler vẫn tree-shake bỏ hết. Thời
gian build dao động trong khoảng nhiễu bình thường giữa các lần chạy, không có xu hướng chậm đi
rõ rệt.

**Không được sửa `src/vendor/blocksuite/**`** hay mã port ở `src/core/**` để né vật cản (D11) —
cách gỡ nằm hoàn toàn ở tầng biên dịch (`vite.config.ts`), không đụng một dòng mã nguồn nào.
