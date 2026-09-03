---
target: MindMap Board Gallery
total_score: 33
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 0
timestamp: 2026-09-03T11-01-27Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: a0dc341e9be3a99f6 · B: a3e3c43ebfd3562aa) — lượt 6. Không có thay đổi code nào ở Board Gallery kể từ lượt 4 (commit `11d28b0`); lượt 5 đã xác nhận cả 3 điểm vá đó đứng vững.

## Điểm sức khỏe thiết kế (Nielsen's 10 Heuristics)

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 4 | Không đổi |
| 2 | Match System / Real World | 4 | Không đổi |
| 3 | User Control and Freedom | 3 | Panel "Chuyên khoa/tag" không có nút đóng tường minh — chỉ Escape/chạm-ra-ngoài, không có tín hiệu thị giác nào gợi ý |
| 4 | Consistency and Standards | 3 | Panel tag lệch chuẩn "luôn có hành động tường minh cho mọi thao tác, kể cả thoát" mà menu "⋯" liền kề đang giữ |
| 5 | Error Prevention | 4 | Không đổi (đã xác nhận lại: dispatch đúng `KeyboardEvent('keydown',{key:'Enter'})` lên ô đổi tên lưu và đóng đúng ngay lập tức — không có race condition mất dữ liệu) |
| 6 | Recognition Rather Than Recall | 4 | Không đổi |
| 7 | Flexibility and Efficiency | 3 | Thanh chọn-nhiều: nhãn "{N} đã chọn" thiếu `aria-live`/`aria-atomic`, trong khi nút Xoá NGAY BÊN CẠNH trong CÙNG thanh có đủ hai thuộc tính này |
| 8 | Aesthetic and Minimalist Design | 4 | Không đổi |
| 9 | Error Recovery | 4 | Không đổi |
| 10 | Help and Documentation | n/a | Đúng phạm vi Experience-mode |
| **Tổng** | | **33/36** | **Excellent (92%)** |

*Lượt 5: 34/36 (94%). Giảm nhẹ vì 2 phát hiện MỚI thật (không phải hồi quy) vừa lộ ra khi kiểm các popover tự chế (menu "⋯", panel tag) và thanh hành động hàng loạt — những vùng chưa từng bị soi kỹ ở 5 lượt trước.*

## Đính chính quan trọng — một phát hiện của Assessment B là FALSE POSITIVE, đã xác minh trực tiếp

Assessment B báo cáo: "Enter không commit tên bảng (ô vẫn mở), 1/3 lần mất dữ liệu hoàn toàn khi blur ngay sau Enter — nghi race condition". Trước khi đưa vào báo cáo, tôi tự kiểm bằng tab sạch:
- Dùng `computer{action:"key", text:"Return"}` (cùng công cụ B đã dùng) → **tái hiện đúng triệu chứng**: ô vẫn mở, tên không lưu.
- Đọc source (`DanhSachBang.tsx:702-709`): `onKeyDown` xử lý Enter gọi THẲNG `onLuuTen(tenCanLuu())` — cùng hàm với `onBlur`, và `onLuuTen` (dòng 2310-2311) gọi `setDangSuaTenId(null)` NGAY DÒNG ĐẦU. Không có đường nào trong code khiến Enter "không lưu".
- Tự dispatch `new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true })` thẳng vào input → **lưu đúng và đóng ô ngay lập tức**.

**Kết luận: đây là hạn chế của công cụ gõ phím tự động (không phát đúng `key: 'Enter'` cho input này qua đường OS-level), không phải bug ứng dụng.** Cùng lớp sự cố với false positive "số thứ tự đổi khi mở-xem" của lượt 5 (nhiễu môi trường/công cụ, không phải sản phẩm) — ghi lại để các lượt sau không lặp lại nhầm lẫn này với phím Enter trên ô đổi tên.

## Xác minh 4 điểm vá lượt 4 (không kiểm lại chi tiết — đã xác nhận 2 lần độc lập ở lượt 5)

Assessment A chủ động KHÔNG lặp lại đo lường 3 điểm này (đúng chỉ dẫn, tránh lãng phí) vì môi trường lượt này bị nhiễu nặng hơn cả lượt 5 (tab sống bị một tiến trình khác thao tác trực tiếp — không chỉ IndexedDB). A chuyển hẳn sang đọc mã tĩnh + kiểm DOM không phụ thuộc thời gian.

## Xác minh tính đặc thù thiết kế

**Định tính (A):** Vẫn đặc thù thật — `chuTrenNen()` tính tương phản thật thay vì token cứng, hoạt ảnh line-drawing tái dùng icon thật, góc nghiêng ổn định theo hash id.

**Quét tự động (B):** CLI sạch, 0 phát hiện. Không có false positive từ detector (không có finding nào để đối chiếu).

## Ấn tượng chung

Không có hồi quy nào ở 3 điểm vá lượt 4. Sau 5 lượt tập trung vào lưới chính, phần lớn vấn đề còn sót lại giờ nằm ở các **popover tự chế** (menu "⋯", panel tag) và **thanh hành động hàng loạt** — những vùng chưa từng bị soi kỹ, đúng như kỳ vọng khi một bề mặt đã qua nhiều vòng critique liên tiếp. Điểm đáng chú ý nhất lượt này không phải một bug mới, mà là việc PHÁT HIỆN VÀ LOẠI BỎ một false positive tiềm ẩn nguy hiểm (nghi ngờ mất dữ liệu khi đổi tên) trước khi nó được đưa vào backlog sửa nhầm.

## Điểm mạnh

1. **`chuTrenNen()` tính tương phản thật theo từng màu nền cụ thể, không hard-code trắng/đen.** Tổng quát hoá đúng cho mọi giá trị hex tương lai — đúng bài học từ lỗi contrast từng mắc ở các lượt trước (dùng nhầm token theo-theme cho nền không-theo-theme).
2. **Lớp an toàn dữ liệu nhiều tầng nhất quán** — xoá mềm + Hoàn tác (đơn lẫn hàng loạt) + panel trash + xác nhận kép chống double-tap, xác nhận lại bằng dispatch `KeyboardEvent` thật rằng cơ chế lưu tên không có race condition như nghi ngờ ban đầu.
3. **Hoạt ảnh tải line-drawing tôn trọng đúng giới hạn kỹ thuật** — tự nhân bản icon thật (không vẽ lại, tránh trôi dạt hình ảnh), gác cả `prefers-reduced-motion` lẫn thiếu Web Animations API.

## Vấn đề ưu tiên

**[P2] Panel "Chuyên khoa/tag" không có nút đóng tường minh.** Xác nhận qua đọc code (`DanhSachBang.tsx:923-997`): panel (`role="dialog"`) chỉ chứa `<select>` chuyên khoa, chip tag, ô nhập tag mới — không có nút "Xong"/"Đóng"/✕ nào. Cách duy nhất đóng là Escape hoặc chạm ra ngoài (`pointerdown` ngoài panel), không có tín hiệu thị giác nào gợi ý điều đó (không backdrop, không icon). Với đối tượng chính dùng cảm ứng, Escape không tồn tại trên bàn phím ảo mặc định — người dùng phải tự đoán cách đóng, lệch chuẩn mà menu "⋯" liền kề đang giữ (luôn có mục tường minh cho mọi hành động).
**Cách sửa:** thêm 1 nút "Xong" nhỏ ở cuối panel, gọi đúng handler đang đóng panel qua `pointerdown` ngoài.
**Lệnh gợi ý:** `/impeccable harden`

**[P2] Thanh chọn-nhiều thiếu `aria-live` cho số lượng đã chọn.** Xác nhận qua đọc code (`DanhSachBang.tsx:2588-2590` vs `2628-2646`): `<span>{soChonSong} đã chọn</span>` không có `aria-live`/`aria-atomic`, trong khi nút Xoá NGAY BÊN CẠNH trong CÙNG thanh có đủ (comment tại đó còn ghi rõ lý do). Người dùng trình đọc màn hình tick/bỏ tick từng checkbox trên lưới (mỗi checkbox có aria-label riêng, tốt) nhưng không nghe được số đếm tổng cập nhật real-time — đúng lớp lỗi chính đội đã vá 2 lần (2026-09-02) cho nút Xoá nhưng chưa lan sang chỉ số đếm liền kề.
**Cách sửa:** thêm `aria-live="polite" aria-atomic="true"` vào `<span>` hiển thị số đã chọn.
**Lệnh gợi ý:** `/impeccable harden`

**[P3] Vào chế độ chọn-nhiều không đóng ô đổi tên đang mở.** Xác nhận qua đọc code: nút "Chọn" ở header (`DanhSachBang.tsx:1590`) chỉ `setDangChonNhieu(true)`, không dọn `dangSuaTenId`. Khối checkbox (`chonNhieu &&`, dòng 735) và khối ô đổi tên (`dangSuaTen &&`, dòng ~652) là hai điều kiện RENDER ĐỘC LẬP — nếu người dùng vừa tạo bảng (ô đổi tên tự mở) rồi bấm "Chọn" ngay, thẻ đó hiển thị ĐỒNG THỜI checkbox VÀ ô nhập tên đang focus. Không mất dữ liệu, nhưng là một khoảnh khắc giao diện thiếu nhất quán trạng thái.
**Lệnh gợi ý:** `/impeccable polish`

**[P3] Chống trùng tag không qua chuẩn hoá dấu/hoa-thường.** Xác nhận qua đọc code (`DanhSachBang.tsx:2340-2344`): `hienCo.includes(tag)` so khớp CHÍNH XÁC, khác hẳn `normalizeSearch` dùng cho tìm kiếm (bỏ dấu, không phân biệt hoa/thường). Người dùng có thể vô tình thêm "Tim mạch" rồi "tim mạch" như hai tag khác nhau, hai chip gần giống hệt nhau xếp cạnh nhau không cách nào hợp nhất ngoài xoá thủ công.
**Lệnh gợi ý:** `/impeccable polish`

## Cờ đỏ theo persona

- **Riley (stress-tester):** Nghi vấn ban đầu về race condition mất dữ liệu khi đổi tên KHÔNG xác nhận được — cơ chế lưu tên đứng vững qua kiểm `KeyboardEvent` thật. Điểm cộng, không phải cờ đỏ.
- **Sam (trình đọc màn hình):** Không nghe được số lượng đã chọn cập nhật real-time khi thao tác chọn-nhiều hàng loạt — phải tự đếm hoặc quay lại kiểm tra tay. Panel tag không có nút "Xong" tường minh cũng là rào cản cho luồng thao tác tuần tự bằng bàn phím/AT.
- **Bác sĩ trực (thao tác một tay, cảm ứng, vội):** panel "Chuyên khoa/tag" không có nút "Xong" — mở panel này giữa ca trực để gắn nhanh chuyên khoa, có thể loay hoay vài giây tìm cách đóng.

## Quan sát nhỏ

- Tab order: bottom-nav (5 nút) đứng ĐẦU thứ tự Tab dù nằm cuối màn hình về thị giác — cần 5 lần Tab mới tới nội dung chính. Không phải bug (thứ tự DOM hợp lý cho một bottom-nav cố định), nhưng đáng ghi nhận cho người dùng bàn phím-only.
- Menu "⋯" là một focus-trap kiểu modal HỢP LỆ (Tab cuộn vòng bên trong, Escape trả focus đúng về nút trigger) — đã xác nhận qua cả B lẫn các lượt trước, không phải bug.
- Tương phản đo được: chip active `#0B0C1C` trên `#6EA8FE` = 8.02:1 (AAA); chip thường `rgb(136,142,184)` trên nền phân giải `rgb(20,22,44)` = 5.60:1 (AA). Cả hai đạt chuẩn.
- Responsive 375px: lưới 2 cột đúng, không overflow ngang, tap target ≥44px. Tìm kiếm với chuỗi độc hại (script tag, SQL injection, emoji, CJK) hiển thị an toàn dạng text thô, không XSS.
- Dải chip "Thêm +N" cuộn ngang có fade hai cạnh — xác nhận đây là chủ đích từ critique 2026-09-01, không phải lỗi mới.

## Câu hỏi đáng suy ngẫm

1. Sau 6 lượt critique liên tiếp, phần lớn lỗi còn sót lại giờ nằm ở các popover tự chế (`<div>` thay vì control gốc trình duyệt) — có nên dựng một hook/component popover dùng chung một lần cho toàn Board Gallery (đóng-khi-ra-ngoài, đóng-khi-Escape, bẫy Tab, VÀ một nút "Xong" mặc định) thay vì tiếp tục vá từng điểm chạm riêng lẻ mỗi khi một popover mới xuất hiện?
2. Việc một công cụ test tự động hiểu nhầm hạn chế của chính nó (mô phỏng phím Enter) thành một "bug mất dữ liệu" nghiêm trọng cho thấy: mức độ nghiêm trọng của một phát hiện càng cao, càng cần một bước xác minh độc lập bằng cơ chế KHÁC (ở đây là dispatch `KeyboardEvent` thẳng thay vì qua lớp giả lập OS) trước khi đưa vào báo cáo cuối — có nên biến bước này thành quy tắc bắt buộc cho mọi phát hiện mức P0/P1 liên quan đến bàn phím?
