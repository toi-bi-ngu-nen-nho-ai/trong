import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
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

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const emitSourcemaps = mode === 'development'

  return {
    base: '/',
    build: {
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [vendorJsToTs(), react(), tailwindcss()],
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
