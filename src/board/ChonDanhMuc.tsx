// Bảng chọn danh mục — bước GIỮA của mọi luồng tạo mục (spec §3.5, quyết định 7: không có trạng thái
// chưa-phân-loại). Dùng chung cho cả nút "Tạo bài mới" ở Trang chủ lẫn nút "+" trong lưới, nên nó
// nhận `loai` và tự lọc lựa chọn thay vì để mỗi bên gọi tự nhớ Hướng dẫn không nhận sơ đồ.
//
// KHÔNG import gì từ BlockSuite (chỉ React + ./mucMeta) — App.tsx import nó vào chunk vỏ app, D13
// canh bằng ranh-gioi-nap-bang.spec.ts.
import { useEffect } from 'react'

import { DANH_MUC, danhMucNhanLoai, type IdDanhMuc, type LoaiMuc } from './mucMeta'

export function ChonDanhMuc({
  loai,
  onChon,
  onHuy,
}: {
  loai: LoaiMuc
  onChon: (danhMuc: IdDanhMuc) => void
  onHuy: () => void
}) {
  // Escape đóng — cùng quy ước với mọi lớp phủ khác trong app. Nghe trên `document` chứ không trên
  // thẻ gốc: lúc mở, focus có thể còn nằm ở nút vừa bấm bên ngoài lớp phủ.
  useEffect(() => {
    const nghe = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onHuy()
    }
    document.addEventListener('keydown', nghe)
    return () => document.removeEventListener('keydown', nghe)
  }, [onHuy])

  const luaChon = DANH_MUC.filter((d) => danhMucNhanLoai(d.id, loai))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(15, 23, 42, 0.45)' }}
      onClick={onHuy}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5"
        style={{ background: 'var(--c-surface)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={loai === 'bai-viet' ? 'Chọn danh mục cho bài viết' : 'Chọn danh mục cho sơ đồ'}
      >
        <h2 className="text-lg font-bold text-slate-900 mb-1">Xếp vào danh mục nào?</h2>
        <p className="text-xs text-slate-400 mb-4">Chọn xong là mở ra viết được ngay.</p>
        <div className="flex flex-col gap-2">
          {luaChon.map((d) => (
            <button
              key={d.id}
              onClick={() => onChon(d.id)}
              className="w-full text-left px-4 py-3 rounded-2xl card-press font-semibold text-slate-900"
              style={{ background: 'var(--c-surface-2)' }}
            >
              {d.ten}
            </button>
          ))}
        </div>
        <button onClick={onHuy} className="w-full mt-4 py-2 text-sm text-slate-400">
          Huỷ
        </button>
      </div>
    </div>
  )
}
