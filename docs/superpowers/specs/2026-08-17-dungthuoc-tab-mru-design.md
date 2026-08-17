# Thiết kế: sắp hàng tab DungThuocScreen theo tần suất dùng (P2 của nợ thiết kế 2026-08-17)

Ngày: **2026-08-17**. Trạng thái: đã chốt thiết kế, làm trực tiếp (không qua
subagent-driven-development — việc đủ nhỏ, đúng quy ước đã dùng cho P0/P1/P3 cùng đợt).

Nguồn: mục 15 của `docs/superpowers/HANDOFF.md`, mục P2 —
`.impeccable/critique/2026-08-17T04-00-34Z__src-app-tsx-dungthuocscreen.md`.

---

## 1. Vấn đề

Hàng "Nhóm thuốc" ở `DungThuocScreen` (`src/App.tsx`, gần `MIXING_TABS.map`) có 10 tab, cuộn ngang,
chỉ ~40% vừa màn 375px. Critique P2 chỉ đúng một vế còn thiếu: **"chỉ tab mở gần nhất được nhớ,
không có thứ tự theo tần suất dùng"** — `tab` đã `useStickyState("dungthuoc.tab", ...)` (nhớ tab
đang MỞ giữa các lần rời/quay lại màn), nhưng THỨ TỰ hiển thị của 10 tab trong hàng cuộn thì cố
định theo `MIXING_TABS` (kháng sinh trước, rồi theo `INFUSION_CATEGORIES`) — không đổi theo việc
bạn dùng nhóm nào nhiều. Bác sĩ ICU dùng "Vận mạch" mỗi ca trực vẫn phải cuộn qua đúng số tab như
người mới mở app lần đầu.

**Chip đơn vị liều (6 mục, InfusionCalculator) — RA KHỎI PHẠM VI chặng này.** Đọc
`doseUnitOptions()` (`src/lib/infusion.ts:141`) cho thấy đơn vị gốc của thuốc luôn đứng ĐẦU danh
sách và được chọn sẵn mặc định — người dùng hiếm khi cần cuộn qua 5 chip còn lại, và khi cần thì đó
là tra cứu hiếm, không phải luồng lặp lại nhiều lần trong ca trực như hàng tab. Không sửa.

## 2. Quyết định

Sắp lại THỨ TỰ hiển thị của hàng tab theo số lần đã CHỌN mỗi nhóm, tính giảm dần — không đổi cơ chế
"tab đang mở được nhớ" hiện có, không thêm hàng/nút nào, không đổi cơ chế "Tìm" hay dải mờ báo cuộn.

Ba lựa chọn thiết kế đã cân nhắc, chốt như sau:

| Câu hỏi | Chốt | Vì sao |
|---|---|---|
| Đếm theo phiên hay tích luỹ nhiều ca? | **`localStorage`, tích luỹ vô hạn** | "Tần suất dùng" là thói quen dài hạn (nhiều ca trực), khác `useStickyState` hiện có (dùng `sessionStorage`, chỉ nhớ trong MỘT phiên). Cần key/hàm MỚI, không tái dùng `useStickyState`. |
| Sắp lại NGAY khi bấm, hay đóng băng? | **Đóng băng, tính lại đúng một lần khi `DungThuocScreen` DỰNG** | Sắp lại ngay khi bấm làm tab vừa chạm tự nhảy vị trí — mất phương hướng giữa thao tác. Tính một lần lúc dựng vẫn đủ "tươi": mở lại màn sau một lúc dùng nhiều sẽ thấy thứ tự mới, nhưng KHÔNG nhảy trong lúc đang thao tác. |
| Có tab "neo" cố định (vd luôn giữ Kháng sinh đầu hàng)? | **KHÔNG** — YAGNI | Sort ổn định (stable sort) theo đếm giảm dần; lúc mọi đếm bằng 0 (người dùng mới, hoặc `localStorage` trống/bị chặn) thì thứ tự y hệt `MIXING_TABS` hiện tại — không cần nhánh đặc cách "lần đầu mở app". |
| Đếm ở đâu? | **Mọi lần `setTab` được gọi** (bấm tab trực tiếp VÀ chọn kết quả từ ô Tìm xuyên tab) | Cả hai đều là tín hiệu "người dùng muốn xem nhóm này" — bỏ sót nhánh Tìm sẽ đánh giá thấp tần suất của nhóm hay được tìm hơn là bấm tab. |

## 3. Thiết kế kỹ thuật

**File mới `src/lib/tabUsage.ts`** (thuần, không phụ thuộc React — giống phong cách `uiState.ts`):

```ts
const KEY = "drtrong:tabUsage"

function readCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

export function recordTabUse(id: string): void {
  try {
    const counts = readCounts()
    counts[id] = (counts[id] ?? 0) + 1
    localStorage.setItem(KEY, JSON.stringify(counts))
  } catch {
    // Hết chỗ hoặc trình duyệt chặn: không đếm được thì thôi, không làm gãy luồng đang dùng.
  }
}

// Stable sort giảm dần theo đếm — đếm bằng nhau (kể cả toàn 0) giữ nguyên thứ tự đầu vào.
export function sortByUsage<T extends { id: string }>(items: T[]): T[] {
  const counts = readCounts()
  return [...items]
    .map((item, i) => ({ item, i, count: counts[item.id] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.i - b.i)
    .map((x) => x.item)
}
```

**Trong `DungThuocScreen`:**

```ts
const orderedTabs = useMemo(() => sortByUsage(MIXING_TABS), []) // một lần lúc dựng, xem mục 2
```

Đổi `{MIXING_TABS.map((t) => (...))}` ở hàng tab thành `{orderedTabs.map((t) => (...))}`. Giữ
`MIXING_TABS.map`/`MIXING_TABS.length` nguyên vẹn ở mọi chỗ khác (gợi ý "Tìm", `MIXING_TITLES`,...)
— chỉ đổi thứ tự HIỂN THỊ của đúng hàng cuộn, không đổi nguồn dữ liệu gốc.

Hai nơi gọi `setTab` cần kèm `recordTabUse`:
- Hàng tab (`onClick={() => setTab(t.id)}`, ~dòng 10715 trước lượt sửa này) → `recordTabUse(t.id); setTab(t.id)`.
- Chọn kết quả tìm xuyên tab (`setTab(r.tab)` trong `openSearchResult`, ~dòng 10478) → `recordTabUse(r.tab); setTab(r.tab)`.

## 4. Không làm

- Không đổi `useStickyState("dungthuoc.tab", ...)` — vẫn là cơ chế nhớ tab ĐANG MỞ, độc lập với thứ
  tự hiển thị.
- Không thêm UI mới (không nút "sắp xếp lại", không hiển thị số đếm) — YAGNI, đúng nguyên tắc dự án
  đã áp cho P1-C ("không có danh sách miễn... cơ chế không ai dùng là gánh nặng").
- Không đụng hàng chip đơn vị liều (xem mục 1).
- Không thêm cổng kiểm mới — đây là một hàm thuần nhỏ, kiểm bằng vitest thông thường như mọi hàm
  khác trong `src/lib/`.

## 5. Kiểm chứng

- Ca kiểm đơn vị cho `sortByUsage`: mảng rỗng → rỗng; mọi đếm bằng 0 → giữ nguyên thứ tự đầu vào;
  đếm khác nhau → sắp giảm dần; đếm bằng nhau ở một cặp → giữ thứ tự gốc của cặp đó (stable).
- Ca kiểm cho `recordTabUse`: gọi hai lần cùng id → đếm là 2; `localStorage.setItem` ném lỗi (giả
  lập bị chặn) → không throw ra ngoài.
- Kiểm tay trên trình duyệt: bấm một tab nhiều lần trong `localStorage` (qua console hoặc bấm thật),
  rời màn rồi quay lại → tab đó lên đầu hàng; bấm tab TRONG lúc màn đang mở → hàng KHÔNG nhảy vị trí
  ngay lập tức.
