// TỆP SINH TỰ ĐỘNG — đừng sửa tay. Chạy `npm run dung:mau-sticker` để tạo lại.
// Nguồn: AFFiNE packages/frontend/templates/stickers/<Danh mục>/Content →
// public/static/templates/stickers/<thu-muc>/. Chỉ chứa id/tên/kích thước; byte SVG nằm trong
// public/, panel fetch khi cần (không vào chunk JS — D13).

export type MauSticker = { readonly id: string; readonly ten: string; readonly w: number; readonly h: number }

export type NhomSticker = {
  readonly danhMuc: string
  readonly thuMuc: string
  readonly mau: readonly MauSticker[]
}

export const MAU_STICKER: readonly NhomSticker[] = [
  {
    danhMuc: "Heo mập",
    thuMuc: "heo-nhang",
    mau: [
      { id: "crybaby", ten: "Crybaby", w: 360, h: 360 },
      { id: "drool", ten: "Drool", w: 361, h: 360 },
      { id: "fuming", ten: "Fuming", w: 361, h: 360 },
      { id: "hi", ten: "Hi~", w: 360, h: 360 },
      { id: "holding-tears", ten: "Holding Tears", w: 361, h: 360 },
      { id: "love-blows", ten: "Love Blows", w: 360, h: 360 },
      { id: "me-really", ten: "Me_ Really_", w: 361, h: 360 },
      { id: "ok", ten: "OK", w: 361, h: 360 },
      { id: "sassy-flick", ten: "Sassy Flick", w: 361, h: 360 },
      { id: "shockwave", ten: "Shockwave", w: 360, h: 360 },
      { id: "snooze-drool", ten: "Snooze Drool", w: 361, h: 360 },
      { id: "swag", ten: "Swag", w: 360, h: 360 },
      { id: "sweatdrop", ten: "Sweatdrop", w: 361, h: 360 },
      { id: "thumbs-up", ten: "Thumbs Up", w: 360, h: 360 },
      { id: "what", ten: "What_", w: 360, h: 360 },
    ],
  },
  {
    danhMuc: "Nhãn dán",
    thuMuc: "nhan-dan",
    mau: [
      { id: "ai", ten: "AI", w: 360, h: 360 },
      { id: "cat", ten: "Cat", w: 360, h: 360 },
      { id: "closed", ten: "Closed", w: 361, h: 360 },
      { id: "eyes", ten: "Eyes", w: 361, h: 360 },
      { id: "fire", ten: "Fire", w: 361, h: 360 },
      { id: "info", ten: "Info", w: 361, h: 360 },
      { id: "king", ten: "King", w: 361, h: 360 },
      { id: "love-face", ten: "Love Face", w: 361, h: 360 },
      { id: "love", ten: "Love", w: 360, h: 360 },
      { id: "notice", ten: "Notice", w: 361, h: 360 },
      { id: "pin", ten: "Pin", w: 360, h: 360 },
      { id: "question", ten: "Question", w: 361, h: 360 },
      { id: "smile-face", ten: "Smile Face", w: 360, h: 360 },
      { id: "stop", ten: "Stop", w: 361, h: 360 },
    ],
  },
  {
    danhMuc: "Giấy nhớ",
    thuMuc: "giay-nho",
    mau: [
      { id: "1", ten: "+1", w: 512, h: 512 },
      { id: "a-lot-of-question", ten: "A lot of question", w: 512, h: 512 },
      { id: "arrow", ten: "Arrow", w: 512, h: 512 },
      { id: "atention", ten: "Atention", w: 512, h: 512 },
      { id: "blue-screen", ten: "Blue Screen", w: 512, h: 512 },
      { id: "boom", ten: "Boom", w: 512, h: 512 },
      { id: "cool", ten: "Cool", w: 512, h: 512 },
      { id: "dino", ten: "Dino", w: 512, h: 512 },
      { id: "histogram", ten: "Histogram", w: 512, h: 512 },
      { id: "medal", ten: "Medal", w: 512, h: 512 },
      { id: "notice", ten: "Notice", w: 512, h: 512 },
      { id: "pin", ten: "Pin", w: 512, h: 512 },
      { id: "star", ten: "Star", w: 512, h: 512 },
    ],
  },
]
