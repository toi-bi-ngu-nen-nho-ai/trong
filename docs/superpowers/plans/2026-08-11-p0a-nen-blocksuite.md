# P0-A: Nền BlockSuite và tiện ích định tuyến — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cài `@blocksuite/store` + `@blocksuite/global` làm tầng dữ liệu, dựng hạ tầng vitest, port bốn tiện ích định tuyến từ `affine/blocks/surface` (gói dựa trên Lit nên không cài được), và **trả lời hai câu hỏi mở** mà D10 đang treo.

**Architecture:** Theo D10 — tầng dữ liệu **cài** từ npm, `std/gfx` **port**, tầng khung nhìn **viết** bằng React. Kế hoạch này chỉ đụng tầng cài + bốn file tiện ích. `std/gfx` là P0-B.

**Tech Stack:** TypeScript 5.7 (strict) · Vite 8 · Vitest 4 (devDependency) · `@blocksuite/store@0.27.0` · `@blocksuite/global@0.27.0` · `yjs`

## Global Constraints

- `src/core/**` **không import React, không đụng DOM API ở phạm vi module** (spec §4). `DOMMatrix`/`DOMPoint` chỉ được nằm trong thân hàm.
- Test gốc **không được sửa khẳng định**, chỉ sửa dòng `import`. Không đạt là lỗi port (spec §10).
- **Không port lại thứ đã cài.** `bound`, `math-utils`, `curve` nằm trong `@blocksuite/global` — import, đừng chép, và đừng port test của chúng.
- Package được phép đụng: `affine/blocks/surface/src/utils`, `affine/blocks/surface/src/__tests__`. **Đụng ra ngoài = dấu hiệu chệch hướng, dừng và hỏi.**
- Tiếng Việt cho comment mới. Comment gốc tiếng Anh trong file sao chép giữ nguyên.

## Hai câu hỏi mở kế hoạch này phải trả lời

Spec để ngỏ hai điều, và cả hai đều được gạt trong Task 1. Đây là lý do Task 1 tồn tại như một task riêng thay vì gộp vào task sau.

| Câu hỏi | Ở đâu trong spec | Trả lời thế nào |
|---|---|---|
| `file-type` và `minimatch` có rơi khỏi bundle không? | §11 — "phải đo bundle sau chặng đầu tiên" | Task 1 Step 6 |
| Dựng được `BlockStdScope` ngoài `EditorHost` không? Nếu được thì mở lại phương án cài cả `@blocksuite/std` | §11 — "hai phương án đã cân nhắc rồi bỏ", mục 2 | Task 1 Step 7 |

Ký hiệu đường dẫn:

```
$AFF = C:/Users/LENOVO/Downloads/AFFiNE/blocksuite
$W   = C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless
```

## File Structure

```
package.json         sửa — 3 dependency, 1 devDependency, script test
vite.config.ts       sửa — khối test của vitest
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
docs/superpowers/notes/
  2026-08-11-do-bundle-p0a.md   MỚI — kết quả đo, để phiên sau tra
```

---

## Task 1: Cài nền, dựng vitest, gạt hai câu hỏi mở

**Files:**
- Modify: `package.json`, `vite.config.ts`
- Create: `src/core/probe-std-scope.ts` (tạm, xoá ở Step 8), `docs/superpowers/notes/2026-08-11-do-bundle-p0a.md`

**Interfaces:**
- Consumes: không có
- Produces:
  - Import được `Bound`, `Vec`, `PointLocation`, `almostEqual`, `IVec`, `IVec3` từ `@blocksuite/global/gfx`
  - Import được `Text`, `Boxed`, `defineBlockSchema` từ `@blocksuite/store`
  - Script `npm test` chạy `vitest run`
  - Ghi chú đo bundle tại `docs/superpowers/notes/2026-08-11-do-bundle-p0a.md`

- [ ] **Step 1: Ghi lại kích thước bundle TRƯỚC khi thêm gì**

Cần con số nền để Step 6 có cái mà trừ.

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm run build 2>&1 | grep -E "dist/assets"
```

Expected: ba dòng, trong đó dòng JS khoảng `dist/assets/index-*.js  996 kB │ gzip: 331 kB`. Ghi lại đúng hai số đó — chúng là mốc nền.

- [ ] **Step 2: Cài ba dependency chạy thật**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm install @blocksuite/store@0.27.0 @blocksuite/global@0.27.0 yjs
```

Expected: `added N packages`.

**Nếu lệnh này thất bại vì không có phiên bản 0.27.0 trên npm:** dừng lại và hỏi. Đó là tiền đề của D10; không có gói thì phải quay về phương án port toàn bộ (spec §11, "phương án đã cân nhắc rồi bỏ" mục 1) và cả kế hoạch này phải viết lại. **Đừng tự ý đổi sang phiên bản khác** — API giữa các bản minor của BlockSuite có đổi.

- [ ] **Step 3: Cài vitest**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm install -D vitest@^4.1.8
```

Kiểm `package.json`: `vitest` phải nằm trong `devDependencies`, ba gói ở Step 2 nằm trong `dependencies`.

- [ ] **Step 4: Thêm script test**

Trong `package.json`, khối `"scripts"` đổi từ:

```json
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "format": "oxfmt"
  },
```

thành:

```json
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "format": "oxfmt"
  },
```

- [ ] **Step 5: Cấu hình vitest**

`defineConfig` của `vite` không nhận khoá `test`. Trong `vite.config.ts`, dòng 1 đổi từ:

```ts
import { defineConfig } from 'vite'
```

thành:

```ts
import { defineConfig } from 'vitest/config'
```

Thêm khối `test` vào object trả về, ngay sau khối `preview`:

```ts
    test: {
      // Môi trường node: không test nào trong P0-A chạm DOM. Khi P0-B port
      // viewport (có nhánh DOMMatrix) thì đổi sang 'happy-dom'.
      environment: 'node',
      include: ['src/**/__tests__/**/*.spec.ts'],
    },
```

- [ ] **Step 6: Đo bundle — trả lời câu hỏi mở thứ nhất**

Tạo một file tạm nhập đúng những thứ P0 sẽ dùng, để bundler có cái mà tree-shake thật.

Create `src/core/probe-std-scope.ts`:

```ts
// FILE TẠM — xoá ở Step 8. Tồn tại để đo xem cài @blocksuite/store +
// @blocksuite/global kéo thêm bao nhiêu byte vào bundle, và file-type với
// minimatch có rơi ra không (spec §11).
import { Bound, Vec } from '@blocksuite/global/gfx'
import { Text } from '@blocksuite/store'

export function probe(): string {
  const b = new Bound(0, 0, 10, 10)
  const v = Vec.add([1, 1], [2, 2])
  const t = new Text('do bundle')
  return `${b.serialize()}|${v.join(',')}|${t.toString()}`
}
```

Tạm nhập nó vào `src/main.tsx` để bundler không loại cả file (thêm vào cuối file):

```ts
import { probe } from './core/probe-std-scope'
if (import.meta.env.DEV) console.debug(probe())
```

Rồi build và đo:

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm run build 2>&1 | grep -E "dist/assets"
grep -rl "minimatch\|file-type" dist/assets/*.js || echo "SACH: file-type va minimatch KHONG vao bundle"
```

Ghi kết quả vào `docs/superpowers/notes/2026-08-11-do-bundle-p0a.md` theo mẫu:

```markdown
# Đo bundle sau khi cài @blocksuite/store + global (P0-A Task 1)

| | JS thô | JS gzip |
|---|---|---|
| Trước khi cài (mốc nền, Step 1) | ... kB | ... kB |
| Sau khi cài + probe | ... kB | ... kB |
| **Chênh** | **... kB** | **... kB** |

`file-type` / `minimatch` có trong bundle: CÓ / KHÔNG

Kết luận: (giữ D10 / xét lại D10)
```

**Ngưỡng phải dừng và hỏi:** nếu phần gzip tăng **quá 150 kB**, hoặc `file-type`/`minimatch` **có** trong bundle. Cả hai đều là dấu hiệu D10 sai giá, và spec §11 đã hẹn trước là sẽ xét lại.

- [ ] **Step 7: Thử dựng `BlockStdScope` — trả lời câu hỏi mở thứ hai**

Nếu dựng được ngoài `EditorHost` thì phương án trung thành hơn (cài cả `@blocksuite/std`) mở lại được, và P0-B thu nhỏ rất nhiều. Đáng 10 phút để biết.

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm install -D @blocksuite/std@0.27.0
node -e "import('@blocksuite/std').then(m => console.log(Object.keys(m).filter(k => /Std|Scope|Gfx/.test(k)).join('\n'))).catch(e => console.log('LOI:', e.message))"
```

Ghi vào cùng file notes ở Step 6, thêm mục:

```markdown
## BlockStdScope dựng được ngoài EditorHost?

Xuất khẩu liên quan: (dán kết quả lệnh node -e)

Kết luận: (mở lại phương án cài @blocksuite/std / giữ D10 port std/gfx)
```

Rồi gỡ ra, vì đây chỉ là thăm dò:

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm uninstall @blocksuite/std
```

**Nếu kết quả cho thấy dựng được:** dừng lại và hỏi trước khi làm P0-B. Đổi hướng lúc này rẻ; đổi sau khi port xong 44 file thì không.

- [ ] **Step 8: Dọn file thăm dò**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
rm src/core/probe-std-scope.ts
```

Và bỏ hai dòng vừa thêm vào cuối `src/main.tsx` (dòng `import { probe }` và dòng `if (import.meta.env.DEV)`).

- [ ] **Step 9: Xác nhận nền còn sạch**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx tsc --noEmit && npm run build
```

Expected: tsc im lặng exit 0; build thành công. Kích thước bundle phải quay về gần mốc nền ở Step 1 (chênh vài trăm byte là bình thường).

- [ ] **Step 10: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add package.json package-lock.json vite.config.ts src/main.tsx docs/superpowers/notes
git commit -m "P0-A: cài nền BlockSuite và dựng vitest

@blocksuite/store + @blocksuite/global 0.27.0 làm tầng dữ liệu (D10),
yjs khai tường minh vì tầng lưu trữ gọi Y.* trực tiếp.

Gạt hai câu hỏi mở của spec §11: đo bundle, và thử dựng BlockStdScope
ngoài EditorHost. Kết quả ở docs/superpowers/notes/.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong (một, kiểm được bằng lệnh):** `npx tsc --noEmit && npm run build` exit 0, **và** file `docs/superpowers/notes/2026-08-11-do-bundle-p0a.md` có đủ hai mục kết luận đã điền.

---

## Task 2: Hàng đợi ưu tiên và đồ thị định tuyến

**Files:**
- Create: `src/core/utils/priority-queue.ts`, `src/core/utils/graph.ts`
- Test: `src/core/__tests__/priority-queue.spec.ts`, `src/core/__tests__/graph.spec.ts`

**Interfaces:**
- Consumes: `Bound`, `IVec`, `IVec3` từ `@blocksuite/global/gfx` (Task 1)
- Produces:
  - `PriorityQueue<T, P>` — constructor nhận `(a: P, b: P) => number`; `enqueue(value: T, priority: P)`, `dequeue(): T | null`
  - `Graph<T>` — dùng bởi `AStarRunner` ở Task 3

- [ ] **Step 1: Sao chép hai file nguồn**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
mkdir -p src/core/utils src/core/__tests__
AFF="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src"
cp "$AFF/utils/priority-queue.ts" src/core/utils/priority-queue.ts
cp "$AFF/utils/graph.ts" src/core/utils/graph.ts
```

- [ ] **Step 2: Sửa import trong graph.ts**

`priority-queue.ts` không import gì — để nguyên, không sửa dòng nào.

Trong `src/core/utils/graph.ts`, dòng 1:

```ts
import type { Bound, IVec, IVec3 } from '@blocksuite/global/gfx';
```

**giữ nguyên** — gói này đã cài ở Task 1. Khối import giá trị ở dòng ~2–6 kết thúc bằng `} from '@blocksuite/global/gfx';` cũng giữ nguyên.

Chỉ sửa đuôi `.js` nếu có import nội bộ:

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
sed -i "s/\(from '\.[^']*\)\.js'/\1'/g" src/core/utils/graph.ts src/core/utils/priority-queue.ts
grep -n "\.js'" src/core/utils/*.ts || echo "SACH: khong con duoi .js trong import noi bo"
```

- [ ] **Step 3: Sao chép hai test gốc**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
AFT="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/__tests__"
cp "$AFT/priority-queue.unit.spec.ts" src/core/__tests__/priority-queue.spec.ts
cp "$AFT/graph.unit.spec.ts" src/core/__tests__/graph.spec.ts
```

- [ ] **Step 4: Sửa import trong hai test**

`src/core/__tests__/priority-queue.spec.ts` — một dòng:

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

- [ ] **Step 5: Chạy, xác nhận XANH**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm test
```

Expected: `Test Files  2 passed (2)`.

- [ ] **Step 6: Type-check và ràng buộc cứng**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx tsc --noEmit
grep -rn "from 'react'" src/core && echo "VI PHAM" || echo "OK: core khong import React"
```

Expected: tsc im lặng; dòng `OK:`.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add src/core
git commit -m "P0-A: hàng đợi ưu tiên và đồ thị định tuyến

Nền của A* tìm đường cho connector gấp khúc. Hai file này nằm trong
affine/blocks/surface — gói dựa trên Lit nên không cài được, phải port.
Import từ @blocksuite/global giữ nguyên vì gói đó đã cài.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  2 passed (2)`.

---

## Task 3: A* tìm đường cho connector

**Files:**
- Create: `src/core/utils/a-star.ts`
- Test: `src/core/__tests__/a-star.spec.ts`

**Interfaces:**
- Consumes: `Graph`, `PriorityQueue` (Task 2); `almostEqual`, `Bound`, `IVec3` từ `@blocksuite/global/gfx`
- Produces: `AStarRunner` — dùng bởi connector ở P1.2

- [ ] **Step 1: Sao chép nguồn**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/utils/a-star.ts" \
   src/core/utils/a-star.ts
```

- [ ] **Step 2: Sửa hai dòng import nội bộ**

Trong `src/core/utils/a-star.ts`, dòng 1 (`from '@blocksuite/global/gfx'`) **giữ nguyên**. Đổi hai dòng sau:

```ts
import { Graph } from './graph.js';
import { PriorityQueue } from './priority-queue.js';
```
→
```ts
import { Graph } from './graph'
import { PriorityQueue } from './priority-queue'
```

- [ ] **Step 3: Sao chép test gốc**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/__tests__/a-star.unit.spec.ts" \
   src/core/__tests__/a-star.spec.ts
```

- [ ] **Step 4: Sửa một dòng import trong test**

Hai dòng đầu (`from '@blocksuite/global/gfx'`) **giữ nguyên**. Đổi:

```ts
import { AStarRunner } from '../utils/a-star.js';
```
→
```ts
import { AStarRunner } from '../utils/a-star'
```

Hàm trợ giúp `mergePath` trong test giữ nguyên, không sửa.

- [ ] **Step 5: Chạy, xác nhận XANH**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx vitest run src/core/__tests__/a-star.spec.ts
```

Expected: `Test Files  1 passed (1)`, mọi ca xanh.

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add src/core/utils/a-star.ts src/core/__tests__/a-star.spec.ts
git commit -m "P0-A: A* tìm đường cho connector gấp khúc (114 dòng test)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  3 passed (3)`.

---

## Task 4: Sắp thứ tự nạp phần tử theo phụ thuộc

**Files:**
- Create: `src/core/utils/sort.ts`
- Test: `src/core/__tests__/sort.spec.ts`

**Interfaces:**
- Consumes: không có — `sort.ts` không import gì
- Produces:
  - `loadingSort<T extends { id: string; deps: string[] }>(elements: T[]): T[]`
  - `sortIndex(a: { id: string; index: string }, b: { id: string; index: string }, groupIndexMap: Map<string, { id: string; index: string }>): number` — **chưa được kiểm ở task này**, xem Task 5

- [ ] **Step 1: Sao chép nguồn**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/utils/sort.ts" \
   src/core/utils/sort.ts
```

File này không import gì — không sửa dòng nào.

- [ ] **Step 2: Sao chép test gốc và sửa một dòng import**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/__tests__/sort.unit.spec.ts" \
   src/core/__tests__/sort.spec.ts
```

Trong `src/core/__tests__/sort.spec.ts`:

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

Cộng thêm: `docs/superpowers/notes/2026-08-11-do-bundle-p0a.md` phải có đủ **hai mục kết luận** đã điền (đo bundle, và `BlockStdScope`).

**Không có mốc kiểm tay trên iPhone ở P0-A** — chặng này không có gì hiện ra màn hình. Danh sách kiểm tay bắt đầu từ P1.0 (spec §10).

## Kế hoạch kế tiếp

**P0-B — port `std/gfx`** (44 file, ~5.500 dòng): `model/base.ts`, `element-model`, `surface-model`, `Viewport`, `Grid`, `Layer`, `ToolController`, `utils/tree.ts` + `tree.unit.spec.ts` (165 dòng, nhóm A còn nợ).

P0-B là chỗ xử lý **nhóm C** của spec §10: đọc `view.unit.spec.ts` (1015 dòng) và `surface.unit.spec.ts` (418 dòng) như đặc tả, chép khẳng định, bỏ giàn giáo Lit.

**Điều kiện tiên quyết:** Task 1 Step 7 của kế hoạch này phải kết luận là **không** dựng được `BlockStdScope` ngoài `EditorHost`. Nếu dựng được thì P0-B phải viết lại theo hướng cài `@blocksuite/std`, và phần lớn 5.500 dòng kia biến mất.
