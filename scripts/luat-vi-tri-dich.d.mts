// Khai kiểu cho scripts/luat-vi-tri-dich.mjs, để ca kiểm .ts import được mà `tsc --noEmit` vẫn
// xanh. Đặt cạnh file .mjs nên TypeScript tự tìm thấy, không cần thêm gì vào tsconfig.
import type ts from 'typescript'

export declare const THUOC_TINH_HIEN_THI: Set<string>
export declare const DOI_SO_HIEN_THI: Set<string>
export declare const THUOC_TINH_HTML_HIEN_THI: string[]

export interface Luot {
  chuoiGoc: string
  chuoiDich: string
  viTri: string
  dong: number
}

export declare function viTriHienThi(node: ts.Node): string | null

export declare function dichMotFile(
  js: string,
  banDo: Record<string, string>,
  tenFile?: string,
): { js: string; cacLuot: Luot[] }
