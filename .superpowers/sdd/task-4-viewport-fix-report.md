# Task 4 — Sửa lỗi runtime "ViewportElementProvider: viewport element is not found"

## Nguyên nhân (đã có sẵn trong brief, xác nhận lại)

`ViewportElementExtension('.drt-edgeless-viewport')` (đã xác nhận đúng dạng đã đổi tên trong
`.vendor-build/affine/blocks/root/src/view.js:30`) đăng ký một provider mà `getViewportElement()`
(`.vendor-build/affine/shared/src/utils/dom/viewport.js:12-15`) phân giải bằng
`editorHost.closest('.drt-edgeless-viewport')` — đi **ngược lên** từ editor host. `EdgelessBoard.tsx`
trước đây chỉ gắn cây Lit thẳng vào một `<div>` trần không có tổ tiên nào mang class đó, nên lookup
luôn thất bại.

## Thay đổi

1. **`src/board/EdgelessBoard.tsx`** — bọc thêm một `<div className="drt-edgeless-viewport block
   h-full relative overflow-clip">` bên ngoài div gắn `hostRef` (không đổi hostRef, giữ nguyên ranh
   giới "React chỉ giữ chỗ"). Bốn class Tailwind ánh xạ đúng bốn thuộc tính CSS gốc của AFFiNE
   (`display: block`, `height: 100%`, `position: relative`, `overflow: clip`).
2. **`src/index.css`** — thêm rule `.drt-edgeless-viewport { container-type: inline-size;
   container-name: viewport; }`. Hai thuộc tính này KHÔNG ánh xạ được sang utility Tailwind thường
   (Tailwind v4 chỉ có `@container` cho container-type, không đặt tên riêng qua class), nên khai
   trực tiếp bằng CSS. Bắt buộc đúng tên "viewport": nhiều nơi trong cây vendor
   (`affine/widgets/edgeless-zoom-toolbar`, `affine/fragments/doc-title`, `affine/blocks/root/page`)
   viết thẳng `@container viewport (width <= ...)`, thiếu container-name thì các truy vấn đó không
   bao giờ khớp.
3. Không thêm `data-theme` — không tìm được nguồn xác định giá trị đúng (sáng/tối) từ mã đang chạy
   tại đây mà không đoán, nên để trống theo đúng yêu cầu của brief. Xem mục "Việc chưa xong" bên dưới.

Không đụng vào bất kỳ file nào dưới `src/vendor/blocksuite/`.

## Kiểm chứng trong trình duyệt thật (http://localhost:8444, tab Mindmap)

1. **Console sạch lỗi ViewportElementProvider** — Đúng. Sau khi mở tab Mindmap và đợi chunk board
   tải xong, console chỉ còn: `[vite] connecting/connected`, cảnh báo React DevTools, cảnh báo
   "Lit is in dev mode", và 3 dòng `Failed to load resource: 404` LẶP LẠI (x2 do 2 lượt HMR reconnect
   trong phiên) — đây là lỗi tải **source map** (`drt-link.js.map`, tương tự cho các file đổi tên
   khác), xác nhận qua log server (`ENOENT ... drt-link.js.map`). Lỗi này **có trước** thay đổi này
   (xuất hiện y hệt khi chạy `npm test`, không liên quan `EdgelessBoard.tsx`/`index.css`) — là tác
   dụng phụ của việc đổi tên `affine-*` → `drt-*` lúc build (Task 3), không phải lỗi mới do fix này
   sinh ra. Không có lỗi runtime BlockSuite nào khác xuất hiện.

2. **Board vẫn mount, chỉ còn prefix `drt-`** — Đúng. Custom element có mặt:
   `drt-edgeless-root, drt-surface, drt-toolbar-widget, drt-viewport-overlay-widget,
   drt-edgeless-zoom-toolbar-widget, drt-drop-indicator` (và các widget khác quan sát được trong DOM
   tree, ví dụ `edgeless-toolbar-widget`, `edgeless-selected-rect`... — các thẻ này vốn KHÔNG có
   prefix `affine-`/`drt-` trong tên gốc, không thuộc diện đổi tên). Số phần tử mang tiền tố
   `affine-`: **0**.

3. **Wrapper là tổ tiên thật của editor host, `closest()` phân giải đúng** — Đúng. Kiểm bằng:
   `std.host.closest('.drt-edgeless-viewport') === wrapperElement` → `true`.

4. **Kích thước canvas thật** — wrapper đo được `width: 1280px, height: 671.33px` (không phải 0).
   `getComputedStyle(wrapper).containerType === "inline-size"`,
   `getComputedStyle(wrapper).containerName === "viewport"` — đúng cả hai giá trị khai trong CSS.

5. **Zoom hoạt động** — Kích hoạt editor trước (dispatcher của BlockSuite chỉ xử lý sự kiện khi
   `std.event.active === true`, bật bằng `pointerdown`/`click` trên editor host — chi tiết này không
   nằm trong brief, tự dò ra từ `framework/std/src/event/dispatcher.ts`), sau đó dispatch
   `WheelEvent('wheel', { ctrlKey: true, deltaY: -240, ... })` lên `<canvas>` bên trong bảng.
   - Zoom trước: `1`
   - Zoom sau: `1.1`
   → khác nhau, xác nhận zoom hoạt động qua đúng đường sự kiện thật của app (không gọi thẳng
   `viewport.setZoom()`).

6. **Pan hoạt động — bằng cử chỉ thật (kéo chuột giữa), không phải gọi thẳng API** — Dò đúng cơ chế
   trong `affine/gfx/pointer/src/tools/pan-tool.ts`: giữ nút chuột giữa (`button === 1`) tại
   `pointerdown` chuyển tool sang `PanTool` tạm thời, các `pointermove` kế tiếp (giữ `buttons: 4`)
   đẩy delta vào `viewport.applyDeltaCenter`. Mô phỏng đúng chuỗi
   `pointerdown(button:1) → 8×pointermove → pointerup` trên `<canvas>`:
   - Tâm trước: `{ x: 0, y: -0.0000018 }`
   - Tâm sau: `{ x: 72.73, y: 43.64 }`
   → khác nhau rõ rệt, xác nhận pan hoạt động qua đúng cử chỉ kéo chuột giữa của desktop.

## Các cổng kiểm

7. `npx tsc --noEmit` → **exit 0**.
8. `npm test` → **16 file / 73 test PASS** (khớp số brief nêu). Log in ra 3 cảnh báo sourcemap
   `drt-*.js.map` không tồn tại — cùng loại lỗi console mục 1, không ảnh hưởng kết quả test.
9. `npm run kiem:vendor` → **exit 0** — "Đã so 2776 file, lệch 0, không đối chiếu được 0".

## Việc chưa xong / lưu ý

- **`data-theme` trên wrapper**: cố tình bỏ trống. Không tìm được trong mã đang chạy một nguồn
  "theme hiện tại" mà `EdgelessBoard.tsx` có thể đọc mà không đoán (app có `data-theme` trên `<html>`
  do `src/lib/theme.ts` set cho giao diện React, nhưng đó là một hệ thống theme HOÀN TOÀN khác của
  ứng dụng nhúng, không phải theme nội bộ mà AFFiNE dùng cho chính div wrapper của nó — gán nhầm giá
  trị đó vào có thể sai theo đúng cảnh báo của brief "một giá trị theme sai còn tệ hơn không có gì").
- 3 lỗi console "Failed to load resource: 404" là lỗi tải source map (`.map` file thiếu cho các file
  đã đổi tên `affine-*.js` → `drt-*.js.map`), tồn tại từ trước thay đổi này (Task 3, phần đổi tên lúc
  build), không phải lỗi mới sinh ra bởi fix trong task này. Không sửa trong phạm vi task này vì brief
  yêu cầu chỉ báo cáo lỗi mới nếu phát hiện, không tự ý mở rộng phạm vi.
- Không phát hiện lỗi runtime BlockSuite mới nào khác sau khi sửa.
