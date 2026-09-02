---
target: MindMap Board Gallery
total_score: 31
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 0
timestamp: 2026-09-02T15-34-17Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: a0980f3a8de45c4f2 · B: aabb7eff3066aff3d) — lượt 2, sau khi vá 5 điểm P1-P3 (2026-09-02).

## Điểm sức khỏe thiết kế (Nielsen's 10 Heuristics)

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 4 | "Đang dựng ảnh…", fallback "Đang tải…" sau 4.5s, bộ đếm "N đã chọn" sống, timestamp tương đối |
| 2 | Match System / Real World | 4 | Ẩn dụ giấy/ghim vật lý, copy tiếng Việt tự nhiên, FLIP+nghiêng vật lý |
| 3 | User Control and Freedom | 3 | Toast Hoàn tác + khay trash cho cả đơn lẫn hàng loạt (xác minh trực tiếp); trừ nửa điểm vì đổi-nhãn-nút là tín hiệu DUY NHẤT báo đang ở bước xác nhận phá huỷ |
| 4 | Consistency and Standards | 4 | **Xác nhận**: xoá hàng loạt giờ khớp y hệt ngữ pháp xoá đơn (cùng copy "Chắc chắn xoá?", cùng 5s tự tắt, cùng token đỏ) — đúng bất nhất P1 lượt trước đã biến mất |
| 5 | Error Prevention | 3 | Hai chạm cho mọi hành động phá huỷ; trừ điểm vì 2 thẻ chưa-gắn-khoa cạnh nhau khi chọn nhiều dễ chọn nhầm |
| 6 | Recognition Rather Than Recall | 3 | Màu/icon chuyên khoa vẫn phân biệt tốt khi ĐÃ gắn khoa; mất hẳn cho mọi bảng chưa gắn (nay là mặc định của bảng mới) |
| 7 | Flexibility and Efficiency | 4 | Chip tràn "Thêm +9 ▾", lọc chuyên khoa bền phiên (ngoại lệ có chủ đích), tìm theo nội dung |
| 8 | Aesthetic and Minimalist Design | 4 | Dòng mời gần-trống chỉ MỘT câu chữ, không minh hoạ; phân biệt đúng rỗng-thật vs rỗng-do-lọc |
| 9 | Error Recovery | 2 | Đổi trạng thái "Chắc chắn xoá?" chỉ là đổi CHỮ trên nút — không thấy `aria-live`; trình đọc màn hình phụ thuộc hoàn toàn việc AT có tự đọc lại accessible-name hay không |
| 10 | Help and Documentation | n/a | Bề mặt Experience-mode (surface brief), không cần trợ giúp ngữ cảnh riêng — không đo được điểm ý nghĩa ở đây |
| **Tổng** | | **31/36** | **Good (86%)** |

*Lượt trước: 31/40 (77.5%, không có heuristic nào n/a). Cùng điểm thô nhưng tỷ lệ % cải thiện thật — vài heuristic (3,4,5) tăng nhờ bản vá P1, trong khi #9 lộ ra một khoảng trống mới (đổi-nhãn thiếu tín hiệu phi thị giác) và #6 bị ảnh hưởng phụ từ bản vá chuyên khoa mặc định.*

## Xác minh tính đặc thù thiết kế

**Đánh giá định tính (A):** Vẫn đặc thù thật — hệ thẻ giấy vật lý (mép cong, công thức bóng 3 lớp, nghiêng 3D theo con trỏ/ngón tay), FLIP neo đúng rect vừa chạm, magenta `--c-accent-2` chỉ riêng bề mặt này, màu bảng hash-hoá cố tình né vùng đỏ/hổ phách/xanh lá (260–330°). Đọc như "phòng não phải của Bs Trọng", không phải gallery CRUD dán nhãn lại.

**Quét tự động (B):** `detect.mjs` CLI → **sạch, 0 phát hiện**. Detector chèn trình duyệt báo 4 tín hiệu: 1 cặp `bounce-easing`+`layout-transition` (đối chiếu lại mã nguồn HIỆN TẠI, độc lập với lượt trước — **vẫn là false positive**, hai quy tắc CSS không liên quan bị gộp) và 3 `clipped-overflow-container` trên `#root`/`#app-shell`/`main` — tôi quét trực tiếp DOM ngay sau báo cáo B: **0 phần tử con nào thực sự bị cắt** — đây là kiến trúc `position: fixed; inset: 0` có chủ đích (DESIGN.md, tránh lỗi 100dvh trên iOS PWA), **false positive cả 3**.

## Ấn tượng chung

5 điểm P1-P3 lượt trước đều đứng vững dưới kiểm tra thật (không chỉ tin mô tả): xoá hàng loạt 2 chạm đúng luồng và vẫn là xoá mềm; bảng mới đúng là chưa gắn chuyên khoa với option chọn thật; `--con-tro-x/y` set/clear đúng vòng đời chạm dưới `pointer: coarse`; không còn dấu vết nhấn-giữ, chạm nhanh vẫn mở bảng ngay (~54ms). Nhưng bản vá "bỏ gán chuyên khoa mặc định" đổi một lời nói dối (mọi bảng mới là "Tim mạch") lấy một lỗ nhận diện khác (mọi bảng mới trông giống hệt nhau) — đúng kiểu đánh đổi cần một lượt theo dõi riêng.

## Điểm mạnh

1. **Xoá hàng loạt 2 chạm khớp đúng ngữ pháp xoá đơn, xác minh trực tiếp end-to-end** — "Xoá (N)" → "Chắc chắn xoá?" → xoá → toast "Đã xoá N bảng" kèm Hoàn tác, tự tắt sau 5s nếu bỏ dở. Không phải tuyên bố suông trong commit — đã bấm thật.
2. **Nghiêng theo cảm ứng là hiệu ứng vật lý thật, không chỉ nằm trong log commit.** PointerEvent giả lập tại 10%/10% khung thẻ → `--con-tro-x/y` đúng 0.1/0.1; pointerup → gỡ sạch. CSS đọc đúng biến dưới `pointer: coarse`.
3. **Dòng mời gần-trống tiết chế đúng mực và đúng phạm vi** — chỉ hiện khi xem TOÀN BỘ thư viện thật (không lọc/tìm) với 1-3 bảng, biến mất đúng ở bảng thứ 4, không phải một hero minh hoạ to tát.

## Vấn đề ưu tiên

**[P2] Bảng chưa gắn chuyên khoa trông giống hệt nhau — tác dụng phụ của bản vá P2 lượt trước.** Bỏ gán ngầm "Tim mạch" đúng là sửa một lời nói dối, nhưng vì bảng mới giờ LUÔN chưa gắn khoa, 2-3 bảng tạo liên tiếp (tình huống rất thật của người mới thiết lập thư viện) đều mang cùng icon giấy xám, cùng "Vừa xong" — mất hẳn heuristic 6 (nhận diện qua nhìn) đúng lúc hiến chương Mindmap đòi "unmistakable từ dấu hiệu riêng, không cần đọc nhãn". **Sửa:** dùng lại `mauOnDinh(id)` (đã có sẵn cho chấm màu panel trash) để tô một sắc nhạt ổn định cho icon trung tính, giữ nguyên "không nói dối chuyên khoa" nhưng khôi phục phân biệt bằng mắt.
**Lệnh gợi ý:** `/impeccable harden`

**[P2] Trạng thái "Chắc chắn xoá?" không có tín hiệu phi thị giác.** Cả xoá đơn lẫn xoá hàng loạt (bản vá P1 lượt trước mở rộng đúng mẫu này) chỉ đổi CHỮ trên nút, không thấy `aria-live` nào công bố việc chuyển sang bước xác nhận phá huỷ. Với người dùng trình đọc màn hình, việc này có được nghe thấy hay không phụ thuộc hoàn toàn AT có tự đọc lại accessible-name của phần tử đang focus — không đảm bảo trên mọi phiên bản VoiceOver/TalkBack.
**Vì sao quan trọng:** đây giờ là mẫu xác nhận cho hành động rủi ro cao nhất màn hình (xoá N bảng), càng cần chắc chắn được công bố cho mọi người dùng, không riêng người thấy màu đỏ.
**Cách sửa:** thêm `aria-live="assertive"` (hoặc `role="status"` riêng) công bố rõ khi chuyển sang trạng thái xác nhận, độc lập với việc nhãn nút có đổi hay không.
**Lệnh gợi ý:** `/impeccable harden`

**[P3] Checkbox chưa tích tương phản thấp ở dark mode** — ô vuông tối đặc không viền trên nền thẻ giấy kem, dễ đọc thành hoạ tiết trang trí hơn là control tương tác cho tới khi so với trạng thái đã tích (xanh, có dấu tick rõ). Thêm viền 1px ở trạng thái chưa tích.
**Lệnh gợi ý:** `/impeccable polish`

**[P3] Màu huy hiệu "Tim mạch" (`#b13a34`) gần với đỏ nguy hiểm `--c-danger` (`#b91c1c`/`#dc2626`) — có từ trước, không thuộc lượt vá này.** DESIGN.md nêu "Untouchable Signal Rule" là ranh giới cứng vĩnh viễn; một icon trái tim đỏ trên thẻ gallery, trong app mà đỏ nghĩa là "nguy hiểm lâm sàng, không bao giờ là chrome", là một căng thẳng giá trị đáng chủ dự án xem lại dù không phải lỗi mới.
**Lệnh gợi ý:** `/impeccable colorize` (cần quyết định chủ dự án về sắc thay thế)

**[P3] Ô nhập tên khi đổi tên không kế thừa độ nghiêng của thẻ — có từ trước.** Giữa lúc đặt tên bảng mới, ô nhập đứng thẳng phẳng lệch nhẹ so với thẻ giấy vẫn đang nghiêng bên dưới — một vết nứt nhỏ trong ảo giác "mọi thứ là vật thể thật" đúng lúc người dùng đang chú ý nhất (đặt tên bảng vừa tạo).
**Lệnh gợi ý:** `/impeccable polish`

## Cờ đỏ theo persona

**Jordan (người mới):** Tạo 2 bảng không đặt tên (đường đi rất thật "để tôi xem thử") → cả hai đọc "Bảng chưa đặt tên", cùng icon xám, cùng "Vừa xong" — không có cách đáng tin để phân biệt mà không mở từng cái.

**Sam (trình đọc màn hình):** Đổi nhãn "Chắc chắn xoá?" (cả nút hàng loạt lẫn mục xoá trong menu từng thẻ) không có `aria-live` — có thể không nghe được sự chuyển trạng thái giữa hai lần chạm. Riêng aria-label thẻ vẫn đúng khi có chuyên khoa ("Mở bảng X, chuyên khoa Y") nhưng lặng về "chưa gắn khoa" khi không có — cùng lỗ nhận diện với người sáng mắt.

**Riley (stress-tester):** Xác nhận double-click nhanh KHÔNG bỏ qua được bước xác nhận 2 chạm (nhãn phải thật sự đổi thành "Chắc chắn xoá?" trước khi lần chạm thứ hai được tính) — phòng vệ đúng. Nhưng "Chọn tất cả" trên một thư viện toàn bảng-chưa-gắn-khoa thì phản hồi thị giác về ĐANG chọn gì bị suy yếu vì các thẻ giống hệt nhau.

## Quan sát nhỏ

- Hai comment trong `DanhSachBang.tsx` (dòng ~244, ~1288) vẫn nhắc "menu/nhấn-giữ vẫn tồn tại về mặt code" — đã lỗi thời từ lượt gỡ nhấn-giữ 2026-09-02, chỉ là comment sai, không ảnh hưởng hành vi.
- "Thêm +9 ▾" mở/gấp đúng, không làm lưới giật.
- FLIP mở/đóng xác minh trực tiếp end-to-end, không khung hình rớt, không overlay kẹt.
- Bộ lọc chuyên khoa bền qua reload (`CHUYEN_KHOA_LOC_KEY`) là ngoại lệ có chủ đích, hợp lý với khung "bảng = tài sản dài hạn" — đáng chủ dự án xác nhận lại nó không gây bất ngờ cho người lọc một lần rồi quên nhiều tháng sau.

## Câu hỏi đáng suy ngẫm

1. Nếu hai bác sĩ mỗi người tạo 3 bảng trong một lượt đều ra thẻ không phân biệt được, "đừng nói dối về chuyên khoa" có thật là giá trị cao hơn, hay đáng lẽ bản vá phải là một bước chọn chuyên khoa BẮT BUỘC lúc tạo thay vì mặc định rỗng âm thầm?
2. Hiến chương đòi vật liệu bút/mực "unmistakable từ dấu hiệu riêng" — chuẩn đó có nên áp cho chính các bảng, hay một icon "giấy trắng" trung tính dùng chung mới là đúng ẩn dụ (một cuốn sổ chưa viết gì cũng giống mọi cuốn sổ chưa viết gì khác ngoài đời thật)?
3. Giờ mọi xác nhận phá huỷ đã nhất quán 2 chạm — một cú đổi CHỮ thuần tuý có còn là cơ chế xác nhận đúng cho hành động phạm vi thiệt hại lớn nhất (xoá N bảng), hay triết lý "sự kiện vật lý" của bề mặt này đòi trạng thái xác nhận một cách trình bày riêng biệt (không chỉ chữ đỏ đậm)?
