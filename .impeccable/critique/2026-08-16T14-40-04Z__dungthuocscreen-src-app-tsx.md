---
target: DungThuocScreen (src/App.tsx)
total_score: 32
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-16T14-40-04Z
slug: dungthuocscreen-src-app-tsx
---
# Critique thiết kế — DungThuocScreen (Màn "Dùng thuốc")

> **Đính chính sau khi tự kiểm chứng trực tiếp (2026-08-16, sau khi viết báo cáo này):** phát hiện "[P1] Tiêu đề màn hình h1 vẫn tràn khung 22-27px" dưới đây là **false positive của máy dò**, không phải bug thật. Đo trực tiếp trong trình duyệt (`h1.scrollWidth - h1.clientWidth`) cho thấy con số "tràn" mà máy dò báo chính là hiệu số tự nhiên giữa độ rộng chữ CHƯA cắt và khung ĐÃ cắt của `text-overflow: ellipsis` — luôn dương với bất kỳ tiêu đề nào dài hơn khung, kể cả khi ellipsis hoạt động đúng. Kiểm tra với tiêu đề dài nhất trong dữ liệu ("Thuốc dùng thường trực khác", delta đo được 109px) cho thấy khung `h1` vẫn dừng cách đúng 12px trước cụm nút "Tìm"/"Nhật ký" ở mọi độ dài tiêu đề — không có chữ nào đè lên nút. Quy tắc `text-overflow` của máy dò (`detect-antipatterns-browser.js`) chỉ loại trừ vùng có `overflow: auto/scroll`, không loại trừ trường hợp `overflow: hidden` + `text-overflow: ellipsis` — đây là lỗ hổng trong chính máy dò, không phải trong `ScreenHeader`. Giữ nguyên phần "Vấn đề ưu tiên" bên dưới làm hồ sơ gốc; chỉ mục P1 này không cần sửa.

Phương pháp: dual-agent (A: `af6c759362322278a` · B: `a556db1cb08c30724`)

## Điểm sức khoẻ thiết kế

| # | Tiêu chí (Nielsen) | Điểm | Vấn đề chính |
|---|-----------|-------|-----------|
| 1 | Hiện trạng hệ thống rõ ràng | 3 | Phản hồi trực tiếp tốt (CrCl đếm lên có aria-live, số thuốc đang dùng nảy lên khi đổi), nhưng con số liều — thứ quan trọng nhất trên màn — không có kiểu chữ tách biệt khỏi văn bản cảnh báo xung quanh. |
| 2 | Khớp ngôn ngữ/thực tế người dùng | 4 | Từ vựng lâm sàng tiếng Việt chuẩn xác (CrCl, TTM/TMC, ARC, Qeff, AUC/MIC); viết tắt đường dùng được ánh xạ rõ qua `shortRoute`/`adminRouteLabel`. |
| 3 | Quyền kiểm soát & tự do | 3 | Toast hoàn tác 10 giây cho hành động phá huỷ nhất (xoá bệnh nhân); xác nhận 2 bước cho xoá. Khung hoàn tác hơi ngắn cho bác sĩ hay bị gián đoạn. |
| 4 | Nhất quán & chuẩn mực | 4 | File token trung tâm (`T`/`R`/`C`/`CHIP` trong `src/lib/ui.ts`) dựng ra chính để dẹp "7 cỡ chữ, 5 bo góc" từng có; `Disclosure`/`ConfirmIconButton` dùng lại xuyên suốt. |
| 5 | Ngăn lỗi | 4 | `parseStrictNumber` từ chối "70abc" thay vì cắt ngầm; `checkWeight`/`checkHeight`/`checkAge` chặn giá trị phi lý trước khi vào phép tính liều. |
| 6 | Nhận diện thay vì nhớ | 3 | Trạng thái dính (sticky) qua mọi bước chọn và tab; bối cảnh bệnh nhân hiện diện mọi nơi. Trừ điểm vì hàng 10 tab viết tắt đòi hỏi biết trước để điều hướng không cần đọc từng nhãn. |
| 7 | Linh hoạt & hiệu quả | 3 | Tự chọn khi chỉ còn 1 kết quả, tìm xuyên tab, công thức khoa lưu sẵn, 6 đơn vị liều đổi qua lại. Không có phím tắt hay hành động hàng loạt, nhưng đây là khoảng trống nhỏ cho mặt màn này. |
| 8 | Thẩm mỹ tối giản | 2 | `AntibioticDoseCard` xếp tới 10+ khối luôn hiện (chip đường dùng, chip bệnh, cảnh báo cân nặng, khung RRT, khung AKI, khung thiếu CrCl, dòng liều, khung liều/kg, khung dùng tự động, dòng liều chuẩn, cảnh báo cao) trước khi tới `Disclosure` đầu tiên. Từng khối có lý do an toàn riêng; gộp lại thành một bức tường. |
| 9 | Phục hồi sau lỗi | 4 | Thông điệp cụ thể, hành động được, ví dụ: "Công thức đã lưu chỉ có X mg — KHÔNG đủ cho liều cần Y mg. Sửa số... rồi lưu lại." Không bao giờ chỉ nói "dữ liệu không hợp lệ" chung chung. |
| 10 | Trợ giúp & tài liệu | 2 | Không có trợ giúp tại chỗ cho viết tắt chuyên môn (ARC, AdjBW, Qeff, mã RRT) dù PRODUCT.md nêu rõ "sinh viên y khoa" là đối tượng dùng. |
| **Tổng** | | **32/40** | **Tốt (Good)** |

## Kết luận về độ đặc thù thiết kế

**Đánh giá LLM (Assessment A):** Màn này rõ ràng được xây riêng cho tính liều lâm sàng, không phải một form chung khoác từ vựng y khoa. Bằng chứng xuyên suốt: ngưỡng an toàn liều hai bậc (liều-thường-dùng cảnh báo không chặn vs liều-tối-đa chặn phải xác nhận, `doseSafety.ts:50-137`), nhánh ARC (tăng thải creatinine), liều RRT/CRRT ghi đè và tắt hẳn logic bậc CrCl, chặn tính mg/kg khi cân nặng phi lý thay vì cứ tính ra một số sai, kiểm tra tương kỵ Y-site xuyên danh sách thuốc đang chạy, và phát hiện dữ liệu cũ (chưa xác nhận lại chức năng thận từ đầu ca, cân nặng đổi sau khi đã ghim thuốc). Không có màn CRUD chung nào tích luỹ được từng đó logic chuyên môn một cách tình cờ. Cái giá của sự đặc thù đó là mật độ thật — hầu hết phát hiện của lượt review này nằm ở đó.

**Máy dò tĩnh (Assessment B):** Quét CLI toàn bộ `App.tsx` chỉ ra đúng MỘT phát hiện (`design-system-color` tại dòng 979, màu `#000` chưa khai báo) — nhưng dòng 979 nằm NGOÀI phạm vi DungThuocScreen, không liên quan. Bên trong tổ hợp DungThuocScreen (AntibioticsScreen, AntibioticDoseCard, InfusionCategoryScreen, InfusionCalculator...), máy quét theo mẫu tĩnh không bắt được gì.

**Bằng chứng trình duyệt (Assessment B):** Tiêm trực tiếp vào 3 trạng thái sống (danh sách kháng sinh trước khi chọn, thẻ liều Amikacin mở kèm cảnh báo, bảng pha Dobutamine mở) ra 14-23 anti-pattern mỗi lượt. Đáng chú ý nhất và được B xác nhận KHÔNG phải false positive: **tiêu đề `h1` của `ScreenHeader` tràn khỏi khung 22-27px** ở cả 2 trạng thái đo được — cùng một lỗi đã ghi nhận ở lượt critique trước (2026-08-15), nghĩa là chưa được sửa. Các phát hiện khác (`clipped-overflow-container` trên khung chính, `undersized-ui-text` trên nhãn nav dưới) là khung sườn chung của cả app, không đặc thù cho DungThuocScreen — B tự đánh giá đây nhiều khả năng là false positive/ngoài phạm vi. `layout-transition` trên `max-height`/`margin-top` của `Disclosure` khớp với xác nhận của A rằng đây là lựa chọn có chủ ý (component này từng được dựng lại chính vì bug kẹt UI trên Chromium hiện đại) — không phải lỗi thật. `cramped-padding` (2-4 lần/lượt) và `line-length` (7 dòng dài 95-205 ký tự ở trạng thái thẻ liều mở) củng cố thêm cho phát hiện "bức tường chữ" của A ở AntibioticDoseCard.

## Ấn tượng tổng quan

Đây vẫn là một công cụ lâm sàng có suy nghĩ kỹ, an toàn thật đằng sau — không phải "làm cho đẹp" mà là domain logic thật (ngưỡng liều hai bậc, chặn cân nặng phi lý, phát hiện dữ liệu cũ). Cơ hội lớn nhất không đổi so với lượt trước: những quy tắc chính màn tự đặt ra (font mono cho số liều, progressive disclosure là công cụ chính quản lý mật độ) vẫn CHƯA được áp dụng nhất quán ở đúng chỗ quan trọng nhất — số liều kháng sinh thật, và tiêu đề màn hình vẫn tràn khung y hệt lượt trước.

## Điểm mạnh

1. **Ngưỡng liều hai bậc mã hoá một sự cố thật** (`doseSafety.ts:50-137`) — `checkInfusionDose` cảnh báo không chặn ở liều-thường-dùng, chỉ chặn-phải-xác nhận ở liều-tối-đa, trực tiếp phản ánh một sự cố đã ghi lại (noradrenaline 2 mcg/kg/phút từng bị chặn cứng sai) — lý do được giữ lại trong comment.
2. **`Disclosure` được dựng lại vì bug thật** (`App.tsx:5069-5169`) — cơ chế `max-height` được viết lại sau khi tái hiện lỗi kẹt UI trên Chromium hiện đại (không chỉ Safari cũ), và phần đóng dùng thêm `visibility:hidden` để giữ nội dung ẩn khỏi focus bàn phím/trình đọc màn hình.
3. **Luồng chọn thuốc tuần tự có lý** (`AntibioticsScreen`, `App.tsx:8329-8470`) — Chọn kháng sinh → Chỉ định → Đường dùng, có vạch chia theo chữ cái, tự chọn khi còn 1 kết quả, "Đang dùng cho bệnh nhân" ghim lên đầu — giải pháp hợp lý cho dữ liệu vốn dày (22+ kháng sinh, nhiều thuốc nhiều đường dùng/chỉ định).

## Vấn đề ưu tiên

**[P1] Số liều kháng sinh không dùng font mono mà DESIGN.md dành riêng cho việc này.**
Vì sao quan trọng: `NUM_DOSE` (JetBrains Mono, `src/lib/ui.ts:45-51`) được DESIGN.md gọi là "lựa chọn an toàn lâm sàng, không phải thẩm mỹ" — nhưng toàn file chỉ dùng nó ở 2 chỗ: hiển thị CrCl (`App.tsx:5640`) và kết quả tốc độ bơm truyền dịch (`App.tsx:9603, 9619`). `AntibioticDoseCard` không hề dùng: không ở `tier.dose` (dòng 7968), không ở số mg/kg tính ra (dòng 7994-7996), không ở chữ liều dùng tự động `autoUsage.text` (dòng 8039) — chính là con số mà điều dưỡng sẽ rút vào bơm tiêm.
Cách sửa: áp `NUM_DOSE` cho phần số của `tier.dose`, kết quả `computePerKgText`, và số liều/lọ/mL trong `autoUsage.text`.
Lệnh gợi ý: `/impeccable harden`

**[P1] Tiêu đề màn hình `h1` vẫn tràn khung 22-27px — chưa sửa từ lượt critique trước.**
Vì sao quan trọng: Máy dò xác nhận trực tiếp trên 2/3 trạng thái sống, với 2 mức tràn khác nhau (22px và 27px) — không phải false positive theo đánh giá của chính B. Đây là lỗi đã bị gắn cờ P1 trong critique 2026-08-15 và vẫn còn nguyên; tên thuốc/nhóm dài trong thực tế sẽ kích hoạt lỗi này, có thể đè lên nút hành động trên header.
Cách sửa: rà lại CSS truncate của `h1` trong `ScreenHeader` — khả năng cao thiếu `min-width: 0` trên một tổ tiên flex.
Lệnh gợi ý: `/impeccable layout`

**[P2] `AntibioticDoseCard` xếp bức tường 10+ khối luôn hiện, trái nguyên tắc progressive disclosure DESIGN.md tự đặt ra.**
Vì sao quan trọng: DESIGN.md gọi progressive disclosure là "công cụ chính quản lý mật độ", nhưng công cụ đó chỉ dành cho nội dung phụ (bolus, nguồn, cảnh báo khác) trong khi đường trả lời chính lại là một bức tường khối trước `Disclosure` đầu tiên. Máy dò củng cố bằng số liệu: `cramped-padding` (2-4 lần/lượt) và `line-length` — 7 dòng dài 95-205 ký tự khi thẻ liều mở, đúng các khối cảnh báo/liều dài dòng này.
Cách sửa: ghim một "dải trả lời" gọn (tên thuốc + đúng 1 dòng liều/cách dùng đã tính, kiểu chữ lớn/đậm nhất trên thẻ) lên đầu; gộp các khối giải thích (ghi chú cơ sở cân nặng, nhắc lại liều chuẩn) vào một `Disclosure` "Điều kiện đặc biệt" — chỉ giữ mở các trạng thái thật sự đỏ/chặn (RRT không áp dụng, xác nhận liều cực đại).
Lệnh gợi ý: `/impeccable distill`

**[P2] Không có trợ giúp tại chỗ cho viết tắt chuyên môn, dù PRODUCT.md nêu rõ đối tượng gồm sinh viên y khoa.**
Vì sao quan trọng: ARC, AdjBW, IBW, Qeff, mã RRT xuất hiện không một lần giải thích inline nào trong cả cây màn hình — tiêu chí 10 (Trợ giúp & tài liệu) thất bại đúng ở đối tượng phụ mà sản phẩm tự nhận đang phục vụ.
Cách sửa: thêm cơ chế chạm-để-xem-định-nghĩa ở lần đầu gặp mỗi viết tắt trong phiên, hoặc một bảng chú giải cố định truy cập từ hàng hành động của `ScreenHeader`.
Lệnh gợi ý: `/impeccable onboard`

**[P3] Khung hoàn tác 10 giây cho "Xoá bệnh nhân" hơi ngắn cho bối cảnh hay bị gián đoạn mà chính PRODUCT.md mô tả.**
Vì sao quan trọng: `resetUndoTimer` (`App.tsx:10289-10430`) cho đúng 10 giây trước khi toast biến mất và hành động thành vĩnh viễn. PRODUCT.md tự mô tả bối cảnh dùng là "trực cấp cứu... nhiều khi một tay trên điện thoại" — bác sĩ giữa ca bị cuộc gọi hay báo động kéo đi là đúng kịch bản 10 giây không đủ.
Cách sửa: kéo dài khung toast, hoặc thêm lối "Khôi phục bệnh nhân gần nhất" trong sổ Nhật ký cho khoảng thời gian dài hơn sau khi toast đã tắt.
Lệnh gợi ý: `/impeccable harden`

## Cờ đỏ theo persona

**Jordan (sinh viên y khoa, lần đầu):**
- Gặp `DisclaimerGate` — khối 2 đoạn văn bản pháp lý cứng, không định dạng gì thêm (`App.tsx:5303-5339`) — trước khi chạm vào bất cứ thứ gì; đúng là cần có, nhưng không hề gợi ý trước những gì sắp tới hay vì sao app tổ chức như vậy.
- Mở bất kỳ kháng sinh nào sẽ thấy ngay "Chưa có CrCl — đang hiện liều bậc THẬN BÌNH THƯỜNG" cộng bức tường cảnh báo trước khi tới câu trả lời thật — không giải thích inline "bậc" hay CrCl là gì cho người chưa nội tâm hoá khái niệm.
- Không tìm được định nghĩa inline nào cho ARC, AdjBW, hay Qeff ở bất cứ thẻ nào dùng chúng.

**Riley (kiểm tra căng thẳng):**
- Gõ "70kg" thay vì "70" vào ô cân nặng bị coi âm thầm là "CHƯA NHẬP" theo `parseStrictNumber` (`App.tsx:598-603`) — đúng triết lý không bao giờ cắt ngầm của app, nhưng sẽ vấp người gõ nhanh dưới áp lực có thói quen gõ kèm đơn vị.
- Bấm đúp nhanh "Lưu công thức mới" có thể sinh id công thức trùng — chính comment trong code (`App.tsx:10469-10474`) đã thừa nhận điều này ("có thể trùng khi double-tap... đè mất công thức lưu trước").
- Đổi chế độ RRT khi thẻ đang mở có thể để khung cảnh báo RRT và khung thiếu CrCl cùng hiện, cùng tông màu bão hoà tương tự — dưới áp lực thời gian thật, các cảnh báo xếp chồng cùng tông dễ khiến người đọc lướt qua một trong hai.

## Ghi chú nhỏ

- `slate-*` của Tailwind được ánh xạ lại có chủ ý qua `@theme` (`index.css:359-369`) để tự đổi theo theme sáng/tối — kỹ thuật hay, nhưng chưa ghi trong DESIGN.md, nên ai sau này audit "màu cứng" bằng cách grep `slate-` sẽ báo sai.
- Kiểm tra sống: Noradrenaline — một trong những thuốc vận mạch dùng nhiều nhất toàn app — hiện đang hiện "Nguồn dữ liệu — chưa ghi nguồn". Hệ thống tín hiệu tin cậy hoạt động đúng như thiết kế; chỉ là đang lộ ra một khoảng trống nội dung thật trên một thuốc mức độ quan trọng cao.
- `SEVERITY_STYLE` (`doseSafety.ts:148-164`) cố tình gộp 6 mức độ nghiêm trọng thành 3 tông màu — comment riêng giải thích "trên/dưới" đọc giống hệt nhau trong phòng tối — cần biết đây là đơn giản hoá có chủ ý, không phải sơ sót.
- `ThemeToggle` (`App.tsx:10197-10226`) là nút icon-only 36px xoay Auto→Sáng→Tối không có nhãn trạng thái hiện, chỉ dựa vào `aria-label`/`title` — không hiện khi chạm trên di động.
- `undersized-ui-text` (10px) trên nhãn nav dưới ("Trang chủ", "Thư viện"...) bị máy dò gắn cờ ở cả 3 lượt — nhưng đây là khung app chung, không đặc thù DungThuocScreen, và lượt trước đã xác nhận đây là chủ ý (DESIGN.md, bù bằng độ tương phản). Không cần sửa lại lần này.

## Câu hỏi đáng suy ngẫm

1. Nếu NUM_DOSE tồn tại vì chữ số dễ đọc nhầm trong phòng tối, vì sao lý lẽ đó áp dụng cho tốc độ bơm truyền dịch nhưng không áp dụng cho số lọ/mL/mg kháng sinh mà điều dưỡng sắp rút vào bơm tiêm — đây là quyết định chấp nhận rủi ro có chủ đích, hay chỉ là thiếu đồng bộ tính năng chưa ai để ý?
2. DESIGN.md bảo vệ mật độ của AntibioticDoseCard bằng lý lẽ "layout thoáng sẽ chống lại đúng việc màn này phải làm lúc 2 giờ sáng" — điều đó đã được kiểm chứng bằng thời gian tìm-thấy-con-số-cần của một người nửa tỉnh nửa mê thật chưa, hay vẫn chỉ là một giả định đứng thay cho phép đo?
3. PRODUCT.md nêu "sinh viên y khoa" là đối tượng ngang hàng với bác sĩ điều trị, nhưng không chỗ nào trên màn này dạy một thuật ngữ lạ ngay tại chỗ — đối tượng sinh viên y khoa có thực sự được phục vụ hôm nay, hay đó là một tuyên bố định vị mà giao diện chưa bắt kịp?
