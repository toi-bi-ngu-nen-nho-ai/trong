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

// Đổi số này mỗi lần muốn ép làm mới toàn bộ cache — BẮT BUỘC mỗi khi đổi bundle JS/CSS, không chỉ
// lúc đổi asset tĩnh (icon): chiến lược fetch bên dưới phát bản JS/CSS CŨ TRONG CACHE trước rồi mới
// âm thầm tải bản mới về nền, nên nếu không đổi số này, máy đã từng mở app (đã cache "v2") sẽ tiếp
// tục thấy đúng bản JS lúc đó mãi — kể cả khi server đã có bản mới từ lâu.
// v2: icon-192/icon-512 đổi từ ảnh clipart cũ sang logo thật của app.
// v3: thêm cơ chế đo --vvh (sau đó xác nhận không sửa được lỗi, gây thêm lỗi bàn phím, đã revert).
// v4: revert --vvh (quay lại inset:0) + thêm ViewportDebugPanel tạm thời để đo số liệu thật.
// v5: thêm vạch đỏ thử compositing vùng padding-bottom của nav.
// v6: NGUYÊN NHÂN GỐC của khoảng trống đáy màn hình iPhone — bỏ meta `black-translucent`
//     (xem index.html), và theme-color thôi ghi cứng màu teal chết trong theme.ts.
// v7: dọn hết ViewportDebugPanel/vạch đỏ thử nghiệm; bớt đệm 6px thừa trên đầu (không còn cần
//     che thanh trạng thái từ khi bỏ black-translucent).
// v8: sửa lệch hàng nút chủ đề/chuyên khoa với tiêu đề (do bỏ đệm 6px ở v7); mở vòng focus "ôm sát"
//     của ô tìm kiếm (trước chỉ có ở màn Dùng thuốc) ra mọi ô tìm trong app.
// v9: icon-192/icon-512/apple-touch-icon đổi ảnh (commit "Sửa icon") nhưng quên bump số này — máy
//     đã cài PWA/mở app trước đó kẹt icon cũ vĩnh viễn vì fetch ưu tiên cache. Bump để ép nạp lại.
// v10: dịch nốt toolbar bảng vẽ còn tiếng Anh (Select/Pen/Hand/Highlighter/Curve/Elbowed/Straight)
//      — bump để máy đã cài PWA từ trước không kẹt lại bundle cũ còn tiếng Anh.
// v11: vá hai lỗ hổng thác đổ CSS BlockSuite ↔ Tailwind (nhãn nút "Trang chủ" lệch khỏi hàng sau
//      khi vào-ra bảng vẽ; menu "⋯"/"Khung" mất sạch padding nên chữ dán mép trái màn hình). Sửa
//      nằm hoàn toàn trong src/index.css — đúng loại thay đổi mà comment đầu file cảnh báo: không
//      bump thì máy đã cài PWA vẫn phát bản CSS CŨ trong cache, người dùng không thấy gì đổi.
// v12: cầu nối token thương hiệu vào bảng vẽ (src/board/cau-noi-thuong-hieu.css) — màu chọn/thanh công cụ
//      đổi từ xanh AFFiNE sang magenta Mindmap. CSS mới nằm trong chunk bảng vẽ; không bump thì máy đã
//      cài PWA vẫn phát chunk CŨ và không thấy gì đổi.
// v13: mục "Xuất PNG" tắt kèm lý do cho bảng chưa mở (P2) + gom công thức vùng an toàn đáy màn
//      hình về --nav-h/--above-nav/--above-safe (P3) — đổi cả CSS lẫn JS, bắt buộc bump.
// v14 (1678c22) và v15 (f67e0ea): bump đúng lúc nhưng KHÔNG kèm dòng ghi ở đây — v14 thuộc lượt
//      "trả 4 nợ vặt mục 6", v15 thuộc lượt cài bàn phím ảo iOS hướng B (đã gỡ lại, HANDOFF mục 37).
//      Ghi bù lại để dãy số không có lỗ hổng không giải thích được.
// v16: gỡ hướng B bàn phím ảo + vá lệch toạ độ chạm sau hiệu ứng vào màn (HANDOFF mục 37-38), và
//      bốn khoản critique 2026-08-29 của Board Gallery (ô đổi tên chọn sẵn, ô "+" lên đầu lưới,
//      trạng thái rỗng-do-lọc mời gỡ lọc, màu placeholder + mặt giấy cho ô "+"). Đổi cả CSS lẫn JS.
// v17: vá lần hai cho màu placeholder — bản v16 dùng --c-text-muted vẫn để bản sáng ở 4,12:1
//      (con số 4,89:1 của báo cáo đo trên nền thẻ trắng, không phải nền pill). Nay là token riêng
//      --c-text-placeholder. Bump vì v16 ĐÃ được đẩy lên trước khi phát hiện: máy nào kịp lấy v16
//      sẽ giữ bản CSS thiếu đó vĩnh viễn nếu không đổi số.
// v18: năm khoản sửa lỗi chủ dự án báo 2026-09-04. Bắt buộc bump vì đợt này đổi CẢ index.html —
//      file nằm ngay trong SHELL bên dưới, tức là thứ máy đã cài PWA phát thẳng từ cache. Khoản
//      nặng nhất nằm đúng ở đó: một script nội tuyến trong <head> phân giải chủ đề TRƯỚC lần vẽ đầu
//      để thanh trạng thái iPhone không còn lệch pha với nền web lúc trang tải chậm. Không bump thì
//      máy đã cài PWA giữ nguyên bản index.html cũ — tức giữ nguyên đúng cái lỗi vừa vá.
//      Bốn khoản còn lại (bỏ nút chủ đề ở Dùng thuốc; khung hẹp kéo công cụ về bàn tay; viền hai
//      nút tròn của Sơ đồ đổi từ magenta sang --c-line; icon "chưa gắn chuyên khoa" thành bóng đèn
//      + bút chì + bánh răng, có line-drawing) đều nằm trong bundle JS/CSS.
// v19: dọn phần sót của f516701 ("xóa nhóm thuốc An thần + Thần kinh") — hai lời gọi
//      `useLocalCollection` mồ côi trong App.tsx (3 lỗi tsc), hai module dữ liệu không còn ai đọc,
//      và phép lọc tab đã lưu trỏ vào nhóm vừa bị gỡ. Chính chỗ cuối là lý do PHẢI bump: máy đang
//      mở app ở tab "An thần" khi bản mới về sẽ giữ nguyên tab đó trong sessionStorage; bundle cũ
//      trong cache thì màn hiện nửa vời (tiêu đề rỗng, không tab nào sáng) mãi.
const CACHE = "drtrong-v19"

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
