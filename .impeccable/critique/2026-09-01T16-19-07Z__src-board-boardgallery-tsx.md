---
target: Board Gallery MindmapScreen
total_score: 35
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-09-01T16-19-07Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: design review, Sonnet 5 · B: detector + browser evidence, Sonnet 5), cách ly theo chỉ định — nhưng môi trường Browser pane hoá ra chỉ có MỘT tab dùng chung cho cả phiên (B tự phát hiện: `tabs_create` cho "tab mới" thực chất gộp vào tab cũ, thao tác của A và B đan xen trên cùng IndexedDB — B thấy bảng "Xét nghiệm ECG" tự xuất hiện và app tự điều hướng mà B không bấm). Đây là giới hạn hạ tầng của phiên này, không phải lỗi quy trình. Agent cha đã tự đọc source để xác minh lại 3 phát hiện nhạy cảm với ô nhiễm chéo trước khi đưa vào báo cáo (P1 trash-panel, P3 double-tap, và bác bỏ 1 phát hiện text-occlusion).

## Design Health Score

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Skeleton, toast xuất, dòng "vẫn đang tải" 4,5s, đếm ngược toast xoá — đủ, xác nhận trực tiếp |
| 2 | Match System / Real World | 4 | Ẩn dụ giấy, thuật ngữ lâm sàng, badge chuyên khoa nhất quán |
| 3 | User Control and Freedom | 4 | Xoá 2 bước + toast hoàn tác 5s + drawer khôi phục đầy đủ — kiểm tay từ đầu đến cuối |
| 4 | Consistency and Standards | 3 | Icon quay lại là bản chép tay từ icon private App.tsx (code tự nhận, rủi ro trôi khi gốc đổi) |
| 5 | Error Prevention | 4 | Lưới an toàn bộ lọc áp cho 5 điểm callback (đổi tên/tag/khoa/khôi phục) — hệ thống, không vá lẻ |
| 6 | Recognition Rather Than Recall | 3 | Chip/tìm kiếm luôn thấy được, nhưng trạng thái lọc/mở-rộng-chip không lưu qua phiên |
| 7 | Flexibility and Efficiency | 3 | Nhấn-giữ là lối vào thứ hai tốt cho cảm ứng, nhưng không thao tác hàng loạt trên lưới sống, không nhớ bộ lọc lần trước |
| 8 | Aesthetic and Minimalist Design | 4 | Progressive disclosure thật sự quản lý mật độ (chip gấp, trash gấp), không chỉ dựa khoảng trắng |
| 9 | Error Recovery | 4 | Lỗi đọc/ghi đều nêu nguyên nhân rõ + đường khôi phục, đối chiếu code khớp |
| 10 | Help and Documentation | 2 | Nhấn-giữ (lối vào menu thứ hai) không có gợi ý discovery nào — vẫn tồn tại qua 3 lượt critique liên tiếp |
| **Tổng** | | **35/40** | **Tốt, gần biên Xuất sắc — tăng mạnh từ 29/40 lượt trước** |

## Design Specificity Verdict

**LLM**: cao — hệ màu+icon 11 chuyên khoa băm hue [260°,330°) né đúng 3 màu tín hiệu an toàn lâm sàng, vật liệu giấy là một ngoại lệ CÓ GHI CHÚ với "Floating-Layer-Only Rule" của chính hệ thống, FLIP đo rect thẻ thật, hệ thống xoá/hoàn tác/drawer viện dẫn thẳng bối cảnh "bị gọi đi giữa ca trực" của PRODUCT.md. Không có gì đọc như template.

**Quét máy móc**: `detect.mjs --json src/board/BoardGallery.tsx src/board/DanhSachBang.tsx` → exit 0, **0 phát hiện**. Console/network sạch cả lượt thao tác đầy đủ. Không tràn ngang 375px/1280px. Hai nút tròn nổi đúng 44×44px. Contrast đo trên trang thật (bản tối): placeholder 5,28:1, chip chủ động 8,02:1, chip bị động 5,60:1 — đạt AA/AAA.

**4 fix từ 2 lượt trước — cả 4 xác nhận còn hoạt động đúng**: fade-mask hàng chip (`mask-image` không phải `none`, xác nhận cả computed style lẫn ảnh chụp cuộn tới hai đầu), dòng "vẫn đang tải" (xác nhận trong source, không tái hiện được live vì máy dev tải quá nhanh — đúng như thiết kế), `.screen-transition` đã vào khối `prefers-reduced-motion`, trọng lượng chữ trạng thái rỗng-do-lọc đã nâng.

**Lớp phủ overlay**: chạy thật, dừng sạch. Ngoài các cờ chung chung độ tin cậy thấp của một UI tối màu Tailwind (`overused-font`, `ai-color-palette`, `bounce-easing`), có một cờ `dark-glow` — **đây gần như chắc chắn là dương tính giả**: box-shadow glow zero-offset quanh `--c-primary` chính là "Ethereal Glass", chữ ký bản tối được DESIGN.md đặt tên và mô tả rõ ràng ở mục Elevation & Depth, không phải trang trí thừa. Có 1 phát hiện `text-occlusion` (thẻ "Xét nghiệm ECG" bị menu "⋯" che 86%) — **đã kiểm tra lại và bác bỏ**: đọc `DanhSachBang.tsx:655-672`, menu này ghim ĐÁY màn hình trên di động theo chủ đích đã ghi chú (critique 2026-08-26, đưa vào tầm ngón cái) — che khuất một thẻ gần đó khi cuộn là hệ quả tất yếu của mọi mẫu bottom-sheet, không phải hồi quy. B tự gắn cờ độ tin cậy thấp cho chính phát hiện này vì phiên bị ô nhiễm chéo; agent cha xác nhận qua đọc source, không cần sửa.

## Overall Impression

Đây là lượt cải thiện rõ rệt nhất trong chuỗi 4 lần critique bề mặt này: 35/40, tăng từ 29/40, không còn phát hiện P0 nào, chỉ còn 1 P1. Cả hai assessment đều tự bắt được false lead của chính mình trước khi báo cáo (Assessment A phát hiện phím Enter tổng hợp của công cụ automation không chạm tới React, phải tự dispatch KeyboardEvent đúng cách; Assessment B phát hiện tab trình duyệt bị chia sẻ giữa hai phiên) — dấu hiệu tốt về độ cẩn trọng, không phải điểm yếu của sản phẩm.

Vấn đề còn lại đã chuyển hẳn từ "lỗi hiển thị/tương tác" sang "khoảng trống tiếp cận và mở rộng theo quy mô": một dòng trong drawer khôi phục chỉ phân biệt bằng màu (ẩn khỏi trình đọc màn hình), không có thao tác hàng loạt hay ghi nhớ bộ lọc cho người dùng nặng, và nhấn-giữ vẫn vô hình sau 3 lượt.

## What's Working

1. **Lưới an toàn bộ lọc là một hệ thống, không phải bản vá đơn lẻ** — áp dụng nhất quán ở 5 điểm callback riêng biệt (đổi tên/đổi khoa/thêm tag/xoá tag/khôi phục), đúng đặc điểm mà 2 lượt critique trước đã khen nhưng lượt này xác nhận nó vẫn toàn vẹn sau nhiều lần sửa khác.
2. **Chuỗi xoá an toàn cho ngắt quãng** — xoá mềm → toast hoàn tác 5s → drawer đầy đủ với chọn-hàng-loạt riêng, mỗi tầng tự dọn theo hẹn giờ riêng nếu bị bỏ dở giữa chừng — kiểm tay đầu-cuối trên trang thật, không chỉ đọc code.
3. **FLIP transition neo đúng vật lý** — đo `getBoundingClientRect()` của đúng thẻ vừa chạm, huy hiệu chuyên khoa "vẽ" tại đúng vị trí đó — xác nhận trực tiếp, không phải suy luận từ code.

## Priority Issues

### [P1] Dòng trong drawer "Đã xoá gần đây" chỉ phân biệt bằng màu — ẩn khỏi trình đọc màn hình, không có mốc thời gian

`DanhSachBang.tsx:1531-1537`: chấm màu ổn định theo id là dấu hiệu DUY NHẤT phân biệt hai bảng cùng tên mặc định "Bảng chưa đặt tên" trong drawer, nhưng mang `aria-hidden="true"`, và dòng không hiện mốc thời gian tương đối (khác thẻ chính trong lưới, vốn dùng `formatReadTime`). Người dùng đọc màn hình hoặc bất kỳ ai không phân biệt được màu sắc nghe/thấy hai dòng giống hệt nhau ("Chọn bảng Bảng chưa đặt tên" × 2, "Hoàn tác" × 2) — không cách nào biết bấm "Hoàn tác" nào khôi phục đúng bảng cần.

**Fix**: thêm mốc thời gian tương đối hiển thị (hoặc `sr-only`) vào mỗi dòng, hoặc gắn `aria-label` mô tả sự khác biệt màu bằng lời (vd "chuyên khoa Tim mạch").

**Suggested command**: `/impeccable harden src/board/DanhSachBang.tsx`

### [P2] Không có thao tác hàng loạt trên lưới bảng đang sống

Chỉ trong drawer "Đã xoá gần đây" mới có chọn-hàng-loạt (`TheBang`, dòng 654-753 dùng "⋯" từng thẻ một). Người dùng có hàng chục bảng tích luỹ qua nhiều năm (đúng kịch bản dài hạn thực tế của một công cụ kiến thức cá nhân, theo PRODUCT.md) không có cách gắn tag/đổi khoa hàng loạt.

**Suggested command**: `/impeccable shape src/board/DanhSachBang.tsx`

### [P2] Trạng thái lọc/tìm kiếm không lưu qua phiên

`DanhSachBang.tsx:918-925` (comment xác nhận chủ đích): `hienHetChip`, `chuyenKhoaLoc`, `truyVan` chỉ sống trong phiên xem lưới. Người luôn lọc về một chuyên khoa phải "Thêm +9" rồi chọn lại chip đó mỗi lần mở lại tab — đúng người dùng trung thành, nặng nhất bị đánh thuế lặp lại nhiều nhất.

**Suggested command**: `/impeccable optimize src/board/DanhSachBang.tsx`

### [P3] Bấm đúp "+" có thể mồ côi một bảng — đã xác minh trong code

`DanhSachBang.tsx:1172-1198` (`taoBangMoi`): hàm đồng bộ, không có cờ khoá/disable trên nút trong lúc chạy; `dangSuaTenId` chỉ giữ một id. Bấm đúp nhanh tạo hai bảng, `setDangSuaTenId` lần gọi thứ hai thắng — bảng đầu tiên vào lưới với tên mặc định, không có ô đổi tên tự mở, dễ bị bỏ sót lúc vội.

**Fix**: khoá nút trong lúc `taoBangMoi` chạy (hoặc debounce đơn giản).

**Suggested command**: `/impeccable harden src/board/DanhSachBang.tsx`

### [P3] Icon "quay lại" vẫn là bản chép tay, không phải import dùng chung

`BoardGallery.tsx:469-478` — không đổi từ các lượt trước, code tự nhận là chủ đích do icon gốc private. Rủi ro trôi khi App.tsx đổi icon, chấp nhận được như trade-off đã ghi lại.

**Suggested command**: (không cấp bách — chỉ ghi nhận)

## Persona Red Flags

**Sam (accessibility-dependent)**: dòng drawer khôi phục (P1) là điểm gãy cụ thể — phần còn lại của bề mặt (focus trap, Escape trả focus đúng nút kích hoạt, aria-label tĩnh) đã làm tốt và được kiểm tay xác nhận, nhưng đúng MỘT chỗ này ẩn hẳn tín hiệu phân biệt khỏi trình đọc màn hình.

**Alex (power user, nhiều bảng)**: không thao tác hàng loạt ngoài trash, không nhớ bộ lọc lần trước — hai P2 ở trên cộng dồn thành phí lặp lại thật cho đúng người dùng trung thành nhất.

**Riley (stress-tester)**: race bấm đúp "+" (P3) — không tái hiện được qua thao tác tự động (click quá nhanh bị công cụ automation giới hạn), nhưng suy luận từ code là xác định (`add()` đồng bộ + state single-id), không phải giả thuyết.

## Minor Observations

1. **Cờ `dark-glow` của detector — dương tính giả gần như chắc chắn**: đúng "Ethereal Glass", chữ ký bản tối được DESIGN.md đặt tên tường minh ở mục Elevation & Depth, không phải trang trí thừa.
2. **Phát hiện `text-occlusion` (thẻ "Xét nghiệm ECG" bị che 86%) — đã bác bỏ**: menu "⋯" ghim đáy màn hình trên di động theo chủ đích (critique 2026-08-26, tầm ngón cái) — che thẻ gần đó là hệ quả tất yếu của mọi bottom-sheet, không phải hồi quy. Bản thân Assessment B cũng tự gắn cờ độ tin cậy thấp vì phiên bị ô nhiễm chéo (một tab trình duyệt dùng chung giữa A và B).
3. Cả hai assessment tự bắt và loại bỏ false lead của chính mình trước khi báo cáo (phím Enter tổng hợp không chạm React; nhầm đích dispatch sự kiện Escape) — không tính là phát hiện, chỉ ghi nhận vì tăng độ tin cậy của phần còn lại của báo cáo.
4. Ánh sáng bản sáng được kiểm nhanh trực tiếp, không thấy vấn đề tương phản rõ rệt — chưa đo số cụ thể, chỉ là quan sát nhanh.

## Questions to Consider

- Dòng trong drawer khôi phục là điểm gãy tiếp cận DUY NHẤT tìm được ở lượt này — có đáng một dòng `aria-label` để đóng nốt heuristic #6 lên mức tối đa không?
- Thao tác hàng loạt và ghi nhớ bộ lọc đều nhắm cùng một persona (người dùng nặng, nhiều năm) — có nên gộp thành một lượt `/impeccable shape` duy nhất thay vì hai việc rời rạc?
- Nhấn-giữ không có gợi ý discovery đã bị nêu ba lượt liên tiếp mà chưa từng được ưu tiên sửa — đây có phải giới hạn chấp nhận được của bề mặt, hay một khoảng trống đang bị hoãn lại?
