// Hai ngưỡng béo phì của app phải TÁCH HẲN nhau (Chợ Rẫy 2024):
//   • liều mg/kg    → ABW ≥ 120% IBW
//   • ước tính CrCl → BMI > 30 kg/m²
// Trước 2026-09-10 cả hai dùng chung một ngưỡng 130% IBW. Bộ ca kiểm này tồn tại để lần gộp lại đó
// không thể xảy ra im lặng lần nữa: mỗi ca đánh dấu "ca chứng minh" bên dưới phải ĐỎ nếu khôi phục
// ngưỡng cũ — đã xác nhận bằng cách gỡ vá rồi chạy lại, không chỉ chạy xanh một lượt.

import { describe, expect, it } from 'vitest'
import {
  CRCL_BMI_THRESHOLD,
  OBESITY_IBW_RATIO,
  computeBMI,
  computeIBW,
  resolveCrClWeight,
  resolveDosingWeight,
} from '../bodyWeight'
import { ANTIBIOTICS } from '../../data/antibiotics'

// Nam cao 152 cm ⇒ IBW = 50 + 0.9 × 0 = 50 kg đúng chẵn. Chọn mốc này để mọi ngưỡng thành số tròn
// (120% = 60 kg, 130% = 65 kg) — ca kiểm không phụ thuộc sai số dấu phẩy động.
const CAO_152 = 152
const IBW_152 = 50

describe('mốc dữ liệu dùng trong bộ ca kiểm', () => {
  it('IBW nam 152 cm đúng 50 kg', () => {
    expect(computeIBW(CAO_152, 'male')).toBe(IBW_152)
  })

  it('hai hằng ngưỡng đúng theo Chợ Rẫy 2024', () => {
    expect(OBESITY_IBW_RATIO).toBe(1.2)
    expect(CRCL_BMI_THRESHOLD).toBe(30)
  })
})

describe('liều mg/kg — ngưỡng 120% IBW', () => {
  it('ABW dưới 120% IBW thì tính theo cân nặng thực', () => {
    const r = resolveDosingWeight(59, CAO_152, 'male', 'adjusted')
    expect(r.usedLabel).toBe('ABW')
    expect(r.used).toBe(59)
  })

  // Mốc nằm ĐÚNG ở 120%: "≥ 20% trên IBW" nghĩa là 60 kg đã phải chuyển sang AdjBW.
  it('ABW đúng 120% IBW đã chuyển sang AdjBW', () => {
    const r = resolveDosingWeight(60, CAO_152, 'male', 'adjusted')
    expect(r.usedLabel).toBe('AdjBW')
    expect(r.used).toBeCloseTo(50 + 0.4 * 10, 6)
  })

  // Ca chứng minh: 63 kg = 126% IBW. Ngưỡng CŨ (130%) trả ABW, ngưỡng MỚI trả AdjBW.
  it('ABW 126% IBW dùng AdjBW (ngưỡng cũ 130% sẽ trả ABW)', () => {
    const r = resolveDosingWeight(63, CAO_152, 'male', 'adjusted')
    expect(r.usedLabel).toBe('AdjBW')
    expect(r.used).toBeCloseTo(50 + 0.4 * 13, 6)
  })

  it('basis "actual" (vancomycin) giữ cân nặng thực kể cả khi béo phì', () => {
    const r = resolveDosingWeight(90, CAO_152, 'male', 'actual')
    expect(r.usedLabel).toBe('ABW')
    expect(r.used).toBe(90)
  })

  it('basis "ideal" không bị ngưỡng béo phì đụng tới', () => {
    const r = resolveDosingWeight(90, CAO_152, 'male', 'ideal')
    expect(r.usedLabel).toBe('IBW')
    expect(r.used).toBe(IBW_152)
  })
})

describe('CrCl — ngưỡng BMI > 30, KHÔNG phải %IBW', () => {
  it('BMI dưới 30 dùng cân nặng thực', () => {
    // 65 kg / 1.52² = 28.1 kg/m²
    const r = resolveCrClWeight(65, CAO_152, 'male')
    expect(computeBMI(65, CAO_152) as number).toBeLessThan(CRCL_BMI_THRESHOLD)
    expect(r.usedLabel).toBe('ABW')
    expect(r.used).toBe(65)
  })

  it('BMI trên 30 dùng cân nặng hiệu chỉnh', () => {
    // 75 kg / 1.52² = 32.5 kg/m²
    const r = resolveCrClWeight(75, CAO_152, 'male')
    expect(computeBMI(75, CAO_152) as number).toBeGreaterThan(CRCL_BMI_THRESHOLD)
    expect(r.usedLabel).toBe('AdjBW')
    expect(r.used).toBeCloseTo(50 + 0.4 * 25, 6)
  })

  // Ca chứng minh: 68 kg trên 152 cm = 136% IBW (quy tắc cũ ⇒ AdjBW 57.2 kg, CrCl thấp giả) nhưng
  // BMI chỉ 29.4 (quy tắc mới ⇒ ABW 68 kg). Gỡ vá là ca này đỏ.
  it('ABW trên 130% IBW nhưng BMI ≤ 30 vẫn dùng cân nặng thực', () => {
    const bmi = computeBMI(68, CAO_152)
    expect(bmi).not.toBeNull()
    expect(bmi as number).toBeLessThan(CRCL_BMI_THRESHOLD)
    expect(68).toBeGreaterThan(1.3 * IBW_152)

    const r = resolveCrClWeight(68, CAO_152, 'male')
    expect(r.usedLabel).toBe('ABW')
    expect(r.used).toBe(68)
  })

  // Cùng MỘT bệnh nhân, hai câu trả lời khác nhau — đúng như thiết kế, không phải mâu thuẫn.
  it('cùng bệnh nhân: CrCl dùng ABW trong khi liều aminoglycosid dùng AdjBW', () => {
    expect(resolveCrClWeight(68, CAO_152, 'male').usedLabel).toBe('ABW')
    expect(resolveDosingWeight(68, CAO_152, 'male', 'adjusted').usedLabel).toBe('AdjBW')
  })

  it('thiếu chiều cao thì không có BMI — rơi về ABW và bật cờ nhắc nhập chiều cao', () => {
    const r = resolveCrClWeight(68, null, 'male')
    expect(r.bmi).toBeNull()
    expect(r.usedLabel).toBe('ABW')
    expect(r.used).toBe(68)
    expect(r.heightMissingForBasis).toBe(true)
  })

  it('chưa nhập cân nặng thì không trả về con số nào', () => {
    const r = resolveCrClWeight(null, CAO_152, 'male')
    expect(r.used).toBeNull()
    expect(r.usedLabel).toBeNull()
  })

  it('trả kèm BMI để màn hình giải thích được vì sao chọn AdjBW', () => {
    expect(resolveCrClWeight(75, CAO_152, 'male').bmi).toBeCloseTo(75 / 1.52 ** 2, 6)
  })
})

describe('dữ liệu kháng sinh khớp quy tắc', () => {
  function thuoc(id: string) {
    const t = ANTIBIOTICS.find((a) => a.id === id)
    if (!t) throw new Error(`Không tìm thấy kháng sinh id "${id}" — đổi id thì phải sửa ca kiểm này.`)
    return t
  }

  // Amikacin từng khai "actual" trong khi gentamicin cùng nhóm khai "adjusted" — cùng cơ chế độc
  // thận/tai mà tính theo hai loại cân nặng khác nhau.
  it.each([
    ['Amikacin-iv', 'adjusted'],
    ['gentamicin-iv', 'adjusted'],
  ])('aminoglycosid %s dùng cân nặng hiệu chỉnh khi béo phì', (id, basis) => {
    expect(thuoc(id).doseWeightBasis).toBe(basis)
  })

  it('vancomycin giữ cân nặng thực kể cả khi béo phì', () => {
    expect(thuoc('vancomycin-iv').doseWeightBasis).toBe('actual')
  })
})
