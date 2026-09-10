/**
 * Mẫu nhập thuốc vận mạch (Vasoactives)
 *
 * Thuốc co mạch / tăng huyết áp, dùng qua bơm tiêm điện (BTĐ)
 * Ví dụ: Noradrenaline, Phenylephrine, Vasopressin
 */

import type { InfusionDrug } from './types'

const noradrenaline: InfusionDrug = {
  id: 'sample-noradrenaline',
  name: 'Noradrenaline (Norepinephrine)',
  route: 'TTM qua BTĐ, bắt buộc tĩnh mạch trung tâm',
  preparation: 'Pha 4 mg (1 ống) với Glucose 5% vừa đủ 50 mL (nồng độ 80 mcg/mL)',
  doseRange: '0,05–2 mcg/kg/phút, chỉnh liều theo huyết áp mục tiêu',
  note: 'Thuốc co mạch mạnh nhất; bắt buộc tĩnh mạch trung tâm',

  warnings: [
    { text: 'TUYỆT ĐỐI tĩnh mạch trung tâm; thoát mạch gây hoại tử mô', severity: 'cao' },
    { text: 'Loạn nhịp, tăng huyết áp quá mức, thiếu máu ngoại biên', severity: 'cao' },
  ],

  calc: {
    weightBased: true,
    doseUnit: 'mcg/kg/phút',
    doseMin: 0.05,
    doseMax: 2,
    doseAbsMax: 3,
    concUnit: 'mg/mL',
    concDefault: 0.08,
    unitScale: 1000,
    mix: {
      vialAmount: 4,
      vialUnit: 'mg',
      vialLabel: 'ống',
      vials: 1,
      volumeMl: 50,
      vialVolumeMl: 5,
      diluents: ['Glucose 5%'],
      avoidDiluents: ['NaCl 0,9%'],
      diluentWarning: 'Chỉ pha trong Glucose 5%; tuyệt đối không NaCl 0,9% — sẽ kết tủa',
      maxPeripheralConc: 0.08,
      stability: 'Dùng trong 4 giờ, để dưới 25°C, tránh ánh sáng. Bỏ nếu đổi màu.',
    },
  },

  compatKey: 'noradrenaline',
  source: 'UpToDate 2024 / Surviving Sepsis Campaign',
  reviewedOn: '2026-08',
}

const phenylephrine: InfusionDrug = {
  id: 'sample-phenylephrine',
  name: 'Phenylephrine',
  route: 'TTM qua BTĐ, ưu tiên tĩnh mạch trung tâm',
  preparation: 'Pha 10 mg với Glucose 5% hoặc NaCl 0,9% vừa đủ 50 mL (nồng độ 200 mcg/mL)',
  doseRange: '0,5–1,4 mcg/kg/phút, chỉnh theo huyết áp',
  note: 'Thuốc co mạch thuần (α1 only) — không hỗ trợ tim, gây giảm tim',

  warnings: [
    { text: 'Giảm tần số tim (bradycardia) do phản xạ huyết áp tăng', severity: 'trung bình' },
    { text: 'Thoát mạch gây hoại tử — cần đường truyền chắc chắn', severity: 'cao' },
  ],

  calc: {
    weightBased: true,
    doseUnit: 'mcg/kg/phút',
    doseMin: 0.5,
    doseMax: 1.4,
    doseAbsMax: 2,
    concUnit: 'mg/mL',
    concDefault: 0.2,
    unitScale: 1000,
    mix: {
      vialAmount: 10,
      vialUnit: 'mg',
      vialLabel: 'ống',
      vials: 1,
      volumeMl: 50,
      vialVolumeMl: 10,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      maxPeripheralConc: 0.2,
      stability: 'Dùng trong 24 giờ. Bỏ nếu kết tủa hoặc đổi màu.',
    },
  },

  compatKey: 'phenylephrine',
  source: 'UpToDate 2024',
  reviewedOn: '2026-08',
}

export const sampleVasoactives: InfusionDrug[] = [noradrenaline, phenylephrine]
export default sampleVasoactives
