/**
 * Mẫu nhập thuốc chống loạn nhịp (Antiarrhythmics)
 *
 * Thuốc chống loạn nhịp và ổn định nhịp tim
 * Ví dụ: Amiodarone, Esmolol, Lidocaine
 */

import type { InfusionDrug } from './types'

const amiodarone: InfusionDrug = {
  id: 'sample-amiodarone',
  name: 'Amiodarone',
  route: 'TTM qua BTĐ',
  preparation: 'Liều nạp: 150 mg trong 10 phút rồi 1 mg/phút trong 6 giờ, sau đó 0,5 mg/phút duy trì',
  doseRange: '150 mg liều nạp (10 phút), rồi 1 mg/phút (6 giờ), rồi 0,5 mg/phút (duy trì)',
  note: 'Thuốc Vaughan-Williams Class III; có tác dụng chống loạn nhịp mạnh nhưng độc tính cao',

  warnings: [
    { text: 'Tụt huyết áp nặng — truyền chậm, theo dõi huyết áp + ECG liên tục', severity: 'cao' },
    { text: 'Kéo dài QTc và PR; gây loạn nhịp mới (torsades de pointes)', severity: 'cao' },
    { text: 'Độc tính phổi (viêm phổi từ từ) nếu dùng lâu', severity: 'trung bình' },
  ],

  calc: {
    weightBased: false,
    doseUnit: 'mg/phút',
    doseMin: 0.5,
    doseMax: 1,
    concUnit: 'mg/mL',
    concDefault: 1.5,
    mix: {
      vialAmount: 150,
      vialUnit: 'mg',
      vialLabel: 'ống',
      vials: 1,
      volumeMl: 100,
      vialVolumeMl: 3,
      diluents: ['Glucose 5%'],
      avoidDiluents: ['NaCl 0,9%'],
      diluentWarning: 'Chỉ pha trong Glucose 5%; tuyệt đối không NaCl 0,9% — sẽ kết tủa',
      stability: 'Dùng trong 24 giờ sau pha. Để nơi tránh ánh sáng.',
    },
  },

  boluses: [
    {
      label: 'Liều nạp loạn nhịp cấp',
      unit: 'mg',
      fixedLow: 150,
      fixedHigh: 300,
      over: '10–20 phút',
      note: 'Có thể tái nạp 150 mg sau 10–15 phút nếu loạn nhịp vẫn tiếp tục',
    },
  ],

  doseWeightBasis: 'actual',
  compatKey: 'amiodarone',
  source: 'UpToDate 2024 / ACLS Guidelines 2023',
  reviewedOn: '2026-08',
}

const esmolol: InfusionDrug = {
  id: 'sample-esmolol',
  name: 'Esmolol',
  route: 'TTM qua BTĐ',
  preparation: 'Liều nạp: 500 mcg/kg trong 1 phút; duy trì: 50–300 mcg/kg/phút',
  doseRange: '50–300 mcg/kg/phút duy trì (tác dụng nhanh, mất nhanh)',
  note: 'Chẹn β mạnh tác dụng ngắn; thường dùng trong phòng mổ để chống loạn nhịp khi cảm ứng gây mê',

  warnings: [
    { text: 'Giảm tim nhanh — theo dõi tần số tim', severity: 'trung bình' },
    { text: 'Tụt huyết áp — người bệnh huyết áp thấp không dùng', severity: 'cao' },
  ],

  calc: {
    weightBased: true,
    doseUnit: 'mcg/kg/phút',
    doseMin: 50,
    doseMax: 300,
    doseAbsMax: 500,
    concUnit: 'mg/mL',
    concDefault: 0.25,
    unitScale: 1000,
    mix: {
      vialAmount: 2500,
      vialUnit: 'mcg',
      vialLabel: 'ống (2,5 mL)',
      vials: 1,
      volumeMl: 50,
      vialVolumeMl: 2.5,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      maxPeripheralConc: 0.25,
      stability: 'Dùng trong 24 giờ sau pha.',
    },
  },

  boluses: [
    {
      label: 'Liều nạp (1 phút)',
      unit: 'mcg',
      perKgLow: 500,
      perKgHigh: 500,
      over: '1 phút',
    },
  ],

  doseWeightBasis: 'actual',
  compatKey: 'esmolol',
  source: 'UpToDate 2024 / ACLS',
  reviewedOn: '2026-08',
}

export const sampleAntiarrhythmics: InfusionDrug[] = [amiodarone, esmolol]
export default sampleAntiarrhythmics
