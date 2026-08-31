// @vitest-environment happy-dom
//
// Ảnh dán vào bảng nằm ở hai DB RIÊNG (`drtrong-board_blob`, `_blob_mime`) và đánh khoá theo BĂM
// NỘI DUNG ẢNH, không theo id bảng — nên xoá bảng xong không có gì cho biết ảnh nào đã mồ côi.
//
// Phép quyết định ở đây KHÔNG giải mã schema BlockSuite: khối ảnh tham chiếu blob bằng
// `prop:sourceId`, mà giá trị đó là một CHUỖI ASCII được Yjs ghi nguyên văn (varint độ dài + UTF-8)
// vào update. Nên "khoá blob không xuất hiện trong byte của BẤT KỲ doc nào còn lại" là bằng chứng
// đủ để kết luận mồ côi — không phụ thuộc tên trường, không phụ thuộc phiên bản schema.
//
// Hướng sai lệch chọn có chủ đích: quét THỪA thì giữ lại một blob đáng xoá (rò vài KB), quét THIẾU
// thì xoá mất ảnh của bảng đang sống (mất dữ liệu vĩnh viễn). Mọi ca mập mờ đều nghiêng về GIỮ.
import { describe, expect, it, vi } from 'vitest'

import { donRacBlobBang } from '../xoaNoiDungBang'

/** Giả lập cách Yjs nhúng chuỗi: nội dung ASCII nằm nguyên văn giữa các byte khác. */
function updateChua(...chuoi: string[]): Uint8Array {
  const s = `${chuoi.join(' ')}`
  return Uint8Array.from([...s].map((c) => c.charCodeAt(0)))
}

describe('donRacBlobBang — xoá blob không còn bảng nào tham chiếu', () => {
  it('blob còn được một doc nhắc tới thì GIỮ', async () => {
    const daXoa: string[] = []
    await donRacBlobBang({
      docTatCaDoc: async () => [updateChua('anh-con-dung')],
      danhSachBlob: async () => ['anh-con-dung'],
      xoaBlob: async (k) => void daXoa.push(k),
    })
    expect(daXoa).toEqual([])
  })

  it('blob không doc nào nhắc tới thì XOÁ', async () => {
    const daXoa: string[] = []
    const kq = await donRacBlobBang({
      docTatCaDoc: async () => [updateChua('anh-con-dung')],
      danhSachBlob: async () => ['anh-con-dung', 'anh-mo-coi'],
      xoaBlob: async (k) => void daXoa.push(k),
    })
    expect(daXoa).toEqual(['anh-mo-coi'])
    expect(kq).toEqual({ daXoa: 1 })
  })

  it('quét HẾT mọi doc, không dừng ở doc đầu tiên', async () => {
    const daXoa: string[] = []
    await donRacBlobBang({
      docTatCaDoc: async () => [updateChua('khac'), updateChua('anh-o-doc-hai')],
      danhSachBlob: async () => ['anh-o-doc-hai'],
      xoaBlob: async (k) => void daXoa.push(k),
    })
    expect(daXoa).toEqual([])
  })

  it('đọc doc HỎNG thì không xoá gì cả — thà rò còn hơn mất ảnh của bảng đang sống', async () => {
    const canh = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const daXoa: string[] = []
    const kq = await donRacBlobBang({
      docTatCaDoc: async () => {
        throw new Error('đọc doc hỏng')
      },
      danhSachBlob: async () => ['bat-ky'],
      xoaBlob: async (k) => void daXoa.push(k),
    })
    expect(daXoa).toEqual([])
    expect(kq).toBeNull()
    expect(canh).toHaveBeenCalled()
    canh.mockRestore()
  })

  it('không có blob nào thì không đọc doc, không xoá', async () => {
    const docTatCaDoc = vi.fn()
    const kq = await donRacBlobBang({
      docTatCaDoc,
      danhSachBlob: async () => [],
      xoaBlob: async () => {},
    })
    expect(docTatCaDoc).not.toHaveBeenCalled()
    expect(kq).toEqual({ daXoa: 0 })
  })

  it('không còn doc nào (đã xoá sạch bảng) thì mọi blob đều mồ côi', async () => {
    const daXoa: string[] = []
    await donRacBlobBang({
      docTatCaDoc: async () => [],
      danhSachBlob: async () => ['a', 'b'],
      xoaBlob: async (k) => void daXoa.push(k),
    })
    expect(daXoa).toEqual(['a', 'b'])
  })

  it('khoá blob nằm SÁT byte khác vẫn nhận ra — không đòi ranh giới sạch', async () => {
    // Yjs ghi varint độ dài NGAY TRƯỚC chuỗi, nên khoá không bao giờ có khoảng trắng bao quanh.
    const daXoa: string[] = []
    const byte = Uint8Array.from([0x7f, 0x24, 'k'.charCodeAt(0), '1'.charCodeAt(0), 0x01])
    await donRacBlobBang({
      docTatCaDoc: async () => [byte],
      danhSachBlob: async () => ['k1'],
      xoaBlob: async (k) => void daXoa.push(k),
    })
    expect(daXoa).toEqual([])
  })
})
