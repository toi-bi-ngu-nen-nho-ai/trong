/**
 * Mẫu nhập thuốc co bóp cơ tim (Inotropes)
 *
 * Thuốc tăng co bóp tim, dùng qua bơm tiêm điện (BTĐ)
 * Ví dụ: Dobutamine, Dopamine, Milrinone
 */

import type { InfusionDrug } from './types'

const dobutamine: InfusionDrug = {
  id: 'sample-dobutamine',
  name: 'Dobutamine',
  route: 'TTM qua BTĐ',
  preparation: 'Pha 250 mg (1 ống) với NaCl 0,9% hoặc Glucose 5% vừa đủ 50 mL (nồng độ 5.000 mcg/mL)',
  doseRange: '2–5 mcg/kg/phút khởi đầu, chỉnh liều theo đáp ứng, tối đa 20 mcg/kg/phút',
  note: 'Ưu tiên tĩnh mạch trung tâm nếu dùng kéo dài; tác dụng β1 tăng co bóp, giãn mạch nhẹ',

  warnings: [
    { text: 'Gây nhịp nhanh, loạn nhịp — theo dõi ECG và huyết áp liên tục', severity: 'trung bình' },
    { text: 'Thoát mạch có thể gây viêm — cần đường truyền chắc chắn', severity: 'cao' },
  ],

  calc: {
    weightBased: true,
    doseUnit: 'mcg/kg/phút',
    doseMin: 2,
    doseMax: 20,
    doseAbsMax: 40,
    concUnit: 'mg/mL',
    concDefault: 5,
    unitScale: 1000,
    mix: {
      vialAmount: 250,
      vialUnit: 'mg',
      vialLabel: 'ống',
      vials: 1,
      volumeMl: 50,
      vialVolumeMl: 5,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      maxPeripheralConc: 2,
      stability: 'Dùng trong 24 giờ sau pha, để dưới 25°C, tránh ánh sáng. Ngả hồng nhạt là oxy hoá nhẹ chưa cần bỏ; ngả nâu hoặc kết tủa thì bỏ.',
    },
  },

  compatKey: 'dobutamine',
  source: 'UpToDate 2024 / AHA Guidelines',
  reviewedOn: '2026-08',
}

const dopamine: InfusionDrug = {
  id: 'sample-dopamine',
  name: 'Dopamine',
  route: 'TTM qua BTĐ, ưu tiên tĩnh mạch trung tâm',
  preparation: 'Pha 200 mg (1 ống) với NaCl 0,9% hoặc Glucose 5% vừa đủ 50 mL (nồng độ 4.000 mcg/mL)',
  doseRange: '5–10 mcg/kg/phút (β1 — tăng co bóp); > 10 mcg/kg/phút (α — co mạch)',
  note: 'Liều thấp < 3 mcg/kg/phút (dopaminergic) không còn được khuyến cáo thường quy',

  warnings: [
    { text: 'Thoát mạch gây hoại tử mô — cần đường truyền rất chắc chắn', severity: 'cao' },
    { text: 'Loạn nhịp, tăng huyết áp ở liều cao', severity: 'trung bình' },
  ],

  calc: {
    weightBased: true,
    doseUnit: 'mcg/kg/phút',
    doseMin: 5,
    doseMax: 20,
    doseAbsMax: 50,
    concUnit: 'mg/mL',
    concDefault: 4,
    unitScale: 1000,
    mix: {
      vialAmount: 200,
      vialUnit: 'mg',
      vialLabel: 'ống',
      vials: 1,
      volumeMl: 50,
      vialVolumeMl: 5,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      maxPeripheralConc: 1.6,
      stability: 'Dùng trong 24 giờ, để dưới 25°C, tránh ánh sáng. Bỏ nếu đổi màu hoặc kết tủa.',
    },
  },

  compatKey: 'dopamine',
  source: 'UpToDate 2024',
  reviewedOn: '2026-08',
}

const milrinone: InfusionDrug = {
  id: 'sample-milrinone',
  name: 'Milrinone',
  route: 'TTM qua BTĐ',
  preparation: 'Pha theo khoa (thường 10 mg — 1 ống — vừa đủ 50 mL, nồng độ 200 mcg/mL)',
  doseRange: '0,375–0,75 mcg/kg/phút duy trì',
  note: 'Thải trừ qua thận — giảm liều ở suy thận. Liều nạp thường bỏ qua tại ICU do nguy cơ tụt huyết áp.',

  warnings: [
    { text: 'Tụt huyết áp nặng, đặc biệt nếu dùng liều nạp', severity: 'cao' },
    { text: 'Loạn nhịp thất ở suy thận', severity: 'trung bình' },
  ],

  calc: {
    weightBased: true,
    doseUnit: 'mcg/kg/phút',
    doseMin: 0.375,
    doseMax: 0.75,
    doseAbsMax: 1,
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

  doseWeightBasis: 'actual',
  compatKey: 'milrinone',
  source: 'UpToDate 2024',
  reviewedOn: '2026-08',
}

export const sampleInotropes: InfusionDrug[] = [dobutamine, dopamine, milrinone]
export default sampleInotropes
