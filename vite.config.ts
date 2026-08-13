import { defaultExclude, defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import * as babel from '@babel/core'
import fs from 'node:fs'
import path from 'node:path'
import { blocksuiteVendor } from './vite.vendor-plugin'
// Ba file `*.css.ts` trong khối Note của cây vendored dùng vanilla-extract. `style({...})` là
// lời gọi lúc BUILD, không phải lúc chạy: thiếu plugin thì nó ném "Styles were unable to be
// assigned to a file" ngay khi nạp module, trước cả ca kiểm đầu tiên. Gói này không nằm trong
// danh sách đo từ nhánh probe vì bản probe chưa bao giờ chạy được tới đó.
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'

// `vendorJsToTs()` từng đứng ở đây: nó vá specifier kiểu './vec.js' trỏ vào file .ts, cần thiết
// hồi Vite còn đọc thẳng .ts trong src/vendor/blocksuite/. Giờ Vite chỉ đọc `.vendor-build/`
// (JS thuần, './vec.js' là file có thật) nên plugin đó không còn đối tượng — gỡ hẳn thay vì để
// lại một plugin không bao giờ khớp.

// Vite 8 chạy trên rolldown + oxc, không có Babel. oxc *phân tích cú pháp* được từ khoá
// `accessor` (Stage-3 decorators/auto-accessor) nhưng chưa hạ cấp (lower) nó — giữ nguyên
// văn trong output — nên trình chạy JS (Node lúc test, engine trình duyệt lúc build) mới là
// nơi thực sự ném `SyntaxError: Unexpected identifier`. Đổi `target` không có tác dụng vì đây
// không phải chuyện esnext-hoá cú pháp đã hỗ trợ, mà là tính năng oxc chưa cài đặt transform.
//
// BlockSuite khai mọi thuộc tính bằng `accessor` (luôn đi kèm decorator kiểu `@field`). P0-B
// từng port một bản `std/gfx` vào `src/core/**` nên ban đầu phạm vi lọc chỉ tới đó — P1-A Task 5
// đã xoá hẳn `src/core/` (trùng với `std/gfx` đã có sẵn trong `@blocksuite/affine/std`) nhưng
// vẫn giữ phạm vi lọc phủ TOÀN BỘ `src/`, vì P1 sẽ viết shape, connector, brush, text, mindmap
// dùng cú pháp này và không nhất thiết đặt trong một thư mục cố định. Trừ `src/vendor/` (mã bên
// thứ ba, cấm sửa và cấm đưa vào phạm vi lọc — D11; hiện không file vendored nào dùng `accessor`,
// nếu sau này có thì cần quyết định riêng, không tự động nuốt vào đây).
// Dùng Babel (`@babel/plugin-proposal-decorators`, bản `2023-05` — bản đầu tiên hạ cấp được
// `accessor`) làm bước biên dịch *trước* oxc.
//
// Hai hướng đã thử và hỏng trước khi ra được cách dưới đây:
// 1. Chỉ parse cú pháp TS (`@babel/plugin-syntax-typescript`, không strip type), để dành
//    việc strip type cho oxc ở bước sau. Hỏng: field kiểu `private _lastXYWH!: SerializedXYWH`
//    (definite-assignment, không initializer, không decorator) nằm chung class với field có
//    `accessor` + decorator. Babel gộp `preset-typescript` và `plugin-proposal-decorators`
//    vào MỘT lượt traverse; khi class có decorator, phần "class-features" dùng chung giữa
//    hai plugin xử lý lại toàn bộ field của class đó (kể cả field không decorator) trước khi
//    visitor kiểm tra "definite assignment" của TS kịp chạy — báo lỗi "Definitely assigned
//    fields cannot be initialized here" dù nguồn không hề có initializer.
// 2. Gộp `@babel/preset-typescript` (strip type) và `@babel/plugin-proposal-decorators` vào
//    cùng một lượt `babel.transformAsync`. Hỏng vì đúng lý do ở trên — vẫn một lượt traverse
//    duy nhất, thứ tự visitor giữa hai plugin vẫn giẫm lên nhau.
//
// Cách chạy được: TÁCH THÀNH HAI LƯỢT BABEL riêng biệt, mỗi lượt một lần traverse trọn vẹn.
// Lượt 1 chỉ chạy `@babel/preset-typescript` (strip type, giữ `@babel/plugin-syntax-decorators`
// để parse — không transform — cú pháp decorator) → ra JS thuần, không còn `!`/type annotation.
// Lượt 2 chạy `@babel/plugin-proposal-decorators` trên JS thuần đó, không còn gì của TS để
// giẫm chân. Tách lượt tốn thêm một lần parse/print, tính trên số file thực sự qua Babel — xem
// con số đo được ở khối ngay dưới, đừng đoán.
//
// Type-checking vẫn qua `tsc --noEmit` riêng — Babel ở đây không type-check, chỉ strip.
//
// Lọc theo nội dung (`accessor` xuất hiện trong file) chứ không theo toàn bộ thư mục con, để
// chi phí Babel chỉ tính trên số file thực sự cần — sau P1-A Task 5 (xoá `src/core/`):
// - npm run build: 0 file — không còn nguồn nào trong module graph lúc build khai `accessor`.
// - npm test: 2 file (`src/lib/__tests__/accessor-outside-core.spec.ts` khai một class dùng
//   `accessor` thật; `src/__tests__/vendor-decorator.spec.ts` chỉ khớp vì từ khoá xuất hiện
//   trong comment/regex của nó, không khai `accessor` thật — bộ lọc so khớp theo văn bản nên vẫn
//   đưa file này qua Babel, vô hại vì không có gì để hạ cấp).
// CẢNH BÁO: Con số build bằng 0 không phải vì bộ lọc tốt, mà vì chưa có element nào của P1 (shape,
// connector, brush, text, mindmap — thứ sẽ khai `accessor`) được nối vào entry app. Khi chặng sau
// làm việc đó, Babel sẽ lần đầu chạy trong `npm run build` với chi phí thực tế có thể khác hẳn so
// với phép đo hiện tại. CẦN ĐO LẠI khi đó.
function accessorSupport(): Plugin {
  const srcDir = path.resolve(__dirname, 'src').replace(/\\/g, '/')
  const vendorDir = path.resolve(__dirname, 'src/vendor').replace(/\\/g, '/')
  const tsFile = /\.tsx?$/
  // Khớp tsconfig.json useDefineForClassFields: false — field gán bằng `=` (assign semantics),
  // không phải `Object.defineProperty` (define semantics). Thiếu assumption này, babel dùng
  // define semantics theo mặc định và từ chối field kiểu `x!: T;` không initializer (mẫu phổ
  // biến trong mã port, gán thật ở constructor).
  const assumptions = { setPublicClassFields: true }

  return {
    name: 'accessor-support',
    enforce: 'pre',
    async transform(code, id) {
      const [bareId] = id.split('?')
      const normalized = bareId.replace(/\\/g, '/')

      if (!normalized.startsWith(srcDir + '/') || !tsFile.test(normalized)) return null
      // src/vendor/ là mã bên thứ ba (D11) — cấm sửa, cấm đưa vào phạm vi lọc dù nội dung có
      // khớp `accessor` hay không.
      if (normalized.startsWith(vendorDir + '/')) return null
      // Kiểm rẻ trước khi gọi Babel: đa số file trong src/** không dùng accessor.
      if (!/\baccessor\b/.test(code)) return null

      const isTSX = normalized.endsWith('.tsx')

      const stripped = await babel.transformAsync(code, {
        filename: bareId,
        babelrc: false,
        configFile: false,
        sourceType: 'module',
        sourceMaps: true,
        assumptions,
        presets: [['@babel/preset-typescript', { isTSX, allowDeclareFields: true }]],
        plugins: [['@babel/plugin-syntax-decorators', { version: '2023-05' }]],
      })
      if (!stripped?.code) {
        throw new Error(
          `accessorSupport: luot 1 (strip type TypeScript) khong tra ve code cho ${bareId}`
        )
      }

      // Lượt 2 chạy trên JS đã strip type (output của lượt 1), không phải trên `code` gốc —
      // nên phải nối map: khai `inputSourceMap` bằng map của lượt 1 để Babel dựng ra map cuối
      // trỏ thẳng về file .ts gốc thay vì về JS trung gian của lượt 1.
      const result = await babel.transformAsync(stripped.code, {
        filename: bareId.replace(tsFile, isTSX ? '.jsx' : '.js'),
        babelrc: false,
        configFile: false,
        sourceType: 'module',
        sourceMaps: true,
        inputSourceMap: stripped.map ?? undefined,
        assumptions,
        plugins: [['@babel/plugin-proposal-decorators', { version: '2023-05' }]],
      })

      if (!result?.code) {
        throw new Error(
          `accessorSupport: luot 2 (transform decorator) khong tra ve code cho ${bareId}`
        )
      }
      return { code: result.code, map: result.map }
    },
  }
}

// ─── D16, nửa còn lại: các `--affine-*` KHÔNG đi qua scripts/doi-ten-vendor.mjs ───────────────
//
// Script đó chỉ quét `.vendor-build/`. Nhưng bảng vẽ kéo theo hai nguồn `--affine-` nữa mà nó
// không với tới, và cả hai đều lọt tới `dist/` (đo được trên bản dựng trước lượt sửa này):
//
//  1. Gói npm `@toeverything/theme` (nằm trong node_modules, KHÔNG vendored). Nó không chỉ khai
//     biến — nó còn TRẢ VỀ tên biến lúc chạy: một bộ sinh tên `` `--affine-v2-${đường/dẫn}` `` và
//     một bảng hằng chứa sẵn chuỗi như `calc(1 / var(--affine-zoom))`. Cây vendored gọi thẳng vào
//     đó, nên các tên này đi vào chunk bảng vẽ nguyên vẹn tiền tố thượng nguồn.
//  2. vanilla-extract. Ba file `*.css.ts` của khối Note biên dịch `cssVar(...)` của gói trên thành
//     CSS THẬT lúc build — tức là sau khi bước đổi tên đã chạy xong từ lâu. Kết quả:
//     `dist/assets/EdgelessBoard-*.css` phát ra `var(--affine-black-10)`, `var(--affine-white)`,
//     `var(--affine-active-shadow)`... trong khi cả phần còn lại của bundle đã nói `--drt-`.
//
// Plugin này khép kín cả hai bằng ĐÚNG một luật, ở hai chỗ:
//   - `transform`: có tác dụng ở chế độ dev (không có bước bundle nào chạy ở đó).
//   - `generateBundle`: lượt quét cuối trên chính sản phẩm sắp ghi ra đĩa. Không phụ thuộc vào thứ
//     tự plugin — vanilla-extract chạy trong một instance Vite RIÊNG chỉ cho `blocksuite-vendor`
//     đi cùng (xem khai báo bên dưới), nên CSS nó sinh ra không chắc chắn đi qua `transform` của
//     plugin này. Ở generateBundle thì mọi thứ đã là chunk/asset, không còn chỗ nào để lọt.
//
// Chỉ đổi `--affine-` (biến CSS), KHÔNG đổi `affine-` trần: tên GÓI npm cũng bắt đầu bằng
// `affine-` (`@blocksuite/affine-block-note`) và một luật rộng hơn sẽ phải mang theo cả bộ máy che
// specifier như trong scripts/doi-ten-vendor.mjs. Không cần: đo trên bản dựng thật, TOÀN BỘ chỗ
// `affine-` còn sót trong `dist/` đều mang tiền tố `--`. Nếu một ngày có tên thẻ `affine-*` lọt từ
// node_modules vào bundle, `npm run kiem:dist` (quét `affine-` trần) sẽ đỏ và bắt xử lý có ý thức,
// thay vì để luật ở đây âm thầm nuốt mất.
const TU_KHOA_AFFINE = '--affine-'
function doiTenBienCssAffine(): Plugin {
  const doi = (ma: string) => ma.split(TU_KHOA_AFFINE).join('--drt-')
  // Mã của CHÍNH DỰ ÁN nằm ngoài phạm vi: `src/` không tiêu thụ biến `--affine-` nào, nhưng nó có
  // NÓI VỀ chúng — `src/__tests__/vendor-doi-ten.spec.ts` mang biểu thức chính quy
  // `/\baffine-|--affine-/` làm chính công cụ phát hiện của nó. Không loại trừ ở đây thì plugin
  // viết lại nguồn của ca kiểm đó thành `--drt-` và biến nó thành một cổng bắt nhầm mọi file. Đã
  // xảy ra thật ở lượt sửa này (1 failed | 25 passed) trước khi thêm bộ lọc.
  // `src/vendor/blocksuite/` cũng nằm dưới `src/` nhưng Vite không bao giờ nạp thẳng từ đó — mọi
  // specifier `@blocksuite/*` được `blocksuiteVendor()` trỏ sang `.vendor-build/`.
  const thuMucDuAn = path.resolve(__dirname, 'src').replace(/\\/g, '/') + '/'
  return {
    name: 'doi-ten-bien-css-affine',
    enforce: 'post',
    transform(code, id) {
      if (id.split('?')[0].replace(/\\/g, '/').startsWith(thuMucDuAn)) return null
      if (!code.includes(TU_KHOA_AFFINE)) return null
      // Trả code không kèm sourcemap: phép thay đổi độ dài chuỗi này chỉ chạm gói theme và CSS do
      // vanilla-extract sinh, không phải mã nguồn của dự án — mất map ở đó không đáng để dựng cả
      // bộ magic-string chỉ cho một phép thay chuỗi.
      return doi(code)
    },
    generateBundle(_tuyChon, bundle) {
      for (const muc of Object.values(bundle)) {
        if (muc.type === 'chunk') {
          if (muc.code.includes(TU_KHOA_AFFINE)) muc.code = doi(muc.code)
        } else if (typeof muc.source === 'string' && muc.source.includes(TU_KHOA_AFFINE)) {
          muc.source = doi(muc.source)
        }
      }
    },
  }
}

// ─── Giấy phép bên thứ ba trong bản phát hành ────────────────────────────────────────────────
//
// `src/vendor/blocksuite/LICENSE` được giữ nguyên trong repo (D11) — nhưng repo không phải thứ
// được phát hành. Bản build production bị minify và bỏ hết chú thích, nên `dist/` trước lượt sửa
// này KHÔNG mang một dòng bản quyền nào, trong khi nó chứa mã của SÁU tác phẩm giấy phép MIT
// (BlockSuite, cộng năm thư viện được nhúng thẳng vào cây surface/global: perfect-freehand, rough,
// points-on-path, points-on-curve, path-data-parser). MIT đòi giữ lại thông báo bản quyền TRONG
// các bản phân phối — đó chính là lý do luật "không được sửa/xoá LICENSE" tồn tại.
//
// Đọc thẳng từ đĩa lúc build thay vì chép tay một file vào repo: thêm hay bớt một thư viện nhúng
// trong cây vendored sẽ tự động phản ánh vào bản phát hành ở lượt build kế tiếp.
function giayPhepBenThuBa(): Plugin {
  const goc = path.resolve(__dirname, 'src/vendor/blocksuite')

  const timGiayPhep = (dir: string, ra: string[] = []): string[] => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules') continue
      const f = path.join(dir, e.name)
      if (e.isDirectory()) timGiayPhep(f, ra)
      else if (e.name === 'LICENSE') ra.push(f)
    }
    return ra
  }

  return {
    name: 'giay-phep-ben-thu-ba',
    apply: 'build',
    generateBundle() {
      const files = timGiayPhep(goc).sort()
      if (files.length === 0) {
        this.error(
          'giay-phep-ben-thu-ba: không thấy file LICENSE nào trong src/vendor/blocksuite/. ' +
            'Không phát hành một bản dựng thiếu thông báo bản quyền của mã bên thứ ba.',
        )
      }
      const than = files
        .map((f) => {
          const ten = path.relative(goc, f).split(path.sep).join('/')
          return `${'='.repeat(78)}\n${ten}\n${'='.repeat(78)}\n\n${fs.readFileSync(f, 'utf8').trimEnd()}\n`
        })
        .join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'THIRD-PARTY-LICENSES.txt',
        source:
          'Ứng dụng này nhúng mã nguồn của các tác phẩm bên thứ ba dưới đây. Nguyên văn giấy\n' +
          'phép của từng tác phẩm được giữ lại đầy đủ, theo đúng yêu cầu của giấy phép MIT.\n\n' +
          `Third-party notices — ${files.length} works.\n\n${than}`,
      })
    },
  }
}

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const emitSourcemaps = mode === 'development'

  return {
    base: '/',
    build: {
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      blocksuiteVendor(),
      // vanilla-extract chạy các file `.css.*` trong một instance Vite RIÊNG và mặc định bỏ hết
      // plugin của người dùng. Các file đó import `@blocksuite/affine-shared/consts`, nên phải
      // cho `blocksuite-vendor` đi cùng, nếu không instance riêng kia không phân giải nổi.
      vanillaExtractPlugin({ unstable_pluginFilter: ({ name }) => name === 'blocksuite-vendor' }),
      accessorSupport(),
      react(),
      tailwindcss(),
      doiTenBienCssAffine(),
      giayPhepBenThuBa(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Ba alias @blocksuite/{global,store,sync} từng nằm ở đây đã bị gỡ: `blocksuiteVendor()`
        // phân giải TOÀN BỘ cây vendored theo đúng bản đồ `exports` của từng gói. Giữ lại alias
        // sẽ tạo hai đường tới cùng một module trong một bundle — lỗi "cùng kiểu nhưng
        // `instanceof` trả về false" rất khó lần.
      },
      // Hai bản sao `yjs` hoặc `lit` sinh ra đúng loại lỗi trên. `dedupe` ép mọi importer dùng
      // chung một bản.
      dedupe: ['yjs', '@preact/signals-core', 'lit', 'lit-html', '@lit/context'],
    },
    server: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
      strictPort: true,
    },
    preview: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
    },
    test: {
      // Môi trường node. `viewport.ts` (Viewport, có nhánh DOMRect/DOMMatrix) đã port ở P0-C
      // Task 4 — nhưng environment vẫn CHƯA đổi. Test nào chạm `toModelCoord`/`toViewCoord`/
      // `boundingClientRect` sẽ đâm `ReferenceError: DOMRect is not defined` ngay (đã xác nhận
      // bằng probe thật, xem `Viewport.get boundingClientRect` / `Viewport.toModelCoord`
      // trong `viewport.ts`). File nào THẬT SỰ cần DOM thì khai riêng bằng chỉ thị
      // `// @vitest-environment happy-dom` ở dòng đầu file đó (xem
      // src/board/__tests__/edgeless-board-mount.spec.ts và dang-ky-custom-element.spec.ts) —
      // đổi cho một file, không kéo theo 15 file spec còn lại và không phải trả giá khởi tạo DOM
      // cho những ca không cần. Vì thế mặc định ở đây vẫn là 'node'.
      environment: 'node',
      include: ['src/**/__tests__/**/*.spec.ts'],
      // `src/vendor/blocksuite/` là bản vendor nguyên trạng của AFFiNE (D11 — cấm sửa), và glob
      // `include` ở trên khớp cả 75 file spec gốc của thượng nguồn nằm trong đó. Dự án này chỉ
      // kiểm mã mình sở hữu — AFFiNE có bộ test riêng của họ, không phải việc của dự án — nên phải
      // loại `src/vendor/**` khỏi vitest, nếu không 14 file spec của dự án chìm nghỉm giữa 75 file
      // spec thượng nguồn (thiếu peer deps như happy-dom) và không còn thấy được kết quả thật.
      // Khai `exclude` THAY THẾ mặc định của vitest chứ không cộng dồn. Trước đây mặc định bị
      // chép tay thành mảng chữ ('**/node_modules/**', '**/.git/**') — nếu vitest đổi
      // defaultExclude ở bản sau (thêm thư mục mới cần loại), mảng chép tay sẽ âm thầm không
      // cập nhật theo và có thể lọt spec không mong muốn vào bộ test. `defaultExclude` là export
      // công khai của 'vitest/config' (đã import ở đầu file) — dùng trực tiếp rồi spread thêm
      // thư mục vendor, để mặc định luôn đi theo đúng bản vitest đang cài.
      exclude: [...defaultExclude, 'src/vendor/**'],
    },
  }
})
