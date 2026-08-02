import { useCallback, useState } from "react"
import { loadCollection, saveCollection } from "./storage"

// Hook quản lý một danh sách "tự nhập" (bài viết / kháng sinh / inotrope / vasoactive) luôn
// đồng bộ với localStorage. State trong React là nguồn hiển thị; mỗi lần add/remove/replaceAll
// đều ghi ngay xuống localStorage nên dữ liệu còn nguyên sau khi tắt/mở lại app (PWA offline).
export function useLocalCollection<T extends { id: string }>(key: string) {
  const [items, setItems] = useState<T[]>(() => loadCollection<T>(key))

  // Thêm mới. Loại bỏ trước mọi bản ghi trùng id thay vì cứ chèn thẳng lên đầu: id được sinh theo
  // `Date.now()` nên hai lần lưu trong cùng một mili-giây (chạm hai lần vào nút Lưu, hoặc nhập một
  // file rồi thêm tay) tạo ra hai bản ghi cùng id. Khi đó danh sách có hai mục không thể phân biệt,
  // sửa mục này thì mục kia đổi theo, và xoá một lần chỉ xoá được một nửa.
  const add = useCallback(
    (item: T) => {
      setItems((prev) => {
        const next = [item, ...prev.filter((i) => i.id !== item.id)]
        saveCollection(key, next)
        return next
      })
    },
    [key],
  )

  // Dùng khi SỬA một mục đã có (kể cả mục dựng sẵn được "ghi đè" lần đầu — lúc đó id chưa có
  // trong collection nên xử lý y như thêm mới, chèn lên đầu danh sách). Nếu id đã tồn tại, thay
  // thế đúng vị trí cũ thay vì thêm bản trùng — khác upsertMany (dùng cho nhập file, không quan
  // tâm thứ tự hiển thị).
  const update = useCallback(
    (item: T) => {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id)
        const next = idx === -1 ? [item, ...prev] : prev.map((i, ix) => (ix === idx ? item : i))
        saveCollection(key, next)
        return next
      })
    },
    [key],
  )

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id)
        saveCollection(key, next)
        return next
      })
    },
    [key],
  )

  // Dùng khi nhập file JSON (đồng bộ thủ công) — gộp theo id: mục cùng id sẽ bị đè bởi bản mới
  // nhập vào, mục id chưa có sẽ được thêm. Không xoá mục hiện có mà file nhập không đề cập tới.
  const upsertMany = useCallback(
    (incoming: T[]) => {
      setItems((prev) => {
        const byId = new Map(prev.map((i) => [i.id, i]))
        incoming.forEach((i) => byId.set(i.id, i))
        const next = Array.from(byId.values())
        saveCollection(key, next)
        return next
      })
    },
    [key],
  )

  const replaceAll = useCallback(
    (next: T[]) => {
      setItems(next)
      saveCollection(key, next)
    },
    [key],
  )

  return { items, add, update, remove, upsertMany, replaceAll }
}
