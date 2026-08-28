import { useCallback, useEffect, useRef, useState } from "react"
import { idbDelete, idbGetAllCoKetQua, idbPut, idbPutMany, idbReplaceAll } from "./idb"
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
//
// HAI ĐƯỜNG HỎNG mà hook này phải nói ra được, vì cả hai đều im lặng theo mặc định:
//   `loiDoc` — lượt đọc lúc mount thất bại. Nếu không phân biệt, "đọc hỏng" trông y hệt "chưa có
//   gì": bảng Mindmap biến mất kèm lời mời tạo bảng mới, còn bài viết/ECG thì mục tự soạn lặng lẽ
//   rụng khỏi danh sách vốn đã trộn với nội dung tĩnh nên nhìn vẫn đầy.
//   `loiGhi` — một lượt ghi trả về thất bại (hết quota, IndexedDB bị chặn). Giao diện cập nhật lạc
//   quan nên luôn trông như đã lưu xong.
// Cả hai đều có đường thử lại (`thuLaiDoc`, `thuLaiGhi`) chứ không chỉ báo lỗi rồi bỏ mặc.
export function useIdbCollection<T extends { id: string }>(store: string, legacyLocalKey?: string) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  // Câu giải thích được (tiếng Việt) khi lượt đọc thất bại, null khi đọc bình thường. Là chuỗi chứ
  // không phải boolean vì hai ca hay gặp nhất cần hai lời khuyên KHÁC nhau: "đóng tab app bản cũ
  // rồi thử lại" so với "trình duyệt đang chặn lưu trữ" (xem openDb trong idb.ts).
  const [loiDoc, setLoiDoc] = useState<string | null>(null)
  // Tăng lên để chạy lại lượt đọc (thuLaiDoc). Là state chứ không phải ref vì nó nằm trong deps của
  // useEffect đọc dữ liệu.
  const [lanDoc, setLanDoc] = useState(0)
  // true khi một lượt ghi TRẢ VỀ THẤT BẠI. Không tự tắt: dữ liệu chưa lưu vẫn là dữ liệu chưa lưu
  // cho tới khi người dùng tự xác nhận đã đọc (xoaLoiGhi) hoặc thử lại thành công (thuLaiGhi).
  const [loiGhi, setLoiGhi] = useState(false)
  // Số lượt ghi đang chờ thử lại — để màn hình nói được "3 thay đổi chưa lưu" thay vì một câu lỗi
  // chung chung. Là state riêng (không đọc thẳng hangChoRef.length) vì ref không kích hoạt re-render.
  const [soGhiCho, setSoGhiCho] = useState(0)
  // Hàng chờ các lượt ghi đã hỏng, giữ nguyên THỨ TỰ gốc. Lưu dạng thunk (không phải payload) để
  // thử lại chạy đúng lệnh idb ban đầu — put hay delete, store nào, bản ghi nào.
  const hangChoRef = useRef<Array<() => Promise<boolean>>>([])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const kq = await idbGetAllCoKetQua<T>(store)
      if (cancelled) return

      if (!kq.ok) {
        // KHÔNG đụng vào `items`: giữ nguyên những gì đang hiển thị (thường là [] lúc mount, nhưng
        // nếu đây là lượt THỬ LẠI sau khi đã đọc được một lần thì danh sách cũ còn tốt hơn rỗng).
        // Cũng KHÔNG chạy di trú legacy ở nhánh này — xem lý do ngay dưới.
        setLoiDoc(kq.loi)
        setLoading(false)
        return
      }

      const byId = new Map(kq.items.map((i) => [i.id, i]))
      if (legacyLocalKey) {
        // Chỉ chuyển sang IndexedDB những mục cũ chưa có ở đó (tránh đè bản đã sửa sau này).
        //
        // Lời hứa "tránh đè bản đã sửa" CHỈ đúng khi `byId` phản ánh đúng nội dung IndexedDB. Trước
        // đây lượt đọc hỏng cũng trả [] nên `byId` rỗng, khiến MỌI mục localStorage cũ thành
        // "pending" và bị ghi đè lên bản IndexedDB mới hơn — đúng thứ dòng comment này cam kết
        // không làm. Nay nhánh !kq.ok đã return sớm ở trên, nên tới được đây nghĩa là đã đọc thật.
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
      setLoiDoc(null)
      setLoading(false)
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [store, legacyLocalKey, lanDoc])

  // Đọc lại từ đầu. Dùng cho nút "Thử lại" ở màn hình khi loiDoc khác null — ca điển hình là người
  // dùng đóng tab app bản cũ đang giữ IndexedDB rồi bấm thử lại, không phải tải lại cả app.
  const thuLaiDoc = useCallback(() => {
    setLoading(true)
    setLoiDoc(null)
    setLanDoc((n) => n + 1)
  }, [])

  // Bọc mọi lệnh ghi: giữ nguyên tính "chạy nền, không chặn re-render" (chỗ gọi vẫn không await),
  // chỉ thêm việc ĐỌC kết quả boolean vốn idb.ts đã trả sẵn.
  //
  // TRAN_HANG_CHO: không có trần thì một vòng autosave đang hỏng (bảng vẽ debounce 400ms) sẽ nhồi
  // hàng nghìn thunk vào bộ nhớ. Chạm trần thì ngừng xếp thêm nhưng GIỮ cờ lỗi — lúc đó lời khuyên
  // đúng không còn là "thử lại" mà là xuất file sao lưu.
  const theoDoiGhi = useCallback((chay: () => Promise<boolean>) => {
    void chay().then((ok) => {
      if (ok) return
      if (hangChoRef.current.length < TRAN_HANG_CHO) {
        hangChoRef.current.push(chay)
        setSoGhiCho(hangChoRef.current.length)
      }
      setLoiGhi(true)
    })
  }, [])

  // Chạy lại các lượt ghi đã hỏng, TUẦN TỰ theo đúng thứ tự gốc — hai lượt ghi cùng một id mà chạy
  // song song thì bản thắng là bản ngẫu nhiên.
  const thuLaiGhi = useCallback(async () => {
    const cho = hangChoRef.current
    hangChoRef.current = []
    setSoGhiCho(0)
    setLoiGhi(false)
    const conHong: Array<() => Promise<boolean>> = []
    for (const chay of cho) {
      if (!(await chay())) conHong.push(chay)
    }
    if (conHong.length > 0) {
      // Giữ luôn cả những lượt ghi mới hỏng thêm TRONG LÚC đang thử lại, không đè mất chúng.
      hangChoRef.current = [...conHong, ...hangChoRef.current].slice(0, TRAN_HANG_CHO)
      setSoGhiCho(hangChoRef.current.length)
      setLoiGhi(true)
    }
  }, [])

  // Chỉ tắt DẢI BÁO, không xoá hàng chờ: người dùng đóng thông báo không có nghĩa là dữ liệu đã
  // được lưu, nên lần thuLaiGhi sau vẫn còn nguyên việc để làm.
  const xoaLoiGhi = useCallback(() => setLoiGhi(false), [])

  // Loại bỏ trước mọi bản ghi trùng id thay vì chèn thẳng lên đầu — giống useLocalCollection.add.
  // Id sinh theo Date.now() nên chạm 2 lần vào nút Lưu (mạng/thiết bị chậm) có thể gọi add() 2 lần
  // với cùng id trong cùng một mili-giây; không chặn thì danh sách có 2 mục không phân biệt được.
  const add = useCallback(
    (item: T) => {
      setItems((prev) => [item, ...prev.filter((i) => i.id !== item.id)])
      theoDoiGhi(() => idbPut(store, item))
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
      theoDoiGhi(() => idbPut(store, item))
    },
    [store, theoDoiGhi],
  )

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id))
      theoDoiGhi(() => idbDelete(store, id))
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
      theoDoiGhi(() => idbPutMany(store, incoming))
    },
    [store, theoDoiGhi],
  )

  // Dùng cho "Hoàn tác nhập file" — thay hẳn danh sách hiện tại bằng snapshot chụp trước lúc nhập,
  // khác `upsertMany` (chỉ gộp thêm/đè, không xoá mục mà file nhập vừa thêm mới).
  const replaceAll = useCallback(
    (next: T[]) => {
      setItems(next)
      theoDoiGhi(() => idbReplaceAll(store, next))
    },
    [store, theoDoiGhi],
  )

  return {
    items,
    loading,
    loiDoc,
    thuLaiDoc,
    loiGhi,
    soGhiCho,
    xoaLoiGhi,
    thuLaiGhi,
    add,
    update,
    remove,
    upsertMany,
    replaceAll,
  }
}

// Trần hàng chờ thử-lại-ghi. Ở cấp module (không phải trong hook) để mọi collection dùng chung một
// con số và để hằng số không bị dựng lại mỗi lần render.
const TRAN_HANG_CHO = 100

// IndexedDB trả về theo thứ tự khoá (id) tăng dần, trong khi màn hình muốn mục mới nhất lên đầu.
// Id của mục tự nhập đều có dạng `custom-...-<mốc thời gian>` nên sắp giảm dần theo id là đủ để
// mục tạo sau nằm trên; mục nhập từ file có id lạ cũng chỉ ảnh hưởng thứ tự hiển thị.
function sortNewestFirst<T extends { id: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => b.id.localeCompare(a.id))
}
