import { useCallback, useEffect, useState } from "react"
import { idbDelete, idbGetAll, idbPut, idbPutMany } from "./idb"
import { loadCollection, removeCollection } from "./storage"

// Hook quản lý một danh sách tự nhập lưu trong IndexedDB (bài học ECG, bài viết) — cùng bộ hàm
// add/update/remove/upsertMany/replaceAll với useLocalCollection để App.tsx dùng như nhau.
//
// Khác useLocalCollection (localStorage, đọc đồng bộ ngay lúc khởi tạo state): IndexedDB đọc bất
// đồng bộ nên danh sách bắt đầu rỗng và được nạp lại sau khi mount xong — `loading` cho biết khi
// nào dữ liệu đã sẵn sàng, để màn hình không hiển thị nhầm "chưa có mục nào" trong lúc chờ.
//
// `legacyLocalKey`: nếu danh mục này TRƯỚC ĐÂY được lưu bằng localStorage (bài viết tự nhập, trước
// khi bài viết có thể chèn ảnh), truyền khoá cũ vào đây — lần chạy đầu sau khi cập nhật app, dữ
// liệu cũ sẽ được chuyển sang IndexedDB rồi mới xoá khoá localStorage (chỉ xoá khi ghi thành công,
// để không bao giờ mất dữ liệu nếu IndexedDB bị chặn).
export function useIdbCollection<T extends { id: string }>(store: string, legacyLocalKey?: string) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const stored = await idbGetAll<T>(store)
      const byId = new Map(stored.map((i) => [i.id, i]))
      if (legacyLocalKey) {
        // Chỉ chuyển sang IndexedDB những mục cũ chưa có ở đó (tránh đè bản đã sửa sau này).
        const legacy = loadCollection<T>(legacyLocalKey)
        const pending = legacy.filter((i) => !byId.has(i.id))
        if (legacy.length > 0) {
          const ok = await idbPutMany(store, pending)
          if (ok) {
            pending.forEach((i) => byId.set(i.id, i))
            removeCollection(legacyLocalKey)
          }
        }
      }
      if (cancelled) return
      setItems(sortNewestFirst(Array.from(byId.values())))
      setLoading(false)
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [store, legacyLocalKey])

  // Loại bỏ trước mọi bản ghi trùng id thay vì chèn thẳng lên đầu — giống useLocalCollection.add.
  // Id sinh theo Date.now() nên chạm 2 lần vào nút Lưu (mạng/thiết bị chậm) có thể gọi add() 2 lần
  // với cùng id trong cùng một mili-giây; không chặn thì danh sách có 2 mục không phân biệt được.
  const add = useCallback(
    (item: T) => {
      setItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)])
      void idbPut(store, item)
    },
    [store],
  )

  // Dùng khi SỬA một mục đã có. Nếu id chưa có trong danh sách thì xử lý như thêm mới (chèn lên
  // đầu), giống useLocalCollection.update.
  const update = useCallback(
    (item: T) => {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id)
        return idx === -1 ? [item, ...prev] : prev.map((i, ix) => (ix === idx ? item : i))
      })
      void idbPut(store, item)
    },
    [store],
  )

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id))
      void idbDelete(store, id)
    },
    [store],
  )

  // Dùng khi nhập file JSON (đồng bộ thủ công) — gộp theo id, không xoá mục hiện có mà file nhập
  // không đề cập tới.
  const upsertMany = useCallback(
    (incoming: T[]) => {
      setItems((prev) => {
        const byId = new Map(prev.map((i) => [i.id, i]))
        incoming.forEach((i) => byId.set(i.id, i))
        return Array.from(byId.values())
      })
      void idbPutMany(store, incoming)
    },
    [store],
  )

  return { items, loading, add, update, remove, upsertMany }
}

// IndexedDB trả về theo thứ tự khoá (id) tăng dần, trong khi màn hình muốn mục mới nhất lên đầu.
// Id của mục tự nhập đều có dạng `custom-...-<mốc thời gian>` nên sắp giảm dần theo id là đủ để
// mục tạo sau nằm trên; mục nhập từ file có id lạ cũng chỉ ảnh hưởng thứ tự hiển thị.
function sortNewestFirst<T extends { id: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => b.id.localeCompare(a.id))
}
