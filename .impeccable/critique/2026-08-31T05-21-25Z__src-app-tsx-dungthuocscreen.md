---
target: DungThuocScreen
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-31T05-21-25Z
slug: src-app-tsx-dungthuocscreen
---
# Critique: DungThuocScreen ("Dùng thuốc")

Method: dual-agent (A: design-review subagent · B: detector+browser subagent)

## Design Health Score

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|-------|--------------|
| 1 | Visibility of System Status | 3 | Tiêu đề màn bị cắt cụt ("Kháng sinh t…") trên mọi tab ở 375px; CrCl sống, đồng hồ "cũ bao lâu", cầu nối phép tính xuất sắc |
| 2 | Match System / Real World | 4 | Từ vựng lâm sàng tiếng Việt chuẩn, viết tắt đường dùng đúng, bậc CrCl, khớp bệnh lý -> chỉ định |
| 3 | User Control & Freedom | 3 | Hoàn tác 20 giây có aria-live assertive; banner tắt được. Nút chủ đề không quay lại "Tự động", thứ tự tab không khoá được |
| 4 | Consistency & Standards | 3 | Token hoá tốt, ARIA tablist/roving đúng. Đỏ-nguy-hiểm dùng cho hành động hoàn tác được, hai banner một-lần trông y hệt, công tắc xanh trong thẻ cảnh báo hổ phách |
| 5 | Error Prevention | 3 | parseStrictNumber chặn "70abc", kiểm giá trị bất thường, cảnh báo làm-tròn-vượt. "Làm tròn lên" mặc định BẬT ở 1.43x cho aminoglycoside; creatinin gấp lại khiến dễ đọc thẻ liều khi CrCl chưa tính |
| 6 | Recognition Rather Than Recall | 3 | Bối cảnh bệnh nhân giữ nguyên và vọng vào mọi phép tính; nhảy A-Z; tìm xuyên tab. Tab tự sắp theo tần suất phá trí nhớ vị trí; khối Creatinin/CrCl phải nhớ "nằm trong đó" |
| 7 | Flexibility & Efficiency | 3 | Tab dính, MRU, tìm xuyên tab, nhảy chữ cái, lưu công thức khoa, phím mũi tên. Phải cuộn sâu tới máy tính ở mọi tab thuốc truyền; không có layout desktop |
| 8 | Aesthetic & Minimalist | 2 | Mật độ hợp lý theo lĩnh vực, nhưng lần đầu vào đầy banner (2 banner giống nhau + 1 modal), header chật tới mức tự cắt tiêu đề, RunningPanel luôn mở |
| 9 | Error Recovery | 3 | Cảnh báo cụ thể, hành động được. Output "-" không gợi ý tại chỗ; không có cờ inline khi creatinin bất thường lúc khối đang gấp |
| 10 | Help & Documentation | 3 | Nguồn dữ liệu ghi rõ, disclaimer, gợi ý một-lần đúng tầm. Gợi ý "Tìm" là đường duy nhất để biết có tìm xuyên tab, dễ bị bấm bỏ theo phản xạ |
| Tổng | | 30/40 | Good (khá) - nền vững, cần xử lý vùng yếu |

Applicable max: 40 (không heuristic nào n/a).

## Design Specificity Verdict

Được viết riêng cho sản phẩm này. Thẻ liều bậc theo CrCl, cầu nối vọng cân nặng, cảnh báo hệ số làm tròn ("thực nhận 750 mg, gấp 1.43 lần"), cờ nồng độ đường ngoại biên, đồng hồ "cũ bao lâu" ở bảng Đang truyền, khớp tìm theo tên bệnh lý, chế độ RRT (IHD/CRRT/SLED/PD), palette an toàn token-bảo-vệ, JetBrains Mono chỉ cho chữ số liều - không dashboard mẫu nào có. Điểm yếu bên dưới là vấn đề phân cấp/hoàn thiện trên nền rất đặc thù, không phải genericness.

Deterministic scan: detect.mjs trên src/App.tsx -> 1 phát hiện, dương tính giả (#000 tại L943 là alpha-stop của mask fade tiêu đề, cách màn ~10.200 dòng, self-marked advisory). Phát hiện tĩnh trong phạm vi: 0.

Visual overlays: overlay live chạy được; sau lọc FP xác nhận 2 vấn đề thật - (1) h1 dùng truncate, tràn hộp 68px / 23px ở 375px trên mọi tab; (2) không có max-width (xác minh screenMaxW: none) -> >=1024px chữ chạy 100-200 ký tự/dòng. Mọi text-occlusion (scrim modal, ảnh giữa fade-in/rise-in, sticky-header) và "low contrast" dark-mode (đo giữa view-transition) đều FP. layout-transition (max-height/margin-top) là nợ đã biết và cố ý theo DESIGN.md.

Console: không lỗi, không cảnh báo. Tương phản: mọi cặp chữ đạt WCAG AA, phần lớn AAA (tab chọn 8.02, chưa chọn 6.72, đỏ 7.24, hổ phách 10.08); thấp nhất placeholder ô Tìm 5.28. Dark mode viết độc lập thật.

## Overall Impression

Nền lâm sàng đặc thù và tư duy an toàn thật. Kéo điểm xuống là vùng "chrome" ồn trong khi vùng "chẩn đoán" vẫn bình tĩnh đúng thiết kế - header tự cắt tiêu đề, lần đầu vào xác nhận 3 lần, và ở thẻ liều con số bác sĩ thật sự hành động theo (liều thực nhận) không phải con số to nhất. Cơ hội lớn nhất: dọn header + đưa "liều thực nhận" thành số chính khi bật làm tròn.

## What's Working

1. Phát hiện làm tròn vượt kèm cách khắc phục - bắt đúng khoảng cách giữa liều tính được và liều rút ra, nói luôn hai cách đóng khoảng.
2. Cầu nối trí nhớ làm việc nhất quán - mọi kết quả mang input inline, cân nặng ghi rõ lấy từ đâu; parseStrictNumber từ chối "70abc".
3. Kỷ luật palette an toàn giữ vững trong vùng chẩn đoán - thẻ nguy hiểm phẳng, icon + chữ, không hoạt ảnh; liều "ổn" hiện bằng --c-text. Tương phản đạt AA/AAA cả hai theme.

## Priority Issues

### [P1] Tiêu đề màn bị cắt cụt trên viewport chính
"Kháng sinh theo CrCl" tràn 68px; "Thuốc vận mạch" tràn 23px ở 375px, trên mọi tab. Nguyên nhân: 3 control luôn hiện trong header (ThemeToggle inline + pill "Tìm" + pill "Nhật ký . N") ăn ~55-60% chiều ngang; truncate cắt chính nhãn định hướng.
Vì sao quan trọng: giữa lúc hồi sức, nhãn duy nhất cho biết đang dùng mô hình liều nào không đọc được.
Fix: thu "Nhật ký" thành icon (badge cho số), đưa ThemeToggle ra khỏi header này, hoặc cho tiêu đề 2 dòng dưới ~380px.
Suggested command: /impeccable shape

### [P1] Liều bệnh nhân thực nhận không phải con số nổi bật
Thẻ Amikacin: "7.5 mg/kg mỗi 24h" và "525 mg" là hai số mono lớn; liều thực nhận khi BẬT làm tròn (750 mg) chỉ nằm trong câu văn hổ phách. Con số điều dưỡng rút ra là con số ít thấy nhất.
Fix: khi làm tròn BẬT, render liều thực nhận thành số mono chính, liều tính được là phụ ("Thực nhận 750 mg . tính được 525 mg"). Đồng bộ vào mục ghim RunningPanel (hiện chỉ hiện "7.5 mg/kg mỗi 24h").
Suggested command: /impeccable clarify + /impeccable layout

### [P2] Chồng chrome lần đầu vào + ẩn mất ô nhập cốt lõi
Lần đầu: hàng 10 tab + banner showTabHint ghim + DisclaimerBar + DisclaimerGate bottom-sheet. Hai banner giống hệt nhau (fade-in, primarySoft, primaryLine, pill "Đã hiểu") -> đọc như phần tử lặp. Creatinin/CrCl - input màn xoay quanh - mặc định gấp sau disclosure.
Vì sao quan trọng: 3 thao tác xác nhận trước khi dùng lần đầu; người mới vội có thể đọc liều kháng sinh mà chưa tính CrCl.
Fix: gộp DisclaimerBar vào gate; biến gợi ý "Tìm" thành affordance nhỏ cạnh hàng tab; mặc định mở khối Creatinin/CrCl ở tab kháng sinh.
Suggested command: /impeccable distill + /impeccable onboard

### [P2] Đỏ-nguy-hiểm và xanh-thương-hiệu rò vào vùng chẩn đoán
"Xoá bệnh nhân" (chữ đỏ + viền đỏ) hiện thường trực trên đầu khung bệnh nhân; nút bỏ ghim RunningPanel là "x" đỏ trong vòng tròn đỏ. Cả hai hoàn tác được. DESIGN.md dành đỏ cho nguy hiểm lâm sàng - control đỏ luôn trên màn, cạnh tranh thẻ cảnh báo thuốc đỏ thật. Thêm: "Làm tròn lên: ĐANG BẬT" là thẻ --c-warn chứa công tắc iOS xanh thương hiệu - trộn tín hiệu mà Decoration/Diagnosis Split cấm.
Fix: style trung tính cho "Xoá bệnh nhân" và "x" bỏ ghim (chỉ hiện khi khung mở / sau overflow); nhấc công tắc làm tròn lên vùng chrome trung tính phía trên.
Suggested command: /impeccable colorize

### [P2] Không có giới hạn bề rộng trên tablet/desktop
Không max-width ở bất kỳ ancestor nào (xác minh). Ở >=1024px chữ liều/cảnh báo/lưu ý chạy 100-200 ký tự/dòng; hàng collapsible kéo sát mép, chevron kẹt bên phải. App mobile-first đúng mandate, nhưng render vô giới hạn trên máy bàn/tablet.
Fix: bọc max-width ~720-860px căn giữa cho vùng cuộn nội dung; không đổi gì ở mobile.
Suggested command: /impeccable adapt

## Persona Red Flags

Bác sĩ nội khoa đang hồi sức (persona dự án): cần noradrenaline mL/h trong <10 giây. Đường đi quá dài: tắt modal + banner -> tìm "Vận mạch" (có thể trôi vì MRU) -> cuộn qua khung bệnh nhân + RunningPanel -> chạm thuốc -> cuộn tới máy tính -> đặt nồng độ + liều. P1 "liều thực nhận bị chôn" càng tệ dưới adrenaline. Output "-" đọc như "app hỏng".

Casey (một tay, phân tâm, mobile): tiêu đề cắt cụt giết định hướng; phải một tay mở disclosure Creatinin; làm-tròn-BẬT mặc định với cảnh báo sửa lỗi nằm dưới màn ở 375px; nút "x" xoá ô Tìm chỉ 36px ngang (< 44); "x" bỏ ghim 44px ngay cạnh nút số-đường-truyền cùng cỡ -> dễ bỏ ghim nhầm giữa lúc chỉnh liều.

Sam (phụ thuộc trợ năng): phục vụ tốt phần lớn - roving tabindex, aria-selected, aria-posinset/setsize, aria-live assertive cho undo, inert cho gate, input 16px, focus ring 2px, mọi cặp chữ đạt AA, console sạch. Lỗi: khối Creatinin gấp -> screen-reader có thể đọc thẻ liều mà không biết CrCl chưa tính; aria-label nút chủ đề ghi "Tự động" nhưng chỉ đảo sáng-tối (nhãn sai); thẻ làm-tròn-vượt phải phân tích cả câu thay vì một token trạng thái.

## Minor Observations

- Không kiểm sạch được "vào-ra có biến đổi state toàn cục không" vì hai subagent song song chia sẻ localStorage cùng origin (A thấy giá trị nó không nhập). A xác nhận entry của chính nó giữ đúng qua điều hướng đi/về. Không phải lỗi thật - nhiễu môi trường test đa phiên; nên kiểm lại một mình.
- aria-label nút chủ đề ghi "Chủ đề: Tự động" nhưng chỉ đảo sáng-tối, không về hệ thống.
- Làm tròn mặc định 525 -> 750 mg (1.43x) cho aminoglycoside cửa sổ hẹp: cảnh báo tốt, nhưng mặc định nên TẮT (hoặc cần 1 chạm) khi hệ số > ~1.1x.
- RunningPanel luôn mở trên mọi tab - nên thu thành chip một dòng khi nhóm hiện tại không có thuốc đang chạy.
- Tab đang chọn không có chỉ báo khi người dùng tự tay cuộn hàng tab ra chỗ khác; thanh tiến trình 3px tương phản rất thấp.
- Placeholder ô nhập bệnh nhân dùng trắng alpha 0.5 - nên phân giải thành token đặc.
- Output "-" của máy tính nên hiện "Nhập nồng độ + liều" ngay trong ô kết quả.
- Chưa có surface brief riêng cho DungThuocScreen trong .impeccable/surfaces (chỉ có MindmapBoard).

## Questions to Consider

1. Nếu creatinin là input cả màn "Kháng sinh theo CrCl" dựng quanh nó, tại sao nó là trường duy nhất bị giấu sau disclosure?
2. Khi bật làm tròn, con số nào là "liều"? Điều dưỡng đọc thẻ qua vai bác sĩ có rút đúng lượng bác sĩ định không?
3. Tab tự sắp theo tần suất có đang đánh đổi 2 giây cuộn lấy lớp lỗi "mở nhầm nhóm" tốn kém hơn ở giường bệnh không?
4. RunningPanel toàn cục qua mọi nhóm - có đáng chiếm chỗ dọc thường trực trên tab bác sĩ đang làm phép tính không liên quan?
5. Đỏ đánh dấu cả "thuốc gây độc tai/độc thận" lẫn "xoá bệnh nhân". Dưới áp lực thời gian, có nên là cùng màu đỏ?
