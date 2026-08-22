# Kế hoạch — Dịch bề mặt hiển thị, đợt 2

Spec: `docs/superpowers/specs/2026-08-22-dich-be-mat-hien-thi-dot-2-design.md`. Đọc spec TRƯỚC khi
làm bất cứ gì — mọi số liệu, danh sách chuỗi, quy tắc loại trừ đều ở đó.

## Việc làm ngay

```bash
git log --oneline -1                    # kỳ vọng ef85857 hoặc mới hơn
git status --short                      # kỳ vọng sạch trừ antibiotics.ts + 3 file browser-use
npm ci && npm run dung:vendor
```

## Task 1 — Xử 4 mục nghi nhiễu, quyết định dịch/bỏ qua

Đọc đúng dòng nguồn (không đoán) cho 4 chuỗi: `"1"`, `"2"`, `"3"`, `"aaa"` (gói `affine/all`).
Dùng `codegraph_explore` hoặc `Grep` trên `src/vendor/blocksuite/affine/all/` để tìm literal đúng
ngữ cảnh (`viTri` ghi trong bảng §4 của spec là `thuộc-tính:...` — tìm property có tên đó chứa các
giá trị này). Với mỗi mục, ghi 1 dòng quyết định + lý do vào báo cáo task (ví dụ: "1/2/3 là số thứ
tự bước trong wizard X, dịch = giữ nguyên số, KHÔNG thêm khoá" hoặc "là chữ hiển thị thật, thêm khoá
dịch: ..."). KHÔNG bỏ qua mà không ghi lý do — đúng tinh thần "không danh sách miễn ngầm" của spec.

**Bằng chứng cần có:** trích đúng dòng nguồn (file:line) cho cả 4 mục trong báo cáo task.

## Task 2 — Soạn bản dịch cho 34 chuỗi còn lại (38 trừ 4 mục Task 1)

Với từng chuỗi trong danh sách 38 ở spec §4 (trừ 4 mục Task 1 nếu quyết định không dịch), viết bản
dịch tiếng Việt theo quy tắc thuật ngữ ở spec §6:
- Brand/định dạng file (Figma, loom, YouTube Video, OneNote, Docx, Html, Markdown, Zip, PlainText,
  HTML) — GIỮ NGUYÊN, không dịch nghĩa.
- Còn lại — dịch theo văn phong đã ship (đối chiếu `src/board/vi.json` hiện có 150 khoá để khớp
  giọng văn, ví dụ cách dịch "Zoom in"/"Zoom out" đã có).

Thêm khoá vào `src/board/vi.json` (giữ nguyên cấu trúc phẳng `{ "English": "Tiếng Việt" }`, không
gom nhóm, không mảng — đúng cảnh báo lỗi #6 mục 10 HANDOFF.md).

**Trước khi ghi:** chạy `timTrungBanDich` (import từ `scripts/so-khop-ban-dich.mjs`) trên `vi.json`
mới để tự kiểm không có hai khoá dịch trùng giá trị — nếu trùng, đổi cách dịch một trong hai (không
sửa cơ chế cấm trùng, đó là cổng đã có từ P1-D).

## Task 3 — Chạy pipeline, xác nhận bảy cổng

```bash
npm run dung:vendor    # Cổng 3: mọi khoá mới phải dịch được ở đâu đó, khoá chết thì DỪNG
npx tsc --noEmit
npm test
npm run kiem:vendor
npm run kiem:vendor-paths
npm run build
npm run kiem:dist       # luật C: N/N có mặt, N = 150 + số khoá mới
```

Nếu `kiem:dist` đỏ, đọc đúng chẩn đoán mà `tim-ban-dich-vendor.mjs` in ra (nêu tên gói/lý do) —
KHÔNG đoán nguyên nhân, KHÔNG gỡ khoá mà chưa đọc chẩn đoán. Nếu chẩn đoán nói "gói chưa bật" cho
một chuỗi tưởng đã thuộc phạm vi — quay lại spec §3, tái kiểm chuỗi đó thật sự không thuộc 12 gói
loại trừ (khả năng: gói con mới, spec đo sót một biến thể tên gói).

**Bằng chứng đỏ→xanh cần có:** log đầy đủ của `kiem:dist` TRƯỚC (nếu có khoá thiếu) và SAU khi sửa.

## Task 4 — Kiểm tay tối thiểu trên trình duyệt thật

```bash
PORT=8446 npm run dev
```
Mở tab Mindmap, tạo/chọn ảnh (kiểm toolbar Align/Download), chèn attachment (kiểm tooltip
Attachment/Docx/Zip...), chèn embed (Figma/YouTube/loom nếu dễ tái hiện — nếu không, đọc code xác
nhận đường hiển thị đúng property đã dịch). Xác nhận không còn tiếng Anh ở các vị trí vừa dịch.
Ảnh chụp màn hình hoặc mô tả cụ thể những gì thấy trong báo cáo task — không chỉ nói "đã kiểm".

## Sau khi cả 4 task xong

Không cần review toàn nhánh kiểu opus bắt buộc cho chặng nhỏ này (~34 khoá, không đổi cơ chế) —
nhưng NÊN chạy nếu muốn mức tin cậy như P1-B/C/D. Cập nhật `docs/superpowers/HANDOFF.md`: thêm mục
mới ghi lại số liệu đã dịch, danh sách 64 chuỗi còn hoãn (để phiên sau không đo lại từ đầu), và kết
quả 4 mục nghi nhiễu của Task 1. Commit theo từng task, không gộp thành một commit khổng lồ — đúng
thói quen dự án (xem lịch sử P1-E: mỗi task một commit).
