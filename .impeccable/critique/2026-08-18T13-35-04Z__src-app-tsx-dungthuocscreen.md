---
target: "DungThuocScreen (src/App.tsx:10641-11135)"
total_score: 36
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-18T13-35-04Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: general-purpose agent · B: general-purpose agent)

## Điểm sức khỏe thiết kế

| # | Heuristic | Điểm | Phát hiện chính |
|---|---|---|---|
| 1 | Hiển thị trạng thái hệ thống | 4 | Cảnh báo dữ liệu cũ đúng theo trạng thái thực, đồng hồ "N phút trước" sống, dải offline, badge Nhật ký. |
| 2 | Khớp hệ thống với thực tế | 4 | Thuật ngữ lâm sàng đúng, tiếng Việt xuyên suốt. |
| 3 | Quyền kiểm soát & tự do | 4 | Undo hai tầng, thời gian hoàn tác chỉnh theo mức nghiêm trọng. |
| 4 | Nhất quán & chuẩn mực | 3 | Hệ token chặt chẽ nhưng bị phá bởi khoảng trống InfusionCategoryScreen/AntibioticsScreen (P1) và nút chữ cái 28px (P1/P2). |
| 5 | Ngăn ngừa lỗi | 4 | `parseStrictNumber` từ chối ép kiểu ngầm; liều ≥2× tối đa phải xác nhận rõ ràng. |
| 6 | Nhận diện thay vì nhớ lại | 4 | Mọi bước chọn "dính" qua các lần đổi tab. |
| 7 | Linh hoạt & hiệu quả | 3 | Tìm xuyên tab, MRU tab — nhưng 8-9 chip thuốc truyền chưa quản lý (P1). |
| 8 | Thẩm mỹ tối giản | 3 | Thang chữ/bo góc kỷ luật, nhưng 2 bổ sung gần đây tái phạm lỗi thang này từng dựng ra để diệt. |
| 9 | Giúp nhận biết/khắc phục lỗi | 4 | "GẤP 12 LẦN LIỀU THƯỜNG DÙNG" nêu rõ hệ số và hướng xử lý. |
| 10 | Trợ giúp & tài liệu | 3 | Mọi thẻ thuốc trích nguồn/ngày duyệt hoặc nói "chưa ghi nguồn" — nhưng phải mở từng Disclosure mới thấy. |
| **Tổng** | | **36/40** | **Tốt (90%)** |

## Xác định tính đặc thù thiết kế

Không phải UI tab+card chung chung khoác áo y khoa. Bằng chứng: thang `DoseSeverity` với cổng xác nhận khác nhau theo bậc; kiểm tra tương hợp Y-site trước khi ghim; hai hằng số hoàn tác khác nhau (5s/20s) lý giải từ tình huống bị ngắt giữa chừng; cửa sổ đóng băng thứ tự tab (15 phút); luật cứng enforced trong code rằng liều trong ngưỡng an toàn hiện màu trung tính, không bao giờ màu thương hiệu. Đội ngũ đã chạy đúng vòng lặp critique này nhiều lần và đóng phần lớn phát hiện cũ.

Quét tự động (`detect.mjs`) trên toàn `src/App.tsx`: exit 2 nhưng 0 phát hiện nằm trong phạm vi dòng DungThuocScreen (10641–11135); phát hiện duy nhất (màu `#000` chưa khai báo, dòng 983) thuộc `SpecialtyPicker`.

Live detector (tiêm vào trang chạy thật) báo 15 anti-pattern; 6/15 truy vết về JSX trong thân DungThuocScreen, 9/15 thuộc khung `App()` chung mọi màn hình (ngoài phạm vi). Trong 6 phát hiện thuộc phạm vi, đã xác minh bằng code:
- `layout-transition` trên `.disc-body` (PatientPanel) — **FALSE POSITIVE**: DESIGN.md nói rõ `max-height` là lựa chọn cố ý thay `grid-template-rows` (bug Grid `fr`→`auto` tái hiện trên Chromium hiện đại).
- `cramped-padding` trên toggle mg/dL và nút "Thêm kháng sinh tự nhập" (cả hai cao 44px `h-11`) — dự án từng có tiền lệ rule này báo sai; chưa đủ căn cứ kết luận, cần người kiểm trực tiếp.
- `line-length` trên 2 đoạn `DisclaimerGate` (~190-205 ký tự/dòng) — phát hiện thật, xem P3.

## Ấn tượng chung

Màn hình được tư duy kỹ nhất trong app. Vấn đề còn lại không phải thiếu tư duy thiết kế mà là một bản sửa tốt (collapse-to-N) chưa lan sang màn anh em, và một tính năng mới (nhảy nhanh chữ cái) vô tình phá đúng hai luật cứng dự án tự đặt ra — tái phạm ngay trong ngày lượt critique trước đóng các lỗi tương tự.

## Điểm mạnh

- `SEVERITY_STYLE.ok` dùng `var(--c-text)` không phải primary cho kết quả liều trong ngưỡng (`src/lib/doseSafety.ts:148-157`).
- Timer xác nhận/hoàn tác chỉnh theo mức nghiêm trọng: 5s gỡ một thuốc, 20s xoá cả bệnh nhân, có dải đếm ngược hiển thị (`App.tsx:5546-5564`, `6084-6100`).
- `CompatWarningForDrug` cảnh báo xung đột Y-site trước khi ghim, nêu đích danh thuốc xung đột (`App.tsx:6601-6642`).

## Vấn đề ưu tiên

**[P1] InfusionCategoryScreen chưa thừa hưởng bản sửa cognitive-load của AntibioticsScreen.**
`App.tsx:10516-10523` — mọi thuốc trong nhóm hiện chip phẳng, không gấp gọn. AntibioticsScreen từng bị flag cùng vấn đề và đã sửa bằng `ABX_GROUP_COLLAPSE_COUNT = 8` + "Xem tất cả" (`App.tsx:8409, 8486-8654`) nhưng chưa lan sang màn anh em (9/10 tab của màn này). An thần (8 thuốc) và Khác (9 thuốc) chạm đúng mật độ từng bị sửa.
Sửa: áp cùng mẫu collapse-to-N + "Xem tất cả".

**[P1/P2] Nút nhảy nhanh theo chữ cái phá luật touch-target và cỡ chữ dự án tự đặt ra.**
`App.tsx:8609-8624` (đã xác minh): `w-7 h-7` (28×28px), `text-[11px]`. `lib/ui.ts:14-19` viết rõ lý do bỏ 11px ("cỡ chữ chân trang, không phải nội dung lâm sàng"). Tính năng mới thêm cùng ngày 2026-08-18 mà comment tại chỗ trích chính lượt critique này — tái phạm ngay lúc đang sửa.
Sửa: dùng lại mẹo padding-vô-hình đã có ở nút tiêu đề, nâng chữ lên `T.meta` (12px).

**[P2] Shadow trên control đang nghỉ, phá luật Floating-Layer-Only.**
`App.tsx:9741` (đã xác minh) — toggle "Liều→Tốc độ" áp `boxShadow` cho pill đang chọn, dù đây là control thường trực không phải floating layer.
Sửa: bỏ boxShadow, dùng khác biệt màu nền/chữ.

**[P2] `cramped-padding` từ detector — cần người kiểm trước khi sửa.**
Trên toggle mg/dL và nút "Thêm kháng sinh tự nhập" (cả hai đủ 44px cao). Dự án từng có tiền lệ rule này báo sai; chưa đủ căn cứ lần này là lỗi thật hay false positive.

**[P3] Đoạn văn DisclaimerGate quá dài, ảnh hưởng khả năng đọc.**
`App.tsx:11124` — 2 đoạn ~190-205 ký tự/dòng, không giới hạn max-width đọc. Nhẹ vì là văn bản miễn trừ trách nhiệm, không phải số liệu lâm sàng.

*(Ghi nhận thêm: `pop-value` bounce trên số đếm RunningPanel (`App.tsx:5994`) nằm ngoài phạm vi delight DESIGN.md định nghĩa (nav/tab/card/transition), không phạm luật Untouchable Signal nhưng đáng cân nhắc.)*

## Cờ đỏ theo persona

**Riley (stress-tester)**: nút chữ cái 28×28px trong hàng cuộn ngang — chạm nhanh dưới áp lực dễ trượt thành cuộn.

**Casey (di động, một tay, ban đêm)**: bức tường chip An thần/Khác chưa gấp gọn — đúng kịch bản cuộn nhiều màn hình mà bản sửa collapse ở antibiotics sinh ra để tránh.

**Sam (phụ thuộc trợ năng)**: `App.tsx:7648` dùng `text-slate-400` dưới ngưỡng AA cho văn bản hướng dẫn thao tác thật sự cần đọc — đúng loại lỗi dự án từng tự bắt và sửa ở chỗ khác (`App.tsx:5999-6001`).

## Quan sát nhỏ

- `.scr-dose` dùng `outline-offset: -2px`, khác `+1px` trong DESIGN.md — bản sửa cố ý có comment giải thích (`index.css:611-617`); DESIGN.md có thể đang lỗi thời.
- `FIELD` trong `lib/ui.ts:102` còn `text-[14px]` dù bị rule toàn cục 16px ghi đè — vô hại nhưng gây hiểu lầm khi đọc code.
- `ABX_GROUP_COLLAPSE_COUNT = 8` vẫn gấp đôi hướng dẫn ≤4/quyết định — có thể có chủ đích cho domain thuốc, đáng có quyết định rõ ràng.
- 9 phát hiện detector còn lại (clipped-overflow, undersized-ui-text trên nav dưới, overused-font) thuộc khung `App()` chung mọi màn hình, ngoài phạm vi critique này.

## Câu hỏi gợi mở

1. Bản sửa collapse-to-8 ở antibiotics sinh ra từ đúng lượt critique cognitive-load trước — vì sao InfusionCategoryScreen anh em chưa được thừa hưởng?
2. `ABX_GROUP_COLLAPSE_COUNT = 8` vẫn vượt ngưỡng ≤4 nó sinh ra để thỏa mãn — có chủ đích hay tùy tiện?
