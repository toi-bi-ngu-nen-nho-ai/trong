import { useCallback, useEffect, useState } from "react"
import type { MindBoard } from "../data/types"
import { IDB_STORES, idbDelete, idbGetAll, idbPut } from "./idb"
import { deleteMindmap, hasLegacyMindmap, loadMindmap, saveMindmap } from "./mindmapStorage"

// Quản lý DANH SÁCH các bảng Sơ đồ tư duy (tên/màu/chuyên khoa gắn thẻ) và bảng đang mở. Dữ liệu
// THẬT của mỗi bảng (node/cạnh/nét vẽ/ảnh) không nằm ở đây — xem lib/mindmapStorage.ts + useMindmap.
//
// Máy đã dùng app từ trước khi có nhiều bảng chỉ có một bản ghi dữ liệu "main", chưa từng có bản ghi
// nào trong store "boards". Lần mở màn Sơ đồ tư duy đầu tiên sau khi cập nhật, hook này tự tạo đúng
// MỘT bảng mang id "main" (khớp bản ghi dữ liệu cũ) đặt tên "Bảng của tôi" — không ai mất gì, không
// cần thao tác gì thêm. Máy hoàn toàn mới thì tạo một bảng trống "Bảng đầu tiên".

const ACTIVE_BOARD_KEY = "drtrong:activeBoardId"
export const DEFAULT_BOARD_COLOR = "var(--c-primary)"

function makeBoardId(): string {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

function readActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_BOARD_KEY)
  } catch {
    return null
  }
}

function writeActiveId(id: string) {
  try {
    localStorage.setItem(ACTIVE_BOARD_KEY, id)
  } catch {
    // Riêng tư/hết dung lượng: chỉ mất việc "nhớ bảng đang mở" giữa các lần vào app, không mất dữ liệu.
  }
}

async function loadBoardsRaw(): Promise<MindBoard[]> {
  const rows = await idbGetAll<MindBoard>(IDB_STORES.boards)
  return rows.slice().sort((a, b) => a.order - b.order)
}

// Lần khởi tạo đang chạy dở, dùng chung cho mọi lời gọi song song.
//
// Vì sao cần: bước "chưa có bảng nào thì tạo bảng đầu tiên" là một chuỗi ĐỌC rồi GHI bất đồng bộ.
// Hai lần chạy chồng nhau đều đọc ra danh sách rỗng, rồi cả hai cùng tạo — thành hai bảng "Bảng đầu
// tiên" y hệt nhau. Chuyện này xảy ra thật ở chế độ dev vì React.StrictMode cố ý chạy effect hai
// lần (xem src/main.tsx), và về nguyên tắc có thể xảy ra bất cứ khi nào component được gắn lại
// nhanh hơn một vòng đọc IndexedDB. Giữ chung MỘT lời hứa thì lần gọi thứ hai chờ kết quả của lần
// đầu thay vì mở một cuộc đua mới.
let bootstrap: Promise<MindBoard[]> | null = null

function ensureBoards(): Promise<MindBoard[]> {
  if (bootstrap) return bootstrap
  bootstrap = (async () => {
    const list = await loadBoardsRaw()
    if (list.length > 0) return list
    const migrating = await hasLegacyMindmap()
    const now = Date.now()
    const first: MindBoard = migrating
      ? { id: LEGACY_ID_FALLBACK, name: "Bảng của tôi", color: DEFAULT_BOARD_COLOR, order: 0, createdAt: now, updatedAt: now }
      : { id: makeBoardId(), name: "Bảng đầu tiên", color: DEFAULT_BOARD_COLOR, order: 0, createdAt: now, updatedAt: now }
    await idbPut<MindBoard>(IDB_STORES.boards, first)
    return [first]
  })()
  return bootstrap
}

export function useBoards() {
  // `all` giữ CẢ bảng trong thùng rác. Lọc ở nơi hiển thị chứ không xoá khỏi state: thùng rác cần
  // đọc đúng danh sách đó, và khôi phục chỉ là bỏ một trường đi.
  const [all, setBoards] = useState<MindBoard[]>([])
  const [activeBoardId, setActiveBoardIdState] = useState<string>(LEGACY_ID_FALLBACK)
  const [loading, setLoading] = useState(true)
  const boards = all.filter((b) => !b.deletedAt)
  const trashedBoards = all.filter((b) => b.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const list = await ensureBoards()
      if (cancelled) return
      setBoards(list)
      const saved = readActiveId()
      // Bảng đang mở lần trước có thể đã bị dời vào thùng rác — mở lại nó thì người dùng chỉnh sửa
      // một bảng mà họ tưởng đã xoá.
      const live = list.filter((b) => !b.deletedAt)
      const fallback = live[0]?.id ?? list[0].id
      setActiveBoardIdState(saved && live.some((b) => b.id === saved) ? saved : fallback)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setActiveBoardId = useCallback((id: string) => {
    setActiveBoardIdState(id)
    writeActiveId(id)
  }, [])

  // `order` dùng mốc thời gian tạo — đủ để bảng mới luôn xếp sau, và người dùng có thể kéo sắp lại
  // (reorderBoards) mà không phải dồn lại toàn bộ số thứ tự các bảng còn lại.
  const createBoard = useCallback(
    async (name: string, color: string = DEFAULT_BOARD_COLOR, specialtyId?: string) => {
      const now = Date.now()
      const board: MindBoard = { id: makeBoardId(), name: name.trim() || "Bảng mới", color, specialtyId, order: now, createdAt: now, updatedAt: now }
      await idbPut<MindBoard>(IDB_STORES.boards, board)
      setBoards((prev) => [...prev, board])
      setActiveBoardId(board.id)
      return board
    },
    [setActiveBoardId],
  )

  const updateBoard = useCallback((id: string, patch: Partial<Pick<MindBoard, "name" | "color" | "specialtyId">>) => {
    setBoards((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b))
      const updated = next.find((b) => b.id === id)
      if (updated) void idbPut<MindBoard>(IDB_STORES.boards, updated)
      return next
    })
  }, [])

  // Đưa MỘT bảng (mới hoặc đã có) vào state + IndexedDB — dùng khi nhập file sao lưu có bảng chưa
  // từng thấy trên máy này, hoặc bảng đã có nhưng metadata trong file mới hơn.
  const upsertBoardLocal = useCallback((board: MindBoard) => {
    setBoards((prev) => {
      const exists = prev.some((b) => b.id === board.id)
      void idbPut<MindBoard>(IDB_STORES.boards, board)
      return exists ? prev.map((b) => (b.id === board.id ? board : b)) : [...prev, board]
    })
  }, [])

  const reorderBoards = useCallback((orderedIds: string[]) => {
    setBoards((prev) => {
      const byId = new Map(prev.map((b) => [b.id, b]))
      const next = orderedIds
        .map((id, i) => {
          const b = byId.get(id)
          if (!b) return null
          const updated = { ...b, order: i }
          void idbPut<MindBoard>(IDB_STORES.boards, updated)
          return updated
        })
        .filter((b): b is MindBoard => b !== null)
      return next
    })
  }, [])

  // ─── Nhân bản ─────────────────────────────────────────────────────────────
  // Chép cả metadata lẫn NỘI DUNG bảng. Chép mỗi metadata thì ra một bảng trống mang tên "(bản
  // sao)" — đúng thứ không ai muốn khi bấm nhân bản.
  const duplicateBoard = useCallback(
    async (id: string) => {
      const src = all.find((b) => b.id === id)
      if (!src) return null
      const now = Date.now()
      const copy: MindBoard = {
        ...src,
        id: makeBoardId(),
        name: `${src.name} (bản sao)`,
        order: now,
        createdAt: now,
        updatedAt: now,
        deletedAt: undefined,
      }
      const data = await loadMindmap(src.id)
      await saveMindmap(copy.id, data)
      await idbPut<MindBoard>(IDB_STORES.boards, copy)
      setBoards((prev) => [...prev, copy])
      return copy
    },
    [all],
  )

  // ─── Thùng rác ────────────────────────────────────────────────────────────
  // Dời vào thùng rác chỉ là đánh dấu thời điểm; dữ liệu bảng không bị đụng tới. Vẫn giữ quy tắc
  // "luôn còn ít nhất một bảng đang dùng" — dọn hết vào thùng rác thì màn danh sách trống trơn và
  // không còn gì để mở.
  const trashBoard = useCallback(
    async (id: string) => {
      const live = all.filter((b) => !b.deletedAt)
      if (live.length <= 1) return false
      const target = all.find((b) => b.id === id)
      if (!target) return false
      const updated = { ...target, deletedAt: Date.now() }
      await idbPut<MindBoard>(IDB_STORES.boards, updated)
      setBoards((prev) => prev.map((b) => (b.id === id ? updated : b)))
      if (activeBoardId === id) {
        const next = live.find((b) => b.id !== id)
        if (next) setActiveBoardId(next.id)
      }
      return true
    },
    [all, activeBoardId, setActiveBoardId],
  )

  const restoreBoard = useCallback(async (id: string) => {
    setBoards((prev) => {
      const target = prev.find((b) => b.id === id)
      if (!target) return prev
      const updated: MindBoard = { ...target, deletedAt: undefined, updatedAt: Date.now() }
      void idbPut<MindBoard>(IDB_STORES.boards, updated)
      return prev.map((b) => (b.id === id ? updated : b))
    })
  }, [])

  // Xoá HẲN — chỉ gọi được từ trong thùng rác, và màn đó bắt xác nhận trước.
  const purgeBoard = useCallback(async (id: string) => {
    await idbDelete(IDB_STORES.boards, id)
    await deleteMindmap(id)
    setBoards((prev) => prev.filter((b) => b.id !== id))
  }, [])

  return {
    boards,
    trashedBoards,
    activeBoardId,
    setActiveBoardId,
    loading,
    createBoard,
    duplicateBoard,
    updateBoard,
    trashBoard,
    restoreBoard,
    purgeBoard,
    reorderBoards,
    upsertBoardLocal,
  }
}

// Id di trú cho bảng đầu tiên trên máy đã dùng app từ trước khi có nhiều bảng — phải khớp
// LEGACY_BOARD_ID trong mindmapStorage.ts để đọc đúng dữ liệu cũ.
const LEGACY_ID_FALLBACK = "main"
