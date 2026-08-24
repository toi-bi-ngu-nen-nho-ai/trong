# Mindmap — tìm kiếm, chuyên khoa/tag, xuất file Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm ba khả năng còn thiếu cho Mindmap so với lời hứa của `PRODUCT.md`: chuyên khoa/tag
trên mỗi bảng, tìm kiếm (trong `BoardGallery` lẫn gộp vào `SearchScreen` toàn app, gồm cả nội dung
bên trong bảng), và xuất bảng ra PNG/PDF.

**Architecture:** Mở rộng `BangMeta` (`src/board/boardMeta.ts`) thêm ba trường
(`chuyenKhoa`/`tags`/`noiDungTimKiem`). Chip lọc + sửa tag + ô tìm kiếm nội bộ vào
`src/board/DanhSachBang.tsx`. Trích văn bản chạy đúng lúc `EdgelessBoard.tsx` đã ghi ảnh xem trước
lúc unmount (tái dùng lifecycle hook có sẵn, không thêm cơ chế mới). Nút xuất PNG/PDF gọi thẳng
`ExportManager` đã vendored sẵn (đã xác nhận đăng ký qua `SurfaceViewExtension`, không cần bật thêm
extension nào). Gộp kết quả "board" vào `SearchResult`/`SearchScreen` của `src/App.tsx`, xuyên một
prop mới (`moBangYeuCau`) qua `BoardGallery` để mở đúng bảng khi bấm từ kết quả tìm kiếm.

**Tech Stack:** React 19 + TypeScript, BlockSuite vendored (`.vendor-build/`), IndexedDB
(`src/lib/idb.ts`), Vitest (happy-dom cho test có DOM, node cho test thuần).

**Spec:** `docs/superpowers/specs/2026-08-24-mindmap-tim-kiem-tag-xuat-file-design.md`

## Global Constraints

- Toàn bộ tên hàm/biến/UI/comment mới viết bằng **tiếng Việt**, đúng văn phong đang có trong
  `src/board/`.
- **TDD bắt buộc**: viết test trước, chạy thấy đỏ, rồi mới viết code làm xanh — đúng thứ tự mọi
  task dưới đây.
- **Tái dùng, không viết lại**: `normalizeSearch()` (`src/lib/ui.ts`), `SPECIALTIES`
  (`src/data/specialties.ts`), `useIdbCollection`/`idbGetAll`/`idbPut` (`src/lib/idb.ts`,
  `src/lib/useIdbCollection.ts`).
- **Ranh giới nạp chậm D13**: `src/board/boardMeta.ts` KHÔNG được import gì từ BlockSuite
  (`@blocksuite/*`) — nó phải nạp được từ `SearchScreen` trong `src/App.tsx` mà không kéo theo
  chunk 994 kB. Chỉ `src/board/EdgelessBoard.tsx` (đã nằm sau ranh giới nạp chậm) được phép import
  BlockSuite.
- **Vùng chạm tối thiểu 44×44px** cho mọi nút bấm mới (trừ chip lọc/tag — không phải hành động phá
  huỷ, giữ nhỏ gọn theo đúng mẫu chip đã có).
- Mọi control tương tác mới dùng class `mind-focus-ring` (đã định nghĩa sẵn trong `src/index.css`)
  cho vòng focus bàn phím.
- **KHÔNG sửa** `src/data/antibiotics.ts`, `src/data/categories.ts`, `src/lib/ui.ts` — đang có một
  phiên/chủ dự án khác sửa song song (xem `docs/superpowers/HANDOFF.md`, TRẠNG THÁI HÔM NAY). Chỉ
  được **import** hàm/hằng số có sẵn từ `src/lib/ui.ts` (`normalizeSearch`), không đổi nội dung file
  đó.
- Sau khi xong TOÀN BỘ plan, bảy cổng phải xanh:
  `npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build && npm run kiem:dist`.

## Sai khác có chủ đích so với spec — §2.7 "Migration bảng cũ"

Spec đề xuất một script di trú riêng (mẫu `diTruBangCu.ts`, dựng `TestWorkspace` để mở từng bảng cũ
và backfill). Lúc viết plan này, phát hiện cách đơn giản hơn đạt ĐÚNG kết quả mô tả ở spec §8 mục 1
("bảng cũ được backfill... không cần thao tác gì từ người dùng") mà không cần script riêng: Task 1
mở rộng `capNhatAnhXemTruoc()` (hook DUY NHẤT đã chạy ở MỌI lượt rời bảng) để tự backfill
`chuyenKhoa`/`tags` mặc định nếu bản ghi thiếu — bảng cũ tự "lành" ngay lần tiếp theo được mở rồi
rời. Song song, mọi nơi ĐỌC ba trường mới (Task 2/3/7/9) đều tự `?? SPECIALTIES[0].id`/`?? []`/`??
''` để hiển thị đúng NGAY CẢ VỚI bảng chưa từng được mở lại. Không dùng cách này thì phải dựng thêm
một `TestWorkspace` mở TỪNG bảng cũ chỉ để ghi ba trường JSON đơn giản — tốn công hơn cho cùng một
kết quả. Không có task riêng nào "chạy migration" trong plan này vì không còn cần thiết.

---

## Task 1: Mở rộng `BangMeta` + giá trị mặc định

**Files:**
- Modify: `src/board/boardMeta.ts`
- Modify: `src/board/DanhSachBang.tsx:390-399` (`taoBangMoi`)
- Modify: `src/board/diTruBangCu.ts:92-94` (chỉ để hợp lệ kiểu — xem Bước 5)
- Test: `src/board/__tests__/boardMeta.spec.ts`

**Interfaces:**
- Produces: `BangMeta.chuyenKhoa: string`, `BangMeta.tags: string[]`, `BangMeta.noiDungTimKiem:
  string` (cả ba BẮT BUỘC, không optional). `capNhatAnhXemTruoc(id: string, anhXemTruoc: string,
  coThayDoiNoiDung: boolean, noiDungTimKiemMoi?: string): Promise<void>` — thêm tham số thứ 4, tự
  backfill `chuyenKhoa`/`tags` mặc định nếu bản ghi cũ thiếu (đọc runtime, KHÔNG cần script di trú
  riêng — xem ghi chú trong code).

- [ ] **Step 1: Viết test đỏ cho hành vi backfill + tham số mới**

Thêm vào cuối `src/board/__tests__/boardMeta.spec.ts` (giữ nguyên phần đã có ở trên):

```ts
describe('capNhatAnhXemTruoc — backfill trường mới + noiDungTimKiemMoi', () => {
  it('bản ghi cũ THIẾU chuyenKhoa/tags/noiDungTimKiem → backfill giá trị mặc định', async () => {
    const bayGio = Date.now()
    // Mô phỏng bản ghi tạo TRƯỚC khi có ba trường mới — ép kiểu vì TS sẽ chặn thiếu trường bắt buộc.
    await idbPut(IDB_STORES.boards, {
      id: 'cu',
      ten: 'Bảng cũ',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
    } as unknown as { id: string; ten: string; taoLuc: number; capNhatLuc: number })

    await capNhatAnhXemTruoc('cu', 'data:image/jpeg;base64,x', false)

    const ds = await idbGetAll<{
      id: string
      chuyenKhoa: string
      tags: string[]
      noiDungTimKiem: string
    }>(IDB_STORES.boards)
    const sau = ds.find((b) => b.id === 'cu')
    expect(sau?.chuyenKhoa).toBe(SPECIALTIES[0].id)
    expect(sau?.tags).toEqual([])
    expect(sau?.noiDungTimKiem).toBe('')
  })

  it('truyền noiDungTimKiemMoi → ghi đè noiDungTimKiem cũ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'z',
      ten: 'Test',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: 'cũ',
    })

    await capNhatAnhXemTruoc('z', 'data:image/jpeg;base64,x', false, 'nội dung mới')

    const ds = await idbGetAll<{ id: string; noiDungTimKiem: string }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'z')?.noiDungTimKiem).toBe('nội dung mới')
  })

  it('KHÔNG truyền noiDungTimKiemMoi → giữ nguyên noiDungTimKiem cũ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'w',
      ten: 'Test',
      taoLuc: bayGio,
      capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: 'giữ nguyên',
    })

    await capNhatAnhXemTruoc('w', 'data:image/jpeg;base64,x', false)

    const ds = await idbGetAll<{ id: string; noiDungTimKiem: string }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'w')?.noiDungTimKiem).toBe('giữ nguyên')
  })
})
```

Thêm import ở đầu file: `import { SPECIALTIES } from '../../data'`.

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/board/__tests__/boardMeta.spec.ts`
Expected: FAIL — `sau?.chuyenKhoa` là `undefined` (chưa backfill), và tham số thứ 4 chưa tồn tại nên
TypeScript báo lỗi biên dịch trước khi kịp chạy (đúng, đây là tín hiệu đỏ hợp lệ cho bước tiếp theo).

- [ ] **Step 3: Mở rộng type + hàm trong `boardMeta.ts`**

Thêm import đầu file (sau dòng `import { IDB_STORES, idbGetAll, idbPut } from '../lib/idb'`):

```ts
import { SPECIALTIES } from '../data'
```

Sửa `BangMeta`:

```ts
export type BangMeta = {
  id: string
  ten: string
  taoLuc: number
  capNhatLuc: number
  anhXemTruoc?: string
  daXoaLuc?: number
  // Ba trường MỚI — bắt buộc cho bảng tạo từ nay trở đi (taoBangMoi(), DanhSachBang.tsx). Bảng cũ
  // tạo TRƯỚC lượt này thiếu cả ba ở runtime dù kiểu khai bắt buộc — capNhatAnhXemTruoc() bên dưới
  // tự backfill giá trị mặc định vào lần bảng đó được MỞ RỒI RỜI kế tiếp (không cần script di trú
  // riêng: đây vốn là hook DUY NHẤT đã chạy ở mọi lượt rời bảng, xem EdgelessBoard.tsx). Mọi nơi
  // ĐỌC ba trường này trước khi bảng đó từng được mở lại (chip lọc, tìm kiếm) phải tự
  // `?? SPECIALTIES[0].id`/`?? []`/`?? ''` — xem Task 2/3/7.
  chuyenKhoa: string
  tags: string[]
  noiDungTimKiem: string
}
```

Sửa `capNhatAnhXemTruoc`:

```ts
export function capNhatAnhXemTruoc(
  id: string,
  anhXemTruoc: string,
  coThayDoiNoiDung: boolean,
  noiDungTimKiemMoi?: string,
): Promise<void> {
  const p = (async () => {
    const ds = await idbGetAll<BangMeta>(IDB_STORES.boards)
    const hienCo = ds.find((b) => b.id === id)
    if (!hienCo) return
    await idbPut(IDB_STORES.boards, {
      ...hienCo,
      anhXemTruoc,
      capNhatLuc: coThayDoiNoiDung ? Date.now() : hienCo.capNhatLuc,
      chuyenKhoa: hienCo.chuyenKhoa ?? SPECIALTIES[0].id,
      tags: hienCo.tags ?? [],
      noiDungTimKiem: noiDungTimKiemMoi ?? hienCo.noiDungTimKiem ?? '',
    })
  })()
  ghiAnhDangCho = p
  return p
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/board/__tests__/boardMeta.spec.ts`
Expected: PASS — cả ba ca mới lẫn ca cũ trong file đều xanh.

- [ ] **Step 5: Sửa hai nơi khác đang tạo `BangMeta` để hợp lệ kiểu**

`src/board/DanhSachBang.tsx` — thêm import đầu file: `import { SPECIALTIES } from '../data'`. Sửa
hàm `taoBangMoi()` (khoảng dòng 390-399):

```ts
const taoBangMoi = () => {
  const luc = Date.now()
  const meta: BangMeta = {
    id: taoIdBang(),
    ten: 'Bảng chưa đặt tên',
    taoLuc: luc,
    capNhatLuc: luc,
    chuyenKhoa: SPECIALTIES[0].id,
    tags: [],
    noiDungTimKiem: '',
  }
  add(meta)
  setDangSuaTenId(meta.id)
}
```

`src/board/diTruBangCu.ts` (dòng ~92-94) — thêm ba trường mặc định vào `meta`:

```ts
const meta: BangMeta = {
  id: 'board',
  ten: 'Bảng đầu tiên',
  taoLuc: bayGio,
  capNhatLuc: bayGio,
  chuyenKhoa: SPECIALTIES[0].id,
  tags: [],
  noiDungTimKiem: '',
}
```

Thêm import `SPECIALTIES` từ `'../data'` vào đầu `diTruBangCu.ts`.

- [ ] **Step 6: Chạy toàn bộ test liên quan, xác nhận không hồi quy**

Run: `npx vitest run src/board/__tests__/boardMeta.spec.ts src/board/__tests__/diTruBangCu.spec.ts src/board/__tests__/DanhSachBang.spec.ts`
Expected: PASS toàn bộ. Nếu `DanhSachBang.spec.ts` có ca kiểm so khớp TOÀN BỘ object `BangMeta` qua
`toEqual`/`toMatchObject` sau khi bấm "+" (tạo bảng), thêm ba trường mới vào object kỳ vọng của ca
đó cho khớp — không đổi ý nghĩa ca kiểm, chỉ cập nhật theo hình dạng dữ liệu mới.

- [ ] **Step 7: Commit**

```bash
git add src/board/boardMeta.ts src/board/DanhSachBang.tsx src/board/diTruBangCu.ts src/board/__tests__/boardMeta.spec.ts
git commit -m "feat(mindmap): thêm chuyenKhoa/tags/noiDungTimKiem vào BangMeta, tự backfill lúc rời bảng"
```

---

## Task 2: Chip lọc theo chuyên khoa trong `DanhSachBang`

**Files:**
- Modify: `src/board/DanhSachBang.tsx`
- Test: `src/board/__tests__/DanhSachBang.spec.ts`

**Interfaces:**
- Consumes: `BangMeta.chuyenKhoa` (Task 1), `SPECIALTIES: Specialty[]` (`src/data`, đã có sẵn
  `{id, name, color}`).
- Produces: không có API mới cho task khác — thay đổi thuần UI/state nội bộ `DanhSachBang`.

- [ ] **Step 1: Viết test đỏ**

Thêm vào `src/board/__tests__/DanhSachBang.spec.ts` (theo mẫu `choDenKhi`/`container`/`root` đã có
sẵn trong file, xem phần đầu file để biết cách seed IndexedDB qua `idbPut(IDB_STORES.boards, {...})`
trước khi render):

```ts
import { SPECIALTIES } from '../../data'

describe('DanhSachBang — chip lọc chuyên khoa', () => {
  // beforeEach/afterEach container+root giống describe('DanhSachBang') đã có — đặt trong CÙNG
  // describe('DanhSachBang') hiện có, không tạo describe ngoài cùng mới, để dùng chung
  // container/root đã khai ở đó.

  it('bấm chip một chuyên khoa → chỉ còn bảng đúng chuyên khoa đó trong lưới', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'tim-mach-1', ten: 'Bảng tim mạch', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })
    await idbPut(IDB_STORES.boards, {
      id: 'ho-hap-1', ten: 'Bảng hô hấp', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'pulmonology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    const chipTimMach = container.querySelector('[data-testid="chip-chuyen-khoa-cardiology"]') as HTMLButtonElement
    await act(async () => {
      chipTimMach.click()
    })

    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.textContent).toContain('Bảng tim mạch')
    expect(container.textContent).not.toContain('Bảng hô hấp')
  })

  it('bảng THIẾU chuyenKhoa (bản ghi cũ chưa backfill) → coi như chuyên khoa đầu tiên trong SPECIALTIES', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'cu-1', ten: 'Bảng cũ chưa gắn khoa', taoLuc: bayGio, capNhatLuc: bayGio,
    } as unknown as { id: string; ten: string; taoLuc: number; capNhatLuc: number })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })

    const chipDauTien = container.querySelector(
      `[data-testid="chip-chuyen-khoa-${SPECIALTIES[0].id}"]`,
    ) as HTMLButtonElement
    await act(async () => {
      chipDauTien.click()
    })

    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "chip lọc chuyên khoa"`
Expected: FAIL — không tìm thấy phần tử `[data-testid="chip-chuyen-khoa-cardiology"]` (chưa tồn
tại).

- [ ] **Step 3: Thêm state + dải chip + áp dụng bộ lọc**

Thêm import đầu `DanhSachBang.tsx`: `import { SPECIALTIES } from '../data'`.

Trong `DanhSachBang()`, sau dòng khai `const [hienDaXoaGanDay, setHienDaXoaGanDay] = useState(false)`:

```ts
// null = "Tất cả" (không lọc). Không đưa vào URL/localStorage — lọc chỉ có ý nghĩa trong phiên
// đang xem lưới, giống các bộ lọc tạm thời khác của app (SearchScreen.activeFilter).
const [chuyenKhoaLoc, setChuyenKhoaLoc] = useState<string | null>(null)
```

Sửa dòng tính `danhSachSapXep` (thêm một `.filter` sau `.filter((b) => !b.daXoaLuc)`):

```ts
const danhSachSapXep = [...danhSach]
  .filter((b) => !b.daXoaLuc)
  .filter((b) => !chuyenKhoaLoc || (b.chuyenKhoa ?? SPECIALTIES[0].id) === chuyenKhoaLoc)
  .sort((a, b) => b.capNhatLuc - a.capNhatLuc)
```

Thêm dải chip trong JSX, ngay sau khối `{daXoaGanDay.length > 0 && (...)}`  và TRƯỚC
`{danhSachSapXep.length === 0 ? (`:

```tsx
{danhSach.filter((b) => !b.daXoaLuc).length > 0 && (
  <div
    role="tablist"
    aria-label="Lọc theo chuyên khoa"
    style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 8px' }}
  >
    <button
      type="button"
      data-testid="chip-chuyen-khoa-tat-ca"
      onClick={() => setChuyenKhoaLoc(null)}
      aria-pressed={chuyenKhoaLoc === null}
      className="mind-focus-ring"
      style={{
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 600,
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid var(--c-line, #d9ddf4)',
        background: chuyenKhoaLoc === null ? 'var(--c-primary, #2d3a94)' : 'none',
        color: chuyenKhoaLoc === null ? '#fff' : 'var(--c-text-muted, #6b6e96)',
      }}
    >
      Tất cả
    </button>
    {SPECIALTIES.map((kh) => (
      <button
        key={kh.id}
        type="button"
        data-testid={`chip-chuyen-khoa-${kh.id}`}
        onClick={() => setChuyenKhoaLoc(kh.id)}
        aria-pressed={chuyenKhoaLoc === kh.id}
        className="mind-focus-ring"
        style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 600,
          padding: '6px 12px',
          borderRadius: 999,
          border: '1px solid var(--c-line, #d9ddf4)',
          background: chuyenKhoaLoc === kh.id ? kh.color : 'none',
          color: chuyenKhoaLoc === kh.id ? '#fff' : 'var(--c-text-muted, #6b6e96)',
        }}
      >
        {kh.name}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts`
Expected: PASS toàn bộ file (ca mới lẫn ca cũ).

- [ ] **Step 5: Commit**

```bash
git add src/board/DanhSachBang.tsx src/board/__tests__/DanhSachBang.spec.ts
git commit -m "feat(mindmap): dải chip lọc bảng theo chuyên khoa trong BoardGallery"
```

---

## Task 3: Sửa chuyên khoa + tag qua menu "⋯" của thẻ

**Files:**
- Modify: `src/board/DanhSachBang.tsx`
- Test: `src/board/__tests__/DanhSachBang.spec.ts`

**Interfaces:**
- Consumes: `SPECIALTIES` (đã import ở Task 2), `update()` từ `useIdbCollection` (đã có sẵn trong
  `DanhSachBang()`).
- Produces: không có API mới cho task khác.

- [ ] **Step 1: Viết test đỏ**

```ts
describe('DanhSachBang — sửa chuyên khoa/tag', () => {
  it('mở menu "⋯" → bấm "Chuyên khoa/tag" → đổi select → ghi ngay vào IndexedDB', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'b1', ten: 'Bảng A', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="menu-bang-b1"]')).not.toBeNull()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-b1"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-b1"]') as HTMLButtonElement).click()
    })

    const chon = container.querySelector('[data-testid="chon-chuyen-khoa-b1"]') as HTMLSelectElement
    expect(chon.value).toBe('cardiology')

    await act(async () => {
      chon.value = 'pulmonology'
      chon.dispatchEvent(new Event('change', { bubbles: true }))
    })

    const ds = await idbGetAll<{ id: string; chuyenKhoa: string }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'b1')?.chuyenKhoa).toBe('pulmonology')
  })

  it('nhập tag rồi Enter → thêm vào danh sách tag, ghi IndexedDB; bấm × → xoá tag', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'b2', ten: 'Bảng B', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: SPECIALTIES[0].id, tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="menu-bang-b2"]')).not.toBeNull()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-b2"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-b2"]') as HTMLButtonElement).click()
    })

    const oNhap = container.querySelector('[data-testid="nhap-tag-b2"]') as HTMLInputElement
    await act(async () => {
      oNhap.value = 'suy tim'
      oNhap.dispatchEvent(new Event('input', { bubbles: true }))
      oNhap.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    await choDenKhi(() => {
      expect(container.querySelector('[aria-label="Xoá tag suy tim"]')).not.toBeNull()
    })
    let ds = await idbGetAll<{ id: string; tags: string[] }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'b2')?.tags).toEqual(['suy tim'])

    const nutXoa = container.querySelector('[aria-label="Xoá tag suy tim"]') as HTMLButtonElement
    await act(async () => {
      nutXoa.click()
    })
    await choDenKhi(() => {
      expect(container.querySelector('[aria-label="Xoá tag suy tim"]')).toBeNull()
    })
    ds = await idbGetAll<{ id: string; tags: string[] }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'b2')?.tags).toEqual([])
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "sửa chuyên khoa/tag"`
Expected: FAIL — không tìm thấy `[data-testid="sua-tag-b1"]`.

- [ ] **Step 3: Thêm UI + handler trong `TheBang` và `DanhSachBang`**

Trong `DanhSachBang()`, thêm state mới cạnh `dangMoMenuId`:

```ts
const [dangSuaTagId, setDangSuaTagId] = useState<string | null>(null)
```

Trong JSX map `danhSachSapXep.map((bang, index) => (<TheBang ... />))`, thêm props mới vào
`<TheBang>`:

```tsx
dangSuaTag={dangSuaTagId === bang.id}
onBatSuaTag={() => {
  setDangMoMenuId(null)
  setDangSuaTagId(dangSuaTagId === bang.id ? null : bang.id)
}}
onDoiChuyenKhoa={(id) => update({ ...bang, chuyenKhoa: id })}
onThemTag={(tag) => {
  const hienCo = bang.tags ?? []
  if (hienCo.includes(tag)) return
  update({ ...bang, tags: [...hienCo, tag] })
}}
onXoaTag={(tag) => update({ ...bang, tags: (bang.tags ?? []).filter((t) => t !== tag) })}
```

Trong `TheBang(...)`, mở rộng chữ ký props:

```ts
function TheBang({
  bang,
  index,
  dangXoa,
  dangSuaTen,
  dangMoMenu,
  dangXacNhanXoa,
  dangSuaTag,
  onMo,
  onBatMenu,
  onBatSuaTen,
  onLuuTen,
  onXoa,
  onBatSuaTag,
  onDoiChuyenKhoa,
  onThemTag,
  onXoaTag,
}: {
  bang: BangMeta
  index: number
  dangXoa: boolean
  dangSuaTen: boolean
  dangMoMenu: boolean
  dangXacNhanXoa: boolean
  dangSuaTag: boolean
  onMo: () => void
  onBatMenu: () => void
  onBatSuaTen: () => void
  onLuuTen: (tenMoi: string) => void
  onXoa: () => void
  onBatSuaTag: () => void
  onDoiChuyenKhoa: (id: string) => void
  onThemTag: (tag: string) => void
  onXoaTag: (tag: string) => void
}) {
```

Thêm state cục bộ trong `TheBang` (cạnh `const [tenNhap, setTenNhap] = useState(bang.ten)`):

```ts
const [tagNhap, setTagNhap] = useState('')
```

Thêm mục menu mới vào khối `{dangMoMenu && (...)}`, TRƯỚC nút "Đổi tên":

```tsx
<button
  type="button"
  data-testid={`sua-tag-${bang.id}`}
  onClick={onBatSuaTag}
  className="mind-focus-ring"
  style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 44, textAlign: 'left', padding: '0 10px', border: 0, background: 'none' }}
>
  Chuyên khoa/tag
</button>
```

Thêm panel sửa, ngay sau khối `{dangMoMenu && (...)}` đóng (cùng cấp, trong cùng `<div>` bọc thẻ):

```tsx
{dangSuaTag && (
  <div
    data-testid={`sua-chuyen-khoa-tag-${bang.id}`}
    style={{ position: 'absolute', top: 30, right: 4, background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: 8, padding: 8, zIndex: 1, width: 200 }}
  >
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)', marginBottom: 2 }}>
      Chuyên khoa
    </label>
    <select
      data-testid={`chon-chuyen-khoa-${bang.id}`}
      value={bang.chuyenKhoa ?? SPECIALTIES[0].id}
      onChange={(e) => onDoiChuyenKhoa(e.target.value)}
      className="mind-focus-ring"
      style={{ width: '100%', fontSize: 12.5, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--c-line, #d9ddf4)', marginBottom: 8 }}
    >
      {SPECIALTIES.map((kh) => (
        <option key={kh.id} value={kh.id}>{kh.name}</option>
      ))}
    </select>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)', marginBottom: 2 }}>
      Tag
    </label>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
      {(bang.tags ?? []).map((t) => (
        <span
          key={t}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '2px 6px', borderRadius: 999, background: 'var(--c-surface-alt, #f6f7fd)' }}
        >
          {t}
          <button
            type="button"
            aria-label={`Xoá tag ${t}`}
            onClick={() => onXoaTag(t)}
            className="mind-focus-ring"
            style={{ border: 0, background: 'none', padding: 0, fontSize: 11, lineHeight: 1, color: 'var(--c-text-muted, #6b6e96)' }}
          >
            ×
          </button>
        </span>
      ))}
    </div>
    <input
      type="text"
      data-testid={`nhap-tag-${bang.id}`}
      value={tagNhap}
      onChange={(e) => setTagNhap(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return
        const tagSach = tagNhap.trim()
        if (tagSach) onThemTag(tagSach)
        setTagNhap('')
      }}
      placeholder="Thêm tag, Enter để lưu"
      className="mind-focus-ring"
      style={{ width: '100%', fontSize: 12.5, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--c-line, #d9ddf4)' }}
    />
  </div>
)}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts`
Expected: PASS toàn bộ file.

- [ ] **Step 5: Commit**

```bash
git add src/board/DanhSachBang.tsx src/board/__tests__/DanhSachBang.spec.ts
git commit -m "feat(mindmap): sửa chuyên khoa và tag qua menu tuỳ chọn của thẻ bảng"
```

---

## Task 4: Nút "Xuất" PNG/PDF trong `EdgelessBoard`

**Files:**
- Modify: `src/board/EdgelessBoard.tsx`
- Test: `src/board/__tests__/edgeless-board-mount.spec.ts` (thêm ca mới, KHÔNG tạo file riêng — cùng
  hạ tầng cầu nối React↔Lit đã có sẵn ở đó)

**Interfaces:**
- Consumes: `ExportManager` (`@blocksuite/affine/blocks/surface`, đã xác nhận export công khai qua
  `export * from './extensions'` trong `blocks/surface/src/index.ts`, đăng ký sẵn qua
  `SurfaceViewExtension` — KHÔNG cần thêm dòng nào vào `src/board/extensions.ts`), `Text`
  (`@blocksuite/store`, đã dùng ở `edgeless-board.spec.ts`).
- Produces: không có API mới cho task khác — thay đổi thuần trong `EdgelessBoard.tsx`.

- [ ] **Step 1: Viết test đỏ**

Thêm vào cuối `src/board/__tests__/edgeless-board-mount.spec.ts` (bên trong `describe('EdgelessBoard
— cầu nối React↔Lit', ...)` đã có, dùng chung `container`/`root`/`taoCtxGia` đã khai ở đầu file):

```ts
import { ExportManager } from '@blocksuite/affine/blocks/surface'

// ... (giữ nguyên các it() đã có, thêm hai ca mới vào cuối describe)

it('bấm nút "Xuất PNG" gọi ExportManager.exportPng() đúng một lần', async () => {
  const goiExport = vi.spyOn(ExportManager.prototype, 'exportPng').mockResolvedValue(undefined)
  try {
    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'board' }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="xuat-png"]')).not.toBeNull()
      })
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="xuat-png"]') as HTMLButtonElement).click()
    })

    await vi.waitFor(() => {
      expect(goiExport).toHaveBeenCalledTimes(1)
    })
  } finally {
    goiExport.mockRestore()
  }
})

it('bấm nút "Xuất PDF" gọi ExportManager.exportPdf() đúng một lần', async () => {
  const goiExport = vi.spyOn(ExportManager.prototype, 'exportPdf').mockResolvedValue(undefined)
  try {
    await act(async () => {
      root.render(createElement(EdgelessBoard, { boardId: 'board' }))
    })
    await act(async () => {
      await vi.waitFor(() => {
        expect(container.querySelector('[data-testid="xuat-pdf"]')).not.toBeNull()
      })
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="xuat-pdf"]') as HTMLButtonElement).click()
    })

    await vi.waitFor(() => {
      expect(goiExport).toHaveBeenCalledTimes(1)
    })
  } finally {
    goiExport.mockRestore()
  }
})
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/board/__tests__/edgeless-board-mount.spec.ts -t "Xuất"`
Expected: FAIL — không tìm thấy `[data-testid="xuat-png"]` (nút chưa tồn tại).

- [ ] **Step 3: Thêm nút + hàm xuất trong `EdgelessBoard.tsx`**

Thêm import đầu file (cạnh các import `@blocksuite/affine/...` đã có):

```ts
import { ExportManager } from '@blocksuite/affine/blocks/surface'
import { Text } from '@blocksuite/store'
import { IDB_STORES, idbGetAll } from '../lib/idb'
import type { BangMeta } from './boardMeta'
```

Trong `EdgelessBoard()`, thêm state mới cạnh `const [khongLuuDuoc, setKhongLuuDuoc] = useState(false)`:

```ts
// Giữ cả `store`/`std` sống sau khi mount xong — cần cho nút "Xuất" (Task 4) gọi ExportManager,
// thứ chỉ component này có tay cầm tới (BoardGallery.tsx chỉ biết boardId). null trong lúc đang mở
// bảng hoặc lúc lỗi — nút xuất chỉ hiện khi bảng đã mở xong.
const [boSuong, setBoSuong] = useState<{
  store: Awaited<ReturnType<typeof taoHoacMoBang>>['store']
  std: BlockStdScope
} | null>(null)
```

Trong effect mount, sửa `.then((...)` để lưu cả object gốc (không chỉ destructure), rồi gọi
`setBoSuong` ngay sau dòng `setDangMo(false)`:

```ts
taoHoacMoBang(boardId)
  .then((ketQua) => {
    const { workspace, store, khongLuuDuoc: khongLuuDuocKetQua } = ketQua
    if (huyBo) {
      workspace.forceStop()
      return
    }
    workspaceHienTai = workspace
    const std = new BlockStdScope({ store, extensions: viewManager.get('edgeless') })
    litRender(std.render(), el)
    setKhongLuuDuoc(khongLuuDuocKetQua)
    setDangMo(false)
    setBoSuong({ store, std })

    // ... (giữ nguyên phần đăng ký dkBlock/surfaceModel/dkThem/dkSua/dkXoa đã có bên dưới)
```

Thêm hàm xuất — module-level, dưới `doiCoHanGio` (trước `taoHoacMoBang`), KHÔNG bên trong component
(không phụ thuộc state/props ngoài tham số):

```ts
async function xuatBang(
  std: BlockStdScope,
  store: Awaited<ReturnType<typeof taoHoacMoBang>>['store'],
  boardId: string,
  dinhDang: 'png' | 'pdf',
) {
  try {
    const ds = await idbGetAll<BangMeta>(IDB_STORES.boards)
    const bang = ds.find((b) => b.id === boardId)
    if (store.root) {
      store.root.props.title = new Text(bang?.ten ?? 'Bảng chưa đặt tên')
    }
    const exportManager = std.get(ExportManager)
    if (dinhDang === 'png') await exportManager.exportPng()
    else await exportManager.exportPdf()
  } catch (loi) {
    console.error('xuatBang: xuất bảng thất bại:', loi)
  }
}
```

Thêm nút vào JSX trả về của `EdgelessBoard()`, ngay sau khối `{loi && (...)}`, TRƯỚC
`{dangMo && !loi && (...)}`:

```tsx
{boSuong && (
  <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 20, display: 'flex', gap: 6 }}>
    <button
      type="button"
      data-testid="xuat-png"
      aria-label="Xuất bảng thành PNG"
      onClick={() => xuatBang(boSuong.std, boSuong.store, boardId, 'png')}
      className="mind-focus-ring"
      style={{ width: 40, height: 40, borderRadius: '50%', border: 0, background: 'var(--c-surface, #fff)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', fontSize: 10, fontWeight: 700 }}
    >
      PNG
    </button>
    <button
      type="button"
      data-testid="xuat-pdf"
      aria-label="Xuất bảng thành PDF"
      onClick={() => xuatBang(boSuong.std, boSuong.store, boardId, 'pdf')}
      className="mind-focus-ring"
      style={{ width: 40, height: 40, borderRadius: '50%', border: 0, background: 'var(--c-surface, #fff)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', fontSize: 10, fontWeight: 700 }}
    >
      PDF
    </button>
  </div>
)}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/board/__tests__/edgeless-board-mount.spec.ts`
Expected: PASS toàn bộ file (ca mới lẫn ca cũ).

- [ ] **Step 5: Kiểm tay Browser pane thật (canvas/PDF thật không giả lập được trong happy-dom)**

Mở `PORT=8444 npm run dev`, vào tab Mindmap, mở một bảng có ít nhất một ghi chú có chữ, bấm "PNG" —
xác nhận trình duyệt tải file `.png` đúng tên bảng, mở ra thấy đúng nội dung. Lặp lại với "PDF".

- [ ] **Step 6: Commit**

```bash
git add src/board/EdgelessBoard.tsx src/board/__tests__/edgeless-board-mount.spec.ts
git commit -m "feat(mindmap): nút xuất PNG/PDF gọi ExportManager vendored sẵn"
```

---

## Task 5: Hàm trích văn bản thuần (không phụ thuộc BlockSuite)

**Files:**
- Modify: `src/board/boardMeta.ts`
- Test: `src/board/__tests__/boardMeta.spec.ts`

**Interfaces:**
- Produces: `trichVanBanTuKhoi(goc: KhoiCoTheCoChu, doSauToiDa?: number): string`,
  `trichVanBanTuCanvas(danhSachPhanTu: Array<{ text?: unknown }>): string`,
  `ghepNoiDungTimKiem(vanBanKhoi: string, vanBanCanvas: string): string` — cả ba dùng ở Task 6.
  `KhoiCoTheCoChu` là type cấu trúc (`{ props?: Record<string, unknown>; children?:
  KhoiCoTheCoChu[] }`), KHÔNG import từ BlockSuite — giữ đúng ranh giới D13 (Global Constraints).

- [ ] **Step 1: Viết test đỏ**

Thêm vào `src/board/__tests__/boardMeta.spec.ts`:

```ts
import { ghepNoiDungTimKiem, trichVanBanTuCanvas, trichVanBanTuKhoi } from '../boardMeta'

describe('trichVanBanTuKhoi', () => {
  it('gộp text của mọi khối con có props.text, đệ quy nhiều cấp, cách nhau bằng dấu cách', () => {
    const goc = {
      children: [
        { props: { text: 'Đoạn 1' }, children: [] },
        { children: [{ props: { text: 'Đoạn con' }, children: [] }] },
        { props: {}, children: [] },
      ],
    }
    expect(trichVanBanTuKhoi(goc)).toBe('Đoạn 1 Đoạn con')
  })

  it('khối gốc và mọi con đều không có props.text → chuỗi rỗng', () => {
    expect(trichVanBanTuKhoi({ children: [{ props: {}, children: [] }] })).toBe('')
  })

  it('props.text không phải Y.Text/có toString (vd số) → bỏ qua, không ném lỗi', () => {
    expect(trichVanBanTuKhoi({ props: { text: 42 } })).toBe('42')
    expect(trichVanBanTuKhoi({ props: { text: null } })).toBe('')
  })
})

describe('trichVanBanTuCanvas', () => {
  it('gộp .text của mọi phần tử canvas có chữ, bỏ qua phần tử không có', () => {
    const els = [{ text: { toString: () => 'Nhãn connector' } }, {}, { text: { toString: () => 'Node mindmap' } }]
    expect(trichVanBanTuCanvas(els)).toBe('Nhãn connector Node mindmap')
  })
})

describe('ghepNoiDungTimKiem', () => {
  it('nối hai đoạn bằng dấu cách, cắt bớt nếu vượt 5000 ký tự', () => {
    expect(ghepNoiDungTimKiem('a', 'b')).toBe('a b')
    const dai = 'x'.repeat(6000)
    expect(ghepNoiDungTimKiem(dai, '').length).toBe(5000)
  })

  it('cả hai rỗng → chuỗi rỗng', () => {
    expect(ghepNoiDungTimKiem('', '')).toBe('')
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/board/__tests__/boardMeta.spec.ts -t "trichVanBan"`
Expected: FAIL — các hàm chưa tồn tại (lỗi import).

- [ ] **Step 3: Viết hàm trong `boardMeta.ts`**

Thêm vào cuối `src/board/boardMeta.ts`:

```ts
// Cấu trúc TỐI THIỂU cần để duyệt cây khối tìm chữ — KHÔNG import type thật từ BlockSuite
// (BlockModel) để giữ file này ngoài ranh giới nạp chậm D13 (xem Global Constraints của plan).
// Bất kỳ object nào có hình dạng này (kể cả `store.root` thật của BlockSuite) đều dùng được.
type KhoiCoTheCoChu = {
  props?: Record<string, unknown>
  children?: KhoiCoTheCoChu[]
}

function layChu(vanBan: unknown): string {
  if (vanBan && typeof (vanBan as { toString: () => string }).toString === 'function') {
    return String(vanBan).trim()
  }
  return ''
}

// Duyệt đệ quy `store.root` (note/paragraph/list...) gom mọi `props.text` thành một chuỗi — dùng
// để tìm kiếm, KHÔNG dùng để hiển thị (không giữ định dạng/thứ tự chính xác). Giới hạn độ sâu
// (mặc định 12) để tránh vòng lặp vô hạn nếu dữ liệu hỏng có cây tự tham chiếu.
export function trichVanBanTuKhoi(goc: KhoiCoTheCoChu, doSauToiDa = 12): string {
  const doanVan: string[] = []
  const duyet = (khoi: KhoiCoTheCoChu, doSau: number) => {
    if (doSau > doSauToiDa) return
    const chu = layChu(khoi.props?.text)
    if (chu) doanVan.push(chu)
    khoi.children?.forEach((con) => duyet(con, doSau + 1))
  }
  duyet(goc, 0)
  return doanVan.join(' ')
}

// Phần tử canvas (surface.elementModels — shape/connector/text/mindmap node) mang chữ trực tiếp
// trên field `.text` (Y.Text), KHÔNG lồng trong `.props` như khối — đã xác nhận qua
// element-model/{text,shape,connector}.ts của cây vendored, cả ba đều `text?: Y.Text`.
export function trichVanBanTuCanvas(danhSachPhanTu: Array<{ text?: unknown }>): string {
  return danhSachPhanTu
    .map((el) => layChu(el.text))
    .filter(Boolean)
    .join(' ')
}

const DO_DAI_TOI_DA_NOI_DUNG_TIM_KIEM = 5000

// Cắt bớt để tránh BangMeta phình quá to với bảng nhiều chữ — 5000 ký tự đủ cho tìm kiếm con
// chuỗi, không cần giữ nguyên vẹn toàn bộ nội dung (đó là việc của chính bảng, không phải snapshot
// tìm kiếm này).
export function ghepNoiDungTimKiem(vanBanKhoi: string, vanBanCanvas: string): string {
  return `${vanBanKhoi} ${vanBanCanvas}`.trim().slice(0, DO_DAI_TOI_DA_NOI_DUNG_TIM_KIEM)
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/board/__tests__/boardMeta.spec.ts`
Expected: PASS toàn bộ file.

- [ ] **Step 5: Commit**

```bash
git add src/board/boardMeta.ts src/board/__tests__/boardMeta.spec.ts
git commit -m "feat(mindmap): hàm trích văn bản thuần từ khối/phần tử canvas cho tìm kiếm nội dung"
```

---

## Task 6: Nối trích văn bản vào lifecycle unmount của `EdgelessBoard`

**Files:**
- Modify: `src/board/EdgelessBoard.tsx`
- Test: `src/board/__tests__/edgeless-board-mount.spec.ts`

**Interfaces:**
- Consumes: `trichVanBanTuKhoi`, `trichVanBanTuCanvas`, `ghepNoiDungTimKiem` (Task 5),
  `capNhatAnhXemTruoc(id, anhXemTruoc, coThayDoiNoiDung, noiDungTimKiemMoi?)` (Task 1).
- Produces: không có API mới cho task khác — chỉ đổi hành vi runtime (ghi `noiDungTimKiem` thật).

- [ ] **Step 1: Viết test đỏ**

Thêm vào `src/board/__tests__/edgeless-board-mount.spec.ts`:

```ts
import { Text } from '@blocksuite/store'
import { IDB_STORES, idbGetAll, idbPut } from '../../lib/idb'

it('rời bảng có ghi chú thật → noiDungTimKiem trong BangMeta chứa đúng chữ đó', async () => {
  await act(async () => {
    root.render(createElement(EdgelessBoard, { boardId: 'board' }))
  })
  await act(async () => {
    await vi.waitFor(() => {
      expect(document.querySelector('drt-edgeless-root')).not.toBeNull()
    })
  })

  // Seed một BangMeta tối thiểu cho id 'board' — capNhatAnhXemTruoc() chỉ ghi nếu bản ghi ĐÃ tồn
  // tại (xem boardMeta.ts, `if (!hienCo) return`).
  const bayGio = Date.now()
  await idbPut(IDB_STORES.boards, {
    id: 'board', ten: 'Bảng test', taoLuc: bayGio, capNhatLuc: bayGio,
    chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
  })

  // Thêm một note+paragraph có chữ thật vào store đang mở qua chính custom element mà Lit đã gắn.
  const hostEl = document.querySelector('drt-edgeless-root') as unknown as {
    store: { addBlock: (f: string, p?: object, parent?: string) => string; root: { id: string } }
  }
  await act(async () => {
    const noteId = hostEl.store.addBlock('affine:note', {}, hostEl.store.root.id)
    hostEl.store.addBlock('affine:paragraph', { text: new Text('Ghi chú suy tim EF giảm') }, noteId)
  })

  await act(async () => {
    root.unmount()
  })
  container.remove()

  await vi.waitFor(async () => {
    const ds = await idbGetAll<{ id: string; noiDungTimKiem: string }>(IDB_STORES.boards)
    expect(ds.find((b) => b.id === 'board')?.noiDungTimKiem).toContain('Ghi chú suy tim EF giảm')
  })
})
```

Nếu `hostEl.store` không tồn tại trên custom element `drt-edgeless-root` (API nội bộ có thể mang
tên khác) — thay bằng cách chắc chắn hơn: gọi trực tiếp `taoHoacMoBang('board')` (KHÔNG truyền
`tuyChon`, nên nó dùng `fake-indexeddb` thật đã bật qua `fake-indexeddb/auto` ở đầu file) TRƯỚC khi
render component, `store.addBlock(...)` để seed nội dung, `workspace.forceStop()`, rồi mới render
`<EdgelessBoard boardId="board" />` — nó sẽ mở lại đúng doc vừa seed qua cùng `fake-indexeddb`.

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/board/__tests__/edgeless-board-mount.spec.ts -t "noiDungTimKiem"`
Expected: FAIL — `noiDungTimKiem` vẫn là `''` (chưa nối trích văn bản vào unmount).

- [ ] **Step 3: Nối vào cleanup effect của `EdgelessBoard.tsx`**

Sửa khối `return () => {...}` (cleanup effect, khoảng dòng 305-327) — thêm trích văn bản NGAY TRƯỚC
dòng gọi `capNhatAnhXemTruoc`, và truyền kết quả làm tham số thứ 4:

```ts
return () => {
  huyBo = true
  huyDangKyThayDoi.forEach((huy) => huy())
  try {
    const canvasGoc = el.querySelector('canvas')
    if (canvasGoc && canvasGoc.width > 0 && canvasGoc.height > 0) {
      const nho = document.createElement('canvas')
      nho.width = 480
      nho.height = 360
      const ctx = nho.getContext('2d')
      if (ctx) {
        ctx.drawImage(canvasGoc, 0, 0, 480, 360)
        // Trích văn bản NGAY TRƯỚC KHI workspaceHienTai.forceStop() — store vẫn còn sống tới đó.
        let noiDungTimKiemMoi: string | undefined
        try {
          const rootHienTai = workspaceHienTai?.getDoc(boardId)?.getStore({ extensions: storeManager.get('store') }).root
          if (rootHienTai) {
            const surfaceHienTai = rootHienTai.children.find(
              (khoi): khoi is SurfaceBlockModel => khoi.flavour === 'affine:surface',
            )
            noiDungTimKiemMoi = ghepNoiDungTimKiem(
              trichVanBanTuKhoi(rootHienTai),
              surfaceHienTai ? trichVanBanTuCanvas(surfaceHienTai.elementModels) : '',
            )
          }
        } catch {
          // Trích văn bản là tiện ích phụ — không được làm hỏng thao tác quay lại danh sách.
        }
        void capNhatAnhXemTruoc(boardId, nho.toDataURL('image/jpeg', 0.6), coThayDoiNoiDung, noiDungTimKiemMoi)
      }
    }
  } catch {
    // Chụp ảnh là tiện ích phụ — không được làm hỏng thao tác quay lại danh sách của người dùng.
  }
  litRender(null, el)
  workspaceHienTai?.forceStop()
}
```

Thêm import ở đầu file: gộp `ghepNoiDungTimKiem, trichVanBanTuCanvas, trichVanBanTuKhoi` vào dòng
import `capNhatAnhXemTruoc` đã có sẵn (`from './boardMeta'`), không tạo dòng import trùng.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/board/__tests__/edgeless-board-mount.spec.ts`
Expected: PASS toàn bộ file. Nếu cách seed qua `hostEl.store` ở Step 1 không hoạt động (API không
tồn tại đúng tên), chuyển sang cách seed qua `taoHoacMoBang` trực tiếp đã mô tả trong ghi chú của
Step 1 rồi chạy lại.

- [ ] **Step 5: Commit**

```bash
git add src/board/EdgelessBoard.tsx src/board/__tests__/edgeless-board-mount.spec.ts
git commit -m "feat(mindmap): trích và lưu noiDungTimKiem thật lúc rời bảng"
```

---

## Task 7: Hàm lọc tìm kiếm thuần (tên + tag + chuyên khoa + nội dung)

**Files:**
- Modify: `src/board/boardMeta.ts`
- Test: `src/board/__tests__/boardMeta.spec.ts`

**Interfaces:**
- Consumes: `normalizeSearch` (`src/lib/ui.ts`, đã có sẵn — bỏ dấu tiếng Việt).
- Produces: `bangKhopTimKiem(bang: BangMeta, truyVan: string): boolean` — dùng ở Task 8.

- [ ] **Step 1: Viết test đỏ**

Thêm vào `src/board/__tests__/boardMeta.spec.ts`:

```ts
import { bangKhopTimKiem } from '../boardMeta'

describe('bangKhopTimKiem', () => {
  const bangMau: BangMeta = {
    id: 'x', ten: 'Suy tim EF giảm', taoLuc: 0, capNhatLuc: 0,
    chuyenKhoa: 'cardiology', tags: ['nội trú', 'cấp cứu'], noiDungTimKiem: 'furosemide 40mg TM',
  }

  it('khớp theo tên, không phân biệt dấu/hoa-thường', () => {
    expect(bangKhopTimKiem(bangMau, 'suy tim')).toBe(true)
    expect(bangKhopTimKiem(bangMau, 'SUY TIM')).toBe(true)
    expect(bangKhopTimKiem(bangMau, 'suy tim khong dau')).toBe(false)
  })

  it('khớp theo tag', () => {
    expect(bangKhopTimKiem(bangMau, 'cấp cứu')).toBe(true)
    expect(bangKhopTimKiem(bangMau, 'cap cuu')).toBe(true)
  })

  it('khớp theo noiDungTimKiem', () => {
    expect(bangKhopTimKiem(bangMau, 'furosemide')).toBe(true)
  })

  it('truy vấn rỗng → luôn khớp (không lọc)', () => {
    expect(bangKhopTimKiem(bangMau, '')).toBe(true)
    expect(bangKhopTimKiem(bangMau, '   ')).toBe(true)
  })

  it('không khớp bất kỳ trường nào → false', () => {
    expect(bangKhopTimKiem(bangMau, 'tiêu hoá')).toBe(false)
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/board/__tests__/boardMeta.spec.ts -t "bangKhopTimKiem"`
Expected: FAIL — hàm chưa tồn tại.

- [ ] **Step 3: Viết hàm**

Thêm import đầu `boardMeta.ts`: `import { normalizeSearch } from '../lib/ui'`. Thêm hàm vào cuối
file:

```ts
export function bangKhopTimKiem(bang: BangMeta, truyVan: string): boolean {
  const q = normalizeSearch(truyVan)
  if (!q) return true
  const doanKhop = [bang.ten, bang.chuyenKhoa, ...(bang.tags ?? []), bang.noiDungTimKiem ?? '']
    .map(normalizeSearch)
    .join(' ')
  return doanKhop.includes(q)
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/board/__tests__/boardMeta.spec.ts`
Expected: PASS toàn bộ file.

- [ ] **Step 5: Commit**

```bash
git add src/board/boardMeta.ts src/board/__tests__/boardMeta.spec.ts
git commit -m "feat(mindmap): hàm lọc tìm kiếm bảng theo tên/tag/chuyên khoa/nội dung"
```

---

## Task 8: Ô tìm kiếm nội bộ trong `DanhSachBang`

**Files:**
- Modify: `src/board/DanhSachBang.tsx`
- Test: `src/board/__tests__/DanhSachBang.spec.ts`

**Interfaces:**
- Consumes: `bangKhopTimKiem` (Task 7).
- Produces: không có API mới cho task khác.

- [ ] **Step 1: Viết test đỏ**

```ts
describe('DanhSachBang — ô tìm kiếm nội bộ', () => {
  it('gõ tên bảng → chỉ còn bảng khớp trong lưới', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'a', ten: 'Suy tim EF giảm', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })
    await idbPut(IDB_STORES.boards, {
      id: 'b', ten: 'Hen phế quản', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'pulmonology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(2)
    })

    const oTim = container.querySelector('[data-testid="tim-kiem-bang"]') as HTMLInputElement
    await act(async () => {
      oTim.value = 'suy tim'
      oTim.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await choDenKhi(() => {
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(1)
    })
    expect(container.textContent).toContain('Suy tim EF giảm')
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts -t "ô tìm kiếm nội bộ"`
Expected: FAIL — không tìm thấy `[data-testid="tim-kiem-bang"]`.

- [ ] **Step 3: Thêm ô tìm kiếm + áp dụng bộ lọc**

Sửa dòng import `boardMeta` đã có ở đầu `DanhSachBang.tsx` để gộp thêm `bangKhopTimKiem`:

```ts
import { bangKhopTimKiem, type BangMeta, taoIdBang } from './boardMeta'
```

Thêm state cạnh `chuyenKhoaLoc` (Task 2):

```ts
const [truyVan, setTruyVan] = useState('')
```

Sửa `danhSachSapXep` (thêm filter thứ ba):

```ts
const danhSachSapXep = [...danhSach]
  .filter((b) => !b.daXoaLuc)
  .filter((b) => !chuyenKhoaLoc || (b.chuyenKhoa ?? SPECIALTIES[0].id) === chuyenKhoaLoc)
  .filter((b) => bangKhopTimKiem(b, truyVan))
  .sort((a, b) => b.capNhatLuc - a.capNhatLuc)
```

Thêm ô tìm kiếm trong JSX, TRƯỚC dải chip chuyên khoa (Task 2) — chỉ hiện khi có ít nhất một bảng
(cùng điều kiện với dải chip):

```tsx
{danhSach.filter((b) => !b.daXoaLuc).length > 0 && (
  <div style={{ padding: '12px 16px 8px' }}>
    <input
      type="search"
      data-testid="tim-kiem-bang"
      value={truyVan}
      onChange={(e) => setTruyVan(e.target.value)}
      placeholder="Tìm bảng theo tên, tag, nội dung..."
      aria-label="Tìm kiếm bảng"
      className="mind-focus-ring mind-search-pill"
      style={{ width: '100%', padding: '8px 12px', borderRadius: 12, border: '1px solid var(--c-line, #d9ddf4)', fontSize: 13, background: 'var(--c-surface, #fff)' }}
    />
  </div>
)}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/board/__tests__/DanhSachBang.spec.ts`
Expected: PASS toàn bộ file.

- [ ] **Step 5: Commit**

```bash
git add src/board/DanhSachBang.tsx src/board/__tests__/DanhSachBang.spec.ts
git commit -m "feat(mindmap): ô tìm kiếm nội bộ trong lưới BoardGallery"
```

---

## Task 9: Gộp bảng vào `SearchResult`/`SearchScreen` toàn app

**Files:**
- Modify: `src/App.tsx` (khoảng dòng 1350-1420, `SearchResult`/`SearchScreen`)
- Test: file MỚI `src/__tests__/SearchScreen.spec.tsx`

**Interfaces:**
- Consumes: `BangMeta` (`src/board/boardMeta.ts`), `IDB_STORES`/`useIdbCollection` (đã import sẵn
  trong `App.tsx`), `SPECIALTIES` (đã import sẵn).
- Produces: `SearchResult` có thêm `kind: "board"` — không tiêu thụ ở task nào khác ngoài Task 10
  (qua hành vi `onNavigate("mindmap", id)`, không qua kiểu dữ liệu).

- [ ] **Step 1: Xác nhận `SearchScreen` đã export chưa, viết test đỏ**

Run: `grep -n "^function SearchScreen\|^export function SearchScreen" src/App.tsx`

Nếu ra `function SearchScreen` (không có `export`), việc đầu tiên trong Step 3 là đổi thành `export
function SearchScreen` — thay đổi TỐI THIỂU cần thiết để import nó từ file test riêng, KHÔNG đổi
hành vi (App() vẫn dùng nó y hệt).

Tạo `src/__tests__/SearchScreen.spec.tsx`:

```tsx
// @vitest-environment happy-dom
import 'fake-indexeddb/auto'

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IDB_STORES, idbPut } from '../lib/idb'
import { SearchScreen } from '../App'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function choDenKhi(dieuKien: () => void, timeoutMs = 3000, buocMs = 50) {
  const hetHan = Date.now() + timeoutMs
  for (;;) {
    try {
      dieuKien()
      return
    } catch (loi) {
      if (Date.now() >= hetHan) throw loi
    }
    await act(async () => {
      await new Promise((r) => setTimeout(r, buocMs))
    })
  }
}

describe('SearchScreen — kết quả loại "board"', () => {
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
  })

  it('gõ tên một bảng đã lưu → xuất hiện trong kết quả, bấm vào gọi onNavigate("mindmap", id)', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-1', ten: 'Suy tim EF giảm', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: ['nội trú'], noiDungTimKiem: '',
    })

    const onNavigate = vi.fn()
    await act(async () => {
      root.render(
        createElement(SearchScreen, {
          onNavigate,
          onBack: () => {},
          customArticles: [],
          customFlashcards: [],
          ecgLessons: [],
        }),
      )
    })

    const oTim = container.querySelector('input[type="search"]') as HTMLInputElement
    await act(async () => {
      oTim.value = 'suy tim'
      oTim.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await choDenKhi(() => {
      expect(container.textContent).toContain('Suy tim EF giảm')
    })

    const ketQua = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Suy tim EF giảm'),
    ) as HTMLButtonElement
    await act(async () => {
      ketQua.click()
    })

    expect(onNavigate).toHaveBeenCalledWith('mindmap', 'bang-1')
  })
})
```

Ghi chú: nếu cấu trúc DOM thật của một kết quả tìm kiếm không phải `<button>` bọc toàn bộ text (vd
là `<div onClick>`), đọc phần render danh sách `filtered.map(...)` hiện có trong `SearchScreen`
TRƯỚC khi viết lại selector `Array.from(...)` cho khớp phần tử thật đang dùng.

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/__tests__/SearchScreen.spec.tsx`
Expected: FAIL — không có bảng nào trong kết quả (SearchScreen chưa đọc `IDB_STORES.boards`), hoặc
lỗi import nếu `SearchScreen` chưa export.

- [ ] **Step 3: Sửa `SearchResult`/`SearchScreen` trong `App.tsx`**

Thêm import đầu `App.tsx`: `import type { BangMeta } from "./board/boardMeta"`.

Sửa `SearchResult` (dòng 1350-1357):

```ts
interface SearchResult {
  kind: "article" | "customArticle" | "ecg" | "flashcard" | "board"
  id: string
  title: string
  subtitle: string
  specialty?: string
  tags: string[]
  // CHỈ "board" set trường này — nội dung trích từ bảng (Task 5/6), dùng để khớp tìm kiếm nhưng
  // KHÔNG hiển thị trực tiếp (subtitle đã đủ cho hiển thị: "Mindmap").
  noiDung?: string
}
```

Đổi khai báo hàm thành `export function SearchScreen({...` (nếu Step 1 xác nhận chưa export).

Trong `SearchScreen`, thêm dòng đọc bảng (ngay sau khai `const [query, setQuery] = useState("")`):

```ts
// boardMeta.ts KHÔNG import BlockSuite (D13) — đọc ở đây chỉ chạm IndexedDB CSDL nhẹ, không kéo
// theo chunk 994 kB của bảng vẽ.
const { items: boards } = useIdbCollection<BangMeta>(IDB_STORES.boards)
```

Sửa `allResults` (thêm nhánh "board" vào mảng, thêm `boards` vào dependency array):

```ts
const allResults = useMemo<SearchResult[]>(() => {
  return [
    ...ARTICLES.map((a): SearchResult => ({ kind: "article", id: a.id, title: a.title, subtitle: a.excerpt, specialty: a.specialty, tags: a.tags })),
    ...customArticles.map((a): SearchResult => ({ kind: "customArticle", id: a.id, title: a.title, subtitle: a.excerpt, specialty: a.specialty, tags: a.tags })),
    ...ecgLessons.map((l): SearchResult => ({ kind: "ecg", id: l.id, title: l.title, subtitle: l.summary ?? "", tags: l.tags })),
    ...customFlashcards.map((c): SearchResult => ({ kind: "flashcard", id: c.id, title: c.front, subtitle: c.back, specialty: c.specialty, tags: [] })),
    ...boards
      .filter((b) => !b.daXoaLuc)
      .map((b): SearchResult => ({
        kind: "board",
        id: b.id,
        title: b.ten,
        subtitle: "Mindmap",
        specialty: SPECIALTIES.find((s) => s.id === b.chuyenKhoa)?.name,
        tags: b.tags ?? [],
        noiDung: b.noiDungTimKiem,
      })),
  ]
}, [customArticles, customFlashcards, ecgLessons, boards])
```

Sửa điều kiện lọc `filtered` — thêm khớp theo `noiDung`:

```ts
const filtered = useMemo(() => {
  if (query.length === 0) return []
  const q = query.toLowerCase()
  return allResults.filter((r) => {
    if (activeFilter !== "Tất cả" && r.specialty !== activeFilter) return false
    return (
      r.title.toLowerCase().includes(q) ||
      (r.specialty?.toLowerCase().includes(q) ?? false) ||
      r.tags.some((t) => t.toLowerCase().includes(q)) ||
      (r.noiDung?.toLowerCase().includes(q) ?? false)
    )
  })
}, [allResults, query, activeFilter])
```

Sửa `RESULT_LABEL`:

```ts
const RESULT_LABEL: Record<SearchResult["kind"], string> = {
  article: "",
  customArticle: "Tự nhập",
  ecg: "ECG",
  flashcard: "Thẻ ghi nhớ",
  board: "Mindmap",
}
```

Sửa `openResult`:

```ts
function openResult(r: SearchResult) {
  if (r.kind === "article") onNavigate("article", r.id)
  else if (r.kind === "customArticle") onNavigate("customEntry", r.id)
  else if (r.kind === "ecg") onNavigate("ecgDetail", r.id)
  else if (r.kind === "board") onNavigate("mindmap", r.id)
  else onNavigate("specialty", SPECIALTIES.find((s) => s.name === r.specialty)?.id)
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/__tests__/SearchScreen.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Chạy `tsc` + toàn bộ test để xác nhận không hồi quy `App.tsx`**

Run: `npx tsc --noEmit && npx vitest run`
Expected: cả hai đều xanh — `App.tsx` là file lớn, thay đổi này phải KHÔNG ảnh hưởng gì tới các
màn hình khác (chỉ thêm nhánh mới vào `SearchResult`/`SearchScreen`, không sửa nhánh cũ nào).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/__tests__/SearchScreen.spec.tsx
git commit -m "feat(mindmap): gộp kết quả bảng vào SearchScreen toàn app"
```

---

## Task 10: Mở đúng bảng khi bấm từ kết quả tìm kiếm

**Files:**
- Modify: `src/App.tsx` (state + `navigate()` + call site `<BoardGallery>`, khoảng dòng
  11605-11736 và 12052)
- Modify: `src/board/BoardGallery.tsx`
- Test: `src/board/__tests__/BoardGallery.spec.ts`

**Interfaces:**
- Consumes: không có từ task khác (state nội bộ App.tsx + prop mới của BoardGallery).
- Produces: `BoardGallery({ dangHienTab, moBangYeuCau?, onMoBangYeuCauXong? })` — chữ ký props mới.

- [ ] **Step 1: Viết test đỏ**

Đọc phần đầu `src/board/__tests__/BoardGallery.spec.ts` trước để dùng đúng import/helper
(`container`/`root`/`act`/`choDenKhi` hoặc tương đương) đã thiết lập sẵn ở đó — KHÔNG import trùng.
Thêm vào cuối describe chính:

```ts
it('truyền moBangYeuCau khớp một bảng đã lưu → mở thẳng bảng đó, không cần bấm qua danh sách', async () => {
  const bayGio = Date.now()
  await idbPut(IDB_STORES.boards, {
    id: 'muc-tieu', ten: 'Bảng mục tiêu', taoLuc: bayGio, capNhatLuc: bayGio,
    chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
  })

  await act(async () => {
    root.render(createElement(BoardGallery, { dangHienTab: true, moBangYeuCau: 'muc-tieu' }))
  })

  await choDenKhi(() => {
    expect(container.querySelector('[data-testid="boc-bang"]')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/board/__tests__/BoardGallery.spec.ts -t "moBangYeuCau"`
Expected: FAIL — `boc-bang` không xuất hiện (prop `moBangYeuCau` chưa được component tiêu thụ).

- [ ] **Step 3: Thêm prop vào `BoardGallery.tsx`**

Sửa chữ ký hàm:

```ts
export function BoardGallery({
  dangHienTab,
  moBangYeuCau,
  onMoBangYeuCauXong,
}: {
  dangHienTab: boolean
  moBangYeuCau?: string
  onMoBangYeuCauXong?: () => void
}) {
```

Thêm effect mới, ngay sau khai `const [openBoardId, setOpenBoardId] = useState<string | null>(null)`:

```ts
// Mở thẳng một bảng cụ thể khi được yêu cầu từ ngoài (kết quả tìm kiếm toàn app — xem App.tsx
// navigate()). Gọi onMoBangYeuCauXong() ngay sau khi tiêu thụ để App.tsx reset state về undefined
// — nếu không, bấm lại ĐÚNG kết quả tìm kiếm đó lần hai (cùng id, state App.tsx không đổi giá trị)
// sẽ không kích hoạt lại effect này (dependency không đổi).
useEffect(() => {
  if (!moBangYeuCau) return
  setOpenBoardId(moBangYeuCau)
  onMoBangYeuCauXong?.()
}, [moBangYeuCau, onMoBangYeuCauXong])
```

- [ ] **Step 4: Chạy test `BoardGallery.spec.ts`, xác nhận xanh**

Run: `npx vitest run src/board/__tests__/BoardGallery.spec.ts`
Expected: PASS toàn bộ file.

- [ ] **Step 5: Xuyên `moBangYeuCau` qua `App.tsx`**

Thêm state cạnh `const [specialtyId, setSpecialtyId] = useState<string>("cardiology")` (dòng 11608):

```ts
const [moBangYeuCau, setMoBangYeuCau] = useState<string | undefined>(undefined)
```

Trong `navigate()` (dòng 11711-11736), thêm nhánh mới cạnh các nhánh `if (s === "..." && id)` đã có:

```ts
if (s === "mindmap" && id) setMoBangYeuCau(id)
```

Sửa call site `<BoardGallery dangHienTab={screen === "mindmap"} />` (dòng 12052):

```tsx
<BoardGallery
  dangHienTab={screen === "mindmap"}
  moBangYeuCau={moBangYeuCau}
  onMoBangYeuCauXong={() => setMoBangYeuCau(undefined)}
/>
```

- [ ] **Step 6: Chạy `tsc` + toàn bộ test**

Run: `npx tsc --noEmit && npx vitest run`
Expected: cả hai xanh.

- [ ] **Step 7: Kiểm tay Browser pane thật**

`PORT=8444 npm run dev` — mở tab Tìm kiếm, gõ tên một bảng Mindmap đã tạo, bấm kết quả — xác nhận
chuyển thẳng sang tab Mindmap VÀ mở đúng bảng đó (không dừng ở danh sách).

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/board/BoardGallery.tsx src/board/__tests__/BoardGallery.spec.ts
git commit -m "feat(mindmap): mở đúng bảng khi bấm kết quả tìm kiếm từ SearchScreen toàn app"
```

---

## Sau khi xong Task 10 — xác nhận bảy cổng

```bash
npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build && npm run kiem:dist
```

Tất cả phải xanh trước khi coi chặng này hoàn tất. Cập nhật `docs/superpowers/HANDOFF.md` (mục mới,
theo đúng mẫu các mục 10-31 đã có) ghi lại kết quả, gồm cả bất kỳ điều chỉnh nào so với plan này
(API thật đo được lúc code có thể khác chi tiết đã viết — ghi lại đúng thứ đã xảy ra, không phải
đúng thứ plan này dự đoán).
