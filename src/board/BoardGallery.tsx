// Điểm vào DUY NHẤT cho tab Mindmap (App.tsx import component này, không còn import EdgelessBoard
// trực tiếp). Quản lý bảng nào đang mở + kỹ thuật ẩn-không-tháo khi chuyển tab khác trong app (kế
// thừa đúng lý do ResizeObserver đã đo ở hack "mount vĩnh viễn" cũ — xem
// docs/superpowers/specs/2026-08-19-board-gallery-design.md §1) — khác hack cũ ở chỗ giờ CÓ unmount
// thật khi người dùng bấm quay lại danh sách, vì D4 đã đảm bảo không mất nội dung.
import { useEffect, useState } from 'react'

import { doiGhiAnhXongNeuCo } from './boardMeta'
import { DanhSachBang } from './DanhSachBang'
import { EdgelessBoard } from './index'

// Đánh dấu "đã từng THÀNH CÔNG di trú" — ĐỘC LẬP với việc metadata bảng 'board' còn tồn tại hay
// không. Không có cờ riêng này thì diTruBangCuNeuCo() tự coi "chưa di trú" mỗi khi metadata 'board'
// vắng mặt (kể cả do người dùng CHỦ Ý xoá bảng đó), nên nó hồi sinh bảng đã xoá ở lần mở app kế
// tiếp — VÀ trên máy chưa từng có bảng cũ, phần kiểm tra đó lặp lại (dựng TestWorkspace, mở
// IndexedDB, đợi đồng bộ tới 4s) ở MỌI lần mount, mãi mãi, cho một việc đáng lẽ chỉ chạy một lần.
// `drtrong:` — cùng quy ước tiền tố namespace localStorage của App.tsx (DISCLAIMER_KEY,
// TAB_SEARCH_HINT_KEY: "drtrong:tenKhoa"), KHÔNG dùng dấu gạch ngang để tránh trùng con chuỗi
// "drtrong-board" (tên CSDL IndexedDB của di trú/bảng vẽ — xem TEN_CSDL_BANG ở diTruBangCu.ts) —
// một khoá trùng chuỗi con đó, dù vô hại, sẽ khiến việc grep sau này kiểm ranh giới nạp chậm D13
// (chuỗi "drtrong-board" không được lọt vào chunk vỏ app) báo dương tính giả.
const DA_CHAY_DI_TRU_KEY = 'drtrong:board-di-tru-da-chay'

// Chặn double-invoke TRONG CÙNG PHIÊN (React StrictMode ở dev, hoặc dangHienTab dội nhanh
// true/false/true) khởi động hai lượt di trú song song — KHÁC với DA_CHAY_DI_TRU_KEY: cờ này chỉ
// sống trong bộ nhớ (không cần bền vững qua localStorage), nghĩa là "đang làm", không phải "đã
// xong". Ở module-scope (không phải state) vì nhiều instance BoardGallery không nên xảy ra, nhưng
// nếu có thì vẫn phải chặn chung — đây là khoá tài nguyên toàn cục (một CSDL IndexedDB), không
// phải trạng thái riêng của một component.
let dangDiTru = false

export function BoardGallery({ dangHienTab }: { dangHienTab: boolean }) {
  const [openBoardId, setOpenBoardId] = useState<string | null>(null)
  // true trong khoảng ngắn giữa lúc bấm "quay lại" và lúc lưới danh sách THẬT SỰ được phép mount —
  // xem chú thích dài ở nút "quay lại" bên dưới để hiểu vì sao cần một cờ riêng thay vì mount
  // DanhSachBang NGAY khi openBoardId về null.
  const [dangDong, setDangDong] = useState(false)
  // "vừa đóng một bảng" — cho DanhSachBang biết để chạy .board-out đúng MỘT lần khi nó tái xuất
  // hiện. KHÔNG dùng chung với dangDong (dangDong canh cuộc đua ảnh xem trước, không liên quan
  // animation) — hai mối quan tâm tách biệt dù cùng bật/tắt gần nhau trong thời gian.
  const [vuaDongBang, setVuaDongBang] = useState(false)

  useEffect(() => {
    // Chỉ thử di trú lần đầu người dùng THẬT SỰ mở tab Mindmap — không phải ngay lúc BoardGallery
    // mount (nó luôn mount cùng app shell, kể cả khi người dùng chưa từng chạm tab này).
    if (!dangHienTab) return
    if (dangDiTru) return
    try {
      // Trình duyệt chặn storage (Safari iOS "Chặn mọi cookie", hết quota ở chế độ ẩn danh) ném
      // SecurityError ở ĐÂY — nằm ngoài error boundary riêng của Mindmap (xem src/board/index.tsx,
      // boundary đó chỉ bọc EdgelessBoard đã nạp chậm, không bọc BoardGallery), nên một lỗi không
      // bắt sẽ nổi lên tới boundary GỐC và sập TOÀN BỘ app ngay lúc bấm tab Mindmap. Cùng khuôn
      // try/catch quanh localStorage mà App.tsx đã dùng cho DISCLAIMER_KEY (useDisclaimerAck).
      if (localStorage.getItem(DA_CHAY_DI_TRU_KEY)) return
    } catch {
      // Không đọc được cờ — cứ thử di trú (thà lặp lại ở phiên sau cho nhóm bị chặn storage, còn
      // hơn bỏ hẳn tính năng cho họ). dangDiTru vẫn chặn double-invoke trong CÙNG phiên này.
    }
    dangDiTru = true
    // Import ĐỘNG: diTruBangCu.ts kéo theo cùng chồng BlockSuite nặng mà EdgelessBoard giữ sau
    // React.lazy (xem ./index.tsx) — import tĩnh ở đây từng kéo cả chồng đó vào chunk vỏ app, tải
    // eager cho MỌI người dùng kể cả người chưa từng mở tab Mindmap (D13 lazy-loading boundary).
    import('./diTruBangCu')
      .then((m) => m.diTruBangCuNeuCo())
      .then(() => {
        // CHỈ đánh dấu "đã xong" SAU KHI thật sự thành công — đánh dấu trước (như bản cũ) khiến
        // một lượt thất bại tạm thời (mất mạng lúc tải chunk lần đầu — kịch bản có thật, xem
        // src/board/index.tsx và __tests__/ranh-gioi-nap-bang.spec.ts; hoặc di trú tự hết giờ 4s)
        // làm bảng cũ của người dùng biến mất khỏi danh sách VĨNH VIỄN, không bao giờ thử lại.
        try {
          localStorage.setItem(DA_CHAY_DI_TRU_KEY, '1')
        } catch {
          // Không lưu được cờ thì lần mount tab Mindmap sau thử lại — chấp nhận được, không chặn
          // việc dùng app (cùng tinh thần catch của useDisclaimerAck ở App.tsx).
        }
      })
      .catch((loi: unknown) => {
        // KHÔNG đánh dấu đã chạy ở đây — để lần mở tab Mindmap kế tiếp tự thử lại, thay vì mất
        // bảng cũ khỏi danh sách vì một lần thất bại tạm thời (mất mạng, IndexedDB hỏng...).
        console.error('BoardGallery: di trú bảng cũ thất bại, sẽ thử lại ở lần mở tab kế tiếp:', loi)
      })
      .finally(() => {
        dangDiTru = false
      })
  }, [dangHienTab])

  return (
    <>
      {!openBoardId && !dangDong && dangHienTab && (
        <DanhSachBang
          onMoBang={setOpenBoardId}
          dungTuBang={vuaDongBang}
          onHieuUngXong={() => setVuaDongBang(false)}
        />
      )}
      {openBoardId && (
        <div
          key={openBoardId}
          data-testid="boc-bang"
          className={`absolute inset-0 board-in${dangHienTab ? '' : ' invisible pointer-events-none'}`}
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
              setVuaDongBang(true)
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
            className="mind-focus-ring"
            // 44×44 (chuẩn tối thiểu cho ngón tay) — cũ 36×36 dưới mức khuyến nghị, xem critique
            // mục "Vùng chạm dưới chuẩn". Đây là một nút tròn thật (có nền/bóng), khác nút "⋯" của
            // DanhSachBang.tsx (chỉ ba dấu chấm, không nền) — phóng to cả hình tròn thấy được luôn,
            // không cần tách vùng chạm khỏi vùng thị giác.
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              zIndex: 20,
              width: 44,
              height: 44,
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
