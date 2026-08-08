---
target: DungThuocScreen
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 1
timestamp: 2026-08-08T06-11-40Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: Design review agent · B: Detector + browser evidence agent)

## Điểm sức khoẻ thiết kế (Design Health Score)

| # | Tiêu chí | Điểm | Vấn đề chính |
|---|-----------|-------|-------------|
| 1 | Hiển thị trạng thái hệ thống | 4/4 | `aria-live` cho ô CrCl, số nảy khi đổi, cờ "đã cũ" trên bảng thuốc đang dùng — không có gì im lặng. |
| 2 | Khớp với thế giới thực | 4/4 | Thuật ngữ lâm sàng tiếng Việt (BTĐ, TTM, CrCl, chip RRT: AKI/IHD/CRRT/SLED/PD) đúng cách bác sĩ Việt Nam đã nghĩ sẵn. |
| 3 | Quyền kiểm soát & tự do của người dùng | 3/4 | Hai kiểu hoàn tác riêng biệt (5s cho bỏ ghim, 10s cho xoá bệnh nhân) — nhưng hoàn tác 10s cắt cứng, không để lại dấu vết trong Nhật ký sau khi hết hạn. |
| 4 | Nhất quán & chuẩn mực | 4/4 | Hệ token `C/T/R/CHIP/TAP` áp dụng gần như tuyệt đối xuyên suốt; vùng chạm 44px nhất quán dù pill nhìn thấy chỉ cao 36px. |
| 5 | Ngăn ngừa lỗi | 4/4 | Xác nhận hai lần cho mọi hành động phá huỷ; `checkWeight/checkHeight/checkAge` cảnh báo số liệu phi lý; số nhập sai ký tự được gọi tên rõ thay vì âm thầm bỏ qua. |
| 6 | Nhận diện thay vì ghi nhớ | 3/4 | `useStickyState` theo từng tab giảm việc chọn lại; tìm kiếm xuyên tab giảm gánh nặng "thuốc này nằm ở tab nào". Bù lại: 10 nhãn tab viết tắt không có gợi ý mở rộng — ổn với bác sĩ có kinh nghiệm, nhưng là chi phí thật với sinh viên y khoa (đối tượng PRODUCT.md cũng nhắm tới). |
| 7 | Linh hoạt & hiệu quả | 3/4 | Dải "Đang dùng cho bệnh nhân" và kính lúp tìm xuyên tab là lối tắt thật cho người dùng thạo việc (đã kiểm chứng trực tiếp). Chưa có phím tắt, không điều hướng mũi tên trong danh sách kết quả tìm. |
| 8 | Thẩm mỹ & tối giản | 3/4 | Từng token loại/bo góc/màu sạch sẽ ở cấp phần tử; bố cục cấp màn hình dày đặc — tiêu đề + nút tìm + hàng 10 tab + dải miễn trừ + khung bệnh nhân + bảng đang dùng đều đứng trước nội dung mỗi lần mở. |
| 9 | Nhận biết/chẩn đoán/khắc phục lỗi | 4/4 | `InputWarning` nói rõ ràng, hành động được ("không tính CrCl từ đây"); nhánh CrCl "cần nhập X để tính" gọi tên đúng trường còn thiếu thay vì chỉ hiện dấu gạch ngang trơn. |
| 10 | Trợ giúp & tài liệu | 2/4 | `DisclaimerBar`/`DisclaimerGate` và cờ "chưa ghi nguồn"/"CHƯA đối chiếu" trên từng thuốc là một dạng tài liệu nhúng phù hợp — nhưng không có chú giải/tra nhanh cho viết tắt RRT hay phương pháp Cockcroft-Gault/cân nặng hiệu chỉnh ngay trong màn. |
| **Tổng** | | **34/40** | **Tốt** |

## Kết luận về tính đặc thù thiết kế (Design Specificity)

**Đánh giá của LLM (Assessment A)**: Đây không phải một app-form chung chung khoác nhãn y khoa. Ngôn ngữ tương tác bắt nguồn từ ràng buộc bệnh viện thật, thể hiện thành CODE chứ không chỉ chữ: `parseStrictNumber` từ chối âm thầm biến `"70abc"` thành 70 vì cân nặng gõ nhầm nhân thẳng vào mọi liều mcg/kg/phút; ô CrCl thu về "—" thay vì hiện một số tính đúng-về-toán-nhưng-sai-về-lâm-sàng; `isRenalStatusStale` hỏi lại "còn đúng không?" vì chức năng thận có thể đổi giữa ca trực; 9 nhóm thuốc truyền khớp đúng cách bác sĩ đã tự phân loại sẵn trong đầu, không phải một IA do app tự nghĩ ra. Chỗ duy nhất còn "chung chung" là bố cục vĩ mô — khung bệnh nhân + bảng đang dùng + bộ chọn 10 tab xếp chồng trong một vùng cuộn trước khi tới liều — đọc giống một form doanh nghiệp dày đặc hơn là một công cụ bên giường bệnh chuyên biệt, dù từng luồng con bên trong đều được đặc tả kỹ.

**Quét tự động (Assessment B)**: CLI `detect.mjs` trên toàn bộ `src/App.tsx` trả về 5 finding, **0 finding nằm trong phạm vi `DungThuocScreen`** (5 finding còn lại đều ở dòng 963/11137/11840/11874/11899, thuộc các màn khác). Quét trình duyệt trực tiếp (`detect.js` tiêm vào `/?screen=mixing`) phát hiện thêm loạt lỗi đo được: `text-overflow` (h1 tràn 35px/27px), `low-contrast` (4,1:1 trên cặp `--c-muted`/`--c-primary-soft` bản tối), `undersized-ui-text` (nhãn nav dưới 10px), `layout-transition` (x2), `cramped-padding` (x3), `clipped-overflow-container` (x3), `text-occlusion` (nhiều mục).

**Đối chiếu và false positive**: Hai finding nghiêm trọng nhất từ quét trình duyệt (h1 tràn 35px, tương phản 4,1:1) đã được xác minh tận gốc trong mã nguồn và **ĐÃ ĐƯỢC SỬA** trong đợt vá P1–P3 của `/impeccable audit` chạy ngay trước report này (xem "Đã sửa" bên dưới). `undersized-ui-text` trên nhãn nav 10px là **false positive** — DESIGN.md ghi rõ đây là quyết định có chủ đích ("Label 700, 10px... phải độc lập đạt AA 4,5:1 ở cỡ đó, đã kiểm tra và ghi lại như một ràng buộc riêng"), không phải một giá trị bị bỏ sót. `layout-transition` trên `.disc-body` (max-height/margin-top) đã được `.impeccable/config.json` ghi nhận là đánh đổi có chủ ý (grid-template-rows tái hiện lỗi kẹt UI ngay trên Chromium hiện đại). `text-occlusion` được Assessment B tự ghi chú là khả năng do tấm phủ `DisclaimerGate` đang mở lúc quét, không hẳn là lỗi thật của màn hình. `cramped-padding`/`clipped-overflow-container` chưa được hai đánh giá gán vị trí cụ thể — cần một lượt audit riêng nếu muốn truy đến từng phần tử.

## Ấn tượng tổng thể

Đây là một trong những màn hình được nghĩ kỹ nhất về mặt an toàn lâm sàng mà một buổi audit/critique từng gặp — không phải vì trang trí đẹp, mà vì gần như mọi quyết định UI đều truy được về một tình huống bệnh viện thật (nhập nhầm số, đổi ca, quên xác nhận lại chức năng thận...). Vấn đề lớn nhất không nằm ở tầng chi tiết (đã rất kỷ luật) mà ở tầng "độ ồn tương đối": con số liều/CrCl bình thường đang là thứ TO và BÃO HOÀ MÀU THƯƠNG HIỆU nhất màn hình — to hơn cả cảnh báo "KHÔNG tương hợp" — ngược với chính quy tắc mà DESIGN.md đặt ra ("thứ ồn nhất trên màn liều luôn phải là tín hiệu nguy hiểm, không bao giờ là thương hiệu").

## Điểm mạnh

1. **Focus-visible được sửa riêng cho đúng bối cảnh dùng** (`index.css:637–658`) — một fix WCAG 2.4.7 có chủ đích, lý giải từ tình huống triển khai thật ("bàn phím ngoài/máy tính trạm ở buồng bệnh"). Đây là kỹ thuật a11y đặc thù sản phẩm, không phải boilerplate.
2. **Ngoại lệ giảm-chuyển-động cho `dose-press`/`pulse-scale`** (`index.css:594–618, 730–740`) — hai class này bị loại rõ ràng khỏi danh sách tắt của `prefers-reduced-motion`, với comment phân biệt "phản hồi chạm" và "trang trí". Đúng chính xác nguyên tắc Decoration/Diagnosis Split mà DESIGN.md yêu cầu, thực thi đúng ở tầng CSS.
3. **Tìm kiếm xuyên tab** (`App.tsx:9518–9568`) — đã kiểm chứng trực tiếp: gõ "adrenaline" trả về cả hai mục ở Co bóp và Vận mạch kèm chip gắn nhãn tab, và bấm vào một kết quả nạp sẵn trạng thái sticky (`abx.group`/`infusion.sel`) TRƯỚC khi đổi tab, nên màn đích hiện ra đã sẵn kết quả thay vì một bộ chọn rỗng lần hai. Đây là lời giải thật, đang chạy, cho đúng vấn đề tải nhận thức mà hàng 10 tab tạo ra.

## Vấn đề ưu tiên

**[P0] Toast "Hoàn tác" không đọc được ở bản tối — ĐÃ SỬA trong đợt audit vừa xong**
Nền toast viết cứng `rgba(9,32,33,.92)` trong khi chữ dùng `var(--c-on-bright)` — token này là `#ffffff` ở bản sáng nhưng đổi thành `#0c1919` (gần đen) ở bản tối, khiến chữ gần-đen nằm trên nền gần-đen: hiệu lực gần như vô hình đúng lúc báo tin quan trọng nhất màn hình ("Đã xoá bệnh nhân... Hoàn tác"). Đã xác minh qua computed style trực tiếp: sau khi sửa, nền là `var(--c-pill-dark)` (`rgba(9,32,33,.9)`, cố ý tối bất kể theme) + đổ bóng `var(--c-shadow)` (đúng theo theme) + chữ trắng cố định — đo được `rgb(255,255,255)` trên nền tối, tương phản tốt.

**[P1] Con số kết quả (liều/CrCl) đang ồn hơn cảnh báo nguy hiểm — CHƯA SỬA**
`T.metric` (24px đậm, `lib/ui.ts`) là cỡ chữ LỚN NHẤT toàn bộ thang chữ — lớn hơn cả `T.critical` (15px), thứ mà cảnh báo "KHÔNG tương hợp" trong `RunningPanel` đang dùng. Cả kết quả CrCl (`PatientPanel:5201`) lẫn mọi kết quả liều/tốc độ truyền (`InfusionCalculator`) đều vẽ ở `T.metric` với màu `C.primary` (MÀU THƯƠNG HIỆU DUY NHẤT) khi mức độ an toàn là "ok". DESIGN.md nói thẳng: "thứ ồn nhất trên màn liều luôn phải là tín hiệu nguy hiểm, không bao giờ là thương hiệu" — nhưng như đang xây, một con số liều bình thường lại to và bão hoà màu hơn một cảnh báo không tương hợp sống động đứng ngay gần đó trong cùng vùng cuộn.
*Sửa*: dành `T.metric` + màu thương hiệu riêng cho phần điều hướng; cho kết quả liều/CrCl "ok" một màu trung tính hơn (`C.text` hoặc một token `--c-result-neutral` riêng), để kích cỡ — không phải độ bão hoà màu thương hiệu — mang vai trò "đây là con số".
*Lệnh gợi ý*: `/impeccable colorize` hoặc `/impeccable quieter`

**[P2] Tương phản 4,1:1 ở bản tối (cặp `--c-muted`/`--c-primary-soft`) — ĐÃ SỬA trong đợt audit vừa xong**
Quét trình duyệt đo được 4,1:1 (dưới ngưỡng AA 4,5:1). Truy ra tận gốc: dòng "Cần nhập tuổi/cân nặng/creatinin để tính" trong ô kết quả CrCl dùng `color: C.muted` trên nền `--c-primary-soft` — đúng chữ hướng dẫn thật, không phải icon/placeholder (nơi `C.muted` được phép dùng theo quy ước sẵn có của chính file này). Đã đổi sang `C.textSoft`; xác minh trực tiếp trên trình duyệt bản tối: màu render ra đúng `#a9bcbb` (text-soft) thay vì `#728584` (muted).

**[P2] Hàng 10 tab cuộn ngang không có gợi ý nào cho người dùng lần đầu ngoài dải mờ hai mép — CHƯA SỬA**
Các biện pháp giảm nhẹ (sticky state, tìm kiếm, thứ tự đúng theo phân loại lâm sàng) đều là *lối thoát khỏi* vi phạm giới hạn trí nhớ ngắn hạn (10 lựa chọn, vượt xa ngưỡng ≤4-7), không phải *sửa* chính vi phạm đó. Người dùng lần đầu (Jordan) hoặc đang hoảng vẫn phải cuộn ngang và đọc hiểu 10 nhãn viết tắt để tìm, ví dụ, "Giải độc" (vị trí 10/10) bằng một tay. Không có gì trong hàng tab dạy rằng tìm kiếm xuyên tab tồn tại như lối nhanh hơn.
*Sửa*: hoặc làm nổi bật gợi ý tìm kiếm ở lần ghé đầu (coach mark một lần), hoặc thêm một gợi ý mờ thường trực ("Không thấy thuốc? Bấm Tìm") khi người dùng đã cuộn hàng tab mà chưa dừng lại.
*Lệnh gợi ý*: `/impeccable onboard`

**[P2] Không còn dấu vết sau khi cửa sổ hoàn tác 10 giây hết hạn — CHƯA SỬA**
`resetPatient()` xoá thông số và bảng đang dùng chỉ với hoàn tác 10 giây trong bộ nhớ; không có gì được ghi vào `CalcLogEntry` hay bất kỳ bản ghi bền vững nào. Với persona Casey (dùng điện thoại, hay bị gián đoạn), một cuộc gọi/tiếng gọi "bác sĩ ơi" xen ngang hơn 10 giây sau khi lỡ xoá là chuyện rất thường ở ca trực, và khi đó không còn đường quay lại, không có bản ghi là việc đó từng xảy ra.
*Sửa*: ghi sự kiện xoá bệnh nhân vào chính hệ thống Nhật ký (đã có sẵn trường `CalcLogEntry.flag` cho đúng loại "có việc quan trọng vừa xảy ra" này).
*Lệnh gợi ý*: `/impeccable harden`

**[P3] Danh sách kết quả tìm kiếm không có ngữ nghĩa listbox/điều hướng bàn phím — CHƯA SỬA**
Kết quả vẽ bằng `<button>` thường trong một div cuộn được — không `role="listbox"`/`aria-selected`, không điều hướng bằng phím mũi tên. Ổn với cảm ứng, nhưng là khoảng trống thật với kịch bản bàn phím ngoài ở trạm làm việc mà chính comment CSS `.scr-dose` trong file này đã lường trước ở nơi khác.
*Lệnh gợi ý*: `/impeccable harden`

## Cảnh báo theo persona

**Sam (phụ thuộc công nghệ hỗ trợ)**
- Lỗi tương phản toast ở bản tối (P0, đã sửa) đánh trúng persona này mạnh nhất — không phải một sai lệch AA nhỏ, mà là tương phản gần 1:1 đo được trực tiếp trên xác nhận của một hành động phá huỷ.
- Điểm cộng đối trọng: `.scr-dose button:focus-visible`/`input:focus-visible` (`index.css:641–645`) và fix focus-within cho ô tìm (`index.css:647–658`) cho thấy đầu tư thật cho người dùng bàn phím — đáng ghi nhận rằng app mạnh ở một chiều (focus bàn phím) nhưng từng yếu ở chiều khác (tương phản màu) cho cùng persona này, trước đợt sửa vừa qua.

**Casey (dùng điện thoại, hay bị gián đoạn)**
- Cửa sổ hoàn tác 10 giây, chỉ trong bộ nhớ, không để lại dấu vết (P2, chưa sửa) là cảnh báo sắc nhất cho persona này.
- Điểm cộng đối trọng: `useStickyState` giữ được tiến trình tìm kiếm/lựa chọn qua điều hướng màn hình — Casey chỉ mất khả năng hoàn tác việc xoá bệnh nhân, không mất tiến trình tra cứu.

**Alex (người dùng thạo việc)**
- Tìm kiếm xuyên tab giới hạn 30 kết quả (`App.tsx:9544`) không có "xem thêm" — khó xảy ra với ~100 thuốc hiện có, nhưng không có dấu hiệu nào báo kết quả đã bị cắt bớt nếu số thuốc tăng lên.
- Không có phím tắt hay cách "ghim" các tab hay dùng — người luôn mở đúng vài tab cố định mỗi ca (vd luôn Co bóp + Vận mạch + An thần) không có cách sắp xếp lại thứ tự.

## Quan sát nhỏ

- Việc `text-slate-*` xuất hiện dày đặc trong CalcLogSheet/PatientPanel/RunningPanel **KHÔNG phải** lỗi màu viết cứng — `index.css:328–340` đã remap toàn bộ bảng `slate` của Tailwind về thẳng các token `--c-*`. Kỹ thuật khéo nhưng không hiển nhiên: một người đóng góp sau này không biết remap này có thể "sửa nhầm" một `text-slate-500` tưởng là màu cứng, hoặc dùng một sắc độ chưa được map (vd `slate-950`) và vô tình tạo ra lỗi thật.
- Comment ở hàng chip RRT (`App.tsx:5438–5440`) tự lý giải rất kỹ về đánh đổi tương phản `-400` so với `-500` — thực hành tốt, nhưng đang là "tri thức truyền miệng" nằm trong comment code thay vì được chính hệ token ép buộc.
- `AntibioticsScreen` và `InfusionCategoryScreen` có khối "Đang dùng cho bệnh nhân" gần như trùng lặp — nợ kỹ thuật nhỏ, không phải lỗi thiết kế.

## Câu hỏi gợi mở

1. Nếu kết quả CrCl và liều truyền KHÔNG BAO GIỜ dùng xanh thương hiệu cho trạng thái "ổn", và `C.primary` được giữ nghiêm ngặt đến mức bác sĩ học được sau vài ca trực rằng "xanh chỉ có nghĩa là điều hướng — thấy xanh trên một con số là có gì đó sai với kỳ vọng của mình, không phải với bệnh nhân" — liệu điều đó có giúp nhận ra trạng thái nguy hiểm nhanh hơn dưới áp lực thời gian thật, hay chính màu xanh dịu-khi-ổn hiện tại đang mang một tín hiệu hữu ích riêng ("bình thường, đừng lo") mà một màu xám trung tính sẽ không truyền tải được?
2. Nếu hàng 10 tab không phải điều hướng chính — nếu "Tìm" là tương tác mặc định khi mở màn (tự động focus) và hàng tab trở thành chế độ duyệt phụ, đảo ngược vai trò lối thoát hiện tại — liệu hàng tab còn xứng đáng là thứ đầu tiên hiện ra, khi chính app đã xây tìm kiếm xuyên tab vì "lúc cấp cứu không ai nhớ tab nào"?
3. Nếu sự kiện xoá bệnh nhân hiện mặc định trong Nhật ký (không cần bật riêng), giống cách các phép tính đang được ghi — liệu Nhật ký có trở thành hơn cả một sổ nháp tính toán, thành một bản ghi bàn giao ca trực nhẹ nhàng — thứ gần với điều một bác sĩ thực sự cần lúc 3 giờ sáng hơn?
