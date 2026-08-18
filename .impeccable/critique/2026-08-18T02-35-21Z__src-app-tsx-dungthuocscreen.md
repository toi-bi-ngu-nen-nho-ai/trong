---
target: DungThuocScreen
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-18T02-35-21Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: a72a641ca6b438754 · B: a8b9181b610ac46e4)

## Điểm sức khỏe thiết kế

| # | Nguyên tắc (Nielsen) | Điểm | Phát hiện chính |
|---|---|---|---|
| 1 | Hiển thị trạng thái hệ thống | 3/4 | CrCl tính lại theo thời gian thực, có đồng hồ "ghim X phút trước" tự làm mới — nhưng hành vi "gõ tới khi còn đúng 1 kết quả thì tự mở" diễn ra âm thầm, không có tín hiệu nào báo đã xảy ra |
| 2 | Khớp hệ thống với thế giới thực | 4/4 | Đúng thuật ngữ lâm sàng (TTM, BTĐ, "Chỉ định", gọi thẳng tên công thức Cockcroft-Gault), phép tính liều hiện dưới dạng số học tường minh (`15–20 mg/kg × 70.0 kg = 1050–1400 mg`) |
| 3 | Quyền kiểm soát và tự do của người dùng | 3/4 | Hoàn tác 20s khi xoá bệnh nhân, 5s khi bỏ ghim thuốc, xác nhận hai bước cho mọi hành động phá huỷ — nhưng chưa có lối lùi rõ ràng giữa lúc đang ở bước chọn chỉ định ngoài việc bấm lại chip thuốc |
| 4 | Nhất quán và theo chuẩn | 2/4 | Hai "ngữ pháp thị giác" khác nhau cho cùng một khái niệm "đã bấm nút, bấm lần nữa để xác nhận": `ConfirmIconButton` (đổi icon + vòng đếm ngược tròn, 2.5s) so với "Xoá bệnh nhân" (đổi nhãn chữ + thanh cạn ngang, 20s) |
| 5 | Phòng ngừa lỗi | 4/4 | `parseStrictNumber`/`hasInvalidNumericInput` từ chối nhận số nhập sai định dạng thay vì tự ép kiểu; cổng chỉ định (indication-gating) chặn không cho hiện liều mặc định sai; cảnh báo có độ trễ để tránh nhấp nháy khi đang gõ dở |
| 6 | Nhận diện thay vì ghi nhớ | 3/4 | Tóm tắt bệnh nhân vẫn hiện khi thu gọn; RunningPanel (thuốc đang truyền) vẫn hiện xuyên suốt khi đổi tab (đã kiểm chứng trực tiếp: Vancomycin vẫn hiện khi chuyển sang tab Vận mạch) — nhưng hàng 10 tab nhóm thuốc vẫn đòi hỏi ít nhiều ghi nhớ dù đã có sắp xếp theo tần suất dùng gần đây (MRU) |
| 7 | Linh hoạt và hiệu quả sử dụng | 3/4 | Tìm xuyên suốt các tab, tab tự sắp theo MRU, tự quy đổi mg/dL↔µmol/L, tự mở khi gõ còn đúng 1 kết quả — nhưng thứ tự tab bị đóng băng cho cả phiên làm việc (`dungthuoc.tabOrder` lưu trong sessionStorage), không thích ứng thêm giữa ca trực |
| 8 | Thẩm mỹ và thiết kế tối giản | 3/4 | Disclosure giấu tốt nội dung phụ; thẻ phẳng, không đổ bóng thừa (đúng "Floating-Layer-Only Rule") — nhưng danh sách ~29 kháng sinh hiện full ngay khi mở, chỉ có tiêu đề chữ cái, không thu gọn được |
| 9 | Giúp nhận biết, chẩn đoán và khắc phục lỗi | 4/4 | Nhập "70abc" báo rõ "app coi như CHƯA NHẬP"; mục chưa có nguồn được gắn cờ "chưa ghi nguồn"; có nhắc khi dữ liệu bệnh nhân đã cũ; có báo khi cân nặng đổi sau khi đã ghim thuốc |
| 10 | Trợ giúp và tài liệu | 2/4 | Dòng nguồn/ngày rà soát đóng vai trò tài liệu lâm sàng, có gợi ý tìm kiếm một lần — nhưng không có trợ giúp trong app giải thích hành vi sắp tab theo MRU, cửa sổ hoàn tác, hay cơ chế cổng chỉ định |
| **Tổng** | | **31/40** | **Tốt (Good)** |

## Nhận định về tính đặc thù thiết kế

**Đánh giá của LLM (Assessment A)**: Đây rõ ràng là thiết kế đo ni đóng giày cho bác sĩ tính liều lúc 2 giờ sáng dưới áp lực thời gian, không phải một màn CRUD chung chung khoác áo y khoa. Bằng chứng nằm ở những quyết định nhỏ, khó giả: `parseStrictNumber` coi `"70abc"` hay `"1.2.9"` là *chưa nhập* thay vì âm thầm ép về `70`/`1.2` (một thư viện form thông thường sẽ không bận tâm việc này); luồng Vancomycin từ chối hiện bất kỳ con số liều nào cho tới khi chọn đúng chỉ định (đã xác minh trực tiếp: chọn thuốc chỉ hiện "Chọn chỉ định ở trên để tiếp tục" cho tới khi bấm "Nhiễm khuẩn huyết / sốc nhiễm khuẩn"); cảnh báo nguy cơ thoát mạch (extravasation) đặt ngay tại ô nồng độ của Noradrenaline; và việc rà tương tác/khoá chữ Y chạy trên toàn bộ danh sách thuốc đang truyền, không phải từng thuốc riêng lẻ.

**Quét tự động (Assessment B)**: `detect.mjs` quét toàn file `src/App.tsx` (exit code 2, 1 phát hiện toàn file) — phát hiện duy nhất (`design-system-color`, màu `#000` ngoài DESIGN.md, dòng 982) nằm **ngoài** phạm vi DungThuocScreen (10481–10968), thuộc `SpecialtyPicker`. Bên trong chính DungThuocScreen: **0 phát hiện** từ quét tĩnh. Detector chạy trực tiếp trên trình duyệt (`detect.js` tại `?screen=mixing`) lại bắt được 17 anti-pattern trên trang đã render: 1× `text-overflow` (tiêu đề `h1` tràn khỏi khung 26px), 6× `layout-transition` (transition trên `max-height`/`margin-top` — đây chính là cơ chế Disclosure mà DESIGN.md đã chủ động chọn và tái xác nhận, nên xem như trường hợp đã được tài liệu hoá, không phải lỗi), 4× `cramped-padding` (một số vùng 0px đệm dọc cho chữ 12–14px, có phần tử sát mép khung), 5× `undersized-ui-text` (nhãn thanh điều hướng dưới 10px) — 5 phát hiện cuối này thuộc `OfflineBar`/thanh nav chung của cả app, không phải code riêng của DungThuocScreen, nhưng luôn hiển thị khi dùng màn này.

**Bằng chứng trực tiếp trên trình duyệt**: Assessment B không chụp được ảnh màn hình (giới hạn môi trường phiên chạy nền, không phải lỗi app), nhưng đọc cây accessibility xác nhận: không có nút chỉ-icon nào thiếu tên truy cập, mọi trường trong bảng pha thuốc đều có `label` gắn kèm, tải lại trang giữa chừng (sau khi ghim Vancomycin, đang chọn dở Noradrenaline) giữ nguyên toàn bộ trạng thái bệnh nhân/tab/danh sách đang truyền/lựa chọn dở dang.

## Ấn tượng chung

Đây là một màn hình được nghĩ kỹ về mặt an toàn lâm sàng — cổng chỉ định, từ chối số nhập sai định dạng, cảnh báo tương tác chạy trên toàn danh sách — nhiều hơn hẳn mức "form nhập liệu có validate". Điểm yếu lớn nhất không phải ở chiều sâu tư duy mà ở **sự nhất quán của ngôn ngữ thị giác cho hành động phá huỷ** (hai kiểu "bấm để xác nhận" khác nhau) và ở **khả năng định vị nhanh trong danh sách dài** (29 kháng sinh không có cách nhảy nhanh dù dữ liệu nhóm theo chữ cái đã có sẵn). Cơ hội lớn nhất: gộp hai ngữ pháp xác nhận-xoá thành một, và thêm thanh nhảy chữ cái tận dụng dữ liệu đã tính sẵn.

## Điểm mạnh

- **`parseStrictNumber`/`hasInvalidNumericInput`** (quanh dòng 10622, dùng xuyên suốt `PatientPanel`): từ chối âm thầm ép kiểu số nhập sai, báo rõ bằng tiếng Việt — loại việc an toàn không hào nhoáng, dễ bị bỏ qua nhưng khó giả.
- **Khả năng chịu gián đoạn, đã kiểm chứng trực tiếp**: tải lại trang giữa chừng (đã ghim Vancomycin, đang chọn dở Noradrenaline, đã nhập sinh hiệu) vẫn giữ nguyên bảng bệnh nhân, tab đang mở, danh sách thuốc đang truyền, và cả lựa chọn dở dang. Đúng khoản đầu tư cần cho một công cụ vốn thiết kế quanh việc bị gọi/báo động cắt ngang giữa chừng.
- **Thứ bậc cảnh báo của `InfusionDrugCard`**: `highWarnings` (mức "cao") luôn hiện ngoài mọi Disclosure, trong khi liều bolus/chuẩn bị/cảnh báo phụ/nguồn dữ liệu đều gấp lại — đúng cách duy nhất để dung hoà giữa mật độ thông tin và nguyên tắc "không bao giờ giấu cờ đỏ".

## Vấn đề ưu tiên

**[P1] Lưu công thức pha ward có thể âm thầm ghi đè khi bấm nhanh hai lần**
- **Vì sao quan trọng**: `saveWard` tạo id theo `${drugId}-${Date.now()}` (độ phân giải mili-giây, quanh dòng 10729) — chính comment trong code đã thừa nhận bấm nhanh hai lần "Lưu công thức mới" có thể trùng id, âm thầm ghi đè công thức vừa lưu thay vì tạo hai bản, mà không báo lỗi gì. Đây đúng kiểu thao tác vội dễ xảy ra dưới áp lực thời gian mà app này nhắm tới.
- **Cách sửa**: dùng `crypto.randomUUID()` làm id, hoặc khoá nút lưu ~500ms sau lần bấm đầu.
- **Lệnh gợi ý**: `/impeccable harden`

**[P2] Tiêu đề dài tràn khỏi khung dù đã có truncate, và thẻ chi tiết mở ra vẫn cắt một dòng**
- **Vì sao quan trọng**: Detector đã xác nhận trực tiếp trên trình duyệt — `h1` tiêu đề (`truncate`, dòng ~10136 khu vực) tràn khỏi khung 26px. Tên thuốc/công thức pha tự đặt dài (custom) mất đuôi ngay trong thẻ chi tiết đang mở — nơi duy nhất người dùng cần đọc trọn tên — không có tooltip hay cách mở rộng.
- **Cách sửa**: cho tiêu đề trong thẻ chi tiết đang mở được xuống 2 dòng thay vì `truncate`; chỉ giữ truncate ở các chip rút gọn. Đồng thời rà lại CSS của `h1` để `truncate` thực sự chứa được nội dung thay vì vẫn tràn 26px.
- **Lệnh gợi ý**: `/impeccable layout`

**[P2] Hai ngữ pháp thị giác khác nhau cho cùng hành động "xác nhận để xoá"**
- **Vì sao quan trọng**: `ConfirmIconButton` (đổi icon + vòng đếm tròn, 2.5s) và nút "Xoá bệnh nhân" (đổi nhãn chữ + thanh cạn ngang, 20s) biểu đạt cùng một khái niệm theo hai cách khác nhau. Người dùng quen thuộc (như Alex) phải nhận diện lại mỗi lần gặp mẫu nào và còn bao nhiêu thời gian, thay vì một phản xạ đã học được.
- **Cách sửa**: hợp nhất về một ngữ pháp thị giác (ví dụ luôn là vòng đếm ngược, chỉ khác thời lượng theo mức độ rủi ro).
- **Lệnh gợi ý**: `/impeccable polish`

**[P2] Danh sách ~29 kháng sinh không có cách nhảy nhanh dù dữ liệu nhóm chữ cái đã có sẵn**
- **Vì sao quan trọng**: Danh sách "Chọn kháng sinh" hiện full ngay khi mở, chỉ có tiêu đề chữ cái đơn (A, C, D…) làm mốc — không có thanh chỉ mục dính (sticky letter-jump). Với Jordan (mới vào nghề) hay Alex giữa ca cấp cứu chỉ nhớ mang máng tên thuốc, lựa chọn duy nhất là cuộn dò hoặc gõ đúng từ khoá.
- **Cách sửa**: thêm thanh nhảy chữ cái dính cạnh ô tìm kiếm sẵn có, tận dụng luôn dữ liệu nhóm đã tính.
- **Lệnh gợi ý**: `/impeccable layout`

**[P2] Một số vùng trong bảng pha thuốc bị bó đệm (cramped padding)**
- **Vì sao quan trọng**: Detector xác nhận 4 vị trí: nội dung sát mép khung không có đệm, và 0px đệm dọc cho chữ 12–14px ở vài trường. Với văn bản lâm sàng dày đặc cần quét nhanh dưới áp lực thời gian, thiếu khoảng thở khiến mắt dễ nhầm dòng.
- **Cách sửa**: thêm đệm dọc nhất quán (~4–6px) theo thang spacing đã có trong DESIGN.md (`spacing.sm: 8px`) cho các trường này.
- **Lệnh gợi ý**: `/impeccable layout`

**[P3] Thứ tự tab đóng băng cho cả phiên làm việc**
- **Vì sao quan trọng**: `tabOrderIds` tính một lần và cache trong `sessionStorage` cho cả phiên. Nếu cách dùng thực sự đổi giữa ca (thuốc cấp cứu → thuốc an thần), hoặc điện thoại được chuyển cho đồng nghiệp khác, hàng tab vẫn giữ thứ tự cũ cho tới khi mở phiên trình duyệt mới.
- **Cách sửa**: sắp lại nhẹ theo chu kỳ (mỗi N lần dùng tab) thay vì chốt cứng theo snapshot đầu phiên.
- **Lệnh gợi ý**: `/impeccable polish`

## Cảnh báo theo persona

**Alex (bác sĩ dùng thành thạo, vội)**: Hàng 10 tab nhóm thuốc vẫn cần cuộn-và-bấm dù đã có MRU (chưa có cách nhảy 1-chạm tới mục ưa thích cố định); hai ngôn ngữ xác nhận-xoá khác nhau (vòng tròn vs. thanh cạn, nêu ở trên) khiến Alex mất một nhịp định hướng lại mỗi lần chạm; ô tìm kiếm xuyên tab phải mở lại từ đầu mỗi lần thay vì luôn sẵn sàng focus, cộng thêm một nhịp chạm+render cho người dùng "liên tục".

**Casey (dùng điện thoại một tay, hay bị cắt ngang)**: `DisclaimerGate` (sheet bắt buộc, đã xác minh trực tiếp là chặn toàn bộ nội dung qua `inert`) là thêm một cổng bắt buộc trước khi Casey — người có thể được đưa điện thoại giữa chừng cuộc trò chuyện — thấy được liều; nếu Casey bị gọi đi ngay sau khi chọn Vancomycin nhưng trước khi chọn chỉ định, chip thuốc vẫn hiện như "đã chọn/đang hoạt động" trong khi trạng thái thực là "còn thiếu một bước" ("Chọn chỉ định ở trên để tiếp tục") — liếc nhìn quay lại một tay rất dễ hiểu nhầm là đã xong; nút chọn "Đường truyền" và nút xoá "×" của thuốc đang truyền nằm sát nhau trong cụm 44px hẹp (có `w-4` để giãn cách nhưng vẫn kề nhau) — đúng chỗ dễ chạm nhầm nhất khi tay đang di chuyển/rung lắc.

**Riley (kiểm thử biên, có chủ đích)**: Tìm kiếm 0 kết quả xác nhận sạch sẽ ("Không tìm thấy thuốc phù hợp."); tải lại giữa luồng xác nhận chịu được hoàn toàn (bệnh nhân, tab, danh sách đang truyền, lựa chọn dở dang đều giữ nguyên) — cả hai đều vững. Phát hiện thật sự là lỗi trùng id công thức ward khi bấm nhanh hai lần (P1 ở trên) — một edge case mà chính đội phát triển đã biết (có comment) nhưng chưa xử lý; tên thuốc/công thức tự đặt dài cũng chưa có lối thoát nào ngoài việc mở Sửa, vì thẻ chi tiết đang mở vẫn cắt một dòng.

## Quan sát nhỏ

- Hành vi "gõ tới khi còn đúng 1 kết quả thì tự mở" trong `InfusionCategoryScreen` không có tín hiệu nào báo đã xảy ra — người gõ nhanh có thể không nhận ra thẻ đã tự mở.
- Banner gợi ý tìm kiếm một lần ("Không thấy thuốc cần tìm trong 10 nhóm?") giả định một lượt tìm thất bại chưa thực sự xảy ra — nó hiện ngay từ lần tải đầu tiên.
- Không tiếp cận được `ThemeToggle` từ trong chính DungThuocScreen (component định nghĩa ở dòng 10425 dường như không được gắn trên màn này) — chế độ tối được kiểm bằng giả lập `prefers-color-scheme`, không phải công tắc thủ công trong app.
- Việc Tailwind remap toàn bộ bảng `slate-*` sang token theme (`src/index.css` ~dòng 356–368) được xác nhận hoạt động đúng — các lớp `text-slate-500/700` trong DungThuocScreen thực sự đổi màu theo sáng/tối (đã đo màu tính toán thay đổi khi giả lập dark mode). Đáng ghi chú để không bị hiểu nhầm là vi phạm "không hex cứng" của DESIGN.md.
- Nhãn thanh điều hướng dưới (10px) là lựa chọn có chủ đích, đã ghi trong DESIGN.md và được kiểm tương phản AA — nhưng đây là code chung của cả app (`OfflineBar`), không riêng DungThuocScreen, dù luôn hiển thị khi dùng màn này; detector vẫn gắn cờ vì dưới ngưỡng 11px của nó — biết để không tưởng nhầm là lỗi của màn Dùng thuốc.
- 6 phát hiện `layout-transition` (transition trên `max-height`/`margin-top`) của detector trùng khớp với cơ chế Disclosure mà DESIGN.md đã chủ động chọn và tái xác nhận (tránh lỗi `grid-template-rows` đã tái hiện thật trên Chromium hiện đại) — nên xem là false positive so với quyết định sản phẩm đã có tài liệu, không phải việc cần sửa.

## Câu hỏi đáng suy ngẫm

- Nếu "Untouchable Signal Rule" cấm hiệu ứng bounce/glow trên trạng thái nguy hiểm, thì xác nhận xoá (vốn có bounce và rung phản hồi) thuộc vùng "chẩn đoán" hay "trang trí" — và cách làm hiện tại có thực sự đúng tinh thần quy tắc đó không?
- Việc khoá cứng thứ tự tab theo phiên để sống sót qua một lượt ghé Mindmap 5 giây cũng đồng nghĩa nó sống sót qua cả việc điện thoại được chuyển cho *một bác sĩ khác* giữa ca — đây có phải đánh đổi đã được tính trước?
- Cổng chỉ định chặn mọi con số liều cho tới khi chọn chỉ định cụ thể, áp dụng đồng loạt — điều này đã được loại trừ có chủ đích cho số ít thuốc mà từng giây thực sự quyết định (ngừng tim, phản vệ), hay đang áp dụng như nhau cho mọi thuốc trong bộ dữ liệu?
