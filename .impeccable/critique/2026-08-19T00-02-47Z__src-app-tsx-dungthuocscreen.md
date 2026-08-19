---
target: "DungThuocScreen (src/App.tsx:10740-11248)"
total_score: 35.5
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-19T00-02-47Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: general-purpose/sonnet · B: general-purpose/sonnet)

## Điểm sức khoẻ thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 3 | Bước "Chỉ định" xuất hiện không có `aria-live` báo cho trình đọc màn hình; không có mốc kiểu "bước 2/3" khi chọn kháng sinh lần đầu |
| 2 | Match System / Real World | 4 | Không có vấn đề — thuật ngữ lâm sàng dùng đúng cách bác sĩ nghĩ (CrCl, IHD/CRRT/SLED/PD, "Đường truyền") |
| 3 | User Control and Freedom | 4 | Hai lần bấm + hoàn tác 20s cho xoá bệnh nhân, hoàn tác cho bỏ ghim thuốc — đã kiểm chứng khôi phục đúng nguyên trạng |
| 4 | Consistency and Standards | 3.5 | Cùng một chuỗi liều dùng JetBrains Mono ở thẻ liều nhưng KHÔNG ở bảng "Đang truyền" (bàn giao ca) — xem P1 |
| 5 | Error Prevention | 4 | `parseStrictNumber` chặn "70abc" thay vì âm thầm cắt còn 70; cổng chặn liều vượt trần tuyệt đối |
| 6 | Recognition Rather Than Recall | 3 | Lần dùng đầu (0 lịch sử), 10 tab xếp theo alphabet, rộng 937px trên khung 375px — xem P2 |
| 7 | Flexibility and Efficiency | 3.5 | Tìm xuyên tab, tự chọn đường dùng khi chỉ có 1 lựa chọn — nhưng bước "Chỉ định" thì không (P3) |
| 8 | Aesthetic and Minimalist Design | 3.5 | Hai cảnh báo advisory từ detector (tràn tiêu đề, chip thiếu đệm dọc) — kiểm tra mã nguồn thì cả hai đều là false positive, không trừ điểm thêm |
| 9 | Error Recovery | 4 | Thông báo liều vượt trần chỉ thẳng 2 nguyên nhân thật (nhầm đơn vị, lệch dấu thập phân) + nút "Dùng lại công thức chuẩn" |
| 10 | Help and Documentation | 3 | "Nguồn dữ liệu — chưa ghi nguồn" trung thực nhưng không có lối tắt nào cho việc "vậy giờ làm gì" |
| **Tổng** | | **35.5/40** | **Tốt (Good), sát ngưỡng Xuất sắc** |

Xu hướng 5 lần gần nhất cho slug `src-app-tsx-dungthuocscreen`: **36 → 31 → 34 → 36 → 34 → 35.5** (trên 40). Ổn định quanh vùng "Tốt", không có P0 lần nào trong 6 lần chấm gần nhất.

## Nhận định về tính đặc thù thiết kế

**Đánh giá của LLM (Assessment A)**: Đây không phải một app danh sách-và-form chung chung khoác áo y khoa. Bằng chứng nằm ở những chi tiết chỉ một công cụ tính liều tại giường mới cần và không ai buồn xây trừ khi đã từng đứng ở đó: kết quả tốc độ bơm bị **giữ lại không hiện** phía sau nút "Tôi đã kiểm tra lại — vẫn muốn xem kết quả" khi liều vượt trần tuyệt đối của thuốc (App.tsx:9950-9965, doseSafety.ts:96); ước tính "hết dịch truyền sau bao lâu" tính kèm tốc độ bơm để biết lúc nào cần treo túi mới; một dòng nhật ký tự động ghi lại lý do khi ai đó vượt qua cổng chặn nguy hiểm; cửa sổ hoàn tác 20 giây cho "xoá bệnh nhân" được giải thích thẳng trong bình luận mã là để chống "một cuộc gọi cắt ngang giữa chừng"; và ô CrCl hiện "—" thay vì một con số tính-được-nhưng-không-đáng-tin đứng cạnh tên thuốc. Không có gì trong số này là trang trí gắn thêm vào một cái form — tất cả đều được lập luận trong bình luận mã bằng đúng cơ chế sai sót lâm sàng mà nó ngăn chặn.

**Quét tự động (Assessment B)**: `detect.mjs --json src/App.tsx` chạy trên toàn file 11.400 dòng, thoát mã 2 (có phát hiện), tổng 1 phát hiện — một màu `#000` chưa khai trong DESIGN.md ở dòng 983, **nằm ngoài phạm vi DungThuocScreen** (màn Trang chủ). Vòng quét CLI tĩnh không có phát hiện nào trong phạm vi màn hình này.

Vòng tiêm script phát hiện trực tiếp trên trình duyệt (đã inject `detect.js` qua live-server, đọc console) tìm được nhiều hơn ở các trạng thái tương tác — chi tiết và kết luận false-positive/thật ở mục Vấn đề ưu tiên bên dưới. Không có overlay hiển thị cho người dùng được để lại (live-server đã dừng sau khi B hoàn tất).

## Ấn tượng chung

Màn "Dùng thuốc" là nơi thể hiện rõ nhất tại sao app này không phải UpToDate thu nhỏ: an toàn lâm sàng được thiết kế thành cơ chế (cổng chặn vật lý, hoàn tác có hạn giờ, parse số nghiêm ngặt) chứ không phải màu sắc trang trí. Điểm yếu lớn nhất không nằm ở ý tưởng mà ở một chỗ thực thi không nhất quán với chính quy tắc app tự đặt ra: con số liều dùng — thứ DESIGN.md gọi là "quan trọng hơn bất kỳ đâu khác trên màn" — lại KHÔNG dùng font Mono ở đúng nơi một bác sĩ trực khác sẽ liếc lại nhiều lần nhất (bảng bàn giao ca). Cơ hội lớn nhất: khoá lại tính nhất quán typography-cho-số ở mọi nơi con số liều xuất hiện, không chỉ nơi nó được tính ra lần đầu.

## Điểm mạnh

1. **Cổng chặn-rồi-xác nhận cho liều nguy hiểm (App.tsx:9950-9965).** Thay vì tô đỏ một con số, màn từ chối tính-và-hiện cho đến khi người dùng chủ động xác nhận "đã kiểm tra". Đây là một tư thế an toàn khác về bản chất (không chỉ tốt hơn) so với chỉ tô màu — và được ghi tự động vào nhật ký kèm lý do khi bị vượt qua.
2. **Khả năng chịu gián đoạn là ràng buộc thiết kế hạng nhất, không phải suy nghĩ sau.** Hoàn tác 20 giây cho xoá bệnh nhân, giữ nguyên số đang đếm khi tab bị ẩn (`document.hidden`), trạng thái chọn nhiều bước sống sót qua việc rời-quay lại màn — tất cả được biện minh trong bình luận bằng chính kịch bản "máy nhắn tin kêu giữa chừng", và đã kiểm chứng trực tiếp: hoàn tác khôi phục đúng cả thuốc đã ghim lẫn thông số bệnh nhân.
3. **Trung thực về nguồn dữ liệu thay vì làm cho dữ liệu chưa đầy đủ trông có vẻ đáng tin.** "Chưa ghi nguồn", "CHƯA đối chiếu tài liệu gốc", ô CrCl hiện "—" khi không đủ dữ liệu thay vì một số tự tin nhưng sai — đây là lựa chọn xây dựng lòng tin, đánh đổi một chút bóng bẩy lấy sự đúng đắn.

## Vấn đề ưu tiên

**[P1] Số liều ở bảng "Đang truyền" (bàn giao ca) không dùng font Mono, ngược chính quy tắc DESIGN.md**
- **Vì sao quan trọng**: `RunningPanel` được bình luận rõ là bảng "bàn giao ca" (App.tsx:5920-5923). Nó render `r.doseText`/`r.rateText` bằng text thường (`T.meta`, Plus Jakarta Sans — đã xác minh bằng `getComputedStyle` khi chạy thật, App.tsx:6068-6072). Nhưng CHÍNH chuỗi đó (`tier.dose`), khi hiện trong thẻ liều, lại được đưa qua `highlightDoseNumbers()` để tô Mono (App.tsx:8169, lib/ui.ts:60-62). Đây là con số một bác sĩ trực khác liếc lại nhiều lần nhất lúc bàn giao ca — đúng trường hợp DESIGN.md nêu tên khi giải thích vì sao Mono tồn tại.
- **Sửa**: route `r.doseText`/`r.rateText` qua `highlightDoseNumbers()` + `dangerouslySetInnerHTML`, giống cách đã làm ở App.tsx:8169.
- **Lệnh đề xuất**: `/impeccable typeset`

**[P2] `.pulse-scale` (nảy khi đổi tab) là hoạt ảnh duy nhất không tôn trọng `prefers-reduced-motion`**
- **Vì sao quan trọng**: index.css có 5 khối `@media (prefers-reduced-motion: reduce)` riêng (dòng 592, 680, 738, 754, 801) phủ `.pop-value`, `.rise-in`, `.fade-in`, `.pulse-glow`, `.disc-body` — bằng chứng đã có sự cẩn trọng trước đó — nhưng `.pulse-scale` (App.tsx:11153, index.css:571-577) bị bỏ sót, xác nhận bằng grep toàn file. Đây lại là hoạt ảnh chạy trên cử chỉ thường xuyên nhất màn hình: đổi giữa 10 nhóm thuốc.
- **Sửa**: thêm `.pulse-scale` vào khối reduced-motion tại index.css:592 (hoặc khối riêng theo mẫu `.pop-value` ở 801-809).
- **Lệnh đề xuất**: `/impeccable animate`

**[P2] Lần dùng đầu tiên, hàng 10 tab xếp theo alphabet và rộng 937px trên khung 375px**
- **Vì sao quan trọng**: Cả hai assessment độc lập đo được cùng một số: `sortByUsage` với lịch sử rỗng rơi về thứ tự khai báo (gần như alphabet) thay vì ưu tiên lâm sàng, và hàng tab đo `scrollWidth` 937px trong viewport 375px — chỉ ~4/10 tab thấy được không cần cuộn. Một máy mới cài hoặc điện thoại đưa cho bác sĩ trực thay ca không có gợi ý nào ngoài mẹo "Tìm" hiện một lần.
- **Đính chính một phát hiện của Assessment B**: B báo "không có dải mờ báo hiệu cuộn được" — kiểm tra mã nguồn thì SAI: có 2 `div` gradient tại App.tsx:11164-11165 (`linear-gradient` qua inline `style`, không phải class Tailwind nên bộ dò regex của B bỏ sót). Vấn đề thật chỉ là thứ tự tab, không phải thiếu affordance cuộn.
- **Sửa**: gieo một thứ tự mặc định ưu tiên lâm sàng (vd Kháng sinh/Vận mạch trước Giải độc/Khác) cho trường hợp 0-lịch-sử, thay vì thứ tự khai báo thuần tuý.
- **Lệnh đề xuất**: `/impeccable onboard`

**[P2 — cần xác minh thêm] 6 cặp che khuất văn bản trong khung bệnh nhân, phát hiện ở trạng thái kết hợp hiếm**
- **Phát hiện**: Khi mở rộng khung bệnh nhân + mở ô tìm xuyên tab cùng lúc + đang ở tab Vận mạch, script dò đo được (qua `getBoundingClientRect` thật, không phải suy đoán) 6 cặp che phủ 33-96%: nhãn "Tuổi"/"Giới tính", nút "Nam"/"Nữ", nhãn "Creatinin", nút "mg/dL" — bị một phần tử khác (mô tả khớp hình dạng nút `dose-press` hoặc một thẻ `<p>` giống `DisclaimerBar`) che lên trên.
- **Vì sao chưa chắc là lỗi thật**: Theo mã nguồn, `DisclaimerBar` nằm TRÊN `PatientPanel` theo dòng chảy tài liệu bình thường (App.tsx:11184-11185, không có `absolute`/`fixed`) — không có lý do hình học để nó che nút bên dưới. B cũng phải gọi thẳng React prop `onClick` (không phải cử chỉ chạm thật) để mở khung bệnh nhân và ô tìm cùng lúc, và không có ảnh chụp màn hình thật để đối chiếu (`computer` tool không compositing được trong phiên này). Rất có thể là kết quả đo giữa lúc DOM chưa ổn định sau thao tác giả lập, nhưng 6 cặp số đo cụ thể đủ đáng để không bỏ qua hoàn toàn.
- **Đề xuất**: chạy `/impeccable audit` với thao tác chạm thật (không qua prop injection) để xác nhận trước khi coi đây là lỗi chắc chắn.
- **Lệnh đề xuất**: `/impeccable audit`

**[P3] Bước "Chỉ định" không tự chọn khi chỉ có đúng 1 lựa chọn, trong khi bước "Đường dùng" thì có**
- **Vì sao quan trọng**: `autoEntry` tự chọn đường dùng khi chỉ có 1 lựa chọn hợp lệ (App.tsx:8572), nhưng `diseaseChoice` luôn bắt đầu `null` kể cả khi `diseasesForGroup.length === 1` — bất đối xứng này tốn thêm một lần chạm không rõ mang lại lợi ích an toàn nào, trong một app định vị là "tra cứu nhanh một tay lúc trực".
- **Sửa**: xác nhận với chủ dự án đây có chủ đích (buộc xác nhận chỉ định như một bước an toàn) hay chỉ là thiếu sót — nếu chủ đích, thêm một dòng bình luận theo đúng phong cách chú thích dày đặc sẵn có của file để tránh bị "sửa" nhầm sau này.
- **Lệnh đề xuất**: `/impeccable clarify`

## Cờ đỏ theo persona

**Alex (power user, sốt ruột)**: Tìm xuyên tab hoạt động tốt — gõ "adren" ra 3 kết quả kèm gợi ý đường dùng, bấm vào nhảy thẳng tới thẻ liều, khung bệnh nhân tự gấp lại. Điểm cấn: Alex đã biết chắc thuốc vẫn phải chạm qua bước "Chỉ định" dù chỉ có 1 lựa chọn (P3) — một khoản thuế nhỏ cho người muốn zero thao tác thừa. Sắp xếp tab theo tần suất dùng là một điểm cộng thật sự cho đúng kiểu người dùng lặp lại như Alex.

**Casey (một tay, dễ bị gián đoạn, di động)**: Vùng chạm 44px, chip "Đường truyền" gấp còn 1 dòng cho tới khi chạm (App.tsx:5949-5951, sửa có chủ đích để tránh hàng chật), mẫu hai-lần-chạm-cộng-thanh-đếm-ngược cho hành động phá huỷ — đều hợp với ngữ cảnh một tay dễ gián đoạn. Rủi ro duy nhất: nếu Casey chạm nhầm "Xoá bệnh nhân", bị cuộc gọi cắt ngang hơn 20 giây rồi quay lại — cửa sổ hoàn tác đã hết và việc xoá đã chạy âm thầm. Đây là đánh đổi đã được cân nhắc trong bình luận mã (10 giây từng bị coi là quá ngắn), không phải phát hiện mới, nhưng đáng nêu vì Casey chính là persona nó nhắm tới.

**Sam (phụ thuộc trợ năng)**: Điểm cộng cụ thể: `aria-live="polite"` + `aria-atomic="true"` bọc CẢ HAI nhánh của cổng chặn liều (App.tsx:9946-9949) — cố ý để trình đọc màn hình không im lặng khi kết quả bị ẩn sau cổng xác nhận; `aria-posinset`/`aria-setsize` trên kết quả tìm; `inert` trên nội dung nền khi `DisclaimerGate` mở thay vì chỉ dựa vào `aria-modal`. Khoảng trống cụ thể: hàng chip "Chỉ định" xuất hiện sau khi chọn thuốc không có `aria-live` — người dùng trình đọc màn hình không được báo có bước bắt buộc mới xuất hiện bên dưới, khác với ô CrCl vốn tự báo khi đổi.

## Quan sát nhỏ

- Dòng "Cân nặng dùng để tính: 70.0 kg — lấy từ khung 'Bệnh nhân hiện tại'" trong máy tính truyền là một cách minh bạch nguồn gốc số liệu hay — bảng "Đang truyền" chưa làm điều tương tự khi tốc độ đã ghim có thể đã lỗi thời.
- `resetPatient()` tự mở lại khung bệnh nhân (App.tsx:10943) nhưng hoàn tác không tự gấp lại — một điểm gợn nhỏ về tính nhất quán trạng thái, không sai nhưng hơi lệch quy tắc "chỉ tự gấp khi đã có dữ liệu" ở nơi khác.
- Nền tô `primary-soft` của ô CrCl khi dùng được (App.tsx:5765) — chữ đúng màu trung tính theo bình luận mã, nhưng màu nền tô vẫn đáng để soi lại một lần nữa với quy tắc "màu primary chỉ dành cho chrome/điều hướng, không phải con dấu 'ổn' cho một số lâm sàng" — hiện tại biện minh được (đây là "số dùng được" chứ không phải "liều an toàn"), nhưng đáng ghi lại.
- Hai phát hiện advisory từ detector hoá ra false positive khi đối chiếu mã nguồn: (1) `h1` tiêu đề "tràn 27px" — thực ra `h1` đã có class `truncate` (App.tsx:1080), `scrollWidth > clientWidth` là hành vi ĐÚNG của việc cắt-bằng-ellipsis, không phải chữ tràn nhìn thấy được; (2) "chip thiếu đệm dọc" — `CHIP` (lib/ui.ts:113) căn giữa chữ bằng chiều cao cố định `h-11`, không phải bằng padding, nên "0px padding dọc" là đúng thiết kế chứ không phải lỗi.
- Phát hiện của B rằng tab đang chọn co xuống 35×69px (dưới ngưỡng chạm 44px) do `transform: scale(0.8)` giữa hoạt ảnh `pulse-scale` — rất có thể là hiện tượng "kẹt khung hình" do browser pane trong sandbox này không compositing (`computer` tool báo lỗi "Browser pane is not displayed" suốt phiên B; Assessment A độc lập gặp và loại bỏ đúng hiện tượng tương tự sau khi xác minh bằng `document.hidden`). Không tính là phát hiện thật, nhưng đáng kiểm lại bằng ảnh chụp thật trên thiết bị nếu nghi ngờ.
- `undersized-ui-text` (5 nhãn 10px) và màu `#000` chưa khai ở dòng 983 nằm ngoài phạm vi màn hình này (thanh điều hướng dưới toàn app, màn Trang chủ) — không tính vào điểm/ưu tiên ở trên.

## Câu hỏi gợi mở

1. Cổng chặn liều vượt trần tuyệt đối — pattern rất mạnh — có áp dụng cho MỌI đường liều có thể vượt trần không (liều bolus, trần liều đơn tối đa của kháng sinh), hay chỉ ở nhánh máy tính truyền tĩnh mạch đã kiểm thử? Nếu chỉ áp dụng cho máy tính truyền, đây là một P1 lớn hơn mọi thứ liệt kê ở trên.
2. Toàn bộ mô hình an toàn của màn này dựa vào việc bối cảnh bệnh nhân (một CrCl/cân nặng dùng chung) là ĐÚNG — nếu hai bác sĩ dùng chung một máy, có tín hiệu nào báo "đây là bệnh nhân nào" ngoài dòng tóm tắt số, để tránh một người âm thầm ghi đè bệnh nhân đang nhập dở của người kia?
