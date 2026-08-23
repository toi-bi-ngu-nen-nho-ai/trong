---
target: MindMapScreen (BoardGallery)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-23T10-50-28Z
slug: src-board-boardgallery-tsx
---
# Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Thiếu toast xác nhận SAU khi xoá (app đã có sẵn class `.toast-in-full` cho đúng việc này nhưng không dùng ở đây); `loading` trả `null` — không skeleton |
| 2 | Match System / Real World | 4 | Tiếng Việt tự nhiên, ẩn dụ "chồng ảnh" khớp trực giác — không có gì để chê |
| 3 | User Control and Freedom | 1 | Xoá bảng **vĩnh viễn, không hoàn tác** — ngược với chính lời hứa "xoá mềm" của PRODUCT.md; menu "⋯" không đóng bằng chạm-ra-ngoài/Escape |
| 4 | Consistency and Standards | 2 | Token `--c-surface-soft` không tồn tại → fallback màu be cũ trên nền indigo tối; nút "←" dùng `boxShadow` cứng thay vì `var(--c-shadow)`; màu magenta độc quyền của màn này không được dùng |
| 5 | Error Prevention | 2 | Xác nhận 2 lần trước khi xoá là phòng ngừa thật, nhưng không chặn được hậu quả tệ nhất (mất vĩnh viễn); không giới hạn độ dài tên bảng |
| 6 | Recognition vs Recall | 4 | "+" luôn hiện, nhãn luôn là chữ, thumbnail hỗ trợ nhận diện — tốt |
| 7 | Flexibility and Efficiency | 1 | Không phím tắt, không multi-select, không ghim, không search dù PRODUCT.md nói có |
| 8 | Aesthetic and Minimalist | 3 | Bố cục sạch, nhưng có 2 lỗi render thật (token màu, lưới lệch) làm vết bẩn thị giác |
| 9 | Error Recovery | 2 | Copy lỗi tốt (tiếng Việt, không mã kỹ thuật) nhưng chất lượng phục hồi không đều — một màn có "Thử lại" thật, màn kia chỉ bảo tải lại trang; lỗi nghiêm trọng nhất (xoá nhầm) không có đường phục hồi |
| 10 | Help and Documentation | 1 | Không tooltip, không hint, không giải thích "xoá là vĩnh viễn" ở đâu cả |
| **Total** | | **23/40** | **Acceptable — cần cải thiện đáng kể trước khi coi là ổn, nền tảng không vỡ** |

# Design Specificity Verdict

**LLM assessment:** Lớp gallery có vật lý thẻ (nghiêng/plop/settle) viết riêng cho sản phẩm, không phải hàng có sẵn — nhưng DESIGN.md dành đúng một màu (Mindmap Magenta `--c-accent-2`) làm dấu hiệu bản sắc độc quyền của chính màn này ("The One Other Place Rule"), và grep toàn bộ `src/board/` cho ra 0 kết quả. Bỏ hiệu ứng chuyển động đi, lưới này là dashed "+" tile + card ảnh xám bo góc — công thức lắp được vào bất kỳ app ghi chú nào. Bản sắc nằm ở chuyển động, không nằm ở màu.

**Deterministic scan:** CLI (`detect.mjs`) sạch tuyệt đối trên 4 file wrapper (exit 0, `[]`). Browser overlay tìm được 6 anti-pattern, phần lớn KHÔNG phải vấn đề mới sau khi đối chiếu ngữ cảnh: `bounce-easing`/`layout-transition` đã whitelist sẵn trong `.impeccable/config.json`; `undersized-ui-text` (nav 10px) thuộc `App.tsx` ngoài phạm vi, và DESIGN.md đã tài liệu hoá đây là lựa chọn cố ý có kiểm contrast; `ai-color-palette` là false positive (đây là Electric Indigo, màu thương hiệu chính thức đã rebrand có chủ đích); `repeating-stripes-gradient` có comment tại chỗ xác nhận chủ đích, chỉ chưa whitelist chính thức.

**Visual overlays:** Injection thành công, detector chạy thật (6 `div.impeccable-overlay` đếm được trong DOM), nhưng live-server đã dừng sau khi thu bằng chứng theo đúng quy trình — không còn tab overlay nào đang mở. Cả hai subagent xác nhận độc lập: screenshot timeout (Browser pane không compositing), và nội dung trong board editor nằm sau shadow DOM `closed`.

# Overall Impression

Lớp dự án tự viết (gallery, thẻ, wrapper theme) có chăm chút thật, nhưng có khoảng hở giữa PRODUCT.md hứa (xoá mềm, tìm kiếm, tag chuyên khoa, xuất PNG/PDF) và những gì `src/board/` hiện tại thực sự làm — di sản của lần migrate sang BlockSuite (khớp với surface brief cũ cũng trỏ tới file đã xoá). Cơ hội lớn nhất là đóng khoảng hở giữa lời hứa và thực tế, bắt đầu từ xoá-vĩnh-viễn.

# What's Working

1. Hệ vật lý thẻ bảng (`index.css:550-662`) — góc nghiêng ổn định theo id, phân biệt rõ mới-tạo/vào-lưới/bị-xoá, tự ghi chú lại lỗi đã vá.
2. Cầu nối theme React↔Lit — đã kiểm live, `<html>` và `.drt-edgeless-viewport` cùng đọc đúng `data-theme="dark"`.
3. Bảo vệ chống mất nháp khi đổi tên — đã kiểm live, Escape hồi phục đúng tên gốc.

# Priority Issues

**[P1] Xoá bảng vĩnh viễn, không hoàn tác — ngược với lời hứa của chính PRODUCT.md**
Why: `DanhSachBang.tsx` → `useIdbCollection.remove()` → `idbDelete()` thẳng, không qua soft-delete. PRODUCT.md viết rõ "xoá mềm... phục hồi được". Chạm nhầm trên nút 23×23px lúc gấp có thể xoá vĩnh viễn sơ đồ vẽ tay cả buổi trực.
Fix: Toast "Đã xoá · Hoàn tác" ngay sau `remove()` (dùng lại `.toast-in-full`), giữ dữ liệu trong khoảng ân hạn trước khi xoá thật.
Suggested command: `/impeccable harden`

**[P2] Token `--c-surface-soft` không tồn tại — placeholder chạy màu be cũ giữa nền indigo tối**
Why: Đo live xác nhận fallback `#f4f1ea` kích hoạt thật. Tái hiện đúng lúc phiên trước KHÔNG kết thúc bằng nút "←" — đúng kịch bản "bị gọi đi đột xuất giữa ca trực".
Fix: Đổi thành `--c-surface-alt` (token thật đang tồn tại), quét lại fallback hex khác trong file.
Suggested command: `/impeccable audit`

**[P2] Lưới `1fr 1fr` lệch cột khi số bảng lẻ**
Why: Đo live 100% tái hiện — đúng 1 bảng (trạng thái mọi người dùng mới gặp đầu tiên) cho cột lệch hẳn. Xảy ra ở mọi số lẻ.
Fix: `'1fr 1fr'` → `'minmax(0, 1fr) minmax(0, 1fr)'`.
Suggested command: `/impeccable layout`

**[P2] Vùng chạm dưới chuẩn + không có focus-visible riêng cho cả màn gallery**
Why: Nút "⋯" 23×23px, "←" 35×35px — dưới 44×44. Tab thật chỉ cho focus ring mặc định trình duyệt (màu gần họ `--c-warn*`) — màn này không nằm trong 3 nơi DESIGN.md liệt kê có focus ring riêng.
Fix: Nới vùng chạm ≥44×44, thêm `:focus-visible` theo mẫu `.scr-dose`.
Suggested command: `/impeccable audit`

# Persona Red Flags

**Casey (một tay, tại giường bệnh):** nút "⋯" nhỏ nhất màn hình nằm sát nút "Xoá"; rời app giữa chừng làm mất ảnh xem trước → mất "bản đồ trực quan" nhận diện bảng.

**Sam (phụ thuộc bàn phím/hỗ trợ tiếp cận):** chỉ nhận focus ring mặc định trình duyệt; nút "⋯" chạm sát đáy WCAG AA; nội dung trong board sau shadow DOM đóng, chưa test được với NVDA/VoiceOver.

**Alex (power user):** không phím tắt, không chọn-nhiều, không ghim, không tìm kiếm xuyên bảng dù PRODUCT.md khẳng định có.

# Minor Observations

- PRODUCT.md mô tả kiến trúc cũ (MindmapScreen/MindmapGallery/`src/components/MindmapBoard.tsx`) không khớp `src/board/` hiện tại — khớp với surface brief cũ cũng trỏ tới file đã xoá, cùng di sản migrate BlockSuite.
- Menu "⋯" không đóng bằng chạm-ra-ngoài hay Escape.
- `repeating-stripes-gradient` có chủ đích (comment tại chỗ) nhưng chưa vào whitelist config — dọn cấu hình, không phải lỗi thiết kế.
- Tên bảng dài không bị cắt/giới hạn, phá nhịp lưới.
- Tạo bảng mới nhảy thẳng vào sửa tên mặc định thay vì hỏi trước.

# Questions to Consider

- Nếu một bác sĩ nhỡ tay xoá mất sơ đồ xử trí, app có cách nào lấy lại — hay 5 giây xác nhận trên nút 23px là toàn bộ lưới an toàn?
- Màu magenta DESIGN.md dành riêng cho màn này đang ở đâu trong chính lưới danh sách?
- PRODUCT.md hứa xoá mềm/tìm kiếm/tag chuyên khoa — roadmap thật hay tài liệu cần viết lại?
