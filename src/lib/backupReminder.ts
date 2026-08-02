// Nhắc sao lưu Sơ đồ tư duy. Dữ liệu chỉ nằm trên máy (IndexedDB) — "Xuất file" ở màn Đồng bộ dữ
// liệu là cách sao lưu duy nhất hiện có, và không ai tự nhớ ra để làm việc đó định kỳ. Đây KHÔNG
// phải sao lưu đám mây (cần máy chủ, chưa có) — chỉ là một lời nhắc để việc xuất file không bị quên
// cho tới lúc mất máy mới nhận ra.
const LAST_BACKUP_KEY = "drtrong:lastBackupAt"
const SNOOZE_KEY = "drtrong:backupReminderSnoozeUntil"
const REMIND_AFTER_DAYS = 14
const SNOOZE_DAYS = 7
const DAY_MS = 86400000

export function markBackupDone(): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()))
  } catch {
    // Không sao — chỉ mất tác dụng của lời nhắc, không mất dữ liệu.
  }
}

// Người dùng bấm "Để sau" trên lời nhắc — im lặng một thời gian rồi mới nhắc lại.
export function snoozeBackupReminder(): void {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * DAY_MS))
  } catch {
    // ignore
  }
}

// true nếu đã đủ lâu (mặc định 14 ngày) kể từ lần xuất file gần nhất — hoặc CHƯA TỪNG xuất — và
// không đang trong thời gian tạm ẩn sau khi người dùng bấm "Để sau".
export function shouldRemindBackup(): boolean {
  try {
    const snoozeUntil = Number(localStorage.getItem(SNOOZE_KEY) ?? 0)
    if (Date.now() < snoozeUntil) return false
    const last = localStorage.getItem(LAST_BACKUP_KEY)
    if (!last) return true
    return Date.now() - Number(last) >= REMIND_AFTER_DAYS * DAY_MS
  } catch {
    return false
  }
}
