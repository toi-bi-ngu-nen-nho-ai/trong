// ─── Công thức pha của BẠN ────────────────────────────────────────────────────
//
// App nhắc "chỗ bạn pha khác thì phải sửa ô này" ở khắp nơi, nhưng trước đây chỉ cho lưu MỘT công
// thức mỗi thuốc. Thực tế nhiều khoa pha cùng một thuốc khác nhau (khoa A truyền TTM, khoa B tiêm
// TMC) hoặc cùng một khoa nhưng có ca dùng liều khác — nên mỗi thuốc giờ lưu được NHIỀU công thức,
// mỗi công thức có một tiêu đề tự đặt để bấm nhanh đổi qua lại.
//
// Ở đây lưu công thức thực tế theo từng thuốc. Khi có công thức đã lưu, ô nồng độ và bảng pha khởi
// tạo từ nó, và nó cũng trở thành MỐC SO SÁNH của cảnh báo "đặc/loãng gấp mấy lần" — nếu vẫn so với
// công thức dựng sẵn thì người pha đặc gấp đôi cố định sẽ ăn cảnh báo cam mỗi lần mở máy tính.
// Vẫn giữ nút trả về công thức chuẩn của app.

const KEY = "drtrong:wardRecipes"

export interface WardRecipe {
  id: string
  // Tên tự đặt để phân biệt nhiều công thức của cùng một thuốc, vd "Khoa Hồi sức — TTM". Rỗng thì
  // giao diện tự đặt tên theo dung môi/đường dùng lúc hiển thị.
  title: string
  drugId: string
  concValue: number
  vialAmount: number
  vialUnit: string
  vials: number
  volumeMl: number
  // Quy cách ống/lọ — xem VialSpec trong lib/mixing.ts. Bản ghi cũ không có `vialForm` thì hiểu là
  // ống dung dịch, đúng như hành vi trước đây.
  vialForm?: "solution" | "powder" | "fixed"
  vialVolumeMl?: number
  reconstituteMl?: number
  displacementMl?: number
  diluent?: string
  // Đường dùng của RIÊNG công thức này — cùng một thuốc nhưng khoa A truyền TTM, khoa B tiêm TMC là
  // chuyện thường gặp (vd Cefoperazol). Bản ghi cũ không có `route` thì lúc hiển thị vẫn suy ra từ
  // `Antibiotic.route` tĩnh của thuốc như hành vi trước đây — xem AntibioticMixPanel.
  route?: "TTM" | "TMC"
  // Thời gian truyền dự kiến (phút) và bộ dây (giọt/mL) của RIÊNG công thức này — cần cả hai mới
  // tính được số giọt/phút. Không có thì "Cách dùng" tự tính theo CrCl (autoUsage) ẩn hẳn phần
  // giọt/phút thay vì bịa một thời gian truyền không có căn cứ — xem AntibioticDoseCard.
  infuseMinutes?: number
  dropFactor?: number
  savedAt: number
}

// Dạng lưu cũ (một công thức/thuốc, không có `id`/`title`) — đọc để không mất dữ liệu người dùng đã
// lưu trước khi có tính năng nhiều công thức.
type LegacyWardRecipe = Omit<WardRecipe, "id" | "title">

function isLegacy(v: unknown): v is LegacyWardRecipe {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v) && !("id" in (v as object))
}

export function loadWardRecipes(): Record<string, WardRecipe[]> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    const out: Record<string, WardRecipe[]> = {}
    for (const [drugId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        out[drugId] = value as WardRecipe[]
      } else if (isLegacy(value)) {
        // Bọc bản ghi đơn cũ thành mảng 1 phần tử — không mất công thức đã lưu trước đây.
        out[drugId] = [{ ...(value as LegacyWardRecipe), id: `${drugId}-legacy`, title: "Công thức đã lưu" }]
      }
    }
    return out
  } catch {
    return {}
  }
}

function persist(all: Record<string, WardRecipe[]>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // Không lưu được thì phiên hiện tại vẫn dùng bình thường — như mọi chỗ lưu khác trong app.
  }
}

// Thêm mới theo `id`, hoặc ghi đè nếu `id` đã tồn tại trong danh sách của đúng thuốc đó.
export function saveWardRecipe(recipe: WardRecipe): Record<string, WardRecipe[]> {
  const all = loadWardRecipes()
  const list = all[recipe.drugId] ?? []
  const idx = list.findIndex((r) => r.id === recipe.id)
  all[recipe.drugId] = idx >= 0 ? list.map((r, i) => (i === idx ? recipe : r)) : [...list, recipe]
  persist(all)
  return all
}

export function removeWardRecipe(drugId: string, recipeId: string): Record<string, WardRecipe[]> {
  const all = loadWardRecipes()
  const list = all[drugId]
  if (!list) return all
  const filtered = list.filter((r) => r.id !== recipeId)
  if (filtered.length > 0) all[drugId] = filtered
  else delete all[drugId]
  persist(all)
  return all
}

// Xoá TOÀN BỘ công thức pha đã lưu của một thuốc — gọi khi thuốc tự nhập đó bị xoá hẳn, để không để
// lại công thức mồ côi (không thuốc nào tham chiếu tới, nhưng vẫn nằm trong máy và trong mọi lần
// xuất file sao lưu sau này).
export function clearWardRecipesForDrug(drugId: string): Record<string, WardRecipe[]> {
  const all = loadWardRecipes()
  if (!(drugId in all)) return all
  delete all[drugId]
  persist(all)
  return all
}

export function formatSavedAt(at: number): string {
  const d = new Date(at)
  const two = (n: number) => String(n).padStart(2, "0")
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`
}

// Gộp công thức pha từ file sao lưu vào máy này — trùng `id` thì ghi đè bản trên máy, không trùng
// thì thêm mới, công thức hiện có không mất (giống cách "Đồng bộ dữ liệu" gộp mọi bảng khác).
export function importWardRecipes(recipes: WardRecipe[]): number {
  if (recipes.length === 0) return 0
  const all = loadWardRecipes()
  for (const recipe of recipes) {
    if (!recipe || typeof recipe.drugId !== "string" || typeof recipe.id !== "string") continue
    const list = all[recipe.drugId] ?? []
    const idx = list.findIndex((r) => r.id === recipe.id)
    all[recipe.drugId] = idx >= 0 ? list.map((r, i) => (i === idx ? recipe : r)) : [...list, recipe]
  }
  persist(all)
  return recipes.length
}
