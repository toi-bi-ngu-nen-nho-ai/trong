---
target: MindMap Board Gallery
total_score: 33
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 2
timestamp: 2026-09-02T21-37-17Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: a9487570711681a18 · B: a7c9830372fe2bd97) — lượt 3, sau khi vá 4 điểm P2/P3 (2026-09-02 lượt 2).

## Điểm sức khỏe thiết kế (Nielsen's 10 Heuristics)

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 4 | Skeleton, fallback 4.5s, toast tiến trình xuất, trạng thái xác nhận xoá sống |
| 2 | Match System / Real World | 4 | Ẩn dụ giấy/ghim/mực nhất quán, đúng tinh thần y khoa |
| 3 | User Control and Freedom | 4 | Escape huỷ đổi tên/menu, xoá mềm + toast 5s + panel trash phục hồi đầy đủ |
| 4 | Consistency and Standards | 3 | Chấm màu panel trash dùng `--chip-s/--chip-l` (đổi theo theme), badge thẻ dùng `50% 36%` cố định — cùng một bảng ra màu THỰC TẾ khác nhau giữa 2 nơi đều nhằm "nhận diện bằng màu" |
| 5 | Error Prevention | 3 | Xác nhận 2 chạm đúng ý tưởng, nhưng **không có ngưỡng thời gian tối thiểu** — double-tap 50ms xuyên thủng cả đơn lẫn hàng loạt |
| 6 | Recognition Rather Than Recall | 4 | Chip lọc, timestamp tương đối, lọc chuyên khoa bền phiên |
| 7 | Flexibility and Efficiency | 3 | Chọn hàng loạt, lọc bền là affordance thật cho power user |
| 8 | Aesthetic and Minimalist Design | 4 | Tiết chế, icon+màu là toàn bộ ngôn ngữ thị giác |
| 9 | Error Recovery | 4 | `aria-live` mới thêm hoạt động đúng; có trạng thái lỗi đọc/ghi kèm thử lại |
| 10 | Help and Documentation | n/a | Lưới thao tác trực tiếp, affordance tự giải thích — đúng phạm vi Experience-mode |
| **Tổng** | | **33/36** | **Excellent (92%)** |

*Lượt 2: 31/36 (86%). Tăng thật nhờ #3 (kiểm phục hồi kỹ hơn), #9 (aria-live hoạt động đúng như thiết kế) — trong khi #4/#5 vẫn giữ nguyên mức vì 2 vấn đề mới (không phải hồi quy) vừa phát hiện sâu hơn ở lượt này.*

## Xác minh 4 điểm đã vá lượt 2

| Điểm vá | Kết quả | Bằng chứng |
|---|---|---|
| Badge trung tính theo `mauOnDinh(id)` | **Đúng nhưng yếu hơn tuyên bố** | Overlay FLIP khớp PIXEL với thẻ (30 mẫu liên tục trong 900ms, cùng `rgb(86,46,138)`). Nhưng 3 bảng tạo liên tiếp trong phiên sống ra hue ≈260°/266°/323° — cặp đầu cách nhau 6°, cùng S/L, đọc gần như cùng một màu bằng mắt. Hash không có bảo đảm khoảng cách tối thiểu. |
| `aria-live="polite"` + `aria-atomic` cho xác nhận xoá | **Đúng** | Xác nhận trực tiếp trên DOM sống cho cả nút đơn lẫn hàng loạt, còn nguyên qua cả 2 trạng thái nhãn. |
| Checkbox `colorScheme:'light'` | **Đúng, đúng phạm vi** | Chỉ áp cho checkbox TRÊN GIẤY (không theme-swap); checkbox panel trash (trên `--c-surface-alt`, CÓ theme-swap) KHÔNG bị áp — không rải bừa, đúng chỗ hỏng. |
| Ô đổi tên kế thừa `--tilt` | **Đúng** | Xác nhận ở 2 độ nghiêng khác nhau (0.7° và 2.9°) — matrix tính đúng góc từng trường hợp. |

## Xác minh tính đặc thù thiết kế

**Định tính (A):** Vẫn đặc thù thật — FLIP morph dùng CHÍNH component `TheTrong` cho cả trạng thái tĩnh/động, không dựng bản sao trôi dạt.

**Quét tự động (B):** CLI sạch, 0 phát hiện. Detector trình duyệt báo 3 `clipped-overflow-container` — B tự phát hiện lỗi trong chính script quét của mình (chưa tính vùng cuộn con `.scroll-ios` lồng giữa lưới và `main`), sửa lại thì **0 phần tử thực sự bị cắt** — vẫn false positive, xác nhận lại lượt 3. Cặp `bounce-easing`+`layout-transition`: B làm rõ hơn 2 lượt trước — easing "lò xo" đó THẬT SỰ chạy trên chính màn này (`.the-bang-vat:hover/:active`, `.card-plop`, toast), nhưng KHÔNG BAO GIỜ kết hợp với một transition `max-height`/`margin-top` trên cùng một phần tử (cặp đó chỉ tồn tại ở `.disc-body`, không render ở đây) — nên tuyên bố "một phần tử vừa bounce vừa layout-transition" vẫn sai cho màn này, dù 2 nguyên liệu riêng lẻ cùng tồn tại trên trang.

## Ấn tượng chung

Cả 4 bản vá lượt 2 đứng vững, không cái nào hồi quy — nhưng thử nghiệm sâu hơn lượt này lật ra đúng kiểu lỗi bài viết yêu cầu tìm: một vấn đề đã được vá RIÊNG ở nơi khác trong cùng file (aria-label phân biệt bảng trùng tên trong panel trash) chưa từng được mang sang chính lưới chính — nơi lưu lượng cao nhất. Và cơ chế xác nhận-2-chạm, dù đúng ý tưởng, không có ngưỡng thời gian nên một double-tap thật (rất phổ biến trên điện thoại) xuyên thủng hoàn toàn.

## Điểm mạnh

1. **Màu overlay FLIP khớp pixel với thẻ, đo được chứ không chỉ nhìn bằng mắt** — 30 mẫu liên tục cùng `rgb()` suốt cửa sổ chuyển cảnh.
2. **State machine xác nhận-xoá kỷ luật**: đơn và hàng loạt dùng chung chuỗi xác nhận→xoá→hoàn tác→panel trash, tự tắt sau 5s nếu bỏ dở.
3. **Bản vá độ nghiêng ô đổi tên đúng chi tiết vật lý nhỏ** — xác nhận ở cả góc gần-0 lẫn góc rõ rệt, không sticker phẳng trên ảnh nghiêng nữa.

## Vấn đề ưu tiên

**[P1] Xác nhận xoá 2 chạm không có ngưỡng thời gian tối thiểu — double-tap xuyên thủng hoàn toàn.** Kiểm trực tiếp: 2 click cách nhau 50ms thực thi xoá ngay, y hệt như không hề có bước xác nhận. Chính comment trong code (`DanhSachBang.tsx:971-976`) viện dẫn "một bác sĩ trực, thao tác một tay" làm lý do cho cơ chế 2 chạm — nhưng double-tap 100-300ms (phản xạ quen tay từ double-tap-to-zoom, tay run, bấm lại vì lo lắng) nằm gọn trong mọi "cử chỉ xác nhận" con người có thể làm, xuyên thủng cả xoá đơn lẫn hàng loạt.
**Cách sửa:** thêm độ trễ bắt buộc (~400-600ms) trước khi lần chạm thứ hai được tính là xác nhận thật.
**Lệnh gợi ý:** `/impeccable harden`

**[P1] Bảng chưa gắn khoa là "cặp song sinh" với trình đọc màn hình — đúng lỗi đã vá ở nơi khác trong CÙNG FILE nhưng chưa mang sang lưới chính.** Kiểm DOM sống: mọi thẻ chưa gắn khoa có `aria-label` NGUYÊN VĂN giống hệt nhau — "Mở bảng Bảng chưa đặt tên". Bản vá màu-theo-id lượt 2 chỉ giúp người SÁNG MẮT; người dùng trình đọc màn hình không được lợi gì. Panel "Đã xoá gần đây" đã tự vá đúng lớp lỗi này (`moTaXoa` nối thêm thời gian tương đối vào aria-label, dẫn nguồn critique 2026-09-01 P1) nhưng chưa từng áp dụng cho lưới chính — nơi lưu lượng cao nhất.
**Cách sửa:** nối `formatReadTime(bang.capNhatLuc)` (đã hiển thị trên màn) vào aria-label của nút mở thẻ, cùng mẫu panel trash đã dùng.
**Lệnh gợi ý:** `/impeccable harden`

**[P2] `mauOnDinh` không có bảo đảm khoảng cách hue tối thiểu — trùng màu gần là kết quả đo được, không phải giả thuyết.** 3 bảng tạo liên tiếp trong phiên sống ra 260°/266°/323° — cặp đầu cách 6° trong cùng họ S/L, đọc gần như cùng màu. Đúng kịch bản chính bản vá lượt 2 tuyên bố giải quyết ("tạo vài bảng liên tiếp, xác nhận phân biệt được") lại không được bảo đảm, chỉ giảm xác suất so với xám phẳng cũ.
**Cách sửa:** cân nhắc gán hue chống trùng (vd bước góc vàng theo thứ tự tạo, hoặc kiểm hue các bảng lân cận trước khi gán) thay vì hash thuần.
**Lệnh gợi ý:** `/impeccable harden`

**[P3] Chấm màu panel trash và badge thẻ không khớp màu cho cùng một bảng.** Chấm dùng `--chip-s`/`--chip-l` (đổi theo theme), badge dùng `50% 36%` cố định — cùng hue nhưng S/L khác nên màu thực tế khác nhau giữa 2 nơi đều nhằm xây dựng "nhận diện qua màu". Có thể là thích ứng có chủ đích (chấm trên nền theo-theme, badge trên giấy không theo-theme) nhưng cần chủ dự án xác nhận đây là "cùng họ màu" chứ không phải "cùng màu", vì hiện đang ngầm định mà không nói rõ.
**Lệnh gợi ý:** `/impeccable polish`

**[P3] Huỷ đổi tên bằng Escape không có phản hồi xác nhận thị giác.** Escape hoàn tác đúng nhưng không có một nháy/settle xác nhận việc huỷ đã xảy ra — người gõ nhanh phải tin chứ không thấy.
**Lệnh gợi ý:** `/impeccable polish`

## Cờ đỏ theo persona

- **Riley (stress-tester):** double-tap 50ms xuyên thủng xác nhận xoá — đúng thất bại persona này được yêu cầu săn tìm.
- **Sam (trình đọc màn hình):** N thẻ chưa gắn khoa đọc ra CÙNG một câu N lần, không cách nào phân biệt. Điểm cộng: focus trap trong menu "⋯"/panel tag đã đúng (Tab cycle trong menu, Escape trả focus về nút vừa bấm) — xác nhận qua code, đáng ghi nhận không chỉ chê.
- **Casey (di động):** không phát hiện cờ đỏ mới — vùng chạm 44×44, lưới 2 cột không tràn ở 375px, thanh hành động ghim đáy đúng tầm ngón cái.

## Quan sát nhỏ

- Banner "Overused font/Bounce easing" xuất hiện trên viewport lúc kiểm là do chính công cụ automation chèn vào, KHÔNG tồn tại trong DOM thật của app — không tính là phát hiện.
- `taoBangMoi` mặc định MỌI bảng mới là chưa gắn khoa — nghĩa là nhánh màu-trung-tính (và rủi ro trùng hue P2) là trường hợp PHỔ BIẾN, không phải cạnh biên — đáng cân nhắc mức đầu tư tương xứng.

## Câu hỏi đáng suy ngẫm

1. Nếu hầu hết bảng khởi đầu không gắn khoa, một hash 70 giá trị trong một họ hue hẹp có còn là hệ nhận diện đúng về lâu dài, hay badge cần thêm một kênh thứ hai (vị trí/hình dạng/hoạ tiết) khi số bảng của một phòng khám vượt quá chục?
2. Cơ chế xác nhận giả định "lần chạm thứ hai có chủ đích" — nhưng không gì phân biệt nó với một double-tap vô tình. Bước xác nhận có nên đòi một CỬ CHỈ khác (nút đổi vị trí, hoặc giữ) thay vì cùng chỗ-cùng cử chỉ hai lần?
3. Toàn bộ đầu tư phân biệt-bằng-màu của lượt 2 không mang lại lợi ích gì cho người dùng trình đọc màn hình — có nên có quy ước: mọi bản vá chỉ-thị-giác phải đối chiếu với lỗi phi-thị-giác tương đương trước khi đánh dấu "đã xong"?
