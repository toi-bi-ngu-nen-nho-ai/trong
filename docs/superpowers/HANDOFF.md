# BÀN GIAO — đọc file này đầu tiên

Cập nhật: **2026-08-12**. Dự án: **Bs Trọng** — PWA y khoa tiếng Việt.

**Hướng đi vừa đổi.** Đọc mục 1 trước khi làm bất cứ gì, kể cả khi bạn thấy mã cũ trông hợp lý.

---

## 1. Đổi hướng — điều quan trọng nhất trong file này

Ba chặng P0-A/B/C đã **port** `std/gfx` của BlockSuite sang React. Việc đó **đã dừng.**

Chủ dự án đính chính hai điều làm nền của quyết định cũ sụp:

1. **Mục tiêu là giống AFFiNE 100%** — "frontend, animation, reaction" — chứ không phải một canvas
   lấy cảm hứng từ AFFiNE. Phần này chiếm **~70% thành công dự án**.
2. **Thiết bị chính là iPad + PC Windows.** iPhone chủ yếu để đọc. Spec cũ ghi ngược
   ("iPhone là chính") và dựng cả bảng cử chỉ cảm ứng lên tiền đề sai đó.

**Hướng mới: NHÚNG tầng khung nhìn Lit của AFFiNE, không viết lại bằng React.**

Số đo quyết định:

| | |
|---|---|
| Tầng khung nhìn Lit của AFFiNE | **220.118 dòng** |
| Riêng phần P1 cần đến | 50.000–79.000 dòng |
| Ba chặng P0 sản xuất được | 4.800 dòng **chép nguyên văn** |
| Trong `gfx/mindmap` (5.539 dòng): thuật toán xếp cây | **201 dòng — 4%** |

96% còn lại của mindmap là cảm giác — vệt chỉ báo lúc kéo, 4 phong cách, giỏ công cụ. Đó là phần
không đọc-rồi-viết-lại được, và là nguồn của rủi ro "90% mãi mãi".

**Bằng chứng kiến trúc:** `packages/frontend/{core,component,routes}` của chính AFFiNE **là React**
và nhúng editor BlockSuite viết bằng Lit, kể cả bản mobile. Vỏ React + ruột Lit không phải đường lạ.

---

## 2. Việc tiếp theo — bắt tay vào đây

**Kế hoạch:** `docs/superpowers/plans/2026-08-12-p1-nhung-edgeless.md` — **P1-A, 5 task, đã tự soát,
sẵn sàng thi hành.**

**Cách chạy:**

```
/superpowers:subagent-driven-development
```

Đích của chặng: **mở được một bảng edgeless trống, pan/zoom được trên iPad và PC, không mang dấu
vết AFFiNE.**

| Task | Việc | Đích |
|---|---|---|
| 1 | Vendor cây blocksuite + cổng D11 | `npm run kiem:vendor` exit 0 |
| 2 | **Dịch trước bằng `tsc`** | gỡ vật cản decorator |
| 3 | Đổi tên `affine-*` → `btb-*` + bản đồ dịch | nguồn vẫn sạch sau khi đổi |
| 4 | Cầu nối React↔Lit + extension cắt gọn | bảng mở được, pan/zoom được |
| 5 | Xoá `src/core/gfx` | 4.800 dòng của P0-B/P0-C |

**Ngoài phạm vi có chủ đích:** lưu trữ (D4) và BoardGallery. Bảng trống không cần bền vững, và như
thế chặng này có một đích **nhìn thấy được** thay vì một quãng dài không kiểm được — đúng thứ P0-C
đã phải sống chung một lần.

**Chưa duyệt:** tiền tố `btb` (Bảng Trọng Board) thay cho `affine`. Đổi bây giờ rẻ; sau khi thi
hành phải chạy lại cả đường ống. Hỏi chủ dự án trước Task 3.

---

## 3. Trạng thái mã

**Nhánh `main`** — sạch, đã đẩy lên origin.

| Commit | |
|---|---|
| `f833782` | Gộp P0-C (mã port — **sắp bị xoá ở Task 5**) |
| `c55d52b` | Spec hướng mới |
| `8d2b018` | D16 — xoá dấu vết AFFiNE |
| `eee79cb` | Kế hoạch P1-A |

Cổng hiện tại trên `main`: `npx tsc --noEmit` exit 0 · `npm test` **62/62** · `npm run build` thành công.

**Nhánh `probe-nhung-lit`** (`336f7e7`) — bản thử nhúng, là **bằng chứng đo đạc**, không phải mã sản
phẩm. Đừng gộp vào `main`. Nó chứa:

- `probe/blocksuite-source-plugin.ts` — plugin phân giải 70 gói `@blocksuite/*`
- `probe/main.tsx` (nhúng đầy đủ) và `probe/main-gon.tsx` (cắt gọn)
- 271 dependency npm trong `package.json`

Nhánh đó **build được nhưng chưa chạy được** — chính vật cản decorator mà Task 2 sẽ gỡ. Đọc nó để
tham khảo, đừng chép nguyên: Task 2 đi đường khác (dịch trước bằng `tsc` thay vì Babel).

Ba worktree cũ còn treo: `p0c-gfx-khong-gian`, `p0b-gfx-model`, `blockkit-edgeless`. Xoá lúc nào cũng được.

---

## 4. Bảng quyết định — đọc spec, đừng đoán

**Spec có thẩm quyền:** `docs/superpowers/specs/2026-08-12-nhung-edgeless-affine-design.md`

Spec cũ (`2026-08-11-blockkit-edgeless-design.md`) **vẫn còn giá trị** ở §5 (mô hình dữ liệu),
§8 (phạm vi tính năng), §9 (lưu trữ, xử lý lỗi). **Bảng quyết định của nó đã hết hiệu lực.**

| Giữ nguyên | Gạch từ trước | Viết lại | Mới |
|---|---|---|---|
| D0 D2 D3 D5 D6 D7 D8 | D1 D10 | **D11** D9 D4 | **D12 D13 D14 D15 D16** |

Bốn quyết định hay bị hiểu nhầm nhất:

- **D11** — vendor toàn bộ `blocksuite/`, **nhúng** tầng Lit, chỉ viết vỏ React + cầu nối
- **D16** — xoá dấu vết AFFiNE **bằng biến đổi lúc build**, không vá tay. Đã đo: 256 tên thẻ,
  154 biến CSS, và **đúng 1 chỗ** ghép tên động (nằm trong `test-utils`) nên phép thay văn bản an toàn
- **D4** — lưu trữ chia đôi: `idb.ts` giữ *danh sách bảng*, y-indexeddb của AFFiNE giữ *nội dung bảng*.
  Đã kiểm hai điều kiện chủ dự án đặt: **miễn phí** (không một dòng `http`/`fetch`/`wss` trong
  `sync/doc/impl/`) và **đồng bộ được** (`DocSource` là giao diện ba hàm `pull`/`push`/`subscribe`)
- **D14** — cơ chế vá: **quyết bây giờ, xây khi cần**. Không viết dòng nào cho tới miếng vá đầu tiên

**Luật "cấm sửa" mã vendored chính là cơ chế đẻ ra "không bị ghim"** — giữ bản chép sạch thì nâng
cấp = xoá thư mục chép bản mới. Sửa vào đó là mỗi lần nâng cấp phải ghép tay lại từng chỗ.

**Ranh giới pháp lý:** BlockSuite là MIT. Giấy phép buộc giữ dòng bản quyền trong bản phát hành, mà
PWA phục vụ JS cho trình duyệt chính là phát hành. `LICENSE` **ở lại** trong `src/vendor/`.

---

## 5. Năm bài học đã trả giá — đừng lặp lại

1. **Đừng suy độ sâu đường dẫn tương đối bằng đầu.** Sai 3 lần ở P0-B. Luôn phân giải thật:
   ```bash
   node -e "const p=require('path'),f=require('fs');const t=p.resolve('<thư mục>','<specifier>');console.log(t,f.existsSync(t))"
   ```

2. **Một cổng kiểm đỏ mà vô nghĩa nguy hiểm hơn không có cổng nào.** Nó đẩy người ta đi sửa sai chỗ.
   Xảy ra hai lần: một lần khiến implementer sửa **mã port** cho cổng xanh; một lần là cổng `cmp`
   trong kế hoạch P0-C báo đỏ 143/143 file dù nội dung giống hệt.

3. **Phép kiểm D11 đúng là `diff --strip-trailing-cr`, KHÔNG phải `cmp`, cũng không phải `git diff`.**
   Repo có `core.autocrlf=true` nên cây làm việc là CRLF còn thượng nguồn là LF. `git diff HEAD`
   từng báo xanh suốt P0-B trong khi 4 file vendored đã bị sửa.

4. **Quét `import` của MỌI file trước khi viết bước sao chép.** Bốn lần đính chính spec ở P0-A và
   hai lần chặn ở P0-C đều đến từ chỗ này.

5. **Hỏi "tầng này có cần tồn tại không" TRƯỚC khi tối ưu cách xây nó.** Suốt P0-C, cách làm được đo
   rất kỹ — cổng, port-fidelity, placeholder đo được — mà không ai hỏi câu đó. Lúc rẻ nhất để hỏi là
   trước khi tiêu ba chặng.

---

## 6. Phát hiện kỹ thuật đáng mang sang

**`viewportRuntimeConfig` có hai nửa vòng đời khác nhau.** `ZOOM_MIN`/`ZOOM_MAX` đọc qua **getter
động** nên override lúc nào cũng ăn; nhưng `SKIP_REFRESH_DURING_GESTURE` và bốn hằng số anh em là
**field initializer — chốt cứng lúc dựng `Viewport`**.

Hậu quả nếu quên: mount viewport lúc bootstrap rồi chạy cấu hình iOS trong một `useEffect` sẽ ăn sàn
zoom mobile (nhìn như đã cấu hình đúng) nhưng **không** ăn thứ giữ WKWebView khỏi bị kill lúc
pan/zoom. Desktop hoàn hảo, iPhone chết.

Bộ 5 ca cưỡng chế điều này nằm ở `src/core/__tests__/viewport-runtime-config.spec.ts` —
**Task 5 phải chuyển nó sang `src/board/__tests__/` và trỏ vào `@blocksuite/affine/std/gfx`**, không
được xoá theo.

---

## 7. Bản đồ tài liệu

| File | Nội dung |
|---|---|
| `docs/superpowers/specs/2026-08-12-nhung-edgeless-affine-design.md` | **Spec có thẩm quyền** |
| `docs/superpowers/plans/2026-08-12-p1-nhung-edgeless.md` | **Kế hoạch đang thi hành** |
| `docs/superpowers/specs/2026-08-11-blockkit-edgeless-design.md` | Spec cũ — chỉ §5, §8, §9 còn giá trị |
| `docs/superpowers/notes/2026-08-11-do-bundle-p0c.md` | Số bundle cũ (là **sàn**, không phải trần) |
| `src/vendor/blocksuite/README.md` | Luật D11 |

**Cảnh báo:** `.superpowers/` nằm trong `.gitignore` nên sổ tiến độ **không đi xa được**. File này
được commit nên nó là nguồn tin cậy duy nhất qua được sang phiên khác.

---

## 8. Lệnh kiểm nhanh

```bash
cd "C:/Users/LENOVO/Downloads/drtrong"
npx tsc --noEmit    # kỳ vọng: exit 0
npm test            # kỳ vọng: 62/62 xanh
npm run build       # kỳ vọng: thành công
```

Nguồn thượng nguồn để đối chiếu: `C:/Users/LENOVO/Downloads/AFFiNE/blocksuite`
