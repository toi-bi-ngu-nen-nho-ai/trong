# BÀN GIAO — đọc file này đầu tiên

Cập nhật: **2026-08-14**. Dự án: **Bs Trọng** — PWA y khoa tiếng Việt.

> **ĐÍNH CHÍNH bản 2026-08-13.** Bản đó viết *"P1-A đã gộp vào `main`, fast-forward
> `afac297 → a10401b`"*. **Điều đó chưa từng xảy ra ở bản sao này.** Chuỗi cha-thứ-nhất của `main`
> cho thấy `main` vẫn nằm ở `afac297` cho tới merge commit **`e0baa76`** (13/08 15:37), tức *sau*
> khi bản HANDOFF đó được viết (15:21). Cú gộp thật là một **merge commit**, không phải
> fast-forward. Đừng tin bảng cũ; tin `git log --first-parent main`.

## TRẠNG THÁI HÔM NAY — P1-B đã gộp, không còn chặng dở

| | |
|---|---|
| `main` | **`d24ee83`** — đã gộp P1-B bằng merge commit, đã đẩy lên origin |
| `p1b-vi-json-vi-tri` | `39315f3` — giữ lại làm bản sao lưu, không xoá |
| Cây làm việc | sạch |
| Bảy cổng | xanh — `tsc` exit 0 · `npm test` **82/82** (12 file) · `kiem:vendor` lệch 0 · `kiem:vendor-paths` 438 mục · `build` + `kiem:dist` xanh với `bản dịch vi.json — 5/5 có mặt` |

**Chặng P1-B — cơ chế thay chuỗi D12 theo vị trí cú pháp — ĐÃ XONG VÀ ĐÃ GỘP** (`d24ee83`).
5/5 task, review toàn nhánh không có Critical, 5 mục Important đã đóng, bảy cổng xanh trên `main`
sau khi gộp. Sổ tiến độ chi tiết ở `.superpowers/sdd/progress.md` (bị `.gitignore`, chỉ
sống trên máy này) — **mục 10 dưới đây là bản chép đi được sang máy khác**.

**Cảnh báo vận hành:** commit `dc2f765` trên nhánh này là của một **phiên Claude khác chạy song
song**. Hai phiên cùng ghi một nhánh là chỗ dễ mất việc. Trước mỗi lượt làm, `git log` lại; đừng
giả định `HEAD` là commit mình vừa tạo.

---

## 0. PROMPT DÁN VÀO PHIÊN MỚI

Trên máy/tài khoản khác, mở Claude Code trong thư mục đã `git clone` repo này, rồi dán nguyên
văn:

```
Đọc file docs/superpowers/HANDOFF.md trước khi làm bất cứ gì. Đây là bản bàn giao dự án Bs Trọng
từ một phiên Claude Code khác đã hết ngân sách token. HANDOFF ghi trạng thái thật của repo, kiến
trúc đã dựng, nợ còn lại đã phân loại, và việc cần làm tiếp. Đừng đoán trạng thái — file đó nói
rõ mọi lệnh git cần chạy để xác nhận trước khi bắt đầu.

Sau khi đọc xong, chạy phần "Việc làm ngay" trong mục 0 của file đó để dựng lại môi trường, rồi
hỏi tôi muốn làm gì tiếp (mục 7 — Chặng kế tiếp — liệt kê các hướng khả dĩ).
```

Prompt trên đủ để phiên mới tự định hướng mà không cần tôi giải thích lại từ đầu.

---

## 1. VIỆC LÀM NGAY — chạy trước khi làm bất cứ gì khác

**1. Xác nhận trạng thái repo thật, đừng tin file này nếu nó lệch với `git log`:**

```bash
git fetch origin
git branch --show-current               # kỳ vọng: main
git log --oneline -1                    # kỳ vọng: d24ee83 hoặc mới hơn
git status --short                      # kỳ vọng: rỗng
```

Nếu `git log` cho một commit mà bảng đồ phục hồi (mục 3) không có, đọc commit đó bằng
`git show <sha> --stat` trước khi làm gì — **một phiên Claude khác có thể đang chạy song song trên
cùng nhánh này** (đã xảy ra thật: commit `dc2f765`).

**2. Dựng lại cây đã dịch — bắt buộc, mất vài phút:**

```bash
npm ci
npm run dung:vendor
```

`.vendor-build/` bị `.gitignore` nên **không có sẵn** ở máy mới. `predev`/`prebuild`/`pretest`
đều chặn cứng nếu thiếu nó — không phải lỗi, đó là cổng kiểm đang làm đúng việc.

Kể từ commit `07dd96f`, bước này **cũng tự chạy** ở `postinstall` (sau `npm ci`/`npm install`)
nếu `.vendor-build/` thiếu hoặc không hợp lệ — nhưng chạy tay trước để thấy lỗi rõ ràng hơn nếu
có, thay vì lẫn vào log cài đặt.

**3. Chạy thử:**

```bash
PORT=8444 npm run dev
```

**Dùng cổng khác 5173/8443 nếu máy đó có sẵn dev server khác chạy nền** — bài học đau đã ghi ở
mục 5. Mở trình duyệt, bấm tab "Mindmap" ở thanh nav dưới, chờ 20-30 giây cho lần tải đầu (chunk
bảng vẽ ~994 kB gzip, nạp chậm).

**4. Xác nhận năm cổng còn xanh:**

```bash
npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build && npm run kiem:dist
```

Số liệu kỳ vọng ở lần chạy gần nhất (2026-08-13, sau khi dựng lại từ đầu để kiểm fix Vercel):
`tsc` exit 0 · **37/37 ca** xanh (11 file) · `kiem:vendor` 2.782 file lệch 0 · `kiem:vendor-paths`
438 mục khớp · vỏ app **~332,6 kB** gzip · chunk bảng **~993,7 kB** gzip · `kiem:dist` xanh.

---

## 2. TRẠNG THÁI GITHUB

| | |
|---|---|
| Repo | `https://github.com/toi-bi-ngu-nen-nho-ai/trong.git` |
| `origin/main` | `d24ee83` — đã gộp P1-B |
| `origin/p1b-vi-json-vi-tri` | `39315f3` — giữ làm bản sao lưu, không xoá |
| `origin/worktree-p1a-nhung-edgeless` | `ffe149c` — giữ lại làm bản sao lưu, không xoá |
| Worktree cũ trên đĩa (`p0a`, `p0b`, `p0c`, `blockkit-edgeless`) | vẫn còn treo, xoá lúc nào cũng được |

**`/superpowers:subagent-driven-development` KHÔNG chạy tiếp được gì** — kế hoạch P1-B đã thi hành
xong toàn bộ 5 task, đã review toàn nhánh, đã vá, đã gộp. Gọi lại mà không có kế hoạch mới thì nó
đứng im. Chặng sau cần `brainstorming` → `writing-plans` trước.

| Muốn gì | Gọi kỹ năng nào |
|---|---|
| **Dịch 323 chuỗi** (chặng kế tiếp) | `superpowers:brainstorming` — chốt bảng thuật ngữ 61 từ, VÀ chốt quy tắc cho 116 chuỗi bị tree-shake (mục 10) |
| Dịch nội dung `vi.json` sau khi P1-B xong | `superpowers:brainstorming` — cần chốt bảng thuật ngữ 61 từ trước |
| Làm chặng sau (lưu trữ D4 / BoardGallery) | `superpowers:brainstorming` → `superpowers:writing-plans` → rồi mới `subagent-driven-development` |
| Trả nợ nhỏ ở mục 6 | Sửa thẳng, không cần kỹ năng nào |
| iPad lộ ra lỗi | `superpowers:systematic-debugging` |
| Lỗi build/deploy khác | `superpowers:systematic-debugging` — xem cách đã sửa lỗi Vercel ở mục 3 làm ví dụ |

---

## 3. BẢN ĐỒ PHỤC HỒI — commit theo thứ tự thời gian

Nếu ngữ cảnh mất, tin `git log` và bảng này, đừng tin trí nhớ.

| Mốc | Commit / khoảng |
|---|---|
| Gốc trước P1-A | `afac297` |
| Task 1 — vendor + cổng D11 | `fe368ea..f520662` |
| Task 2 — dịch trước bằng tsc | `f520662..bb8c7c6` |
| Task 3 — đổi tên `drt-*` | `bb8c7c6..92558a6` |
| Task 4 — cầu nối React↔Lit | `92558a6..56729c4` |
| Task 5 — xoá `src/core/gfx` | `56729c4..c38c32b` |
| Vá review toàn nhánh (2 lỗi Critical: token màu rỗng, offline khoá app) | `deb6e8e` |
| **Gộp vào `main`, fast-forward** | `afac297 → a10401b` |
| Sửa lỗi chế độ tối + mất hình khi chuyển tab | `beb334f` |
| Sửa nốt thanh công cụ theo chế độ tối (đọc `<html>`, không riêng wrapper) | `a10401b` |
| Sửa lỗi build Vercel (postinstall tự dựng `.vendor-build/`) | `07dd96f` |
| Bỏ `.vendor-build/` khỏi phạm vi review thiết kế (impeccable hook) | `f01c278` |
| Bàn giao đầy đủ sang máy/tài khoản khác | `ffe149c` |
| **Gộp P1-A vào `main` — merge commit, KHÔNG phải fast-forward** | `e0baa76` |
| Trả lại dấu cách trước "1 chai", khoá nhánh trọn-chai bằng test | `b48d2ba` |
| Spec P1-B: bổ sung `vi.json` theo vị trí cú pháp | `d21f88f` |
| Kế hoạch P1-B, 5 task | `a368b3d` |
| **Nhánh `p1b-vi-json-vi-tri`** — cả 5 task (xem mục 10) | `4dd552d..39315f3` |
| **Gộp P1-B vào `main` — merge commit** | `d24ee83` |

Mỗi task P1-A đều đã qua review riêng và ít nhất một vòng vá. **Đừng chạy lại task nào ở đây.**

---

## 4. KIẾN TRÚC ĐÃ DỰNG

```
src/vendor/blocksuite/     BlockSuite 0.27.0, chép NGUYÊN VĂN, cấm sửa (D11)
        │  npm run dung:vendor   (vài phút — tự chạy ở postinstall nếu thiếu)
        ▼
  .vendor-build/           JS thuần — gitignore. Sáu bước, đúng thứ tự (scripts/dung-vendor.mjs):
                             0. xoá sạch build cũ (chống hỏng-im-lặng khi tsc chết giữa chừng)
                             1. tsc dịch (rolldown/oxc KHÔNG hạ cấp được `accessor`)
                             2. chép package.json rút gọn (không có nó, KHÔNG tree-shake được)
                             3. đổi tên affine-* → drt-*, --affine-* → --drt-*, + theme css
                             4. sinh tsconfig.vendor-paths.json
                             5. sinh bang-bam-vendor.json (D11 chạy được không cần checkout AFFiNE)
        │  vite.vendor-plugin.ts
        ▼
  src/board/               vỏ React + cầu nối Lit, nạp chậm, theo chủ đề sáng/tối của app
```

**Tiền tố `drt`** (Doctor Trọng) thay `affine` — chủ dự án duyệt 2026-08-12.

### Bảy cổng và việc của từng cái

| Lệnh | Canh cái gì |
|---|---|
| `kiem:vendor` | cây vendored khớp nguyên văn thượng nguồn (D11). Chạy được không cần checkout AFFiNE, nhờ `bang-bam-vendor.json` |
| `kiem:vendor-build` | `.vendor-build/` tồn tại và bước đổi tên đã chạy |
| `kiem:vendor-paths` | bản đồ paths đã commit còn mô tả đúng `.vendor-build/` |
| `dichchuoi:vendor` | mọi khoá `vi.json` dịch được ở ĐÚNG một vị trí hiển thị; khoá chết thì DỪNG |
| `kiem:dist` | **soi `dist/`** — không biến CSS nào dùng mà không định nghĩa, không chuỗi `affine-` nào sót |
| `npm test` | mã dự án sở hữu |
| `postinstall` (`dam-bao-vendor-build.mjs`) | tự dựng `.vendor-build/` nếu thiếu, bỏ qua nhanh nếu đã hợp lệ |

`kiem:dist` sinh ra vì lượt review cuối bắt được thứ **mọi cổng khác đều mù**: chúng đều dừng ở
`.vendor-build/`, không cái nào soi bản build thật — bảng từng ship ra 808 lượt dùng biến CSS mà
0 định nghĩa, không lỗi, không cảnh báo (xem bài học #2 ở mục 5).

### Hai kênh chủ đề sáng/tối của bảng vẽ

`src/lib/theme.ts` giờ ghi giá trị **đã phân giải** (`"light"`/`"dark"`, không bao giờ `"auto"`)
lên `<html>` ở mọi chế độ — kể cả "Tự động". Lý do: `ThemeObserver` của AFFiNE đọc `data-theme`
từ gốc tài liệu, không đọc thẻ bọc riêng của bảng. Đã kiểm: việc này không đổi bảng màu nào của
app (`src/index.css` chỉ có hai bộ chọn liên quan, cả hai vẫn khớp y hệt trước).

---

## 5. TÁM BÀI HỌC ĐÃ TRẢ GIÁ

1. **Kế hoạch sai bốn chỗ, và mã trong kế hoạch không phải là mã đúng.** Bộ che specifier sót
   `import 'x'`; không có bước cài phụ thuộc (16 dep có, cần 67); `dung:vendor` viết bằng `&&`
   **không bao giờ chạy bước đổi tên** vì `tsc` luôn exit khác 0; và ca kiểm decorator đo sai thứ
   nó tuyên bố đo. Đọc mã trong kế hoạch như bản nháp, không như lời tiên tri.
2. **Cổng xanh không có nghĩa là sản phẩm đúng.** Bảng từng ship ra với **808 lượt dùng
   `var(--drt-…)` và 0 định nghĩa** — không màu, không viền, không bóng. Không lỗi, không cảnh
   báo. Đếm thẻ DOM, đo kích thước, soi console: cả ba đều xanh. Phải có cổng soi *đầu ra thật*
   (`kiem:dist`).
3. **Tiêu chí xong của một task không thay được bộ cổng đầy đủ.** Task 1 vào sổ "xong" trong khi
   nó làm bộ test từ 62/62 xanh tụt xuống 70/78 file đỏ — vì tiêu chí xong của nó chỉ nhắc
   `kiem:vendor`, nên không ai chạy `npm test`. Luôn chạy đủ bộ cổng, đừng tin tiêu chí xong hẹp.
4. **Dev server chạy nền trên một cổng cố định sẽ khiến bạn xem nhầm app.** Mở đúng cổng app của
   phiên đang chạy, đừng giả định cổng mặc định là đúng app.
5. **Buffer console của công cụ trình duyệt không xoá khi điều hướng.** Lỗi cũ từ phiên trước
   trông y hệt lỗi mới. Mở tab mới khi cần kết luận "console sạch".
6. **Sự kiện tổng hợp phải bắn vào đúng phần tử có listener.** Bắn vào phần tử bọc ngoài thì
   không tới, vì sự kiện đi lên chứ không đi xuống — suýt kết luận nhầm là pan/zoom hỏng.
7. **`npm run format` đã bị xoá hẳn.** `oxfmt` 0.2.0 không có cơ chế ignore, nên nó định dạng lại
   cả 2.764 file vendored và đổi kiểu nháy — tức phá D11. Đừng thêm lại nếu chưa có cách giới hạn.
8. **Đọc kỹ log lỗi thật trước khi đoán nguyên nhân.** Lỗi build Vercel ghi rõ
   `Command "vite build" exited with 1` — không phải `npm run build` — nghĩa là Vercel gọi thẳng
   `vite build`, bỏ qua hẳn `prebuild` trong `package.json`. Kiểm chứng bằng cách mô phỏng đúng
   checkout Vercel (xoá `.vendor-build/`, `npm install`, rồi gọi thẳng `vite build`) trước khi vá,
   không vá theo phỏng đoán. `postinstall` là hook duy nhất chắc chắn chạy bất kể build command
   sau đó là gì — đó là lý do fix nằm ở đó chứ không phải ở `prebuild`.

---

## 6. NỢ CÒN LẠI, ĐÃ PHÂN LOẠI LÀ HOÃN ĐƯỢC

- `kiem-vendor.mjs`: dòng thống kê bỏ sót `gocThua.length`; in đường dẫn theo dấu phân cách HĐH.
- `test:watch` không có cổng `pretest:watch`.
- Bằng chứng đỏ của hai ca board không bắt được **đổi thứ tự** widget, mà `extensions.ts` nói thứ
  tự quyết định z-index. Hiện đã kiểm tay: mảng 22 mục đúng là dãy con giữ thứ tự của thượng nguồn.
- `src/board/vi.json` vẫn 5 chuỗi, nhưng cơ chế đã an toàn ở quy mô lớn (spec
  `2026-08-14-bo-sung-vi-json-design.md`, kế hoạch `2026-08-14-bo-sung-vi-json.md`). Chặng tiếp là
  nội dung dịch: chốt bảng thuật ngữ 61 từ rồi dịch 323 chuỗi.
- `src/board/__tests__/edgeless-board-mount.spec.ts` từng đỏ một lần vì timeout rồi xanh lại ngay.
  Nghi hai thủ phạm: mặc định 5 giây của vitest khi mount cả cây Lit, hoặc đường render bất đồng bộ
  qua `requestIdleCallback` mà chính header file đó nhắc. **Chưa bắt được thông điệp lỗi thật** —
  bắt được rồi hãy chọn cách sửa, đừng nâng timeout mò.
- `public/sw.js` còn `CACHE = "drtrong-v8"` dù bundle đã đổi; chính file đó ghi việc tăng số là
  BẮT BUỘC.
- **Deploy Vercel giờ tốn thêm vài phút mỗi lần** vì `postinstall` phải dựng lại `.vendor-build/`
  từ đầu (checkout CI luôn sạch, không có gì để tái sử dụng). Nếu thời gian build trở thành vấn đề,
  cân nhắc cache `.vendor-build/` qua Vercel Build Cache API — chưa làm, chưa cần thiết ở quy mô này.

---

## 7. CHƯA NGHIỆM THU — việc của chủ dự án, không phải nợ kỹ thuật

Hai mục ban đầu (chế độ tối, mất hình khi chuyển tab) **đã sửa** — xem `beb334f`/`a10401b` ở
mục 3. Hai mục dưới đây **vẫn còn nguyên**; chủ dự án đã cân nhắc và chấp nhận rủi ro để gộp vì
hiện chưa có iPad.

1. **iPad — toàn bộ.** Một nửa mốc nghiệm thu của kế hoạch, không có thiết bị để chạy.
   Rủi ro chưa gỡ: xử lý pointer/touch và pinch-zoom dưới mô hình cử chỉ của Safari; hành vi
   `@container viewport` trên iPadOS; và chi phí bộ nhớ/parse của chunk ~994 kB gzip (~4 MB thô)
   trong WKWebView — đúng loại áp lực mà `SKIP_REFRESH_DURING_GESTURE` sinh ra để chịu, mà **chưa
   dòng mã nào trong chặng này cấu hình nó** (xem mục 8).
2. **Vẽ hình bằng công cụ shape.** Chạy được bằng sự kiện tổng hợp bắn vào đúng phần tử canvas,
   **chưa phải input thật của hệ điều hành**. `ShapeViewExtension`, `BrushViewExtension`,
   `ConnectorViewExtension`, `MindmapViewExtension` đều đã đăng ký nhưng chưa từng vẽ ra gì trên
   thiết bị thật.

---

## 8. CHẶNG KẾ TIẾP

- **Lưu trữ (D4)** — nối y-indexeddb của AFFiNE cho nội dung bảng, nâng `DB_VERSION` lên 5 cho
  danh sách bảng.
- **BoardGallery** — màn danh sách bảng.
- **Bổ sung `vi.json`** — cơ chế ĐÃ XONG 5/5 task, xem mục 10; nội dung dịch (bảng thuật
  ngữ 61 từ, rồi 323 chuỗi) là chặng riêng sau đó.
- **Cấu hình `viewportRuntimeConfig` cho iOS** — chưa dòng nào làm. Nhớ: `ZOOM_MIN`/`ZOOM_MAX` đọc
  qua getter động nên override lúc nào cũng ăn, còn `SKIP_REFRESH_DURING_GESTURE` là field
  initializer **chốt cứng lúc dựng `Viewport`**. Cấu hình sau khi mount là ăn sàn zoom nhưng
  **không** ăn thứ giữ WKWebView khỏi bị kill. Bộ 5 ca cưỡng chế điều này ở
  `src/board/__tests__/viewport-runtime-config.spec.ts`.

---

## 9. BẢN ĐỒ TÀI LIỆU

| File | Nội dung |
|---|---|
| `docs/superpowers/specs/2026-08-12-nhung-edgeless-affine-design.md` | Spec có thẩm quyền |
| `docs/superpowers/plans/2026-08-12-p1-nhung-edgeless.md` | Kế hoạch P1-A — đã thi hành và gộp xong |
| `docs/superpowers/specs/2026-08-11-blockkit-edgeless-design.md` | Spec cũ — chỉ §5, §8, §9 còn giá trị |
| `docs/superpowers/notes/2026-08-13-p1a-so-tien-do.md` | Bản chép sổ tiến độ chi tiết từng task, đông cứng lúc P1-A kết thúc |
| `src/vendor/blocksuite/README.md` | Luật D11 |

Sổ tiến độ *sống* nằm ở `.superpowers/sdd/progress.md` trong worktree cũ (nếu còn trên đĩa) — bị
`.gitignore`, không đi theo repo. Từ giờ, **file này (`HANDOFF.md`) là nguồn tin cậy duy nhất qua
được sang máy/tài khoản khác**. Cập nhật nó mỗi khi kết thúc một phiên có thay đổi đáng kể, thay
vì chỉ ghi vào sổ tạm.

---

## 10. CHẶNG P1-B ĐANG DỞ — cơ chế thay chuỗi D12 theo vị trí cú pháp

Bản chép đi được của `.superpowers/sdd/progress.md` (file đó bị `.gitignore`, không qua được sang
máy khác). Nhánh **`p1b-vi-json-vi-tri`**, gốc `4dd552d`.

| Tài liệu | Đường dẫn |
|---|---|
| Spec | `docs/superpowers/specs/2026-08-14-bo-sung-vi-json-design.md` |
| Kế hoạch | `docs/superpowers/plans/2026-08-14-bo-sung-vi-json.md` |

### Vì sao chặng này tồn tại

Cơ chế D12 cũ thay chuỗi bằng **regex khớp trọn một literal ở bất cứ đâu** trong 2.550 file, không
phân biệt chuỗi hiển thị với dữ liệu. Ở mức 5 khoá chưa lộ; ở mức vài trăm khoá thì hỏng. Ca chứng
minh có thật: `"LinkedPage"` vừa nằm ở `name:` (nhãn hiển thị) vừa ở `type:` trong
`attributes.reference` — **giá trị lược đồ tài liệu**. Đo được **110/391 ứng viên có va chạm**.

Hướng đã chốt: phân tích AST bằng `ts.createSourceFile`, chỉ thay khi **vị trí cú pháp** nằm trong
danh sách cho phép. Đo được 127 loại vị trí khác nhau → **danh sách cho phép, hỏng thì đóng**.

### Đã xong

| Task | Nội dung | Commit | Lượt vá |
|---|---|---|---|
| 1 | Tách bước dịch sang `scripts/dich-chuoi-vendor.mjs` + `duyet-cay-js.mjs` dùng chung | `4dd552d..9f9e263` | 1 |
| 2 | `scripts/luat-vi-tri-dich.mjs` — module thuần + 37 ca kiểm | `9f9e263..cdc3132` | **4** |
| 3 | Nối vào pipeline, `bao-cao-dich.json`, **bốn cổng DỪNG** | `cdc3132..1f78d43` | **2** |
| 4 | Cổng độc lập tính lại từ `.vendor-build/`, không đọc báo cáo | `728843e..98e8b71` | **2** |
| 5 | `kiem:dist` luật C — bản dịch buộc phải có trong `dist/` | `98e8b71..f29702a` | **3** |
| — | Siết 5 cổng theo lượt review toàn nhánh | `f29702a..f759296` | — |

Cả năm đã qua review và được duyệt. **Lượt review toàn nhánh (opus) kết luận KHÔNG có Critical**;
năm mục Important đã đóng ở `f759296`, ba phép bằng chứng đỏ đều đúng kỳ vọng.

Reviewer tự đo lại và xác nhận mục tiêu cốt lõi ĐẠT: chuỗi `LinkedPage` có 23 lượt trong cây, **22
lượt bị loại fail-closed**, đúng **1 lượt** được dịch — và đó là nhãn thật ở
`keyboard-toolbar/src/config.js:232`. Regex cũ dịch cả 23.

### HAI VIỆC CÒN MỞ, KHÔNG CHẶN GỘP

**1. Trước khi thêm khoá đầu tiên của chặng 323 chuỗi** — spec §2.3 tự đo 116/391 chuỗi ứng viên
KHÔNG tới `dist/` vì tree-shake. Cổng khoá chết chấp nhận chúng, luật C thì không. Tức có lớp chuỗi
"dịch được nhưng không được phép dịch", và khi ai đó dịch nhầm một cái, luật C đỏ với thông báo nêu
hai nguyên nhân **đều sai**. Phải chốt quy tắc trước, không phải sau.

**2. Dữ liệu lâm sàng cần chủ dự án xác nhận** — `src/data/antibiotics.ts` thêm ba quy cách Amikacin,
cả ba chép nguyên văn `infuseNote: "Pha 500 mg amikacin…"`, **kể cả quy cách 1000 mg**. Đây là chữ
hiển thị cho người đang pha thuốc. Nằm ngoài chặng P1-B (commit của phiên song song).

### Mười một lỗi vòng review bắt được — TẤT CẢ nằm trong mã do kế hoạch cho sẵn

Đây là phần đáng giá nhất của chặng, và là lời cảnh báo cho mọi kế hoạch sau: **mã trong kế hoạch
là bản nháp, không phải lời tiên tri** (bài học #1 của mục 5).

| # | Lỗi | Hậu quả nếu lọt |
|---|---|---|
| 1 | `dietJs` trùng lặp verbatim hai nơi | nợ bảo trì |
| 2 | Regex `data-tip` không neo biên trái | `my-data-tip=` bị dịch |
| 3 | Lớp mở đầu `[A-Za-z]` hẹp hơn lớp nối `[\w:-]` | `.data-tip=`, `?data-tip=`, `@data-tip=` — **cú pháp binding thật của Lit** — vẫn lọt |
| 4 | Không ca nào có ≥2 lượt thay/file | đảo `sort` thì 18 ca vẫn xanh, output hỏng |
| 5 | `banDo[k] !== undefined` tra qua prototype | `label: 'constructor'` → **`label: undefined` trần** trong mã vendored |
| 6 | Không kiểm KIỂU giá trị bản dịch | `vi.json` gom nhóm / để tạm mảng → chèn `label: [...]` trần |
| 7 | Cổng 0 chỉ canh cột giá trị, không canh cột khoá | khoá rỗng khớp **mọi** literal rỗng — ghi đè `name: ''`, `caption: ''`, `title: ''` là **giá trị mặc định của model tài liệu** |
| 8 | Cổng độc lập xanh rỗng tuếch — mặt khẳng định chỉ tăng khi có VI PHẠM | sửa một *giá trị* trong `vi.json` mà quên dựng lại → cả hai ca xanh, bản build cũ trôi qua |
| 9 | Cổng độc lập vẫn xanh khi bản đồ dịch rỗng (`[]` vs `[]`) | kế thừa đúng điểm mù mà `dich-chuoi-vendor.mjs` tự ghi là "không cổng nào khác chặn được" |
| 10 | Luật C của `kiem:dist` xanh với `0/0 có mặt` khi `vi.json` rỗng | và nơi chặn ca này KHÔNG nằm trên đường `npm run build`, nên luật C là lớp cuối cùng và duy nhất |
| 11 | Luật C so khớp mù phạm vi — tìm ở **mọi** file của `dist/` | chunk bảng vẽ tiếng Anh 100% vẫn xanh nếu bundle app 980 kB tình cờ chứa mấy từ đó |

Từ #5 tới #7 hỏng **im lặng**; #8 tới #11 là **cổng xanh rỗng tuếch** — cổng báo "đã kiểm" trong khi không kiểm được gì. Cả hai lớp: JS vẫn hợp lệ, build vẫn xanh, không cổng nào đỏ. Đúng bài học
#2. Mỗi lượt vá đều kèm **bằng chứng đỏ đã thật sự chạy và thật sự đỏ**, ghi trong các file
`.superpowers/sdd/task-*-report.md`.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng d4ee12c hoặc mới hơn
git status --short                      # kỳ vọng rỗng
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
```

**Cả 5 task đã thi hành xong.** Việc còn lại là **lượt review toàn nhánh** (`git merge-base main
HEAD`..`HEAD`) rồi quyết định gộp — dùng `superpowers:requesting-code-review` và
`superpowers:finishing-a-development-branch`. **Đừng chạy lại task nào**; sổ và bảng trên là hồ sơ.

### Khoảng 12 mục Minor còn mở

Đã gom trong `.superpowers/sdd/progress.md`, dành cho **lượt review toàn nhánh cuối** phân xử.
Đáng nhắc nhất: `catch (err)` ở vỏ CLI bắt rộng hơn thứ nó tuyên bố canh; báo cáo kiểm toán được
ghi **trước** cổng khoá chết nên một lượt bị từ chối vẫn để lại file; script không idempotent và
thông báo cổng khoá chết dẫn sai hướng khi chạy lần hai; và `text`/`title` trong danh sách 11 tên
cho phép **cũng là trường dữ liệu tài liệu** trong BlockSuite — phải đo số lượt trúng ở hai vị trí
đó trước khi mở rộng `vi.json`.

### Ngoài phạm vi chặng này

Chặng này **không thêm khoá dịch nào** — `vi.json` vẫn đúng 5 khoá. Nó chỉ làm cho việc thêm về sau
trở nên an toàn. Nội dung dịch là chặng riêng: chốt bảng thuật ngữ (**61 từ lặp ≥3 lần**) rồi dịch
**323 chuỗi** tới được `dist/`.
