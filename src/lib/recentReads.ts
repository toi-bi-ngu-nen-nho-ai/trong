// "Đã đọc gần đây" — ghi lại những bài người dùng THẬT SỰ đã mở, theo thứ tự mới nhất trước.
//
// Bản trước không có gì để ghi lại việc đọc: màn hình Trang chủ chỉ lấy `[...bài tự nhập, ...bài
// dựng sẵn].slice(0, 3)`, nghĩa là luôn hiện đúng ba bài đầu danh sách dù người dùng chưa mở bài nào
// hoặc vừa đọc bài khác. Nay mỗi lần mở một mục trong kho `mucs` sẽ được ghi lại kèm mốc thời gian.
//
// Giai đoạn 8 đã gỡ ba kind "article" (bài dựng sẵn), "custom" (bài tự nhập) và "ecg" (bài học
// ECG) khỏi `ReadKind`. Bản ghi cũ mang ba kind đó vẫn nằm trong localStorage của máy người dùng —
// `isEntry()` bên dưới lọc chúng ra khi đọc, để panel "Đã đọc gần đây" không hiện những dòng
// bấm vào không mở được gì (spec §3.6). Xem src/lib/__tests__/recentReads-loc-cu.spec.ts.
//
// Chỉ lưu `kind` + `id` + `at`, không lưu tiêu đề: tiêu đề luôn được tra lại từ dữ liệu thật lúc hiển
// thị, nên bài đổi tên thì danh sách đổi theo, và bài đã xoá thì tự biến mất khỏi danh sách.

import { loadCollection, saveCollection } from "./storage"

export type ReadKind = "muc"

export interface ReadEntry {
  kind: ReadKind
  id: string
  at: number
}

const KEY = "recentReads"
// Giữ 40 mục: đủ để danh sách vẫn có nội dung sau khi vài bài bị xoá, mà vẫn rất nhẹ.
const LIMIT = 40
// Mở lại đúng bài vừa đọc trong vòng một phút thì không tính là một lần đọc mới (tránh việc bấm
// vào rồi bấm quay lại rồi vào lại cũng làm danh sách nhảy loạn).
const SAME_READ_MS = 60_000

function isEntry(v: unknown): v is ReadEntry {
  if (!v || typeof v !== "object") return false
  const e = v as Partial<ReadEntry>
  return (
    e.kind === "muc" &&
    typeof e.id === "string" &&
    typeof e.at === "number"
  )
}

export function loadRecentReads(): ReadEntry[] {
  return loadCollection<unknown>(KEY)
    .filter(isEntry)
    .sort((a, b) => b.at - a.at)
}

// Ghi nhận một lần mở bài. Trả về danh sách mới để nơi gọi cập nhật state ngay, không phải đọc lại.
export function recordRead(kind: ReadKind, id: string, now = Date.now()): ReadEntry[] {
  const prev = loadRecentReads()
  const top = prev[0]
  if (top && top.kind === kind && top.id === id && now - top.at < SAME_READ_MS) return prev

  const next = [{ kind, id, at: now }, ...prev.filter((e) => !(e.kind === kind && e.id === id))].slice(0, LIMIT)
  saveCollection(KEY, next)
  return next
}

// Bỏ hẳn một bài khỏi danh sách — dùng khi người dùng xoá bài đó.
export function forgetRead(kind: ReadKind, id: string): ReadEntry[] {
  const next = loadRecentReads().filter((e) => !(e.kind === kind && e.id === id))
  saveCollection(KEY, next)
  return next
}

// Mốc thời gian đọc, viết theo cách người ta nói: "Vừa xong", "3 giờ trước", "Hôm qua", "5 ngày
// trước", rồi tới ngày cụ thể. Tính theo NGÀY LỊCH (không phải chia cho 24 giờ) nên 23h đêm qua đọc
// thì sáng nay thấy "Hôm qua", đúng như cảm nhận thường ngày.
export function formatReadTime(at: number, now = Date.now()): string {
  const diffMin = Math.floor((now - at) / 60_000)
  if (diffMin < 1) return "Vừa xong"
  if (diffMin < 60) return `${diffMin} phút trước`

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const readDay = new Date(at)
  readDay.setHours(0, 0, 0, 0)
  const dayDiff = Math.round((startOfToday.getTime() - readDay.getTime()) / 86_400_000)

  if (dayDiff <= 0) return `${Math.floor(diffMin / 60)} giờ trước`
  if (dayDiff === 1) return "Hôm qua"
  if (dayDiff < 7) return `${dayDiff} ngày trước`

  const d = new Date(at)
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
}
