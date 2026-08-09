// ─── Service worker — chạy được khi mất mạng ─────────────────────────────────
//
// Vì sao bắt buộc phải có: app này được cài như PWA và dùng ngay cạnh giường bệnh. Trước khi có
// file này, app có manifest và icon nên CÀI được vào màn hình chính, trông y hệt một app thật —
// nhưng mở ra lúc không có mạng (tầng hầm, khu cách ly, wifi bệnh viện chập chờn, 3G hết dung
// lượng) thì trắng màn hình. Một máy tính liều chỉ dùng được khi có mạng thì không dùng được vào
// đúng lúc cần nhất.
//
// Toàn bộ dữ liệu thuốc nằm trong bundle JS (không gọi API), và mọi thứ người dùng tự nhập nằm
// trong localStorage/IndexedDB — nên chỉ cần cache được phần tĩnh là app chạy đủ 100% offline.

// Đổi số này mỗi lần muốn ép làm mới toàn bộ cache.
// v2: icon-192/icon-512 đổi từ ảnh clipart cũ sang logo thật của app — máy đã cài trước đó vẫn giữ
// icon cũ trong cache mãi mãi nếu không đổi số này (chiến lược fetch bên dưới ưu tiên cache).
const CACHE = "drtrong-v2"

// Vỏ app — những thứ phải có mặt để mở được màn hình đầu tiên.
const SHELL = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    // addAll() thất bại toàn bộ nếu MỘT mục lỗi, nên thêm từng mục một: thiếu một icon không được
    // phép làm hỏng khả năng offline của cả app.
    caches.open(CACHE).then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})))),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Cho phép trang chủ động yêu cầu bản mới thay thế ngay (xem nút "Tải lại" trong app).
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting()
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Điều hướng (mở app): ưu tiên mạng để nhận bản mới, nhưng mất mạng thì trả về vỏ app đã cache
  // — đây chính là chỗ trước đây trắng màn hình.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put("/index.html", copy))
          return res
        })
        .catch(() => caches.match("/index.html").then((r) => r || caches.match("/"))),
    )
    return
  }

  // Tài nguyên tĩnh (JS/CSS/ảnh): lấy từ cache trước cho nhanh và chắc chắn chạy được offline, đồng
  // thời tải bản mới về nền cho lần mở sau.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
