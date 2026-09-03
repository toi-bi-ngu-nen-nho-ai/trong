---
target: MindMap Board Gallery
total_score: 32
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 1
timestamp: 2026-09-03T02-31-17Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: a55e6640cde6035a4 · B: a720d0fee43f10366) — lượt 4, sau khi vá 5 điểm P1/P2/P3 (2026-09-02 lượt 3, commit `0c42233`).

## Điểm sức khỏe thiết kế (Nielsen's 10 Heuristics)

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 4 | Skeleton, toast, xác nhận sống động; B đo trực tiếp ngưỡng xoá 160ms/608ms khớp claim |
| 2 | Match System / Real World | 4 | Ẩn dụ giấy/ghim nhất quán; line-drawing tái dùng icon chuyên khoa thật, không dựng ảnh giả |
| 3 | User Control and Freedom | 4 | Escape khắp nơi, xoá mềm + hoàn tác + panel trash đầy đủ |
| 4 | Consistency and Standards | 4 | Tăng từ 3→4: chấm trash và badge nay gọi CHUNG một hàm màu (`mauTrungTinhTheoBang`) — bất nhất cũ đã giải quyết bằng cấu trúc mã, không phải trùng hợp |
| 5 | Error Prevention | 3 | Ngưỡng 450ms đứng vững (B đo trực tiếp: 160ms bị chặn, 608ms xoá được), nhưng double-tap "+" mở ra một lỗ hổng error-prevention MỚI chưa được phòng |
| 6 | Recognition Rather Than Recall | 3 | Hue phân biệt tốt cho mắt ở quy mô nhỏ (B: 3 bảng liên tiếp ra RGB tách biệt rõ), nhưng ở 4 bảng B đo được khoảng cách chỉ 14.4-15° — dưới ngưỡng ≥30° bản vá lượt 3 tuyên bố; và aria-label vẫn trùng byte-cho-byte trong cửa sổ "Vừa xong" — A và B đo ĐỘC LẬP, cùng kết quả |
| 7 | Flexibility and Efficiency | 3 | Chọn hàng loạt, lọc bền — giữ nguyên |
| 8 | Aesthetic and Minimalist Design | 4 | Tiết chế, icon+màu là toàn bộ ngôn ngữ thị giác |
| 9 | Error Recovery | 3 | Giảm nhẹ từ 4: bảng tạo lỡ tay qua double-tap không có tín hiệu "đây là một tai nạn" để phục hồi có định hướng |
| 10 | Help and Documentation | n/a | Lưới thao tác trực tiếp, đúng phạm vi Experience-mode |
| **Tổng** | | **32/36** | **Good (89%, sát ngưỡng Excellent)** |

*Lượt 3: 33/36 (92%). Giảm nhẹ không phải hồi quy của 5 điểm đã vá (cả 5 đều xác minh đứng vững ở phần dưới) — mà vì kiểm sâu hơn lượt này lộ ra 2 lớp vấn đề mới: aria-label vẫn trùng trong cửa sổ phổ biến nhất (thu hẹp lỗi cũ chứ chưa đóng), và một tác dụng phụ mới của chính khoá chống-bấm-đúp đã vá ở lượt 2.*

## Xác minh 5 điểm vá lượt 3

| Điểm vá | Kết quả | Bằng chứng hội tụ A + B |
|---|---|---|
| Ngưỡng 450ms xác nhận xoá (đơn + hàng loạt) | **Đứng vững** | B: click ở 160ms bị bỏ qua (bảng còn nguyên), click ở 608ms xoá thành công — khớp đúng `NGUONG_XAC_NHAN_MS = 450` (`DanhSachBang.tsx:27`). A: script 2 click cách 50ms → 6 bảng còn nguyên; cách >450ms → xoá hết. Hai agent độc lập đo cùng hành vi. |
| `aria-label` thẻ chính nối `formatReadTime` | **Đúng cơ chế, nhưng KHÔNG đủ độ phân giải** | Xem [P1] bên dưới — cả A và B độc lập tạo nhiều bảng liên tiếp và đọc DOM, cùng thấy aria-label trùng y hệt trong cửa sổ 60 giây đầu. |
| `mauHueChongTrung` (farthest-point chống trùng hue) | **Đúng ở quy mô nhỏ, vi phạm claim ở quy mô thực tế** | A: 3 bảng qua đúng luồng người dùng → RGB tách biệt rõ (`rgb(122,46,138)`, `rgb(138,46,99)`, `rgb(77,46,138)`). B: 4 bảng → hue 274.6°/289.6°/325.4°/260.2°, hai cặp dưới 30° (15° và 14.4°). Không mâu thuẫn — A dừng ở 3 bảng nên không chạm giới hạn toán học mà B đo được ở bảng thứ 4. |
| Hợp nhất công thức màu chấm trash / badge | **Đúng, xác nhận bằng đọc mã** | A: cả hai gọi thẳng `mauTrungTinhTheoBang(id, mauHue)` — cùng hàm, cùng tham số. |
| Nháy xác nhận khi Escape huỷ đổi tên | **Đúng theo mã và hành vi CSS** | B: class `ten-bang-vua-huy` xuất hiện, computed `animationName: tenBangVuaHuySettle`, tự gỡ ~300ms khớp `setTimeout(..., 300)`, bọc đúng trong `@media (prefers-reduced-motion: no-preference)`. |

## Xác minh tính đặc thù thiết kế

**Định tính (A):** Vẫn đặc thù thật. `mauHueChongTrung` là thuật toán greedy farthest-point tự viết riêng cho đúng bài toán "N bảng chưa đặt tên phải phân biệt được" — không phải color-picker generic. `VeChuyenKhoaDangTai` tái dùng chính icon chuyên khoa thật cho line-drawing màn chờ, không dựng spinner rời rạc mượn từ đâu đó.

**Quét tự động (B):** CLI sạch, 0 phát hiện trên cả 3 file — xác nhận không phải do quét sai (test file không tồn tại có in cảnh báo, 3 file thật thì không). Không có false positive nào ở lượt này (khác các lượt trước với `clipped-overflow-container`/banner giả).

## Ấn tượng chung

5 bản vá lượt 3 đứng vững thật, đo được bằng cả hai agent độc lập — không cái nào hồi quy. Nhưng đúng đúng kiểu lỗi mà quy trình này được thiết kế để săn: kiểm sâu hơn lộ ra hai lớp vấn đề mới. Thứ nhất, bản vá aria-label đúng Ý TƯỞNG nhưng chọn nguồn dữ liệu (`formatReadTime`, làm tròn "Vừa xong" cho mọi mốc <60s) có độ phân giải quá thô cho đúng use-case nó nhắm tới — hai agent tạo bảng liên tiếp độc lập nhau đều thấy câu đọc giống hệt. Thứ hai, và đáng chú ý hơn: chính khoá chống-bấm-đúp `taoBangMoi` (vá ở lượt 2, xác nhận vẫn đúng — không tạo 2 bảng) có một tác dụng phụ chưa từng được kiểm ở các lượt trước — double-tap thật cướp mất bước tự-mở-ô-đổi-tên, để lại một bảng hợp lệ về dữ liệu nhưng "mồ côi tên" mà không có tín hiệu nào báo cho người dùng.

## Điểm mạnh

1. **`mauHueChongTrung` là kỹ thuật đúng đắn với hiệu quả đo được thật ở quy mô thường gặp** — 3 bảng liên tiếp qua đúng luồng người dùng cho RGB tách biệt rõ ràng, không chỉ là lời hứa trong comment.
2. **Ngưỡng xác nhận xoá 450ms chính xác ở mọi biên đã kiểm, bởi hai agent độc lập** — chặn đúng double-tap 50-160ms, không chặn oan thao tác thật >450ms, nhất quán cho xoá đơn lẫn hàng loạt.
3. **Khoá chống-bấm-đúp giải quyết đúng lớp lỗi gốc nó nhắm tới** — double-click thật chỉ tạo đúng 1 bảng (đếm DOM xác nhận), không còn nhân bản dữ liệu như lịch sử comment mô tả.

## Vấn đề ưu tiên

**[P1] `formatReadTime` khiến bản vá aria-label chỉ hiệu lực NGOÀI cửa sổ 60 giây đầu — đúng cửa sổ phổ biến nhất của kịch bản nó tuyên bố giải quyết.** Hai agent độc lập tạo bảng liên tiếp và đọc DOM, cùng kết quả: bảng 1 và bảng 2 tạo trong cùng phút đọc ra `"Mở bảng Bảng chưa đặt tên, cập nhật Vừa xong"` — BYTE-Y HỆT nhau — vì `formatReadTime` (`src/lib/recentReads.ts:67`) trả `"Vừa xong"` cho mọi mốc dưới 60 giây. Đây chính xác là kịch bản mà `taoBangMoi` mặc định hướng tới (mọi bảng mới đều chưa gắn khoa) và là thao tác thực tế phổ biến (dựng vài khung liên tiếp đầu ca trực). Bản vá lượt 3 đúng Ý TƯỞNG (gắn timestamp vào aria-label) nhưng nguồn dữ liệu đã làm tròn cho hiển thị không đủ độ phân giải cho mục đích phân biệt.
**Cách sửa:** với bảng chưa gắn khoa đang trong cửa sổ "Vừa xong", phân biệt bằng thứ tự tạo (ví dụ "bảng thứ N chưa đặt tên") hoặc mili-giây thô thay vì chuỗi đã làm tròn.
**Lệnh gợi ý:** `/impeccable harden`

**[P2] Double-tap/double-click thật trên "+" không còn nhân bản dữ liệu, nhưng cướp mất bước tự-mở-ô-đổi-tên — để lại bảng mồ côi tên không có cảnh báo.** A kiểm trực tiếp bằng double-click thật: đúng 1 bảng được tạo (khoá `detail>1` hoạt động), nhưng bảng xuất hiện ở trạng thái TĨNH "Bảng chưa đặt tên" thay vì tự mở ô nhập như luồng tap-đơn. Cơ chế: click thứ hai của double-click rơi đúng lúc `<input autoFocus>` vừa mount, kích hoạt `onBlur → onLuuTen` đóng ô nhập trước khi gõ được ký tự nào. Đây chính xác là kịch bản mà comment tại `taoBangMoi` (dòng 1504-1507) mô tả là lý do tồn tại của bước giữ-người-dùng-lại-để-đặt-tên — double-tap (phản xạ tự nhiên khi vội, hoặc thói quen double-tap-to-zoom mà chính file đã dẫn chứng cho nút xoá) âm thầm vô hiệu hoá đúng bước đó.
**Cách sửa:** khi `taoBangMoi` bị chặn bởi `detail>1`, cũng chặn sự kiện lan xuống phần tử bên dưới, hoặc trì hoãn `autoFocus` một khung hình để click thứ hai không "rơi xuyên" vào ô nhập vừa mount.
**Lệnh gợi ý:** `/impeccable harden`

**[P2] `mauHueChongTrung` vi phạm claim "≥30°" của chính nó ngay khi có 4 bảng chưa gắn khoa cùng tồn tại — giới hạn toán học, không phải lỗi cài đặt.** B đo trực tiếp: 4 bảng liên tiếp ra hue 274.6°/289.6°/325.4°/260.2° — hai cặp cách nhau 15° và 14.4°, dưới ngưỡng 30° bản vá lượt 3 tuyên bố. Đọc source `CAC_MOC_HUE` (`DanhSachBang.tsx:130-142`) cho thấy thuật toán đúng là greedy farthest-point trên 14 mốc cách đều 5° trong dải chỉ rộng 65° (`[260,325]`) — rải ≥4 điểm trong khoảng 65° thì khoảng cách tối thiểu tốt nhất có thể đạt về mặt toán học chỉ ~21.7° (pigeonhole), không thể ≥30°. Vẫn tốt hơn hash cũ (từng ra cặp cách 6°) nhưng chưa đạt mục tiêu đã tuyên bố, và đây không phải cạnh biên vì mọi bảng mới đều mặc định chưa gắn khoa.
**Cách sửa:** mở rộng dải hue khả dụng cho nhóm "chưa gắn khoa" (hiện chỉ 65° trong tổng 360°), hoặc hạ số mốc xuống để giữ khoảng cách tối thiểu thật sự ≥30° khi bão hoà.
**Lệnh gợi ý:** `/impeccable harden`

**[P3] Không có tín hiệu phân biệt "bảng vừa tạo do tai nạn thao tác" khỏi "bảng vừa tạo có chủ đích".** Hệ quả của P2 double-tap: một khi bảng mồ côi tên lọt vào lưới, nó trông giống hệt mọi bảng "Bảng chưa đặt tên" khác. Không có gợi ý nào ("bảng này vừa tạo, đặt tên đi?") khác biệt với bảng đã ở trạng thái này lâu.
**Lệnh gợi ý:** `/impeccable polish`

**[P3] `CAC_MOC_HUE` chỉ có 14 mốc trong dải 65° — từ bảng chưa-gắn-khoa thứ 15 sống đồng thời trở đi, thuật toán buộc phải lặp lại mốc đã dùng.** Không cấp bách (14 bảng chưa gắn khoa cùng lúc là khá nhiều), nhưng đáng ghi lại vì đúng nhánh mặc định, không phải cạnh biên.
**Lệnh gợi ý:** `/impeccable polish`

## Cờ đỏ theo persona

- **Riley (stress-tester):** double-tap "+" là chính xác kiểu thao tác Riley được yêu cầu săn — không làm hỏng dữ liệu (khoá `detail>1` đứng vững, đáng khen) nhưng tạo ra một "half-broken state" tinh vi hơn: bảng hợp lệ, tồn tại, nhưng lặng lẽ bỏ lỡ bước UX được thiết kế riêng cho nó.
- **Sam (trình đọc màn hình):** cửa sổ 60 giây "Vừa xong" nghĩa là tạo 2+ bảng liên tiếp trong một phút (thao tác hợp lý khi chuẩn bị nhiều khung trước ca trực) vẫn nghe 2 mục danh sách giống hệt nhau — đúng lớp lỗi ban đầu (critique 2026-09-02 lượt 3), chỉ thu hẹp cửa sổ chứ chưa đóng. Điểm cộng xác nhận lại: focus trap trong menu "⋯" vẫn đúng.
- **Casey (di động):** double-tap-to-zoom là phản xạ chính của persona này trên iOS Safari (đã được chính file dẫn chứng cho nút xoá) — cùng phản xạ đó áp lên "+" kích hoạt đúng P2. Không phát hiện vấn đề layout/touch-target mới ở 375px; nút "…" đo 44×44px trên mọi thẻ.

## Quan sát nhỏ

- Banner "Overused font/Bounce easing" và các `clipped-overflow-container` giả của các lượt trước không tái xuất hiện lượt này — CLI + browser đều sạch, không có false positive mới.
- A ghi nhận một lần thấy 2 bảng xuất hiện từ một thao tác lúc mới mở tab, nhưng lặp lại 3 lần sau (kể cả trên lưới thật-sự-trống) không tái hiện — không đủ bằng chứng để tính là finding, có thể là hiệu ứng khởi tạo tab của công cụ tự động hoá.
- B ghi nhận nhiễu môi trường: 3 tab hỏng từ lỗi tool trước đó vẫn tải app ngầm và tạo thêm bảng qua localStorage dùng chung giữa các tab — không phải bug, nhưng nhắc rằng nhiều tab cùng phiên chia sẻ trạng thái sống, đã dọn dữ liệu test trước khi kết thúc.

## Câu hỏi đáng suy ngẫm

1. Bản vá aria-label chọn đúng nguồn dữ liệu ĐÃ CÓ SẴN trên màn (`formatReadTime`) để không phải thêm state mới — nhưng "đã hiển thị" và "đủ độ phân giải để phân biệt" là hai tiêu chí khác nhau. Có nên có quy ước: giá trị dùng để PHÂN BIỆT không được tái dùng một giá trị đã LÀM TRÒN cho hiển thị, trừ khi đã kiểm độ phân giải đủ cho đúng use-case?
2. Khoá chống-bấm-đúp giải quyết đúng vấn đề nó nhắm (không nhân bản dữ liệu) nhưng mở ra vấn đề mới ở đúng ranh giới nó chạm vào (focus/blur của phần tử render tiếp theo). Mọi "khoá chặn thao tác thứ hai" có nên tự hỏi thêm: thao tác bị chặn đó có còn rơi xuyên xuống DOM bên dưới và kích hoạt logic khác không?
3. Nếu mọi bảng mới mặc định chưa gắn khoa, một dải hue chỉ rộng 65° có còn là hệ nhận diện đúng về lâu dài khi một phòng khám tích luỹ hàng chục bảng, hay cần mở rộng dải/thêm kênh nhận diện thứ hai?
