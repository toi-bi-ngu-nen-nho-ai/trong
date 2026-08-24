// Lưới thẻ danh sách bảng — tạo/đổi tên/xoá. KHÔNG phụ thuộc BlockSuite (không import ./index hay
// ./EdgelessBoard) — giữ file này nhẹ, tách hẳn khỏi ranh giới nạp chậm 994 kB. BoardGallery.tsx
// (bao ngoài) mới là nơi quyết định khi nào mount bảng vẽ thật.
import { useEffect, useRef, useState } from 'react'

import { SPECIALTIES } from '../data'
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

// Băm id thành một góc (độ hue) ỔN ĐỊNH trong khoảng [260, 330) — họ tím-hồng quanh --c-accent-2
// (~327°, xem src/index.css), CỐ TÌNH tránh xa đỏ/hổ phách/xanh lá (~0-50°, ~90-150°) vì ba màu đó
// dành riêng cho tín hiệu nguy hiểm/cảnh báo/thành công (Untouchable Signal Rule, DESIGN.md) — chấm
// phân biệt bảng không bao giờ được lẫn với tín hiệu an toàn. Dùng chung `--chip-s`/`--chip-l` (định
// nghĩa cạnh --c-accent-2 trong index.css, tự đổi theo sáng/tối) nên hue là thứ DUY NHẤT hàm này cần
// tính — critique lượt 3 (2026-08-24): bảng mới tạo không phân biệt được trong lưới lẫn panel "Đã
// xoá gần đây" (11/15 bảng thật trên máy dev đọc y hệt "Bảng chưa đặt tên").
export function mauOnDinh(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) | 0
  return 260 + (Math.abs(h) % 70)
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
  dangXoa,
  dangSuaTen,
  dangMoMenu,
  dangXacNhanXoa,
  dangSuaTag,
  onMo,
  onBatMenu,
  onBatSuaTen,
  onLuuTen,
  onXoa,
  onBatSuaTag,
  onDoiChuyenKhoa,
  onThemTag,
  onXoaTag,
}: {
  bang: BangMeta
  index: number
  dangXoa: boolean
  dangSuaTen: boolean
  dangMoMenu: boolean
  dangXacNhanXoa: boolean
  dangSuaTag: boolean
  onMo: () => void
  onBatMenu: () => void
  onBatSuaTen: () => void
  onLuuTen: (tenMoi: string) => void
  onXoa: () => void
  onBatSuaTag: () => void
  onDoiChuyenKhoa: (id: string) => void
  onThemTag: (tag: string) => void
  onXoaTag: (tag: string) => void
}) {
  const [tenNhap, setTenNhap] = useState(bang.ten)
  const [tagNhap, setTagNhap] = useState('')
  const nutRef = useRef<HTMLButtonElement>(null)

  // Tính "vừa tạo" bằng ĐỒNG HỒ RIÊNG của thẻ, không phải mốc đông cứng lúc DanhSachBang mount —
  // trước đây parent chụp `Date.now()` một lần lúc MOUNT rồi so cho MỌI thẻ; bảng tạo SAU khi
  // gallery đã mở (đúng luồng "+" → mở ô đổi tên tại chỗ) có taoLuc > mốc đó, hiệu số luôn ÂM nên
  // `vuaTao` treo `true` suốt phiên xem thay vì tắt sau 3s — thẻ đóng băng ở khung hình đầu của
  // .card-plop, kéo theo vùng chạm "⋯" bị scale nhỏ lại (critique lượt 3, 2026-08-24). Đồng hồ
  // riêng + hẹn giờ tự tắt ở đây đảm bảo đúng hạn bất kể parent có re-render đúng lúc t+3s hay không.
  const [vuaTao, setVuaTao] = useState(() => Date.now() - bang.taoLuc < VUA_TAO_NGUONG_MS)
  useEffect(() => {
    if (!vuaTao) return
    const conLai = VUA_TAO_NGUONG_MS - (Date.now() - bang.taoLuc)
    if (conLai <= 0) {
      setVuaTao(false)
      return
    }
    const id = setTimeout(() => setVuaTao(false), conLai)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ cần chạy lại khi ĐỔI bảng (khoá
    // theo id), không phải mỗi khi `vuaTao` tự nó đổi (tránh vòng lặp huỷ-rồi-lập-lại hẹn giờ).
  }, [bang.id, bang.taoLuc])

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
            position: 'relative',
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
          {/* Chấm màu ổn định theo id — bản sắc thị giác KHÔNG cần gõ tên, gắn ở góc ảnh xem trước để
              lướt lưới vẫn thấy ngay kể cả khi nhiều bảng cùng tên mặc định "Bảng chưa đặt tên"
              (critique lượt 3). Viền --c-surface tạo tương phản với ảnh nền bất kỳ màu gì. */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: `hsl(${mauOnDinh(bang.id)} var(--chip-s) var(--chip-l))`,
              boxShadow: '0 0 0 2px var(--c-surface, #fff)',
            }}
          />
        </div>
        {!dangSuaTen && (
          <>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                margin: '4px 0 0',
                lineHeight: 1.2,
                // Tên lâm sàng dài (vd danh sách chẩn đoán phân biệt) từng kéo cả HÀNG lưới cao theo
                // ô cao nhất (Grid stretch mặc định), để lại khoảng trắng chết ở thẻ liền kề tên
                // ngắn — chặn ở 2 dòng, cùng cỡ mọi thẻ trong cùng hàng luôn khớp nhau.
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bang.ten}
            </p>
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
          // aria-label TĨNH, không dựa vào `value` — nếu không, người dùng đọc màn hình xoá trắng ô
          // để gõ lại sẽ mất tên truy cập giữa chừng (critique lượt 3, 2026-08-24).
          aria-label="Đổi tên bảng"
          onChange={(e) => setTenNhap(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onLuuTen(tenNhap)
            if (e.key === 'Escape') onLuuTen(bang.ten)
          }}
          onBlur={() => onLuuTen(tenNhap)}
          className="mind-focus-ring"
          // `input:focus{outline:none}` (index.css, reset toàn app) + Tailwind preflight đưa border
          // về 0 cộng lại xoá sạch MỌI tín hiệu đây là ô nhập — .mind-focus-ring chỉ bù lại lúc
          // :focus-visible (bàn phím), nên cần thêm viền nghỉ để ô này trông "có thể sửa" ngay cả
          // trước khi focus.
          style={{
            width: '100%',
            marginTop: 4,
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid var(--c-line, #d9ddf4)',
            borderRadius: 4,
            padding: '2px 4px',
            background: 'var(--c-surface, #fff)',
          }}
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
          {/* Vùng chạm 44px tối thiểu (display:flex+minHeight, không phải padding trần) + khoảng
              cách/đường phân trước mục xoá — trước đây hai dòng cao ~30.6px, cách nhau 0px, hành
              động phá huỷ đứng ngay sát hành động an toàn (critique lượt 3, 2026-08-24). */}
          <button
            type="button"
            data-testid={`sua-tag-${bang.id}`}
            onClick={onBatSuaTag}
            className="mind-focus-ring"
            style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 44, textAlign: 'left', padding: '0 10px', border: 0, background: 'none' }}
          >
            Chuyên khoa/tag
          </button>
          <button
            type="button"
            data-testid={`doi-ten-${bang.id}`}
            onClick={onBatSuaTen}
            className="mind-focus-ring"
            style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 44, textAlign: 'left', padding: '0 10px', border: 0, background: 'none' }}
          >
            Đổi tên
          </button>
          <button
            type="button"
            data-testid={`xoa-${bang.id}`}
            onClick={onXoa}
            className="mind-focus-ring"
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              minHeight: 44,
              textAlign: 'left',
              padding: '0 10px',
              marginTop: 2,
              border: 0,
              borderTop: '1px solid var(--c-line, #d9ddf4)',
              background: 'none',
              color: dangXacNhanXoa ? 'var(--c-danger, #c0392b)' : undefined,
            }}
          >
            {dangXacNhanXoa ? 'Chắc chắn xoá?' : 'Xoá'}
          </button>
        </div>
      )}

      {dangSuaTag && (
        <div
          data-testid={`sua-chuyen-khoa-tag-${bang.id}`}
          style={{ position: 'absolute', top: 30, right: 4, background: 'var(--c-surface, #fff)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', borderRadius: 8, padding: 8, zIndex: 1, width: 200 }}
        >
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)', marginBottom: 2 }}>
            Chuyên khoa
          </label>
          <select
            data-testid={`chon-chuyen-khoa-${bang.id}`}
            value={bang.chuyenKhoa ?? SPECIALTIES[0].id}
            onChange={(e) => onDoiChuyenKhoa(e.target.value)}
            className="mind-focus-ring"
            style={{ width: '100%', fontSize: 12.5, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--c-line, #d9ddf4)', marginBottom: 8 }}
          >
            {SPECIALTIES.map((kh) => (
              <option key={kh.id} value={kh.id}>{kh.name}</option>
            ))}
          </select>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--c-text-muted, #6b6e96)', marginBottom: 2 }}>
            Tag
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
            {(bang.tags ?? []).map((t) => (
              <span
                key={t}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, padding: '2px 6px', borderRadius: 999, background: 'var(--c-surface-alt, #f6f7fd)' }}
              >
                {t}
                <button
                  type="button"
                  aria-label={`Xoá tag ${t}`}
                  onClick={() => onXoaTag(t)}
                  className="mind-focus-ring"
                  style={{ border: 0, background: 'none', padding: 0, fontSize: 11, lineHeight: 1, color: 'var(--c-text-muted, #6b6e96)' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            data-testid={`nhap-tag-${bang.id}`}
            value={tagNhap}
            onChange={(e) => setTagNhap(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const tagSach = tagNhap.trim()
              if (tagSach) onThemTag(tagSach)
              setTagNhap('')
            }}
            placeholder="Thêm tag, Enter để lưu"
            className="mind-focus-ring"
            style={{ width: '100%', fontSize: 12.5, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--c-line, #d9ddf4)' }}
          />
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
  const [dangSuaTagId, setDangSuaTagId] = useState<string | null>(null)
  const [dangXacNhanXoaId, setDangXacNhanXoaId] = useState<string | null>(null)
  // Mang cả OBJECT (không chỉ id) — cần đủ dữ liệu gốc để đánh dấu daXoaLuc rồi đưa thẳng cho dải
  // "Hoàn tác" mà không phải tra lại danhSach sau khi bang đã bị lọc khỏi danh sách hiển thị.
  const [dangChoXoa, setDangChoXoa] = useState<BangMeta | null>(null)
  // Bang vừa xoá mềm xong — điều khiển dải "Hoàn tác". null nghĩa là không có dải nào đang hiện.
  const [vuaXoa, setVuaXoa] = useState<BangMeta | null>(null)
  // Dải "Hoàn tác" (vuaXoa) chỉ sống HOAN_TAC_XOA_MS rồi tắt im lặng — nếu người dùng bị gọi đi
  // giữa ca trực (đúng bối cảnh PRODUCT.md mô tả) và bỏ lỡ, bảng vẫn còn thật trong IndexedDB
  // (daXoaLuc được set) nhưng trước đây KHÔNG có đường nào lấy lại nữa — vi phạm thẳng lời hứa "xoá
  // mềm, phục hồi được". Panel này là lưới an toàn tối thiểu: không phải màn "thùng rác" đầy đủ (dọn
  // vĩnh viễn, sắp xếp theo ngày...), chỉ để mở lại được những gì vuaXoa đã bỏ lỡ.
  const [hienDaXoaGanDay, setHienDaXoaGanDay] = useState(false)
  // null = "Tất cả" (không lọc). Không đưa vào URL/localStorage — lọc chỉ có ý nghĩa trong phiên
  // đang xem lưới, giống các bộ lọc tạm thời khác của app (SearchScreen.activeFilter).
  const [chuyenKhoaLoc, setChuyenKhoaLoc] = useState<string | null>(null)

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
  // Chip chuyên khoa lọc THÊM sau đó — bang thiếu chuyenKhoa (bản ghi cũ chưa backfill, xem
  // boardMeta.ts) coi như thuộc chuyên khoa đầu tiên trong SPECIALTIES.
  const danhSachSapXep = [...danhSach]
    .filter((b) => !b.daXoaLuc)
    .filter((b) => !chuyenKhoaLoc || (b.chuyenKhoa ?? SPECIALTIES[0].id) === chuyenKhoaLoc)
    .sort((a, b) => b.capNhatLuc - a.capNhatLuc)
  // Xoá gần đây nhất lên đầu — người mở panel này thường đang tìm đúng bảng vừa lỡ tay bấm Hoàn tác.
  const daXoaGanDay = danhSach.filter((b) => b.daXoaLuc).sort((a, b) => (b.daXoaLuc ?? 0) - (a.daXoaLuc ?? 0))

  const taoBangMoi = () => {
    const luc = Date.now()
    const meta: BangMeta = {
      id: taoIdBang(),
      ten: 'Bảng chưa đặt tên',
      taoLuc: luc,
      capNhatLuc: luc,
      chuyenKhoa: SPECIALTIES[0].id,
      tags: [],
      noiDungTimKiem: '',
    }
    add(meta)
    // Trước đây mở thẳng vào canvas (onMoBang) — ba bảng tạo liên tiếp đều dừng lại ở tên mặc định
    // "Bảng chưa đặt tên" và ảnh xem trước GIỐNG HỆT NHAU byte-cho-byte (canvas trống chụp y hệt),
    // không cách nào phân biệt trong lưới. Giữ người dùng lại ở danh sách, mở luôn ô đổi tên cho thẻ
    // vừa tạo — họ đặt tên trước rồi mới bấm vào để vẽ, đúng lúc còn nhớ đang tạo bảng cho việc gì.
    setDangSuaTenId(meta.id)
    // Bảng mới LUÔN được gán chuyenKhoa: SPECIALTIES[0].id — nếu chip lọc đang chọn một chuyên khoa
    // KHÁC, thẻ vừa tạo sẽ không khớp bộ lọc và biến mất khỏi lưới ngay khi vừa ghi xong (bấm "+"
    // trông như không phản ứng gì, trong khi một bản ghi mồ côi đã lặng lẽ vào IndexedDB — review
    // lượt 1 phát hiện). Đưa bộ lọc về "Tất cả" ngay khi tạo để thẻ mới chắc chắn hiện ra.
    setChuyenKhoaLoc(null)
  }

  return (
    <>
    <div className={`scroll-ios h-full${dungTuBang ? ' board-out' : ''}`}>
      {daXoaGanDay.length > 0 && (
        <div style={{ padding: '12px 16px 0' }}>
          <button
            type="button"
            data-testid="mo-da-xoa-gan-day"
            onClick={() => setHienDaXoaGanDay(!hienDaXoaGanDay)}
            className="mind-focus-ring"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--c-text-muted, #6b6e96)',
              background: 'none',
              border: 0,
              padding: '4px 2px',
              borderRadius: 4,
            }}
            aria-expanded={hienDaXoaGanDay}
          >
            {hienDaXoaGanDay ? '▾' : '▸'} Đã xoá gần đây ({daXoaGanDay.length})
          </button>
          {hienDaXoaGanDay && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, marginBottom: 8 }}>
              {daXoaGanDay.map((b) => (
                <div
                  key={b.id}
                  data-testid={`da-xoa-gan-day-${b.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    background: 'var(--c-surface-alt, #f6f7fd)',
                    borderRadius: 8,
                  }}
                >
                  {/* Cùng chấm màu ổn định theo id với lưới chính — hai bảng "Bảng chưa đặt tên"
                      trong panel này giờ phân biệt được TRƯỚC KHI bấm Hoàn tác nhầm (critique lượt 3). */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: `hsl(${mauOnDinh(b.id)} var(--chip-s) var(--chip-l))`,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      color: 'var(--c-text-muted, #6b6e96)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {b.ten}
                  </span>
                  <button
                    type="button"
                    data-testid={`hoan-tac-gan-day-${b.id}`}
                    onClick={() => update({ ...b, daXoaLuc: undefined })}
                    className="mind-focus-ring"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--c-primary, #2d3a94)',
                      background: 'none',
                      border: 0,
                      padding: '4px 6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Hoàn tác
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {danhSach.filter((b) => !b.daXoaLuc).length > 0 && (
        <div
          // role="group" + nút toggle aria-pressed là mẫu ARIA đúng cho một cụm nút bật/tắt độc lập
          // — KHÔNG dùng role="tablist" (đó là mẫu điều hướng dạng tab, đòi hỏi role="tab" +
          // aria-selected + roving tabindex, không khớp cấu trúc button/aria-pressed ở đây). Ruling
          // review lượt 1.
          role="group"
          aria-label="Lọc theo chuyên khoa"
          style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 8px' }}
        >
          <button
            type="button"
            data-testid="chip-chuyen-khoa-tat-ca"
            onClick={() => setChuyenKhoaLoc(null)}
            aria-pressed={chuyenKhoaLoc === null}
            className="mind-focus-ring"
            style={{
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid var(--c-line, #d9ddf4)',
              background: chuyenKhoaLoc === null ? 'var(--c-primary, #2d3a94)' : 'none',
              color: chuyenKhoaLoc === null ? '#fff' : 'var(--c-text-muted, #6b6e96)',
            }}
          >
            Tất cả
          </button>
          {SPECIALTIES.map((kh) => (
            <button
              key={kh.id}
              type="button"
              data-testid={`chip-chuyen-khoa-${kh.id}`}
              onClick={() => setChuyenKhoaLoc(kh.id)}
              aria-pressed={chuyenKhoaLoc === kh.id}
              className="mind-focus-ring"
              style={{
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid var(--c-line, #d9ddf4)',
                background: chuyenKhoaLoc === kh.id ? kh.color : 'none',
                color: chuyenKhoaLoc === kh.id ? '#fff' : 'var(--c-text-muted, #6b6e96)',
              }}
            >
              {kh.name}
            </button>
          ))}
        </div>
      )}
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
              dangXoa={dangChoXoa?.id === bang.id}
              dangSuaTen={dangSuaTenId === bang.id}
              dangMoMenu={dangMoMenuId === bang.id}
              dangXacNhanXoa={dangXacNhanXoaId === bang.id}
              dangSuaTag={dangSuaTagId === bang.id}
              onMo={() => onMoBang(bang.id)}
              onBatMenu={() => setDangMoMenuId(dangMoMenuId === bang.id ? null : bang.id)}
              onBatSuaTen={() => {
                setDangMoMenuId(null)
                setDangSuaTenId(bang.id)
              }}
              onBatSuaTag={() => {
                setDangMoMenuId(null)
                setDangSuaTagId(dangSuaTagId === bang.id ? null : bang.id)
              }}
              onDoiChuyenKhoa={(id) => {
                update({ ...bang, chuyenKhoa: id })
                // Chip lọc đang chọn MỘT chuyên khoa khác id vừa gán → bảng sẽ rớt khỏi danhSachSapXep
                // ngay khi update() cập nhật state cục bộ (cùng lượt render), kéo theo panel đang mở
                // (dangSuaTag) unmount cùng lúc — người dùng vừa đổi chuyên khoa thì cả thẻ lẫn panel
                // biến mất không một lời giải thích. Đúng lớp lỗi review Task 2 đã bắt ở taoBangMoi
                // (tạo bảng dưới chip lọc khác cũng làm thẻ mới biến mất) — cùng cách vá: đưa bộ lọc
                // về "Tất cả" ngay khi thao tác khiến bảng đang thao tác rớt khỏi bộ lọc hiện tại.
                if (chuyenKhoaLoc && chuyenKhoaLoc !== id) setChuyenKhoaLoc(null)
              }}
              onLuuTen={(tenMoi) => {
                setDangSuaTenId(null)
                const tenSach = tenMoi.trim() || bang.ten
                // Bỏ qua nếu tên KHÔNG đổi (Escape-huỷ, hoặc blur không gõ gì) — trước đây luôn
                // ghi update() dù tên y hệt, bump capNhatLuc thành "Vừa xong" cho một thao tác
                // không làm gì cả, khiến tín hiệu "cập nhật gần đây" càng thêm sai lệch (critique
                // lượt 3, 2026-08-24 — xác nhận trực tiếp bằng Escape trên Browser pane thật).
                if (tenSach === bang.ten) return
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
              onThemTag={(tag) => {
                const hienCo = bang.tags ?? []
                if (hienCo.includes(tag)) return
                update({ ...bang, tags: [...hienCo, tag] })
              }}
              onXoaTag={(tag) => update({ ...bang, tags: (bang.tags ?? []).filter((t) => t !== tag) })}
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
          role="status"
          aria-live="polite"
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
