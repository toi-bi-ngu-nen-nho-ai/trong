# BÀN GIAO — đọc file này đầu tiên

Cập nhật: 2026-08-12 (lượt review toàn nhánh cuối P0-C). Dự án: **Bs Trọng** — PWA y khoa tiếng
Việt, đang port Edgeless Canvas của AFFiNE (BlockSuite) sang React.

---

## 1. Đang ở đâu

| Chặng | Nội dung | Trạng thái |
|---|---|---|
| **P0-A** | Vendor tầng dữ liệu BlockSuite 0.27.0 | ✅ gộp `main` tại `d63fcd6` |
| **P0-B** | Port tầng model của `std/gfx` | ✅ gộp `main` tại `a76edb4` |
| **P0-C** | Port tầng không gian của `std/gfx` | 🔶 **Task 1–7 xong**; Task 8 (`tool/`) hoãn sang P1.0 có chủ đích. Đã qua lượt review toàn nhánh, sẵn sàng gộp `main`. |
| P1.0 → P1.4 | Canvas dùng được | chưa bắt đầu |

**Nhánh đang làm:** `worktree-p0c-gfx-khong-gian`
**Worktree:** `.claude/worktrees/p0c-gfx-khong-gian`
**HEAD:** commit của lượt fix review toàn nhánh (xem `git log -1`) — cây **sạch**, `npm test`
**59/59 xanh** (54 ca cũ + 5 ca mới `viewport-runtime-config.spec.ts`), `tsc --noEmit` exit 0.

Đừng tin trí nhớ, tin `git log` và file này.

---

## 2. VẬT CẢN — ĐÃ GỠ (2026-08-11)

> **Chốt:** cả hai lần chặn đã gỡ. Lần 2 chọn **hướng 1 thu hẹp theo số đo**:
> `src/core/gfx/std-identifier.ts` khai đúng `LifeCycleWatcherIdentifier`, kèm
> `src/core/__tests__/std-identifier.spec.ts` (5 ca) cưỡng chế hợp đồng.
> Số đo đầy đủ nằm ở kế hoạch P0-C, mục "`LifeCycleWatcherIdentifier` — vật cản đã gỡ".
> Ba con số quyết định:
> - P0-C cần **1 trong 9** export của `std/src/identifier.ts` — không phải 3.260 dòng.
> - **Hướng 3 chết**: `grid.ts:11`, `layer.ts:19`, `selection.ts:17`, `tool/tool-controller.ts:10`
>   đều `import { GfxExtension }` như **giá trị** → hoãn `extension.ts` là rỗng Task 5–8.
> - **Hướng 1 an toàn hơn tưởng**: DI khoá theo **chuỗi tên** (`di/container.ts:176,184,234`),
>   nên định danh khai ở nhà và bản std tương lai trỏ **cùng một ô** — không có split-brain.
>
> Phần dưới giữ lại làm hồ sơ vì sao, đừng lật lại nếu không có dữ kiện mới.

**P0-C Task 3 bị chặn hai lần liên tiếp, và cả hai đều do phép phân nhóm của kế hoạch sai.**

### Chuyện gì xảy ra

Kế hoạch P0-C chia `std/gfx` thành "nhóm sạch port được ngay" (3.813 dòng) và "nhóm vướng
`BlockStdScope`, hoãn sang P1.0". Phép chia đó dựa trên `grep BlockStdScope|../view|BlockComponent`.

**Nó hụt hai tầng:**

1. **Lần chặn 1:** `extension.ts` và `identifiers.ts` có `import type { GfxController } from './controller.js'` — `controller.ts` thuộc nhóm hoãn. Grep không bắt `from './controller'`.
   → Đã gỡ: khai placeholder `GfxController` trong `src/core/gfx/host.ts`, dựng dần theo task (xem kế hoạch, mục "`GfxController` — placeholder dựng dần").

2. **Lần chặn 2 (CHƯA GỠ):** `identifiers.ts` import `LifeCycleWatcherIdentifier` từ
   `std/src/identifier.ts`. File đó kéo theo `command/`, `event/`, `extension/`, `scope/`, `spec/`
   — **3.260 dòng hạ tầng std** mà kế hoạch P0-C không hề tính tới.

### Dữ kiện đã đo — dùng luôn, đừng đo lại

`std/src/identifier.ts` import đúng sáu thứ, và **cả sáu đều là `import type`** trừ dòng đầu:

```
import { createIdentifier } from '@blocksuite/global/di';   ← GIÁ TRỊ, nhưng global đã vendor rồi
import type { Command } from './command/index.js';
import type { EventOptions, UIEventHandler } from './event/index.js';
import type { BlockService, LifeCycleWatcher } from './extension/index.js';
import type { BlockStdScope } from './scope/index.js';
import type { BlockViewType, WidgetViewType } from './spec/type.js';
```

`createIdentifier` đến từ `@blocksuite/global/di` — **đã vendor ở P0-A**, dùng được ngay.

Nghĩa là 3.260 dòng kia có thể **không cần port thật** — chúng chỉ cần tồn tại ở dạng kiểu.
Tiền lệ đã có hai lần trong dự án này (`EditorHost` ở P0-B, `GfxController` ở P0-C Task 3).

### Ba hướng đã cân nhắc — ĐÃ CHỐT hướng 1 (commit `299aa76`)

> Phần dưới giữ nguyên làm hồ sơ vì sao ba hướng được cân nhắc — như blockquote đầu mục 2 đã nói,
> quyết định đã chốt, đừng lật lại nếu không có dữ kiện mới. `src/core/gfx/std-identifier.ts`
> khai `LifeCycleWatcherIdentifier`, kèm `src/core/__tests__/std-identifier.spec.ts` (5 ca) cưỡng
> chế hợp đồng "DI khoá theo chuỗi tên" — chọn đúng hướng 1 khuyến nghị bên dưới.

1. **Khai placeholder cho các kiểu của `identifier.ts`**, giống cách đã làm với `EditorHost` và
   `GfxController`. Rẻ nhất. Rủi ro: placeholder thứ ba chồng lên nhau, và mỗi cái là một hợp
   đồng chưa ai cưỡng chế. **← ĐÃ CHỌN**, xem cách gỡ rủi ro "hợp đồng chưa ai cưỡng chế" trong
   khối "Chốt" ở đầu mục 2.
2. **Port `std/src/identifier.ts` cùng các kiểu nó cần** (chỉ phần kiểu, không port thân
   `command/event/extension/scope/spec`). Trung thực hơn, tốn hơn.
3. **Đưa `extension.ts` + `identifiers.ts` sang P1.0** cùng `controller.ts`, và **cắt lại phạm vi
   P0-C** cho những file không cần chúng. **Nhưng phải kiểm trước:** `grid.ts`, `layer.ts`,
   `selection.ts`, `tool-controller.ts` đều `import { GfxExtension }` như một **giá trị** từ
   `extension.ts` — nên hướng này có thể làm P0-C rỗng gần hết. Đo trước khi chọn. **Hướng này
   sau đó được xác nhận là chết** — xem "Hướng 3 chết" trong khối "Chốt" ở đầu mục 2.

**Khuyến nghị đã theo:** hướng 1, đo trước xem `extension.ts` và `identifiers.ts` thật sự dùng
bao nhiêu thành viên của mỗi kiểu — đúng cách đã làm với `GfxController` (đo ra đúng 4 thành viên,
và chúng khớp gọn với thứ tự task). Số đo thật: P0-C chỉ cần **1 trong 9** export của
`std/src/identifier.ts` — không phải 3.260 dòng. Placeholder **đo được** thì tốt; placeholder
**đoán** thì tệ.

---

## 3. Bốn bài học đã trả giá — đừng lặp lại

1. **Đừng suy độ sâu đường dẫn tương đối bằng đầu.** Sai 3 lần ở P0-B. Luôn phân giải thật:
   ```bash
   node -e "const p=require('path'),f=require('fs');const t=p.resolve('<thư mục>','<specifier>.ts');console.log(t,f.existsSync(t))"
   ```

2. **Một cổng kiểm đỏ mà vô nghĩa nguy hiểm hơn không có cổng nào.** Cổng `tsc` đặt trên một vòng
   phụ thuộc cố ý bỏ dở đã khiến một implementer đi sửa **mã port** cho cổng xanh — vi phạm
   port-fidelity và giấu một khác biệt so với thượng nguồn.

3. **`git diff` KHÔNG phải cổng D11.** `git diff HEAD -- src/vendor` chỉ so cây làm việc với HEAD
   nên chỉ thấy thay đổi *chưa commit*; nó báo xanh suốt P0-B trong khi 4 file vendored đã bị sửa.
   Với file vendored **mới thêm**, ngay cả `base..HEAD` cũng vô dụng. **Phép kiểm đúng:**
   ```bash
   diff --strip-trailing-cr <file thượng nguồn> <file vendored>
   ```
   **Không dùng `cmp`** — repo này có `core.autocrlf=true` nên cây làm việc là CRLF còn thượng
   nguồn AFFiNE là LF; `cmp` so byte-for-byte nên báo DIFFERS trên cả 143/143 file vendored dù
   nội dung giống hệt, chỉ khác `\r`. Lượt review toàn nhánh cuối P0-C bắt được cổng đỏ giả này
   trong kế hoạch (`docs/superpowers/plans/2026-08-11-p0c-tang-khong-gian.md`) — đã sửa ở đó.

4. **Quét `import` của MỌI file trước khi viết bước sao chép.** Bốn lần đính chính spec ở P0-A và
   hai lần chặn ở P0-C đều đến từ chỗ này. Grep tĩnh còn bỏ sót `await import(...)` — `file-type`
   lọt lưới đúng kiểu đó.

---

## 4. Bản đồ tài liệu

| File | Nội dung |
|---|---|
| `docs/superpowers/specs/2026-08-11-blockkit-edgeless-design.md` | **Spec gốc.** §3 bảng quyết định (D0–D11), §4 kiến trúc, §8 phạm vi, §10 kiểm thử, §11 dependency, §13 đối chiếu 66 package |
| `docs/superpowers/plans/2026-08-11-p0a-nen-blocksuite.md` | Kế hoạch P0-A (xong) |
| `docs/superpowers/plans/2026-08-11-p0b-tang-model-gfx.md` | Kế hoạch P0-B (xong) |
| `docs/superpowers/plans/2026-08-11-p0c-tang-khong-gian.md` | **Kế hoạch P0-C — đang thi hành** |
| `src/vendor/blocksuite/README.md` | Luật D11: mã vendored **cấm sửa** |
| `src/core/gfx/README.md` | Luật cho mã port: giữ nguyên thân hàm, chỉ sửa import |
| `src/core/__tests__/README.md` | Vật cản `accessor` và cách đã gỡ |
| `.superpowers/sdd/progress.md` | Sổ tiến độ chi tiết — **gitignored, chỉ có trong worktree này** |

**Cảnh báo:** `.superpowers/` nằm trong `.gitignore`. Nếu mở worktree mới thì sổ tiến độ **không
theo sang**. File `HANDOFF.md` này được commit nên nó là nguồn tin cậy duy nhất đi xa được.

---

## 5. Quyết định nền — đừng lật lại nếu không có lý do mới

| | Quyết định |
|---|---|
| **D0** | Khi mâu thuẫn: **giống AFFiNE nhất** thắng → rồi mới tới khuyến nghị → rồi tới cái còn lại |
| **D2** | Mindmap và Bài viết là **hai thực thể riêng**, nối bằng liên kết (không phải một Doc hai chế độ) |
| **D7** | **Giữ nguyên lồng nhau** group/frame/layer — `MindmapElementModel` dùng chung lớp cơ sở với `GroupElementModel` |
| **D11** | **Vendor** `global`+`store`+`sync` (chép nguyên văn, cấm sửa) · **port** `std/gfx` · **viết** tầng khung nhìn React |

**Vì sao vendor 0.27.0 mà không cài npm:** npm mới có tới `0.22.4`, và bản đó **không có**
`viewportRuntimeConfig` / `getEffectiveDpr` / `SKIP_REFRESH_DURING_GESTURE` — khối cấu hình giữ
WKWebView khỏi sập lúc pan/zoom trên iPhone. Đó là rủi ro số một của dự án.

---

## 6. Việc còn lại của P0-C

Task 1–7 đã xong (~3.320 dòng port, xem `.superpowers/sdd/progress.md` — gitignored, chỉ có
trong worktree này — để đọc từng task chi tiết):

- Task 1 — fixture `GfxGroupLikeElementModel` + `@observe`, trả nợ I7 một phần
- Task 2 — mở rộng ca canh gác `accessor` ra toàn `src/`, trả nợ I5
- Task 3 — `cursor`, `extension`, `identifiers`, `raf-coalescer` (193 dòng)
- Task 4 — **`Viewport` (925)** — file quan trọng nhất chặng này, chứa khối cấu hình iPhone
- Task 5 — `Grid` (513) + `utils/layer.ts` (171), cài `fractional-indexing`
- Task 6 — `Layer` (1014) — chỗ `sortIndex` của P0-A thật sự được dùng
- Task 7 — `selection.ts` (408) + `std/src/selection/` (271)

**Còn lại duy nhất: Task 8** — `tool/` (760), cơ chế hook cho "hai ngón luôn kéo bảng". **Hoãn
sang P1.0 có chủ đích** (chốt tại soát tiền-bay SDD trước Task 3): `tool-controller.ts` chạm
`BlockStdScope` thật (`this.std.event.add` ×6, `ctx.get` ×6, `this.std.provider` ×2), nằm ngoài
phạm vi "port sạch" mà P0-C nhắm tới. Không phải nợ bị bỏ sót — là ranh giới đã đo và chốt.

Lượt review toàn nhánh cuối P0-C đã chạy xong (0 Critical, không dòng mã port nào cần sửa). Còn
lại: gộp `main`.

---

## 7. Nợ mang từ các chặng trước

- **I7 (một phần đã trả)** — bốn nhánh mã nằm trên đường đi của P1 có 0 ca chạy qua. P0-C Task 1
  đã đóng hai (`GfxGroupLikeElementModel`, `@observe`). Còn `gfx-block-model.ts` và
  `local-element-model.ts`.
- **M9** — spec §10 vẫn ghi `surface.unit.spec.ts` thuộc "nhóm C không port được vì cần Lit". Đã
  chứng minh sai (đã port, 22 ca chạy). Spec chưa sửa.
- **M10** — spec §11 bảng "gói đã rơi" lỗi thời sau khi vendor `store/src/test/`.
- **M14** — `pnpm-lock.yaml` ở gốc repo lỗi thời hoàn toàn; `AGENTS.md` nhắc `.mise.toml` **không
  tồn tại**. Ai chạy `pnpm install` sẽ được cây phụ thuộc hỏng. Lockfile sống là `package-lock.json`.
- **Đo lại bundle** — số hiện tại là **sàn, không phải trần**: tầng gfx chưa được app import nên
  bundler tree-shake bỏ hết, và **Babel chưa từng chạy trong `npm run build`**. Phải đo lại khi
  P1.0 nối gfx vào entry. Ngưỡng xét lại D11: +150 kB gzip.
- **Hướng đã đo chưa dùng:** `ts.transpileModule` thay hai lượt Babel trong `vite.config.ts`, gỡ
  được 5 devDependency, test và build đều xanh khi thử.
- `block-database` / `block-table` / `data-view` — hoãn tới phiên backend, **phải nhắc lại**.

---

## 8. Lệnh kiểm nhanh

```bash
cd "C:/Users/LENOVO/Downloads/drtrong/.claude/worktrees/p0c-gfx-khong-gian"
npm test          # kỳ vọng: Test Files 12 passed, Tests 59 passed
npx tsc --noEmit  # kỳ vọng: exit 0, không in gì
npm run build     # kỳ vọng: thành công
```

Nguồn thượng nguồn để đối chiếu: `C:/Users/LENOVO/Downloads/AFFiNE/blocksuite/`
