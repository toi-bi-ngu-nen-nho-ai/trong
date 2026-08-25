// Khai kiểu cho scripts/so-khop-ban-dich.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
// (Cùng lý do scripts/luat-vi-tri-dich.d.mts và scripts/tim-ban-dich-vendor.d.mts tồn tại.)

export interface NhomTrung {
  vi: string
  khoa: string[]
}

export declare function dangTrongNhay(s: string, nhay: '"' | "'" | '`'): string

export declare function coNhuLiteral(noiDung: string, s: string): boolean

export declare function coDungNhuDaChen(noiDung: string, s: string): boolean

export declare function coTrongTagTooltip(noiDung: string, s: string): boolean

export declare function coTrongNutDongMenuMobile(noiDung: string, s: string): boolean

export declare function coTrongTienToTemplateHead(noiDung: string, s: string): boolean

export declare function timTrungBanDich(banDo: Record<string, string>): NhomTrung[]

export declare function giaiThichKhopTho(
  v: string,
  banDo: Record<string, string>,
  dangThieu?: Set<string>,
): { khoa: string; vi: string; cungThieu: boolean } | null
