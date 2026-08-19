---
target: "DungThuocScreen (src/App.tsx:10778-11298)"
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-19T10-03-56Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: general-purpose/sonnet · B: general-purpose/sonnet)

## Điểm sức khoẻ thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 3 | CrCl bất thường giờ hiện `—` + banner cảnh báo hổ phách rõ ràng (P0 đã vá thật) — nhưng người dùng bàn phím/đọc màn hình có thể lọt focus vào một khối "đã thu gọn" mà không có tín hiệu nào cho biết |
| 2 | Match System / Real World | 4 | "BTĐ", "Rút lẻ ống", ngôn ngữ bậc CrCl — không đổi, vẫn đúng chất lâm sàng |
| 3 | User Control and Freedom | 3 | Hoàn tác 20s/5s không đổi so với lần trước |
| 4 | Consistency and Standards | 3 | CrCl nay dùng đúng ngôn ngữ cảnh báo `SEVERITY_STYLE` (đã vá) — nhưng Disclosure lồng nhau phá chính quy tắc trợ năng mà DESIGN.md đặt ra cho chính nó |
| 5 | Error Prevention | 3 | `estimateCrCl` chặn tại gốc (trả `null`, không chỉ tô màu) — hạ từ 4 vì bằng chứng mới: nhiều nút chạm thường xuyên (tab nhóm, toggle đơn vị, toggle chế độ) dưới 44px trên một app tự nhận "chủ yếu một tay" |
| 6 | Recognition Rather Than Recall | 3 | Không đổi |
| 7 | Flexibility and Efficiency | 3 | Không đổi |
| 8 | Aesthetic and Minimalist Design | 3 | Hàng chip 8 xác nhận có chủ đích, đối xứng giữa kháng sinh/truyền |
| 9 | Error Recovery | 4 | Banner CrCl bất thường chạm-để-sửa (`openPatientPanel`), cùng mẫu hình `missingReason` |
| 10 | Help and Documentation | 2 | Noradrenaline — thuốc truyền ĐẦU TIÊN mở ra — vẫn "chưa ghi nguồn" |
| **Tổng** | | **31/40** | **Tốt (Good)** |

(So với lần trước 29/40 → 31/40: điểm lên nhờ P0 được vá thật tại gốc, nhưng bị kéo lại một phần bởi phát hiện mới về Disclosure lồng nhau và touch-target.)

## Nhận định về tính đặc thù thiết kế

**Đánh giá LLM (A)**: Bằng chứng vá P0 tự nó là minh chứng cho tính đặc thù sản phẩm — thay vì kẹp `Math.max(0, crcl)` cho qua chuyện, `estimateCrCl` trả `null` tại đúng chỗ toán học sai (`src/lib/patient.ts:179`), rồi tái dùng CHÍNH các hàm `checkWeight/checkHeight/checkAge/checkScr` vốn phục vụ an toàn liều truyền để gắn cờ "bất thường" cho CẢ số CrCl lẫn bậc liều kháng sinh chọn ra từ nó — một quyết định đòi hỏi hiểu rằng chọn bậc CrCl và định liều truyền là CÙNG một hạng rủi ro lâm sàng, không phải khử trùng lặp code đơn thuần. Bình luận tại `patient.ts:172-177` kể lại đúng kịch bản lỗi thật (gõ "200" thay vì "20") bằng văn xuôi chẩn đoán, không phải changelog chung chung.

**Quét tự động (B)**: `detect.mjs --json src/App.tsx` → thoát mã 2, 1 phát hiện duy nhất, nằm ngoài phạm vi (màu `#000` tại dòng 936, thuộc `SpecialtyPicker`, màn khác). Trong phạm vi DungThuocScreen: 0 phát hiện CLI tĩnh — giữ nguyên kỷ lục sạch nhiều lần chấm liên tiếp.

Vòng tiêm script trình duyệt (3 trạng thái) bắt nhiều advisory hơn, nhưng đối chiếu với lịch sử critique + DESIGN.md, phần lớn là false positive đã biết:
- `layout-transition` trên `max-height` của Disclosure — DESIGN.md ghi rõ đây là đánh đổi tương thích có chủ đích, đã xác nhận nhiều lần.
- `cramped-padding` — cùng mẫu hình `h-11`/căn giữa bằng chiều cao cố định đã xác minh false positive ở hai lần chấm trước; biến thể "flush against bg" ở tab Vận mạch chưa tự tay đọc mã, coi là khả năng cao cùng lý do nhưng chưa chắc tuyệt đối.
- `bounce-easing` (`cubic-bezier(0.34,1.45,...)`) — khớp `.pop-value`, lần trước đã lần mã xác nhận đây là nhánh "số vừa tính lại" màu primary, KHÔNG phải nhánh cảnh báo — không vi phạm quy tắc "không nảy trên trạng thái cảnh báo".
- `em-dash-overuse` — bộ dò hiệu chỉnh cho tiếng Anh, dấu gạch ngang tiếng Việt là false positive theo ngôn ngữ, đã ghi nhận nhiều lần.
- `undersized-ui-text` (nhãn nav dưới 10px) — chính DESIGN.md ghi nhận đây là lựa chọn có chủ đích, "đã kiểm và ghi chép độ tương phản AA riêng ở cỡ đó" — không phải lỗi mới, bộ dò không biết ngoại lệ này.
- `line-length` ~200 ký tự/dòng — đo ở khung nhìn không phải viewport; B đã kiểm ở 375px thật và xác nhận không tràn trang ở cấp trang.

Bằng chứng mới, chưa từng bị dò trước đây — không phải false positive:
- **Disclosure lồng nhau phá cơ chế ẩn của chính nó** (A, live-verified): `PatientPanel` mặc định thu gọn khi bệnh nhân đã có dữ liệu (tình huống phổ biến với người dùng quay lại) — nhưng khối Creatinin/CrCl/RRT lồng bên trong mặc định MỞ nếu đã từng nhập creatinine (cũng rất phổ biến, vì đó chính là trường "dính"). CSS `.disc-body[data-open="true"] { visibility: visible }` (`index.css:665`) là selector không neo theo tổ tiên, nên khối con "ghi đè" luôn trạng thái ẩn của khối cha. Kết quả: ô nhập Creatinin, hai nút đơn vị, và các nút chế độ RRT vẫn nhận được Tab và `.focus()` dù không hề được vẽ ra màn hình (`elementFromPoint` trả `null` tại đúng toạ độ đó) — đúng lỗ hổng mà `index.css:656-657` từng viết rõ lý do thêm `visibility:hidden`.
- **Touch target dưới 44px** (B, đo trực tiếp ở 375px): tab nhóm "Vận mạch" (69×35), hai nút đổi đơn vị mg/dL·µmol/L (63×43 / 65×43), hai nút "Liều → Tốc độ"/"Tốc độ → Liều" (149×36), hai icon-button `◉`/`×` (21×24, 20×27) — đều dưới ngưỡng công thái 44×44pt, trên một app tự nhận "chủ yếu một tay, tại giường bệnh".

## Ấn tượng chung

P0 tuần trước được vá đúng cách — tại gốc toán học, không phải kẹp giá trị hiển thị — và cả hai assessment độc lập đều live-verify được điều đó. Nhưng cùng một kiểu điều tra sâu-hơn-một-lớp (persona Riley) lại lộ ra một lỗ hổng khác thuộc đúng cơ chế mà DESIGN.md từng phải vá một lần trước đây (Disclosure ẩn không triệt để) — lần này bị chính kiến trúc Disclosure lồng nhau (state độc lập theo instance, CSS không neo tổ tiên) tái mở lại cho đúng một trạng thái rất phổ biến: bệnh nhân quay lại có creatinine đã lưu. Mẫu hình lặp lại qua các lần chấm: lưới an toàn của app rất chắc ở nơi đã có người kiểm, và mỏng đi đúng một lớp ngay sau ranh giới đã kiểm gần nhất.

## Điểm mạnh

1. **P0 vá đúng kiến trúc, không phải patch che triệu chứng.** `estimateCrCl` fail tại phép toán (`patient.ts:179`), và cờ "bất thường nhưng không chặn" áp dụng nhất quán cho cả số CrCl lẫn bậc liều kháng sinh — live-verified cả hai mặt cùng cập nhật từ một input tuổi=200.
2. **Sàn 16px cho input vẫn giữ dưới đo lường thật.** `getComputedStyle` trên cả 6 input/select đo được tối thiểu đúng 16px.
3. **Kỷ luật cổng kép sống sót qua lần sửa này.** `confirmGate.ts` không bị đụng tới bởi commit P0; một liều Noradrenaline 30 mcg/kg/phút vẫn ghim được qua đúng quy trình hai chạm.

## Vấn đề ưu tiên

**[P1] Disclosure lồng nhau phá `visibility:hidden` của khối cha — ô nhập vô hình vẫn nhận Tab/focus**
- **Vì sao quan trọng**: Vi phạm trực tiếp quy tắc trợ năng chính DESIGN.md đặt ra cho Disclosure ("closed sections use visibility: hidden... so keyboard/screen-reader focus can't land on hidden content"). Ảnh hưởng đúng persona Sam (phụ thuộc trợ năng), trong đúng trạng thái phổ biến nhất (người dùng quay lại, đã có creatinine).
- **Sửa**: neo CSS theo tổ tiên (`:where(.disc-body[data-open="false"]) .disc-body { visibility: hidden !important; }`) hoặc cho `Disclosure` nhận prop `forceClosed` buộc tự đóng khi cha đang đóng.
- **Lệnh đề xuất**: `/impeccable harden`

**[P2] Nhiều nút chạm thường dùng dưới 44×44pt trên app "chủ yếu một tay"**
- **Vì sao quan trọng**: tab nhóm thuốc, toggle đơn vị, toggle chế độ liều↔tốc độ đều là control chạm nhiều lần mỗi phiên; PRODUCT.md tự khai "một tay trên điện thoại tại giường bệnh" làm mục tiêu chính — kích thước hiện tại tăng rủi ro chạm nhầm đúng ở các control quyết định luồng tính liều.
- **Sửa**: tăng vùng chạm (padding, không nhất thiết đổi kích thước hiển thị) lên tối thiểu 44×44pt cho các nhóm nút này.
- **Lệnh đề xuất**: `/impeccable audit` rồi `/impeccable adapt`

**[P2] Noradrenaline — thuốc truyền đầu tiên mở ra — vẫn "chưa ghi nguồn"**
- **Vì sao quan trọng**: trung thực nhưng là ấn tượng đầu tiên về độ tin cậy nội dung cho một phiên mới.
- **Sửa**: không phải lỗi UI — cần chủ dự án bổ sung nguồn, hoặc đổi thứ tự để một thuốc đã có nguồn mở ra trước.
- **Lệnh đề xuất**: `/impeccable clarify`

**[P3] `crclInputImplausible` tính lại 4 hàm check trùng lặp trong `AntibioticDoseCard` thay vì tái dùng giá trị đã memo ở `PatientPanel`**
- **Vì sao quan trọng**: không sai, chỉ là rủi ro bảo trì nhỏ nếu hai nơi lệch nhau sau này.
- **Sửa**: nâng `crclInputImplausible` lên `DosingContextValue`, tính một lần dùng chung.
- **Lệnh đề xuất**: `/impeccable distill`

## Cờ đỏ theo persona

**Riley (kiểm thử ép biên)**: Tuổi 200 không còn ra kết quả sai âm thầm — xác nhận trực tiếp, đây là sửa chữa đầu bảng. Nhưng dò sâu thêm một lớp (bảng đã thu gọn + creatinine đã lưu sẵn) lộ lỗ hổng khác: control vô hình vẫn tương tác được.

**Sam (phụ thuộc trợ năng)**: Bị ảnh hưởng trực tiếp bởi P1 — một khối "đã đóng" không thực sự đóng với điều hướng bàn phím/đọc màn hình phá đúng tính dự đoán được mà DESIGN.md thiết kế riêng cho việc này.

**Casey (một tay, di động, dễ gián đoạn)**: Nhãn "Trong nhóm này, đang dùng" đã hết trùng lặp (P2 kỳ trước, vá thật). Điểm cấn mới: các touch-target dưới 44px ở đúng những control persona này chạm thường xuyên nhất.

## Quan sát nhỏ

- Focus ring KHÔNG được xác minh lại lần này bằng Tab thật (sandbox trình duyệt của B không có OS focus; A chỉ gọi `.focus()` chương trình) — lần chấm 04:43 trước đó đã xác nhận bằng 4 lượt Tab thật, không có lý do nghi ngờ đã hỏng, nhưng nên coi là "chưa re-verify" chứ không phải "đã re-confirm".
- Không có toggle theme trong `DungThuocScreen` — `ThemeToggle` chỉ render ở Trang chủ; đây là thiết kế có chủ đích (đổi theme thủ công tập trung một nơi), không phải thiếu sót của màn này.
- Token dark-mode `--c-danger` đổi từ `#b91c1c` → `#ff8585` giữa hai theme — cùng họ màu, chỉ chỉnh tương phản, đúng "Untouchable Signal Rule".
- Không có lỗi console, network request thất bại (2 `ERR_ABORTED` chỉ là điều hướng bị huỷ lúc dev server đang khởi động, không phải lỗi runtime).

## Câu hỏi gợi mở

1. Lỗ hổng Disclosure lồng nhau có khả năng là mẫu hình chung (bất kỳ Disclosure `defaultOpen` nào lồng trong một container có thể thu gọn khác) chứ không riêng khối Creatinin — có nên rà toàn bộ file tìm các tổ hợp Disclosure-trong-Disclosure khác trước khi coi đây là một lần vá đơn lẻ?
2. P0 giờ khiến CrCl "bất thường" song song hoàn toàn với ngôn ngữ `SEVERITY_STYLE` bên truyền — có nên đi thêm một bước, chặn cứng việc chọn bậc kháng sinh khi tuổi/cân nặng vượt ngưỡng "implausible" (giống `doseAbsMax` chặn cứng liều truyền cực đoan), hay cảnh-báo-không-chặn là lựa chọn đúng vì bác sĩ đọc chữ bậc liều trước khi hành động, khác với việc vặn số bơm tiêm mù?
