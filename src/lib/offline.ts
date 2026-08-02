// ─── Đăng ký service worker + phát hiện bản cập nhật ─────────────────────────
//
// Xem public/sw.js để biết vì sao app này bắt buộc phải chạy được offline.
//
// Phần "có bản cập nhật" không phải để cho đẹp: dữ liệu thuốc nằm trong bundle JS, nên một máy đã
// cài app và luôn chạy từ cache có thể dùng bảng liều CŨ nhiều tuần mà không biết. Với app tra liều
// thì đó là rủi ro thật, nên khi có bản mới phải nói ra chứ không im lặng chờ tới lần mở sau.

export const SW_UPDATE_EVENT = "drtrong:sw-update"

let waitingWorker: ServiceWorker | null = null

function announceUpdate(worker: ServiceWorker) {
  waitingWorker = worker
  window.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT))
}

// Nạp bản mới: bảo service worker đang chờ nhận quyền, rồi tải lại trang một lần khi nó đã tiếp quản.
export function applyUpdate(): void {
  if (!waitingWorker) {
    window.location.reload()
    return
  }
  let reloaded = false
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloaded) return
    reloaded = true
    window.location.reload()
  })
  waitingWorker.postMessage("skip-waiting")
}

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return
  // Ở chế độ dev, service worker cache module của Vite làm hot reload chạy sai — chỉ bật ở bản build.
  if (!import.meta.env.PROD) return

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Đã có bản mới nằm chờ sẵn từ lần mở trước.
        if (reg.waiting) announceUpdate(reg.waiting)

        reg.addEventListener("updatefound", () => {
          const next = reg.installing
          if (!next) return
          next.addEventListener("statechange", () => {
            // `controller` tồn tại nghĩa là đây là bản CẬP NHẬT, không phải lần cài đầu tiên (lần
            // đầu thì không có gì để báo — người dùng đang xem đúng bản mới nhất rồi).
            if (next.state === "installed" && navigator.serviceWorker.controller) announceUpdate(next)
          })
        })
      })
      .catch(() => {
        // Không đăng ký được (trình duyệt chặn, chạy qua http không phải localhost): app vẫn dùng
        // được bình thường khi có mạng, chỉ mất khả năng offline.
      })
  })
}
