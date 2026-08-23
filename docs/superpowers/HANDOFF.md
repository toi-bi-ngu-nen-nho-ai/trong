# BÀN GIAO — đọc file này đầu tiên

Cập nhật: **2026-08-22**. Dự án: **Bs Trọng** — PWA y khoa tiếng Việt.

> **ĐÍNH CHÍNH bản 2026-08-22 (mục 21).** Chặng tiếp theo sau "Database + Note đầy đủ" là **"Dịch
> bề mặt hiển thị, đợt 2"** — **đã xong** (2 commit trực tiếp trên `main`, không worktree), bảy cổng
> xanh, kiểm tay MỘT PHẦN trên trình duyệt thật (xác nhận trực tiếp 1/16 khoá mới, 15/16 còn lại dựa
> bằng chứng gián tiếp — xem "còn nợ"). Phát hiện sai lệch với spec: 8/38 chuỗi spec tưởng "tới dist
> ngay" thực ra thuộc 5 gói chưa bật `ViewExtension` — xem **mục 21**.

> **ĐÍNH CHÍNH bản 2026-08-21 (mục 19 trở lên).** Chặng tiếp theo sau "đẩy hiệu ứng DanhSachBang" là
> **"Database + Note đầy đủ"** (bật 10 extension BlockSuite còn thiếu: Database, SlashMenu,
> DragHandle, 7 inline) — **đã xong, đã review toàn nhánh, VÀ đã gộp** — xem "TRẠNG THÁI HÔM NAY"
> ngay dưới và **mục 20**.

> **ĐÍNH CHÍNH bản 2026-08-20 (mục 18).** Bản đó dừng ở `fe1dbf2` (BoardGallery) và liệt "đẩy hết
> hiệu ứng cho DanhSachBang" làm ứng viên chặng kế tiếp. Nay **đã xong, đã gộp, VÀ đã kiểm tay trên
> trình duyệt thật** — xem "TRẠNG THÁI HÔM NAY" ngay dưới và **mục 19**. Giữa hai lượt cũng có thêm
> ba đợt vá `DungThuocScreen` theo `/impeccable critique` (2026-08-21) — không thuộc track này,
> tóm tắt ở cuối mục 19.

> **ĐÍNH CHÍNH bản 2026-08-18 (mục 17 trở lên).** Các bản viết trước ghi "chặng kế tiếp: BoardGallery"
> như việc CHƯA LÀM. Nay **đã xong và đã gộp** — xem mục 18.

> **ĐÍNH CHÍNH bản 2026-08-16 (viết đêm 16, trước khi gộp xong).** Bản đó ghi P1-E "8/8 task xong,
> CHƯA GỘP". Sáng 17/08 phát sinh tình huống hai lượt gộp tách rời — xem "CẢNH BÁO VẬN HÀNH — gộp
> PR trên GitHub bị THIẾU NỘI DUNG" ngay dưới mục 14. Trạng thái ĐÚNG bây giờ: **đã gộp đủ, bằng
> merge commit cục bộ `4babe67` sau khi PR trên GitHub chỉ mang được một phần.**

> **ĐÍNH CHÍNH bản 2026-08-13.** Bản đó viết *"P1-A đã gộp vào `main`, fast-forward
> `afac297 → a10401b`"*. **Điều đó chưa từng xảy ra ở bản sao này.** Chuỗi cha-thứ-nhất của `main`
> cho thấy `main` vẫn nằm ở `afac297` cho tới merge commit **`e0baa76`** (13/08 15:37), tức *sau*
> khi bản HANDOFF đó được viết (15:21). Cú gộp thật là một **merge commit**, không phải
> fast-forward. Đừng tin bảng cũ; tin `git log --first-parent main`.

## TRẠNG THÁI HÔM NAY — TDD tự động hoá kiểm tay (6/7 khoá mục 22), Latex điều tra xong, không còn chặng dở

| | |
|---|---|
| `main` | **`a86dd03`** — 3 commit trực tiếp (không worktree), xem mục 23 |
| `worktree-database-note-day-du` | `4ddae63` — worktree còn trên đĩa tại `.claude/worktrees/database-note-day-du`, giữ lại làm bản sao lưu, không xoá |
| `p1e-noi-dung-dich` | `b97f056` — giữ lại làm bản sao lưu, không xoá |
| `p1d-siet-so-khop` | `b36a398` — giữ lại làm bản sao lưu, không xoá |
| `p1c-chuoi-khong-toi-dist` | `1c1a93d` — giữ lại làm bản sao lưu, không xoá |
| `p1b-vi-json-vi-tri` | `39315f3` — giữ lại làm bản sao lưu, không xoá |
| Cây làm việc | sạch, trừ `src/data/antibiotics.ts` (chủ dự án tự sửa, đừng đụng — xem mục 10-11), `.impeccable/live/` (runtime của tool critique, chưa gitignore, vô hại — xem mục 19), `bang-bam-vendor.json`/`tsconfig.vendor-paths.json` (xem mục 6), và ba file browser-use không thuộc track nào (`.env.browser-use`, `BROWSER_USE_SETUP.md`, `browser_use_test.py`) |
| Bảy cổng | xanh, đo lại trực tiếp trên `main`, 2026-08-23 — `tsc` exit 0 · `npm test` **287/287** (35 file) · `kiem:vendor` 2.782 file lệch 0 · `kiem:vendor-paths` 438 mục · `build` + `kiem:dist` xanh với `bản dịch vi.json — 174/174 có mặt` (173 `vi.json` + 1 `vi-tien-to.json`) |

**Chặng "TDD tự động hoá kiểm tay + điều tra Latex" — ĐÃ XONG** (`a86dd03`). Thử bật thêm
`LatexViewExtension` lần hai, vá được lỗi DOMPurify nhưng KaTeX gây chập chờn timeout ở bộ test đầy
đủ — gỡ lại, ghi điều tra đầy đủ. Viết 1 file test mới thay kiểm tay bằng browser thật cho 6/7 khoá
mục 22 (Align×3/Download qua BlockSelection+toolbar, Attachment/Edgeless qua caption SlashMenu).
Chi tiết ở **mục 23**.

**Chặng "Bật 4 ViewExtension còn thiếu + dịch nốt 7 chuỗi" — ĐÃ XONG** (`49e7766`). Bật
Image/Attachment/Code/SurfaceRef. 166→173 khoá `vi.json`. Bundle +48,7 kB gzip, dưới ngưỡng D11.
Chi tiết ở **mục 22**.

**Chặng "Dịch bề mặt hiển thị, đợt 2" — ĐÃ XONG, KIỂM TAY MỘT PHẦN** (`1ae21c0`). 150→166 khoá
`vi.json` (+16 khoá dịch thật, không phải +34 như spec dự kiến — 4 chuỗi là nhiễu test-fixture, 10
brand/định dạng file giữ nguyên không cần khoá, 8 chuỗi hoá ra thuộc 5 gói chưa bật `ViewExtension`,
sai lệch với spec §4 đã ghi lại). Chi tiết ở **mục 21**.

**Chặng "Database + Note đầy đủ" — ĐÃ XONG, ĐÃ REVIEW TOÀN NHÁNH, VÀ ĐÃ GỘP** (`a04d29c`). Bật 10
view extension BlockSuite còn thiếu (Database, SlashMenu, DragHandle, 7 inline) — D13: 23→33/58.
11 commit, review toàn nhánh không có Critical, Important/Minor đã đóng. Chi tiết ở **mục 20**.

**Chặng "đẩy hiệu ứng DanhSachBang" — ĐÃ XONG, ĐÃ GỘP, VÀ ĐÃ KIỂM TAY TRÊN TRÌNH DUYỆT THẬT**
(`b77395b`). 6 commit, một vòng review toàn nhánh đã đóng, kiểm tay đầy đủ qua Browser pane (khác
mọi chặng trước — lần này pane compositing được vì phiên có người theo dõi). Chi tiết ở **mục 19**.

**Chặng BoardGallery — dọn hack mount-vĩnh-viễn — ĐÃ XONG VÀ ĐÃ GỘP** (`fe1dbf2`). 13 commit, hai
vòng review toàn nhánh đã đóng. Chi tiết ở **mục 18**.

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
   trong WKWebView — đúng loại áp lực mà `SKIP_REFRESH_DURING_GESTURE` sinh ra để chịu. **Đã cấu
   hình ở mục 8** (2026-08-18) — nhưng giá trị CHƯA đo trên thiết bị thật, nên rủi ro này CHƯA
   được coi là đóng, chỉ mới có một lớp giảm nhẹ chưa kiểm chứng.

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

**Chặng kế tiếp — ĐÃ LÀM, xem mục 18:** BoardGallery (màn danh sách bảng).

---

## 18. CHẶNG BOARDGALLERY — ĐÃ XONG VÀ ĐÃ GỘP — dọn hack mount-vĩnh-viễn + bảng cứng

Track **MindmapScreen**, phần "danh sách" — theo `[[project_mindmap-charter]]`. Nhánh
`worktree-board-gallery` (worktree, không phải nhánh thường), gộp vào `main` tại **`fe1dbf2`**
(2026-08-20, merge thường qua `git merge --no-ff`, không qua PR GitHub — xem "Vận hành" dưới).

| Tài liệu | Đường dẫn |
|---|---|
| Spec | `docs/superpowers/specs/2026-08-19-board-gallery-design.md` |
| Kế hoạch | `docs/superpowers/plans/2026-08-19-board-gallery.md` |

### Chặng này làm gì

Trước chặng này, tab "Mindmap" mở thẳng **một bảng cứng** (`docId: 'board'` khoá cứng trong CSDL
IndexedDB `'drtrong-board'`) và dùng **hack "mount vĩnh viễn"**: một khi mở tab Mindmap lần đầu,
`<EdgelessBoard />` không bao giờ unmount nữa, chuyển tab khác chỉ ẩn bằng `visibility:hidden` +
`pointer-events-none` + `inert` (lý do ban đầu: `Viewport`'s `ResizeObserver` tính sai tâm màn hình
nếu khung về `0×0` giữa lúc `_initialTopLeft` chưa chốt — xem spec §1). Hack đó tồn tại vì trước D4
(mục 17), unmount thật = mất trắng nội dung do bảng chỉ sống trong bộ nhớ.

D4 đã xoá tiền đề đó (nội dung giờ bền vững qua IndexedDB), nên chặng này:

- Thêm **`boardId`** xuyên suốt `EdgelessBoard.tsx` → `src/board/index.tsx`, bỏ `docId` khoá cứng
  `'board'` (`taoHoacMoBang(boardId, tuyChon?)`).
- Thêm store `boards` vào `idb.ts`, nâng `DB_VERSION` 4 → 5. Bản ghi `BangMeta { id, ten, taoLuc,
  capNhatLuc, anhXemTruoc? }` — `id` đồng thời là `docId` Yjs của bảng đó.
- **`DanhSachBang.tsx`** — lưới thẻ, tạo/đổi tên/xoá bảng.
- **`BoardGallery.tsx`** — quản lý mở/đóng MỘT bảng tại một thời điểm, ẩn-theo-tab (giữ đúng cơ chế
  `visibility:hidden`/`inert` cũ cho bảng ĐANG MỞ, vì lý do ResizeObserver ở trên vẫn còn giá trị —
  chỉ bảng KHÔNG mở mới thật sự unmount).
- **`diTruBangCu.ts`** — di trú tự động bảng cứng cũ (`docId: 'board'`) sang một mục `BangMeta`
  thật trong danh sách, chạy một lần, tự phát hiện đã di trú hay chưa.
- Ảnh xem trước (`anhXemTruoc`, JPEG data URL) chụp lúc rời bảng, ghi vào `BangMeta` qua
  `capNhatAnhXemTruoc`.
- Nối vào `App.tsx`: tab Mindmap giờ render `<BoardGallery />` thay vì thẳng `<EdgelessBoard />`;
  **gỡ hẳn** state `daMoBangVe`/hack mount-vĩnh-viễn ở cấp `App.tsx` — trách nhiệm ẩn/hiện dời hết
  vào `BoardGallery`.

### Đã xong

Lịch sử thật có 13 commit (kế hoạch gốc + một lượt sửa đồng bộ `tenNhap` + hai lượt vá review toàn
nhánh):

| Commit | Nội dung |
|---|---|
| `25192de` | Sửa kế hoạch: Task 1+5 dùng `useIdbCollection` có sẵn thay vì viết lại |
| `5953af3` | `idb.ts` — thêm store `boards`, nâng `DB_VERSION` lên 5 |
| `cfa1591` | `boardMeta.ts` — `BangMeta`, `taoIdBang`, `capNhatAnhXemTruoc` |
| `7e4f397` | Vá test: gỡ import `beforeEach` thừa trong `idb.spec.ts` |
| `281735e` | `boardId` xuyên suốt `EdgelessBoard.tsx`, bỏ `docId` khoá cứng `'board'` |
| `9c5fcf9` | Chụp ảnh xem trước lúc rời bảng, ghi vào `boardMeta` |
| `8f82755`, `c1832bb` | Vá ca kiểm ảnh xem trước — spy assertion vô nghĩa + set kích thước canvas |
| `4f94885` | Di trú tự động bảng cũ (`docId: 'board'`) sang metadata danh sách |
| `eaa961b` | Thêm hạn giờ chống treo cho di trú + ca kiểm nhánh thiếu nội dung |
| `7031887` | `DanhSachBang.tsx` — lưới thẻ, tạo/đổi tên/xoá bảng |
| `887ac9d` | Vá: đồng bộ lại `tenNhap` khi mở sửa tên lần nữa |
| `d4acfd5` | `BoardGallery.tsx` — quản lý mở/đóng một bảng, ẩn-theo-tab thay hack cũ |
| `934635b` | Nối `BoardGallery` vào tab Mindmap trong `App.tsx`, **gỡ hack mount-vĩnh-viễn** |
| `47935bb` | Vá review toàn nhánh vòng 1 (xem dưới) |
| `b9d1a30` | Vá review toàn nhánh vòng 2 — 2 lỗi do chính lượt vá vòng 1 sinh ra |

`npm test` tại đầu nhánh (`9ea9928`, cùng gốc rẽ với D4) là **197/197** (21 file); cuối nhánh
**243/243** (29 file trong repo sau merge) — tăng 8 file/46 ca mới của chính nhánh này
(`BoardGallery.spec.ts`, `DanhSachBang.spec.ts`, `boardMeta.spec.ts`, `diTruBangCu.spec.ts`, cộng ca
bổ sung trong `idb.spec.ts`/`edgeless-board.spec.ts`/`edgeless-board-mount.spec.ts`).

### Hai vòng review toàn nhánh — commit `47935bb` và `b9d1a30`

**Vòng 1** (`47935bb`, "áp findings review toàn nhánh") vá ba việc:
- **Giữ ranh giới nạp chậm D13** — một điểm sửa lúc thi hành có nguy cơ import `EdgelessBoard`
  thẳng vào `App.tsx`/`BoardGallery.tsx` thay vì qua vỏ lazy `src/board/index.tsx`, phá vỡ ranh giới
  994 kB đã ghi ở mục 4.
- **Sửa đua tranh di trú** (`diTruBangCu.ts`) — hai lượt gọi di trú gần như đồng thời (StrictMode
  double-invoke, hoặc hai tab trình duyệt) có thể cùng thấy "chưa di trú" và tạo trùng mục.
- **Sửa đua tranh ảnh xem trước** — chụp ảnh lúc rời bảng có thể chạy song song với thao tác mở
  bảng khác, ghi nhầm ảnh vào sai `BangMeta`.
- Thêm cuộn danh sách (`DanhSachBang` tràn quá khung khi nhiều bảng).

**Vòng 2** (`b9d1a30`, "sửa 2 lỗi do lượt fix review toàn nhánh sinh ra") — đúng bài học lặp lại
nhiều lần trong file này (mục 12, mục 13): **lượt vá review tự nó sinh lỗi mới**, phải review lại
chính lượt vá chứ không coi nó là điểm dừng. Hai lỗi cụ thể chưa có báo cáo task chi tiết trong
`.superpowers/sdd/` — xem `git show b9d1a30` nếu cần soi lại đúng thay đổi.

### Vận hành — merge thường, không qua PR GitHub

Chặng này gộp bằng `git merge --no-ff origin/worktree-board-gallery` chạy trực tiếp trên `main` cục
bộ (không mở PR trên GitHub rồi bấm gộp qua UI) — khác thói quen P1-B/C/D. Trước khi merge đã xác
nhận `origin/worktree-board-gallery` (`b9d1a30`) khớp `HEAD` của worktree cục bộ, đúng bài học đã
trả giá ở mục 14 ("gộp PR trên GitHub bị thiếu nội dung" — luôn xác nhận SHA khớp trước khi gộp,
không tin riêng tiêu đề PR/nhánh). Một PR GitHub (`pull/new/worktree-board-gallery`) đã được mở
trước đó trong cùng phiên nhưng **không dùng để gộp** — gộp cục bộ rồi push `main` thẳng, PR đó giờ
thừa (có thể đóng tay trên GitHub, không ảnh hưởng gì nếu bỏ ngỏ).

Bảy cổng đo lại trực tiếp SAU merge (2026-08-20, không chép số cũ): `npx tsc --noEmit` exit 0 ·
`npx vitest run --reporter=verbose` **243/243** (29 file) · `kiem:vendor` — so 2782 file với
`bang-bam-vendor.json`, 0 sai lệch; so thượng nguồn, lệch 0 · `kiem:vendor-paths` — khớp 438 mục ·
`npm run build` xanh (32.38s) · `kiem:dist` — đọc 14 file trong `dist/`, **bản dịch vi.json —
132/132 có mặt** (không đổi so với mục 16 — chặng này không đụng `vi.json`/cây vendored), không còn
`"affine-"`, mọi biến `--drt-*` dùng đều có định nghĩa.

`src/data/antibiotics.ts` — edit dở dang của chủ dự án lúc bắt đầu phiên **không bị merge đụng vào**
(nhánh BoardGallery không chạm file này); vẫn `modified`, chưa commit, đúng như HANDOFF mục 10-11
dặn ("đừng đụng").

### Chưa kiểm tay trên trình duyệt thật

Cùng giới hạn môi trường đã ghi ở mục 16/17 (phiên không người theo dõi, Browser pane không
compositing được cho thao tác bấm thật). Chặng này đổi cấu trúc component khá sâu (tab Mindmap giờ
render `BoardGallery` thay vì thẳng `EdgelessBoard`) nên rủi ro hồi quy về TRẢI NGHIỆM (không phải
đúng/sai logic — 7 cổng đã canh phần đó) cao hơn các chặng trước. **Còn nợ:** kiểm tay khi chủ dự án
ở trước màn hình thật — mở tab Mindmap lần đầu (kỳ vọng thấy bảng cũ đã di trú tự động, không mất
nội dung), tạo bảng mới, đổi tên, xoá, chuyển qua lại giữa hai bảng và giữa tab Mindmap với tab khác
(kỳ vọng không nháy trắng, không mất zoom/pan — đúng lý do hack cũ tồn tại).

### Ngoài phạm vi, còn nợ

- Tên CSDL `'drtrong-board'` vẫn dùng chung một workspace cho mọi bảng, chỉ khác `docId` — đúng thiết
  kế đã chốt ở spec D4 §7, không phải nợ.
- **"Đẩy hết hiệu ứng" cho màn danh sách bảng** (`project_mindmap-charter`, cập nhật 2026-08-12: màn
  danh sách vẫn là "app của chủ dự án", đáng ~70% công sức thiết kế) — `DanhSachBang.tsx` hiện là
  lưới thẻ chức năng (tạo/đổi tên/xoá/cuộn), **chưa qua lượt "đẩy hết hiệu ứng rồi để chủ dự án cắt"**
  mà charter yêu cầu. Đây là ứng viên hàng đầu cho chặng thiết kế riêng tiếp theo.
- Đợt dịch thứ hai cho nhóm gói chưa bật (`affine/data-view`, ~162 chuỗi) — vẫn treo từ mục 16/17,
  không đổi bởi chặng này.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng fe1dbf2 hoặc mới hơn
git status --short                      # kỳ vọng chỉ src/data/antibiotics.ts (chủ dự án tự sửa) +
                                         # hai file sinh ra ở mục 6
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
```

**Chặng kế tiếp (tại thời điểm viết mục 18) — ĐÃ LÀM, xem mục 19:** "đẩy hết hiệu ứng" cho
`DanhSachBang.tsx` theo charter, kèm kiểm tay BoardGallery.

---

## 19. CHẶNG "ĐẨY HIỆU ỨNG DANHSACHBANG" — ĐÃ XONG, ĐÃ GỘP, ĐÃ KIỂM TAY TRÊN TRÌNH DUYỆT THẬT

Track **MindmapScreen**, phần "danh sách" — theo `[[project_mindmap-charter]]`. Nhánh
`worktree-day-hieu-ung-danh-sach-bang` (worktree), gộp vào `main` tại **`b77395b`** (2026-08-21,
`git merge --no-ff`, không qua PR GitHub — cùng thói quen đã dùng ở BoardGallery, mục 18).

| Tài liệu | Đường dẫn |
|---|---|
| Spec | `docs/superpowers/specs/2026-08-21-day-hieu-ung-danh-sach-bang-design.md` |
| Kế hoạch | `docs/superpowers/plans/2026-08-21-day-hieu-ung-danh-sach-bang.md` |

### Chặng này làm gì

`DanhSachBang.tsx` trước đây là lưới thẻ hoàn toàn trần — đây là bề mặt DUY NHẤT của track
MindmapScreen chưa qua lượt "đẩy hết hiệu ứng rồi để chủ dự án cắt" mà charter đòi (charter:
màn danh sách đáng ~70% trọng số công sức thiết kế, xem `[[project_mindmap-charter]]`). Thêm:

- **Nghiêng ổn định theo id** (`nghiengOnDinh()`, hàm băm thuần, `[-3, 3]` độ) — mỗi thẻ có một
  "tư thế nghỉ" cố định, không đổi qua re-render, mô phỏng ảnh thật nằm trên bàn.
- **`.card-settle`/`.card-plop`** — thẻ cũ "rơi vào chỗ" êm lúc lưới vào màn; thẻ vừa tạo
  (`taoLuc` < `VUA_TAO_NGUONG_MS` = 3000ms) nảy quá đà nhẹ rồi ổn định, rõ hơn hẳn thẻ cũ.
- **`.card-slide-out`** — xoá thẻ trượt/mờ ~200ms (`XOA_TRE_MS`) trước khi gỡ khỏi state/IndexedDB
  thật, không biến mất tức thì.
- **Trạng thái rỗng** — minh hoạ SVG (`TheTrong`) thở nhẹ (`.empty-breathe`, lặp vô hạn, có gate
  reduced-motion vì khác các animation chạy-một-lần khác), lời mời, nút tạo lớn.
- **Vá lại `.board-in`/`.board-out`** — hai class này đã tồn tại từ trước (D4) nhưng rơi rụng lúc
  tái cấu trúc sang BoardGallery, không còn được gọi ở đâu. Nối lại đúng ý định gốc: mở bảng →
  `boc-bang` có `.board-in`; đóng bảng → `DanhSachBang` tái xuất hiện có `.board-out`, tự tắt sau
  ~220ms, KHÔNG chạy khi chỉ chuyển tab đi/về mà không đóng bảng nào.
- **LỚP C (tuỳ chọn, revert độc lập được)** — hoạ tiết nền mờ (CSS thuần, opacity 0.04) + nghiêng
  nhẹ theo vị trí con trỏ khi hover chuột thật (`perspective`/`rotateX`/`rotateY` qua
  `--con-tro-x/y`, cập nhật bằng `onPointerMove`, chỉ `pointerType === 'mouse'`).
- Tuân thủ **Floating-Layer-Only Rule** của `DESIGN.md`: KHÔNG `box-shadow` mới nào — cảm giác
  "nhấc thẻ lên" khi hover/press chỉ đến từ `transform`. Quyết định đã chốt với chủ dự án, không
  mở ngoại lệ.

### Đã xong

6 commit thật (kế hoạch tính theo Task, không 1:1 với commit):

| Commit | Nội dung |
|---|---|
| `f2ce5f7` | Spec chốt qua brainstorm (main, trước khi tách worktree) |
| Task 1-6 (trong worktree) | Nghiêng ổn định · card-settle/plop · card-slide-out + sửa ca kiểm xoá cũ · trạng thái rỗng · nối lại board-in/board-out · LỚP C (nền + nghiêng con trỏ) |
| Vá review toàn nhánh | `8346c1f` — tắt nghiêng-theo-con-trỏ dưới `prefers-reduced-motion` (lỗ hổng review toàn nhánh: media query LỚP C thiếu điều kiện `(prefers-reduced-motion: no-preference)`, JS vẫn ghi `--con-tro-x/y` bình thường nhưng CSS đọc chúng phải bị chặn) |
| `b77395b` | Merge vào `main` |

`npm test` **252/252** (29 file — không thêm file mới, chỉ thêm ca vào `BoardGallery.spec.ts`/
`DanhSachBang.spec.ts` đã có sẵn), trước chặng **243/243**.

### Kiểm tay trên trình duyệt thật — LÀM ĐƯỢC LẦN ĐẦU TIÊN cho track này, đủ 9/9 mục Step 6 của kế hoạch

Khác BoardGallery/D4 (mục 16-18, phiên không người theo dõi nên Browser pane báo lỗi
`"the Browser pane is not displayed, so the page is not compositing frames"` cho mọi thao tác cần
compositing) — phiên này CÓ người theo dõi trực tiếp qua chat, và `computer`/`screenshot` vẫn báo
lỗi compositing y hệt (giới hạn môi trường CLI, không phải do có/không người xem). Xác nhận toàn bộ
bằng `javascript_tool` (đọc/gọi DOM thật, đúng ứng dụng thật qua dev server `drtrong-dev`, không
phải giả lập) — không cần compositing:

| # | Mục (Step 6 của kế hoạch) | Cách xác nhận | Kết quả |
|---|---|---|---|
| 1 | Nghiêng ổn định qua reload | Đo `--tilt` một thẻ trước/sau `navigate` (reload cứng) | Y HỆT: `0.8deg` cả hai lần |
| 2 | Hover un-rotate + scale, không box-shadow mới | `getComputedStyle(.the-bang-vat).boxShadow` trên 4 thẻ + đọc mã CSS (`:hover`/`:active` không set `box-shadow`) | `"none"` cả 4 thẻ; hover thật (di chuột) KHÔNG kiểm được — cần compositing thật, xem "Còn nợ" dưới |
| 3 | Thẻ mới nảy rõ hơn thẻ cũ | Tạo bảng → đóng ngay (<200ms, trong cùng script JS để tránh độ trễ round-trip giữa các lượt gọi tool) → đọc class | `card-plop` cho thẻ mới, `card-settle` cho thẻ cũ, cùng lúc trong 1 lưới |
| 4 | Xoá: trượt ~200ms rồi mới mất | Bấm xoá 2 lượt (vũ trang → xác nhận) trong 1 script, poll DOM mỗi 15ms | `card-slide-out` từ t=17ms đến t=206ms, biến mất đúng t=222ms — khớp `XOA_TRE_MS=200` |
| 5 | Trạng thái rỗng có minh hoạ+lời mời+nút lớn | Xoá hết 2 thẻ còn lại, đọc DOM | `.empty-breathe` + "Bắt đầu một sơ đồ tư duy mới" + `[data-testid="tao-bang"]` xuất hiện đúng lúc chuyển 2→0, không chỉ lúc tải trang lần đầu |
| 6 | Mở bảng → `.board-in` | Bấm mở, đọc class `boc-bang` | Có `board-in` ngay khi mở |
| 7 | Đóng bảng → `.board-out` rồi tự tắt | Poll class mỗi 15ms sau khi bấm "←" | `board-out` có mặt t=17ms→236ms, mất hẳn ở t=252ms — khớp thiết kế "220ms + biên an toàn" |
| 8 | `prefers-reduced-motion` tắt 6 animation, giữ `:active` | Đọc mã `src/index.css:718-736` — cả 6 class (`board-in/out`, `card-settle/plop/slide-out`, `empty-breathe`) trong khối `@media (prefers-reduced-motion: reduce)`; `.the-bang-vat`/`:active` KHÔNG nằm trong khối đó | Đúng thiết kế; KHÔNG giả lập được `matchMedia` qua `javascript_tool` (cần DevTools/CDP), xem "Còn nợ" |
| 9 | Chuyển tab đi/về KHÔNG mở/đóng bảng → KHÔNG chạy `.board-out` | Bấm "Trang chủ" → "Mindmap", poll class mỗi 15ms trong 238ms | KHÔNG một lần nào thấy `board-out` |

Xuyên suốt: `read_console_messages` sạch (không lỗi), `read_network_requests` toàn bộ 200 OK (module
`.vendor-build/` nạp bình thường).

**Còn nợ — hai mục thật sự cần OS-level pointer/DevTools, không script nào giả lập được:**
1. Cảm giác thị giác của hover un-rotate/nghiêng-theo-con-trỏ khi di chuột thật (đã xác nhận không
   có `box-shadow` bằng computed style — phần "không phạm luật" chắc chắn; phần "trông có đẹp
   không" thì chưa).
2. Giả lập `prefers-reduced-motion: reduce` qua DevTools thật để xem bằng mắt (đã xác nhận đúng
   bằng đọc mã + biết chắc `8346c1f` vá đúng lỗ hổng LỚP C).

Cả hai không chặn gộp — cùng mức rủi ro chủ dự án đã chấp nhận ở D4/BoardGallery (mục 17-18).

### Bảy cổng — đo lại trực tiếp 2026-08-21, sau khi kiểm tay xong

`npx tsc --noEmit` exit 0 · `npx vitest run --reporter=verbose` **252/252** (29 file, 309.67s) ·
`kiem:vendor` — so 2782 file với `bang-bam-vendor.json`, 0 sai lệch; so thượng nguồn, lệch 0 ·
`kiem:vendor-paths` — khớp 438 mục · `npm run build` xanh (19.5s) · `kiem:dist` — đọc 14 file trong
`dist/`, biến `--drt-*` dùng 73/định nghĩa 639, biến CSS dùng 317/định nghĩa 926, **bản dịch
vi.json — 132/132 có mặt**, không còn `"affine-"`. Chặng này không đụng `src/vendor/`/`vi.json` nên
bốn cổng vendor/dist giữ nguyên số so với mục 18 — đúng dự đoán, CHẠY THẬT để xác nhận.

### Ngoài phạm vi, còn nợ

- Kéo-thả sắp xếp lại thứ tự thẻ — đã chốt hoãn ở brainstorm, giữ `capNhatLuc` giảm dần.
- Âm thanh/haptic — charter cấm rõ.
- Bất kỳ thay đổi nào bên trong `EdgelessBoard`/ruột bảng — chuẩn mực ở đó là bám AFFiNE nguyên
  văn, ngoài phạm vi "đẩy hiệu ứng".
- `.impeccable/live/` (thư mục runtime của tool `/impeccable`, sinh ra trong phiên vá DungThuocScreen
  dưới đây) hiện KHÔNG nằm trong `.gitignore` nên còn hiện trong `git status --short`. Vô hại (không
  ai commit nhầm vì nó không phải mã nguồn), nhưng đáng thêm vào `.gitignore` ở lượt dọn nhỏ sau này.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng b77395b hoặc mới hơn
git status --short                      # kỳ vọng chỉ src/data/antibiotics.ts (chủ dự án tự sửa) +
                                         # .impeccable/live/ + hai file sinh ra ở mục 6
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
```

**Chặng kế tiếp:** đợt dịch thứ hai cho `affine/data-view` (~162 chuỗi, cần bật gói trước — qua
`brainstorming` → `writing-plans`); hoặc tiếp tục "đẩy hiệu ứng" sang bề mặt khác của track
MindmapScreen nếu chủ dự án còn ý tưởng sau khi tự xem trên thiết bị thật; hoặc Lưu trữ/BoardGallery
đã xong cả D4 lẫn danh sách — không còn nợ track này ngoài hai mục "Còn nợ" ở trên (cần thiết bị
thật + DevTools, không phải nợ kỹ thuật).

### Ghi chú ngoài track — ba đợt vá `DungThuocScreen` xen giữa (2026-08-21)

Không thuộc track MindmapScreen. Ba commit `4925da3`/`904b7d2`/`e65cb0d`, mỗi cái vá theo một lượt
`/impeccable critique DungThuocScreen` riêng (đọc message commit để biết chi tiết — đúng quy ước
"đừng chép lại số liệu, đọc file gốc" của mục 15). Tóm rất tắt: `resolveDosingWeight` từng âm thầm
dùng cân nặng thực khi thiếu chiều cao mà không báo (đã vá + cảnh báo ở cả bốn nơi gọi, kể cả
`MixRunTime` bị bỏ sót ở lượt vá đầu); `crclNullReason` gộp một nguồn chân lý cho lý do CrCl null;
giới hạn `max-w-[70ch]` (token `PROSE`) cho các đoạn cảnh báo/hướng dẫn liều từng rộng tới 1206px;
`aria-live="polite"` cho các banner cảnh báo động. Cũng có hai commit cùng chủ đề từ 2026-08-19
(`3d6aec8`, `4a37a78`, trước `fe1dbf2`) chưa từng được mục 15/16 nhắc tới — nếu cần chi tiết đầy đủ,
`git log --oneline` rồi đọc message từng commit, đừng tin bảng chép tay có thể lệch (đúng bài học
đã lặp lại nhiều lần trong file này).

---

## 20. CHẶNG "DATABASE + NOTE ĐẦY ĐỦ" — ĐÃ XONG VÀ ĐÃ GỘP — bật 10 extension BlockSuite còn thiếu

Track P1 vendor (KHÔNG thuộc MindmapScreen — không đụng `DanhSachBang.tsx`/`BoardGallery.tsx`).
Worktree `.claude/worktrees/database-note-day-du` (nhánh `worktree-database-note-day-du`), gộp vào
`main` tại **`a04d29c`** (2026-08-22, `git merge --no-ff` trực tiếp, không qua PR GitHub — cùng thói
quen BoardGallery/"đẩy hiệu ứng DanhSachBang", mục 18).

| Tài liệu | Đường dẫn |
|---|---|
| Spec | `docs/superpowers/specs/2026-08-21-database-note-day-du-design.md` |
| Kế hoạch | `docs/superpowers/plans/2026-08-21-database-note-day-du.md` |
| Sổ tiến độ chi tiết (worktree, KHÔNG theo repo) | `.superpowers/sdd/2026-08-21-database-note-day-du/progress.md` |

### Chặng này làm gì

`src/board/extensions.ts` trước đây giữ 23/58 view extension thượng nguồn — Note trên bảng vẽ chỉ có
đoạn văn + danh sách, không Database, không định dạng inline, không cách nào chèn khối mới (không
SlashMenu, không DragHandle). Chặng này bật thêm 10 extension: `DatabaseViewExtension`,
`SlashMenuViewExtension`, `DragHandleViewExtension`, và trọn bộ 7 extension Inline (comment,
footnote, link, reference, latex, mention, preset) — D13: 23→33/58. SlashMenu (gõ "/") là đường DUY
NHẤT để chèn khối Database vào Note, đúng cách AFFiNE thật làm — không cần xây UI riêng.

### Đã xong

11 commit thật (3 Task gốc theo kế hoạch + 8 commit tự động hoá kiểm tay/review, ngoài kế hoạch gốc
nhưng đúng chỉ dẫn "Sau ba task" của chính kế hoạch đó):

| Commit | Nội dung |
|---|---|
| `0987e56`, `a5c7d62` | Task 1 — bật 10 extension đúng thứ tự thượng nguồn (đã đối chiếu tay với `view.ts`, review toàn nhánh đối chiếu lại lần nữa, khớp 100%) |
| `8594b9a` | Task 2 — vá biến CSS thượng nguồn thiếu định nghĩa (`--drt-font-size-base`) lộ ra khi bật Database/inline. Bundle `EdgelessBoard-*.js` đo được **862,53 kB gzip, +164,28 kB** so với baseline chặng Template — VƯỢT ngưỡng D11 "+150 kB gzip đáng dừng lại" — **đã hỏi và được chủ dự án duyệt tiếp tục**, không thu hẹp phạm vi |
| `f4c634b` | **Bug thật có sẵn từ trước, tìm thấy khi kiểm tay Task 3**: `createAutoIncrementIdGenerator()` trong `EdgelessBoard.tsx` đếm lại từ 0 mỗi lần mount, đụng độ id khi mở lại một bảng đã có nội dung — Yjs âm thầm từ chối khối mới thêm (chỉ `console.error`, không lỗi UI), đúng triệu chứng "thêm Note không hiện ra". Root-cause bằng `superpowers:systematic-debugging` đầy đủ 4 Phase. Sửa: bỏ `idGenerator`, rơi về `nanoid` mặc định. Ca kiểm đỏ→xanh ghim lại trong `edgeless-board.spec.ts` |
| `df2cfef`, `6dc8ac7`, `9842521`, `e232a1b`, `aa6edd3` | Tự động hoá bằng TDD toàn bộ 5 mục kiểm tay bắt buộc của spec §7 (Step 2-6: SlashMenu mở đúng, chèn Database + thao tác dữ liệu, định dạng inline + mention, kéo-thả đổi thứ tự khối, dark mode với nội dung thật) — trước đây các mục này chỉ kiểm được bằng tay và bị chặn một phần bởi giới hạn môi trường Browser pane không compositing. Hạ tầng dùng chung: `src/board/__tests__/helpers/note-interaction.ts` |
| `4f314a3`, `4ddae63` | Điều tra + đóng một phát hiện chập chờn ở ca kiểm dark-mode (xem "Bài học" dưới) và áp findings từ review toàn nhánh |

`npm test` tại đầu nhánh (`cb87dd4`) là **277/277** (29 file); cuối nhánh trên `main` sau gộp
**285/285** (34 file) — tăng 5 file/8 ca ròng của chính nhánh này.

### Review toàn nhánh — KHÔNG CÓ CRITICAL

Reviewer (sonnet) tự chạy độc lập cả bảy cổng (không tin báo cáo cũ), đối chiếu `extensions.ts` với
`view.ts` thượng nguồn từng dòng, tự tái hiện lỗi vendor `v-element.ts` bằng cách chạy thật. Một
Important: kết luận "chập chờn do tải máy" ở ca kiểm dark-mode thiếu cơ chế nhân quả (chuỗi cập nhật
theme hoàn toàn đồng bộ, không có đường cho "tải máy" tác động) — đã sửa lại đúng mức bằng chứng
("nguyên nhân cơ chế chưa xác định, không tái hiện sau 10 lượt chạy"), thêm canary DOM. Hai Minor:
lỗi phép cộng trong comment `extensions.ts` (nợ ghi từ Task 1, cố ý hoãn tới đúng lượt review); bỏ
`createAutoIncrementIdGenerator()` không dùng ở `diTruBangCu.ts` (cùng anti-pattern vừa fix, hiện bất
hoạt nhưng là bẫy). Cả ba đã đóng ở `4ddae63`. Đánh giá cuối: **Sẵn sàng gộp — Có.**

### Bảy cổng — đo lại trực tiếp trên `main` SAU gộp, 2026-08-22

`npx tsc --noEmit` exit 0 · `npx vitest run --reporter=verbose` **285/285** (34 file, 310,84s) ·
`kiem:vendor` — so 2782 file với `bang-bam-vendor.json`, 0 sai lệch; so thượng nguồn, lệch 0 ·
`kiem:vendor-paths` — khớp 438 mục · `npm run build` xanh (18,04s) · `kiem:dist` — đọc 315 file trong
`dist/`, biến `--drt-*` dùng 76/định nghĩa 641, biến CSS dùng 320/định nghĩa 929, **bản dịch vi.json
— 151/151 có mặt**, không còn `"affine-"`.

### Bài học mới — "tải máy" không phải lời giải thích miễn phí

Một ca kiểm (`edgeless-board-dark-mode.spec.ts`) chập chờn ĐÚNG MỘT LẦN khi điều tra ban đầu; điều
tra viên (chính phiên này) kết luận vội "do tải máy" mà KHÔNG kiểm tra đường dữ liệu có cơ chế nào
cho tải máy tác động hay không. Review toàn nhánh bắt được: đường dữ liệu đó hoàn toàn ĐỒNG BỘ
(không rAF/setTimeout/I-O), nên "tải máy" — dù là lời giải thích ĐÚNG cho ba lớp giới hạn môi trường
KHÁC của chính chặng này (rAF/tab-ẩn, Range text-extraction, layout/`getBoundingClientRect`) — không
có đường tác động lên MỘT chuỗi gọi hàm đồng bộ. Bài học: khi một hiện tượng chập chờn không tái
hiện được, kết luận đúng mức bằng chứng thật là "nguyên nhân chưa xác định", không phải gán bừa cho
nguyên nhân quen thuộc gần đó nhất — kể cả khi nguyên nhân đó có tiền lệ thật trong dự án.

### Ngoài phạm vi, còn nợ

- **Console noise từ bug vendor thật, KHÔNG vá (D11 cấm sửa `src/vendor/`)**: mọi lượt chọn một mục
  trong SlashMenu kích hoạt một unhandled promise rejection vô hại trong
  `framework/std/src/inline/components/v-element.ts:41-48` (`getUpdateComplete()` không guard null
  khi phần tử bị huỷ giữa chừng do `cleanSpecifiedTail()` xoá "/" đồng bộ, đua với một
  `waitForUpdate()` khác đang treo trên v-element cũ). KHÔNG mất dữ liệu, KHÔNG riêng Database — mọi
  lượt chọn SlashMenu đều gặp. Cơ chế không đặc thù môi trường test, nhiều khả năng cũng hiện trong
  devtools của người dùng cuối trên trình duyệt thật — nếu ai đó thấy dòng lỗi này sau này, đây LÀ
  nguyên nhân đã biết, không phải lỗi mới.
- **Nội dung dịch cho ~10 extension mới bật** (SlashMenu, Database, 7 inline) — ngoài phạm vi chặng
  này (spec §8), chặng riêng sau khi đo lại số chuỗi thật tới `dist/`.
- **Kiểm tay thật trên thiết bị** — 5 mục kiểm tay bắt buộc của spec §7 đã tự động hoá bằng TDD qua
  API sản xuất thật (không phải test giả), nhưng KHÔNG thay thế hoàn toàn trải nghiệm chạm/kéo thật
  trên iPad — Step 3 (thêm cột/hàng qua UI thật, không qua `dataSource` trực tiếp), Step 4 (thanh
  định dạng nổi lên khi bôi đen bằng ngón tay thật), Step 5 (tay cầm kéo-thả hiện khi chạm) đều cần
  `getBoundingClientRect()`/hit-testing thật mà happy-dom không có — cùng lớp nợ iPad đã ghi ở mục 7.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng a04d29c hoặc mới hơn
git status --short                      # kỳ vọng chỉ src/data/antibiotics.ts (chủ dự án tự sửa) +
                                         # ba file browser-use không thuộc track nào + hai file sinh
                                         # ra ở mục 6
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
```

**Chặng kế tiếp:** nội dung dịch cho các extension mới bật (chặng riêng, qua `brainstorming` →
`writing-plans`); hoặc kiểm tay thật trên iPad/thiết bị thật cho cả track MindmapScreen (D4,
BoardGallery, "đẩy hiệu ứng DanhSachBang", và Steps 3-5 của chặng này) — tất cả đang chờ cùng một
buổi kiểm tay thật, không phải bốn khoản nợ riêng biệt.

## 21. DỊCH BỀ MẶT HIỂN THỊ, ĐỢT 2 — ĐÃ XONG, KIỂM TAY MỘT PHẦN

Track P1 vendor/dịch (không thuộc MindmapScreen). Làm trực tiếp trên `main`, không qua worktree —
cùng thói quen các chặng dịch nhỏ trước (P1-C/D/E, mục 16).

| Tài liệu | Đường dẫn |
|---|---|
| Spec | `docs/superpowers/specs/2026-08-22-dich-be-mat-hien-thi-dot-2-design.md` |
| Kế hoạch | `docs/superpowers/plans/2026-08-22-dich-be-mat-hien-thi-dot-2.md` |

### Chặng này làm gì

Đo lại tập chuỗi vendor chưa dịch (đúng yêu cầu "test lại có sót" — mục 10/12 cảnh báo số đo cũ đã
lỗi thời từ khi mục 20 bật 10 extension mới), loại 12 gói thuộc 10 extension đó (Database, SlashMenu,
DragHandle, 7 inline, cộng `affine/data-view` — engine đứng sau Database) khỏi phạm vi. Spec đo được
162 ứng viên → 60 thuộc riêng 12 gói loại trừ → 102 còn phạm vi chặng này → 38 chuỗi spec kết luận
"tới được `dist/` NGAY BÂY GIỜ" (phần còn lại — 64 — hoãn vì gói khác chưa bật, không đụng).

### Đã xong — 2 commit trực tiếp trên `main`

| Commit | Nội dung |
|---|---|
| `5bfd500` | Task 1+2: điều tra 4 chuỗi nghi nhiễu + thêm 34 khoá dịch (kết quả BAN ĐẦU — một phần bị Task 3 gỡ lại, xem dưới) |
| `1ae21c0` | Task 3: chạy bảy cổng, phát hiện và sửa hai lớp sai lệch trong commit trước — gỡ 18/34 khoá |

**Task 1 — 4 chuỗi nghi nhiễu `"1"`/`"2"`/`"3"`/`"aaa"` (gói `affine/all` = `@blocksuite/affine`):**
đọc đúng dòng nguồn xác nhận cả 4 CHỈ xuất hiện trong file test
(`src/__tests__/adapters/{markdown,html}.unit.spec.ts`) — `"1"`/`"2"`/`"3"` là `label` của đối
tượng `footnote` giả lập (số thứ tự chú thích 1/2/3) trong bài kiểm round-trip markdown/html
(`markdown.unit.spec.ts:3331,3346,3358`, lặp lại ở `5331,5346,5358,5488`); `"aaa"` là `caption` ảnh
giả lập (`markdown.unit.spec.ts:2355`, `html.unit.spec.ts:1043`). Cả 4 khớp vị trí cho phép của
`luat-vi-tri-dich.mjs` (`label`/`caption`) chỉ vì TRÙNG TÊN thuộc tính, không phải vì đó là chữ hiển
thị thật — file `*.unit.spec.ts` chỉ chạy dưới `vitest`, không được `src/board/extensions.ts` import,
không thể tới `dist/`. **Quyết định: BỎ QUA cả 4, không thêm khoá**, đúng tinh thần "không danh sách
miễn ngầm" của mục 11 — quyết định có lý do ghi lại, không phải bỏ sót.

**Task 2 — soạn 34 bản dịch, phát hiện thêm 2 lớp sai lệch khi chạy Task 3 (không phải lỗi lúc soạn,
mà tại chỗ đối chiếu với cơ chế D12/bản build thật):**

1. **10 khoá brand/định dạng file** (Figma, loom, YouTube Video, OneNote, Docx, Html, HTML,
   Markdown, Zip, PlainText) — spec §6 nói "giữ nguyên không dịch nghĩa", lúc soạn hiểu nhầm thành
   "thêm khoá value = key". Cổng 1 của `dich-chuoi-vendor.mjs` cấm THẲNG bản dịch trùng y hệt bản
   gốc ("Đó là dòng thừa, hoặc dấu hiệu chép nhầm cột") — cách đọc spec ĐÚNG là KHÔNG thêm khoá cho
   10 brand này, để chúng tự nhiên hiện tiếng Anh (không khoá = không thay). Gỡ cả 10.
2. **8 chuỗi thuộc 5 gói chưa bật `ViewExtension`** — build lại xong, `kiem:dist` báo đỏ 8 khoá
   không tới `dist/`: `Align center/left/right`, `Attachment`, `Download`, `Edgeless`, `Equation`,
   `More`. Theo đúng hướng dẫn kế hoạch ("chẩn đoán nói gói chưa bật → quay lại spec §3, tái kiểm
   chuỗi đó thật sự không thuộc 12 gói loại trừ"), đối chiếu `src/board/extensions.ts`:
   **`affine-block-image`, `affine-block-attachment`, `affine-block-latex`, `affine-block-code`,
   `affine-block-surface-ref` không có `ViewExtension` nào được import** — không thuộc 12 gói loại
   trừ của spec §3, nhưng cũng không thực sự "tới dist NGAY BÂY GIỜ" như spec §4 khẳng định.
   **SAI LỆCH VỚI SPEC — ghi lại, không tự sửa spec:** spec §4 đo bằng build-based check
   (`coNhuLiteral` trên một bản `npm run build` chạy trong phiên viết spec) và kết luận cả 38 chuỗi
   "tới dist NGAY BÂY GIỜ"; đo lại trực tiếp ở chặng này (build thật trên `main`) cho kết quả KHÁC
   đúng 8 chuỗi này. Không rõ nguyên nhân cụ thể của sai lệch (dist đo lúc đó đã cũ, hay bug ở phép
   so khớp `coNhuLiteral`/`tim-ban-dich-vendor.mjs`) — không đoán, để phiên sau/chủ dự án truy thêm
   nếu cần. Bật 5 `ViewExtension` đó là quyết định phạm vi lớn (ảnh hưởng kích thước bundle — có
   tiền lệ đo ở mục 20: +164 kB gzip khi bật 10 extension), KHÔNG làm ở chặng dịch nhỏ này — gỡ 8
   khoá, gộp vào diện "hoãn tới khi gói bật".

**Kết quả:** `vi.json` 150 → **166 khoá** (+16 khoá dịch thật, không phải +34 như spec dự kiến ban
đầu). 16 khoá mới: `Card view`, `Copied image to clipboard`, `Create Linked Doc`, `Download in
progress...`, `Downloading image...`, `Drag/Click to insert Text block`, `Embed view`, `Enter Full
Screen`, `Exit Full Screen`, `Failed to download image!`, `Failed to read image size, please try
another image`, `Headings in the 4th/5th/6th font size.` (×3 — biến thể SỐ NHIỀU mới ở
`affine/rich-text/conversion.ts`, khác khoá số ít `Heading in the...` đã có sẵn từ trước ở
`affine/gfx/note`), `Inline view`, `Thickness`. `timTrungBanDich` xác nhận không trùng giá trị dịch.

### Bảy cổng — đo lại trực tiếp trên `main`, 2026-08-22 (sau khi sửa ở `1ae21c0`)

`npm run dung:vendor` — 166 khoá đều còn sống (0 khoá chết) · `npx tsc --noEmit` exit 0 ·
`npm test` — **285/285** (34 file, 326.27s) · `kiem:vendor` — so 2782 file với
`bang-bam-vendor.json` và thượng nguồn, lệch 0 · `kiem:vendor-paths` — khớp 438 mục paths ·
`npm run build` xanh (10.90s) · `kiem:dist` — đọc 315 file trong `dist/`, biến `--drt-*` dùng
76/định nghĩa 641, biến CSS dùng 320/định nghĩa 929, **bản dịch vi.json — 167/167 có mặt** (166
`vi.json` + 1 `vi-tien-to.json`), không còn `"affine-"`.

### Kiểm tay trên trình duyệt thật

Phiên chạy nền, không người theo dõi trực tiếp — cùng giới hạn môi trường đã ghi ở mục 16/17
(`screenshot`/`left_click` theo toạ độ báo lỗi "the Browser pane is not displayed, so the page is
not compositing frames"). Khác hai lần trước, lần này đi thêm được MỘT bước nhờ API sản xuất thật
của editor (`editor-host.store`, tìm bằng `window.__host`) và click thật (không phải toạ độ mù)
trên nút toolbar — vốn là phần tử DOM thường, không phải canvas:

1. `PORT=8446 npm run dev` khởi động sạch, mở Browser pane, bấm tab "Mindmap", tạo bảng mới — bảng
   vẽ tải và render đúng: toolbar edgeless cố định hiện ĐẦY ĐỦ tiếng Việt sẵn có (`Vừa khung hình`,
   `Thu nhỏ`, `Phóng to`, `Bật/tắt thanh thu phóng`, `Khung`, `Ghi chú`, `Tẩy`, `Hình`, `Khác`,
   `Công cụ khác`) — xác nhận cơ chế D12 phục vụ đúng tiếng Việt cho app THẬT đang chạy, không chỉ
   cho `dist/` tĩnh.
2. Bấm nút "Pen" (phần tử `edgeless-toolbar-button` thật, tìm bằng nội dung chữ rồi gọi `.click()`
   qua `javascript_tool`) → mở submenu Pen/Highlighter, panel độ dày hiện tooltip **"Độ dày"** —
   **XÁC NHẬN TRỰC TIẾP một trong 16 khoá mới của chặng này (`Thickness` → `Độ dày`) hiển thị đúng
   trên app thật, không chỉ trong `dist/`.**
3. Thử tạo Note+paragraph bằng `store.addBlock('affine:note', ...)`/`addBlock('affine:paragraph',
   ...)` gọi thẳng qua API để kiểm các khoá còn lại (Card/Embed/Inline view, Create Linked Doc,
   Enter/Exit Full Screen, Headings 4-6, các toast Download/Copied/Failed) — phần tử note tạo ra
   ĐÚNG vào DOM (`drt-edgeless-note`, `data-block-id` khớp, `connected: true`) nhưng RỖNG (0 con,
   0×0), không render nội dung: gọi API thẳng (bỏ qua chuỗi cử chỉ con trỏ mà app thật dùng để tạo
   note) không đủ để engine gfx dựng view đầy đủ. **KHÔNG xác nhận được** 15/16 khoá còn lại bằng
   thao tác trên trình duyệt thật trong phiên này.

**Bù lại bằng bằng chứng gián tiếp mạnh:** (a) `kiem:dist` 167/167 — bản dịch có mặt ĐÚNG trong
`dist/` thật đã build (không phải suy luận); (b) đã lần từng khoá trong 16 khoá về đúng dòng nguồn
+ xác nhận gói chứa nó có `ViewExtension` đăng ký trong `src/board/extensions.ts` (Task 1/2/3 ở
trên) — `ReferenceViewExtension` cho Card/Embed/Inline view, `GfxNoteViewExtension` cho tooltip
kéo-chèn + mô tả Headings 4-6, `RootViewExtension`/`ToolbarViewExtension` cho Create Linked
Doc/Enter-Exit Full Screen, các toast Download/Copied/Failed gọi từ `image|attachment/src/utils.ts`
(đường gọi các hàm toast này độc lập với `ViewExtension` của khối nên không bị 5 gói vừa loại ở
Task 3 chặn — `kiem:dist` xác nhận chúng KHÔNG nằm trong 8 khoá bị gỡ). **Còn nợ:** kiểm tay ~3 phút
khi có người thật theo dõi Browser pane — chèn ảnh/attachment, chọn văn bản để thấy Card/Embed/Inline
view, gõ `#### ` để kiểm hint Headings 4-6, xác nhận cả 15 khoá còn lại hiện đúng tiếng Việt (dự
đoán: đúng, dựa trên (a)+(b), nhưng "dự đoán đúng" không thay được "thấy đúng").

### Ngoài phạm vi, còn nợ

- **64 chuỗi chưa tới `dist/` theo spec §4** (gói khác chưa bật) **+ 8 chuỗi vừa gỡ ở Task 3**
  (`Align center/left/right`, `Attachment`, `Download`, `Edgeless`, `Equation`, `More` — 5 gói
  `affine-block-{image,attachment,latex,code,surface-ref}` chưa có `ViewExtension`) = **72 chuỗi
  thực tế đang hoãn**, không phải 64 như spec §4 tổng kết — sai lệch đã ghi ở Task 2 phía trên.
  Không chép lại danh sách 64 chuỗi cũ ở đây — tham chiếu spec
  `docs/superpowers/specs/2026-08-22-dich-be-mat-hien-thi-dot-2-design.md` §4 khi cần, cộng thêm 8
  chuỗi mới ghi ở trên.
- **10 khoá brand/định dạng file** (Figma, loom, YouTube Video, OneNote, Docx, Html, HTML,
  Markdown, Zip, PlainText) — quyết định "giữ nguyên tiếng Anh" đúng theo spec §6, KHÔNG cần khoá
  `vi.json` (Cổng 1 cấm value=key) — không phải nợ, chỉ ghi lại để phiên sau không tưởng nhầm đây
  là 10 khoá "quên dịch".
- **Bật 5 `ViewExtension` còn thiếu** (`affine-block-image`, `affine-block-attachment`,
  `affine-block-latex`, `affine-block-code`, `affine-block-surface-ref`) — quyết định phạm vi lớn
  (ảnh hưởng bundle size, tiền lệ ở mục 20), KHÔNG làm ở chặng dịch nhỏ này. Đây LÀ lý do 8 chuỗi ở
  trên không tới được `dist/`, không phải lỗi dịch.
- **Nội dung dịch cho 10 extension mới mục 20** — vẫn ngoài phạm vi, chưa đụng (không đổi so với
  mục 20).
- Kiểm tay đầy đủ 15/16 khoá còn lại trên trình duyệt thật (xem mục trên).

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng SHA của chính commit HANDOFF này (sau 1ae21c0) hoặc mới hơn
git status --short                      # kỳ vọng sạch trừ antibiotics.ts + ba file browser-use
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
```

**Chặng kế tiếp:** kiểm tay ~3 phút khi có người thật theo dõi Browser pane (xem "còn nợ" ở trên);
hoặc quyết định có bật 5 `ViewExtension` còn thiếu hay không (ảnh hưởng 8+ chuỗi hoãn, có thể gộp
64→72 chuỗi hoãn thành phạm vi dịch mới nếu bật); hoặc nội dung dịch cho 10 extension mới mục 20.
**Cập nhật 2026-08-23: đã bật 4/5, xem mục 22.**

---

## 22. BẬT 4 VIEWEXTENSION CÒN THIẾU + DỊCH NỐT 7 CHUỖI — ĐÃ XONG

Tiếp nối mục 21. Chủ dự án chọn "bật thử 5 ViewExtension còn thiếu" thay vì dừng ở diện hoãn. Làm
trực tiếp trên `main`, 1 commit (`49e7766`).

### Đã làm

Bật `AttachmentViewExtension`, `CodeBlockViewExtension`, `ImageViewExtension`,
`SurfaceRefViewExtension` trong `src/board/extensions.ts`, đúng vị trí thượng nguồn
(`affine/all/src/extensions/view.ts`). Đo bundle: `EdgelessBoard-*.js` 862,53 → 911,23 kB gzip
(+48,7 kB, dưới ngưỡng "+150kB gzip đáng dừng lại" của D11 — không cần hỏi tiếp, đúng tiền lệ mục
20).

`kiem:dist` đỏ ngay 1 biến CSS: `--drt-text-secondary` dùng (từ
`affine/blocks/code/src/styles.ts:71`, đọc `var(--affine-text-secondary)`) nhưng theme chỉ định
nghĩa `--drt-text-secondary-color` (CÓ hậu tố "-color") — **cùng lớp lỗi lệch tên thượng nguồn đã
vá 2 lần trước** (`--drt-secondary`/`--drt-font-size-base`, xem `src/index.css`). Vá bằng bí danh
thứ ba trong cùng khối `:root` đã có.

### Latex: THỬ bật rồi PHẢI GỠ — DOMPurify crash ở environment 'node'

Ban đầu bật cả 5 (kèm `LatexViewExtension`). `npm test` (đo bằng file, không qua `| tail`, đúng bài
học mục 6) cho kết quả: 2 suite crash khi IMPORT (`diTruBangCu.spec.ts`, `edgeless-board.spec.ts`),
KHÔNG phải lỗi assertion:

```
TypeError: default.sanitize is not a function
 ❯ sanitizeHTML affine/shared/src/utils/safe-html.ts:17
 ❯ unsafeHTML affine/shared/src/utils/safe-html.ts:21
 ❯ LatexTooltip affine/blocks/latex/src/configs/tooltips.ts:34
 ❯ affine/blocks/latex/src/configs/slash-menu.ts:20
 ❯ affine/blocks/latex/src/view.ts:9
```

Nguyên nhân: `affine/blocks/latex/src/configs/tooltips.ts` gọi `unsafeHTML()` → `sanitizeHTML()` →
`DOMPurify.sanitize()` **ngay ở cấp module** (khi `view.ts` được import, không đợi lúc dùng thật) để
dựng cấu hình tĩnh cho tooltip xem trước công thức. `DOMPurify` cần `window` để khởi tạo đúng hình
dạng (có `.sanitize`); vitest mặc định chạy `environment: 'node'` cho phần lớn file spec (xem
comment ở `vite.config.ts:291`, lý do tốc độ — chỉ file thật sự cần DOM mới khai
`@vitest-environment happy-dom` riêng). Hai file trên import `EdgelessBoard.tsx` → `extensions.ts`
→ (khi có Latex) → `view.ts` của Latex → crash ngay lúc nạp module.

Chỉ MỘT trong 5 gói dùng `unsafeHTML`/`sanitizeHTML` (đã grep toàn bộ
`src/vendor/blocksuite/affine/blocks/{image,attachment,code,surface-ref,latex}/src`) — đúng
`latex`. Không sửa được ở nguồn (D11 cấm sửa `src/vendor/`). Không đổi `environment` của hai file
test đó sang `happy-dom` (rủi ro kéo theo lớp lỗi DOM khác chưa đo — viewport.ts có nhánh
`DOMRect`/`boundingClientRect` document đã cảnh báo ở `vite.config.ts`, đổi cả file thay vì chỉ
phần cần thiết là mở rộng bề mặt rủi ro không cần thiết cho lợi ích rất nhỏ — 1 chuỗi). **Quyết
định: GỠ LatexViewExtension, giữ 4/5.** `"Equation"` (chuỗi duy nhất chỉ Latex hiển thị) vẫn hoãn.

### Dịch 7/8 chuỗi bị gỡ ở mục 21

Lấy lại bản dịch nháp đã soạn sẵn từ commit `5bfd500` (trước khi mục 21 gỡ do phát hiện gói chưa
bật) — không soạn lại từ đầu, các bản dịch đó chưa từng sai, chỉ là chưa có nơi hiển thị lúc đó:

| Chuỗi | Bản dịch |
|---|---|
| Align center | Căn giữa |
| Align left | Căn trái |
| Align right | Căn phải |
| Attachment | Tệp đính kèm |
| Download | Tải xuống |
| Edgeless | Tự do (khớp `Edgeless Text` → `Chữ tự do` đã ship) |
| More | Thêm |

`vi.json` 166 → **173 khoá**. Không trùng giá trị với khoá nào có sẵn (tự kiểm bằng `Set` giá trị
trước khi ghi).

**Bài học thao tác nhỏ:** lượt đầu ghi khoá mới bằng script Node gọi `JSON.stringify(obj, null, 2)`
trên object đã dựng lại — vô tình SẮP LẠI TOÀN BỘ 166 khoá theo alphabet (file gốc không sắp theo
thứ tự đó), tạo diff 291 dòng cho một việc lẽ ra chỉ 8 dòng. Bắt được bằng `git diff --stat` TRƯỚC
khi build/test, `git checkout --` file rồi ghi lại đúng cách (đọc file gốc, chỉ set thêm khoá mới,
giữ nguyên thứ tự khoá cũ). Không có gì bị mất vì bắt được trước khi commit.

### Bảy cổng — đo lại trực tiếp trên `main`, 2026-08-23

`npx tsc --noEmit` exit 0 · `npm run dung:vendor` — 173 khoá đều còn sống · `npx vitest run
--reporter=verbose` (ghi ra file, không qua `| tail`) — **285/285** (34 file) sau khi xác nhận 1 ca
đỏ ở lượt đầu (`BoardGallery.spec.ts` — "bấm quay lại → DanhSachBang tái xuất hiện có class
board-out") là **chập chờn theo thời gian, không liên quan thay đổi này**: chạy lại riêng file đó
LUÔN xanh (2 lượt độc lập) · `kiem:vendor` — so 2.782 file, lệch 0 · `kiem:vendor-paths` — khớp 438
mục · `npm run build` xanh · `kiem:dist` — `bản dịch vi.json — 174/174 có mặt` (173 `vi.json` + 1
`vi-tien-to.json`), không còn `"affine-"`, mọi biến `--drt-*` dùng đều có định nghĩa.

### Kiểm tay trên trình duyệt thật

**KHÔNG kiểm được** — phiên này `document.hidden = true`/`visibilityState = "hidden"` suốt (đã thử
`tabs_select` để đưa tab lên trước, không đổi được trạng thái), đúng giới hạn môi trường mục 16/17:
canvas (`gfx-viewport`) tạm dừng render khi tab không thực sự hiển thị phía người dùng, nên mọi thao
tác cần layout/gesture trên canvas (tạo Note, chèn ảnh/attachment) đều không thực hiện được. Đã xác
nhận lại được ĐÚNG một điều cũ (không phải điều mới): bấm nút "Pen" (phần tử DOM thường, không phải
canvas) qua `.click()` vẫn mở đúng submenu, tooltip "Độ dày" hiện đúng — tái lập y hệt kết quả mục
21. Bằng chứng cho 7 khoá mới của chặng NÀY vẫn chỉ là gián tiếp: `kiem:dist` 174/174 + đối chiếu
gói/`ViewExtension` như mục 21 đã làm.

### Ngoài phạm vi, còn nợ

- **`"Equation"`** — chuỗi duy nhất cần `LatexViewExtension`, đã quyết định KHÔNG bật (xem lý do
  DOMPurify ở trên). Muốn dịch phải hoặc (a) sửa cách hai file test đó chạy để không crash (đổi
  environment, cần đo rủi ro DOM khác trước), hoặc (b) chờ thượng nguồn sửa `tooltips.ts` để
  `unsafeHTML` không chạy ở cấp module.
- **64 chuỗi ở diện hoãn của spec §4 (mục 21)** — vẫn hoãn, không đổi bởi chặng này (chặng này chỉ
  xử 7/8 chuỗi đã bị GỠ vì thiếu ViewExtension, không đụng tới 64 chuỗi thuộc gói khác chưa đo).
- **Kiểm tay đầy đủ 7 khoá mới trên trình duyệt thật** — chưa làm được, xem lý do ở trên.
- Nội dung dịch cho 10 extension mới mục 20 — vẫn ngoài phạm vi.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng 49e7766 hoặc mới hơn
git status --short                      # kỳ vọng sạch trừ antibiotics.ts + ba file browser-use
npm ci && npm run dung:vendor
```

**Chặng kế tiếp:** kiểm tay thật khi có người theo dõi Browser pane (7 khoá mới + 15 khoá mục 21,
gộp thành một buổi ~5 phút); hoặc quyết định về "Equation"/Latex; hoặc nội dung dịch 10 extension
mục 20.
**Cập nhật 2026-08-23: "kiểm tay" đã một phần được TỰ ĐỘNG HOÁ bằng TDD thay vì browser thật, xem
mục 23; Latex đã điều tra kỹ, xem mục 23.**

---

## 23. TDD TỰ ĐỘNG HOÁ KIỂM TAY (6/7 KHOÁ MỤC 22) + ĐIỀU TRA LATEX — ĐÃ XONG

Chủ dự án yêu cầu: "sử dụng TDD tự động hóa bước kiểm tay + dịch nốt cho tôi" — thay bước kiểm tay
trên trình duyệt thật (bị chặn ở mục 21-22 do Browser pane không compositing khi phiên không có
người theo dõi trực tiếp) bằng test tự động, và thử dịch nốt "Equation" (Latex). Làm trực tiếp trên
`main`, 3 commit (`29e55fc`, `a86dd03`, và bản cập nhật HANDOFF này).

### Phần 1 — Điều tra Latex (kết quả: KHÔNG bật, nhưng đã hiểu rõ vì sao)

Chi tiết đầy đủ đã chép trong comment của `src/board/extensions.ts` (phần "LatexViewExtension...
THỬ bật HAI LẦN") — tóm tắt:

1. **Gốc rễ DOMPurify tìm được và VÁ ĐƯỢC** (không đụng vendor): `dompurify` tự phát hiện `window`
   lúc import để quyết định hình dạng export (có `.sanitize` hay không). Thêm `test.alias` trong
   `vite.config.ts` trỏ `dompurify` sang stub `{sanitize: (html) => html}` — RED (`diTruBangCu.spec.ts`/
   `edgeless-board.spec.ts` crash `TypeError: default.sanitize is not a function`) → GREEN (cả hai
   xanh, đã xác nhận bằng chạy riêng lẻ).
2. **Nhưng chạy TRỌN 34 file lộ vấn đề khác**: `katex.renderToString()` (Latex tooltip, cũng chạy
   đồng bộ ở cấp module) cộng dồn thời gian IMPORT cho MỌI file test board — ba ca dùng SlashMenu
   (`edgeless-board-database.spec.ts`, `-dark-mode.spec.ts`, `-reorder.spec.ts`) timeout 5000ms khi
   chạy TRỌN bộ, nhưng XANH khi chạy RIÊNG LẺ (3355ms, dư nhiều). Đúng dạng "chập chờn do tải" (mục
   6), không phải lỗi logic — nhưng là CHI PHÍ THẬT, không đáng đổi lấy đúng 1 chuỗi.
3. **Quyết định**: gỡ Latex (lần thứ hai), gỡ luôn `test.alias`/stub `dompurify` vì không còn gì
   dùng tới (YAGNI). Cách vá đúng đã ghi lại đầy đủ ở comment `extensions.ts` — chặng sau muốn thử
   lại (ví dụ nếu nâng `testTimeout` mặc định, hoặc thượng nguồn sửa `tooltips.ts`) đọc đó, đừng
   điều tra lại từ đầu. "Equation" VẪN hoãn.

### Phần 2 — TDD tự động hoá kiểm tay

File mới: `src/board/__tests__/edgeless-board-toolbar-translations.spec.ts`, 2 ca kiểm.

**Kỹ thuật mới — `BlockSelection`:** cùng họ với `TextSelection` đã dùng ở `note-interaction.ts`
(cả hai từ `@blocksuite/std`, set qua `std.selection.create(Ctor, props)` +
`std.selection.setGroup('note', [...])`, không cần Range/pointer thật). Dùng để mở TOOLBAR khi chọn
MỘT BLOCK (khác text selection). `store.addBlock('affine:image', {}, noteBlockId)` — không cần
blob/sourceId thật, schema có default đầy đủ.

**RED bắt đúng lỗi thao tác thật** (giá trị của TDD, không phải hình thức): agent nghiên cứu
(Explore) đọc mã nguồn thượng nguồn (`src/vendor/blocksuite/`, TRƯỚC đổi tên D11) nên báo tên thẻ
toolbar là `affine-toolbar-widget` — chạy thật thì `document.querySelector('affine-toolbar-widget')`
luôn `null` vì tên THẬT sau đổi tên là `drt-toolbar-widget`. Sửa, chạy lại → GREEN cho 4/5 khẳng
định, còn "More" đỏ.

**"More" bị loại khỏi phạm vi — đo sai gói lúc soạn spec mục 22.** Spec mục 22 quy "More" về gói
`affine/blocks/image`, nhưng grep lại thấy nó CHỈ ở
`affine/blocks/code/src/code-toolbar/components/code-toolbar.ts:131` (`.tooltip=${'More'}`) và
`affine/widgets/toolbar/src/utils.ts:275`. Toolbar khối `code` dùng `HoverController`
(`code-toolbar/index.ts:32-60`, gate bằng `TextSelection`/`BlockSelection` VÀ pointer hover thật) —
cơ chế trigger khác hẳn `BlockSelection` đơn thuần đã dùng cho ảnh. Bỏ khẳng định "More" khỏi test,
ghi lại làm nợ.

**Kết quả cuối:** 6/7 khoá mục 22 có test tự động (Align center/left/right, Download — qua toolbar
ảnh; Attachment, Edgeless — qua `slashMenu.items[].tooltip.caption`, tái dùng nguyên `moSlashMenuTuNote`
có sẵn, không cần hạ tầng mới). `npm test` **287/287** (35 file, tăng đúng 1 file/2 ca so với mục
22). Bảy cổng đo lại: `tsc` exit 0 · `kiem:vendor`/`kiem:vendor-paths`/`build`/`kiem:dist` xanh y hệt
mục 22 (không đụng `vi.json`/`extensions.ts` ở phần này).

### Còn nợ — TẠI SAO CHƯA LÀM, không phải quên

- **"More"** — cần điều tra riêng cơ chế `HoverController` của khối `code` (dispatch sự kiện hover
  thật hay có cách trigger qua API công khai khác — chưa tra).
- **15 khoá mục 21** (Card/Embed/Inline view, Create Linked Doc, Enter/Exit Full Screen, 2 toast ảnh
  còn lại, Headings 4-6, placeholder Note trống) — MỖI khoá cần hạ tầng kiểm KHÁC NHAU, đã tra sơ bộ
  vị trí nguồn (không tra cách trigger):
  - Card/Embed/Inline view: nhiều gói (`attachment`, `bookmark`, `embed`, `embed-doc`,
    `inlines/link`, `inlines/reference`) — `affine/inlines/reference`/`link` ĐÃ bật, khả năng thi
    được qua toolbar của một reference-node (chèn `@`-mention rồi chọn khối đó).
  - Create Linked Doc: `affine/blocks/root/src/configs/toolbar.ts:313` — `RootViewExtension` ĐÃ
    bật, context trigger chưa tra.
  - Enter/Exit Full Screen: `affine/blocks/frame/src/edgeless-toolbar/presentation-toolbar.ts:442-443`
    — `FrameViewExtension` ĐÃ bật, cần dựng Frame + trigger đúng state.
  - `downloadImageBlob` (export công khai từ `@blocksuite/affine-block-image`,
    `image/src/utils.ts:63-90`) phủ ĐÚNG 3 chuỗi ("Failed to download image!"/"Download in
    progress..."/"Downloading image...") qua gọi hàm trực tiếp + spy/đọc DOM `toast()` — ĐÃ tra kỹ
    (kể cả `createToastContainer`/`element.animate()`), CHƯA viết vì hết thời gian phiên này, không
    phải bế tắc kỹ thuật. "Copied image to clipboard"/"Failed to read image size" nằm trong
    `copyImageBlob`/hàm nội bộ KHÔNG export công khai từ package — cần import theo đường dẫn sâu
    hoặc bỏ qua.
  - Headings 4-6: `affine/rich-text/src/conversion.ts:70-86`, mảng config — chưa tra cách export
    /tiêu thụ (khả năng cũng đọc trực tiếp như slash-menu, không cần render).
  - Placeholder Note trống ("Drag/Click to insert Text block"): `affine/gfx/note/src/toolbar/
    note-menu-config.ts:62` — chưa tra export.
- Nội dung dịch cho 10 extension mới mục 20 — vẫn ngoài phạm vi.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng SHA của chính commit HANDOFF này hoặc mới hơn
git status --short                      # kỳ vọng sạch trừ antibiotics.ts + ba file browser-use
npm ci && npm run dung:vendor
```

**Chặng kế tiếp:** viết tiếp test TDD cho `downloadImageBlob` (3 chuỗi, đã tra kỹ, dễ nhất trong số
còn lại) rồi tới Headings 4-6/placeholder Note; hoặc điều tra `HoverController` cho "More"; hoặc
kiểm tay thật khi có người theo dõi Browser pane cho phần chưa tự động hoá được.
