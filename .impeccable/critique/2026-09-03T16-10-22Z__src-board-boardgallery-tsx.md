---
target: Board Gallery MindMapScreen
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-09-03T16-10-22Z
slug: src-board-boardgallery-tsx
---
# Critique: Board Gallery — tab "Sơ đồ tư duy"

Method: dual-agent (A: general-purpose subagent · B: general-purpose subagent)
Phạm vi: `src/board/BoardGallery.tsx`, `src/board/DanhSachBang.tsx`, `src/board/xuatAnhBang.ts`, các quy tắc `.mind-*`/`.board-*` trong `src/index.css`. **Ngoài phạm vi:** canvas BlockSuite vendored hiện ra sau khi mở bảng (luật D11). Mode: **Operate** (công cụ lâm sàng, việc cần làm: tìm & mở đúng bảng, hoặc tạo bảng mới).

## Điểm sức khỏe thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|-------|--------------|
| 1 | Visibility of System Status | 3/4 | Tạo/xoá/xuất/tải đều có tín hiệu; nhưng không có số lượng kết quả lọc/tìm, và khi mở bảng thì chrome không hiện tên bảng |
| 2 | Match System / Real World | 4/4 | Tiếng Việt đúng giọng bác sĩ, tên/màu chuyên khoa khớp lĩnh vực, "thùng rác / Hoàn tác / Đã xoá gần đây" tự nhiên |
| 3 | User Control and Freedom | 3/4 | Xoá mềm + toast hoàn tác + thùng rác + Escape + xoá bộ lọc; nhưng toast tự tắt sau 5s, và xác nhận xoá hàng loạt chỉ là đổi nhãn, không có nút Huỷ tường minh |
| 4 | Consistency and Standards | 3/4 | Xác nhận xoá hàng loạt (đổi nhãn) ≠ xác nhận xoá vĩnh viễn (panel đỏ, 2 nút); trạng thái thẻ được chọn khác nhau giữa lưới sống và thùng rác; "Xoá bộ lọc" mượn đúng kiểu dấu-gạch-magenta của ô "+" |
| 5 | Error Prevention | 4/4 | Chặn double-tap 450ms cả hai đường xoá, xác nhận 2 bước, xoá mềm, ref-lock khi tạo, tự xoá bộ lọc để bảng vừa tạo/đổi tên/phục hồi không biến mất sau filter |
| 6 | Recognition Rather Than Recall | 2/4 | Mặt thẻ = icon chuyên khoa, không phải danh tính bảng; bảng mới mặc định trùng tên + icon + màu (chỉ đảm bảo tách màu cho 3 bảng chưa gắn khoa đầu tiên); mốc thời gian giống hệt nhau cả một lô |
| 7 | Flexibility and Efficiency | 3/4 | Lọc được ghi nhớ, tìm xuyên nội dung, xoá hàng loạt, bẫy focus; nhưng chỉ có 1 kiểu sắp xếp (mới nhất), không ghim/yêu thích, ô "+" giữ chỗ đắc địa cả khi vô dụng (chế độ chọn, kết quả tìm) |
| 8 | Aesthetic and Minimalist Design | 3/4 | Vật liệu giấy tiết chế, đẹp; nhưng thẻ nào cũng lặp "Vừa xong", "⋯" là ba chấm 1.5px, hàng chip mở ra là 13 mục, empty state trên desktop gần như trống rỗng |
| 9 | Error Recovery | 4/4 | Màn lỗi đọc dữ liệu nêu đúng nguyên nhân idb.ts, trấn an ("Các bảng của bạn vẫn nằm trên máy"), có "Thử lại"; banner lỗi ghi nêu số thay đổi chưa lưu + cách sao lưu |
| 10 | Help and Documentation | 2/4 | Không có hướng dẫn lần đầu, không tooltip cho "⋯", không gì nói cho người mới biết một "bảng" là cả một whiteboard chứ không phải một ghi chú |
| **Tổng** | | **31/40** | **Good** (28–35) |

## Design Specificity Verdict

**Đánh giá LLM:** Đặc thù-sản-phẩm ở lớp *vật liệu bề mặt*, nhưng có-thể-thay-thế-bằng-app-bất-kỳ ở *kiến trúc thông tin* và *mặt thẻ*.

- Bằng chứng "viết riêng cho sản phẩm này" là thật: vật liệu **Note Paper** (`.mind-note-card`) — `#fbfaf7` ấm cố ý không đổi theo theme, công thức shadow 3-slot chỉ lật slot thứ ba giữa hai theme, góc giấy cong tay (`clip-path: path(...)`), độ nghiêng giả-ngẫu-nhiên ổn định mỗi thẻ (±3°). Kỷ luật **Mindmap Magenta** giữ đúng luật "One Other Place" — `--c-accent-2` chỉ xuất hiện ở ô "+", focus ring, viền menu, và nút "Hoàn tác" của toast. Copy tiếng Việt đúng giọng lâm sàng, chèn non-breaking space *trong lòng từ ghép* để âm tiết không gãy dòng. Mô hình xoá và ghi-nhớ-bộ-lọc đều được lập luận rõ từ "bảng là tài sản nhiều tháng/năm" và "bác sĩ đang trực, một tay, bị ngắt quãng".
- Chỗ generic: **lưới** (ô tìm trên đầu, chip lọc, sắp theo mới nhất, thùng rác, chọn-nhiều-để-xoá, ô "thêm" gạch đứt) gần như y nguyên mẫu gallery của Drive/Notion/Apple Notes. **Payload hình ảnh của thẻ là icon chuyên khoa theo màu chuyên khoa** — không phải nội dung bảng. Mọi bảng tim mạch là cùng một trái tim đỏ; mọi bảng mới chưa đặt tên là cùng một glyph tài liệu tím. Với một thư viện chuyên sâu thật, lớp hình ảnh sụp về gần như đồng nhất và người dùng lại phải đọc từng nhãn 13px một. Hiến chương giao cho căn phòng này ≥50% công sức thiết kế như "phòng não phải" — mặt thẻ đang là phần tử ít khác biệt nhất.

**Quét cơ học (detector):** `detect.mjs --json` trên `BoardGallery.tsx` + `DanhSachBang.tsx` → **0 phát hiện, exit 0, sạch**. Detector đã xác nhận hoạt động (32 phát hiện ở phần còn lại của `src/`). Không có dương tính giả nào cần xử lý vì lượt quét đúng-chuẩn rỗng. Chạy `--no-config` lộ 1 mục bị waiver cố ý: `bounce-easing` tại `DanhSachBang.tsx:1741` (caret disclosure "Đã xoá gần đây", xoay 90° trong 180ms, overshoot nhẹ) — waiver có lý do chủ dự án ghi ngày 2026-08-07, không phải lỗi.

**Overlay trình duyệt:** Tiêm thành công vào trang. Banner console: `[impeccable] 4 anti-patterns found`, 6 dòng chi tiết. Đáng chú ý: 3× `clipped-overflow-container` — nhưng cả 3 nằm trên container **vỏ App** (`#root`, `#app-shell`, `<main class="has-nav">`), **ngoài phạm vi** BoardGallery. Còn lại (`overused-font` Plus Jakarta Sans 100%, `bounce-easing`, `layout-transition` của `.disc-body`) đều đã có waiver trong `.impeccable/config.json`. **Không có tín hiệu mới nào trong phạm vi từ detector — lớp code của gallery sạch về mặt cơ học.** Toàn bộ giá trị của lượt critique này nằm ở Assessment A (IA / thứ bậc / tương tác), là thứ detector markup không suy luận được.

## Ấn tượng chung

Đây là một màn hình *an toàn* — làm rất tốt việc "sẽ không có chuyện gì xấu xảy ra với công việc của bạn". Choreography xoá bảng có bốn lớp lưới an toàn, màn lỗi nói thật và nói cả cách khôi phục, empty-do-lọc tách bạch với empty-thật. Nhưng nó tối ưu cho *duyệt*, không phải *truy xuất*: một bác sĩ mở tab lên để xem đúng một sơ đồ trong 20 giây thì không có đường đi đáng tin — mặt thẻ hiển thị icon cơ quan chứ không phải danh tính bảng, và bộ lọc chuyên khoa mở ra thành băng chuyền 13 chip. Cơ hội lớn nhất: **để mặt thẻ mang danh tính của chính bảng đó**, và thu gọn bộ lọc lại. Vật liệu giấy đã hứa hẹn một căn phòng có cá tính; hiện chưa có đỉnh cảm xúc dương nào xứng với lời hứa đó.

## Điểm tốt

1. **Choreography xoá bảng.** Xoá mềm → toast 5s có thanh đếm ngược nhìn thấy được → khay "Đã xoá gần đây" (gọn còn 4 dòng, mở rộng được, tìm được, phục hồi/xoá hàng loạt) → xoá vĩnh viễn 2 bước *tách riêng* → chặn 450ms nhắm riêng cú double-tap phản xạ. Mọi lớp đều buộc vào "một tay, bị ngắt, 2 giờ sáng". Đúng mức hoang tưởng cho một công cụ giữ kiến thức lâm sàng đã tổng hợp.
2. **Trạng thái lỗi và rỗng nói thật và nói cả cách khắc phục.** Màn lỗi đọc phân biệt "dữ liệu của bạn ổn, kho không mở được" với "bạn chưa có bảng nào", nêu đúng nguyên nhân idb.ts, trấn an tường minh. Empty-do-lọc ("Không tìm thấy bảng nào khớp" + nút "Xoá bộ lọc") tách đúng khỏi empty-thật ("Bắt đầu một sơ đồ tư duy mới") — không dối rằng bạn không có bảng, không dụ bạn tạo bảng rác.
3. **Note Paper + kỷ luật magenta.** Giấy ấm không đổi theme, góc cong tay, nghiêng ổn định mỗi thẻ, công thức shadow lật đúng slot thứ ba giữa hai theme, và Mindmap Magenta khoá chặt vào đúng một bề mặt. Một danh tính vật liệu mạch lạc chỉ có thể thuộc về luật "one other place" của app này.

## Vấn đề ưu tiên

### [P1] Mặt thẻ định danh *chuyên khoa*, không phải *bảng*
Payload hình ảnh của mỗi thẻ là một icon chuyên khoa lớn theo màu chuyên khoa. Kiểm chứng trực tiếp: 11 bảng / 6 chuyên khoa cho ra 3 trái tim đỏ giống hệt (tim mạch) và 2 tuyến giáp hổ phách giống hệt (nội tiết); bảng chưa đặt tên là glyph tài liệu tím generic; tìm "thận" trả về hai thẻ thận-xanh gần như y hệt. Tên bảng — định danh thật của nó — là caption 13px *dưới* tờ giấy (`WebkitLineClamp: 2`).
**Vì sao quan trọng (lúc 2h sáng):** một bác sĩ có thư viện thật — nhiều bảng trong đúng chuyên khoa của mình — không thể quét mắt tới đúng bảng. Họ đọc tuyến tính từng nhãn, một tay, trong khi bệnh nhân chờ. Bề mặt "tư duy hình ảnh" lại bắt đọc chữ.
**Sửa:** cho mặt thẻ mang danh tính cấp-bảng — ảnh thu nhỏ canvas cache lại, **hoặc** đặt tên bảng cỡ lớn *trên* mặt giấy làm phần tử chính và hạ icon chuyên khoa xuống chip góc nhỏ, **hoặc** cho người dùng chọn glyph/màu bìa mỗi bảng. Tối thiểu: khi bảng đã có tên thật, render tên đó cỡ lớn trên mặt thẻ, không phải làm caption phụ.
**Lệnh gợi ý:** `/impeccable shape`

### [P2] Bộ lọc chuyên khoa mở ra là 13 mục trên một băng chuyền ngang
Thu gọn là 4 mục có chủ đích ("Tất cả" + 2 chip + "Thêm +9 ▾"). Một chạm mở ra 13 chip: `scrollWidth` ≈ 1122px trên máy 375px, và trên desktop tràn cột nội dung 1040px thêm 82px nên "Ẩn bớt" và "Dược lâm sàng" bị cắt. Không có ô tìm trong hàng, không nhóm, và "Tất cả" trôi khỏi tầm với (viền mờ `.mind-chip-scroll` là gợi ý duy nhất).
**Vì sao quan trọng:** người dùng một tay đi tìm "Thần kinh" phải lăn ngón cái qua băng chuyền và có thể mất luôn lối thoát "xem tất cả".
**Sửa:** thay băng chuyền chip mở-rộng bằng một dropdown/sheet "Chuyên khoa ▾" gọn, liệt kê mọi chuyên khoa kèm số bảng; giữ "Tất cả" + bộ lọc đang chọn ghim lại thành chip.
**Lệnh gợi ý:** `/impeccable distill`

### [P3] Ô "+" tạo bảng cao khác mọi thẻ, hàng 1 lởm chởm rõ
Kiểm chứng: ô "+" cao 179px desktop / 123px mobile; thẻ anh em 216px / 160px — hụt đều 37px, vì ô "+" là hộp 4:3 trơn còn thẻ cộng thêm 2 dòng tên + mốc thời gian dưới mặt 4:3 (`.mind-board-grid` dùng `align-items: normal`, `aspectRatio` inline của ô thắng). Hành động chính nằm ở ô được nhìn nhiều nhất với một khe trống 37px bên dưới — trông như lỗi render ở màn hình đầu tiên mỗi phiên.
**Sửa:** cho ô "+" cùng tổng chiều cao với một thẻ (spacer dưới hộp 4:3, hoặc `align-self: stretch` với dấu "+" căn giữa toàn bộ chiều cao).
**Lệnh gợi ý:** `/impeccable layout`

### [P3] Mở một bảng không hiện tên bảng ở bất cứ đâu trong chrome
Kiểm chứng: khi đã mở, UI gallery duy nhất là hai nút tròn quay-lại và xuất-ảnh (44×44, hai góc trên). Không tiêu đề, không breadcrumb. Cộng với P1, một cú chạm nhầm rất dễ xảy ra và chỉ phát hiện được bằng cách đọc nội dung canvas.
**Sửa:** một nhãn tên bảng nhỏ cạnh nút quay-lại — có thể mờ dần sau vài giây như tiêu đề video.
**Lệnh gợi ý:** `/impeccable clarify`

### [P3 · chưa xác minh đầy đủ] Sheet "Chuyên khoa/tag" mobile là `position: fixed` nhưng render làm con của thẻ đang animate
Rule `@media (max-width:640px)` biến `.mind-menu-bang:not(.mind-menu-compact)` thành bottom sheet full-width qua `position: fixed; left/right: 12px`. Nhưng bất kỳ `transform` nào trên tổ tiên đều trở thành containing block của nó — `.card-plop` (bảng mới, 0.34s), `.card-settle` (mount lưới, so le tới ~0.5s), `.card-slide-out` (xoá), hoặc `.screen-transition` (vào tab). Khi đó sheet co lại thành popover ~140px kẹt trong một ô lưới, `<select>` chuyên khoa và ô nhập tag bị ép còn ~117px. Chỉ *quan sát* được khi animation của pane bị đóng băng nên chưa định lượng được tần suất một animation thẻ thật chồng lên lúc mở panel — nhưng cấu trúc khiến nó *chạm tới được* (mở menu "⋯" trên bảng vừa tạo, trong cửa sổ `card-plop`).
**Sửa:** portal sheet ra app root / `#app-shell` để `position: fixed` luôn quy chiếu theo viewport.
**Lệnh gợi ý:** `/impeccable harden`

## Cờ đỏ theo persona

**Casey (bị phân tâm, một tay, bị ngắt quãng):**
- Bộ lọc 13 chip mở rộng — lăn ngang một tay với "Tất cả" ngoài màn hình là thao tác không hoàn thành nổi khi đang đi.
- Toast hoàn tác 5 giây — bị kéo đi giữa chừng lúc xoá, quay lại toast đã biến mất; khay "Đã xoá gần đây" chỉ cứu nếu biết cuộn xuống qua lưới, và nó hiện 4 dòng trước "Xem tất cả".
- "⋯" — vùng chạm 44px nhưng chỉ là ba chấm 1.5px trên nền kem; ngón cái phải dò.
- Thẻ giống nhau (P1) — quét tìm "bảng DKA", Casey thấy ba tuyến giáp hổ phách và phải dừng lại đọc.
- Ô đổi tên cao 31px (dưới mức tối thiểu 44px của chính bề mặt này), nằm ngay trên vùng bàn phím.

**Jordan (lần đầu):**
- Empty state bán *kết quả*, không bán *cơ chế* — Jordan chạm "+" mà không biết đây là cả một whiteboard (bút/đường nối/ảnh) hay một tờ ghi chú; lần mở đầu rơi thẳng vào BlockSuite không định hướng.
- Bảng mới = "Bảng chưa đặt tên" + icon tài liệu generic + "— Chưa gắn chuyên khoa —" — ba bảng đầu của Jordan trông y hệt nhau.
- Menu "⋯" là đường duy nhất để đổi tên/gắn tag/xoá và nó gần như vô hình.
- Nút "Chọn" trên header — không rõ để làm gì tới khi chạm vào và toàn bộ UI biến đổi.
- Nút "Xoá bộ lọc" trông giống ô "+" tạo bảng (cùng gạch-đứt magenta) — có thể không nhận ra là nút reset.

**Bác sĩ nội khoa đang đi buồng (mở lên xem đúng một sơ đồ, 20 giây):**
- **P1 là chí mạng ở đây.** Họ muốn "bảng tiếp cận hạ natri máu". Lưới toàn icon cơ quan; nhiều thẻ cùng màu; họ bắt đầu đọc nhãn 13px. Hết 20 giây trước khi mở được gì.
- Một cú chạm nhầm (rất dễ) mở ra một bảng **không nhãn tên (P3)** — mất thêm vài giây xác nhận nhầm, rồi back, rồi quét lại.
- Bộ lọc chuyên khoa *sẽ* giúp — nhưng "Thận học" nằm sau "Thêm +9" rồi mới tới băng chuyền 13 chip.
- Đường nhanh duy nhất: nếu bảng của họ *vừa được sửa*, sắp-theo-mới-nhất đẩy nó lên góc trên-trái. Bảng tham chiếu cũ = phải cuộn.
- Kết: việc truy xuất có đích trong 20 giây là không làm được đáng tin. Bề mặt giả định là duyệt, không phải truy xuất.

## Quan sát nhỏ

- Thẻ nào cũng lặp "Vừa xong" / "x phút trước" ở 11px; giống hệt nhau cả một lô vừa tạo — nhiễu thuần tuý. Ẩn khi nó trùng hàng xóm, hoặc chỉ hiện sau một mốc tuổi.
- Nhãn chip chuyên khoa chọn-bôi-đen được — double-tap chọn cả từ ("Thêm" bị highlight khi test) thay vì toggle. Thêm `user-select: none`.
- Chip "Tất cả" đang active và chip **"Cấp cứu"** được chọn đều render là pill tô đặc; "Cấp cứu" tô bằng `#b91c1c` đỏ. Một pill đỏ đặc trong hàng lọc lâm sàng chạm vào lằn ranh **Untouchable Signal Rule**. Cân nhắc outline đỏ-nhạt cho riêng chip đó.
- Ô "+" giữ nguyên ô trên-trái đắc địa cả trong chế độ chọn (mờ/vô hiệu) và trong kết quả tìm (nơi tạo bảng vô nghĩa) — vật chết ở cả hai.
- Desktop empty-thật: ~428px trống dọc dưới ô "+"; cụm nội dung `justify-content: center` trong `height: 70%`, trôi lên cao. Ưu tiên thấp (phone-first) nhưng trông dở dang trên laptop.
- Chọn nhiều: thẻ được chọn chỉ có checkbox tô đầy, không có trạng thái selected ở cấp thẻ; khay thùng rác lại tô nền dòng được chọn — không nhất quán.
- Toast kết quả xuất đáp xuống góc dưới-trái, đè lên đúng control zoom / toolbar dưới của BlockSuite — góc bận nhất. Nên đưa lên trên-giữa hoặc trên toolbar.
- Light mode: thẻ kem `#fbfaf7` vs trang lạnh `#f1f2fb` gần như chỉ tách nhau nhờ drop shadow; thẻ là hình chữ nhật rất thấp tương phản tới khi mắt đọc được cái bóng. Có chủ đích, nhưng sát mép.
- Nghiêng thẻ (±3°) + gap 8px mobile + drop shadow → bóng của thẻ kề nhau chồng ở góc trên phone 2 cột; phần lớn là "chồng giấy", đôi khi là "vết nhoè".

## Câu hỏi đáng cân nhắc

1. Nếu căn phòng Mindmap phải gánh ≥50% công sức thiết kế như "không gian não phải", vì sao mặt thẻ — thứ được nhìn nhiều nhất — lại hiện icon chuyên khoa có sẵn thay vì nội dung bảng? "Ảnh thu nhỏ trôi khi pan" có thật sự tệ hơn "mọi bảng tim mạch trông y hệt"?
2. Ai thực sự lọc theo chuyên khoa, và bao lâu một lần? Bộ lọc được ghi nhớ dựa trên giả định bác sĩ làm cố định một chuyên khoa — nếu đúng vậy thì họ muốn chuyên khoa đó là *view mặc định*, không phải một chip xác nhận lại mỗi phiên. Nếu sai, sự ghi nhớ này là một cái bẫy. Cái nào đúng?
3. Lưới an toàn xoá dày bốn lớp. Có ai đang thực sự mất bảng không, hay đây là hoang tưởng giải lại một bài toán mà xoá-mềm đã giải xong — trong khi nỗi đau thật hằng ngày (tìm đúng bảng trong 20 giây) chỉ được một băng chuyền chip?
4. Chỉ có một kiểu sắp xếp: mới nhất. Với "tài sản dài hạn (nhiều tháng/năm)", "thứ tôi vừa chạm" có phải nguyên tắc tổ chức đúng không, hay cần thêm A→Z / theo chuyên khoa / ghim tay?
5. Người lần đầu chạm "+" và rơi vào canvas BlockSuite trống trơn, không định hướng. Bảng đầu tiên có bao giờ nên được tạo rỗng không, hay "+" nên thả họ vào một template nhẹ (một node "ý tưởng trung tâm" + gợi ý vẽ) để năng lực của canvas hiện ra trong 5 giây đầu?
6. Ô "+" mặc gạch đứt vì gạch đứt = "thêm mới" (Drive/Notion/Figma) — nhưng các app đó đặt nó *cuối*, còn app này làm nó cao khác mọi thứ bên cạnh. Quy ước đó có đáng để đánh đổi lấy hàng 1 lởm chởm không, khi nút header "+ Bảng mới" đã bị bỏ đi có chủ đích?
