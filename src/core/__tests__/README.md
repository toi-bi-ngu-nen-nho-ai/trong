# Test của tầng lõi

## `surface.spec.ts.pending` — đang bị chặn, KHÔNG phải bỏ quên

File này là bản port của `framework/std/src/__tests__/gfx/surface.unit.spec.ts` (26 ca), phủ
đúng phần hiện **không có test nào chạy qua**: `SurfaceBlockModel.addElement/updateElement/
deleteElement`, observer, giá trị mặc định của element model, `stash`/`pop`, và cả bốn decorator
`field` / `derive` / `local` / `convert`.

Đuôi `.pending` để Vitest không thu thập, giữ bộ test xanh và trung thực.

### Vì sao chưa chạy được

Toolchain của dự án (Vite 8.1.5 → rolldown + oxc) **không dịch được từ khoá `accessor`**:

```
SyntaxError: Unexpected identifier 'x'
   class A { accessor x: number = 1 }
```

Đã khoanh vùng: hỏng ở chính `accessor`, không phải ở decorator.

### Vì sao điều này nghiêm trọng hơn vẻ ngoài

`accessor` là cách BlockSuite khai **mọi thuộc tính của mọi element**. Trong bản port hiện tại
nó xuất hiện ở:

- `src/core/gfx/model/surface/element-model.ts`
- `src/core/gfx/model/surface/local-element-model.ts`
- `src/core/__tests__/fixtures/test-gfx-element.ts`

Nghĩa là **tầng model qua được `tsc` nhưng chưa nạp được lúc chạy**. Bốn cổng nghiệm thu của
P0-B đều xanh chỉ vì không có gì import chúng lúc chạy — 21 test hiện có không chạm tới, và
bundler tree-shake bỏ chúng khỏi `dist`.

Mọi phần tử của P1 (shape, connector, brush, text, mindmap) đều khai bằng cú pháp này, nên đây
là vật cản của cả P1, không riêng gì test.

### Cần gì để bỏ chặn

Một quyết định về tầng biên dịch, chưa chốt:

1. Thêm bộ biến đổi hiểu `accessor` (Babel với `@babel/plugin-proposal-decorators`, hoặc SWC) —
   thêm devDependency và làm chậm build của cả app.
2. Tìm cấu hình oxc/rolldown xử lý được — agent review cuối đã thử chỉnh target và ghi nhận
   "identical bundle hash, so the `oxc` target has no effect".
3. Viết lại mã port bỏ `accessor` — phá port-fidelity ở diện rộng, đi ngược D11.

### Cách bật lại khi đã gỡ được

```bash
mv src/core/__tests__/surface.spec.ts.pending src/core/__tests__/surface.spec.ts
npx vitest run src/core/__tests__/surface.spec.ts
```

Hạ tầng cho nó đã sẵn sàng: `src/vendor/blocksuite/store/src/test/` (TestWorkspace) đã vendor,
`fixtures/` đã port, alias `@blocksuite/store/*` đã nối trong `tsconfig.json`.

**Ghi chú cho spec §10:** mục đó xếp `surface.unit.spec.ts` vào "nhóm C — không port được vì cần
khung Lit". Điều đó **sai**: `effects()` chỉ đăng ký custom element và không ca nào trong file
chạm tới, bỏ đi là port được. Vật cản thật là `accessor`, không phải Lit.
