---
target: DungThuocScreen (src/App.tsx)
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-21T08-39-03Z
slug: dungthuocscreen-src-app-tsx
---
Method: dual-agent (A: general-purpose/sonnet · B: general-purpose/sonnet)

## Điểm sức khoẻ thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 4 | Header nhóm cảnh báo cập nhật đúng thời gian thực khi đổi RRT/tuổi — xác minh THẬT (bật IHD, cảnh báo CrCl-rejected biến mất, thay bằng RRT, tổng vẫn đúng) |
| 2 | Match System / Real World | 4 | Thuật ngữ lâm sàng chuẩn xác, không đơn giản hoá cho đối tượng bác sĩ |
| 3 | User Control and Freedom | 3 | Hoàn tác 20s có đếm ngược trực quan tốt; cổng xác nhận 2 lần cho ca cực đoan vẫn là đánh đổi có chủ đích, giữ nguyên điểm như lượt trước |
| 4 | Consistency and Standards | 2 | **[P1] mới, verify THẬT**: PROSE max-width vừa thêm KHÔNG phủ đúng 3 khối cảnh báo mà commit tuyên bố đã sửa; **[P2] mới**: cùng cờ "thiếu chiều cao" hiện thẳng ở AntibioticDoseCard nhưng bị giấu sau accordion đóng mặc định ở InfusionDrugCard/BolusList |
| 5 | Error Prevention | 4 | Chặn liều mg/kg khi cân nặng phi lý, vialGuard, cổng xác nhận liều cực đoan |
| 6 | Recognition Rather Than Recall | 4 | Bối cảnh bệnh nhân luôn hiện, nhãn cơ sở cân nặng hiện cạnh số |
| 7 | Flexibility and Efficiency | 3 | Công thức pha riêng theo khoa tốt, nhưng "Cách dùng" ẩn sau Disclosure ở InfusionDrugCard trong khi AntibioticDoseCard hiện thẳng — không đối xứng |
| 8 | Aesthetic and Minimalist Design | 3 | Mật độ cao quản lý tốt bằng Disclosure, nhưng dòng cảnh báo đo được tới 1185px phá vỡ tính "calm, serious" mà DESIGN.md đòi hỏi cho vùng "diagnosis" |
| 9 | Error Recovery | 4 | Câu chữ luôn nói rõ vì sao/thiếu gì/sửa ở đâu — heuristic mạnh nhất màn này, không đổi |
| 10 | Help and Documentation | 3 | DisclaimerBar + nguồn/reviewedOn đủ dùng cho đối tượng bác sĩ, không có gì mới |
| **Tổng** | | **34/40** | **Tốt (Good)** — giảm từ 36/40 lượt trước, do một hồi quy xác minh THẬT ở đúng phạm vi commit vừa tuyên bố đã sửa |

## Nhận định về tính đặc thù thiết kế

**Đánh giá LLM (A)**: Có căn cứ vững — không phải khung máy tính liều chung chung. Bằng chứng mới xác minh: token `--c-pill-dark-text`/`--c-toast-green` (patch vừa rồi) giữ đúng `#ffffff`/`#4ade80` bất kể `data-theme`, đúng như bình luận mã hứa "luôn tối/luôn trắng bất kể theme" — kiểm bằng `getComputedStyle` thật ở cả hai theme, không chỉ đọc mã.

**Quét tự động (B)**: `detect.mjs --json src/App.tsx` → 1 phát hiện (`design-system-color`, `#000` trong `mask-image` dòng 939) — **ngoài phạm vi** DungThuocScreen (hàm chính từ dòng 10916, phát hiện này ở phần đầu file). **0 phát hiện CLI trong đúng phạm vi màn này.** Overlay trình duyệt (tiêm `detect.js` thành công lần này, khác lượt trước): 9 phát hiện, trong đó chỉ 2 thuộc phạm vi DungThuocScreen thật (`layout-transition` trên hai panel `Disclosure` "Bệnh nhân hiện tại"/CrCl — đây là đánh đổi `max-height` đã ghi nhận và chấp nhận nhiều lượt trước trong chính DESIGN.md, không phải lỗi mới), 1 nghi false positive (`cramped-padding` trên nút `h-11` căn giữa flex, xác nhận lại đúng như các lượt trước), 6 còn lại ở nav shell/body toàn cục (nhãn nav 10px, font) — ngoài phạm vi.

**Phát hiện thật, mới, đã đo trực tiếp bằng pixel (B, và tôi tự đọc lại mã để xác nhận)**: claim "PROSE max-w-[70ch] đã cap các đoạn văn bản còn lại" trong commit chỉ ĐÚNG MỘT PHẦN. B đo được `InfusionDrugCard`/`AntibioticDoseCard`'s `doseRange`/`preparation`/`highWarnings`/`stability` co đúng về 615–717px như commit nói. Nhưng A đo tiếp — và tôi đã tự đọc lại `src/App.tsx:8158-8276` để xác nhận — ba khối cảnh báo mới nhất, chính là ba khối mà commit 904b7d2 tuyên bố đã "thêm token PROSE ... cho các đoạn văn hướng dẫn liều/cảnh báo" (cơ sở cân nặng, RRT/AKI, CrCl-missing/rejected/implausible) **không hề có `${PROSE}` trong className**. Đo trực tiếp trên viewport 1280px: cảnh báo "Thiếu chiều cao — đang tạm dùng cân nặng thực..." rộng **1185px**, "Không tính được CrCl — số liệu bất thường..." rộng **827px**, cả hai `getComputedStyle().maxWidth === "none"`. Xem P1 bên dưới.

**Overlay trực quan**: Tiêm thành công lần này (B) — 9 finding đọc được qua `window.impeccableScan()` với DOM selector cụ thể, khác lượt trước (lượt trước injection thất bại do `document.hidden`). Không lấy được ảnh chụp màn hình do Browser pane không compositing trong môi trường agent (cả A và B đều gặp) — bù bằng đo `getBoundingClientRect()`/`getComputedStyle()` trực tiếp, chính xác hơn ảnh chụp cho mục đích đo pixel.

## Ấn tượng chung

Ba trong bốn bản vá của commit 904b7d2 đứng vững khi kiểm chứng độc lập bằng cả hai đường (chạy thật + đọc mã): `MixRunTime` giờ đúng đã cảnh báo (số phụ "bơm chạy được bao lâu" không còn âm thầm dùng ABW không nhãn), header nhóm "N điều cần biết" hoạt động chính xác kể cả khi các cảnh báo loại trừ lẫn nhau động (bật IHD, cảnh báo CrCl biến mất và bị RRT thay chỗ, tổng vẫn đúng), và hai token màu cố định mới hoạt động đúng ở cả hai theme. Nhưng bản vá thứ tư — PROSE max-width — **chỉ áp dụng cho các khối văn bản CŨ, bỏ sót đúng ba khối cảnh báo MỚI nhất mà chính commit này đang cố gắng làm cho dễ đọc hơn**. Đây là một hồi quy phạm vi hẹp (self-QA của bản vá trước có lẽ chỉ kiểm những đoạn văn dài nhất — doseRange, preparation — mà quên các nhánh cảnh báo có điều kiện, vốn khó gặp hơn khi test tay). Ngoài ra, hai sub-agent độc lập cùng phát hiện một bất nhất quy tắc có sẵn từ trước (chưa từng bị gắn cờ ở các lượt trước): quy tắc "cảnh báo cơ sở cân nặng phải hiện thẳng, không gấp" mà tác giả tự viết thành bình luận rõ ràng cho `AntibioticDoseCard` (dòng 8153-8157) không được áp dụng sang `InfusionDrugCard`/`BolusList` — đúng nhóm thuốc bị ảnh hưởng lại là thuốc giải độc cấp cứu tối khẩn (Nhũ dịch lipid 20%/LAST).

## Điểm mạnh

1. **`MixRunTime` — đường gọi thứ tư đến `resolveDosingWeight` — đã thực sự đóng đúng lớp lỗi**: xác minh sống bằng Gentamicin thiếu chiều cao, số "bơm chạy được bao lâu" giờ đúng có nhãn cảnh báo cùng mẫu ba nơi gọi kia (App.tsx:9143-9175).
2. **Header nhóm cảnh báo xử lý đúng cả trường hợp loại trừ lẫn nhau ngầm**: bật RRT thì `crclWarnActive` tự tắt (vì `crclReliability()` trả `"rrt"` khiến `crclApplies` sai, `lib/patient.ts:189-193` + `App.tsx:7748-7751`) và `rrtWarnActive` bật thay — tổng đếm vẫn đúng, không đếm trùng, không để sót banner cũ. Xác minh sống qua nhiều tổ hợp trạng thái.
3. **Token "luôn tối/luôn trắng bất kể theme" đúng như cam kết, đo trực tiếp**: `--c-pill-dark-text: #ffffff`, `--c-toast-green: #4ade80` không đổi giữa `data-theme="light"`/`"dark"` — kỷ luật token thật, không chỉ đúng trên giấy.

## Vấn đề ưu tiên

**[P1] PROSE max-width vừa thêm KHÔNG phủ đúng 3 khối cảnh báo mà commit tuyên bố đã sửa — hồi quy xác minh THẬT bằng đọc mã + đo pixel**
- **Vì sao quan trọng**: `src/App.tsx:8158-8276` — ba khối cảnh báo (thiếu cân nặng/chiều cao cho cơ sở lý tưởng-hiệu chỉnh, RRT/AKI, CrCl missing/rejected/implausible) đều KHÔNG có `${PROSE}` trong className, dù đây chính xác là nhóm văn bản mà commit message của 904b7d2 nói đã thêm PROSE cho "cảnh báo mức cao, peripheralWarn..." — các khối lân cận (`highWarnings` dòng 8391, `drug.preparation`/`note` dòng 8507-8510) có PROSE, nhưng ba khối này thì không. Đo trực tiếp trên viewport 1280px: "Thiếu chiều cao — đang tạm dùng cân nặng thực..." rộng **1185px**, "Không tính được CrCl — số liệu bất thường..." rộng **827px** — đúng loại văn bản "diagnosis" mà DESIGN.md nói phải bình tĩnh, nghiêm túc, dễ đọc, không phải "decoration". Dòng dài 1185px trên PWA/tablet phá hẳn tốc độ đọc đúng lúc cần đọc nhanh và chính xác nhất.
- **Sửa**: thêm `${PROSE}` vào className của các `<p>` tại App.tsx dòng 8160, 8171, 8180 (+8185, 8194, 8198, 8200), 8225-8230, 8247-8251, 8268-8272.
- **Lệnh đề xuất**: `/impeccable typeset`

**[P2] Cờ an toàn "thiếu chiều cao" hiện thẳng ở AntibioticDoseCard nhưng bị giấu sau accordion đóng mặc định ở InfusionDrugCard/BolusList — kiểm chứng trên đúng ca cấp cứu tối khẩn nhất app có (LAST)**
- **Vì sao quan trọng**: chọn "Nhũ dịch lipid 20% (ngộ độc thuốc tê — LAST)" (`doseWeightBasis: "ideal"`) với chiều cao bỏ trống — thẻ hiện ra KHÔNG có cảnh báo nào ở cấp trên cùng; phải bấm mở "Liều nạp / bolus" (`App.tsx:10590-10594`, không có `defaultOpen`, khác panel "Bệnh nhân hiện tại" ở dòng 5694 vốn có `defaultOpen={...}` theo điều kiện) mới thấy cảnh báo "Thiếu chiều cao..." cùng con số 105 mL đã tính sẵn trong `BolusList` (App.tsx:8962-9003). Chính bình luận tác giả viết cho `AntibioticDoseCard` (dòng 8153-8157) giải thích rõ vì sao loại cảnh báo này KHÔNG được gấp lại — quy tắc đó không lan sang `InfusionDrugCard`. LAST là cấp cứu tối khẩn: bác sĩ mở app lúc đó nhiều khả năng chỉ liếc số rồi bấm, không có thời gian dò accordion.
- **Sửa**: `defaultOpen` của Disclosure bọc `BolusList` (App.tsx:10591) = true khi `dosingWeight.heightMissingForBasis` hoặc thiếu cân nặng cơ sở, theo đúng pattern đã có sẵn ở dòng 5694.
- **Lệnh đề xuất**: `/impeccable harden`

**[P2] Banner cảnh báo thay đổi động (RRT/tuổi/chiều cao) không có `aria-live`/`role="alert"` — người dùng screen reader không được thông báo khi cảnh báo xuất hiện/biến mất**
- **Vì sao quan trọng**: B truy vết DOM ngược từ `DrugWarnings`/các khối cảnh báo cấp thuốc lên 5 cấp cha, không tìm thấy `aria-live`/`role="alert"`/`role="status"` nào — toàn màn chỉ có đúng 1 vùng `aria-live="polite"` (giá trị CrCl tính toán). Khi bác sĩ dùng screen reader đổi RRT hoặc sửa tuổi khiến một banner cảnh báo mới xuất hiện (hoặc biến mất, như ca IHD ở trên), họ sẽ không được thông báo tự động — phải tự dò lại toàn bộ nội dung thẻ để phát hiện thay đổi.
- **Sửa**: thêm `aria-live="polite"` (hoặc `role="status"` cho cảnh báo mức warn, `role="alert"` cho mức danger) vào wrapper của các khối cảnh báo động trong `AntibioticDoseCard`/`InfusionCalculator`.
- **Lệnh đề xuất**: `/impeccable harden`

**[P3] Header "N điều cần biết" không bao giờ đạt N=3 dù bình luận mã mô tả 3 khối độc lập — không phải bug, nhưng đáng làm rõ**
- **Vì sao quan trọng**: `crclReliability()` (`lib/patient.ts:189-193`) trả `"rrt"`/`"aki"` bất cứ khi nào `patient.rrt !== "none"` hoặc `akiUnstable`, khiến `crclApplies`/`crclWarnActive` (App.tsx:7748-7751, 7779) luôn tắt bất cứ khi nào `rrtWarnActive` bật — hai trong ba "khối độc lập" mà bình luận dòng 8144-8146 mô tả thực chất loại trừ lẫn nhau về mặt logic, không bao giờ cùng bật. Xác minh sống: bật IHD trên bệnh nhân đã có cảnh báo CrCl-rejected + weight-basis (2 điều) → tổng vẫn dừng ở "2 điều" (RRT thay chỗ CrCl). Không sai, chỉ là con số "N" trong thực tế mãi mãi ≤2, khiến phần khung "đếm số" hơi phí công cho một tín hiệu về bản chất gần như nhị phân.
- **Sửa**: cân nhắc chấp nhận ceiling=2 và bỏ số đếm động (dùng câu cố định), hoặc sửa lại bình luận dòng 8144-8146 cho khớp thực tế để người vá sau không hiểu lầm case 3 khối còn khả thi.
- **Lệnh đề xuất**: `/impeccable clarify`

## Persona đáng chú ý

**Riley (kiểm thử ép biên)**: tái hiện đúng ca xấu nhất (tuổi 200 + thiếu chiều cao + IHD) — hệ thống phục hồi đúng, không để lại banner mồ côi (xác nhận điểm mạnh #2). Nhưng khi mở "Nhũ dịch lipid 20%" xử trí LAST trong cùng ca này, màn hình đầu tiên trông "sạch", không cảnh báo gì — đúng lúc Riley cần thấy cảnh báo nhất (P2 thứ nhất).

**Sam (phụ thuộc trợ năng)**: hai vấn đề cụ thể đo được — dòng cảnh báo 827-1185px không max-width ảnh hưởng trực tiếp người phóng to màn hình (P1); banner động không `aria-live` khiến screen reader không biết cảnh báo vừa đổi (P2 thứ hai). Điểm tích cực xác minh lại: nút gấp/mở Creatinin·CrCl CÓ `aria-expanded`/`aria-controls` đúng chuẩn (một báo cáo sai của công cụ đọc ở lượt trước đã được xác nhận là false alarm, không lặp lại ở lượt này); focus-visible qua Tab thật hoạt động đúng (2px, `rgb(110,168,254)`, chỉ khi bàn phím).

**Alex (power user)**: hài lòng — nhân sẵn mg/kg, tab MRU, tìm xuyên tab đều mượt.

## Quan sát nhỏ

- `layout-transition` (detector, `.disc-body`/`.disc-body--flush`) trên panel "Bệnh nhân hiện tại"/CrCl — đánh đổi `max-height` đã ghi nhận và chấp nhận nhiều lượt trước, chính DESIGN.md đã ghi lại lý do; không phải lỗi mới.
- `cramped-padding` trên nút "Thêm kháng sinh tự nhập" — xác nhận lại là false positive (button `h-11` căn giữa bằng flex, không dùng padding, đủ khoảng thở thị giác).
- Contrast nav label 10px: dark 5.08:1, light 4.61:1 — cả hai đạt AA; vấn đề thật là cỡ chữ dưới sàn 11px (đã biết, ngoài phạm vi DungThuocScreen, thuộc shell `App`).
- Touch target nav: 256×48px, vượt xa ngưỡng 44px — không có vấn đề.
- `text-slate-400/500/900...` xuất hiện dày trong DungThuocScreen — xác nhận LẠI đây không phải hardcode: `src/index.css:373-381` remap toàn bộ bảng `slate` về đúng `--c-*` token, đảo màu theo theme bình thường.
- Toast toàn cục/`UpdateBanner` vẫn dùng `rgba(15,23,42,.92)`/`text-white` trực tiếp — ở App shell, ngoài phạm vi DungThuocScreen, có bình luận giải thích chủ đích.

## Câu hỏi gợi mở

1. Bản vá PROSE lần này bỏ sót đúng 3 khối cảnh báo mới nhất — quy trình tự-kiểm-chứng (self-QA) trước khi commit có nên thêm một bước "liệt kê MỌI đoạn `<p>` cảnh báo trong hàm, không chỉ những đoạn dễ thấy nhất khi test tay bằng mắt", để lớp lỗi "sửa 80% rồi tự tin là 100%" này không tái diễn ở bản vá tiếp theo?
2. Quy tắc "cảnh báo cơ sở cân nặng luôn hiện thẳng, không gấp" đã viết rõ trong bình luận `AntibioticDoseCard` nhưng chưa lan sang `InfusionDrugCard`/`BolusList` — đúng nhóm bị ảnh hưởng lại là thuốc giải độc cấp cứu (LAST). Có nên rút quy tắc này ra thành một điều kiện dùng chung (`defaultOpen` tự động theo cờ an toàn) thay vì để mỗi component tự quyết định gấp/mở, để nó không thể bị bỏ sót lần thứ ba?
3. "N điều cần biết" không bao giờ vượt quá 2 — có đáng đơn giản hoá thành một câu cố định, đổi lấy việc bỏ được đoạn bình luận đang mô tả sai khả năng "3 khối cùng bật"?
