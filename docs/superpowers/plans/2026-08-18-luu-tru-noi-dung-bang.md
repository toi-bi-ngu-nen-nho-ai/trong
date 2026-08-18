# Lưu trữ bền vững cho nội dung bảng (D4 — phần nội dung) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Làm cho đúng một bảng (mindmap board) hiện có sống sót qua tải lại trang, bằng cách nối
`IndexedDBDocSource`/`IndexedDBBlobSource` (đã có sẵn trong cây vendor) vào workspace của board.

**Architecture:** `taoBangTrong()` (đồng bộ, luôn tạo workspace trắng trong bộ nhớ) đổi thành
`taoHoacMoBang()` (bất đồng bộ): dựng `TestWorkspace` với nguồn IndexedDB thật, đợi đồng bộ xong
CÓ HẠN GIỜ (rơi về bộ nhớ nếu hết giờ — không `await` trần, xem lý do ở spec), rồi rẽ nhánh
"đã có/chưa có" doc `'board'` trước khi seed nội dung trống. `EdgelessBoard()` (component React) đợi
promise đó xong mới `litRender` nội dung thật, hiện "Đang mở bảng…" trong lúc chờ, dọn bằng
`workspace.forceStop()` lúc unmount (ở cả hai đường: sau khi đã render, và trong lúc còn đang chờ).

**Tech Stack:** React 19, Lit, `@blocksuite/sync` (đã vendored — `IndexedDBDocSource`,
`IndexedDBBlobSource`, `DocEngine`), Vitest (`happy-dom` cho ca kiểm mount, `node` cho ca kiểm hàm
thuần).

## Global Constraints

- **Phạm vi CHỈ nội dung một bảng hiện có** (id cứng `'bs-trong-board'`/`'board'`, giữ nguyên).
  KHÔNG đụng: danh sách bảng/metadata, `DB_VERSION` của `src/lib/idb.ts` (giữ nguyên 4), màn
  BoardGallery, hack "mount vĩnh viễn" ở `App.tsx`.
- **`createDoc('board')` ném lỗi nếu doc đã tồn tại** — PHẢI gọi `getDoc('board')` trước, chỉ
  `createDoc` khi chưa có. Không rẽ nhánh này là board vỡ ngay từ lần mở app thứ hai.
- **KHÔNG `await` trần trên `waitForSynced()`** — `DocEngine` tự thử lại mỗi 5 giây vô thời hạn khi
  lỗi, `await` trần sẽ treo mãi mãi nếu IndexedDB hỏng vĩnh viễn. Phải đua với hạn giờ
  (`HAN_GIO_MAC_DINH_MS = 4000`), rơi về workspace trong bộ nhớ (không truyền `docSources`/
  `blobSources`, mặc định `NoopDocSource`/`MemoryBlobSource`) nếu hết giờ.
- **Tên CSDL `'drtrong-board'`** — hằng số riêng, không dùng mặc định `'blocksuite-local'`, tách hẳn
  khỏi `'drtrong-ecg'` của `src/lib/idb.ts`.
- **`taoHoacMoBang(tuyChon?)`** — tham số `tuyChon` (`docSources`/`blobSources`/`hanGioMs`) CHỈ để ca
  kiểm tiêm giá trị giả. `EdgelessBoard()` component luôn gọi không đối số.
- **Tên định danh tiếng Việt** đúng quy ước phần còn lại của `src/board/` (`taoHoacMoBang`,
  `laLanDau`, `dangMo`, `huyBo`...), trừ định danh vay mượn từ API vendored (`TestWorkspace`,
  `DocSource`, `BlobSource`, `getDoc`, `createDoc`...).
- **Bảy cổng phải xanh ở cuối:** `tsc --noEmit` · `npm test` · `kiem:vendor` · `kiem:vendor-paths` ·
  `kiem:vendor-build` · `build` · `kiem:dist`.
- Spec có thẩm quyền: `docs/superpowers/specs/2026-08-18-luu-tru-noi-dung-bang-design.md`. Đọc cả
  khối "ĐÍNH CHÍNH" trong §4.1 trước khi bắt đầu — đó là lý do hạn giờ tồn tại. Lệch giữa plan và
  spec thì spec thắng.

---

## Task 1: `taoHoacMoBang()` + nối vào component `EdgelessBoard()`

**Files:**
- Modify: `src/board/EdgelessBoard.tsx`
- Modify: `src/board/__tests__/edgeless-board.spec.ts`
- Modify: `src/board/__tests__/edgeless-board-mount.spec.ts` (chỉ sửa ca kiểm HIỆN CÓ cho khớp hành
  vi bất đồng bộ mới — CHƯA thêm ca mới, việc đó ở Task 2)
- Possibly modify: `package.json`, `package-lock.json` (chỉ nếu Bước 1 đo ra `happy-dom` thiếu
  IndexedDB thật)

**Interfaces:**
- Produces: `taoHoacMoBang(tuyChon?: { docSources?: { main: DocSource }; blobSources?: { main:
  BlobSource }; hanGioMs?: number }): Promise<{ workspace: TestWorkspace; store: ReturnType<Doc
  ['getStore']> }>` — thay thế hoàn toàn `taoBangTrong()` (xoá hẳn, không giữ song song).
- Consumes (Task 2): `EdgelessBoard()` component đã đợi đúng promise trên trước khi `litRender`,
  dùng làm nền cho ca kiểm mount mới.

- [ ] **Step 1: Đo IndexedDB thật có sẵn trong môi trường test `happy-dom` không**

Chạy:
```bash
npx vitest run --environment happy-dom -t "___do-khong-ton-tai___" 2>&1 | head -5
```
(Lệnh trên chỉ để chắc `happy-dom` load được — không cần ca nào khớp tên đó.) Sau đó viết một file
thăm dò TẠM (không commit) `src/board/__tests__/__tham-do-idb.spec.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

describe('thăm dò môi trường test', () => {
  it('IndexedDB và BroadcastChannel có sẵn', () => {
    expect(typeof indexedDB).not.toBe('undefined')
    expect(typeof BroadcastChannel).not.toBe('undefined')
  })
})
```

Chạy: `npx vitest run src/board/__tests__/__tham-do-idb.spec.ts`

- **Nếu cả hai đều có (PASS):** xoá file thăm dò, sang Step 2, không cần thêm gì.
- **Nếu THIẾU `indexedDB` hoặc `BroadcastChannel` (FAIL):** thêm `fake-indexeddb` làm devDependency
  (`npm install --save-dev fake-indexeddb`). Với `indexedDB` thiếu: thêm
  `import 'fake-indexeddb/auto'` vào đầu `src/board/__tests__/edgeless-board-mount.spec.ts` (polyfill
  toàn cục `indexedDB`/`IDBKeyRange` cho riêng file đó, đúng khuôn `@vitest-environment` đã dùng ở
  đầu file — không đụng 15+ file spec khác). Với `BroadcastChannel` thiếu: viết một stub tối giản
  ngay trong cùng file test, TRƯỚC dòng import `EdgelessBoard`:
  ```ts
  if (typeof BroadcastChannel === 'undefined') {
    ;(globalThis as unknown as { BroadcastChannel: unknown }).BroadcastChannel = class {
      addEventListener() {}
      removeEventListener() {}
      postMessage() {}
      close() {}
    }
  }
  ```
  Chạy lại file thăm dò để xác nhận cả hai đều có sau khi vá, rồi xoá file thăm dò.

Chép nguyên văn kết quả đo (có/thiếu cái gì) vào báo cáo task — đây là bằng chứng, không phải suy
đoán.

- [ ] **Step 2: Viết ca kiểm hàm thuần (4 ca) — CHƯA có mã cài đặt `taoHoacMoBang`**

Thay TOÀN BỘ nội dung `src/board/__tests__/edgeless-board.spec.ts`:

```ts
// Kiểm đúng thứ dự án sở hữu (D9): việc dựng/mở bảng và hình dạng dữ liệu ban đầu.
// KHÔNG kiểm mã của AFFiNE — họ có bộ test riêng.
//
// File này CỐ Ý không render component: environment mặc định là 'node' (xem vite.config.ts) nên
// chạm DOM sẽ đâm `DOMRect is not defined`. Phần render — cầu nối React↔Lit — nằm ở
// `edgeless-board-mount.spec.ts`, file đó tự đổi environment sang happy-dom.
//
// docSources/blobSources GIẢ ở dưới đây thay cho IndexedDB thật — không cần DOM, không cần
// happy-dom, mô phỏng đúng "đóng rồi mở lại app" bằng cách TÁI SỬ DỤNG cùng một kho biến JS giữa
// hai lượt gọi taoHoacMoBang() trong cùng một ca kiểm.
import { describe, expect, it } from 'vitest'
import { mergeUpdates } from 'yjs'

import type { BlobSource, DocSource } from '@blocksuite/sync'

import { taoHoacMoBang } from '../EdgelessBoard'

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

describe('taoHoacMoBang — đường cơ bản', () => {
  it('lần đầu trên cặp source rỗng → đúng 1 page, 1 surface, surface rỗng', async () => {
    const { store } = await taoHoacMoBang({
      docSources: { main: dungDocSourceGia() },
      blobSources: { main: dungBlobSourceGia() },
    })
    expect(store.root).not.toBeNull()
    const surfaces = store.root!.children.filter((c) => c.flavour === 'affine:surface')
    expect(surfaces).toHaveLength(1)
    const surface = surfaces[0] as unknown as { elementModels: unknown[] }
    expect(surface.elementModels).toHaveLength(0)
  })

  it('gọi hai lần liên tiếp trên CÙNG cặp source → lần hai không tạo lại doc, không nhân đôi page', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const lanMot = await taoHoacMoBang({ docSources, blobSources })
    lanMot.workspace.forceStop()

    const lanHai = await taoHoacMoBang({ docSources, blobSources })
    const pages = lanHai.store.root!.children.filter((c) => c.flavour === 'affine:page')
    expect(pages).toHaveLength(1)
    lanHai.workspace.forceStop()
  })

  it('workspace.forceStop() gọi được ngay sau taoHoacMoBang() mà không ném lỗi', async () => {
    const { workspace } = await taoHoacMoBang({
      docSources: { main: dungDocSourceGia() },
      blobSources: { main: dungBlobSourceGia() },
    })
    expect(() => workspace.forceStop()).not.toThrow()
  })
})

describe('taoHoacMoBang — hạn giờ khi IndexedDB không đồng bộ được', () => {
  it('pull/push không bao giờ resolve + hanGioMs nhỏ → vẫn trả về (không treo), rơi về bộ nhớ', async () => {
    const docSourceTreo: DocSource = {
      name: 'treo-mai',
      pull: () => new Promise(() => {}), // không bao giờ resolve — mô phỏng IndexedDB hỏng vĩnh viễn
      push: () => new Promise(() => {}),
      subscribe: () => () => {},
    }
    const blobSourceTreo: BlobSource = {
      name: 'treo-mai',
      readonly: false,
      get: () => new Promise(() => {}),
      set: () => new Promise(() => {}),
      delete: () => new Promise(() => {}),
      list: () => new Promise(() => {}),
    }

    const { store, workspace } = await taoHoacMoBang({
      docSources: { main: docSourceTreo },
      blobSources: { main: blobSourceTreo },
      hanGioMs: 20,
    })

    expect(store.root).not.toBeNull()
    const surfaces = store.root!.children.filter((c) => c.flavour === 'affine:surface')
    expect(surfaces).toHaveLength(1)
    workspace.forceStop()
  }, 10_000)
})
```

- [ ] **Step 3: Chạy ca kiểm, xác nhận TẤT CẢ đỏ vì `taoHoacMoBang` chưa tồn tại**

Run: `npx vitest run src/board/__tests__/edgeless-board.spec.ts`
Expected: FAIL — lỗi import (`taoHoacMoBang` không được export từ `../EdgelessBoard`, file đó vẫn
export `taoBangTrong`). Chép nguyên văn output vào báo cáo.

- [ ] **Step 4: Viết lại `src/board/EdgelessBoard.tsx`**

Thay TOÀN BỘ nội dung file bằng:

```tsx
// Toàn bộ phép nhúng nằm ở đây. React giữ một thẻ div; BlockStdScope dựng cây Lit rồi Lit tự
// render vào thẻ đó. React không biết gì về bên trong, Lit không biết gì về React — đó chính là
// điều làm phép nhúng khả thi, và cũng là lý do file này phải nhỏ.
// Ở đây từng có `import '@blocksuite/affine/effects'`, kèm niềm tin rằng nó là nơi gọi
// `customElements.define(...)` cho toàn bộ thẻ Lit. Ở bản vendored (BlockSuite 0.27) niềm tin đó
// SAI: `affine/all/src/effects.ts` chỉ gồm các `import { type effects ... }` — nhập KIỂU — nên bản
// biên dịch của nó là đúng một dòng `export {};` (kiểm bằng `cat .vendor-build/affine/all/src/effects.js`).
// Import một module rỗng không đăng ký gì; đã kiểm chứng bằng một ca chỉ import nó rồi hỏi
// `customElements.get('drt-edgeless-root')` → undefined.
// Nơi thật sự đăng ký là chuỗi `ViewExtensionProvider.setup() → effect() → effects()` của TỪNG gói
// view extension, tức là qua `viewExtensions` ngay bên dưới. Vì thế bỏ hẳn dòng import đó thay vì
// giữ một dòng vô tác dụng kèm chú thích sai. Đường đăng ký thật được canh bằng
// `__tests__/dang-ky-custom-element.spec.ts`.
import { StoreExtensionManager, ViewExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { BlockStdScope } from '@blocksuite/affine/std'
import type { Doc } from '@blocksuite/affine/store'
import { createAutoIncrementIdGenerator, TestWorkspace } from '@blocksuite/affine/store/test'
import type { BlobSource, DocSource } from '@blocksuite/sync'
import { IndexedDBBlobSource, IndexedDBDocSource } from '@blocksuite/sync'
import { render as litRender } from 'lit'
import { useEffect, useRef, useState } from 'react'

import { resolveTheme, watchResolvedTheme } from '../lib/theme'

// ĐỊNH NGHĨA của toàn bộ token thiết kế mà cây Lit bên dưới tiêu thụ. Cây vendored dùng 81 biến
// `--drt-*` (thanh công cụ, khung chọn, khung kéo, mọi widget) nhưng KHÔNG khai một biến nào —
// định nghĩa nằm trong gói npm `@toeverything/theme`, và trước lượt sửa này không có gì trong src/
// import nó. Hậu quả: mọi custom property không phân giải được, bảng vẽ dựng ra không màu, không
// viền, không bóng — mà không có một lỗi nào bị ném, nên không lượt kiểm nào bắt được.
// File dưới đây là bản `style.css` của gói đó ĐÃ QUA bước đổi tên `--affine-` → `--drt-`
// (scripts/doi-ten-vendor.mjs phát hành ra `.vendor-build/theme/`, cùng chỗ và cùng luật với phần
// còn lại của D16), nên tên hai bên khớp nhau và devtools không lộ tiền tố thượng nguồn.
//
// Import ở ĐÂY, trong EdgelessBoard.tsx, chứ không ở src/index.css hay src/main.tsx: file này chỉ
// được nạp qua `React.lazy` (xem ./index.tsx), nên 102 kB stylesheet đi vào CHUNK BẢNG VẼ. Đặt ở
// vỏ app là bắt mọi người dùng tải bảng màu của một màn hình họ có thể không bao giờ mở.
import '../../.vendor-build/theme/style.css'

import { viewExtensions } from './extensions'

const viewManager = new ViewExtensionManager(viewExtensions)
const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

// Tên CSDL IndexedDB riêng cho NỘI DUNG bảng (CRDT nhị phân + blob ảnh) — tách hẳn khỏi
// "drtrong-ecg" của src/lib/idb.ts (bản ghi JSON cho danh sách bảng/ECG/bài viết, hai bản chất dữ
// liệu khác nhau, xem docs/superpowers/specs/2026-08-18-luu-tru-noi-dung-bang-design.md §4.1).
// KHÔNG dùng tên mặc định 'blocksuite-local' của IndexedDBDocSource/IndexedDBBlobSource — tên đó
// mơ hồ, không nói lên đây là CSDL của dự án nào.
const TEN_CSDL_BANG = 'drtrong-board'

// waitForSynced() KHÔNG tự bỏ cuộc khi IndexedDB hỏng vĩnh viễn — DocEngine thử lại mỗi 5 giây vô
// thời hạn (framework/sync/src/doc/peer.ts, syncRetryLoop). await trần trên waitForSynced() sẽ treo
// màn "Đang mở bảng…" MÃI MÃI nếu IndexedDB hỏng (chế độ ẩn danh chặn, hết quota...) — một hồi quy
// nặng hơn hành vi trước khi có lưu trữ (board luôn hiện ra, chỉ là không lưu). 4 giây là hào phóng
// cho IndexedDB cục bộ (bình thường xong trong vài chục ms).
const HAN_GIO_MAC_DINH_MS = 4000

function cho(ms: number) {
  return new Promise<'het-gio'>((resolve) => setTimeout(() => resolve('het-gio'), ms))
}

/**
 * Dựng hoặc mở lại bảng đã lưu. Bền vững qua IndexedDB (mặc định) — nếu không đồng bộ xong trong
 * `hanGioMs`, rơi về workspace chỉ trong bộ nhớ thay vì treo vô thời hạn (xem HAN_GIO_MAC_DINH_MS).
 *
 * `tuyChon` CHỈ dùng để ca kiểm tiêm docSources/blobSources/hanGioMs giả — gọi không đối số trong
 * app thật.
 *
 * QUAN TRỌNG: `createDoc('board')` ném lỗi nếu doc đã tồn tại. Với người dùng cũ, sau khi đồng bộ
 * xong thì `getDoc('board')` đã trả về non-null — PHẢI kiểm trước khi gọi `createDoc`, nếu không
 * mọi lần mở app sau lần đầu đều vỡ ngay lúc mount.
 */
export async function taoHoacMoBang(tuyChon?: {
  docSources?: { main: DocSource }
  blobSources?: { main: BlobSource }
  hanGioMs?: number
}) {
  const docSources = tuyChon?.docSources ?? { main: new IndexedDBDocSource(TEN_CSDL_BANG) }
  const blobSources = tuyChon?.blobSources ?? { main: new IndexedDBBlobSource(TEN_CSDL_BANG) }
  const hanGioMs = tuyChon?.hanGioMs ?? HAN_GIO_MAC_DINH_MS

  let workspace = new TestWorkspace({
    id: 'bs-trong-board',
    idGenerator: createAutoIncrementIdGenerator(),
    docSources,
    blobSources,
  })
  workspace.meta.initialize()
  workspace.start()

  const ketQua = await Promise.race([
    workspace.waitForSynced().then(() => 'xong' as const),
    cho(hanGioMs),
  ])

  if (ketQua === 'het-gio') {
    console.warn(
      `taoHoacMoBang: không đồng bộ được với IndexedDB trong ${hanGioMs}ms — dùng bảng chỉ trong ` +
        'bộ nhớ, nội dung sẽ không được lưu.',
    )
    workspace.forceStop()
    workspace = new TestWorkspace({
      id: 'bs-trong-board',
      idGenerator: createAutoIncrementIdGenerator(),
    })
    workspace.meta.initialize()
    workspace.start()
  }

  let doc = workspace.getDoc('board')
  let laLanDau = false
  if (!doc) {
    doc = workspace.createDoc('board')
    laLanDau = true
  }
  const store = doc.getStore({ extensions: storeManager.get('store') })
  doc.load()

  if (laLanDau) {
    const rootId = store.addBlock('affine:page', {})
    store.addBlock('affine:surface', {}, rootId)
  }

  return { workspace, store }
}

export function EdgelessBoard() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [dangMo, setDangMo] = useState(true)

  // ─── Chủ đề sáng/tối của riêng bảng vẽ ───────────────────────────────────────────────────────
  // Bảng màu vendored (.vendor-build/theme/style.css) khoá TOÀN BỘ bản tối vào đúng một bộ chọn
  // `[data-theme=dark]` và không có nhánh `prefers-color-scheme` nào dự phòng. Mà chế độ mặc định
  // của app là "auto", nơi lib/theme.ts CỐ Ý gỡ hẳn thuộc tính data-theme khỏi <html> để các biến
  // --c-* của vỏ app chạy bằng @media. Hai điều đó cộng lại: máy để nền tối, cả app tối, riêng
  // bảng vẽ vẫn trắng loá — đúng thứ chói mắt nhất lúc 2 giờ sáng.
  // Vì thế thẻ bọc dưới đây tự mang một data-theme ĐÃ PHÂN GIẢI ("light"/"dark", không bao giờ
  // "auto"). Đây cũng là cách vỏ React của chính AFFiNE làm (`affine-edgeless-viewport`
  // data-theme=...). Không đụng gì tới <html> nên chủ đề của vỏ app giữ nguyên cách chạy cũ.
  const [chuDe, setChuDe] = useState(() => resolveTheme())
  // Đổi sống theo cả hai hướng: người dùng bấm nút chủ đề, và hệ điều hành lật sáng/tối khi app
  // đang ở "auto". Cả hai đều đi qua applyTheme() nên chỉ cần nghe đúng một chỗ (xem lib/theme.ts).
  useEffect(() => watchResolvedTheme(setChuDe), [])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    let huyBo = false
    let workspaceHienTai: TestWorkspace | null = null

    taoHoacMoBang().then(({ workspace, store }) => {
      if (huyBo) {
        // Component đã unmount trong lúc đang đợi đồng bộ — đóng ngay, không render, không giữ
        // engine chạy nền cho một cây Lit sẽ không bao giờ được gắn.
        workspace.forceStop()
        return
      }
      workspaceHienTai = workspace
      const std = new BlockStdScope({ store, extensions: viewManager.get('edgeless') })
      litRender(std.render(), el)
      setDangMo(false)
    })

    // Dọn khi React tháo component. Thiếu bước này thì mỗi lần vào ra một bảng là một cây Lit
    // nữa còn sống, giữ nguyên listener và rAF của nó — cộng thêm giờ là một engine đồng bộ
    // IndexedDB còn chạy nền.
    return () => {
      huyBo = true
      litRender(null, el)
      workspaceHienTai?.forceStop()
    }
  }, [])

  // `ViewportElementExtension('.drt-edgeless-viewport')` (đăng ký trong extensions/view.ts của cây
  // vendor) tìm phần tử viewport bằng `std.host.closest(...)` — đi NGƯỢC LÊN từ editor host, nên
  // chính ứng dụng nhúng phải cấp sẵn tổ tiên mang đúng class này; cây Lit bên trong không tự tạo
  // ra nó. Thiếu tổ tiên này là nguyên nhân lỗi "viewport element is not found".
  // Bọc thêm một div `drt-edgeless-viewport` bên ngoài div gắn Lit — không đụng vào chính hostRef,
  // giữ đúng ranh giới "React chỉ giữ chỗ, Lit tự lo bên trong" của hostRef.
  //
  // `@container/viewport` là utility Tailwind v4 sinh ra ĐỦ CẢ HAI khai báo
  // `container-type: inline-size` và `container-name: viewport`. Luật này trước đây nằm trong
  // src/index.css với chú thích nói Tailwind không có utility cho `container-name` — chú thích đó
  // sai, và cái giá của nó là một luật CHỈ dùng cho bảng vẽ bị nạp kèm CSS của vỏ app, đúng thứ
  // ranh giới mà cả chặng này dựng lên để tránh. Cái TÊN "viewport" là bắt buộc: nhiều nơi trong
  // cây vendor (vd affine/widgets/edgeless-zoom-toolbar) viết thẳng `@container viewport (...)`,
  // truy vấn đó chỉ khớp container mang đúng tên này.
  // Class chữ `drt-edgeless-viewport` PHẢI ở lại — nó là thứ `closest()` bên trên tìm, không phải
  // thứ tạo ra kiểu dáng.
  //
  // "Đang mở bảng…" hiện TRONG lớp bọc này (không phải thay thế nó) — lớp bọc phải render ngay từ
  // đầu để giữ cấu trúc DOM ổn định cho `closest()` ở trên, kể cả trước khi Lit gắn vào. Khớp thị
  // giác với dòng "Đang tải bảng vẽ…" của Suspense fallback ở src/board/index.tsx.
  return (
    <div
      className="drt-edgeless-viewport @container/viewport block h-full relative overflow-clip"
      data-theme={chuDe}
    >
      {dangMo && (
        <div className="h-full flex items-center justify-center text-[13px] text-slate-400">
          Đang mở bảng…
        </div>
      )}
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  )
}
```

- [ ] **Step 5: Chạy lại ca kiểm hàm thuần, xác nhận cả 4 CA XANH**

Run: `npx vitest run src/board/__tests__/edgeless-board.spec.ts`
Expected: `4 passed`. Ca hạn giờ (nhóm thứ hai) có thể mất tới ~20ms cộng chi phí — vẫn phải xong
trong vài giây, không phải hàng chục giây. Nếu ca nào đỏ, đọc lỗi, sửa `EdgelessBoard.tsx` (KHÔNG
sửa ca kiểm để cho qua).

- [ ] **Step 6: Chạy `tsc --noEmit`, xác nhận không lỗi kiểu**

Run: `npx tsc --noEmit`
Expected: exit 0. Các điểm dễ sai kiểu: `Doc | null` từ `getDoc` (đã narrow đúng qua `if (!doc)`),
`ReturnType<Doc['getStore']>` không cần khai tường minh (để TypeScript tự suy ra qua giá trị trả về
của `taoHoacMoBang`, không cần ghi kiểu trả về tường minh trong mã thật — chỉ spec ghi để mô tả).

- [ ] **Step 7: Sửa ca kiểm mount HIỆN CÓ cho khớp hành vi bất đồng bộ mới**

`src/board/__tests__/edgeless-board-mount.spec.ts` hiện có MỘT ca kiểm dựng cây Lit rồi kiểm tra
`drt-edgeless-root`/`editor-host` NGAY sau `act(async () => { root.render(...) })`. Với
`taoHoacMoBang()` giờ là bất đồng bộ (đi qua IndexedDB thật, dù nhanh), phép `act` một lượt có thể
không đủ để flush hết — cần đợi tường minh.

Nếu Step 1 phải thêm `fake-indexeddb`, đầu file test này (SAU dòng `// @vitest-environment
happy-dom`, TRƯỚC mọi import khác) thêm:

```ts
import 'fake-indexeddb/auto'
```

(Bỏ dòng này nếu Step 1 đo ra `happy-dom` đã có `indexedDB` thật — không thêm import vô ích.)

Tìm đoạn:

```ts
  it('dựng cây Lit trong thẻ div của React, có tổ tiên viewport, và dọn sạch khi tháo', async () => {
    await act(async () => {
      root.render(createElement(EdgelessBoard))
    })

    // 1) Cây Lit thật sự được dựng: thẻ gốc edgeless (đã đổi tên affine-→drt- ở bước build vendor)
    //    phải có mặt trong tài liệu. Nếu `viewExtensions` bị rỗng/xáo trộn thì RootViewExtension
    //    không còn, và thẻ này không bao giờ xuất hiện.
    const goc = document.querySelector('drt-edgeless-root')
    expect(goc).not.toBeNull()
```

Thay bằng:

```ts
  it('dựng cây Lit trong thẻ div của React, có tổ tiên viewport, và dọn sạch khi tháo', async () => {
    await act(async () => {
      root.render(createElement(EdgelessBoard))
    })

    // taoHoacMoBang() giờ bất đồng bộ (đợi đồng bộ IndexedDB, dù cục bộ và nhanh) — cây Lit chỉ
    // được gắn SAU khi promise đó xong, không còn ngay trong lượt act() đầu tiên. Đợi tường minh
    // thay vì giả định act() một lượt là đủ.
    await vi.waitFor(() => {
      expect(document.querySelector('drt-edgeless-root')).not.toBeNull()
    })

    // 1) Cây Lit thật sự được dựng: thẻ gốc edgeless (đã đổi tên affine-→drt- ở bước build vendor)
    //    phải có mặt trong tài liệu. Nếu `viewExtensions` bị rỗng/xáo trộn thì RootViewExtension
    //    không còn, và thẻ này không bao giờ xuất hiện.
    const goc = document.querySelector('drt-edgeless-root')
    expect(goc).not.toBeNull()
```

Thêm `vi` vào import từ `vitest` ở đầu file (`import { afterEach, beforeEach, describe, expect, it,
vi } from 'vitest'`).

- [ ] **Step 8: Chạy ca kiểm mount, xác nhận XANH**

Run: `npx vitest run src/board/__tests__/edgeless-board-mount.spec.ts`
Expected: ca kiểm hiện có PASS. Nếu vẫn đỏ vì lỗi liên quan IndexedDB/BroadcastChannel không có
thật trong môi trường, quay lại Step 1 — kết quả đo ở đó có thể chưa đúng hoặc polyfill chưa đủ.

- [ ] **Step 9: Chạy toàn bộ `npm test`, xác nhận không hồi quy nơi khác**

Run: `npm test`
Expected: mọi file xanh, không cảnh báo lạ trong output (test output phải sạch — cảnh báo thừa là
một phát hiện, không phải nhiễu bỏ qua được).

- [ ] **Step 10: Commit**

```bash
git add src/board/EdgelessBoard.tsx src/board/__tests__/edgeless-board.spec.ts src/board/__tests__/edgeless-board-mount.spec.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
taoHoacMoBang: lưu trữ bền vững cho nội dung bảng qua IndexedDB

Thay taoBangTrong() (luôn tạo workspace trắng trong bộ nhớ) bằng
taoHoacMoBang() (bất đồng bộ, nối IndexedDBDocSource/
IndexedDBBlobSource, hạn giờ 4s tránh treo vĩnh viễn nếu IndexedDB
hỏng). Rẽ nhánh đã có/chưa có doc 'board' trước khi seed — createDoc
ném lỗi nếu gọi lại trên doc đã tồn tại. EdgelessBoard() đợi đồng bộ
xong mới render, hiện "Đang mở bảng…" trong lúc chờ.

4 ca kiểm hàm thuần mới (edgeless-board.spec.ts), ca kiểm mount hiện
có cập nhật để đợi đúng lượt render bất đồng bộ.
EOF
)"
```

(Nếu `package.json`/`package-lock.json` không đổi — Step 1 đo ra không cần `fake-indexeddb` — bỏ hai
file đó khỏi lệnh `git add`.)

---

## Task 2: Ba ca kiểm mount mới — trạng thái chờ, vòng lưu-rồi-mở-lại, unmount giữa chừng

**Files:**
- Modify: `src/board/__tests__/edgeless-board-mount.spec.ts`

**Interfaces:**
- Consumes: `taoHoacMoBang`/`EdgelessBoard` từ Task 1 — không đổi production code ở task này, chỉ
  thêm ca kiểm.

- [ ] **Step 1: Viết ca kiểm #1 — trạng thái "Đang mở bảng…" hiện trước, biến mất sau**

Thêm vào cuối khối `describe('EdgelessBoard — cầu nối React↔Lit', ...)` trong
`src/board/__tests__/edgeless-board-mount.spec.ts`:

```ts
  it('hiện "Đang mở bảng…" trước, biến mất sau khi đồng bộ xong và cây Lit đã gắn', async () => {
    await act(async () => {
      root.render(createElement(EdgelessBoard))
    })

    // Ngay sau lượt render đầu — trước khi taoHoacMoBang() kịp resolve — trạng thái chờ phải đã
    // hiện. Đây là khẳng định "hiện TRƯỚC", không chỉ "cuối cùng có hiện qua" — nếu bỏ qua bước
    // này, một cài đặt render đồng thời cả hai trạng thái vẫn qua được ca kiểm dưới.
    expect(container.textContent).toContain('Đang mở bảng…')

    await vi.waitFor(() => {
      expect(document.querySelector('editor-host')).not.toBeNull()
    })

    // Sau khi cây Lit đã gắn, trạng thái chờ phải biến mất — không đè lên nội dung thật.
    expect(container.textContent).not.toContain('Đang mở bảng…')
  })
```

- [ ] **Step 2: Chạy ca kiểm #1, xác nhận ĐỎ trước (bằng chứng), rồi XANH sau khi có đủ mã Task 1**

Run: `npx vitest run src/board/__tests__/edgeless-board-mount.spec.ts -t "Đang mở bảng"`

Vì Task 1 đã xong, ca này nhiều khả năng XANH NGAY — vẫn phải xác nhận thật (không suy đoán). Nếu
đỏ, đọc lỗi: khả năng cao nhất là JSX trong `EdgelessBoard.tsx` chưa hiện đúng "Đang mở bảng…" lúc
`dangMo === true`, hoặc `container.textContent` không đọc được text vì cấu trúc DOM khác dự tính —
so sánh với JSX thật ở `EdgelessBoard.tsx`.

- [ ] **Step 3: Viết ca kiểm #2 — vòng lưu-rồi-mở-lại (bằng chứng end-to-end)**

Thêm:

```ts
  it('nội dung sống sót qua unmount rồi mount lại (cùng tên CSDL)', async () => {
    await act(async () => {
      root.render(createElement(EdgelessBoard))
    })
    await vi.waitFor(() => {
      expect(document.querySelector('editor-host')).not.toBeNull()
    })

    // Đếm số block affine:page hiện có trong DOM trước khi tháo — dùng làm mốc so sánh sau khi
    // mount lại. Không sửa nội dung qua UI thật ở đây (không có input giả lập bàn phím trong ca
    // kiểm này) — chỉ cần xác nhận KHÔNG NHÂN ĐÔI khi mount lại, đúng phạm vi §3 của spec. Việc
    // gõ nội dung thật rồi kiểm tra nó còn nguyên là việc của bước kiểm tay trên trình duyệt thật
    // (spec §9 mục 6) — DOM giả lập ở đây không có input bàn phím đáng tin để mô phỏng việc đó.
    const soTrangTruoc = document.querySelectorAll('affine-page-root, affine-edgeless-root').length

    await act(async () => {
      root.unmount()
    })

    // Mount lại — TestWorkspace mới, nhưng cùng docSources/blobSources thật (IndexedDB thật hoặc
    // polyfill của Step 1 Task 1, cùng tên CSDL 'drtrong-board' vì EdgelessBoard() luôn gọi
    // taoHoacMoBang() không đối số) nên phải đọc lại được đúng doc 'board' đã lưu.
    root = createRoot(container)
    await act(async () => {
      root.render(createElement(EdgelessBoard))
    })
    await vi.waitFor(() => {
      expect(document.querySelector('editor-host')).not.toBeNull()
    })

    const soTrangSau = document.querySelectorAll('affine-page-root, affine-edgeless-root').length
    expect(soTrangSau).toBe(soTrangTruoc)
    // Không ném lỗi "doc already exists" trong lúc mount lại — nếu có, act() ở trên đã ném rồi,
    // ca kiểm này sẽ tự đỏ trước khi chạm tới expect cuối.
  })
```

- [ ] **Step 4: Chạy ca kiểm #2, xác nhận ĐỎ TRƯỚC nếu cố tình gỡ nhánh rẽ ở Task 1**

Đây là bước xác nhận bằng chứng đỏ ĐÃ CÓ SẴN từ Task 1 (không viết lại mã ở đây). Tạm sửa
`EdgelessBoard.tsx`: đổi khối `if (!doc) { ... }` thành gọi `createDoc('board')` KHÔNG ĐIỀU KIỆN
(bỏ hẳn nhánh `getDoc`), chạy lại ca kiểm #2 — Expected: ĐỎ, ném lỗi `"doc already exists"` (hoặc
ca kiểm bắt được assertion sai). Sau đó HOÀN TÁC sửa tạm này (`git checkout --
src/board/EdgelessBoard.tsx` hoặc sửa tay lại đúng như Task 1 để lại), chạy lại ca kiểm #2, xác nhận
XANH. Chép cả hai lượt (đỏ và xanh) vào báo cáo — đây là bằng chứng đỏ ghim đúng lỗi mấu chốt §3 của
spec, không thể bỏ qua.

- [ ] **Step 5: Viết ca kiểm #3 — unmount giữa chừng lúc đang chờ đồng bộ**

Thêm:

```ts
  it('unmount ngay khi đang chờ đồng bộ không ném lỗi "set state sau unmount"', async () => {
    const loiConsole: unknown[] = []
    const consoleErrorGoc = console.error
    console.error = (...doiSo: unknown[]) => {
      loiConsole.push(doiSo)
      consoleErrorGoc(...doiSo)
    }

    try {
      await act(async () => {
        root.render(createElement(EdgelessBoard))
      })
      // KHÔNG đợi taoHoacMoBang() xong — tháo component NGAY trong lúc còn "Đang mở bảng…".
      await act(async () => {
        root.unmount()
      })
      // Cho vòng lặp sự kiện thêm một nhịp để promise taoHoacMoBang() (nếu vẫn đang chạy) có cơ
      // hội resolve VÀ chạm nhánh `huyBo` — đây chính là nhánh ca kiểm này canh.
      await new Promise((resolve) => setTimeout(resolve, 50))
    } finally {
      console.error = consoleErrorGoc
    }

    const coLoiSetStateSauUnmount = loiConsole.some((doiSo) =>
      doiSo.some((phan) => typeof phan === 'string' && phan.includes('unmounted component')),
    )
    expect(coLoiSetStateSauUnmount).toBe(false)
  })
```

- [ ] **Step 6: Chạy cả ba ca kiểm mới + toàn bộ file, xác nhận XANH**

Run: `npx vitest run src/board/__tests__/edgeless-board-mount.spec.ts`
Expected: tất cả PASS (4 ca — 1 ca cũ đã sửa ở Task 1 + 3 ca mới).

- [ ] **Step 7: Chạy `npm test` đầy đủ**

Run: `npm test`
Expected: mọi file xanh, output sạch.

- [ ] **Step 8: Commit**

```bash
git add src/board/__tests__/edgeless-board-mount.spec.ts
git commit -m "$(cat <<'EOF'
Ca kiểm mount cho lưu trữ bảng: trạng thái chờ, vòng lưu-mở-lại, unmount giữa chừng

Ba ca mới đóng nốt §6.2 của spec 2026-08-18-luu-tru-noi-dung-bang-design.md.
Ca vòng lưu-mở-lại đã xác nhận đỏ thật khi cố tình gỡ nhánh rẽ
đã-có/chưa-có (createDoc không điều kiện) rồi hoàn tác — bằng chứng
ghim đúng lỗi mấu chốt của cả chặng, xem báo cáo task.
EOF
)"
```

---

## Task 3: Bảy cổng, cập nhật `HANDOFF.md`, hướng dẫn bàn giao

**Files:**
- Modify: `docs/superpowers/HANDOFF.md`

**Interfaces:** không có — task tổng hợp, đóng chặng.

- [ ] **Step 1: Chạy đủ bảy cổng theo đúng thứ tự HANDOFF quy định**

Run:
```bash
npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build && npm run kiem:dist
```
Expected: exit 0 ở mọi lệnh. Đo số liệu thật (số ca test, số file), đừng chép số cũ.

Chặng này không đụng `vi.json`/cây vendored/`vendor-paths` nên `kiem:vendor`/`kiem:vendor-paths`/
`kiem:dist` gần như chắc chắn không đổi số so với lượt trước — vẫn phải CHẠY THẬT để xác nhận, không
suy luận từ "không đụng gì thì chắc vẫn xanh".

- [ ] **Step 2: Kiểm tay trên trình duyệt thật (nếu có người đang xem trực tiếp)**

Dùng công cụ Browser pane: `preview_start` (`drtrong-dev`), mở tab Mindmap, gõ vài chữ vào bảng,
tải lại trang (`navigate` cùng URL, hoặc F5 thật), xác nhận nội dung còn nguyên. **Nếu chạy trong
phiên không người xem trực tiếp** (như phiên đóng chặng Images/MindMap trước đó từng gặp), công cụ
screenshot/click sẽ báo lỗi `"the Browser pane is not displayed, so the page is not compositing
frames"` — đây là giới hạn môi trường đã biết, không phải lỗi cần sửa. Ghi rõ đã thử và kết quả
(xác nhận được hay không, vì sao) vào báo cáo, đừng bỏ qua im lặng.

- [ ] **Step 3: Thêm một mục mới vào `docs/superpowers/HANDOFF.md`**

Thêm mục tiếp theo mục 16 hiện có (tức **mục 17**), theo đúng khuôn các mục trước — nội dung tối
thiểu:

```markdown
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
BoardGallery dời sang chặng riêng.

### Đã xong

| Task | Nội dung | Commit |
|---|---|---|
| 1 | `taoHoacMoBang()` + nối vào component, 4 ca kiểm hàm thuần | <điền SHA thật> |
| 2 | 3 ca kiểm mount mới (trạng thái chờ, vòng lưu-mở-lại, unmount giữa chừng) | <điền SHA thật> |

`npm test` <điền số thật>/<điền số thật> (<điền số file thật> file), trước chặng 187/187 (20 file —
số này đã gộp cả phần việc song song của DungThuocScreen từ chặng trước).

### Kiểm tay trên trình duyệt thật

<điền kết quả thật của Task 3 Step 2 — xác nhận được hay không, và vì sao>

### Ngoài phạm vi, còn nợ

- Danh sách bảng/metadata, `idb.ts` `DB_VERSION` → 5, màn BoardGallery — chặng riêng.
- Gỡ hack "mount vĩnh viễn" ở `App.tsx` (giữ `<EdgelessBoard />` mount sau lần mở đầu, ẩn bằng CSS
  thay vì unmount) — cố ý chưa gỡ, chờ persistence chạy ổn định thật trước.
- Tên CSDL `'drtrong-board'` cố định, chưa theo id bảng — nợ kỹ thuật thật cho chặng multi-board,
  xem spec §7.

### Việc làm ngay của phiên sau

\`\`\`bash
git log --oneline -1                    # kỳ vọng SHA của chính commit HANDOFF này hoặc mới hơn
git status --short                      # kỳ vọng chỉ hai file sinh ra ở mục 6
npm ci && npm run dung:vendor           # .vendor-build/ bị gitignore, phải dựng lại
\`\`\`

**Chặng kế tiếp:** BoardGallery (màn danh sách bảng, cần bảng metadata trước — xem "Ngoài phạm vi"
ở trên); hoặc đợt dịch thứ hai cho nhóm gói chưa bật (`affine/data-view`).
```

Điền các chỗ `<điền ...>` bằng số liệu/SHA THẬT đo được ở Task 1-3 — không để nguyên placeholder khi
commit.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/HANDOFF.md
git commit -m "$(cat <<'EOF'
HANDOFF: chặng lưu trữ nội dung bảng (D4) xong, mục 17

Bảy cổng xanh, số liệu đo thật ghi trong mục mới. Kiểm tay trình
duyệt xem báo cáo Task 3.
EOF
)"
```

- [ ] **Step 5: Báo cáo tổng kết cho chủ dự án**

Tóm tắt ngắn: 2 task nội dung + 1 task đóng chặng đã xong, bảy cổng xanh, kết quả kiểm tay trình
duyệt (xác nhận được hay không). Hỏi có cần `git push`/gộp vào `main` theo quyền tự động đã cấp
trong `AGENTS.md`, hay chủ dự án muốn tự xem qua trước.
