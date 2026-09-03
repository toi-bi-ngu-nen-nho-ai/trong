// Nhận diện "đang xem ở khung hẹp" cho bảng sơ đồ.
//
// Chủ dự án quyết 2026-09-03: bảng sơ đồ ở khung hẹp CHỈ ĐỂ XEM — không chỉnh sửa gì. Cách
// thực thi là bật `store.readonly` (xem EdgelessBoard.tsx); file này chỉ trả lời đúng một câu hỏi
// "khung có hẹp không", tách riêng để kiểm được mà không phải mount cả cây Lit.
//
// TÊN GỌI LÀ "KHUNG HẸP", KHÔNG PHẢI "ĐIỆN THOẠI" — chủ dự án chỉ ra 2026-09-03: không có ranh
// giới thật giữa điện thoại và PC/iPad. Điện thoại xoay ngang có thể rộng hơn 768, cửa sổ trình
// duyệt trên PC thu nhỏ có thể hẹp hơn. Đo cái ĐO ĐƯỢC (bề ngang) và gọi đúng tên nó.
//
// NGƯỠNG 768 px là mốc `md` của Tailwind: iPad dọc rộng đúng 768 px nên vừa đủ thoát. Viết là
// `767.98px` chứ không phải `767px` để không chừa khe hở ở những bề ngang lẻ (trình duyệt trả bề
// ngang phân số khi có zoom hệ thống).
//
// THEO DÕI bằng `matchMedia` chứ không đọc `innerWidth` một lần lúc mount: xoay máy ngang là bề
// ngang nhảy qua ngưỡng, và bảng phải đổi trạng thái ngay chứ không đợi mở lại.

/** Truy vấn media chốt ranh giới khung hẹp. Đổi số này là đổi hành vi trên máy thật. */
export const TRUY_VAN_KHUNG_HEP = '(max-width: 767.98px)'

/**
 * `matchMedia` có mặt không. Trả `null` ở môi trường không có nó — đường này CÓ THẬT: `xuatAnhBang`
 * mount một cây Lit ngầm, và các lượt chạy test môi trường 'node' cũng không có `matchMedia`. Coi
 * "không biết" là "không hẹp" để không khoá nhầm một lượt xuất ảnh về chỉ-đọc.
 */
function truyVan(): MediaQueryList | null {
  if (typeof matchMedia !== 'function') return null
  try {
    return matchMedia(TRUY_VAN_KHUNG_HEP)
  } catch {
    return null
  }
}

/** Bề ngang hiện tại có dưới ngưỡng khung hẹp không. */
export function laKhungHep(): boolean {
  return truyVan()?.matches ?? false
}

/**
 * Gọi `khiDoi` mỗi lần bề ngang vượt qua ngưỡng. Trả hàm huỷ — PHẢI gọi khi tháo component, nếu
 * không mỗi lần vào ra một bảng là một listener nữa còn sống.
 */
export function theoDoiKhungHep(khiDoi: (la: boolean) => void): () => void {
  const mql = truyVan()
  if (!mql) return () => {}
  const nghe = (e: MediaQueryListEvent | { matches: boolean }) => khiDoi(e.matches)
  mql.addEventListener('change', nghe as (e: MediaQueryListEvent) => void)
  return () => mql.removeEventListener('change', nghe as (e: MediaQueryListEvent) => void)
}
