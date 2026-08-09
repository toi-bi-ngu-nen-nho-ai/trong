// ─── --vvh: chiều cao khung nhìn THẬT trên iOS standalone PWA ────────────────────────────────
//
// `body` (index.css) đọc `--vvh` cho `height` thay vì chỉ dựa vào `100%`/`inset:0` của trình
// duyệt. Lý do: video thật từ iPhone Air (chạy standalone, cài ra màn hình chính) cho thấy ngay
// lúc mới mở app, khung "layout viewport" mà WebKit dùng để tính `height:100%` NGẮN HƠN vùng vẽ
// thật — để lại một dải đen phía dưới thanh nav mà không CSS thuần nào vá được, vì bản thân con
// số viewport đã sai chứ không phải lỗi tô màu.
//
// `window.visualViewport.height` là API sinh ra chính để phân biệt "layout viewport" khỏi "vùng
// nhìn thấy thật" trên WebKit, và đáng tin hơn các đơn vị CSS thuần (vh/dvh/%) trong đúng tình
// huống này. Đo lại nhiều lần trong giây đầu vì WebKit có thể tự sửa số đo một nhịp sau lần vẽ
// đầu tiên chứ không báo ngay lúc khởi động.
export function fixViewportHeight(): void {
  if (typeof window === "undefined") return

  const vv = window.visualViewport
  const measure = () => {
    const h = vv ? vv.height : window.innerHeight
    // Bỏ qua số đo 0/âm: script này chạy TRƯỚC khi React vẽ (main.tsx), và ở một số thời điểm rất
    // sớm trình duyệt có thể chưa chốt layout, trả về 0. Ghi `--vvh: 0px` sẽ làm `body` (đọc biến
    // này làm height) cao 0 — sập trắng cả app — TỆ HƠN hẳn dải đen ở đáy mà biến này định sửa.
    if (!h || h <= 0) return
    document.documentElement.style.setProperty("--vvh", `${h}px`)
  }

  measure()
  vv?.addEventListener("resize", measure)
  window.addEventListener("orientationchange", measure)
  window.addEventListener("resize", measure)
  // Vài lần đo trễ trong giây đầu: bắt lại đúng lúc WebKit chỉnh số đo sau lần vẽ đầu, kể cả khi
  // không có sự kiện resize/orientationchange nào tự bắn ra để báo.
  for (const delay of [100, 300, 800, 1500]) {
    window.setTimeout(measure, delay)
  }
}
