---
target: DungThuocScreen
total_score: 37
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-22T04-31-28Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: a1c3e3deb6c01af93 · B: acfd8610c3fafc0b6)

## Điểm sức khỏe thiết kế

| # | Nguyên tắc Nielsen | Điểm | Vấn đề chính |
|---|---|---|---|
| 1 | Hiển thị trạng thái hệ thống | 4 | `aria-live` phủ CrCl, cảnh báo trước liều; motion đếm số báo đúng *chiều* thay đổi |
| 2 | Khớp với thế giới thực | 4 | Thuật ngữ lâm sàng chuẩn (Cockcroft-Gault, TTM/TMC/IM/SC, IHD/CRRT/SLED/PD) — đúng tầm bác sĩ, không bị "dân dã hóa" |
| 3 | Quyền kiểm soát & tự do | 4 | Mọi hành động phá hủy đều xác nhận 2 bước + thanh đếm ngược hoàn tác hiển thị |
| 4 | Nhất quán & chuẩn mực | **3** | Dòng "Cách dùng" kháng sinh vẫn tô `--c-primary` + bounce, dù đúng lỗi này đã được sửa ở nơi khác (`lib/doseSafety.ts:153-158`) — xem P1 |
| 5 | Ngăn ngừa lỗi | 4 | Cân nặng phi lý (5000kg) chặn hẳn phép nhân mg/kg thay vì ra số tự tin nhưng sai |
| 6 | Nhận diện hơn ghi nhớ | 4 | Luồng 4 bước chọn kháng sinh giữ trạng thái xuyên điều hướng; thứ tự tab nhớ theo phiên |
| 7 | Linh hoạt & hiệu quả | 4 | Tab theo tần suất dùng gần nhất, chip kháng sinh sắp theo tần suất, công thức pha riêng đã lưu |
| 8 | Thẩm mỹ & tối giản | 3 | Thẻ kháng sinh mở hết cỡ có thể xếp chồng nhiều khối cảnh báo cùng lúc (chính code đã tự ghi nhận rủi ro này) |
| 9 | Khôi phục lỗi | 4 | Mọi ô "—" đều có lý do cụ thể + link "Sửa lại ở khung Bệnh nhân hiện tại" |
| 10 | Trợ giúp & tài liệu | 3 | Không có onboarding chính thức, bù lại bằng nguồn/ngày cập nhật mỗi thuốc + màn chắn cảnh báo bắt buộc |
| **Tổng** | | **37/40** | **Xuất sắc — nhưng sát ngưỡng, xem 2 vấn đề P1** |

## Kết luận về tính đặc thù thiết kế

**Đánh giá LLM**: Đây không phải UI danh sách/tab chung chung khoác áo y khoa — nó được thiết kế bám sát cơ chế lâm sàng thật: phân biệt lý do CrCl null (`missing` vs `rejected`), áp trần liều ngay tại tầng tính toán trước khi bất kỳ đường hiển thị nào đọc được, đối chiếu tương hợp Y-site với bảng thuốc đang truyền, và cửa sổ hoàn tác 20 giây được ghi chú rõ là "đủ để sống sót qua một cuộc gọi điện thoại xen ngang cú chạm" (comment tại App.tsx:11022-11024). Kiến trúc thông tin (bệnh nhân → thuốc đang truyền → danh sách theo tab, một vùng cuộn chung) là lời giải cho một vấn đề quy trình thật, không phải khuôn mẫu dựng sẵn.

**Quét tự động (detector)**: `detect.mjs --json src/App.tsx` thoát mã 2, nhưng chỉ **1 phát hiện duy nhất trong toàn bộ file ~11.400 dòng** — `design-system-color` tại dòng 939, và dòng đó **nằm ngoài `DungThuocScreen`** (định nghĩa từ dòng 10954), thuộc một component khác gần đầu file. Đọc trực tiếp dòng 925-949 xác nhận đây là **false positive**: `#000` chỉ là điểm dừng alpha trong một `mask-image` radial-gradient, không phải màu vẽ thật. **Kết quả cho riêng DungThuocScreen: 0 phát hiện.** Điều này khớp với việc Assessment A tự kiểm tra sống (qua `javascript_exec`) và xác nhận không phần tử nào trên màn hình dosing thực sự resolve ra `--c-accent-2` (magenta chỉ dành cho Mindmap), và cả 5 input đo được đúng 16px — quy tắc token màu và sàn 16px đang được tuân thủ trong thực tế, không chỉ trên giấy.

Điểm đáng chú ý nhất khi ghép hai đánh giá: **detector không thể bắt được lỗi P1 quan trọng nhất** (màu `--c-primary` + bounce trên dòng "Cách dùng" pha thuốc) — vì đó là một token màu *đã được khai báo hợp lệ* trong DESIGN.md, chỉ bị dùng sai ngữ cảnh (vi phạm "Decoration/Diagnosis Split Rule" mang tính ngữ nghĩa, không phải "màu hex lạ" mà máy quét theo dõi). Đây là đúng loại lỗi chỉ con mắt thiết kế mới bắt được, và máy quét sạch không có nghĩa là màn hình sạch.

**Bằng chứng trực quan**: Không có ảnh chụp màn hình khả dụng trong phiên này — Assessment B mở được tab thật tại `localhost:8443/?screen=mixing` và xác nhận cây DOM tải đúng DungThuocScreen (qua `read_page`), tương tác được (đổi tab "Vận mạch", mở thẻ Noradrenaline), console sạch, mạng không lỗi 4xx/5xx — nhưng mọi lệnh chụp ảnh đều timeout vì "Browser pane không compositing frame" trong phiên đó. Không có overlay hiển thị được cho người dùng xem trong tab **[Human]** lần này; toàn bộ nhận định trực quan trong báo cáo dựa trên cây accessibility + đọc mã nguồn trực tiếp, không dựa trên hình ảnh suy diễn.

## Ấn tượng tổng thể

Màn hình này ở mức trưởng thành hiếm thấy cho một công cụ solo-dev: gần như mọi quyết định UX khó (dữ liệu thiếu thì nói rõ vì sao thay vì im lặng, hành động phá hủy có đường lui, con số liều được bảo vệ khỏi những input phi lý) đều đã được nghĩ tới ở tầng dữ liệu chứ không chỉ tầng hiển thị. Cơ hội lớn nhất không nằm ở việc thêm tính năng, mà ở việc **dọn nốt hai chỗ còn sót lại từ lần refactor an toàn màu trước** (P1) — một chỗ là thẩm mỹ/nhất quán, một chỗ là khoảng trống accessibility thật sự trên đúng hành động rủi ro cao nhất của màn hình.

## Điểm mạnh

1. **`crclNullReason` là một nguồn sự thật dùng chung** giữa `PatientPanel` (5454) và `AntibioticDoseCard` (7749) — hai nơi bác sĩ có thể thấy "CrCl không khả dụng" luôn đưa ra cùng một lý do, thay vì trôi dạt thành hai lời giải thích khác nhau (comment trong code ghi lại đây từng là lỗi thật hai lần, 2026-08-19 và 2026-08-21).
2. **Mẫu xác nhận phá hủy dùng lại xuyên suốt** — cùng hằng số thời gian (`CONFIRM_DELETE_RESET_MS`/`CONFIRM_PATIENT_RESET_MS`) và cùng hoạt ảnh thanh đếm ngược cho cả reset bệnh nhân (5556-5568) lẫn bỏ ghim thuốc (6130-6142): học một lần, dùng được ở mọi nơi khác.
3. **Chặn liều sai ngay tại nguồn tính** (`checkWeight`, `doseTargetMg` useMemo, 7767-7897) — cân nặng phi lý không chỉ bị gắn cờ cảnh báo dễ bỏ sót, mà về mặt cấu trúc không bao giờ đi tới được một con số đã nhân ra để hiển thị.

## Vấn đề ưu tiên

**[P1] Dòng "Cách dùng" pha kháng sinh vẫn dùng màu brand + bounce, vi phạm "Decoration/Diagnosis Split Rule"** — `App.tsx:8367-8380`
*Vì sao quan trọng*: Đây là hướng dẫn rút thuốc thật ("Rút 4.00 mL thuốc... + 196 mL NaCl = 200 mL"), đang được tô `var(--c-primary)` và bọc trong `pop-value` (bounce mỗi lần đổi giá trị) — đúng mẫu màu/motion mà bác sĩ đã học để đọc là "xác nhận tích cực" ở nơi khác trong app (chip chọn, tab active). `lib/doseSafety.ts:153-158` đã tự ghi chú lý do dời hẳn khỏi `--c-primary` cho kết quả tốc độ truyền ("một liều bình thường không nên trông nổi bật hơn một cảnh báo KHÔNG tương hợp đứng cạnh") — nhưng bản sửa đó chưa lan sang thẻ pha kháng sinh.
*Cách sửa*: đổi màu chữ về `var(--c-text)` (giữ nền/viền `--c-primary` nhạt như phần chrome thuần túy), bỏ `pop-value` khỏi phần tử này — con số đổi ở đây là do tính toán lại, không phải một hành động vừa thành công.
*Lệnh gợi ý*: `/impeccable polish`

**[P1] Toast hoàn tác cho hành động phá hủy lớn nhất màn hình không có `aria-live`** — `App.tsx:11452-11471`
*Vì sao quan trọng*: Gần như mọi trạng thái tạm thời khác trong file này đều bọc `aria-live` một cách có chủ đích (11+ chỗ: 5753, 8159, 9026, 10007, 10131...) — rõ ràng là quy ước ngầm của nhóm. Ngoại lệ duy nhất lại là ngoại lệ lớn nhất: toast "Đã xoá bệnh nhân... Hoàn tác" xuất hiện sau khi xác nhận 2 lần reset bệnh nhân — không `aria-live`, không `role="status"`, không dời focus. Người dùng đọc màn hình (Sam) thực hiện đúng hành động rủi ro cao nhất trên màn hình mà không nhận được tín hiệu phi thị giác nào rằng cửa sổ hoàn tác 20 giây vừa mở — lưới an toàn tồn tại về mặt hình ảnh nhưng không tồn tại với họ.
*Cách sửa*: thêm `role="status" aria-live="assertive"` vào container toast tại dòng 11453 (assertive hợp lý vì đây là cửa sổ khôi phục hẹp, có giới hạn thời gian).
*Lệnh gợi ý*: `/impeccable harden`

**[P2] Hàng chip lọc máu (6 lựa chọn) vượt ngưỡng chunking mà không phân nhóm phụ** — `App.tsx:5809-5858`
Không lọc, AKI, IHD, CRRT, SLED, PD nằm trên một hàng phẳng, luôn hiện — không thể ẩn bớt vì mọi lựa chọn đều có thể quan trọng lâm sàng, nhưng chưa có gì ngăn việc tách thành hai cụm thị giác rõ rệt (trạng thái lọc | phương thức lọc máu) để giảm chi phí quét mắt mà không bớt lựa chọn nào.
*Lệnh gợi ý*: `/impeccable layout`

**[P2] Danh sách kháng sinh mặc định vẫn hiện 8 chip, gấp đôi ngưỡng ≤4** — `App.tsx:8579, 8656-8660`
Đã là cải tiến có chủ đích từ "toàn bộ 22-23" (ghi trong lịch sử comment) — nhưng 8 vẫn nhiều để quét nhanh so với ~4-5. Đáng thử nghiệm giảm còn 5-6.
*Lệnh gợi ý*: `/impeccable layout`

**[P3] Danh sách nhảy theo bảng chữ cái chỉ xuất hiện sau khi bấm "Xem tất cả"** — `App.tsx:8789`
Người dùng quen thuộc (Alex) biết chính xác tên thuốc cần tìm vẫn phải mở rộng toàn bộ danh sách trước khi có cách nhảy nhanh, thay vì gõ thẳng vào ô tìm kiếm luôn hiện sẵn — điểm bất nhất nhỏ giữa hai đường "tìm nhanh X" trên cùng màn hình.
*Lệnh gợi ý*: `/impeccable clarify`

## Cảnh báo theo persona

**Casey (dùng một tay, phân tâm, di động)** — Được phục vụ khá tốt: mục tiêu chạm 44px được ép dùng như quy tắc nhà ngay cả khi pill hiển thị nhỏ hơn (11252-11254, 8792-8796); trạng thái sticky nghĩa là một lượt ghé Mindmap giữa ca trực không làm mất luồng chọn kháng sinh 4 bước; một vùng cuộn chung nghĩa là không có bẫy cuộn lồng nhau. Nút "Xoá bệnh nhân" đặt ở đầu thẻ, xa vùng ngón cái — đây là lựa chọn có chủ đích (làm hành động tệ nhất khó chạm hơn một chút), không phải lỗi.

**Sam (đọc màn hình / bàn phím)** — Nền tảng khá vững (inert trên lớp phủ disclaimer, aria-posinset/setsize trên kết quả tìm kiếm, dialog có focus trap) nhưng đúng vào P1 thứ hai ở trên: khoảng trống thật sự nằm ở đúng thời điểm rủi ro cao nhất. Chưa xác minh được (thiếu truy cập tương tác trực tiếp): việc mở rộng dòng "Đường truyền" trong `RunningPanel` có dời focus đúng cách hay không.

**Riley (kiểm thử biên)** — Chịu được thử thách tốt: "70abc" gõ vào ô cân nặng bị bắt và báo "app coi như CHƯA NHẬP" thay vì lặng lẽ parse thành 70; cân nặng 5000kg chặn hẳn phép tính mg/kg thay vì ra một con số đúng công thức nhưng vô lý về lâm sàng; CrCl null được tách "missing" và "rejected" nên bác sĩ đã nhập dữ liệu không bị bảo nhập lại. Điểm cần theo dõi thêm: khi 3 cảnh báo trước liều độc lập (cân nặng + RRT/AKI + CrCl) cùng nổ ra — code tự ghi nhận rủi ro này (7772-7780) và chỉ thêm dòng tiêu đề khi ≥2 cảnh báo — chưa xác minh trực quan liệu vậy đã đủ tránh bị lướt bỏ sót hay chưa.

## Quan sát nhỏ

- `PatientField`'s "Vẫn đúng" (xác nhận dữ liệu vẫn còn hiệu lực) tái dùng cơ chế set lại chính giá trị `weight` chỉ để cập nhật `updatedAt` — tận dụng khéo hạ tầng có sẵn thay vì thêm state mới; đáng ghi nhận là điểm hay, không phải lỗi.
- `NUM_DOSE` (font mono cho số liều) áp dụng có chọn lọc qua regex `highlightDoseNumbers()` chứ không in nghiêng cả câu — xác minh trực tiếp: các span liều thực sự render đúng font `JetBrains Mono`.
- Xác minh trực tiếp: không phần tử nào trên màn hình dosing thực resolve ra `--c-accent-2` (magenta) — quy tắc "chỉ dùng ở Mindmap" đang giữ đúng trong thực tế.
- Copy phân biệt "còn đúng lịch dùng không?" (thuốc ngắt quãng) và "đối chiếu lại với bơm thật" (thuốc truyền liên tục) là chi tiết tinh tế dễ bị bỏ qua — một liều vancomycin q8h và một bơm norepinephrine có ngôn ngữ "cũ dữ liệu" khác nhau vì "cũ" mang nghĩa khác với mỗi loại.
- Ở độ rộng mobile (375px), cây accessibility xuất hiện thêm một `checkbox` không thấy ở độ rộng desktop — chưa xác minh trực quan (không có ảnh chụp), chỉ ghi nhận để kiểm tra thêm, không khẳng định là lỗi.

## Câu hỏi gợi mở

- Dòng "Cách dùng" bị nêu ở P1 có lẽ là con số được đọc lại nhiều nhất lúc chuẩn bị thuốc thật — nếu vậy, nó có nên được đối xử *bình tĩnh hơn nữa* (to hơn, `--c-text`, tuyệt đối không motion) thay vì chỉ bỏ bounce, với lý do đây là điểm kiểm tra cuối cùng trước khi kim chạm vào lọ thuốc?
- Hàng chip lọc máu có nên học lại chính giải pháp mà hàng tab kháng sinh đã áp dụng — để các phương thức hiếm (SLED, PD) vào một affordance "thêm", giữ 4 lựa chọn thường gặp luôn hiện — thay vì giải hai bài toán chunking giống nhau theo hai cách khác nhau trên cùng một màn hình?
- Cổng cảnh báo bắt buộc (disclaimer gate) và trạng thái "chưa có dữ liệu bệnh nhân" hiện đang tách rời — một người dùng lần đầu (Jordan) phải vượt qua cổng pháp lý trước khi thấy được panel bệnh nhân tồn tại; gộp thành một nhịp onboarding duy nhất có giảm được cảm giác "hai màn hình trước khi thấy giá trị" mà không thêm ma sát thật không?
