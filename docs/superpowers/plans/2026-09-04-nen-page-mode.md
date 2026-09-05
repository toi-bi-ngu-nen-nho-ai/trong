# Nền Page Mode — Kế Hoạch Triển Khai (Plan 1/2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng nền trình soạn thảo AFFiNE chế độ trang (page mode) cạnh chế độ edgeless đã có, bật
17 view extension, và chuẩn hoá tên gọi — **không đổi một thứ nào người dùng nhìn thấy, không xoá
một dòng dữ liệu nào.**

**Architecture:** Cây BlockSuite vendored đã hỗ trợ page mode qua `viewManager.get('page')`
(`RootViewExtension._setupPage()`). Plan này tổng quát hoá `DocModeService` để nhận tham số chế độ,
bóc phần mở doc dùng chung ra `mo-doc.ts`, thêm vỏ React `TrangBaiViet.tsx` song sinh với
`EdgelessBoard.tsx`, rồi bật extension theo bốn nhóm có đo dung lượng sau mỗi nhóm.

**Tech Stack:** React 19 · Vite · Tailwind v4 · BlockSuite 0.27 vendored (`src/vendor/blocksuite/`,
dựng ra `.vendor-build/`) · Lit · Yjs · IndexedDB · vitest (environment `node`, đổi sang `happy-dom`
theo từng file bằng chỉ thị `// @vitest-environment happy-dom`)

**Spec:** [`docs/superpowers/specs/2026-09-04-kho-bai-viet-page-mode-design.md`](../specs/2026-09-04-kho-bai-viet-page-mode-design.md)

**Phạm vi:** Plan này phủ **giai đoạn 0–4** của §4 trong spec. Giai đoạn 5–9 (kho `mucs`, sáu màn
hình, tìm kiếm/đồng bộ, gỡ hệ cũ, dọn CSDL) nằm ở Plan 2, viết **sau khi** Plan 1 lên xanh — xem
§"Plan 2" cuối tài liệu để biết vì sao và nó gồm những gì.

---

## Global Constraints

Chép nguyên giá trị từ spec và từ luật dự án. Mọi task đều ngầm mang theo mục này.

- **D11 — cấm sửa `src/vendor/blocksuite/`.** Mọi hành vi khác đi phải thực hiện ở phía app.
  Không có task nào trong plan này chạm vào cây vendored.
- **D13 — ranh giới nạp chậm.** Vỏ app không được kéo theo bất kỳ import `@blocksuite/*` nào.
  `src/App.tsx` chỉ được import **kiểu** từ `src/board/`. Điểm vào duy nhất là
  `src/board/index.tsx` (`React.lazy`).
- **§0 luật 1 — chứng minh trước khi phá.** Task 1 là cổng chặn. Đỏ thì **DỪNG toàn bộ plan**, báo
  lại chủ dự án, không đi tiếp task nào.
- **§0 luật 3 — đổi tên ≠ đổi hành vi.** Commit đổi tên chỉ được sửa định danh và đường import.
  Không sửa một `expect` nào. Không thêm/bớt một nhánh logic nào.
- **§0 luật 4 — bóc mã phải bóc nguyên văn trước.** Giữ nguyên tên hàm và chữ ký ở lượt bóc; đổi
  chữ ký là commit sau.
- **§0 luật 5 — extension bật theo nhóm**, chạy `npm test` trọn bộ + `npm run build` + kiểm mắt
  bản sáng và tối sau **mỗi** nhóm.
- **§0 luật 6 — ngưỡng dừng dung lượng: 1.400 kB gzip** cho chunk soạn thảo (hiện 993 kB). Vượt là
  dừng và báo, không tự bật tiếp.
- **KHÔNG bật `LatexViewExtension`** (khối công thức). Hoãn sang chặng riêng — spec §6.1.
  `InlineLatexViewExtension` đã bật từ trước, không đụng tới.
- **KHÔNG bật `RemoteSelectionViewExtension`** (đa người dùng) và **`AdapterPanelViewExtension`**
  (panel debug).
- **Không xoá dữ liệu.** Plan này không chạm `deleteObjectStore`, `deleteDatabase`, không xoá file
  của hệ bài viết cũ. Toàn bộ việc đó ở Plan 2 giai đoạn 8–9.
- **Tiếng Việt trong mã.** Tên hàm/biến không dấu, comment có dấu — theo đúng mã hiện có
  (`taoHoacMoBang`, `layExtensionsEdgeless`, `laKhungHep`).
- **`git status` toàn bộ trước mỗi commit.** Working tree đang chia sẻ với phiên khác; stage bằng
  đường dẫn tường minh, không `git add -A` (spec §6.6).
- **Kiểm tiến trình `vite`/`node` thừa trước khi tin một lượt test đỏ** (spec §6.7).

### Số đo nền — đừng đo lại, đừng đoán khác

| Thứ | Giá trị | Nguồn |
|---|---|---|
| `viewExtensions` hiện có | **38** mục | đếm tay mảng trong `src/board/extensions.ts` |
| Chú thích đầu file ghi | "GIỮ 37 / 58" — **SAI, đã cũ** | chưa cập nhật từ chặng D13 |
| Chunk bảng hiện tại | 993,69 kB gzip | `npm run build` 2026-08-12 |
| Vỏ app | 332,01 kB gzip | cùng lượt dựng |
| `testTimeout` / `hookTimeout` | **20000 ms** | `vite.config.ts:325-326` |
| `HAN_GIO_CHO_MS` (helper chờ) | 8000 ms | `src/__tests__/helpers/cho-den-khi.ts` |
| environment vitest mặc định | `node` | `vite.config.ts:301` |
| CSDL nội dung bảng | `drtrong-board` | `EdgelessBoard.tsx`, hằng `TEN_CSDL_BANG` |

> Ghi chép cũ trong `extensions.ts` nói khối Latex làm "ba ca timeout **5000ms**". Con số đó là của
> thời `testTimeout` mặc định; nay đã là 20000. **Đừng suy ra rằng vấn đề đã hết** — gốc là KaTeX +
> DOMPurify chạy đồng bộ lúc import module, làm chậm lượt import cho *mọi* file test board. Latex
> vẫn hoãn.

---

## File Structure

| File | Trạng thái | Trách nhiệm |
|---|---|---|
| `src/board/che-do-co-dinh.ts` | đổi tên từ `che-do-edgeless.ts` (Task 3) | Ghi đè `DocModeProvider.getEditorMode()` bằng một chế độ cố định. Xuất `cheDoTrang` + `cheDoEdgeless`. |
| `src/board/mo-doc.ts` | mới (Task 6) | Mở/tạo một doc BlockSuite: workspace, hạn giờ, chống đua, seed khối gốc. Không biết gì về React. |
| `src/board/mucMeta.ts` | đổi tên từ `boardMeta.ts` (Task 4) | Kiểu + tiện ích metadata cho object store. Không import `@blocksuite/*` (D13). |
| `src/board/LuoiMuc.tsx` | đổi tên từ `DanhSachBang.tsx` (Task 5) | Lưới thẻ + tìm kiếm + lọc + xoá mềm. Plan 2 mới thêm props lọc. |
| `src/board/TrangBaiViet.tsx` | mới (Task 8) | Vỏ React cho page mode. Song sinh mỏng của `EdgelessBoard.tsx`. |
| `src/board/EdgelessBoard.tsx` | sửa | Còn lại phần riêng của edgeless sau khi bóc `mo-doc.ts`. |
| `src/board/extensions.ts` | sửa (Task 10–13) | Danh sách view extension + `layExtensionsTrang()` / `layExtensionsEdgeless()`. |
| `src/board/index.tsx` | sửa (Task 9) | Vỏ nạp chậm + error boundary, chọn vỏ theo `loai`. |

**Vì sao `layExtensionsTrang()` chuyển từ `EdgelessBoard.tsx` sang `extensions.ts` (Task 10):** hai
hàm này là *cấu hình extension*, không phải chuyện của component. `TrangBaiViet.tsx` cần
`layExtensionsTrang()` mà không được import `EdgelessBoard.tsx` (kéo cả module edgeless vào). Nên
Task 10 dời cả `viewManager` sang `extensions.ts`. Ở Task 1 (spike) thì tạm để nguyên chỗ cũ, cố ý.

---

## Task 1: SPIKE — chứng minh page mode mount được (CỔNG CHẶN)

> **Đây là cổng chặn của cả hai plan.** Toàn bộ spec đứng trên giả định `viewManager.get('page')`
> chạy được với cây vendored — giả định đó suy ra từ **đọc mã**
> (`src/vendor/blocksuite/affine/blocks/root/src/view.ts:57`), **chưa chạy thật lần nào**.
> Task này đỏ ⇒ spec sai từ gốc ⇒ **DỪNG, báo lại chủ dự án, không đi tiếp.**

Cố ý làm lát cắt mỏng nhất có thể: không đổi tên gì, không dời gì, chỉ thêm.

**Files:**
- Modify: `src/board/che-do-edgeless.ts` (thêm `cheDoTrang`, giữ nguyên `cheDoEdgeless`)
- Modify: `src/board/EdgelessBoard.tsx` (thêm `layExtensionsTrang()` cạnh `layExtensionsEdgeless()`)
- Test: `src/board/__tests__/trang-mount.spec.ts` (mới)

**Interfaces:**
- Consumes: `viewManager` (singleton cấp module trong `EdgelessBoard.tsx`), `DocModeExtension` /
  `DocModeService` từ `@blocksuite/affine-shared/services`, `DocMode` từ `@blocksuite/affine-model`,
  `phongChuBangExtension` từ `./phong-chu-bang`
- Produces:
  - `cheDoTrang: ExtensionType` — `DocModeExtension` trả `'page'`
  - `layExtensionsTrang(): ExtensionType[]` — bộ extension cho page mode

- [ ] **Step 1: Viết ca kiểm thất bại**

Tạo `src/board/__tests__/trang-mount.spec.ts`. Mẫu bám sát `edgeless-board-mount.spec.ts` (cùng thư
mục) — đọc file đó trước để hiểu vì sao có `happy-dom`, `fake-indexeddb`, và proxy `getContext`.

```ts
// @vitest-environment happy-dom
//
// CỔNG CHẶN của cả chặng "kho bài viết page mode". Trả lời đúng một câu hỏi: cây BlockSuite
// vendored có mount được ở CHẾ ĐỘ TRANG không, hay `viewManager.get('page')` chỉ đúng trên giấy?
//
// Chỉ thị `@vitest-environment happy-dom` ở dòng đầu: environment mặc định của dự án là 'node'
// (vite.config.ts) và mọi thứ chạm DOM sẽ đâm `DOMRect is not defined`. Cùng lý do đã ghi ở
// edgeless-board-mount.spec.ts.
import 'fake-indexeddb/auto'

import { BlockStdScope } from '@blocksuite/affine/std'
import { render as litRender } from 'lit'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { layExtensionsTrang, taoHoacMoBang } from '../EdgelessBoard'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

// Ngữ cảnh 2D của <canvas> phải chế tay — happy-dom trả `null` từ `getContext('2d')`, và một khối
// surface (ta VẪN seed nó, xem spec §3.3) sẽ ném lỗi BẤT ĐỒNG BỘ sau khi ca kiểm đã xong, khiến
// vitest trả exit code 1 dù mọi expect đều xanh. Chép nguyên cơ chế từ edgeless-board-mount.spec.ts
// — nếu chạy thấy thừa (page mode không render surface) thì gỡ ở lượt dọn sau, đừng gỡ mò lúc này.
const taoCtxGia = (canvas: HTMLCanvasElement): unknown =>
  new Proxy(function () {} as unknown as object, {
    get(_t, p) {
      if (p === 'canvas') return canvas
      if (p === Symbol.toPrimitive) return () => 0
      return taoCtxGia(canvas)
    },
    set: () => true,
    apply: () => taoCtxGia(canvas),
  })
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  return taoCtxGia(this)
} as HTMLCanvasElement['getContext']

let el: HTMLDivElement

beforeEach(() => {
  el = document.createElement('div')
  document.body.append(el)
})

afterEach(() => {
  litRender(null, el)
  el.remove()
})

describe('mount chế độ trang', () => {
  it('dựng được thẻ gốc drt-page-root', async () => {
    const { store, workspace } = await taoHoacMoBang('spike-trang-1')
    // Page mode cần một note để có chỗ gõ. `taoHoacMoBang` hiện chỉ seed page+surface (Task 7 mới
    // thêm nhánh theo loại), nên ca kiểm này tự thêm — đúng tinh thần spike: chứng minh khả năng,
    // chưa đụng vào hàm dùng chung.
    const rootId = store.root!.id
    const noteId = store.addBlock('affine:note', {}, rootId)
    store.addBlock('affine:paragraph', {}, noteId)

    const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })
    litRender(std.render(), el)

    // `drt-` là tiền tố sau bước đổi tên vendor (scripts/doi-ten-vendor.mjs); thượng nguồn viết
    // `affine-page-root`.
    await choDom(() => expect(el.querySelector('drt-page-root')).not.toBeNull())

    workspace.forceStop()
  })

  it('đoạn văn trong note soạn thảo được', async () => {
    const { store, workspace } = await taoHoacMoBang('spike-trang-2')
    const rootId = store.root!.id
    const noteId = store.addBlock('affine:note', {}, rootId)
    store.addBlock('affine:paragraph', {}, noteId)

    const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })
    litRender(std.render(), el)

    // `v-line` là thẻ của inline editor BlockSuite; nó chỉ xuất hiện khi paragraph đã render xong
    // và vùng soạn thảo thật sự sống. Đây là bằng chứng "gõ được", không phải chỉ "có thẻ".
    await choDom(() => expect(el.querySelector('drt-paragraph v-line')).not.toBeNull())

    const vungSoan = el.querySelector('[contenteditable="true"]')
    expect(vungSoan).not.toBeNull()

    workspace.forceStop()
  })

  it('chế độ trang KHÔNG dựng thẻ gốc edgeless', async () => {
    const { store, workspace } = await taoHoacMoBang('spike-trang-3')
    const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })
    litRender(std.render(), el)

    await choDom(() => expect(el.querySelector('drt-page-root')).not.toBeNull())
    expect(el.querySelector('drt-edgeless-root')).toBeNull()

    workspace.forceStop()
  })
})
```

- [ ] **Step 2: Chạy để xác nhận ĐỎ**

```bash
npx vitest run src/board/__tests__/trang-mount.spec.ts
```

Kỳ vọng: ĐỎ với `layExtensionsTrang is not a function` (hoặc lỗi import) — hàm chưa tồn tại.
Nếu đỏ vì lý do KHÁC, dừng và đọc kỹ: đó có thể chính là tín hiệu spike thất bại.

- [ ] **Step 3: Thêm `cheDoTrang`**

Sửa `src/board/che-do-edgeless.ts`. **Chưa đổi tên file** (Task 3 mới đổi) — giữ lát cắt mỏng.
Thêm vào cuối file, giữ nguyên mọi thứ đang có:

```ts
/**
 * Bản song sinh của `cheDoEdgeless` cho CHẾ ĐỘ TRANG.
 *
 * Không dùng lại `cheDoEdgeless` được: nó trả cứng `'edgeless'`, và ba hệ quả đã ghi ở đầu file
 * này (`ToolbarContext.editorMode` → `isEdgelessMode` TRUE giữa một trang page;
 * `topContenteditableElement` trả root thay vì thẻ note bọc ngoài; `image-resize-manager.ts` đọc
 * sai `viewport.zoom`) đều lật ngược dấu khi mang sang page mode.
 *
 * Task 3 sẽ gộp hai hằng này thành `CheDoCoDinh(mode)` và đổi tên file. Ở đây cố ý viết trùng lặp
 * một lớp con nữa để lát cắt spike mỏng nhất có thể — không đổi tên gì trong lượt chứng minh.
 */
class CheDoLuonTrang extends DocModeService {
  override getEditorMode(): DocMode {
    return 'page'
  }
}

export const cheDoTrang = DocModeExtension(new CheDoLuonTrang())
```

- [ ] **Step 4: Thêm `layExtensionsTrang()`**

Sửa `src/board/EdgelessBoard.tsx`. Đổi dòng import chế độ:

```ts
import { cheDoEdgeless, cheDoTrang } from './che-do-edgeless'
```

Thêm ngay **dưới** `layExtensionsEdgeless()` (giữ nguyên hàm đó không sửa một ký tự):

```ts
/**
 * Bộ extension cho CHẾ ĐỘ TRANG, lấy từ ĐÚNG `viewManager` singleton của module này.
 *
 * Phải dùng chung manager với `layExtensionsEdgeless()`, không được dựng manager thứ hai: `.get()`
 * chạy chuỗi `ViewExtensionProvider.setup() → effect() → effects()`, tức `customElements.define(...)`
 * cho toàn bộ thẻ Lit — lý do đầy đủ đã ghi ở JSDoc của `layExtensionsEdgeless` ngay trên.
 *
 * `cheDoTrang` nối vào CUỐI vì `di.override` chỉ thay được một hiện thực ĐÃ đăng ký, mà
 * `DocModeService` gốc do `FoundationViewExtension` (phần tử đầu mảng) đăng ký.
 *
 * `phongChuBangExtension` giữ nguyên như edgeless: `FoundationViewExtension` chỉ đăng ký cấu hình
 * phông KHI được truyền `options.fontConfig`, mà ta gọi `.get()` không kèm options.
 */
export function layExtensionsTrang() {
  return [...viewManager.get('page'), cheDoTrang, phongChuBangExtension]
}
```

- [ ] **Step 5: Chạy lại để xác nhận XANH**

```bash
npx vitest run src/board/__tests__/trang-mount.spec.ts
```

Kỳ vọng: 3 ca PASS.

**Nếu vẫn ĐỎ:** đây là tín hiệu quan trọng nhất của cả chặng. Ghi lại nguyên văn lỗi, **DỪNG plan**,
báo lại chủ dự án. Đừng vá mò — spec cần viết lại chứ không phải plan cần sửa.

- [ ] **Step 6: Chạy trọn bộ để chắc không vỡ gì khác**

```bash
npm test
```

Kỳ vọng: xanh toàn bộ. `thu-tu-view-extension.spec.ts` phải vẫn xanh (chưa đụng mảng
`viewExtensions`). Đỏ chập chờn cũng tính là đỏ — kiểm tiến trình `vite`/`node` thừa trước khi kết
luận (Global Constraints).

- [ ] **Step 7: Kiểm mắt trên trình duyệt thật**

Ca kiểm chạy trên happy-dom với canvas giả. Trước khi coi cổng này là đã qua, phải nhìn bằng mắt.

Tạm gắn vào một màn đang có để mở được (ví dụ thay `EdgelessBoard` bằng một `BlockStdScope` dùng
`layExtensionsTrang()` trong tab Mindmap), chạy `npm run dev`, rồi kiểm **năm** điều:

1. Trang hiện ra, có con trỏ nhấp nháy.
2. **Gõ được chữ tiếng Việt có dấu.**
3. Gõ `/` mở được SlashMenu.
4. Thu cửa sổ xuống **dưới 768 px** (giả lập điện thoại dọc) — vẫn gõ được (chưa có thanh bàn phím
   ảo, Task 10 mới bật; ở bước này chỉ cần *gõ được*).
5. Console không lỗi.

**Gỡ đoạn gắn tạm này ra trước khi commit** — nó không thuộc lát cắt.

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/board/che-do-edgeless.ts src/board/EdgelessBoard.tsx src/board/__tests__/trang-mount.spec.ts
git commit -m "feat(board): chung minh page mode mount duoc (cong chan)

cheDoTrang + layExtensionsTrang() + ca kiem mount. Lat cat mong nhat de
chung minh viewManager.get('page') chay that voi cay vendored - gia dinh
nay truoc do chi suy ra tu doc ma, chua chay lan nao.

Co y KHONG doi ten gi va KHONG doi hanh vi edgeless o luot nay.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Ca kiểm hồi quy — gán sai chế độ phải ĐỎ

Task 1 chứng minh page mode chạy. Task này chứng minh **`cheDoTrang` thật sự có tác dụng** — không
phải page mode tự chạy đúng dù truyền gì cũng được. Không có ca này thì Task 3 (đổi tên) có thể âm
thầm làm hỏng cơ chế mà mọi ca vẫn xanh ([[feedback_chung-minh-test-hoi-quy-do-khi-go-va]]).

**Files:**
- Test: `src/board/__tests__/che-do-tai-lieu.spec.ts` (mới)

**Interfaces:**
- Consumes: `cheDoTrang`, `cheDoEdgeless` từ `./che-do-edgeless` (Task 1)
- Produces: không có API mới — chỉ ca kiểm

- [ ] **Step 1: Đọc hình dạng thật của `DocModeExtension`**

Không đoán. Mở file và đọc `setup` nhận gì:

```bash
grep -n "DocModeExtension" -A 12 src/vendor/blocksuite/affine/shared/src/services/doc-mode-service.ts
```

Ghi lại tên phương thức mà `setup` gọi trên container (`override`, `addImpl`, `add`…) — Step 2 dùng
đúng tên đó.

- [ ] **Step 2: Viết ca kiểm**

```ts
// Canh rằng CHẾ ĐỘ TÀI LIỆU thật sự quyết định `getEditorMode()` trả ra chuỗi nào.
//
// Vì sao cần ca này dù `trang-mount.spec.ts` đã xanh: ca kia chỉ chứng minh "page mode dựng ra
// drt-page-root". Nó KHÔNG chứng minh `cheDoTrang` là thứ gây ra điều đó — nếu ai đó gỡ `cheDoTrang`
// khỏi `layExtensionsTrang()`, hoặc Task 3 gộp hai lớp lại mà gộp sai, ca kia vẫn có thể xanh (vì
// `viewManager.get('page')` tự nó đã đăng ký BlockViewExtension('affine:page', 'affine-page-root')).
//
// Ca dưới đây kiểm đúng mắt xích mà `ToolbarContext.editorMode` tiêu thụ — xem chuỗi nhân quả đầy
// đủ ở đầu che-do-edgeless.ts.
import { describe, expect, it } from 'vitest'

import { cheDoEdgeless, cheDoTrang } from '../che-do-edgeless'

/**
 * Lấy lại instance `DocModeService` mà `DocModeExtension(service)` bọc bên trong, bằng cách chạy
 * `setup()` với một container giả chỉ ghi lại thứ được đăng ký. Rẻ hơn nhiều so với dựng cả
 * `BlockStdScope`, và kiểm đúng thứ cần kiểm.
 *
 * Tên phương thức của container giả phải khớp thứ `DocModeExtension.setup` thật sự gọi — đọc
 * `affine/shared/src/services/doc-mode-service.ts` (Step 1) trước khi sửa hàm này.
 */
function layService(ext: unknown): { getEditorMode: () => string } {
  const daDangKy: unknown[] = []
  const ghiLai = (_id: unknown, thu: unknown) => {
    daDangKy.push(typeof thu === 'function' ? (thu as () => unknown)() : thu)
  }
  const diGia = { override: ghiLai, addImpl: ghiLai, add: ghiLai }
  ;(ext as { setup: (di: unknown) => void }).setup(diGia)

  const service = daDangKy[0] as { getEditorMode: () => string } | undefined
  if (!service || typeof service.getEditorMode !== 'function') {
    throw new Error(
      'Không lấy được DocModeService từ extension — hình dạng setup() đã đổi. Đọc ' +
        'affine/shared/src/services/doc-mode-service.ts rồi sửa layService, GIỮ NGUYÊN ba expect.',
    )
  }
  return service
}

describe('chế độ tài liệu cố định', () => {
  it('cheDoTrang trả về page', () => {
    expect(layService(cheDoTrang).getEditorMode()).toBe('page')
  })

  it('cheDoEdgeless trả về edgeless', () => {
    expect(layService(cheDoEdgeless).getEditorMode()).toBe('edgeless')
  })

  it('hai chế độ KHÁC nhau', () => {
    // Ca này đỏ nếu ai đó gộp hai lớp lại mà quên truyền tham số — đúng rủi ro của Task 3.
    expect(layService(cheDoTrang).getEditorMode()).not.toBe(
      layService(cheDoEdgeless).getEditorMode(),
    )
  })
})
```

- [ ] **Step 3: Chạy**

```bash
npx vitest run src/board/__tests__/che-do-tai-lieu.spec.ts
```

Kỳ vọng: 3 PASS. Nếu ném lỗi "Không lấy được DocModeService", sửa `layService` theo Step 1 và
**giữ nguyên ba `expect`**.

- [ ] **Step 4: Chứng minh ca này ĐỎ được**

Test xanh chưa chứng minh gì. Sửa tạm `che-do-edgeless.ts` cho `CheDoLuonTrang.getEditorMode()` trả
`'edgeless'`, chạy lại:

```bash
npx vitest run src/board/__tests__/che-do-tai-lieu.spec.ts
```

Kỳ vọng: **2 ca ĐỎ** (`cheDoTrang trả về page` và `hai chế độ KHÁC nhau`).
Rồi hoàn nguyên về `'page'` và chạy lại cho xanh.

- [ ] **Step 5: Commit**

```bash
git status --short
git add src/board/__tests__/che-do-tai-lieu.spec.ts
git commit -m "test(board): ghim che do tai lieu quyet dinh getEditorMode

Da chung minh do duoc: doi getEditorMode cua CheDoLuonTrang thanh
'edgeless' lam 2/3 ca do.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Đổi tên thuần — `che-do-edgeless.ts` → `che-do-co-dinh.ts`

**§0 luật 3.** Commit này chỉ đổi định danh và gộp hai lớp trùng lặp thành một lớp nhận tham số.
Không sửa một `expect` nào — chỉ sửa đường import trong file test.

**Files:**
- Rename: `src/board/che-do-edgeless.ts` → `src/board/che-do-co-dinh.ts`
- Modify: `src/board/EdgelessBoard.tsx` (đường import)
- Modify: `src/board/__tests__/che-do-tai-lieu.spec.ts` (đường import)

**Interfaces:**
- Consumes: `DocModeExtension`, `DocModeService` từ `@blocksuite/affine-shared/services`;
  `DocMode` từ `@blocksuite/affine-model`
- Produces: `cheDoTrang`, `cheDoEdgeless` — **cùng tên, cùng kiểu như Task 1**, chỉ đổi file

- [ ] **Step 1: Đổi tên file bằng `git mv`**

```bash
git mv src/board/che-do-edgeless.ts src/board/che-do-co-dinh.ts
```

Dùng `git mv` chứ không xoá-rồi-tạo: giữ lịch sử file, và `git log --follow` còn lần được về chuỗi
nhân quả dài đã ghi trong đó.

- [ ] **Step 2: Gộp hai lớp thành một lớp nhận tham số**

Trong `src/board/che-do-co-dinh.ts`, thay hai lớp `CheDoLuonEdgeless` + `CheDoLuonTrang` bằng:

```ts
/**
 * Ghi đè `DocModeProvider.getEditorMode()` bằng MỘT chế độ cố định.
 *
 * Trước 2026-09-04 file này tên `che-do-edgeless.ts` và lớp trả cứng `'edgeless'` — đúng vì lúc đó
 * app chỉ có bảng vẽ. Khi thêm chế độ trang, chốt cứng thành ra sai ở ba chỗ đã mô tả đầu file:
 * thanh công cụ đọc nhầm `isEdgelessMode`, `topContenteditableElement` trả root thay vì note, và
 * kéo đổi cỡ ảnh lệch đúng hệ số thu phóng.
 *
 * PHẠM VI VẪN CỐ Ý HẸP: chỉ `getEditorMode`. `getPrimaryMode` để nguyên mặc định `'page'` — nó nói
 * về chế độ CHÍNH của một tài liệu khi bị tài liệu khác tham chiếu tới, không phải chế độ trình
 * soạn đang mở.
 */
class CheDoCoDinh extends DocModeService {
  constructor(private readonly cheDo: DocMode) {
    super()
  }

  override getEditorMode(): DocMode {
    return this.cheDo
  }
}

/** Extension ghi đè `DocModeProvider` cho CHẾ ĐỘ TRANG. Xem ghi chú thứ tự ở `cheDoEdgeless`. */
export const cheDoTrang = DocModeExtension(new CheDoCoDinh('page'))

/**
 * Extension ghi đè `DocModeProvider` cho CHẾ ĐỘ BẢNG VẼ. PHẢI đứng SAU `viewManager.get('edgeless')`
 * trong mảng truyền cho `BlockStdScope` — `di.override` chỉ thay được một hiện thực đã đăng ký, mà
 * `DocModeService` gốc do `FoundationViewExtension` (phần tử ĐẦU của `viewExtensions`) đăng ký.
 */
export const cheDoEdgeless = DocModeExtension(new CheDoCoDinh('edgeless'))
```

Giữ nguyên **toàn bộ khối comment đầu file** (chuỗi nhân quả 42 dòng) — đó là tài liệu điều tra đắt
nhất trong file; chỉ thêm một đoạn nói vì sao nay nhận tham số.

- [ ] **Step 3: Sửa hai đường import**

`src/board/EdgelessBoard.tsx`:

```ts
import { cheDoEdgeless, cheDoTrang } from './che-do-co-dinh'
```

`src/board/__tests__/che-do-tai-lieu.spec.ts`:

```ts
import { cheDoEdgeless, cheDoTrang } from '../che-do-co-dinh'
```

**Không sửa gì khác trong file test.** Ba `expect` giữ nguyên nguyên văn — đó là bằng chứng đây là
phép đổi tên thuần.

- [ ] **Step 4: Kiểm không còn tham chiếu tên cũ**

```bash
grep -rn "che-do-edgeless" src/ scripts/
```

Kỳ vọng: không kết quả. (Trong `docs/` thì có — đó là lịch sử, để yên.)

- [ ] **Step 5: Chạy trọn bộ**

```bash
npm test
```

Kỳ vọng: xanh toàn bộ, **cùng số ca như trước Task 3**. Số ca đổi nghĩa là đây không còn là đổi tên
thuần.

- [ ] **Step 6: Commit**

```bash
git status --short
git add src/board/che-do-co-dinh.ts src/board/EdgelessBoard.tsx src/board/__tests__/che-do-tai-lieu.spec.ts
git commit -m "refactor(board): che-do-edgeless.ts -> che-do-co-dinh.ts, nhan tham so mode

Doi ten THUAN: gop CheDoLuonEdgeless + CheDoLuonTrang thanh mot lop
CheDoCoDinh(mode). Khong sua mot expect nao, chi sua duong import.
Giu nguyen khoi comment dieu tra 42 dong o dau file.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Đổi tên thuần — `boardMeta.ts` → `mucMeta.ts`

**§0 luật 3.** Chỉ đổi định danh. **Chưa** thêm `loai`/`danhMuc`, **chưa** bỏ nhánh `??` phòng vệ —
cả hai là việc của Plan 2.

**Files:**
- Rename: `src/board/boardMeta.ts` → `src/board/mucMeta.ts`
- Rename: `src/board/__tests__/boardMeta.spec.ts` → `src/board/__tests__/mucMeta.spec.ts`
- Modify: mọi file import `boardMeta` (xem Step 1)

**Interfaces:**
- Produces (đổi tên, kiểu giữ nguyên y hệt):
  - `MucMeta` (từ `BangMeta`)
  - `taoIdMuc(): string` (từ `taoIdBang`)
  - `capNhatSauKhiRoiMuc(id: string, coThayDoiNoiDung: boolean, noiDungTimKiemMoi?: string): Promise<void>` (từ `capNhatSauKhiRoiBang`)
  - `mucKhopTimKiem(muc: MucMeta, truyVan: string): boolean` (từ `bangKhopTimKiem`)
  - `doiGhiAnhXongNeuCo`, `trichVanBanTuKhoi`, `trichVanBanTuCanvas`, `ghepNoiDungTimKiem` — **giữ
    nguyên tên**, chúng nói về cấu trúc BlockSuite chứ không về "bảng"

- [ ] **Step 1: Tìm hết chỗ dùng TRƯỚC khi đổi**

```bash
grep -rn "boardMeta\|BangMeta\|taoIdBang\|capNhatSauKhiRoiBang\|bangKhopTimKiem" src/ --include=*.ts --include=*.tsx
```

Ghi lại danh sách file. Mọi file trong danh sách phải xuất hiện ở `git add` của Step 6 — đây là
checklist, không phải bước tham khảo.

- [ ] **Step 2: `git mv` hai file**

```bash
git mv src/board/boardMeta.ts src/board/mucMeta.ts
git mv src/board/__tests__/boardMeta.spec.ts src/board/__tests__/mucMeta.spec.ts
```

- [ ] **Step 3: Đổi định danh**

Trong `src/board/mucMeta.ts`, đổi đúng năm tên: `BangMeta`→`MucMeta`, `taoIdBang`→`taoIdMuc`,
`capNhatSauKhiRoiBang`→`capNhatSauKhiRoiMuc`, `bangKhopTimKiem`→`mucKhopTimKiem`, và tham số
`bang: BangMeta`→`muc: MucMeta`.

Tiền tố id giữ nguyên `bang-`:

```ts
export function taoIdMuc(): string {
  // Tiền tố `bang-` GIỮ NGUYÊN dù hàm đã đổi tên: đổi nó là đổi id của mọi mục tạo từ nay, trong
  // khi id cũ trong IndexedDB vẫn mang tiền tố cũ — hai họ id trong cùng một store, không được gì.
  return `bang-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
```

Cập nhật khối comment đầu file: `boardMeta.ts` → `mucMeta.ts`, "bảng vẽ" → "mục (bài viết + sơ đồ)".
**Chưa** đổi `IDB_STORES.boards` — store vẫn tên `boards` cho tới Plan 2.

Rồi cập nhật đường import + tên gọi ở mọi file trong danh sách Step 1.

- [ ] **Step 4: Kiểm sạch tên cũ**

```bash
grep -rn "boardMeta\|BangMeta\|taoIdBang\|capNhatSauKhiRoiBang\|bangKhopTimKiem" src/ --include=*.ts --include=*.tsx
```

Kỳ vọng: không kết quả.

- [ ] **Step 5: Chạy trọn bộ**

```bash
npm test
```

Kỳ vọng: xanh, **cùng số ca như trước Task 4**.

- [ ] **Step 6: Commit**

```bash
git status --short
git add src/board/mucMeta.ts src/board/__tests__/mucMeta.spec.ts
# … cộng mọi file từ danh sách Step 1
git commit -m "refactor(board): boardMeta.ts -> mucMeta.ts

Doi ten THUAN cho buoc gop bai viet + so do vao mot kho. BangMeta->MucMeta,
taoIdBang->taoIdMuc, capNhatSauKhiRoiBang->capNhatSauKhiRoiMuc,
bangKhopTimKiem->mucKhopTimKiem.

Tien to id 'bang-' giu nguyen (doi la sinh hai ho id trong cung store).
Chua them truong loai/danhMuc, chua doi ten store 'boards' - viec cua Plan 2.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Đổi tên thuần — `DanhSachBang.tsx` → `LuoiMuc.tsx`

**§0 luật 3.** File 2.700 dòng. Chỉ đổi tên file + tên component xuất ra. **Không** thêm props,
**không** đụng logic — Plan 2 mới làm.

**Files:**
- Rename: `src/board/DanhSachBang.tsx` → `src/board/LuoiMuc.tsx`
- Rename: `src/board/__tests__/DanhSachBang.spec.ts` → `src/board/__tests__/LuoiMuc.spec.ts`
- Rename: `src/board/__tests__/DanhSachBang-loi-luu-tru.spec.ts` → `src/board/__tests__/LuoiMuc-loi-luu-tru.spec.ts`
- Modify: `src/board/BoardGallery.tsx` (đường import + tên thẻ)

**Interfaces:**
- Produces: `LuoiMuc` (từ `DanhSachBang`) — **cùng props y hệt**, chưa thêm gì.
  `TheTrong` và `BoardOpenOrigin` giữ nguyên tên.

> ⚠️ **Cảnh báo trước khi bắt đầu.** `src/board/BoardGallery.tsx` và `src/board/DanhSachBang.tsx`
> đang **có thay đổi chưa commit của phiên khác** (đo lúc viết plan này). Chạy `git status` trước.
> Nếu vẫn còn, **hỏi chủ dự án** — đổi tên một file đang bị người khác sửa dở là cách chắc chắn nhất
> để mất việc của họ ([[project_concurrent_sessions_shared_worktree]]).

- [ ] **Step 1: Kiểm working tree**

```bash
git status --short src/board/
```

Kỳ vọng: `DanhSachBang.tsx` và `BoardGallery.tsx` **sạch**. Nếu bẩn → dừng, hỏi chủ dự án.

- [ ] **Step 2: Tìm hết chỗ dùng**

```bash
grep -rn "DanhSachBang" src/ --include=*.ts --include=*.tsx
```

- [ ] **Step 3: `git mv` ba file**

```bash
git mv src/board/DanhSachBang.tsx src/board/LuoiMuc.tsx
git mv src/board/__tests__/DanhSachBang.spec.ts src/board/__tests__/LuoiMuc.spec.ts
git mv src/board/__tests__/DanhSachBang-loi-luu-tru.spec.ts src/board/__tests__/LuoiMuc-loi-luu-tru.spec.ts
```

- [ ] **Step 4: Đổi định danh**

Trong `LuoiMuc.tsx`: `export function DanhSachBang(` → `export function LuoiMuc(`. Cập nhật khối
comment đầu file (nay phục vụ cả bài viết lẫn sơ đồ; props lọc sẽ tới ở Plan 2).

Trong `BoardGallery.tsx`: đường import và `<DanhSachBang …>` → `<LuoiMuc …>`.

Trong hai file spec: chỉ đường import và tên component trong `createElement`. **Không sửa `expect`.**

- [ ] **Step 5: Kiểm sạch + chạy trọn bộ**

```bash
grep -rn "DanhSachBang" src/ --include=*.ts --include=*.tsx
npm test
```

Kỳ vọng: grep không kết quả; test xanh, **cùng số ca**.

- [ ] **Step 6: Commit**

```bash
git status --short
git add src/board/LuoiMuc.tsx src/board/BoardGallery.tsx src/board/__tests__/LuoiMuc.spec.ts src/board/__tests__/LuoiMuc-loi-luu-tru.spec.ts
git commit -m "refactor(board): DanhSachBang.tsx -> LuoiMuc.tsx

Doi ten THUAN. Luoi the nay se phuc vu ca bai viet lan so do o Plan 2;
doi ten truoc de commit them props loc sau nay la diff thuan hanh vi.
Khong sua mot expect nao.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Bóc `mo-doc.ts` NGUYÊN VĂN

**§0 luật 4.** Chuyển ~150 dòng logic đua/hạn giờ sang file mới, **giữ nguyên tên hàm và chữ ký**.
Bằng chứng đây là phép bóc nguyên văn: toàn bộ spec xanh mà **không sửa một `expect` nào**.

**Files:**
- Create: `src/board/mo-doc.ts`
- Modify: `src/board/EdgelessBoard.tsx` (gỡ phần đã bóc, import lại)
- Modify: `src/board/__tests__/edgeless-board.spec.ts` (đường import)
- Modify: `src/board/xuatAnhBang.ts` (đường import — nó cũng gọi `taoHoacMoBang`)

**Interfaces:**
- Produces (chữ ký **y hệt** bản đang có trong `EdgelessBoard.tsx`):
  ```ts
  export function taoHoacMoBang(boardId: string, tuyChon?: {
    docSources?: { main: DocSource }
    blobSources?: { main: BlobSource }
    hanGioMs?: number
    khongSeed?: boolean
    hanGioNoiDungMs?: number
  }): Promise<{ workspace: TestWorkspace; store: Store; khongLuuDuoc: boolean }>
  ```

- [ ] **Step 1: Xác định chính xác phần cần bóc**

```bash
grep -n "TEN_CSDL_BANG\|HAN_GIO_MAC_DINH_MS\|HAN_GIO_NOI_DUNG_MAC_DINH_MS\|doiCoHanGio\|doiNoiDungToi\|luotMoDangCho\|taoHoacMoBang\|moBangThat\|storeManager" src/board/EdgelessBoard.tsx
```

Phần bóc gồm: hằng `TEN_CSDL_BANG`, `HAN_GIO_MAC_DINH_MS`, `HAN_GIO_NOI_DUNG_MAC_DINH_MS`, hàm
`doiCoHanGio`, `doiNoiDungToi`, biến `luotMoDangCho`, `storeManager`, `taoHoacMoBang`, `moBangThat`.

`viewManager` **ở lại** `EdgelessBoard.tsx` — Task 10 mới dời nó sang `extensions.ts`.

- [ ] **Step 2: Tạo `src/board/mo-doc.ts`**

Cắt-dán **nguyên văn** các khối trên, kèm **toàn bộ comment** (chúng ghi lại các cuộc đua đã đo
thật — mất chúng là mất tài liệu đắt nhất của file). Thêm đầu file:

```ts
// Mở hoặc tạo một doc BlockSuite — workspace, hạn giờ, chống đua, seed khối gốc.
//
// Bóc ra khỏi EdgelessBoard.tsx ngày 2026-09-04 NGUYÊN VĂN (không sửa một dòng logic nào) để chế độ
// TRANG (TrangBaiViet.tsx) dùng chung đúng cơ chế này thay vì chép lại. Mọi comment bên dưới nói về
// các cuộc đua ĐÃ ĐO THẬT trên máy — đừng rút gọn chúng.
//
// File này KHÔNG biết gì về React và KHÔNG biết gì về chế độ hiển thị. Nó chỉ trả về `store` +
// `workspace`; ai mount cây Lit nào lên đó là việc của bên gọi.
import { StoreExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { TestWorkspace } from '@blocksuite/affine/store/test'
import type { BlobSource, DocSource } from '@blocksuite/sync'
import { IndexedDBBlobSource, IndexedDBDocSource } from '@blocksuite/sync'
```

- [ ] **Step 3: Gỡ khỏi `EdgelessBoard.tsx`, import lại**

Xoá các khối đã bóc. Thêm:

```ts
import { taoHoacMoBang } from './mo-doc'
```

Và **tái xuất** để bên ngoài không gãy ở lượt này (`xuatAnhBang.ts` và `edgeless-board.spec.ts`
đang import từ đây):

```ts
// Tái xuất để lượt bóc `mo-doc.ts` là một phép DI CHUYỂN THUẦN — bên gọi chưa phải đổi gì. Step 5
// dưới đây trỏ chúng thẳng sang `./mo-doc`, rồi dòng này biến mất.
export { taoHoacMoBang } from './mo-doc'
```

- [ ] **Step 4: Chạy — phải xanh mà KHÔNG sửa test**

```bash
npm test
```

Kỳ vọng: xanh toàn bộ, **chưa đụng một file spec nào**. Đây là bằng chứng của §0 luật 4.
Nếu phải sửa test để xanh ⇒ đây không phải phép bóc nguyên văn ⇒ hoàn nguyên và làm lại.

- [ ] **Step 5: Trỏ bên gọi thẳng sang `mo-doc`, gỡ tái xuất**

Trong `src/board/xuatAnhBang.ts`:

```ts
import { taoHoacMoBang } from './mo-doc'
```

Trong `src/board/__tests__/edgeless-board.spec.ts`:

```ts
import { taoHoacMoBang } from '../mo-doc'
```

Rồi xoá dòng tái xuất ở `EdgelessBoard.tsx`.

- [ ] **Step 6: Chạy lại**

```bash
npm test
```

Kỳ vọng: xanh, cùng số ca.

- [ ] **Step 7: Commit**

```bash
git status --short
git add src/board/mo-doc.ts src/board/EdgelessBoard.tsx src/board/xuatAnhBang.ts src/board/__tests__/edgeless-board.spec.ts
git commit -m "refactor(board): boc mo-doc.ts nguyen van khoi EdgelessBoard.tsx

Chuyen TEN_CSDL_BANG, hai hang han gio, doiCoHanGio, doiNoiDungToi,
luotMoDangCho, storeManager, taoHoacMoBang, moBangThat sang file rieng.
Giu NGUYEN ten ham va chu ky - chua them tham so loai (Task 7).

Bang chung day la phep di chuyen thuan: toan bo spec xanh ma khong sua
mot expect nao, chi sua duong import.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: `taoHoacMoDoc(id, loai)` — seed theo loại

Giờ mới đổi chữ ký (§0 luật 4 cho phép ở commit sau).

**Files:**
- Modify: `src/board/mo-doc.ts`
- Modify: `src/board/EdgelessBoard.tsx`, `src/board/xuatAnhBang.ts` (bên gọi)
- Modify: `src/board/__tests__/edgeless-board.spec.ts`, `src/board/__tests__/trang-mount.spec.ts`
- Test: `src/board/__tests__/mo-doc-seed.spec.ts` (mới)

**Interfaces:**
- Consumes: `LoaiMuc` — khai **tạm thời trong `mo-doc.ts`** ở task này:
  ```ts
  export type LoaiMuc = 'bai-viet' | 'so-do'
  ```
  Plan 2 sẽ dời khai báo sang `mucMeta.ts` và `mo-doc.ts` import lại. Cố ý chưa dời ở đây: `mucMeta.ts`
  phải nằm **ngoài** ranh giới nạp chậm D13 (`src/App.tsx` import kiểu từ nó), mà `mo-doc.ts` thì
  import `@blocksuite/*` — chiều phụ thuộc phải là `mo-doc → mucMeta`, không được ngược lại.
- Produces:
  ```ts
  export function taoHoacMoDoc(docId: string, loai: LoaiMuc, tuyChon?: {…}): Promise<{…}>
  ```
  Tham số `tuyChon` giữ nguyên y hệt Task 6.

- [ ] **Step 1: Viết ca kiểm thất bại**

Tạo `src/board/__tests__/mo-doc-seed.spec.ts`:

```ts
// Canh hình dạng khối gốc mà `taoHoacMoDoc` seed cho TỪNG LOẠI mục.
//
// environment 'node' (mặc định) — file này không mount cây Lit nào, chỉ đọc `store`. docSources giả
// thay cho IndexedDB, cùng kỹ thuật với edgeless-board.spec.ts (đọc file đó để hiểu vì sao).
import { describe, expect, it } from 'vitest'
import { mergeUpdates } from 'yjs'

import type { BlobSource, DocSource } from '@blocksuite/sync'

import { taoHoacMoDoc } from '../mo-doc'

function dungDocSourceGia(): DocSource {
  const kho = new Map<string, Uint8Array[]>()
  return {
    name: 'gia-lap',
    pull(docId) {
      const cacLuot = kho.get(docId)
      if (!cacLuot || cacLuot.length === 0) return null
      return { data: mergeUpdates(cacLuot) }
    },
    push(docId, data) {
      const cacLuot = kho.get(docId) ?? []
      cacLuot.push(data)
      kho.set(docId, cacLuot)
    },
    subscribe() {
      return () => {}
    },
  }
}

function dungBlobSourceGia(): BlobSource {
  const kho = new Map<string, Blob>()
  return {
    name: 'gia-lap',
    readonly: false,
    async get(key) {
      return kho.get(key) ?? null
    },
    async set(key, value) {
      kho.set(key, value)
      return key
    },
    async delete(key) {
      kho.delete(key)
    },
    async list() {
      return [...kho.keys()]
    },
  }
}

/** Một cặp nguồn giả DÙNG CHUNG — tái sử dụng giữa hai lượt gọi để mô phỏng "đóng rồi mở lại app". */
function nguonGia() {
  return {
    docSources: { main: dungDocSourceGia() },
    blobSources: { main: dungBlobSourceGia() },
  }
}

describe('taoHoacMoDoc seed theo loại', () => {
  it("loại 'so-do' seed page + surface, KHÔNG có note", async () => {
    const { store, workspace } = await taoHoacMoDoc('sd-1', 'so-do', nguonGia())
    const con = store.root!.children.map((k) => k.flavour)

    expect(store.root!.flavour).toBe('affine:page')
    expect(con).toContain('affine:surface')
    expect(con).not.toContain('affine:note')

    workspace.forceStop()
  })

  it("loại 'bai-viet' seed page + surface + note + paragraph", async () => {
    const { store, workspace } = await taoHoacMoDoc('bv-1', 'bai-viet', nguonGia())
    const con = store.root!.children

    expect(store.root!.flavour).toBe('affine:page')
    expect(con.map((k) => k.flavour)).toContain('affine:surface')

    const note = con.find((k) => k.flavour === 'affine:note')
    expect(note, 'bài viết phải có note để có chỗ gõ').toBeDefined()
    expect(note!.children.map((k) => k.flavour)).toContain('affine:paragraph')

    workspace.forceStop()
  })

  it('mở lại một doc đã có KHÔNG seed đè lần hai', async () => {
    // Đây là cuộc đua đã đo thật 2026-08-30 (2 root + 2 surface; gfx.surface bám vào surface mồ
    // côi nên thanh công cụ vẽ ra mà không gì render được). Ca này canh rằng phép thêm tham số
    // `loai` không phá mất phần chống seed-đè.
    const nguon = nguonGia()
    const lan1 = await taoHoacMoDoc('bv-2', 'bai-viet', nguon)
    const soCon1 = lan1.store.root!.children.length
    lan1.workspace.forceStop()

    const lan2 = await taoHoacMoDoc('bv-2', 'bai-viet', nguon)
    expect(lan2.store.root!.children.length).toBe(soCon1)
    expect(
      lan2.store.root!.children.filter((k) => k.flavour === 'affine:surface').length,
    ).toBe(1)
    lan2.workspace.forceStop()
  })
})
```

- [ ] **Step 2: Chạy để xác nhận ĐỎ**

```bash
npx vitest run src/board/__tests__/mo-doc-seed.spec.ts
```

Kỳ vọng: ĐỎ với `taoHoacMoDoc is not a function`.

- [ ] **Step 3: Đổi chữ ký + thêm nhánh seed**

Trong `src/board/mo-doc.ts`, đổi `taoHoacMoBang` → `taoHoacMoDoc` và `moBangThat` → `moDocThat`,
thêm tham số `loai: LoaiMuc` vào cả hai (vị trí thứ hai, trước `tuyChon`). Thay khối seed:

```ts
      if (!store.root) {
        const rootId = store.addBlock('affine:page', {})
        store.addBlock('affine:surface', {}, rootId)
        // Bài viết cần một note + một đoạn văn rỗng để mở ra là có chỗ gõ ngay.
        // `page-root-block.ts:162` của thượng nguồn tự tạo note khi bấm vào vùng trống, nên đây là
        // TIỆN NGHI chứ không phải bắt buộc — nhưng thiếu nó thì bài mới mở ra là một trang trắng
        // không con trỏ, đọc như lỗi.
        //
        // Sơ đồ VẪN chỉ page+surface như trước: một note mặc định trên canvas là một ô trống lơ
        // lửng người dùng không đặt ở đó.
        if (loai === 'bai-viet') {
          const noteId = store.addBlock('affine:note', {}, rootId)
          store.addBlock('affine:paragraph', {}, noteId)
        }
        daGhiKhoiMoi = true
      } else if (!store.root.children.some((khoi) => khoi.flavour === 'affine:surface')) {
```

**Bài viết VẪN seed `affine:surface`** — spec §3.3: giữ MỘT hình dạng doc duy nhất cho `Transformer`
xuất/nhập ở Plan 2, và giữ nguyên nhánh tự-hồi-phục cho cả hai loại thay vì rẽ đôi.

Khai `LoaiMuc` ở đầu file kèm comment giải thích vì sao tạm nằm đây (xem **Interfaces**).

- [ ] **Step 4: Cập nhật bên gọi**

- `EdgelessBoard.tsx`: `taoHoacMoBang(boardId)` → `taoHoacMoDoc(boardId, 'so-do')`
- `xuatAnhBang.ts`: thêm `'so-do'` (nó dùng `khongSeed: true` nên `loai` không đổi hành vi, nhưng
  chữ ký bắt buộc)
- `edgeless-board.spec.ts`: mọi lời gọi thêm `'so-do'`
- `trang-mount.spec.ts`: đổi sang `taoHoacMoDoc(id, 'bai-viet')` và **xoá ba dòng tự thêm
  note/paragraph** — giờ `mo-doc.ts` lo việc đó. Ba `expect` giữ nguyên.

- [ ] **Step 5: Chạy trọn bộ**

```bash
npm test
```

Kỳ vọng: xanh, +3 ca mới.

- [ ] **Step 6: Chứng minh ca seed ĐỎ được**

Sửa tạm nhánh `if (loai === 'bai-viet')` thành `if (false)`, chạy:

```bash
npx vitest run src/board/__tests__/mo-doc-seed.spec.ts
```

Kỳ vọng: ca `'bai-viet' seed page + surface + note + paragraph` **ĐỎ**. Hoàn nguyên, chạy lại xanh.

- [ ] **Step 7: Commit**

```bash
git status --short
git add src/board/mo-doc.ts src/board/EdgelessBoard.tsx src/board/xuatAnhBang.ts src/board/__tests__/mo-doc-seed.spec.ts src/board/__tests__/edgeless-board.spec.ts src/board/__tests__/trang-mount.spec.ts
git commit -m "feat(board): taoHoacMoDoc(id, loai) - seed theo loai muc

Bai viet: page + surface + note + paragraph rong (co cho go ngay).
So do:    page + surface (giu nguyen hanh vi cu).

Bai viet VAN seed surface de giu mot hinh dang doc duy nhat cho Transformer
xuat/nhap o Plan 2, va giu nguyen nhanh tu-hoi-phuc cho ca hai loai.

Da chung minh do duoc: tat nhanh seed note lam ca 'bai-viet' do.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: `TrangBaiViet.tsx` — vỏ React cho page mode

**Files:**
- Create: `src/board/TrangBaiViet.tsx`
- Test: `src/board/__tests__/trang-bai-viet-mount.spec.ts` (mới)

**Interfaces:**
- Consumes: `taoHoacMoDoc` (Task 7), `layExtensionsTrang` (Task 1; Task 10 dời sang `extensions.ts`),
  `capNhatSauKhiRoiMuc` + `ghepNoiDungTimKiem` + `trichVanBanTuKhoi` (Task 4),
  `resolveTheme`/`watchResolvedTheme` (`../lib/theme`), `ganMoiBanPhimIOS` (`./ban-phim-ios`),
  `VeChuyenKhoaDangTai` (`./VeChuyenKhoaDangTai`)
- Produces:
  ```ts
  export function TrangBaiViet(props: {
    docId: string
    khoa?: string
    onReady?: () => void
  }): ReactElement
  ```

**Khác `EdgelessBoard.tsx` ở đúng bốn điểm** (spec §3.3):
1. `layExtensionsTrang()` thay `layExtensionsEdgeless()`
2. **KHÔNG** gọi `laKhungHep()` / `theoDoiKhungHep()` — bài viết sửa được ở mọi bề ngang
3. **KHÔNG** cần `dong-bo-toa-do-viewport.ts`, `viewport-ios.ts`, `xep-o-tu-dong.ts` (chuyện canvas)
4. `noiDungTimKiem` chỉ từ `trichVanBanTuKhoi(store.root)` — trang không có
   `surface.elementModels` mang chữ

- [ ] **Step 1: Đọc bản mẫu trước khi viết**

```bash
grep -n "useEffect\|litRender\|forceStop\|watchResolvedTheme\|ganMoiBanPhimIOS\|capNhatSauKhiRoi\|storeRef\|useRef" src/board/EdgelessBoard.tsx
```

Đọc trọn khối `useEffect` mount/unmount của `EdgelessBoard.tsx`. `TrangBaiViet` **chép cấu trúc đó**,
bỏ bốn thứ ở trên. Đặc biệt chú ý cách nó giữ `store` qua ref để hàm dọn dẹp còn đọc được —
`TrangBaiViet` làm y hệt.

- [ ] **Step 2: Viết ca kiểm thất bại**

Tạo `src/board/__tests__/trang-bai-viet-mount.spec.ts`:

```ts
// @vitest-environment happy-dom
//
// Cầu nối React↔Lit cho CHẾ ĐỘ TRANG — thứ mà `trang-mount.spec.ts` không chạm (file đó gọi thẳng
// BlockStdScope, nên xoá sạch component TrangBaiViet nó vẫn xanh). Song sinh của
// `edgeless-board-mount.spec.ts`; đọc file đó trước.
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { IDB_STORES, idbGetAll, idbPut } from '../../lib/idb'
import type { MucMeta } from '../mucMeta'
import { TrangBaiViet } from '../TrangBaiViet'
import { choDom } from '../../__tests__/helpers/cho-den-khi'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const taoCtxGia = (canvas: HTMLCanvasElement): unknown =>
  new Proxy(function () {} as unknown as object, {
    get(_t, p) {
      if (p === 'canvas') return canvas
      if (p === Symbol.toPrimitive) return () => 0
      return taoCtxGia(canvas)
    },
    set: () => true,
    apply: () => taoCtxGia(canvas),
  })
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  return taoCtxGia(this)
} as HTMLCanvasElement['getContext']

let boc: HTMLDivElement
let root: Root

async function ghiMeta(id: string, ten: string) {
  await idbPut<MucMeta>(IDB_STORES.boards, {
    id,
    ten,
    taoLuc: Date.now(),
    capNhatLuc: Date.now(),
    chuyenKhoa: 'cardiology',
    tags: [],
    noiDungTimKiem: '',
  })
}

beforeEach(() => {
  boc = document.createElement('div')
  document.body.append(boc)
  root = createRoot(boc)
})

afterEach(async () => {
  await act(async () => root.unmount())
  boc.remove()
})

describe('TrangBaiViet', () => {
  it('mount ra thẻ gốc page và một vùng soạn thảo', async () => {
    await ghiMeta('bv-mount-1', 'Bài thử')

    await act(async () => {
      root.render(createElement(TrangBaiViet, { docId: 'bv-mount-1' }))
    })

    await choDom(() => expect(boc.querySelector('drt-page-root')).not.toBeNull())
    await choDom(() => expect(boc.querySelector('[contenteditable="true"]')).not.toBeNull())
  })

  it('KHÔNG khoá chỉ-đọc dù matchMedia báo khung hẹp', async () => {
    // Luật chỉ-đọc-khung-hẹp CHỈ áp cho sơ đồ (spec quyết định 8). Bài viết phải gõ được trên điện
    // thoại dọc — đó là cả lý do bật thanh công cụ bàn phím ảo ở Task 10.
    //
    // happy-dom KHÔNG bắn sự kiện change của matchMedia khi đổi kích thước
    // ([[feedback_resize-window-khong-ban-matchmedia-change]]), nên ca này ép `matchMedia` báo
    // "khớp" ngay từ lúc mount thay vì cố đổi bề ngang.
    const matchMediaCu = window.matchMedia
    window.matchMedia = ((q: string) => ({
      matches: true,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    try {
      await ghiMeta('bv-mount-2', 'Bài hẹp')

      await act(async () => {
        root.render(createElement(TrangBaiViet, { docId: 'bv-mount-2' }))
      })

      await choDom(() => expect(boc.querySelector('drt-page-root')).not.toBeNull())
      // Vùng soạn thảo còn sống ⇒ store không bị đặt readonly.
      expect(boc.querySelector('[contenteditable="true"]')).not.toBeNull()
    } finally {
      window.matchMedia = matchMediaCu
    }
  })

  it('rời bài viết thì ghi lại metadata', async () => {
    await ghiMeta('bv-mount-3', 'Bài rời')

    await act(async () => {
      root.render(createElement(TrangBaiViet, { docId: 'bv-mount-3' }))
    })
    await choDom(() => expect(boc.querySelector('drt-page-root')).not.toBeNull())

    await act(async () => root.unmount())

    // `capNhatSauKhiRoiMuc` là fire-and-forget; chờ tới khi bản ghi hiện ra.
    await choDom(async () => {
      const ds = await idbGetAll<MucMeta>(IDB_STORES.boards)
      const muc = ds.find((m) => m.id === 'bv-mount-3')
      expect(muc, 'metadata phải còn sau khi rời bài').toBeDefined()
      // Chỉ MỞ RỒI RỜI, không gõ gì ⇒ capNhatLuc KHÔNG được nhảy (cùng luật với bảng vẽ).
      expect(muc!.ten).toBe('Bài rời')
    })
  })
})
```

> **Lưu ý:** ca thứ ba dùng `choDom` với callback `async`. Đọc `src/__tests__/helpers/cho-den-khi.ts`
> xác nhận `choDom` nhận điều kiện async; nếu không, dùng hàm còn lại trong file đó (`choDenKhi`)
> hoặc bọc phần đọc IndexedDB ra ngoài. **Đừng đổi ba `expect`.**

- [ ] **Step 3: Chạy để xác nhận ĐỎ**

```bash
npx vitest run src/board/__tests__/trang-bai-viet-mount.spec.ts
```

Kỳ vọng: ĐỎ — không import được `../TrangBaiViet`.

- [ ] **Step 4: Viết `TrangBaiViet.tsx`**

```tsx
// Vỏ React cho CHẾ ĐỘ TRANG. Song sinh mỏng của EdgelessBoard.tsx — cùng cơ chế mount (React giữ
// một thẻ div; BlockStdScope dựng cây Lit rồi Lit render vào đó), cùng `mo-doc.ts`, cùng theme
// watcher, cùng cách đếm thay đổi nội dung để bump `capNhatLuc`.
//
// KHÁC edgeless đúng bốn điểm, tất cả đều cố ý:
//   1. `layExtensionsTrang()` thay `layExtensionsEdgeless()`
//   2. KHÔNG có `laKhungHep()`/`theoDoiKhungHep()` — bài viết sửa được ở MỌI bề ngang (quyết định
//      của chủ dự án 2026-09-04). Gõ chữ trên điện thoại là chuyện bình thường, khác hẳn vẽ sơ đồ.
//   3. KHÔNG cần dong-bo-toa-do-viewport / viewport-ios / xep-o-tu-dong — đều là chuyện của canvas.
//   4. `noiDungTimKiem` chỉ lấy từ `trichVanBanTuKhoi(store.root)`; trang không có
//      `surface.elementModels` mang chữ nên `trichVanBanTuCanvas` vô nghĩa ở đây.
import { BlockStdScope } from '@blocksuite/affine/std'
import { render as litRender } from 'lit'
import { useEffect, useRef, useState } from 'react'

import { resolveTheme, watchResolvedTheme } from '../lib/theme'
import { ganMoiBanPhimIOS } from './ban-phim-ios'
// TẠM import từ EdgelessBoard: Task 1 đặt `layExtensionsTrang()` ở đó (lát cắt spike mỏng nhất),
// Task 10 mới dời nó cùng `viewManager` sang `extensions.ts` rồi đổi dòng này thành
// `from './extensions'`. Trong khoảng đó, TrangBaiViet kéo theo module edgeless — vô hại vì hai chế
// độ DÙNG CHUNG MỘT CHUNK (viewManager là singleton, xem §3.4 của spec), chỉ là tạm xấu.
import { layExtensionsTrang } from './EdgelessBoard'
import { taoHoacMoDoc } from './mo-doc'
import { capNhatSauKhiRoiMuc, ghepNoiDungTimKiem, trichVanBanTuKhoi } from './mucMeta'
import { VeChuyenKhoaDangTai } from './VeChuyenKhoaDangTai'

import '../../.vendor-build/theme/style.css'
import './cau-noi-thuong-hieu.css'

export function TrangBaiViet({
  docId,
  khoa,
  onReady,
}: {
  docId: string
  khoa?: string
  onReady?: () => void
}) {
  const boc = useRef<HTMLDivElement>(null)
  const [dangMo, setDangMo] = useState(true)

  useEffect(() => {
    const el = boc.current
    if (!el) return

    let daThao = false
    let ws: { forceStop: () => void } | null = null
    // Giữ `store` ở biến trong closure để hàm dọn dẹp còn đọc được nội dung TRƯỚC khi tháo cây Lit
    // — cùng cách EdgelessBoard.tsx làm.
    let storeHienTai: { root: unknown } | null = null
    let boWatchTheme: (() => void) | undefined
    let boBanPhim: (() => void) | undefined
    let boTheoDoiKhoi: (() => void) | undefined
    let coThayDoiNoiDung = false

    taoHoacMoDoc(docId, 'bai-viet')
      .then(({ workspace, store }) => {
        if (daThao) {
          workspace.forceStop()
          return
        }
        ws = workspace
        storeHienTai = store as unknown as { root: unknown }

        // KHÔNG đặt `store.readonly` — xem điểm 2 ở đầu file.
        const std = new BlockStdScope({ store, extensions: layExtensionsTrang() })
        litRender(std.render(), el)

        // Chỉ đếm sự kiện CỤC BỘ (do người dùng gõ), bỏ qua lượt đồng bộ/hydrate — cùng luật đã
        // dùng cho bảng vẽ, để "mở ra xem rồi thoát" không làm nhãn "cập nhật lần cuối" nhảy.
        const dangKy = store.slots.blockUpdated.subscribe((e: { isLocal?: boolean }) => {
          if (e.isLocal) coThayDoiNoiDung = true
        })
        boTheoDoiKhoi = () => dangKy.unsubscribe()

        el.dataset.theme = resolveTheme()
        boWatchTheme = watchResolvedTheme(() => {
          el.dataset.theme = resolveTheme()
        })
        boBanPhim = ganMoiBanPhimIOS(el)

        setDangMo(false)
        onReady?.()
      })
      .catch((loi) => {
        console.error('Không mở được bài viết:', loi)
        setDangMo(false)
      })

    return () => {
      daThao = true
      // Trích nội dung tìm kiếm TRƯỚC khi tháo cây Lit và dừng workspace — sau đó `store.root`
      // không còn đọc được.
      let noiDungTimKiem = ''
      try {
        const goc = storeHienTai?.root
        if (goc) noiDungTimKiem = ghepNoiDungTimKiem(trichVanBanTuKhoi(goc as never), '')
      } catch {
        noiDungTimKiem = ''
      }
      boTheoDoiKhoi?.()
      boWatchTheme?.()
      boBanPhim?.()
      litRender(null, el)
      ws?.forceStop()
      void capNhatSauKhiRoiMuc(docId, coThayDoiNoiDung, noiDungTimKiem)
    }
  }, [docId, onReady])

  return (
    <div className="h-full relative" style={{ background: 'var(--c-page)' }}>
      <div ref={boc} className="h-full" />
      {dangMo && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          role="status"
          aria-live="polite"
          style={{ background: 'var(--c-page)' }}
        >
          <div style={{ width: 72, height: 72 }}>
            <VeChuyenKhoaDangTai khoa={khoa} />
          </div>
          <span className="sr-only">Đang mở bài viết…</span>
        </div>
      )}
    </div>
  )
}
```

> **Ba chỗ phải đối chiếu với `EdgelessBoard.tsx` thay vì tin bản phác trên:**
> chữ ký trả về của `watchResolvedTheme` và `ganMoiBanPhimIOS` (có trả hàm huỷ không?), hình dạng
> `store.slots.blockUpdated.subscribe` (trả `{ unsubscribe }` hay một hàm?), và kiểu thật của
> `store.root`. Sửa cho khớp; **đừng để lại `as never`/`as unknown` trong mã cuối.**

- [ ] **Step 5: Chạy để xác nhận XANH**

```bash
npx vitest run src/board/__tests__/trang-bai-viet-mount.spec.ts
```

Kỳ vọng: 3 PASS.

- [ ] **Step 6: Chạy trọn bộ**

```bash
npm test
```

- [ ] **Step 7: Commit**

```bash
git status --short
git add src/board/TrangBaiViet.tsx src/board/__tests__/trang-bai-viet-mount.spec.ts
git commit -m "feat(board): TrangBaiViet.tsx - vo React cho page mode

Song sinh mong cua EdgelessBoard.tsx. Khac dung bon diem: extension trang,
KHONG co luat chi-doc-khung-hep (bai viet sua duoc moi be ngang), khong can
ba module cua canvas, noiDungTimKiem chi tu khoi.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: `index.tsx` — vỏ nạp chậm chọn theo `loai`

**Files:**
- Modify: `src/board/index.tsx`
- Modify: `src/board/BoardGallery.tsx` (bên gọi duy nhất hiện có)
- Test: `src/board/__tests__/ranh-gioi-nap-bang.spec.ts` (mở rộng ca đã có)

**Interfaces:**
- Consumes: `LoaiMuc` — **PHẢI là `import type`**, không phải import thường:
  ```ts
  import type { LoaiMuc } from './mo-doc'
  ```
  `mo-doc.ts` import `@blocksuite/*`. `index.tsx` là vỏ nạp chậm nằm **trong** bundle vỏ app, nên một
  import giá trị từ đó kéo cả khối BlockSuite vào chunk vỏ và **phá thẳng ranh giới D13** — đúng thứ
  cả file này tồn tại để giữ. `import type` bị xoá lúc biên dịch nên an toàn; đây chính là cách
  `src/App.tsx` đang import `BangMeta`.
- Produces: component vỏ nhận thêm prop `loai: LoaiMuc`; `'bai-viet'` nạp `TrangBaiViet`,
  `'so-do'` nạp `EdgelessBoard` thật.

- [ ] **Step 1: Mở rộng ca ranh giới nạp chậm**

Đọc `src/board/__tests__/ranh-gioi-nap-bang.spec.ts` trước — nó đã canh D13 và đã có sẵn biến trỏ
tới thư mục. Thêm:

```ts
it('index.tsx không import tĩnh TrangBaiViet (ranh giới D13)', () => {
  const nguon = readFileSync(path.resolve(thuMuc, '../index.tsx'), 'utf8')
  // Chỉ được nhắc tới trong một `import()` động bên trong lazy(). Một dòng
  // `import … from './TrangBaiViet'` ở đầu file kéo cả khối BlockSuite vào chunk vỏ app.
  expect(nguon).not.toMatch(/^import\s+[^\n]*from\s+['"]\.\/TrangBaiViet['"]/m)
  expect(nguon).toMatch(/import\(['"]\.\/TrangBaiViet['"]\)/)
})

it('index.tsx chỉ import KIỂU từ mo-doc (ranh giới D13)', () => {
  const nguon = readFileSync(path.resolve(thuMuc, '../index.tsx'), 'utf8')
  // `mo-doc.ts` import @blocksuite/*. Một import GIÁ TRỊ từ đó kéo cả khối BlockSuite vào chunk vỏ
  // app. Chỉ `import type` (bị xoá lúc biên dịch) mới được phép — cùng luật App.tsx đang theo.
  const dongMoDoc = nguon.match(/^import\s+[^\n]*from\s+['"]\.\/mo-doc['"]/m)
  if (dongMoDoc) expect(dongMoDoc[0]).toMatch(/^import\s+type\s/)
})
```

> Đối chiếu tên biến `thuMuc` với file thật; nếu file dùng tên khác cho đường dẫn thư mục, dùng tên
> đó. Cũng kiểm `readFileSync`/`path` đã được import ở đầu file chưa.

- [ ] **Step 2: Chạy để xác nhận ĐỎ**

```bash
npx vitest run src/board/__tests__/ranh-gioi-nap-bang.spec.ts
```

Kỳ vọng: ĐỎ ở khẳng định thứ hai (chưa có `import('./TrangBaiViet')`).

- [ ] **Step 3: Sửa `index.tsx`**

Thêm `loai` vào `PropsBang`, và cho kho lazy phân biệt theo loại:

```tsx
type PropsBang = {
  boardId: string
  /**
   * Loại mục — quyết định vỏ nào được nạp. Cùng MỘT chunk cho cả hai (viewManager là singleton, xem
   * extensions.ts), nên đây chỉ chọn component chứ không đổi khối lượng tải.
   */
  loai: LoaiMuc
  khoa?: string
  onReady?: () => void
  onXuatSanSang?: (xuat: XuatBangFn | null) => void
}

// Khoá gồm CẢ loại: hai vỏ là hai đối tượng lazy khác nhau, và cơ chế "thử lại bằng cách dựng một
// lazy MỚI" (xem chú thích dài ở đầu file về việc React.lazy nhớ vĩnh viễn promise bị từ chối) phải
// thử lại đúng vỏ đang hỏng.
const kho = new Map<string, ComponentType<PropsBang>>()

function layBang(lan: number, loai: LoaiMuc): ComponentType<PropsBang> {
  const khoaKho = `${loai}:${lan}`
  const co = kho.get(khoaKho)
  if (co) return co
  // PHẢI đứng trước `import()` — xem chú thích hiện có về ~190 thẻ <style> mà chunk tiêm vào <head>.
  batLopCssVendor()
  const moi = (
    loai === 'bai-viet'
      ? lazy(() => import('./TrangBaiViet').then((m) => ({ default: m.TrangBaiViet })))
      : lazy(() => import('./EdgelessBoard').then((m) => ({ default: m.EdgelessBoard })))
  ) as ComponentType<PropsBang>
  kho.set(khoaKho, moi)
  return moi
}
```

Trong `thuLai()`: `kho.delete(\`${this.props.loai}:${this.state.lan}\`)`.

Trong `render()`: `layBang(this.state.lan, this.props.loai)`; đổi chữ màn lỗi cho đúng loại
("Bảng vẽ được tải riêng…" ↔ "Bài viết được tải riêng…"); chỉ truyền `onXuatSanSang` khi
`loai === 'so-do'` (`TrangBaiViet` không nhận prop đó).

- [ ] **Step 4: Cập nhật bên gọi**

`src/board/BoardGallery.tsx` truyền `loai="so-do"`. Đây là bên gọi **duy nhất** hiện có; Plan 2 mới
thêm đường mở bài viết.

- [ ] **Step 5: Chạy trọn bộ**

```bash
npm test
```

- [ ] **Step 6: Commit**

```bash
git status --short
git add src/board/index.tsx src/board/BoardGallery.tsx src/board/__tests__/ranh-gioi-nap-bang.spec.ts
git commit -m "feat(board): vo nap cham chon vo theo loai muc

index.tsx nhan prop loai, nap TrangBaiViet hoac EdgelessBoard. Kho lazy
khoa theo 'loai:lan' de co che thu-lai dung lazy moi van dung vo dang hong.

Them ca canh D13: index.tsx khong duoc import tinh TrangBaiViet.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: Extension nhóm 1 + dời `viewManager` sang `extensions.ts`

Năm extension mà **không có thì page mode không dùng được**.

**Files:**
- Modify: `src/board/extensions.ts` (nhận `viewManager`, `layExtensionsTrang`, `layExtensionsEdgeless`)
- Modify: `src/board/EdgelessBoard.tsx`, `src/board/TrangBaiViet.tsx` (import lại)
- Test: `src/board/__tests__/dang-ky-custom-element.spec.ts` (mở rộng)

**Extension bật:** `DocTitleViewExtension` · `KeyboardToolbarViewExtension` ·
`PageDraggingAreaViewExtension` · `ScrollAnchoringViewExtension` · `DividerViewExtension`

- [ ] **Step 1: Dời `viewManager` + hai hàm `layExtensions*` sang `extensions.ts`**

Cắt `viewManager`, `layExtensionsEdgeless()`, `layExtensionsTrang()` khỏi `EdgelessBoard.tsx`, dán
vào cuối `extensions.ts` **nguyên văn kèm comment**. Rồi đổi hai đường import:

```ts
// src/board/EdgelessBoard.tsx
import { layExtensionsEdgeless } from './extensions'

// src/board/TrangBaiViet.tsx — thay dòng `from './EdgelessBoard'` tạm của Task 8, và XOÁ khối
// comment "TẠM import từ EdgelessBoard" ở đó (nó đã hết đúng).
import { layExtensionsTrang } from './extensions'
```

Sau bước này `TrangBaiViet.tsx` không còn import `EdgelessBoard.tsx` — kiểm bằng:

```bash
grep -n "EdgelessBoard" src/board/TrangBaiViet.tsx
```

Kỳ vọng: không kết quả.

**KHÔNG** dời hai lời gọi `EdgelessTemplatePanel.templates.extend(...)` — chúng là dữ liệu mẫu cho
thanh công cụ edgeless, để nguyên ở `EdgelessBoard.tsx`. Chỉ dời cấu hình extension.

```bash
npm test
```

Phải xanh **không sửa test** — đây vẫn là phép di chuyển thuần.

- [ ] **Step 2: Tra tên thẻ Lit thật**

Không đoán tên thẻ. Đọc từ cây vendored:

```bash
grep -rn "customElement('affine-" src/vendor/blocksuite/affine/fragments/doc-title/src/ \
  src/vendor/blocksuite/affine/widgets/keyboard-toolbar/src/ \
  src/vendor/blocksuite/affine/widgets/page-dragging-area/src/ \
  src/vendor/blocksuite/affine/blocks/divider/src/ \
  src/vendor/blocksuite/affine/widgets/scroll-anchoring/src/
```

Mỗi tên tìm được, đổi tiền tố `affine-` → `drt-` (bước `scripts/doi-ten-vendor.mjs`). Extension nào
không định nghĩa thẻ nào thì **bỏ khỏi ca kiểm Step 3**, đừng bịa tên.

- [ ] **Step 3: Viết ca kiểm thất bại**

Thêm vào `src/board/__tests__/dang-ky-custom-element.spec.ts` (đọc file trước để theo đúng mẫu và
đúng cách nó gọi `layExtensions*`):

```ts
it('nhóm 1 page mode: đăng ký đủ thẻ Lit', () => {
  // `.get('page')` chạy chuỗi setup → effect → effects(), tức customElements.define(...).
  layExtensionsTrang()

  // Tên thẻ lấy từ cây vendored (Step 2), đổi tiền tố affine- → drt-.
  expect(customElements.get('drt-doc-title'), 'DocTitle').toBeDefined()
  expect(customElements.get('drt-keyboard-toolbar-widget'), 'KeyboardToolbar').toBeDefined()
  expect(customElements.get('drt-page-dragging-area-widget'), 'PageDraggingArea').toBeDefined()
  expect(customElements.get('drt-divider'), 'Divider').toBeDefined()
})
```

- [ ] **Step 4: Chạy để xác nhận ĐỎ**

```bash
npx vitest run src/board/__tests__/dang-ky-custom-element.spec.ts
```

- [ ] **Step 5: Bật năm extension**

Trong `src/board/extensions.ts`, thêm năm dòng import và năm mục vào mảng `viewExtensions`, **đặt
đúng vị trí tương đối như thượng nguồn** — `thu-tu-view-extension.spec.ts` canh mảng của dự án là
**dãy con giữ nguyên thứ tự** của `affine/all/src/extensions/view.ts`. Mở file thượng nguồn, đọc thứ
tự thật, chèn theo.

Sửa luôn con số sai ở chú thích đầu file (`GIỮ 37 / 58` → con số thật sau lượt này).

- [ ] **Step 6: Chạy trọn bộ**

```bash
npm test
```

Kỳ vọng: xanh, **`thu-tu-view-extension.spec.ts` xanh** (chèn đúng thứ tự).

- [ ] **Step 7: Đo dung lượng — CỔNG NGƯỠNG**

```bash
npm run build
```

Ghi số gzip thật của chunk soạn thảo vào chú thích `extensions.ts`, theo mẫu số đo đã có trong file.
**Vượt 1.400 kB gzip ⇒ DỪNG, báo chủ dự án** (Global Constraints).

- [ ] **Step 8: Kiểm mắt — sáng và tối**

```bash
npm run dev
```

Mở một bài viết và một sơ đồ, ở **cả bản sáng và bản tối**:
1. CSS không rò sang màn khác (spec §6.2 — `.affine-page-viewport` là selector mới với app này).
2. Dưới 768 px: **thanh công cụ bàn phím ảo hiện ra** khi đặt con trỏ vào trang.
3. **Tiêu đề bài viết gõ được** — spec §6.3 cảnh báo `DocTitle` là *fragment*, ở AFFiNE thật do app
   chủ render chứ không phải `EditorHost`. Nếu tiêu đề không hiện, đây chính là lúc tự đặt thẻ
   `<drt-doc-title>` vào `TrangBaiViet.tsx` và truyền `doc` cho nó.
4. Console không lỗi.

- [ ] **Step 9: Commit**

```bash
git status --short
git add src/board/extensions.ts src/board/EdgelessBoard.tsx src/board/TrangBaiViet.tsx src/board/__tests__/dang-ky-custom-element.spec.ts
git commit -m "feat(board): extension nhom 1 - page mode dung duoc

DocTitle, KeyboardToolbar, PageDraggingArea, ScrollAnchoring, Divider.
Doi viewManager + layExtensions* tu EdgelessBoard.tsx sang extensions.ts
de TrangBaiViet khong phai import module edgeless.

Sua con so sai o chu thich dau file (37 -> so that).
Chunk soan thao: <so do that> kB gzip (nguong dung 1400).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 11: Extension nhóm 2 — nội dung phong phú

**Extension bật:** `TableViewExtension` · `CalloutViewExtension` · `OutlineViewExtension` ·
`DataViewViewExtension`

**Files:** `src/board/extensions.ts` · `src/board/__tests__/dang-ky-custom-element.spec.ts`

- [ ] **Step 1: Tra tên thẻ thật**

```bash
grep -rn "customElement('affine-" src/vendor/blocksuite/affine/blocks/table/src/ \
  src/vendor/blocksuite/affine/blocks/callout/src/ \
  src/vendor/blocksuite/affine/fragments/outline/src/ \
  src/vendor/blocksuite/affine/blocks/data-view/src/
```

- [ ] **Step 2: Viết ca kiểm thất bại**

Thêm vào `src/board/__tests__/dang-ky-custom-element.spec.ts`:

```ts
it('nhóm 2: đăng ký đủ thẻ Lit', () => {
  layExtensionsTrang()

  // Thay bốn chuỗi dưới bằng tên thật tra được ở Step 1, đổi tiền tố affine- → drt-.
  // Extension nào không định nghĩa thẻ nào thì BỎ dòng của nó, đừng bịa tên.
  expect(customElements.get('drt-table-block-component'), 'Table').toBeDefined()
  expect(customElements.get('drt-callout'), 'Callout').toBeDefined()
  expect(customElements.get('drt-outline-panel'), 'Outline').toBeDefined()
  expect(customElements.get('drt-data-view-block'), 'DataView').toBeDefined()
})
```

- [ ] **Step 3: Chạy để xác nhận ĐỎ**

```bash
npx vitest run src/board/__tests__/dang-ky-custom-element.spec.ts
```

- [ ] **Step 4: Bật bốn extension** — chèn theo đúng thứ tự thượng nguồn (Task 10 Step 5).

- [ ] **Step 5: Chạy trọn bộ**

```bash
npm test
```

Xanh, kể cả `thu-tu-view-extension.spec.ts`.

- [ ] **Step 6: Đo dung lượng**

```bash
npm run build
```

Ghi số vào `extensions.ts`. **Vượt 1.400 kB ⇒ DỪNG.**

- [ ] **Step 7: Kiểm mắt sáng + tối** — gõ `/` chèn được **Bảng** và **khối nhấn mạnh**; mục lục
  hiện đúng đề mục; console sạch.

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/board/extensions.ts src/board/__tests__/dang-ky-custom-element.spec.ts
git commit -m "feat(board): extension nhom 2 - bang, khoi nhan manh, muc luc, data view

Muc luc thay co che blocksToToc() cua he bai viet cu.
Chunk soan thao: <so do that> kB gzip.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 12: Extension nhóm 3 — liên kết và nhúng

**Extension bật:** `LinkedDocViewExtension` · `BookmarkViewExtension` · `EmbedViewExtension` ·
`EmbedDocViewExtension` · `LinkViewExtension` (GfxLink)

**Files:** `src/board/extensions.ts` · `src/board/__tests__/dang-ky-custom-element.spec.ts`

> **Rủi ro riêng của nhóm này:** `EmbedDocViewExtension` kéo theo `render-linked-doc.ts`, module
> **tự tạo `affine:note`** trong doc được tham chiếu
> (`affine/blocks/embed/src/common/render-linked-doc.ts:197`). Kiểm mắt ở Step 7 phải xác nhận việc
> nhúng một bài vào bài khác không sinh note thừa trong doc gốc.

- [ ] **Step 1: Tra tên thẻ thật**

```bash
grep -rn "customElement('affine-" src/vendor/blocksuite/affine/widgets/linked-doc/src/ \
  src/vendor/blocksuite/affine/blocks/bookmark/src/ \
  src/vendor/blocksuite/affine/blocks/embed/src/ \
  src/vendor/blocksuite/affine/blocks/embed-doc/src/ \
  src/vendor/blocksuite/affine/gfx/link/src/
```

- [ ] **Step 2: Viết ca kiểm thất bại**

Thêm vào `src/board/__tests__/dang-ky-custom-element.spec.ts`:

```ts
it('nhóm 3: đăng ký đủ thẻ Lit', () => {
  layExtensionsTrang()

  // Thay bằng tên thật tra được ở Step 1, đổi tiền tố affine- → drt-.
  expect(customElements.get('drt-linked-doc-widget'), 'LinkedDoc').toBeDefined()
  expect(customElements.get('drt-bookmark'), 'Bookmark').toBeDefined()
  expect(customElements.get('drt-embed-figma-block'), 'Embed').toBeDefined()
  expect(customElements.get('drt-embed-linked-doc-block'), 'EmbedDoc').toBeDefined()
})
```

- [ ] **Step 3: Chạy để xác nhận ĐỎ**

```bash
npx vitest run src/board/__tests__/dang-ky-custom-element.spec.ts
```

- [ ] **Step 4: Bật năm extension** — đúng thứ tự thượng nguồn.

- [ ] **Step 5: Chạy trọn bộ**

```bash
npm test
```

- [ ] **Step 6: Đo dung lượng**

```bash
npm run build
```

Ghi số. **Vượt 1.400 kB ⇒ DỪNG.**

- [ ] **Step 7: Kiểm mắt sáng + tối** — gõ `@` mở được bảng chọn tài liệu; nhúng một bài vào bài
  khác **không sinh note thừa** trong doc gốc (xem cảnh báo trên); console sạch.

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/board/extensions.ts src/board/__tests__/dang-ky-custom-element.spec.ts
git commit -m "feat(board): extension nhom 3 - lien ket @ va nhung

LinkedDoc, Bookmark, Embed, EmbedDoc, GfxLink. Thay co che LinkTarget cua
he bai viet cu.

Chunk soan thao: <so do that> kB gzip.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 13: Extension nhóm 4 — thêm cho edgeless

**Extension bật:** `NoteSlicerViewExtension` · `EdgelessAutoConnectViewExtension` ·
`FramePanelViewExtension`

Nhóm này **không ảnh hưởng page mode**. Bật cuối cùng vì đây là nhóm dễ bỏ nhất nếu đụng ngưỡng
dung lượng.

**Files:** `src/board/extensions.ts` · `src/board/__tests__/dang-ky-custom-element.spec.ts`

- [ ] **Step 1: Tra tên thẻ thật**

```bash
grep -rn "customElement('affine-" src/vendor/blocksuite/affine/widgets/note-slicer/src/ \
  src/vendor/blocksuite/affine/widgets/edgeless-auto-connect/src/ \
  src/vendor/blocksuite/affine/fragments/frame-panel/src/
```

- [ ] **Step 2: Viết ca kiểm thất bại**

Thêm vào `src/board/__tests__/dang-ky-custom-element.spec.ts`. Lưu ý gọi `layExtensionsEdgeless()`
chứ **không** phải `layExtensionsTrang()` — ba extension này thuộc phạm vi edgeless:

```ts
it('nhóm 4: đăng ký đủ thẻ Lit (edgeless)', () => {
  layExtensionsEdgeless()

  // Thay bằng tên thật tra được ở Step 1, đổi tiền tố affine- → drt-.
  expect(customElements.get('drt-note-slicer'), 'NoteSlicer').toBeDefined()
  expect(customElements.get('drt-edgeless-auto-connect-widget'), 'EdgelessAutoConnect').toBeDefined()
  expect(customElements.get('drt-frame-panel'), 'FramePanel').toBeDefined()
})
```

- [ ] **Step 3: Chạy để xác nhận ĐỎ**

```bash
npx vitest run src/board/__tests__/dang-ky-custom-element.spec.ts
```

- [ ] **Step 4: Bật ba extension** — đúng thứ tự thượng nguồn.

- [ ] **Step 5: Chạy trọn bộ**

```bash
npm test
```

- [ ] **Step 6: Đo dung lượng lần cuối**

```bash
npm run build
npm run kiem:dist
```

Ghi số cuối. **Vượt 1.400 kB ⇒ DỪNG.**

- [ ] **Step 7: Kiểm mắt sáng + tối** — mở một sơ đồ: cắt note hoạt động, tự nối phần tử hoạt động,
  **thanh công cụ edgeless không bị widget mới vẽ đè** (thứ tự ảnh hưởng z-index); console sạch.

- [ ] **Step 8: Cập nhật chú thích tổng kết trong `extensions.ts`**

Viết lại đoạn đầu file cho đúng trạng thái mới: bao nhiêu / 58; ba cái còn cắt và vì sao — Latex
hoãn (trỏ tới spec §6.1), RemoteSelection (offline một người), AdapterPanel (panel debug) — kèm bảng
số đo gzip qua bốn nhóm.

- [ ] **Step 9: Commit**

```bash
git status --short
git add src/board/extensions.ts src/board/__tests__/dang-ky-custom-element.spec.ts
git commit -m "feat(board): extension nhom 4 + tong ket chu thich

NoteSlicer, EdgelessAutoConnect, FramePanel. Khong anh huong page mode.

Cap nhat chu thich dau extensions.ts: 55/58, ba cai con cat (Latex hoan
sang chang rieng, RemoteSelection va AdapterPanel bo han) kem bang so do
gzip qua bon nhom.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Tiêu chí xong Plan 1

1. `npm test` xanh trọn bộ, không ca nào chập chờn.
2. `npm run build` xanh, `npm run kiem:dist` xanh.
3. Chunk soạn thảo **≤ 1.400 kB gzip**, số đo thật ghi trong `extensions.ts`.
4. Mở một bài viết trên trình duyệt thật: gõ được chữ tiếng Việt có dấu, gõ `/` ra SlashMenu, gõ `@`
   ra bảng chọn tài liệu, chèn được bảng, tiêu đề gõ được.
5. **Dưới 768 px vẫn gõ được, thanh công cụ bàn phím ảo hiện ra.**
6. Sơ đồ (edgeless) **hành vi không đổi**, kể cả luật chỉ-đọc khung hẹp.
7. CSS không rò ở cả bản sáng và bản tối.
8. `grep -rn "che-do-edgeless\|boardMeta\|BangMeta\|DanhSachBang" src/` — không kết quả.
9. Không có `deleteObjectStore`, `deleteDatabase`; không file nào của hệ bài viết cũ bị xoá.

---

## Plan 2 — viết sau khi Plan 1 lên xanh

**Vì sao chưa viết bây giờ.** Spec §0 luật 1: Task 1 là cổng chặn có thể lật đổ cả spec. Viết task
chi tiết cho giai đoạn 5–9 dựa trên một giả định chưa chạy thật lần nào chính là thứ luật đó cấm.
Thêm nữa, ba thứ Plan 2 cần biết chỉ lộ ra **sau khi** Plan 1 chạy:

- Hình dạng props cuối cùng của `TrangBaiViet` (Task 8 để lại ba chỗ phải đối chiếu với
  `EdgelessBoard.tsx`).
- `DocTitle` mount ra sao trong thực tế (spec §6.3 — có thể phải tự đặt thẻ; Task 10 Step 8 trả lời).
- Số đo dung lượng thật, quyết định có phải bỏ bớt nhóm 4 hay không.

### BA CÂU HỎI TRÊN — ĐÃ CÓ CÂU TRẢ LỜI (2026-09-05, Plan 1 đã hợp nhất vào `main`)

Ghi ở đây để lượt viết Plan 2 khỏi phải đo lại.

1. **Props `TrangBaiViet`:** `{ docId: string; khoa?: string; onReady?: () => void }`. Nó KHÔNG nhận
   `boardId` — vỏ `index.tsx` chuyển đổi. Cờ `khongLuuDuoc` là state nội bộ lấy từ giá trị thứ ba mà
   `taoHoacMoDoc()` trả về, không phải prop. Băng cảnh báo đã có ca kiểm riêng
   (`trang-bai-viet-khong-luu-duoc.spec.ts`).
2. **`DocTitle`:** spec §6.3 đoán đúng — nó là FRAGMENT, không tự mount. `TrangBaiViet.tsx:153` phải
   tự đặt `<doc-title .doc=${store}>` NGAY TRƯỚC `std.render()` trong CÙNG một lời gọi `litRender`,
   và bọc trong phần tử mang lớp `.drt-page-viewport` để `closest()` của nó tìm được.
3. **Dung lượng:** KHÔNG phải bỏ nhóm nào. Chunk soạn thảo **1.159,48 kB gzip** trên trần 1.400 —
   còn ~240 kB dư địa. Bốn nhóm đủ chỗ, `viewExtensions` = 55/58.

### BỐN THỨ MỚI, PHÁT SINH SAU PLAN 1 — PLAN 2 PHẢI TÍNH TỚI

- **`QuickSearchProvider` đã cấp** (`src/board/tim-nhanh-lien-ket.ts`, chỉ bộ edgeless). Nút "Liên
  kết" chạy được. Nếu Plan 2 mở khối nhúng cho bài viết thì phải quyết có nối provider này sang bộ
  trang không.
- **"Không bên thứ ba" đã cưỡng chế bằng CSP** (`index.html`): `connect-src 'self'`,
  `img-src 'self' data: blob:`, `frame-src 'none'`. Mọi tính năng Plan 2 chạm mạng sẽ bị chặn ở tầng
  trình duyệt — thiết kế phải giả định NGOẠI TUYẾN hoàn toàn. Xem `src/board/khong-ben-thu-ba.ts`.
- **Hai khoản Minor nên trả trong giai đoạn 6**, vì chúng chỉ lộ ra khi có luồng bài viết thật:
  nhãn `sr-only` của Suspense (đã sửa theo `loai`, kiểm lại khi có màn mới) và khoảng hở coverage
  của băng `khongLuuDuoc` (đã thêm ca kiểm, mở rộng khi UI thật xuất hiện).
- **Bẫy đã trả giá, đừng lặp lại:** factory `vi.mock` KHÔNG được `tsc` kiểm kiểu — sau mỗi lượt đổi
  tên export phải `grep -rn "<TênCũ>:" src/` rồi chạy trọn bộ test, `tsc` xanh không đủ. Giai đoạn 8
  ("gỡ hệ cũ") sẽ đổi tên hàng loạt nên đây là rủi ro thật.

### TRẠNG THÁI HIỆN TẠI — VÌ SAO CHỦ DỰ ÁN CHƯA THẤY TÍNH NĂNG

`src/board/BoardGallery.tsx:369` vẫn viết cứng `loai="so-do"`, và chuỗi `'bai-viet'` không xuất hiện
lần nào trong `BoardGallery.tsx` / `LuoiMuc.tsx` / `App.tsx`. Toàn bộ động cơ chạy được và có test,
nhưng **chưa có đường nào cho người dùng bấm tới**. Đó đúng là ranh giới Plan 1 / Plan 2 mà spec §4
vạch ra: giai đoạn 6 mới là lúc tính năng hiện ra.

**Plan 2 sẽ gồm** (giai đoạn 5–9 của spec §4):

| Task | Việc | Hoàn tác được? |
|---|---|---|
| 1 | `MucMeta` thêm `loai` + `danhMuc` + hằng `DANH_MUC`; bỏ nhánh `??` phòng vệ; dời `LoaiMuc` từ `mo-doc.ts` sang | ✓ |
| 2 | `createObjectStore('mucs')`, DB v6 — **không xoá store nào** | ✓ |
| 3 | `LuoiMuc` nhận 5 props lọc + ca ghim tab Mindmap không đổi hành vi | ✓ |
| 4 | Sáu màn: Thư viện, Mindmap, 3 danh mục, Hướng dẫn | ✓ |
| 5 | Luồng "Tạo bài mới" + bảng chọn danh mục | ✓ |
| 6 | Màn chuyên khoa thành `LuoiMuc` lọc theo khoa | ✓ |
| 7 | `SearchScreen`: `kind` rút còn `'muc' \| 'flashcard'` | ✓ |
| 8 | `recentReads` gom về `'muc'`, lọc bỏ bản ghi cũ | ✓ |
| 9 | Đồng bộ: `Transformer` xuất/nhập, toàn-bộ-hoặc-không, hoàn tác phủ doc CRDT | ✓ |
| 10 | Gỡ hệ cũ: 7 màn, 8 file, 6 kiểu + checklist 9 chuỗi spec §6.4 | ✓ |
| 11 | **PHÁ HUỶ**: `deleteObjectStore` ×3 (DB v7) + `deleteDatabase('drtrong-board')` + cổng `kiem-dist` hai chiều | **KHÔNG** |

**Việc của chủ dự án trước Plan 2 Task 11:** xuất một file sao lưu bằng màn Đồng bộ dữ liệu **hiện
có**. Bảo hiểm rẻ nhất cho quyết định "bỏ toàn bộ dữ liệu cũ".
