---
target: DungThuocScreen
total_score: 36
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-17T22-03-47Z
slug: src-app-tsx-dungthuocscreen
---
# Critique: DungThuocScreen (Bs Trọng)

**Method: dual-agent (A: general-purpose subagent — design review · B: general-purpose subagent — detector + browser evidence)**

## Điểm sức khỏe thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|---------------|
| 1 | Hiển thị trạng thái hệ thống | 3 | Con số tốc độ truyền (đỏ, mono) không có dự phòng nếu animation đếm số bị treo. |
| 2 | Khớp hệ thống với thực tế | 4 | Thuật ngữ lâm sàng chính xác (AUC/MIC 2020, Red Man Syndrome, Qeff CRRT). |
| 3 | Quyền kiểm soát & tự do | 3 | Hoàn tác 20s tốt; thiếu breadcrumb/back rõ trong luồng kháng sinh 3 bước. |
| 4 | Nhất quán & chuẩn mực | 4 | Disclosure, mẫu xác nhận, JetBrains Mono dùng nhất quán toàn màn. |
| 5 | Phòng ngừa lỗi | 4 | Điểm mạnh nhất — cổng xác nhận cho liều cực đoan, parseStrictNumber nghiêm ngặt. |
| 6 | Nhận diện hơn ghi nhớ | 4 | Banner bệnh nhân luôn hiện, chip công thức pha cũ, tab MRU. |
| 7 | Linh hoạt & hiệu quả | 3 | Tìm xuyên tab, thêm 1 chạm, copy ghi hồ sơ 1 chạm. |
| 8 | Thẩm mỹ & tối giản | 3 | Progressive disclosure hiệu quả; pill tương hợp và lỗi che text (P2) kéo điểm. |
| 9 | Nhận diện/khắc phục lỗi | 4 | "CHƯA NHẬP", lý do rõ cho mọi "—", log lưu đúng lý do xác nhận vượt ngưỡng. |
| 10 | Trợ giúp & tài liệu | 4 | Mỗi thẻ có nguồn + ngày rà soát hoặc ghi rõ chưa có nguồn. |
| **Tổng** | | **36/40** | **Xuất sắc** (cận dưới) — nhưng còn 2 vấn đề P1 liên quan an toàn. |

## Kết luận về tính đặc thù thiết kế

**LLM:** Thiết kế rõ ràng cho đúng công cụ này — Vancomycin nêu đúng bước ngoặt AUC/MIC 2020, máy tính vận mạch tính thời điểm hết bơm tiêm, CrCl dùng cân nặng hiệu chỉnh, làm tròn theo bước bơm thật.

**Quét tự động:** `detect.mjs` trên toàn file chỉ có 1 lỗi (dòng 981, không liên quan). Không có lỗi tĩnh nào trong phạm vi DungThuocScreen (10417–10892). Bằng chứng thật đến từ quét runtime/DOM.

**Lớp phủ trực quan:** Không khả dụng lượt này — Browser pane không compositing frame được ở cả hai subagent; bằng chứng thay thế là log console + đối chiếu DOM.

## Ấn tượng tổng thể

Nội dung y khoa đáng tin cậy, phòng ngừa lỗi liều cực đoan thuộc hàng tốt nhất. Cơ hội lớn nhất: màn hình phòng ngừa lỗi rất kỹ cho *giá trị nhập vào* nhưng chưa có cơ chế tương tự cho *danh tính bệnh nhân* đang dùng để tính.

## Điểm mạnh

1. Phòng ngừa lỗi ở liều cực đoan: giấu kết quả sau cổng xác nhận, log lưu nguyên văn lý do.
2. Mật độ thông tin có lý do chính đáng — progressive disclosure không phải trang trí.
3. Nội dung do người thật biên soạn — AUC/MIC, Red Man, CRRT Qeff, làm tròn theo bước bơm.

## Vấn đề ưu tiên

**[P1] Bối cảnh bệnh nhân không có tín hiệu "đã cũ"** — `drtrong:patient` lưu vô thời hạn, chỉ tình trạng thận có staleness check hẹp. Banner cân nặng/tuổi/CrCl mà mọi phép tính đọc từ đó không có mốc thời gian. Fix: mở rộng mẫu staleness đã có sang toàn bộ khối bệnh nhân. → `/impeccable harden`

**[P1] Con số tốc độ truyền không có dự phòng khi animation treo** — `useCountUp` phụ thuộc rAF hoàn tất, quan sát trực tiếp thấy kẹt giá trị cũ trong khi câu và log bên cạnh đã đúng (độ tin cậy giảm do rAF môi trường phiên này bị đói, nhưng khoảng trống kiến trúc — thiếu visibilitychange guard — là có thật và độc lập với môi trường). Fix: snap về finalText khi tab resume. → `/impeccable harden`

**[P2] Dải tab-chip che một phần văn bản khuyến cáo ở tab Vận mạch** — xác nhận thật qua elementFromPoint, che 51% đoạn "Công cụ tham khảo — luôn...". Fix: chỉnh z-index/khoảng cách. → `/impeccable layout`

**[P2] Pill "Chưa thấy xung đột nào" không phân biệt "chưa có gì so sánh" với "đã kiểm sạch"** — hiện đúng cả khi chỉ ghim 1 thuốc. Fix: chỉ hiện khi ≥2 thuốc đã ghim. → `/impeccable clarify`

**[P2] Cảnh báo vượt ngưỡng tuyệt đối dùng aria-live="polite" thay vì assertive** — Fix: chuyển sang assertive/role="alert" khi severity extreme. → `/impeccable audit`

## Cảnh báo theo persona

**Casey:** vùng chạm đạt chuẩn, không ma sát thừa ngoài chủ đích.
**Sam:** nền tảng a11y tốt; DisclaimerGate thiếu inert/aria-hidden cho nền; cảnh báo cực đoan dùng polite thay vì assertive.
**Riley:** hầu hết màn hình xây cho ngắt quãng tốt; lộ ra đúng 2 vấn đề P1 ở trên.

## Quan sát phụ

- `text-overflow` trên h1 dài — có class truncate sẵn, khả năng false positive, đáng xác minh nhanh.
- `layout-transition` trên Disclosure (max-height) — chủ đích, đã ghi trong DESIGN.md, không phải lỗi.
- `undersized-ui-text` 10px trên nav — chủ đích, đã ghi trong DESIGN.md, thuộc chrome dùng chung không phải riêng màn này.
- `clipped-overflow-container` ×3 — app-shell wrapper, ngoài phạm vi màn này.
- `cramped-padding` ×3 — độ tin cậy thấp, đáng xem lại khi polish.
- DisclaimerGate thiếu inert/aria-hidden cho nền — phòng thủ rẻ tiền, làm cùng lúc sửa aria-live.

## Câu hỏi đáng cân nhắc

- Tín hiệu "còn đúng bệnh nhân này không?" nên dựa vào gì để không phá vỡ chủ đích ẩn danh (không lưu tên/ID)?
- Lỗi kẹt số tốc độ truyền có đáng ưu tiên xử lý ngay cả trước khi có bằng chứng tái hiện trên máy thật?
