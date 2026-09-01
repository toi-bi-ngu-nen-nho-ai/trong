---
target: DungThuocScreen
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-09-01T16-09-42Z
slug: src-app-tsx-dungthuocscreen
---
# Critique: DungThuocScreen — lượt 3, sau khi vá 10 mục qua 2 lượt (2026-09-01)

Method: dual-agent (A: design-review subagent · B: detector+browser subagent)

## Điểm sức khỏe thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|---|---|---|
| 1 | Visibility of System Status | 4 | Banner đa tab nổ trong một tick sự kiện storage; aria-live báo lại đúng mốc 15s (đo trực tiếp: rỗng ở t=12s, có chữ ở t=16s). |
| 2 | Match System/Real World | 4 | Thuật ngữ RRT (IHD/CRRT/SLED/PD), TTM đúng chuẩn, không đơn giản hoá. |
| 3 | User Control & Freedom | 4 | Hoàn tác 20s, xoá từng thuốc, đóng/tìm — kiểm chứng đầu-cuối luồng hoàn tác. |
| 4 | Consistency & Standards | 3 | Icon ghim (sao) tái dùng nhất quán về Ý NGHĨA, nhưng khác HÌNH DẠNG giữa hàng tab (chấm tròn đặc) và khung Tìm (icon trần) — cùng hành động, hai kiểu hình ảnh. |
| 5 | Error Prevention | 4 | `parseStrictNumber` chặn "70abc"; CrCl trả null thay vì số âm; xác nhận hai bước + thanh đếm cho xoá. |
| 6 | Recognition Rather Than Recall | 3 | Gợi ý icon-only tái xuất hiện sau 90 ngày (xác nhận sống trên localStorage sạch) — nhưng vẫn là gợi ý TẠM THỜI, không phải nhãn cố định. |
| 7 | Flexibility & Efficiency | 3 | Ghim thủ công + MRU + điều hướng phím mũi tên là accelerator thật; đo trực tiếp tab vừa ghim nằm đúng offset 20px, không bị cắt. Chưa có thao tác hàng loạt cho danh sách thuốc đang dùng. |
| 8 | Aesthetic & Minimalist | 3 | Luật Decoration/Diagnosis được tôn trọng đúng những gì quan sát được; hàng 10 tab vẫn là nhiều để quét cùng lúc. |
| 9 | Error Recovery | 3 | Cảnh báo cụ thể, đúng ngữ cảnh, không có hành động phá vỡ UI. |
| 10 | Help & Documentation | 2 | "Nguồn dữ liệu" theo từng thuốc + DisclaimerGate không thể bỏ qua là điểm cộng; nhưng ngoài đó không có lớp trợ giúp tìm kiếm được. |
| **Tổng** | | **33/40** | **Good — lượt đầu tiên KHÔNG còn P0/P1, chỉ còn vấn đề mức polish (P2/P3)** |

Applicable max: 40 (không heuristic nào n/a).

## Design Specificity Verdict

**LLM**: Không thể tái sử dụng cho sản phẩm khác mà không viết lại phần lớn — công thức CrCl hiệu chỉnh IBW/ABW, làm tròn theo hàm lượng lọ thực tế ("Cho 750 mg · đích 615 mg"), máy tính liều↔tốc độ hai chiều với 6 đơn vị quy đổi, cảnh báo thoát mạch/đường trung tâm, cửa sổ ổn định sau pha ("Dùng trong 24 giờ... Bỏ ngay nếu đổi màu") — tất cả đều mang tải trọng lâm sàng thật, không trang trí. Header tối giản icon, ngữ cảnh bệnh nhân dùng chung xuyên tab, hoàn tác 20 giây đều đọc như quyết định thiết kế chống lại một kịch bản ngắt quãng tại giường thật, không phải chrome app chung chung.

**Deterministic scan**: 1 phát hiện, ngoài phạm vi (dòng 943, `#000` trong mask CSS, không liên quan DungThuocScreen 11343-12237). **Trong phạm vi: 0 phát hiện tĩnh.**

**Overlay**: 6 dòng qua 3 luật. `body-text-viewport-edge` (1, dòng subtitle "Kính lúp = Tìm thuốc...") — **dương tính giả xác nhận bằng đo đạc**: luật chỉ kiểm màu nền của chính phần tử để miễn trừ "full-bleed", không kiểm padding riêng của nó — dòng chữ có `padding 20px` thật, không tràn viewport, chỉ là hộp chứa nó chạm mép. `cramped-padding` (1, nút "Thêm kháng sinh tự nhập") — **dương tính giả, đúng khuôn mẫu đã ghi nhận nhiều lượt**: `h-11` cố định + `items-center`, không phải chật thật. `layout-transition` (3, các khối Disclosure) — **thật, nhưng là mẫu chia sẻ đã biết từ trước**, không phải mã mới.

## Ấn tượng chung

Đây là lượt đầu tiên trong chuỗi **không còn phát hiện nào ở mức P0/P1** — cả hai lỗ hổng an toàn dữ liệu (CrCl/tóm tắt bị cắt, race đa tab) đều được cả hai assessment độc lập xác nhận đứng vững qua kiểm tra trực tiếp (Assessment A tự đo DOM: tab vừa ghim nằm đúng offset 19.97px, không bị cắt; banner đa tab tách biệt rõ màu với banner "dữ liệu cũ"; aria-live báo đúng mốc 15 giây). Những gì còn lại đều là polish: nhất quán hình ảnh giữa hai nơi cùng làm một việc (ghim), và một gợi ý còn mang tính tạm thời thay vì nhãn cố định. Đáng chú ý: Assessment B độc lập tự đo lại vụ "smooth-scroll không chạy" và đi đến ĐÚNG kết luận đã ghi trong code — môi trường test (tab bị coi là không hiển thị) chặn animation, không phải lỗi ứng dụng — một xác nhận chéo tốt cho quyết định kỹ thuật đã chọn ở lượt trước.

## Điểm mạnh

1. **Banner đa tab tách biệt rõ ràng, kiểm chứng bằng tay**: Assessment A tự mở tab thứ hai, ép race, xác nhận banner đỏ "Dữ liệu bệnh nhân vừa đổi từ một tab khác" đứng cạnh banner hổ phách "Cân nặng đã đổi 70→99 kg" trong CÙNG một màn hình, không lẫn màu.
2. **Bản vá cuộn-tới-tab-vừa-ghim đúng như công bố** — đo bằng `getBoundingClientRect()` trực tiếp, không chỉ nhìn: offset trái 19.97px, đúng khớp `px-5` (20px) dự kiến, nằm trọn trong hàng.
3. **Minh bạch làm tròn liều** ("Cho 750 mg · đích 615 mg") — một chi tiết nhỏ nhưng nhiều máy tính liều lâm sàng khác bỏ qua, phục vụ đúng yêu cầu "không làm tròn âm thầm" của sản phẩm này.

## Vấn đề ưu tiên

**[P2] Cùng hành động "ghim" nhưng hai hình dạng khác nhau ở hai nơi**
- Gì: nút ghim ở hàng tab chính là chấm tròn đặc `--c-primary-strong`; nút ghim cùng ý nghĩa trong danh sách khung Tìm chỉ là icon trần không nền.
- Vì sao quan trọng: người dùng quen mẫu hình theo hình dạng/màu nền — cùng một hành động không "trông giống chính nó" ở hai chỗ chỉ cách nhau vài chạm, phá tính nhất quán (Heuristic 4).
- Sửa: cho nút ghim trong khung Tìm cùng kiểu chấm tròn đặc như hàng tab, hoặc có lý do rõ ràng nếu cố tình khác.
- Lệnh gợi ý: `/impeccable layout`

**[P2] Gợi ý icon-only vẫn là hint tạm thời (dù đã tái-xuất-hiện sau 90 ngày), không phải nhãn cố định**
- Gì: Assessment A đề xuất cụ thể hơn bản vá trước — thay vì chỉ tái-xuất-hiện, cân nhắc một caption 10px LUÔN HIỆN dưới icon, giống đúng mẫu nhãn bottom-nav đã có sẵn trong app, thay vì một gợi ý sẽ luôn có lúc biến mất.
- Vì sao quan trọng: máy trực chia sẻ nhiều bác sĩ luân phiên — một người vào ca giữa "cửa sổ 90 ngày im lặng" vẫn có thể gặp hai icon trần không chữ.
- Đây là đề xuất mở rộng hơn phạm vi bản vá P2 lượt trước, cần quyết định của bạn trước khi làm.
- Lệnh gợi ý: `/impeccable clarify`

**[P3] Nút ghim-sao chèn vào giữa `tablist` chưa được đánh dấu loại trừ khỏi ngữ nghĩa tab theo ARIA APG**
- Gì: nút ghim nằm trong luồng flex của container `role="tablist"` nhưng không có `role`/thuộc tính nào tách nó khỏi ngữ nghĩa "tab" — trình đọc màn hình đọc xen "sao, ghim nhóm X" giữa các tab thật.
- Vì sao quan trọng: không chặn thao tác, nhưng lệch khỏi hướng dẫn ARIA APG cho việc chèn control không-phải-tab vào một tablist.
- Lệnh gợi ý: `/impeccable audit`

**[P3] Hai chevron mở/đóng lồng nhau trong khung bệnh nhân (mở cả khung vs mở khối Creatinin/CrCl) có thể gây nhầm lẫn**
- Gì: Assessment A ghi nhận độ tin cậy THẤP, chưa test kỹ — hai affordance chevron ở hai cấp lồng khác nhau nhìn khá giống nhau.
- Lệnh gợi ý: `/impeccable clarify` (chỉ nếu muốn xác minh thêm, không cấp bách)

## Cảnh báo theo persona

**Casey** (di động, hay ngắt quãng): bối cảnh bệnh nhân sống sót qua chuyển tab (đã xác nhận: 82kg/178cm/Nam/71/CrCl49 giữ nguyên khi đổi từ Kháng sinh sang Vận mạch) — điểm đạt, không phải cờ đỏ. Ghi nhận lại: "Xoá bệnh nhân" cố ý khó với hơn (quyết định đã xác nhận với chủ dự án) cũng đồng thời làm chậm đúng Casey đang cần xoá nhanh giữa hai ca — không phải lỗi, nhưng đáng xác nhận lại định kỳ khi cách dùng thực tế đổi.
**Sam** (tiếp cận): `aria-live` dùng đúng "polite" cho tính lại thường ngày, "assertive" chỉ cho khoảnh khắc phá huỷ/khẩn — xác nhận trực tiếp mốc 15s. Cờ đỏ: nút ghim chèn vào tablist chưa tách khỏi ngữ nghĩa tab cho trình đọc màn hình (xem P3 trên).
**Alex** (thành thạo): ghim thủ công + điều hướng phím mũi tên là accelerator thật, đã kiểm qua code path. Cờ đỏ nhỏ: chưa có thao tác hàng loạt cho danh sách "Đang dùng" (từng xoá một) — không cấp bách với danh sách thường 1-3 thuốc, nhưng đáng lưu ý cho ICU 5+ thuốc truyền cùng lúc.

## Quan sát phụ

- "Không thấy thuốc trong 10 nhóm? Tìm xuyên tất cả" — liên kết ngữ cảnh xuất hiện đúng lúc danh sách thuốc đang dùng rỗng, một chi tiết khám phá tốt không nằm trong danh sách 10 mục đã vá.
- Assessment A thử ép lại banner đa tab bằng 4 sự kiện input giả lập nhanh trong CÙNG một tab — có xảy ra một lần, nhưng không lặp lại được với nhịp gõ thực tế hơn (150ms/trường). Gắn cờ độ tin cậy THẤP, chưa hành động — đáng một lượt kiểm nhanh với hành vi dán/tự-điền thật, không phải việc cần làm ngay.
- Một ảnh chụp cho thấy khoảng trắng bất thường giữa khối Creatinin đã gấp và "Chọn kháng sinh", nhưng đo DOM trực tiếp ngay sau đó không thấy khoảng trống đó — quy về lỗi hiển thị của pipeline chụp ảnh trong môi trường test, không tính là phát hiện thật.
- Cả hai assessment độc lập đều gặp và tự chẩn đoán đúng hiện tượng "smooth-scroll không chạy trong tab bị coi là ẩn" — không phải lỗi ứng dụng, đã có xử lý đúng trong code từ lượt trước.

## Câu hỏi gợi mở

- Nút ghim ở hàng tab chính là chấm tròn đặc, khung Tìm là icon trần — có lý do có chủ đích cho khác biệt này, hay chỉ là hai nơi được xây tách rời không đối chiếu nhau?
- Gợi ý icon-only tái-xuất-hiện sau 90 ngày hay chuyển hẳn thành nhãn cố định (như bottom-nav) — cái nào đúng hơn cho một máy trực nhiều bác sĩ luân phiên, đổi lấy việc header luôn tốn thêm một chút chiều cao?
- MRU tự sắp lẫn ghim thủ công là hai tín hiệu sắp xếp cạnh tranh nhau — giờ đã có ghim, MRU còn đáng giữ, hay một mô hình "3 ghim + phần còn lại theo abc" đơn giản hơn để suy luận?
