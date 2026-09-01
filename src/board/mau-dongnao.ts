// Nửa "logic" của tab "Động não" — 5 mẫu BẢNG lấy từ bộ Brainstorming của AFFiNE. Nửa "dữ liệu" do
// scripts/dung-mau-dongnao.mjs sinh: nội dung nằm trong public/static/templates/dongnao/*.json, tệp
// mau-dongnao.sinh.ts chỉ giữ slug + tên.
//
// Khác `mau-handy.ts` ở hai chỗ, cả hai đều có lý do cứng:
//
// 1. NẠP LƯỜI. Năm mẫu cộng lại ~97 KB JSON. `TemplateManager.list()` được phép trả Promise
//    (toolbar/template-type.ts), và panel chỉ gọi `list()` cho danh mục ĐANG CHỌN, nên phí này chỉ
//    trả khi người dùng thật sự bấm sang tab này — không vào chunk JS (D13), không tốn gì cho người
//    không dùng. Kết quả được nhớ lại để đổi tab qua lại không fetch lại.
//
// 2. HỎNG MỀM, TUYỆT ĐỐI KHÔNG NÉM. `builtInTemplates.list()` của cây vendored gộp mọi manager đã
//    `extend()` bằng MỘT `Promise.all` (toolbar/builtin-templates.ts). Một promise vỡ ở đây làm vỡ
//    cả lượt gộp, và `template-panel.ts` chỉ `console.error` rồi bỏ — tức là một lần fetch hỏng sẽ
//    xoá trắng CẢ bốn tab nhãn dán chứ không riêng tab này. Vì vậy mọi lỗi được nuốt tại chỗ, ghi
//    log, trả mảng rỗng, và xoá cache để lần mở sau thử lại.
import type { Template, TemplateManager } from '@blocksuite/affine-gfx-template'

import { DANH_MUC_DONG_NAO, MAU_DONG_NAO } from './mau-dongnao.sinh'

const GOC_URL = '/static/templates/dongnao'

export class DongNaoTemplateManager implements TemplateManager {
  #cache: Promise<readonly Template[]> | null = null

  categories(): string[] {
    return [DANH_MUC_DONG_NAO]
  }

  async list(category: string): Promise<Template[]> {
    if (category !== DANH_MUC_DONG_NAO) return []
    return [...(await this.#nap())]
  }

  async search(keyword: string, category?: string): Promise<Template[]> {
    if (category && category !== DANH_MUC_DONG_NAO) return []
    const k = keyword.trim().toLowerCase()
    // Tên đã nằm sẵn trong tệp sinh, không cần mạng: lọc trước để mỗi phím gõ không kéo 97 KB về
    // trong khi không mẫu nào khớp.
    if (k && !MAU_DONG_NAO.some((m) => m.ten.toLowerCase().includes(k))) return []
    const ds = await this.#nap()
    if (!k) return [...ds]
    return ds.filter((m) => m.name?.toLowerCase().includes(k))
  }

  #nap(): Promise<readonly Template[]> {
    this.#cache ??= this.#tai()
    return this.#cache
  }

  async #tai(): Promise<readonly Template[]> {
    try {
      return await Promise.all(
        MAU_DONG_NAO.map(async ({ slug }) => {
          const kq = await fetch(`${GOC_URL}/${slug}.json`)
          if (!kq.ok) throw new Error(`${GOC_URL}/${slug}.json → HTTP ${kq.status}`)
          return (await kq.json()) as Template
        }),
      )
    } catch (loi) {
      // Xem chú thích (2) đầu tệp: ném ở đây làm mất luôn các tab khác.
      console.error('Không nạp được mẫu Động não', loi)
      this.#cache = null // chạy sau lượt gán trong #nap(), nên lần mở sau sẽ thử lại
      return []
    }
  }
}
