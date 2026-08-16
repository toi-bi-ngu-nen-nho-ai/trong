# Nội dung dịch, đợt đầu (chặng P1-E) — Kế hoạch thi hành

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm 130 khoá dịch tiếng Việt mới vào `src/board/vi.json` (cộng 1 khoá vào file mới
`src/board/vi-tien-to.json`), chia ba đợt, cùng hai cơ chế mới: thu hẹp danh sách vị trí hiển thị D12
(bỏ `name`/`group`/`title`/`text`) và một dây bẫy quét ngược (Cổng 4) + một cổng tiền tố nhất quán
(Cổng 5) để chặn hai lớp lỗi hỏng-im-lặng đã đo được trong lượt thiết kế.

**Architecture:** Không đổi kiến trúc pipeline `dung:vendor` (biên dịch → đổi tên → dịch chuỗi →
sinh paths → sinh băm → kiểm lại). Chặng này chỉ: (1) thu hẹp `THUOC_TINH_HIEN_THI` trong
`scripts/luat-vi-tri-dich.mjs`; (2) thêm ba cổng thuần vào `scripts/dich-chuoi-vendor.mjs`
(mẫu mã, quét-ngược, tiền-tố) dựa trên hai module logic mới; (3) một hàm "thay trọn cây" riêng cho
đúng một khoá tiền tố; (4) nội dung — soạn khoá theo ba đợt, mỗi đợt là một vòng
`dung:vendor` → bảy cổng → soi mắt → chủ dự án duyệt câu chữ.

**Tech Stack:** Node.js ESM (`.mjs`), TypeScript Compiler API (`typescript` package, dùng làm
thư viện phân tích cú pháp thuần — không phải để biên dịch dự án), Vitest cho test, JSON phẳng cho
bảng dịch.

## Global Constraints

Từ spec `docs/superpowers/specs/2026-08-15-noi-dung-dich-design.md` (bản 4) và các phát hiện đo
lại trong lượt lập kế hoạch này:

- **Danh sách vị trí hiển thị D12 sau chặng này chỉ còn 7 tên**: `tooltip`, `label`, `description`,
  `caption`, `placeholder`, cộng đối số `toast` và thuộc tính HTML `data-tip`. Bỏ `name`, `group`,
  `title`, `text` — cả bốn mối nối nguy hiểm đo được ở §3.1 của spec đều đọc `.name`.
- **Không dịch tên định dạng/nhãn hiệu**: `Markdown`, `LaTeX`, `Docx`, `OneNote`, `Html`, `Zip`,
  `PDF`, `FreeMind`, `OPML` — giữ nguyên tiếng Anh, KHÔNG thêm khoá cho chúng (dịch ra chính nó sẽ
  bị Cổng 1 — "bản dịch trùng bản gốc" — chặn).
- **Không dịch mã chết**: `"Drag/Click to insert Text block"` không bao giờ qua được `.replace()`
  (nhánh `item.type !== 'text'` không cho nó đi qua) — không thêm khoá.
- **Không dịch hai chuỗi có nguy cơ tự tham chiếu mới phát hiện**: `"Images"` và `"MindMap"` là giá
  trị `description:` trong `FileTypes` (`affine/shared/src/utils/file/filesys.js`), và CÙNG những
  chuỗi đó được truyền lại làm đối số gọi hàm ở nơi khác — `openFilesWith('Images')`
  (`filesys.js:338`) và `openSingleFileWith('MindMap')`
  (`affine/gfx/mindmap/src/toolbar/utils/import-mindmap.js:5`). Dịch `description: 'MindMap'` làm
  `FileTypes.find(i => i.description === acceptType)` không tìm thấy gì nữa,
  `acceptType !== 'Any' && !fileType` đúng, và `importMindmap` **ném lỗi** ngay khi người dùng bấm
  nhập sơ đồ tư duy — hỏng một tính năng đang bật (`affine/gfx/mindmap` có view extension đăng ký).
  `"Images"` tương tự cho `getImageFilesFromLocal()`. `"Videos"`/`"Audios"` không có caller nào
  gọi lại bằng chuỗi — an toàn, vẫn dịch.
- **Không có danh sách miễn** — giữ nguyên quyết định 2 của P1-C. Bốn nhóm loại trừ trên không phải
  "miễn", chúng là những khoá không bao giờ được thêm ngay từ đầu.
- **Bảy cổng phải xanh sau MỖI đợt**: `tsc --noEmit`, `npm test`, `kiem:vendor`, `kiem:vendor-paths`,
  `kiem:vendor-build`, `build`, `kiem:dist`.
- **Không sửa `src/data/antibiotics.ts`** — dữ liệu lâm sàng, chủ dự án tự quản.
- **Đo lại, đừng chép** — mọi con số trong tài liệu này đã được đo lại tại thời điểm viết kế hoạch
  (2026-08-15), không mang theo từ các bản spec trước.

---

## Bản đồ số liệu — từ spec sang kế hoạch, có điều chỉnh

Spec bản 4 tính **138 khoá** (24 + 84 + 30). Lập kế hoạch phát hiện thêm bốn thứ phải trừ, có bằng
chứng `file:dòng` kèm theo:

| Trừ | Vì sao | Đợt |
|---|---:|---|
| `"Markdown"` | Rule "giữ nguyên tên định dạng" (spec §5.1.1) | Đợt 2 |
| `"Drag/Click to insert Text block"` | Mã chết (spec §4.4) | Đợt 2 |
| `"Images"` | Tự tham chiếu qua `openFilesWith('Images')`, gói `blocks/image` — MỚI ĐO | Đợt 3 |
| `"MindMap"` | Tự tham chiếu qua `openSingleFileWith('MindMap')`, gói `gfx/mindmap` ĐANG BẬT — MỚI ĐO | Đợt 3 |
| `"Html"`, `"Zip"`, `"Docx"`, `"OneNote"` | Rule "giữ nguyên tên định dạng" | Đợt 3 |

| | Spec bản 4 | Kế hoạch (đo lại) |
|---|---:|---:|
| Đợt 1 | 24 | **24** |
| Đợt 2 | 84 | **82** |
| Đợt 3 | 30 | **24** |
| **`vi.json` — tổng** | 138 | **130** |
| `vi-tien-to.json` | 1 (chưa đếm riêng) | **1** |
| **Tổng khoá dịch** | — | **131** |

`"Images"` và `"MindMap"` là phát hiện **mới**, không có trong spec bản 4 — bản 4 chỉ tìm ra site
tiêu thụ (`filesys.js:175`, `:205` qua `i.description === acceptType`) mà chưa lần theo tới các
khoá cụ thể chảy vào đó. Ghi lại thành phụ lục HANDOFF ở Task 9, không viết lại spec.

---

### Task 1: Thu hẹp danh sách vị trí hiển thị D12

**Files:**
- Modify: `scripts/luat-vi-tri-dich.mjs:12-15`
- Modify: `src/__tests__/vendor-dich.spec.ts:32-46,58-77`
- Test: `src/__tests__/vendor-dich.spec.ts` (file có sẵn, sửa tại chỗ)

**Interfaces:**
- Consumes: không có (module thuần, không phụ thuộc task khác).
- Produces: `THUOC_TINH_HIEN_THI` — nay còn đúng 7 phần tử theo thứ tự
  `['label', 'tooltip', 'description', 'caption', 'placeholder']` cộng `DOI_SO_HIEN_THI = ['toast']`
  và `THUOC_TINH_HTML_HIEN_THI = ['data-tip']` (hai cái sau không đổi). Task 3, 6, 7, 8 dựa vào tập
  vị trí này để biết chuỗi nào dịch được.

- [ ] **Step 1: Sửa ca kiểm khẳng định kích thước danh sách — RED trước**

Mở `src/__tests__/vendor-dich.spec.ts`, thay khối `describe('D12 — danh sách vị trí cho phép đúng
kích thước và nội dung', ...)` (dòng 31-55) bằng:

```typescript
describe('D12 — danh sách vị trí cho phép đúng kích thước và nội dung', () => {
  it('THUOC_TINH_HIEN_THI có đúng 5 tên, đúng thứ tự đo được', () => {
    expect([...THUOC_TINH_HIEN_THI]).toEqual([
      'label',
      'tooltip',
      'description',
      'caption',
      'placeholder',
    ])
  })

  it('DOI_SO_HIEN_THI có đúng 1 tên: toast', () => {
    expect([...DOI_SO_HIEN_THI]).toEqual(['toast'])
  })

  it('THUOC_TINH_HTML_HIEN_THI có đúng 1 tên: data-tip', () => {
    expect(THUOC_TINH_HTML_HIEN_THI).toEqual(['data-tip'])
  })
})
```

Sau đó sửa khối `describe('D12 — vị trí ĐƯỢC dịch', ...)` (dòng 57-78): xoá ca `'giá trị của thuộc
tính name'` (dòng 62-64) — đây là vị trí đang bị loại.

Trong khối `describe('D12 — vị trí KHÔNG được đụng', ...)` (dòng 80-143), thêm bốn ca mới ngay sau
ca `'giá trị lược đồ ở type:'` (sau dòng 85):

```typescript
  it('giá trị của thuộc tính name (đã loại khỏi danh sách — P1-E)', () => {
    // name: chứa bốn mối nối nguy hiểm đo được ở spec P1-E §3.1: tooltips[name],
    // ['Code','Link'].includes(i.name), item.name !== 'Divider'. Dịch tại đây là đứt mối nối.
    expect(dich(`const a = { name: 'Style' }`)).toContain(`'Style'`)
  })

  it('giá trị của thuộc tính group (là khoá sắp xếp có cấu trúc, không phải nhãn)', () => {
    // Giá trị thật dạng '0_Basic@0', bị parseGroup mổ (widgets/slash-menu/src/utils.js).
    expect(dich(`const a = { group: 'Style' }`)).toContain(`'Style'`)
  })

  it('giá trị của thuộc tính title (đi vào file xuất ra Markdown/PDF)', () => {
    expect(dich(`const a = { title: 'Style' }`)).toContain(`'Style'`)
  })

  it('giá trị của thuộc tính text (là enum số Flag.Text, không phải chuỗi)', () => {
    expect(dich(`const a = { text: 'Style' }`)).toContain(`'Style'`)
  })
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ (vì mã sản xuất chưa sửa)**

Run: `npx vitest run src/__tests__/vendor-dich.spec.ts`

Expected: FAIL — ca `'THUOC_TINH_HIEN_THI có đúng 5 tên...'` báo nhận được mảng 11 phần tử; bốn ca
mới (`name`/`group`/`title`/`text`) báo `expected 'Style' to contain 'Style'`... thực ra các ca đó
sẽ PASS nhầm ở trạng thái hiện tại vì `name`/`group`/`title`/`text` VẪN đang được dịch (mã sản xuất
chưa đổi) — output THẬT SỰ chứa `"Phong cách"` chứ không phải `'Style'`. Đọc kỹ output: các ca
`toContain('Style')` phải THẤT BẠI (vì bản dịch đã thay `'Style'` bằng `"Phong cách"`), đó mới là
RED đúng nghĩa cho các ca "KHÔNG được đụng" mới thêm.

- [ ] **Step 3: Sửa mã sản xuất**

Trong `scripts/luat-vi-tri-dich.mjs`, sửa dòng 9-15:

```javascript
// Giá trị của các thuộc tính này là chuỗi hiển thị. Đo trên cây vendored ban đầu: 822 lượt, gồm
// cả `name`/`group`/`title`/`text`. Chặng P1-E đã BỎ bốn tên đó khỏi danh sách — spec
// docs/superpowers/specs/2026-08-15-noi-dung-dich-design.md §3.1-§4.1 đo được BỐN mối nối nguy
// hiểm đọc lại giá trị hiển thị làm khoá tra cứu / vế so sánh, và cả bốn đều đọc `.name`:
//   tooltips[name]                          — affine/blocks/note/src/configs/slash-menu.js:51,83
//   ['Code','Link'].includes(i.name)        — affine/blocks/note/src/configs/slash-menu.js:39
//   item.name !== 'Divider'                 — affine/gfx/note/src/toolbar/note-menu-config.js:113
// Bảng tooltip của BlockSuite trộn khoá CÓ NHÁY ('Heading 1': {...}) với khoá KHÔNG NHÁY
// (Italic: {...}, Divider: {...}) trong CÙNG một object — nên không có cách quét literal nào tách
// được "name: an toàn" khỏi "name: nguy hiểm" một cách đáng tin. `title` đi vào file xuất ra
// (Markdown/PDF, adapters/markdown/markdown.js:212). `text` là thành viên enum số
// (Flag[Flag["Text"] = 4] = "Text", affine/shared/src/services/toolbar-service/flags.js:7) — người
// dùng viết Flag.Text (truy cập thuộc tính), phép thay chuỗi không với tới được. `group` là khoá
// sắp xếp có cấu trúc ('0_Basic@0'), bị parseGroup mổ (affine/widgets/slash-menu/src/utils.js:11).
//
// KHÔNG được thêm `key` vào đây: nó chứa "Align left", "Align right" — đọc lên y hệt nhãn hiển
// thị nhưng là ĐỊNH DANH mục menu, dịch vào là gãy tra cứu.
export const THUOC_TINH_HIEN_THI = new Set(['label', 'tooltip', 'description', 'caption', 'placeholder'])
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npx vitest run src/__tests__/vendor-dich.spec.ts`

Expected: PASS toàn bộ file. Chú ý ca `'D12 — cổng độc lập trên đầu ra thật'` đọc trực tiếp
`src/board/vi.json` và `.vendor-build/` — với 5 khoá hiện tại (`Style`/`Layout`/`Add media`/...) vẫn
xanh vì không khoá nào trong 5 khoá đó CHỈ sống ở `name`/`group`/`title`/`text`.

- [ ] **Step 5: Chạy `npx tsc --noEmit`, xác nhận exit 0**

Run: `npx tsc --noEmit`

Expected: exit 0. `luat-vi-tri-dich.d.mts` không cần sửa — `THUOC_TINH_HIEN_THI: Set<string>` vẫn
đúng kiểu dù nội dung Set thay đổi.

- [ ] **Step 6: Commit**

```bash
git add scripts/luat-vi-tri-dich.mjs src/__tests__/vendor-dich.spec.ts
git commit -m "P1-E Task 1: thu hẹp D12 còn 5 vị trí — bỏ name/group/title/text"
```

---

### Task 2: Cổng mẫu mã — lưới chắn ba dòng

**Files:**
- Modify: `scripts/dich-chuoi-vendor.mjs` (thêm cổng, sau Cổng 1 hiện có ở dòng 112-123, trước vòng
  duyệt cây)
- Test: `src/__tests__/vendor-dich-chuoi-vendor.spec.ts` (file mới)

**Interfaces:**
- Consumes: không có.
- Produces: hành vi DỪNG của `dich-chuoi-vendor.mjs` khi `vi.json` có khoá bắt đầu `_`, kết thúc
  `$`, hoặc chứa `var(--`. Không export gì cho task khác — logic nằm thẳng trong script CLI vì đây
  là kiểm tra một dòng, không đáng tách module.

`dich-chuoi-vendor.mjs` hiện không có test riêng (nó là script CLI, không phải module thuần) — tạo
file test mới chạy nó qua `child_process` với một `vi.json` giả trong thư mục tạm.

- [ ] **Step 1: Viết test RED**

Tạo `src/__tests__/vendor-dich-chuoi-vendor.spec.ts`:

```typescript
// Cổng mẫu mã của dich-chuoi-vendor.mjs — lưới chắn ba dòng, không phải bộ lọc chính (tập khoá
// vốn được soạn từ danh sách đã duyệt tay, không bốc từ bề mặt thô). Bắt đúng năm chuỗi có thật
// từng lẫn trong bề mặt ứng viên của P1-E: colors$, pen$, penInfo$, penIconMap$,
// var(--drt-text-primary-color).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

let GOC: string

beforeEach(() => {
  GOC = mkdtempSync(path.join(tmpdir(), 'dich-chuoi-'))
  mkdirSync(path.join(GOC, 'src/board'), { recursive: true })
  mkdirSync(path.join(GOC, '.vendor-build'), { recursive: true })
  writeFileSync(path.join(GOC, '.vendor-build/a.js'), `const a = { label: 'Style' };\n`)
})

afterEach(() => rmSync(GOC, { recursive: true, force: true }))

function chay(banDo: Record<string, string>) {
  writeFileSync(path.join(GOC, 'src/board/vi.json'), JSON.stringify(banDo))
  writeFileSync(path.join(GOC, 'src/board/vi-tien-to.json'), '{}')
  const script = path.resolve(__dirname, '../../scripts/dich-chuoi-vendor.mjs')
  try {
    const ra = execFileSync('node', [script], { cwd: GOC, encoding: 'utf8', stdio: 'pipe' })
    return { exitCode: 0, stdout: ra, stderr: '' }
  } catch (err) {
    const e = err as { status: number; stdout: string; stderr: string }
    return { exitCode: e.status, stdout: e.stdout, stderr: e.stderr }
  }
}

describe('Cổng mẫu mã — khoá dạng _tên, tên$, var(--…)', () => {
  it.each([
    ['_editing', 'bắt đầu bằng _'],
    ['pen$', 'kết thúc bằng $'],
    ['var(--drt-text-primary-color)', 'chứa var(--'],
  ])('DỪNG khi khoá là %s (%s)', (khoa) => {
    const ra = chay({ [khoa]: 'Phong cách' })
    expect(ra.exitCode).not.toBe(0)
    expect(ra.stderr).toContain('mẫu mã')
    expect(ra.stderr).toContain(khoa)
  })

  it('khoá bình thường vẫn qua được cổng này', () => {
    const ra = chay({ Style: 'Phong cách' })
    // Không cần exit 0 tuyệt đối ở đây (còn phụ thuộc các cổng khác chạy sau), chỉ cần thông báo
    // không nhắc tới "mẫu mã" — tức cổng này không chặn nhầm khoá hợp lệ.
    expect(ra.stderr).not.toContain('mẫu mã')
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npx vitest run src/__tests__/vendor-dich-chuoi-vendor.spec.ts`

Expected: FAIL — ba ca đầu thất bại vì `dich-chuoi-vendor.mjs` hiện chưa có cổng mẫu mã (nó sẽ chạy
tiếp và dừng ở một cổng KHÁC, hoặc chạy hết và exit 0 mà không có dòng "mẫu mã" nào trong stderr).

- [ ] **Step 3: Thêm cổng vào mã sản xuất**

Trong `scripts/dich-chuoi-vendor.mjs`, chèn đoạn sau ngay SAU khối Cổng 1 (sau dòng 123, trước dòng
`const theoKhoa = Object.fromEntries(...)` ở dòng 125):

```javascript
// ─── Cổng mẫu mã — lưới chắn ba dòng ─────────────────────────────────────────────────────────
// Không phải bộ lọc chính (tập khoá vốn được soạn từ danh sách đã duyệt tay ở P1-E, không bốc
// nguyên từ 900 chuỗi thô). Là lưới chắn cuối cho ba dạng chuỗi rõ ràng là mã, không phải chữ
// hiển thị, và đã từng lẫn thật trong bề mặt ứng viên (colors$, pen$, penInfo$, penIconMap$,
// var(--drt-text-primary-color)) — bốn cái đầu là tên field Lit signal (kết thúc `$` theo quy ước
// @preact/signals), cái cuối là literal CSS var() bị quét nhầm vào bề mặt hiển thị.
const laMauMa = (khoa) => khoa.startsWith('_') || khoa.endsWith('$') || khoa.includes('var(--')
const khoaMauMa = Object.keys(banDo).filter(laMauMa)
if (khoaMauMa.length) {
  console.error(
    `dich-chuoi-vendor: DỪNG — ${khoaMauMa.length} khoá trong src/board/vi.json khớp mẫu mã ` +
      '(bắt đầu bằng "_", kết thúc bằng "$", hoặc chứa "var(--"). Đây là tên định danh nội bộ ' +
      '(field Lit signal, literal CSS var()), không phải chữ hiển thị:',
  )
  khoaMauMa.forEach((k) => console.error(`   "${k}"`))
  process.exit(1)
}
```

- [ ] **Step 4: Chạy test, xác nhận XANH**

Run: `npx vitest run src/__tests__/vendor-dich-chuoi-vendor.spec.ts`

Expected: PASS toàn bộ 4 ca.

- [ ] **Step 5: Chạy `npx tsc --noEmit`, xác nhận exit 0**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add scripts/dich-chuoi-vendor.mjs src/__tests__/vendor-dich-chuoi-vendor.spec.ts
git commit -m "P1-E Task 2: Cổng mẫu mã — lưới chắn ba dòng cho khoá dạng mã"
```

---

### Task 3: Cổng 4 — dây bẫy quét ngược

**Files:**
- Create: `scripts/kiem-quan-he-dich.mjs`
- Create: `scripts/kiem-quan-he-dich.d.mts`
- Create: `src/__tests__/vendor-quan-he-dich.spec.ts`
- Modify: `scripts/dich-chuoi-vendor.mjs` (nối Cổng 4 vào, sau vòng duyệt cây, trước Cổng 3)

**Interfaces:**
- Consumes: `dietJs` từ `scripts/duyet-cay-js.mjs` (đã có).
- Produces: `THUOC_TINH_CON_GIU: Set<string>`, `diemTieuThuTrongFile(js, tenFile): DiemTieuThu[]`,
  `kiemTienTo(banDo, banDoTienTo): ViPhamTienTo[]`. Task 4 dùng `kiemTienTo`. Task 6/7/8 không gọi
  trực tiếp — chúng chỉ chịu tác động của Cổng 4 khi soạn nội dung.

`DiemTieuThu` có hình dạng `{ file: string, dong: number, dang: string, thuocTinh: string }`.

#### 3.1 Đo bản khai — đã đo tại thời điểm viết kế hoạch này

Quét toàn bộ `.vendor-build/` (2.550 file `.js`) tìm mọi chỗ một trong năm tên `tooltip`, `label`,
`description`, `caption`, `placeholder` bị đọc lại làm khoá tra cứu (`X[e]`), vế so sánh
(`e === …`/`e !== …`), đối số của `.includes()`/`.indexOf()`/`.has()`/`.lastIndexOf()`, hoặc biểu
thức `switch (e)`. Kết quả — **đúng 4 chỗ**, cả 4 đều ở `===`:

```
affine/components/src/toolbar/utils.js:50              [so-sánh · label]        selectedName === item.label
affine/components/src/view-dropdown-menu/dropdown-menu.js:114  [so-sánh · label]  label === viewType
affine/shared/src/utils/file/filesys.js:175             [so-sánh · description]  i.description === acceptType
affine/shared/src/utils/file/filesys.js:205             [so-sánh · description]  i.description === acceptType
```

Hai chỗ `label` là so sánh làm nổi bật mục đang chọn trong một menu (hiệu ứng CSS, không phải tra
cứu dữ liệu) — dịch `label` không làm nó hỏng chức năng, chỉ có thể làm mất hiệu ứng "đang chọn"
nếu `selectedName`/`viewType` được truyền vào từ nơi khác bằng chuỗi tiếng Anh cũ; đo được không có
caller nào làm vậy trong cây hiện tại (grep `selectedName =` chỉ có một chỗ gán trong chính file
đó). Hai chỗ `description` chính là mối nối `Images`/`MindMap` đã ghi ở Global Constraints — đã xử
bằng cách KHÔNG thêm hai khoá đó, không phải bằng cổng này.

Cổng 4 **không phán xét** các chỗ này — nó chỉ ghim đúng bốn toạ độ trên. Nếu số lượng hoặc vị trí
đổi (thượng nguồn thêm một chỗ tương tự, hoặc bốn chỗ này biến mất), cổng đỏ và người sửa phải tự
đánh giá lại — không có kết luận sẵn "an toàn" hay "nguy hiểm" được mã hoá cứng.

- [ ] **Step 1: Viết test RED cho `diemTieuThuTrongFile`**

Tạo `src/__tests__/vendor-quan-he-dich.spec.ts`:

```typescript
// Cổng 4 của D12 — dây bẫy quét NGƯỢC. Câu hỏi không phải "chuỗi này có ở vị trí định danh
// không" (quét literal, mù trước khoá không nháy như `Italic: {...}`) mà là "ở đâu một giá trị
// hiển thị bị TIÊU THỤ làm dữ liệu" — quét từ phía đọc, không phải từ phía chuỗi.
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { dietJs } from '../../scripts/duyet-cay-js.mjs'
import {
  BAN_KHAI_TIEU_THU,
  diemTieuThuTrongFile,
  kiemTienTo,
  THUOC_TINH_CON_GIU,
} from '../../scripts/kiem-quan-he-dich.mjs'

describe('THUOC_TINH_CON_GIU', () => {
  it('đúng 5 tên, khớp với THUOC_TINH_HIEN_THI của luat-vi-tri-dich.mjs', () => {
    expect([...THUOC_TINH_CON_GIU].sort()).toEqual(
      ['caption', 'description', 'label', 'placeholder', 'tooltip'].sort(),
    )
  })
})

describe('diemTieuThuTrongFile — bốn hình dạng tiêu thụ', () => {
  it('tra khoá: bang[label]', () => {
    const ra = diemTieuThuTrongFile(`const t = bang[item.label];`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'tra-khoá', thuocTinh: 'label' }])
  })

  it('so sánh: x.description === y', () => {
    const ra = diemTieuThuTrongFile(`if (i.description === acceptType) {}`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'so-sánh', thuocTinh: 'description' }])
  })

  it('so sánh: y === x.tooltip (vế trái là biến, vế phải là property access)', () => {
    const ra = diemTieuThuTrongFile(`if (selectedName === item.tooltip) {}`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'so-sánh', thuocTinh: 'tooltip' }])
  })

  it('includes(): [...].includes(i.caption)', () => {
    const ra = diemTieuThuTrongFile(`['A','B'].includes(i.caption)`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'includes()', thuocTinh: 'caption' }])
  })

  it('switch: switch (item.placeholder)', () => {
    const ra = diemTieuThuTrongFile(`switch (item.placeholder) { case 'x': break; }`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'switch', thuocTinh: 'placeholder' }])
  })

  it('sau destructure: const { label } = config; bang[label]', () => {
    const ra = diemTieuThuTrongFile(`const { label } = config; const t = bang[label];`, 'thu.js')
    expect(ra).toEqual([{ file: 'thu.js', dong: 1, dang: 'tra-khoá', thuocTinh: 'label' }])
  })

  it('tên KHÔNG trong THUOC_TINH_CON_GIU thì không bắt — ca đối chứng', () => {
    // `name` từng ở trong danh sách hiển thị nhưng đã bị Task 1 gỡ; module này chỉ quan tâm 5 tên
    // CÒN GIỮ, nên name/group/title/text không thuộc phạm vi của cổng này (chúng vĩnh viễn không
    // được dịch, nên không cần dây bẫy).
    const ra = diemTieuThuTrongFile(`if (item.name === 'Divider') {}`, 'thu.js')
    expect(ra).toEqual([])
  })

  it('ghi đúng số dòng khi tiêu thụ nằm ở dòng thứ hai', () => {
    const ra = diemTieuThuTrongFile(`const a = 1;\nif (i.description === x) {}`, 'thu.js')
    expect(ra[0].dong).toBe(2)
  })
})

describe('BAN_KHAI_TIEU_THU — bản khai được ghim, đúng khuôn bang-bam-vendor.json của D11', () => {
  it('có đúng 4 mục, đúng toạ độ đã đo 2026-08-15', () => {
    expect(BAN_KHAI_TIEU_THU).toEqual([
      {
        file: 'affine/components/src/toolbar/utils.js',
        dong: 50,
        dang: 'so-sánh',
        thuocTinh: 'label',
      },
      {
        file: 'affine/components/src/view-dropdown-menu/dropdown-menu.js',
        dong: 114,
        dang: 'so-sánh',
        thuocTinh: 'label',
      },
      {
        file: 'affine/shared/src/utils/file/filesys.js',
        dong: 175,
        dang: 'so-sánh',
        thuocTinh: 'description',
      },
      {
        file: 'affine/shared/src/utils/file/filesys.js',
        dong: 205,
        dang: 'so-sánh',
        thuocTinh: 'description',
      },
    ])
  })
})

describe('kiemTienTo — tính nhất quán tiền tố', () => {
  const TIEN_TO = { 'Drag/Click to insert ': 'Kéo/Bấm để chèn ' }

  it('rỗng khi mọi bản dịch bắt đầu đúng tiền tố', () => {
    const banDo = { 'Drag/Click to insert Quote': 'Kéo/Bấm để chèn Trích dẫn' }
    expect(kiemTienTo(banDo, TIEN_TO)).toEqual([])
  })

  it('báo vi phạm khi một bản dịch không bắt đầu bằng bản dịch của tiền tố', () => {
    const banDo = { 'Drag/Click to insert Quote': 'Trích dẫn (kéo hoặc bấm)' }
    expect(kiemTienTo(banDo, TIEN_TO)).toEqual([
      {
        khoa: 'Drag/Click to insert Quote',
        tienTo: 'Drag/Click to insert ',
        banDichKhoa: 'Trích dẫn (kéo hoặc bấm)',
        banDichTienTo: 'Kéo/Bấm để chèn ',
      },
    ])
  })

  it('khoá KHÔNG bắt đầu bằng tiền tố tiếng Anh thì không bị xét', () => {
    const banDo = { Quote: 'Trích dẫn' }
    expect(kiemTienTo(banDo, TIEN_TO)).toEqual([])
  })

  it('không tự xét chính khoá tiền tố với chính nó', () => {
    const banDo = { 'Drag/Click to insert ': 'Kéo/Bấm để chèn ' }
    expect(kiemTienTo(banDo, TIEN_TO)).toEqual([])
  })
})

describe('Cổng 4 — cổng độc lập trên đầu ra thật', () => {
  it('không có điểm tiêu thụ nào ngoài bản khai, trên toàn bộ .vendor-build/', async () => {
    const phatHien: { file: string; dong: number; dang: string; thuocTinh: string }[] = []
    for await (const f of dietJs('.vendor-build')) {
      const src = readFileSync(f, 'utf8')
      const rel = path.relative('.vendor-build', f).split(path.sep).join('/')
      phatHien.push(...diemTieuThuTrongFile(src, rel))
    }
    const sap = (ds: typeof phatHien) =>
      [...ds].sort((a, b) => `${a.file}:${a.dong}`.localeCompare(`${b.file}:${b.dong}`))
    expect(sap(phatHien)).toEqual(sap(BAN_KHAI_TIEU_THU))
  }, 60_000)
})
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npx vitest run src/__tests__/vendor-quan-he-dich.spec.ts`

Expected: FAIL với `Cannot find module '../../scripts/kiem-quan-he-dich.mjs'` — module chưa tồn tại.

- [ ] **Step 3: Viết `scripts/kiem-quan-he-dich.mjs`**

```javascript
// Cổng 4 và Cổng 5 của D12 — hai cổng hỏi về QUAN HỆ giữa các chuỗi, không phải vị trí của MỘT
// chuỗi (đó là việc của luat-vi-tri-dich.mjs).
//
// CỔNG 4 — dây bẫy quét ngược. Ba bản spec đầu của chặng này quét theo chiều "chuỗi này có ở vị
// trí định danh không" — tức tìm STRING LITERAL. Nhưng mối nối chỉ cần MỘT đầu là literal; đầu
// kia thường là biến sau destructure, phần tử mảng, hay khoá object KHÔNG NHÁY (`Italic: {...}`).
// Bảng tooltip của BlockSuite trộn khoá có nháy với khoá không nháy trong CÙNG một object, nên
// bất kỳ danh sách nào dựng từ phép quét literal cũng thủng một nửa mà trông vẫn đầy đủ.
//
// Câu hỏi ĐÚNG: "ở đâu một giá trị hiển thị bị TIÊU THỤ làm dữ liệu" — quét từ phía ĐỌC, không
// phải từ phía chuỗi. Đo trên .vendor-build/ 2026-08-15, giới hạn 5 tên còn trong danh sách hiển
// thị sau Task 1 của chặng này (tooltip/label/description/caption/placeholder — 4 tên còn lại,
// name/group/title/text, đã bị loại khỏi danh sách hiển thị nên KHÔNG cần dây bẫy: chúng vĩnh
// viễn không được dịch): đúng 4 chỗ, xem BAN_KHAI_TIEU_THU.
//
// Không phải cổng CHẶN KHOÁ — nó không biết gì về vi.json. Nó là dây bẫy CƠ CHẾ: nếu bốn toạ độ
// này đổi (thượng nguồn thêm một chỗ mới, hay bốn chỗ cũ biến mất), cổng đỏ và người sửa phải tự
// đánh giá — không có phán quyết "an toàn/nguy hiểm" được mã hoá cứng ở đây.
//
// CỔNG 5 — tính nhất quán tiền tố. Lớp lỗi khác hẳn: PHẪU THUẬT CHUỖI trên một literal ĐÃ dịch.
// affine/gfx/note/src/toolbar/note-menu-config.js:118 dựng tooltip bằng
// `item.tooltip.replace('Drag/Click to insert ', '')` — cắt tiền tố khỏi chính literal mà D12 sẽ
// dịch. Nếu tiền tố tiếng Anh không được dịch ĐỒNG BỘ với các chuỗi nó cắt, `.replace()` hết khớp
// sau khi bản dịch kia đã đổi, và tooltip hiện nguyên câu dài thay vì phần đã cắt.
import ts from 'typescript'

export const THUOC_TINH_CON_GIU = new Set(['tooltip', 'label', 'description', 'caption', 'placeholder'])

function mangGiaTriHienThi(node) {
  if (!node) return null
  if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
    return THUOC_TINH_CON_GIU.has(node.name.text) ? node.name.text : null
  }
  if (node.kind === ts.SyntaxKind.Identifier) {
    return THUOC_TINH_CON_GIU.has(node.text) ? node.text : null
  }
  return null
}

export function diemTieuThuTrongFile(js, tenFile = 'khong-ten.js') {
  const sf = ts.createSourceFile(tenFile, js, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
  const ra = []
  const ghi = (node, dang, thuocTinh) => {
    const dau = node.getStart(sf)
    ra.push({
      file: tenFile,
      dong: sf.getLineAndCharacterOfPosition(dau).line + 1,
      dang,
      thuocTinh,
    })
  }
  const di = (n) => {
    if (n.kind === ts.SyntaxKind.ElementAccessExpression) {
      const tt = mangGiaTriHienThi(n.argumentExpression)
      if (tt) ghi(n, 'tra-khoá', tt)
    }
    if (
      n.kind === ts.SyntaxKind.BinaryExpression &&
      ['===', '!==', '==', '!='].includes(n.operatorToken.getText(sf))
    ) {
      const tt = mangGiaTriHienThi(n.left) ?? mangGiaTriHienThi(n.right)
      if (tt) ghi(n, 'so-sánh', tt)
    }
    if (
      n.kind === ts.SyntaxKind.CallExpression &&
      n.expression.kind === ts.SyntaxKind.PropertyAccessExpression
    ) {
      const ten = n.expression.name.text
      if (['includes', 'indexOf', 'has', 'lastIndexOf'].includes(ten) && n.arguments.length) {
        const tt = mangGiaTriHienThi(n.arguments[0])
        if (tt) ghi(n, `${ten}()`, tt)
      }
    }
    if (n.kind === ts.SyntaxKind.SwitchStatement) {
      const tt = mangGiaTriHienThi(n.expression)
      if (tt) ghi(n, 'switch', tt)
    }
    ts.forEachChild(n, di)
  }
  di(sf)
  return ra
}

// Bản khai được ghim — đúng khuôn bang-bam-vendor.json của D11: khai thứ đã soi, để cổng gào khi
// thực tế lệch. Đo 2026-08-15, xem chi tiết ở docs/superpowers/plans/2026-08-15-noi-dung-dich.md
// Task 3.
export const BAN_KHAI_TIEU_THU = [
  { file: 'affine/components/src/toolbar/utils.js', dong: 50, dang: 'so-sánh', thuocTinh: 'label' },
  {
    file: 'affine/components/src/view-dropdown-menu/dropdown-menu.js',
    dong: 114,
    dang: 'so-sánh',
    thuocTinh: 'label',
  },
  {
    file: 'affine/shared/src/utils/file/filesys.js',
    dong: 175,
    dang: 'so-sánh',
    thuocTinh: 'description',
  },
  {
    file: 'affine/shared/src/utils/file/filesys.js',
    dong: 205,
    dang: 'so-sánh',
    thuocTinh: 'description',
  },
]

// Cổng 5. Với mỗi khoá tiền tố P (từ banDoTienTo) và mỗi khoá K trong banDo bắt đầu bằng P (khác
// chính P), bản dịch của K phải bắt đầu bằng bản dịch của P — nếu không thì .replace(bản dịch
// của P, '') ở phía tiêu thụ sẽ không cắt được gì.
export function kiemTienTo(banDo, banDoTienTo) {
  const viPham = []
  for (const [tienToEn, tienToVi] of Object.entries(banDoTienTo)) {
    if (typeof tienToVi !== 'string') continue
    for (const [khoa, vi] of Object.entries(banDo)) {
      if (typeof vi !== 'string') continue
      if (khoa === tienToEn) continue
      if (khoa.startsWith(tienToEn) && !vi.startsWith(tienToVi)) {
        viPham.push({ khoa, tienTo: tienToEn, banDichKhoa: vi, banDichTienTo: tienToVi })
      }
    }
  }
  return viPham
}
```

- [ ] **Step 4: Viết `scripts/kiem-quan-he-dich.d.mts`**

```typescript
// Khai kiểu cho scripts/kiem-quan-he-dich.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.

export declare const THUOC_TINH_CON_GIU: Set<string>

export interface DiemTieuThu {
  file: string
  dong: number
  dang: string
  thuocTinh: string
}

export declare function diemTieuThuTrongFile(js: string, tenFile?: string): DiemTieuThu[]

export declare const BAN_KHAI_TIEU_THU: DiemTieuThu[]

export interface ViPhamTienTo {
  khoa: string
  tienTo: string
  banDichKhoa: string
  banDichTienTo: string
}

export declare function kiemTienTo(
  banDo: Record<string, string>,
  banDoTienTo: Record<string, string>,
): ViPhamTienTo[]
```

- [ ] **Step 5: Chạy test, xác nhận XANH**

Run: `npx vitest run src/__tests__/vendor-quan-he-dich.spec.ts`

Expected: PASS toàn bộ, gồm ca "cổng độc lập trên đầu ra thật" — ca này duyệt cả 2.550 file, có thể
mất vài giây.

- [ ] **Step 6: Nối Cổng 4 vào `dich-chuoi-vendor.mjs`**

Trong `scripts/dich-chuoi-vendor.mjs`, thêm import ở đầu file (sau dòng 15 `import { dichMotFile }
from './luat-vi-tri-dich.mjs'`):

```javascript
import { BAN_KHAI_TIEU_THU, diemTieuThuTrongFile } from './kiem-quan-he-dich.mjs'
```

Trong vòng lặp `for await (const f of dietJs(BUILD))` (dòng 129-152), thêm việc thu thập điểm tiêu
thụ. Sửa khối này thành:

```javascript
const diemTieuThu = []

for await (const f of dietJs(BUILD)) {
  const goc = readFileSync(f, 'utf8')
  const rel = path.relative(BUILD, f).split(path.sep).join('/')

  // ─── Cổng 2: file không phân tích được ───────────────────────────────────────────────────
  // dichMotFile ném lỗi; không bắt để nuốt. Bỏ qua một file là mất bản dịch của cả một widget
  // mà không cổng nào bắt được.
  let ketQua
  try {
    ketQua = dichMotFile(goc, banDo, rel)
  } catch (err) {
    console.error(`dich-chuoi-vendor: DỪNG — ${err.message}`)
    process.exit(1)
  }

  // Cổng 4 — quét trên bản gốc TRƯỚC khi dịch: các dạng tiêu thụ (X[e], e===, includes, switch)
  // đọc TÊN THUỘC TÍNH (item.label, i.description...), không đọc GIÁ TRỊ literal — nên bản dịch
  // đã chạy hay chưa không ảnh hưởng kết quả quét. Quét trên `goc` để không phụ thuộc thứ tự với
  // dichMotFile phía trên.
  diemTieuThu.push(...diemTieuThuTrongFile(goc, rel))

  if (ketQua.cacLuot.length === 0) continue

  for (const l of ketQua.cacLuot) {
    theoKhoa[l.chuoiGoc].push({ file: rel, viTri: l.viTri, dong: l.dong, chuoiDich: l.chuoiDich })
    tongLuot++
  }
  writeFileSync(f, ketQua.js)
  soFile++
}
```

Sau khối Cổng 3 (khoá chết, kết thúc ở dòng 169), thêm Cổng 4:

```javascript
// ─── Cổng 4: dây bẫy quét ngược ─────────────────────────────────────────────────────────────
// Không phải cổng chặn khoá — nó không đọc vi.json. Nó DỪNG khi tập điểm tiêu thụ thật sự đo
// được TRÊN CÂY THẬT lệch khỏi BAN_KHAI_TIEU_THU đã ghim trong kiem-quan-he-dich.mjs — thêm một
// chỗ, bớt một chỗ, hay đổi file/dòng đều đỏ. Đúng khuôn bang-bam-vendor.json của D11: khai thứ
// đã soi, để cổng gào khi thượng nguồn đổi.
const sapXep = (ds) => [...ds].sort((a, b) => `${a.file}:${a.dong}`.localeCompare(`${b.file}:${b.dong}`))
const thucTe = sapXep(diemTieuThu)
const khaiBao = sapXep(BAN_KHAI_TIEU_THU)
const lechTieuThu = JSON.stringify(thucTe) !== JSON.stringify(khaiBao)
if (lechTieuThu) {
  console.error(
    `dich-chuoi-vendor: DỪNG — tập điểm tiêu thụ giá trị hiển thị đo được trên cây THẬT SỰ khác ` +
      'bản khai được ghim ở scripts/kiem-quan-he-dich.mjs (BAN_KHAI_TIEU_THU). Nghĩa là thượng ' +
      'nguồn đã thêm/bớt một chỗ đọc lại tooltip/label/description/caption/placeholder làm khoá ' +
      'tra cứu hay vế so sánh — chỗ đó CẦN NGƯỜI ĐỌC, không tự động kết luận an toàn hay nguy hiểm:',
  )
  console.error('   ĐO ĐƯỢC (' + thucTe.length + ' chỗ):')
  thucTe.forEach((d) => console.error(`     ${d.file}:${d.dong}  [${d.dang} · ${d.thuocTinh}]`))
  console.error('   BẢN KHAI (' + khaiBao.length + ' chỗ):')
  khaiBao.forEach((d) => console.error(`     ${d.file}:${d.dong}  [${d.dang} · ${d.thuocTinh}]`))
  console.error(
    '   Nếu chỗ mới thật sự an toàn (không phải lớp lỗi §3.1 của spec P1-E): cập nhật ' +
      'BAN_KHAI_TIEU_THU trong scripts/kiem-quan-he-dich.mjs. Nếu KHÔNG an toàn: gỡ khoá liên ' +
      'quan khỏi src/board/vi.json hoặc bỏ tên thuộc tính khỏi THUOC_TINH_HIEN_THI.',
  )
  process.exit(1)
}
```

- [ ] **Step 7: Chạy lại test cổng độc lập lẫn `npm test` toàn bộ**

Run: `npx vitest run src/__tests__/vendor-quan-he-dich.spec.ts src/__tests__/vendor-dich.spec.ts`

Expected: PASS.

- [ ] **Step 8: Bằng chứng đỏ thật — chạy `dichchuoi:vendor` sau khi cố tình đổi bản khai**

Trong `scripts/kiem-quan-he-dich.mjs`, tạm sửa `dong: 50` thành `dong: 51` ở mục đầu tiên của
`BAN_KHAI_TIEU_THU`, rồi:

Run: `npm run dichchuoi:vendor`

Expected: DỪNG, in ra thông báo "tập điểm tiêu thụ ... khác bản khai được ghim", liệt kê đúng dòng
50 (đo được) khác dòng 51 (khai sai). Chép nguyên văn output vào báo cáo Task 3. Sau đó **hoàn lại**
`dong: 50` và chạy lại `npm run dung:vendor` để dựng lại cây sạch cho task sau.

- [ ] **Step 9: Chạy `npx tsc --noEmit`, xác nhận exit 0**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 10: Commit**

```bash
git add scripts/kiem-quan-he-dich.mjs scripts/kiem-quan-he-dich.d.mts scripts/dich-chuoi-vendor.mjs \
  src/__tests__/vendor-quan-he-dich.spec.ts
git commit -m "P1-E Task 3: Cổng 4 — dây bẫy quét ngược, bản khai ghim 4 chỗ"
```

---

### Task 4: `vi-tien-to.json` + thay trọn cây + Cổng 5

**Files:**
- Create: `src/board/vi-tien-to.json`
- Modify: `scripts/luat-vi-tri-dich.mjs` (thêm `thayTrenToanCay`)
- Modify: `scripts/luat-vi-tri-dich.d.mts`
- Modify: `scripts/dich-chuoi-vendor.mjs` (nạp `vi-tien-to.json`, chạy pha "thay trọn cây", gọi
  `kiemTienTo`)
- Modify: `scripts/kiem-dist.mjs` (cộng `vi-tien-to.json` vào luật C — `N/N có mặt`)
- Modify: `src/__tests__/vendor-dich.spec.ts` (thêm ca cho `thayTrenToanCay`)

**Interfaces:**
- Consumes: `kiemTienTo` từ Task 3.
- Produces: `thayTrenToanCay(js, banDoTienTo, tenFile): { js, cacLuot }` — cùng hình dạng
  `dichMotFile`, nhưng không lọc vị trí. Task 7 dùng gián tiếp qua pipeline khi soạn nội dung Đợt 2.

- [ ] **Step 1: Viết test RED cho `thayTrenToanCay`**

Trong `src/__tests__/vendor-dich.spec.ts`, thêm import `thayTrenToanCay` vào dòng import đã có
(dòng 13-19), rồi thêm khối mới ở cuối file:

```typescript
describe('thayTrenToanCay — thay MỌI vị trí, dùng cho khoá tiền tố', () => {
  const TIEN_TO = { 'Drag/Click to insert ': 'Kéo/Bấm để chèn ' }

  it('thay literal ở vị trí đối số .replace() — vị trí KHÔNG nằm trong danh sách hiển thị', () => {
    const ra = thayTrenToanCay(
      `item.tooltip.replace('Drag/Click to insert ', '')`,
      TIEN_TO,
      'thu.js',
    ).js
    expect(ra).toContain('Kéo/Bấm để chèn ')
    expect(ra).not.toContain('Drag/Click to insert')
  })

  it('không đụng khoá không khớp', () => {
    const ra = thayTrenToanCay(`const a = 'Style'`, TIEN_TO, 'thu.js').js
    expect(ra).toBe(`const a = 'Style'`)
  })

  it('giá trị không phải chuỗi thì DỪNG bằng lỗi', () => {
    expect(() =>
      thayTrenToanCay(
        `const a = 'Drag/Click to insert '`,
        { 'Drag/Click to insert ': 42 } as unknown as Record<string, string>,
        'thu.js',
      ),
    ).toThrow(/KHÔNG PHẢI CHUỖI/)
  })

  it('báo cáo lượt thay đúng chuoiGoc/chuoiDich', () => {
    const { cacLuot } = thayTrenToanCay(`const a = 'Drag/Click to insert '`, TIEN_TO, 'thu.js')
    expect(cacLuot).toEqual([
      { chuoiGoc: 'Drag/Click to insert ', chuoiDich: 'Kéo/Bấm để chèn ' },
    ])
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận ĐỎ**

Run: `npx vitest run src/__tests__/vendor-dich.spec.ts`

Expected: FAIL — `thayTrenToanCay` chưa được export từ `luat-vi-tri-dich.mjs`.

- [ ] **Step 3: Thêm `thayTrenToanCay` vào `scripts/luat-vi-tri-dich.mjs`**

Thêm vào cuối file (sau `export function dichMotFile`, dòng 191):

```javascript
// Thay MỌI lượt xuất hiện của khoá, KHÔNG lọc theo vị trí. Dùng riêng cho src/board/vi-tien-to.json
// — khoá của nó ('Drag/Click to insert ') là ĐỐI SỐ của .replace() trong
// affine/gfx/note/src/toolbar/note-menu-config.js:118, một vị trí CỐ TÌNH không nằm trong danh
// sách hiển thị (đối số hàm thường không phải chữ cho người dùng đọc TRỰC TIẾP). Nhưng chuỗi này
// phải đổi ĐỒNG BỘ với các literal `tooltip: '...'` mà nó cắt tiền tố — nếu không, sau khi các
// literal đó đã dịch, .replace(tiền tố tiếng Anh, '') không còn khớp gì và tooltip hiện nguyên
// câu dài. Xem spec P1-E §3.7/§4.4 và kế hoạch Task 4.
//
// Dùng lại đúng phép bảo vệ của dichMotFile (Object.hasOwn chống chuỗi prototype, kiểm kiểu
// chuỗi, kiểm cú pháp trước khi duyệt) — hai hàm khác MỤC ĐÍCH lọc vị trí nhưng CÙNG rủi ro dữ
// liệu đầu vào, nên cùng một bộ vá.
export function thayTrenToanCay(js, banDoTienTo, tenFile = 'khong-ten.js') {
  const sf = ts.createSourceFile(tenFile, js, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)

  if (!Array.isArray(sf.parseDiagnostics)) {
    throw new Error(
      'luat-vi-tri-dich: sf.parseDiagnostics không còn là mảng (thayTrenToanCay) — xem ghi chú ' +
        'tương tự trong dichMotFile.',
    )
  }
  if (sf.parseDiagnostics.length > 0) {
    throw new Error(
      `luat-vi-tri-dich: không phân tích được ${tenFile} (thayTrenToanCay) — ` +
        `${sf.parseDiagnostics.length} lỗi cú pháp.`,
    )
  }

  const thay = []
  const di = (n) => {
    if (
      n.kind === ts.SyntaxKind.StringLiteral ||
      n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      if (Object.hasOwn(banDoTienTo, n.text)) {
        const vi = banDoTienTo[n.text]
        if (typeof vi !== 'string') {
          throw new Error(
            `luat-vi-tri-dich: khoá tiền tố "${n.text}" có giá trị KHÔNG PHẢI CHUỖI (kiểu ` +
              `${vi === null ? 'null' : typeof vi}), gặp ở ${tenFile}.`,
          )
        }
        thay.push({ dau: n.getStart(sf), cuoi: n.getEnd(), chuoiGoc: n.text, chuoiDich: vi })
      }
    }
    ts.forEachChild(n, di)
  }
  di(sf)

  let ra = js
  for (const t of [...thay].sort((a, b) => b.dau - a.dau)) {
    ra = ra.slice(0, t.dau) + JSON.stringify(t.chuoiDich) + ra.slice(t.cuoi)
  }

  return {
    js: ra,
    cacLuot: thay.sort((a, b) => a.dau - b.dau).map(({ chuoiGoc, chuoiDich }) => ({ chuoiGoc, chuoiDich })),
  }
}
```

- [ ] **Step 4: Thêm khai kiểu vào `scripts/luat-vi-tri-dich.d.mts`**

Thêm vào cuối file:

```typescript
export interface LuotTrenToanCay {
  chuoiGoc: string
  chuoiDich: string
}

export declare function thayTrenToanCay(
  js: string,
  banDoTienTo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: LuotTrenToanCay[] }
```

- [ ] **Step 5: Chạy test, xác nhận XANH**

Run: `npx vitest run src/__tests__/vendor-dich.spec.ts`

Expected: PASS.

- [ ] **Step 6: Tạo `src/board/vi-tien-to.json`**

```json
{
  "Drag/Click to insert ": "Kéo/Bấm để chèn "
}
```

- [ ] **Step 7: Nối vào `scripts/dich-chuoi-vendor.mjs`**

Thêm import (sau dòng import `dichMotFile`):

```javascript
import { thayTrenToanCay } from './luat-vi-tri-dich.mjs'
```

(gộp vào cùng dòng import đã sửa ở Task 3 nếu tiện: `import { dichMotFile, thayTrenToanCay } from
'./luat-vi-tri-dich.mjs'`)

Sau khối nạp `banDo` (dòng 45) và TRƯỚC Cổng 0, thêm nạp `banDoTienTo`:

```javascript
const banDoTienTo = JSON.parse(readFileSync(path.join(GOC, 'src/board/vi-tien-to.json'), 'utf8'))

// Cổng 0 cho bản đồ tiền tố — cùng hình dạng với Cổng 0 của banDo, nhưng KHÔNG cấm rỗng: batch
// sau có thể không cần thêm tiền tố mới. Vẫn cấm sai hình dạng và giá trị không phải chuỗi không
// rỗng, vì đó là lỗi soạn file bất kể có bao nhiêu mục.
if (banDoTienTo === null || typeof banDoTienTo !== 'object' || Array.isArray(banDoTienTo)) {
  console.error(
    'dich-chuoi-vendor: DỪNG — src/board/vi-tien-to.json phải là một object phẳng ' +
      '{ "English": "Tiếng Việt" }.',
  )
  process.exit(1)
}
const saiKieuTienTo = Object.entries(banDoTienTo).filter(
  ([, vi]) => typeof vi !== 'string' || vi.trim() === '',
)
if (saiKieuTienTo.length) {
  console.error(
    'dich-chuoi-vendor: DỪNG — src/board/vi-tien-to.json có bản dịch không phải chuỗi hoặc rỗng:',
  )
  saiKieuTienTo.forEach(([en]) => console.error(`   "${en}"`))
  process.exit(1)
}
```

Thêm Cổng 5 (kiểm tiền tố) — sau khối trên, TRƯỚC vòng lặp `for await`:

```javascript
import { kiemTienTo } from './kiem-quan-he-dich.mjs'
// (gộp vào dòng import đã thêm ở Task 3: import { BAN_KHAI_TIEU_THU, diemTieuThuTrongFile,
// kiemTienTo } from './kiem-quan-he-dich.mjs')

// ─── Cổng 5: tính nhất quán tiền tố ──────────────────────────────────────────────────────────
const viPhamTienTo = kiemTienTo(banDo, banDoTienTo)
if (viPhamTienTo.length) {
  console.error(
    `dich-chuoi-vendor: DỪNG — ${viPhamTienTo.length} bản dịch trong src/board/vi.json không bắt ` +
      'đầu bằng bản dịch của tiền tố tương ứng trong src/board/vi-tien-to.json. Chuỗi mẫu bị cắt ' +
      'lúc chạy (.replace(tiền tố, "")) sẽ không còn khớp gì, và phần chưa-cắt hiện nguyên vẹn ' +
      'thay vì phần đã cắt:',
  )
  viPhamTienTo.forEach((v) =>
    console.error(
      `   "${v.khoa}" → "${v.banDichKhoa}" (phải bắt đầu bằng "${v.banDichTienTo}", ` +
        `tiền tố "${v.tienTo}")`,
    ),
  )
  process.exit(1)
}
```

Sửa vòng lặp `for await` để chạy thêm pha "thay trọn cây" ngay sau `dichMotFile`, và cộng lượt vào
báo cáo. Sửa đoạn vòng lặp đã có ở Task 3 Step 6 thành:

```javascript
const diemTieuThu = []
const theoKhoaTienTo = Object.fromEntries(Object.keys(banDoTienTo).map((k) => [k, []]))
let tongLuotTienTo = 0

for await (const f of dietJs(BUILD)) {
  const goc = readFileSync(f, 'utf8')
  const rel = path.relative(BUILD, f).split(path.sep).join('/')

  let ketQua
  try {
    ketQua = dichMotFile(goc, banDo, rel)
  } catch (err) {
    console.error(`dich-chuoi-vendor: DỪNG — ${err.message}`)
    process.exit(1)
  }

  diemTieuThu.push(...diemTieuThuTrongFile(goc, rel))

  let jsSauTienTo = ketQua.js
  let coDoiTienTo = false
  if (Object.keys(banDoTienTo).length) {
    let ketQuaTienTo
    try {
      ketQuaTienTo = thayTrenToanCay(ketQua.js, banDoTienTo, rel)
    } catch (err) {
      console.error(`dich-chuoi-vendor: DỪNG — ${err.message}`)
      process.exit(1)
    }
    jsSauTienTo = ketQuaTienTo.js
    if (ketQuaTienTo.cacLuot.length) {
      coDoiTienTo = true
      for (const l of ketQuaTienTo.cacLuot) {
        theoKhoaTienTo[l.chuoiGoc].push({ file: rel })
        tongLuotTienTo++
      }
    }
  }

  if (ketQua.cacLuot.length === 0 && !coDoiTienTo) continue

  for (const l of ketQua.cacLuot) {
    theoKhoa[l.chuoiGoc].push({ file: rel, viTri: l.viTri, dong: l.dong, chuoiDich: l.chuoiDich })
    tongLuot++
  }
  writeFileSync(f, jsSauTienTo)
  soFile++
}
```

Cổng 3 (khoá chết) hiện chỉ xét `theoKhoa` (của `banDo`) — thêm đoạn tương tự cho `banDoTienTo` NGAY
SAU khối Cổng 3 đã có (sau dòng 169, trước Cổng 4 mới thêm ở Task 3):

```javascript
// ─── Cổng 3b: khoá tiền tố chết ─────────────────────────────────────────────────────────────
const khoaTienToChet = Object.entries(theoKhoaTienTo).filter(([, v]) => v.length === 0).map(([k]) => k)
if (khoaTienToChet.length) {
  console.error(
    `dich-chuoi-vendor: DỪNG — ${khoaTienToChet.length} khoá trong src/board/vi-tien-to.json ` +
      'không tìm thấy chỗ nào trong cây để thay:',
  )
  khoaTienToChet.forEach((k) => console.error(`   "${k}"`))
  process.exit(1)
}
```

Cuối cùng, cập nhật dòng `console.log` tổng kết (dòng 178-181) để báo cả lượt tiền tố:

```javascript
console.log(
  `dich-chuoi-vendor: ${soFile} file đã sửa · ${tongLuot} lượt dịch · ${tongLuotTienTo} lượt ` +
    `tiền tố · ${Object.keys(banDo).length} khoá đều còn sống · ` +
    `báo cáo: ${path.relative(GOC, BAO_CAO)}`,
)
```

- [ ] **Step 8: Cộng `vi-tien-to.json` vào luật C của `kiem-dist.mjs`**

Trong `scripts/kiem-dist.mjs`, sửa khối nạp bảng dịch (dòng 64-67):

```javascript
// Luật C — bản dịch phải tới được tay người dùng. Gộp CẢ HAI file: vi.json (thay theo vị trí
// hiển thị) và vi-tien-to.json (thay trọn cây, P1-E) — cả hai đều phải "có mặt" trong dist/,
// nếu không N/N sẽ chỉ đếm một nửa sự thật.
const BAN_DO = JSON.parse(readFileSync(path.join(GOC, 'src/board/vi.json'), 'utf8'))
const BAN_DO_TIEN_TO = JSON.parse(readFileSync(path.join(GOC, 'src/board/vi-tien-to.json'), 'utf8'))
const BAN_DO_GOP = { ...BAN_DO, ...BAN_DO_TIEN_TO }
const MUC_BAN_DICH = Object.entries(BAN_DO_GOP)
const BAN_DICH = MUC_BAN_DICH.map(([, vi]) => vi)
```

Sửa lời gọi `timTrungBanDich(BAN_DO)` (dòng 124) thành `timTrungBanDich(BAN_DO_GOP)` — hai bản dịch
trùng nhau GIỮA hai file cũng phải bị bắt, không chỉ trùng trong cùng một file.

- [ ] **Step 9: Chạy toàn bộ test D12 + tsc**

Run: `npx vitest run src/__tests__/vendor-dich.spec.ts src/__tests__/vendor-quan-he-dich.spec.ts`

Expected: PASS.

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 10: Bằng chứng đỏ thật cho Cổng 5**

Tạm sửa `src/board/vi-tien-to.json` thành `{"Drag/Click to insert ": "Sai tiền tố "}`, rồi tạm thêm
một khoá thử vào `src/board/vi.json`: `"Drag/Click to insert Quote": "Trích dẫn (kéo hoặc bấm)"`.

Run: `npm run dichchuoi:vendor`

Expected: DỪNG ở Cổng 5, in đúng khoá `"Drag/Click to insert Quote"` và tiền tố kỳ vọng
`"Kéo/Bấm để chèn "`... — nhưng vì `vi-tien-to.json` đã bị sửa thành `"Sai tiền tố "`, thông báo
phải nêu `"Sai tiền tố "` là tiền tố kỳ vọng, không khớp `"Trích dẫn (kéo hoặc bấm)"`. Chép nguyên
văn output vào báo cáo. Sau đó **hoàn lại cả hai file** về trạng thái Step 6 (chỉ có khoá tiền tố
thật) và không thêm `"Drag/Click to insert Quote"` (khoá đó thuộc Đợt 2, thêm chính thức ở Task 7).

- [ ] **Step 11: Commit**

```bash
git add src/board/vi-tien-to.json scripts/luat-vi-tri-dich.mjs scripts/luat-vi-tri-dich.d.mts \
  scripts/dich-chuoi-vendor.mjs scripts/kiem-dist.mjs src/__tests__/vendor-dich.spec.ts
git commit -m "P1-E Task 4: vi-tien-to.json + thay trọn cây + Cổng 5 tiền tố"
```

---

### Task 5: Vá nợ M3 của P1-D — memo hoá `dangTrongNhay`

**Files:**
- Modify: `scripts/so-khop-ban-dich.mjs:55-61`
- Test: `src/__tests__/vendor-so-khop.spec.ts` (file có sẵn, không cần sửa — chỉ xác nhận hành vi
  không đổi)

**Interfaces:**
- Consumes: không có.
- Produces: `coNhuLiteral` giữ nguyên chữ ký và hành vi, chỉ đổi cách tính nội bộ.

Nợ M3 (spec P1-D): `coNhuLiteral` gọi `dangTrongNhay(s, nhay)` **ba lần** mỗi lượt gọi (một lần mỗi
kiểu nháy) thay vì tính một lần. Chặng này tăng số chuỗi so khớp trong `kiem-dist.mjs` lên gần 30
lần (5 → 131), nằm trong vòng lặp `O(file × chuỗi)` của luật C — đáng vá trước khi chạy `kiem:dist`
lần đầu với bộ khoá đầy đủ.

- [ ] **Step 1: Xác nhận test hiện có PASS trước khi sửa (bảo toàn hành vi)**

Run: `npx vitest run src/__tests__/vendor-so-khop.spec.ts`

Expected: PASS (baseline).

- [ ] **Step 2: Sửa `coNhuLiteral` để tính mỗi kiểu nháy đúng một lần**

Thay dòng 55-61 của `scripts/so-khop-ban-dich.mjs`:

```javascript
export function coNhuLiteral(noiDung, s) {
  const nhayKep = dangTrongNhay(s, '"')
  const nhayDon = dangTrongNhay(s, "'")
  const backtick = dangTrongNhay(s, '`')
  return (
    noiDung.includes('"' + nhayKep + '"') ||
    noiDung.includes("'" + nhayDon + "'") ||
    noiDung.includes('`' + backtick + '`')
  )
}
```

- [ ] **Step 3: Chạy lại test, xác nhận vẫn XANH — hành vi không đổi**

Run: `npx vitest run src/__tests__/vendor-so-khop.spec.ts`

Expected: PASS, kết quả giống hệt Step 1 (cùng số ca, cùng nội dung).

- [ ] **Step 4: Chạy `npx tsc --noEmit`**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add scripts/so-khop-ban-dich.mjs
git commit -m "P1-E Task 5: vá nợ M3 — coNhuLiteral tính mỗi kiểu nháy một lần"
```

---

### Task 6: Nội dung Đợt 1 — 24 khoá (toast + data-tip + tooltip thanh công cụ edgeless)

**Files:**
- Modify: `src/board/vi.json`

**Interfaces:**
- Consumes: cơ chế từ Task 1-5.
- Produces: `vi.json` có 5 + 24 = 29 khoá. Task 7 xây tiếp trên file này.

Đợt 1 là bề mặt "bấm một cái là thấy" — toast, `data-tip`, tooltip thanh công cụ edgeless của gói
`blocks/root`, `blocks/frame`, `widgets/edgeless-*`.

- [ ] **Step 1: Thêm 24 khoá vào `src/board/vi.json`**

Mở `src/board/vi.json`, thêm dấu phẩy sau dòng `"Support import of FreeMind,OPML.": "Hỗ trợ nhập
FreeMind, OPML."` rồi chèn:

```json
  "Copied to clipboard": "Đã sao chép",
  "Link": "Liên kết",
  "Frame": "Khung",
  "You have reached the last frame": "Đã tới khung cuối cùng",
  "You have reached the first frame": "Đã tới khung đầu tiên",
  "The presentation requires at least 1 frame. You can firstly create a frame.": "Cần ít nhất 1 khung để trình chiếu. Hãy tạo khung trước.",
  "Frame has been inserted into doc": "Đã chèn khung vào tài liệu",
  "Cutting mode": "Chế độ cắt",
  "Inline Equation": "Công thức trong dòng",
  "Create Table": "Tạo bảng",
  "Release from group": "Tách khỏi nhóm",
  "Group": "Nhóm",
  "Align objects": "Căn chỉnh đối tượng",
  "Draw connector": "Vẽ đường nối",
  "Lock": "Khoá",
  "Zoom to selection": "Phóng tới vùng chọn",
  "Mind Map": "Sơ đồ tư duy",
  "Invalid link": "Liên kết không hợp lệ",
  "Title can not be empty": "Tiêu đề không được để trống",
  "Eraser": "Tẩy",
  "Shape": "Hình",
  "Group has been inserted into doc": "Đã chèn nhóm vào tài liệu",
  "Edgeless Text": "Chữ tự do",
  "Note": "Ghi chú"
```

File hoàn chỉnh sau bước này có 29 khoá, hợp lệ JSON (kiểm bằng `node -e
"JSON.parse(require('fs').readFileSync('src/board/vi.json','utf8'))"`).

- [ ] **Step 2: Dựng lại cây đã dịch**

Run: `npm run dung:vendor`

Expected: chạy hết 7 bước, kết thúc bằng dòng xanh của `kiem-vendor-build`/`kiem-vendor-paths` đầy
đủ (Bước 7 của `dung-vendor.mjs`). Nếu Cổng nào trong `dich-chuoi-vendor.mjs` đỏ, đọc thông báo,
sửa `vi.json`, chạy lại `npm run dung:vendor` từ đầu (không chạy `dichchuoi:vendor` riêng lẻ trên
cây đã dịch dở — Cổng sớm sẽ chặn).

- [ ] **Step 3: Chạy đủ bảy cổng**

Run: `npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build && npm run kiem:dist`

Expected: mọi lệnh exit 0. Dòng cuối của `kiem:dist` phải đọc `bản dịch vi.json — 29/29 có mặt` (28
khoá `vi.json` + 1 khoá `vi-tien-to.json`, xem Task 4 Step 8 — thực ra Cổng 5 chỉ áp dụng khi có
khoá bắt đầu bằng tiền tố; Đợt 1 không có khoá nào như vậy nên Cổng 5 không có gì để xét, nhưng
`N/N` vẫn cộng cả `vi-tien-to.json`'s 1 khoá vào mẫu số → **29 + 1 = 30/30 có mặt**). Nếu số không
khớp, đọc kỹ lại — đừng giả định, chạy `npx vitest run --reporter=verbose > kq.txt 2>&1` rồi đọc
`kq.txt` nếu `npm test` không rõ ràng (bài học HANDOFF mục 6: không bao giờ nối `| tail`).

- [ ] **Step 4: Mở app, soi mắt Đợt 1**

Mở Browser pane, `npm run dev` đã chạy sẵn theo AGENTS.md (dùng cổng khác 5173/8443 nếu máy có dev
server khác đang chạy nền). Vào tab Mindmap, chờ chunk bảng vẽ tải (~20-30 giây lần đầu). Kiểm tay:

1. Bấm nút Khoá (icon ổ khoá) trên một shape đã chọn — tooltip hiện "Khoá".
2. Bấm chuột phải hoặc mở toolbar của một Frame — tên "Khung" hiện tiếng Việt, không phải "Frame".
3. Vẽ một Mind Map từ toolbar — nhãn công cụ hiện "Sơ đồ tư duy".
4. Sao chép một phần tử — toast góc dưới hiện "Đã sao chép", không phải "Copied to clipboard".
5. Xoá phần tử cuối cùng của một Frame (nếu dễ tái hiện) — toast "Đã tới khung cuối cùng" khi bấm
   điều hướng qua frame cuối.

Ghi kết quả (đạt/không đạt từng mục) vào báo cáo Task 6. Đây là bước xác nhận thủ công — không có
lệnh tự động thay thế được, đúng tiêu chí xong §8.8 của spec.

- [ ] **Step 5: Commit**

```bash
git add src/board/vi.json
git commit -m "P1-E Task 6: nội dung Đợt 1 — 24 khoá, toast/data-tip/tooltip edgeless"
```

---

### Task 7: Nội dung Đợt 2 — 82 khoá + 1 khoá tiền tố (nhãn menu)

**Files:**
- Modify: `src/board/vi.json`
- Modify: `src/board/vi-tien-to.json`

**Interfaces:**
- Consumes: cơ chế Task 1-5, nội dung Task 6.
- Produces: `vi.json` có 29 + 82 = 111 khoá; `vi-tien-to.json` có 1 khoá (đã tạo ở Task 4, không đổi
  thêm ở đây — chỉ xác nhận Cổng 5 chạy đúng khi 12 khoá "Drag/Click to insert …" xuất hiện).

Đợt lớn nhất — nhãn menu note/shape/connector/frame/group/brush. Đây là đợt DUY NHẤT chạm tới 11
khoá phụ thuộc tiền tố (`vi-tien-to.json`), nên Cổng 5 lần đầu thật sự có nội dung để kiểm.

**Loại trừ đã áp dụng** (xem Global Constraints và bảng số liệu đầu kế hoạch): `"Markdown"` (giữ
nguyên tên định dạng) và `"Drag/Click to insert Text block"` (mã chết, nhánh `item.type !== 'text'`
không bao giờ cho nó qua `.replace()`) — không thêm hai khoá này.

- [ ] **Step 1: Thêm 82 khoá vào `src/board/vi.json`**

Chèn vào `src/board/vi.json`, ngay sau khối 24 khoá của Task 6:

```json
  "Copy": "Sao chép",
  "Duplicate": "Nhân bản",
  "Reload": "Tải lại",
  "Delete": "Xoá",
  "Comment": "Bình luận",
  "To-do List": "Danh sách việc cần làm",
  "Untitled": "Chưa đặt tên",
  "Text": "Chữ",
  "Create linked doc": "Tạo tài liệu liên kết",
  "Open this doc": "Mở tài liệu này",
  "Insert into Page": "Chèn vào trang",
  "Rename": "Đổi tên",
  "Ungroup": "Rã nhóm",
  "Align left": "Căn trái",
  "Align center": "Căn giữa",
  "Align right": "Căn phải",
  "Equation": "Công thức",
  "No shadow": "Không đổ bóng",
  "Box shadow": "Bóng khối",
  "Sticker shadow": "Bóng nhãn dán",
  "Paper shadow": "Bóng giấy",
  "Floating shadow": "Bóng nổi",
  "Film shadow": "Bóng phim",
  "Slicer": "Công cụ cắt",
  "Size": "Kích thước",
  "Auto height": "Cao tự động",
  "Customized height": "Cao tuỳ chỉnh",
  "View in Toc": "Xem trong mục lục",
  "Heading #1": "Tiêu đề #1",
  "Heading #2": "Tiêu đề #2",
  "Heading #3": "Tiêu đề #3",
  "Heading #4": "Tiêu đề #4",
  "Heading #5": "Tiêu đề #5",
  "Heading #6": "Tiêu đề #6",
  "Code Block": "Khối mã",
  "Quote": "Trích dẫn",
  "Divider": "Đường phân cách",
  "Bulleted List": "Danh sách dấu chấm",
  "Numbered List": "Danh sách đánh số",
  "Bold Text": "Chữ đậm",
  "Italic": "Chữ nghiêng",
  "Underline": "Gạch chân",
  "Strikethrough": "Gạch ngang",
  "Move Up": "Chuyển lên",
  "Move Down": "Chuyển xuống",
  "Click to unlock": "Bấm để mở khoá",
  "Frame section": "Mục khung",
  "Group section": "Mục nhóm",
  "Bring to Front": "Đưa lên trên cùng",
  "Bring Forward": "Đưa lên trước",
  "Send Backward": "Đưa xuống sau",
  "Send to Back": "Đưa xuống dưới cùng",
  "Turn into linked doc": "Chuyển thành tài liệu liên kết",
  "Fill color": "Màu nền",
  "Border color": "Màu viền",
  "Retry": "Thử lại",
  "Start point style": "Kiểu điểm đầu",
  "Flip direction": "Đổi hướng",
  "End point style": "Kiểu điểm cuối",
  "Connector shape": "Kiểu đường nối",
  "Add text": "Thêm chữ",
  "Floation shadow": "Bóng lơ lửng",
  "Drag/Click to insert Bulleted List": "Kéo/Bấm để chèn Danh sách dấu chấm",
  "Drag/Click to insert Numbered List": "Kéo/Bấm để chèn Danh sách đánh số",
  "Drag/Click to insert To-do List": "Kéo/Bấm để chèn Danh sách việc cần làm",
  "Drag/Click to insert Heading 1": "Kéo/Bấm để chèn Tiêu đề 1",
  "Drag/Click to insert Heading 2": "Kéo/Bấm để chèn Tiêu đề 2",
  "Drag/Click to insert Heading 3": "Kéo/Bấm để chèn Tiêu đề 3",
  "Drag/Click to insert Heading 4": "Kéo/Bấm để chèn Tiêu đề 4",
  "Drag/Click to insert Heading 5": "Kéo/Bấm để chèn Tiêu đề 5",
  "Drag/Click to insert Heading 6": "Kéo/Bấm để chèn Tiêu đề 6",
  "Drag/Click to insert Code Block": "Kéo/Bấm để chèn Khối mã",
  "Drag/Click to insert Quote": "Kéo/Bấm để chèn Trích dẫn",
  "A visual divider": "Một đường phân cách",
  "Switch shape type": "Đổi kiểu hình",
  "Square": "Vuông",
  "Ellipse": "Hình bầu dục",
  "Diamond": "Hình thoi",
  "Triangle": "Tam giác",
  "Rounded rectangle": "Chữ nhật bo góc",
  "Alignment": "Căn chỉnh",
  "Open in center peek": "Mở xem nhanh giữa màn hình"
```

Đếm lại: 82 khoá (xác nhận bằng `node -e "const v=JSON.parse(require('fs').readFileSync('src/board/vi.json','utf8'));console.log(Object.keys(v).length)"`
phải ra 111).

- [ ] **Step 2: Xác nhận `vi-tien-to.json` đã đúng (từ Task 4, không sửa lại)**

Run: `cat src/board/vi-tien-to.json`

Expected:
```json
{
  "Drag/Click to insert ": "Kéo/Bấm để chèn "
}
```

Nếu khác (do Step 10 của Task 4 quên hoàn lại), sửa về đúng nội dung trên trước khi tiếp tục —
Cổng 5 sẽ đỏ nếu tiền tố sai lệch với 11 khoá vừa thêm ở Step 1.

- [ ] **Step 3: Dựng lại cây đã dịch**

Run: `npm run dung:vendor`

Expected: chạy hết. Nếu Cổng 5 (tiền tố) đỏ, kiểm tra CẢ 11 bản dịch "Drag/Click to insert X" có
đúng bắt đầu bằng `"Kéo/Bấm để chèn "` (chú ý dấu cách cuối tiền tố) hay không — lỗi phổ biến nhất
là gõ thiếu dấu cách.

- [ ] **Step 4: Chạy đủ bảy cổng**

Run: `npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build && npm run kiem:dist`

Expected: exit 0 tất cả. `kiem:dist` in `bản dịch vi.json — N/N có mặt` với N = 111 (vi.json) + 1
(vi-tien-to.json) = **112/112**.

- [ ] **Step 5: Xác nhận bằng tay ba hành vi mà không cổng nào thấy (spec §8.9)**

1. Mở menu Note (bấm biểu tượng "+" trên một note trống hoặc gõ `/` trong note) — mục **"Đường phân
   cách"** (Divider) **KHÔNG xuất hiện lặp lại** trong danh sách (nó bị chính thượng nguồn lọc bỏ
   khỏi menu này qua `item.name !== 'Divider'` — nếu mục này hiện ra nghĩa là `name:` đã vô tình bị
   dịch, tra ngay `THUOC_TINH_HIEN_THI` trong `luat-vi-tri-dich.mjs`).
2. Trong menu đó, tooltip của mục "Tiêu đề 1" hiện **đúng nhãn ngắn** — không phải câu dài
   "Kéo/Bấm để chèn Tiêu đề 1" lộ nguyên văn (tooltip đúng phải đã bị `.replace()` cắt tiền tố,
   chỉ còn "Tiêu đề 1"). Nếu tooltip hiện nguyên câu dài, Cổng 5 có vấn đề — dừng lại, không tiếp
   tục đợt 3 tới khi sửa xong.
3. Nếu slash-menu (gõ `/`) hiển thị được trong bản dựng hiện tại (nó KHÔNG nằm trong 22 view
   extension đã đăng ký — nếu không gõ `/` được gì thì bỏ qua mục này, ghi "N/A — chưa bật"), xác
   nhận tooltip của mục Bold/Italic/Underline vẫn hiện được (bảng tooltip tra bằng `name` tiếng
   Anh, nhưng `name` không đổi nên tra cứu vẫn khớp).

- [ ] **Step 6: Soi 29 khoá pha trộn — bảng phán quyết**

29 khoá dưới đây có ít nhất một lượt xuất hiện ở vị trí `name`/`group`/`title`/`text` **đã loại
khỏi bản dịch** (Task 1) — nghĩa là lượt đó vĩnh viễn ở lại tiếng Anh. Với mỗi khoá, gói chứa lượt
đó đã đo (xem cột "gói của lượt tiếng Anh"); đối chiếu với `src/board/extensions.ts` để biết gói có
đang bật (render được) hay không:

| Khoá | Gói của lượt tiếng Anh còn lại | Đang bật? | Render thấy được? |
|---|---|---|---|
| Copy, Duplicate, Delete | `attachment`,`bookmark`,`code`,`data-view`,`database`,`embed`,`embed-doc`,`image`,`table`,`keyboard-toolbar`,`slash-menu` — KHÔNG có `blocks/root` trong danh sách gói chứa `name:` cụ thể (label: mới ở root) | các gói trên đều KHÔNG có view extension đăng ký | KHÔNG |
| Link | `bookmark`,`database`,`gfx/link`,`inlines/preset`,`keyboard-toolbar` | không có gói nào trong `EXT` | KHÔNG |
| Comment | `code`,`database`,`shared` (hạ tầng, không tự render) | phụ thuộc caller | soi tay xác nhận — xem bước dưới |
| To-do List, Code Block, Quote, Divider, Bulleted List, Numbered List | `note`(block, ĐANG BẬT)+`gfx/note`(ĐANG BẬT)+`rich-text`(hạ tầng) ở vị trí `caption:`/`tooltip:` (ĐÃ dịch) — riêng lượt `name:` còn tiếng Anh nằm trong CÙNG các gói đó nhưng ở vị trí đã loại | gói note ĐANG BẬT | `name:` không tự hiển thị trừ khi có code khác đọc nó — đã xác nhận ở Step 5 Divider không lộ ra |
| Untitled | `data-view`,`embed`,`shared` | không nằm trong `EXT` | KHÔNG (lượt `title:` chỉ vào file xuất Markdown/PDF, không phải UI) |
| Text | `database`,`note`,`surface-ref`,`gfx/mindmap`,`gfx/note`,`rich-text`,`keyboard-toolbar` | note/mindmap ĐANG BẬT | soi tay — mục tooltip "Chữ" đã đúng tiếng Việt ở Step 5-tương tự, `name:`/`text:` không tự hiển thị |
| Create linked doc | `embed`,`root` (root ĐANG BẬT) | ĐANG BẬT | lượt `title:` không phải UI trực tiếp (title thuộc tính DOM, không phải nhãn nhìn thấy trên nút) |
| Frame | `frame`,`root`,`surface-ref` — cả frame lẫn root ĐANG BẬT | ĐANG BẬT | đã soi ở Task 6 Step 4, "Khung" hiện đúng tiếng Việt ở tooltip/label/caption/data-tip; lượt `name:` là định danh nội bộ, không tự vẽ ra chữ |
| Ungroup, Align left, Align center, Align right | `frame`,`data-view`,`gfx/group`,`image`,`rich-text` — frame/gfx-group ĐANG BẬT | ĐANG BẬT | `tooltip:` đã dịch ("Rã nhóm","Căn trái"...), `name:` là định danh, không hiển thị trực tiếp |
| Equation | `latex`,`rich-text`,`keyboard-toolbar` | không nằm trong `EXT` | KHÔNG |
| Italic, Underline, Strikethrough | `note`,`inlines/preset`,`keyboard-toolbar` | note ĐANG BẬT | `caption:` đã dịch, `name:` không tự hiển thị |
| Move Up, Move Down | `note`,`table`,`data-view`,`slash-menu` | note ĐANG BẬT | `caption:`/`tooltip:` đã dịch |
| Group | `root`,`surface-ref`,`data-view` | root ĐANG BẬT | `label:`/`tooltip:` đã dịch; lượt `group:` là khoá sắp xếp (`'0_Basic@0'`-dạng), không phải chữ hiển thị theo đúng thiết kế |
| Mind Map | `surface-ref`,`gfx/mindmap` | gfx/mindmap ĐANG BẬT | `text:`/`data-tip:` — `data-tip` đã dịch ở Đợt 1 (Task 6), `text:` không tự hiển thị |
| Shape | `gfx/connector`,`gfx/shape` | cả hai ĐANG BẬT | `label:`/`data-tip:` đã dịch |
| Note | `gfx/note` | ĐANG BẬT | `data-tip:` đã dịch ở Đợt 1; lượt `name:` không tự hiển thị |

**Kết luận chung**: không khoá nào trong 29 khoá này có lượt tiếng Anh RENDER trực tiếp trên màn
hình ở trạng thái `extensions.ts` hiện tại — mọi vị trí thật sự hiển thị (`label`/`tooltip`/
`caption`/`data-tip`) đều đã dịch; vị trí còn tiếng Anh (`name`/`group`/`title`/`text`) là dữ liệu
nội bộ (khoá tra cứu, thuộc tính DOM `title=`, giá trị enum) không tự vẽ chữ ra UI. Rủi ro duy nhất
còn treo: nếu về sau có ai thêm code đọc trực tiếp `item.name` rồi gán vào một node văn bản (ví dụ
`` `${item.name}` `` trong template `html`), lượt đó sẽ hiện tiếng Anh — không cổng cơ học nào bắt
được việc này, chỉ có soi mắt khi thêm tính năng mới.

Ghi bảng này (đã có sẵn ở đây) và câu kết luận vào báo cáo Task 7 — đây chính là "kỷ luật biên tập
không có cổng canh" mà spec §4.2 yêu cầu.

- [ ] **Step 7: Commit**

```bash
git add src/board/vi.json
git commit -m "P1-E Task 7: nội dung Đợt 2 — 82 khoá nhãn menu + kiểm tiền tố"
```

---

### Task 8: Nội dung Đợt 3 — 24 khoá (câu mô tả dài)

**Files:**
- Modify: `src/board/vi.json`

**Interfaces:**
- Consumes: cơ chế Task 1-5, nội dung Task 6-7.
- Produces: `vi.json` có 111 + 24 = 135 khoá — đủ 130 khoá mới + 5 khoá đã ship.

**Loại trừ đã áp dụng**: `"Images"` và `"MindMap"` (tự tham chiếu nguy hiểm, xem Global Constraints)
và `"Html"`, `"Zip"`, `"Docx"`, `"OneNote"` (giữ nguyên tên định dạng) — không thêm bốn khoá cuối
và hai khoá đầu, tổng cộng loại 6 trong 30 ứng viên gốc.

- [ ] **Step 1: Thêm 24 khoá vào `src/board/vi.json`**

Chèn vào `src/board/vi.json`, ngay sau khối 82 khoá của Task 7 (khoá cuối cùng hiện tại là
`"Open in center peek": "Mở xem nhanh giữa màn hình"` — thêm dấu phẩy sau dòng đó rồi chèn):

```json
  "Add description alias (empty to inherit document content)": "Thêm bí danh mô tả (để trống thì lấy theo nội dung tài liệu)",
  "Write a description...": "Viết mô tả...",
  "A simple bulleted list.": "Danh sách dấu chấm đơn giản.",
  "A list with numbering.": "Danh sách có đánh số.",
  "Track tasks with a to-do list.": "Theo dõi việc cần làm bằng danh sách việc.",
  "Start typing with plain text.": "Bắt đầu gõ văn bản thường.",
  "Headings in the largest font.": "Tiêu đề cỡ chữ lớn nhất.",
  "Headings in the 2nd font size.": "Tiêu đề cỡ chữ lớn thứ hai.",
  "Headings in the 3rd font size.": "Tiêu đề cỡ chữ lớn thứ ba.",
  "Heading in the 4th font size.": "Tiêu đề cỡ chữ lớn thứ tư.",
  "Heading in the 5th font size.": "Tiêu đề cỡ chữ lớn thứ năm.",
  "Heading in the 6th font size.": "Tiêu đề cỡ chữ lớn thứ sáu.",
  "Capture a code snippet.": "Ghi lại một đoạn mã.",
  "Capture a quote.": "Ghi lại một câu trích dẫn.",
  "A visual divider.": "Một đường phân cách trực quan.",
  "Create a bulleted list.": "Tạo danh sách dấu chấm.",
  "Create a numbered list.": "Tạo danh sách đánh số.",
  "Add tasks to a to-do list.": "Thêm việc vào danh sách việc cần làm.",
  "Code snippet with formatting.": "Đoạn mã có định dạng.",
  "Formula block with LaTeX rendering.": "Khối công thức dựng bằng LaTeX.",
  "Add a blockquote for emphasis.": "Thêm khối trích dẫn để nhấn mạnh.",
  "Visually separate content.": "Tách nội dung bằng đường kẻ.",
  "Videos": "Video",
  "Audios": "Âm thanh"
```

Xác nhận tổng số khoá: `node -e "const v=JSON.parse(require('fs').readFileSync('src/board/vi.json','utf8'));console.log(Object.keys(v).length)"`
phải ra **135**.

- [ ] **Step 2: Dựng lại cây đã dịch**

Run: `npm run dung:vendor`

Expected: chạy hết. Đợt này không thêm khoá tiền tố nào và không thêm khoá dạng mẫu mã, nên rủi ro
đỏ chủ yếu ở Cổng 1 (trùng bản gốc — kiểm lại không khoá nào dịch ra chính nó) hoặc Cổng 3 (khoá
chết — kiểm khoá có đúng nằm ở `description:` như đã đo).

- [ ] **Step 3: Chạy đủ bảy cổng**

Run: `npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build && npm run kiem:dist`

Expected: exit 0 tất cả. `kiem:dist` in `bản dịch vi.json — 136/136 có mặt` (135 vi.json + 1
vi-tien-to.json).

- [ ] **Step 4: Xác nhận bằng tay — hai điểm rủi ro đã loại trừ vẫn hoạt động đúng**

1. Mở một sơ đồ tư duy (Mind Map) trên canvas, dùng công cụ nhập từ file `.mm`/`.opml` (nếu có
   trên thanh công cụ mindmap) — thao tác **không được ném lỗi**. Đây là hành vi mà việc loại trừ
   `"MindMap"` ở Global Constraints bảo vệ; nếu ai đó lỡ thêm lại khoá này, thao tác này sẽ vỡ với
   `BlockSuiteError` ngay khi bấm.
2. Nếu công cụ nhập ảnh từ máy cục bộ có trên UI đã bật (kiểm bằng cách thử chèn ảnh qua nút toolbar
   thay vì kéo-thả), thao tác **không được ném lỗi**. Bảo vệ cho việc loại trừ `"Images"`.

Nếu MỘT trong hai thao tác trên không thể thực hiện được vì tính năng chưa bật trong
`extensions.ts` (nhiều khả năng đúng vậy — `blocks/image` không nằm trong 22 view extension) thì
ghi "N/A — tính năng chưa bật, rủi ro chưa thể lộ trong bản dựng hiện tại nhưng vẫn treo cho tương
lai" vào báo cáo, không bỏ qua việc ghi chú.

- [ ] **Step 5: Commit**

```bash
git add src/board/vi.json
git commit -m "P1-E Task 8: nội dung Đợt 3 — 24 khoá câu mô tả dài"
```

---

### Task 9: Lượt review toàn nhánh + cập nhật HANDOFF + bàn giao

**Files:**
- Modify: `docs/superpowers/HANDOFF.md`
- Modify: `.superpowers/sdd/progress.md` (không commit — bị gitignore, chỉ sống trên máy này)

**Interfaces:**
- Consumes: toàn bộ Task 1-8.
- Produces: trạng thái repo sạch, sẵn sàng cho lượt review toàn nhánh và gộp — không tự gộp trong
  task này.

- [ ] **Step 1: Chạy lại đủ bảy cổng một lần cuối trên trạng thái tích luỹ**

Run: `npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build && npm run kiem:dist`

Expected: exit 0 tất cả, `kiem:dist` in `bản dịch vi.json — 136/136 có mặt`.

- [ ] **Step 2: Dùng `superpowers:requesting-code-review` cho toàn nhánh**

Phạm vi review: từ commit gốc của nhánh (commit trước Task 1) tới `HEAD`. Đối chiếu với spec bản 4
VÀ với bảng loại trừ ở đầu kế hoạch này (Markdown/Text-block/Images/MindMap/Html/Zip/Docx/OneNote) —
reviewer cần tự đo lại tối thiểu MỘT trong bốn phát hiện mới (khuyến nghị: `Images`/`MindMap`, vì
đó là phát hiện có hậu quả nặng nhất — ném lỗi khi dùng tính năng) bằng cách tự chạy lại
`grep -rn "openSingleFileWith('MindMap')" .vendor-build` và `grep -rn "openFilesWith('Images')"
.vendor-build`, không tin lời khai của kế hoạch.

- [ ] **Step 3: Vá theo kết quả review (nếu có Important/Critical)**

Không thể liệt kê trước — theo đúng tinh thần `superpowers:receiving-code-review`, xác minh kỹ
thuật từng phát hiện trước khi vá, không đồng ý biểu diễn.

- [ ] **Step 4: Cập nhật `docs/superpowers/HANDOFF.md`**

Thêm mục 14 mới vào cuối file, theo đúng khuôn các mục 10/12/13 đã có:

```markdown
## 14. CHẶNG P1-E — nội dung dịch, đợt đầu

Nhánh: `<tên nhánh thật lúc thi hành>`, gốc `<sha thật>`.

| Tài liệu | Đường dẫn |
|---|---|
| Spec | `docs/superpowers/specs/2026-08-15-noi-dung-dich-design.md` (bản 4) |
| Kế hoạch | `docs/superpowers/plans/2026-08-15-noi-dung-dich.md` |

### Chặng này làm gì

Thêm 130 khoá dịch vào `src/board/vi.json` (5 → 135) và 1 khoá vào `src/board/vi-tien-to.json`
(file mới). Ba đợt: 24 (toast/data-tip/tooltip edgeless) / 82 (nhãn menu) / 24 (mô tả dài).

Hai cơ chế mới:
- **Thu hẹp D12 còn 5 vị trí hiển thị**, bỏ `name`/`group`/`title`/`text` — bốn mối nối nguy hiểm
  đọc lại giá trị hiển thị làm dữ liệu (`tooltips[name]`, `item.name !== 'Divider'`,
  `['Code','Link'].includes(i.name)`) đều đọc `.name`; bỏ vị trí đó thì chúng biến mất theo cấu
  trúc, không cần cổng bù.
- **Cổng 4** (`scripts/kiem-quan-he-dich.mjs`) — dây bẫy quét NGƯỢC (không phải quét literal): tìm
  mọi chỗ 5 tên còn giữ (`tooltip`/`label`/`description`/`caption`/`placeholder`) bị đọc lại làm
  khoá tra cứu/vế so sánh, so với bản khai ghim 4 toạ độ.
- **Cổng 5** — tính nhất quán tiền tố cho `src/board/vi-tien-to.json` (thay TRỌN CÂY, không lọc vị
  trí) — vá lớp lỗi PHẪU THUẬT CHUỖI (`.replace('Drag/Click to insert ', '')` cắt trên literal đã
  dịch).

### Bốn khoá bị loại — phát hiện MỚI, không có trong spec bản 4

`"Images"` và `"MindMap"` là giá trị `description:` trong `FileTypes`
(`affine/shared/src/utils/file/filesys.js`), và CÙNG những chuỗi đó được gọi lại làm đối số ở nơi
khác: `openFilesWith('Images')` (`filesys.js:338`), `openSingleFileWith('MindMap')`
(`affine/gfx/mindmap/src/toolbar/utils/import-mindmap.js:5`, gói **ĐANG BẬT**). Dịch hai khoá này
sẽ làm `FileTypes.find(i => i.description === acceptType)` không tìm thấy gì, và
`importMindmap`/`getImageFilesFromLocal` **ném lỗi** khi người dùng bấm nhập. Không thêm hai khoá
này — đây KHÔNG phải danh sách miễn, chúng chưa từng được thêm.

Cổng 4 bản kế hoạch này chỉ ghim ĐÚNG toạ độ của site tiêu thụ (`filesys.js:175,205`), không phán
xét nội dung khoá nào chảy vào đó — việc lần theo `Images`/`MindMap` là soi tay lúc soạn nội dung,
không phải việc cổng làm tự động. **Nếu chặng sau muốn dịch hai khoá này, phải giải quyết mối nối
đó trước** (ví dụ: đổi `FileTypes` sang so sánh bằng một mã định danh tách biệt khỏi `description`
hiển thị).

`"Markdown"` và `"Drag/Click to insert Text block"` cũng bị loại khỏi Đợt 2 — giữ tên định dạng
(quy tắc sẵn có của spec) và mã chết (nhánh `item.type !== 'text'` không bao giờ cho literal đó
qua `.replace()`).

### Đã xong

| Task | Nội dung | Commit |
|---|---|---|
| 1 | Thu hẹp D12 còn 5 vị trí | `<sha>` |
| 2 | Cổng mẫu mã | `<sha>` |
| 3 | Cổng 4 — dây bẫy quét ngược | `<sha>` |
| 4 | `vi-tien-to.json` + thay trọn cây + Cổng 5 | `<sha>` |
| 5 | Vá nợ M3 (P1-D) | `<sha>` |
| 6 | Nội dung Đợt 1 — 24 khoá | `<sha>` |
| 7 | Nội dung Đợt 2 — 82 khoá | `<sha>` |
| 8 | Nội dung Đợt 3 — 24 khoá | `<sha>` |

`npm test` `<N>/<N>` (`<số file>` file), trước chặng `<N cũ>`.

### Việc làm ngay của phiên sau

```bash
git log --oneline -1                    # kỳ vọng <sha cuối> hoặc mới hơn
git status --short                      # kỳ vọng chỉ hai file sinh ra ở mục 6
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
```

**Còn lại**: lượt review toàn nhánh (nếu Task 9 chưa hoàn tất khi phiên này kết thúc), rồi quyết
định gộp bằng `superpowers:finishing-a-development-branch`.

**Chặng kế tiếp**: đợt dịch thứ hai (162 chuỗi nhóm C, chủ yếu `affine/data-view` — cần bật tính
năng trước, xem quyết định 1 của P1-C); hoặc giải quyết mối nối `Images`/`MindMap` để mở khoá hai
chuỗi đó; hoặc Lưu trữ (D4)/BoardGallery như mục 8 cũ đã ghi.
```

Điền `<sha thật>`, `<tên nhánh thật>`, số liệu `npm test` thật vào lúc thi hành — đây là những chỗ
DUY NHẤT trong kế hoạch phụ thuộc kết quả chạy thật, không viết trước được.

- [ ] **Step 5: Cập nhật `.superpowers/sdd/progress.md` (không commit, file cục bộ)**

Thêm vào cuối file, theo khuôn các mục trước:

```markdown
---

# Kế hoạch 2026-08-15-noi-dung-dich (P1-E) — nội dung dịch, đợt đầu

Nhánh: `<tên nhánh thật>`. Gốc: `<sha thật>`.
Spec: `docs/superpowers/specs/2026-08-15-noi-dung-dich-design.md` (bản 4)

- Task 1-8: <điền trạng thái thật lúc thi hành, theo khuôn "complete (commits X..Y, review Z)">
- Phát hiện mới lúc lập kế hoạch (không có trong spec bản 4): Images/MindMap tự tham chiếu nguy
  hiểm qua filesys.js:175,205 — xem HANDOFF mục 14.
- CÒN LẠI: lượt review TOÀN NHÁNH, rồi quyết định gộp.
```

- [ ] **Step 6: Commit HANDOFF.md (progress.md không commit — gitignore)**

```bash
git add docs/superpowers/HANDOFF.md
git commit -m "P1-E: cập nhật HANDOFF mục 14, bàn giao phiên sau"
```

- [ ] **Step 7: KHÔNG push, KHÔNG gộp, KHÔNG tự chạy review toàn nhánh trong task này**

Đây là điểm dừng của lượt "kết thúc phiên sạch, bàn giao phiên sau". Nếu Task 9 Step 2-3 (review
toàn nhánh) đã chạy xong và không phát hiện Critical, người thi hành CÓ THỂ tiếp tục sang
`superpowers:finishing-a-development-branch` trong CÙNG phiên nếu người dùng yêu cầu — nhưng mặc
định của kế hoạch này là DỪNG Ở ĐÂY, để phiên sau đọc `HANDOFF.md` mục 14 và tự quyết định bước
tiếp.

---

## Tự soát kế hoạch (self-review, đã chạy trước khi lưu file)

**1. Phủ hết spec bản 4 chưa?**

| Mục spec | Task |
|---|---|
| §1 đo lại hai đại lượng | Đã đo lại ở lượt brainstorming, không phải việc của kế hoạch thi hành |
| §2 chọn A+B, bỏ nhóm C | Ghi trong Global Constraints, phản ánh trong nội dung Task 6-8 |
| §3 lớp lỗi tiêu thụ ngược | Task 3 |
| §4.1 thu hẹp vị trí | Task 1 |
| §4.2 29 khoá pha trộn | Task 7 Step 6 |
| §4.3 Cổng 4 | Task 3 |
| §4.4 Cổng 5 + `vi-tien-to.json` | Task 4 |
| §4.5 Cổng mẫu mã | Task 2 |
| §5.1 quy tắc biên tập | Áp dụng trực tiếp trong nội dung Task 6-8 (giữ tên định dạng, cặp va
  chạm, giữ dấu câu) |
| §5.2 bảng thuật ngữ | Không tách task riêng — từ vựng đã thống nhất khi soạn nội dung Task 6-8 |
| §5.3 ba đợt | Task 6, 7, 8 |
| §6 nợ M3 | Task 5 |
| §8 tiêu chí xong | Mỗi task nội dung đều chạy bảy cổng + xác nhận tay |

**2. Quét placeholder**: không còn "TBD"/"tự soi sau"/"tương tự Task N mà không chép lại mã". Bảng
29 khoá pha trộn ở Task 7 Step 6 và hai bước xác nhận tay ở Task 8 Step 4 đã viết đủ nội dung thay
vì để trống.

**3. Tính nhất quán kiểu**: `diemTieuThuTrongFile`, `BAN_KHAI_TIEU_THU`, `kiemTienTo`,
`thayTrenToanCay` dùng thống nhất tên và chữ ký giữa Task 3/4 (nơi định nghĩa) và Task 6/7/8 (nơi
dùng gián tiếp qua pipeline) — không có chỗ nào gọi tên khác.

**4. Đã sửa khi tự soát**: số liệu ban đầu chép từ spec bản 4 (138 khoá) đã được đo lại và điều
chỉnh xuống 130 (+1 tiền tố) ngay trong phần "Bản đồ số liệu" ở đầu kế hoạch, kèm bằng chứng
`file:dòng` cho từng khoá bị loại — không mang số cũ vào các task nội dung.
