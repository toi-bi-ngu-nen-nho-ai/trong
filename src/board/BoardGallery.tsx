// Điểm vào DUY NHẤT cho tab Mindmap (App.tsx import component này, không còn import EdgelessBoard
// trực tiếp). Quản lý bảng nào đang mở + kỹ thuật ẩn-không-tháo khi chuyển tab khác trong app (kế
// thừa đúng lý do ResizeObserver đã đo ở hack "mount vĩnh viễn" cũ — xem
// docs/superpowers/specs/2026-08-19-board-gallery-design.md §1) — khác hack cũ ở chỗ giờ CÓ unmount
// thật khi người dùng bấm quay lại danh sách, vì D4 đã đảm bảo không mất nội dung.
import { useEffect, useState } from 'react'

import { doiGhiAnhXongNeuCo } from './boardMeta'
import { DanhSachBang } from './DanhSachBang'
import { EdgelessBoard } from './index'

// Đánh dấu "đã từng thử di trú" — ĐỘC LẬP với việc metadata bảng 'board' còn tồn tại hay không.
// Không có cờ riêng này thì diTruBangCuNeuCo() tự coi "chưa di trú" mỗi khi metadata 'board' vắng
// mặt (kể cả do người dùng CHỦ Ý xoá bảng đó), nên nó hồi sinh bảng đã xoá ở lần mở app kế tiếp —
// VÀ trên máy chưa từng có bảng cũ, phần kiểm tra đó lặp lại (dựng TestWorkspace, mở IndexedDB,
// đợi đồng bộ tới 4s) ở MỌI lần mount, mãi mãi, cho một việc đáng lẽ chỉ chạy một lần.
// `drtrong:` — cùng quy ước tiền tố namespace localStorage của App.tsx (DISCLAIMER_KEY,
// TAB_SEARCH_HINT_KEY: "drtrong:tenKhoa"), KHÔNG dùng dấu gạch ngang để tránh trùng con chuỗi
// "drtrong-board" (tên CSDL IndexedDB của di trú/bảng vẽ — xem TEN_CSDL_BANG ở diTruBangCu.ts) —
// một khoá trùng chuỗi con đó, dù vô hại, sẽ khiến việc grep sau này kiểm ranh giới nạp chậm D13
// (chuỗi "drtrong-board" không được lọt vào chunk vỏ app) báo dương tính giả.
const DA_CHAY_DI_TRU_KEY = 'drtrong:board-di-tru-da-chay'

export function BoardGallery({ dangHienTab }: { dangHienTab: boolean }) {
  const [openBoardId, setOpenBoardId] = useState<string | null>(null)
  // true trong khoảng ngắn giữa lúc bấm "quay lại" và lúc lưới danh sách THẬT SỰ được phép mount —
  // xem chú thích dài ở nút "quay lại" bên dưới để hiểu vì sao cần một cờ riêng thay vì mount
  // DanhSachBang NGAY khi openBoardId về null.
  const [dangDong, setDangDong] = useState(false)

  useEffect(() => {
    // Chỉ thử di trú lần đầu người dùng THẬT SỰ mở tab Mindmap — không phải ngay lúc BoardGallery
    // mount (nó luôn mount cùng app shell, kể cả khi người dùng chưa từng chạm tab này).
    if (!dangHienTab) return
    if (localStorage.getItem(DA_CHAY_DI_TRU_KEY)) return
    // Đặt cờ TRƯỚC khi kích hoạt import động: một lượt double-invoke trong cùng phiên (StrictMode,
    // hoặc dangHienTab dội lại true/false/true nhanh) không được kích hoạt di trú lần hai.
    localStorage.setItem(DA_CHAY_DI_TRU_KEY, '1')
    // Import ĐỘNG: diTruBangCu.ts kéo theo cùng chồng BlockSuite nặng mà EdgelessBoard giữ sau
    // React.lazy (xem ./index.tsx) — import tĩnh ở đây từng kéo cả chồng đó vào chunk vỏ app, tải
    // eager cho MỌI người dùng kể cả người chưa từng mở tab Mindmap (D13 lazy-loading boundary).
    void import('./diTruBangCu').then((m) => m.diTruBangCuNeuCo())
  }, [dangHienTab])

  return (
    <>
      {!openBoardId && !dangDong && dangHienTab && <DanhSachBang onMoBang={setOpenBoardId} />}
      {openBoardId && (
        <div
          data-testid="boc-bang"
          className={`absolute inset-0${dangHienTab ? '' : ' invisible pointer-events-none'}`}
          inert={!dangHienTab}
        >
          <EdgelessBoard boardId={openBoardId} />
          <button
            type="button"
            data-testid="quay-lai"
            onClick={async () => {
              // Tháo EdgelessBoard TRƯỚC (kích hoạt cleanup effect của nó — nơi bắt đầu lượt ghi ảnh
              // xem trước, xem EdgelessBoard.tsx), nhưng CHƯA cho DanhSachBang mount lại ngay: cờ
              // `dangDong` giữ cả hai nhánh vắng mặt (màn hình trống một nhịp rất ngắn) để tránh
              // đúng cuộc đua đã đo được — nếu DanhSachBang mount CÙNG một lượt commit với việc
              // EdgelessBoard unmount, lượt đọc-lúc-mount của nó hầu như luôn xong TRƯỚC lượt ghi
              // (đọc đơn so với đọc-rồi-ghi), nên thẻ hiện bản ghi CŨ mãi tới lần mount SAU.
              setDangDong(true)
              setOpenBoardId(null)

              // Nhường một nhịp macrotask cho React thật sự CHẠY cleanup effect vừa lên lịch ở trên
              // (passive effect — không chạy đồng bộ ngay sau setState). `setTimeout(0)` chứ không
              // phải một microtask (`Promise.resolve()`): việc React lên lịch passive effect qua
              // Scheduler dùng cơ chế ưu tiên CAO hơn setTimeout thường (MessageChannel ở trình
              // duyệt thật) nên effect đó gần như chắc chắn đã chạy xong trước khi callback
              // setTimeout(0) này của ta được gọi.
              await new Promise((r) => setTimeout(r, 0))
              // Giờ mới đợi lượt ghi (nếu cleanup ở trên đã kích hoạt một lượt) — có hạn giờ riêng
              // (xem boardMeta.ts), không chặn vô thời hạn nếu việc ghi có vấn đề.
              await doiGhiAnhXongNeuCo()
              setDangDong(false)
            }}
            aria-label="Quay lại danh sách bảng"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 20,
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 0,
              background: 'var(--c-surface, #fff)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            ←
          </button>
        </div>
      )}
    </>
  )
}
