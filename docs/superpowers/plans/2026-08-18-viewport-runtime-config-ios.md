# Viewport Runtime Config cho iOS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trên iOS (iPhone/iPad), ghi đè `viewportRuntimeConfig` của BlockSuite TRƯỚC khi bảng vẽ
mount, để `SKIP_REFRESH_DURING_GESTURE` và các hằng số anh em (field initializer, chốt cứng lúc
dựng `Viewport`) thực sự có tác dụng — giảm rủi ro WKWebView bị hệ điều hành kill khi pan/zoom
trên chunk bảng ~4 MB thô. Desktop/Android không đổi hành vi.

**Architecture:** Một hàm phát hiện thiết bị thuần (`laThietBiIOS`, không side-effect, dễ test) +
một hàm áp dụng (`apDungViewportChoIOS`, ghi vào `viewportRuntimeConfig` singleton của
`@blocksuite/affine/std/gfx`), gọi Ở ĐẦU MODULE `EdgelessBoard.tsx` — trước dòng dựng
`viewManager`/`storeManager` — để chạy trước bất kỳ `new Viewport()` nào (Viewport chỉ thực sự
được dựng sau, bên trong `useEffect`, khi `BlockStdScope` mount). Không đụng file nào trong
`src/vendor/` (D11).

**Tech Stack:** TypeScript, Vitest (environment `node` mặc định — xem `vite.config.ts`), không
cần DOM cho phần này (`viewportRuntimeConfig` là plain object, `Viewport` không chạm DOM lúc
constructor — đã xác nhận trong `src/board/__tests__/viewport-runtime-config.spec.ts`).

**Spec:** không có file spec riêng — đây là task đã đi qua nhánh "bounded" của
`superpowers:brainstorming` (thiết kế ngắn duyệt trực tiếp trong hội thoại, không cần spec file).
Toàn bộ quyết định thiết kế được chép lại trong "Global Constraints" dưới đây.

## Global Constraints

- **D11:** không sửa bất kỳ file nào trong `src/vendor/blocksuite/`.
- Override `viewportRuntimeConfig` PHẢI chạy ở **top-level module** của `EdgelessBoard.tsx`,
  không được đặt trong `useEffect` hay bất kỳ callback bất đồng bộ nào — lý do: `SKIP_REFRESH_DURING_GESTURE`
  và 4 hằng số anh em là field initializer, copy giá trị đúng MỘT LẦN lúc `new Viewport()` chạy;
  `ZOOM_MIN`/`ZOOM_MAX` đọc qua getter nên tha thứ hơn, nhưng vẫn phải nhất quán một chỗ.
- Chỉ áp override trên iOS thật (`userAgent` chứa `iPad`/`iPhone`/`iPod`) hoặc iPadOS 13+ giả UA
  desktop (`platform === 'MacIntel'` VÀ `maxTouchPoints > 1`, phân biệt với Mac thật dùng
  chuột/trackpad). Desktop Windows/macOS thật và Android giữ nguyên mặc định thượng nguồn.
- Giá trị khởi điểm (CHƯA đo trên thiết bị thật — không có iPad để đo tại thời điểm viết kế hoạch
  này — cần tinh chỉnh sau khi chủ dự án thử trên máy thật):
  - `SKIP_REFRESH_DURING_GESTURE: true`
  - `ZOOM_MIN: 0.3`
  - `CANVAS_DPR_CAP_BY_ZOOM: [[0.5, 1], [1, 2]]`
  - `LOW_ZOOM_GESTURE_ACTIVE_BLOCK_LIMIT: 24`
- Môi trường test mặc định là `node` (không phải `happy-dom`) — hàm phát hiện thiết bị KHÔNG được
  đọc `navigator` toàn cục trực tiếp (nhận tham số), để test truyền input giả mà không cần DOM.
- `apDungViewportChoIOS()` phải an toàn khi gọi trong môi trường Node thuần lúc chạy test (Node 24
  có `navigator` toàn cục nhưng `userAgent = 'Node.js/24'`, `platform = 'Win32'`,
  `maxTouchPoints` không tồn tại) — không được ném lỗi, không được ghi đè config.

---

### Task 1: Hàm phát hiện thiết bị iOS thuần (`laThietBiIOS`)

**Files:**
- Create: `src/board/viewport-ios.ts`
- Test: `src/board/__tests__/viewport-ios.spec.ts`

**Interfaces:**
- Produces: `type ThongTinThietBi = { userAgent: string; platform: string; maxTouchPoints?: number }`
  và `laThietBiIOS(nav: ThongTinThietBi): boolean` — Task 2 import cả hai từ cùng file này.

- [ ] **Step 1: Viết ca kiểm thất bại**

Tạo `src/board/__tests__/viewport-ios.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest'

import { laThietBiIOS } from '../viewport-ios'

describe('laThietBiIOS', () => {
  it('UA iPhone thật → true', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
      }),
    ).toBe(true)
  })

  it('UA iPad khai thẳng "iPad" → true', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        platform: 'iPad',
        maxTouchPoints: 5,
      }),
    ).toBe(true)
  })

  it('iPadOS 13+ giả UA Mac desktop nhưng có đa điểm chạm → true', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
    ).toBe(true)
  })

  it('Mac thật dùng chuột (platform MacIntel, không đa điểm chạm) → false', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      }),
    ).toBe(false)
  })

  it('Windows desktop → false', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        platform: 'Win32',
        maxTouchPoints: 0,
      }),
    ).toBe(false)
  })

  it('Android phone (có đa điểm chạm nhưng platform khác MacIntel) → false', () => {
    expect(
      laThietBiIOS({
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      }),
    ).toBe(false)
  })

  it('maxTouchPoints vắng mặt trên UA giả-Mac → không ném lỗi, trả false', () => {
    expect(
      laThietBiIOS({
        userAgent: 'Node.js/24',
        platform: 'MacIntel',
      }),
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Chạy ca kiểm, xác nhận thất bại**

Run: `npx vitest run src/board/__tests__/viewport-ios.spec.ts`
Expected: FAIL — `Cannot find module '../viewport-ios'` (file chưa tồn tại).

- [ ] **Step 3: Viết cài đặt tối thiểu**

Tạo `src/board/viewport-ios.ts`:

```typescript
export type ThongTinThietBi = {
  userAgent: string
  platform: string
  maxTouchPoints?: number
}

/**
 * true nếu thiết bị là iOS thật (iPhone/iPad/iPod) hoặc iPadOS 13+ đang giả User-Agent máy Mac
 * desktop (chỉ phân biệt được với Mac thật bằng đa điểm chạm — Mac dùng chuột/trackpad không có
 * `maxTouchPoints > 1`).
 */
export function laThietBiIOS(nav: ThongTinThietBi): boolean {
  if (/iPad|iPhone|iPod/.test(nav.userAgent)) return true
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1
}
```

- [ ] **Step 4: Chạy ca kiểm, xác nhận qua**

Run: `npx vitest run src/board/__tests__/viewport-ios.spec.ts`
Expected: PASS — 7/7 ca.

- [ ] **Step 5: Commit**

```bash
git add src/board/viewport-ios.ts src/board/__tests__/viewport-ios.spec.ts
git commit -m "feat(board): thêm hàm phát hiện thiết bị iOS thuần cho viewport runtime config"
```

---

### Task 2: `apDungViewportChoIOS` + nối vào `EdgelessBoard.tsx`

**Files:**
- Modify: `src/board/viewport-ios.ts` (thêm `apDungViewportChoIOS`)
- Modify: `src/board/EdgelessBoard.tsx:23` (thêm import), `:39-41` (gọi hàm trước khi dựng `viewManager`)
- Test: `src/board/__tests__/viewport-ios.spec.ts` (thêm describe mới)

**Interfaces:**
- Consumes: `laThietBiIOS`, `ThongTinThietBi` từ Task 1 (cùng file `viewport-ios.ts`).
- Produces: `apDungViewportChoIOS(nav?: ThongTinThietBi): void` — side-effecting, ghi vào
  `viewportRuntimeConfig` (import từ `@blocksuite/affine/std/gfx`). Mặc định `nav` là `navigator`
  toàn cục khi không truyền — `EdgelessBoard.tsx` gọi `apDungViewportChoIOS()` không đối số.

- [ ] **Step 1: Viết ca kiểm thất bại**

Trước tiên đọc lại `src/board/__tests__/viewport-runtime-config.spec.ts` để thấy đúng cách phục
hồi `viewportRuntimeConfig` sau mỗi ca (đặc biệt `CANVAS_DPR_CAP_BY_ZOOM` là mảng, spread nông chỉ
copy tham chiếu — phải gán mảng MỚI trong `afterEach`, không thì ca sau kế thừa mutation).

Thêm vào cuối `src/board/__tests__/viewport-ios.spec.ts` (giữ nguyên phần Task 1 ở trên, chỉ mở
rộng import và thêm block mới):

```typescript
import { afterEach, describe, expect, it } from 'vitest'

import { Viewport, viewportRuntimeConfig } from '@blocksuite/affine/std/gfx'

import { apDungViewportChoIOS, laThietBiIOS, type ThongTinThietBi } from '../viewport-ios'

// ... (giữ nguyên describe('laThietBiIOS', ...) từ Task 1 ở trên) ...

const CAU_HINH_GOC = { ...viewportRuntimeConfig }

afterEach(() => {
  Object.assign(viewportRuntimeConfig, CAU_HINH_GOC)
  // Mảng — spread nông ở trên chỉ copy tham chiếu tới CÙNG một mảng gốc, nên phải gán lại một
  // mảng MỚI (bản sao) để ca sau không kế thừa mutation trên mảng cũ. Xem cùng bài học đã ghi ở
  // viewport-runtime-config.spec.ts.
  viewportRuntimeConfig.CANVAS_DPR_CAP_BY_ZOOM = [...CAU_HINH_GOC.CANVAS_DPR_CAP_BY_ZOOM]
})

const NAV_IPAD: ThongTinThietBi = {
  userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
  platform: 'iPad',
  maxTouchPoints: 5,
}

const NAV_WINDOWS: ThongTinThietBi = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  platform: 'Win32',
  maxTouchPoints: 0,
}

describe('apDungViewportChoIOS', () => {
  it('nav iOS → ghi đè cả 4 field vào viewportRuntimeConfig', () => {
    apDungViewportChoIOS(NAV_IPAD)

    expect(viewportRuntimeConfig.SKIP_REFRESH_DURING_GESTURE).toBe(true)
    expect(viewportRuntimeConfig.ZOOM_MIN).toBe(0.3)
    expect(viewportRuntimeConfig.CANVAS_DPR_CAP_BY_ZOOM).toEqual([
      [0.5, 1],
      [1, 2],
    ])
    expect(viewportRuntimeConfig.LOW_ZOOM_GESTURE_ACTIVE_BLOCK_LIMIT).toBe(24)
  })

  it('nav không phải iOS → viewportRuntimeConfig giữ nguyên mặc định thượng nguồn', () => {
    apDungViewportChoIOS(NAV_WINDOWS)

    expect(viewportRuntimeConfig.SKIP_REFRESH_DURING_GESTURE).toBe(false)
    expect(viewportRuntimeConfig.ZOOM_MIN).toBe(0.1)
    expect(viewportRuntimeConfig.CANVAS_DPR_CAP_BY_ZOOM).toEqual([])
    expect(viewportRuntimeConfig.LOW_ZOOM_GESTURE_ACTIVE_BLOCK_LIMIT).toBe(0)
  })

  it('gọi TRƯỚC khi dựng Viewport → instance mới ăn cả field initializer lẫn getter', () => {
    apDungViewportChoIOS(NAV_IPAD)

    const viewport = new Viewport()

    // ZOOM_MIN đọc qua getter động — ăn override dù đọc lúc nào.
    expect(viewport.ZOOM_MIN).toBe(0.3)
    // SKIP_REFRESH_DURING_GESTURE là field initializer — CHỈ ăn nếu override chạy TRƯỚC dòng
    // `new Viewport()` này, đúng thứ ca kiểm này cưỡng chế.
    expect(viewport.SKIP_REFRESH_DURING_GESTURE).toBe(true)
  })

  it('gọi không đối số trong môi trường test (Node thuần) → không ném lỗi, không đổi config', () => {
    expect(() => apDungViewportChoIOS()).not.toThrow()

    expect(viewportRuntimeConfig.SKIP_REFRESH_DURING_GESTURE).toBe(false)
    expect(viewportRuntimeConfig.ZOOM_MIN).toBe(0.1)
  })
})
```

- [ ] **Step 2: Chạy ca kiểm, xác nhận thất bại**

Run: `npx vitest run src/board/__tests__/viewport-ios.spec.ts`
Expected: FAIL — `apDungViewportChoIOS` không tồn tại (lỗi import/`is not a function`), 4 ca mới đỏ,
7 ca Task 1 vẫn xanh.

- [ ] **Step 3: Viết cài đặt tối thiểu**

Thêm vào cuối `src/board/viewport-ios.ts` (giữ nguyên `ThongTinThietBi`/`laThietBiIOS` đã có):

```typescript
import { viewportRuntimeConfig } from '@blocksuite/affine/std/gfx'

/**
 * Ghi đè `viewportRuntimeConfig` MỘT LẦN — PHẢI được gọi ở top-level module của EdgelessBoard.tsx,
 * TRƯỚC bất kỳ `Viewport` nào được dựng. `SKIP_REFRESH_DURING_GESTURE` và bốn hằng số anh em là
 * field initializer, copy giá trị đúng một lần lúc constructor chạy (xem
 * __tests__/viewport-runtime-config.spec.ts) — gọi hàm này trong `useEffect` (chạy SAU khi
 * component mount, tức sau khi Viewport đã dựng) sẽ khiến zoom floor ăn (đọc qua getter) nhưng
 * SKIP_REFRESH_DURING_GESTURE thì KHÔNG.
 *
 * Giá trị dưới đây là điểm khởi đầu thận trọng, CHƯA đo trên thiết bị iPad thật — cần tinh chỉnh
 * khi có dữ liệu thật (xem docs/superpowers/HANDOFF.md mục 8).
 */
export function apDungViewportChoIOS(nav: ThongTinThietBi = navigator): void {
  if (!laThietBiIOS(nav)) return

  Object.assign(viewportRuntimeConfig, {
    SKIP_REFRESH_DURING_GESTURE: true,
    ZOOM_MIN: 0.3,
    CANVAS_DPR_CAP_BY_ZOOM: [
      [0.5, 1],
      [1, 2],
    ] as Array<[number, number]>,
    LOW_ZOOM_GESTURE_ACTIVE_BLOCK_LIMIT: 24,
  })
}
```

- [ ] **Step 4: Chạy ca kiểm, xác nhận qua**

Run: `npx vitest run src/board/__tests__/viewport-ios.spec.ts`
Expected: PASS — 11/11 ca (7 Task 1 + 4 Task 2).

- [ ] **Step 5: Nối vào `EdgelessBoard.tsx`**

Đọc lại `src/board/EdgelessBoard.tsx` trước khi sửa — dòng cụ thể có thể lệch nếu file đã đổi kể
từ lúc viết kế hoạch này. Tìm đúng hai điểm neo dưới đây bằng nội dung, không chỉ số dòng:

1. Sau dòng `import { resolveTheme, watchResolvedTheme } from '../lib/theme'`, thêm:

```typescript
import { apDungViewportChoIOS } from './viewport-ios'
```

2. Sau dòng `import { viewExtensions } from './extensions'` và TRƯỚC dòng
   `const viewManager = new ViewExtensionManager(viewExtensions)`, thêm:

```typescript
// Phải chạy Ở ĐÂY — top-level module, trước khi bất kỳ Viewport nào được dựng (bên trong
// BlockStdScope, mount trong useEffect bên dưới). Xem viewport-ios.ts để biết vì sao thứ tự này
// bắt buộc (SKIP_REFRESH_DURING_GESTURE là field initializer, chốt cứng lúc constructor chạy).
apDungViewportChoIOS()
```

- [ ] **Step 6: Kiểm kiểu và chạy lại toàn bộ ca kiểm liên quan**

Run: `npx tsc --noEmit`
Expected: exit 0.

Run:
```bash
npx vitest run src/board/__tests__/viewport-ios.spec.ts src/board/__tests__/viewport-runtime-config.spec.ts src/board/__tests__/edgeless-board.spec.ts src/board/__tests__/edgeless-board-mount.spec.ts
```
Expected: tất cả PASS. Đặc biệt chú ý `edgeless-board.spec.ts` — nó import `EdgelessBoard.tsx`
trong môi trường `node` (không phải `happy-dom`), nên đây là ca kiểm thật sự chứng minh
`apDungViewportChoIOS()` không ném lỗi khi module được nạp trong môi trường không có DOM đầy đủ.

Run: `npm test`
Expected: toàn bộ suite PASS (không chỉ các file liên quan) — `viewportRuntimeConfig` là state
cấp module dùng chung, cần xác nhận không rò rỉ sang file khác.

- [ ] **Step 7: Build sanity check**

Run: `npm run build`
Expected: xanh, không lỗi. (Không cần `kiem:dist` — thay đổi này không đụng tên biến CSS/định
danh vendored nào, chỉ thêm logic JS thuần.)

- [ ] **Step 8: Commit**

```bash
git add src/board/viewport-ios.ts src/board/__tests__/viewport-ios.spec.ts src/board/EdgelessBoard.tsx
git commit -m "feat(board): áp viewportRuntimeConfig cho iOS trước khi mount bảng vẽ"
```

---

## Sau khi xong cả hai task

Cập nhật `docs/superpowers/HANDOFF.md` mục 8 ("CHẶNG KẾ TIẾP"): đánh dấu
"Cấu hình `viewportRuntimeConfig` cho iOS" đã xong, kèm giá trị đã chọn và câu nhắc "chưa đo trên
thiết bị thật — cần tinh chỉnh khi chủ dự án có iPad". Không tự ý coi đây là đã giải quyết xong
rủi ro ở mục 7 (iPad — toàn bộ) — chỉ là một phần của rủi ro đó.
