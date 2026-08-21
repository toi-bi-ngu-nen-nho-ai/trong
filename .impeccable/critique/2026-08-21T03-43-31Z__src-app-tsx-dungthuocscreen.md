---
target: DungThuocScreen (src/App.tsx)
total_score: 36
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
timestamp: 2026-08-21T03-43-31Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: general-purpose/sonnet · B: general-purpose/sonnet)

## Điểm sức khoẻ thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 4 | `aria-live` trên dải CrCl, thanh đếm ngược drain-bar cho mọi hành động xác nhận, toast "Đã ghi vào nhật ký kèm cảnh báo" tự bắn khi ghim liều cực đoan — cả ba xác minh THẬT bằng DOM |
| 2 | Match System / Real World | 4 | Thuật ngữ lâm sàng tiếng Việt xuyên suốt, gọi tên rõ công thức Cockcroft-Gault, ngôn ngữ đóng gói khớp tồn kho khoa phòng (chai/lọ/ống) |
| 3 | User Control and Freedom | 4 | Undo 20s khi xoá bệnh nhân, undo 5s khi xoá thuốc truyền đang chạy, "Thu gọn" để đóng lại danh sách đã mở — cả ba xác minh THẬT hoạt động đúng |
| 4 | Consistency and Standards | 4 | `SEVERITY_STYLE` dùng chung giữa AntibioticDoseCard/InfusionCalculator/RunningPanel — xác minh THẬT: liều cực đoan đã ghim hiện cùng một màu đỏ nguy hiểm ở cả hai nơi |
| 5 | Error Prevention | 3 | **[P0] mới**: `resolveDosingWeight` âm thầm rơi về cân nặng thực khi thiếu chiều cao cho thuốc tính theo cân nặng lý tưởng/hiệu chỉnh — không cảnh báo gì, xác minh THẬT bằng ca LAST |
| 6 | Recognition Rather Than Recall | 3 | **[P1] mới**: banner CrCl ở PatientPanel lẫn "đã tính nhưng nghi ngờ" với "không tính được gì cả" — xác minh THẬT ở tuổi=200 |
| 7 | Flexibility and Efficiency | 4 | Tìm thuốc xuyên suốt mọi tab kèm điều hướng phím mũi tên (xác minh THẬT), sắp tab theo MRU, công thức pha riêng theo khoa phòng |
| 8 | Aesthetic and Minimalist Design | 3 | Mật độ cao có chủ đích, quản lý tốt bằng `Disclosure`; riêng hàng chip "Độ thanh thải thận" (RRT) có 6 lựa chọn — vượt ngưỡng ≤4 mục/quyết định |
| 9 | Error Recovery | 4 | Mọi trạng thái "không tính được" nêu đúng trường đang thiếu/bị từ chối và có link mở thẳng PatientPanel — xác minh THẬT |
| 10 | Help and Documentation | 3 | Trích dẫn nguồn riêng từng thuốc tốt (không bịa "đã kiểm chứng"); nhưng không có gì giải thích hệ bậc CrCl cho người dùng mới tiếp cận màn này |
| **Tổng** | | **36/40** | **Tốt (Good)** — tăng từ 34/40 lượt trước (2026-08-19T14:41) |

## Nhận định về tính đặc thù thiết kế

**Đánh giá LLM (A)**: Rõ ràng được may đo riêng cho sản phẩm này, không phải khung dosing-calculator chung chung. Bằng chứng cụ thể: cách tách `crclDataRejected` khỏi `missingCrcl` (hai nguyên nhân khác nhau của cùng một giá trị null), cửa sổ hoàn tác 20 giây khi xoá bệnh nhân được giải thích ngay trong bình luận mã là để chống "một cuộc gọi/báo động làm gián đoạn giữa chừng", hệ sắp tab MRU đứng yên 15 phút để chịu được một lượt ghé Mindmap 5 giây rồi quay lại, giới hạn MAX_ENTRIES=200 cho nhật ký tính liều được đóng khung là "vài ca trực" chứ không phải "mãi mãi", và trích dẫn nguồn theo từng thuốc ("kinh nghiệm lâm sàng tự biên soạn") thay vì bịa ra một thẩm quyền giả. Không khung mẫu nào tạo ra mật độ logic phòng thủ đặc thù theo lĩnh vực này.

**Quét tự động (B)**: `detect.mjs --json` trên toàn `App.tsx` → chỉ 1 phát hiện, và nó **ngoài phạm vi** DungThuocScreen (dòng 938, màu `#000` trong `mask-image` của một màn khác — không liên quan). Trong đúng phạm vi màn này (dòng ~10836-11366): **0 phát hiện**, giữ nguyên kỷ lục sạch nhiều lượt liền. Vòng tiêm script trên 3 view thật (tab Kháng sinh, danh sách Vận mạch, Vận mạch/Noradrenaline mở Disclosure) → 11-15 anti-pattern/view, phần lớn là các false positive đã xác nhận nhiều lượt trước (`clipped-overflow-container` ×3, `layout-transition` ×3-4, `undersized-ui-text` ×5 nhãn nav 10px) — B tự đo lại bằng DOM thật thay vì tin báo cáo cũ: `h-11` = đúng 44px trên hai nút khác nhau, độ tương phản nhãn nav 10px vẫn đạt 5.08:1 (qua ngưỡng AA dù bị gắn cờ "chữ quá nhỏ" về kích thước). Hai phát hiện **mới**, chưa từng thấy: `overused-font` (Plus Jakarta Sans chiếm 98% văn bản) — nhiều khả năng false positive vì DESIGN.md đặt "một font thân bài duy nhất" thành lựa chọn có chủ đích, không phải giới hạn kỹ thuật cần sửa; `em-dash-overuse` (8 dấu gạch ngang trong văn bản Disclosure mở ra) — B xác minh đúng số đếm bằng regex thật, nhưng đọc như văn phong hướng dẫn lâm sàng bình thường (cảnh báo nối tiếp), không phải lỗi ngẫu nhiên. Một biến thể `cramped-padding` **mới**, khác với false positive `h-11` cũ đã biết — 0px padding dọc trên các nút chip/hàng thuốc, và riêng nút "Adrenaline · vận mạch" đo được `display: block` thay vì `flex` — chưa đủ bằng chứng để khẳng định chữ lệch tâm thật trong hộp 44px, cần ảnh chụp thật để xác nhận trước khi coi là lỗi.

**Overlay trực quan**: Không tiêm được overlay hiển thị trực tiếp cho người dùng xem trong tab — Browser pane phiên này không compositing khung hình thật (`document.hidden = true` suốt phiên B; A dùng DOM/JS trực tiếp nên vẫn đọc được state thật nhưng cũng không chụp được ảnh). Bằng chứng console/DOM có thật (liệt kê ở trên), nhưng không có ảnh chụp màn hình để đối chiếu trực quan lần này.

**Điểm mâu thuẫn giữa A và B, không giấu**: A xác minh focus-visible bằng phím Tab thật thành công nhiều lần trên nhiều control khác nhau (viền 2px hiện đúng, nhất quán). B thử cùng việc này và `document.activeElement` không rời khỏi `<body>` dù `computer:key Tab` báo "đã nhấn" — kết luận không kiểm được. Cùng môi trường, khác kết quả trong cùng một lượt chạy. Tin theo A vì A lặp lại xác minh nhất quán trên nhiều control; nhiều khả năng đây là dấu hiệu công cụ đo không ổn định giữa hai tab/phiên trình duyệt khác nhau, không phải bug ứng dụng — nhưng ghi nhận công khai thay vì chọn kết quả có lợi hơn.

## Ấn tượng chung

Ba việc vá từ lượt trước (P0 dấu âm CrCl, P1 Disclosure lồng nhau, P2/P3 banner+touch-target) đều đứng vững khi kiểm chứng độc lập lần này — không có hồi quy. Nhưng đúng như câu hỏi gợi mở ở lượt trước đã cảnh báo, cùng MỘT lớp lỗi ("một giá trị null/rejected mang hai nghĩa, chỉ một nơi tiêu thụ được cập nhật") vừa tái xuất hiện ở một vị trí khác (P1 dưới đây) — và một lớp lỗi mới, nghiêm trọng hơn, vừa lộ ra ở đúng khu vực trước giờ chưa ai soi: hàm tính cân nặng dùng để tính liều tự âm thầm đổi cơ sở tính mà không báo, đúng loại "con số tự tin nhưng sai" mà toàn bộ phần còn lại của màn hình này được thiết kế để ngăn chặn.

## Điểm mạnh

1. **Cổng xác nhận liều cực đoan hoạt động đúng như thiết kế, xác minh bằng một kịch bản thật đầu-cuối** — nhập 5 mcg/kg/phút Noradrenaline (ngưỡng 3), hệ thống chặn kết quả, buộc xác nhận "Tôi đã kiểm tra lại", rồi buộc chạm lần hai để ghim, và mục đã ghim còn sống sót qua một lần tải lại trang, hiện đúng màu đỏ nguy hiểm ở RunningPanel.
2. **Bản vá tách CrCl-bị-từ-chối khỏi CrCl-chưa-nhập ở AntibioticDoseCard thật sự đứng vững** — xác minh lại ở tuổi=200: đúng thông điệp "Không tính được CrCl — số liệu bất thường" hiện ra, không lẫn với "chưa nhập gì".
3. **Trạng thái sống sót qua stress-test thật**: chuyển nhanh qua 6 tab, tải lại toàn trang giữa phiên — sinh hiệu bệnh nhân, tab đang chọn, thuốc đang chọn, bảng thuốc đã ghim đều giữ nguyên, không hỏng dữ liệu.
4. **Viền focus của ô tìm kiếm dạng viên thuốc được cố ý dời ra khung bọc ngoài** (`:focus-within`) để tránh viền vuông cấn trên góc bo tròn — nhìn qua tưởng là lỗi, đọc mã và xác minh Tab thật mới thấy đây là quyết định thiết kế đúng.

## Vấn đề ưu tiên

**[P0] `resolveDosingWeight` âm thầm rơi về cân nặng thực (ABW) khi thiếu chiều cao — không cảnh báo gì (xác minh THẬT trực tiếp)**
- **Vì sao quan trọng**: `src/lib/bodyWeight.ts:40-64` — khi `basis` là `"ideal"`/`"adjusted"` nhưng `heightCm` là null (không tính được IBW), hàm rơi thẳng về `abw` với `usedLabel: "ABW"`, không có tín hiệu nào báo yêu cầu đã không được đáp ứng. Xác minh trực tiếp: nhập cân nặng 70kg, KHÔNG nhập chiều cao, chọn "Nhũ dịch lipid 20% (ngộ độc thuốc tê — LAST)" (`doseWeightBasis: "ideal"`) → bolus trả về "105 mL" (= 1.5 mL/kg × 70kg cân nặng THỰC), trong khi ghi chú thuốc và ghi chú bolus đều khẳng định không điều kiện "tính theo cân nặng LÝ TƯỞNG" — một khẳng định sai cho chính phép tính vừa hiển thị. Cùng lỗ hổng tồn tại với Gentamicin (`doseWeightBasis: "adjusted"`) qua cùng một đường mã, và mang tính cấu trúc: `AntibioticDoseCard`, `BolusList`, `InfusionCalculator` đều gọi `resolveDosingWeight` theo cùng cách, và cả ba chỉ hiện chú thích `usedLabel` khi nó KHÔNG phải "ABW" — nghĩa là một lần rơi-về-ABW-âm-thầm không thể phân biệt được trên giao diện với một thuốc thật sự tính theo cân nặng thực. Lưới an toàn hiện có (cảnh báo khi `dosingWeight.used == null`) chỉ bắt được ca thiếu cân nặng hoàn toàn — không bắt được ca có cân nặng nhưng thiếu chiều cao, đúng ca đang âm thầm sai. Trong một kịch bản hồi sức hiếm gặp và áp lực cao (LAST) nơi bác sĩ hoàn toàn có thể nhập cân nặng mà quên chiều cao, một bệnh nhân béo phì có ABW lệch đáng kể so với IBW sẽ nhận một liều nhũ dịch lipid khác về bản chất so với con số app khẳng định, mà không một dấu hiệu nào trên màn hình báo có gì đã bị thay thế.
- **Sửa**: khi `basis !== "actual"` và `ibw == null` (thiếu chiều cao) nhưng `abw != null`, hiện cùng loại cảnh báo hiện đang dùng cho ca `dosingWeight.used == null` ("cần chiều cao để tính đúng cân nặng lý tưởng/hiệu chỉnh — hiện đang dùng cân nặng thực"), thay vì chỉ cảnh báo khi cân nặng hoàn toàn vắng mặt.
- **Lệnh đề xuất**: `/impeccable harden`

**[P1] Banner CrCl ở PatientPanel lẫn "đã tính nhưng nghi ngờ" với "không tính được gì cả" (xác minh THẬT, tuổi=200)**
- **Vì sao quan trọng**: `App.tsx:5758-5766` — cờ `crclInputImplausible` ở PatientPanel (true nếu BẤT KỲ trường nào trong cân nặng/chiều cao/tuổi/creatinine bị đánh dấu bất thường) điều khiển dòng chữ "dựa trên số liệu bất thường, kiểm tra lại trước khi dùng bậc liều này" bất cứ khi nào `crclUsable && crclInputImplausible`, mà không kiểm tra `crcl` có thật sự tính ra số hay không. Xác minh trực tiếp: tuổi=200 (cân nặng/creatinine hợp lệ) khiến Cockcroft-Gault từ chối, `crcl` = null, số hiển thị là dấu gạch ngang "—" — nhưng banner vẫn nói "...kiểm tra lại trước khi dùng bậc liều này", ngụ ý một bậc liều cụ thể đang dựa trên một con số CrCl nghi ngờ, trong khi thực tế không có con số nào được tính ra cả. `AntibioticDoseCard` ngay bên dưới xử lý đúng y hệt kịch bản này (đúng bản vá P0 kỳ trước) — nghĩa là mẫu sửa đã tồn tại sẵn trong cùng file, chỉ chưa được áp dụng cho dòng tóm tắt của chính PatientPanel. Đây là cùng LỚP lỗi mà commit `4a37a78` vừa vá ở một nơi khác — một vị trí anh em bị bỏ sót.
- **Sửa**: gate dòng chữ "dựa trên số liệu bất thường" theo cả điều kiện `crcl != null`, rơi về dòng lý do "Cần nhập..." hiện có (hiện đang render rỗng đúng kịch bản này vì chỉ kiểm tra trường THIẾU, không kiểm tra trường BỊ TỪ CHỐI) hoặc một thông điệp "bị từ chối" song song.
- **Lệnh đề xuất**: `/impeccable harden`

**[P3] Hàng chip "Độ thanh thải thận" (RRT) có 6 lựa chọn, vượt ngưỡng ≤4 mục/điểm quyết định**
- Không lọc/AKI/IHD/CRRT/SLED/PD — rất có thể là đánh đổi có chủ đích và đã được chấp nhận (phương thức thay thế thận thực sự là lựa chọn 5-6 nhánh về mặt lâm sàng, không thể đơn giản hoá mà không mất thông tin thật). Không đề xuất sửa — cắt bớt phương thức lọc thận thật để thoả mãn một heuristic sẽ tệ hơn.

**[P3, CHƯA XÁC MINH] Nghi vấn animation `pulse-scale` của tab đang active có thể kẹt ở kích thước scale-down nếu bị ngắt giữa chừng**
- A không xác minh được trực tiếp vì animation bị đứng hình giữa keyframe do Browser pane không compositing trong phiên này (`transform` kẹt ở `matrix(0.8,...)`, cao 35px thay vì 44px nghỉ) — đọc y hệt một bug ngắt-animation thật, nhưng không phân biệt được với artefact sandbox trong phiên này. Cần một lượt kiểm tiếp với ảnh chụp thật: chạm nhanh liên tục qua nhiều tab và xem tab đang active có bao giờ đứng lại ở kích thước nhỏ hơn các tab khác hay không.
- **Lệnh đề xuất**: `/impeccable audit` (hoặc lặp lại `/impeccable critique` khi có phiên trình duyệt compositing được)

## Persona đáng chú ý

**Riley (kiểm thử ép biên)**: Tuổi cực đoan (200) kích hoạt đúng cơ chế "số liệu bất thường" toàn màn hình (không crash) — nhưng chính từ đó lộ ra P0 và P1 ở trên, đúng loại lỗi chỉ hiện ra dưới áp lực ép biên mà Riley tồn tại để tìm. Chuyển tab nhanh 6 lần và tải lại trang giữa phiên đều giữ nguyên trạng thái, không hỏng dữ liệu. Các panel rỗng (chưa chọn kháng sinh/thuốc truyền) render sạch, không có loader treo.

**Sam (phụ thuộc trợ năng)**: Tab thật cho viền focus 2px hiện đúng trên mọi control đã kiểm (ô tìm kiếm, chip thuốc). Danh sách kết quả tìm kiếm có `aria-posinset`/`aria-setsize` và điều hướng phím mũi tên. Một điểm chưa xác minh được: `aria-live="polite"` trên dải CrCl có đọc đúng nội dung câu P1 ở trên hay không — nếu có, người dùng screen reader sẽ nghe đúng câu "kiểm tra lại trước khi dùng bậc liều này" cạnh một con số không tồn tại, có thể còn khó hiểu hơn với người không nhìn thấy dấu gạch ngang "—" làm gợi ý ngữ cảnh.

**Casey (thao tác một tay trên di động)**: Nút "Xoá bệnh nhân" đặt cố ý ở ĐẦU khung PatientPanel, ngoài vùng ngón cái tự nhiên — xác nhận có chủ đích qua bình luận mã trích dẫn thảo luận thiết kế trước đó với chủ dự án, không phải sơ suất. Đây là đánh đổi hợp lý và có ghi chép (cố ý gây ma sát cho hành động huỷ hoại nhất), không phải lỗi.

## Quan sát nhỏ

- `overused-font`/`em-dash-overuse` (phát hiện mới từ detector) — nhiều khả năng false positive: font thân bài duy nhất là lựa chọn có chủ đích trong DESIGN.md, và văn phong gạch-ngang-nối-tiếp khớp cách viết cảnh báo lâm sàng thông thường. Không cần hành động trừ khi một lượt `/impeccable clarify` sau này muốn đa dạng hoá cách nối câu.
- Biến thể `cramped-padding` mới (0px padding dọc trên nút `h-11`, riêng một nút đo được `display: block` thay vì `flex`) — chưa đủ bằng chứng chữ lệch tâm thật, cần ảnh chụp thật trước khi coi là lỗi cần sửa.
- 1 phát hiện detector nằm ngoài phạm vi màn này (dòng 938, `#000` trong `mask-image`) — không tính vào critique này, cân nhắc riêng nếu có lượt critique cho màn chứa nó.
- Nút "Cách dùng · Pha thuốc" đo được chiều rộng 0px bất thường trong một lần đo của B — chính B ghi nhận là khả năng artefact (DOM node cũ/trùng trong lúc chuyển động mở-đóng), không khẳng định là lỗi thật, cần đo lại.
- Touch target mg/dL·µmol/L đã vá từ lượt trước (`boxShadow: inset`) được A đo lại độc lập lần nữa: vẫn đúng 44px, bản vá đứng vững.

## Câu hỏi gợi mở

1. `resolveDosingWeight` nên trả về một nhãn phân biệt được (vd `"ABW-fallback"`) thay vì gộp chung vào `"ABW"` như hiện tại — một thay đổi kiểu dữ liệu nhỏ này có đủ để lỗi tương tự không thể âm thầm tái diễn ở một đường gọi thứ tư trong tương lai không?
2. Dải CrCl ở PatientPanel và banner CrCl ở AntibioticDoseCard đang là hai điều kiện viết độc lập cho cùng một phán đoán — và vừa trôi lệch nhau lần thứ hai bị phát hiện. Có nên hợp nhất thành một hàm phán đoán CrCl duy nhất dùng chung, thay vì tiếp tục vá từng nơi tiêu thụ tự suy luận lại?
