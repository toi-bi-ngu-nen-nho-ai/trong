# Thiết kế: Đại tu bảng màu app theo xanh AFFiNE + đổi icon

Ngày: **2026-09-09**. Trạng thái: đã chốt hướng trong chat (2 vòng hỏi), viết spec trước khi thi công.
Track: **Bảng màu toàn app** — đây là lần rebrand **thứ hai**. Lần đầu (2026-08) đổi từ teal sang
"Electric Indigo", ghi lại đầy đủ trong [DESIGN.md](../../../DESIGN.md) (mục "Creative North Star",
các luật đặt tên: Untouchable Signal Rule, One Other Place Rule, Floating-Layer-Only Rule). Lần này
đổi từ Electric Indigo sang **xanh thật của AFFiNE** (`#1E96EB`), với nền trung tính chuyển hẳn sang
xám thật (bỏ thiên hướng indigo).

**Vì sao xếp mức kiến trúc (architectural), không phải bounded:** `src/index.css` hiện có ~600 dòng
token màu, mỗi token đều có chú thích đo tỉ lệ tương phản WCAG thật (không phải suy đoán), và bốn
luật đặt tên đang ràng buộc toàn bộ hệ thống. Đổi cả primary lẫn nền trung tính cùng lúc chạm tới toàn
bộ ~600 dòng đó cộng theo là hàng trăm chỗ dùng `--c-*` rải khắp `src/App.tsx` và các thẻ
`.mind-*`/`.the-bang-vat`. Rủi ro hồi quy thị giác + hồi quy tương phản (an toàn đọc lúc trực đêm) là
có thật, nên đi qua spec đầy đủ thay vì sửa thẳng.

## 0. Quyết định của chủ dự án (chốt qua 2 vòng hỏi, 2026-09-09)

Mọi mục dưới đây suy ra từ bốn quyết định này — không tự ý đảo lại khi thi công:

1. **Lấy đúng mã màu AFFiNE cho primary, chỉnh tối thiểu.** Không dùng làm "hạt giống" để bịa một
   thang màu hoàn toàn khác — `--c-primary` phải LÀ `#1E96EB`/`#1C9EE4`, chỉ những cặp bị trượt AA
   mới được nắn (xem §2.2).
2. **Primary gần như CÙNG một xanh ở cả hai theme** — không lặp lại cách làm cũ (tối thì bơm sáng hẳn
   primary lên `#6ea8fe`). Bám sát đúng cách AFFiNE tự làm (`#1E96EB` sáng / `#1C9EE4` tối, gần như
   không đổi).
3. **Nền trung tính chuyển hẳn về xám thật của AFFiNE**, kể cả việc bản tối SÁNG HƠN hẳn bản OLED
   gần-đen hiện tại (`#141414` thay vì `#0b0c1c`) — chủ dự án đã được cảnh báo về việc này đi ngược
   quyết định "Night Glass" cũ (tối cho phù hợp buồng bệnh tắt đèn) và vẫn chọn bám sát AFFiNE.
4. **Không đụng `--c-accent-2` (magenta Mindmap)** — giữ nguyên "One Other Place Rule". Cũng áp dụng
   suy rộng: **không đụng** `--c-danger*`, `--c-warn*`, `--c-green*` (Untouchable Signal Rule) và
   `--c-note*`/`--c-fav*`/`--c-toast-*`/`--c-mark-*` (vật liệu/luật riêng, ngoài phạm vi rebrand màu
   thương hiệu).
5. **Chữ trên nền primary tô đặc ở BẢN SÁNG đổi sang mực đậm** (không giữ chữ trắng) — vì trắng trên
   `#1E96EB` chỉ đạt 3,18:1, trượt AA 4,5:1. Xem token mới `--c-on-primary` ở §2.3.

## 1. Hiện trạng (số đo thật, không suy đoán)

Toàn bộ số đo dưới đây chạy bằng script Node dùng đúng công thức luminance/contrast của WCAG 2.1
(`(L1+0.05)/(L2+0.05)`), không phải ước lượng mắt.

**Mã màu thật của AFFiNE** (đọc từ `.vendor-build/theme/style.css`, sinh ra từ chính
`@toeverything/theme` mà app đang vendor — không phải suy diễn từ tài liệu ngoài):

| Vai trò | Sáng | Tối |
|---|---|---|
| `--drt-brand-color` / `--drt-primary-color` | `#1E96EB` | `#1C9EE4` |
| `--drt-background-primary-color` (nền/mặt thẻ) | `#ffffff` | `#141414` |
| `--drt-background-secondary-color` | `#f4f4f5` | `#252525` |
| `--drt-background-tertiary-color` | `#eeeeee` | `#303030` |
| `--drt-border-color` | `#e3e2e4` | `#2e2e2e` |
| `--drt-divider-color` | `#e3e2e4` (= border) | `#727272` (khác hẳn border — xem §2.1) |
| `--drt-icon-color` | `#77757d` | `#a8a8a0` |
| `--drt-text-primary-color` | `#121212` | `#eaeaea` |
| `--drt-text-secondary-color` | `#8e8d91` | `#9c9ca0` |
| `--drt-placeholder-color` | `#c0bfc1` | `#3e3e3f` |

**Hai vấn đề tương phản đã đo được, phải xử lý (không phải tuỳ chọn):**

1. Chữ trắng trên `#1E96EB`: **3,18:1** — trượt AA chữ thường (4,5:1). Chữ **đen `#121212`** trên
   cùng nền: **5,90:1** — đạt. → §2.3.
2. `--drt-text-secondary-color` sáng (`#8e8d91`) dùng thẳng làm chữ mờ trên nền trắng: **3,30:1** —
   trượt AA. Cần nắn tối thêm một chút, không dùng nguyên xi. → §2.4.

**Một điều đã kiểm và AN TOÀN, không cần sửa:** toàn bộ token `--c-danger*/--c-warn*/--c-green*/
--c-text*` bản tối hiện tại (không đổi hex theo quyết định 4) vẫn đạt AA khi đo lại trên nền tối MỚI
sáng hơn (`#141414`/`#252525` thay vì `#0b0c1c`/`#14162c`) — chênh lệch tối đa đo được là
`--c-text-muted` (5,60:1 trên `#252525`, so với 6,10:1 trên nền cũ), vẫn cách xa sàn 4,5:1. Không có
gì phải sửa ở nhóm này ngoài việc **đổi nền xung quanh chúng**.

## 2. Giá trị token khoá cứng

### 2.1 Nền trung tính — thay HẲN, không còn thiên indigo

AFFiNE chỉ cho 3 bậc xám (primary/secondary/tertiary) + 1 border + 1 divider mỗi theme, trong khi hệ
token hiện tại cần ~6 bậc (surface/page/surface-alt/line-soft/line/line-strong). Ánh xạ:

| Token | Sáng (cũ → mới) | Tối (cũ → mới) |
|---|---|---|
| `--c-surface` (mặt thẻ) | `#ffffff` → `#ffffff` (không đổi) | `#14162c` → `#252525` |
| `--c-page` (nền trang) | `#f1f2fb` → `#f4f4f5` | `#0b0c1c` → `#141414` |
| `--c-surface-alt` (panel/hover phụ) | `#f6f7fd` → `#eeeeee` | `#1b1e3d` → `#303030` |
| `--c-line` (viền chuẩn) | `#d9ddf4` → `#e3e2e4` (đúng AFFiNE) | `#2e3260` → `#2e2e2e` (đúng AFFiNE) |
| `--c-line-strong` (viền đậm/chia mục rõ) | `#bfc5ea` → `#c9c8cb` | `#40447f` → `#727272` (đúng AFFiNE divider) |
| `--c-line-soft` (viền/nền mờ nhất) | `#e9ebf9` → `#ececee` | `#23264a` → `#202020` |

Ba dòng đánh dấu "đúng AFFiNE" lấy thẳng mã đã đo ở §1, không suy diễn. `line-strong`/`line-soft` là
phần NỘI SUY tối thiểu (không có sẵn trong AFFiNE) — cùng họ xám thật (hue=0, sat=0%), chỉ khác độ
sáng, giữ đúng thứ tự "soft < line < strong" như cấu trúc hiện có.

**Nhận xét quan trọng, không phải quyết định cần hỏi lại:** bản tối mới (`#141414`) SÁNG HƠN đáng kể
so với `#0b0c1c` hiện tại — đây chính là hệ quả đã được cảnh báo và chấp nhận ở quyết định 3.

### 2.2 Primary — đúng mã AFFiNE, thang phái sinh cùng họ hue (~205°)

| Token | Sáng | Tối | Ghi chú |
|---|---|---|---|
| `--c-primary` | `#1E96EB` | `#1C9EE4` | Đúng mã AFFiNE, không đổi |
| `--c-primary-rgb` | `30, 150, 235` | `28, 158, 228` | |
| `--c-primary-strong` | `#1979be` | `#36a9e7` | Sáng: tầng "an toàn làm CHỮ" — xem lý do dưới |
| `--c-primary-deep` | `#135c90` | `#76c5ef` | Tầng nhấn mạnh cao nhất |
| `--c-primary-soft` | `#edf3f7` | `#112d3b` | Nền phớt cho badge/icon |
| `--c-primary-line` | `#c2ddf0` | `#225977` | Viền/accent-line, một bậc dưới full-strength |

**Vì sao cần `--c-primary-strong` làm tầng riêng (không phải chỉ trang trí):** `--c-primary` nguyên
bản (`#1E96EB`) đo được **3,17:1** trên nền trắng/xám nhạt mới — dùng trực tiếp làm MÀU CHỮ/ICON kích
cỡ thường trên nền sáng (nhãn tab đang chọn, link, icon màu primary) là trượt AA. `--c-primary-strong`
(`#1979be`, cùng hue/sat, chỉ hạ độ sáng) đo được **4,65:1** trên trắng — đạt. **Mọi chỗ hiện đang dùng
`color: var(--c-primary)` làm chữ/icon kích cỡ thường trên nền sáng phải đổi sang
`var(--c-primary-strong)` ở bản sáng** — đây là việc bắt buộc phải rà (audit), không phải tự suy diễn,
xem giai đoạn 2 ở §4. Nền tô đặc (nút, chip đang chọn, viền, focus ring ≥3:1 non-text) vẫn dùng đúng
`--c-primary` nguyên bản.

Ở bản TỐI, `--c-primary` nguyên bản (`#1C9EE4`) đã đạt **6,19:1** trên nền `#141414` mới — **an toàn
để dùng trực tiếp làm chữ/icon ở bản tối**, không cần đổi sang `-strong`. Đây là lý do `-strong`/`-deep`
ở bản tối được định nghĩa SÁNG HƠN base (không phải để sửa lỗi AA, mà giữ đúng vai trò "cấp nhấn mạnh
cao hơn" như cấu trúc gốc).

### 2.3 Chữ trên nền primary tô đặc — token mới `--c-on-primary`

```
--c-on-primary: #121212;   /* CỐ ĐỊNH ở cả hai theme — không lặp theo :root/[data-theme] như --c-on-bright */
```

Lý do dùng **một** giá trị cố định thay vì lặp theo theme: vì primary giờ gần như cùng một xanh ở cả
hai theme (quyết định 2), chữ đen `#121212` đạt AA ở **cả hai** — 5,90:1 (sáng) và 6,30:1 (tối). Không
cần cơ chế lật trắng/đen theo theme như `--c-on-bright` (cơ chế đó tồn tại vì primary CŨ có độ sáng
lệch hẳn giữa hai theme).

**Phạm vi áp dụng — bắt buộc rà trước khi đổi:** `--c-on-bright` hiện dùng chung cho MỌI nền tô đặc
(primary, và có thể cả nền danger/green nếu có nút tô đặc dùng màu đó). Giai đoạn thi công phải
`grep` hết nơi dùng `--c-on-bright`, phân loại theo màu nền đi kèm:
- Nền là `--c-primary`/`--c-accent` (alias primary) → đổi sang `--c-on-primary`.
- Nền là danger/warn/green hoặc màu khác → **giữ nguyên** `--c-on-bright`, không đụng.
Nếu rà xong thấy `--c-on-bright` không còn nơi nào dùng ngoài primary, có thể xoá token đó — nhưng đây
là kết luận PHẢI CÓ SỐ LIỆU (đếm nơi dùng thật), không tự suy đoán trước.

### 2.4 Nhóm chữ trung tính (`--c-text*`, `--c-muted`, `--c-faint`) — xám thật, đã kiểm AA

| Token | Sáng | Tối | Nguồn |
|---|---|---|---|
| `--c-text` | `#121212` | `#eaeaea` | Đúng AFFiNE text-primary |
| `--c-text-2` | `#3a3a3d` | `#d4d4d4` | Nội suy, ≥11:1 trên nền tương ứng |
| `--c-text-soft` | `#5a5a5e` | `#b8b8b8` | Nội suy, ≥6,6:1 |
| `--c-text-muted` | `#757478` | `#9c9ca0` | Sáng: **nắn tối** từ AFFiNE text-secondary (`#8e8d91` chỉ 3,30:1, trượt) → 4,64:1. Tối: đúng AFFiNE, 5,60:1 trên `--c-surface` mới |
| `--c-text-placeholder` | `#66656a` | `#a0a0a0` | Đo trên nền pill xám nhạt/đậm tương ứng, ≥4,9:1 |
| `--c-muted` (icon/placeholder, được phép dưới AA theo quy ước cũ) | `#77757d` | `#a8a8a0` | Đúng AFFiNE icon-color, tình cờ đạt 4,54:1/7,70:1 — dư, không sao |
| `--c-faint` (mờ nhất, KHÔNG cần AA) | `#c0bfc1` | `#3e3e3f` | Đúng AFFiNE placeholder-color |

`--c-text-placeholder` phải đo lại trên nền pill THẬT của app (không phải nền giả định ở spec này) —
xem [[feedback_do-tuong-phan-phai-kem-nen]]. Nếu nền pill thật khác giả định, tính lại đúng công thức
ở §1, không copy số trong bảng.

### 2.5 Giữ nguyên tuyệt đối (không đổi hex, không đổi công thức)

`--c-danger*`, `--c-warn*`, `--c-green*`, `--c-accent-2*`, `--c-khoa-nang*`, `--c-note*`,
`--c-on-note*`, `--c-fav*`, `--c-toast-*`, `--c-mark-*`, `--c-disabled-*` (alias, tự cập nhật theo
`--c-line-soft`/`--c-muted` mới), `--c-accent*` (alias `var(--c-primary...)`, tự cập nhật), `--ring`
(alias `var(--c-primary)`, tự cập nhật), `--c-shadow-glow` bản tối (công thức
`rgba(var(--c-primary-rgb), 0.18)`, tự cập nhật theo `--c-primary-rgb` mới).

### 2.6 Không khoá cứng trong spec này — tính khi thi công, kiểm bằng trình duyệt thật

`--c-nav-bg`, `--c-nav-bg-solid`, `--c-nav-border`, `--c-nav-active-bg`, `--c-fog`, `--c-shadow`,
`--c-scrim`, `--c-pill-dark*`, `--c-float-bg`. Đây là các token phái sinh trực tiếp từ
surface/line/primary-soft mới ở trên (vai trò từng token đã có chú thích đầy đủ ngay trong
`index.css` hiện tại — đọc lại đúng vai trò đó, không đoán). Không tính tay trước vì các giá trị này
cần soi trên trình duyệt thật (độ mờ, backdrop-filter, chồng lớp) để chỉnh đúng cảm giác — tính trước
mà không nhìn thấy dễ sai như [[feedback_contrast-gradient-background-trap]] đã từng gặp.

## 3. Icon

Ảnh nguồn: `1.png` (Downloads), chữ "T" xanh trên nền xám rất nhạt, ~374×375px (gần vuông, không phải
kích cỡ đích nào cả). Icon hiện tại trong `public/` **đang lỗi**: `icon-192.png`/`icon-512.png`/
`apple-touch-icon.png` cả ba là **cùng một file** 663×636px (không vuông, không đúng kích cỡ tên file
khai — bug có sẵn từ trước, không phải do lượt này gây ra).

Việc cần làm (Sonnet làm trực tiếp, không cần agent — thao tác ảnh cơ học):
1. Đo bounding box thật của nét "T" trong `1.png` (không đoán bằng mắt) để xác nhận đủ vùng đệm an
   toàn cho maskable icon (nội dung phải nằm trong vòng tròn an toàn ~80% kích cỡ, theo khuyến nghị
   maskable icon của Android).
2. Dựng lại đúng 3 file vuông: `icon-192.png` (192×192), `icon-512.png` (512×512),
   `apple-touch-icon.png` (180×180, theo đúng khuyến nghị Apple đã ghi chú trong `index.html`).
3. Cập nhật `theme-color` trong `index.html` (hai thẻ media sáng/tối + thẻ mặc định) và
   `background_color`/`theme_color` trong `manifest.json` cho khớp bảng màu mới (`#1E96EB` mặc định,
   `#ffffff` sáng, `#141414` tối).
4. Không đổi nội dung/văn bản của `manifest.json` (tên app, shortcuts) — ngoài phạm vi.

## 4. Thứ tự thi công

| # | Việc | Ai làm | Cổng qua |
|---|---|---|---|
| 1 | Icon (§3) | Sonnet, trực tiếp | 3 file đúng kích cỡ vuông, xem trên trình duyệt (tab title + PWA install prompt) |
| 2 | Rà toàn bộ nơi dùng `--c-primary` làm màu CHỮ/icon (không phải nền tô đặc) trong `src/App.tsx` + `.mind-*`/`.the-bang-vat` — liệt kê danh sách trước khi sửa | Opus (việc khó, cần chính xác) | Danh sách nơi cần đổi sang `--c-primary-strong` (bản sáng) được liệt kê tường minh, chủ dự án/Opus tự đối chiếu trước khi sửa hàng loạt |
| 3 | Rà toàn bộ nơi dùng `--c-on-bright`, phân loại theo nền đi kèm (§2.3) | Opus | Danh sách "primary→c-on-primary" vs "giữ nguyên" |
| 4 | Đổi token trong `src/index.css`: nền trung tính (§2.1), primary (§2.2), `--c-on-primary` (§2.3), text family (§2.4) — CẢ BA khối (`:root`, `@media dark`, `[data-theme="dark"]`) phải đổi ĐỒNG BỘ, không lệch nhau như đã từng là nguồn lỗi trong lịch sử file này | Opus | `tsc` xanh; không còn mã hex indigo cũ (`#2d3a94`, `#6ea8fe`, v.v.) sót lại — grep xác nhận |
| 5 | Sửa các nơi đã liệt kê ở bước 2, 3 | Opus | Chạy trên trình duyệt thật CẢ HAI theme, chụp ảnh đối chiếu |
| 6 | Tính + áp token phái sinh ở §2.6 trên trình duyệt thật | Opus | Thanh nav, toast, popover không bị lộ nền sai màu ở cả hai theme |
| 7 | Đo lại contrast thật (không suy đoán) cho MỌI cặp chữ/nền vừa đổi, dùng đúng phương pháp §1 | Opus | Không cặp nào dưới sàn AA đã nêu ở §2 |
| 8 | Cập nhật `DESIGN.md`: đổi mục "Creative North Star", bảng mã màu, mọi chỗ nhắc "Electric Indigo"/"Ethereal Glass"/"Night Glass" cho khớp bảng màu mới | Opus | Đọc lại toàn `DESIGN.md`, không còn mô tả sai màu thật |
| 9 | `npm run build` + `npm run kiem:dist` (nếu cổng này có kiểm màu/chuỗi liên quan) | Opus | Xanh |

Mỗi giai đoạn 4-8 là một commit riêng, có thể `git revert` độc lập.

## 5. Rủi ro đã biết

**Ranh giới thị giác app-chrome ↔ canvas BlockSuite sẽ mờ đi.** Trước lượt này, app dùng indigo còn
canvas vendored dùng đúng xanh AFFiNE gốc — hai sắc khác nhau tạo ranh giới thị giác rõ giữa "khung
app" và "mặt bảng vẽ". Sau lượt này cả hai gần như cùng một xanh — đây là hệ quả **mong muốn** của
chính yêu cầu "lấy màu xanh từ AFFiNE" (thống nhất App + bảng vẽ), không phải tác dụng phụ cần sửa,
nhưng nên xem qua trên trình duyệt thật để chắc chắn không có chỗ nào giờ "biến mất" vì trùng màu với
nền cạnh nó.

**Ba khối token (`:root`, `@media (prefers-color-scheme: dark)`, `[data-theme="dark"]`) phải đổi cùng
lúc, đồng bộ tuyệt đối.** File hiện tại đã tồn tại đúng ba khối lặp giá trị dark giống hệt nhau (do
`@media` không lồng được với `[data-theme]`) — sót một khối là bug âm thầm (đổi theme bằng nút app thì
đúng, đổi theo hệ điều hành thì sai, hoặc ngược lại).

**`--c-text-placeholder`/nav tokens ở §2.6 đo trên nền GIẢ ĐỊNH trong spec này, không phải nền pill
thật.** Phải đo lại trên trình duyệt thật đúng vị trí sử dụng thật, không copy số trong bảng
([[feedback_do-tuong-phan-phai-kem-nen]]).

**Nhiều phiên cùng working tree.** Có một phiên song song khác đang sửa `src/components/IntroOverlay.tsx`
(theo git status lúc viết spec) — KHÔNG đụng file đó. `src/index.css`/`src/App.tsx`/`DESIGN.md`/
`public/manifest.json`/`index.html` không có dấu hiệu phiên kia đang sửa, nhưng vẫn phải `git status`
toàn bộ trước mỗi commit của chặng này ([[feedback_check-full-status-before-commit]]).

## 6. Ngoài phạm vi

- Đổi `--c-accent-2` (magenta Mindmap) — quyết định 4.
- Đổi bất kỳ giá trị nào thuộc `--c-danger*/--c-warn*/--c-green*/--c-note*/--c-fav*` — quyết định 4.
- Đổi cấu trúc/tên các màn hình, layout, animation — đây thuần là đổi *skin* màu, không đổi cấu trúc.
- Sửa nội dung/shortcuts trong `manifest.json` ngoài `theme_color`/`background_color`/icon.
- Bảng màu 11 chuyên khoa (`src/data/specialties.ts`) và `--c-khoa-nang*` — không liên quan tới primary.
- Vá lỗi alias `--drt-secondary`/`--drt-font-size-base`/`--drt-text-secondary` (dòng 129-156 file gốc)
  — đây là vá lỗi ĐẶT TÊN của chính BlockSuite, không phải giá trị màu, không liên quan rebrand này.

## 7. Tiêu chí xong

1. `--c-primary` đúng `#1E96EB`(sáng)/`#1C9EE4`(tối), không lệch ở bất kỳ khối nào trong 3 khối
   `:root`/`@media dark`/`[data-theme=dark]`.
2. Không còn mã hex nào của bảng indigo cũ (`#2d3a94`, `#212b70`, `#171e52`, `#eceefa`, `#c3caf0`,
   `#9aa6e6`, `#6ea8fe`, `#8fbeff`, `#b3d3ff`, `#182140`, `#33407a`, `#445397`) sót lại trong
   `src/index.css` — grep xác nhận bằng không.
3. Nền trung tính khớp đúng bảng ở §2.1, cả hai theme.
4. Mọi cặp chữ/nền đã đổi đo được ≥ ngưỡng AA nêu ở §2 (đo thật, không suy đoán) — đặc biệt: chữ trên
   nút/chip primary tô đặc ≥4,5:1 ở CẢ HAI theme.
5. `--c-on-bright` chỉ còn ở đúng những nơi KHÔNG phải nền primary (đã audit ở giai đoạn 3).
6. Ba file icon đúng kích cỡ vuông (192/512/180), nội dung nằm trong vùng an toàn maskable.
7. `theme-color` (`index.html`) và `theme_color`/`background_color` (`manifest.json`) khớp bảng màu
   mới.
8. `DESIGN.md` mô tả đúng bảng màu đang chạy thật (không còn nhắc "Electric Indigo"/mã hex cũ).
9. `tsc`, `npm test`, `npm run build` xanh.
10. Chụp ảnh trình duyệt thật cả hai theme (sáng/tối), gửi kèm khi báo hoàn thành — không kết luận
    "xong" chỉ từ đọc code.
