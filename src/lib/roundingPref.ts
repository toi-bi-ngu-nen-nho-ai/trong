// ─── Công tắc "Làm tròn lên" ──────────────────────────────────────────────────
//
// Khi không có bậc nào (số lọ, mốc mL) rơi đúng vào khoảng liều tính được, app phải chọn một trong
// hai chiều — và cả hai đều có lý, không có đáp án đúng duy nhất:
//   - LÊN (mặc định): đủ liều chắc chắn, phần dư rút bớt dịch pha ra được. Nhưng có lúc dư rất
//     nhiều (cần 525 mg, ống 500 mg → 2 ống = 1000 mg, gấp 1,9 lần).
//   - XUỐNG: lấy đúng bậc dễ đong nhất, chấp nhận thiếu một chút so với con số tính ra.
// Trước đây app ép cứng chiều LÊN ở mọi phép làm tròn mà không nói gì, nên những con số như "1000 mg"
// hay "150 mL" nhảy ra không rõ vì đâu. Giờ chiều lên vẫn là mặc định, nhưng người dùng tắt được.
//
// Vì sao TOÀN APP chứ không phải theo từng thuốc: đây là một lựa chọn về CÁCH LÀM VIỆC của người
// dùng (thà dư cho chắc, hay thà ít cho an toàn), không phải một thuộc tính của thuốc — bắt bật/tắt
// lại cho từng thuốc là bắt lặp lại cùng một quyết định hàng chục lần. Vì sao localStorage chứ không
// phải sessionStorage như useStickyState: cùng lý do — đây là thói quen làm việc, không phải "chỗ
// đang đứng" của một phiên.
//
// TẮT công tắc = người dùng đã CHỦ ĐỘNG nhận trách nhiệm về liều thấp hơn khoảng khuyến cáo, nên
// những chỗ hiển thị phải TẮT luôn cảnh báo "dưới liều tối thiểu" — cảnh báo lặp lại đúng cái người
// dùng vừa tự chọn là cách nhanh nhất khiến họ học thói quen bỏ qua mọi cảnh báo.

import { useCallback, useSyncExternalStore } from "react"

const KEY = "drtrong:roundUp"

function read(): boolean {
  try {
    // Chỉ chuỗi "false" mới tắt — thiếu khoá, hỏng dữ liệu, hay trình duyệt chặn localStorage đều
    // rơi về BẬT, đúng mặc định an toàn về liều.
    return localStorage.getItem(KEY) !== "false"
  } catch {
    return true
  }
}

let value = read()
const listeners = new Set<() => void>()

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Công tắc nằm ở thẻ thuốc, nhưng bảng pha thuốc bên trong thẻ đó cũng đọc cùng giá trị — dùng chung
// một store thay vì hai useState song song để hai nơi không bao giờ hiện hai con số theo hai chính
// sách làm tròn khác nhau trên cùng một màn hình.
export function setRoundUp(next: boolean): void {
  if (next === value) return
  value = next
  try {
    localStorage.setItem(KEY, String(next))
  } catch {
    // Không lưu được thì phiên này vẫn theo đúng lựa chọn, chỉ là lần mở sau quay về mặc định.
  }
  for (const fn of listeners) fn()
}

export function getRoundUp(): boolean {
  return value
}

export function useRoundUp(): [boolean, (next: boolean) => void] {
  const on = useSyncExternalStore(subscribe, getRoundUp, getRoundUp)
  const set = useCallback((next: boolean) => setRoundUp(next), [])
  return [on, set]
}
