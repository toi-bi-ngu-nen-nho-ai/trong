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

// ─── HAI lớp, không phải một ────────────────────────────────────────────────────────────────────
//
// Bản đầu chỉ có MỘT lớp `drt-vendor` khai ở dòng đầu index.css, tức ưu tiên THẤP NHẤT — thấp hơn
// cả `@layer base` của Tailwind. Nhưng preflight của Tailwind v4 nằm ĐÚNG trong lớp `base` đó, và
// nó khai `*, ::before, ::after { margin: 0; padding: 0; border: 0 solid }`. Luật thác đổ: lớp cao
// thắng lớp thấp BẤT KỂ độ đặc hiệu — nên `*{padding:0}` (0,0,0) của preflight đè
// `.drt-code-block-container{padding:32px 20px}` (0,1,0) của BlockSuite.
//
// Hệ quả đo thật (2026-08-31, người dùng báo trên PC/iPad): MỌI padding của khối trên bảng vẽ bị
// xoá — Khối mã dẹp còn một dòng cao 20px, Trích dẫn mất lề trái, "hiển thị lệch hoàn toàn". Đo
// trên trình duyệt thật: gỡ chuỗi `@layer drt-vendor{` khỏi đúng thẻ <style> của khối mã là
// `getComputedStyle(...).padding` nhảy từ `0px` về `32px 20px` ngay lập tức.
//
// Vì sao KHÔNG chỉ đơn giản nâng lớp cũ lên trên `base`: làm thế thì luật TRẦN `input{...}` — đúng
// thứ gây lỗi 2026-08-26 — cũng leo lên theo và lại đè `input{font: inherit}` của preflight, tức
// tái phát nửa lỗi cũ (phông app nhảy sang Inter sau khi mở bảng).
//
// Nên: TÁCH LÀM HAI, phân loại theo BỘ CHỌN chứ không theo nguồn gốc thẻ.
//   - `drt-vendor-tran` — thấp nhất, dưới cả `base`. Dành cho stylesheet có ít nhất một bộ chọn
//     PHẦN TỬ HTML TRẦN (`input`, `svg`, `span`, `*`, `body`…). Đây là loại DUY NHẤT với tới được
//     DOM của app, nên giữ nguyên cách xử lý cũ.
//   - `drt-vendor` — nằm giữa `base` và `components`. Dành cho phần còn lại: bộ chọn neo vào class
//     `.drt-*` hoặc custom element (`drt-code`, `rich-text`, `v-line`…). Những bộ chọn này KHÔNG
//     THỂ khớp phần tử nào của app (app không dùng tên thẻ có gạch nối, không dùng class `.drt-*`),
//     nên cho chúng thắng preflight là an toàn — mà vẫn thua `components`/`utilities`, tức mọi
//     utility Tailwind của app vẫn giữ quyền quyết định cuối.
//
// Đo trên bảng vẽ thật lúc soạn phép vá này: 124/132 stylesheet vào lớp cao, 8 vào lớp thấp (8 thẻ
// đó chứa `input`, `input:focus`, `input::placeholder`, `span`, `svg` trần).
//
// HỎNG THÌ ĐÓNG: mọi trường hợp không chắc đều rơi về lớp THẤP (hành vi cũ, đã biết là an toàn cho
// app). Cái giá của một dương tính giả chỉ là "một thẻ style của bảng vẽ mất padding" — nhìn thấy
// được; cái giá của âm tính giả là "CSS vendor rò ra toàn app" — chính là lỗi đang muốn ngăn.
export const LOP_CAO = 'drt-vendor'
export const LOP_THAP = 'drt-vendor-tran'

let daBat = false

/** Bỏ mọi chú thích CSS để không bắt nhầm bộ chọn nằm trong chú thích. */
function boChuThich(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/**
 * Bỏ mọi lớp giả và phần tử giả (kể cả loại có đối số như `:has(...)`, `:not(...)`), lặp tới khi
 * không còn gì để bỏ — `:not(:first-child)` cần hai lượt.
 */
function boGiaTao(sel: string): string {
  let nay = sel
  let truoc: string
  do {
    truoc = nay
    nay = nay.replace(/::?[A-Za-z-]+(\([^()]*\))?/g, '')
  } while (nay !== truoc)
  return nay
}

/**
 * Một bộ chọn là NGUY HIỂM khi nó có thể khớp phần tử của app, tức khi phần còn lại sau khi bỏ
 * lớp/phần tử giả KHÔNG chứa dấu neo nào: không `.class`, không `#id`, không `[attr]`, và không
 * tên thẻ có gạch nối (custom element).
 *
 * Ba ngoại lệ đã đo được trên cây thật, đều là dương tính giả nếu không xử lý riêng:
 *   - bắt đầu bằng `&` — bộ chọn LỒNG, đã được luật cha neo sẵn; luật cha được xét riêng.
 *   - chứa `:host` — chỉ khớp shadow host khi stylesheet nằm TRONG shadow root. Bản sao rơi ra
 *     document không khớp gì cả, nên vô hại (dù 2 trong 8 thẻ nguy hiểm cũng có `:host` — chúng bị
 *     xếp lớp thấp vì luật `input` trần đi kèm, không phải vì `:host`).
 *   - `from` / `to` / `0%` … — bộ chọn KHUNG HÌNH của `@keyframes`, không phải bộ chọn phần tử.
 *     Xử lý ở `quetBoChonNguyHiem` bằng cách bỏ qua thân `@keyframes`.
 */
function selNguyHiem(sel: string): boolean {
  const t = sel.trim()
  if (!t || t.startsWith('&')) return false
  if (/:host\b/.test(t)) return false
  const con = boGiaTao(t)
  if (/[.#[]/.test(con)) return false
  if (/[A-Za-z][A-Za-z0-9]*-[A-Za-z0-9-]*/.test(con)) return false
  return true
}

/**
 * Quét văn bản CSS, trả về danh sách bộ chọn nguy hiểm.
 *
 * Tự duyệt ký tự thay vì dùng CSSOM (`the.sheet.cssRules`) vì hai lý do: (1) hàm này phải chạy
 * được TRƯỚC khi thẻ vào document, để ca kiểm gọi thẳng vào được mà không cần dựng DOM; (2) CSSOM
 * của happy-dom không phân tích được CSS lồng (`& svg { … }`) — dựa vào nó là đo sai ngay ở ca kiểm.
 */
function quetBoChonNguyHiem(css: string): string[] {
  const van = boChuThich(css)
  const ket: string[] = []
  // Mỗi phần tử = "khối này (hoặc một khối cha của nó) là thân @keyframes hay không".
  const trongKeyframes: boolean[] = []
  let dauKhoi = ''

  for (const c of van) {
    if (c === '{') {
      const pre = dauKhoi.trim()
      const chaLaKeyframes = trongKeyframes.length > 0 && trongKeyframes[trongKeyframes.length - 1]
      const laKeyframes = /^@(-[A-Za-z]+-)?keyframes\b/i.test(pre)
      if (!chaLaKeyframes && pre && !pre.startsWith('@')) {
        for (const s of pre.split(',')) if (selNguyHiem(s)) ket.push(s.trim())
      }
      trongKeyframes.push(laKeyframes || chaLaKeyframes)
      dauKhoi = ''
      continue
    }
    if (c === '}') {
      trongKeyframes.pop()
      dauKhoi = ''
      continue
    }
    if (c === ';') {
      dauKhoi = ''
      continue
    }
    dauKhoi += c
  }
  return ket
}

/** Chọn lớp cho một đoạn CSS: có bộ chọn phần tử trần thì xuống lớp thấp, còn lại lên lớp cao. */
export function chonLopChoCss(css: string): string {
  return quetBoChonNguyHiem(css).length > 0 ? LOP_THAP : LOP_CAO
}

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
  the.textContent = `@layer ${chonLopChoCss(css)}{${css}}`
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
