// Rung phản hồi rất ngắn cho các thao tác kiểu "qua một nấc" (cuộn danh sách chuyên khoa, lật thẻ...).
// Chạy hoàn toàn trên máy, không xin quyền gì.
//
// Vấn đề: navigator.vibrate KHÔNG tồn tại trên Safari/iOS, nên trên iPhone — máy chính của app này —
// cách thông thường không có tác dụng nào. Cách duy nhất hiện có trên web iOS là dựa vào phản hồi
// haptic mà chính iOS phát ra khi giá trị của `<input type="checkbox" switch>` (iOS 17.4 trở lên)
// thay đổi: tạo sẵn một cái ẩn rồi click bằng code mỗi lần cần một nhịp.
//
// Lưu ý: đây là mẹo dựa vào hành vi của hệ điều hành, Apple có thể đổi bất cứ lúc nào; nếu không
// hoạt động thì app vẫn chạy bình thường, chỉ là không có rung.

let iosTickSwitch: HTMLInputElement | null = null

function getIosTickSwitch(): HTMLInputElement | null {
  if (typeof document === "undefined" || !document.body) return null
  if (iosTickSwitch?.isConnected) return iosTickSwitch
  const el = document.createElement("input")
  el.type = "checkbox"
  // Thuộc tính `switch` là thứ khiến iOS vẽ nó thành công tắc VÀ phát haptic khi đổi giá trị.
  el.setAttribute("switch", "")
  el.setAttribute("aria-hidden", "true")
  el.tabIndex = -1
  el.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none"
  document.body.appendChild(el)
  iosTickSwitch = el
  return el
}

// Một nhịp rung cực ngắn — dùng khi con trỏ/lựa chọn nhảy qua một mục trong danh sách.
export function tickHaptic(): void {
  try {
    // Android / Chrome: có API thật thì dùng, vibrate() trả về false nếu bị hệ thống chặn.
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      if (navigator.vibrate(8)) return
    }
  } catch {
    // rơi xuống nhánh iOS bên dưới
  }
  const sw = getIosTickSwitch()
  if (!sw) return
  try {
    sw.click()
  } catch {
    // Không rung được thì bỏ qua, không ảnh hưởng thao tác đang làm.
  }
}
