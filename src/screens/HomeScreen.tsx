import type { ReactElement } from "react"
import type { Screen } from "../App"
import type { IdDanhMuc, LoaiMuc } from "../board/mucMeta"
import { icons } from "../components/icons"
import { C } from "../lib/ui"
import { formatReadTime } from "../lib/recentReads"

// Một dòng trong "Đã đọc gần đây" — đã tra xong tiêu đề và biết bấm vào thì mở màn hình nào.
//
// Review Task 6/7 (Minor 5): trước bản vá này có thêm trường `screen: Screen` và nhánh dự phòng
// `onNavigate(r.screen, r.id)` — di sản từ lúc "Đã đọc gần đây" còn gộp kind hệ cũ ("article"/
// "custom"/"ecg", mỗi kind mở qua onNavigate) với kind "muc" (mở qua onMoMuc). Giai đoạn 8 xoá ba
// kind hệ cũ khỏi `ReadKind` (xem lib/recentReads.ts) — nay `recentReadItems` (dưới) chỉ còn SINH
// mục kind "muc", nên `muc` luôn có giá trị và nhánh onNavigate không bao giờ tới được. Bỏ hẳn
// `screen` + nhánh chết thay vì giữ lại "phòng khi cần" — không có kind nào khác để phòng.
export interface RecentReadItem {
  key: string
  id: string
  title: string
  at: number
  tag: string
  muc: { loai: LoaiMuc; danhMuc: IdDanhMuc }
}

export function HomeScreen({
  onNavigate,
  onTaoBaiMoi,
  onMoDanhMuc,
  onMoMuc,
  recentReads,
}: {
  onNavigate: (s: Screen, id?: string) => void
  onTaoBaiMoi: () => void
  /** Task 7: ba thẻ "Tiếp cận vấn đề"/"ECG"/"Phác đồ" mở màn lưới lọc theo danh mục (App() sở hữu
   * state `danhMucDangXem` + nhánh Screen "danhMuc"), không còn là các Screen rời (comingSoon/ecg). */
  onMoDanhMuc: (d: IdDanhMuc) => void
  /** Task 2 (giai đoạn 7-9): mở một mục "Đã đọc gần đây" thuộc kho `mucs` mới — cùng cơ chế
   * onMoMuc của SearchScreen (Task 1), KHÔNG tự chế đường điều hướng thứ ba. */
  onMoMuc: (id: string, loai: LoaiMuc, danhMuc: IdDanhMuc) => void
  recentReads: RecentReadItem[]
}) {
  // "Sử dụng thuốc"/"Công cụ" vẫn trỏ một Screen thật (mixing/comingSoon) — không thuộc kho bài
  // viết nên không có danh mục để lọc theo. Ba thẻ còn lại trỏ THẲNG một `IdDanhMuc`: từ Task 7,
  // "Tiếp cận vấn đề"/"Phác đồ" không còn là lời hứa "Sắp ra mắt" nữa, và "ECG" không còn mở
  // EcgScreen (danh sách bài học ECG cũ, đã xoá ở giai đoạn 8) mà mở lưới `mucs` lọc theo danhMuc 'ecg'.
  const resourceCards: {
    label: string
    icon: ReactElement
    target: { screen: Screen; id?: string } | { danhMuc: IdDanhMuc }
  }[] = [
    { label: "Tiếp cận vấn đề", icon: icons.summary(), target: { danhMuc: "tiep-can" } },
    { label: "Phác đồ", icon: icons.flow(), target: { danhMuc: "phac-do" } },
    { label: "Sử dụng thuốc", icon: icons.dungThuoc(true), target: { screen: "mixing" } },
    { label: "Công cụ", icon: icons.calculator(), target: { screen: "comingSoon", id: "Công cụ" } },
    { label: "ECG", icon: icons.ecg(), target: { danhMuc: "ecg" } },
  ]
  // Task 7 review (I3): thẻ "ECG" TỪNG in caption `(${ecgCount})` — ecgCount tính từ hệ ECG CŨ
  // (hệ ECG tự viết tay, đã xoá ở giai đoạn 8 Task 7), không còn
  // liên quan gì tới nội dung lưới `mucs` lọc theo danhMuc 'ecg' mà thẻ này mở ra từ Task 7. Người
  // dùng mới thấy hẳn "(0)" dù lưới thật có thể có nội dung — đúng anti-pattern mà chú thích dưới
  // đây từng chốt bỏ. Tính số ĐÚNG từ store `mucs` cần một lượt đọc async trong HomeScreen (ngoài
  // phạm vi Task 7) — bỏ hẳn caption số cho ba thẻ mở lưới `mucs` thay vì hiển thị số sai.
  // Thẻ nào trỏ vào "comingSoon" thì dòng dưới nói "Sắp ra mắt"; mọi thẻ khác (kể cả ba thẻ trỏ
  // `danhMuc`) im lặng — không còn "(0)" giả cho tính năng đã xong lẫn chưa xong đọc giống hệt nhau.
  const cardCaption = (c: (typeof resourceCards)[number]) =>
    "screen" in c.target && c.target.screen === "comingSoon" ? "Sắp ra mắt" : ""

  return (
    <div className="scroll-ios h-full pt-2 pb-4">
      {/* Header. Logo "Bs Trọng" vẽ bằng SVG theo currentColor (var(--c-text)), không nền riêng —
          hoà vào cả bản sáng lẫn tối. Logo có tỉ lệ rất ngang (1106×225 ≈ 4.9:1) nên `paddingRight`
          chừa đúng chỗ cho cụm nút nổi (chủ đề + chuyên khoa) neo ở góc trên phải là RÀNG BUỘC kích
          thước thật — xem cụm nút nổi trong App shell. Không có nó thì logo chồng lên cụm nút đó. */}
      <div className="px-8 pt-2 pb-4 flex items-center" style={{ paddingRight: 180 }}>
        <span className="flex-none h-7 w-auto translate-y-2" style={{ color: C.primary }}>
          {icons.logo("h-7 w-auto")}
        </span>
      </div>

      {/* Search */}
      <div className="px-6 pb-6 flex items-center gap-3">
        <button
          onClick={() => onNavigate("search")}
          className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm text-slate-400 font-medium"
          style={{ background: C.lineSoft }}
        >
          {icons.search(false)}
          Tìm thứ gì đó...
        </button>
      </div>

      {/* Clinical Resources */}
      <div className="mb-6">
        <h2 className="px-5 text-lg font-bold text-slate-900 mb-3">Truy cập nhanh</h2>
        <div className="flex gap-3 overflow-x-auto pl-5 pr-5 pb-1">
          {resourceCards.map((c, i) => (
            <button
              key={c.label}
              onClick={() => ("danhMuc" in c.target ? onMoDanhMuc(c.target.danhMuc) : onNavigate(c.target.screen, c.target.id))}
              className="flex-none w-[136px] h-[152px] p-4 rounded-2xl border card-press text-left flex flex-col rise-in"
              style={{ borderColor: C.line, background: C.surface, "--i": i } as React.CSSProperties}
            >
              <div
                className="flex-none w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: C.primary, color: "var(--c-on-primary)" }}
              >
                {c.icon}
              </div>
              <p className="flex-1 flex items-start font-bold text-slate-900 text-[14px] leading-tight line-clamp-2 mt-3">
                {c.label}
              </p>
              <p className="flex-none text-sm text-slate-400">{cardCaption(c)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Review */}
      <div className="px-5 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-3">Học tập</h2>
        <button
          onClick={onTaoBaiMoi}
          className="w-full flex items-center gap-3 p-4 rounded-2xl card-press text-left"
          style={{ background: C.surface }}
        >
          <div
            className="flex-none w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: C.primarySoft, color: "var(--c-primary-deep)" }}
          >
            {icons.docCross()}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-[15px] leading-snug">Tạo bài mới</p>
            <p className="text-xs text-slate-400 mt-0.5">Chọn danh mục rồi viết ngay</p>
          </div>
        </button>
        <div className="h-px mx-1" style={{ background: C.lineSoft }} />
        <button
          onClick={() => onNavigate("dataSync")}
          className="w-full flex items-center gap-3 p-4 rounded-2xl card-press text-left"
        >
          <div
            className="flex-none w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--c-green-soft)", color: "var(--c-green)" }}
          >
            {icons.download()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 text-[15px] leading-snug">Đồng bộ dữ liệu</p>
            <p className="text-xs text-slate-400 mt-0.5 truncate">Xuất/nhập mục tự nhập để sao lưu hoặc chuyển máy</p>
          </div>
        </button>
      </div>

      {/* Đã đọc gần đây — đúng những bài đã mở, mới nhất trước (xem lib/recentReads.ts) */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900">Đã đọc gần đây</h2>
          <button
            onClick={() => onNavigate("library")}
            className="flex items-center gap-0.5 text-sm font-semibold px-2 py-2 -mr-2 rounded-lg"
            style={{ color: "var(--c-primary-deep)" }}
          >
            Tất cả
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {recentReads.length === 0
          ? (
            // Chưa đọc bài nào thì nói thẳng là chưa có, KHÔNG lấy mấy bài đầu danh sách ra hiển thị
            // như bản trước — đó là thông tin sai, người dùng tưởng mình đã đọc rồi.
            <div className="flex items-center gap-2 py-2">
              <span className="flex-none text-slate-300">{icons.clock()}</span>
              <p className="text-[13px] text-slate-500 leading-snug">
                Chưa mở bài nào. Bài bạn đọc sẽ được ghi lại ở đây để mở lại cho nhanh.
              </p>
            </div>
          )
          : (
            <div className="space-y-2.5">
              {recentReads.map((r) => (
                <button
                  key={r.key}
                  onClick={() => onMoMuc(r.id, r.muc.loai, r.muc.danhMuc)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border card-press text-left"
                  style={{ borderColor: C.line, background: C.surface }}
                >
                  <span className="flex-none text-slate-400">{icons.doc()}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium text-slate-900 text-[15px] leading-snug line-clamp-2">
                      {r.title}
                    </span>
                    <span className="block text-[11.5px] text-slate-400 mt-0.5">
                      {formatReadTime(r.at)} · {r.tag}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
