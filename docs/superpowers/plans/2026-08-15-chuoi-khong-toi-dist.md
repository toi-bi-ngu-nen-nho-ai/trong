# Chặng P1-C — quy tắc cho chuỗi không tới `dist/` · Kế hoạch thi hành

> **Cho người/agent thi hành:** KỸ NĂNG BẮT BUỘC: dùng `superpowers:subagent-driven-development`
> (khuyến nghị) hoặc `superpowers:executing-plans` để làm từng task một. Các bước dùng cú pháp
> checkbox (`- [ ]`) để theo dõi.

**Mục tiêu:** Khi luật C của `kiem-dist.mjs` phát hiện một bản dịch không có trong `dist/`, nói
đúng nguyên nhân — phân biệt "gói chưa bật nên bị tree-shake" với "bước dịch không chạy" — thay vì
nêu hai nguyên nhân đều sai.

**Kiến trúc:** Một module thuần mới (`scripts/tim-ban-dich-vendor.mjs`) quét cây `.vendor-build/`
tìm **giá trị tiếng Việt** và quy ra gói chứa nó, cộng một hàm thuần soạn thông báo. `kiem-dist.mjs`
gọi cả hai **chỉ trên đường đỏ**. Không cổng nào đổi hành vi xanh/đỏ; mã mới chỉ đổi *chữ* của một
lượt `process.exit(1)` đã chắc chắn xảy ra.

**Công nghệ:** Node ESM (`.mjs`), vitest, TypeScript chỉ để khai kiểu (`.d.mts`). Không thêm phụ
thuộc nào.

**Spec có thẩm quyền:** `docs/superpowers/specs/2026-08-15-chuoi-khong-toi-dist-design.md`

## Ràng buộc toàn cục

- **Không thêm phụ thuộc nào.** Không thêm mục nào vào `package.json`.
- **Không thêm khoá dịch nào.** `src/board/vi.json` phải vẫn **đúng 5 khoá** khi chặng này xong,
  và `kiem:dist` phải vẫn in `bản dịch vi.json — 5/5 có mặt`.
- **Không đổi hành vi xanh/đỏ của bất kỳ cổng nào.** Mã mới chỉ chạy sau khi `loi++` đã xảy ra.
- **Không đụng `src/data/antibiotics.ts`** — dữ liệu lâm sàng, chủ dự án tự sửa.
- **Không đụng `src/vendor/blocksuite/`** — luật D11, cấm sửa.
- **Ca kiểm phải nằm dưới `src/**/__tests__/**/*.spec.ts`.** `vite.config.ts` khai
  `include: ['src/**/__tests__/**/*.spec.ts']`; một file spec đặt trong `scripts/` sẽ **không bao
  giờ chạy** và cổng sẽ xanh vì không có ca nào.
- **Mọi ca kiểm phải THẬT SỰ ĐỎ trước khi có mã sửa.** Ca xanh ngay từ đầu là ca không canh gì.
  Chép nguyên văn thông báo lỗi thật vào báo cáo task; không nhận suy luận từ mã.
- **Chữ trong mã và tài liệu viết tiếng Việt**, theo đúng lối các script hiện có.
- **Bảy cổng phải xanh trước khi coi chặng là xong:** `npx tsc --noEmit` · `npm test` ·
  `npm run kiem:vendor` · `npm run kiem:vendor-paths` · `npm run kiem:vendor-build` ·
  `npm run build` · `npm run kiem:dist`.
- **Điều kiện tiên quyết:** `.vendor-build/` phải tồn tại (`npm ci && npm run dung:vendor`). Nếu
  thiếu, `pretest` sẽ chặn — đó là cổng làm đúng việc, không phải lỗi.

---

## Task 1: Module tra cứu — tìm bản dịch trong cây vendored và quy ra gói

**Files:**
- Tạo: `scripts/tim-ban-dich-vendor.mjs`
- Tạo: `scripts/tim-ban-dich-vendor.d.mts`
- Tạo: `src/__tests__/vendor-tim-ban-dich.spec.ts`

**Interfaces:**
- Dùng của trước đó: `dietJs(dir)` — async generator trong `scripts/duyet-cay-js.mjs`, sinh ra
  đường dẫn **tuyệt đối** của mọi file `.js` dưới `dir`.
- Sinh ra cho task sau:
  - `docGocGoi(goc: string): Promise<Set<string>>` — tập đường dẫn thư mục **tương đối** (phân
    cách `/`) của mọi thư mục có `package.json`.
  - `goiCuaDuongDan(rel: string, gocGoi: Set<string>): string | null` — thuần.
  - `timTrongCayVendor(goc: string, canTim: Iterable<string>): Promise<Map<string, Array<{ file: string; goi: string | null }>>>`
    — chuỗi không thấy ở đâu thì **vắng mặt** khỏi Map.

- [ ] **Bước 1: Viết ca kiểm đỏ**

Tạo `src/__tests__/vendor-tim-ban-dich.spec.ts`:

```ts
// Chẩn đoán của luật C — tìm GIÁ TRỊ TIẾNG VIỆT trong cây đã dịch rồi quy ra gói chứa nó.
//
// Vì sao quét tiếng Việt chứ không tiếng Anh: sau khi bước dịch chạy, bản gốc tiếng Anh đã BIẾN
// MẤT khỏi đúng những chỗ đó — quét tiếng Anh sẽ không thấy gì và kết luận ngược.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  docGocGoi,
  goiCuaDuongDan,
  timTrongCayVendor,
} from '../../scripts/tim-ban-dich-vendor.mjs'

let GOC: string
let gocGoi: Set<string>

const ghi = (rel: string, noiDung: string) => {
  const f = path.join(GOC, rel)
  mkdirSync(path.dirname(f), { recursive: true })
  writeFileSync(f, noiDung)
}

beforeAll(async () => {
  GOC = mkdtempSync(path.join(tmpdir(), 'tim-ban-dich-'))

  // Gói ở ĐỘ SÂU 2 — hình dạng có thật: affine/all, affine/foundation, affine/shared...
  ghi('affine/all/package.json', '{"name":"all"}')
  ghi('affine/all/src/a.js', 'const x = "Phong cách";\n')

  // Gói ở ĐỘ SÂU 3 — hình dạng có thật: affine/blocks/table, affine/gfx/mindmap...
  ghi('affine/blocks/table/package.json', '{"name":"table"}')
  ghi('affine/blocks/table/src/b.js', 'const y = "Phong cách"; const z = "Bố cục";\n')

  // Gói LỒNG trong gói: package.json ở cả tổ tiên gần lẫn xa.
  ghi('affine/blocks/table/noi/package.json', '{"name":"noi"}')
  ghi('affine/blocks/table/noi/e.js', 'const w = "Chèn ảnh";\n')

  // File KHÔNG nằm dưới package.json nào.
  ghi('ngoai/d.js', 'const v = "Lạc lối";\n')

  gocGoi = await docGocGoi(GOC)
})

afterAll(() => rmSync(GOC, { recursive: true, force: true }))

describe('goiCuaDuongDan', () => {
  it('quy đúng gói ở cả hai độ sâu có thật trong cây', () => {
    expect(goiCuaDuongDan('affine/all/src/a.js', gocGoi)).toBe('affine/all')
    expect(goiCuaDuongDan('affine/blocks/table/src/b.js', gocGoi)).toBe('affine/blocks/table')
  })

  it('trả null cho file không nằm dưới gói nào — không ném, không đoán bừa', () => {
    expect(goiCuaDuongDan('ngoai/d.js', gocGoi)).toBeNull()
  })

  // Cây hiện tại KHÔNG có gói lồng gói (đo 2026-08-15). Ca này ghim HỢP ĐỒNG của hàm, để một lượt
  // nâng cấp cây vendored đẻ ra hình dạng đó không lặng lẽ quy sai gói.
  it('chọn gói GẦN NHẤT khi có package.json ở nhiều tầng tổ tiên', () => {
    expect(goiCuaDuongDan('affine/blocks/table/noi/e.js', gocGoi)).toBe('affine/blocks/table/noi')
  })
})

describe('timTrongCayVendor', () => {
  it('tìm thấy bản dịch và quy đúng file + gói', async () => {
    const ra = await timTrongCayVendor(GOC, ['Bố cục'])
    expect(ra.get('Bố cục')).toEqual([
      { file: 'affine/blocks/table/src/b.js', goi: 'affine/blocks/table' },
    ])
  })

  it('chuỗi không có ở đâu thì VẮNG MẶT khỏi Map, không phải mảng rỗng', async () => {
    const ra = await timTrongCayVendor(GOC, ['Không hề tồn tại'])
    expect(ra.has('Không hề tồn tại')).toBe(false)
  })

  // Ca mà `find` thay cho `filter` sẽ lặng lẽ trượt. §5.4 của spec phụ thuộc vào nó: thông báo
  // phải liệt kê MỌI gói trúng, không tự chọn một cái.
  it('trả về CẢ HAI chỗ khi một chuỗi nằm ở hai gói khác nhau', async () => {
    const ra = await timTrongCayVendor(GOC, ['Phong cách'])
    const goi = ra.get('Phong cách')?.map((n) => n.goi).sort()
    expect(goi).toEqual(['affine/all', 'affine/blocks/table'])
  })

  it('ném lỗi phân biệt được khi cây không tồn tại, để bên gọi hạ cấp thông báo', async () => {
    await expect(timTrongCayVendor(path.join(GOC, 'khong-he-co'), ['x'])).rejects.toThrow(
      /không thấy cây/,
    )
  })
})
```

- [ ] **Bước 2: Chạy để xác nhận ĐỎ**

Chạy: `npx vitest run src/__tests__/vendor-tim-ban-dich.spec.ts`

Kỳ vọng: **FAIL** — vitest không phân giải được import, thông báo dạng
`Failed to load url ../../scripts/tim-ban-dich-vendor.mjs` hoặc
`Cannot find module ... tim-ban-dich-vendor.mjs`. Chép nguyên văn vào báo cáo task.

- [ ] **Bước 3: Viết module**

Tạo `scripts/tim-ban-dich-vendor.mjs`:

```js
// Chẩn đoán cho luật C của kiem-dist.mjs — CHỈ chạy trên ĐƯỜNG ĐỎ.
//
// Vấn đề nó giải: Cổng 3 của dich-chuoi-vendor.mjs đòi mỗi khoá vi.json phải dịch được ở đâu đó
// trong cây; luật C đòi mỗi bản dịch phải có mặt trong dist/. Giữa hai yêu cầu đó có một lớp chuỗi
// "dịch được nhưng không được phép dịch": bước dịch thay nó thành công ở .vendor-build/, rồi
// rolldown tree-shake nguyên gói chứa nó vì gói đó chưa được nối vào src/board/extensions.ts.
// Với lớp này, thông báo cũ của luật C nêu hai nguyên nhân mà CẢ HAI ĐỀU SAI — nó đẩy người sửa
// đi dựng lại .vendor-build/ (vô ích) rồi đi soi luat-vi-tri-dich.mjs (vô ích), trong khi việc
// cần làm là gỡ khoá đó khỏi vi.json.
//
// Quét theo GIÁ TRỊ TIẾNG VIỆT, không phải chuỗi gốc tiếng Anh: sau khi bước dịch chạy, bản gốc
// tiếng Anh đã biến mất khỏi đúng những chỗ đó, nên quét tiếng Anh sẽ không thấy gì và kết luận
// ngược hoàn toàn.
//
// ĐỘC LẬP với bao-cao-dich.json — tính lại từ cây thật. Đọc báo cáo thì nhanh hơn, nhưng đó là
// lời TỰ KHAI của chính bộ thay chuỗi; cổng độc lập ở Task 4 của chặng P1-B sinh ra chính vì lý
// do ngược lại, đi ngược nó ở đây là tự tháo một tính chất đã trả giá để có.
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import { dietJs } from './duyet-cay-js.mjs'

// Số chỗ in ra tối đa cho mỗi chuỗi, để một lượt đỏ nhiều khoá không đẩy thông báo thật ra khỏi
// màn hình.
const TOI_DA_CHO = 3

// Gói = thư mục tổ tiên gần nhất có package.json.
//
// KHÔNG cắt cứng N đoạn đầu đường dẫn: cây có HAI độ sâu gói (`affine/all` nhưng
// `affine/blocks/attachment`), nên cắt 3 đoạn là sai với 8 gói. Và KHÔNG giữ danh sách tên nhóm
// chép tay: nó sẽ mục ngay lần nâng cấp cây vendored tiếp theo, đúng cảnh báo mở đầu
// src/board/extensions.ts về danh sách 36 mục bị bỏ. Bước 3 của dung-vendor.mjs đã chép sẵn 70
// package.json vào .vendor-build/, nên dấu hiệu này tự cập nhật.
export async function docGocGoi(goc) {
  const ra = new Set()
  const di = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      if (e.isDirectory()) await di(path.join(d, e.name))
      else if (e.name === 'package.json') {
        ra.add(path.relative(goc, d).split(path.sep).join('/'))
      }
    }
  }
  await di(goc)
  return ra
}

// Duyệt từ tổ tiên GẦN NHẤT ra ngoài, nên gói lồng trong gói cho ra cái gần nhất.
export function goiCuaDuongDan(rel, gocGoi) {
  const doan = rel.split('/')
  for (let i = doan.length - 1; i > 0; i--) {
    const u = doan.slice(0, i).join('/')
    if (gocGoi.has(u)) return u
  }
  return null
}

// Dùng LẠI dietJs của duyet-cay-js.mjs — đúng bộ duyệt mà dich-chuoi-vendor.mjs dùng để GHI bản
// dịch vào cây này. Hai bên hỏi cùng một câu về cùng một cây thì phải duyệt cùng một cách; để
// chúng lệch nhau là mời một lớp lỗi mà không cổng nào bắt.
export async function timTrongCayVendor(goc, canTim) {
  if (!existsSync(goc)) {
    throw new Error(
      `tim-ban-dich-vendor: không thấy cây ${goc} để đối chiếu. Dựng lại bằng ` +
        '`npm run dung:vendor`.',
    )
  }

  const can = [...canTim].filter((s) => typeof s === 'string' && s !== '')
  const ra = new Map()
  if (can.length === 0) return ra

  const gocGoi = await docGocGoi(goc)
  for await (const f of dietJs(goc)) {
    const noiDung = await readFile(f, 'utf8')
    const rel = path.relative(goc, f).split(path.sep).join('/')
    for (const s of can) {
      if (!noiDung.includes(s)) continue
      if (!ra.has(s)) ra.set(s, [])
      ra.get(s).push({ file: rel, goi: goiCuaDuongDan(rel, gocGoi) })
    }
  }
  return ra
}

export { TOI_DA_CHO }
```

Tạo `scripts/tim-ban-dich-vendor.d.mts`:

```ts
// Khai kiểu cho scripts/tim-ban-dich-vendor.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
// (Cùng lý do scripts/luat-vi-tri-dich.d.mts tồn tại.)

export interface ChoDich {
  file: string
  goi: string | null
}

export declare const TOI_DA_CHO: number

export declare function docGocGoi(goc: string): Promise<Set<string>>

export declare function goiCuaDuongDan(rel: string, gocGoi: Set<string>): string | null

export declare function timTrongCayVendor(
  goc: string,
  canTim: Iterable<string>,
): Promise<Map<string, ChoDich[]>>
```

- [ ] **Bước 4: Chạy để xác nhận XANH**

Chạy: `npx vitest run src/__tests__/vendor-tim-ban-dich.spec.ts`

Kỳ vọng: **PASS**, 7 ca xanh (3 ở `goiCuaDuongDan`, 4 ở `timTrongCayVendor`).

- [ ] **Bước 5: Kiểm kiểu**

Chạy: `npx tsc --noEmit`

Kỳ vọng: exit 0, không in gì.

- [ ] **Bước 6: Commit**

```bash
git add scripts/tim-ban-dich-vendor.mjs scripts/tim-ban-dich-vendor.d.mts src/__tests__/vendor-tim-ban-dich.spec.ts
git commit -m "P1-C task 1: module tra cứu bản dịch trong cây vendored"
```

---

## Task 2: Hàm thuần soạn thông báo — ba kết cục

**Files:**
- Sửa: `scripts/tim-ban-dich-vendor.mjs` (thêm `soanThongBaoThieu`)
- Sửa: `scripts/tim-ban-dich-vendor.d.mts` (khai kiểu cho hàm mới)
- Sửa: `src/__tests__/vendor-tim-ban-dich.spec.ts` (thêm khối `describe`)

**Interfaces:**
- Dùng của Task 1: `TOI_DA_CHO`, kiểu `ChoDich = { file: string; goi: string | null }`.
- Sinh ra cho Task 3:
  `soanThongBaoThieu(thieu: Iterable<string>, daDich: Map<string, ChoDich[]> | null, loiChanDoan?: string | null): string`
  — trả về chuỗi nhiều dòng, **không in ra, không exit**.

**Vì sao tách hàm thuần thay vì soạn chữ thẳng trong `kiem-dist.mjs`:** logic ba nhánh là thứ dễ
sai nhất của chặng này, và dựng một `dist/` thật để kiểm nó thì rất đắt. Tách ra thì kiểm được
bằng đoạn mã nhỏ — đúng khuôn `luat-vi-tri-dich.mjs` (thuần) / `dich-chuoi-vendor.mjs` (vào-ra)
mà chặng P1-B đã dựng.

- [ ] **Bước 1: Viết ca kiểm đỏ**

Thêm vào cuối `src/__tests__/vendor-tim-ban-dich.spec.ts`:

```ts
describe('soanThongBaoThieu', () => {
  const cho = (file: string, goi: string | null) => ({ file, goi })

  it('thấy trong cây → nói bước dịch ĐÃ chạy, nêu gói, và bảo cách sửa', () => {
    const ra = soanThongBaoThieu(
      ['Chèn ảnh'],
      new Map([['Chèn ảnh', [cho('affine/blocks/image/src/a.js', 'affine/blocks/image')]]]),
    )
    expect(ra).toContain('đã dịch ở affine/blocks/image/src/a.js')
    expect(ra).toContain('affine/blocks/image')
    expect(ra).toContain('extensions.ts')
    expect(ra).toContain('gỡ khoá')
    // Không được nêu hai nguyên nhân cũ — với ca này CẢ HAI ĐỀU SAI. Đó là toàn bộ lý do chặng
    // này tồn tại.
    expect(ra).not.toContain('không chạy')
  })

  it('không thấy trong cây → giữ nguyên hai nguyên nhân cũ, vì với ca này chúng đúng', () => {
    const ra = soanThongBaoThieu(['Chèn ảnh'], new Map())
    expect(ra).toContain('KHÔNG thấy')
    expect(ra).toContain('dich-chuoi-vendor')
    expect(ra).toContain('luat-vi-tri-dich.mjs')
    expect(ra).not.toContain('đã dịch ở')
  })

  // Ca quan trọng nhất của khối này. Khi phép quét hỏng, ta KHÔNG BIẾT chuỗi có trong cây hay
  // không — nên không được khẳng định "KHÔNG thấy". Khẳng định một nguyên nhân không đo được
  // chính là lỗi mà chặng này sinh ra để sửa; lặp lại nó ở nhánh lỗi là tự thua.
  it('chẩn đoán hỏng → nói rõ là chưa chẩn đoán được, KHÔNG khẳng định gì', () => {
    const ra = soanThongBaoThieu(['Chèn ảnh'], null, 'EACCES: permission denied')
    expect(ra).toContain('chẩn đoán bổ sung không chạy được')
    expect(ra).toContain('EACCES: permission denied')
    expect(ra).not.toContain('KHÔNG thấy')
    expect(ra).not.toContain('đã dịch ở')
  })

  it('nhiều hơn TOI_DA_CHO chỗ → cắt bớt và đếm phần còn lại', () => {
    const ds = [
      cho('a/x/1.js', 'a/x'),
      cho('a/x/2.js', 'a/x'),
      cho('a/x/3.js', 'a/x'),
      cho('a/x/4.js', 'a/x'),
      cho('a/x/5.js', 'a/x'),
    ]
    const ra = soanThongBaoThieu(['Nhãn'], new Map([['Nhãn', ds]]))
    expect(ra).toContain('a/x/3.js')
    expect(ra).not.toContain('a/x/4.js')
    expect(ra).toContain('...và 2 chỗ nữa')
  })

  // §5.4 của spec: liệt kê MỌI gói trúng, không tự chọn một cái. `"Frame"` đo được ở bốn gói,
  // một số đã bật một số chưa — tự chọn cái đầu tiên là kết luận mà dữ liệu không đỡ.
  it('một chuỗi ở nhiều gói → nêu ĐỦ các gói, không chọn giùm', () => {
    const ra = soanThongBaoThieu(
      ['Khung'],
      new Map([['Khung', [cho('a/x/1.js', 'a/x'), cho('b/y/2.js', 'b/y')]]]),
    )
    expect(ra).toContain('a/x')
    expect(ra).toContain('b/y')
  })
})
```

Và sửa khối import ở đầu file đó để thêm `soanThongBaoThieu`:

```ts
import {
  docGocGoi,
  goiCuaDuongDan,
  soanThongBaoThieu,
  timTrongCayVendor,
} from '../../scripts/tim-ban-dich-vendor.mjs'
```

- [ ] **Bước 2: Chạy để xác nhận ĐỎ**

Chạy: `npx vitest run src/__tests__/vendor-tim-ban-dich.spec.ts`

Kỳ vọng: **FAIL** — 5 ca mới đỏ với `TypeError: soanThongBaoThieu is not a function`. Bảy ca của
Task 1 vẫn xanh. Chép nguyên văn vào báo cáo task.

- [ ] **Bước 3: Viết hàm**

Thêm vào cuối `scripts/tim-ban-dich-vendor.mjs`:

```js
// Soạn thông báo cho luật C. THUẦN: không in, không exit, không chạm đĩa — để kiểm được bằng
// đoạn mã nhỏ thay vì phải dựng một dist/ thật.
//
// Ba nhánh, và ranh giới giữa chúng là ranh giới giữa ĐIỀU ĐO ĐƯỢC và ĐIỀU CHỈ LÀ CHỈ DẪN:
//   - thấy trong cây  → "bước dịch đã chạy, gói không vào được bản build" là SUY RA TRỰC TIẾP từ
//                        hai phép đo vừa làm; còn "thường vì chưa bật trong extensions.ts" thì
//                        KHÔNG đo, nên phải viết như một chỉ dẫn chứ không phải một khẳng định.
//   - không thấy      → hai nguyên nhân cũ, với ca này chúng đúng.
//   - chẩn đoán hỏng  → KHÔNG khẳng định gì. Đây là chỗ dễ tự thua nhất: nói "KHÔNG thấy" khi
//                        phép quét chưa chạy được là lặp lại đúng lỗi mà cả chặng này sinh ra để
//                        sửa, chỉ khác chỗ đứng.
export function soanThongBaoThieu(thieu, daDich, loiChanDoan = null) {
  const ds = [...thieu]
  const dong = [
    `D12 ĐỎ — ${ds.length} bản dịch trong src/board/vi.json KHÔNG có mặt trong dist/. Nghĩa là ` +
      'thanh công cụ bảng vẽ đang nói tiếng Anh ở đúng chỗ đã chọn dịch.',
  ]

  if (loiChanDoan) {
    dong.push(`   (chẩn đoán bổ sung không chạy được: ${loiChanDoan})`)
  }

  for (const v of ds) {
    dong.push(`   "${v}"`)
    const noi = daDich?.get(v)

    if (loiChanDoan) {
      dong.push(
        '      chưa chẩn đoán được chuỗi này. Nguyên nhân thường gặp: bước dich-chuoi-vendor ' +
          'không chạy, hoặc thượng nguồn đã chuyển chuỗi ra ngoài danh sách vị trí cho phép, ' +
          'hoặc gói chứa nó chưa được bật trong src/board/extensions.ts.',
      )
      continue
    }

    if (noi?.length) {
      for (const n of noi.slice(0, TOI_DA_CHO)) {
        dong.push(`      đã dịch ở ${n.file}${n.goi ? `  (gói ${n.goi})` : ''}`)
      }
      if (noi.length > TOI_DA_CHO) {
        dong.push(`      ...và ${noi.length - TOI_DA_CHO} chỗ nữa`)
      }
      const goi = [...new Set(noi.map((n) => n.goi).filter(Boolean))]
      dong.push(
        '      → bước dịch ĐÃ chạy và ĐÃ thay đúng chỗ, nên chuỗi mất ở dist/ là do mã chứa nó ' +
          `bị tree-shake: ${goi.length ? `gói ${goi.join(', ')}` : 'gói chứa nó'} không vào được bản build.`,
      )
      dong.push(
        '        Thường vì gói đó chưa được bật trong src/board/extensions.ts — nghĩa là chuỗi ' +
          'này không tới tay người dùng, và dịch nó là công không.',
      )
      dong.push(
        '        Cách sửa: gỡ khoá khỏi src/board/vi.json, HOẶC bật tính năng đó trước rồi mới dịch.',
      )
    } else {
      dong.push(
        '      KHÔNG thấy bản dịch này ở đâu trong .vendor-build/ — hoặc bước dich-chuoi-vendor ' +
          'không chạy (kiểm scripts/dung-vendor.mjs), hoặc thượng nguồn đã chuyển chuỗi sang một ' +
          'vị trí cú pháp ngoài danh sách cho phép (xem scripts/luat-vi-tri-dich.mjs).',
      )
    }
  }

  return dong.join('\n')
}
```

Thêm vào `scripts/tim-ban-dich-vendor.d.mts`:

```ts
export declare function soanThongBaoThieu(
  thieu: Iterable<string>,
  daDich: Map<string, ChoDich[]> | null,
  loiChanDoan?: string | null,
): string
```

- [ ] **Bước 4: Chạy để xác nhận XANH**

Chạy: `npx vitest run src/__tests__/vendor-tim-ban-dich.spec.ts`

Kỳ vọng: **PASS**, 12 ca xanh (7 của Task 1 + 5 mới).

- [ ] **Bước 5: Kiểm kiểu**

Chạy: `npx tsc --noEmit`

Kỳ vọng: exit 0.

- [ ] **Bước 6: Commit**

```bash
git add scripts/tim-ban-dich-vendor.mjs scripts/tim-ban-dich-vendor.d.mts src/__tests__/vendor-tim-ban-dich.spec.ts
git commit -m "P1-C task 2: hàm thuần soạn thông báo ba kết cục"
```

---

## Task 3: Nối chẩn đoán vào luật C của `kiem-dist.mjs`

**Files:**
- Sửa: `scripts/kiem-dist.mjs` — thêm import + hằng `BUILD` ở đầu, thay khối `if (thieuBanDich.size)`

**Interfaces:**
- Dùng của Task 1 và 2: `timTrongCayVendor`, `soanThongBaoThieu`.
- Sinh ra: không có API mới. Đầu ra là **chữ trên stderr** và exit code **không đổi**.

**Ràng buộc sống còn của task này:** `kiem-dist.mjs` phải vẫn **exit 0 khi mọi thứ đúng** và
**exit 1 khi luật C đỏ**. Mã mới chỉ chạy trong nhánh `if (thieuBanDich.size)`, tức sau khi `loi++`
đã xảy ra. Không có đường đi nào từ mã mới tới một lượt exit 0.

- [ ] **Bước 1: Thêm import và hằng đường dẫn cây vendored**

Trong `scripts/kiem-dist.mjs`, sửa khối import ở đầu file. Tìm:

```js
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const GOC = path.resolve(import.meta.dirname, '..')
const DIST = path.join(GOC, 'dist')
```

Thay bằng:

```js
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'

import { soanThongBaoThieu, timTrongCayVendor } from './tim-ban-dich-vendor.mjs'

const GOC = path.resolve(import.meta.dirname, '..')
const DIST = path.join(GOC, 'dist')
// Cây đã dịch — chỉ đọc trên ĐƯỜNG ĐỎ của luật C, để phân biệt "gói bị tree-shake" với "bước dịch
// không chạy". Chắc chắn có mặt trên đường `npm run build` vì `prebuild` đã chạy
// kiem-vendor-build; nhưng `npm run kiem:dist` gọi tay được nên vẫn phải kiểm sự tồn tại.
const BUILD = path.join(GOC, '.vendor-build')
```

- [ ] **Bước 2: Thay khối thông báo của luật C**

Trong `scripts/kiem-dist.mjs`, tìm khối:

```js
if (thieuBanDich.size) {
  loi++
  console.error(
    `\nD12 ĐỎ — ${thieuBanDich.size} bản dịch trong src/board/vi.json KHÔNG có mặt trong dist/. ` +
      'Nghĩa là thanh công cụ bảng vẽ đang nói tiếng Anh ở đúng chỗ đã chọn dịch. Nguyên nhân ' +
      'thường gặp: bước dich-chuoi-vendor không chạy (kiểm dung-vendor.mjs), hoặc thượng nguồn đã ' +
      'chuyển chuỗi sang một vị trí cú pháp ngoài danh sách cho phép:',
  )
  ;[...thieuBanDich].forEach((v) => console.error(`   "${v}"`))
}
```

Thay bằng:

```js
if (thieuBanDich.size) {
  loi++

  // Chẩn đoán: quét cây đã dịch tìm GIÁ TRỊ TIẾNG VIỆT. Thấy → bước dịch đã chạy, chuỗi mất ở
  // dist/ vì gói chứa nó bị tree-shake. Không thấy → bước dịch chưa đáp được vào cây.
  //
  // Chỉ chạy ở ĐÂY, trên đường đỏ: đường xanh không đọc thêm một byte nào. Và vì cả nhánh này
  // nằm sau `loi++`, không có cách nào mã dưới đây biến một lượt đỏ thành xanh — chẩn đoán hỏng,
  // quét rỗng, cây rỗng thì cổng vẫn đỏ.
  let daDich = null
  let loiChanDoan = null
  if (!existsSync(BUILD)) {
    loiChanDoan = 'không có .vendor-build/ để đối chiếu — dựng lại bằng `npm run dung:vendor`'
  } else {
    try {
      daDich = await timTrongCayVendor(BUILD, thieuBanDich)
    } catch (err) {
      // FAIL-OPEN có chủ đích, ngược với `?? []` bị cấm trong luat-vi-tri-dich.mjs. Khác biệt:
      // ở đó fail-open biến "mất khả năng kiểm" thành "coi như không có lỗi" trên đường XANH;
      // ở đây kết quả xấu nhất là một thông báo nghèo hơn trên một cổng ĐÃ ĐỎ RỒI. Để lỗi này
      // ném ra thì người đọc mất luôn cả thông tin cũ và nhận về một stack trace.
      loiChanDoan = err.message
    }
  }

  console.error('\n' + soanThongBaoThieu(thieuBanDich, daDich, loiChanDoan))
}
```

- [ ] **Bước 3: Xác nhận đường XANH không đổi**

Chạy: `npm run kiem:dist`

Kỳ vọng: exit 0, và in **đúng** như trước khi sửa, gồm dòng `bản dịch vi.json — 5/5 có mặt` và
dòng cuối `kiem-dist: xanh — không còn "affine-" và mọi biến --drt-* dùng đều có định nghĩa.`

(Yêu cầu `dist/` đã tồn tại. Nếu chưa: `npm run build`.)

- [ ] **Bước 4: BẰNG CHỨNG ĐỎ — kết cục "gói chưa bật"**

Đây là bằng chứng bắt buộc của task này. **Chép nguyên văn thông báo thật vào báo cáo task** —
không nhận suy luận từ mã.

Dùng chuỗi **`"Clear column style"`**. Nó đã được kiểm ngày 2026-08-15 và thoả cả ba điều kiện cần:
nằm ở **vị trí cú pháp cho phép** (nên qua được Cổng 3, không thành khoá chết), thuộc **đúng một
gói** `affine/blocks/table` (gói chưa bật), và **không tới `dist/`**. 18 ký tự nên không sợ khớp
ngẫu nhiên.

> Đừng đổi sang chuỗi khác nếu không cần. `"Column type"` là ví dụ đã thử và **hỏng** — nó không
> nằm ở vị trí cú pháp cho phép, nên Cổng 3 chặn trước với thông báo "khoá chết" và bằng chứng đỏ
> này không bao giờ chạy tới. Muốn đổi thì phải tự đo lại ba điều kiện trên trước.

```bash
node -e "const f='src/board/vi.json';const fs=require('fs');const j=JSON.parse(fs.readFileSync(f,'utf8'));j['Clear column style']='Xoá kiểu cột';fs.writeFileSync(f,JSON.stringify(j,null,2)+'\n')"
npm run dung:vendor && npm run build
```

Kỳ vọng: `npm run build` **đỏ ở postbuild** với thông báo chứa:
- `D12 ĐỎ — 1 bản dịch ... KHÔNG có mặt trong dist/`
- `"Xoá kiểu cột"`
- `đã dịch ở affine/blocks/table/...` kèm `(gói affine/blocks/table)`
- `chưa được bật trong src/board/extensions.ts`
- `gỡ khoá khỏi src/board/vi.json`

- [ ] **Bước 5: BẰNG CHỨNG ĐỎ — kết cục "bước dịch không chạy"**

Với khoá thử vẫn còn trong `vi.json`, dựng cây rồi **xoá bản dịch khỏi cây** để mô phỏng ca bước
dịch không đáp được:

```bash
node -e "const fs=require('fs');const p='.vendor-build';const path=require('path');(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())w(f);else if(e.name.endsWith('.js')){const c=fs.readFileSync(f,'utf8');if(c.includes('Xoá kiểu cột'))fs.writeFileSync(f,c.split('Xoá kiểu cột').join('Clear column style'))}}})(p)"
npm run kiem:dist
```

Kỳ vọng: đỏ với `KHÔNG thấy bản dịch này ở đâu trong .vendor-build/` và **không** có dòng
`đã dịch ở`. Chép nguyên văn vào báo cáo.

- [ ] **Bước 6: BẰNG CHỨNG ĐỎ — kết cục "chưa chẩn đoán được"**

```bash
mv .vendor-build .vendor-build-tam
npm run kiem:dist
mv .vendor-build-tam .vendor-build
```

Kỳ vọng: đỏ với `chẩn đoán bổ sung không chạy được: không có .vendor-build/ để đối chiếu` và
**không** có dòng `KHÔNG thấy` (không khẳng định điều chưa đo). Chép nguyên văn vào báo cáo.

- [ ] **Bước 7: Trả `vi.json` về đúng 5 khoá và dựng lại**

```bash
git checkout src/board/vi.json
npm run dung:vendor && npm run build
```

Kỳ vọng: xanh, `bản dịch vi.json — 5/5 có mặt`.

**Ràng buộc toàn cục:** `git status --short` phải **không** thấy `src/board/vi.json`. Khoá thử là
công cụ lấy bằng chứng, không được đi vào commit.

- [ ] **Bước 8: Chạy đủ bộ cổng**

Chạy:

```bash
npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build && npm run kiem:dist
```

Kỳ vọng: tất cả xanh. `npm test` phải cho **số ca cũ + 12**. Ghi con số thật vào báo cáo — bài học
#3: đừng tin tiêu chí xong hẹp của task, chạy đủ bộ.

- [ ] **Bước 9: Commit**

```bash
git add scripts/kiem-dist.mjs
git commit -m "P1-C task 3: luật C phân biệt gói bị tree-shake với bước dịch không chạy"
```

---

## Task 4: Đính chính ba chỗ số liệu

**Files:**
- Sửa: `docs/superpowers/specs/2026-08-14-bo-sung-vi-json-design.md` — §2.3 và §5.1
- Sửa: `scripts/kiem-dist.mjs:19-22` — bỏ con số khỏi comment

**Interfaces:** không có mã chạy. Task này chỉ sửa chữ.

**Bối cảnh:** repo đang có **ba** con số khác nhau cho cùng một đại lượng — §2.3 ghi 391/275/116,
§5.1 ghi 444/323, comment `kiem-dist.mjs` ghi 121. Bộ đo lại ngày 2026-08-15 là
**1.205 / 899 / 306**, và con số 306 đã được tái lập độc lập bởi một lượt đo trước đó bằng script
khác. Chi tiết phương pháp ở §2 của spec P1-C.

- [ ] **Bước 1: Sửa §2.3 của spec P1-B**

Trong `docs/superpowers/specs/2026-08-14-bo-sung-vi-json-design.md`, tìm:

```markdown
### 2.3 Bao nhiêu chuỗi thật sự đi tới `dist/`

| | Số |
|---|---|
| Có mặt trong `dist/` | **275** |
| Bị tree-shake, không tới | 116 |

116 chuỗi kia (`"Replace attachment"`, `"Card view"`, `"Icon Picker"`, `"Callout"`…) thuộc các khối
không được nạp — dịch chúng là công không. Cả 5 bản dịch hiện có đều tới được `dist/`, tức cơ chế
chạy thông từ đầu tới cuối.
```

Thay bằng:

```markdown
### 2.3 Bao nhiêu chuỗi thật sự đi tới `dist/`

> **ĐÍNH CHÍNH 2026-08-15.** Bảng gốc của mục này ghi 391 ứng viên / 275 có mặt / **116** không
> tới, và §5.1 bên dưới ghi một bộ khác (444/323). **Cả hai đều sai** — chúng đến từ những lượt đo
> sớm có lọc "chuỗi viết hoa chữ đầu", còn luật sản xuất không có bộ lọc đó. Số dưới đây đo bằng
> chính `viTriHienThi` của `scripts/luat-vi-tri-dich.mjs` trên cây `.vendor-build/` và `dist/`
> dựng lại từ đầu. Phương pháp đầy đủ: §2 của
> `docs/superpowers/specs/2026-08-15-chuoi-khong-toi-dist-design.md`.

| | Số (đo 2026-08-15) |
|---|---|
| Chuỗi phân biệt ở vị trí cho phép | **1.205** |
| Có mặt trong chunk bảng vẽ của `dist/` | **899** |
| Bị tree-shake, không tới | **306** |

306 chuỗi kia **không rải rác — chúng dồn theo GÓI**: nguyên các tính năng chưa được nối vào
`src/board/extensions.ts` (`affine/blocks/embed` 33, `affine/blocks/embed-doc` 33,
`affine/fragments/frame-panel` 19, `affine/widgets/slash-menu` 19…). Dịch chúng là công không, và
chặng P1-C dựng cơ chế nói đúng điều đó khi ai đó lỡ thêm khoá.

Cả 5 bản dịch hiện có đều tới được `dist/`, tức cơ chế chạy thông từ đầu tới cuối.

Lưu ý: bề mặt 1.205 **không phải** "số chuỗi cần dịch" — nó có lẫn thứ rõ ràng không phải chữ
hiển thị (`"4_Content & Media@3"`, `"bookmark"`, `"PDF"`, `"="`, `"x"`).
```

- [ ] **Bước 2: Sửa §5.1 của spec P1-B**

Trong cùng file, tìm hai dòng:

```markdown
§2.3 là ước lượng của lượt đo sớm bằng regex; 444/323 mới là số đúng, đo bằng chính luật vị trí ở
§5.1.
```

Thay bằng:

```markdown
§2.3 là ước lượng của lượt đo sớm bằng regex — và 444/323 ở đây **cũng là ước lượng sai**, cùng
nguyên nhân (bộ lọc "viết hoa chữ đầu" mà luật sản xuất không có). Số đúng, đo ngày 2026-08-15
bằng chính luật vị trí: **1.205 / 899 / 306**. Xem bảng đã đính chính ở §2.3.
```

- [ ] **Bước 3: Bỏ con số khỏi comment `kiem-dist.mjs`**

Trong `scripts/kiem-dist.mjs`, tìm:

```js
//   C. Mọi bản dịch trong src/board/vi.json phải CÓ MẶT trong bản phát hành. Không đếm tổng: 121
//      chuỗi ứng viên bị tree-shake nên tổng số trồi sụt vô nghĩa. Luật này soi đúng những chuỗi
//      ĐÃ ĐƯỢC CHỌN dịch — nếu một cái biến mất khỏi dist/ thì hoặc bước dịch không chạy, hoặc
//      chuỗi đó không còn trên đường render, và cả hai đều phải biết ngay.
```

Thay bằng:

```js
//   C. Mọi bản dịch trong src/board/vi.json phải CÓ MẶT trong bản phát hành. Không đếm tổng: một
//      phần đáng kể chuỗi ứng viên bị tree-shake nên tổng số trồi sụt vô nghĩa. (Con số cụ thể cố
//      tình KHÔNG ghi ở đây: nó đã mục ba lần trong repo này — §2.3 và §5.1 của spec P1-B từng
//      ghi hai bộ khác nhau và comment này từng ghi bộ thứ ba. Số có ngày đo nằm ở §2.3 của
//      docs/superpowers/specs/2026-08-14-bo-sung-vi-json-design.md.) Luật này soi đúng những chuỗi
//      ĐÃ ĐƯỢC CHỌN dịch — nếu một cái biến mất khỏi dist/ thì bước dịch không chạy, chuỗi không
//      còn trên đường render, hoặc gói chứa nó chưa được bật; chẩn đoán phân biệt ba ca đó nằm ở
//      scripts/tim-ban-dich-vendor.mjs và chỉ chạy trên đường đỏ.
```

- [ ] **Bước 4: Xác nhận không có con số cũ nào sót**

Chạy:

```bash
grep -rn "116\|121\|444\|/323\|275" docs/superpowers/specs/2026-08-14-bo-sung-vi-json-design.md scripts/kiem-dist.mjs
```

Kỳ vọng: chỉ còn các lượt trúng **nằm trong khối ĐÍNH CHÍNH** (nơi cố tình nhắc lại số cũ) hoặc
không liên quan tới đại lượng này (ví dụ số dòng, số đo dung lượng). Đọc từng dòng trúng và ghi
kết luận vào báo cáo — **không** kết luận "không còn gì" mà không đọc.

- [ ] **Bước 5: Chạy đủ bộ cổng**

```bash
npx tsc --noEmit && npm test && npm run kiem:vendor && npm run kiem:vendor-paths && npm run build && npm run kiem:dist
```

Kỳ vọng: tất cả xanh, `bản dịch vi.json — 5/5 có mặt`.

- [ ] **Bước 6: Commit**

```bash
git add docs/superpowers/specs/2026-08-14-bo-sung-vi-json-design.md scripts/kiem-dist.mjs
git commit -m "P1-C task 4: đính chính ba chỗ số liệu chuỗi tới dist/"
```

---

## Sau khi cả bốn task xong

1. **Lượt review toàn nhánh** — `superpowers:requesting-code-review` trên khoảng
   `git merge-base main HEAD`..`HEAD`. Chặng P1-B có **11 lỗi** lọt vào tận vòng review cuối và
   **tất cả** nằm trong mã do kế hoạch cho sẵn. Mã trong kế hoạch này cũng là bản nháp, không phải
   lời tiên tri — đọc nó với đúng thái độ đó.
2. **Quyết định gộp** — `superpowers:finishing-a-development-branch`.
3. **Cập nhật `docs/superpowers/HANDOFF.md`**: mục 11 chuyển từ "đang brainstorm dở" sang "đã xong
   và đã gộp", bảng trạng thái đầu file, và bản đồ phục hồi ở mục 3.

## Nợ đã đo được, ghi lại cho chặng sau — KHÔNG làm ở đây

Luật C hỏi "bản dịch có mặt trong chunk không" bằng `noiDung.includes(v)`. Đo ngày 2026-08-15 trên
cùng một `dist/`: phép lỏng này đếm **969 tới / 236 không tới**, còn phép "chuỗi nằm trọn trong một
literal có nháy" đếm **899 / 306** — lệch **70 chuỗi**, thủ phạm là các chuỗi ngắn (`"="`, `"x"`,
`"on"`, `"PDF"`) khớp ngẫu nhiên vào mã đã minify.

Hệ quả ở chặng 323 chuỗi: một bản dịch ngắn là **chuỗi con của một bản dịch khác** (`"Tô"` trong
`"Tô màu"`) sẽ được tính là "có mặt" kể cả khi chỗ của chính nó đã bị tree-shake. Đúng dạng lỗi
#11 của vòng review P1-B ("so khớp mù phạm vi") ở một trục khác.

**Không sửa trong chặng này** vì đổi phép so khớp là **đổi hành vi xanh/đỏ của một cổng** — khác
bản chất với "sửa lời của một cổng đã đỏ", và phải có bằng chứng đỏ riêng. **Phải xử trước khi
thêm khoá hàng loạt.**
