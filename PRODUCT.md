# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Bác sĩ nội khoa tổng quát và sinh viên y khoa nói chung — không chỉ tác giả. Tình huống dùng chính: trực cấp cứu / nội khoa tổng quát, cần tra cứu nhanh, nhiều khi một tay trên điện thoại tại giường bệnh hoặc lúc ra quyết định liều thuốc.

## Product Purpose

"Bs Trọng" là thư viện kiến thức lâm sàng cá nhân: tra cứu bệnh học, kháng sinh theo CrCl, thuốc truyền tĩnh mạch (co bóp cơ tim, vận mạch, giãn mạch, chống loạn nhịp, điện giải, an thần, thần kinh cấp cứu, giải độc, khác), sơ đồ tư duy, thẻ ghi nhớ, và bài học ECG — phục vụ tra cứu nhanh và hỗ trợ ra quyết định lâm sàng lúc trực.

## Positioning

Khác với UpToDate, phác đồ giấy, hay các app tra cứu y khoa khác ở ba điểm cùng lúc: (1) nội dung tự biên soạn và tự kiểm chứng bởi tác giả, không phải tổng hợp y văn chung chung; (2) chạy offline hoàn toàn, dữ liệu lưu ngay trên máy, không qua máy chủ nào; (3) nhiều tính năng liên kết với nhau trong một công cụ duy nhất (thư viện kiến thức, máy tính liều theo cân nặng/CrCl, sơ đồ tư duy, thẻ ghi nhớ, ECG) để áp dụng trực tiếp từ lý thuyết đến giường bệnh, thay vì phải nhảy qua nhiều nguồn/app rời rạc.

## Operating Context

- Dùng khi trực nội khoa tổng quát và cấp cứu — ưu tiên tốc độ tra cứu và độ chính xác khi tính liều, không phải lúc rảnh rỗi đọc kỹ.
- Cài như PWA (standalone) trên điện thoại; có shortcut cài sẵn vào thẳng "Dùng thuốc" (`/?screen=mixing`) và "Mindmap" (`/?screen=mindmap`), bỏ qua Trang chủ, cho lúc cần tra cứu gấp.
- Toàn bộ dữ liệu tự nhập (bài viết, thuốc tự thêm, công thức pha riêng cho từng thuốc, thẻ ghi nhớ, nét vẽ mindmap) lưu cục bộ trên máy (localStorage), không qua máy chủ nào; có xuất/nhập file JSON để sao lưu hoặc chuyển sang thiết bị khác.
- Hoạt động offline vì mọi dữ liệu và phép tính đều chạy phía client, không gọi API bên ngoài.

## Capabilities and Constraints

- Màn "Dùng thuốc" (`DungThuocScreen` trong `src/App.tsx`): kháng sinh theo CrCl + 9 nhóm thuốc truyền (định nghĩa tại `src/data/categories.ts`: co bóp, vận mạch, giãn mạch, chống loạn nhịp, điện giải, an thần, thần kinh cấp cứu, khác, giải độc), dùng chung một bối cảnh "bệnh nhân hiện tại" (cân nặng, creatinine) để tính liều/tốc độ truyền.
- Các màn khác trong bottom nav: Trang chủ, Thư viện (bài viết y khoa tự biên soạn), Hướng dẫn, Mindmap (sơ đồ tư duy + vẽ tay), Thẻ ghi nhớ; và ECG truy cập từ Trang chủ.
- Người dùng tự thêm/sửa/xoá: kháng sinh, thuốc truyền từng nhóm, công thức pha riêng, bài viết, thẻ ghi nhớ — song song với dữ liệu tĩnh có sẵn (không ghi đè).
- Không có backend, không có tài khoản người dùng — mọi trạng thái nằm trên thiết bị.
- Ràng buộc kỹ thuật: React 19 + Vite + Tailwind v4; phần lớn UI/logic nằm trong một file `src/App.tsx` rất lớn (~11.400 dòng) thay vì tách nhiều component nhỏ.
- Ngôn ngữ giao diện: tiếng Việt xuyên suốt, kể cả thuật ngữ y khoa.

## Brand Commitments

- Tên sản phẩm: "Bác sĩ Trọng" / "Bs Trọng" (tên ngắn PWA: "BS Trọng").
- Màu chủ đạo: xanh azure đậm `#003152` (bản sáng) / xanh trời nhạt `#addff1` (bản tối) (theme_color trong `public/manifest.json`); nền trắng. Đổi từ teal sang azure/xanh trời để tạo cảm giác điềm tĩnh, hiện đại hơn; màu đỏ (nguy hiểm), hổ phách (cảnh báo), xanh lá (thành công) không đổi.
- Logo vẽ bằng SVG theo `currentColor` (không phải ảnh PNG nền trắng) để hoà được vào cả giao diện sáng lẫn tối.

## Evidence on Hand

- Toàn bộ nội dung y khoa (bệnh học, thuốc, liều, công thức pha) do tác giả tự biên soạn và tự kiểm chứng lâm sàng; không có nguồn/tài liệu bên ngoài nào khác cần dẫn ở đây.
- Không có testimonial, số liệu người dùng, hay tài liệu marketing để bảo toàn — các công việc sau không được bịa ra loại bằng chứng này.

## Product Principles

- Tốc độ và độ chính xác khi ra quyết định liều thuốc quan trọng hơn hình thức trang trí — đây là công cụ dùng lúc trực, không phải nơi trưng bày.
- Tự chủ dữ liệu: mọi thứ chạy và lưu ngay trên máy người dùng, không phụ thuộc máy chủ nào.
- Một công cụ duy nhất nối liền lý thuyết (Thư viện, Mindmap, Thẻ ghi nhớ) với thực hành tại giường bệnh (Dùng thuốc, ECG), thay vì tách rời từng phần ở nhiều nguồn khác nhau.
- Nội dung tự biên soạn là tài sản cốt lõi cần được bảo toàn và làm nổi bật, không pha loãng bằng nội dung tổng hợp chung chung kiểu UpToDate.
