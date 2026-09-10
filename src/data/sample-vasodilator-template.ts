/**
 * Mẫu nhập thuốc giãn mạch (Vasodilators)
 *
 * Thuốc giãn mạch ngoại biên / phổi, dùng qua bơm tiêm điện (BTĐ)
 * Ví dụ: Nitroglycerin, Nicardipine, Hydralazine
 */

import type { InfusionDrug } from './types'

const nitroglycerin: InfusionDrug = {
  id: 'sample-nitroglycerin',
  name: 'Nitroglycerin (GTN)',
  route: 'TTM qua BTĐ hoặc truyền chậm',
  preparation: 'Pha 50 mg với Glucose 5% hoặc NaCl 0,9% vừa đủ 50 mL (nồng độ 1.000 mcg/mL)',
  doseRange: 'Khởi đầu 5 mcg/phút, tăng 5 mcg/phút mỗi 3–5 phút đến 400 mcg/phút',
  note: 'Giãn tĩnh mạch chủ yếu; dùng trong cơn đau thắt ngực hoặc phù phổi cấp',

  warnings: [
    { text: 'Tăng dung nợ — có thể gây tụt huyết áp; theo dõi huyết áp liên tục', severity: 'cao' },
    { text: 'Dung nạp (tolerance) có thể phát triển sau vài giờ dùng liên tục', severity: 'trung bình' },
  ],

  calc: {
    weightBased: false,
    doseUnit: 'mcg/phút',
    doseMin: 5,
    doseMax: 400,
    doseAbsMax: 500,
    concUnit: 'mg/mL',
    concDefault: 1,
    mix: {
      vialAmount: 50,
      vialUnit: 'mg',
      vialLabel: 'ống',
      vials: 1,
      volumeMl: 50,
      vialVolumeMl: 5,
      diluents: ['Glucose 5%', 'NaCl 0,9%'],
      maxPeripheralConc: 1,
      stability: 'Dùng trong 24 giờ sau pha. Để nơi tránh ánh sáng (dung dịch có thể bị quang phân hủy).',
    },
  },

  compatKey: 'nitroglycerin',
  source: 'UpToDate 2024 / Acute Heart Failure',
  reviewedOn: '2026-08',
}

const nicardipine: InfusionDrug = {
  id: 'sample-nicardipine',
  name: 'Nicardipine',
  route: 'TTM qua BTĐ hoặc truyền chậm',
  preparation: 'Pha 25 mg với Glucose 5% hoặc NaCl 0,9% vừa đủ 50 mL (nồng độ 500 mcg/mL)',
  doseRange: 'Khởi đầu 5 mg/giờ, tăng 2,5 mg/giờ mỗi 15 phút đến 15 mg/giờ',
  note: 'Chẹn kênh canxi; dùng hạ huyết áp cấp mà không giảm tim',

  warnings: [
    { text: 'Tụt huyết áp (thường nhẹ) — theo dõi huyết áp', severity: 'trung bình' },
    { text: 'Có thể gia tăng nhịp tim nhẹ do giãn mạch phản xạ', severity: 'thấp' },
  ],

  calc: {
    weightBased: false,
    doseUnit: 'mg/giờ',
    doseMin: 5,
    doseMax: 15,
    doseAbsMax: 20,
    doseTimeBasis: 'giờ',
    concUnit: 'mg/mL',
    concDefault: 0.5,
    mix: {
      vialAmount: 25,
      vialUnit: 'mg',
      vialLabel: 'ống',
      vials: 1,
      volumeMl: 50,
      vialVolumeMl: 5,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      maxPeripheralConc: 0.5,
      stability: 'Dùng trong 24 giờ sau pha. Để nhiệt độ phòng.',
    },
  },

  compatKey: 'nicardipine',
  source: 'UpToDate 2024',
  reviewedOn: '2026-08',
}

export const sampleVasodilators: InfusionDrug[] = [nitroglycerin, nicardipine]
export default sampleVasodilators
