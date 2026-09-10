/**
 * Mẫu nhập thuốc giải độc (Antidotes)
 *
 * Thuốc giải độc cho ngộ độc / quá liều
 * Ví dụ: Lipid Emulsion, Methylene Blue, Hydroxocobalamin
 */

import type { InfusionDrug } from './types'

const lipidEmulsion: InfusionDrug = {
  id: 'sample-lipid-emulsion',
  name: 'Lipid Emulsion 20% (Intralipid)',
  route: 'TTM qua BTĐ',
  preparation: 'Chai 100 mL 20% Lipid emulsion. Liều nạp: bolus 1,5 mL/kg (15% body weight) trong 1 phút.',
  doseRange: 'Bolus: 1,5 mL/kg lần đầu; nếu vẫn không ổn định tim: 100 mL tiếp theo mỗi 3–5 phút đến hết. Duy trì: 15 mL/kg/giờ',
  note: 'Giải độc lipophilic (bupivacain, local anesthetic độc tim); cứu giữa trong ngộ độc local anesthetic nặng',

  warnings: [
    { text: 'KHẨN CẤP — phải thao tác nhanh, có defib/ECMO sẵn. Không cân nhắc', severity: 'cao' },
    { text: 'Quá liều lipid emulsion có thể gây lipemia — chỉ dùng khi rõ lợi ích', severity: 'trung bình' },
  ],

  calc: {
    weightBased: true,
    doseUnit: 'mL/kg',
    doseMin: 1.5,
    doseMax: 15,
    doseAbsMax: 20,
    concUnit: 'g/100mL',
    concDefault: 20,
    mix: {
      vialAmount: 2000,
      vialUnit: 'mg (20 g/100 mL)',
      vialLabel: 'chai',
      vials: 1,
      volumeMl: 100,
      vialVolumeMl: 100,
      diluents: ['Không pha loãng'],
      stability: 'Dùng ngay. Để nhiệt độ phòng hoặc lạnh. Không đun nóng.',
    },
  },

  boluses: [
    {
      label: 'Bolus nạp (1 phút)',
      unit: 'mL',
      perKgLow: 1.5,
      perKgHigh: 1.5,
      over: '1 phút',
      note: 'Nếu vẫn không ổn định tim → bolus thêm 100 mL mỗi 3–5 phút',
    },
  ],

  doseWeightBasis: 'actual',
  compatKey: 'lipid-emulsion',
  source: 'ACLS 2023 / Local Anesthetic Systemic Toxicity (LAST)',
  reviewedOn: '2026-08',
}

const methyleneBlue: InfusionDrug = {
  id: 'sample-methylene-blue',
  name: 'Methylene Blue 1%',
  route: 'TTM qua truyền chậm',
  preparation: 'Pha 1% (10 mg/mL). Liều điều trị: 1–2 mg/kg trong 5–10 phút.',
  doseRange: 'Điều trị methemoglobinemia: 1–2 mg/kg trong 5–10 phút. Có thể tái liệu sau 1 giờ nếu cần.',
  note: 'Giải độc acetaminophen, anilin, các ngộ độc gây methemoglobinemia',

  warnings: [
    { text: 'Nhuộm nước tiểu xanh — giải thích cho bệnh nhân để không hoảng sợ', severity: 'thấp' },
    { text: 'Hiếm: huyết áp cao, rối loạn tinh thần tạm thời', severity: 'trung bình' },
  ],

  calc: {
    weightBased: true,
    doseUnit: 'mg/kg',
    doseMin: 1,
    doseMax: 2,
    doseAbsMax: 4,
    concUnit: 'mg/mL',
    concDefault: 1,
    mix: {
      vialAmount: 100,
      vialUnit: 'mg',
      vialLabel: 'ống (10 mL 1%)',
      vials: 1,
      volumeMl: 50,
      vialVolumeMl: 10,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      maxPeripheralConc: 1,
      stability: 'Dùng trong 24 giờ sau pha. Để nơi tránh ánh sáng.',
    },
  },

  doseWeightBasis: 'actual',
  compatKey: 'methylene-blue',
  source: 'UpToDate 2024 / Methemoglobinemia Treatment',
  reviewedOn: '2026-08',
}

export const sampleAntidotes: InfusionDrug[] = [lipidEmulsion, methyleneBlue]
export default sampleAntidotes
