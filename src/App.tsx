import { createContext, useContext, useState, useRef, useEffect, useMemo, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, type ChangeEvent, type ReactElement } from "react"
import type { Article, BolusDose, ContentBlock, DoseTier, Antibiotic, AntibioticWarning, DiseaseEntry, IndicationDose, InfusionCalcConfig, InfusionDrug, InfusionIndicationDose, EcgLesson, FlashCard, MindNode, MindEdge, MindImage, MindStroke, MindmapData, MindBoard, SourceInfo } from "./data/types"
import { SPECIALTIES, PICKER_ITEMS, ARTICLES, ARTICLE_CONTENT, FLASHCARDS, ANTIBIOTICS, DISEASES, INOTROPES, VASOACTIVES, VASODILATORS, ANTIARRHYTHMICS, ELECTROLYTES, ECG_LESSONS } from "./data"
import { COMPAT_DISCLAIMER, findInteractionRule, findYsiteRule, type CompatRule, type InteractionRule } from "./data/compatibility"
import { useLocalCollection } from "./lib/useLocalCollection"
import { useIdbCollection } from "./lib/useIdbCollection"
import { IDB_STORES } from "./lib/idb"
import { CUSTOM_COLLECTION_KEYS } from "./lib/storage"
import { resolveDosingWeight, type WeightBasis } from "./lib/bodyWeight"
import {
  CRCL_RELIABILITY_TEXT,
  RRT_LABELS,
  RRT_SHORT,
  SCR_UMOL_PER_MGDL,
  crclReliability,
  estimateCrCl,
  needsCrrtFlow,
  patientHasData,
  scrToMgDl,
  usePatientVitals,
  type PatientVitals,
  type RrtMode,
} from "./lib/patient"
import { SEVERITY_STYLE, checkAge, checkHeight, checkInfusionDose, checkWeight, type DoseCheck, type WeightCheck } from "./lib/doseSafety"
import {
  CONC_OK,
  DEFAULT_DROP_FACTOR,
  DEFAULT_PUMP_STEP,
  MICRO_DROP_FACTOR,
  concentrationFromVials,
  diluentVolume,
  drawFromFixedVial,
  dropsPerMinute,
  formatDuration,
  gradeConcentration,
  infusionDurationHours,
  partialDraw,
  pickEasiestVolume,
  roundToStep,
  totalAmountInBag,
  vialsForConcentration,
  vialsTotalVolume,
  volumeForConcentration,
  volumePerVial,
  type VialForm,
  type VialSpec,
} from "./lib/mixing"
import { formatAmpouleUsage, formatFixedUsage, formatVialUsage } from "./lib/usageText"
import { formatSavedAt, importWardRecipes, loadWardRecipes, removeWardRecipe, clearWardRecipesForDrug, saveWardRecipe, type WardRecipe } from "./lib/wardRecipes"
import { useStickyState } from "./lib/uiState"
import { computePerKgText, findFixedDose, findPerKgDoses, formatMass } from "./lib/perKgDose"
import { CALC_KIND_LABELS, appendCalcLog, calcLogToText, clearCalcLog, formatLogTime, loadCalcLog, removeCalcLogEntries, type CalcLogEntry } from "./lib/calcLog"
import { MAX_LINES, STALE_AFTER_MS, formatAgo, formatClock, lineLabel, loadRunning, saveRunning, upsertRunning, type RunningDrug } from "./lib/runningDrugs"
import { SW_UPDATE_EVENT, applyUpdate } from "./lib/offline"
import { THEME_LABELS, loadTheme, saveTheme, type ThemeMode } from "./lib/theme"
import { useMindmap } from "./lib/useMindmap"
import { useBoards, DEFAULT_BOARD_COLOR } from "./lib/boards"
import { loadMindmap, saveMindmap, mergeMindmaps } from "./lib/mindmapStorage"
import { markBackupDone, shouldRemindBackup, snoozeBackupReminder } from "./lib/backupReminder"
import { countArticlesFor, countFlashcardsFor } from "./lib/specialtyStats"
import { tickHaptic } from "./lib/haptics"
import { forgetRead, formatReadTime, loadRecentReads, recordRead, type ReadEntry } from "./lib/recentReads"
import { COMMON_DOSE_UNITS, doseToRate, doseUnitOptions, formatDoseNumber, massFactor, massOfConcUnit, parseDoseUnit, rateToDose } from "./lib/infusion"
import { BlockEditor, type LinkTarget } from "./components/BlockEditor"
import { BlockContent } from "./components/BlockContent"
import { MindmapBoard } from "./components/MindmapBoard"
import { specialtyIcon } from "./components/SpecialtyIcons"
import { articleBlocks, blocksForEditing, blocksToPlainText, blocksToToc, cleanBlocks, countImages, ecgBlocks, firstImageUrl } from "./lib/blocks"
import { BTN_BLOCK, BTN_SM, BTN_TALL, C, CHIP, FIELD, FIELD_STYLE, NUM, R, T, TAP, normalizeSearch, scrollElementIntoView, shortDrugName, shortRoute, trim } from "./lib/ui"

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "home"
  | "library"
  | "search"
  | "mindmap"
  | "flashcard"
  | "article"
  | "specialty"
  | "addEntry"
  | "mixing"
  | "customEntry"
  | "addAntibiotic"
  | "addInotrope"
  | "addVasoactive"
  | "addVasodilator"
  | "addArrhythmia"
  | "addElectrolyte"
  | "editAntibiotic"
  | "editInfusion"
  | "dataSync"
  | "ecg"
  | "ecgDetail"
  | "addEcg"
  | "addFlashcard"
  | "comingSoon"

// Các mục con bên trong tab "Dùng thuốc": kháng sinh, thuốc co bóp cơ tim (inotrope), thuốc vận mạch (vasoactive).
type MixingTab = "antibiotics" | "inotrope" | "vasoactive" | "vasodilator" | "arrhythmia" | "electrolyte"

// ─── Data ────────────────────────────────────────────────────────────────────
// Toàn bộ data tham khảo (bài viết, thẻ ghi nhớ, kháng sinh, bệnh lý, thuốc truyền tĩnh mạch...)
// đã được tách sang thư mục src/data/*.ts — import ở đầu file. Xem src/data/index.ts.

// ─── Icons ────────────────────────────────────────────────────────────────────

const icons = {
  trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0l1 12a1 1 0 001 1h6a1 1 0 001-1l1-12" />
    </svg>
  ),
  download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" />
    </svg>
  ),
  upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15V4m0 0l-4 4m4-4l4 4M5 19h14" />
    </svg>
  ),
  // Trang chủ và Thư viện: khi đang ở tab đó thì icon được TÔ ĐẦY, giống Dùng thuốc / Mindmap /
  // FlashCard. Hình nhà vẽ theo đúng form mẫu (mái nhọn liền tường, cửa là khe lõm cắt từ đáy
  // lên) — gộp mái + thân + cửa thành MỘT path khép kín duy nhất thay vì 3 path rời như trước.
  // Vì khe cửa là một notch lõm ngay trong đường viền (không phải lỗ khoét kín), nó tự động để lộ
  // nền phía sau khi path được tô đầy — không cần mẹo đổi stroke cửa trùng màu var(--c-nav-active-bg)
  // như bản cũ, nên hình không còn bị vỡ khi nền pill đổi theo theme sáng/tối.
  home: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-6 h-6">
      <path
        d="M12 3.4L20.6 10.6V20.3H14.6V14.5H9.4V20.3H3.4V10.6Z"
        fill={active ? "currentColor" : "none"}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "fill 0.18s ease" }}
      />
    </svg>
  ),
  library: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-6 h-6">
      <path
        d="M11.2 6.9C10.1 6.1 8.6 5.6 7 5.6c-1.5 0-2.9.4-3.9 1v11.6c1-.6 2.4-1 3.9-1 1.6 0 3.1.5 4.2 1.3"
        fill={active ? "currentColor" : "none"}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "fill 0.18s ease" }}
      />
      <path
        d="M12.8 6.9c1.1-.8 2.6-1.3 4.2-1.3 1.5 0 2.9.4 3.9 1v11.6c-1-.6-2.4-1-3.9-1-1.6 0-3.1.5-4.2 1.3"
        fill={active ? "currentColor" : "none"}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "fill 0.18s ease" }}
      />
      <path strokeLinecap="round" d="M12 7.4v11.2" stroke={active ? "var(--c-nav-active-bg)" : "currentColor"} />
    </svg>
  ),
  search: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  profile: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  back: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  ),
  share: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  x: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  filter: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  fire: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-orange-500">
      <path d="M12 2C9.5 6 7 8 7 12a5 5 0 0010 0c0-4-2.5-6-5-10z" />
    </svg>
  ),
  star: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-amber-400">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  // Viên thuốc: một viên nang nằm chéo, có vạch chia giữa hai nửa (vạch đổi sang trắng khi viên đã
  // được tô đầy ở tab đang chọn).
  pill: (active: boolean = false) => (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <g transform="rotate(-45 12 12)">
        <rect
          x="2.8"
          y="8.5"
          width="18.4"
          height="7"
          rx="3.5"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.7}
          style={{ transition: "fill 0.18s ease" }}
        />
        <path strokeLinecap="round" d="M12 8.5v7" stroke={active ? "var(--c-nav-active-bg)" : "currentColor"} strokeWidth={1.7} />
      </g>
    </svg>
  ),
  // Phác đồ: sơ đồ rẽ nhánh thật — một ô ở trên, đường dẫn xuống rồi tách sang hai ô dưới. Hình cũ
  // là ô + hình thoi + ô lệch sang một bên, ở cỡ 20px trông như ba khối rời không liên quan.
  flow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="8.4" y="2.8" width="7.2" height="4.6" rx="1.4" />
      <path d="M12 7.4v2.2" />
      <path d="M5.4 12.6v-1.7a1.3 1.3 0 011.3-1.3h10.6a1.3 1.3 0 011.3 1.3v1.7" />
      <rect x="2.2" y="12.6" width="6.4" height="4.6" rx="1.4" />
      <rect x="15.4" y="12.6" width="6.4" height="4.6" rx="1.4" />
    </svg>
  ),
  plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  ),
  clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 2" />
    </svg>
  ),
  // Trang giấy có góc gấp — dùng cho các dòng "Đã đọc gần đây".
  doc: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M6.6 3.4h6.9l4.9 4.9v11.5a1.8 1.8 0 01-1.8 1.8H6.6a1.8 1.8 0 01-1.8-1.8V5.2a1.8 1.8 0 011.8-1.8z" />
      <path d="M13.2 3.5v3.4a1.5 1.5 0 001.5 1.5h3.4" />
      <path d="M8.2 13h7.6M8.2 16.6h5" opacity={0.6} />
    </svg>
  ),
  chevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  ),
  // Máy tính: có màn hình hiện số và 3×3 phím, thay vì một ô trống với vài dấu chấm.
  calculator: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="4.6" y="2.6" width="14.8" height="18.8" rx="2.6" />
      <rect x="7.4" y="5.4" width="9.2" height="3.4" rx="1.1" />
      <path d="M8.6 12.4h.01M12 12.4h.01M15.4 12.4h.01M8.6 15.4h.01M12 15.4h.01M15.4 15.4h.01M8.6 18.4h.01M12 18.4h.01M15.4 18.4h.01" strokeWidth={2.1} />
    </svg>
  ),
  // Cập nhật guideline: trang tài liệu kèm một tia lấp lánh ở góc = "bản mới". Hình cũ là một đường
  // biểu đồ đi lên — đó là hình của "số liệu/xu hướng", không phải của "guideline vừa cập nhật".
  guideline: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17.8 10.4V8.2l-4.6-4.6H6.9A1.7 1.7 0 005.2 5.3v13.4a1.7 1.7 0 001.7 1.7h5.2" />
      <path d="M12.9 3.7v3.3a1.5 1.5 0 001.5 1.5h3.3" />
      <path d="M8.4 12.2h4.4M8.4 15.6h3" opacity={0.6} />
      <path
        d="M17.9 12.4l1.05 2.45 2.45 1.05-2.45 1.05L17.9 19.4l-1.05-2.45-2.45-1.05 2.45-1.05L17.9 12.4z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  ),
  // "Sắp ra mắt": bánh răng (đang lắp ráp) + tia lấp lánh ở góc — cùng chi tiết "tia lấp lánh = bản
  // mới" đã dùng ở icon guideline, chỉ khác chỗ đặt cạnh bánh răng thay vì trang giấy, để đọc thành
  // "đang làm, sắp có" thay vì "vừa có". Vẽ to hơn hẳn icon thường (dùng cho màn trống, không phải
  // cho thẻ 36px) nên nét phải dày hơn tương ứng, không thì mờ đi ở cỡ lớn.
  comingSoon: () => (
    <svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16">
      <path d="M48 28.5v-7M48 74.5v-7M67.5 48h7M21.5 48h7M61.8 34.2l4.9-4.9M29.3 66.7l4.9-4.9M61.8 61.8l4.9 4.9M29.3 29.3l4.9 4.9" />
      <circle cx="48" cy="48" r="14.5" />
      <path
        d="M78 20l2.6 6.1 6.1 2.6-6.1 2.6L78 37.4l-2.6-6.1-6.1-2.6 6.1-2.6L78 20z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  ),
  // Tiếp cận nhanh: bảng kẹp có dấu tích ở dòng đầu — "các bước cần làm, theo thứ tự". Hình cũ là
  // một cái ống tiêm nghiêng 45° (vẽ bằng hình chữ nhật + mấy vạch), không liên quan tới nội dung
  // và ở cỡ nhỏ trông chỉ như mấy nét gạch chéo.
  summary: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M9.2 4.4H6.8A1.8 1.8 0 005 6.2v12.6a1.8 1.8 0 001.8 1.8h10.4a1.8 1.8 0 001.8-1.8V6.2a1.8 1.8 0 00-1.8-1.8h-2.4" />
      <rect x="9.2" y="2.6" width="5.6" height="3.6" rx="1.2" />
      <path d="M8.4 11.4l1.5 1.5 2.8-3" />
      <path d="M14.4 14.8h1.4M8.2 14.8h3.8M8.2 17.6h5" opacity={0.6} />
    </svg>
  ),
  mindmap: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
      <circle cx="5" cy="12" r="2.3" fill={active ? "currentColor" : "none"} strokeWidth={1.7} style={{ transition: "fill 0.18s ease" }} />
      <circle cx="18" cy="6" r="2.3" fill={active ? "currentColor" : "none"} strokeWidth={1.7} style={{ transition: "fill 0.18s ease" }} />
      <circle cx="18" cy="18" r="2.3" fill={active ? "currentColor" : "none"} strokeWidth={1.7} style={{ transition: "fill 0.18s ease" }} />
      <path strokeLinecap="round" strokeWidth={active ? 2 : 1.7} d="M7.2 11l8.6-3.8M7.2 13l8.6 3.8" />
    </svg>
  ),
  minus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5">
      <path strokeLinecap="round" d="M5 12h14" />
    </svg>
  ),
  link: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l6-6m-5-2l1.5-1.5a3.54 3.54 0 015 5L15 12M9 12l-1.5 1.5a3.54 3.54 0 105 5L14 17" />
    </svg>
  ),
  cards: (active: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-6 h-6">
      <rect
        x="3.5"
        y="7"
        width="14"
        height="12"
        rx="2"
        transform="rotate(-6 10.5 13)"
        fill={active ? "currentColor" : "none"}
        opacity={active ? 0.45 : 1}
        style={{ transition: "fill 0.18s ease" }}
      />
      <rect x="6.5" y="5" width="14" height="12" rx="2" fill={active ? "currentColor" : "none"} style={{ transition: "fill 0.18s ease" }} />
    </svg>
  ),
  alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a1.5 1.5 0 001.29 2.25h17.78a1.5 1.5 0 001.29-2.25L13.71 3.86a1.5 1.5 0 00-3.42 0z" />
    </svg>
  ),
  // ECG: khung màn hình theo dõi + một nhịp đủ P-QRS-T. Hình cũ là một nét răng cưa chạy hết bề
  // ngang, không có khung nên trông như nét vẽ bị lỗi hơn là bản ghi điện tim.
  ecg: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2.4" y="4.6" width="19.2" height="14.8" rx="2.6" />
      <path d="M5.2 12.4h1.7l1-2.2 1.7 5.2 1.5-6.6 1.4 3.6h1.5" strokeWidth={1.7} />
      <path d="M16.4 12.4h2.4" opacity={0.5} />
    </svg>
  ),
  edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L7.5 18.15l-4.5 1.35 1.35-4.5L16.862 4.487z"
      />
    </svg>
  ),
  undo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L4 10m0 0l5-5M4 10h11a5 5 0 010 10h-1" />
    </svg>
  ),
  // Mặt trời / mặt trăng cho nút đổi chủ đề. Chỉ hình, không chữ — ba trạng thái (Tự động/Sáng/Tối)
  // vẫn phân biệt được vì trạng thái "Tự động" vẽ CẢ HAI nửa (nửa mặt trời, nửa mặt trăng).
  sun: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" className="w-[18px] h-[18px]">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.1M12 19.3v2.1M21.4 12h-2.1M4.7 12H2.6M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5M18.6 18.6l-1.5-1.5M6.9 6.9L5.4 5.4" />
    </svg>
  ),
  moon: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
      <path d="M20.1 14.6A8.4 8.4 0 019.4 3.9a0.9 0.9 0 00-1.2-1.1A9.9 9.9 0 1021.2 15.8a0.9 0.9 0 00-1.1-1.2z" />
    </svg>
  ),
  // "Tự động": mặt trời bên trái, mặt trăng bên phải, gộp trong một ô 24×24 — nói đúng nghĩa
  // "để máy tự quyết", thay vì bắt người dùng đoán qua một icon đơn.
  sunMoon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" className="w-[18px] h-[18px]">
      <circle cx="8" cy="12" r="3" />
      <path d="M8 6.4v1.3M8 16.3v1.3M2.6 12h1.3M13.4 8.2l-.9.9M3.6 16.4l-.9.9M13.4 15.8l-.9-.9M3.6 7.6l-.9-.9" />
      <path fill="currentColor" stroke="none" d="M21.3 14.1a5.6 5.6 0 01-7.1-7.1.6.6 0 00-.8-.75 6.6 6.6 0 108.65 8.65.6.6 0 00-.75-.8z" />
    </svg>
  ),
  // Logo app: cuốn sổ tay có gáy lò xo, mặt sổ mang chữ T của "Trọng". Vẽ bằng currentColor và
  // KHÔNG có nền riêng — thay cho file PNG cũ vốn là một ô vuông nền trắng, dán lên nền tối thì
  // nổi lên như một miếng vá.
  notebookT: (className = "w-9 h-9") => (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {/* Bìa sổ */}
      <rect x="8.5" y="3.5" width="20" height="25" rx="3.2" stroke="currentColor" strokeWidth={2} />
      {/* Gáy lò xo: ba vòng xoắn vắt qua mép trái */}
      <path
        d="M8.5 8.5H4.2M8.5 16H4.2M8.5 23.5H4.2"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Chữ T trên mặt sổ */}
      <path
        d="M13.4 11.2h10.2M18.5 11.2v10.4"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </svg>
  ),
}

// Trên iPhone để ngôn ngữ Việt, bàn phím dạng inputMode="decimal" chỉ hiện dấu PHẨY (,) chứ
// không có dấu chấm — đây là hành vi hệ điều hành, web không ép hiện dấu chấm được. Vì mọi phép
// tính trong app đều dùng parseFloat() (yêu cầu dấu chấm), nên tự động đổi dấu phẩy người dùng gõ
// thành dấu chấm ngay khi nhập, để họ gõ được số thập phân bình thường mà không cần đổi bàn phím.
function normalizeDecimalInput(value: string): string {
  return value.replace(/,/g, ".")
}

// Chuyển tên bệnh lý tiếng Việt (có dấu) thành chuỗi ASCII gọn để làm phần id — dùng khi
// EditAntibioticScreen tự tạo một DiseaseEntry mới cho bệnh lý người dùng gõ vào mà chưa có
// trong danh mục. `đ`/`Đ` không tách dấu qua NFD nên phải thay riêng trước khi bỏ dấu.
function slugifyDiseaseName(name: string): string {
  return name
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// ─── Components ───────────────────────────────────────────────────────────────

function DifficultyBadge({ level }: { level: "Cơ bản" | "Nâng cao" }) {
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{
        background: level === "Nâng cao" ? "var(--c-primary-soft)" : "var(--c-green-soft)",
        color: level === "Nâng cao" ? "var(--c-primary-strong)" : "var(--c-green-deep)",
      }}
    >
      {level === "Nâng cao" ? "Nâng cao" : "Cơ bản"}
    </span>
  )
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
      {tag}
    </span>
  )
}

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

function SpecialtyPicker({ onSelect, currentId }: { onSelect: (id: string, isFinal: boolean) => void; currentId: string }) {
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
        <span className="text-xs font-bold max-w-[76px] truncate" style={{ color: "var(--c-text)" }}>{current.name}</span>
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

// ─── Tiêu đề màn hình dùng chung ──────────────────────────────────────────────
//
// Trước đây mỗi màn (Thư viện / Mindmap / Dùng thuốc / Ôn tập) tự viết tiêu đề riêng: cỡ chữ lúc
// 24px lúc 20px, khoảng đệm trên mỗi nơi một số (pt-1 / pt-2), và hàng nào có nút phụ đứng cạnh thì
// `items-center` kéo chữ lệch xuống theo chiều cao nút đó — đo được chênh nhau tới 9px giữa các
// màn. Thư viện còn nặng hơn: tiêu đề nằm CHUNG một vùng cuộn với danh sách bên dưới, nên cuộn vài
// trăm pixel là tiêu đề biến mất hẳn, còn ba màn kia thì tiêu đề đứng yên phía trên khi cuộn — cùng
// là "tiêu đề màn hình" mà bốn cách cư xử khác nhau.
//
// `ScreenHeader` chốt lại MỘT cách duy nhất: đệm cố định, cỡ chữ cố định, hàng tiêu đề có chiều cao
// tối thiểu bằng đúng chiều cao nút phụ (kể cả khi không có nút phụ) nên chữ không bao giờ nhảy vị
// trí, và bản thân nó luôn là `flex-none` — nơi gọi chỉ cần đặt nó ngoài vùng `scroll-ios` là tiêu
// đề tự động đứng yên khi cuộn.
function ScreenHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="flex-none px-5 pt-3 pb-3">
      {/* min-h-9 (36px) = đúng chiều cao mọi nút phụ (h-9) trong các màn này — có nút hay không thì
          hàng vẫn cao như nhau, nên `items-center` không kéo chữ lệch theo chiều cao nút. */}
      <div className="min-h-9 flex items-center justify-between gap-3">
        <h1 className="text-[20px] font-bold leading-[1.3] truncate" style={{ color: C.text }}>
          {title}
        </h1>
        {actions && <div className="flex-none flex items-center gap-1.5">{actions}</div>}
      </div>
      {subtitle && (
        <p className={`${T.meta} mt-0.5 truncate`} style={{ color: C.textSoft }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ─── Screens ──────────────────────────────────────────────────────────────────

// Một dòng trong "Đã đọc gần đây" — đã tra xong tiêu đề và biết bấm vào thì mở màn hình nào.
interface RecentReadItem {
  key: string
  id: string
  title: string
  at: number
  screen: Screen
  tag: string
}

function HomeScreen({
  onNavigate,
  ecgCount,
  recentReads,
}: {
  onNavigate: (s: Screen, id?: string) => void
  ecgCount: number
  recentReads: RecentReadItem[]
}) {
  // Trước đây cả 5 thẻ (trừ ECG) đều trỏ thẳng vào "library" và đều in "(0)" — một tính năng CHƯA
  // XÂY (Phác đồ, Công cụ tính, Cập nhật guideline...) trông giống hệt một tính năng ĐÃ XONG nhưng
  // rỗng. Giờ chỉ thẻ nào có màn thật (Thuốc → "Dùng thuốc", đã có kháng sinh/vận mạch/tương
  // tác/bảng pha) mới trỏ vào đó; thẻ chưa có màn thì trỏ sang "comingSoon" và không in số đếm giả.
  const resourceCards: { label: string; count?: number; icon: ReactElement; target: { screen: Screen; id?: string } }[] = [
    { label: "Tiếp cận nhanh", icon: icons.summary(), target: { screen: "comingSoon", id: "Tiếp cận nhanh" } },
    // "Thuốc" ở đây là một mục THAM KHẢO DƯỢC LÝ (chưa xây) — khác hẳn tab "Dùng thuốc" dưới thanh
    // nav (máy tính liều/pha thuốc). Trỏ hai cái vào cùng một màn là gán nhầm ý nghĩa cho thẻ này.
    { label: "Thuốc", icon: icons.pill(), target: { screen: "comingSoon", id: "Thuốc" } },
    { label: "Phác đồ", icon: icons.flow(), target: { screen: "comingSoon", id: "Phác đồ" } },
    { label: "Công cụ tính", icon: icons.calculator(), target: { screen: "comingSoon", id: "Công cụ tính" } },
    { label: "Cập nhật guideline", icon: icons.guideline(), target: { screen: "comingSoon", id: "Cập nhật guideline" } },
    { label: "ECG", count: ecgCount, icon: icons.ecg(), target: { screen: "ecg" } },
  ]
  // Thẻ nào trỏ vào "comingSoon" thì dòng dưới nói "Sắp ra mắt"; thẻ trỏ vào tính năng thật thì im
  // lặng (không có số đếm thật để đưa ra) hoặc in số đếm thật (ECG) — không còn "(0)" giả cho tính
  // năng đã xong lẫn chưa xong đọc giống hệt nhau.
  const cardCaption = (c: (typeof resourceCards)[number]) => (c.target.screen === "comingSoon" ? "Sắp ra mắt" : c.count != null ? `(${c.count})` : "")

  return (
    <div className="scroll-ios h-full pb-6">
      {/* Header. Logo vẽ bằng SVG theo currentColor (không phải file PNG như trước): ảnh cũ là một
          ô vuông nền TRẮNG, dán lên nền tối thì nổi lên như miếng vá không liên quan. Bản vẽ này
          không có nền riêng nên hoà vào cả bản sáng lẫn bản tối.
          `paddingRight` chừa đúng chỗ cho cụm nút nổi (chủ đề + chuyên khoa) neo ở góc trên phải —
          xem FloatingTopBar trong App shell. Không có nó thì chữ chui xuống dưới cụm nút đó. */}
      <div className="px-5 pt-2 pb-4 flex items-center gap-3" style={{ paddingRight: 180 }}>
        <span className="flex-none" style={{ color: "var(--c-primary)" }}>
          {icons.notebookT("w-10 h-10")}
        </span>
        <span className="text-[22px] font-bold text-slate-900 leading-none">DrTrong</span>
      </div>

      {/* Search */}
      <div className="px-6 pb-6 flex items-center gap-3">
        <button
          onClick={() => onNavigate("search")}
          className="flex-1 flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm text-slate-400 font-medium"
          style={{ background: "var(--c-line-soft)" }}
        >
          {icons.search(false)}
          Tìm thứ gì đó...
        </button>
      </div>

      {/* Clinical Resources */}
      <div className="mb-6">
        <h2 className="px-5 text-lg font-bold text-slate-900 mb-3">Truy cập nhanh</h2>
        <div className="flex gap-3 overflow-x-auto pl-5 pr-5 pb-1">
          {resourceCards.map((c) => (
            <button
              key={c.label}
              onClick={() => onNavigate(c.target.screen, c.target.id)}
              className="flex-none w-[136px] h-[152px] p-4 rounded-2xl border card-press text-left flex flex-col"
              style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}
            >
              <div
                className="flex-none w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "var(--c-primary)", color: "var(--c-on-bright)" }}
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
          onClick={() => onNavigate("addEntry")}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border card-press text-left mb-2.5"
          style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}
        >
          <div
            className="flex-none w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--c-primary-soft)", color: "var(--c-primary)" }}
          >
            {icons.plus()}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-[15px] leading-snug">Tạo bài mới</p>
            <p className="text-xs text-slate-400 mt-0.5">Nhập thêm dữ liệu mới vào kho kiến thức</p>
          </div>
        </button>
        <button
          onClick={() => onNavigate("dataSync")}
          className="w-full flex items-center gap-3 p-4 rounded-2xl border card-press text-left"
          style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}
        >
          <div
            className="flex-none w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--c-green-soft)", color: "var(--c-green)" }}
          >
            {icons.download()}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-[15px] leading-snug">Đồng bộ dữ liệu</p>
            <p className="text-xs text-slate-400 mt-0.5">Xuất/nhập mục tự nhập để sao lưu hoặc chuyển máy</p>
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
            style={{ color: "var(--c-primary)" }}
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
            <div
              className="flex items-center gap-3 p-4 rounded-2xl border"
              style={{ borderColor: "var(--c-line)", background: "var(--c-surface-alt)" }}
            >
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
                  onClick={() => onNavigate(r.screen, r.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border card-press text-left"
                  style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}
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

// ─── "Sắp ra mắt" ──────────────────────────────────────────────────────────────
// Trước đây mấy thẻ trong "Truy cập nhanh" (Phác đồ, Công cụ tính, Cập nhật guideline...) đều âm
// thầm mở màn Thư viện — một tính năng CHƯA XÂY, đội lốt một tính năng ĐÃ XONG. Người bấm vào không
// có cách nào phân biệt "à, đây là kho bài viết" với "ơ sao Công cụ tính lại ra danh sách chuyên
// khoa" — trông như bấm lạc. Giờ tính năng nào chưa có màn riêng thì nói thẳng "sắp có", không giả
// vờ đã xong bằng cách trỏ tạm sang một màn không liên quan.
// `onBack` chỉ truyền khi màn này được mở như một MÀN CHI TIẾT (từ thẻ ở Truy cập nhanh — nằm
// trong NON_TAB_SCREENS, ẩn thanh nav dưới, cần đường quay lại). Bỏ trống khi màn này đứng nguyên
// tại một TAB dưới thanh nav (vd FlashCard) — tab thì không "quay lại", chỉ đổi tab khác, nên dùng
// ScreenHeader giống mọi tab khác thay vì vẽ một nút Quay lại vô nghĩa.
function ComingSoonScreen({ feature, onBack }: { feature: string; onBack?: () => void }) {
  return (
    <div className="h-full flex flex-col screen-transition">
      {onBack ? (
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--c-line)" }}>
          <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
            {icons.back()}
            Quay lại
          </button>
          <span className="text-sm font-semibold text-slate-900">{feature}</span>
          <span className="w-16" />
        </div>
      ) : (
        <ScreenHeader title={feature} />
      )}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-8">
        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "var(--c-primary-soft)", color: "var(--c-primary)" }}>
          {icons.comingSoon()}
        </div>
        <div>
          <p className="font-bold text-slate-900 text-[17px]">{feature} — sắp ra mắt</p>
          <p className="text-[13px] text-slate-400 leading-relaxed mt-1.5 max-w-[280px]">
            Mục này đang được xây dựng và sẽ xuất hiện trong bản cập nhật sắp tới. Các tính năng khác của app vẫn dùng bình thường.
          </p>
        </div>
      </div>
    </div>
  )
}

function LibraryScreen({
  onNavigate,
  customArticles,
}: {
  onNavigate: (s: Screen, id?: string) => void
  customArticles: Article[]
}) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    // Trước đây tiêu đề nằm CHUNG một vùng cuộn với danh sách (`scroll-ios h-full` bọc cả tiêu đề
    // lẫn nội dung) — cuộn xuống vài trăm pixel là chữ "Thư viện" biến mất hẳn khỏi màn hình, khác
    // hẳn Mindmap/Dùng thuốc/Ôn tập (tiêu đề luôn đứng yên phía trên). Nay tách header ra ngoài
    // vùng cuộn (flex-col + ScreenHeader flex-none + nội dung scroll-ios flex-1) như ba màn kia.
    <div className="h-full flex flex-col">
      <ScreenHeader title="Thư viện" subtitle="Tất cả dữ liệu y học tác giả sưu tầm" />
      <div className="scroll-ios flex-1">
        {customArticles.length > 0 && (
          <div className="px-6 pb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Mục vừa tạo</h2>
            <div className="space-y-2">
              {customArticles.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onNavigate("customEntry", a.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border card-press text-left"
                  style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}
                >
                  <span className="flex-none text-slate-400">{icons.doc()}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{a.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.specialty}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Specialty list */}
        <div className="px-6 pb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Tất cả chuyên khoa</h2>
          <div className="space-y-2">
            {SPECIALTIES.map((spec) => {
              const articleCount = countArticlesFor(spec.name, ARTICLES, customArticles)
              return (
                <button
                  key={spec.id}
                  onClick={() => {
                    setSelected(selected === spec.id ? null : spec.id)
                    onNavigate("specialty", spec.id)
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border card-press text-left"
                  style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none"
                    style={{ background: `${spec.color}15`, color: spec.color }}>
                    {specialtyIcon(spec.id, "w-[22px] h-[22px]")}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-slate-900">{spec.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {articleCount > 0 ? `${articleCount} bài viết` : "Chưa có bài viết"}
                    </p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-muted)" strokeWidth={1.8} className="w-4 h-4 flex-none">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

const SEARCH_FILTERS = ["Tất cả", ...Array.from(new Set(ARTICLES.map((a) => a.specialty)))]

// Một kết quả tìm kiếm gộp từ nhiều nguồn khác nhau (bài viết dựng sẵn/tự nhập, bài học ECG, thẻ ghi
// nhớ) — trước đây SearchScreen chỉ tìm trong ARTICLES tĩnh, nên mọi nội dung người dùng TỰ THÊM
// (bài viết riêng, bài ECG riêng, thẻ ghi nhớ riêng) hoàn toàn vô hình với ô tìm kiếm chính.
interface SearchResult {
  kind: "article" | "customArticle" | "ecg" | "flashcard"
  id: string
  title: string
  subtitle: string
  specialty?: string
  tags: string[]
}

function SearchScreen({
  onNavigate,
  onBack,
  customArticles,
  customFlashcards,
  ecgLessons,
}: {
  onNavigate: (s: Screen, id?: string) => void
  onBack: () => void
  customArticles: Article[]
  customFlashcards: FlashCard[]
  ecgLessons: EcgLesson[]
}) {
  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("Tất cả")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const allResults = useMemo<SearchResult[]>(
    () => [
      ...ARTICLES.map((a): SearchResult => ({ kind: "article", id: a.id, title: a.title, subtitle: a.excerpt, specialty: a.specialty, tags: a.tags })),
      ...customArticles.map((a): SearchResult => ({ kind: "customArticle", id: a.id, title: a.title, subtitle: a.excerpt, specialty: a.specialty, tags: a.tags })),
      // Bài ECG không có trường chuyên khoa (chỉ có tags tự do) — không lọc được theo bộ lọc chuyên
      // khoa, chỉ hiện khi đang ở "Tất cả" (xem điều kiện activeFilter bên dưới).
      ...ecgLessons.map((l): SearchResult => ({ kind: "ecg", id: l.id, title: l.title, subtitle: l.summary ?? "", tags: l.tags })),
      ...customFlashcards.map((c): SearchResult => ({ kind: "flashcard", id: c.id, title: c.front, subtitle: c.back, specialty: c.specialty, tags: [] })),
    ],
    [customArticles, customFlashcards, ecgLessons],
  )

  const filtered = useMemo(() => {
    if (query.length === 0) return []
    const q = query.toLowerCase()
    return allResults.filter((r) => {
      // Bài ECG không có `specialty` (r.specialty == null) — activeFilter khác "Tất cả" thì
      // r.specialty !== activeFilter đã đúng (null luôn khác một chuỗi cụ thể) nên tự động bị loại,
      // không cần kiểm tra riêng.
      if (activeFilter !== "Tất cả" && r.specialty !== activeFilter) return false
      return (
        r.title.toLowerCase().includes(q) ||
        (r.specialty?.toLowerCase().includes(q) ?? false) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [allResults, query, activeFilter])

  const RESULT_LABEL: Record<SearchResult["kind"], string> = {
    article: "",
    customArticle: "Tự nhập",
    ecg: "ECG",
    flashcard: "Thẻ ghi nhớ",
  }

  function openResult(r: SearchResult) {
    if (r.kind === "article") onNavigate("article", r.id)
    else if (r.kind === "customArticle") onNavigate("customEntry", r.id)
    else if (r.kind === "ecg") onNavigate("ecgDetail", r.id)
    else onNavigate("specialty", SPECIALTIES.find((s) => s.name === r.specialty)?.id)
  }

  const trending = ["Tăng huyết áp", "Rung nhĩ", "Thuyên tắc phổi", "Xơ gan", "Tổn thương thận cấp"]

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="px-5 pt-2 pb-3">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium mb-2" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Tìm kiếm</h1>
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "var(--c-line-soft)" }}>
          {icons.search(false)}
          <input
            ref={inputRef}
            type="search"
            placeholder="Tìm thứ gì đó"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5">
          {SEARCH_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: activeFilter === f ? "var(--c-primary)" : "var(--c-line-soft)",
                color: activeFilter === f ? "var(--c-surface)" : "var(--c-text-muted)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Results or trending */}
      <div className="scroll-ios flex-1 px-6 pb-6">
        {query.length === 0 ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Xu hướng</p>
            <div className="space-y-1">
              {trending.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setQuery(t)}
                  className="w-full flex items-center gap-3 py-3 border-b text-left"
                  style={{ borderColor: "var(--c-line-soft)" }}
                >
                  <span className="text-slate-300 text-sm font-mono w-4">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-slate-800">{t}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-line-strong)" strokeWidth={1.8} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 mt-6">Máy tính lâm sàng</p>
            {[
              { name: "Thang điểm CHA₂DS₂-VASc", desc: "Nguy cơ đột quỵ trong rung nhĩ", spec: "cardiology" },
              { name: "Tiêu chuẩn Wells (PE)", desc: "Xác suất thuyên tắc phổi", spec: "pulmonology" },
              { name: "Thang điểm GCS", desc: "Thang điểm hôn mê Glasgow", spec: "neurology" },
              { name: "Thang điểm Child-Pugh", desc: "Mức độ nặng bệnh gan", spec: "gastrointestinal" },
            ].map((calc) => (
              <button key={calc.name} className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-2 border card-press text-left"
                style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}>
                <span className="flex-none" style={{ color: SPECIALTIES.find((s) => s.id === calc.spec)?.color }}>
                  {specialtyIcon(calc.spec, "w-6 h-6")}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{calc.name}</p>
                  <p className="text-xs text-slate-500">{calc.desc}</p>
                </div>
              </button>
            ))}
          </>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{filtered.length} kết quả</p>
            {filtered.map((r) => (
              <button
                key={`${r.kind}-${r.id}`}
                onClick={() => openResult(r)}
                className="w-full text-left p-4 rounded-2xl border card-press"
                style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {r.specialty && (
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--c-primary)" }}>{r.specialty}</span>
                  )}
                  {RESULT_LABEL[r.kind] && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--c-accent-soft)", color: "var(--c-accent)" }}>
                      {RESULT_LABEL[r.kind]}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-900 text-sm">{r.title}</p>
                {r.subtitle && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.subtitle}</p>}
                {r.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2.5 flex-wrap">
                    {r.tags.slice(0, 3).map((t) => <TagPill key={t} tag={t} />)}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center pt-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-slate-700">Không có kết quả cho "{query}"</p>
            <p className="text-sm text-slate-400 mt-1">Thử từ khoá khác hoặc thêm kiến thức mới</p>
          </div>
        )}
      </div>
    </div>
  )
}


// Bôi đậm các thuật ngữ chính trong đoạn văn (danh sách `terms` lấy từ ARTICLE_CONTENT[id].highlightTerms
// — mỗi bài tự khai báo thuật ngữ của mình thay vì regex cứng chỉ đúng cho bài Nhồi máu cơ tim).
function highlightMedicalTerms(text: string, terms: string[]): string {
  return terms.reduce((html, term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return html.replace(new RegExp(`\\b(${escaped})\\b`, "gi"), '<span class="term-highlight">$1</span>')
  }, text)
}

function AddFlashcardScreen({
  onSave,
  onBack,
}: {
  onSave: (c: FlashCard) => void
  onBack: () => void
}) {
  const [front, setFront] = useState("")
  const [back, setBack] = useState("")
  const [specialty, setSpecialty] = useState(SPECIALTIES[0].name)

  const canSave = front.trim().length > 0 && back.trim().length > 0

  function handleSave() {
    if (!canSave) return
    const newCard: FlashCard = {
      id: `custom-fc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      front: front.trim(),
      back: back.trim(),
      specialty,
      due: true,
      isCustom: true,
    }
    onSave(newCard)
  }

  const fieldClass = "w-full px-4 py-3 rounded-2xl text-sm border outline-none"
  const fieldStyle = { borderColor: "var(--c-line)", background: "var(--c-surface)" }

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--c-line)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-900">Thêm thẻ ghi nhớ</span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Chuyên khoa</label>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={fieldClass} style={fieldStyle}>
            {SPECIALTIES.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Câu hỏi (mặt trước)</label>
          <textarea
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="VD: Tiêu chuẩn ECG chẩn đoán STEMI là gì?"
            rows={3}
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Đáp án (mặt sau)</label>
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Nội dung câu trả lời đầy đủ"
            rows={5}
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Thẻ tự nhập được lưu trên máy (trình duyệt của bạn) nên vẫn còn sau khi tắt/mở lại app. Dùng màn "Đồng bộ dữ liệu" nếu muốn sao lưu hoặc chuyển sang thiết bị khác.
        </p>
      </div>

      <div className="flex-none px-6 pt-3 border-t" style={{ borderColor: "var(--c-line)", paddingBottom: "var(--nav-pad-bottom)" }}>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm"
          style={{ background: canSave ? "var(--c-primary)" : "var(--c-muted)", color: "var(--c-on-bright)" }}
        >
          Lưu thẻ ghi nhớ
        </button>
      </div>
    </div>
  )
}

function ArticleScreen({ articleId, onBack }: { articleId: string; onBack: () => void }) {
  const [activeSection, setActiveSection] = useState(0)
  const [tocOpen, setTocOpen] = useState(false)

  const meta = ARTICLES.find((a) => a.id === articleId)
  const content = ARTICLE_CONTENT[articleId]

  // An toàn khi articleId không khớp bài nào (không nên xảy ra trong luồng điều hướng bình thường).
  if (!meta || !content) {
    return (
      <div className="h-full flex flex-col screen-transition">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--c-line)" }}>
          <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
            {icons.back()}
            Quay lại
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 text-sm text-slate-400 text-center">
          Không tìm thấy nội dung bài viết này.
        </div>
      </div>
    )
  }

  const { title, specialty, tags, readTime, difficulty, lastUpdated } = meta
  const { toc, sections, keyPoints, highlightTerms } = content
  const related = ARTICLES.filter((a) => a.id !== articleId).slice(0, 3)

  return (
    <div className="h-full flex flex-col screen-transition">
      {/* Article header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--c-line)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
      </div>

      <div className="scroll-ios flex-1">
        {/* Article title area */}
        <div className="px-6 pt-6 pb-4">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--c-primary)" }}>{specialty}</span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 leading-tight">{title}</h1>
          <div className="flex items-center gap-3 mt-2.5">
            <DifficultyBadge level={difficulty} />
            <span className="text-xs text-slate-400">{readTime} phút đọc</span>
            <span className="text-xs text-slate-400">Cập nhật {lastUpdated}</span>
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {tags.map((t) => <TagPill key={t} tag={t} />)}
          </div>
        </div>

        {/* TOC toggle */}
        <button
          onClick={() => setTocOpen(!tocOpen)}
          className="mx-5 mb-4 w-[calc(100%-2.5rem)] flex items-center justify-between px-4 py-3 rounded-2xl border"
          style={{ borderColor: "var(--c-primary-line)", background: "var(--c-primary-soft)" }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--c-primary)" }}>Mục lục</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--c-primary)" strokeWidth={2} className={`w-4 h-4 transition-transform ${tocOpen ? "rotate-180" : ""}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {tocOpen && (
          <div className="mx-5 mb-4 rounded-2xl border overflow-hidden fade-in" style={{ borderColor: "var(--c-line)" }}>
            {toc.map((item, i) => (
              <button
                key={item}
                onClick={() => { setActiveSection(i); setTocOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0"
                style={{ borderColor: "var(--c-line-soft)", background: i === activeSection ? "var(--c-primary-soft)" : "var(--c-surface)" }}
              >
                <span className="text-xs font-mono text-slate-400 w-4">{i + 1}</span>
                <span className="text-sm font-medium" style={{ color: i === activeSection ? "var(--c-primary)" : "var(--c-text-2)" }}>{item}</span>
              </button>
            ))}
          </div>
        )}

        {/* Article content */}
        <div className="px-6 pb-8 space-y-6">
          {sections.map((sec) => (
            <div key={sec.id}>
              <h2 className="text-lg font-bold text-slate-900 mb-3 pb-2 border-b" style={{ borderColor: "var(--c-line)" }}>{sec.heading}</h2>
              {sec.content.map((para, j) => (
                <p
                  key={j}
                  className="text-sm text-slate-700 leading-relaxed mb-3"
                  dangerouslySetInnerHTML={{ __html: highlightMedicalTerms(para, highlightTerms) }}
                />
              ))}
            </div>
          ))}

          {/* Key points callout */}
          <div className="p-4 rounded-2xl" style={{ background: "var(--c-primary-soft)", border: "1.5px solid var(--c-primary-line-2)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--c-primary-strong)" }}>Điểm chính</p>
            <ul className="space-y-2">
              {keyPoints.map((pt) => (
                <li key={pt} className="flex items-start gap-2 text-sm text-blue-800">
                  <span className="mt-1 flex-none w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#3b82f6" }}>
                    <svg viewBox="0 0 10 10" fill="white" className="w-2.5 h-2.5">
                      <path d="M2 5l2.5 2.5 4-4" stroke="white" strokeWidth={1.5} fill="none" strokeLinecap="round" />
                    </svg>
                  </span>
                  {pt}
                </li>
              ))}
            </ul>
          </div>

          {/* Related articles */}
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-3">Bài viết liên quan</h3>
            {related.map((art) => (
              <div key={art.id} className="flex items-center gap-3 py-3 border-b" style={{ borderColor: "var(--c-line-soft)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--c-line-soft)", color: "var(--c-text-muted)" }}>
                  {specialtyIcon(SPECIALTIES.find((s) => s.name === art.specialty)?.id, "w-[18px] h-[18px]")}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{art.title}</p>
                  <p className="text-xs text-slate-400">{art.specialty} · {art.readTime}m</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SpecialtyScreen({ specialtyId, pulseKey, customArticles, customFlashcards, onBack, onNavigate }: {
  specialtyId: string
  pulseKey: number
  customArticles: Article[]
  customFlashcards: FlashCard[]
  onBack: () => void
  onNavigate: (s: Screen, id?: string) => void
}) {
  const spec = SPECIALTIES.find((s) => s.id === specialtyId) || SPECIALTIES[0]
  const customForSpec = customArticles.filter((a) => a.specialty === spec.name)
  const builtInForSpec = ARTICLES.filter((a) => a.specialty === spec.name)
  // Bài tự thêm hiển thị trước (giống LibraryScreen), sau đó tới bài dựng sẵn. Không còn fallback
  // hiển thị bài của chuyên khoa khác khi chuyên khoa này chưa có bài — trước đây làm vậy khiến
  // người dùng tưởng nhầm đây là nội dung của chuyên khoa đang xem.
  const all = [...customForSpec, ...builtInForSpec]
  const articleCount = all.length
  const flashcardCount = countFlashcardsFor(spec.name, FLASHCARDS, customFlashcards)

  return (
    <div className="relative h-full flex flex-col screen-transition" style={{ background: `${spec.color}0c` }}>
      <div className="flex items-center gap-3 px-4 pb-4 border-b" style={{ paddingTop: 21, borderColor: `${spec.color}30`, background: "var(--c-surface)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: spec.color }}>
          {icons.back()}
          Quay lại trang chủ
        </button>
      </div>
      <div key={specialtyId} className="scroll-ios flex-1 pb-6 screen-transition">
        <div className="px-6 pt-6 pb-6" style={{ background: `linear-gradient(160deg, ${spec.color}40, ${spec.color}00 75%)` }}>
          <div
            key={pulseKey}
            className="w-16 h-16 rounded-2xl flex items-center justify-center pulse-scale"
            style={{ background: spec.color, color: "#fff", boxShadow: `0 10px 24px ${spec.color}55` }}
          >
            {specialtyIcon(spec.id, "w-9 h-9")}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">{spec.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{articleCount} bài viết · {flashcardCount} thẻ ghi nhớ</p>
        </div>
        <div className="px-6 pt-4 space-y-3">
          {all.length === 0 && (
            <div className="text-center py-10 px-4 rounded-2xl border" style={{ borderColor: `${spec.color}25`, background: "var(--c-surface)" }}>
              <p className="text-sm text-slate-500">Chuyên khoa này chưa có bài viết nào.</p>
              <p className="text-xs text-slate-400 mt-1">Dùng "Tạo mục mới" ở Trang chủ để thêm bài viết đầu tiên.</p>
            </div>
          )}
          {all.map((art) => {
            const isCustom = customForSpec.some((a) => a.id === art.id)
            return (
              <button key={art.id} onClick={() => onNavigate(isCustom ? "customEntry" : "article", art.id)}
                className="w-full text-left p-4 rounded-2xl border card-press"
                style={{ borderColor: `${spec.color}25`, background: "var(--c-surface)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <DifficultyBadge level={art.difficulty} />
                  <span className="text-xs text-slate-400">{art.readTime} phút</span>
                  {isCustom && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ background: "var(--c-green-soft)", color: "var(--c-green-deep)" }}
                    >
                      Mới
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm text-slate-900">{art.title}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{art.excerpt}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Add Entry (Create custom session) ────────────────────────────────────────

// Loại nội dung của mục tự nhập, lưu như tag đầu tiên. Bỏ "Lưu đồ" khỏi danh sách: app không có màn
// nào vẽ/hiển thị lưu đồ nên chọn nó chỉ tạo ra một tag không dẫn tới đâu (muốn dựng lưu đồ thì đã
// có màn Sơ đồ tư duy). Mục cũ đã gắn tag "Lưu đồ" vẫn giữ nguyên tag đó, chỉ là không chọn mới được.
const ENTRY_TYPES = ["Bài viết", "Hướng dẫn nhanh", "Thuốc", "Phác đồ", "Máy tính"] as const

// Màn soạn bài viết tự nhập — dùng cho cả TẠO MỚI và SỬA (truyền `initial` là bài cần sửa).
// Nội dung chi tiết soạn tự do theo block (chữ + ảnh xen kẽ, xem components/BlockEditor.tsx).
function AddEntryScreen({
  initial,
  linkTargets,
  onSave,
  onBack,
}: {
  initial?: Article
  linkTargets: LinkTarget[]
  onSave: (a: Article) => void
  onBack: () => void
}) {
  // Loại nội dung được lưu như tag ĐẦU TIÊN (xem handleSave) — khi sửa thì tách ngược ra để hiển
  // thị đúng chip đang chọn và không nhân đôi tag.
  const initialType = ENTRY_TYPES.find((t) => t === initial?.tags[0]) ?? "Bài viết"
  const initialExtraTags = initial ? initial.tags.filter((t) => t !== initialType) : []

  const [title, setTitle] = useState(initial?.title ?? "")
  const [specialty, setSpecialty] = useState(initial?.specialty ?? SPECIALTIES[0].name)
  const [type, setType] = useState<(typeof ENTRY_TYPES)[number]>(initialType)
  const [difficulty, setDifficulty] = useState<"Cơ bản" | "Nâng cao">(initial?.difficulty ?? "Cơ bản")
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "")
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => blocksForEditing(initial ? articleBlocks(initial) : []))
  const [tagsText, setTagsText] = useState(initialExtraTags.join(", "))

  const canSave = title.trim().length > 0

  function handleSave() {
    if (!canSave) return
    const saved = cleanBlocks(blocks)
    // Tóm tắt tự động & thời gian đọc chỉ tính phần chữ — bỏ chú thích ảnh để tóm tắt đọc xuôi.
    const plain = blocksToPlainText(saved.filter((b) => b.type !== "image"))
    const wordCount = plain.trim() ? plain.trim().split(/\s+/).length : 0
    const newArticle: Article = {
      id: initial?.id ?? `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      specialty,
      tags: [type, ...tagsText.split(",").map((t) => t.trim()).filter(Boolean)],
      readTime: Math.max(1, Math.round(wordCount / 200)),
      difficulty,
      excerpt: excerpt.trim() || plain.trim().slice(0, 140) || "(Chưa có tóm tắt)",
      lastUpdated: initial ? "Vừa sửa" : "Vừa tạo",
      blocks: saved,
    }
    onSave(newArticle)
  }

  const fieldClass = "w-full px-4 py-3 rounded-2xl text-sm border outline-none"
  const fieldStyle = { borderColor: "var(--c-line)", background: "var(--c-surface)" }

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--c-line)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-900">{initial ? "Sửa mục" : "Tạo mục mới"}</span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tiêu đề</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Hạ natri máu cấp"
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Chuyên khoa</label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className={fieldClass}
            style={fieldStyle}
          >
            {SPECIALTIES.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Loại nội dung</label>
          <div className="flex flex-wrap gap-2">
            {ENTRY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                style={
                  type === t
                    ? { background: "var(--c-primary)", borderColor: "var(--c-primary)", color: "var(--c-on-bright)" }
                    : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Độ khó</label>
          <div className="flex gap-2">
            {(["Cơ bản", "Nâng cao"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="flex-1 py-2.5 rounded-2xl text-sm font-semibold border"
                style={
                  difficulty === d
                    ? { background: "var(--c-primary)", borderColor: "var(--c-primary)", color: "var(--c-on-bright)" }
                    : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                }
              >
                {d === "Nâng cao" ? "Nâng cao" : "Cơ bản"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tóm tắt ngắn</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="1–2 câu tóm tắt hiển thị ở danh sách"
            rows={2}
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nội dung chi tiết</label>
          <BlockEditor blocks={blocks} onChange={setBlocks} linkTargets={linkTargets} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Thẻ tag (cách nhau bằng dấu phẩy)</label>
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="VD: điện giải, cấp cứu"
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Mục tự nhập (kể cả ảnh chèn trong bài) được lưu trên máy (trình duyệt của bạn) nên vẫn còn sau khi tắt/mở lại app. Dùng màn "Đồng bộ dữ liệu" nếu muốn sao lưu hoặc chuyển sang thiết bị khác.
        </p>
      </div>

      <div className="flex-none px-6 pt-3 border-t" style={{ borderColor: "var(--c-line)", paddingBottom: "var(--nav-pad-bottom)" }}>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm"
          style={{ background: canSave ? "var(--c-primary)" : "var(--c-muted)", color: "var(--c-on-bright)" }}
        >
          {initial ? "Lưu thay đổi" : "Lưu mục mới"}
        </button>
      </div>
    </div>
  )
}

// Danh mục đường dùng cố định cho kháng sinh tự nhập — chọn nhanh bằng chip thay vì gõ tự do,
// để đồng bộ với cách AntibioticDoseCard/AntibioticsScreen hiển thị `route`. "other" mở thêm
// một ô nhập chuỗi tự do (không có field riêng trong Antibiotic — giá trị gõ vào chính là `route`).
const ANTIBIOTIC_ROUTE_OPTIONS: { id: string; label: string }[] = [
  { id: "iv-infusion", label: "Truyền tĩnh mạch (TTM)" },
  { id: "iv-slow", label: "Tiêm tĩnh mạch chậm (TMC)" },
  { id: "im", label: "Tiêm bắp (TB)" },
  { id: "sc", label: "Tiêm dưới da (TDD)" },
  { id: "oral", label: "Uống" },
  { id: "other", label: "Vị trí khác" },
]

function AddAntibioticScreen({
  diseases,
  onSave,
  onBack,
}: {
  diseases: DiseaseEntry[]
  onSave: (a: Antibiotic) => void
  onBack: () => void
}) {
  const [name, setName] = useState("")
  const [routeId, setRouteId] = useState<string>("iv-infusion")
  const [routeOther, setRouteOther] = useState("")
  const [diseaseIds, setDiseaseIds] = useState<string[]>([])
  const [doseMode, setDoseMode] = useState<"fixed" | "crcl3" | "crcl4">("fixed")
  const [fixedDose, setFixedDose] = useState("")
  // Mức chung cho cả 2 chế độ CrCl (3 mức / 4 mức)
  const [tier50, setTier50] = useState("")
  const [tierBelow10, setTierBelow10] = useState("")
  // Riêng cho 3 mức: >50, 10–49, <10
  const [tier1049, setTier1049] = useState("")
  // Riêng cho 4 mức: >50, 31–50, 10–30, <10
  const [tier3150, setTier3150] = useState("")
  const [tier1030, setTier1030] = useState("")
  const [preparation, setPreparation] = useState("")
  const [note, setNote] = useState("")
  const [warningText, setWarningText] = useState("")
  const [warningSeverity, setWarningSeverity] = useState<"cao" | "trung bình">("trung bình")
  const [source, setSource] = useState("")
  const [reviewedOn, setReviewedOn] = useState("")
  // Liều nạp — vd Vancomycin cần liều nạp trước khi vào liều duy trì theo CrCl. Trước đây chỉ màn
  // Sửa có mục này, thêm nhanh kháng sinh mới hoàn toàn không khai báo được.
  const [boluses, setBoluses] = useState<BolusDraft[]>([])

  const isIvInfusion = routeId === "iv-infusion"
  const isOtherRoute = routeId === "other"
  const finalRoute = isOtherRoute ? routeOther.trim() : ANTIBIOTIC_ROUTE_OPTIONS.find((r) => r.id === routeId)?.label ?? ""

  const hasCrcl3Dose = tier50.trim() || tier1049.trim() || tierBelow10.trim()
  const hasCrcl4Dose = tier50.trim() || tier3150.trim() || tier1030.trim() || tierBelow10.trim()
  const doseValid =
    doseMode === "fixed" ? fixedDose.trim().length > 0 : doseMode === "crcl3" ? Boolean(hasCrcl3Dose) : Boolean(hasCrcl4Dose)
  const canSave = name.trim().length > 0 && finalRoute.length > 0 && doseValid

  function toggleDisease(id: string) {
    setDiseaseIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  function handleSave() {
    if (!canSave) return
    const tiers: DoseTier[] =
      doseMode === "fixed"
        ? [{ min: 0, label: "Mọi mức CrCl", dose: fixedDose.trim() }]
        : doseMode === "crcl3"
          ? [
              ...(tier50.trim() ? [{ min: 50, label: "CrCl ≥ 50", dose: tier50.trim() }] : []),
              ...(tier1049.trim() ? [{ min: 10, label: "CrCl 10–49", dose: tier1049.trim() }] : []),
              ...(tierBelow10.trim() ? [{ min: 0, label: "CrCl < 10", dose: tierBelow10.trim() }] : []),
            ]
          : [
              ...(tier50.trim() ? [{ min: 50, label: "CrCl ≥ 50", dose: tier50.trim() }] : []),
              ...(tier3150.trim() ? [{ min: 31, label: "CrCl 31–50", dose: tier3150.trim() }] : []),
              ...(tier1030.trim() ? [{ min: 10, label: "CrCl 10–30", dose: tier1030.trim() }] : []),
              ...(tierBelow10.trim() ? [{ min: 0, label: "CrCl < 10", dose: tierBelow10.trim() }] : []),
            ]

    // Bệnh lý áp dụng: gắn `indications` theo từng bệnh lý đã chọn (dùng chung `tiers` ở trên) —
    // để AntibioticsScreen nhận diện được thuốc này khi người dùng chọn đúng bệnh lý đó ở Bước 2,
    // và AntibioticDoseCard hiển thị đúng nhãn "Chỉ định: ..." — đồng bộ với cách hiển thị chung.
    const indications: IndicationDose[] | undefined =
      diseaseIds.length > 0
        ? diseaseIds.map((diseaseId) => ({
            diseaseId,
            tiers,
            standardDose: doseMode === "fixed" ? fixedDose.trim() : undefined,
          }))
        : undefined

    const cleanedBoluses = boluses.map(draftToBolus).filter((b): b is BolusDose => b != null)
    const newDrug: Antibiotic = {
      id: `custom-abx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      route: finalRoute,
      preparation: isIvInfusion && preparation.trim() ? preparation.trim() : undefined,
      note: note.trim() || undefined,
      tiers,
      warnings: warningText.trim() ? [{ text: warningText.trim(), severity: warningSeverity }] : undefined,
      indications,
      boluses: cleanedBoluses.length > 0 ? cleanedBoluses : undefined,
      source: source.trim() || undefined,
      reviewedOn: reviewedOn.trim() || undefined,
      isCustom: true,
    }
    onSave(newDrug)
  }

  const fieldClass = "w-full px-4 py-3 rounded-2xl text-sm border outline-none"
  const fieldStyle = { borderColor: "var(--c-line)", background: "var(--c-surface)" }
  const chipStyle = (active: boolean) =>
    active
      ? { background: "var(--c-primary)", borderColor: "var(--c-primary)", color: "var(--c-on-bright)" }
      : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--c-line)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-900">Thêm kháng sinh tự nhập</span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tên hoạt chất</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Linezolid" className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Đường dùng</label>
          <div className="flex flex-wrap gap-2">
            {ANTIBIOTIC_ROUTE_OPTIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRouteId(r.id)}
                className="px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors"
                style={chipStyle(routeId === r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          {isOtherRoute && (
            <input
              value={routeOther}
              onChange={(e) => setRouteOther(e.target.value)}
              placeholder="Ghi rõ đường dùng, VD: Tiêm trong khớp, nhỏ mắt..."
              className={`${fieldClass} mt-2.5`}
              style={fieldStyle}
            />
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Bệnh lý áp dụng (tuỳ chọn)</label>
          <div className="flex flex-wrap gap-2">
            {diseases.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDisease(d.id)}
                className="px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors"
                style={
                  diseaseIds.includes(d.id)
                    ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)", color: "var(--c-primary)" }
                    : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                }
              >
                {d.name}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">Không chọn = thuốc dùng chung, không gắn với bệnh lý cụ thể nào.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cách chỉnh liều</label>
          <div className="flex flex-wrap gap-2 mb-2.5">
            {(
              [
                { id: "fixed" as const, label: "Liều cố định" },
                { id: "crcl3" as const, label: "Theo CrCl (3 mức)" },
                { id: "crcl4" as const, label: "Theo CrCl (4 mức)" },
              ]
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setDoseMode(m.id)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-semibold border min-w-[30%]"
                style={chipStyle(doseMode === m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {doseMode === "fixed" && (
            <input value={fixedDose} onChange={(e) => setFixedDose(e.target.value)} placeholder="VD: 600 mg mỗi 12h — không cần chỉnh liều thận" className={fieldClass} style={fieldStyle} />
          )}
          {doseMode === "crcl3" && (
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">CrCl ≥ 50</label>
                <input value={tier50} onChange={(e) => setTier50(e.target.value)} placeholder="VD: 1 g mỗi 8h" className={fieldClass} style={fieldStyle} />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">CrCl 10–49</label>
                <input value={tier1049} onChange={(e) => setTier1049(e.target.value)} placeholder="VD: 1 g mỗi 12h" className={fieldClass} style={fieldStyle} />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">CrCl &lt; 10</label>
                <input value={tierBelow10} onChange={(e) => setTierBelow10(e.target.value)} placeholder="VD: 500 mg mỗi 24h" className={fieldClass} style={fieldStyle} />
              </div>
              <p className="text-[11px] text-slate-400">Có thể bỏ trống mức không áp dụng — chỉ cần điền ít nhất một mức.</p>
            </div>
          )}
          {doseMode === "crcl4" && (
            <div className="space-y-2">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">CrCl &gt; 50</label>
                <input value={tier50} onChange={(e) => setTier50(e.target.value)} placeholder="VD: 1 g mỗi 8h" className={fieldClass} style={fieldStyle} />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">CrCl 31–50</label>
                <input value={tier3150} onChange={(e) => setTier3150(e.target.value)} placeholder="VD: 1 g mỗi 12h" className={fieldClass} style={fieldStyle} />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">CrCl 10–30</label>
                <input value={tier1030} onChange={(e) => setTier1030(e.target.value)} placeholder="VD: 500 mg mỗi 12h" className={fieldClass} style={fieldStyle} />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">CrCl &lt; 10</label>
                <input value={tierBelow10} onChange={(e) => setTierBelow10(e.target.value)} placeholder="VD: 500 mg mỗi 24h" className={fieldClass} style={fieldStyle} />
              </div>
              <p className="text-[11px] text-slate-400">Có thể bỏ trống mức không áp dụng — chỉ cần điền ít nhất một mức.</p>
            </div>
          )}
        </div>

        {isIvInfusion && (
          <div className="fade-in">
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cách dùng / Pha thuốc (tuỳ chọn)</label>
            <textarea value={preparation} onChange={(e) => setPreparation(e.target.value)} placeholder="VD: Pha với Natri Clorid 0,9%, truyền trong 30–60 phút" rows={3} className={fieldClass} style={fieldStyle} />
          </div>
        )}

        {/* Liều nạp — vd Vancomycin cần liều nạp trước khi vào liều duy trì theo CrCl. */}
        <BolusEditorField boluses={boluses} setBoluses={setBoluses} />

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ghi chú (tuỳ chọn)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Theo dõi nồng độ đáy" className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cảnh báo / tương tác (tuỳ chọn)</label>
          <input value={warningText} onChange={(e) => setWarningText(e.target.value)} placeholder="VD: Thận trọng khi phối hợp với..." className={`${fieldClass} mb-2`} style={fieldStyle} />
          {warningText.trim() && (
            <div className="flex gap-2">
              {(["trung bình", "cao"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setWarningSeverity(s)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                  style={
                    warningSeverity === s
                      ? { background: s === "cao" ? "var(--c-danger-icon)" : "var(--c-warn-icon)", borderColor: "transparent", color: "var(--c-on-bright)" }
                      : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                  }
                >
                  Mức độ: {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 border-t" style={{ borderColor: "var(--c-line-soft)" }}>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Nguồn dữ liệu (tuỳ chọn)</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="VD: Phác đồ ICU BV X 2026 / Sanford Guide" className={fieldClass} style={fieldStyle} />
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Rà soát lần cuối (YYYY-MM)</label>
          <input value={reviewedOn} onChange={(e) => setReviewedOn(e.target.value)} placeholder="VD: 2026-07" className={fieldClass} style={fieldStyle} />
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5">
            Bỏ trống thì thẻ thuốc sẽ hiện rõ "chưa ghi nguồn · chưa rà soát".
          </p>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Mục tự nhập được lưu trên máy (trình duyệt của bạn) nên vẫn còn sau khi tắt/mở lại app.
        </p>
      </div>

      <div className="flex-none px-6 pt-3 border-t" style={{ borderColor: "var(--c-line)", paddingBottom: "var(--nav-pad-bottom)" }}>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm"
          style={{ background: canSave ? "var(--c-primary)" : "var(--c-muted)", color: "var(--c-on-bright)" }}
        >
          Lưu kháng sinh
        </button>
      </div>
    </div>
  )
}

// Sửa một kháng sinh đã có — dùng chung cho cả thuốc dựng sẵn (lưu thành bản "đã chỉnh sửa" đè
// lên bản gốc khi hiển thị, xem mergeWithOverrides) lẫn thuốc tự nhập trước đó. Cố tình KHÔNG dùng
// lại giao diện "liều cố định / CrCl 3 mức / CrCl 4 mức" của AddAntibioticScreen: dữ liệu dựng sẵn
// thực tế có nhiều mốc CrCl khác nhau (vd. 60/40/20/0, thậm chí 5 mức) không khớp khuôn cố định đó
// — ép vào khuôn đó khi sửa sẽ làm mất/lệch dữ liệu. Màn này cho sửa trực tiếp từng mức liều
// (min, nhãn, liều) và từng cảnh báo dưới dạng danh sách có thể thêm/xoá tự do, không mất dữ liệu.
// Một dòng "Chỉ định riêng theo bệnh lý" đang chỉnh sửa trong EditAntibioticScreen. `diseaseName`
// là ô nhập tự do — khi lưu, app tìm bệnh lý trùng tên (không phân biệt hoa/thường) trong danh mục
// hiện có (gốc + tự nhập); nếu không thấy, tự tạo một DiseaseEntry mới (xem handleSave bên dưới).
interface IndicationRow {
  key: string
  diseaseName: string
  standardDose: string
  tiers: { min: string; label: string; dose: string }[]
  note: string
}

function EditAntibioticScreen({
  drug,
  diseases,
  onSave,
  onBack,
}: {
  drug: Antibiotic
  diseases: DiseaseEntry[]
  onSave: (a: Antibiotic, newDiseases: DiseaseEntry[]) => void
  onBack: () => void
}) {
  const initialRouteMatch = ANTIBIOTIC_ROUTE_OPTIONS.find((r) => r.label === drug.route)
  const [name, setName] = useState(drug.name)
  const [routeId, setRouteId] = useState<string>(initialRouteMatch ? initialRouteMatch.id : "other")
  const [routeOther, setRouteOther] = useState(initialRouteMatch ? "" : drug.route)
  const [standardDose, setStandardDose] = useState(drug.standardDose ?? "")
  const [preparation, setPreparation] = useState(drug.preparation ?? "")
  const [note, setNote] = useState(drug.note ?? "")
  const [source, setSource] = useState(drug.source ?? "")
  const [reviewedOn, setReviewedOn] = useState(drug.reviewedOn ?? "")
  // Liều khi lọc máu — nhập được ngay tại đây để phác đồ của khoa vào thẳng app, thay vì mỗi lần
  // gặp bệnh nhân CRRT lại phải đi tra sổ.
  const [rrtIhd, setRrtIhd] = useState(drug.rrt?.ihd ?? "")
  const [rrtCrrt, setRrtCrrt] = useState(drug.rrt?.crrt ?? "")
  const [rrtSled, setRrtSled] = useState(drug.rrt?.sled ?? "")
  const [rrtPd, setRrtPd] = useState(drug.rrt?.pd ?? "")
  const [rrtNote, setRrtNote] = useState(drug.rrt?.note ?? "")
  const [rrtSource, setRrtSource] = useState(drug.rrt?.source ?? "")
  // Liều nạp — vd Vancomycin cần 25–30 mg/kg trước khi vào liều duy trì theo CrCl.
  const [boluses, setBoluses] = useState<BolusDraft[]>(() => (drug.boluses ?? []).map(bolusToDraft))
  const [tiers, setTiers] = useState<{ min: string; label: string; dose: string }[]>(
    drug.tiers.length > 0 ? drug.tiers.map((t) => ({ min: String(t.min), label: t.label, dose: t.dose })) : [{ min: "0", label: "Mọi mức CrCl", dose: "" }],
  )
  const [warnings, setWarnings] = useState<{ text: string; severity: "cao" | "trung bình" }[]>(
    (drug.warnings ?? []).map((w) => ({ text: w.text, severity: w.severity })),
  )
  // Chỉ định riêng theo bệnh lý — trước đây chỉ xem, giờ cho sửa/thêm/xoá được ngay ở màn này.
  const [indications, setIndications] = useState<IndicationRow[]>(() =>
    (drug.indications ?? []).map((ind, i) => {
      const dz = diseases.find((d) => d.id === ind.diseaseId)
      return {
        key: `${ind.diseaseId}-${i}`,
        diseaseName: dz?.name ?? ind.diseaseId,
        standardDose: ind.standardDose ?? "",
        tiers: ind.tiers.map((t) => ({ min: String(t.min), label: t.label, dose: t.dose })),
        note: ind.note ?? "",
      }
    }),
  )

  const isOtherRoute = routeId === "other"
  const finalRoute = isOtherRoute ? routeOther.trim() : ANTIBIOTIC_ROUTE_OPTIONS.find((r) => r.id === routeId)?.label ?? ""
  const canSave = name.trim().length > 0 && finalRoute.length > 0 && tiers.some((t) => t.dose.trim())

  function updateTier(idx: number, field: "min" | "label" | "dose", value: string) {
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)))
  }
  function addTier() {
    setTiers((prev) => [...prev, { min: "", label: "", dose: "" }])
  }
  function removeTier(idx: number) {
    setTiers((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

  function updateWarningText(idx: number, value: string) {
    setWarnings((prev) => prev.map((w, i) => (i === idx ? { ...w, text: value } : w)))
  }
  function updateWarningSeverity(idx: number, severity: "cao" | "trung bình") {
    setWarnings((prev) => prev.map((w, i) => (i === idx ? { ...w, severity } : w)))
  }
  function addWarning() {
    setWarnings((prev) => [...prev, { text: "", severity: "trung bình" }])
  }
  function removeWarning(idx: number) {
    setWarnings((prev) => prev.filter((_, i) => i !== idx))
  }

  function addIndication() {
    setIndications((prev) => [
      ...prev,
      { key: `new-${Date.now()}-${prev.length}`, diseaseName: "", standardDose: "", tiers: [], note: "" },
    ])
  }
  function removeIndication(key: string) {
    setIndications((prev) => prev.filter((r) => r.key !== key))
  }
  function updateIndicationField(key: string, field: "diseaseName" | "standardDose" | "note", value: string) {
    setIndications((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }
  function pickIndicationDisease(key: string, diseaseName: string) {
    setIndications((prev) => prev.map((r) => (r.key === key ? { ...r, diseaseName } : r)))
  }
  function addIndicationTier(key: string) {
    setIndications((prev) => prev.map((r) => (r.key === key ? { ...r, tiers: [...r.tiers, { min: "", label: "", dose: "" }] } : r)))
  }
  function removeIndicationTier(key: string, idx: number) {
    setIndications((prev) => prev.map((r) => (r.key === key ? { ...r, tiers: r.tiers.filter((_, i) => i !== idx) } : r)))
  }
  function updateIndicationTier(key: string, idx: number, field: "min" | "label" | "dose", value: string) {
    setIndications((prev) =>
      prev.map((r) => (r.key === key ? { ...r, tiers: r.tiers.map((t, i) => (i === idx ? { ...t, [field]: value } : t)) } : r)),
    )
  }

  function handleSave() {
    if (!canSave) return
    const cleanedTiers: DoseTier[] = tiers
      .filter((t) => t.dose.trim())
      .map((t) => {
        const minNum = parseFloat(t.min)
        const min = isNaN(minNum) ? 0 : minNum
        return { min, label: t.label.trim() || `CrCl ≥ ${min}`, dose: t.dose.trim() }
      })
    const cleanedWarnings: AntibioticWarning[] = warnings.filter((w) => w.text.trim()).map((w) => ({ text: w.text.trim(), severity: w.severity }))
    const cleanedBoluses = boluses.map(draftToBolus).filter((b): b is BolusDose => b != null)
    const fallbackTiers = cleanedTiers.length > 0 ? cleanedTiers : drug.tiers

    // Với mỗi chỉ định theo bệnh lý: tìm bệnh lý trùng tên trong danh mục hiện có (không phân biệt
    // hoa/thường, không kể khoảng trắng thừa) để lấy đúng diseaseId; nếu tên không khớp mục nào,
    // đây là bệnh lý mới do người dùng gõ vào — tự tạo một DiseaseEntry mới cho bệnh lý đó. Cũng so
    // khớp với các bệnh lý VỪA được tạo ở chỉ định trước đó trong cùng lần lưu này, để hai chỉ định
    // cùng gõ một tên bệnh lý mới (chưa có trong danh mục) dùng chung một diseaseId thay vì tạo trùng.
    const newDiseases: DiseaseEntry[] = []
    const cleanedIndications: IndicationDose[] = indications
      .filter((row) => row.diseaseName.trim())
      .map((row) => {
        const trimmedName = row.diseaseName.trim()
        const matched =
          diseases.find((d) => d.name.trim().toLowerCase() === trimmedName.toLowerCase()) ??
          newDiseases.find((d) => d.name.trim().toLowerCase() === trimmedName.toLowerCase())
        let diseaseId = matched?.id
        if (!diseaseId) {
          diseaseId = `custom-disease-${slugifyDiseaseName(trimmedName) || "moi"}-${Date.now()}-${newDiseases.length}`
          newDiseases.push({ id: diseaseId, name: trimmedName, antibiotics: [drug.id], isCustom: true })
        }
        const indTiers: DoseTier[] = row.tiers
          .filter((t) => t.dose.trim())
          .map((t) => {
            const minNum = parseFloat(t.min)
            const min = isNaN(minNum) ? 0 : minNum
            return { min, label: t.label.trim() || `CrCl ≥ ${min}`, dose: t.dose.trim() }
          })
        const indication: IndicationDose = {
          diseaseId,
          tiers: indTiers.length > 0 ? indTiers : fallbackTiers,
          standardDose: row.standardDose.trim() || undefined,
          note: row.note.trim() || undefined,
        }
        return indication
      })

    const updated: Antibiotic = {
      ...drug,
      name: name.trim(),
      route: finalRoute,
      standardDose: standardDose.trim() || undefined,
      preparation: preparation.trim() || undefined,
      note: note.trim() || undefined,
      tiers: fallbackTiers,
      warnings: cleanedWarnings.length > 0 ? cleanedWarnings : undefined,
      indications: cleanedIndications.length > 0 ? cleanedIndications : undefined,
      boluses: cleanedBoluses.length > 0 ? cleanedBoluses : undefined,
      source: source.trim() || undefined,
      reviewedOn: reviewedOn.trim() || undefined,
      rrt:
        rrtIhd.trim() || rrtCrrt.trim() || rrtSled.trim() || rrtPd.trim() || rrtNote.trim()
          ? {
              ihd: rrtIhd.trim() || undefined,
              crrt: rrtCrrt.trim() || undefined,
              sled: rrtSled.trim() || undefined,
              pd: rrtPd.trim() || undefined,
              note: rrtNote.trim() || undefined,
              source: rrtSource.trim() || undefined,
              reviewedOn: drug.rrt?.reviewedOn,
            }
          : undefined,
      isCustom: true,
    }
    onSave(updated, newDiseases)
  }

  const fieldClass = "w-full px-4 py-3 rounded-2xl text-sm border outline-none"
  const fieldStyle = { borderColor: "var(--c-line)", background: "var(--c-surface)" }
  const chipStyle = (active: boolean) =>
    active
      ? { background: "var(--c-primary)", borderColor: "var(--c-primary)", color: "var(--c-on-bright)" }
      : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--c-line)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-900">Sửa kháng sinh</span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tên hoạt chất</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Đường dùng</label>
          <div className="flex flex-wrap gap-2">
            {ANTIBIOTIC_ROUTE_OPTIONS.map((r) => (
              <button key={r.id} onClick={() => setRouteId(r.id)} className="px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors" style={chipStyle(routeId === r.id)}>
                {r.label}
              </button>
            ))}
            <button onClick={() => setRouteId("other")} className="px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors" style={chipStyle(routeId === "other")}>
              Khác
            </button>
          </div>
          {isOtherRoute && (
            <input value={routeOther} onChange={(e) => setRouteOther(e.target.value)} placeholder="Ghi rõ đường dùng" className={`${fieldClass} mt-2.5`} style={fieldStyle} />
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Liều chuẩn tham khảo (tuỳ chọn)</label>
          <input
            value={standardDose}
            onChange={(e) => setStandardDose(e.target.value)}
            placeholder="VD: 1–2 g mỗi 8h (IV)"
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cách dùng / Pha thuốc (tuỳ chọn)</label>
          <textarea value={preparation} onChange={(e) => setPreparation(e.target.value)} rows={3} className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500">Mức liều theo CrCl</label>
            <button onClick={addTier} className="text-xs font-semibold" style={{ color: "var(--c-primary)" }}>
              + Thêm mức
            </button>
          </div>
          <div className="space-y-2.5">
            {tiers.map((t, idx) => (
              <div key={idx} className="p-3 rounded-2xl border" style={{ borderColor: "var(--c-line)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 mb-1 block">CrCl tối thiểu (mL/phút)</label>
                    <input
                      value={t.min}
                      onChange={(e) => updateTier(idx, "min", normalizeDecimalInput(e.target.value))}
                      inputMode="decimal"
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={fieldStyle}
                    />
                  </div>
                  <div className="flex-[2]">
                    <label className="text-[10px] text-slate-400 mb-1 block">Nhãn hiển thị</label>
                    <input
                      value={t.label}
                      onChange={(e) => updateTier(idx, "label", e.target.value)}
                      placeholder="VD: CrCl 10–49"
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={fieldStyle}
                    />
                  </div>
                  {tiers.length > 1 && (
                    <button
                      onClick={() => removeTier(idx)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-none mt-4"
                      style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }}
                      aria-label="Xoá mức"
                    >
                      {icons.x()}
                    </button>
                  )}
                </div>
                <label className="text-[10px] text-slate-400 mb-1 block">Liều</label>
                <input
                  value={t.dose}
                  onChange={(e) => updateTier(idx, "dose", e.target.value)}
                  placeholder="VD: 1 g mỗi 8h"
                  className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                  style={fieldStyle}
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">Chỉ 1 mức với CrCl tối thiểu = 0 nghĩa là liều cố định, không cần chỉnh theo thận.</p>
        </div>

        {/* Liều nạp — vd Vancomycin cần 25–30 mg/kg trước khi vào liều duy trì theo CrCl. */}
        <BolusEditorField boluses={boluses} setBoluses={setBoluses} />

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ghi chú (tuỳ chọn)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500">Cảnh báo / tương tác (tuỳ chọn)</label>
            <button onClick={addWarning} className="text-xs font-semibold" style={{ color: "var(--c-primary)" }}>
              + Thêm cảnh báo
            </button>
          </div>
          <div className="space-y-2">
            {warnings.map((w, idx) => (
              <div key={idx} className="p-3 rounded-2xl border" style={{ borderColor: "var(--c-line)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={w.text}
                    onChange={(e) => updateWarningText(idx, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                    style={fieldStyle}
                  />
                  <button onClick={() => removeWarning(idx)} className="w-9 h-9 rounded-full flex items-center justify-center flex-none" style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }} aria-label="Xoá cảnh báo">
                    {icons.x()}
                  </button>
                </div>
                <div className="flex gap-2">
                  {(["trung bình", "cao"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateWarningSeverity(idx, s)}
                      className="flex-1 py-1.5 rounded-xl text-xs font-semibold border"
                      style={
                        w.severity === s
                          ? { background: s === "cao" ? "var(--c-danger-icon)" : "var(--c-warn-icon)", borderColor: "transparent", color: "var(--c-on-bright)" }
                          : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                      }
                    >
                      Mức độ: {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500">Chỉ định riêng theo bệnh lý (tuỳ chọn)</label>
            <button onClick={addIndication} className="text-xs font-semibold" style={{ color: "var(--c-primary)" }}>
              + Thêm chỉ định
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
            Dùng khi thuốc cần liều khác cho một bệnh lý cụ thể (VD: viêm màng não cần liều cao hơn để thấm qua hàng rào
            máu não). Gõ tên bệnh lý có sẵn hoặc một tên mới — nếu tên không khớp bệnh lý nào đang có, app sẽ tự thêm
            bệnh lý đó vào danh mục khi lưu.
          </p>
          <div className="space-y-2.5">
            {indications.map((row) => {
              const trimmedName = row.diseaseName.trim()
              const matched = trimmedName ? diseases.find((d) => d.name.trim().toLowerCase() === trimmedName.toLowerCase()) : undefined
              const isNewDisease = trimmedName.length > 0 && !matched
              const suggestions = diseases.filter(
                (d) => !indications.some((r) => r.key !== row.key && r.diseaseName.trim().toLowerCase() === d.name.trim().toLowerCase()),
              )
              return (
                <div key={row.key} className="p-3 rounded-2xl border" style={{ borderColor: "var(--c-warn-line)", background: "var(--c-warn-soft)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 mb-1 block">Tên bệnh lý</label>
                      <input
                        value={row.diseaseName}
                        onChange={(e) => updateIndicationField(row.key, "diseaseName", e.target.value)}
                        placeholder="VD: Viêm màng não vi khuẩn"
                        className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                        style={fieldStyle}
                      />
                    </div>
                    <button
                      onClick={() => removeIndication(row.key)}
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-none mt-3"
                      style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }}
                      aria-label="Xoá chỉ định"
                    >
                      {icons.x()}
                    </button>
                  </div>

                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {suggestions.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => pickIndicationDisease(row.key, d.name)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors"
                          style={
                            matched?.id === d.id
                              ? { background: "var(--c-primary)", borderColor: "var(--c-primary)", color: "var(--c-on-bright)" }
                              : { background: "var(--c-surface)", borderColor: "var(--c-warn-line)", color: "var(--c-warn)" }
                          }
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {isNewDisease && (
                    <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--c-warn-2)" }}>
                      Bệnh lý mới — khi lưu, "{trimmedName}" sẽ được tự thêm vào danh mục bệnh lý.
                    </p>
                  )}

                  <label className="text-[10px] text-slate-400 mb-1 block">Liều chuẩn riêng cho bệnh lý này (tuỳ chọn)</label>
                  <input
                    value={row.standardDose}
                    onChange={(e) => updateIndicationField(row.key, "standardDose", e.target.value)}
                    placeholder="VD: 2 g mỗi 4h — liều cao hơn để thấm qua hàng rào máu não"
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none mb-2.5"
                    style={fieldStyle}
                  />

                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-slate-400">Mức liều theo CrCl riêng (tuỳ chọn — bỏ trống để dùng mức liều chung ở trên)</label>
                    <button onClick={() => addIndicationTier(row.key)} className="text-[11px] font-semibold" style={{ color: "var(--c-primary)" }}>
                      + Thêm mức
                    </button>
                  </div>
                  {row.tiers.length > 0 && (
                    <div className="space-y-2 mb-2.5">
                      {row.tiers.map((t, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl border" style={{ borderColor: "var(--c-warn-line)", background: "var(--c-surface)" }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-400 mb-1 block">CrCl tối thiểu (mL/phút)</label>
                              <input
                                value={t.min}
                                onChange={(e) => updateIndicationTier(row.key, idx, "min", normalizeDecimalInput(e.target.value))}
                                inputMode="decimal"
                                placeholder="0"
                                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                                style={fieldStyle}
                              />
                            </div>
                            <div className="flex-[2]">
                              <label className="text-[10px] text-slate-400 mb-1 block">Nhãn hiển thị</label>
                              <input
                                value={t.label}
                                onChange={(e) => updateIndicationTier(row.key, idx, "label", e.target.value)}
                                placeholder="VD: CrCl ≥ 50"
                                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                                style={fieldStyle}
                              />
                            </div>
                            <button
                              onClick={() => removeIndicationTier(row.key, idx)}
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-none mt-3"
                              style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }}
                              aria-label="Xoá mức"
                            >
                              {icons.x()}
                            </button>
                          </div>
                          <label className="text-[10px] text-slate-400 mb-1 block">Liều</label>
                          <input
                            value={t.dose}
                            onChange={(e) => updateIndicationTier(row.key, idx, "dose", e.target.value)}
                            placeholder="VD: 2 g mỗi 4h"
                            className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                            style={fieldStyle}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="text-[10px] text-slate-400 mb-1 block">Ghi chú riêng (tuỳ chọn)</label>
                  <input
                    value={row.note}
                    onChange={(e) => updateIndicationField(row.key, "note", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={fieldStyle}
                  />
                </div>
              )
            })}
            {indications.length === 0 && (
              <p className="text-[11px] text-slate-400">Chưa có chỉ định riêng nào — bấm "+ Thêm chỉ định" nếu cần.</p>
            )}
          </div>
        </div>

        <div className="pt-2 border-t" style={{ borderColor: "var(--c-line-soft)" }}>
          <p className="text-xs font-semibold text-slate-500 mt-3 mb-1.5">Liều khi lọc máu / CRRT (tuỳ chọn)</p>
          <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
            Bỏ trống mục nào thì với bệnh nhân đang dùng phương thức đó, app sẽ nói rõ là chưa có dữ liệu — không bao giờ tự suy ra từ bậc CrCl.
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Chạy thận chu kỳ (IHD)</label>
              <input value={rrtIhd} onChange={(e) => setRrtIhd(e.target.value)} placeholder="VD: 500 mg sau mỗi buổi lọc" className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Lọc máu liên tục (CRRT) — ghi kèm tốc độ dịch thải của khuyến cáo</label>
              <input value={rrtCrrt} onChange={(e) => setRrtCrrt(e.target.value)} placeholder="VD: 1 g mỗi 8h khi Qeff ≥ 2 L/giờ" className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Lọc kéo dài chậm (SLED)</label>
              <input value={rrtSled} onChange={(e) => setRrtSled(e.target.value)} className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Lọc màng bụng (PD)</label>
              <input value={rrtPd} onChange={(e) => setRrtPd(e.target.value)} className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Ghi chú chung khi lọc máu</label>
              <textarea value={rrtNote} onChange={(e) => setRrtNote(e.target.value)} rows={2} placeholder="VD: đo nồng độ đáy trước buổi lọc thứ ba" className={fieldClass} style={fieldStyle} />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 mb-1 block">Nguồn của liều lọc máu</label>
              <input value={rrtSource} onChange={(e) => setRrtSource(e.target.value)} placeholder="VD: Phác đồ lọc máu khoa HSTC 2026" className={fieldClass} style={fieldStyle} />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t" style={{ borderColor: "var(--c-line-soft)" }}>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Nguồn dữ liệu (tuỳ chọn)</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="VD: Phác đồ ICU BV X 2026 / Sanford Guide" className={fieldClass} style={fieldStyle} />
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Rà soát lần cuối (YYYY-MM)</label>
          <input value={reviewedOn} onChange={(e) => setReviewedOn(e.target.value)} placeholder="VD: 2026-07" className={fieldClass} style={fieldStyle} />
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5">
            Bỏ trống thì thẻ thuốc sẽ hiện rõ "chưa ghi nguồn · chưa rà soát".
          </p>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Nội dung sửa được lưu ngay trên máy này, không đổi dữ liệu gốc trong app.
        </p>
      </div>

      <div className="flex-none px-6 pt-3 border-t" style={{ borderColor: "var(--c-line)", paddingBottom: "var(--nav-pad-bottom)" }}>
        <button onClick={handleSave} disabled={!canSave} className="w-full py-3.5 rounded-2xl font-semibold text-sm" style={{ background: canSave ? "var(--c-primary)" : "var(--c-muted)", color: "var(--c-on-bright)" }}>
          Lưu thay đổi
        </button>
      </div>
    </div>
  )
}

const INFUSION_CATEGORY_LABELS: Record<"inotrope" | "vasoactive" | "vasodilator" | "arrhythmia" | "electrolyte", string> = {
  inotrope: "Thêm thuốc co bóp cơ tim",
  vasoactive: "Thêm thuốc vận mạch",
  vasodilator: "Thêm thuốc giãn mạch",
  arrhythmia: "Thêm thuốc xử trí rối loạn nhịp tim",
  electrolyte: "Thêm thuốc xử trí rối loạn điện giải / chuyển hoá",
}

// Bản nháp của một liều nạp trong lúc nhập: mọi ô số giữ ở dạng chuỗi để gõ dở dang ("0,", "1.")
// không bị nhảy về NaN giữa chừng, rồi mới đổi sang BolusDose khi lưu.
interface BolusDraft {
  label: string
  unit: string
  mode: "perKg" | "fixed"
  low: string
  high: string
  maxSingle: string
  over: string
  note: string
}

function emptyBolusDraft(): BolusDraft {
  return { label: "", unit: "mg", mode: "perKg", low: "", high: "", maxSingle: "", over: "", note: "" }
}

function bolusToDraft(b: BolusDose): BolusDraft {
  const perKg = b.perKgLow != null
  return {
    label: b.label,
    unit: b.unit,
    mode: perKg ? "perKg" : "fixed",
    low: String((perKg ? b.perKgLow : b.fixedLow) ?? ""),
    high: b.perKgHigh != null || b.fixedHigh != null ? String((perKg ? b.perKgHigh : b.fixedHigh) ?? "") : "",
    maxSingle: b.maxSingle != null ? String(b.maxSingle) : "",
    over: b.over ?? "",
    note: b.note ?? "",
  }
}

// null nếu bản nháp chưa đủ dùng (thiếu tên hoặc thiếu con số liều) — mục dở dang thì bỏ qua khi
// lưu chứ không sinh ra một liều nạp rỗng nằm trong thẻ thuốc.
function draftToBolus(d: BolusDraft): BolusDose | null {
  const label = d.label.trim()
  const low = parseFloat(d.low)
  if (!label || isNaN(low)) return null
  const high = parseFloat(d.high)
  const maxSingle = parseFloat(d.maxSingle)
  return {
    label,
    unit: d.unit.trim() || "mg",
    ...(d.mode === "perKg"
      ? { perKgLow: low, ...(isNaN(high) ? {} : { perKgHigh: high }) }
      : { fixedLow: low, ...(isNaN(high) ? {} : { fixedHigh: high }) }),
    ...(isNaN(maxSingle) ? {} : { maxSingle }),
    ...(d.over.trim() ? { over: d.over.trim() } : {}),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
  }
}

// Khối sửa liều nạp/bolus dùng chung cho AddInfusionScreen, AddAntibioticScreen và
// EditAntibioticScreen — trước đây chỉ AddInfusionScreen có, khiến kháng sinh cần liều nạp (vd
// Vancomycin) không có chỗ khai báo.
function BolusEditorField({ boluses, setBoluses }: { boluses: BolusDraft[]; setBoluses: (fn: (prev: BolusDraft[]) => BolusDraft[]) => void }) {
  const fieldClass = "w-full px-4 py-3 rounded-2xl text-sm border outline-none"
  const fieldStyle = { borderColor: "var(--c-line)", background: "var(--c-surface)" }
  return (
    <div className="pt-2 border-t" style={{ borderColor: "var(--c-line-soft)" }}>
      <div className="flex items-center justify-between mb-1.5 mt-3">
        <label className="text-xs font-semibold text-slate-500">Liều nạp / bolus (tuỳ chọn)</label>
        <button onClick={() => setBoluses((prev) => [...prev, emptyBolusDraft()])} className="text-xs font-semibold" style={{ color: "var(--c-primary)" }}>
          + Thêm liều nạp
        </button>
      </div>
      <div className="space-y-2">
        {boluses.map((b, idx) => {
          const set = (patch: Partial<BolusDraft>) => setBoluses((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
          return (
            <div key={idx} className="p-3 rounded-2xl border" style={{ borderColor: "var(--c-line)" }}>
              <div className="flex items-center gap-2 mb-2">
                <input
                  value={b.label}
                  onChange={(e) => set({ label: e.target.value })}
                  placeholder="VD: Liều nạp trước khi vào duy trì"
                  className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                  style={fieldStyle}
                />
                <button
                  onClick={() => setBoluses((prev) => prev.filter((_, i) => i !== idx))}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-none"
                  style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }}
                  aria-label="Xoá liều nạp"
                >
                  {icons.x()}
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                {([
                  { v: "perKg" as const, label: "Theo cân nặng (/kg)" },
                  { v: "fixed" as const, label: "Liều cố định" },
                ]).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => set({ mode: opt.v })}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                    style={
                      b.mode === opt.v
                        ? { background: "var(--c-accent)", borderColor: "var(--c-accent)", color: "var(--c-on-bright)" }
                        : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Liều{b.mode === "perKg" ? "/kg" : ""}</label>
                  <input value={b.low} onChange={(e) => set({ low: normalizeDecimalInput(e.target.value) })} inputMode="decimal" placeholder="1" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Đến (tuỳ chọn)</label>
                  <input value={b.high} onChange={(e) => set({ high: normalizeDecimalInput(e.target.value) })} inputMode="decimal" placeholder="1,5" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Đơn vị</label>
                  <input value={b.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="mg" className={fieldClass} style={fieldStyle} />
                </div>
              </div>
              {b.mode === "perKg" && (
                <div className="mt-2">
                  <label className="text-[11px] text-slate-400 mb-1 block">Không vượt quá 1 lần (tuỳ chọn)</label>
                  <input value={b.maxSingle} onChange={(e) => set({ maxSingle: normalizeDecimalInput(e.target.value) })} inputMode="decimal" placeholder="VD: 100" className={fieldClass} style={fieldStyle} />
                </div>
              )}
              <div className="mt-2">
                {/* Thời gian tiêm là thứ hay bị bỏ sót và là nguyên nhân tụt huyết áp/phản ứng truyền
                    nhanh khi nạp nhanh. */}
                <label className="text-[11px] text-slate-400 mb-1 block">Cách dùng — tiêm/truyền trong bao lâu</label>
                <input value={b.over} onChange={(e) => set({ over: e.target.value })} placeholder="VD: truyền tĩnh mạch trong 60 phút" className={fieldClass} style={fieldStyle} />
              </div>
              <div className="mt-2">
                <label className="text-[11px] text-slate-400 mb-1 block">Ghi chú (tuỳ chọn)</label>
                <input value={b.note} onChange={(e) => set({ note: e.target.value })} className={fieldClass} style={fieldStyle} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddInfusionScreen({
  category,
  initial,
  diseases,
  onSave,
  onBack,
}: {
  category: "inotrope" | "vasoactive" | "vasodilator" | "arrhythmia" | "electrolyte"
  initial?: InfusionDrug
  diseases: DiseaseEntry[]
  onSave: (d: InfusionDrug) => void
  onBack: () => void
}) {
  const isEdit = Boolean(initial)
  const [name, setName] = useState(initial?.name ?? "")
  const [route, setRoute] = useState(initial?.route ?? "")
  const [preparation, setPreparation] = useState(initial?.preparation ?? "")
  const [doseRange, setDoseRange] = useState(initial?.doseRange ?? "")
  const [note, setNote] = useState(initial?.note ?? "")
  // Bệnh lý áp dụng — giống hệt AddAntibioticScreen: chỉ TAG thuốc với bệnh lý để bước "Chỉ định"
  // nhận diện được, không sửa liều riêng theo từng bệnh lý ở màn này (đó là việc của dữ liệu dựng
  // sẵn/EditAntibioticScreen bên kháng sinh). Giữ lại đúng chỉ định đã có (kể cả liều/bolus riêng
  // của nó) khi sửa một thuốc đã có `indications` — chỉ thêm bớt theo đúng ô chọn, không xoá mất
  // override đã khai báo sẵn (vd Adrenaline: liều ngừng tim/phản vệ riêng).
  const [diseaseIds, setDiseaseIds] = useState<string[]>(() => (initial?.indications ?? []).map((i) => i.diseaseId))
  function toggleDisease(id: string) {
    setDiseaseIds((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }
  const [warnings, setWarnings] = useState<{ text: string; severity: "cao" | "trung bình" }[]>(
    (initial?.warnings ?? []).map((w) => ({ text: w.text, severity: w.severity })),
  )
  // Liều nạp / bolus. Trước đây chỉ dữ liệu dựng sẵn mới có được mục này, nên một thuốc tự nhập
  // kiểu esmolol hay magie — đúng những thuốc luôn phải nạp trước rồi mới duy trì — không có chỗ
  // nào ghi liều nạp ngoài ô "Cách pha" dạng câu chữ, và không được tính giúp theo cân nặng.
  const [boluses, setBoluses] = useState<BolusDraft[]>(() => (initial?.boluses ?? []).map(bolusToDraft))
  const [addCalc, setAddCalc] = useState(Boolean(initial?.calc))
  const [weightBased, setWeightBased] = useState(initial?.calc?.weightBased ?? true)
  const [doseUnit, setDoseUnit] = useState(initial?.calc?.doseUnit ?? "")
  const [doseMin, setDoseMin] = useState(initial?.calc ? String(initial.calc.doseMin) : "")
  const [doseMax, setDoseMax] = useState(initial?.calc ? String(initial.calc.doseMax) : "")
  const [concUnit, setConcUnit] = useState(initial?.calc?.concUnit ?? "")
  const [concDefault, setConcDefault] = useState(initial?.calc?.concDefault != null ? String(initial.calc.concDefault) : "")
  // Công thức pha ở dạng số — để bảng pha thuốc tính được chiều "mấy ống, bao nhiêu mL → nồng độ".
  const [mixVialAmount, setMixVialAmount] = useState(initial?.calc?.mix ? String(initial.calc.mix.vialAmount) : "")
  const [mixVialUnit, setMixVialUnit] = useState(initial?.calc?.mix?.vialUnit ?? "")
  const [mixVials, setMixVials] = useState(initial?.calc?.mix?.vials != null ? String(initial.calc.mix.vials) : "1")
  const [mixVolume, setMixVolume] = useState(initial?.calc?.mix ? String(initial.calc.mix.volumeMl) : "")
  // Ống dung dịch hay lọ bột — thiếu chỗ khai báo này thì bảng pha không nói được câu "rút mấy mL
  // thuốc, thêm mấy mL dung môi" cho thuốc tự nhập.
  const [mixForm, setMixForm] = useState<VialForm>(initial?.calc?.mix?.vialForm ?? "solution")
  const [mixVialVolume, setMixVialVolume] = useState(initial?.calc?.mix?.vialVolumeMl != null ? String(initial.calc.mix.vialVolumeMl) : "")
  const [mixReconstitute, setMixReconstitute] = useState(initial?.calc?.mix?.reconstituteMl != null ? String(initial.calc.mix.reconstituteMl) : "")
  const [mixDisplacement, setMixDisplacement] = useState(initial?.calc?.mix?.displacementMl != null ? String(initial.calc.mix.displacementMl) : "")
  // Nguồn và ngày rà soát: bỏ trống thì thẻ thuốc sẽ hiện rõ "chưa ghi nguồn · chưa rà soát".
  const [source, setSource] = useState(initial?.source ?? "")
  const [reviewedOn, setReviewedOn] = useState(initial?.reviewedOn ?? "")

  // Kiểm tra ngay lúc nhập: nếu hai đơn vị không đọc được hoặc không quy đổi được cho nhau thì máy
  // tính sẽ không ra kết quả — chặn lưu ở đây tốt hơn là để người dùng phát hiện lúc đang cấp cứu.
  const unitProblem = useMemo(() => {
    if (!addCalc) return null
    if (!doseUnit.trim() || !concUnit.trim()) return null
    const u = parseDoseUnit(doseUnit.trim())
    if (!u) return `Đơn vị liều "${doseUnit.trim()}" không đọc được — phải có dạng <đơn vị>/phút, <đơn vị>/giờ, hoặc kèm /kg.`
    if (!concUnit.trim().includes("/")) return `Đơn vị nồng độ "${concUnit.trim()}" phải có dạng <đơn vị>/mL.`
    if (massFactor(u.mass, massOfConcUnit(concUnit.trim())) == null) {
      return `Không quy đổi được "${u.mass}" của liều sang "${massOfConcUnit(concUnit.trim())}" của nồng độ — hai đơn vị phải cùng họ (mcg/mg/g) hoặc trùng nhau.`
    }
    return null
  }, [addCalc, doseUnit, concUnit])

  const calcValid = doseUnit.trim() && concUnit.trim() && doseMin.trim() && doseMax.trim() && !unitProblem
  const canSave = name.trim().length > 0 && route.trim().length > 0 && doseRange.trim().length > 0 && (!addCalc || Boolean(calcValid))

  function updateWarningText(idx: number, value: string) {
    setWarnings((prev) => prev.map((w, i) => (i === idx ? { ...w, text: value } : w)))
  }
  function updateWarningSeverity(idx: number, severity: "cao" | "trung bình") {
    setWarnings((prev) => prev.map((w, i) => (i === idx ? { ...w, severity } : w)))
  }
  function addWarning() {
    setWarnings((prev) => [...prev, { text: "", severity: "trung bình" }])
  }
  function removeWarning(idx: number) {
    setWarnings((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSave() {
    if (!canSave) return
    const calc: InfusionCalcConfig | undefined = addCalc
      ? {
          weightBased,
          doseUnit: doseUnit.trim(),
          doseMin: parseFloat(doseMin),
          doseMax: parseFloat(doseMax),
          concUnit: concUnit.trim(),
          concDefault: concDefault.trim() ? parseFloat(concDefault) : undefined,
          // doseTimeBasis suy ra từ chính đơn vị liều (".../phút" hay ".../giờ") nên không còn ô
          // nhập riêng; vẫn ghi vào dữ liệu để file sao lưu cũ/mới cùng hình dạng.
          doseTimeBasis: parseDoseUnit(doseUnit.trim())?.per ?? "phút",
          mix:
            mixVialAmount.trim() && mixVolume.trim()
              ? {
                  // Giữ lại các trường không có ô nhập ở màn này (dung môi, hạn dùng sau pha, ngưỡng
                  // nồng độ...) khi SỬA một thuốc dựng sẵn — trước đây sửa hàm lượng ống một cái là
                  // xoá sạch phần dữ liệu đó mà không báo gì.
                  ...(initial?.calc?.mix ?? {}),
                  vialAmount: parseFloat(mixVialAmount),
                  vialUnit: mixVialUnit.trim() || massOfConcUnit(concUnit.trim()),
                  vials: mixVials.trim() ? parseFloat(mixVials) : 1,
                  volumeMl: parseFloat(mixVolume),
                  vialForm: mixForm,
                  vialVolumeMl: mixForm === "solution" && mixVialVolume.trim() ? parseFloat(mixVialVolume) : undefined,
                  reconstituteMl: mixForm === "powder" && mixReconstitute.trim() ? parseFloat(mixReconstitute) : undefined,
                  displacementMl: mixForm === "powder" && mixDisplacement.trim() ? parseFloat(mixDisplacement) : undefined,
                }
              : undefined,
        }
      : undefined
    const cleanedWarnings: AntibioticWarning[] = warnings.filter((w) => w.text.trim()).map((w) => ({ text: w.text.trim(), severity: w.severity }))
    const cleanedBoluses = boluses.map(draftToBolus).filter((b): b is BolusDose => b != null)
    // Giữ nguyên chỉ định đã có (kể cả liều/bolus riêng của nó, vd Adrenaline) nếu vẫn còn được
    // chọn; chỉ định MỚI bấm chọn thì thêm bản trống (chưa có liều riêng, dùng liều chung của thuốc).
    const indications: InfusionIndicationDose[] | undefined =
      diseaseIds.length > 0
        ? diseaseIds.map((diseaseId) => initial?.indications?.find((i) => i.diseaseId === diseaseId) ?? { diseaseId })
        : undefined
    const savedDrug: InfusionDrug = {
      ...(initial ?? {}),
      id: initial ? initial.id : `custom-${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      route: route.trim(),
      preparation: preparation.trim() || "Pha theo nồng độ chuẩn đang dùng.",
      doseRange: doseRange.trim(),
      note: note.trim() || undefined,
      warnings: cleanedWarnings.length > 0 ? cleanedWarnings : undefined,
      boluses: cleanedBoluses.length > 0 ? cleanedBoluses : undefined,
      indications,
      calc,
      source: source.trim() || undefined,
      reviewedOn: reviewedOn.trim() || undefined,
      isCustom: true,
    }
    onSave(savedDrug)
  }

  const fieldClass = "w-full px-4 py-3 rounded-2xl text-sm border outline-none"
  const fieldStyle = { borderColor: "var(--c-line)", background: "var(--c-surface)" }

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--c-line)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-900">
          {isEdit ? `Sửa: ${initial?.name}` : INFUSION_CATEGORY_LABELS[category]}
        </span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tên thuốc</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Isoprenaline" className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Đường dùng</label>
          <input
            value={route}
            onChange={(e) => setRoute(e.target.value)}
            placeholder="VD: Truyền tĩnh mạch qua bơm tiêm điện (BTĐ)"
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Bệnh lý áp dụng (tuỳ chọn)</label>
          <div className="flex flex-wrap gap-2">
            {diseases.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDisease(d.id)}
                className="px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors"
                style={
                  diseaseIds.includes(d.id)
                    ? { background: "var(--c-primary-soft)", borderColor: "var(--c-primary)", color: "var(--c-primary)" }
                    : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                }
              >
                {d.name}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Chọn thì màn chọn thuốc hiện thêm bước "Chỉ định" cho thuốc này. Không chọn = thuốc dùng chung, không gắn với bệnh lý cụ thể nào.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cách pha (tuỳ chọn)</label>
          <textarea
            value={preparation}
            onChange={(e) => setPreparation(e.target.value)}
            placeholder="VD: Pha 1 ống với Natri Clorid 0,9% vừa đủ 50 mL..."
            rows={3}
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Khoảng liều (mô tả)</label>
          <input value={doseRange} onChange={(e) => setDoseRange(e.target.value)} placeholder="VD: 0,05–0,5 mcg/kg/phút, chỉnh theo đáp ứng" className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Ghi chú (tuỳ chọn)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} style={fieldStyle} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500">Cảnh báo (tuỳ chọn)</label>
            <button onClick={addWarning} className="text-xs font-semibold" style={{ color: "var(--c-primary)" }}>
              + Thêm cảnh báo
            </button>
          </div>
          <div className="space-y-2">
            {warnings.map((w, idx) => (
              <div key={idx} className="p-3 rounded-2xl border" style={{ borderColor: "var(--c-line)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    value={w.text}
                    onChange={(e) => updateWarningText(idx, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                    style={fieldStyle}
                  />
                  <button onClick={() => removeWarning(idx)} className="w-9 h-9 rounded-full flex items-center justify-center flex-none" style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }} aria-label="Xoá cảnh báo">
                    {icons.x()}
                  </button>
                </div>
                <div className="flex gap-2">
                  {(["trung bình", "cao"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateWarningSeverity(idx, s)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                      style={
                        w.severity === s
                          ? { background: s === "cao" ? "var(--c-danger-icon)" : "var(--c-warn-icon)", borderColor: "transparent", color: "var(--c-on-bright)" }
                          : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                      }
                    >
                      Mức độ: {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liều nạp / bolus — amiodarone, magie, lidocaine, esmolol đều phải nạp trước rồi mới duy
            trì, và nhân nhẩm mg/kg lúc cấp cứu chính là chỗ dễ sai nhất. */}
        <BolusEditorField boluses={boluses} setBoluses={setBoluses} />

        <div className="pt-2 border-t" style={{ borderColor: "var(--c-line-soft)" }}>
          <button onClick={() => setAddCalc((v) => !v)} className="flex items-center gap-2 mt-3 mb-1">
            <span
              className="w-9 h-5 rounded-full relative flex-none transition-colors"
              style={{ background: addCalc ? "var(--c-primary)" : "var(--c-line)" }}
            >
              {/* `left-0` là bắt buộc, không phải cho đẹp: thiếu nó thì vị trí tĩnh của nút tròn được
                  tính theo `text-align: center` mà thẻ <button> áp cho cả cụm, tức là lệch sẵn 18px
                  vào giữa track. Cộng thêm translateX(18px) lúc bật, nút tròn văng hẳn ra ngoài
                  track và đè lên dòng chữ bên cạnh. */}
              <span
                className="absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: addCalc ? "translateX(18px)" : "translateX(2px)" }}
              />
            </span>
            <span className="text-xs font-semibold text-slate-700">Thêm máy tính tốc độ truyền (mL/giờ)</span>
          </button>

          {addCalc && (
            <div className="space-y-2.5 mt-3 fade-in">
              <div className="flex gap-2">
                {(
                  [
                    { v: true, label: "Tính theo cân nặng" },
                    { v: false, label: "Liều cố định (không theo cân nặng)" },
                  ]
                ).map((opt) => (
                  <button
                    key={String(opt.v)}
                    onClick={() => setWeightBased(opt.v)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                    style={
                      weightBased === opt.v
                        ? { background: "var(--c-accent)", borderColor: "var(--c-accent)", color: "var(--c-on-bright)" }
                        : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Chọn nhanh đơn vị liều. Máy tính đọc trực tiếp chuỗi này để biết đơn vị lượng
                  thuốc, có theo cân nặng hay không, và tính theo phút hay giờ — nên gõ tay dễ sai
                  (vd "mcg/kg/min" tiếng Anh sẽ không đọc được). Vẫn cho sửa tay bên dưới cho các
                  đơn vị lạ, kèm kiểm tra định dạng ngay tại chỗ. */}
              <div>
                <label className="text-[11px] text-slate-400 mb-1.5 block">Đơn vị liều</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_DOSE_UNITS.map((u) => (
                    <button
                      key={u}
                      onClick={() => {
                        setDoseUnit(u)
                        setWeightBased(u.includes("/kg"))
                      }}
                      className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold border whitespace-nowrap"
                      style={
                        doseUnit === u
                          ? { background: "var(--c-primary)", borderColor: "var(--c-primary)", color: "var(--c-on-bright)" }
                          : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                      }
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Đơn vị liều (sửa tay nếu cần)</label>
                  <input value={doseUnit} onChange={(e) => setDoseUnit(e.target.value)} placeholder="mcg/kg/phút" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Đơn vị nồng độ</label>
                  <input value={concUnit} onChange={(e) => setConcUnit(e.target.value)} placeholder="mg/mL" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Liều tối thiểu gợi ý</label>
                  <input value={doseMin} onChange={(e) => setDoseMin(normalizeDecimalInput(e.target.value))} inputMode="decimal" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Liều tối đa gợi ý</label>
                  <input value={doseMax} onChange={(e) => setDoseMax(normalizeDecimalInput(e.target.value))} inputMode="decimal" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Nồng độ pha mặc định (tuỳ chọn)</label>
                  <input value={concDefault} onChange={(e) => setConcDefault(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="Để trống nếu tuỳ khoa" className={fieldClass} style={fieldStyle} />
                </div>
              </div>

              {/* Công thức pha dạng số — có phần này thì bảng "ống ⇄ nồng độ" mới tính giúp được */}
              <p className="text-[11px] font-semibold text-slate-500 mt-1">Công thức pha chuẩn (tuỳ chọn)</p>
              <div className="flex gap-2">
                {([
                  { v: "solution" as VialForm, label: "Ống dung dịch" },
                  { v: "powder" as VialForm, label: "Lọ bột" },
                ]).map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setMixForm(opt.v)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold border"
                    style={
                      mixForm === opt.v
                        ? { background: "var(--c-accent)", borderColor: "var(--c-accent)", color: "var(--c-on-bright)" }
                        : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Hàm lượng 1 ống/lọ</label>
                  <input value={mixVialAmount} onChange={(e) => setMixVialAmount(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 250" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Đơn vị của ống</label>
                  <input value={mixVialUnit} onChange={(e) => setMixVialUnit(e.target.value)} placeholder="mg" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Số ống của công thức chuẩn</label>
                  <input value={mixVials} onChange={(e) => setMixVials(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="1" className={fieldClass} style={fieldStyle} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Pha vừa đủ (mL)</label>
                  <input value={mixVolume} onChange={(e) => setMixVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 50" className={fieldClass} style={fieldStyle} />
                </div>
                {mixForm === "solution" && (
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Thể tích 1 ống (mL)</label>
                    <input value={mixVialVolume} onChange={(e) => setMixVialVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 20" className={fieldClass} style={fieldStyle} />
                  </div>
                )}
              </div>
              {/* "Thể tích bột tăng sau pha" dài hơn hẳn "Pha ban đầu với" — ghép chung một hàng 2
                  cột thì nhãn dài xuống 2 dòng còn nhãn ngắn chỉ 1 dòng, đẩy lệch ô nhập. Mỗi ô một
                  hàng riêng, rộng hết cỡ, để nhãn dài nào cũng chỉ cần 1 dòng. */}
              {mixForm === "powder" && (
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Pha ban đầu với (mL/lọ)</label>
                    <input value={mixReconstitute} onChange={(e) => setMixReconstitute(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 10" className={fieldClass} style={fieldStyle} />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-1 block">Thể tích bột tăng sau pha (mL/lọ)</label>
                    <input value={mixDisplacement} onChange={(e) => setMixDisplacement(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 0,7" className={fieldClass} style={fieldStyle} />
                  </div>
                </div>
              )}

              {unitProblem ? (
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--c-danger-icon)" }}>
                  {unitProblem}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Đơn vị liều phải kết thúc bằng <b>/phút</b> hoặc <b>/giờ</b>, thêm <b>/kg</b> nếu tính theo cân nặng. Đơn vị nồng độ dạng <b>&lt;đơn vị&gt;/mL</b>. Hệ số quy đổi không cần khai báo nữa — máy tính tự suy ra từ hai đơn vị này.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="pt-2 border-t" style={{ borderColor: "var(--c-line-soft)" }}>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Nguồn dữ liệu (tuỳ chọn)</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="VD: Phác đồ ICU BV X 2026 / Sanford Guide / tờ HDSD" className={fieldClass} style={fieldStyle} />
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block mt-3">Rà soát lần cuối (YYYY-MM)</label>
          <input value={reviewedOn} onChange={(e) => setReviewedOn(e.target.value)} placeholder="VD: 2026-07" className={fieldClass} style={fieldStyle} />
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5">
            Bỏ trống thì thẻ thuốc sẽ hiện rõ "chưa ghi nguồn · chưa rà soát" — để sau này biết mục nào còn phải kiểm chứng lại.
          </p>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          {isEdit
            ? "Nội dung sửa được lưu ngay trên máy này, không đổi dữ liệu gốc trong app."
            : "Mục tự nhập được lưu trên máy (trình duyệt của bạn) nên vẫn còn sau khi tắt/mở lại app."}
        </p>
      </div>

      <div className="flex-none px-6 pt-3 border-t" style={{ borderColor: "var(--c-line)", paddingBottom: "var(--nav-pad-bottom)" }}>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm"
          style={{ background: canSave ? "var(--c-primary)" : "var(--c-muted)", color: "var(--c-on-bright)" }}
        >
          {isEdit ? "Lưu thay đổi" : "Lưu thuốc"}
        </button>
      </div>
    </div>
  )
}

function DataSyncScreen({
  customArticles,
  customAntibiotics,
  customDiseases,
  customInotropes,
  customVasoactives,
  customVasodilators,
  customArrhythmia,
  customElectrolytes,
  customEcgLessons,
  customFlashcards,
  boards,
  activeBoardId,
  onImport,
  onBack,
}: {
  customArticles: Article[]
  customAntibiotics: Antibiotic[]
  customDiseases: DiseaseEntry[]
  customInotropes: InfusionDrug[]
  customVasoactives: InfusionDrug[]
  customVasodilators: InfusionDrug[]
  customArrhythmia: InfusionDrug[]
  customElectrolytes: InfusionDrug[]
  customEcgLessons: EcgLesson[]
  customFlashcards: FlashCard[]
  boards: MindBoard[]
  activeBoardId: string
  onImport: (data: {
    articles: Article[]
    antibiotics: Antibiotic[]
    diseases: DiseaseEntry[]
    inotropes: InfusionDrug[]
    vasoactives: InfusionDrug[]
    vasodilators: InfusionDrug[]
    antiarrhythmics: InfusionDrug[]
    electrolytes: InfusionDrug[]
    ecgLessons: EcgLesson[]
    flashcards: FlashCard[]
    mindmapBoards: { board: MindBoard; mindmap: MindmapData }[]
    wardRecipes: WardRecipe[]
  }) => void
  onBack: () => void
}) {
  const [status, setStatus] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Công thức pha (bảng "Cách dùng"/"Đường dùng" người dùng tự chỉnh mỗi thuốc) đọc thẳng từ
  // localStorage — KHÔNG được quên trong bản sao lưu, vì đây chính là dữ liệu tốn công nhập nhất
  // (mỗi khoa một kiểu pha) và trước đây bị bỏ sót hoàn toàn khỏi "Xuất file"/"Nhập file".
  const wardRecipesByDrug = loadWardRecipes()
  const wardRecipeCount = Object.values(wardRecipesByDrug).reduce((n, list) => n + list.length, 0)

  const totalCount =
    customArticles.length +
    customAntibiotics.length +
    customDiseases.length +
    customInotropes.length +
    customVasoactives.length +
    customVasodilators.length +
    customArrhythmia.length +
    customElectrolytes.length +
    customEcgLessons.length +
    customFlashcards.length +
    wardRecipeCount

  // Đọc dữ liệu THẬT của TỪNG bảng trực tiếp từ IndexedDB ngay lúc xuất, thay vì giữ sẵn tất cả các
  // bảng trong bộ nhớ suốt lúc dùng app — phần lớn thời gian chỉ một bảng đang mở là cần tới.
  async function handleExport() {
    setExporting(true)
    try {
      const mindmapBoards = await Promise.all(boards.map(async (board) => ({ board, mindmap: await loadMindmap(board.id) })))
      const payload = {
        app: "drtrong",
        version: 2,
        exportedAt: new Date().toISOString(),
        data: {
          articles: customArticles,
          antibiotics: customAntibiotics,
          diseases: customDiseases,
          inotropes: customInotropes,
          vasoactives: customVasoactives,
          vasodilators: customVasodilators,
          antiarrhythmics: customArrhythmia,
          electrolytes: customElectrolytes,
          ecgLessons: customEcgLessons,
          flashcards: customFlashcards,
          mindmapBoards,
          wardRecipes: Object.values(wardRecipesByDrug).flat(),
        },
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const stamp = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `drtrong-du-lieu-${stamp}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      markBackupDone()
      setStatus(`Đã xuất ${totalCount} mục (kể cả ${wardRecipeCount} công thức pha) + ${boards.length} bảng sơ đồ tư duy ra file.`)
    } finally {
      setExporting(false)
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        // Hỗ trợ cả file export chuẩn ({ data: {...} }) lẫn file JSON thô { articles, antibiotics, ... }
        const data = parsed && typeof parsed === "object" && "data" in parsed ? (parsed as { data: unknown }).data : parsed
        const d = (data ?? {}) as Record<string, unknown>
        const articles: Article[] = Array.isArray(d.articles) ? (d.articles as Article[]) : []
        const antibiotics: Antibiotic[] = Array.isArray(d.antibiotics) ? (d.antibiotics as Antibiotic[]) : []
        const diseases: DiseaseEntry[] = Array.isArray(d.diseases) ? (d.diseases as DiseaseEntry[]) : []
        const inotropes: InfusionDrug[] = Array.isArray(d.inotropes) ? (d.inotropes as InfusionDrug[]) : []
        const vasoactives: InfusionDrug[] = Array.isArray(d.vasoactives) ? (d.vasoactives as InfusionDrug[]) : []
        const vasodilators: InfusionDrug[] = Array.isArray(d.vasodilators) ? (d.vasodilators as InfusionDrug[]) : []
        const antiarrhythmics: InfusionDrug[] = Array.isArray(d.antiarrhythmics) ? (d.antiarrhythmics as InfusionDrug[]) : []
        const electrolytes: InfusionDrug[] = Array.isArray(d.electrolytes) ? (d.electrolytes as InfusionDrug[]) : []
        const ecgLessons: EcgLesson[] = Array.isArray(d.ecgLessons) ? (d.ecgLessons as EcgLesson[]) : []
        const flashcards: FlashCard[] = Array.isArray(d.flashcards) ? (d.flashcards as FlashCard[]) : []
        const wardRecipes: WardRecipe[] = Array.isArray(d.wardRecipes) ? (d.wardRecipes as WardRecipe[]) : []

        // Sơ đồ tư duy: file mới (từ khi có nhiều bảng) có `mindmapBoards` — mảng {board, mindmap},
        // mỗi bảng nhập vào đúng bảng cùng id trên máy (hoặc tạo bảng mới nếu chưa từng có). File cũ
        // hơn (trước khi có nhiều bảng) chỉ có `mindmap` — không biết id bảng gốc, nên gộp vào bảng
        // ĐANG MỞ trên máy này, giống hành vi "một bảng duy nhất" trước đây.
        let mindmapBoards: { board: MindBoard; mindmap: MindmapData }[] = []
        if (Array.isArray(d.mindmapBoards)) {
          mindmapBoards = (d.mindmapBoards as unknown[])
            .map((row) => row as { board?: MindBoard; mindmap?: { nodes?: unknown; edges?: unknown } })
            .filter(
              (row): row is { board: MindBoard; mindmap: MindmapData } =>
                !!row.board &&
                typeof row.board.id === "string" &&
                !!row.mindmap &&
                Array.isArray(row.mindmap.nodes) &&
                Array.isArray(row.mindmap.edges),
            )
        } else {
          const rawMindmap = d.mindmap as { nodes?: unknown; edges?: unknown } | undefined
          if (rawMindmap && Array.isArray(rawMindmap.nodes) && Array.isArray(rawMindmap.edges)) {
            const targetBoard = boards.find((b) => b.id === activeBoardId) ?? boards[0]
            if (targetBoard) mindmapBoards = [{ board: targetBoard, mindmap: rawMindmap as MindmapData }]
          }
        }

        const count =
          articles.length +
          antibiotics.length +
          diseases.length +
          inotropes.length +
          vasoactives.length +
          vasodilators.length +
          antiarrhythmics.length +
          electrolytes.length +
          ecgLessons.length +
          flashcards.length +
          wardRecipes.length
        if (count === 0 && mindmapBoards.length === 0) {
          setStatus("Không tìm thấy dữ liệu hợp lệ trong file này.")
          return
        }
        onImport({ articles, antibiotics, diseases, inotropes, vasoactives, vasodilators, antiarrhythmics, electrolytes, ecgLessons, flashcards, mindmapBoards, wardRecipes })
        setStatus(
          `Đã nhập ${count} mục${wardRecipes.length ? ` (kể cả ${wardRecipes.length} công thức pha)` : ""}${mindmapBoards.length ? ` + ${mindmapBoards.length} bảng sơ đồ tư duy` : ""} (gộp theo id — mục trùng id được cập nhật, mục hiện có không bị mất).`,
        )
      } catch {
        setStatus("File không đọc được — cần đúng định dạng JSON đã xuất từ app này.")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--c-line)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-900">Đồng bộ dữ liệu</span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-5">
        <div className="p-4 rounded-2xl border" style={{ borderColor: "var(--c-primary-line)", background: "var(--c-primary-soft)" }}>
          <p className="text-sm text-slate-700 leading-relaxed">
            Mục bạn tự nhập (bài viết kèm ảnh chèn trong bài, kháng sinh, các thuốc truyền trong "Dùng thuốc", công thức pha riêng đã lưu cho từng thuốc, thẻ ghi nhớ, bài học ECG, và cả nét vẽ tay trên Sơ đồ tư duy) được lưu ngay trên máy này, không qua máy chủ nào. Dùng "Xuất file" để sao lưu hoặc chuyển sang thiết bị khác, rồi "Nhập file" trên thiết bị kia để khôi phục.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Hiện có trên máy này</p>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Bài viết", count: customArticles.length },
              { label: "Kháng sinh", count: customAntibiotics.length },
              { label: "Bệnh lý tự thêm", count: customDiseases.length },
              { label: "Co bóp cơ tim", count: customInotropes.length },
              { label: "Vận mạch", count: customVasoactives.length },
              { label: "Giãn mạch", count: customVasodilators.length },
              { label: "Rối loạn nhịp tim", count: customArrhythmia.length },
              { label: "Điện giải / chuyển hoá", count: customElectrolytes.length },
              { label: "Công thức pha đã lưu", count: wardRecipeCount },
              { label: "Bài học ECG", count: customEcgLessons.length },
              { label: "Thẻ ghi nhớ tự nhập", count: customFlashcards.length },
              { label: "Bảng Sơ đồ tư duy", count: boards.length },
            ].map((row) => (
              <div key={row.label} className="p-3 rounded-xl border" style={{ borderColor: "var(--c-line)" }}>
                <p className="text-lg font-bold text-slate-900">{row.count}</p>
                <p className="text-xs text-slate-500">{row.label}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-60"
          style={{ background: "var(--c-primary)", color: "var(--c-on-bright)" }}
        >
          {icons.download()}
          {exporting ? "Đang xuất…" : "Xuất file sao lưu (.json)"}
        </button>

        <button
          onClick={handleImportClick}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm border"
          style={{ borderColor: "var(--c-primary)", color: "var(--c-primary)", background: "var(--c-surface)" }}
        >
          {icons.upload()}
          Nhập file đã sao lưu
        </button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChange} className="hidden" />

        {status && <p className="text-xs text-center leading-relaxed" style={{ color: "var(--c-accent)" }}>{status}</p>}

        <p className="text-xs text-slate-400 leading-relaxed">
          Nhập file sẽ gộp theo id: mục đã có cùng id được cập nhật theo file mới, mục id chưa có sẽ được thêm vào — dữ liệu hiện có trên máy không bị xoá. Sơ đồ tư duy được gộp theo node/cạnh, không thay thế toàn bộ.
        </p>
      </div>
    </div>
  )
}

// Màn ĐỌC bài tự nhập, dựng theo cùng khuôn với ArticleScreen (bài dựng sẵn) để bài mình viết đọc
// lên cũng ra dáng một bài tra cứu kiểu UpToDate: đầu bài có chuyên khoa / độ khó / thời gian đọc,
// mục lục gập mở tự sinh từ các dòng tiêu đề, nội dung chia mục có đường kẻ, và danh sách bài liên
// quan ở cuối.
function CustomEntryScreen({
  article,
  relatedArticles,
  onEdit,
  onDelete,
  onOpenLink,
  onOpenArticle,
  onBack,
}: {
  article: Article | undefined
  relatedArticles: Article[]
  onEdit: (a: Article) => void
  onDelete: (id: string) => void
  onOpenLink: (target: string) => void
  onOpenArticle: (a: Article) => void
  onBack: () => void
}) {
  const [tocOpen, setTocOpen] = useState(false)
  const headingEls = useRef(new Map<string, HTMLElement>())

  const blocks = useMemo(() => (article ? articleBlocks(article) : []), [article])
  const toc = useMemo(() => blocksToToc(blocks), [blocks])
  const wordCount = useMemo(() => {
    const plain = blocksToPlainText(blocks).trim()
    return plain ? plain.split(/\s+/).length : 0
  }, [blocks])

  if (!article) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-5">
        <p className="text-sm text-slate-500">Không tìm thấy mục này.</p>
        <button onClick={onBack} className="text-sm font-semibold" style={{ color: "var(--c-primary)" }}>
          Quay lại
        </button>
      </div>
    )
  }

  const related = relatedArticles.filter((a) => a.id !== article.id).slice(0, 3)

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--c-line)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(article)}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "var(--c-primary-soft)", color: "var(--c-primary)" }}
            aria-label="Sửa mục này"
          >
            {icons.edit()}
          </button>
          <ConfirmIconButton
            onConfirm={() => onDelete(article.id)}
            ariaLabel="Xoá mục này"
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }}
          />
        </div>
      </div>

      <div className="scroll-ios flex-1 pb-10">
        <div className="px-6 pt-6">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--c-primary)" }}>
            {article.specialty}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 leading-tight">{article.title}</h1>
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            <DifficultyBadge level={article.difficulty} />
            <span className="text-xs text-slate-400">{Math.max(1, Math.round(wordCount / 200))} phút đọc</span>
            <span className="text-xs text-slate-400">{article.lastUpdated}</span>
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {article.tags.map((t) => (
              <TagPill key={t} tag={t} />
            ))}
          </div>

          <p className="text-sm text-slate-600 mt-5 leading-relaxed">{article.excerpt}</p>
        </div>

        {/* Mục lục — chỉ hiện khi bài có ít nhất một dòng tiêu đề. Bấm một mục là cuộn tới đúng chỗ. */}
        {toc.length > 0 && (
          <div className="px-5 mt-5">
            <button
              onClick={() => setTocOpen(!tocOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border"
              style={{ borderColor: "var(--c-primary-line)", background: "var(--c-primary-soft)" }}
            >
              <span className="text-sm font-semibold" style={{ color: "var(--c-primary)" }}>
                Mục lục ({toc.length})
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--c-primary)"
                strokeWidth={2}
                className={`w-4 h-4 transition-transform ${tocOpen ? "rotate-180" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {tocOpen && (
              <div className="mt-2 rounded-2xl border overflow-hidden fade-in" style={{ borderColor: "var(--c-line)" }}>
                {toc.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTocOpen(false)
                      headingEls.current.get(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-0"
                    style={{ borderColor: "var(--c-line-soft)", background: "var(--c-surface)" }}
                  >
                    <span className="text-xs font-mono text-slate-400 w-4 flex-none">{i + 1}</span>
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-6">
          <BlockContent
            blocks={blocks}
            onOpenLink={onOpenLink}
            headingRefs={(id, el) => {
              if (el) headingEls.current.set(id, el)
              else headingEls.current.delete(id)
            }}
          />
        </div>

        {related.length > 0 && (
          <div className="px-6 mt-8">
            <h3 className="text-base font-bold text-slate-900 mb-1">Bài viết liên quan</h3>
            <p className="text-xs text-slate-400 mb-2">Cùng chuyên khoa {article.specialty}</p>
            {related.map((a) => (
              <button
                key={a.id}
                onClick={() => onOpenArticle(a)}
                className="w-full flex items-center gap-3 py-3 border-b text-left"
                style={{ borderColor: "var(--c-line-soft)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-none" style={{ background: "var(--c-line-soft)", color: "var(--c-text-muted)" }}>
                  {specialtyIcon(SPECIALTIES.find((s) => s.name === a.specialty)?.id, "w-[18px] h-[18px]")}
                </div>
                <span className="text-sm font-medium text-slate-800 flex-1 truncate">{a.title}</span>
                <span className="flex-none text-slate-300 text-lg leading-none">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ECG ──────────────────────────────────────────────────────────────────────
// Truy cập từ mục "ECG" trong "Truy cập nhanh" ở Trang chủ (không nằm trong thanh tab dưới cùng).
// Chưa có bài học dựng sẵn (ECG_LESSONS luôn rỗng) — toàn bộ nội dung do người dùng tự nhập, lưu
// bằng IndexedDB (useEcgLessons/ecgStorage.ts) vì có thể kèm ảnh.

function EcgScreen({
  lessons,
  onNavigate,
  onBack,
}: {
  lessons: EcgLesson[]
  onNavigate: (s: Screen, id?: string) => void
  onBack: () => void
}) {
  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--c-line)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-900">ECG</span>
        <button
          onClick={() => onNavigate("addEcg")}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "var(--c-primary-soft)", color: "var(--c-primary)" }}
          aria-label="Thêm bài học ECG"
        >
          {icons.plus()}
        </button>
      </div>

      <div className="scroll-ios flex-1 px-5 pt-5 pb-8">
        {lessons.length === 0 ? (
          <div className="flex flex-col items-center text-center gap-3 pt-16 px-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--c-primary-soft)", color: "var(--c-primary)" }}>
              {icons.ecg()}
            </div>
            <p className="font-bold text-slate-900 text-[15px]">Chưa có bài học ECG nào</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Nhấn nút "+" ở trên để tạo bài học đầu tiên — có thể kèm ảnh chụp bản ghi ECG.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {lessons.map((l) => {
              // Ảnh đại diện & số ảnh lấy từ nội dung dạng block (ảnh có thể nằm xen giữa các dòng
              // chữ), ecgBlocks() lo luôn phần bài cũ vốn để ảnh trong mảng `images` riêng.
              const lessonBlocks = ecgBlocks(l)
              const thumb = firstImageUrl(lessonBlocks)
              const imageCount = countImages(lessonBlocks)
              return (
              <button
                key={l.id}
                onClick={() => onNavigate("ecgDetail", l.id)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border card-press text-left"
                style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}
              >
                <div
                  className="flex-none w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ background: "var(--c-line-soft)", color: "var(--c-muted)" }}
                >
                  {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : icons.ecg()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-bold text-slate-900 text-[14px] truncate">{l.title}</p>
                    {l.isCustom && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-none" style={{ background: "var(--c-green-soft)", color: "var(--c-green)" }}>
                        Tự nhập
                      </span>
                    )}
                  </div>
                  {l.summary && <p className="text-xs text-slate-400 truncate mt-0.5">{l.summary}</p>}
                  {l.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {l.tags.slice(0, 3).map((t) => (
                        <TagPill key={t} tag={t} />
                      ))}
                    </div>
                  )}
                </div>
                {imageCount > 0 && (
                  <span className="flex-none text-[10px] font-semibold text-slate-400">{imageCount} ảnh</span>
                )}
              </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function EcgDetailScreen({
  lesson,
  onEdit,
  onDelete,
  onOpenLink,
  onBack,
}: {
  lesson: EcgLesson | undefined
  onEdit: (l: EcgLesson) => void
  onDelete: (id: string) => void
  onOpenLink: (target: string) => void
  onBack: () => void
}) {
  if (!lesson) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 px-5">
        <p className="text-sm text-slate-500">Không tìm thấy bài học này.</p>
        <button onClick={onBack} className="text-sm font-semibold" style={{ color: "var(--c-primary)" }}>
          Quay lại
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--c-line)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
        {lesson.isCustom ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(lesson)}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "var(--c-primary-soft)", color: "var(--c-primary)" }}
              aria-label="Sửa bài học"
            >
              {icons.edit()}
            </button>
            <ConfirmIconButton
              onConfirm={() => onDelete(lesson.id)}
              ariaLabel="Xoá bài học"
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }}
            />
          </div>
        ) : (
          <span className="w-8" />
        )}
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-10">
        <h1 className="text-2xl font-bold text-slate-900 leading-tight">{lesson.title}</h1>
        {lesson.tags.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {lesson.tags.map((t) => (
              <TagPill key={t} tag={t} />
            ))}
          </div>
        )}
        {lesson.summary && <p className="text-sm text-slate-600 mt-4 leading-relaxed">{lesson.summary}</p>}

        <BlockContent blocks={ecgBlocks(lesson)} onOpenLink={onOpenLink} />
      </div>
    </div>
  )
}

// Màn soạn bài học ECG — dùng cho cả TẠO MỚI và SỬA (truyền `initial`). Nội dung chi tiết soạn tự
// do theo block: chữ và ảnh bản ghi ECG xen kẽ nhau tuỳ ý (xem components/BlockEditor.tsx).
function AddEcgScreen({
  initial,
  linkTargets,
  onSave,
  onBack,
}: {
  initial?: EcgLesson
  linkTargets: LinkTarget[]
  onSave: (l: EcgLesson) => void
  onBack: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [tagsText, setTagsText] = useState(initial?.tags.join(", ") ?? "")
  const [summary, setSummary] = useState(initial?.summary ?? "")
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => blocksForEditing(initial ? ecgBlocks(initial) : []))

  const canSave = title.trim().length > 0

  function handleSave() {
    if (!canSave) return
    const lesson: EcgLesson = {
      id: initial?.id ?? `custom-ecg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      summary: summary.trim() || undefined,
      blocks: cleanBlocks(blocks),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      isCustom: true,
    }
    onSave(lesson)
  }

  const fieldClass = "w-full px-4 py-3 rounded-2xl text-sm border outline-none"
  const fieldStyle = { borderColor: "var(--c-line)", background: "var(--c-surface)" }

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--c-line)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary)" }}>
          {icons.back()}
          Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-900">{initial ? "Sửa bài học ECG" : "Bài học ECG mới"}</span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tiêu đề</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Rung nhĩ đáp ứng thất nhanh"
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Thẻ tag (cách nhau bằng dấu phẩy)</label>
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="VD: rối loạn nhịp, cấp cứu"
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tóm tắt ngắn</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="1–2 câu tóm tắt hiển thị ở danh sách"
            rows={2}
            className={fieldClass}
            style={fieldStyle}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nội dung chi tiết</label>
          <BlockEditor blocks={blocks} onChange={setBlocks} linkTargets={linkTargets} />
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Bài học ECG được lưu trên máy (trình duyệt của bạn), kể cả ảnh, nên vẫn còn sau khi tắt/mở lại app. Dùng mục "Đồng bộ dữ liệu" ở Trang chủ nếu muốn sao lưu hoặc chuyển sang thiết bị khác.
        </p>
      </div>

      <div className="flex-none px-6 pt-3 border-t" style={{ borderColor: "var(--c-line)", paddingBottom: "var(--nav-pad-bottom)" }}>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full py-3.5 rounded-2xl font-semibold text-sm"
          style={{ background: canSave ? "var(--c-primary)" : "var(--c-muted)", color: "var(--c-on-bright)" }}
        >
          {initial ? "Lưu thay đổi" : "Lưu bài học"}
        </button>
      </div>
    </div>
  )
}

// ─── "Bệnh nhân hiện tại" — bối cảnh dùng chung cho cả tab Dùng thuốc ─────────
//
// Trước đây cân nặng phải gõ lại cho từng thẻ thuốc: bệnh nhân sốc chạy 3 vận mạch là 3 lần gõ vào
// 3 chỗ, 3 cơ hội gõ nhầm, và không có chỗ nào giữ "bệnh nhân hiện tại" để đối chiếu. Nay mọi máy
// tính liều (kháng sinh lẫn thuốc truyền) đọc chung một bộ thông số từ context này.

interface DosingContextValue {
  patient: PatientVitals
  setPatientField: <K extends keyof PatientVitals>(key: K, value: PatientVitals[K]) => void
  resetPatient: () => void
  abwKg: number | null
  heightCm: number | null
  ageYears: number | null
  crcl: number | null
  // false khi bệnh nhân có tổn thương thận cấp hoặc đang lọc máu — lúc đó con số CrCl KHÔNG được
  // dùng để chọn bậc liều.
  crclUsable: boolean
  openPatientPanel: () => void
  // Gấp khung bệnh nhân lại khi người dùng đã chuyển sang chọn thuốc. Khung này mở sẵn chiếm gần
  // 700px — trên điện thoại nghĩa là thẻ thuốc vừa chọn nằm dưới hơn hai màn hình cuộn.
  collapsePatientPanel: () => void
  running: RunningDrug[]
  pinRunning: (item: Omit<RunningDrug, "id" | "at">) => void
  unpinRunning: (id: string) => void
  setRunningLine: (id: string, line: number) => void
  logCalc: (entry: Omit<CalcLogEntry, "id" | "at" | "patient" | "weightKg">) => void
  // Công thức pha thực tế của người dùng, lưu theo từng thuốc — có thể nhiều công thức/thuốc (mỗi
  // khoa/mỗi cách pha một tiêu đề riêng) — xem lib/wardRecipes.ts.
  wardRecipes: Record<string, WardRecipe[]>
  // `id` bỏ trống = thêm công thức mới (tự sinh id); có `id` = ghi đè đúng công thức đó.
  saveWard: (recipe: Omit<WardRecipe, "savedAt" | "id"> & { id?: string }) => void
  clearWard: (drugId: string, recipeId: string) => void
}

const DosingContext = createContext<DosingContextValue | null>(null)

function useDosing(): DosingContextValue {
  const ctx = useContext(DosingContext)
  if (!ctx) throw new Error("useDosing chỉ dùng được bên trong màn hình Dùng thuốc")
  return ctx
}

// ─── Mảnh giao diện dùng chung cho màn Dùng thuốc ────────────────────────────
// Mọi tiêu đề mục, ô tìm kiếm, chip chọn thuốc và khối gấp/mở đều đi qua đây, để không còn chuyện
// mỗi chỗ một cỡ chữ và một kiểu canh lề. Xem lib/ui.ts.

function SectionLabel({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "accent" | "danger" }) {
  const color = tone === "accent" ? C.accent : tone === "danger" ? C.danger : C.muted
  return (
    <p className={`${T.label} mb-2`} style={{ color }}>
      {children}
    </p>
  )
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className={`flex items-center gap-2.5 px-3.5 h-11 ${R.pill} mb-2.5`} style={{ background: C.lineSoft }}>
      <span style={{ color: C.muted }}>{icons.search(false)}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 h-full bg-transparent  outline-none`}
      />
      {value && (
        <button onClick={() => onChange("")} className="w-8 h-8 flex items-center justify-center flex-none" style={{ color: C.muted }} aria-label="Xoá tìm kiếm">
          {icons.x()}
        </button>
      )}
    </div>
  )
}

// `index` bật hiệu ứng hiện lần lượt (lệch 28ms mỗi chip) — mắt bắt được thứ tự danh sách thay vì
// thấy cả mảng bật ra cùng lúc. Bỏ qua khi người dùng bật "Giảm chuyển động".
function Chip({
  active,
  onClick,
  children,
  tone = "primary",
  index,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  tone?: "primary" | "accent"
  index?: number
}) {
  const on = tone === "accent" ? C.accent : C.primary
  return (
    <button
      onClick={() => {
        onClick()
        tickHaptic()
      }}
      className={`${CHIP}${index != null ? " rise-in" : ""}`}
      style={{
        ...(active ? { background: on, borderColor: on, color: "#fff" } : { background: C.surface, borderColor: C.line, color: C.textSoft }),
        ...(index != null ? ({ "--i": index } as React.CSSProperties) : {}),
      }}
    >
      {children}
    </button>
  )
}

// Khối gấp/mở. Ở ICU thứ cần nhìn ngay là tốc độ bơm, không phải bốn đoạn văn cảnh báo — nên mọi
// nội dung tham khảo đều nằm sau một dòng tiêu đề gấp lại được (progressive disclosure).
// `alert` = true thì tiêu đề đổi màu để cảnh báo mức cao không bị giấu mất.
function Disclosure({
  label,
  count,
  alert,
  defaultOpen,
  children,
}: {
  label: string
  count?: number
  alert?: boolean
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const color = alert ? C.warn : C.muted
  return (
    <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: C.lineSoft }}>
      <button onClick={() => setOpen((v) => !v)} className={`w-full flex items-center justify-between gap-2 ${TAP} -my-2.5 py-2.5`}>
        <span className={T.label} style={{ color }}>
          {label}
          {count != null && count > 0 ? ` · ${count}` : ""}
        </span>
        <span className="flex-none" style={{ color, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          {icons.chevronDown()}
        </span>
      </button>
      {open && <div className="mt-2.5 fade-in">{children}</div>}
    </div>
  )
}

// Nút icon-only XOÁ VĨNH VIỄN dữ liệu đã lưu (bài viết/ECG/kháng sinh/thuốc truyền tự nhập/công
// thức pha đã lưu) — chạm lần 1 chuyển icon sang dấu cảnh báo và giữ vậy vài giây chờ chạm lần 2
// mới thực sự xoá; không chạm tiếp thì tự quay lại icon thùng rác. Khác các nút "×" xoá một DÒNG
// đang soạn dở NGAY TRONG FORM (cảnh báo, mức liều...) trước khi bấm Lưu — những dòng đó chưa từng
// được lưu nên mất đi không tốn công gì để làm lại.
const CONFIRM_ICON_RESET_MS = 2500

function ConfirmIconButton({
  onConfirm,
  ariaLabel,
  className,
  style,
}: {
  onConfirm: () => void
  ariaLabel: string
  className?: string
  style?: React.CSSProperties
}) {
  const [confirm, setConfirm] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  return (
    <button
      onClick={() => {
        if (!confirm) {
          setConfirm(true)
          tickHaptic()
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setConfirm(false), CONFIRM_ICON_RESET_MS)
          return
        }
        if (timer.current) clearTimeout(timer.current)
        setConfirm(false)
        onConfirm()
      }}
      className={className}
      style={confirm ? { background: "var(--c-danger-icon)", color: "var(--c-on-bright)" } : style}
      aria-label={confirm ? `${ariaLabel} — chạm lần nữa để xác nhận` : ariaLabel}
    >
      {confirm ? icons.alert() : icons.trash()}
    </button>
  )
}

// Hộp thông báo một kiểu duy nhất cho cả màn — trước đây mỗi chỗ tự chọn nền/viền/cỡ chữ riêng.
function Note({ tone, children }: { tone: "info" | "warn" | "danger" | "ok"; children: React.ReactNode }) {
  const map = {
    info: { bg: C.primarySoft, fg: C.primary, line: C.primaryLine },
    warn: { bg: C.warnSoft, fg: C.warn, line: C.warnLine },
    danger: { bg: C.dangerSoft, fg: C.danger, line: C.dangerLine },
    ok: { bg: C.accentSoft, fg: C.accent, line: C.accentLine },
  }[tone]
  return (
    <p className={`${T.meta} px-2.5 py-2 ${R.box} mb-2`} style={{ background: map.bg, color: map.fg, border: `1px solid ${map.line}` }}>
      {children}
    </p>
  )
}

// ─── Nguồn dữ liệu & ngày rà soát ─────────────────────────────────────────────
// Không mục nào được phép im lặng về nguồn gốc: có nguồn thì ghi rõ, chưa có thì nói thẳng là chưa
// có. Đây là cách duy nhất để người dùng biết mục nào còn hợp thời — ví dụ đích nồng độ vancomycin
// đã đổi từ "đáy 15–20 mg/L" (2009) sang AUC/MIC (đồng thuận 2020).

function formatReviewedOn(value: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(value.trim())
  return m ? `${m[2]}/${m[1]}` : value
}

function SourceLine({ item, bare }: { item: SourceInfo; bare?: boolean }) {
  const hasAny = Boolean(item.source || item.reviewedOn)
  const inner = hasAny ? (
    <p className={T.meta} style={{ color: C.textSoft }}>
      {item.source && <>Nguồn: {item.source}</>}
      {item.source && item.reviewedOn && " · "}
      {item.reviewedOn && <>Rà soát: {formatReviewedOn(item.reviewedOn)}</>}
    </p>
  ) : (
    <p className={`${T.meta} px-2.5 py-2 ${R.box}`} style={{ background: C.warnSoft, color: "var(--c-warn-3)" }}>
      Chưa ghi nguồn · chưa có ngày rà soát — bổ sung qua nút Sửa.
    </p>
  )
  if (bare) return inner
  return (
    <div className="mt-3 pt-2.5 border-t" style={{ borderColor: C.lineSoft }}>
      {inner}
    </div>
  )
}

// ─── Miễn trừ trách nhiệm ─────────────────────────────────────────────────────
// Một app tính liều thuốc vận mạch mà không có dòng nào nói rõ phạm vi sử dụng thì vừa là vấn đề an
// toàn vừa là vấn đề pháp lý cho chính tác giả. Hiện một lần bắt buộc đọc, sau đó vẫn giữ một dải
// nhắc thường trực ở đầu màn hình.

const DISCLAIMER_KEY = "drtrong:disclaimerAck"
const DISCLAIMER_VERSION = "2026-07"
const DISCLAIMER_TEXT =
  "Đây là sổ tay tra cứu nhanh cho nhân viên y tế, không thay thế phác đồ của cơ sở và tờ hướng dẫn sử dụng thuốc."

function DisclaimerGate() {
  const [ack, setAck] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISCLAIMER_KEY) === DISCLAIMER_VERSION
    } catch {
      return false
    }
  })
  if (ack) return null
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: "rgba(15,23,42,.45)" }}>
      <div className="w-full rounded-t-3xl px-6 pt-6" style={{ background: "var(--c-surface)", paddingBottom: "var(--nav-pad-bottom)" }}>
        <div className="flex items-center gap-2 mb-2" style={{ color: "var(--c-warn-2)" }}>
          {icons.alert()}
          <p className="text-[13px] font-bold">Trước khi dùng</p>
        </div>
        <p className="text-[13px] text-slate-700 leading-[1.45] mb-3">{DISCLAIMER_TEXT}</p>
        <p className="text-[11px] text-slate-500 leading-[1.45] mb-4">
          Mỗi mục đều ghi nguồn và ngày rà soát ngay trên thẻ thuốc; mục nào chưa có thì được đánh dấu rõ.
        </p>
        <button
          onClick={() => {
            try {
              localStorage.setItem(DISCLAIMER_KEY, DISCLAIMER_VERSION)
            } catch {
              // Không lưu được thì lần sau vẫn hiện lại — chấp nhận được, không chặn việc dùng app.
            }
            setAck(true)
          }}
          className="w-full py-3.5 rounded-2xl font-semibold text-[13px] mb-2"
          style={{ background: "var(--c-primary)", color: "var(--c-on-bright)" }}
        >
          Tôi đã hiểu
        </button>
      </div>
    </div>
  )
}

// Dải nhắc thường trực — rút còn MỘT dòng. Bản đầy đủ đã hiện ở màn xác nhận lần đầu; ở đây chỉ
// cần một lời nhắc không chiếm chỗ, vì nó nằm trên đầu mọi lần mở app.
function DisclaimerBar() {
  return (
    <p className={`${T.meta} px-3 py-1 ${R.pill} mx-5 mb-2 truncate`} style={{ background: C.surfaceAlt, color: C.muted }}>
      Công cụ tham khảo — luôn kiểm tra lại trước khi thực hiện.
    </p>
  )
}

// Dòng cảnh báo nhỏ cho một ô nhập (cân nặng gõ nhầm 700 kg, chiều cao 17 cm...).
function InputWarning({ text, level }: { text: string; level: "check" | "implausible" }) {
  const color = level === "implausible" ? { bg: "var(--c-danger-soft)", fg: "var(--c-danger)" } : { bg: "var(--c-warn-soft)", fg: "var(--c-warn-2)" }
  return (
    <p className="text-[11px] font-semibold leading-[1.45] mt-1 px-2 py-1 rounded-lg" style={{ background: color.bg, color: color.fg }}>
      {text}
    </p>
  )
}

// ─── Khung thông số bệnh nhân ─────────────────────────────────────────────────

// Một ô nhập trong khung bệnh nhân. Điểm chính: hàng nhãn có CHIỀU CAO CỐ ĐỊNH, nên dù ô bên cạnh
// có hay không có nút phụ, đáy các ô nhập vẫn nằm trên cùng một đường.
//
// Cảnh báo (vd "dữ liệu dành cho NGƯỜI LỚN") KHÔNG còn vẽ bên trong ô này nữa: ô nằm trong lưới 2
// cột nên bề ngang chỉ còn một nửa màn hình, câu cảnh báo dài bị bóp xuống 5-6 dòng chữ hẹp. Cảnh
// báo giờ vẽ ở PatientPanel, ngay dưới cả hàng, rộng bằng toàn bộ khung.
function PatientField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={`${T.label} h-4 flex items-end mb-1.5`} style={{ color: C.textSoft }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function PatientPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { patient, setPatientField, resetPatient, abwKg, heightCm, ageYears, crcl, crclUsable } = useDosing()
  const hasData = patientHasData(patient)

  const weightWarn = checkWeight(abwKg)
  const heightWarn = checkHeight(heightCm)
  const ageWarn = checkAge(ageYears)

  // Cân nặng dùng để ước tính CrCl: ABW nếu bình thường/thiếu cân, AdjBW nếu béo phì (ABW > 130% IBW).
  const crclWeight = useMemo(
    () => resolveDosingWeight(abwKg, heightCm, patient.sex, "adjusted"),
    [abwKg, heightCm, patient.sex],
  )

  function switchScrUnit(next: "mgdl" | "umol") {
    if (next === patient.scrUnit) return
    const s = parseFloat(patient.scr)
    if (!isNaN(s)) {
      const converted = next === "umol" ? s * SCR_UMOL_PER_MGDL : s / SCR_UMOL_PER_MGDL
      setPatientField("scr", (Math.round(converted * 100) / 100).toString())
    }
    setPatientField("scrUnit", next)
  }

  const summary = [
    abwKg != null ? `${abwKg} kg` : null,
    heightCm != null ? `${heightCm} cm` : null,
    patient.sex === "male" ? "Nam" : "Nữ",
    ageYears != null ? `${ageYears} tuổi` : null,
    crcl != null ? (crclUsable ? `CrCl ${crcl}` : `CrCl ${crcl} (không dùng được)`) : null,
    patient.rrt !== "none" ? RRT_LABELS[patient.rrt] : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="mx-5 mb-3 rounded-2xl border" style={{ borderColor: "var(--c-primary-line)", background: "var(--c-primary-soft)" }}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onToggle} className="flex-1 min-w-0 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--c-primary)" }}>
            Bệnh nhân hiện tại
          </p>
          <p className="text-[11px] text-slate-600 truncate mt-0.5">{hasData ? summary : "Chưa nhập thông số — chạm để nhập"}</p>
        </button>
        {hasData && (
          <button
            onClick={() => {
              resetPatient()
              tickHaptic()
            }}
            className="flex-none h-8 px-2.5 rounded-full text-[11px] font-bold border"
            style={{ background: "var(--c-surface)", borderColor: "var(--c-danger-line)", color: "var(--c-danger)" }}
          >
            Bệnh nhân mới
          </button>
        )}
        <button onClick={onToggle} className="flex-none w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--c-surface)", color: "var(--c-primary)" }} aria-label={open ? "Thu gọn" : "Mở rộng"}>
          <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>{icons.chevronDown()}</span>
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 fade-in">
          {/* Mọi ô đều có hàng nhãn CAO BẰNG NHAU (PatientField) nên đáy các ô nhập thẳng một đường.
              Trước đây ô Creatinin có thêm bộ chọn đơn vị nằm chung hàng nhãn, đẩy ô nhập của nó
              tụt xuống so với ô Chiều cao bên cạnh — nay bộ chọn đơn vị nằm cạnh ô nhập. */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <PatientField label="Tuổi">
              <input value={patient.age} onChange={(e) => setPatientField("age", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="tuổi" className={FIELD} style={FIELD_STYLE} />
            </PatientField>
            <PatientField label="Giới tính">
              <div className="flex gap-1.5">
                {(["male", "female"] as const).map((sVal) => (
                  <button
                    key={sVal}
                    onClick={() => {
                      setPatientField("sex", sVal)
                      tickHaptic()
                    }}
                    className={`flex-1 h-11 ${R.input} ${T.chip} border dose-press`}
                    style={
                      patient.sex === sVal
                        ? { background: C.primary, borderColor: C.primary, color: "var(--c-on-bright)" }
                        : { background: C.surface, borderColor: C.primaryLine, color: C.textSoft }
                    }
                  >
                    {sVal === "male" ? "Nam" : "Nữ"}
                  </button>
                ))}
              </div>
            </PatientField>
          </div>
          {ageWarn && ageWarn.severity !== "ok" && (
            <div className="mb-2">
              <InputWarning text={ageWarn.message} level={ageWarn.severity} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-2">
            <PatientField label="Cân nặng (kg)">
              <input value={patient.weight} onChange={(e) => setPatientField("weight", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="kg" className={FIELD} style={FIELD_STYLE} />
            </PatientField>
            <PatientField label="Chiều cao (cm)">
              <input value={patient.height} onChange={(e) => setPatientField("height", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="cm" className={FIELD} style={FIELD_STYLE} />
            </PatientField>
          </div>
          {/* Cân nặng và chiều cao có thể cùng lúc đều cảnh báo (vd trẻ em nhẹ cân, thấp) — xếp mỗi
              cảnh báo một dòng riêng, đủ rộng để đọc trọn câu thay vì bị bóp trong nửa cột. */}
          {[weightWarn, heightWarn]
            .filter((w): w is WeightCheck & { severity: "check" | "implausible" } => w != null && w.severity !== "ok")
            .map((w, i) => (
              <div key={i} className="mb-2">
                <InputWarning text={w.message} level={w.severity} />
              </div>
            ))}

            <PatientField label="Creatinin">
              <div className="flex gap-1.5">
                <input value={patient.scr} onChange={(e) => setPatientField("scr", normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="Nhập creatinin" className={FIELD} style={FIELD_STYLE} />
                {/* h-11 trên chính khung viền, không phải trên các nút bên trong — nếu không, viền
                    1px cộng thêm làm khối này cao 46px và lệch 2px so với ô nhập bên cạnh. */}
                <div className={`flex h-11 ${R.input} overflow-hidden border flex-none`} style={{ borderColor: C.primaryLine }}>
                  {(["mgdl", "umol"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => {
                        switchScrUnit(u)
                        tickHaptic()
                      }}
                      className={`px-3 h-full ${T.chip} leading-none dose-press`}
                      style={patient.scrUnit === u ? { background: C.primary, color: "var(--c-on-bright)" } : { background: C.surface, color: "var(--c-text-muted)" }}
                    >
                      {u === "mgdl" ? "mg/dL" : "µmol/L"}
                    </button>
                  ))}
                </div>
              </div>
            </PatientField>

          {/* Kết quả CrCl gói trong MỘT dải thay vì con số lớn + hai đoạn chú thích rời như trước.
              mt-3 để tách hẳn khỏi ô Creatinin phía trên — trước đây dính sát nhau vì cả hai chỉ có
              margin-bottom, không có khoảng trên. */}
          <div
            className={`flex items-center gap-3 px-3 h-14 ${R.box} mt-3 mb-2`}
            style={{ background: C.surface, border: `1px solid ${crclUsable ? C.primaryLine : C.line}` }}
          >
            <span key={crcl ?? "none"} className={`${T.metric} pop-value flex-none`} style={{ color: crclUsable ? C.primary : C.muted }}>
              {crcl != null ? crcl : "—"}
            </span>
            <div className="min-w-0">
              <p className={T.meta} style={{ color: C.textSoft }}>mL/phút · CrCl (Cockcroft-Gault)</p>
              {crclWeight.ibw != null && crclWeight.used != null && (
                <p className={`${T.meta} ${NUM} truncate`} style={{ color: C.muted }}>
                  IBW {crclWeight.ibw.toFixed(0)} kg · tính theo {crclWeight.usedLabel} {crclWeight.used.toFixed(1)} kg
                </p>
              )}
            </div>
          </div>

          {/* Chức năng thận: cờ tổn thương thận cấp và phương thức lọc gộp về MỘT hàng chip.
              "Không lọc" đứng đầu (trạng thái mặc định/phổ biến nhất) rồi mới tới AKI và các
              phương thức lọc máu — trước đây AKI đứng đầu khiến hàng chip đọc lộn thứ tự ưu tiên. */}
          <SectionLabel>Chức năng thận</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button
              onClick={() => {
                setPatientField("rrt", "none")
                tickHaptic()
              }}
              className={`${CHIP} dose-press`}
              style={
                patient.rrt === "none"
                  ? { background: C.primary, borderColor: "transparent", color: "var(--c-on-bright)" }
                  : { background: C.surface, borderColor: C.primaryLine, color: C.textSoft }
              }
            >
              {RRT_SHORT.none}
            </button>
            <button
              onClick={() => {
                setPatientField("akiUnstable", !patient.akiUnstable)
                tickHaptic()
              }}
              className={`${CHIP} dose-press`}
              style={
                patient.akiUnstable
                  ? { background: C.warnIcon, borderColor: C.warnIcon, color: "var(--c-on-bright)" }
                  : { background: C.surface, borderColor: C.primaryLine, color: C.textSoft }
              }
            >
              AKI
            </button>
            {(Object.keys(RRT_LABELS) as RrtMode[])
              .filter((m) => m !== "none")
              .map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setPatientField("rrt", m)
                    tickHaptic()
                  }}
                  className={`${CHIP} dose-press`}
                  style={
                    patient.rrt === m
                      ? { background: C.danger, borderColor: "transparent", color: "var(--c-on-bright)" }
                      : { background: C.surface, borderColor: C.primaryLine, color: C.textSoft }
                  }
                >
                  {RRT_SHORT[m]}
                </button>
              ))}
          </div>

          {/* Tốc độ dịch thải: thiếu con số này thì mọi khuyến cáo "liều CRRT" đều thiếu vế điều kiện */}
          {needsCrrtFlow(patient.rrt) && (
            <div className="mb-2 fade-in">
              <PatientField label="Tốc độ dịch thải Qeff (L/giờ)">
                <input
                  value={patient.crrtFlowLPerH}
                  onChange={(e) => setPatientField("crrtFlowLPerH", normalizeDecimalInput(e.target.value))}
                  inputMode="decimal"
                  placeholder="VD: 2 — dịch lọc + siêu lọc"
                  className={FIELD}
                  style={FIELD_STYLE}
                />
              </PatientField>
              <p className={`${T.meta} mt-1`} style={{ color: C.muted }}>
                {abwKg != null && parseFloat(patient.crrtFlowLPerH) > 0
                  ? `Tương đương ${((parseFloat(patient.crrtFlowLPerH) * 1000) / abwKg).toFixed(0)} mL/kg/giờ — so với điều kiện Qeff ghi trong liều CRRT của từng thuốc.`
                  : "Cộng tốc độ dịch lọc và tốc độ siêu lọc — liều kháng sinh trong CRRT thay đổi theo con số này."}
              </p>
            </div>
          )}

          {!crclUsable && (
            <div className={`px-3 py-2 ${R.box} flex items-start gap-2`} style={{ background: C.dangerSoft, border: `1px solid ${C.dangerLine}` }}>
              <span className="mt-0.5 flex-none" style={{ color: C.dangerIcon }}>{icons.alert()}</span>
              <p className={`${T.meta} font-semibold`} style={{ color: C.danger }}>
                {CRCL_RELIABILITY_TEXT[crclReliability(patient) as "aki" | "rrt"]}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Bảng "Đang truyền" — xem nhiều thuốc cạnh nhau + tương hợp Y-site ────────
//
// Quy tắc an toàn: app CHỈ kết luận "không tương hợp"/"thận trọng". Cặp nào không có trong bảng thì
// nói rõ là chưa có dữ liệu — im lặng không bao giờ được hiểu thành "chạy chung được".

// Từng cặp một phải tự khai đã đối chiếu tài liệu gốc hay chưa — nếu chỉ có một dòng miễn trừ
// chung ở cuối bảng thì người đọc không phân biệt được mục nào chắc, mục nào còn phải kiểm.
function CompatSource({ verified, source, color }: { verified: boolean; source?: string; color: string }) {
  return (
    <p className="text-[11px] leading-[1.45] mt-1" style={{ color, opacity: 0.85 }}>
      {verified && source ? `Đã đối chiếu — nguồn: ${source}` : "CHƯA đối chiếu tài liệu gốc — dữ liệu khởi tạo của app, cần xác nhận với dược lâm sàng."}
    </p>
  )
}

function RunningPanel() {
  const { running, unpinRunning, setRunningLine, abwKg } = useDosing()
  // Đồng hồ chạy mỗi phút để dòng "3 giờ trước" không đứng yên trong suốt ca trực.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  if (running.length === 0) return null

  const lines = Array.from({ length: MAX_LINES }, (_, i) => i).filter((l) => running.some((r) => r.line === l))
  // Một mục cần xem lại khi: ghim đã lâu, HOẶC cân nặng bệnh nhân đã đổi kể từ lúc ghim (mọi tốc độ
  // mL/giờ đều tính từ cân nặng đó nên con số đang hiện không còn đúng).
  function staleReason(r: RunningDrug): string | null {
    if (r.weightKgAtPin != null && abwKg != null && Math.abs(r.weightKgAtPin - abwKg) > 0.05) {
      return `Cân nặng đã đổi ${r.weightKgAtPin} → ${abwKg} kg từ lúc ghim — tính lại tốc độ`
    }
    if (now - r.at > STALE_AFTER_MS) return "Ghim đã lâu — đối chiếu lại với bơm thật"
    return null
  }

  const ysiteFindings: { line: number; a: RunningDrug; b: RunningDrug; rule: CompatRule }[] = []
  lines.forEach((line) => {
    const onLine = running.filter((r) => r.line === line)
    for (let i = 0; i < onLine.length; i++) {
      for (let j = i + 1; j < onLine.length; j++) {
        const rule = findYsiteRule(onLine[i].compatKey, onLine[j].compatKey)
        if (rule) ysiteFindings.push({ line, a: onLine[i], b: onLine[j], rule })
      }
    }
  })

  const interactionFindings: { a: RunningDrug; b: RunningDrug; rule: InteractionRule }[] = []
  for (let i = 0; i < running.length; i++) {
    for (let j = i + 1; j < running.length; j++) {
      const rule = findInteractionRule(running[i].compatKey, running[j].compatKey)
      if (rule) interactionFindings.push({ a: running[i], b: running[j], rule })
    }
  }

  return (
    <div className="mx-5 mb-3 rounded-2xl border p-4" style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}>
      <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: "var(--c-accent)" }}>
        {/* Trước đây tên là "Đang truyền", nhưng kháng sinh mỗi 8 giờ cũng nằm trong bảng này —
            gọi một liều ngắt quãng là "đang truyền" là mô tả sai thứ đang xảy ra trên người bệnh. */}
        Bệnh nhân đang dùng · {running.length} thuốc
      </p>

      {lines.map((line) => (
        <div key={line} className="mb-2.5">
          <p className="text-[11px] font-bold text-slate-400 mb-1">{lineLabel(line)}</p>
          {running
            .filter((r) => r.line === line)
            .map((r) => (
              <div key={r.id} className="flex items-start gap-2 px-2.5 py-2 rounded-xl mb-1" style={{ background: C.surfaceAlt }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className={`${T.meta} font-bold truncate`} style={{ color: C.text }}>{r.name}</p>
                    {r.kind === "intermittent" && (
                      <span className={`${T.meta} font-bold px-1.5 rounded-full flex-none`} style={{ background: C.primarySoft, color: C.primary }}>
                        ngắt quãng
                      </span>
                    )}
                  </div>
                  <p className={T.meta} style={{ color: C.textSoft }}>
                    {r.doseText}
                    {r.rateText ? ` · ${r.rateText}` : ""}
                  </p>
                  {r.concText && <p className={T.meta} style={{ color: C.muted }}>{r.concText}</p>}
                  {/* Con số này CŨ tới mức nào — thiếu dòng này thì bảng trông như đang phản ánh
                      thời gian thực, trong khi nó chỉ là ảnh chụp lúc bấm ghim. */}
                  <p className={`${T.meta} ${NUM}`} style={{ color: C.muted }}>
                    Ghim {formatClock(r.at)} · {formatAgo(r.at, now)}
                  </p>
                  {staleReason(r) && (
                    <p className={`${T.meta} font-semibold mt-1 px-2 py-1 ${R.box}`} style={{ background: C.warnSoft, color: C.warn }}>
                      {staleReason(r)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-none">
                  {Array.from({ length: MAX_LINES }, (_, i) => i).map((l) => (
                    <button
                      key={l}
                      onClick={() => setRunningLine(r.id, l)}
                      className="w-9 h-9 rounded-full text-[11px] font-bold border"
                      style={
                        r.line === l
                          ? { background: "var(--c-accent)", borderColor: "var(--c-accent)", color: "var(--c-on-bright)" }
                          : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-muted)" }
                      }
                      aria-label={`Chuyển sang ${lineLabel(l)}`}
                    >
                      {l === 0 ? "NB" : l}
                    </button>
                  ))}
                  <button onClick={() => unpinRunning(r.id)} className="w-11 h-11 rounded-full flex items-center justify-center flex-none" style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }} aria-label="Bỏ khỏi bảng">
                    {icons.x()}
                  </button>
                </div>
              </div>
            ))}
        </div>
      ))}

      {/* Khi KHÔNG có xung đột nào, cả khối này trước đây vẫn chiếm sáu dòng chữ để nói "không tìm
          thấy gì" — nay thu về một dải xanh một dòng. Có xung đột thì khối tự bung ra. */}
      {ysiteFindings.length === 0 && interactionFindings.length === 0 ? (
        <div className="pt-2 border-t" style={{ borderColor: C.lineSoft }}>
          <Disclosure label="Tương hợp · Tương tác">
            <p className={T.meta} style={{ color: C.muted }}>{COMPAT_DISCLAIMER}</p>
          </Disclosure>
          <p className={`${T.meta} flex items-center gap-1.5 mt-2 px-2.5 py-1.5 ${R.box}`} style={{ background: C.accentSoft, color: C.accent }}>
            <span className="flex-none scale-90">{icons.check()}</span>
            Chưa thấy xung đột nào trong bảng dữ liệu của app
          </p>
        </div>
      ) : (
      <div className="pt-2 border-t" style={{ borderColor: "var(--c-line-soft)" }}>
        <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5 text-slate-400">Chạy chung nòng (Y-site)</p>
        {ysiteFindings.length === 0 ? (
          <p className="text-[11px] text-slate-500 leading-[1.45]">Không tìm thấy cặp nào trong bảng dữ liệu của app.</p>
        ) : (
          ysiteFindings.map((f, i) => {
            const danger = f.rule.verdict === "incompatible"
            const fg = danger ? "var(--c-danger-deep)" : "var(--c-warn)"
            return (
              <div
                key={i}
                className="flex items-start gap-2 px-2.5 py-2 rounded-xl mb-1.5"
                style={danger ? { background: "var(--c-danger-soft)", border: "1px solid var(--c-danger-line)" } : { background: "var(--c-warn-soft)", border: "1px solid var(--c-warn-line)" }}
              >
                <span className="mt-0.5 flex-none" style={{ color: danger ? "var(--c-danger-icon)" : "var(--c-warn-icon)" }}>{icons.alert()}</span>
                <div>
                  <p className="text-[11px] font-bold leading-[1.45]" style={{ color: fg }}>
                    {danger ? "KHÔNG tương hợp" : "Thận trọng"} — {f.a.name} + {f.b.name} ({lineLabel(f.line)})
                  </p>
                  <p className="text-[11px] leading-[1.45] mt-0.5" style={{ color: fg }}>{f.rule.text}</p>
                  <CompatSource verified={f.rule.verified} source={f.rule.source} color={fg} />
                </div>
              </div>
            )
          })
        )}

        <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5 mt-2.5 text-slate-400">Tương tác thuốc</p>
        {interactionFindings.length === 0 ? (
          <p className="text-[11px] text-slate-500 leading-[1.45]">Không tìm thấy cặp nào trong bảng dữ liệu của app.</p>
        ) : (
          interactionFindings.map((f, i) => {
            const danger = f.rule.severity === "cao"
            const fg = danger ? "var(--c-danger-deep)" : "var(--c-warn)"
            return (
              <div
                key={i}
                className="flex items-start gap-2 px-2.5 py-2 rounded-xl mb-1.5"
                style={danger ? { background: "var(--c-danger-soft)", border: "1px solid var(--c-danger-line)" } : { background: "var(--c-warn-soft)", border: "1px solid var(--c-warn-line)" }}
              >
                <span className="mt-0.5 flex-none" style={{ color: danger ? "var(--c-danger-icon)" : "var(--c-warn-icon)" }}>{icons.alert()}</span>
                <div>
                  <p className="text-[11px] font-bold leading-[1.45]" style={{ color: fg }}>
                    {f.a.name} + {f.b.name}
                  </p>
                  <p className="text-[11px] leading-[1.45] mt-0.5" style={{ color: fg }}>{f.rule.text}</p>
                  <CompatSource verified={f.rule.verified} source={f.rule.source} color={fg} />
                </div>
              </div>
            )
          })
        )}

        <p className="text-[11px] leading-[1.45] mt-2 px-2 py-1.5 rounded-lg" style={{ background: "var(--c-surface-alt)", color: "var(--c-text-muted)" }}>
          {COMPAT_DISCLAIMER}
        </p>
      </div>
      )}
    </div>
  )
}

// ─── Nhật ký tính toán ────────────────────────────────────────────────────────

// Chọn được TỪNG mục. Trước đây chỉ có hai nút "Sao chép" và "Xoá nhật ký", cả hai đều tác động
// lên toàn bộ 200 mục: muốn dán một phép tính vào bệnh án thì phải dán cả nhật ký rồi cắt tay, và
// muốn bỏ một phép tính nháp thì phải xoá sạch lịch sử của cả ca trực.
//
// Mặc định là KHÔNG chọn gì; lúc đó hai nút tác động lên toàn bộ như cũ, nên người chỉ cần thao tác
// nhanh không phải học thêm gì. Chạm vào một mục là bật chế độ chọn.
function CalcLogSheet({ entries, onClear, onRemove, onClose }: { entries: CalcLogEntry[]; onClear: () => void; onRemove: (ids: Set<string>) => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Mục đã chọn có thể bị xoá khỏi danh sách (hoặc rơi khỏi mốc 200) — bỏ id "mồ côi" khỏi vùng
  // chọn, nếu không số đếm trên nút sẽ nói dối.
  useEffect(() => {
    setSelected((prev) => {
      const alive = new Set(entries.map((e) => e.id))
      const next = new Set([...prev].filter((id) => alive.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [entries])
  useEffect(() => setConfirmDelete(false), [selected])

  const hasSelection = selected.size > 0
  const target = hasSelection ? entries.filter((e) => selected.has(e.id)) : entries
  const allSelected = entries.length > 0 && selected.size === entries.length

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    tickHaptic()
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: "rgba(15,23,42,.35)" }}>
      <button className="flex-1" onClick={onClose} aria-label="Đóng nhật ký" />
      <div className="rounded-t-3xl flex flex-col" style={{ background: "var(--c-surface)", maxHeight: "78%" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-[13px] font-bold text-slate-900">Nhật ký tính toán</p>
          <button onClick={onClose} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--c-line-soft)", color: "var(--c-text-soft)" }} aria-label="Đóng">
            {icons.x()}
          </button>
        </div>
        <div className="flex items-center gap-2 px-5 pb-2">
          <p className={`${T.meta} flex-1`} style={{ color: C.textSoft }}>
            {hasSelection
              ? `Đã chọn ${selected.size}/${entries.length} — hai nút bên dưới chỉ tác động lên phần đã chọn.`
              : "Chạm vào một mục để chọn riêng. Chưa chọn gì thì nút bên dưới áp dụng cho toàn bộ."}
          </p>
          {entries.length > 0 && (
            <button
              onClick={() => {
                setSelected(allSelected ? new Set() : new Set(entries.map((e) => e.id)))
                tickHaptic()
              }}
              className={`${BTN_SM} flex-none`}
              style={{ borderColor: C.line, color: C.primary }}
            >
              {allSelected ? "Bỏ chọn" : "Chọn tất cả"}
            </button>
          )}
        </div>
        <div className="scroll-ios flex-1 px-5 pb-3">
          {entries.length === 0 ? (
            <p className="text-[13px] text-slate-400 text-center py-8">Chưa có phép tính nào được lưu.</p>
          ) : (
            entries.map((e) => {
              const on = selected.has(e.id)
              return (
                <button
                  key={e.id}
                  onClick={() => toggle(e.id)}
                  aria-pressed={on}
                  className="w-full text-left p-3 rounded-2xl border mb-2 flex gap-2.5 items-start"
                  style={on ? { borderColor: C.primary, background: C.primarySoft } : { borderColor: C.line }}
                >
                  {/* Ô đánh dấu vẽ tay thay vì <input type=checkbox>: cả thẻ đã là vùng chạm 44px,
                      thêm một ô bấm được nữa bên trong chỉ tạo ra hai đích chạm chồng nhau. */}
                  <span
                    className="flex-none w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center"
                    style={on ? { background: C.primary, borderColor: C.primary, color: "var(--c-on-bright)" } : { borderColor: C.line }}
                  >
                    {on && <span className="scale-[0.6]">{icons.check()}</span>}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`${T.meta} font-bold truncate`} style={{ color: C.text }}>{e.drug}</span>
                      <span className={`${T.meta} flex-none`} style={{ color: C.muted }}>{formatLogTime(e.at)}</span>
                    </span>
                    <span className={`${T.meta} block`} style={{ color: C.muted }}>
                      {CALC_KIND_LABELS[e.kind]}
                      {e.patient ? ` · ${e.patient}` : ""}
                      {e.weightKg != null ? ` · ${e.weightKg} kg` : ""}
                    </span>
                    {e.inputs.map((line, i) => (
                      <span key={i} className={`${T.meta} block`} style={{ color: C.textSoft }}>
                        {line}
                      </span>
                    ))}
                    <span className={`${T.meta} font-bold block mt-0.5`} style={{ color: C.primary }}>
                      → {e.output}
                    </span>
                    {e.flag && (
                      <span className={`${T.meta} font-semibold block mt-1 px-2 py-1 ${R.box}`} style={{ background: C.dangerSoft, color: C.danger }}>
                        {e.flag}
                      </span>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>
        <div className="flex-none flex gap-2 px-5 pt-2 border-t" style={{ borderColor: "var(--c-line)", paddingBottom: "var(--nav-pad-bottom)" }}>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(calcLogToText(target))
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              } catch {
                // Trình duyệt chặn clipboard: không làm gì, nút vẫn giữ nguyên nhãn.
              }
            }}
            disabled={target.length === 0}
            className="flex-1 py-3 rounded-2xl font-semibold text-[13px] border"
            style={{ borderColor: C.line, color: target.length === 0 ? C.muted : C.primary }}
          >
            {copied ? "Đã sao chép" : hasSelection ? `Sao chép ${selected.size} mục` : "Sao chép tất cả"}
          </button>
          {/* Xoá cần một nhịp xác nhận, nhưng KHÔNG dùng hộp thoại: nút tự đổi thành "Chắc chắn xoá?"
              rồi mới thực hiện ở lần chạm thứ hai — bỏ tay ra khỏi nút là quên (xem useEffect trên). */}
          <button
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true)
                return
              }
              if (hasSelection) {
                onRemove(selected)
                setSelected(new Set())
              } else {
                onClear()
              }
              setConfirmDelete(false)
              tickHaptic()
            }}
            onBlur={() => setConfirmDelete(false)}
            disabled={target.length === 0}
            className="flex-1 py-3 rounded-2xl font-semibold text-[13px] border"
            style={
              target.length === 0
                ? { borderColor: C.dangerLine, color: C.muted }
                : confirmDelete
                  ? { borderColor: C.dangerIcon, background: C.dangerSoft, color: C.danger }
                  : { borderColor: C.dangerLine, color: C.danger }
            }
          >
            {confirmDelete ? "Chắc chắn xoá?" : hasSelection ? `Xoá ${selected.size} mục` : "Xoá tất cả"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Antibiotics — chỉnh liều theo độ lọc cầu thận ────────────────────────────

// Cảnh báo/tương tác của một thuốc — dùng chung cho AntibioticDoseCard và InfusionDrugCard.
// Trước đây "cao" và "trung bình" chỉ khác nhau ở màu một chấm tròn 1.5px — rất dễ lướt qua và
// bỏ sót cảnh báo mức cao. Giờ mức "cao" có khung nền đỏ nhạt + icon cảnh báo + chữ đậm màu đỏ,
// tách hẳn khỏi mức "trung bình" (vẫn giữ kiểu chấm nhỏ, không cần nổi bật bằng).
// `bare` = đã có tiêu đề mục ở ngoài (khối gấp/mở) nên không vẽ lại đường kẻ và tiêu đề riêng.
function DrugWarnings({ warnings, bare }: { warnings?: AntibioticWarning[]; bare?: boolean }) {
  if (!warnings || warnings.length === 0) return null
  return (
    <div className={bare ? "space-y-1.5" : "mt-3 pt-3 border-t space-y-1.5"} style={bare ? undefined : { borderColor: "var(--c-line-soft)" }}>
      {!bare && <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Lưu ý / tương tác</p>}
      {warnings.map((w, i) =>
        w.severity === "cao" ? (
          <div key={i} className="flex items-start gap-2 px-2.5 py-2 rounded-xl" style={{ background: "var(--c-danger-soft)", border: "1px solid var(--c-danger-line)" }}>
            <span className="mt-0.5 flex-none" style={{ color: "var(--c-danger-icon)" }}>{icons.alert()}</span>
            {/* Cảnh báo mức CAO dùng cỡ chữ chính (13px), không phải cỡ chú thích 11px như phần còn
                lại: đây là dòng chữ mà việc bỏ sót gây hại nhất, nó không được nhỏ hơn chữ mô tả. */}
            <p className={`${T.bodyStrong}`} style={{ color: "var(--c-danger-deep)" }}>{w.text}</p>
          </div>
        ) : (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-none" style={{ background: "var(--c-warn-icon)" }} />
            <p className="text-[11px] text-slate-600 leading-[1.45]">{w.text}</p>
          </div>
        ),
      )}
    </div>
  )
}

// Gộp danh sách dựng sẵn với các bản người dùng tự lưu (cùng khoá lưu trữ dùng cho cả mục tự
// thêm mới VÀ mục "sửa" một thuốc dựng sẵn — cả hai đều nằm trong cùng collection tự nhập, phân
// biệt bằng việc id có trùng với một mục dựng sẵn hay không). Mục có id trùng với dựng sẵn sẽ
// THAY THẾ mục dựng sẵn tại đúng vị trí cũ (hiển thị bản đã sửa, không hiện cả hai bản); mục có id
// mới hoàn toàn được thêm vào cuối, như một thuốc tự nhập bình thường.
function mergeWithOverrides<T extends { id: string }>(staticList: T[], stored: T[]): T[] {
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
const STATIC_ANTIBIOTIC_IDS = new Set(ANTIBIOTICS.map((d) => d.id))

function tierFor(tiers: DoseTier[], crcl: number | null): DoseTier {
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
function AntibioticMixPanel({ drug }: { drug: Antibiotic }) {
  const { logCalc, wardRecipes, saveWard, clearWard } = useDosing()
  const wardList = wardRecipes[drug.id] ?? []
  // Công thức ÁP DỤNG mặc định là công thức lưu GẦN NHẤT — các công thức khác vẫn giữ nguyên trong
  // danh sách, bấm chip tương ứng để nạp lại giá trị của nó vào form đang mở (xem loadWard()).
  const ward = wardList[wardList.length - 1]
  const mix = drug.mix
  const concUnit = mix?.concUnit ?? "mg/mL"
  const concMass = massOfConcUnit(concUnit)
  const vialLabel = mix?.vialLabel ?? "lọ"
  // Đường dùng mặc định của thuốc — chỉ dùng khi CHƯA có công thức đã lưu nào tự khai đường riêng.
  const defaultRoute: "TTM" | "TMC" = drug.route.includes("TMC") ? "TMC" : "TTM"
  // Đường TMC không nhỏ giọt/không cần tính giọt/phút — TTM mới cần. Đây là STATE (không phải hằng
  // suy ra thẳng từ drug.route) vì cùng một thuốc có khoa truyền TTM, có khoa tiêm TMC — mỗi công
  // thức đã lưu (ward) mang đường dùng riêng của nó, xem loadWard()/saveWardFrom() bên dưới.
  const [routeShort, setRouteShort] = useState<"TTM" | "TMC">(ward?.route ?? defaultRoute)

  const [vialAmount, setVialAmount] = useState(String(ward?.vialAmount ?? mix?.vialAmount ?? ""))
  const [vialUnit, setVialUnit] = useState(ward?.vialUnit ?? mix?.vialUnit ?? concMass)
  const [vials, setVials] = useState(String(ward?.vials ?? 1))
  const [vialForm, setVialForm] = useState<VialForm>(ward?.vialForm ?? mix?.vialForm ?? "powder")
  const [vialVolume, setVialVolume] = useState(
    ward?.vialVolumeMl != null ? String(ward.vialVolumeMl) : mix?.vialVolumeMl != null ? String(mix.vialVolumeMl) : "",
  )
  const [reconstitute, setReconstitute] = useState(
    ward?.reconstituteMl != null ? String(ward.reconstituteMl) : mix?.reconstituteMl != null ? String(mix.reconstituteMl) : "",
  )
  const [displacement, setDisplacement] = useState(
    ward?.displacementMl != null ? String(ward.displacementMl) : mix?.displacementMl != null ? String(mix.displacementMl) : "",
  )
  const [volume, setVolume] = useState(String(ward?.volumeMl ?? 100))
  const [diluent, setDiluent] = useState(ward?.diluent ?? mix?.diluents?.[0] ?? "NaCl 0,9%")
  // Chai cố định hàm lượng: liều cần LẤY (bỏ trống = dùng trọn chai) — không pha loãng thêm nên
  // không dùng chung ô "Pha loãng tới"/"Dung môi" của hai dạng kia.
  const [fixedDoseAmount, setFixedDoseAmount] = useState("")
  // Giọt/phút: máy tính sống, không thuộc dữ liệu thuốc — nhập thời gian truyền dự kiến là ra ngay.
  const [infuseMinutes, setInfuseMinutes] = useState("")
  const [dropFactor, setDropFactor] = useState(DEFAULT_DROP_FACTOR)
  const [saveTitle, setSaveTitle] = useState("")

  const allowedDiluents = mix?.diluents ?? ["NaCl 0,9%", "Glucose 5%"]
  const avoidDiluents = mix?.avoidDiluents ?? []
  const diluentBlocked = avoidDiluents.includes(diluent)
  const unitChoices = useMemo(() => MIX_UNIT_CHOICES.filter((u) => massFactor(u, concMass) != null), [concMass])

  const va = parseFloat(vialAmount)
  const nv = parseFloat(vials)
  const vol = parseFloat(volume)
  const num = (s: string) => {
    const n = parseFloat(s)
    return isNaN(n) || n < 0 ? null : n
  }
  const spec: VialSpec = useMemo(
    () => ({
      form: vialForm,
      volumeMl: vialForm !== "powder" ? num(vialVolume) : null,
      reconstituteMl: vialForm === "powder" ? num(reconstitute) : null,
      displacementMl: vialForm === "powder" ? num(displacement) : null,
    }),
    [vialForm, vialVolume, reconstitute, displacement],
  )

  const isFixed = vialForm === "fixed"
  const fixedDoseNum = num(fixedDoseAmount)
  const fixedVialVolume = num(vialVolume)
  const fixedDrawMl = isFixed && fixedDoseNum != null && fixedVialVolume != null ? drawFromFixedVial(fixedDoseNum, vialUnit, va, vialUnit, fixedVialVolume) : null
  const fixedImpossible = isFixed && fixedDoseNum != null && fixedVialVolume != null && fixedDrawMl == null

  const conc = isFixed ? (fixedVialVolume != null && va > 0 ? va / fixedVialVolume : null) : concentrationFromVials(va, nv, vol, vialUnit, concUnit)
  const grade = isFixed ? CONC_OK : gradeConcentration(conc, ward?.concValue, mix?.maxConc, concUnit, ward ? "công thức của bạn" : "công thức chuẩn")
  const drugVolume = vialsTotalVolume(nv, spec)
  const dil = diluentVolume(vol, drugVolume)
  const impossible = !isFixed && dil != null && dil < -1e-9
  const [confirmed, setConfirmed] = useState(false)
  useEffect(() => setConfirmed(false), [conc, vol, nv])
  const blocked = grade.requiresConfirm && !confirmed

  // Thể tích thực sự sẽ truyền — dùng để tính giọt/phút: chai cố định thì là mL rút ra (hoặc cả
  // chai nếu dùng trọn), hai dạng kia là thể tích pha loãng tới.
  const infuseVolumeMl = isFixed ? (fixedDoseNum != null ? fixedDrawMl : fixedVialVolume) : vol
  const minutes = num(infuseMinutes)
  const dropsPerMin = routeShort === "TTM" ? dropsPerMinute(infuseVolumeMl ?? NaN, minutes ?? NaN, dropFactor) : null

  const pill = (on: boolean) =>
    on
      ? { background: "var(--c-accent)", borderColor: "var(--c-accent)", color: "var(--c-on-bright)" }
      : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }

  function outcome(): MixOutcome {
    return { concValue: conc as number, volumeMl: vol, vials: nv, vialsOpened: Math.max(1, Math.ceil(nv - 1e-9)), drawMl: null, vialAmount: va, vialUnit, spec, diluent }
  }

  // Câu "Cách dùng" theo mẫu chuẩn — dòng đầu của khối kết quả, xem lib/usageText.ts.
  const usageLine =
    conc == null
      ? null
      : isFixed
        ? formatFixedUsage({
            name: drug.name,
            vialAmount: va,
            vialUnit,
            vialVolumeMl: fixedVialVolume ?? 0,
            doseAmount: fixedDoseNum ?? undefined,
            doseUnit: vialUnit,
            route: routeShort,
            dropsPerMin,
          })
        : formatVialUsage({ name: drug.name, vialAmount: va * nv, vialUnit, diluentName: diluent, route: routeShort, dropsPerMin })

  function loadWard(w: WardRecipe) {
    setVialAmount(String(w.vialAmount))
    setVialUnit(w.vialUnit)
    setVials(String(w.vials))
    setVialForm(w.vialForm ?? "powder")
    setVialVolume(w.vialVolumeMl != null ? String(w.vialVolumeMl) : "")
    setReconstitute(w.reconstituteMl != null ? String(w.reconstituteMl) : "")
    setDisplacement(w.displacementMl != null ? String(w.displacementMl) : "")
    setVolume(String(w.volumeMl))
    setDiluent(w.diluent ?? allowedDiluents[0] ?? "NaCl 0,9%")
    setRouteShort(w.route ?? defaultRoute)
    setInfuseMinutes(w.infuseMinutes != null ? String(w.infuseMinutes) : "")
    setDropFactor(w.dropFactor ?? DEFAULT_DROP_FACTOR)
    tickHaptic()
  }

  function saveWardFrom() {
    if (conc == null) return
    saveWard({
      drugId: drug.id,
      title: saveTitle.trim() || `${diluent} · ${vialForm === "powder" ? "lọ bột" : vialForm === "fixed" ? "chai cố định" : "ống dung dịch"} · ${routeShort}`,
      concValue: conc,
      vialAmount: va,
      vialUnit,
      vials: nv,
      volumeMl: vol,
      vialForm: spec.form,
      vialVolumeMl: spec.volumeMl ?? undefined,
      reconstituteMl: spec.reconstituteMl ?? undefined,
      displacementMl: spec.displacementMl ?? undefined,
      diluent,
      route: routeShort,
      infuseMinutes: minutes ?? undefined,
      dropFactor,
    })
    setSaveTitle("")
    tickHaptic()
  }

  function saveLog() {
    if (conc == null) return
    logCalc({
      drug: drug.name,
      kind: "mix",
      inputs: [usageLine ?? describeComposition(outcome(), vialLabel)],
      output: isFixed ? usageLine ?? "" : `Nồng độ ${formatDoseNumber(conc)} ${concUnit} trong ${trim(vol)} mL`,
    })
    tickHaptic()
  }

  return (
    <div className="mt-2.5 p-3 rounded-xl fade-in" style={{ background: "var(--c-surface-alt)", border: "1px solid var(--c-line)" }}>
      {wardList.length > 0 && (
        <div className="mb-2">
          <label className="text-[11px] font-medium text-slate-500 mb-1 block">Công thức đã lưu</label>
          <div className="flex flex-wrap gap-1.5">
            {wardList.map((w) => (
              <span key={w.id} className="inline-flex items-center h-8 rounded-full border overflow-hidden" style={{ borderColor: "var(--c-accent-line)" }}>
                <button onClick={() => loadWard(w)} className="h-full px-2.5 text-[11px] font-semibold max-w-[160px] truncate" style={{ color: "var(--c-accent-deep)", background: "var(--c-surface)" }}>
                  {w.title || "Công thức đã lưu"}
                </button>
                {/* Đây là công thức ĐÃ LƯU từ phiên trước, không phải một dòng đang soạn dở — nên
                    xoá cần xác nhận hai chạm giống xoá kháng sinh/bài viết tự nhập, không phải nút
                    "×" tức thì (nút đó dành cho dòng nháp chưa lưu, xem chú thích ConfirmIconButton
                    phía trên: trước đây liệt "công thức pha" nhầm vào nhóm đó). */}
                <ConfirmIconButton
                  onConfirm={() => clearWard(drug.id, w.id)}
                  ariaLabel={`Xoá công thức ${w.title}`}
                  className="h-full px-2 flex-none flex items-center justify-center"
                  style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }}
                />
              </span>
            ))}
          </div>
        </div>
      )}

      {!isFixed && (
        <>
          <label className="text-[11px] font-medium text-slate-500 mb-1 block">Dung môi</label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {allowedDiluents.map((d) => (
              <button key={d} onClick={() => setDiluent(d)} className="h-8 px-2.5 rounded-full text-[11px] font-semibold border" style={pill(diluent === d)}>
                {d}
              </button>
            ))}
            {avoidDiluents.map((d) => (
              <button
                key={d}
                onClick={() => setDiluent(d)}
                className="h-8 px-2.5 rounded-full text-[11px] font-semibold border"
                style={
                  diluent === d
                    ? { background: "var(--c-danger-icon)", borderColor: "var(--c-danger-icon)", color: "var(--c-on-bright)" }
                    : { background: "var(--c-surface)", borderColor: "var(--c-danger-line)", color: "var(--c-danger-deep)" }
                }
              >
                {d}
              </button>
            ))}
          </div>
          {diluentBlocked && (
            <p className="text-[11px] font-bold leading-[1.45] mb-2 px-2.5 py-2 rounded-xl" style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-deep)" }}>
              {mix?.diluentWarning ?? `Không pha ${drug.name} với ${diluent}.`}
            </p>
          )}
        </>
      )}

      {/* Đường dùng: mặc định suy theo `drug.route`, nhưng khoa nào pha khác (TTM ở khoa này, TMC ở
          khoa kia) thì đổi ở đây rồi lưu — mỗi công thức đã lưu nhớ đúng đường dùng của khoa đó. */}
      <label className="text-[11px] font-medium text-slate-500 mb-1 block">Đường dùng</label>
      <div className="flex gap-1.5 mb-2">
        {(["TTM", "TMC"] as const).map((r) => (
          <button
            key={r}
            onClick={() => {
              setRouteShort(r)
              tickHaptic()
            }}
            className="h-8 px-2.5 rounded-full text-[11px] font-semibold border"
            style={pill(routeShort === r)}
          >
            {r === "TTM" ? "Truyền TM (TTM)" : "Tiêm TM chậm (TMC)"}
          </button>
        ))}
      </div>

      <label className="text-[11px] font-medium text-slate-500 mb-1 block">Dạng chế phẩm</label>
      <div className="flex gap-1.5 mb-2">
        {(
          [
            { v: "powder" as VialForm, label: "Lọ bột" },
            { v: "solution" as VialForm, label: "Ống dung dịch" },
            { v: "fixed" as VialForm, label: "Chai cố định hàm lượng" },
          ]
        ).map((opt) => (
          <button key={opt.v} onClick={() => setVialForm(opt.v)} className="h-8 px-2.5 rounded-full text-[11px] font-semibold border" style={pill(vialForm === opt.v)}>
            {opt.label}
          </button>
        ))}
      </div>

      {isFixed ? (
        <>
          {/* Chai cố định hàm lượng: KHÔNG pha loãng thêm — chỉ khai hàm lượng/thể tích cả chai rồi
              hoặc dùng trọn, hoặc rút một phần theo liều cần. */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1 block">Hàm lượng cả chai</label>
              <input value={vialAmount} onChange={(e) => setVialAmount(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="750" className={FIELD} style={FIELD_STYLE} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1 block">Thể tích cả chai (mL)</label>
              <input value={vialVolume} onChange={(e) => setVialVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="150" className={FIELD} style={FIELD_STYLE} />
            </div>
          </div>
          <div className="mb-2">
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Liều cần lấy (tuỳ chọn — bỏ trống = dùng trọn chai)</label>
            <input value={fixedDoseAmount} onChange={(e) => setFixedDoseAmount(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="500" className={FIELD} style={FIELD_STYLE} />
          </div>
          {unitChoices.length > 1 && (
            <div className="flex gap-1.5 mb-2.5">
              {unitChoices.map((u) => (
                <button key={u} onClick={() => setVialUnit(u)} className="h-8 px-2.5 rounded-full text-[11px] font-semibold border" style={pill(vialUnit === u)}>
                  {u}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Ống dung dịch: 3 ô ngắn vừa khít một hàng. Lọ bột thì KHÔNG dùng chung hàng đó — nhãn "Pha
              ban đầu với (mL/lọ)" dài hơn hẳn "Thể tích 1 ống (mL)", nhét vào 1/3 hàng sẽ xuống dòng và
              đẩy ô nhập tụt xuống so với hai ô bên cạnh (không còn ngang hàng). Tách thành hàng riêng để
              nhãn dài có đủ chỗ, không phải đứng cạnh nhãn ngắn. */}
          <div className={`grid ${vialForm === "solution" ? "grid-cols-3" : "grid-cols-2"} gap-2 mb-2`}>
            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1 block">Hàm lượng 1 {vialLabel}</label>
              <input value={vialAmount} onChange={(e) => setVialAmount(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="1000" className={FIELD} style={FIELD_STYLE} />
            </div>
            {vialForm === "solution" && (
              <div>
                <label className="text-[11px] font-medium text-slate-500 mb-1 block">Thể tích 1 {vialLabel} (mL)</label>
                <input value={vialVolume} onChange={(e) => setVialVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="2" className={FIELD} style={FIELD_STYLE} />
              </div>
            )}
            <div>
              <label className="text-[11px] font-medium text-slate-500 mb-1 block">Số {vialLabel}</label>
              <input value={vials} onChange={(e) => setVials(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="1" className={FIELD} style={FIELD_STYLE} />
            </div>
          </div>

          {/* Xếp dọc, mỗi ô một hàng riêng — không ghép ngang: "Thể tích bột tăng sau pha" luôn dài hơn
              hẳn "Pha ban đầu với", và độ dài {vialLabel} (lọ/ống/chai) đổi theo từng thuốc nên không
              thể tin là hai nhãn sẽ luôn xuống dòng đối xứng nhau ở mọi cỡ chữ. */}
          {vialForm === "powder" && (
            <div className="space-y-2 mb-2">
              <div>
                <label className="text-[11px] font-medium text-slate-500 mb-1 block">Pha ban đầu với (mL/{vialLabel})</label>
                <input value={reconstitute} onChange={(e) => setReconstitute(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="10" className={FIELD} style={FIELD_STYLE} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 mb-1 block">Thể tích bột tăng sau pha (mL/{vialLabel})</label>
                <input value={displacement} onChange={(e) => setDisplacement(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="0,5" className={FIELD} style={FIELD_STYLE} />
              </div>
            </div>
          )}

          <div className="mb-2">
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Pha loãng tới (mL)</label>
            <input value={volume} onChange={(e) => setVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="100" className={FIELD} style={FIELD_STYLE} />
          </div>

          {unitChoices.length > 1 && (
            <div className="flex gap-1.5 mb-2.5">
              {unitChoices.map((u) => (
                <button key={u} onClick={() => setVialUnit(u)} className="h-8 px-2.5 rounded-full text-[11px] font-semibold border" style={pill(vialUnit === u)}>
                  {u}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Giọt/phút — chỉ có ý nghĩa với đường TTM (nhỏ giọt), không áp dụng cho TMC (tiêm thẳng). */}
      {routeShort === "TTM" && infuseVolumeMl != null && infuseVolumeMl > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Truyền trong (phút)</label>
            <input value={infuseMinutes} onChange={(e) => setInfuseMinutes(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="60" className={FIELD} style={FIELD_STYLE} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Bộ dây (giọt/mL)</label>
            <div className="flex h-11 rounded-2xl overflow-hidden border" style={{ borderColor: "var(--c-line)" }}>
              {[DEFAULT_DROP_FACTOR, MICRO_DROP_FACTOR].map((f) => (
                <button
                  key={f}
                  onClick={() => setDropFactor(f)}
                  className="flex-1 text-[11px] font-semibold"
                  style={dropFactor === f ? { background: "var(--c-accent)", color: "var(--c-on-bright)" } : { background: "var(--c-surface)", color: "var(--c-text-soft)" }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {fixedImpossible && (
        <div className="px-3 py-2.5 rounded-xl flex items-start gap-2 mb-2" style={{ background: "var(--c-danger-soft)", border: "1px solid var(--c-danger-icon)" }}>
          <span className="mt-0.5 flex-none" style={{ color: "var(--c-danger-icon)" }}>{icons.alert()}</span>
          <p className="text-[11px] leading-[1.45]" style={{ color: "var(--c-danger-deep)" }}>
            LIỀU CẦN LẤY VƯỢT HÀM LƯỢNG CẢ CHAI — kiểm tra lại liều cần lấy hoặc hàm lượng chai.
          </p>
        </div>
      )}

      {conc != null && (isFixed ? !fixedImpossible : !isNaN(nv)) && (
        impossible ? (
          <div className="px-3 py-2.5 rounded-xl flex items-start gap-2" style={{ background: "var(--c-danger-soft)", border: "1px solid var(--c-danger-icon)" }}>
            <span className="mt-0.5 flex-none" style={{ color: "var(--c-danger-icon)" }}>{icons.alert()}</span>
            <p className="text-[11px] leading-[1.45]" style={{ color: "var(--c-danger-deep)" }}>
              KHÔNG PHA ĐƯỢC — thể tích thuốc đã nhiều hơn thể tích pha loãng. Kiểm tra lại số {vialLabel}, thể tích 1 {vialLabel} hoặc thể tích pha loãng.
            </p>
          </div>
        ) : (
          <div className="px-3 py-2.5 rounded-xl" style={{ background: "var(--c-surface)", border: "1px solid var(--c-line-strong)" }}>
            {usageLine && <p className="text-[13px] font-bold text-slate-800 leading-[1.45]">{usageLine}</p>}
            {!isFixed && <p className="text-[11px] leading-[1.45] mt-1" style={{ color: "var(--c-text-soft)" }}>Nồng độ {formatDoseNumber(conc)} {concUnit}</p>}
            <p className="text-[11px] font-semibold leading-[1.45] mt-1" style={{ color: "var(--c-accent-deep)" }}>
              {isFixed
                ? fixedDoseNum != null
                  ? `Rút ${formatDoseNumber(fixedDrawMl as number)} mL từ chai ${trim(va)} ${vialUnit}/${trim(fixedVialVolume ?? 0)} mL`
                  : `Dùng trọn 1 chai ${trim(va)} ${vialUnit}/${trim(fixedVialVolume ?? 0)} mL`
                : describeComposition(outcome(), vialLabel)}
            </p>
            {mix?.infuseNote && <p className="text-[11px] leading-[1.45] mt-2" style={{ color: "var(--c-text-soft)" }}>Truyền: {mix.infuseNote}</p>}

            {grade.severity !== "ok" && (
              <div
                className="mt-2 px-2.5 py-2 rounded-xl flex items-start gap-2"
                style={
                  grade.severity === "danger"
                    ? { background: "var(--c-danger-soft)", border: "1px solid var(--c-danger-icon)" }
                    : grade.severity === "warn"
                      ? { background: "var(--c-orange-soft)", border: "1px solid var(--c-orange-line)" }
                      : { background: "var(--c-warn-soft)", border: "1px solid var(--c-warn-line)" }
                }
              >
                <span className="mt-0.5 flex-none" style={{ color: grade.severity === "danger" ? "var(--c-danger-icon)" : grade.severity === "warn" ? "var(--c-orange)" : "var(--c-warn)" }}>
                  {icons.alert()}
                </span>
                <div>
                  {grade.headline && (
                    <p className="text-[11px] font-extrabold leading-[1.3]" style={{ color: grade.severity === "danger" ? "var(--c-danger-deep)" : grade.severity === "warn" ? "var(--c-orange)" : "var(--c-warn)" }}>
                      {grade.headline}
                    </p>
                  )}
                  {grade.detail && (
                    <p className="text-[11px] leading-[1.45] mt-0.5" style={{ color: grade.severity === "danger" ? "var(--c-danger-deep)" : grade.severity === "warn" ? "var(--c-orange)" : "var(--c-warn)" }}>
                      {grade.detail}
                    </p>
                  )}
                </div>
              </div>
            )}

            {blocked ? (
              <button
                onClick={() => {
                  setConfirmed(true)
                  tickHaptic()
                }}
                className={`${BTN_TALL} mt-2 border-transparent`}
                style={{ background: grade.severity === "danger" ? "var(--c-danger-deep)" : "var(--c-warn)", color: "var(--c-on-bright)" }}
              >
                Tôi đã kiểm tra lại — vẫn dùng công thức này
              </button>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button onClick={saveLog} className="h-8 px-3 rounded-full text-[11px] font-bold" style={{ background: "var(--c-accent)", color: "var(--c-on-bright)" }}>
                    Lưu vào nhật ký
                  </button>
                </div>
                <div className="flex gap-1.5 mt-1.5">
                  <input
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="Đặt tên công thức (tuỳ chọn, vd: Khoa Hồi sức)"
                    maxLength={40}
                    className="flex-1 h-8 px-2.5 rounded-full text-[11px] border outline-none"
                    style={FIELD_STYLE}
                  />
                  <button onClick={saveWardFrom} className="h-8 px-3 rounded-full text-[11px] font-bold border flex-none" style={{ borderColor: "var(--c-accent-line)", color: "var(--c-accent-deep)" }}>
                    Lưu công thức mới
                  </button>
                </div>
              </>
            )}
          </div>
        )
      )}
      {conc == null && (
        <p className="text-[11px] leading-[1.45] text-slate-400">
          {isFixed ? `Nhập hàm lượng và thể tích cả chai để tính.` : `Nhập hàm lượng ${vialLabel}, số ${vialLabel} và thể tích pha loãng để tính nồng độ.`}
        </p>
      )}
    </div>
  )
}

function AntibioticDoseCard({
  drug,
  disease,
  isOverride,
  onEdit,
  onDelete,
}: {
  drug: Antibiotic
  disease?: DiseaseEntry | null
  isOverride?: boolean
  onEdit?: (drug: Antibiotic) => void
  onDelete?: (id: string) => void
}) {
  const { patient, abwKg, heightCm, crcl, crclUsable, openPatientPanel, pinRunning, wardRecipes, clearWard } = useDosing()
  const wardList = wardRecipes[drug.id] ?? []
  const ward = wardList[wardList.length - 1]
  const [showMix, setShowMix] = useState(false)
  // Đường uống không cần hoàn nguyên/pha loãng — bảng pha chỉ có ý nghĩa với đường tiêm/truyền.
  const injectable = !drug.route.includes("Uống")
  const indication = disease ? drug.indications?.find((i) => i.diseaseId === disease.id) : undefined
  const tiers = indication?.tiers ?? drug.tiers
  const standardDose = indication?.standardDose ?? drug.standardDose
  // Khi bệnh nhân lọc máu hoặc creatinin chưa ổn định thì KHÔNG được chọn bậc liều theo CrCl —
  // app quay về liều chuẩn (bậc thận bình thường) và nói rõ vì sao, thay vì đưa ra một bậc liều
  // trông chắc chắn mà thực ra không áp dụng được.
  const effectiveCrcl = crclUsable ? crcl : null
  const tier = tierFor(tiers, effectiveCrcl)
  // Chưa nhập đủ thông số để ra CrCl thì tierFor() trả về bậc THẬN BÌNH THƯỜNG. Trước đây app im
  // lặng hiển thị bậc đó như một câu trả lời chắc chắn — đúng kiểu sai nguy hiểm nhất, vì người
  // dùng không có dấu hiệu nào để biết con số đang giả định thận bình thường. Chỉ nhắc khi thuốc
  // THẬT SỰ có nhiều bậc liều; thuốc một bậc (metronidazole, azithromycin) thì CrCl không đổi gì.
  const missingCrcl = crcl == null && patient.rrt === "none" && !patient.akiUnstable && tiers.length > 1
  const dosingWeight = useMemo(
    () => resolveDosingWeight(abwKg, heightCm, patient.sex, drug.doseWeightBasis ?? "actual"),
    [abwKg, heightCm, patient.sex, drug.doseWeightBasis],
  )
  // Nhân sẵn liều mg/kg: app đã có cân nặng và đã có chuỗi "15–20 mg/kg mỗi 8–12h" thì không có lý
  // do gì bắt người dùng tự nhẩm — đó đúng là chỗ dễ sai nhất lúc 2 giờ sáng.
  const perKgDoses = useMemo(() => findPerKgDoses(tier.dose), [tier.dose])
  // Tự tính "Cách dùng" theo mức liều CrCl hiện tại: đọc con số liều (mg/kg × cân nặng, hoặc liều
  // tuyệt đối đứng đầu chuỗi) rồi quy đổi ra mL/chai theo công thức pha đã lưu (hoặc mặc định của
  // thuốc) — xem lib/perKgDose.ts (findFixedDose) và lib/mixing.ts (drawFromFixedVial/pickEasiestVolume).
  // Không tự bịa công thức pha: chỉ tính khi thuốc CÓ `mix`/công thức đã lưu, ngược lại im lặng.
  // Công thức đã lưu (ward) có thể tự khai đường dùng riêng (khoa A truyền TTM, khoa B tiêm TMC cùng
  // một thuốc) — ưu tiên đường đó, chỉ suy từ `drug.route` khi chưa có công thức nào được lưu.
  const routeShort: "TTM" | "TMC" = ward?.route ?? (drug.route.includes("TMC") ? "TMC" : "TTM")
  const mixCfg = useMemo(() => {
    // `vials`/`volumeMl` là null khi CHƯA có công thức đã lưu — tự tính số lọ cần dùng ở autoUsage
    // bên dưới thay vì giả định cứng "đúng 1 lọ" như trước (khiến Amikacin/Vancomycin liều theo
    // cân nặng — đa số cần nhiều hơn 1 lọ — không bao giờ ra được gợi ý).
    if (ward)
      return {
        vialAmount: ward.vialAmount,
        vialUnit: ward.vialUnit,
        vialForm: ward.vialForm ?? "powder",
        vialVolumeMl: ward.vialVolumeMl,
        vials: ward.vials,
        volumeMl: ward.volumeMl,
        diluent: ward.diluent ?? "NaCl 0,9%",
        // Chỉ công thức ĐÃ LƯU mới có cơ sở thật để tính giọt/phút — drug.mix tĩnh không có, nên
        // nhánh dưới vẫn ẩn phần giọt/phút thay vì bịa thời gian truyền.
        infuseMinutes: ward.infuseMinutes,
        dropFactor: ward.dropFactor,
      }
    const mix = drug.mix
    if (mix != null && mix.vialAmount != null)
      return {
        vialAmount: mix.vialAmount,
        vialUnit: mix.vialUnit ?? "mg",
        vialForm: mix.vialForm ?? "powder",
        vialVolumeMl: mix.vialVolumeMl,
        vials: null as number | null,
        volumeMl: null as number | null,
        diluent: mix.diluents?.[0] ?? "NaCl 0,9%",
        infuseMinutes: undefined as number | undefined,
        dropFactor: undefined as number | undefined,
      }
    return null
  }, [ward, drug.mix])
  // Một số mức liều viết dạng "Liều nạp 20–25 mg/kg, sau đó theo nồng độ đáy" — con số mg/kg ở đây
  // là liều NẠP một lần, còn liều DUY TRÌ (thứ cần tính lặp lại mỗi lần pha) được nói thẳng là
  // "theo nồng độ đo được", tức KHÔNG có con số cố định. Nếu cứ lấy đại con số mg/kg đứng trước rồi
  // tính ra mL thì sẽ đưa ra một "Cách dùng" trông chắc chắn cho một liều thực ra phải cá thể hoá —
  // đúng kiểu tự suy diễn nguy hiểm mà app tránh ở mọi chỗ khác. Chỉ cần bỏ qua tier đó là đủ an toàn.
  const notComputableDose = /theo nồng độ|cá thể hoá|giãn khoảng liều/i.test(tier.dose)
  const doseTargetMg = useMemo(() => {
    if (notComputableDose) return null
    const perKg = perKgDoses[0]
    if (perKg && dosingWeight.used != null) {
      return { low: perKg.low * dosingWeight.used, high: perKg.high != null ? perKg.high * dosingWeight.used : null, unit: perKg.unit }
    }
    if (perKg) return null // liều mg/kg mà chưa có cân nặng thì không đoán được
    const fixed = findFixedDose(tier.dose)
    return fixed ? { low: fixed.amount, high: null, unit: fixed.unit } : null
  }, [notComputableDose, perKgDoses, dosingWeight.used, tier.dose])
  const autoUsage = useMemo(() => {
    if (!mixCfg || !doseTargetMg) return null
    if (mixCfg.vialForm === "fixed") {
      if (mixCfg.vialVolumeMl == null) return null
      const loMl = drawFromFixedVial(doseTargetMg.low, doseTargetMg.unit, mixCfg.vialAmount, mixCfg.vialUnit, mixCfg.vialVolumeMl)
      const hiMl = doseTargetMg.high != null ? drawFromFixedVial(doseTargetMg.high, doseTargetMg.unit, mixCfg.vialAmount, mixCfg.vialUnit, mixCfg.vialVolumeMl) : loMl
      if (loMl == null || hiMl == null) return null
      const pickedMl = doseTargetMg.high != null ? pickEasiestVolume(loMl, hiMl) : loMl
      const f = massFactor(mixCfg.vialUnit, doseTargetMg.unit)
      const pickedDose = f != null ? (pickedMl / mixCfg.vialVolumeMl) * mixCfg.vialAmount * f : doseTargetMg.low
      // Liều tính ra đúng bằng cả chai (vd Levofloxacin 750 mg = trọn chai 750 mg/150 mL) → nói "01
      // chai" đúng mẫu, không nói "lấy 750 mg" (đúng số nhưng sai câu chữ thực tế người pha dùng).
      const isWholeVial = pickedMl >= mixCfg.vialVolumeMl - 1e-6
      // Chỉ tính giọt/phút khi công thức ĐÃ LƯU có khai thời gian truyền dự kiến — không có thì ẩn
      // hẳn phần này thay vì bịa một thời gian truyền không ai xác nhận.
      const dropsPerMin =
        routeShort === "TTM" && mixCfg.infuseMinutes != null ? dropsPerMinute(pickedMl, mixCfg.infuseMinutes, mixCfg.dropFactor ?? DEFAULT_DROP_FACTOR) : null
      return formatFixedUsage({
        name: drug.name,
        vialAmount: mixCfg.vialAmount,
        vialUnit: mixCfg.vialUnit,
        vialVolumeMl: mixCfg.vialVolumeMl,
        doseAmount: isWholeVial ? undefined : pickedDose,
        doseUnit: doseTargetMg.unit,
        route: routeShort,
        dropsPerMin,
      })
    }
    const f = massFactor(doseTargetMg.unit, mixCfg.vialUnit)
    if (f == null) return null
    const neededHigh = (doseTargetMg.high ?? doseTargetMg.low) * f // đơn vị vialUnit
    const neededLow = doseTargetMg.low * f

    let vials: number
    let volumeMl: number
    if (mixCfg.vials != null && mixCfg.volumeMl != null) {
      // Có công thức đã lưu (ward) — dùng ĐÚNG số lọ/ống và thể tích đã pha thật, không tự đoán
      // lại. Liều cần vượt quá tổng lượng thuốc thật có trong bơm/chai đã pha thì dừng — không tự
      // ý cộng thêm lọ ngoài công thức người dùng đã xác nhận.
      vials = mixCfg.vials
      volumeMl = mixCfg.volumeMl
      if (neededHigh > vials * mixCfg.vialAmount + 1e-9) return null
    } else {
      // Không có công thức đã lưu — tự tính số lọ/ống cần dùng (làm tròn LÊN) thay vì giả định cứng
      // "đúng 1 lọ" như trước (khiến liều theo cân nặng vượt 1 lọ luôn bị bỏ qua), pha theo tỉ lệ
      // mặc định 100 mL cho mỗi lọ khi chưa biết quy cách pha thật của khoa.
      vials = Math.max(1, Math.ceil(neededHigh / mixCfg.vialAmount - 1e-9))
      volumeMl = vials * 100
    }
    const conc = (vials * mixCfg.vialAmount) / volumeMl
    if (!(conc > 0)) return null
    const loMl = neededLow / conc
    const hiMl = neededHigh / conc
    if (hiMl > volumeMl + 1e-9) return null
    const pickedMl = doseTargetMg.high != null ? pickEasiestVolume(loMl, hiMl) : loMl
    // Liều tính ra dùng ĐÚNG trọn lượng vừa pha (không cần rút riêng một phần) → câu gọn như mẫu
    // 3b, không lặp lại "đủ X ml lấy Y ml" một cách thừa thãi.
    const isWholeBatch = pickedMl >= volumeMl - 1e-6
    // Chỉ tính giọt/phút khi công thức ĐÃ LƯU có khai thời gian truyền dự kiến — không có thì ẩn hẳn
    // phần này thay vì bịa một thời gian truyền không ai xác nhận (xem mixCfg ở trên).
    const dropsPerMin =
      routeShort === "TTM" && mixCfg.infuseMinutes != null ? dropsPerMinute(pickedMl, mixCfg.infuseMinutes, mixCfg.dropFactor ?? DEFAULT_DROP_FACTOR) : null
    return formatVialUsage({
      name: drug.name,
      vialAmount: mixCfg.vialAmount,
      vialUnit: mixCfg.vialUnit,
      vialsUsed: vials,
      vialLabel: drug.mix?.vialLabel ?? (mixCfg.vialForm === "solution" ? "ống" : "lọ"),
      // Chỉ ống dung dịch mới có thể tích riêng đáng nói kiểu "1 g/4 ml" (mẫu 4b) — lọ bột chưa có
      // thể tích tới khi hoàn nguyên, thể tích đó đã nằm trong "đủ X ml" bên dưới rồi.
      vialVolumeMl: mixCfg.vialForm === "solution" ? mixCfg.vialVolumeMl ?? undefined : undefined,
      diluentName: mixCfg.diluent,
      route: routeShort,
      finalVolumeMl: isWholeBatch ? undefined : volumeMl,
      drawMl: isWholeBatch ? undefined : pickedMl,
      dropsPerMin,
    })
  }, [mixCfg, doseTargetMg, drug.name, drug.mix?.vialLabel, routeShort])
  const highWarnings = (drug.warnings ?? []).filter((w) => w.severity === "cao")
  const otherWarnings = (drug.warnings ?? []).filter((w) => w.severity !== "cao")
  const rrtDoseText =
    patient.rrt !== "none" && drug.rrt ? (drug.rrt as Record<string, string | undefined>)[patient.rrt] : undefined
  const weightLabelVi: Record<"ABW" | "IBW" | "AdjBW", string> = {
    ABW: "cân nặng thực tế (ABW)",
    IBW: "cân nặng lý tưởng (IBW)",
    AdjBW: "cân nặng hiệu chỉnh (AdjBW)",
  }
  return (
    <div className="p-4 rounded-2xl border" style={{ borderColor: "var(--c-line)", background: "var(--c-surface)" }}>
      <div className="flex items-center justify-between mb-0.5 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="font-bold text-slate-900 text-[13px] truncate">{drug.name}</p>
          {drug.isCustom && (
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-none"
              style={isOverride ? { background: "var(--c-primary-soft)", color: "var(--c-primary)" } : { background: "var(--c-green-soft)", color: "var(--c-green)" }}
            >
              {isOverride ? "Đã chỉnh sửa" : "Tự nhập"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-none">
          {/* Nhãn bậc liều hiện cả khi CHƯA có CrCl (màu vàng = đang giả định), thay vì biến mất —
              biến mất khiến bậc "thận bình thường" trông giống liều duy nhất của thuốc. */}
          {tiers.length > 1 && (
            <span
              className={`${T.meta} font-semibold px-2 py-0.5 ${R.pill}`}
              style={
                effectiveCrcl != null
                  ? { background: C.primarySoft, color: C.primary }
                  : { background: C.warnSoft, color: C.warn }
              }
            >
              {effectiveCrcl != null ? tier.label : `${tier.label} (giả định)`}
            </span>
          )}
          {onEdit && (
            <button onClick={() => onEdit(drug)} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--c-primary-soft)", color: "var(--c-primary)" }} aria-label="Sửa">
              {icons.edit()}
            </button>
          )}
          {drug.isCustom && onDelete && (isOverride ? (
            <button
              onClick={() => onDelete(drug.id)}
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "var(--c-line-soft)", color: "var(--c-text-soft)" }}
              aria-label="Khôi phục mặc định"
            >
              {icons.undo()}
            </button>
          ) : (
            <ConfirmIconButton
              onConfirm={() => onDelete(drug.id)}
              ariaLabel="Xoá"
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-icon)" }}
            />
          ))}
        </div>
      </div>
      <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--c-accent)" }}>{drug.route}</p>
      {disease && (
        <p className="text-[11px] font-semibold mb-1.5 px-2 py-0.5 rounded-full inline-block" style={{ background: "var(--c-primary-soft)", color: "var(--c-primary)" }}>
          Chỉ định: {disease.name}
        </p>
      )}
      {drug.doseWeightBasis && drug.doseWeightBasis !== "actual" && (
        <div className="mb-1.5 px-2.5 py-2 rounded-xl" style={{ background: "var(--c-warn-soft)", border: "1px solid var(--c-warn-line)" }}>          {dosingWeight.used != null && dosingWeight.usedLabel ? (
            <>
              <p className="text-[11px] font-bold" style={{ color: "var(--c-warn)" }}>
                Liều mg/kg dùng {weightLabelVi[dosingWeight.usedLabel]}: {dosingWeight.used.toFixed(1)} kg
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--c-warn-3)" }}>
                ABW {dosingWeight.abw?.toFixed(1)} kg
                {dosingWeight.ibw != null && ` · IBW ${dosingWeight.ibw.toFixed(1)} kg`}
                {dosingWeight.adjBw != null && ` · AdjBW ${dosingWeight.adjBw.toFixed(1)} kg`}
              </p>
            </>
          ) : (
            <p className="text-[11px] font-bold" style={{ color: "var(--c-warn)" }}>
              Thuốc này cần cân nặng lý tưởng/hiệu chỉnh — nhập cân nặng và chiều cao ở trên để tính chính xác.
            </p>
          )}
        </div>
      )}
      {/* Lọc máu / CRRT: đây chính là nhóm bệnh nhân cần app nhất, và cũng là nhóm app dễ im lặng
          nhất. Bậc liều theo CrCl bị vô hiệu hoá, và nếu app không có dữ liệu thì phải nói thẳng. */}
      {patient.rrt !== "none" && (
        <div className="mb-1.5 px-2.5 py-2 rounded-xl" style={{ background: "var(--c-danger-soft)", border: "1px solid var(--c-danger-line)" }}>
          <p className="text-[11px] font-bold leading-[1.45]" style={{ color: "var(--c-danger-deep)" }}>
            {RRT_LABELS[patient.rrt]} — bậc liều theo CrCl KHÔNG áp dụng.
          </p>
          {rrtDoseText ? (
            <>
              <p className="text-[13px] font-bold leading-[1.45] mt-1" style={{ color: "var(--c-danger-deep)" }}>{rrtDoseText}</p>
              {/* Liều CRRT là con số CÓ ĐIỀU KIỆN — thiếu Qeff thì chưa đọc được nó thuộc cột nào */}
              {needsCrrtFlow(patient.rrt) && !(parseFloat(patient.crrtFlowLPerH) > 0) && (
                <button onClick={openPatientPanel} className="text-[11px] font-bold underline text-left leading-[1.45] mt-1" style={{ color: "var(--c-danger)" }}>
                  Chưa nhập tốc độ dịch thải (Qeff) — nhập ở khung "Bệnh nhân hiện tại" để biết khuyến cáo trên ứng với mức lọc nào.
                </button>
              )}
            </>
          ) : (
            <p className="text-[11px] leading-[1.45] mt-0.5" style={{ color: "var(--c-danger-deep)" }}>
              App CHƯA có dữ liệu liều cho phương thức lọc này với {drug.name}. Tra phác đồ lọc máu của cơ sở hoặc hỏi dược lâm sàng — liều và thời điểm dùng phụ thuộc phương thức lọc, liều lọc và lịch buổi lọc. Nhập được vào app qua nút Sửa để lần sau khỏi tra lại.
            </p>
          )}
          {drug.rrt?.note && <p className="text-[11px] leading-[1.45] mt-1" style={{ color: "var(--c-danger-deep)" }}>{drug.rrt.note}</p>}
          {(drug.rrt?.source || drug.rrt?.reviewedOn) && (
            <p className="text-[11px] leading-[1.45] mt-1" style={{ color: "var(--c-danger)" }}>
              {drug.rrt.source && <>Nguồn liều lọc máu: {drug.rrt.source}</>}
              {drug.rrt.source && drug.rrt.reviewedOn && " · "}
              {drug.rrt.reviewedOn && <>Rà soát: {formatReviewedOn(drug.rrt.reviewedOn)}</>}
            </p>
          )}
        </div>
      )}
      {patient.rrt === "none" && patient.akiUnstable && (
        <div className="mb-1.5 px-2.5 py-2 rounded-xl" style={{ background: "var(--c-warn-soft)", border: "1px solid var(--c-warn-line)" }}>
          <p className="text-[11px] font-bold leading-[1.45]" style={{ color: "var(--c-warn)" }}>
            Tổn thương thận cấp (creatinin chưa ổn định) — Cockcroft-Gault không dùng được, app đang hiển thị liều bậc thận bình thường. Chỉnh liều theo lâm sàng, nồng độ thuốc đo được và ý kiến dược lâm sàng.
          </p>
        </div>
      )}

      {/* Chưa có CrCl: nói thẳng con số bên dưới đang giả định điều gì, và mở sẵn đường đi nhập */}
      {missingCrcl && (
        <button
          onClick={openPatientPanel}
          className={`w-full text-left mb-1.5 px-2.5 py-2 ${R.box} flex items-start gap-2`}
          style={{ background: C.warnSoft, border: `1px solid ${C.warnLine}` }}
        >
          <span className="mt-0.5 flex-none" style={{ color: C.warnIcon }}>{icons.alert()}</span>
          <span>
            <span className={`${T.meta} font-bold block`} style={{ color: C.warn }}>
              Chưa có CrCl — đang hiện liều bậc THẬN BÌNH THƯỜNG
            </span>
            <span className={`${T.meta} block mt-0.5`} style={{ color: "var(--c-warn-3)" }}>
              Thuốc này có {tiers.length} bậc liều theo chức năng thận. Nhập tuổi, cân nặng và creatinin ở khung "Bệnh nhân hiện tại" để app chọn đúng bậc.
            </span>
          </span>
        </button>
      )}

      <p className={T.body} style={{ color: "var(--c-text-2)" }}>{tier.dose}</p>

      {/* Nhân sẵn mg/kg × cân nặng — phần trước đây bắt người dùng tự nhẩm */}
      {perKgDoses.length > 0 && (
        <div className="mt-1.5 px-2.5 py-2 rounded-xl" style={{ background: "var(--c-accent-soft)", border: "1px solid var(--c-accent-line)" }}>
          {dosingWeight.used != null ? (
            <>
              {perKgDoses.map((d, i) => (
                <p key={i} className="text-[11px] leading-[1.45]" style={{ color: "var(--c-accent-deep)" }}>
                  <b>{d.raw}</b> × {dosingWeight.used?.toFixed(1)} kg
                  {dosingWeight.usedLabel && dosingWeight.usedLabel !== "ABW" ? ` (${dosingWeight.usedLabel})` : ""} = <b>{computePerKgText(d, dosingWeight.used)}</b> mỗi lần dùng
                </p>
              ))}
              <p className="text-[11px] leading-[1.45] mt-0.5" style={{ color: "var(--c-accent)" }}>
                Còn phải làm tròn theo hàm lượng lọ/ống thực tế và ngưỡng liều tối đa của thuốc.
              </p>
            </>
          ) : (
            <button onClick={openPatientPanel} className="text-[11px] font-bold text-left leading-[1.45]" style={{ color: "var(--c-accent-deep)" }}>
              Nhập cân nặng ở khung "Bệnh nhân hiện tại" để app nhân sẵn liều mg/kg.
            </button>
          )}
        </div>
      )}

      {/* Cách dùng tự tính theo mức liều CrCl hiện tại — chỉ hiện khi đọc được cả con số liều lẫn
          công thức pha, xem autoUsage ở trên. */}
      {autoUsage && (
        <div className="mt-1.5 px-2.5 py-2 rounded-xl" style={{ background: "var(--c-primary-soft)", border: "1px solid var(--c-primary)" }}>
          <p className="text-[11px] font-bold leading-[1.45]" style={{ color: "var(--c-primary)" }}>{autoUsage}</p>
          <p className="text-[11px] leading-[1.45] mt-0.5" style={{ color: "var(--c-text-soft)" }}>
            Tự tính theo {tier.label} {ward ? "và công thức pha của bạn" : "và công thức pha mặc định"} — kiểm tra lại trước khi dùng.
          </p>
        </div>
      )}

      {/* Chỉ hiện "Liều chuẩn" khi nó KHÁC dòng liều ở trên — trước đây meropenem in ra "1 g mỗi 8h"
          rồi ngay dưới lại "Liều chuẩn: 1 g mỗi 8h (IV)", đọc như hai thông tin khác nhau. */}
      {standardDose && effectiveCrcl == null && !standardDose.startsWith(tier.dose) && (
        <p className={`${T.meta} mt-1`} style={{ color: C.muted }}>Liều chuẩn: {standardDose}</p>
      )}

      {/* Cảnh báo mức cao luôn hiện; phần còn lại gấp lại giống thẻ thuốc truyền */}
      {highWarnings.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {highWarnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-2 px-2.5 py-2 ${R.box}`} style={{ background: C.dangerSoft, border: `1px solid ${C.dangerLine}` }}>
              <span className="mt-0.5 flex-none" style={{ color: C.dangerIcon }}>{icons.alert()}</span>
              <p className={T.bodyStrong} style={{ color: C.danger }}>{w.text}</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => {
          pinRunning({
            drugId: drug.id,
            name: drug.name,
            compatKey: drug.compatKey,
            line: 1,
            doseText: tier.dose,
            rateText: "",
            concText: drug.route,
            kind: "intermittent",
            weightKgAtPin: abwKg,
          })
          tickHaptic()
        }}
        className={`${BTN_BLOCK} mt-3`}
        style={{ borderColor: C.accentLine, background: C.accentSoft, color: C.accent }}
      >
        Thêm vào danh sách đang dùng
      </button>

      {(drug.boluses?.length ?? 0) > 0 && (
        <Disclosure label="Liều nạp / bolus" count={drug.boluses?.length}>
          <BolusList boluses={drug.boluses} drugName={drug.name} doseWeightBasis={drug.doseWeightBasis} />
        </Disclosure>
      )}

      {/* Cách dùng gộp chung với bảng pha, và nội dung ĐỘNG theo công thức đã lưu — giống bên thuốc
          truyền: trước đây "Cách dùng · Ghi chú" chỉ đọc câu chữ dựng sẵn, còn "Bảng pha thuốc" là
          nút riêng — cùng nói về một việc nhưng tách hai chỗ. */}
      {(injectable || drug.preparation || indication?.note || drug.note) && (
        <Disclosure label="Cách dùng · Ghi chú">
          {ward ? (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex-none" style={{ color: "var(--c-accent)" }}>{icons.edit()}</span>
              <div className="flex-1 min-w-0">
                <p className={`${T.meta} font-bold`} style={{ color: "var(--c-accent-deep)" }}>
                  Công thức của bạn (lưu {formatSavedAt(ward.savedAt)}) — khác công thức hệ thống
                </p>
                <p className={`${T.body} mt-0.5`} style={{ color: C.textSoft }}>
                  {ward.vials} {ward.vialForm === "powder" ? "lọ" : "ống"} × {formatMass(ward.vialAmount, ward.vialUnit)} vừa đủ {trim(ward.volumeMl)} mL
                  {ward.diluent ? `, dung môi ${ward.diluent}` : ""}.
                </p>
                <button
                  onClick={() => {
                    clearWard(drug.id, ward.id)
                    tickHaptic()
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-bold mt-1.5"
                  style={{ color: "var(--c-danger)" }}
                >
                  <span className="scale-90">{icons.undo()}</span>
                  Hoàn tác — dùng lại công thức hệ thống
                </button>
              </div>
            </div>
          ) : (
            drug.preparation && <p className={T.body} style={{ color: C.textSoft }}>{drug.preparation}</p>
          )}
          {indication?.note && <p className={`${T.meta} mt-2`} style={{ color: C.muted }}>{indication.note}</p>}
          {drug.note && <p className={`${T.meta} mt-2`} style={{ color: C.muted }}>{drug.note}</p>}

          {injectable && (
            <>
              <button
                onClick={() => setShowMix((v) => !v)}
                className={`${BTN_BLOCK} mt-3`}
                style={{ borderColor: C.accentLine, background: C.accentSoft, color: C.accent }}
              >
                {showMix ? "Đóng bảng pha thuốc" : "Bảng pha thuốc"}
              </button>
              {showMix && <AntibioticMixPanel drug={drug} />}
            </>
          )}
        </Disclosure>
      )}

      {otherWarnings.length > 0 && (
        <Disclosure label="Lưu ý khác" count={otherWarnings.length} alert>
          <DrugWarnings warnings={otherWarnings} bare />
        </Disclosure>
      )}

      {/* `alert` khi thuốc chưa ghi nguồn: trước đây phải MỞ khối này ra mới biết mục nào chưa được
          rà soát, nên trên thực tế không ai biết. Nay tình trạng nằm ngay trên tiêu đề. */}
      <Disclosure label={drug.source || drug.reviewedOn ? "Nguồn dữ liệu" : "Nguồn dữ liệu — chưa ghi nguồn"} alert={!drug.source && !drug.reviewedOn}>
        <SourceLine item={drug} bare />
      </Disclosure>
    </div>
  )
}

const DISEASE_SKIP = "__skip__"

function AntibioticsScreen({
  customDrugs,
  diseases,
  onAddNew,
  onEdit,
  onDelete,
}: {
  customDrugs: Antibiotic[]
  diseases: DiseaseEntry[]
  onAddNew: () => void
  onEdit: (drug: Antibiotic) => void
  onDelete: (id: string) => void
}) {
  const { running, collapsePatientPanel } = useDosing()
  // Cả bốn bước chọn đều giữ lại khi rời màn hình rồi quay lại: đi tra một thứ khác rồi về mà phải
  // bấm lại từ hoạt chất → bệnh lý → đường dùng là mất đúng công đoạn dài nhất của màn này.
  const [query, setQuery] = useStickyState("abx.query", "")
  const [selectedGroupName, setSelectedGroupName] = useStickyState<string | null>("abx.group", null)
  const [diseaseChoice, setDiseaseChoice] = useStickyState<string | null>("abx.disease", null) // disease id, DISEASE_SKIP, hoặc null (chưa chọn)
  const [selectedEntryId, setSelectedEntryId] = useStickyState<string | null>("abx.entry", null)

  // Tuổi/cân nặng/chiều cao/creatinin và cả phép tính CrCl nay nằm ở khung "Bệnh nhân hiện tại"
  // dùng chung cho mọi tab của Dùng thuốc (xem PatientPanel) — mỗi thẻ thuốc tự đọc từ context.
  const allAntibiotics = useMemo(() => mergeWithOverrides(ANTIBIOTICS, customDrugs), [customDrugs])

  // Nhóm các bản ghi theo hoạt chất (name) — cùng hoạt chất có thể có nhiều đường dùng (route)
  // khác nhau, mỗi đường dùng là một Antibiotic riêng (id riêng) để tránh đè dữ liệu lên nhau.
  const groups = useMemo(() => {
    const map = new Map<string, Antibiotic[]>()
    allAntibiotics.forEach((d) => {
      const arr = map.get(d.name) ?? []
      arr.push(d)
      map.set(d.name, arr)
    })
    return Array.from(map.entries()).map(([name, entries]) => ({ name, entries }))
  }, [allAntibiotics])

  const filteredGroups = useMemo(() => {
    const q = normalizeSearch(query)
    return q ? groups.filter((g) => normalizeSearch(g.name).includes(q)) : groups
  }, [groups, query])
  // Gõ tới khi chỉ còn một hoạt chất thì chọn luôn — giống bên các tab thuốc truyền.
  const effectiveGroupName = selectedGroupName ?? (query.trim() && filteredGroups.length === 1 ? filteredGroups[0].name : null)
  const selectedGroup = effectiveGroupName ? groups.find((g) => g.name === effectiveGroupName) ?? null : null

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

  const selectedDisease =
    diseaseChoice && diseaseChoice !== DISEASE_SKIP ? diseases.find((d) => d.id === diseaseChoice) ?? null : null

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

  const readyForEntry = !hasDiseaseStep || diseaseChoice !== null
  const autoEntry = readyForEntry && qualifyingEntries.length === 1 ? qualifyingEntries[0] : null
  const selectedEntry = autoEntry ?? (selectedEntryId ? qualifyingEntries.find((e) => e.id === selectedEntryId) ?? null : null)
  const showRouteStep = readyForEntry && qualifyingEntries.length > 1

  function selectGroup(name: string | null) {
    setSelectedGroupName(name)
    setDiseaseChoice(null)
    setSelectedEntryId(null)
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
          <SectionLabel tone="accent">Đang dùng cho bệnh nhân · {onPatient.length}</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {onPatient.map((d) => {
              const on = selectedEntry?.id === d.id
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    setQuery("")
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
      <div className="flex flex-wrap gap-2 mb-3">
        {filteredGroups.map((g, i) => (
          <Chip key={g.name} index={i} active={effectiveGroupName === g.name} onClick={() => selectGroup(effectiveGroupName === g.name ? null : g.name)}>
            {g.name}
            {g.entries.length > 1 && <span className="opacity-60"> · {g.entries.length}</span>}
          </Chip>
        ))}
      </div>

      {/* Chỉ định — chỉ hiện khi hoạt chất có liều riêng theo bệnh lý, và luôn TRƯỚC bước đường dùng */}
      {selectedGroup && hasDiseaseStep && (
        <div key={selectedGroup.name} className="fade-in mb-3">
          <SectionLabel>Chỉ định</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {diseasesForGroup.map((ds) => (
              <Chip key={ds.id} active={diseaseChoice === ds.id} onClick={() => chooseDisease(ds.id)}>
                {ds.name}
              </Chip>
            ))}
            <Chip active={diseaseChoice === DISEASE_SKIP} onClick={() => chooseDisease(DISEASE_SKIP)}>
              Liều chung
            </Chip>
          </div>
        </div>
      )}

      {/* Đường dùng — chỉ hiện khi còn nhiều hơn một lựa chọn phù hợp */}
      {selectedGroup && showRouteStep && (
        <div key={`${selectedGroup.name}-${diseaseChoice ?? "none"}`} className="fade-in mb-3">
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
        <div key={`${selectedEntry.id}-${selectedDisease?.id ?? "none"}`} className="fade-in">
          <AntibioticDoseCard
            drug={selectedEntry}
            disease={selectedDisease}
            isOverride={Boolean(selectedEntry.isCustom) && STATIC_ANTIBIOTIC_IDS.has(selectedEntry.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      ) : (
        <p className={`${T.body} text-center px-4 py-6 ${R.card}`} style={{ background: C.surfaceAlt, color: C.muted }}>
          {filteredGroups.length === 0
            ? "Không tìm thấy kháng sinh phù hợp."
            : !selectedGroup
              ? "Chọn một kháng sinh ở trên để xem liều theo CrCl."
              : hasDiseaseStep && diseaseChoice === null
                ? "Chọn chỉ định ở trên (hoặc Liều chung) để tiếp tục."
                : "Chọn đường dùng ở trên để xem liều."}
        </p>
      )}
      </div>

      <button
        onClick={onAddNew}
        className={`w-full flex items-center justify-center gap-2 h-11 ${R.box} border border-dashed mt-3 ${T.bodyStrong}`}
        style={{ borderColor: C.primaryLine, color: C.primary }}
      >
        <span className="scale-90">{icons.plus()}</span>
        Thêm kháng sinh tự nhập
      </button>
    </div>
  )
}

// ─── Thuốc co bóp cơ tim / Thuốc vận mạch ─────────────────────────────────────

// Tính tốc độ truyền (mL/h) từ cân nặng (nếu thuốc chỉnh theo cân nặng), nồng độ pha, và liều mong muốn.
// unitScale quy đổi nồng độ về cùng đơn vị với liều (vd. mg/mL -> mcg/mL nhân 1000; đơn vị/mL giữ nguyên).
// doseTimeBasis: đa số thuốc nhập liều theo phút (mcg/kg/phút, mg/phút...) nên cần nhân 60 để ra liều/giờ;
// một số thuốc (vd. Nicardipine tính mg/giờ) đã nhập liều theo giờ sẵn nên không nhân 60 nữa.
// Máy tính pha thuốc: đổi được đơn vị liều và chạy được cả HAI CHIỀU.
// - "Liều → Tốc độ": biết muốn truyền bao nhiêu liều, cần đặt bơm mấy mL/giờ.
// - "Tốc độ → Liều": nhìn bơm đang chạy mấy mL/giờ, suy ra bệnh nhân đang nhận liều bao nhiêu
//   (tình huống rất hay gặp khi nhận bàn giao ca hoặc kiểm tra lại y lệnh).
// Toàn bộ quy đổi nằm trong lib/infusion.ts, không phụ thuộc hệ số khai báo sẵn theo từng thuốc.
// ─── Liều nạp / bolus ─────────────────────────────────────────────────────────
// Amiodarone, magie, lidocaine, esmolol... đều phải nạp trước rồi mới duy trì. Trước đây liều nạp
// chỉ nằm trong câu chữ "Cách pha" và không được tính giúp — dù đây đúng là chỗ dễ nhẩm sai nhất
// (liều theo mg/kg, nhân nhẩm lúc cấp cứu).
function BolusList({
  boluses,
  drugName,
  doseWeightBasis,
}: {
  boluses: BolusDose[] | undefined
  drugName: string
  doseWeightBasis?: WeightBasis
}) {
  const { abwKg, heightCm, patient, openPatientPanel, logCalc } = useDosing()
  const dosingWeight = useMemo(
    () => resolveDosingWeight(abwKg, heightCm, patient.sex, doseWeightBasis ?? "actual"),
    [abwKg, heightCm, patient.sex, doseWeightBasis],
  )
  const weightKg = dosingWeight.used
  const list = boluses ?? []
  if (list.length === 0) return null

  function describe(b: BolusDose): { text: string; needWeight: boolean; perKgText: string | null } {
    if (b.perKgLow != null) {
      const perKgText = b.perKgHigh != null ? `${b.perKgLow}–${b.perKgHigh} ${b.unit}/kg` : `${b.perKgLow} ${b.unit}/kg`
      if (weightKg == null) return { text: "—", needWeight: true, perKgText }
      const lo = b.perKgLow * weightKg
      const hi = b.perKgHigh != null ? b.perKgHigh * weightKg : null
      const base = hi != null ? `${formatMass(lo, b.unit)} – ${formatMass(hi, b.unit)}` : formatMass(lo, b.unit)
      const withCap = b.maxSingle != null && (hi ?? lo) > b.maxSingle ? `${base} — nhưng không vượt quá ${formatMass(b.maxSingle, b.unit)}` : base
      return { text: withCap, needWeight: false, perKgText }
    }
    if (b.fixedLow != null) {
      const base = b.fixedHigh != null ? `${formatMass(b.fixedLow, b.unit)} – ${formatMass(b.fixedHigh, b.unit)}` : formatMass(b.fixedLow, b.unit)
      return { text: base, needWeight: false, perKgText: null }
    }
    return { text: "—", needWeight: false, perKgText: null }
  }

  // Tiêu đề mục do khối gấp/mở ở ngoài lo, ở đây chỉ vẽ danh sách.
  return (
    <div>
      {list.map((b, i) => {
        const info = describe(b)
        return (
          <div key={i} className="px-3 py-2.5 rounded-xl mb-1.5" style={{ background: "var(--c-warn-soft)", border: "1px solid var(--c-warn-line)" }}>
            <p className="text-[11px] font-bold leading-[1.45]" style={{ color: "var(--c-warn)" }}>{b.label}</p>
            {info.perKgText && <p className="text-[11px]" style={{ color: "var(--c-warn-3)" }}>Theo cân nặng: {info.perKgText}</p>}
            {info.needWeight ? (
              <button onClick={openPatientPanel} className="text-[11px] font-bold underline mt-0.5" style={{ color: "var(--c-warn-2)" }}>
                Nhập cân nặng ở khung "Bệnh nhân hiện tại" để tính ra số mg
              </button>
            ) : (
              <p className={`${T.title} ${NUM} mt-0.5`} style={{ color: C.warn }}>{info.text}</p>
            )}
            {b.over && <p className="text-[11px] leading-[1.45]" style={{ color: "var(--c-warn-3)" }}>Cách dùng: {b.over}</p>}
            {b.note && <p className="text-[11px] leading-[1.45] mt-0.5" style={{ color: "var(--c-warn-3)" }}>{b.note}</p>}
            {!info.needWeight && (
              <button
                onClick={() => {
                  logCalc({
                    drug: drugName,
                    kind: "bolus",
                    inputs: [b.label, ...(info.perKgText ? [`Liều theo cân nặng: ${info.perKgText}`] : []), ...(b.over ? [`Cách dùng: ${b.over}`] : [])],
                    output: info.text,
                  })
                  tickHaptic()
                }}
                className="text-[11px] font-bold mt-1.5"
                style={{ color: "var(--c-warn-2)" }}
              >
                Lưu vào nhật ký
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Bảng pha thuốc ───────────────────────────────────────────────────────────
// Chiều tính mà lúc đứng cạnh giường mới thực sự cần: "tôi có ống 250 mg, pha vừa đủ 50 mL" →
// nồng độ; và chiều ngược lại "tôi cần nồng độ này" → lấy mấy ống, rút bao nhiêu mL.
//
// Màn này dùng lúc gấp nên chỉ giữ những dòng dẫn thẳng tới một thao tác. Phần tra cứu (bảo quản
// sau pha, ngưỡng nồng độ cho đường ngoại biên) đã bỏ khỏi đây: mười dòng chữ quanh một con số thì
// lúc cần nhanh không ai đọc, mà chúng còn làm loãng đúng cái cảnh báo phải đọc. Dữ liệu vẫn còn
// trong data/*.ts để tra khi cần.
const MIX_UNIT_CHOICES = ["mcg", "mg", "g", "đơn vị", "mEq"]

// Một phương án pha đã tính xong — dùng chung cho cả hai chiều tính, để chiều nào cũng đi qua đúng
// một đường kiểm tra.
interface MixOutcome {
  concValue: number
  volumeMl: number
  // Số ống/lọ dùng thật — có thể lẻ khi rút một phần ống.
  vials: number
  // Số ống/lọ phải bóc ra. Chỉ khác `vials` ở phương án rút lẻ (phần thừa bỏ đi).
  vialsOpened: number
  // Thể tích thuốc phải rút, khi phương án là rút lẻ ống. null = dùng trọn ống.
  drawMl: number | null
  vialAmount: number
  vialUnit: string
  spec: VialSpec
  diluent: string
}

// Thể tích thuốc chiếm chỗ trong bơm/chai cuối cùng.
function outcomeDrugVolume(o: MixOutcome): number | null {
  return o.drawMl ?? vialsTotalVolume(o.vials, o.spec)
}

// Câu duy nhất người đứng cạnh bàn pha thực sự thao tác. Ba dạng, vì ba thao tác khác hẳn nhau:
// rút trọn ống dung dịch, hoàn nguyên lọ bột, và rút lẻ một phần ống.
function describeComposition(o: MixOutcome, vialLabel: string): string {
  const drugVolume = outcomeDrugVolume(o)
  const dil = diluentVolume(o.volumeMl, drugVolume)
  const mass = formatMass(o.vials * o.vialAmount, o.vialUnit)
  const finalText = `${trim(o.volumeMl)} mL`

  if (o.drawMl != null) {
    // Rút lẻ: con số phải nhớ là số mL rút ra, không phải số ống.
    const source =
      o.spec.form === "powder"
        ? `${o.vialsOpened} ${vialLabel} × ${formatMass(o.vialAmount, o.vialUnit)} đã pha ban đầu với ${trim(o.spec.reconstituteMl as number)} mL/${vialLabel}`
        : `${o.vialsOpened} ${vialLabel} × ${formatMass(o.vialAmount, o.vialUnit)}`
    const base = `Rút ${formatDoseNumber(o.drawMl)} mL (= ${mass}) từ ${source}`
    return dil != null ? `${base} + ${formatDoseNumber(dil)} mL ${o.diluent} = ${finalText}` : `${base}, pha vừa đủ ${finalText}`
  }

  const amount = `${trim(o.vials)} ${vialLabel} × ${formatMass(o.vialAmount, o.vialUnit)} = ${mass}`
  if (drugVolume == null || dil == null) return `${amount}, pha vừa đủ ${finalText}`

  if (o.spec.form === "powder") {
    const displaced = (o.spec.displacementMl ?? 0) > 0
    return `Pha ban đầu ${trim(o.vials)} ${vialLabel} với ${trim(o.spec.reconstituteMl as number)} mL → rút ${formatDoseNumber(drugVolume)} mL${displaced ? " (đã cộng thể tích bột tăng sau pha)" : ""} (${amount}) + ${formatDoseNumber(dil)} mL ${o.diluent} = ${finalText}`
  }
  return `Rút ${formatDoseNumber(drugVolume)} mL thuốc (${amount}) + ${formatDoseNumber(dil)} mL ${o.diluent} = ${finalText}`
}

// ─── Bơm này chạy được bao lâu ────────────────────────────────────────────────
// Câu quyết định "pha 50 hay 100 mL" — và trước đây phải đóng bảng pha, quay về máy tính liều mới
// trả lời được. Một dòng, ngay dưới công thức, ở đúng lúc đang chọn thể tích.
function MixRunTime({ drug, calc, concValue, volumeMl }: { drug: InfusionDrug; calc: InfusionCalcConfig; concValue: number; volumeMl: number }) {
  const { abwKg, heightCm, patient } = useDosing()
  const unit = useMemo(() => parseDoseUnit(calc.doseUnit), [calc.doseUnit])
  const weightKg = useMemo(
    () => resolveDosingWeight(abwKg, heightCm, patient.sex, drug.doseWeightBasis ?? "actual").used,
    [abwKg, heightCm, patient.sex, drug.doseWeightBasis],
  )
  if (!unit || !(concValue > 0) || !(volumeMl > 0)) return null

  const lo = doseToRate(calc.doseMin, unit, weightKg, concValue, calc.concUnit)
  const hi = doseToRate(calc.doseMax, unit, weightKg, concValue, calc.concUnit)
  if (lo == null || hi == null) {
    if (unit.perWeight && weightKg == null) {
      return (
        <p className={`${T.meta} mt-1`} style={{ color: C.muted }}>
          Nhập cân nặng ở khung Bệnh nhân để biết bơm này chạy được bao lâu.
        </p>
      )
    }
    return null
  }

  const slowest = infusionDurationHours(volumeMl, lo)
  const fastest = infusionDurationHours(volumeMl, hi)
  return (
    <p className={`${T.meta} ${NUM} mt-1`} style={{ color: C.textSoft }}>
      Liều thường dùng {calc.doseMin}–{calc.doseMax} {calc.doseUnit} → <b>{formatDoseNumber(lo)}–{formatDoseNumber(hi)} mL/giờ</b>
      {slowest != null && fastest != null && <> · {trim(volumeMl)} mL chạy được {formatDuration(fastest)} – {formatDuration(slowest)}</>}
    </p>
  )
}

function MixResultCard({
  drug,
  calc,
  outcome,
  vialLabel,
  refConc,
  refLabel,
  headline,
  subline,
  onUse,
  onSaveWard,
}: {
  drug: InfusionDrug
  calc: InfusionCalcConfig
  outcome: MixOutcome
  vialLabel: string
  refConc: number | undefined
  refLabel: string
  headline: string
  subline?: string
  onUse: () => void
  onSaveWard: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)

  const drugVolume = outcomeDrugVolume(outcome)
  const dil = diluentVolume(outcome.volumeMl, drugVolume)
  // Kiểm tra vật lý: riêng thể tích thuốc đã vượt thể tích cuối thì công thức không pha được.
  const impossible = dil != null && dil < -1e-9

  const grade = gradeConcentration(outcome.concValue, refConc, calc.mix?.maxConc, calc.concUnit, refLabel)
  useEffect(() => setConfirmed(false), [outcome.concValue, outcome.volumeMl, outcome.vials])
  const blocked = grade.requiresConfirm && !confirmed

  if (impossible) {
    const per = volumePerVial(outcome.spec)
    return (
      <div className="px-3 py-2.5 rounded-xl mb-1 flex items-start gap-2" style={{ background: "var(--c-danger-soft)", border: "1px solid var(--c-danger-icon)" }}>
        <span className="mt-0.5 flex-none" style={{ color: "var(--c-danger-icon)" }}>{icons.alert()}</span>
        <div>
          <p className="text-[13px] font-extrabold leading-[1.3]" style={{ color: "var(--c-danger-deep)" }}>KHÔNG PHA ĐƯỢC</p>
          <p className="text-[11px] leading-[1.45] mt-0.5" style={{ color: "var(--c-danger-deep)" }}>
            {trim(outcome.vials)} {vialLabel} × {trim(per as number)} mL = {formatDoseNumber(drugVolume as number)} mL thuốc, đã nhiều hơn thể tích cuối {trim(outcome.volumeMl)} mL. Kiểm tra lại số {vialLabel}, thể tích 1 {vialLabel} hoặc thể tích cuối.
          </p>
        </div>
      </div>
    )
  }

  const gradeStyle =
    grade.severity === "danger"
      ? { bg: "var(--c-danger-soft)", border: "var(--c-danger-icon)", fg: "var(--c-danger-deep)" }
      : grade.severity === "warn"
        ? { bg: "var(--c-orange-soft)", border: "var(--c-orange-line)", fg: "var(--c-orange)" }
        : { bg: "var(--c-warn-soft)", border: "var(--c-warn-line)", fg: "var(--c-warn)" }

  return (
    <div className="px-3 py-2.5 rounded-xl mb-1" style={{ background: "var(--c-surface)", border: "1px solid var(--c-line-strong)" }}>
      <p className="text-[13px] font-bold text-slate-800 leading-[1.45]">{headline}</p>
      {subline && <p className="text-[11px] text-slate-500 leading-[1.45] mt-0.5">{subline}</p>}
      {/* Câu duy nhất người đứng cạnh bàn pha thực sự thao tác */}
      <p className="text-[11px] font-semibold leading-[1.45] mt-1" style={{ color: "var(--c-accent-deep)" }}>
        {describeComposition(outcome, vialLabel)}
      </p>
      {drugVolume == null && (
        <p className="text-[11px] text-slate-500 leading-[1.45] mt-0.5">
          {outcome.spec.form === "powder"
            ? `Nhập thể tích pha ban đầu 1 ${vialLabel} ở trên để app tính ra số mL dung môi phải thêm.`
            : `Nhập thể tích 1 ${vialLabel} ở trên để app tính ra số mL dung môi phải thêm.`}
        </p>
      )}

      <MixRunTime drug={drug} calc={calc} concValue={outcome.concValue} volumeMl={outcome.volumeMl} />

      {grade.severity !== "ok" && (
        <div className="mt-2 px-2.5 py-2 rounded-xl flex items-start gap-2" style={{ background: gradeStyle.bg, border: `1px solid ${gradeStyle.border}` }}>
          <span className="mt-0.5 flex-none" style={{ color: gradeStyle.fg }}>{icons.alert()}</span>
          <div>
            {grade.headline && <p className="text-[11px] font-extrabold leading-[1.3]" style={{ color: gradeStyle.fg }}>{grade.headline}</p>}
            {grade.detail && <p className="text-[11px] leading-[1.45] mt-0.5" style={{ color: gradeStyle.fg }}>{grade.detail}</p>}
          </div>
        </div>
      )}

      {blocked ? (
        <button
          onClick={() => {
            setConfirmed(true)
            tickHaptic()
          }}
          className={`${BTN_TALL} mt-2 border-transparent`}
          style={{ background: gradeStyle.fg, color: "var(--c-on-bright)" }}
        >
          Tôi đã kiểm tra lại — vẫn dùng công thức này
        </button>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <button onClick={onUse} className="h-8 px-3 rounded-full text-[11px] font-bold" style={{ background: "var(--c-accent)", color: "var(--c-on-bright)" }}>
            Dùng nồng độ này
          </button>
          <button
            onClick={onSaveWard}
            className="h-8 px-3 rounded-full text-[11px] font-bold border"
            style={{ borderColor: "var(--c-accent-line)", color: "var(--c-accent-deep)" }}
          >
            Lưu công thức mới của bạn
          </button>
        </div>
      )}
    </div>
  )
}

// Ba cách xử lý khi số ống tính ra không tròn. Cách thứ ba (rút lẻ ống) mới là cách hay làm nhất
// với ống dung dịch: cần 200 mg từ ống 250 mg/20 mL thì rút 16 mL là xong, không việc gì phải đổ cả
// ống rồi nâng thể tích cuối lên cho khớp.
type MixRoundMode = "keepConc" | "keepVolume" | "partial"

function MixPanel({
  drug,
  calc,
  wardRecipe,
  onUseConc,
  onSaveWard,
}: {
  drug: InfusionDrug
  calc: InfusionCalcConfig
  wardRecipe?: WardRecipe
  onUseConc: (concValue: number, volumeMl: number) => void
  onSaveWard: (recipe: Omit<WardRecipe, "savedAt" | "id"> & { id?: string }) => void
}) {
  const { logCalc } = useDosing()
  const concMass = massOfConcUnit(calc.concUnit)
  const mix = calc.mix
  const vialLabel = mix?.vialLabel ?? "ống"

  // Công thức đã lưu (nếu có) được ưu tiên làm giá trị khởi tạo — đó là điểm khác biệt giữa một app
  // dùng hằng ngày và một app phải khai báo lại từ đầu mỗi lần mở.
  const [vialAmount, setVialAmount] = useState(String(wardRecipe?.vialAmount ?? mix?.vialAmount ?? ""))
  const [vialUnit, setVialUnit] = useState(wardRecipe?.vialUnit ?? mix?.vialUnit ?? concMass)
  const [vials, setVials] = useState(String(wardRecipe?.vials ?? mix?.vials ?? 1))
  // MỘT ô thể tích duy nhất cho cả hai chiều tính.
  const [volume, setVolume] = useState(String(wardRecipe?.volumeMl ?? mix?.volumeMl ?? 50))
  const [vialForm, setVialForm] = useState<VialForm>(wardRecipe?.vialForm ?? mix?.vialForm ?? "solution")
  const [vialVolume, setVialVolume] = useState(
    wardRecipe?.vialVolumeMl != null ? String(wardRecipe.vialVolumeMl) : mix?.vialVolumeMl != null ? String(mix.vialVolumeMl) : "",
  )
  const [reconstitute, setReconstitute] = useState(
    wardRecipe?.reconstituteMl != null ? String(wardRecipe.reconstituteMl) : mix?.reconstituteMl != null ? String(mix.reconstituteMl) : "",
  )
  const [displacement, setDisplacement] = useState(
    wardRecipe?.displacementMl != null ? String(wardRecipe.displacementMl) : mix?.displacementMl != null ? String(mix.displacementMl) : "",
  )
  const [diluent, setDiluent] = useState(wardRecipe?.diluent ?? mix?.diluents?.[0] ?? "NaCl 0,9%")
  const [target, setTarget] = useState("")
  const [roundMode, setRoundMode] = useState<MixRoundMode>("keepConc")
  const [saveTitle, setSaveTitle] = useState("")

  const unitChoices = useMemo(() => MIX_UNIT_CHOICES.filter((u) => massFactor(u, concMass) != null), [concMass])
  const allowedDiluents = mix?.diluents ?? ["NaCl 0,9%", "Glucose 5%"]
  const avoidDiluents = mix?.avoidDiluents ?? []
  // Cảnh báo dung môi chỉ nổ khi người dùng thực sự chọn dung môi cấm. Trước đây nó hiện thường
  // trực, nên chọn ĐÚNG Glucose 5% cho amiodarone vẫn thấy một khối đỏ — kiểu cảnh báo dạy người ta
  // bỏ qua màu đỏ.
  const diluentBlocked = avoidDiluents.includes(diluent)

  const va = parseFloat(vialAmount)
  const nv = parseFloat(vials)
  const vol = parseFloat(volume)
  const num = (s: string) => {
    const n = parseFloat(s)
    return isNaN(n) || n < 0 ? null : n
  }
  const spec = useMemo<VialSpec>(
    () => ({
      form: vialForm,
      volumeMl: vialForm === "solution" ? (num(vialVolume) || null) : null,
      reconstituteMl: vialForm === "powder" ? (num(reconstitute) || null) : null,
      displacementMl: vialForm === "powder" ? num(displacement) : null,
    }),
    [vialForm, vialVolume, reconstitute, displacement],
  )

  const mixedConc = concentrationFromVials(va, nv, vol, vialUnit, calc.concUnit)

  const tgt = parseFloat(target)
  const neededVialsRaw = vialsForConcentration(tgt, va, vol, vialUnit, calc.concUnit)
  const neededVials = neededVialsRaw != null ? Math.max(1, Math.ceil(neededVialsRaw - 1e-9)) : null
  const concIfRounded = neededVials != null ? concentrationFromVials(va, neededVials, vol, vialUnit, calc.concUnit) : null
  // Giữ ĐÚNG nồng độ mong muốn bằng cách chỉnh thể tích cuối thay vì chịu lệch nồng độ.
  const volForExact = neededVials != null ? volumeForConcentration(tgt, va, neededVials, vialUnit, calc.concUnit) : null
  const draw = useMemo(() => partialDraw(tgt, vol, va, vialUnit, calc.concUnit, spec), [tgt, vol, va, vialUnit, calc.concUnit, spec])
  const needsRounding = neededVialsRaw != null && neededVials != null && Math.abs(neededVialsRaw - neededVials) > 1e-6
  // Rút lẻ chỉ có nghĩa khi biết thể tích rút ra từ một ống. Không đủ số liệu thì không đưa lựa
  // chọn ra rồi để nó chết ở giữa — quay về phương án giữ nồng độ.
  const canDrawPartial = draw != null
  const mode: MixRoundMode = roundMode === "partial" && !canDrawPartial ? "keepConc" : roundMode

  const fieldClass = FIELD
  const fieldStyle = FIELD_STYLE

  // Mốc so sánh nồng độ: công thức người dùng đã lưu, nếu chưa lưu thì công thức dựng sẵn của app.
  const refConc = wardRecipe?.concValue ?? calc.concDefault
  const refLabel = wardRecipe ? "công thức của bạn" : "công thức chuẩn"

  function outcomeFor(concValue: number, volumeMl: number, vialsCount: number, opened?: number, drawMl?: number): MixOutcome {
    return {
      concValue,
      volumeMl,
      vials: vialsCount,
      vialsOpened: opened ?? Math.max(1, Math.ceil(vialsCount - 1e-9)),
      drawMl: drawMl ?? null,
      vialAmount: va,
      vialUnit,
      spec,
      diluent,
    }
  }

  function useOutcome(o: MixOutcome, inputs: string[]) {
    onUseConc(o.concValue, o.volumeMl)
    logCalc({
      drug: drug.name,
      kind: "mix",
      inputs: [...inputs, describeComposition(o, vialLabel)],
      output: `Nồng độ ${formatDoseNumber(o.concValue)} ${calc.concUnit} trong ${trim(o.volumeMl)} mL`,
    })
    tickHaptic()
  }

  function saveWardFrom(o: MixOutcome) {
    onSaveWard({
      drugId: drug.id,
      title: saveTitle.trim() || `${o.diluent} · ${o.vials} ${vialLabel}`,
      concValue: o.concValue,
      vialAmount: o.vialAmount,
      vialUnit: o.vialUnit,
      vials: o.vials,
      volumeMl: o.volumeMl,
      vialForm: o.spec.form,
      vialVolumeMl: o.spec.volumeMl ?? undefined,
      reconstituteMl: o.spec.reconstituteMl ?? undefined,
      displacementMl: o.spec.displacementMl ?? undefined,
      diluent: o.diluent,
    })
    setSaveTitle("")
    tickHaptic()
  }

  const pill = (on: boolean) =>
    on
      ? { background: "var(--c-accent)", borderColor: "var(--c-accent)", color: "var(--c-on-bright)" }
      : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }

  return (
    <div className="mt-2.5 p-3 rounded-xl fade-in" style={{ background: "var(--c-surface-alt)", border: "1px solid var(--c-line)" }}>
      {/* Dung môi — thông tin sống còn với thuốc kén dung môi */}
      <label className="text-[11px] font-medium text-slate-500 mb-1 block">Dung môi</label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {allowedDiluents.map((d) => (
          <button key={d} onClick={() => setDiluent(d)} className="h-8 px-2.5 rounded-full text-[11px] font-semibold border" style={pill(diluent === d)}>
            {d}
          </button>
        ))}
        {/* Dung môi cấm vẫn bấm được: "dùng NaCl có sao không" là câu người ta hỏi, và bấm vào để
            nhận câu trả lời đỏ rõ ràng thì tốt hơn là không tìm thấy nút nào để hỏi. */}
        {avoidDiluents.map((d) => (
          <button
            key={d}
            onClick={() => setDiluent(d)}
            className="h-8 px-2.5 rounded-full text-[11px] font-semibold border"
            style={
              diluent === d
                ? { background: "var(--c-danger-icon)", borderColor: "var(--c-danger-icon)", color: "var(--c-on-bright)" }
                : { background: "var(--c-surface)", borderColor: "var(--c-danger-line)", color: "var(--c-danger-deep)" }
            }
          >
            {d}
          </button>
        ))}
      </div>
      {diluentBlocked && (
        <p className="text-[11px] font-bold leading-[1.45] mb-2 px-2.5 py-2 rounded-xl" style={{ background: "var(--c-danger-soft)", color: "var(--c-danger-deep)" }}>
          {mix?.diluentWarning ?? `Không pha ${drug.name} với ${diluent}.`}
        </p>
      )}

      {/* Ống dung dịch hay lọ bột — hai thao tác khác hẳn nhau, và chọn sai thì con số mL dung môi
          in ra bên dưới sai theo. */}
      <label className="text-[11px] font-medium text-slate-500 mb-1 block">Dạng chế phẩm</label>
      <div className="flex gap-1.5 mb-2">
        {([
          { v: "solution" as VialForm, label: `Ống dung dịch` },
          { v: "powder" as VialForm, label: `Lọ bột` },
        ]).map((opt) => (
          <button key={opt.v} onClick={() => setVialForm(opt.v)} className="h-8 px-2.5 rounded-full text-[11px] font-semibold border" style={pill(vialForm === opt.v)}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mb-2">
        <label className="text-[11px] font-medium text-slate-500 mb-1 block">Tên công thức khi lưu (tuỳ chọn, vd: Khoa Hồi sức)</label>
        <input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} placeholder="Đặt tên để bấm nhanh đổi lại sau này" maxLength={40} className={fieldClass} style={fieldStyle} />
      </div>

      {/* Ống dung dịch: 3 ô ngắn vừa khít một hàng. Lọ bột thì tách "Pha ban đầu với (mL/lọ)" ra
          hàng riêng — nhãn này dài hơn hẳn "Thể tích 1 ống (mL)", nhét vào 1/3 hàng sẽ xuống dòng và
          đẩy ô nhập tụt xuống so với hai ô bên cạnh (không còn ngang hàng). */}
      <div className={`grid ${vialForm === "solution" ? "grid-cols-3" : "grid-cols-2"} gap-2 mb-2`}>
        <div>
          <label className="text-[11px] font-medium text-slate-500 mb-1 block">Hàm lượng 1 {vialLabel}</label>
          <input value={vialAmount} onChange={(e) => setVialAmount(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="250" className={fieldClass} style={fieldStyle} />
        </div>
        {vialForm === "solution" && (
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Thể tích 1 {vialLabel} (mL)</label>
            <input value={vialVolume} onChange={(e) => setVialVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="5" className={fieldClass} style={fieldStyle} />
          </div>
        )}
        <div>
          <label className="text-[11px] font-medium text-slate-500 mb-1 block">Số {vialLabel}</label>
          <input value={vials} onChange={(e) => setVials(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="1" className={fieldClass} style={fieldStyle} />
        </div>
      </div>

      {/* Xếp dọc, mỗi ô một hàng riêng — không ghép ngang: "Thể tích bột tăng sau pha" luôn dài hơn
          hẳn "Pha ban đầu với", và độ dài {vialLabel} (lọ/ống/chai) đổi theo từng thuốc nên không
          thể tin là hai nhãn sẽ luôn xuống dòng đối xứng nhau ở mọi cỡ chữ. */}
      {vialForm === "powder" && (
        <div className="space-y-2 mb-2">
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Pha ban đầu với (mL/{vialLabel})</label>
            <input value={reconstitute} onChange={(e) => setReconstitute(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="10" className={fieldClass} style={fieldStyle} />
          </div>
          <div>
            {/* Bột tan ra làm thể tích tăng thật: vancomycin 1 g tăng thêm ~0,7 mL. Bỏ qua là sai hệ
                thống theo một chiều — nồng độ thực luôn loãng hơn con số in ra. */}
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Thể tích bột tăng sau pha (mL/{vialLabel})</label>
            <input value={displacement} onChange={(e) => setDisplacement(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="0,7" className={fieldClass} style={fieldStyle} />
          </div>
        </div>
      )}

      <div className="mb-2">
        <label className="text-[11px] font-medium text-slate-500 mb-1 block">Thể tích cuối sau pha (mL)</label>
        <input value={volume} onChange={(e) => setVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="50" className={fieldClass} style={fieldStyle} />
      </div>

      {unitChoices.length > 1 && (
        <div className="flex gap-1.5 mb-2.5">
          {unitChoices.map((u) => (
            <button key={u} onClick={() => setVialUnit(u)} className="h-8 px-2.5 rounded-full text-[11px] font-semibold border" style={pill(vialUnit === u)}>
              {u}
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5 text-slate-500">Tôi có {vialLabel} thuốc → nồng độ bao nhiêu</p>
      {mixedConc != null && !isNaN(nv) && (
        <MixResultCard
          drug={drug}
          calc={calc}
          vialLabel={vialLabel}
          refConc={refConc}
          refLabel={refLabel}
          outcome={outcomeFor(mixedConc, vol, nv)}
          headline={`Nồng độ ${formatDoseNumber(mixedConc)} ${calc.concUnit}`}
          onUse={() => useOutcome(outcomeFor(mixedConc, vol, nv), [`${vials} ${vialLabel} × ${formatMass(va, vialUnit)}`, `Pha vừa đủ ${vol} mL`])}
          onSaveWard={() => saveWardFrom(outcomeFor(mixedConc, vol, nv))}
        />
      )}

      <p className="text-[11px] font-bold uppercase tracking-wide mb-1.5 mt-3 text-slate-500">Tôi cần nồng độ này → lấy mấy {vialLabel}</p>
      <div className="mb-2">
        <label className="text-[11px] font-medium text-slate-500 mb-1 block">Nồng độ mong muốn ({calc.concUnit})</label>
        <input value={target} onChange={(e) => setTarget(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder={calc.concDefault != null ? String(calc.concDefault * 2) : ""} className={fieldClass} style={fieldStyle} />
      </div>
      {needsRounding && (
        <div className="flex p-0.5 rounded-xl mb-2" style={{ background: "var(--c-line)" }}>
          {([
            { v: "keepConc" as MixRoundMode, label: "Giữ nồng độ", on: true },
            { v: "keepVolume" as MixRoundMode, label: "Giữ thể tích", on: true },
            { v: "partial" as MixRoundMode, label: `Rút lẻ ${vialLabel}`, on: canDrawPartial },
          ]).map((opt) => (
            <button
              key={opt.v}
              onClick={() => opt.on && setRoundMode(opt.v)}
              disabled={!opt.on}
              className="flex-1 h-9 rounded-[10px] text-[11px] font-bold leading-[1.3]"
              style={
                mode === opt.v
                  ? { background: "var(--c-surface)", color: "var(--c-accent-deep)" }
                  : { background: "transparent", color: opt.on ? "var(--c-text-muted)" : "var(--c-muted)", opacity: opt.on ? 1 : 0.5 }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {neededVials != null && neededVialsRaw != null && concIfRounded != null && (
        mode === "partial" && draw != null ? (
          <MixResultCard
            drug={drug}
            calc={calc}
            vialLabel={vialLabel}
            refConc={refConc}
            refLabel={refLabel}
            outcome={outcomeFor(tgt, vol, draw.vialsUsed, draw.vialsOpened, draw.drawMl)}
            headline={`Rút ${formatDoseNumber(draw.drawMl)} mL, pha vừa đủ ${trim(vol)} mL`}
            subline={`Bóc ${draw.vialsOpened} ${vialLabel}, rút đúng lượng cần rồi bỏ phần thừa — giữ nguyên cả nồng độ ${formatDoseNumber(tgt)} ${calc.concUnit} lẫn thể tích ${trim(vol)} mL.`}
            onUse={() =>
              useOutcome(outcomeFor(tgt, vol, draw.vialsUsed, draw.vialsOpened, draw.drawMl), [
                `Nồng độ mong muốn ${target} ${calc.concUnit}`,
                `Rút lẻ ${formatDoseNumber(draw.drawMl)} mL, thể tích cuối ${vol} mL`,
              ])
            }
            onSaveWard={() => saveWardFrom(outcomeFor(tgt, vol, draw.vialsUsed, draw.vialsOpened, draw.drawMl))}
          />
        ) : mode === "keepConc" && volForExact != null ? (
          <MixResultCard
            drug={drug}
            calc={calc}
            vialLabel={vialLabel}
            refConc={refConc}
            refLabel={refLabel}
            outcome={outcomeFor(tgt, volForExact, neededVials)}
            headline={`Lấy ${neededVials} ${vialLabel}, pha vừa đủ ${trim(volForExact)} mL`}
            subline={
              needsRounding
                ? `Cần chính xác ${formatDoseNumber(neededVialsRaw)} ${vialLabel} cho ${trim(vol)} mL; lấy tròn ${neededVials} ${vialLabel} rồi nâng thể tích lên ${trim(volForExact)} mL thì giữ ĐÚNG nồng độ ${formatDoseNumber(tgt)} ${calc.concUnit}.`
                : undefined
            }
            onUse={() =>
              useOutcome(outcomeFor(tgt, volForExact, neededVials), [
                `Nồng độ mong muốn ${target} ${calc.concUnit}`,
                `Giữ đúng nồng độ, chỉnh thể tích cuối thành ${trim(volForExact)} mL`,
              ])
            }
            onSaveWard={() => saveWardFrom(outcomeFor(tgt, volForExact, neededVials))}
          />
        ) : (
          <MixResultCard
            drug={drug}
            calc={calc}
            vialLabel={vialLabel}
            refConc={refConc}
            refLabel={refLabel}
            outcome={outcomeFor(concIfRounded, vol, neededVials)}
            headline={`Lấy ${neededVials} ${vialLabel}, pha vừa đủ ${trim(vol)} mL`}
            subline={
              needsRounding
                ? `Cần chính xác ${formatDoseNumber(neededVialsRaw)} ${vialLabel}; lấy tròn ${neededVials} ${vialLabel} thì nồng độ thực là ${formatDoseNumber(concIfRounded)} ${calc.concUnit} (mong muốn ${formatDoseNumber(tgt)}).`
                : undefined
            }
            onUse={() =>
              useOutcome(outcomeFor(concIfRounded, vol, neededVials), [
                `Nồng độ mong muốn ${target} ${calc.concUnit}`,
                `Thể tích cuối ${vol} mL`,
              ])
            }
            onSaveWard={() => saveWardFrom(outcomeFor(concIfRounded, vol, neededVials))}
          />
        )
      )}
    </div>
  )
}

function InfusionCalculator({ drug, calc }: { drug: InfusionDrug; calc: InfusionCalcConfig }) {
  const { abwKg, heightCm, patient, openPatientPanel, pinRunning, logCalc, wardRecipes, saveWard, clearWard } = useDosing()
  const wardList = wardRecipes[drug.id] ?? []
  // Công thức đã lưu GẦN NHẤT là mặc định thật sự của thuốc này — không bắt gõ lại mỗi lần mở. Các
  // công thức khác vẫn còn trong danh sách, chọn lại ở hàng chip trong "Cách dùng · Pha thuốc".
  const ward = wardList[wardList.length - 1]
  const unitOptions = useMemo(() => doseUnitOptions(calc.doseUnit, calc.concUnit), [calc.doseUnit, calc.concUnit])
  const [unitId, setUnitId] = useState(calc.doseUnit)
  const [mode, setMode] = useState<"doseToRate" | "rateToDose">("doseToRate")
  const [conc, setConc] = useState(ward ? String(ward.concValue) : calc.concDefault != null ? String(calc.concDefault) : "")
  const [dose, setDose] = useState("")
  const [rateInput, setRateInput] = useState("")
  const [bagVolume, setBagVolume] = useState(ward ? String(ward.volumeMl) : calc.mix ? String(calc.mix.volumeMl) : "")
  const [showMix, setShowMix] = useState(false)
  // "Xoá công thức này" xoá dữ liệu ĐÃ LƯU (không phải dòng nháp) nên cần xác nhận hai chạm giống
  // ConfirmIconButton — nhãn tự đổi thành "Chắc chắn xoá?" ở chạm đầu, rời tay khỏi nút (blur) thì
  // huỷ, chạm lần hai mới thật sự xoá.
  const [confirmClearWard, setConfirmClearWard] = useState(false)
  // Chỉ hiện con số tốc độ sau khi người dùng xác nhận, với các liều vượt xa khoảng khuyến cáo.
  const [confirmed, setConfirmed] = useState(false)
  const [savedNote, setSavedNote] = useState("")
  // Đếm số lần lưu, để dải xác nhận chạy lại hoạt ảnh kể cả khi chữ không đổi.
  const [savedTick, setSavedTick] = useState(0)
  // Dải xác nhận tự biến mất sau khi mờ đi, chứ không nằm lại dưới dạng ô trong suốt vẫn chiếm chỗ
  // — nếu để lại, thẻ thuốc dài thêm một dòng vĩnh viễn sau lần lưu đầu tiên.
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmSaved = (msg: string) => {
    setSavedNote(msg)
    setSavedTick((n) => n + 1)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedNote(""), 2000)
  }
  useEffect(() => () => {
    if (savedTimer.current) clearTimeout(savedTimer.current)
  }, [])

  const unit = useMemo(() => parseDoseUnit(unitId), [unitId])
  const ownUnit = useMemo(() => parseDoseUnit(calc.doseUnit), [calc.doseUnit])
  // Cân nặng lấy từ "Bệnh nhân hiện tại" — không còn ô nhập riêng cho từng thẻ thuốc.
  const dosingWeight = useMemo(
    () => resolveDosingWeight(abwKg, heightCm, patient.sex, drug.doseWeightBasis ?? "actual"),
    [abwKg, heightCm, patient.sex, drug.doseWeightBasis],
  )
  const weightKg = dosingWeight.used
  const c = parseFloat(conc)
  const concValue = isNaN(c) ? null : c
  const pumpStep = calc.pumpStep ?? DEFAULT_PUMP_STEP

  const result = useMemo(() => {
    if (!unit || concValue == null) return null
    if (mode === "doseToRate") {
      const d = parseFloat(dose)
      if (isNaN(d)) return null
      return doseToRate(d, unit, weightKg, concValue, calc.concUnit)
    }
    const r = parseFloat(rateInput)
    if (isNaN(r)) return null
    return rateToDose(r, unit, weightKg, concValue, calc.concUnit)
  }, [unit, mode, dose, rateInput, concValue, weightKg, calc.concUnit])

  // Kiểm tra khoảng liều ở CẢ HAI CHIỀU: chiều "Liều → Tốc độ" kiểm tra liều vừa nhập; chiều
  // "Tốc độ → Liều" kiểm tra liều suy ra từ tốc độ bơm đang chạy — đúng tình huống nhận bàn giao ca
  // và phát hiện bơm đang đặt sai.
  const doseUnderCheck = mode === "doseToRate" ? (isNaN(parseFloat(dose)) ? null : parseFloat(dose)) : result
  const check: DoseCheck | null = useMemo(() => {
    if (!unit || !ownUnit || doseUnderCheck == null) return null
    return checkInfusionDose(doseUnderCheck, unit, ownUnit, calc.doseMin, calc.doseMax, weightKg, calc.doseAbsMax)
  }, [unit, ownUnit, doseUnderCheck, calc.doseMin, calc.doseMax, calc.doseAbsMax, weightKg])

  // Đổi bất kỳ đầu vào nào là phải xác nhận lại — không để một lần bấm xác nhận che cho mọi con số
  // gõ sau đó.
  useEffect(() => {
    setConfirmed(false)
    setSavedNote("")
  }, [dose, rateInput, conc, unitId, mode])

  // Ô "Nồng độ" là đường vào phổ biến hơn bảng pha rất nhiều, nên nó phải được canh bằng ĐÚNG bộ
  // luật đã dùng cho bảng pha. Trước đây gõ 50 thay vì 5 mg/mL thì bảng pha chặn đỏ còn ô này chỉ
  // hiện một dòng xanh dịu — cùng một sai lầm, hai phản ứng ngược nhau.
  // Mốc so sánh là công thức BẠN đã lưu khi có — xem lib/wardRecipes.ts.
  const concGrade = useMemo(
    () => gradeConcentration(concValue, ward?.concValue ?? calc.concDefault, calc.mix?.maxConc, calc.concUnit, ward ? "công thức của bạn" : "công thức chuẩn"),
    [concValue, ward, calc.concDefault, calc.mix?.maxConc, calc.concUnit],
  )

  const blocked = (Boolean(check?.requiresConfirm) || concGrade.requiresConfirm) && !confirmed
  const doseSeverity = check?.severity ?? "ok"
  // Ô kết quả lấy màu theo mức nặng hơn giữa "liều sai" và "nồng độ sai".
  const concAsDoseSeverity: DoseCheck["severity"] =
    concGrade.severity === "danger" ? "extreme" : concGrade.severity === "warn" ? "above" : "ok"
  const RANK: Record<string, number> = { ok: 0, unknown: 0, below: 1, "far-below": 2, above: 2, high: 3, extreme: 4 }
  const severity = RANK[concAsDoseSeverity] > RANK[doseSeverity] ? concAsDoseSeverity : doseSeverity
  const severityStyle = SEVERITY_STYLE[severity === "unknown" && result != null ? "ok" : severity]
  // Cảnh báo đi kèm mọi dòng nhật ký của phép tính này — gồm cả cảnh báo liều lẫn cảnh báo nồng độ.
  const activeFlag = [check?.headline, concGrade.headline].filter(Boolean).join(" + ") || undefined

  // Bơm tiêm điện chỉ đặt được theo bước 0,1 mL/giờ — phải nói rõ đặt bao nhiêu và khi đó liều thực
  // nhận là bao nhiêu.
  const roundedRate = mode === "doseToRate" && result != null ? roundToStep(result, pumpStep) : null
  const deliveredDose =
    roundedRate != null && unit && concValue != null ? rateToDose(roundedRate, unit, weightKg, concValue, calc.concUnit) : null

  const effectiveRate = mode === "doseToRate" ? roundedRate : isNaN(parseFloat(rateInput)) ? null : parseFloat(rateInput)
  const bagVol = parseFloat(bagVolume)
  const duration = !isNaN(bagVol) && effectiveRate != null ? infusionDurationHours(bagVol, effectiveRate) : null
  const bagAmount = !isNaN(bagVol) && concValue != null ? totalAmountInBag(bagVol, concValue) : null

  const needWeight = unit?.perWeight ?? false

  // ─── Vì sao ô kết quả đang trống ───────────────────────────────────────────
  // Lỗi cũ: gõ liều xong, ô kết quả hiện "—" và KHÔNG nói gì thêm. Lời nhắc "thuốc này tính theo
  // cân nặng" thì có, nhưng nằm cách đó gần một màn hình phía trên (sau ô nồng độ, cảnh báo ngoại
  // biên, nút bảng pha, ô thể tích...), nên người dùng nhìn thẳng vào chỗ đáng lẽ có con số và chỉ
  // thấy một dấu gạch ngang câm. Từ nay lý do nằm NGAY TRONG ô kết quả, kèm đường đi để sửa.
  const missingReason: { text: string; fix?: () => void } | null = (() => {
    if (result != null) return null
    if (concValue == null || !(concValue > 0)) return { text: "Nhập nồng độ pha ở ô bên trên để tính được." }
    if (mode === "doseToRate" && !(parseFloat(dose) > 0)) return { text: "Nhập liều muốn truyền để app tính ra tốc độ bơm." }
    if (mode === "rateToDose" && !(parseFloat(rateInput) > 0)) return { text: "Nhập tốc độ bơm đang chạy để app suy ra liều." }
    if (needWeight && weightKg == null) {
      return {
        text: `Thiếu cân nặng — ${unitId} tính theo kg nên chưa ra được con số. Chạm để nhập ở khung "Bệnh nhân hiện tại".`,
        fix: openPatientPanel,
      }
    }
    // Đơn vị liều và đơn vị nồng độ không cùng họ (vd liều "đơn vị/giờ" với nồng độ "mg/mL") —
    // không có hệ số quy đổi nào đúng, và đoán bừa một hệ số ở đây là kiểu sai tệ nhất.
    if (unit && massFactor(unit.mass, massOfConcUnit(calc.concUnit)) == null) {
      return { text: `Không quy đổi được ${unit.mass} sang ${massOfConcUnit(calc.concUnit)} — chọn đơn vị liều khác hoặc sửa đơn vị nồng độ.` }
    }
    return { text: "Chưa đủ dữ liệu để tính — kiểm tra lại các ô phía trên." }
  })()
  const rateDecimals = pumpStep >= 1 ? 0 : 1
  // Ô nồng độ điền sẵn là con dao hai lưỡi: tiện, nhưng nếu chỗ bạn pha khác chuẩn mà quên sửa thì
  // app im lặng tính ra một con số sai trông hoàn toàn hợp lý. Vì vậy khi con số đã bị sửa khác mốc
  // thì phải nói rõ nó đang so với cái gì.
  const concIsDefault = calc.concDefault != null && concValue != null && Math.abs(concValue - calc.concDefault) < 1e-9
  const concIsWard = ward != null && concValue != null && Math.abs(concValue - ward.concValue) < 1e-9
  const fieldClass = FIELD
  const fieldStyle = FIELD_STYLE

  const doseText = mode === "doseToRate" ? `${dose} ${unitId}` : result != null ? `${formatDoseNumber(result)} ${unitId}` : "—"
  const rateText =
    mode === "doseToRate"
      ? roundedRate != null
        ? `${roundedRate.toFixed(rateDecimals)} mL/giờ`
        : "—"
      : `${rateInput} mL/giờ`

  // Câu "Cách dùng" theo mẫu chuẩn (vd "Noradrenalin 4 mg/4 ml 2 ống với NaCl 0,9% đủ 50 ml BTĐ
  // 5 ml/h") — chỉ ra được khi đã có đủ hàm lượng/thể tích 1 ống (từ công thức đã lưu hoặc mặc định
  // của thuốc) VÀ đã tính ra tốc độ bơm cụ thể. Xem lib/usageText.ts.
  const usageVialRaw = ward ?? calc.mix
  const usageLine = (() => {
    if (mode !== "doseToRate" || roundedRate == null || usageVialRaw == null) return null
    const usageVial = usageVialRaw
    if (usageVial.vialAmount == null || usageVial.vialVolumeMl == null) return null
    return formatAmpouleUsage({
      name: drug.name,
      vialAmount: usageVial.vialAmount,
      vialUnit: usageVial.vialUnit ?? massOfConcUnit(calc.concUnit),
      vialVolumeMl: usageVial.vialVolumeMl,
      vialsUsed: usageVial.vials ?? 1,
      diluentName: ("diluent" in usageVial ? usageVial.diluent : usageVial.diluents?.[0]) ?? "NaCl 0,9%",
      finalVolumeMl: !isNaN(bagVol) ? bagVol : usageVial.volumeMl,
      rateMlPerHour: roundedRate,
    })
  })()

  function logCurrent(flag?: string) {
    logCalc({
      drug: drug.name,
      kind: mode,
      inputs: [
        `Nồng độ ${conc} ${calc.concUnit}${concIsDefault ? " (công thức pha chuẩn của app)" : calc.concDefault != null ? ` (khác chuẩn ${calc.concDefault})` : ""}`,
        mode === "doseToRate" ? `Liều đặt ${dose} ${unitId}` : `Tốc độ bơm ${rateInput} mL/giờ`,
      ],
      output: mode === "doseToRate" ? `${rateText}${deliveredDose != null ? ` → thực nhận ${formatDoseNumber(deliveredDose)} ${unitId}` : ""}` : doseText,
      flag,
    })
  }

  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--c-line-soft)" }}>
      {/* Chọn chiều tính */}
      <div className="flex p-0.5 rounded-xl mb-2.5" style={{ background: "var(--c-line-soft)" }}>
        {([
          { id: "doseToRate" as const, label: "Liều → Tốc độ" },
          { id: "rateToDose" as const, label: "Tốc độ → Liều" },
        ]).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="flex-1 h-9 rounded-[10px] text-[12px] font-bold"
            style={
              mode === m.id
                ? { background: "var(--c-surface)", color: "var(--c-primary)", boxShadow: "0 1px 3px rgba(15,23,42,.10)" }
                : { background: "transparent", color: "var(--c-muted)" }
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chọn đơn vị liều — cuộn ngang vì có nhiều lựa chọn, không vừa một hàng chia đều */}
      <div className="scroll-ios overflow-x-auto flex gap-1.5 mb-2.5 -mx-0.5 px-0.5">
        {unitOptions.map((u) => (
          <button
            key={u}
            onClick={() => {
              setUnitId(u)
              tickHaptic()
            }}
            className={CHIP}
            style={
              unitId === u
                ? { background: "var(--c-primary)", borderColor: "var(--c-primary)", color: "var(--c-on-bright)" }
                : { background: "var(--c-surface)", borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
            }
          >
            {u}
          </button>
        ))}
      </div>

      {/* Cân nặng lấy từ khung "Bệnh nhân hiện tại" — không gõ lại cho từng thuốc nữa. Chỉ nói khi
          ĐÃ có cân nặng (xác nhận đang dùng số nào); lúc thiếu thì không nhắc ở đây nữa — lý do và
          đường sửa đã nằm ngay trong ô kết quả bên dưới (xem missingReason), đúng chỗ người dùng
          đang nhìn khi thấy "—" mà không hiểu vì sao. */}
      {needWeight && weightKg != null && (
        <p className="text-[11px] mb-2 px-2.5 py-1.5 rounded-lg leading-[1.45]" style={{ background: "var(--c-accent-soft)", color: "var(--c-accent-deep)" }}>
          Cân nặng dùng để tính: <b>{weightKg.toFixed(1)} kg</b>
          {dosingWeight.usedLabel && dosingWeight.usedLabel !== "ABW" ? ` (${dosingWeight.usedLabel})` : ""} — lấy từ khung "Bệnh nhân hiện tại".
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-1.5">
        <div>
          <label className="text-[11px] font-medium text-slate-500 mb-1 block">Nồng độ ({calc.concUnit})</label>
          <input value={conc} onChange={(e) => setConc(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder={calc.concUnit} className={fieldClass} style={fieldStyle} />
        </div>
        {mode === "doseToRate" ? (
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Liều</label>
            <input value={dose} onChange={(e) => setDose(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder={unitId} className={fieldClass} style={fieldStyle} />
          </div>
        ) : (
          <div>
            <label className="text-[11px] font-medium text-slate-500 mb-1 block">Tốc độ (mL/giờ)</label>
            <input value={rateInput} onChange={(e) => setRateInput(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="mL/giờ" className={fieldClass} style={fieldStyle} />
          </div>
        )}
      </div>

      {/* Ô nồng độ đang giả định điều gì — dòng này không bao giờ được vắng mặt */}
      {concGrade.severity === "danger" || concGrade.severity === "warn" ? (
        // Nồng độ lệch nhiều thì cảnh báo này thay chỗ dòng ghi chú nhẹ nhàng bên dưới — hai thứ
        // cùng lúc chỉ làm loãng cái quan trọng.
        <div
          className={`flex items-start gap-2 px-3 py-2.5 ${R.box} mb-2`}
          style={
            concGrade.severity === "danger"
              ? { background: C.dangerSoft, border: `1px solid ${C.dangerIcon}` }
              : { background: "var(--c-orange-soft)", border: "1px solid var(--c-orange-line)" }
          }
        >
          <span className="mt-0.5 flex-none" style={{ color: concGrade.severity === "danger" ? C.dangerIcon : "var(--c-orange)" }}>{icons.alert()}</span>
          <div>
            <p className={`${T.bodyStrong} font-extrabold leading-[1.3]`} style={{ color: concGrade.severity === "danger" ? C.danger : "var(--c-orange)" }}>
              {concGrade.headline}
            </p>
            {concGrade.detail && (
              <p className={`${T.meta} mt-0.5`} style={{ color: concGrade.severity === "danger" ? C.danger : "var(--c-orange)" }}>{concGrade.detail}</p>
            )}
          </div>
        </div>
      ) : concIsWard ? null : calc.concDefault == null ? (
        <Note tone="warn">App không điền sẵn nồng độ cho thuốc này — nhập theo chai/bơm thực tế rồi lưu lại trong bảng pha.</Note>
      ) : concIsDefault ? null : (
        // Con số dựng sẵn thì không cần nói gì: nó đã là mặc định hiển nhiên, và một dòng nhắc lặp
        // lại ở mọi thuốc chỉ làm loãng những dòng thật sự phải đọc. Chỉ nói khi nồng độ đã bị SỬA
        // khác mốc — lúc đó mới có thông tin mới.
        <Note tone="info">
          Nồng độ tự nhập {conc} {calc.concUnit} — {ward ? `công thức của bạn là ${formatDoseNumber(ward.concValue)}` : `chuẩn của app là ${calc.concDefault}`} {calc.concUnit}.
        </Note>
      )}

      {/* Trả về mốc chuẩn sau khi đã sửa lung tung */}
      {(!concIsWard || !ward) && (calc.concDefault != null || ward) && !(concIsDefault && !ward) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {ward && (
            <button
              onClick={() => {
                setConc(String(ward.concValue))
                setBagVolume(String(ward.volumeMl))
                tickHaptic()
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
              style={{ borderColor: "var(--c-accent-line)", color: "var(--c-accent-deep)" }}
            >
              Về công thức của bạn
            </button>
          )}
          {calc.concDefault != null && (
            <button
              onClick={() => {
                setConc(String(calc.concDefault))
                if (calc.mix) setBagVolume(String(calc.mix.volumeMl))
                tickHaptic()
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
              style={{ borderColor: "var(--c-line)", color: "var(--c-text-soft)" }}
            >
              Về công thức chuẩn của app
            </button>
          )}
        </div>
      )}
      {/* Cách dùng gộp chung với bảng pha, và nội dung ĐỘNG theo công thức đã lưu — giống hệt cách ô
          kết quả bên trên đổi theo dữ liệu thật thay vì đứng yên. Trước đây "Cách dùng" là một khối
          tĩnh tách rời (luôn đọc câu chữ dựng sẵn của app dù bạn đã lưu công thức khác từ lâu), còn
          "Bảng pha thuốc" là một nút riêng nằm giữa dòng — hai thứ cùng nói về MỘT việc (pha thuốc
          thế nào) nhưng lại ở hai chỗ khác nhau. */}
      <Disclosure label="Cách dùng · Pha thuốc">
        {wardList.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {wardList.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  setConc(String(w.concValue))
                  setBagVolume(String(w.volumeMl))
                  tickHaptic()
                }}
                className="h-8 px-2.5 rounded-full text-[11px] font-semibold border max-w-[160px] truncate"
                style={
                  w.id === ward?.id
                    ? { background: "var(--c-accent)", borderColor: "var(--c-accent)", color: "var(--c-on-bright)" }
                    : { background: "var(--c-surface)", borderColor: "var(--c-accent-line)", color: "var(--c-accent-deep)" }
                }
              >
                {w.title || "Công thức đã lưu"}
              </button>
            ))}
          </div>
        )}
        {ward ? (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex-none" style={{ color: "var(--c-accent)" }}>{icons.edit()}</span>
            <div className="flex-1 min-w-0">
              <p className={`${T.meta} font-bold`} style={{ color: "var(--c-accent-deep)" }}>
                {ward.title || "Công thức của bạn"} (lưu {formatSavedAt(ward.savedAt)}) — khác công thức hệ thống
              </p>
              <p className={`${T.body} mt-0.5`} style={{ color: C.textSoft }}>
                {ward.vials} {calc.mix?.vialLabel ?? "ống"} × {formatMass(ward.vialAmount, ward.vialUnit)} vừa đủ {trim(ward.volumeMl)} mL
                {ward.diluent ? `, dung môi ${ward.diluent}` : ""}.
              </p>
              <button
                onClick={() => {
                  if (!confirmClearWard) {
                    setConfirmClearWard(true)
                    tickHaptic()
                    return
                  }
                  clearWard(drug.id, ward.id)
                  if (calc.concDefault != null) setConc(String(calc.concDefault))
                  if (calc.mix) setBagVolume(String(calc.mix.volumeMl))
                  setConfirmClearWard(false)
                  tickHaptic()
                }}
                onBlur={() => setConfirmClearWard(false)}
                className="flex items-center gap-1.5 text-[11px] font-bold mt-1.5"
                style={{ color: confirmClearWard ? "var(--c-on-bright)" : "var(--c-danger)", background: confirmClearWard ? "var(--c-danger-icon)" : "transparent", padding: confirmClearWard ? "4px 8px" : 0, borderRadius: 999 }}
              >
                <span className="scale-90">{confirmClearWard ? icons.alert() : icons.trash()}</span>
                {confirmClearWard ? "Chắc chắn xoá?" : "Xoá công thức này"}
              </button>
            </div>
          </div>
        ) : (
          <p className={T.body} style={{ color: C.textSoft }}>{drug.preparation}</p>
        )}
        {drug.note && <p className={`${T.meta} mt-2`} style={{ color: C.muted }}>{drug.note}</p>}

        <button
          onClick={() => setShowMix((v) => !v)}
          className={`${BTN_BLOCK} mt-3`}
          style={{ borderColor: C.accentLine, background: C.accentSoft, color: C.accent }}
        >
          {showMix ? "Đóng bảng pha thuốc" : "Bảng pha thuốc"}
        </button>
        {showMix && (
          <MixPanel
            drug={drug}
            calc={calc}
            wardRecipe={ward}
            onSaveWard={saveWard}
            onUseConc={(value, volumeMl) => {
              setConc(String(Math.round(value * 1e6) / 1e6))
              setBagVolume(String(Math.round(volumeMl * 100) / 100))
              setShowMix(false)
            }}
          />
        )}
      </Disclosure>

      <div className="grid grid-cols-2 gap-2 mb-2 mt-2">
        <div>
          <label className="text-[11px] font-medium text-slate-500 mb-1 block">Thể tích bơm/chai (mL)</label>
          <input value={bagVolume} onChange={(e) => setBagVolume(normalizeDecimalInput(e.target.value))} inputMode="decimal" placeholder="VD: 50" className={fieldClass} style={fieldStyle} />
        </div>
        {bagAmount != null && (
          <div className="flex items-end">
            <p className="text-[11px] text-slate-500 leading-[1.45] pb-2">
              Trong bơm có {formatMass(bagAmount, massOfConcUnit(calc.concUnit))}
            </p>
          </div>
        )}
      </div>

      {/* Cảnh báo vượt/thấp hơn khoảng liều — đổi màu, in hoa, và với mức nguy hiểm thì CHẶN kết quả
          cho tới khi người dùng xác nhận. */}
      {check?.headline && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl mb-2"
          style={{ background: severityStyle.bg, border: `1px solid ${severityStyle.border}` }}
        >
          <span className="mt-0.5 flex-none" style={{ color: severityStyle.text }}>{icons.alert()}</span>
          <div>
            <p className="text-[13px] font-extrabold leading-[1.3]" style={{ color: severityStyle.text }}>{check.headline}</p>
            {check.detail && <p className="text-[11px] leading-[1.45] mt-0.5" style={{ color: severityStyle.text }}>{check.detail}</p>}
          </div>
        </div>
      )}

      {blocked ? (
        <button
          onClick={() => {
            const reason = [check?.requiresConfirm ? check.headline : null, concGrade.requiresConfirm ? concGrade.headline : null]
              .filter(Boolean)
              .join(" + ")
            setConfirmed(true)
            logCurrent(`${reason} — người dùng đã bấm xác nhận để xem kết quả`)
            confirmSaved("Đã ghi vào nhật ký kèm cảnh báo")
            tickHaptic()
          }}
          className={`${BTN_TALL} border-transparent`}
          style={{ background: severityStyle.text, color: "var(--c-on-bright)" }}
        >
          Tôi đã kiểm tra lại — vẫn muốn xem kết quả
        </button>
      ) : (
        // Con số duy nhất cần nhìn thấy từ xa. Đặt to hẳn một bậc so với mọi chữ khác trong thẻ,
        // dùng chữ số đều bề ngang (tabular) để hàng "đặt bơm" và hàng "thực nhận" thẳng cột nhau.
        <div className={`px-3 py-3 ${R.box}`} style={{ background: severityStyle.bg, border: `1px solid ${severityStyle.border}` }}>
          {usageLine && <p className={`${T.bodyStrong} mb-1.5`} style={{ color: severityStyle.text }}>{usageLine}</p>}
          <div className="flex items-baseline gap-2">
            {/* `key` đổi theo giá trị nên React dựng lại thẻ này mỗi lần con số đổi, kích hoạt lại
                hoạt ảnh nảy — dấu hiệu "số đang nhìn là số MỚI", tránh đọc lại số cũ. */}
            <span key={result ?? "none"} className={`${T.metric} pop-value`} style={{ color: severityStyle.text }}>
              {result != null ? formatDoseNumber(result) : "—"}
            </span>
            <span className={T.body} style={{ color: C.textSoft }}>{mode === "doseToRate" ? "mL/giờ" : unitId}</span>
            {/* Xác nhận tích cực: liều nằm đúng khoảng thì nói ra, không chỉ im lặng khi không sai */}
            {severity === "ok" && result != null && check != null && (
              <span className={`${T.meta} ml-auto flex items-center gap-1 flex-none`} style={{ color: C.accent }}>
                <span className="scale-75">{icons.check()}</span>
                Trong khoảng
              </span>
            )}
          </div>
          {mode === "doseToRate" && roundedRate != null && (
            <p className={`${T.meta} ${NUM} mt-1.5`} style={{ color: severityStyle.text }}>
              Đặt bơm <b>{roundedRate.toFixed(rateDecimals)} mL/giờ</b> (bước {pumpStep})
              {deliveredDose != null && ` → thực nhận ${formatDoseNumber(deliveredDose)} ${unitId}`}
            </p>
          )}
          {duration != null && (
            <p className={`${T.meta} ${NUM} mt-0.5`} style={{ color: C.textSoft }}>
              {trim(bagVol)} mL ở {effectiveRate?.toFixed(rateDecimals)} mL/giờ → hết sau <b>{formatDuration(duration)}</b>
            </p>
          )}
          {check?.severity === "unknown" && check.detail && (
            <p className={`${T.meta} mt-0.5`} style={{ color: C.muted }}>{check.detail}</p>
          )}
          {/* Dấu "—" không bao giờ được đứng một mình: luôn kèm lý do và cách sửa. */}
          {missingReason &&
            (missingReason.fix ? (
              <button onClick={missingReason.fix} className={`${T.meta} font-semibold text-left mt-1 underline`} style={{ color: C.warn }}>
                {missingReason.text}
              </button>
            ) : (
              <p className={`${T.meta} mt-1`} style={{ color: C.muted }}>{missingReason.text}</p>
            ))}
        </div>
      )}

      {/* Hai hành động này KHÔNG ngang hàng nhau về tầm quan trọng, nên không còn vẽ thành hai nút
          bằng nhau cạnh nhau nữa — cách cũ (flex-1 flex-1) chỉ chừa ~147px mỗi nút trên máy 375px,
          đủ để "Thêm vào danh sách đang dùng" vỡ thành 3 dòng chữ chồng lên nhau, và người dùng
          không có cách nào phân biệt hành động nào là chính giữa hai ô trông y hệt nhau.
          Nay: MỘT nút chính (ghim thuốc — đặc màu, có icon, chiếm trọn hàng, luôn đủ chỗ cho một
          dòng chữ) và một hành động phụ bên dưới (chỉ ghi nhật ký, không ghim — nhạt hơn hẳn về
          màu sắc nhưng vẫn đủ 44px chiều cao để bấm được khi đeo găng). */}
      {!blocked && result != null && (
        <div className="flex flex-col gap-1.5 mt-2">
          <button
            onClick={() => {
              pinRunning({
                drugId: drug.id,
                name: drug.name,
                compatKey: drug.compatKey,
                line: 1,
                doseText,
                rateText,
                concText: `${conc} ${calc.concUnit}`,
                kind: "infusion",
                weightKgAtPin: weightKg,
                concAtPin: conc,
              })
              logCurrent(activeFlag ? `${activeFlag} — vẫn ghim vào bảng đang dùng` : undefined)
              confirmSaved("Đã thêm vào danh sách đang dùng")
              tickHaptic()
            }}
            className={`${BTN_TALL} border-transparent flex items-center justify-center gap-1.5`}
            style={{ background: C.accent, color: "var(--c-on-bright)" }}
          >
            <span className="flex-none scale-90">{icons.plus()}</span>
            Thêm vào danh sách đang dùng
          </button>
          <button
            onClick={() => {
              logCurrent(activeFlag)
              confirmSaved("Đã lưu vào nhật ký")
              tickHaptic()
            }}
            className={`w-full min-h-[44px] px-3 py-2 ${R.box} ${T.chip} flex items-center justify-center gap-1.5 dose-press`}
            style={{ background: C.lineSoft, color: C.textSoft }}
          >
            <span className="flex-none scale-90">{icons.doc()}</span>
            Chỉ lưu vào nhật ký, không ghim
          </button>
        </div>
      )}
      {/* Xác nhận việc vừa làm đã xong — dải xanh có dấu tích, tự mờ đi sau ~1,8s. `key` để mỗi
          lần lưu lại là một lần hiện mới, kể cả khi nội dung không đổi. */}
      {savedNote && (
        <p
          key={`${savedNote}-${savedTick}`}
          className={`${T.meta} flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 ${R.box} flash-ok`}
          style={{ background: C.accentSoft, color: C.accent }}
        >
          <span className="flex-none scale-90">{icons.check()}</span>
          {savedNote}
        </p>
      )}
    </div>
  )
}

function InfusionDrugCard({
  drug: baseDrug,
  disease,
  isOverride,
  onEdit,
  onDelete,
}: {
  drug: InfusionDrug
  disease?: DiseaseEntry | null
  isOverride?: boolean
  onEdit?: (drug: InfusionDrug) => void
  onDelete?: (id: string) => void
}) {
  const { pinRunning } = useDosing()
  // Bệnh lý áp dụng đè (override) doseRange/calc/boluses/note lên dữ liệu gốc — giống hệt cách
  // IndicationDose đè lên Antibiotic.tiers ở AntibioticDoseCard. Phần nào chỉ định không khai báo
  // thì giữ nguyên dữ liệu gốc của thuốc.
  const indication = disease ? baseDrug.indications?.find((i) => i.diseaseId === disease.id) : undefined
  const drug: InfusionDrug = indication
    ? {
        ...baseDrug,
        doseRange: indication.doseRange ?? baseDrug.doseRange,
        note: indication.note ?? baseDrug.note,
        calc: indication.calc ?? baseDrug.calc,
        boluses: indication.boluses ?? baseDrug.boluses,
      }
    : baseDrug
  // Cảnh báo mức "cao" là thứ duy nhất không được phép gấp lại; mức trung bình và mọi nội dung
  // tham khảo khác đều nằm sau tiêu đề gấp/mở để phần máy tính luôn nằm trong tầm mắt.
  const highWarnings = (drug.warnings ?? []).filter((w) => w.severity === "cao")
  const otherWarnings = (drug.warnings ?? []).filter((w) => w.severity !== "cao")
  const boluses = drug.boluses ?? []

  return (
    <div className={`p-4 ${R.card} border mb-3`} style={{ borderColor: C.line, background: C.surface }}>
      {/* Đầu thẻ: tên thuốc và hai nút cùng nằm trên một đường, cao bằng nhau */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`${T.title} truncate`} style={{ color: C.text }}>{drug.name}</p>
            {drug.isCustom && (
              <span
                className={`${T.label} px-1.5 py-0.5 ${R.pill} flex-none`}
                style={isOverride ? { background: C.primarySoft, color: C.primary } : { background: "var(--c-green-soft)", color: "var(--c-green)" }}
              >
                {isOverride ? "Đã sửa" : "Tự nhập"}
              </span>
            )}
          </div>
          <p className={`${T.meta} mt-0.5`} style={{ color: C.accent }}>{drug.route}</p>
          {disease && (
            <p className={`${T.meta} font-semibold mt-1 px-2 py-0.5 ${R.pill} inline-block`} style={{ background: C.primarySoft, color: C.primary }}>
              Chỉ định: {disease.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-none">
          {onEdit && (
            <button onClick={() => onEdit(drug)} className={`w-8 h-8 ${R.pill} flex items-center justify-center`} style={{ background: C.primarySoft, color: C.primary }} aria-label="Sửa thuốc">
              {icons.edit()}
            </button>
          )}
          {drug.isCustom && onDelete && (isOverride ? (
            <button
              onClick={() => onDelete(drug.id)}
              className={`w-8 h-8 ${R.pill} flex items-center justify-center`}
              style={{ background: C.lineSoft, color: C.textSoft }}
              aria-label="Khôi phục mặc định"
            >
              {icons.undo()}
            </button>
          ) : (
            <ConfirmIconButton
              onConfirm={() => onDelete(drug.id)}
              ariaLabel="Xoá thuốc"
              className={`w-8 h-8 ${R.pill} flex items-center justify-center`}
              style={{ background: C.dangerSoft, color: C.dangerIcon }}
            />
          ))}
        </div>
      </div>

      <p className={`${T.body} mt-2`} style={{ color: "var(--c-text-2)" }}>{drug.doseRange}</p>

      {/* Cảnh báo mức cao — luôn hiện, ngay dưới khoảng liều */}
      {highWarnings.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {highWarnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-2 px-2.5 py-2 ${R.box}`} style={{ background: C.dangerSoft, border: `1px solid ${C.dangerLine}` }}>
              <span className="mt-0.5 flex-none" style={{ color: C.dangerIcon }}>{icons.alert()}</span>
              <p className={T.bodyStrong} style={{ color: C.danger }}>{w.text}</p>
            </div>
          ))}
        </div>
      )}

      {drug.calc && <InfusionCalculator drug={drug} calc={drug.calc} />}

      {/* Thuốc không có máy tính tốc độ (Adenosine, Calci gluconat) vẫn phải ghim được: chúng nằm
          trong đúng những cặp tương hợp quan trọng nhất (calci + bicarbonat...). */}
      {!drug.calc && (
        <button
          onClick={() => {
            pinRunning({ drugId: drug.id, name: drug.name, compatKey: drug.compatKey, line: 1, doseText: drug.doseRange, rateText: "", concText: drug.route, kind: "intermittent" })
            tickHaptic()
          }}
          className={`w-full h-11 ${R.box} ${T.bodyStrong} border mt-3`}
          style={{ borderColor: C.accentLine, background: C.accentSoft, color: C.accent }}
        >
          Thêm vào danh sách đang dùng
        </button>
      )}

      {boluses.length > 0 && (
        <Disclosure label="Liều nạp / bolus" count={boluses.length}>
          <BolusList boluses={drug.boluses} drugName={drug.name} doseWeightBasis={drug.doseWeightBasis} />
        </Disclosure>
      )}

      {/* Thuốc CÓ máy tính tốc độ đã tự vẽ khối "Cách dùng · Pha thuốc" của riêng nó bên trong
          InfusionCalculator (bản ĐỘNG, đổi theo công thức đã lưu) — vẽ lại tĩnh ở đây thành ra có
          hai khối "Cách dùng" trên cùng một thẻ. Chỉ thuốc KHÔNG có máy tính (Adenosine, Calci
          gluconat...) mới cần khối tĩnh này. */}
      {!drug.calc && (
        <Disclosure label="Cách dùng · Pha thuốc">
          <p className={T.body} style={{ color: C.textSoft }}>{drug.preparation}</p>
          {drug.note && <p className={`${T.meta} mt-2`} style={{ color: C.muted }}>{drug.note}</p>}
        </Disclosure>
      )}

      {otherWarnings.length > 0 && (
        <Disclosure label="Lưu ý khác" count={otherWarnings.length} alert>
          <DrugWarnings warnings={otherWarnings} bare />
        </Disclosure>
      )}

      {/* `alert` khi thuốc chưa ghi nguồn: trước đây phải MỞ khối này ra mới biết mục nào chưa được
          rà soát, nên trên thực tế không ai biết. Nay tình trạng nằm ngay trên tiêu đề. */}
      <Disclosure label={drug.source || drug.reviewedOn ? "Nguồn dữ liệu" : "Nguồn dữ liệu — chưa ghi nguồn"} alert={!drug.source && !drug.reviewedOn}>
        <SourceLine item={drug} bare />
      </Disclosure>
    </div>
  )
}

// Trước đây màn này đổ TOÀN BỘ thuốc trong nhóm ra dưới dạng thẻ mở sẵn, mỗi thẻ kèm máy tính,
// bảng pha, liều nạp, cảnh báo và nguồn — bốn thuốc là bốn màn hình cuộn, trong khi một bệnh nhân
// cụ thể thường chỉ dùng một hai thứ. Nay đảo lại thứ tự ưu tiên cho đúng nhịp ICU:
//   1. Thuốc bệnh nhân ĐANG dùng (chạm là mở thẳng máy tính)
//   2. Ô tìm + chip chọn thuốc cần thêm
//   3. Chỉ thuốc đang chọn mới bung thẻ đầy đủ
function InfusionCategoryScreen({
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

  // Gõ tới khi chỉ còn một kết quả thì mở luôn — bớt được một lần chạm.
  const effectiveId = selectedId ?? (query.trim() && filtered.length === 1 ? filtered[0].id : null)
  const selected = effectiveId ? allDrugs.find((d) => d.id === effectiveId) ?? null : null

  const diseasesForDrug = useMemo(() => {
    if (!selected?.indications?.length) return []
    const ids = new Set(selected.indications.map((i) => i.diseaseId))
    return diseases.filter((d) => ids.has(d.id))
  }, [selected, diseases])
  const hasDiseaseStep = diseasesForDrug.length > 0
  const selectedDisease =
    hasDiseaseStep && diseaseChoice && diseaseChoice !== DISEASE_SKIP ? diseases.find((d) => d.id === diseaseChoice) ?? null : null

  function selectDrug(id: string | null) {
    setSelectedId(id)
    setDiseaseChoice(null)
  }

  // Chọn xong thuốc mà thẻ kết quả nằm dưới hai màn hình cuộn thì thao tác chưa xong. Gấp khung
  // bệnh nhân rồi cuộn thẳng tới thẻ — đây là lý do duy nhất người dùng bấm vào chip thuốc.
  const cardRef = useRef<HTMLDivElement | null>(null)
  const readyForCard = !hasDiseaseStep || diseaseChoice !== null
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
          <SectionLabel tone="accent">Đang dùng cho bệnh nhân · {onPatient.length}</SectionLabel>
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
        {filtered.map((d, i) => (
          <Chip key={d.id} index={i} tone="accent" active={effectiveId === d.id} onClick={() => selectDrug(effectiveId === d.id ? null : d.id)}>
            {shortDrugName(d.name)}
          </Chip>
        ))}
      </div>

      {/* Chỉ định — chỉ hiện khi thuốc đang chọn có khai báo liều riêng theo bệnh lý, giống hệt bước
          "Chỉ định" ở AntibioticsScreen. */}
      {selected && hasDiseaseStep && (
        <div key={selected.id} className="fade-in mb-3">
          <SectionLabel>Chỉ định</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {diseasesForDrug.map((ds) => (
              <Chip key={ds.id} active={diseaseChoice === ds.id} onClick={() => setDiseaseChoice(ds.id)}>
                {ds.name}
              </Chip>
            ))}
            <Chip active={diseaseChoice === DISEASE_SKIP} onClick={() => setDiseaseChoice(DISEASE_SKIP)}>
              Liều chung
            </Chip>
          </div>
        </div>
      )}

      <div ref={cardRef} style={{ scrollMarginTop: 8 }}>
        {selected && readyForCard ? (
          <div key={`${selected.id}-${selectedDisease?.id ?? "none"}`} className="fade-in">
            <InfusionDrugCard drug={selected} disease={selectedDisease} isOverride={Boolean(selected.isCustom) && staticIds.has(selected.id)} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ) : (
          <p className={`${T.body} text-center px-4 py-6 ${R.card}`} style={{ background: C.surfaceAlt, color: C.muted }}>
            {filtered.length === 0
              ? "Không tìm thấy thuốc phù hợp."
              : !selected
                ? "Chọn một thuốc ở trên để mở máy tính pha và liều."
                : "Chọn chỉ định ở trên (hoặc Liều chung) để tiếp tục."}
          </p>
        )}
      </div>

      <button
        onClick={onAddNew}
        className={`w-full flex items-center justify-center gap-2 h-11 ${R.box} border border-dashed mt-3 ${T.bodyStrong}`}
        style={{ borderColor: C.accentLine, color: C.accent }}
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
function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(loadTheme)
  const next: Record<ThemeMode, ThemeMode> = { auto: "light", light: "dark", dark: "auto" }
  const glyph = mode === "light" ? icons.sun() : mode === "dark" ? icons.moon() : icons.sunMoon()
  return (
    <button
      onClick={() => {
        const m = next[mode]
        setMode(m)
        saveTheme(m)
        tickHaptic()
      }}
      className="flex-none w-9 h-9 rounded-full flex items-center justify-center active:scale-95"
      style={{
        // Cùng bộ nền/viền/đổ bóng với nút chọn chuyên khoa bên cạnh — hai nút đọc thành một cụm.
        background: "var(--c-float-bg)",
        backdropFilter: "blur(20px) saturate(1.6)",
        WebkitBackdropFilter: "blur(20px) saturate(1.6)",
        border: "1px solid var(--c-line)",
        boxShadow: "0 2px 10px var(--c-shadow)",
        color: C.textSoft,
        transition: "background .25s ease, color .25s ease, transform .12s ease",
      }}
      aria-label={`Chủ đề: ${THEME_LABELS[mode]}. Chạm để đổi.`}
      title={`Chủ đề: ${THEME_LABELS[mode]}`}
    >
      {glyph}
    </button>
  )
}

// ─── Dùng thuốc — màn hình cha chứa Kháng sinh / Co bóp cơ tim / Vận mạch / Giãn mạch / Rối loạn nhịp / Điện giải ──────

// Nhãn tab ngắn (một từ nếu được) để hàng tab không phải cuộn xa và không có tab nào tràn hai dòng.
// `search` là nhãn dài hơn, chỉ dùng trong câu "Tìm <...>" của ô tìm kiếm.
const MIXING_TABS: { id: MixingTab; label: string; search: string }[] = [
  { id: "antibiotics", label: "Kháng sinh", search: "kháng sinh" },
  { id: "inotrope", label: "Co bóp", search: "thuốc co bóp cơ tim" },
  { id: "vasoactive", label: "Vận mạch", search: "thuốc vận mạch" },
  { id: "vasodilator", label: "Giãn mạch", search: "thuốc giãn mạch" },
  { id: "arrhythmia", label: "Loạn nhịp", search: "thuốc chống loạn nhịp" },
  { id: "electrolyte", label: "Điện giải", search: "thuốc điện giải" },
]

// Tiêu đề một dòng, bỏ hẳn dòng mô tả phụ: dòng đó không giúp gì lúc trực mà lại đẩy nội dung
// xuống thấp và là nguồn gốc của mấy chỗ xuống dòng lệch nhau giữa các tab.
const MIXING_TITLES: Record<MixingTab, string> = {
  antibiotics: "Kháng sinh theo CrCl",
  inotrope: "Thuốc co bóp cơ tim",
  vasoactive: "Thuốc vận mạch",
  vasodilator: "Thuốc giãn mạch",
  arrhythmia: "Thuốc chống loạn nhịp",
  electrolyte: "Điện giải / chuyển hoá",
}

function DungThuocScreen({
  customAntibiotics,
  diseases,
  customInotropes,
  customVasoactives,
  customVasodilators,
  customArrhythmia,
  customElectrolytes,
  onAddAntibiotic,
  onAddInotrope,
  onAddVasoactive,
  onAddVasodilator,
  onAddArrhythmia,
  onAddElectrolyte,
  onEditAntibiotic,
  onEditInotrope,
  onEditVasoactive,
  onEditVasodilator,
  onEditArrhythmia,
  onEditElectrolyte,
  onDeleteAntibiotic,
  onDeleteInotrope,
  onDeleteVasoactive,
  onDeleteVasodilator,
  onDeleteArrhythmia,
  onDeleteElectrolyte,
}: {
  customAntibiotics: Antibiotic[]
  diseases: DiseaseEntry[]
  customInotropes: InfusionDrug[]
  customVasoactives: InfusionDrug[]
  customVasodilators: InfusionDrug[]
  customArrhythmia: InfusionDrug[]
  customElectrolytes: InfusionDrug[]
  onAddAntibiotic: () => void
  onAddInotrope: () => void
  onAddVasoactive: () => void
  onAddVasodilator: () => void
  onAddArrhythmia: () => void
  onAddElectrolyte: () => void
  onEditAntibiotic: (drug: Antibiotic) => void
  onEditInotrope: (drug: InfusionDrug) => void
  onEditVasoactive: (drug: InfusionDrug) => void
  onEditVasodilator: (drug: InfusionDrug) => void
  onEditArrhythmia: (drug: InfusionDrug) => void
  onEditElectrolyte: (drug: InfusionDrug) => void
  onDeleteAntibiotic: (id: string) => void
  onDeleteInotrope: (id: string) => void
  onDeleteVasoactive: (id: string) => void
  onDeleteVasodilator: (id: string) => void
  onDeleteArrhythmia: (id: string) => void
  onDeleteElectrolyte: (id: string) => void
}) {
  // Tab đang mở phải sống sót qua việc rời màn hình rồi quay lại — xem lib/uiState.ts.
  const [tab, setTab] = useStickyState<MixingTab>("dungthuoc.tab", "antibiotics")
  const { patient, setField, reset } = usePatientVitals()
  const [patientOpen, setPatientOpen] = useState(() => !patientHasData(patient))
  const [running, setRunning] = useState<RunningDrug[]>(loadRunning)
  const [log, setLog] = useState<CalcLogEntry[]>(loadCalcLog)
  const [showLog, setShowLog] = useState(false)
  const [wardRecipes, setWardRecipes] = useState<Record<string, WardRecipe[]>>(loadWardRecipes)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const abwKg = useMemo(() => {
    const v = parseFloat(patient.weight)
    return isNaN(v) || v <= 0 ? null : v
  }, [patient.weight])
  const heightCm = useMemo(() => {
    const v = parseFloat(patient.height)
    return isNaN(v) || v <= 0 ? null : v
  }, [patient.height])
  const ageYears = useMemo(() => {
    const v = parseFloat(patient.age)
    return isNaN(v) || v <= 0 ? null : v
  }, [patient.age])

  // CrCl dùng cân nặng hiệu chỉnh khi béo phì, theo cùng quy tắc áp dụng cho liều thuốc.
  const crcl = useMemo(() => {
    const w = resolveDosingWeight(abwKg, heightCm, patient.sex, "adjusted").used
    const s = parseFloat(patient.scr)
    if (ageYears == null || w == null || isNaN(s) || s <= 0) return null
    return estimateCrCl(ageYears, w, scrToMgDl(s, patient.scrUnit), patient.sex)
  }, [abwKg, heightCm, ageYears, patient.scr, patient.scrUnit, patient.sex])
  const crclUsable = crclReliability(patient) === "ok"

  const dosingCtx = useMemo<DosingContextValue>(
    () => ({
      patient,
      setPatientField: setField,
      // "Bệnh nhân mới" phải xoá SẠCH: thông số cũ nằm nguyên đó là kiểu sai nguy hiểm nhất vì nhìn
      // vẫn "có số". Bảng Đang truyền cũng thuộc về bệnh nhân cũ nên xoá cùng lúc.
      resetPatient: () => {
        reset()
        setRunning([])
        saveRunning([])
        setPatientOpen(true)
      },
      abwKg,
      heightCm,
      ageYears,
      crcl,
      crclUsable,
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
        // Trước đây id mới chỉ là `${drugId}-${Date.now()}` — độ phân giải mili-giây, nên bấm
        // "Lưu công thức" hai lần liên tiếp thật nhanh (double-tap trên điện thoại là chuyện
        // thường) có thể ra CÙNG một id, và công thức lưu sau âm thầm đè mất công thức lưu trước
        // thay vì tạo thêm một công thức mới. Thêm hậu tố ngẫu nhiên để luôn phân biệt được.
        setWardRecipes(
          saveWardRecipe({ ...recipe, id: recipe.id ?? `${recipe.drugId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, savedAt: Date.now() }),
        ),
      clearWard: (drugId, recipeId) => setWardRecipes(removeWardRecipe(drugId, recipeId)),
    }),
    [patient, setField, reset, abwKg, heightCm, ageYears, crcl, crclUsable, running, wardRecipes],
  )

  return (
    <DosingContext.Provider value={dosingCtx}>
    <div className="h-full flex flex-col relative">
      <ScreenHeader
        title={MIXING_TITLES[tab]}
        actions={
          <button
            onClick={() => setShowLog(true)}
            className={`flex-none h-9 px-3 ${R.pill} ${T.label} border`}
            style={{ borderColor: C.line, color: C.textSoft }}
          >
            Nhật ký{log.length > 0 ? ` · ${log.length}` : ""}
          </button>
        }
      />

      {/* Hàng tab — cùng chiều cao với mọi chip khác trong màn (44px vùng chạm) */}
      <div className="flex-none pb-3">
        <div className="scroll-ios flex gap-2 px-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {MIXING_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`${CHIP} border-transparent`}
              style={tab === t.id ? { background: C.primary, color: "var(--c-on-bright)" } : { background: C.lineSoft, color: "var(--c-text-muted)" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {/* Một vùng cuộn duy nhất cho cả khung bệnh nhân, bảng Đang truyền và danh sách thuốc —
          để khung bệnh nhân cuộn đi được thay vì chiếm chỗ cố định trên màn hình điện thoại. */}
      <div ref={scrollRef} className="scroll-ios flex-1">
        <DisclaimerBar />
        <PatientPanel open={patientOpen} onToggle={() => setPatientOpen((v) => !v)} />
        <RunningPanel />
        <div key={tab} className="fade-in">
          {tab === "antibiotics" && <AntibioticsScreen customDrugs={customAntibiotics} diseases={diseases} onAddNew={onAddAntibiotic} onEdit={onEditAntibiotic} onDelete={onDeleteAntibiotic} />}
          {tab === "inotrope" && <InfusionCategoryScreen staticDrugs={INOTROPES} customDrugs={customInotropes} diseases={diseases} categoryLabel="thuốc co bóp cơ tim" onAddNew={onAddInotrope} onEdit={onEditInotrope} onDelete={onDeleteInotrope} />}
          {tab === "vasoactive" && <InfusionCategoryScreen staticDrugs={VASOACTIVES} customDrugs={customVasoactives} diseases={diseases} categoryLabel="thuốc vận mạch" onAddNew={onAddVasoactive} onEdit={onEditVasoactive} onDelete={onDeleteVasoactive} />}
          {tab === "vasodilator" && <InfusionCategoryScreen staticDrugs={VASODILATORS} customDrugs={customVasodilators} diseases={diseases} categoryLabel="thuốc giãn mạch" onAddNew={onAddVasodilator} onEdit={onEditVasodilator} onDelete={onDeleteVasodilator} />}
          {tab === "arrhythmia" && <InfusionCategoryScreen staticDrugs={ANTIARRHYTHMICS} customDrugs={customArrhythmia} diseases={diseases} categoryLabel="thuốc chống loạn nhịp" onAddNew={onAddArrhythmia} onEdit={onEditArrhythmia} onDelete={onDeleteArrhythmia} />}
          {tab === "electrolyte" && <InfusionCategoryScreen staticDrugs={ELECTROLYTES} customDrugs={customElectrolytes} diseases={diseases} categoryLabel="thuốc điện giải" onAddNew={onAddElectrolyte} onEdit={onEditElectrolyte} onDelete={onDeleteElectrolyte} />}
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
      <DisclaimerGate />
    </div>
    </DosingContext.Provider>
  )
}

// ─── Mindmap ───────────────────────────────────────────────────────────────────
// Toàn bộ bảng vẽ nằm trong components/MindmapBoard.tsx — xem ghi chú ở đầu file đó.

function MindmapScreen({
  boards,
  activeBoardId,
  onSwitchBoard,
  onCreateBoard,
  onUpdateBoard,
  onDeleteBoard,
  onOpenBackup,
  ...boardProps
}: {
  data: MindmapData
  loading: boolean
  savedTick: number
  linkTargets: { target: string; label: string; group: string }[]
  onOpenLink: (target: string) => void
  updateNodes: (updater: (nodes: MindNode[]) => MindNode[]) => void
  updateEdges: (updater: (edges: MindEdge[]) => MindEdge[]) => void
  updateStrokes: (updater: (strokes: MindStroke[]) => MindStroke[]) => void
  updateImages: (updater: (images: MindImage[]) => MindImage[]) => void
  replaceAll: (next: MindmapData) => void
  undoStore: { undo: MindmapData[]; redo: MindmapData[] }
  boards: MindBoard[]
  activeBoardId: string
  onSwitchBoard: (id: string) => void
  onCreateBoard: (name: string, color: string, specialtyId?: string) => void
  onUpdateBoard: (id: string, patch: Partial<Pick<MindBoard, "name" | "color" | "specialtyId">>) => void
  onDeleteBoard: (id: string) => void
  onOpenBackup: () => void
}) {
  const [sheetMode, setSheetMode] = useState<"create" | "edit" | null>(null)
  const activeBoard = boards.find((b) => b.id === activeBoardId)
  // Chỉ nhắc sao lưu khi bảng đang mở thật sự có gì đáng mất — bảng mới tinh (chỉ có node "Chủ đề
  // trung tâm" mặc định, chưa vẽ, chưa dán ảnh) thì chưa cần nhắc.
  const hasContent = boardProps.data.nodes.length > 1 || (boardProps.data.strokes?.length ?? 0) > 0 || (boardProps.data.images?.length ?? 0) > 0
  const [showBackupReminder, setShowBackupReminder] = useState(false)
  useEffect(() => {
    if (!boardProps.loading && hasContent) setShowBackupReminder(shouldRemindBackup())
  }, [boardProps.loading, hasContent])

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Sơ đồ tư duy" />
      <BoardSwitcher
        boards={boards}
        activeBoardId={activeBoardId}
        onSwitch={onSwitchBoard}
        onTapActive={() => setSheetMode("edit")}
        onTapAdd={() => setSheetMode("create")}
      />
      {/* Nằm trong luồng bố cục bình thường (không float đè lên canvas) — bảng vẽ có sẵn 2 cụm công
          cụ neo ở góc dưới trái/phải (xem MindmapBoard.tsx), nổi đè lên đó vừa che vừa dễ bấm nhầm. */}
      {showBackupReminder && (
        <div className="flex-none flex items-center gap-2.5 mx-3 mb-2 px-4 py-2.5 rounded-2xl" style={{ background: "rgba(15,23,42,.94)" }}>
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
            onClick={onOpenBackup}
            className="flex-none text-[12.5px] font-bold px-3 py-1.5 rounded-full"
            style={{ background: "var(--c-surface)", color: "var(--c-primary)" }}
          >
            Sao lưu
          </button>
        </div>
      )}
      <div className="flex-1 overflow-hidden relative">
        {/* key=boardId: đổi bảng phải là một lượt mount MỚI hoàn toàn — thẻ đang chọn/đang sửa, lasso
            đang khoanh... của bảng cũ không có ý nghĩa gì trên bảng khác. Ngăn xếp hoàn tác không mất
            theo vì nó không sống trong component này — xem undoStore ở useMindmap.ts. */}
        <MindmapBoard key={activeBoardId} {...boardProps} />
      </div>
      {sheetMode && (
        <BoardEditSheet
          mode={sheetMode}
          board={sheetMode === "edit" ? activeBoard : undefined}
          canDelete={boards.length > 1}
          onClose={() => setSheetMode(null)}
          onCreate={(name, color, specialtyId) => {
            onCreateBoard(name, color, specialtyId)
            setSheetMode(null)
          }}
          onSave={(patch) => {
            if (activeBoard) onUpdateBoard(activeBoard.id, patch)
            setSheetMode(null)
          }}
          onDelete={() => {
            if (activeBoard) onDeleteBoard(activeBoard.id)
            setSheetMode(null)
          }}
        />
      )}
    </div>
  )
}

// ─── Bảng chọn / chuyển bảng Sơ đồ tư duy ─────────────────────────────────────
// Dải chip cuộn ngang ngay dưới tiêu đề màn hình — mỗi bảng một chip mang đúng màu/icon chuyên khoa
// đã gắn (hoặc màu tự chọn), để quét mắt nhận ra bảng cần mở mà không phải đọc hết từng tên. Bảng
// đang mở luôn nằm trong khung nhìn đầu tiên và có thêm bút chì để sửa tên/màu/xoá.
function BoardSwitcher({
  boards,
  activeBoardId,
  onSwitch,
  onTapActive,
  onTapAdd,
}: {
  boards: MindBoard[]
  activeBoardId: string
  onSwitch: (id: string) => void
  onTapActive: () => void
  onTapAdd: () => void
}) {
  return (
    <div className="flex-none flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
      {boards.map((b) => {
        const active = b.id === activeBoardId
        return (
          <button
            key={b.id}
            onClick={() => (active ? onTapActive() : onSwitch(b.id))}
            className="flex-none flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full border text-[12.5px] font-semibold whitespace-nowrap"
            style={
              active
                ? { background: `${b.color}1a`, borderColor: b.color, color: b.color }
                : { borderColor: "var(--c-line)", color: "var(--c-text-soft)" }
            }
          >
            <span className="w-4 h-4 flex-none" style={{ color: active ? b.color : "var(--c-muted)" }}>
              {specialtyIcon(b.specialtyId, "w-4 h-4")}
            </span>
            <span className="truncate max-w-[120px]">{b.name}</span>
            {active && <span className="w-3 h-3 flex-none opacity-70">{icons.edit()}</span>}
          </button>
        )
      })}
      <button
        onClick={onTapAdd}
        aria-label="Thêm bảng mới"
        className="flex-none w-11 h-11 rounded-full border flex items-center justify-center"
        style={{ borderColor: "var(--c-line)", color: "var(--c-primary)" }}
      >
        <span className="w-4 h-4">{icons.plus()}</span>
      </button>
    </div>
  )
}

// Tấm trượt lên tạo bảng mới / sửa bảng đang mở (tên, màu-chuyên khoa gắn thẻ, xoá bảng).
function BoardEditSheet({
  mode,
  board,
  canDelete,
  onClose,
  onCreate,
  onSave,
  onDelete,
}: {
  mode: "create" | "edit"
  board: MindBoard | undefined
  canDelete: boolean
  onClose: () => void
  onCreate: (name: string, color: string, specialtyId?: string) => void
  onSave: (patch: Partial<Pick<MindBoard, "name" | "color" | "specialtyId">>) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(board?.name ?? "")
  const [specialtyId, setSpecialtyId] = useState<string | undefined>(board?.specialtyId)
  const [color, setColor] = useState(board?.color ?? DEFAULT_BOARD_COLOR)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const swatches: { id: string | undefined; name: string; color: string }[] = [
    { id: undefined, name: "Khác", color: "#64748b" },
    ...SPECIALTIES.map((s) => ({ id: s.id, name: s.name, color: s.color })),
  ]

  function pick(sw: { id: string | undefined; color: string }) {
    setSpecialtyId(sw.id)
    setColor(sw.color)
  }

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (mode === "create") onCreate(trimmed, color, specialtyId)
    else onSave({ name: trimmed, color, specialtyId })
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col" style={{ background: "rgba(15,23,42,.35)" }}>
      <button className="flex-1" onClick={onClose} aria-label="Đóng" />
      <div className="rounded-t-3xl flex flex-col" style={{ background: "var(--c-surface)", maxHeight: "82%" }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="text-[13px] font-bold text-slate-900">{mode === "create" ? "Bảng mới" : "Sửa bảng"}</p>
          <button onClick={onClose} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--c-line-soft)", color: "var(--c-text-soft)" }} aria-label="Đóng">
            {icons.x()}
          </button>
        </div>
        <div className="scroll-ios px-5 pb-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Tên bảng</label>
            <input
              autoFocus={mode === "create"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Tim mạch, Thận, ECG…"
              className={FIELD}
              style={FIELD_STYLE}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Gắn theo chuyên khoa (để đổi màu + icon)</label>
            <div className="grid grid-cols-4 gap-2">
              {swatches.map((sw) => {
                const on = sw.id === specialtyId
                return (
                  <button
                    key={sw.name}
                    onClick={() => pick(sw)}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl border"
                    style={on ? { borderColor: sw.color, background: `${sw.color}14` } : { borderColor: "var(--c-line)" }}
                  >
                    <span className="w-5 h-5" style={{ color: sw.color }}>
                      {specialtyIcon(sw.id, "w-5 h-5")}
                    </span>
                    <span className="text-[10.5px] font-medium text-center leading-tight" style={{ color: on ? sw.color : "var(--c-text-soft)" }}>
                      {sw.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex-none flex gap-2 px-5 pt-2 border-t" style={{ borderColor: "var(--c-line)", paddingBottom: "var(--nav-pad-bottom)" }}>
          {mode === "edit" && canDelete && (
            <button
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true)
                  return
                }
                onDelete()
              }}
              onBlur={() => setConfirmDelete(false)}
              className="flex-1 py-3 rounded-2xl font-semibold text-[13px] border"
              style={confirmDelete ? { borderColor: C.dangerIcon, background: C.dangerSoft, color: C.danger } : { borderColor: C.dangerLine, color: C.danger }}
            >
              {confirmDelete ? "Chắc chắn xoá?" : "Xoá bảng"}
            </button>
          )}
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-2xl font-semibold text-[13px] disabled:opacity-50"
            style={{ background: "var(--c-primary)", color: "var(--c-on-bright)" }}
          >
            {mode === "create" ? "Tạo bảng" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dải "có bản cập nhật" ────────────────────────────────────────────────────
// Từ khi app chạy được offline (public/sw.js), một máy đã cài có thể chạy mãi từ bản đã cache. Với
// app tra liều thì im lặng dùng bảng liều cũ là rủi ro thật — nên có bản mới là phải nói ra.
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
      <button onClick={applyUpdate} className="text-[13px] font-bold px-3 py-1 rounded-full" style={{ background: "var(--c-surface)", color: "var(--c-primary)" }}>
        Tải lại
      </button>
    </div>
  )
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "home" as Screen, label: "Trang chủ", icon: icons.home },
  { id: "library" as Screen, label: "Thư viện", icon: icons.library },
  { id: "mixing" as Screen, label: "Dùng thuốc", icon: (active: boolean) => icons.pill(active) },
  { id: "mindmap" as Screen, label: "Mindmap", icon: icons.mindmap },
  { id: "flashcard" as Screen, label: "FlashCard", icon: icons.cards },
]

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [activeTab, setActiveTab] = useState<Screen>("home")
  const [articleId, setArticleId] = useState<string>("mi")
  const [specialtyId, setSpecialtyId] = useState<string>("cardiology")
  const [viewCustomId, setViewCustomId] = useState<string | null>(null)
  const [viewEcgId, setViewEcgId] = useState<string | null>(null)
  // Tên tính năng đang xem ở màn "Sắp ra mắt" — id truyền qua navigate() khi bấm một thẻ Truy cập
  // nhanh chưa có màn thật.
  const [comingSoonFeature, setComingSoonFeature] = useState<string>("")
  // Bản nháp đang sửa của bài viết tự nhập / bài học ECG — null nghĩa là đang TẠO MỚI. Mang theo cả
  // object (không chỉ id) để màn soạn thảo mở ra với nội dung sẵn có, giống cách sửa thuốc bên dưới.
  const [editArticleDraft, setEditArticleDraft] = useState<Article | null>(null)
  const [editEcgDraft, setEditEcgDraft] = useState<EcgLesson | null>(null)
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
  const [editInfusionDraft, setEditInfusionDraft] = useState<{
    category: "inotrope" | "vasoactive" | "vasodilator" | "arrhythmia" | "electrolyte"
    drug: InfusionDrug
  } | null>(null)
  const [history, setHistory] = useState<Screen[]>([])
  const [pulseKey, setPulseKey] = useState(0)
  // Những bài đã mở đọc, mới nhất trước (lưu trên máy — xem lib/recentReads.ts).
  const [recentReads, setRecentReads] = useState<ReadEntry[]>(loadRecentReads)

  // Các mục người dùng tự nhập — lưu trên máy (localStorage) nên còn nguyên qua các lần mở app.
  // Riêng bài viết: từ khi nội dung có thể chèn ảnh xen giữa các dòng, dữ liệu chuyển sang
  // IndexedDB (dung lượng lớn hơn nhiều localStorage) — bài viết cũ được tự động di trú một lần,
  // xem useIdbCollection.
  const customArticlesCol = useIdbCollection<Article>(IDB_STORES.articles, CUSTOM_COLLECTION_KEYS.articles)
  const customAntibioticsCol = useLocalCollection<Antibiotic>(CUSTOM_COLLECTION_KEYS.antibiotics)
  // Bệnh lý tự thêm — chủ yếu được tạo tự động khi sửa "Chỉ định riêng theo bệnh lý" của một kháng
  // sinh và gõ vào tên bệnh lý chưa có trong danh mục gốc (xem EditAntibioticScreen). `allDiseases`
  // gộp danh mục gốc với bản đã sửa/thêm, dùng thay cho DISEASES ở mọi nơi cần hiển thị hoặc chọn.
  const customDiseasesCol = useLocalCollection<DiseaseEntry>(CUSTOM_COLLECTION_KEYS.diseases)
  const allDiseases = useMemo(() => mergeWithOverrides(DISEASES, customDiseasesCol.items), [customDiseasesCol.items])
  const customInotropesCol = useLocalCollection<InfusionDrug>(CUSTOM_COLLECTION_KEYS.inotropes)
  const customVasoactivesCol = useLocalCollection<InfusionDrug>(CUSTOM_COLLECTION_KEYS.vasoactives)
  const customVasodilatorsCol = useLocalCollection<InfusionDrug>(CUSTOM_COLLECTION_KEYS.vasodilators)
  const customArrhythmiaCol = useLocalCollection<InfusionDrug>(CUSTOM_COLLECTION_KEYS.antiarrhythmics)
  const customElectrolytesCol = useLocalCollection<InfusionDrug>(CUSTOM_COLLECTION_KEYS.electrolytes)
  const customFlashcardsCol = useLocalCollection<FlashCard>(CUSTOM_COLLECTION_KEYS.flashcards)
  // Bài học ECG — lưu bằng IndexedDB (không phải localStorage) vì kèm ảnh, xem useIdbCollection.
  const ecgCol = useIdbCollection<EcgLesson>(IDB_STORES.ecgLessons)
  const allEcgLessons = [...ecgCol.items, ...ECG_LESSONS]
  // Sơ đồ tư duy — nhiều bảng (xem lib/boards.ts), mỗi bảng lưu riêng bằng IndexedDB (debounce, xem
  // useMindmap). Nâng lên cấp App() (thay vì để MindmapScreen tự giữ state riêng như trước) để
  // DataSyncScreen đọc/ghi được cùng dữ liệu.
  const { boards, activeBoardId, setActiveBoardId, createBoard, updateBoard, deleteBoard, upsertBoardLocal } = useBoards()
  const mindmap = useMindmap(activeBoardId)

  const NON_TAB_SCREENS: Screen[] = [
    "article",
    "specialty",
    "addEntry",
    "search",
    "customEntry",
    "addAntibiotic",
    "addInotrope",
    "addVasoactive",
    "addVasodilator",
    "addArrhythmia",
    "addElectrolyte",
    "editAntibiotic",
    "editInfusion",
    "dataSync",
    "ecg",
    "ecgDetail",
    "addEcg",
    "addFlashcard",
    "comingSoon",
  ]

  function navigate(s: Screen, id?: string) {
    // Mở một bài để đọc = ghi vào "Đã đọc gần đây". Đặt ngay tại đây (chỗ duy nhất mọi đường dẫn tới
    // ba màn hình đọc bài đều đi qua: bấm thẻ, tìm kiếm, mở liên kết trong bài) nên không có lối vào
    // nào bị bỏ sót.
    if (s === "article" && id) {
      setArticleId(id)
      setRecentReads(recordRead("article", id))
    }
    if (s === "specialty" && id) setSpecialtyId(id)
    if (s === "comingSoon" && id) setComingSoonFeature(id)
    if (s === "customEntry" && id) {
      setViewCustomId(id)
      setRecentReads(recordRead("custom", id))
    }
    if (s === "ecgDetail" && id) {
      setViewEcgId(id)
      setRecentReads(recordRead("ecg", id))
    }
    // Vào màn soạn thảo qua nút "+" luôn là TẠO MỚI — xoá bản nháp đang sửa (nếu có) để không mở
    // nhầm nội dung của lần sửa trước. Muốn sửa thì đi qua goToEditArticle/goToEditEcg.
    if (s === "addEntry") setEditArticleDraft(null)
    if (s === "addEcg") setEditEcgDraft(null)
    if (!NON_TAB_SCREENS.includes(s)) setActiveTab(s)
    setHistory((h) => [...h, screen])
    setScreen(s)
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

  function goToEditInfusion(category: "inotrope" | "vasoactive" | "vasodilator" | "arrhythmia" | "electrolyte", drug: InfusionDrug) {
    setEditInfusionDraft({ category, drug })
    setHistory((h) => [...h, screen])
    setScreen("editInfusion")
  }

  // "Đã đọc gần đây" cho Trang chủ: tra tiêu đề từ dữ liệu THẬT theo id đã lưu, nên bài đổi tên thì
  // dòng này đổi theo, bài đã xoá thì rơi ra khỏi danh sách thay vì để lại một dòng bấm vào không có
  // gì. Lấy 4 mục — vừa một khoảng cuối trang chủ, không phải cuộn thêm.
  const recentReadItems = useMemo<RecentReadItem[]>(() => {
    const out: RecentReadItem[] = []
    for (const e of recentReads) {
      if (out.length >= 4) break
      if (e.kind === "article") {
        const a = ARTICLES.find((x) => x.id === e.id)
        if (a) out.push({ key: `article:${a.id}`, id: a.id, title: a.title, at: e.at, screen: "article", tag: a.specialty })
      } else if (e.kind === "custom") {
        const a = customArticlesCol.items.find((x) => x.id === e.id)
        if (a) out.push({ key: `custom:${a.id}`, id: a.id, title: a.title, at: e.at, screen: "customEntry", tag: "Tự nhập" })
      } else {
        const l = allEcgLessons.find((x) => x.id === e.id)
        if (l) out.push({ key: `ecg:${l.id}`, id: l.id, title: l.title, at: e.at, screen: "ecgDetail", tag: "ECG" })
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentReads, customArticlesCol.items, ecgCol.items])

  // Danh sách mọi bài có thể chèn liên kết tới, dùng cho trình soạn thảo. `target` mã hoá luôn loại
  // màn hình cần mở ("article" = bài dựng sẵn, "custom" = bài tự nhập, "ecg" = bài học ECG) nên khi
  // bấm vào liên kết chỉ cần đọc chuỗi là biết đi đâu, không phải tra ngược nhiều danh sách.
  const linkTargets = useMemo(
    () => [
      ...ARTICLES.map((a) => ({ target: `article:${a.id}`, label: a.title, group: a.specialty })),
      ...customArticlesCol.items.map((a) => ({ target: `custom:${a.id}`, label: a.title, group: "Tự nhập" })),
      ...allEcgLessons.map((l) => ({ target: `ecg:${l.id}`, label: l.title, group: "ECG" })),
    ],
    [customArticlesCol.items, allEcgLessons],
  )

  // Mở một liên kết trong bài. Id không còn tồn tại (bài đã bị xoá sau khi chèn liên kết) thì bỏ
  // qua, không điều hướng tới màn trống.
  function openLinkTarget(target: string) {
    const sep = target.indexOf(":")
    if (sep < 0) return
    const kind = target.slice(0, sep)
    const id = target.slice(sep + 1)
    if (kind === "article" && ARTICLES.some((a) => a.id === id)) navigate("article", id)
    else if (kind === "custom" && customArticlesCol.items.some((a) => a.id === id)) navigate("customEntry", id)
    else if (kind === "ecg" && allEcgLessons.some((l) => l.id === id)) navigate("ecgDetail", id)
  }

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

  function goToEditArticle(a: Article) {
    setEditArticleDraft(a)
    setHistory((h) => [...h, screen])
    setScreen("addEntry")
  }

  function goToEditEcg(l: EcgLesson) {
    setEditEcgDraft(l)
    setHistory((h) => [...h, screen])
    setScreen("addEcg")
  }

  function handleSaveEntry(a: Article) {
    // Sửa: ghi đè đúng mục rồi quay lại màn đang xem. Tạo mới: về Trang chủ để thấy mục vừa thêm.
    if (editArticleDraft) {
      customArticlesCol.update(a)
      showToast("Đã lưu thay đổi")
      goBack()
      return
    }
    customArticlesCol.add(a)
    showToast("Đã lưu bài mới")
    setActiveTab("home")
    setHistory((h) => [...h, screen])
    setScreen("home")
  }

  function handleDeleteArticle(id: string) {
    customArticlesCol.remove(id)
    // Bỏ luôn khỏi "Đã đọc gần đây": bài không còn thì không được để lại một dòng bấm vào không mở
    // được gì. (Danh sách vẫn tự lọc khi hiển thị, đây là dọn sạch ngay cả trong bộ nhớ.)
    setRecentReads(forgetRead("custom", id))
    showToast("Đã xoá mục")
    goBack()
  }

  function handleSaveAntibiotic(a: Antibiotic, newDiseases: DiseaseEntry[] = []) {
    newDiseases.forEach((d) => customDiseasesCol.add(d))
    customAntibioticsCol.update(a)
    showToast("Đã lưu kháng sinh")
    goBack()
  }

  function handleSaveInotrope(d: InfusionDrug) {
    customInotropesCol.update(d)
    goBack()
  }

  function handleSaveVasoactive(d: InfusionDrug) {
    customVasoactivesCol.update(d)
    goBack()
  }

  function handleSaveVasodilator(d: InfusionDrug) {
    customVasodilatorsCol.update(d)
    goBack()
  }

  function handleSaveArrhythmia(d: InfusionDrug) {
    customArrhythmiaCol.update(d)
    goBack()
  }

  function handleSaveElectrolyte(d: InfusionDrug) {
    customElectrolytesCol.update(d)
    goBack()
  }

  // "editInfusion" dùng chung 1 màn cho cả 5 nhóm thuốc truyền — cần biết đang sửa thuốc thuộc
  // nhóm nào (lưu kèm trong editInfusionDraft) để ghi vào đúng collection.
  function handleSaveEditInfusion(d: InfusionDrug) {
    switch (editInfusionDraft?.category) {
      case "inotrope":
        customInotropesCol.update(d)
        break
      case "vasoactive":
        customVasoactivesCol.update(d)
        break
      case "vasodilator":
        customVasodilatorsCol.update(d)
        break
      case "arrhythmia":
        customArrhythmiaCol.update(d)
        break
      case "electrolyte":
        customElectrolytesCol.update(d)
        break
    }
    goBack()
  }

  function handleSaveEcg(l: EcgLesson) {
    if (editEcgDraft) ecgCol.update(l)
    else ecgCol.add(l)
    showToast(editEcgDraft ? "Đã lưu thay đổi" : "Đã lưu bài học ECG")
    goBack()
  }

  function handleDeleteEcg(id: string) {
    ecgCol.remove(id)
    setRecentReads(forgetRead("ecg", id))
    showToast("Đã xoá bài học")
    goBack()
  }

  function handleSaveFlashcard(c: FlashCard) {
    customFlashcardsCol.add(c)
    showToast("Đã thêm thẻ ghi nhớ")
    goBack()
  }

  // Nhập mỗi bảng Sơ đồ tư duy trong file vào ĐÚNG bảng cùng id trên máy (tạo bảng mới nếu id đó
  // chưa từng có). Bảng đang mở gộp qua state đang chạy (mindmap.importMerge) để giao diện cập nhật
  // ngay; các bảng khác không cần tải lên bộ nhớ chỉ để nhập — đọc/gộp/ghi thẳng trong IndexedDB.
  async function handleImportData(data: {
    articles: Article[]
    antibiotics: Antibiotic[]
    diseases: DiseaseEntry[]
    inotropes: InfusionDrug[]
    vasoactives: InfusionDrug[]
    vasodilators: InfusionDrug[]
    antiarrhythmics: InfusionDrug[]
    electrolytes: InfusionDrug[]
    ecgLessons: EcgLesson[]
    flashcards: FlashCard[]
    mindmapBoards: { board: MindBoard; mindmap: MindmapData }[]
    wardRecipes: WardRecipe[]
  }) {
    if (data.articles.length) customArticlesCol.upsertMany(data.articles)
    if (data.antibiotics.length) customAntibioticsCol.upsertMany(data.antibiotics)
    if (data.diseases.length) customDiseasesCol.upsertMany(data.diseases)
    if (data.inotropes.length) customInotropesCol.upsertMany(data.inotropes)
    if (data.vasoactives.length) customVasoactivesCol.upsertMany(data.vasoactives)
    if (data.vasodilators.length) customVasodilatorsCol.upsertMany(data.vasodilators)
    if (data.antiarrhythmics.length) customArrhythmiaCol.upsertMany(data.antiarrhythmics)
    if (data.electrolytes.length) customElectrolytesCol.upsertMany(data.electrolytes)
    if (data.ecgLessons.length) ecgCol.upsertMany(data.ecgLessons)
    if (data.flashcards.length) customFlashcardsCol.upsertMany(data.flashcards)
    if (data.wardRecipes.length) importWardRecipes(data.wardRecipes)
    for (const entry of data.mindmapBoards) {
      const existsLocally = boards.some((b) => b.id === entry.board.id)
      if (entry.board.id === activeBoardId) {
        mindmap.importMerge(entry.mindmap)
        if (!existsLocally) upsertBoardLocal(entry.board)
      } else {
        const current = await loadMindmap(entry.board.id)
        await saveMindmap(entry.board.id, mergeMindmaps(current, entry.mindmap))
        if (!existsLocally) upsertBoardLocal(entry.board)
      }
    }
  }

  function jumpTo(id: string, isFinal: boolean) {
    if (id === "home") {
      if (screen !== "home") {
        setHistory((h) => [...h, screen])
        setScreen("home")
      }
      setActiveTab("home")
      if (isFinal) setPulseKey((k) => k + 1)
      return
    }
    setSpecialtyId(id)
    if (screen !== "specialty") {
      setHistory((h) => [...h, screen])
      setScreen("specialty")
    }
    if (isFinal) setPulseKey((k) => k + 1)
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
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{
        background: "var(--c-surface)",
      }}
    >
        {/* Chừa chỗ cho tai thỏ / Dynamic Island. */}
        <div className="flex-none" style={{ height: "calc(var(--safe-top) + 6px)" }} />

        {/* Cụm nút nổi góc trên phải. Gom nút chủ đề và nút chọn chuyên khoa vào CÙNG một hàng
            flex thay vì để mỗi cái tự neo tuyệt đối: trước đây nút chuyên khoa neo `right: 18` và
            phủ z-50 lên đúng chỗ nút chủ đề nằm trong header Trang chủ — đo được chồng nhau 60px,
            tức là nút chủ đề bị che kín hoàn toàn. Nằm chung một hàng flex thì khoảng cách do
            `gap` quyết định, không cách nào đè lên nhau, và cả hai luôn thẳng một hàng ngang. */}
        {(screen === "home" || screen === "specialty") && (
          <div
            className="absolute z-50 flex items-center gap-2"
            style={{ top: "calc(var(--safe-top) + 36px)", right: 18, transform: "translateY(-50%)" }}
          >
            {screen === "home" && <ThemeToggle />}
            <SpecialtyPicker onSelect={jumpTo} currentId={screen === "home" ? "home" : specialtyId} />
          </div>
        )}

        {/* Vùng nội dung chiếm hết chiều cao còn lại SAU khi trừ thanh nav — nội dung dừng hẳn
            phía trên thanh nav, không thẻ nào bị cắt ngang. */}
        <div className={`flex-1 overflow-hidden${isDetailScreen ? "" : " has-nav"}`}>
          {screen === "home" && <HomeScreen onNavigate={navigate} ecgCount={allEcgLessons.length} recentReads={recentReadItems} />}
          {screen === "library" && <LibraryScreen onNavigate={navigate} customArticles={customArticlesCol.items} />}
          {screen === "search" && (
            <SearchScreen
              onNavigate={navigate}
              onBack={goBack}
              customArticles={customArticlesCol.items}
              customFlashcards={customFlashcardsCol.items}
              ecgLessons={allEcgLessons}
            />
          )}
          {screen === "mindmap" && (
            <MindmapScreen
              data={mindmap.data}
              loading={mindmap.loading}
              savedTick={mindmap.savedTick}
              linkTargets={linkTargets}
              onOpenLink={openLinkTarget}
              updateNodes={mindmap.updateNodes}
              updateEdges={mindmap.updateEdges}
              updateStrokes={mindmap.updateStrokes}
              updateImages={mindmap.updateImages}
              replaceAll={mindmap.replaceAll}
              undoStore={mindmap.undoStore}
              boards={boards}
              activeBoardId={activeBoardId}
              onSwitchBoard={setActiveBoardId}
              onCreateBoard={(name, color, specialtyId) => void createBoard(name, color, specialtyId)}
              onUpdateBoard={updateBoard}
              onDeleteBoard={(id) => void deleteBoard(id)}
              onOpenBackup={() => navigate("dataSync")}
            />
          )}
          {/* FlashcardScreen hoãn lại — UI hiện tại còn lỗi, đưa "sắp ra mắt" thay vì để người dùng
              thấy một tab lỗi tùm lum. Vẫn giữ nguyên tab dưới thanh nav (không phải NON_TAB_SCREENS)
              để không phá cấu trúc điều hướng — chỉ đổi nội dung bên trong. */}
          {screen === "flashcard" && <ComingSoonScreen feature="FlashCard" />}
          {screen === "article" && <ArticleScreen articleId={articleId} onBack={goBack} />}
          {screen === "specialty" && (
            <SpecialtyScreen
              specialtyId={specialtyId}
              pulseKey={pulseKey}
              customArticles={customArticlesCol.items}
              customFlashcards={customFlashcardsCol.items}
              onBack={goBack}
              onNavigate={navigate}
            />
          )}
          {screen === "addEntry" && (
            <AddEntryScreen key={editArticleDraft?.id ?? "new"} initial={editArticleDraft ?? undefined} linkTargets={linkTargets} onSave={handleSaveEntry} onBack={goBack} />
          )}
          {screen === "mixing" && (
            <DungThuocScreen
              customAntibiotics={customAntibioticsCol.items}
              diseases={allDiseases}
              customInotropes={customInotropesCol.items}
              customVasoactives={customVasoactivesCol.items}
              customVasodilators={customVasodilatorsCol.items}
              customArrhythmia={customArrhythmiaCol.items}
              customElectrolytes={customElectrolytesCol.items}
              onAddAntibiotic={() => navigate("addAntibiotic")}
              onAddInotrope={() => navigate("addInotrope")}
              onAddVasoactive={() => navigate("addVasoactive")}
              onAddVasodilator={() => navigate("addVasodilator")}
              onAddArrhythmia={() => navigate("addArrhythmia")}
              onAddElectrolyte={() => navigate("addElectrolyte")}
              onEditAntibiotic={goToEditAntibiotic}
              onEditInotrope={(d) => goToEditInfusion("inotrope", d)}
              onEditVasoactive={(d) => goToEditInfusion("vasoactive", d)}
              onEditVasodilator={(d) => goToEditInfusion("vasodilator", d)}
              onEditArrhythmia={(d) => goToEditInfusion("arrhythmia", d)}
              onEditElectrolyte={(d) => goToEditInfusion("electrolyte", d)}
              // Xoá thuốc tự nhập thì công thức pha đã lưu riêng cho nó (nếu có) cũng phải xoá theo —
              // không thì công thức đó thành mồ côi, không thuốc nào tham chiếu tới nhưng vẫn nằm
              // mãi trên máy và trong mọi lần xuất file sao lưu sau này.
              onDeleteAntibiotic={(id) => {
                clearWardRecipesForDrug(id)
                customAntibioticsCol.remove(id)
              }}
              onDeleteInotrope={(id) => {
                clearWardRecipesForDrug(id)
                customInotropesCol.remove(id)
              }}
              onDeleteVasoactive={(id) => {
                clearWardRecipesForDrug(id)
                customVasoactivesCol.remove(id)
              }}
              onDeleteVasodilator={(id) => {
                clearWardRecipesForDrug(id)
                customVasodilatorsCol.remove(id)
              }}
              onDeleteArrhythmia={(id) => {
                clearWardRecipesForDrug(id)
                customArrhythmiaCol.remove(id)
              }}
              onDeleteElectrolyte={(id) => {
                clearWardRecipesForDrug(id)
                customElectrolytesCol.remove(id)
              }}
            />
          )}
          {screen === "addAntibiotic" && <AddAntibioticScreen diseases={allDiseases} onSave={handleSaveAntibiotic} onBack={goBack} />}
          {screen === "addInotrope" && <AddInfusionScreen category="inotrope" diseases={allDiseases} onSave={handleSaveInotrope} onBack={goBack} />}
          {screen === "addVasoactive" && <AddInfusionScreen category="vasoactive" diseases={allDiseases} onSave={handleSaveVasoactive} onBack={goBack} />}
          {screen === "addVasodilator" && <AddInfusionScreen category="vasodilator" diseases={allDiseases} onSave={handleSaveVasodilator} onBack={goBack} />}
          {screen === "addArrhythmia" && <AddInfusionScreen category="arrhythmia" diseases={allDiseases} onSave={handleSaveArrhythmia} onBack={goBack} />}
          {screen === "addElectrolyte" && <AddInfusionScreen category="electrolyte" diseases={allDiseases} onSave={handleSaveElectrolyte} onBack={goBack} />}
          {screen === "editAntibiotic" &&
            (editAntibioticDraft ? (
              <EditAntibioticScreen drug={editAntibioticDraft} diseases={allDiseases} onSave={handleSaveAntibiotic} onBack={goBack} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 px-5">
                <p className="text-sm text-slate-500">Không tìm thấy thuốc cần sửa.</p>
                <button onClick={goBack} className="text-sm font-semibold" style={{ color: "var(--c-primary)" }}>
                  Quay lại
                </button>
              </div>
            ))}
          {screen === "editInfusion" &&
            (editInfusionDraft ? (
              <AddInfusionScreen category={editInfusionDraft.category} initial={editInfusionDraft.drug} diseases={allDiseases} onSave={handleSaveEditInfusion} onBack={goBack} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 px-5">
                <p className="text-sm text-slate-500">Không tìm thấy thuốc cần sửa.</p>
                <button onClick={goBack} className="text-sm font-semibold" style={{ color: "var(--c-primary)" }}>
                  Quay lại
                </button>
              </div>
            ))}
          {screen === "dataSync" && (
            <DataSyncScreen
              customArticles={customArticlesCol.items}
              customAntibiotics={customAntibioticsCol.items}
              customDiseases={customDiseasesCol.items}
              customInotropes={customInotropesCol.items}
              customVasoactives={customVasoactivesCol.items}
              customVasodilators={customVasodilatorsCol.items}
              customArrhythmia={customArrhythmiaCol.items}
              customElectrolytes={customElectrolytesCol.items}
              customEcgLessons={ecgCol.items}
              customFlashcards={customFlashcardsCol.items}
              boards={boards}
              activeBoardId={activeBoardId}
              onImport={handleImportData}
              onBack={goBack}
            />
          )}
          {screen === "customEntry" && (
            <CustomEntryScreen
              article={customArticlesCol.items.find((a) => a.id === viewCustomId)}
              relatedArticles={customArticlesCol.items.filter(
                (a) => a.specialty === customArticlesCol.items.find((x) => x.id === viewCustomId)?.specialty,
              )}
              onEdit={goToEditArticle}
              onDelete={handleDeleteArticle}
              onOpenLink={openLinkTarget}
              onOpenArticle={(a) => navigate("customEntry", a.id)}
              onBack={goBack}
            />
          )}
          {screen === "ecg" && <EcgScreen lessons={allEcgLessons} onNavigate={navigate} onBack={goBack} />}
          {screen === "ecgDetail" && (
            <EcgDetailScreen
              lesson={allEcgLessons.find((l) => l.id === viewEcgId)}
              onEdit={goToEditEcg}
              onDelete={handleDeleteEcg}
              onOpenLink={openLinkTarget}
              onBack={goBack}
            />
          )}
          {screen === "addEcg" && (
            <AddEcgScreen key={editEcgDraft?.id ?? "new"} initial={editEcgDraft ?? undefined} linkTargets={linkTargets} onSave={handleSaveEcg} onBack={goBack} />
          )}
          {screen === "addFlashcard" && <AddFlashcardScreen onSave={handleSaveFlashcard} onBack={goBack} />}
          {screen === "comingSoon" && <ComingSoonScreen feature={comingSoonFeature} onBack={goBack} />}
        </div>

        {/* Thanh điều hướng dưới. Mặt nền XÁM NHẠT (không phải trắng như nền trang) và kéo liền
            xuống hết vùng thanh gạt Home: đây là điểm mấu chốt của lỗi "dải trắng dưới thanh nav"
            trên iPhone. Khoảng chừa cho thanh gạt vẫn phải có (không được đặt nút bấm vào đó),
            nhưng khi nó cùng màu trắng với nền trang thì nhìn thành một khoảng trống thừa; tô khác
            màu một chút là cả dải đó đọc thành phần thân của thanh nav, liền tới cạnh máy. */}
        {!isDetailScreen && (
          <div
            className="flex-none"
            style={{
              background: "var(--c-nav-bg)",
              backdropFilter: "blur(20px) saturate(1.8)",
              WebkitBackdropFilter: "blur(20px) saturate(1.8)",
              borderTop: "1px solid var(--c-nav-border)",
              // Phần phủ lên vùng thanh gạt Home: chỉ là nền, không đặt nút bấm vào đây.
              paddingBottom: "var(--nav-pad-bottom)",
            }}
          >
            <div className="flex items-stretch" style={{ height: "var(--nav-body-h)" }}>
              {NAV_ITEMS.map(({ id, label, icon }) => {
                const isActive = activeTab === id
                return (
                  // flex-1: mỗi mục chiếm đúng 1/5 bề ngang nên vùng chạm rộng hơn hẳn so với việc
                  // chỉ đệm quanh chữ — ngón cái bấm hụt ít hơn, nhất là 2 mục ngoài rìa.
                  <button
                    key={id}
                    onClick={() => navigate(id)}
                    aria-current={isActive ? "page" : undefined}
                    className="nav-press flex-1 flex flex-col items-center justify-center gap-1"
                    // Mục chưa chọn dùng --c-text-muted chứ không phải --c-muted: nhãn nav chỉ cao
                    // 10px nên phải đạt ngưỡng tương phản 4.5:1 của chữ nhỏ. Đo trên nền thanh nav
                    // bản tối, --c-muted chỉ được 4.33:1 (trượt), --c-text-muted đạt 5.8:1.
                    style={{ color: isActive ? "var(--c-primary)" : "var(--c-text-muted)", transition: "color .2s ease" }}
                  >
                    <span
                      className="flex items-center justify-center h-8 rounded-full"
                      style={{
                        width: isActive ? 58 : 44,
                        // Viên nền của mục đang chọn đọc từ biến chủ đề. Mã cứng #e0edff cũ là một
                        // viên xanh nhạt gần trắng — trên nền tối nó sáng chói hơn cả icon bên trong.
                        background: isActive ? "var(--c-nav-active-bg)" : "transparent",
                        transition: "width .28s cubic-bezier(.34,1.4,.64,1), background-color .2s ease",
                      }}
                    >
                      {icon(isActive)}
                    </span>
                    <span
                      className="text-[10px] leading-none"
                      style={{ fontWeight: isActive ? 700 : 500, transition: "font-weight .2s ease" }}
                    >
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Ở màn chi tiết KHÔNG có thanh nav để tự "nuốt" giùm vùng thanh gạt Home, nên phải cộng
            tay `--safe-bottom` vào đây — nếu không, dải này sẽ nổi quá thấp, lấn vào đúng vùng
            thanh gạt trên iPhone toàn màn hình. */}
        <UpdateBanner offsetBottom={isDetailScreen ? "calc(24px + var(--safe-bottom))" : "calc(var(--nav-body-h) + 18px)"} />

        {/* Dải xác nhận — nổi trên thanh nav, không nhận thao tác nên không che nút nào. Cộng thêm
            52px (chiều cao viên "Có bản cập nhật" + khoảng cách) khi dải đó đang hiện, để xếp CHỒNG
            LÊN NHAU thay vì đè thẳng lên nhau — trước đây cả hai dải neo đúng một `bottom`. */}
        {toast && (
          <div
            className="toast-in absolute left-1/2 z-40 px-4 py-2.5 rounded-full text-[13px] font-semibold text-white pointer-events-none flex items-center gap-2"
            style={{
              bottom: updateBannerVisible
                ? (isDetailScreen ? "calc(24px + var(--safe-bottom) + 52px)" : "calc(var(--nav-body-h) + 18px + 52px)")
                : (isDetailScreen ? "calc(24px + var(--safe-bottom))" : "calc(var(--nav-body-h) + 18px)"),
              transform: "translateX(-50%)",
              background: "rgba(15,23,42,.92)",
              boxShadow: "0 8px 24px rgba(15,23,42,.28)",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "#4ade80" }}>✓</span>
            {toast}
          </div>
        )}
    </div>
  )
}
