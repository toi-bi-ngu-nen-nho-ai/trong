import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import * as babel from '@babel/core'
import path from 'node:path'

// Mã vendored trong src/vendor/blocksuite/ dùng specifier kiểu './vec.js' trỏ vào file .ts —
// quy ước của TypeScript khi biên dịch ra ESM. `tsc` với moduleResolution "bundler" hiểu được,
// nhưng Vite phân giải đúng chuỗi đó rồi không thấy file.
//
// Sửa bằng plugin thay vì sửa mã: D11 cấm chạm vào src/vendor/blocksuite/, để lúc BlockSuite
// 0.27.0 được publish thì thay bằng dependency npm chỉ là xoá thư mục và bỏ alias.
function vendorJsToTs(): Plugin {
  return {
    name: 'vendor-js-to-ts',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (!importer?.includes('/vendor/blocksuite/')) return null
      if (!source.startsWith('.') || !source.endsWith('.js')) return null
      const resolved = await this.resolve(source.slice(0, -3), importer, { skipSelf: true })
      return resolved?.id ?? null
    },
  }
}

// Vite 8 chạy trên rolldown + oxc, không có Babel. oxc *phân tích cú pháp* được từ khoá
// `accessor` (Stage-3 decorators/auto-accessor) nhưng chưa hạ cấp (lower) nó — giữ nguyên
// văn trong output — nên trình chạy JS (Node lúc test, engine trình duyệt lúc build) mới là
// nơi thực sự ném `SyntaxError: Unexpected identifier`. Đổi `target` không có tác dụng vì đây
// không phải chuyện esnext-hoá cú pháp đã hỗ trợ, mà là tính năng oxc chưa cài đặt transform.
//
// BlockSuite khai mọi thuộc tính bằng `accessor` (luôn đi kèm decorator kiểu `@field`), nên
// chỗ duy nhất cần vá là các file port ở `src/core/**` dùng cú pháp đó — không phải cả app.
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
// giẫm chân. Tách lượt tốn thêm một lần parse/print nhưng chỉ với 3 file, không đáng kể.
//
// Type-checking vẫn qua `tsc --noEmit` riêng — Babel ở đây không type-check, chỉ strip.
//
// Lọc theo nội dung (`accessor` xuất hiện trong file) chứ không theo toàn bộ thư mục, để chi
// phí Babel chỉ tính trên số file thực sự cần — hiện tại là 3 file.
function accessorSupport(): Plugin {
  const coreDir = path.resolve(__dirname, 'src/core').replace(/\\/g, '/')
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

      if (!normalized.startsWith(coreDir + '/') || !tsFile.test(normalized)) return null
      // Kiểm rẻ trước khi gọi Babel: đa số file trong src/core/** không dùng accessor.
      if (!/\baccessor\b/.test(code)) return null

      const isTSX = normalized.endsWith('.tsx')

      const stripped = await babel.transformAsync(code, {
        filename: bareId,
        babelrc: false,
        configFile: false,
        sourceType: 'module',
        assumptions,
        presets: [['@babel/preset-typescript', { isTSX, allowDeclareFields: true }]],
        plugins: [['@babel/plugin-syntax-decorators', { version: '2023-05' }]],
      })
      if (!stripped?.code) return null

      const result = await babel.transformAsync(stripped.code, {
        filename: bareId.replace(tsFile, isTSX ? '.jsx' : '.js'),
        babelrc: false,
        configFile: false,
        sourceType: 'module',
        sourceMaps: true,
        assumptions,
        plugins: [['@babel/plugin-proposal-decorators', { version: '2023-05' }]],
      })

      if (!result?.code) return null
      return { code: result.code, map: result.map }
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
    plugins: [vendorJsToTs(), accessorSupport(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@blocksuite/global': path.resolve(__dirname, './src/vendor/blocksuite/global/src'),
        '@blocksuite/store': path.resolve(__dirname, './src/vendor/blocksuite/store/src'),
        '@blocksuite/sync': path.resolve(__dirname, './src/vendor/blocksuite/sync/src'),
      },
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
      // Môi trường node: không test nào trong P0-A chạm DOM. P0-B port viewport
      // (có nhánh DOMMatrix) thì đổi sang 'happy-dom'.
      environment: 'node',
      include: ['src/**/__tests__/**/*.spec.ts'],
    },
  }
})
