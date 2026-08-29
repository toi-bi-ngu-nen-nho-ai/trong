# Kế hoạch: vá các phát hiện từ /impeccable critique DungThuocScreen

Nguồn: `.impeccable/critique/2026-08-15T15-36-57Z__src-app-tsx-dungthuocscreen.md` (điểm 34/40),
mở rộng theo yêu cầu chủ dự án: cờ đỏ persona Riley + Casey, comment cũ trong `PatientPanel`,
và trả lời bằng code cho 2 câu hỏi "đáng suy ngẫm" trong báo cáo.

**Đã loại khỏi kế hoạch sau khi kiểm tay:** phát hiện "tiêu đề tràn 26px" (P1 gốc trong báo cáo)
là **false positive** của máy dò — đã đo trực tiếp trong preview: `h1` của `ScreenHeader` đã có
sẵn `flex-1 min-w-0 truncate` (App.tsx:1076, kèm comment giải thích đúng lỗi min-width này), và
`scrollWidth - clientWidth = 26px` chính là cách `text-overflow: ellipsis` hoạt động khi chữ dài
hơn khung — chữ hiện "..." đúng như thiết kế, không đè lên nút "Tìm"/"Nhật ký" nào (đã đo
bounding rect, không chạm nhau). Không có gì để sửa ở đây.

## Global Constraints

- Toàn bộ thay đổi nằm trong `src/App.tsx` (và có thể `src/index.css` nếu Task 3 cần token màu
  mới) — không đụng file khác.
- Giữ nguyên mọi hành vi/state hiện có; đây là các vá UI/UX tinh chỉnh, không phải tính năng mới.
- Mọi màu sắc phải đọc từ token `--c-*` có sẵn — không thêm hex cứng (xem DESIGN.md, "Do: đọc mọi
  màu từ token").
- Sau mỗi task: `npx tsc --noEmit` phải exit 0. Không bắt buộc chạy lại toàn bộ `npm test` cho mỗi
  task nhỏ (không có test nào phủ các dòng UI này — xem ghi chú task-reviewer), nhưng phải verify
  bằng preview thật (`preview_start` name `drtrong-dev`) trước khi coi task xong.
- Không bundle nhiều task vào một commit — mỗi task một commit riêng, message rõ ràng.

## Task 1: Font mono cho liều kháng sinh (P1 — Riley)

**Vấn đề:** `NUM_DOSE` (App.tsx import từ `./lib/ui`, font JetBrains Mono dành cho số liều/nồng độ)
chỉ được dùng ở hiển thị CrCl (`App.tsx:5640`) và máy tính thuốc vận mạch (`App.tsx:9603,9619`).
Thẻ liều kháng sinh (`AntibioticDoseCard`) — tab mặc định, thuốc đọc nhiều nhất — lại render liều
bằng chữ thường (`T.body`/`T.bodyStrong` hay tương đương), không có `NUM_DOSE`.

**Việc cần làm:**
1. Tìm hàm `AntibioticDoseCard` trong `src/App.tsx` (dùng Grep tìm `function AntibioticDoseCard`).
2. Xác định 3 chỗ hiển thị số liều: dòng liều theo bậc CrCl hiện tại (biến tương đương `tier.dose`
   sau khi đã nhân cân nặng, ví dụ đoạn hiện "15–20 mg/kg mỗi 24h" hoặc con số mg đã tính), dòng
   ngưỡng liều một lần dùng (nếu có, tương đương `doseCapText`), và câu "Cách dùng" tự tính (ví dụ
   "Rút 4.00 mL thuốc... = 200 mL", tương đương `autoUsage.text`).
3. Với MỖI chỗ trong 3 chỗ trên: thêm class `NUM_DOSE` vào phần tử đang render con số đó (ghép vào
   `className` hiện có bằng template string, ví dụ `` className={`${T.bodyStrong} ${NUM_DOSE}`} ``
   — xem cách `App.tsx:5640` đã làm để theo đúng pattern). CHỈ áp cho phần chứa con số/đơn vị, không
   áp cho câu chữ mô tả xung quanh nếu chúng tách biệt được dễ dàng; nếu số và chữ mô tả nằm chung
   một dòng/một phần tử không tách được, áp `NUM_DOSE` cho cả dòng đó là chấp nhận được (không cần
   tách JSX thêm chỉ để cô lập con số).
4. KHÔNG đổi `NUM` (không có DOSE) ở những chỗ khác không liên quan tới 3 vị trí trên.

**Xác nhận:** `tsc --noEmit` sạch. Mở preview, chọn một kháng sinh có bậc liều (ví dụ Amikacin +
chỉ định "Viêm phổi cộng đồng"), xác nhận bằng mắt/`getComputedStyle` rằng phần con số liều giờ
dùng font khác (kiểm `fontFamily` chứa "JetBrains Mono" qua `javascript_tool`).

## Task 2: Giảm tải nhận thức lúc vào tab lần đầu + padding chật trong nội dung mở rộng (P1)

**Vấn đề (hai phần của cùng một phát hiện):**
- Vào một tab thuốc (kháng sinh hoặc bất kỳ nhóm truyền nào) lần đầu, không có gì phân biệt hành
  động kế tiếp: lưới "Đang dùng cho bệnh nhân" (nếu có), toàn bộ danh sách chip A-Z, và nhãn "Chọn
  kháng sinh"/"Chọn thuốc" cùng cạnh tranh sự chú ý ngang nhau.
- Máy dò xác nhận thêm: nhiều dòng chip/badge/text bên trong nội dung `Disclosure` (bảng pha thuốc,
  thẻ liều) có padding dọc 0px trên chữ cỡ 12-14px — không phải bản thân `.disc-body` (wrapper hoạt
  ảnh, ĐÚNG khi bằng 0, không đụng vào), mà là các phần tử con bên trong nó.

**Việc cần làm:**
1. Trong `AntibioticsScreen` và `InfusionCategoryScreen` (Grep hai tên này): ô tìm kiếm của mỗi màn
   (biến `query`/`setQuery`, input có placeholder kiểu "Tìm kháng sinh..."/"Tìm thuốc...") — thêm
   `autoFocus` cho input đó CHỈ khi màn vừa mount và CHƯA có thuốc nào đang chọn (`!selected`/tương
   đương `effectiveId == null`). Không tự focus nếu đã có thuốc đang chọn (tránh cướp focus khỏi
   nội dung thẻ liều khi quay lại từ sticky state).
2. Trong cùng hai màn: khối "Đang dùng cho bệnh nhân" (`onPatient.length > 0 && (...)`) — khi danh
   sách này RỖNG (không thuốc nào đang dùng), phần này vốn đã không render gì (điều kiện `&&` đã
   lo việc đó) — xác nhận lại điều này đúng, không cần sửa gì thêm ở đây; việc "giảm nổi bật" áp
   dụng cho lưới chip A-Z bên dưới: khi CHƯA chọn thuốc nào (`!selected`), có thể thêm class
   `opacity-90` hoặc tương tự nhẹ nhàng cho container danh sách chip nếu dễ làm mà không đổi layout;
   nếu việc này đòi hỏi tái cấu trúc lớn, BỎ QUA phần này và chỉ làm bước 1 + 3 — không ép một giải
   pháp phức tạp cho một cải thiện nhỏ.
3. Rà các phần tử con trực tiếp bên trong nội dung `Disclosure` ở `AntibioticDoseCard` và
   `AntibioticMixPanel`/`MixPanel`/`InfusionCalculator` đang có `py-0`/không có padding dọc trên
   chữ 12-14px (chip hàng "Quy cách đóng gói", hàng badge CrCl/route, các dòng cảnh báo ngắn) — với
   MỖI chỗ tìm thấy thực sự thiếu khoảng thở (không phải mọi `text-[12px]` đều cần sửa, chỉ những
   chỗ padding dọc bằng 0 VÀ nằm sát cạnh phần tử khác), thêm `py-1` hoặc `py-1.5` tuỳ mật độ xung
   quanh. Không sửa quá 6-8 vị trí — nếu tìm được nhiều hơn, chọn những chỗ rõ ràng chật nhất trong
   luồng bảng pha thuốc (nơi máy dò đo được padding chật tăng dần khi mở panel).

**Xác nhận:** `tsc --noEmit` sạch. Preview: vào tab Kháng sinh lần đầu (chưa chọn gì) → ô tìm phải
tự nhận focus (kiểm `document.activeElement`). Chọn Amikacin → mở Bảng pha thuốc → các hàng chip/
badge phải có khoảng đệm dọc rõ ràng hơn trước (so `getComputedStyle(...).paddingTop/Bottom` trước/
sau nếu cần).

## Task 3: Đổi màu + thêm khác biệt hình dạng/chuyển động cho badge "Trong khoảng" (P2 + câu hỏi 2)

**Vấn đề:** `index.css` gán `--c-accent` = `--c-primary` (bí danh). DESIGN.md nói "một liều bình
thường đọc bằng `--c-text`, không phải `--c-primary`" — `App.tsx:5638-5640` đã sửa đúng việc này
cho con số kết quả 24px, nhưng badge "✓ Trong khoảng" (Grep `Trong khoảng` trong App.tsx, gần dòng
9611) vẫn dùng `C.accent`, tái diễn lỗi màu-thương-hiệu-làm-con-dấu-duyệt ở quy mô nhỏ hơn.

Câu hỏi chủ dự án muốn trả lời bằng code: *"Nếu 'Trong khoảng' dùng hình dạng/chuyển động riêng
thay vì chỉ đổi màu, người xem có phân biệt 'lựa chọn tôi vừa bấm' với 'xác nhận an toàn' nhanh
hơn không?"* — Quyết định: CÓ, làm luôn, không chỉ đổi màu.

**Việc cần làm:**
1. Đổi màu badge "Trong khoảng" từ `C.accent`/`--c-accent` sang `--c-green`/tương đương token xanh
   lá đã có trong DESIGN.md (kiểm tên token thật trong `index.css`, ví dụ `--c-green`/`--c-green-icon`
   — dùng ĐÚNG tên đã tồn tại, không tự đặt token mới).
2. Thêm một icon dấu tích (✓) nếu chưa có sẵn trong JSX của badge đó — kiểm xem `icons.check()` đã
   được dùng chưa; nếu chữ "✓" đang là ký tự literal trong chuỗi, cân nhắc thay bằng `icons.check()`
   thật để nhất quán icon toàn app (chỉ đổi nếu không tốn công tái cấu trúc lớn).
3. Thêm một hiệu ứng chuyển động NHẸ, một-lần khi badge xuất hiện (không lặp lại liên tục) để phân
   biệt với việc chọn chip/tab thường (vốn dùng `scale(0.94-0.97)` khi nhấn) — dùng đúng class hoạt
   ảnh đã có sẵn trong `index.css` nếu có thứ phù hợp (Grep `flash-ok`/`rise-in`/`fade-in` trong
   App.tsx — `flash-ok` đã dùng cho dải xác nhận lưu công thức, có thể tái dùng nếu ngữ cảnh khớp).
   KHÔNG tự viết `@keyframes` mới trong `index.css` trừ khi không có animation nào có sẵn phù hợp —
   nếu phải viết mới, giữ tối giản (một hiệu ứng pop-in nhẹ, ~200-300ms, tôn trọng
   `prefers-reduced-motion` theo đúng quy ước "chỉ animation trang trí mới tắt khi reduced-motion"
   đã ghi trong DESIGN.md).

**Xác nhận:** `tsc --noEmit` sạch. Preview: badge "Trong khoảng" không còn màu tím/indigo thương
hiệu (kiểm `getComputedStyle(...).color` không khớp giá trị `--c-primary`/`--c-accent`), có hiệu
ứng xuất hiện khác biệt so với việc bấm chip thường.

## Task 4: Điều hướng bàn phím cho hàng 10 tab nhóm thuốc (P2)

**Vấn đề:** Danh sách kết quả tìm kiếm toàn cục đã có xử lý phím mũi tên lên/xuống để di chuyển
focus (Grep `ArrowDown` trong App.tsx để xem pattern mẫu — gần khu vực search results trong
`DungThuocScreen`). Hàng 10 tab nhóm thuốc (`role="tablist"`, Grep `role="tablist"` gần
`MIXING_TABS.map`) không có xử lý tương tự, dù có `role="tab"`/`aria-selected` đầy đủ.

**Việc cần làm:**
1. Trong `DungThuocScreen`, tìm khối render hàng tab (`MIXING_TABS.map((t) => (...))`, mỗi tab là
   một `<button role="tab" ...>`).
2. Thêm xử lý `onKeyDown` trên container `role="tablist"` (element cha bọc `.map`), bắt phím
   `ArrowLeft`/`ArrowRight` (hàng cuộn NGANG, không phải lên/xuống như search results — dùng đúng
   cặp phím khớp hướng cuộn thật) để chuyển `tab` state sang tab liền trước/liền sau trong mảng
   `MIXING_TABS`, giới hạn ở hai đầu mảng (không vòng tròn), và gọi `.focus()` lên button tương ứng
   sau khi đổi — theo đúng pattern chuẩn "roving tabindex": chỉ tab đang active có `tabIndex={0}`,
   các tab còn lại `tabIndex={-1}`, để Tab-key của trình duyệt chỉ dừng ở đúng MỘT điểm trong hàng
   thay vì phải Tab qua cả 10 nút.
3. Không đổi hành vi click/chạm hiện có (`onClick={() => setTab(t.id)}` giữ nguyên).

**Xác nhận:** `tsc --noEmit` sạch. Preview: focus vào hàng tab (click hoặc Tab tới), bấm
`ArrowRight`/`ArrowLeft` phải chuyển tab và di chuyển focus theo, dừng đúng ở hai đầu (không lỗi
khi ở tab đầu bấm Trái hoặc tab cuối bấm Phải).

## Task 5: Đồng bộ khung thời gian xác nhận-xoá và hoàn-tác cho "Xoá bệnh nhân" (Casey + câu hỏi 1)

**Vấn đề:** Nút "Xoá bệnh nhân" trong `PatientPanel` dùng `CONFIRM_ICON_RESET_MS` (2500ms, hằng số
dùng CHUNG cho nhiều nút xác nhận-xoá khác trong app — Grep `CONFIRM_ICON_RESET_MS` để thấy hết các
chỗ dùng) làm khung thời gian giữ trạng thái "Xoá bệnh nhân?" trước khi tự huỷ. Sau khi xoá thật,
`DungThuocScreen` lại cho 10 giây (`10_000`, Grep `resetUndoTimer.current = setTimeout` trong
`DungThuocScreen`) để hoàn tác. Hai mốc thời gian AN TOÀN cho CÙNG một hành động phá huỷ lệch nhau
đáng kể — người dùng bị phân tâm dễ lỡ khung 2.5s xác nhận dù khung hoàn tác sau đó rộng rãi hơn
nhiều.

Câu hỏi chủ dự án muốn trả lời bằng code: *"Nếu khung xác nhận-xoá và khung hoàn-tác dùng chung một
mốc thời gian, liệu có đáng tin hơn?"* — Quyết định: CÓ, đồng bộ CHỈ riêng cho nút "Xoá bệnh nhân",
KHÔNG đổi `CONFIRM_ICON_RESET_MS` dùng chung (hằng số đó còn phục vụ các nút xác nhận-xoá khác —
ví dụ xoá công thức đã lưu — không nằm trong phạm vi phát hiện này, đổi chung sẽ ảnh hưởng ngoài ý
định).

**Việc cần làm:**
1. KHÔNG sửa hằng số `CONFIRM_ICON_RESET_MS` dùng chung.
2. Trong `PatientPanel`, tìm nút "Xoá bệnh nhân" (`confirmResetTimer.current = setTimeout(() =>
   setConfirmReset(false), CONFIRM_ICON_RESET_MS)`). Thêm một hằng số riêng ngay phía trên hàm
   `PatientPanel` (hoặc gần `CONFIRM_ICON_RESET_MS`), ví dụ:
   `const PATIENT_RESET_CONFIRM_MS = 10_000 // khớp khung hoàn tác 10s ở DungThuocScreen — hai
   mốc thời gian an toàn của CÙNG một hành động phá huỷ phải cùng một con số, không lệch nhau.`
   (đúng giá trị 10000, khớp với `resetUndoTimer` trong `DungThuocScreen`).
3. Đổi lời gọi `setTimeout` đó dùng `PATIENT_RESET_CONFIRM_MS` thay vì `CONFIRM_ICON_RESET_MS`.
4. KHÔNG đổi hoạt ảnh `confirmRing` (`animation: \`confirmRing ${CONFIRM_ICON_RESET_MS}ms linear
   forwards\`` gần đó, nếu có — nếu hoạt ảnh đó thuộc về nút "Xoá bệnh nhân" cụ thể (kiểm bằng cách
   đọc JSX bao quanh, không đoán), đổi CẢ hoạt ảnh đó sang dùng `PATIENT_RESET_CONFIRM_MS` để vòng
   tròn đếm ngược khớp đúng 10 giây thật; nếu hoạt ảnh đó thuộc một nút xác nhận-xoá KHÁC (không
   phải "Xoá bệnh nhân"), giữ nguyên không đổi.

**Xác nhận:** `tsc --noEmit` sạch. Preview: bấm "Xoá bệnh nhân" → chờ hơn 2.5 giây (nhưng dưới 10
giây) → nút PHẢI vẫn còn ở trạng thái "Xoá bệnh nhân?" (chưa tự huỷ) → bấm lần hai → xoá thật, hiện
toast hoàn tác.

## Task 6: Sửa comment cũ trong PatientPanel nhắc sai cơ chế Disclosure

**Vấn đề:** Comment ở `App.tsx:5489-5491` (khu vực gần đầu hàm `PatientPanel`, tìm bằng Grep
`grid-template-rows` trong App.tsx) vẫn mô tả cơ chế mở/đóng là "grid-template-rows 0fr→1fr", nhưng
CSS thật (`.disc-body` trong `index.css`) đã đổi sang kỹ thuật `max-height` (đúng như DESIGN.md ghi
— phần "Disclosure (expand/collapse)": lý do đổi từ `grid-template-rows` sang `max-height` là một
bug thật đã tái hiện được trên Chromium hiện đại). Comment lạc hậu này có thể khiến người đọc sau
hiểu sai cơ chế thật đang chạy.

**Việc cần làm:**
1. Đọc đúng đoạn comment tại App.tsx:5489-5491 (số dòng có thể xê dịch vài dòng do các task trước
   đã sửa App.tsx — dùng Grep `grid-template-rows` để định vị chính xác thay vì tin số dòng cứng).
2. Sửa lại nội dung comment để mô tả ĐÚNG cơ chế `max-height` đang thật sự chạy (tham khảo cách
   comment ở `Disclosure` component tự mô tả cơ chế của chính nó — Grep `function Disclosure` — để
   dùng cách diễn đạt nhất quán, không copy nguyên văn, viết ngắn gọn khớp ngữ cảnh của
   `PatientPanel`).
3. KHÔNG đổi bất kỳ dòng code nào khác ngoài nội dung comment này.

**Xác nhận:** `tsc --noEmit` sạch (thay comment không ảnh hưởng biên dịch, nhưng vẫn chạy để chắc
chắn không gõ nhầm cú pháp). Đọc lại đoạn comment mới, xác nhận khớp đúng cơ chế `max-height` thật.
