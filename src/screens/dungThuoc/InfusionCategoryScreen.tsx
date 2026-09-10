import { useState, useRef, useEffect, useMemo } from "react"
import type { DiseaseEntry, InfusionDrug } from "../../data/types"
import { useStickyState } from "../../lib/uiState"
import { icons } from "../../components/icons"
import { C, CHIP, NUM, R, T, TAP, normalizeSearch, scrollElementIntoView, shortDrugName } from "../../lib/ui"
import { useDosing } from "./context"
import { mergeWithOverrides } from "./antibioticMixingHelpers"
import { SectionLabel, SearchField, Chip } from "./sharedUi"
import { InfusionDrugCard, INFUSION_DRUG_COLLAPSE_COUNT } from "./InfusionCalculator"
import { DISEASE_SKIP } from "./AntibioticsScreen"

export function InfusionCategoryScreen({
  staticDrugs,
  customDrugs,
  diseases,
  categoryLabel,
  onAddNew,
  onEdit,
  onDelete,
}: {
  staticDrugs: InfusionDrug[]
  customDrugs: InfusionDrug[]
  diseases: DiseaseEntry[]
  categoryLabel: string
  onAddNew: () => void
  onEdit: (drug: InfusionDrug) => void
  onDelete: (id: string) => void
}) {
  const { running, collapsePatientPanel } = useDosing()
  // KHÔNG sticky, giống showAllGroups ở AntibioticsScreen: mỗi lần ghé lại một nhóm thuốc truyền thì
  // bắt đầu từ tập rút gọn — component này bị unmount/remount mỗi lần đổi tab (key={`${tab}-${jumpKey}`}
  // ở nơi gọi) nên state tự về false, không cần reset thủ công theo categoryLabel.
  const [showAll, setShowAll] = useState(false)
  const allDrugs = useMemo(() => mergeWithOverrides(staticDrugs, customDrugs), [staticDrugs, customDrugs])
  const staticIds = useMemo(() => new Set(staticDrugs.map((d) => d.id)), [staticDrugs])
  // Khoá theo từng nhóm thuốc để tab "Vận mạch" và tab "Co bóp" nhớ riêng thuốc đang mở.
  const [query, setQuery] = useStickyState(`infusion.query.${categoryLabel}`, "")
  const [selectedId, setSelectedId] = useStickyState<string | null>(`infusion.sel.${categoryLabel}`, null)
  // Chỉ định — giống hệt bước "Chỉ định" ở AntibioticsScreen: chỉ hiện khi thuốc đang chọn CÓ khai
  // báo `indications` (vd Adrenaline: ngừng tim / phản vệ / sốc nhiễm khuẩn dùng liều khác hẳn nhau).
  const [diseaseChoice, setDiseaseChoice] = useStickyState<string | null>(`infusion.disease.${categoryLabel}`, null)

  const activeIds = useMemo(() => new Set(running.map((r) => r.drugId)), [running])
  const onPatient = useMemo(() => allDrugs.filter((d) => activeIds.has(d.id)), [allDrugs, activeIds])

  const filtered = useMemo(() => {
    const q = normalizeSearch(query)
    return q ? allDrugs.filter((d) => normalizeSearch(d.name).includes(q)) : allDrugs
  }, [allDrugs, query])

  // Tập chip hiển thị khi ĐANG DUYỆT (chưa gõ tìm) và CHƯA bấm "Xem tất cả": rút xuống
  // INFUSION_DRUG_COLLAPSE_COUNT chip đầu tiên. Có query hoặc đã bấm "Xem tất cả" thì luôn hiện đủ
  // filtered — tìm kiếm không bao giờ được phép giấu bớt kết quả (giống hệt AntibioticsScreen).
  const browseDrugs = useMemo(() => {
    if (query.trim() || showAll) return filtered
    return filtered.slice(0, INFUSION_DRUG_COLLAPSE_COUNT)
  }, [filtered, query, showAll])
  const isCollapsedBrowse = !query.trim() && !showAll && filtered.length > INFUSION_DRUG_COLLAPSE_COUNT

  // Gõ tới khi chỉ còn một kết quả thì mở luôn — bớt được một lần chạm.
  const effectiveId = selectedId ?? (query.trim() && filtered.length === 1 ? filtered[0].id : null)
  const selected = effectiveId ? allDrugs.find((d) => d.id === effectiveId) ?? null : null

  const diseasesForDrug = useMemo(() => {
    if (!selected?.indications?.length) return []
    const ids = new Set(selected.indications.map((i) => i.diseaseId))
    return diseases.filter((d) => ids.has(d.id))
  }, [selected, diseases])
  const hasDiseaseStep = diseasesForDrug.length > 0
  // Chỉ 1 chỉ định khớp = không có quyết định thật nào để bắt chọn, cùng lý do đã áp dụng cho
  // bước "Chỉ định" ở AntibioticsScreen — xác nhận với chủ dự án (/impeccable critique 2026-08-19).
  const autoDisease = hasDiseaseStep && diseasesForDrug.length === 1 ? diseasesForDrug[0] : null
  const effectiveDiseaseChoice = autoDisease ? autoDisease.id : diseaseChoice
  const selectedDisease =
    hasDiseaseStep && effectiveDiseaseChoice && effectiveDiseaseChoice !== DISEASE_SKIP ? diseases.find((d) => d.id === effectiveDiseaseChoice) ?? null : null

  function selectDrug(id: string | null) {
    setSelectedId(id)
    setDiseaseChoice(null)
  }

  // Chọn xong thuốc mà thẻ kết quả nằm dưới hai màn hình cuộn thì thao tác chưa xong. Gấp khung
  // bệnh nhân rồi cuộn thẳng tới thẻ — đây là lý do duy nhất người dùng bấm vào chip thuốc.
  const cardRef = useRef<HTMLDivElement | null>(null)
  const readyForCard = !hasDiseaseStep || effectiveDiseaseChoice !== null
  useEffect(() => {
    if (!effectiveId || !readyForCard) return
    collapsePatientPanel()
    // Hoãn một nhịp để khung bệnh nhân gấp xong, nếu không vị trí cuộn tính theo chiều cao cũ.
    // Dùng setTimeout chứ KHÔNG dùng requestAnimationFrame: rAF không chạy khi trang đang bị ẩn
    // (chuyển sang app khác rồi quay lại), lúc đó cú cuộn im lặng không bao giờ xảy ra.
    const t = setTimeout(() => scrollElementIntoView(cardRef.current), 0)
    return () => clearTimeout(t)
  }, [effectiveId, readyForCard])

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
              const r = running.find((x) => x.drugId === d.id)
              const on = effectiveId === d.id
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    selectDrug(on ? null : d.id)
                    setQuery("")
                  }}
                  className={`text-left px-3 py-2.5 ${R.box} border ${TAP}`}
                  style={on ? { background: C.accentSoft, borderColor: C.accent } : { background: C.surface, borderColor: C.line }}
                >
                  <p className={`${T.bodyStrong} truncate`} style={{ color: C.text }}>
                    {shortDrugName(d.name)}
                  </p>
                  <p className={`${T.meta} ${NUM} truncate`} style={{ color: C.textSoft }}>
                    {r?.rateText || r?.doseText || "—"}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <SectionLabel>Chọn thuốc</SectionLabel>
      <SearchField
        value={query}
        onChange={(v) => {
          setQuery(v)
          selectDrug(null)
        }}
        placeholder={`Tìm ${categoryLabel.toLowerCase()}...`}
      />
      <div className="flex flex-wrap gap-2 mb-3">
        {/* index chỉ truyền khi CHƯA lọc — xem ghi chú tương tự ở AntibioticsScreen. */}
        {browseDrugs.map((d, i) => (
          <Chip key={d.id} index={query.trim() ? undefined : i} tone="accent" active={effectiveId === d.id} onClick={() => selectDrug(effectiveId === d.id ? null : d.id)}>
            {shortDrugName(d.name)}
          </Chip>
        ))}
        {isCollapsedBrowse && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={CHIP}
            style={{ background: C.surface, borderColor: C.line, color: C.textSoft }}
          >
            Xem tất cả · {filtered.length}
          </button>
        )}
        {/* Chiều ngược của "Xem tất cả" — cùng lý do đã thêm ở AntibioticsScreen (/impeccable
            critique 2026-08-18, ghi chú nhỏ): trước đây bấm "Xem tất cả" rồi thì không có đường
            quay lại tập rút gọn trong cùng phiên. */}
        {showAll && !query.trim() && filtered.length > INFUSION_DRUG_COLLAPSE_COUNT && (
          <button type="button" onClick={() => setShowAll(false)} className={CHIP} style={{ background: C.surface, borderColor: C.line, color: C.textSoft }}>
            Thu gọn
          </button>
        )}
      </div>

      {/* Chỉ định — chỉ hiện khi thuốc đang chọn có khai báo liều riêng theo bệnh lý, giống hệt bước
          "Chỉ định" ở AntibioticsScreen. KHÔNG còn chip "Liều chung" — cùng lý do: liều mặc định
          không đại diện cho một bệnh lý cụ thể, bắt buộc chọn đúng bệnh lý. */}
      {selected && hasDiseaseStep && !autoDisease && (
        // aria-live: cùng lý do đã sửa ở AntibioticsScreen — bước này chỉ hiện SAU khi chọn thuốc,
        // trình đọc màn hình cần được báo (/impeccable critique 2026-08-19, cờ đỏ Sam).
        <div key={selected.id} className="fade-in mb-3" aria-live="polite">
          <SectionLabel>Chỉ định</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {diseasesForDrug.map((ds) => (
              <Chip key={ds.id} active={diseaseChoice === ds.id} onClick={() => setDiseaseChoice(ds.id)}>
                {ds.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div ref={cardRef} style={{ scrollMarginTop: 8 }}>
        {selected && readyForCard ? (
          <div key={`${selected.id}-${selectedDisease?.id ?? "none"}`} className="fade-in">
            <InfusionDrugCard drug={selected} disease={selectedDisease} isOverride={Boolean(selected.isCustom) && staticIds.has(selected.id)} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ) : (
          <p className={`${T.body} text-center px-4 py-6 ${R.card}`} style={{ background: C.surfaceAlt, color: C.textSoft }}>
            {filtered.length === 0
              ? "Không tìm thấy thuốc phù hợp."
              : !selected
                ? "Chọn một thuốc ở trên để mở máy tính pha và liều."
                : "Chọn chỉ định ở trên để tiếp tục."}
          </p>
        )}
      </div>

      <button
        onClick={onAddNew}
        className={`w-full flex items-center justify-center gap-2 h-11 ${R.box} border border-dashed mt-3 ${T.bodyStrong}`}
        style={{ borderColor: C.accentLine, color: "var(--c-primary-deep)" }}
      >
        <span className="scale-90">{icons.plus()}</span>
        Thêm thuốc tự nhập
      </button>
    </div>
  )
}

// ─── Nút chọn chủ đề sáng/tối ─────────────────────────────────────────────────
// Xoay vòng Tự động → Sáng → Tối. Nhãn hiện thẳng trên nút thay vì chỉ một icon mặt trời/mặt trăng:
// với ba trạng thái thì icon đơn không nói được đang ở trạng thái nào (icon mặt trăng nghĩa là
// "đang tối" hay "chạm để chuyển sang tối"?).
// Nút tròn 36px, CHỈ hình mặt trời/mặt trăng — bằng đúng chiều cao nút chọn chuyên khoa đứng cạnh
// nên hai cái nằm khít một hàng ngang. Bản chữ trước đây ("TỰ ĐỘNG"/"SÁNG"/"TỐI") rộng tới 81px,
// vừa chiếm chỗ vừa buộc phải đọc mới hiểu.
//
// CHỈ CÒN MỘT NƠI GỌI: Trang chủ (chủ dự án quyết 2026-09-04). Từng có thêm một bản `variant="inline"`
// trong ScreenHeader của DungThuocScreen — gỡ cùng lượt này, nên prop `variant` lẫn `preserveScreen`
// (chỉ tồn tại để giữ lại màn "mixing" qua cú tải lại của saveTheme) không còn đối tượng và đã gỡ
// theo. Muốn dựng lại một nút chủ đề ngoài Trang chủ thì đọc `duongDanTaiLaiChuDe` trong
// lib/theme.ts trước: cú tải lại trong PWA standalone là thứ bắt buộc phải xử lý lại.
