// Lớp lưu trữ cục bộ (localStorage) cho các mục người dùng tự nhập — bài viết, kháng sinh,
// thuốc co bóp cơ tim, thuốc vận mạch. Toàn bộ đọc/ghi diễn ra trên máy, không gọi mạng,
// nên hoạt động 100% offline kể cả khi cài như PWA.
//
// Vì sao localStorage (không dùng IndexedDB): dữ liệu ở đây là các danh sách JSON nhỏ
// (vài chục mục là nhiều), không cần transaction hay index — localStorage đơn giản, đồng bộ,
// và đủ dùng. Nếu sau này dữ liệu lớn hơn nhiều (hàng nghìn mục, kèm ảnh...), nên chuyển sang
// IndexedDB.

const NAMESPACE = "drtrong"

function storageKey(key: string): string {
  return `${NAMESPACE}:${key}`
}

// Đọc một danh sách đã lưu. Trả về [] nếu chưa có, dữ liệu hỏng, hoặc localStorage không khả dụng
// (ví dụ chế độ riêng tư/private browsing chặn ghi ở một số trình duyệt).
export function loadCollection<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(storageKey(key))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

// Ghi đè toàn bộ danh sách. Lỗi (ví dụ hết dung lượng lưu trữ) bị bỏ qua lặng lẽ để không
// làm gãy luồng dùng app — dữ liệu vẫn hiển thị đúng trong phiên hiện tại, chỉ là không được lưu.
export function saveCollection<T>(key: string, items: T[]): boolean {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(items))
    return true
  } catch {
    return false
  }
}

// Xoá hẳn một danh sách khỏi localStorage. Hiện chỉ dùng sau khi đã chuyển danh sách đó sang
// IndexedDB thành công (xem useIdbCollection) — để giải phóng dung lượng localStorage vốn eo hẹp.
export function removeCollection(key: string): void {
  try {
    localStorage.removeItem(storageKey(key))
  } catch {
    // Bỏ qua: không xoá được cũng không ảnh hưởng dữ liệu đã nằm trong IndexedDB.
  }
}

// Tên các danh mục tự nhập — dùng làm khoá lưu trữ và cho màn hình Đồng bộ dữ liệu.
export const CUSTOM_COLLECTION_KEYS = {
  antibiotics: "customAntibiotics",
  // Khoá của các nhóm THUỐC TRUYỀN (co bóp, vận mạch, giãn mạch, loạn nhịp, điện giải, an thần,
  // thần kinh, khác, giải độc) KHÔNG khai ở đây nữa: mỗi nhóm tự mang `storageKey` trong
  // data/categories.ts, cùng chỗ với nhãn tab và danh sách thuốc dựng sẵn của nó. Trước đây khoá
  // nằm một nơi còn phần còn lại của nhóm nằm nơi khác, nên thêm một nhóm là phải nhớ sửa đúng cả
  // hai — và quên một bên thì nhóm mới im lặng biến mất khỏi bản sao lưu.
  // Các chuỗi khoá cũ được giữ nguyên nguyên văn bên đó, dữ liệu đã lưu trên máy đọc lại bình thường.
  // Bệnh lý được tự động tạo khi sửa "Chỉ định riêng theo bệnh lý" của một kháng sinh và gõ tên
  // một bệnh lý chưa có trong danh mục gốc (xem EditAntibioticScreen trong App.tsx).
  diseases: "customDiseases",
  flashcards: "customFlashcards",
} as const
