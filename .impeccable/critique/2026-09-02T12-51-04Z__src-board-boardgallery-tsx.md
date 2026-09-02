---
target: Board Gallery (Mindmap)
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-09-02T12-51-04Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: a5ef1c243dcad7ed2 · B: ad5ec3413005fa7c5)

## Điểm sức khỏe thiết kế (Nielsen's 10 Heuristics)

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 3 | Skeleton grid, toast "Đang tải…", undo toast đều tốt; trạng thái ngay-lúc-chạm chưa xác minh trực tiếp được (lỗi tool), nhưng có `:active` scale xác nhận qua code+B |
| 2 | Match System / Real World | 4 | Ẩn dụ giấy/ghim/bàn làm việc + icon chuyên khoa tiếng Việt rất tự nhiên |
| 3 | User Control and Freedom | 3 | Esc đóng menu tốt; xoá đơn có 2 lần chạm xác nhận, nhưng xoá hàng loạt thì không (xem P1) |
| 4 | Consistency and Standards | 2 | **Tự mâu thuẫn**: xoá 1 bảng cần 2 chạm xác nhận, xoá N bảng qua "Chọn tất cả" chỉ cần 1 chạm — rủi ro lớn hơn lại có ít rào cản hơn |
| 5 | Error Prevention | 2 | Cùng nguyên nhân #4 — "Chọn tất cả" → "Xoá (N)" xoá cả thư viện chỉ trong 2 lần chạm, không có bước dừng lại |
| 6 | Recognition Rather Than Recall | 4 | Icon+màu chuyên khoa nhất quán xuyên suốt lưới, chip lọc, khay "Đã xoá gần đây" |
| 7 | Flexibility and Efficiency | 3 | Tìm kiếm xuyên tên/tag/nội dung canvas là điểm mạnh thật; nhưng cử chỉ nhấn-giữ mở menu đã "vô hình" qua 3 vòng critique trước (ghi nhận ngay trong code) |
| 8 | Aesthetic and Minimalist Design | 4 | Bố cục thoáng, không có chrome trang trí cạnh tranh với thẻ giấy; B xác nhận không có console error/warning nào |
| 9 | Error Recovery | 4 | Thông báo lỗi đọc IndexedDB trấn an rất tốt: phân biệt rõ "chưa mở được kho" với "mất dữ liệu" |
| 10 | Help and Documentation | 2 | Không có hướng dẫn/gợi ý ngữ cảnh nào cho người mới, dù charter đòi hỏi đây là "nơi ở lại hàng giờ" |
| **Tổng** | | **31/40** | **Good** |

## Xác minh tính đặc thù thiết kế (Design Specificity)

**Đánh giá định tính (A):** Bám sát sản phẩm, không phải chrome chung chung — hệ vật liệu "giấy ghi chú" (`--c-note`, mép cong `.mind-note-card::before`, công thức bóng đổ 3 lớp đổi *vai trò* chứ không chỉ đổi giá trị giữa 2 theme, độ nghiêng ổn định theo hash id thay vì random) là mức đầu tư đúng như surface brief yêu cầu ("vật lý thật, đẩy tới hết mức"). Ô "+" cố tình dùng ngữ pháp vật liệu khác (viền đứt, không cong mép, bóng phẳng hơn) để không bị nhầm là một thẻ thật.

**Quét tự động (B):** `detect.mjs --json` trên `BoardGallery.tsx` + `DanhSachBang.tsx` → **sạch, 0 phát hiện** (exit code 0). Detector chèn vào trình duyệt báo 1 "anti-pattern" (`bounce-easing` kết hợp `layout-transition: max-height, margin-top`), nhưng B đã đối chiếu mã nguồn và xác định đây **nhiều khả năng là false positive**: hai quy tắc CSS toàn cục không liên quan bị gộp nhầm (một là easing bounce dùng cho icon chevron xoay, một là ease-out phẳng dùng cho `.disc-body` — một disclosure ở màn khác, không render trên Board Gallery). Không tìm thấy phần tử/quy tắc nào trong chính 2 file mục tiêu thực sự kết hợp cả hai. Không tính vào vấn đề ưu tiên bên dưới.

**Overlay trực quan:** Injection thành công (toast vàng xuất hiện thật trên trang), nhưng nội dung cảnh báo không đứng vững khi đối chiếu mã nguồn — nên xem là tín hiệu chưa xác nhận, không phải lỗi thật.

## Ấn tượng chung

Board Gallery là một trong số ít màn hình của app thực sự "diễn" đúng vai trò được giao (phòng não phải, vật liệu thật, được đầu tư ≥50%) — thẻ giấy ivory nổi trên nền indigo gần đen ở dark mode là khoảnh khắc thị giác mạnh nhất toàn app theo cả hai đánh giá. Nhưng cơ chế xoá hàng loạt phá vỡ đúng hợp đồng cảm xúc mà chính luồng xoá-đơn vừa thiết lập, và hiệu ứng vật lý tinh vi nhất (nghiêng 3D theo con trỏ) lại vô hình với đúng đối tượng dùng chính — bác sĩ cầm điện thoại một tay.

## Điểm mạnh

1. **Hệ vật liệu giấy ghi chú (`--c-note`, mép cong, bóng đổ 3 lớp đổi vai trò theo theme).** Đúng nguyên tắc "cùng một vật thể dưới hai ánh sáng phòng khác nhau" thay vì "hai thẻ khác nhau" — đây là ranh giới giữa material realism thật và chỉ đổi biến CSS theo dark mode, và codebase đã chọn đúng.
2. **Copy trấn an ở trạng thái lỗi đọc kho lưu trữ.** "Các bảng của bạn vẫn nằm trên máy — app chỉ chưa mở được kho lưu trữ" tách bạch đúng "chưa đọc được" với "mất dữ liệu" — chính xác cái một bác sĩ đang căng thẳng cần nghe.
3. **Ô "+" dùng ngữ pháp vật liệu khác thẻ thật.** Giữ lưới dễ đọc là "N thẻ thật + 1 hành động" thay vì N+1 vật có cùng trọng lượng thị giác.

## Vấn đề ưu tiên

**[P1] Xoá hàng loạt có ít rào cản hơn xoá đơn, dù rủi ro lớn hơn hẳn.**
`DanhSachBang.tsx:2345-2380`: "Chọn tất cả (N)" → "Xoá (N)" chạy `xoaNhieuSong` ngay ở lần chạm kế tiếp, không có bước xác nhận nào — trong khi xoá 1 bảng bắt buộc chạm "Chắc chắn xoá?" lần hai trong cửa sổ `XAC_NHAN_XOA_MS`. Có toast hoàn tác + khay "Đã xoá gần đây" không hết hạn nên không mất vĩnh viễn, nhưng chính sự bất nhất là vấn đề: luồng xoá-đơn dạy người dùng kỳ vọng một khoảng dừng trước hành động phá huỷ, rồi luồng xoá-hàng-loạt lại bỏ khoảng dừng đó đúng lúc phạm vi thiệt hại lớn nhất.
**Vì sao quan trọng:** một bác sĩ trực, thao tác một tay, có thể xoá sạch cả thư viện sơ đồ tư duy (mã nguồn tự gọi đây là "tài sản dài hạn hàng tháng/năm") chỉ trong 2 lần chạm vô tình.
**Cách sửa:** áp lại đúng mẫu xác nhận 2 chạm cho nút "Xoá" hàng loạt, hoặc bắt buộc thêm bước khi `soChonSong` lớn/bằng toàn bộ.
**Lệnh gợi ý:** `/impeccable harden`

**[P2] Bảng mới luôn bị gán ngầm vào chuyên khoa đầu tiên trong danh sách, không có lựa chọn "chưa gán".**
Xác minh trực tiếp: bảng "Bảng chưa đặt tên" vừa tạo hiện icon trái tim, aria-label "chuyên khoa Tim mạch" dù người dùng chưa hề chọn. `taoBangMoi` (`DanhSachBang.tsx:1295-1328`) hard-code `chuyenKhoa: SPECIALTIES[0].id`. Component `TheTrong` đã có sẵn nhánh hiển thị trung tính cho chuyên khoa "chưa xác định" (màu nhạt, icon giấy chung) — nhưng là dead code vì không bảng thật nào từng được tạo mà thiếu chuyên khoa.
**Vì sao quan trọng:** làm ô nhiễm chip lọc chuyên khoa (một bảng hành chính/tổng quát âm thầm tính vào "Tim mạch"), khiến nhãn chuyên khoa mất độ tin cậy khi liếc nhanh — đúng giá trị mà nhãn đó tồn tại để phục vụ.
**Cách sửa:** để bảng mới khởi tạo ở trạng thái "chưa xác định" thật sự, dùng nhánh hiển thị trung tính đã có sẵn; chuyên khoa chỉ gán khi người dùng chủ động chọn.
**Lệnh gợi ý:** `/impeccable harden`

**[P2] Hiệu ứng vật lý tinh vi nhất (nghiêng 3D theo vị trí con trỏ khi hover) vô hình với đối tượng dùng chính.**
`index.css:1131-1136` (`.the-bang-nghieng-con-tro:hover`) chỉ kích hoạt qua hover chuột — không tồn tại trên cảm ứng. PRODUCT.md nêu rõ đây là PWA ưu tiên điện thoại, dùng một tay tại giường bệnh. Đầu tư thiết kế "vật thể thật có trọng lượng" đậm nhất trong màn hình này chỉ ai dùng chuột mới thấy được.
**Vì sao quan trọng:** năng lượng thiết kế đổ vào đúng nơi ít người dùng thật chạm tới nhất; đối tượng đa số chỉ còn lại hiệu ứng `:active` scale mặc định.
**Cách sửa:** thiết kế một tín hiệu vật lý tương đương cho cảm ứng (nghiêng/nhấc nhẹ theo vị trí chạm, không chỉ scale xuống).
**Lệnh gợi ý:** `/impeccable adapt`

**[P3] Cử chỉ nhấn-giữ để mở menu đã được chính mã nguồn xác nhận là "vô hình" qua 3 vòng critique.**
Comment tại `DanhSachBang.tsx:71-78` nói thẳng: sau 3 vòng, cử chỉ vẫn không ai tìm ra, và mỗi lần đội chọn "thêm lối vào hiển thị song song" (nút "Chọn") thay vì sửa/bỏ cử chỉ cũ. Duy trì một tương tác không ai dùng có chi phí thật (thêm nhánh trong `onPointerDown`/`onPointerMove`/`onPointerCancel`, thêm bề mặt cho bug tinh vi) mà không ai hưởng lợi.
**Cách sửa:** hoặc cho nó một gợi ý hiển thị thật (viền kéo nhỏ, hint lần đầu dùng), hoặc bỏ hẳn vì "Chọn" đã phủ đúng chức năng theo cách dễ khám phá hơn.
**Lệnh gợi ý:** `/impeccable distill`

**[P3] Gallery gần-trống (1-3 bảng) trông như dashboard chưa hoàn thiện, chứ không phải "căn phòng" mời gọi.**
Với 0-2 bảng, ~85% màn hình dưới nếp gấp là khoảng trống (xác nhận qua ảnh chụp ở cả hai đánh giá). Với một mặt hàng được charter tuyên bố "đáng để ở lại hàng giờ, đáng 50%+ tổng đầu tư thiết kế", trải nghiệm trung thực đầu tiên của hầu hết người dùng mới — một gallery có 1 bảng — hiện trông như dashboard rỗng hơn là bàn làm việc mời gọi.
**Cách sửa:** thiết kế riêng cho mật độ 1-3 bảng (không chỉ trạng thái rỗng tuyệt đối vốn đã được đầu tư kỹ).
**Lệnh gợi ý:** `/impeccable onboard`

## Cờ đỏ theo persona

**Jordan (người mới):** Không có gì trên màn hình tự nói "vì sao tab này khác mọi màn khác trong app" — lời hứa "phòng não phải, đáng ở lại hàng giờ" hoàn toàn bằng lời, chưa từng được *cho xem*. Jordan cũng không biết bảng mới của mình vừa bị âm thầm gán "Tim mạch" (P2) trừ khi mở menu "⋯" sau đó và để ý dropdown đã chọn sẵn.

**Riley (stress-tester):** Sẽ tìm ra đúng lỗ hổng đầu tiên: vào "Chọn" → "Chọn tất cả (N)" → "Xoá (N)" — 2 chạm, không xác nhận, N bảng biến mất khỏi lưới sống (P1). Đáng ghi nhận: double-tap nhanh vào "+" khi đang đổi tên bảng khác đã được chặn đúng (no-op có chủ đích trong `taoBangMoi`).

**Casey (di động):** Mọi thứ A xác minh trực tiếp được (lưới, chip, ô tìm kiếm, thẻ giấy, ô "+") render sạch ở 375×812, cả 2 theme, không tràn/cắt. Điểm yếu thật của Casey nằm ở đúng chỗ không kiểm chứng trực tiếp được lần này (lỗi tool): luồng FLIP mở bảng và xác nhận xoá — hai nơi thao tác ngón tay vội/gián đoạn giữa chừng quan trọng nhất trên điện thoại.

## Quan sát nhỏ

- Nút "..." trên thẻ không có nền/viền (cố ý) — cạnh icon trái tim chi tiết, 3 chấm nhỏ dễ bị bỏ sót lần đầu nhìn; mức độ thấp vì đã có lối vào "Chọn" song song.
- Chữ mờ "X phút trước" ở light theme đo được **≈4.88:1** — vẫn qua AA (4.5:1) nhưng biên rất mỏng; đáng chú ý nếu có thay đổi nào làm xám nhạt hơn nữa sau này.
- Ở viewport rộng (1280×800), nội dung không giãn ra dùng hết chiều rộng — vẫn ghim ở cột hẹp ~396px kiểu di động, để trống phần lớn màn hình. Có thể là chủ đích (app ưu tiên điện thoại) — nêu ra để chủ dự án xác nhận, không tính là lỗi.
- `.mind-board-grid` không ảo hoá danh sách — ổn ở quy mô cá nhân (chục bảng), chỉ đáng lưu ý nếu tương lai tính đến hàng trăm bảng.

## Câu hỏi đáng suy ngẫm

1. Nếu một bảng được chính mã nguồn gọi là "tài sản dài hạn hàng tháng/năm," vì sao tạo bảng lại ép ngay một nhãn chuyên khoa không thể gỡ, trước khi người dùng chắc chắn nó có thuộc một chuyên khoa? "Chưa xác định" như một trạng thái thật, lọc được, có phục vụ tốt hơn bác sĩ vẽ thứ liên chuyên khoa hoặc cá nhân không?
2. Hiệu ứng vật lý tinh vi nhất (nghiêng 3D theo con trỏ) chỉ người *đánh giá màn hình* mới cảm nhận được, không phải bác sĩ dùng thật trên điện thoại. Nếu material realism là sứ mệnh, cảm ứng có xứng đáng một tín hiệu vật lý riêng thay vì chỉ thừa hưởng scale `:active`?
3. Ba vòng critique độc lập đều thấy cử chỉ nhấn-giữ vô hình, và mỗi lần cách xử lý là "thêm lối vào hiển thị song song" thay vì "sửa hoặc bỏ cái vô hình." Đến khi nào một cử chỉ không ai tìm ra thôi được gọi là tính năng và bắt đầu là một khoản thuế bảo trì được giữ lại chỉ vì quán tính?
