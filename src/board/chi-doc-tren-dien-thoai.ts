// Nhận diện "đang xem trên điện thoại" cho bảng sơ đồ.
//
// Chủ dự án quyết 2026-09-03: trên điện thoại, bảng sơ đồ CHỈ ĐỂ XEM — không chỉnh sửa gì. Cách
// thực thi là bật `store.readonly` (xem EdgelessBoard.tsx); file này chỉ trả lời đúng một câu hỏi
// "có phải điện thoại không", tách riêng để kiểm được mà không phải mount cả cây Lit.
//
// NGƯỠNG 768 px là mốc `md` của Tailwind: iPad dọc rộng đúng 768 px nên máy tính bảng KHÔNG rơi vào
// chế độ chỉ đọc, chỉ điện thoại mới rơi vào. Viết là `767.98px` chứ không phải `767px` để không
// chừa khe hở ở những bề ngang lẻ (trình duyệt trả bề ngang phân số khi có zoom hệ thống).
//
// THEO DÕI bằng `matchMedia` chứ không đọc `innerWidth` một lần lúc mount: xoay máy ngang là bề
// ngang nhảy qua ngưỡng, và bảng phải đổi trạng thái ngay chứ không đợi mở lại.

/** Truy vấn media chốt ranh giới điện thoại. Đổi số này là đổi hành vi trên máy thật. */
export const TRUY_VAN_DIEN_THOAI = '(max-width: 767.98px)'

/**
 * `matchMedia` có mặt không. Trả `null` ở môi trường không có nó — đường này CÓ THẬT: `xuatAnhBang`
 * mount một cây Lit ngầm, và các lượt chạy test môi trường 'node' cũng không có `matchMedia`. Coi
 * "không biết" là "không phải điện thoại" để không khoá nhầm một lượt xuất ảnh về chỉ-đọc.
 */
function truyVan(): MediaQueryList | null {
  if (typeof matchMedia !== 'function') return null
  try {
    return matchMedia(TRUY_VAN_DIEN_THOAI)
  } catch {
    return null
  }
}

/** Bề ngang hiện tại có dưới ngưỡng điện thoại không. */
export function laDienThoai(): boolean {
  return truyVan()?.matches ?? false
}

/**
 * Gọi `khiDoi` mỗi lần bề ngang vượt qua ngưỡng. Trả hàm huỷ — PHẢI gọi khi tháo component, nếu
 * không mỗi lần vào ra một bảng là một listener nữa còn sống.
 */
export function theoDoiDienThoai(khiDoi: (la: boolean) => void): () => void {
  const mql = truyVan()
  if (!mql) return () => {}
  const nghe = (e: MediaQueryListEvent | { matches: boolean }) => khiDoi(e.matches)
  mql.addEventListener('change', nghe as (e: MediaQueryListEvent) => void)
  return () => mql.removeEventListener('change', nghe as (e: MediaQueryListEvent) => void)
}
