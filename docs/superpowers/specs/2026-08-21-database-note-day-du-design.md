# Thiết kế: Bật Database + Note đầy đủ như AFFiNE thật

Ngày: **2026-08-21**. Trạng thái: đã chốt hướng qua hỏi-đáp trong chat, chưa lập kế hoạch. Track:
**P1 vendor** (khác track MindmapScreen — track này KHÔNG đụng `DanhSachBang.tsx`/`BoardGallery.tsx`).

Chủ dự án đã xác nhận rõ: muốn Database (bảng dữ liệu kiểu Table/Kanban, lọc, sắp xếp) **giống
AFFiNE thật 100%**, không phải bản rút gọn tự chế. Quyết định này kéo theo hệ quả kiến trúc lớn
hơn một dòng import — xem §1.

## 1. Vấn đề

`src/board/extensions.ts` hiện giữ 23/58 view extension thượng nguồn (D13, xem comment đầu file
đó) — một quyết định đã chốt: bảng vẽ này là canvas vẽ, không phải trình soạn tài liệu đầy đủ. Note
hiện chỉ có đoạn văn + danh sách, không định dạng inline, không cách nào chèn khối mới vào một Note
đã tạo (không SlashMenu, không DragHandle).

HANDOFF.md liệt ~162 chuỗi thuộc `affine/blocks/table`/`affine/data-view` là "chưa dịch vì gói chưa
bật" — cụm từ đó đọc như thể chỉ còn thiếu bản dịch. Khảo sát (2026-08-21) cho thấy KHÔNG đúng:
`TableViewExtension`/`DatabaseViewExtension` chỉ đăng ký đúng MỘT đường chèn khối —
`SlashMenuConfigExtension` — mà widget SlashMenu bị loại ở D13. Không có SlashMenu thì không có
cách nào tạo ra một khối Database/Table trên UI hiện tại, bất kể có dịch hay không.

## 2. Khảo sát phụ thuộc (2026-08-21) — đo được, không đoán

Đối chiếu `package.json` từng gói với cây `viewExtensions` hiện tại + xác minh TỪNG import thật
bằng cách đọc mã (không tin danh sách `dependencies` trần — nó lẫn cả type-only import không tốn gì
lúc chạy):

| Gói cần bật thêm | Vì sao cần | Đã kiểm an toàn? |
|---|---|---|
| `affine-block-database` (dùng `@blocksuite/data-view` core làm thư viện, KHÔNG tự đăng ký view extension riêng) | Bản thân Database + hạ tầng view/kanban/filter | Có, với một điểm CẦN XÁC NHẬN LẠI lúc lập kế hoạch: `DatabaseViewExtension` (view.ts đã đọc) chỉ đăng ký `FlavourExtension`/`BlockViewExtension`/`SlashMenuConfigExtension`, không thấy đăng ký gì thêm cho core data-view — tức `@blocksuite/data-view` có vẻ chỉ là thư viện import thường, không phải một "gói phải bật" riêng. Thượng nguồn CÒN CÓ một khối khác tên gần giống — `@blocksuite/affine-block-data-view` với `DataViewViewExtension` riêng — đây là khối KHÁC (data-view độc lập không bọc trong Database), KHÔNG thuộc yêu cầu "Database" của chủ dự án, cố tình loại khỏi phạm vi chặng này |
| `affine-widget-slash-menu` | Đường chèn khối DUY NHẤT của Table/Database (gõ "/") | Có — menu build ĐỘNG từ đúng các `SlashMenuConfigExtension` đã đăng ký (mỗi `ViewExtension` tự đăng ký config của mình), không phải danh sách cứng. Bật gói nào thì chỉ hiện đúng gói đó trong menu — không sợ hiện mục vỡ cho khối chưa bật. `defaultSlashMenuConfig` (luôn có, không phụ thuộc gói nào) chỉ gồm hành động chung (chèn ngày, di chuyển, sao chép, xoá), không có mục chèn-khối nào |
| `affine-inline-preset` | Database cần rich-text cho ô/tiêu đề cột | **Không phải chỉ bold/italic** — đây là một GÓI 6 phần, tự kéo theo `affine-inline-comment`, `affine-inline-footnote`, `affine-inline-latex`, `affine-inline-link`, `affine-inline-mention`, `affine-inline-reference`. Chủ dự án đã chốt lấy trọn bộ (không tự viết inline manager tối giản) |
| `affine-widget-drag-handle` | Kéo-thả sắp xếp lại khối trong Note, đúng trải nghiệm AFFiNE thật | Có — `package.json` liệt `affine-block-callout`/`affine-block-embed` nhưng đọc mã xác nhận CẢ HAI chỉ là type-only import (`import { type CalloutBlockComponent }`) hoặc hằng số kích thước dùng làm fallback khi tính preview kéo-thả (`EMBED_IFRAME_DEFAULT_HEIGHT_IN_SURFACE`) — không đòi hai gói đó phải là view extension đang hoạt động |

**Hệ quả kiến trúc quan trọng nhất, không phải tác dụng phụ mà là MỤC TIÊU:** vì `InlineSpecExtension`
đăng ký ở cấp `InlineManager` của toàn editor (không phải riêng cho Database), bật gói này làm
**Note trên canvas cũng có đầy đủ định dạng inline** (đậm/nghiêng/gạch chân/mã/màu chữ/màu nền,
@nhắc, liên kết, chú thích cuối trang, công thức LaTeX inline, bình luận) — không chỉ ô Database mới
có. Đúng tinh thần "giống AFFiNE 100%" chủ dự án muốn, không phải rủi ro cần giảm nhẹ.

## 3. Các extension phải bật thêm

Đếm lại TỪ `getInternalViewExtensions()` thượng nguồn (đọc trực tiếp mảng, không suy luận từ
`package.json`): nhóm Inline của thượng nguồn liệt **bảy** entry riêng biệt, không phải một —
`InlinePresetViewExtension` đứng CẠNH sáu cái kia, không thay thế chúng:

```
InlineCommentViewExtension     (affine-inline-comment)
FootnoteViewExtension          (affine-inline-footnote)
LinkViewExtension (inline)     (affine-inline-link)
ReferenceViewExtension         (affine-inline-reference)
InlineLatexViewExtension       (affine-inline-latex)
MentionViewExtension           (affine-inline-mention)
InlinePresetViewExtension      (affine-inline-preset — gộp 6 cái trên qua default-inline-manager.ts)
```

Cộng `DatabaseViewExtension` (Block) + `SlashMenuViewExtension` (Widget) + `DragHandleViewExtension`
(Widget) = **10 extension** cần thêm vào `viewExtensions`, không phải 7 như bản nháp đầu của mục
này ước lượng — con số "7" chỉ đếm TÊN GÓI npm, không đếm ĐÚNG số extension cần đăng ký (một gói có
thể export nhiều `XxxViewExtension`, và `InlinePresetViewExtension` không tự động kéo 6 extension
kia vào mảng — nó chỉ gộp NỘI DUNG của chúng nếu cả 7 cùng có mặt). D13: 23 → 33 / 58.

**Con số 10 này CŨNG cần đo lại lúc lập kế hoạch** bằng cách đọc trực tiếp
`affine/all/src/extensions/view.ts` tại thời điểm thi hành — đây là bản đếm thủ công lúc viết spec,
không phải phép đo tự động, đúng loại chỗ dễ sai một con số mà HANDOFF.md đã cảnh báo nhiều lần.

Thứ tự chèn vào `viewExtensions` PHẢI khớp đúng thứ tự thượng nguồn (`getInternalViewExtensions()`)
— widget ảnh hưởng z-index, đã trả giá bài học này ở D13 gốc. Đo chính xác thứ tự khi viết kế hoạch,
không chép từ trí nhớ.

## 4. Đường chèn khối — không cần xây UI riêng

Vì SlashMenu build động theo view extension đã bật, sau chặng này: đặt con trỏ vào một đoạn văn
trong Note, gõ `/`, menu hiện đúng các lựa chọn của những khối ĐANG bật — kể cả các biến thể
Paragraph/List có sẵn nhưng trước giờ không cách nào tạo (Heading 1-3, Quote, Divider — NẾU
`ParagraphViewExtension`/tương ứng có tự đăng ký các slash-config đó, cần đo lại lúc lập kế hoạch,
không giả định). Không cần thêm nút riêng cho Database — đúng cách AFFiNE thật làm.

## 5. Đo dung lượng — BẮT BUỘC đo thật lúc thi hành, không đoán trước ở spec này

Chặng Template (2026-08-21, xem `extensions.ts`) đo được +13,28 kB gzip cho một gói đơn giản. Mười
extension ở đây rộng hơn nhiều — không ước lượng con số ở đây để tránh spec mang một số liệu sẽ bị
bác bỏ (đúng bài học lặp lại nhiều lần của HANDOFF.md: "mã/số liệu trong kế hoạch là bản nháp"). Kế
hoạch thi hành phải đo bằng `npm run build` thật SAU khi bật đủ mười extension, ghi số liệu thật vào
báo cáo task.

Ngưỡng tham chiếu duy nhất đã có tiền lệ trong dự án: D11 ghi "+150 kB gzip" là mức đáng dừng lại
xem xét (progress.md, chặng P0-C cũ). Nếu đo được vượt xa mức đó, dừng và hỏi lại chủ dự án trước
khi tiếp tục, không tự quyết định gạt đi.

## 6. Ràng buộc từ hệ thống hiện có

- **D11** — `src/vendor/blocksuite/` cấm sửa. Toàn bộ chặng này chỉ đụng `src/board/extensions.ts`
  (đăng ký extension) + `src/board/vi.json`/`src/index.css` nếu cần vá lỗ hổng vendor kiểu đã làm ở
  Template (biến CSS thiếu định nghĩa) — đúng khuôn đã có tiền lệ, không phải ngoại lệ mới.
- **D12** — nội dung dịch cho ~162 chuỗi `affine/blocks/table`/`affine/data-view` giờ mới THẬT SỰ
  đo lại được (trước đây các chuỗi này không tới `dist/` nên `kiem:dist` không thấy). Đây là VIỆC
  RIÊNG sau khi bật xong extension — đo số chuỗi thật bằng `kiem:dist`, đừng tin con số "162" của
  HANDOFF cũ (đo trước khi chặng "chữ trần trong tag"/".tooltip=" tồn tại, có thể lệch).
- **Bảy cổng hiện có** vẫn phải xanh sau chặng này — không cổng mới, không cổng bị nới lỏng.

## 7. Kiểm — chiến lược

Theo đúng mức độ rủi ro của track P1 (lịch sử: P1-B có 11 lỗi review bắt được, toàn bộ nằm trong mã
kế hoạch cho sẵn — xem HANDOFF mục 10): chặng này cần **review toàn nhánh** trước khi gộp, không tự
soát một mình như "đẩy hiệu ứng"/nội dung dịch thuần. Lý do khác biệt: đây là thay đổi CẤU TRÚC
(bật 10 extension mới, một trong số đó — SlashMenu — có bề mặt tương tác rộng chưa từng kiểm ở app này),
không phải nội dung/hiệu ứng.

Kiểm tay bắt buộc trên trình duyệt thật trước khi coi là xong:
1. Tạo Note trên canvas, gõ đoạn văn, gõ `/` — menu hiện đúng, không mục nào vỡ khi chọn.
2. Chèn một khối Database qua slash menu, thêm cột/hàng, đổi kiểu view (nếu Table/Kanban khả dụng).
3. Bôi đen chữ trong Note — thanh định dạng inline hiện, đậm/nghiêng/@nhắc hoạt động.
4. Kéo-thả sắp xếp lại khối bằng drag-handle.
5. `prefers-reduced-motion`, chế độ tối — không hồi quy so với trước chặng.

## 8. Ngoài phạm vi

- Nội dung dịch cho các chuỗi mới tới `dist/` — chặng dịch riêng, sau khi extension đã bật và đo
  lại số chuỗi thật.
- Bất kỳ điều chỉnh nào cho `DanhSachBang.tsx`/`BoardGallery.tsx` — track khác.
- Tối ưu code-splitting cho chunk bảng vẽ dù cảnh báo "> 500 kB" của Vite đã xuất hiện từ trước
  chặng này — nợ kỹ thuật có sẵn, không phải phạm vi chặng.

## 9. Tiêu chí xong

1. Mười extension đã bật, đúng thứ tự thượng nguồn, `viewExtensions` còn 33/58 (đo lại chính xác
   lúc thi hành — xem cảnh báo ở §3).
2. Bảy cổng xanh, số liệu đo thật (không chép từ chặng khác).
3. Dung lượng bundle đo thật, so với ngưỡng +150 kB gzip của D11 — nếu vượt, đã hỏi lại chủ dự án
   trước khi gộp.
4. Năm mục kiểm tay ở §7 đều qua, có bằng chứng (ảnh chụp DOM/console, không chỉ lời khai).
5. Review toàn nhánh đã chạy, không còn Critical, Important đã đóng hoặc có lý do hoãn ghi rõ.
6. `src/board/extensions.ts` cập nhật đúng comment đầu file (số đếm 23→30, danh sách gói loại trừ)
   — đúng kỷ luật đã giữ xuyên suốt D13 từ đầu dự án.
