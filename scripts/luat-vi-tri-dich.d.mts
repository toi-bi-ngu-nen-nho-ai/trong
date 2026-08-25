// Khai kiểu cho scripts/luat-vi-tri-dich.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
import type ts from 'typescript'

export declare const THUOC_TINH_HIEN_THI: Set<string>
export declare const FILE_CHO_PHEP_NAME_DENSE_MENU: Set<string>
export declare const FILE_CHO_PHEP_KHOA_TINH_TOAN: Set<string>
export declare const FILE_CHO_PHEP_FILLTEXT: Set<string>
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
