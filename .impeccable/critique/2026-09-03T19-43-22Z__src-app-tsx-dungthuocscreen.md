---
target: DungThuocScreen
total_score: 31
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-09-03T19-43-22Z
slug: src-app-tsx-dungthuocscreen
---
# Critique: DungThuocScreen — lượt sau 3 ngày & 2 commit (xóa nhóm An thần/Thần kinh, gỡ nút theme khỏi header) (2026-09-04)

Method: dual-agent (A: soát thiết kế · B: detector + overlay) — cả hai Sonnet 5 effort High, chạy nền song song, cô lập nhau đến lúc tổng hợp.

## Điểm sức khỏe thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 3 | CrCl đếm dần, thanh tiến trình hàng tab, banner "dữ liệu cũ / đổi từ tab khác", thanh cạn 20s — đều tốt. Thiếu: nút mở/gấp thẻ bệnh nhân NGOÀI không có `aria-expanded`; hai ô tìm hiện cùng lúc khi mở "Tìm mọi nhóm". |
| 2 | Match System / Real World | 4 | Thuật ngữ lâm sàng tiếng Việt đầy đủ, đích/cho, IBW/ABW hiện rõ, khoảng CrCl — khớp domain xuất sắc. |
| 3 | User Control & Freedom | 3 | Hoàn tác 20s + xác nhận hai chạm cho hành động phá huỷ (tốt); nhưng KHÔNG kéo sắp lại tab được (chỉ ghim), và "Bệnh nhân mới" bung lại toàn bộ thẻ. |
| 4 | Consistency & Standards | 2 | Ba kiểu disclosure trong CÙNG một thẻ bệnh nhân; `role="group"` lồng trong `role="tablist"`; danh sách nhảy chữ thường vs chip tab chữ hoa. |
| 5 | Error Prevention | 4 | `parseStrictNumber` từ chối "70abc" thay vì lặng lẽ lấy 70; chặn giá trị bất hợp lý + kiểm khoảng liều có cổng xác nhận; minh bạch làm tròn. |
| 6 | Recognition Rather Than Recall | 4 | Bối cảnh bệnh nhân nuôi mọi phép tính; cơ sở tính cân nặng hiện rõ; không phải nhớ số qua màn — điểm mạnh cốt lõi. |
| 7 | Flexibility & Efficiency | 3 | Tab tự sắp theo tần suất + ghim + tìm xuyên nhóm + chỉ mục abc — accelerator thật; nhưng ghim một tab đang ngoài màn = 2 bước, hint chỉ hiện một lần/thiết bị. |
| 8 | Aesthetic & Minimalist | 2 | Thẻ liều ≈12 khối nối tiếp; quyết định thận = 6 chip; dòng tóm tắt gãy 3 dòng; "kiểm tra lại trước khi dùng" lặp khắp nơi. |
| 9 | Error Recovery | 3 | Cảnh báo cụ thể, có định lượng ("thiếu 70,0 mg so với đích 320"), tô màu theo mức, không hoạt hoạ; nhưng nhiều cảnh báo cùng lúc có thể chôn cái quan trọng nhất. |
| 10 | Help & Documentation | 3 | "Cách dùng · Ghi chú", "Nguồn: … BYT 2026, tr. 61 · Rà soát: 08/2026" — phù hợp. KHÔNG trừ điểm việc cố ý không có glossary thuật ngữ (quyết định sản phẩm). |
| **Tổng** | | **31/40** | **Good (nửa dưới) — 0 P0/P1; 3×P2 + 2×P3, tất cả về minimalism/consistency, không phải an toàn dữ liệu** |

Applicable max: 40 (không heuristic nào n/a — mode Operate, có lớp trợ giúp thật nên heuristic 10 vẫn chấm).

**Về điểm số:** 33 → 31 KHÔNG phải hồi quy. Assessment A xác nhận cả 3 phát hiện tồn đọng đã cải thiện: cắt tóm tắt 375px **đã vá thật**, hình dạng nút ghim-sao **đã đồng nhất** (cùng `icons.starPin`), chèn nút ghim vào tablist **đã bọc `role="group"` + `aria-label`**. Điểm rớt 2 bậc là do reviewer lượt này chấm nặng tay hơn ở heuristic 4 và 8 (chồng khối thẻ liều + 3 kiểu disclosure) — cùng vấn đề tồn tại lâu nay, lượt 2026-09-01 cho 3/3, lượt này cho 2/2. Dao động reviewer-tới-reviewer, không phải mã mới kém đi.

## Design Specificity Verdict

**LLM (Assessment A):** Được thiết kế RIÊNG cho sản phẩm này, không phải khung chung dán lại. Bằng chứng đo trực tiếp:
- Xương sống màn hình là một "bệnh nhân hiện tại" có thể sửa, dùng chung, nuôi mọi phép tính; CrCl được KÉO RA khỏi vùng tóm tắt có thể cắt, đặt vào `flex-none` không bao giờ cắt "vì đó là con số cả tab này tồn tại để tạo ra".
- Thẻ liều phân biệt **đích** với **cho** (sau làm tròn), kèm đúng số mg thiếu và cái giá của việc làm tròn lên (`500 mg, gấp 1,56 lần đích`). Máy tính liều chung chung giấu chỗ này.
- Cửa sổ hoàn tác 20 giây cho "Bệnh nhân mới" chỉnh riêng "để sống sót qua gián đoạn"; hàng tab tự sắp theo tần suất dùng liên ca, đóng băng 15 phút để bảo vệ trí nhớ vị trí.
- Mật độ cao (Disclosure lũy tiến, metadata 12px, không giãn viết tắt RRT/CRRT) là lựa chọn có chủ đích, đúng đối tượng.

**Deterministic scan (Assessment B):** `detect.mjs` trên `src/App.tsx` → exit 2, **1 phát hiện, NGOÀI PHẠM VI** (`design-system-color`, `#000` tại dòng 969 — điểm dừng alpha của CSS mask trong `SpecialtyPicker`, cách DungThuocScreen ~10.300 dòng; đúng dương-tính-giả đã ghi nhận lượt trước, chỉ dời từ 943→969 do sửa header chưa commit). `ScreenHeader.tsx` → sạch. **Trong phạm vi DungThuocScreen: 0 phát hiện tĩnh.**

**Overlay trực quan:** injection CHẠY ĐƯỢC (preflight mutation pass; external `<script src>` sau khi sửa một lần inline tự nhiễm `gradient-text` từ chính mã nguồn detector). Chạy `impeccableScanAsync()` trên 5 trạng thái (Kháng sinh mặc định · Vận mạch + Noradrenaline có kết quả liều · panel tìm xuyên nhóm · thẻ bệnh nhân + khối CrCl mở · 375px). **Mọi dòng overlay đều là dương-tính-giả đã lập danh mục** (`cramped-padding` ×3 — đo lại đều là canh giữa bằng line-height, không phải đệm chật; `line-length` ×7 — detector đếm thừa ~80% vì Plus Jakarta Sans + tiếng Việt ≈ 0,85em/ký tự, số thật 52–65 ch/dòng vs ước lượng 100–131, và biến mất ở 375px; `layout-transition` — mẫu Disclosure đã biết; `overused-font` — một typeface có chủ đích) **hoặc** tín hiệu modal mong đợi (`text-occlusion` ×~40 = màn chắn disclaimer). **Nửa deterministic: 0 lỗi thật.** Lưu ý: preview pane bị ẩn (innerWidth 0) lượt này nên KHÔNG có lớp overlay nhìn thấy được trong tab [Human] — chứng cứ dựa trên đo DOM + đọc console, không phải highlight trực quan.

## Ấn tượng chung

Đây là một màn hình trưởng thành, thật sự đặc thù sản phẩm — ~15 lượt critique đã đẩy hết lớp lỗi an toàn dữ liệu P0/P1 (cắt số đã vá, nút ghim-sao đã đồng nhất, race đa tab đã xử lý). Cái còn lại là MỘT chủ đề mạch lạc: **màn hình bắt bác sĩ phải phân tích quá nhiều ở đúng hai khoảnh khắc tải nhận thức cao nhất** — quyết định "chức năng thận" (6 chip) và lúc chốt liều (chồng ~12 khối, con số thật bị chôn ở giữa, tình huống làm tròn bày ra thô). Cộng thêm một chỗ tích tụ nhiều điểm không nhất quán nhỏ trong thẻ bệnh nhân (3 kiểu disclosure, hai chevron giống hệt lồng nhau, thiếu `aria-expanded`).

Cơ hội lớn nhất: **coi khối kết quả thẻ liều là một CÂU TRẢ LỜI đã thiết kế, không phải một bãi dữ liệu đổ ra** — dẫn bằng con số đã chốt + đích, đẩy phần giải thích làm tròn / ghi chú / cách dùng vào sau Disclosure, giữ 3 cảnh báo đỏ hiển thị.

## Điểm mạnh

1. **CrCl là token được bảo vệ, không bao giờ cắt, có "phần tính" đi kèm.** Hiển thị kép: span `flex-none` ở dòng tóm tắt gọn + hộp mở rộng "IBW 62 kg · tính theo ABW 80,0 kg". Con số mà mọi thứ phụ thuộc vào luôn đọc được VÀ luôn kiểm chứng được — đúng cái một bác sĩ cần để tin *hoặc chất vấn* nhanh.
2. **Trung thực đích-vs-thực-nhận.** "cho 250 mg · đích 320 mg" + số thiếu chính xác + cái giá của làm tròn lên ("500 mg, gấp 1,56 lần"). Phần lớn công cụ giả vờ chính xác; cái này phơi ra đúng chỗ cần phán đoán.
3. **Kỷ luật Decoration/Diagnosis đứng vững khi đo.** Đo trực tiếp: số liều `rgb(236,239,252)` và CrCl render bằng `--c-text` (điềm tĩnh, không phải màu thương hiệu); xanh thương hiệu chỉ ở nút hành động (Ghim liều này, Bảng pha thuốc, chọn tab); họ danh-danger/warn tải cảnh báo và KHÔNG hoạt hoạ. Assessment B độc lập tìm thấy 0 vi phạm.

## Vấn đề ưu tiên

### [P2] Thẻ liều đổ ~12 khối nối tiếp; con số "cho" bị chôn ở vị trí ~4
- **Gì:** Chọn Amikacin cho bệnh nhân CrCl 36 render nối tiếp, đúng thứ tự: công thức → phép tính theo kg → lưu ý làm tròn → liều đã làm tròn ("250 mg") → dòng công thức pha → lưu ý CrCl → đoạn ~40 từ màu hổ phách về phần thiếu do làm tròn → 2 nút bật/tắt làm tròn → 3 cảnh báo đỏ → "Ghim liều này" → "Cách dùng · Ghi chú" → "Nguồn dữ liệu".
- **Vì sao quan trọng:** Con số bác sĩ cần nằm ở giữa chồng về mặt thị giác, và tình huống đích-vs-cho rơi đúng lúc chốt. Lúc 2h sáng giữa lúc bị ngắt quãng, đó là quá nhiều thứ phải đọc để trả lời "cho bao nhiêu".
- **Sửa:** Dẫn bằng một DÒNG kết quả gọn: số đã chốt + đích (giữ nguyên kiểu điềm tĩnh), rồi đẩy phần giải thích thiếu-do-làm-tròn, 2 nút làm tròn, "Cách dùng · Ghi chú" vào sau `Disclosure`. Giữ 3 cảnh báo đỏ hiển thị (đó là tín hiệu). Đích: "số + một dòng lý do + cảnh báo" nằm trên màn đầu, phần còn lại cách một chạm.
- **Lệnh gợi ý:** `/impeccable distill`

### [P2] "Chức năng thận" hiện 6 chip; 5 chip là nhiễu ở ca thường gặp, 4 chip chế độ lọc gần như không trông giống nút bấm
- **Gì:** "Không lọc / AKI" (hàng 1) + "IHD / CRRT / SLED / PD" (hàng 2) dưới hai nhãn phụ = 6 chip bấm được cho MỘT câu hỏi. Đo được: 4 chip chế độ lọc có `background: transparent`, không viền, `color: rgb(168,174,218)` — trông như chữ thông tin, không phải control (tương phản chữ 8,2:1 vẫn đạt; vấn đề là AFFORDANCE).
- **Vì sao quan trọng:** Với đa số bệnh nhân đáp án là "Không lọc" và 5 lựa chọn kia tranh nhau một cái liếc lúc 2h sáng (vượt luật ≤4). Ngược lại, bác sĩ có bệnh nhân ĐANG chạy CRRT có thể không nhận ra 4 chip chế độ là bấm được.
- **Sửa:** Lựa chọn lũy tiến — hiện "Không lọc / AKI / Đang lọc máu" trước; chỉ hiện IHD/CRRT/SLED/PD (dạng chip có viền thật) sau khi chọn "Đang lọc máu". Đường thường gặp còn 3 lựa chọn; bộ chọn chế độ có affordance đúng khi nó thật sự quan trọng.
- **Lệnh gợi ý:** `/impeccable distill`

### [P2] Hai chevron giống hệt lồng nhau + 3 kiểu disclosure a11y không nhất quán trong thẻ bệnh nhân
- **Gì:** Đo được hai glyph chevron-xuống 12×12 giống hệt tại x≈323 (ngoài, "Thu gọn", gấp cả panel) và x≈339 (trong, chỉ gấp khối Creatinin/CrCl/RRT), cách nhau ~223px gần như cùng cột. A11y lệch ba kiểu: nút chữ ngoài **không có `aria-expanded`, không nhãn** (tên khả truy cập là cả chuỗi tóm tắt "80 kg · 170 cm · Nữ · 72 tuổi · CrCl 36"); nút chevron ngoài có nhãn nhưng **không `aria-expanded`**; `Disclosure` trong có `aria-expanded` nhưng không nhãn.
- **Vì sao quan trọng:** Sau khi nhập sinh hiệu, bác sĩ muốn gấp panel để tới danh sách thuốc. Bấm nhầm chevron trong chỉ ẩn khối CrCl — tinh vi đủ để đọc như một cú chạm chết. Người dùng trình đọc màn hình không nhận được trạng thái đóng/mở ở control ngoài.
- **Sửa:** (a) Cho disclosure trong một affordance khác rõ rệt (chữ "Ẩn/Hiện" nội dòng hoặc caret nhỏ, không phải chevron canh phải kiểu tiêu đề). (b) Thêm `aria-expanded` vào nút ngoài; gộp hai vùng chạm ngoài thành một control có nhãn. (c) Xét lại xem khối CrCl có CẦN gấp độc lập trên tab Kháng sinh không, nơi nó là số liệu nền tảng.
- **Lệnh gợi ý:** `/impeccable harden`

### [P3] Dòng tóm tắt bệnh nhân gãy 3 dòng trong cột 137px vì nút "Xoá bệnh nhân" chiếm nguyên hàng
- **Gì:** Đo được: `<p>` tóm tắt bị ép còn `clientW: 137px`, gãy "80 kg · 170 cm · Nữ · 72 tuổi · CrCl 36" thành **3 dòng** (hàng tiêu đề cao 100px), vì nút pill "Xoá bệnh nhân" luôn hiện + chevron chiếm ~180px bên phải. KHÔNG cắt chữ (phát hiện #1 lượt trước ĐÃ vá) — nhưng dòng-để-liếc giờ là thứ chật nhất màn hình.
- **Vì sao quan trọng:** Trạng thái gấp tồn tại để liếc nhanh một tay; ép sinh hiệu xuống 3 dòng trong khi control phá huỷ nhất lại nổi bật bên cạnh là đảo ngược thứ tự ưu tiên.
- **Sửa:** Đưa "Xoá bệnh nhân" vào phần thân mở rộng (gần đáy — vẫn cố ý khó với theo chủ đích thiết kế hiện có) hoặc sau một control tràn nhỏ. Cho dòng tóm tắt dùng nguyên chiều rộng panel, 1–2 dòng.
- **Lệnh gợi ý:** `/impeccable layout`

### [P3] Hint một-lần theo THIẾT BỊ, không theo NGƯỜI, trên máy trực dùng chung
- **Gì:** `showTabHint` ("Không thấy thuốc trong 8 nhóm? Tìm xuyên tất cả") và thông báo tab-tự-sắp-lại mỗi cái chỉ hiện một lần/thiết bị qua `localStorage` (`TAB_SEARCH_HINT_KEY`, `TAB_REORDER_HINT_KEY`), rồi biến mất mãi mãi.
- **Vì sao quan trọng:** Trên điện thoại phòng bệnh luân phiên nhiều bác sĩ, chỉ người đầu tiên từng biết có tính năng tìm xuyên nhóm hoặc biết hàng tab tự sắp lại. (Phát hiện #5 lượt trước — `showHeaderIconHint` — đã biến mất khỏi codebase cùng đợt gỡ nút header, nhưng khuôn mẫu vẫn còn ở đây.)
- **Sửa:** Nạp lại các hint này sau 30–60 ngày, hoặc làm cho tìm-xuyên-nhóm khả kiến về mặt CẤU TRÚC (một affordance "Tìm mọi nhóm" mờ, luôn hiện trên hàng tab) để không phụ thuộc hint một-lần.
- **Lệnh gợi ý:** `/impeccable onboard`

## Cảnh báo theo persona

**Casey (di động, hay bị ngắt quãng — PERSONA CHÍNH):**
- Hàng tab `scrollWidth 784` vs `clientWidth 375` (2,09×). "Loạn nhịp / Nội môi / Khác / Giải độc" nằm hoàn toàn ngoài màn, chỉ có thanh tiến trình 3px làm gợi ý — tới được "Giải độc" cần vuốt ngang nguyên chiều rộng màn hình.
- Hai chevron-lên giống hệt trong thẻ bệnh nhân: liếc-rồi-chạm để gấp panel trúng nhầm cái khoảng nửa số lần; cái trong tinh vi đủ để đọc như cú chạm chết.
- Mở tìm-xuyên-nhóm để lại **hai ô tìm xếp chồng** ("Tìm thuốc trong mọi nhóm" + "Tìm kháng sinh") — dễ gõ nhầm ô và ra 0 kết quả.

**Sam (trình đọc màn hình / bàn phím / thị lực kém):**
- Nút mở/gấp panel bệnh nhân ngoài: không `aria-expanded`; tên khả truy cập của nút chữ là cả chuỗi sinh hiệu, không có ngữ nghĩa đóng/mở.
- `role="group"` lồng trong `role="tablist"` (cho tab đã ghim) lệch APG, phá việc đếm "tab N / 8".
- IHD/CRRT/SLED/PD không có affordance phi-chữ.
- Điểm đạt: KHÔNG lỗi tương phản ở bất kỳ đâu đo được (tab không chọn 6,7:1, chữ mờ 8,2:1, caption CrCl 7,3:1); sàn input 16px giữ vững; đích chạm 44px xuyên suốt; roving tabindex + Trái/Phải trên hàng tab đúng chuẩn.

**Alex (dùng thành thạo, hiệu quả hàng tab):**
- Tab tự sắp theo tần suất + đóng băng 15 phút thật sự tốt qua một ca — nhưng **ghim là control thủ công DUY NHẤT**, và chỉ với tới được ở chip của tab đang mở hoặc qua danh sách nhảy trong ô tìm (2 bước cho tab ngoài màn). Không kéo-thả sắp lại.
- Thông báo tab-tự-sắp-lại hiện một lần/thiết bị — xoá dữ liệu trình duyệt hoặc đổi máy là mất tín hiệu duy nhất báo rằng vị trí là động.

**Persona dự án suy ra — bác sĩ nội trú trực, 2h sáng, một tay, giữa lúc bị ngắt ("Bs Huy"):**
- Quay lại sau 10 phút gián đoạn: `isPatientStale` hiện "Thông số nhập từ lâu — còn đúng bệnh nhân này không?" (tốt). Nhưng nếu đồng nghiệp vừa dùng điện thoại giữa chừng, bối cảnh vẫn thuộc bệnh nhân sai một cách lặng lẽ cho tới khi anh để ý — banner đổi-từ-tab-khác chỉ bắt sửa cùng-origin, không bắt "bác sĩ khác, cùng phiên".
- Sau "Bệnh nhân mới", panel bung lại đầy đủ (cả hai disclosure con đều mở) — anh phải cuộn qua ~457px nhập liệu để về lại "Chọn kháng sinh".
- Lúc chốt liều phải tự giải "cho 250 / đích 320, thiếu 70 mg" vs "làm tròn lên = 500 mg = 1,56×" — bày ra thành đoạn hổ phách ~40 từ + 2 nút, đúng lúc chú ý mỏng nhất.

## Quan sát phụ

- **[CẦN KIỂM — có thể nâng lên P2]** Assessment B ghi nhận `localStorage["drtrong:disclaimerAck"] = "2026-07"` đã cũ (nay 2026-09) nên màn chắn disclaimer "Trước khi dùng" fade-in lại mỗi lần vào màn; bấm "Tôi đã hiểu" đóng được sheet nhưng **không thấy làm mới timestamp đó trong phiên này**. DungThuocScreen là màn hạ cánh của lối tắt PWA (`?screen=mixing`) — nếu ack thật sự không lưu, thì mỗi lần "cầm điện thoại lúc 2h sáng → tra liều" đều bắt đầu bằng một lần đóng modal. Cần một lượt kiểm nhanh: ack ghi "2026-09" chưa, hay cơ chế là tái-ack hàng tháng có chủ đích (khi đó đóng một lần/tháng là đúng thiết kế).
- Danh sách nhảy dùng cụm chữ thường ("kháng sinh", "thuốc cân bằng nội môi") vs chip tab chữ hoa gọn ("Kháng sinh", "Nội môi") — `t.search`/`categoryLabel` bị tái dùng làm nhãn điều hướng.
- Khối nội dung desktop lệch ≈24px khỏi tâm trong `max-w-[860px] mx-auto` (lề trái 222 vs phải 198 ở 1280px — có lẽ do tính thanh cuộn). Ngưỡng `max-w-[860px]` ngoài ra hoạt động tốt; cả 8 tab vừa màn không cần cuộn ở ≥860px.
- `.dose-press` (scale 0,96, nhả kiểu lò xo) áp cả lên nút warn/danger. Đây là phản hồi chạm đồng nhất, không phải hoa lá cho họ tín hiệu — ranh giới nhưng chấp nhận được; là chỗ DUY NHẤT motion chạm vào họ màu được bảo vệ. `pulse-scale` (vọt 1,56) chỉ trên chip tab đang chọn (chrome — ổn). Có guard `prefers-reduced-motion` cho `confirmRing`/`confirmDrain`/`pulse-scale`.
- Một dòng trích dẫn 12px ("Dựa trên kinh nghiệm lâm sàng tự biên soạn…") có `max-width:none` → 109 ký tự một dòng ở 1280px; là footnote, xuống dòng tốt ở mobile (vắng ở 375px). Mức thấp, phụ thuộc viewport.
- `screen-transition` (fadeSlideIn 0,22s) nay đã có — ngang bằng các màn tab khác.
- `inert` trên màn chắn disclaimer HOẠT ĐỘNG (input cân nặng nền không focus được khi gate mở); gate là bottom sheet, `aria-modal="true"`. Lo ngại a11y trước đây ở đây không còn là vấn đề.
- **Trạng thái đang sửa:** `src/App.tsx` (~56 dòng chưa commit) gỡ ThemeToggle khỏi `ScreenHeader.actions` của DungThuocScreen; header render sạch, chỉ còn 2 nút icon tìm + nhật ký, không phần tử thừa lơ lửng. Riêng: commit `f516701` gỡ nhóm An thần/Thần kinh còn sót dây chết ở `src/App.tsx:12346-12347` + `src/data/index.ts:16-17` (lỗi TS + 2 hook thừa, KHÔNG render — 8 tab đúng). Đã tách thành task dọn code riêng, ngoài phạm vi critique này.

## Câu hỏi gợi mở

1. Nếu bối cảnh bệnh nhân là xương sống màn hình, tại sao nó lại là một thẻ gấp được tranh chỗ theo chiều dọc — thay vì một thanh trạng thái 1 dòng luôn hiện (chạm để sửa) ghim dưới header, để danh sách thuốc luôn ở đầu vùng cuộn?
2. Thẻ liều nói thật về làm tròn (250 vs 320) nhưng bắt bác sĩ tự giải mỗi lần. App có thể ra một lập trường — "khuyến cáo: 250 mg (chấp nhận thiếu 22%)", phương án khác cách một chạm — để đường mặc định là một quyết định đã ra, không phải một tình huống bày ra?
3. Hàng tab rộng 8 mục và tự sắp lại. Bộ cuộn ngang có phải cấu trúc đúng cho điện thoại tại giường không, hay 3–4 nhóm bác sĩ thật sự chạm trong ca này nên là toàn bộ tập nhìn thấy, phần còn lại sau "Nhóm khác"?
4. Hint một-lần trên máy dùng chung chỉ tới đúng một bác sĩ. Cái gì làm cho tìm-xuyên-nhóm khả kiến về CẤU TRÚC (một affordance luôn hiện) để không cần hint?
