---
target: "DungThuocScreen (src/App.tsx:10763-11283)"
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
timestamp: 2026-08-19T04-43-52Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: general-purpose/sonnet · B: general-purpose/sonnet)

## Điểm sức khoẻ thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 3 | CrCl đếm chạy, cảnh báo lỗi thời, "Ghim 11:29 · 7 phút trước" đều tốt — nhưng một CrCl **sai** hiện y hệt một CrCl đúng, không có tín hiệu nào phân biệt |
| 2 | Match System / Real World | 4 | "BTĐ", "Rút lẻ ống", "Khóa chữ Y", ngôn ngữ bậc CrCl — đúng cách bác sĩ mục tiêu nghĩ và nói |
| 3 | User Control and Freedom | 3 | Hoàn tác 20s xoá bệnh nhân, hoàn tác 5s bỏ ghim có thanh đếm ngược — thiếu hoàn tác khi đổi đường truyền của một thuốc đang chạy (âm thầm, tức thời) |
| 4 | Consistency and Standards | 3 | `SEVERITY_STYLE` dùng chung thật giữa `InfusionCalculator`/`RunningPanel`/`MixResultCard` — nhưng số CrCl không tham gia cùng hệ màu mức độ nghiêm trọng đó |
| 5 | Error Prevention | 2 | Hạ từ 3 (Assessment A) xuống 2 trong tổng hợp — kiến trúc cổng kép + trần liều cho thuốc truyền xuất sắc, nhưng đường CrCl (quyết định BẬC liều kháng sinh) hoàn toàn không có cổng chặn dữ liệu phi lý dù các hàm kiểm tra đó (`checkWeight`/`checkHeight`/`checkAge`) đã tồn tại sẵn và dùng ở chỗ khác trên CÙNG khung — xem P0 |
| 6 | Recognition Rather Than Recall | 3 | Bối cảnh bệnh nhân lưu lại, tab/chip xếp theo tần suất dùng, công thức pha ghi nhớ theo khoa |
| 7 | Flexibility and Efficiency | 3 | Xếp theo tần suất dùng, trường máy tính "dính" sống sót qua gián đoạn, tìm xuyên tab, sao chép 1 chạm |
| 8 | Aesthetic and Minimalist Design | 3 | Disclosure ẩn/hiện đúng lúc; hàng chip kháng sinh mặc định (8) đặc hơn chính kỷ luật ≤4 mà bản thân màn này áp dụng ở tab truyền — các cảnh báo đệm/transition của detector đều xác minh là false positive khi đối chiếu mã (xem bên dưới) |
| 9 | Error Recovery | 3 | `missingReason` nêu đúng lý do kết quả trống + nút nhảy thẳng tới khung sửa; cùng lỗ hổng CrCl nghĩa là không có chẩn đoán nào khi bản thân con số đã âm thầm sai |
| 10 | Help and Documentation | 2 | "Chưa ghi nguồn" trung thực nhưng là trạng thái thật ngay ở thuốc truyền ĐẦU TIÊN mở ra; không có giải thích tại chỗ cho bậc CrCl hay thuật ngữ cho một bác sĩ trực thay ca không cùng nền tảng giả định với tác giả |
| **Tổng** | | **29/40** | **Tốt (Good), sát cận dưới — kéo xuống bởi một P0 mới xác minh** |

## Nhận định về tính đặc thù thiết kế

**Đánh giá của LLM (Assessment A)**: Rõ ràng không phải app CRUD khoác áo y khoa. Bằng chứng live-verified: Amikacin ở CrCl 0–10 tính đúng ra `3 mg/kg mỗi 72h (sau lọc máu)`, khác hẳn bậc >80 (`15–20 mg/kg mỗi 24h`) — một cỗ máy tính liều theo thận thật, không phải bảng tra tĩnh. Cảnh báo làm tròn dư liều đọc như dược sĩ thật ("Rút bớt dịch pha để bỏ phần dư..."), không phải thông báo từ thư viện validate. `checkInfusionDose` dùng HAI ngưỡng (`doseMax`/`doseAbsMax`) chính vì một lần trần liều đơn từng chặn nhầm liều noradrenaline sốc trơ hợp lệ — vết sẹo nghiệp vụ có thật, ghi lại trong bình luận mã. Ghim một liều noradrenaline 30 mcg/kg/phút (gấp 30 lần) đòi hỏi cổng kép thật (xem-rồi-xác nhận, RỒI một lần chạm thứ hai riêng để ghim), và nhật ký phân biệt rõ "chỉ xem" với "đã ghim" — kỹ thuật hướng-trách-nhiệm-pháp-lý đặc thù cho công cụ bàn giao ca thật.

**Quét tự động (Assessment B)**: `detect.mjs --json src/App.tsx` toàn file, thoát mã 2, **1 phát hiện duy nhất — nằm ngoài phạm vi màn này** (màu `#000` trong `mask-image` của `SpecialtyPicker`, một màn khác). Trong phạm vi DungThuocScreen: **0 phát hiện CLI tĩnh**.

Vòng tiêm script trên trình duyệt (3 trạng thái: mặc định, thẻ Amikacin mở+ghim, tab Vận mạch 2 thuốc ghim) bắt được nhiều advisory hơn — nhưng sau khi tôi (agent tổng hợp) đối chiếu trực tiếp với mã nguồn và DESIGN.md, **toàn bộ đều là false positive hoặc mẫu hình có chủ đích đã ghi chép**:
- 2× `layout-transition` trên `Disclosure` (`max-height`) — chính DESIGN.md ghi rõ đây là "a deliberate compatibility tradeoff, reconfirmed 2026-08" sau khi tái hiện lỗi kẹt UI thật với `grid-template-rows` trên Chromium hiện đại. Không phải lỗi.
- `cramped-padding` trên nút chọn đơn vị mg/dL·µmol/L của `PatientPanel` — tôi đọc mã: `className="px-3 h-full ..."`, căn giữa chữ bằng `h-full` (chiều cao cố định của khối cha) chứ không phải padding dọc — đúng mẫu hình `CHIP` đã xác nhận false positive ở lần chấm 2026-08-19 trước. `cramped-padding` trên nút "Thêm kháng sinh tự nhập" — tôi đọc mã: `h-11 ... flex items-center justify-center`, cùng mẫu hình hệt vậy (App.tsx:8827). Cả hai đều false positive theo cùng lý do; nhiều khả năng phát hiện thứ ba cùng loại (nút đơn vị `InfusionCategoryScreen`, do B báo) cũng vậy nhưng tôi chưa tự tay đọc mã đó — coi là khả năng cao, chưa chắc chắn tuyệt đối.
- `bounce-easing` trên "một đoạn văn cảnh báo in đậm" — tôi tự tay lần theo mã: easing đó khớp `.pop-value` (App.tsx:8264), nhưng phần tử ĐÓ tô màu `var(--c-primary)` (dòng "Cách dùng" tự tính, nằm trong nhánh `!autoUsage.insufficient`) — KHÔNG phải nhánh cảnh báo màu vàng thật (`autoUsage.insufficient`, App.tsx:8242-8249, tô `var(--c-warn-icon)`, không có animation nào). B đã gán nhầm phát hiện này cho "đoạn cảnh báo" trong khi thực ra nó nằm ở đoạn "tính lại" bình thường. Bản thân mã có bình luận giải thích rõ mục đích (App.tsx:8254-8261): báo "số lọ vừa đổi, đừng đọc nhầm số cũ" — đúng khớp với chính câu DESIGN.md dùng để định nghĩa motion hợp lệ ("did this number change"). **Kết luận: false positive, không vi phạm quy tắc "không nảy trên trạng thái cảnh báo".**
- `line-length` trên đoạn cảnh báo `AntibioticDoseCard` — đo ở viewport 1280px desktop cho một app ưu tiên di động; khả năng cao là nhiễu do bề rộng thử nghiệm, chưa kiểm ở 375px thật.
- `em-dash-overuse` — bộ dò hiệu chỉnh cho tật viết AI tiếng Anh; dấu gạch ngang trong văn bản y khoa tiếng Việt (và cả bình luận mã của chính file) là dấu câu bình thường — false positive theo ngôn ngữ.

Đo trực tiếp trên trình duyệt xác nhận: font số liều là JetBrains Mono ở CẢ thẻ thuốc LẪN bảng "Đang truyền" (bàn giao ca) — P1 của lần chấm 2026-08-19 (`sửa cờ đỏ persona`) đã vá thật, kiểm chứng lại bằng `getComputedStyle` trực tiếp, không chỉ đọc mã. Focus ring hiện rõ qua 4 lượt Tab liên tiếp bằng phím thật. Tương phản màu tab đang chọn 8.02:1 (vượt xa AA). Không có lỗi console, 50 request mạng đều 200 OK. Một tab co còn 35.2px cao lúc đo — điều tra ra là do Browser pane không compositing frame trong phiên sandbox này (animation đứng khung đầu), không phải lỗi sản phẩm thật — cả hai assessment độc lập đều loại trừ đúng hiện tượng này.

## Ấn tượng chung

Màn "Dùng thuốc" tiếp tục là bằng chứng mạnh nhất cho vị thế "không phải UpToDate thu nhỏ" của app: kiến trúc an toàn cho liều truyền tĩnh mạch (cổng kép, trần kép, nhật ký phân biệt xem-với-ghim) là mức độ kỹ lưỡng hiếm gặp. Nhưng đúng sự kỹ lưỡng đó lại phơi bày một khoảng trống ở nơi không ai ngờ: đường tính CrCl — thứ quyết định BẬC liều kháng sinh, một quyết định lâm sàng có sức nặng ngang liều truyền — hoàn toàn không được thừa hưởng bất kỳ cổng chặn dữ liệu phi lý nào, dù các hàm kiểm tra cần thiết đã có sẵn trong file và đang dùng ở ngay cạnh đó cho mục đích khác. Tuổi 200 (một lỗi gõ nhầm hoàn toàn có thật, không phải input ác ý) chảy thẳng vào công thức Cockcroft-Gault không có sàn chặn, ra CrCl âm, và màn hiển thị nó với đúng kiểu chữ trung tính như một số hợp lệ — rồi chọn bậc liều kháng sinh dựa trên con số sai đó, không một cảnh báo nào. Đây là lần đầu tiên qua nhiều lượt chấm liên tiếp (0 P0 trong 6 lần gần nhất) một P0 thật xuất hiện — không phải vì màn hình vừa hỏng, mà vì lần này việc dò lỗi chủ động thử nhập liệu phi lý (persona Riley) mới chạm đúng đường đi chưa từng bị bên nào kiểm trước đó.

## Điểm mạnh

1. **Cổng kép cho liều truyền nguy hiểm, live-verified end-to-end.** Chạm 1 lần vào trạng thái "cảnh báo", chạm lần 2 trong `CONFIRM_EXTREME_RESET_MS` (2500ms) mới thật sự ghi vào `localStorage['drtrong:running']` (App.tsx:10094-10128, `confirmGate.ts:10-24` — có file test riêng, hiếm trong codebase này). Đây là heuristic 5 làm đúng bằng cơ chế, không chỉ bằng lời cam kết.
2. **Trần liều hai bậc mã hoá một sự cố có thật.** `doseSafety.ts:42-100` phân biệt `doseMax` (mềm, vẫn hiện kết quả) và `doseAbsMax` (cứng, chặn khi `factor≥5`) — vì một trần đơn từng chặn nhầm liều noradrenaline sốc trơ hợp lệ. Ranh giới "cao nhưng có thật về lâm sàng" và "gần chắc chắn lệch dấu thập phân" là đúng phán đoán mà công cụ này cần mã hoá.
3. **Nhật ký phân biệt "đã xem" và "đã hành động".** Với cùng một liều 30 mcg/kg/phút, ba dòng nhật ký khác nhau ghi ba hành vi khác nhau (bấm xác nhận để xem / vẫn ghim vào bảng) — chi tiết pháp y quan trọng nếu công cụ từng phải dựng lại chuyện gì đã xảy ra sau một kết cục xấu.

## Vấn đề ưu tiên

**[P0] Đường tính CrCl không có cổng chặn dữ liệu phi lý — âm thầm chọn sai bậc liều kháng sinh**
- **Vì sao quan trọng**: `crclUsable` (App.tsx:5468) chỉ dựa vào `crclReliability(patient)` (`lib/patient.ts:182-186`, chỉ kiểm chế độ RRT và cờ AKI-không-ổn-định) — KHÔNG tham chiếu `checkWeight`/`checkHeight`/`checkAge` (`doseSafety.ts:184-211`) dù các hàm này đã tồn tại và đang dùng ngay trên cùng khung bệnh nhân cho mục đích khác. Live-reproduced: đặt tuổi 200 (chính app tự gắn cờ "Tuổi 200 bất thường — kiểm tra lại" ở nơi khác) chảy không giới hạn vào Cockcroft-Gault (`(140 - ageYears) * weightKg`, không sàn) ra **CrCl = -17**, hiện với đúng màu chữ trung tính của một số hợp lệ (App.tsx:5779: `color: crclUsable ? C.text : C.muted`, và `crclUsable` = true ở đây). Chọn Amikacin tại thời điểm đó rơi thẳng vào bậc "CrCl 0–10" — `3 mg/kg mỗi 72h (sau lọc máu)` — một khuyến nghị cụ thể, tự tin, và sai, không một tín hiệu nào phân biệt nó với một khuyến nghị đúng. Cân nặng 700kg (một lỗi gõ nhầm số 0 hoàn toàn có thể xảy ra) cũng tái hiện được vấn đề tương tự (CrCl 167). Mọi bề mặt tính liều KHÁC trên chính màn này (máy tính truyền) coi "input trông như lỗi gõ" là lý do hạ cấp/chặn kết quả — CrCl là đường duy nhất không theo kỷ luật đó, và lại là đường quyết định bậc liều kháng sinh, một trong hai loại quyết định liều nặng nhất màn hình.
- **Sửa**: gộp mức độ nghiêm trọng từ `checkWeight`/`checkHeight`/`checkAge` vào `crclUsable` (hoặc thêm case mới cho `crclReliability`), dùng lại `SEVERITY_STYLE` sẵn có cho chính số CrCl khi bất kỳ input đầu vào nào ở mức `implausible`, và chặn `estimateCrCl` trả về `null` (không phải số âm) khi `ageYears >= 140` hoặc tử số không dương.
- **Lệnh đề xuất**: `/impeccable harden`

**[P1] Hàng chip kháng sinh mặc định vượt kỷ luật ≤4 mà chính màn này áp dụng ở tab truyền**
- **Vì sao quan trọng**: Tab kháng sinh mặc định hiện 8 chip đồng thời (Amikacin…Ceftazidim) trước "Xem tất cả · 23", live-confirmed. Mọi tab nhóm thuốc truyền tôi kiểm (Vận mạch) giữ đúng 4. Với Jordan (người lần đầu, chưa biết 8 thuốc nào là "thường dùng"), đây là một lượt quét rộng hơn hẳn phần còn lại của màn hình từng đòi hỏi — và không nhất quán với chính mẫu hình tiết chế mà app tự đặt ra ở tab khác.
- **Sửa**: hoặc giới hạn hàng mặc định còn 4 (khớp tab truyền) và đưa "Xem tất cả" lên cao hơn, hoặc ghi rõ lý do kháng sinh được phép rộng hơn (vd vì có ô tìm ngay phía trên) để sự khác biệt đọc như một đánh đổi có chủ đích thay vì thiếu sót.
- **Lệnh đề xuất**: `/impeccable layout`

**[P2] "Đang dùng cho bệnh nhân" (trong từng tab) trùng lặp không rõ ràng với RunningPanel toàn cục**
- **Vì sao quan trọng**: Live-observed bên trong `AntibioticsScreen`: một khối "Đang dùng cho bệnh nhân · 1 / Amikacin / TTM" xuất hiện thêm, bên cạnh RunningPanel toàn cục ("Bệnh nhân đang dùng · N thuốc") cao hơn trên cùng luồng cuộn. Hai nhãn khác chữ cho nội dung có thể trùng nhau là một khoản thuế nhận thức cho Casey (một tay, dễ gián đoạn) khi phải tự suy ra đây là cùng danh sách, một tập con, hay thứ khác hẳn.
- **Sửa**: nếu khối trong tab có mục đích riêng thật (lọc theo đúng nhóm thuốc đang xem), ghi rõ phạm vi đó trong nhãn; nếu không, gộp về một RunningPanel toàn cục duy nhất.
- **Lệnh đề xuất**: `/impeccable clarify`

**[P3] Chữ nút CTA dùng chung cho hai hành động khác bản chất**
- **Vì sao quan trọng**: "Thêm vào danh sách đang dùng" là chữ nút giống hệt cho cả việc ghim một liều kháng sinh ngắt quãng lẫn một tốc độ truyền liên tục — trong khi chính RunningPanel đã phân biệt hai loại này bằng nhãn "ngắt quãng". Nhỏ, nhưng chữ nút có thể phản ánh đúng sự phân biệt mà hệ thống đã biết.
- **Lệnh đề xuất**: `/impeccable clarify`

## Cờ đỏ theo persona

**Riley (kiểm thử ép biên có chủ đích)**: Tìm ra lỗi CrCl âm chỉ với hai input lệch-thực-tế-nhưng-hoàn-toàn-khả-dĩ (tuổi 200 — không cần mẹo gì đặc biệt, chỉ là một số gõ lệch). Đồng thời tự vượt qua đúng cổng kép liều cực đoan ngay lần thử đầu không cần tài liệu — nghĩa là UI an toàn đó đủ tự giải thích ngay cả dưới phép thử đối kháng, một điểm mạnh song hành với điểm yếu CrCl.

**Casey (một tay, dễ gián đoạn, di động — đúng persona chính app tự khai)**: Khung bệnh nhân tự gấp lại khi chọn thuốc (`collapsePatientPanel`, App.tsx:10993) và trường máy tính "dính" theo từng thuốc sống sót qua gián đoạn — đúng thứ persona này cần, không mất gì khi bị cắt ngang. Điểm cấn duy nhất: nút "Xoá bệnh nhân" đặt gần đầu khung thay vì trong tầm ngón cái — có chủ đích (đã xác nhận qua bình luận mã, đây là hành động phá huỷ nặng nhất màn hình) nên là đánh đổi hợp lý, không phải lỗi, nhưng đáng ghi lại vì nó đi ngược nguyên tắc công thái học một-tay thuần tuý.

**Sam (phụ thuộc trợ năng)**: Kết quả tìm kiếm dùng `aria-posinset`/`aria-setsize` + điều hướng ArrowUp/ArrowDown tự viết (App.tsx:11109-11118) — hỗ trợ bàn phím trên trung bình. `DisclaimerGate` xếp lớp `role="dialog"` + `aria-modal` + `useDialogFocus` + `inert` trên nền — bình luận mã cho thấy đây là lịch sử kiểm thử trợ năng thật, không phải checklist qua loa. Không kiểm được bằng trình đọc màn hình thật trong phiên này (không có AT trong công cụ trình duyệt) — độ tin cậy dựa trên đọc mã, chưa live-verified.

## Quan sát nhỏ

- `DisclaimerBar` ("Công cụ tham khảo — luôn kiểm tra lại trước khi thực hiện") không thể đóng, đúng vị thế trách nhiệm pháp lý của công cụ.
- Dòng "hết sau 2 phút" ở tốc độ truyền cực đoan (1575 mL/h) là chi tiết thực dụng không hiển nhiên — không phải thứ đi tìm mới thấy, nó tự xuất hiện vì phép tính đúng làm nó liên quan.
- Vasoactive "Nguồn dữ liệu — chưa ghi nguồn" (Noradrenaline) là công khai trung thực về khoảng trống — nhưng đáng lưu ý đây không phải trường hợp giả định, mà là thuốc truyền ĐẦU TIÊN mở ra trong phiên kiểm này đã gặp ngay.
- Một số liều nằm trong văn xuôi ("thực nhận **500 mg**" trong câu cảnh báo) dùng Plus Jakarta Sans thay vì Mono — đây là một lần NHẮC ĐẾN trong câu, không phải một ô hiện số độc lập, nên nhiều khả năng đúng chủ đích; ghi lại để chủ dự án xác nhận, không tính là lỗi.
- Ba phát hiện `cramped-padding` của detector, sau khi tôi đối chiếu mã trực tiếp cho 2/3 trường hợp, đều false positive theo cùng lý do (căn giữa bằng `h-11`/`h-full`, không phải padding) — một mẫu hình lặp lại của chính bộ dò này với kiến trúc nút/chip của app, không phải ba lỗi độc lập mới.

## Câu hỏi gợi mở

1. Nếu cổng chặn liều tuyệt đối cho thuốc truyền là một nguyên tắc, tại sao đường CrCl — quyết định bậc liều kháng sinh, sức nặng lâm sàng tương đương — lại chưa được thừa hưởng cùng nguyên tắc đó? Có lý do nghiệp vụ nào khiến CrCl được coi là ít rủi ro hơn không, hay đây thuần tuý là khoảng trống chưa ai chạm tới?
2. Hàng chip kháng sinh 8-item và tab truyền 4-item đang sống cạnh nhau với hai mức kỷ luật khác nhau trên cùng một màn — nếu viết lý do ra thành bình luận mã (như hầu hết quyết định có chủ đích khác trong file này đã làm), lý do đó có đứng vững không?
