---
target: DungThuocScreen
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-31T10-27-45Z
slug: src-app-tsx-dungthuocscreen
---
# Critique: DungThuocScreen — lượt sau khi vá (2026-08-31)

Method: dual-agent (A: design-review subagent · B: detector+browser subagent)

## Design Health Score

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|-------|--------------|
| 1 | Visibility of System Status | 3 | Ghim không xác nhận + cuộn danh sách rời mục vừa ghim; CrCl/tốc độ tính lại tức thì. Dòng "Thực nhận X · tính được Y" là điểm cộng khi render. |
| 2 | Match System / Real World | 3 | Số máy tính "." vs văn tiếng Việt "," (1.43x / 33.3 ml/h vs NaCl 0,9%); ml/mL lẫn trong một chuỗi. |
| 3 | User Control & Freedom | 4 | Hoàn tác xoá bệnh nhân; công tắc làm tròn toàn cục + theo thẻ; chạm-hai; bỏ ghim. Mạnh. |
| 4 | Consistency & Standards | 2 | "liều tính được" gọi tên HAI số khác nhau cách nhau một câu (525 rồi 500); dấu thập phân + viết hoa đơn vị không nhất quán. Lượt này cải thiện màu control lúc nghỉ nhưng tạo ra va chạm nhãn. |
| 5 | Error Prevention | 3 | Chặn cân nặng vô lý, pill (giả định), cảnh báo AKI/xoá kèm. Placeholder mời gõ nhầm cân nặng-tuổi; ghim được khi chưa có bệnh nhân. |
| 6 | Recognition Rather Than Recall | 3 | Dòng tóm tắt bệnh nhân + pill bậc tốt. Hàng 10 tab tự sắp lại giữa các lần vào; bộ chọn đơn vị 6 + RRT 6. |
| 7 | Flexibility & Efficiency | 3 | Deep-link, MRU, nồng độ điền sẵn, nhớ chiều làm tròn theo thuốc. MRU chống lại trí nhớ cơ. |
| 8 | Aesthetic & Minimalist | 2 | Lần đầu chồng 3 dải tắt-được + 1 modal; khung bệnh nhân rỗng phơi ~13 control; hộp suy diễn 525 to hơn câu trả lời thật. max-w-860px giúp desktop. |
| 9 | Error Recovery | 3 | Câu hổ phách nêu nguyên nhân + chỗ sửa; "công thức không đủ" nói rõ thiếu bao nhiêu. Câu giải thích overshoot 43% là chữ nhỏ nhất trong khối (12px/400). |
| 10 | Help & Documentation | 3 | Nguồn + ngày rà soát mỗi thẻ; lý do inline; DisclaimerGate. Đủ cho bác sĩ. |
| Tổng | | 29/40 | Acceptable — nền rất đặc thù, vướng nhất quán + một lỗi phân cấp |

Applicable max: 40 (không heuristic nào n/a).

## Design Specificity Verdict

Rất đặc thù cho sản phẩm này — gần đỉnh thang. Thẻ kháng sinh bậc theo CrCl với Cockcroft-Gault sống; control chọn chiều làm tròn theo thuốc mang lý lẽ lâm sàng; pill CrCl >80 (giả định); khối tốc độ nói cả đặt bơm bao nhiêu và bệnh nhân thực nhận bao nhiêu + giờ hết dịch; weightImplausible từ chối in liều gam. Điểm yếu là hoàn thiện/nhất quán + một lỗi phân cấp, không phải genericness.

Deterministic scan: detect.mjs trên src/App.tsx + ScreenHeader.tsx -> 1 phát hiện, ngoài phạm vi, dương tính giả (#000 tại L943 — alpha-stop của mask). Phát hiện tĩnh trong phạm vi: 0. ScreenHeader.tsx sạch.

Visual overlays: overlay live chạy được. Sau lọc: text-occlusion x24 khi DisclaimerGate mở là giả; undersized-ui-text x5 là nhãn BottomNav 10px (ngoài phạm vi); cramped-padding trên nút h-11 là giả; line-length x6-7 chỉ desktop và detector ước lượng cao (~128 vs đo thật ~80). layout-transition là nợ đã biết & cố ý.

Đo được (B): 10/10 tiêu đề tab hiện đủ — 7 một dòng, 3 dài xuống 2 dòng, không cắt cụt. max-w-860px căn giữa 1280/1920. Câu hổ phách và ô công tắc trung tính là hai block anh em, nền khác nhau, công tắc KHONG nằm trong ô hổ phách (xác nhận cả hai trạng thái). Mọi cặp chữ đạt WCAG AA (thấp nhất 5,91 chữ đỏ bản sáng). "Xoá bệnh nhân" nghỉ trung tính (8,24) armed đỏ (8,26); "x" bỏ ghim trung tính (6,72). Console sạch.

## Overall Impression

Lượt vá là cải thiện an toàn thực — mặc định về liều trong khoảng thay vì âm thầm in 1000 mg, màu control lúc nghỉ bình tĩnh hơn, tiêu đề đọc được. Nhưng để lại thẻ nói "liều tính được" hai lần với hai giá trị, và mục P1 cũ ("liều thực nhận không nổi bật") mới vá một nửa: dòng "Thực nhận" có rồi nhưng hộp 525 vẫn to nhất + màu thương hiệu — và ở trạng thái overshoot mặc định con số 500 chỉ ở trong câu hổ phách. Cơ hội lớn nhất: dứt điểm phân cấp con số ở thẻ liều.

## What's Working

1. Khối kết quả tốc độ truyền — làm tròn bước bơm hiện rõ + tính ngược lượng thực nhận (Đặt bơm 33.3 mL/giờ -> thực nhận 1.00 mg/phút) + giờ hết dịch + kiểm "trong khoảng".
2. Suy giảm trung thực khắp nơi — CrCl >80 (giả định); "Chưa có CrCl — đang hiện liều bậc THẬN BÌNH THƯỜNG" kèm chỗ sửa; "Công thức đã lưu chỉ có X — KHONG đủ".
3. Xử lý hành động phá huỷ — "Xoá bệnh nhân" trung tính lúc nghỉ -> armed đỏ nêu rõ mất kèm gì (+ 1 thuốc?) -> Hoàn tác. Đọc đúng Untouchable Signal Rule.

## Priority Issues

### [P1] "liều tính được" gọi tên hai số khác nhau trên cùng một thẻ
Văn bản thật, một khối: "…gấp 1.43 lần liều tính được. Đang hiển thị LIỀU TÍNH ĐƯỢC — 500 mg…" — số đầu 525 (7.5x70), số sau 500 (làm tròn xuống). A và B đều bắt được. HỒI QUY từ lượt vá này (copy của RoundingControl).
Vì sao quan trọng: liều aminoglycoside không tha thứ; "liều tính được" mơ hồ làm hỏng niềm tin vào mọi con số trên thẻ.
Fix: dành riêng "liều tính được / tính được Y mg" cho đích dược lý (525); trong RoundingControl gọi giá trị đang hiển thị là "liều theo mức làm tròn xuống" / "liều rút thực tế", không bao giờ "liều tính được".
Suggested command: /impeccable clarify

### [P2] Con số to nhất vẫn là 525 và mang màu thương hiệu — không phải liều thực nhận
Hộp 7.5 mg/kg x 70.0 kg = 525 mg render toàn bộ bằng --c-accent-deep (indigo thương hiệu), chữ số tô đậm — figure to nhất, nhiều màu nhất — trong khi liều bệnh nhân nhận (500) nằm im bằng --c-text. DESIGN.md Decoration/Diagnosis Split: kết quả tính đọc bằng --c-text, không --c-primary. Ở trạng thái overshoot mặc định (chưa opt-in), dòng "Thực nhận X" chỉ render khi excess > 1.001, mà làm-tròn-xuống excess ~ 1 -> con số 500 không xuất hiện thành số trong khối "Cách dùng".
Fix: hộp suy diễn -> --c-text/--c-text-2; dồn trọng lượng thị giác đang dành cho 525 sang dòng "Thực nhận X"; hiện dòng "Thực nhận" cả ở trạng thái làm-tròn-xuống khi khác đích.
Suggested command: /impeccable colorize + /impeccable layout

### [P2] Vùng chạm dưới 44px xuất hiện từ lượt sửa này
B đo: "Tắt làm tròn lên cho mọi thuốc" 171x17px (mới, mình thêm); 3 nút biểu tượng header 36x44 (mình đổi từ pill ~75px xuống ô 36px); công tắc làm tròn 52x32 (có sẵn, chép lại).
Fix: đệm nút "Tắt làm tròn…" lên >=44px cao; nới nút header lên w-11 (44px, giữ icon 20px); cân nhắc nới công tắc lên h-11.
Suggested command: /impeccable adapt

### [P2] Chrome lần đầu vẫn chôn nội dung lâm sàng
3 dải tắt-được + 1 modal: pill gợi ý "Không thấy thuốc… Đã hiểu" (primary full-strength), DisclaimerBar, Gate. Khung bệnh nhân rỗng phơi ~13 control.
Fix: nhét gợi ý "không thấy -> bấm Tìm" vào chữ phụ ô Tìm; dứt điểm trùng lặp DisclaimerBar/Gate (mục đang treo chờ quyết).
Suggested command: /impeccable distill + /impeccable onboard

### [P3] Số không địa phương hoá + disclosure CrCl mở toàn cục
Số máy tính "." (1.43x, 33.3 mL/giờ, 5.00 mg/mL); chuỗi tự biên "," (NaCl 0,9%); ml/mL lẫn trong một chuỗi kết quả. VA disclosure Creatinin/CrCl mở-sẵn-ở-tab-kháng-sinh nhưng không đóng khi sang tab thuốc truyền — B xác nhận aria-expanded=true trên tab Co bóp (fix chưa trọn: mở đúng, chưa đóng đúng).
Fix: một formatter, dấu phẩy thập phân, mL chuẩn; audit formatVialUsage/formatFixedUsage/output tốc độ. Scope open-state disclosure CrCl theo nhóm dùng-CrCl.
Suggested command: /impeccable clarify (số) + /impeccable adapt (disclosure)

## Persona Red Flags

Casey (một tay, mobile): hàng 10 tab MRU tự sắp lại giữa các lần vào — tab dưới ngón cái xê dịch. Thẻ overshoot cần đọc 3 con số + có thể một công tắc, một tay. Ghim không xác nhận và cuộn danh sách đi.

Sam (phụ thuộc trợ năng): thứ tự đọc và nhấn mạnh thị giác mâu thuẫn — người đọc theo DOM gặp 500 trước, "con số chính" thị giác là 525 (chỉ do cỡ + màu). Nút chủ đề không đọc trạng thái kế. Hàng chip đơn vị 6 + RRT 6 nhiều tab stop; "Độ thanh thải thận"/"Phương thức lọc máu" là tiêu đề thị giác cần nhóm lập trình.

Bác sĩ nội khoa đang hồi sức: muốn một con số ngay; nhận calc vs delivered vs would-be-round-up + một quyết định. Con số to nhất (525) không phải con số đưa cho điều dưỡng. Hard-code "trong khoảng khuyến cáo" cho liều aminoglycoside thiếu ~5% là trấn an đáng ngờ.

## Minor Observations

- Placeholder cân nặng VD: 65, tuổi VD: 70 ở hai ô cạnh nhau — mời gõ nhầm (A gõ nhầm 2 lần). Dùng "VD: 70 kg" / "VD: 65 tuổi" hoặc độ lớn khác hẳn.
- Ghim không toast; xoá có toast hoàn tác — phản hồi bất đối xứng.
- Deep-link luôn mở ở Kháng sinh bất kể tab dùng gần nhất.
- line-clamp-2 giữ chỗ 52px trên màn opted-in kể cả tiêu đề ngắn ở desktop — kiểm không có dải chết.
- Ghim được khi chưa có bệnh nhân (CrCl >80 giả định); rồi vẫn "cũ" ở 4h.
- "Trong khoảng" xanh dùng đúng tín hiệu green, phẳng không hoạt ảnh, giữ nguyên.

## Questions to Consider

1. Nếu 500 (hoặc 750) là cái đến với bệnh nhân, tại sao 525 là con số to nhất, nhiều màu nhất? Có gì hỏng nếu thẻ mở đầu bằng "Cho: 500 mg" và hạ "7.5 x 70 = 525" xuống dòng suy diễn xám?
2. "Trong khoảng khuyến cáo" có an toàn để hard-code cho liều làm-tròn-xuống khi bậc không định nghĩa khoảng? Bậc liều-điểm không đạt đúng có nên nói "thiếu 25 mg so với đích"?
3. Công tắc làm-tròn-theo-thẻ thêm một quyết định lúc áp lực đỉnh. Trình bày cả hai như lựa chọn ngang nhau (500 an toàn thấp hơn đích / 750 đủ đích dư 43%) theo khuôn "Giữ nồng độ / Giữ thể tích" đã có, có hơn không?
4. Với hàng 10 tab tại giường, sắp theo tần suất có thật sự hơn một thứ tự lâm sàng cố định người dùng học một lần?
5. Đã có ai quan sát người dùng đọc DisclaimerGate hay chỉ săn nút? DisclaimerBar có gộp vào đó được không?
