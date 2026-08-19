// Điểm vào DUY NHẤT cho tab Mindmap (App.tsx import component này, không còn import EdgelessBoard
// trực tiếp). Quản lý bảng nào đang mở + kỹ thuật ẩn-không-tháo khi chuyển tab khác trong app (kế
// thừa đúng lý do ResizeObserver đã đo ở hack "mount vĩnh viễn" cũ — xem
// docs/superpowers/specs/2026-08-19-board-gallery-design.md §1) — khác hack cũ ở chỗ giờ CÓ unmount
// thật khi người dùng bấm quay lại danh sách, vì D4 đã đảm bảo không mất nội dung.
import { useEffect, useState } from 'react'

import { DanhSachBang } from './DanhSachBang'
import { diTruBangCuNeuCo } from './diTruBangCu'
import { EdgelessBoard } from './index'

export function BoardGallery({ dangHienTab }: { dangHienTab: boolean }) {
  const [openBoardId, setOpenBoardId] = useState<string | null>(null)

  useEffect(() => {
    diTruBangCuNeuCo()
  }, [])

  return (
    <>
      {!openBoardId && dangHienTab && <DanhSachBang onMoBang={setOpenBoardId} />}
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
            onClick={() => setOpenBoardId(null)}
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
