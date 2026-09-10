/**
 * Mẫu nhập thuốc thường trực khác (Other Drugs)
 *
 * Thuốc gây mê, an thần, cơ giãn, kháng viêm, v.v.
 * Ví dụ: Propofol, Midazolam, Vecuronium
 */

import type { InfusionDrug } from './types'

const propofol: InfusionDrug = {
  id: 'sample-propofol',
  name: 'Propofol',
  route: 'TTM qua BTĐ (bơm tiêm điện hoặc truyền chậm)',
  preparation: 'Chai 20 mL 1% (200 mg) hoặc 2% (400 mg). Pha liều chưa được khuyến cáo; thường dùng nguyên chai truyền trực tiếp.',
  doseRange: 'Cảm ứng: 2–2,5 mg/kg. Duy trì: 0,1–0,2 mg/kg/phút (hoặc 6–12 mg/kg/giờ)',
  note: 'Thuốc gây mê IV; tương xứ tác dụng nhanh, mất nhanh; nguy cơ tụt huyết áp, ngừng thở',

  warnings: [
    { text: 'Tụt huyết áp nặng, ngừng thở — hỗ trợ hô hấp sẵn sàng', severity: 'cao' },
    { text: 'Hội chứng truyền dịch propofol (PRIS) nếu dùng liều cao kéo dài — rhabdomyolysis, toan chuyển hóa', severity: 'cao' },
  ],

  calc: {
    weightBased: true,
    doseUnit: 'mg/kg/phút',
    doseMin: 0.1,
    doseMax: 0.2,
    doseAbsMax: 0.3,
    concUnit: 'mg/mL',
    concDefault: 10,
    mix: {
      vialAmount: 200,
      vialUnit: 'mg',
      vialLabel: 'chai',
      vials: 1,
      volumeMl: 20,
      vialVolumeMl: 20,
      diluents: ['Không pha loãng', 'Dùng nguyên chai'],
      stability: 'Mở chai phải dùng trong 12 giờ. Để dưới 25°C. Báo mục tiêu BIS nếu có monitor.',
    },
  },

  doseWeightBasis: 'actual',
  compatKey: 'propofol',
  source: 'UpToDate 2024 / ICU Sedation',
  reviewedOn: '2026-08',
}

const midazolam: InfusionDrug = {
  id: 'sample-midazolam',
  name: 'Midazolam',
  route: 'TTM qua BTĐ hoặc truyền chậm',
  preparation: 'Pha 5 mg (1 ống 1 mL 5mg/mL) với NaCl 0,9% hoặc Glucose 5% vừa đủ 10 mL (nồng độ 0,5 mg/mL)',
  doseRange: 'Cảm ứng: 0,1–0,15 mg/kg. Duy trì: 0,02–0,1 mg/kg/giờ',
  note: 'Thuốc an thần trung bình; tác dụng chậm hơn propofol nhưng an toàn hơn về mặt huyết áp',

  warnings: [
    { text: 'Ngừng thở — hỗ trợ hô hấp sẵn sàng, có flumazenil sẵn', severity: 'cao' },
    { text: 'Tích luỹ ở suy thận hoặc gan — cần giảm liều, theo dõi BIS', severity: 'trung bình' },
  ],

  calc: {
    weightBased: true,
    doseUnit: 'mg/kg/giờ',
    doseMin: 0.02,
    doseMax: 0.1,
    doseAbsMax: 0.2,
    doseTimeBasis: 'giờ',
    concUnit: 'mg/mL',
    concDefault: 0.5,
    mix: {
      vialAmount: 5,
      vialUnit: 'mg',
      vialLabel: 'ống',
      vials: 1,
      volumeMl: 10,
      vialVolumeMl: 1,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      maxPeripheralConc: 0.5,
      stability: 'Dùng trong 24 giờ sau pha. Để nhiệt độ phòng.',
    },
  },

  doseWeightBasis: 'actual',
  compatKey: 'midazolam',
  source: 'UpToDate 2024',
  reviewedOn: '2026-08',
}

export const sampleOtherDrugs: InfusionDrug[] = [propofol, midazolam]
export default sampleOtherDrugs
