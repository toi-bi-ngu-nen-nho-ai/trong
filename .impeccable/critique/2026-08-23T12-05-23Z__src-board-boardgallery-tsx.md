---
target: MindMapScreen (BoardGallery)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-23T12-05-23Z
slug: src-board-boardgallery-tsx
---
Method: dual-agent (A: ab5d9494998764efb · B: ad02cb485935c8702)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Cửa sổ xác nhận-xoá (5s) và cửa sổ hoàn tác (5s) tự hết hạn **im lặng**, không đếm ngược, không cảnh báo — xác nhận thực nghiệm: chạm Xoá lần 1, đợi >5s, chạm lại thì bị đọc như lần chạm đầu tiên mới |
| 2 | Match System / Real World | 4 | Tiếng Việt tự nhiên, ẩn dụ "thẻ ảnh trên bàn" (nghiêng ngẫu nhiên, un-rotate khi hover) đúng ngữ cảnh lâm sàng |
| 3 | User Control and Freedom | 2 | "Xoá mềm, phục hồi được" của PRODUCT.md chỉ đúng trong 5 giây không cảnh báo — sau đó không còn UI nào để lấy lại, dù dữ liệu vẫn còn trong IndexedDB |
| 4 | Consistency and Standards | 2 | `.mind-focus-ring` được áp nhất quán cho MỌI nút trong `DanhSachBang.tsx` — trừ đúng ô `<input>` đổi tên, phá vỡ chính pattern file này vừa thiết lập |
| 5 | Error Prevention | 3 | Xác nhận 2 lần trước khi xoá đúng ngữ cảnh chạm nhầm trên di động, nhưng "phòng ngừa" chỉ có tác dụng 5 giây rồi thành xoá vĩnh viễn không cảnh báo |
| 6 | Recognition Rather Than Recall | 2 | Xác nhận thực nghiệm: tạo liên tiếp 3 bảng → cả 3 tên "Bảng chưa đặt tên", ảnh xem trước giống hệt byte-cho-byte, chỉ khác nhãn giờ/góc nghiêng ±3° |
| 7 | Flexibility and Efficiency | 1 | Không phím tắt, không chọn nhiều/xoá hàng loạt, không kéo-thả sắp xếp |
| 8 | Aesthetic and Minimalist Design | 3 | Sạch, đúng tinh thần "flat by default"; trừ điểm vì thiếu tín hiệu màu đặc trưng khiến màn "phẳng" hơn mức cần |
| 9 | Error Recovery | 2 | Không lỗi nào ở luồng thường, nhưng `add()`/`update()` của `useIdbCollection` là "fire-and-forget" theo code — không báo lỗi nếu IndexedDB ghi thất bại (quota đầy, Safari ẩn danh) |
| 10 | Help and Documentation | 1 | Chỉ 1 dòng gợi ý ở trạng thái rỗng; "⋯" ẩn menu không có gợi ý ngữ cảnh nào |
| **Total** | | **23/40** | **Acceptable** |

*Điểm trùng với lượt trước (2026-08-23, trước khi sửa 4 vấn đề P1/P2) dù cả 4 fix đó đã xác nhận đứng vững trên trình duyệt thật — vì lượt này tìm ra 5 vấn đề MỚI cùng độ nghiêm trọng thay vào chỗ trống, không phải màn hình thụt lùi. Dao động điểm số bình thường giữa hai lượt chấm độc lập.*

## Design Specificity Verdict

**Hỗn hợp.** Hệ vật lý thẻ (nghiêng ổn định theo hash id, hover nghiêng-theo-con-trỏ, `card-settle`/`card-plop`/`card-slide-out`, `board-in`/`board-out`) thật sự đặc thù sản phẩm — Assessment A xác nhận trên trình duyệt thật (`transform: matrix(0.96,0,0,0.96,0,10)` đúng khung hình `card-settle`, lưới 2 cột chia đều chính xác 167.667px/167.667px với 3 thẻ). Đây vẫn là điểm khác biệt mạnh nhất.

Nhưng kiến trúc thông tin và màu sắc thì category-interchangeable: lưới 2 cột + ô "+" nét đứt + menu "⋯" Đổi tên/Xoá giống hệt Google Photos album, Notion page, Apple Notes folder. Grep `src/board/`: **0 lần dùng `accent-2`** (Mindmap Magenta — "The One Other Place Rule" của DESIGN.md) trong màn danh sách.

**Phát hiện mới quan trọng nhất:** PRODUCT.md hứa mỗi `MindBoard` có "tên/màu/chuyên khoa gắn thẻ tuỳ chọn", nhưng `src/board/boardMeta.ts` cho thấy `BangMeta` thật chỉ có `id/ten/taoLuc/capNhatLuc/anhXemTruoc/daXoaLuc` — **không có trường màu/chuyên khoa nào**. Tính năng gắn thẻ chuyên khoa mà PRODUCT.md hứa đã không được mang sang bản viết lại IndexedDB (hoặc chưa từng có). Đây là mảnh ghép còn thiếu: nếu bổ sung, nó giải quyết đồng thời cả vấn đề "thẻ giống hệt nhau" (heuristic 6) lẫn thiếu tín hiệu màu đặc trưng, mà không đụng Untouchable Signal Rule.

**Deterministic scan (Assessment B):** `detect.mjs --json` trên 4 file (`BoardGallery.tsx`, `DanhSachBang.tsx`, `EdgelessBoard.tsx`, `index.tsx`, loại `__tests__/`/`src/vendor/`) — **sạch tuyệt đối, `[]`, exit 0**. Overlay trình duyệt (live-server + detect.js tiêm vào trang thật) bắt 6 anti-pattern: `layout-transition` (1×, max-height/margin-top) đã whitelist sẵn trong `.impeccable/config.json` từ 2026-08-08 (tradeoff Disclosure cố ý, không phải vấn đề mới) và `undersized-ui-text` (5×, nhãn bottom-nav 10px "Trang chủ"/"Thư viện"/"Hướng dẫn"/"Mindmap"/"Thẻ ghi nhớ") — finding thật nhưng nằm trong `src/App.tsx` (chrome toàn app), NGOÀI phạm vi 4 file board mục tiêu, dù hiện diện trên màn hình khi xem Mindmap. Không có `ai-color-palette`/`design-system-color` nào bị bắt lại lượt này.

## Overall Impression

Chuyển động vẫn là linh hồn của màn này và đứng vững qua kiểm chứng trực tiếp — 4 vấn đề của lượt critique trước đã sửa đúng và không hồi quy. Nhưng "xoá mềm" giờ là một lời hứa nửa vời nguy hiểm hơn cả bug cũ: thay vì mất dữ liệu ngay lập tức (dễ thấy, dễ trách), giờ là một cửa sổ 5 giây im lặng đóng lại rồi không ai biết — đúng kiểu lỗi khiến người dùng tự trách bản thân "chắc tôi thao tác sai" thay vì trách hệ thống. Cơ hội lớn nhất tiếp theo: đưa trường chuyên khoa/màu trở lại `BangMeta` — một thay đổi nhỏ giải quyết cùng lúc 2 vấn đề độc lập (thẻ giống hệt nhau + thiếu bản sắc màu).

## What's Working

1. **Hệ vật lý thẻ chạy đúng thiết kế, xác nhận trên trình duyệt thật** — không chỉ đọc code suông.
2. **Nút "quay lại" 44×44 đã sửa đúng** (`width: 44px; height: 44px`), chênh lệch nhỏ ban đầu chỉ là làm tròn devicePixelRatio, không phải lỗi thật.
3. **Pattern xác nhận 2 lần trước khi xoá + toast hoàn tác** là lựa chọn đúng cho thao tác một tay — vấn đề không nằm ở ý tưởng mà ở cửa sổ thời gian quá ngắn và im lặng.

## Priority Issues

**[P1] Cửa sổ "Hoàn tác" 5 giây là vách đá im lặng — không có màn "thùng rác" phía sau**
- **Why it matters**: Lời hứa cốt lõi của PRODUCT.md ("xoá mềm, phục hồi được") chỉ đúng trong đúng 5 giây không cảnh báo. Comment trong `boardMeta.ts` tự xác nhận: chưa có màn "thùng rác". Sau 5 giây, bảng vẫn tồn tại thật trong IndexedDB (`daXoaLuc` được set) nhưng không có đường dẫn UI nào để lấy lại — đúng bối cảnh trực cấp cứu bị gọi liên tục mà PRODUCT.md tự mô tả, bỏ lỡ 5 giây là chuyện rất dễ xảy ra.
- **Fix**: Thêm một nơi (dù chỉ 1 lần chạm nữa, vd mục "Đã xoá gần đây" trong menu) để phục hồi bảng đã xoá mềm còn trong IndexedDB, trước khi xây hẳn màn thùng rác đầy đủ. Cân nhắc tạm dừng bộ đếm giờ toast khi tab bị ẩn (`visibilitychange`) thay vì chạy im lặng khi người dùng không nhìn màn hình.
- **Suggested command**: `/impeccable harden`

**[P2] Ô nhập đổi tên hoàn toàn không có tín hiệu focus — vi phạm chính rule "Focus Rings" của DESIGN.md**
- **Why it matters**: Xác nhận qua computed style thật: `border: 0px none`, `outline: none` trên `<input>` đổi tên (`DanhSachBang.tsx:149-161`) — hệ quả của 2 rule reset toàn cục cộng lại mà không được bù bằng `.mind-focus-ring` như mọi nút khác trong đúng file này đã dùng.
- **Fix**: Thêm `className="mind-focus-ring"` + viền nghỉ nhẹ cho `<input>` này.
- **Suggested command**: `/impeccable harden`

**[P2] Nhiều bảng vừa tạo giống hệt nhau — không thể phân biệt**
- **Why it matters**: Xác nhận thực nghiệm: tạo 3 bảng liên tiếp → cả 3 tên "Bảng chưa đặt tên", ảnh xem trước giống hệt byte-cho-byte. Phá vỡ trực tiếp heuristic Recognition Rather Than Recall.
- **Fix**: Yêu cầu đặt tên ngay lúc tạo, hoặc tự động mở chế độ đổi tên ngay sau khi tạo. Về lâu dài, đưa trường chuyên khoa trở lại `BangMeta` (xem Design Specificity Verdict) — giải quyết cả phân biệt lẫn thiếu bản sắc màu.
- **Suggested command**: `/impeccable clarify`

**[P2] Tên bảng dài kéo giãn cả hàng lưới, để lại khoảng trắng chết ở thẻ bên cạnh**
- **Why it matters**: Xác nhận thực nghiệm bằng tên lâm sàng thực tế (danh sách chẩn đoán phân biệt) — không có `line-clamp`/`text-overflow`. CSS Grid kéo giãn mọi ô cùng hàng theo ô cao nhất — thẻ liền kề (tên ngắn) bị kéo cao thêm ~50px trống rỗng.
- **Fix**: Giới hạn tên hiển thị 2 dòng bằng `-webkit-line-clamp: 2` + `overflow: hidden`, hoặc chặn độ dài lúc lưu.
- **Suggested command**: `/impeccable polish`

**[P3] Màn vẫn chưa mang màu đặc trưng nào của Mindmap — carryover, giờ có hướng giải cụ thể**
- **Why it matters**: 0 lần dùng `accent-2` trong `src/board/`. Nay có lý do cụ thể: thiếu trường màu/chuyên khoa trong `BangMeta`.
- **Fix**: Quyết định chủ ý — giữ trung tính (magenta dành hẳn cho canvas) hoặc thêm màu theo chuyên khoa làm tín hiệu nhận diện thật (không đụng Untouchable Rule).
- **Suggested command**: `/impeccable colorize`

## Persona Red Flags

**Casey (di động một tay, hay bị gián đoạn)**: Toast "Hoàn tác" chỉ sống 5 giây, không giữ lại trạng thái khi Casey bị gọi đi giữa chừng — cô sẽ không tìm lại được bảng vừa xoá. Cửa sổ xác nhận-xoá cũng tự reset sau 5 giây im lặng, khiến lần chạm "Xoá" thứ hai (sau khi quay lại) bị đọc như lần chạm đầu tiên mới — Casey sẽ bối rối.

**Riley (kiểm tra biên độ)**: Tạo liên tiếp nhiều bảng (thao tác hợp lệ) cho ra kết quả pixel-giống-hệt-nhau. Tên dài thật làm vỡ chiều cao hàng lưới. Bảng xoá mềm sống vĩnh viễn trong IndexedDB không có đường quay lại sau 5s — Riley sẽ liệt đây vào nhóm "mất dữ liệu âm thầm".

**Sam (bàn phím/trình đọc màn hình)**: `<input>` đổi tên không có chỉ báo focus nào — vi phạm WCAG 2.4.7 và chính rule Focus Ring của DESIGN.md. (Công bằng: mọi NÚT khác trong cùng file đều có `.mind-focus-ring:focus-visible` đúng chuẩn — lỗ hổng cô lập ở đúng 1 phần tử.)

## Minor Observations

- `XAC_NHAN_XOA_MS` và `HOAN_TAC_XOA_MS` đều 5000ms dùng chung giá trị có sẵn, dù hai khoảnh khắc rủi ro khác hẳn nhau (chạm lại vs mất dữ liệu) — đáng tách riêng, cho undo dài hơn.
- Vị trí "⋯" ở góc trên-phải thẻ, sát nơi ngón cái lướt qua khi cầm điện thoại một tay — chưa kiểm chứng được trên thiết bị thật.
- Thẻ trống hoàn toàn vẫn ghi `anhXemTruoc` (hình chữ nhật tối trơn) khi rời bảng, trông giống "ảnh chưa tải được" hơn là chủ đích.
- (Assessment B) 5 nhãn bottom-nav 10px dưới ngưỡng 11px — nằm trong `src/App.tsx`, ngoài phạm vi 4 file board, nhưng hiện diện trên chính màn Mindmap.

## Questions to Consider

1. PRODUCT.md hứa mỗi `MindBoard` có "tên/màu/chuyên khoa gắn thẻ tuỳ chọn" nhưng `BangMeta` thật không có trường nào trong số đó ngoài tên — tính năng này bị bỏ lại ở bản viết lại IndexedDB, hay chưa từng được mang sang?
2. Cửa sổ xác nhận-xoá và cửa sổ hoàn tác có thật sự cần dùng chung 5 giây, khi rủi ro hai bên khác hẳn nhau?
3. Bảng xoá mềm không ai xử lý sẽ nằm mãi trong IndexedDB — có cần giới hạn kích thước/tuổi trước khi màn thùng rác thật sự ra đời?
