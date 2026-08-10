# P0-A: Vendor nền BlockSuite và tiện ích định tuyến — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vendor `framework/global/src` + `framework/store/src` (BlockSuite 0.27.0) vào `src/vendor/blocksuite/`, dựng hạ tầng vitest, và port bốn tiện ích định tuyến từ `affine/blocks/surface`.

**Architecture:** Theo D11 — tầng dữ liệu **vendor** (chép nguyên văn, cấm sửa), `std/gfx` **port** (P0-B), tầng khung nhìn **viết** bằng React (P1.0).

**Mấu chốt kỹ thuật:** alias `@blocksuite/*` trỏ vào thư mục vendored. Nhờ vậy **không file nào phải sửa dòng import** — cả mã vendored lẫn bốn file port đều giữ nguyên specifier thượng nguồn đã viết.

**Tech Stack:** TypeScript 5.7 (strict) · Vite 8 · Vitest 4 (devDependency) · vendored BlockSuite 0.27.0

## Global Constraints

- **`src/vendor/blocksuite/**` là mã bên thứ ba — CẤM SỬA một chữ nào** (D11). Kể cả sửa import, kể cả chiều lint. Cần đổi hành vi thì đổi ở tầng trên. Đây là điều kiện để lúc 0.27.0 được publish thì thay bằng npm chỉ là xoá thư mục và bỏ alias.
- `src/core/**` **không import React, không đụng DOM API ở phạm vi module** (spec §4). `DOMMatrix`/`DOMPoint` chỉ được nằm trong thân hàm.
- Test gốc **không được sửa khẳng định**. Không đạt là lỗi port (spec §10).
- **Không chép lại thứ đã vendor.** `bound`, `math-utils`, `curve` nằm trong `global/src/gfx` — import qua alias, và **đừng port test của chúng**: đó là kiểm hộ thượng nguồn.
- Thư mục nguồn được phép đụng: `framework/global/src`, `framework/store/src`, `affine/blocks/surface/src/utils`, `affine/blocks/surface/src/__tests__`. **Đụng ra ngoài = dấu hiệu chệch hướng, dừng và hỏi.**
- Tiếng Việt cho comment mới. Comment gốc tiếng Anh trong file chép về giữ nguyên.

## Câu hỏi mở kế hoạch này phải trả lời

| Câu hỏi | Ở đâu trong spec | Trả lời ở |
|---|---|---|
| Vendor xong thì bundle phình bao nhiêu, và cây con nào kéo theo gói tưởng đã rơi? | §11 — "vẫn phải đo bundle sau chặng đầu P0" | Task 2 Step 4 |

Ký hiệu đường dẫn:

```
$AFF = C:/Users/LENOVO/Downloads/AFFiNE/blocksuite
$W   = C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless
```

## File Structure

```
src/vendor/blocksuite/
  README.md          MỚI — cảnh báo cấm sửa, ghi xuất xứ và cách thay bằng npm
  global/src/**      chép nguyên văn từ $AFF/framework/global/src (trừ lit/)
  store/src/**       chép nguyên văn từ $AFF/framework/store/src (trừ test/, __tests__/)
src/core/utils/
  priority-queue.ts  chép từ $AFF/affine/blocks/surface/src/utils/
  graph.ts           chép
  a-star.ts          chép
  sort.ts            chép — loadingSort + sortIndex
src/core/__tests__/
  priority-queue.spec.ts  port (22 dòng)
  graph.spec.ts           port (23 dòng)
  a-star.spec.ts          port (114 dòng)
  sort.spec.ts            port (99 dòng)
  sort-index.spec.ts      MỚI — sortIndex không có test gốc
package.json         sửa — dependency + script test
tsconfig.json        sửa — paths cho @blocksuite/*
vite.config.ts       sửa — alias, plugin .js→.ts, khối test của vitest
docs/superpowers/notes/2026-08-11-do-bundle-p0a.md   MỚI
```

---

## Task 1: Vendor tầng dữ liệu và nối dây phân giải module

**Files:**
- Create: `src/vendor/blocksuite/README.md`, `src/vendor/blocksuite/global/src/**`, `src/vendor/blocksuite/store/src/**`
- Modify: `package.json`, `tsconfig.json`, `vite.config.ts`

**Interfaces:**
- Consumes: không có
- Produces: `import ... from '@blocksuite/global/gfx'` và `'@blocksuite/store'` phân giải được ở cả `tsc` lẫn Vite lẫn Vitest

- [ ] **Step 1: Ghi mốc nền bundle**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm run build 2>&1 | grep -E "dist/assets"
```

Ghi lại hai số của dòng `.js` — đó là mốc để Task 2 Step 4 trừ ra.

- [ ] **Step 2: Chép mã vendored**

Bỏ `global/src/lit/` (chỉ chỗ đó dùng Lit), bỏ `store/src/test/` và mọi `__tests__/` (bộ khung kiểm thử của thượng nguồn, ta không dùng).

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
AFF="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework"
mkdir -p src/vendor/blocksuite/global src/vendor/blocksuite/store
cp -r "$AFF/global/src" src/vendor/blocksuite/global/src
cp -r "$AFF/store/src" src/vendor/blocksuite/store/src
rm -rf src/vendor/blocksuite/global/src/lit
rm -rf src/vendor/blocksuite/store/src/test
find src/vendor/blocksuite -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null
find src/vendor/blocksuite -name "*.ts" | wc -l
```

Expected: in ra số file, khoảng 200–260.

- [ ] **Step 3: Viết README cảnh báo**

Create `src/vendor/blocksuite/README.md`:

```markdown
# Mã vendored từ BlockSuite — KHÔNG SỬA

Xuất xứ: `AFFiNE/blocksuite/framework/{global,store}/src`, phiên bản **0.27.0**.
Chép nguyên văn ngày 2026-08-11.

## Vì sao chép mà không cài từ npm

npm mới publish tới `0.22.4`. Bản `0.27.0` chỉ có trong workspace AFFiNE, và nó là bản
duy nhất chứa `viewportRuntimeConfig` / `getEffectiveDpr` / `SKIP_REFRESH_DURING_GESTURE`
— phần giữ WKWebView khỏi sập lúc pan/zoom trên iPhone. Xem D10 và D11 trong
`docs/superpowers/specs/2026-08-11-blockkit-edgeless-design.md`.

## Quy tắc

**Cấm sửa một chữ nào trong thư mục này** — kể cả import, kể cả chiều lint.
Cần đổi hành vi thì bọc ở tầng trên (`src/core/`).

Lý do: khi `0.27.0` được publish, việc thay thư mục này bằng dependency npm phải chỉ là
xoá thư mục và bỏ alias trong `tsconfig.json` + `vite.config.ts`. Sửa một chỗ ở đây là
mất khả năng đó.

## Đã bỏ khi chép

- `global/src/lit/` — chỗ duy nhất dùng Lit; React thay tầng khung nhìn
- `store/src/test/`, mọi `__tests__/` — khung kiểm thử của thượng nguồn, ta không dùng
```

- [ ] **Step 4: Cài dependency mà mã vendored cần**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm install yjs @preact/signals-core rxjs lib0 zod nanoid minimatch lodash.ismatch
npm install -D vitest@^4.1.8 @types/lodash.ismatch
```

Expected: `added N packages`, không lỗi.

Ghi chú: `file-type`, `y-protocols`, `@blocksuite/sync` **không** có trong danh sách — đã đo là không cây con nào ta chép dùng tới (spec §11). Nếu `tsc` ở Step 8 báo thiếu một trong ba, nghĩa là phép đo sai: **dừng và ghi lại**, đừng lặng lẽ cài thêm.

- [ ] **Step 5: Thêm script test**

Trong `package.json`, khối `"scripts"`, thêm hai dòng vào giữa `"preview"` và `"format"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 6: Nối alias trong tsconfig.json**

Trong `tsconfig.json`, khối `"paths"` đổi từ:

```json
    "paths": {
      "@/*": ["./src/*"]
    },
```

thành:

```json
    "paths": {
      "@/*": ["./src/*"],
      "@blocksuite/global": ["./src/vendor/blocksuite/global/src/index.ts"],
      "@blocksuite/global/*": ["./src/vendor/blocksuite/global/src/*/index.ts"],
      "@blocksuite/store": ["./src/vendor/blocksuite/store/src/index.ts"]
    },
```

Và thêm `"src/vendor"` vào `"include"` nếu chưa có — hiện `"include": ["src", "vite.config.ts"]` đã phủ rồi, không cần đổi.

- [ ] **Step 7: Nối alias và plugin trong vite.config.ts**

Ba sửa đổi trong `vite.config.ts`.

**(a)** Dòng 1 đổi từ `import { defineConfig } from 'vite'` thành:

```ts
import { defineConfig, type Plugin } from 'vitest/config'
```

**(b)** Thêm plugin ngay trước `export default defineConfig(...)`:

```ts
// Mã vendored trong src/vendor/blocksuite/ dùng specifier kiểu './vec.js' trỏ vào file
// .ts — quy ước của TypeScript khi biên dịch ra ESM. `tsc` với moduleResolution "bundler"
// hiểu được, nhưng Vite phân giải đúng chuỗi đó rồi không thấy file.
//
// Sửa bằng plugin thay vì sửa mã: D11 cấm chạm vào src/vendor/blocksuite/, để lúc
// BlockSuite 0.27.0 được publish thì thay bằng npm chỉ là xoá thư mục.
function vendorJsToTs(): Plugin {
  return {
    name: 'vendor-js-to-ts',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer?.includes('/vendor/blocksuite/')) return null
      if (!source.startsWith('.') || !source.endsWith('.js')) return null
      const resolved = await this.resolve(source.slice(0, -3), importer, { skipSelf: true })
      return resolved?.id ?? null
    },
  }
}
```

**(c)** Trong object trả về: thêm `vendorJsToTs()` vào đầu mảng `plugins`, thêm ba alias, và thêm khối `test`:

```ts
    plugins: [vendorJsToTs(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@blocksuite/global': path.resolve(__dirname, './src/vendor/blocksuite/global/src'),
        '@blocksuite/store': path.resolve(__dirname, './src/vendor/blocksuite/store/src'),
      },
    },
```

và sau khối `preview`:

```ts
    test: {
      // Môi trường node: không test nào trong P0-A chạm DOM. P0-B port viewport
      // (có nhánh DOMMatrix) thì đổi sang 'happy-dom'.
      environment: 'node',
      include: ['src/**/__tests__/**/*.spec.ts'],
    },
```

Ghi chú về alias `@blocksuite/global`: Vite phân giải tiền tố nên `@blocksuite/global/gfx` tự thành `src/vendor/blocksuite/global/src/gfx`, rồi `resolve.extensions` mặc định tìm `gfx/index.ts`. Không cần khai từng subpath như tsconfig.

- [ ] **Step 8: Xác nhận phân giải chạy — type-check**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx tsc --noEmit 2>&1 | head -40
```

Expected: exit 0, không in gì.

**Nếu có lỗi:** phân loại trước khi sửa.
- Lỗi *phân giải module* (`Cannot find module '@blocksuite/...'`) → sai `paths` ở Step 6.
- Lỗi *thiếu gói* (`Cannot find module 'y-protocols'`) → phép đo ở spec §11 sai. **Dừng và ghi lại**, đừng lặng lẽ `npm install` thêm.
- Lỗi *kiểu* bên trong `src/vendor/**` → **không sửa mã vendored**. Ghi lại, rồi cân nhắc loại trừ thư mục đó khỏi `tsc` bằng cách thêm `"exclude"` — mã bên thứ ba không phải nơi ta đi sửa kiểu.

- [ ] **Step 9: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add -A src/vendor package.json package-lock.json tsconfig.json vite.config.ts
git commit -m "P0-A: vendor tầng dữ liệu BlockSuite 0.27.0

Chép nguyên văn framework/global/src + framework/store/src vào
src/vendor/blocksuite/ (D11). Bỏ global/src/lit (chỗ duy nhất dùng
Lit) và store/src/test cùng mọi __tests__.

Alias @blocksuite/* trỏ vào thư mục vendored, nên không file nào phải
sửa dòng import — mã chép về giữ nguyên specifier thượng nguồn viết.

Plugin vendor-js-to-ts xử lý specifier './x.js' trỏ vào file .ts: tsc
hiểu, Vite không. Sửa bằng plugin thay vì sửa mã, vì D11 cấm chạm vào
thư mục vendored.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong (một, kiểm được bằng lệnh):** `npx tsc --noEmit` exit 0.

---

## Task 2: Hàng đợi ưu tiên, đồ thị, và đo bundle

**Files:**
- Create: `src/core/utils/priority-queue.ts`, `src/core/utils/graph.ts`, `docs/superpowers/notes/2026-08-11-do-bundle-p0a.md`
- Test: `src/core/__tests__/priority-queue.spec.ts`, `src/core/__tests__/graph.spec.ts`

**Interfaces:**
- Consumes: `Bound`, `IVec`, `IVec3` từ `@blocksuite/global/gfx` (Task 1)
- Produces:
  - `PriorityQueue<T, P>` — constructor nhận `(a: P, b: P) => number`; `enqueue(value: T, priority: P)`, `dequeue(): T | null`
  - `Graph<T>` — dùng bởi `AStarRunner` ở Task 3

- [ ] **Step 1: Chép hai file nguồn và hai test gốc**

Không sửa dòng import nào — alias ở Task 1 làm cho `@blocksuite/global/gfx` phân giải đúng.

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
mkdir -p src/core/utils src/core/__tests__
S="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src"
cp "$S/utils/priority-queue.ts" src/core/utils/priority-queue.ts
cp "$S/utils/graph.ts" src/core/utils/graph.ts
cp "$S/__tests__/priority-queue.unit.spec.ts" src/core/__tests__/priority-queue.spec.ts
cp "$S/__tests__/graph.unit.spec.ts" src/core/__tests__/graph.spec.ts
```

- [ ] **Step 2: Sửa đúng hai dòng import nội bộ trong test**

Hai file trong `src/core/` **không** nằm dưới `src/vendor/`, nên plugin `.js`→`.ts` không áp dụng cho chúng. Sửa tay.

`src/core/__tests__/priority-queue.spec.ts`:
```ts
import { PriorityQueue } from '../utils/priority-queue.js';
```
→
```ts
import { PriorityQueue } from '../utils/priority-queue'
```

`src/core/__tests__/graph.spec.ts` — dòng `import { Bound } from '@blocksuite/global/gfx';` **giữ nguyên**; chỉ đổi:
```ts
import { Graph } from '../utils/graph.js';
```
→
```ts
import { Graph } from '../utils/graph'
```

- [ ] **Step 3: Chạy test, xác nhận XANH**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm test
```

Expected: `Test Files  2 passed (2)`.

Đây cũng là lần đầu chứng minh alias hoạt động trong Vitest, không chỉ trong `tsc`.

- [ ] **Step 4: Đo bundle — trả lời câu hỏi mở**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm run build 2>&1 | grep -E "dist/assets"
grep -rl "y-protocols\|file-type" dist/assets/*.js || echo "SACH: y-protocols va file-type KHONG vao bundle"
```

Ghi kết quả vào `docs/superpowers/notes/2026-08-11-do-bundle-p0a.md`:

```markdown
# Đo bundle sau khi vendor BlockSuite (P0-A)

| | JS thô | JS gzip |
|---|---|---|
| Mốc nền (Task 1 Step 1) | ... kB | ... kB |
| Sau khi vendor + hai tiện ích | ... kB | ... kB |
| **Chênh** | **... kB** | **... kB** |

`y-protocols` / `file-type` trong bundle: CÓ / KHÔNG

Kết luận: (giữ danh sách dependency ở spec §11 / phải sửa)
```

Ghi chú diễn giải: ở chặng này mới chỉ có hai tiện ích nhỏ *dùng* mã vendored, nên phần lớn `src/vendor/` còn bị tree-shake bỏ. Con số này là **sàn**, không phải trần — đo lại ở cuối P0-B khi `std/gfx` đã kéo vào thật.

**Ngưỡng dừng và hỏi:** nếu `y-protocols` hoặc `file-type` **có** trong bundle. Nghĩa là phép đo cây con ở spec §11 sai.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add src/core docs/superpowers/notes
git commit -m "P0-A: hàng đợi ưu tiên và đồ thị định tuyến

Nền của A* tìm đường cho connector gấp khúc. Hai file này nằm trong
affine/blocks/surface — gói dựa trên Lit nên không vendor được, phải
port. Import từ @blocksuite/global giữ nguyên, alias lo phần còn lại.

Kèm số đo bundle đầu tiên sau khi vendor.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  2 passed (2)`, và file notes có mục kết luận đã điền.

---

## Task 3: A* tìm đường cho connector

**Files:**
- Create: `src/core/utils/a-star.ts`
- Test: `src/core/__tests__/a-star.spec.ts`

**Interfaces:**
- Consumes: `Graph`, `PriorityQueue` (Task 2); `almostEqual`, `Bound`, `IVec3` từ `@blocksuite/global/gfx`
- Produces: `AStarRunner` — dùng bởi connector ở P1.2

- [ ] **Step 1: Chép nguồn và test**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
S="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src"
cp "$S/utils/a-star.ts" src/core/utils/a-star.ts
cp "$S/__tests__/a-star.unit.spec.ts" src/core/__tests__/a-star.spec.ts
```

- [ ] **Step 2: Sửa ba dòng import nội bộ**

Dòng `from '@blocksuite/global/gfx'` ở cả hai file **giữ nguyên**.

Trong `src/core/utils/a-star.ts`:
```ts
import { Graph } from './graph.js';
import { PriorityQueue } from './priority-queue.js';
```
→
```ts
import { Graph } from './graph'
import { PriorityQueue } from './priority-queue'
```

Trong `src/core/__tests__/a-star.spec.ts`:
```ts
import { AStarRunner } from '../utils/a-star.js';
```
→
```ts
import { AStarRunner } from '../utils/a-star'
```

Hàm trợ giúp `mergePath` trong test giữ nguyên.

- [ ] **Step 3: Chạy, xác nhận XANH**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx vitest run src/core/__tests__/a-star.spec.ts
```

Expected: `Test Files  1 passed (1)`, mọi ca xanh.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add src/core/utils/a-star.ts src/core/__tests__/a-star.spec.ts
git commit -m "P0-A: A* tìm đường cho connector gấp khúc (114 dòng test)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  3 passed (3)`.

---

## Task 4: `loadingSort` — sắp thứ tự nạp phần tử theo phụ thuộc

**Files:**
- Create: `src/core/utils/sort.ts`
- Test: `src/core/__tests__/sort.spec.ts`

**Interfaces:**
- Consumes: không có — `sort.ts` không import gì
- Produces:
  - `loadingSort<T extends { id: string; deps: string[] }>(elements: T[]): T[]`
  - `sortIndex(a: { id: string; index: string }, b: { id: string; index: string }, groupIndexMap: Map<string, { id: string; index: string }>): number` — **chưa được kiểm ở task này**, xem Task 5

- [ ] **Step 1: Chép nguồn và test**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
S="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src"
cp "$S/utils/sort.ts" src/core/utils/sort.ts
cp "$S/__tests__/sort.unit.spec.ts" src/core/__tests__/sort.spec.ts
```

`sort.ts` không import gì — không sửa dòng nào.

- [ ] **Step 2: Sửa một dòng import trong test**

```ts
import { loadingSort } from '../utils/sort.js';
```
→
```ts
import { loadingSort } from '../utils/sort'
```

- [ ] **Step 3: Chạy, xác nhận XANH**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx vitest run src/core/__tests__/sort.spec.ts
```

Expected: `Tests  3 passed (3)`.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add src/core/utils/sort.ts src/core/__tests__/sort.spec.ts
git commit -m "P0-A: loadingSort — sắp thứ tự nạp phần tử theo phụ thuộc

sort.unit.spec.ts phủ loadingSort. Hàm thứ tự z thật (sortIndex) nằm
cùng file nhưng KHÔNG có test gốc — xem task kế tiếp.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  4 passed (4)`.

---

## Task 5: Test cho `sortIndex` — lỗ hổng không có test gốc

**Files:**
- Test: `src/core/__tests__/sort-index.spec.ts` (MỚI, tự viết)

**Interfaces:**
- Consumes: `sortIndex` từ `src/core/utils/sort.ts` (Task 4)
- Produces: không có API mới

**Vì sao task này tồn tại.** `sortIndex` quyết định thứ tự chồng lớp thật sự — nó so sánh chỉ số phân số **có tính lồng nhóm**: hai phần tử ở hai nhóm khác nhau thì so theo chỉ số của *nhóm*, không phải của phần tử. BlockSuite không có test nào cho nó (spec §10). Sai thứ tự z là loại lỗi hiện ra rất muộn — một nét bút bỗng nằm dưới thẻ ghi chú, không ai biết vì sao.

Chín ca dưới đây đọc trực tiếp từ bốn nhánh của thân hàm, không phải đoán.

- [ ] **Step 1: Viết test**

Create `src/core/__tests__/sort-index.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { sortIndex } from '../utils/sort'

// sortIndex quyết định thứ tự chồng lớp. Bốn nhánh trong thân hàm, theo thứ tự:
//   1. cả hai đều thuộc nhóm  2. chỉ a thuộc nhóm
//   3. chỉ b thuộc nhóm       4. không cái nào thuộc nhóm
// Mỗi nhánh một khối describe bên dưới.

type Entry = { id: string; index: string }

const empty = new Map<string, Entry>()

describe('sortIndex — không phần tử nào thuộc nhóm', () => {
  it('so sánh trực tiếp theo chỉ số phân số', () => {
    expect(sortIndex({ id: 'a', index: 'a0' }, { id: 'b', index: 'a1' }, empty)).toBe(-1)
    expect(sortIndex({ id: 'a', index: 'a1' }, { id: 'b', index: 'a0' }, empty)).toBe(1)
  })

  it('trả 0 khi hai chỉ số bằng nhau', () => {
    expect(sortIndex({ id: 'a', index: 'a0' }, { id: 'b', index: 'a0' }, empty)).toBe(0)
  })

  it('so sánh theo chuỗi, không theo số — "a0V" đứng sau "a0"', () => {
    expect(sortIndex({ id: 'a', index: 'a0' }, { id: 'b', index: 'a0V' }, empty)).toBe(-1)
  })
})

describe('sortIndex — cả hai phần tử đều thuộc nhóm', () => {
  it('khác nhóm thì so theo chỉ số của NHÓM, bỏ qua chỉ số phần tử', () => {
    // a trong nhóm g1 (index 'a0'), b trong nhóm g2 (index 'a5'). Chỉ số phần
    // tử cố tình ngược chiều để chứng minh nhóm mới là thứ quyết định.
    const groups = new Map<string, Entry>([
      ['a', { id: 'g1', index: 'a0' }],
      ['b', { id: 'g2', index: 'a5' }],
    ])
    expect(sortIndex({ id: 'a', index: 'z9' }, { id: 'b', index: 'a0' }, groups)).toBe(-1)
  })

  it('cùng nhóm thì so theo chỉ số phần tử', () => {
    const g: Entry = { id: 'g1', index: 'a0' }
    const groups = new Map<string, Entry>([
      ['a', g],
      ['b', g],
    ])
    expect(sortIndex({ id: 'a', index: 'a0' }, { id: 'b', index: 'a1' }, groups)).toBe(-1)
    expect(sortIndex({ id: 'a', index: 'a1' }, { id: 'b', index: 'a1' }, groups)).toBe(0)
  })
})

describe('sortIndex — chỉ một phần tử thuộc nhóm', () => {
  it('a thuộc nhóm mà b CHÍNH LÀ nhóm đó thì a đứng trên', () => {
    const groups = new Map<string, Entry>([['a', { id: 'g1', index: 'a0' }]])
    expect(sortIndex({ id: 'a', index: 'a9' }, { id: 'g1', index: 'a0' }, groups)).toBe(1)
  })

  it('b thuộc nhóm mà a CHÍNH LÀ nhóm đó thì a đứng dưới', () => {
    const groups = new Map<string, Entry>([['b', { id: 'g1', index: 'a0' }]])
    expect(sortIndex({ id: 'g1', index: 'a0' }, { id: 'b', index: 'a9' }, groups)).toBe(-1)
  })

  it('a thuộc nhóm, b đứng ngoài: so chỉ số nhóm của a với chỉ số của b', () => {
    const groups = new Map<string, Entry>([['a', { id: 'g1', index: 'a5' }]])
    expect(sortIndex({ id: 'a', index: 'z9' }, { id: 'b', index: 'a0' }, groups)).toBe(1)
    expect(sortIndex({ id: 'a', index: 'z9' }, { id: 'b', index: 'a9' }, groups)).toBe(-1)
  })
})

describe('sortIndex — dùng thật trong Array.sort', () => {
  it('xếp một bảng có nhóm ra đúng thứ tự chồng lớp', () => {
    const groups = new Map<string, Entry>([
      ['shape-1', { id: 'g1', index: 'a1' }],
      ['shape-2', { id: 'g1', index: 'a1' }],
    ])
    const elements: Entry[] = [
      { id: 'brush', index: 'a2' },
      { id: 'shape-2', index: 'a1' },
      { id: 'note', index: 'a0' },
      { id: 'shape-1', index: 'a0' },
    ]

    const sorted = [...elements].sort((a, b) => sortIndex(a, b, groups))

    // note (a0) dưới cùng; hai shape thuộc nhóm g1 (a1) giữ thứ tự nội bộ
    // a0 trước a1; brush (a2) trên cùng.
    expect(sorted.map(e => e.id)).toEqual(['note', 'shape-1', 'shape-2', 'brush'])
  })
})
```

- [ ] **Step 2: Chạy, xác nhận XANH**

`sortIndex` đã tồn tại từ Task 4, nên đây là **test đặc tả lại hành vi sẵn có**, không phải TDD sinh mã mới. Bước "đỏ trước" không áp dụng — Step 3 thay thế nó.

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx vitest run src/core/__tests__/sort-index.spec.ts
```

Expected: `Tests  9 passed (9)`.

Nếu có ca đỏ: **đừng sửa test cho khớp mã.** Đọc lại thân `sortIndex`, xác định nhánh nào cho kết quả khác, ghi phát hiện vào phần Rủi ro của spec — có thể ta vừa tìm ra lỗi thật trong BlockSuite, hoặc hiểu sai hàm. Cả hai đều phải dừng và hỏi.

- [ ] **Step 3: Chứng minh test không rỗng**

Một test xanh ngay từ đầu có thể xanh vì chẳng kiểm gì. Đột biến một dòng để chứng minh nó chạm vào mã.

Trong ca *"khác nhóm thì so theo chỉ số của NHÓM"*, tạm đổi:
```ts
    expect(sortIndex({ id: 'a', index: 'z9' }, { id: 'b', index: 'a0' }, groups)).toBe(-1)
```
thành:
```ts
    expect(sortIndex({ id: 'a', index: 'z9' }, { id: 'b', index: 'a0' }, groups)).toBe(1)
```

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx vitest run src/core/__tests__/sort-index.spec.ts
```

Expected: FAIL — `expected -1 to be 1`. Đúng một ca đỏ, tám ca xanh.

Nếu vẫn xanh thì test không gọi tới `sortIndex` — dừng, sửa test, đừng đi tiếp.

Hoàn tác về `-1`, chạy lại, xác nhận `Tests  9 passed (9)`.

- [ ] **Step 4: Chạy toàn bộ, type-check, build**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm test && npx tsc --noEmit && npm run build
```

Expected: `Test Files  5 passed (5)`, tsc im lặng, build thành công.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add src/core/__tests__/sort-index.spec.ts
git commit -m "P0-A: test cho sortIndex — lỗ hổng không có test gốc

sortIndex quyết định thứ tự chồng lớp có tính lồng nhóm; BlockSuite
không có test nào cho nó. 9 ca đọc trực tiếp từ bốn nhánh của thân hàm,
cộng một ca dùng thật trong Array.sort.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  5 passed (5)` và `npm run build` thành công.

---

## Nghiệm thu P0-A

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm test && npx tsc --noEmit && npm run build
```

| Lệnh | Kết quả |
|---|---|
| `npm test` | `Test Files  5 passed (5)` — 258 dòng test gốc port thẳng + 9 ca tự viết cho `sortIndex` |
| `npx tsc --noEmit` | exit 0, không in gì |
| `npm run build` | thành công |

Cộng thêm: `docs/superpowers/notes/2026-08-11-do-bundle-p0a.md` có mục kết luận đã điền.

**Không có mốc kiểm tay trên iPhone ở P0-A** — chặng này không có gì hiện ra màn hình. Danh sách kiểm tay bắt đầu từ P1.0 (spec §10).

## Kế hoạch kế tiếp

**P0-B — port `std/gfx`** (44 file, ~5.500 dòng): `model/base.ts`, `element-model`, `surface-model`, `Viewport`, `Grid`, `Layer`, `ToolController`, `utils/tree.ts` + `tree.unit.spec.ts` (165 dòng).

P0-B là chỗ xử lý **nhóm C** của spec §10: đọc `view.unit.spec.ts` (1015 dòng) và `surface.unit.spec.ts` (418 dòng) như đặc tả, chép khẳng định, bỏ giàn giáo Lit. Và là chỗ đo lại bundle cho ra con số thật, khi `src/vendor/` đã bị kéo vào đầy đủ.
