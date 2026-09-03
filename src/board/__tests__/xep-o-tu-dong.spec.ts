// Canh `viTriMoiChoO` — bản vá lớp app cho lỗi nút "+" của ô ghi chú (xem chú thích đầu
// `src/board/xep-o-tu-dong.ts`).
//
// MỌI CON SỐ DƯỚI ĐÂY LÀ SỐ ĐO THẬT, lấy từ `public/static/templates/dongnao/swot.json` và từ hai
// lần bấm "+" tái hiện trên trình duyệt ngày 2026-09-03. Không có số nào bịa ra: đó là điều làm cho
// bài này chứng minh được đúng cái người dùng đã thấy.
import { describe, expect, it } from 'vitest'

import { type Hop, timONguon, viTriMoiChoO } from '../xep-o-tu-dong'

const W = 364
const H = 120.33491224963538

/** Ô ghi chú của mẫu SWOT ở đúng kích thước thật. */
const o = (x: number, y: number): Hop => ({ x, y, w: W, h: H })

// Bốn ô ma trận, nguyên văn từ swot.json.
const O_DIEM_MANH: Hop = { x: 35, y: -164, w: 1377, h: 956 }
const O_DIEM_YEU: Hop = { x: 1522, y: -164, w: 1377, h: 956 }
const O_CO_HOI: Hop = { x: 35, y: 889, w: 1377, h: 956 }
const O_NGUY_CO: Hop = { x: 1517, y: 889, w: 1377, h: 956 }
const HINH = [O_DIEM_MANH, O_DIEM_YEU, O_CO_HOI, O_NGUY_CO]

// Cột của lưới SWOT: 104,206 + k × 435,884.
const BUOC_COT = 435.88433073034605
const COT = [104.20642280085835, 540.0907535312044, 975.9750842615504]
// Hàng của ô "Cơ hội": 1113,122 + k × 193,354.
const BUOC_HANG = 193.35442023603796
const HANG_CO_HOI = [1113.121613125235, 1306.476033361273]
const HANG_DIEM_MANH = 36.41497938399458

describe('viTriMoiChoO — xếp ô do nút "+" tạo ra', () => {
  it('ô mới đè lên ô kế bên → dời sang cột trống tiếp theo cùng hàng', () => {
    // Tái hiện thật: "Điểm mạnh" có 2 ô; bấm "+" phải của ô 1 (x = 104,206) thì thượng nguồn đặt ô
    // mới ở 104,206 + 364 + 100 = 568,206 — đè lên ô 2 đang ở 540,091.
    const daCo = [o(COT[0], HANG_DIEM_MANH), o(COT[1], HANG_DIEM_MANH)]
    const moi = o(COT[0] + W + 100, HANG_DIEM_MANH)

    const ra = viTriMoiChoO(moi, daCo, HINH)
    expect(ra).not.toBeNull()
    expect(ra?.x).toBeCloseTo(COT[2], 3)
    expect(ra?.y).toBeCloseTo(HANG_DIEM_MANH, 3)
  })

  it('hàng đã đầy → XUỐNG HÀNG chứ không chui ra ngoài khung', () => {
    // Tái hiện thật: "Cơ hội" có 3 ô hàng trên + 1 ô hàng dưới; bấm "+" phải của ô thứ 3
    // (x = 975,975) thì thượng nguồn đặt ô mới ở 1439,975 — quá mép phải khung (1412) và đè lên ô
    // của "Nguy cơ" ở 1593,572.
    const daCo = [
      o(COT[0], HANG_CO_HOI[0]),
      o(COT[1], HANG_CO_HOI[0]),
      o(COT[2], HANG_CO_HOI[0]),
      o(COT[0], HANG_CO_HOI[1]),
      o(1593.5720447261835, HANG_CO_HOI[0]), // ô của "Nguy cơ"
    ]
    const moi = o(COT[2] + W + 100, HANG_CO_HOI[0])

    const ra = viTriMoiChoO(moi, daCo, HINH)
    expect(ra).not.toBeNull()
    // Cột 0 hàng 2 đã có ô → phải rơi vào cột 1 hàng 2.
    expect(ra?.x).toBeCloseTo(COT[1], 3)
    expect(ra?.y).toBeCloseTo(HANG_CO_HOI[1], 3)
    // Và phải nằm gọn trong "Cơ hội".
    expect((ra?.x ?? 0) + W).toBeLessThanOrEqual(O_CO_HOI.x + O_CO_HOI.w)
  })

  it('khung đầy → nối thêm hàng mới bên dưới, vẫn bắt đầu từ cột trái', () => {
    // "Cơ hội" cao 956, bước hàng 193,354 → đúng BỐN hàng nằm trọn trong khung (hàng 4 bắt đầu ở
    // 1886,5 và chạm 2006,9, quá đáy 1845). Lấp kín 4 × 3 rồi bấm "+" ở ô cuối.
    const daCo: Hop[] = []
    for (let hang = 0; hang < 4; hang += 1) {
      for (let cot = 0; cot < 3; cot += 1) {
        daCo.push(o(COT[cot], HANG_CO_HOI[0] + hang * BUOC_HANG))
      }
    }
    const cuoi = daCo[daCo.length - 1]
    const ra = viTriMoiChoO(o(cuoi.x + W + 100, cuoi.y), daCo, HINH)

    expect(ra).not.toBeNull()
    expect(ra?.x).toBeCloseTo(COT[0], 3)
    expect(ra?.y).toBeCloseTo(HANG_CO_HOI[0] + 4 * BUOC_HANG, 3)
  })

  it('bấm "+" khi chỗ theo hướng đó còn trống thì TÔN TRỌNG hướng người dùng chọn', () => {
    // Hàng trên của "Cơ hội" đủ 2 ô để suy ra bước lưới 435,884; cột 3 còn trống.
    const daCo = [o(COT[0], HANG_CO_HOI[0]), o(COT[1], HANG_CO_HOI[0])]
    const ra = viTriMoiChoO(o(COT[1] + W + 100, HANG_CO_HOI[0]), daCo, HINH)
    expect(ra).not.toBeNull()
    expect(ra?.x).toBeCloseTo(COT[2], 3)
    expect(ra?.y).toBeCloseTo(HANG_CO_HOI[0], 3)
  })

  it('KHÔNG đụng vào ô không phải do nút "+" tạo ra — kể cả khi nó đè lên ô khác', () => {
    // Đây là ca chặn hồi quy quan trọng nhất: thả mẫu SWOT lần thứ hai chồng lên lần thứ nhất thì
    // 21 ô đều đè nhau, nhưng KHÔNG ô nào cách ô khác đúng `w + 100`, nên không ô nào bị xô đi.
    const daCo = [o(COT[0], HANG_DIEM_MANH), o(COT[1], HANG_DIEM_MANH)]
    expect(viTriMoiChoO(o(COT[0] + 12, HANG_DIEM_MANH), daCo, HINH)).toBeNull()
    expect(viTriMoiChoO(o(COT[1], HANG_DIEM_MANH), daCo, HINH)).toBeNull()
    // Bước lưới thật của mẫu (435,884) khác hẳn `w + 100` = 464 → không bắt nhầm.
    expect(BUOC_COT).not.toBeCloseTo(W + 100, 1)
    expect(timONguon(o(COT[2], HANG_DIEM_MANH), daCo)).toBeNull()
  })

  it('bảng đã dính ô lạc từ lỗi cũ vẫn suy ra đúng bước lưới', () => {
    // Đo thật 2026-09-03 trên bảng thử: một ô lạc do lỗi cũ nằm ở 568,2 — cách ô 540,1 đúng 28,1.
    // Nếu coi 28,1 là bước lưới thì mọi phép xếp sau đó sai hết. Bước lưới phải là 435,884.
    const daCo = [
      o(COT[0], HANG_DIEM_MANH),
      o(COT[1], HANG_DIEM_MANH),
      o(COT[0] + W + 100, HANG_DIEM_MANH), // ô lạc còn sót từ trước bản vá
    ]
    const ra = viTriMoiChoO(o(COT[0] + W + 100, HANG_DIEM_MANH), daCo, HINH)
    expect(ra).not.toBeNull()
    expect(ra?.x).toBeCloseTo(COT[2], 3)
    expect(ra?.y).toBeCloseTo(HANG_DIEM_MANH, 3)
  })

  it('ô nguồn không nằm trong khung nào → chỉ tránh đè, không bịa ra lưới', () => {
    const daCo = [o(-5000, 0), o(-5000 + W + 100, 0)]
    const moi = o(-5000 + W + 100, 0) // đúng chỗ thượng nguồn đặt, và đang đè lên ô thứ hai
    const ra = viTriMoiChoO(moi, daCo, [])
    expect(ra).not.toBeNull()
    expect(ra?.x).toBeCloseTo(-5000 + 2 * (W + 100), 3)
    expect(ra?.y).toBeCloseTo(0, 3)
  })

  it('không có ô nào để bám → trả null, để nguyên hành vi thượng nguồn', () => {
    expect(viTriMoiChoO(o(0, 0), [], HINH)).toBeNull()
  })
})
