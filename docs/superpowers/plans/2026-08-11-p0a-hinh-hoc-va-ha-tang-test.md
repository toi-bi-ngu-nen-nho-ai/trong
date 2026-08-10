# P0-A: Tầng hình học và hạ tầng kiểm thử — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng `src/core/gfx/` và `src/core/utils/` — tầng hình học thuần, không phụ thuộc React/DOM — cùng hạ tầng vitest, và chứng minh trung thành bằng 617 dòng test gốc của BlockSuite port thẳng.

**Architecture:** Port theo lối **sao chép rồi sửa import**, không viết lại. Mã gốc ở `C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/global/src/gfx` và `.../affine/blocks/surface/src/utils` là thư viện thuần, không import gì ngoài chính nó — nên bước "triển khai" của mỗi task là copy file + một danh sách sửa import chính xác, còn bước "kiểm" là chạy test gốc đã đổi đường dẫn import.

**Tech Stack:** TypeScript 5.7 (strict) · Vite 8 · Vitest 4 (devDependency mới) · không thêm dependency chạy thật nào trong P0-A.

## Global Constraints

- `src/core/**` **không được import React, không được đụng DOM API ở phạm vi module.** Đây là ràng buộc cứng của spec §4. `DOMMatrix`/`DOMPoint` chỉ được xuất hiện *bên trong thân hàm*, không ở top level.
- Không thêm dependency chạy thật. `vitest` là **devDependency**.
- Môi trường test là `node`. Đã kiểm: không test nào trong P0-A chạm DOM (`rotatePoints` dùng `Vec.rotWith` thuần, không phải nhánh `DOMMatrix`).
- Mọi file sao chép giữ nguyên **nội dung hàm**. Chỉ được sửa: đường dẫn import, và bỏ đuôi `.js` trong specifier.
- Test gốc **không được sửa khẳng định**. Chỉ sửa dòng `import`. Không đạt là lỗi port, không phải cớ sửa test (spec §10).
- Package được phép đụng trong P0-A: `framework/global/src/gfx`, `affine/blocks/surface/src/utils`, `affine/blocks/surface/src/__tests__`, `framework/global/src/__tests__`. **Đụng ra ngoài danh sách này = dấu hiệu chệch hướng, dừng lại và hỏi.**
- Tiếng Việt cho mọi comment mới viết. Comment gốc tiếng Anh trong file sao chép **giữ nguyên**, không dịch.

---

## Phạm vi và ranh giới

P0-A là nửa đầu của P0 trong spec. Nửa sau (P0-B: element model, Store trên Yjs, Viewport, Grid, Layer, ToolController, IndexedDBDocSource) là kế hoạch riêng, vì nó phụ thuộc việc chép khẳng định từ nhóm C ở spec §10 — một bước thiết kế đáng kể tự nó.

**Không thuộc P0-A:**

| | Vì sao |
|---|---|
| `utils/tree.ts` + `tree.unit.spec.ts` | Cần `gfx/model/base.ts` (symbol lúc chạy), thuộc tầng element model → P0-B |
| `polyline.ts`, `svg-path.ts` | Chỉ connector dùng → P1.2 |
| `perfect-freehand/` | Chỉ brush dùng → P1.4 |
| `pan-tool.unit.spec.ts` (nhóm B) | Cần ToolController → P0-B |

## File Structure

```
src/core/gfx/
  index.ts            MỚI — chỉ re-export những gì P0-A thật sự có
  bound.ts            chép từ global/src/gfx/bound.ts
  curve.ts            chép từ global/src/gfx/curve.ts
  math.ts             chép từ global/src/gfx/math.ts
  xywh.ts             chép từ global/src/gfx/xywh.ts
  model/
    index.ts          chép
    bound.ts          chép — lớp Bound
    point.ts          chép
    point-location.ts chép
    vec.ts            chép — Vec, không import gì
src/core/utils/
  priority-queue.ts   chép từ surface/src/utils/priority-queue.ts
  graph.ts            chép
  a-star.ts           chép
  sort.ts             chép — loadingSort + sortIndex
src/core/__tests__/
  bound.spec.ts           port
  math-utils.spec.ts      port
  curve.spec.ts           port
  priority-queue.spec.ts  port
  graph.spec.ts           port
  a-star.spec.ts          port
  sort.spec.ts            port
  sort-index.spec.ts      MỚI — sortIndex không có test gốc
vite.config.ts        sửa — thêm khối test của vitest
package.json          sửa — thêm script test + devDependency vitest
```

Ký hiệu đường dẫn dùng trong toàn bộ kế hoạch:

```
$AFF = C:/Users/LENOVO/Downloads/AFFiNE/blocksuite
$W   = C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless
```

---

## Task 1: Hạ tầng vitest và tầng hình học lõi

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/core/gfx/xywh.ts`, `src/core/gfx/math.ts`, `src/core/gfx/bound.ts`, `src/core/gfx/model/{index,bound,point,point-location,vec}.ts`, `src/core/gfx/index.ts`
- Test: `src/core/__tests__/bound.spec.ts`

**Interfaces:**
- Consumes: không có (task đầu tiên)
- Produces:
  - `src/core/gfx/index.ts` re-export: `Bound` (class), `IBound`, `Vec`, `IVec`, `IVec3`, `PointLocation`, `Point`, `XYWH`, `SerializedXYWH`, `serializeXYWH`, `deserializeXYWH`, `getCommonBound(bounds: IBound[]): Bound | null`, `inflateBound(bound: IBound, delta: number): Bound`, `transformPointsToNewBound`, `almostEqual`, `lineIntersects`, `toRadian`, `toDegree`, `rotatePoints`, `clamp`
  - Script `npm test` chạy `vitest run`

- [ ] **Step 1: Thêm vitest làm devDependency**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm install -D vitest@^4.1.8
```

Expected: `added N packages`. Kiểm `package.json` có `"vitest": "^4.1.8"` trong `devDependencies` và **không** có gì mới trong `dependencies`.

- [ ] **Step 2: Thêm script test vào package.json**

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

- [ ] **Step 3: Cấu hình vitest trong vite.config.ts**

`defineConfig` phải đổi nguồn import — bản của `vite` không nhận khoá `test`.

Dòng 1 đổi từ:

```ts
import { defineConfig } from 'vite'
```

thành:

```ts
import { defineConfig } from 'vitest/config'
```

Rồi thêm khối `test` vào object trả về, ngay sau khối `preview`:

```ts
    preview: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
    },
    test: {
      // Môi trường node: không test nào trong P0-A chạm DOM. Khi P1.0 cần
      // render thật thì đổi sang 'happy-dom' và thêm devDependency tương ứng.
      environment: 'node',
      include: ['src/**/__tests__/**/*.spec.ts'],
    },
```

- [ ] **Step 4: Sao chép tầng hình học**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
mkdir -p src/core/gfx/model src/core/utils src/core/__tests__
AFF="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite"
cp "$AFF/framework/global/src/gfx/xywh.ts" src/core/gfx/xywh.ts
cp "$AFF/framework/global/src/gfx/math.ts" src/core/gfx/math.ts
cp "$AFF/framework/global/src/gfx/bound.ts" src/core/gfx/bound.ts
cp "$AFF/framework/global/src/gfx/curve.ts" src/core/gfx/curve.ts
cp "$AFF/framework/global/src/gfx/model/index.ts" src/core/gfx/model/index.ts
cp "$AFF/framework/global/src/gfx/model/bound.ts" src/core/gfx/model/bound.ts
cp "$AFF/framework/global/src/gfx/model/point.ts" src/core/gfx/model/point.ts
cp "$AFF/framework/global/src/gfx/model/point-location.ts" src/core/gfx/model/point-location.ts
cp "$AFF/framework/global/src/gfx/model/vec.ts" src/core/gfx/model/vec.ts
ls -R src/core
```

Expected: 9 file dưới `src/core/gfx/`, hai thư mục `utils` và `__tests__` rỗng.

- [ ] **Step 5: Bỏ đuôi `.js` trong mọi specifier vừa chép**

Dự án dùng `moduleResolution: "bundler"`; specifier `./vec.js` trỏ vào file `.ts` sẽ không phân giải. Bỏ đuôi đi.

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
find src/core -name "*.ts" -exec sed -i "s/\(from '[^']*\)\.js'/\1'/g" {} +
grep -rn "\.js'" src/core || echo "SACH: khong con duoi .js"
```

Expected: in ra `SACH: khong con duoi .js`

- [ ] **Step 6: Viết index.ts của tầng gfx**

Không chép `index.ts` gốc — nó re-export `polyline`, `svg-path`, `perfect-freehand` mà P0-A không có.

Create `src/core/gfx/index.ts`:

```ts
// Tầng hình học thuần của BlockKit — sao chép từ BlockSuite
// (framework/global/src/gfx). KHÔNG import React, KHÔNG đụng DOM ở phạm vi
// module: cùng công thức này chạy ở ba nơi — React render, cập nhật DOM trực
// tiếp lúc kéo, và vẽ lại bằng canvas khi xuất PNG (xem spec §4).
//
// Cố ý chưa re-export polyline / svg-path (connector, P1.2) và perfect-freehand
// (brush, P1.4). Thêm khi chặng đó tới, không thêm trước.
export * from './bound'
export * from './curve'
export * from './math'
export * from './model'
export * from './xywh'
```

- [ ] **Step 7: Port bound.unit.spec.ts**

Sao chép rồi sửa đúng một dòng import.

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/__tests__/bound.unit.spec.ts" \
   src/core/__tests__/bound.spec.ts
```

Trong `src/core/__tests__/bound.spec.ts`, đổi:

```ts
} from '@blocksuite/global/gfx';
```

thành:

```ts
} from '../gfx';
```

Không sửa gì khác. 26 ca kiểm thử giữ nguyên từng chữ.

- [ ] **Step 8: Chạy test, xác nhận XANH**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless" && npm test
```

Expected: `Test Files  1 passed (1)` và `Tests  26 passed (26)`.

Nếu đỏ vì thiếu export: đó là lỗi ở Step 6 (index.ts thiếu re-export), sửa index.ts — **không** sửa test.

- [ ] **Step 9: Xác nhận type-check còn sạch**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless" && npx tsc --noEmit
```

Expected: không in ra gì, exit 0.

- [ ] **Step 10: Xác nhận ràng buộc cứng — core không đụng React/DOM ở top level**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
grep -rn "from 'react'\|from \"react\"" src/core && echo "VI PHAM" || echo "OK: core khong import React"
grep -rn "^const .*DOMMatrix\|^const .*document\." src/core && echo "VI PHAM" || echo "OK: khong co DOM o top level"
```

Expected: hai dòng `OK:`.

- [ ] **Step 11: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add package.json package-lock.json vite.config.ts src/core
git commit -m "P0-A: hạ tầng vitest và tầng hình học lõi

Sao chép framework/global/src/gfx của BlockSuite sang src/core/gfx —
Bound, Vec, PointLocation, math, curve, xywh. Chỉ sửa specifier import
(bỏ đuôi .js), giữ nguyên thân hàm.

bound.unit.spec.ts port thẳng, 26 ca, chỉ đổi một dòng import.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong (một, kiểm được bằng lệnh):** `npm test` in ra `Tests  26 passed (26)`.

---

## Task 2: Port test toán hình học

**Files:**
- Test: `src/core/__tests__/math-utils.spec.ts`

**Interfaces:**
- Consumes: `src/core/gfx/index.ts` từ Task 1 — cụ thể `almostEqual`, `isPointOnLineSegment`, `IVec`, `lineEllipseIntersects`, `lineIntersects`, `linePolygonIntersects`, `linePolylineIntersects`, `pointAlmostEqual`, `polygonGetPointTangent`, `rotatePoints`, `toDegree`, `toRadian`
- Produces: không có API mới — task này chỉ chứng minh `math.ts` đã chép đúng

- [ ] **Step 1: Sao chép test gốc**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/__tests__/math-utils.unit.spec.ts" \
   src/core/__tests__/math-utils.spec.ts
```

- [ ] **Step 2: Sửa đúng một dòng import**

Trong `src/core/__tests__/math-utils.spec.ts`, đổi:

```ts
} from '@blocksuite/global/gfx';
```

thành:

```ts
} from '../gfx';
```

- [ ] **Step 3: Chạy chỉ file này, xác nhận XANH**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx vitest run src/core/__tests__/math-utils.spec.ts
```

Expected: `Test Files  1 passed (1)`, không có ca nào đỏ.

Ghi chú cho người thực thi: `rotatePoints` ở đây dùng `Vec.rotWith` thuần — **không** phải nhánh `DOMMatrix` trong `math.ts`. Vì vậy môi trường `node` chạy được. Nếu gặp `ReferenceError: DOMMatrix is not defined` thì nghĩa là đã chép nhầm hàm, xem lại Step 4 của Task 1.

- [ ] **Step 4: Chạy toàn bộ, xác nhận không làm hỏng gì**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless" && npm test
```

Expected: `Test Files  2 passed (2)`.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add src/core/__tests__/math-utils.spec.ts
git commit -m "P0-A: port math-utils.unit.spec.ts (157 dòng)

Giao cắt đường-đường, đường-ellipse, đường-đa giác, tiếp tuyến đa giác,
xoay điểm. Chỉ đổi một dòng import.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  2 passed (2)`.

---

## Task 3: Port test tham số Bézier

**Files:**
- Test: `src/core/__tests__/curve.spec.ts`

**Interfaces:**
- Consumes: `getBezierParameters` từ `src/core/gfx/curve.ts`; `PointLocation` từ `src/core/gfx/model`
- Produces: không có API mới

- [ ] **Step 1: Sao chép test gốc**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/global/src/__tests__/curve.unit.spec.ts" \
   src/core/__tests__/curve.spec.ts
```

- [ ] **Step 2: Sửa hai dòng import**

Trong `src/core/__tests__/curve.spec.ts`, đổi:

```ts
import { getBezierParameters } from '../gfx/curve.js';
import { PointLocation } from '../gfx/model/index.js';
```

thành:

```ts
import { getBezierParameters } from '../gfx/curve';
import { PointLocation } from '../gfx/model';
```

(Đường dẫn tương đối trùng hợp giống nhau vì cấu trúc thư mục ta đặt khớp bản gốc — chỉ bỏ đuôi `.js` và `/index`.)

- [ ] **Step 3: Chạy, xác nhận XANH**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx vitest run src/core/__tests__/curve.spec.ts
```

Expected: `Tests  2 passed (2)` — ca đường dẫn rỗng và ca đường dẫn một điểm.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add src/core/__tests__/curve.spec.ts
git commit -m "P0-A: port curve.unit.spec.ts (22 dòng)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  3 passed (3)`.

---

## Task 4: Hàng đợi ưu tiên và đồ thị định tuyến

**Files:**
- Create: `src/core/utils/priority-queue.ts`, `src/core/utils/graph.ts`
- Test: `src/core/__tests__/priority-queue.spec.ts`, `src/core/__tests__/graph.spec.ts`

**Interfaces:**
- Consumes: `Bound`, `IVec`, `IVec3` từ `src/core/gfx`
- Produces:
  - `PriorityQueue<T, P>` — constructor nhận `(a: P, b: P) => number`; phương thức `enqueue(value: T, priority: P)`, `dequeue(): T | null`
  - `Graph<T>` — dùng bởi `AStarRunner` ở Task 5

- [ ] **Step 1: Sao chép hai file nguồn**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
AFF="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/utils"
cp "$AFF/priority-queue.ts" src/core/utils/priority-queue.ts
cp "$AFF/graph.ts" src/core/utils/graph.ts
```

- [ ] **Step 2: Sửa import trong graph.ts**

`priority-queue.ts` không import gì, để nguyên. Trong `src/core/utils/graph.ts`, đổi cả hai chỗ:

```ts
import type { Bound, IVec, IVec3 } from '@blocksuite/global/gfx';
```

thành:

```ts
import type { Bound, IVec, IVec3 } from '../gfx';
```

và khối import giá trị (dòng ~2–6, kết thúc bằng `} from '@blocksuite/global/gfx';`) đổi đuôi thành:

```ts
} from '../gfx';
```

- [ ] **Step 3: Sao chép hai test gốc**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
AFT="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/__tests__"
cp "$AFT/priority-queue.unit.spec.ts" src/core/__tests__/priority-queue.spec.ts
cp "$AFT/graph.unit.spec.ts" src/core/__tests__/graph.spec.ts
```

- [ ] **Step 4: Sửa import trong hai test**

`src/core/__tests__/priority-queue.spec.ts`:

```ts
import { PriorityQueue } from '../utils/priority-queue.js';
```
→
```ts
import { PriorityQueue } from '../utils/priority-queue'
```

`src/core/__tests__/graph.spec.ts` — hai dòng:

```ts
import { Bound } from '@blocksuite/global/gfx';
...
import { Graph } from '../utils/graph.js';
```
→
```ts
import { Bound } from '../gfx'
...
import { Graph } from '../utils/graph'
```

- [ ] **Step 5: Chạy, xác nhận XANH**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx vitest run src/core/__tests__/priority-queue.spec.ts src/core/__tests__/graph.spec.ts
```

Expected: `Test Files  2 passed (2)`.

- [ ] **Step 6: Type-check**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless" && npx tsc --noEmit
```

Expected: exit 0, không in gì.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add src/core/utils src/core/__tests__/priority-queue.spec.ts src/core/__tests__/graph.spec.ts
git commit -m "P0-A: hàng đợi ưu tiên và đồ thị định tuyến

Nền của A* tìm đường cho connector gấp khúc (Task 5). Port 2 test gốc.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  5 passed (5)`.

---

## Task 5: A* tìm đường cho connector

**Files:**
- Create: `src/core/utils/a-star.ts`
- Test: `src/core/__tests__/a-star.spec.ts`

**Interfaces:**
- Consumes: `Graph` (Task 4), `PriorityQueue` (Task 4), `almostEqual`, `Bound`, `IVec3` (Task 1)
- Produces: `AStarRunner` — dùng bởi connector ở P1.2

- [ ] **Step 1: Sao chép nguồn**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/utils/a-star.ts" \
   src/core/utils/a-star.ts
```

- [ ] **Step 2: Sửa ba dòng import**

Trong `src/core/utils/a-star.ts`:

```ts
import { almostEqual, type Bound, type IVec3 } from '@blocksuite/global/gfx';
import { Graph } from './graph.js';
import { PriorityQueue } from './priority-queue.js';
```
→
```ts
import { almostEqual, type Bound, type IVec3 } from '../gfx'
import { Graph } from './graph'
import { PriorityQueue } from './priority-queue'
```

- [ ] **Step 3: Sao chép test gốc**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/__tests__/a-star.unit.spec.ts" \
   src/core/__tests__/a-star.spec.ts
```

- [ ] **Step 4: Sửa ba dòng import trong test**

```ts
import type { IVec, IVec3 } from '@blocksuite/global/gfx';
import { almostEqual } from '@blocksuite/global/gfx';
import { AStarRunner } from '../utils/a-star.js';
```
→
```ts
import type { IVec, IVec3 } from '../gfx'
import { almostEqual } from '../gfx'
import { AStarRunner } from '../utils/a-star'
```

Hàm trợ giúp `mergePath` trong test **giữ nguyên**, không sửa.

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

**Tiêu chí xong:** `npm test` in ra `Test Files  6 passed (6)`.

---

## Task 6: Sắp thứ tự nạp phần tử theo phụ thuộc

**Files:**
- Create: `src/core/utils/sort.ts`
- Test: `src/core/__tests__/sort.spec.ts`

**Interfaces:**
- Consumes: không có (sort.ts không import gì)
- Produces:
  - `loadingSort<T extends { id: string; deps: string[] }>(elements: T[]): T[]`
  - `sortIndex(a: { id: string; index: string }, b: { id: string; index: string }, groupIndexMap: Map<string, { id: string; index: string }>): number` — **chưa được kiểm ở task này**, xem Task 7

- [ ] **Step 1: Sao chép nguồn**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/utils/sort.ts" \
   src/core/utils/sort.ts
```

File này không import gì — không cần sửa dòng nào.

- [ ] **Step 2: Sao chép test gốc**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/blocks/surface/src/__tests__/sort.unit.spec.ts" \
   src/core/__tests__/sort.spec.ts
```

- [ ] **Step 3: Sửa một dòng import**

```ts
import { loadingSort } from '../utils/sort.js';
```
→
```ts
import { loadingSort } from '../utils/sort'
```

- [ ] **Step 4: Chạy, xác nhận XANH**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx vitest run src/core/__tests__/sort.spec.ts
```

Expected: `Tests  3 passed (3)`.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add src/core/utils/sort.ts src/core/__tests__/sort.spec.ts
git commit -m "P0-A: loadingSort — sắp thứ tự nạp phần tử theo phụ thuộc

sort.unit.spec.ts phủ loadingSort. Hàm thứ tự z thật (sortIndex) nằm
cùng file nhưng KHÔNG có test gốc — xem task kế tiếp.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  7 passed (7)`.

---

## Task 7: Test cho `sortIndex` — lỗ hổng không có test gốc

**Files:**
- Test: `src/core/__tests__/sort-index.spec.ts` (MỚI, tự viết)

**Interfaces:**
- Consumes: `sortIndex` từ `src/core/utils/sort.ts` (Task 6)
- Produces: không có API mới

**Vì sao task này tồn tại.** `sortIndex` quyết định thứ tự chồng lớp thật sự — nó so sánh chỉ số phân số **có tính lồng nhóm**: nếu hai phần tử thuộc hai nhóm khác nhau thì so theo chỉ số của *nhóm*, không phải của phần tử. BlockSuite không có test nào cho nó (spec §10). Sai thứ tự z là loại lỗi hiện ra rất muộn — một nét bút bỗng nằm dưới thẻ ghi chú, và không ai biết vì sao — nên nó đáng được kiểm kỹ ngay tại đây.

Các ca dưới đây đọc trực tiếp từ bốn nhánh của thân hàm `sortIndex`, không phải đoán.

- [ ] **Step 1: Viết test thất bại**

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
    // a nằm trong nhóm g1 (index 'a0'), b nằm trong nhóm g2 (index 'a5').
    // Chỉ số phần tử cố tình ngược chiều để chứng minh nhóm mới là thứ quyết định.
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

`sortIndex` đã tồn tại từ Task 6, nên đây là **test đặc tả lại hành vi sẵn có**, không phải TDD sinh mã mới. Bước "đỏ trước" của TDD không áp dụng — thay vào đó Step 3 chứng minh test không rỗng.

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx vitest run src/core/__tests__/sort-index.spec.ts
```

Expected: `Tests  9 passed (9)`.

Nếu có ca đỏ: **đừng sửa test cho khớp mã.** Đọc lại thân `sortIndex` trong `src/core/utils/sort.ts`, xác định nhánh nào cho ra kết quả khác, rồi ghi lại phát hiện vào phần Rủi ro của spec — có thể ta vừa tìm ra một lỗi thật trong BlockSuite, hoặc hiểu sai hàm. Cả hai trường hợp đều phải dừng lại và hỏi trước khi đi tiếp.

- [ ] **Step 3: Chứng minh test không rỗng**

Một test xanh ngay từ đầu có thể xanh vì nó chẳng kiểm gì. Đột biến một dòng để chứng minh nó thật sự chạm vào mã.

Trong `src/core/__tests__/sort-index.spec.ts`, tạm đổi dòng trong ca *"khác nhóm thì so theo chỉ số của NHÓM"*:

```ts
    expect(sortIndex({ id: 'a', index: 'z9' }, { id: 'b', index: 'a0' }, groups)).toBe(-1)
```

thành:

```ts
    expect(sortIndex({ id: 'a', index: 'z9' }, { id: 'b', index: 'a0' }, groups)).toBe(1)
```

Rồi chạy:

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npx vitest run src/core/__tests__/sort-index.spec.ts
```

Expected: FAIL — `expected -1 to be 1`. Đúng một ca đỏ, tám ca còn lại xanh.

Nếu nó vẫn xanh thì test đang không gọi tới `sortIndex` — dừng lại, sửa test, đừng đi tiếp.

Hoàn tác lại về `-1`, chạy lại, xác nhận `Tests  9 passed (9)`.

- [ ] **Step 4: Chạy toàn bộ và type-check**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm test && npx tsc --noEmit && npm run build
```

Expected: `Test Files  8 passed (8)`, tsc im lặng, build thành công.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
git add src/core/__tests__/sort-index.spec.ts
git commit -m "P0-A: test cho sortIndex — lỗ hổng không có test gốc

sortIndex quyết định thứ tự chồng lớp có tính lồng nhóm; BlockSuite
không có test nào cho nó. 9 ca đọc trực tiếp từ bốn nhánh của thân hàm,
cộng một ca dùng thật trong Array.sort.

Sai thứ tự z là loại lỗi hiện ra rất muộn — một nét bút bỗng nằm dưới
thẻ ghi chú mà không ai biết vì sao.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  8 passed (8)` và `npm run build` thành công.

---

## Nghiệm thu P0-A

Chạy đủ ba lệnh, cả ba phải xanh:

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/blockkit-edgeless"
npm test && npx tsc --noEmit && npm run build
```

**Kết quả mong đợi:**

| Lệnh | Kết quả |
|---|---|
| `npm test` | `Test Files  8 passed (8)` — 617 dòng test gốc port thẳng + 9 ca tự viết cho `sortIndex` |
| `npx tsc --noEmit` | exit 0, không in gì |
| `npm run build` | thành công |

**Không có mốc kiểm tay trên iPhone ở P0-A** — chặng này không có gì hiện ra màn hình. Danh sách kiểm tay bắt đầu từ P1.0 (spec §10).

## Kế hoạch kế tiếp

**P0-B** — element model (`gfx/model/base.ts`, `GfxPrimitiveElementModel`), `utils/tree.ts` + `tree.unit.spec.ts` (165 dòng, nhóm A còn nợ), Store trên Yjs, Viewport, Grid, Layer, ToolController, `IndexedDBDocSource`.

P0-B là chỗ phải xử lý **nhóm C** của spec §10: đọc `view.unit.spec.ts` (1015 dòng) và `surface.unit.spec.ts` (418 dòng) như đặc tả, chép khẳng định, bỏ giàn giáo Lit. Bước đó cần thiết kế riêng nên không gộp vào đây.
