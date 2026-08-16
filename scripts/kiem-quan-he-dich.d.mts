// Khai kiểu cho scripts/kiem-quan-he-dich.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.

export declare const THUOC_TINH_CON_GIU: Set<string>

export interface DiemTieuThu {
  file: string
  dong: number
  dang: string
  thuocTinh: string
}

export declare function diemTieuThuTrongFile(js: string, tenFile?: string): DiemTieuThu[]

export declare const BAN_KHAI_TIEU_THU: DiemTieuThu[]

export interface ViPhamTienTo {
  khoa: string
  tienTo: string
  banDichKhoa: string
  banDichTienTo: string
}

export declare function kiemTienTo(
  banDo: Record<string, string>,
  banDoTienTo: Record<string, string>,
): ViPhamTienTo[]
