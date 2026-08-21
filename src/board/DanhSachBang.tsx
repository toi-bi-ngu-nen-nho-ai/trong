// Lưới thẻ danh sách bảng — tạo/đổi tên/xoá. KHÔNG phụ thuộc BlockSuite (không import ./index hay
// ./EdgelessBoard) — giữ file này nhẹ, tách hẳn khỏi ranh giới nạp chậm 994 kB. BoardGallery.tsx
// (bao ngoài) mới là nơi quyết định khi nào mount bảng vẽ thật.
import { useEffect, useRef, useState } from 'react'

import { IDB_STORES } from '../lib/idb'
import { formatReadTime } from '../lib/recentReads'
import { useIdbCollection } from '../lib/useIdbCollection'
import { type BangMeta, taoIdBang } from './boardMeta'

// Cùng giá trị CONFIRM_DELETE_RESET_MS của App.tsx (5000) — viết hằng số riêng thay vì import vì
// component gốc (ConfirmIconButton) là private, phụ thuộc `icons` cũng private của file 11.000+
// dòng đó. Xem Global Constraints của kế hoạch này.
const XAC_NHAN_XOA_MS = 5000

// Ngưỡng coi một thẻ là "vừa tạo" (dùng .card-plop thay vì .card-settle êm) — xem §3.2/§3.3 spec.
const VUA_TAO_NGUONG_MS = 3000

// Thời lượng .card-slide-out (src/index.css) — thẻ giữ mount đúng bằng ngần này trước khi remove()
// thật chạy, để animation kịp chạy hết trước khi gỡ khỏi DOM.
const XOA_TRE_MS = 200

// Băm chuỗi id thành một góc nghiêng ỔN ĐỊNH trong khoảng [-3.0, 3.0] độ, bước 0.1 — KHÔNG dùng
// Math.random() vì góc phải giữ nguyên qua mọi lần re-render (đúng thẻ ảnh thật nằm yên trên bàn,
// không tự xoay mỗi khi có gì đó khiến component render lại).
export function nghiengOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 61) - 30) / 10
}

function TheTrong() {
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full opacity-40" aria-hidden="true">
      <circle cx="60" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="80" y1="50" x2="120" y2="50" stroke="currentColor" strokeWidth="2" />
      <rect x="120" y="35" width="40" height="30" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function TheBang({
  bang,
  index,
  vuaTao,
  dangXoa,
  dangSuaTen,
  dangMoMenu,
  dangXacNhanXoa,
  onMo,
  onBatMenu,
  onBatSuaTen,
  onLuuTen,
  onXoa,
}: {
  bang: BangMeta
  index: number
  vuaTao: boolean
  dangXoa: boolean
  dangSuaTen: boolean
  dangMoMenu: boolean
  dangXacNhanXoa: boolean
  onMo: () => void
  onBatMenu: () => void
  onBatSuaTen: () => void
  onLuuTen: (tenMoi: string) => void
  onXoa: () => void
}) {
  const [tenNhap, setTenNhap] = useState(bang.ten)

  // `tenNhap` chỉ khởi tạo MỘT LẦN từ `useState(bang.ten)` — không tự đồng bộ lại khi mở sửa tên
  // LẦN THỨ HAI. Không có effect này: gõ nháp → Escape (huỷ, không lưu nhưng cũng không reset ô
  // nhập) → mở sửa tên lại → ô nhập vẫn hiện bản nháp đã huỷ chứ không phải tên thật hiện tại →
  // lỡ tay blur ra ngoài thì `onLuuTen(tenNhap)` ÂM THẦM ghi đè tên bảng bằng bản nháp cũ — mất
  // dữ liệu thật, không chỉ hiển thị sai. Đồng bộ lại mỗi khi `dangSuaTen` chuyển sang true.
  useEffect(() => {
    if (dangSuaTen) setTenNhap(bang.ten)
  }, [dangSuaTen, bang.ten])

  const lopVaoMan = dangXoa ? 'card-slide-out' : vuaTao ? 'card-plop' : 'card-settle'

  return (
    <div
      data-testid="the-bang"
      className={lopVaoMan}
      style={{
        position: 'relative',
        '--tilt': `${nghiengOnDinh(bang.id)}deg`,
        '--i': index,
        pointerEvents: dangXoa ? 'none' : undefined,
      } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={onMo}
        className="the-bang-vat"
        style={{ display: 'block', width: '100%', border: 0, background: 'none', padding: 0, textAlign: 'left' }}
        aria-label={`Mở bảng ${bang.ten}`}
      >
        <div
          style={{
            aspectRatio: '4 / 3',
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--c-surface-soft, #f4f1ea)',
            color: 'var(--c-text-muted, #b5aa8f)',
          }}
        >
          {bang.anhXemTruoc ? (
            <img src={bang.anhXemTruoc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <TheTrong />
          )}
        </div>
        {!dangSuaTen && (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, margin: '4px 0 0', lineHeight: 1.2 }}>{bang.ten}</p>
            <p style={{ fontSize: 11, margin: '1px 0 0', color: 'var(--c-text-muted, #8a8378)' }}>
              {formatReadTime(bang.capNhatLuc)}
            </p>
          </>
        )}
      </button>

      {dangSuaTen && (
        <input
          type="text"
          data-testid={`input-ten-${bang.id}`}
          value={tenNhap}
          autoFocus
          onChange={(e) => setTenNhap(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onLuuTen(tenNhap)
            if (e.key === 'Escape') onLuuTen(bang.ten)
          }}
          onBlur={() => onLuuTen(tenNhap)}
          style={{ width: '100%', marginTop: 4, fontSize: 13, fontWeight: 600 }}
        />
      )}

      <button
        type="button"
        data-testid={`menu-bang-${bang.id}`}
        onClick={onBatMenu}
        aria-label="Tuỳ chọn bảng"
        style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: '50%', border: 0 }}
      >
        ⋯
      </button>

      {dangMoMenu && (
        <div style={{ position: 'absolute', top: 30, right: 4, background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: 8, padding: 4, zIndex: 1 }}>
          <button type="button" data-testid={`doi-ten-${bang.id}`} onClick={onBatSuaTen} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 0, background: 'none' }}>
            Đổi tên
          </button>
          <button
            type="button"
            data-testid={`xoa-${bang.id}`}
            onClick={onXoa}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 0, background: 'none', color: dangXacNhanXoa ? 'var(--c-danger, #c0392b)' : undefined }}
          >
            {dangXacNhanXoa ? 'Chắc chắn xoá?' : 'Xoá'}
          </button>
        </div>
      )}
    </div>
  )
}

export function DanhSachBang({ onMoBang }: { onMoBang: (boardId: string) => void }) {
  // useIdbCollection tự nạp danh sách lúc mount (fetch một lần, xem src/lib/useIdbCollection.ts)
  // và cập nhật `items` CỤC BỘ NGAY khi add/update/remove được gọi — ghi IndexedDB chạy nền
  // (fire-and-forget), không chặn re-render. Đây là mẫu ĐÃ CÓ SẴN, dùng chung với ECG lessons/bài
  // viết — không tự viết state/fetch riêng cho danh sách bảng (xem cảnh báo ở Task 1).
  const { items: danhSach, loading, add, update, remove } = useIdbCollection<BangMeta>(IDB_STORES.boards)
  const [dangSuaTenId, setDangSuaTenId] = useState<string | null>(null)
  const [dangMoMenuId, setDangMoMenuId] = useState<string | null>(null)
  const [dangXacNhanXoaId, setDangXacNhanXoaId] = useState<string | null>(null)
  const [dangXoaId, setDangXoaId] = useState<string | null>(null)
  const luoBoMount = useRef(Date.now())

  useEffect(() => {
    if (!dangXacNhanXoaId) return
    const id = setTimeout(() => setDangXacNhanXoaId(null), XAC_NHAN_XOA_MS)
    return () => clearTimeout(id)
  }, [dangXacNhanXoaId])

  useEffect(() => {
    if (!dangXoaId) return
    const idBiXoa = dangXoaId
    const id = setTimeout(() => {
      remove(idBiXoa)
      setDangXoaId(null)
    }, XOA_TRE_MS)
    return () => clearTimeout(id)
  }, [dangXoaId, remove])

  // Chưa nạp xong lần đầu — không hiện gì (kể cả thẻ "+"), tránh nháy "rỗng" giả trước khi
  // IndexedDB kịp trả dữ liệu thật (đúng lý do trường `loading` tồn tại trong hook).
  if (loading) return null

  const danhSachSapXep = [...danhSach].sort((a, b) => b.capNhatLuc - a.capNhatLuc)

  return (
    // `scroll-ios` (xem src/index.css) — cùng quy ước cuộn dọc + đệm dưới thanh nav mà mọi màn hình
    // khác trong app dùng (vd HomeScreen, LibraryScreen ở App.tsx). Thiếu nó, lưới bảng dài quá một
    // màn hình không có cách nào cuộn tới — trước lượt sửa này chỉ có `padding: 10` ad-hoc, không
    // phải vùng cuộn thật.
    <div className="scroll-ios h-full">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 16 }}>
        {danhSachSapXep.map((bang, index) => (
          <TheBang
            key={bang.id}
            bang={bang}
            index={index}
            vuaTao={luoBoMount.current - bang.taoLuc < VUA_TAO_NGUONG_MS}
            dangXoa={dangXoaId === bang.id}
            dangSuaTen={dangSuaTenId === bang.id}
            dangMoMenu={dangMoMenuId === bang.id}
            dangXacNhanXoa={dangXacNhanXoaId === bang.id}
            onMo={() => onMoBang(bang.id)}
            onBatMenu={() => setDangMoMenuId(dangMoMenuId === bang.id ? null : bang.id)}
            onBatSuaTen={() => {
              setDangMoMenuId(null)
              setDangSuaTenId(bang.id)
            }}
            onLuuTen={(tenMoi) => {
              setDangSuaTenId(null)
              const tenSach = tenMoi.trim() || bang.ten
              update({ ...bang, ten: tenSach, capNhatLuc: Date.now() })
            }}
            onXoa={() => {
              if (dangXacNhanXoaId !== bang.id) {
                setDangXacNhanXoaId(bang.id)
                return
              }
              setDangXacNhanXoaId(null)
              setDangMoMenuId(null)
              setDangXoaId(bang.id)
            }}
          />
        ))}
        <button
          type="button"
          data-testid="tao-bang"
          onClick={() => {
            const bayGio = Date.now()
            const meta: BangMeta = { id: taoIdBang(), ten: 'Bảng chưa đặt tên', taoLuc: bayGio, capNhatLuc: bayGio }
            add(meta)
            onMoBang(meta.id)
          }}
          style={{
            aspectRatio: '4 / 3',
            border: '2px dashed var(--c-line, #d5cdb8)',
            borderRadius: 8,
            background: 'none',
            fontSize: 24,
            color: 'var(--c-text-muted, #b5aa8f)',
          }}
          aria-label="Tạo bảng mới"
        >
          +
        </button>
      </div>
    </div>
  )
}
