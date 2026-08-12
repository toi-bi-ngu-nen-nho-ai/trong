# Task 2 (P1-A, fix-guard) Report: cổng thiếu `.vendor-build/` + defaultExclude cứng

Sửa hai phát hiện review (Finding 1 — Important, Finding 3 — Minor) trên nhánh
`worktree-p1a-nhung-edgeless`.

## Finding 1 — không gì đảm bảo `.vendor-build/` tồn tại trước khi cần

### Vấn đề

`.vendor-build/` bị gitignore, chỉ được tạo bằng cách chạy tay `npm run dich:vendor` (vài phút).
`vite.config.ts` `resolve.alias` trỏ thẳng `@blocksuite/{global,store,sync}` vào
`.vendor-build/framework/*/src`, không có phương án dự phòng. Trên checkout mới (`npm install &&
npm test`, hoặc `npm run dev`/`npm run build`), mọi import ba specifier đó phân giải trượt, và lỗi
Vite/Rolldown báo ra không hề gợi ý bước còn thiếu.

### Fix

Thêm `scripts/kiem-vendor-build.mjs` — cổng nhanh, chỉ kiểm tồn tại (không biên dịch lại), kiểm
một file cụ thể do chính `dich:vendor` sinh ra trong mỗi gói (không phải chỉ thư mục rỗng):

```
.vendor-build/framework/global/src/index.js
.vendor-build/framework/store/src/index.js
.vendor-build/framework/sync/src/index.js
```

Ba đường dẫn trên đã resolve thật trước khi ghi vào script:

```
$ node -e "const p=require('path'),f=require('fs');const t=p.resolve('.','.vendor-build/framework/global/src/index.js');console.log(t,f.existsSync(t))"
C:\Users\LENOVO\Downloads\drtrong\.claude\worktrees\p1a-nhung-edgeless\.vendor-build\framework\global\src\index.js true

$ node -e "const p=require('path'),f=require('fs');const t=p.resolve('.','.vendor-build/framework/store/src/index.js');console.log(t,f.existsSync(t))"
C:\Users\LENOVO\Downloads\drtrong\.claude\worktrees\p1a-nhung-edgeless\.vendor-build\framework\store\src\index.js true

$ node -e "const p=require('path'),f=require('fs');const t=p.resolve('.','.vendor-build/framework/sync/src/index.js');console.log(t,f.existsSync(t))"
C:\Users\LENOVO\Downloads\drtrong\.claude\worktrees\p1a-nhung-edgeless\.vendor-build\framework\sync\src\index.js true
```

Wire vào `package.json` bằng npm lifecycle hook (`pre<script>` chạy tự động trước script cùng
tên, kể cả với script tự đặt tên như `dev`/`build`, không chỉ `pretest` built-in):

```json
"predev": "node scripts/kiem-vendor-build.mjs",
"dev": "vite --host 0.0.0.0",
"prebuild": "node scripts/kiem-vendor-build.mjs",
"build": "vite build",
"pretest": "node scripts/kiem-vendor-build.mjs",
"test": "vitest run",
"kiem:vendor-build": "node scripts/kiem-vendor-build.mjs",
```

(`kiem:vendor-build` thêm để có thể chạy tay cổng này độc lập, cùng phong cách với
`kiem:vendor` đã có.)

### Bằng chứng cổng hoạt động (red run thật)

Đổi tên `.vendor-build/` sang `.vendor-build.bak/` (không xoá — đổi tên cây vài nghìn file thì
rẻ, biên dịch lại thì không):

```
$ mv .vendor-build .vendor-build.bak
$ npm test

> drtrong@1.0.0 pretest
> node scripts/kiem-vendor-build.mjs

Thiếu cây vendor đã biên dịch (.vendor-build/) — vite.config.ts trỏ alias @blocksuite/{global,store,sync} thẳng vào đó, không có phương án dự phòng.
Chạy lệnh sau rồi thử lại (tốn vài phút):

    npm run dich:vendor

Các file kỳ vọng nhưng không thấy:
   .vendor-build/framework/global/src/index.js
   .vendor-build/framework/store/src/index.js
   .vendor-build/framework/sync/src/index.js
EXIT=1
```

Cổng chặn trước khi vitest kịp chạy — không còn lỗi "unresolved import" khó hiểu, và thông
điệp bằng tiếng Việt, nêu đích danh `npm run dich:vendor`.

Khôi phục:

```
$ mv .vendor-build.bak .vendor-build
$ npm test
...
 Test Files  14 passed (14)
      Tests  65 passed (65)
```

## Finding 3 — `vitest` default excludes bị hardcode

### Vấn đề

`vite.config.ts` `test.exclude` là mảng chữ chép tay lại mặc định của vitest
(`['**/node_modules/**', '**/.git/**']`) cộng thêm `'src/vendor/**'`. `defaultExclude` là export
công khai của `vitest/config` — file này đã import từ đó. Nếu một bản vitest sau đổi
`defaultExclude` (thêm thư mục mặc định cần loại), mảng chép tay không tự theo, có thể âm thầm
thu hẹp phạm vi loại trừ.

### Fix

```ts
import { defaultExclude, defineConfig, type Plugin } from 'vitest/config'
...
exclude: [...defaultExclude, 'src/vendor/**'],
```

## Verify (chạy thật, không suy luận)

```
$ npm test
 Test Files  14 passed (14)
      Tests  65 passed (65)

$ npx tsc --noEmit
(exit 0, không output)

$ npm run kiem:vendor
Đã so 2776 file, lệch 0, không đối chiếu được 0
(exit 0)
```

Ba số trên khớp đúng kỳ vọng: 14 file / 65 test test, tsc sạch, kiem:vendor sạch.
