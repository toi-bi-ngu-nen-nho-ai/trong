import { useState, useRef, useEffect, useMemo } from "react"
import type { Antibiotic, DiseaseEntry } from "../../data/types"
import { ANTIBIOTICS } from "../../data"
import { useStickyState } from "../../lib/uiState"
import { recordAbxGroupUse, sortGroupsByUsage } from "../../lib/drugUsage"
import { icons } from "../../components/icons"
import { C, CHIP, R, T, TAP, normalizeSearch, scrollElementIntoView, shortDrugName, shortRoute } from "../../lib/ui"
import { useDosing } from "./context"
import { mergeWithOverrides, STATIC_ANTIBIOTIC_IDS } from "./antibioticMixingHelpers"
import { SectionLabel, SearchField, Chip } from "./sharedUi"
import { AntibioticDoseCard } from "./AntibioticDoseCard"

export const DISEASE_SKIP = "__skip__"
// Số chip hiện mặc định trước khi bấm "Xem tất cả" — thấp hơn hẳn 22 mục gốc để không phơi cả danh
// mục cùng lúc trước khi người dùng kịp thu hẹp bằng tìm/chữ cái (/impeccable critique 2026-08-18,
// P2). Giảm từ 8 xuống 6: 8 vẫn gấp đôi ngưỡng ≤4 lựa chọn tại một điểm quyết định
// (cognitive-load.md, Working Memory Rule) — 6 vẫn đủ lấp một màn hình phổ biến mà không cuộn, chỉ
// bớt được phần dư ra thực sự (/impeccable critique 2026-08-22, P2).
const ABX_GROUP_COLLAPSE_COUNT = 6

export function AntibioticsScreen({
  customDrugs,
  diseases,
  onAddNew,
  onEdit,
  onDelete,
  scrollContainerRef,
}: {
  customDrugs: Antibiotic[]
  diseases: DiseaseEntry[]
  onAddNew: () => void
  onEdit: (drug: Antibiotic) => void
  onDelete: (id: string) => void
  // Vùng cuộn CHUNG của cả màn Dùng thuốc (khai ở DungThuocScreen) — thanh nhảy chữ cái tự tính
  // toạ độ và gọi scrollTo trên chính container này thay vì scrollIntoView (xem lý do ở chỗ dùng).
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
}) {
  const { running, collapsePatientPanel } = useDosing()
  // Cả bốn bước chọn đều giữ lại khi rời màn hình rồi quay lại: đi tra một thứ khác rồi về mà phải
  // bấm lại từ hoạt chất → bệnh lý → đường dùng là mất đúng công đoạn dài nhất của màn này.
  const [query, setQuery] = useStickyState("abx.query", "")
  // Chưa lọc/chưa chọn gì thì mặc định RÚT GỌN xuống ABX_GROUP_COLLAPSE_COUNT chip hay tra nhất
  // (sortGroupsByUsage) thay vì phơi hết 22 chip cùng lúc — vượt hẳn ngưỡng cognitive-load ≤4 lựa
  // chọn tại một điểm quyết định (/impeccable critique 2026-08-18, P2). KHÔNG lưu sticky: mỗi lần
  // ghé tab này lại bắt đầu từ tập rút gọn, đúng tinh thần "truy cập nhanh thứ hay dùng" — không
  // phải nhớ lại đúng chỗ đã cuộn tới như bốn bước chọn thuốc ở trên.
  const [showAllGroups, setShowAllGroups] = useState(false)
  const [selectedGroupName, setSelectedGroupName] = useStickyState<string | null>("abx.group", null)
  const [diseaseChoice, setDiseaseChoice] = useStickyState<string | null>("abx.disease", null) // disease id, DISEASE_SKIP, hoặc null (chưa chọn)
  const [selectedEntryId, setSelectedEntryId] = useStickyState<string | null>("abx.entry", null)

  // Tuổi/cân nặng/chiều cao/creatinin và cả phép tính CrCl nay nằm ở khung "Bệnh nhân hiện tại"
  // dùng chung cho mọi tab của Dùng thuốc (xem PatientPanel) — mỗi thẻ thuốc tự đọc từ context.
  const allAntibiotics = useMemo(() => mergeWithOverrides(ANTIBIOTICS, customDrugs), [customDrugs])

  // Nhóm các bản ghi theo hoạt chất (name) — cùng hoạt chất có thể có nhiều đường dùng (route)
  // khác nhau, mỗi đường dùng là một Antibiotic riêng (id riêng) để tránh đè dữ liệu lên nhau.
  // Sắp theo alphabet (thứ tự nhập liệu trong antibiotics.ts không mang ý nghĩa ưu tiên lâm sàng nào
  // — xác nhận trực tiếp, không phải suy đoán) để 22 mục đọc ra như một danh sách có trật tự thay vì
  // một khối tên thuốc ngẫu nhiên; xem thêm nhãn chữ cái ở chỗ render (chỉ hiện khi chưa gõ tìm).
  const groups = useMemo(() => {
    const map = new Map<string, Antibiotic[]>()
    allAntibiotics.forEach((d) => {
      const arr = map.get(d.name) ?? []
      arr.push(d)
      map.set(d.name, arr)
    })
    return Array.from(map.entries())
      .map(([name, entries]) => ({ name, entries }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi", { sensitivity: "base" }))
  }, [allAntibiotics])

  // Chữ cái duy nhất theo đúng thứ tự `groups` (đã sắp alphabet ở trên) — cấp dữ liệu cho thanh
  // nhảy nhanh bên dưới, tận dụng lại đúng phép nhóm đã dùng để vẽ nhãn chữ cái, không tính lại.
  const alphabetLetters = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    groups.forEach((g) => {
      const letter = g.name.charAt(0).toUpperCase()
      if (!seen.has(letter)) {
        seen.add(letter)
        out.push(letter)
      }
    })
    return out
  }, [groups])

  const filteredGroups = useMemo(() => {
    const q = normalizeSearch(query)
    return q ? groups.filter((g) => normalizeSearch(g.name).includes(q)) : groups
  }, [groups, query])
  // Gõ tới khi chỉ còn một hoạt chất thì chọn luôn — giống bên các tab thuốc truyền.
  const effectiveGroupName = selectedGroupName ?? (query.trim() && filteredGroups.length === 1 ? filteredGroups[0].name : null)
  const selectedGroup = effectiveGroupName ? groups.find((g) => g.name === effectiveGroupName) ?? null : null

  // Tập chip hiển thị khi ĐANG DUYỆT (chưa chọn nhóm, chưa gõ tìm) và CHƯA bấm "Xem tất cả": rút
  // xuống ABX_GROUP_COLLAPSE_COUNT chip hay tra nhất (sortGroupsByUsage, đếm 0 lần đầu mở app thì
  // giữ nguyên alphabet). Có query hoặc đã bấm "Xem tất cả" thì luôn hiện đủ filteredGroups — tìm
  // kiếm không bao giờ được phép giấu bớt kết quả.
  const browseGroups = useMemo(() => {
    if (query.trim() || showAllGroups) return filteredGroups
    return sortGroupsByUsage(filteredGroups).slice(0, ABX_GROUP_COLLAPSE_COUNT)
  }, [filteredGroups, query, showAllGroups])
  const isCollapsedBrowse = !query.trim() && !showAllGroups && filteredGroups.length > ABX_GROUP_COLLAPSE_COUNT

  // Kháng sinh bệnh nhân đang dùng (đã thêm vào bảng Đang truyền) — thứ cần xem lại trước tiên,
  // thay vì phải tìm lại trong danh mục mỗi lần đổi ca.
  const onPatient = useMemo(() => {
    const byId = new Map(allAntibiotics.map((d) => [d.id, d]))
    return running.map((r) => byId.get(r.drugId)).filter((d): d is Antibiotic => d != null)
  }, [allAntibiotics, running])

  // Bệnh lý liên quan tới NHÓM (hoạt chất) đang chọn, gộp từ mọi đường dùng của hoạt chất đó.
  // Gồm cả 2 chiều: bệnh lý có sẵn tham chiếu tới thuốc (DISEASES.antibiotics) VÀ bệnh lý mà
  // chính thuốc (thường là kháng sinh tự nhập) tự khai qua `indications` — để "Bệnh lý áp dụng"
  // chọn khi thêm kháng sinh tự nhập đồng bộ với Bước 2 ở đây.
  const diseasesForGroup = useMemo(() => {
    if (!selectedGroup) return []
    const ids = new Set(selectedGroup.entries.map((e) => e.id))
    const indicationDiseaseIds = new Set(selectedGroup.entries.flatMap((e) => e.indications?.map((ind) => ind.diseaseId) ?? []))
    return diseases.filter((d) => d.antibiotics.some((id) => ids.has(id)) || indicationDiseaseIds.has(d.id))
  }, [selectedGroup, diseases])
  const hasDiseaseStep = diseasesForGroup.length > 0
  // Chỉ 1 bệnh lý khớp = không có quyết định thật nào để bắt chọn (khác trường hợp nhiều bệnh lý,
  // nơi ép chọn đúng chỉ định là an toàn cố ý — xem comment "KHÔNG còn chip Liều chung" ở JSX bên
  // dưới) — cùng lý do `autoEntry` đã tự chọn đường dùng khi chỉ còn một lựa chọn. Xác nhận với
  // chủ dự án (/impeccable critique 2026-08-19).
  const autoDisease = hasDiseaseStep && diseasesForGroup.length === 1 ? diseasesForGroup[0] : null
  const effectiveDiseaseChoice = autoDisease ? autoDisease.id : diseaseChoice

  const selectedDisease =
    effectiveDiseaseChoice && effectiveDiseaseChoice !== DISEASE_SKIP ? diseases.find((d) => d.id === effectiveDiseaseChoice) ?? null : null

  // Đường dùng còn phù hợp: nếu đã chọn bệnh lý cụ thể, chỉ giữ đường dùng được bệnh lý đó tham chiếu
  // (kể cả tham chiếu ngược qua `indications` của chính thuốc); nếu không tìm thấy đường dùng nào khớp
  // (dữ liệu chưa gán) thì rơi về toàn bộ đường dùng của hoạt chất.
  const qualifyingEntries = useMemo(() => {
    if (!selectedGroup) return []
    if (selectedDisease) {
      const filtered = selectedGroup.entries.filter(
        (e) => selectedDisease.antibiotics.includes(e.id) || e.indications?.some((ind) => ind.diseaseId === selectedDisease.id),
      )
      return filtered.length > 0 ? filtered : selectedGroup.entries
    }
    return selectedGroup.entries
  }, [selectedGroup, selectedDisease])

  const readyForEntry = !hasDiseaseStep || effectiveDiseaseChoice !== null
  const autoEntry = readyForEntry && qualifyingEntries.length === 1 ? qualifyingEntries[0] : null
  const selectedEntry = autoEntry ?? (selectedEntryId ? qualifyingEntries.find((e) => e.id === selectedEntryId) ?? null : null)
  const showRouteStep = readyForEntry && qualifyingEntries.length > 1

  function selectGroup(name: string | null) {
    // Chỉ đếm lúc CHỌN (name khác null) — bấm lại để BỎ chọn không phải là "tra thêm một lần".
    if (name) recordAbxGroupUse(name)
    setSelectedGroupName(name)
    setDiseaseChoice(null)
    setSelectedEntryId(null)
  }

  // Bấm một chữ cái ở thanh nhảy nhanh: nếu chữ đó ĐÃ có đúng một hoạt chất trong tập rút gọn đang
  // hiện (browseGroups), chọn thẳng luôn — không ép mở "Xem tất cả" (một thay đổi trạng thái người
  // dùng không yêu cầu, /impeccable critique 2026-08-22 lần 2, P3: bấm "A" cho Amikacin dù đã hiện
  // sẵn ở chip đầu vẫn bị mở + cuộn cả 23 mục). Nhiều hơn một hoạt chất trùng chữ cái trong tập rút
  // gọn thì không biết chọn cái nào — vẫn phải mở rộng để người dùng tự nhìn thấy cả nhóm.
  function handleLetterJump(letter: string) {
    if (!showAllGroups) {
      const visibleMatches = browseGroups.filter((g) => g.name.charAt(0).toUpperCase() === letter)
      if (visibleMatches.length === 1) {
        selectGroup(visibleMatches[0].name)
        return
      }
    }
    const scrollToLetter = () => {
      const el = document.getElementById(`abx-letter-${letter}`)
      const container = scrollContainerRef.current
      if (!el || !container) return
      // scrollTo trên chính container đã biết, thay vì scrollIntoView để trình duyệt tự dò tổ tiên
      // cuộn — cùng kỹ thuật đã ổn định cho chuyển tab (App.tsx:11403). scrollIntoView đo được cuộn
      // 0px trong Chrome headless ở lần kiểm trước (/impeccable critique 2026-08-22 lần 2, P3) —
      // không rõ là lỗi thật hay chỉ do headless, nhưng tự tính toạ độ loại bỏ hẳn bước dò mập mờ đó.
      const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 8
      container.scrollTo({ top, behavior: "smooth" })
    }
    if (showAllGroups) {
      scrollToLetter()
    } else {
      // "Xem tất cả" phải render xong (đổi từ tập rút gọn sang danh sách alphabet đầy đủ) rồi
      // target abx-letter-* mới tồn tại trong DOM để scrollToLetter tìm thấy.
      setShowAllGroups(true)
      setTimeout(scrollToLetter, 60)
    }
  }

  function chooseDisease(id: string) {
    setDiseaseChoice(id)
    setSelectedEntryId(null)
  }

  function chooseEntry(id: string) {
    setSelectedEntryId(id)
  }

  // Giống bên thuốc truyền: cuộn thẳng tới thẻ liều thay vì bỏ nó dưới hai màn hình cuộn.
  const cardRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!selectedEntry) return
    collapsePatientPanel()
    const t = setTimeout(() => scrollElementIntoView(cardRef.current), 0)
    return () => clearTimeout(t)
  }, [selectedEntry?.id, selectedDisease?.id])

  return (
    <div className="px-5 pb-6">
      {onPatient.length > 0 && (
        <div className="mb-4">
          {/* Cố ý KHÔNG lặp chữ "Bệnh nhân đang dùng" của RunningPanel — đây là một danh sách khác về
              bản chất (lối tắt quay lại thẻ đã mở, chỉ trong nhóm/tab đang xem), không phải bản rút
              gọn của bảng bàn giao ca toàn cục. Chữ giống nhau từng đọc như hai bảng trùng lặp
              (persona Casey, /impeccable critique 2026-08-19). "Trong nhóm này" nói rõ phạm vi. */}
          <SectionLabel tone="accent">Trong nhóm này, đang dùng · {onPatient.length}</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {onPatient.map((d) => {
              const on = selectedEntry?.id === d.id
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setQuery("")
                    recordAbxGroupUse(d.name)
                    setSelectedGroupName(d.name)
                    setDiseaseChoice(DISEASE_SKIP)
                    setSelectedEntryId(d.id)
                  }}
                  className={`text-left px-3 py-2.5 ${R.box} border ${TAP}`}
                  style={on ? { background: C.accentSoft, borderColor: C.accent } : { background: C.surface, borderColor: C.line }}
                >
                  <p className={`${T.bodyStrong} truncate`} style={{ color: C.text }}>
                    {shortDrugName(d.name)}
                  </p>
                  <p className={`${T.meta} truncate`} style={{ color: C.textSoft }}>
                    {shortRoute(d.route)}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <SectionLabel>Chọn kháng sinh</SectionLabel>
      <SearchField
        value={query}
        onChange={(v) => {
          setQuery(v)
          setSelectedGroupName(null)
          setDiseaseChoice(null)
          setSelectedEntryId(null)
        }}
        placeholder="Tìm kháng sinh..."
      />
      {/* Thanh nhảy nhanh theo chữ cái — tận dụng đúng dữ liệu nhóm/chữ cái đã tính cho nhãn bên
          dưới, không tính lại. Hiện ngay cả khi còn ở tập rút gọn (isCollapsedBrowse, sắp theo tần
          suất): người biết sẵn tên hoạt chất (Alex) không còn phải bấm "Xem tất cả" trước mới có
          đường tắt. handleLetterJump (khai bên trên) tự quyết định chọn thẳng hay phải mở rộng +
          cuộn — xem comment tại đó. Vẫn ẩn khi đã chọn một hoạt chất hoặc đang gõ tìm — hai trường
          hợp đó tự thu hẹp danh sách theo cách khác rồi. */}
      {!selectedGroup && !query.trim() && alphabetLetters.length > 1 && (
        <div className="flex gap-0.5 overflow-x-auto scroll-ios mb-2" style={{ scrollbarWidth: "none" }} role="group" aria-label="Nhảy nhanh theo chữ cái">
          {alphabetLetters.map((letter) => (
            // Cùng kỹ thuật đệm vô hình với nút "Tìm"/"Nhật ký" ở ScreenHeader (10948-10982): pill
            // nhìn thấy vẫn 28px (đủ nhỏ để nhét ~20 chữ cái vào một hàng cuộn ngang), nhưng vùng
            // CHẠM của chính button là 44px — trước đây w-7 h-7 (28px) là cả vùng chạm, dưới ngưỡng
            // 44px chung của màn này (/impeccable critique 2026-08-18, phát hiện tái phạm 2026-08-18).
            // Chữ 11px cũng bị nâng lên 12px — lib/ui.ts:14-19 đã bỏ hẳn 11px khỏi nội dung lâm sàng.
            <button
              key={letter}
              type="button"
              onClick={() => handleLetterJump(letter)}
              className="flex-none flex items-center justify-center p-2"
              aria-label={`Nhảy tới chữ ${letter}`}
            >
              <span className="w-7 h-7 rounded-full text-[12px] font-bold flex items-center justify-center" style={{ background: C.lineSoft, color: C.textSoft }}>
                {letter}
              </span>
            </button>
          ))}
        </div>
      )}
      {/* Đã chọn một hoạt chất: gấp cả danh sách lại, chỉ còn ĐÚNG chip đang chọn — bước Chỉ định/
          Đường dùng/thẻ liều kéo lên ngay sát ô tìm thay vì phải cuộn qua hết ~28 chip mới tới. Bấm
          lại đúng chip đó (cùng onClick selectGroup toggle như cũ) để bỏ chọn, danh sách hiện lại. */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        {selectedGroup ? (
          <Chip active onClick={() => selectGroup(null)}>
            {selectedGroup.name}
            {selectedGroup.entries.length > 1 && <span className="opacity-60"> · {selectedGroup.entries.length}</span>}
          </Chip>
        ) : isCollapsedBrowse ? (
          /* Tập rút gọn (browseGroups, sắp theo sortGroupsByUsage) — KHÔNG chia nhãn chữ cái: thứ
             tự đây là tần suất, không phải alphabet, nên chia theo chữ cái sẽ đọc sai (đúng lý do
             nhãn chữ cái bị ẩn ở nhánh còn lại). Chip "Xem tất cả" luôn đứng CUỐI hàng, cùng cỡ với
             các chip khác để không phải học một hình dạng riêng cho "mở rộng". */
          <>
            {browseGroups.map((g, i) => (
              <Chip key={g.name} index={i} active={effectiveGroupName === g.name} onClick={() => selectGroup(effectiveGroupName === g.name ? null : g.name)}>
                {g.name}
                {g.entries.length > 1 && <span className="opacity-60"> · {g.entries.length}</span>}
              </Chip>
            ))}
            <button
              type="button"
              onClick={() => setShowAllGroups(true)}
              className={CHIP}
              style={{ background: C.surface, borderColor: C.line, color: C.textSoft }}
            >
              Xem tất cả · {filteredGroups.length}
            </button>
          </>
        ) : (
          /* index chỉ truyền khi CHƯA lọc (mới vào tab) — nếu không, mỗi lần gõ vào ô tìm là một lần
             các chip khớp mới chạy lại stagger, làm cả hàng nhấp nháy trong lúc gõ.
             Nhãn chữ cái: 22 kháng sinh xếp phẳng đọc như một khối tên thuốc liền mạch — chia theo
             chữ cái đầu (tên đã sắp alphabet ở `groups`) cho mắt có điểm dừng, giống danh bạ điện
             thoại. Chỉ hiện khi đang DUYỆT toàn bộ danh sách; ẩn lúc gõ tìm vì kết quả lọc không còn
             liên tục theo alphabet nên nhãn sẽ đọc sai. `basis-full` ép mỗi nhãn xuống dòng riêng
             trong hàng flex-wrap, không cần đổi sang layout dạng lưới/cột. */
          filteredGroups.flatMap((g, i) => {
            const letter = g.name.charAt(0).toUpperCase()
            const prevLetter = i > 0 ? filteredGroups[i - 1].name.charAt(0).toUpperCase() : null
            const nodes: React.ReactNode[] = []
            if (!query.trim() && letter !== prevLetter) {
              nodes.push(
                <span
                  key={`letter-${letter}`}
                  id={`abx-letter-${letter}`}
                  className="basis-full text-[12px] font-bold uppercase tracking-wide mt-1 first:mt-0"
                  style={{ color: "var(--c-text-muted)", scrollMarginTop: 8 }}
                >
                  {letter}
                </span>,
              )
            }
            nodes.push(
              <Chip key={g.name} index={query.trim() ? undefined : i} active={effectiveGroupName === g.name} onClick={() => selectGroup(effectiveGroupName === g.name ? null : g.name)}>
                {g.name}
                {g.entries.length > 1 && <span className="opacity-60"> · {g.entries.length}</span>}
              </Chip>,
            )
            return nodes
          })
        )}
        {/* "Xem tất cả" trước đây không có chiều ngược — bấm rồi thì danh sách ~29 chip cứ mở mãi,
            không cách nào thu gọn lại trong cùng phiên (/impeccable critique 2026-08-18, ghi chú
            nhỏ). Chỉ hiện khi đang duyệt trọn danh sách thật sự (không phải kết quả gõ tìm/đã chọn
            hoạt chất) và tập rút gọn còn có nghĩa (đủ dài hơn ngưỡng collapse). */}
        {showAllGroups && !selectedGroup && !query.trim() && filteredGroups.length > ABX_GROUP_COLLAPSE_COUNT && (
          <button type="button" onClick={() => setShowAllGroups(false)} className={CHIP} style={{ background: C.surface, borderColor: C.line, color: C.textSoft }}>
            Thu gọn
          </button>
        )}
      </div>

      {/* Chỉ định — chỉ hiện khi hoạt chất có liều riêng theo bệnh lý, và luôn TRƯỚC bước đường dùng.
          KHÔNG còn chip "Liều chung": liều mặc định của thuốc không đại diện cho một bệnh lý cụ thể
          nào, để chọn được coi như liều đúng cho MỌI bệnh lý là nguồn sai liều nguy hiểm nhất — bắt
          buộc chọn đúng bệnh lý trong danh sách bên dưới. */}
      {selectedGroup && hasDiseaseStep && !autoDisease && (
        // aria-live: bước này chỉ xuất hiện SAU khi chọn hoạt chất — không có nó, người dùng trình
        // đọc màn hình chọn xong thuốc không được báo có một bước bắt buộc mới hiện ra bên dưới
        // (khác ô CrCl, vốn đã tự báo khi đổi giá trị — /impeccable critique 2026-08-19, cờ đỏ Sam).
        <div key={selectedGroup.name} className="fade-in mb-3" aria-live="polite">
          <SectionLabel>Chỉ định</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {diseasesForGroup.map((ds) => (
              <Chip key={ds.id} active={diseaseChoice === ds.id} onClick={() => chooseDisease(ds.id)}>
                {ds.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Đường dùng — chỉ hiện khi còn nhiều hơn một lựa chọn phù hợp */}
      {selectedGroup && showRouteStep && (
        <div key={`${selectedGroup.name}-${effectiveDiseaseChoice ?? "none"}`} className="fade-in mb-3">
          <SectionLabel>Đường dùng</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {qualifyingEntries.map((entry) => (
              <Chip key={entry.id} tone="accent" active={selectedEntryId === entry.id} onClick={() => chooseEntry(entry.id)}>
                {shortRoute(entry.route)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div ref={cardRef} style={{ scrollMarginTop: 8 }}>
      {selectedGroup && selectedEntry ? (
        // `key` chỉ theo selectedEntry.id — KHÔNG kèm selectedDisease.id như trước. Kèm theo disease
        // khiến CẢ THẺ (và AntibioticMixPanel bên trong) bị GỠ RỒI DỰNG LẠI TỪ ĐẦU mỗi khi đổi "Chỉ
        // định" dù vẫn cùng một thuốc — mất sạch đường dùng (TTM/TMC) và công thức pha đang gõ dở chỉ
        // vì bấm sang một chip chỉ định khác để so sánh. Đổi thuốc (entry.id đổi) mới thật sự cần dựng
        // lại thẻ; đổi chỉ định trên CÙNG một thuốc thì thẻ phải giữ nguyên trạng thái đang có.
        <div key={selectedEntry.id} className="fade-in">
          <AntibioticDoseCard
            drug={selectedEntry}
            disease={selectedDisease}
            isOverride={Boolean(selectedEntry.isCustom) && STATIC_ANTIBIOTIC_IDS.has(selectedEntry.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ) : (
        <p className={`${T.body} text-center px-4 py-6 ${R.card}`} style={{ background: C.surfaceAlt, color: C.textSoft }}>
          {filteredGroups.length === 0
            ? "Không tìm thấy kháng sinh phù hợp."
            : !selectedGroup
              ? "Chọn một kháng sinh ở trên để xem liều theo CrCl."
              : hasDiseaseStep && effectiveDiseaseChoice === null
                ? "Chọn chỉ định ở trên để tiếp tục."
                : "Chọn đường dùng ở trên để xem liều."}
        </p>
      )}
      </div>

      <button
        onClick={onAddNew}
        className={`w-full flex items-center justify-center gap-2 h-11 ${R.box} border border-dashed mt-3 ${T.bodyStrong}`}
        style={{ borderColor: C.primaryLine, color: "var(--c-primary-deep)" }}
      >
        <span className="scale-90">{icons.plus()}</span>
        Thêm kháng sinh tự nhập
      </button>
    </div>
  )
}
