// Khai kiểu cho scripts/tim-ban-dich-vendor.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
// (Cùng lý do scripts/luat-vi-tri-dich.d.mts tồn tại.)

export interface ChoDich {
  file: string
  goi: string | null
}

export declare const TOI_DA_CHO: number

export declare function docGocGoi(goc: string): Promise<Set<string>>

export declare function goiCuaDuongDan(rel: string, gocGoi: Set<string>): string | null

export declare function timTrongCayVendor(
  goc: string,
  canTim: Iterable<string>,
): Promise<Map<string, ChoDich[]>>

export declare function soanThongBaoThieu(
  thieu: Iterable<string>,
  daDich: Map<string, ChoDich[]> | null,
  loiChanDoan?: string | null,
  ghiChu?: Map<string, string> | null,
): string
