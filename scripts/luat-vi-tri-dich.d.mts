// Khai kiểu cho scripts/luat-vi-tri-dich.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
import type ts from 'typescript'

export declare const THUOC_TINH_HIEN_THI: Set<string>
export declare const FILE_CHO_PHEP_NAME_DENSE_MENU: Set<string>
export declare const FILE_CHO_PHEP_KHOA_TINH_TOAN: Set<string>
export declare const FILE_CHO_PHEP_FILLTEXT: Set<string>
export declare const FILE_CHO_PHEP_NAME_SENIOR_TOOL: Set<string>
export declare const FILE_CHO_PHEP_KEY_MUC_MENU: Set<string>
export declare const DOI_SO_HIEN_THI: Set<string>
export declare const THUOC_TINH_HTML_HIEN_THI: string[]
export declare const THUOC_TINH_LIT_HIEN_THI: string[]

export interface Luot {
  chuoiGoc: string
  chuoiDich: string
  viTri: string
  dong: number
}

export declare function viTriHienThi(node: ts.Node, tenFile?: string | null): string | null

export declare function dichMotFile(
  js: string,
  banDo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: Luot[] }

export interface LuotTrenToanCay {
  chuoiGoc: string
  chuoiDich: string
}

export declare function thayTrenToanCay(
  js: string,
  banDoTienTo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: LuotTrenToanCay[] }

export interface LuotTagTooltip {
  chuoiGoc: string
  chuoiDich: string
  dong: number
}

export declare function thayChuTrongTagTooltip(
  js: string,
  banDo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: LuotTagTooltip[] }

export interface LuotNutDongMenuMobile {
  chuoiGoc: string
  chuoiDich: string
  dong: number
}

export declare function thayNutDongMenuMobile(
  js: string,
  banDo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: LuotNutDongMenuMobile[] }

export interface LuotTienToSlide {
  chuoiGoc: string
  chuoiDich: string
  dong: number
}

export declare function thayTienToSlideFrameDenseMenu(
  js: string,
  banDo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: LuotTienToSlide[] }

export interface LuotCustomFrameMenu {
  chuoiGoc: string
  chuoiDich: string
  dong: number
}

export declare const FILE_CHO_PHEP_NAME_SLASH_MENU: Set<string>
export declare const FILE_CHO_PHEP_KHOA_BANG_TOOLTIP: Set<string>
export declare const FILE_CHO_PHEP_LOC_INCLUDES: Set<string>

export interface LuotTenNhomSlashMenu {
  chuoiGoc: string
  chuoiDich: string
  dong: number
}

export declare function thayTenNhomSlashMenu(
  js: string,
  banDo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: LuotTenNhomSlashMenu[] }

export declare function thayChuCustomFrameMenu(
  js: string,
  banDo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: LuotCustomFrameMenu[] }

export interface LuotPlaceholderBangMau {
  chuoiGoc: string
  chuoiDich: string
  dong: number
}

export declare function thayPlaceholderBangMau(
  js: string,
  banDo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: LuotPlaceholderBangMau[] }

/** Chung cho hai bộ thay chữ trần thêm 2026-09-02 — cùng hình dạng lượt trả về. */
export interface LuotChuTran {
  chuoiGoc: string
  chuoiDich: string
  dong: number
}

export interface MucChuTranDiv {
  file: string
  lop: string
  khoa: string
}

export declare const CHU_TRAN_DIV_CO_CLASS: MucChuTranDiv[]

export declare function thayChuTranTrongDiv(
  js: string,
  banDo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: LuotChuTran[] }

export declare const FILE_CHO_PHEP_MANG_NHAN_NGAY: Set<string>
export declare const TEN_MANG_NHAN_NGAY: Set<string>

export declare function thayNutHomNay(
  js: string,
  banDo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: LuotChuTran[] }
