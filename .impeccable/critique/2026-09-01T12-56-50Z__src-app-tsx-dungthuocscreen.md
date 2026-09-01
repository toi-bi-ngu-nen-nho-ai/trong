---
target: DungThuocScreen
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-09-01T12-56-50Z
slug: src-app-tsx-dungthuocscreen
---
# Critique: DungThuocScreen — lượt sau khi vá 5 mục (2026-09-01)

Method: dual-agent (A: design-review subagent · B: detector+browser subagent)

## Điểm sức khỏe thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|---|---|---|
| 1 | Visibility of System Status | 4 | Banner "đổi từ tab khác" + banner "cân nặng đã đổi từ lúc ghim" đều nổ đúng lúc test tay; CrCl đếm dần, aria-live hoạt động. |
| 2 | Match System/Real World | 4 | Thuật ngữ lâm sàng đúng chuẩn, không bị đơn giản hoá cho đối tượng không phải sinh viên. |
| 3 | User Control & Freedom | 3 | Hoàn tác 20s reset bệnh nhân, bỏ ghim/gỡ bất kỳ lúc nào — chưa rà phím Esc cho mọi modal/sheet. |
| 4 | Consistency & Standards | 4 | `CHIP`/`FIELD`/`dose-press` và token warn/danger dùng nhất quán mọi thẻ đã kiểm. |
| 5 | Error Prevention | 4 | Test tay tuổi=200: CrCl trả "—" đúng, không bịa số âm, kèm câu giải thích rõ. |
| 6 | Recognition Rather Than Recall | 3 | Nút icon-only "Tìm"/"Nhật ký" chỉ có MỘT gợi ý trong đời máy — xem P2 dưới. |
| 7 | Flexibility & Efficiency | 4 | MRU + ghim thủ công + điều hướng phím mũi tên + công thức khoa phòng đã lưu — accelerator thật. |
| 8 | Aesthetic & Minimalist | 3 | Mật độ cao là lựa chọn domain có chủ đích (DESIGN.md), quản lý tốt qua Disclosure; hàng 10 tab vẫn dày. |
| 9 | Error Recovery | 4 | Thông báo cụ thể, nêu đúng thứ thiếu ("Cần nhập tuổi để tính"), không chung chung. |
| 10 | Help & Documentation | 1 | Không có lớp trợ giúp tìm kiếm được cho CƠ CHẾ của app (ghim, nhật ký) ngoài 2 gợi ý một-lần. |
| **Tổng** | | **34/40** | **Good — CrCl/race đa tab đã vá thật, nhưng cùng lớp lỗi "cắt âm thầm" còn ở tuổi/chiều cao/cân nặng** |

Applicable max: 40 (không heuristic nào n/a).

## Design Specificity Verdict

**LLM (Assessment A)**: Rõ ràng được thiết kế riêng cho sản phẩm này, không phải khung chung dán lại. Bằng chứng: toán Cockcroft-Gault có hiệu chỉnh cân nặng béo phì, logic bậc liều theo RRT/CRRT/SLED/PD, kiểm tương hợp Y-site, toán bơm tiêm (nồng độ/thể tích/thời gian) kèm "liều thực nhận sau làm tròn". Bản thân comment trong code là một cuốn sổ lịch sử thiết kế — hàng chục ghi chú trích dẫn đúng ngày và mã P0–P3 của các lượt `/impeccable critique` trước, bao gồm cả bản vá 2026-09-01 (chặn ghi đè đa tab) mà A tự tay kiểm chứng lại sống. Không có gì ở đây — mô hình "bệnh nhân hiện tại", luật "Untouchable Signal", thứ tự tab theo MRU — là thứ có thể lắp vào một sản phẩm khác.

**Deterministic scan (Assessment B)**: `detect.mjs` → 1 phát hiện, ngoài phạm vi (dòng 943, `SpecialtyPicker`, dương tính giả — `#000` là điểm dừng CSS mask). **Trong phạm vi DungThuocScreen (dòng 11301–12114)/ScreenHeader: 0 phát hiện tĩnh.**

**Overlay trực quan**: injection chạy được (dù môi trường lần này chỉ cho 1 tab trình duyệt, bị cả hai assessment dùng chung — B đã tự phát hiện và báo cáo trung thực việc này, nên vài quan sát về trạng thái UI cụ thể có thể lẫn giữa hai lượt thao tác). 6 phần tử/7 dòng phát hiện qua 4 luật: `layout-transition` (3, các khối Disclosure đã biết, mức advisory), `line-length` (1, đoạn disclaimer dài), `cramped-padding` (1 — nút "Thêm kháng sinh tự nhập", **đã xác minh lại là dương tính giả**: `h-11` cố định + `items-center` canh giữa, không phải chật thật — cùng dương tính giả đã ghi nhận ở lượt trước), `overused-font` (1, một font chủ đạo dùng nhất quán, độ tin cậy thấp là lỗi thật). Không còn phát hiện `text-occlusion`/`undersized-ui-text` giả như lượt trước (vì lượt này không quét lại bottom-nav/trạng thái transition giữa chừng).

## Ấn tượng chung

Hai bản vá an toàn dữ liệu (CrCl không còn bị cắt, banner race đa tab) đều được xác nhận sống bởi cả hai assessment độc lập — đúng như thiết kế. Nhưng Assessment A bắt được đúng điều đáng lo nhất về mặt hệ thống: bản vá CrCl chỉ khoanh vùng đúng MỘT trường (theo đúng phạm vi P1 gốc), còn tuổi/chiều cao/cân nặng vẫn nằm trong chuỗi `truncate` cũ và vẫn bị cắt âm thầm ở 375px — cùng LỚP lỗi, chưa lan hết. Điểm 34/40 thấp hơn lượt trước (37/40) không phải nhiễu ngẫu nhiên giữa các reviewer lần này — có một nguyên nhân cụ thể, xác minh được: một finding thật, mới, hợp lý bị lượt vá trước bỏ sót vì phạm vi vá hẹp hơn cần thiết.

## Điểm mạnh

1. **Chốt chặn toàn vẹn dữ liệu đa tab** (`usePatientVitals`, `src/lib/patient.ts:117-136`) — Assessment A tự tay mở tab thứ hai, đổi cân nặng, xác nhận tab đầu hiện đúng banner đỏ riêng "Dữ liệu bệnh nhân vừa đổi từ một tab khác", tách biệt rõ với banner "dữ liệu cũ" màu hổ phách hiện có. Đóng đúng một lỗ hổng an toàn thật: máy trực dùng chung âm thầm kế thừa số của phiên khác.
2. **Ngăn lỗi ở tầng cấu trúc, không chỉ báo lỗi**: tuổi=200 test tay ra CrCl "—" thay vì một số âm bịa ra, kèm giải thích đúng lý do.
3. **Khối kết quả liều gộp đúng thứ cần thiết**: số tốc độ (JetBrains Mono) + dấu tích "Trong khoảng" + liều thực nhận sau làm tròn + giờ hết dịch — một khối mạch lạc, không rải rác.

## Vấn đề ưu tiên

**[P1] Dòng tóm tắt bệnh nhân vẫn cắt âm thầm tuổi/chiều cao/cân nặng ở 375px**
- Gì: Ở màn 375px, dòng thu gọn hiện `40 kg · Nam · ...` — tuổi ("60 tuổi") vẫn nằm trong DOM nhưng bị nuốt bởi `className="truncate min-w-0"` trên phần chuỗi còn lại (App.tsx:5599-5602). Bản vá 2026-09-01 chỉ tách CrCl ra khỏi vùng `truncate` — đúng phạm vi P1 gốc, nhưng cùng lớp lỗi chưa lan sang tuổi/chiều cao/cân nặng.
- Vì sao quan trọng: đây là đúng kiểu lỗi đã được xác nhận nguy hiểm cho CrCl (mất thông tin đúng lúc bác sĩ liếc nhanh một tay) — tuổi/cân nặng cũng là số đầu vào trực tiếp nuôi mọi phép tính liều trên màn.
- Sửa: cho dòng tóm tắt 2 dòng (đã có tiền lệ `titleClamp={2}` ở ScreenHeader), hoặc kéo thêm tuổi vào cùng vùng `flex-none` không-bao-giờ-cắt với CrCl, chỉ để lại giới tính/RRT (ít khẩn hơn) trong phần có thể cắt.
- Lệnh gợi ý: `/impeccable layout`

**[P2] Gợi ý 2 nút icon-only "Tìm"/"Nhật ký" chỉ hiện MỘT LẦN theo thiết bị, không theo người**
- Gì: `showHeaderIconHint` là cờ localStorage vĩnh viễn — dismiss một lần (kể cả chạm thử) là biến mất mãi mãi, kể cả khi máy trực đổi sang bác sĩ khác chưa từng thấy gợi ý.
- Vì sao quan trọng: đây là máy dùng chung nhiều ca trực/nhiều bác sĩ (per PRODUCT.md) — mô hình "thiết bị đã thấy" khác mô hình "người này đã thấy", và bản vá P3 vừa làm chọn đúng mô hình dễ vá nhất chứ chưa chắc đúng nhất.
- Sửa: cho gợi ý tái xuất hiện sau một khoảng im lặng dài (vài tháng không thao tác), hoặc gắn với lần đầu THẬT SỰ dùng tính năng thay vì cờ đã-thấy/chưa-thấy.
- Lệnh gợi ý: `/impeccable clarify`

**[P2] Chỉ ~3-4/10 tab hiện cùng lúc ở mobile; ghim chỉ áp dụng cho tab ĐANG MỞ**
- Gì: nút ghim chỉ xuất hiện trên tab hiện đang chọn (App.tsx:11967-11980) — muốn ghim một nhóm đang ở ngoài màn hình vẫn phải cuộn ngang tới nó trước.
- Vì sao quan trọng: giảm nhẹ (không giải quyết gốc) tình huống "cần thuốc X NGAY" khi X đang nằm ngoài 3-4 tab hiện ra — tìm kiếm bù được phần nào nhưng không phải lối tắt một chạm.
- Sửa: thêm lối vào ghim/nhảy-tới-nhóm từ chính khung Tìm, không đòi hỏi đã đứng sẵn ở tab muốn ghim.
- Lệnh gợi ý: `/impeccable layout`

**[P3] Cửa sổ hoàn tác 20 giây không thông báo lại gần hết hạn cho trình đọc màn hình**
- Gì: `aria-label` nêu "tự huỷ sau 20 giây" đúng một lần lúc chạm đầu tiên (App.tsx:5634-5638), không có gì báo lại khi thanh đếm sắp cạn.
- Vì sao quan trọng: người dùng trình đọc màn hình không có cách nào (ngoài tự hỏi lại control) biết cửa sổ hoàn tác sắp đóng.
- Lệnh gợi ý: `/impeccable audit`

**[P3] Nhấp nháy cắt viền trái tức thời ngay lúc vừa ghim tab**
- Gì: Assessment B đo trực tiếp — ghim xong, `scrollLeft` dừng ở 31px trên một tab rộng ~82px, cắt mất viền trái nhãn tab trong khoảnh khắc animation cuộn đang chạy; tải lại trang thì tab đó hiện đủ, không còn cắt.
- Vì sao quan trọng: glitch một-lần, tự hết, nhưng là dấu hiệu animation cuộn-tới-tab-vừa-ghim (rAF + scrollIntoView) chưa hoàn toàn mượt.
- Lệnh gợi ý: `/impeccable animate`

## Cảnh báo theo persona

**Casey (dùng di động, hay bị ngắt quãng)** — persona chính của công cụ này:
- Xác nhận trực tiếp: dòng tóm tắt thu gọn — đúng chỗ người dùng bị ngắt quãng dựa vào để liếc nhanh — vẫn cắt mất tuổi ở 375px (P1).
- Dải tab đòi vuốt ngang qua ~4 chip mới tới nhóm 5-10 — không chí mạng (có Tìm) nhưng thêm ma sát đúng lúc bị ngắt quãng.

**Jordan (lần đầu dùng cơ chế app, dù không lần đầu về lâm sàng)**:
- Nút Tìm/Nhật ký icon-only không có nhãn thường trực — gợi ý một-lần là lời giải thích DUY NHẤT từng có, và biến mất ngay cả khi chỉ chạm thử để khám phá.
- Cơ chế ghim-sao trên hàng tab hoàn toàn không có gợi ý trỏ tới — chỉ phát hiện được nếu tình cờ để ý ngôi sao nhỏ cạnh tab đang mở.

**Riley (test biên)**:
- Điểm cộng: tuổi=200 bị chặn sạch, có giải thích cụ thể — không có chỗ bám cho persona này.
- Khoảng hở tự nhận: gợi ý sắp-xếp-lại-tab chỉ báo một lần/đời cài đặt, không phải một lần/lượt tái diễn — người quay lại sau nhiều tháng (khoảng cách hợp lý giữa hai lần dùng một nhóm thuốc giải độc hiếm) có thể gặp lại việc tự sắp xếp lại mà không còn lời giải thích nào.

## Quan sát phụ

- Nút "Xoá bệnh nhân" cố ý đặt gần đầu thẻ thay vì vùng ngón cái dễ với — xác nhận là quyết định sản phẩm có chủ đích (không phải sơ suất) để thêm ma sát cho hành động phá huỷ nhất màn hình.
- Dark mode đọc như một bản sắc độc lập, đậm/sáng hơn thật sự chứ không phải đảo màu sáng — khớp cam kết DESIGN.md.
- Assessment A ghi nhận một overlay `detect.js` sót lại từ phiên công cụ khác gây can thiệp click trong lúc test — đã tự gỡ, là nhiễu môi trường, không phải phát hiện sản phẩm.
- Môi trường trình duyệt lượt này chỉ cấp 1 tab dùng chung cho cả hai assessment (khác lượt trước có nhiều tab) — Assessment B tự phát hiện và báo cáo trung thực; một vài giá trị bệnh nhân/trạng thái tab cụ thể quan sát được có thể lẫn giữa hai lượt thao tác, dù các phát hiện chức năng (banner, CrCl, ghim) đều được cả hai xác nhận độc lập nhất quán.

## Câu hỏi gợi mở

- Lỗi cắt tóm tắt bệnh nhân ở tuổi/chiều cao/cân nặng là CÙNG LỚP lỗi vừa vá cho CrCl — có nên làm một component tóm tắt dùng chung "trường nào cũng không được cắt" thay vì vá từng trường một mỗi lần bị phát hiện?
- Gợi ý một-lần (icon header, sắp-xếp-lại-tab) đều dùng mô hình "thiết bị đã thấy" — với một máy trực chia sẻ nhiều bác sĩ luân phiên, "thiết bị đã thấy" có còn là mô hình đúng không, hay cần "người này đã thấy" (dù app cố ý không định danh người dùng)?
- Hàng tab đã có sắp-theo-tần-suất + ghim thủ công + tìm kiếm — 10 tab cuộn ngang có còn là kiến trúc thông tin đúng, hay một bộ chọn nhóm gọn hơn (từ khung Tìm, hoặc lưới) phục vụ tốt hơn khoảnh khắc "cần thuốc X NGAY" mà màn này tồn tại để phục vụ?
