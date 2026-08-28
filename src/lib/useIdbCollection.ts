import { useCallback, useEffect, useState } from "react"
import { idbDelete, idbGetAll, idbPut, idbPutMany, idbReplaceAll } from "./idb"
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
  // true khi một lượt ghi xuống IndexedDB TRẢ VỀ THẤT BẠI (hết quota, IndexedDB bị chặn ở chế độ
  // riêng tư, CSDL hỏng). Trước lượt vá này mọi lệnh ghi đều là `void idbPut(...)`: idb.ts VẪN trả
  // Promise<boolean> nhưng không ai đọc, nên giao diện cập nhật lạc quan rồi LUÔN trông như đã lưu
  // xong kể cả khi không có gì được lưu. Nguy hiểm nhất ở đúng thao tác "Hoàn tác" của màn Mindmap
  // — đường phục hồi CUỐI CÙNG sau khi xoá bảng — vì nó phá thẳng lời hứa "xoá mềm, phục hồi được"
  // trong PRODUCT.md mà không phát ra tín hiệu nào (critique 2026-08-28, P1).
  // Cờ này KHÔNG tự tắt: dữ liệu chưa lưu vẫn là dữ liệu chưa lưu cho tới khi người dùng tự xác
  // nhận đã đọc (xoaLoiGhi) — khác toast báo thành công, thứ tự tắt được vì chẳng mất gì.
  const [loiGhi, setLoiGhi] = useState(false)

  // Bọc mọi lệnh ghi: GIỮ NGUYÊN tính "chạy nền, không chặn re-render" như trước (chỗ gọi vẫn không
  // await), chỉ thêm việc ĐỌC kết quả boolean vốn đã có sẵn.
  const theoDoiGhi = useCallback((ketQua: Promise<boolean>) => {
    void ketQua.then((ok) => {
      if (!ok) setLoiGhi(true)
    })
  }, [])

  const xoaLoiGhi = useCallback(() => setLoiGhi(false), [])

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
      theoDoiGhi(idbPut(store, item))
    },
    [store, theoDoiGhi],
  )

  // Dùng khi SỬA một mục đã có. Nếu id chưa có trong danh sách thì xử lý như thêm mới (chèn lên
  // đầu), giống useLocalCollection.update.
  const update = useCallback(
    (item: T) => {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id)
        return idx === -1 ? [item, ...prev] : prev.map((i, ix) => (ix === idx ? item : i))
      })
      theoDoiGhi(idbPut(store, item))
    },
    [store, theoDoiGhi],
  )

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id))
      theoDoiGhi(idbDelete(store, id))
    },
    [store, theoDoiGhi],
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
      theoDoiGhi(idbPutMany(store, incoming))
    },
    [store, theoDoiGhi],
  )

  // Dùng cho "Hoàn tác nhập file" — thay hẳn danh sách hiện tại bằng snapshot chụp trước lúc nhập,
  // khác `upsertMany` (chỉ gộp thêm/đè, không xoá mục mà file nhập vừa thêm mới).
  const replaceAll = useCallback(
    (next: T[]) => {
      setItems(next)
      theoDoiGhi(idbReplaceAll(store, next))
    },
    [store, theoDoiGhi],
  )

  return { items, loading, loiGhi, xoaLoiGhi, add, update, remove, upsertMany, replaceAll }
}

// IndexedDB trả về theo thứ tự khoá (id) tăng dần, trong khi màn hình muốn mục mới nhất lên đầu.
// Id của mục tự nhập đều có dạng `custom-...-<mốc thời gian>` nên sắp giảm dần theo id là đủ để
// mục tạo sau nằm trên; mục nhập từ file có id lạ cũng chỉ ảnh hưởng thứ tự hiển thị.
function sortNewestFirst<T extends { id: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => b.id.localeCompare(a.id))
}
