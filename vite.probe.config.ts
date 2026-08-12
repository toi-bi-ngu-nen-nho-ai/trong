// Cấu hình Vite RIÊNG cho bản thử nhúng (nhánh probe-nhung-lit) — không thuộc mã sản phẩm.
//
// Tách khỏi `vite.config.ts` có chủ đích: bản thử trỏ mọi `@blocksuite/*` vào cây nguồn AFFiNE,
// còn cấu hình thật trỏ vào `src/vendor/`. Trộn hai cái sẽ tạo ra hai bản sao của `store`/`global`
// trong cùng một bundle, và mọi phép `instanceof` giữa chúng sẽ sai.
//
// Chạy:  npx vite --config vite.probe.config.ts
// Build: npx vite build --config vite.probe.config.ts

import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

import { blocksuiteSource } from './probe/blocksuite-source-plugin'

export default defineConfig({
  root: path.resolve(__dirname, 'probe'),
  plugins: [blocksuiteSource(), react()],
  resolve: {
    // Một bản sao duy nhất cho mỗi thư viện có trạng thái toàn cục. Yjs và signals-core mà bị
    // nhân đôi thì lỗi hiện ra ở tầng chạy dưới dạng "cùng kiểu nhưng không bằng nhau".
    dedupe: ['yjs', '@preact/signals-core', 'lit', 'lit-html', '@lit/context'],
  },
  // Bộ tiền-đóng-gói dependency của Vite chạy bằng oxc và KHÔNG đi qua hook `transform` của
  // plugin, nên mọi file AFFiNE lọt vào đó sẽ giữ nguyên từ khoá `accessor` chưa hạ cấp và
  // trình duyệt ném SyntaxError. Tắt hẳn bước phát hiện để mã AFFiNE luôn đi qua plugin.
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-probe'),
    emptyOutDir: true,
    // Không chia nhỏ: cần một con số tổng để so với ngưỡng +150 kB gzip.
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8444,
    strictPort: true,
    fs: {
      // Cây nguồn AFFiNE nằm NGOÀI gốc dự án; mặc định Vite trả 403 cho mọi file ngoài root.
      allow: [
        path.resolve(__dirname),
        'C:/Users/LENOVO/Downloads/AFFiNE',
      ],
    },
  },
})
