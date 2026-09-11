import { useCallback, useState, useRef, useEffect, useMemo } from "react"
import type { Antibiotic, DiseaseEntry, InfusionDrug } from "../data/types"
import { ANTIBIOTICS, INFUSION_CATEGORIES, infusionCategory, InfusionCategory } from "../data"
import { resolveCrClWeight } from "../lib/bodyWeight"
import { crclReliability, estimateCrCl, patientHasData, scrToMgDl, usePatientVitals, type PatientVitals } from "../lib/patient"
import { checkAge, checkHeight, checkScr, checkWeight } from "../lib/doseSafety"
import { loadWardRecipes, removeWardRecipe, saveWardRecipe, setPinnedWardRecipe, type WardRecipe } from "../lib/wardRecipes"
import { useStickyState, writeStickyState } from "../lib/uiState"
import { isTabPinned, reconcileOrder, recordTabUse, sortByUsage, toggleTabPin } from "../lib/tabUsage"
import { appendCalcLog, clearCalcLog, loadCalcLog, removeCalcLogEntries, type CalcLogEntry } from "../lib/calcLog"
import { loadRunning, saveRunning, upsertRunning, type RunningDrug } from "../lib/runningDrugs"
import { tickHaptic } from "../lib/haptics"
import { ScreenHeader } from "../components/ScreenHeader"
import { icons } from "../components/icons"
import { C, CHIP, R, T, TAP, normalizeSearch, shortRoute } from "../lib/ui"
import { useDisclaimerAck, SearchField, DisclaimerGate } from "./dungThuoc/sharedUi"
import { mergeWithOverrides } from "./dungThuoc/antibioticMixingHelpers"
import { parseStrictNumber } from "./dungThuoc/numberInput"
import { DosingContextValue, DosingContext } from "./dungThuoc/context"
import { PatientPanel } from "./dungThuoc/PatientPanel"
import { RunningPanel } from "./dungThuoc/RunningPanel"
import { AntibioticsScreen, DISEASE_SKIP } from "./dungThuoc/AntibioticsScreen"
import { InfusionCategoryScreen } from "./dungThuoc/InfusionCategoryScreen"
import { CalcLogSheet } from "./dungThuoc/CalcLogSheet"

// Các mục con bên trong tab "Dùng thuốc": kháng sinh + toàn bộ các nhóm thuốc truyền khai trong
// data/categories.ts (co bóp, vận mạch, giãn mạch, loạn nhịp, nội môi, an thần, thần kinh,
// khác, giải độc).
type MixingTab = "antibiotics" | InfusionCategory

const MIXING_TABS: { id: MixingTab; label: string; search: string }[] = [
  { id: "antibiotics", label: "Kháng sinh", search: "kháng sinh" },
  ...INFUSION_CATEGORIES.map((c) => ({ id: c.id as MixingTab, label: c.tabLabel, search: c.categoryLabel })),
]

// Tiêu đề một dòng, bỏ hẳn dòng mô tả phụ: dòng đó không giúp gì lúc trực mà lại đẩy nội dung
// xuống thấp và là nguồn gốc của mấy chỗ xuống dòng lệch nhau giữa các tab.
const MIXING_TITLES: Record<MixingTab, string> = {
  antibiotics: "Kháng sinh theo CrCl",
  ...(Object.fromEntries(INFUSION_CATEGORIES.map((c) => [c.id, c.title])) as Record<InfusionCategory, string>),
}

// Gợi ý MỘT LẦN DUY NHẤT cho nút "Tìm" xuyên tab — hàng 10 tab không tự dạy người dùng lần đầu rằng
// lối tắt này tồn tại (họ chỉ thấy 10 nhãn viết tắt cuộn ngang). Khác DisclaimerBar (dải nhắc THƯỜNG
// TRỰC), gợi ý này biến mất VĨNH VIỄN ngay khi người dùng mở ô tìm lần đầu — dù mở bằng cách bấm
// đúng nút được gợi ý hay tự mình bấm trước khi đọc gợi ý — nên không vi phạm nguyên tắc "không thêm
// một hàng thường trực" đã đặt ra cho nút Tìm (xem comment tại nút "Tìm" trong DungThuocScreen).
const TAB_SEARCH_HINT_KEY = "drtrong:tabSearchHintSeen"

// Báo một lần duy nhất khi hàng tab thật sự tự sắp lại theo tần suất dùng — xem effect khai báo
// tabOrderIds trong DungThuocScreen (/impeccable critique 2026-08-26, P1).
const TAB_REORDER_HINT_KEY = "drtrong:tabReorderHintSeen"

// Hai gợi ý trên trước đây lưu cờ "1" VĨNH VIỄN: nhưng đây là máy trực dùng chung, luân phiên nhiều
// bác sĩ — chỉ người đầu tiên từng thấy, người vào ca sau gặp 2 nút icon trần / hàng tab tự sắp lại
// mà không lời giải thích nào (/impeccable critique 2026-09-04, P3). Nay lưu MỐC THỜI GIAN lúc tắt và
// tự nạp lại sau HINT_REARM_MS — một lần nữa cho ca sau, vẫn không phải một hàng thường trực.
const HINT_REARM_MS = 45 * 24 * 60 * 60 * 1000
// "đã thấy gần đây" = có mốc thời gian hợp lệ và chưa quá HINT_REARM_MS. `Number(null)` = 0 và cờ "1"
// kiểu cũ → 1 → `Date.now() - at` vượt xa HINT_REARM_MS → cả hai coi như hết hạn: gợi ý hiện lại đúng
// một lần rồi được markHintSeen() ghi đè bằng mốc thật. Lỗi đọc localStorage → false (coi như chưa
// thấy: thà báo thừa một lần còn hơn mất vĩnh viễn — cùng lựa chọn đã ghi ở hai chỗ đọc bên dưới).
function hintSeenRecently(key: string): boolean {
  try {
    const at = Number(localStorage.getItem(key))
    return Number.isFinite(at) && at > 0 && Date.now() - at < HINT_REARM_MS
  } catch {
    return false
  }
}
function markHintSeen(key: string): void {
  try {
    localStorage.setItem(key, String(Date.now()))
  } catch {
    // Không lưu được thì lần sau có thể hiện lại — chấp nhận được, không chặn việc dùng app.
  }
}


// Đóng băng thứ tự tab theo phiên (xem comment ở khai báo tabOrderIds trong DungThuocScreen) tránh
// được nạn xáo trộn mỗi lần dựng lại màn, nhưng đóng băng VĨNH VIỄN cho tới khi đóng hẳn tab trình
// duyệt lại quá cứng: nếu cách dùng thật sự đổi giữa ca (thuốc cấp cứu → thuốc an thần) hoặc điện
// thoại đổi sang tay một bác sĩ khác, hàng tab vẫn giữ nguyên thứ tự cũ suốt phần còn lại của phiên
// (critique /impeccable 2026-08-18, P3). 15 phút đủ dài để không xáo trộn qua một lượt rẽ ngang
// Mindmap vài giây (đúng lý do đóng băng ra đời), đủ ngắn để phản ánh lại cách dùng nếu quay lại màn
// này sau một khoảng nghỉ thật sự.
const TAB_ORDER_REFRESH_MS = 15 * 60 * 1000

// Xuất ra để ca kiểm dựng thẳng màn này (cùng lý do đã xuất SearchScreen) — DosingContext.Provider
// nằm BÊN TRONG component nên không cần bọc thêm gì ở phía ca kiểm.
export function DungThuocScreen({
  customAntibiotics,
  diseases,
  customInfusions,
  onAddAntibiotic,
  onAddInfusion,
  onEditAntibiotic,
  onEditInfusion,
  onDeleteAntibiotic,
  onDeleteInfusion,
}: {
  customAntibiotics: Antibiotic[]
  diseases: DiseaseEntry[]
  // Danh sách thuốc tự nhập của từng nhóm, tra theo id nhóm — một prop chung thay vì một prop
  // riêng mỗi nhóm, để thêm nhóm mới không phải sửa nhiều chỗ.
  customInfusions: Record<InfusionCategory, InfusionDrug[]>
  onAddAntibiotic: () => void
  onAddInfusion: (category: InfusionCategory) => void
  onEditAntibiotic: (drug: Antibiotic) => void
  onEditInfusion: (category: InfusionCategory, drug: InfusionDrug) => void
  onDeleteAntibiotic: (id: string) => void
  onDeleteInfusion: (category: InfusionCategory, id: string) => void
}) {
  // Tab đang mở phải sống sót qua việc rời màn hình rồi quay lại — xem lib/uiState.ts.
  const [tabDaLuu, setTab] = useStickyState<MixingTab>("dungthuoc.tab", "antibiotics")
  // Giá trị đọc lên có thể là một tab KHÔNG CÒN TỒN TẠI — bản cập nhật ứng dụng gỡ một nhóm thuốc
  // trong lúc phiên trình duyệt vẫn đang chạy (service worker nạp bundle mới ở lần tải lại kế tiếp,
  // còn sessionStorage thì sống nguyên qua đó). Đã đo trên trang thật với "sedation": tiêu đề màn
  // RỖNG (MIXING_TITLES không có khoá đó), KHÔNG tab nào sáng, mà thân màn vẫn hiện nhóm Co bóp —
  // vì infusionCategory() rơi về nhóm đầu tiên. Một màn nửa vời, không có gì báo cho người dùng.
  // Lọc ở ĐÂY, ngay điểm đọc, chứ không vá từng nơi tiêu thụ: mọi thứ phía dưới (tiêu đề, chip đang
  // chọn, nội dung tab) đều ăn theo `tab` nên một phép lọc là đủ cho cả ba.
  const tab: MixingTab = MIXING_TABS.some((t) => t.id === tabDaLuu) ? tabDaLuu : "antibiotics"
  // Thứ tự HIỂN THỊ của hàng tab (khác `tab` ở trên — đó là tab đang MỞ) theo tần suất đã chọn,
  // tích luỹ nhiều ca trực qua localStorage (lib/tabUsage.ts). Xem
  // docs/superpowers/specs/2026-08-17-dungthuoc-tab-mru-design.md.
  //
  // Trước đây tính lại bằng sortByUsage() mỗi lần MÀN NÀY DỰNG — tưởng là "một lần", nhưng
  // DungThuocScreen bị gỡ khỏi cây mỗi khi rời màn hình (xem lib/uiState.ts), nên chỉ cần rẽ qua
  // Mindmap năm giây rồi quay lại là hàng tab có thể đã xáo trộn — phá trí nhớ vị trí thường xuyên
  // hơn dự tính (critique /impeccable 2026-08-17T17-38, P2). Nay ĐÓNG BĂNG theo mốc thời gian (xem
  // TAB_ORDER_REFRESH_MS), không phải cả phiên: thứ tự tính một lần rồi lưu id + mốc giờ vào
  // sessionStorage (`dungthuoc.tabOrder`/`dungthuoc.tabOrderAt`), đọc lại y nguyên ở mọi lần dựng
  // màn trong vòng TAB_ORDER_REFRESH_MS kể từ lần tính gần nhất; quá mốc đó thì tính lại theo số đếm
  // localStorage mới nhất — vừa chống xáo trộn qua một lượt rẽ ngang vài giây, vừa không khoá cứng
  // cả ca trực nếu cách dùng đổi thật hoặc điện thoại đổi sang tay người khác (critique /impeccable
  // 2026-08-18, P3). reconcileOrder() không bao giờ làm mất một tab nếu MIXING_TABS đổi giữa chừng
  // (bản cập nhật ứng dụng).
  const [tabOrderIds, setTabOrderIds] = useStickyState<string[]>("dungthuoc.tabOrder", [])
  const [tabOrderAt, setTabOrderAt] = useStickyState<number>("dungthuoc.tabOrderAt", 0)
  const orderedTabs = useMemo(
    () => (tabOrderIds.length > 0 ? reconcileOrder(MIXING_TABS, tabOrderIds) : MIXING_TABS),
    [tabOrderIds],
  )
  // Ghim thủ công 2-3 nhóm hay dùng theo tua trực — xem lib/tabUsage.ts. Đọc lại từ localStorage mỗi
  // khi đổi để nút ghim (chỉ hiện trên tab đang mở, xem hàng tab bên dưới) phản ánh đúng ngay lập
  // tức, không đợi tới lần tính lại thứ tự theo TAB_ORDER_REFRESH_MS.
  const [pinnedTabIds, setPinnedTabIds] = useState<string[]>(() => MIXING_TABS.filter((t) => isTabPinned(t.id)).map((t) => t.id))
  const togglePinTab = useCallback(
    (id: string) => {
      const nextPinned = toggleTabPin(id)
      setPinnedTabIds(nextPinned)
      setTabOrderIds(sortByUsage(MIXING_TABS).map((t) => t.id))
      setTabOrderAt(Date.now())
      tickHaptic()
      // Ghim tab đang mở có thể nhảy nó ra khỏi đầu hàng cuộn (hàng không tự cuộn theo khi thứ tự
      // đổi, chỉ cuộn MỘT LẦN lúc vào màn — xem effect activeTabRef bên dưới) — bấm sao xong mà tab
      // vừa ghim biến mất khỏi khung nhìn thì thao tác trông như không làm gì (phát hiện lúc test tay
      // sửa P2 /impeccable critique 2026-09-01). rAF đợi DOM cập nhật vị trí mới rồi mới cuộn.
      //
      // Ghim luôn đưa tab về ĐẦU hàng (sortByUsage xếp ghim trước MRU) — "start" là điểm neo rõ ràng,
      // không mập mờ. "center" (dùng khi mount, tab có thể ở bất kỳ đâu trong 10 tab) lại mập mờ cho
      // vị trí ĐẦU tiên vì không có gì bên trái để cân giữa — Assessment B đo được `scrollLeft` dừng
      // lưng chừng (31px trên tab rộng ~82px), cắt viền trái tab vừa ghim trong khoảnh khắc animation
      // (/impeccable critique 2026-09-01 lượt 2, P3). Bỏ ghim thì tab rơi về vị trí bất kỳ theo MRU —
      // giữ "center" như cũ cho trường hợp đó.
      //
      // KHÔNG dùng `scrollIntoView` — tự đo và gọi `scrollTo` trên chính container thay vì tin
      // `Element.scrollIntoView()`: kiểm tay trực tiếp phát hiện `scrollIntoView` không nhúc nhích
      // `scrollLeft` trong môi trường test này (kể cả gọi tay ngoài React, không phải do rAF hay
      // đóng gói của hàm này) — rất có thể đúng là NGUYÊN NHÂN gốc của glitch 31px Assessment B đo
      // được, không chỉ là "cắt lúc animation đang chạy" như đoán trước đó. `row.scrollTo()` gọi
      // trực tiếp trên container đã kiểm chứng chạy đúng.
      const justPinned = nextPinned.includes(id)
      // `setTimeout(fn, 0)`, KHÔNG PHẢI `requestAnimationFrame` — rAF chỉ chạy khi trình duyệt sắp vẽ
      // khung hình TIẾP THEO của một tab đang HIỂN THỊ; state đổi trong React 18 đã flush đồng bộ
      // trước khi hàng đợi task tiếp theo chạy, nên setTimeout(0) đủ để đợi DOM cập nhật xong mà
      // không phụ thuộc chu kỳ vẽ/hiển thị của tab (rAF từng không chạy khi kiểm tay trực tiếp trong
      // một tab bị trình duyệt coi là không hiển thị — cùng gốc rễ với glitch 31px Assessment B đo
      // được, không chỉ là "cắt lúc animation đang chạy" như đoán ban đầu).
      setTimeout(() => {
        const row = tabRowRef.current
        const el = activeTabRef.current
        if (!row || !el) return
        const rowRect = row.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const elOffsetWithinRow = elRect.left - rowRect.left + row.scrollLeft
        const target = justPinned
          ? elOffsetWithinRow - 20 // khớp `px-5` (20px) đệm trái của hàng tab
          : elOffsetWithinRow - (rowRect.width - elRect.width) / 2
        const maxScroll = row.scrollWidth - row.clientWidth
        row.scrollTo({ left: Math.max(0, Math.min(target, maxScroll)), behavior: "smooth" })
      }, 0)
    },
    [setTabOrderIds, setTabOrderAt],
  )
  // Báo MỘT LẦN DUY NHẤT trong đời máy khi thứ tự hàng tab THẬT SỰ đổi (không phải lần tính đầu
  // tiên, vốn chưa có gì để so với). Hàng tab tự sắp lại theo tần suất dùng có ích, nhưng phá trí
  // nhớ vị trí ("nhóm Giải độc luôn ở cuối") mà không có gì báo hiệu (/impeccable critique
  // 2026-08-26, P1) — không lặp lại mỗi lần đổi để khỏi biến một thao tác có ích thành phiền, chỉ
  // cần bác sĩ biết việc này CÓ THỂ xảy ra một lần rồi tự suy ra những lần sau.
  const [tabReorderNotice, setTabReorderNotice] = useState(false)
  const tabReorderNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (tabReorderNoticeTimer.current) clearTimeout(tabReorderNoticeTimer.current) }, [])
  useEffect(() => {
    if (tabOrderIds.length === 0) {
      setTabOrderIds(sortByUsage(MIXING_TABS).map((t) => t.id))
      setTabOrderAt(Date.now())
    } else if (Date.now() - tabOrderAt > TAB_ORDER_REFRESH_MS) {
      const next = sortByUsage(MIXING_TABS).map((t) => t.id)
      const changed = next.length !== tabOrderIds.length || next.some((id, i) => id !== tabOrderIds[i])
      setTabOrderIds(next)
      setTabOrderAt(Date.now())
      if (changed) {
        // Cờ hết hạn sau HINT_REARM_MS (xem hintSeenRecently); lỗi đọc → false (báo thừa một lần còn
        // hơn không báo lần nào).
        const seen = hintSeenRecently(TAB_REORDER_HINT_KEY)
        // Không báo nếu gợi ý "Tìm" (showTabHint, khai báo bên dưới trong cùng component — closure
        // đọc đúng giá trị vì effect này chạy SAU khi cả hàm component đã dựng xong) đang hiện: hai
        // banner một-lần giống hệt khuôn dạng (fade-in, primarySoft, nút "Đã hiểu") đứng liền kề nhau
        // sẽ trông như một banner bị lặp. KHÔNG đánh dấu "đã thấy" trong ca này — để lần tự sắp lại
        // TIẾP THEO (sau TAB_ORDER_REFRESH_MS) còn cơ hội báo, thay vì mất vĩnh viễn chỉ vì trùng thời
        // điểm với gợi ý Tìm (/impeccable critique 2026-08-26 lượt 2, P3).
        if (!seen && !showTabHint) {
          markHintSeen(TAB_REORDER_HINT_KEY)
          setTabReorderNotice(true)
          tabReorderNoticeTimer.current = setTimeout(() => setTabReorderNotice(false), 6000)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Chỉ báo vị trí cuộn cho hàng 10 tab: trước đây chỉ có hai dải mờ hai mép báo "còn cuộn được",
  // không có gì nói ĐANG Ở ĐÂU trong hàng — hàng rộng gấp ~2,4 lần khung nhìn trên điện thoại nên
  // "Giải độc" ở cuối có thể cách xa cả một màn hình cuộn (/impeccable critique 2026-08-26, P1).
  // Cập nhật trực tiếp qua ref (không qua setState) vì sự kiện scroll bắn liên tục — render lại cả
  // cây component ở mỗi khung hình cuộn sẽ giật trên máy yếu, trong khi bar/track chỉ cần đổi style.
  const tabProgressTrackRef = useRef<HTMLDivElement | null>(null)
  const tabProgressBarRef = useRef<HTMLDivElement | null>(null)
  const updateTabProgress = useCallback(() => {
    const el = tabRowRef.current
    const track = tabProgressTrackRef.current
    const bar = tabProgressBarRef.current
    if (!el || !track || !bar) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    if (scrollWidth <= clientWidth + 1) {
      track.style.opacity = "0"
      return
    }
    track.style.opacity = "1"
    const trackWidth = track.clientWidth
    const barWidth = Math.max(24, (clientWidth / scrollWidth) * trackWidth)
    const maxScroll = scrollWidth - clientWidth
    const maxLeft = trackWidth - barWidth
    const left = maxScroll > 0 ? (scrollLeft / maxScroll) * maxLeft : 0
    bar.style.width = `${barWidth}px`
    bar.style.transform = `translateX(${left}px)`
  }, [])
  useEffect(() => {
    const el = tabRowRef.current
    if (!el) return
    updateTabProgress()
    el.addEventListener("scroll", updateTabProgress, { passive: true })
    window.addEventListener("resize", updateTabProgress)
    return () => {
      el.removeEventListener("scroll", updateTabProgress)
      window.removeEventListener("resize", updateTabProgress)
    }
  }, [orderedTabs, updateTabProgress])
  const { patient, setField, reset, restore, crossTabUpdatedAt, dismissCrossTabUpdate } = usePatientVitals()
  // Nâng lên từ DisclaimerGate: cha cần biết tấm phủ có đang mở hay không để đánh dấu `inert` cho
  // nội dung phía sau nó (bàn phím/trình đọc màn hình vẫn thấy được các control nền dù aria-modal
  // đã khai đúng — không phải mọi AT tôn trọng aria-modal một mình, xem DisclaimerGate bên dưới).
  const { ack: disclaimerAck, acknowledge: acknowledgeDisclaimer } = useDisclaimerAck()
  const [patientOpen, setPatientOpen] = useState(() => !patientHasData(patient))
  const [running, setRunning] = useState<RunningDrug[]>(loadRunning)
  const [log, setLog] = useState<CalcLogEntry[]>(loadCalcLog)
  // Số cạnh nút "Nhật ký": số mục trong 12 giờ gần nhất, không phải tổng luỹ kế toàn bộ lịch sử.
  const recentLogCount = useMemo(() => {
    const cutoff = Date.now() - 12 * 60 * 60 * 1000
    return log.filter((e) => e.at >= cutoff).length
  }, [log])
  const [showLog, setShowLog] = useState(false)
  const [wardRecipes, setWardRecipes] = useState<Record<string, WardRecipe[]>>(loadWardRecipes)
  // Bản sao 20 giây cho "Hoàn tác" — xoá bệnh nhân là hành động phá huỷ nhất màn hình này, và đúng
  // kiểu hành động dễ bị một cuộc gọi/báo động cắt ngang giữa chừng (xem PRODUCT.md, bối cảnh trực
  // cấp cứu một tay trên điện thoại) — 10 giây từng dùng là quá ngắn cho tình huống đó.
  const [resetUndo, setResetUndo] = useState<{ patient: PatientVitals; running: RunningDrug[] } | null>(null)
  const resetUndoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (resetUndoTimer.current) clearTimeout(resetUndoTimer.current) }, [])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const tabRowRef = useRef<HTMLDivElement | null>(null)
  const activeTabRef = useRef<HTMLButtonElement | null>(null)
  // Tab nhớ qua useStickyState có thể đứng thứ 7-8/10 — cuộn nó vào khung nhìn một lần khi vào
  // màn (không mượt), không cuộn lại mỗi lần đổi tab bằng tay.
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // MỘT đường "chọn tab" cho cả chạm lẫn bàn phím (Trái/Phải, xem onKeyDown của hàng tab). Trước
  // đây thân hàm này nằm thẳng trong onClick — thêm nhánh bàn phím bên cạnh nó sẽ rất dễ chỉ gọi
  // setTab và bỏ quên hai việc còn lại, dựng lại đúng lỗi mà /impeccable critique 2026-08-18 đã vá
  // cho đường chạm (tab mới thừa hưởng vị trí cuộn của tab cũ nên mở ra ở giữa danh sách).
  const chonTab = useCallback(
    (id: MixingTab) => {
      recordTabUse(id)
      setTab(id)
      // Đổi tab đổi luôn nội dung bên dưới (danh sách thuốc khác hẳn) nhưng vùng cuộn dùng CHUNG cho
      // mọi tab (xem scrollRef bên dưới) — không reset thì tab mới thừa hưởng vị trí cuộn của tab
      // cũ, có thể rơi thẳng vào giữa danh sách, qua luôn cả khung bệnh nhân.
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    },
    [setTab],
  )

  // Tìm xuyên tab: một thuốc (vd adrenaline) có thể nằm ở nhiều nhóm — ô tìm riêng của từng tab
  // không thấy được. Mở bằng nút kính lúp trên tiêu đề, không chiếm hàng riêng.
  const [searchOpen, setSearchOpen] = useState(false)
  const [globalQuery, setGlobalQuery] = useState("")
  // Tăng lên mỗi lần nhảy tới một thuốc để cây con dựng lại kể cả khi thuốc nằm ngay trong tab
  // đang mở (nếu không, giá trị sticky vừa ghi sẽ không được đọc lại).
  const [jumpKey, setJumpKey] = useState(0)
  // Gợi ý một lần cho nút Tìm — mặc định ẨN nếu lỗi đọc localStorage (ngược DisclaimerGate: gợi ý
  // lặp lại mãi phiền hơn mất một lần gợi ý).
  const [showTabHint, setShowTabHint] = useState(() => {
    try {
      // null→0, cờ "1" cũ→1, mốc đã quá HINT_REARM_MS → tất cả coi như CHƯA thấy (hiện lại một lần);
      // lỗi đọc → false (ẨN — gợi ý lặp mãi phiền hơn mất một lần, ngược DisclaimerGate).
      const at = Number(localStorage.getItem(TAB_SEARCH_HINT_KEY))
      return !(Number.isFinite(at) && at > 0 && Date.now() - at < HINT_REARM_MS)
    } catch {
      return false
    }
  })
  function dismissTabHint() {
    markHintSeen(TAB_SEARCH_HINT_KEY)
    setShowTabHint(false)
  }

  const searchResults = useMemo(() => {
    const q = normalizeSearch(globalQuery)
    if (!q) return []
    const out: { tab: MixingTab; tabLabel: string; id: string; name: string; route: string; diseaseId?: string; matchedDisease?: string }[] = []
    const seen = new Set<string>()
    const push = (entry: (typeof out)[number]) => {
      // Cùng một thuốc có thể khớp cả theo tên LẪN theo bệnh lý (vd đã gõ đúng tên) — giữ bản khớp
      // theo tên (đến trước, không có nhãn bệnh lý) thay vì hiện trùng thuốc đó hai lần.
      const key = `${entry.tab}:${entry.id}`
      if (seen.has(key)) return
      seen.add(key)
      out.push(entry)
    }
    const allAbx = mergeWithOverrides(ANTIBIOTICS, customAntibiotics)
    allAbx.forEach((d) => {
      if (normalizeSearch(d.name).includes(q)) push({ tab: "antibiotics", tabLabel: "Kháng sinh", id: d.id, name: d.name, route: d.route })
    })
    INFUSION_CATEGORIES.forEach((c) => {
      mergeWithOverrides(c.staticDrugs, customInfusions[c.id] ?? []).forEach((d) => {
        if (normalizeSearch(d.name).includes(q)) push({ tab: c.id, tabLabel: c.tabLabel, id: d.id, name: d.name, route: d.route })
      })
    })
    // Tìm THEO TÊN BỆNH LÝ (vd "viêm màng não") — trước đây chỉ khớp tên thuốc, nên một bác sĩ nhớ
    // ca bệnh trước khi nhớ đúng tên hoạt chất tra ra 0 kết quả dù dữ liệu bệnh lý đã có sẵn
    // (/impeccable critique 2026-08-26, P2). Ghi kèm `diseaseId` để mở thẳng ĐÚNG chỉ định (liều có
    // thể khác liều chuẩn — vd viêm màng não cần liều cao hơn), không chỉ mở đúng thuốc.
    diseases.forEach((disease) => {
      if (!normalizeSearch(disease.name).includes(q)) return
      disease.antibiotics.forEach((abxId) => {
        const d = allAbx.find((a) => a.id === abxId)
        if (d) push({ tab: "antibiotics", tabLabel: "Kháng sinh", id: d.id, name: d.name, route: d.route, diseaseId: disease.id, matchedDisease: disease.name })
      })
    })
    // Cắt ngắn: danh sách dài hơn một màn hình thì không còn là kết quả tìm kiếm nữa mà là danh mục.
    return out.slice(0, 30)
  }, [globalQuery, customAntibiotics, customInfusions, diseases])

  // Mở thẳng thuốc vừa chọn: đặt sẵn các bước chọn của tab đích rồi mới đổi tab (xem
  // writeStickyState trong lib/uiState.ts).
  function openSearchResult(r: { tab: MixingTab; id: string; name: string; diseaseId?: string }) {
    if (r.tab === "antibiotics") {
      writeStickyState("abx.query", "")
      writeStickyState<string | null>("abx.group", r.name)
      // Khớp qua tên bệnh lý thì mở thẳng ĐÚNG chỉ định đó (liều có thể khác liều chuẩn) — khớp qua
      // tên thuốc thì bỏ qua bước chọn bệnh lý như trước (đã gọi đích danh một thuốc).
      writeStickyState<string | null>("abx.disease", r.diseaseId ?? DISEASE_SKIP)
      writeStickyState<string | null>("abx.entry", r.id)
    } else {
      const cat = infusionCategory(r.tab)
      writeStickyState(`infusion.query.${cat.categoryLabel}`, "")
      writeStickyState<string | null>(`infusion.sel.${cat.categoryLabel}`, r.id)
      writeStickyState<string | null>(`infusion.disease.${cat.categoryLabel}`, null)
    }
    recordTabUse(r.tab)
    setTab(r.tab)
    setJumpKey((n) => n + 1)
    setSearchOpen(false)
    setGlobalQuery("")
    tickHaptic()
  }

  // parseStrictNumber (không phải parseFloat) — "70abc"/"1.2.9" phải thành CHƯA NHẬP, không được
  // âm thầm rớt xuống 70/1.2 rồi chạy thẳng vào CrCl và liều mg/kg như một số sạch.
  const abwKg = useMemo(() => {
    const v = parseStrictNumber(patient.weight)
    return v == null || v <= 0 ? null : v
  }, [patient.weight])
  const heightCm = useMemo(() => {
    const v = parseStrictNumber(patient.height)
    return v == null || v <= 0 ? null : v
  }, [patient.height])
  const ageYears = useMemo(() => {
    const v = parseStrictNumber(patient.age)
    return v == null || v <= 0 ? null : v
  }, [patient.age])

  // CrCl dùng cân nặng hiệu chỉnh khi BMI > 30 kg/m², còn lại dùng cân nặng thực (Chợ Rẫy 2024).
  // KHÔNG dùng chung quy tắc với liều mg/kg (ngưỡng 120% IBW) như bản trước — hai ngưỡng khác nhau,
  // xem ghi chú ở đầu lib/bodyWeight.ts. Phải khớp HỆT `crclWeight` của PatientPanel, nếu không
  // panel in ra "tính theo AdjBW 78 kg" trong khi con số CrCl bên cạnh lại tính từ ABW.
  const crcl = useMemo(() => {
    const w = resolveCrClWeight(abwKg, heightCm, patient.sex).used
    const s = parseStrictNumber(patient.scr)
    if (ageYears == null || w == null || s == null || s <= 0) return null
    return estimateCrCl(ageYears, w, scrToMgDl(s, patient.scrUnit), patient.sex)
  }, [abwKg, heightCm, ageYears, patient.scr, patient.scrUnit, patient.sex])
  const crclUsable = crclReliability(patient) === "ok"
  // Xem comment tại DosingContextValue.crclInputImplausible — tính một lần ở đây, tiêu thụ ở cả
  // PatientPanel lẫn AntibioticDoseCard.
  const crclInputImplausible = useMemo(
    () =>
      [checkWeight(abwKg), checkHeight(heightCm), checkAge(ageYears), checkScr(parseStrictNumber(patient.scr), patient.scrUnit)].some(
        (w) => w?.severity === "implausible",
      ),
    [abwKg, heightCm, ageYears, patient.scr, patient.scrUnit],
  )

  const dosingCtx = useMemo<DosingContextValue>(
    () => ({
      patient,
      setPatientField: setField,
      patientChangedElsewhereAt: crossTabUpdatedAt,
      dismissPatientChangedElsewhere: dismissCrossTabUpdate,
      // "Bệnh nhân mới" phải xoá SẠCH (số cũ còn sót là sai nguy hiểm nhất — nhìn vẫn "có số"),
      // gồm cả bảng Đang truyền. Giữ bản sao 20 giây để "Hoàn tác".
      resetPatient: () => {
        setResetUndo({ patient, running })
        if (resetUndoTimer.current) clearTimeout(resetUndoTimer.current)
        // Ghi vào Nhật ký ĐÚNG LÚC hết hạn hoàn tác, không phải lúc bấm xoá — để bấm nhầm rồi bấm
        // "Hoàn tác" ngay sau đó không tạo dòng nhật ký thừa cho việc chưa từng thật sự xảy ra.
        const clearedSummary =
          [abwKg != null ? `${abwKg} kg` : null, heightCm != null ? `${heightCm} cm` : null, patient.sex === "male" ? "Nam" : "Nữ", ageYears != null ? `${ageYears} tuổi` : null]
            .filter(Boolean)
            .join(" · ") || "Chưa có thông số"
        const clearedRunningCount = running.length
        resetUndoTimer.current = setTimeout(() => {
          setResetUndo(null)
          setLog(
            appendCalcLog({
              drug: "Bệnh nhân hiện tại",
              kind: "patientReset",
              inputs: [clearedSummary],
              output: `Đã xoá${clearedRunningCount > 0 ? ` bệnh nhân và ${clearedRunningCount} thuốc đang dùng` : " bệnh nhân"} — không hoàn tác kịp trong 20 giây`,
              weightKg: abwKg,
            }),
          )
        }, 20_000)
        reset()
        setRunning([])
        saveRunning([])
        setPatientOpen(true)
      },
      resetUndo,
      undoResetPatient: () => {
        if (!resetUndo) return
        if (resetUndoTimer.current) clearTimeout(resetUndoTimer.current)
        restore(resetUndo.patient)
        setRunning(resetUndo.running)
        saveRunning(resetUndo.running)
        setResetUndo(null)
        // resetPatient() tự mở khung bệnh nhân (chưa có gì để nhập thì phải thấy chỗ nhập) — hoàn
        // tác khôi phục lại đúng thông số cũ nên áp dụng lại quy tắc "chỉ tự gấp khi đã có thông số"
        // (xem collapsePatientPanel) thay vì để khung đứng mở dù dữ liệu đã đầy đủ trở lại
        // (/impeccable critique 2026-08-19, quan sát nhỏ).
        if (patientHasData(resetUndo.patient)) setPatientOpen(false)
      },
      abwKg,
      heightCm,
      ageYears,
      crcl,
      crclUsable,
      crclInputImplausible,
      openPatientPanel: () => {
        setPatientOpen(true)
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
      },
      // Chỉ tự gấp khi đã có thông số — nếu chưa nhập gì mà gấp lại thì người dùng mới vào không
      // thấy chỗ nhập cân nặng ở đâu.
      collapsePatientPanel: () => setPatientOpen((open) => (open && patientHasData(patient) ? false : open)),
      running,
      // Chống trùng nằm trong lib/runningDrugs.ts (upsertRunning) — cùng thuốc thật thì cập nhật
      // chứ không thêm bản thứ hai, kể cả khi hai bản ghi có drugId khác nhau.
      pinRunning: (item) =>
        setRunning((prev) => {
          const next = upsertRunning(prev, item)
          saveRunning(next)
          return next
        }),
      unpinRunning: (id) =>
        setRunning((prev) => {
          const next = prev.filter((r) => r.id !== id)
          saveRunning(next)
          return next
        }),
      setRunningLine: (id, line) =>
        setRunning((prev) => {
          const next = prev.map((r) => (r.id === id ? { ...r, line } : r))
          saveRunning(next)
          return next
        }),
      // Nhật ký neo theo cân nặng và thời điểm, KHÔNG theo tên người bệnh — app cố ý không lưu
      // thông tin định danh (xem lib/patient.ts).
      logCalc: (entry) => setLog(appendCalcLog({ ...entry, weightKg: abwKg })),
      wardRecipes,
      saveWard: (recipe) =>
        // Hậu tố ngẫu nhiên: id chỉ theo `${drugId}-${Date.now()}` (độ phân giải mili-giây) có thể
        // trùng khi double-tap "Lưu công thức" nhanh, đè mất công thức lưu trước.
        setWardRecipes(
          saveWardRecipe({ ...recipe, id: recipe.id ?? `${recipe.drugId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, savedAt: Date.now() }),
        ),
      clearWard: (drugId, recipeId) => setWardRecipes(removeWardRecipe(drugId, recipeId)),
      pinWard: (drugId, recipeId) => setWardRecipes(setPinnedWardRecipe(drugId, recipeId)),
    }),
    [
      patient,
      setField,
      reset,
      restore,
      crossTabUpdatedAt,
      dismissCrossTabUpdate,
      abwKg,
      heightCm,
      ageYears,
      crcl,
      crclUsable,
      crclInputImplausible,
      running,
      wardRecipes,
      resetUndo,
    ],
  )

  return (
    <DosingContext.Provider value={dosingCtx}>
    {/* `screen-transition` (fadeSlideIn 0.22s): cùng hiệu ứng vào-màn với Thư viện / Mindmap và
        mọi màn cấp-tab khác — trước đây DungThuocScreen là màn DUY NHẤT thiếu nó (chủ dự án
        2026-09-03). Có rule prefers-reduced-motion riêng trong index.css. */}
    <div className="scr-dose h-full flex flex-col relative screen-transition">
      {/* `inert` trên toàn bộ nội dung nền trong khi DisclaimerGate còn mở — role="dialog" +
          aria-modal="true" + bẫy Tab (useDialogFocus) đã đúng chuẩn, nhưng không phải mọi trình đọc
          màn hình tôn trọng aria-modal một mình; `inert` chặn cả focus lẫn cây accessibility của nội
          dung phía sau một cách chắc chắn, không phụ thuộc AT có hỗ trợ hay không (critique
          /impeccable 2026-08-17T22-03, P3). Bọc thêm MỘT lớp flex thay vì rải `inert` trên từng khối
          con — `flex-1 min-h-0` giữ nguyên hành vi chiều cao của flex-col cha, không đổi layout.
          `max-w-[860px] mx-auto`: PWA vốn mobile-first, nhưng mở trên tablet/desktop thì không có
          giới hạn bề rộng nào — chữ liều/cảnh báo chạy 100–200 ký tự/dòng, chevron disclosure kẹt
          tận mép phải (/impeccable critique 2026-08-31, P2). Dưới 860px là no-op. `relative` để toast
          "Hoàn tác" (bên dưới) neo trong đúng cột đã giới hạn. */}
      <div className="flex-1 min-h-0 flex flex-col relative w-full max-w-[860px] mx-auto" inert={!disclaimerAck || undefined}>
      <ScreenHeader
        title={MIXING_TITLES[tab]}
        titleClamp={2}
        actions={
          <>
            {/* Nút chủ đề sáng/tối KHÔNG còn ở đây (chủ dự án quyết 2026-09-04): chủ đề chỉ đổi ở
                Trang chủ. Lý do cũ — lối tắt PWA "?screen=mixing" vào thẳng màn này nên cần một nút
                giảm chói tại chỗ — đã bị chính cái giá của nó vượt qua: bấm nút ở đây làm TẢI LẠI
                TRANG (xem saveTheme, lib/theme.ts) ngay giữa lúc đang tra liều.
                Nút "Tìm" và "Nhật ký" là hai nút biểu tượng vuông (h-9 w-9) cùng một khuôn markup
                (`flex items-center justify-center py-1` + `<span>` pill viền mỏng), để cả hai nút
                hành động cao đúng 44px và icon canh giữa khớp nhau trên một hàng. Từng có nhãn chữ
                "Tìm"/"Nhật ký" xếp dọc dưới icon (flex-col) — nhưng cột dọc làm chúng cao 53px thay
                vì 44px, đẩy icon lên lệch ~6px so với hàng (chủ dự án gửi ảnh lệch hàng 2026-09-03).
                Bỏ nhãn là hết lệch. aria-label vẫn đủ cho trình đọc màn hình. */}
            <button
              onClick={() => {
                setSearchOpen((v) => !v)
                setGlobalQuery("")
                if (showTabHint) dismissTabHint()
              }}
              className="flex-none flex items-center justify-center py-1"
              aria-label="Tìm thuốc trong mọi nhóm"
            >
              <span
                className={`h-9 w-9 ${R.pill} border flex items-center justify-center`}
                style={searchOpen ? { borderColor: C.primary, background: C.primarySoft, color: "var(--c-primary-deep)" } : { borderColor: C.line, color: C.textSoft }}
              >
                {/* icons.search() cố định 24px — thu nhỏ bằng scale ở đây, không sửa icon dùng chung
                    (chỗ khác gọi icons.search() vẫn cần đúng cỡ gốc). Giữ active=false: tô đặc làm
                    mất nét tay cầm kính lúp, trông như ảnh vỡ. */}
                <span className="flex items-center justify-center" style={{ transform: "scale(0.8)" }}>
                  {icons.search(false)}
                </span>
              </span>
            </button>
            <button
              onClick={() => setShowLog(true)}
              className="flex-none flex items-center justify-center py-1"
              aria-label={`Nhật ký${recentLogCount > 0 ? ` · ${recentLogCount} mục gần đây` : ""}`}
            >
              <span className={`relative h-9 w-9 ${R.pill} border flex items-center justify-center`} style={{ borderColor: C.line, color: C.textSoft }}>
                {icons.memory()}
                {recentLogCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: C.primary, color: "var(--c-on-primary)" }}
                    aria-hidden="true"
                  >
                    {recentLogCount > 9 ? "9+" : recentLogCount}
                  </span>
                )}
              </span>
            </button>
          </>
        }
      />

      {searchOpen && (
        <div className="fade-in flex-none px-5 pb-3">
          <SearchField
            value={globalQuery}
            onChange={setGlobalQuery}
            placeholder="Tìm thuốc trong mọi nhóm..."
            autoFocus
            onClose={() => {
              setSearchOpen(false)
              setGlobalQuery("")
            }}
          />
          {globalQuery.trim() !== "" && (
            <div className={`${R.box} border overflow-hidden`} style={{ borderColor: C.line, background: C.surface }}>
              {searchResults.length === 0 ? (
                <p className={`${T.body} px-3 py-3`} style={{ color: C.textSoft }}>
                  Không có thuốc nào khớp "{globalQuery.trim()}" trong danh mục.
                </p>
              ) : (
                <div
                  className="max-h-64 overflow-y-auto scroll-ios"
                  role="group"
                  aria-label={`${searchResults.length} kết quả tìm kiếm`}
                  // Mũi tên lên/xuống di chuyển focus giữa các nút, không đổi hành vi kích hoạt gốc
                  // (Enter/Space/chạm vẫn nguyên vẹn).
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
                    const container = e.currentTarget
                    const items = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
                    const idx = items.indexOf(document.activeElement as HTMLButtonElement)
                    if (idx === -1) return
                    e.preventDefault()
                    const next = e.key === "ArrowDown" ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0)
                    items[next]?.focus()
                  }}
                >
                  {searchResults.map((r, i) => (
                    <button
                      key={`${r.tab}-${r.id}`}
                      onClick={() => openSearchResult(r)}
                      className={`rise-in w-full text-left px-3 py-2.5 border-b ${TAP}`}
                      style={{ borderColor: C.lineSoft, "--i": i } as React.CSSProperties}
                      // aria-posinset/aria-setsize: trình đọc màn hình đọc "mục 2 trên 5" thay vì chỉ
                      // đọc từng nút rời rạc không rõ đang ở đâu trong danh sách kết quả (/impeccable
                      // critique 2026-08-18, P3). Giữ nguyên <button> gốc (không đổi role) — chuyển
                      // hẳn sang role="option"/listbox sẽ mất luôn ngữ nghĩa "bấm để kích hoạt" mặc
                      // định của button trên một số trình đọc, đổi lấy lợi ích không chắc lớn hơn.
                      aria-posinset={i + 1}
                      aria-setsize={searchResults.length}
                    >
                      <div className="flex items-center gap-2">
                        <p className={`${T.bodyStrong} truncate flex-1`} style={{ color: C.text }}>
                          {r.name}
                        </p>
                        <span className={`${T.meta} font-semibold px-2 py-0.5 ${R.pill} flex-none`} style={{ background: C.primarySoft, color: "var(--c-primary-deep)" }}>
                          {r.tabLabel}
                        </span>
                      </div>
                      <p className={`${T.meta} truncate`} style={{ color: C.textSoft }}>
                        {/* Khớp qua tên bệnh lý (không phải tên thuốc) — nói rõ VÌ SAO kết quả này xuất
                            hiện, để bác sĩ không tưởng đây là khớp tên thuốc rồi thắc mắc sao lại đúng
                            chỉ định đó (/impeccable critique 2026-08-26, P2). */}
                        {r.matchedDisease ? `Khớp bệnh lý: ${r.matchedDisease} · ${shortRoute(r.route)}` : shortRoute(r.route)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Danh sách nhóm thuốc khi Ô TÌM CÒN TRỐNG — nút ghim trên hàng tab chỉ hiện ở tab ĐANG
              MỞ (xem hàng tab bên dưới), nên ghim một nhóm đang nằm ngoài màn hình vẫn phải cuộn tới
              nó trước. Ở đây ghim/nhảy được TỚI BẤT KỲ nhóm nào ngay từ khung Tìm, không cần đã đứng
              sẵn ở tab đó (/impeccable critique 2026-09-01 lượt 2, P2 — mở rộng phạm vi theo yêu cầu
              chủ dự án, không chỉ vá gọn). Dùng `t.search` (nhãn đầy đủ) thay vì `t.label` (nhãn tắt
              trên chip) — đúng quy ước đã ghi ở khai báo MIXING_TABS. */}
          {globalQuery.trim() === "" && (
            <div className={`${R.box} border overflow-hidden mt-2`} style={{ borderColor: C.line, background: C.surface }}>
              <p className={`${T.meta} px-3 pt-2.5 pb-1.5`} style={{ color: C.textSoft }}>
                Nhảy tới nhóm — chạm sao để ghim lên đầu hàng tab
              </p>
              <div className="max-h-64 overflow-y-auto scroll-ios">
                {orderedTabs.map((t) => (
                  <div key={t.id} className="flex items-center border-b" style={{ borderColor: C.lineSoft }}>
                    <button
                      onClick={() => {
                        chonTab(t.id)
                        setSearchOpen(false)
                        setGlobalQuery("")
                      }}
                      className={`flex-1 min-w-0 text-left px-3 py-2.5 ${TAP}`}
                    >
                      <p className={`${T.bodyStrong} truncate`} style={{ color: C.text }}>
                        {t.search}
                      </p>
                    </button>
                    {/* Nút ghim — sao TRẦN, cùng nguyên tắc "không nền / không viền / không bo" với nút
                        ghim trên hàng tab (xem chú thích ở đó). Ở đây sao nằm trên nền `--c-surface`
                        của hàng danh sách (không phải chip primary) nên KHÔNG cần `--c-fav-bright` +
                        viền: BẬT = sao đặc `--c-fav` (gold đậm bản sáng / vàng-chanh bản tối, đều đạt
                        ≥3:1 trên surface); TẮT = sao viền rỗng `--c-text-soft` ở opacity 0.5. */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePinTab(t.id)
                      }}
                      className="flex-none w-11 h-11 mr-1 flex items-center justify-center rounded-full"
                      style={{
                        color: pinnedTabIds.includes(t.id) ? C.fav : C.textSoft,
                        opacity: pinnedTabIds.includes(t.id) ? 1 : 0.5,
                      }}
                      aria-label={pinnedTabIds.includes(t.id) ? `Bỏ ghim nhóm ${t.search}` : `Ghim nhóm ${t.search} lên đầu hàng`}
                      aria-pressed={pinnedTabIds.includes(t.id)}
                    >
                      {icons.starPin(pinnedTabIds.includes(t.id))}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 10 tab cuộn ngang, hai dải mờ hai mép báo còn cuộn được. Thứ tự = orderedTabs (theo tần
          suất đã chọn, xem khai báo ở trên) — KHÔNG phải MIXING_TABS gốc. */}
      <div className="flex-none pb-3 relative">
        <div
          ref={tabRowRef}
          // gap-3: khoảng cách đủ để ngón tay run/vuốt không trượt sang tab kế bên.
          className="scroll-ios flex gap-3 px-5 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
          role="tablist"
          aria-label="Nhóm thuốc"
          // Trái/Phải, không phải Lên/Xuống: hàng này cuộn NGANG, phím phải khớp hướng đi thật của
          // mắt và của thanh cuộn. DỪNG ở hai đầu thay vì chạy vòng — hai dải mờ ở mép hàng là tín
          // hiệu "còn cuộn được theo hướng này"; nhảy vòng về đầu kia làm chính tín hiệu đó nói dối.
          // Đi qua `chonTab` như đường chạm, không gọi thẳng setTab (xem chú thích ở chonTab).
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
            const i = orderedTabs.findIndex((t) => t.id === tab)
            if (i === -1) return
            const j = e.key === "ArrowRight" ? Math.min(i + 1, orderedTabs.length - 1) : Math.max(i - 1, 0)
            if (j === i) return
            e.preventDefault()
            chonTab(orderedTabs[j].id)
            // Nút đích luôn có sẵn trong DOM (mọi tab render đồng thời, chỉ đổi style/aria-selected)
            // nên focus được ngay, không phải đợi lượt render kế.
            document.getElementById(`mixing-tab-${orderedTabs[j].id}`)?.focus()
          }}
        >
          {orderedTabs.map((t) => (
            // `relative` để nút ghim (sao) NẰM THẲNG TRÊN chip đang chọn — không phải một đoạn/nút
            // tròn riêng cạnh nó (chủ dự án 2026-09-03: "không được để ranh giới là nút tròn → hoà
            // vào button định nghĩa nó, nằm sát bên phải, không vẽ line viền"). Sao là icon TRẦN
            // (không nền, không viền, không bo), đặt `absolute` sát mép phải trong phần đệm `pr-10`
            // mà chip tự chừa khi đang chọn — nhìn ra một chip DUY NHẤT có ngôi sao ở góc phải.
            //
            // `role="group"` + `aria-label` CHỈ khi có nút ghim (tab đang mở): theo ARIA APG một
            // `tablist` chỉ nên chứa phần tử `tab`; `role="group"` gom chip + nút ghim thành MỘT đơn
            // vị có tên ("Kháng sinh (kèm nút ghim)") thay vì hai control rời rạc. 9 tab còn lại
            // không có nút ghim nên không cần group.
            <div key={t.id} className="flex-none relative flex items-center" role={tab === t.id ? "group" : undefined} aria-label={tab === t.id ? t.label : undefined}>
              <button
                id={`mixing-tab-${t.id}`}
                ref={tab === t.id ? activeTabRef : null}
                onClick={() => chonTab(t.id)}
                // Roving tabindex (ARIA APG): chỉ tab đang chọn nằm trong thứ tự Tab của trình duyệt,
                // các tab khác chỉ tới được bằng Trái/Phải — Tab-key không phải lướt qua cả 10 nút mới
                // ra khỏi hàng.
                tabIndex={tab === t.id ? 0 : -1}
                // pulse-scale chỉ đặt khi CHÍNH tab này vừa thành active — remount qua key riêng để
                // hoạt ảnh chạy lại mỗi lần chuyển tab. `pr-10` khi đang chọn: chừa chỗ cho ngôi sao
                // trần đặt đè lên mép phải, chữ không đụng sao.
                className={`${CHIP} border-transparent${tab === t.id ? " pulse-scale pr-10" : ""}`}
                // C.textSoft cho tab chưa chọn, không phải text-muted — text-muted dưới ngưỡng AA ở cỡ này.
                style={tab === t.id ? { background: C.primary, color: "var(--c-on-primary)" } : { background: C.lineSoft, color: C.textSoft }}
                role="tab"
                aria-selected={tab === t.id}
                aria-controls="mixing-tabpanel"
              >
                {t.label}
              </button>
              {/* Ngôi sao ghim — icon TRẦN đè lên góc phải chip đang chọn. Không nền / không viền /
                  không bo tròn (chỉ `rounded-full` cho vòng focus, trong suốt nên vô hình) — hoà hẳn
                  vào chip. Chủ dự án 2026-09-03: sao ưa thích PHẢI màu VÀNG, và KHÔNG có bờ viền ngoài
                  ngôi sao.
                  BẬT (đã ghim): tô đặc TRƠN `--c-fav-bright`, KHÔNG viền. Token này đổi theo theme để
                    luôn tương phản độ chói với nền chip primary (vốn đảo màu): bản SÁNG chip xanh
                    indigo ĐẬM → vàng-chanh #facc15 (nổi ~7:1); bản TỐI chip xanh trời NHẠT → vàng-gold
                    ĐẬM #7e4f0c (nổi ~3,3:1). Đặc + màu vàng + opacity 1.
                  TẮT (chưa ghim): sao VIỀN RỖNG màu `--c-on-bright` (= màu chữ chip) ở opacity 0.5 —
                    gợi ý mờ "chạm để ghim".
                  KHÔNG `dose-press` / nền / viền / bo hiện hình: nút favorite chỉ đổi CHÍNH NGÔI SAO
                  (rỗng↔đặc, màu, độ mờ), không hiệu ứng "nút" nào khác. Vùng chạm 32px trong chip 44px. */}
              {tab === t.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePinTab(t.id)
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full"
                  style={{
                    color: pinnedTabIds.includes(t.id) ? C.favBright : "var(--c-on-primary)",
                    opacity: pinnedTabIds.includes(t.id) ? 1 : 0.5,
                  }}
                  aria-label={pinnedTabIds.includes(t.id) ? `Bỏ ghim nhóm ${t.label}` : `Ghim nhóm ${t.label} lên đầu hàng`}
                  aria-pressed={pinnedTabIds.includes(t.id)}
                >
                  {icons.starPin(pinnedTabIds.includes(t.id))}
                </button>
              )}
            </div>
          ))}
        </div>
        {/* (Trước đây có hai dải mờ gradient hai mép báo "còn cuộn được" — chủ dự án 2026-09-03 yêu
            cầu bỏ; thanh tiến trình cuộn ngay dưới đây đã đủ tín hiệu "còn nữa".) */}
        {/* Track/bar nằm trong đúng khoảng pb-3 (12px) chừa sẵn dưới hàng tab — không chiếm thêm
            chỗ, không đụng hai dải mờ (chỉ phủ tới bottom-3, không phủ khoảng này). opacity ban đầu
            0 tránh nháy một dải đầy trước khi updateTabProgress() đo xong kích thước thật lúc mount. */}
        <div ref={tabProgressTrackRef} className="absolute left-5 right-5 bottom-0 h-[3px] rounded-full pointer-events-none" style={{ background: C.lineSoft, opacity: 0, transition: "opacity .2s ease" }}>
          <div ref={tabProgressBarRef} className="h-full rounded-full" style={{ background: C.primaryLine, transition: "transform .1s linear" }} />
        </div>
      </div>
      {/* Báo một lần khi hàng tab vừa TỰ sắp lại theo tần suất dùng — xem effect khai báo
          tabReorderNotice ở trên. Cùng khuôn dạng với gợi ý "Tìm" bên dưới, chỉ khác nội dung. */}
      {tabReorderNotice && (
        <div
          className="fade-in flex-none mx-5 mb-3 flex items-center gap-2 px-3 py-2 rounded-[14px]"
          style={{ background: C.primarySoft, border: `1px solid ${C.primaryLine}` }}
        >
          <p className={`${T.meta} flex-1`} style={{ color: "var(--c-primary-deep)" }}>
            Thứ tự nhóm thuốc vừa đổi theo tần suất bạn dùng gần đây.
          </p>
          <button
            onClick={() => setTabReorderNotice(false)}
            className={`flex-none h-11 px-3 ${R.pill} dose-press text-[12px] font-bold`}
            style={{ background: C.primary, color: "var(--c-on-primary)" }}
          >
            Đã hiểu
          </button>
        </div>
      )}
      {/* Gợi ý một lần cho nút "Tìm" — MỘT DÒNG chữ mờ ngay dưới hàng tab, không viền/nền/nút, không
          màu thương hiệu: trước đây là banner primarySoft + nút "Đã hiểu" — thứ TO NHẤT trên màn
          rỗng, đè lên nội dung lâm sàng (/impeccable critique 2026-08-31, P2). Tự biến mất vĩnh viễn
          khi người dùng mở ô Tìm lần đầu (dismissTabHint trong onClick nút Tìm). */}
      {showTabHint && (
        <p className="fade-in flex-none mx-5 mb-2 text-[12px] leading-[1.4]" style={{ color: C.textSoft }}>
          Không thấy thuốc trong {MIXING_TABS.length} nhóm?{" "}
          <button
            onClick={() => {
              setSearchOpen(true)
              setGlobalQuery("")
              dismissTabHint()
            }}
            className="underline font-semibold"
            style={{ color: C.textSoft }}
          >
            Tìm xuyên tất cả
          </button>
        </p>
      )}
      {/* Một vùng cuộn duy nhất cho cả khung bệnh nhân, bảng Đang truyền và danh sách thuốc —
          để khung bệnh nhân cuộn đi được thay vì chiếm chỗ cố định trên màn hình điện thoại. */}
      <div ref={scrollRef} className="scroll-ios flex-1">
        <PatientPanel
          open={patientOpen}
          onToggle={() => setPatientOpen((v) => !v)}
          renalRelevantByDefault={tab === "antibiotics"}
        />
        <RunningPanel />
        <div
          key={`${tab}-${jumpKey}`}
          className="fade-in"
          role="tabpanel"
          id="mixing-tabpanel"
          aria-labelledby={`mixing-tab-${tab}`}
        >
          {tab === "antibiotics" ? (
            <AntibioticsScreen customDrugs={customAntibiotics} diseases={diseases} onAddNew={onAddAntibiotic} onEdit={onEditAntibiotic} onDelete={onDeleteAntibiotic} scrollContainerRef={scrollRef} />
          ) : (
            (() => {
              const cat = infusionCategory(tab)
              return (
                <InfusionCategoryScreen
                  staticDrugs={cat.staticDrugs}
                  customDrugs={customInfusions[cat.id] ?? []}
                  diseases={diseases}
                  categoryLabel={cat.categoryLabel}
                  onAddNew={() => onAddInfusion(cat.id)}
                  onEdit={(drug) => onEditInfusion(cat.id, drug)}
                  onDelete={(id) => onDeleteInfusion(cat.id, id)}
                />
              )
            })()
          )}
        </div>
      </div>

      {showLog && (
        <CalcLogSheet
          entries={log}
          onClear={() => setLog(clearCalcLog())}
          onRemove={(ids) => setLog(removeCalcLogEntries(ids))}
          onClose={() => setShowLog(false)}
        />
      )}
      {resetUndo && (
        <div
          role="status"
          aria-live="assertive"
          className="toast-in-full absolute left-4 right-4 z-50 rounded-[20px] px-4 py-3 flex items-center gap-3"
          // --c-pill-dark: cố ý LUÔN tối bất kể theme. Chữ dùng --c-pill-dark-text (luôn trắng, khai
          // riêng ở index.css) thay vì --c-on-bright — token đó đổi gần-đen ở bản tối (dành cho chữ
          // trên nền sáng lên), trở nên vô hình trên nền pill luôn-tối này.
          // aria-live="assertive": đây là toast duy nhất của app đi kèm hành động PHÁ HỦY (reset
          // bệnh nhân) — người dùng đọc màn hình cần biết ngay cửa sổ hoàn tác 20s vừa mở, không thể
          // chờ ngắt quãng lượt đọc như các aria-live="polite" khác trong file.
          style={{ bottom: "var(--above-nav)", background: "var(--c-pill-dark)", boxShadow: "0 8px 24px var(--c-shadow), var(--c-shadow-glow)" }}
        >
          <p className="flex-1 text-[13px] font-semibold" style={{ color: "var(--c-pill-dark-text)" }}>
            Đã xoá bệnh nhân{resetUndo.running.length > 0 ? ` và ${resetUndo.running.length} thuốc đang dùng` : ""}
          </p>
          <button
            onClick={() => dosingCtx.undoResetPatient()}
            className="flex-none h-8 px-3 rounded-full text-[12px] font-bold"
            style={{ background: C.primary, color: "var(--c-on-primary)" }}
          >
            Hoàn tác
          </button>
        </div>
      )}
      </div>
      <DisclaimerGate ack={disclaimerAck} onAcknowledge={acknowledgeDisclaimer} />
    </div>
    </DosingContext.Provider>
  )
}

