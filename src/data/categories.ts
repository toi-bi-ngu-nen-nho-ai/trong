// ─── Danh mục các nhóm thuốc truyền trong tab "Dùng thuốc" ────────────────────
//
// Vì sao cần file này: trước đây mỗi nhóm thuốc truyền được nối tay vào App.tsx — một khoá lưu
// trữ, một `useLocalCollection`, một hàm lưu, một nhánh `switch` khi sửa, một dòng trong màn Đồng
// bộ dữ liệu, ba prop truyền xuống `DungThuocScreen` (thêm/sửa/xoá) và một prop danh sách. Với 5
// nhóm thì đó đã là hơn 30 chỗ phải sửa đúng cùng lúc; thêm 4 nhóm nữa (An thần, Thần kinh, Khác,
// Giải độc) theo cách cũ thì con số đó thành hơn 60, và chỉ cần quên MỘT chỗ là nhóm mới im lặng
// mất dữ liệu tự nhập khi sao lưu.
//
// Nay mọi thứ đọc từ đúng một danh sách dưới đây: thêm một nhóm = thêm một dòng ở đây.
//
// `storageKey` phải GIỮ NGUYÊN với 5 nhóm cũ, nếu không dữ liệu tự nhập đã lưu trên máy người dùng
// sẽ không đọc được nữa. Đó cũng là lý do khoá của nhóm "Loạn nhịp" là "customAntiarrhythmics"
// (khác id "arrhythmia") — giữ đúng chuỗi lịch sử thay vì đổi cho gọn mắt.

import type { InfusionDrug } from "./types"
import { INOTROPES } from "./inotropes"
import { VASOACTIVES } from "./vasoactives"
import { VASODILATORS } from "./vasodilators"
import { ANTIARRHYTHMICS } from "./antiarrhythmics"
import { ELECTROLYTES } from "./electrolytes"
import { SEDATIVES } from "./sedation"
import { NEURO_DRUGS } from "./neuro"
import { OTHER_DRUGS } from "./others"
import { ANTIDOTES } from "./antidotes"

export type InfusionCategory =
  | "inotrope"
  | "vasoactive"
  | "vasodilator"
  | "arrhythmia"
  | "electrolyte"
  | "sedation"
  | "neuro"
  | "other"
  | "antidote"

export interface InfusionCategoryConfig {
  id: InfusionCategory
  // Nhãn chip trên hàng tab — ngắn nhất có thể để hàng tab không phải cuộn xa.
  tabLabel: string
  // Tiêu đề màn hình khi tab này đang mở.
  title: string
  // Dùng trong câu "Tìm <...>" của ô tìm kiếm và trong nhãn nút "Thêm <...>".
  categoryLabel: string
  staticDrugs: InfusionDrug[]
  // Khoá localStorage của danh sách tự nhập thuộc nhóm này. KHÔNG đổi khoá của nhóm cũ.
  storageKey: string
  // Khoá trong file sao lưu JSON. Giữ nguyên tên cũ để file xuất từ bản trước vẫn nhập lại được.
  backupKey: string
}

export const INFUSION_CATEGORIES: InfusionCategoryConfig[] = [
  {
    id: "inotrope",
    tabLabel: "Co bóp",
    title: "Thuốc co bóp cơ tim",
    categoryLabel: "thuốc co bóp cơ tim",
    staticDrugs: INOTROPES,
    storageKey: "customInotropes",
    backupKey: "inotropes",
  },
  {
    id: "vasoactive",
    tabLabel: "Vận mạch",
    title: "Thuốc vận mạch",
    categoryLabel: "thuốc vận mạch",
    staticDrugs: VASOACTIVES,
    storageKey: "customVasoactives",
    backupKey: "vasoactives",
  },
  {
    id: "vasodilator",
    tabLabel: "Giãn mạch",
    title: "Thuốc giãn mạch",
    categoryLabel: "thuốc giãn mạch",
    staticDrugs: VASODILATORS,
    storageKey: "customVasodilators",
    backupKey: "vasodilators",
  },
  {
    id: "arrhythmia",
    tabLabel: "Loạn nhịp",
    title: "Thuốc chống loạn nhịp",
    categoryLabel: "thuốc chống loạn nhịp",
    staticDrugs: ANTIARRHYTHMICS,
    storageKey: "customAntiarrhythmics",
    backupKey: "antiarrhythmics",
  },
  {
    id: "electrolyte",
    tabLabel: "Nội môi",
    title: "Cân bằng nội môi",
    categoryLabel: "thuốc cân bằng nội môi",
    staticDrugs: ELECTROLYTES,
    storageKey: "customElectrolytes",
    backupKey: "electrolytes",
  },
  {
    id: "sedation",
    tabLabel: "An thần",
    title: "An thần · Giảm đau · Giãn cơ",
    categoryLabel: "thuốc an thần / giảm đau / giãn cơ",
    staticDrugs: SEDATIVES,
    storageKey: "customSedatives",
    backupKey: "sedatives",
  },
  {
    id: "neuro",
    tabLabel: "Thần kinh",
    title: "Thần kinh cấp cứu",
    categoryLabel: "thuốc thần kinh cấp cứu",
    staticDrugs: NEURO_DRUGS,
    storageKey: "customNeuro",
    backupKey: "neuro",
  },
  {
    id: "other",
    tabLabel: "Khác",
    title: "Thuốc dùng thường trực khác",
    categoryLabel: "thuốc thường trực khác",
    staticDrugs: OTHER_DRUGS,
    storageKey: "customOthers",
    backupKey: "others",
  },
  {
    id: "antidote",
    tabLabel: "Giải độc",
    title: "Thuốc giải độc",
    categoryLabel: "thuốc giải độc",
    staticDrugs: ANTIDOTES,
    storageKey: "customAntidotes",
    backupKey: "antidotes",
  },
]

export const INFUSION_CATEGORY_IDS = INFUSION_CATEGORIES.map((c) => c.id)

export function infusionCategory(id: InfusionCategory): InfusionCategoryConfig {
  const found = INFUSION_CATEGORIES.find((c) => c.id === id)
  // Không bao giờ xảy ra với dữ liệu hợp lệ, nhưng thà rơi về nhóm đầu tiên còn hơn để undefined
  // lan xuống giao diện thành một màn trắng không giải thích được.
  return found ?? INFUSION_CATEGORIES[0]
}
