import { useCallback, useState, useRef, useEffect, useMemo, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, type ReactElement } from "react"
import type { Antibiotic, DiseaseEntry, InfusionDrug, FlashCard } from "./data/types"
import { SPECIALTIES, PICKER_ITEMS, DISEASES, INFUSION_CATEGORIES, infusionCategory } from "./data"
import type { InfusionCategory } from "./data"
import { useLocalCollection } from "./lib/useLocalCollection"
import { useIdbCollection } from "./lib/useIdbCollection"
import { IDB_STORES, idbPut } from "./lib/idb"
import { CUSTOM_COLLECTION_KEYS } from "./lib/storage"
// BoardGallery (không phải EdgelessBoard) là điểm vào duy nhất cho tab Mindmap — nó tự import
// EdgelessBoard qua vỏ nạp chậm ./board/index.tsx bên trong, nên App.tsx KHÔNG được import thẳng
// EdgelessBoard.tsx ở đây: import thẳng kéo cả khối AFFiNE vào chung bundle vỏ app, phá mất phần
// tách chunk mà vỏ nạp chậm tồn tại để giữ, và bỏ luôn error boundary riêng của bảng vẽ (xem
// comment trong board/index.tsx và board/BoardGallery.tsx).
import { BoardGallery } from "./board/BoardGallery"
// mucMeta.ts KHÔNG import gì từ @blocksuite/* (D13), nên nhập cả GIÁ TRỊ (taoIdMuc) lẫn kiểu ở đây
// không phá phần tách chunk mà vỏ nạp chậm ở trên tồn tại để giữ. ChonDanhMuc.tsx cũng chỉ phụ
// thuộc React + mucMeta.ts, an toàn cùng lý do — canh bằng hai describe riêng "ChonDanhMuc.tsx —
// ranh giới D13" và "mucMeta.ts — ranh giới D13" trong ranh-gioi-nap-bang.spec.ts (mỗi describe soi
// thẳng file cùng tên), không suy luận. Hai ca D13 gốc trong cùng file đó chỉ soi index.tsx.
import { ChonDanhMuc } from "./board/ChonDanhMuc"
import { DANH_MUC, taoIdMuc, type IdDanhMuc, type LoaiMuc, type MucMeta } from "./board/mucMeta"
import {
  importWardRecipes,
  loadWardRecipes,
  clearWardRecipesForDrug,
  replaceAllWardRecipes,
} from "./lib/wardRecipes"
import { SW_UPDATE_EVENT, applyUpdate, useOnlineStatus } from "./lib/offline"
import { shouldRemindBackup, snoozeBackupReminder } from "./lib/backupReminder"
import { tickHaptic } from "./lib/haptics"
import { loadRecentReads, recordRead, type ReadEntry } from "./lib/recentReads"
import { specialtyIcon } from "./components/SpecialtyIcons"
import { icons } from "./components/icons"
import { ComingSoonScreen } from "./screens/ComingSoonScreen"
import { AddFlashcardScreen } from "./screens/AddFlashcardScreen"
import { HomeScreen, type RecentReadItem } from "./screens/HomeScreen"
// Re-export để test dựng riêng màn này (src/__tests__/SearchScreen.spec.ts) mà không phải dựng cả
// App — App() vẫn dùng y hệt như trước, không đổi hành vi.
import { SearchScreen } from "./screens/SearchScreen"
export { SearchScreen }
import { DataSyncScreen, type ImportPayload, type SyncSnapshot } from "./screens/DataSyncScreen"
import { DungThuocScreen } from "./screens/DungThuocScreen"
export { DungThuocScreen }
import { AddAntibioticScreen } from "./screens/dungThuoc/AddAntibioticScreen"
import { EditAntibioticScreen } from "./screens/dungThuoc/EditAntibioticScreen"
import { AddInfusionScreen } from "./screens/dungThuoc/AddInfusionScreen"
import { mergeWithOverrides } from "./screens/dungThuoc/antibioticMixingHelpers"
import { ThemeToggle } from "./screens/dungThuoc/ThemeToggle"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Screen =
  | "home"
  | "library"
  // Mục "Hướng dẫn" trên thanh điều hướng dưới — hiện rơi về ComingSoonScreen (chưa có nội dung
  // thật), giống các thẻ "Truy cập nhanh" chưa xây khác. Thiếu tên này khỏi Screen là lỗi kiểu dữ
  // liệu thuần tuý (hai chỗ dùng "guideline" đã khớp nhau từ trước) — không đổi hành vi khi thêm.
  | "guideline"
  | "search"
  | "mindmap"
  | "flashcard"
  | "specialty"
  // Màn lưới lọc theo MỘT danh mục — thay ba màn cũ (EcgScreen đã xoá ở giai đoạn 8, ComingSoonScreen của Phác đồ, và
  // thẻ Tiếp cận vấn đề). Danh mục nào nằm ở `danhMucDangXem` (state của App(), xem bên dưới),
  // không mã hoá vào tên màn: bốn nhánh Screen gần giống nhau đúng là thứ đã bị gộp một lần rồi
  // (xem addInfusion) — Task 7, kho-bai-viet-giai-doan-5-6.
  | "danhMuc"
  | "mixing"
  | "addAntibiotic"
  // Trước đây mỗi nhóm thuốc truyền có một màn "thêm" riêng ("addInotrope", "addVasoactive"...).
  // Cả 5 màn đó vốn dùng CHUNG một component (AddInfusionScreen) và chỉ khác nhau ở tham số
  // `category`, nên nay gộp thành một màn duy nhất mang theo nhóm đang thêm — xem addInfusionCategory
  // trong App(). Nhờ vậy thêm nhóm mới không phải thêm một nhánh Screen nữa.
  | "addInfusion"
  | "editAntibiotic"
  | "editInfusion"
  | "dataSync"
  | "addFlashcard"
  | "comingSoon"

// ─── Data ────────────────────────────────────────────────────────────────────
// Toàn bộ data tham khảo (bài viết, thẻ ghi nhớ, kháng sinh, bệnh lý, thuốc truyền tĩnh mạch...)
// đã được tách sang thư mục src/data/*.ts — import ở đầu file. Xem src/data/index.ts.


// ─── Components ───────────────────────────────────────────────────────────────

// ─── Bộ chọn chuyên khoa — dải cung cong ngang ────────────────────────────────
// Nút nhỏ ở góc trên phải mở ra một danh sách nằm trên MỘT CUNG TRÒN cong ngang sang trái: dòng
// đang chọn ở sát mép phải, càng xa dòng giữa thì càng dạt sang trái, nghiêng theo tiếp tuyến, nhỏ
// và mờ dần. Không có khung/hộp bao quanh — danh sách trôi tự do trên nền trang.
//
// Vì không có hộp nền, chữ phải tự đứng vững trên mọi nội dung phía sau: dùng chữ đậm màu tối +
// quầng sáng trắng quanh chữ, cộng một lớp mờ nền rất nhẹ được che biên bằng mask (mask làm lớp mờ
// tan dần ra rìa nên không tạo ra đường viền hộp nào).
//
// Trong lúc cuộn, mỗi lần dòng giữa đổi sẽ gọi onSelect(id, false) để màn hình phía sau đổi theo
// ngay (xem trước nội dung khoa đó); khi dừng hẳn mới gọi onSelect(id, true) và đóng lại.

// Bán kính cung — tâm cung nằm bên PHẢI danh sách, nên cung ưỡn về phía trái: dòng đang chọn thụt
// vào trong nhất, càng xa dòng giữa càng dạt ra mép phải. (Ngược chiều với bản trước.)
const ARC_RADIUS = 195
// Góc giữa hai dòng liền nhau trên cung. Đặt 11° để trong tầm nhìn (±MAX_ROW_ANGLE) luôn hiện được
// khoảng 11 chuyên khoa — đủ để lướt mắt chọn, thay vì chỉ thấy 3 dòng quanh dòng đang chọn.
const ROW_ANGLE = 11
// Khoảng cách dọc giữa hai dòng ở giữa cung, cũng là số px ngón tay phải kéo để qua một dòng.
const ITEM_H = ARC_RADIUS * Math.sin((ROW_ANGLE * Math.PI) / 180)
// Quá góc này thì dòng đã cong ra khỏi tầm nhìn — ẩn hẳn.
const MAX_ROW_ANGLE = 55
// Độ dạt ngang lớn nhất của dòng ở hai đầu cung. Dùng để đẩy cả vùng chứa vào trong đúng bấy nhiêu,
// nhờ vậy dòng ở đầu cung vừa chạm mép phải chứ không tràn ra ngoài màn hình.
const ARC_MAX_X = ARC_RADIUS * (1 - Math.cos((MAX_ROW_ANGLE * Math.PI) / 180))
// Kích thước vùng chứa dải cung: cao đủ trọn hai đầu cung, rộng đủ cho phần dạt ngang cộng dòng
// chữ dài nhất ("Sinh lý - Sinh lý bệnh").
const PICKER_H = Math.ceil(2 * ARC_RADIUS * Math.sin((MAX_ROW_ANGLE * Math.PI) / 180)) + 16
const PICKER_W = 288

function SpecialtyPicker({
  onSelect,
  currentId,
  thuGon,
}: {
  onSelect: (id: string, isFinal: boolean) => void
  currentId: string
  /**
   * Task 7 review (I4) — CHỈ truyền `true` cho màn "specialty". Ẩn tên chuyên khoa trong nút mở
   * (chỉ còn icon + chevron), giữ nguyên `aria-label` đầy đủ cho trình đọc màn hình. Lý do: đo
   * thật bằng getBoundingClientRect() ở 375px (xem chú thích tại cụm nút nổi, App shell) cho thấy
   * bản đầy nhãn (rộng tới 138px khi tên dài như "Sinh lý (bệnh)") không có cách nào vừa tránh đè
   * lên nút "Chọn" của ScreenHeader (bên phải) VỪA tránh đè lên tiêu đề màn (bên trái) cùng lúc —
   * hai điều kiện đó triệt tiêu lẫn nhau ở MỌI giá trị `right` khi nhãn còn giữ nguyên bề rộng tối
   * đa. Bỏ nhãn thu nút xuống còn ~55px, mở đủ khoảng trống để dịch cụm nút sang trái mà không chạm
   * cả hai phía. Tên chuyên khoa không mất thông tin: `h1` của ScreenHeader đã hiển thị nó to và rõ
   * ngay cạnh, nhãn nhỏ trong nút vốn chỉ lặp lại đúng chữ đó.
   */
  thuGon?: boolean
}) {
  const N = PICKER_ITEMS.length
  const initialIndex = Math.max(0, PICKER_ITEMS.findIndex((s) => s.id === currentId))

  const [isOpen, setIsOpen] = useState(false)
  const [centerIndex, setCenterIndex] = useState(initialIndex)

  const stageRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])

  const offsetRef = useRef(initialIndex)
  // Vận tốc tính theo "số dòng trên mỗi khung hình 60fps" — nhân với dt thật ở mỗi khung để tốc độ
  // trôi giống nhau trên máy 60Hz và 120Hz.
  const velocityRef = useRef(0)
  const draggingRef = useRef(false)
  const dragStartYRef = useRef(0)
  const dragStartOffsetRef = useRef(0)
  const movedRef = useRef(0)
  const lastYRef = useRef(0)
  const lastTRef = useRef(0)
  const lastVRef = useRef(0)
  const frameTRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const wheelTimerRef = useRef<number | null>(null)
  const downIndexRef = useRef<number | null>(null)
  const lastShownIndexRef = useRef(initialIndex)
  const isOpenRef = useRef(false)

  function clampIndex(i: number) {
    return Math.max(0, Math.min(N - 1, i))
  }

  function render(o: number) {
    rowRefs.current.forEach((el, i) => {
      if (!el) return
      const angle = (i - o) * ROW_ANGLE
      const abs = Math.abs(angle)
      if (abs > MAX_ROW_ANGLE) {
        el.style.opacity = "0"
        el.style.pointerEvents = "none"
        return
      }
      const rad = (angle * Math.PI) / 180
      // Toạ độ trên cung: y chạy dọc theo cung, x dạt sang PHẢI theo độ cong (0 ở dòng giữa) — cung
      // ưỡn về bên trái, ngược chiều bản trước.
      const y = ARC_RADIUS * Math.sin(rad)
      const x = ARC_RADIUS * (1 - Math.cos(rad))
      const t = abs / MAX_ROW_ANGLE
      const scale = 0.66 + 0.34 * Math.cos(rad)
      el.style.transform =
        `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotateY(${(-angle * 0.42).toFixed(2)}deg) rotate(${(-angle * 0.3).toFixed(2)}deg) scale(${scale.toFixed(3)})`
      // Mờ dần chậm ở gần tâm rồi tắt nhanh ở rìa (1 - t²): các dòng xa vẫn đọc được lờ mờ nên
      // biết trước mình đang cuộn tới đâu, mà rìa cung vẫn tan hẳn chứ không cắt ngang đột ngột.
      el.style.opacity = Math.max(0, 1 - t * t).toFixed(3)
      // Chỉ vài dòng quanh tâm mới bấm chọn được — dòng ở rìa quá nhỏ và mờ, bấm rất dễ trượt.
      el.style.pointerEvents = abs < ROW_ANGLE * 3.5 ? "auto" : "none"
      const near = Math.max(0, 1 - abs / (ROW_ANGLE * 1.7))
      const label = el.querySelector<HTMLSpanElement>(".picker-row-label")
      if (label) {
        label.style.color = near > 0.5 ? "var(--c-text)" : "var(--c-text-soft)"
        label.style.fontWeight = near > 0.5 ? "700" : "500"
      }
      // Chấm màu chuyên khoa chỉ sáng lên ở dòng đang chọn — dấu hiệu "đang chọn" thay cho dải
      // sáng/khung của bản cũ, vì lần này danh sách không có hộp nền.
      const dot = el.querySelector<HTMLSpanElement>(".picker-row-dot")
      if (dot) {
        dot.style.opacity = near.toFixed(3)
        dot.style.transform = `scale(${(0.4 + near * 0.6).toFixed(3)})`
      }
    })
    const idx = clampIndex(Math.round(o))
    if (idx !== lastShownIndexRef.current) {
      lastShownIndexRef.current = idx
      setCenterIndex(idx)
      tickHaptic()
      if (isOpenRef.current) onSelect(PICKER_ITEMS[idx].id, false)
    }
  }

  function clampSoft(o: number) {
    if (o < 0) return o * 0.45
    if (o > N - 1) return (N - 1) + (o - (N - 1)) * 0.45
    return o
  }

  function stopAnim() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  // Trượt về đúng một dòng. Thời lượng co giãn theo quãng đường: đi gần thì nhanh gọn, đi xa vẫn
  // kịp nhìn — cùng một hằng số 380ms cho mọi quãng đường trước đây làm cú chỉnh nhỏ thấy ì.
  function snapTo(target: number, onDone?: () => void) {
    stopAnim()
    const start = offsetRef.current
    const dist = target - start
    if (Math.abs(dist) < 0.001) {
      offsetRef.current = target
      render(offsetRef.current)
      onDone?.()
      return
    }
    const duration = Math.min(430, Math.max(180, Math.abs(dist) * 140))
    const t0 = performance.now()
    function step(now: number) {
      const t = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - t, 5)
      offsetRef.current = start + dist * eased
      render(offsetRef.current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        offsetRef.current = target
        render(offsetRef.current)
        rafRef.current = null
        onDone?.()
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  function momentumStep(now: number) {
    // Tính theo thời gian thật giữa 2 khung hình thay vì coi mỗi khung là một bước cố định — nếu
    // không, cùng một cú vẩy sẽ trôi nhanh gấp đôi trên màn 120Hz và giật khi máy rớt khung hình.
    const dt = Math.min(50, now - frameTRef.current)
    frameTRef.current = now
    const steps = dt / 16.7
    offsetRef.current = clampSoft(offsetRef.current + velocityRef.current * steps)
    velocityRef.current *= Math.pow(0.935, steps)
    render(offsetRef.current)
    const outOfRange = offsetRef.current < 0 || offsetRef.current > N - 1
    if (Math.abs(velocityRef.current) > 0.015 && !outOfRange) {
      rafRef.current = requestAnimationFrame(momentumStep)
    } else {
      commitSelection(clampIndex(Math.round(offsetRef.current)))
    }
  }

  function commitSelection(idx: number) {
    snapTo(idx, () => {
      setIsOpen(false)
      onSelect(PICKER_ITEMS[idx].id, true)
    })
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    stopAnim()
    draggingRef.current = true
    movedRef.current = 0
    dragStartYRef.current = e.clientY
    dragStartOffsetRef.current = offsetRef.current
    lastYRef.current = e.clientY
    lastTRef.current = performance.now()
    lastVRef.current = 0
    const target = (e.target as HTMLElement).closest("[data-row-index]")
    downIndexRef.current = target ? Number(target.getAttribute("data-row-index")) : null
    try {
      // Bắt con trỏ để ngón tay kéo ra ngoài bảng vẫn cuộn tiếp. Trình duyệt có thể từ chối nếu
      // con trỏ đó không còn hoạt động — không bắt được thì vẫn cuộn bình thường, chỉ là kéo ra
      // ngoài sẽ mất dấu, nên nuốt lỗi thay vì để văng ra giữa thao tác.
      stageRef.current?.setPointerCapture(e.pointerId)
    } catch {
      // bỏ qua
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return
    const dy = e.clientY - dragStartYRef.current
    movedRef.current = Math.max(movedRef.current, Math.abs(dy))
    offsetRef.current = clampSoft(dragStartOffsetRef.current - dy / ITEM_H)
    render(offsetRef.current)
    const now = performance.now()
    const dt = now - lastTRef.current
    if (dt > 0) {
      const instant = ((lastYRef.current - e.clientY) / dt / ITEM_H) * 16.7
      // Làm mượt vận tốc thay vì lấy nguyên giá trị của lần di chuyển cuối: ngón tay luôn rung nhẹ
      // lúc nhấc lên, lấy thô sẽ ra những cú vẩy mạnh yếu thất thường.
      lastVRef.current = lastVRef.current * 0.7 + instant * 0.3
    }
    lastYRef.current = e.clientY
    lastTRef.current = now
  }

  function onPointerUp() {
    if (!draggingRef.current) return
    draggingRef.current = false
    if (movedRef.current < 6) {
      // Chạm (không kéo): trúng dòng nào thì chọn dòng đó; chạm vào khoảng trống trong bảng thì
      // hiểu là xác nhận dòng đang ở giữa — trước đây chạm trượt ra ngoài dòng là không có phản
      // hồi gì, người dùng tưởng máy đơ.
      commitSelection(downIndexRef.current ?? clampIndex(Math.round(offsetRef.current)))
      return
    }
    velocityRef.current = Math.max(-2.2, Math.min(2.2, lastVRef.current))
    if (Math.abs(velocityRef.current) < 0.03) {
      commitSelection(clampIndex(Math.round(offsetRef.current)))
    } else {
      frameTRef.current = performance.now()
      rafRef.current = requestAnimationFrame(momentumStep)
    }
  }

  // Lăn chuột / trackpad trên máy tính — điện thoại dùng ngón tay ở các hàm pointer bên trên.
  function onWheel(e: ReactWheelEvent<HTMLDivElement>) {
    stopAnim()
    offsetRef.current = clampSoft(offsetRef.current + e.deltaY / ITEM_H)
    render(offsetRef.current)
    if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
    // Chốt lựa chọn sau khi ngừng lăn một nhịp ngắn — lăn chuột không có sự kiện "nhấc tay".
    wheelTimerRef.current = window.setTimeout(() => commitSelection(clampIndex(Math.round(offsetRef.current))), 170)
  }

  useEffect(() => {
    render(offsetRef.current)
    return () => {
      stopAnim()
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    isOpenRef.current = isOpen
    if (isOpen) {
      offsetRef.current = centerIndex
      render(offsetRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      const idx = PICKER_ITEMS.findIndex((s) => s.id === currentId)
      if (idx >= 0) {
        offsetRef.current = idx
        lastShownIndexRef.current = idx
        setCenterIndex(idx)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId])

  const current = PICKER_ITEMS[centerIndex]

  return (
    // Không còn tự neo tuyệt đối: nay nằm trong cụm nổi dùng chung với nút chủ đề ở App shell, nên
    // hai thứ không thể chồng lên nhau nữa (xem FloatingTopBar). `relative` để dải cung thả xuống
    // vẫn neo đúng vào nút này.
    <div className="relative">
      {/* Nút mở: nền đục + viền theo màu chuyên khoa để luôn tách khỏi nội dung phía sau
          (bản cũ trong suốt hoàn toàn nên chữ chìm vào nền trang). Vùng chạm cao 36px cho dễ bấm. */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-label={`Chuyên khoa đang xem: ${current.name}. Chạm để đổi.`}
        className="flex items-center gap-1.5 pl-2.5 pr-2 h-9 rounded-full active:scale-95"
        style={{
          background: isOpen ? `${current.color}14` : "var(--c-float-bg)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          boxShadow: isOpen ? `0 0 0 3px ${current.color}1a` : "0 2px 10px rgba(15,23,42,.10)",
          border: `1px solid ${isOpen ? `${current.color}59` : "var(--c-line)"}`,
          transition: "background .25s ease, border-color .25s ease, box-shadow .25s ease, transform .12s ease",
        }}
      >
        <span className="flex-none" style={{ color: current.color }}>{specialtyIcon(current.id, "w-[17px] h-[17px]")}</span>
        {/* Task 7 review (I4): ẩn ở màn "specialty" — xem chú thích dài tại prop `thuGon` phía trên. */}
        {!thuGon && (
          <span className="text-xs font-bold max-w-[76px] truncate" style={{ color: "var(--c-text)" }}>{current.name}</span>
        )}
        <svg
          viewBox="0 0 24 24" fill="none" stroke="var(--c-text-muted)" strokeWidth={2.5}
          className="w-3.5 h-3.5 flex-shrink-0"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .25s cubic-bezier(.34,1.4,.64,1)" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />}

      {/* Dải cung thả xuống NGAY DƯỚI nút, không canh giữa theo nút như bản trước: nút nằm sát mép
          trên màn hình nên danh sách canh giữa bị cắt mất gần 100px phía trên — mấy dòng đầu vừa
          không nhìn thấy vừa không bấm được. */}
      {isOpen && (
        <div
          className="absolute z-40 picker-pop"
          style={{ width: PICKER_W, height: PICKER_H, right: -6, top: "calc(100% + 4px)" }}
        >
          {/* Lớp làm mờ nền phía sau để chữ luôn đọc được. Mask hình bầu dục làm lớp mờ tan dần ra
              rìa nên KHÔNG để lại đường viền hộp nào — danh sách vẫn có cảm giác trôi tự do. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              // Tâm vệt mờ đặt lệch phải (78%) — đúng chỗ khối chữ nằm sau khi cả dải cung được
              // đẩy vào trong, chứ không dính hẳn mép phải như bản cung ưỡn phải trước đây.
              background:
                "radial-gradient(115% 72% at 78% 50%, rgba(var(--c-fog),.97) 0%, rgba(var(--c-fog),.88) 46%, rgba(var(--c-fog),0) 80%)",
              backdropFilter: "blur(14px) saturate(1.15)",
              WebkitBackdropFilter: "blur(14px) saturate(1.15)",
              WebkitMaskImage: "radial-gradient(110% 68% at 78% 50%, #000 42%, transparent 80%)",
              maskImage: "radial-gradient(110% 68% at 78% 50%, #000 42%, transparent 80%)",
            }}
          />

          <div
            ref={stageRef}
            className="absolute inset-0"
            style={{ perspective: "800px", touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
            role="listbox"
            aria-label="Danh sách chuyên khoa"
          >
            {/* Đẩy cả dải cung vào trong đúng bằng độ dạt lớn nhất: dòng ở hai đầu cung (dạt ra
                nhiều nhất) vừa chạm mép phải vùng chứa, không dòng nào tràn ra ngoài. */}
            <div
              className="absolute right-0 top-1/2"
              style={{ height: 0, width: "100%", transformStyle: "preserve-3d", transform: `translateX(${-ARC_MAX_X}px)` }}
            >
              {PICKER_ITEMS.map((s, i) => (
                // Neo bên PHẢI và transform-origin cũng ở bên phải: cung ưỡn về mép phải, các dòng
                // dạt dần sang trái mà đầu phải vẫn bám theo đường cong.
                <div
                  key={s.id}
                  ref={(el) => { rowRefs.current[i] = el }}
                  data-row-index={i}
                  role="option"
                  aria-selected={i === centerIndex}
                  className="absolute right-0 top-0 flex items-center justify-end gap-2 pr-3 cursor-pointer whitespace-nowrap"
                  style={{
                    height: ITEM_H,
                    marginTop: -ITEM_H / 2,
                    transformOrigin: "right center",
                    willChange: "transform, opacity",
                  }}
                >
                  <span className="flex-none" style={{ color: s.color }}>{specialtyIcon(s.id, "w-[19px] h-[19px]")}</span>
                  <span
                    className="picker-row-label text-[14px]"
                    style={{
                      color: "var(--c-text-soft)",
                      // Quầng sáng quanh chữ — thứ duy nhất giữ chữ đọc được khi không có hộp nền.
                      // Ở bản tối quầng phải TỐI (cùng màu lớp mờ) chứ không phải trắng, nếu không
                      // mỗi dòng chữ sáng lại đội một vầng trắng nhoè quanh mình.
                      textShadow: "0 0 10px rgba(var(--c-fog),.95), 0 1px 3px rgba(var(--c-fog),.9)",
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    className="picker-row-dot flex-none rounded-full"
                    style={{ width: 6, height: 6, background: s.color, opacity: 0, boxShadow: `0 0 6px ${s.color}88` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// `ScreenHeader` (tiêu đề màn hình dùng chung) đã tách ra ./components/ScreenHeader.tsx — MỘT nguồn
// sự thật cho mọi màn cấp-tab (Thư viện / Dùng thuốc / Ôn tập / Mindmap). Xem chú thích trong file đó.


// ─── Dải "có bản cập nhật" ────────────────────────────────────────────────────
// Từ khi app chạy được offline (public/sw.js), một máy đã cài có thể chạy mãi từ bản đã cache. Với
// app tra liều thì im lặng dùng bảng liều cũ là rủi ro thật — nên có bản mới là phải nói ra.
// Dải mỏng trên đầu trang — xem vì sao cần ở lib/offline.ts (useOnlineStatus). Đặt ở ĐẦU khung app
// (trước mọi màn hình) để hiện được trên MỌI tab, không riêng Trang chủ, và không tranh chỗ với
// UpdateBanner/toast vốn neo ở đáy.
function OfflineBar() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div
      className="flex-none fade-in flex items-center justify-center gap-2"
      style={{ height: 30, background: "var(--c-warn-soft)", borderBottom: "1px solid var(--c-warn-line)" }}
    >
      <span className="flex-none rounded-full" style={{ width: 6, height: 6, background: "var(--c-warn-icon)" }} />
      <span className="text-[12px] font-semibold" style={{ color: "var(--c-warn)" }}>
        Đang ngoại tuyến — xem dữ liệu đã lưu trên máy
      </span>
    </div>
  )
}

function UpdateBanner({ offsetBottom }: { offsetBottom: number | string }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const onUpdate = () => setReady(true)
    window.addEventListener(SW_UPDATE_EVENT, onUpdate)
    return () => window.removeEventListener(SW_UPDATE_EVENT, onUpdate)
  }, [])
  if (!ready) return null
  return (
    <div
      className="absolute left-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-full"
      style={{
        bottom: offsetBottom,
        transform: "translateX(-50%)",
        background: "rgba(15,23,42,.94)",
        boxShadow: "0 8px 24px rgba(15,23,42,.28)",
        whiteSpace: "nowrap",
      }}
    >
      <span className="text-[13px] font-semibold text-white">Có bản cập nhật dữ liệu</span>
      <button onClick={applyUpdate} className="text-[13px] font-bold px-3 py-1 rounded-full" style={{ background: "var(--c-surface)", color: "var(--c-primary-strong)" }}>
        Tải lại
      </button>
    </div>
  )
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Screen; navId?: string; label: string; icon: (active: boolean) => ReactElement }[] = [
  { id: "home", label: "Trang chủ", icon: icons.home },
  { id: "library", label: "Thư viện", icon: icons.library },
  { id: "guideline", label: "Hướng dẫn", icon: icons.guideline },
  { id: "mindmap", label: "Mindmap", icon: icons.mindmap },
  { id: "flashcard", label: "Thẻ ghi nhớ", icon: icons.cards },
]

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  // Lối tắt cài trên home screen (public/manifest.json → shortcuts) mở thẳng "/?screen=mixing" —
  // đọc MỘT lần lúc mount để vào thẳng tab đó, bỏ qua Trang chủ. Chỉ nhận giá trị khớp một trong
  // các tab thật của thanh nav dưới, giá trị lạ hoặc thiếu thì rơi về "home" như trước.
  const initialScreen = (): Screen => {
    const s = new URLSearchParams(window.location.search).get("screen")
    return s === "mixing" || s === "library" || s === "mindmap" || s === "flashcard" ? s : "home"
  }
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [activeTab, setActiveTab] = useState<Screen>(initialScreen)
  const [specialtyId, setSpecialtyId] = useState<string>("cardiology")
  // Mở thẳng một mục theo id — dùng bởi kết quả tìm kiếm loại "board" (luôn nhắm instance Mindmap,
  // đi kèm navigate("mindmap", id)) VÀ luồng "Tạo bài mới" (nhắm instance màn "danhMuc", xem
  // taoBaiVietMoi). Đợt vá cuối trước hợp nhất — C2: TỔNG QUÁT HOÁ từ chỗ chỉ instance Mindmap tiêu
  // thụ được state này — nay CẢ HAI instance nhận cùng moBangYeuCau/onMoBangYeuCauXong, mỗi instance
  // tự bỏ qua nếu không phải instance đang hiển thị (guard `dangHienTab`, xem BoardGallery.tsx).
  // Instance tiêu thụ rồi gọi onMoBangYeuCauXong() để đưa state này về undefined.
  const [moBangYeuCau, setMoBangYeuCau] = useState<string | undefined>(undefined)
  // Luồng "Tạo bài mới" ở Trang chủ (spec §3.5). Bảng chọn danh mục đứng ở App chứ không trong
  // HomeScreen vì sau khi tạo xong phải chuyển sang màn "danhMuc" đúng danh mục vừa chọn và mở mục
  // vừa tạo — hai việc chỉ App làm được (setMoBangYeuCau + navigate ở trên/dưới đây).
  const [taoBaiMoiDangMo, setTaoBaiMoiDangMo] = useState(false)
  // Khoá chống bấm đúp — CÙNG lớp lỗi đã vá cho taoMucVoiDanhMuc (LuoiMuc.tsx, Task 4, xem chú
  // thích dài ở đó): nút danh mục trong ChonDanhMuc không tự mang khoá `e.detail>1` (component đó
  // chỉ được phép import React + ./mucMeta, không thêm logic khoá), và onChon gọi
  // setTaoBaiMoiDangMo(false) — một state React, chỉ có tác dụng ở lượt render SAU — TRƯỚC khi gọi
  // ĐỒNG BỘ taoBaiVietMoi. Hai cú click trúng nút danh mục trước khi React kịp gỡ lớp phủ
  // (double-fire trên một số trình duyệt cảm ứng) sẽ chạy trọn taoBaiVietMoi hai lần nếu không có
  // khoá riêng cho đường này. Đây là ref — cập nhật NGAY (không đợi render) — nên cú gọi thứ hai
  // đọc được giá trị `true` mà cú gọi đầu vừa gán và thoát sớm, trước khi tới idbPut(). Đặt lại
  // `false` mỗi lần MỞ bảng chọn (xem onTaoBaiMoi của HomeScreen bên dưới) để lượt tạo TIẾP THEO
  // không bị khoá oan bởi lượt tạo TRƯỚC đã thành công.
  const dangTaoBaiVietRef = useRef(false)
  // Tên tính năng đang xem ở màn "Sắp ra mắt" — id truyền qua navigate() khi bấm một thẻ Truy cập
  // nhanh chưa có màn thật.
  const [comingSoonFeature, setComingSoonFeature] = useState<string>("")
  // Danh mục đang xem ở màn "danhMuc" (Task 7) — id truyền qua onMoDanhMuc() khi bấm một thẻ Truy
  // cập nhanh trỏ vào một danh mục cụ thể (Tiếp cận vấn đề/ECG/Phác đồ). Cùng lý do comingSoonFeature
  // ở trên không mã hoá vào tên Screen: bốn nhánh Screen gần giống nhau chỉ khác danh mục đang lọc
  // đúng là thứ Task 7 gộp lại thành một.
  const [danhMucDangXem, setDanhMucDangXem] = useState<IdDanhMuc | null>(null)
  // Dải xác nhận ngắn sau khi lưu/xoá — xem showToast bên dưới.
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Chỉ để né chỗ với dải toast — UpdateBanner tự đứng riêng, xem component đó. Trước đây cả hai
  // dải này cùng neo đúng một `bottom`/`z-40`, nên lúc trùng nhau (vừa có bản cập nhật vừa có thao
  // tác vừa lưu) dải này ĐÈ THẲNG lên dải kia thay vì xếp chồng lên nhau.
  const [updateBannerVisible, setUpdateBannerVisible] = useState(false)
  useEffect(() => {
    const onUpdate = () => setUpdateBannerVisible(true)
    window.addEventListener(SW_UPDATE_EVENT, onUpdate)
    return () => window.removeEventListener(SW_UPDATE_EVENT, onUpdate)
  }, [])
  const [editAntibioticDraft, setEditAntibioticDraft] = useState<Antibiotic | null>(null)
  const [editInfusionDraft, setEditInfusionDraft] = useState<{ category: InfusionCategory; drug: InfusionDrug } | null>(null)
  // Nhóm đang được thêm thuốc mới ở màn "addInfusion" — trước đây thông tin này nằm trong chính tên
  // màn hình ("addInotrope", "addVasoactive"...), nên mỗi nhóm mới lại phải thêm một nhánh Screen.
  const [addInfusionCategory, setAddInfusionCategory] = useState<InfusionCategory>("inotrope")
  const [history, setHistory] = useState<Screen[]>([])
  // Những bài đã mở đọc, mới nhất trước (lưu trên máy — xem lib/recentReads.ts).
  const [recentReads, setRecentReads] = useState<ReadEntry[]>(loadRecentReads)

  // Các mục người dùng tự nhập — lưu trên máy (localStorage) nên còn nguyên qua các lần mở app.
  const customAntibioticsCol = useLocalCollection<Antibiotic>(CUSTOM_COLLECTION_KEYS.antibiotics)
  // Bệnh lý tự thêm — chủ yếu được tạo tự động khi sửa "Chỉ định riêng theo bệnh lý" của một kháng
  // sinh và gõ vào tên bệnh lý chưa có trong danh mục gốc (xem EditAntibioticScreen). `allDiseases`
  // gộp danh mục gốc với bản đã sửa/thêm, dùng thay cho DISEASES ở mọi nơi cần hiển thị hoặc chọn.
  const customDiseasesCol = useLocalCollection<DiseaseEntry>(CUSTOM_COLLECTION_KEYS.diseases)
  const allDiseases = useMemo(() => mergeWithOverrides(DISEASES, customDiseasesCol.items), [customDiseasesCol.items])
  // Mỗi nhóm thuốc truyền một collection, khoá lưu trữ lấy từ data/categories.ts. Danh sách nhóm là
  // hằng số ở cấp module (không đổi giữa các lần vẽ lại) nên số lượng và THỨ TỰ các lời gọi hook ở
  // đây luôn cố định — đúng điều kiện duy nhất mà React yêu cầu.
  //
  // PHẢI VIẾT TAY, không map được từ INFUSION_CATEGORIES: luật hook của React cấm gọi hook trong
  // vòng lặp. Cái giá là object này có thể LỆCH khỏi danh mục, và đã lệch thật — commit f516701
  // ("xóa nhóm thuốc An thần + Thần kinh") chỉ sửa data/categories.ts, để lại ở đây hai dòng
  // `sedation`/`neuro`. `infusionCategory()` với id lạ rơi về NHÓM ĐẦU TIÊN, nên hai dòng đó âm
  // thầm mở thêm hai collection trỏ vào đúng khoá "customInotropes" của nhóm Co bóp. Không hỏng dữ
  // liệu (useLocalCollection chỉ ghi khi add/update/remove, mà không ai đọc hai dòng này) nhưng
  // `tsc` đỏ suốt một ngày mà không cổng nào chạy `tsc`.
  // Nay có src/__tests__/nhom-thuoc-truyen-dong-bo.spec.ts canh đúng chuyện đó trong `npm test`.
  const infusionCols: Record<InfusionCategory, ReturnType<typeof useLocalCollection<InfusionDrug>>> = {
    inotrope: useLocalCollection<InfusionDrug>(infusionCategory("inotrope").storageKey),
    vasoactive: useLocalCollection<InfusionDrug>(infusionCategory("vasoactive").storageKey),
    vasodilator: useLocalCollection<InfusionDrug>(infusionCategory("vasodilator").storageKey),
    arrhythmia: useLocalCollection<InfusionDrug>(infusionCategory("arrhythmia").storageKey),
    electrolyte: useLocalCollection<InfusionDrug>(infusionCategory("electrolyte").storageKey),
    other: useLocalCollection<InfusionDrug>(infusionCategory("other").storageKey),
    antidote: useLocalCollection<InfusionDrug>(infusionCategory("antidote").storageKey),
  }
  // Chỉ danh sách mục, dạng tra theo nhóm — thứ mà DungThuocScreen và màn Đồng bộ dữ liệu cần.
  // Không bọc useMemo: đây là phép gom 9 tham chiếu mảng có sẵn, rẻ hơn hẳn việc so sánh 9 phần tử
  // deps, và không có nơi nhận nào phụ thuộc vào việc object này giữ nguyên tham chiếu.
  const customInfusions = Object.fromEntries(INFUSION_CATEGORIES.map((c) => [c.id, infusionCols[c.id].items])) as Record<
    InfusionCategory,
    InfusionDrug[]
  >
  const customFlashcardsCol = useLocalCollection<FlashCard>(CUSTOM_COLLECTION_KEYS.flashcards)
  // Kho bài viết/sơ đồ hợp nhất (giai đoạn 5-6) — cần ở App() để "Đã đọc gần đây" (recentReadItems,
  // dưới) tra được tiêu đề/danh mục của mục kind "muc". SearchScreen tự đọc collection RIÊNG của nó
  // (cùng store, một effect nạp khác) — hai chỗ đọc không đụng nhau, useIdbCollection không chia sẻ
  // state giữa hai lời gọi.
  const mucsCol = useIdbCollection<MucMeta>(IDB_STORES.mucs)

  // Nhắc sao lưu — tính theo TẤT CẢ mục tự nhập, hiện được ở bất cứ tab nào. Kho `mucs` (bài
  // viết/sơ đồ, hệ THAY THẾ ArticleScreen/EcgScreen đã xoá ở giai đoạn 8) PHẢI có mặt ở đây —
  // review Task 6/7 vòng 1 (Important 1) bắt sơ suất: hai vế cũ mất đi mà không ai thêm `mucsCol`
  // vào thay, khiến người dùng chỉ có bài viết/sơ đồ tự tạo (đúng nhóm plan này phục vụ) không bao
  // giờ được nhắc sao lưu. Đếm mục CÒN SỐNG (`!m.daXoaLuc`) — mục đã xoá mềm không phải "nội dung
  // đang có" cần sao lưu.
  const hasCustomContent =
    customAntibioticsCol.items.length > 0 ||
    customDiseasesCol.items.length > 0 ||
    INFUSION_CATEGORIES.some((c) => infusionCols[c.id].items.length > 0) ||
    customFlashcardsCol.items.length > 0 ||
    mucsCol.items.some((m) => !m.daXoaLuc)
  const [showBackupReminder, setShowBackupReminder] = useState(false)
  useEffect(() => {
    if (mucsCol.loading) return
    // Công thức pha đọc thẳng từ localStorage (không phải state React) — xem lib/wardRecipes.ts.
    const wardRecipeCount = Object.values(loadWardRecipes()).reduce((n, list) => n + list.length, 0)
    if (hasCustomContent || wardRecipeCount > 0) setShowBackupReminder(shouldRemindBackup())
  }, [mucsCol.loading, hasCustomContent])

  const NON_TAB_SCREENS: Screen[] = [
    "specialty",
    "search",
    "addAntibiotic",
    "addInfusion",
    "editAntibiotic",
    "editInfusion",
    "dataSync",
    "addFlashcard",
    "comingSoon",
    // Task 7 review (I1): "danhMuc" (màn lưới lọc theo MỘT danh mục — mở từ ba thẻ Truy cập nhanh
    // "Tiếp cận vấn đề"/"ECG"/"Phác đồ") thiếu ở đây làm HAI thứ sai cùng lúc: (a) isDetailScreen
    // (dưới) tính sai → thanh nav dưới HIỆN RA khi xem màn này, dù ba đích CŨ nó thay thế
    // (comingSoon/ecg) đều nằm trong mảng này nên nav luôn ẩn đúng; (b) navigate() gọi
    // setActiveTab("danhMuc") — "danhMuc" không khớp id nào trong NAV_ITEMS (chỉ có 5 tab cố định)
    // nên KHÔNG tab nào trong thanh nav vừa hiện ra được đánh dấu active. Thêm vào đây sửa cả hai.
    "danhMuc",
  ]

  function navigate(s: Screen, id?: string) {
    // Mở một bài để đọc = ghi vào "Đã đọc gần đây". Đặt ngay tại đây (chỗ duy nhất mọi đường dẫn tới
    // màn hình đọc bài đều đi qua: bấm thẻ, tìm kiếm, mở liên kết trong bài) nên không có lối vào
    // nào bị bỏ sót.
    if (s === "specialty" && id) setSpecialtyId(id)
    if (s === "mindmap" && id) setMoBangYeuCau(id)
    if (s === "comingSoon" && id) setComingSoonFeature(id)
    if (!NON_TAB_SCREENS.includes(s)) setActiveTab(s)
    setHistory((h) => [...h, screen])
    setScreen(s)
  }

  // VÒNG SỬA 1 (task-2, giai đoạn 7-9) — lỗi Critical đã sửa: panel "Đã đọc gần đây" không cập nhật
  // TRONG PHIÊN khi một mục `MucMeta` được mở qua BoardGallery (bấm thẻ trong lưới, hoặc mở thẳng
  // theo id qua moBangYeuCau) — trước bản vá này BoardGallery.tsx tự gọi thẳng `recordRead('muc',
  // id)` vào localStorage, nhưng `recentReads` là STATE của App() (dòng khai báo ở trên,
  // `useState(loadRecentReads)`, chỉ đọc MỘT LẦN lúc mount) nên không có gì kích App() render lại —
  // người dùng phải TẢI LẠI TRANG mới thấy panel đổi. BoardGallery là component KHÁC App(), không tự
  // gọi `setRecentReads` được, nên nó chỉ báo ngược lên qua prop `onDaDoc`; App() làm đúng khuôn ba
  // kind cũ trong navigate() ở trên — `setRecentReads(recordRead(...))` — ghi localStorage và cập
  // nhật state React nằm CHUNG một lệnh, một chỗ. useCallback vì hàm này nằm trong deps của effect
  // tiêu thụ `moBangYeuCau` ở CẢ NĂM instance BoardGallery (Thư viện/Hướng dẫn/Mindmap/danhMuc/chuyên
  // khoa) — không bọc thì mỗi lượt render App() lại là một hàm mới, làm cả năm effect đó chạy lại vô
  // ích mỗi lần.
  const ghiDaDocMuc = useCallback((id: string) => setRecentReads(recordRead('muc', id)), [])

  // Sinh một MucMeta loại "bai-viet" từ danh mục người dùng vừa chọn trong ChonDanhMuc, rồi mở
  // THẲNG vào trang soạn thảo — spec §3.5 "mở thẳng TrangBaiViet", KHÁC luồng tạo sơ đồ (sơ đồ dừng
  // lại ở lưới để đặt tên vì ba bảng trống trông giống hệt nhau; bài viết thì tiêu đề gõ ngay trong
  // trang, không cần dừng lại).
  //
  // Đợt vá cuối trước hợp nhất — C2: TỪNG kết thúc bằng navigate("mindmap") — lý do lịch sử là
  // đường mở-thẳng-một-mục-theo-id (moBangYeuCau/onMoBangYeuCauXong) chỉ được nối dây vào ĐÚNG MỘT
  // BoardGallery (instance tab Mindmap). Hệ quả thật: vỏ soạn thảo mở đúng loại, nhưng bấm "quay
  // lại" thì rơi vào LƯỚI MINDMAP — lưới đó lọc CỨNG loai:'so-do', nên bài viết vừa tạo không bao
  // giờ hiện ra ở đó (đọc như "bài viết biến mất"), và thanh nav dưới sáng đèn "Mindmap" dù người
  // dùng chưa từng chạm tab đó. Bản vá: TỔNG QUÁT HOÁ đường mở-theo-id thay vì vá chỗ hạ cánh bằng
  // một navigate khác — đặt danhMucDangXem = danhMuc (danh mục vừa chọn) rồi navigate("danhMuc").
  // Instance BoardGallery của nhánh "danhMuc" (bên dưới, JSX chính) nay cũng nhận
  // moBangYeuCau/onMoBangYeuCauXong như instance Mindmap — người dùng rơi vào lưới lọc theo DANH
  // MỤC (không lọc loai), nơi bài viết vừa tạo CÓ hiện. Xem BoardGallery.tsx (guard `dangHienTab`
  // trên effect tiêu thụ moBangYeuCau) để biết vì sao hai instance dùng CHUNG state này không mở
  // nhầm cả hai cùng lúc — instance Mindmap luôn mount nhưng `dangHienTab` của nó chỉ true khi
  // screen thật sự là "mindmap".
  const taoBaiVietMoi = async (danhMuc: IdDanhMuc) => {
    if (dangTaoBaiVietRef.current) return
    dangTaoBaiVietRef.current = true
    const luc = Date.now()
    const meta: MucMeta = {
      id: taoIdMuc(),
      loai: "bai-viet",
      danhMuc,
      ten: "Bài chưa đặt tên",
      taoLuc: luc,
      capNhatLuc: luc,
      chuyenKhoa: "",
      tags: [],
      noiDungTimKiem: "",
    }
    await idbPut(IDB_STORES.mucs, meta)
    setTaoBaiMoiDangMo(false)
    setDanhMucDangXem(danhMuc)
    setMoBangYeuCau(meta.id)
    navigate("danhMuc")
  }

  // Mở một mục kho `mucs` từ NGOÀI lưới (kết quả tìm kiếm toàn app — SearchScreen, Task 1; hoặc một
  // dòng "Đã đọc gần đây" ở Trang chủ — Task 2) — MỘT hàm dùng chung thay vì hai bản chép tay giống
  // hệt nhau, để hai lối vào luôn hạ cánh đúng cùng instance BoardGallery theo `loai`: sơ đồ nhắm
  // thẳng instance Mindmap, bài viết đặt danhMucDangXem rồi nhắm instance "danhMuc" (CHỈ instance
  // đang hiển thị mới tiêu thụ moBangYeuCau — guard dangHienTab trong BoardGallery.tsx).
  function moMucTuNgoai(id: string, loai: LoaiMuc, danhMuc: IdDanhMuc) {
    if (loai === "so-do") {
      setMoBangYeuCau(id)
      navigate("mindmap")
    } else {
      setDanhMucDangXem(danhMuc)
      setMoBangYeuCau(id)
      navigate("danhMuc")
    }
  }

  // Sửa thuốc trong "Dùng thuốc": khác các mục khác (tra theo id từ một danh sách có sẵn ở đây),
  // thuốc cần sửa có thể đến từ dữ liệu dựng sẵn (không nằm trong bất kỳ collection tự nhập nào) —
  // nên phải mang theo cả object thuốc, không chỉ id, vì vậy dùng hàm điều hướng riêng thay vì
  // `navigate()` (chỉ nhận id dạng string).
  function goToEditAntibiotic(drug: Antibiotic) {
    setEditAntibioticDraft(drug)
    setHistory((h) => [...h, screen])
    setScreen("editAntibiotic")
  }

  function goToEditInfusion(category: InfusionCategory, drug: InfusionDrug) {
    setEditInfusionDraft({ category, drug })
    setHistory((h) => [...h, screen])
    setScreen("editInfusion")
  }

  // Mở màn thêm thuốc mới cho một nhóm — nhóm đi kèm trong state chứ không nằm trong tên màn hình.
  function goToAddInfusion(category: InfusionCategory) {
    setAddInfusionCategory(category)
    navigate("addInfusion")
  }

  // "Đã đọc gần đây" cho Trang chủ: tra tiêu đề từ dữ liệu THẬT theo id đã lưu, nên bài đổi tên thì
  // dòng này đổi theo, bài đã xoá thì rơi ra khỏi danh sách thay vì để lại một dòng bấm vào không có
  // gì. Lấy 4 mục — vừa một khoảng cuối trang chủ, không phải cuộn thêm.
  const recentReadItems = useMemo<RecentReadItem[]>(() => {
    const out: RecentReadItem[] = []
    for (const e of recentReads) {
      if (out.length >= 4) break
      if (e.kind === "muc") {
        // Mục xoá mềm (daXoaLuc) đã biến khỏi lưới LuoiMuc/Mindmap và khỏi ô tìm kiếm chính (xem
        // SearchScreen) — phải biến khỏi "Đã đọc gần đây" cùng lý do: bấm vào không được mở một
        // mục người dùng tưởng đã xoá.
        const m = mucsCol.items.find((x) => x.id === e.id && !x.daXoaLuc)
        if (m)
          out.push({
            key: `muc:${m.id}`,
            id: m.id,
            title: m.ten,
            at: e.at,
            tag: DANH_MUC.find((d) => d.id === m.danhMuc)?.ten ?? "",
            muc: { loai: m.loai, danhMuc: m.danhMuc },
          })
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentReads, mucsCol.items])

  // Hiện một dải xác nhận ngắn ở đáy màn hình rồi tự tắt. Kèm một nhịp rung nhẹ: hai tín hiệu này
  // cho biết việc vừa làm đã xong thật, thay vì chỉ thấy màn hình đổi rồi tự hỏi "đã lưu chưa".
  function showToast(message: string) {
    setToast(message)
    tickHaptic()
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1900)
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  function handleSaveAntibiotic(a: Antibiotic, newDiseases: DiseaseEntry[] = []) {
    newDiseases.forEach((d) => customDiseasesCol.add(d))
    customAntibioticsCol.update(a)
    showToast("Đã lưu kháng sinh")
    goBack()
  }

  // Thêm mới và sửa đều ghi vào đúng collection của nhóm — không còn một hàm lưu riêng cho từng
  // nhóm (trước đây là 5 hàm giống hệt nhau cộng một `switch` 5 nhánh, tức là thêm nhóm mới phải
  // nhớ sửa đúng cả hai chỗ).
  function handleSaveInfusion(category: InfusionCategory, d: InfusionDrug) {
    infusionCols[category].update(d)
    goBack()
  }

  function handleSaveFlashcard(c: FlashCard) {
    customFlashcardsCol.add(c)
    showToast("Đã thêm thẻ ghi nhớ")
    goBack()
  }

  // Hình dạng = ImportPayload TRỪ `mucDocs`: nội dung doc CRDT đi đường khác (xem chú thích
  // ImportPayload phía trên) nên hàm này CỐ Ý không nhận trường đó. Tham chiếu ImportPayload qua
  // Omit<> thay vì chép tay hình dạng. Lưới `tsc` chỉ che MỘT chiều, đừng tin quá tay: BỚT một khoá
  // của ImportPayload thì thân hàm dưới đây đọc một trường không còn tồn tại ⇒ `tsc` đỏ, tự nhắc
  // thật. THÊM một khoá thì KHÔNG: `Omit<>` tự nở theo kiểu mới, thân hàm chỉ đơn giản không đọc
  // khoá mới và `tsc` im lặng hoàn toàn — không lưới nào bắt "quên xử lý khoá mới", phải tự nhớ.
  function handleImportData(data: Omit<ImportPayload, "mucDocs">) {
    if (data.antibiotics.length) customAntibioticsCol.upsertMany(data.antibiotics)
    if (data.diseases.length) customDiseasesCol.upsertMany(data.diseases)
    INFUSION_CATEGORIES.forEach((c) => {
      const list = data.infusions[c.id]
      if (list?.length) infusionCols[c.id].upsertMany(list)
    })
    if (data.flashcards.length) customFlashcardsCol.upsertMany(data.flashcards)
    if (data.wardRecipes.length) importWardRecipes(data.wardRecipes)
    if (data.mucs.length) mucsCol.upsertMany(data.mucs)
  }

  // Hoàn tác một lần nhập file: thay HẲN từng bảng bằng đúng snapshot chụp trước lúc nhập (khác
  // `handleImportData` — gộp theo id, không xoá mục file thêm mới).
  // Tham chiếu SyncSnapshot (kiểu có tên) thay vì chép tay hình dạng. Cùng cảnh báo như
  // `handleImportData` ở trên: BỚT một khoá của SyncSnapshot thì thân hàm đọc trường đã biến mất ⇒
  // `tsc` đỏ; THÊM một khoá thì tên kiểu tự nở theo, thân hàm chỉ không đọc khoá mới và `tsc` im
  // lặng — chiều đó không có lưới, phải tự nhớ khôi phục cả khoá mới.
  function handleRestoreSnapshot(snapshot: SyncSnapshot) {
    customAntibioticsCol.replaceAll(snapshot.antibiotics)
    customDiseasesCol.replaceAll(snapshot.diseases)
    INFUSION_CATEGORIES.forEach((c) => infusionCols[c.id].replaceAll(snapshot.infusions[c.id] ?? []))
    customFlashcardsCol.replaceAll(snapshot.flashcards)
    mucsCol.replaceAll(snapshot.mucs)
    // Chỉ có state cục bộ của DungThuocScreen đọc danh sách này — màn đó đã unmount lúc "Đồng bộ dữ
    // liệu" đang mở nên không cần đồng bộ state ở đây, chỉ cần ghi đúng xuống localStorage; lần sau
    // mở lại "Dùng thuốc" nó tự đọc lại từ đầu bằng loadWardRecipes().
    replaceAllWardRecipes(snapshot.wardRecipes)
  }

  function jumpTo(id: string) {
    if (id === "home") {
      if (screen !== "home") {
        setHistory((h) => [...h, screen])
        setScreen("home")
      }
      setActiveTab("home")
      return
    }
    setSpecialtyId(id)
    if (screen !== "specialty") {
      setHistory((h) => [...h, screen])
      setScreen("specialty")
    }
  }

  function goBack() {
    const prev = history[history.length - 1]
    if (prev) {
      setHistory((h) => h.slice(0, -1))
      setScreen(prev)
      if (!NON_TAB_SCREENS.includes(prev)) setActiveTab(prev)
    }
  }

  const isDetailScreen = NON_TAB_SCREENS.includes(screen)
  // Bảng sơ đồ KHÔNG phải một "screen" (nó sống trong tab Mindmap, do BoardGallery tự quản) nên
  // `NON_TAB_SCREENS` không với tới được — App chỉ biết có bảng đang mở nhờ tín hiệu BoardGallery
  // báo lên. Chủ dự án yêu cầu 2026-09-03: đang dùng sơ đồ thì ẩn thanh nav, ở mọi khung màn.
  const [bangDangMo, setBangDangMo] = useState(false)
  // Một biến duy nhất cho MỌI chỗ phụ thuộc "có thanh nav hay không" — thanh nav, lớp `has-nav` của
  // main, và hai dải nổi (UpdateBanner + dải báo đọc hỏng) vốn tự đẩy mình lên trên thanh nav. Bỏ
  // sót một chỗ là dải nổi lơ lửng giữa không trung ở đúng chiều cao của một thanh nav không còn.
  const anThanhNav = isDetailScreen || bangDangMo

  return (
    <div
      // `body` (index.css) đã tự ghim đúng khít khung nhìn thật bằng `position: fixed; inset: 0`.
      // Trước đây div này CŨNG tự `fixed inset-0` — tức là WebKit phải tính "khung nhìn" một lần
      // NỮA, độc lập với body. Trên máy thật, khi chạy như PWA cài ra màn hình chính, hai phép
      // tính đó đôi khi lệch nhau vài chục pixel: div này kết thúc SỚM hơn body một khoảng, để lộ
      // đúng màu nền của body phía dưới — chính là dải tối dưới thanh nav mà ảnh test cho thấy, và
      // vì vậy thanh nav (nằm trong div này) cũng dừng lại trước khi chạm đáy thật.
      // Sửa: cho div này ăn theo khung của body luôn (absolute + inset-0 lấy body — phần tử
      // position:fixed gần nhất — làm containing block) thay vì tự đo lại từ đầu. Chỉ còn MỘT nơi
      // duy nhất tính "viewport" ra sao, nên không thể vênh nhau nữa.
      id="app-shell"
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{
        background: "var(--c-surface)",
      }}
    >
        {/* Chừa chỗ cho tai thỏ / Dynamic Island. Trước đây cộng thêm 6px đệm vì thanh trạng thái
            từng trong suốt (black-translucent) đè lên nội dung — giờ thanh trạng thái đã đục, nằm
            hẳn ngoài khung nhìn của trang, nên --safe-top đã đủ, không cần đệm thêm nữa. */}
        <div className="flex-none" style={{ height: "var(--safe-top-trim)" }} />

        <OfflineBar />

        {/* Cụm nút nổi góc trên phải. Gom nút chủ đề và nút chọn chuyên khoa vào CÙNG một hàng
            flex thay vì để mỗi cái tự neo tuyệt đối: trước đây nút chuyên khoa neo `right: 18` và
            phủ z-50 lên đúng chỗ nút chủ đề nằm trong header Trang chủ — đo được chồng nhau 60px,
            tức là nút chủ đề bị che kín hoàn toàn. Nằm chung một hàng flex thì khoảng cách do
            `gap` quyết định, không cách nào đè lên nhau, và cả hai luôn thẳng một hàng ngang. */}
        {(screen === "home" || screen === "specialty") && (
          <div
            className="absolute z-50 flex items-center gap-2"
            // Đo THẬT bằng getBoundingClientRect() (không suy từ padding/line-height, quá nhiều lớp
            // để tính tay cho đúng): logo "Bs Trọng" mới có tỉ lệ rất ngang (1106×225 ≈ 4.9:1), nên
            // kích thước bị RÀNG BUỘC bởi paddingRight:180 chừa cho cụm nút — ở khung hẹp nhất
            // (375px, iPhone SE) chỉ còn ~175px bề ngang.
            //
            // TÂM LOGO Ở MÀN TRANG CHỦ = 38px khi --safe-top=0, cộng từ chính các lớp đang có
            // (HomeScreen, chỗ render icons.logo):
            //     pt-2 của .scroll-ios (8) + pt-2 của div header (8) + translate-y-2 của span (8)
            //     → mép trên logo y=24;  logo h-7 (28px) → tâm HÌNH HỌC = 24 + 14 = 38.
            // Nhưng dùng 35, KHÔNG phải 38: 38 khớp tâm HỘP của logo, còn mắt căn chữ-với-chữ theo
            // DẢI CHỮ ĐỌC ĐƯỢC (cap→baseline), mà dải đó của "Bs Trọng" nằm cao hơn tâm hộp ~3px vì
            // đuôi chữ "g"/"ọ" kéo hộp xuống. Đo thật (getBBox + rect ở 375px): dải cap của logo tâm
            // ~34,8px trong khi nhãn "Trang chủ" trong pill tâm 38px — lệch 3,2px, đúng triệu chứng
            // "hai button lệch so với logo" (phản hồi thật 2026-08-29). 35 kéo cụm nút lên khớp dải
            // cap. Chỉ sửa nhánh home; màn "specialty" (31) không có logo nên giữ nguyên.
            // Con số cũ ở đây là 24, tính theo giả định logo cao h-8 (32px) và KHÔNG có
            // translate-y-2. Cả hai giả định đó đã lỗi thời: logo hiện là h-7 và span bọc nó CÓ
            // translate-y-2. Hậu quả đo được thật (2026-08-26, người dùng báo): cụm nút nằm CAO HƠN
            // logo đúng 14px — nhìn như một hàng đầu trang nhưng lệch hẳn. Đã đo lại bằng
            // getBoundingClientRect() ở cả 375px và 390px: logo top=24 cao=28 tâm=38 ở cả hai, tức
            // hằng số này ổn định theo bề ngang (h-7 khoá chiều cao, w-auto chỉ co bề ngang).
            //
            // Vì sao tách riêng theo màn: logo "Bs Trọng" CHỈ có ở HomeScreen. Màn "specialty" dùng
            // header khác hẳn nên mốc căn khác, mà cụm nút này nổi chung cho cả hai màn.
            // TÂM HÀNG Ở MÀN CHUYÊN KHOA = 31px, cộng từ header của SpecialtyScreen (hệ cũ, đã
            // xoá ở giai đoạn 8):
            //     paddingTop 21 + nửa chiều cao hàng nút "Quay lại trang chủ" (20/2 = 10) = 31.
            // Đo thật bằng getBoundingClientRect(): nút back top=21 cao=20 tâm=31.
            // Trước đây màn này ăn chung số 24 của màn home nên lệch 7px — ít lộ hơn bên home (14px)
            // nên lọt qua nhiều lượt kiểm, tới khi người dùng chỉ đích danh mới thấy (2026-08-26).
            // CÁCH MỞ MÀN NÀY ĐỂ ĐO LẠI: picker chuyên khoa là bánh xe cuộn, chốt lựa chọn đi qua
            // snapTo() chạy bằng requestAnimationFrame — môi trường kiểm nào đóng băng rAF (vd
            // Browser pane không compositing) sẽ KHÔNG vào được màn này bằng click, phải thay tạm
            // requestAnimationFrame bằng setTimeout rồi mới mô phỏng chạm được.
            //
            // Cụm nút không nằm cùng flow với header nên mốc neo này độc lập, không tự khớp theo —
            // mỗi lần đổi bố cục header (chiều cao logo, padding, translate) PHẢI ĐO LẠI số này.
            // Dùng --safe-top-trim (không phải --safe-top): dòng spacer phía trên đã đổi sang biến
            // trim, header bên dưới nó dịch lên theo — mốc neo cụm nút phải dịch lên CÙNG MỘT LƯỢNG
            // mới còn thẳng hàng, để nguyên --safe-top thì cụm nút tụt lại phía sau 8px.
            //
            // Task 7 review (I4) — chú thích "31px" ở trên giờ mô tả một header ĐÃ NGỪNG RENDER
            // (SpecialtyScreen hệ cũ — đã xoá ở giai đoạn 8 — thay bằng ScreenHeader dùng chung từ
            // Task 7). Con số 31 tình
            // cờ vẫn khớp gần đúng hàng tiêu đề MỚI (đo thật: hàng ScreenHeader cao 12→48px, tâm
            // 30px) nên KHÔNG cần đổi trục dọc. Trục NGANG thì có: đo thật bằng
            // getBoundingClientRect() ở 375px, màn chuyên khoa có ≥1 mục (nút "Chọn" thật sự hiện)
            // — với `right: 18` cũ, cụm nút (chỉ SpecialtyPicker, không có ThemeToggle ở màn này)
            // choán x:[239.78,357.33], còn nút "Chọn" choán x:[292.04,355.33] — ĐÈ HẲN lên nhau
            // (63/63px bề ngang nút "Chọn" nằm dưới cụm nút, y cũng trùng gần hết: 13→49 so với
            // 12→48) — chụp màn hình xác nhận nút "Chọn" biến mất hoàn toàn phía sau cụm nút.
            // `right: 92` (đo lại SAU khi ẩn nhãn tên qua prop `thuGon` của SpecialtyPicker — xem
            // chú thích tại đó) đẩy cụm nút sang trái đủ để hết đè "Chọn" (buffer ~9px ở mọi bề
            // ngang màn hình, vì cả hai mép đều lấy theo `right`/padding cố định, không phải theo
            // % — xem chứng minh trong chú thích prop `thuGon`), mà vẫn không chạm tới tiêu đề dài
            // nhất ("Sinh lý (bệnh)", đo thật: text thật chỉ tới x=150, cụm nút thu gọn bắt đầu ở
            // x≈223 — dư khoảng 70px). CHỈ áp dụng cho "specialty": màn "home" không có nút "Chọn"
            // nào để đè lên, giữ nguyên 18 để cụm nút vẫn sát cạnh logo như cũ.
            style={{
              top: `calc(var(--safe-top-trim) + ${screen === "home" ? 35 : 31}px)`,
              right: screen === "specialty" ? 92 : 18,
              transform: "translateY(-50%)",
            }}
          >
            {screen === "home" && <ThemeToggle />}
            <SpecialtyPicker
              onSelect={jumpTo}
              currentId={screen === "home" ? "home" : specialtyId}
              thuGon={screen === "specialty"}
            />
          </div>
        )}

        {/* Vùng nội dung chiếm hết chiều cao còn lại SAU khi trừ thanh nav — nội dung dừng hẳn
            phía trên thanh nav, không thẻ nào bị cắt ngang. */}
        {/* Landmark <main>: trước đây toàn trang không có landmark ngữ nghĩa nào, trình đọc màn
            hình không có cách "nhảy" qua phần đầu (disclaimer, khung bệnh nhân...) tới thẳng nội
            dung chính. Đổi thẳng thẻ, không đổi class/style — main không có style mặc định khác
            div nên an toàn với toàn bộ layout đang có. */}
        {/* `relative`: mốc neo cho thẻ bọc bảng vẽ ngay bên dưới, thứ phải nằm ĐÚNG khung của main
            kể cả khi màn hình khác đang hiển thị. Không có nó, thẻ bọc `absolute inset-0` kia sẽ
            neo lên #app-shell và đổi kích thước mỗi lần ẩn/hiện — đúng thứ làm mất zoom. */}
        <main className={`relative flex-1 overflow-hidden${anThanhNav ? "" : " has-nav"}`}>
          {screen === "home" && (
            <HomeScreen
              onNavigate={navigate}
              onTaoBaiMoi={() => {
                // Đặt lại khoá chống bấm đúp mỗi lần MỞ bảng chọn — xem chú thích dài ở
                // dangTaoBaiVietRef: không đặt lại thì lượt tạo bài THỨ HAI (sau khi lượt đầu đã
                // thành công) sẽ bị khoá oan mãi mãi.
                dangTaoBaiVietRef.current = false
                setTaoBaiMoiDangMo(true)
              }}
              onMoDanhMuc={(d) => {
                setDanhMucDangXem(d)
                navigate("danhMuc")
              }}
              onMoMuc={moMucTuNgoai}
              recentReads={recentReadItems}
            />
          )}
          {/* Task 7: Thư viện dùng chung LuoiMuc qua BoardGallery — chỉ bài viết, loại trừ danh mục
              "Hướng dẫn" (đứng riêng, tab của chính nó ngay dưới). LibraryScreen (hệ cũ) đã bị xoá
              ở giai đoạn 8. */}
          {screen === "library" && (
            <BoardGallery
              dangHienTab
              tieuDe="Thư viện"
              loai="bai-viet"
              danhMucLoaiTru={['huong-dan']}
              loaiTaoDuoc={[]}
              onDangMoBang={setBangDangMo}
              onDaDoc={ghiDaDocMuc}
            />
          )}
          {screen === "search" && (
            <SearchScreen
              onNavigate={navigate}
              // moMucTuNgoai — cùng hàm mà HomeScreen dùng cho "Đã đọc gần đây" (Task 2), không tự
              // chế lại đường điều hướng riêng (xem chú thích dài tại chỗ khai báo hàm đó).
              onMoMuc={moMucTuNgoai}
              onBack={goBack}
              customFlashcards={customFlashcardsCol.items}
            />
          )}
          {/* FlashcardScreen vẫn hoãn lại — đưa "sắp ra mắt" thay vì để người dùng thấy một tab lỗi
              tùm lum. Vẫn giữ nguyên tab dưới thanh nav (không phải NON_TAB_SCREENS) để không phá
              cấu trúc điều hướng — chỉ đổi nội dung bên trong. */}
          {/* Tab Mindmap: BoardGallery tự quản lý lưới danh sách + bảng đang mở (nếu có), gồm cả
              kỹ thuật ẩn-không-tháo khi rời tab (kế thừa từ hack cũ, lý do ResizeObserver — xem
              docs/superpowers/specs/2026-08-19-board-gallery-design.md §1) — khác hack cũ ở chỗ
              giờ unmount THẬT khi người dùng bấm quay lại danh sách bên trong BoardGallery, vì D4
              đã đảm bảo nội dung không mất. Component này rẻ để luôn mount: chunk BlockSuite
              (React.lazy, ./index.tsx) chỉ tải khi thật sự cần — lúc một bảng được mở — nên không
              cần cờ "đã từng vào tab" riêng như trước. (Lượt di trú bảng cũ từng chạy ở đây qua
              một `import()` động thứ hai; giai đoạn 8 Task 8 đã xoá hẳn.) */}
          <BoardGallery
            dangHienTab={screen === "mindmap"}
            tieuDe="Sơ đồ tư duy"
            loai="so-do"
            loaiTaoDuoc={['so-do']}
            moBangYeuCau={moBangYeuCau}
            onMoBangYeuCauXong={() => setMoBangYeuCau(undefined)}
            onDangMoBang={setBangDangMo}
            onDaDoc={ghiDaDocMuc}
          />
          {screen === "flashcard" && <ComingSoonScreen feature="Thẻ ghi nhớ" />}
          {/* Task 7: Hướng dẫn dùng chung LuoiMuc — CHỈ danh mục "huong-dan" (chỉ nhận loại bài
              viết, xem DANH_MUC.loaiChoPhep ở mucMeta.ts, nên loaiTaoDuoc chỉ có 'bai-viet').
              ComingSoonScreen (hệ cũ) không còn render ở đây, giữ nguyên định nghĩa. */}
          {screen === "guideline" && (
            <BoardGallery
              dangHienTab
              tieuDe="Hướng dẫn"
              danhMuc="huong-dan"
              loaiTaoDuoc={['bai-viet']}
              onDangMoBang={setBangDangMo}
              onDaDoc={ghiDaDocMuc}
            />
          )}
          {/* Task 7: ba thẻ Truy cập nhanh "Tiếp cận vấn đề"/"ECG"/"Phác đồ" ở Trang chủ đều mở màn
              này — cùng component, chỉ khác `danhMucDangXem` (state App(), đặt bởi onMoDanhMuc).
              Trộn cả hai `loai` (bài viết + sơ đồ) khi HIỂN THỊ, phân biệt bằng icon trên thẻ
              (LuoiMuc.tsx). Thay EcgScreen (mở qua thẻ "ECG" trước Task 7) và ComingSoonScreen của
              "Tiếp cận vấn đề"/"Phác đồ" — EcgScreen đã bị xoá hẳn ở giai đoạn 8 Task 7.
              Đợt vá cuối trước hợp nhất — I1: loaiTaoDuoc CHỈ còn 'bai-viet' (trước là cả hai loại) —
              LuoiMuc.tsx chỉ từng đọc loaiTaoDuoc[0] khi dựng nút "+" (loaiTaoDuoc[1] không được đọc
              ở đâu cả, xác nhận bằng grep), nên khai cả hai loại ở đây là NÓI DỐI về khả năng thật:
              nút "+" luôn tạo bài viết dù cấu hình ngụ ý tạo được cả sơ đồ. Không thêm UI chọn loại
              (ngoài phạm vi cổng hợp nhất) — sơ đồ trong danh mục này vẫn tạo được, chỉ là qua tab
              Mindmap (loaiTaoDuoc ['so-do'] ở đó), rồi tự HIỆN LẠI ở đây nhờ lọc theo `danhMuc`
              (không lọc `loai`) — không mất khả năng, chỉ đổi lối vào cho khớp với mã thật. */}
          {screen === "danhMuc" && danhMucDangXem && (
            <BoardGallery
              dangHienTab
              tieuDe={DANH_MUC.find((d) => d.id === danhMucDangXem)?.ten ?? ''}
              danhMuc={danhMucDangXem}
              loaiTaoDuoc={['bai-viet']}
              // Đợt vá cuối trước hợp nhất — C2: cùng state với instance Mindmap ở trên (taoBaiVietMoi
              // đặt moBangYeuCau rồi navigate("danhMuc") thay vì "mindmap") — xem chú thích dài tại
              // taoBaiVietMoi. Guard `dangHienTab` trong BoardGallery.tsx (effect tiêu thụ
              // moBangYeuCau) đảm bảo CHỈ instance đang thật sự hiển thị mới tiêu thụ giá trị này —
              // instance Mindmap luôn mount nhưng dangHienTab của nó false khi screen là "danhMuc",
              // nên nó bỏ qua, không mở nhầm bài viết vào lưới sơ đồ.
              moBangYeuCau={moBangYeuCau}
              onMoBangYeuCauXong={() => setMoBangYeuCau(undefined)}
              onDangMoBang={setBangDangMo}
              onDaDoc={ghiDaDocMuc}
              // Task 7 review (I2): màn này không có tab riêng trong thanh nav dưới (nay bị ẩn hẳn,
              // xem NON_TAB_SCREENS) và không nằm trong cụm nút nổi (chỉ "home"/"specialty") — không
              // có prop này thì ba thẻ Truy cập nhanh mở vào một màn không lối thoát nào khác ngoài
              // vuốt-lùi hệ điều hành. navigate("home") lặp lại đúng chuỗi push-history/setActiveTab/
              // setScreen mà mọi lượt điều hướng khác trong App() đều đi qua.
              onQuayLai={() => navigate("home")}
            />
          )}
          {/* Task 7: màn chuyên khoa (mở từ dải chọn khoa cong, SpecialtyPicker) dùng chung
              LuoiMuc — lọc theo `chuyenKhoa`, không có nút tạo (loaiTaoDuoc: []) như Thư viện.
              SpecialtyScreen (hệ cũ) đã bị xoá ở giai đoạn 8. */}
          {screen === "specialty" && (
            <BoardGallery
              dangHienTab
              tieuDe={SPECIALTIES.find((s) => s.id === specialtyId)?.name ?? 'Chuyên khoa'}
              chuyenKhoa={specialtyId}
              loaiTaoDuoc={[]}
              onDangMoBang={setBangDangMo}
              onDaDoc={ghiDaDocMuc}
            />
          )}
          {screen === "mixing" && (
            <DungThuocScreen
              customAntibiotics={customAntibioticsCol.items}
              diseases={allDiseases}
              customInfusions={customInfusions}
              onAddAntibiotic={() => navigate("addAntibiotic")}
              onAddInfusion={goToAddInfusion}
              onEditAntibiotic={goToEditAntibiotic}
              onEditInfusion={goToEditInfusion}
              // Xoá thuốc tự nhập thì công thức pha đã lưu riêng cho nó (nếu có) cũng phải xoá theo —
              // không thì công thức đó thành mồ côi, không thuốc nào tham chiếu tới nhưng vẫn nằm
              // mãi trên máy và trong mọi lần xuất file sao lưu sau này.
              onDeleteAntibiotic={(id) => {
                clearWardRecipesForDrug(id)
                customAntibioticsCol.remove(id)
              }}
              onDeleteInfusion={(category, id) => {
                clearWardRecipesForDrug(id)
                infusionCols[category].remove(id)
              }}
            />
          )}
          {screen === "addAntibiotic" && <AddAntibioticScreen diseases={allDiseases} onSave={handleSaveAntibiotic} onBack={goBack} />}
          {screen === "addInfusion" && (
            <AddInfusionScreen
              key={addInfusionCategory}
              category={addInfusionCategory}
              diseases={allDiseases}
              onSave={(d) => handleSaveInfusion(addInfusionCategory, d)}
              onBack={goBack}
            />
          )}
          {screen === "editAntibiotic" &&
            (editAntibioticDraft ? (
              <EditAntibioticScreen drug={editAntibioticDraft} diseases={allDiseases} onSave={handleSaveAntibiotic} onBack={goBack} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 px-5">
                <p className="text-sm text-slate-500">Không tìm thấy thuốc cần sửa.</p>
                <button onClick={goBack} className="text-sm font-semibold" style={{ color: "var(--c-primary-deep)" }}>
                  Quay lại
                </button>
              </div>
            ))}
          {screen === "editInfusion" &&
            (editInfusionDraft ? (
              <AddInfusionScreen
                category={editInfusionDraft.category}
                initial={editInfusionDraft.drug}
                diseases={allDiseases}
                onSave={(d) => handleSaveInfusion(editInfusionDraft.category, d)}
                onBack={goBack}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 px-5">
                <p className="text-sm text-slate-500">Không tìm thấy thuốc cần sửa.</p>
                <button onClick={goBack} className="text-sm font-semibold" style={{ color: "var(--c-primary-deep)" }}>
                  Quay lại
                </button>
              </div>
            ))}
          {screen === "dataSync" && (
            <DataSyncScreen
              customAntibiotics={customAntibioticsCol.items}
              customDiseases={customDiseasesCol.items}
              customInfusions={customInfusions}
              customFlashcards={customFlashcardsCol.items}
              customMucs={mucsCol.items}
              // Chỉ kho `mucs` nằm ở IndexedDB; kháng sinh/bệnh lý/thuốc truyền/thẻ ghi nhớ dùng
              // localStorage (đọc đồng bộ, không có trạng thái "đọc hỏng" tương đương).
              duLieuChuaDocDuoc={mucsCol.loiDoc !== null}
              onImport={handleImportData}
              onRestoreSnapshot={handleRestoreSnapshot}
              onBackupDone={() => setShowBackupReminder(false)}
              onBack={goBack}
            />
          )}
          {screen === "addFlashcard" && <AddFlashcardScreen onSave={handleSaveFlashcard} onBack={goBack} />}
          {screen === "comingSoon" && <ComingSoonScreen feature={comingSoonFeature} onBack={goBack} />}
        </main>

        {/* Thanh điều hướng dưới. Mặt nền XÁM NHẠT (không phải trắng như nền trang) và kéo liền
            xuống hết vùng thanh gạt Home: đây là điểm mấu chốt của lỗi "dải trắng dưới thanh nav"
            trên iPhone. Khoảng chừa cho thanh gạt vẫn phải có (không được đặt nút bấm vào đó),
            nhưng khi nó cùng màu trắng với nền trang thì nhìn thành một khoảng trống thừa; tô khác
            màu một chút là cả dải đó đọc thành phần thân của thanh nav, liền tới cạnh máy.

            Nền ĐẶC (--c-nav-bg-solid), KHÔNG backdrop-filter: thanh nav là phần tử cuối trong một
            cột flex (main rồi mới tới nav), không phải lớp phủ nổi lên trên nội dung cuộn — phía
            sau nó không bao giờ có gì để "làm mờ" cả, nên blur() trước đây chỉ là hiệu ứng treo
            không tác dụng, bỏ đi cho nhẹ. (Nguyên nhân thật của dải trống dưới nav hoá ra không nằm
            ở đây — xem `apple-mobile-web-app-status-bar-style` đã bỏ trong index.html.) */}
        {!anThanhNav && (
          <nav
            className="flex-none"
            aria-label="Điều hướng chính"
            style={{
              background: "var(--c-nav-bg-solid)",
              borderTop: "1px solid var(--c-nav-border)",
              // Phần phủ lên vùng thanh gạt Home: chỉ là nền, không đặt nút bấm vào đây.
              paddingBottom: "var(--nav-pad-bottom)",
            }}
          >
            <div className="flex items-stretch" style={{ height: "var(--nav-body-h)" }}>
              {NAV_ITEMS.map(({ id, label, icon, navId }) => {
                const isActive = activeTab === id
                return (
                  // flex-1: mỗi mục chiếm đúng 1/5 bề ngang nên vùng chạm rộng hơn hẳn so với việc
                  // chỉ đệm quanh chữ — ngón cái bấm hụt ít hơn, nhất là 2 mục ngoài rìa.
                  <button
                    key={id}
                    onClick={() => navigate(id, navId)}
                    aria-current={isActive ? "page" : undefined}
                    className="nav-press flex-1 flex flex-col items-center justify-center gap-1"
                    // Mục chưa chọn dùng --c-text-muted chứ không phải --c-muted: nhãn nav chỉ cao
                    // 11px nên phải đạt ngưỡng tương phản 4.5:1 của chữ nhỏ. Đo trên nền thanh nav
                    // bản tối, --c-muted chỉ được 4.33:1 (trượt), --c-text-muted đạt 5.8:1.
                    style={{ color: isActive ? "var(--c-primary-deep)" : "var(--c-text-muted)", transition: "color .2s ease" }}
                  >
                    <span className="relative flex items-center justify-center h-8" style={{ width: 58 }}>
                      {/* Viên nền tô riêng ở một lớp TUYỆT ĐỐI, phóng to bằng transform (không phải
                          animate thuộc tính `width`) — width kích hoạt layout thrash mỗi khung hình,
                          transform chỉ tốn compositor. Viên nền của mục đang chọn đọc từ biến chủ đề.
                          Mã cứng #e0edff cũ là một viên xanh nhạt gần trắng — trên nền tối nó sáng
                          chói hơn cả icon bên trong. */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: "var(--c-nav-active-bg)",
                          opacity: isActive ? 1 : 0,
                          transform: `scaleX(${isActive ? 1 : 44 / 58})`,
                          transition: "transform .28s cubic-bezier(.34,1.4,.64,1), opacity .2s ease",
                        }}
                      />
                      <span className="relative flex items-center justify-center">{icon(isActive)}</span>
                    </span>
                    <span
                      className="text-[11px] leading-none"
                      style={{ fontWeight: isActive ? 700 : 500, transition: "font-weight .2s ease" }}
                    >
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>
        )}

        {/* Ở màn chi tiết KHÔNG có thanh nav để tự "nuốt" giùm vùng thanh gạt Home, nên phải cộng
            tay `--safe-bottom` vào đây — nếu không, dải này sẽ nổi quá thấp, lấn vào đúng vùng
            thanh gạt trên iPhone toàn màn hình. */}
        <UpdateBanner offsetBottom={anThanhNav ? "var(--above-safe)" : "var(--above-nav)"} />

        {/* Dải báo ĐỌC HỎNG — cấp app, vì sự cố cũng ở cấp app: kho bài viết/sơ đồ (store `mucs`)
            nằm trong IndexedDB, và người dùng có thể đang ở bất kỳ tab nào. Giai đoạn 8 Task 7 gỡ
            hệ ECG cũ — nguồn IndexedDB duy nhất còn lại là `mucs`, nên dải này trỏ vào đó thay vì
            biến mất hẳn (`duLieuChuaDocDuoc` của màn Đồng bộ đã tin cùng một cờ). Vì sao phải nói ra:
            đọc hỏng thì lưới/ô tìm chỉ đơn giản là rỗng — không một dấu hiệu nào cho thấy phần của
            người dùng đã rụng mất, và một bản "sao lưu" xuất lúc đó sẽ trống. Khác dải "Có bản cập
            nhật" và toast: dải này KHÔNG tự tắt và không đóng được, vì nó chỉ biến mất khi vấn đề
            thật sự hết (thuLaiDoc thành công). */}
        {mucsCol.loiDoc && (
          <div
            role="alert"
            data-testid="dai-loi-doc-idb"
            className="absolute left-3 right-3 z-40 flex items-start gap-2.5 px-4 py-3 rounded-2xl"
            style={{
              bottom: anThanhNav ? "var(--above-safe)" : "var(--above-nav)",
              background: "var(--c-warn-soft, #fffbeb)",
              border: "1px solid var(--c-warn-line, #fde68a)",
              color: "var(--c-warn, #92400e)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: "none", marginTop: 1 }}>
              <path
                d="M12 3.6 2.7 19.2a1.2 1.2 0 0 0 1 1.8h16.6a1.2 1.2 0 0 0 1-1.8L12 3.6Z"
                stroke="var(--c-warn-icon, #b45309)"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path d="M12 9.6v4.2" stroke="var(--c-warn-icon, #b45309)" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="17" r="1.05" fill="var(--c-warn-icon, #b45309)" />
            </svg>
            <div className="flex-1 flex flex-col items-start gap-1.5">
              <span className="text-[12.5px] leading-snug">
                Chưa đọc được bài viết và sơ đồ bạn tự soạn — danh sách đang thiếu phần của bạn.
                Đừng xuất sao lưu cho tới khi đọc lại được.{" "}
                {/* I2 (review toàn nhánh 2026-09-09): trước bản vá, câu phía trên là TOÀN BỘ nội
                    dung băng — `mucsCol.loiDoc` (nguyên nhân THẬT, ví dụ "một tab/cửa sổ khác đang
                    mở app ở phiên bản cũ hơn — đóng tab đó rồi thử lại") bị vứt đi. Người dùng bấm
                    "Thử lại" vô hạn lần vẫn hỏng vì không ai bảo họ phải đóng tab cũ trước. An toàn
                    để in thẳng: từ bản vá idb.ts cùng đợt (I2), `loiDoc` được đảm bảo là câu tiếng
                    Việt app tự viết — DOMException kỹ thuật của trình duyệt đã bị lọc ở nguồn, không
                    còn lọt tới đây (xem idbGetAllCoKetQua). */}
                {mucsCol.loiDoc}
              </span>
              <button
                type="button"
                onClick={() => {
                  mucsCol.thuLaiDoc()
                }}
                className="dose-press"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 36,
                  padding: "0 12px",
                  marginLeft: -12,
                  borderRadius: 9999,
                  border: 0,
                  background: "none",
                  color: "var(--c-warn, #92400e)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* Dải xác nhận — nổi trên thanh nav, không nhận thao tác nên không che nút nào. Cộng thêm
            52px (chiều cao viên "Có bản cập nhật" + khoảng cách) khi dải đó đang hiện, để xếp CHỒNG
            LÊN NHAU thay vì đè thẳng lên nhau — trước đây cả hai dải neo đúng một `bottom`. */}
        {toast && (
          <div
            className="toast-in absolute left-1/2 z-40 px-4 py-2.5 rounded-full text-[13px] font-semibold text-white pointer-events-none flex items-center gap-2"
            style={{
              bottom: updateBannerVisible
                ? (isDetailScreen ? "calc(var(--above-safe) + 52px)" : "calc(var(--above-nav) + 52px)")
                : (isDetailScreen ? "var(--above-safe)" : "var(--above-nav)"),
              transform: "translateX(-50%)",
              background: "rgba(15,23,42,.92)",
              boxShadow: "0 8px 24px rgba(15,23,42,.28)",
              whiteSpace: "nowrap",
            }}
          >
            {/* Dải này LUÔN có nền tối (rgba(15,23,42,.92)) bất kể theme — --c-toast-green (index.css)
                khai cố định đúng giá trị --c-green của bản tối, vì đổi theo --c-green thường sẽ tối
                sẫm lại ở bản sáng và mất tương phản trên nền navy cố định này. */}
            <span style={{ color: "var(--c-toast-green)" }}>✓</span>
            {toast}
          </div>
        )}

        {/* Hiện ở BẤT KỲ tab nào (không riêng Sơ đồ tư duy) — xem lý do ở khai báo `hasCustomContent`
            phía trên. Xếp CHỒNG lên cả dải cập nhật lẫn dải xác nhận nếu chúng đang hiện cùng lúc,
            theo đúng quy ước 52px/dải đã dùng cho hai dải đó. */}
        {showBackupReminder && (
          <div
            className="toast-in-full absolute flex items-center gap-2.5 px-4 py-2.5 rounded-2xl z-40"
            style={{
              left: 12,
              right: 12,
              bottom: `calc(${isDetailScreen ? "var(--above-safe)" : "var(--above-nav)"} + ${
                (updateBannerVisible ? 52 : 0) + (toast ? 52 : 0)
              }px)`,
              background: "rgba(15,23,42,.94)",
            }}
          >
            <span className="flex-1 text-[12.5px] text-white leading-snug">
              Đã lâu chưa sao lưu — dữ liệu chỉ nằm trên máy này, mất máy là mất hết.
            </span>
            <button
              onClick={() => {
                snoozeBackupReminder()
                setShowBackupReminder(false)
              }}
              className="flex-none text-[12.5px] font-medium px-2 py-1 text-slate-300"
            >
              Để sau
            </button>
            <button
              onClick={() => navigate("dataSync")}
              className="flex-none text-[12.5px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: "var(--c-surface)", color: "var(--c-primary-strong)" }}
            >
              Sao lưu
            </button>
          </div>
        )}

        {/* Bảng chọn danh mục cho luồng "Tạo bài mới" ở Trang chủ (spec §3.5) — đứng ở App vì sau
            khi chọn xong phải chuyển sang màn "danhMuc" đúng danh mục vừa chọn và mở mục vừa tạo,
            xem taoBaiVietMoi (đợt vá cuối trước hợp nhất — C2, KHÔNG còn chuyển sang tab Mindmap). */}
        {taoBaiMoiDangMo && (
          <ChonDanhMuc
            loai="bai-viet"
            onChon={(d) => void taoBaiVietMoi(d)}
            onHuy={() => setTaoBaiMoiDangMo(false)}
          />
        )}
    </div>
  )
}
