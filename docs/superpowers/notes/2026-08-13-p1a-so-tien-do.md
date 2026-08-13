# Sổ tiến độ — P1-A: nhúng Edgeless Canvas

> **Bản chép lại để bàn giao.** Bản gốc nằm ở `.superpowers/sdd/progress.md`, thư mục đó bị
> `.gitignore` nên không qua được sang máy hoặc tài khoản khác. File này là bản đông cứng lúc
> chặng P1-A kết thúc (2026-08-13); nó **không** được cập nhật nữa. Trạng thái hiện hành đọc ở
> `docs/superpowers/HANDOFF.md`.


Kế hoạch: `docs/superpowers/plans/2026-08-12-p1-nhung-edgeless.md`
Worktree: `.claude/worktrees/p1a-nhung-edgeless` · nhánh `worktree-p1a-nhung-edgeless`
Gốc nhánh (MERGE_BASE): `afac297`

## Quyết định đã chốt ở phiên này

- **Tiền tố `drt`** (Doctor Trọng) thay `affine` — chủ dự án duyệt 2026-08-12.
  Thẻ DOM `drt-*`, biến CSS `--drt-*`. Kế hoạch đã cập nhật ở `fe368ea`.
- Thi hành trong **worktree riêng**, không đụng `main` cho tới lúc gộp.

## Vá kế hoạch trước khi thi hành (`fe368ea`)

1. Bộ che specifier ở Task 3 sót dạng `import 'x'` (không `from`, không ngoặc). Upstream có
   đúng 1 chỗ — `affine/blocks/list/src/list-block.ts:1` → `import '@blocksuite/affine-shared/commands'`
   — và `list` nằm trong danh sách cắt gọn. Vá cả bộ che lẫn `boSpecifier` của ca kiểm; hai chỗ
   phải khớp từng chữ.
2. Task 4 thiếu bước cài phụ thuộc npm: `main` có 16 dependency, nhánh probe cần 67. Thêm Step 0.
3. Task 1 Step 1 `cd` vào checkout gốc — gỡ, thay bằng phép xác nhận `git rev-parse --show-toplevel`.

## Baseline trước Task 1

`npx tsc --noEmit` exit 0 · `npm test` 62/62 xanh · 13 file test.

## Tiến độ

| Task | Trạng thái |
|---|---|
| 1 — vendor + cổng D11 | **xong** (`fe368ea..f520662`, review sạch sau 2 vòng vá) |
| 2 — dịch trước bằng tsc | **xong** (`f520662..bb8c7c6`, review sạch sau 2 vòng vá) |
| 3 — đổi tên drt-* + bản đồ dịch | **xong** (`bb8c7c6..92558a6`, review sạch sau 2 vòng vá) |
| 4 — cầu nối React↔Lit | **xong** (`92558a6..56729c4`, review sạch sau 2 vòng vá) |
| 5 — xoá src/core/gfx | **xong** (`56729c4..c38c32b`, review sạch) |

## Task 1 — chi tiết

Commit `54dbd8d` chép cây vendored (2.807 file) + cổng D11. Review duyệt spec nhưng nêu ba
lỗ hổng Important **trong thiết kế của chính cổng**, cả ba kế thừa nguyên văn từ kế hoạch:

1. `UPSTREAM` là đường dẫn tuyệt đối gắn cứng — cổng không thể xanh ở máy khác.
2. Cổng chỉ đi một chiều: bắt file cục bộ thừa, **không** bắt file thượng nguồn thiếu. Một lần
   chép nửa vời lúc nâng cấp sẽ rớt file mà cổng vẫn xanh.
3. Cổng chỉ so `.ts`, bỏ 70 `package.json` + 70 `tsconfig.json`. **Task 4 đọc đúng bản đồ
   `exports` trong các `package.json` đó** để phân giải specifier — nên đây là lỗ hổng thực chất,
   không phải chuyện hình thức.

Vá ở `ac42f15`: env `BLOCKSUITE_UPSTREAM` (mặc định giữ đường dẫn cũ) + kiểm tồn tại; quét
hai chiều, chỉ đi qua các thư mục gốc thực sự đã vendor (đọc từ đĩa) để tránh đỏ giả trên
`docs/`, `playground/`; mở rộng sang `.json`.

Re-review bắt một đường crash **do chính bản vá tạo ra**: thư mục gốc có ở cây vendor mà không
có ở thượng nguồn làm `readdir` ném ENOENT thô — đúng loại "đỏ vô nghĩa" mà header file này cảnh
báo. Vá ở `f520662`: bắt riêng ENOENT/ENOTDIR thành danh sách `gocThua` có thông điệp D11, lỗi
I/O khác vẫn ném tiếp; `thieu` đổi sang đường dẫn tương đối cho nhất quán.

Cổng hiện tại: **2.776 file, lệch 0, exit 0**. Đã chứng minh đỏ được cho cả bốn cách hỏng.

## Task 2 — chi tiết

`b6674d5` dịch cây vendored bằng `tsc` → `.vendor-build/` (2.550 file JS), thêm
`tsconfig.vendor.json` và ba ca kiểm decorator.

**Ca kiểm số 3 của kế hoạch sai và đã phải viết lại.** Nó soi 600 ký tự / 6 dòng thô phía trước
`super(` rồi khẳng định không có `this.`. Ở file thật, đúng 6 dòng đó là hai cặp getter/setter do
accessor hạ cấp sinh ra, nằm ngay trên constructor — chúng **được phép** chứa `this.` vì là method
gọi lúc chạy, không phải câu lệnh chạy trước `super()`. Ca đó đỏ trên output đúng. Đã neo lại vào
token `constructor(` để đo đúng thứ nó tuyên bố đo, kèm đột biến chứng minh: chèn `this.` trước
`super(...)` thì **chỉ ca 3 đỏ**, hai ca kia vẫn xanh — tức ca mới có sức phân biệt thật.
Bằng chứng ở `.superpowers/sdd/task-2-p1a-report.md`.

**Bốn commit vá sau đó, đều là hồi quy do Task 1 gây ra mà cả implementer lẫn reviewer Task 1 bỏ
sót vì không ai chạy `npm test`:**

- `bfc8ece` — vitest nuốt **75 file spec của chính BlockSuite** (`include: src/**/__tests__/**`).
  Bộ test từ 62/62 xanh tụt xuống 70/78 file đỏ. Thêm `exclude` cho `src/vendor/**`.
- `28b96c1` — ba alias `@blocksuite/*` trỏ vào `.ts` vendored; oxc lần theo chuỗi `extends` của
  `tsconfig.json` vendored ra ngoài cây (`AFFiNE/tsconfig.web.json`) rồi chết. Trỏ sang JS đã dịch
  trong `.vendor-build/` — không cần tsconfig, không cần transform TS.
- `47326b9` — `tsconfig.json` include `src` nên type-check luôn 2.634 file vendored: ~12.000 lỗi.
  Thêm `exclude: ["src/vendor"]`.
- `b84258b` — 4 lỗi còn lại: file khai báo kiểu môi trường `types/virtual-keyboard.ts` rơi khỏi
  chương trình vì không ai `import` nó. Nêu đích danh qua `files` (đã kiểm: `include` **không**
  thắng được `exclude`, phải dùng `files`).
- `bb8c7c6` — vá ba phát hiện review: cổng `scripts/kiem-vendor-build.mjs` chặn `dev`/`build`/`test`
  khi chưa có `.vendor-build/`; `defaultExclude` nhập từ `vitest/config` thay vì chép cứng; ghi bằng
  chứng đột biến còn thiếu.

Cổng sau Task 2: `tsc --noEmit` exit 0 · `npm test` 14 file / 65 ca xanh · `kiem:vendor` exit 0.

## Task 3 — chi tiết

`081e327` viết `scripts/doi-ten-vendor.mjs` + `src/board/vi.json` + 4 ca canh.
Kết quả biến đổi: **578 file · 575 đổi tên · 7 lượt dịch**.

**Kế hoạch viết `dung:vendor` bằng `&&` là sai và không chạy được.** `tsc -p tsconfig.vendor.json`
**luôn** exit khác 0 vì cây vendored có hàng nghìn lỗi kiểu — `noEmitOnError: false` chỉ điều khiển
việc emit, không điều khiển exit code. Nên `&&` khiến bước đổi tên **không bao giờ chạy** (đã kiểm:
chạy đúng chuỗi `&&`, grep `drt-` ra 0 kết quả). Bản vá đầu dùng `&` chạy được trên cmd.exe nhưng
dưới `sh` thì `&` là **chạy nền** — bước đổi tên đua với bước dịch chưa xong, cho ra bản build sai
mà im lặng. `463f800` thay hẳn bằng `scripts/dung-vendor.mjs` chạy tuần tự, không phụ thuộc shell.

**Hai phát hiện review, cả hai đều thật:**

- Luật đổi tên **làm hỏng tên gói nằm ngoài cú pháp import**. Bộ che chỉ phủ specifier, nên
  `@blocksuite/affine-block-surface` trong một doc comment thành `@blocksuite/drt-block-surface` —
  gói không tồn tại. Không gãy lúc chạy (comment không thực thi) nhưng phá đúng bất biến mà task này
  sinh ra để giữ, và sẽ tái diễn ở mọi lần nâng cấp. Bốn ca kiểm cũ **mù cấu trúc** với lỗi này.
- Cổng của `dung-vendor.mjs` **bị lừa bởi build cũ**: nó bỏ qua exit code của `tsc` (đúng) rồi chỉ
  kiểm ba file có tồn tại. Một lần dịch chết giữa chừng đè lên bản build trước vẫn qua cổng và in ra
  dòng thành công. Đã chứng minh: script cũ + tsconfig hỏng + `.vendor-build/` cũ → in "xong", exit 0.

`92558a6` vá cả hai: thêm lượt che thứ hai cho `@blocksuite/affine-…` ở mọi vị trí (hai bộ mốc rời
nhau, đã kiểm 0 mốc sót); xoá `.vendor-build/` trước khi dịch để cổng phản ánh đúng lần chạy này;
thêm ca kiểm đỏ khi có bất kỳ chuỗi `@blocksuite/drt-` nào trong output.

Cổng sau Task 3: `tsc --noEmit` exit 0 · `npm test` 15 file / 70 ca xanh · `kiem:vendor` exit 0.

## Task 4 — DỪNG GIỮA CHỪNG, đọc kỹ trước khi tiếp

**Phiên 2026-08-12 dừng ở đây vì tài khoản chạm giới hạn chi tiêu tháng.** Không phải lỗi kỹ thuật.
Mã của Task 4 đã commit ở `08e2da4` và mọi cổng đều xanh:

`tsc --noEmit` exit 0 · `npm test` 16 file / 73 ca · `kiem:vendor` exit 0 · `npm run build` thành công.

Đã cài 51 gói lấy từ nhánh probe (`npm install` cần `--legacy-peer-deps` vì `@blocksuite/icons`
đòi `@types/react@18`).

### Hai thứ kế hoạch không lường mà bắt buộc phải có

Implementer thêm, đã ghi lý do trong mã và trong `.superpowers/sdd/task-4-report.md`:

1. `tsconfig.vendor-paths.json` sinh tự động (437 subpath → `.d.ts` trong `.vendor-build/`). Cần vì
   `tsc` không chạy plugin của Vite; trỏ vào `.ts` vendored thì lòi 83 lỗi kiểu của thượng nguồn.
2. `@vanilla-extract/vite-plugin` — 3 file `.css.ts` trong khối Note ném lỗi lúc nạp module nếu thiếu.

### Ba việc còn lại — ĐÃ XONG CẢ BA (phiên 2)

1. Nối bảng vào màn Mindmap: `21f18e0`. 2. Tree-shaking: `44549b4`, chunk **1.836 → 993,69 kB gzip**,
kiểm cả ở bản build sản phẩm. 3. Review: xong, hai vòng vá (`4e724b7`, `56729c4`).

### Bốn phát hiện đáng nhớ của Task 4

- **`ViewportElementProvider: viewport element is not found`** — chỉ lộ ra khi mở thật trên trình
  duyệt. `RootViewExtension` đăng ký `ViewportElementExtension('.drt-edgeless-viewport')`, và provider
  phân giải bằng `std.host.closest(...)` — tức **đi ngược lên**. Nghĩa là phần tử đó phải do *ứng dụng
  nhúng* cung cấp; không gì trong cây vendored tự dựng nó. AFFiNE cũng bọc y hệt trong
  `edgeless-editor.ts`. Vá ở `74fc591`, kèm `container-name: viewport` / `container-type: inline-size`
  vì CSS vendored dùng container query trỏ vào container tên `viewport`.
- **Ba ca kiểm đầu tiên vẫn xanh kể cả khi xoá sạch cầu nối** — chúng chỉ gọi `taoBangTrong()`.
  Đã thêm ca mount thật (happy-dom, khai `@vitest-environment` theo file) + ca kiểm đăng ký custom
  element, có bằng chứng đỏ cho từng thứ chúng canh.
- **`import '@blocksuite/affine/effects'` trong kế hoạch là mã chết.** `effects.js` sau khi dịch
  đúng nghĩa đen là `export {};` — thượng nguồn chỉ import kiểu. Việc đăng ký thật đi qua
  `ViewExtensionProvider.effect()`. Đã gỡ và canh đúng đường thật.
- **`npm run format` (oxfmt) sẽ định dạng lại cả `src/vendor/blocksuite/`** — 2.764 file, đổi luôn
  kiểu nháy. Chạy nó là phá D11 và làm đỏ `kiem:vendor`. Chưa ai vấp, nhưng là mìn.

### Ba việc còn lại của Task 4 (bản ghi cũ, giữ để đối chiếu)

1. **Nối bảng vào app — chưa làm, và không có nó thì không ai nghiệm thu được.** Không chỗ nào
   trong app import `src/board`, nên bản build sản phẩm **không chứa chunk bảng** và mốc kiểm tay
   (Step 8) không thực hiện được. Chỗ đúng để nối: `src/App.tsx:11136`, hiện là
   `{screen === "mindmap" && <ComingSoonScreen feature="Mindmap" />}`. Thay bằng `EdgelessBoard`.
   Bắt buộc: import từ `src/board/index.ts` (barrel nạp chậm) **chứ không** từ `EdgelessBoard.tsx` —
   import thẳng là kéo cả bảng vào vỏ app, mất trọn lợi ích tách chunk; và phải bọc `<Suspense>`
   vì component là `React.lazy`. Dispatch cho việc này đã soạn xong nhưng bị chặn trước khi chạy.

2. **Chunk bảng 1.836 kB gzip, kế hoạch dự 1.131 kB.** Nguyên nhân đã đo được: `.vendor-build/`
   không có file `package.json` nào, nên rolldown không thấy `sideEffects: false` của thượng nguồn
   và **không tree-shake gì cả**. Chép 70 file `package.json` vào `.vendor-build` kéo xuống
   **993 kB gzip (−46%)**. Implementer **cố ý không áp** vì tree-shake mạnh hơn có thể vứt mất
   `import '@blocksuite/affine/effects'` (các lời gọi `customElements.define`) — chỉ trình duyệt
   mới bác bỏ được nghi ngờ đó. Áp sau khi việc 1 xong và mở được bảng thật.

3. **Review Task 4 chưa chạy.** BASE cho gói review là `92558a6`.

## Task 5 — chi tiết

`79b46ac` xoá **51 file / 8.925 dòng** dưới `src/core/` (gfx, utils, selection, __tests__).
Bộ test tụt từ 18 file / 75 ca xuống **8 file / 22 ca** — đúng như dự kiến, 10 file spec bị xoá
chỉ phủ mã port đã chết.

`viewport-runtime-config.spec.ts` chuyển sang `src/board/__tests__/`, trỏ vào
`@blocksuite/affine/std/gfx`, **5/5 xanh** — tức `Viewport` vendored hành xử giống bản port ở
đúng chỗ được canh. `afterEach` khôi phục trạng thái toàn cục vẫn nguyên, kể cả việc gán **mảng
mới** cho `CANVAS_DPR_CAP_BY_ZOOM` thay vì dựa vào spread nông.

**`accessorSupport()` được giữ lại, và giữ đúng.** Phép kiểm brief đưa ra là grep chữ `accessor`
nên khớp cả comment; nhưng `src/lib/__tests__/accessor-outside-core.spec.ts` **thật sự** khai
`accessor x: number = 1`, nên plugin và 5 devDependency Babel vẫn còn đối tượng.

`c38c32b` sửa comment `tsconfig.json` còn trỏ vào `src/core` vừa xoá.

## Review toàn nhánh — `deb6e8e`

Reviewer cuối bắt **hai Critical mà không cổng nào và không lượt kiểm trình duyệt nào bắt được**,
vì mọi cổng đều dừng ở `.vendor-build/`, không cổng nào soi `dist/`:

1. **Bảng ship ra không có một token màu nào.** Chunk bảng dùng **808** `var(--drt-…)` trong khi
   `dist/` có **0** định nghĩa. Định nghĩa nằm ở `@toeverything/theme` trong `node_modules/` —
   nơi bộ đổi tên với không tới — và **không file nào trong `src/` import nó**. Không lỗi, không
   cảnh báo: đúng thứ mà đếm thẻ DOM, đo kích thước và soi console đều không thấy. Đã vá bằng cách
   đưa `style.css` của theme vào chính đường ống đổi tên, phát ra `.vendor-build/theme/` rồi import
   từ `src/board/` để rơi vào chunk bảng. Tự kiểm sau khi vá: **1.100 định nghĩa `--drt-*` trong
   `dist/`, 0 chuỗi `affine-`**, và trên trình duyệt `--drt-primary-color` = `#1E96EB`.
2. **Mở app offline bằng lối tắt màn hình chính khoá chết cả app.** `manifest.json` có lối tắt
   `/?screen=mindmap`; service worker chỉ precache vỏ nên chunk bảng 4 MB chưa có khi offline;
   `React.lazy` reject lúc render, không có error boundary nào giữa nó và boundary gốc, nên **toàn
   bộ app** bị thay bằng fallback — và cách phục hồi duy nhất là reload, vốn giữ nguyên
   `?screen=mindmap` nên lặp lại. Trong PWA cài đặt thì không có thanh địa chỉ để thoát. Chặng này
   mới gây ra: trước đó lối tắt đó render màn tĩnh, chạy offline bình thường.

Sáu Important cùng vá: thông điệp cổng chỉ sai lệnh, `npm run format` bị **xoá hẳn** cùng
dependency `oxfmt` (0.2.0 không có cơ chế ignore nên mọi danh sách đường dẫn đều cách D11 một lần
sửa), tên file sourcemap, cổng D11 chạy được ở máy khác nhờ `bang-bam-vendor.json`,
`dist/THIRD-PARTY-LICENSES.txt` cho 6 giấy phép MIT, và gỡ `pnpm-lock.yaml` lỗi thời.

## Nghiệm thu cuối — controller tự chạy

| Cổng | Kết quả |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm test` | **10 file / 26 ca xanh** |
| `npm run kiem:vendor` | exit 0 — **2.782** file, lệch 0 |
| `npm run kiem:vendor-paths` | exit 0 — 438 mục khớp |
| `npm run build` | vỏ app **332,59 kB** gzip · chunk bảng **993,69 kB** gzip · CSS bảng 14,27 kB |
| Trình duyệt (tab sạch) | 8 thẻ `drt-*`, 0 `affine-*`, console sạch, token phân giải |

## Nợ nhỏ (Minor) gom cho lượt review cuối

- `scripts/kiem-vendor.mjs` — dòng thống kê cuối cộng `thua.length + thieu.length` nhưng bỏ sót
  `gocThua.length`. Không sai exit code (điều kiện thoát có đủ cả ba), chỉ là con số in ra không
  khớp tổng số vấn đề khi hỏng kiểu thư mục gốc.
- `scripts/kiem-vendor.mjs` — in đường dẫn theo dấu phân cách của HĐH (`\` trên Windows) trong khi
  tài liệu dùng `/`. Thuần hình thức.
- `package.json` — `test:watch` không có cổng `pretest:watch`, nên người mới clone chạy lệnh đó vẫn
  gặp đúng lỗi khó hiểu mà cổng `.vendor-build/` sinh ra để dẹp.
- `scripts/kiem-vendor-build.mjs` — danh sách file cần kiểm chép tay từ danh sách alias trong
  `vite.config.ts`, không có nguồn chung. Thêm alias thứ tư sau này thì cổng lặng lẽ không phủ.
- `scripts/dung-vendor.mjs` — `rmSync` không có `maxRetries`/try-catch. Máy này chạy Windows và dev
  server luôn bật, mà `vite.config.ts` alias thẳng vào `.vendor-build/`; một handle còn mở là
  `EBUSY`/`EPERM` giữa chừng. Thêm `{ maxRetries: 3, retryDelay: 200 }` là đủ.
- `scripts/dung-vendor.mjs` — comment nói bản vá đánh đổi mất "build gia tăng dùng cache tsc", nhưng
  `tsconfig.vendor.json` không đặt `incremental` lẫn `composite` nên vốn đã dịch lại từ đầu mỗi lần.
  Bản vá đúng, chỉ lý do ghi trong comment là sai.
- **`npm run format` là mìn.** `oxfmt` định dạng lại cả 2.764 file kể cả `src/vendor/blocksuite/`,
  và đổi kiểu nháy. Chạy nó là phá D11, `kiem:vendor` đỏ ngay. Cần giới hạn phạm vi hoặc bỏ script.
- `.claude/launch.json` — mục `drtrong-dev-worktree` (cổng 8444) sinh ra vì checkout gốc giữ 8443.
  Hữu ích lúc phát triển song song, nhưng sẽ theo nhánh về `main`. Cân nhắc gỡ trước khi gộp.
- `dang-ky-custom-element.spec.ts` và `edgeless-board-mount.spec.ts` — bằng chứng đỏ mạnh hơn rồi
  nhưng vẫn không bắt được **đổi thứ tự** widget, mà `extensions.ts` nói thứ tự quyết định z-index.
- `docs/superpowers/HANDOFF.md` — mô tả trạng thái trước chặng này; cần viết lại sau khi gộp.
- **Nợ quy trình:** Task 1 vào sổ là "xong" trong khi nó làm đỏ bộ test — cả implementer lẫn reviewer
  đều không chạy `npm test` vì tiêu chí xong của Task 1 chỉ nhắc `kiem:vendor`. Từ Task 3 trở đi,
  mọi lượt dispatch phải yêu cầu chạy đủ ba cổng (`tsc --noEmit`, `npm test`, `kiem:vendor`) bất kể
  tiêu chí xong của task viết gì.
