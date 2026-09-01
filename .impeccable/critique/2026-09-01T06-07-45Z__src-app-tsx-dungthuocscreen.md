---
target: DungThuocScreen
total_score: 37
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-09-01T06-07-45Z
slug: src-app-tsx-dungthuocscreen
---
# Critique: DungThuocScreen

Method: dual-agent (A: design-review subagent · B: detector+browser subagent)

## Điểm sức khỏe thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|---|---|---|
| 1 | Visibility of System Status | 4 | CrCl tính lại tức thì với aria-live, đếm dần khi số đổi, mốc "Ghim 12:54 · vừa xong" tự già theo thời gian thực, thanh đếm ngược khi xoá/bỏ ghim. Không thấy khoảng trống. |
| 2 | Match System/Real World | 4 | Thuật ngữ lâm sàng đúng chuẩn tiếng Việt (CrCl, TTM, BTĐ, IBW/ABW…); thứ tự trường nhập theo đúng ưu tiên lâm sàng (cân nặng trước tuổi/creatinin — có comment giải thích lý do). |
| 3 | User Control & Freedom | 4 | Hoàn tác 20s khi reset bệnh nhân, hoàn tác 5s có thanh đếm khi bỏ ghim, công tắc làm tròn bật/tắt được, nút reset cố ý khó chạm hơn (chủ đích, có ghi trong code, không phải sơ suất). |
| 4 | Consistency & Standards | 4 | `ScreenHeader`, `SEVERITY_STYLE`, `CHIP`, `dose-press` dùng lại xuyên suốt; hằng số đếm-giờ dùng chung giữa PatientPanel và RunningPanel nên hai luồng xoá đều hành xử giống nhau. |
| 5 | Error Prevention | 4 | `parseStrictNumber`/`hasInvalidNumericInput` từ chối âm thầm quy đổi "70abc" thành 70; CrCl khoá cứng thành "—" thay vì hiện sai khi input phi lý. |
| 6 | Recognition Rather Than Recall | 3 | Tìm kiếm giữ trạng thái xuyên tab, tóm tắt bệnh nhân luôn hiện dạng thu gọn — nhưng nút "Tìm"/"Nhật ký" ở header chỉ có icon, `title` không hiện trên chạm (xem P3 dưới). |
| 7 | Flexibility & Efficiency | 4 | Điều hướng bàn phím roving-tabindex trên hàng tab và kết quả tìm, hàng tab tự sắp theo tần suất dùng thật (MRU), tìm xuyên tab, lưu "công thức khoa phòng". Hiếm thấy ở một công cụ ngách như vậy. |
| 8 | Aesthetic & Minimalist | 3 | `Disclosure` giảm mật độ thật (khối thận tự thu gọn ngoài tab kháng sinh) nhưng detector xác nhận vài điểm gợn: chữ 11px, padding 0px ở một dòng phụ (xem Assessment B) — domain vốn dày đặc nên khó đạt tối đa. |
| 9 | Error Recovery | 4 | Kiểm chứng trực tiếp: creatinin/tuổi nhập sai ký tự ra câu cụ thể ("...có ký tự không phải số — app coi như CHƯA NHẬP"); CrCl phân biệt rõ "thiếu input" và "bị từ chối vì phi lý" bằng hai câu khác nhau. |
| 10 | Help & Documentation | 3 | "Cách dùng · Ghi chú" và "Nguồn dữ liệu" theo từng thuốc, đúng ngữ cảnh — nhưng không có lớp trợ giúp tìm kiếm được; chấp nhận được vì đối tượng là bác sĩ dùng thành thạo, không phải người mới. |
| **Tổng** | | **37/40** | **Excellent — nền tảng rất vững, còn 2 lỗ hổng an toàn dữ liệu âm thầm cần vá** |

Applicable max: 40 (không heuristic nào n/a).

## Design Specificity Verdict

**Đánh giá LLM (Assessment A)**: Không phải giao diện dùng chung được. Thẻ liều hiện cả phép tính ("12 mg/kg × 70,0 kg = 840 mg"), làm tròn theo lọ thật ("Cho 1000 mg · đích 840 mg"), tốc độ bơm kèm luôn thời gian hết dịch ("50 mL ở 5.3 mL/giờ → hết sau 9 giờ 26 phút"), và danh sách thuốc đang chạy tự gắn cờ "đã cũ" ngay khi cân nặng bệnh nhân đổi. Lịch sử comment trong code (quanh `DungThuocScreen`/`PatientPanel`/`RunningPanel`) cho thấy đây là hệ thống đã bị "cãi tay đôi" qua nhiều lượt critique trước, không phải sinh một lần rồi để đó. Luật "Decoration/Diagnosis Split" và "Untouchable Signal" của DESIGN.md được xác nhận sống trên UI thật: số liều giữ màu trung tính, không nhuộm brand; dấu tích "Trong khoảng" của vận mạch màu xanh lá, không phải indigo.

**Deterministic scan (Assessment B)**: `detect.mjs` trên `src/App.tsx` + `ScreenHeader.tsx` → 1 phát hiện duy nhất, nằm ở dòng 943 trong `SpecialtyPicker` (màn khác hẳn) — ngoài phạm vi, và bản thân phát hiện đó nhiều khả năng là dương tính giả (`#000` là điểm dừng của một CSS mask, không phải màu hiển thị). Trong phạm vi DungThuocScreen/ScreenHeader: 0 phát hiện tĩnh.

**Overlay trực quan**: injection chạy được trong tab riêng của Assessment B (đã đóng và dừng live-server sau khi xong). Console báo 17 dòng phát hiện qua 7 luật: `tiny-text` (1), `layout-transition` (5, các khối Disclosure), `cramped-padding` (2), `undersized-ui-text` (5 — nhãn bottom-nav, thuộc chrome toàn app chứ không phải DungThuocScreen, ngoài phạm vi), `overused-font` (1, một font chủ đạo dùng nhất quán — nhiều khả năng không phải lỗi thật), `text-occlusion` (3). Assessment B đã tự đối chiếu ảnh chụp và kết luận cả 3 `text-occlusion` là dương tính giả (tiêu đề "Chọn thuốc" không hề bị che trong ảnh thật — `ScreenHeader` cố tình nằm ngoài vùng cuộn chính vì lý do đó; hai cặp pill "Noradrenaline"/"Vasopressin" trùng toạ độ nhiều khả năng là khung hình transition rise-in/fade-in bắt được giữa chừng). Còn lại `tiny-text`, `cramped-padding` (2 lần), `layout-transition` (5 lần, mức advisory) là thật và nằm trong cây render của DungThuocScreen.

## Ấn tượng chung

Đây là lượt critique có điểm cao nhất trong 5 lượt gần nhất (37, so với 30 và 29 hai lượt trước) — nhưng đừng đọc đó là "đã sửa xong nhảy vọt": mỗi lượt do một reviewer độc lập khác nhau chấm, và lượt này reviewer test tay sâu hơn, bắt được một lỗi thật mà các lượt trước có vẻ chưa thấy — race điều kiện đa tab âm thầm ghi đè cân nặng/creatinin bệnh nhân. Điểm mạnh nhất của màn hình là nó không giấu phép tính: mọi con số liều đều hiện luôn cách tính ra nó, đúng tinh thần một công cụ tra cứu tại giường chứ không phải hộp đen. Cơ hội lớn nhất nằm ở đúng chỗ nghịch lý nhất — hai lỗ hổng an toàn dữ liệu (CrCl bị cắt khi thu gọn, và dữ liệu bệnh nhân bị tab khác âm thầm ghi đè) đều **im lặng**, tức là đúng thứ một bác sĩ đang vội nhất sẽ không nhận ra kịp.

## Điểm mạnh

1. **Thẻ liều hiện cả phép tính, không chỉ đáp số** (`AntibioticDoseCard`: "12 mg/kg × 70,0 kg = 840 mg" → "Cho 1000 mg · đích 840 mg"). Bác sĩ tự soát lại phép tính trong nửa giây thay vì phải tin một hộp đen — đúng thiết kế cho một con số ảnh hưởng an toàn.
2. **Cơ chế phát hiện liều "đã cũ"** (`staleReason` trong `RunningPanel`) bám sát rủi ro lâm sàng thật: phân biệt thuốc liều rời và truyền liên tục trong câu chữ, và gắn cờ lại ngay khi cân nặng nền đổi. Một bài toán khó và giải đúng.
3. **Chuỗi làm tròn → pha thuốc** (lọ thật → mg thực nhận → hướng dẫn bơm → hạn dùng sau pha, gộp trong một thẻ) phản ánh đúng cách điều dưỡng chuẩn bị thuốc thật, không phải kiểu "máy tính liều" chung chung.

## Vấn đề ưu tiên

**[P1] Tóm tắt bệnh nhân thu gọn cắt mất CrCl trên màn hình điện thoại**
- Gì: `PatientPanel` nối chuỗi tóm tắt `["{kg}","{cm}","Nam/Nữ","{tuổi}","CrCl {n}", RRT].join(" · ")` qua một `truncate` duy nhất (App.tsx ~5574). Test tay ở 375px: đủ dữ liệu thì dòng hiện `70 kg · 165 cm · Nam · 6…` — tuổi bị cắt giữa số, CrCl mất hẳn.
- Vì sao quan trọng: CrCl là con số cả tab kháng sinh tồn tại để tính ra, và bị xếp cuối cùng trong chuỗi — tức là thứ đầu tiên bị cắt. Đúng lúc bác sĩ liếc nhanh dòng thu gọn một tay để hỏi "CrCl bệnh nhân này bao nhiêu" thì không thấy gì.
- Sửa: đổi thứ tự để CrCl đứng ngay sau cân nặng (sống sót lâu nhất khi bị cắt), hoặc tách CrCl thành badge riêng ngoài vùng `truncate` để không bao giờ bị cắt âm thầm.
- Lệnh gợi ý: `/impeccable layout`

**[P1] Mở nhiều tab cùng gốc âm thầm ghi đè sinh hiệu bệnh nhân đang dùng**
- Gì: Assessment A tái hiện được trực tiếp trong lượt này — đặt cân nặng=70/cao=165/tuổi=65 ở tab 1; sau khi thao tác ở tab 2 cùng gốc, tab 1 tự đổi thành cân nặng=65, chiều cao biến mất, không có cảnh báo nào. `usePatientVitals`/`useStickyState` ghi `localStorage` không có listener sự kiện `storage` để đối chiếu giữa các tab.
- Vì sao quan trọng: toàn bộ mô hình an toàn của công cụ này dựa trên "dữ liệu trên màn hình đúng là bệnh nhân đang điều trị". Hai tab cùng gốc (dễ xảy ra: một tab cũ còn mở cộng với PWA đã cài, hoặc mở nhầm tab thứ hai) có thể ghi đè cân nặng/creatinin của nhau mà không hề báo đây là **một ngữ cảnh khác** vừa ghi đè — banner "đã cũ" hiện có đọc y như một chỉnh sửa bình thường của chính người dùng.
- Sửa: tối thiểu là lắng nghe sự kiện `storage` và hiện banner riêng ("Dữ liệu bệnh nhân vừa đổi từ một tab khác") khác màu/mức với banner "cân nặng đã đổi" hiện tại.
- Lệnh gợi ý: `/impeccable harden`

**[P2] Hàng 10 tab nhóm thuốc vượt giới hạn ghi nhớ tức thời (≤4), MRU là giảm nhẹ chứ không giải quyết gốc**
- Gì: `MIXING_TABS`/`orderedTabs` xếp cả 10 chip trong một hàng `overflow-x-auto`; gradient mờ + progress bar (App.tsx ~11829–11836) là gợi ý tốt cho "còn nữa", nhưng vẫn là 10 lựa chọn cùng lúc — đúng điểm duy nhất fail trong checklist tải nhận thức 8 mục.
- Vì sao quan trọng: MRU cần vài phiên dùng mới hội tụ về thứ tự hữu ích, nên ca bệnh mới/đầu ca trực có thể khiến nhóm thuốc cần dùng nằm cách 6-7 lần vuốt ngang.
- Sửa: không cần đổi cấu trúc — thêm ghim/ưa thích thủ công cho 2-3 nhóm hay dùng theo tua trực (VD: ICU khác khoa nội), để ngày đầu không phải chờ thuật toán có dữ liệu.
- Lệnh gợi ý: `/impeccable layout`

**[P2] Detector xác nhận vài điểm gợn về chữ/khoảng cách trong cây DungThuocScreen**
- Gì: overlay của Assessment B bắt được `tiny-text` (một dòng phụ 11px, "Không thấy thuốc trong 10 nhóm?..."), `cramped-padding` (2 lần — một phần tử chữ 12px có padding dọc 0px, một div flex có nội dung sát mép không đệm), và `layout-transition` (5 lần, mức advisory — các khối Disclosure animate `max-height`/`margin-top`, đã biết là khoản nợ kỹ thuật cố ý theo DESIGN.md). Các phát hiện `text-occlusion` (3) và `undersized-ui-text` (5, thuộc bottom-nav chung toàn app) đã được B xác minh lần lượt là dương tính giả hoặc ngoài phạm vi — không tính vào đây.
- Vì sao quan trọng: nhỏ nhưng cộng dồn — một dòng 11px và padding 0px là đúng kiểu "cắt góc" âm thầm làm mật độ vốn đã cao của màn này thêm chật, dù không chặn được tác vụ.
- Sửa: nâng dòng phụ 11px lên tối thiểu 12-13px, thêm padding dọc tối thiểu cho phần tử đang 0px.
- Lệnh gợi ý: `/impeccable polish`

**[P3] Nút "Tìm"/"Nhật ký" ở header chỉ có icon, không có nhãn hiện**
- Gì: App.tsx ~11656–11701 — cả hai nút vùng chạm 44px chỉ có icon + `aria-label`/`title`, không có chữ hiển thị.
- Vì sao quan trọng: `title` không hiện khi chạm (thiết bị chính của app này), nên người dùng lần đầu (hoặc bác sĩ trực thay ca) thấy hai vòng tròn không nhãn cạnh nút đổi theme, không có cách xem trước chức năng ngoài việc bấm thử.
- Sửa: đây từng là đánh đổi có chủ đích (tránh lỗi `title` bị cắt chữ trước đó, theo comment trong code) — nên thêm coach-mark một lần thay vì quay lại nhãn chữ, để không làm sống lại lỗi cũ.
- Lệnh gợi ý: `/impeccable clarify`

## Cảnh báo theo persona

**Alex (bác sĩ trực đêm, dùng lặp lại, thành thạo)**
- Lỗi thật gặp trực tiếp: race đa tab (P1 thứ 2) đúng kiểu Alex hay dính — để sót một tab trình duyệt cũ từ trước khi cài PWA, rồi dùng PWA cho bệnh nhân mới. Alex không có cách nào biết tab cũ vừa "rò" cân nặng sai vào.
- Điểm cộng: thứ tự tab theo MRU và tìm xuyên tab là chiến thắng hiệu năng thật, đúng kiểu dùng lặp lại của Alex — persona này nhìn chung được phục vụ tốt.

**Sam (phụ thuộc hỗ trợ tiếp cận / ràng buộc một tay)**
- Lỗi thật gặp trực tiếp: lỗi cắt CrCl (P1 đầu) ảnh hưởng trực tiếp kiểu dùng ít-nỗ-lực-nhất của Sam — dòng tóm tắt thu gọn vốn sinh ra để lướt nhanh, và đó chính là chỗ mất CrCl âm thầm.
- Nút icon-only ở header (P3) là khoảng hở nhỏ nhưng thật với Sam: `aria-label` phủ được trình đọc màn hình, nhưng người nhìn kém quét bằng mắt (không dùng AT) thì không có gợi ý chữ nào.
- Điểm cộng: `aria-live="polite"/"assertive"` trên khối kết quả CrCl và toast xoá bệnh nhân cho thấy tư duy ARIA thật, không phải làm cho có.

**Riley (test biên, cố phá)**
- Xác nhận trực tiếp: race localStorage đa tab (P1) là đúng kiểu edge case Riley dò trong vài phút.
- Xác nhận qua code: `parseStrictNumber` từ chối đúng "70abc"/"1.2.9" thay vì âm thầm cắt thành số nhìn-có-vẻ-đúng-nhưng-sai — đúng thứ Riley thử đầu tiên, xử lý đúng.
- Chưa kiểm tay (hết thời gian): Assessment A chưa đẩy thử giá trị cực đoan thật (creatinin=20, cân nặng=400) để xác nhận trực quan tầng cảnh báo "phi lý" — đây là khoảng trống của lượt test này, không phải lỗi đã xác nhận của app.

## Quan sát phụ

- Ở độ rộng desktop/tablet, hàng tab vẫn phải cuộn ngang dù container `max-w-[860px]` còn đủ chỗ hiện hơn ~6 chip trước khi mờ dần — cơ hội nhỏ, không phải trọng tâm vì sản phẩm ưu tiên di động.
- Dấu tích xanh "Trong khoảng" của vận mạch và danh sách cảnh báo kháng sinh đúng như cam kết "Untouchable Signal Rule" của DESIGN.md — không nhuộm màu brand — đáng ghi nhận là điểm đã kiểm chứng, không chỉ là luật trên giấy.
- Cảnh báo tương hợp Y-site của `RunningPanel` tự hạ giọng khi ghim dưới 2 thuốc ("Ghim thêm thuốc để kiểm tương hợp" thay vì dấu tích xanh "chưa thấy xung đột") — phân biệt tinh tế và đúng giữa "đã kiểm, sạch" và "chưa có gì để kiểm".
- Assessment B ghi nhận trường Creatinin không sống sót qua một lần thu gọn/cuộn sớm ở lần thử đầu (cân nặng giữ, creatinin về rỗng) — chưa điều tra sâu, đáng xem lại độc lập ở `PatientPanel`.

## Câu hỏi gợi mở

- Nếu hai tab của cùng một PWA có thể âm thầm ghi đè cân nặng của nhau giữa ca trực, có nên coi "đây là bệnh nhân nào" là một định danh được lưu trạng thái nghiêm ngặt hơn — thay vì tin tab nào ghi sau cùng — mà vẫn giữ được ràng buộc ẩn danh/không định danh hiện có?
- Sắp xếp tab theo MRU là cá nhân hoá thật nhưng cần thời gian hội tụ — một câu hỏi một lần "tua trực này bạn hay dùng nhóm nào?" ở lần dùng đầu có thắng được việc chờ dữ liệu tích luỹ không?
- Với lỗi cắt CrCl, có nên coi "CrCl" là một trường được bảo vệ-không-bao-giờ-bị-cắt, giống cách hệ thống thiết kế đã bảo vệ một số màu an toàn — tức là mức độ quan trọng thông tin cũng nên có quy chế "bất khả xâm phạm" như màu?
