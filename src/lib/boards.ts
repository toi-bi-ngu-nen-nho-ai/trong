import { useCallback, useEffect, useState } from "react"
import type { MindBoard } from "../data/types"
import { IDB_STORES, idbDelete, idbGetAll, idbPut } from "./idb"
import { deleteMindmap, hasLegacyMindmap } from "./mindmapStorage"

// Quản lý DANH SÁCH các bảng Sơ đồ tư duy (tên/màu/chuyên khoa gắn thẻ) và bảng đang mở. Dữ liệu
// THẬT của mỗi bảng (node/cạnh/nét vẽ/ảnh) không nằm ở đây — xem lib/mindmapStorage.ts + useMindmap.
//
// Máy đã dùng app từ trước khi có nhiều bảng chỉ có một bản ghi dữ liệu "main", chưa từng có bản ghi
// nào trong store "boards". Lần mở màn Sơ đồ tư duy đầu tiên sau khi cập nhật, hook này tự tạo đúng
// MỘT bảng mang id "main" (khớp bản ghi dữ liệu cũ) đặt tên "Bảng của tôi" — không ai mất gì, không
// cần thao tác gì thêm. Máy hoàn toàn mới thì tạo một bảng trống "Bảng đầu tiên".

const ACTIVE_BOARD_KEY = "drtrong:activeBoardId"
export const DEFAULT_BOARD_COLOR = "#0050B3"

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

export function useBoards() {
  const [boards, setBoards] = useState<MindBoard[]>([])
  const [activeBoardId, setActiveBoardIdState] = useState<string>(LEGACY_ID_FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let list = await loadBoardsRaw()
      if (list.length === 0) {
        const migrating = await hasLegacyMindmap()
        const now = Date.now()
        const first: MindBoard = migrating
          ? { id: LEGACY_ID_FALLBACK, name: "Bảng của tôi", color: DEFAULT_BOARD_COLOR, order: 0, createdAt: now, updatedAt: now }
          : { id: makeBoardId(), name: "Bảng đầu tiên", color: DEFAULT_BOARD_COLOR, order: 0, createdAt: now, updatedAt: now }
        await idbPut<MindBoard>(IDB_STORES.boards, first)
        list = [first]
      }
      if (cancelled) return
      setBoards(list)
      const saved = readActiveId()
      setActiveBoardIdState(saved && list.some((b) => b.id === saved) ? saved : list[0].id)
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

  // Luôn giữ ít nhất một bảng — xoá bảng đang mở thì tự chuyển sang bảng còn lại đầu tiên.
  const deleteBoard = useCallback(
    async (id: string) => {
      if (boards.length <= 1) return false
      await idbDelete(IDB_STORES.boards, id)
      await deleteMindmap(id)
      const remaining = boards.filter((b) => b.id !== id)
      setBoards(remaining)
      if (activeBoardId === id && remaining.length > 0) setActiveBoardId(remaining[0].id)
      return true
    },
    [boards, activeBoardId, setActiveBoardId],
  )

  return { boards, activeBoardId, setActiveBoardId, loading, createBoard, updateBoard, deleteBoard, reorderBoards, upsertBoardLocal }
}

// Id di trú cho bảng đầu tiên trên máy đã dùng app từ trước khi có nhiều bảng — phải khớp
// LEGACY_BOARD_ID trong mindmapStorage.ts để đọc đúng dữ liệu cũ.
const LEGACY_ID_FALLBACK = "main"
