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

function read<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// Giống useState, nhưng giá trị sống sót qua việc chuyển màn hình. `key` phải là duy nhất trong
// toàn app (thêm hậu tố khi cùng một component được dựng nhiều lần, vd theo từng nhóm thuốc).
export function useStickyState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => read(key, initial))
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
