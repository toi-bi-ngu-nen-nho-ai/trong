// Hai cách chờ một điều kiện trở thành đúng trong test — MỘT nguồn sự thật cho cả bộ spec.
//
// Trước lượt gộp này (2026-08-29) dự án mang hai lớp nợ song song:
//
//   1. `choDenKhi` được CHÉP TAY vào 4 file spec (DanhSachBang.spec.ts, BoardGallery.spec.ts,
//      DanhSachBang-loi-luu-tru.spec.ts, SearchScreen.spec.ts) với thân hàm gần như y hệt nhưng
//      mặc định đã trôi lệch nhau (3000 / 3000 / 4000 / 3000) và chỉ MỘT bản nhận điều kiện async.
//      Sửa một chỗ không lan sang ba chỗ kia — đúng lớp lỗi mà một helper dùng chung tồn tại để
//      ngăn.
//   2. 42 lời gọi `vi.waitFor()` TRẦN rải rác 13 file spec, tất cả ăn mặc định 1000ms của vitest.
//      Con số đó đủ khi chạy riêng một file, nhưng KHÔNG đủ khi `vitest run` chạy cả 51 file cùng
//      lúc: lượt đỏ đo được ngày 2026-08-29 ở edgeless-board-reorder.spec.ts (chờ `drt-database`
//      xuất hiện) xanh 1/1 khi chạy riêng, đỏ khi chạy đầy đủ. Hạn giờ ẩn 1000ms là một quả mìn hẹn
//      giờ còn nằm ở 41 chỗ kia.
//
// Vì sao KHÔNG cấu hình một lần trong vite.config.ts: vitest không có tuỳ chọn toàn cục cho hạn giờ
// mặc định của `vi.waitFor` (chỉ có `testTimeout`/`hookTimeout`, hai thứ khác hẳn). Một hàm bọc là
// cách DUY NHẤT để có một nguồn sự thật.
//
// File nằm ở `src/__tests__/helpers/` chứ không phải `src/board/__tests__/helpers/` vì nó phục vụ
// cả `src/__tests__/SearchScreen.spec.ts` lẫn 12 spec trong `src/board/__tests__/`. Đuôi `.ts`
// (không phải `.spec.ts`) nên glob `include` của vitest không nhặt nó thành một file test rỗng.
import { act } from 'react'
import { vi } from 'vitest'

// Hạn giờ chuẩn của dự án cho một lượt chờ, dùng chung cho cả hai hàm dưới đây. Chọn theo một
// nguyên tắc: phải LỚN HƠN hẳn lượt chờ chậm nhất đo được dưới tải đầy đủ, nhưng NHỎ HƠN
// `testTimeout` trong vite.config.ts — để khi có hồi quy thật, thứ hết giờ TRƯỚC là lượt chờ (ném
// ra đúng câu `expect` đã hỏng, đọc là biết sai ở đâu) chứ không phải cả test (chỉ nói "timeout",
// không nói vì sao). Nâng số này thì phải nâng `testTimeout` theo, giữ nguyên khoảng cách.
export const HAN_GIO_CHO_MS = 8000
// Bước poll. 50ms là giá trị cả 4 bản chép tay đều dùng — giữ nguyên, không có lý do đổi.
export const BUOC_POLL_MS = 50

/**
 * Chờ một điều kiện trong test có REACT — poll qua NHIỀU lượt `act()` RỜI NHAU.
 *
 * KHÔNG thay được bằng `act(async () => { await vi.waitFor(...) })`: mẫu đó TREO VÔ THỜI HẠN khi
 * điều kiện chờ phụ thuộc một cập nhật state React (vd `loading` của useIdbCollection sau khi
 * idbGetAll xong). Nguyên nhân đã xác nhận bằng cách đọc thẳng `exports.act` trong
 * node_modules/react/cjs/react.development.js, rồi đo thật với hạn tới 8000ms vẫn treo: `act()` chỉ
 * flush hàng đợi cập nhật đã lên lịch SAU KHI promise callback của chính nó resolve — nhưng
 * `vi.waitFor` bên trong không resolve cho tới khi điều kiện (chính là kết quả của cú flush đó) trở
 * thành true. Hai bên chờ nhau vô hạn.
 *
 * Mỗi lượt `act()` ở đây chỉ ngủ một khoảng ngắn rồi đóng lại — tự flush xong TRƯỚC KHI lượt sau
 * kiểm tra lại điều kiện, nên không có vòng chờ lồng nhau nào để kẹt.
 *
 * Nhận điều kiện đồng bộ HOẶC async (bản LuoiMuc-loi-luu-tru cần `await` để đọc lại
 * IndexedDB) — hợp nhất bề mặt của cả 4 bản chép tay cũ, không bản nào mất khả năng đang dùng.
 */
export async function choDenKhi(
  dieuKien: () => void | Promise<void>,
  { hanGioMs = HAN_GIO_CHO_MS, buocMs = BUOC_POLL_MS }: { hanGioMs?: number; buocMs?: number } = {},
): Promise<void> {
  const hetHan = Date.now() + hanGioMs
  for (;;) {
    try {
      await dieuKien()
      return
    } catch (loi) {
      // Ném lại ĐÚNG lỗi assertion cuối cùng, không phải một Error('hết giờ') tự chế — thông điệp
      // của vitest ("expected null not to be null" kèm diff) mới là thứ nói được hỏng ở đâu.
      if (Date.now() >= hetHan) throw loi
    }
    await act(async () => {
      await new Promise((r) => setTimeout(r, buocMs))
    })
  }
}

/**
 * Chờ một điều kiện KHÔNG đi qua vòng render của React — cây Lit/BlockSuite gắn node thẳng vào DOM,
 * ngoài act queue, nên `vi.waitFor` bình thường mới là đúng cơ chế ở đây (và vì thế mẫu
 * `act(async () => { await vi.waitFor(...) })` vẫn chạy tốt trong các spec đó, không kẹt như bên
 * React).
 *
 * Hàm này KHÔNG đổi ngữ nghĩa gì so với `vi.waitFor` — chỉ thay hạn giờ ẩn 1000ms bằng
 * `HAN_GIO_CHO_MS`, ở MỘT chỗ thay vì 42 chỗ. Vẫn nhận tuỳ chọn để ca nào cần khác thì nói rõ ra.
 */
export function choDom<T>(
  dieuKien: () => T | Promise<T>,
  tuyChon: { timeout?: number; interval?: number } = {},
): Promise<T> {
  return vi.waitFor(dieuKien, { timeout: HAN_GIO_CHO_MS, interval: BUOC_POLL_MS, ...tuyChon })
}
