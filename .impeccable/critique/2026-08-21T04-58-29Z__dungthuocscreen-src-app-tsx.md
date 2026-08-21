---
target: DungThuocScreen (src/App.tsx)
total_score: 36
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-21T04-58-29Z
slug: dungthuocscreen-src-app-tsx
---
Method: dual-agent (A: general-purpose/sonnet · B: general-purpose/sonnet)

## Điểm sức khoẻ thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 4 | `aria-live` trên CrCl, banner "Thiếu chiều cao" bắn đúng lúc, số liều đếm lên — xác minh THẬT |
| 2 | Match System / Real World | 4 | Thuật ngữ lâm sàng chuẩn xác (CrCl, IBW/AdjBW, Y-site), không đơn giản hoá quá mức cho đối tượng bác sĩ |
| 3 | User Control and Freedom | 3 | Undo 20s/5s tốt, nhưng cổng xác nhận 2 lần cho liều cực đoan cố ý đánh đổi bớt tự do để đổi lấy an toàn — hợp lý nhưng vẫn giới hạn điểm |
| 4 | Consistency and Standards | 4 | `crclNullReason`/`heightMissingForBasis`/`SEVERITY_STYLE`/`confirmGate` được tập trung hoá sau các lượt trôi lệch trước — xác minh THẬT |
| 5 | Error Prevention | 4 | Kiểm tra giá trị bất thường trên mọi trường bệnh nhân, cổng 2 chạm trước hành động hệ trọng |
| 6 | Recognition Rather Than Recall | 4 | Bối cảnh bệnh nhân luôn hiện, nhãn cơ sở cân nặng (IBW/AdjBW) hiện cạnh số thay vì bắt nhớ |
| 7 | Flexibility and Efficiency | 3 | Công thức pha riêng theo khoa, ghim, tìm xuyên tab — nhưng phím tắt hạn chế (hợp lý cho công cụ cảm ứng) |
| 8 | Aesthetic and Minimalist Design | 3 | Mật độ cao có chủ đích, nhưng **[P2] mới**: banner cảnh báo có thể chồng 3-4 lớp trên một thẻ thuốc ở ca bệnh nhân xấu nhất, không phân nhóm |
| 9 | Error Recovery | 4 | Mọi trạng thái "—" nêu đúng trường thiếu + link sửa — heuristic mạnh nhất của màn này |
| 10 | Help and Documentation | 3 | Trích nguồn riêng từng thuốc phù hợp cho chuyên gia, không có gì cho người mới tiếp cận màn |
| **Tổng** | | **36/40** | **Tốt (Good)** — giữ nguyên điểm lượt trước (2026-08-21T03:43), đúng như kỳ vọng cho hai bản vá hẹp phạm vi chứ không phải đại tu |

## Nhận định về tính đặc thù thiết kế

**Đánh giá LLM (A)**: Rất cao, không phải khung dosing-calculator chung chung. Bằng chứng: xử lý Cockcroft-Gault từ chối theo dấu, logic cơ sở IBW/AdjBW/ABW riêng từng thuốc, kiểm tương kỵ Y-site trong `RunningPanel`, cổng xác nhận liều cực đoan cố ý ngắn hơn cổng xác nhận xoá (`CONFIRM_EXTREME_RESET_MS` vs `CONFIRM_DELETE_RESET_MS`, có bình luận giải thích), quy tắc tách màu Decoration/Diagnosis ghi trong `DESIGN.md`, và hàng chục bình luận trích dẫn đúng ngày/phát hiện critique trước để chống hồi quy. Codebase tự-ý-thức bất thường về lịch sử lỗi của chính nó.

**Quét tự động (B)**: `detect.mjs --json` trên `App.tsx` → 1 phát hiện (`design-system-color`, `#000` trong `mask-image` dòng 939) — **ngoài phạm vi** DungThuocScreen (hàm chính 10890-11413, ngoài phạm vi này còn tính cả các component con nó dựng riêng như PatientPanel/AntibioticsScreen/InfusionCategoryScreen). **0 phát hiện trong đúng phạm vi màn này** — giữ nguyên kỷ lục sạch nhiều lượt liền. Tiêm script trên 4 view thật (tab Kháng sinh, Noradrenaline mở chi tiết, PatientPanel có bệnh nhân, hai kịch bản vá P0/P1) → phần lớn phát hiện là false positive đã biết (`cramped-padding` trên nút `h-11` căn giữa bằng flex chứ không phải padding; `undersized-ui-text` ×5 là nhãn nav ngoài phạm vi, và B đo trực tiếp contrast 5.08:1 — đạt AA, chỉ vi phạm ngưỡng cỡ chữ chứ không phải độ tương phản). Một phát hiện `text-occlusion` xuất hiện đúng 1 lần rồi biến mất khi B lặp lại đúng thao tác — B tự kết luận đây là khung hình giữa-chuyển-động (trùng đúng lúc animation `max-height`/`margin-top` của Disclosure chạy) chứ không phải lỗi đứng yên, không tính là phát hiện thật.

**Phát hiện thật, mới, đã đo trực tiếp bằng pixel (B)**: `line-length` — nhiều đoạn văn bản hướng dẫn liều/cảnh báo thoát mạch/ghi chú bảo quản render ở `max-width: none`, rộng tới **1206px ở cỡ chữ 12-14px** trên viewport desktop 1280px (vd dòng "Khởi đầu 0,01–0,1 mcg/kg/phút, chỉnh liều theo huyết áp mục tiêu..." đo được 1206px/14px). Đây là văn bản HƯỚNG DẪN LIỀU AN TOÀN, không phải trang trí — dòng quá dài làm giảm tốc độ đọc đúng lúc cần đọc nhanh nhất. Xem P2 bên dưới.

**Overlay trực quan**: Không tiêm được overlay hiển thị cho người dùng xem trực tiếp trong tab lượt này — cả hai sub-agent đều gặp `document.hidden = true` / Browser pane không compositing khung hình thật trong phiên này. B vẫn đọc được console/DOM thật (bằng chứng liệt kê ở trên), A xác minh trực tiếp qua state/DOM và bằng cách đọc lại `localStorage`, nhưng không có ảnh chụp màn hình đối chiếu trực quan lần này.

**Nhiễu phiên đồng thời, ghi nhận công khai**: Cả A và B đều gặp dấu hiệu một phiên trình duyệt khác (chính là phiên kia) ghi đè `localStorage` dùng chung giữa lúc đang đo (cân nặng tự trở về 70kg, màn tự điều hướng về Trang chủ không do thao tác nào của agent). Cả hai đều đo lại độc lập sau khi cô lập khỏi nhiễu này trước khi báo cáo — không phải lỗi ứng dụng, nhưng ghi nhận thay vì giấu.

## Ấn tượng chung

Hai bản vá P0/P1 từ lượt trước (`resolveDosingWeight` âm thầm rơi về ABW; banner CrCl lẫn "nghi ngờ" với "không tính được") đều đứng vững khi kiểm chứng độc lập lần này bằng cả hai đường: chạy thật qua UI (cả A và B đều tái lập đúng kịch bản gốc — Gentamicin thiếu chiều cao, tuổi=200 — và thấy đúng văn bản/banner mới) VÀ soát mã. Điểm tổng giữ nguyên 36/40, đúng như kỳ vọng cho hai bản vá phạm vi hẹp chứ không phải một lượt đại tu. Nhưng đúng như câu hỏi gợi mở của lượt trước đã cảnh báo ("có đường gọi thứ tư nào âm thầm tái diễn lỗi này không?") — A đi tìm chính xác điều đó và tìm thấy: `MixRunTime` (ước tính "bơm chạy được bao lâu") gọi `resolveDosingWeight` độc lập và chỉ lấy `.used`, bỏ qua đúng cờ `heightMissingForBasis` vừa được thêm hai component phía trên nó trong cùng luồng `InfusionCalculator`. Không nghiêm trọng bằng P0 gốc (đây là số phụ, không phải số liều chính, và thẻ cha bên trên đã hiện đúng cảnh báo), nhưng là một lần tái hiện thật của đúng lớp lỗi mà tên gọi của nó đã được đặt tên tường minh trong hai lượt critique liên tiếp trước đó.

## Điểm mạnh

1. **Hai bản vá P0/P1 tự chúng là mẫu mực**: cả hai đều gom một phán đoán từng bị lặp lại rải rác về một hàm/nguồn chân lý DUY NHẤT (`resolveDosingWeight`, `crclNullReason`) rồi dùng chung ở mọi nơi tiêu thụ — đúng cách đóng LỚP lỗi thay vì vá từng điểm, xác minh trực tiếp qua nhiều tổ hợp cân nặng/chiều cao khác nhau (70kg→AdjBW=ABW hợp lệ, 140kg→AdjBW=95.7kg khớp tính tay).
2. **Cổng xác nhận liều cực đoan** ("ĐẶC GẤP 50 LẦN CÔNG THỨC CHUẨN", xác minh THẬT) là khoảnh khắc trấn an tốt nhất màn hình: nêu đúng nguyên nhân khả dĩ (nhầm đơn vị/gõ sai), buộc chạm "Tôi đã kiểm tra lại" thay vì cho bỏ qua thụ động.
3. **`RunningPanel` phát hiện dữ liệu cũ đúng theo NGUYÊN NHÂN** (cân nặng đổi từ lúc ghim, khác với chỉ đơn thuần thời gian trôi qua) và đổi giọng văn theo loại thuốc (liều ngắt quãng vs tốc độ liên tục) — mô hình hoá đúng quy trình lâm sàng thật, không phải trang trí.

## Vấn đề ưu tiên

**[P2] `MixRunTime` âm thầm dùng ABW cho ước tính "bơm chạy được bao lâu" khi thiếu chiều cao — tái diễn đúng lớp lỗi P0 vừa vá, ở một đường gọi chưa được cập nhật**
- **Vì sao quan trọng**: `src/App.tsx:9120-9150` gọi `resolveDosingWeight(...)` độc lập với `InfusionCalculator` cha nó và chỉ lấy `.used`, bỏ `usedLabel`/`heightMissingForBasis`. Với thuốc `doseWeightBasis !== "actual"` thiếu chiều cao, ước tính thời lượng bơm này vẫn âm thầm dùng ABW không nhãn, không cảnh báo — dù thẻ cha hai bước phía trên đã hiện đúng banner "Thiếu chiều cao...". Nhẹ hơn P0 gốc (số phụ, không phải liều chính), nhưng là bằng chứng cụ thể rằng lớp lỗi "một giá trị rơi-về-mặc-định mang hai nghĩa, chỉ một số nơi tiêu thụ được cập nhật" chưa bị đóng hoàn toàn — đúng câu hỏi gợi mở lượt trước đặt ra.
- **Sửa**: `MixRunTime` nhận thẳng `dosingWeight` đã tính sẵn từ `InfusionCalculator` cha thay vì tự gọi lại `resolveDosingWeight`, hoặc tối thiểu thread `heightMissingForBasis` qua để hiện cùng cảnh báo.
- **Lệnh đề xuất**: `/impeccable harden`

**[P2] Văn bản hướng dẫn liều/cảnh báo an toàn render quá dài trên desktop — đo được tới 1206px ở cỡ chữ 12-14px (xác minh THẬT bằng đo pixel)**
- **Vì sao quan trọng**: nhiều đoạn (hướng dẫn chỉnh liều, cảnh báo thoát mạch, ghi chú bảo quản sau pha) không có `max-width` giới hạn, kéo dài hết chiều rộng viewport 1280px. Ở 12-14px, dòng dài cỡ này tương đương 170-200 ký tự/dòng — vượt xa ngưỡng đọc thoải mái (thường 60-90 ký tự/dòng), làm chậm tốc độ đọc đúng lúc văn bản đó là hướng dẫn AN TOÀN cần đọc nhanh và chính xác nhất trên màn hình, không phải nội dung trang trí.
- **Sửa**: thêm `max-width` (vd `65ch`-`75ch`) cho các khối văn bản hướng dẫn/cảnh báo trong `InfusionCalculator`/`AntibioticDoseCard`, đặc biệt trên viewport rộng (desktop) nơi vấn đề rõ nhất.
- **Lệnh đề xuất**: `/impeccable typeset`

**[P2] Banner cảnh báo có thể chồng 3-4 lớp trên một thẻ thuốc ở ca bệnh nhân xấu nhất, không phân nhóm/độ ưu tiên**
- **Vì sao quan trọng**: một bệnh nhân với tuổi bất thường + thiếu chiều cao + đang lọc máu đồng thời có thể khiến `AntibioticDoseCard` hiện cùng lúc banner CrCl-bất-thường, banner thiếu-chiều-cao, banner RRT-áp-dụng, banner cân-nặng-bất-thường — không có phân nhóm thị giác nào cho biết đây là các cảnh báo ĐỘC LẬP cần đọc hết, hay đọc theo thứ tự. Một bác sĩ đang vội có thể lướt qua một trong số đó.
- **Sửa**: gom thành một khối gấp "N điều cần biết trước khi dùng liều này", hoặc chỉ hiện banner nghiêm trọng nhất (RRT/lọc máu luôn dẫn đầu) kèm "+2 nữa" để mở rộng.
- **Lệnh đề xuất**: `/impeccable layout`

**[P3] Hex cứng nằm ngoài token `--c-*` tại hai vị trí trong DungThuocScreen**
- `src/App.tsx:11396` (`color: "#fff"`) và `:12145` (`color: "#4ade80"`) trong UI toast/undo — cả hai đều có bình luận giải thích đây là bề mặt cố định tối màu bất kể theme, hợp lý về mặt thiết kế. Nhưng nếu dự án có công cụ lint tự động ép buộc token, nó sẽ không đọc được bình luận và vẫn gắn cờ — cân nhắc `// eslint-disable` tường minh hoặc một cặp token "luôn-tối" riêng (`--c-pill-dark-text`) nếu công cụ đó tồn tại.
- **Lệnh đề xuất**: `/impeccable extract`

## Persona đáng chú ý

**Riley (kiểm thử ép biên)**: tuổi=200 cho đúng banner "không tính được — số liệu bất thường" (xác minh THẬT, khớp bản vá). Chưa kiểm được tổ hợp cân nặng cực đoan (vd 5000kg) đồng thời với CrCl-bị-từ-chối có bao giờ cho ra hai banner MÂU THUẪN nhau trên cùng thẻ hay không — cần một lượt sau.

**Sam (phụ thuộc trợ năng)**: nút gấp/mở Creatinin·CrCl ban đầu trông như thiếu tên trợ năng khi đọc qua `read_page`, nhưng A soát lại mã và xác nhận đây là báo cáo sai của công cụ đọc — nút có `aria-expanded`/`aria-controls` và nhãn là text con thật, tính đúng tên trợ năng theo thuật toán chuẩn. Không phải lỗi thật, ghi lại đúng theo nguyên tắc "xác minh trước khi tin công cụ".

**Casey (một tay trên di động)**: nút "Xoá bệnh nhân" cố ý đặt ngoài vùng ngón cái — có bình luận mã bảo vệ quyết định này khỏi bị "sửa" nhầm trong tương lai. Cân nhắc: nếu người dùng thật từng báo cáo "khó bấm", đội dự án nên có nơi ghi lại đánh đổi này ngoài bình luận mã, để không bị đảo ngược nhầm khi có phản hồi chưa hiểu ý đồ.

## Quan sát nhỏ

- `layout-transition` (detector, ×2-4 mỗi view) trên `.disc-body`/`.disc-body--flush` của component `Disclosure` dùng chung toàn app — mang tính hệ thống (thiết kế có chủ đích dùng `max-height` thay vì transform, đã xác nhận nhiều lượt trước là đánh đổi tương thích cố ý), không phải lỗi cục bộ của DungThuocScreen.
- `cramped-padding` trên nút "Thêm kháng sinh tự nhập" (`h-11` căn giữa bằng flex, 0px padding dọc) — false positive đã biết: chiều cao cố định 44px + flex-center cho khoảng thở thị giác đủ, detector chỉ nhìn padding nên bỏ sót cách căn giữa này.
- `text-occlusion` xuất hiện đúng 1 lần rồi biến mất khi lặp lại — B kết luận là khung hình giữa-animation (trùng lúc Disclosure đang mở/đóng), không phải lỗi đứng yên.
- `undersized-ui-text` ×5 (nhãn nav 10px) — ngoài phạm vi DungThuocScreen (thuộc shell `App`), và contrast đo được 5.08:1 vẫn đạt AA — chỉ vi phạm ngưỡng cỡ chữ tối thiểu, không phải độ tương phản.
- `:focus-visible` qua phím Tab tiếp tục không đo được ổn định trong sandbox này (`document.activeElement` không rời `<body>` dù phím báo đã gửi) — công cụ đo không ổn định giữa các phiên tab, không kết luận là lỗi ứng dụng, đúng như đã ghi nhận ở lượt trước.
- `PatientPanel`'s `crclWeight` (luôn dùng basis "adjusted") cũng rơi về ABW khi thiếu chiều cao — A soát và xác nhận đây là hành vi ĐÚNG về mặt lâm sàng cho Cockcroft-Gault (không phát hiện béo phì được nếu thiếu chiều cao, ABW là mặc định hợp lý), không phải một biến thể chưa vá của bug P0.

## Câu hỏi gợi mở

1. `MixRunTime` là đường gọi thứ tư đến `resolveDosingWeight` chưa được cập nhật — có nên đổi kiểu dữ liệu để không thể gọi hàm này mà bỏ qua `heightMissingForBasis` nữa (vd bắt buộc destructure toàn bộ object, hoặc thread `dosingWeight` đã tính sẵn từ cha xuống thay vì cho phép tính lại độc lập ở bất kỳ đâu)?
2. Cảnh báo chồng lớp ở ca bệnh nhân xấu nhất — có đáng đánh đổi để chỉ hiện MỘT banner nghiêm trọng nhất theo mặc định, chấp nhận rủi ro giấu bớt thông tin, để đổi lấy tốc độ đọc lúc vội?
3. Dòng văn bản dài 1206px chỉ lộ rõ trên desktop rộng — sản phẩm này được thiết kế ưu tiên "một tay trên điện thoại lúc trực", vậy độ ưu tiên sửa cho trường hợp desktop này nên đứng ở đâu so với các vấn đề mobile-first khác?
