// @vitest-environment happy-dom
//
// Task 9c, vòng sửa 1/5 (findings Important 3): nửa NỘI DUNG của "Hoàn tác" (`handleConfirmImport`,
// biến `mucTrenMay` — quyết định một id trong file nhập là "đã có trên máy" hay "file vừa thêm
// mới") vẫn dựng từ `customMucs` (bản sao có thể CŨ, App.tsx) trong khi nửa METADATA
// (`snapshot.mucs`, cùng hàm) đã được Task 9c chính sửa để dùng danh sách TƯƠI đọc thẳng từ
// IndexedDB. Hai nửa của CÙNG một lượt Hoàn tác LỆCH NGUỒN dữ liệu.
//
// Chuỗi thật: tạo mục X qua một instance `useIdbCollection<MucMeta>` KHÁC (LuoiMuc.tsx — App() cấp
// trên không hay biết cho tới khi tự đọc lại) → xuất/nhập lại một file VẪN MANG metadata + nội dung
// của X → vì X không có trong `customMucs` (bản sao cấp App, chụp lúc mount) nên bị xếp NHẦM là
// "mục file vừa thêm mới" → bấm Hoàn tác thì `xoaNoiDungBang` XOÁ nội dung CỦA CHÍNH X, trong khi nửa
// metadata (đã đúng nguồn, xem hoan-tac-khong-xoa-muc-moi.spec.tsx) lại khôi phục đúng dòng metadata
// của X — bài viết còn TÊN trong danh sách nhưng mở ra RỖNG.
//
// Ca dưới đây đi ĐƯỜNG THẬT (mount `<App/>`, `File` thật, bấm nút thật, ghi/đọc nội dung doc CRDT
// thật qua BlockSuite) — theo đúng khuôn `DataSyncScreen-hoan-tac-noi-dung.spec.tsx` của Task 4b,
// khác ở chỗ mục X được tạo qua idbPut TRỰC TIẾP (mô phỏng instance khác) SAU KHI App đã mount, đúng
// khuôn `hoan-tac-khong-xoa-muc-moi.spec.tsx` của chính Task 9c.
import 'fake-indexeddb/auto'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Text } from '@blocksuite/store'

import { IDB_STORES, idbDelete, idbGetAll, idbPut } from '../lib/idb'
import { taoHoacMoDoc } from '../board/mo-doc'
import { trichVanBanTuKhoi, type MucMeta } from '../board/mucMeta'
import { xoaNoiDungBang } from '../board/xoaNoiDungBang'
import { xuatSnapshotMuc } from '../board/xuatNhapNoiDung'

const HAN_GIO_MOUNT_APP_MS = 90000
const HAN_GIO_DONG_BO_MS = 40000

vi.mock('../board/index', () => ({ VoMuc: () => null }))

const ID_X = 'lech-nguon-muc-x'
const ID_TAM = 'lech-nguon-muc-tam'

function mucGia(id: string, ten: string): MucMeta {
  const bayGio = Date.now()
  return {
    id,
    loai: 'bai-viet',
    danhMuc: 'ecg',
    ten,
    taoLuc: bayGio,
    capNhatLuc: bayGio,
    chuyenKhoa: '',
    tags: [],
    noiDungTimKiem: '',
  }
}

/** Ghi một bài viết có nội dung `doan` vào doc của `id` — cùng khuôn DataSyncScreen-hoan-tac-noi-dung.spec.tsx. */
async function ghiNoiDung(id: string, doan: string[]): Promise<void> {
  const { workspace, store } = await taoHoacMoDoc(id, 'bai-viet')
  try {
    store.updateBlock(store.root!, { title: new Text(`Tiêu đề ${id}`) })
    const note = store.root!.children.find((k) => k.flavour === 'affine:note')!
    for (const d of doan) store.addBlock('affine:paragraph', { text: new Text(d) }, note.id)
    await workspace.waitForSynced()
  } finally {
    workspace.forceStop()
  }
}

/** Đọc lại toàn bộ chữ trong doc của `id`. CẢNH BÁO: tạo doc rỗng nếu id chưa có (taoHoacMoDoc). */
async function docNoiDung(id: string): Promise<string> {
  const { workspace, store } = await taoHoacMoDoc(id, 'bai-viet')
  try {
    return trichVanBanTuKhoi(store.root!)
  } finally {
    workspace.forceStop()
  }
}

/** Dựng khối `mucDocs[<idDich>]` cho file nhập bằng một doc TẠM — cùng khuôn spec anh em Task 4b. */
async function noiDungChoFile(doan: string[]): Promise<unknown> {
  await ghiNoiDung(ID_TAM, doan)
  const nd = await xuatSnapshotMuc(ID_TAM, 'bai-viet')
  expect(nd, 'phải chụp được nội dung mẫu để dựng file nhập').toBeTruthy()
  await xoaNoiDungBang([ID_TAM])
  return nd
}

afterEach(async () => {
  for (const m of await idbGetAll<{ id: string }>(IDB_STORES.mucs)) {
    await idbDelete(IDB_STORES.mucs, m.id)
  }
  await xoaNoiDungBang([ID_X, ID_TAM])
  localStorage.clear()
})

async function moManDongBo() {
  const { default: App } = await import('../App')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /Đồng bộ dữ liệu/ }))
  await screen.findByText('Đồng bộ dữ liệu', { selector: 'span' })
}

async function choDemMucs(soLuong: number) {
  await waitFor(() => {
    const nhan = screen.getByText('Bài viết & Sơ đồ')
    expect(nhan.previousElementSibling?.textContent).toBe(String(soLuong))
  })
}

async function nhapFile(noiDungFile: string) {
  const file = new File([noiDungFile], 'sao-luu-lech-nguon.json', { type: 'application/json' })
  const inputFile = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(inputFile, { target: { files: [file] } })
  fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhập' }))
}

async function bamHoanTac() {
  fireEvent.click(await screen.findByRole('button', { name: /Hoàn tác lần nhập vừa rồi/ }))
}

describe('[CỔNG] Hoàn tác không xoá nội dung của mục tạo qua instance khác rồi được xuất/nhập lại (Task 9c, Important 3)', () => {
  it('Mục X (tạo qua instance khác SAU khi App đã nạp) được nhập lại chính file mang nội dung của nó: Hoàn tác KHÔNG xoá nội dung của X', async () => {
    await moManDongBo()
    await choDemMucs(0)

    // ── Mô phỏng LuoiMuc.tsx tạo mục X qua instance RIÊNG của nó ─────────────────────────────
    // mucsCol cấp App (nguồn của `customMucs`) không hề hay biết lượt ghi này cho tới khi tự đọc
    // lại IndexedDB — đúng cơ chế lệch pha mà cả Task 9b lẫn Task 9c chính đã vá cho snapshot.
    await idbPut(IDB_STORES.mucs, mucGia(ID_X, 'X trên máy'))
    await ghiNoiDung(ID_X, ['NỘI DUNG BAN ĐẦU CỦA X — trước lượt nhập'])
    const vanBanBanDau = await docNoiDung(ID_X)
    expect(vanBanBanDau).toContain('NỘI DUNG BAN ĐẦU CỦA X')

    // ── File nhập MANG CẢ metadata lẫn nội dung của CHÍNH X (kịch bản "xuất rồi nhập lại") ─────
    const noiDungTuFile = await noiDungChoFile(['NỘI DUNG TỪ FILE — sau lượt nhập'])
    await nhapFile(
      JSON.stringify({
        app: 'drtrong',
        version: 2,
        data: {
          mucs: [mucGia(ID_X, 'X từ file')],
          mucDocs: { [ID_X]: noiDungTuFile },
        },
      }),
    )

    // ── Lượt nhập ĐÃ đè nội dung của X ───────────────────────────────────────────────────────
    await waitFor(() => expect(screen.getByText(/ghi xong nội dung 1\/1/)).toBeTruthy(), { timeout: HAN_GIO_DONG_BO_MS })
    expect(await docNoiDung(ID_X)).toContain('NỘI DUNG TỪ FILE')

    // ── Hoàn tác ─────────────────────────────────────────────────────────────────────────────
    await bamHoanTac()
    await waitFor(() => expect(screen.getByText(/Đã hoàn tác/)).toBeTruthy(), { timeout: HAN_GIO_DONG_BO_MS })

    // ← khẳng định ĐỎ hôm nay (trước bản vá): `mucTrenMay` dựng từ `customMucs` (rỗng lúc mount,
    // không có X) nên X bị xếp NHẦM là "mục file vừa thêm mới" — `xoaNoiDungBang([X])` xoá sạch
    // nội dung vừa ghi, và `docNoiDung(ID_X)` (tạo doc RỖNG nếu không còn bản ghi) trả về chuỗi
    // KHÔNG chứa "NỘI DUNG BAN ĐẦU CỦA X" — bài viết còn tên trong danh sách nhưng mở ra RỖNG.
    const vanBanSauHoanTac = await docNoiDung(ID_X)
    expect(vanBanSauHoanTac, 'nội dung BAN ĐẦU của X phải trở lại, không bị xoá').toContain('NỘI DUNG BAN ĐẦU CỦA X')
    expect(vanBanSauHoanTac).not.toContain('NỘI DUNG TỪ FILE')

    // Nửa metadata: X vẫn phải còn trong lưới (đã đúng từ Task 9c chính — ghim lại ở đây để thấy
    // rõ hai nửa nay CÙNG kết luận "X là mục ĐÃ CÓ", không lệch nhau nữa).
    const meta = await idbGetAll<MucMeta>(IDB_STORES.mucs)
    expect(meta.find((m) => m.id === ID_X)?.ten).toBe('X trên máy')

    // Câu trạng thái phải nói ĐÚNG SỰ THẬT: X không phải "mục file vừa thêm mới", nên câu "Đã gỡ
    // nội dung của N mục..." không được xuất hiện; thay vào đó câu "Nội dung cũ ... đã trở lại"
    // phải xuất hiện (X được xếp đúng vào nhóm "đã có trên máy").
    expect(screen.getByText(/Nội dung cũ của 1 bài viết\/sơ đồ đã trở lại/)).toBeTruthy()
    expect(screen.queryByText(/Đã gỡ nội dung của.*mục mà file vừa thêm mới/)).toBeNull()
  }, HAN_GIO_MOUNT_APP_MS)
})
