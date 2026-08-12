# Thiết kế: Nhúng Edgeless Canvas của AFFiNE vào Bs Trọng

> **Tài liệu này thay bảng quyết định và kiến trúc của**
> `2026-08-11-blockkit-edgeless-design.md`. Spec cũ vẫn còn giá trị ở §5 (mô hình dữ liệu),
> §8 (phạm vi tính năng), §9 (lưu trữ, xử lý lỗi) — những phần không phụ thuộc lựa chọn dưới đây.
> Bảng quyết định trong spec cũ **đã hết hiệu lực**; bảng ở §2 tài liệu này là bản có thẩm quyền.

Ngày: 2026-08-12. Dự án: **Bs Trọng** — PWA y khoa tiếng Việt, chạy trên máy, chưa có backend.

---

## 1. Vì sao viết lại

Spec ngày 2026-08-11 chốt: **port** `std/gfx` sang React rồi **viết** tầng khung nhìn bằng React.
Ba chặng P0-A/B/C đã thi hành phần đầu — vendor 15.127 dòng tầng dữ liệu, port 4.800 dòng tầng
không gian. Tất cả xanh, đã gộp `main` tại `f833782`.

Rồi chủ dự án đính chính hai điều khiến nền của quyết định đó sụp:

1. **Mục tiêu là giống AFFiNE 100%** — "frontend, animation, reaction" — chứ không phải một canvas
   lấy cảm hứng từ AFFiNE. Phần này chiếm ~70% thành công của cả dự án.
2. **Thiết bị chính là iPad + PC Windows**, iPhone chủ yếu để đọc. Spec cũ viết ngược
   ("Bs Trọng chạy trên iPhone là chính") và dựng cả bảng cử chỉ cảm ứng "buộc phải khác AFFiNE"
   lên tiền đề sai đó.

### Số đo khiến quyết định cũ không đứng được

| Tầng | Dòng | Ghi chú |
|---|---|---|
| `framework/global` + `store` + `sync` | 15.127 | đã vendor ở P0-A |
| `framework/std` | 21.422 | P0-B/P0-C port ~4.800 |
| **`affine/` — tầng khung nhìn Lit** | **220.118** | **chưa đụng** |

220 nghìn dòng đó *là* "frontend, animation, reaction". Riêng phần P1 cần đến — mindmap, shape,
connector, brush, text, note, frame, surface, widget khung chọn — đo được **50.000–79.000 dòng**.
Đối chiếu: ba chặng P0 sản xuất 4.800 dòng **chép nguyên văn**.

Rõ nhất là ở `gfx/mindmap` (5.539 dòng), thứ chủ dự án ưu tiên nhất:

| Phần | Dòng |
|---|---|
| `view/layout.ts` — **thuật toán xếp cây** | **201** |
| phong cách, cách vẽ nút và đường nối | 1.750 |
| thanh công cụ, menu, giỏ kéo-thả, icon | 2.058 |
| logic kéo một nhánh sang chỗ khác | 655 |
| vệt chỉ báo lúc đang kéo | 301 |
| renderer, adapter | 280 |

**Thuật toán lõi chiếm 4%.** 96% còn lại là cảm giác — và đó chính là phần không đọc-rồi-viết-lại
được. Đây là nguồn của rủi ro "90% mãi mãi": 90% đầu nhìn thấy được, 10% cuối thì không.

### Bằng chứng quyết định

**AFFiNE tự làm y hệt kiến trúc này.** `packages/frontend/core`, `component`, `routes` của họ là
**React**, và chúng nhúng editor BlockSuite viết bằng Lit — kể cả bản mobile
(`packages/frontend/mobile-native`). Vỏ React + ruột Lit không phải đường lạ.

Và D1 trong spec cũ đã tự gạch giả định chặn đường này: *"~~Không nhúng BlockSuite vì kéo theo
Lit~~ — giả định sai, Lit chỉ sống ở tầng khung nhìn."*

---

## 2. Bảng quyết định — bản có thẩm quyền

### Giữ nguyên từ spec cũ

| # | Quyết định | Vì sao vẫn đúng |
|---|---|---|
| **D0** | Khi mâu thuẫn: **giống AFFiNE nhất thắng**, rồi tới khuyến nghị người thực hiện, rồi tới cái còn lại | Chính D0 dẫn tới quyết định nhúng |
| **D2** | Mindmap và Bài viết là **hai thực thể riêng**, nối bằng liên kết | Không phụ thuộc lựa chọn này |
| **D3** | **Xoá sạch frontend cũ**, không khôi phục từ `fd24576` | Không phụ thuộc |
| **D5** | **Yjs là nguồn sự thật** cho cả cây block lẫn phần tử surface | Mạnh hơn — giờ dùng đúng Yjs của AFFiNE |
| **D6** | Docs đi theo **cây block đầy đủ** + slash menu + drag handle | Thuộc P2; nhúng còn cho sẵn |
| **D7** | **Giữ nguyên lồng nhau** group/frame/layer | Trước là việc phải làm, giờ tự có |
| **D8** | Chỉ cắt **tính năng**, không cắt **kiến trúc** | Không phụ thuộc |

### Đã gạch từ trước, giữ làm hồ sơ

| # | |
|---|---|
| **D1** | ~~Không nhúng BlockSuite vì kéo theo Lit~~ — gạch 2026-08-11, "giả định sai" |
| **D10** | ~~Cài `@blocksuite/store` + `global` từ npm~~ — gãy vì npm mới có 0.22.4 |

### Viết lại

| # | Quyết định | Lý do |
|---|---|---|
| **D11** | **Vendor toàn bộ `blocksuite/` nguyên văn · NHÚNG tầng khung nhìn Lit · chỉ viết vỏ React và cầu nối** | Thay cho "port `std/gfx` + viết tầng khung nhìn React". Xem §1 |
| **D9** | Kiểm thử = **chỉ kiểm những mối nối dự án sở hữu** | Thay cho "port test gốc". Không còn gì để port thì không có test nào để port. Xem §5 |
| **D4** | **Chia đôi tầng lưu trữ theo bản chất dữ liệu.** `src/lib/idb.ts` giữ *danh sách bảng* (tên, màu, chuyên khoa, xoá mềm), nâng `DB_VERSION` lên 5. *Nội dung bảng* dùng y-indexeddb của AFFiNE | Thay cho "giữ `idb.ts` làm nền" chung chung. Hai điều kiện chủ dự án đặt ra đã kiểm — xem §6 |

### Mới

| # | Quyết định | Lý do |
|---|---|---|
| **D12** | **Tiếng Việt bằng bản đồ chuỗi thay lúc build** — một file `vi.json`, plugin swap khi build. Không sửa mã vendored | Đo được 260 chuỗi tiếng Anh cứng. Một phần nằm trong config (override được), phần khác nằm thẳng trong template Lit (không override được) — nên override đơn thuần không đủ. Thay lúc build giữ mã vendored nguyên văn, nên cổng `diff` với thượng nguồn vẫn chạy và nâng cấp bản mới không phải dịch lại |
| **D13** | **Danh sách extension cắt gọn** theo nhu cầu bảng, **nạp chậm** khi mở board | Đo được: đầy đủ 1.856 kB gzip / 293 file; cắt gọn **1.131 kB gzip / 5 file**. Xem §4 |
| **D14** | **Cơ chế vá: quyết bây giờ, xây khi cần.** Lối chính thức để đổi hành vi bên trong mã vendored là file vá áp lúc build. Không viết dòng nào cho tới miếng vá đầu tiên | Không có lối này, ngày cần đổi một hằng số thì lựa chọn duy nhất là phá luật "cấm sửa" — và phá xong là mất khả năng nâng cấp |
| **D15** | **Chép mã vendored vào repo** (`src/vendor/blocksuite/`), không trỏ ra cây AFFiNE ngoài | ~13,6 MB. Repo `.git` từ 11 MB phình cỡ gấp rưỡi. Đổi lại: build được trên máy khác, và git biết chính xác đang ở bản nào |

### Luật bị bỏ

| Luật cũ | Vì sao bỏ |
|---|---|
| **`src/core/` cấm import React** (spec cũ §4) | Lý do gốc: cùng công thức hình học phải chạy ở React render, kéo tay, và vẽ lại canvas lúc xuất PNG. AFFiNE tự lo cả ba. Luật mất đối tượng áp dụng |
| **Bảng cử chỉ cảm ứng "buộc phải khác AFFiNE"** (spec cũ §7) | Dựng trên tiền đề "iPhone là chính" đã bị đính chính. PC Windows dùng chuột — chỗ thiết kế của AFFiNE đúng sẵn. Nếu sau này cần luật cảm ứng riêng, dùng cơ chế hook của `tool/tool.ts` như D0 chỉ định, không viết lại dispatcher |

---

## 3. Kiến trúc

```
src/screens/     React — danh sách bảng, chuyên khoa, thư viện, mọi màn hình khác
      │
      │  chạm vào một board → dynamic import (D13)
      ▼
src/board/       Cầu nối ~15 dòng: useRef + litRender(std.render(), el)
      ▼
src/vendor/      Toàn bộ blocksuite 0.27.0, chép nguyên văn, CẤM SỬA (D11, D15)
```

Ba tầng, ba cách đối xử:

- **VIẾT** — `src/screens/` và `src/board/`. Mã của dự án, tiếng Việt, da Bs Trọng.
- **VENDOR** — `src/vendor/blocksuite/`. Chép nguyên văn, cấm sửa. Muốn đổi hành vi thì theo
  thứ tự: extension → DI override → bản đồ chuỗi (D12) → file vá (D14).
- **KHÔNG CÒN** — không còn tầng "PORT". Đây là khác biệt lớn nhất so với spec cũ.

### Phép nhúng, cụ thể

```ts
const std = new BlockStdScope({ store, extensions: viewManager.get('edgeless') })
litRender(std.render(), el)   // el là một <div> do React giữ bằng useRef
```

React giữ thẻ div; Lit render vào trong. Hai bên không biết gì về nhau — đó là điều làm phép
nhúng khả thi. Đã dựng thật và build thành công (xem §7).

### "Cấm sửa" nghĩa là gì

BlockSuite là **MIT** — không có ràng buộc pháp lý nào. Đây là **luật dự án tự đặt cho mình**, và
nó chính là cơ chế đẻ ra khả năng nâng cấp: giữ bản chép sạch thì nâng cấp = xoá thư mục, chép bản
mới. Sửa vào đó một chỗ thì mỗi lần nâng cấp phải tự tay ghép lại từng sửa đổi.

Bốn cửa để đổi hành vi mà **không** phá luật:

| Muốn | Cách | Sửa mã vendored? |
|---|---|---|
| Nhãn tiếng Việt | Bản đồ chuỗi lúc build (D12) | Không |
| Thêm nút thanh công cụ | Viết extension | Không |
| Thêm loại phần tử riêng cho y khoa | Viết extension — đúng cách AFFiNE tự dựng mọi thứ | Không |
| Thay một dịch vụ có sẵn | `di.override(...)` | Không |
| Đổi hằng số hoặc hành vi trong ruột component | File vá (D14) | Có, nhưng nằm riêng |

---

## 4. Bundle và nạp chậm (D13)

Đo thật, bằng bản thử dựng trong dự án:

| | Chunk chính | Số file JS | Tổng |
|---|---|---|---|
| App Bs Trọng hiện tại | 331 kB gzip | — | — |
| Nhúng **toàn bộ** editor | 1.856 kB gzip | 293 | 17 MB |
| Nhúng **cắt gọn** | **1.131 kB gzip** | **5** | 5,6 MB |

Cắt bỏ: database, bảng, block code (kéo theo Shiki với ~40 ngôn ngữ — 288 file chunk phụ biến mất),
LaTeX/KaTeX, PDF, attachment, bookmark, embed, data-view, surface-ref.

Giữ: nền tảng, pointer/snap, mindmap, shape, connector, brush, text, note, group, frame, surface,
root, paragraph, list, cộng widget khung chọn · vùng quét chọn · tiêu đề frame · lớp phủ viewport ·
thanh công cụ edgeless · thanh zoom.

**1.131 kB vẫn gấp 3,4 lần app hiện tại.** Cách sống chung: **nạp chậm**. Vỏ app giữ nguyên 331 kB;
1.131 kB chỉ tải khi người dùng thật sự mở một bảng — và bảng chủ yếu mở trên iPad/PC.

Ngưỡng +150 kB gzip trong spec cũ **bị bỏ**: nó được đặt khi tưởng iPhone là thiết bị chính.

---

## 5. Kiểm thử (D9)

Chỉ kiểm những mối nối dự án sở hữu. **Không kiểm mã của AFFiNE** — họ có bộ test riêng, viết lại
là kiểm hộ người khác.

| Kiểm cái gì | Vì sao |
|---|---|
| Cầu nối React↔Lit: mount, unmount, không rò | Mã của dự án, và là chỗ hai mô hình component gặp nhau |
| Bản đồ dịch (D12): mọi khoá còn khớp chuỗi thượng nguồn | Cổng phải **đỏ** khi thượng nguồn đổi chuỗi, nếu không bản dịch âm thầm trượt |
| Vòng lưu–đọc nội dung bảng | Nơi dữ liệu người dùng có thể mất |
| Danh sách extension cắt gọn (D13) vẫn dựng được editor | Cắt nhầm một extension thì editor chết lúc chạy, `tsc` không bắt được |

Cổng D11 giữ nguyên cách kiểm đã học được ở P0-C: **`diff --strip-trailing-cr`** với thượng nguồn,
**không dùng `cmp`** — repo này có `core.autocrlf=true` nên `cmp` báo khác trên mọi file dù nội dung
giống hệt.

---

## 6. Lưu trữ (D4)

Hai thứ khác nhau về bản chất, nên chia đôi thay vì gộp:

| Dữ liệu | Ở đâu | Hình dạng |
|---|---|---|
| Danh sách bảng: tên, màu, chuyên khoa, xoá mềm. Bài viết, thư viện, ECG | `src/lib/idb.ts` (143 dòng, `DB_VERSION` → 5) | Bản ghi JSON, `keyPath: "id"` |
| **Nội dung bảng** | y-indexeddb của AFFiNE (`sync/doc/impl/indexeddb.ts`) | Bản cập nhật CRDT nhị phân + blob ảnh |

Hai điều kiện chủ dự án đặt ra, đã kiểm bằng bằng chứng:

**Miễn phí** — quét toàn bộ `sync/doc/impl/` tìm `http`, `fetch(`, `wss`, `affine.pro`: không có
dòng nào. Chỉ `indexeddb` (cục bộ), `broadcast` (giữa các tab), `noop`. Không tài khoản, không
server, không đám mây.

**Đồng bộ được** — `DocSyncEngine` nhận `main: DocSource` và `shadows: DocSource[]`; `DocSource` là
giao diện ba hàm `pull` / `push` / `subscribe`. Cài ba hàm đó trỏ về backend của dự án là xong.
`shadows` cho phép chạy song song IndexedDB cục bộ và server — offline-first, đồng bộ ngầm.

Hệ quả cho backend về sau: **hai mối nối rõ ràng** — dữ liệu app qua API của dự án, nội dung bảng
qua `DocSource` của AFFiNE.

---

## 7. Trạng thái đã kiểm chứng, và việc chưa xong

Đã dựng bản thử thật trên nhánh `probe-nhung-lit`:

**Chạy được:** phân giải 70 gói `@blocksuite/*` từ mã nguồn qua một plugin Vite đọc bản đồ `exports`
của từng gói · cài 271 dependency npm · `vite build` **thành công** · đo được các con số ở §4.

**Chưa xong — phải gỡ trong chặng đầu:** mở lên thì lỗi
`ReferenceError: Must call super constructor in derived class`, phát từ
`std/src/view/element/lit-host.ts:198` (`@provide` của `@lit/context`). Nguyên nhân: AFFiNE biên
dịch bằng `tsc`, dự án dùng Vite 8 (rolldown + oxc, không có Babel), nên phải hạ cấp decorator bằng
Babel — và Babel sinh mã khác `tsc` ở chỗ này.

Đây **cùng họ** với vật cản `accessor` mà P0-A đã trả giá một lần (xem ghi chú dài trong
`vite.config.ts`). Không phải chặn cứng, nhưng cũng không phải việc nhỏ. **Là hạng mục đầu tiên
của kế hoạch thi hành.**

---

## 8. Cái phải bỏ

**`src/core/gfx` — 4.800 dòng của P0-B + P0-C — xoá.**

`@blocksuite/affine/std` đã chứa sẵn `std/gfx`. Giữ cả hai là có hai bản sao của cùng một lớp trong
một bundle, và mọi phép `instanceof` giữa chúng sẽ sai — lỗi ở tầng chạy, `tsc` không bắt được.

Kèm theo: `src/core/utils/layer.ts`, `src/core/selection/`, `src/core/gfx/host.ts`,
`src/core/gfx/std-identifier.ts`, và các file test tương ứng trong `src/core/__tests__/`.

**P0-A không mất.** Chiến lược vendor vẫn đúng; nó chỉ mở rộng từ 3 gói (15.127 dòng) thành cả cây
(~256.000 dòng). Quyết định chọn 0.27.0 thay vì npm 0.22.4 cũng vẫn đúng, và còn tốt hơn: giờ dùng
`viewportRuntimeConfig` nguyên bản thay vì bản port.

Một phát hiện của P0-C đáng mang sang: `viewportRuntimeConfig` có **hai nửa vòng đời khác nhau** —
`ZOOM_MIN`/`ZOOM_MAX` đọc qua getter động, còn `SKIP_REFRESH_DURING_GESTURE` và bốn hằng số anh em
là field initializer, **chốt cứng lúc dựng Viewport**. Nghĩa là thứ tự khởi động quyết định cấu hình
nào ăn. Bộ 5 ca ở `src/core/__tests__/viewport-runtime-config.spec.ts` cưỡng chế điều này —
**giữ lại**, sửa import để trỏ vào `@blocksuite/affine/std` thay vì `src/core/gfx`.

---

## 9. Phạm vi chặng kế tiếp

Ngoài phạm vi tài liệu này (giữ nguyên từ spec cũ §8): danh sách tính năng P1.0–P1.5, mô hình dữ
liệu §5, xử lý lỗi §9.

Chặng đầu theo hướng mới nên đóng đúng ba việc, theo thứ tự:

1. **Gỡ vật cản decorator** (§7) — không có nó thì không có gì chạy.
2. **Vendor cây blocksuite vào repo** (D15) + plugin phân giải + cổng `diff` với thượng nguồn.
3. **Cầu nối React↔Lit** với danh sách extension cắt gọn (D13), nạp chậm, mở được một bảng trống
   pan/zoom được trên iPad và PC.

Xoá `src/core/gfx` (§8) đi kèm việc 3, không tách rời — xoá trước thì mất mã tham chiếu, xoá sau
thì có hai bản sao cùng lúc.

Kiểm tay cuối chặng: mở một bảng trên **iPad** và **PC Windows**, kéo/zoom, vẽ một hình. iPhone chỉ
kiểm mở lên xem được, không kiểm nhập liệu.
