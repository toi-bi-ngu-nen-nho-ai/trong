# BÀN GIAO — đọc file này đầu tiên

Cập nhật: **2026-08-15**. Dự án: **Bs Trọng** — PWA y khoa tiếng Việt.

> **ĐÍNH CHÍNH bản 2026-08-13.** Bản đó viết *"P1-A đã gộp vào `main`, fast-forward
> `afac297 → a10401b`"*. **Điều đó chưa từng xảy ra ở bản sao này.** Chuỗi cha-thứ-nhất của `main`
> cho thấy `main` vẫn nằm ở `afac297` cho tới merge commit **`e0baa76`** (13/08 15:37), tức *sau*
> khi bản HANDOFF đó được viết (15:21). Cú gộp thật là một **merge commit**, không phải
> fast-forward. Đừng tin bảng cũ; tin `git log --first-parent main`.

## TRẠNG THÁI HÔM NAY — P1-D đã gộp, không còn chặng dở

| | |
|---|---|
| `main` | **`9ce6955`** — đã gộp P1-D bằng merge commit |
| `p1d-siet-so-khop` | `b36a398` — giữ lại làm bản sao lưu, không xoá |
| `p1c-chuoi-khong-toi-dist` | `1c1a93d` — giữ lại làm bản sao lưu, không xoá |
| `p1b-vi-json-vi-tri` | `39315f3` — giữ lại làm bản sao lưu, không xoá |
| Cây làm việc | sạch (trừ `bang-bam-vendor.json` + `tsconfig.vendor-paths.json`, xem mục 6) |
| Bảy cổng | xanh — `tsc` exit 0 · `npm test` **122/122** (14 file) · `kiem:vendor` 2.782 file lệch 0 · `kiem:vendor-paths` 438 mục · `kiem:vendor-build` OK · `build` + `kiem:dist` xanh với `bản dịch vi.json — 5/5 có mặt` |

> **Về con số 122/122.** Nó là "lượt chạy gần nhất xanh", không phải "bộ test ổn định". Ca đỏ chập
> chờn từng gặp bốn lần đã **bắt được và vá** ở `40f90e9` (mục 6) — nhưng **chưa chứng minh** ngân
> sách 120 giây đủ cho mọi đợt tải xấu. **Ca đỏ quay lại là tin tức**, không phải phiền toái.

**Chặng P1-D — siết phép so khớp bản dịch — ĐÃ XONG VÀ ĐÃ GỘP** (`9ce6955`). 4/4 task, review toàn
nhánh **không có Critical**, ba Important đã đóng. Chi tiết ở **mục 13**.

**Chặng P1-C — quy tắc cho chuỗi không tới `dist/` — ĐÃ XONG VÀ ĐÃ GỘP** (`d165b92`). 4/4 task,
review toàn nhánh **không có Critical**, bốn Important đã đóng. Chi tiết ở **mục 12**.

**Chặng P1-B — cơ chế thay chuỗi D12 theo vị trí cú pháp — ĐÃ XONG VÀ ĐÃ GỘP** (`d24ee83`).
5/5 task, review toàn nhánh không có Critical, 5 mục Important đã đóng. Chi tiết ở **mục 10**.

Sổ tiến độ chi tiết ở `.superpowers/sdd/progress.md` (bị `.gitignore`, chỉ sống trên máy này) —
**mục 10 và mục 12 dưới đây là bản chép đi được sang máy khác**.

**Cảnh báo vận hành (chỉ còn giá trị lịch sử):** commit `dc2f765` là của một **phiên Claude khác
chạy song song**, nay đã đóng. Dù vậy thói quen vẫn đúng: trước mỗi lượt làm, `git log` lại; đừng
giả định `HEAD` là commit mình vừa tạo.

---

## 0. PROMPT DÁN VÀO PHIÊN MỚI

Mở Claude Code trong thư mục repo này rồi dán nguyên văn khối dưới. Nó đủ để phiên mới tự định
hướng và làm tiếp mà không cần giải thích lại từ đầu.

```
Đọc docs/superpowers/HANDOFF.md trước khi làm bất cứ gì. Đây là bàn giao dự án Bs Trọng từ một
phiên Claude Code khác đã hết ngân sách. Đừng đoán trạng thái repo — file đó ghi mọi lệnh git cần
chạy để xác nhận.

Không còn chặng nào đang dở. P1-D đã gộp (mục 13). Chặng kế tiếp là NỘI DUNG DỊCH cho vi.json.

Nợ `includes` ĐÃ TRẢ ở chặng P1-D (mục 13) — cả hai chỗ đã dùng phép literal trọn vẹn, và có
thêm cổng cấm hai khoá dịch ra cùng một chuỗi.

Việc còn phải làm trước khi thêm khoá đầu tiên: ĐO LẠI số chuỗi VÀ số từ lặp. Con số "323 chuỗi"
đã bị bác bỏ (đúng là 899), và "61 từ lặp" được suy ra TỪ tập 323 đó nên cũng hết giá trị.
Đừng đổi 323 thành 899 rồi giữ nguyên 61 — đó là hai phép đo khác nhau.

Trình tự: chạy "Việc làm ngay" ở mục 1 để dựng lại môi trường (npm ci && npm run dung:vendor, mất
vài phút), rồi superpowers:brainstorming → writing-plans → subagent-driven-development.

Đừng đụng src/data/antibiotics.ts — tôi tự sửa.
```

## 1. VIỆC LÀM NGAY — chạy trước khi làm bất cứ gì khác

**1. Xác nhận trạng thái repo thật, đừng tin file này nếu nó lệch với `git log`:**

```bash
git fetch origin
git branch --show-current               # kỳ vọng: main
git log --oneline -1                    # kỳ vọng: 9ce6955 hoặc mới hơn
git status --short                      # kỳ vọng: chỉ hai file sinh ra ở mục 6
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

Số liệu kỳ vọng ở lần chạy gần nhất (**2026-08-15**, trên `main` sau khi gộp P1-D):
`tsc` exit 0 · **122/122 ca** xanh (14 file) · `kiem:vendor` 2.782 file lệch 0 · `kiem:vendor-paths`
438 mục khớp · vỏ app **~333,0 kB** gzip · chunk bảng **~993,7 kB** gzip · `kiem:dist` xanh với
`bản dịch vi.json — 5/5 có mặt`.

---

## 2. TRẠNG THÁI GITHUB

| | |
|---|---|
| Repo | `https://github.com/toi-bi-ngu-nen-nho-ai/trong.git` |
| `origin/main` | `de6136a` — đã gộp P1-D (`9ce6955`) |
| `origin/p1d-siet-so-khop` | `b36a398` — giữ làm bản sao lưu, không xoá |
| `origin/p1c-chuoi-khong-toi-dist` | `1c1a93d` — giữ làm bản sao lưu, không xoá |
| `origin/p1b-vi-json-vi-tri` | `39315f3` — giữ làm bản sao lưu, không xoá |
| `origin/worktree-p1a-nhung-edgeless` | `ffe149c` — giữ lại làm bản sao lưu, không xoá |
| Worktree cũ trên đĩa (`p0a`, `p0b`, `p0c`, `blockkit-edgeless`) | vẫn còn treo, xoá lúc nào cũng được |

**`/superpowers:subagent-driven-development` KHÔNG chạy tiếp được gì** — cả hai kế hoạch P1-B và
P1-C đã thi hành xong toàn bộ, đã review toàn nhánh, đã vá, đã gộp. Gọi lại mà không có kế hoạch
mới thì nó đứng im. Chặng sau cần `brainstorming` → `writing-plans` trước.

| Muốn gì | Gọi kỹ năng nào |
|---|---|
| **Dịch bề mặt hiển thị** (chặng kế tiếp) | `superpowers:brainstorming` — chốt bảng thuật ngữ. Quy tắc cho chuỗi bị tree-shake ĐÃ chốt xong ở P1-C (mục 12). Đọc cảnh báo ở mục 12 trước: cả "323 chuỗi" lẫn "61 từ" đều là số đã bị bác bỏ |
| Dịch nội dung `vi.json` | `superpowers:brainstorming` — cần chốt bảng thuật ngữ trước; số từ phải ĐO LẠI, xem mục 12 |
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
| Spec P1-C: quy tắc cho chuỗi không tới `dist/` | `c986f4a` |
| Kế hoạch P1-C, 4 task | `a61c77d` |
| **Nhánh `p1c-chuoi-khong-toi-dist`** — cả 4 task + 3 lượt vá (xem mục 12) | `0648e08..1c1a93d` |
| **Gộp P1-C vào `main` — merge commit** | `d165b92` |
| Vá ca đỏ chập chờn — ngân sách thời gian cho ca duyệt trọn cây (mục 6) | `40f90e9` |
| Spec P1-D: siết phép so khớp bản dịch | `ed8b143` |
| Kế hoạch P1-D, 4 task | `87e79bc` |
| **Nhánh `p1d-siet-so-khop`** — 4 task + 2 lượt vá (xem mục 13) | `9828fbb..b36a398` |
| **Gộp P1-D vào `main` — merge commit** | `9ce6955` |

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
  nội dung dịch: chốt bảng thuật ngữ rồi dịch. Số chuỗi và số từ phải ĐO LẠI — xem cảnh báo mục 12.
- **CA ĐỎ CHẬP CHỜN — ĐÃ BẮT ĐƯỢC VÀ ĐÃ VÁ (2026-08-15).** Ba lần trước không ai bắt được thông
  điệp lỗi; lần thứ tư bắt được ngay lượt săn đầu tiên.

  **Thủ phạm KHÔNG phải file mà dự án nghi suốt ba lần.** Không phải `edgeless-board-mount.spec.ts`
  (ở đúng lượt đỏ đó nó chạy 288 ms và xanh). Thủ phạm là **ba ca duyệt trọn cây** trong
  `src/__tests__/vendor-doi-ten.spec.ts`, cùng một lỗi:

  ```
  × output không còn tiền tố affine- nào ... 5063ms   Error: Test timed out in 5000ms.
  × không có tên gói giả @blocksuite/drt- ... 5015ms   Error: Test timed out in 5000ms.
  × không có chỗ ghép tên thẻ động        ... 5094ms   Error: Test timed out in 5000ms.
  ```

  Chúng đọc từng file của 2.550 file `.js` (hoặc 2.782 file `.ts`) bằng `readFileSync` — việc I/O
  hàng nghìn lượt — nhưng chạy trên **ngân sách mặc định 5 giây**, có được do **bỏ sót**. Hai ca
  làm việc y hệt ở `vendor-dich.spec.ts` (`:297`, `:309`) đã được cấp `120_000` từ trước; đây là
  bất đối xứng trong cùng một repo.

  Phép kiểm chéo xác nhận: **đúng ba ca phải duyệt trọn cây là đúng ba ca đỏ**; hai ca `break` sớm
  thì xanh. Cùng lượt đó cả bộ test chậm 2,6 lần (195 s so với 74 s), tức thời gian đi theo tải
  máy còn ngân sách thì cố định.

  **Đã vá:** `HAN_DUYET_CAY = 120_000` áp cho **cả năm** ca của file đó. Phủ cả hai ca thường nhanh
  vì chúng chỉ nhanh KHI CỔNG ĐẠT — nếu bước đổi tên hỏng thật hoặc `vi.json` có khoá chết, chúng
  phải duyệt trọn cây rồi chết vì timeout, tức **một lượt gác thật sự đỏ bị nguỵ trang thành flake**.

  **Chưa chứng minh được:** 120 giây đủ cho mọi đợt tải xấu. Lượt đỏ bị giết ở 5 s nên không biết
  nó cần bao lâu; ép tải bằng hai tiến trình vitest song song chỉ đẩy được tới 2,7 s.
  **Nếu ca đỏ chập chờn còn quay lại sau lượt vá này thì đó là tin tức** — quay lại Phase 1, đừng
  nâng tiếp con số. Hồ sơ điều tra đầy đủ: `.superpowers/flake/dieu-tra.md` (bị gitignore).

  > **VÌ SAO BA LẦN TRƯỚC ĐỀU HỤT — lỗi thao tác lặp lại, đọc kỹ.** Cả ba lượt đều chạy `npm test`
  > qua ống dẫn `| tail -N`. Vitest in chi tiết ca đỏ **trước** khối tổng kết, nên `tail` **vứt
  > đúng phần cần giữ** và chỉ để lại dòng đếm. Ống dẫn còn nuốt exit code (`$?` thành của `tail`),
  > nên lượt đỏ trông như exit 0 và chuỗi `&&` vẫn chạy tiếp.
  >
  > **Chạy bộ test để lấy bằng chứng: KHÔNG BAO GIỜ nối `| tail`.** Ghi ra file rồi đọc:
  > `npx vitest run --reporter=verbose > kq.txt 2>&1`, đọc `kq.txt` TRƯỚC khi làm gì khác.
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
- **Bổ sung `vi.json`** — cơ chế ĐÃ XONG 5/5 task (mục 10); quy tắc cho chuỗi không tới `dist/`
  ĐÃ XONG ở P1-C (mục 12). Nội dung dịch là chặng riêng sau đó — **số chuỗi và số từ phải đo
  lại**, xem cảnh báo mục 12.
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

## 10. CHẶNG P1-B ĐÃ XONG VÀ ĐÃ GỘP — cơ chế thay chuỗi D12 theo vị trí cú pháp

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

**1. ĐÃ GIẢI QUYẾT ở chặng P1-C — xem mục 12.** (Con số 116/391 dưới đây thuộc bộ đã bị bác bỏ;
số đúng ở mục 12.) Trước khi thêm khoá đầu tiên — spec §2.3 khi đó tự đo 116/391 chuỗi ứng viên
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
trở nên an toàn. Nội dung dịch là chặng riêng: chốt bảng thuật ngữ rồi dịch những chuỗi tới được
`dist/`.

> **Hai con số bản gốc của đoạn này đã bị BÁC BỎ.** Nó từng ghi "**61 từ lặp ≥3 lần**" và
> "**323 chuỗi** tới được `dist/`". Số chuỗi đúng là **899** (đo 2026-08-15, xem mục 12). Con số
> **61 từ** được suy ra TỪ tập 323 đó nên cũng hết giá trị — phép đếm từ lặp **chưa từng được
> chạy lại** trên tập 899. **Đừng đổi 323 thành 899 rồi giữ nguyên 61: đó là hai phép đo khác
> nhau.** Phải đo lại cả hai trước khi bắt đầu chặng dịch.

---

## 11. HỒ SƠ BRAINSTORM CỦA P1-C — chặng này ĐÃ XONG, xem mục 12

> **Mục này giờ là HỒ SƠ, không phải việc cần làm.** Chặng P1-C đã thi hành xong và đã gộp
> (`d165b92`) — kết quả ở **mục 12**. Giữ mục này lại vì nó ghi ba quyết định gốc của chủ dự án
> và lý do loại hai hướng khác, thứ mà mục 12 không lặp lại.

### Vấn đề

Hai cổng đặt hai yêu cầu khác nhau, và giữa chúng có một vùng không ai nói ra:

| Cổng | Đòi gì | Với chuỗi thuộc gói chưa bật |
|---|---|---|
| Cổng 3 (`dich-chuoi-vendor.mjs`) | mỗi khoá phải dịch được ở đâu đó trong 2.550 file | **THOẢ** |
| Luật C (`kiem-dist.mjs`) | mỗi bản dịch phải có mặt trong `dist/` | **KHÔNG THOẢ** |

Tức có một lớp chuỗi **"dịch được nhưng không được phép dịch"**. Khi ai đó dịch nhầm một cái, luật C
đỏ với thông báo nêu hai nguyên nhân — *"bước dịch không chạy"* và *"thượng nguồn chuyển chuỗi ra
ngoài danh sách"* — mà **cả hai đều sai**. Đúng bài học #2: cổng đỏ chỉ sai chỗ thì đẩy người ta đi
sửa nhầm.

### Số đo — ĐÃ ĐÍNH CHÍNH, và đây KHÔNG phải nguồn có thẩm quyền

> **Nguồn có thẩm quyền cho đại lượng này là §2.3 của
> `docs/superpowers/specs/2026-08-14-bo-sung-vi-json-design.md`** (đã đính chính 2026-08-15, kèm
> phương pháp đo ở §2 của spec P1-C). Đừng chép số từ đây; trỏ về đó.

| | Đo 2026-08-15 bằng chính `viTriHienThi` |
|---|---|
| Chuỗi phân biệt ở vị trí cho phép | **1.205** |
| Tới được chunk bảng vẽ | **899** |
| **Không tới** | **306** |

Bản HANDOFF trước ghi **1.196 / 890 / 306** — đó là một lượt đo sớm hơn bằng script khác, nay đã
mất. Con số quyết định (**306**) tái lập chính xác giữa hai lượt; bề mặt lệch 9 chuỗi và cả 9 rơi
vào nhóm "tới được". Chênh lệch nằm ở chi tiết phương pháp của lượt cũ, không tái dựng được.

Mọi bộ số cũ hơn (**116/391**, **121/444/323**) đều **SAI** — chúng đến từ lượt đo lọc "viết hoa
chữ đầu", bộ lọc mà luật sản xuất không có.

**306 chuỗi không tới KHÔNG rải rác, chúng dồn theo GÓI** — nguyên những tính năng chưa nối vào
`src/board/extensions.ts` (đo 2026-08-15, gói = thư mục có `package.json` gần nhất):

```
 33 affine/blocks/embed          12 affine/widgets/drag-handle    7 affine/inlines/link
 33 affine/blocks/embed-doc      12 affine/fragments/outline      7 affine/gfx/template
 19 affine/fragments/frame-panel 10 affine/blocks/attachment      6 affine/inlines/reference
 19 affine/widgets/slash-menu    10 affine/blocks/code            6 affine/blocks/callout
 15 affine/widgets/linked-doc     9 affine/blocks/bookmark        6 affine/blocks/latex
 14 affine/blocks/table           9 affine/blocks/surface-ref     4 affine/blocks/image
```

Lưu ý: bề mặt 1.205 có lẫn thứ rõ ràng **không phải chữ hiển thị** — `"4_Content & Media@3"`,
`"bookmark"`, `"PDF"`, `"="`, `"x"`. Con số thô đó không phải "số chuỗi cần dịch".

Cách nhận ra chunk bảng vẽ trong `dist/`: mật độ `drt-` >= 100 (đo được 2/12 file).

### Ba quyết định ĐÃ CHỐT với chủ dự án

1. **Từ chối, nói rõ vì sao.** Thêm khoá cho chuỗi thuộc nhóm 306 là lỗi soạn bảng. Thông báo phải
   nói thật: chuỗi nằm trong gói X chưa bật ở `extensions.ts` nên không tới người dùng, dịch nó là
   công không. Muốn dịch thì **bật tính năng trước** — đúng thứ tự.
2. **KHÔNG có danh sách miễn.** YAGNI: chưa có ca thật nào cần dịch trước một chuỗi thuộc tính năng
   chưa bật. Cơ chế miễn không ai dùng là gánh nặng, và là cửa để sau này nhét vào cho cổng xanh —
   đúng thứ mà comment của `MIEN` (luật B) đã cảnh báo.
3. **Hướng A — soi `.vendor-build/` trên ĐƯỜNG ĐỎ.** Khi luật C phát hiện thiếu, quét cây đã dịch
   tìm **giá trị tiếng Việt**:
   - thấy → *"đã dịch ở `affine/blocks/table/...`, gói đó chưa bật trong `src/board/extensions.ts`"*
   - không thấy → *"bước dịch không chạy"*

   **Phải quét theo TIẾNG VIỆT, không phải tiếng Anh** — sau khi dịch thì bản gốc tiếng Anh đã biến
   mất khỏi đúng những chỗ đó.

   Được ba điểm: **độc lập** (tính lại từ cây thật, KHÔNG đọc `bao-cao-dich.json` của chính bộ thay);
   **chỉ tốn khi đỏ** (đường xanh không quét gì); và `.vendor-build/` chắc chắn có mặt vì `prebuild`
   đã chạy `kiem-vendor-build` trước đó.

   Hai hướng đã loại: đọc `bao-cao-dich.json` (nhanh hơn nhưng ghép luật C vào lời tự khai của bộ
   thay); và chỉ thêm nguyên nhân thứ ba vào thông báo (rẻ nhất nhưng để người đọc tự mò giữa ba
   khả năng, trong khi phân biệt được chỉ tốn một phép quét).

### Việc phiên sau làm — ĐÃ LÀM XONG HẾT, xem mục 12

~~1. Đọc mục này. 2. brainstorming. 3. Viết spec. 4. writing-plans →
subagent-driven-development.~~ Cả bốn bước đã thi hành trong phiên 2026-08-15.

### Việc chủ dự án tự làm, ĐỪNG đụng

`src/data/antibiotics.ts` — ba quy cách Amikacin mới đều chép nguyên văn
`infuseNote: "Pha 500 mg amikacin…"` kể cả quy cách **1000 mg**, kèm một entry thụt lề sai. Chủ dự
án tự sửa. Đây là dữ liệu lâm sàng.

### Không còn phiên song song

Chủ dự án xác nhận đã đóng phiên Claude thứ hai và **không chạy song song nữa**. Cảnh báo ở đầu file
chỉ còn giá trị lịch sử (commit `dc2f765` và ba commit UI trên nhánh P1-B là của phiên đó).

---

## 12. CHẶNG P1-C ĐÃ XONG VÀ ĐÃ GỘP — quy tắc cho chuỗi không tới `dist/`

Nhánh **`p1c-chuoi-khong-toi-dist`**, gốc `a61c77d`, gộp tại `d165b92`.

| Tài liệu | Đường dẫn |
|---|---|
| Spec | `docs/superpowers/specs/2026-08-15-chuoi-khong-toi-dist-design.md` |
| Kế hoạch | `docs/superpowers/plans/2026-08-15-chuoi-khong-toi-dist.md` |

### Chặng này làm gì

**Chỉ một việc: khi luật C đã đỏ, nói đúng nguyên nhân.** Không thêm khoá dịch nào (`vi.json` vẫn
đúng 5 khoá), không đổi hành vi xanh/đỏ của cổng nào.

Trước đó, với chuỗi thuộc gói chưa bật trong `extensions.ts`, luật C đỏ và nêu hai nguyên nhân
(*"bước dịch không chạy"* / *"thượng nguồn đổi vị trí cú pháp"*) mà **cả hai đều sai** — nó đẩy
người sửa đi dựng lại `.vendor-build/` rồi đi soi `luat-vi-tri-dich.mjs`, cả hai đều vô ích, trong
khi việc cần làm là gỡ khoá khỏi `vi.json`.

Giờ trên **đường đỏ** (đường xanh không đọc thêm byte nào), `kiem-dist.mjs` quét `.vendor-build/`
tìm **giá trị TIẾNG VIỆT** — không phải chuỗi gốc tiếng Anh, vì sau khi dịch thì bản gốc đã biến
mất khỏi đúng những chỗ đó:

| Kết quả quét | Kết luận |
|---|---|
| **Thấy** | bước dịch đã đáp bản dịch vào cây → nhiều khả năng gói chứa nó bị tree-shake. Nêu tên gói + đường dẫn file, và **cảnh báo kiểm `dist/` có cũ không trước khi gỡ khoá** |
| **Không thấy** | giữ hai nguyên nhân cũ — với ca này chúng đúng |
| **Chẩn đoán không chạy được** | **không khẳng định gì**, chỉ liệt kê các khả năng |

### Đã xong

| Task | Nội dung | Commit | Lượt vá |
|---|---|---|---|
| 1 | `scripts/tim-ban-dich-vendor.mjs` + `.d.mts` + 7 ca kiểm | `a61c77d..0648e08` | 0 |
| 2 | `soanThongBaoThieu` — hàm thuần, ba kết cục, + 5 ca | `0648e08..a5b8d88` | 0 |
| 3 | Nối vào luật C, **ba bằng chứng đỏ thật** | `a5b8d88..8357952` | 0 |
| 4 | Đính chính số liệu | `8357952..47c510e` | **1** |
| — | Vá lượt review toàn nhánh | `..5faeb69`, `..1c1a93d` | — |

`npm test` **98/98** (13 file), trước chặng là 82/82.

### Tính chất kết cấu quan trọng nhất — reviewer đã tự kiểm, không tin lời khai

**Không có đường đi nào từ mã mới tới `process.exit(0)`.** Khối chẩn đoán nằm trọn trong
`if (thieuBanDich.size)` **sau `loi++`**, chỉ ghi `console.error`, không nhánh nào chạm `loi` hay
gọi `process.exit`. Chẩn đoán hỏng, quét rỗng, cây rỗng — cổng vẫn đỏ.

Đây là lý do chặng này **không** dựng cổng mới để "chặn sớm": một cổng mới thì lại phải tự chứng
minh nó không xanh rỗng tuếch, tức thêm đúng lớp rủi ro mà bốn trong mười một lỗi của P1-B thuộc về.

**Tính độc lập với `bao-cao-dich.json` cũng đã kiểm bằng hành vi**, không bằng lời: file đó chứa
nguyên `chuoiDich` tiếng Việt nên nếu bộ quét chạm vào thì **mọi** khoá đều "thấy" và chẩn đoán
thành lời tự khai của chính bộ thay chuỗi. `dietJs` chỉ sinh `.js` nên nó bị loại — và giờ có một
ca kiểm ghim điều đó.

### Bốn Important của lượt review toàn nhánh — HAI trong số đó là chặng này VI PHẠM CHÍNH NÓ

Chặng này tự đặt một tiêu chuẩn: **không bao giờ khẳng định điều chưa đo**. Reviewer tìm ra hai chỗ
nó vi phạm chính tiêu chuẩn đó. Đây là phần đáng học nhất.

| # | Lỗi | Hậu quả nếu lọt |
|---|---|---|
| I1 | Nhánh phân biệt bằng `loiChanDoan` thay vì `daDich === null`. `err.message` là `''` với `new Error()` và `undefined` khi thứ bị ném không phải `Error` — cả hai đều falsy | Thông báo khẳng định *"KHÔNG thấy ở đâu trong `.vendor-build/`"* trong khi **không có gì được quét** |
| I2 | `err.message` tự nó ném `TypeError` khi `err` là `null`/`undefined` — **ngay trong `catch`** | Script chết bằng stack trace, người đọc mất luôn thông báo D12 — đúng thứ `try/catch` sinh ra để tránh |
| I3 | Thiếu nguyên nhân **"`dist/` cũ"**. `sửa vi.json → dung:vendor → kiem:dist` (chưa build): cây có bản dịch, `dist/` chưa | Chẩn đoán kết luận tree-shake rồi khuyên *"gỡ khoá"* — **đẩy người sửa đi xoá một khoá ĐÚNG**, nặng hơn cả thông báo cũ nó thay thế |
| I4 | Chính `HANDOFF.md` mang **bộ số thứ tư** | Chặng sinh ra để chấm dứt "một đại lượng, ba con số" gộp lại với bốn |

Lỗ hổng logic của I3 đáng nhớ: từ *"có trong `.vendor-build/`"* + *"không có trong `dist/`"*
**không** suy ra tree-shake, mà suy ra *"hoặc tree-shake, HOẶC `dist/` không sinh từ cây này"*.

I1 và I4 đều là **lỗ hổng của KẾ HOẠCH**, không phải của người thi hành — kế hoạch cho sẵn đoạn mã
dùng `loiChanDoan` làm bộ phân biệt, và §10 của spec chỉ liệt kê ba chỗ số liệu trong khi tài liệu
thật có bảy. Lặp lại bài học #1: **mã trong kế hoạch là bản nháp, không phải lời tiên tri.**

### NỢ ĐÃ ĐO ĐƯỢC — ✅ ĐÃ TRẢ Ở CHẶNG P1-D (mục 13)

> **Mục này giờ là HỒ SƠ.** Cả hai chỗ dùng `includes` đã chuyển sang phép literal trọn vẹn ở
> `9ce6955`. Giữ lại vì nó ghi số đo và lý do — thứ mục 13 không lặp lại.

Luật C hỏi *"bản dịch có trong chunk không"* bằng `noiDung.includes(v)`. Đo 2026-08-15 trên cùng
một `dist/`:

| Phép so khớp | Tới được | Không tới |
|---|---|---|
| `includes` — **đúng phép đang dùng** | 969 | 236 |
| Chuỗi nằm trọn trong một literal có nháy | **899** | **306** |

Lệch **70 chuỗi**; thủ phạm là chuỗi ngắn (`"="`, `"x"`, `"on"`, `"PDF"`) khớp ngẫu nhiên vào mã
đã minify.

Ở quy mô vài trăm khoá: một bản dịch ngắn là **chuỗi con của bản dịch khác** (`"Tô"` trong
`"Tô màu"`) sẽ được tính "có mặt" kể cả khi chỗ của chính nó đã bị tree-shake. Đúng dạng lỗi #11
của P1-B ("so khớp mù phạm vi") ở trục khác.

**Với 5 khoá hiện tại nợ này KHÔNG THỂ lộ** — cả 5 bản dịch ≥ 6 ký tự, phân biệt, không cái nào là
chuỗi con của cái nào. Hoãn có lý do: đổi phép so khớp là **đổi hàm quyết định xanh/đỏ của một
cổng**, cần bằng chứng đỏ riêng.

**Chặng sửa phải sửa CẢ HAI chỗ dùng `includes`** — luật C trong `kiem-dist.mjs` **và**
`timTrongCayVendor` trong `tim-ban-dich-vendor.mjs`. Nếu chỉ sửa một, chẩn đoán vừa dựng lên sẽ
liệt kê sai gói đúng lúc nó cần đúng nhất.

### Minor còn mở, chuyển chặng sau

- **M5** — chi phí quét tăng tuyến tính theo số khoá thiếu: `.vendor-build/` là 31 MB / 2.550 file,
  với ~900 khoá thiếu là ~28 GB lượt quét chuỗi con. Chỉ trên đường đỏ, nhưng chẩn đoán chạy hàng
  phút thì người ta Ctrl-C. Sửa rẻ: bỏ một chuỗi khỏi tập cần tìm sau khi đã gom đủ 4 chỗ.
- **M8** — `docGocGoi` thêm `''` vào tập khi có `package.json` ở gốc cây, nhưng `goiCuaDuongDan`
  không bao giờ trả `''`. Hợp đồng lệch giữa hai hàm; chưa lộ vì cây hiện tại không có.

### Cố ý KHÔNG sửa, đã cân nhắc

- `timTrongCayVendor` duyệt cây **hai lượt** (`docGocGoi` rồi `dietJs`). Lượt thứ hai không đọc
  nội dung file nên không đáng kể so với 31 MB đọc thật; gộp lại sẽ trộn hai mối quan tâm đang
  tách sạch.
- **KHÔNG có danh sách miễn** — quyết định 2 của chủ dự án, YAGNI. Một cơ chế miễn không ai dùng
  là cửa để sau này nhét khoá vào cho cổng xanh.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng d165b92 hoặc mới hơn
git status --short                      # kỳ vọng chỉ có hai file sinh ra ở mục 6
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
```

**Chặng kế tiếp là NỘI DUNG DỊCH** — và trước khi thêm khoá đầu tiên phải làm hai việc: xử nợ
`includes` ở trên, và **đo lại cả số chuỗi lẫn số từ lặp** (xem cảnh báo ở cuối mục 10).

---

## 13. CHẶNG P1-D ĐÃ XONG VÀ ĐÃ GỘP — siết phép so khớp bản dịch

Nhánh **`p1d-siet-so-khop`**, gốc `87e79bc`, gộp tại `9ce6955`.

| Tài liệu | Đường dẫn |
|---|---|
| Spec | `docs/superpowers/specs/2026-08-15-siet-so-khop-ban-dich-design.md` |
| Kế hoạch | `docs/superpowers/plans/2026-08-15-siet-so-khop-ban-dich.md` |

### Chặng này làm gì

Trả nợ `includes` ghi ở mục 12. Hai chỗ hỏi *"bản dịch này có mặt không"* bằng so khớp **chuỗi
con** giờ dùng **literal trọn vẹn**:

| Chỗ | Phép mới | Vì sao khác nhau |
|---|---|---|
| Luật C, `kiem-dist.mjs` | `coNhuLiteral` | `dist/` đã minify nên kiểu nháy do bộ đóng gói chọn — phải chấp cả `"`, `'`, `` ` `` |
| `timTrongCayVendor` | `coDungNhuDaChen` | `.vendor-build/` là đầu ra `tsc` chưa minify, bản dịch chèn bằng đúng `JSON.stringify` — so khớp **chính xác** được |

Cộng **cổng cấm hai khoá dịch ra cùng một chuỗi** (lớp lỗi phép chặt không cứu được), và **ghi
chú** phân biệt "khớp nhầm bản dịch khác" với "bộ đóng gói ghép chuỗi".

`vi.json` vẫn đúng **5 khoá**. `npm test` **122/122** (trước chặng 98/98).

### Phép thử quyết định — chạy đủ hai lượt

Thêm `"Clear column style": "Phong"` vào `vi.json`. `"Phong"` là **tiền tố** của `"Phong cách"`
đang ship; gói `affine/blocks/table` chưa bật nên chỗ thật của nó không tới `dist/`.

| | `kiem:dist` |
|---|---|
| **Trước khi vá** | **XANH** với `6/6 có mặt` — **SAI**, khớp nhầm vào `"Phong cách"` |
| **Sau khi vá** | **ĐỎ** `5/6`, nêu đúng gói chưa bật |

Cùng một `vi.json`, cùng một `dist/`, **chỉ đổi mã cổng**. Reviewer xác nhận hai lượt thật sự không
có lượt dựng lại xen giữa: cả hai in cùng `đã đọc 12 file trong dist/` và cùng số biến CSS.

### Ba Important của lượt review toàn nhánh

| # | Lỗi | Vì sao đáng nhớ |
|---|---|---|
| I1 | `giaiThichKhopTho` trả bản dịch **đầu tiên theo thứ tự khoá** chứa `v`, không kiểm nó có thật trong chunk — nhưng thông báo nói dứt khoát *"chỉ vì nó nằm trong bản dịch X"* | **Lớp lỗi P1-C bị bắt hai lần, lặp lại trong chính chặng sinh ra để chống nó.** Ca hỏng: `Xoá` / `Xoá cột` (chưa ship) / `Xoá dòng` (ship) — nếu `Xoá cột` đứng trước, thông báo đổ nguyên nhân cho một khoá **cũng đang thiếu** |
| I2 | Spec §4.2/§7.1 và Task 1 của kế hoạch vẫn kê toa `nhayHoa` — hàm đã bị gỡ vì thoát sai quy ước | Ai thi hành lại Task 1 sẽ **dựng lại đúng con bug**. Kế hoạch còn tự mâu thuẫn với chính nó |
| I3 | Tham số `ghiChu` và bất biến "ghi chú in TRƯỚC kết luận" không có ca kiểm nào | Chỉ chạy tay một lần; đảo hai dòng `dong.push` là hồi quy im lặng |

I1 và I2 đều là **lỗ hổng của kế hoạch/spec**, không phải của người thi hành.

Trước đó, lượt review Task 1 còn bắt một Important **plan-mandated**: `coNhuLiteral` dò cả ba kiểu
nháy nhưng thoát theo **một** quy ước (JSON = quy ước nháy kép). Đo được cả **5 bản dịch đang ship
nằm trong literal BACKTICK** (chunk có ~30.936 backtick, ~12.507 nháy kép, ~977 nháy đơn) — mà
trong backtick thì `"` **không cần thoát**. Một bản dịch chứa `"` sẽ bị tìm ở dạng không bao giờ
tồn tại → luật C **đỏ giả** trên bản dịch hợp lệ. Đã thay bằng `dangTrongNhay(s, nhay)`.

### Bài học lặp lại lần thứ ba

**Mã trong kế hoạch là bản nháp, không phải lời tiên tri.** P1-B: 11 lỗi, tất cả trong mã kế hoạch
cho sẵn. P1-C: 4 Important, hai trong số đó là kế hoạch. P1-D: Important của Task 1 **và** I1 **và**
I2 đều là kế hoạch/spec.

### Nợ còn mở, chuyển chặng sau

- **M2** — `dangTrongNhay` **hỏng im lặng** với ký tự nháy lạ: không có nhánh `else`, truyền `'“'`
  thì trả về chuỗi chỉ thoát gạch chéo mà không báo gì. Hôm nay không với tới được nhờ khai kiểu
  union, nhưng đúng lớp lỗi P1-B trả giá nhất. Thêm `else throw` là 3 dòng.
- **M3** — `coNhuLiteral` gọi `dangTrongNhay` **ba lần** mỗi lượt thay vì tính một lần; nằm trong
  vòng lặp O(file × chuỗi).
- **M4** — chuyển đổi ở `timTrongCayVendor` không có ca kiểm tích hợp; fixture đã sẵn.
- **M5** — `dangTrongNhay` không xử lý ký tự điều khiển (`\n`) — một bề mặt **đỏ giả** chưa ghi vào
  §8 của spec.
- **M6** (từ mục 12) — chi phí quét tăng tuyến tính theo số khoá thiếu: ~28 GB lượt quét nếu ~900
  khoá thiếu. Chỉ trên đường đỏ, nhưng chẩn đoán chạy hàng phút thì người ta Ctrl-C.

### Cố ý KHÔNG làm, đã cân nhắc

**Không cấm một bản dịch là chuỗi con của bản dịch khác.** Tiếng Việt chia nhau tiền tố quá nhiều
(`Xoá` / `Xoá dòng`). Reviewer đo được `"Phong cách"` chặt=true và `"Phong"` chặt=false ở **cùng
một file** — phép chặt đã xử triệt để, nên thêm ràng buộc biên tập ở đây là trả giá thật cho lợi
ích bằng không.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng 9ce6955 hoặc mới hơn
git status --short                      # kỳ vọng chỉ hai file sinh ra ở mục 6
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
```

**Chặng kế tiếp là NỘI DUNG DỊCH.** Nợ `includes` đã trả. Việc còn lại trước khi thêm khoá đầu
tiên: **đo lại cả số chuỗi lẫn số từ lặp** — xem cảnh báo ở cuối mục 10.
