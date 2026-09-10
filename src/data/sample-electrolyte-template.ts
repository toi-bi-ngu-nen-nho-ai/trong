/**
 * Mẫu nhập thuốc cân bằng nội môi (Electrolytes)
 *
 * Bổ sung điện giải (Mg, Ca, K, Na)
 * Ví dụ: Magnesium, Calcium, Potassium
 */

import type { InfusionDrug } from './types'

const magnesium: InfusionDrug = {
  id: 'sample-magnesium',
  name: 'Magnesium Sulphate (MgSO₄)',
  route: 'TTM qua BTĐ hoặc truyền chậm',
  preparation: 'Pha 50% (5 g/10 mL ống) với NaCl 0,9% hoặc Glucose 5% (thường pha 1 ống vừa đủ 50 mL)',
  doseRange: 'Bổ sung: 1–2 g/giờ cho đến hết mục tiêu; ngừng cơn: bolus 1–2 g trong 5–20 phút',
  note: 'Điều trị thiếu Mg, ngừng cơn, hỗ trợ sốc sản khoa',

  warnings: [
    { text: 'Nguy cơ mất phản xạ, yếu cơ — theo dõi CK phản xạ (knee), ghi nhận vận động', severity: 'trung bình' },
    { text: 'Huyết áp cao có thể tụt — theo dõi huyết áp', severity: 'trung bình' },
  ],

  calc: {
    weightBased: false,
    doseUnit: 'g/giờ',
    doseMin: 1,
    doseMax: 2,
    doseAbsMax: 4,
    doseTimeBasis: 'giờ',
    concUnit: 'g/10mL',
    concDefault: 0.5,
    mix: {
      vialAmount: 5,
      vialUnit: 'g',
      vialLabel: 'ống (10 mL 50%)',
      vials: 1,
      volumeMl: 50,
      vialVolumeMl: 10,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      maxPeripheralConc: 0.5,
      stability: 'Dùng trong 24 giờ. Để nhiệt độ phòng.',
    },
  },

  boluses: [
    {
      label: 'Ngừng cơn (eclampsia/pre-eclampsia)',
      unit: 'g',
      fixedLow: 1,
      fixedHigh: 2,
      over: '5–20 phút',
    },
  ],

  compatKey: 'magnesium',
  source: 'UpToDate 2024 / OB/GYN Guidelines',
  reviewedOn: '2026-08',
}

const calcium: InfusionDrug = {
  id: 'sample-calcium',
  name: 'Calcium Gluconate 10%',
  route: 'TTM qua BTĐ hoặc truyền chậm (không ngoại biên)',
  preparation: 'Pha 10% (100 mg/mL) với NaCl 0,9% hoặc Glucose 5% (thường pha 1 ống 10 mL vừa đủ 50 mL)',
  doseRange: 'Bổ sung: 100–500 mg IV mỗi 4–8 giờ; khẩn cấp (hypocalcemia): 500 mg–1 g trong 2–5 phút',
  note: 'Bổ sung Ca, chống hyperkalemia cấp, điều trị độc tính chẹn kênh canxi',

  warnings: [
    { text: 'Thoát mạch gây hoại tử ngoại biên — TUYỆT ĐỐI không ngoại biên', severity: 'cao' },
    { text: 'Truyền quá nhanh gây loạn nhịp — truyền chậm từ từ', severity: 'cao' },
  ],

  calc: {
    weightBased: false,
    doseUnit: 'mg',
    doseMin: 100,
    doseMax: 500,
    doseAbsMax: 1000,
    concUnit: 'mg/mL',
    concDefault: 0.1,
    mix: {
      vialAmount: 1000,
      vialUnit: 'mg',
      vialLabel: 'ống (10 mL 10%)',
      vials: 1,
      volumeMl: 50,
      vialVolumeMl: 10,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      maxPeripheralConc: 0,
      peripheralNote: 'TUYỆT ĐỐI không dùng ngoại biên — chỉ tĩnh mạch trung tâm.',
      stability: 'Dùng trong 24 giờ. Để nhiệt độ phòng.',
    },
  },

  boluses: [
    {
      label: 'Khẩn cấp (hypocalcemia nặng)',
      unit: 'mg',
      fixedLow: 500,
      fixedHigh: 1000,
      over: '2–5 phút',
      note: 'Theo dõi ECG; bỏ ngay nếu có QTc quá ngắn',
    },
  ],

  compatKey: 'calcium',
  source: 'UpToDate 2024',
  reviewedOn: '2026-08',
}

export const sampleElectrolytes: InfusionDrug[] = [magnesium, calcium]
export default sampleElectrolytes
