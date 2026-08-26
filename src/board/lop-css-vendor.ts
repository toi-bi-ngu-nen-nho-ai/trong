// ─── Chặn CSS của cây BlockSuite rò ra toàn app ──────────────────────────────────────────────────
//
// LỖI GỐC (đo thật 2026-08-26, người dùng báo từ iPhone): mở một sơ đồ tư duy rồi thoát ra là toàn
// app hỏng bố cục — DungThuocScreen mất viền/đệm ô nhập, phông nhảy sang Inter — và KHÔNG tự hồi
// phục cho tới khi tải lại trang.
//
// Chuỗi nhân quả đầy đủ:
//   1. Bảng vẽ mở  →  Lit tiêm ~190 thẻ <style> thẳng vào <head> (một thẻ cho mỗi component).
//   2. Trong đó có stylesheet vốn viết CHO SHADOW DOM (nhận ra nhờ có `:host`) chứa luật TRẦN
//      `input { display:flex; flex:1 1 0; padding:0; border:none; font-family:Inter; ... }`.
//      Nằm trong shadow DOM thì luật trần đó vô hại vì chỉ với tới input CỦA CHÍNH component. Bị
//      nhân bản ra document thì nó với tới MỌI <input> của app.
//   3. Tailwind v4 đặt TOÀN BỘ utility vào `@layer utilities`. Luật thác đổ: CSS KHÔNG-LỚP thắng
//      CSS CÓ-LỚP BẤT KỂ ĐỘ ĐẶC HIỆU — nên `input{...}` không-lớp (0,0,1) đè được cả `px-3`/
//      `border`. Đây là lý do hỏng LAN RA TOÀN APP chứ không chỉ màn có bảng vẽ: mọi phần tử ăn
//      class Tailwind đều thua bất kỳ luật trần nào bảng vẽ tiêm ra.
//   4. React tháo component bảng khi rời màn, nhưng thẻ <style> nằm ở <head> — KHÔNG ai gỡ. Hỏng
//      vĩnh viễn tới hết phiên.
//
// CÁCH VÁ: bọc CSS của bảng vào lớp `drt-vendor` (khai ở dòng đầu src/index.css nên ưu tiên THẤP
// NHẤT). Vá ở TẦNG THÁC ĐỔ chứ không đi chữa từng thuộc tính hỏng: kiểu "ép lại padding cho input"
// chỉ chữa đúng triệu chứng hôm nay, lần sau BlockSuite rò một luật trần khác (`button`, `div`…) là
// hỏng lại y hệt. Bọc lớp chặn CẢ HỌ lỗi này.
//
// KHÔNG sửa trong src/vendor/blocksuite/ (luật D11: cây vendored chép nguyên văn thượng nguồn, có
// cổng `npm run kiem:vendor` canh từng byte) — nên phép vá phải nằm hoàn toàn ở phía app.
//
// AN TOÀN VỚI CHÍNH BẢNG VẼ: giao diện bảng dựng bằng shadow DOM (đo thật: 51 shadow root, 0 input
// light-DOM khi bảng đang mở). CSS trong shadow root đi đường `adoptedStyleSheets` RIÊNG chứ không
// phải mấy thẻ <style> ở <head> này — nên hạ ưu tiên bản sao ở document không đổi diện mạo bảng.

const TEN_LOP = 'drt-vendor'

let daBat = false

/**
 * Chỉ bọc thẻ <style> do Lit tiêm lúc chạy, nhận ra bằng "KHÔNG có thuộc tính nào".
 *
 * KHÔNG dùng chữ ký theo NỘI DUNG (`:host` / `--drt-`) như bản đầu — đã thử và HỎNG: chính
 * src/index.css của app cũng chứa cả hai chuỗi đó (nó ghi đè token `--drt-*` để nhuộm bảng vẽ theo
 * chủ đề, và có luật `:host`), nên bộ lọc kiểu đó bọc luôn stylesheet CỦA APP vào lớp ưu tiên thấp
 * nhất — tức tự tay gây đúng loại hỏng mà hàm này sinh ra để ngăn (đo được lúc kiểm: toàn bộ CSS
 * app tụt xuống @layer drt-vendor, ô nhập vẫn hỏng y như chưa vá).
 *
 * Vì sao "không thuộc tính" là mốc đáng tin ở CẢ hai chế độ chạy:
 *   - dev: Vite gắn CSS của app/của gói vendored bằng <style type="text/css" data-vite-dev-id="…">
 *   - prod: Vite phát CSS ra tệp và nạp bằng <link rel="stylesheet">, không phải <style>
 * Còn Lit thì tạo <style> trần rồi append thẳng vào <head>, không gắn thuộc tính nào.
 */
function bocVaoLop(the: HTMLStyleElement): void {
  if (the.attributes.length > 0) return
  const css = the.textContent
  if (!css) return
  // Đã bọc rồi thì thôi — tránh bọc lồng nhiều tầng nếu hàm chạy lại trên cùng một thẻ.
  if (css.startsWith('@layer')) return
  the.textContent = `@layer ${TEN_LOP}{${css}}`
}

/**
 * Bật cơ chế bọc. Gọi TRƯỚC lượt `import()` chunk bảng vẽ (xem ./index.tsx) để bộ theo dõi đã chạy
 * trước khi thẻ <style> đầu tiên của bảng kịp rơi vào <head>.
 *
 * Bộ theo dõi KHÔNG được ngắt sau khi bảng nạp xong: BlockSuite tiêm thêm stylesheet MUỘN, đúng lúc
 * component đó lần đầu được dùng — chính stylesheet gây lỗi `input` thuộc nhóm popup, chỉ xuất hiện
 * sau khi bảng dựng xong (đo được 165 thẻ lúc vừa nạp chunk, 296 thẻ sau khi bảng mở hẳn).
 */
export function batLopCssVendor(): void {
  if (daBat) return
  daBat = true

  // Thẻ đã nằm sẵn trong <head> (ca gọi muộn, hoặc chunk bảng được nạp lại từ cache trình duyệt).
  document.head.querySelectorAll('style').forEach(bocVaoLop)

  // Chỉ theo dõi con TRỰC TIẾP của <head> (không bật `subtree`): Lit gắn thẳng vào <head>, còn việc
  // ta tự ghi `the.textContent` trong bocVaoLop() là thay đổi con của chính thẻ <style> — nằm NGOÀI
  // phạm vi theo dõi này, nên không tạo vòng lặp tự gọi lại.
  new MutationObserver((danhSachThayDoi) => {
    for (const thayDoi of danhSachThayDoi) {
      for (const nut of thayDoi.addedNodes) {
        if (nut instanceof HTMLStyleElement) bocVaoLop(nut)
      }
    }
  }).observe(document.head, { childList: true })
}
