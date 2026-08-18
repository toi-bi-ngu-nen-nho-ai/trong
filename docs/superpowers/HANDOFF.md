# BÀN GIAO — đọc file này đầu tiên

Cập nhật: **2026-08-18**. Dự án: **Bs Trọng** — PWA y khoa tiếng Việt.

> **ĐÍNH CHÍNH bản 2026-08-16 (viết đêm 16, trước khi gộp xong).** Bản đó ghi P1-E "8/8 task xong,
> CHƯA GỘP". Sáng 17/08 phát sinh tình huống hai lượt gộp tách rời — xem "CẢNH BÁO VẬN HÀNH — gộp
> PR trên GitHub bị THIẾU NỘI DUNG" ngay dưới mục 14. Trạng thái ĐÚNG bây giờ: **đã gộp đủ, bằng
> merge commit cục bộ `4babe67` sau khi PR trên GitHub chỉ mang được một phần.**

> **ĐÍNH CHÍNH bản 2026-08-13.** Bản đó viết *"P1-A đã gộp vào `main`, fast-forward
> `afac297 → a10401b`"*. **Điều đó chưa từng xảy ra ở bản sao này.** Chuỗi cha-thứ-nhất của `main`
> cho thấy `main` vẫn nằm ở `afac297` cho tới merge commit **`e0baa76`** (13/08 15:37), tức *sau*
> khi bản HANDOFF đó được viết (15:21). Cú gộp thật là một **merge commit**, không phải
> fast-forward. Đừng tin bảng cũ; tin `git log --first-parent main`.

## TRẠNG THÁI HÔM NAY — P1-E đã gộp, không còn chặng dở

| | |
|---|---|
| `main` | **`4babe67`** — merge commit cục bộ, gộp nốt phần P1-E mà PR GitHub #1 thiếu (xem cảnh báo dưới) |
| `p1e-noi-dung-dich` | `b97f056` — giữ lại làm bản sao lưu, không xoá |
| `p1d-siet-so-khop` | `b36a398` — giữ lại làm bản sao lưu, không xoá |
| `p1c-chuoi-khong-toi-dist` | `1c1a93d` — giữ lại làm bản sao lưu, không xoá |
| `p1b-vi-json-vi-tri` | `39315f3` — giữ lại làm bản sao lưu, không xoá |
| Cây làm việc | sạch (trừ `bang-bam-vendor.json` + `tsconfig.vendor-paths.json`, xem mục 6) |
| Bảy cổng | xanh — `tsc` exit 0 · `npm test` **159/159** (17 file) · `kiem:vendor` 2.782 file lệch 0 · `kiem:vendor-paths` 438 mục · `kiem:vendor-build` OK · `build` + `kiem:dist` xanh với `bản dịch vi.json — 132/132 có mặt` |

> **Về con số 159/159 (trước đó 148/148).** Đây là "lượt chạy gần nhất xanh", không phải "bộ test ổn
> định" — xem bài học ca đỏ chập chờn ở mục 6 (vẫn còn giá trị, dù chưa tái phát từ lượt vá
> `40f90e9`). Số 159/159 (17 file) là kết quả đo lại trực tiếp trong phiên đóng chặng "Gỡ nút thắt
> Images/MindMap" (mục 16, 2026-08-18) — tăng đúng 1 file/11 ca so với 148/148 (16 file) trước đó,
> không phải hồi quy về số lượng file.

**Chặng P1-E — nội dung dịch, đợt đầu — ĐÃ XONG VÀ ĐÃ GỘP** (`4babe67`, sau khi PR GitHub #1 gộp
thiếu — xem cảnh báo vận hành ngay dưới). 9/9 task, **tự soát trực tiếp, KHÔNG có lượt review toàn
nhánh kiểu opus** (lý do đã ghi ở mục 14). Chi tiết ở **mục 14**.

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

**5. Đảm bảo mọi việc (gồm cả agent) đều là model Sonnet 5 effect High**
---

## 2. TRẠNG THÁI GITHUB

| | |
|---|---|
| Repo | `https://github.com/toi-bi-ngu-nen-nho-ai/trong.git` |
| `origin/main` | tại hoặc sau merge commit **`9ce6955`** (P1-D). Đừng ghi SHA đỉnh vào đây — mỗi lượt cập nhật file này lại làm nó mục; tin `git log --first-parent origin/main` |
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

   > **NGUYÊN NHÂN GỐC ĐÃ XÁC NHẬN (2026-08-18) — chạm để gõ chữ không hiện bàn phím trên điện
   > thoại thật.** Chủ dự án tự kiểm trên máy: chạm vào bảng để soạn text, không có bàn phím ảo
   > nào hiện lên. Điều tra bằng `superpowers:systematic-debugging` (Phase 1-3, không sửa được vì
   > lý do dưới) tìm thấy gốc rễ trong chính cây vendored:
   >
   > - `addNote()` ở
   >   `src/vendor/blocksuite/affine/gfx/note/src/note-tool.ts:253-268` gọi
   >   `focusTextModel(gfx.std, blockId)` **bên trong `requestAnimationFrame`** — cả đường tạo note
   >   bằng tap (`click()`, dòng 119-130) lẫn bằng kéo-thả (`dragEnd()`, dòng 136-164) đều đi qua
   >   hàm này nên đều dính.
   > - `focusTextModel()` ở `src/vendor/blocksuite/affine/rich-text/src/dom.ts:66-73` tự nó
   >   **không gọi `.focus()`** — nó chỉ set một `TextSelection` trong store; DOM `.focus()` thật
   >   sự xảy ra sau đó qua một tầng reactive khác, tức càng xa hơn nữa khỏi cử chỉ chạm gốc.
   > - Safari trên iOS chỉ bật bàn phím ảo khi `.focus()` lên phần tử `contenteditable` được gọi
   >   **đồng bộ, ngay trong handler xử lý touchend/pointerup** của người dùng. Bất kỳ
   >   `requestAnimationFrame`/`.then()`/cơ chế reactive nào chen vào giữa đều cắt chuỗi "user
   >   gesture" đó — Safari lặng lẽ từ chối hiện bàn phím, không lỗi, không cảnh báo.
   > - **Không phải lỗi cục bộ.** Grep toàn bộ `.vendor-build`/`src/vendor`: MỌI lệnh gọi
   >   `focusTextModel()` trong cả cây (paragraph, list, callout, note, doc-title, edgeless-text…)
   >   đều bị hoãn qua `requestAnimationFrame`/`.then()`/`host.updateComplete.then()` — không một
   >   chỗ nào gọi đồng bộ trong handler gốc. Đây là cách toàn bộ luồng "tạo khối rồi focus vào nó"
   >   của thượng nguồn AFFiNE/BlockSuite được thiết kế, không phải một dòng lệch riêng lẻ vá được.
   >
   > **Vì sao chưa vá:** `note-tool.ts` và `dom.ts` nằm trong `src/vendor/blocksuite/` — luật D11
   > (`src/vendor/blocksuite/README.md`) cấm sửa, phải khớp thượng nguồn nguyên văn. Gốc rễ nằm ở
   > kiến trúc focus-qua-selection-reactive xuyên suốt cả cây, không phải một điểm vá cục bộ, nên
   > sửa đúng nghĩa đòi hỏi hoặc (a) vá thượng nguồn và chấp nhận lệch D11 có kiểm soát, hoặc
   > (b) đợi bản vá từ chính dự án AFFiNE/BlockSuite. Chủ dự án đã chọn: **ghi lại làm giới hạn đã
   > biết, không vá** ở lượt này — quyết định ở đây nếu quay lại vấn đề này.
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
- **Cấu hình `viewportRuntimeConfig` cho iOS** — ĐÃ ÁP DỤNG (`src/board/viewport-ios.ts`,
  `apDungViewportChoIOS()`, gọi ở top-level module của `EdgelessBoard.tsx`, trước
  `const viewManager = ...`). Bốn giá trị ghi đè hiện tại:
  - `SKIP_REFRESH_DURING_GESTURE: true`
  - `ZOOM_MIN: 0.3`
  - `CANVAS_DPR_CAP_BY_ZOOM: [[0.5, 1], [1, 2]]`
  - `LOW_ZOOM_GESTURE_ACTIVE_BLOCK_LIMIT: 24`

  Cả bốn giá trị này **CHƯA đo trên thiết bị iPad thật** — là điểm khởi đầu thận trọng, cần tinh
  chỉnh khi có dữ liệu thật.

  **Hiệu ứng phụ cần biết trước khi cầm iPad thật lên đo:** bật `SKIP_REFRESH_DURING_GESTURE` kéo
  theo ba hằng số khác — trước lượt này là dead code với app này vì nhánh dùng chúng chưa từng
  chạy — nay LÀ CODE SỐNG trên iOS: `POST_GESTURE_REFRESH_DELAY` (800ms, giữ nguyên mặc định
  thượng nguồn, KHÔNG bị lượt này đổi) và `OVERSCAN_RATIO`/`OVERSCAN_RATIO_BLOCK` (cả hai vẫn để
  `0`, mặc định thượng nguồn, KHÔNG phải giá trị dương để làm mượt khoảng trắng đó). Kết quả nhìn
  thấy trên iOS: buông cử chỉ pan/zoom → canvas trắng tối đa 800ms → nội dung mới vẽ lại. Đây là
  hành vi ĐÚNG DỰ KIẾN của đúng tổ hợp override này, không phải hồi quy — ai kiểm trên iPad thật
  cần biết trước để không báo nhầm thành lỗi.

  **Chưa đóng mục 7:** lượt này chỉ là MỘT biện pháp giảm thiểu, KHÔNG đóng rủi ro WKWebView bị hệ
  điều hành kill vì bộ nhớ nêu ở mục 7 — rủi ro đó vẫn mở, chưa có gì xác nhận trên thiết bị thật.

  Bộ ca kiểm liên quan: `src/board/__tests__/viewport-runtime-config.spec.ts` (cưỡng chế
  field-initializer vs getter động), `src/board/__tests__/viewport-ios.spec.ts` (logic phát hiện
  iOS + override), `src/board/__tests__/viewport-ios-order.spec.ts` (ghim thứ tự gọi trước
  `const viewManager`, vì tsc/test suite vẫn xanh dù thứ tự này bị đổi sai).

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

---

## 14. CHẶNG P1-E — nội dung dịch, đợt đầu — 9/9 TASK XONG, ĐÃ GỘP (hai lượt, xem cảnh báo)

Nhánh: `p1e-noi-dung-dich`, gốc `ec9623e` (= `main` lúc rẽ nhánh). Gộp vào `main` làm **hai lượt**:
PR GitHub #1 (`02e72de`, chỉ mang Task 1-5) rồi merge commit cục bộ `4babe67` (mang nốt Task 6-9).
Xem cảnh báo ngay dưới — đừng lặp lại tình huống này.

### CẢNH BÁO VẬN HÀNH — gộp PR trên GitHub bị THIẾU NỘI DUNG, phải gộp lượt hai bằng tay

Phiên trước (đêm 16/08) làm xong 9/9 task NHƯNG chỉ push tới `origin/p1e-noi-dung-dich` tới commit
`e255938` (hết Task 5) rồi dừng — Task 6-9 (129 khoá nội dung dịch + bản tự soát cuối) chỉ nằm trên
máy, **chưa push**. Sáng 17/08, chủ dự án tự mở Pull Request trên GitHub và bấm gộp — **PR đó chỉ
thấy tới `e255938`**, nên `origin/main` được gộp (`02e72de`, merge PR #1) **THIẾU HẲN nội dung dịch
thật** (`vi.json` vẫn 5 khoá, không phải 129).

Phiên sau (17/08) phát hiện ra khi `git fetch` thấy `origin/main` đã có merge commit lạ mà nhánh cục
bộ chưa từng thấy. Xử lý: push nốt phần còn lại lên `origin/p1e-noi-dung-dich`, rồi `git merge
p1e-noi-dung-dich` một lần nữa vào `main` cục bộ (merge sạch, không xung đột — vì `e255938` là tổ
tiên chung của cả `02e72de` và nhánh, git tự nối được), dựng lại cây, chạy đủ bảy cổng, rồi push
`main`.

**Bài học:** `git push origin <nhánh>` không tự động nghĩa là "toàn bộ commit của phiên đã lên
GitHub" nếu phiên dừng giữa chừng ở một task chưa push. **Trước khi mở PR hay bấm gộp trên GitHub,
luôn `git log origin/<nhánh> -1` để xác nhận SHA khớp với `HEAD` cục bộ** — đừng tin PR hiển thị đủ
nội dung chỉ vì tiêu đề PR đúng tên nhánh.

| Tài liệu | Đường dẫn |
|---|---|
| Spec | `docs/superpowers/specs/2026-08-15-noi-dung-dich-design.md` (bản 4) |
| Kế hoạch | `docs/superpowers/plans/2026-08-15-noi-dung-dich.md` |

### Chặng này làm gì

Thêm khoá dịch vào `src/board/vi.json` (5 → **129**, không phải 135 như kế hoạch dự tính — xem
"Sáu khoá bị loại" dưới đây) và 1 khoá vào `src/board/vi-tien-to.json` (file mới). Ba đợt nội
dung: 24 (toast/data-tip/tooltip edgeless) / **76** (nhãn menu, kế hoạch ghi 82) / 24 (mô tả dài).

Năm cơ chế/vá mới:
- **Thu hẹp D12 còn 5 vị trí hiển thị** (Task 1, đã xong TRƯỚC phiên này), bỏ `name`/`group`/
  `title`/`text`.
- **Cổng mẫu mã** (Task 2) — lưới chắn 3 dòng trong `dich-chuoi-vendor.mjs` cho khoá dạng
  `_tên`/`tên$`/`var(--…)`.
- **Cổng 4** (Task 3, `scripts/kiem-quan-he-dich.mjs`) — dây bẫy quét NGƯỢC: tìm mọi chỗ 5 tên còn
  giữ bị đọc lại làm khoá tra cứu/vế so sánh, so với bản khai ghim 4 toạ độ.
- **Cổng 5** (Task 4) — tính nhất quán tiền tố cho `vi-tien-to.json` (thay TRỌN CÂY qua
  `thayTrenToanCay`, không lọc vị trí) — vá lớp lỗi cắt chuỗi bằng `.replace()` trên literal đã dịch.
- **Vá nợ M3 của P1-D** (Task 5) — `coNhuLiteral` tính mỗi kiểu nháy một lần thay vì ba lần mỗi lượt gọi.

### Đã xong

| Task | Nội dung | Commit |
|---|---|---|
| 1 | Thu hẹp D12 còn 5 vị trí | `aaaf94d`, vá review `911481d` (đã xong TRƯỚC phiên này) |
| 2 | Cổng mẫu mã | code nằm trong `4e49cf1` (commit "dọn sạch" — TÊN SAI, xem cảnh báo dưới); vá cách ly test `2f1aa13` |
| 3 | Cổng 4 — dây bẫy quét ngược | `490ae7f` |
| 4 | `vi-tien-to.json` + thay trọn cây + Cổng 5 | `4a03735` |
| 5 | Vá nợ M3 (P1-D) | `d9bc3c5` |
| 6 | Nội dung Đợt 1 — 24 khoá | `7f6eea5` |
| 7 | Nội dung Đợt 2 — 76/82 khoá (6 bị loại, xem dưới) | `d61bf4b` |
| 8 | Nội dung Đợt 3 — 24 khoá | `589ad15` |

`npm test` **148/148** (16 file), trước chặng **122/122** (14 file).
Bảy cổng xanh: `tsc` exit 0 · `kiem:vendor` 2.782 lệch 0 · `kiem:vendor-paths` 438 · `build` +
`kiem:dist` xanh `bản dịch vi.json — 130/130 có mặt` (129 `vi.json` + 1 `vi-tien-to.json`).

### CẢNH BÁO VẬN HÀNH — commit "dọn sạch" mang lẫn nội dung Task 2

`4e49cf1` ("Dọn sạch superpower — xoá critique impeccable và output tạm") **không chỉ xoá file tạm
như tên nói** — nó còn mang theo toàn bộ mã Cổng mẫu mã của Task 2 (`dich-chuoi-vendor.mjs` +
test mới) VÀ hai chỉnh sửa UI không liên quan trong `src/App.tsx` (chữ "BS TRỌNG", vị trí cụm nút).
Không rõ vì sao ba việc khác bản chất gộp chung một commit — có thể do soạn tay ngoài quy trình
task-by-task. **Bài học: đọc `git show --stat` trước khi tin tên commit**, đừng giả định nội dung
khớp tên.

### Test isolation bug — Task 2 vượt qua CI mà không thật sự kiểm được gì

`src/__tests__/vendor-dich-chuoi-vendor.spec.ts` (Task 2) spawn `dich-chuoi-vendor.mjs` qua
`child_process` với `cwd` trỏ một thư mục tạm, giả định điều đó cách ly được script khỏi
`src/board/vi.json`/`.vendor-build/` của repo thật. **Sai** — `dich-chuoi-vendor.mjs` suy `GOC` từ
`import.meta.dirname` của CHÍNH NÓ (đúng quy ước dùng khắp `scripts/`), không phải từ `cwd` tiến
trình con. Nên bài test LUÔN đọc nhầm cây thật, và chỉ "xanh" tình cờ vì tại thời điểm Task 2 được
soạn, `.vendor-build/bao-cao-dich.json` của repo thật chưa tồn tại (cổng sớm chưa chặn được).
Lộ ra ngay khi phiên này chạy `npm run dung:vendor` thật rồi chạy lại test: cả ba ca "DỪNG" đều
fail sai lý do (bị chặn bởi cổng "cây đã dịch" thay vì cổng mẫu mã).

Vá ở `2f1aa13`: chép cả `scripts/` vào cây tạm để `import.meta.dirname` của bản chép tự trỏ đúng
GOC tạm; đặt cây tạm **dưới gốc repo** (không phải `os.tmpdir()`) để gói `typescript` vẫn phân giải
được qua `node_modules` của repo (ESM bare-specifier resolution duyệt node_modules từ thư mục chứa
file lên tổ tiên).

**Bài học cho chặng sau:** một cổng "xanh" từ `child_process` + `cwd` không tự động có nghĩa là đã
cách ly — phải kiểm cách script suy thư mục gốc của chính nó trước khi tin `cwd` cách ly được gì.

### Sáu khoá bị loại ở Đợt 2 — kế hoạch đoán sai gói, đo lại mới biết

Kế hoạch soạn 82 khoá cho Đợt 2 kèm một bảng "29 khoá pha trộn" khẳng định các vị trí `tooltip:`
còn lại của `Align left`/`Align center`/`Align right`/`Equation`/`Move Up`/`Move Down` nằm trong gói
ĐANG BẬT (`frame`/`gfx-group`). **Sai** — chạy `kiem:dist` thật sau khi thêm đủ 82 khoá cho thấy
106/112 có mặt, thiếu đúng 6 khoá này. Đo lại bằng `grep` trực tiếp `.vendor-build/`: vị trí
`tooltip:` DUY NHẤT của cả 6 khoá nằm trong `affine/blocks/image/src/configs/toolbar.js`,
`affine/blocks/latex/src/configs/slash-menu.js`, và `affine/widgets/slash-menu/src/tooltips/index.js`
— cả ba gói này **không có** trong `src/board/extensions.ts`. Các vị trí `name:`/`key:` của cùng
chuỗi ở gói đang bật (`blocks/note`, `blocks/table`, `data-view`) không phải vị trí hiển thị
(Task 1 đã loại `name`/`key` khỏi danh sách dịch) nên không tính.

Theo đúng quyết định đã chốt ở P1-C (không có danh sách miễn, từ chối và nói rõ vì sao): gỡ cả 6
khoá khỏi `vi.json` thay vì tìm cách ép chúng vào. Đợt 2 còn **76/82** khoá; tổng `vi.json` cuối
chặng là **129**, không phải 135 như kế hoạch dự tính.

**Bài học lặp lại lần thứ tư:** bảng phán quyết gói-nào-đang-bật trong một kế hoạch là suy luận lúc
lập kế hoạch, KHÔNG PHẢI phép đo — phải chạy `kiem:dist` thật sau mỗi đợt nội dung để xác nhận,
đừng tin bảng đó tới khi cổng còn chưa xanh.

### Tự soát trực tiếp, KHÔNG dùng subagent-driven-development đầy đủ

Theo phản hồi của chủ dự án ở chính chặng này từ phiên trước ("có mỗi dịch sang tiếng việt sau lại
tốn hết limit token 1 week mà vẫn chưa chạy được dịch, cứ làm tới làm lui"), phiên này làm trực tiếp
bằng Edit/Bash — tự chạy đủ bảy cổng sau mỗi task, tự soát diff, tự commit — **không** dispatch
implementer/reviewer/fixer subagent riêng cho từng task. Hai lỗi thật ở trên (cách ly test, 6 khoá
sai gói) đều bắt được bằng cách CHẠY THẬT (`npm run dung:vendor` + bảy cổng), không phải bằng đọc mã.

**Chưa có lượt review toàn nhánh kiểu opus** như P1-B/C/D từng có. Nếu muốn mức tin cậy tương đương
trước khi gộp, chạy `superpowers:requesting-code-review` hoặc `/code-review` trên khoảng
`ec9623e..HEAD` trước — phiên này chỉ tự soát, không phải review độc lập.

### Lưu ý vận hành — commit xen kẽ từ phiên khác

Lịch sử nhánh có hai commit `DungThuocScreen: đếm chạy...` (`e255938`) và `DungThuocScreen: font
mono...` (`db6f7cf`) xen giữa các commit P1-E — **không do phiên này tạo**, có vẻ là một phiên
Claude Code khác chạy song song trên cùng nhánh, chỉ sửa `src/App.tsx`/`lib/ui.ts`, không đụng gì
tới D12/`vi.json`/`scripts/`. Bảy cổng vẫn xanh sau khi các commit đó xen vào — không có xung đột
thật, nhưng đúng bài học đã ghi nhiều lần: `git log` lại trước mỗi lượt dispatch, đừng giả định
`HEAD` là commit mình vừa tạo.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng 4babe67 hoặc mới hơn, trên main
git status --short                      # kỳ vọng chỉ hai file sinh ra ở mục 6
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
```

**Đã gộp xong** (`4babe67`, đã push `origin/main`). Không còn việc gì dở của P1-E.

**Chặng kế tiếp:** đợt dịch thứ hai cho phần chuỗi thuộc nhóm gói chưa bật (162 chuỗi nhóm C cũ,
chủ yếu `affine/data-view` — cần bật tính năng trước, xem quyết định 1 của P1-C); hoặc giải quyết
mối nối `Images`/`MindMap` để mở khoá hai chuỗi đó (xem Global Constraints của kế hoạch P1-E); hoặc
Lưu trữ (D4)/BoardGallery như mục 8 cũ đã ghi.

---

## 15. NỢ THIẾT KẾ — `/impeccable critique DungThuocScreen` (2026-08-17) — HAI ĐỢT CRITIQUE, TẤT CẢ ĐÃ SỬA

Đường track riêng, không thuộc chặng P1 (vendor/dịch) ở trên. Ghi nợ ở phiên 2026-08-17 (mục này
từng ghi "CHƯA SỬA GÌ"); hai phiên kế tiếp cùng ngày đã trả hết cả bốn mục trực tiếp bằng Edit
(không dùng subagent-driven-development đầy đủ — việc đủ nhỏ). P2 có qua `superpowers:brainstorming`
trước khi sửa vì hướng chưa rõ (xem bên dưới); P0/P1/P3 làm thẳng không cần hỏi.

Báo cáo đầy đủ (dual-agent: 1 review thiết kế + 1 detector/bằng chứng trình duyệt độc lập), điểm
**36/40 (Good)**, đã lưu tại `.impeccable/critique/2026-08-17T04-00-34Z__src-app-tsx-dungthuocscreen.md`.
Xu hướng điểm bốn lượt gần nhất: 37 → 29 → 34 → **36**. Điểm đó là TRƯỚC cả bốn lượt sửa này — chưa
chạy lại critique để đo điểm mới (khuyến nghị làm ở phiên sau).

### Bốn vấn đề, đã xếp ưu tiên — TẤT CẢ ĐÃ SỬA

| Mức | Vấn đề | File:dòng (lúc ghi nợ) | Đã làm gì |
|---|---|---|---|
| **P0 — ĐÃ SỬA** | Xác nhận "liều gấp N lần bình thường" chỉ chặn *nhìn thấy* kết quả, không chặn hành động ghim vào Đang truyền / sao chép dòng cho biểu đồ | `InfusionCalculator`, `src/App.tsx:9304, 9589-9604, 9688-9713` | Thêm khoá xác nhận lần hai kiểu double-tap (đổi nhãn + màu nút, tự huỷ sau `CONFIRM_ICON_RESET_MS`, giống "Xoá công thức này") cho CẢ nút ghim VÀ nút chép câu Cách dùng, chỉ kích hoạt khi `severity` là `high`/`extreme`. State mới: `confirmPin`, `confirmCopyExtreme` — cả hai bị tắt ngay khi bất kỳ ô nhập nào đổi (dùng chung `useEffect` với `confirmed`), tránh chạm-hai lỡ tay xác nhận một liều KHÁC đã gõ sau chạm một. Đã kiểm tay trên trình duyệt thật (Noradrenaline 50×liều thường): chạm 1 chỉ đổi nhãn nút, không ghim/không chép; chạm 2 trong 2.5s mới thật sự chạy; hết 2.5s không chạm 2 thì tự huỷ về nhãn gốc. |
| **P1 — ĐÃ SỬA** | `dose`/`rateInput`/`conc`/`bagVolume` dùng `useState` thường, trong khi mọi lớp chọn khác của CÙNG màn đều `useStickyState` | `InfusionCalculator`, `src/App.tsx:9214-9217` | Chuyển cả bốn sang `useStickyState`, khoá `infusion.calc.{conc,dose,rate,bagVolume}.${drug.id}` (theo id thuốc, vì `InfusionCalculator` bị gỡ khỏi cây và dựng lại mỗi lần đổi thuốc đang mở). Đã kiểm tay: gõ liều dở dang, chuyển sang thuốc khác rồi quay lại → số còn nguyên; tải lại cả trang (F5, mô phỏng gián đoạn nặng hơn) → số vẫn còn (sessionStorage). |
| **P2 — ĐÃ SỬA** | Hàng 10 tab + hàng 6 chip đơn vị đều vượt ngưỡng ≤4 lựa chọn cùng lúc; chỉ tab mở gần nhất được nhớ, không có thứ tự theo tần suất dùng | Hàng tab: `src/App.tsx` gần `MIXING_TABS.map` (~10630, số dòng lúc ghi nợ) | Đọc kỹ trước khi sửa: hàng chip đơn vị KHÔNG cần đổi — `doseUnitOptions()` (`src/lib/infusion.ts:141`) đã luôn đặt đơn vị gốc của thuốc lên đầu và chọn sẵn. Chỉ sửa hàng tab: thêm `src/lib/tabUsage.ts` (`recordTabUse`/`sortByUsage`, đếm bằng `localStorage`, tích luỹ nhiều ca — khác `useStickyState` vốn `sessionStorage`), sắp lại thứ tự hiển thị theo tần suất đã chọn, tính đúng MỘT LẦN lúc `DungThuocScreen` dựng (không nhảy khi đang thao tác). Spec đầy đủ: `docs/superpowers/specs/2026-08-17-dungthuoc-tab-mru-design.md`. Đã kiểm tay: bấm "Giải độc" 5 lần → thứ tự KHÔNG đổi trong lúc đang ở màn; rời màn rồi quay lại → "Giải độc" nhảy lên đầu, 9 tab còn lại giữ nguyên thứ tự tương đối. 8 ca kiểm mới cho `tabUsage.ts` (cần `// @vitest-environment happy-dom` vì môi trường test mặc định của dự án là `node`, không có `localStorage`). |
| **P3 — ĐÃ SỬA** | Cửa sổ xác nhận xoá bệnh nhân (double-tap) chỉ 2.5s, ngắn hơn nhiều so với lý do đã dùng để kéo dài cửa sổ Hoàn tác lên 20s cho ĐÚNG cùng kịch bản bị cắt ngang | `CONFIRM_ICON_RESET_MS`, `src/App.tsx:5176` | Tách hằng số riêng `CONFIRM_PATIENT_RESET_MS = 20_000` thay vì sửa `CONFIRM_ICON_RESET_MS` dùng chung — hằng số cũ còn canh khoá ghim/chép liều cực đoan của P0, nơi cửa sổ NGẮN là chủ đích an toàn (buộc hai chạm sát nhau), không nên kéo dài theo. Đã kiểm tay: armed còn sống sau 5s (vượt cửa sổ cũ 2.5s), chạm 2 vẫn xoá đúng. |

Chi tiết đầy đủ (điểm 10 tiêu chí Nielsen, persona Alex/Casey, phần đối chiếu detector tĩnh vs.
overlay trình duyệt sống) nằm trong file đã lưu ở trên — đừng chép lại số liệu vào đây, đọc file gốc.

Xác nhận đã chạy sau lượt sửa CUỐI (P2, gồm cả P0/P1/P3 trước đó): `tsc --noEmit` exit 0 · `npm test`
**156/156** (17 file — 148 gốc + 8 ca mới của `tabUsage.spec.ts`) · `npm run build` + `kiem:dist`
xanh (`bản dịch vi.json — 130/130 có mặt`, vỏ app ~333,6 kB gzip — không đổi đáng kể). **Chưa có lượt
review toàn nhánh kiểu opus** cho bốn sửa này — chỉ tự soát + kiểm tay trên trình duyệt (đúng thói
quen `superpowers:verification-before-completion`).

**Lượt kiểm thử lại (TDD thật, `/superpowers:test-driven-development`) ngay sau đó** đã lấp hai lỗ
hổng: `lib/uiState.ts` (dùng khắp màn Dùng thuốc từ trước, kể cả bởi P1) chưa từng có ca kiểm nào —
xuất công khai `readStickyState` (đổi tên hàm nội bộ `read`, hành vi y hệt) và thêm
`src/lib/__tests__/uiState.spec.ts` (7 ca, quan trọng nhất: hai khoá khác nhau không đè nhau — đúng
bất biến P1 dựa vào để khoá theo `drug.id`). Logic chặn xác nhận của P0 (severity nào cần khoá,
chạm này nên vũ trang hay thực thi) tách sang `src/lib/confirmGate.ts`
(`shouldRequireExtraConfirm`/`resolveConfirmTap`, 8 ca ở `confirmGate.spec.ts`), rồi nối lại vào
`InfusionCalculator` thay cho `if (isExtremeSeverity && !confirmPin) {...}` inline cũ — hành vi y
hệt, đã kiểm tay lại trên trình duyệt (Noradrenaline 50×liều: chạm 1 vũ trang, chạm 2 mới ghim).
Cả hai module MỚI đều theo đúng trình tự RED (import lỗi/hàm không tồn tại) → GREEN (viết code tối
thiểu) → refactor nối vào App.tsx, không viết trước rồi test sau. P3 không có logic tách được (chỉ
là một hằng số) nên không thêm ca kiểm — xác nhận bằng kiểm tay như cũ. `npm test` sau lượt này:
**171/171** (19 file). `uiState.spec.ts`/`confirmGate.spec.ts` cũng cần
`// @vitest-environment happy-dom` cho file đầu (đọc `sessionStorage`), file sau thì không (thuần,
không đụng DOM).

### Lượt critique THỨ HAI (2026-08-17T17-38, cùng ngày) — 5 vấn đề mới, TẤT CẢ ĐÃ SỬA

Chạy lại `/impeccable critique DungThuocScreen` (dual-agent) sau khi bốn P0-P3 ở trên đã gộp trong
cùng phiên. Điểm **28/40** — TỤT so với 36/40 lần trước, nhưng không phải vì màn hình xấu đi: cả
hai P0 mới là **hệ quả trực tiếp** của chính bốn lượt sửa vừa xong (khoá sticky-state của P1 gặp
"xoá bệnh nhân" của track khác), bị bỏ sót vì trước đó chỉ kiểm tay từng tình huống RIÊNG LẺ, chưa
kiểm CHUỖI thao tác nối tiếp giữa chúng. Báo cáo đầy đủ đã lưu tại
`.impeccable/critique/2026-08-17T17-38-15Z__src-app-tsx-dungthuocscreen.md`. Xu hướng điểm 5 lượt:
37 → 29 → 34 → 36 → **28**.

| Mức | Vấn đề | Đã làm gì |
|---|---|---|
| **P0 — ĐÃ SỬA** | "Xoá bệnh nhân" không xoá liều đang nhớ của `InfusionCalculator`; đổi cân nặng cho "bệnh nhân mới" tính ra kết quả cực đoan CHƯA xác nhận, khoá không tự vũ trang lại | `useEffect` reset `confirmed`/`confirmPin`/`confirmCopyExtreme` trước chỉ theo dõi `[dose, rateInput, conc, unitId, mode]` — thêm `weightKg` vào mảng phụ thuộc. Kiểm tay: xoá bệnh nhân → khoá tự vũ trang lại (hiện "Tôi đã kiểm tra lại"); nhập cân nặng mới → khoá VẪN còn, không nhảy thẳng ra kết quả sẵn sàng ghim. |
| **P0 — ĐÃ SỬA** | Liều đã ghim mất hết tín hiệu severity khi vào "Đang dùng" (`RunningPanel`) — liều cần double-tap mới ghim được lại trông y hệt liều thường trong bảng dùng để bàn giao ca | Thêm `severity?: DoseSeverity` vào `RunningDrug` (`lib/runningDrugs.ts`), ghi lại lúc `pinRunning()` trong `InfusionCalculator`. `RunningPanel` áp `SEVERITY_STYLE[r.severity]` (màu chữ + icon cảnh báo) cho mục severity high/extreme — dùng lại ĐÚNG bảng màu của máy tính liều, không bịa bảng riêng. Kiểm tay: liều 50×ghim vào RunningPanel hiện màu đỏ + icon, xác nhận qua `getComputedStyle`. |
| P1 — ĐÃ SỬA | Cửa sổ vũ trang 20s của "Xoá bệnh nhân" (P3 chặng trước) không có đồng hồ đếm ngược nhìn thấy, khác `ConfirmIconButton` | Thêm dải đếm ngược dạng thanh (`@keyframes confirmDrain`, `src/index.css`) — khác vòng tròn của `confirmRing` vì đây là pill có chữ, không phải icon vuông. Tôn trọng `prefers-reduced-motion`. Thêm `aria-label` báo "chạm lần nữa để xác nhận, tự huỷ sau 20 giây". Kiểm tay: phần tử `span[style*="confirmDrain"]` có mặt khi armed. |
| P2 — ĐÃ SỬA | Con số liều chính (hero) và dòng "Đặt bơm" có thể lệch số lẻ ở tốc độ ≥100 mL/giờ (`formatDoseNumber` làm tròn theo độ lớn, "Đặt bơm" làm tròn theo bước bơm — hai quy tắc độc lập) | Chuyển `rateDecimals` lên định nghĩa sớm hơn (ngay sau `pumpStep`); ở chế độ `doseToRate`, `resultFinalText`/`resultDecimals` dùng `result.toFixed(rateDecimals)` thay vì `formatDoseNumber(result)`. Chế độ `rateToDose` (kết quả là LIỀU, không có dòng "Đặt bơm" đối chiếu) giữ nguyên `formatDoseNumber`. Kiểm tay: "2625.0" và "Đặt bơm 2625.0" nay khớp số lẻ (trước đây sẽ là "2625" vs "2625.0"). |
| P2 — ĐÃ SỬA | Sắp tab theo MRU (chặng trước) tính lại mỗi lần `DungThuocScreen` DỰNG, không phải mỗi PHIÊN — rẽ qua màn khác 5 giây rồi quay lại có thể xáo hàng tab | Thêm `reconcileOrder()` (`lib/tabUsage.ts`, thuần, 5 ca kiểm) — không bao giờ làm mất một tab nếu `MIXING_TABS` đổi giữa chừng. Thứ tự lưu vào `sessionStorage` (`dungthuoc.tabOrder`, qua `useStickyState`) ngay sau khi tính lần đầu trong phiên; các lần dựng màn SAU trong CÙNG phiên đọc lại y nguyên. Kiểm tay: bấm "Giải độc" 5 lần, rời/quay lại màn trong CÙNG tab trình duyệt → thứ tự KHÔNG đổi; mở TAB MỚI (sessionStorage sạch, `localStorage` vẫn còn đếm) → "Giải độc" nhảy lên đầu đúng như tính lại từ đầu phiên. |

Xác nhận đã chạy sau lượt sửa này: `tsc --noEmit` exit 0 · `npm test` **176/176** (19 file — 171
trước đó + 5 ca mới của `reconcileOrder`) · `npm run build` + `kiem:dist` xanh (`bản dịch vi.json —
130/130 có mặt`). Cả 5 vấn đề đã kiểm tay trực tiếp trên trình duyệt (không chỉ tin ca kiểm đơn vị),
gồm cả kịch bản CHUỖI thao tác đầy đủ (ghim liều cực đoan → xoá bệnh nhân → nhập cân nặng mới →
xác nhận khoá còn hiệu lực) — đúng bài học của chính lượt critique này: kiểm từng tình huống riêng
lẻ không đủ, phải kiểm chuỗi nối tiếp.

### Việc còn lại — không phải nợ kỹ thuật, chỉ là gợi ý cho phiên sau

```
Chín vấn đề (bốn P0-P3 chặng đầu + năm vấn đề chặng critique thứ hai) của nợ thiết kế DungThuocScreen
(mục 15 HANDOFF.md) đều đã sửa xong, cùng trong phiên 2026-08-17. Nếu muốn có điểm số MỚI làm mốc so
sánh (điểm 28/40 hiện ghi trong file là điểm TRƯỚC lượt sửa 5-vấn-đề cuối), chạy lại
/impeccable critique DungThuocScreen — và LẦN NÀY, nếu lại tìm ra vấn đề mới, ưu tiên kiểm xem nó có
phải hệ quả của các lượt sửa TRƯỚC ĐÓ hay không trước khi coi là nợ hoàn toàn mới.

Chưa có lượt review toàn nhánh kiểu opus cho bất kỳ sửa nào trong cả hai đợt — nếu muốn mức tin cậy
tương đương các chặng P1-B/C/D trước khi coi là "đóng nợ hẳn", chạy superpowers:requesting-code-review
hoặc /code-review. Track này KHÔNG nằm trong bản đồ phục hồi ở mục 3 (đường track riêng, không thuộc
chặng P1 vendor/dịch) — dùng `git log --oneline` để tìm các commit "DungThuocScreen: sửa..." + "Spec
P2..." của phiên 2026-08-17, thay vì tin một bảng chép tay có thể lệch.
```

---

## 16. GỠ NÚT THẮT IMAGES/MINDMAP — ĐÃ XONG, CHỜ GỘP

Track MindmapScreen, không thuộc chặng P1 (vendor/dịch nội dung) nào có số hiệu riêng — xem
docs/superpowers/specs/2026-08-17-go-nut-that-loai-tep-design.md.

### Chặng này làm gì

`FileTypes.description` trong `affine/shared/src/utils/file/filesys.js` vừa là nhãn hiển thị vừa
là khoá tra cứu (`FileTypes.find(i => i.description === acceptType)`, hai lượt). Dịch
`"Images"`/`"MindMap"` sang tiếng Việt trước đây sẽ làm `openFilesWith`/`importMindmap` ném lỗi khi
người dùng bấm nhập sơ đồ tư duy hoặc chèn ảnh. Đã thêm bước mới ("Bước 4a" của `dung:vendor`,
`scripts/tach-dinh-danh-loai-tep.mjs`) chèn mảng định danh song song `FILE_TYPE_IDS` (không đụng
object `FileTypes` — object đó được truyền nguyên vẹn vào `window.showOpenFilePicker()`), đổi hai
lượt `.find(...)` sang tra chỉ số. Cổng 4 của D12 (`BAN_KHAI_TIEU_THU`) rụng hai mục
`filesys.js:175/205` — hệ quả đúng mong muốn.

### Đã xong

| Task | Nội dung | Commit |
|---|---|---|
| 1 | `tachDinhDanhLoaiTep` — hàm thuần, 11 ca kiểm | `766c477` |
| 2 | Nối vào pipeline, cập nhật Cổng 4 | `7ce96ce` |
| — | Đính chính spec+plan giữa chừng: khoá `"MindMap"` đổi từ `"Sơ đồ tư duy"` sang `"Bản đồ tư duy"` (trùng giá trị với khoá `"Mind Map"` có sẵn, bị Cổng `kiem-dist.mjs`/`timTrungBanDich` chặn) | `fcfec0b` |
| 3 | Nội dung dịch — cả hai khoá `"MindMap"` và `"Images"` | `62a4420` |

`npm test` **159/159** (17 file), trước chặng 148/148 — tăng đúng 1 file (bộ kiểm
`tach-dinh-danh-loai-tep`, 11 ca) so với trước chặng.
`kiem:dist` báo `bản dịch vi.json — 132/132` khoá có mặt (130 khoá cũ trước chặng + 2 khoá mới
`MindMap`/`Images`, không khoá nào bị loại).

Bảy cổng đo lại trực tiếp trong phiên đóng chặng (2026-08-18), không chép số cũ: `npx tsc --noEmit`
exit 0 · `npm test` 159/159 (17 file) · `kiem:vendor` — so 2782 file với `bang-bam-vendor.json` và
thượng nguồn, lệch 0, không đối chiếu được 0 · `kiem:vendor-paths` — khớp 438 mục paths ·
`npm run build` xanh · `kiem:dist` — `bản dịch vi.json — 132/132 có mặt`, không còn `"affine-"`,
mọi biến `--drt-*` dùng đều có định nghĩa.

### Kiểm tay trên trình duyệt thật

**Xác nhận được bằng dò mã nguồn/console/DOM của bundle đã dựng** (không phải bằng thao tác chạm
thật): dev server khởi động sạch, board tải lên với console không lỗi, nút nhập bản đồ tư duy trên
toolbar tồn tại trong DOM. Chuỗi gọi trong bundle thật đã served —
`mindmap-tool-button.js → importMindmap() → openSingleFileWith('MindMap') → filesys.js` tra
`FILE_TYPE_IDS` → `description: "Bản đồ tư duy"` — đã lần theo đúng, khớp thiết kế Cổng 4.

**KHÔNG xác nhận được** bằng thao tác bấm thật: liệu hộp thoại chọn tệp của hệ điều hành có thật sự
mở ra và hiển thị "Bản đồ tư duy" làm nhãn bộ lọc hay không. Công cụ Browser pane trong phiên không
người theo dõi này (không ai đang thực sự xem màn hình) trả lỗi
`"the Browser pane is not displayed, so the page is not compositing frames"` cho MỌI thao tác
screenshot/click theo toạ độ — không phải lỗi thử lại được, đã tái hiện độc lập ở phiên kiểm soát,
xác nhận đây là giới hạn môi trường thật, không phải lỗi có thể sửa bằng cách đổi subagent hay thử
lại. **Còn nợ:** kiểm tay ~2 phút khi chủ dự án ở trước màn hình thật — bấm nút nhập bản đồ tư duy,
xác nhận hộp thoại chọn tệp hiện nhãn "Bản đồ tư duy" (không phải "MindMap" hay lỗi).

### Bài học / nợ còn lại

**Hai chữ tiếng Việt cho cùng một khái niệm.** Khoá cũ `"Mind Map"` dịch `"Sơ đồ tư duy"` (nhãn
toolbar), khoá mới `"MindMap"` của chặng này phải dịch `"Bản đồ tư duy"` (nhãn bộ lọc hộp thoại mở
tệp) — hai chuỗi khác nhau cho cùng một khái niệm "mind map", ép buộc bởi cổng cấm trùng bản dịch
(`kiem-dist.mjs`/`timTrungBanDich`), không phải lựa chọn tự nguyện. Vi phạm chính nguyên tắc "cùng
khái niệm, cùng chữ" mà spec ban đầu đề ra (§5). Xem giải thích đầy đủ ở
`docs/superpowers/specs/2026-08-17-go-nut-that-loai-tep-design.md` §5 (đoạn ngay sau ĐÍNH CHÍNH) —
đợt dịch `affine/data-view` sắp tới nhiều khả năng gặp lại đúng kiểu va chạm này ở quy mô lớn hơn
nếu cây vendor còn khoá tiếng Anh gần-trùng-nghĩa khác.

**Cố ý hoãn (không phải thiếu sót):** gộp hàm chung kiểm `parseDiagnostics` dùng 3 lần rải rác giữa
`luat-vi-tri-dich.mjs` và `tach-dinh-danh-loai-tep.mjs` — bị hoãn vì đây là refactor xuyên suốt mã
D12 gốc đã được review/chốt từ trước, nằm ngoài phạm vi chặng này; rủi ro đổi mã đã ổn định không
đáng để đóng một mối DRY nhỏ. Chưa có task nào nhận việc này.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng SHA của chính commit HANDOFF này (sau 62a4420) hoặc mới hơn
git status --short                      # kỳ vọng chỉ hai file sinh ra ở mục 6
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
```

Commit HANDOFF của mục này được tạo NGAY SAU `62a4420` (HEAD lúc đo bảy cổng ở trên) — SHA thật của
nó chưa biết tại thời điểm viết mục này; kỳ vọng ở dòng `git log` trên là "SHA của chính commit đó
hoặc mới hơn", không phải `62a4420`.

**Chặng kế tiếp** (không đổi so với mục 14 cũ, trừ mục vừa xong): đợt dịch thứ hai cho nhóm gói
chưa bật (chủ yếu `affine/data-view`, cần bật tính năng trước); hoặc Lưu trữ (D4)/BoardGallery.

## 17. LƯU TRỮ BỀN VỮNG CHO NỘI DUNG BẢNG (D4 — PHẦN NỘI DUNG) — ĐÃ XONG, CHỜ GỘP

Track MindmapScreen, phần "ruột bảng" — xem
docs/superpowers/specs/2026-08-18-luu-tru-noi-dung-bang-design.md.

### Chặng này làm gì

`taoBangTrong()` trước đây luôn dựng workspace trắng trong bộ nhớ, mất nội dung khi tải lại trang.
Đổi thành `taoHoacMoBang()` — bất đồng bộ, nối `IndexedDBDocSource`/`IndexedDBBlobSource` (đã có
sẵn trong `@blocksuite/sync`, CSDL riêng `'drtrong-board'`), đợi đồng bộ xong CÓ HẠN GIỜ (4 giây —
`waitForSynced()` tự thử lại mỗi 5 giây vô thời hạn khi lỗi, `await` trần sẽ treo mãi mãi nếu
IndexedDB hỏng vĩnh viễn). Rẽ nhánh `getDoc`/`createDoc` để không nhân đôi nội dung khi mở app lần
hai trở đi (`createDoc` ném lỗi nếu doc đã tồn tại). `EdgelessBoard()` hiện "Đang mở bảng…" trong
lúc chờ, dọn `workspace.forceStop()` lúc unmount.

Phạm vi CHỈ nội dung một bảng hiện có (id cứng, giữ nguyên) — danh sách bảng/metadata và
BoardGallery dời sang chặng riêng, cùng hack "mount vĩnh viễn" ở `App.tsx` (spec §8).

### Đã xong

Lịch sử thật có **7 commit** ngoài kế hoạch gốc (kế hoạch chỉ tính 2 task) — giữa chừng phát hiện
một race điều kiện thật và lượt review toàn nhánh (2 vòng) bắt thêm 1 Critical + nhiều Important,
đúng tinh thần "ghi lại lỗi thật tìm được, không chỉ đường thuận buồm" mà HANDOFF này đã theo ở các
mục trước (ví dụ mục 16, dòng `fcfec0b`):

| Task | Nội dung | Commit |
|---|---|---|
| 1 | `taoHoacMoBang()` — bất đồng bộ, IndexedDB qua `IndexedDBDocSource`/`IndexedDBBlobSource`, canh tồn-tại-doc trước `createDoc`, `waitForSynced()` có hạn giờ 4s; nối vào `EdgelessBoard()`; 4 ca kiểm hàm thuần. Review: 2 Minor không chặn — thiếu `.catch()` trên chuỗi promise trong `EdgelessBoard()`, và devDependency `fake-indexeddb` mới thêm | `81c99c5` |
| — | Đính chính kế hoạch giữa chừng: 3 lỗi thật tự phát hiện lúc thi hành Task 1 (ca kiểm đếm sai loại block con — root CHÍNH LÀ `affine:page` nên không thể có `affine:page` con, phải đếm `affine:surface`; import `Doc` thừa chặn `noUnusedLocals`; bốn lượt `await vi.waitFor(...)` thiếu bọc `act()` quanh cập nhật state React bất đồng bộ). Cả ba do implementer Task 1 tự phát hiện, báo NEEDS_CONTEXT thay vì tự vá | `0320888` |
| 2 | 3 ca kiểm vòng đời mount mới (thứ tự trạng thái chờ, vòng lưu-mở-lại, unmount giữa chừng) — chỉ thêm kiểm, không đụng `EdgelessBoard.tsx`. Lúc viết ca kiểm vòng lưu-mở-lại, phát hiện race điều kiện THẬT trong mã Task 1 (xem dòng dưới) — báo cáo đúng phạm vi thay vì tự vá ngoài task | `9540be9` |
| 2b (bổ sung ngoài kế hoạch, controller điều phối trực tiếp giữa phiên) | Vá race Task 2 phát hiện: `forceStop()` lúc unmount có thể cắt ngang việc ghi block seed xuống IndexedDB trước khi flush xong → `npm test` chớp nhoáng đỏ dưới tải song song (quan sát 2/3 lượt chạy toàn bộ suite đỏ). Thêm `waitForSynced()` có hạn giờ THỨ HAI (cùng cơ chế Task 1) sau khi ghi seed — nhưng KHÔNG đối xứng với lần đợi đầu: hết giờ chỉ cảnh báo và tiếp tục, KHÔNG huỷ nội dung đã seed (lần đợi đầu hết giờ thì dựng lại workspace bộ nhớ mới, vì lúc đó chưa có gì để mất). Xác minh: chạy `npm test` toàn suite 3 lần liên tiếp, cả 3 xanh (so với 2/3 đỏ trước vá, cùng điều kiện tải) | `ece47f4` |
| Sửa kiểu (phát hiện lúc kiểm 2b) | `tsc --noEmit` thật ra đã đỏ từ ngay sau commit Task 2 (`9540be9`) — lỗi kiểu thật `unknown[]` khác `unknown[][]` trong file ca kiểm, lọt qua review Task 2 vì lượt đó không được yêu cầu chạy `tsc`. Sửa 1 dòng chú thích kiểu, không đổi hành vi; xác nhận `tsc --noEmit` exit 0 và các ca kiểm liên quan vẫn xanh. Review chung với diff của 2b | `cdca4bc` |
| Review toàn nhánh, vòng 1 | 1 Critical + nhiều Important/Minor: seed điều kiện tự hồi phục doc đăng ký trong IndexedDB nhưng chưa từng ghi xong block gốc (đóng tab giữa hai lượt ghi, hai tab đua, StrictMode double-mount) — trước đây ném `BlockSuiteError` và brick bảng vĩnh viễn; thêm `.catch()` cho chuỗi promise (lỗi thật hiện "Không mở được bảng." thay vì treo mãi); băng cảnh báo `khongLuuDuoc` khi rơi về chế độ chỉ-trong-bộ-nhớ (quyết định chủ dự án, đã hỏi qua AskUserQuestion); gom `doiCoHanGio()` dùng chung cho hai lần đua hạn giờ; thêm ca kiểm nội dung thật sống sót qua lưu/mở lại; `afterEach` unmount cây React trước khi gỡ container. Xác minh: `npm test` toàn suite chạy 3 lần liên tiếp đều 196/196 xanh | `decf919` |
| Review toàn nhánh, vòng 2 (tái kiểm sau vòng 1) | Bắt được 2 lỗ hổng trong CHÍNH các fix của vòng 1: (a) ca kiểm unmount-giữa-chừng "đã sửa" ở vòng 1 vẫn không thể đỏ thật — `querySelector` trên `document`/`container` sau khi React gỡ cả cây luôn trả `null` bất kể guard đúng hay sai, cùng lớp lỗi bản gốc; (b) fix Critical (tự hồi phục doc thiếu block) hoàn toàn chưa có ca kiểm hồi quy. Sửa cả hai bằng kỹ thuật ca kiểm #1 trong file đã chứng minh đúng: giữ tham chiếu DOM TRƯỚC unmount, kiểm trên tham chiếu đó sau khi tháo — không phải `document`. Ca kiểm hồi quy mới mô phỏng ghi dở dang bằng xoá đúng entry subdoc `'board'` khỏi kho giả lập DocSource. Cả hai xác nhận ĐỎ THẬT khi tắt guard, XANH sau khi hoàn tác (bằng chứng trong `.superpowers/sdd/`). Kèm: bỏ `laLanDau` khỏi điều kiện seed (chỉ `!store.root` — an toàn hơn, tránh seed đè nội dung thật nếu mất metadata mà subdoc còn sống); nhánh tự hồi phục "có root nhưng thiếu surface"; `try/catch` quanh `taoHoacMoBang()` chống rò rỉ `DocEngine`; băng cảnh báo thêm `pointer-events-none`+`role=status`/`aria-live`; sửa comment lỗi thời ở `scripts/tao-paths-vendor.mjs`. Xác minh cuối: `npx tsc --noEmit` sạch, `npm test` toàn suite **197/197** (21 file, 71.4s) | `498cab1` |

`npm test` **197/197** (21 file), trước chặng (tại điểm nhánh này rẽ khỏi `main`, commit `9ea9928`)
**188/188** (21 file) — tăng 9 ca kiểm ròng trong 2 file ĐÃ CÓ SẴN (không thêm file mới):
`edgeless-board.spec.ts` (hàm thuần: seed, hồi phục doc dở dang, nội dung sống sót qua lưu/mở lại),
`edgeless-board-mount.spec.ts` (vòng đời mount: trạng thái chờ, vòng lưu-mở-lại, unmount giữa
chừng, băng cảnh báo).

Bảy cổng đo lại trực tiếp ở điểm gộp cuối cùng (2026-08-18, sau commit `498cab1`), không chép số
cũ: `npx tsc --noEmit` exit 0 · `npm test` **197/197** (21 file, 71.4s) · `kiem:vendor` — so 2782
file với `bang-bam-vendor.json`, 0 sai lệch; so 2782 file với thượng nguồn, lệch 0, không đối chiếu
được 0 · `kiem:vendor-paths` — khớp 438 mục paths · `npm run build` xanh (16.19s, cảnh báo chunk
>500kB chỉ mang tính thông tin, không phải lỗi cổng) · `kiem:dist` — đọc 12 file trong `dist/`,
biến `--drt-*` dùng 73/định nghĩa 639, biến CSS dùng 315/định nghĩa 924, **bản dịch vi.json —
132/132 có mặt**, không còn `"affine-"`, mọi biến `--drt-*` dùng đều có định nghĩa. Chặng này không
đụng cây vendored hay `vi.json` nên ba cổng vendor/dist giữ nguyên số so với mục 16 — đúng như dự
đoán, đã CHẠY THẬT để xác nhận chứ không chỉ suy luận.

### Kiểm tay trên trình duyệt thật

**Không xác nhận được vòng gõ chữ → tải lại → còn nội dung** — cùng giới hạn môi trường đã ghi ở
mục 16 (phiên này không có người đang xem trực tiếp Browser pane). Diễn biến thật của lượt thử:

1. `preview_start` (`drtrong-dev`) khởi động sạch, không lỗi.
2. Lượt `screenshot` đầu tiên báo đúng lỗi đã biết: `"the Browser pane is not displayed, so the
   page is not compositing frames"`.
3. Các công cụ không cần compositing (`get_page_text`, `javascript_tool`, `read_page`) VẪN chạy —
   sau khi đợi vite transform xong (~15s cho lượt tải đầu, 3950 module), trang chủ dựng đúng: tiêu
   đề "Bác sĩ Trọng — Sổ tay lâm sàng", nội dung "BS TRỌNG", điều hướng "Điều hướng chính" với 5 tab
   kể cả "Mindmap" (`ref_10`), console không có lỗi, network toàn bộ 200 OK.
4. Bấm `ref_10` (tab Mindmap) qua `computer` "left_click" hai lượt riêng biệt (đọc lại `read_page`
   giữa hai lượt để tránh ref cũ) — lệnh trả về "thành công" nhưng DOM/`document.body.textContent`
   sau đó vẫn y nguyên màn Trang chủ, bảng vẽ không xuất hiện (`document.querySelector('canvas')` →
   `null`). Thử `left_click` bằng toạ độ thô thay vì `ref` bị chặn thẳng: lỗi đòi phải có
   `screenshot` trước để cache kích thước — chính là bước đã báo lỗi compositing ở bước 2.

Kết luận: khác mục 16 (dò được qua mã nguồn/console/DOM bundle đã dựng vì không cần tương tác thật),
lượt này CÓ dựng được trang và đọc được DOM ban đầu, nhưng **không đưa được thao tác bấm tới ứng
dụng thật** — nhất quán với cùng nguyên nhân gốc (pane không hiển thị/compositing cho người xem
thật), không phải lỗi mới hay lỗi mã. **Còn nợ:** kiểm tay ~2 phút khi chủ dự án ở trước màn hình
thật — mở tab Mindmap, gõ vài chữ vào bảng, tải lại trang (F5), xác nhận nội dung còn nguyên.

### Ngoài phạm vi, còn nợ

- Danh sách bảng/metadata, `idb.ts` `DB_VERSION` → 5, màn BoardGallery — chặng riêng (spec §8).
- Gỡ hack "mount vĩnh viễn" ở `App.tsx` (giữ `<EdgelessBoard />` mount sau lần mở đầu, ẩn bằng CSS
  thay vì unmount) — cố ý chưa gỡ, chờ persistence chạy ổn định thật trước (spec §8).
- Tên CSDL `'drtrong-board'` cố định, chưa theo id bảng — nợ kỹ thuật thật cho chặng multi-board,
  xem spec §7.
- Hai khoản nợ nhỏ từng ghi ở đây (thiếu `.catch()` trên chuỗi promise; thiếu ca kiểm cho nhánh
  "tự hồi phục doc dở dang") đã vá ở `decf919`/`498cab1` — xem bảng "Đã xong" ở trên. Nợ còn lại
  thật sự: nhánh "`waitForSynced()` thứ hai hết giờ chỉ cảnh báo, không huỷ nội dung" (Task 2b) vẫn
  chỉ được xác minh gián tiếp qua nhiều lượt chạy suite đầy đủ, chưa có ca kiểm đơn lẻ ép buộc
  timeout ở đúng thời điểm đó để ghim hành vi — cố ý để lại vì cần giả lập timing chính xác giữa
  seed-write và race thứ hai, rủi ro thấp hơn giá trị ca kiểm mang lại ở quy mô chặng này.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng SHA của chính commit HANDOFF này hoặc mới hơn
git status --short                      # kỳ vọng chỉ hai file sinh ra ở mục 6
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
```

**Chặng kế tiếp:** BoardGallery (màn danh sách bảng, cần bảng metadata trước — xem "Ngoài phạm vi"
ở trên); hoặc đợt dịch thứ hai cho nhóm gói chưa bật (`affine/data-view`).
