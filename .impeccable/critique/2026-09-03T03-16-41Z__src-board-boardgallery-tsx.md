---
target: MindMap Board Gallery
total_score: 34
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 0
timestamp: 2026-09-03T03-16-41Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: af2ffe175429c85fe · B: ad41edae59cb712f6) — lượt 5, sau khi vá 3 điểm P1/P2 (2026-09-03 lượt 4, commit `11d28b0`).

## Điểm sức khỏe thiết kế (Nielsen's 10 Heuristics)

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 4 | Không đổi, không có tín hiệu hồi quy |
| 2 | Match System / Real World | 4 | Line-drawing tái dùng icon thật, xác nhận qua code |
| 3 | User Control and Freedom | 4 | Không đổi |
| 4 | Consistency and Standards | 4 | Không đổi |
| 5 | Error Prevention | 4 | Tăng từ 3: double-tap thật trên "+" không còn mở lỗ hổng cướp focus — A và B đo ĐỘC LẬP, cùng kết quả (activeElement là input đổi tên, gõ được ngay) |
| 6 | Recognition Rather Than Recall | 3 | aria-label trùng và hue <30° của lượt 4 đều đã đóng (đo lại xác nhận), nhưng lộ ra vấn đề MỚI: số thứ tự "thứ N" dựa vào VỊ TRÍ lưới (sắp theo capNhatLuc), không phải danh tính bền — mở-xem một bảng cũ (không sửa gì) đủ để đánh số lại toàn bộ nhãn còn lại |
| 7 | Flexibility and Efficiency | 3 | Không kiểm lại lượt này, giữ nguyên từ lượt 4 |
| 8 | Aesthetic and Minimalist Design | 4 | Không đổi |
| 9 | Error Recovery | 4 | Tăng từ 3: bảng "mồ côi tên" do double-tap không còn xảy ra — ô đổi tên vẫn mở đúng sau double-click thật |
| 10 | Help and Documentation | n/a | Đúng phạm vi Experience-mode |
| **Tổng** | | **34/36** | **Excellent (94%)** |

*Lượt 4: 32/36 (89%). Tăng thật nhờ #5/#9 (double-tap không còn mở lỗ hổng, đo bằng thao tác trình duyệt thật chứ không chỉ đọc mã) — trong khi #6 giữ nguyên mức vì một vấn đề MỚI (không phải hồi quy của 3 điểm đã vá) vừa lộ ra khi kiểm sâu hơn.*

## Xác minh 3 điểm vá lượt 4

| Điểm vá | Kết quả | Bằng chứng hội tụ A + B |
|---|---|---|
| aria-label với số thứ tự (nhánh chưa gắn khoa + tên mặc định) | **Đúng như tuyên bố** | Cả hai tạo 4 bảng liên tiếp, đọc DOM: 4 chuỗi "Mở bảng chưa đặt tên thứ 1/2/3/4, cập nhật..." khác nhau đôi một — kể cả 2 thẻ CÙNG màu (mauHue 260, lặp lại) vẫn phân biệt được bằng số thứ tự. |
| `onMouseDown` preventDefault khi `detail>1` trên "+" | **Đúng, hết hồi quy P2 lượt 4** | Cả hai dùng `double_click` THẬT (không phải 2 `.click()` rời) trên nút "+" ổn định vị trí: đúng 2 bảng (không nhân bản), `document.activeElement` là input đổi tên của bảng vừa tạo, gõ được ngay không bị blur giữa chừng. |
| `CAC_MOC_HUE` 3 mốc cách 30° | **Đúng thuật toán, khớp tay** | Cả hai đo 4 bảng liên tiếp ra đúng 260°/290°/320°/260° — A replay thuật toán greedy bằng tay khớp 100%, B đo `getComputedStyle` độc lập ra cùng 4 giá trị. Khoảng cách 3 hue đầu đều ≥30° đúng cam kết mới. |
| Ngưỡng xoá 450ms (round-3, kiểm lại để chắc không hồi quy) | **Còn vững** | B: <450ms không xoá, >450ms (600ms) xoá thành công + panel trash xuất hiện. |

## Xác minh tính đặc thù thiết kế

**Định tính (A):** Vẫn đặc thù thật, không thay đổi từ lượt trước.

**Quét tự động (B):** CLI sạch, 0 phát hiện trên cả 3 file. Không overflow ngang, tap target 44×44px đạt chuẩn, console sạch trong suốt phiên. Không có false positive nào ở lượt này.

## Ấn tượng chung

3 bản vá lượt 4 đứng vững dưới kiểm chứng ĐỘC LẬP bằng thao tác trình duyệt thật (double-click thật, không phải script rời rạc) từ cả hai agent — không cái nào hồi quy. Nhưng chính bản vá aria-label lại lộ ra một lớp vấn đề mới nó chưa lường tới: số thứ tự "thứ N" mượn `index` vị trí trong lưới (sắp theo `capNhatLuc` giảm dần) làm định danh tạm thời — điều này đúng khi mọi bảng đứng yên, nhưng chỉ cần MỞ-XEM một bảng cũ (hoàn toàn vô hại với người dùng sáng mắt, vì đây là thao tác "xem lại", không phải "sửa") cũng đủ khiến `capNhatLuc` bump (nghi vấn: BlockSuite tự khởi tạo một block mặc định coi là thay đổi "local" thật ở lần mở đầu tiên của canvas trống) và đánh số lại TOÀN BỘ nhãn còn lại — một người dùng trình đọc màn hình vừa quen "bảng thứ 3 là ca ngộ độc" phải học lại ánh xạ ngay sau một thao tác tưởng chừng vô hại.

## Điểm mạnh

1. **Cả 3 bản vá lượt 4 xác nhận đứng vững bằng thao tác trình duyệt THẬT, không chỉ đọc mã** — double-click thật (không phải 2 click script), tạo hàng loạt bảng, đọc DOM/IndexedDB trực tiếp, bởi hai agent độc lập cùng phương pháp.
2. **`mauHueChongTrung` là thuật toán đúng, replay được từng bước bằng tay** — A tra ngược `taoLuc` để xác định đúng thứ tự tạo thật, chạy tay thuật toán greedy khớp 100% với dữ liệu đo, kể cả nhánh "bão hoà" quay về mốc đầu.
3. **Đánh đổi 14→3 mốc hue minh bạch, có tài liệu hoá lý do trong chính mã nguồn** — không giấu đánh đổi dưới vỏ bọc "đã sửa hoàn toàn", cả hai agent đều đọc được đúng lý do (giới hạn pigeonhole) từ comment.

## Vấn đề ưu tiên

**[P2] Nhãn "thứ N" trong aria-label là chỉ số VỊ TRÍ lưới (theo `capNhatLuc` giảm dần), không phải danh tính ổn định — mở-xem một bảng cũ (không sửa nội dung) đủ để đánh số lại toàn bộ nhãn còn lại.** A quan sát trực tiếp: mở một bảng đang mang nhãn "thứ 4", không gõ gì, quay lại danh sách — bảng đó nhảy lên vị trí 1 ("Vừa xong"), và nhãn "thứ N" của MỌI bảng chưa đặt tên khác đổi theo vị trí mới. Nghi vấn nguyên nhân: canvas hoàn toàn trống lúc mở lần đầu có thể khiến BlockSuite tự khởi tạo một block mặc định, được tính là thay đổi "local" thật nên `capNhatLuc` vẫn bump dù người dùng chưa chủ động sửa gì (khác với bảng ĐÃ có nội dung, nơi test `edgeless-board-mount.spec.ts` xác nhận mở-không-sửa không bump) — A chưa kiểm sâu tới `EdgelessBoard.tsx` để khẳng định 100% cơ chế này. Hệ quả trực tiếp: đúng kịch bản phổ biến nhất mà `taoBangMoi` tự mô tả ("dựng vài khung liên tiếp đầu ca trực") — nếu người dùng quay lại một trong các khung đó để bắt đầu vẽ, số thứ tự của MỌI bảng còn lại xáo trộn ngay sau đó, một tác dụng phụ không thấy được bằng mắt (sighted users không dựa vào số thứ tự) nhưng phá đúng thứ bản vá lượt 4 định xây cho người dùng trình đọc màn hình.
**Cách sửa:** dùng số thứ tự ổn định theo `taoLuc` (thứ tự TẠO, không đổi theo vị trí hiển thị) thay vì `index` vị trí trong lưới đã sắp xếp — cần xác nhận trước cơ chế `capNhatLuc` có thực sự bump khi mở canvas trống lần đầu hay không (kiểm `EdgelessBoard.tsx`) để biết đây là bug ở tầng dữ liệu hay chỉ cần đổi nguồn số thứ tự ở tầng hiển thị.
**Lệnh gợi ý:** `/impeccable harden`

## Cờ đỏ theo persona

- **Riley (stress-tester):** Double-tap không còn là vector hợp lệ nữa — thử đúng thao tác lượt 4 từng bắt lỗi, giờ ra kết quả sạch. Điểm cộng thật, xác nhận bởi cả hai agent.
- **Sam (trình đọc màn hình):** Vấn đề trùng nhãn cũ đã đóng, nhưng lộ ra vấn đề MỚI đúng nhóm người dùng này: mở một bảng cũ để xem lại (vô hại với mắt thường) âm thầm xáo trộn toàn bộ số thứ tự các bảng còn lại mà Sam đang dùng để định vị — đúng kiểu lỗi "sighted user không thấy, screen-reader user lãnh đủ".
- **Casey (di động):** Không phát hiện vấn đề mới; double-tap-to-zoom giờ không còn hậu quả tệ trên "+", tap target vẫn đạt 44×44px.

## Quan sát nhỏ

- Cả hai agent độc lập ghi nhận nhiễu môi trường: nhiều phiên/tab cùng chạm chung origin `localhost:8443` (localStorage/IndexedDB theo origin, không theo tab) khiến số bảng đôi lúc lệch so với thao tác thực hiện — cả hai đều đối chiếu `taoLuc` để tách nhiễu khỏi tín hiệu thật trước khi kết luận, không tính vào phát hiện sản phẩm.
- Không có false positive nào từ detector ở lượt này.

## Câu hỏi đáng suy ngẫm

1. Nhãn "thứ N" dùng vị trí lưới hiện tại (đổi liên tục theo hành vi xem/sửa) để giải quyết một vấn đề về DANH TÍNH (phân biệt bảng nào với bảng nào) — có nên tách hai khái niệm "vị trí hiện tại" và "định danh bền" thành hai nguồn dữ liệu khác nhau ngay từ đầu, thay vì mượn một chỉ số vốn không ổn định?
2. Nếu nguyên nhân đúng là BlockSuite tự khởi tạo block mặc định lúc mở canvas trống lần đầu, đây có phải một vấn đề rộng hơn cả nhãn "thứ N" — mọi bảng trống chỉ cần mở-xem một lần là coi như "đã cập nhật", ảnh hưởng tới cả thứ tự hiển thị trong lưới (không chỉ aria-label) mà sighted users cũng gặp phải, chỉ là ít để ý hơn?
