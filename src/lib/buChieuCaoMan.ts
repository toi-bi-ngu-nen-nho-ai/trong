// ─── Bù phần khung nhìn còn THIẾU so với màn hình vật lý (2026-09-10) ────────────────────────────
//
// LỖI NÓ CHỮA: bản tối dùng `apple-mobile-web-app-status-bar-style: black-translucent` để nội dung
// tràn lên dưới thanh trạng thái (xem chú thích dài ở index.html). Chế độ đó đẩy iOS vào trạng thái
// lai: nó TÍNH chiều cao khung nhìn như thể "nằm dưới thanh trạng thái" nhưng lại ĐẶT khung nhìn ở
// mép trên (y=0). Hệ quả: `body { position: fixed; inset: 0 }` dừng trước đáy màn hình, để hở một
// dải dưới thanh nav.
//
// VÌ SAO KHÔNG LÀM BẰNG CSS THUẦN — đã thử và hỏng cả hai chiều trong cùng một ngày:
//   • cộng `calc(100% + var(--safe-top))` vào body ⇒ CẮT MẤT nửa dưới thanh nav (cộng quá tay)
//   • bỏ phép cộng đi                              ⇒ dải hở quay lại
// Phần thiếu thật nằm đâu đó GIỮA 0 và --safe-top, và không suy ra được: chênh lệch
// screen/innerHeight phụ thuộc từng máy, từng bản iOS, từng chế độ thanh trạng thái. Máy phát triển
// cũng không tái hiện được để đo (đo với --safe-top 59px/--safe-bottom 34px cho kết quả sạch hoàn
// toàn: mép dưới nav = mép dưới body = đáy khung nhìn). Nên: ĐO, đừng đoán — để máy tự nói ra con
// số của chính nó.
//
// VÌ SAO `screen.height − innerHeight` chứ không phải `visualViewport`: visualViewport bắn resize
// mỗi khi bàn phím iOS mở/đóng (đúng thiết kế của nó — báo vùng nhìn thấy TRỪ bàn phím), nên dùng
// nó là kéo cả body nhảy lên giữa màn hình lúc gõ số cân nặng. Đã thử và bỏ, xem chú thích ở `body`
// trong index.css. `screen.height` không đổi theo bàn phím.

const BIEN = "--vh-thieu"

// Chỉ bù khi chạy như app ĐÃ CÀI. Trong trình duyệt thường, `screen.height − innerHeight` chính là
// chiều cao thanh địa chỉ + thanh công cụ — một con số LỚN và hoàn toàn đúng đắn. Bù nó là đẩy nửa
// trang xuống dưới mép màn hình. Đây là lớp chặn quan trọng nhất của cả file này.
function laAppDaCai(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

// Trần an toàn: phần thiếu hợp lệ chỉ cỡ chiều cao thanh trạng thái (~20–70px). Số lớn hơn nghĩa là
// giả định của ta sai ở máy đó — thà không bù còn hơn đẩy thanh nav ra khỏi màn hình như lần trước.
const TRAN_PX = 120

export function doPhanThieu(): number {
  if (!laAppDaCai()) return 0
  const man = window.screen?.height
  const khung = window.innerHeight
  if (!man || !khung) return 0
  const thieu = man - khung
  if (!Number.isFinite(thieu) || thieu <= 0 || thieu > TRAN_PX) return 0
  return thieu
}

function ghi(): void {
  document.documentElement.style.setProperty(BIEN, `${doPhanThieu()}px`)
}

/**
 * Bắt đầu theo dõi. Trả về hàm dừng.
 *
 * Đo lại khi xoay máy / đổi kích thước: ở landscape, thanh trạng thái iOS biến mất nên phần thiếu
 * về 0 — giữ nguyên số cũ là chừa một dải trống ở đáy đúng bằng chiều cao thanh trạng thái.
 */
export function batDauBuChieuCaoMan(): () => void {
  ghi()
  const onResize = () => ghi()
  window.addEventListener("resize", onResize)
  window.addEventListener("orientationchange", onResize)
  return () => {
    window.removeEventListener("resize", onResize)
    window.removeEventListener("orientationchange", onResize)
  }
}
