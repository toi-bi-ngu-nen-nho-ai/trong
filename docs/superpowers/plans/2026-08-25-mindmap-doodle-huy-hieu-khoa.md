# Mindmap Doodle + Huy Hiệu Chuyên Khoa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay placeholder chung chung của `TheTrong` (ảnh xem trước khi bảng Mindmap chưa có nét vẽ thật) bằng nghệ thuật vẽ tay `MindMap.svg` cộng một huy hiệu icon chuyên khoa lồng bên trong, tự đổi theo `chuyên khoa` đang gắn với ngữ cảnh (bảng hoặc bộ lọc).

**Architecture:** Một component nghệ thuật thuần (`MindMapDoodle`) tách riêng khỏi component composition (`TheTrong` sửa lại) — đúng ranh giới "asset vẽ tay" vs "logic ghép nối + chuyên khoa" đã có sẵn trong codebase (`SpecialtyIcons.tsx` là asset, nơi gọi `specialtyIcon()` là composition). `TheTrong` nhận thêm prop `khoa?: string`, dùng `specialtyIcon()` đã có sẵn (không viết thêm icon nào) để vẽ huy hiệu, và tận dụng việc nó vốn đã nằm lồng bên trong nút `.the-bang-vat` (đã có tilt) nên không cần code tilt riêng cho huy hiệu.

**Tech Stack:** React 19 + TypeScript, Tailwind v4 (chỉ dùng cho vài class kích thước/bo góc), style inline cho phần cần token `--c-*`/màu chuyên khoa động (đúng quy ước hiện có của file). Test: Vitest + happy-dom + fake-indexeddb, dựng bằng `createRoot`/`act` (KHÔNG dùng @testing-library/react — file test hiện có không dùng thư viện đó).

**Spec:** Thiết kế đã duyệt trực tiếp trong hội thoại (không có file spec riêng — đây là việc Bounded theo phân loại của skill brainstorming, không qua bước viết spec kiến trúc). Toạ độ huy hiệu (~55%, 55%) và bố cục artwork đã được ĐO THẬT bằng `getBBox()` trên chính 8 path của `MindMap.svg` (không đoán): 2 path lớn (chỉ số 0, 1) choán gần hết khung 513×435 (x:30-492, y:30-414, tâm ~(260,225)); 6 path còn lại là một cụm chi tiết nhỏ ở góc trên-trái (x:30-110, y:30-110). Huy hiệu đặt ở (55%, 55%) để nằm giữa vùng mở của 2 path lớn, tránh đè lên cụm góc trên-trái.

## Global Constraints

- Mọi màu KHÔNG PHẢI màu chuyên khoa phải đọc từ token `--c-*` (DESIGN.md "Do read every color from a `--c-*` CSS custom property"). NGOẠI LỆ đã có tiền lệ trong chính file `src/data/specialties.ts` (đọc comment đầu file đó): `spec.color` là mã hex thuần, cố ý — nhiều chỗ nối thêm 2 ký tự alpha hex (`${spec.color}15`) để pha trong suốt, cú pháp đó không hoạt động với `var(--c-*)`. Dùng ĐÚNG cú pháp `${spec.color}15` đã có sẵn trong `src/App.tsx` (ví dụ dòng ~1325: `background: \`${spec.color}15\`, color: spec.color`) cho huy hiệu, không phát minh biến thể mới.
- Mọi stroke/fill trong SVG minh hoạ phải dùng `currentColor`, không hardcode hex — để tự đổi theo theme sáng/tối (đúng quy ước `SpecialtyIcons.tsx` và ghi chú PRODUCT.md về logo SVG).
- Không thêm JS chạy mỗi frame cho hiệu ứng vật liệu — surface brief Mindmap: "Material effects are bought with static SVG filters/patterns, never per-frame per-stroke JS." Component này chỉ là SVG tĩnh + CSS position tuyệt đối, không animation loop.
- `prefers-reduced-motion`: không áp dụng cho task này — không thêm animation/transition mới, artwork và huy hiệu đứng yên (tự nghiêng theo transform CSS đã có sẵn của `.the-bang-vat`, không phải animation riêng).
- KHÔNG đụng `src/vendor/blocksuite/**` — ngoài phạm vi hai task này.
- File test dùng `@vitest-environment happy-dom` + `import 'fake-indexeddb/auto'` + `createRoot`/`act` từ `react-dom/client`/`react`, KHÔNG dùng `@testing-library/react` (không có trong dependencies của file test hiện tại — giữ nhất quán).
- Chạy test bằng `npm test -- <đường dẫn file spec>` (script `test` = `vitest run`, xem `package.json:15`).

---

### Task 1: Component nghệ thuật `MindMapDoodle`

**Files:**
- Create: `src/board/MindMapDoodle.tsx`
- Test: `src/board/__tests__/MindMapDoodle.spec.ts`

**Interfaces:**
- Consumes: không phụ thuộc file nào khác trong 2 task này (component thuần, không nhận dữ liệu ngoài props).
- Produces: `export function MindMapDoodle(props: { className?: string }): React.ReactElement` — một `<svg>` gốc `viewBox="0 0 513 435"`, `fill="none"`, `stroke="currentColor"`, chứa ĐÚNG 8 phần tử `<path>` con (dữ liệu `d` lấy nguyên từ `MindMap.svg` nguồn, không sửa hình dạng). Task 2 import và dùng component này.

- [ ] **Step 1: Viết file component**

Tạo `src/board/MindMapDoodle.tsx`:

```tsx
// Nghệ thuật vẽ tay dùng làm nền placeholder cho bảng Mindmap chưa có nét vẽ thật (TheTrong,
// DanhSachBang.tsx). Nguồn: MindMap.svg do người dùng cung cấp — 8 path, đã ĐO bằng getBBox() thật
// (không đoán): 2 path đầu (chỉ số 0, 1) là nét scribble lớn choán gần hết khung 513×435
// (x:30-492, y:30-414, tâm ~(260,225)); 6 path còn lại là một cụm chi tiết nhỏ ở góc trên-trái
// (x:30-110, y:30-110). Nơi gọi (TheTrong) đặt huy hiệu chuyên khoa ở (55%, 55%) — giữa vùng mở
// của 2 path lớn, tránh đè lên cụm góc trên-trái.
//
// stroke đổi từ "#000000" (bản gốc) sang "currentColor" — để tự đổi theo theme sáng/tối như mọi
// icon khác trong app (xem SpecialtyIcons.tsx, PRODUCT.md mục Brand Commitments về logo SVG).
// Cả 8 path trong file gốc dùng CHUNG một bộ thuộc tính (fill="none" stroke stroke-width="3"
// stroke-linecap="round" stroke-linejoin="round") — hoisted lên thẻ <svg> cha thay vì lặp lại
// trên từng path, không đổi kết quả render.
export function MindMapDoodle({ className }: { className?: string }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 513 435"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M318.500000,413.000000 C319.941254,414.460388 321.786560,413.982971 323.500031,413.986572 C335.499969,414.011902 347.534729,414.583954 359.492432,413.872681 C381.216522,412.580505 402.755035,410.272064 423.064789,401.144196 C434.300201,396.094635 442.478790,387.926666 449.307800,378.362762 C452.633392,373.705353 452.041260,367.197052 452.946869,361.491577 C455.034454,348.339355 456.544281,335.106506 458.893463,321.980927 C460.755768,311.575623 461.562469,300.985413 463.030487,290.504272 C464.387268,280.817566 466.095154,271.180237 467.477020,261.496735 C469.401642,248.009750 470.846954,234.446838 473.080566,221.013397 C475.903595,204.034790 478.097260,186.962936 480.763336,169.962891 C482.398010,159.539337 483.829498,149.023148 485.083649,138.509979 C486.560028,126.134056 488.694916,113.837433 490.482605,101.497482 C491.010376,97.854591 492.205872,94.261139 491.494537,90.484032 C484.501434,89.490074 477.444885,88.768425 470.529266,87.356606 C467.996063,86.839447 467.656738,87.931572 466.998657,89.499443 C464.976837,94.316399 464.235168,99.477058 463.054840,104.512856 C462.646027,106.257072 463.950928,107.580811 464.924591,109.049973 C468.036987,113.746208 467.416168,118.104294 463.500031,122.000015 C460.422119,125.061920 456.009613,125.864159 452.500000,124.000015 C447.467133,121.326759 445.765015,117.002136 446.880219,111.475822 C447.269409,109.547089 448.289246,108.311005 449.549988,107.587021 C452.824768,105.706429 453.263611,102.938293 453.649780,99.516907 C454.104980,95.483452 453.606384,91.484016 454.036102,87.503899 C454.304169,85.020821 452.464996,84.779945 450.992157,84.550179 C442.841858,83.278725 434.667175,82.163055 426.498718,81.008980 C426.008514,80.939720 425.494385,81.049118 425.000824,80.992676 C416.812073,80.056107 416.813568,80.053406 414.999237,87.999825 C414.504272,90.167641 414.104126,92.364151 413.474304,94.492393 C412.640137,97.310982 413.144257,99.612656 414.934357,102.048248 C418.041290,106.275429 417.718262,109.904716 414.500000,113.500008 C410.533325,117.931450 407.000183,118.638062 402.000000,115.999985 C397.856415,113.813850 395.673920,109.371254 396.480682,104.996437 C396.845520,103.018105 397.994659,101.471718 399.537933,100.564514 C402.913147,98.580391 403.682404,95.300629 403.916718,91.994095 C404.246124,87.344826 404.000000,82.654762 404.000000,77.760353 C391.702362,75.937714 379.856873,74.182091 367.944672,72.416588 C365.196503,77.655510 364.558136,83.469841 363.048370,89.013176 C362.519745,90.954109 363.741486,92.390411 364.879913,94.080879 C368.677094,99.719254 366.374634,106.168297 360.000000,109.000015 C355.107605,111.173279 350.792480,109.619820 347.500031,104.499985 C345.361267,101.174202 345.697540,95.277977 349.087189,93.138115 C353.738495,90.201820 353.930145,86.026001 353.997375,81.499962 C354.014709,80.333557 354.000000,79.166664 354.000000,78.000000 C354.000000,70.179649 354.012085,70.095131 346.496948,69.021286 C337.000916,67.664391 327.482758,66.462578 317.764526,65.165901 C315.583374,69.924744 314.367859,75.255135 313.097412,80.523491 C312.492676,83.031303 313.185699,85.333595 315.340179,87.648743 C318.030762,90.540009 316.576660,96.939354 313.500000,100.000000 C310.416748,103.067177 305.209229,103.718132 301.500000,101.500008 C297.416901,99.058311 295.580505,94.633858 296.414703,90.482857 C296.801575,88.557602 297.551666,87.003021 299.029388,86.045357 C303.524231,83.132431 304.219879,78.762215 303.982574,74.000870 C303.816437,70.667526 305.274811,66.752693 303.302521,64.149628 C301.303070,61.510750 297.277252,62.328659 294.012878,61.901630 C286.139832,60.871716 278.339813,59.293339 270.495972,58.024990 C268.218597,57.656742 266.534393,58.409344 265.974792,60.994541 C265.068420,65.181473 263.795563,69.299103 263.089722,73.515022 C262.756500,75.505081 262.361511,77.474937 264.361938,79.628258 C268.110718,83.663559 266.933136,90.080338 262.489441,93.486237 C259.567047,95.726105 252.050690,96.143730 248.438446,91.548393 C245.386871,87.666344 244.599380,81.238411 248.635605,78.717087 C253.996857,75.368050 253.318787,70.636513 253.433334,65.998352 C253.699463,55.224380 253.548752,55.286186 243.002579,53.979218 C234.652542,52.944408 226.325531,51.723793 217.748642,50.552975 C214.647247,56.031643 213.817093,62.227432 212.868164,68.479988 C212.442627,71.283875 214.793686,71.753326 215.574615,73.465981 C217.455566,77.591019 216.441360,82.199432 212.500000,85.499992 C208.606308,88.760643 203.484238,88.965523 200.000000,85.999992 C195.885544,82.498077 194.964569,78.290565 196.888458,73.950554 C197.326859,72.961540 197.767822,72.076027 198.523041,71.531990 C206.495590,65.788788 202.458801,57.301319 203.405457,49.987762 C203.580154,48.638134 202.046738,48.145393 200.508072,47.939617 C190.159241,46.555580 179.796082,45.207920 169.523743,43.367493 C166.615143,42.846378 166.505112,44.357208 166.021530,46.006313 C164.952286,49.652676 163.663849,53.283318 163.108459,57.016136 C162.679626,59.898376 161.907455,62.710537 164.819565,65.677124 C168.381958,69.306160 166.531448,75.602997 162.000000,79.000008 C157.761292,82.177582 151.987610,81.536049 148.500000,77.500000 C145.092941,73.557175 144.657272,66.971069 148.591171,64.126076 C156.647675,58.299599 152.641220,50.129990 153.280975,42.980400 C153.516983,40.343086 149.643723,40.407787 147.488190,40.076981 C138.683197,38.725674 129.798462,37.872963 121.018723,36.389217 C117.903870,35.862820 116.710670,36.328323 115.901794,39.474754 C114.750137,43.954517 113.520905,48.374905 112.887535,52.984547 C112.647774,54.729481 112.880898,55.676453 113.930183,57.053211 C116.827217,60.854401 116.914078,66.426483 114.500000,69.500000 C111.120201,73.803047 106.959351,74.573570 100.969437,71.986801 C100.268135,71.333336 100.805473,70.747116 100.913155,69.987686 C102.130089,61.405247 95.148140,56.346977 85.543098,59.147812 C83.738441,59.674049 81.406097,59.726746 80.000000,61.500000" />
      <path d="M100.000000,72.500000 C93.906113,85.953690 85.098694,96.785263 70.999283,102.498238 C68.969208,103.320808 68.209305,104.809326 67.951233,106.994240 C66.369286,120.387177 64.080223,133.683121 62.177052,147.025253 C60.443535,159.178024 58.699558,171.338028 56.987236,183.498199 C54.873966,198.505722 52.665260,213.499802 50.500362,228.500046 C47.998787,245.833160 45.554752,263.174774 42.981926,280.497314 C41.073826,293.344299 38.886471,306.150299 37.035564,319.005127 C35.527340,329.479950 34.370548,340.004913 32.985100,350.498047 C32.235447,356.175751 31.480198,361.861206 30.413799,367.483643 C30.077818,369.255066 29.967918,370.833344 30.253620,372.753387 C47.305267,375.188385 64.202988,377.291138 80.986763,380.079681 C100.291664,383.287109 119.760551,385.334564 139.021317,388.884338 C151.407761,391.167175 164.014572,392.232483 176.494705,394.036682 C184.356476,395.173248 192.121124,397.167664 200.010468,397.884796 C212.435577,399.014221 224.657166,401.401123 236.994965,403.037964 C249.517776,404.699371 261.974762,406.867004 274.506897,408.445312 C287.817139,410.121643 300.973511,414.269196 314.476562,412.786560 C321.774841,411.985199 328.902863,409.217651 335.985596,406.954895 C350.960846,402.170776 365.356354,396.128387 378.010590,386.513916 C383.303619,382.492310 387.516296,377.338470 392.320923,372.696594 C402.219879,378.908661 412.313354,384.053650 423.517365,386.417694 C428.606110,387.491455 433.881012,388.219757 439.025208,386.060028 C439.674164,385.787537 440.666656,386.333344 441.500000,386.500031" />
      <path d="M96.500000,59.500000 C96.252090,57.890285 97.912750,57.543285 98.483253,56.490921 C99.547256,54.528221 103.097260,54.863491 102.952461,52.002407 C102.673698,46.494152 104.414314,40.991409 102.982613,35.504536 C102.463158,33.513771 100.692047,33.230858 98.999146,33.006416 C92.502815,32.145157 86.003136,31.309187 79.432556,30.454395 C78.154213,38.975414 76.122101,47.362225 76.046150,56.000404 C76.034523,57.322334 75.082466,57.716148 74.500000,58.500000" />
      <path d="M58.500000,36.500000 C57.121452,32.065018 53.786736,32.305408 50.519508,33.551163 C41.344273,37.049568 35.296829,44.006725 31.066595,52.533039 C28.209723,58.291248 30.245981,62.932636 35.960503,66.071899 C37.248711,66.779579 38.046558,67.027679 39.520584,66.565674 C50.368206,63.165684 56.785366,55.108135 61.357479,45.432652 C62.739460,42.508121 63.448780,38.495708 59.000000,36.500000" />
      <path d="M61.500000,49.000000 C68.166664,54.166668 74.740074,59.460487 81.538780,64.447128 C85.012863,66.995247 83.938354,69.573563 82.515785,72.507652 C80.706451,76.239433 77.972176,79.206039 75.000038,82.000038 C68.532463,88.079987 63.229267,88.401329 58.719051,81.359695 C54.858025,75.331619 49.340714,70.888123 45.500000,65.000000" />
      <path d="M58.500000,37.000000 C55.165722,50.301010 47.473110,59.572624 34.000000,63.500000" />
      <path d="M58.500000,82.000000 C57.169682,85.553444 56.735260,89.217590 56.988197,93.000786 C57.506580,100.754318 59.538570,102.909279 68.000000,104.500000" />
      <path d="M86.000000,94.000000 C93.179268,99.316399 99.309952,106.041840 107.363922,110.067223 C111.207283,108.488541 109.176102,106.029190 107.921455,104.567413 C102.776161,98.572693 97.333336,92.833328 92.000000,87.000000" />
    </svg>
  )
}
```

- [ ] **Step 2: Viết test dựng component**

Tạo `src/board/__tests__/MindMapDoodle.spec.ts`:

```ts
// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { MindMapDoodle } from '../MindMapDoodle'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('MindMapDoodle', () => {
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

  it('vẽ đúng viewBox 513×435 và đủ 8 path (không rớt/nhân đôi path nào so với nguồn)', async () => {
    await act(async () => {
      root.render(createElement(MindMapDoodle, {}))
    })
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('viewBox')).toBe('0 0 513 435')
    expect(container.querySelectorAll('svg > path')).toHaveLength(8)
  })

  it('stroke dùng currentColor (không hardcode #000) để tự đổi theo theme', async () => {
    await act(async () => {
      root.render(createElement(MindMapDoodle, {}))
    })
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('stroke')).toBe('currentColor')
  })

  it('className truyền vào gắn thẳng lên thẻ svg gốc', async () => {
    await act(async () => {
      root.render(createElement(MindMapDoodle, { className: 'w-full h-full opacity-40' }))
    })
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toBe('w-full h-full opacity-40')
  })
})
```

- [ ] **Step 3: Chạy test, xác nhận PASS**

Run: `npm test -- src/board/__tests__/MindMapDoodle.spec.ts`
Expected: 3/3 PASS. Nếu path bị lệch/thiếu (copy-paste sai), test đếm số path hoặc test khác sẽ đỏ trước khi sang Task 2.

- [ ] **Step 4: Commit**

```bash
git add src/board/MindMapDoodle.tsx src/board/__tests__/MindMapDoodle.spec.ts
git commit -m "feat(mindmap): thêm component MindMapDoodle (nghệ thuật vẽ tay cho placeholder bảng)"
```

---

### Task 2: `TheTrong` hiện huy hiệu chuyên khoa, hai nơi gọi truyền đúng nguồn khoa

**Files:**
- Modify: `src/board/DanhSachBang.tsx:51-59` (định nghĩa `TheTrong`), `src/board/DanhSachBang.tsx:179` (gọi trong thẻ bảng), `src/board/DanhSachBang.tsx:781` (gọi ở lưới rỗng toàn bộ) — ba vị trí, số dòng có thể xê dịch nhẹ nếu file đã đổi kể từ khi plan này viết; tìm bằng chuỗi `function TheTrong()` và `<TheTrong` nếu số dòng không khớp.
- Test: `src/board/__tests__/DanhSachBang.spec.ts` (thêm test mới vào cuối describe `'DanhSachBang'` đã có, KHÔNG tạo describe block mới)

**Interfaces:**
- Consumes: `MindMapDoodle` từ Task 1 — `import { MindMapDoodle } from './MindMapDoodle'` (cùng thư mục `src/board/`, không phải `./__tests__/...`). `specialtyIcon` đã có sẵn — `import { specialtyIcon } from '../components/SpecialtyIcons'` (đường dẫn tương đối từ `src/board/DanhSachBang.tsx`, xác nhận đúng vì `src/App.tsx` cũng import cùng file bằng `./components/SpecialtyIcons`). `SPECIALTIES` đã import sẵn ở đầu `DanhSachBang.tsx` (dòng 6), không thêm import mới cho nó.
- Produces: `TheTrong` đổi chữ ký từ `function TheTrong()` thành `function TheTrong({ khoa }: { khoa?: string })` — hàm PRIVATE (không export), chỉ hai call site trong CHÍNH file này dùng. Huy hiệu bên trong có `data-testid="huy-hieu-chuyen-khoa"` và `data-khoa={khoa ?? ''}` (thuộc tính dùng để test xác nhận đúng chuyên khoa đang hiện, không phải để style).

- [ ] **Step 1: Viết test cho hành vi mới (test-first, sẽ FAIL ở bước sau vì `TheTrong` chưa đổi)**

Thêm vào cuối `describe('DanhSachBang', () => { ... })` trong `src/board/__tests__/DanhSachBang.spec.ts`, ngay trước dấu `})` đóng describe cuối file (giữ nguyên `beforeEach`/`afterEach` đã có ở đầu describe, không viết lại):

```ts
  it('bảng CHƯA có anhXemTruoc → huy hiệu chuyên khoa khớp bang.chuyenKhoa', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-khoa-1', ten: 'Bảng tim mạch', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    const huyHieu = container.querySelector('[data-testid="the-bang"] [data-testid="huy-hieu-chuyen-khoa"]')
    expect(huyHieu).not.toBeNull()
    expect(huyHieu?.getAttribute('data-khoa')).toBe('cardiology')
  })

  it('đổi chuyên khoa qua popover "Chuyên khoa/tag" → huy hiệu đổi theo NGAY, không cần mở lại thẻ', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-khoa-2', ten: 'Bảng chờ đổi khoa', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="menu-bang-bang-khoa-2"]')).not.toBeNull()
    })

    expect(
      container.querySelector('[data-testid="the-bang"] [data-testid="huy-hieu-chuyen-khoa"]')?.getAttribute('data-khoa'),
    ).toBe('cardiology')

    await act(async () => {
      ;(container.querySelector('[data-testid="menu-bang-bang-khoa-2"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="sua-tag-bang-khoa-2"]') as HTMLButtonElement).click()
    })
    const chon = container.querySelector('[data-testid="chon-chuyen-khoa-bang-khoa-2"]') as HTMLSelectElement
    await act(async () => {
      chon.value = 'pulmonology'
      chon.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(
      container.querySelector('[data-testid="the-bang"] [data-testid="huy-hieu-chuyen-khoa"]')?.getAttribute('data-khoa'),
    ).toBe('pulmonology')
  })

  it('bảng THIẾU chuyenKhoa (bản ghi cũ) → huy hiệu coi như chuyên khoa đầu tiên, không NHẢY xuống icon mặc định', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, { id: 'bang-khoa-cu', ten: 'Bảng cũ', taoLuc: bayGio, capNhatLuc: bayGio })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"]')).not.toBeNull()
    })

    const huyHieu = container.querySelector('[data-testid="the-bang"] [data-testid="huy-hieu-chuyen-khoa"]')
    expect(huyHieu?.getAttribute('data-khoa')).toBe(SPECIALTIES[0].id)
  })

  it('bảng ĐÃ có anhXemTruoc (ảnh thật) → KHÔNG hiện huy hiệu, tránh đè lên nét vẽ thật', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-co-anh', ten: 'Bảng có ảnh', taoLuc: bayGio, capNhatLuc: bayGio,
      anhXemTruoc: 'data:image/png;base64,iVBORw0KGgo=', chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="the-bang"] img')).not.toBeNull()
    })

    expect(container.querySelector('[data-testid="the-bang"] [data-testid="huy-hieu-chuyen-khoa"]')).toBeNull()
  })

  it('lưới rỗng toàn bộ, CHƯA lọc chuyên khoa → huy hiệu trung tính (data-khoa rỗng)', async () => {
    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
    })

    // Lưới hoàn toàn không có bảng nào → dải chip lọc chuyên khoa cũng không render (gate cùng
    // điều kiện `danhSach.filter(...).length > 0` với ô tìm, xem DanhSachBang.tsx) — huy hiệu ở
    // trạng thái rỗng vẫn phải render, chỉ là trung tính (không có chip nào để lọc theo).
    const huyHieu = container.querySelector('[data-testid="huy-hieu-chuyen-khoa"]')
    expect(huyHieu).not.toBeNull()
    expect(huyHieu?.getAttribute('data-khoa')).toBe('')
  })

  it('lưới rỗng do LỌC hết (chip chuyên khoa) → huy hiệu đổi theo chip đang chọn', async () => {
    const bayGio = Date.now()
    await idbPut(IDB_STORES.boards, {
      id: 'bang-khoa-khac', ten: 'Bảng tim mạch', taoLuc: bayGio, capNhatLuc: bayGio,
      chuyenKhoa: 'cardiology', tags: [], noiDungTimKiem: '',
    })

    await act(async () => {
      root.render(createElement(DanhSachBang, { onMoBang: () => {} }))
    })
    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="chip-chuyen-khoa-pulmonology"]')).not.toBeNull()
    })

    await act(async () => {
      ;(container.querySelector('[data-testid="chip-chuyen-khoa-pulmonology"]') as HTMLButtonElement).click()
    })

    await choDenKhi(() => {
      expect(container.querySelector('[data-testid="tao-bang"]')).not.toBeNull()
      expect(container.querySelectorAll('[data-testid="the-bang"]')).toHaveLength(0)
    })

    const huyHieu = container.querySelector('[data-testid="huy-hieu-chuyen-khoa"]')
    expect(huyHieu?.getAttribute('data-khoa')).toBe('pulmonology')
  })
```

- [ ] **Step 2: Chạy test, xác nhận FAIL đúng lý do (TheTrong chưa nhận prop `khoa`, chưa có huy hiệu)**

Run: `npm test -- src/board/__tests__/DanhSachBang.spec.ts`
Expected: 6 test mới FAIL — lỗi `huyHieu` là `null` (chưa có `[data-testid="huy-hieu-chuyen-khoa"]` trong DOM) hoặc tương đương. Các test CŨ trong cùng file vẫn phải PASS nguyên trạng (chưa sửa `TheTrong` ở bước này).

- [ ] **Step 3: Sửa `TheTrong` — nhận prop `khoa`, ghép `MindMapDoodle` + huy hiệu**

Trong `src/board/DanhSachBang.tsx`, thêm import (đặt cạnh các import tương đối đã có ở đầu file, sau dòng `import { SPECIALTIES } from '../data'`):

```ts
import { specialtyIcon } from '../components/SpecialtyIcons'
import { MindMapDoodle } from './MindMapDoodle'
```

Thay toàn bộ hàm `TheTrong` hiện tại (dòng 51-59):

```tsx
function TheTrong() {
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full opacity-40" aria-hidden="true">
      <circle cx="60" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="80" y1="50" x2="120" y2="50" stroke="currentColor" strokeWidth="2" />
      <rect x="120" y="35" width="40" height="30" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
```

bằng:

```tsx
// khoa: id chuyên khoa để tô màu + chọn icon cho huy hiệu — undefined khi không có ngữ cảnh chuyên
// khoa nào (lưới rỗng toàn bộ, chưa lọc gì). specialtyIcon() đã tự xử lý id lạ/undefined bằng icon
// "trang giấy" mặc định (xem SpecialtyIcons.tsx), TheTrong không cần thêm nhánh dự phòng cho icon —
// chỉ cần tự lo phần MÀU (spec undefined thì không có spec.color để đọc).
function TheTrong({ khoa }: { khoa?: string }) {
  const spec = SPECIALTIES.find((s) => s.id === khoa)
  return (
    <div className="relative w-full h-full" aria-hidden="true">
      <MindMapDoodle className="w-full h-full opacity-40" />
      {/* Huy hiệu chuyên khoa lồng bên trong artwork, đặt ở (55%, 55%) — tâm vùng mở của 2 nét
          scribble lớn trong MindMap.svg (đo bằng getBBox() thật, xem MindMapDoodle.tsx), tránh đè
          lên cụm chi tiết nhỏ ở góc trên-trái. KHÔNG cần code tilt riêng: TheTrong vốn đã nằm bên
          trong nút .the-bang-vat (thẻ bảng) hoặc div .empty-breathe (lưới rỗng) — huy hiệu tự
          nghiêng/thở theo transform của cha vì cùng nằm trong một cây DOM đang biến đổi, không phải
          một layer tách rời. Màu dùng cú pháp `${spec.color}15` đã có sẵn trong App.tsx (không phải
          token --c-*): xem Global Constraints của kế hoạch này — spec.color là ngoại lệ cố ý. */}
      <div
        aria-hidden="true"
        data-testid="huy-hieu-chuyen-khoa"
        data-khoa={khoa ?? ''}
        style={{
          position: 'absolute',
          top: '55%',
          left: '55%',
          transform: 'translate(-50%, -50%)',
          width: '32%',
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: spec ? `${spec.color}15` : 'var(--c-surface-alt, #f6f7fd)',
          color: spec ? spec.color : 'var(--c-text-muted, #6b6e96)',
        }}
      >
        {specialtyIcon(khoa, 'w-[60%] h-[60%]')}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Sửa hai nơi gọi `TheTrong`**

Trong `src/board/DanhSachBang.tsx`, tìm `<TheTrong />` bên trong `TheBang` (khối `{bang.anhXemTruoc ? (<img .../>) : (<TheTrong />)}`), đổi thành:

```tsx
<TheTrong khoa={bang.chuyenKhoa ?? SPECIALTIES[0].id} />
```

Tìm `<TheTrong />` còn lại (bên trong `<div className="empty-breathe" ...>` của nhánh `danhSachSapXep.length === 0`), đổi thành:

```tsx
<TheTrong khoa={chuyenKhoaLoc ?? undefined} />
```

Không đổi gì khác trong hai khối JSX này (wrapper `<div className="empty-breathe" ...>` và điều kiện `bang.anhXemTruoc ? ... : ...` giữ nguyên).

- [ ] **Step 5: Chạy lại test, xác nhận PASS toàn bộ file**

Run: `npm test -- src/board/__tests__/DanhSachBang.spec.ts`
Expected: TẤT CẢ test trong file (cả cũ lẫn 6 test mới) PASS. Nếu một test CŨ đỏ, đó là hồi quy — dừng lại, không sang bước tiếp cho tới khi hiểu rõ nguyên nhân (không phải lỗi "flaky", file này vốn không flaky).

- [ ] **Step 6: `tsc --noEmit` sạch**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: không có lỗi type mới liên quan `MindMapDoodle.tsx`/`DanhSachBang.tsx` (props `khoa?: string`, import `specialtyIcon`/`MindMapDoodle` phải khớp chữ ký thật).

- [ ] **Step 7: Commit**

```bash
git add src/board/DanhSachBang.tsx src/board/__tests__/DanhSachBang.spec.ts
git commit -m "feat(mindmap): TheTrong hiện MindMapDoodle + huy hiệu chuyên khoa, tự đổi theo bang.chuyenKhoa/chuyenKhoaLoc"
```
