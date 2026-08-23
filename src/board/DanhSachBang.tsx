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

// Thời lượng .card-slide-out (src/index.css) — thẻ giữ mount đúng bằng ngần này trước khi đánh dấu
// xoá mềm (daXoaLuc) chạy, để animation kịp chạy hết trước khi thẻ biến mất khỏi lưới.
const XOA_TRE_MS = 200

// Cửa sổ "Hoàn tác" sau khi xoá mềm một bảng — cùng độ dài với XAC_NHAN_XOA_MS (quy ước sẵn có của
// đúng màn này cho "khoảng ân hạn"), đủ lâu để đọc tên bảng vừa xoá và quyết định, không quá lâu
// tới mức dải xác nhận cảm giác bị kẹt trên màn hình.
const HOAN_TAC_XOA_MS = 5000

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
  const nutRef = useRef<HTMLButtonElement>(null)

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
        ref={nutRef}
        type="button"
        onClick={onMo}
        className="the-bang-vat the-bang-nghieng-con-tro mind-focus-ring"
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return
          const el = nutRef.current
          if (!el) return
          const r = el.getBoundingClientRect()
          el.style.setProperty('--con-tro-x', String((e.clientX - r.left) / r.width))
          el.style.setProperty('--con-tro-y', String((e.clientY - r.top) / r.height))
        }}
        onPointerLeave={() => {
          nutRef.current?.style.removeProperty('--con-tro-x')
          nutRef.current?.style.removeProperty('--con-tro-y')
        }}
        style={{ display: 'block', width: '100%', border: 0, background: 'none', padding: 0, textAlign: 'left' }}
        aria-label={`Mở bảng ${bang.ten}`}
      >
        <div
          style={{
            aspectRatio: '4 / 3',
            borderRadius: 8,
            overflow: 'hidden',
            // --c-surface-soft KHÔNG tồn tại trong index.css (chỉ có --c-surface/--c-surface-alt) —
            // fallback cũ (#f4f1ea, be ấm) từng ÂM THẦM chạy thật mỗi khi phiên trước không kết thúc
            // bằng nút "←" (ảnh xem trước chỉ ghi trong cleanup effect của React, xem EdgelessBoard.tsx),
            // lộ ra giữa nền indigo tối. Đổi sang token thật đang tồn tại.
            background: 'var(--c-surface-alt, #f6f7fd)',
            color: 'var(--c-text-muted, #6b6e96)',
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
            <p style={{ fontSize: 11, margin: '1px 0 0', color: 'var(--c-text-muted, #6b6e96)' }}>
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
        className="mind-focus-ring"
        // Vùng chạm 44×44 (chuẩn tối thiểu cho ngón tay, WCAG 2.2 AA + khuyến nghị thực hành) — giữ
        // cùng gốc top/right:4 như cũ (không đẩy ra ngoài mép thẻ, tránh chồng lên khoảng gap của
        // lưới) nên box lớn hơn ăn VÀO PHÍA TRONG thẻ; dấu "⋯" tự căn giữa lại bằng flex, dịch nhẹ
        // vào trong so với vị trí cũ — chấp nhận được, không phóng to một hình tròn nền/viền vốn
        // không tồn tại (nút này chưa từng có background/border thấy được, chỉ có ba dấu chấm).
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 0,
          background: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⋯
      </button>

      {dangMoMenu && (
        <div style={{ position: 'absolute', top: 30, right: 4, background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: 8, padding: 4, zIndex: 1 }}>
          <button type="button" data-testid={`doi-ten-${bang.id}`} onClick={onBatSuaTen} className="mind-focus-ring" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 0, background: 'none' }}>
            Đổi tên
          </button>
          <button
            type="button"
            data-testid={`xoa-${bang.id}`}
            onClick={onXoa}
            className="mind-focus-ring"
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 0, background: 'none', color: dangXacNhanXoa ? 'var(--c-danger, #c0392b)' : undefined }}
          >
            {dangXacNhanXoa ? 'Chắc chắn xoá?' : 'Xoá'}
          </button>
        </div>
      )}
    </div>
  )
}

export function DanhSachBang({
  onMoBang,
  dungTuBang,
  onHieuUngXong,
}: {
  onMoBang: (boardId: string) => void
  dungTuBang?: boolean
  onHieuUngXong?: () => void
}) {
  // useIdbCollection tự nạp danh sách lúc mount (fetch một lần, xem src/lib/useIdbCollection.ts)
  // và cập nhật `items` CỤC BỘ NGAY khi add/update/remove được gọi — ghi IndexedDB chạy nền
  // (fire-and-forget), không chặn re-render. Đây là mẫu ĐÃ CÓ SẴN, dùng chung với ECG lessons/bài
  // viết — không tự viết state/fetch riêng cho danh sách bảng (xem cảnh báo ở Task 1).
  const { items: danhSach, loading, add, update } = useIdbCollection<BangMeta>(IDB_STORES.boards)
  const [dangSuaTenId, setDangSuaTenId] = useState<string | null>(null)
  const [dangMoMenuId, setDangMoMenuId] = useState<string | null>(null)
  const [dangXacNhanXoaId, setDangXacNhanXoaId] = useState<string | null>(null)
  // Mang cả OBJECT (không chỉ id) — cần đủ dữ liệu gốc để đánh dấu daXoaLuc rồi đưa thẳng cho dải
  // "Hoàn tác" mà không phải tra lại danhSach sau khi bang đã bị lọc khỏi danh sách hiển thị.
  const [dangChoXoa, setDangChoXoa] = useState<BangMeta | null>(null)
  // Bang vừa xoá mềm xong — điều khiển dải "Hoàn tác". null nghĩa là không có dải nào đang hiện.
  const [vuaXoa, setVuaXoa] = useState<BangMeta | null>(null)
  const luoBoMount = useRef(Date.now())

  useEffect(() => {
    if (!dangXacNhanXoaId) return
    const id = setTimeout(() => setDangXacNhanXoaId(null), XAC_NHAN_XOA_MS)
    return () => clearTimeout(id)
  }, [dangXacNhanXoaId])

  // Đánh dấu XOÁ MỀM (daXoaLuc) sau khi .card-slide-out chạy xong — KHÔNG gọi idbDelete/remove()
  // nữa (trước đây xoá vĩnh viễn ngay, không hoàn tác được, ngược với lời hứa "xoá mềm" của
  // PRODUCT.md). update() vẫn ghi IndexedDB như cũ, chỉ đổi field nào được ghi.
  useEffect(() => {
    if (!dangChoXoa) return
    const bangBiXoa = dangChoXoa
    const id = setTimeout(() => {
      update({ ...bangBiXoa, daXoaLuc: Date.now() })
      setDangChoXoa(null)
      setVuaXoa(bangBiXoa)
    }, XOA_TRE_MS)
    return () => clearTimeout(id)
  }, [dangChoXoa, update])

  // Tự tắt dải "Hoàn tác" sau HOAN_TAC_XOA_MS — bang vẫn ở lại trạng thái xoá mềm sau khi dải tắt,
  // chỉ là không còn cách hoàn tác NHANH qua dải này nữa (chưa có màn "thùng rác" để hoàn tác sau).
  useEffect(() => {
    if (!vuaXoa) return
    const id = setTimeout(() => setVuaXoa(null), HOAN_TAC_XOA_MS)
    return () => clearTimeout(id)
  }, [vuaXoa])

  // Hiệu ứng .board-out chỉ chạy MỘT LẦN khi vừa đóng một bảng (dungTuBang=true) — tự báo xong
  // sau khi animation (0,2s, xem index.css) kết thúc, cộng biên an toàn nhỏ. KHÔNG chạy khi
  // DanhSachBang mount vì lý do khác (vd lần đầu vào tab Mindmap) — dungTuBang khi đó là
  // undefined/false, effect này không làm gì.
  useEffect(() => {
    if (!dungTuBang) return
    const id = setTimeout(() => onHieuUngXong?.(), 220)
    return () => clearTimeout(id)
  }, [dungTuBang, onHieuUngXong])

  // Chưa nạp xong lần đầu — không hiện gì (kể cả thẻ "+"), tránh nháy "rỗng" giả trước khi
  // IndexedDB kịp trả dữ liệu thật (đúng lý do trường `loading` tồn tại trong hook).
  if (loading) return null

  // Lọc bỏ bang đã xoá mềm (daXoaLuc) khỏi lưới hiển thị — chúng vẫn còn thật trong IndexedDB.
  const danhSachSapXep = [...danhSach].filter((b) => !b.daXoaLuc).sort((a, b) => b.capNhatLuc - a.capNhatLuc)
  const bayGio = luoBoMount.current

  const taoBangMoi = () => {
    const luc = Date.now()
    const meta: BangMeta = { id: taoIdBang(), ten: 'Bảng chưa đặt tên', taoLuc: luc, capNhatLuc: luc }
    add(meta)
    onMoBang(meta.id)
  }

  return (
    <>
    <div className={`scroll-ios h-full${dungTuBang ? ' board-out' : ''}`}>
      {danhSachSapXep.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '70%',
            gap: 12,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <div className="empty-breathe" style={{ width: 96, height: 72, color: 'var(--c-text-muted, #6b6e96)' }}>
            <TheTrong />
          </div>
          <p style={{ fontSize: 14, color: 'var(--c-text-muted, #6b6e96)', margin: 0 }}>
            Bắt đầu một sơ đồ tư duy mới
          </p>
          <button
            type="button"
            data-testid="tao-bang"
            onClick={taoBangMoi}
            className="mind-focus-ring"
            style={{
              width: 96,
              height: 72,
              border: '2px dashed var(--c-line, #d9ddf4)',
              borderRadius: 8,
              background: 'none',
              fontSize: 28,
              color: 'var(--c-text-muted, #6b6e96)',
            }}
            aria-label="Tạo bảng mới"
          >
            +
          </button>
        </div>
      ) : (
        // minmax(0, 1fr) thay vì '1fr' trần — '1fr' trần để Grid tự suy min-width từ NỘI DUNG khi
        // thiếu item để lấp đầy hàng (số bảng LẺ: ô "+" rơi cùng hàng với đúng 1 thẻ thật), và cả
        // thẻ lẫn ô "+" đều dùng aspectRatio (không có width tường minh) nên min-width suy ra bị kéo
        // lệch giữa hai cột — đo được 118px/217px thay vì chia đều. minmax(0, 1fr) chặn hẳn hành vi
        // "auto min" đó, luôn chia đều bất kể nội dung.
        <div className="danh-sach-bang-nen" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8, padding: 16 }}>
          {danhSachSapXep.map((bang, index) => (
            <TheBang
              key={bang.id}
              bang={bang}
              index={index}
              vuaTao={bayGio - bang.taoLuc < VUA_TAO_NGUONG_MS}
              dangXoa={dangChoXoa?.id === bang.id}
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
                setDangChoXoa(bang)
              }}
            />
          ))}
          <button
            type="button"
            data-testid="tao-bang"
            onClick={taoBangMoi}
            className="mind-focus-ring"
            style={{
              aspectRatio: '4 / 3',
              border: '2px dashed var(--c-line, #d9ddf4)',
              borderRadius: 8,
              background: 'none',
              fontSize: 24,
              color: 'var(--c-text-muted, #6b6e96)',
            }}
            aria-label="Tạo bảng mới"
          >
            +
          </button>
        </div>
      )}
    </div>
    {vuaXoa && (
        <div
          className="toast-in-full absolute flex items-center gap-2.5 px-4 py-2.5 rounded-2xl z-40"
          style={{ left: 12, right: 12, bottom: 'calc(var(--nav-body-h) + 18px)', background: 'rgba(15,23,42,.94)' }}
        >
          <span className="flex-1 text-[12.5px] text-white leading-snug">Đã xoá "{vuaXoa.ten}"</span>
          <button
            type="button"
            onClick={() => {
              update({ ...vuaXoa, daXoaLuc: undefined })
              setVuaXoa(null)
            }}
            className="mind-focus-ring"
            style={{
              color: 'var(--c-toast-green, #4ade80)',
              fontWeight: 600,
              fontSize: 13,
              background: 'none',
              border: 0,
              whiteSpace: 'nowrap',
              padding: '4px 6px',
            }}
          >
            Hoàn tác
          </button>
        </div>
      )}
    </>
  )
}
