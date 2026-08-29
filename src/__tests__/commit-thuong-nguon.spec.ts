// Cổng D11 so cây vendored với một checkout AFFiNE trên đĩa. Nếu checkout đó ở một commit KHÁC bản
// mà cây vendored được pin, cổng đổ ra hàng chục dòng `LỆCH:` — một triệu chứng không tự giải thích.
//
// Đã xảy ra thật (2026-08-29): ai đó clone lại AFFiNE, checkout mới rơi vào `canary` mới nhất, và
// cổng in 84 dòng LỆCH. Mất một lượt điều tra mới ra kết luận "cây vendored KHÔNG hỏng, thượng
// nguồn nhảy" — và đó là lượt điều tra sẽ phải lặp lại y hệt ở lần sau nếu không có gì nói ra.
//
// Hàm thuần ở đây biến triệu chứng đó thành một câu tự giải thích kèm lệnh sửa. Tách khỏi
// `kiem-vendor.mjs` cùng lý do đã ghi ở `tom-tat-doi-chieu.mjs`: hàm thuần dựng được mọi tổ hợp mà
// không cần một checkout git thật trên đĩa.
import { describe, expect, it } from 'vitest'

import { doiChieuCommitThuongNguon } from '../../scripts/doi-chieu-commit-thuong-nguon.mjs'

const PIN = '0c7b20dc18759dc63adbd93df491eba556baa6fe'

describe('đối chiếu commit thượng nguồn', () => {
  it('khớp → không cảnh báo gì', () => {
    const kq = doiChieuCommitThuongNguon({ pin: PIN, thucTe: PIN })
    expect(kq.khop).toBe(true)
    expect(kq.canhBao).toBe('')
  })

  it('lệch → nói RÕ cây vendored không hỏng, và nêu lệnh sửa DÁN LÀ CHẠY', () => {
    const kq = doiChieuCommitThuongNguon({
      pin: PIN,
      thucTe: '4953682779abcdef0123456789abcdef01234567',
      duongDan: 'C:/Users/ai-do/Downloads/AFFiNE/blocksuite',
    })
    expect(kq.khop).toBe(false)
    // Câu quan trọng nhất: đọc xong phải biết KHÔNG phải cây vendored hỏng.
    expect(kq.canhBao).toContain('không phải cây vendored hỏng')
    // Cả hai SHA rút gọn phải có mặt — thiếu một thì không tự kiểm chứng được.
    expect(kq.canhBao).toContain(PIN.slice(0, 10))
    expect(kq.canhBao).toContain('4953682779')
    // Lệnh sửa phải DÁN LÀ CHẠY: đường dẫn thật, không phải placeholder người đọc phải tự điền.
    // Cổng biết chính xác nó đang so với checkout nào — bắt người đọc điền lại là vứt đi một dữ
    // kiện đã có sẵn, đúng lúc họ đang bối rối vì 84 dòng LỆCH.
    expect(kq.canhBao).toContain(`checkout --detach ${PIN}`)
    expect(kq.canhBao).toContain('C:/Users/ai-do/Downloads/AFFiNE')
    expect(kq.canhBao).not.toContain('<')
  })

  it('trỏ ĐÚNG tên file cần cập nhật khi nâng cây vendored', () => {
    // Bản viết đầu của cảnh báo này trỏ tới `src/vendor/blocksuite/COMMIT-THUONG-NGUON` trong khi
    // file thật nằm ở gốc repo tên `commit-thuong-nguon.txt` — bắt được lúc chạy cổng thật. Một
    // thông điệp lỗi trỏ sai chỗ còn tệ hơn không có: nó tiêu tốn đúng thứ nó hứa tiết kiệm.
    // File CỐ Ý không nằm trong `src/vendor/blocksuite/`: cây đó bị cổng duyệt và mọi `.ts`/`.json`
    // trong đó đều bị so với thượng nguồn, nên một file không có ở thượng nguồn sẽ làm bẩn chính
    // cổng nó sinh ra để giúp.
    const kq = doiChieuCommitThuongNguon({ pin: PIN, thucTe: 'a'.repeat(40), duongDan: '/x' })
    expect(kq.canhBao).toContain('commit-thuong-nguon.txt')
    expect(kq.canhBao).not.toContain('src/vendor/blocksuite/COMMIT-THUONG-NGUON')
  })

  it('không biết commit thực tế (không phải repo git, hoặc lệnh git lỗi) → im lặng, không đoán', () => {
    // Trạng thái này KHÔNG được phép làm đỏ hay ồn: cổng vẫn còn phép so nguyên văn của chính nó,
    // và một cảnh báo dựa trên dữ kiện không có là tệ hơn im lặng.
    for (const thucTe of [null, undefined, '']) {
      const kq = doiChieuCommitThuongNguon({ pin: PIN, thucTe })
      expect(kq.khop).toBe(true)
      expect(kq.canhBao).toBe('')
    }
  })

  it('chưa pin commit nào → im lặng, không ép dự án phải khai', () => {
    const kq = doiChieuCommitThuongNguon({ pin: '', thucTe: PIN })
    expect(kq.khop).toBe(true)
    expect(kq.canhBao).toBe('')
  })

  it('so ĐẦY ĐỦ 40 ký tự, không chỉ tiền tố — hai commit khác nhau có thể trùng 10 ký tự đầu', () => {
    const gan = PIN.slice(0, 10) + 'ffffffffffffffffffffffffffffff'
    expect(doiChieuCommitThuongNguon({ pin: PIN, thucTe: gan }).khop).toBe(false)
  })
})
