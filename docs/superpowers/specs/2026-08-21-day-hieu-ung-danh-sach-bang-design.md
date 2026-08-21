# Thiết kế: Đẩy hiệu ứng cho DanhSachBang — vật liệu ảnh/giấy thật

Ngày: **2026-08-21**. Trạng thái: đã chốt thiết kế qua brainstorm (4 phần, hỏi-đáp trong chat),
chưa lập kế hoạch. Track: **MindmapScreen**, phần "danh sách" — theo [[project_mindmap-charter]]
đây là "app của chủ dự án" (React, tiếng Việt), đáng ~70% trọng số công sức thiết kế của cả app.
**Ruột từng bảng** (EdgelessBoard, nhúng AFFiNE) KHÔNG đổi bởi chặng này — chuẩn mực ở đó vẫn là
bám sát thượng nguồn, không phải sáng tạo thêm.

Tiền đề đã xong: BoardGallery (`fe1dbf2`, xem
`docs/superpowers/specs/2026-08-19-board-gallery-design.md`) đã gộp vào `main` — màn danh sách
hoạt động đúng chức năng (tạo/đổi tên/xoá/mở), đã kiểm tay trên trình duyệt thật (2026-08-21,
không lỗi). Chặng này **không đổi hành vi dữ liệu nào**, chỉ thêm lớp phản hồi vật lý.

## 1. Vấn đề

`src/board/DanhSachBang.tsx` hiện là lưới thẻ hoàn toàn trần: không animation vào màn, không phản
hồi hover/press ngoài mặc định trình duyệt, thẻ trống chỉ là icon SVG mờ, tạo/xoá đổi state tức
thì không có gì cho mắt thấy. Đây là bề mặt duy nhất trong app **chưa qua lượt "đẩy hết hiệu ứng
rồi để chủ dự án cắt"** mà charter yêu cầu cho track MindmapScreen — trong khi phần còn lại của
app (trang chủ, toast, sheet, picker) đã có một ngôn ngữ chuyển động nhất quán từ lâu
(`.rise-in`, `.card-press`, `.toast-in`, họ easing `cubic-bezier(0.34,1.4,0.64,1)`).

Phát hiện phụ lúc khám phá: `.board-in`/`.board-out` (crossfade + phóng nhẹ 0,98/1,02,
`src/index.css:494-507`) đã được thiết kế và merge từ trước cho đúng chuyển cảnh danh sách↔bảng,
nhưng **không còn được gọi ở đâu trong `src/board/` hay `App.tsx`** — rơi rụng lúc tái cấu trúc
sang kiến trúc BoardGallery (D4/BoardGallery). Chặng này vá lại đúng ý định gốc của hai class đó,
không phát minh cơ chế mới.

## 2. Ràng buộc từ hệ thống thiết kế hiện có

Đọc từ `DESIGN.md` (áp cho toàn app) và `.impeccable/surfaces/src-components-mindmapboard-tsx.md`
(brief cũ, nhắm sai file từ trước khi quyết định nhúng AFFiNE 2026-08-12 — chỉ phần "Motion and
effect policy" còn giá trị, phần "tính liên tục hình ảnh thẻ↔bảng bắt buộc" của nó **mâu thuẫn**
với quyết định 2026-08-10 đã ghi trong charter là bỏ hẳn ý tưởng zoom-từ-thẻ; KHÔNG theo phần đó):

- **Decoration/Diagnosis Split Rule** — card/nav/screen-transition là đúng vùng được phép "chơi".
  Toàn bộ chặng này nằm gọn trong vùng đó.
- **Floating-Layer-Only Rule** — thẻ đứng yên không được có `box-shadow`; chỉ lớp *đang nổi thật*
  (toast/sheet/dropdown) mới có. **Quyết định đã chốt với chủ dự án:** không mở ngoại lệ — cảm
  giác "nhấc thẻ lên" khi hover/press chỉ đến từ `transform`, không thêm bóng đổ mới.
  ([[feedback_verify-critique-findings-before-fixing]] — luôn kiểm luật hiện có trước khi phá nó.)
- **Mọi màu qua token `--c-*`** — không hex mới. Token dùng: `--c-surface`, `--c-surface-soft`,
  `--c-line`, `--c-text-muted`, `--c-page`.
- **`prefers-reduced-motion`** tắt phần trang trí, giữ nguyên phản hồi chạm (`:active`) — đúng
  "Do" của `DESIGN.md`.
- Vốn từ chuyển động sẵn có phải được **tái dùng**, không bịa mới: cơ chế stagger `--i`/28ms/cap-8
  của `.rise-in`, họ easing lò xo `cubic-bezier(0.34,1.4,0.64,1)` của `.card-press`/`.dose-press`/
  `.nav-press`.

## 3. Kiến trúc

### 3.1 Nghiêng ổn định theo id — `src/board/DanhSachBang.tsx`

Hàm thuần, xuất riêng để kiểm được độc lập (không phụ thuộc DOM/React):

```ts
// Băm chuỗi id thành một góc nghiêng ỔN ĐỊNH trong khoảng [-3.0, 3.0] độ, bước 0.1 — KHÔNG dùng
// Math.random() vì góc phải giữ nguyên qua mọi lần re-render (đúng thẻ ảnh thật nằm yên trên bàn,
// không tự xoay mỗi khi có gì đó khiến component render lại).
export function nghiengOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 61) - 30) / 10
}
```

Áp dụng: đặt `style={{ '--tilt': `${nghiengOnDinh(bang.id)}deg` } as React.CSSProperties}` trên
phần tử mặt thẻ (`<button onClick={onMo}>`, đã có sẵn), thêm class `the-bang-vat` (mới, §3.4).

### 3.2 Vào màn / tạo mới / xoá — ba biến thể animation mới trong `src/index.css`

Thêm vào đúng khối "─── Chuyển cảnh danh sách bảng ↔ mặt bảng ───" đã có (dòng ~482 trở đi), cạnh
`boardIn`/`boardOut` hiện tại — không tạo khối CSS mới rời rạc.

```css
/* Thẻ "rơi vào chỗ" lúc lưới vào màn — biến thể của .rise-in nhưng dừng ở góc nghiêng NGHỈ của
   từng thẻ (--tilt, xem nghiengOnDinh) thay vì luôn thẳng đứng. Dùng lại NGUYÊN VẸN cơ chế
   --i/28ms/cap-8 mà .rise-in đã có — không phát minh cách stagger khác. */
@keyframes cardSettle {
  from { opacity: 0; transform: translateY(10px) rotate(0deg) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) rotate(var(--tilt, 0deg)) scale(1); }
}
.card-settle {
  animation: cardSettle 0.26s cubic-bezier(0.25, 0.9, 0.35, 1) backwards;
  animation-delay: calc(min(var(--i, 0), 8) * 28ms);
}

/* Thẻ VỪA TẠO (xem §3.3 — phân biệt bằng taoLuc, không phải state riêng) nảy quá đà nhẹ rồi
   settle, khác hẳn cảm giác êm của .card-settle — "vừa đặt thêm một tấm ảnh mới vào chồng". */
@keyframes cardPlop {
  0%   { opacity: 0; transform: translateY(14px) rotate(0deg) scale(0.85); }
  55%  { opacity: 1; transform: translateY(-3px) rotate(var(--tilt, 0deg)) scale(1.06); }
  100% { opacity: 1; transform: translateY(0) rotate(var(--tilt, 0deg)) scale(1); }
}
.card-plop {
  animation: cardPlop 0.34s cubic-bezier(0.34, 1.4, 0.64, 1);
}

/* Thẻ bị xoá trượt/rút khỏi chồng thay vì biến mất tức thì. forwards giữ trạng thái cuối (opacity
   0) trong khoảng chờ ngắn trước khi component thật sự gỡ nó khỏi DOM — xem §3.3. */
@keyframes cardSlideOut {
  from { opacity: 1; transform: translateX(0) rotate(var(--tilt, 0deg)) scale(1); }
  to   { opacity: 0; transform: translateX(-24px) rotate(calc(var(--tilt, 0deg) - 8deg)) scale(0.92); }
}
.card-slide-out {
  animation: cardSlideOut 0.2s cubic-bezier(0.4, 0, 1, 1) forwards;
}

/* Danh tính vật lý đứng yên của mặt thẻ + phản hồi hover/press. KHÔNG nằm trong khối
   prefers-reduced-motion bên dưới — góc nghiêng nghỉ là một TƯ THẾ TĨNH (lựa chọn hình ảnh), không
   phải chuyển động; :active phải sống sót qua reduced-motion theo đúng "Do" của DESIGN.md. */
.the-bang-vat {
  transform: rotate(var(--tilt, 0deg));
  transition: transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
}
@media (hover: hover) and (pointer: fine) {
  .the-bang-vat:hover {
    transform: rotate(0deg) scale(1.02);
  }
}
.the-bang-vat:active {
  transform: rotate(0deg) scale(0.97);
}
```

Cập nhật khối `@media (prefers-reduced-motion: reduce)` hiện có (dòng ~592) — thêm ba class mới
**trừ `.the-bang-vat`** (lý do: xem comment trong khối CSS trên):

```css
@media (prefers-reduced-motion: reduce) {
  .mind-sheet, .board-in, .board-out, .fade-in, .toast-in, .toast-in-full,
  .pulse-glow, .pulse-scale,
  .card-settle, .card-plop, .card-slide-out {   /* BA class mới thêm vào danh sách có sẵn */
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transform: none !important;
  }
}
```

### 3.3 `TheBang`/`DanhSachBang` — nối animation vào component (`src/board/DanhSachBang.tsx`)

**Phân biệt "vừa tạo" bằng `taoLuc`, không thêm state:** chụp mốc thời gian lúc `DanhSachBang`
mount (`useRef(Date.now())`, cố định suốt vòng đời mount — không đọc `Date.now()` lại mỗi render,
tránh một thẻ đang ở giữa animation "nảy" bất ngờ đổi sang "settle" nếu component re-render đúng
lúc mốc 3 giây vừa trôi qua):

```tsx
const luoBoMount = useRef(Date.now())
// ... trong map:
const vuaTao = bayGio - bang.taoLuc < 3000   // bayGio = luoBoMount.current, đặt tên rõ nghĩa lúc viết
```

Class animation vào-màn của mỗi thẻ: `vuaTao ? 'card-plop' : 'card-settle'`, kèm
`style={{ '--i': index } as React.CSSProperties}` (đã đúng quy ước `--i` của `.rise-in`).

**Xoá trễ để chạy animation** — thêm state cục bộ `dangXoaId: string | null` trong
`DanhSachBang`. Đây là **thay đổi kỹ thuật thật duy nhất** của cả chặng (mọi thứ khác chỉ là
CSS/class):

```tsx
const [dangXoaId, setDangXoaId] = useState<string | null>(null)

// Trong onXoa của TheBang, khi đã ở lần chạm thứ hai (dangXacNhanXoaId === bang.id):
setDangXacNhanXoaId(null)
setDangMoMenuId(null)
setDangXoaId(bang.id)   // KHÔNG gọi remove() ngay — giữ thẻ mount thêm cho animation.

// useEffect riêng, chạy đúng MỘT LẦN khi dangXoaId đổi sang một id thật:
useEffect(() => {
  if (!dangXoaId) return
  const idBiXoa = dangXoaId
  const id = setTimeout(() => {
    remove(idBiXoa)     // remove() thật của useIdbCollection — xoá state + IndexedDB, xem §7.
    setDangXoaId(null)
  }, 200)                // khớp thời lượng cardSlideOut (0.2s)
  return () => clearTimeout(id)
}, [dangXoaId, remove])
```

`TheBang` của thẻ đang `dangXoaId === bang.id` nhận thêm class `card-slide-out` (thay vì class
vào-màn bình thường) và **không nhận sự kiện chạm nữa** (`pointer-events: none` qua style inline —
thẻ đang biến mất không nên còn bấm được).

### 3.4 Trạng thái rỗng — đầu tư riêng thay vì "+" đơn độc

Khi `danhSach.length === 0`, thay khối `<button data-testid="tao-bang">` đơn độc trong lưới 2 cột
bằng một khối trung tâm, **giữ nguyên `data-testid="tao-bang"` và `aria-label="Tạo bảng mới"`**
trên chính nút bấm (không phá ca kiểm hiện có, xem §5):

```tsx
{danhSachSapXep.length === 0 ? (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '70%', gap: 12, textAlign: 'center' }}>
    <div className="empty-breathe" style={{ width: 96, height: 72, color: 'var(--c-text-muted, #b5aa8f)' }}>
      <TheTrong />
    </div>
    <p style={{ fontSize: 14, color: 'var(--c-text-muted, #8a8378)', margin: 0 }}>
      Bắt đầu một sơ đồ tư duy mới
    </p>
    <button type="button" data-testid="tao-bang" aria-label="Tạo bảng mới" onClick={onTaoBang}
      style={{ /* giữ style nút "+" hiện có nhưng cỡ lớn hơn — chi tiết ở plan */ }}>
      +
    </button>
  </div>
) : (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 16 }}>
    {/* lưới thẻ như hiện tại + nút "+" nhỏ cuối lưới khi ĐÃ có ít nhất một thẻ */}
  </div>
)}
```

`onTaoBang` là phần thân hàm tạo bảng hiện có (`taoIdBang()` + `add()` + `onMoBang()`), tách ra
khỏi `onClick` inline để dùng chung cho cả hai vị trí nút "+" (rỗng và không rỗng) — tránh lặp mã.

**Nhịp thở** (`.empty-breathe`, mới trong `index.css`, cùng khối trang trí, GATE theo
reduced-motion):

```css
@keyframes emptyBreathe {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50%      { opacity: 0.65; transform: scale(1.04); }
}
.empty-breathe {
  animation: emptyBreathe 2.4s ease-in-out infinite;
}
```

Thêm `.empty-breathe` vào khối `prefers-reduced-motion` (tắt hẳn nhịp thở, không phải làm chậm —
đây là chuyển động LẶP VÔ HẠN, đúng loại DESIGN.md muốn tránh cho người nhạy cảm tiền đình; nút
bấm dưới nó không bị ảnh hưởng, vẫn bấm được bình thường).

### 3.5 Chuyển cảnh danh sách ↔ bảng — vá lại `.board-in`/`.board-out` mồ côi

**Đọc lại đúng ý nghĩa hai class:** cả `boardIn` và `boardOut` đều đi từ `opacity:0` TỚI
`opacity:1` — nghĩa là **cả hai đều là hoạt ảnh VÀO MÀN cho nội dung MỚI xuất hiện**, chỉ khác
hướng phóng để gợi ý "đang tiến sâu hơn" (0,98→1) hay "đang lùi ra" (1,02→1). **Không phải** một
cặp vào/ra cho cùng một phần tử đang biến mất — đây là điểm tôi hiểu sai lúc trình bày ở Phần 3
brainstorm (nói sẽ "giữ bảng mount thêm với `.board-out`"); sửa lại đúng ở đây sau khi đọc lại kỹ
comment gốc trong CSS và đối chiếu ý định kiến trúc cũ (App.tsx thời hack mount-vĩnh-viễn, nơi cả
gallery lẫn board cùng tồn tại và chỉ đổi `visibility`).

**Mở bảng** (`src/board/BoardGallery.tsx`) — áp `.board-in` trực tiếp lên `boc-bang`, đã có sẵn
`key` ngầm định qua điều kiện render (`{openBoardId && (...)}`), thêm `key={openBoardId}` tường
minh để chắc chắn animation chạy lại nếu người dùng mở bảng khác trong khi một bảng khác đang mở
(hiện không xảy ra vì phải quay lại danh sách trước, nhưng tường minh vẫn rẻ và an toàn hơn):

```tsx
{openBoardId && (
  <div key={openBoardId} data-testid="boc-bang"
    className={`absolute inset-0 board-in${dangHienTab ? '' : ' invisible pointer-events-none'}`}
    inert={!dangHienTab}>
    <EdgelessBoard boardId={openBoardId} />
    {/* nút quay lại giữ nguyên */}
  </div>
)}
```

**Đóng bảng (quay lại danh sách)** — **không đụng gì vào thời điểm unmount `EdgelessBoard`** (đúng
cửa sổ `dangDong` đã qua hai vòng review ở chặng BoardGallery, mục 18 HANDOFF — không tái tạo lớp
race đã tốn công vá). Thay vào đó, áp `.board-out` cho **`DanhSachBang` khi nó mount LẠI sau khi
đóng một bảng** — đây chính là "nội dung mới xuất hiện, đang lùi ra" đúng nghĩa gốc của class:

```tsx
// BoardGallery.tsx — thêm MỘT state mới, không đụng dangDong hiện có
const [vuaDongBang, setVuaDongBang] = useState(false)

// Trong onClick nút "quay lại", ngay sau setOpenBoardId(null) hiện có:
setVuaDongBang(true)

// DanhSachBang nhận thêm hai prop mới, optional (không phá chữ ký cũ ở nơi khác nếu có):
{!openBoardId && !dangDong && dangHienTab && (
  <DanhSachBang onMoBang={setOpenBoardId} dungTuBang={vuaDongBang}
    onHieuUngXong={() => setVuaDongBang(false)} />
)}
```

`DanhSachBang.tsx` — bọc ngoài (`<div className="scroll-ios h-full">` hiện có) nhận thêm class
`board-out` khi `dungTuBang` true, và gọi `onHieuUngXong?.()` một lần qua `useEffect` sau 220ms
(khớp thời lượng `.board-out`, 0,2s + biên an toàn nhỏ) để `vuaDongBang` tự tắt — tránh phát lại
animation nếu người dùng chuyển tab đi/về sau đó mà không đóng bảng nào. Khi `dungTuBang` không
truyền (ví dụ lượt mount đầu tiên khi vào tab Mindmap lần đầu — không phải "đóng bảng"), không có
class `.board-out` nào được thêm — đúng, vì đó không phải tình huống "đang lùi ra khỏi một bảng".

### 3.6 Lớp C tuỳ chọn — cắt tự do, không đụng lõi B nếu bỏ

Hai mục dưới đây đánh dấu rõ trong code bằng comment `// LỚP C — có thể gỡ độc lập` để chủ dự án
cắt mà không phải đọc lại toàn bộ diff.

**Hoạ tiết nền mờ sau lưới** — một lớp `background` trên `<div className="scroll-ios h-full">`,
CSS thuần (không ảnh, giữ offline/bundle gọn), độ mờ rất thấp (`opacity: 0.04` qua lớp giả
`::before` hoặc `background-blend-mode`), token riêng cho sáng/tối (không đảo ngược một bên ra bên
kia — đúng luật "không invert theme" của `DESIGN.md`):

```css
.danh-sach-bang-nen::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.04;
  background-image: repeating-linear-gradient(45deg, var(--c-text) 0, var(--c-text) 1px, transparent 1px, transparent 12px);
}
```

**Nghiêng theo con trỏ khi hover** — chỉ bật với `@media (hover: hover) and (pointer: fine)`
(cùng điều kiện đã dùng ở `.the-bang-vat:hover`), cập nhật hai CSS custom property
(`--con-tro-x`, `--con-tro-y`, tính từ vị trí con trỏ tương đối trong thẻ qua `pointermove`) rồi
dùng chúng trong một biến thể `transform: perspective(400px) rotateX(...) rotateY(...)` nhỏ. Đây
là JS duy nhất của cả chặng ngoài phần B (một listener `pointermove`/`pointerleave` mỗi thẻ, chỉ
đổi CSS custom property — không có công việc mỗi khung hình).

## 4. Vòng đời thao tác — không đổi hành vi, chỉ đổi cách hiển thị

Mở/đổi tên/xoá vẫn đúng luồng dữ liệu hiện có (`useIdbCollection`, `idbPut`/`idbDelete` qua
`add`/`update`/`remove`) — chặng này **không thêm tương tác mới** (không kéo-thả sắp xếp, đã chốt
ở brainstorm). Điểm khác duy nhất về hành vi quan sát được: **xoá không còn tức thì** — thẻ ở lại
DOM thêm ~200ms để chạy `.card-slide-out` trước khi thật sự gỡ khỏi state (xem §3.3, §5, §6).

## 5. Vì sao không chọn phương án khác

| | Phương án | Vì sao loại |
|---|---|---|
| A | Chỉ bám `.rise-in`/`.card-press` có sẵn, không thêm gì riêng cho vật liệu | Đây là "bắt kịp chuẩn tối thiểu" của cả app, không phải "đẩy hết" cho surface đáng ~70% trọng số thiết kế — charter yêu cầu rõ ràng vượt qua mức này |
| — | Thêm `box-shadow` khi hover/press (cảm giác "nhấc ảnh lên" rõ hơn) | Phá thẳng "Floating-Layer-Only Rule" của `DESIGN.md`; chủ dự án đã chọn giữ nguyên luật, dùng `transform` thay thế (xem §2) |
| — | Kéo-thả sắp xếp lại thứ tự thẻ (thay vì chỉ giàu phản hồi) | Chạm dữ liệu (thêm trường thứ tự vào `BangMeta`), việc lớn hơn hẳn — đã loại ở brainstorm, giữ nguyên sắp theo `capNhatLuc` |
| — | Áp `.board-out` lên chính bảng đang đóng (ý ban đầu lúc trình bày Phần 3) | Đọc lại kỹ CSS thì cả hai class đều là hoạt ảnh VÀO MÀN cho nội dung MỚI — áp `.board-out` lên bảng đang biến mất đòi giữ nó mount thêm, tức phải trì hoãn unmount thật của `EdgelessBoard` → trì hoãn đúng lượt ghi ảnh xem trước đã qua hai vòng review (mục 18 HANDOFF) mới ổn định. Sửa: áp `.board-out` cho `DanhSachBang` khi nó TÁI xuất hiện — đúng nghĩa gốc, không đụng timing đã được kiểm chứng |
| — | Dùng `vi.useFakeTimers()` cho ca kiểm xoá trễ | File test hiện có của `DanhSachBang`/`BoardGallery` đã tự ghi lý do tránh trộn `act()` với timer giả (kẹt vô thời hạn, xem comment `choDenKhi` trong cả hai file) — dùng lại đúng mẫu `choDenKhi`/`vi.waitFor` với timer THẬT thay vì lệch quy ước đã có |

## 6. Kiểm thử

**Bắt buộc phải SỬA** (không chỉ thêm mới) — `src/board/__tests__/DanhSachBang.spec.ts`, ca
`'bấm "⋯" rồi "Xoá" HAI lần liên tiếp → bảng biến mất khỏi lưới NGAY, rồi khỏi metadata'` (dòng
241-273 ở bản hiện tại): khẳng định `toHaveLength(0)` **NGAY sau** chạm lần 2 sẽ SAI với thiết kế
mới (thẻ còn ở DOM ~200ms nữa, mang class `card-slide-out`, trước khi thật sự gỡ). Đổi thành: sau
chạm lần 2, thẻ **vẫn còn 1** nhưng có class `card-slide-out` và `pointer-events: none`; sau đó
`choDenKhi`/`vi.waitFor` (timer thật, đúng mẫu file đã dùng — KHÔNG `vi.useFakeTimers()`, xem §5)
mới xuống `toHaveLength(0)`. Đổi luôn tên `it()` để không còn nói "NGAY".

**Thêm mới:**
- `nghiengOnDinh()` — ca kiểm thuần: cùng id → cùng góc (gọi 2 lần, so bằng nhau); nằm trong
  khoảng `[-3, 3]`; hai id khác nhau (vd `'bang-1'`/`'bang-2'`) cho góc khác nhau (không bắt buộc
  KHÁC NHAU tuyệt đối vì có thể trùng ngẫu nhiên, chỉ cần ca kiểm không giả định sai điều đó — viết
  bằng cách khẳng định khoảng giá trị + tính lặp lại, không khẳng định "luôn khác nhau").
- Thẻ vừa tạo (mô phỏng `taoLuc` gần `Date.now()`) nhận class `card-plop`; thẻ có sẵn từ trước
  (`taoLuc` cũ, ghi thẳng qua `idbPut` trong test như các ca hiện có) nhận `card-settle`.
- `BoardGallery`: mở bảng → `boc-bang` có class `board-in`. Đóng bảng → sau khi lưới hiện lại
  (`tao-bang` xuất hiện, dùng lại `choDenKhi` có sẵn), phần tử bọc ngoài của `DanhSachBang` có
  class `board-out`; đợi thêm (`vi.waitFor`) → class đó tự mất, không cần hành động gì thêm.
- Trạng thái rỗng: `data-testid="tao-bang"` và `aria-label="Tạo bảng mới"` vẫn có mặt khi
  `danhSach.length === 0` — đúng hai ca hiện có (`'rỗng lúc đầu...'`) vẫn phải xanh KHÔNG SỬA (chỉ
  đổi cách render bên trong, không đổi `data-testid`/`aria-label`).

**Không cố unit-test:** animation CSS tự nó (keyframe/timing thị giác), hoạ tiết nền và
nghiêng-theo-con-trỏ ở §3.6 (lớp C, kiểm tay trình duyệt thật khi cần). Kiểm tay trình duyệt thật
là bước xác nhận cuối cùng cho toàn chặng — cùng cách tôi vừa làm cho BoardGallery (2026-08-21,
xem hội thoại) — không dừng ở "cổng xanh" như bài học #2 của `HANDOFF.md`.

## 7. Rủi ro đã biết

- **API xoá thật của `useIdbCollection.remove()`** không đổi (chặng này chỉ trì hoãn LÚC gọi nó,
  không đổi bản thân hàm) — không rủi ro dữ liệu mới nào ngoài việc đã nêu ở §6 (test cần sửa).
- **`.card-slide-out` + đóng menu đồng thời:** thẻ đang trượt ra vẫn có menu "⋯"/`dangMoMenuId` có
  thể đang mở của MỘT thẻ KHÁC trong lưới — hai state (`dangXoaId`, `dangMoMenuId`) độc lập theo
  id nên không có va chạm, nhưng plan nên có một ca kiểm xác nhận rõ (xoá thẻ A không ảnh hưởng
  menu đang mở của thẻ B).
- **`vuaDongBang` không tự tắt nếu `onHieuUngXong` không được gọi** (ví dụ nếu `DanhSachBang`
  unmount lại rất nhanh trước khi `useEffect` kịp chạy hết 220ms, do người dùng bấm mở bảng khác
  gần như ngay lập tức) — hậu quả nếu xảy ra: `vuaDongBang` ở `BoardGallery` vẫn `true`, animation
  `.board-out` không được đóng flag nhưng KHÔNG hại gì (chỉ ảnh hưởng lần mount kế tiếp của
  `DanhSachBang` có class `board-out` không cần thiết một lần) — chấp nhận được, ghi vào tiêu chí
  xong là "không chặn", không phải sửa bằng mọi giá.
- **Nghiêng-theo-con-trỏ (lớp C)** thêm một `pointermove` listener mỗi thẻ đang hiện — ở quy mô vài
  chục thẻ tối đa (PWA cá nhân) không đáng lo, nhưng nếu tương lai danh sách dài ra nhiều, đây là
  chỗ đầu tiên cần xem lại (throttle hoặc giới hạn theo thẻ đang trong viewport).

## 8. Ngoài phạm vi

- Kéo-thả sắp xếp lại thứ tự thẻ — đã chốt ở brainstorm, giữ `capNhatLuc` giảm dần.
- Bất kỳ thay đổi nào bên trong `EdgelessBoard`/ruột bảng — chuẩn mực ở đó là bám AFFiNE nguyên
  văn, không thuộc phạm vi "đẩy hiệu ứng" của charter.
- Âm thanh/haptic — charter cấm rõ ("không hiệu ứng âm thanh", "vẫn là sản phẩm y khoa").
- Đổi bố cục lưới (2 cột, tỉ lệ 4:3 của ảnh xem trước) — giữ nguyên từ thiết kế BoardGallery gốc.

## 9. Tiêu chí xong

1. Thẻ có góc nghiêng ổn định theo id (`nghiengOnDinh`, ca kiểm thuần xanh); hover (chuột thật)
   un-rotate + scale nhẹ, KHÔNG có `box-shadow` mới nào xuất hiện ở trạng thái đứng yên hay hover.
2. Vào màn: thẻ cũ dùng `.card-settle`, thẻ vừa tạo (taoLuc < 3s) dùng `.card-plop` — phân biệt
   được bằng mắt lẫn bằng class trong DOM.
3. Xoá: thẻ chạy `.card-slide-out` ~200ms rồi mới biến mất khỏi state/IndexedDB thật; ca kiểm cũ
   đã sửa đúng hành vi mới (§6), không còn khẳng định "biến mất NGAY".
4. Trạng thái rỗng có minh hoạ + lời mời + nút tạo lớn, nhịp thở nhẹ tắt được qua
   `prefers-reduced-motion`; `data-testid="tao-bang"`/`aria-label` không đổi.
5. Mở bảng → `boc-bang` có `.board-in`. Đóng bảng → `DanhSachBang` tái xuất hiện có `.board-out`,
   tự tắt sau đó, không lặp lại khi chỉ chuyển tab đi/về (không đóng bảng nào).
6. `prefers-reduced-motion` tắt đúng sáu animation trang trí (`card-settle`/`card-plop`/
   `card-slide-out`/`empty-breathe`/`board-in`/`board-out`), KHÔNG tắt phản hồi `:active` của
   `.the-bang-vat` — kiểm tay bằng DevTools emulate hoặc `matchMedia` giả trong test.
7. Bảy cổng hiện có (`tsc`, `npm test`, `kiem:vendor*`, `build`, `kiem:dist`) vẫn xanh — chặng này
   không đụng `src/vendor/` nên bốn cổng vendor/dist dự kiến không đổi số, đo lại để xác nhận thay
   vì giả định (bài học #2/#3 của `HANDOFF.md`).
8. Kiểm tay trên trình duyệt thật (Browser pane, như lượt kiểm BoardGallery 2026-08-21): tạo/xoá/
   mở/đóng một vòng đầy đủ, xác nhận animation chạy đúng hướng, không giật/nháy trắng mới nào phát
   sinh so với lượt kiểm BoardGallery trước đó.
