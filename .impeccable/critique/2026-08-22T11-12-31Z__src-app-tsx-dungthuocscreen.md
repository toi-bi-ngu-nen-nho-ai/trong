---
target: DungThuocScreen
total_score: 37
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-22T11-12-31Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: aa304f9e1f3419f71 · B: ad79193f8264a1702)

⚠️ **Lưu ý môi trường quan trọng (cả hai đánh giá độc lập cùng phát hiện)**: Server dev "luôn chạy" mà bạn thường thấy trong preview panel (cổng 8577) **không phục vụ đúng repo này** — nó đang chạy từ một worktree khác (`.claude/worktrees/database-note-day-du`, nhánh "Database + Note"), vẫn còn source CŨ trước khi vá (`ABX_GROUP_COLLAPSE_COUNT = 8`). Cả hai subagent phải tự dựng server tạm ở cổng khác (8591, 8580) trỏ đúng vào `C:\Users\LENOVO\Downloads\drtrong` để kiểm chứng được bản đã sửa. **Nếu bạn mở preview panel lúc này, bạn đang xem nhánh khác, không phải DungThuocScreen vừa sửa.** Đây không phải lỗi thiết kế — là lỗi cấu hình môi trường, nên báo riêng để bạn biết trước khi tự kiểm tra bằng mắt.

## Điểm sức khỏe thiết kế

| # | Nguyên tắc Nielsen | Điểm | Vấn đề chính |
|---|---|---|---|
| 1 | Hiển thị trạng thái hệ thống | 4 | Thanh xác nhận-tự huỷ, vùng aria-live, trạng thái tab/chip active — đều xác minh trực tiếp qua DOM |
| 2 | Khớp với thế giới thực | 4 | Thuật ngữ chuẩn (CrCl, AKI, IHD/CRRT/SLED/PD), văn phong liều lượng tiếng Việt tự nhiên |
| 3 | Quyền kiểm soát & tự do | **3** (giảm từ 4) | Nhảy chữ cái giờ ép mở toàn bộ danh sách kể cả khi thuốc cần đã có sẵn trong 6 chip mặc định — người dùng không yêu cầu hành động đó |
| 4 | Nhất quán & chuẩn mực | **4** (tăng từ 3) | Mẫu xác nhận-đếm ngược, token `--c-*`, hình pill dùng lại nhất quán ở mọi nơi đã kiểm |
| 5 | Ngăn ngừa lỗi | 4 | `parseStrictNumber`, chặn số lọ bất thường, xác nhận 2 bước + hoàn tác 20s cho hành động phá hủy nhất |
| 6 | Nhận diện hơn ghi nhớ | **3** (giảm từ 4) | Tách cụm chip lọc máu chỉ đúng về cấu trúc DOM — khoảng cách giữa 2 cụm (6px) bằng hệt khoảng cách giữa các chip trong cùng cụm, mắt không nhận ra có 2 nhóm |
| 7 | Linh hoạt & hiệu quả | **3** (giảm từ 4) | Nhảy chữ cái làm ngược mục tiêu tốc độ của chính nó — thao tác "tắt" giờ tốn công hơn cả không bấm |
| 8 | Thẩm mỹ & tối giản | **4** (tăng từ 3) | Thẻ phẳng, số liều bình tĩnh, motion chỉ ở vùng nav — khớp DESIGN.md khi đo thật, không chỉ đúng tên class |
| 9 | Khôi phục lỗi | 4 | Cảnh báo công thức thiếu giải thích rõ lý do bằng lời thay vì biến mất im lặng |
| 10 | Trợ giúp & tài liệu | 4 | Nguồn + ngày cập nhật mỗi thuốc, có cờ cảnh báo riêng khi thuốc thiếu nguồn |
| **Tổng** | | **37/40** | **Xuất sắc — điểm giữ nguyên so với lần trước, nhưng đổi thành phần: 2 mục tăng, 3 mục giảm** |

## Kết luận về tính đặc thù thiết kế

**LLM**: Vẫn ở mức cao — mọi quyết định màu/khoảng cách đều truy được về một token và một quy tắc đã ghi chép, kể cả lý do đằng sau từng lựa chọn (comment trích thẳng critique lần trước). Đây là codebase "tự tranh luận bằng văn bản trước khi ship" — hiếm và có giá trị. Nhưng cũng có nghĩa: khoảng trống mới (RRT split) là một cú trượt chính xác trên đúng ý định đã tuyên bố, không phải sự cẩu thả mơ hồ.

**Detector**: `detect.mjs` vẫn chỉ 1 phát hiện trong cả file — cùng false positive ở dòng 939 (mask-image alpha stop) từ lần trước, nằm ngoài DungThuocScreen. **Riêng DungThuocScreen: 0 phát hiện thật.**

**Bằng chứng trực quan**: Ảnh chụp màn hình vẫn không khả dụng phiên này (giới hạn môi trường "Browser pane không compositing" tái diễn) — cả hai đánh giá viên đều tự dựng server tạm để kiểm đúng nhánh, dùng `read_page`/`javascript_exec` đo trực tiếp DOM thay ảnh. Điểm đáng chú ý nhất: **cả hai đo độc lập trên hai server khác nhau (8591 và 8580) ra CÙNG một con số** — khoảng cách dọc giữa 2 cụm chip lọc máu = 6px, bằng hệt khoảng cách ngang giữa các chip trong một cụm (655.19 → 705.19, gap 6px cả hai chiều). Hai nguồn độc lập trùng khớp pixel-for-pixel là bằng chứng mạnh, không phải trùng hợp.

## Ấn tượng tổng thể

Cả 5 vá lỗi từ lần trước đều **thực sự tồn tại trong mã và hoạt động đúng cơ chế** — không có vá giả hay code chết. Nhưng 2 trong 5 vá mang theo tác dụng phụ tinh vi: chia cụm chip lọc máu đúng về cấu trúc nhưng vô hình về thị giác (khoảng cách bằng nhau nên mắt không thấy 2 nhóm), và thanh nhảy chữ cái giờ "làm quá tay" — ép mở toàn bộ danh sách + cuộn ngay cả khi thuốc cần đã hiện sẵn trong 6 chip mặc định, đi ngược chính mục tiêu tốc độ mà nó sinh ra để phục vụ. Điểm tổng giữ nguyên 37/40 không phải vì đứng yên — mà vì 2 điểm tăng (nhất quán, tối giản) bù đúng cho 3 điểm giảm (kiểm soát, ghi nhớ, hiệu quả).

## Điểm mạnh

1. **`App.tsx:8381-8390`** — vá màu dòng "Cách dùng" không chỉ đổi màu mà còn giữ nguyên `key={autoUsage.vialCount}` có chủ đích để dòng chỉ "dựng lại" đúng lúc SỐ LỌ thật sự đổi — xác minh trực tiếp: không animation, màu tĩnh `var(--c-text)`.
2. **Mẫu xác nhận 2 bước + đếm ngược 20s trong `aria-label`** ("chạm lần nữa để xác nhận, tự huỷ sau 20 giây") dùng lại nhất quán ở 3 hành động phá hủy khác nhau trong file — accessibility thật, không chỉ đủ chuẩn.
3. **`App.tsx:8586`** — xác minh trực tiếp đúng 6 chip trước "Xem tất cả", khớp lý do cognitive-load đã ghi trong comment.

## Vấn đề ưu tiên

**[P2] Tách cụm chip lọc máu đúng cấu trúc nhưng không đăng ký được về thị giác** — `App.tsx:5812-5863`. Khoảng cách dọc giữa "Không lọc/AKI" và "IHD/CRRT/SLED/PD" (6px) bằng hệt khoảng cách ngang giữa các chip trong cùng cụm — ở trạng thái nghỉ (chưa chọn gì, toàn xám), một bác sĩ quét mắt dưới áp lực thời gian sẽ đọc đây là MỘT hàng 6 chip bị wrap, không phải 2 nhóm khái niệm khác nhau. Bản refactor không mang lại tốc độ quét như mục tiêu ban đầu. **Fix**: nới khoảng cách dọc rõ rệt hơn khoảng ngang (ví dụ `mb-1.5` → `mb-3` là mức tối thiểu), lý tưởng thêm nhãn phụ nhỏ dưới cụm 2 (vd "Lọc máu") để nhóm sống được ngay cả khi không chip nào active. → `/impeccable layout`

**[P3] Nhảy chữ cái ép mở toàn bộ danh sách kể cả khi không cần** — `App.tsx:8809-8818`. Với một thuốc có chữ cái đã nằm trong 6 chip mặc định (vd "A" khi Amikacin/Ampicillin... đã hiện sẵn), bấm chữ cái vẫn mở hết 23 mục + cuộn mượt tới nơi vốn đã ở trên màn hình — thêm motion và ~60ms chờ để tới đúng chỗ đã nhìn thấy. Đi ngược mục tiêu tốc độ mà chính tính năng này tồn tại để phục vụ. **Fix**: kiểm tra nhóm của chữ cái đích đã có sẵn trong `browseGroups` chưa trước khi mở rộng; nếu có rồi thì chỉ focus/tô sáng tại chỗ. → `/impeccable clarify`

**[P3] Độ tin cậy cuộn-tới-chữ-cái trên thiết bị thật chưa xác minh được** — vùng `scrollIntoView({behavior:"smooth"})`. Trong môi trường headless của phiên này, gọi trực tiếp trên chính phần tử đích cho kết quả 0 pixel cuộn, trong khi `behavior:"auto"` cuộn đúng ngay lần đầu — có thể là hiện tượng flaky riêng của headless Chrome, không hẳn là lỗi thật, nhưng chưa loại trừ được. Nếu lỗi thật xảy ra trên điện thoại thật, tính năng sẽ "mở danh sách rồi bỏ mặc người dùng ở nguyên vị trí cũ" — tệ hơn cả không làm gì vì còn mất luôn vị trí cuộn cũ. **Fix**: kiểm tra tay trên điện thoại thật trước khi coi vá này là xong; cân nhắc chuyển sang kỹ thuật `scrollRef.current.scrollTo(...)` đã dùng ổn định cho chuyển tab (`App.tsx:11398`) thay vì `scrollIntoView` gốc. → `/impeccable audit`

**[P3] Hằng số gấp gọn bên thuốc truyền chưa từng được kiểm chứng trong thực tế** — `App.tsx:10698`. Không phải lỗi hiện tại, nhưng comment "cố ý đồng bộ hai màn" đang đưa ra một cam kết chưa kiểm chứng được: cả 9 nhóm thuốc truyền (kể cả dữ liệu tự thêm) chưa nhóm nào vượt quá 6 mục (đã kiểm Vận mạch=4, Nội môi=5) nên UI gấp gọn chưa từng thực sự kích hoạt ở tab này — chỉ nên ghi chú lại để không ai lầm tưởng đã kiểm bằng mắt. → không cần lệnh riêng, theo dõi khi thêm dữ liệu

## Cảnh báo theo persona

**Alex (biết sẵn tên thuốc, muốn đường tắt)**: dính trực tiếp vào lỗi nhảy chữ cái — bấm "A" cho Amikacin, nhận về việc mở toàn bộ danh sách + hoạt ảnh cuộn cho một thuốc vốn đã là chip đầu tiên trên màn. Đường tắt vẫn hoạt động, nhưng không còn cảm giác là đường tắt.

**Casey (một tay, quét nhanh)**: sẽ là người đầu tiên không nhận ra "Không lọc/AKI" và "IHD/CRRT/SLED/PD" là hai LOẠI quyết định khác nhau — phải biết trước sự khác biệt lâm sàng mới thấy được trong layout, vì layout chưa tự dạy điều đó.

**Kịch bản bị gián đoạn giữa ca** (đúng tình huống 20s-undo được thiết kế cho, `App.tsx:11042-11044`): được phục vụ tốt — xác minh trực tiếp toast có `aria-live="assertive"` và cửa sổ 20 giây có thật, nên một bác sĩ bị cuộc gọi cắt ngang giữa lúc chạm thật sự được cảnh báo và có thời gian khôi phục.

## Quan sát nhỏ

- `App.tsx:11413-11414` — gradient mờ hai đầu hàng tab dùng `var(--c-page)`, theme-aware đúng chuẩn, không có hex cứng nào tìm thấy.
- Toàn bộ input đo được đúng `16px` — sàn 16px không có sai số, không chỉ "gần đủ".
- Vùng chạm chip RRT đo được 44×49px — khớp chính xác quy tắc 44px.
- `App.tsx:11404` có comment giải thích lý do chọn `C.textSoft` thay vì `text-muted` để đạt AA cho tab chưa chọn — bản năng tốt, nhưng chưa tự đo lại tỷ lệ tương phản độc lập; đáng kiểm nhanh nếu có công cụ audit contrast trong đợt sau.
- Các tab thuốc truyền đã kiểm (Vận mạch, Nội môi) chưa bao giờ chạm ngưỡng gấp gọn 6 chip với dữ liệu hiện tại — chưa phải vấn đề, nhưng nghĩa là nhánh code đó chưa từng được thấy chạy thật.

## Câu hỏi gợi mở

- Hàng chip lọc máu có nên dùng một đường phân cách nhỏ (1px hoặc dấu "·") giữa hai cụm thay vì chỉ dựa vào khoảng trắng? Khoảng trắng đã đo được là thất bại ở đây — một đường phân cách sẽ sống được ở mọi độ rộng màn hình mà không cần tinh chỉnh khoảng cách.
- Nhảy chữ cái có nên áp dụng đúng triết lý "bỏ qua bước nếu không có quyết định thật" mà `autoDisease`/`autoEntry` đã dùng ở nơi khác trong file (`App.tsx:8691-8712`) — kiểm tra thuốc đã hiện sẵn hay chưa trước khi ép mở?
- Có nên thống nhất toàn bộ cơ chế cuộn trong màn này về kỹ thuật `scrollRef` (đã chứng minh ổn định cho chuyển tab) thay vì còn dùng cả `scrollIntoView` gốc — loại bỏ hẳn một nhóm lỗi "chạy tốt trên máy tôi" trước khi nó tới tay người dùng thật?
