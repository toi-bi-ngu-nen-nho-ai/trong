import { useState, useRef, useEffect, useMemo } from "react"
import type { Screen } from "../App"
import type { LoaiMuc, IdDanhMuc, MucMeta } from "../board/mucMeta"
import type { FlashCard } from "../data/types"
import { SPECIALTIES } from "../data"
import { useIdbCollection } from "../lib/useIdbCollection"
import { IDB_STORES } from "../lib/idb"
import { C, normalizeSearch } from "../lib/ui"
import { icons } from "../components/icons"
import { specialtyIcon } from "../components/SpecialtyIcons"

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
      {tag}
    </span>
  )
}

// Hai tên chỉ CÙNG MỘT khoa: dữ liệu bài viết dựng sẵn viết "Hồi sức - Cấp cứu", còn SPECIALTIES
// (nguồn thật của lưới Mindmap và của huy hiệu chuyên khoa) gọi là "Cấp cứu". Không đổi tên trong
// dữ liệu bài viết — nhãn đó còn hiện ở chỗ khác — chỉ gom hai tên về một chip khi LỌC.
const BI_DANH_KHOA: Record<string, string> = { "Hồi sức - Cấp cứu": "Cấp cứu" }
const khoaChuan = (ten?: string) => (ten ? BI_DANH_KHOA[ten] ?? ten : undefined)

// Một kết quả tìm kiếm gộp từ nhiều nguồn khác nhau — trước đây SearchScreen chỉ tìm trong danh
// sách bài viết tĩnh, nên mọi nội dung TỰ THÊM hoàn toàn vô hình với ô tìm kiếm chính. Gộp vào đây
// thì tìm một lần là ra hết, không phải đoán. Giai đoạn 8 (Task 6/7) xoá hai trong ba nguồn ban đầu
// (bài viết dựng sẵn/tự nhập hệ cũ, bài học ECG) — kind "muc" (kho `mucs`, hệ thay thế) đã gộp cả
// hai vai trò đó từ giai đoạn 5-6, nên nay chỉ còn hai kind thật: "flashcard" và "muc".
interface SearchResult {
  // "board" (đọc store IDB_STORES.boards) đã gộp vào "muc" (đọc store IDB_STORES.mucs, kho bài
  // viết + sơ đồ hợp nhất từ giai đoạn 5-6). Giai đoạn 8 Task 6 gỡ tiếp hai kind của hệ bài
  // viết tự viết tay (article/customArticle) — kho `mucs` là hệ thay thế.
  kind: "flashcard" | "muc"
  id: string
  title: string
  subtitle: string
  specialty?: string
  tags: string[]
  // CHỈ kind "muc" set trường này — nội dung trích từ bài viết/sơ đồ (chữ trong khối/canvas hoặc
  // trang bài viết, xem ghepNoiDungTimKiem ở board/mucMeta.ts), dùng để KHỚP tìm kiếm nhưng KHÔNG
  // hiển thị trực tiếp (huy hiệu loại + tên mục đã đủ cho hiển thị).
  noiDung?: string
  /** CHỈ kind "muc" set trường này — quyết định điều hướng ở openResult() (mở sơ đồ hay bài viết). */
  loai?: LoaiMuc
  /** CHỈ kind "muc" set — cần để mở đúng instance BoardGallery/danh mục khi loai === 'bai-viet'. */
  danhMuc?: IdDanhMuc
}

// Export để test dựng riêng màn này (src/__tests__/SearchScreen.spec.ts) mà không phải dựng cả App —
// App() vẫn dùng y hệt như trước, không đổi hành vi.
export function SearchScreen({
  onNavigate,
  onMoMuc,
  onBack,
  customFlashcards,
}: {
  onNavigate: (s: Screen, id?: string) => void
  // Kết quả kind "muc" KHÔNG đi qua onNavigate — SearchScreen không tự biết instance BoardGallery
  // nào (Mindmap hay danhMuc) cần mở, đó là việc của App() (state moBangYeuCau/danhMucDangXem, xem
  // chú thích dài quanh khai báo moBangYeuCau và taoBaiVietMoi). Chữ ký giữ id/loai/danhMuc rời
  // (không gộp lại thành object) cho khớp cách onNavigate cũng chỉ nhận id rời.
  onMoMuc: (id: string, loai: LoaiMuc, danhMuc: IdDanhMuc) => void
  onBack: () => void
  customFlashcards: FlashCard[]
}) {
  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("Tất cả")
  // mucMeta.ts KHÔNG import BlockSuite (D13) — đọc ở đây chỉ chạm object store nhẹ của IndexedDB,
  // không kéo theo chunk 994 kB của bảng vẽ.
  // `loading` KHÔNG bỏ đi được: IndexedDB đọc bất đồng bộ nên `mucs` rỗng cho tới khi lượt đọc
  // lúc mount xong — trong cửa sổ đó, gõ đúng tên một mục đã lưu vẫn rơi vào màn "Không có kết
  // quả", một lời khẳng định về dữ liệu chưa đọc xong (review cuối nhánh, mục 9). LuoiMuc đã
  // xử đúng cùng cờ này (`if (loading) return null`).
  const { items: mucs, loading: dangNapMuc, loiDoc: loiDocMuc } = useIdbCollection<MucMeta>(IDB_STORES.mucs)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const allResults = useMemo<SearchResult[]>(() => {
    return [
      ...customFlashcards.map((c): SearchResult => ({ kind: "flashcard", id: c.id, title: c.front, subtitle: c.back, specialty: c.specialty, tags: [] })),
      // Mục xoá MỀM (daXoaLuc) đã biến khỏi lưới LuoiMuc/Mindmap — phải biến khỏi cả ô tìm kiếm
      // chính, nếu không bấm vào kết quả sẽ mở một mục người dùng tưởng đã xoá.
      ...mucs
        .filter((m) => !m.daXoaLuc)
        .map((m): SearchResult => ({
          kind: "muc",
          id: m.id,
          title: m.ten,
          // RỖNG, không phải "Sơ đồ"/"Bài viết": nhanKetQua() (bên dưới) đã in đúng chữ đó thành
          // huy hiệu ngay phía trên tiêu đề, nên đặt lại ở đây làm nó xuất hiện HAI LẦN trên cùng
          // một thẻ (review cuối nhánh, mục 8, ban đầu ghi cho kind "board"). Dòng phụ đề tự ẩn khi
          // rỗng (`{r.subtitle && …}` bên dưới) — thẻ mục gọn lại đúng bằng phần thật sự có thông tin.
          subtitle: "",
          // KHÔNG dự phòng `?? SPECIALTIES[0].id` như mucKhopTimKiem (mucMeta.ts): ở đó chuỗi
          // khớp bắt buộc phải là string nên phải có giá trị thay thế, còn ở đây `specialty` là
          // trường TÙY CHỌN dùng để HIỂN THỊ (chip tên khoa) và để lọc theo bộ lọc chuyên khoa. Mục
          // cũ thiếu `chuyenKhoa` ở runtime → .find() trả undefined → `?.name` cho undefined, an
          // toàn và trung thực (không gán bừa "Tim mạch" cho mục chưa từng chọn khoa); mục này rơi
          // vào đúng nhánh "không xác định khoa" — chỉ hiện khi bộ lọc đang ở "Tất cả".
          specialty: SPECIALTIES.find((s) => s.id === m.chuyenKhoa)?.name,
          tags: m.tags ?? [],
          noiDung: m.noiDungTimKiem,
          loai: m.loai,
          danhMuc: m.danhMuc,
        })),
    ]
  }, [customFlashcards, mucs])

  // Dải chip suy từ CHÍNH kết quả đang có, không phải từ danh sách bài viết tĩnh như trước. Bảng Mindmap gắn
  // một trong 5 khoa mà không bài viết dựng sẵn nào dùng (Tiêu hoá, Huyết học, Nhiễm, Sinh lý bệnh,
  // Dược lâm sàng) trước đây không có chip nào để lọc — chỉ hiện dưới "Tất cả" (nợ ghi ở HANDOFF
  // mục 32). Thứ tự: theo SPECIALTIES cho khớp đúng thứ tự dải chip bên màn Sơ đồ tư duy, rồi mới
  // tới tên lạ (nếu dữ liệu về sau có khoa ngoài danh sách).
  const boLocKhoa = useMemo(() => {
    const co = new Set(allResults.map((r) => khoaChuan(r.specialty)).filter(Boolean) as string[])
    const theoThuTu = SPECIALTIES.map((sp) => sp.name).filter((n) => co.has(n))
    const conLai = [...co].filter((n) => !theoThuTu.includes(n)).sort()
    return ["Tất cả", ...theoThuTu, ...conLai]
  }, [allResults])

  // Chip đang chọn có thể BIẾN MẤT khỏi dải khi dữ liệu đổi (xoá mềm bảng cuối cùng của một khoa).
  // Giữ nguyên `activeFilter` thì màn hình rơi vào lọc theo một khoa không còn chip nào sáng — nhìn
  // như "không có kết quả" không giải thích được. Rơi về "Tất cả" cho tới khi khoa đó có lại.
  const locHieuLuc = boLocKhoa.includes(activeFilter) ? activeFilter : "Tất cả"

  const filtered = useMemo(() => {
    if (query.length === 0) return []
    // normalizeSearch (bỏ dấu) chứ KHÔNG phải toLowerCase: ô tìm của lưới Sơ đồ tư duy đã bỏ dấu từ
    // trước, nên cùng một truy vấn "ho hap" ra kết quả ở màn này mà không ra ở màn kia — hai ô tìm
    // trong cùng một app cư xử khác nhau (nợ ghi ở HANDOFF mục 32). Gõ tiếng Việt không dấu là cách
    // gõ nhanh mặc định lúc trực, nên chuẩn chung là bỏ dấu.
    const q = normalizeSearch(query)
    return allResults.filter((r) => {
      // Mục chưa gắn khoa có r.specialty == null — locHieuLuc khác "Tất cả" thì
      // khoaChuan(r.specialty) !== locHieuLuc đã đúng (undefined luôn khác một chuỗi cụ thể) nên tự
      // động bị loại, không cần kiểm tra riêng.
      if (locHieuLuc !== "Tất cả" && khoaChuan(r.specialty) !== locHieuLuc) return false
      return (
        normalizeSearch(r.title).includes(q) ||
        (r.specialty ? normalizeSearch(r.specialty).includes(q) : false) ||
        r.tags.some((t) => normalizeSearch(t).includes(q)) ||
        // Chỉ kết quả loại "board" có trường này — bảng khớp cả theo CHỮ BÊN TRONG nó, không chỉ tên.
        (r.noiDung ? normalizeSearch(r.noiDung).includes(q) : false)
      )
    })
  }, [allResults, query, locHieuLuc])

  const RESULT_LABEL: Record<Exclude<SearchResult["kind"], "muc">, string> = {
    flashcard: "Thẻ ghi nhớ",
  }

  // Kind "muc" KHÔNG tra RESULT_LABEL: một giá trị "muc" mang theo cả hai khả năng (bài viết hoặc
  // sơ đồ) — khác kind "flashcard", chỉ ứng với một nhãn cố định — nên nhãn phải suy TẠI CHỖ
  // từ `loai`, không tra bảng tĩnh.
  function nhanKetQua(r: SearchResult): string {
    if (r.kind === "muc") return r.loai === "so-do" ? "Sơ đồ" : "Bài viết"
    return RESULT_LABEL[r.kind]
  }

  function openResult(r: SearchResult) {
    // r.loai/r.danhMuc chỉ vắng nếu bản ghi mucs thiếu chúng ở runtime (không nên xảy ra — cả hai
    // đều bắt buộc theo MucMeta — nhưng vẫn kiểm để không gọi onMoMuc với giá trị rỗng); rơi về
    // nhánh chuyên khoa bên dưới thay vì mở nhầm.
    if (r.kind === "muc" && r.loai && r.danhMuc) onMoMuc(r.id, r.loai, r.danhMuc)
    else onNavigate("specialty", SPECIALTIES.find((s) => s.name === r.specialty)?.id)
  }

  const trending = ["Tăng huyết áp", "Rung nhĩ", "Thuyên tắc phổi", "Xơ gan", "Tổn thương thận cấp"]

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="px-5 pt-2 pb-3">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-medium mb-2" style={{ color: "var(--c-primary-deep)" }}>
          {icons.back()}
          Quay lại
        </button>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Tìm kiếm</h1>
        {/* mind-search-pill: chỉ mượn class này để ăn theo vòng focus "ôm sát" dùng chung cho mọi ô
            tìm kiếm trong app (xem index.css) — ô này tự vẽ layout riêng (rounded-2xl, nền riêng),
            không dùng component SearchField vì có thêm hàng bộ lọc bên dưới mà SearchField không có. */}
        <div className="mind-search-pill flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: C.lineSoft }}>
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
          {boLocKhoa.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              data-testid={`chip-khoa-${f}`}
              className="flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: locHieuLuc === f ? C.primary : C.lineSoft,
                color: locHieuLuc === f ? C.surface : "var(--c-text-muted)",
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
                  style={{ borderColor: C.lineSoft }}
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
                style={{ borderColor: C.line, background: C.surface }}>
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
                style={{ borderColor: C.line, background: C.surface }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {r.specialty && (
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--c-primary-strong)" }}>{r.specialty}</span>
                  )}
                  {nhanKetQua(r) && (
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: C.accentSoft, color: "var(--c-primary-deep)" }}>
                      {nhanKetQua(r)}
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
        ) : dangNapMuc ? null : (
          // Chưa nạp xong danh sách mục thì KHÔNG kết luận "không có kết quả" — để trống một nhịp
          // rất ngắn (cùng cách LuoiMuc tránh nháy lưới "rỗng" giả), thay vì khẳng định sai rồi
          // tự lật lại ngay lượt render sau.
          <div className="text-center pt-16">
            <div className="mb-3 flex justify-center" style={{ color: C.muted }}>
              <span style={{ display: "inline-flex", transform: "scale(1.5)" }}>{icons.search(false)}</span>
            </div>
            <p className="font-semibold text-slate-700">Không có kết quả cho "{query}"</p>
            <p className="text-sm text-slate-400 mt-1">Thử từ khoá khác hoặc thêm kiến thức mới</p>
            {/* Đọc kho mucs hỏng thì "không có kết quả" chỉ đúng một phần: thẻ ghi nhớ (customFlashcards,
                đọc từ localStorage — độc lập với store `mucs`) vẫn được tìm bình thường; riêng bài
                viết đã lưu VÀ sơ đồ tư duy (cùng đọc từ store mucs — giai đoạn 8 đã xoá hai nguồn
                khác từng góp mặt ở đây, bài viết dựng sẵn/tự nhập hệ cũ và bài học ECG) thì KHÔNG
                nằm trong lượt tìm này. Nói ra, thay vì để người dùng kết luận nội dung của họ đã
                mất. Dòng phụ, không phải role="alert": dải báo THẬT của sự cố này (data-testid
                "dai-loi-doc-idb", role="alert", nút "Thử lại") đã lên cấp APP từ Task 7 — nó xếp
                CHỒNG lên chính màn Tìm kiếm này (absolute, z-40, render ở App() bất kể `screen`
                đang là gì), nên đã có một role="alert" thật ĐANG hiện song song mỗi khi đoạn văn
                bản này hiện. Gắn role="alert" thêm ở đây là trùng lặp, không phải thiếu. */}
            {loiDocMuc && (
              <p className="text-sm mt-3 mx-auto" style={{ color: "var(--c-warn, #92400e)", maxWidth: 320 }}>
                Lượt tìm này chưa bao gồm bài viết đã lưu và sơ đồ tư duy — chưa mở được kho lưu trữ
                trên máy. Mở tab "Thư viện" hoặc "Mindmap" để xem chi tiết và thử lại.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
