# P0-C: Tầng không gian của `std/gfx` — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trả hai khoản nợ từ lượt review P0-B, rồi port 3.813 dòng tầng không gian của `std/gfx` — `Viewport`, `Grid`, `Layer`, `selection`, `tool/` và bốn file phụ trợ.

**Architecture:** P0-A vendor tầng dữ liệu, P0-B port tầng model, chặng này port tầng không gian. Phần còn lại của `std/gfx` (`controller`, `keyboard`, `view/`, `interactivity/`, `surface-middleware`) vướng `BlockStdScope` nên đi cùng **P1.0** khi dựng host React — không thuộc P0-C.

**Tech Stack:** TypeScript 5.7 (strict, `useDefineForClassFields: false`, target ES2022) · Vitest 4 · Vite 8 với plugin `accessorSupport()`

## Global Constraints

- **`src/vendor/blocksuite/**` cấm sửa** (D11). Kiểm bằng **`diff --strip-trailing-cr` với thượng nguồn**, không phải `git diff` — xem "Cách kiểm D11 cho đúng" bên dưới.
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
diff --strip-trailing-cr <file thượng nguồn> <file vendored tương ứng>
```

Không dùng `cmp` ở đây: `cmp` so sánh byte-for-byte, còn `git config core.autocrlf` của repo này là
`true` nên cây làm việc lưu CRLF trong khi thượng nguồn AFFiNE là LF — nội dung giống hệt nhau,
chỉ khác ký tự `\r` cuối mỗi dòng. Chạy `cmp` thật trên cả 143 file vendored báo **143/143
DIFFERS**, một cổng đỏ giả không phân biệt được "khác `\r`" với "bị sửa thật". `diff
--strip-trailing-cr` bỏ qua `\r` trước khi so nên chỉ đỏ khi nội dung thật sự khác — đây cũng là
cách `src/core/gfx/README.md:29` đã dặn. **Đừng thêm `.gitattributes` để ép LF** — việc đó sẽ đổi
line ending của toàn bộ 143 file vendored, gây churn không cần thiết cho một vấn đề đã có cách kiểm
đúng mà không cần đổi gì.

P0-C không dự kiến vendor thêm file nào. Nếu phải vendor, dùng `diff --strip-trailing-cr` cho từng
file mới.

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

### `LifeCycleWatcherIdentifier` — vật cản đã gỡ (2026-08-11)

`identifiers.ts` import `LifeCycleWatcherIdentifier` từ `std/src/identifier.ts`, file kéo theo
3.260 dòng hạ tầng std ngoài phạm vi P0-C. Ba hướng đã cân, **đo trước khi chọn**:

| Đo | Kết quả |
|---|---|
| P0-C cần bao nhiêu của `identifier.ts`? | **1 trong 9** export. Cả `std/src/gfx/` chỉ hai file chạm `../identifier.js`: `identifiers.ts` (`LifeCycleWatcherIdentifier`) và `surface-middleware.ts` (`StdIdentifier`, hoãn P1.0) |
| Dùng ra sao? | 1 lần, `identifiers.ts:8`, kết quả ép kiểu bỏ đi ngay: `as ServiceIdentifier<GfxController>` |
| Hướng 3 (đẩy `extension.ts`+`identifiers.ts` sang P1.0) khả thi? | **Không.** `grid.ts:11`, `layer.ts:19`, `selection.ts:17`, `tool/tool-controller.ts:10` đều `import { GfxExtension }` như **giá trị** rồi kế thừa → rỗng Task 5,6,7,8 |
| Hướng 2 (port `identifier.ts` chỉ phần kiểu) đáng không? | **Không.** Buộc khai thêm 7 placeholder (`Command`, `EventOptions`, `UIEventHandler`, `BlockService`, `BlockStdScope`, `BlockViewType`, `WidgetViewType`) mà P0-C không quan sát cái nào — nhiều hợp đồng chưa cưỡng chế hơn, không ít hơn |
| Rủi ro định danh trùng của hướng 1? | **Không có.** DI khoá theo **chuỗi tên**: `di/container.ts:176,184,234`, `di/provider.ts:64,175`. Tiền lệ trong mã đã vendor: `store/src/extension/store-extension.ts:8-9` |

**Chọn hướng 1, thu hẹp đúng theo số đo.** Đã làm — `src/core/gfx/std-identifier.ts` khai đúng
`LifeCycleWatcherIdentifier` + kiểu rỗng `LifeCycleWatcher`, kèm `src/core/__tests__/std-identifier.spec.ts`
(5 ca) **cưỡng chế** hợp đồng "DI khoá theo tên" mà quyết định này dựa vào. Khi P1.0 port std thật,
việc phải làm là đổi một dòng import — không có hai định danh song song chia đôi container.

Trong Task 3, `identifiers.ts` đổi `from '../identifier.js'` → `from './std-identifier'`.

### `GfxController` — placeholder dựng dần, đo chứ không đoán

`extension.ts` và `identifiers.ts` đều có `import type { GfxController } from './controller.js'`. `controller.ts` thuộc nhóm hoãn sang P1.0 (nó cần `KeyboardController` như một **giá trị**, cộng `LifeCycleWatcher` và `onSurfaceAdded` nằm ngoài `gfx/`).

Nhưng cả hai chỗ đều là **`import type`** — đúng tình huống P0-B đã gặp với `EditorHost`, và cách xử lý giống hệt: khai một kiểu tối giản trong `src/core/gfx/host.ts`.

Khác một điểm quan trọng so với `EditorHost`: `GfxController` nằm ở **vị trí thật** (`constructor(protected readonly gfx: GfxController)`), và các lớp con truy cập `this.gfx.<thành viên>`. Interface rỗng sẽ thành lỗi kiểu. Nên placeholder phải có **đúng những thành viên được dùng thật** — đã đo:

| File dùng | Task | Truy cập gì trên `gfx` |
|---|---|---|
| `extension.ts` | **3** | **`std`** ← bảng gốc bỏ sót, xem đính chính bên dưới |
| `grid.ts` | 5 | `surface` |
| `layer.ts` | 6 | `surface` |
| `selection.ts` | 7 | `surface`, `getElementById` |
| ~~`tool-controller.ts`~~ | ~~8~~ | ~~`selection`, `viewport`~~ — Task 8 hoãn sang P1.0 |

`surface` và `getElementById` dựa vào kiểu đã port ở chặng trước. Nên placeholder dựng dần được:

- **Task 3** khai `surface`, `getElementById`, **`std`**
- **Task 5** thêm `viewport` nếu `grid.ts` cần sau khi `Viewport` được port

### Đính chính bảng đo (phát hiện lúc thi hành Task 3)

Bảng trên **đếm thiếu**: nó chỉ tính bốn file *tiêu thụ* `GfxExtension`, bỏ sót rằng chính
`extension.ts` — file của Task 3 — có `get std() { return this.gfx.std }`. Implementer Task 3 dừng
đúng chỗ và báo, thay vì tự đoán thêm thành viên.

Đã đo phần còn lại để các task sau khỏi dò lại. `GfxController.std` kiểu `BlockStdScope`, khai
**placeholder rỗng** ở `host.ts` tại Task 3 vì trong phạm vi Task 3 không ai đọc tiếp vào nó:

| Task | Ai đọc tiếp `.std` | Thêm thành viên vào `BlockStdScope` |
|---|---|---|
| 3 | không ai — `extension.ts` chỉ chuyển tiếp qua getter | **không thêm gì** |
| 5 | `grid.ts:384` → `this.std.store` | `store` |
| 6 | `layer.ts:78` → `this.std.store` | (đã có từ Task 5) |
| 7 | `selection.ts:135` → `.selection`; `:149` → `.get()`; `:318` → `.store.hasBlock` | `selection`, `get` |

**Cả ba thành viên đều tựa vào kiểu ĐÃ VENDOR** — nên đây là hợp đồng đo được, không phải interface
đoán: `Store` (`store/src/model/store/store.ts:195`), `StoreSelectionExtension`
(`store/src/extension/selection/selection-extension.ts:12`), `ServiceProvider['get']`
(`global/src/di/provider.ts:20`). Upstream: `std/src/scope/std-scope.ts:56,88,110`.

Đây là một hợp đồng **đo được**, không phải interface rỗng — nó nói thẳng host thật phải cung cấp gì, và là thứ P1.0 sẽ phải hiện thực khi dựng `EdgelessHost` bằng React.

- [ ] **Step 1: Quét import trước khi chép**

```bash
cd C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/framework/std/src/gfx
grep -n "^import\|^} from" cursor.ts extension.ts identifiers.ts raf-coalescer.ts
```

Ghi lại mọi specifier.

Hai import **đã biết trước**, xử lý theo hai mục trên, đừng coi là vật cản mới:
- `import type { GfxController } from './controller.js'` (ở `extension.ts` và `identifiers.ts`) → trỏ về `'../host'`
- `import { LifeCycleWatcherIdentifier } from '../identifier.js'` (ở `identifiers.ts`) → trỏ về `'./std-identifier'`

Cả hai đều **kiểm độ sâu bằng cách phân giải thật**, không suy bằng đầu (bài học 1).

Nếu gặp import nào **khác** trỏ vào thứ chưa port — nhất là **import giá trị** — thì **dừng và báo**.

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

**Thứ tự — ĐÃ ĐO, ĐÃ CHỐT (2026-08-11):** `grid.ts:10` cần `compare` từ `../utils/layer.js` như một
**giá trị**. Đã quét `std/src/utils/layer.ts` (171 dòng): nó chỉ phụ thuộc model đã port ở P0-B,
cộng `Store` (kiểu, đã vendor) và `Layer` (kiểu, từ `gfx/layer.ts` — vòng **chỉ ở mức kiểu**, không
thành vòng lúc chạy). **Không đổi thứ tự Task 5/6. Port `src/core/utils/layer.ts` trong Task 5**,
Task 6 dùng lại.

**`fractional-indexing` chưa được cài** (spec §11 liệt nó là cần cho `layer.ts`). Đã đo: `grid.ts`
**không** cần nó, `layer.ts` (Task 6) mới cần. Nhưng `utils/layer.ts` port ở task này — kiểm ở
Step 1 xem nó có cần không, nếu có thì cài ở đây. Làm **dependency chạy thật**.

- [ ] **Step 1: Quét import** — cả `grid.ts` và `utils/layer.ts`
- [ ] **Step 2: Cài `fractional-indexing` nếu task này cần**
- [ ] **Step 3: Chép, sửa import, `diff` với bản gốc** — cả hai file
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

## Task 7: `selection.ts` + `std/src/selection/`

**Files:**
- Create: `src/core/selection/{index,block,cursor,surface,text}.ts` (271 tổng)
- Create: `src/core/gfx/selection.ts` (408)

**Interfaces:**
- Consumes: `BaseSelection`, `SelectionExtension` từ `@blocksuite/store` (đã vendor ở `store/src/extension/selection/`); `zod` (đã cài `^3.25.76`); `GfxExtension` (Task 3); `GfxGroupLikeElementModel` (P0-B)
- Produces: `GfxSelectionManager`, và bốn lớp `BlockSelection` / `CursorSelection` / `SurfaceSelection` / `TextSelection`

### Mở rộng phạm vi — đã đo, chủ dự án đã duyệt (2026-08-11)

`gfx/selection.ts` dòng 10-15 import **bốn GIÁ TRỊ** từ `../selection/index.js` — không phải
`import type`, nên **không placeholder được**. Phép phân nhóm ban đầu của P0-C bỏ sót chỗ này
(nó chỉ grep `BlockStdScope|../view|BlockComponent`).

Đã đo `std/src/selection/`: **271 dòng, 5 file**, và cả năm chỉ import đúng hai thứ —
`BaseSelection` + `SelectionExtension` từ `@blocksuite/store` (**đã vendor**) và `zod` (**đã cài**).
**Zero hạ tầng std, zero dependency mới, zero placeholder mới.** Nên đây là phần thiếu của phép
phân nhóm, không phải phạm vi mới. Port cùng Task 7.

- [ ] **Step 1: Quét import** — cả `gfx/selection.ts` và năm file `std/src/selection/`. Kiểm `BlockStdScope`; phép đo nói là không chạm, nếu có thì **dừng và báo**.
- [ ] **Step 2: Chép `std/src/selection/` → `src/core/selection/`, sửa import, `diff` với bản gốc**
- [ ] **Step 3: Chép `gfx/selection.ts`, sửa import, `diff` với bản gốc**
- [ ] **Step 4: Thêm vào barrel**

**Tiêu chí xong:** `diff` cả sáu file chỉ khác ở dòng `import`, `npx tsc --noEmit` exit 0.

---

## Task 8: `tool/` — HOÃN SANG P1.0 (chốt 2026-08-11)

**Không thi hành trong P0-C.** Step 1 của task này viết sẵn: *"`tool-controller.ts` có thể chạm
`BlockStdScope`. Kiểm kỹ; nếu chạm thì **dừng và báo**, phần đó thuộc P1.0."* Đã kiểm — **nó chạm**:

| Chỗ chạm | Số lần | Bản chất |
|---|---|---|
| `this.std.event.add(...)` | 6 (dòng 330, 411, 455, 499, 512, 524) | `UIEventDispatcher` **sống** — `std/src/event/` là 1.854 dòng |
| `ctx.get('pointerState'\|'defaultState')` | 6 | ngữ cảnh sự kiện của std |
| `this.std.provider.get/getAll(...)` | 2 (dòng 230, 568) | DI provider qua `BlockStdScope` |
| `PointerEventState` | `.x` `.y` `.button` `.raw` | **truy cập thành viên thật** — khác hẳn `EditorHost`, placeholder rỗng không đủ |

`MouseButton` khai ngay trong `tool-controller.ts:53`, không phải import — chỗ đó không vướng.

Vì sao hoãn chứ không dựng placeholder thứ tư: ba placeholder hiện có (`EditorHost`,
`GfxController`, `LifeCycleWatcher`) đều là kiểu bị ép bỏ hoặc **vài thành viên đo được**. Cái này
là hợp đồng runtime với cả hệ thống sự kiện — dựng nó ra sẽ là một hợp đồng lớn **không ca test nào
chạy qua**, đúng thứ HANDOFF cảnh báo. Và cơ chế hook "hai ngón luôn kéo bảng" (spec §7) chỉ chứng
minh được khi có host React + dispatcher thật, tức là ở P1.0.

`tool/tool.ts` (125) + `tool/tool-controller.ts` (635) = **760 dòng chuyển sang P1.0**.

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
| `npm test` | 54 ca hiện có (49 + 5 ca `std-identifier`), tất cả xanh |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | thành công |
| `diff --strip-trailing-cr` mọi file vendored mới (nếu có) | không in gì (identical sau khi bỏ qua `\r`) |

**Phạm vi P0-C sau soát tiền-bay (chốt 2026-08-11):** Task 1–7. Task 8 (`tool/`, 760 dòng) hoãn
sang P1.0 vì chạm `BlockStdScope` thật. Tổng port của chặng: ~3.320 dòng
(`viewport` 925 · `layer` 1014 · `grid` 513 · `gfx/selection` 408 · `std/selection` 271 ·
`utils/layer` 171 · bốn file phụ trợ 193).

**Đo lại bundle và ghi vào `docs/superpowers/notes/`.** Con số từ P0-A và P0-B là **sàn, không phải trần** — tầng model vẫn bị tree-shake bỏ vì app chưa import. P0-C cũng vậy. Trần thật chỉ đo được ở P1.0 khi `EdgelessHost` kéo mọi thứ vào. Ngưỡng xét lại D11: +150 kB gzip.

**Không có mốc kiểm tay trên iPhone** — tầng không gian chưa hiện ra màn hình. Danh sách kiểm tay bắt đầu từ P1.0 (spec §10).

## Kế hoạch kế tiếp

**P1.0** — `EdgelessHost` bằng React, cộng phần `std/gfx` còn lại (`controller`, `keyboard`, `view/`, `interactivity/`, `surface-middleware`, ~4.600 dòng) vốn vướng `BlockStdScope`. Đó là chỗ quyết định `EditorHost` rỗng ở `src/core/gfx/host.ts` phải trở thành cái gì.

Cũng là chặng đầu tiên có **mốc kiểm tay trên iPhone thật**, và là chỗ `viewportRuntimeConfig` của Task 4 được chứng minh có tác dụng.
