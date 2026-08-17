// ─── Giữ lại chỗ đang đứng khi rời màn hình rồi quay lại ──────────────────────
//
// App vẽ mỗi màn bằng một nhánh `screen === "..."` nên rời màn hình là component bị gỡ khỏi cây,
// kéo theo toàn bộ state cục bộ. Hệ quả trên thực tế: đang mở tab "Vận mạch", chọn Noradrenaline,
// nhảy sang Mindmap tra một thứ rồi bấm về — màn Dùng thuốc mở lại ở tab "Kháng sinh", chưa chọn
// thuốc nào, phải bấm lại từ đầu. Giữa ca trực thì đó là lỗi thật, không phải chuyện thẩm mỹ.
//
// Dùng sessionStorage chứ không phải localStorage: chỗ đang đứng chỉ có nghĩa trong phiên làm việc
// hiện tại. Mở app vào ca sau mà vẫn thấy thuốc của bệnh nhân hôm trước đang mở sẵn thì còn khó
// chịu hơn — và dễ đọc nhầm hơn — là mở lại từ đầu.

import { useCallback, useState } from "react"

const PREFIX = "drtrong:ui:"

// Xuất công khai để kiểm được trực tiếp bất biến "hai khoá khác nhau không đè nhau" mà
// useStickyState dựa vào (vd InfusionCalculator khoá theo drug.id) — không phải hàm dựng riêng cho
// test, chỉ là cùng hàm nội bộ mà useStickyState/writeStickyState đã dùng từ trước.
export function readStickyState<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// Ghi thẳng một giá trị sticky TỪ BÊN NGOÀI component đang giữ nó.
//
// Dùng cho đúng một việc: ô tìm kiếm chung của màn "Dùng thuốc" cần mở sẵn một thuốc nằm ở tab
// KHÁC. Tab đó chưa được dựng nên không thể gọi setter của nó; nhưng vì `useStickyState` đọc
// sessionStorage ngay ở lần dựng đầu tiên, chỉ cần đặt sẵn giá trị trước rồi mới đổi tab là component
// mới dựng lên sẽ mở đúng chỗ. Đổi tab luôn dựng lại cây con (khối vẽ tab mang `key` theo tab) nên
// điều kiện này luôn đúng.
export function writeStickyState<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Giống nhánh lỗi trong useStickyState: không nhớ được thì thôi, không làm gãy luồng đang dùng.
  }
}

// Giống useState, nhưng giá trị sống sót qua việc chuyển màn hình. `key` phải là duy nhất trong
// toàn app (thêm hậu tố khi cùng một component được dựng nhiều lần, vd theo từng nhóm thuốc).
export function useStickyState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => readStickyState(key, initial))
  const set = useCallback(
    (next: T) => {
      setValue(next)
      try {
        sessionStorage.setItem(PREFIX + key, JSON.stringify(next))
      } catch {
        // Hết chỗ hoặc trình duyệt chặn: phiên này vẫn chạy bình thường, chỉ là không nhớ được.
      }
    },
    [key],
  )
  return [value, set]
}
