# Mở Rộng Bảng Mẫu — Kích Thước Thả, 3 Danh Mục Nhãn Dán, Nhóm "Động Não"

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa bảng "Mẫu" của drtrong lên ngang bản AFFiNE thật mà chủ dự án quay video ngày
2026-09-01: 4 tab nhãn dán (`Mũi tên` đã có + 3 tab mới) cộng một tab mẫu bảng `Động não`, và sửa
lỗi thả mẫu ra bé xíu.

**Nguồn dữ liệu:** `C:\Users\LENOVO\Downloads\AFFiNE\packages\frontend\templates\` (bản checkout
AFFiNE của chủ dự án, đã có sẵn trên máy — KHÔNG clone lại). Chủ dự án đã duyệt việc chép cả 3 bộ
nhãn dán (hội thoại 2026-09-01).

---

## 0. Đã đo trên máy — đừng đo lại, đừng đoán khác

Toàn bộ số dưới đây đo ngày 2026-09-01. Nếu một bước nào mâu thuẫn với chúng thì bước đó sai, không
phải số sai.

**Đã kiểm mắt trên Browser pane HIỆN (đóng nợ (a) của HANDOFF §1.1):** localhost:8443 → Mindmap →
bảng "Sốc nhiễm khuẩn" → nút Mẫu. Tab "Mũi tên" hiện đúng, lưới 185 preview render, bấm một mẫu →
mũi tên ra trên canvas nền tối, Ctrl+Z gỡ sạch, console không lỗi. Nợ (a) ĐÃ ĐÓNG — Task 5 chỉ việc
ghi lại.

**Panel vendored đã có sẵn mọi thứ trong video, chỉ thiếu DỮ LIỆU.**
`src/vendor/blocksuite/affine/gfx/template/src/toolbar/template-panel.ts` đã có: ô tìm (dòng 56–74),
tab danh mục cuộn ngang (87–101, 409), tooltip tên mẫu (486–492), `overlay-scrollbar` (502),
`loading="lazy"` cho preview. Dòng 438–447: preview nhận **cả** chuỗi bắt đầu bằng `<svg` (đổi thành
data URL) **và** URL thường. Không phải sửa một dòng nào trong cây vendored cho kế hoạch này.

**Loại `template` được hỗ trợ sẵn.** `toolbar/template-type.ts` khai `type: 'template' | 'sticker'`;
`services/template.ts:386,403,417` xử lý cả hai. Task 4 không cần vá gì.

**Lỗi kích thước thả.** `src/board/mau-handy.ts:60` đặt `xywh` bằng đúng viewBox (73×72 px) nên mũi
tên thả ra bé xíu. AFFiNE hardcode `xywh: '[0,0,460,430]'` cho MỌI nhãn dán
(`packages/frontend/templates/build-stickers.mjs`) — đó là lý do trong video mũi tên choán 1/3 canvas.

**Kho nguồn.**

| Thư mục | Số tệp | Dung lượng `Content/` | Ghi chú |
|---|---|---|---|
| `stickers/Arrows/` | 186 | 2,1 MB | ĐÃ CÓ trong drtrong (chính là handy-arrows, tên `arrow-1.svg`…) |
| `stickers/Cheeky Piggies/` | 15 | 192 KB | mới |
| `stickers/Contorted Stickers/` | 15 | 65 KB | mới |
| `stickers/Paper/` | 15 | 108 KB | mới |
| `edgeless-snapshot/Brainstorming/` | 5 `.zip` + 5 `.svg` bìa | 204 KB snapshot, 51 KB bìa | mới, **0 tệp nhị phân** trong `assets/` |

Mỗi thư mục nhãn dán có `Cover/` và `Content/` riêng. **Chỉ dùng `Content/`** cho cả preview lẫn
asset — `Paper/Cover` nặng 1020 KB trong khi `Paper/Content` chỉ 108 KB, và `mau-handy` vốn đã dùng
một tệp cho cả hai vai.

**3 tệp phải BỎ (thương hiệu thượng nguồn, vi phạm D16 luật A của `kiem-dist.mjs`):**
`Contorted Stickers/AFFiNE.svg`, `Paper/AFFiNE AI.svg`, `Paper/Local First.svg`.
→ còn **42** nhãn dán mới. Đã kiểm: nội dung SVG của cả 3 bộ **không** chứa chuỗi `affine-` nào.

**Bẫy lớn nhất của kế hoạch này — snapshot Động não đầy `--affine-*`.** Đã đếm bên trong 5 tệp
`.zip`: tất cả đều nhồi tên token màu dạng dữ liệu — `affine-palette-line-black`,
`affine-palette-shape-yellow`, `affine-tag-purple`, `affine-note-shadow-sticker`… Nếu chép nguyên:
(1) `kiem-dist.mjs` luật A báo đỏ (`affine-` có gạch nối trong `dist/**/*.json`), và (2) đúng lớp lỗi
mà luật B được viết ra để bắt — custom property không phân giải được, render sai mà console sạch.
Đã xác nhận cây `.vendor-build/theme/style.css` định nghĩa đủ họ thay thế: `--drt-palette-line-*`,
`--drt-palette-shape-*`, `--drt-tag-*`, `--drt-note-shadow-*`. Cách chữa: chạy đúng luật của
`scripts/doi-ten-vendor.mjs` lên DỮ LIỆU — `\baffine-` → `drt-`. Luật đó khớp gạch nối nên
`affine:page` / `affine:surface` (flavour, dấu hai chấm) không bị chạm — đúng ý đồ, đổi là không đọc
được tài liệu do AFFiNE tạo.

**Cấu trúc `.zip` Động não:** `info.json`, `page:home.snapshot.json`, `assets/` (rỗng). Bìa là tệp
`.svg` cùng tên nằm cạnh `.zip`. `jszip` **đã** là dependency của drtrong (`node_modules/jszip` có
mặt) — không phải thêm gói.

---

## Global Constraints

- **KHÔNG sửa `src/vendor/blocksuite/`.** Mọi tính năng trong video đã có ở panel vendored; kế
  hoạch này chỉ bơm dữ liệu qua `EdgelessTemplatePanel.templates.extend(...)`.
- **D13 — byte tài sản không được vào chunk JS.** Giữ nguyên kiến trúc `mau-handy`: SVG/JSON nằm
  trong `public/static/templates/`, tệp `*.sinh.ts` chỉ chứa metadata (id, tên, kích thước) cỡ vài
  KB chữ; panel `fetch()` khi cần.
- **D16 — không `affine-` (có gạch nối) trong `dist/`.** Áp cho cả tên tệp lẫn nội dung. Task 4 có
  bước rà riêng; Task 2 xử bằng cách bỏ 3 tệp.
- Script sinh dữ liệu **chạy tay**, kết quả **được commit** — giống `npm run dung:mau-handy`. Không
  chạy trong dev/build/test.
- Tên danh mục hiển thị bằng tiếng Việt (app tiếng Việt): `Mũi tên` (đã có), `Heo nhắng`,
  `Nhãn dán`, `Giấy nhớ`, `Động não`.
- Test dùng Vitest, chạy `npm test -- <đường dẫn spec>`. Giữ khuôn của
  `src/board/__tests__/mau-handy.spec.ts` (unit, không kéo panel Lit) và `mau-handy-chen.spec.ts`
  (tích hợp, chèn thật vào bảng).
- Placeholder `"Search file or anything..."` vẫn tiếng Anh — **nợ D12 riêng, KHÔNG gộp vào lượt này**
  (HANDOFF §1.1 đã ghi rõ).

---

### Task 1: Chuẩn hoá kích thước thả

**Files:**
- Modify: `src/board/mau-handy.ts`
- Modify: `src/board/__tests__/mau-handy.spec.ts`

**Interfaces:**
- Consumes: `MAU_MUI_TEN` từ `./mau-handy.sinh` (không đổi).
- Produces: `Template.content` với `xywh` đã phóng to; `width`/`height` GIỮ NGUYÊN kích thước tự
  nhiên (chúng là kích thước gốc của ảnh, không phải khung trên canvas).

- [ ] **Step 1: Thêm hàm phóng khung**

Trong `src/board/mau-handy.ts`, thêm cạnh `taoMau`:

```ts
// Khung thả trên canvas, KHÔNG phải kích thước tự nhiên của SVG. Mũi tên nguồn chỉ 62–87 px viewBox
// nên thả ra bé xíu — đo trên trình duyệt thật 2026-09-01: ở zoom 100% mũi tên ra ~73 px, trong khi
// AFFiNE thả ra ~460 px (build-stickers.mjs hardcode `xywh: '[0,0,460,430]'` cho mọi nhãn dán).
// Ta không hardcode một khung cứng như thượng nguồn vì 3 bộ nhãn dán mới có tỷ lệ khác hẳn mũi tên;
// thay vào đó phóng theo CẠNH DÀI để không méo hình.
const CANH_DAI = 420

function khungTha(w: number, h: number): { w: number; h: number } {
  const k = CANH_DAI / Math.max(w, h)
  return { w: Math.round(w * k), h: Math.round(h * k) }
}
```

- [ ] **Step 2: Dùng khung đó cho `xywh`**

Trong `taoMau`, thay `xywh: \`[0,0,${w},${h}]\`` bằng khung đã phóng. `width`/`height` giữ `w`/`h`.

```ts
const khung = khungTha(w, h)
// …
xywh: `[0,0,${khung.w},${khung.h}]`,
```

- [ ] **Step 3: Test**

Thêm vào `mau-handy.spec.ts` một khẳng định: với mọi mẫu, cạnh dài của `xywh` bằng `CANH_DAI` (±1 do
làm tròn) và tỷ lệ `w/h` của `xywh` sai lệch dưới 2% so với tỷ lệ `width/height`. Chạy
`npm test -- src/board/__tests__/mau-handy.spec.ts`.

- [ ] **Step 4: Kiểm mắt**

Mở bảng thật, thả một mũi tên, so với video: phải choán một phần đáng kể canvas chứ không còn bé xíu.

---

### Task 2: Ba danh mục nhãn dán mới

**Files:**
- Create: `scripts/dung-mau-sticker.mjs`
- Create: `src/board/mau-sticker.sinh.ts` (tệp sinh)
- Create: `public/static/templates/stickers/<danh-mục>/<tên>.svg` (42 tệp, ~365 KB)
- Modify: `src/board/mau-handy.ts` (quản lý nhiều danh mục)
- Modify: `package.json` (thêm `dung:mau-sticker`)
- Test: `src/board/__tests__/mau-handy.spec.ts`

**Interfaces:**
- Consumes: `C:\Users\LENOVO\Downloads\AFFiNE\packages\frontend\templates\stickers\` — đường dẫn
  nguồn đọc từ biến môi trường `AFFINE_REPO` (mặc định trỏ tới `../AFFiNE`), để script không chết
  trên máy khác.
- Produces: `export const MAU_STICKER: readonly NhomMau[]` với
  `NhomMau = { danhMuc: string; thuMuc: string; mau: readonly KichThuocMau[] }`.
  `KichThuocMau` tái dùng kiểu đã có trong `mau-handy.sinh.ts` — Task này **không** đổi tệp đó.

- [ ] **Step 1: Viết `scripts/dung-mau-sticker.mjs`**

Khuôn theo `scripts/dung-mau-handy.mjs` (đọc trước, chép cấu trúc: `docKichThuoc`, `soSanhTuNhien`,
bước dọn tệp thừa từng-tệp-một tránh `EPERM` do CodeGraph giữ handle). Khác ở bốn điểm:

1. Nguồn là thư mục cục bộ, **không sparse-clone** — bỏ toàn bộ phần `git clone`.
2. Đọc `Content/` (KHÔNG đọc `Cover/`). Ghi ra `public/static/templates/stickers/<slug-danh-mục>/`.
3. **KHÔNG chèn `<style>*{fill:#808080}</style>`.** Mực trung tính là bản vá riêng cho handy-arrows
   (nguồn dùng `fill="black"`/`currentColor` nên đen tịt trên nền tối). Ba bộ này có màu sẵn — ép
   xám sẽ phá hình. Thay vào đó Step 5 kiểm tương phản.
4. Danh sách loại trừ cứng, có lý do ghi trong comment:
   ```js
   // Bỏ 3 nhãn dán mang thương hiệu thượng nguồn: D16 luật A cấm chuỗi `affine-` (có gạch nối)
   // trong dist/, mà slug của chúng sẽ là `affine-ai.svg` / `affine.svg`; "Local First" là khẩu
   // hiệu marketing của AFFiNE, không thuộc về app này.
   const BO_QUA = new Set(['AFFiNE.svg', 'AFFiNE AI.svg', 'Local First.svg'])
   ```

Slug tên tệp: hạ chữ, thay ký tự ngoài `[a-z0-9]` bằng `-`, gộp gạch nối lặp (`Sassy Flick.svg` →
`sassy-flick.svg`, `A lot of question.svg` → `a-lot-of-question.svg`). Giữ `name` hiển thị là tên gốc
đã bỏ đuôi.

Ánh xạ danh mục ghi thẳng trong script:

```js
const DANH_MUC = [
  { nguon: 'Cheeky Piggies',     hienThi: 'Heo nhắng', thuMuc: 'heo-nhang' },
  { nguon: 'Contorted Stickers', hienThi: 'Nhãn dán',  thuMuc: 'nhan-dan' },
  { nguon: 'Paper',              hienThi: 'Giấy nhớ',  thuMuc: 'giay-nho' },
]
```

Script phải **ném** nếu thư mục nguồn không tồn tại hoặc số tệp sau khi lọc ≠ 42 — im lặng sinh ra
tệp thiếu là kiểu hỏng khó thấy nhất ở đây.

- [ ] **Step 2: Thêm script vào `package.json`**

`"dung:mau-sticker": "node scripts/dung-mau-sticker.mjs"`, đặt ngay dưới `dung:mau-handy`.

- [ ] **Step 3: Mở `HandyTemplateManager` ra nhiều danh mục**

`src/board/mau-handy.ts` hiện hardcode một `DANH_MUC` và một `DS_MAU`. Đổi thành bảng:

```ts
type Nhom = { readonly danhMuc: string; readonly mau: readonly Template[] }

const NHOM: readonly Nhom[] = [
  { danhMuc: 'Mũi tên', mau: MAU_MUI_TEN.map((m) => taoMau(m, '/static/templates/arrows')) },
  ...MAU_STICKER.map((n) => ({
    danhMuc: n.danhMuc,
    mau: n.mau.map((m) => taoMau(m, `/static/templates/stickers/${n.thuMuc}`)),
  })),
]
```

`taoMau` nhận thêm tham số thư mục gốc và dùng nó cho cả `preview`, `assets[sourceId]` và tiền tố
`sourceId`. Giữ nguyên ràng buộc đã ghi trong comment hiện có: `sourceId` **không được** bắt đầu
bằng `/` (nếu không `ImageBlockTransformer.fromSnapshot` bỏ qua `writeToBlob`). Dùng tiền tố theo
nhóm để không đụng id giữa các danh mục, ví dụ `handy-arrow-<id>` và `sticker-<thuMuc>-<id>`.

`categories()` trả `NHOM.map(n => n.danhMuc)`; `list()`/`search()` tra trên `NHOM`.

- [ ] **Step 4: Test**

Mở rộng `mau-handy.spec.ts`:
- `categories()` trả đúng 4 tên theo thứ tự `Mũi tên, Heo nhắng, Nhãn dán, Giấy nhớ`.
- Tổng số mẫu = 185 + 42.
- Mọi `sourceId` là duy nhất trên toàn bộ 4 danh mục và không bắt đầu bằng `/`.
- Mọi `content` qua `DocSnapshotSchema.parse` (khẳng định đã có, chỉ mở rộng phạm vi).
- Không `Template.name` nào chứa `affine` (không phân biệt hoa thường).

Thêm vào `mau-handy-chen.spec.ts` một ca chèn thật từ danh mục mới (một nhãn `Giấy nhớ`), khẳng định
`affine:image` nằm dưới surface và blob vào kho.

- [ ] **Step 5: Kiểm mắt + tương phản**

Mở bảng thật: 4 tab hiện đúng, cuộn ngang được, tooltip tên mẫu hiện khi rê (như "arrow-1" trong
video). Thả một nhãn của **mỗi** danh mục lên canvas TỐI, chụp ảnh. Nhãn nào chìm hẳn vào nền
(`Contorted Stickers` có vài hình nét trắng mảnh) thì ghi lại — **không tự ý ép màu**, báo chủ dự án
quyết, vì ép màu lên nhãn dán nhiều màu là phá hình chứ không phải sửa tương phản.

---

### Task 3: Chuyển 5 mẫu "Động não" thành JSON phục vụ tĩnh

**Files:**
- Create: `scripts/dung-mau-dongnao.mjs`
- Create: `scripts/dich-dongnao.json`
- Create: `public/static/templates/dongnao/<slug>.json` (5 tệp, ~204 KB)
- Create: `public/static/templates/dongnao/<slug>.svg` (5 bìa, ~51 KB)
- Create: `src/board/mau-dongnao.sinh.ts` (chỉ danh sách `{ slug, ten }`)
- Modify: `package.json`

**Interfaces:**
- Consumes: `$AFFINE_REPO/packages/frontend/templates/edgeless-snapshot/Brainstorming/*.zip` + `*.svg`.
- Produces: mỗi `.json` là một `Template` đầy đủ `{ name, type: 'template', preview, content }` với
  `preview` là **URL** tới tệp `.svg` cùng slug (panel xử lý URL ở `template-panel.ts:445`), và
  `content` là `DocSnapshot` đã rửa. `mau-dongnao.sinh.ts` chỉ chứa
  `export const MAU_DONG_NAO: readonly { slug: string; ten: string }[]`.

- [ ] **Step 1: Viết script giải nén + rửa**

Đọc `C:\Users\LENOVO\Downloads\AFFiNE\packages\frontend\templates\build-edgeless.mjs` trước để lấy
khuôn (`convertSourceId`, cách lọc `__MACOSX`, cách nhận `*.snapshot.json`). Ba khác biệt bắt buộc:

1. **Rửa `affine-` → `drt-` trên toàn bộ chuỗi JSON**, đúng luật của `scripts/doi-ten-vendor.mjs`:
   ```js
   // Snapshot thượng nguồn nhồi tên token màu dạng DỮ LIỆU: `--affine-palette-line-black`,
   // `--affine-tag-purple`, `--affine-note-shadow-sticker`… Chép nguyên thì (1) kiem-dist.mjs luật A
   // báo đỏ vì `affine-` lọt vào dist/*.json, và (2) mẫu render với custom property không phân giải
   // được — đúng lớp lỗi luật B sinh ra để bắt (console sạch, hình sai, mắt thường không thấy).
   // `\b` + gạch nối: `affine:page` / `affine:surface` là FLAVOUR, cố ý KHÔNG đổi.
   json = json.replace(/\baffine-/g, 'drt-')
   ```
2. **Bìa** ghi ra tệp `.svg` riêng trong `public/` thay vì nội tuyến vào JS (D13). Giữ phép thay
   `fill="white"` → `fill="currentColor"` của thượng nguồn.
3. `assets/` trong cả 5 `.zip` đều **rỗng** (đã đếm) — script vẫn phải xử nếu có, nhưng nếu tìm thấy
   tệp nhị phân thì **ném** kèm tên tệp, vì đường đó chưa từng được kiểm và ghi mù vào
   `public/static/templates/` sẽ đụng cấu trúc thư mục của Task 2.

Slug: `5W2H.zip` → `5w2h`, `Concept Map.zip` → `concept-map`, v.v. Tên hiển thị lấy ở Step 2.

- [ ] **Step 2: Bảng dịch tên + nội dung**

Tạo `scripts/dich-dongnao.json` — ánh xạ chuỗi tiếng Anh → tiếng Việt, khớp **nguyên văn** trên
`delta.insert` và trên tên mẫu:

```json
{
  "_ten": { "5W2H": "5W2H", "Concept Map": "Sơ đồ khái niệm", "Flowchart": "Lưu đồ",
            "SMART": "SMART", "SWOT": "SWOT" },
  "_chuoi": { "Who": "Ai", "What": "Cái gì" }
}
```

Script duyệt cây snapshot, thay mọi `delta.insert` khớp nguyên văn. Với chuỗi **không rỗng và không
có trong bảng**, script phải **liệt kê hết rồi ném** — không được im lặng để lại tiếng Anh. Đây là
đúng kỷ luật của cổng dịch sẵn có trong repo (`kiem-dist.mjs` luật C, `so-khop-ban-dich.mjs`); một
mẫu tiếng Anh lọt vào là hồi quy bề mặt hiển thị.

Nếu khối lượng chữ vượt sức một lượt (SWOT là snapshot 81 KB, nhiều nút nhất), **dừng và hỏi chủ dự
án** có chấp nhận giao trước 4 mẫu kia không — đừng tự cắt.

- [ ] **Step 3: Thêm `"dung:mau-dongnao"` vào `package.json`**

- [ ] **Step 4: Rà D16 trên tệp sinh**

```bash
grep -ril "affine-" public/static/templates/ || echo "sach"
```

Phải in `sach`. Cả tên tệp lẫn nội dung.

---

### Task 4: Đăng ký danh mục "Động não" (nạp lười)

**Files:**
- Create: `src/board/mau-dongnao.ts`
- Modify: `src/board/EdgelessBoard.tsx`
- Test: `src/board/__tests__/mau-dongnao.spec.ts`

**Interfaces:**
- Consumes: `MAU_DONG_NAO` từ `./mau-dongnao.sinh`; `fetch()` tới `/static/templates/dongnao/*.json`.
- Produces: `export class DongNaoTemplateManager implements TemplateManager`.

- [ ] **Step 1: Viết manager nạp lười**

`TemplateManager.list()` được phép trả `Promise<Template[]>` (`toolbar/template-type.ts`), và panel
chỉ gọi `list()` cho danh mục **đang chọn** — nên 204 KB JSON chỉ tải khi người dùng bấm sang tab
"Động não", không vào chunk JS và không tốn gì cho người không dùng. Nhớ **cache** kết quả trong
manager để đổi tab qua lại không fetch lại.

```ts
// Vì sao fetch thay vì import JSON: D13 — 204 KB snapshot không được nằm trong chunk JS. Panel gọi
// list() cho ĐÚNG danh mục đang chọn nên phí này chỉ trả khi người dùng thật sự mở tab Động não.
```

`search()` lọc trên tên (đã có trong `.sinh.ts`, không cần fetch), rồi mới nạp nội dung của những mẫu
khớp.

- [ ] **Step 2: Đăng ký ở `EdgelessBoard.tsx`**

Cạnh dòng 66 hiện có, thêm:
```ts
EdgelessTemplatePanel.templates.extend(new DongNaoTemplateManager())
```
Giữ ở cấp module như bản hiện tại. Thứ tự `extend` quyết định thứ tự tab — "Động não" đứng sau 4 tab
nhãn dán, khớp video (Brainstorming là tab cuối).

- [ ] **Step 3: Test**

`mau-dongnao.spec.ts` (unit, `fetch` được stub bằng nội dung 5 tệp JSON đọc thẳng từ `public/`):
- `categories()` trả `['Động não']`.
- 5 mẫu, `type === 'template'`, `content` qua `DocSnapshotSchema.parse`.
- **Không** chuỗi `affine-` nào trong JSON đã tuần tự hoá.
- Mọi `--drt-*` xuất hiện trong JSON đều có định nghĩa trong `.vendor-build/theme/style.css` — đây
  chính là luật B của `kiem-dist.mjs` áp sớm ở tầng dữ liệu; rẻ hơn nhiều so với phát hiện sau khi
  build.
- Không `delta.insert` nào còn khớp bảng tiếng Anh của Step 2 Task 3.

- [ ] **Step 4: Kiểm chèn thật + vào-ra**

Mở bảng, sang tab "Động não", thả mẫu `Lưu đồ`: khối ghi chú/hình ra đúng màu (không trong suốt,
không đen tịt — đó là dấu hiệu `--drt-*` không phân giải). **Thoát khỏi bảng, sang màn Mindmap, vào
lại** — nội dung phải còn nguyên. Rồi mở một bảng KHÁC kiểm không bị biến đổi.

---

### Task 5: Cập nhật HANDOFF.md

**Files:**
- Modify: `docs/superpowers/HANDOFF.md`

- [ ] **Step 1: Đóng nợ (a)**

Trong §1.1, mục "Bảng Mẫu (Template)": thay dòng `CÒN NỢ: (a) kiểm mắt trên Browser pane HIỆN…` bằng
ghi nhận đã kiểm ngày 2026-09-01 kèm kết quả (tab hiện, 185 preview, thả ra hình, Ctrl+Z sạch,
console không lỗi).

- [ ] **Step 2: Ghi lại quyết định về `illustrations`**

Khoản (b) — `illustrations` 54 tệp ~10 MB cố ý bỏ — **giữ nguyên**, chuyển xuống §1.2 "ĐÃ QUYẾT:
KHÔNG LÀM" vì nó là quyết định chứ không phải việc tồn (đúng phân loại mà chính §1 dặn đừng gộp).

- [ ] **Step 3: Ghi hạng mục mới**

Thêm mô tả 4 danh mục nhãn dán + Động não, nguồn dữ liệu, hai script `dung:mau-sticker` /
`dung:mau-dongnao`, và **cảnh báo đậm** về bẫy `--affine-*` trong dữ liệu snapshot cho phiên sau.
Trỏ tới chính tệp kế hoạch này.

---

## Xong khi

- `npm test` xanh; `npm run build` xanh (bao gồm `postbuild` → `kiem-dist.mjs`).
- Bảng Mẫu có 5 tab: `Mũi tên` (185), `Heo nhắng` (15), `Nhãn dán` (14), `Giấy nhớ` (13),
  `Động não` (5).
- Thả một mũi tên ra khung ~420 px cạnh dài, không còn bé xíu.
- `grep -ril "affine-" public/static/templates/ dist/` không ra gì.
- Vào-ra bảng, nội dung còn nguyên; bảng khác không bị đổi.
