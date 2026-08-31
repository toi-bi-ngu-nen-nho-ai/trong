# BÀN GIAO

Cập nhật **2026-08-31**. Đọc §1 (đang mở) + §4 (ranh giới) trước khi làm; §2 tra khi cần.

- Lịch sử đầy đủ 42 chặng: **[`NHAT-KY-CHANG.md`](NHAT-KY-CHANG.md)**. Định thử một hướng nghe có
  vẻ hay thì tra bên đó trước — nhiều khả năng đã thử và đã hỏng, kèm phép đo.
- **"HANDOFF mục N" trong `src/` và `specs/` trỏ tới NHẬT KÝ, không phải file này** (di sản từ thời
  hai nội dung chung một file). Không sửa các chú thích đó.
- **Danh sách nợ không tự già đi cùng mã nguồn.** Mở mã kiểm lại trước khi lập kế hoạch — lượt
  2026-08-29 thấy 3/5 khoản đã đóng từ lâu mà không ai cập nhật.

---

## 1. ĐANG MỞ

**Deploy Vercel chậm thêm vài phút mỗi lần — ĐÃ QUYẾT: không làm.** `postinstall` dựng lại
`.vendor-build/` từ đầu trên CI (checkout luôn sạch; cục bộ nó bỏ qua khi cổng đã xanh). Cân nhắc
2026-08-31 và bác: không đo được thời gian build Vercel từ máy dev, nên sẽ là một lớp cache viết mù.
Khoá cache thì đã có sẵn nếu sau này cần — `bang-bam-vendor.json` là băm SHA-256 toàn cây vendored,
đã commit, nên "khoá đổi ⇒ dựng lại" là đúng theo cấu tạo, không sợ phục vụ cây cũ. **Chỉ làm khi
có một lượt deploy thật bị chặn vì nó**, và làm thì đo trước/sau.

**Ảnh (blob) của bảng đã xoá vẫn ở lại.** `xoaNoiDungBang` dọn doc + khoá viewport, nhưng
`IndexedDBBlobSource` lưu blob ở HAI DB riêng (`drtrong-board_blob`, `drtrong-board_blob_mime`) và
đánh khoá theo **băm nội dung ảnh**, không theo id bảng — không có cách nào biết ảnh nào của bảng
nào nếu không mở doc ra dò tham chiếu, và một ảnh có thể dùng chung giữa hai bảng. Muốn dọn đúng
phải viết một lượt gom rác: đọc mọi doc CÒN LẠI, thu tập khoá blob được tham chiếu, xoá phần thừa.
Chưa ai báo; nặng hay nhẹ tuỳ người dùng có dán ảnh vào bảng hay không.

---

## 2. LUẬT THAO TÁC — mỗi dòng là một lượt đã mất

### 2.1 Bằng chứng từ lệnh chạy

- **Không nối `| tail` khi chạy test.** Vitest in ca đỏ TRƯỚC khối tổng kết; ống dẫn còn nuốt mã
  thoát. Ghi ra file rồi mở file đọc.
- **Mã thoát chỉ đúng khi lệnh cuối chuỗi là thứ cần đo.** `npx tsc … ; echo "exit=$?"` luôn báo 0
  (mã của `echo`). Bắt vào biến: `... > log.txt 2>&1; MA=$?; echo "$MA"; cat log.txt`.
- **Đọc vitest phải nhìn đủ ba:** mã thoát thật, dòng `Test Files` (đỏ-cấp-file không hiện ở dòng
  `Tests`), và tổng số ca so lượt trước (tụt số ca mà không ca nào đỏ = có file không nạp được).
- **Đừng chạy `tsc` song song `vitest`** (đã gây `UNKNOWN: unknown error, read` trên Windows).
- **`EBUSY ... watch '.tmp-test-*'` là RÁC TẠM, không phải ca đỏ.** Lượt chạy chết giữa chừng, KHÔNG
  in dòng `Test Files` nào — dấu hiệu nhận ra. Chạy lại là xanh; không có bản tổng kết thì đừng đọc
  thành hồi quy.
- **Tắt dev server trước khi chạy suite** — server thừa từng làm worker timeout, đọc nhầm thành hồi quy.

### 2.2 Đo trên trình duyệt

- **Số tương phản phải kèm NỀN đo trên đó.** Đã vấp ba lần (4,89:1 trên thẻ trắng → 4,12:1 trên pill).
- **Đo hình học trên phần tử có `transition` thì chờ quá transition dài nhất** (đo ở 500ms từng cho
  `marginTop: 0px` giả; chờ 1200ms mới ra 10px).
- **`backgroundColor` computed rơi xuyên gradient** xuống nền app → số AA giả. Đi ngược cây cha tìm
  màu đục thật.
- **Kiểm phải VÀO RỒI RA** — bấm vào, thoát ra, sang màn khác, quay lại. "Mở lên chạy đúng" không đủ.
- **Kiểm bản build phải GỠ SERVICE WORKER trước**, nếu không đang đo mã CŨ (`public/sw.js`
  cache-first cho chunk lazy). Dấu hiệu: lượt chạy xong NHANH HƠN cả hạn giờ vừa thêm vào mã.
  `for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();`
  `for (const k of await caches.keys()) await caches.delete(k);`
- **`text-decoration` và `background-color` KHÔNG kế thừa** — `getComputedStyle` trên phần tử mang
  chữ trả "none"/"rgba(0, 0, 0, 0)" dù cha có đặt (trình duyệt vẽ chúng từ cha phủ xuống). Muốn đọc
  thì đi ngược lên cha, và phải CHẶN đúng phần tử bọc: không chặn thì vớ luôn màu thân thẻ ghi chú.
  `color`/`font-*` thì kế thừa bình thường — đó là lý do đậm/nghiêng vào ảnh được mà gạch chân không.
- **Đừng lọc "http" trần khi lọc tài nguyên ngoài miền của SVG** — mọi `<svg>` mang
  `xmlns="http://www.w3.org/2000/svg"`, nên phép lọc thô loại SẠCH 100% biểu tượng, âm thầm (ảnh
  vẫn xuất ra, chỉ thiếu đúng thứ vừa thêm). Lọc theo `href=`/`url(`.
- **Đừng chờ bằng `requestAnimationFrame`** — rAF không chạy khi tài liệu ẩn (tab nền, pane bị
  giấu). Một lượt xuất ảnh từng treo vĩnh viễn ở đúng đó. Nhịp chờ đi bằng `setTimeout`.
- **Browser pane bị GIẤU thì không kiểm được gì cần render.** rAF im, ảnh chụp ra ĐEN, và
  BlockSuite không bao giờ dựng khối note — trông y hệt mã hỏng. `tabs_select` và `preview_start`
  KHÔNG mở pane ra được (đã thử, `tabs_context` vẫn báo hidden): phải nhờ chủ dự án bật. Kiểm
  `document.visibilityState` + một lượt rAF có hạn giờ TRƯỚC khi kết luận bất cứ điều gì.
- **Dải xác nhận hai bước tự rút sau 5 giây** (`XAC_NHAN_XOA_MS`). Bấm bước 1 rồi bước 2 ở HAI lượt
  gọi công cụ khác nhau là thua: nhịp đầu đã hết hạn, cú bấm thứ hai chỉ mở lại dải. Cả hai cú phải
  nằm trong CÙNG một lượt chạy JS.
- **Khối tạo bằng `store.addBlock()` trần không render**; và edgeless **cull** khối ngoài khung nhìn
  (đo ra 0×0). Muốn đo thẻ ghi chú thật thì tạo bằng thanh công cụ.
- **Hàm hình học vendored nhận `IVec` = MẢNG `[x, y]`, không phải `{x, y}`.**
  `viewport.setViewport(zoom, center)` đọc `newCenter[0]/[1]`; truyền object gán `_center.x =
  undefined` mà KHÔNG ném lỗi → khung nhìn hỏng âm thầm (zoom vẫn đúng nên nhìn qua tưởng lành).
  Đọc chữ ký ở `framework/std/src/gfx/viewport.ts` trước khi gọi.
- **Đừng đếm khung hình để chờ khối hiện ra.** BlockSuite hoãn render ĐẦU của mỗi khối qua rAF, chia
  lô `maxConcurrentRenders` mỗi khung (`viewport-element.ts`, `scheduleUpdateChildren`). Kiểm thẳng
  trạng thái muốn có + hạn giờ, như `doiNoiDungToi()` ở EdgelessBoard.tsx.
- **Đừng dời khung nhìn của người dùng như tác dụng phụ.** Lượt xuất PNG từng fit vô điều kiện: bảng
  thu nhỏ hết cỡ 1,5 giây rồi nhảy về ("màn hình cứ nhấp nháy", 2026-08-31). Chỉ dời khi thật sự cần,
  và che lại trong lúc dời.
- **Dọn sau khi đo:** xoá bảng/dữ liệu thử khỏi IndexedDB + localStorage, tắt dev server.

### 2.3 Tin vào ca kiểm tới đâu

- **Ca kiểm xanh nhiều chặng vẫn có thể đang chứng minh một đường đi KHÁC với lời bình luận của nó.**
  Hai ca "kéo" (Hình, Bút) xanh nhiều tháng mà chưa từng chạy qua đường kéo — chúng đi nhánh `click()`.
- **Cơ chế nằm NGOÀI DOM** (bàn phím ảo, cử chỉ hệ điều hành, quyền): kiểm trên thiết bị thật TRƯỚC,
  rồi mới bọc ca kiểm quanh cái đã biết là chạy. Đã có lượt 18 ca xanh cho thứ không chạy trên máy thật.
- **Ca kiểm cho một cuộc đua phải được CHỨNG MINH LÀ ĐỎ trước khi vá.** Ca "seed root trùng" từng
  xanh cả khi guard bị vô hiệu hoá, hai lần, hai lý do khác nhau.
- **Xác minh finding trước khi sửa** — tỉ lệ dương tính giả của critique/máy dò đã đo được là cao
  (2/6 một lượt; 4/9 một lượt khác).

### 2.4 Cây git dùng chung

Nhiều phiên cùng chạy trên thư mục này. Đã xảy ra: một phiên khác commit **cuốn theo** edit dở dang
của phiên này.

- **Luôn `git status` TOÀN BỘ trước khi commit.** Thấy file lạ thì `git diff` trước; không phải việc
  của mình thì **không stage**. Cùng một file hai bên sửa thì tách hunk.
- **Đừng dùng `git stash` để tách hunk trên cây dùng chung** — pop xung đột từng để lại dấu
  `<<<<<<<` và phiên kia commit luôn vào `main`.
- `resume` báo "no transcript" thì kiểm `git status`/`git diff` trước — subagent có thể đã làm xong
  một phần trước khi chết.

---

## 3. CỔNG KIỂM

| Cổng | Lệnh | Canh gì |
|---|---|---|
| Kiểu | `npx tsc --noEmit -p tsconfig.json` | `src/` + cây vendored qua `tsconfig.vendor-paths.json` |
| Test | `npx vitest run` | **58 file / 548 ca** (2026-08-31) |
| D11 | `npm run kiem:vendor` | Cây vendored khớp nguyên văn thượng nguồn, VÀ checkout `BLOCKSUITE_UPSTREAM` còn ở SHA trong `commit-thuong-nguon.txt`. Lệch thì cổng tự in cảnh báo + lệnh dán-là-chạy TRƯỚC danh sách `LỆCH:`. |
| Bản đồ paths | `npm run kiem:vendor-paths` | `tsconfig.vendor-paths.json` còn tả đúng `.vendor-build/` |
| D16 + biến CSS | `npm run build` (tự chạy `kiem:dist` ở `postbuild`) | Bản PHÁT HÀNH: không còn `affine-`, mọi `--drt-*` được dùng đều có định nghĩa, bản dịch `vi.json` còn nguyên. Cổng DUY NHẤT nhìn vào `dist/` — từng bắt 81 biến CSS không phân giải mà console vẫn sạch. |

- `npm run dung:vendor` dựng lại `.vendor-build/` (vài phút). Nó **không** kéo lại từ thượng nguồn →
  không sửa được lệch do checkout trôi khỏi SHA pin; cái đó phải `git -C "$BLOCKSUITE_UPSTREAM"
  checkout <SHA>` theo lệnh cổng in ra.
- **Đừng nâng cây vendored lên `canary`** trừ khi thật sự cần một bản vá thượng nguồn — việc lớn
  (dựng lại toàn bộ + pipeline dịch + kiểm hồi quy Mindmap).
- **Hạn giờ chờ trong test có MỘT nguồn sự thật:** `src/__tests__/helpers/cho-den-khi.ts`,
  `HAN_GIO_CHO_MS = 8000`. Nâng thì phải nâng `testTimeout` trong `vite.config.ts` theo, giữ nguyên
  khoảng cách — để thứ hết giờ trước là lượt chờ (ném đúng câu `expect` đã hỏng), không phải cả test.

---

## 4. RANH GIỚI KHÔNG ĐƯỢC VƯỢT

- **D11 — `src/vendor/blocksuite/` là bản sao nguyên văn thượng nguồn.** Không sửa. Mọi thay đổi
  hành vi nằm ở `src/board/` hoặc pipeline `scripts/`. Ca kiểm chạm cây vendored phải khai kiểu tối
  thiểu tại chỗ (`SurfaceLike`, `GfxLike`, `CrudLike`), không import kiểu xuyên ranh giới.
- **D13 — chunk Mindmap nạp chậm.** Cả chồng BlockSuite nằm sau `React.lazy`. Import tĩnh từ
  `BoardGallery.tsx`/`App.tsx` vào bất cứ thứ gì kéo theo BlockSuite là lôi cả chồng vào chunk vỏ
  app cho mọi người dùng. Dùng `import()` động.
- **D16 — bản phát hành không được lộ tên thượng nguồn.** Pipeline `scripts/doi-ten-vendor.mjs` đổi
  `affine-` → `drt-` khi dựng. Nên mã của app đừng ghim tiền tố cứng: selector chạm cây vendored
  phải khớp được cả hai (vd `[class*="list-block__prefix"]`), nếu không một lượt đổi tên nữa sẽ tắt
  nó âm thầm. (`affine:page`/`affine:surface` là FLAVOUR trong dữ liệu — cố ý KHÔNG đổi.)
- **CSS BlockSuite rò ra toàn app** nếu không chặn bằng lớp `drt-vendor`. Câu lệnh
  `@layer drt-vendor;` trong `src/index.css` phải đứng TRƯỚC mọi `@import` (không phải "dòng đầu
  tệp" — nó nằm sau khối chú thích); đừng xoá nó, đừng xoá lời gọi `batLopCssVendor()`.
- **npm là công cụ quản gói duy nhất** (`pnpm-lock.yaml` đã gỡ — nó tả một dự án 2 dependency cho
  một `package.json` có 67 dependency, chưa kể 19 devDependency).

---

## 5. NGƯỜI DÙNG VÀ PHẠM VI

- **Đối tượng: bác sĩ lâm sàng đang trực**, không phải sinh viên y khoa. Đừng đề xuất glossary. Thứ
  cần nhìn ngay là con số đem đi đặt bơm.
- **DESIGN.md là luật màu.** Thứ ồn nhất trên màn liều luôn là tín hiệu nguy hiểm, không bao giờ là
  thương hiệu. Một hex cứng trong component là bug.
- **MindmapScreen là "phòng não phải"** — được đẩy hiệu ứng xa nhất rồi để chủ dự án cắt. Các màn
  còn lại ngược lại: đọc nhanh, ít chuyển động.
- **`/impeccable critique` MindMapScreen chỉ sửa React app**, không đụng cây vendored (D11).

---

## 6. BẢN ĐỒ TÀI LIỆU

| File | Nội dung |
|---|---|
| [`NHAT-KY-CHANG.md`](NHAT-KY-CHANG.md) | 42 chặng đã xong, kèm những đường đã thử và hỏng |
| [`../../AGENTS.md`](../../AGENTS.md) | Dev server, package manager, quy ước git |
| [`../../DESIGN.md`](../../DESIGN.md) | Bảng màu, thang chữ, luật chuyển động |
| [`../../PRODUCT.md`](../../PRODUCT.md) | Roadmap tính năng |
| `plans/` | Kế hoạch từng chặng (18 file) |
| `.impeccable/critique/` | Báo cáo critique đã lưu |
| `src/vendor/blocksuite/README.md` | Luật D11 đầy đủ |
