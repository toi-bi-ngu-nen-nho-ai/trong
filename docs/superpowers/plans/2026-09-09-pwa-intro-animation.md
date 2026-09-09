# Intro chào PWA (chữ T → wordmark → giọt nước → HomeScreen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm một overlay hoạt cảnh ~2.4-2.6s chạy mỗi lần PWA khởi động lại từ đầu: chữ "T" phóng
to thu về vị trí trong wordmark "Bác sĩ Trọng", một giọt nước xanh rơi/nảy/lan toả, và bên trong
vòng đang lan lộ thẳng HomeScreen đã sẵn sàng phía dưới.

**Architecture:** Một component tự chứa (`IntroOverlay`) mount song song với `<App/>` ngay trong
`main.tsx` (không đụng `App.tsx`) — `App` khởi tạo ngầm phía dưới trong lúc overlay chạy, overlay tự
gỡ khỏi DOM khi xong. Bán kính vòng lan điều khiển một `mask-image: radial-gradient` trên lớp phủ
logo để "đục lỗ" lộ App bên dưới, không có bước phủ trắng riêng.

**Tech Stack:** React 19, TypeScript, `gsap` (mới thêm), Tailwind v4 utility classes, Vitest +
`@testing-library/react` (happy-dom).

**Spec:** [docs/superpowers/specs/2026-09-09-pwa-intro-animation-design.md](../specs/2026-09-09-pwa-intro-animation-design.md)

## Global Constraints

- Overlay không đụng `src/App.tsx` — hoàn toàn độc lập, gỡ được không để lại dấu vết.
- Không thêm cờ bật/tắt intro (localStorage/query param/setting) và không thêm nút/thao tác bỏ qua.
- Màu logo/giọt nước dùng token riêng cố định (`--c-intro-blue: #2f6fed`), KHÔNG dùng
  `--c-primary`/`--c-accent*` — không đổi theo dark mode.
- Font Baloo 2 **tự host** trong `public/fonts/` (quyết định 2026-09-09, đã cân nhắc lại và giữ
  nguyên dù font UI chính của app — Plus Jakarta Sans... — thực ra tải qua CDN `@import` ở
  `src/index.css:40`, không tự host; đây là một ngoại lệ có chủ đích cho riêng intro).
- Tải 3 file font (`public/fonts/Baloo2-vietnamese.woff2`, `Baloo2-latin-ext.woff2`,
  `Baloo2-latin.woff2`, tổng ~70KB, nguồn `fonts.gstatic.com/s/baloo2/v23/...`) **đã được người dùng
  cho phép tường minh** trong phiên brainstorm/lập kế hoạch 2026-09-09 — không cần hỏi lại.
- `package.json` dùng npm là authoritative (theo `AGENTS.md`) — không tạo/đụng `pnpm-lock.yaml`.
- Quy ước dấu nháy đã quan sát trong repo: file component không phải test (`src/components/*.tsx`,
  theo mẫu `ScreenHeader.tsx`) dùng nháy KÉP; file `*.spec.tsx`/`*.spec.ts` trong toàn repo dùng
  nháy ĐƠN (mẫu `ChonDanhMuc.spec.tsx`, `theme.spec.ts`).
- Mọi file `*.spec.tsx` dùng `@testing-library/react` PHẢI có dòng đầu tiên
  `// @vitest-environment happy-dom` (environment mặc định trong `vite.config.ts` là `node`).
  KHÔNG tự thêm `afterEach(cleanup)` — `src/__tests__/helpers/don-dep-testing-library.ts` đã đăng ký
  việc này toàn cục qua `test.setupFiles`.
- Chạy `npm test` (vitest) và `npx tsc --noEmit` phải xanh sau mỗi task trước khi commit.

---

## Task 1: Cài đặt `gsap`

**Files:**
- Modify: `package.json` (thêm vào `dependencies`)
- Modify: `package-lock.json` (tự động qua `npm install`)

**Interfaces:**
- Produces: gói `gsap` import được qua `import { gsap } from "gsap"` ở mọi file trong `src/`.

- [ ] **Step 1: Cài đặt**

Run: `npm install gsap`

Lệnh này tự thêm một dòng `"gsap": "^3.x.x"` vào `dependencies` của `package.json` và cập nhật
`package-lock.json` — không sửa tay hai file này.

- [ ] **Step 2: Xác nhận cài đúng**

Run: `npm ls gsap`
Expected: in ra đúng một dòng `gsap@<version>`, không có `UNMET DEPENDENCY`/`extraneous`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: thêm gsap cho hoạt cảnh intro PWA"
```

---

## Task 2: Tự host font Baloo 2 (3 subset latin / latin-ext / vietnamese)

**Files:**
- Create: `public/fonts/Baloo2-vietnamese.woff2`
- Create: `public/fonts/Baloo2-latin-ext.woff2`
- Create: `public/fonts/Baloo2-latin.woff2`
- Modify: `src/index.css` (thêm vào cuối file)

**Interfaces:**
- Produces: `font-family: 'Baloo 2'` dựng được trong CSS qua `var(--font-baloo)`; token màu
  `var(--c-intro-blue)` (`#2f6fed`), `var(--c-intro-bg)` (`#f6f6f6`), `var(--c-intro-ink)` (`#14161f`).

- [ ] **Step 1: Tải 3 file font**

Ba URL dưới lấy từ Google Fonts CSS2 API (`family=Baloo+2:wght@400..800`, đã xác minh Content-Length
qua HEAD request lúc lập kế hoạch — không tải lại devanagari, app không cần subset đó). Đã được
người dùng cho phép tường minh (xem Global Constraints).

```bash
curl -sL -o public/fonts/Baloo2-vietnamese.woff2 "https://fonts.gstatic.com/s/baloo2/v23/wXKrE3kTposypRyd51fcANwr.woff2"
curl -sL -o public/fonts/Baloo2-latin-ext.woff2 "https://fonts.gstatic.com/s/baloo2/v23/wXKrE3kTposypRyd51bcANwr.woff2"
curl -sL -o public/fonts/Baloo2-latin.woff2 "https://fonts.gstatic.com/s/baloo2/v23/wXKrE3kTposypRyd51jcAA.woff2"
```

- [ ] **Step 2: Kiểm dung lượng file tải về đúng như đã xác minh**

Run: `ls -la public/fonts/Baloo2-*.woff2`
Expected: `Baloo2-vietnamese.woff2` ≈ 9888 bytes, `Baloo2-latin-ext.woff2` ≈ 27384 bytes,
`Baloo2-latin.woff2` ≈ 33188 bytes (sai lệch quá vài trăm byte nghĩa là tải hỏng/bị chặn — xoá và
tải lại, không dùng file 0 byte hoặc file HTML lỗi 404 bị lưu nhầm đuôi `.woff2`).

- [ ] **Step 3: Thêm `@font-face` + token vào `src/index.css`**

Thêm vào CUỐI file `src/index.css` (không đụng khối `:root` hiện có ở đầu file — token intro sống
riêng, độc lập theme):

```css

/* ─── Font + màu riêng cho IntroOverlay (src/components/IntroOverlay.tsx) ─────────────────────────
   Baloo 2 tự host — KHÁC quy ước font UI chính của app (Plus Jakarta Sans... tải CDN @import ở đầu
   file này), quyết định có chủ đích 2026-09-09: intro phải đúng font kể cả mất mạng ở lần mở đầu.
   Ba khối dưới lấy NGUYÊN VĂN @font-face + unicode-range từ Google Fonts CSS2 API
   (family=Baloo+2:wght@400..800), chỉ đổi url() trỏ vào file tự host — giữ browser tự chọn đúng
   subset theo ký tự cần vẽ thay vì luôn tải cả ba cho một dòng chữ thuần Latin. */
@font-face {
  font-family: 'Baloo 2';
  font-style: normal;
  font-weight: 400 800;
  font-display: swap;
  src: url('/fonts/Baloo2-vietnamese.woff2') format('woff2');
  unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB;
}
@font-face {
  font-family: 'Baloo 2';
  font-style: normal;
  font-weight: 400 800;
  font-display: swap;
  src: url('/fonts/Baloo2-latin-ext.woff2') format('woff2');
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: 'Baloo 2';
  font-style: normal;
  font-weight: 400 800;
  font-display: swap;
  src: url('/fonts/Baloo2-latin.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

:root {
  --font-baloo: 'Baloo 2', system-ui, sans-serif;
  --c-intro-bg: #f6f6f6;
  --c-intro-ink: #14161f;
  --c-intro-blue: #2f6fed;
}
```

- [ ] **Step 4: Kiểm dấu tiếng Việt render đúng trên trình duyệt thật**

Dev server đã chạy sẵn (theo `AGENTS.md`). Mở Browser pane vào app, rồi chạy qua `javascript_tool`
(cùng phương pháp `document.fonts.check()` mà `src/board/phong-chu-bang.ts` đã dùng để tự kiểm Inter):

```js
const face = new FontFace('Baloo 2 Test', 'url(/fonts/Baloo2-vietnamese.woff2)')
await face.load()
document.fonts.add(face)
const div = document.createElement('div')
div.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;font-size:48px;font-family:"Baloo 2 Test";background:#fff;padding:8px'
div.textContent = 'Bác sĩ Trọng — Sốc nhiễm khuẩn'
document.body.appendChild(div)
document.fonts.check('48px "Baloo 2 Test"', 'Bác sĩ Trọng — Sốc nhiễm khuẩn')
```

Expected: trả về `true`, và chụp `computer {action:"screenshot"}` vùng góc trên trái phải thấy đủ
dấu (ă, ọ, ố, ị...) — không có ký tự nào rơi về ô vuông/tofu hoặc font hệ thống thay thế. Sau khi xác
nhận, dọn lại: `document.fonts.delete(face); div.remove()` (không để sót phần tử debug trong trang).

- [ ] **Step 5: Commit**

```bash
git add public/fonts/Baloo2-vietnamese.woff2 public/fonts/Baloo2-latin-ext.woff2 public/fonts/Baloo2-latin.woff2 src/index.css
git commit -m "feat: tự host font Baloo 2 (3 subset) cho intro PWA"
```

---

## Task 3: `IntroOverlay` — component + toàn bộ timeline hoạt cảnh

**Files:**
- Create: `src/components/IntroOverlay.tsx`
- Test: `src/components/__tests__/IntroOverlay.spec.tsx`

**Interfaces:**
- Consumes: `gsap` (Task 1) qua `import { gsap } from "gsap"`; CSS token `--font-baloo`,
  `--c-intro-bg`, `--c-intro-ink`, `--c-intro-blue` (Task 2).
- Produces: `export function IntroOverlay({ onFinished }: { onFinished: () => void }): JSX.Element`
  — Task 4 render component này, truyền `onFinished` để biết lúc nào gỡ overlay khỏi cây.

Phần thân timeline animation (bước 3 dưới) viết trực tiếp theo đúng mô tả 6 pha trong spec — **không
đi qua chu trình đỏ/xanh cho riêng animation**, đúng như mục 5 spec đã nói rõ ("không kiểm animation
theo pixel/thời gian thật"). Bốn hành vi CÓ kiểm bằng test (cấu trúc DOM, reduced-motion, cleanup,
timeout dự phòng) thì đi TDD đầy đủ ở các bước dưới.

- [ ] **Step 1: Viết test thất bại cho 4 hành vi kiểm được**

Tạo `src/components/__tests__/IntroOverlay.spec.tsx`:

```tsx
// @vitest-environment happy-dom
import { act } from 'react'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { IntroOverlay } from '../IntroOverlay'

const killMock = vi.fn()
const timelineMock = vi.fn()

vi.mock('gsap', () => ({
  gsap: {
    set: vi.fn(),
    timeline: (...args: unknown[]) => {
      timelineMock(...args)
      const tl = {
        to: () => tl,
        kill: killMock,
      }
      return tl
    },
  },
}))

function ganMatchMedia(reduced: boolean) {
  ;(window as unknown as { matchMedia: typeof window.matchMedia }).matchMedia = ((query: string) => ({
    matches: reduced,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  killMock.mockClear()
  timelineMock.mockClear()
  ganMatchMedia(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('IntroOverlay', () => {
  it('dựng đủ #letterT / #textBacSi / #textRong cho timeline nhắm tới', () => {
    const { container } = render(<IntroOverlay onFinished={() => {}} />)
    expect(container.querySelector('#letterT')).not.toBeNull()
    expect(container.querySelector('#textBacSi')).not.toBeNull()
    expect(container.querySelector('#textRong')).not.toBeNull()
  })

  it('prefers-reduced-motion: reduce → gọi onFinished ngay, không tạo timeline', () => {
    ganMatchMedia(true)
    const onFinished = vi.fn()
    render(<IntroOverlay onFinished={onFinished} />)
    expect(onFinished).toHaveBeenCalledTimes(1)
    expect(timelineMock).not.toHaveBeenCalled()
  })

  it('unmount giữa chừng → kill timeline, không throw', () => {
    const { unmount } = render(<IntroOverlay onFinished={() => {}} />)
    expect(timelineMock).toHaveBeenCalledTimes(1)
    expect(() => unmount()).not.toThrow()
    expect(killMock).toHaveBeenCalledTimes(1)
  })

  it('timeline không bao giờ onComplete → timeout dự phòng vẫn gọi onFinished', () => {
    vi.useFakeTimers()
    const onFinished = vi.fn()
    render(<IntroOverlay onFinished={onFinished} />)
    expect(onFinished).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(onFinished).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận thất bại vì thiếu module**

Run: `npx vitest run src/components/__tests__/IntroOverlay.spec.tsx`
Expected: FAIL — `Failed to resolve import "../IntroOverlay"` (file chưa tồn tại).

- [ ] **Step 3: Viết `src/components/IntroOverlay.tsx`**

```tsx
import { useEffect, useRef } from "react"
import { gsap } from "gsap"

// Overlay che toàn app trong lúc chạy — tuyệt đối không được treo vĩnh viễn nếu timeline lỗi vì lý
// do bất ngờ, nên luôn có một timeout dự phòng gọi onFinished dù animation không bao giờ hoàn tất.
const SAFETY_TIMEOUT_MS = 6000

export function IntroOverlay({ onFinished }: { onFinished: () => void }) {
  const coverRef = useRef<HTMLDivElement>(null)
  const letterTRef = useRef<HTMLSpanElement>(null)
  const bacSiRef = useRef<HTMLSpanElement>(null)
  const trongRef = useRef<HTMLSpanElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const ringsRef = useRef<HTMLDivElement>(null)
  const rimRef = useRef<HTMLDivElement>(null)
  // React 19 StrictMode (dev) chạy effect hai lần — chặn dựng timeline lần thứ hai.
  const startedRef = useRef(false)
  // onFinished có thể đổi identity giữa các lần render cha; giữ bản mới nhất qua ref thay vì đưa
  // vào dependency array, để effect chỉ chạy đúng một lần lúc mount.
  const onFinishedRef = useRef(onFinished)
  onFinishedRef.current = onFinished

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const finish = () => onFinishedRef.current()

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish()
      return
    }

    const cover = coverRef.current!
    const rim = rimRef.current!
    const maxRadius = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 40

    gsap.set(letterTRef.current, { scale: 3.6 })
    gsap.set([bacSiRef.current, trongRef.current], { opacity: 0, y: 12 })
    gsap.set(dropRef.current, { opacity: 0, y: -80 })
    gsap.set(ringsRef.current!.children, { opacity: 0, scale: 0.3 })
    gsap.set(rim, { width: 0, height: 0, opacity: 0 })

    const tl = gsap.timeline({ onComplete: finish })

    tl.to(letterTRef.current, { scale: 1, duration: 1.2, ease: "power3.inOut" })
      .to(bacSiRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1.2)" }, "-=0.5")
      .to(trongRef.current, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.5")
      .to({}, { duration: 0.3 }) // giữ logo một nhịp trước khi giọt nước rơi
      .to(dropRef.current, { opacity: 1, y: 0, duration: 0.35, ease: "bounce.out" })
      .to(dropRef.current, { opacity: 0, duration: 0.1 })
      .to(
        ringsRef.current!.children,
        { opacity: 0, scale: 1.6, duration: 0.25, stagger: 0.06, ease: "power1.out" },
        "<",
      )
      .to(
        { r: 0 },
        {
          r: maxRadius,
          duration: 0.55,
          ease: "power2.out",
          onUpdate: function () {
            const r = (this.targets()[0] as { r: number }).r
            const inner = Math.max(r - 4, 0)
            const mask = `radial-gradient(circle at 50% 50%, transparent 0, transparent ${inner}px, black ${r}px, black 100%)`
            cover.style.maskImage = mask
            cover.style.webkitMaskImage = mask
            rim.style.width = `${r * 2}px`
            rim.style.height = `${r * 2}px`
            rim.style.opacity = r > 4 ? "1" : "0"
          },
        },
      )

    const safety = window.setTimeout(finish, SAFETY_TIMEOUT_MS)

    return () => {
      tl.kill()
      window.clearTimeout(safety)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[999] pointer-events-auto overflow-hidden" role="presentation" aria-hidden="true">
      <div
        ref={coverRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{ background: "var(--c-intro-bg, #f6f6f6)" }}
      >
        <div className="flex flex-col items-center gap-1" style={{ fontFamily: "var(--font-baloo)" }}>
          <span
            id="letterT"
            ref={letterTRef}
            className="block text-[64px] leading-none font-extrabold"
            style={{ color: "var(--c-intro-blue)" }}
          >
            T
          </span>
          <span className="flex flex-col items-center leading-tight text-[28px] font-extrabold">
            <span id="textBacSi" ref={bacSiRef} style={{ color: "var(--c-intro-ink)" }}>
              Bác sĩ
            </span>
            <span id="textRong" ref={trongRef}>
              <span style={{ color: "var(--c-intro-blue)" }}>T</span>
              <span style={{ color: "var(--c-intro-ink)" }}>rọng</span>
            </span>
          </span>
        </div>
        <div
          ref={dropRef}
          className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: "var(--c-intro-blue)" }}
        />
        <div ref={ringsRef} className="absolute left-1/2 top-1/2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{
                borderColor: "var(--c-intro-blue)",
                width: `${40 + i * 28}px`,
                height: `${40 + i * 28}px`,
              }}
            />
          ))}
        </div>
      </div>
      <div
        ref={rimRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ boxShadow: "0 0 24px 6px var(--c-intro-blue)", border: "2px solid var(--c-intro-blue)" }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Chạy test, xác nhận qua hết**

Run: `npx vitest run src/components/__tests__/IntroOverlay.spec.tsx`
Expected: PASS — 4/4 ca xanh.

- [ ] **Step 5: Kiểm kiểu**

Run: `npx tsc --noEmit`
Expected: không lỗi liên quan tới `IntroOverlay.tsx`/spec vừa thêm.

- [ ] **Step 6: Commit**

```bash
git add src/components/IntroOverlay.tsx src/components/__tests__/IntroOverlay.spec.tsx
git commit -m "feat: thêm IntroOverlay — hoạt cảnh chào PWA (chữ T, wordmark, giọt nước, circle-reveal)"
```

---

## Task 4: Gắn `IntroOverlay` vào `main.tsx` + kiểm tay toàn luồng

**Files:**
- Modify: `src/main.tsx:1-33`

**Interfaces:**
- Consumes: `IntroOverlay` (Task 3).

- [ ] **Step 1: Sửa `src/main.tsx`**

File hiện tại (nguyên văn, để đối chiếu trước khi sửa):

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/offline'
import { donKhoaRacHeCu } from './lib/storage'
import { applyTheme, loadTheme, watchSystemTheme } from './lib/theme'
import { ErrorBoundary } from './components/ErrorBoundary'

donKhoaRacHeCu()
applyTheme(loadTheme())
watchSystemTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

registerServiceWorker()
```

Thay bằng:

```tsx
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerServiceWorker } from './lib/offline'
import { donKhoaRacHeCu } from './lib/storage'
import { applyTheme, loadTheme, watchSystemTheme } from './lib/theme'
import { ErrorBoundary } from './components/ErrorBoundary'
import { IntroOverlay } from './components/IntroOverlay'

donKhoaRacHeCu()
applyTheme(loadTheme())
watchSystemTheme()

// App mount NGAY (ngầm, dưới overlay) để kịp khởi tạo IndexedDB/context trong lúc intro đang chạy —
// hết overlay là App đã sẵn sàng, không có khoảng trắng/loading. Không cờ localStorage: overlay chỉ
// mount đúng một lần cho mỗi lần main.tsx thực thi, tức mỗi lần PWA khởi động thật.
function Root() {
  const [introDone, setIntroDone] = useState(false)
  return (
    <>
      <App />
      {!introDone && <IntroOverlay onFinished={() => setIntroDone(true)} />}
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>,
)

registerServiceWorker()
```

- [ ] **Step 2: Kiểm kiểu + toàn bộ test suite**

Run: `npx tsc --noEmit && npm test`
Expected: cả hai xanh, không ca nào trong bộ test hiện có (App.tsx, board/...) đỏ thêm vì đổi
`main.tsx` — các test đó `render(<App/>)` trực tiếp, không qua `main.tsx`/`Root`, nên không bị ảnh
hưởng.

- [ ] **Step 3: Kiểm tay trên trình duyệt — toàn luồng**

Dev server đã chạy sẵn. Mở Browser pane, `navigate` vào URL app, sau đó `javascript_tool` chạy
`window.location.reload()` để bắt đầu lại từ đầu vòng đời `main.tsx` (F5 thật = cold start), rồi:

1. `computer {action:"screenshot"}` vài lần cách nhau ~0.4-0.5s trong ~3s đầu — xác nhận đủ 6 pha:
   chữ T thu về, wordmark hiện, giữ nhịp, giọt nước rơi/nảy, bùng sáng + gợn sóng, vòng lan lộ dần
   HomeScreen — không có khoảng trắng giữa lúc overlay gỡ và HomeScreen hiện ra.
2. `read_console_messages` — không có lỗi nào (đặc biệt không có warning "Can't perform a React
   state update on an unmounted component" — dấu hiệu quên cleanup).
3. Sau khi overlay biến mất: `find` một phần tử chắc chắn nằm trên HomeScreen, `computer` click vào,
   xác nhận bấm được — overlay không còn chặn `pointer-events` sau khi đã gỡ khỏi DOM.
4. `resize_window` sang `mobile` rồi `tablet`, `navigate` reload lại ở mỗi kích thước — giọt nước và
   vòng lan vẫn đúng giữa canvas, phủ hết viewport (không để hở góc màn hình ở tỉ lệ khung hình hẹp).
5. `resize_window` với `colorScheme: "dark"` (không đổi kích thước) rồi reload — xác nhận màu logo
   VẪN là `--c-intro-blue` cố định, không đổi theo dark mode (đúng quyết định trong spec).
6. Bật giả lập `prefers-reduced-motion: reduce` (DevTools rendering tab nếu Browser pane hỗ trợ, hoặc
   `javascript_tool` ghi đè tạm `window.matchMedia` rồi reload) — xác nhận vào thẳng HomeScreen gần
   như ngay lập tức, không chạy animation.
7. Tinh chỉnh bằng mắt hai điểm spec để ngỏ: đối chiếu `--c-intro-blue`/độ đậm chữ Baloo 2 với 2 ảnh
   logo mẫu người dùng đã gửi đầu phiên brainstorm — chỉnh giá trị trong `src/index.css` (Task 2) và
   `font-extrabold`/kích cỡ trong `IntroOverlay.tsx` (Task 3) nếu lệch tông rõ rệt, rồi lặp lại bước
   1 để xác nhận.

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "feat: gắn IntroOverlay vào main.tsx — chạy mỗi lần PWA khởi động lại"
```

Nếu Step 3 phát sinh chỉnh sửa ở `src/index.css`/`IntroOverlay.tsx`, commit riêng các file đó với
message `fix: tinh chỉnh màu/độ đậm intro theo ảnh mẫu` — không gộp vào commit của `main.tsx`.
