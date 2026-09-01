// TỆP SINH TỰ ĐỘNG — đừng sửa tay. Chạy `npm run dung:mau-dongnao` để tạo lại.
// Nguồn: AFFiNE packages/frontend/templates/edgeless-snapshot/Brainstorming →
// public/static/templates/dongnao/. Chỉ chứa slug + tên; nội dung mẫu (~204 KB) nằm trong
// public/, src/board/mau-dongnao.ts fetch khi người dùng mở tab (không vào chunk JS — D13).

export type MauDongNao = { readonly slug: string; readonly ten: string }

export const DANH_MUC_DONG_NAO = 'Động não'

export const MAU_DONG_NAO: readonly MauDongNao[] = [
  { slug: "5w2h", ten: "5W2H" },
  { slug: "concept-map", ten: "Sơ đồ khái niệm" },
  { slug: "flowchart", ten: "Lưu đồ" },
  { slug: "smart", ten: "Nguyên tắc SMART" },
  { slug: "swot", ten: "SWOT" },
]
