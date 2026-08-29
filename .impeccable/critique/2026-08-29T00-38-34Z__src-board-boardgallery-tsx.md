---
target: MindMap Board Gallery
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-29T00-38-34Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: design review, Sonnet 5 · B: detector + browser evidence, Sonnet 5), cách ly, song song.

Sai lệch trình tự cần nói rõ: Assessment B về **trước** A (11,6 phút so với 19,9 phút), nên bằng chứng detector vào context tổng hợp trước khi A xong — ngược với thứ tự skill yêu cầu. Để bù, agent cha đã tự đo độc lập trên trình duyệt thật (bản tối 375px + bản sáng ép `data-theme`) trước khi tin bất kỳ con số nào của hai assessment, và đã bác 1 phát hiện của A, 1 quy kết của B.

Hai assessment dùng chung một dev server / IndexedDB gốc `localhost:8443` nên dữ liệu test lẫn vào nhau. Đã tính đến khi đọc kết quả.

## Design Health Score

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Skeleton lưới, ba chấm "Đang tải", đếm ngược toast xoá, banner "N thay đổi chưa lưu" — đủ và cụ thể |
| 2 | Match System / Real World | 4 | Ẩn dụ giấy + icon chuyên khoa + tiếng Việt lâm sàng, nhất quán tới chi tiết vật liệu |
| 3 | User Control and Freedom | 3 | Escape/hoàn tác kép rất mạnh — nhưng luồng tạo bảng cướp quyền kiểm soát đúng lúc quan trọng nhất |
| 4 | Consistency and Standards | 3 | Ô "+" tạo bảng lạc ngôn ngữ thị giác (bo 8px, viền đứt magenta) — không khớp giấy (2px) lẫn hệ thống (14px); placeholder rơi về mặc định Tailwind thay vì token |
| 5 | Error Prevention | 2 | `autoFocus` không `select()` biến thao tác gõ-tên-ngay (luồng phổ biến NHẤT) thành bẫy nối chuỗi âm thầm |
| 6 | Recognition Rather Than Recall | 4 | Góc nghiêng + hue băm ổn định theo id, icon chuyên khoa, chip lọc — nhận diện tức thì |
| 7 | Flexibility and Efficiency | 3 | Tìm xuyên nội dung + nhấn-giữ + "⋯" (2 lối vào). Không có sắp xếp, không thao tác hàng loạt |
| 8 | Aesthetic and Minimalist Design | 4 | Detector sạch tuyệt đối, chip thu gọn "Thêm +9", tên clamp 2 dòng — mật độ cao mà không rối |
| 9 | Error Recovery | 4 | P1 lượt trước đã vá thật: banner `loiGhi` nêu SỐ thay đổi mất + đường thoát (xuất file) |
| 10 | Help and Documentation | 2 | Không gợi ý first-run cho nhấn-giữ; trạng thái "không tìm thấy" mời tạo bảng mới thay vì gỡ bộ lọc |
| **Tổng** | | **33/40** | **Tốt — sửa có trọng điểm, không cần dựng lại** |

## Design Specificity Verdict

**Đánh giá LLM: rất đặc thù, không bàn cãi.** Đây không phải grid thẻ đổi logo là dùng cho app khác. Bằng chứng: `nghiengOnDinh()` băm id thành góc nghiêng cố định (DanhSachBang.tsx:64), `mauOnDinh()` băm hue vào dải [260,330°) **cố ý né** đỏ/hổ phách/xanh lá vì ba màu đó thuộc họ tín hiệu an toàn lâm sàng, corner-curl bằng `clip-path: path()` cong thật, magenta `--c-accent-2` khoá cứng trong Mindmap ("One Other Place Rule"), FLIP đo `getBoundingClientRect()` thật của đúng thẻ vừa chạm (BoardGallery.tsx:181-216). Icon trạng thái rỗng tái dùng chính path SVG của tab Mindmap.

**Quét máy móc:** `detect.mjs --json src/board/BoardGallery.tsx src/board/DanhSachBang.tsx` → `[]`, exit 0, **0 phát hiện**. Console sạch (chỉ log HMR Vite), network 200 toàn bộ, `scrollWidth === clientWidth` ở cả 375px và desktop, input tìm kiếm 16px đúng "16px Floor Rule", `@media (prefers-reduced-motion: reduce)` phủ đủ cả 7 lớp animation của bề mặt này.

**Lớp phủ overlay:** KHÔNG chạy. Assessment B chủ động bỏ bước inject live-server vì đã định lượng đủ bằng `javascript_tool`. **Không có overlay nào hiển thị trong trình duyệt của bạn** — đừng đi tìm.

## Overall Impression

Bề mặt này đã lên hạng thật kể từ lượt 2026-08-28: P0 nút "⋯" vô hình bản tối đã vá bằng token `--c-on-note` (đo lại: `rgb(18,20,43)` trên giấy, rõ ràng), P1 ghi IndexedDB thất bại im lặng đã có banner báo lỗi nêu đúng số thay đổi mất kèm đường thoát, và P2 lối vào thứ hai đã có nhấn-giữ 500ms. Ba nợ, trả cả ba.

Nhưng lượt này lộ ra một lỗ khác hẳn về **chủng loại**. Toàn bộ công sức đã đổ vào việc *bảo vệ* một bảng đã tồn tại — không cho nó biến mất khỏi lưới khi đổi khoa, không cho mất khi lỡ xoá, không cho mất khi IndexedDB hỏng. Có 5 đoạn comment riêng ghi lại từng lượt vá lớp lỗi "thẻ biến mất". Trong khi đó **khoảnh khắc bảng được sinh ra** — luồng chạy 100% số lần, trên mọi bảng — vẫn để ký tự đầu tiên bác sĩ gõ nối đuôi vào tên mặc định thay vì thay thế nó.

Cơ hội lớn nhất không phải tính năng mới: là kéo cùng mức kỷ luật đó lùi về đầu vòng đời của một bảng.

## What's Working

1. **Lưới an toàn xoá kép, thiết kế theo đúng bối cảnh trực.** Toast 5 giây *cộng với* panel "Đã xoá gần đây" bền vững. Comment code nói thẳng kịch bản "bị gọi đi giữa ca trực nên lỡ luôn toast". Đây là thiết kế chống một nỗi sợ có thật, không phải toast lấy lệ.
2. **Kỷ luật "không để thẻ biến mất dưới tay người dùng".** Mọi callback sửa bảng (đổi tên, đổi khoa, thêm/xoá tag, hoàn tác) đều tự kiểm `bangKhopTimKiem()` bằng bản ghi **MỚI** rồi tự gỡ chip lọc/ô tìm nếu bảng vừa thao tác sắp rớt khỏi kết quả. Riêng ca xoá tag — truy vấn khớp bảng *chỉ nhờ đúng cái tag vừa bấm ×* — được vá riêng. Mức chi tiết này hiếm.
3. **Nền tảng đo được, sạch.** Detector 0 phát hiện, lưới 2 cột ở 375px / 4 cột PC-iPad, không tràn ngang ở bất kỳ breakpoint nào, không lỗi console qua cả phiên thao tác đầy đủ, mọi vùng chạm 44×44, reduced-motion phủ kín.

## Priority Issues

### [P1] `autoFocus` ô đổi tên đặt con trỏ ở CUỐI chuỗi — gõ tên là nối vào tên mặc định

**Đo trực tiếp trên trang thật** (agent cha tự kiểm chứng lại phát hiện của Assessment A):

```
before: { value: "Bảng chưa đặt tên", selectionStart: 17, selectionEnd: 17, isActive: true }
gõ "Suy tim cấp" → "Bảng chưa đặt tênSuy tim cấp"
```

`selectionStart === selectionEnd === 17` — vùng chọn rỗng ở cuối, không phải chọn toàn bộ. `<input>` tại DanhSachBang.tsx:484 có `autoFocus` nhưng không có `onFocus={e => e.currentTarget.select()}` và không có `inputRef.current?.select()` trong effect.

**Why it matters:** chính comment code (dòng 1079-1082) nói mục đích tự mở ô đổi tên là để người dùng đặt tên **trước** khi vẽ, giải quyết bài toán nhiều bảng trùng tên mặc định. Bug này làm ngược lại mục tiêu đó — sinh ra tên rác *tệ hơn* tên mặc định. Và nó rơi đúng vào persona trung tâm của PRODUCT.md: bác sĩ trực 2h sáng, một tay, gõ nhanh, không soi kỹ ô nhập. Tên bảng là thứ đầu tiên đọc để nhận lại bảng trong thư viện tra cứu cá nhân — hỏng ở đây là hỏng vĩnh viễn, vì `onBlur` lưu thẳng.

**Fix:** thêm `onFocus={(e) => e.currentTarget.select()}` vào `<input>` DanhSachBang.tsx:484. Một dòng.

**Suggested command:** `/impeccable harden src/board/DanhSachBang.tsx`

### [P1] "Tạo bảng mới" là ô CUỐI lưới — hành động chính trôi xuống đáy khi có nhiều bảng

DanhSachBang.tsx:1538-1550 render nút tạo bảng **sau** `danhSachSapXep.map(...)`, tức luôn ở cuối lưới. `ScreenHeader title="Sơ đồ tư duy"` (dòng 1103) được gọi **không có prop `actions`** — DESIGN.md ghi rằng nút "+ Bảng mới" ở header cũ đã bị gỡ khi gộp vào ScreenHeader chung (2026-08-28). Kết quả: đây là lối tạo bảng **duy nhất**, và không có FAB (đo trên trang thật: chỉ đúng một `button[aria-label="Tạo bảng mới"]` trong DOM).

**Why it matters:** ở 2 cột trên iPhone, 20 bảng = 10 hàng. Hành động chính của màn nằm sau ~10 hàng cuộn, trong khi lưới sắp theo `capNhatLuc` giảm dần nên vị trí nút *dịch chuyển* mỗi lần thêm bảng. Đúng ba lỗi cùng lúc: hành động chính không ở nơi cố định, không ở nơi với tới bằng ngón cái, và ngày càng xa theo mức độ dùng app. Sản phẩm nào cũng sai được cái này — sản phẩm dùng lúc trực thì không.

**Fix:** đưa ô "+" lên **ô lưới đầu tiên** (trước `.map()`) — giữ nguyên ngôn ngữ thị giác, chỉ đổi thứ tự, và cố định vị trí bất kể số bảng. Hoặc truyền `actions` vào `ScreenHeader` để có nút cố định ở header.

**Suggested command:** `/impeccable layout src/board/DanhSachBang.tsx`

### [P2] Placeholder ô tìm kiếm dưới sàn AA ở CẢ hai bản

Đo thật (agent cha kiểm chứng lại con số của Assessment B):
- Bản tối: `oklab(0.953632 0.0017859 -0.0176241 / 0.5)` hoà trên pill `rgb(35,38,74)` → **4,30:1**
- Bản sáng: **≈3,31:1**
- Sàn AA cho chữ thường 16px: 4,5:1

**Nguyên nhân gốc, và đây mới là phần đáng nói:** app **chưa bao giờ tô màu placeholder này**. Giá trị đang dùng là mặc định preflight của Tailwind v4 — `color-mix(in oklab, currentColor 50%, transparent)`. Trong một hệ thống mà DESIGN.md tuyên bố "một hex cứng trong component là bug, không phải lựa chọn style", đây là chỗ duy nhất trên bề mặt để framework quyết định màu thay cho token. App đã có sẵn `--c-text-muted` đo được 4,89:1 — đúng thứ cần dùng.

**Why it matters:** placeholder này là chỗ *duy nhất* nói cho người dùng biết ô tìm kiếm tìm được cả **nội dung bên trong bảng**, không chỉ tên. Mờ đi là mất luôn thông tin đó. Đọc dưới đèn hành lang bệnh viện hoặc màn hình hạ sáng ban ngày thì mất hẳn.

**Fix:** `.mind-search-pill input::placeholder { color: var(--c-text-muted); }` trong index.css.

**Suggested command:** `/impeccable polish src/board/DanhSachBang.tsx`

### [P2] Trạng thái "không tìm thấy" mời tạo bảng mới thay vì gỡ bộ lọc

DanhSachBang.tsx:1385-1438: nhánh rỗng render nút "+" tạo bảng **vô điều kiện**, kể cả khi `rongDoBoLoc === true`. Gõ một từ khoá không khớp → thấy: minh hoạ + "Không tìm thấy bảng nào khớp" + "Thử từ khoá khác hoặc bỏ bớt bộ lọc." + một nút "+" 104×78 to đùng.

Comment code lập luận rằng ô tìm và chip vẫn hiện phía trên nên không cần nút "xoá bộ lọc" riêng. Lập luận đó đúng về *khả năng tiếp cận* nhưng bỏ qua *trọng lượng thị giác*: phần tử lớn nhất, màu nhất trong khung nhìn đang mời làm một việc **không liên quan** tới việc người dùng vừa cố làm. Người vội sẽ bấm nó, rồi có một bảng rác.

**Fix:** trong nhánh `rongDoBoLoc`, thay nút "+" bằng nút "Xoá bộ lọc" (gọi `setTruyVan(''); setChuyenKhoaLoc(null)`). Giữ nút "+" cho nhánh rỗng thật.

**Suggested command:** `/impeccable clarify src/board/DanhSachBang.tsx`

### [P3] Ô "+" tạo bảng lạc ngôn ngữ thị giác của chính màn nó đứng

`.mind-o-tao-bang` (index.css:901-906): `border: 1px dashed --c-accent-2` (đo thật render 0,667px — hairline), `border-radius: 8px`, `background: rgba(accent-2, 0.06)`.

Trên màn này có đúng hai loại bo góc: giấy `.mind-note-card` bo **2px**, và hệ thống chung bo **14px** (`--radius`, DESIGN.md). Ô tạo bảng bo **8px** — không khớp cái nào. Nó cũng là phần tử duy nhất trong lưới không phải "giấy": một khung đứt nét kiểu dropzone đứng cạnh những tờ giấy kem có bóng đổ và góc cong.

**Fix:** cho nó là **một tờ giấy trắng** — cùng `.mind-note-card` nhưng rỗng, bo 2px, có dấu "+" mảnh ở giữa. Trong ẩn dụ bàn giấy, "tờ mới" trông như tờ giấy chưa viết, không như một ô chờ thả file.

**Suggested command:** `/impeccable polish src/board/DanhSachBang.tsx`

## Persona Red Flags

**Bác sĩ trực 2h sáng, một tay, bản tối** (persona trung tâm PRODUCT.md): tạo bảng, gõ ngay "Sốc nhiễm khuẩn" như luồng thiết kế khuyến khích → lưu thành `"Bảng chưa đặt tênSốc nhiễm khuẩn"`. Ba tuần sau tra lại, thấy một danh sách tên hỏng do chính mình tạo ra. Và nếu đã có 15 bảng, muốn tạo bảng thứ 16 phải cuộn hết lưới bằng một tay.

**Người dùng lần đầu:** trạng thái rỗng nói đúng giá trị bề mặt (một điểm mạnh thật). Nhưng ngay khi có thẻ đầu tiên, không gì gợi ý thẻ có menu — "⋯" là affordance thấy được duy nhất, nhấn-giữ 500ms hoàn toàn vô hình. Placeholder mờ 3,3:1 lại làm mất luôn manh mối rằng tìm kiếm quét được cả nội dung bên trong bảng.

**Người dùng nặng (30+ bảng):** không có sắp xếp A-Z, không có thao tác hàng loạt, không phím tắt. Lưới luôn theo `capNhatLuc` giảm dần và không có chỗ nào nói ra quy tắc đó — thứ tự tự đổi sau mỗi lần mở bảng, không giải thích. Tìm kiếm bù được phần lớn, nên đây là giới hạn chấp nhận được ở quy mô hiện tại, không phải lỗi.

## Minor Observations

**Bốn phát hiện bị bác sau khi kiểm chứng lại — đọc phần này trước khi sửa gì:**

1. **P2 của Assessment A (`--c-text-muted` 4,38:1 bản sáng) là dương tính giả.** A tính `#6b6e96` trên `--c-page` (`#f1f2fb`) = 4,38:1. Nhưng đo trên trang thật, nền sau nhãn thời gian và chip không-active là `--c-surface` = `#ffffff`, không phải `--c-page` → **4,89:1, đạt AA**. Assessment B đo live cũng ra đúng 4,89. Không cần sửa token.
2. **"Dương tính giả #2" của Assessment B lại là quy kết sai.** B thấy chuỗi `"Bảng chưa đặt tênSuy tim cấp"` trên thẻ, grep không thấy trong source, kết luận là nhiễu do đua dữ liệu IndexedDB giữa hai phiên. Thực tế đó chính là Assessment A đang tái hiện thành công bug P1 ở tab bên cạnh. Hai agent nhìn cùng một bằng chứng từ hai phía và cùng suýt vứt nó đi.
3. **Vùng chạm 42,24px không phải lỗi.** 42,24 = 44 × 0,96 — trạng thái `from` của `.card-settle` (`animation ... backwards`) bị đóng băng vì tab chưa composite. Đo lại lúc DOM ổn định: đúng 44×44.
4. **Chip "Tất cả" 1,09:1** — lỗi trong script đo (leo nền từ `parentElement`, bỏ qua nền riêng của chip active). Giá trị thật 8,02:1 tối / 9,79:1 sáng.

**Quan sát khác:**
- Fix P0 lượt trước (nút "⋯" bản tối) đã xác minh hoạt động thật: `color: rgb(18,20,43)` = `--c-on-note` trên giấy, đọc rõ.
- Mục "Xuất PNG" **tắt kèm lý do** ("Mở bảng một lần để có ảnh") thay vì ẩn — mẫu copy tốt, nên nhân rộng.
- Menu "⋯" và panel "Chuyên khoa/tag" ghim **cùng toạ độ tuyệt đối** (`top:30 right:4`), chỉ phân biệt bằng thứ tự render. Code đã tự nhận là điểm dễ vỡ. Chưa phải bug, đáng theo dõi.
- Khi đổi chuyên khoa khiến bảng rớt khỏi chip lọc đang chọn, bộ lọc tự về "Tất cả" **im lặng**, không toast. Hành vi đúng, thiếu một tín hiệu xác nhận nhỏ.
- Assessment A báo phím Enter không commit ô đổi tên / ô thêm tag qua công cụ automation, nhưng tự đánh dấu "chưa đủ tin cậy, cần bấm bàn phím vật lý". Chưa xếp P. Đáng kiểm tay 30 giây.
- Còn 2 bảng test "Bảng chưa đặt tên" trong IndexedDB dev do lượt kiểm này tạo ra. Không xoá tự động để tránh đụng nhầm bảng thật của bạn.

## Questions to Consider

- Nếu "không đọc sai / không mất tên bảng" quan trọng đến mức xứng đáng cả một hệ thống băm-màu-ổn-định-theo-id và 5 vòng vá lỗi "thẻ biến mất", thì nó có xứng đáng một dòng `.select()` không?
- Toàn bộ kỷ luật của màn này đổ vào việc **bảo vệ bảng đã có**. Còn khoảnh khắc bảng được **sinh ra** thì sao — có bao nhiêu lỗ khác nằm ở đúng nửa đó của vòng đời?
- Trong ẩn dụ bàn giấy, "tờ giấy mới" trông như thế nào? Chắc chắn không phải một khung đứt nét bo 8px.
- Ô tìm kiếm này quét được cả nội dung *bên trong* bảng — một năng lực thật sự mạnh. Nếu dòng chữ duy nhất nói ra điều đó lại mờ dưới ngưỡng AA, thì có bao nhiêu người từng biết nó tồn tại?
