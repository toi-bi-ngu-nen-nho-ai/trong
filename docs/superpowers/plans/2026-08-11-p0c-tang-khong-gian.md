# P0-C: Tầng không gian của `std/gfx` — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trả hai khoản nợ từ lượt review P0-B, rồi port 3.813 dòng tầng không gian của `std/gfx` — `Viewport`, `Grid`, `Layer`, `selection`, `tool/` và bốn file phụ trợ.

**Architecture:** P0-A vendor tầng dữ liệu, P0-B port tầng model, chặng này port tầng không gian. Phần còn lại của `std/gfx` (`controller`, `keyboard`, `view/`, `interactivity/`, `surface-middleware`) vướng `BlockStdScope` nên đi cùng **P1.0** khi dựng host React — không thuộc P0-C.

**Tech Stack:** TypeScript 5.7 (strict, `useDefineForClassFields: false`, target ES2022) · Vitest 4 · Vite 8 với plugin `accessorSupport()`

## Global Constraints

- **`src/vendor/blocksuite/**` cấm sửa** (D11). Kiểm bằng **`cmp` với thượng nguồn**, không phải `git diff` — xem "Cách kiểm D11 cho đúng" bên dưới.
- Mã port trong `src/core/**` giữ nguyên **thân hàm và comment gốc tiếng Anh**. Chỉ được sửa: đường dẫn import, và phần thay ràng buộc Lit/host.
- `src/core/**` không import React, không đụng DOM API ở phạm vi module.
- Không thêm dependency **chạy thật**. Nhóm này cần `rxjs`, `lodash-es`, `@preact/signals-core`, `fractional-indexing` — **`fractional-indexing` chưa cài**, xem Task 5.
- Tiếng Việt cho comment mới viết.
- **Không suy độ sâu đường dẫn tương đối bằng đầu.** Sai ba lần ở P0-B. Phân giải thật rồi kiểm tồn tại:
  ```bash
  node -e "const p=require('path'),f=require('fs');const t=p.resolve('<thư mục file>','<specifier>.ts');console.log(t,f.existsSync(t))"
  ```

## Cách kiểm D11 cho đúng — đọc trước khi dùng cổng nào

`git diff HEAD -- src/vendor` **không phải** cổng D11: nó chỉ so cây làm việc với HEAD nên chỉ thấy thay đổi chưa commit. Ở P0-B nó báo xanh suốt trong khi 4 file vendored đã bị sửa.

Dạng khoảng `base..HEAD` cũng **không đủ** cho file vendored **mới thêm** — git không phân biệt "mới và đúng nguyên văn" với "mới và sai".

**Phép kiểm đúng duy nhất:**

```bash
cmp <file thượng nguồn> <file vendored tương ứng>
```

P0-C không dự kiến vendor thêm file nào. Nếu phải vendor, dùng `cmp` cho từng file mới.

## Bối cảnh: vì sao hai task đầu là "nợ"

Lượt review toàn nhánh P0-B (opus) nêu hai khoảng trống. Chúng nằm ở đầu kế hoạch này chứ không nằm trong sổ tiến độ, vì nợ ghi trong sổ thì bị quên.

Ký hiệu đường dẫn:

```
$AFF = C:/Users/LENOVO/Downloads/AFFiNE/blocksuite
$W   = C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian
```

---

## Task 1: Fixture `GfxGroupLikeElementModel` và `@observe` — trả nợ I7

**Files:**
- Modify: `src/core/__tests__/fixtures/test-gfx-element.ts`
- Test: `src/core/__tests__/group-element.spec.ts` (MỚI)

**Interfaces:**
- Consumes: `GfxGroupLikeElementModel`, `field`, `observe` từ `src/core/gfx`; `TestWorkspace` từ `@blocksuite/store/test`; lược đồ trong `src/core/__tests__/fixtures/test-schema.ts`
- Produces: `TestGroupElement` — fixture cho các chặng sau dùng lại

### Vì sao task này đứng đầu P0-C

Bốn nhánh mã nằm đúng đường đi của P1 hiện có **0 ca chạy qua**: `@observe`/`@watch`, `GfxGroupLikeElementModel`, `gfx-block-model.ts`, `local-element-model.ts`. Cả bốn **kế thừa từ thượng nguồn** — `surface.unit.spec.ts` gốc cũng không phủ, nên đây không phải lỗi port.

Nhưng `GfxGroupLikeElementModel` là **lớp cơ sở của `MindmapElementModel`** (D7 trong spec), và P1.1 — chặng chủ dự án ưu tiên trước nhất — dựng thẳng lên nó. `@observe` là cơ chế làm cho `Y.Map` con của mindmap phản ứng.

Viết fixture này đóng đồng thời hai khoảng trống nguy hiểm nhất, trước khi có mã dựa vào chúng.

- [ ] **Step 1: Đọc bản gốc để biết `@observe` được dùng thế nào**

```bash
sed -n '960,985p' "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/model/src/elements/mindmap/mindmap.ts"
sed -n '110,130p' "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/affine/model/src/elements/group/group.ts"
```

Hai chỗ này là cách thượng nguồn khai `@observe` trên `children`. Fixture phải theo đúng khuôn đó, không tự nghĩ kiểu khác.

- [ ] **Step 2: Thêm `TestGroupElement` vào fixture**

Thêm vào cuối `src/core/__tests__/fixtures/test-gfx-element.ts`. Khuôn dưới đây theo `group.ts` của thượng nguồn; đọc Step 1 rồi khớp cho đúng chữ ký thật:

```ts
// Fixture cho GfxGroupLikeElementModel — lớp cơ sở của MindmapElementModel (D7).
// Thượng nguồn không có test nào chạy qua lớp này, mà P1.1 lại dựng mindmap thẳng lên nó.
export class TestGroupElement extends GfxGroupLikeElementModel<{
  children: Y.Map<boolean>
}> {
  get type() {
    return 'testGroup'
  }

  @field()
  accessor children: Y.Map<boolean> = new Y.Map()
}
```

Bổ sung import cần thiết (`GfxGroupLikeElementModel` từ `'../../gfx'`, `Y` từ `'yjs'`). **Đừng sửa `TestShapeElement` hay `TestLocalElement` đang có.**

Đăng ký `TestGroupElement` vào lược đồ surface trong `src/core/__tests__/fixtures/test-schema.ts` theo đúng cách `TestShapeElement` đang được đăng ký.

- [ ] **Step 3: Viết test**

Create `src/core/__tests__/group-element.spec.ts`. Dùng cùng khuôn dựng `TestWorkspace` như `src/core/__tests__/surface.spec.ts` (đọc hàm `commonSetup` ở đó và làm theo, đừng nghĩ cách mới).

Phủ tối thiểu bốn điều:

1. `addChild` / `removeChild` đổi `childIds` đúng
2. `@observe` trên `children` bắn khi `Y.Map` con đổi — đây là cơ chế mindmap dựa vào
3. `xywh` của nhóm tính từ bao của các con, và **đổi theo** khi con di chuyển
4. `descendants` trả đúng cây khi lồng nhóm trong nhóm

Mỗi ca một khẳng định rõ ràng. **Không viết ca nào chỉ gọi hàm rồi không kiểm gì.**

- [ ] **Step 4: Chứng minh test không rỗng**

Đột biến một khẳng định (đổi giá trị kỳ vọng sang giá trị sai), chạy lại, xác nhận **đúng ca đó đỏ**, rồi hoàn tác.

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian"
npx vitest run src/core/__tests__/group-element.spec.ts
```

- [ ] **Step 5: Chạy toàn bộ và commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian"
npm test && npx tsc --noEmit
```

Expected: mọi test xanh (44 ca cũ cộng ca mới), tsc exit 0.

**Tiêu chí xong:** `npm test` xanh với ít nhất 4 ca mới trong `group-element.spec.ts`, và bước đột biến ở Step 4 đã chứng minh chúng không rỗng.

---

## Task 2: Mở rộng ca canh gác `accessor` — trả nợ I5

**Files:**
- Modify: `vite.config.ts`
- Test: `src/core/__tests__/accessor-support.spec.ts`, và một file test mới ngoài `src/core/`

**Interfaces:**
- Consumes: plugin `accessorSupport()` trong `vite.config.ts`
- Produces: bộ lọc phủ đúng phạm vi, và ca canh gác chứng minh được điều đó

### Vấn đề

Plugin `accessorSupport()` lọc theo **nội dung file** và **chỉ trong `src/core/**`**. Ca canh gác hiện tại nằm ở `src/core/__tests__/accessor-support.spec.ts` — tức **luôn** nằm trong phạm vi lọc. Nó bảo vệ *cơ chế Babel*, không bảo vệ *độ phủ của bộ lọc*.

Hệ quả: một element đặt ở `src/editor/` hay `src/features/` dùng `accessor` sẽ vỡ lúc chạy với `SyntaxError` không manh mối, **mà bộ test vẫn xanh**. Reviewer P0-B đã thử thật và xác nhận.

Plugin cũng **fail-silent hoàn toàn** — `return null` ở mọi nhánh trượt.

- [ ] **Step 1: Tái hiện lỗ hổng**

Tạo tạm `src/lib/__tests__/accessor-outside-core.spec.ts` với đúng nội dung ca canh gác hiện có. Chạy:

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian"
npx vitest run src/lib/__tests__/accessor-outside-core.spec.ts
```

Expected: **ĐỎ** với `SyntaxError`. Đó là lỗ hổng.

- [ ] **Step 2: Mở rộng phạm vi lọc**

Sửa `accessorSupport()` trong `vite.config.ts` để phủ **toàn bộ `src/`** thay vì chỉ `src/core/`, **trừ `src/vendor/`** (mã vendored hiện không dùng `accessor` — đã kiểm, 0 kết quả — và nếu sau này có thì cần quyết định riêng, không tự động nuốt).

Giữ nguyên cách lọc theo nội dung (chỉ chạy Babel cho file thật sự chứa `accessor`) — đó là thứ giữ chi phí build không đổi.

- [ ] **Step 3: Bỏ fail-silent**

Hai chỗ `if (!stripped?.code) return null` (hoặc tương đương sau khi lượt trước đã sửa) phải `throw` với thông điệp nêu rõ file nào hỏng ở lượt Babel nào. Lỗi biên dịch im lặng biến thành `SyntaxError` lúc chạy là kiểu hỏng khó lần nhất.

- [ ] **Step 4: Ca tái hiện phải xanh**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian"
npx vitest run src/lib/__tests__/accessor-outside-core.spec.ts
```

Expected: xanh.

- [ ] **Step 5: Giữ ca canh gác ở ngoài `src/core/`**

Đừng xoá file vừa tạo — **đó chính là ca canh gác đúng chỗ**. Đổi tên/ghi comment cho rõ nó tồn tại để chứng minh bộ lọc phủ ngoài `src/core/`, và giải thích vì sao ca trong `src/core/` không đủ.

Ca cũ ở `src/core/__tests__/accessor-support.spec.ts` giữ lại — hai ca canh hai thứ khác nhau.

- [ ] **Step 6: Chạy toàn bộ, đo lại build, commit**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian"
npm test && npx tsc --noEmit && npm run build 2>&1 | grep -E "dist/assets|built in"
```

Ghi số build vào thông điệp commit — mở rộng phạm vi lọc có thể làm build chậm đi, cần biết bao nhiêu.

**Tiêu chí xong:** ca canh gác ngoài `src/core/` xanh, và `npm test` xanh toàn bộ.

---

## Task 3: Bốn file phụ trợ nhỏ

**Files:**
- Create: `src/core/gfx/cursor.ts` (54), `src/core/gfx/extension.ts` (53), `src/core/gfx/identifiers.ts` (10), `src/core/gfx/raf-coalescer.ts` (76)

**Interfaces:**
- Produces: `CursorType`, `GfxExtension`, `GfxExtensionIdentifier`, `gfxControllerKey`, `RafCoalescer` — nền cho `Grid`, `Layer`, `ToolController` ở các task sau

- [ ] **Step 1: Quét import trước khi chép**

```bash
cd C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src/gfx
grep -n "^import\|^} from" cursor.ts extension.ts identifiers.ts raf-coalescer.ts
```

Ghi lại mọi specifier. Nếu có file nào import thứ chưa port (`controller`, `view/`, `BlockStdScope`) thì **dừng và báo** — phép đo phân nhóm sai.

- [ ] **Step 2: Chép và bỏ đuôi `.js`**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian"
G="C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src/gfx"
cp "$G/cursor.ts" "$G/extension.ts" "$G/identifiers.ts" "$G/raf-coalescer.ts" src/core/gfx/
find src/core/gfx -maxdepth 1 -name "*.ts" -exec sed -i "s/\(from '\.[^']*\)\.js'/\1'/g" {} +
```

- [ ] **Step 3: Xác minh khớp bản gốc**

`diff --strip-trailing-cr` từng file với bản gốc sau khi chuẩn hoá `.js`. Chỉ được khác ở dòng `import`.

- [ ] **Step 4: Thêm vào barrel và commit**

Thêm bốn export vào `src/core/gfx/index.ts`. Đối chiếu `std/src/gfx/index.ts` để biết thượng nguồn re-export những gì, chỉ thêm thứ đã port.

**Tiêu chí xong:** bốn lệnh `diff` chỉ khác ở dòng `import`, `npm test` xanh, `npx tsc --noEmit` exit 0.

---

## Task 4: `Viewport` — phần sống còn trên iPhone

**Files:**
- Create: `src/core/gfx/viewport.ts` (925)

**Interfaces:**
- Consumes: `Bound`, `clamp`, `IPoint`, `IVec`, `Vec` từ `@blocksuite/global/gfx`; `rxjs`; `lodash-es/debounce`
- Produces: `Viewport`, `viewportRuntimeConfig`, `ZOOM_MIN/MAX/STEP/INITIAL`, `FIT_TO_SCREEN_PADDING`

Đây là file quan trọng nhất của cả P0-C. Nó chứa `viewportRuntimeConfig` — khối cấu hình giữ WKWebView khỏi sập lúc pan/zoom trên iPhone (`getEffectiveDpr`, `SKIP_REFRESH_DURING_GESTURE`, `POST_GESTURE_REFRESH_DELAY`), và là **lý do D11 chọn vendor bản 0.27.0 thay vì cài 0.22.4 từ npm** (spec §3).

- [ ] **Step 1: Quét import**

```bash
grep -n "^import\|^} from" "C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src/gfx/viewport.ts"
```

Chú ý dòng `import type { GfxViewportElement } from '.'` nếu có — `viewport-element.ts` là file Lit **không port**. Nếu là `import type` thì thay bằng kiểu tối giản trong `src/core/gfx/host.ts` theo đúng cách P0-B đã làm với `EditorHost`. Nếu là import giá trị thì **dừng và báo**.

- [ ] **Step 2: Chép, bỏ đuôi `.js`, sửa import**

- [ ] **Step 3: Xác minh khớp bản gốc**

`diff --strip-trailing-cr` với bản gốc. Chỉ được khác ở dòng `import` và chỗ thay ràng buộc Lit.

- [ ] **Step 4: Xác nhận khối cấu hình mobile còn nguyên**

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian"
grep -n "viewportRuntimeConfig\|getEffectiveDpr\|SKIP_REFRESH_DURING_GESTURE\|POST_GESTURE_REFRESH_DELAY" src/core/gfx/viewport.ts
```

Expected: cả bốn tên đều có mặt. Đây là thứ cả D10/D11 được quyết định vì nó — thiếu là hỏng mục tiêu chặng.

**Tiêu chí xong:** `diff` chỉ khác ở import + ràng buộc Lit, bốn tên ở Step 4 đều có mặt, `npx tsc --noEmit` exit 0.

---

## Task 5: `Grid` — chỉ mục không gian

**Files:**
- Create: `src/core/gfx/grid.ts` (513)
- Modify: `package.json` (thêm `fractional-indexing`)

**Interfaces:**
- Consumes: `compare` từ `utils/layer` (Task 6 — xem lưu ý), model classes từ P0-B
- Produces: `GridManager`

**Lưu ý thứ tự:** `grid.ts` import `compare` từ `../utils/layer.js`, mà `utils/layer.ts` là phụ trợ của `layer.ts` (Task 6). Kiểm ở Step 1 xem có phải port `utils/layer.ts` trước không — nếu có, **đổi thứ tự Task 5 và 6**, hoặc port `utils/layer.ts` trong Task 5.

**`fractional-indexing` chưa được cài** (spec §11 liệt nó là cần cho `layer.ts`). Cài ở task nào cần đầu tiên, làm **dependency chạy thật**.

- [ ] **Step 1: Quét import, quyết định thứ tự**
- [ ] **Step 2: Cài `fractional-indexing` nếu task này cần**
- [ ] **Step 3: Chép, sửa import, `diff` với bản gốc**
- [ ] **Step 4: Thêm vào barrel**

**Tiêu chí xong:** `diff` chỉ khác ở dòng `import`, `npx tsc --noEmit` exit 0.

---

## Task 6: `Layer` — thứ tự chồng lớp

**Files:**
- Create: `src/core/gfx/layer.ts` (1014), và `src/core/utils/layer.ts` nếu Task 5 chưa port

**Interfaces:**
- Consumes: `fractional-indexing`, `rxjs`, `lodash-es/last`, model classes từ P0-B
- Produces: `LayerManager`, và các hàm ở `utils/layer` (`compare`, `getElementIndex`, `ungroupIndex`, `updateLayersZIndex`, …)

Đây là chỗ `sortIndex` — hàm P0-A đã viết 9 ca test cho — thật sự được dùng. Cũng là chỗ thực hiện "canvas xếp chồng" mô tả ở spec §6.

- [ ] **Step 1: Quét import**
- [ ] **Step 2: Chép, sửa import, `diff` với bản gốc**
- [ ] **Step 3: Thêm vào barrel**

**Tiêu chí xong:** `diff` chỉ khác ở dòng `import`, `npx tsc --noEmit` exit 0.

---

## Task 7: `selection.ts`

**Files:**
- Create: `src/core/gfx/selection.ts` (408)

- [ ] **Step 1: Quét import** — đặc biệt kiểm xem có chạm `BlockStdScope` không. Phép đo phân nhóm nói là không; nếu có thì **dừng và báo**.
- [ ] **Step 2: Chép, sửa import, `diff` với bản gốc**
- [ ] **Step 3: Thêm vào barrel**

**Tiêu chí xong:** `diff` chỉ khác ở dòng `import`, `npx tsc --noEmit` exit 0.

---

## Task 8: `tool/` — máy trạng thái công cụ

**Files:**
- Create: `src/core/gfx/tool/tool.ts` (125), `src/core/gfx/tool/tool-controller.ts` (635)

**Interfaces:**
- Consumes: `@preact/signals-core`, `rxjs`
- Produces: `BaseTool`, `ToolController`, `ToolIdentifier` — nền cho mọi công cụ của P1 (mindmap, shape, connector, brush)

Đây là cơ chế hook mô tả ở spec §7 — thứ cho phép "hai ngón luôn kéo bảng bất kể công cụ nào đang chọn".

- [ ] **Step 1: Quét import** — `tool.ts` kế thừa `Extension` từ `@blocksuite/store`, và `tool-controller.ts` có thể chạm `BlockStdScope`. Kiểm kỹ; nếu chạm thì **dừng và báo**, phần đó thuộc P1.0.
- [ ] **Step 2: Chép, sửa import, `diff` với bản gốc**
- [ ] **Step 3: Thêm vào barrel**

**Tiêu chí xong:** `diff` chỉ khác ở dòng `import`, `npx tsc --noEmit` exit 0.

---

## Nghiệm thu P0-C

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian"
npm test
npx tsc --noEmit
npm run build 2>&1 | grep -E "dist/assets|built in"
```

| Cổng | Kỳ vọng |
|---|---|
| `npm test` | 44 ca cũ + ca mới của Task 1 và Task 2, tất cả xanh |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | thành công |
| `cmp` mọi file vendored mới (nếu có) | IDENTICAL |

**Đo lại bundle và ghi vào `docs/superpowers/notes/`.** Con số từ P0-A và P0-B là **sàn, không phải trần** — tầng model vẫn bị tree-shake bỏ vì app chưa import. P0-C cũng vậy. Trần thật chỉ đo được ở P1.0 khi `EdgelessHost` kéo mọi thứ vào. Ngưỡng xét lại D11: +150 kB gzip.

**Không có mốc kiểm tay trên iPhone** — tầng không gian chưa hiện ra màn hình. Danh sách kiểm tay bắt đầu từ P1.0 (spec §10).

## Kế hoạch kế tiếp

**P1.0** — `EdgelessHost` bằng React, cộng phần `std/gfx` còn lại (`controller`, `keyboard`, `view/`, `interactivity/`, `surface-middleware`, ~4.600 dòng) vốn vướng `BlockStdScope`. Đó là chỗ quyết định `EditorHost` rỗng ở `src/core/gfx/host.ts` phải trở thành cái gì.

Cũng là chặng đầu tiên có **mốc kiểm tay trên iPhone thật**, và là chỗ `viewportRuntimeConfig` của Task 4 được chứng minh có tác dụng.
