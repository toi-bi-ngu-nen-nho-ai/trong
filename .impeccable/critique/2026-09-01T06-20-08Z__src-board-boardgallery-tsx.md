---
target: MindMap Board Gallery
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-09-01T06-20-08Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: design review, Sonnet 5 · B: detector + browser evidence, Sonnet 5), cách ly, song song.

Sai lệch trình tự (như lượt 2026-08-29): B về trước A (401s so với 933s), nên bằng chứng detector vào context tổng hợp trước khi A xong. Để bù, agent cha đã tự mở một tab thứ ba, cách ly, và đo lại độc lập trên trình duyệt thật trước khi tổng hợp — bác bỏ 1 phát hiện của A, xác nhận 1 phát hiện khác của A, và giải quyết 1 mâu thuẫn giữa A và B bằng cách đọc thẳng source. Cả ba tab (seed, A, B) dùng chung một dev server/IndexedDB gốc `localhost:8443` nên dữ liệu test (2 bảng "Bảng chưa đặt tên" cũ, 1 bảng test mới) lẫn vào nhau — đã tính đến khi đọc kết quả.

## Design Health Score

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton, toast xuất/xoá đều rõ — nhưng màn hình chờ mở bảng không có tín hiệu "vẫn đang tải" nếu chạy lâu hơn bình thường, chỉ có hoạt ảnh trang trí lặp vô hạn |
| 2 | Match System / Real World | 4 | Thẻ giấy vật liệu, icon+màu theo đúng chuyên khoa lâm sàng thật, hoạt ảnh vẽ tay khớp icon bảng — xác nhận trực tiếp trên trang |
| 3 | User Control and Freedom | 3 | Soft-delete + hoàn tác + drawer khôi phục mạnh; xoá vĩnh viễn trong drawer vẫn là điểm không quay lại được |
| 4 | Consistency and Standards | 3 | Dùng chung ScreenHeader/toast/sheet toàn app; nút quay lại dùng path SVG chép tay từ icon set private của App.tsx (code tự nhận là điểm dễ vỡ, không phải nợ ẩn) |
| 5 | Error Prevention | 3 | Xác nhận xoá 2 bước, tên rỗng tự có tên mặc định — bug con trỏ autoFocus của lượt trước (2026-08-29 P1) đã xác minh vá xong |
| 6 | Recognition Rather Than Recall | 3 | Icon+màu ổn định theo id; docked vì hàng chip mở rộng giấu "Tất cả" ngoài khung nhìn không dấu hiệu |
| 7 | Flexibility and Efficiency | 2 | Long-press + "…" là 2 lối vào tốt, nhưng không sắp xếp, không thao tác hàng loạt trên bảng đang sống, không phím tắt — giới hạn chấp nhận được ở quy mô hiện tại nhưng rõ ràng ở góc điểm |
| 8 | Aesthetic and Minimalist Design | 4 | Detector 0 phát hiện trên 2 file mục tiêu, bố cục không rối dù mật độ cao |
| 9 | Error Recovery | 3 | Thông báo lỗi ghi/xuất cụ thể theo đúng nguyên nhân, có đường thoát |
| 10 | Help and Documentation | 1 | Không gợi ý first-run cho nhấn-giữ (vẫn tồn tại từ lượt 2026-08-29); không giải thích khái niệm riêng của Mindmap (quan hệ vs phác đồ) ở đâu trong gallery |
| **Tổng** | | **29/40** | **Tốt (dải 28-35) — sát biên dưới, không phải Acceptable** |

**Về việc điểm thấp hơn lượt trước (33/40, 2026-08-29) dù cả 4 vấn đề P1/P2 lượt đó đã xác minh vá xong**: đây là chấm điểm độc lập của một agent khác, không phải hồi quy. Đã tự kiểm chứng trực tiếp: autoFocus/`.select()` (DanhSachBang.tsx:580), ô "+" lên đầu lưới (dòng 1813-1829), token contrast placeholder riêng (index.css:1352), nút "Xoá bộ lọc" ở trạng thái rỗng-do-lọc (dòng 1766-1783) — cả bốn đều còn nguyên trong code hiện tại. Điểm giảm đến từ heuristic #7/#10 vốn đã thấp từ trước (giới hạn thật của bề mặt, không phải lỗi mới) và từ hai phát hiện MỚI thật (chip tràn, không có tín hiệu chờ lâu) bị chấm nghiêm hơn lượt trước.

## Design Specificity Verdict

**Đánh giá LLM**: đặc thù rõ, không phải gallery thẻ chung chung khoác màu thương hiệu. Bằng chứng xác nhận trực tiếp trên trang: hoạt ảnh chờ mở bảng vẽ icon chuyên khoa theo nét (một hình trái tim tự vẽ ra khi mở bảng gắn thẻ "Tim mạch"), thẻ dạng giấy vật liệu có góc cong thay vì card phẳng chung chung, bản đồ nhận diện bảng bằng icon+màu chuyên khoa (thay cho ảnh chụp canvas cũ — code ghi lại lý do: ảnh chụp cho tín hiệu bằng 0 với bảng trống), copy tiếng Việt lâm sàng đúng giọng điềm tĩnh ("Các bảng của bạn vẫn nằm trên máy — app chỉ chưa mở được kho lưu trữ"). FLIP transition neo đúng `getBoundingClientRect()` của thẻ vừa chạm, xác nhận hoạt động đúng khi test tay.

**Quét máy móc**: `detect.mjs --json src/board/BoardGallery.tsx src/board/DanhSachBang.tsx` → exit 0, **0 phát hiện** trên 2 file mục tiêu. Console/network sạch suốt một lượt thao tác đầy đủ (xem-tìm-lọc-tạo-mở-xuất-quay lại-xoá). Không tràn ngang ở cả 375px lẫn 1280px. Hai nút tròn nổi (quay lại, xuất) đo đúng 44×44px. Contrast đo trên trang thật đều đạt AA/AAA: placeholder tìm kiếm 5,28:1, chip lọc chủ động 8,02:1, chip bị động 5,60:1.

**Phát hiện ngoài phạm vi (không tính cho bề mặt này)**: overlay sống tìm được 6 lỗi `undersized-ui-text` (chữ 10px, dưới sàn 11px) — nhưng cả 6 đều nằm ở **nhãn bottom-nav** ("Trang chủ", "Thư viện"...), là chrome dùng chung toàn app, không phải trong BoardGallery.tsx/DanhSachBang.tsx. Đã tách một task riêng cho việc này (xem cuối báo cáo), không gộp vào điểm số bề mặt hiện tại.

**Lớp phủ overlay**: đã chạy thật (không phải skip) — mutation script hoạt động, `live-server.mjs` khởi động ở cổng riêng, tiêm `detect.js`, đọc console, rồi dừng sạch (xác nhận qua `Get-Process` không còn tiến trình). 6 phát hiện nói trên là kết quả thật của lượt chạy này, chỉ là ngoài phạm vi 2 file mục tiêu.

## Overall Impression

Nền tảng cơ học (detector, contrast, touch target, layout, reduced-motion cho phần lớn hoạt ảnh) sạch gần như tuyệt đối, và bốn nợ ưu tiên của lượt trước đã trả thật — có bằng chứng trong code, không phải lời hứa. Cái còn thiếu bây giờ không phải bug mà là **độ hoàn thiện ở rìa**: một hàng chip tràn không tín hiệu, một hoạt ảnh chờ không có phương án dự phòng khi chạy lâu, một góc reduced-motion bị bỏ sót đúng MỘT class. Không có gì trong lượt này đe doạ tác vụ chính (tìm-mở-vẽ-xuất một bảng) — persona trung tâm (bác sĩ trực 2h sáng) vẫn hoàn thành việc, chỉ hơi lấn cấn ở rìa lưới khi có nhiều chuyên khoa.

Một phát hiện lớn của Assessment A (toast xuất PNG "kẹt" đè lên bottom nav) đã bị bác bỏ sau khi agent cha tự đo lại: đó là dương tính giả từ chính công cụ đo (getComputedStyle qua vòng lặp setTimeout trong môi trường trình duyệt tự động không phản ánh đúng tiến trình CSS animation — xác nhận bằng cách tiêm một animation thử nghiệm hoàn toàn không liên quan và thấy nó cũng "kẹt" y hệt). Ảnh chụp màn hình thật cho thấy toast nằm gọn, có khoảng cách rõ với nav. Không cần sửa gì ở đây.

## What's Working

1. **Chuỗi xoá/hoàn tác/khôi phục** vẫn là điểm mạnh nhất, không đổi từ lượt trước: toast 5 giây + drawer "Đã xoá gần đây" bền vững, tự đồng bộ lại bộ lọc/tìm kiếm đang áp dụng khi bảng liên quan bị thao tác.
2. **Hoạt ảnh chờ theo đúng chuyên khoa** (`VeChuyenKhoaDangTai`) là một chi tiết đặc thù thật, xác nhận trực tiếp: mở bảng "Tim mạch" thấy đúng hình trái tim tự vẽ ra, không phải spinner chung chung — vừa là trang trí vừa là xác nhận identity đúng bảng vừa bấm.
3. **Nền tảng đo được sạch**: 0 phát hiện detector, không tràn ngang ở 2 breakpoint, vùng chạm đúng chuẩn, contrast đạt AA/AAA ở mọi phép đo trên trang thật — không phải suy đoán.

## Priority Issues

### [P2] Hàng chip chuyên khoa mở rộng tràn ngang, không dấu hiệu còn nội dung để cuộn

`DanhSachBang.tsx` dòng 1596-1709: bấm "Thêm +9" mở ra 13 chip trong một `role="group"` cuộn ngang. **Đo trực tiếp trên trang thật** (agent cha tái đo, không chỉ dựa vào A): `scrollWidth: 1122px` so với `clientWidth: 375px` ở khung nhìn di động, `overflow-x: auto`, `mask-image: none` — không có fade cạnh, không mũi tên, không dấu hiệu thị giác nào. Ảnh chụp xác nhận: chip cuối cùng nhìn thấy được ("Thận h...") bị cắt cụt giữa từ ngay sát mép phải màn hình.

**Vì sao quan trọng**: "Tất cả" — nút xoá bộ lọc nhanh nhất — nằm ở đầu hàng và cuộn khuất khỏi khung nhìn ngay khi mở rộng. Với người dùng bàn phím/đọc màn hình (13 nút toggle trong một container cuộn ngang không landmark, không gợi ý "còn nội dung bên phải"), đây không chỉ là bất tiện thị giác mà còn là khoảng trống tiếp cận thật.

**Fix**: thêm fade-mask hai cạnh trên container cuộn (`mask-image: linear-gradient(...)`), hoặc ghim "Tất cả" đứng yên ở đầu hàng (`position: sticky; left: 0`) khi phần còn lại cuộn.

**Suggested command**: `/impeccable layout src/board/DanhSachBang.tsx`

### [P2] Không có tín hiệu "vẫn đang tải" nếu màn chờ mở bảng chạy lâu hơn bình thường

`BoardGallery.tsx` dòng 335-357 (`VeChuyenKhoaDangTai`, che tới khi `dangChoCanvas || dangPhongTo` cùng tắt) — comment code ghi mục tiêu ~2,5s, nhưng không có nhánh nào xử lý trường hợp tải chậm hơn (mạng yếu, thiết bị cũ, chunk BlockSuite chưa cache). Người dùng chỉ thấy hoạt ảnh trang trí lặp vô hạn, không có cách phân biệt "đang tải" với "đã treo".

**Vì sao quan trọng**: đúng đối tượng dễ gặp nhất — điện thoại cũ, sóng bệnh viện yếu, lần mở đầu tiên chưa cache chunk nặng (BlockSuite). PRODUCT.md xác định vận hành offline-first nhưng không có nghĩa mọi thiết bị tải nhanh như nhau.

**Fix**: một dòng chữ nhỏ, KHÔNG chặn hoạt ảnh hiện có, xuất hiện sau ngưỡng hợp lý (vd 4-5s) kiểu "Đang tải sơ đồ… có thể mất thêm chút thời gian ở lần mở đầu."

**Suggested command**: `/impeccable harden src/board/BoardGallery.tsx`

### [P3] `.screen-transition` (chuyển màn toàn màn hình) không nằm trong khối `prefers-reduced-motion`

`src/index.css` dòng 1281-1303 liệt kê đủ layer FLIP/thẻ (`.board-flip-*`, `.card-settle`, `.toast-in-full`...) nhưng thiếu đúng MỘT class: `.screen-transition` (định nghĩa dòng 1150, áp dụng ở `DanhSachBang.tsx:1207` cho hiệu ứng trượt-mờ khi vào màn Mindmap từ tab khác). Người bật giảm chuyển động vẫn thấy đúng một hiệu ứng trượt 0,22s mỗi lần chuyển vào màn này.

**Fix**: thêm `.screen-transition` vào danh sách selector ở dòng 1282-1298.

**Suggested command**: `/impeccable polish src/index.css`

### [P3] Trạng thái rỗng-do-lọc vẫn lạnh hơn trạng thái rỗng thật một bậc

`DanhSachBang.tsx` dòng 1751 (`{!rongDoBoLoc && ...}`): dòng tiêu đề ấm ("Biến kiến thức thành bức tranh trực quan, dễ hình dung") chỉ hiện khi rỗng thật; rỗng-do-lọc chỉ còn icon + một dòng xám "Không tìm thấy bảng nào khớp". Đã đúng hành vi (nút CTA đổi thành "Xoá bộ lọc" từ lượt 2026-08-29), chỉ còn lệch tông nhẹ.

**Fix**: không bắt buộc — có thể để nguyên nếu chủ đích là phân biệt rõ hai trạng thái bằng chính sự lạnh/ấm đó.

**Suggested command**: `/impeccable clarify src/board/DanhSachBang.tsx`

## Persona Red Flags

**Riley (stress-tester)**: mở rộng "Thêm +9" ra tò mò, cuộn sang phải xem hết 13 chip, "Tất cả" biến mất khỏi khung nhìn không dấu hiệu quay lại — P2 ở trên, tái hiện được nhiều lần.

**Sam (accessibility-dependent)**: cùng hàng 13 chip đó là một `role="group"` cuộn ngang không landmark/gợi ý tràn — người dùng bàn phím/đọc màn hình phải tab qua hết 13 nút mới tới "Ẩn bớt", không có lối tắt về "Tất cả".

**Jordan (first-timer)**: "…" vẫn là affordance THẤY ĐƯỢC duy nhất cho menu thẻ; nhấn-giữ 500ms (thêm từ 2026-08-28) hoàn toàn vô hình — không đổi từ lượt trước, chưa có gợi ý first-run nào.

## Minor Observations

**Một phát hiện của Assessment A bị bác sau khi kiểm chứng lại — đọc trước khi hành động:**

1. **[P1 bị bác] "Toast xuất PNG kẹt đè lên bottom nav"** — Assessment A đo `transform: matrix(0.98, 0, 0, 0.98, 0, 14)` không đổi qua nhiều mốc thời gian bằng `getComputedStyle` trong vòng lặp `setTimeout`, kết luận animation bị kẹt ở khung hình đầu. Agent cha tái đo bằng đúng phương pháp đó và ra cùng con số — NHƯNG khi tiêm một `@keyframes` thử nghiệm hoàn toàn không liên quan (phần tử mới, animation `forwards` 0,3s) vào cùng trang, nó CŨNG "kẹt" y hệt ở khung hình đầu suốt hơn 1 giây thật. Đây là giới hạn của việc đọc `getComputedStyle` qua các lệnh `javascript_exec` rời rạc trong môi trường trình duyệt tự động này, không phản ánh khung hình đã compositor vẽ ra thật — không phải lỗi CSS animation của app. Ảnh chụp màn hình thật (không phải `getComputedStyle`) chụp đúng lúc toast hiện cho thấy nó nằm gọn phía trên nav, có khoảng cách rõ, không đè. **Không cần sửa.**

2. **Mâu thuẫn A/B về theme đã giải quyết**: B thấy "không có nút đổi chủ đề, app kẹt cứng bản tối dù ép `prefers-color-scheme: light`"; A thấy "chuyển được sang bản sáng, xác nhận trực tiếp". Đọc `src/lib/theme.ts`: nút `ThemeToggle` **chỉ hiện trên Trang chủ** (comment dòng 143 xác nhận chủ đích), và một khi người dùng đã chốt tay "dark" (lưu ở `localStorage`), nó cố tình **thắng** `prefers-color-scheme` — đúng như DESIGN.md mô tả ("manual override beats OS preference"). B đo đúng trong phạm vi màn Mindmap (không có toggle ở đây), A đúng vì đã tìm/dùng toggle ở Trang chủ. Không phải lỗi của bề mặt này — hành vi thiết kế đúng chủ đích.

3. Assessment B tìm 6 phát hiện `undersized-ui-text` (chữ 10px bottom-nav) qua overlay sống — thật, nhưng nằm ngoài 2 file mục tiêu (chrome dùng chung toàn app). Đã tách một task riêng (xem dưới), không tính vào điểm bề mặt này.

4. Icon nút "quay lại" là path SVG chép tay từ icon set private của `App.tsx` (không export được) — code đã tự ghi nhận đây là điểm dễ vỡ khi icon gốc đổi. Chấp nhận được như một trade-off đã ghi lại, không phải nợ ẩn.

5. Một bảng tên mặc định trùng lặp xuất hiện giữa phiên test của Assessment A mà agent đó không cố ý tạo lần hai — không cô lập được nguyên nhân, có thể là artifact của việc click tự động (double-fire) trong môi trường automation. Không xếp hạng P vì không xác nhận được là lỗi thật của app.

## Questions to Consider

- Chuỗi xoá/hoàn tác/khôi phục đã được đầu tư kỹ tới mức nào — liệu hàng chip lọc và màn chờ mở bảng có xứng đáng cùng mức chăm chút đó, hay chúng thuộc "phần rìa chấp nhận được" ở quy mô hiện tại?
- 13 chuyên khoa trong một hàng cuộn ngang không dấu hiệu — tới ngưỡng bao nhiêu chip thì mô hình "cuộn ngang + Thêm N" này tự nó cần đổi hướng (vd lưới 2 cột trong sheet riêng)?
- Heuristic "Help and Documentation" ở đáy bảng (1/4) hai lượt liên tiếp — đây có phải giới hạn chấp nhận được của một công cụ tra cứu tốc độ, hay là một khoảng trống thật đáng đầu tư?
