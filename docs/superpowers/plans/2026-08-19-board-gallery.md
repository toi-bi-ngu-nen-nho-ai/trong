# BoardGallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay bảng vẽ cứng duy nhất bằng danh sách nhiều bảng có tên/ảnh xem trước, tạo/đổi
tên/xoá được, và gỡ hack "mount vĩnh viễn" ở `App.tsx` (nay an toàn nhờ D4 đã lưu bền vững).

**Architecture:** `idb.ts` thêm store `boards` (metadata thuần JSON). `EdgelessBoard` (hàm +
component + vỏ lazy) nhận thêm `boardId`, dùng làm Yjs `docId` bên trong CÙNG một CSDL
`'drtrong-board'` (không tách CSDL theo bảng). Hai component mới: `DanhSachBang` (lưới thẻ +
CRUD, không phụ thuộc BlockSuite) và `BoardGallery` (quản lý mở/đóng một bảng, tái dùng đúng kỹ
thuật `visibility:hidden` đã đo cho việc ẩn-theo-tab, nhưng giờ unmount thật khi quay lại danh
sách). `App.tsx` đổi import từ `EdgelessBoard` sang `BoardGallery`.

**Tech Stack:** React 19, TypeScript, IndexedDB (qua `src/lib/idb.ts` đã có), Vitest
(`happy-dom` + `fake-indexeddb` cho ca kiểm cần DOM, môi trường mặc định `node` cho ca kiểm
thuần).

**Spec:** `docs/superpowers/specs/2026-08-19-board-gallery-design.md`

## Global Constraints

- **D11:** không sửa file nào trong `src/vendor/blocksuite/`.
- CSDL Yjs giữ nguyên MỘT tên `'drtrong-board'` cho mọi bảng — chỉ `docId` (= `boardId`) khác
  nhau. KHÔNG tạo CSDL riêng theo từng bảng.
- Ảnh xem trước chụp **lúc rời bảng** (canvas đã mount sẵn), KHÔNG dùng `ExportManager`/
  `html2canvas` của vendor — vẽ lại vào canvas 480×360 riêng trước khi `toDataURL('image/jpeg',
  0.6)`, giới hạn dung lượng bản ghi bất kể độ phân giải backing-store thật.
- Xoá bảng theo khuôn **"chạm hai lần"** đã có trong app (`ConfirmIconButton`,
  `src/App.tsx:5245-5303`) — KHÔNG dùng hộp thoại xác nhận. `ConfirmIconButton` là component
  private của `App.tsx` (không export, phụ thuộc `icons` cũng private) — KHÔNG import nó; viết
  lại cục bộ trong `DanhSachBang.tsx` theo đúng tinh thần (chạm 1 đổi nhãn "Chắc chắn xoá?", tự
  huỷ sau 5000ms — cùng giá trị `CONFIRM_DELETE_RESET_MS` của App.tsx, viết hằng số riêng, không
  import), tránh khớp nối với file 11.000+ dòng đó.
- Menu thao tác mỗi thẻ: **đổi từ "chạm giữ" (long-press) sang nút "⋯" luôn hiện ở góc thẻ** — đơn
  giản hơn để cài đặt/kiểm thử đúng đắn, cùng đáp ứng đúng yêu cầu spec (đổi tên/xoá theo khuôn đã
  có). Ghi nhận đây là một lựa chọn triển khai cụ thể hoá gợi ý ở spec, không phải sai lệch ý định.
- Định dạng thời gian tương đối ("2 giờ trước", "Hôm qua"...): dùng LẠI `formatReadTime` đã có ở
  `src/lib/recentReads.ts` — KHÔNG viết hàm mới.
- `newBlockId()` (`src/lib/blocks.ts:8-10`) là mẫu để viết `taoIdBang()` — cùng khuôn
  `${tiền tố}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.
- Môi trường test mặc định `node` (xem `vite.config.ts`) — file test nào chạm DOM thật phải khai
  `// @vitest-environment happy-dom` ở dòng đầu (xem `edgeless-board-mount.spec.ts` làm mẫu).

---

### Task 1: Data model — store `boards` trong `idb.ts` + `boardMeta.ts`

**Files:**
- Modify: `src/lib/idb.ts`
- Create: `src/board/boardMeta.ts`
- Test: `src/lib/__tests__/idb.spec.ts`
- Test: `src/board/__tests__/boardMeta.spec.ts`

**Interfaces:**
- Produces: `BangMeta` type, `taoIdBang()`, `layDanhSachBang()`, `taoBang(ten?)`,
  `doiTenBang(id, tenMoi)`, `xoaBangMeta(id)`, `capNhatAnhXemTruoc(id, anhXemTruoc)` — Task 4/5/6
  import từ `../board/boardMeta` (test) hoặc `./boardMeta` (trong `src/board/`).

- [ ] **Step 1: Đọc `src/lib/idb.ts` hiện tại**

Xác nhận đúng cấu trúc trước khi sửa (không giả định — file có thể lệch nếu đã đổi từ lúc viết kế
hoạch này):

```bash
cat src/lib/idb.ts
```

Kỳ vọng thấy `DB_VERSION = 4`, `IDB_STORES = { ecgLessons: "lessons", articles: "articles" }`,
và các hàm `idbGetAll`/`idbPutMany`/`idbPut`/`idbReplaceAll`/`idbDelete` đã export.

- [ ] **Step 2: Viết ca kiểm thất bại cho `idb.ts`**

Tạo `src/lib/__tests__/idb.spec.ts`:

```typescript
import 'fake-indexeddb/auto'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../idb'

describe('idb — store boards (nâng DB_VERSION lên 5)', () => {
  afterEach(async () => {
    // Xoá sạch để mỗi ca kiểm độc lập — fake-indexeddb giữ state giữa các ca trong cùng file.
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
  })

  it('đọc/ghi được store boards, không đụng store cũ (ecgLessons/articles)', async () => {
    const okBang = await idbPut(IDB_STORES.boards, { id: 'x', ten: 'Test' })
    expect(okBang).toBe(true)

    const dsBang = await idbGetAll<{ id: string; ten: string }>(IDB_STORES.boards)
    expect(dsBang).toEqual([{ id: 'x', ten: 'Test' }])

    // Store cũ vẫn hoạt động bình thường sau khi nâng version — không rỗng bất thường, không lỗi.
    const dsLessons = await idbGetAll(IDB_STORES.ecgLessons)
    expect(Array.isArray(dsLessons)).toBe(true)
  })

  it('máy đã có CSDL ở version 4 (chưa có store boards) → nâng cấp lên 5 không mất dữ liệu cũ', async () => {
    // Mô phỏng máy cũ: mở thẳng bằng indexedDB API, version 4, chỉ có hai store gốc, ghi một mục.
    const dbCu = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('drtrong-ecg', 4)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('lessons')) db.createObjectStore('lessons', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('articles')) db.createObjectStore('articles', { keyPath: 'id' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = dbCu.transaction('lessons', 'readwrite')
      tx.objectStore('lessons').put({ id: 'bai-cu', title: 'Bài học cũ' })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    dbCu.close()

    // Giờ mở qua idb.ts (version 5) — phải tự nâng cấp, KHÔNG mất mục "bai-cu", VÀ có store boards.
    const dsLessons = await idbGetAll<{ id: string; title: string }>(IDB_STORES.ecgLessons)
    expect(dsLessons).toEqual([{ id: 'bai-cu', title: 'Bài học cũ' }])

    const okBang = await idbPut(IDB_STORES.boards, { id: 'y', ten: 'Test 2' })
    expect(okBang).toBe(true)
  })
})
```

- [ ] **Step 3: Chạy ca kiểm, xác nhận thất bại**

Run: `npx vitest run src/lib/__tests__/idb.spec.ts`
Expected: FAIL — `IDB_STORES.boards` là `undefined`, `idbPut(undefined, ...)` không ghi vào store
nào hợp lệ (transaction lỗi vì tên store rỗng/không tồn tại).

- [ ] **Step 4: Sửa `src/lib/idb.ts`**

```typescript
const DB_VERSION = 5
```

```typescript
export const IDB_STORES = {
  ecgLessons: "lessons",
  articles: "articles",
  boards: "boards",
} as const
```

Không sửa gì khác trong file — `ALL_STORES`/`onupgradeneeded` đã generic, tự tạo store còn thiếu.

- [ ] **Step 5: Chạy ca kiểm, xác nhận qua**

Run: `npx vitest run src/lib/__tests__/idb.spec.ts`
Expected: PASS — 2/2 ca.

- [ ] **Step 6: Commit**

```bash
git add src/lib/idb.ts src/lib/__tests__/idb.spec.ts
git commit -m "feat(idb): thêm store boards, nâng DB_VERSION lên 5"
```

- [ ] **Step 7: Viết ca kiểm thất bại cho `boardMeta.ts`**

Tạo `src/board/__tests__/boardMeta.spec.ts`:

```typescript
import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll } from '../../lib/idb'
import { capNhatAnhXemTruoc, doiTenBang, layDanhSachBang, taoBang, taoIdBang, xoaBangMeta } from '../boardMeta'

afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
  for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
})

describe('taoIdBang', () => {
  it('sinh id khác nhau ở hai lượt gọi liên tiếp', () => {
    const a = taoIdBang()
    const b = taoIdBang()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^bang-/)
  })
})

describe('taoBang / layDanhSachBang', () => {
  it('tạo bảng mới → xuất hiện ngay trong danh sách, đúng tên mặc định', async () => {
    const meta = await taoBang()
    expect(meta.ten).toBe('Bảng chưa đặt tên')
    const ds = await layDanhSachBang()
    expect(ds.map((b) => b.id)).toContain(meta.id)
  })

  it('tạo bảng với tên tuỳ chỉnh', async () => {
    const meta = await taoBang('Phác đồ sốc nhiễm khuẩn')
    expect(meta.ten).toBe('Phác đồ sốc nhiễm khuẩn')
  })
})

describe('doiTenBang', () => {
  it('đổi tên bảng đã tồn tại → danh sách phản ánh tên mới, capNhatLuc tăng', async () => {
    const meta = await taoBang('Tên cũ')
    const capNhatLucCu = meta.capNhatLuc
    await new Promise((r) => setTimeout(r, 2))
    await doiTenBang(meta.id, 'Tên mới')
    const ds = await layDanhSachBang()
    const sau = ds.find((b) => b.id === meta.id)
    expect(sau?.ten).toBe('Tên mới')
    expect(sau!.capNhatLuc).toBeGreaterThan(capNhatLucCu)
  })

  it('đổi tên bảng KHÔNG tồn tại → không ném lỗi, không tạo mục mới', async () => {
    await expect(doiTenBang('khong-ton-tai', 'Gì đó')).resolves.toBeUndefined()
    const ds = await layDanhSachBang()
    expect(ds.find((b) => b.id === 'khong-ton-tai')).toBeUndefined()
  })
})

describe('xoaBangMeta', () => {
  it('xoá bảng → biến mất khỏi danh sách', async () => {
    const meta = await taoBang()
    await xoaBangMeta(meta.id)
    const ds = await layDanhSachBang()
    expect(ds.find((b) => b.id === meta.id)).toBeUndefined()
  })
})

describe('capNhatAnhXemTruoc', () => {
  it('ghi ảnh xem trước cho bảng đã tồn tại', async () => {
    const meta = await taoBang()
    await capNhatAnhXemTruoc(meta.id, 'data:image/jpeg;base64,xyz')
    const ds = await layDanhSachBang()
    expect(ds.find((b) => b.id === meta.id)?.anhXemTruoc).toBe('data:image/jpeg;base64,xyz')
  })

  it('bảng KHÔNG tồn tại → không ném lỗi', async () => {
    await expect(capNhatAnhXemTruoc('khong-ton-tai', 'x')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 8: Chạy ca kiểm, xác nhận thất bại**

Run: `npx vitest run src/board/__tests__/boardMeta.spec.ts`
Expected: FAIL — `Cannot find module '../boardMeta'`.

- [ ] **Step 9: Viết cài đặt tối thiểu**

Tạo `src/board/boardMeta.ts`:

```typescript
// CRUD thuần cho metadata danh sách bảng — object store "boards" của src/lib/idb.ts. Tách khỏi
// idb.ts (generic, dùng chung cho ECG/bài viết) vì đây là logic RIÊNG của subsystem bảng vẽ.
import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'

export type BangMeta = {
  id: string
  ten: string
  taoLuc: number
  capNhatLuc: number
  anhXemTruoc?: string
}

export function taoIdBang(): string {
  return `bang-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function layDanhSachBang(): Promise<BangMeta[]> {
  return idbGetAll<BangMeta>(IDB_STORES.boards)
}

// id sinh phía client TRƯỚC khi ghi IndexedDB — theo đúng triết lý "không chặn luồng dùng app"
// của idb.ts (xem catch → false/[] ở đó): dù ghi metadata thất bại (chế độ ẩn danh, hết quota),
// người dùng vẫn mở được bảng mới ngay (nội dung Yjs của nó là nguồn sự thật riêng, không phụ
// thuộc bản ghi này).
export async function taoBang(ten = 'Bảng chưa đặt tên'): Promise<BangMeta> {
  const bayGio = Date.now()
  const meta: BangMeta = { id: taoIdBang(), ten, taoLuc: bayGio, capNhatLuc: bayGio }
  await idbPut(IDB_STORES.boards, meta)
  return meta
}

export async function doiTenBang(id: string, tenMoi: string): Promise<void> {
  const ds = await layDanhSachBang()
  const hienCo = ds.find((b) => b.id === id)
  if (!hienCo) return
  await idbPut(IDB_STORES.boards, { ...hienCo, ten: tenMoi, capNhatLuc: Date.now() })
}

// CHỈ xoá metadata, KHÔNG đụng Yjs doc/blob thật trong CSDL 'drtrong-board' — quyết định có chủ ý,
// xem ghi chú "nợ kỹ thuật đã xác nhận" ở cuối kế hoạch (docs/superpowers/plans/2026-08-19-board-gallery.md).
export function xoaBangMeta(id: string): Promise<boolean> {
  return idbDelete(IDB_STORES.boards, id)
}

// Gọi lúc rời một bảng (xem EdgelessBoard.tsx) — đồng thời đóng vai trò cập nhật "sửa lúc" vì
// chặng này chưa dựng cơ chế phát hiện thay đổi thật; thời điểm rời bảng là xấp xỉ hợp lý.
export async function capNhatAnhXemTruoc(id: string, anhXemTruoc: string): Promise<void> {
  const ds = await layDanhSachBang()
  const hienCo = ds.find((b) => b.id === id)
  if (!hienCo) return
  await idbPut(IDB_STORES.boards, { ...hienCo, anhXemTruoc, capNhatLuc: Date.now() })
}
```

- [ ] **Step 10: Chạy ca kiểm, xác nhận qua**

Run: `npx vitest run src/board/__tests__/boardMeta.spec.ts`
Expected: PASS — 8/8 ca.

- [ ] **Step 11: Commit**

```bash
git add src/board/boardMeta.ts src/board/__tests__/boardMeta.spec.ts
git commit -m "feat(board): boardMeta.ts — CRUD metadata danh sách bảng"
```

---

### Task 2: `boardId` xuyên suốt `EdgelessBoard` (hàm thuần + component + vỏ lazy)

**Files:**
- Modify: `src/board/EdgelessBoard.tsx`
- Modify: `src/board/index.tsx`
- Modify: `src/board/__tests__/edgeless-board.spec.ts`
- Modify: `src/board/__tests__/edgeless-board-mount.spec.ts`

**Interfaces:**
- Consumes: không có (task độc lập, chỉ đổi chữ ký hiện có).
- Produces: `taoHoacMoBang(boardId: string, tuyChon?): Promise<{workspace, store, khongLuuDuoc}>`,
  `EdgelessBoard({ boardId }: { boardId: string })` (React component, export từ cả
  `EdgelessBoard.tsx` và vỏ lazy `index.tsx`) — Task 3/6 dùng prop `boardId` này.

- [ ] **Step 1: Đọc lại `src/board/EdgelessBoard.tsx` và `src/board/index.tsx` hiện tại**

Xác nhận đúng nội dung trước khi sửa (dòng cụ thể có thể lệch):

```bash
cat src/board/EdgelessBoard.tsx
cat src/board/index.tsx
```

- [ ] **Step 2: Sửa 4 ca kiểm hiện có trong `edgeless-board.spec.ts` để truyền `boardId`**

Mở `src/board/__tests__/edgeless-board.spec.ts`. Đổi TỪNG lời gọi `taoHoacMoBang({...})` thành
`taoHoacMoBang('board', {...})` — boardId `'board'` giữ nguyên giá trị cũ để tối thiểu hoá thay
đổi ở các ca đã có (không đổi ý nghĩa ca kiểm, chỉ đổi chữ ký). Cụ thể 5 lời gọi cần sửa:

1. Dòng ~63 (`'lần đầu trên cặp source rỗng...'`):
   ```typescript
   const { store } = await taoHoacMoBang('board', {
     docSources: { main: dungDocSourceGia() },
     blobSources: { main: dungBlobSourceGia() },
   })
   ```
2. Dòng ~78 (`'gọi hai lần liên tiếp...'`, biến `lanMot`):
   ```typescript
   const lanMot = await taoHoacMoBang('board', { docSources, blobSources })
   ```
3. Cùng ca đó, dòng ~87 (biến `lanHai`):
   ```typescript
   const lanHai = await taoHoacMoBang('board', { docSources, blobSources })
   ```
4. Ca `'doc đăng ký trong meta...'`, dòng ~97 và ~109 (`lanMot`/`lanHai`): thêm `'board'` làm đối
   số đầu, giữ nguyên `tuyChon` thứ hai.
5. Ca `'nội dung thêm SAU khi mở lần đầu...'`, dòng ~125 và ~140 (`lanMot`/`lanHai`): thêm
   `'board'` làm đối số đầu.
6. Ca `'workspace.forceStop()...'`, dòng ~152: thêm `'board'` làm đối số đầu.
7. Ca `'pull/push không bao giờ resolve...'` trong describe hạn giờ, dòng ~177: thêm `'board'`
   làm đối số đầu:
   ```typescript
   const { store, workspace } = await taoHoacMoBang('board', {
     docSources: { main: docSourceTreo },
     blobSources: { main: blobSourceTreo },
     hanGioMs: 20,
   })
   ```

Thêm MỘT ca kiểm mới vào cuối `describe('taoHoacMoBang — đường cơ bản', ...)`, TRƯỚC dòng `})`
đóng describe đó:

```typescript
  it('hai boardId khác nhau trên CÙNG cặp source → hai doc độc lập, không đụng nhau', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const bangA = await taoHoacMoBang('bang-a', { docSources, blobSources })
    const noteId = bangA.store.addBlock('affine:note', {}, bangA.store.root!.id)
    bangA.store.addBlock('affine:paragraph', { text: new Text('nội dung riêng của bảng A') }, noteId)
    await bangA.workspace.waitForSynced()
    bangA.workspace.forceStop()

    const bangB = await taoHoacMoBang('bang-b', { docSources, blobSources })
    // Bảng B không có note nào — nếu taoHoacMoBang bỏ sót boardId và luôn đọc/ghi docId 'board' cố
    // định, ca này sẽ thấy note của bảng A lọt sang bảng B, đỏ ngay ở expect dưới.
    const noteBangB = bangB.store.root!.children.find((c) => c.flavour === 'affine:note')
    expect(noteBangB).toBeUndefined()
    bangB.workspace.forceStop()
  })
```

- [ ] **Step 3: Chạy ca kiểm, xác nhận thất bại**

Run: `npx vitest run src/board/__tests__/edgeless-board.spec.ts`
Expected: FAIL — `taoHoacMoBang('board', {...})` gọi với 2 đối số nhưng hàm hiện tại chỉ nhận 1
(TypeScript báo lỗi biên dịch, vitest báo lỗi transform/type).

- [ ] **Step 4: Sửa `taoHoacMoBang` trong `EdgelessBoard.tsx`**

Đổi chữ ký hàm (dòng ~95 hiện tại) — thêm `boardId: string` làm tham số đầu, TRƯỚC `tuyChon`:

```typescript
export async function taoHoacMoBang(boardId: string, tuyChon?: {
  docSources?: { main: DocSource }
  blobSources?: { main: BlobSource }
  hanGioMs?: number
}) {
```

Cập nhật docstring JSDoc phía trên (đoạn `QUAN TRỌNG: createDoc('board') ném lỗi...`) — thay hai
chỗ `'board'` trong lời văn bằng `boardId` (chỉ đổi chữ, không đổi code, đây là comment).

Trong thân hàm, đổi HAI chỗ dùng chuỗi `'board'` khoá cứng (dòng ~138, ~140):

```typescript
    let doc = workspace.getDoc(boardId)
    if (!doc) {
      doc = workspace.createDoc(boardId)
    }
```

Không đổi `TEN_CSDL_BANG`, không đổi `id: 'bs-trong-board'` của `TestWorkspace` (workspace ID
dùng chung cho mọi bảng — chỉ docId khác nhau, đúng thiết kế §2.2 của spec).

- [ ] **Step 5: Sửa component `EdgelessBoard()` để nhận prop `boardId`**

Đổi chữ ký component (dòng ~203 hiện tại):

```typescript
export function EdgelessBoard({ boardId }: { boardId: string }) {
```

Trong `useEffect` mount (dòng ~230), đổi lời gọi `taoHoacMoBang()` thành `taoHoacMoBang(boardId)`,
VÀ đổi mảng dependency từ `[]` thành `[boardId]` (component này giờ phải mount lại đúng cách nếu
`boardId` đổi — dù trong thiết kế thực tế `BoardGallery` sẽ luôn tháo/dựng lại component thay vì
đổi prop tại chỗ, khai đúng dependency vẫn là thực hành đúng, tránh lỗi ẩn nếu cách gọi thay đổi
sau này):

```typescript
    taoHoacMoBang(boardId)
      .then(({ workspace, store, khongLuuDuoc: khongLuuDuocKetQua }) => {
```

... (giữ nguyên phần còn lại của `.then()`/`.catch()`) ...

```typescript
  }, [boardId])
```

- [ ] **Step 6: Sửa vỏ lazy `src/board/index.tsx`**

Đổi khai kiểu của class (dòng ~43 hiện tại):

```typescript
export class EdgelessBoard extends Component<{ boardId: string }, State> {
```

Đổi dòng render `<Bang />` (dòng ~96) thành:

```typescript
        <Bang boardId={this.props.boardId} />
```

- [ ] **Step 7: Sửa 4 lời gọi `createElement(EdgelessBoard)` trong `edgeless-board-mount.spec.ts`**

Mở `src/board/__tests__/edgeless-board-mount.spec.ts`. Đổi CẢ 4 chỗ
`createElement(EdgelessBoard)` thành `createElement(EdgelessBoard, { boardId: 'board' })` — 4 vị
trí (dòng ~74, ~137, ~157, ~181, ~207 — có thể lệch số dòng, tìm bằng nội dung
`createElement(EdgelessBoard)`, chính xác 5 lần xuất hiện trong file này kể cả lần lặp lại ở ca
"mount lại").

- [ ] **Step 8: Chạy ca kiểm, xác nhận qua**

Run:
```bash
npx vitest run src/board/__tests__/edgeless-board.spec.ts src/board/__tests__/edgeless-board-mount.spec.ts
```
Expected: PASS — tất cả ca cũ + ca mới ở Step 2 xanh.

- [ ] **Step 9: Kiểm kiểu**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 10: Commit**

```bash
git add src/board/EdgelessBoard.tsx src/board/index.tsx src/board/__tests__/edgeless-board.spec.ts src/board/__tests__/edgeless-board-mount.spec.ts
git commit -m "feat(board): boardId xuyên suốt EdgelessBoard — bỏ docId khoá cứng 'board'"
```

---

### Task 3: Chụp ảnh xem trước lúc rời bảng

**Files:**
- Modify: `src/board/EdgelessBoard.tsx`
- Modify: `src/board/__tests__/edgeless-board-mount.spec.ts`

**Interfaces:**
- Consumes: `capNhatAnhXemTruoc` từ Task 1 (`./boardMeta`); `boardId` prop từ Task 2.
- Produces: không có API mới — hành vi phụ (side effect) khi component unmount.

- [ ] **Step 1: Viết ca kiểm thất bại**

Thêm vào cuối `describe('EdgelessBoard — cầu nối React↔Lit', ...)` trong
`edgeless-board-mount.spec.ts`, TRƯỚC dòng `})` đóng describe. Cần mock `capNhatAnhXemTruoc` —
thêm import ở đầu file:

```typescript
import * as boardMeta from '../boardMeta'
```

Ca kiểm mới:

```typescript
  it('unmount → gọi capNhatAnhXemTruoc với đúng boardId và một chuỗi data URL', async () => {
    const spy = vi.spyOn(boardMeta, 'capNhatAnhXemTruoc').mockResolvedValue(undefined)

    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'bang-chup-anh' }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(document.querySelector('editor-host')).not.toBeNull()
      })
    })

    await act(async () => {
      root.unmount()
    })

    // canvas thật không tồn tại trong happy-dom (getContext('2d') đã bị giả ở đầu file) — hàm
    // chụp phải KHÔNG NÉM LỖI trong trường hợp này (canvas rỗng/không vẽ được), nhưng cũng không
    // bắt buộc gọi capNhatAnhXemTruoc nếu không có gì để chụp. Ca kiểm này canh việc unmount không
    // đổ vỡ — ca kiểm tích hợp thật (chụp ra ảnh đúng) thuộc phạm vi kiểm tay trên trình duyệt
    // thật (xem HANDOFF, cùng giới hạn đã ghi cho D4).
    expect(spy).not.toThrow
    spy.mockRestore()
  })
```

- [ ] **Step 2: Chạy ca kiểm, xác nhận thất bại**

Run: `npx vitest run src/board/__tests__/edgeless-board-mount.spec.ts`
Expected: FAIL — `import * as boardMeta from '../boardMeta'` lỗi (file `boardMeta.ts` tồn tại từ
Task 1 nhưng chưa được `EdgelessBoard.tsx` import/dùng nên `vi.spyOn` không có gì để theo dõi một
cách có ý nghĩa — thực chất ca này sẽ PASS ngay cả khi chưa cài đặt vì nó chỉ canh "không ném
lỗi". Đây là giới hạn đã biết của việc kiểm chụp ảnh trong DOM giả lập — xem Step 1). Nếu ca kiểm
PASS ngay ở bước này (không có gì để RED), bỏ qua yêu cầu RED cho riêng ca kiểm best-effort này và
ghi rõ trong báo cáo — chuyển thẳng sang Step 3, xác nhận GREEN sau khi cài đặt xong vẫn là bằng
chứng chính.

- [ ] **Step 3: Cài đặt chụp ảnh xem trước**

Trong `EdgelessBoard.tsx`, thêm import ở đầu file (cùng khối import cục bộ, sau dòng import
`apDungViewportChoIOS`):

```typescript
import { capNhatAnhXemTruoc } from './boardMeta'
```

Sửa hàm dọn dẹp trong `useEffect` (dòng ~260 hiện tại, `return () => { huyBo = true; ... }`) —
thêm bước chụp ảnh NGAY ĐẦU, TRƯỚC dòng `litRender(null, el)`:

```typescript
    return () => {
      huyBo = true
      // Chụp ảnh xem trước TRƯỚC khi tháo cây Lit — sau litRender(null, el) canvas không còn.
      // Best-effort tuyệt đối: lỗi ở đây KHÔNG được chặn dọn dẹp thật (forceStop() vẫn phải chạy).
      try {
        const canvasGoc = el.querySelector('canvas')
        if (canvasGoc && canvasGoc.width > 0 && canvasGoc.height > 0) {
          const nho = document.createElement('canvas')
          nho.width = 480
          nho.height = 360
          const ctx = nho.getContext('2d')
          if (ctx) {
            ctx.drawImage(canvasGoc, 0, 0, 480, 360)
            void capNhatAnhXemTruoc(boardId, nho.toDataURL('image/jpeg', 0.6))
          }
        }
      } catch {
        // Chụp ảnh là tiện ích phụ — không được làm hỏng thao tác quay lại danh sách của người dùng.
      }
      litRender(null, el)
      workspaceHienTai?.forceStop()
    }
```

- [ ] **Step 4: Chạy ca kiểm, xác nhận qua**

Run: `npx vitest run src/board/__tests__/edgeless-board-mount.spec.ts`
Expected: PASS — toàn bộ file (5 ca cũ + 1 ca mới).

- [ ] **Step 5: Kiểm kiểu**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/board/EdgelessBoard.tsx src/board/__tests__/edgeless-board-mount.spec.ts
git commit -m "feat(board): chụp ảnh xem trước lúc rời bảng, ghi vào boardMeta"
```

---

### Task 4: Di trú bảng cũ — `diTruBangCuNeuCo()`

**Files:**
- Create: `src/board/diTruBangCu.ts`
- Test: `src/board/__tests__/diTruBangCu.spec.ts`

**Interfaces:**
- Consumes: `layDanhSachBang`, `taoIdBang` KHÔNG dùng (docId di trú là `'board'` cố định, không
  sinh mới) — dùng `IDB_STORES`, `idbGetAll`, `idbPut` gián tiếp qua `boardMeta.ts` cho phần ghi;
  `TestWorkspace`/`IndexedDBDocSource`/`IndexedDBBlobSource` từ `@blocksuite/affine/store/test` và
  `@blocksuite/sync` (cùng cặp import `EdgelessBoard.tsx` đã dùng) cho phần đọc CSDL Yjs thật.
- Produces: `diTruBangCuNeuCo(tuyChon?: { docSources?; blobSources? }): Promise<void>` — Task 6
  gọi hàm này (không đối số trong app thật) lúc `BoardGallery` mount lần đầu.

- [ ] **Step 1: Viết ca kiểm thất bại**

Tạo `src/board/__tests__/diTruBangCu.spec.ts` — dùng lại đúng docSource/blobSource giả của
`edgeless-board.spec.ts` (copy hai hàm `dungDocSourceGia`/`dungBlobSourceGia`, không import chéo
giữa hai file test — mỗi file test độc lập theo quy ước dự án):

```typescript
import { afterEach, describe, expect, it } from 'vitest'
import { mergeUpdates } from 'yjs'

import type { BlobSource, DocSource } from '@blocksuite/sync'
import { Text } from '@blocksuite/store'

import { IDB_STORES, idbDelete, idbGetAll } from '../../lib/idb'
import { diTruBangCuNeuCo } from '../diTruBangCu'
import { taoHoacMoBang } from '../EdgelessBoard'

function dungDocSourceGia(): DocSource & { kho: Map<string, Uint8Array[]> } {
  const kho = new Map<string, Uint8Array[]>()
  return {
    name: 'gia-lap',
    kho,
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

afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
  for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
})

describe('diTruBangCuNeuCo', () => {
  it('có bảng cũ (docId "board" đã có nội dung) và CHƯA có metadata → tạo metadata "Bảng đầu tiên"', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    // Dựng nội dung "bảng cũ" giống hệt cách EdgelessBoard.tsx đã làm trước chặng BoardGallery.
    const bangCu = await taoHoacMoBang('board', { docSources, blobSources })
    const noteId = bangCu.store.addBlock('affine:note', {}, bangCu.store.root!.id)
    bangCu.store.addBlock('affine:paragraph', { text: new Text('nội dung bảng cũ') }, noteId)
    await bangCu.workspace.waitForSynced()
    bangCu.workspace.forceStop()

    await diTruBangCuNeuCo({ docSources, blobSources })

    const ds = await idbGetAll<{ id: string; ten: string }>(IDB_STORES.boards)
    expect(ds).toHaveLength(1)
    expect(ds[0].id).toBe('board')
    expect(ds[0].ten).toBe('Bảng đầu tiên')
  })

  it('máy mới, không có bảng cũ nào → không tạo metadata gì cả', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    await diTruBangCuNeuCo({ docSources, blobSources })

    const ds = await idbGetAll(IDB_STORES.boards)
    expect(ds).toHaveLength(0)
  })

  it('đã có metadata cho "board" từ trước → không ghi đè, không tạo trùng', async () => {
    const docSources = { main: dungDocSourceGia() }
    const blobSources = { main: dungBlobSourceGia() }

    const bangCu = await taoHoacMoBang('board', { docSources, blobSources })
    bangCu.workspace.forceStop()

    // Người dùng đã tự đổi tên bảng cũ TRƯỚC lượt di trú này chạy (vd đã chạy di trú một lần rồi).
    const { idbPut } = await import('../../lib/idb')
    await idbPut(IDB_STORES.boards, { id: 'board', ten: 'Tên do người dùng đặt', taoLuc: 1, capNhatLuc: 1 })

    await diTruBangCuNeuCo({ docSources, blobSources })

    const ds = await idbGetAll<{ id: string; ten: string }>(IDB_STORES.boards)
    expect(ds).toHaveLength(1)
    expect(ds[0].ten).toBe('Tên do người dùng đặt')
  })
})
```

- [ ] **Step 2: Chạy ca kiểm, xác nhận thất bại**

Run: `npx vitest run src/board/__tests__/diTruBangCu.spec.ts`
Expected: FAIL — `Cannot find module '../diTruBangCu'`.

- [ ] **Step 3: Viết cài đặt tối thiểu**

Tạo `src/board/diTruBangCu.ts`:

```typescript
// Di trú MỘT LẦN: bảng cũ (docId 'board' cố định, từ trước khi có BoardGallery) chưa có metadata
// trong store 'boards' → tự tạo một bản ghi cho nó, để nó xuất hiện trong danh sách sau khi cập
// nhật, không cần thao tác gì từ người dùng. Xem spec 2026-08-19-board-gallery-design.md §2.6.
import { StoreExtensionManager } from '@blocksuite/affine/ext-loader'
import { getInternalStoreExtensions } from '@blocksuite/affine/extensions/store'
import { createAutoIncrementIdGenerator, TestWorkspace } from '@blocksuite/affine/store/test'
import type { BlobSource, DocSource } from '@blocksuite/sync'
import { IndexedDBBlobSource, IndexedDBDocSource } from '@blocksuite/sync'

import { IDB_STORES, idbGetAll, idbPut } from '../lib/idb'
import type { BangMeta } from './boardMeta'

const TEN_CSDL_BANG = 'drtrong-board'
const storeManager = new StoreExtensionManager(getInternalStoreExtensions())

export async function diTruBangCuNeuCo(tuyChon?: {
  docSources?: { main: DocSource }
  blobSources?: { main: BlobSource }
}): Promise<void> {
  const dsHienCo = await idbGetAll<BangMeta>(IDB_STORES.boards)
  if (dsHienCo.some((b) => b.id === 'board')) return

  const docSources = tuyChon?.docSources ?? { main: new IndexedDBDocSource(TEN_CSDL_BANG) }
  const blobSources = tuyChon?.blobSources ?? { main: new IndexedDBBlobSource(TEN_CSDL_BANG) }

  const workspace = new TestWorkspace({
    id: 'bs-trong-board',
    idGenerator: createAutoIncrementIdGenerator(),
    docSources,
    blobSources,
  })
  try {
    workspace.meta.initialize()
    workspace.start()
    await workspace.waitForSynced()

    const doc = workspace.getDoc('board')
    if (!doc) return // Máy mới, chưa từng có bảng cũ — không làm gì.

    const store = doc.getStore({ extensions: storeManager.get('store') })
    doc.load()

    const coNoiDungThat = store.root?.children.some((khoi) => khoi.flavour === 'affine:surface')
    if (!coNoiDungThat) return

    const bayGio = Date.now()
    const meta: BangMeta = { id: 'board', ten: 'Bảng đầu tiên', taoLuc: bayGio, capNhatLuc: bayGio }
    await idbPut(IDB_STORES.boards, meta)
  } finally {
    workspace.forceStop()
  }
}
```

- [ ] **Step 4: Chạy ca kiểm, xác nhận qua**

Run: `npx vitest run src/board/__tests__/diTruBangCu.spec.ts`
Expected: PASS — 3/3 ca.

- [ ] **Step 5: Kiểm kiểu**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/board/diTruBangCu.ts src/board/__tests__/diTruBangCu.spec.ts
git commit -m "feat(board): di trú tự động bảng cũ (docId 'board') sang metadata danh sách"
```

---

### Task 5: `DanhSachBang` — lưới thẻ + tạo/đổi tên/xoá

**Files:**
- Create: `src/board/DanhSachBang.tsx`
- Test: `src/board/__tests__/DanhSachBang.spec.tsx`

**Interfaces:**
- Consumes: `BangMeta`, `layDanhSachBang`, `taoBang`, `doiTenBang`, `xoaBangMeta` từ Task 1
  (`./boardMeta`); `formatReadTime` từ `../lib/recentReads` (đã có sẵn, không phải tạo mới).
- Produces: `DanhSachBang({ onMoBang }: { onMoBang: (boardId: string) => void }): JSX.Element` —
  Task 6 render component này khi chưa có bảng nào đang mở.

- [ ] **Step 1: Viết ca kiểm thất bại**

Tạo `src/board/__tests__/DanhSachBang.spec.tsx`:

```typescript
// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll } from '../../lib/idb'
import { taoBang } from '../boardMeta'
import { DanhSachBang } from '../DanhSachBang'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('DanhSachBang', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
  })

  it('rỗng lúc đầu → chỉ hiện thẻ "+"', async () => {
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
      })
    })
    expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
  })

  it('có sẵn bảng trong metadata → hiện đúng tên trên thẻ', async () => {
    await taoBang('Phác đồ sốc nhiễm khuẩn')
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
      })
    })
    expect(container.textContent).toContain('Phác đồ sốc nhiễm khuẩn')
  })

  it('bấm thẻ "+" → gọi onMoBang với id mới, thẻ mới xuất hiện trong danh sách sau đó', async () => {
    const onMoBang = vi.fn()
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
      })
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="tao-bang"]') as HTMLButtonElement).click()
    })

    expect(onMoBang).toHaveBeenCalledTimes(1)
    const idMoi = onMoBang.mock.calls[0][0] as string
    expect(idMoi).toMatch(/^bang-/)

    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    expect(ds.map((b) => b.id)).toContain(idMoi)
  })

  it('bấm "⋯" rồi "Đổi tên", sửa ô nhập, Enter → tên cập nhật trên thẻ và trong metadata', async () => {
    const meta = await taoBang('Tên cũ')
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
      })
    })

    await act(async () => {
      ;(container.querySelector(`[data-testid="menu-bang-${meta.id}"]`) as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector(`[data-testid="doi-ten-${meta.id}"]`) as HTMLButtonElement).click()
    })

    const input = container.querySelector(`[data-testid="input-ten-${meta.id}"]`) as HTMLInputElement
    expect(input).not.toBeNull()

    await act(async () => {
      input.value = 'Tên mới'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.textContent).toContain('Tên mới')
      })
    })

    const ds = await idbGetAll<{ id: string; ten: string }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === meta.id)?.ten).toBe('Tên mới')
  })

  it('bấm "⋯" rồi "Xoá" HAI lần liên tiếp → bảng biến mất khỏi lưới và metadata', async () => {
    const meta = await taoBang('Sẽ bị xoá')
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
      })
    })

    await act(async () => {
      ;(container.querySelector(`[data-testid="menu-bang-${meta.id}"]`) as HTMLButtonElement).click()
    })
    const nutXoa = () => container.querySelector(`[data-testid="xoa-${meta.id}"]`) as HTMLButtonElement

    // Chạm lần 1: chỉ đổi nhãn, CHƯA xoá.
    await act(async () => {
      nutXoa().click()
    })
    let ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    expect(ds.map((b) => b.id)).toContain(meta.id)
    expect(nutXoa().textContent).toContain('Chắc chắn')

    // Chạm lần 2: xoá thật.
    await act(async () => {
      nutXoa().click()
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
      })
    })
    ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    expect(ds.map((b) => b.id)).not.toContain(meta.id)
  })
})
```

- [ ] **Step 2: Chạy ca kiểm, xác nhận thất bại**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.tsx`
Expected: FAIL — `Cannot find module '../DanhSachBang'`.

- [ ] **Step 3: Viết cài đặt tối thiểu**

Tạo `src/board/DanhSachBang.tsx`:

```typescript
// Lưới thẻ danh sách bảng — tạo/đổi tên/xoá. KHÔNG phụ thuộc BlockSuite (không import ./index hay
// ./EdgelessBoard) — giữ file này nhẹ, tách hẳn khỏi ranh giới nạp chậm 994 kB. BoardGallery.tsx
// (bao ngoài) mới là nơi quyết định khi nào mount bảng vẽ thật.
import { useEffect, useState } from 'react'

import { formatReadTime } from '../lib/recentReads'
import { type BangMeta, doiTenBang, layDanhSachBang, taoBang, xoaBangMeta } from './boardMeta'

// Cùng giá trị CONFIRM_DELETE_RESET_MS của App.tsx (5000) — viết hằng số riêng thay vì import vì
// component gốc (ConfirmIconButton) là private, phụ thuộc `icons` cũng private của file 11.000+
// dòng đó. Xem Global Constraints của kế hoạch này.
const XAC_NHAN_XOA_MS = 5000

function TheTrong() {
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full opacity-40" aria-hidden="true">
      <circle cx="60" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="80" y1="50" x2="120" y2="50" stroke="currentColor" strokeWidth="2" />
      <rect x="120" y="35" width="40" height="30" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function TheBang({
  bang,
  dangSuaTen,
  dangMoMenu,
  dangXacNhanXoa,
  onMo,
  onBatMenu,
  onBatSuaTen,
  onLuuTen,
  onXoa,
}: {
  bang: BangMeta
  dangSuaTen: boolean
  dangMoMenu: boolean
  dangXacNhanXoa: boolean
  onMo: () => void
  onBatMenu: () => void
  onBatSuaTen: () => void
  onLuuTen: (tenMoi: string) => void
  onXoa: () => void
}) {
  const [tenNhap, setTenNhap] = useState(bang.ten)

  return (
    <div data-testid="the-bang" style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onMo}
        style={{ display: 'block', width: '100%', border: 0, background: 'none', padding: 0, textAlign: 'left' }}
        aria-label={`Mở bảng ${bang.ten}`}
      >
        <div
          style={{
            aspectRatio: '4 / 3',
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--c-surface-soft, #f4f1ea)',
            color: 'var(--c-text-muted, #b5aa8f)',
          }}
        >
          {bang.anhXemTruoc ? (
            <img src={bang.anhXemTruoc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <TheTrong />
          )}
        </div>
        {!dangSuaTen && (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, margin: '4px 0 0', lineHeight: 1.2 }}>{bang.ten}</p>
            <p style={{ fontSize: 11, margin: '1px 0 0', color: 'var(--c-text-muted, #8a8378)' }}>
              {formatReadTime(bang.capNhatLuc)}
            </p>
          </>
        )}
      </button>

      {dangSuaTen && (
        <input
          type="text"
          data-testid={`input-ten-${bang.id}`}
          value={tenNhap}
          autoFocus
          onChange={(e) => setTenNhap(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onLuuTen(tenNhap)
            if (e.key === 'Escape') onLuuTen(bang.ten)
          }}
          onBlur={() => onLuuTen(tenNhap)}
          style={{ width: '100%', marginTop: 4, fontSize: 13, fontWeight: 600 }}
        />
      )}

      <button
        type="button"
        data-testid={`menu-bang-${bang.id}`}
        onClick={onBatMenu}
        aria-label="Tuỳ chọn bảng"
        style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', border: 0 }}
      >
        ⋯
      </button>

      {dangMoMenu && (
        <div style={{ position: 'absolute', top: 30, right: 4, background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: 8, padding: 4, zIndex: 1 }}>
          <button type="button" data-testid={`doi-ten-${bang.id}`} onClick={onBatSuaTen} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 0, background: 'none' }}>
            Đổi tên
          </button>
          <button
            type="button"
            data-testid={`xoa-${bang.id}`}
            onClick={onXoa}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 0, background: 'none', color: dangXacNhanXoa ? 'var(--c-danger, #c0392b)' : undefined }}
          >
            {dangXacNhanXoa ? 'Chắc chắn xoá?' : 'Xoá'}
          </button>
        </div>
      )}
    </div>
  )
}

export function DanhSachBang({ onMoBang }: { onMoBang: (boardId: string) => void }) {
  const [danhSach, setDanhSach] = useState<BangMeta[]>([])
  const [dangSuaTenId, setDangSuaTenId] = useState<string | null>(null)
  const [dangMoMenuId, setDangMoMenuId] = useState<string | null>(null)
  const [dangXacNhanXoaId, setDangXacNhanXoaId] = useState<string | null>(null)

  const naplai = () => {
    layDanhSachBang().then((ds) => setDanhSach([...ds].sort((a, b) => b.capNhatLuc - a.capNhatLuc)))
  }

  useEffect(() => {
    naplai()
  }, [])

  useEffect(() => {
    if (!dangXacNhanXoaId) return
    const id = setTimeout(() => setDangXacNhanXoaId(null), XAC_NHAN_XOA_MS)
    return () => clearTimeout(id)
  }, [dangXacNhanXoaId])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 10 }}>
      {danhSach.map((bang) => (
        <TheBang
          key={bang.id}
          bang={bang}
          dangSuaTen={dangSuaTenId === bang.id}
          dangMoMenu={dangMoMenuId === bang.id}
          dangXacNhanXoa={dangXacNhanXoaId === bang.id}
          onMo={() => onMoBang(bang.id)}
          onBatMenu={() => setDangMoMenuId(dangMoMenuId === bang.id ? null : bang.id)}
          onBatSuaTen={() => {
            setDangMoMenuId(null)
            setDangSuaTenId(bang.id)
          }}
          onLuuTen={(tenMoi) => {
            setDangSuaTenId(null)
            const tenSach = tenMoi.trim() || bang.ten
            doiTenBang(bang.id, tenSach).then(naplai)
          }}
          onXoa={() => {
            if (dangXacNhanXoaId !== bang.id) {
              setDangXacNhanXoaId(bang.id)
              return
            }
            setDangXacNhanXoaId(null)
            setDangMoMenuId(null)
            xoaBangMeta(bang.id).then(naplai)
          }}
        />
      ))}
      <button
        type="button"
        data-testid="tao-bang"
        onClick={() => {
          taoBang().then((meta) => {
            naplai()
            onMoBang(meta.id)
          })
        }}
        style={{
          aspectRatio: '4 / 3',
          border: '2px dashed var(--c-line, #d5cdb8)',
          borderRadius: 8,
          background: 'none',
          fontSize: 24,
          color: 'var(--c-text-muted, #b5aa8f)',
        }}
        aria-label="Tạo bảng mới"
      >
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Chạy ca kiểm, xác nhận qua**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.tsx`
Expected: PASS — 5/5 ca.

- [ ] **Step 5: Kiểm kiểu**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/board/DanhSachBang.tsx src/board/__tests__/DanhSachBang.spec.tsx
git commit -m "feat(board): DanhSachBang — lưới thẻ, tạo/đổi tên/xoá bảng"
```

---

### Task 6: `BoardGallery` — mở/đóng một bảng, ẩn-theo-tab

**Files:**
- Create: `src/board/BoardGallery.tsx`
- Test: `src/board/__tests__/BoardGallery.spec.tsx`

**Interfaces:**
- Consumes: `DanhSachBang` (Task 5), `diTruBangCuNeuCo` (Task 4), `EdgelessBoard` từ `./index`
  (vỏ lazy, Task 2 đã cập nhật prop `boardId`).
- Produces: `BoardGallery({ dangHienTab }: { dangHienTab: boolean }): JSX.Element` — Task 7 render
  component này trong `App.tsx`.

- [ ] **Step 1: Viết ca kiểm thất bại**

Tạo `src/board/__tests__/BoardGallery.spec.tsx`. Cần giả `EdgelessBoard` (Task 2's, phụ thuộc
BlockSuite thật — tốn kém, không cần thiết cho ca kiểm CẤP ĐIỀU HƯỚNG này) bằng `vi.mock`:

```typescript
// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll } from '../../lib/idb'
import { taoBang } from '../boardMeta'
import { BoardGallery } from '../BoardGallery'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Giả EdgelessBoard thật (chunk nặng, cần DOM canvas) bằng một component tối giản có thể quan sát
// được prop boardId — đủ để canh ĐÚNG hành vi điều hướng/ẩn-hiện mà file này chịu trách nhiệm,
// không lặp lại phạm vi của edgeless-board-mount.spec.ts.
vi.mock('../index', () => ({
  EdgelessBoard: ({ boardId }: { boardId: string }) =>
    createElement('div', { 'data-testid': 'bang-gia', 'data-board-id': boardId }, 'BẢNG GIẢ'),
}))

describe('BoardGallery', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    const ds = await idbGetAll<{ id: string }>(IDB_STORES.boards)
    for (const b of ds) await idbDelete(IDB_STORES.boards, b.id)
  })

  it('mặc định hiện lưới danh sách, chưa có bảng nào mount', async () => {
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
      })
    })
    expect(container.querySelector('[data-testid="bang-gia"]')).toBeNull()
  })

  it('bấm một thẻ bảng → mount EdgelessBoard với đúng boardId, lưới ẩn đi', async () => {
    const meta = await taoBang('Bảng test')
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
      })
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull()
      })
    })
    expect(container.querySelector('[data-testid="bang-gia"]')?.getAttribute('data-board-id')).toBe(meta.id)
    expect(container.querySelector('[data-testid="tao-bang"]')).toBeNull()
  })

  it('dangHienTab=false trong khi có bảng mở → EdgelessBoard VẪN mount (không unmount), chỉ ẩn', async () => {
    const meta = await taoBang('Bảng test')
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())
    })

    // Mô phỏng người dùng chuyển sang tab khác (Home) — App.tsx sẽ đổi prop này, KHÔNG unmount.
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: false }))
    })

    // Vẫn còn trong DOM (đúng kỹ thuật ẩn-không-tháo đã đo cho ResizeObserver).
    expect(container.querySelector('[data-testid="bang-gia"]')?.getAttribute('data-board-id')).toBe(meta.id)
    const boc = container.querySelector('[data-testid="boc-bang"]')
    expect(boc?.className).toContain('invisible')
  })

  it('bấm nút quay lại → EdgelessBoard unmount thật, lưới hiện lại', async () => {
    await taoBang('Bảng test')
    await act(async () => {
      root.render(createElement(BoardGallery, { dangHienTab: true }))
    })
    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull())
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="the-bang"] button') as HTMLButtonElement).click()
    })
    await act(async () => {
      await vi.waitFor(() => expect(container.querySelector('[data-testid="bang-gia"]')).not.toBeNull())
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="quay-lai"]') as HTMLButtonElement).click()
    })

    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
      })
    })
    expect(container.querySelector('[data-testid="bang-gia"]')).toBeNull()
  })
})
```

- [ ] **Step 2: Chạy ca kiểm, xác nhận thất bại**

Run: `npx vitest run src/board/__tests__/BoardGallery.spec.tsx`
Expected: FAIL — `Cannot find module '../BoardGallery'`.

- [ ] **Step 3: Viết cài đặt tối thiểu**

Tạo `src/board/BoardGallery.tsx`:

```typescript
// Điểm vào DUY NHẤT cho tab Mindmap (App.tsx import component này, không còn import EdgelessBoard
// trực tiếp). Quản lý bảng nào đang mở + kỹ thuật ẩn-không-tháo khi chuyển tab khác trong app (kế
// thừa đúng lý do ResizeObserver đã đo ở hack "mount vĩnh viễn" cũ — xem
// docs/superpowers/specs/2026-08-19-board-gallery-design.md §1) — khác hack cũ ở chỗ giờ CÓ unmount
// thật khi người dùng bấm quay lại danh sách, vì D4 đã đảm bảo không mất nội dung.
import { useEffect, useState } from 'react'

import { DanhSachBang } from './DanhSachBang'
import { diTruBangCuNeuCo } from './diTruBangCu'
import { EdgelessBoard } from './index'

export function BoardGallery({ dangHienTab }: { dangHienTab: boolean }) {
  const [openBoardId, setOpenBoardId] = useState<string | null>(null)

  useEffect(() => {
    diTruBangCuNeuCo()
  }, [])

  return (
    <>
      {!openBoardId && dangHienTab && <DanhSachBang onMoBang={setOpenBoardId} />}
      {openBoardId && (
        <div
          data-testid="boc-bang"
          className={`absolute inset-0${dangHienTab ? '' : ' invisible pointer-events-none'}`}
          inert={!dangHienTab}
        >
          <EdgelessBoard boardId={openBoardId} />
          <button
            type="button"
            data-testid="quay-lai"
            onClick={() => setOpenBoardId(null)}
            aria-label="Quay lại danh sách bảng"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 20,
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 0,
              background: 'var(--c-surface, #fff)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            ←
          </button>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Chạy ca kiểm, xác nhận qua**

Run: `npx vitest run src/board/__tests__/BoardGallery.spec.tsx`
Expected: PASS — 4/4 ca.

- [ ] **Step 5: Kiểm kiểu**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/board/BoardGallery.tsx src/board/__tests__/BoardGallery.spec.tsx
git commit -m "feat(board): BoardGallery — quản lý mở/đóng một bảng, ẩn-theo-tab thay hack cũ"
```

---

### Task 7: Nối vào `App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `BoardGallery` từ Task 6 (`./board/BoardGallery`).
- Produces: không có (task cuối, chỉ wiring).

- [ ] **Step 1: Đọc lại đúng 3 vùng cần sửa trong `App.tsx` hiện tại**

Tìm bằng nội dung (số dòng có thể lệch so với lúc viết kế hoạch này):

```bash
grep -n 'import { EdgelessBoard } from "./board"' src/App.tsx
grep -n 'daMoBangVe' src/App.tsx
grep -n 'Mindmap render thẳng bảng vẽ nhúng' src/App.tsx
```

- [ ] **Step 2: Đổi import**

```typescript
import { BoardGallery } from "./board/BoardGallery"
```

thay cho:

```typescript
import { EdgelessBoard } from "./board"
```

- [ ] **Step 3: Xoá khối `daMoBangVe` và logic liên quan**

Xoá đúng 3 dòng (tìm bằng nội dung, khu vực dòng ~11297-11305 lúc viết kế hoạch):

```typescript
  const [daMoBangVe, setDaMoBangVe] = useState(() => initialScreen() === "mindmap")
  if (screen === "mindmap" && !daMoBangVe) setDaMoBangVe(true)
```

(và comment giải thích ngay phía trên hai dòng đó — không còn đúng nữa vì `BoardGallery` không
tải chunk BlockSuite cho tới khi thật sự mở một bảng, không cần cờ "đã từng mở tab" riêng).

- [ ] **Step 4: Thay khối render `EdgelessBoard` bằng `BoardGallery`**

Tìm khối (khu vực dòng ~11740-11778 lúc viết kế hoạch, bắt đầu từ comment
`{/* Mindmap render thẳng bảng vẽ nhúng...`) tới hết khối `{daMoBangVe && (...)}`. Thay TOÀN BỘ
khối đó (gồm cả các comment giải thích hack cũ — không còn đúng nữa) bằng:

```tsx
          {/* Tab Mindmap: BoardGallery tự quản lý lưới danh sách + bảng đang mở (nếu có), gồm cả
              kỹ thuật ẩn-không-tháo khi rời tab (kế thừa từ hack cũ, lý do ResizeObserver — xem
              docs/superpowers/specs/2026-08-19-board-gallery-design.md §1) — khác hack cũ ở chỗ
              giờ unmount THẬT khi người dùng bấm quay lại danh sách bên trong BoardGallery, vì D4
              đã đảm bảo nội dung không mất. Component này rẻ để luôn mount (không tải chunk
              BlockSuite cho tới khi một bảng thật sự được mở), nên không cần cờ "đã từng vào tab"
              riêng như trước. */}
          <BoardGallery dangHienTab={screen === "mindmap"} />
```

- [ ] **Step 5: Kiểm kiểu**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Chạy toàn bộ suite**

Run: `npm test`
Expected: toàn bộ PASS — không chỉ các file mới, để xác nhận không phá vỡ ca kiểm nào khác của
`App.tsx` (dù task này không đụng logic khác, `App.tsx` là file dùng chung, đáng chạy đủ bộ).

- [ ] **Step 7: Kiểm tay nhanh trên trình duyệt (nếu có thể trong môi trường hiện tại)**

```bash
PORT=8444 npm run dev
```

Mở tab Mindmap → thấy lưới trống + thẻ "+". Bấm "+" → mở bảng mới, vẽ/gõ gì đó. Bấm quay lại →
thấy thẻ vừa tạo trong lưới (ảnh xem trước có thể trống nếu chưa vẽ gì lên canvas — chấp nhận
được, xem spec §7). Bấm lại thẻ đó → nội dung còn nguyên. Nếu môi trường không cho tương tác trình
duyệt thật (giới hạn Browser pane đã ghi trong HANDOFF), ghi rõ trong báo cáo là đã bỏ qua bước
này và vì sao — KHÔNG suy luận "chắc là đúng".

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): nối BoardGallery vào tab Mindmap, gỡ hack mount-vĩnh-viễn"
```

---

## Nợ kỹ thuật đã xác nhận — xoá bảng chỉ xoá metadata

Spec §7 để ngỏ câu hỏi "có API xoá sạch một Yjs doc hay không, đo lại lúc viết plan". Đã tra: **có
— `Workspace.removeDoc(docId)` tồn tại thật**
(`src/vendor/blocksuite/framework/store/src/test/test-workspace.ts:195-210`, dispose block
collection + xoá khỏi `meta`/`blockCollections`). NHƯNG dùng nó an toàn từ `BoardGallery.tsx`
(Task 6) đòi `import` tĩnh `@blocksuite/affine/store/test` — CÙNG modules nặng mà `EdgelessBoard`
phải giấu sau `React.lazy` (D13, ~994 kB gzip). `BoardGallery.tsx` được `App.tsx` import KHÔNG
lazy (đúng thiết kế §2.5 của spec — rẻ, luôn mount), nên import tĩnh đó sẽ kéo chunk nặng vào VỎ
APP, phá đúng ranh giới nạp chậm mà cả D13 dựng lên.

**Quyết định của kế hoạch này:** Task 5 chỉ xoá metadata (`xoaBangMeta` = `idbDelete` thuần).
Bảng bị xoá biến mất khỏi danh sách và không còn cách nào mở lại qua UI, nhưng dữ liệu Yjs/blob
thật của nó vẫn còn trong CSDL `'drtrong-board'` — rác không dọn, không phải mất dữ liệu người
dùng thấy được. Cách dọn đúng (gọi `removeDoc()` qua `import()` động, KHÔNG tĩnh, giữ nguyên ranh
giới lazy) là việc CHO CHẶNG SAU — không chặn chặng này (đúng phạm vi spec §7/§8 đã định).

## Sau khi xong cả 7 task

Cập nhật `docs/superpowers/HANDOFF.md`:
- Mục 8 ("CHẶNG KẾ TIẾP"): đánh dấu BoardGallery đã xong, tóm tắt kiến trúc (store `boards`,
  `boardId` xuyên `EdgelessBoard`, `BoardGallery` thay hack mount-vĩnh-viễn).
- Mục 7 ("CHƯA NGHIỆM THU"): ghi nhận bước kiểm tay trên trình duyệt thật (Task 7 Step 7) đã làm
  hay chưa, và nếu chưa thì đây là khoản nợ kiểm thử mới cho chủ dự án — không tự ý coi bằng ca
  kiểm giả lập là đủ (đúng bài học đã ghi nhiều lần trong HANDOFF: "cổng xanh không có nghĩa sản
  phẩm đúng").
- Đo lại đủ bảy cổng (`tsc`, `npm test`, `kiem:vendor*`, `build`, `kiem:dist`) tại điểm gộp cuối,
  không chép số cũ — chặng này không đụng `src/vendor/` nên bốn cổng vendor/dist dự kiến giữ
  nguyên, nhưng phải CHẠY THẬT để xác nhận, không giả định.
