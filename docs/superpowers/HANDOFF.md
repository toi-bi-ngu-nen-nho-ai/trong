# BÀN GIAO — đọc file này đầu tiên

Cập nhật: **2026-08-13**. Dự án: **Bs Trọng** — PWA y khoa tiếng Việt.

**P1-A đã thi hành xong trên nhánh `worktree-p1a-nhung-edgeless`. Chưa gộp vào `main`.**

---

## 1. Trạng thái

`main` vẫn ở `afac297`, **không bị đụng**. Toàn bộ chặng nằm trên nhánh
`worktree-p1a-nhung-edgeless` (25 commit), worktree ở `.claude/worktrees/p1a-nhung-edgeless`.

Chủ dự án chọn **giữ nguyên nhánh** để tự kiểm trên iPad trước khi quyết gộp.

### Cổng nghiệm thu — đã chạy thật

| Cổng | Kết quả |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm test` | 10 file / 26 ca xanh |
| `npm run kiem:vendor` | exit 0 — 2.782 file, lệch 0 |
| `npm run kiem:vendor-paths` | exit 0 — 438 mục khớp |
| `npm run kiem:dist` | exit 0 |
| `npm run build` | vỏ app 332,59 kB gzip · chunk bảng 993,69 kB gzip · CSS bảng 14,27 kB |

Kiểm trên trình duyệt (tab sạch, dev server worktree ở cổng 8444): bảng mở ở màn Mindmap,
8 thẻ custom `drt-*`, **0 thẻ `affine-*`**, console sạch, token màu phân giải
(`--drt-primary-color` = `#1E96EB`), zoom `1 → 1.1`, pan tâm `(0,0) → (87,58)`.

---

## 2. CHƯA NGHIỆM THU — việc của chủ dự án

1. **iPad — toàn bộ.** Một nửa mốc nghiệm thu của kế hoạch, không có thiết bị để chạy.
   Rủi ro chưa gỡ: xử lý pointer/touch và pinch-zoom dưới mô hình cử chỉ của Safari; hành vi
   `@container viewport` trên iPadOS; và chi phí bộ nhớ/parse của chunk 4 MB trong WKWebView —
   đúng loại áp lực mà `SKIP_REFRESH_DURING_GESTURE` sinh ra để chịu, mà **chưa dòng mã nào trong
   chặng này cấu hình nó**.
2. **Vẽ hình bằng công cụ shape.** Chạy được bằng sự kiện tổng hợp bắn vào đúng phần tử canvas,
   **chưa phải input thật của hệ điều hành**. `ShapeViewExtension`, `BrushViewExtension`,
   `ConnectorViewExtension`, `MindmapViewExtension` đều đã đăng ký nhưng chưa từng vẽ ra gì.
3. **Chế độ tối.** Theme khai `[data-theme=light|dark]`, nhưng app gỡ `data-theme` khi để chế độ
   "Tự động" — bảng sẽ luôn sáng dù máy đang tối. Đã phát hiện, **cố ý chưa sửa**, chờ quyết.
4. **Chuyển tab điều hướng là mất hình đang vẽ.** Màn Mindmap render có điều kiện nên rời tab là
   unmount, lần sau vào dựng `TestWorkspace` mới. Lưu trữ thuộc D4 — chặng sau. Quyết định sản
   phẩm: hoặc giấu tab khỏi thanh nav tới khi có D4, hoặc giữ component mounted, hoặc báo rõ
   "chưa lưu được".

---

## 3. Kiến trúc đã dựng

```
src/vendor/blocksuite/     BlockSuite 0.27.0, chép NGUYÊN VĂN, cấm sửa (D11)
        │  npm run dung:vendor   (vài phút)
        ▼
  .vendor-build/           JS thuần — gitignore. Bốn bước, đúng thứ tự:
                             1. tsc dịch (rolldown/oxc KHÔNG hạ cấp được `accessor`)
                             2. đổi tên affine-* → drt-*, --affine-* → --drt-*, + theme css
                             3. chép package.json (không có nó, bundler không thấy
                                sideEffects:false và KHÔNG tree-shake gì cả)
                             4. sinh tsconfig.vendor-paths.json
        │  vite.vendor-plugin.ts
        ▼
  src/board/               vỏ React + cầu nối Lit, nạp chậm
```

**Tiền tố `drt`** (Doctor Trọng) thay `affine` — chủ dự án duyệt 2026-08-12.

### Năm cổng và việc của từng cái

| Lệnh | Canh cái gì |
|---|---|
| `kiem:vendor` | cây vendored khớp nguyên văn thượng nguồn (D11). Chạy được cả khi không có checkout AFFiNE, nhờ `bang-bam-vendor.json` |
| `kiem:vendor-build` | `.vendor-build/` tồn tại và bước đổi tên đã chạy |
| `kiem:vendor-paths` | bản đồ paths đã commit còn mô tả đúng `.vendor-build/` |
| `kiem:dist` | **soi `dist/`** — không biến CSS nào dùng mà không định nghĩa, không chuỗi `affine-` nào sót |
| `npm test` | mã dự án sở hữu |

`kiem:dist` sinh ra vì lượt review cuối bắt được thứ **mọi cổng khác đều mù**: chúng đều dừng ở
`.vendor-build/`, không cái nào soi bản build thật.

---

## 4. Bảy bài học đã trả giá

1. **Kế hoạch sai bốn chỗ, và mã trong kế hoạch không phải là mã đúng.** Bộ che specifier sót
   `import 'x'`; không có bước cài phụ thuộc (16 dep có, cần 67); `dung:vendor` viết bằng `&&`
   **không bao giờ chạy bước đổi tên** vì `tsc` luôn exit khác 0; và ca kiểm decorator đo sai thứ
   nó tuyên bố đo. Đọc mã trong kế hoạch như bản nháp, không như lời tiên tri.
2. **Cổng xanh không có nghĩa là sản phẩm đúng.** Bảng từng ship ra với **808 lượt dùng
   `var(--drt-…)` và 0 định nghĩa** — không màu, không viền, không bóng. Không lỗi, không cảnh
   báo. Đếm thẻ DOM, đo kích thước, soi console: cả ba đều xanh. Phải có cổng soi *đầu ra thật*.
3. **Tiêu chí xong của một task không thay được bộ cổng đầy đủ.** Task 1 vào sổ "xong" trong khi
   nó làm bộ test từ 62/62 xanh tụt xuống 70/78 file đỏ — vì tiêu chí xong của nó chỉ nhắc
   `kiem:vendor`, nên không ai chạy `npm test`. Từ đó mọi lượt dispatch đều buộc chạy đủ ba cổng.
4. **Server dev của checkout gốc luôn giữ cổng 8443.** Mở app từ worktree sẽ lặng lẽ xem nhầm app
   của cây khác — đã mất một lượt dò mới phát hiện. Dùng `PORT=8444`.
5. **Buffer console của công cụ trình duyệt không xoá khi điều hướng.** Lỗi cũ từ phiên sửa file
   trông y hệt lỗi mới. Mở tab mới khi cần kết luận "console sạch".
6. **Sự kiện tổng hợp phải bắn vào đúng phần tử có listener.** Bắn vào phần tử bọc ngoài thì
   không tới, vì sự kiện đi lên chứ không đi xuống — suýt kết luận nhầm là pan/zoom hỏng.
7. **`npm run format` đã bị xoá hẳn.** `oxfmt` 0.2.0 không có cơ chế ignore, nên nó định dạng lại
   cả 2.764 file vendored và đổi kiểu nháy — tức phá D11. Đừng thêm lại nếu chưa có cách giới hạn.

---

## 5. Nợ còn lại, đã phân loại là hoãn được

- `kiem-vendor.mjs`: dòng thống kê bỏ sót `gocThua.length`; in đường dẫn theo dấu phân cách HĐH.
- `test:watch` không có cổng `pretest:watch`.
- Bằng chứng đỏ của hai ca board không bắt được **đổi thứ tự** widget, mà `extensions.ts` nói thứ
  tự quyết định z-index. Hiện đã kiểm tay: mảng 22 mục đúng là dãy con giữ thứ tự của thượng nguồn.
- `src/board/vi.json` mới có **5 chuỗi**. Cơ chế D12 đã đúng, độ phủ gần bằng không — thanh công cụ
  bảng vẫn tiếng Anh. Còn khoảng 260 chuỗi.
- `src/board/__tests__/edgeless-board-mount.spec.ts` từng đỏ một lần vì timeout rồi xanh lại ngay.
  Nghi hai thủ phạm: mặc định 5 giây của vitest khi mount cả cây Lit, hoặc đường render bất đồng bộ
  qua `requestIdleCallback` mà chính header file đó nhắc. **Chưa bắt được thông điệp lỗi thật** —
  bắt được rồi hãy chọn cách sửa, đừng nâng timeout mò.
- `public/sw.js` còn `CACHE = "drtrong-v8"` dù bundle đã đổi; chính file đó ghi việc tăng số là
  BẮT BUỘC.

---

## 6. Bản đồ tài liệu

| File | Nội dung |
|---|---|
| `docs/superpowers/specs/2026-08-12-nhung-edgeless-affine-design.md` | Spec có thẩm quyền |
| `docs/superpowers/plans/2026-08-12-p1-nhung-edgeless.md` | Kế hoạch P1-A — **đã thi hành xong** |
| `docs/superpowers/specs/2026-08-11-blockkit-edgeless-design.md` | Spec cũ — chỉ §5, §8, §9 còn giá trị |
| `src/vendor/blocksuite/README.md` | Luật D11 |

Sổ tiến độ chi tiết của chặng nằm ở `.superpowers/sdd/progress.md` **trong worktree** — thư mục đó
bị gitignore nên nó **không đi xa được**. File bạn đang đọc là thứ duy nhất qua được sang phiên khác.

---

## 7. Chặng kế tiếp

- **Lưu trữ (D4)** — nối y-indexeddb của AFFiNE cho nội dung bảng, nâng `DB_VERSION` lên 5 cho
  danh sách bảng. Gỡ luôn mục 4 của phần "chưa nghiệm thu".
- **BoardGallery** — màn danh sách bảng.
- **Bổ sung `vi.json`** — dịch dần theo mức độ hay gặp.
- **Cấu hình `viewportRuntimeConfig` cho iOS** — chưa dòng nào làm. Nhớ: `ZOOM_MIN`/`ZOOM_MAX` đọc
  qua getter động nên override lúc nào cũng ăn, còn `SKIP_REFRESH_DURING_GESTURE` là field
  initializer **chốt cứng lúc dựng `Viewport`**. Cấu hình sau khi mount là ăn sàn zoom nhưng
  **không** ăn thứ giữ WKWebView khỏi bị kill. Bộ 5 ca cưỡng chế điều này ở
  `src/board/__tests__/viewport-runtime-config.spec.ts`.
