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

// Khoá localStorage của bài viết tự nhập hệ cũ — RÁC VĨNH VIỄN từ giai đoạn 8 (Task 6).
//
// Viết nguyên văn ở đây thay vì dựng qua `storageKey()`: đường sinh khoá là chuyện của những danh
// mục còn sống, còn đây là một chuỗi CHẾT cần xoá đúng như nó đã từng được ghi. Nếu `NAMESPACE` đổi
// một ngày nào đó, khoá cũ trên máy người dùng vẫn mang tiền tố cũ.
const KHOA_RAC_HE_CU = ["drtrong:customArticles"]

/**
 * Xoá những khoá localStorage không còn ai đọc, chạy MỘT LẦN lúc khởi động app (main.tsx).
 *
 * Vì sao cần một hàm riêng thay vì để `useIdbCollection` tự dọn như trước: bài viết tự nhập từng đi
 * qua `legacyLocalKey` — hook đó ghi dữ liệu cũ sang IndexedDB rồi mới `removeCollection`. Task 6
 * xoá `CUSTOM_COLLECTION_KEYS.articles` cùng ba màn hình đọc nó, nên không còn chỗ nào truyền
 * `legacyLocalKey` và đường tự dọn ấy chết theo. Máy nào chưa kịp chạy lượt di trú thì giữ khoá đó
 * mãi mãi, chiếm chỗ trong hạn mức ~5–10MB dùng chung của cả origin.
 *
 * Xoá theo DANH SÁCH TÊN CHÍNH XÁC, không quét theo tiền tố `drtrong:` — quét tiền tố sẽ nuốt cả
 * `customAntibiotics`/`customDiseases`/`customFlashcards` và mọi khoá nhóm thuốc truyền khai trong
 * data/categories.ts, tức mất dữ liệu người dùng tự soạn mà không có đường hoàn tác.
 */
export function donKhoaRacHeCu(): void {
  for (const khoa of KHOA_RAC_HE_CU) {
    try {
      localStorage.removeItem(khoa)
    } catch {
      // Trình duyệt chặn lưu trữ (chế độ riêng tư). Bỏ qua: hàm này chạy TRƯỚC lượt render đầu tiên
      // của React, một lần ném ở đây là màn hình trắng — đắt hơn nhiều so với một khoá rác còn lại.
    }
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
