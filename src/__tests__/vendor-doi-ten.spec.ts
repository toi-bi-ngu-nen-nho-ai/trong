// Ba cổng cho D16, mỗi cái canh một cách hỏng khác nhau.
import { existsSync, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const BUILD = '.vendor-build'
const NGUON = 'src/vendor/blocksuite'

// Ngân sách thời gian cho các ca DUYỆT TRỌN CÂY. Mọi ca trong file này đọc từng file của
// `.vendor-build/` (2.550 file .js) hoặc `src/vendor/blocksuite/` (2.782 file .ts) bằng
// `readFileSync` — đó là việc I/O hàng nghìn lượt, không phải phép kiểm cỡ mili-giây.
//
// KHÔNG phải "nâng timeout cho hết đỏ". Đây là lượt vá có bằng chứng, sau ba lần ca đỏ chập chờn
// mà không ai bắt được thông điệp (xem HANDOFF mục 6). Lượt bắt được ngày 2026-08-15 cho:
//
//   × output không còn tiền tố affine- nào ... 5063ms   Error: Test timed out in 5000ms.
//   × không có tên gói giả @blocksuite/drt-  ... 5015ms  Error: Test timed out in 5000ms.
//   × không có chỗ ghép tên thẻ động          ... 5094ms  Error: Test timed out in 5000ms.
//
// Đúng BA ca phải duyệt trọn cây, và chỉ ba ca đó. Cùng lượt ấy, cả bộ test chậm 2,6 lần so với
// lượt xanh (195s so với 74s) — tức thời gian của chúng dao động theo tải máy, còn ngân sách mặc
// định 5 giây thì không. Ở lượt xanh ba ca này chạy 645/449/382 ms, nên biên chỉ khoảng 10 lần.
//
// Con số 120 giây lấy đúng bằng hai ca làm việc y hệt ở `vendor-dich.spec.ts` (:297, :309) — chúng
// đã được cấp ngân sách này từ trước. File này thiếu nó do BỎ SÓT, không do cân nhắc; lượt vá này
// chỉ xoá sự bất đối xứng đó.
//
// Áp cho CẢ NĂM ca, kể cả hai ca thường nhanh (`break` sớm ở file đầu khớp): chúng chỉ nhanh KHI
// CỔNG ĐẠT. Nếu bước đổi tên thật sự hỏng, hoặc `vi.json` có khoá chết, chúng phải duyệt trọn cây
// rồi chết vì timeout — nghĩa là một lượt gác THẬT SỰ ĐỎ bị nguỵ trang thành ca chập chờn, đúng
// loại thông báo sai chỗ mà bài học #2 của dự án cảnh báo.
//
// Đặt riêng ở đây thay vì `testTimeout` toàn cục trong vite.config.ts: các ca DOM phải giữ ngân
// sách chặt, nếu không một lượt treo thật sẽ nằm im 2 phút thay vì đỏ ngay.
const HAN_DUYET_CAY = 120_000

async function* diet(dir: string, duoi: string): AsyncGenerator<string> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue
      yield* diet(f, duoi)
    } else if (e.name.endsWith(duoi)) yield f
  }
}

describe('D16 — đổi tên affine-*', () => {
  it('output không còn tiền tố affine- nào, ngoài tên gói trong câu import', async () => {
    expect(existsSync(BUILD)).toBe(true)

    // Tên GÓI cũng chứa `affine-` (`@blocksuite/affine-block-frame/view`) và phải giữ nguyên,
    // nếu không mọi phép phân giải module gãy. Bỏ specifier ra trước rồi mới soi phần còn lại.
    //
    // Danh sách nhánh phải KHỚP TỪNG CHỮ với bộ che trong `scripts/doi-ten-vendor.mjs`, kể cả
    // nhánh `\bimport\s*` cho import chỉ-để-chạy và thứ tự `\bimport\s*\(\s*` đứng trước nó.
    // Lệch một nhánh là ca này đỏ giả (che ít hơn) hoặc mù (che nhiều hơn) — cả hai đều tệ.
    // Tên GÓI cũng có thể bị nhắc NGOÀI câu import (JSDoc, comment...) — bộ che thứ hai trong
    // `scripts/doi-ten-vendor.mjs` xử lý riêng ca này. Phải bỏ luôn phần đó ở đây, nếu không ca
    // này đỏ giả: text được BẢO TOÀN đúng (`@blocksuite/affine-block-surface` trong comment)
    // vẫn còn chữ `affine-` và bị ca này tưởng nhầm là sót.
    //
    // Bộ che thứ BA, cùng lý do: chú thích `//# sourceMappingURL=affine-link.js.map`. Đó là TÊN
    // FILE trên đĩa, không phải tên thẻ DOM hay biến CSS — 7 file trong cây vendored vốn được đặt
    // tên bắt đầu bằng `affine-`, và `tsc` đặt tên .js.map theo tên .js. `doi-ten-vendor.mjs` che
    // chú thích này để nó tiếp tục trỏ đúng file có thật (đổi nó đi thì Vite ném ENOENT
    // `drt-*.js.map` mỗi lượt nạp). Không che ở đây thì ca kiểm đỏ trên đúng một phép bảo toàn có
    // chủ đích. An toàn: bản build production tắt sourcemap và minifier bỏ chú thích, nên chuỗi
    // này KHÔNG bao giờ tới `dist/` — điều đó do `npm run kiem:dist` canh riêng.
    // Bộ che thứ TƯ (2026-09-05, cùng lượt thêm lớp che URL trong doi-ten-vendor.mjs): URL TUYỆT
    // ĐỐI. Luật `\baffine-` trước đây không phân biệt định danh mã với TÊN MIỀN, nên nó đã âm thầm
    // đổi `https://affine-worker.toeverything.workers.dev/...` thành `drt-worker…` — một tên miền
    // KHÔNG TỒN TẠI, hai endpoint chết vĩnh viễn suốt nhiều tháng. Nay URL được bảo toàn nguyên
    // văn, và một URL HỢP LỆ có quyền chứa chữ `affine-`: `consts/index.js:58` có chú thích trỏ
    // `https://github.com/toeverything/affine-workers/...`, đổi nó đi là tạo ra đúng loại liên kết
    // chết mà lớp che sinh ra để chữa.
    // Che ở đây KHÔNG nới lỏng cổng: phần ngoài URL vẫn bị soi nguyên vẹn, còn việc "không URL nào
    // mang tên miền `drt-`" do chốt chặn trong chính doi-ten-vendor.mjs và
    // khong-ben-thu-ba.spec.ts canh riêng.
    const boSpecifier = (js: string) =>
      js
        .replace(
          /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s*|\bexport\s*\*\s*from\s*|\brequire\s*\(\s*)(['"])([^'"]+)\2/g,
          '$1$2$2'
        )
        .replace(/@blocksuite\/affine-[\w/-]*/g, '@blocksuite/__PKG__')
        .replace(/sourceMappingURL=\S+/g, 'sourceMappingURL=__MAP__')
        .replace(/https?:\/\/[^\s'"`)\\]+/g, '__URL__')

    const soPham: string[] = []
    for await (const f of diet(BUILD, '.js')) {
      const js = boSpecifier(readFileSync(f, 'utf8'))
      if (/\baffine-|--affine-/.test(js)) soPham.push(path.relative(BUILD, f))
      if (soPham.length > 5) break
    }
    expect(soPham).toEqual([])
  }, HAN_DUYET_CAY)

  it('tiền tố mới thật sự có mặt — chứng minh phép thay đã chạy', async () => {
    let thay = false
    for await (const f of diet(BUILD, '.js')) {
      if (/\bdrt-/.test(readFileSync(f, 'utf8'))) {
        thay = true
        break
      }
    }
    expect(thay).toBe(true)
  }, HAN_DUYET_CAY)

  // Review task 3, Finding 1 — tên gói `@blocksuite/affine-...` bị nhắc NGOÀI câu import (ví
  // dụ trong JSDoc — xem `affine/blocks/surface/src/renderer/dom-renderer.ts` dòng 121, 141
  // nhắc `@blocksuite/affine-block-surface` trong comment) vẫn lọt xuống luật đổi tên chung và
  // bị biến thành `@blocksuite/drt-block-surface` — một gói không tồn tại trên npm. Hai ca ở
  // trên KHÔNG bắt được lỗi này:
  //   - Ca đầu chỉ soi phần CÒN LẠI sau khi bỏ câu import; một khi comment đã bị đổi thành
  //     `drt-block-surface` thì không còn chữ `affine-` nào sót lại để ca đó tìm thấy.
  //   - Ca thứ hai chỉ kiểm `drt-` có xuất hiện Ở ĐÂU ĐÓ hay không — một tên gói hỏng dạng
  //     `@blocksuite/drt-...` cũng đủ làm ca đó xanh.
  // Ca này kiểm trực diện, không qua bước bỏ specifier nào cả: KHÔNG được có chuỗi
  // `@blocksuite/drt-` ở BẤT KỲ ĐÂU trong output, vì gói đó không tồn tại bất kể nó nằm trong
  // câu import, JSDoc, thông báo lỗi hay chuỗi bất kỳ.
  it('không có tên gói giả @blocksuite/drt- ở bất kỳ đâu trong output', async () => {
    const soPham: string[] = []
    for await (const f of diet(BUILD, '.js')) {
      if (/@blocksuite\/drt-/.test(readFileSync(f, 'utf8'))) {
        soPham.push(path.relative(BUILD, f))
      }
      if (soPham.length > 5) break
    }
    expect(soPham).toEqual([])
  }, HAN_DUYET_CAY)

  // Phép thay văn bản chỉ an toàn khi KHÔNG chỗ nào ghép tên thẻ động. Hôm nay đúng 1 chỗ và
  // nó nằm trong test-utils. Nếu bản nâng cấp sau thêm chỗ thứ hai trong mã sản phẩm, tên thẻ
  // sẽ ghép ra `affine-...` chưa đổi và component im lặng không mount. Cổng này phải đỏ trước.
  it('không có chỗ ghép tên thẻ động ngoài test-utils', async () => {
    const mau = /`affine-\$\{|'affine-'\s*\+|"affine-"\s*\+/
    const soPham: string[] = []
    for await (const f of diet(NGUON, '.ts')) {
      const rel = path.relative(NGUON, f).replace(/\\/g, '/')
      if (rel.includes('test-utils') || rel.includes('__tests__')) continue
      if (mau.test(readFileSync(f, 'utf8'))) soPham.push(rel)
    }
    expect(soPham).toEqual([])
  }, HAN_DUYET_CAY)
})

describe('D12 — bản đồ dịch', () => {
  // Nếu thượng nguồn đổi một chuỗi, khoá trong vi.json không còn khớp và bản dịch trôi âm thầm.
  // Cổng này liệt kê khoá chết để người sau biết mà sửa.
  it('mọi khoá trong vi.json còn tìm thấy trong cây nguồn', async () => {
    const banDo = JSON.parse(readFileSync('src/board/vi.json', 'utf8')) as Record<string, string>
    const khoa = Object.keys(banDo)
    const conSong = new Set<string>()

    for await (const f of diet(NGUON, '.ts')) {
      const ts = readFileSync(f, 'utf8')
      for (const k of khoa) if (!conSong.has(k) && ts.includes(k)) conSong.add(k)
      if (conSong.size === khoa.length) break
    }

    const khoaChet = khoa.filter((k) => !conSong.has(k))
    expect(khoaChet).toEqual([])
  }, HAN_DUYET_CAY)
})
