/**
 * Mẫu nhập dữ liệu kháng sinh cho DungThuocScreen
 *
 * Cập nhật 2026-09-10:
 * - `mix` là mảng (AntibioticMix[]) thay vì object đơn — hỗ trợ nhiều quy cách ống/lọ
 * - Thêm `boluses` (liều nạp / loading dose)
 * - Thêm `maxSingleDose` (ngưỡng liều một lần dùng)
 * - Thêm `doseWeightBasis` (cân nặng dùng: actual/ideal/adjusted)
 * - Thêm `indications` (liều riêng theo bệnh lý cụ thể)
 * - Thêm hỗ trợ `rrt` (liều khi lọc máu/CRRT)
 */

import type { Antibiotic } from './types'

// ─── Ví dụ 1: Vancomycin IV (kháng sinh thường dùng nhất) ─────────────────
const vancomycinIV: Antibiotic = {
  // ─── Bắt buộc
  id: 'vancomycin-iv',
  name: 'Vancomycin',
  route: 'TTM (truyền tĩnh mạch)',
  tiers: [
    { min: 50, label: 'CrCl ≥ 50', dose: '15–20 mg/kg mỗi 8–12h' },
    { min: 30, label: 'CrCl 30–49', dose: '15–20 mg/kg mỗi 12h' },
    { min: 10, label: 'CrCl 10–29', dose: '15–20 mg/kg mỗi 24h' },
    { min: 0, label: 'CrCl < 10', dose: '15–20 mg/kg, chỉnh theo nồng độ đáy' },
  ],

  // ─── Thông tin chung (tuỳ chọn)
  standardDose: '15–20 mg/kg mỗi 8–12h',
  preparation: 'Pha loãng, truyền trong ≥60 phút',
  note: 'Thuốc thường dùng nhất trong khoa; kiểm nồng độ đáy thường xuyên',

  // ─── Cảnh báo lâm sàng
  warnings: [
    {
      text: 'Theo dõi nồng độ đáy (trough) 15–20 mcg/mL; nguy cơ độc thận nếu quá cao',
      severity: 'cao',
    },
    {
      text: 'Hội chứng người đỏ nếu truyền quá nhanh; luôn truyền ≥60 phút',
      severity: 'trung bình',
    },
  ],

  // ─── Liều nạp / Bolus
  boluses: [
    {
      label: 'Liều nạp',
      unit: 'mg',
      perKgLow: 25,
      perKgHigh: 30,
      maxSingle: 3000,
      over: '60–120 phút',
      note: 'Nạp một lần rồi chuyển sang liều duy trì theo tiers',
    },
  ],

  // ─── Ngưỡng liều một lần dùng
  maxSingleDose: {
    amount: 2000,
    unit: 'mg',
    note: 'Giới hạn liều duy trì; liều nạp được lên đến 3000 mg',
  },

  // ─── Cân nặng dùng khi tính liều mg/kg
  doseWeightBasis: 'actual',

  // ─── Liều khi bệnh nhân đang lọc máu / CRRT
  rrt: {
    crrt: '1 g mỗi 8h khi Qeff ≥ 2 L/giờ',
    ihd: 'Sau lọc: 7.5–10 mg/kg',
    note: 'Luôn ghi kèm điều kiện Qeff; nồng độ đáy vẫn cần kiểm',
    source: 'UpToDate 2024 — CRRT dosing in critical care',
    reviewedOn: '2026-08',
  },

  // ─── Chỉ định riêng theo bệnh lý — ghi đè `tiers` mặc định nếu bệnh lý này có liều khác
  indications: [
    {
      diseaseId: 'viem-mang-nao',
      standardDose: '15–20 mg/kg mỗi 6–8h',
      tiers: [
        {
          min: 50,
          label: 'CrCl ≥ 50',
          dose: '15–20 mg/kg mỗi 6–8h (liều cao để thấm hàng rào máu não)',
        },
        {
          min: 10,
          label: 'CrCl < 50',
          dose: '15–20 mg/kg mỗi 8–12h, chỉnh theo nồng độ',
        },
      ],
      note: 'Nồng độ đáy mục tiêu vẫn 15–20 mcg/mL như bình thường, nhưng cần liều cao hơn do BBB',
      source: 'Hướng dẫn viêm màng não của Bộ Y tế 2023',
      reviewedOn: '2026-08',
    },
  ],

  // ─── Công thức pha (mảng — hỗ trợ nhiều quy cách lọ/ống)
  mix: [
    {
      vialAmount: 1000,
      vialUnit: 'mg',
      vialLabel: 'lọ',
      vialForm: 'powder',
      reconstituteMl: 20,
      displacementMl: 0.7,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      avoidDiluents: [],
      concUnit: 'mg/mL',
      maxConc: 5,
      infuseNote: 'Truyền ≥60 phút để tránh hội chứng người đỏ',
    },
    {
      vialAmount: 500,
      vialUnit: 'mg',
      vialLabel: 'lọ',
      vialForm: 'powder',
      reconstituteMl: 10,
      displacementMl: 0.35,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      concUnit: 'mg/mL',
      maxConc: 5,
    },
  ],

  // ─── Khóa tra bảng tương hợp Y-site và tương tác thuốc
  compatKey: 'vancomycin',

  // ─── Nguồn & rà soát
  source: 'UpToDate 2024 / Infectious Diseases Society of America (IDSA)',
  reviewedOn: '2026-08',
}

// ─── Ví dụ 2: Ceftriaxone (beta-lactam, liều không theo CrCl) ─────────────
const ceftriaxoneIV: Antibiotic = {
  id: 'ceftriaxone-iv',
  name: 'Ceftriaxone',
  route: 'TTM / TTB (tiêm tĩnh mạch / tiêm bắp)',
  standardDose: '1–2 g mỗi 12h',
  preparation: 'Pha loãng, truyền trong 30 phút',
  note: 'Kháng sinh phổ rộng thường dùng; an toàn trên thận (không giảm liều theo CrCl)',

  // Ceftriaxone an toàn trên thận, nên chỉ cần 1 tầng
  tiers: [
    { min: 0, label: 'Mọi mức CrCl', dose: '1–2 g mỗi 12h' },
  ],

  warnings: [
    {
      text: 'Dị ứng penicillin/cephalosporin: nguy cơ 1–3% (thấp hơn penicillin)',
      severity: 'cao',
    },
    {
      text: 'Hiếm: pseudomembranous colitis do C. difficile',
      severity: 'trung bình',
    },
  ],

  boluses: [
    {
      label: 'Liều chuẩn',
      unit: 'g',
      fixedLow: 1,
      fixedHigh: 2,
      over: '30 phút',
    },
  ],

  maxSingleDose: {
    amount: 2,
    unit: 'g',
  },

  doseWeightBasis: 'actual',

  // Viêm màng não cần liều cao hơn
  indications: [
    {
      diseaseId: 'viem-mang-nao',
      standardDose: '2 g mỗi 12h',
      tiers: [
        {
          min: 0,
          label: 'Mọi mức CrCl',
          dose: '2 g mỗi 12h (liều cao cho viêm màng não)',
        },
      ],
      source: 'IDSA Meningitis Guidelines 2023',
      reviewedOn: '2026-08',
    },
  ],

  mix: [
    {
      vialAmount: 1,
      vialUnit: 'g',
      vialLabel: 'lọ',
      vialForm: 'powder',
      reconstituteMl: 10,
      displacementMl: 0.6,
      diluents: ['NaCl 0,9%', 'Glucose 5%', 'Nước cất'],
      concUnit: 'mg/mL',
      maxConc: 100,
      infuseNote: 'Truyền 30 phút',
    },
  ],

  compatKey: 'ceftriaxone',
  source: 'UpToDate 2024 / IDSA',
  reviewedOn: '2026-08',
}

// ─── Ví dụ 3: Metronidazole (kén dung môi, liều theo CrCl) ─────────────
const metronidazoleIV: Antibiotic = {
  id: 'metronidazole-iv',
  name: 'Metronidazole',
  route: 'TTM',
  standardDose: '500 mg mỗi 6–8h',
  preparation: 'Pha loãng (500 mg/100 mL), truyền trong 20–60 phút',
  note: 'Giết khuẩn anaerob; tương tác rượu kiểu disulfiram',

  tiers: [
    { min: 50, label: 'CrCl ≥ 50', dose: '500 mg mỗi 6–8h' },
    { min: 10, label: 'CrCl 10–49', dose: '500 mg mỗi 12h' },
    { min: 0, label: 'CrCl < 10', dose: '500 mg mỗi 24h' },
  ],

  warnings: [
    {
      text: 'Neuropathy ngoại biên khi dùng lâu (>2 tuần liên tục)',
      severity: 'trung bình',
    },
    {
      text: 'Tương tác disulfiram-like với rượu — TUYỆT ĐỐI không uống rượu',
      severity: 'cao',
    },
  ],

  maxSingleDose: {
    amount: 500,
    unit: 'mg',
  },

  mix: [
    {
      vialAmount: 500,
      vialUnit: 'mg',
      vialLabel: 'ống',
      vialForm: 'solution',
      vialVolumeMl: 100,
      diluents: ['NaCl 0,9%'],
      avoidDiluents: ['Glucose 5%'],
      diluentWarning: 'Metronidazole kết tủa trong Glucose — CHỈ dùng NaCl 0,9%',
      concUnit: 'mg/mL',
      infuseNote: 'Truyền 20–60 phút',
    },
  ],

  compatKey: 'metronidazole',
  source: 'UpToDate 2024',
  reviewedOn: '2026-08',
}

// ─── Ví dụ 4: Meropenem (carbapenem phổ rộng, liều cao) ─────────────
const meropenemIV: Antibiotic = {
  id: 'meropenem-iv',
  name: 'Meropenem',
  route: 'TTM',
  standardDose: '1 g mỗi 8h',
  preparation: 'Pha loãng, truyền trong 15–30 phút (có thể tiêm nhanh 5 phút)',
  note: 'Carbapenem phổ rộng; dùng cho bệnh nặng hoặc đa kháng',

  tiers: [
    { min: 50, label: 'CrCl ≥ 50', dose: '1 g mỗi 8h' },
    { min: 26, label: 'CrCl 26–50', dose: '1 g mỗi 12h' },
    { min: 10, label: 'CrCl 10–25', dose: '500 mg mỗi 12h' },
    { min: 0, label: 'CrCl < 10', dose: '500 mg mỗi 24h' },
  ],

  warnings: [
    {
      text: 'Dị ứng beta-lactam: nguy cơ 1–3% (thấp hơn penicillin)',
      severity: 'cao',
    },
    {
      text: 'Có nguy cơ co giật nếu thận suy nặng, đặc biệt liều cao',
      severity: 'trung bình',
    },
  ],

  boluses: [
    {
      label: 'Tiêm nhanh',
      unit: 'mg',
      fixedLow: 500,
      fixedHigh: 1000,
      over: '5 phút',
      note: 'Hoặc truyền chậm 15–30 phút nếu bệnh nhân không dung nạp tiêm nhanh',
    },
  ],

  maxSingleDose: {
    amount: 1000,
    unit: 'mg',
  },

  doseWeightBasis: 'actual',

  rrt: {
    crrt: '500 mg–1 g mỗi 8h (Qeff ≥ 2 L/giờ)',
    ihd: 'Sau lọc: 500 mg–1 g',
    note: 'Giảm khoảng 50% so với bình thường; luôn theo dõi CrCl',
    source: 'UpToDate CRRT Dosing 2024',
    reviewedOn: '2026-08',
  },

  mix: [
    {
      vialAmount: 1000,
      vialUnit: 'mg',
      vialLabel: 'lọ',
      vialForm: 'powder',
      reconstituteMl: 10,
      displacementMl: 0.8,
      diluents: ['NaCl 0,9%'],
      avoidDiluents: ['Glucose 5%'],
      diluentWarning: 'Tốt nhất dùng NaCl 0,9%',
      concUnit: 'mg/mL',
      maxConc: 100,
      infuseNote: 'Có thể tiêm nhanh 5 phút hoặc truyền 15–30 phút',
    },
  ],

  compatKey: 'meropenem',
  source: 'UpToDate 2024 / Klebsiella Infections Guidelines',
  reviewedOn: '2026-08',
}

// ─── Ví dụ 5: Ciprofloxacin IV (fluoroquinolone, ít dùng IV) ─────────────
const ciprofloxacinIV: Antibiotic = {
  id: 'ciprofloxacin-iv',
  name: 'Ciprofloxacin',
  route: 'TTM / Uống',
  standardDose: '400 mg mỗi 12h (IV) hoặc 500 mg mỗi 12h (uống)',
  preparation: 'Pha loãng, truyền trong 60 phút',
  note: 'Fluoroquinolone; thường dùng uống trong điều trị ngoại trú',

  tiers: [
    { min: 30, label: 'CrCl ≥ 30', dose: '400 mg mỗi 12h' },
    { min: 0, label: 'CrCl < 30', dose: '400 mg mỗi 18–24h' },
  ],

  warnings: [
    {
      text: 'Gân Achilles có nguy cơ viêm/đứt; bệnh nhân >60 tuổi, đang dùng corticosteroid',
      severity: 'trung bình',
    },
    {
      text: 'Kéo dài QTc — cẩn trọng với thuốc khác gây rối loạn nhịp',
      severity: 'trung bình',
    },
  ],

  maxSingleDose: {
    amount: 400,
    unit: 'mg',
  },

  mix: [
    {
      vialAmount: 400,
      vialUnit: 'mg',
      vialLabel: 'ống',
      vialForm: 'solution',
      vialVolumeMl: 200,
      diluents: ['NaCl 0,9%', 'Glucose 5%'],
      concUnit: 'mg/mL',
      maxConc: 2,
      infuseNote: 'Truyền chậm ≥60 phút',
    },
  ],

  compatKey: 'ciprofloxacin',
  source: 'UpToDate 2024',
  reviewedOn: '2026-08',
}

// ─── Xuất mảng mẫu để dùng trong DungThuocScreen ─────────────
export const sampleAntibiotics: Antibiotic[] = [
  vancomycinIV,
  ceftriaxoneIV,
  metronidazoleIV,
  meropenemIV,
  ciprofloxacinIV,
]

export default sampleAntibiotics
