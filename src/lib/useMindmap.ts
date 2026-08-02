import { useCallback, useEffect, useRef, useState } from "react"
import type { MindmapData, MindNode, MindEdge, MindImage, MindStroke } from "../data/types"
import { DEFAULT_MINDMAP, loadMindmap, saveMindmap, mergeMindmaps } from "./mindmapStorage"

const SAVE_DEBOUNCE_MS = 400

// Hook quản lý dữ liệu của MỘT bảng Sơ đồ tư duy (theo boardId — xem lib/boards.ts cho danh sách
// nhiều bảng), đồng bộ với IndexedDB (xem mindmapStorage.ts).
//
// Việc ghi được debounce 400ms thay vì ghi ngay mỗi lần state đổi, vì kéo một node hay vẽ một nét sẽ
// gọi cập nhật hàng chục lần/giây — ghi liên tục ở tần suất đó gây giật lag, nhất là trên điện thoại.
//
// Đổi boardId (người dùng chuyển sang bảng khác) hoạt động như rời màn hình rồi mở lại: lần sửa cuối
// còn treo của bảng CŨ được ghi ngay (không mất gì), rồi dữ liệu của bảng MỚI được nạp lại từ đầu.
//
// IndexedDB đọc bất đồng bộ nên bảng bắt đầu bằng dữ liệu mặc định và được thay bằng dữ liệu thật sau
// khi nạp xong; `loading` cho biết lúc nào xong để màn hình không cho vẽ lên bảng chưa nạp (vẽ lúc
// đó sẽ bị dữ liệu thật ghi đè khi nạp xong, hoặc tệ hơn là ghi đè NHẦM SANG bảng vừa chuyển tới).
export function useMindmap(boardId: string) {
  const [data, setData] = useState<MindmapData>(DEFAULT_MINDMAP)
  const [loading, setLoading] = useState(true)
  // Tăng thêm 1 sau MỖI lần ghi thành công. Màn hình bảng vẽ dựa vào đây để hiện dấu "đã lưu": việc
  // ghi vào máy là thứ người dùng không thấy được, mà bảng vẽ tay thì rất cần biết chắc là đã lưu.
  const [savedTick, setSavedTick] = useState(0)
  const dataRef = useRef(data)
  // Ngăn xếp hoàn tác/làm lại của MỖI bảng — khoá theo boardId, sống hết vòng đời của HOOK NÀY (tức
  // là hết phiên dùng app), không phải vòng đời của MindmapBoard. MindmapBoard bị unmount mỗi khi
  // rời màn Sơ đồ tư duy sang tab khác rồi quay lại; nếu ngăn xếp nằm trong chính nó (như trước đây)
  // thì mất sạch ngay lúc đó dù người dùng chỉ vừa lướt sang xem một bài rồi quay lại ngay. Giữ ở đây
  // thì rời màn rồi quay lại bảng cũ, hoàn tác vẫn còn nguyên; chuyển sang MỘT BẢNG KHÁC thì tự dùng
  // đúng ngăn xếp của bảng đó (rỗng nếu bảng đó chưa từng sửa).
  const undoStoresRef = useRef<Map<string, { undo: MindmapData[]; redo: MindmapData[] }>>(new Map())
  if (!undoStoresRef.current.has(boardId)) undoStoresRef.current.set(boardId, { undo: [], redo: [] })
  const undoStore = undoStoresRef.current.get(boardId)!
  // Bảng đang được `data`/`scheduleSave` thao tác — CHỈ đổi khi nạp xong dữ liệu của boardId mới
  // (không đổi ngay lúc boardId prop đổi), để lần ghi treo cuối của bảng cũ luôn ghi đúng chỗ cũ.
  const boardIdRef = useRef(boardId)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Chỉ cho phép ghi sau khi đã nạp xong, tránh ghi đè dữ liệu thật bằng bảng mặc định.
  const ready = useRef(false)
  // Import (Đồng bộ dữ liệu → nhập file) gọi ĐÚNG lúc đang tải bảng (vừa chuyển bảng, `ready` còn
  // false) thì trước đây bị nạp xong ghi đè mất — importMerge() merge vào `prev` (dữ liệu bảng CŨ
  // hoặc mặc định, không phải bảng đang tải) rồi setData(next), nhưng .then() của loadMindmap() sau
  // đó gọi setData(loaded) ĐÈ THẲNG lên, và vì `ready` false lúc merge nên cũng chưa kịp ghi xuống
  // đĩa — mất trắng, không báo lỗi. Giữ tạm import ở đây, áp dụng lại đúng lúc bảng tải xong.
  const pendingImportRef = useRef<MindmapData | null>(null)

  useEffect(() => {
    dataRef.current = data
  }, [data])

  // Ghi ngay lần thay đổi cuối còn treo của bảng đang rời đi — chạy khi boardId đổi (chuyển bảng)
  // HOẶC khi rời hẳn màn hình Sơ đồ tư duy, phòng trường hợp app bị tắt trước khi timer chạy.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
        if (ready.current) void saveMindmap(boardIdRef.current, dataRef.current)
      }
    }
  }, [boardId])

  useEffect(() => {
    ready.current = false
    setLoading(true)
    let cancelled = false
    loadMindmap(boardId).then((loaded) => {
      if (cancelled) return
      boardIdRef.current = boardId
      // Có import đang chờ (gọi trong lúc bảng này còn tải) — merge vào ĐÚNG dữ liệu thật vừa tải
      // xong (không phải bản mặc định/bản bảng cũ) rồi ghi luôn, thay vì để mất như trước.
      const pending = pendingImportRef.current
      pendingImportRef.current = null
      if (pending) {
        const merged = mergeMindmaps(loaded, pending)
        setData(merged)
        void saveMindmap(boardId, merged)
      } else {
        setData(loaded)
      }
      ready.current = true
      setLoading(false)
    })
    return () => {
      cancelled = true
      pendingImportRef.current = null
    }
  }, [boardId])

  const scheduleSave = useCallback((next: MindmapData) => {
    if (!ready.current) return
    const targetBoardId = boardIdRef.current
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void saveMindmap(targetBoardId, next).then((ok) => {
        if (ok) setSavedTick((t) => t + 1)
      })
    }, SAVE_DEBOUNCE_MS)
  }, [])

  const updateNodes = useCallback(
    (updater: (nodes: MindNode[]) => MindNode[]) => {
      setData((prev) => {
        const next = { ...prev, nodes: updater(prev.nodes) }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  const updateEdges = useCallback(
    (updater: (edges: MindEdge[]) => MindEdge[]) => {
      setData((prev) => {
        const next = { ...prev, edges: updater(prev.edges) }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  const updateStrokes = useCallback(
    (updater: (strokes: MindStroke[]) => MindStroke[]) => {
      setData((prev) => {
        const next = { ...prev, strokes: updater(prev.strokes ?? []) }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  const updateImages = useCallback(
    (updater: (images: MindImage[]) => MindImage[]) => {
      setData((prev) => {
        const next = { ...prev, images: updater(prev.images ?? []) }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave],
  )

  // Thay toàn bộ bảng — dùng cho hoàn tác (undo) trên màn Sơ đồ tư duy.
  const replaceAll = useCallback(
    (next: MindmapData) => {
      setData(next)
      scheduleSave(next)
    },
    [scheduleSave],
  )

  // Dùng khi nhập file JSON (Đồng bộ dữ liệu) — gộp bảng nhập vào với bảng hiện có (merge theo id
  // node / nét vẽ / cặp cạnh, không xoá mất dữ liệu hiện có) rồi ghi ngay.
  const importMerge = useCallback((incoming: MindmapData) => {
    if (!ready.current) {
      // Bảng đang tải (vừa chuyển bảng) — hoãn tới khi tải xong, xem effect nạp dữ liệu ở trên.
      pendingImportRef.current = incoming
      return
    }
    setData((prev) => {
      const next = mergeMindmaps(prev, incoming)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      void saveMindmap(boardIdRef.current, next)
      return next
    })
  }, [])

  return { data, loading, savedTick, updateNodes, updateEdges, updateStrokes, updateImages, replaceAll, importMerge, undoStore }
}
