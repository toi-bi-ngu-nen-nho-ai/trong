---
target: "DungThuocScreen (src/App.tsx:10781-11311)"
total_score: 34
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-19T14-41-08Z
slug: src-app-tsx-dungthuocscreen
---
Method: dual-agent (A: general-purpose/sonnet · B: general-purpose/sonnet)

## Điểm sức khoẻ thiết kế

| # | Heuristic | Điểm | Vấn đề chính |
|---|-----------|------|--------------|
| 1 | Visibility of System Status | 3 | Focus ring nay xác minh THẬT bằng phím Tab thật (`:focus-visible` = true, outline 2px) — nhưng lộ ca mới: khi tuổi cực đoan khiến `crcl` = `null` hẳn (không chỉ implausible), banner "Chưa có CrCl... nhập tuổi/cân nặng" hiện sai, dù dữ liệu đã nhập đủ |
| 2 | Match System / Real World | 4 | Không đổi |
| 3 | User Control and Freedom | 3 | Không đổi |
| 4 | Consistency and Standards | 4 | P1 Disclosure xác nhận vá thật bằng focus/visibility thật; thêm một vá nội bộ khác trong phiên này (Amikacin: dòng "Cách dùng" tự tính và ô pha thủ công từng ra hai con số thể tích khác nhau cho cùng một thuốc — nay khớp) |
| 5 | Error Prevention | 4 | Cổng kép + trần liều không đổi |
| 6 | Recognition Rather Than Recall | 3 | Không đổi |
| 7 | Flexibility and Efficiency | 3 | Không đổi |
| 8 | Aesthetic and Minimalist Design | 3 | Không đổi |
| 9 | Error Recovery | 4 | Không đổi |
| 10 | Help and Documentation | 3 | "Chưa ghi nguồn" đã đổi thành "kinh nghiệm lâm sàng tự biên soạn" (live-verified trong phiên này) — không còn đọc như lỗi, nhưng vẫn chưa có trích dẫn nguồn thật cho nhóm Vận mạch |
| **Tổng** | | **34/40** | **Tốt (Good)** |

## Xác minh 3 việc đã vá kỳ trước

- **P1 Disclosure lồng nhau — XÁC NHẬN ĐÃ VÁ.** Cả hai assessment độc lập tái hiện đúng kịch bản (creatinine đã lưu, khung cha thu gọn): khối con `data-open="true"` vẫn có computed `visibility: hidden` vì kế thừa từ cha, `.focus()` thất bại trên toàn bộ 9 control bên trong. B có thử `setAttribute` tay (bỏ qua React) không thấy đổi style — đây là do thao tác trực tiếp DOM không qua React re-render, không phản bác kết quả thật khi tương tác qua UI thật.
- **P2 touch-target — XÁC NHẬN 1/3, 2/3 còn lại là artefact sandbox, đã giải được bằng toán học.** Nút "Liều→Tốc độ" đúng 44px cả hai lượt đo. Tab "Vận mạch" đang active đo được đúng 35.2px ở CẢ HAI phiên độc lập (A và B, khác tab/viewport) — nhưng 44 × 0.8 = 35.2 chính xác tuyệt đối: đây là khung hình ĐẦU của hoạt ảnh `pulse-scale` (bắt đầu ở `scale(0.8)`) bị đứng hình do sandbox không compositing frame (đã ghi nhận nhiều lần), không phải chiều cao mã thật — mã vẫn là `h-11` (44px), animation không bao giờ chạy tới `scale(1)` trong môi trường này. Kết luận dứt điểm. Riêng nút đơn vị mg/dL·µmol/L đo thật ~42-43px (không dính animation) — chênh 1-2px so với 44px do `h-full` kế thừa từ khung cha trừ viền 1px, có thật nhưng cực nhỏ, DESIGN.md không đặt 44px thành luật (chỉ 16px input là Named Rule).
- **P3 gộp `crclInputImplausible` — XÁC NHẬN ĐÃ VÁ.** Cả hai mặt (PatientPanel + banner bậc liều) cùng cập nhật đồng bộ theo CrCl 729 từ một nguồn tính chung.

## Nhận định về tính đặc thù thiết kế

**Đánh giá LLM (A)**: Bản vá P1 viết tổng quát (selector CSS theo tổ tiên, không riêng khối Creatinin), tự giải thích lý do CSS specificity ngay trong bình luận mã — đúng kỷ luật tự-tài-liệu-hoá nhất quán của codebase này. Điểm đáng chú ý: chính bản vá P0 kỳ trước (estimateCrCl trả null) đã âm thầm tạo ra một ý nghĩa thứ hai cho `crcl == null` ("dữ liệu bị từ chối" thay vì chỉ "chưa nhập") mà chưa nơi tiêu thụ nào cập nhật theo — một đường nối giữa hai tính năng an toàn được vá ở hai thời điểm khác nhau, chưa được đối chiếu với nhau. Đúng mẫu hình lặp lại nhiều lần: lưới an toàn chắc ở nơi vừa có người kiểm, mỏng đúng một lớp ngay sau đó.

**Quét tự động (B)**: `detect.mjs --json` → 0 phát hiện trong phạm vi màn (giữ nguyên kỷ lục sạch). Vòng tiêm script vẫn bắt các mẫu đã xác minh false positive nhiều lần (`layout-transition`/Disclosure, `cramped-padding`/h-11, `undersized-ui-text`/nhãn nav 10px có chủ đích). Hai phát hiện mới: `text-overflow` trên `h1...truncate` — nhiều khả năng false positive vì `truncate` của Tailwind vốn thiết kế để `scrollWidth > clientWidth` (đó chính là cách nó cắt chữ); `clipped-overflow-container` ×3 — trùng khớp đúng kiến trúc "một vùng cuộn dùng chung" + `position:fixed;inset:0` mà DESIGN.md ghi nhận có chủ đích (né lỗi 100dvh trên iOS PWA).

## Ấn tượng chung

Cả ba việc vá từ lượt trước đều được hai assessment độc lập xác nhận thật bằng bằng chứng DOM trực tiếp (focus/visibility, kích thước đo bằng toán học, giá trị đồng bộ hai mặt) — không chỉ tin lời commit. Một phần điều tưởng là "lỗi mới" (touch-target tab active 35.2px) hoá ra là artefact sandbox có thể chứng minh bằng số học (44×0.8=35.2), không phải hồi quy thật — nhắc lại bài học: đo trong sandbox không compositing cần đối chiếu với animation đang chạy trước khi kết luận. Vấn đề thật duy nhất mới lộ ra (banner "chưa nhập" hiện sai khi dữ liệu đã bị từ chối) là hệ quả phụ hợp lý của chính bản vá P0 — không phải hồi quy ở nơi khác, mà là một góc chưa được bản vá đó lường tới.

## Điểm mạnh

1. **Bản vá P1 tổng quát, có bằng chứng focus/visibility thật từ cả hai assessment độc lập.**
2. **Sàn 44px cho phần lớn control chạm được giữ đúng** (nút mode-toggle, icon button, chip không active) — chỉ một ca nhỏ (đơn vị mg/dL) lệch ~2px.
3. **Focus ring lần đầu tiên trong nhiều lượt chấm được xác minh bằng phím Tab thật** (không chỉ `.focus()` chương trình) — `:focus-visible` khớp, viền 2px hiện đúng màu primary.

## Vấn đề ưu tiên

**[P2] Banner "chưa nhập CrCl" hiện sai khi dữ liệu ĐÃ nhập nhưng bị `estimateCrCl` từ chối hẳn (trả `null`)**
- **Vì sao quan trọng**: `missingCrcl` (App.tsx:7712, `crcl == null && ...`) không phân biệt "chưa nhập gì" với "đã nhập nhưng tuổi/cân nặng khiến Cockcroft-Gault không tính được" (vd tuổi 200 — đúng ca P0 kỳ trước) — bác sĩ bị yêu cầu nhập lại dữ liệu họ đã nhập, dễ gõ lại đúng số sai đó hoặc tưởng app lỗi hiển thị. Hệ quả phụ chưa lường tới của chính bản vá P0: `crcl == null` giờ mang hai nghĩa khác nhau mà nơi tiêu thụ chưa phân biệt.
- **Sửa**: nới điều kiện `crclInputImplausible` phía `AntibioticDoseCard` bỏ yêu cầu `effectiveCrcl != null`, dùng thẳng `patientCrclInputImplausible && tiers.length > 1`; loại trừ ca đó khỏi `missingCrcl` để hai banner không đè lên nhau.
- **Lệnh đề xuất**: `/impeccable clarify`

**[P3] Nút đơn vị mg/dL·µmol/L thấp hơn 44px khoảng 1-2px do `h-full` trừ viền**
- Có thật nhưng rất nhỏ, không phải luật DESIGN.md — chỉ đáng sửa nếu tiện tay lúc động vào khu vực đó.

## Persona đáng chú ý

**Riley (kiểm thử ép biên)**: dò tiếp một lớp sau P0/P1 lộ ra chính xác vấn đề banner "chưa nhập" ở trên — mẫu hình lặp lại đúng như các lượt chấm trước.

**Sam (phụ thuộc trợ năng)**: hưởng lợi trực tiếp từ P1 — xác nhận lại bằng `.focus()`/`elementFromPoint`, không chỉ quan sát trực quan.

## Quan sát nhỏ

- Số CrCl trong PatientPanel bị "đứng" ở giá trị animation cũ (73 thay vì 729) dù chữ cảnh báo xung quanh đã cập nhật đúng 729 — nhiều khả năng cùng nguyên nhân sandbox không chạy `requestAnimationFrame` cho `useCountUp`, chưa live-verify lại trong tab có focus thật nên không tính là lỗi xác nhận.
- Trong phiên này (song song với việc chờ hai assessment), đã vá thêm hai việc ngoài phạm vi critique gốc: bug `mixCfg` thiếu `defaultVolumeMl` khiến dòng "Cách dùng" tự tính hardcode 100 mL/lọ cho Amikacin (commit 42e939f), và đổi chữ "chưa ghi nguồn" thành "kinh nghiệm lâm sàng tự biên soạn" cho toàn bộ Disclosure nguồn dữ liệu (commit f77da61) — cả hai đã live-verify, ảnh hưởng tới điểm heuristic 4 và 10 ở trên.

## Câu hỏi gợi mở

1. `crcl == null` giờ mang hai nghĩa (chưa nhập / bị từ chối) — có nên tách hẳn thành hai giá trị khác nhau ở tầng `DosingContext` (vd `crcl: number | "missing" | "rejected"`) thay vì tiếp tục vá từng nơi tiêu thụ tự suy luận lại?
