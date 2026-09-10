import { useState, useRef, type ChangeEvent } from "react"
import type { Antibiotic, DiseaseEntry, InfusionDrug, FlashCard } from "../data/types"
import { INFUSION_CATEGORIES } from "../data"
import type { InfusionCategory } from "../data"
import { IDB_STORES, idbGetAllCoKetQua } from "../lib/idb"
import type { LoaiMuc, MucMeta } from "../board/mucMeta"
// xoaNoiDungBang.ts KHÔNG import gì từ @blocksuite/* hay ./mo-doc (D13) — IndexedDB thuần. Nó đã
// có mặt TĨNH trong chunk vỏ app từ trước, qua LuoiMuc.tsx (LuoiMuc → BoardGallery → App.tsx), nên
// một dòng import tĩnh ở đây không kéo thêm byte nào; bọc nó qua `import()` động chỉ tách ra một
// chunk riêng mà vỏ app vẫn tải tĩnh theo nhánh kia — thêm một request, không giảm được gì. Ca
// ghim D13 cho module này đứng trong chính xoaNoiDungBang.ts (describe "xoaNoiDungBang.ts — ranh
// giới D13" trong ranh-gioi-nap-bang.spec.ts), không phải ở đây — canh đúng bất biến "module này
// sạch BlockSuite", đúng bất kể ai import nó.
import { donRacBlobBang, xoaNoiDungBang } from "../board/xoaNoiDungBang"
import { loadWardRecipes, type WardRecipe } from "../lib/wardRecipes"
import { markBackupDone } from "../lib/backupReminder"
import { diffImportCounts, formatDateTime, latestTimestamp } from "../lib/importPreview"
import { icons } from "../components/icons"
import { C } from "../lib/ui"

// Một dòng dữ liệu trong màn "Đồng bộ dữ liệu": vừa dùng để hiển thị ô thống kê + hộp chọn xuất,
// vừa dùng để so khớp id lúc xem trước file nhập (`incomingOf` tự tra đúng nhánh của mình trong dữ
// liệu đã phân tích từ file — nhóm thuốc truyền tra theo `InfusionCategory.id`, còn khoá lưu trong
// JSON của file lại là `backupKey`, hai tên khác nhau nên phải tách riêng thay vì dùng chung `key`).
type SyncCategoryRow = {
  key: string
  label: string
  current: { id: string }[]
  incomingOf: (d: ImportPayload) => { id: string }[]
}

export type ImportPayload = {
  antibiotics: Antibiotic[]
  diseases: DiseaseEntry[]
  // Thuốc truyền tự nhập, gom theo nhóm — khoá của từng nhóm trong file sao lưu là `backupKey`
  // khai trong data/categories.ts (giữ nguyên tên cũ để file xuất từ bản trước vẫn nhập lại được).
  infusions: Record<InfusionCategory, InfusionDrug[]>
  flashcards: FlashCard[]
  wardRecipes: WardRecipe[]
  // Task 3 (giai đoạn 7-9): metadata của kho bài viết/sơ đồ hợp nhất (store `mucs`, xem
  // board/mucMeta.ts) — tên, danh mục, tag, chuyên khoa. CHỈ metadata, KHÔNG phải nội dung doc CRDT
  // thật (chữ/nét vẽ) — nội dung đó đi qua đường khác, tách riêng ở Task 4 vì rủi ro D13 khác hẳn
  // (D13: không import giá trị từ mo-doc.ts/EdgelessBoard/TrangBaiViet ngoài src/board/index.tsx).
  mucs: MucMeta[]
  // Task 4: NỘI DUNG doc CRDT của từng mục, tra theo `MucMeta.id`. Đi kèm `mucs` chứ không thay
  // nó — khoá `mucs` giữ nguyên hình dạng `MucMeta[]` mà Task 3 đã phát hành, nên file xuất từ bản
  // đang chạy vẫn nhập lại được nguyên vẹn.
  mucDocs: Record<string, NoiDungMucJson>
}

/**
 * Nội dung doc CRDT của một mục, ở dạng JSON đã tuần tự hoá — App.tsx CỐ Ý không biết hình dạng bên
 * trong. Mô tả nó cho đúng cần `DocSnapshot` của BlockSuite, mà mọi lối tới kiểu đó (kể cả một
 * `import type` từ `../board/xuatNhapNoiDung`) đều vi phạm cổng D13 canh file này. Giá trị chỉ đi
 * THẲNG từ file JSON vào `nhapSnapshotMuc`; không dòng nào trong App.tsx đọc vào bên trong nó, và
 * chính `nhapSnapshotMuc` là nơi kiểm hình dạng rồi ném nếu file hỏng.
 */
type NoiDungMucJson = Record<string, unknown>

// Snapshot đủ để hoàn tác một lần nhập file — CHỈ gồm các bảng gộp theo id (nơi nhập nhầm file cũ
// thật sự làm mất nội dung vừa sửa, vì mục trùng id bị THAY THẾ toàn bộ).
export type SyncSnapshot = {
  antibiotics: Antibiotic[]
  diseases: DiseaseEntry[]
  infusions: Record<InfusionCategory, InfusionDrug[]>
  flashcards: FlashCard[]
  wardRecipes: WardRecipe[]
  mucs: MucMeta[]
}

// I3 (BAN-GIAO-PHIEN-SAU.md mục 3 — quyết định chủ dự án qua AskUserQuestion 2026-09-09): ngưỡng
// CẢNH BÁO MỀM cho "Xuất file", không phải ngưỡng chặn. Đo thật: ảnh base64 luôn ≈ 4/3 dung lượng
// ảnh gốc, và 20-30 ảnh ECG chụp điện thoại (2-4MB/ảnh, phổ biến trong ổ đĩa của bác sĩ) đã cho ra
// file 100-160MB — đủ để nhiều điện thoại tầm trung chậm/treo khi giữ cùng lúc chuỗi JSON + Blob +
// bản gốc trong IndexedDB (có thể cộng dồn ~3x dung lượng ảnh).
const NGUONG_CANH_BAO_XUAT_BYTE = 80 * 1024 * 1024

// Kết quả `handleExport` đã dựng XONG (payload, blob, mọi câu trạng thái) nhưng CHƯA tải — chờ
// người dùng xác nhận vì file vượt `NGUONG_CANH_BAO_XUAT_BYTE`. Giữ nguyên `blob` đã dựng (không
// dựng lại): không phụ thuộc dữ liệu có đổi trong lúc chờ, nên tái dùng an toàn — khác `pendingImport`
// (phải giữ đúng snapshot đọc lúc mở panel để "Hoàn tác" không lệch nguồn).
type PendingLargeExport = {
  blob: Blob
  tenFile: string
  câuThanhCong: string
  danhDauDaSaoLuu: boolean
}

export function DataSyncScreen({
  customAntibiotics,
  customDiseases,
  customInfusions,
  customFlashcards,
  customMucs,
  duLieuChuaDocDuoc,
  onImport,
  onRestoreSnapshot,
  onBackupDone,
  onBack,
}: {
  customAntibiotics: Antibiotic[]
  customDiseases: DiseaseEntry[]
  customInfusions: Record<InfusionCategory, InfusionDrug[]>
  customFlashcards: FlashCard[]
  // Task 3 (giai đoạn 7-9): metadata store `mucs` (kho bài viết/sơ đồ hợp nhất) — xem chú thích ở
  // `ImportPayload` phía trên về ranh giới với nội dung doc CRDT thật (Task 4).
  customMucs: MucMeta[]
  // true khi danh mục lưu ở IndexedDB (kho `mucs`) KHÔNG đọc được
  // lượt này. Bắt buộc phải biết ở đây vì màn này là nơi duy nhất có thể biến một sự cố đọc tạm thời
  // thành MẤT DỮ LIỆU THẬT: payload xuất ra dựng từ chính các mảng trong bộ nhớ, mà đọc hỏng thì
  // chúng rỗng — người dùng nhận về một file "sao lưu" chứa `mucs: []` rồi ghi đè lên bản
  // backup tốt trước đó. Ảo giác mất dữ liệu ở các màn khác còn cứu được; ca này thì không.
  duLieuChuaDocDuoc: boolean
  onImport: (data: ImportPayload) => void
  onRestoreSnapshot: (snapshot: SyncSnapshot) => void
  onBackupDone: () => void
  onBack: () => void
}) {
  const [status, setStatus] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  // File đã đọc/phân tích xong, đang CHỜ người dùng xác nhận — chưa động gì tới dữ liệu trên máy.
  const [pendingImport, setPendingImport] = useState<{ data: ImportPayload; rows: { label: string; added: number; updated: number }[] } | null>(null)
  // I3: file XUẤT đã dựng xong nhưng CHƯA tải — chờ xác nhận vì vượt ngưỡng cảnh báo kích thước.
  const [pendingLargeExport, setPendingLargeExport] = useState<PendingLargeExport | null>(null)
  // Snapshot của lần nhập GẦN NHẤT trong phiên xem màn này — còn giữ thì còn hoàn tác được. Mất khi
  // rời màn hình (đổi tab/đóng app) vì dữ liệu đã lưu xuống máy ngay khi nhập, không có ý nghĩa "chưa
  // lưu" để giữ lại lâu hơn; đây là lưới an toàn cho đúng cái vừa bấm nhập, không phải một lịch sử.
  const [undoSnapshot, setUndoSnapshot] = useState<SyncSnapshot | null>(null)
  // ─── Nửa NỘI DUNG của cùng một lượt hoàn tác (Task 4b) ────────────────────────────────────
  // `undoSnapshot` ở trên chỉ chụp các BẢNG metadata. Từ Task 4, lượt nhập còn THAY HẲN nội dung
  // doc CRDT theo id — thứ KHÔNG có thùng rác nào khác trong app — nên "Hoàn tác" phải mang theo
  // cả ba danh sách dưới đây. Cả ba được đặt và xoá CÙNG LÚC với `undoSnapshot`, để hai nửa của
  // một lượt hoàn tác không bao giờ lệch pha nhau.
  //
  // 1) Nội dung CŨ của những mục ĐÃ CÓ trên máy, chụp TRƯỚC vòng ghi — "Hoàn tác" ghi lại đúng
  //    thứ này. Khoá là `MucMeta.id`.
  const [undoMucDocs, setUndoMucDocs] = useState<Record<string, NoiDungMucJson>>({})
  // 2) Mục mà file vừa THÊM MỚI: không có nội dung cũ nào để trả về, nên "Hoàn tác" phải XOÁ nội
  //    dung vừa ghi thay vì khôi phục (xem `handleUndo`). Giữ kèm tên để gọi đúng tên nếu xoá hỏng.
  const [undoMucMoi, setUndoMucMoi] = useState<{ id: string; ten: string }[]>([])
  // 3) Tên những mục KHÔNG chụp được nội dung cũ. "Hoàn tác" không lùi được nội dung của chúng và
  //    phải nói thẳng ra, thay vì báo một lượt hoàn tác "trọn vẹn" sai sự thật.
  const [undoMucKhongChup, setUndoMucKhongChup] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  // ─── Khoá LỐI VÀO dùng CHUNG cho handleConfirmImport và handleExport (Task 9c, vòng sửa 2/5,
  // findings-r2 Important 1 + "Cùng gốc") ────────────────────────────────────────────────────────
  // Hai vòng liên tiếp trước đã vá một race bằng cách SẮP XẾP LẠI THỨ TỰ DÒNG — cả hai lần đều chỉ
  // dời cửa sổ hở sang một chỗ khác thay vì đóng nó: vòng gốc thêm một `await` giữa hai bước vốn
  // đồng bộ; vòng sửa 1 dời `setPendingImport(null)` lên trước `await` đó (đóng đúng MỘT cửa sổ,
  // trên chính nút "Xác nhận nhập"), nhưng `setImporting(true)` chỉ được gọi rất muộn — và KHÔNG
  // BAO GIỜ nếu file chỉ mang metadata — nên suốt khoảng từ lúc panel đóng tới lúc đó, `importing`
  // vẫn `false` và cả nút "Nhập file đã sao lưu" lẫn nút "Xuất file sao lưu" (cả hai chỉ gate bằng
  // `exporting || importing`) vẫn bấm được, mở ra một lối vào ĐỘC LẬP thứ hai.
  //
  // Lần này khoá bằng CƠ CHẾ, không phải thứ tự: `ref` có hiệu lực NGAY trong cùng lượt thực thi,
  // trước bất kỳ `await` nào — khác `setState`, chỉ có hiệu lực SAU lượt render kế tiếp (đúng chỗ
  // hai vòng trước đã thất bại). Đặt `true` là việc gần như đầu tiên mỗi hàm làm (ngay sau các
  // early-return đồng bộ, không tốn thời gian, của riêng nó), và CHỈ nhả trong một `finally` phủ
  // TOÀN BỘ phần thân còn lại — kể cả các nhánh `return` sớm — để không bao giờ kẹt bật.
  const dongBoDangChayRef = useRef(false)
  // Bản sao STATE của ref trên — CHỈ để RENDER `disabled` trên nút Xuất/Nhập + input file ẩn (ref
  // không tự kích hoạt render). KHÔNG dùng state này để gate logic bên trong hai hàm — luôn dùng
  // ref cho việc đó, vì state chỉ chắc chắn phản ánh đúng SAU lượt render kế tiếp.
  const [dongBoDangChay, setDongBoDangChay] = useState(false)

  // Công thức pha (bảng "Cách dùng"/"Đường dùng" người dùng tự chỉnh mỗi thuốc) đọc thẳng từ
  // localStorage — KHÔNG được quên trong bản sao lưu, vì đây chính là dữ liệu tốn công nhập nhất
  // (mỗi khoa một kiểu pha) và trước đây bị bỏ sót hoàn toàn khỏi "Xuất file"/"Nhập file".
  const wardRecipesByDrug = loadWardRecipes()
  const wardRecipeList = Object.values(wardRecipesByDrug).flat()

  const categoryRows: SyncCategoryRow[] = [
    { key: "antibiotics", label: "Kháng sinh", current: customAntibiotics, incomingOf: (d) => d.antibiotics },
    { key: "diseases", label: "Bệnh lý tự thêm", current: customDiseases, incomingOf: (d) => d.diseases },
    // Một dòng cho mỗi nhóm thuốc truyền, đọc từ danh mục nhóm — thêm nhóm mới là bảng này tự có
    // thêm dòng, không còn nguy cơ quên một nhóm rồi tưởng nhóm đó không có dữ liệu.
    ...INFUSION_CATEGORIES.map((c) => ({
      key: c.backupKey,
      label: c.title,
      current: customInfusions[c.id] ?? [],
      incomingOf: (d: ImportPayload) => d.infusions[c.id] ?? [],
    })),
    { key: "wardRecipes", label: "Công thức pha đã lưu", current: wardRecipeList, incomingOf: (d) => d.wardRecipes },
    { key: "flashcards", label: "Thẻ ghi nhớ tự nhập", current: customFlashcards, incomingOf: (d) => d.flashcards },
    // Task 3: metadata mucs (kho bài viết/sơ đồ hợp nhất) — chỉ tên/danh mục/tag/chuyên khoa, không
    // phải nội dung doc CRDT thật (xem chú thích ImportPayload).
    { key: "mucs", label: "Bài viết & Sơ đồ", current: customMucs, incomingOf: (d) => d.mucs },
  ]

  const [exportSelection, setExportSelection] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(categoryRows.map((r) => [r.key, true])),
  )
  const selectedCount = categoryRows.filter((r) => exportSelection[r.key] !== false).length

  function toggleExportKey(key: string) {
    setExportSelection((prev) => ({ ...prev, [key]: prev[key] === false }))
  }
  function selectAllExport(value: boolean) {
    setExportSelection(Object.fromEntries(categoryRows.map((r) => [r.key, value])))
  }

  // Đọc dữ liệu THẬT của TỪNG bảng trực tiếp từ IndexedDB ngay lúc xuất, thay vì giữ sẵn tất cả các
  // bảng trong bộ nhớ suốt lúc dùng app — phần lớn thời gian chỉ một bảng đang mở là cần tới.
  async function handleExport() {
    if (selectedCount === 0) {
      setStatus("Chọn ít nhất một mục để xuất.")
      return
    }
    // Khoá LỐI VÀO dùng CHUNG với handleConfirmImport (vòng sửa 2/5 — findings-r2, "Cùng gốc, sửa
    // luôn — nút Xuất file sao lưu"): xem chú thích đầy đủ tại nơi khai `dongBoDangChayRef` (đầu
    // DataSyncScreen) về vì sao đây phải là REF đặt sớm nhất có thể, không phải chỉ dựa vào
    // `exporting`/`importing`. Nút này CÙNG GỐC thiếu khoá với nút Nhập: trong đúng cửa sổ hở mà
    // `handleConfirmImport` để lại (từ lúc đóng panel xem trước tới lúc `setImporting(true)`),
    // `exporting` lẫn `importing` đều `false`, nên trước bản vá này bấm Xuất ngay lúc đó vẫn chạy
    // — một lượt đọc `mucs` ĐỘC LẬP song song với lượt Nhập còn dở.
    if (dongBoDangChayRef.current) return
    dongBoDangChayRef.current = true
    setDongBoDangChay(true)
    try {
    // CHẶN CỨNG, không phải cảnh báo rồi vẫn cho đi tiếp: xuất lúc này tạo ra một file trông hợp lệ
    // nhưng thiếu dữ liệu, và người dùng thường ghi đè nó lên bản sao lưu trước đó — biến một sự cố
    // đọc tạm thời (tab app bản cũ đang giữ IndexedDB) thành mất dữ liệu vĩnh viễn. Đây là đúng
    // loại thao tác một chiều mà chặn thì phiền vài giây, còn cho qua thì không lấy lại được.
    //
    // RÀO theo `exportSelection["mucs"]` (BỔ SUNG Task 9c, re-review Task 9b): `duLieuChuaDocDuoc` chỉ
    // phản ánh lượt đọc `mucsCol` lúc MOUNT (`mucsCol.loiDoc !== null`, xem prop này ở App.tsx). Trước
    // dòng rào này, một lượt đọc `mucs` hỏng lúc mount chặn CỨNG toàn bộ nút Xuất — kể cả khi người
    // dùng đã bỏ chọn ô "Bài viết & Sơ đồ" — đúng hình dạng lỗi Important 1 mà Task 9b đã vá cho lượt
    // đọc TƯƠI bên dưới (dòng exportSelection["mucs"] !== false ở khối "Đọc TƯƠI kho mucs"), chỉ khác
    // đây là lượt đọc lúc MOUNT chứ không phải lúc bấm nút.
    if (duLieuChuaDocDuoc && exportSelection["mucs"] !== false) {
      // Minor 6 (review vòng sửa 1/5): câu anh em ở nhánh đọc-tươi-hỏng bên dưới có nêu lối thoát
      // "bỏ chọn ô Bài viết & Sơ đồ" — câu này thì không, dù cùng được rào bởi
      // `exportSelection["mucs"] !== false` ở trên nên lối thoát đó nay ĐÃ THẬT (D12: làm đúng lời
      // khuyên phải thoát được thật). Thêm vào cho hai câu nói cùng một sự thật.
      setStatus(
        "Chưa xuất được: app chưa đọc được toàn bộ dữ liệu trên máy lượt này, nên file xuất ra sẽ thiếu. Đóng các tab khác đang mở app rồi tải lại trang, sau đó xuất lại — hoặc bỏ chọn ô \"Bài viết & Sơ đồ\" nếu chỉ cần sao lưu các mục còn lại.",
      )
      return
    }
    setExporting(true)
    try {
      const pick = <T,>(key: string, items: T[]): T[] => (exportSelection[key] !== false ? items : [])

      // ─── Đọc TƯƠI kho `mucs` ngay tại thời điểm xuất (Task 9b) ──────────────────────────────
      // `customMucs` (tham số của DataSyncScreen, dựng từ `mucsCol` cấp App — xem App.tsx dòng
      // ~11897) là MỘT trong BA instance `useIdbCollection<MucMeta>` độc lập cùng đọc store
      // `mucs`: SearchScreen có instance riêng, App() cấp trên có `mucsCol` (nguồn của prop này),
      // và LuoiMuc.tsx — nơi mục MỚI được TẠO — có instance thứ ba. Ba instance không đồng bộ
      // NGANG với nhau: lượt ghi qua một instance chỉ cập nhật state của CHÍNH NÓ, hai instance
      // kia không hay biết cho tới khi tự đọc lại IndexedDB. Khác các chỗ CHỈ ĐỌC (đếm hiển thị
      // trước khi bấm, `loaiCua` của đường nhập, `mucTrenMay`) — vô hại vì chỉ đọc — đường XUẤT
      // dùng bản có thể đã CŨ để tạo ra một FILE, và file đó thường ghi đè lên bản sao lưu tốt
      // trước đó: đo được trên Chrome thật (Task 9) — tạo mục mới trong phiên rồi bấm Xuất file
      // ngay, IndexedDB có 6 mục, file xuất ra chỉ 5, không một chữ cảnh báo.
      //
      // Đọc bằng `idbGetAllCoKetQua` (không phải `idbGetAll`) để PHÂN BIỆT "kho rỗng thật" với
      // "lượt đọc hỏng" — `idbGetAll` nuốt lỗi thành `[]`, khiến hai ca đó trông y hệt nhau (đúng
      // bẫy mà idb.ts đã ghi chú cho chính hàm này). Ràng buộc dưới đây cần biết CHẮC là hỏng để
      // chặn cứng, không phải suy đoán từ một mảng rỗng.
      //
      // RÀO theo `exportSelection["mucs"]` (vòng sửa review — findings Important 1): lượt đọc tươi
      // chỉ chạy khi ô "Bài viết & Sơ đồ" đang được CHỌN. Trước bản vá này, lượt đọc chạy VÔ ĐIỀU
      // KIỆN — khi store `mucs` đọc hỏng, nó chặn TOÀN BỘ lượt xuất kể cả lúc người dùng đã bỏ chọn
      // ô đó, biến câu khuyên "bỏ chọn ô Bài viết & Sơ đồ nếu chỉ cần sao lưu các mục còn lại" ở
      // dưới thành một lối thoát KHÔNG TỒN TẠI — làm đúng như app dặn vẫn gặp y hệt câu chặn. Rào
      // lại đây khiến câu khuyên đó ĐÚNG SỰ THẬT: bỏ chọn ô thì lượt đọc còn không chạy tới, các
      // nhóm khác (kháng sinh, bệnh lý, công thức pha…) xuất bình thường dù `mucs` đang hỏng.
      let mucsTuoi: MucMeta[] = []
      if (exportSelection["mucs"] !== false) {
        const ketQuaMucsTuoi = await idbGetAllCoKetQua<MucMeta>(IDB_STORES.mucs)
        if (!ketQuaMucsTuoi.ok) {
          // CHẶN CỨNG, không im lặng rơi về `customMucs` cũ — cùng lập luận với `duLieuChuaDocDuoc`
          // ở đầu hàm: một file trông hợp lệ nhưng dựng từ bản sao CŨ (có thể thiếu mục vừa tạo qua
          // instance khác) thường bị ghi đè lên bản sao lưu tốt trước đó, biến một sự cố đọc tạm
          // thời thành mất dữ liệu vĩnh viễn.
          setStatus(
            `Chưa xuất được: không đọc lại được kho "Bài viết & Sơ đồ" ngay lúc xuất (${ketQuaMucsTuoi.loi}). Thử lại, hoặc bỏ chọn ô "Bài viết & Sơ đồ" nếu chỉ cần sao lưu các mục còn lại.`,
          )
          return
        }
        mucsTuoi = ketQuaMucsTuoi.items
      }
      // ─── Nội dung doc CRDT của từng mục (Task 4) ────────────────────────────────────────────
      // Nạp CHẬM và CÓ ĐIỀU KIỆN: `../board/xuatNhapNoiDung` kéo theo cả khối BlockSuite (~4 MB),
      // nên chỉ được chạm tới đúng lúc người dùng bấm "Xuất file" VÀ còn chọn ô "Bài viết & Sơ đồ".
      // `import()` động là điều kiện D13 — cổng canh ở board/__tests__/ranh-gioi-nap-bang.spec.ts.
      const mucDocs: Record<string, NoiDungMucJson> = {}
      const mucLoi: string[] = []
      // Mục đọc được CHỮ nhưng mất ẢNH. Khác `mucLoi` (không đọc được gì): nội dung vẫn đáng sao
      // lưu, nhưng bản sao lưu KHÔNG trọn vẹn và người dùng phải biết ngay lúc này — nếu không,
      // file thiếu ảnh sẽ được ghi đè lên bản tốt trước đó mà không ai hay.
      const mucThieuAnh: string[] = []
      if (exportSelection["mucs"] !== false && mucsTuoi.length > 0) {
        setStatus(`Đang đọc nội dung ${mucsTuoi.length} bài viết/sơ đồ…`)
        // `.catch(() => null)` chứ không để lời gọi tự ném: chunk động có thể KHÔNG tải được (mất
        // mạng ở lần mở đầu tiên — tình huống thật mà board/index.tsx đã phải dựng cả một pane hồi
        // phục cho, xem ranh-gioi-nap-bang.spec.ts). Một promise bị từ chối ở đây thoát ra khỏi
        // handler onClick mà không ai bắt: người dùng chỉ thấy nút ngừng quay, không lời giải thích.
        const modNoiDung = await import("../board/xuatNhapNoiDung").catch((loi) => {
          console.warn("handleExport: không nạp được module nội dung doc", loi)
          return null
        })
        // CHẶN CỨNG chứ không xuất tiếp thiếu nội dung — cùng lập luận với `duLieuChuaDocDuoc` ở
        // đầu hàm: một file trông hợp lệ nhưng rỗng ruột thường được ghi đè lên bản sao lưu tốt
        // trước đó, biến sự cố tạm thời thành mất dữ liệu vĩnh viễn.
        if (!modNoiDung) {
          setStatus(
            "Chưa xuất được: không tải được phần đọc nội dung bài viết/sơ đồ (lần đầu cần mạng). Kết nối mạng rồi xuất lại — hoặc bỏ chọn ô \"Bài viết & Sơ đồ\" nếu chỉ cần sao lưu các mục còn lại.",
          )
          return
        }
        // Tuần tự chứ không Promise.all: mỗi lượt mở một workspace BlockSuite riêng trên cùng một
        // CSDL IndexedDB, chạy song song là mời một cuộc đua không cần thiết vào đúng đường sao lưu.
        // Mục đã xoá mềm (`daXoaLuc`) VẪN được xuất — metadata của chúng cũng đang được xuất, để
        // lại nội dung thì "Hoàn tác xoá" sau khi khôi phục sẽ trả về một mục rỗng.
        // M2 (review toàn nhánh, final-review-findings.md): KHÁC `handleConfirmImport` (xem chú
        // thích "Mục file THÊM MỚI: KHÔNG gọi xuatSnapshotMuc..." tại nhánh chụp nội dung cũ của
        // hàm đó) — ở ĐÂY gọi `xuatSnapshotMuc` cho MỌI mục trong `mucsTuoi`, kể cả mục chưa từng
        // mở, là ĐÚNG chứ không phải sơ suất lặp lại lỗi đã né ở chỗ kia. Khác biệt: `mucsTuoi` là
        // danh sách mục ĐANG TỒN TẠI thật trên máy (vừa đọc tươi từ store `mucs` ở trên), không
        // phải "mục mà file nhập liệt kê nhưng máy chưa từng thấy" — nên doc CRDT `taoHoacMoDoc`
        // dựng ra (rỗng nếu mục đó chưa từng soạn nội dung) là doc HỢP LỆ của một mục có thật, có
        // metadata chống lưng trong chính `payload` đang xuất, không mồ côi. Không tốn công vô ích
        // (mục nào cũng cần đọc để xuất) và không để lại rác nào cho "Hoàn tác" phải dọn.
        for (const m of mucsTuoi) {
          try {
            const noiDung = await modNoiDung.xuatSnapshotMuc(m.id, m.loai)
            if (noiDung) {
              mucDocs[m.id] = noiDung as unknown as NoiDungMucJson
              const soAnhThieu = noiDung.anhThieu?.length ?? 0
              if (soAnhThieu > 0) mucThieuAnh.push(`${m.ten} (${soAnhThieu} ảnh)`)
            } else mucLoi.push(m.ten)
          } catch (loi) {
            console.warn(`handleExport: không đọc được nội dung mục ${m.id}`, loi)
            mucLoi.push(m.ten)
          }
        }
      }
      const payload = {
        app: "drtrong",
        version: 2,
        exportedAt: new Date().toISOString(),
        data: {
          antibiotics: pick("antibiotics", customAntibiotics),
          diseases: pick("diseases", customDiseases),
          // Mỗi nhóm thuốc truyền một khoá riêng trong file, tên khoá lấy từ `backupKey` của nhóm
          // (data/categories.ts) — 5 nhóm cũ giữ nguyên tên cũ nên file xuất từ bản trước và file
          // xuất từ bản này đọc lẫn nhau được.
          ...Object.fromEntries(INFUSION_CATEGORIES.map((c) => [c.backupKey, pick(c.backupKey, customInfusions[c.id] ?? [])])),
          flashcards: pick("flashcards", customFlashcards),
          wardRecipes: pick("wardRecipes", wardRecipeList),
          mucs: pick("mucs", mucsTuoi),
          mucDocs,
        },
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
      const now = new Date()
      const two = (n: number) => String(n).padStart(2, "0")
      const stamp = `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}`
      const tenFile = `drtrong-du-lieu-${stamp}.json`
      // I1 (review toàn nhánh, final-review-findings.md) — lỗi LIÊN-TASK: `hasCustomContent`
      // (khai báo cạnh `mucsCol`, đầu App()) tính lời nhắc sao lưu THEO CẢ kho `mucs` (Task 5-8),
      // nhưng hai lối thoát Task 9b/9c thêm ở trên ("bỏ chọn ô Bài viết & Sơ đồ nếu chỉ cần sao lưu
      // các mục còn lại") cho phép một lượt xuất THÀNH CÔNG mà không mang theo mucs — hoặc mang
      // theo nhưng một số mục chỉ đọc được TÊN (mucLoi, không phải nội dung thật). Chỉ đánh dấu "đã
      // sao lưu" khi ô "Bài viết & Sơ đồ" còn được CHỌN và MỌI mục đều đọc được nội dung — ngược lại
      // GIỮ lời nhắc sống, không im lặng bỏ qua (D12: đừng hứa "đã sao lưu" khi lượt này thực ra
      // chưa đủ).
      const mucsDaSaoLuuDuTron = exportSelection["mucs"] !== false && mucLoi.length === 0
      // "mucs" dùng `mucsTuoi.length` (số THẬT vừa xuất) chứ không phải `r.current.length` (chính
      // là `customMucs.length`, có thể lệch với số thật — xem chú thích ở đầu khối đọc tươi phía
      // trên): nếu số mục tươi khác số hiển thị trước khi bấm, đó không phải lỗi, nhưng dòng trạng
      // thái phải nói đúng số đã thật sự nằm trong file.
      const exportedCount = categoryRows.reduce(
        (n, r) => n + (exportSelection[r.key] !== false ? (r.key === "mucs" ? mucsTuoi.length : r.current.length) : 0),
        0,
      )
      // Mục nào không đọc được nội dung phải được GỌI TÊN, không nuốt vào một lượt xuất "thành
      // công": metadata của nó vẫn nằm trong file, nên nhập lại sẽ ra một mục trống mà người dùng
      // tưởng là đầy đủ.
      const canhBaoNoiDung = mucLoi.length > 0 ? ` Chưa đọc được nội dung của: ${mucLoi.join(", ")} — mục đó trong file sẽ chỉ có tên, không có nội dung.` : ""
      const canhBaoAnh = mucThieuAnh.length > 0 ? ` Thiếu ảnh trong: ${mucThieuAnh.join(", ")} — ảnh đó không còn trên máy nên file sao lưu này KHÔNG có chúng; giữ lại bản sao lưu cũ nếu bản cũ còn đủ ảnh.` : ""
      // I1: nói rõ lượt này KHÔNG được tính là đã sao lưu, để người dùng không tưởng nhầm là xong.
      const canhBaoChuaDanhDauSaoLuu = mucsDaSaoLuuDuTron
        ? ""
        : " Lượt xuất này CHƯA được tính là đã sao lưu (thiếu hoặc lỗi nội dung Bài viết & Sơ đồ) — lời nhắc sao lưu vẫn còn cho tới khi bạn xuất đủ."
      const câuThanhCong = `Đã xuất ${exportedCount} mục ra file${selectedCount < categoryRows.length ? " (đã bỏ một số mục theo lựa chọn)" : ""}.${canhBaoNoiDung}${canhBaoAnh}${canhBaoChuaDanhDauSaoLuu}`

      // I3 (BAN-GIAO-PHIEN-SAU.md mục 3 — quyết định chủ dự án qua AskUserQuestion 2026-09-09):
      // cảnh báo MỀM khi file ước tính lớn, không chặn. Ngưỡng ~80MB đo được từ dữ liệu thật: ảnh
      // base64 luôn ≈ 4/3 dung lượng ảnh gốc, và 20-30 ảnh ECG chụp điện thoại (2-4MB/ảnh, phổ
      // biến) đã cho ra 100-160MB — đủ để nhiều điện thoại tầm trung chậm/treo khi giữ cùng lúc
      // chuỗi JSON + Blob + bản gốc trong IndexedDB (có thể cộng dồn ~3x dung lượng ảnh). Đặt SAU
      // khi `blob` đã dựng xong (rẻ — JSON.stringify 200MB chỉ ~300ms đo được trên máy phát triển)
      // để dùng ĐÚNG kích thước thật, không phải ước lượng trước.
      //
      // KHÔNG giữ khoá `dongBoDangChayRef` xuyên suốt lúc chờ xác nhận: coi lượt bấm NÀY là đã
      // "xong" (như mọi nhánh chặn cứng khác ở trên) — khoá nhả ở `finally` như thường, và
      // `xacNhanXuatFileLon`/`huyXuatFileLon` là hai hành động MỚI do người dùng tự bấm, tự xin lại
      // khoá khi cần. An toàn vì phần chờ xác nhận không đọc/ghi gì thêm — `blob` đã dựng xong và
      // không phụ thuộc dữ liệu có đổi hay không trong lúc chờ, khác hẳn `pendingImport` (phải giữ
      // đúng snapshot đọc lúc mở panel để "Hoàn tác" không lệch nguồn).
      if (blob.size > NGUONG_CANH_BAO_XUAT_BYTE) {
        setPendingLargeExport({ blob, tenFile, câuThanhCong, danhDauDaSaoLuu: mucsDaSaoLuuDuTron })
        setStatus(
          `File ước tính ~${Math.round(blob.size / 1024 / 1024)}MB — file lớn có thể làm máy chậm hoặc treo khi tải/lưu, nhất là trên điện thoại cấu hình thấp. Bấm "Vẫn xuất" bên dưới nếu muốn tiếp tục, hoặc bỏ chọn bớt mục rồi thử lại.`,
        )
        return
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = tenFile
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      if (mucsDaSaoLuuDuTron) {
        markBackupDone()
        onBackupDone()
      }
      setStatus(câuThanhCong)
    } catch (loi) {
      // Lưới CẤP HÀM cho phần đuôi dựng file (`JSON.stringify` → `new Blob` → `URL.createObjectURL`
      // → thẻ `<a>` ngay trên). Trước bản vá này CẢ HAI tầng `try` của hàm chỉ có `finally`, không
      // `catch` nào (`catch (loi)` duy nhất bên trong là của vòng lặp `xuatSnapshotMuc` từng mục —
      // lưới cho MỘT mục, không phải cho cả hàm). Ném ở đuôi ⇒ hai `finally` vẫn chạy (spinner tắt,
      // khoá nhả) nhưng lời từ chối thoát ra khỏi handler `onClick` async mà React KHÔNG bắt, và
      // `status` ĐỨNG NGUYÊN ở câu tiến độ "Đang đọc nội dung N bài viết/sơ đồ…": người dùng thấy
      // nút ngừng quay, một dòng "đang chạy" không bao giờ kết thúc, và KHÔNG một chữ lỗi nào.
      // `JSON.stringify` ném `RangeError` khi chuỗi vượt trần V8 — chuyện thật trên máy có kho ảnh
      // base64 lớn — và `createObjectURL` cũng ném được. Đây đúng là chế độ hỏng mà CHÍNH hàm này đã
      // từ chối chấp nhận ở đường khác (xem `.catch()` quanh `import("../board/xuatNhapNoiDung")` và
      // chú thích của nó phía trên), chỉ là chưa áp cho phần đuôi.
      //
      // CHỖ ĐẶT là một phần của bản vá, không phải tuỳ tiện:
      //  • Bọc CẢ khối `try` chứ không riêng đuôi, và `markBackupDone()` nằm TRONG khối đó — nên một
      //    lượt ném ở đuôi NHẢY THẲNG xuống đây và KHÔNG bao giờ chạy `markBackupDone()`/
      //    `onBackupDone()`. Giữ nguyên điều khoản I1 của vòng sửa trước (`5fc9ced`): một lượt xuất
      //    KHÔNG thành công tuyệt đối không được tắt lời nhắc sao lưu 14 ngày.
      //  • Các nhánh chặn cứng ở trên (`duLieuChuaDocDuoc`, đọc `mucs` hỏng, không nạp được module
      //    nội dung) `return` sớm với câu `setStatus` RIÊNG của chúng — `return` không đi qua `catch`,
      //    nên câu dưới đây không ghi đè lời giải thích cụ thể hơn của chúng.
      //
      // Không in thông điệp lỗi kỹ thuật ra màn hình ("RangeError: Invalid string length" không nói
      // gì với người dùng); object lỗi đi vào `console.warn` cho người gỡ lỗi.
      console.warn("handleExport: không dựng được file xuất", loi)
      setStatus(
        "Chưa xuất được: máy không dựng nổi file cho lượt chọn này — thường vì phần dữ liệu đang chọn quá lớn để gom vào MỘT file (ảnh trong bài viết/sơ đồ chiếm chỗ nhiều nhất). Bỏ chọn bớt ô rồi xuất làm nhiều lần, mỗi lần một phần.",
      )
    } finally {
      setExporting(false)
    }
    } finally {
      // Nhả khoá — phủ TOÀN BỘ hàm kể cả hai nhánh return sớm ở trên (selectedCount===0 đứng NGOÀI
      // try này nên không cần, nhưng duLieuChuaDocDuoc thì có — cùng khối try bên trên).
      dongBoDangChayRef.current = false
      setDongBoDangChay(false)
    }
  }

  // I3: người dùng xác nhận vẫn muốn tải file lớn — `blob` đã dựng xong từ lượt `handleExport` gọi
  // trước đó, chỉ còn phần tải + hạch toán (đánh dấu đã sao lưu, câu trạng thái thành công) vốn bị
  // hoãn lại khi vượt `NGUONG_CANH_BAO_XUAT_BYTE`.
  function xacNhanXuatFileLon() {
    if (!pendingLargeExport) return
    const { blob, tenFile, câuThanhCong, danhDauDaSaoLuu } = pendingLargeExport
    setPendingLargeExport(null)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = tenFile
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    if (danhDauDaSaoLuu) {
      markBackupDone()
      onBackupDone()
    }
    setStatus(câuThanhCong)
  }

  // I3: người dùng chọn KHÔNG tải file lớn — không đụng gì tới dữ liệu trên máy (payload/blob đã
  // dựng chỉ nằm trong bộ nhớ tạm, chưa từng ghi đâu), chỉ dọn state chờ và nói rõ chưa xuất.
  function huyXuatFileLon() {
    setPendingLargeExport(null)
    setStatus("Đã huỷ — chưa xuất file. Dữ liệu trên máy không đổi.")
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  // Chỉ ĐỌC và PHÂN TÍCH file — chưa ghi gì vào máy. Kết quả (kèm số mục mới/số mục sẽ bị đè theo
  // từng nhóm) đứng chờ ở `pendingImport` cho tới khi người dùng xem qua rồi bấm "Xác nhận nhập".
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setStatus(null)
    setImporting(true)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        // Hỗ trợ cả file export chuẩn ({ data: {...} }) lẫn file JSON thô { antibiotics, diseases, ... }
        const data = parsed && typeof parsed === "object" && "data" in parsed ? (parsed as { data: unknown }).data : parsed
        const d = (data ?? {}) as Record<string, unknown>
        const antibiotics: Antibiotic[] = Array.isArray(d.antibiotics) ? (d.antibiotics as Antibiotic[]) : []
        const diseases: DiseaseEntry[] = Array.isArray(d.diseases) ? (d.diseases as DiseaseEntry[]) : []
        // Thuốc truyền: đọc theo `backupKey` của từng nhóm. File cũ (chỉ có 5 nhóm) đơn giản là
        // thiếu khoá của 4 nhóm mới — mỗi khoá thiếu thành mảng rỗng, không phải lỗi.
        const infusions = Object.fromEntries(
          INFUSION_CATEGORIES.map((c) => [c.id, Array.isArray(d[c.backupKey]) ? (d[c.backupKey] as InfusionDrug[]) : []]),
        ) as Record<InfusionCategory, InfusionDrug[]>
        const flashcards: FlashCard[] = Array.isArray(d.flashcards) ? (d.flashcards as FlashCard[]) : []
        const wardRecipes: WardRecipe[] = Array.isArray(d.wardRecipes) ? (d.wardRecipes as WardRecipe[]) : []
        // Task 3 (giai đoạn 7-9): metadata mucs. File cũ (xuất từ trước Task 3) đơn giản là thiếu
        // khoá này — mảng rỗng, không phải lỗi, cùng cách xử lý mọi khoá mới khác ở trên.
        const mucs: MucMeta[] = Array.isArray(d.mucs) ? (d.mucs as MucMeta[]) : []
        // Task 4: nội dung doc CRDT, tra theo id. File cũ (trước Task 4, hoặc xuất khi đã bỏ chọn ô
        // "Bài viết & Sơ đồ") thiếu hẳn khoá này — object rỗng, không phải lỗi. `Array.isArray` bị
        // loại tường minh: một mảng CŨNG là `typeof "object"` và sẽ lọt qua, cho ra một "từ điển"
        // đánh khoá bằng "0"/"1" mà không id mục nào khớp.
        const mucDocs: Record<string, NoiDungMucJson> =
          d.mucDocs && typeof d.mucDocs === "object" && !Array.isArray(d.mucDocs)
            ? (d.mucDocs as Record<string, NoiDungMucJson>)
            : {}

        const parsedData: ImportPayload = { antibiotics, diseases, infusions, flashcards, wardRecipes, mucs, mucDocs }
        const count =
          antibiotics.length +
          diseases.length +
          INFUSION_CATEGORIES.reduce((n, c) => n + infusions[c.id].length, 0) +
          flashcards.length +
          wardRecipes.length +
          mucs.length
        if (count === 0) {
          // Review Task 6/7 (Minor 7): file do CHÍNH APP NÀY xuất ra ở bản CŨ (trước giai đoạn 8) có
          // thể chỉ mang hai khoá `articles`/`ecgLessons` — cả hai đã bị bỏ đọc ở trên (tính năng đã
          // gỡ, xem ImportPayload) nên rơi thẳng vào `count === 0` giống hệt một file rác/hỏng. Với
          // người dùng cầm đúng file sao lưu cũ của họ, "Không tìm thấy dữ liệu hợp lệ" đọc như "file
          // hỏng" — sai sự thật và gây hoang mang thừa. Phân biệt bằng chính hai khoá đó còn sót lại
          // trong file hay không, dù chúng không được đưa vào `parsedData`.
          const coDuLieuHeCu =
            (Array.isArray(d.articles) && d.articles.length > 0) || (Array.isArray(d.ecgLessons) && d.ecgLessons.length > 0)
          setStatus(
            coDuLieuHeCu
              ? "File này xuất từ bản cũ của app — phần bài viết tự nhập và bài học ECG trong file không còn nhập lại được nữa (tính năng đã gỡ). File không có dữ liệu nào khác để nhập."
              : "Không tìm thấy dữ liệu hợp lệ trong file này.",
          )
          setImporting(false)
          return
        }
        const rows = categoryRows
          .map((row) => {
            const { added, updated } = diffImportCounts(row.current, row.incomingOf(parsedData))
            return { label: row.label, added, updated }
          })
          .filter((r) => r.added > 0 || r.updated > 0)
        setPendingImport({ data: parsedData, rows })
      } catch {
        setStatus("File không đọc được — cần đúng định dạng JSON đã xuất từ app này.")
      } finally {
        setImporting(false)
      }
    }
    reader.onerror = () => {
      setStatus("Không đọc được file này.")
      setImporting(false)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function handleCancelImport() {
    setPendingImport(null)
  }

  // Chụp lại nguyên trạng TRƯỚC khi gộp — đây là thứ "Hoàn tác" sẽ trả về, nên phải lấy đúng lúc
  // này (dữ liệu hiện có trên máy, chưa bị file mới đè lên).
  async function handleConfirmImport() {
    if (!pendingImport) return
    // Khoá LỐI VÀO bằng ref (vòng sửa 2/5 — findings-r2 Important 1): xem chú thích đầy đủ tại nơi
    // khai `dongBoDangChayRef` (đầu DataSyncScreen). Đặt `true` NGAY — trước cả khối chụp dữ liệu
    // bên dưới, tức trước bất kỳ `await` nào — và chỉ nhả trong `finally` bọc TOÀN BỘ phần thân còn
    // lại (kể cả nhánh return sớm khi file không mang nội dung doc, phía dưới xa).
    if (dongBoDangChayRef.current) return
    dongBoDangChayRef.current = true
    setDongBoDangChay(true)
    try {
    // ─── Chụp NGAY dữ liệu cần dùng rồi đóng panel xem trước, TRƯỚC await bên dưới (vòng sửa
    // review — findings Important 1) ─────────────────────────────────────────────────────────
    // Panel "Xem trước trước khi nhập" (và nút "Xác nhận nhập" bên trong nó, KHÔNG có `disabled`)
    // được gate thuần bằng `pendingImport`. Trước bản vá này, `duLieu`/`setPendingImport(null)`
    // đứng SAU lượt `await idbGetAllCoKetQua` bên dưới — mở ra một cửa sổ bấm-chồng CHƯA TỪNG CÓ:
    // trước Task 9c cả hàm chạy đồng bộ (không `await` nào chắn giữa if-return-sớm và
    // setPendingImport(null)) nên React flush xong là nút biến mất trước khi cú click thứ hai kịp
    // tới; nay có một `await` đọc IndexedDB đứng giữa, trong lúc đó nút vẫn hiện y nguyên — không
    // đổi hình, không status. Đúng lúc IndexedDB bị tab khác giữ (chính kịch bản cả tệp này lo)
    // người dùng gặp nút "chết" và bấm lại: `onImport` chạy HAI LẦN trên CÙNG một payload, và cả
    // hai lượt cùng vào `nhapSnapshotMuc` (xoá con rồi mới dựng lại — KHÔNG nguyên tử) mà không có
    // gì chặn hai lượt ghi đua nhau; nặng hơn, lượt B còn chụp `xuatSnapshotMuc` SAU khi lượt A đã
    // ghi nội dung mới, nên "Hoàn tác" sẽ "khôi phục" đúng bản vừa nhập — lưới an toàn hỏng im
    // lặng, đúng lớp lỗi Task 9c sinh ra để diệt.
    //
    // Dời `duLieu`/`rows` (chụp trước khi `pendingImport` biến mất) + `setPendingImport(null)` lên
    // ĐÂY: panel đóng NGAY khi bấm — cùng cảm giác bản đồng bộ trước Task 9c, không còn cửa sổ nào
    // để bấm chồng. KHÔNG dùng `setImporting(true)` sớm được: `finally` phía dưới chỉ bọc nửa sau
    // (nội dung doc) và có `return` sớm ở nhánh chunk tải hỏng.
    const duLieu = pendingImport.data
    const rows = pendingImport.rows
    setPendingImport(null)

    // ─── Đọc mucs TƯƠI trực tiếp từ IndexedDB (Task 9c) ──────────────────────────────────────
    // `customMucs` (tham số của DataSyncScreen, dựng từ `mucsCol` cấp App) là MỘT trong BA instance
    // `useIdbCollection<MucMeta>` độc lập cùng đọc store `mucs`: SearchScreen có instance riêng, App()
    // cấp trên có `mucsCol`, và LuoiMuc.tsx — nơi mục MỚI được TẠO — có instance thứ ba. Ba instance
    // không đồng bộ NGANG với nhau — cùng cơ chế lệch pha mà Task 9b đã vá cho đường XUẤT (xem chú
    // thích dài ở handleExport). Ở ĐÂY hậu quả nặng hơn hẳn đường xuất: snapshot này không chỉ đọc để
    // hiển thị — nó là thứ "Hoàn tác" dùng để GHI ĐÈ (`mucsCol.replaceAll` → `idbReplaceAll` XOÁ SẠCH
    // store rồi ghi lại). Chụp bản CŨ (thiếu mục vừa tạo qua instance khác) rồi cho phép Hoàn tác dùng
    // nó nghĩa là: tạo mục mới trong phiên → nhập file → bấm Hoàn tác → mục vừa tạo BIẾN MẤT khỏi
    // IndexedDB.
    //
    // Đọc BẮT BUỘC đứng TRƯỚC `onImport(duLieu)` bên dưới: đọc SAU sẽ dính luôn lượt ghi mà chính
    // `onImport` vừa tạo, biến "trạng thái TRƯỚC khi nhập" (thứ Hoàn tác phải trả về) thành "trạng
    // thái SAU khi nhập" — hỏng theo hướng ngược lại nhưng vẫn là hỏng.
    //
    // Dùng `idbGetAllCoKetQua`, KHÔNG dùng `idbGetAll`: `idbGetAll` (src/lib/idb.ts) là vỏ mỏng NUỐT
    // LỖI thành `[]`. Một snapshot RỖNG bị Hoàn tác dùng để `replaceAll` sẽ xoá SẠCH kho `mucs` — biến
    // một lượt đọc hỏng tạm thời thành mất trắng, đúng bẫy Task 9b đã vấp ở đường xuất.
    const ketQuaMucsTuoi = await idbGetAllCoKetQua<MucMeta>(IDB_STORES.mucs)

    onImport(duLieu)
    // Ba danh sách nội dung của LƯỢT NÀY bắt đầu lại từ con số không. Lượt nhập trước có thể đã để
    // lại giá trị, và trả nội dung của lượt TRƯỚC về khi hoàn tác lượt NÀY là làm hỏng dữ liệu.
    setUndoMucDocs({})
    setUndoMucMoi([])
    setUndoMucKhongChup([])
    const totalAdded = rows.reduce((n, r) => n + r.added, 0)
    const totalUpdated = rows.reduce((n, r) => n + r.updated, 0)

    // Lượt đọc tươi HỎNG: KHÔNG BAO GIỜ được dựng một snapshot mà Hoàn tác sẽ dùng để xoá dữ liệu
    // (yêu cầu bắt buộc, brief Task 9c bước 3). Lượt nhập vẫn đã CHẠY ở trên — đó là việc người dùng
    // chủ động muốn — chỉ riêng lưới an toàn "Hoàn tác" tắt (không gọi `setUndoSnapshot` với dữ liệu
    // cũ/rỗng), và phải nói thẳng lý do thay vì lặng lẽ chụp một bản không đáng tin. `canhBaoKhongHoanTac`
    // được NỐI vào mọi `setStatus` còn lại của hàm này bên dưới (kể cả các dòng trạng thái của phần
    // nội dung doc CRDT), để cảnh báo không bị một dòng trạng thái ra sau đè mất.
    let canhBaoKhongHoanTac = ""
    if (ketQuaMucsTuoi.ok) {
      const snapshot: SyncSnapshot = {
        antibiotics: customAntibiotics,
        diseases: customDiseases,
        infusions: customInfusions,
        flashcards: customFlashcards,
        wardRecipes: wardRecipeList,
        mucs: ketQuaMucsTuoi.items,
      }
      setUndoSnapshot(snapshot)
    } else {
      setUndoSnapshot(null)
      canhBaoKhongHoanTac = ` KHÔNG hoàn tác được lượt nhập này: không đọc lại được kho "Bài viết & Sơ đồ" ngay lúc nhập (${ketQuaMucsTuoi.loi}).`
    }
    setStatus(`Đã nhập: ${totalAdded} mục mới, ${totalUpdated} mục cập nhật.${canhBaoKhongHoanTac}`)

    // ─── Nội dung doc CRDT (Task 4) ───────────────────────────────────────────────────────────
    // Chạy SAU khi metadata đã ghi: nếu lượt này hỏng giữa chừng, mục vẫn hiện ra ở lưới (có tên,
    // có danh mục) chứ không biến mất khỏi app. `import()` động — cùng ranh giới D13 như handleExport.
    const idNoiDung = Object.keys(duLieu.mucDocs)
    if (idNoiDung.length === 0) return
    setImporting(true)
    try {
      // Minor 4 (review vòng sửa 1/5): trước bản vá này, đúng MỘT trong bốn `setStatus` của hàm
      // không nối `canhBaoKhongHoanTac` — dòng "Đang ghi nội dung…" này. Vòng ghi nội dung có thể
      // mất hàng chục giây (mở/đóng workspace từng mục); trong lúc đó cảnh báo "không hoàn tác
      // được" biến mất khỏi màn hình, và nếu vòng ghi ném ngoài dự kiến thì nó biến mất VĨNH VIỄN.
      setStatus(`Đã nhập metadata. Đang ghi nội dung ${idNoiDung.length} bài viết/sơ đồ…${canhBaoKhongHoanTac}`)
      // Cùng lý do `.catch(() => null)` như handleExport: chunk động tải hỏng thì phải thành một
      // câu tiếng Việt, không phải một promise bị từ chối im lặng ngoài onClick.
      const modNoiDung = await import("../board/xuatNhapNoiDung").catch((loi) => {
        console.warn("handleConfirmImport: không nạp được module nội dung doc", loi)
        return null
      })
      if (!modNoiDung) {
        setStatus(
          `Đã nhập: ${totalAdded} mục mới, ${totalUpdated} mục cập nhật — nhưng CHƯA ghi được nội dung bài viết/sơ đồ (lần đầu cần mạng để tải phần soạn thảo). Kết nối mạng rồi nhập lại chính file này.${canhBaoKhongHoanTac}`,
        )
        return
      }
      // `loai` chỉ quyết định phần SEED của `taoHoacMoDoc`, mà lượt nhập xoá sạch phần seed đó rồi
      // dựng lại từ snapshot — nên giá trị dự phòng ở cuối là an toàn, không phải phỏng đoán liều.
      const loaiCua = (id: string): LoaiMuc =>
        duLieu.mucs.find((m) => m.id === id)?.loai ?? customMucs.find((m) => m.id === id)?.loai ?? "bai-viet"
      const tenCua = (id: string) => duLieu.mucs.find((m) => m.id === id)?.ten ?? id

      // ─── Chụp nội dung CŨ trước khi đè (Task 4b) ──────────────────────────────────────────
      // PHẢI đứng TRƯỚC vòng ghi bên dưới, không phải sau: `nhapSnapshotMuc` xoá con của khối gốc
      // RỒI mới dựng lại (không nguyên tử — xem chú thích trong chính hàm đó), nên sau vòng ghi
      // thì nội dung cũ đã biến mất khỏi máy và không còn gì để chụp. Đây là thứ duy nhất cho phép
      // "Hoàn tác" lùi được cả NỘI DUNG chứ không chỉ danh sách.
      //
      // `mucTrenMay` PHẢI dựng từ `ketQuaMucsTuoi.items` (danh sách TƯƠI, đọc ở đầu hàm), KHÔNG
      // phải `customMucs` (vòng sửa review — findings Important 3): `snapshot.mucs` ở nhánh phía
      // trên đã dùng danh sách tươi từ Task 9c chính — nếu nửa NỘI DUNG này còn dùng `customMucs`
      // (bản sao có thể CŨ, cùng cơ chế lệch pha ba instance `useIdbCollection<MucMeta>` đã ghi ở
      // đầu hàm) thì HAI NỬA của cùng một lượt Hoàn tác LỆCH NGUỒN nhau: một mục X vừa tạo qua
      // instance khác (không có trong `customMucs`) rồi được xuất/nhập lại CHÍNH FILE ĐÓ sẽ bị xếp
      // NHẦM là "mục file vừa thêm mới" dù đã có thật trên máy — "Hoàn tác" sẽ `xoaNoiDungBang` XOÁ
      // nội dung của X, trong khi nửa metadata (đã đúng nguồn) lại khôi phục dòng của X — bài viết
      // còn tên trong danh sách nhưng mở ra RỖNG. Trước Task 9c, hai nửa cùng dùng `customMucs` nên
      // hỏng NHẤT QUÁN (X biến mất hẳn cả hai nửa); Task 9c làm chúng lệch — sửa cái lệch đó ở đây.
      //
      // Bọc trong `if (ketQuaMucsTuoi.ok)`: khi lượt đọc tươi HỎNG, không có danh sách nào đáng tin
      // để phân loại "đã có"/"mới" — bỏ qua toàn bộ bước chụp nội dung cũ này (không xếp ai là
      // "mới", không xoá nội dung của ai cả). An toàn vì "Hoàn tác" đằng nào cũng đã bị tắt ở nhánh
      // đó (`undoSnapshot` null phía trên) — chụp/phân loại ở đây chỉ phục vụ NỬA NỘI DUNG của Hoàn
      // tác, vô nghĩa nếu nửa metadata không có gì đáng tin để lùi về. Nhánh này còn giữ đúng bất
      // biến "đặt và xoá CÙNG LÚC" của `undoMucDocs`/`undoMucMoi`/`undoMucKhongChup` với
      // `undoSnapshot` (Minor 5, review vòng sửa 1/5) — trước bản vá, ba state đó vẫn được gán bằng
      // kết quả chụp thật (dù không đường nào dùng tới) ngay cả khi `undoSnapshot` đã null, giữ lại
      // nguyên bản CRDT của mọi bài vừa nhập trong bộ nhớ React tới lượt nhập kế tiếp một cách vô
      // ích; nay nhánh hỏng bỏ qua cả bước chụp lẫn ba lệnh gán, ba state đó vẫn đứng yên ở {}/[]/[]
      // đã reset lúc đầu hàm.
      if (ketQuaMucsTuoi.ok) {
        const mucTrenMay = new Map(ketQuaMucsTuoi.items.map((m) => [m.id, m]))
        const docCu: Record<string, NoiDungMucJson> = {}
        const mucMoi: { id: string; ten: string }[] = []
        const khongChup: string[] = []
        for (const id of idNoiDung) {
          const cu = mucTrenMay.get(id)
          // Mục file THÊM MỚI: KHÔNG gọi `xuatSnapshotMuc` cho nó. Hàm đó đi qua `taoHoacMoDoc`, nên
          // chụp một id CHƯA TỪNG CÓ trên máy sẽ TẠO RA doc rỗng của nó rồi chụp cái rỗng đó — vừa
          // tốn một lượt mở/đóng workspace vô nghĩa, vừa để lại đúng thứ rác mà "Hoàn tác" sau đó
          // phải đi dọn (một bản ghi doc mồ côi vẫn tham chiếu ảnh của nó, nên nó BẢO KÊ cho ảnh mồ
          // côi trước `donRacBlobBang`). Với mục mới, hoàn tác đúng nghĩa là XOÁ nội dung vừa ghi —
          // xem `handleUndo`.
          if (!cu) {
            mucMoi.push({ id, ten: tenCua(id) })
            continue
          }
          try {
            // `loai` lấy từ metadata CŨ trên máy: đây là lượt đọc doc ĐANG CÓ, không phải doc trong file.
            const noiDungCu = await modNoiDung.xuatSnapshotMuc(id, cu.loai)
            // Transformer của vendor NUỐT LỖI và trả `undefined` thay vì ném (D11) — `xuatSnapshotMuc`
            // chuyển tiếp nguyên trạng, nên phải kiểm giá trị trả về ở phía app.
            if (noiDungCu) docCu[id] = noiDungCu as unknown as NoiDungMucJson
            else {
              // Cùng một sự cố với nhánh `catch` ngay dưới (vendor nuốt lỗi, D11) — chỉ khác đường
              // vào. Phải để lại dấu vết chẩn đoán y hệt, không im lặng chỉ vì lần này không ném
              // (Minor 4, review vòng 1).
              console.warn(`handleConfirmImport: xuatSnapshotMuc trả về rỗng cho mục ${id} — không chụp được nội dung cũ.`)
              khongChup.push(cu.ten)
            }
          } catch (loi) {
            // Best-effort TỪNG MỤC: một mục đọc hỏng chỉ mất khả năng hoàn tác CỦA RIÊNG NÓ. Lượt
            // nhập chính vẫn phải chạy tiếp và vẫn ghi nội dung mới cho mọi mục còn lại — chặn cả
            // lượt nhập ở đây là biến một sự cố đọc thành một lượt khôi phục dở dang.
            console.warn(`handleConfirmImport: không chụp được nội dung cũ của mục ${id}`, loi)
            khongChup.push(cu.ten)
          }
        }
        setUndoMucDocs(docCu)
        setUndoMucMoi(mucMoi)
        setUndoMucKhongChup(khongChup)
      }

      let xong = 0
      const hong: string[] = []
      // Mục ghi xong nhưng file không mang đủ ảnh (ảnh đã mất từ lượt XUẤT). Nội dung chữ về đủ,
      // ảnh thì không có gì để dựng lại — phải nói ra, không để người dùng phát hiện lúc mở bài.
      const thieuAnh: string[] = []
      for (const id of idNoiDung) {
        try {
          const ketQua = await modNoiDung.nhapSnapshotMuc(id, loaiCua(id), duLieu.mucDocs[id] as Parameters<typeof modNoiDung.nhapSnapshotMuc>[2])
          xong += 1
          if (ketQua.anhThieu.length > 0) thieuAnh.push(`${tenCua(id)} (${ketQua.anhThieu.length} ảnh)`)
        } catch (loi) {
          console.warn(`handleConfirmImport: không ghi được nội dung mục ${id}`, loi)
          hong.push(tenCua(id))
        }
      }
      setStatus(
        `Đã nhập: ${totalAdded} mục mới, ${totalUpdated} mục cập nhật; ghi xong nội dung ${xong}/${idNoiDung.length} bài viết/sơ đồ.` +
          // "Chưa ghi được" là NÓI SAI: lượt nhập xoá nội dung cũ TRƯỚC khi dựng lại (không nguyên
          // tử — xem chú thích trong nhapSnapshotMuc), nên một mục hỏng giữa chừng đã mất bản cũ.
          (hong.length > 0
            ? ` Ghi dở dang: ${hong.join(", ")} — nội dung cũ của các mục này trên máy ĐÃ bị thay dở và không còn bản cũ. Mở lại chính file này và nhập lần nữa để hoàn tất.`
            : "") +
          (thieuAnh.length > 0
            ? ` Thiếu ảnh: ${thieuAnh.join(", ")} — file sao lưu không mang byte của những ảnh đó, phần chữ vẫn về đủ.`
            : "") +
          canhBaoKhongHoanTac,
      )
    } catch (loi) {
      // I1 (review toàn nhánh 2026-09-09): lưới CẤP KHỐI cho toàn bộ phần nội dung doc CRDT — trước
      // bản vá này, khối `try` phía trên chỉ có `finally`, không `catch`. Từng lệnh gọi vendor
      // (`xuatSnapshotMuc`/`nhapSnapshotMuc`) đã có try/catch riêng TỪNG MỤC bọc quanh nó rồi (xem
      // hai vòng lặp phía trên) — lưới này KHÔNG bắt các lỗi đó (chúng chưa từng lọt tới đây). Nó
      // tồn tại cho phần mã KHÔNG lặp theo mục, đứng GIỮA hai vòng lặp hoặc trước/sau chúng — ví dụ
      // bước dựng `mucTrenMay` (`new Map(ketQuaMucsTuoi.items.map(...))`) ngay phía trên: ca đỏ viết
      // TRƯỚC bản vá này ép đúng điểm đó ném (mô phỏng dependency cấp thấp vi phạm hợp đồng, xem
      // src/__tests__/nhap-file-catch-cap-ham.spec.tsx) và xác nhận `Unhandled Rejection` trỏ thẳng
      // dòng này khi chưa có `catch`.
      //
      // TẠI ĐIỂM NÀY, metadata (bảng `mucs`/kháng sinh/…) ĐÃ ghi xong — `onImport(duLieu)` đứng ở
      // tầng try NGOÀI, chạy TRƯỚC khi vào đây. Câu bên dưới vì vậy phải nói rõ metadata đã vào,
      // riêng nội dung bài viết/sơ đồ thì CHƯA — cùng giọng với nhánh `!modNoiDung` phía trên (chunk
      // tải hỏng), không phải một câu lỗi kỹ thuật chung chung.
      console.warn("handleConfirmImport: lỗi không lường trước khi ghi nội dung bài viết/sơ đồ", loi)
      setStatus(
        `Đã nhập: ${totalAdded} mục mới, ${totalUpdated} mục cập nhật — nhưng CHƯA ghi được nội dung bài viết/sơ đồ (lỗi không lường trước). Mở lại chính file này và nhập lại để hoàn tất.${canhBaoKhongHoanTac}`,
      )
    } finally {
      setImporting(false)
    }
    } catch (loi) {
      // I1 (review toàn nhánh 2026-09-09): lưới CẤP HÀM cho tầng try NGOÀI — trước bản vá này, khối
      // `try` bọc TOÀN BỘ thân hàm chỉ có `finally`, không `catch`. Phần bên trong khối try trong
      // (nội dung doc CRDT) đã có catch riêng ở trên; lưới NÀY chỉ còn phải lo phần METADATA phía
      // trước nó — đọc `mucs` tươi (`idbGetAllCoKetQua`) và `onImport(duLieu)` — nơi KHÔNG có mã nào
      // đã đọc/ghi doc CRDT nào, nên KHÔNG có `totalAdded`/`totalUpdated`/`canhBaoKhongHoanTac` nào
      // đáng tin để nhắc tới ở đây (chúng khai bằng `const` bên TRONG khối try này — `catch` không
      // nhìn thấy được, và nếu ném xảy ra sớm như ca đỏ dưới đây thì chúng cũng chưa từng tồn tại).
      // Ca đỏ viết TRƯỚC bản vá này ép `idbGetAllCoKetQua` ném thay vì trả `{ok:false}` (mô phỏng
      // dependency cấp thấp vi phạm hợp đồng, xem nhap-file-catch-cap-ham.spec.tsx) — trước bản vá,
      // panel xem trước đã đóng (`setPendingImport(null)` chạy trước điểm ném) nhưng KHÔNG một chữ
      // nào xuất hiện: lời từ chối thoát khỏi handler `onClick` async mà React không bắt.
      console.warn("handleConfirmImport: lỗi không lường trước khi nhập file", loi)
      setStatus(
        "Chưa nhập được: có lỗi không lường trước khi đọc dữ liệu hiện có trên máy. Thử lại; nếu vẫn vậy, đóng các tab khác đang mở app rồi tải lại trang.",
      )
    } finally {
      // Nhả khoá — phủ TOÀN BỘ hàm, kể cả nhánh `return` sớm ở trên (file không mang nội dung doc:
      // `idNoiDung.length === 0`) và nhánh chunk `xuatNhapNoiDung` tải hỏng (cũng `return` sớm,
      // TRƯỚC khi chạm tới `finally` phía trong bọc riêng phần ghi nội dung) — cả hai đều nằm TRONG
      // khối `try` ngoài này nên đều kích hoạt đúng `finally` này.
      dongBoDangChayRef.current = false
      setDongBoDangChay(false)
    }
  }

  // "Hoàn tác" một lượt nhập gồm HAI nửa: các BẢNG metadata (`undoSnapshot`, đồng bộ) và NỘI DUNG
  // doc CRDT (`undoMucDocs`/`undoMucMoi`, bất đồng bộ vì phải mở lại workspace BlockSuite cho từng
  // mục). Hàm `async` là vì nửa sau — trước Task 4b nó đồng bộ và chỉ lùi được nửa đầu.
  async function handleUndo() {
    // Dùng lại cờ `importing` để chặn bấm chồng: lượt khôi phục dưới đây mở/đóng workspace cho
    // từng mục, hai lượt chạy song song là hai lượt ghi đua nhau trên cùng một doc.
    if (!undoSnapshot || importing) return
    const banCu = undoSnapshot
    const docCu = undoMucDocs
    const mucMoi = undoMucMoi
    const khongChup = undoMucKhongChup
    onRestoreSnapshot(banCu)
    // Xoá CẢ BỐN cùng lúc: một lượt hoàn tác chỉ dùng được đúng một lần, và để sót nửa nội dung
    // lại sẽ trả nội dung của lượt nhập cũ về ở lần bấm sau. Nội dung cũ trong `docCu` mất theo —
    // chấp nhận được vì chunk `xuatNhapNoiDung` chắc chắn đã nằm trong cache của trình duyệt (lượt
    // nhập vừa rồi đã nạp nó để ghi), nên lượt khôi phục bên dưới không có đường "hỏng vì mất mạng".
    setUndoSnapshot(null)
    setUndoMucDocs({})
    setUndoMucMoi([])
    setUndoMucKhongChup([])

    const idTra = Object.keys(docCu)
    if (idTra.length === 0 && mucMoi.length === 0 && khongChup.length === 0) {
      // Lượt nhập không đụng nội dung doc nào (file chỉ có metadata, hoặc chunk nội dung tải hỏng
      // nên chưa ghi gì) — câu cũ vẫn đúng nguyên văn, không được hạ giọng vô cớ.
      setStatus("Đã hoàn tác — dữ liệu trở lại như trước khi nhập file.")
      return
    }

    setImporting(true)
    try {
      const soPhaiLam = idTra.length + mucMoi.length
      if (soPhaiLam > 0) setStatus(`Đã hoàn tác danh sách. Đang trả lại nội dung ${soPhaiLam} bài viết/sơ đồ…`)
      const mucTruocNhap = new Map(banCu.mucs.map((m) => [m.id, m]))
      // Không trả lại được nội dung cũ: mục chụp hỏng từ lượt NHẬP, cộng mục ghi hỏng ở lượt NÀY.
      const hongTra = [...khongChup]
      const hongGo: string[] = []
      // Mục trả về CHỮ nhưng THIẾU ẢNH — vendor cắt bỏ khối ảnh thiếu byte khi ghi thay vì ném
      // (D11, xem chú thích trong `nhapSnapshotMuc`), nên đây là chỗ DUY NHẤT biết "đã trở lại" có
      // thật sự trọn vẹn hay không. Bỏ qua chỗ này là báo "đã trở lại" trong khi ảnh đã âm thầm mất
      // — đúng loại xanh-giả mà task này tồn tại để chống (Important 1, review vòng 1).
      const thieuAnhTra: string[] = []
      let traDuoc = 0
      // `donRacBlobBang` trả `null` khi BỎ lượt dọn (đã console.warn bên trong), không phải lỗi
      // ném — không hứng giá trị này là để bước "dọn ảnh mồ côi" của mục BỔ SUNG có thể ĐÃ KHÔNG
      // CHẠY mà không ai biết (Minor 2, review vòng 1).
      let donRacBoQua = false

      // ─── Nửa 1: trả nội dung cũ về cho mục ĐÃ CÓ trước lượt nhập ────────────────────────────
      if (idTra.length > 0) {
        // `import()` ĐỘNG — cùng ranh giới D13 như handleExport/handleConfirmImport. Vẫn `.catch`
        // chứ không để lời gọi tự ném: một promise bị từ chối ở đây thoát ra khỏi handler onClick
        // mà không ai bắt, người dùng chỉ thấy nút ngừng quay và không lời giải thích nào.
        const modNoiDung = await import("../board/xuatNhapNoiDung").catch((loi) => {
          console.warn("handleUndo: không nạp được module nội dung doc", loi)
          return null
        })
        if (modNoiDung) {
          for (const id of idTra) {
            try {
              const kq = await modNoiDung.nhapSnapshotMuc(
                id,
                mucTruocNhap.get(id)?.loai ?? "bai-viet",
                docCu[id] as Parameters<typeof modNoiDung.nhapSnapshotMuc>[2],
              )
              traDuoc += 1
              if (kq.anhThieu.length > 0) {
                thieuAnhTra.push(`${mucTruocNhap.get(id)?.ten ?? id} (${kq.anhThieu.length} ảnh)`)
              }
            } catch (loi) {
              console.warn(`handleUndo: không trả lại được nội dung cũ của mục ${id}`, loi)
              hongTra.push(mucTruocNhap.get(id)?.ten ?? id)
            }
          }
        } else {
          // KHÔNG dừng cả hàm ở đây: nửa 2 bên dưới đi qua module KHÁC (`xoaNoiDungBang`, IndexedDB
          // thuần, không phụ thuộc chunk này) và vẫn phải chạy — bỏ nó là để lại đúng đống doc +
          // ảnh mồ côi mà Task 4b tồn tại để dọn. Gọi tên mọi mục không trả về được rồi đi tiếp.
          hongTra.push(...idTra.map((id) => mucTruocNhap.get(id)?.ten ?? id))
        }
      }

      // ─── Nửa 2: gỡ nội dung của mục file vừa THÊM MỚI ───────────────────────────────────────
      // `onRestoreSnapshot` đã xoá dòng metadata của chúng (`mucsCol.replaceAll(snapshot.mucs)`),
      // nhưng bản ghi doc + ảnh vừa ghi thì ở lại vĩnh viễn nếu không dọn ở đây: `donRacBlobBang`
      // giữ mọi blob còn được nhắc trong BẤT KỲ bản ghi doc nào, nên chính bản ghi doc mồ côi đó
      // bảo kê cho ảnh mồ côi, và không đường nào khác trong app thu hồi được.
      //
      // Khẳng định "đã xoá dòng metadata của CHÚNG" chỉ đúng khi `mucMoi` (dựng trong
      // `handleConfirmImport`) và `snapshot.mucs` (cũng dựng ở đó) cùng đọc từ MỘT danh sách tươi —
      // vòng sửa review đã sửa đúng chỗ lệch này (Important 3): trước đó `mucMoi` dựng từ
      // `customMucs` (bản sao có thể CŨ) trong khi `snapshot.mucs` đã dùng danh sách tươi (Task 9c
      // chính), nên một mục đã có THẬT trên máy nhưng lệch pha `customMucs` có thể bị xếp NHẦM vào
      // đây — `xoaNoiDungBang` xoá nội dung của một mục mà `onRestoreSnapshot` KHÔNG hề gỡ dòng
      // metadata (nó vẫn có mặt trong danh sách tươi), để lại một bài viết còn tên nhưng mở ra RỖNG.
      let xoaMoiHong = false
      if (mucMoi.length > 0) {
        // `xoaNoiDungBang` cố gắng hết sức và KHÔNG ném — trả `false` khi hỏng. Module này nhập
        // TĨNH ở đầu file (xem comment cạnh import), nên không có nhánh "không nạp được module"
        // để xử ở đây nữa — khác nửa 1 phía trên vẫn qua `import()` động của xuatNhapNoiDung.
        const daXoa = await xoaNoiDungBang(mucMoi.map((m) => m.id))
        if (!daXoa) {
          hongGo.push(...mucMoi.map((m) => m.ten))
          xoaMoiHong = true
        }
      }

      // ─── Dọn rác blob mồ côi ─────────────────────────────────────────────────────────────────
      // Chạy khi lượt hoàn tác có ĐỘNG tới nội dung doc theo BẤT KỲ cách nào, không chỉ khi có mục
      // MỚI (Minor 3, review vòng 1): nửa 1 (khôi phục) cũng để lại ảnh mồ côi — ảnh mà file vừa
      // nhập ghi vào một mục ĐÃ CÓ trở thành mồ côi ngay khi nội dung cũ trả về ở trên, và không
      // đường nào khác trong app thu hồi được cho tới lượt xoá bảng vĩnh viễn kế tiếp. Vẫn giữ
      // đúng thứ tự an toàn đã được review khen: dọn CHỈ SAU khi cả hai nửa ở trên đã xong, và bỏ
      // qua khi phần "mục mới" bị hỏng — bản ghi doc mồ côi lúc đó vẫn còn, tự nó bảo kê ảnh của
      // nó nên lượt dọn không thấy gì mồ côi ở phần đó (chạy cũng vô ích, không sai).
      if (idTra.length > 0 || (mucMoi.length > 0 && !xoaMoiHong)) {
        const ketQuaDon = await donRacBlobBang()
        if (ketQuaDon === null) donRacBoQua = true
      }

      const goDuoc = mucMoi.length - hongGo.length
      // Câu chữ phải nói ĐÚNG SỰ THẬT của lượt này, không hứa quá: mục nào chưa trả về được thì
      // GỌI TÊN, đúng khuôn `hong.join(", ")` mà `handleConfirmImport` đang dùng. Câu "mà file vừa
      // thêm mới" dưới đây chỉ ĐÚNG SỰ THẬT nhờ `mucMoi` (handleConfirmImport, vòng sửa review —
      // Important 3) nay dựng từ CÙNG danh sách tươi với `snapshot.mucs` — xem chú thích ở "Nửa 2"
      // phía trên để biết vì sao lệch nguồn giữa hai nửa từng làm câu này gọi nhầm một mục đã có
      // thật trên máy là "mới".
      setStatus(
        "Đã hoàn tác — danh sách mục trở lại như trước khi nhập file." +
          (traDuoc > 0 ? ` Nội dung cũ của ${traDuoc} bài viết/sơ đồ đã trở lại.` : "") +
          (goDuoc > 0 ? ` Đã gỡ nội dung của ${goDuoc} mục mà file vừa thêm mới.` : "") +
          (thieuAnhTra.length > 0
            ? ` Thiếu ảnh trong: ${thieuAnhTra.join(", ")} — ảnh đó đã mất khỏi máy nên không khôi phục lại được, phần chữ vẫn về đủ.`
            : "") +
          (hongTra.length > 0
            ? ` Chưa trả lại được nội dung cũ của: ${hongTra.join(", ")} — nội dung các mục này vẫn là bản vừa nhập từ file.`
            : "") +
          (hongGo.length > 0
            ? ` Chưa gỡ được nội dung vừa ghi của: ${hongGo.join(", ")} — mục đã biến khỏi danh sách nhưng nội dung còn nằm lại trên máy.`
            : "") +
          (donRacBoQua
            ? ` Lượt dọn ảnh thừa không chạy được lần này — không mất nội dung, chỉ còn sót vài blob không dùng; lượt xoá/dọn khác sau sẽ tự thử lại.`
            : ""),
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="h-full flex flex-col screen-transition">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.line }}>
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium" style={{ color: "var(--c-primary-deep)" }}>
          {icons.back()}
          Quay lại
        </button>
        <span className="text-sm font-semibold text-slate-900">Đồng bộ dữ liệu</span>
        <span className="w-10" />
      </div>

      <div className="scroll-ios flex-1 px-6 pt-6 pb-8 space-y-5">
        <div className="p-4 rounded-2xl border" style={{ borderColor: C.primaryLine, background: C.primarySoft }}>
          <p className="text-sm text-slate-700 leading-relaxed">
            Mục bạn tự nhập (bài viết/sơ đồ kèm ảnh chèn trong, kháng sinh, các thuốc truyền trong "Dùng thuốc", công thức pha riêng đã lưu cho từng thuốc, thẻ ghi nhớ) được lưu ngay trên máy này, không qua máy chủ nào. Dùng "Xuất file" để sao lưu hoặc chuyển sang thiết bị khác, rồi "Nhập file" trên thiết bị kia để khôi phục.
          </p>
        </div>

        {pendingImport ? (
          // ─── Xem trước file trước khi ghi gì vào máy ───────────────────────────
          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Xem trước trước khi nhập</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {pendingImport.rows.length === 0
                  ? "File này chỉ có sơ đồ tư duy (gộp theo node/cạnh) hoặc không có gì mới."
                  : "Mục \"cập nhật\" nghĩa là trên máy ĐÃ CÓ id này — nội dung hiện tại sẽ bị THAY bằng nội dung trong file."}
              </p>
              {/* Nội dung doc CRDT không có thùng rác nào khác: lưới an toàn duy nhất là bản chụp
                  mà `handleConfirmImport` giữ TRONG BỘ NHỚ của màn này (Task 4b, xem `undoMucDocs`),
                  và nó mất khi rời màn hình. Câu này phải đứng ở đây — TRƯỚC khi bấm — chứ không
                  chỉ ở câu báo sau khi nhập xong. */}
              {Object.keys(pendingImport.data.mucDocs).length > 0 && (
                <p className="text-xs mt-1.5 leading-relaxed font-semibold" style={{ color: C.dangerIcon }}>
                  File có nội dung của {Object.keys(pendingImport.data.mucDocs).length} bài viết/sơ đồ. Nội dung đang có trên máy của đúng những mục đó sẽ bị THAY HẲN. Chỉ nút "Hoàn tác" ngay trên màn này lùi lại được — rời màn hình là nội dung cũ mất hẳn.
                </p>
              )}
            </div>
            {pendingImport.rows.length > 0 && (
              <div className="rounded-2xl border divide-y" style={{ borderColor: C.line }}>
                {pendingImport.rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-sm text-slate-700">{r.label}</span>
                    <span className="text-xs font-semibold flex items-center gap-2">
                      {r.added > 0 && <span style={{ color: "var(--c-green)" }}>+{r.added} mới</span>}
                      {r.updated > 0 && <span style={{ color: "var(--c-primary-deep)" }}>{r.updated} cập nhật</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={handleCancelImport}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm border"
                style={{ borderColor: C.line, color: C.muted, background: C.surface }}
              >
                Huỷ
              </button>
              <button
                onClick={handleConfirmImport}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm"
                style={{ background: C.primary, color: "var(--c-on-primary)" }}
              >
                Xác nhận nhập
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hiện có trên máy này</p>
                <button
                  onClick={() => selectAllExport(selectedCount < categoryRows.length)}
                  className="text-xs font-semibold"
                  style={{ color: "var(--c-primary-deep)" }}
                >
                  {selectedCount < categoryRows.length ? "Chọn tất cả" : "Bỏ chọn tất cả"}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mb-2">Chạm một ô để bỏ/chọn xuất mục đó — đang chọn {selectedCount}/{categoryRows.length}.</p>
              <div className="grid grid-cols-2 gap-2.5">
                {categoryRows.map((row) => {
                  const selected = exportSelection[row.key] !== false
                  const latest = latestTimestamp(row.current)
                  return (
                    <button
                      key={row.key}
                      onClick={() => toggleExportKey(row.key)}
                      className="p-3 rounded-xl border text-left relative"
                      style={{ borderColor: selected ? C.primaryLine : C.line, background: selected ? C.primarySoft : C.surface }}
                    >
                      <span
                        className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: selected ? C.primary : C.lineSoft, color: "var(--c-on-primary)" }}
                      >
                        {selected && icons.check()}
                      </span>
                      <p className="text-lg font-bold text-slate-900">{row.current.length}</p>
                      <p className="text-xs text-slate-500 pr-4">{row.label}</p>
                      {latest != null && <p className="text-[10px] text-slate-400 mt-0.5">Mới nhất: {formatDateTime(latest)}</p>}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleExport}
              // `dongBoDangChay` thêm vào đây (vòng sửa 2/5): đóng đúng cửa sổ hở mà `exporting ||
              // importing` bỏ sót — khoảng giữa lúc handleConfirmImport đóng panel và lúc nó gọi
              // setImporting(true), khi cả hai cờ cũ đều false. Xem `dongBoDangChayRef`.
              // I3: `pendingLargeExport` thêm vào — chờ xác nhận "Vẫn xuất"/"Huỷ" cũng phải chặn hai
              // nút này, cùng lý do `dongBoDangChay`: tránh một lượt Xuất/Nhập KHÁC chồng lên trong
              // lúc màn hình đang hỏi về file lớn còn dang dở.
              disabled={exporting || importing || dongBoDangChay || !!pendingLargeExport}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-60"
              style={{ background: C.primary, color: "var(--c-on-primary)" }}
            >
              {icons.download()}
              {exporting ? "Đang xuất…" : "Xuất file sao lưu (.json)"}
            </button>

            <button
              onClick={handleImportClick}
              // Cùng lý do `dongBoDangChay` như nút Xuất ở trên — đây chính là nút mà findings-r2
              // Important 1 mô tả: mở lối vào ĐỘC LẬP thứ hai cho `handleConfirmImport` (chọn file
              // KHÁC) trong đúng cửa sổ hở đó.
              // I3: `pendingLargeExport` thêm vào — chờ xác nhận "Vẫn xuất"/"Huỷ" cũng phải chặn hai
              // nút này, cùng lý do `dongBoDangChay`: tránh một lượt Xuất/Nhập KHÁC chồng lên trong
              // lúc màn hình đang hỏi về file lớn còn dang dở.
              disabled={exporting || importing || dongBoDangChay || !!pendingLargeExport}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm border disabled:opacity-60"
              style={{ borderColor: C.primary, color: "var(--c-primary-strong)", background: C.surface }}
            >
              {icons.upload()}
              {importing ? "Đang đọc file…" : "Nhập file đã sao lưu"}
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChange} disabled={importing || dongBoDangChay || !!pendingLargeExport} className="hidden" />
          </>
        )}

        {status && (
          <div className="text-center space-y-2">
            <p className="text-xs leading-relaxed" style={{ color: "var(--c-primary-deep)" }}>{status}</p>
            {/* I3: file xuất đã dựng xong, chờ xác nhận vì vượt ngưỡng cảnh báo kích thước — câu
                trạng thái phía trên đã nói rõ số MB ước tính. */}
            {pendingLargeExport && (
              <div className="flex items-center justify-center gap-4">
                <button onClick={xacNhanXuatFileLon} className="text-xs font-bold" style={{ color: "var(--c-primary-deep)" }}>
                  Vẫn xuất file lớn
                </button>
                <button onClick={huyXuatFileLon} className="text-xs font-bold" style={{ color: "var(--c-text-muted)" }}>
                  Huỷ
                </button>
              </div>
            )}
            {/* `disabled` khi đang bận: lượt hoàn tác nay ghi cả NỘI DUNG doc (mở/đóng workspace
                cho từng mục), bấm chồng lên nhau là hai lượt ghi đua nhau trên cùng một doc. */}
            {undoSnapshot && (
              <button onClick={handleUndo} disabled={importing} className="inline-flex items-center gap-1.5 text-xs font-bold disabled:opacity-50" style={{ color: C.dangerIcon }}>
                {icons.undo()}
                Hoàn tác lần nhập vừa rồi
              </button>
            )}
          </div>
        )}

        {!pendingImport && (
          <p className="text-xs text-slate-400 leading-relaxed">
            Nhập file sẽ gộp theo id: mục đã có cùng id được cập nhật theo file mới, mục id chưa có sẽ được thêm vào — các mục id khác trên máy không bị đụng tới. Sơ đồ tư duy được gộp theo node/cạnh, không thay thế toàn bộ. "Hoàn tác" (còn đứng ở màn này) lùi được cả DANH SÁCH mục lẫn NỘI DUNG bài viết/sơ đồ mà file vừa đè lên — nhưng chỉ khi bạn còn ở màn này; rời màn hình là nội dung cũ mất hẳn.
          </p>
        )}
      </div>
    </div>
  )
}
