import { useState, useRef, useEffect, useMemo } from "react"
import type { DoseTier } from "../../data/types"
import { ANTIBIOTICS } from "../../data"
import { findInteractionRule, findYsiteRule, type CompatRule, type InteractionRule } from "../../data/compatibility"
import { gradeVialCount, VIAL_COUNT_OK, type VialCountGrade, type VialForm } from "../../lib/mixing"
import { type WardRecipe } from "../../lib/wardRecipes"
import { lineLabel, type RunningDrug } from "../../lib/runningDrugs"
import { tickHaptic } from "../../lib/haptics"
import { formatDoseNumber } from "../../lib/infusion"
import { icons } from "../../components/icons"
import { C, T, normalizeSearch, trim } from "../../lib/ui"
import { ConfirmIconButton } from "./sharedUi"
import { useDosing } from "./context"

export function mergeWithOverrides<T extends { id: string }>(staticList: T[], stored: T[]): T[] {
  const storedById = new Map(stored.map((d) => [d.id, d]))
  const merged = staticList.map((d) => storedById.get(d.id) ?? d)
  const staticIds = new Set(staticList.map((d) => d.id))
  // Lọc theo id đã thấy, không chỉ theo staticIds: nếu `stored` lỡ chứa hai bản ghi cùng id (id sinh
  // theo Date.now() nên hai lần thêm trong cùng một mili-giây là trùng, và một file nhập vào cũng có
  // thể tự trùng bên trong nó), vòng lặp cũ đẩy CẢ HAI vào danh sách — người dùng thấy hai thẻ thuốc
  // y hệt nhau, và React nhận hai phần tử cùng `key` nên sửa thẻ này lại đổi thẻ kia.
  const seen = new Set(staticIds)
  const newOnly: T[] = []
  stored.forEach((d) => {
    if (seen.has(d.id)) return
    seen.add(d.id)
    newOnly.push(d)
  })
  return [...merged, ...newOnly]
}

// Id của các kháng sinh dựng sẵn — dùng để nhận biết một mục trong collection tự lưu là bản "sửa
// lại" của thuốc dựng sẵn (id trùng) hay là thuốc hoàn toàn mới do người dùng tự thêm (id không trùng).
export const STATIC_ANTIBIOTIC_IDS = new Set(ANTIBIOTICS.map((d) => d.id))

export function tierFor(tiers: DoseTier[], crcl: number | null): DoseTier {
  const sorted = [...tiers].sort((a, b) => b.min - a.min)
  // Chưa có CrCl: luôn lấy mức có CrCl tối thiểu CAO NHẤT (liều chuẩn/thận bình thường) làm mặc định,
  // bất kể thứ tự người dùng nhập các mức — quan trọng vì "Chỉ định riêng theo bệnh lý" cho phép
  // thêm mức liều tự do, không đảm bảo luôn nhập theo thứ tự CrCl giảm dần.
  if (crcl == null) return sorted[0]
  return sorted.find((t) => crcl >= t.min) ?? sorted[sorted.length - 1]
}

// ─── Bảng pha kháng sinh ───────────────────────────────────────────────────────
// Kháng sinh không có tốc độ truyền để chỉnh — liều là một con số cố định mỗi lần dùng, không
// titrate như thuốc vận mạch — nên câu hỏi lúc pha khác hẳn: không phải "đặt bơm bao nhiêu", mà là
// "hoàn nguyên/pha loãng thế nào ra đúng nồng độ, có vượt ngưỡng trên không, và truyền trong bao
// lâu". Dùng lại đúng bộ hàm tính + kiểm tra vật lý của lib/mixing.ts (cùng bản chất phép tính, chỉ
// khác chỗ dùng), và dùng lại kho "công thức của bạn" (wardRecipes) — antibiotic.id cũng là một
// drugId hợp lệ trong kho đó.

// Một thuốc giờ có NHIỀU công thức đã lưu + một công thức HỆ THỐNG (mặc định dựng sẵn của app) —
// ba nơi hiển thị công thức pha (AntibioticDoseCard, AntibioticMixPanel, InfusionCalculator) đều
// cần cùng một khái niệm "công thức nào đang được xem/áp dụng" để chuyển đổi qua lại. Trước đây
// mỗi nơi tự suy "công thức đang áp dụng" = công thức lưu GẦN NHẤT (wardList[wardList.length-1]) —
// không có chỗ nào nhớ người dùng vừa BẤM chọn công thức nào, nên bấm sang một công thức cũ hơn chỉ
// nạp giá trị vào form chứ không có gì đánh dấu nó đang "đang chọn", và không có cách nào quay lại
// công thức hệ thống mà không XOÁ hẳn công thức đã lưu. `activeId` ở đây có thể là id một công thức
// đã lưu, hoặc chuỗi "system" — undefined `active` nghĩa là công thức hệ thống đang được chọn.
export function useActiveWardRecipe(wardList: WardRecipe[]): {
  activeId: string
  setActiveId: (id: string) => void
  active: WardRecipe | undefined
} {
  // Công thức ĐƯỢC GHIM (nếu có) thắng "lưu gần nhất" khi chọn công thức mở mặc định — xem
  // setPinnedWardRecipe trong lib/wardRecipes.ts. Không có công thức nào được ghim thì hành vi y hệt
  // trước đây (lưu gần nhất thắng).
  const fallbackId = (list: WardRecipe[]) => list.find((w) => w.pinned)?.id ?? list[list.length - 1]?.id ?? "system"
  const [activeId, setActiveId] = useState<string>(() => fallbackId(wardList))
  // Theo dõi id của lần render trước để phát hiện: (a) vừa có công thức MỚI được lưu (id chưa từng
  // thấy) → tự chuyển sang xem công thức đó luôn, khỏi bấm thêm một lần nữa; (b) công thức đang xem
  // vừa bị xoá (id không còn nằm trong danh sách) → rơi về công thức được ghim, hoặc mới nhất còn
  // lại, hoặc hệ thống nếu danh sách rỗng — tránh treo activeId trỏ vào một công thức không còn tồn tại.
  const prevIdsRef = useRef<string[]>(wardList.map((w) => w.id))
  useEffect(() => {
    const prevIds = prevIdsRef.current
    const newlyAdded = wardList.find((w) => !prevIds.includes(w.id))
    if (newlyAdded) {
      setActiveId(newlyAdded.id)
    } else if (activeId !== "system" && !wardList.some((w) => w.id === activeId)) {
      setActiveId(fallbackId(wardList))
    }
    prevIdsRef.current = wardList.map((w) => w.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wardList])
  const active = activeId === "system" ? undefined : wardList.find((w) => w.id === activeId)
  return { activeId, setActiveId, active }
}

// Hàng chip "công thức pha" dùng chung ở ba chỗ (AntibioticDoseCard, AntibioticMixPanel,
// InfusionCalculator) — mỗi chỗ đều cần: chip "Công thức hệ thống" để chuyển về, chip mỗi công thức
// đã lưu (bấm để nạp), sao ghim (mặc định cố định, thắng "lưu gần nhất" — xem useActiveWardRecipe),
// và nút xoá hai chạm. Khi một thuốc có nhiều công thức đã lưu (dùng chung máy giữa nhiều khoa), hàng
// chip dễ dài tràn — thêm ô lọc theo tên khi vượt quá một ngưỡng, thay vì bắt cuộn ngang dò cả dãy.
export function WardRecipeChips({
  wardList,
  activeId,
  onSelectSystem,
  onSelectWard,
  onDelete,
  onPin,
}: {
  wardList: WardRecipe[]
  activeId: string
  onSelectSystem: () => void
  onSelectWard: (w: WardRecipe) => void
  onDelete: (recipeId: string) => void
  onPin: (recipeId: string) => void
}) {
  const [filter, setFilter] = useState("")
  const q = normalizeSearch(filter)
  const shown = q ? wardList.filter((w) => normalizeSearch(w.title || "công thức đã lưu").includes(q)) : wardList
  // Ngưỡng bật ô lọc: 3 công thức, không phải 6. Mỗi chip cao 44px và hàng chip `flex-wrap` KHÔNG có
  // trần chiều cao, nên trên màn hẹp chỉ 2–3 công thức đã ăn 3 hàng — đủ để đẩy ô "Đặt tên công thức
  // mới" (nằm ở CUỐI bảng pha) ra khỏi tầm nhìn. Ngưỡng 6 cũ chỉ bật ô lọc SAU KHI chuyện đó đã xảy ra.
  const showFilter = wardList.length > 3
  const pill = (on: boolean) =>
    on
      ? { background: C.accent, borderColor: C.accent, color: "var(--c-on-primary)" }
      : { background: C.surface, borderColor: C.line, color: C.textSoft }

  return (
    <div className="mb-2">
      <label className={`${T.label} text-slate-500 mb-1 block`}>Công thức pha — bấm để chuyển đổi</label>
      {showFilter && (
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Lọc theo tên công thức..."
          className="w-full h-11 px-2.5 mb-1.5 rounded-full text-[12px] border outline-none"
          style={{ borderColor: C.line, background: C.surface }}
        />
      )}
      {/* Trần chiều cao + cuộn DỌC RIÊNG cho hàng chip. Trước đây hàng này là `flex-wrap` không giới
          hạn: lưu 2–3 công thức là bảng pha dài thêm mấy hàng 44px, đẩy ô "Đặt tên công thức mới" ở
          cuối bảng trôi khỏi màn hình — càng lưu nhiều công thức càng khó lưu thêm công thức.
          Trần ~3 hàng chip (10.5rem): còn thấy được là danh sách "còn nữa ở dưới" để mà cuộn, mà
          phần dưới bảng pha vẫn nằm trong tầm với. `overscroll-contain` để cuộn hết danh sách này
          không kéo luôn cả trang phía sau. */}
      <div className="flex flex-wrap gap-2 max-h-[10.5rem] overflow-y-auto overscroll-contain">
        {/* Công thức HỆ THỐNG luôn là một lựa chọn để chuyển VỀ, không chỉ để xoá hẳn công thức đã
            lưu mới quay lại được — không lọc theo ô tìm ở trên vì nó không có tên để so khớp. */}
        <button onClick={onSelectSystem} className="h-11 px-3 rounded-full text-[12px] font-semibold border" style={pill(activeId === "system")}>
          Công thức hệ thống
        </button>
        {shown.map((w) => (
          <span
            key={w.id}
            // h-11 (không phải h-9): pill này gộp BA vùng chạm (chọn/ghim/xoá) trên cùng một chiều
            // cao — chiều cao cha thấp thì hai nút phụ (ghim/xoá, chỉ rộng px-1.5/px-2.5) co xuống
            // dưới 44px trên cả hai chiều, chạm nhầm dễ nhất trong cả cụm.
            className="inline-flex items-center h-11 rounded-full border overflow-hidden"
            style={{ borderColor: activeId === w.id ? C.accent : C.accentLine }}
          >
            <button
              onClick={() => onSelectWard(w)}
              className="h-full pl-3 pr-1.5 text-[12px] font-semibold max-w-[140px] truncate"
              style={activeId === w.id ? { color: "var(--c-on-primary)", background: C.accent } : { color: "var(--c-accent-deep)", background: C.surface }}
            >
              {w.title || "Công thức đã lưu"}
            </button>
            {/* Ghim làm mặc định cố định — độc lập với "lưu gần nhất". Chỉ một công thức được ghim
                mỗi thuốc, bấm sao đang sáng để gỡ ghim (xem setPinnedWardRecipe). */}
            <button
              onClick={() => onPin(w.id)}
              aria-label={w.pinned ? `Gỡ ghim công thức ${w.title}` : `Ghim công thức ${w.title} làm mặc định`}
              className="h-full px-1.5 flex-none flex items-center justify-center"
              style={activeId === w.id ? { background: C.accent } : { background: C.surface }}
            >
              <span style={{ opacity: w.pinned ? 1 : 0.3 }}>{icons.star()}</span>
            </button>
            {/* Đây là công thức ĐÃ LƯU từ phiên trước, không phải một dòng đang soạn dở — nên xoá
                cần xác nhận hai chạm giống xoá kháng sinh/bài viết tự nhập, không phải nút "×" tức
                thì (nút đó dành cho dòng nháp chưa lưu, xem chú thích ConfirmIconButton phía trên:
                trước đây liệt "công thức pha" nhầm vào nhóm đó). */}
            <ConfirmIconButton
              onConfirm={() => onDelete(w.id)}
              ariaLabel={`Xoá công thức ${w.title}`}
              className="h-full px-2.5 flex-none flex items-center justify-center"
              style={{ background: C.dangerSoft, color: C.dangerIcon }}
            />
          </span>
        ))}
        {shown.length === 0 && <p className="text-[12px] text-slate-400 py-1.5">Không có công thức nào khớp "{filter}".</p>}
      </div>
    </div>
  )
}

// Cảnh báo tương kỵ Khóa chữ Y/tương tác NGAY LÚC ĐANG PHA — trước đây bảng tương hợp chỉ chạy ở màn
// "Bệnh nhân đang dùng" (RunningPanel), so hai thuốc ĐÃ ghim cùng Đường truyền. Vô dụng đúng lúc cần nhất:
// người đang đứng pha Noradrenaline chưa ghim gì cả, nên không có "hai thuốc cùng Đường truyền" nào để so —
// phải tự nhớ ra rồi mở màn khác kiểm tra. Ở đây so compatKey của thuốc đang xem với TỪNG thuốc đã
// ghim (bất kể đang ở Đường truyền nào — người dùng tự quyết định chọn Đường truyền nào sau khi thấy cảnh báo), không
// đợi đến lúc ghim xong mới biết.
export function CompatWarningForDrug({ compatKey, ownDrugId }: { compatKey?: string; ownDrugId: string }) {
  const { running } = useDosing()
  if (!compatKey) return null
  const others = running.filter((r) => r.drugId !== ownDrugId)
  const ysite = others
    .map((r) => ({ r, rule: findYsiteRule(compatKey, r.compatKey) }))
    .filter((x): x is { r: RunningDrug; rule: CompatRule } => x.rule != null)
  const interactions = others
    .map((r) => ({ r, rule: findInteractionRule(compatKey, r.compatKey) }))
    .filter((x): x is { r: RunningDrug; rule: InteractionRule } => x.rule != null)
  if (ysite.length === 0 && interactions.length === 0) return null

  const danger = ysite.some((x) => x.rule.verdict === "incompatible") || interactions.some((x) => x.rule.severity === "cao")
  const style = danger
    ? { bg: C.dangerSoft, border: C.dangerLine, text: "var(--c-danger-deep)" }
    : { bg: C.warnSoft, border: C.warnLine, text: C.warn }

  return (
    <div className="fade-in mt-2 px-3 py-2.5 rounded-[14px]" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex-none" style={{ color: style.text }}>{icons.alert()}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-extrabold leading-[1.3]" style={{ color: style.text }}>
            {danger ? "KHÔNG TƯƠNG HỢP VỚI THUỐC ĐANG DÙNG" : "THẬN TRỌNG VỚI THUỐC ĐANG DÙNG"} — kiểm tra Đường truyền trước khi ghim
          </p>
          {ysite.map(({ r, rule }, i) => (
            <p key={`y-${i}`} className="text-[12px] leading-[1.45] mt-1" style={{ color: style.text }}>
              <b>{r.name}</b> ({lineLabel(r.line)}){rule.verdict === "incompatible" ? " — KHÔNG tương hợp Khóa chữ Y" : " — thận trọng Khóa chữ Y"}: {rule.text}
              {!rule.verified && " (chưa đối chiếu tài liệu gốc)"}
            </p>
          ))}
          {interactions.map(({ r, rule }, i) => (
            <p key={`i-${i}`} className="text-[12px] leading-[1.45] mt-1" style={{ color: style.text }}>
              <b>{r.name}</b> — tương tác mức {rule.severity}: {rule.text}
              {!rule.verified && " (chưa đối chiếu tài liệu gốc)"}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

// Độ trễ dùng chung cho MỌI cảnh báo "có thể đang gõ dở" trong app — từ ngưỡng số lượng ống/lọ tới
// thông số bệnh nhân (cân nặng/chiều cao/tuổi/creatinin). Gõ "7" rồi mới thêm "0" thành "70" đi qua
// một trạng thái trung gian trông như số bất thường trong chớp mắt; đợi người dùng NGỪNG gõ rồi mới
// đánh giá tránh nháy cảnh báo sai suốt lúc đang nhập.
const WARNING_DELAY_MS = 2000

// `key` đổi (giá trị vừa gõ, hoặc mức cảnh báo) → đếm lại từ đầu; `null` nghĩa là không có gì cần
// cảnh báo, ẩn ngay lập tức (không có lý do gì phải trễ khi KHÔNG có cảnh báo). Chỉ sau `delay` mà
// `key` không đổi mới coi là người dùng đã gõ xong và cho phép cảnh báo hiện ra.
export function useDelayedWarning(key: string | null, delay: number = WARNING_DELAY_MS): boolean {
  const [show, setShow] = useState(false)
  useEffect(() => {
    setShow(false)
    if (key == null) return
    const t = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(t)
  }, [key, delay])
  return key != null && show
}

// Ngưỡng số lượng ống/lọ/chai (xem gradeVialCount trong lib/mixing.ts) — khi số lượng tính ra vượt
// ngưỡng hợp lý, KHÔNG in số ra ngay: chờ (xem useDelayedWarning) rồi mới hiện cảnh báo, và chặn kết
// quả cho tới khi người dùng bấm xác nhận "tôi chắc chắn" — cùng triết lý requiresConfirm của
// gradeConcentration, chỉ khác đối tượng kiểm (số lượng thay vì nồng độ). `count`/`form` đổi (gõ số
// khác, đổi dạng đóng gói) thì phải xác nhận lại từ đầu — không được "nhớ" xác nhận cũ cho một con
// số hoàn toàn khác.
export function useVialCountGuard(count: number | null, form: VialForm) {
  const grade = useMemo(() => (count != null ? gradeVialCount(count, form) : VIAL_COUNT_OK), [count, form])
  const key = count != null ? `${form}:${Math.round(count * 1000)}` : null
  const showWarning = useDelayedWarning(grade.requiresConfirm ? key : null)
  const [confirmedKey, setConfirmedKey] = useState<string | null>(null)
  const confirmed = key != null && confirmedKey === key
  return {
    grade,
    showWarning,
    blocked: grade.requiresConfirm && !confirmed,
    confirm: () => setConfirmedKey(key),
  }
}

export function VialCountWarning({ grade, show, onConfirm }: { grade: VialCountGrade; show: boolean; onConfirm: () => void }) {
  if (!grade.requiresConfirm || !show) return null
  return (
    <div className="mt-1.5 px-2.5 py-2 rounded-[14px]" style={{ background: C.dangerSoft, border: "1px solid var(--c-danger-line)" }}>
      <p className="text-[12px] font-bold leading-[1.45]" style={{ color: "var(--c-danger-deep)" }}>{grade.headline}</p>
      <p className="text-[12px] leading-[1.45] mt-0.5" style={{ color: "var(--c-danger-deep)" }}>{grade.detail}</p>
      <button
        onClick={onConfirm}
        className="mt-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold"
        style={{ background: C.dangerIcon, color: "var(--c-on-bright)" }}
      >
        Tôi chắc chắn
      </button>
    </div>
  )
}

// ─── "Làm tròn lên": lời giải thích + công tắc ───────────────────────────────
//
// Vấn đề gốc: app làm tròn rất "thông minh" (gộp lọ, nâng thể tích pha lên mốc dễ đong) nhưng KHÔNG
// nói câu nào — người dùng thấy 1000 mg thay vì 525 mg mà không rõ vì đâu, cũng không chọn khác được.
//
// /impeccable critique 2026-08-31, P1 + P2: khi làm tròn lên vọt quá ROUND_WARN_RATIO (1,3×) cho
// đúng thuốc/bậc này, app KHÔNG tự áp liều làm tròn nữa — hiện liều TÍNH ĐƯỢC (trong khoảng khuyến
// cáo), người dùng bật riêng cho thuốc này bằng một chạm. Và câu cảnh báo hổ phách tách HẲN khỏi
// công tắc (trước đây công tắc xanh nằm trong ô hổ phách — trộn tín hiệu chrome/an toàn, phạm
// Decoration/Diagnosis Split). Làm tròn nhỏ (≤1,3×) thì giữ nguyên nếp cũ: một công tắc toàn cục.
function ToggleSwitch({ on, onToggle, ariaLabel }: { on: boolean; onToggle: () => void; ariaLabel: string }) {
  // Nút cao 44px cho đủ ngưỡng chạm (/impeccable critique 2026-08-31, P2); rãnh công tắc nhìn thấy
  // vẫn 52×32 theo quy ước iOS, căn giữa trong vùng chạm.
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => {
        onToggle()
        tickHaptic()
      }}
      className="flex-none w-[52px] h-11 flex items-center justify-center relative"
    >
      <span className="w-[52px] h-8 rounded-full transition-colors" style={{ background: on ? C.accent : "var(--c-line-strong)" }} />
      <span className="absolute w-6 h-6 rounded-full transition-all" style={{ top: 10, left: on ? 24 : 4, background: C.surface }} />
    </button>
  )
}

export function RoundingControl({
  globalOn,
  setGlobalOn,
  overshoot,
  useHeavyRoundUp,
  setUseHeavyRoundUp,
  excess,
  delivered,
  calcTarget,
  roundedUpDelivered,
  roundedUpExcess,
  unit,
}: {
  globalOn: boolean
  setGlobalOn: (next: boolean) => void
  // Làm tròn LÊN cho đúng thuốc/bậc này có vọt quá 1,3× không (tính từ usageUp, không phụ thuộc thẻ).
  overshoot: boolean
  useHeavyRoundUp: boolean
  setUseHeavyRoundUp: (next: boolean) => void
  // excess/delivered của con số ĐANG hiển thị (usageDown khi chưa opt-in, usageUp khi đã opt-in).
  excess: number
  delivered: number
  // Đích dược lý (mg/kg × cân nặng, đã cắt ngưỡng) — "liều tính được" CHỈ được gọi tên cho con số
  // này, không bao giờ cho giá trị đã làm tròn (/impeccable critique 2026-08-31, P1: nhãn va chạm).
  calcTarget: number | null
  // Con số NẾU làm tròn lên — để nói "bật sẽ thành bao nhiêu" khi đang hiện liều làm tròn xuống.
  roundedUpDelivered: number | null
  roundedUpExcess: number | null
  unit: string
}) {
  const neutral = { bg: C.surfaceAlt, border: C.line, text: C.textSoft }

  // Làm tròn nhỏ hoặc đang tắt toàn cục: một khối trung tính + công tắc toàn cục, như trước.
  if (!globalOn || !overshoot) {
    const over = globalOn && excess > 1.001
    return (
      <div className="mt-1.5 px-2.5 py-2 rounded-[14px]" style={{ background: neutral.bg, border: `1px solid ${neutral.border}` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold leading-[1.45]" style={{ color: neutral.text }}>
              {globalOn ? "Làm tròn lên: ĐANG BẬT" : "Làm tròn lên: ĐANG TẮT"}
            </p>
            <p className="text-[12px] leading-[1.45] mt-0.5" style={{ color: neutral.text }}>
              {over
                ? `Theo mức làm tròn lên gần nhất có thể — thực nhận ${formatDoseNumber(delivered)} ${unit}. Tắt công tắc nếu muốn lấy mức thấp hơn cho gọn.`
                : globalOn
                  ? "Không có bậc nào phải làm tròn — con số ở trên đúng bằng liều tính được."
                  : `Đang lấy mức thấp nhất dễ đong — thực nhận ${formatDoseNumber(delivered)} ${unit}, có thể thấp hơn khoảng khuyến cáo. Bạn đã tự chọn mức này.`}
            </p>
          </div>
          <ToggleSwitch on={globalOn} onToggle={() => setGlobalOn(!globalOn)} ariaLabel="Làm tròn lên khi không có bậc nào khớp khoảng liều" />
        </div>
      </div>
    )
  }

  // Làm tròn lên vọt >1,3×: câu cảnh báo hổ phách (CHỈ chữ, không control) + khối điều khiển trung
  // tính tách riêng bên dưới.
  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="px-2.5 py-2 rounded-[14px]" style={{ background: C.warnSoft, border: "1px solid var(--c-warn-line)" }}>
        <p className={T.meta} style={{ color: C.warnIcon }}>
          {useHeavyRoundUp
            ? `Đang làm tròn lên cho thuốc này — thực nhận ${formatDoseNumber(delivered)} ${unit}, gấp ${trim(excess, 2).replace(".", ",")} lần liều tính được. Rút bớt dịch pha để bỏ phần dư.`
            : `Đang hiển thị liều theo mức làm tròn xuống — ${formatDoseNumber(delivered)} ${unit}${
                calcTarget != null && calcTarget - delivered > 0.5 ? ` (thiếu ${formatDoseNumber(calcTarget - delivered)} ${unit} so với đích ${formatDoseNumber(calcTarget)})` : ""
              }. Làm tròn lên cho thuốc này sẽ thành ${roundedUpDelivered != null ? formatDoseNumber(roundedUpDelivered) : "—"} ${unit}${roundedUpExcess != null ? `, gấp ${trim(roundedUpExcess, 2).replace(".", ",")} lần đích` : ""}.`}
        </p>
      </div>
      <div className="px-2.5 py-2 rounded-[14px]" style={{ background: neutral.bg, border: `1px solid ${neutral.border}` }}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-bold leading-[1.45] flex-1 min-w-0" style={{ color: neutral.text }}>
            Dùng liều làm tròn lên cho thuốc này
          </p>
          <ToggleSwitch
            on={useHeavyRoundUp}
            onToggle={() => setUseHeavyRoundUp(!useHeavyRoundUp)}
            ariaLabel="Dùng liều làm tròn lên cho riêng thuốc này dù phần dư vượt 1,3 lần"
          />
        </div>
        <button
          onClick={() => setGlobalOn(false)}
          className="text-[12px] font-semibold underline leading-[1.45] text-left min-h-[44px] flex items-center"
          style={{ color: neutral.text }}
        >
          Tắt làm tròn lên cho mọi thuốc
        </button>
      </div>
    </div>
  )
}

