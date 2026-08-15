# Chặng P1-D — siết phép so khớp bản dịch · Kế hoạch thi hành

> **Cho người/agent thi hành:** KỸ NĂNG BẮT BUỘC: dùng `superpowers:subagent-driven-development`
> (khuyến nghị) hoặc `superpowers:executing-plans` để làm từng task một. Các bước dùng cú pháp
> checkbox (`- [ ]`) để theo dõi.

**Mục tiêu:** Đổi phép trả lời câu hỏi *"bản dịch này có mặt không"* từ so khớp **chuỗi con** sang
so khớp **literal trọn vẹn**, ở cả hai chỗ đang dùng nó, và cấm hai khoá dịch ra cùng một chuỗi.

**Kiến trúc:** Một module thuần mới (`scripts/so-khop-ban-dich.mjs`) giữ mọi phép so khớp. Hai chỗ
gọi nó bằng hai hàm khác nhau vì hai loại văn bản khác nhau: `dist/` đã minify nên chấp cả ba kiểu
nháy; `.vendor-build/` thì bản dịch được chèn bằng đúng `JSON.stringify` nên tìm chính xác dạng đó.

**Công nghệ:** Node ESM (`.mjs`), vitest, TypeScript chỉ để khai kiểu (`.d.mts`). Không thêm phụ
thuộc nào.

**Spec có thẩm quyền:** `docs/superpowers/specs/2026-08-15-siet-so-khop-ban-dich-design.md`

## Ràng buộc toàn cục

- **Không thêm phụ thuộc nào.** Không thêm mục nào vào `package.json`.
- **`src/board/vi.json` phải vẫn ĐÚNG 5 KHOÁ khi chặng xong.** Khoá thử dùng để lấy bằng chứng đỏ
  **không được đi vào commit**. Sau mỗi lượt lấy bằng chứng: `git checkout src/board/vi.json`, rồi
  xác nhận `git status --short` không thấy file đó.
- **Không đụng** `src/data/antibiotics.ts` (dữ liệu lâm sàng), `src/vendor/blocksuite/` (luật D11),
  `src/board/extensions.ts`.
- **Ca kiểm phải nằm dưới `src/**/__tests__/**/*.spec.ts`.** `vite.config.ts` khai
  `include: ['src/**/__tests__/**/*.spec.ts']`; một file spec đặt trong `scripts/` sẽ **không bao
  giờ chạy** và cổng sẽ xanh vì không có ca nào.
- **Mọi ca kiểm phải THẬT SỰ ĐỎ trước khi có mã sửa.** Chép nguyên văn thông báo lỗi thật vào báo
  cáo; không nhận suy luận từ mã.
- **KHÔNG BAO GIỜ nối `| tail` vào `npm test` hay `npx vitest`.** Vitest in chi tiết ca đỏ **trước**
  khối tổng kết nên `tail` vứt đúng phần cần giữ, và ống dẫn nuốt luôn exit code. Ghi ra file rồi
  đọc: `npx vitest run --reporter=verbose > kq.txt 2>&1`. Dự án đã mất thông điệp lỗi ba lần vì
  đúng lỗi thao tác này.
- **Chữ trong mã và tài liệu viết tiếng Việt**, theo đúng lối các script hiện có.
- **Bảy cổng phải xanh trước khi coi chặng là xong:** `npx tsc --noEmit` · `npm test` ·
  `npm run kiem:vendor` · `npm run kiem:vendor-paths` · `npm run kiem:vendor-build` ·
  `npm run build` · `npm run kiem:dist`.
- **Nhiễu đã biết:** `bang-bam-vendor.json` và `tsconfig.vendor-paths.json` sẽ hiện là đã sửa sau
  khi chạy cổng — chỉ lệch CRLF/LF. **Đừng commit chúng, đừng cố sửa chúng.**
- **Điều kiện tiên quyết:** `.vendor-build/` và `dist/` phải tồn tại. Hiện đã có sẵn và xanh.

---

## Task 1: Module so khớp — ba hàm thuần

**Files:**
- Tạo: `scripts/so-khop-ban-dich.mjs`
- Tạo: `scripts/so-khop-ban-dich.d.mts`
- Tạo: `src/__tests__/vendor-so-khop.spec.ts`

**Interfaces:**
- Dùng của trước đó: không có.
- Sinh ra cho task sau:
  - `dangTrongNhay(s: string, nhay: string): string` — dạng đã thoát của `s` khi nằm trong literal dùng ký tự `nhay`.
  - `coNhuLiteral(noiDung: string, s: string): boolean` — dùng cho `dist/`.
  - `coDungNhuDaChen(noiDung: string, s: string): boolean` — dùng cho `.vendor-build/`.
  - `timTrungBanDich(banDo: Record<string, string>): Array<{ vi: string; khoa: string[] }>`

> ⚠️ **CẢNH BÁO (thêm sau lượt review toàn nhánh P1-D, I2) — các khối mã ở Bước 1–4 dưới đây là
> BẢN NHÁP ĐÃ BỊ THAY, đừng thi hành nguyên văn.** Chúng còn dùng `nhayHoa(s)` — hàm thoát theo
> MỘT quy ước duy nhất (`JSON.stringify(s).slice(1, -1)`, tức quy ước của nháy KÉP) rồi đem áp
> cho cả ba kiểu nháy khi dò `dist/`. Đó chính là con bug mà lượt vá Task 1 thật đã sửa: literal
> **backtick** không cần thoát `"`, nhưng quy ước JSON lại thoát nó thành `\"` — khớp trượt, đỏ
> giả trên bản dịch hợp lệ. Cả 5 bản dịch đang ship đều nằm trong literal backtick, nên đây không
> phải một ca biên hiếm.
>
> Giao diện THẬT đã thi hành là `dangTrongNhay(s, nhay)` — nhận thêm ký tự `nhay` và thoát theo
> ĐÚNG luật của kiểu nháy đó (xem §4.2 của spec, và mã nguồn có chú thích đầy đủ tại
> `scripts/so-khop-ban-dich.mjs`, `scripts/so-khop-ban-dich.d.mts`,
> `src/__tests__/vendor-so-khop.spec.ts`). Nếu thi hành lại chặng này từ đầu, hãy đọc mã nguồn đó
> làm nguồn thật, không phải các khối mã bên dưới. Đừng dựng lại `nhayHoa` ở bất cứ đâu — xem
> thêm ghi chú tương tự ở Task 4 bên dưới.

- [ ] **Bước 1: Viết ca kiểm đỏ**

Tạo `src/__tests__/vendor-so-khop.spec.ts`:

```ts
// Phép so khớp bản dịch — thay cho `includes` chuỗi con.
//
// Vì sao chuỗi con là phép SAI cho câu hỏi này: một bản dịch ngắn là chuỗi con của một bản dịch
// khác thì nó được tính "có mặt" nhờ chuỗi của khoá khác, kể cả khi chỗ của chính nó đã bị
// tree-shake. Đo trên dist/ thật (2026-08-15): "Phong" khớp thô vào "Phong cách" đang ship.
import { describe, expect, it } from 'vitest'

import {
  coDungNhuDaChen,
  coNhuLiteral,
  nhayHoa,
  timTrungBanDich,
} from '../../scripts/so-khop-ban-dich.mjs'

describe('coNhuLiteral — dùng cho dist/ đã minify', () => {
  it('thấy literal nháy kép', () => {
    expect(coNhuLiteral('const a={label:"Phong cách"}', 'Phong cách')).toBe(true)
  })

  it('thấy cả nháy đơn và backtick — kiểu nháy do bộ đóng gói chọn', () => {
    expect(coNhuLiteral("const a={label:'Bố cục'}", 'Bố cục')).toBe(true)
    expect(coNhuLiteral('const a=`Thêm ảnh`', 'Thêm ảnh')).toBe(true)
  })

  // CA GHIM ĐÚNG CON BUG ĐANG SỬA. Phép cũ `includes` trả true ở đây và đó là xanh giả.
  it('chuỗi là TIỀN TỐ của literal dài hơn thì KHÔNG khớp', () => {
    const js = 'const a={label:"Tô màu"}'
    expect(js.includes('Tô')).toBe(true) // phép CŨ khớp — đây là lỗi
    expect(coNhuLiteral(js, 'Tô')).toBe(false) // phép MỚI loại đúng
  })

  it('chuỗi là HẬU TỐ hoặc nằm giữa literal dài hơn thì KHÔNG khớp', () => {
    expect(coNhuLiteral('const a={label:"Tô màu"}', 'màu')).toBe(false)
    expect(coNhuLiteral('const a={label:"Xoá cả dòng"}', 'cả')).toBe(false)
  })

  // Bản dịch chứa dấu nháy hay gạch chéo phải so theo dạng ĐÃ THOÁT, vì đó là dạng nó nằm trong
  // mã. So thô sẽ trượt và cổng đỏ giả trên một bản dịch hoàn toàn hợp lệ.
  it('bản dịch chứa dấu nháy kép hoặc gạch chéo khớp đúng dạng đã thoát', () => {
    expect(coNhuLiteral('const a={label:"Nhấn \\"OK\\""}', 'Nhấn "OK"')).toBe(true)
    expect(coNhuLiteral('const a={label:"Ngăn cách\\\\dòng"}', 'Ngăn cách\\dòng')).toBe(true)
  })
})

describe('coDungNhuDaChen — dùng cho .vendor-build/ chưa minify', () => {
  // dich-chuoi-vendor.mjs chèn bản dịch bằng đúng JSON.stringify, nên ở cây đó phép so khớp
  // chính xác được, không cần chấp ba kiểu nháy.
  it('khớp đúng dạng JSON.stringify và từ chối kiểu nháy khác', () => {
    expect(coDungNhuDaChen('x = {label: "Phong cách"}', 'Phong cách')).toBe(true)
    expect(coDungNhuDaChen("x = {label: 'Phong cách'}", 'Phong cách')).toBe(false)
  })

  it('vẫn loại được ca tiền tố', () => {
    expect(coDungNhuDaChen('x = {label: "Tô màu"}', 'Tô')).toBe(false)
  })
})

describe('timTrungBanDich', () => {
  it('rỗng khi mọi bản dịch đều duy nhất', () => {
    expect(timTrungBanDich({ Style: 'Phong cách', Layout: 'Bố cục' })).toEqual([])
  })

  // Phép chặt KHÔNG cứu được ca này: hai chuỗi bằng nhau từng ký tự, nên một cái còn sống trong
  // dist/ là cả hai được tính có mặt. Phải chặn ở bảng dịch.
  it('gom đúng nhóm khi nhiều khoá dùng chung một bản dịch', () => {
    expect(timTrungBanDich({ Delete: 'Xoá', Remove: 'Xoá', Style: 'Phong cách' })).toEqual([
      { vi: 'Xoá', khoa: ['Delete', 'Remove'] },
    ])
  })
})

describe('nhayHoa', () => {
  it('trả dạng đã thoát, không kèm dấu nháy bao ngoài', () => {
    expect(nhayHoa('Nhấn "OK"')).toBe('Nhấn \\"OK\\"')
  })
})
```

- [ ] **Bước 2: Chạy để xác nhận ĐỎ**

Chạy: `npx vitest run --reporter=verbose src/__tests__/vendor-so-khop.spec.ts > kq-do.txt 2>&1`

Đọc `kq-do.txt`. Kỳ vọng: **FAIL** — vitest không phân giải được import, thông báo dạng
`Failed to load url ../../scripts/so-khop-ban-dich.mjs` hoặc `Cannot find module`. Chép nguyên văn
vào báo cáo task.

- [ ] **Bước 3: Viết module**

Tạo `scripts/so-khop-ban-dich.mjs`:

```js
// Phép so khớp bản dịch — thay cho `includes` chuỗi con ở luật C và ở chẩn đoán cây vendored.
//
// VÌ SAO CHUỖI CON LÀ PHÉP SAI. Câu hỏi thật là "bản dịch này có tới được người dùng không", và
// `includes` trả lời nhầm khi một bản dịch ngắn là chuỗi con của một bản dịch KHÁC: nó được tính
// "có mặt" nhờ chuỗi của khoá khác, kể cả khi chỗ của chính nó đã bị tree-shake. Đo trên dist/
// thật ngày 2026-08-15, dùng tiền tố của các bản dịch đang ship:
//
//   "Phong"  thô: true  | chặt: false   <-- phép thô KHỚP NHẦM vào "Phong cách"
//   "Bố"     thô: true  | chặt: false   <-- phép thô KHỚP NHẦM vào "Bố cục"
//   "Thêm"   thô: true  | chặt: false   <-- phép thô KHỚP NHẦM vào "Thêm ảnh"
//
// Ở 5 khoá hiện tại lỗi không thể lộ (cả 5 đều >=6 ký tự, phân biệt, không cái nào là chuỗi con
// của cái nào) — đó là MAY MẮN CỦA QUY MÔ NHỎ, không phải tính chất được canh. Tiếng Việt chia
// nhau tiền tố rất nhiều (`Xoá` / `Xoá dòng`), nên ở vài trăm khoá đây là chuyện SẼ xảy ra.
//
// VÌ SAO HAI HÀM CHỨ KHÔNG MỘT. Hai chỗ gọi hỏi cùng một câu nhưng trên hai loại văn bản khác
// hẳn nhau, nên phép chặt nhất khả dĩ ở mỗi chỗ là khác nhau — xem chú thích từng hàm. Để chúng
// ở hai file là mời hai bên lệch nhau đúng vào lúc một bên đổi cách so khớp; đó là lý do
// duyet-cay-js.mjs được tách ra dùng chung ở P1-B.

// Dạng ĐÃ THOÁT của chuỗi, tức đúng cái nằm giữa hai dấu nháy trong mã. Bản dịch chứa `"` hay `\`
// nằm trong mã dưới dạng đã thoát, nên so thô sẽ trượt và cổng đỏ giả trên bản dịch hợp lệ.
export function nhayHoa(s) {
  return JSON.stringify(s).slice(1, -1)
}

// Dùng cho `dist/`. Bản build đã minify nên KIỂU NHÁY do bộ đóng gói chọn, không đoán trước được —
// phải chấp cả ba. Đã kiểm trên dist/ hiện tại: cả 5 bản dịch đang ship đều qua phép này, và bộ
// minify KHÔNG thoát tiếng Việt thành \uXXXX (nếu nó thoát thì phép này sẽ trượt hết và bản vá
// sẽ PHÁ luật C thay vì siết nó — đó là rủi ro đã được loại trước khi thiết kế).
export function coNhuLiteral(noiDung, s) {
  const e = nhayHoa(s)
  return (
    noiDung.includes('"' + e + '"') ||
    noiDung.includes("'" + e + "'") ||
    noiDung.includes('`' + e + '`')
  )
}

// Dùng cho `.vendor-build/`. Cây đó là đầu ra `tsc` CHƯA minify, và bản dịch được chèn vào bằng
// đúng `JSON.stringify(chuoiDich)` trong luat-vi-tri-dich.mjs. Nên ở đây so khớp chính xác được —
// chặt hơn phép ba-kiểu-nháy, và không có chỗ nào mơ hồ. Đã kiểm: cả 5 bản dịch có mặt đúng dạng
// này trong cây hiện tại.
export function coDungNhuDaChen(noiDung, s) {
  return noiDung.includes(JSON.stringify(s))
}

// Hai khoá cùng dịch ra MỘT chuỗi y hệt là lớp lỗi mà phép chặt KHÔNG cứu được — hai chuỗi bằng
// nhau từng ký tự, nên một cái còn sống trong dist/ là cả hai được tính có mặt. Chặn ở bảng dịch
// là nơi duy nhất chặn được.
export function timTrungBanDich(banDo) {
  const theoGiaTri = new Map()
  for (const [khoa, vi] of Object.entries(banDo)) {
    if (typeof vi !== 'string') continue
    if (!theoGiaTri.has(vi)) theoGiaTri.set(vi, [])
    theoGiaTri.get(vi).push(khoa)
  }
  return [...theoGiaTri.entries()]
    .filter(([, khoa]) => khoa.length > 1)
    .map(([vi, khoa]) => ({ vi, khoa }))
}
```

Tạo `scripts/so-khop-ban-dich.d.mts`:

```ts
// Khai kiểu cho scripts/so-khop-ban-dich.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
// (Cùng lý do scripts/luat-vi-tri-dich.d.mts và scripts/tim-ban-dich-vendor.d.mts tồn tại.)

export interface NhomTrung {
  vi: string
  khoa: string[]
}

export declare function nhayHoa(s: string): string

export declare function coNhuLiteral(noiDung: string, s: string): boolean

export declare function coDungNhuDaChen(noiDung: string, s: string): boolean

export declare function timTrungBanDich(banDo: Record<string, string>): NhomTrung[]
```

- [ ] **Bước 4: Chạy để xác nhận XANH**

Chạy: `npx vitest run --reporter=verbose src/__tests__/vendor-so-khop.spec.ts > kq-xanh.txt 2>&1`

Đọc `kq-xanh.txt`. Kỳ vọng: **PASS**. (Số ca thật sau lượt vá Task 1 là **15** — lượt vá thêm 5 ca cho `dangTrongNhay` và ca hồi quy backtick.)

- [ ] **Bước 5: Kiểm kiểu**

Chạy: `npx tsc --noEmit`
Kỳ vọng: exit 0, không in gì.

- [ ] **Bước 6: Commit**

```bash
git add scripts/so-khop-ban-dich.mjs scripts/so-khop-ban-dich.d.mts src/__tests__/vendor-so-khop.spec.ts
git commit -m "P1-D task 1: module so khớp bản dịch theo literal trọn vẹn"
```

---

## Task 2: Cổng cấm hai khoá dịch ra cùng một chuỗi

**Files:**
- Sửa: `scripts/kiem-dist.mjs` — thêm import, đổi cách nạp `vi.json`, thêm cổng DỪNG

**Interfaces:**
- Dùng của Task 1: `timTrungBanDich(banDo)`.
- Sinh ra: không có API mới. Đầu ra là một cổng DỪNG mới với exit code 1.

**Vì sao cổng này nằm ở `kiem-dist.mjs` chứ không ở Cổng 0 của `dich-chuoi-vendor.mjs`:** chính file
`kiem-dist.mjs` đã ghi (dòng ~59-63) rằng Cổng 0 **KHÔNG nằm trên đường `npm run build`** —
`prebuild` chỉ chạy `kiem-vendor-build` + `kiem-vendor-paths`, còn `postinstall` bỏ qua nhanh khi
`.vendor-build/` đã hợp lệ. Ở mọi lượt build dùng cây vendor có sẵn, **luật C là lớp cuối cùng và
duy nhất**. Cũng KHÔNG nhân đôi sang Cổng 0: review P1-B đã ghi "bất biến nhân đôi ở hai nơi" là nợ.

- [ ] **Bước 1: Thêm import**

Trong `scripts/kiem-dist.mjs`, tìm dòng:

```js
import { soanThongBaoThieu, timTrongCayVendor } from './tim-ban-dich-vendor.mjs'
```

Thay bằng:

```js
import { timTrungBanDich } from './so-khop-ban-dich.mjs'
import { soanThongBaoThieu, timTrongCayVendor } from './tim-ban-dich-vendor.mjs'
```

- [ ] **Bước 2: Giữ lại object bản đồ dịch khi nạp**

Tìm:

```js
// Luật C — bản dịch phải tới được tay người dùng.
const MUC_BAN_DICH = Object.entries(
  JSON.parse(readFileSync(path.join(GOC, 'src/board/vi.json'), 'utf8')),
)
const BAN_DICH = MUC_BAN_DICH.map(([, vi]) => vi)
```

Thay bằng:

```js
// Luật C — bản dịch phải tới được tay người dùng.
const BAN_DO = JSON.parse(readFileSync(path.join(GOC, 'src/board/vi.json'), 'utf8'))
const MUC_BAN_DICH = Object.entries(BAN_DO)
const BAN_DICH = MUC_BAN_DICH.map(([, vi]) => vi)
```

- [ ] **Bước 3: Thêm cổng cấm trùng**

Trong cùng file, tìm dòng cuối của khối kiểm `MUC_XAU` (ngay trước comment
`// Nhận ra file thuộc cây bảng vẽ đã vendored bằng MẬT ĐỘ`):

```js
  MUC_XAU.forEach(([en, vi]) => console.error(`   "${en}" → ${JSON.stringify(vi)}`))
  process.exit(1)
}
```

Thêm NGAY SAU khối đó:

```js
// Hai khoá cùng dịch ra MỘT chuỗi y hệt là lớp lỗi mà phép so khớp chặt KHÔNG cứu được: hai chuỗi
// bằng nhau từng ký tự, nên chỉ cần một trong hai còn sống trong dist/ là CẢ HAI được đếm là "có
// mặt" — kể cả khi chỗ của cái kia đã bị tree-shake. Mẫu số của luật C sai mà không ai biết.
//
// Đây là ràng buộc BIÊN TẬP, chủ dự án đã chốt: không được dịch `Delete` và `Remove` cùng thành
// "Xoá" — phải chọn chữ khác nhau, hoặc bỏ bớt một khoá.
//
// Đặt ở đây chứ không ở Cổng 0 của dich-chuoi-vendor.mjs vì cổng đó KHÔNG nằm trên đường
// `npm run build` (xem chú thích sàn rỗng phía trên) — luật C là lớp duy nhất chắc chắn chạy.
const TRUNG = timTrungBanDich(BAN_DO)
if (TRUNG.length) {
  console.error(
    `kiem-dist: DỪNG — ${TRUNG.length} bản dịch trong src/board/vi.json bị nhiều khoá dùng chung. ` +
      'Luật C tìm bản dịch trong dist/ theo GIÁ TRỊ, nên hai khoá cùng giá trị thì một cái còn ' +
      'sống là cả hai được tính "có mặt" — mẫu số sai mà cổng vẫn xanh. Đổi chữ cho khác nhau, ' +
      'hoặc bỏ bớt khoá:',
  )
  TRUNG.forEach(({ vi, khoa }) =>
    console.error(`   ${JSON.stringify(vi)} ← ${khoa.map((k) => `"${k}"`).join(', ')}`),
  )
  process.exit(1)
}
```

- [ ] **Bước 4: Xác nhận đường XANH không đổi**

Chạy: `npm run kiem:dist`

Kỳ vọng: exit 0, in đúng như trước, gồm `bản dịch vi.json — 5/5 có mặt` và dòng cuối
`kiem-dist: xanh — không còn "affine-" và mọi biến --drt-* dùng đều có định nghĩa.`

- [ ] **Bước 5: BẰNG CHỨNG ĐỎ — cổng cấm trùng**

Thêm tay hai khoá cùng giá trị vào `vi.json` rồi chạy cổng (KHÔNG cần dựng lại cây):

```bash
node -e "const f='src/board/vi.json';const fs=require('fs');const j=JSON.parse(fs.readFileSync(f,'utf8'));j['Delete']='Xoá thử';j['Remove']='Xoá thử';fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n')"
npm run kiem:dist
```

Kỳ vọng: **ĐỎ**, exit khác 0, thông báo chứa `DỪNG`, chứa `"Xoá thử"`, và liệt kê cả `"Delete"` lẫn
`"Remove"`. **Chép nguyên văn vào báo cáo task.**

- [ ] **Bước 6: Trả `vi.json` về 5 khoá**

```bash
git checkout src/board/vi.json
npm run kiem:dist
git status --short
```

Kỳ vọng: `kiem:dist` xanh với `5/5 có mặt`; `git status --short` **không** thấy `src/board/vi.json`.

- [ ] **Bước 7: Commit**

```bash
git add scripts/kiem-dist.mjs
git commit -m "P1-D task 2: cấm hai khoá dịch ra cùng một chuỗi"
```

---

## Task 3: Đổi hai chỗ so khớp sang phép chặt — PHÉP THỬ QUYẾT ĐỊNH

**Files:**
- Sửa: `scripts/kiem-dist.mjs` — luật C dùng `coNhuLiteral`
- Sửa: `scripts/tim-ban-dich-vendor.mjs` — `timTrongCayVendor` dùng `coDungNhuDaChen`

**Interfaces:**
- Dùng của Task 1: `coNhuLiteral(noiDung, s)`, `coDungNhuDaChen(noiDung, s)`.
- Sinh ra cho Task 4: `khopTho` — một `Set<string>` trong `kiem-dist.mjs` chứa những bản dịch mà
  phép **thô** trúng trong chunk bảng vẽ nhưng phép **chặt** thì không.

**Đây là task đổi hành vi xanh/đỏ của một cổng.** Bằng chứng bắt buộc là phép thử ở Bước 4-6, phải
chạy **đủ hai lượt** và chép nguyên văn cả hai.

- [ ] **Bước 1: LẤY BẰNG CHỨNG XANH GIẢ TRƯỚC KHI SỬA MÃ**

Làm bước này **trước** mọi lượt sửa mã. Nó ghi lại con bug đang tồn tại; sửa xong rồi thì không
lấy lại được nữa.

```bash
node -e "const f='src/board/vi.json';const fs=require('fs');const j=JSON.parse(fs.readFileSync(f,'utf8'));j['Clear column style']='Phong';fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n')"
npm run dung:vendor
npm run build
```

`"Phong"` là **tiền tố** của `"Phong cách"` đang ship. Gói `affine/blocks/table` **chưa được bật**
trong `src/board/extensions.ts`, nên chỗ thật của chuỗi này **không** tới `dist/`.

Kỳ vọng: `npm run build` **XANH**, và `kiem-dist` in `bản dịch vi.json — 6/6 có mặt`.

**Đó là con bug.** Cổng nói "có mặt" trong khi chuỗi đó chỉ khớp nhầm vào `"Phong cách"`.
**Chép nguyên văn dòng `6/6 có mặt` vào báo cáo task** — đây là nửa quan trọng nhất của bằng chứng.

`npm run dung:vendor` mất vài phút; `npm run build` khoảng 30 giây. Kiên nhẫn.

- [ ] **Bước 2: Đổi luật C sang phép chặt**

Trong `scripts/kiem-dist.mjs`, thêm `coNhuLiteral` vào câu import đã có từ Task 2:

```js
import { coNhuLiteral, timTrungBanDich } from './so-khop-ban-dich.mjs'
```

Tìm dòng khai `thieuBanDich` (gần các khai `dung`, `dinhNghia`, `conAffine`):

```js
const thieuBanDich = new Set(BAN_DICH)
```

Thay bằng:

```js
const thieuBanDich = new Set(BAN_DICH)
// Bản dịch mà phép THÔ trúng nhưng phép CHẶT thì không — tức chuỗi có trong chunk nhưng không ở
// dạng literal trọn vẹn. Task 4 dùng tập này để thêm ghi chú vào thông báo đỏ. Ghi lại ở đây vì
// đây là chỗ duy nhất còn đọc nội dung file.
const khopTho = new Set()
```

Rồi tìm khối luật C:

```js
  if (laFileBangVe(noiDung)) {
    for (const v of thieuBanDich) {
      if (noiDung.includes(v)) thieuBanDich.delete(v)
    }
  }
```

Thay bằng:

```js
  if (laFileBangVe(noiDung)) {
    for (const v of thieuBanDich) {
      // Phép CHẶT: chuỗi phải nằm trọn trong một literal. `includes` chuỗi con tính nhầm một bản
      // dịch là "có mặt" khi nó chỉ là chuỗi con của một bản dịch KHÁC — đo được trên dist/ thật:
      // "Phong" khớp thô vào "Phong cách" đang ship, dù chỗ thật của nó đã bị tree-shake.
      if (coNhuLiteral(noiDung, v)) thieuBanDich.delete(v)
      // Phép THÔ chỉ còn dùng làm CHẨN ĐOÁN, không còn dùng để kết luận "có mặt". Một chuỗi vừa
      // được ghi vào đây rồi sau đó khớp chặt ở file khác thì vẫn bị xoá khỏi `thieuBanDich`, nên
      // nó không bao giờ được in ra — thông báo chỉ lặp trên `thieuBanDich`.
      else if (noiDung.includes(v)) khopTho.add(v)
    }
  }
```

- [ ] **Bước 3: Đổi chẩn đoán cây vendored sang phép chặt**

Trong `scripts/tim-ban-dich-vendor.mjs`, thêm import ở đầu file, ngay sau câu import `dietJs`:

```js
import { dietJs } from './duyet-cay-js.mjs'
import { coDungNhuDaChen } from './so-khop-ban-dich.mjs'
```

Rồi trong `timTrongCayVendor`, tìm:

```js
    for (const s of can) {
      if (!noiDung.includes(s)) continue
```

Thay bằng:

```js
    for (const s of can) {
      // Phép CHẶT, dạng chính xác: `dich-chuoi-vendor.mjs` chèn bản dịch bằng đúng
      // `JSON.stringify(chuoiDich)`, và cây này là đầu ra `tsc` chưa minify — nên không cần chấp
      // ba kiểu nháy như ở dist/. `includes` chuỗi con ở đây làm chẩn đoán nêu SAI TÊN GÓI: một
      // bản dịch ngắn sẽ "thấy" ở mọi file chứa bản dịch dài hơn bao nó.
      if (!coDungNhuDaChen(noiDung, s)) continue
```

- [ ] **Bước 4: BẰNG CHỨNG ĐỎ — cùng khoá thử, giờ phải ĐỎ**

Khoá `"Clear column style": "Phong"` vẫn còn trong `vi.json` từ Bước 1. Cây `.vendor-build/` và
`dist/` cũng đã dựng ở Bước 1 và **không cần dựng lại** — chỉ mã cổng đổi:

```bash
npm run kiem:dist
```

Kỳ vọng: **ĐỎ**, exit khác 0, thông báo chứa:
- `D12 ĐỎ — 1 bản dịch ... KHÔNG có mặt trong dist/`
- `"Phong"`
- `đã dịch ở affine/blocks/table/...` kèm `(gói affine/blocks/table)`
- `chưa được bật trong src/board/extensions.ts`

**Chép nguyên văn vào báo cáo task.** Cùng một `vi.json`, cùng một `dist/`, chỉ đổi phép so khớp —
xanh thành đỏ. Đó là chứng minh trực tiếp con bug đã được sửa.

- [ ] **Bước 5: Trả `vi.json` về 5 khoá và dựng lại**

```bash
git checkout src/board/vi.json
npm run dung:vendor
npm run build
git status --short
```

Kỳ vọng: xanh, `bản dịch vi.json — 5/5 có mặt`; `git status --short` **không** thấy
`src/board/vi.json`.

- [ ] **Bước 6: Chạy đủ bộ cổng**

```bash
npx tsc --noEmit && npm run kiem:vendor && npm run kiem:vendor-paths && npm run kiem:vendor-build
npx vitest run --reporter=verbose > kq-bo-test.txt 2>&1; echo "EXIT=$?"
npm run build && npm run kiem:dist
```

Đọc `kq-bo-test.txt`. Kỳ vọng: tất cả xanh, `npm test` cho **113 ca** (98 trước chặng + 15 ca Task 1).
Ghi con số thật vào báo cáo — bài học #3: đừng tin tiêu chí xong hẹp, chạy đủ bộ.

**Nhắc lại ràng buộc toàn cục: KHÔNG nối `| tail`.**

- [ ] **Bước 7: Commit**

```bash
git add scripts/kiem-dist.mjs scripts/tim-ban-dich-vendor.mjs
git commit -m "P1-D task 3: hai chỗ so khớp bản dịch dùng phép literal trọn vẹn"
```

---

## Task 4: Ghi chú phân biệt "khớp nhầm bản dịch khác" với "bộ đóng gói ghép chuỗi"

**Files:**
- Sửa: `scripts/so-khop-ban-dich.mjs` — thêm `giaiThichKhopTho`
- Sửa: `scripts/so-khop-ban-dich.d.mts` — khai kiểu hàm mới
- Sửa: `scripts/tim-ban-dich-vendor.mjs` — `soanThongBaoThieu` nhận tham số `ghiChu`
- Sửa: `scripts/tim-ban-dich-vendor.d.mts` — cập nhật chữ ký
- Sửa: `scripts/kiem-dist.mjs` — dựng bản đồ ghi chú, truyền vào
- Sửa: `src/__tests__/vendor-so-khop.spec.ts` — thêm ca kiểm

**Interfaces:**
- Dùng của Task 1 và 3: `khopTho` (Set trong `kiem-dist.mjs`), `BAN_DO`.
- Sinh ra:
  - `giaiThichKhopTho(v: string, banDo: Record<string, string>): { khoa: string; vi: string } | null`
    — tìm một mục KHÁC trong bảng dịch mà giá trị của nó chứa `v`. `null` khi không có.
  - `soanThongBaoThieu(thieu, daDich, loiChanDoan?, ghiChu?)` — tham số thứ tư là
    `Map<string, string> | null`, mỗi mục là một dòng ghi chú in thêm cho chuỗi đó.

**Vì sao ghi chú chứ không phải kết cục thứ tư:** khi phép chặt trượt mà phép thô trúng, phản xạ
đầu là kết luận *"bộ đóng gói ghép chuỗi"*. Nhưng nguyên nhân thường gặp hơn nhiều là chuỗi đó
**khớp nhầm vào một bản dịch khác**. Hai nguyên nhân khác hẳn nhau, và đoán bừa một cái là lặp lại
đúng lỗi mà P1-C vừa sửa. Ba kết cục của P1-C vẫn trả lời đúng câu hỏi *"vì sao chỗ THẬT của chuỗi
này không tới dist/"*, nên phép thô chỉ **thêm một dòng**, không thay chúng.

- [ ] **Bước 1: Viết ca kiểm đỏ**

Thêm vào cuối `src/__tests__/vendor-so-khop.spec.ts`:

```ts
describe('giaiThichKhopTho', () => {
  const BAN_DO = { Style: 'Phong cách', Layout: 'Bố cục', Test: 'Phong' }

  it('tìm được bản dịch khác chứa chuỗi này', () => {
    expect(giaiThichKhopTho('Phong', BAN_DO)).toEqual({ khoa: 'Style', vi: 'Phong cách' })
  })

  // Không được tự giải thích bằng CHÍNH nó — nếu không thì mọi chuỗi đều "giải thích được" và
  // ghi chú thành vô nghĩa.
  it('KHÔNG tự giải thích bằng chính mục của nó', () => {
    expect(giaiThichKhopTho('Bố cục', { Layout: 'Bố cục' })).toBeNull()
  })

  it('trả null khi không bản dịch nào khác chứa nó', () => {
    expect(giaiThichKhopTho('Khung', BAN_DO)).toBeNull()
  })
})
```

Và sửa khối import ở đầu file đó để thêm `giaiThichKhopTho`:

```ts
import {
  coDungNhuDaChen,
  coNhuLiteral,
  dangTrongNhay,
  giaiThichKhopTho,
  timTrungBanDich,
} from '../../scripts/so-khop-ban-dich.mjs'
```

> **Lưu ý:** `nhayHoa` đã bị **gỡ hẳn** ở lượt vá Task 1 và thay bằng `dangTrongNhay(s, nhay)` —
> thoát theo TỪNG kiểu nháy, vì ba kiểu nháy có ba luật thoát khác nhau và cả 5 bản dịch đang ship
> đều nằm trong literal **backtick**. Đừng nhắc lại `nhayHoa` ở bất cứ đâu.

- [ ] **Bước 2: Chạy để xác nhận ĐỎ**

Chạy: `npx vitest run --reporter=verbose src/__tests__/vendor-so-khop.spec.ts > kq-do4.txt 2>&1`

Đọc `kq-do4.txt`. Kỳ vọng: **FAIL** — 3 ca mới đỏ với `TypeError: giaiThichKhopTho is not a
function`; 15 ca của Task 1 vẫn xanh. Chép nguyên văn vào báo cáo.

- [ ] **Bước 3: Viết `giaiThichKhopTho`**

Thêm vào cuối `scripts/so-khop-ban-dich.mjs`:

```js
// Khi phép chặt trượt mà phép thô trúng, có HAI nguyên nhân khác hẳn nhau và không được đoán bừa
// một cái:
//   - chuỗi khớp nhầm vào một BẢN DỊCH KHÁC bao nó ("Phong" nằm trong "Phong cách") — thường gặp;
//   - bộ đóng gói đã ghép/tách chuỗi nên nó không còn là một literal trọn vẹn — hiếm.
// Hàm này trả lời được vế thứ nhất, và chỉ vế thứ nhất. Không thấy gì thì bên gọi phải nói là
// KHÔNG giải thích được, chứ không được kết luận sang vế thứ hai.
export function giaiThichKhopTho(v, banDo) {
  for (const [khoa, vi] of Object.entries(banDo)) {
    if (typeof vi !== 'string') continue
    // `vi !== v` để không tự giải thích bằng chính mục của nó — nếu không thì mọi chuỗi đều
    // "giải thích được" và ghi chú thành vô nghĩa.
    if (vi !== v && vi.includes(v)) return { khoa, vi }
  }
  return null
}
```

Thêm vào `scripts/so-khop-ban-dich.d.mts`:

```ts
export declare function giaiThichKhopTho(
  v: string,
  banDo: Record<string, string>,
): { khoa: string; vi: string } | null
```

- [ ] **Bước 4: Cho `soanThongBaoThieu` in ghi chú**

Trong `scripts/tim-ban-dich-vendor.mjs`, đổi chữ ký:

```js
export function soanThongBaoThieu(thieu, daDich, loiChanDoan = null, ghiChu = null) {
```

Rồi tìm dòng in tên chuỗi trong vòng lặp:

```js
  for (const v of ds) {
    dong.push(`   "${v}"`)
```

Thay bằng:

```js
  for (const v of ds) {
    dong.push(`   "${v}"`)
    // Ghi chú in NGAY dưới tên chuỗi, trước mọi kết luận — nó nói về phép so khớp, không phải về
    // nguyên nhân chuỗi không tới dist/. Ba kết cục bên dưới vẫn trả lời câu hỏi đó.
    const gc = ghiChu?.get(v)
    if (gc) dong.push(`      ${gc}`)
```

Cập nhật `scripts/tim-ban-dich-vendor.d.mts`:

```ts
export declare function soanThongBaoThieu(
  thieu: Iterable<string>,
  daDich: Map<string, ChoDich[]> | null,
  loiChanDoan?: string | null,
  ghiChu?: Map<string, string> | null,
): string
```

- [ ] **Bước 5: Dựng bản đồ ghi chú trong `kiem-dist.mjs`**

Thêm `giaiThichKhopTho` vào câu import:

```js
import { coNhuLiteral, giaiThichKhopTho, timTrungBanDich } from './so-khop-ban-dich.mjs'
```

Rồi tìm dòng gọi thông báo trong khối `if (thieuBanDich.size)`:

```js
  console.error('\n' + soanThongBaoThieu(thieuBanDich, daDich, loiChanDoan))
```

Thay bằng:

```js
  // Ghi chú cho những chuỗi mà phép THÔ trúng nhưng phép CHẶT không. Chúng có mặt trong chunk
  // dưới một dạng nào đó, và người đọc cần biết dạng nào — nếu không họ sẽ tưởng cổng đang nói
  // "chuỗi này hoàn toàn vắng mặt".
  const ghiChu = new Map()
  for (const v of thieuBanDich) {
    if (!khopTho.has(v)) continue
    const nguon = giaiThichKhopTho(v, BAN_DO)
    ghiChu.set(
      v,
      nguon
        ? `lưu ý: chuỗi này CÓ trong chunk, nhưng chỉ vì nó nằm trong bản dịch ` +
          `${JSON.stringify(nguon.vi)} của khoá "${nguon.khoa}". Phép so khớp cũ đã tính nhầm ` +
          'đây là "có mặt".'
        : 'lưu ý: chuỗi này CÓ trong chunk nhưng KHÔNG ở dạng literal trọn vẹn, và không nằm ' +
          'trong bản dịch nào khác — có thể bộ đóng gói đã ghép/tách chuỗi. Kiểm tay trước khi ' +
          'kết luận.',
    )
  }

  console.error('\n' + soanThongBaoThieu(thieuBanDich, daDich, loiChanDoan, ghiChu))
```

- [ ] **Bước 6: Chạy ca kiểm và xác nhận XANH**

Chạy: `npx vitest run --reporter=verbose src/__tests__/vendor-so-khop.spec.ts > kq-xanh4.txt 2>&1`

Đọc file. Kỳ vọng: **PASS**, 18 ca xanh (15 của Task 1 + 3 mới).

Chạy: `npx tsc --noEmit` → exit 0.

- [ ] **Bước 7: BẰNG CHỨNG ĐỎ — ghi chú phải xuất hiện**

Lặp lại phép thử của Task 3, lần này kỳ vọng thông báo có thêm dòng ghi chú:

```bash
node -e "const f='src/board/vi.json';const fs=require('fs');const j=JSON.parse(fs.readFileSync(f,'utf8'));j['Clear column style']='Phong';fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n')"
npm run dung:vendor
npm run build
```

Kỳ vọng: **ĐỎ** ở `postbuild`, thông báo chứa cả:
- `"Phong"`
- `lưu ý: chuỗi này CÓ trong chunk, nhưng chỉ vì nó nằm trong bản dịch "Phong cách" của khoá "Style"`
- `đã dịch ở affine/blocks/table/...` kèm `(gói affine/blocks/table)`

**Chép nguyên văn vào báo cáo task.**

- [ ] **Bước 8: Trả `vi.json` về 5 khoá và chạy đủ bộ cổng**

```bash
git checkout src/board/vi.json
npm run dung:vendor
npx tsc --noEmit && npm run kiem:vendor && npm run kiem:vendor-paths && npm run kiem:vendor-build
npx vitest run --reporter=verbose > kq-cuoi.txt 2>&1; echo "EXIT=$?"
npm run build && npm run kiem:dist
git status --short
```

Đọc `kq-cuoi.txt`. Kỳ vọng: tất cả xanh, `npm test` cho **116 ca** (98 trước chặng + 18), `kiem:dist` báo
`bản dịch vi.json — 5/5 có mặt`, `git status --short` **không** thấy `src/board/vi.json`.

- [ ] **Bước 9: Commit**

```bash
git add scripts/so-khop-ban-dich.mjs scripts/so-khop-ban-dich.d.mts scripts/tim-ban-dich-vendor.mjs scripts/tim-ban-dich-vendor.d.mts scripts/kiem-dist.mjs src/__tests__/vendor-so-khop.spec.ts
git commit -m "P1-D task 4: ghi chú phân biệt khớp nhầm bản dịch khác với ghép chuỗi"
```

---

## Sau khi cả bốn task xong

1. **Lượt review toàn nhánh** — `superpowers:requesting-code-review` trên khoảng
   `git merge-base main HEAD`..`HEAD`. P1-B có **11 lỗi** và P1-C có **4 Important** lọt tới tận
   vòng review cuối, và phần lớn nằm trong mã do kế hoạch cho sẵn. Mã trong kế hoạch này cũng là
   bản nháp, không phải lời tiên tri.
2. **Quyết định gộp** — `superpowers:finishing-a-development-branch`.
3. **Cập nhật `docs/superpowers/HANDOFF.md`**: bảng trạng thái đầu file, bản đồ phục hồi ở mục 3,
   và **xoá nợ `includes` khỏi mục 12** (nó đã được trả). Nhớ: mục 0 và mục 2 cũng nhắc nợ đó.

## Ngoài phạm vi — KHÔNG làm ở đây

- **Không thêm khoá dịch nào.** `vi.json` vẫn đúng 5 khoá.
- **Không sàng lọc tập chuỗi cần dịch**, không đo lại số từ lặp, không chốt bảng thuật ngữ. Bề mặt
  1.205 lẫn thứ không phải chữ hiển thị (`"="`, `"x"`, `"PDF"`, `"4_Content & Media@3"`).
- **Không cấm một bản dịch là chuỗi con của bản dịch khác.** Tiếng Việt chia nhau tiền tố quá nhiều
  (`Xoá` / `Xoá dòng`); phép chặt đã xử đúng ca đó.
