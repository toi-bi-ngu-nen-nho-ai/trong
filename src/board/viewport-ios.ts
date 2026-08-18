export type ThongTinThietBi = {
  userAgent: string
  platform: string
  maxTouchPoints?: number
}

/**
 * true nếu thiết bị là iOS thật (iPhone/iPad/iPod) hoặc iPadOS 13+ đang giả User-Agent máy Mac
 * desktop (chỉ phân biệt được với Mac thật bằng đa điểm chạm — Mac dùng chuột/trackpad không có
 * `maxTouchPoints > 1`).
 */
export function laThietBiIOS(nav: ThongTinThietBi): boolean {
  if (/iPad|iPhone|iPod/.test(nav.userAgent)) return true
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1
}
