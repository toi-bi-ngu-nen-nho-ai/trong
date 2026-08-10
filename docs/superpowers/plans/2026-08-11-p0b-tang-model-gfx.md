# P0-B: Tầng model của `std/gfx` — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port tầng model của `@blocksuite/std/src/gfx` (14 file, 2.855 dòng) cộng `perf.ts` và `utils/tree.ts` sang `src/core/gfx/`, cùng 165 dòng test gốc của `tree.unit.spec.ts`.

**Architecture:** Theo D10/D11 — tầng dữ liệu đã **vendor** ở P0-A (`src/vendor/blocksuite/`), tầng này **port** vì nó có ràng buộc Lit phải thay. Tầng không gian (Viewport, Grid, Layer, ToolController) là P0-C.

**Tech Stack:** TypeScript 5.7 (strict, `useDefineForClassFields: false`, target ES2022) · Vitest 4 · phụ thuộc đã cài đủ từ P0-A — không cài thêm gói nào.

## Global Constraints

- **Không thêm dependency chạy thật nào.** Đã đo: tầng này chỉ cần `yjs`, `rxjs`, `@preact/signals-core`, `lib0`, `lodash-es`, cộng `@blocksuite/global` và `@blocksuite/store` (đã vendor). Tất cả có sẵn. Nếu thấy cần cài thêm — **dừng và hỏi**, đó là dấu hiệu phép đo sai.
- `src/core/**` **không import React, không đụng DOM API ở phạm vi module** (spec §4).
- **`src/vendor/blocksuite/**` cấm sửa** (D11). Tầng này chỉ *đọc* nó qua alias `@blocksuite/*`.
- Test gốc **không được sửa khẳng định**, chỉ sửa dòng `import`. Không đạt là lỗi port (spec §10).
- Mã port giữ nguyên **thân hàm và comment gốc tiếng Anh**. Chỉ được sửa: đường dẫn import, và phần thay ràng buộc Lit nêu ở Task 1.
- Thư mục nguồn được phép đụng: `framework/std/src/gfx/model`, `framework/std/src/gfx/perf.ts`, `framework/std/src/utils/tree.ts`, `framework/std/src/__tests__/gfx/tree.unit.spec.ts`. **Đụng ra ngoài = dấu hiệu chệch hướng, dừng và hỏi.**
- Tiếng Việt cho comment mới viết.

## Ràng buộc Lit và cách thay — đọc trước khi làm Task 1

Hai file trong tầng này chạm tầng khung nhìn Lit, và **cả hai đều là `import type`**:

```
model/base.ts:10            import type { EditorHost } from '../../view/element/lit-host.js'
model/gfx-block-model.ts:24 import type { EditorHost } from '../../view/index.js'
```

Chỉ dùng làm kiểu, không có Lit lúc chạy. Thay bằng một kiểu tối giản của ta (Task 1), **không** port `view/`.

Ký hiệu đường dẫn:

```
$AFF = C:/Users/LENOVO/Downloads/AFFiNE/blocksuite
$W   = C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model
```

## File Structure

```
src/core/gfx/
  host.ts                     MỚI — kiểu EditorHost tối giản thay ràng buộc Lit
  perf.ts                     chép từ $AFF/framework/std/src/gfx/perf.ts (31 dòng, không import gì)
  model/
    base.ts                   chép (173) — GfxCompatibleInterface, gfxGroupCompatibleSymbol
    model.ts                  chép (18)  — GfxModel, GfxGroupModel
    gfx-block-model.ts        chép (315)
    surface/
      element-model.ts        chép (617) — GfxPrimitiveElementModel
      local-element-model.ts  chép (254)
      surface-model.ts        chép (940) — SurfaceBlockModel
      decorators/
        index.ts common.ts convert.ts derive.ts field.ts local.ts observer.ts watch.ts   chép (7 file)
src/core/utils/
  tree.ts                     chép từ $AFF/framework/std/src/utils/tree.ts (190)
src/core/__tests__/
  tree.spec.ts                port từ tree.unit.spec.ts (165)
```

---

## Task 1: Nền kiểu — `host.ts`, `perf.ts`, `model/base.ts`, `model/model.ts`

**Files:**
- Create: `src/core/gfx/host.ts`, `src/core/gfx/perf.ts`, `src/core/gfx/model/base.ts`, `src/core/gfx/model/model.ts`

**Interfaces:**
- Consumes: `Bound`, `IBound`, `IVec`, `SerializedXYWH`, `XYWH` từ `@blocksuite/global/gfx`; `Store`, `BlockModel` từ `@blocksuite/store`
- Produces:
  - `EditorHost` (kiểu tối giản, `src/core/gfx/host.ts`)
  - `measureOperation` (`src/core/gfx/perf.ts`)
  - `GfxCompatibleInterface`, `GfxGroupCompatibleInterface`, `gfxGroupCompatibleSymbol`, `isGfxGroupCompatibleModel`, `PointTestOptions` (`src/core/gfx/model/base.ts`)
  - `GfxModel`, `GfxGroupModel` (`src/core/gfx/model/model.ts`)

- [ ] **Step 1: Chép ba file không cần sửa gì ngoài đuôi `.js`**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
mkdir -p src/core/gfx/model/surface/decorators
G="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src/gfx"
cp "$G/perf.ts" src/core/gfx/perf.ts
cp "$G/model/base.ts" src/core/gfx/model/base.ts
cp "$G/model/model.ts" src/core/gfx/model/model.ts
```

- [ ] **Step 2: Viết kiểu `EditorHost` tối giản**

Create `src/core/gfx/host.ts`:

```ts
// Thay ràng buộc Lit của BlockSuite ở tầng model.
//
// `model/base.ts` và `model/gfx-block-model.ts` của thượng nguồn khai
// `import type { EditorHost } from '../../view/...'` — EditorHost là một Lit custom element.
// Nhưng cả hai đều là `import type`: nó CHỈ dùng làm kiểu, không có mã Lit nào chạy. Vì thế
// ta khai một kiểu tối giản thay vì port cả tầng `view/`.
//
// Khi P1.0 dựng EdgelessHost bằng React, kiểu này là chỗ khai những gì host thật phải cung cấp.
// Hiện tại tầng model chỉ dùng nó ở vị trí tham số nên để rỗng là đủ và trung thực — thêm thành
// viên khi có chỗ thật sự cần, không đoán trước.
export interface EditorHost {}
```

- [ ] **Step 3: Bỏ đuôi `.js` và trỏ lại `EditorHost`**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
find src/core/gfx -name "*.ts" -exec sed -i "s/\(from '\.[^']*\)\.js'/\1'/g" {} +
```

Rồi trong `src/core/gfx/model/base.ts`, đổi dòng 10:

```ts
import type { EditorHost } from '../../view/element/lit-host';
```
→
```ts
import type { EditorHost } from '../host';
```

- [ ] **Step 4: Type-check — chấp nhận đúng một loại lỗi**

Cả tầng model là **một vòng phụ thuộc kiểu**: `base.ts` import `model.ts`, mà `model.ts` import `gfx-block-model.ts` và `surface/element-model.ts` — hai file thuộc Task 4. Vì vậy Task 1 **không thể** tsc sạch một mình, và đó không phải lỗi.

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "gfx-block-model\|element-model" || echo "OK: chi thieu file cua Task 4"
```

Expected: `OK: chi thieu file cua Task 4`

Nếu in ra lỗi khác — nhất là **thiếu gói npm** — thì **dừng và hỏi**. Global Constraints nói tầng này không cần cài thêm gì; báo thiếu gói nghĩa là phép đo sai.

`model.ts` import `GfxPrimitiveElementModel` như một **giá trị** (dùng `instanceof`), không chỉ kiểu — nên tầng này chỉ chạy được sau Task 4. Trong Task 1 chưa có gì gọi tới nó, nên không sao.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
git add src/core/gfx
git commit -m "P0-B Task 1: nền kiểu của tầng model gfx

perf.ts, model/base.ts, model/model.ts port thẳng. Ràng buộc Lit thay
bằng src/core/gfx/host.ts: EditorHost ở thượng nguồn chỉ là import type
nên khai kiểu tối giản, không port cả tầng view/.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "gfx-block-model\|element-model"` không in ra dòng nào.

---

## Task 2: `utils/tree.ts` và test gốc của nó

**Files:**
- Create: `src/core/utils/tree.ts`
- Test: `src/core/__tests__/tree.spec.ts`

**Interfaces:**
- Consumes: `GfxCompatibleInterface`, `GfxGroupCompatibleInterface`, `gfxGroupCompatibleSymbol` (Task 1); `GfxGroupModel`, `GfxModel` (Task 1); `Store` từ `@blocksuite/store`
- Produces: `getTopElements`, `batchAddChildren`, `batchRemoveChildren`, `descendantElementsImpl`, `hasDescendantElementImpl`, `canSafeAddToContainer`, `isLockedByAncestorImpl`, `isLockedBySelfImpl`, `isLockedImpl`, `lockElementImpl`, `unlockElementImpl`

Đây là **cổng kiểm thật đầu tiên của P0-B** — 165 dòng test gốc thuộc nhóm A ở spec §10, port thẳng được.

- [ ] **Step 1: Chép nguồn và test**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
S="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src"
cp "$S/utils/tree.ts" src/core/utils/tree.ts
cp "$S/__tests__/gfx/tree.unit.spec.ts" src/core/__tests__/tree.spec.ts
```

- [ ] **Step 2: Sửa đường dẫn import**

Trong `src/core/utils/tree.ts`, đổi:

```ts
} from '../gfx/model/base.js';
import type { GfxGroupModel, GfxModel } from '../gfx/model/model.js';
```
→
```ts
} from '../gfx/model/base';
import type { GfxGroupModel, GfxModel } from '../gfx/model/model';
```

Dòng `import type { Store } from '@blocksuite/store';` **giữ nguyên** — alias lo.

Trong `src/core/__tests__/tree.spec.ts`, đổi:

```ts
} from '../../gfx/model/base.js';
import type { GfxModel } from '../../gfx/model/model.js';
...
} from '../../utils/tree.js';
```
→
```ts
} from '../gfx/model/base';
import type { GfxModel } from '../gfx/model/model';
...
} from '../utils/tree';
```

Lưu ý độ sâu: test gốc nằm ở `src/__tests__/gfx/` (hai cấp), bản ta nằm ở `src/core/__tests__/` (một cấp) — nên `../../` thành `../`.

- [ ] **Step 3: Chạy test, xác nhận XANH**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
npx vitest run src/core/__tests__/tree.spec.ts
```

Expected: `Test Files  1 passed (1)`, mọi ca xanh.

- [ ] **Step 4: Chạy toàn bộ, xác nhận không làm hỏng P0-A**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
npm test
```

Expected: `Test Files  6 passed (6)`.

**KHÔNG chạy `tsc` làm cổng kiểm ở task này.** Xem "Vì sao Task 2–4 không có cổng tsc" ngay dưới.

Vì sao test chạy được dù tsc còn đỏ: Vitest chỉ dịch chứ không kiểm kiểu, và `tree.ts` chỉ import **giá trị** từ `base.ts` (`gfxGroupCompatibleSymbol`); còn `model.ts` — file kéo theo cả chuỗi thiếu — nó chỉ import ở dạng `import type`, bị xoá sạch khi dịch.

### Vì sao Task 2–4 không có cổng tsc

Bản đầu của kế hoạch đặt cổng `npx tsc --noEmit ... | grep -v "<tên module thiếu>"` cho các task giữa. **Cổng đó hỏng, và nó hỏng theo kiểu nguy hiểm.**

Vòng phụ thuộc kiểu chưa khép làm `GfxGroupModel` nhiễm `any`, và hệ quả lan ra thành lỗi kiểu **tại những dòng không hề mang tên module thiếu** — ví dụ `TS7006` ở `tree.ts:113` và `TS2339` ở `tree.ts:159`. Bộ lọc theo tên module không bắt được chúng.

Người triển khai gặp cổng đỏ sẽ làm điều hợp lý nhất trong tầm nhìn của họ: **sửa mã port cho cổng xanh** — thêm chú thích kiểu, thêm type assertion. Đó chính là điều đã xảy ra ở lượt đầu Task 2. Và nó vi phạm ràng buộc port-fidelity, đồng thời giấu đi một khác biệt so với thượng nguồn mà sau này không ai nhớ để đối chiếu.

Kiểm kiểu một vòng phụ thuộc **cố ý bỏ dở** thì không mang thông tin gì. Vì vậy:

- **Task 2, 3, 4:** cổng là `npm test` (nơi có test) và "mã port khớp bản gốc ngoài dòng import". Không dùng tsc.
- **Task 5:** khi vòng khép lại, `npx tsc --noEmit` phải **exit 0 tuyệt đối**. Đó là chỗ duy nhất tsc nói lên điều gì.

Nếu trong lúc làm Task 2–4 mà `tsc` báo lỗi ngay trong file bạn vừa chép: **đó là dự kiến, đừng sửa mã port.** Ghi lại trong báo cáo và đi tiếp.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
git add src/core/utils/tree.ts src/core/__tests__/tree.spec.ts
git commit -m "P0-B Task 2: utils/tree.ts và 165 dòng test gốc

Lồng nhau group/frame — thứ D7 quyết định giữ lại vì
MindmapElementModel dùng chung lớp cơ sở với GroupElementModel.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npm test` in ra `Test Files  6 passed (6)`, **và** `git diff` giữa `src/core/utils/tree.ts` với bản gốc chỉ khác ở dòng `import`.

Kiểm điều thứ hai bằng lệnh:

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
diff <(sed "s/\(from '[^']*\)\.js'/\1'/g" "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src/utils/tree.ts") src/core/utils/tree.ts
```

Expected: chỉ in ra khác biệt ở các dòng `import` (đường dẫn `../gfx/...`). Bất kỳ khác biệt nào **trong thân hàm** là lỗi port.

---

## Task 3: Decorator của element model

**Files:**
- Create: `src/core/gfx/model/surface/decorators/{index,common,convert,derive,field,local,observer,watch}.ts`

**Interfaces:**
- Consumes: `yjs` (chỉ `observer.ts` cần, và là `import type`)
- Produces: `field`, `local`, `derive`, `convert`, `watch`, `observe` — bộ decorator mà `element-model.ts` (Task 4) dùng để khai thuộc tính đồng bộ với `Y.Map`

Bảy file này tham chiếu chéo `../element-model` (Task 4) và `../surface-model` (Task 5) nhưng **chỉ ở dạng `import type`**, nên port trước được; `tsc` sẽ đỏ cho tới hết Task 5. Đó là dự kiến — tiêu chí xong của task này **không phải** tsc sạch.

- [ ] **Step 1: Chép cả bảy file**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
D="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src/gfx/model/surface/decorators"
cp "$D"/*.ts src/core/gfx/model/surface/decorators/
find src/core/gfx/model/surface/decorators -name "*.ts" -exec sed -i "s/\(from '\.[^']*\)\.js'/\1'/g" {} +
grep -rn "\.js'" src/core/gfx/model/surface/decorators || echo "SACH"
```

Expected: in ra `SACH`.

- [ ] **Step 2: Xác nhận bảy file khớp bản gốc**

Không dùng `tsc` làm cổng ở task này — xem "Vì sao Task 2–4 không có cổng tsc" ở Task 2.

Kiểm bằng cách so thẳng với bản gốc:

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
D="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src/gfx/model/surface/decorators"
for f in index common convert derive field local observer watch; do
  echo "--- $f.ts"
  diff <(sed "s/\(from '[^']*\)\.js'/\1'/g" "$D/$f.ts") "src/core/gfx/model/surface/decorators/$f.ts"
done
```

Expected: **không in ra khác biệt nào** ngoài dòng `--- <tên>.ts`. Bảy file này chỉ có import nội bộ nên sau khi bỏ đuôi `.js` là khớp tuyệt đối.

Nếu có khác biệt trong thân hàm: đó là lỗi port, sửa lại cho khớp gốc.

- [ ] **Step 2b: Xác nhận không thêm dependency**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
git diff --stat HEAD -- package.json package-lock.json || echo "OK: khong dung package.json"
```

Expected: không in gì.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
git add src/core/gfx/model/surface/decorators
git commit -m "P0-B Task 3: bộ decorator của element model

field/local/derive/convert/watch/observe — cách BlockSuite khai thuộc
tính đồng bộ với Y.Map. Tham chiếu chéo tới element-model và
surface-model đều là import type nên port trước được; tsc còn đỏ cho
tới hết Task 5, đúng dự kiến.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** vòng lặp `diff` ở Step 2 không in ra khác biệt nào, và `git diff --stat HEAD -- package.json package-lock.json` không in gì.

---

## Task 4: `element-model.ts` và `local-element-model.ts`

**Files:**
- Create: `src/core/gfx/model/surface/element-model.ts`, `src/core/gfx/model/surface/local-element-model.ts`, `src/core/gfx/model/gfx-block-model.ts`

**Interfaces:**
- Consumes: decorator (Task 3); `base.ts`, `model.ts` (Task 1); `utils/tree.ts` (Task 2); `EditorHost` (Task 1); `createMutex`/`mutex` từ `lib0`, `isEqual` từ `lodash-es`, `Subject` từ `rxjs`, `yjs`
- Produces: `GfxPrimitiveElementModel`, `GfxLocalElementModel`, `GfxBlockElementModel`

- [ ] **Step 1: Chép ba file**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
M="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src/gfx/model"
cp "$M/surface/element-model.ts" src/core/gfx/model/surface/element-model.ts
cp "$M/surface/local-element-model.ts" src/core/gfx/model/surface/local-element-model.ts
cp "$M/gfx-block-model.ts" src/core/gfx/model/gfx-block-model.ts
find src/core/gfx/model -name "*.ts" -exec sed -i "s/\(from '\.[^']*\)\.js'/\1'/g" {} +
```

- [ ] **Step 2: Trỏ lại hai import ra ngoài tầng model**

Trong `src/core/gfx/model/gfx-block-model.ts`:

```ts
} from '../../utils/tree';
import type { EditorHost } from '../../view/index';
```
→
```ts
} from '../../../utils/tree';
import type { EditorHost } from '../host';
```

Lưu ý độ sâu: ở thượng nguồn `gfx-block-model.ts` nằm tại `gfx/model/`, `utils/` là `../../utils`. Bản ta để `utils/` ở `src/core/utils/` còn file này ở `src/core/gfx/model/` — nên thành `../../../utils`.

- [ ] **Step 3: Xác nhận ba file khớp bản gốc**

Không dùng `tsc` làm cổng ở task này — xem "Vì sao Task 2–4 không có cổng tsc" ở Task 2.

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
M="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src/gfx/model"
diff <(sed "s/\(from '[^']*\)\.js'/\1'/g" "$M/surface/element-model.ts") src/core/gfx/model/surface/element-model.ts
diff <(sed "s/\(from '[^']*\)\.js'/\1'/g" "$M/surface/local-element-model.ts") src/core/gfx/model/surface/local-element-model.ts
diff <(sed "s/\(from '[^']*\)\.js'/\1'/g" "$M/gfx-block-model.ts") src/core/gfx/model/gfx-block-model.ts
```

Expected: chỉ khác ở các dòng `import` mà Step 2 đã đổi (`../../../utils/tree` và `../host` trong `gfx-block-model.ts`). **Bất kỳ khác biệt nào trong thân hàm là lỗi port** — sửa lại cho khớp gốc, đừng "sửa cho hết lỗi kiểu".

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
git add src/core/gfx/model
git commit -m "P0-B Task 4: element model và block model

GfxPrimitiveElementModel (617 dòng) là chỗ decorator @field gắn thuộc
tính vào Y.Map — nền của mọi phần tử surface: shape, connector, brush,
text, mindmap, group.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** ba lệnh `diff` ở Step 3 chỉ in ra khác biệt ở dòng `import`.

---

## Task 5: `surface-model.ts` — đóng tầng model

**Files:**
- Create: `src/core/gfx/model/surface/surface-model.ts`

**Interfaces:**
- Consumes: tất cả các Task trước; `measureOperation` (Task 1); `signal` từ `@preact/signals-core`, `Subject` từ `rxjs`, `nanoid` và `BlockModel` và `Boxed` từ `@blocksuite/store`, `yjs`
- Produces: `SurfaceBlockModel` — kho phần tử surface, `Y.Map` của mọi element

Đây là file lớn nhất tầng này (940 dòng) và là chỗ tsc chuyển từ đỏ sang xanh.

- [ ] **Step 1: Chép**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
cp "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src/gfx/model/surface/surface-model.ts" \
   src/core/gfx/model/surface/surface-model.ts
sed -i "s/\(from '\.[^']*\)\.js'/\1'/g" src/core/gfx/model/surface/surface-model.ts
```

- [ ] **Step 2: Trỏ lại `perf`**

Trong `src/core/gfx/model/surface/surface-model.ts`:

```ts
import { measureOperation } from '../../perf';
```
→
```ts
import { measureOperation } from '../../../perf';
```

Lưu ý độ sâu: file nằm ở `src/core/gfx/model/surface/`, `perf.ts` ở `src/core/gfx/` — ba cấp lên.

- [ ] **Step 3: Type-check sạch hoàn toàn**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
npx tsc --noEmit
```

Expected: exit 0, **không in gì**. Đây là lần đầu từ Task 3 tới giờ tsc sạch.

- [ ] **Step 4: Chạy toàn bộ và build**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
npm test && npm run build 2>&1 | grep -E "dist/assets|built in"
```

Expected: `Test Files  6 passed (6)`, build thành công.

- [ ] **Step 5: Xác nhận ràng buộc cứng**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
grep -rn "from 'react'" src/core && echo "VI PHAM" || echo "OK: core khong import React"
git diff --stat HEAD -- src/vendor | head -3
```

Expected: `OK: core khong import React`, và `git diff` với `src/vendor` **không in gì** (D11: mã vendored không bị sửa).

- [ ] **Step 6: Commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
git add src/core/gfx/model/surface/surface-model.ts
git commit -m "P0-B Task 5: SurfaceBlockModel — đóng tầng model

940 dòng, kho phần tử surface trên Y.Map. tsc sạch trở lại lần đầu kể
từ Task 3.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

**Tiêu chí xong:** `npx tsc --noEmit` exit 0 **và** `npm test` in ra `Test Files  6 passed (6)`.

---

## Nghiệm thu P0-B

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0b-gfx-model"
npm test && npx tsc --noEmit && npm run build
```

| Lệnh | Kết quả |
|---|---|
| `npm test` | `Test Files  6 passed (6)` — 5 file từ P0-A cộng `tree.spec.ts` |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | thành công |

Cộng thêm: `git diff HEAD -- src/vendor` không in gì (D11).

**Không có mốc kiểm tay trên iPhone** — tầng model không hiện ra màn hình.

## Kế hoạch kế tiếp

**P0-C — tầng không gian:** `Viewport` (925), `Grid` (513), `Layer` (1014), `ToolController`, `selection`, `interactivity`. Đó là chỗ xử lý **nhóm C** ở spec §10: `view.unit.spec.ts` (1015 dòng) và `surface.unit.spec.ts` (418 dòng) phải đọc như đặc tả, chép khẳng định, bỏ giàn giáo Lit — không port thẳng được.

Cũng là chỗ **đo lại bundle** cho ra con số thật (xem `docs/superpowers/notes/2026-08-11-do-bundle-p0a.md`: số hiện tại là sàn, không phải trần).
