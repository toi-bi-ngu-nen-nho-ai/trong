// Ảnh chụp ECG từ camera điện thoại thường rất nặng (vài MB, vài nghìn pixel mỗi cạnh) — nếu lưu
// nguyên gốc sẽ nhanh chóng chiếm hết dung lượng lưu trữ trên máy. Hàm này đọc file ảnh người dùng
// chọn, vẽ lại lên canvas với cạnh dài tối đa `maxDimension`, rồi xuất ra JPEG với chất lượng
// `quality` — vẫn đủ rõ để đọc bản ghi ECG nhưng nhẹ hơn nhiều so với ảnh gốc. Chạy hoàn toàn trên
// máy (không gọi mạng), dùng API Canvas/Image chuẩn của trình duyệt nên không cần thêm thư viện.
export function fileToResizedDataUrl(file: File, maxDimension = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Không đọc được file ảnh."))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("Không đọc được ảnh — file có thể bị hỏng hoặc không đúng định dạng."))
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Trình duyệt không hỗ trợ xử lý ảnh (canvas 2d)."))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
