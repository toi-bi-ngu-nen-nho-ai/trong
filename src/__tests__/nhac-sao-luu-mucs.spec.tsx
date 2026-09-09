// @vitest-environment happy-dom
//
// Review Task 5-8 vòng sửa 1/5 (Important 1): `hasCustomContent` (App.tsx, khai báo ngay trên
// `showBackupReminder`) trước bản vá này chỉ đếm bốn collection localStorage cũ (kháng sinh, bệnh
// lý, thuốc truyền, thẻ ghi nhớ) — kho `mucs` (bài viết/sơ đồ, hệ THAY THẾ ArticleScreen/EcgScreen
// đã xoá ở giai đoạn 8) hoàn toàn vắng mặt trong phép tính, dù comment ngay trên nó khẳng định
// "tính theo TẤT CẢ mục tự nhập". Hệ quả: người dùng mà nội dung tự tạo DUY NHẤT là bài viết/sơ đồ
// trong kho mucs — đúng nhóm plan này tồn tại để phục vụ — không bao giờ thấy dải "Đã lâu chưa sao
// lưu — dữ liệu chỉ nằm trên máy này, mất máy là mất hết." (App.tsx, gần cuối JSX của App()).
//
// Hai ca dưới đây mount `<App />` THẬT (không dựng lại logic riêng) và seed thẳng vào store
// `mucs` của IndexedDB giả, theo đúng khuôn `sau-man-luoi-muc.spec.tsx`/`DataSyncScreen-mucs.spec.tsx`.
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import type { MucMeta } from '../board/mucMeta'
import { xoaNoiDungBang } from '../board/xoaNoiDungBang'

// Vỏ nạp chậm thật (BlockSuite) không mount được dưới happy-dom — cùng lý do các spec mount <App/>
// khác trong dự án đã ghi (ví dụ DataSyncScreen-mucs.spec.tsx). Màn Trang chủ không đụng bảng vẽ.
vi.mock('../board/index', () => ({
  VoMuc: () => null,
}))

// Cho describe I1 dưới cùng file (ca "mucLoi"): buộc `xuatSnapshotMuc` NÉM cho đúng một id, mô
// phỏng một mục đọc nội dung hỏng lúc xuất (mucLoi.push trong handleExport). `null` (mặc định) =
// mọi lời gọi đi thẳng vào bản thật, nên hai ca của describe đầu tiên không bị ảnh hưởng. Phải mock
// ở TẦNG MODULE chứ không `vi.spyOn`: App.tsx nạp module này bằng `import()` ĐỘNG (D13), namespace
// ESM sau lượt nạp đó không gán đè được — cùng lý do DataSyncScreen-hoan-tac-noi-dung.spec.tsx đã
// ghi lại.
let idDocHongLucXuat: string | null = null
vi.mock('../board/xuatNhapNoiDung', async (importOriginal) => {
  const goc = await importOriginal<typeof import('../board/xuatNhapNoiDung')>()
  return {
    ...goc,
    xuatSnapshotMuc: async (...doiSo: Parameters<typeof goc.xuatSnapshotMuc>) => {
      if (doiSo[0] === idDocHongLucXuat) throw new Error('giả lập: không đọc được nội dung mục này lúc xuất')
      return goc.xuatSnapshotMuc(...doiSo)
    },
  }
})

// Mount App() thật dưới happy-dom + fake-indexeddb — cùng cảnh chậm mà các file mount <App/> khác
// của giai đoạn 7-9 đã đo (55-90s cho lượt đầu). Nới CỤC BỘ, không đụng testTimeout toàn cục.
const HAN_GIO_MOUNT_APP_MS = 90000

// "Xuất file" đọc nội dung doc CRDT qua `import()` động rồi mở/đóng workspace cho từng mục — vài
// giây, vượt hẳn hạn 1000ms mặc định của `waitFor`. Cùng hạn xuat-file-doc-tuoi.spec.tsx dùng.
const HAN_GIO_XUAT_FILE_MS = 30000

let dem = 0
function taoMucGia(overrides: Partial<MucMeta> = {}): MucMeta {
  const bayGio = Date.now()
  dem += 1
  return {
    id: `nhac-sao-luu-${bayGio}-${dem}`,
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten: 'Bài tự viết thử',
    taoLuc: bayGio,
    capNhatLuc: bayGio,
    chuyenKhoa: '',
    tags: [],
    noiDungTimKiem: '',
    ...overrides,
  }
}

afterEach(async () => {
  const ds = await idbGetAll<{ id: string }>(IDB_STORES.mucs)
  for (const m of ds) await idbDelete(IDB_STORES.mucs, m.id)
  // M2 (review toàn nhánh 2026-09-09): dọn NỐT kho thứ HAI của một mục — nội dung doc CRDT trong
  // CSDL `drtrong-board`, hoàn toàn tách khỏi store META `mucs` vừa dọn ở trên (xem chú thích đầu
  // `board/xoaNoiDungBang.ts`). Từ ca A6 trở đi tệp này chạy `xuatSnapshotMuc` BẢN THẬT →
  // `taoHoacMoDoc` → tạo doc THẬT trong `drtrong-board`, mà `afterEach` trước lượt này chỉ dọn META:
  // doc ở lại giữa các ca. Vô hại đúng hôm nay (A6 gần cuối tệp) nhưng ai nối thêm ca sau nó là
  // dính — đúng kiểu rò rỉ mà khoản A3 vừa đi vá ở tệp khác.
  // Doc id CHÍNH LÀ id của mục (`xuatSnapshotMuc(id, …)` → `taoHoacMoDoc(id, …)`), nên `ds` đọc
  // TRƯỚC vòng xoá META ở trên đã là đúng danh sách cần dọn. Dùng `xoaNoiDungBang` — API thật của
  // app cho việc này — theo đúng khuôn `afterEach` của `DataSyncScreen-hoan-tac-noi-dung.spec.tsx`,
  // không tự mở IndexedDB bằng tay (mở sai phiên bản là làm hỏng cả kho nội dung, xem `moDbThat`).
  await xoaNoiDungBang(ds.map((m) => m.id))
  localStorage.clear()
})

describe('nhắc sao lưu tính cả kho mucs (review Task 5-8 vòng sửa 1/5, Important 1)', () => {
  // Localstorage sạch (không `drtrong:lastBackupAt`) → shouldRemindBackup() mặc định true (chưa
  // từng xuất file) — không cần giả lập "đã lâu không sao lưu", chỉ cần hasCustomContent đúng.
  it('chỉ có MỘT mục trong kho mucs (không kháng sinh/bệnh lý/thuốc truyền/thẻ nào) vẫn hiện dải nhắc sao lưu', async () => {
    await idbPut(IDB_STORES.mucs, taoMucGia())

    const { default: App } = await import('../App')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/Đã lâu chưa sao lưu/)).toBeTruthy()
    })
  }, HAN_GIO_MOUNT_APP_MS)

  it('mục mucs duy nhất đã XOÁ MỀM (daXoaLuc) thì KHÔNG tính là nội dung đang có — không hiện dải nhắc', async () => {
    await idbPut(IDB_STORES.mucs, taoMucGia({ daXoaLuc: Date.now() }))

    const { default: App } = await import('../App')
    render(<App />)

    // Chờ hết một nhịp settle (mucsCol nạp xong + effect chạy) rồi khẳng định KHÔNG có dải nhắc —
    // dùng một mốc chắc chắn đã render xong (nút "Tạo bài mới" ở Trang chủ) thay vì chờ cố định.
    await screen.findByRole('button', { name: /Tạo bài mới/ })
    expect(screen.queryByText(/Đã lâu chưa sao lưu/)).toBeNull()
  }, HAN_GIO_MOUNT_APP_MS)
})

// Khoá localStorage mà markBackupDone() (src/lib/backupReminder.ts) ghi — kiểm TRỰC TIẾP khoá này
// (thay vì chỉ nhìn dải nhắc trên DOM) là tín hiệu đúng gốc rễ nhất cho I1: đây chính xác là tác
// dụng phụ mà `handleExport` phải NGỪNG gây ra khi lượt xuất không mang theo đủ nội dung `mucs`.
const KHOA_LAST_BACKUP = 'drtrong:lastBackupAt'

// Mount App() thật rồi bấm đúng nút "Đồng bộ dữ liệu" ở Trang chủ — không có đường tắt nào khác tới
// màn này. Cùng helper xuat-file-doc-tuoi.spec.tsx/DataSyncScreen-mucs.spec.tsx đã dùng.
async function moManDongBo() {
  const { default: App } = await import('../App')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Đồng bộ dữ liệu/ }))
  await screen.findByText('Đồng bộ dữ liệu', { selector: 'span' })
}

// Chờ ô thống kê "Bài viết & Sơ đồ" hiện ĐÚNG số `soLuong` — tín hiệu mucsCol (useIdbCollection cấp
// App) đã đọc XONG lượt đầu. Copy nguyên từ xuat-file-doc-tuoi.spec.tsx (chú thích đầy đủ ở đó).
async function choDemMucs(soLuong: number) {
  await waitFor(() => {
    const nhan = screen.getByText('Bài viết & Sơ đồ')
    expect(nhan.previousElementSibling?.textContent).toBe(String(soLuong))
  })
}

// Bấm "Xuất file sao lưu" rồi chờ dòng trạng thái kết thúc lượt xuất (thành công hoặc bị chặn).
// `createObjectURL`/`revokeObjectURL` phải được giả lập — happy-dom không có.
async function batXuatFile() {
  const gocCreate = URL.createObjectURL
  const gocRevoke = URL.revokeObjectURL
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:gia-lap-i1', configurable: true, writable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true, writable: true })
  try {
    fireEvent.click(screen.getByRole('button', { name: /Xuất file sao lưu/ }))
    await waitFor(() => expect(screen.getByText(/^(Đã xuất|Chưa xuất được)/)).toBeTruthy(), { timeout: HAN_GIO_XUAT_FILE_MS })
  } finally {
    Object.defineProperty(URL, 'createObjectURL', { value: gocCreate, configurable: true, writable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: gocRevoke, configurable: true, writable: true })
  }
}

// ─── I1 (final-review-findings.md) ─────────────────────────────────────────────────────────────
//
// Lỗi LIÊN-TASK: không task nào tự thấy được, vì hai task khác nhau chạm hai đầu của cùng một cơ
// chế. Task 5-8 làm `hasCustomContent` đếm cả kho `mucs` (describe phía trên) — mục đích: người
// dùng mà nội dung tự tạo DUY NHẤT là bài viết/sơ đồ cũng thấy dải nhắc. Task 9b/9c thêm hai lối
// thoát MỚI khi kho `mucs` đọc hỏng lúc xuất — "bỏ chọn ô Bài viết & Sơ đồ nếu chỉ cần sao lưu các
// mục còn lại" (App.tsx:3859, :3903, :3936) — nhưng `handleExport` vẫn gọi `markBackupDone()`/
// `onBackupDone()` VÔ ĐIỀU KIỆN sau MỌI lượt xuất thành công, kể cả khi ô đó đã bị bỏ chọn hoặc một
// số mục chỉ đọc được TÊN (`mucLoi`). Người dùng làm ĐÚNG như app khuyên → nhận một file KHÔNG có
// thứ đã kích hoạt lời nhắc → lời nhắc im 14 ngày dù `mucs` chưa từng thật sự được sao lưu.
describe('I1 (final-review-findings.md) — xuất thiếu mucs KHÔNG được đánh dấu đã sao lưu', () => {
  it('bỏ chọn ô "Bài viết & Sơ đồ" rồi xuất: markBackupDone() KHÔNG được chạy (mucs chưa có mặt trong file)', async () => {
    await idbPut(IDB_STORES.mucs, taoMucGia())
    expect(localStorage.getItem(KHOA_LAST_BACKUP)).toBeNull()

    await moManDongBo()
    await choDemMucs(1)

    const oTile = screen.getByText('Bài viết & Sơ đồ').closest('button')
    if (!oTile) throw new Error('không tìm thấy ô "Bài viết & Sơ đồ"')
    fireEvent.click(oTile)

    await batXuatFile()
    // Lượt xuất phải THÀNH CÔNG (không bị chặn) — nếu không, ca này không kiểm đúng nhánh I1 mô tả.
    expect(screen.getByText(/^Đã xuất/)).toBeTruthy()

    // KHẲNG ĐỊNH SAI trước bản vá: markBackupDone() ghi khoá này VÔ ĐIỀU KIỆN ngay sau lượt xuất
    // thành công, dù kho mucs (nội dung DUY NHẤT tính vào hasCustomContent ở describe trên) không
    // hề nằm trong file vừa xuất ra — người dùng làm ĐÚNG lời khuyên "bỏ chọn ô..." của app vẫn bị
    // lời nhắc tắt oan.
    expect(localStorage.getItem(KHOA_LAST_BACKUP)).toBeNull()
  }, HAN_GIO_MOUNT_APP_MS)

  it('một mục lỗi đọc nội dung lúc xuất (mucLoi): markBackupDone() KHÔNG được chạy', async () => {
    const muc = taoMucGia({ id: 'nhac-sao-luu-loi-doc' })
    idDocHongLucXuat = muc.id
    try {
      await idbPut(IDB_STORES.mucs, muc)
      expect(localStorage.getItem(KHOA_LAST_BACKUP)).toBeNull()

      await moManDongBo()
      await choDemMucs(1)

      // Ô "Bài viết & Sơ đồ" giữ nguyên trạng thái mặc định (đang chọn) — không bấm gì.
      await batXuatFile()
      // Xác nhận đã đi đúng nhánh mucLoi (mục chỉ còn TÊN) — không phải nhánh chặn cứng khác.
      expect(screen.getByText(/Chưa đọc được nội dung của/)).toBeTruthy()

      // KHẲNG ĐỊNH SAI trước bản vá — cùng lý do ca trên: mục duy nhất trong file "mucs" chỉ có
      // TÊN, không có nội dung, nhưng markBackupDone() vẫn ghi khoá này vô điều kiện.
      expect(localStorage.getItem(KHOA_LAST_BACKUP)).toBeNull()
    } finally {
      idDocHongLucXuat = null
    }
  }, HAN_GIO_MOUNT_APP_MS)

  // ─── Nhóm A (2026-09-06), khoản A6 — chiều DƯƠNG của I1 ────────────────────────────────────────
  //
  // Hai ca trên chỉ canh chiều ÂM (xuất thiếu/lỗi mucs ⇒ khoá phải NULL). Chưa ca nào khẳng định
  // TRỰC TIẾP bằng `localStorage` rằng một lượt xuất ĐẦY ĐỦ, KHÔNG lỗi, VẪN ghi
  // `drtrong:lastBackupAt` — điểm đó mới chỉ được xác minh bằng đọc mã (App.tsx:4002-4005,
  // `mucsDaSaoLuuDuTron = exportSelection["mucs"] !== false && mucLoi.length === 0`). Nếu sau này
  // ai sửa lại điều kiện đó (ví dụ đảo ngược, hoặc thêm một điều kiện luôn false) thì không có lưới
  // nào bắt được. Ca dưới đây KHÔNG bấm bỏ chọn ô "Bài viết & Sơ đồ" và KHÔNG giả lập mục đọc hỏng
  // — đi thẳng vào nhánh `mucsDaSaoLuuDuTron === true`.
  it('xuất ĐẦY ĐỦ, KHÔNG lỗi mucs: markBackupDone() PHẢI chạy — ghi drtrong:lastBackupAt', async () => {
    await idbPut(IDB_STORES.mucs, taoMucGia())
    expect(localStorage.getItem(KHOA_LAST_BACKUP)).toBeNull()

    await moManDongBo()
    await choDemMucs(1)

    // Không bấm gì: ô "Bài viết & Sơ đồ" giữ nguyên trạng thái mặc định (đang chọn), và
    // `idDocHongLucXuat` vẫn `null` (mặc định của tệp) — không mục nào đọc hỏng lúc xuất.
    await batXuatFile()
    // Lượt xuất phải THÀNH CÔNG — nếu không, ca này không kiểm đúng nhánh chiều DƯƠNG mô tả.
    expect(screen.getByText(/^Đã xuất/)).toBeTruthy()

    expect(localStorage.getItem(KHOA_LAST_BACKUP)).not.toBeNull()
  }, HAN_GIO_MOUNT_APP_MS)
})

// ─── I1 (review toàn nhánh 2026-09-09) — `handleExport` không có nhánh `catch` cấp hàm ─────────
//
// Đuôi hàm dựng file (App.tsx: `new Blob([JSON.stringify(payload…)])` → `URL.createObjectURL(blob)`
// → thẻ `<a>`) nằm CHÍNH GIỮA dòng tiến độ cuối ("Đang đọc nội dung N bài viết/sơ đồ…") và dòng
// báo thành công. `JSON.stringify` ném `RangeError` khi chuỗi vượt trần V8 — chuyện thật trên máy
// có kho ảnh base64 lớn — và `createObjectURL` cũng ném được. Trước bản vá, cả hai tầng `try` của
// hàm chỉ có `finally`, KHÔNG có `catch` nào: hai `finally` vẫn chạy (spinner tắt, khoá nhả), lời
// từ chối thoát ra khỏi handler `onClick` async mà React không bắt (`grep unhandledrejection src/`
// → 0 khớp), và `status` ĐỨNG NGUYÊN ở câu "Đang đọc nội dung…". Người dùng thấy nút ngừng quay,
// một dòng "đang chạy" không bao giờ kết thúc, và KHÔNG một chữ lỗi nào.
//
// Chính hàm này đã TỪ CHỐI chấp nhận đúng chế độ hỏng đó ở đường khác — xem `.catch()` quanh
// `import("./board/xuatNhapNoiDung")` và chú thích "Một promise bị từ chối ở đây thoát ra khỏi
// handler onClick mà không ai bắt" — nên đây là thiếu sót, không phải lựa chọn thiết kế.

/**
 * Biến thể của `batXuatFile` cho ca đuôi-ném: `URL.createObjectURL` NÉM thay vì trả blob URL, ép
 * đúng điểm hỏng ở đuôi hàm (rẻ hơn hẳn việc dựng một payload thật đủ lớn để `JSON.stringify` ném).
 *
 * KHÔNG chờ dòng trạng thái như `batXuatFile`: trước bản vá KHÔNG có dòng nào xuất hiện, chờ nó chỉ
 * cho một lượt hết giờ 30s vô nghĩa. Chờ NÚT Xuất trở lại trạng thái rảnh — tín hiệu cả hai
 * `finally` đã chạy xong — rồi mới soi `status`, nên ca ĐỎ chỉ ra ĐÚNG triệu chứng (màn hình còn
 * kẹt ở dòng tiến độ) thay vì một lỗi hết giờ mơ hồ.
 */
async function batXuatFileDuoiNem() {
  const gocCreate = URL.createObjectURL
  Object.defineProperty(URL, 'createObjectURL', {
    value: () => {
      throw new Error('giả lập: không dựng nổi blob URL cho file xuất (dữ liệu quá lớn)')
    },
    configurable: true,
    writable: true,
  })
  try {
    fireEvent.click(screen.getByRole('button', { name: /Xuất file sao lưu/ }))
    await waitFor(
      () => {
        const nut = screen.getByRole('button', { name: /Xuất file sao lưu/ }) as HTMLButtonElement
        expect(nut.disabled).toBe(false)
      },
      { timeout: HAN_GIO_XUAT_FILE_MS },
    )
  } finally {
    Object.defineProperty(URL, 'createObjectURL', { value: gocCreate, configurable: true, writable: true })
  }
}

describe('I1 (review toàn nhánh 2026-09-09) — đuôi dựng file NÉM thì phải BÁO, không kẹt im lặng', () => {
  it('createObjectURL ném: màn hình hiện lỗi "Chưa xuất được", không đứng ở dòng "Đang đọc nội dung…"', async () => {
    await idbPut(IDB_STORES.mucs, taoMucGia())
    expect(localStorage.getItem(KHOA_LAST_BACKUP)).toBeNull()

    await moManDongBo()
    await choDemMucs(1)

    await batXuatFileDuoiNem()

    // (1) Màn hình phải NÓI RA. Trước bản vá `status` còn nguyên câu tiến độ giữa chừng.
    expect(screen.queryByText(/Đang đọc nội dung/)).toBeNull()
    expect(screen.getByText(/^Chưa xuất được/)).toBeTruthy()

    // (2) Điều khoản I1 của vòng sửa trước (`5fc9ced`) còn NGUYÊN: một lượt xuất KHÔNG thành công
    // tuyệt đối không được tắt lời nhắc sao lưu 14 ngày. `markBackupDone()` đứng SAU đuôi ném, nên
    // bản vá phải để lượt hỏng NHẢY QUA nó — nếu ai đặt `catch` sai chỗ (bọc riêng đuôi rồi chạy
    // tiếp xuống dưới) thì khoá này sẽ có giá trị và ca đỏ ngay tại đây.
    expect(localStorage.getItem(KHOA_LAST_BACKUP)).toBeNull()
  }, HAN_GIO_MOUNT_APP_MS)
})
